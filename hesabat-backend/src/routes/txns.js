const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page,10)||1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize,10)||50));
  const type = req.query.type;
  const accountId = req.query.accountId ? parseInt(req.query.accountId,10) : null;

  const out = await withTenant(req.user, req.institutionId, async c => {
    const where = ['t.institution_id=$1'];
    const args = [req.institutionId];
    if (type && type!=='all') { args.push(type); where.push(`t.type=$${args.length}`); }
    if (accountId) { args.push(accountId); where.push(`t.account_id=$${args.length}`); }

    const total = (await c.query(`select count(*)::int as n from txns t where ${where.join(' and ')}`, args)).rows[0].n;
    args.push(pageSize, (page-1)*pageSize);
    const rows = (await c.query(
      `select t.*, a.name as account_name, f.name as fund_name,
        (select json_object_agg(f2.key, json_build_object('label', f2.label, 'value', v.value))
         from member_field_values v join field_definitions f2 on f2.id=v.field_id where v.member_id=t.member_id) as member_values,
        m.member_no
       from txns t
       left join accounts a on a.id=t.account_id
       left join funds f on f.id=a.fund_id
       left join members m on m.id=t.member_id
       where ${where.join(' and ')} order by t.created_at desc limit $${args.length-1} offset $${args.length}`,
      args
    )).rows;
    return { rows, total, page, pageSize };
  });
  res.json(out);
}));

r.post('/', asyncH(async (req, res) => {
  const { accountId, memberId, loanId, type, amount, description } = req.body || {};
  if (!type || !amount) return res.status(400).json({ error: 'نوع و مبلغ الزامی است.' });
  const amt = parseInt(String(amount).replace(/[^0-9-]/g,''))||0;
  if (amt===0) return res.status(400).json({ error: 'مبلغ نامعتبر.' });

  const txn = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query(
      `insert into txns (institution_id, account_id, member_id, loan_id, type, amount, description)
       values ($1,$2,$3,$4,$5,$6,$7) returning *`,
      [req.institutionId, accountId||null, memberId||null, loanId||null, type, amt, description||'']
    )).rows[0];
  });
  res.status(201).json({ txn });
}));

module.exports = r;
