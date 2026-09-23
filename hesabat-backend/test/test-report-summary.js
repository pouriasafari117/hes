/* تست واحد سرور: GET /reports/summary — KPIها + سری ماهانه + پیمایش پنجره */
const express = require('/home/user/hes/hesabat-backend/node_modules/express');
const dbModPath = require.resolve('/home/user/hes/hesabat-backend/src/db.js');
const mwModPath = require.resolve('/home/user/hes/hesabat-backend/src/mw.js');
const J2 = require('/home/user/hes/hesabat-backend/src/jalali.js');

/* دادهٔ نمونه: دو سال فعالیت؛ ماه‌های میلادی عمدی برای بازگشت جلالی مشخص */
const db = {
  txnsM: [
    {ym:'2024-04', dep:100000000, wd:0          }, /* ۱۴۰۳-۰۱ */
    {ym:'2024-05', dep:0,          wd:20000000  }, /* ۱۴۰۳-۰۲ */
    {ym:'2025-09', dep:50000000,   wd:40000000  }, /* ۱۴۰۴-۰۶ */
    {ym:'2026-03', dep:10000000,   wd:30000000  }, /* ۱۴۰۳-۱۲ */
    {ym:'2026-09', dep:70000000,   wd:10000000  }, /* ۱۴۰۵-۰۶ */
  ],
  memM: [
    {ym:'2024-04', c:5}, {ym:'2024-05', c:3}, {ym:'2025-09', c:10}, {ym:'2026-09', c:2},
  ],
  loanM: [
    {ym:'2024-05', c:2, amt:40000000}, {ym:'2025-09', c:1, amt:10000000}, {ym:'2026-09', c:3, amt:60000000},
  ],
  payM: [
    {ym:'2024-05', c:1}, {ym:'2025-09', c:4}, {ym:'2026-09', c:2},
  ],
  dueM: [
    {ym:'2024-05', c:2}, {ym:'2025-09', c:5}, {ym:'2026-09', c:3}, {ym:'2026-03', c:1},
  ],
  odM: [
    {ym:'2024-05', c:1}, {ym:'2026-03', c:1},
  ],
  kpi: { mem_total:20, loans_total:6, loans_amt:110000000, pay_sum:35000000, pays_cnt:7,
         dep_sum:230000000, wd_sum:100000000, init_bal:500000000, od_now:2 },
};
const fakeClient = { async query(sql){
  const s = sql.replace(/\s+/g,' ').trim().toLowerCase();
  if(s.startsWith('select to_char(date_trunc(')){
    if(s.indexOf('from txns')>=0) return { rows: db.txnsM };
    if(s.indexOf('from members')>=0) return { rows: db.memM };
    if(s.indexOf('from loans')>=0 && s.indexOf('join')<0) return { rows: db.loanM };
    if(s.indexOf('from payments')>=0) return { rows: db.payM };
    if(s.indexOf('from installments')>=0){
      if(s.indexOf("status<>'paid'")>=0 || s.indexOf("status <> 'paid'")>=0) return { rows: db.odM };
      return { rows: db.dueM };
    }
    return { rows: [] };
  }
  if(s.startsWith('select (select count(*)::int from members')) return { rows:[db.kpi] };
  return { rows: [] };
}};
require.cache[dbModPath] = { id:dbModPath, filename:dbModPath, loaded:true, exports:{ withTenant: (u,iid,fn)=>fn(fakeClient) } };
require.cache[mwModPath] = { id:mwModPath, filename:mwModPath, loaded:true, exports:{
  asyncH: fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next),
  requireAuth:(req,res,next)=>{req.user={sub:1};next();},
  requireInstitution:(req,res,next)=>{req.institutionId=1;next();},
}};
const repRoutes = require('/home/user/hes/hesabat-backend/src/routes/reports.js');
const app = express();
app.use('/api/institutions/:id/reports', repRoutes);
let bad=0,n=0;
const T=(nm,ok)=>{ n++; if(!ok){ bad++; console.log('✘', nm);} else console.log('✔', nm); };

(async()=>{
  const srv = app.listen(0, async ()=>{
    const port = srv.address().port;
    const B = 'http://127.0.0.1:'+port;
    async function get(u){ const r = await fetch(B+u); return { code:r.status, body: await r.json() }; }

    const tKey = J2.todayJKey();
    const firstKey = 1403*12+1; /* قدیمی‌ترین داده ۱۴۰۳-۰۱ */
    const total = tKey - firstKey + 1;

    const p0 = await get('/api/institutions/1/reports/summary');
    T('summary 200', p0.code===200);
    const M = p0.body;
    T('دوازده ماه در پنجرهٔ جدید', M.wm.length===12);
    T('انتهای پنجره = ماه جاری جلالی', M.wm[11] && (M.wm[11].jy*12+M.wm[11].jm)===tKey);
    T('winEnd=totalMonths در صفحهٔ صفر', M.winEnd===M.totalMonths && M.winStart===M.totalMonths-12);
    T('totalMonths صحیح', M.totalMonths===total);
    T('hasPager وقتی بیش‌از ۱۲ماه', M.hasPager===(total>12) && M.maxPage===Math.max(0,Math.ceil(total/12)-1));

    /* KPI */
    const K = M.kpis;
    T('KPI اعضا', K.members===20);
    T('KPI وام‌ها و ارزش', K.loans===6 && K.loansAmt===110000000);
    T('KPI دریافتی اقساط + تعداد', K.paySum===35000000 && K.paysCnt===7);
    T('KPI واریزی/برداشت', K.depSum===230000000 && K.wdSum===100000000);
    T('KPI موجودی فعلی = اولیه + واریزی − برداشت', K.curBal===500000000+230000000-100000000);
    T('KPI معوق فعال', K.odNow===2);

    /* سری‌های پنجرهٔ جدید (دوازده ماه پایانی) — ایندکس با جستجوی کلید */
    const ix = (Md,jy,jm)=> Md.wm.findIndex(m=>m.jy===jy && m.jm===jm);
    const i56 = ix(M,1405,6);
    T('۱۴۰۵-۰۶ داخل پنجرهٔ جدید است', i56>=0);
    T('واریزی/برداشت ۱۴۰۵-۰۶', M.depWin[i56]===70000000 && M.wdWin[i56]===10000000);
    T('سری اعضا تجمیعی است', M.memWin[i56]===20 && M.memWin[i56-1]===18);
    T('سری وام تجمیعی', M.loanWin[i56]===6);
    T('پرداخت ماهانه از روی payments', M.paidWin[i56]===2);
    T('سررسید ماهانه ۱۴۰۵-۰۶', M.dueWin[i56]===3);
    /* مانده تجمیعی: کل گردش تا پایان پنجره = ۵۰۰م + ۲۳۰م − ۱۰۰م (ماه جاری خالی) */
    T('ماندهٔ تجمیعی انتهای پنجره', M.balWin[11]===630000000);
    T('مانده منفی نمی‌شود', M.balWin.every(v=>v>=0));

    /* صفحه‌بندی */
    const p1 = await get('/api/institutions/1/reports/summary?page=1');
    T('صفحهٔ ۱ 200', p1.code===200);
    const M1 = p1.body;
    T('پنجرهٔ ۱ دوازده ماه قبل‌تر', M1.page===1 && (M1.wm[11].jy*12+M1.wm[11].jm)===tKey-12);
    T('شماره‌گذاری ماه‌ها در پنجرهٔ ۱', M1.winEnd===total-12 && M1.winStart===Math.max(0,total-24));
    if(total>12){
      const idx14406 = M1.wm.findIndex(m=>m.jy===1404 && m.jm===6);
      T('واریزی ۱۴۰۴-۰۶ در پنجرهٔ قدیمی‌تر', idx14406<0 || M1.depWin[idx14406]===50000000);
    }
    const pBig = await get('/api/institutions/1/reports/summary?page=99');
    T('صفحهٔ نامعتبر به maxPage گیر می‌کند', pBig.code===200 && pBig.body.page===pBig.body.maxPage);
    const pNeg = await get('/api/institutions/1/reports/summary?page=-3');
    T('صفحهٔ منفی → صفحهٔ ۰', pNeg.code===200 && pNeg.body.page===0);

    srv.close();
    console.log(bad?('FAIL '+bad):'ALL-PASS '+n);
    process.exit(bad?1:0);
  });
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
