const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');
const { asyncH, requireAuth } = require('../mw');

const r = express.Router();

/* POST /api/auth/register {name,email,password} */
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

/* POST /api/auth/login {email,password} */
r.post('/login', asyncH(async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const q = await pool.query('select * from fn_user_by_email($1)', [email.trim()]);
  const u = q.rows[0];
  if (!u || !verifyPassword(password, u.password_hash))
    return res.status(401).json({ error: 'ایمیل یا رمز اشتباه است.' });
  res.json({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email } });
}));

/* GET /api/auth/me */
r.get('/me', requireAuth, asyncH(async (req, res) => {
  const list = await pool.query('select * from fn_my_institutions($1)', [req.user.id]);
  res.json({ user: req.user, institutions: list.rows });
}));

module.exports = r;
