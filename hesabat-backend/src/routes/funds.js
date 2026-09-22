const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

r.get('/', asyncH(async (req, res) => {
  const rows = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query(`
      select f.*, 
        (select count(*)::int from accounts where fund_id=f.id) as accounts_count,
        (select coalesce(sum(initial_balance),0)::bigint from accounts where fund_id=f.id) as total_balance
      from funds f where f.institution_id=$1 order by f.id`, [req.institutionId])).rows;
  });
  res.json({ funds: rows });
}));

r.post('/', asyncH(async (req, res) => {
  const { name, code, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'نام صندوق الزامی است.' });
  const fund = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('insert into funds (institution_id, name, code, notes) values ($1,$2,$3,$4) returning *',
      [req.institutionId, name.trim(), code||null, notes||''])).rows[0];
  });
  res.status(201).json({ fund });
}));

r.patch('/:fundId', asyncH(async (req, res) => {
  const fid = parseInt(req.params.fundId,10);
  const { name, code, notes, status } = req.body || {};
  const fund = await withTenant(req.user, req.institutionId, async c => {
    const sets=[], args=[]; let idx=1;
    if (name!==undefined){ sets.push(`name=$${idx++}`); args.push(name); }
    if (code!==undefined){ sets.push(`code=$${idx++}`); args.push(code); }
    if (notes!==undefined){ sets.push(`notes=$${idx++}`); args.push(notes); }
    if (status!==undefined){ sets.push(`status=$${idx++}`); args.push(status); }
    if (!sets.length) return (await c.query('select * from funds where id=$1 and institution_id=$2', [fid, req.institutionId])).rows[0];
    args.push(fid, req.institutionId);
    return (await c.query(`update funds set ${sets.join(', ')}, updated_at=now() where id=$${args.length-1} and institution_id=$${args.length} returning *`, args)).rows[0];
  });
  if (!fund) return res.status(404).json({ error: 'صندوق پیدا نشد.' });
  res.json({ fund });
}));

r.delete('/:fundId', asyncH(async (req, res) => {
  const fid = parseInt(req.params.fundId,10);
  const del = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('delete from funds where id=$1 and institution_id=$2 returning id', [fid, req.institutionId])).rows[0];
  });
  if (!del) return res.status(404).json({ error: 'صندوق پیدا نشد.' });
  res.json({ deleted:true });
}));

module.exports = r;
