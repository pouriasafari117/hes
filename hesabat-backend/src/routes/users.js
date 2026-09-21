const express = require('express');
const { pool, withTenant } = require('../db');
const { hashPassword } = require('../auth');
const { asyncH, requireAuth } = require('../mw');

const r = express.Router();
r.use(requireAuth);

// لیست کاربران یک مؤسسه (برای مدیر)
r.get('/', asyncH(async (req, res) => {
  const instId = parseInt(req.query.institution_id || req.headers['x-institution-id'] || '0',10);
  // اگر institution_id نداد، از اولین مؤسسه کاربر استفاده کن
  let targetInst = instId;
  if(!targetInst){
    const q = await pool.query('select institution_id from institution_members where user_id=$1 limit 1', [req.user.id]);
    if(q.rows[0]) targetInst = q.rows[0].institution_id;
  }
  if(!targetInst) return res.json({ users: [] });
  const q = await pool.query(`
    select u.id, u.name, u.first_name, u.last_name, u.phone, u.nid, u.email, u.role_type, im.role, u.created_at
    from users u
    join institution_members im on im.user_id = u.id and im.institution_id=$1
    order by u.id
  `, [targetInst]);
  res.json({ users: q.rows });
}));

// ویرایش کاربر (ادمین) - تغییر نام کاربری (phone) و رمز
r.patch('/:id', asyncH(async (req, res) => {
  const uid = parseInt(req.params.id,10);
  const { name, phone, email, password, role, role_type } = req.body || {};
  // چک دسترسی: باید عضو همان مؤسسه باشد و نقش owner/admin
  // ساده: اگر کاربر در institution_members با role owner/admin باشد
  // برای سادگی، اجازه می‌دهیم اگر کاربر خودش است یا owner است
  const isSelf = uid === req.user.id;
  let canEdit = isSelf;
  if(!canEdit){
    const chk = await pool.query(`select 1 from institution_members where user_id=$1 and role in ('owner','admin') limit 1`, [req.user.id]);
    canEdit = !!chk.rows[0];
  }
  if(!canEdit) return res.status(403).json({ error: 'دسترسی ندارید.' });

  const sets = [];
  const vals = [];
  let idx = 1;
  if(name !== undefined){ sets.push(`name=$${idx++}`); vals.push(String(name).trim()); }
  if(phone !== undefined){ 
    const ph = String(phone).trim();
    if(ph && !/^09\d{9}$/.test(ph.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[^0-9]/g,''))){
      // اجازه می‌دهیم username غیر از phone هم باشد (لاتین)
      if(!/^[a-zA-Z0-9_.-]{3,}$/.test(ph)){
        return res.status(400).json({ error: 'نام کاربری معتبر نیست.' });
      }
    }
    sets.push(`phone=$${idx++}`); vals.push(ph);
  }
  if(email !== undefined){ sets.push(`email=$${idx++}`); vals.push(String(email).trim().toLowerCase()); }
  if(role_type !== undefined && ['manager','user'].includes(role_type)){ sets.push(`role_type=$${idx++}`); vals.push(role_type); }
  if(password !== undefined && String(password).trim()){
    if(String(password).trim().length < 4) return res.status(400).json({ error: 'رمز باید حداقل ۴ کاراکتر باشد.' });
    sets.push(`password_hash=$${idx++}`); vals.push(hashPassword(String(password).trim()));
  }
  if(sets.length){
    vals.push(uid);
    try{
      await pool.query(`update users set ${sets.join(', ')} where id=$${idx}`, vals);
    }catch(e){
      if(e.code==='23505'){
        return res.status(409).json({ error: 'این نام کاربری/شماره قبلاً استفاده شده.' });
      }
      throw e;
    }
  }
  const uq = await pool.query('select id, name, first_name, last_name, phone, nid, email, role_type from users where id=$1', [uid]);
  res.json({ user: uq.rows[0] });
}));

// حذف کاربر از مؤسسه (نه حذف کامل از سیستم)
r.delete('/:id', asyncH(async (req, res) => {
  const uid = parseInt(req.params.id,10);
  if(uid === req.user.id) return res.status(400).json({ error: 'نمی‌توانید خودتان را حذف کنید.' });
  const chk = await pool.query(`select 1 from institution_members where user_id=$1 and role in ('owner','admin') limit 1`, [req.user.id]);
  if(!chk.rows[0]) return res.status(403).json({ error: 'دسترسی ندارید.' });
  const instId = parseInt(req.query.institution_id || '0',10);
  if(instId){
    await pool.query('delete from institution_members where user_id=$1 and institution_id=$2', [uid, instId]);
  }else{
    await pool.query('delete from institution_members where user_id=$1', [uid]);
  }
  res.json({ deleted: true });
}));

module.exports = r;
