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

/* CORS برای اتصال پنل از هر مبدأ (فایل محلی یا سرور دیگر) */
const CORS = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'hesabat-backend', v: 1 }));
app.get('/api/debug', async (req, res) => {
  try {
    const { pool } = require('./src/db');
    const c1 = await pool.query('select 1 as ok');
    const c2 = await pool.query('select count(*) as n from users');
    const c3 = await pool.query('select proname from pg_proc where proname like \'fn_%\'');
    res.json({ ok: true, db: c1.rows[0], users_count: c2.rows[0], funcs: c3.rows.map(r=>r.proname) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, code: e.code, detail: e.detail, stack: e.stack?.slice(0,1000) });
  }
});
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/institutions', require('./src/routes/institutions'));
app.use('/api/institutions/:id/fields', require('./src/routes/fields'));
app.use('/api/institutions/:id/members', require('./src/routes/members'));

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
app.listen(PORT, () => console.log(`Hesabat API on http://localhost:${PORT}`));
