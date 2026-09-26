/* Hesabat Backend API — Phase 1
   Panel → HTTP/JSON → Backend → SQL → PostgreSQL (RLS) */
const express = require('express');
const path = require('path');
const fs = require('fs');

/* بارگذاری سادهٔ .env بدون وابستگی */
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
} catch (_) {}

const app = express();
app.use(express.json({ limit: '2mb' }));

/* هدرهای امنیتی پایه — بدون وابستگی تازه */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/* CORS برای اتصال پنل از هر مبدأ (فایل محلی یا سرور دیگر) */
const CORS = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* محدودکنندهٔ نرخ ساده برای مسیرهای ورود/ثبت‌نام (جلوگیری از حدس رمز) */
const _rl = new Map();
function rateLimit(windowMs, max, msg){
  return (req, res, next) => {
    const now = Date.now();
    const key = (req.ip || 'x') + '|' + req.path;
    const arr = (_rl.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= max){
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: msg || 'درخواست‌های زیاد؛ کمی بعد دوباره بکوشید.' });
    }
    arr.push(now); _rl.set(key, arr);
    if (_rl.size > 5000) _rl.clear(); /* پاکسازی اسراف‌گونه نگذاریم */
    next();
  };
}
app.use('/api/auth', rateLimit(5 * 60 * 1000, 30));

app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./src/db');
    const c1 = await pool.query('select 1 as ok');
    res.json({ ok: true, service: 'hesabat-backend', v: 2, db_ok: true, db: c1.rows[0] });
  } catch (e) {
    res.json({ ok: false, service: 'hesabat-backend', v: 2, db_ok: false, error: e.message, code: e.code });
  }
});
/* مسیر دیباگ فقط وقتی روشن است که صراحتاً فعال شده باشد:
   ENABLE_DEBUG=1  (در محیط production پیش‌فرض خاموش است و 404 می‌دهد) */
if (process.env.ENABLE_DEBUG === '1') {
app.get('/api/debug', async (req, res) => {
  try {
    const { pool } = require('./src/db');
    const c1 = await pool.query('select 1 as ok');
    const c2 = await pool.query('select count(*) as n from users');
    const c3 = await pool.query('select proname from pg_proc where proname like \'fn_%\' order by proname');
    const c4 = await pool.query('select count(*) as n from institutions');
    let c5 = { rows: [] }, c5err = null;
    try {
      c5 = await pool.query('select id, name, slug, bot_email, owner_id, created_at from institutions order by id desc limit 20');
    } catch (e) {
      c5err = e.message;
      try {
        c5 = await pool.query('select id, name, slug, owner_id, created_at from institutions order by id desc limit 20');
      } catch (e2) { c5 = { rows: [], error: e2.message }; }
    }
    let c6 = { rows: [] };
    try {
      c6 = await pool.query('select id, name, phone, nid, email, role_type, created_at from users order by id desc limit 20');
    } catch (e) {
      c6 = await pool.query('select id, name, email, created_at from users order by id desc limit 20');
    }
    res.json({ ok: true, db: c1.rows[0], users_count: c2.rows[0], institutions_count: c4.rows[0], funcs: c3.rows.map(r=>r.proname), recent_institutions: c5.rows, recent_users: c6.rows, debug_note: c5err ? 'bot_email missing, did you run migration? '+c5err : null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, code: e.code, detail: e.detail });
  }
});
}
app.get('/api/public/stats', async (req, res) => {
  try {
    const { pool } = require('./src/db');
    let n = 0;
    try {
      n = (await pool.query('select count(*)::int as n from members where deleted_at is null')).rows[0].n;
    } catch (_) {
      n = (await pool.query('select count(*)::int as n from members')).rows[0].n;
    }
    res.json({ members: n });
  } catch (e) {
    res.json({ members: 0 });
  }
});
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/portal', require('./src/routes/portal'));
app.use('/api/institutions', require('./src/routes/institutions'));
app.use('/api/institutions/:id', require('./src/routes/workflow'));
app.use('/api/institutions/:id/fields', require('./src/routes/fields'));
app.use('/api/institutions/:id/members', require('./src/routes/members'));
app.use('/api/institutions/:id/stats', require('./src/routes/stats'));
app.use('/api/institutions/:id/loans', require('./src/routes/loans'));
app.use('/api/institutions/:id/funds', require('./src/routes/funds'));
app.use('/api/institutions/:id/accounts', require('./src/routes/accounts'));
app.use('/api/institutions/:id/payments', require('./src/routes/payments'));
app.use('/api/institutions/:id/installments', require('./src/routes/installments'));
app.use('/api/institutions/:id/txns', require('./src/routes/txns'));
app.use('/api/institutions/:id/reports', require('./src/routes/reports'));

/* سرو کردن فایل‌های پنل + لندینگ — سازگار با Render و Railway
   Railway وقتی Root Directory = hesabat-backend باشه، /app = hesabat-backend
   و فایل‌های پنل یا در .. (ریشه ریپو) هستند یا در خود __dirname (اگر کپی شده باشند) */
function findFile(name) {
  const candidates = [
    path.join(__dirname, '..', name),
    path.join(__dirname, name),
    path.join(process.cwd(), '..', name),
    path.join(process.cwd(), name),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return candidates[0];
}
const PANEL_DIR_CANDIDATES = [path.join(__dirname, '..'), __dirname, path.join(process.cwd(), '..'), process.cwd()];
function panelExists(f) {
  for (const d of PANEL_DIR_CANDIDATES) if (fs.existsSync(path.join(d, f))) return true;
  return false;
}

app.get('/Panel.html', (req, res) => res.sendFile(findFile('Panel.html')));
app.get('/panel.html', (req, res) => res.sendFile(findFile('Panel.html')));
app.get('/panel.css', (req, res) => res.sendFile(findFile('panel.css')));
app.get('/panel.js', (req, res) => res.sendFile(findFile('panel.js')));
app.get('/Hesabat.html', (req, res) => res.sendFile(findFile('Hesabat.html')));
app.get('/hesabat.html', (req, res) => res.sendFile(findFile('Hesabat.html')));
app.get('/', (req, res) => {
  if (panelExists('Hesabat.html')) return res.sendFile(findFile('Hesabat.html'));
  if (panelExists('Panel.html')) return res.sendFile(findFile('Panel.html'));
  return res.redirect('/Panel.html');
});

app.use((req, res) => res.status(404).json({ error: 'مسیر پیدا نشد.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور.' });
});

const PORT = +(process.env.PORT || 4000);

/* هشدار امنیتی هنگام اجرا با تنظیمات توسعهٔ پیش‌فرض روی محیط واقعی */
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-only-secret-change-me') {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET تعیین نشده؛ در production حتماً JWT_SECRET قوی ست کنید.');
  } else {
    console.warn('[DEV] JWT_SECRET تنظیم نشده — فقط برای توسعهٔ محلی مناسب است.');
  }
}

app.listen(PORT, () => console.log(`Hesabat API on http://localhost:${PORT}`));
