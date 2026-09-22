/* Hesabat Backend API — Phase 1
   Panel → HTTP/JSON → Backend → SQL → PostgreSQL (RLS) */
const express = require('express');
const path = require('path');
const fs = require('fs');

/* بارگذاری ساده .env بدون وابستگی */
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

/* بارگذاری استخر دیتابیس */
const { pool, withTenant } = require('./src/db');

/* مسیرهای اعلان‌شده */
app.use('/', require('./src/routes/auth')(pool));
app.use('/', require('./src/routes/users')(pool));
app.use('/', require('./src/routes/institutions')(pool));
app.use('/', require('./src/routes/members')(pool));
app.use('/', require('./src/routes/funds')(pool));
app.use('/', require('./src/routes/accounts')(pool));
app.use('/', require('./src/routes/payments')(pool));
app.use('/', require('./src/routes/loans')(pool));
app.use('/', require('./src/routes/stats')(pool));
app.use('/', require('./src/routes/fields')(pool));

/* Health Check Endpoint */
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now });
  } catch (e) {
    console.error('[Health] Database error:', e.message);
    res.status(503).json({ status: 'error', message: e.message });
  }
});

/* 404 Handler */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* Error Handler */
app.use((err, req, res, next) => {
  console.error('[Express] Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

/* شروع سرور */
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`[Server] listening on port ${PORT}`);
});

/* Graceful Shutdown */
const gracefulShutdown = async (signal) => {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  
  server.close(async () => {
    console.log('[Server] HTTP server closed');
    
    try {
      await pool.end();
      console.log('[Server] Database pool closed');
    } catch (e) {
      console.error('[Server] Error closing pool:', e.message);
    }
    
    process.exit(0);
  });

  // اگر بعد از 10 ثانیه بسته نشد، خروج اجباری
  setTimeout(() => {
    console.error('[Server] Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
