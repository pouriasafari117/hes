/* smoke-reg2: فقط‌سرور — چرخهٔ کامل در jsdom با stub API:
   ورود/بوت → داشبورد سرور → تنظیمات سرور (مالی/فیلدها/کاربران/ممیزی) → بدون هیچ دادهٔ محلی. */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[]; let n=0;
const T=(name,c)=>{ n++; if(!c) bad.push(name); console.log((c?'✔':'✘')+' '+name); };
const STATS = {
  members:{total:3,active:3,inactive:0,newThisMonth:1},
  loans:{total:3,active:2,overdue:1,paid:1,totalAmount:90000000},
  installments:{pending:10,overdue:2,paid:6,totalPendingAmount:30000000},
  funds:{total:2,accounts:2,totalBalance:120000000},
  payments:{total:6,totalAmount:15000000},
  txns:{total:8,deposit:60000000,withdraw:10000000},
  charts:{monthlyMembers:[],monthlyLoans:[],monthlyPayments:[]},
  recent:{members:[],loans:[]}
};
const INST = {id:1,name:'صندوق امید',address:'تهران',currency:'تومان',fee_percent:4,installments_count:12,installment_period:'monthly',fund_balance:120000000,established_at:'2020-04-01'};
const FIELDS = {fields:[{key:'name',label:'نام و نام خانوادگی',type:'text',on:1,core:1,req:1},{key:'nationalId',label:'کد ملی',type:'nid',on:1,core:1,req:1}]};
const USERS = {users:[{id:1,name:'مدیر TEST',phone:'09121234567',email:'a@b.c',role:'owner',role_type:'manager'}]};
const AUDIT = {rows:[{action:'fund_balance_change',old_value:100,new_value:120,note:'واریز',user_name:'مدیر',created_at:'2026-09-01T10:00:00'}]};
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 T('صفحهٔ ورود بدون حساب‌های نمایشی', !!d.querySelector('#lgUser') && !/حساب‌های نمایشی/.test(d.body.textContent) && !/admin\/? *1234/.test(d.body.textContent));
 T('بدون جعبهٔ جستجوی سریع دمو در شل', !d.querySelector('#qsearch') && !d.querySelector('#qInput'));

 // نشست سرور + stub API (به‌جای localStorage — فقط‌سرور)
 w.eval(`
   SESSION={username:'09121234567',name:'مدیر TEST',role:'admin',roleType:'manager'};
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='${INST.name}';
   SRV.user={id:1,name:'مدیر TEST',phone:'09121234567',roleType:'manager'};
   srvFetch=async function(m,p,b){
     if(p.indexOf('/stats')>=0) return ${JSON.stringify(STATS)};
     if(p.indexOf('/txns')>=0) return {rows:[]};
     if(p.indexOf('/installments')>=0) return {rows:[]};
     if(p.indexOf('/members')>=0) return {rows:[]};
     if(p.indexOf('/loans')>=0) return {rows:[]};
     if(p.indexOf('/funds')>=0) return {funds:[{id:1,name:'صندوق اصلی'}]};
     if(p.indexOf('/accounts')>=0) return {accounts:[]};
     if(p.indexOf('/payments')>=0) return {payments:[]};
     if(p.indexOf('/fields')>=0) return ${JSON.stringify(FIELDS)};
     if(p.indexOf('/users')>=0) return ${JSON.stringify(USERS)};
     if(p.indexOf('/audit')>=0) return ${JSON.stringify(AUDIT)};
     if(m==='GET' && p==='/api/institutions/1') return {institution:${JSON.stringify(INST)}};
     throw new Error('unstubbed '+m+' '+p);
   };
   srvSyncInstSettings();
 `);
 await sleep(300);
 T('سینک تنظیمات از سرور (نام + واحد پول)', w.eval('DB.settings.institution.name')==='صندوق امید' && w.eval('CUR()')==='تومان');
 T('موجودی صندوق مؤسسه سینک شد', w.eval('DB.settings.institution.fundBalance')===120000000);

 // داشبورد سرور
 w.eval('location.hash = "#/app/dashboard"');
 await sleep(800);
 T('داشبورد سرور رندر شد', !!d.querySelector('#srvStats'));
 T('KPI اعضا از سرور (۳)', (d.querySelector('#srvStats')||{textContent:''}).textContent.includes('۳'));
 const lg = d.querySelector('#chSrvInsLg');
 T('دونات وضعیت وام‌ها (تسویه+در جریان+معوق)', !!lg && /تسویه‌شده/.test(lg.textContent) && /در جریان/.test(lg.textContent) && /معوق/.test(lg.textContent));
 T('نام مؤسسه در سایدبار (سینک‌شده)', (d.querySelector('#orgName')||{textContent:''}).textContent.includes('صندوق امید'));
 T('اعلان معوق از آمار سرور', w.eval('SRV_ALERTS.length')===2 && w.eval('SRV_OD_COUNT')===2);

 // اعضا — سرور
 w.eval('location.hash = "#/app/members"');
 await sleep(600);
 T('صفحهٔ اعضا سروری', /حالت سرور|PostgreSQL/.test((d.querySelector('.page-head')||{textContent:''}).textContent) || !!d.querySelector('#srvMembersBox, #srvInsBox, .tbl'));

 // وام‌ها — سرور
 w.eval('location.hash = "#/app/loans"');
 await sleep(600);
 T('صفحهٔ وام‌ها سروری', !!d.querySelector('#srvLoansBox, .tbl'));

 // صندوق‌ها — سرور
 w.eval('location.hash = "#/app/funds"');
 await sleep(600);
 T('صفحهٔ صندوق‌ها سروری', !!d.querySelector('#srvFundsBox, .tbl'));

 // گزارش‌ها — سرور
 w.eval('location.hash = "#/app/reports"');
 await sleep(900);
 T('صفحهٔ گزارش‌ها سروری (چون سرور، ۷ چیپ)', d.querySelectorAll('[data-srep]').length===7);

 // تراکنش‌ها — سرور + دکمهٔ CSV
 w.eval('location.hash = "#/app/txns"');
 await sleep(600);
 T('صفحهٔ تراکنش‌ها سروری + CSV', !!d.querySelector('#srvTxnsBox') && !!d.querySelector('#srvTxnCsv'));

 // تنظیمات — فقط‌سرور
 w.eval('location.hash = "#/app/settings"');
 await sleep(900);
 T('تب‌های جدید تنظیمات (مؤسسه/کاربران/ممیزی)', [...d.querySelectorAll('[data-st]')].map(b=>b.textContent).join('|').includes('کاربران'));
 T('سکشن مالی سرور (بدون بلوک فقط‌دمو)', !!d.querySelector('#setSrvCur') && !!d.querySelector('#setSrvBal') && !d.querySelector('#setNoTpl') && !d.querySelector('#setLdRate'));
 T('موجودی صندوق از سرور (۱۲۰م)', w.eval('setMoney(null,0), moneyVal(document.getElementById("setSrvBal"))')===120000000);
 T('دفتر تغییرات موجودی از سرور', /دفتر تغییرات موجودی/.test(d.body.textContent) && /واریز/.test((d.querySelector('#srvBalLogWrap')||{textContent:''}).textContent));
 // تب کاربران
 w.eval('setTab="us"; renderSettings()');
 await sleep(500);
 T('کاربران از سرور (۱ کاربر + نقش مالک)', !!d.querySelector('select.u-rt') || /مالک/.test(d.body.textContent));
 // تب ممیزی
 w.eval('setTab="data"; renderSettings()');
 await sleep(500);
 T('ممیزی از دفتر سرور', /pg_dump/.test(d.body.textContent) && /واریز/.test((d.querySelector('#secData')||{textContent:''}).textContent));

 // بدون هیچ دادهٔ محلی
 T('هیچ DB محلی در localStorage نیست', w.eval('localStorage.getItem("hesabat-db-v1")')===null);
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,4)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS '+n);
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
