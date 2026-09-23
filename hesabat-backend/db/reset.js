/* ═══ ریست کامل دیتابیس — پاک‌سازی همهٔ داده‌ها + برگشت شمارنده‌ها به ۱ ═══
   کاربرد:  npm run db:reset
   اسکیما/فرمت‌بندی جداول دست‌نخورده می‌ماند؛ فقط ردیف‌ها حذف و شمارنده‌ها ری‌است می‌شوند.
   بعد از اجرا باید دوباره از «ویزارد افتتاح حساب» مؤسسه و مدیر را بسازی. */
const { Client } = require('pg');

const ADMIN_URL = process.env.ADMIN_URL || process.env.DATABASE_URL
  || 'postgres://hesabat:hesabat_pass@localhost:5432/hesabat';

(async () => {
  const c = new Client({ connectionString: ADMIN_URL });
  await c.connect();
  console.log('connected to', ADMIN_URL.replace(/:[^:@]+@/, ':***@'));
  console.log('resetting all tables (TRUNCATE … RESTART IDENTITY CASCADE) ...');
  await c.query(`
    TRUNCATE TABLE
      txns,
      payments,
      installments,
      loans,
      accounts,
      funds,
      member_field_values,
      members,
      institution_join_requests,
      field_definitions,
      institution_members,
      users,
      institutions
    RESTART IDENTITY CASCADE;
  `);
  console.log('✔ دیتابیس کامل ریست شد — شمارنده‌ها از ۱ شروع می‌شوند.');
  console.log('قدم بعد: پنل را باز کن و از «افتتاح حساب» مؤسسه/مدیر جدید بساز.');
  await c.end();
})().catch(async e => {
  console.error('reset failed:', e.message, e.code || '', e.detail || '');
  process.exit(1);
});
