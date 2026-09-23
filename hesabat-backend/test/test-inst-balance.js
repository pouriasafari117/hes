/* تست واحد سرور: موجودی صندوق — PATCH با لاگِ تغییرات + GET audit + GET با fund_balance */
const express = require('/home/user/hes/hesabat-backend/node_modules/express');
const dbModPath = require.resolve('/home/user/hes/hesabat-backend/src/db.js');
const mwModPath = require.resolve('/home/user/hes/hesabat-backend/src/mw.js');

const rec = { audit: null, updates: [], balance: 500000 };
const fakeClient = { async query(sql, args=[]){
  const s = sql.replace(/\s+/g,' ').trim().toLowerCase();
  if(s.startsWith('select fund_balance from institutions')) return { rows:[{ fund_balance: rec.balance }] };
  if(s.startsWith('insert into institution_audit')){ rec.audit = { args: args.slice() }; return { rows:[{}] }; }
  if(s.startsWith('update institutions set')){ rec.updates.push(sql); return { rows: [] }; }
  if(s.startsWith('select id,name,slug,status')) return { rows:[{ id:1, name:'صندوق امید', slug:'omid', status:'active', fund_balance: rec.balance, currency:'تومان' }] };
  if(s.startsWith('select a.id, a.action')) return { rows:[{ id:3, action:'fund_balance', old_value:'500000', new_value:'2500000', note:'واریز سرمایه', created_at:'2026-09-01T10:00:00Z', user_name:'مدیر' }] };
  return { rows: [] };
}};
require.cache[dbModPath] = { id:dbModPath, filename:dbModPath, loaded:true, exports:{ pool: { query: async()=>({rows:[]}) }, withTenant: (u,iid,fn)=>fn(fakeClient) } };
require.cache[mwModPath] = { id:mwModPath, filename:mwModPath, loaded:true, exports:{
  asyncH: fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next),
  requireAuth:(req,res,next)=>{req.user={id:9, sub:9};next();},
  requireInstitution:(req,res,next)=>{req.institutionId=1;next();},
}};
const instRoutes = require('/home/user/hes/hesabat-backend/src/routes/institutions.js');
const app = express(); app.use(express.json());
app.use('/api/institutions', instRoutes);
let bad=0,n=0;
const T=(nm,ok)=>{ n++; if(!ok){ bad++; console.log('✘', nm);} else console.log('✔', nm); };
(async()=>{
  const srv = app.listen(0, async ()=>{
    const B = 'http://127.0.0.1:'+srv.address().port;
    async function call(m,u,b){ const r = await fetch(B+u,{ method:m, headers:{'content-type':'application/json'}, body: b?JSON.stringify(b):undefined }); return { code:r.status, body: await r.json() }; }

    const g = await call('GET','/api/institutions/1');
    T('GET 200 و fund_balance در خروجی', g.code===200 && g.body.institution.fund_balance===500000);

    /* تغییر موجودی — باید لاگ شود */
    rec.audit = null;
    const p1 = await call('PATCH','/api/institutions/1', { fund_balance: 2500000, fund_balance_note:'واریز سرمایه اولیه' });
    T('PATCH تغییر 200', p1.code===200);
    T('آپدیت روی institutions رفت', rec.updates.length===1);
    T('لاگ در dفتر ثبت شد', !!rec.audit);
    T('قدیم→جدید در لاگ', rec.audit && rec.audit.args[3]==='500000' && rec.audit.args[4]==='2500000');
    T('توضیحات در لاگ', rec.audit && rec.audit.args[5]==='واریز سرمایه اولیه');
    T('کاربر لاگ‌کننده', rec.audit && rec.audit.args[1]===9 && rec.audit.args[0]===1);
    T('action= fund_balance', rec.audit && rec.audit.args[2]==='fund_balance');

    /* بدون تغییر — نباید لاگ شود */
    rec.updates = []; rec.audit = null;
    const p2 = await call('PATCH','/api/institutions/1', { fund_balance: 500000 });
    T('مقدار برابر → بدون آپدیت و لاگ', p2.code===200 && rec.audit===null && rec.updates.length===0);

    /* مقدار منفی/متنی — کلمپ صفر */
    rec.updates = []; rec.audit = null;
    const p3 = await call('PATCH','/api/institutions/1', { fund_balance: -10 });
    T('منفی → صفر، آپدیت و لاگ', p3.code===200 && rec.updates.length===1 && rec.audit && rec.audit.args[4]==='0');

    /* دفتر تغییرات */
    const a = await call('GET','/api/institutions/1/audit?limit=5');
    T('GET audit 200', a.code===200);
    T('ردیف لاگ با نام کاربر و توضیح', a.body.rows.length===1 && a.body.rows[0].note==='واریز سرمایه' && a.body.rows[0].user_name==='مدیر');

    srv.close();
    console.log(bad?('FAIL '+bad):'ALL-PASS '+n);
    process.exit(bad?1:0);
  });
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
