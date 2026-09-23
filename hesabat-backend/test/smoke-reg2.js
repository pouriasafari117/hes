const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
async function until(fn,tries=40){ for(let i=0;i<tries;i++){ try{ const v=fn(); if(v) return v; }catch(e){} await sleep(120); } return null; }
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 await until(()=>d.querySelector('#lgUser'));
 d.querySelector('#lgUser').value='admin'; d.querySelector('#lgPass').value='admin';
 d.querySelector('#loginForm button[type=submit],#loginForm .btn-solid').click();
 await until(()=>d.body.innerHTML.includes('داشبورد'));
 T('ورود داشبورد', true);
 // فرم عضو/وام سالم؟
 w.eval('memberForm()'); await sleep(150);
 T('فرم عضو بدون سکشن/تیتر (فیلدها در یک گرید)', !!d.querySelector('#mfSave') && !!d.querySelector('#mfGrid') && !d.querySelector('.m-modal .m-sec-h') && d.querySelectorAll('#mfGrid .field').length>=5);
 [...d.querySelectorAll('.m-modal [data-x]')].pop()?.click(); await sleep(80);
 w.eval('loanForm()'); await sleep(150);
 T('فرم وام + نوع اقساط (سکشن‌بندی وام دست نخورده)', !!d.querySelector('#lfSave') && d.querySelectorAll('#lfKindChips .chip').length===2 && !!d.querySelector('.m-drawer .m-sec'));
 T('تعداد اقساط ورودی آزاد (عدد بدون سلکت)', !!d.querySelector('#lfMonths') && d.querySelector('#lfMonths').tagName==='INPUT' && d.querySelector('#lfMonths').type==='number');
 [...d.querySelectorAll('.drawer-wrap [data-x],.drawer-wrap [data-close]')].pop()?.click(); await sleep(80);
 // تنظیمات + منبع داده (منتقل شده به تب داده‌ها و ممیزی)
 w.location.hash='#/app/settings';
 await until(()=>d.querySelector('[data-st]'),30);
 const dataTab=[...d.querySelectorAll('[data-st]')].find(b=>b.dataset.st==='data');
 if(dataTab) dataTab.click();
 await until(()=>d.querySelector('#srvBox .ds-card'),30);
 T('کارت منبع داده در تب «داده‌ها و ممیزی»', d.querySelectorAll('#srvBox .ds-card').length===2 && /منبع داده/.test(d.querySelector('#srvBox').innerHTML));
 T('تیتر سکشن: منبع داده و اتصال سرور', d.querySelector('#secSrv .card-h') && /منبع داده و اتصال سرور/.test(d.querySelector('#secSrv .card-h').textContent));
 // جدول اقساط وام سید + paymentForm از جزئیات وام
 const loan=JSON.parse(w.eval("JSON.stringify(DB.loans.find(l=>l.status==='active'))"));
 w.location.hash='#/app/loans/'+loan.id;
 const payBtn=await until(()=>d.querySelector('#ldPay'),30);
 T('دکمه پرداخت در جزئیات وام', !!payBtn);
 if(payBtn){
   payBtn.click(); await sleep(200);
   T('فرم پرداخت بدون سلکت قسط باز شد', !!d.querySelector('#pfSave') && !d.querySelector('#pfIns'));
   [...d.querySelectorAll('.m-modal [data-x]')].pop()?.click();
 }
 // دکمه پرداخت روی قسط خاص (preset) — باید پیش‌پرش باشد
 const open=JSON.parse(w.eval("JSON.stringify(DB.installments.filter(i=>i.loanId==='"+loan.id+"' && i.paidAmount<i.amount))"));
 if(open.length>1){
   w.eval("paymentForm('"+loan.id+"','"+open[1].id+"')"); await sleep(200);
   T('پیش‌پرش با مانده قسط دوم', w.eval("moneyVal(document.querySelector('#pfAmt'))")===(open[1].amount-open[1].paidAmount));
   [...d.querySelectorAll('.m-modal [data-x]')].pop()?.click();
 }
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
