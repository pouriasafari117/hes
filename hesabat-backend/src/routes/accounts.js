const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

r.get('/', asyncH(async (req, res) => {
  const rows = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query(`
      select a.*, f.name as fund_name from accounts a
      left join funds f on f.id=a.fund_id
      where a.institution_id=$1 order by a.id`, [req.institutionId])).rows;
  });
  res.json({ accounts: rows });
}));

r.post('/', asyncH(async (req, res) => {
  const { fundId, name, number, type, initialBalance, status, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'نام حساب الزامی است.' });
  const bal = parseInt(String(initialBalance||'0').replace(/[^0-9-]/g,''))||0;
  const acc = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query(
      `insert into accounts (institution_id, fund_id, name, number, type, initial_balance, status, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [req.institutionId, fundId||null, name.trim(), number||'', type||'پس‌انداز', bal, status||'active', notes||'']
    )).rows[0];
  });
  // ثبت تراکنش اولیه موجودی
  if (bal>0) {
    try {
      await withTenant(req.user, req.institutionId, async c => {
        await c.query(`insert into txns (institution_id, account_id, type, amount, description) values ($1,$2,'deposit',$3,$4)`,
          [req.institutionId, acc.id, bal, 'موجودی اولیه حساب '+name]);
      });
    } catch(e){}
  }
  res.status(201).json({ account: acc });
}));

r.patch('/:accountId', asyncH(async (req, res) => {
  const aid = parseInt(req.params.accountId,10);
  const { name, number, type, status, notes, initialBalance, fundId } = req.body || {};
  const acc = await withTenant(req.user, req.institutionId, async c => {
    const sets=[], args=[];
    let idx=1;
    if (name!==undefined){ sets.push(`name=$${idx++}`); args.push(name); }
    if (number!==undefined){ sets.push(`number=$${idx++}`); args.push(number); }
    if (type!==undefined){ sets.push(`type=$${idx++}`); args.push(type); }
    if (status!==undefined){ sets.push(`status=$${idx++}`); args.push(status); }
    if (notes!==undefined){ sets.push(`notes=$${idx++}`); args.push(notes); }
    if (initialBalance!==undefined){ sets.push(`initial_balance=$${idx++}`); args.push(parseInt(String(initialBalance).replace(/[^0-9-]/g,''))||0); }
    if (fundId!==undefined){ sets.push(`fund_id=$${idx++}`); args.push(fundId||null); }
    if (!sets.length) return (await c.query('select * from accounts where id=$1 and institution_id=$2', [aid, req.institutionId])).rows[0];
    args.push(aid, req.institutionId);
    return (await c.query(`update accounts set ${sets.join(', ')} where id=$${args.length-1} and institution_id=$${args.length} returning *`, args)).rows[0];
  });
  if (!acc) return res.status(404).json({ error: 'حساب پیدا نشد.' });
  res.json({ account: acc });
}));

r.delete('/:accountId', asyncH(async (req, res) => {
  const aid = parseInt(req.params.accountId,10);
  const del = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('delete from accounts where id=$1 and institution_id=$2 returning id', [aid, req.institutionId])).rows[0];
  });
  if (!del) return res.status(404).json({ error: 'حساب پیدا نشد.' });
  res.json({ deleted:true });
}));

module.exports = r;
