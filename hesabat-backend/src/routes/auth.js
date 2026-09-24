const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { asyncH, requireAuth } = require('../mw');

const r = express.Router();

function faToEnDigits(s){ return String(s||'').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }

/* قدیمی */
r.post('/register', asyncH(async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!name.trim() || !email.trim() || password.length < 6)
    return res.status(400).json({ error: 'نام، ایمیل و رمز حداقل ۶ حرف لازم است.' });
  let uid;
  try {
    const q = await pool.query('insert into users(name,email,password_hash) values($1,$2,$3) returning id', [name.trim(), email.trim().toLowerCase(), hashPassword(password)]);
    uid = q.rows[0].id;
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
    throw e;
  }
  res.status(201).json({ token: signToken({ id: uid, name: name.trim(), email: email.trim().toLowerCase() }), user: { id: uid, name: name.trim(), email: email.trim().toLowerCase() } });
}));

/* register-v2 - نسخه نهایی بدون هیچ ستون en - مستقیم SQL */
r.post('/register-v2', asyncH(async (req, res) => {
  const b = req.body || {};
  const firstName = (b.firstName || '').trim();
  const lastName = (b.lastName || '').trim();
  const phone = faToEnDigits((b.phone || '').trim());
  const nid = faToEnDigits((b.nid || '').trim());
  const fatherName = (b.fatherName || '').trim();
  const birthDate = b.birthDate ? new Date(b.birthDate) : null;
  const roleType = b.roleType === 'manager' ? 'manager' : 'user';
  const password = b.password || nid;

  if (!firstName || !lastName || !phone || !nid) {
    return res.status(400).json({ error: 'نام، نام خانوادگی، شماره تماس و کد ملی الزامی است.' });
  }
  if (!/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'شماره تماس باید با 09 شروع و 11 رقم باشد.' });
  if (!/^\d{10}$/.test(nid)) return res.status(400).json({ error: 'کد ملی باید 10 رقم باشد.' });

  // چک تکراری - مستقیم
  const dupPhone = await pool.query('select id from users where lower(phone)=lower($1) limit 1', [phone]);
  if (dupPhone.rows[0]) return res.status(409).json({ error: 'این شماره تماس قبلاً ثبت شده است.' });
  const dupNid = await pool.query('select id from users where nid=$1 limit 1', [nid]);
  if (dupNid.rows[0]) return res.status(409).json({ error: 'این کد ملی قبلاً ثبت شده است.' });

  const emailAuto = (b.email || '').trim().toLowerCase() || (phone + '@hes.local');
  let uid;
  try {
    const q = await pool.query(
      `insert into users(first_name, last_name, name, phone, nid, father_name, birth_date, role_type, email, password_hash)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [firstName, lastName, firstName+' '+lastName, phone, nid, fatherName, birthDate, roleType, emailAuto, hashPassword(password)]
    );
    uid = q.rows[0].id;
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'این شماره/کدملی قبلاً ثبت شده.' });
    console.error('register-v2 insert failed', e);
    return res.status(500).json({ error: 'خطا در ثبت کاربر: '+e.message });
  }

  let institutionId = null;
  let institutionEmail = null;
  if (roleType === 'manager' && b.institutionName) {
    const instName = (b.institutionName || '').trim();
    let slug = (b.institutionSlug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
    if (!slug) slug = 'inst-' + Date.now().toString(36);
    const establishedAt = b.establishedAt ? new Date(b.establishedAt) : null;
    try {
      const slugBase = slug.replace(/[^a-z0-9]/g,'') || 'inst';
      institutionEmail = slugBase + nid + '@hes.com';
      const fundBalance = Math.max(0, parseInt(faToEnDigits(String(b.fundBalance == null ? 0 : b.fundBalance)).replace(/[^0-9-]/g,'')) || 0);
      const iq = await pool.query(
        `insert into institutions(name, slug, owner_id, established_at, address, installments_count, currency, fee_percent, installment_period, fund_balance, bot_email, bot_active)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) returning id`,
        [instName, slug, uid, establishedAt, b.address || '', parseInt(b.installmentsCount)||12, b.currency||'تومان', parseFloat(b.feePercent)||4, b.installmentPeriod||'monthly', fundBalance, institutionEmail]
      );
      institutionId = iq.rows[0].id;
      try {
        await pool.query('insert into institution_audit(institution_id,user_id,action,old_value,new_value,note) values($1,$2,$3,$4,$5,$6)',
          [institutionId, uid, 'fund_balance', '0', String(fundBalance), 'موجودی اولیه هنگام ساخت مؤسسه']);
      } catch(e){ console.warn('initial fund_balance audit failed:', e.message); }
      await pool.query('insert into institution_members(user_id, institution_id, role) values($1,$2,$3) on conflict do nothing', [uid, institutionId, 'owner']);
      await pool.query('update users set email=$1 where id=$2', [institutionEmail, uid]);

      // فیلدهای اعضا دقیقاً از انتخاب کاربر - بدون هیچ en
      const labelToKey = {
        'نام': 'name', 'نام و نام خانوادگی': 'name', 'نام خانوادگی': 'last_name',
        'نام پدر': 'father', 'موبایل': 'mobile', 'شماره تماس': 'mobile',
        'کدملی': 'nationalId', 'کد ملی': 'nationalId', 'تاریخ تولد': 'birthDate',
        'آدرس': 'address', 'شغل': 'job', 'شهر': 'city', 'مدرک': 'degree'
      };
      const labelToType = {
        'نام': 'text', 'نام و نام خانوادگی': 'text', 'نام خانوادگی': 'text',
        'نام پدر': 'text', 'موبایل': 'number', 'شماره تماس': 'number', 'شماره موبایل': 'number',
        'کدملی': 'number', 'کد ملی': 'number', 'تاریخ تولد': 'date',
        'آدرس': 'text', 'شغل': 'text', 'شهر': 'text', 'مدرک': 'text'
      };
      function inferFieldType(lbl, clientType){
        if (/موبایل|شماره تماس|کد\s*ملی/.test(lbl)) return 'number';
        if (/تاریخ/.test(lbl)) return 'date';
        if (clientType && clientType !== 'text') return clientType;
        return labelToType[lbl] || 'text';
      }
      const defaultFields = [
        {key:'name', label:'نام و نام خانوادگی', type:'text', required:true},
        {key:'father', label:'نام پدر', type:'text', required:false},
        {key:'mobile', label:'شماره تماس', type:'number', required:true},
        {key:'nationalId', label:'کد ملی', type:'number', required:true},
        {key:'birthDate', label:'تاریخ تولد', type:'date', required:true},
      ];
      let fieldsToCreate = [];
      if (Array.isArray(b.memberFields) && b.memberFields.length) {
        fieldsToCreate = b.memberFields.filter(f=>f && f.label).map((f,i)=>{
          const lbl = String(f.label).trim();
          const key = labelToKey[lbl] || (f.key || lbl).toString().trim().toLowerCase().replace(/[^a-z0-9_]+/g,'_').slice(0,30) || 'field_'+i;
          const type = inferFieldType(lbl, f.type);
          return {key, label: lbl, type, required: !!f.required || lbl==='نام' || lbl==='نام و نام خانوادگی'};
        });
      } else {
        fieldsToCreate = defaultFields;
      }
      for (let i=0;i<fieldsToCreate.length;i++) {
        const f = fieldsToCreate[i];
        await pool.query(
          `insert into field_definitions (institution_id, key, label, type, is_required, sort_order)
           values ($1,$2,$3,$4,$5,$6) on conflict (institution_id,key) do nothing`,
          [institutionId, f.key, f.label, f.type||'text', !!f.required, i]
        );
      }
    } catch (e) {
      console.error('create institution v2 failed', e);
      // اگر مؤسسه ساخته نشد، کاربر را نگه دار ولی خطا را لاگ کن - برای دیباگ
      // institutionId null می‌ماند ولی ثبت‌نام موفق است
    }
  }

  if (roleType === 'user' && b.institutionName) {
    try {
      const instQ = await pool.query('select id from institutions where slug=$1 or name=$1 limit 1', [b.institutionName.trim()]);
      if (instQ.rows[0]) {
        await pool.query('insert into institution_join_requests(user_id, institution_id, status) values($1,$2,$3) on conflict (user_id, institution_id) do update set status=$3', [uid, instQ.rows[0].id, 'pending']);
      }
    } catch (e) { console.error('request join failed', e); }
  }

  const token = signToken({ id: uid, name: firstName+' '+lastName, email: institutionEmail || phone+'@hes.local', phone, nid, role_type: roleType });
  res.status(201).json({
    token,
    user: { id: uid, firstName, lastName, name: firstName+' '+lastName, phone, nid, roleType, email: institutionEmail || emailAuto },
    institutionId,
    institutionEmail
  });
}));

/* login - مستقیم بدون تابع، جستجو با phone/nid/email */
r.post('/login', asyncH(async (req, res) => {
  const raw = (req.body.email || req.body.username || req.body.phone || '').trim();
  const password = (req.body.password || '').trim();
  if (!raw || !password) return res.status(400).json({ error: 'نام کاربری و رمز الزامی است.' });
  const loginVal = faToEnDigits(raw);
  // جستجو: phone دقیق، nid دقیق، email دقیق (case-insensitive)
  let q = await pool.query(
    `select id, name, first_name, last_name, email, password_hash, phone, nid, role_type
     from users where lower(phone)=lower($1) or nid=$1 or lower(email)=lower($1) limit 1`,
    [loginVal]
  );
  let u = q.rows[0];
  if (!u) {
    // تلاش دوم: اگر کاربر شماره را با فاصله یا ... زده، فقط با nid یا phone بدون lower
    q = await pool.query(
      `select id, name, first_name, last_name, email, password_hash, phone, nid, role_type
       from users where phone=$1 or nid=$1 limit 1`,
      [raw]
    );
    u = q.rows[0];
  }
  if (!u) return res.status(401).json({ error: 'حسابی با این شماره/کدملی پیدا نشد. ابتدا افتتاح حساب کنید.' });
  if (!verifyPassword(password, u.password_hash)) {
    return res.status(401).json({ error: 'رمز اشتباه است. (پیش‌فرض: رمز = کد ملی)' });
  }
  const token = signToken({ id: u.id, name: u.name, email: u.email, phone: u.phone, nid: u.nid, role_type: u.role_type || 'user' });
  res.json({ token, user: { id: u.id, name: u.name, firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone, nid: u.nid, roleType: u.role_type } });
}));

r.get('/me', requireAuth, asyncH(async (req, res) => {
  const uq = await pool.query('select id, name, first_name, last_name, phone, nid, father_name, birth_date, role_type, email from users where id=$1', [req.user.id]);
  const list = await pool.query(
    `select i.id, i.name, i.slug, i.status, im.role from institution_members im join institutions i on i.id=im.institution_id where im.user_id=$1 order by i.id`,
    [req.user.id]
  );
  res.json({ user: uq.rows[0] || req.user, institutions: list.rows });
}));

r.patch('/me', requireAuth, asyncH(async (req, res) => {
  const { name, phone, email, password, currentPassword } = req.body || {};
  const uid = req.user.id;
  if(password){
    const q = await pool.query('select password_hash from users where id=$1', [uid]);
    const u = q.rows[0];
    if(!u) return res.status(404).json({ error: 'کاربر پیدا نشد.' });
    if(currentPassword && !verifyPassword(currentPassword, u.password_hash)){
      return res.status(400).json({ error: 'رمز فعلی اشتباه است.' });
    }
  }
  const sets = []; const vals = []; let idx=1;
  if(name!==undefined){ sets.push(`name=$${idx++}`); vals.push(String(name).trim()); }
  if(phone!==undefined){ sets.push(`phone=$${idx++}`); vals.push(String(phone).trim()); }
  if(email!==undefined){ sets.push(`email=$${idx++}`); vals.push(String(email).trim().toLowerCase()); }
  if(password!==undefined && String(password).trim()){
    if(String(password).trim().length<4) return res.status(400).json({ error: 'رمز باید حداقل ۴ کاراکتر باشد.' });
    sets.push(`password_hash=$${idx++}`); vals.push(hashPassword(String(password).trim()));
  }
  if(sets.length){
    vals.push(uid);
    try{ await pool.query(`update users set ${sets.join(', ')} where id=$${idx}`, vals); }
    catch(e){ if(e.code==='23505') return res.status(409).json({ error: 'این نام کاربری/شماره قبلاً استفاده شده.' }); throw e; }
  }
  const uq = await pool.query('select id, name, first_name, last_name, phone, nid, email, role_type from users where id=$1', [uid]);
  res.json({ user: uq.rows[0] });
}));

r.post('/request-join', requireAuth, asyncH(async (req, res) => {
  const name = (req.body.institutionName || '').trim();
  if (!name) return res.status(400).json({ error: 'نام مؤسسه الزامی است.' });
  const iq = await pool.query('select id from institutions where slug=$1 or name=$1 limit 1', [name]);
  if (!iq.rows[0]) return res.status(404).json({ error: 'مؤسسه‌ای با این نام پیدا نشد.' });
  const rq = await pool.query(
    `insert into institution_join_requests(user_id, institution_id, status) values($1,$2,$3)
     on conflict (user_id, institution_id) do update set status=$3, updated_at=now() returning id`,
    [req.user.id, iq.rows[0].id, 'pending']
  );
  res.json({ requestId: rq.rows[0].id, institutionId: iq.rows[0].id, status: 'pending' });
}));

module.exports = r;
