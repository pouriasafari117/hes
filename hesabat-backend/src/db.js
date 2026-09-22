const { Pool } = require('pg');

// داکومنتاسیون Supabase: https://supabase.com/docs/guides/database/connecting-to-postgres
const connStr = process.env.DATABASE_URL || 'postgresql://localhost/hesabat';
const needsSSL = /supabase\.co|sslmode=require/.test(connStr);

/* استخر اتصالات با تنظیمات برای ثبات در محیط‌های ابری:
   - max: محدود تعداد اتصالات فعال
   - idleTimeoutMillis: بستن اتصالات بیکار
   - connectionTimeoutMillis: timeout اتصال اولیه
   - keepAlives: نگاه داشتن TCP اتصال زنده */
const pool = new Pool({
  connectionString: connStr,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlives: true,
  keepAlivesIdleTimeout: 30000,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {})
});

/* Event handlers برای تشخیص مشکلات اتصال و جلوگیری از خرابی ناگهانی */
pool.on('error', (err, client) => {
  console.error('[Pool] Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  // اختیاری: لاگ کردن اتصالات برای دیباگ
});

/* تشخیص PgBouncer (connection pooler) برای تنظیم رفتار */
async function detectPgBouncer() {
  try {
    const res = await pool.query("SHOW application_name");
    return res.rows[0]?.application_name?.includes('pgbouncer') || false;
  } catch (_) {
    return false;
  }
}

/* اجرای کوئری با retry برای خطاهای transient و timeout */
async function executeWithRetry(client, query, params, maxRetries = 2) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await client.query(query, params);
    } catch (e) {
      lastErr = e;
      // transient errors: connection reset, timeout, deadlock, serialization
      const isTransient = /ECONNRESET|timeout|DEADLOCK|40P01|40001/.test(e.code || e.message);
      if (!isTransient || i === maxRetries) throw e;
      // exponential backoff: 50ms, 150ms, 450ms
      await new Promise(r => setTimeout(r, 50 * Math.pow(3, i)));
    }
  }
  throw lastErr;
}

/* اجرای کوئری با کانتکست مستأجر: هر درخواست داخل یک تراکنش.
   درخواست‌های داخل یک تراکنش از fn_is_member برای چک عضویت استفاده می‌کنند. */
async function withTenant(user, institutionId, fn) {
  const client = await pool.connect();
  try {
    // شروع تراکنش و تنظیم context
    await executeWithRetry(client, 'BEGIN', []);
    await executeWithRetry(client, "select set_config('app.user_id', $1, true)", [String(user.id)]);
    await executeWithRetry(client, "select set_config('app.institution_id', $1, true)", [String(institutionId)]);
    
    // اجرای تابع ارائه‌شده در کانتکست تراکنش
    const out = await fn(client);
    
    // commit کردن
    await executeWithRetry(client, 'COMMIT', []);
    return out;
  } catch (e) {
    // rollback و re-throw
    try { await executeWithRetry(client, 'ROLLBACK', [], 0); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTenant, executeWithRetry, detectPgBouncer };
