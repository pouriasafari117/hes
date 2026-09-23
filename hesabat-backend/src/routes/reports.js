const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');
const J2 = require('../jalali');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

const WIN = 12; /* اندازهٔ پنجرهٔ نمایش ماهانه */

/* GET /api/institutions/:id/reports/summary?page=N
   تحلیل کامل ماهانه از تأسیس: شاخص‌های کلیدی + سری‌ها برای چهار نمودار،
   با پیمایش پنجرهٔ ۱۲ماهه (page=0 جدیدترین پنجره؛ بیشتر = قدیمی‌تر) */
r.get('/summary', asyncH(async (req, res) => {
  let page = parseInt(req.query.page || '0', 10);
  if(!Number.isFinite(page) || page < 0) page = 0;

  const out = await withTenant(req.user, req.institutionId, async c => {
    const iid = req.institutionId;
    const q = sql => c.query(sql, [iid]).then(x => x.rows).catch(() => []);

    /* تجمیع ماهانهٔ هر موجودیت (میلادی، بعداً به ماه جلالی برگردانده می‌شود) */
    const [txM, memM, loanM, payM, dueM, odM] = await Promise.all([
      q(`select to_char(date_trunc('month', created_at),'YYYY-MM') ym,
                coalesce(sum(case when type in ('deposit','repayment') then amount else 0 end),0)::bigint dep,
                coalesce(sum(case when type in ('withdraw','loan_out') then amount else 0 end),0)::bigint wd
           from txns where institution_id=$1 group by 1 order by 1`),
      q(`select to_char(date_trunc('month', created_at),'YYYY-MM') ym, count(*)::int c
           from members where institution_id=$1 and deleted_at is null group by 1`),
      q(`select to_char(date_trunc('month', created_at),'YYYY-MM') ym, count(*)::int c,
                coalesce(sum(amount),0)::bigint amt
           from loans where institution_id=$1 group by 1`),
      q(`select to_char(date_trunc('month', created_at),'YYYY-MM') ym, count(*)::int c
           from payments where institution_id=$1 and type='installment' group by 1`),
      q(`select to_char(date_trunc('month', i.due_date),'YYYY-MM') ym, count(*)::int c
           from installments i join loans l on l.id=i.loan_id
          where i.institution_id=$1 and l.status<>'cancelled' group by 1`),
      q(`select to_char(date_trunc('month', i.due_date),'YYYY-MM') ym, count(*)::int c
           from installments i join loans l on l.id=i.loan_id
          where i.institution_id=$1 and l.status<>'cancelled' and i.status<>'paid' and i.due_date < now()::date group by 1`),
    ]);

    /* شاخص‌های کلیدی (همه از تأسیس) */
    const kRow = (await c.query(`select
        (select count(*)::int from members where institution_id=$1 and deleted_at is null) mem_total,
        (select count(*)::int from loans where institution_id=$1) loans_total,
        (select coalesce(sum(amount),0)::bigint from loans where institution_id=$1) loans_amt,
        (select coalesce(sum(amount),0)::bigint from payments where institution_id=$1) pay_sum,
        (select count(*)::int from payments where institution_id=$1) pays_cnt,
        (select coalesce(sum(case when type in ('deposit','repayment') then amount else 0 end),0)::bigint from txns where institution_id=$1) dep_sum,
        (select coalesce(sum(case when type in ('withdraw','loan_out') then amount else 0 end),0)::bigint from txns where institution_id=$1) wd_sum,
        (select coalesce(sum(initial_balance),0)::bigint from accounts where institution_id=$1) init_bal,
        (select count(*)::int from installments i join loans l on l.id=i.loan_id
           where i.institution_id=$1 and l.status<>'cancelled' and i.status<>'paid' and i.due_date < now()::date) od_now`,
      [iid]).then(x => x.rows[0]).catch(() => null)) || { mem_total:0, loans_total:0, loans_amt:0, pay_sum:0, pays_cnt:0, dep_sum:0, wd_sum:0, init_bal:0, od_now:0 };

    /* نقشه‌های تجمیعی به‌کلید ماه جلالی */
    const todayKey = J2.todayJKey();
    const mk = agg => { const m = {}; (agg||[]).forEach(row => {
      const k = J2.gregYmToJKey(row.ym);
      m[k] = (m[k]||0) + Number(row.c ?? row.dep ?? 0);
    }); return m; };
    const depM = mk(txM.map(t => ({ ym:t.ym, c: Number(t.dep) })));
    const wdM  = mk(txM.map(t => ({ ym:t.ym, c: Number(t.wd)  })));
    const memM2 = mk(memM), loanM2 = mk(loanM), payM2 = mk(payM), dueM2 = mk(dueM), odM2 = mk(odM);

    /* اولین ماه دارای داده */
    let firstKey = todayKey;
    [txM, memM, loanM, payM, dueM].forEach(arr => (arr||[]).forEach(row => {
      const k = J2.gregYmToJKey(row.ym);
      if(k < firstKey) firstKey = k;
    }));

    const totalMonths = todayKey - firstKey + 1;
    const maxPage = Math.max(0, Math.ceil(totalMonths / WIN) - 1);
    if(page > maxPage) page = maxPage;
    const winEnd = totalMonths - page*WIN;
    const winStart = Math.max(0, winEnd - WIN);
    const winStartKey = firstKey + winStart;

    /* پایه‌های تجمیعی قبل از شروع پنجره */
    let balBase = Number(kRow.init_bal);
    Object.keys(depM).forEach(k => { if(+k < winStartKey) balBase += depM[k]; });
    Object.keys(wdM).forEach(k => { if(+k < winStartKey) balBase -= wdM[k]; });
    let memBase = 0, loanBase = 0;
    Object.keys(memM2).forEach(k => { if(+k < winStartKey) memBase += memM2[k]; });
    Object.keys(loanM2).forEach(k => { if(+k < winStartKey) loanBase += loanM2[k]; });

    /* ساخت سری‌های پنجره */
    const wm = [], depWin = [], wdWin = [], balWin = [], memWin = [], loanWin = [], paidWin = [], dueWin = [], odWin = [];
    let runB = balBase, runM = memBase, runL = loanBase;
    for(let k = winStartKey; k < winStartKey + (winEnd - winStart); k++){
      wm.push(J2.jKeyToYJm(k));
      depWin.push(depM[k]||0); wdWin.push(wdM[k]||0);
      runB += (depM[k]||0) - (wdM[k]||0); balWin.push(Math.max(0, runB)); /* موجودی هرگز منفی نمایش داده نمی‌شود */
      runM += memM2[k]||0; memWin.push(runM);
      runL += loanM2[k]||0; loanWin.push(runL);
      paidWin.push(payM2[k]||0); dueWin.push(dueM2[k]||0); odWin.push(odM2[k]||0);
    }

    const depSum = Number(kRow.dep_sum), wdSum = Number(kRow.wd_sum);
    return {
      page, totalMonths, winStart, winEnd, maxPage, hasPager: totalMonths > WIN,
      wm, depWin, wdWin, balWin, memWin, loanWin, paidWin, dueWin, odWin,
      kpis: {
        members: Number(kRow.mem_total),
        loans: Number(kRow.loans_total), loansAmt: Number(kRow.loans_amt),
        paySum: Number(kRow.pay_sum), paysCnt: Number(kRow.pays_cnt),
        depSum, wdSum,
        curBal: Math.max(0, Number(kRow.init_bal) + depSum - wdSum),
        odNow: Number(kRow.od_now)
      }
    };
  });
  res.json(out);
}));

module.exports = r;
