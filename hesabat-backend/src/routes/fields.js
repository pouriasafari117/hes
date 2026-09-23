const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');
const { validateFieldPayload, KEY_RE } = require('../validate');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

function slugKey(label) {
  const raw = String(label||'').trim();
  let base = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  // اگر عنوان فارسی یا خالی بود، کلید یکتا بساز
  if (!base || base.length < 2 || base === 'field' || /^_+$/.test(base)) {
    const rnd = Math.random().toString(36).slice(2,6);
    const ts = Date.now().toString(36);
    base = 'field_' + ts + '_' + rnd;
  }
  const k = base.slice(0, 48);
  return KEY_RE.test(k) ? k : 'f_' + k.replace(/^[^a-z]+/, '');
}


/* GET /api/institutions/:id/fields — فیلدهای فعال (بند ۶ سند) */
r.get('/', asyncH(async (req, res) => {
  const includeArchived = req.query.includeArchived === '1';
  const rows = await withTenant(req.user, req.institutionId, async c => {
    // فیلدها دقیقاً همان‌هایی هستند که هنگام ساخت مؤسسه (آنبردینگ) یا در تنظیمات ساخته شده‌اند؛
    // هیچ فیلد پیش‌فرضی به‌صورت خودکار تزریق نمی‌شود تا انتخاب کاربر دست‌نخورده بماند.
    const q = await c.query(
      `select id, key, label, type, is_required, options, sort_order, archived, created_at
       from field_definitions
       where institution_id=$1 ${includeArchived ? '' : 'and archived=false'}
       order by sort_order, id`, [req.institutionId]);
    return q.rows;
  });
  res.json({ fields: rows });
}));

/* POST /api/institutions/:id/fields — ایجاد فیلد جدید (بدون تغییر اسکیمای دیتابیس) */
r.post('/', asyncH(async (req, res) => {
  const b = req.body || {};
  const errs = validateFieldPayload(b, { partial: false });
  if (errs.length) return res.status(400).json({ error: errs.join(' ') });
  let key = String(b.key || '').trim();
  if (!key) key = slugKey(b.label);
  if (!KEY_RE.test(key)) return res.status(400).json({ error: 'کلید فیلد نامعتبر است.' });
  try {
    const row = await withTenant(req.user, req.institutionId, async c => {
      const q = await c.query(
        `insert into field_definitions (institution_id, key, label, type, is_required, options, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id, key, label, type, is_required, options, sort_order, archived`,
        [req.institutionId, key, b.label.trim(), b.type, !!b.is_required,
         JSON.stringify(Array.isArray(b.options) ? b.options : []),
         Number.isFinite(+b.sort_order) ? +b.sort_order : 0]);
      return q.rows[0];
    });
    res.status(201).json({ field: row });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: `فیلدی با کلید «${key}» از قبل وجود دارد.` });
    throw e;
  }
}));

/* PATCH /api/institutions/:id/fields/:fieldId */
r.patch('/:fieldId', asyncH(async (req, res) => {
  const fid = parseInt(req.params.fieldId, 10);
  const b = req.body || {};
  const errs = validateFieldPayload(b, { partial: true });
  if (errs.length) return res.status(400).json({ error: errs.join(' ') });
  const sets = [], args = [];
  const add = (col, val) => { args.push(val); sets.push(`${col}=$${args.length}`); };
  if ('label' in b) add('label', String(b.label).trim());
  if ('type' in b) add('type', b.type);
  if ('is_required' in b) add('is_required', !!b.is_required);
  if ('options' in b) add('options', JSON.stringify(Array.isArray(b.options) ? b.options : []));
  if ('sort_order' in b) add('sort_order', +b.sort_order || 0);
  if ('archived' in b) add('archived', !!b.archived);
  if (!sets.length) return res.status(400).json({ error: 'هیچ فیلدی برای ویرایش ارسال نشده.' });
  args.push(fid, req.institutionId);
  const row = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(
      `update field_definitions set ${sets.join(', ')} where id=$${args.length - 1} and institution_id=$${args.length}
       returning id, key, label, type, is_required, options, sort_order, archived`, args);
    return q.rows[0];
  });
  if (!row) return res.status(404).json({ error: 'فیلد پیدا نشد.' });
  res.json({ field: row });
}));

/* DELETE /api/institutions/:id/fields/:fieldId → آرشیو (حذف نرم؛ مقادیر قدیمی اعضا نمی‌شکنند) */
r.delete('/:fieldId', asyncH(async (req, res) => {
  const fid = parseInt(req.params.fieldId, 10);
  const row = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(
      'update field_definitions set archived=true where id=$1 and institution_id=$2 returning id',
      [fid, req.institutionId]);
    return q.rows[0];
  });
  if (!row) return res.status(404).json({ error: 'فیلد پیدا نشد.' });
  res.json({ archived: true, fieldId: fid });
}));

module.exports = r;
