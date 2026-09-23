const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

// GET payments ?loanId=&page=&pageSize=&from=&to= — غنی‌شده با نام عضو/وام/قسط برای گزارش‌ها
r.get('/', asyncH(async (req, res) => {
  const loanId = req.query.loanId ? parseInt(req.query.loanId,10) : null;
  const page = Math.max(1, parseInt(req.query.page,10)||1);
  const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize,10)||100));
  const from = (req.query.from||'').trim() || null;
  const to = (req.query.to||'').trim() || null;
  const out = await withTenant(req.user, req.institutionId, async c => {
    const args = [req.institutionId];
    const where = ['p.institution_id=$1'];
    if (loanId) { args.push(loanId); where.push(`p.loan_id=$${args.length}`); }
    if (from)   { args.push(from);   where.push(`p.created_at::date >= $${args.length}::date`); }
    if (to)     { args.push(to);     where.push(`p.created_at::date <= $${args.length}::date`); }
    const total = (await c.query(`select count(*)::int as n from payments p where ${where.join(' and ')}`, args)).rows[0].n;
    args.push(pageSize, (page-1)*pageSize);
    const rows = (await c.query(
      `select p.*, l.amount as loan_amount, i.due_date::text as ins_due, m.member_no,
              (select v.value from member_field_values v join field_definitions d on d.id=v.field_definition_id
               where v.member_id=p.member_id order by d.sort_order, d.id limit 1) as member_name,
              ((select count(*) from installments x where x.loan_id=p.loan_id and x.due_date <= i.due_date)) as ins_no
       from payments p
       join loans l on l.id=p.loan_id
       join members m on m.id=p.member_id
       left join installments i on i.id=p.installment_id
       where ${where.join(' and ')}
       order by p.created_at desc, p.id desc
       limit $${args.length-1} offset $${args.length}`, args)).rows;
    return { total, page, pageSize, rows };
  });
  res.json({ ...out, payments: out.rows });
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
    if (loan.status === 'paid') return { closed:true };

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

    // ماندهٔ بدهی صفر شدن به‌معنی «آمادهٔ تسویه» است — بستن نهایی فقط با دکمهٔ
    // «تسویه وام» (POST /loans/:loanId/settle) انجام می‌شود که کاربر تأیید کند.
    const settled = (before + amt) >= planTotal;
    return { payment: pay, settled, remaining: Math.max(0, planTotal-(before+amt)), covered };
  });

  if (result.nf) return res.status(404).json({ error: 'وام پیدا نشد.' });
  if (result.closed) return res.status(400).json({ error: 'این وام تسویه و بسته شده؛ دیگر پرداخت روی آن ممکن نیست.', remaining:0 });
  if (result.noIns) return res.status(400).json({ error: 'این وام اقساطی ندارد.' });
  if (result.over) return res.status(400).json({ error: 'بیشتر از ماندهٔ وام قابل واریز نیست. سقف: ' + result.remaining, remaining: result.remaining });
  if (result.settled && !result.payment) return res.status(400).json({ error: 'این وام قبلاً کاملاً تسویه شده؛ ماندهٔ قابل‌پرداخت صفر است.', remaining:0 });
  res.status(201).json(result);
}));

module.exports = r;
