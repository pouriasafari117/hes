const { Pool } = require('pg');

const connStr = process.env.DATABASE_URL
  || 'postgres://hesabat_app:hesabat_app_pass@localhost:5432/hesabat';

// Supabase و اکثر هاست‌های ابری نیاز به SSL دارند
const needsSSL = /supabase\.co|sslmode=require/.test(connStr);

const pool = new Pool({
  connectionString: connStr,
  max: 10,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {})
});

/* اجرای کوئری با کانتکست مستأجر: هر درخواست داخل یک تراکنش،
   مقادیر غیرقابل‌اعتماد را پشت چک عضویت (fn_is_member) می‌بندد. */
async function withTenant(user, institutionId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`select set_config('app.user_id', $1, true)`, [String(user.id)]);
    await client.query(`select set_config('app.institution_id', $1, true)`, [String(institutionId)]);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTenant };
