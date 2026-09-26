const { verifyToken } = require('./auth');
const { pool } = require('./db');

function asyncH(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده است.' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'توکن نامعتبر یا منقضی است.' });
  req.user = { id: payload.uid, name: payload.name, email: payload.email, role_type: payload.role_type || 'user' };
  next();
}

/* راستی‌آزمایی دسترسی به مؤسسه (بند ۱۱): اول عضویت، بعد کانتکست */
async function requireInstitution(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه مؤسسه نامعتبر است.' });
    const r = await pool.query('select 1 from fn_my_institutions($1) where id = $2', [req.user.id, id]);
    if (r.rowCount === 0) return res.status(403).json({ error: 'به این مؤسسه دسترسی ندارید.' });
    req.institutionId = id;
    next();
  } catch (e) { next(e); }
}

module.exports = { asyncH, requireAuth, requireInstitution };
