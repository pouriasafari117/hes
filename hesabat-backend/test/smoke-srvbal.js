/* smoke: موجودی صندوق — فیلد آنبردینگ با فرمت عدد + تنظیمات (توضیح اجباری + دفتر تغییرات) + چاپ KPI دوردیفی */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
const INST = { id:1, name:'صندوق رفاه', address:'تهران', currency:'تومان', fee_percent:7.5, installments_count:15, installment_period:'quarterly', established_at:'2011-03-21', fund_balance: 850000000 };
const AUDITS = { rows:[{ id:2, action:'fund_balance', old_value:'0', new_value:'850000000', note:'موجودی اولیه هنگام ساخت مؤسسه', created_at:'2026-09-01T10:00:00Z', user_name:'مدیر سیستم' }] };
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 d.querySelector('#lgUser').value='admin'; d.querySelector('#lgPass').value='admin';
 d.querySelector('#loginForm button[type=submit],#loginForm .btn-solid').click();
 await sleep(500);

 /* ── آنبردینگ: فیلد موجودی صندوق در مرحلهٔ ۲ ── */
 w.eval(`
   onboardRole='manager'; onboardStep=2; onboardData={};
   const bd=document.createElement('div'); bd.id='onbTest'; document.body.appendChild(bd);
   bd.innerHTML=onboardingHtml(); bindOnboarding();
 `);
 await sleep(300);
 const obBal = d.querySelector('#obFundBalance');
 T('فیلد موجودی صندوق در آنبردینگ', !!obBal);
 T('راهنمای تغییرپذیری+لاگ در هلپ', obBal && obBal.parentElement.innerHTML.includes('لاگ'));
 /* فرمت عدد: تایپ 850000000 → جداکننده هزارگان */
 if(obBal){
   obBal.value='850000000';
   obBal.dispatchEvent(new w.Event('input',{bubbles:true}));
   await sleep(120);
 }
 T('فرمت عدد با جداکننده هزارگان', obBal && /,/.test(obBal.value));
 w.eval('window.__saved=null; onboardStep=2; saveOnboardStep();');
 const savedBal = w.eval('(onboardData.fundBalance!=null)?onboardData.fundBalance:null');
 T('مقدار عددی ذخیره شد (۸۵۰م)', savedBal===850000000);

 /* ── تنظیمات: سکشن مالی سرور ── */
 w.eval(`
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='صندوق رفاه';
   window.__patched=null;
   srvFetch=async function(m,p,b){
     if(m==='GET' && p==='/api/institutions/1') return {institution:${JSON.stringify(INST)}};
     if(m==='GET' && p.indexOf('/audit')>=0) return ${JSON.stringify(AUDITS)};
     if(m==='PATCH' && p==='/api/institutions/1'){ window.__patched={...b}; return {ok:true, institution:{...${JSON.stringify(INST)}, ...b}}; }
     return {};
   };
   const box2=document.createElement('div'); document.body.appendChild(box2);
   renderSrvFinSec(box2, true, '');
 `);
 await sleep(600);
 const bal = d.querySelector('#setSrvBal');
 T('فیلد موجودی صندوق در تنظیمات', !!bal);
 T('مقدار اولیه با فرمت (۸۵۰,۰۰۰,۰۰۰)', bal && bal.value==='850,000,000');
 T('فیلد تاریخ تأسیس', !!d.querySelector('#setSrvEst'));
 const estVal = w.eval('document.querySelector("#setSrvEst") ? document.querySelector("#setSrvEst").value : ""');
 T('تاریخ تأسیس شمسی پر شده', typeof estVal==='string' && estVal.includes('۱۳۹۰'));
 await sleep(400);
 const logBox = d.querySelector('#srvBalLogWrap');
 T('دفتر تغییرات رندر شد', logBox && logBox.innerHTML.includes('موجودی اولیه'));
 T('لاگ قدیم→جدید نمایش داده شد', logBox && logBox.innerHTML.includes('۸۵۰٬۰۰۰٬۰۰۰') && logBox.innerHTML.includes('مدیر سیستم'));

 /* تغییر بدون توضیح → اجبار توضیح، بدون PATCH */
 const noteWrap = d.querySelector('#setSrvBalNoteWrap');
 if(bal){ bal.value='1,200,000,000'; bal.dataset.raw='1200000000'; bal.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(150); }
 T('باکس توضیح باز شد', noteWrap && noteWrap.style.display!=='none');
 d.querySelector('#setSrvFinSave').click(); await sleep(400);
 T('بدون توضیح → PATCH ارسال نشد', w.eval('window.__patched')===null);
 T('باکس توضیح هنوز باز است', noteWrap.style.display!=='none');

 /* با توضیح → PATCH با fund_balance و note */
 d.querySelector('#setSrvBalNote').value='افزایش سرمایه';
 d.querySelector('#setSrvFinSave').click(); await sleep(500);
 const patched = w.eval('window.__patched && JSON.stringify(window.__patched)');
 T('PATCH با موجودی ۱.۲م ارسال شد', patched && JSON.parse(patched).fund_balance===1200000000);
 T('PATCH با توضیح ارسال شد', patched && JSON.parse(patched).fund_balance_note==='افزایش سرمایه');
 T('PATCH تاریخ تأسیس ISO هم دارد', patched && /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(patched).established_at||''));

 /* ── چاپ گزارش: KPI در دو ردیف ── */
 const html = w.eval(`(function(){ srvRepMonthly={
     page:0,totalMonths:1,winStart:0,winEnd:1,maxPage:0,hasPager:false,
     wm:[{jy:1405,jm:7}],depWin:[1],wdWin:[1],balWin:[1],memWin:[1],loanWin:[1],paidWin:[1],dueWin:[1],odWin:[1],
     kpis:{members:30,loans:16,loansAmt:2810000000,paySum:1170000000,paysCnt:99,depSum:2130000000,wdSum:2830000000,curBal:285800000,odNow:15}};
   return srvRepAnalyticsPrintHtml(); })()`);
 const trCount = (html.match(/pr-kpis[\s\S]*?<\/table>/)||[''])[0].split('<tr>').length-1;
 T('KPI چاپ در دو ردیف بازهٔ کامل', trCount===2);
 T('هر سه KPI آخر در چاپ هست', html.includes('مجموع واریزی‌ها') && html.includes('مجموع برداشت‌ها') && html.includes('موجودی فعلی صندوق‌ها'));

 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
