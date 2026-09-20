const express = require('express');
const { pool, withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router();
r.use(requireAuth);

/* فهرست مؤسسات کاربر */
r.get('/', asyncH(async (req, res) => {
  const q = await pool.query('select * from fn_my_institutions($1)', [req.user.id]);
  res.json({ institutions: q.rows });
}));

/* POST /api/institutions {name, slug?} — ایجاد مؤسسه (بند ۳ سند) */
r.post('/', asyncH(async (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'نام مؤسسه الزامی است.' });
  let slug = String((req.body || {}).slug || '').trim();
  if (!slug) slug = 'inst-' + Date.now().toString(36);
  slug = slug.toLowerCase();
  if (!/^[a-z0-9_\-]{2,64}$/.test(slug))
    return res.status(400).json({ error: 'اسلاگ فقط حروف کوچک انگلیسی، عدد، - و _.' });
  let id;
  try {
    const q = await pool.query('select fn_create_institution($1,$2,$3) as id', [req.user.id, name, slug]);
    id = q.rows[0].id;
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'این اسلاگ قبلاً استفاده شده است.' });
    throw e;
  }
  res.status(201).json({ id, name, slug, status: 'active' });
}));

r.get('/:id', requireInstitution, asyncH(async (req, res) => {
  const inst = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('select id,name,slug,status,created_at from institutions where id=$1', [req.institutionId])).rows[0];
  });
  if (!inst) return res.status(404).json({ error: 'مؤسسه پیدا نشد.' });
  res.json({ institution: inst });
}));

/* PATCH /api/institutions/:id {name?, status?} */
r.patch('/:id', requireInstitution, asyncH(async (req, res) => {
  const { name, status } = req.body || {};
  if (status !== undefined && !['active','inactive'].includes(status))
    return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
  const inst = await withTenant(req.user, req.institutionId, async c => {
    if (name !== undefined) await c.query('update institutions set name=$1, updated_at=now() where id=$2', [String(name).trim(), req.institutionId]);
    if (status !== undefined) await c.query('update institutions set status=$1, updated_at=now() where id=$2', [status, req.institutionId]);
    return (await c.query('select id,name,slug,status,created_at from institutions where id=$1', [req.institutionId])).rows[0];
  });
  res.json({ institution: inst });
}));

module.exports = r;
