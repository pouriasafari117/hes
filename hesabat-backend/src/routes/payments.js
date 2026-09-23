const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

// GET payments ?loanId=
r.get('/', asyncH(async (req, res) => {
  const loanId = req.query.loanId ? parseInt(req.query.loanId,10) : null;
  const rows = await withTenant(req.user, req.institutionId, async c => {
    if (loanId) {
      return (await c.query('select * from payments where institution_id=$1 and loan_id=$2 order by created_at desc', [req.institutionId, loanId])).rows;
    }
    return (await c.query('select * from payments where institution_id=$1 order by created_at desc limit 100', [req.institutionId])).rows;
  });
  res.json({ payments: rows });
}));

// POST payment — تخصیص خودکار و صفی: مبلغ به‌ترتیب روی قدیمی‌ترین قسط باز می‌نشیند
// و هرگز از «ماندهٔ واقعی وام» بیشتر پذیرفته نمی‌شود تا بدهی منفی نشود.
r.post('/', asyncH(async (req, res) => {
  const { loanId, amount, type } = req.body || {};
  if (!loanId || !amount) return res.status(400).json({ error: 'وام و مبلغ الزامی است.' });
  const amt = parseInt(String(amount).replace(/[^0-9]/g,''))||0;
  if (amt<=0) return res.status(400).json({ error: 'مبلغ نامعتبر.' });

  const result = await withTenant(req.user, req.institutionId, async c => {
    const loan = (await c.query('select id, member_id, amount, status from loans where id=$1 and institution_id=$2', [loanId, req.institutionId])).rows[0];
    if (!loan) return { nf:true };

    // اقساط به ترتیب سررسید = ترتیب صف
    const insAll = (await c.query('select id, due_date, amount, status from installments where loan_id=$1 order by due_date asc, id asc', [loanId])).rows;
    if (!insAll.length) return { noIns:true };

    // مجموع پرداخت‌های قبلی از روی جدول payments (منبع حقیقت)
    const paidRow = (await c.query('select coalesce(sum(amount),0)::bigint as s from payments where institution_id=$1 and loan_id=$2', [req.institutionId, loanId])).rows[0];
    const before = Number(paidRow.s||0);
    const plan = insAll.map(i => Number(i.amount)||0);
    const planTotal = plan.reduce((a,b)=>a+b,0);
    const remain = Math.max(0, planTotal - before);
    if (remain <= 0) return { settled:true, remaining:0 };
    if (amt > remain) return { over:true, remaining:remain };

    /* پور کردن «پرداخت قبلی + این پرداخت» روی صف اقساط — هماهنگ با کلاینت:
       coverage_i(cum) = مقداری از قسط i که تا مجموع cum پوشش داده شده */
    const coverAt = (cum) => { let left=cum; return plan.map(need=>{ const t=Math.max(0,Math.min(need,left)); left=Math.max(0,left-t); return t; }); };
    const covPrev = coverAt(before);
    const covNew  = coverAt(before + amt);

    // ثبت پرداخت (به اولین قسطی که لمس شد نسبت داده می‌شود)
    let firstTouched = null;
    const covered = [];
    for (let k=0;k<insAll.length;k++){
      const i = insAll[k], need = plan[k];
      const taken = Math.max(0, covNew[k] - covPrev[k]);
      if (taken>0 && !firstTouched) firstTouched = i;
      if (taken>0) covered.push({ id:i.id, due:i.due_date, take:taken, full: covNew[k]>=need });
    }
    const pay = (await c.query(
      `insert into payments (institution_id, loan_id, installment_id, member_id, amount, type) values ($1,$2,$3,$4,$5,$6) returning *`,
      [req.institutionId, loanId, firstTouched?firstTouched.id:null, loan.member_id, amt, type||'installment']
    )).rows[0];

    // به‌روزرسانی وضعیت اقساط بر اساس پوشش تجمیعی (همگام با منطق صف)
    for (let k=0;k<insAll.length;k++){
      const i = insAll[k];
      const shouldPaid = covNew[k] >= plan[k];
      if (shouldPaid && i.status!=='paid'){
        await c.query("update installments set status='paid', paid_at=now() where id=$1", [i.id]);
      }
    }

    // تراکنش واریز
    try {
      await c.query(`insert into txns (institution_id, member_id, loan_id, type, amount, description) values ($1,$2,$3,'deposit',$4,$5)`,
        [req.institutionId, loan.member_id, loanId, amt, 'پرداخت قسط وام #' + loanId]);
    } catch(e){}

    // تسویه وام وقتی همه اقساط پوشش داده شد
    const settled = (before + amt) >= planTotal;
    if (settled) {
      await c.query("update loans set status='paid', updated_at=now() where id=$1", [loanId]);
    }
    return { payment: pay, settled, remaining: Math.max(0, planTotal-(before+amt)), covered };
  });

  if (result.nf) return res.status(404).json({ error: 'وام پیدا نشد.' });
  if (result.noIns) return res.status(400).json({ error: 'این وام اقساطی ندارد.' });
  if (result.over) return res.status(400).json({ error: 'بیشتر از ماندهٔ وام قابل واریز نیست. سقف: ' + result.remaining, remaining: result.remaining });
  if (result.settled && !result.payment) return res.status(400).json({ error: 'این وام قبلاً کاملاً تسویه شده؛ ماندهٔ قابل‌پرداخت صفر است.', remaining:0 });
  res.status(201).json(result);
}));

module.exports = r;
