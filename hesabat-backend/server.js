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
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/institutions', require('./src/routes/institutions'));
app.use('/api/institutions/:id/fields', require('./src/routes/fields'));
app.use('/api/institutions/:id/members', require('./src/routes/members'));

/* سرو کردن فایل‌های پنل + لندینگ از همان سرور (برای دیپلوی تمیز یک‌جا) */
const PANEL_DIR = path.join(__dirname, '..');
app.get('/Panel.html', (req, res) => res.sendFile(path.join(PANEL_DIR, 'Panel.html')));
app.get('/panel.html', (req, res) => res.sendFile(path.join(PANEL_DIR, 'Panel.html')));
app.get('/panel.css', (req, res) => res.sendFile(path.join(PANEL_DIR, 'panel.css')));
app.get('/panel.js', (req, res) => res.sendFile(path.join(PANEL_DIR, 'panel.js')));
app.get('/Hesabat.html', (req, res) => res.sendFile(path.join(PANEL_DIR, 'Hesabat.html')));
app.get('/hesabat.html', (req, res) => res.sendFile(path.join(PANEL_DIR, 'Hesabat.html')));
// روت اصلی: اگر Hesabat.html وجود داشت لندینگ را بده، وگرنه برو پنل
app.get('/', (req, res) => {
  const hesPath = path.join(PANEL_DIR, 'Hesabat.html');
  if (fs.existsSync(hesPath)) return res.sendFile(hesPath);
  return res.redirect('/Panel.html');
});

app.use((req, res) => res.status(404).json({ error: 'مسیر پیدا نشد.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور.' });
});

const PORT = +(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Hesabat API on http://localhost:${PORT}`));
