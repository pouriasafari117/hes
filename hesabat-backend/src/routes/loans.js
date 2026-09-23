const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

// Helper to get member values map
async function getMemberValues(c, memberId) {
  const q = await c.query(
    `select f.key, f.label, v.value from member_field_values v
     join field_definitions f on f.id=v.field_id
     where v.member_id=$1`, [memberId]
  );
  const map = {};
  q.rows.forEach(row => { map[row.key] = { label: row.label, value: row.value }; });
  return map;
}

// GET loans ?memberId=&page=&pageSize=
r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page,10)||1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize,10)||50));
  const memberId = req.query.memberId ? parseInt(req.query.memberId,10) : null;
  const out = await withTenant(req.user, req.institutionId, async c => {
    const where = ['l.institution_id=$1'];
    const args = [req.institutionId];
    if (memberId) { args.push(memberId); where.push(`l.member_id=$${args.length}`); }
    const total = (await c.query(`select count(*)::int as n from loans l where ${where.join(' and ')}`, args)).rows[0].n;
    args.push(pageSize, (page-1)*pageSize);
    const rows = (await c.query(
      `select l.*, m.member_no
       from loans l join members m on m.id=l.member_id
       where ${where.join(' and ')} order by l.id desc limit $${args.length-1} offset $${args.length}`,
      args
    )).rows;

    // Enrich with member values
    for (let loan of rows) {
      try {
        const vals = await getMemberValues(c, loan.member_id);
        loan.member_values = vals;
        // first value as name for backward compat
        const firstKey = Object.keys(vals)[0];
        loan.member_name = firstKey ? vals[firstKey].value : ('عضو #'+loan.member_id);
      } catch(e){
        loan.member_name = 'عضو #'+loan.member_id;
        loan.member_values = {};
      }
    }

    return { rows, total, page, pageSize };
  });
  res.json(out);
}));

// GET loan detail + installments + payments + member full info
r.get('/:loanId', asyncH(async (req, res) => {
  const loanId = parseInt(req.params.loanId,10);
  const data = await withTenant(req.user, req.institutionId, async c => {
    const loan = (await c.query(
      `select l.*, m.member_no, m.status as member_status, m.created_at as member_created
       from loans l join members m on m.id=l.member_id where l.id=$1 and l.institution_id=$2`, [loanId, req.institutionId]
    )).rows[0];
    if (!loan) return null;
    const installments = (await c.query('select * from installments where loan_id=$1 order by due_date', [loanId])).rows;
    const payments = (await c.query('select * from payments where loan_id=$1 order by created_at desc', [loanId])).rows;
    const memberValues = await getMemberValues(c, loan.member_id);
    loan.member_values = memberValues;
    const firstKey = Object.keys(memberValues)[0];
    loan.member_name = firstKey ? memberValues[firstKey].value : ('عضو #'+loan.member_id);
    return { loan, installments, payments, member: { id: loan.member_id, member_no: loan.member_no, status: loan.member_status, created_at: loan.member_created, values: memberValues } };
  });
  if (!data) return res.status(404).json({ error: 'وام پیدا نشد.' });
  res.json(data);
}));

// POST /:loanId/settle — تسویهٔ نهایی وام: فقط وقتی ماندهٔ بدهی صفر است.
// پس از تسویه دیگر هیچ پرداختی روی وام پذیرفته نمی‌شود و صفحهٔ وام فقط «تاریخچهٔ اقساط» را نشان می‌دهد.
r.post('/:loanId/settle', asyncH(async (req, res) => {
  const loanId = parseInt(req.params.loanId, 10);
  const result = await withTenant(req.user, req.institutionId, async c => {
    const loan = (await c.query('select id, amount, status from loans where id=$1 and institution_id=$2', [loanId, req.institutionId])).rows[0];
    if (!loan) return { nf:true };
    if (loan.status === 'paid') return { already:true };
    const paidSum = Number((await c.query('select coalesce(sum(amount),0)::bigint as s from payments where institution_id=$1 and loan_id=$2', [req.institutionId, loanId])).rows[0].s || 0);
    const planTotal = Number((await c.query('select coalesce(sum(amount),0)::bigint as s from installments where loan_id=$1', [loanId])).rows[0].s || 0);
    const remaining = Math.max(0, Math.min(Number(loan.amount)||0, planTotal || (Number(loan.amount)||0)) - paidSum);
    if (remaining > 0) return { notReady:true, remaining };
    await c.query("update installments set status='paid', paid_at=coalesce(paid_at, now()) where loan_id=$1 and status<>'paid'", [loanId]);
    await c.query("update loans set status='paid', updated_at=now() where id=$1", [loanId]);
    return { ok:true, remaining:0 };
  });
  if (result.nf) return res.status(404).json({ error: 'وام پیدا نشد.' });
  if (result.already) return res.status(400).json({ error: 'این وام پیش‌تر تسویه شده است.' });
  if (result.notReady) return res.status(400).json({ error: 'هنوز ماندهٔ بدهی هست؛ تسویه فقط وقتی مانده صفر شد.', remaining: result.remaining });
  res.json({ settled:true, remaining:0 });
}));

// POST loan
r.post('/', asyncH(async (req, res) => {
  const { memberId, amount, installmentsCount, feePercent, fundId, description, plan, firstDue, intervalMonths } = req.body || {};
  if (!memberId || !amount) return res.status(400).json({ error: 'عضو و مبلغ الزامی است.' });
  const result = await withTenant(req.user, req.institutionId, async c => {
    const mem = (await c.query('select id from members where id=$1 and institution_id=$2 and deleted_at is null', [memberId, req.institutionId])).rows[0];
    if (!mem) return { nf: true };
    // get institution fee as default if not provided
    let fee = feePercent;
    if (fee===undefined || fee===null || fee==='') {
      try {
        const inst = (await c.query('select fee_percent from institutions where id=$1', [req.institutionId])).rows[0];
        fee = inst ? inst.fee_percent : 4;
      } catch(e){ fee = 4; }
    }
    const loan = (await c.query(
      `insert into loans (institution_id, member_id, fund_id, amount, fee_percent, installments_count, description)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.institutionId, memberId, fundId||null, parseInt(String(amount).replace(/[^0-9]/g,''))||0, parseFloat(fee)||0, parseInt(installmentsCount)||12, description||'']
    )).rows[0];
    const cnt = loan.installments_count;
    /* برنامهٔ اقساط: اگر کلاینت «plan» (آرایهٔ مبلغ هر قسط) فرستاده باشد و طولش با تعداد اقساط برابر باشد، همان استفاده می‌شود؛
       در غیر این صورت مثل قبل به‌صورت مساوی تقسیم و باقی‌مانده روی قسط آخر می‌نشیند. */
    let amounts = null;
    if (Array.isArray(plan)) {
      const p = plan.slice(0, cnt).map(x => Math.max(0, parseInt(String(x).replace(/[^0-9]/g,''), 10) || 0));
      if (p.length === cnt) amounts = p;
    }
    if (!amounts) {
      const each = Math.floor(loan.amount / cnt);
      const remainder = loan.amount - each*cnt;
      amounts = Array.from({ length: cnt }, (_, i) => i===cnt-1 ? each+remainder : each);
    }
    /* تاریخ شروع اقساط: اگر کلاینت firstDue (ISO) فرستاده باشد از همان شروع می‌شود؛ وگرنه رفتار قبلی (از ماه آینده) حفظ است.
       فاصلهٔ اقساط با intervalMonths (۱=ماهانه) قابل تنظیم است. */
    const intM = Math.min(12, Math.max(1, parseInt(intervalMonths, 10) || 1));
    const base = firstDue ? new Date(firstDue) : null;
    const baseOk = base && !isNaN(base.getTime());
    for (let i=0;i<cnt;i++) {
      const due = baseOk ? new Date(base) : new Date();
      due.setMonth(due.getMonth() + (baseOk ? i*intM : (i+1)));
      const amt = amounts[i];
      await c.query(
        `insert into installments (institution_id, loan_id, member_id, due_date, amount) values ($1,$2,$3,$4,$5)`,
        [req.institutionId, loan.id, memberId, due.toISOString().slice(0,10), amt]
      );
    }
    try {
      await c.query(`insert into txns (institution_id, member_id, loan_id, type, amount, description) values ($1,$2,$3,'loan_out',$4,$5)`,
        [req.institutionId, memberId, loan.id, loan.amount, 'پرداخت وام #' + loan.id]);
    } catch(e){}
    return { loan };
  });
  if (result.nf) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  res.status(201).json(result);
}));

module.exports = r;
