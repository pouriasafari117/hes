const express = require('express');
const { pool } = require('../db');
const { asyncH, requireAuth } = require('../mw');

const r = express.Router();
r.use(requireAuth);

async function instByCode(code){
  const q = await pool.query('select * from fn_inst_by_code($1)', [String(code||'').trim()]);
  return q.rows[0] || null;
}

r.get('/me', asyncH(async (req, res) => {
  const uq = await pool.query('select id, name, first_name, last_name, phone, nid, email, role_type from users where id=$1', [req.user.id]);
  const ms = await pool.query(
    `select r.institution_id, r.status, r.type, i.name as institution_name, coalesce(i.plan_type,'free') as plan_type, i.public_code, i.bot_email
     from requests r join institutions i on i.id=r.institution_id
     where r.user_id=$1 and r.type='membership' order by r.created_at desc`, [req.user.id]).catch(()=>({rows:[]}));
  let activeRows = [];
  try {
    const a = await pool.query('select fn_portal_my_memberships($1) as j', [req.user.id]);
    activeRows = a.rows[0] && a.rows[0].j ? a.rows[0].j : [];
    if(!Array.isArray(activeRows)) activeRows = [];
  } catch(_){}
  const seen = new Set();
  const memberships = [];
  activeRows.forEach(x => { seen.add(String(x.institution_id)); memberships.push(x); });
  (ms.rows||[]).forEach(x => { if(!seen.has(String(x.institution_id))) memberships.push(x); });
  const nq = await pool.query('select count(*)::int as n from notifications where user_id=$1 and read_at is null', [req.user.id]).catch(()=>({rows:[{n:0}]}));
  res.json({ user: uq.rows[0], memberships, unread: (nq.rows[0]&&nq.rows[0].n)||0 });
}));

r.get('/lookup', asyncH(async (req, res) => {
  const inst = await instByCode(req.query.code);
  if(!inst) return res.status(404).json({ error: 'نتیجه‌ای پیدا نشد.' });
  res.json({ institution: { id: inst.id, name: inst.name, public_code: inst.public_code, plan_type: inst.plan_type } });
}));

r.get('/fields', asyncH(async (req, res) => {
  const iid = parseInt(req.query.institution_id || req.query.institutionId, 10);
  if(!iid) return res.status(400).json({ error: 'مؤسسه الزامی است.' });
  const q = await pool.query('select fn_portal_fields($1) as j', [iid]);
  const fields = (q.rows[0] && q.rows[0].j) || [];
  res.json({ fields: Array.isArray(fields) ? fields : [] });
}));

r.post('/memberships', asyncH(async (req, res) => {
  const inst = await instByCode(req.body.code || req.body.email || req.body.public_code);
  if(!inst) return res.status(404).json({ error: 'نتیجه‌ای پیدا نشد.' });
  if(String(inst.plan_type||'free') !== 'pro')
    return res.status(403).json({ error: 'این مؤسسه هنوز پلن حرفه‌ای ندارد.' });
  const mem = await pool.query(
    'select id from members where institution_id=$1 and user_id=$2 and deleted_at is null', [inst.id, req.user.id]);
  if(mem.rows[0]) return res.status(409).json({ error: 'شما در این مؤسسه عضو هستید.' });
  const values = req.body.values && typeof req.body.values === 'object' ? req.body.values : {};
  try {
    const rq = await pool.query(
      `insert into requests(institution_id, user_id, type, status, payload)
       values($1,$2,'membership','pending',$3) returning *`,
      [inst.id, req.user.id, JSON.stringify({ values })]);
    await pool.query('select fn_notify($1,$2,$3,$4,$5,$6)',
      [inst.owner_id, inst.id, 'membership', 'درخواست عضویت جدید', 'یک کاربر درخواست عضویت ارسال کرده است.', rq.rows[0].id]);
    res.status(201).json({ request: rq.rows[0] });
  } catch (e) {
    if(e.code === '23505') return res.status(409).json({ error: 'درخواست عضویت شما قبلاً ارسال شده است.' });
    throw e;
  }
}));

r.post('/requests', asyncH(async (req, res) => {
  const type = String(req.body.type||'').trim();
  if(!['loan','payment'].includes(type)) return res.status(400).json({ error: 'نوع درخواست نامعتبر است.' });
  const iid = parseInt(req.body.institution_id, 10);
  if(!iid) return res.status(400).json({ error: 'مؤسسه الزامی است.' });
  const mem = await pool.query(
    'select id from members where institution_id=$1 and user_id=$2 and deleted_at is null', [iid, req.user.id]);
  if(!mem.rows[0]) return res.status(403).json({ error: 'عضویت فعال در این مؤسسه ندارید.' });
  const inst = (await pool.query('select owner_id, coalesce(plan_type,\'free\') as plan_type from institutions where id=$1', [iid])).rows[0];
  if(!inst || inst.plan_type !== 'pro') return res.status(403).json({ error: 'این قابلیت روی پلن حرفه‌ای فعال است.' });
  const amount = parseInt(String(req.body.amount||'').replace(/[^0-9]/g,''), 10) || 0;
  if(type==='loan' && amount<=0) return res.status(400).json({ error: 'مبلغ وام الزامی است.' });
  const note = String(req.body.note||req.body.description||'').trim();
  try {
    const rq = await pool.query(
      `insert into requests(institution_id, user_id, type, status, payload)
       values($1,$2,$3,'pending',$4) returning *`,
      [iid, req.user.id, type, JSON.stringify({ amount, note, member_id: mem.rows[0].id })]);
    const titles = { loan:'درخواست وام جدید', payment:'درخواست پرداخت جدید' };
    await pool.query('select fn_notify($1,$2,$3,$4,$5,$6)',
      [inst.owner_id, iid, type, titles[type], note || ('مبلغ: '+amount), rq.rows[0].id]);
    res.status(201).json({ request: rq.rows[0] });
  } catch (e) {
    if(e.code === '23505') return res.status(409).json({ error: 'درخواست مشابه در انتظار بررسی است.' });
    throw e;
  }
}));

r.get('/requests', asyncH(async (req, res) => {
  const q = await pool.query(
    `select r.*, i.name as institution_name from requests r join institutions i on i.id=r.institution_id
     where r.user_id=$1 order by r.created_at desc limit 200`, [req.user.id]);
  res.json({ requests: q.rows });
}));

r.get('/notifications', asyncH(async (req, res) => {
  const q = await pool.query('select * from notifications where user_id=$1 order by created_at desc limit 100', [req.user.id]);
  res.json({ notifications: q.rows });
}));

r.post('/notifications/read-all', asyncH(async (req, res) => {
  await pool.query('update notifications set read_at=now() where user_id=$1 and read_at is null', [req.user.id]);
  res.json({ ok: true });
}));

r.get('/profile', asyncH(async (req, res) => {
  const iid = parseInt(req.query.institution_id || req.query.institutionId, 10);
  if(!iid) return res.status(400).json({ error: 'مؤسسه الزامی است.' });
  const q = await pool.query('select fn_portal_profile($1,$2) as j', [req.user.id, iid]);
  const j = q.rows[0] && q.rows[0].j;
  if(!j || j.ok === false) return res.status(403).json({ error: (j && j.error) || 'تا تأیید مدیر به اطلاعات مالی دسترسی ندارید.' });
  res.json(j);
}));

module.exports = r;
