const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');
const { validateValues } = require('../validate');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

async function getActiveFields(c, iid) {
  const q = await c.query(
    'select id, key, label, type, is_required, options, archived from field_definitions where institution_id=$1 and archived=false order by sort_order, id',
    [iid]);
  return q.rows;
}

async function fetchMember(c, iid, mid) {
  const m = (await c.query(
    'select id, status, created_at, updated_at from members where id=$1 and institution_id=$2 and deleted_at is null',
    [mid, iid])).rows[0];
  if (!m) return null;
  const vq = await c.query(
    `select f.key, v.value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=$1`, [mid]);
  const values = {};
  vq.rows.forEach(row => { values[row.key] = row.value; });
  return { ...m, values };
}

/* GET /api/institutions/:id/members?q=&page=&pageSize= */
r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
  const q = (req.query.q || '').trim();
  const out = await withTenant(req.user, req.institutionId, async c => {
    const where = ['m.institution_id=$1', 'm.deleted_at is null'];
    const args = [req.institutionId];
    if (q) {
      args.push(q);
      where.push(`exists (select 1 from member_field_values v where v.member_id=m.id and v.value ilike '%'||$${args.length}||'%')`);
    }
    const total = (await c.query(`select count(*)::int as n from members m where ${where.join(' and ')}`, args)).rows[0].n;
    args.push(pageSize, (page - 1) * pageSize);
    const mq = await c.query(
      `select m.id, m.status, m.created_at, m.updated_at from members m where ${where.join(' and ')} order by m.id desc limit $${args.length - 1} offset $${args.length}`,
      args);
    const ids = mq.rows.map(x => x.id);
    let vmap = {};
    if (ids.length) {
      const vq = await c.query(
        `select v.member_id, f.key, v.value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id = any($1)`, [ids]);
      vq.rows.forEach(row => { (vmap[row.member_id] ||= {})[row.key] = row.value; });
    }
    const rows = mq.rows.map(m => ({ ...m, values: vmap[m.id] || {} }));
    return { rows, total, page, pageSize };
  });
  res.json(out);
}));

/* GET /api/institutions/:id/members/:memberId */
r.get('/:memberId', asyncH(async (req, res) => {
  const mid = parseInt(req.params.memberId, 10);
  const m = await withTenant(req.user, req.institutionId, c => fetchMember(c, req.institutionId, mid));
  if (!m) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  res.json({ member: m });
}));

/* POST /api/institutions/:id/members {values:{fieldKey:...}} — بند ۸ و ۹ سند */
r.post('/', asyncH(async (req, res) => {
  const values = (req.body || {}).values || {};
  const result = await withTenant(req.user, req.institutionId, async c => {
    const defs = await getActiveFields(c, req.institutionId);
    const v = validateValues(defs, values, { partial: false });
    if (!v.ok) return { bad: true, errors: v.errors };
    const mq = await c.query(
      'insert into members (institution_id) values ($1) returning id, status, created_at', [req.institutionId]);
    const member = mq.rows[0];
    const byKey = new Map(defs.map(f => [f.key, f]));
    for (const [k, val] of Object.entries(v.values)) {
      if (val === '' && !byKey.get(k).is_required) continue;
      await c.query(
        'insert into member_field_values (member_id, field_id, institution_id, value) values ($1,$2,$3,$4)',
        [member.id, byKey.get(k).id, req.institutionId, val]);
    }
    return { member: await fetchMember(c, req.institutionId, member.id) };
  });
  if (result.bad) return res.status(400).json({ error: 'اعتبارسنجی ناموفق بود.', details: result.errors });
  res.status(201).json(result);
}));

/* PATCH /api/institutions/:id/members/:memberId {values:{...}, status?} */
r.patch('/:memberId', asyncH(async (req, res) => {
  const mid = parseInt(req.params.memberId, 10);
  const body = req.body || {};
  const result = await withTenant(req.user, req.institutionId, async c => {
    const exists = (await c.query(
      'select id from members where id=$1 and institution_id=$2 and deleted_at is null', [mid, req.institutionId])).rows[0];
    if (!exists) return { nf: true };
    if (body.values) {
      const defs = await getActiveFields(c, req.institutionId);
      const v = validateValues(defs, body.values, { partial: true });
      if (!v.ok) return { bad: true, errors: v.errors };
      const byKey = new Map(defs.map(f => [f.key, f]));
      for (const [k, val] of Object.entries(v.values)) {
        await c.query(
          `insert into member_field_values (member_id, field_id, institution_id, value)
           values ($1,$2,$3,$4)
           on conflict (member_id, field_id) do update set value = excluded.value`,
          [mid, byKey.get(k).id, req.institutionId, val]);
      }
    }
    if (body.status) await c.query('update members set status=$1 where id=$2', [body.status === 'inactive' ? 'inactive' : 'active', mid]);
    await c.query('update members set updated_at=now() where id=$1', [mid]);
    return { member: await fetchMember(c, req.institutionId, mid) };
  });
  if (result.nf) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  if (result.bad) return res.status(400).json({ error: 'اعتبارسنجی ناموفق بود.', details: result.errors });
  res.json(result);
}));

/* DELETE /api/institutions/:id/members/:memberId → حذف نرم (بند ۱۳ سند) */
r.delete('/:memberId', asyncH(async (req, res) => {
  const mid = parseInt(req.params.memberId, 10);
  const row = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(
      'update members set deleted_at=now() where id=$1 and institution_id=$2 and deleted_at is null returning id',
      [mid, req.institutionId]);
    return q.rows[0];
  });
  if (!row) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  res.json({ deleted: true, memberId: mid });
}));

module.exports = r;
