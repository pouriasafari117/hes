const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');
const { validateValues } = require('../validate');
const bulk = require('../bulk');
const { extractTextFromImage } = require('../ocr/provider');

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
    'select id, status, member_no, created_at, updated_at from members where id=$1 and institution_id=$2 and deleted_at is null',
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
  const sort = String(req.query.sort || 'newest').trim();
  const status = String(req.query.status || '').trim();
  const out = await withTenant(req.user, req.institutionId, async c => {
    const where = ['m.institution_id=$1', 'm.deleted_at is null'];
    const args = [req.institutionId];
    if (q) {
      args.push(q);
      where.push(`exists (select 1 from member_field_values v where v.member_id=m.id and v.value ilike '%'||$${args.length}||'%')`);
    }
    if (status === 'active' || status === 'inactive') {
      args.push(status);
      where.push(`m.status=$${args.length}`);
    }
    const orderBy = sort === 'oldest'
      ? 'm.id asc'
      : (sort === 'name'
        ? `(select v.value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=m.id order by f.sort_order, f.id limit 1) asc nulls last, m.id desc`
        : 'm.id desc');
    const total = (await c.query(`select count(*)::int as n from members m where ${where.join(' and ')}`, args)).rows[0].n;
    args.push(pageSize, (page - 1) * pageSize);
    const mq = await c.query(
      `select m.id, m.status, m.member_no, m.created_at, m.updated_at from members m where ${where.join(' and ')} order by ${orderBy} limit $${args.length - 1} offset $${args.length}`,
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

async function existingNidSet(c, iid, fields){
  const nidF = fields.find(f => bulk.fieldKind(f)==='nid');
  if(!nidF) return new Set();
  const q = await c.query(
    `select v.value from member_field_values v
     where v.institution_id=$1 and v.field_id=$2`, [iid, nidF.id]);
  const set = new Set();
  q.rows.forEach(r => { const n = bulk.normalizeNid(r.value); if(n) set.add(n); });
  return set;
}

/* POST /bulk/preview — متن یا ردیف‌ها → Normalize/Validate بدون ثبت */
r.post('/bulk/preview', asyncH(async (req, res) => {
  const b = req.body || {};
  const out = await withTenant(req.user, req.institutionId, async c => {
    const fields = await getActiveFields(c, req.institutionId);
    let rawRows = [];
    if(Array.isArray(b.rows) && b.rows.length){
      rawRows = b.rows.map(x => (x && x.values) ? x.values : (x || {}));
    } else {
      rawRows = bulk.parseMemberText(b.text || '', fields, b.template || null);
    }
    const existing = await existingNidSet(c, req.institutionId, fields);
    const rows = bulk.previewRows(fields, rawRows, existing);
    const counts = { ok:0, incomplete:0, invalid:0, duplicate:0 };
    rows.forEach(rw => { counts[rw.status] = (counts[rw.status]||0)+1; });
    return { fields: fields.map(f=>({key:f.key,label:f.label,type:f.type,is_required:f.is_required})), rows, counts, total: rows.length };
  });
  res.json(out);
}));

/* POST /bulk — فقط ردیف‌های تأییدشده؛ هر رکورد مستقل */
r.post('/bulk', asyncH(async (req, res) => {
  const list = Array.isArray((req.body||{}).rows) ? req.body.rows : [];
  if(!list.length) return res.status(400).json({ error: 'ردیفی برای ثبت ارسال نشده.' });
  const out = await withTenant(req.user, req.institutionId, async c => {
    const fields = await getActiveFields(c, req.institutionId);
    const existing = await existingNidSet(c, req.institutionId, fields);
    const classified = bulk.previewRows(fields, list.map(x => (x && x.values) ? x.values : (x||{})), existing);
    const created = [];
    const failed = [];
    const skipped = [];
    function genMemberNo(vals){
      const nid = vals.nid || vals.nationalId || vals.national_id || '';
      const nidPart = String(nid).replace(/\D/g,'').slice(-6) || '';
      const rand = Date.now().toString().slice(-4) + Math.floor(Math.random()*90+10);
      if(nidPart) return ('M-' + nidPart + rand.slice(-4));
      return ('M-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*100).toString().padStart(2,'0'));
    }
    const byKey = new Map(fields.map(f => [f.key, f]));
    for(const rw of classified){
      if(rw.status !== 'ok'){
        skipped.push({ i:rw.i, status:rw.status, errors:rw.errors });
        continue;
      }
      try {
        const memberNo = genMemberNo(rw.values);
        const mq = await c.query(
          'insert into members (institution_id, member_no) values ($1,$2) returning id, status, member_no, created_at',
          [req.institutionId, memberNo]);
        const member = mq.rows[0];
        for(const [k, val] of Object.entries(rw.values)){
          const def = byKey.get(k);
          if(!def) continue;
          if(val === '' && !def.is_required) continue;
          await c.query(
            'insert into member_field_values (member_id, field_id, institution_id, value) values ($1,$2,$3,$4)',
            [member.id, def.id, req.institutionId, val]);
        }
        const nidF = fields.find(f => bulk.fieldKind(f)==='nid');
        if(nidF && rw.values[nidF.key]) existing.add(rw.values[nidF.key]);
        created.push({ i:rw.i, id: member.id, member_no: member.member_no });
      } catch(e){
        failed.push({ i:rw.i, error: e.message });
      }
    }
    return {
      created: created.length,
      failed: failed.length,
      skipped: skipped.length,
      duplicate: skipped.filter(x=>x.status==='duplicate').length,
      review: skipped.filter(x=>x.status!=='duplicate').length,
      details: { created, failed, skipped }
    };
  });
  res.status(201).json(out);
}));

/* POST /bulk/ocr — تصویر → متن خام (بدون ثبت) */
r.post('/bulk/ocr', asyncH(async (req, res) => {
  try {
    const text = await extractTextFromImage(req.body && req.body.image, req.body && req.body.mime);
    res.json({ text });
  } catch(e){
    const code = e.code === 'OCR_UNAVAILABLE' ? 501 : 400;
    res.status(code).json({ error: e.message, code: e.code || 'OCR' });
  }
}));

r.get('/bulk/templates', asyncH(async (req, res) => {
  const rows = await withTenant(req.user, req.institutionId, async c => {
    try {
      const q = await c.query("select coalesce(import_templates, '[]'::jsonb) as t from institutions where id=$1", [req.institutionId]);
      const arr = q.rows[0] && q.rows[0].t;
      return Array.isArray(arr) ? arr : [];
    } catch(_){ return []; }
  });
  res.json({ templates: rows });
}));

r.post('/bulk/templates', asyncH(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name||'').trim();
  if(!name) return res.status(400).json({ error: 'نام قالب الزامی است.' });
  const tpl = {
    id: 't'+Date.now().toString(36),
    name,
    note: String(b.note||'').trim(),
    active: b.active !== false,
    columns: Array.isArray(b.columns) ? b.columns : [],
    created_at: new Date().toISOString()
  };
  const templates = await withTenant(req.user, req.institutionId, async c => {
    let arr = [];
    try {
      const q = await c.query("select coalesce(import_templates, '[]'::jsonb) as t from institutions where id=$1", [req.institutionId]);
      arr = Array.isArray(q.rows[0] && q.rows[0].t) ? q.rows[0].t : [];
    } catch(_){ arr = []; }
    arr.push(tpl);
    await c.query('update institutions set import_templates=$1::jsonb, updated_at=now() where id=$2', [JSON.stringify(arr), req.institutionId]);
    return arr;
  });
  res.status(201).json({ template: tpl, templates });
}));

/* GET /api/institutions/:id/members/:memberId */
r.get('/:memberId', asyncH(async (req, res) => {
  const mid = parseInt(req.params.memberId, 10);
  const m = await withTenant(req.user, req.institutionId, c => fetchMember(c, req.institutionId, mid));
  if (!m) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  res.json({ member: m });
}));

/* POST /api/institutions/:id/members {values:{fieldKey:...}, memberNo?} — بند ۸ و ۹ سند */
r.post('/', asyncH(async (req, res) => {
  const values = (req.body || {}).values || {};
  let memberNo = (req.body.memberNo || req.body.member_no || '').trim();

  function genMemberNo(vals){
    const nid = vals.nid || vals.nationalId || vals.national_id || vals.nationalID || '' ;
    const nidPart = String(nid).replace(/\D/g,'').slice(-6) || '';
    // شماره عضویت ساده بدون نیاز به نام انگلیسی - M- + 6 رقم کدملی + 4 رقم تصادفی
    const rand = Date.now().toString().slice(-4);
    if(nidPart) return ('M-' + nidPart + rand);
    return ('M-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*100).toString().padStart(2,'0'));
  }

  const result = await withTenant(req.user, req.institutionId, async c => {
    // فیلدها دقیقاً همان‌هایی هستند که در آنبردینگ/تنظیمات ساخته شده‌اند؛ بدون تزریق پیش‌فرض
    let defs = await getActiveFields(c, req.institutionId);
    const v = validateValues(defs, values, { partial: false });
    if (!v.ok) return { bad: true, errors: v.errors };

    if (!memberNo) memberNo = genMemberNo(v.values);

    const mq = await c.query(
      'insert into members (institution_id, member_no) values ($1,$2) returning id, status, member_no, created_at', [req.institutionId, memberNo]);
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

/* DELETE /api/institutions/:id/members/:memberId → حذف سخت (hard delete) per درخواست کاربر */
r.delete('/:memberId', asyncH(async (req, res) => {
  const mid = parseInt(req.params.memberId, 10);
  const row = await withTenant(req.user, req.institutionId, async c => {
    // اول مقادیر فیلدها را پاک کن، بعد خود عضو را
    await c.query('delete from member_field_values where member_id=$1', [mid]);
    const q = await c.query(
      'delete from members where id=$1 and institution_id=$2 returning id',
      [mid, req.institutionId]);
    return q.rows[0];
  });
  if (!row) return res.status(404).json({ error: 'عضو پیدا نشد.' });
  res.json({ deleted: true, memberId: mid, hard: true });
}));

module.exports = r;
