const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

// GET loans
r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page,10)||1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize,10)||50));
  const out = await withTenant(req.user, req.institutionId, async c => {
    const total = (await c.query('select count(*)::int as n from loans where institution_id=$1', [req.institutionId])).rows[0].n;
    const rows = (await c.query(
      `select l.*, 
        (select value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=l.member_id and f.key='name' limit 1) as member_name,
        m.member_no as member_no
       from loans l join members m on m.id=l.member_id
       where l.institution_id=$1 order by l.id desc limit $2 offset $3`,
      [req.institutionId, pageSize, (page-1)*pageSize]
    )).rows;
    return { rows, total, page, pageSize };
  });
  res.json(out);
}));

// POST loan
r.post('/', asyncH(async (req, res) => {
  const { memberId, amount, installmentsCount, feePercent, fundId, description } = req.body || {};
  if (!memberId || !amount) return res.status(400).json({ error: 'عضو و مبلغ الزامی است.' });
  const result = await withTenant(req.user, req.institutionId, async c => {
    // check member
    const mem = (await c.query('select id from members where id=$1 and institution_id=$2 and deleted_at is null', [memberId, req.institutionId])).rows[0];
    if (!mem) return { nf: true };
    const loan = (await c.query(
      `insert into loans (institution_id, member_id, fund_id, amount, fee_percent, installments_count, description)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.institutionId, memberId, fundId||null, parseInt(amount), parseFloat(feePercent)||4, parseInt(installmentsCount)||12, description||'']
    )).rows[0];
    // create installments
    const cnt = loan.installments_count;
    const each = Math.floor(loan.amount / cnt);
    const remainder = loan.amount - each*cnt;
    for (let i=0;i<cnt;i++) {
      const due = new Date(); due.setMonth(due.getMonth()+i+1);
      const amt = i===cnt-1 ? each+remainder : each;
      await c.query(
        `insert into installments (institution_id, loan_id, member_id, due_date, amount) values ($1,$2,$3,$4,$5)`,
        [req.institutionId, loan.id, memberId, due.toISOString().slice(0,10), amt]
      );
    }
    // txn loan_out
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
