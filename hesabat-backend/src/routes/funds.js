const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

r.get('/', asyncH(async (req, res) => {
  const rows = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('select * from funds where institution_id=$1 order by id', [req.institutionId])).rows;
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

module.exports = r;
