/* اجرای اسکریپت اسکیمای دیتابیس با کاربر مالک (نه نقش اپ) */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ADMIN_URL = process.env.ADMIN_URL || process.env.DATABASE_URL
  || 'postgres://hesabat:hesabat_pass@localhost:5432/hesabat';

async function runFile(client, filename){
  const fp = path.join(__dirname, filename);
  if(!fs.existsSync(fp)){ console.log('skip missing', filename); return; }
  const sql = fs.readFileSync(fp, 'utf8');
  console.log('applying', filename, '...', sql.length, 'bytes');
  await client.query(sql);
  console.log(filename, 'applied ✔');
}

(async () => {
  const c = new Client({ connectionString: ADMIN_URL });
  await c.connect();
  console.log('connected to', ADMIN_URL.replace(/:[^:@]+@/, ':***@'));
  // اگر complete_schema وجود داشت، فقط همان را بزن (تازه‌ترین و کامل‌ترین)
  const completePath = path.join(__dirname, 'complete_schema.sql');
  if (fs.existsSync(completePath)) {
    await runFile(c, 'complete_schema.sql');
  } else {
    // وگرنه به ترتیب migrations
    await runFile(c, 'schema.sql');
    await runFile(c, 'schema_v2.sql');
    await runFile(c, 'schema.supabase.sql');
    await runFile(c, 'delete_institution.sql');
  }
  const patchDir = path.join(__dirname, 'patches');
  if (fs.existsSync(patchDir)) {
    const patches = fs.readdirSync(patchDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of patches) await runFile(c, path.join('patches', f));
  }
  console.log('all migrations applied ✔');
  await c.end();
})().catch(e => { console.error('migration failed:', e.message, e.code, e.detail); console.error(e.stack?.slice(0,2000)); process.exit(1); });
