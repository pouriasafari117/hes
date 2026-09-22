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

// POST payment
r.post('/', asyncH(async (req, res) => {
  const { loanId, installmentId, amount, type } = req.body || {};
  if (!loanId || !amount) return res.status(400).json({ error: 'وام و مبلغ الزامی است.' });
  const amt = parseInt(String(amount).replace(/[^0-9]/g,''))||0;
  if (amt<=0) return res.status(400).json({ error: 'مبلغ نامعتبر.' });

  const result = await withTenant(req.user, req.institutionId, async c => {
    const loan = (await c.query('select id, member_id from loans where id=$1 and institution_id=$2', [loanId, req.institutionId])).rows[0];
    if (!loan) return { nf:true };

    // اگر قسط مشخص شده، آن را پرداخت‌شده کن
    if (installmentId) {
      const ins = (await c.query('select id, amount, status from installments where id=$1 and loan_id=$2', [installmentId, loanId])).rows[0];
      if (ins) {
        await c.query("update installments set status='paid', paid_at=now() where id=$1", [installmentId]);
      }
    } else {
      // اولین قسط pending را پرداخت کن
      const ins = (await c.query("select id from installments where loan_id=$1 and status='pending' order by due_date limit 1", [loanId])).rows[0];
      if (ins) {
        await c.query("update installments set status='paid', paid_at=now() where id=$1", [ins.id]);
      }
    }

    const pay = (await c.query(
      `insert into payments (institution_id, loan_id, installment_id, member_id, amount, type) values ($1,$2,$3,$4,$5,$6) returning *`,
      [req.institutionId, loanId, installmentId||null, loan.member_id, amt, type||'installment']
    )).rows[0];

    // تراکنش واریز
    try {
      await c.query(`insert into txns (institution_id, member_id, loan_id, type, amount, description) values ($1,$2,$3,'deposit',$4,$5)`,
        [req.institutionId, loan.member_id, loanId, amt, 'پرداخت قسط وام #'+loanId]);
    } catch(e){}

    // اگر همه اقساط پرداخت شد، وام تسویه
    const pending = (await c.query("select count(*)::int as n from installments where loan_id=$1 and status!='paid'", [loanId])).rows[0].n;
    if (pending===0) {
      await c.query("update loans set status='paid', updated_at=now() where id=$1", [loanId]);
    }

    return { payment: pay };
  });

  if (result.nf) return res.status(404).json({ error: 'وام پیدا نشد.' });
  res.status(201).json(result);
}));

module.exports = r;
