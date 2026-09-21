/* اجرای اسکریپت اسکیمای دیتابیس با کاربر مالک (نه نقش اپ) */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ADMIN_URL = process.env.ADMIN_URL
  || 'postgres://hesabat:hesabat_pass@localhost:5432/hesabat';

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const c = new Client({ connectionString: ADMIN_URL });
  await c.connect();
  console.log('connected. applying schema...');
  await c.query(sql);
  console.log('schema applied ✔');
  await c.end();
})().catch(e => { console.error('migration failed:', e.message); process.exit(1); });
