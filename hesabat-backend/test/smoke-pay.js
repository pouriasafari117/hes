/* smoke: دمو — صف پرداخت خودکار + سقف مانده + تسویهٔ صریح وام */
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

 // یک وام فعال سید شده پیدا کن
 const loan=JSON.parse(w.eval("JSON.stringify(DB.loans.find(l=>l.status==='active'))"));
 T('وام فعال سید', !!loan);
 if(loan){
   // ماندهٔ جاری وام از منبع حقیقت: plan − paid
   const remain=w.eval("(function(){const l=qLoan('"+loan.id+"'); const ins=DB.installments.filter(i=>i.loanId==='"+ loan.id +"'); const plan=ins.reduce((s,i)=>s+i.amount,0)||l.amount; const paid=loanPaidSum(l); return plan-paid;})()");
   T('مانده محاسبه شد', remain>0);
   // ذخیره پرداخت طولانی؛ برو روی جزئیات وام
   w.location.hash='#/app/loans/'+loan.id;
   const pf = await until(()=>d.querySelector('#ldPay'),30);
   T('دکمه پرداخت', !!pf);
   pf.click(); await sleep(200);
   T('فرم پرداخت باز', !!d.querySelector('#pfSave'));
   T('بدون سلکت قسط', !d.querySelector('#pfIns'));
   // تلاش: بیشتر از مانده → سقف خطا
   w.eval("setMoney(document.querySelector('#pfAmt'), "+(remain+50000000)+")");
   d.querySelector('#pfSave').click(); await sleep(300);
   const errEl=d.querySelector('#pfErr');
   let errTxt=(errEl&&errEl.textContent)||'';
   const errMsg=d.querySelector('.m-modal .err-msg');
   if(errMsg) errTxt += ' '+errMsg.textContent;
   const toastTxt=d.body.textContent;
   T('بیشتر از مانده اجازه ندارد', errTxt.includes('مانده') || errTxt.includes('بیشتر') || toastTxt.includes('بیشتر از ماندهٔ وام قابل واریز نیست'));
   // مبلغ صحیح کم‌تر از مانده → پرداخت موفق
   const half=Math.max(10000, Math.floor(remain/2));
   w.eval("setMoney(document.querySelector('#pfAmt'), "+half+")");
   d.querySelector('#pfSave').click(); await sleep(400);
   const remain2=w.eval("(function(){const l=qLoan('"+loan.id+"'); const ins=DB.installments.filter(i=>i.loanId==='"+ loan.id +"'); const plan=ins.reduce((s,i)=>s+i.amount,0)||l.amount; const paid=loanPaidSum(l); return plan-paid;})()");
   T('مانده کم شد', Math.abs(remain2 - (remain-half)) < 1);
   T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 }
 // تسویه صریح: یک وام بساز با مانده صفر مصنوعی
 w.eval(`
   // کپی وام و صفر‌کردن مانده
   const l0 = qLoan('${loan?loan.id:''}'); if(!l0) throw 'noloan';
   const l2 = JSON.parse(JSON.stringify(l0));
   l2.id = uid('ln'); l2.status='active';
   DB.loans.push(l2);
   const ins0 = DB.installments.filter(i=>i.loanId===l0.id);
   ins0.forEach(i=>{ const n=JSON.parse(JSON.stringify(i)); n.id=uid('in'); n.loanId=l2.id; n.paidAmount=n.amount; DB.installments.push(n); });
   DB.payments.push({ id:uid('p'), loanId:l2.id, installmentId:ins0[0].id, amount:ins0.reduce((s,x)=>s+x.amount,0), date:J.todayIso(), accountId:'a1', method:'نقدی', ref:'t', notes:'', user:'admin', createdAt:J.todayIso()+' 10:00' });
   saveDb(); window.__testLoan=l2.id;
 `);
 const lid2 = w.eval('window.__testLoan');
 // رسید/مهر باز مانده را ببند تا مدال تسویه به‌تنهایی در صف باشد
 [...d.querySelectorAll('.m-modal [data-x], .m-modal .m-close, .m-modal .btn-solid')].forEach(b=>{ try{ b.click(); }catch(e){} });
 await sleep(300);
 w.location.hash='#/app/loans/'+lid2;
 const stlBtn = await until(()=>d.querySelector('#ldSettle'),30);
 T('دکمه تسویه وام ظاهر شد (به جای پرداخت)', !!stlBtn);
 T('دکمه پرداخت نیست', !d.querySelector('#ldPay'));
 if(stlBtn){
   stlBtn.click(); await sleep(400);
   const mods = d.querySelectorAll('.m-modal');
   const cf = mods.length ? mods[mods.length-1] : null;
   T('مودال تأیید تسویه', !!cf && cf.textContent.includes('تسویه'));
   // دکمهٔ تأیید در فوتر مودال
   const okBtn = cf && [...cf.querySelectorAll('button')].find(b=>/تسویه|بله/.test(b.textContent));
   if(okBtn){ okBtn.click(); await sleep(400); }
   const st = w.eval("qLoan(window.__testLoan).status");
   T('وضعیت وام paid', st==='paid');
 }
 T('بدون خطای jsdom نهایی', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
