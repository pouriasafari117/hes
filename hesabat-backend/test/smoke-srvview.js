/* smoke: srvViewMember — تاریخچه وام‌ها (در جریان + تسویه‌شده) در مودال */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 const member={id:7, member_no:'M-0001', status:'active', created_at:'2026-01-10', values:{fname:'علی محمدی',phone:'09120000000'}};
 const loans=[
   {id:101, member_id:7, amount:10000000, installments_count:12, fee_percent:4, status:'active', created_at:'2026-01-15'},
   {id:102, member_id:7, amount:5000000, installments_count:6, fee_percent:0, status:'paid', created_at:'2025-05-20'},
 ];
 w.eval(`SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='تست';srvFieldsCache=null;
   const MEMBER=${JSON.stringify(member)}; const LOANS=${JSON.stringify(loans)};
   srvFetch=async function(m,p,b){ if(p.indexOf('/members/7')>=0) return {member:MEMBER};
     if(p.indexOf('/fields')>=0) return {fields:[{key:'fname',label:'نام'},{key:'phone',label:'شماره تماس'}]};
     if(p.indexOf('/loans')>=0) return {rows:LOANS}; throw new Error('unstubbed '+p); };
   srvLoadFields=async()=>[{key:'fname',label:'نام'},{key:'phone',label:'شماره تماس'}];
   srvViewMember(7);`);
 await sleep(500);
 const modal=d.querySelector('.m-modal');
 T('مودال باز شد', !!modal);
 if(modal){
   const html = modal.innerHTML;
   T('هدر تاریخچه وام‌ها', /تاریخچهٔ وام‌های این عضو/.test(html));
   T('بخش وام‌های در جریان', /وام‌های در جریان/.test(html));
   T('بخش وام‌های تسویه‌شده', /وام‌های تسویه‌شده/.test(html));
   T('وام فعال رندر شده (۱۰ میلیون)', html.includes('۱۰٬۰۰۰٬۰۰۰'));
   T('وام تسویه‌شده رندر شده (۵ میلیون)', html.includes('۵٬۰۰۰٬۰۰۰'));
   T('برچسب تسویه‌شده روی وام دوم', modal.querySelectorAll('.m-sec .b-lime').length>=1);
   T('دو دکمه جزئیات', modal.querySelectorAll('[data-vloan]').length===2);
   w.eval('srvLoanDetail = function(id){ window.__openedLoan = id; };');
   d.querySelector('.m-modal [data-vloan="102"]').click();
   await sleep(200);
   T('کلیک جزئیات → srvLoanDetail با آیدی ۱۰۲', String(w.eval('window.__openedLoan'))==='102');
 }
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
