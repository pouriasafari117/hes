const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { asyncH, requireAuth } = require('../mw');

const r = express.Router();

function faToEnDigits(s){ return String(s||'').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }

/* POST /api/auth/register {name,email,password} - قدیمی برای سازگاری */
r.post('/register', asyncH(async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!name.trim() || !email.trim() || password.length < 6)
    return res.status(400).json({ error: 'نام، ایمیل و رمز حداقل ۶ حرف لازم است.' });
  let uid;
  try {
    const q = await pool.query('select fn_register_user($1,$2,$3) as id', [name.trim(), email.trim(), hashPassword(password)]);
    uid = q.rows[0].id;
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
    throw e;
  }
  res.status(201).json({ token: signToken({ id: uid, name: name.trim(), email: email.trim().toLowerCase() }), user: { id: uid, name: name.trim(), email: email.trim().toLowerCase() } });
}));

/* POST /api/auth/register-v2 - افتتاح حساب جدید
   body: {firstName, lastName, phone, nid, fatherName, birthDate, roleType: 'manager'|'user', institutionName?, institutionSlug?, ...}
   برای مدیر: اطلاعات مؤسسه هم می‌آید و مؤسسه ساخته می‌شود
*/
r.post('/register-v2', asyncH(async (req, res) => {
  const b = req.body || {};
  const firstName = (b.firstName || '').trim();
  const lastName = (b.lastName || '').trim();
  const phone = faToEnDigits((b.phone || '').trim());
  const nid = faToEnDigits((b.nid || '').trim());
  const fatherName = (b.fatherName || '').trim();
  const birthDate = b.birthDate ? new Date(b.birthDate) : null;
  const roleType = b.roleType === 'manager' ? 'manager' : 'user';
  const password = b.password || nid; // پیش‌فرض کدملی

  if (!firstName || !lastName || !phone || !nid) {
    return res.status(400).json({ error: 'نام، نام خانوادگی، شماره تماس و کد ملی الزامی است.' });
  }
  if (!/^09\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'شماره تماس باید با 09 شروع و 11 رقم باشد.' });
  }
  if (!/^\d{10}$/.test(nid)) {
    return res.status(400).json({ error: 'کد ملی باید 10 رقم باشد.' });
  }

  let uid;
  try {
    const q = await pool.query(
      'select fn_register_user_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',
      [firstName, lastName, phone, nid, fatherName, birthDate, roleType, b.email || '', hashPassword(password)]
    );
    uid = q.rows[0].id;
  } catch (e) {
    if (e.code === '23505') {
      const msg = e.detail && e.detail.includes('phone') ? 'این شماره تماس قبلاً ثبت شده است.' : 'این کد ملی قبلاً ثبت شده است.';
      return res.status(409).json({ error: msg });
    }
    throw e;
  }

  // اگر مدیر است و اطلاعات مؤسسه دارد، مؤسسه را بساز
  let institutionId = null;
  let institutionEmail = null;
  if (roleType === 'manager' && b.institutionName) {
    const instName = (b.institutionName || '').trim();
    let slug = (b.institutionSlug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
    if (!slug) slug = 'inst-' + Date.now().toString(36);
    const establishedAt = b.establishedAt ? new Date(b.establishedAt) : null;
    try {
      const iq = await pool.query(
        'select fn_create_institution_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',
        [uid, instName, slug, establishedAt, b.address || '', parseInt(b.installmentsCount)||12, b.currency||'تومان', parseFloat(b.feePercent)||4, b.installmentPeriod||'monthly']
      );
      institutionId = iq.rows[0].id;
      institutionEmail = slug.replace(/[^a-z0-9]/g,'') + nid + '@hes.com';
      // فیلدهای پیش‌فرض اعضا را بساز اگر فرستاده شده
      if (Array.isArray(b.memberFields) && b.memberFields.length) {
        for (let i=0;i<b.memberFields.length;i++) {
          const f = b.memberFields[i];
          if (!f.label) continue;
          const key = (f.key || f.label).toString().trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').slice(0,30) || 'field_'+i;
          await pool.query(
            `insert into field_definitions (institution_id, key, label, type, is_required, sort_order)
             values ($1,$2,$3,$4,$5,$6) on conflict (institution_id,key) do nothing`,
            [institutionId, key, f.label, f.type||'text', !!f.required, i]
          );
        }
      }
    } catch (e) {
      // اگر ساخت مؤسسه خطا داد، کاربر ساخته شده ولی مؤسسه نه - خطا را برگردان ولی کاربر را نگه دار
      console.error('create institution v2 failed', e);
    }
  }

  // اگر کاربر عادی است و نام مؤسسه دارد، درخواست عضویت بده
  if (roleType === 'user' && b.institutionName) {
    try {
      const instQ = await pool.query('select id from institutions where slug=$1 or name=$1 limit 1', [b.institutionName.trim()]);
      if (instQ.rows[0]) {
        await pool.query('select fn_request_join($1,$2)', [uid, instQ.rows[0].id]);
      }
    } catch (e) { console.error('request join failed', e); }
  }

  const token = signToken({ id: uid, name: firstName+' '+lastName, email: institutionEmail || phone+'@hes.local', phone, nid, role_type: roleType });
  res.status(201).json({
    token,
    user: { id: uid, firstName, lastName, phone, nid, roleType, email: institutionEmail },
    institutionId,
    institutionEmail
  });
}));

/* POST /api/auth/login - پشتیبانی از شماره تماس / کدملی / ایمیل */
r.post('/login', asyncH(async (req, res) => {
  const raw = (req.body.email || req.body.username || req.body.phone || '').trim();
  const password = (req.body.password || '').trim();
  if (!raw || !password) return res.status(400).json({ error: 'نام کاربری و رمز الزامی است.' });

  const loginVal = faToEnDigits(raw);
  // سعی کن با phone/nid/email پیدا کنی
  let q = await pool.query('select * from fn_user_by_phone($1)', [loginVal]);
  let u = q.rows[0];
  if (!u) {
    q = await pool.query('select * from fn_user_by_email($1)', [loginVal]);
    u = q.rows[0];
  }
  if (!u || !verifyPassword(password, u.password_hash)) {
    return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است. (پیش‌فرض: نام کاربری=شماره تماس، رمز=کدملی)' });
  }
  // توکن شامل نقش
  const token = signToken({ id: u.id, name: u.name, email: u.email, phone: u.phone, nid: u.nid, role_type: u.role_type || 'user' });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, phone: u.phone, nid: u.nid, roleType: u.role_type || u.role_type } });
}));

/* GET /api/auth/me */
r.get('/me', requireAuth, asyncH(async (req, res) => {
  const list = await pool.query('select * from fn_my_institutions($1)', [req.user.id]);
  // اطلاعات کامل کاربر
  const uq = await pool.query('select id, name, first_name, last_name, phone, nid, father_name, birth_date, role_type, email from users where id=$1', [req.user.id]);
  res.json({ user: uq.rows[0] || req.user, institutions: list.rows });
}));

/* POST /api/auth/request-join {institutionNameOrSlug} */
r.post('/request-join', requireAuth, asyncH(async (req, res) => {
  const name = (req.body.institutionName || '').trim();
  if (!name) return res.status(400).json({ error: 'نام مؤسسه الزامی است.' });
  const iq = await pool.query('select id from institutions where slug=$1 or name=$1 limit 1', [name]);
  if (!iq.rows[0]) return res.status(404).json({ error: 'مؤسسه‌ای با این نام پیدا نشد.' });
  const rq = await pool.query('select fn_request_join($1,$2) as id', [req.user.id, iq.rows[0].id]);
  res.json({ requestId: rq.rows[0].id, institutionId: iq.rows[0].id, status: 'pending' });
}));

module.exports = r;
