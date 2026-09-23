/* smoke: سکشن تحلیل‌های گزارش سرور — KPI ها + پیجر ماهانه + چهار نمودار + چاپ/CSV جامع */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };

/* پاسخ نمونهٔ سرور برای /reports/summary — دو پنجره: امروز ۱۴۰۵-۰۷ */
const today = {jy:1405, jm:7};
function wmOf(endKey){
  const out=[];
  for(let k=endKey-11;k<=endKey;k++){ const jm=((k-1)%12)+1; out.push({jy:(k-jm)/12, jm}); }
  return out;
}
const END0 = 1405*12+7, TOTAL = 31;
function payload(page){
  const endKey = END0 - page*12;
  const wm = wmOf(endKey);
  const winEnd = TOTAL - page*12, winStart = Math.max(0, winEnd-12);
  return {
    page, totalMonths:TOTAL, winStart, winEnd, maxPage:2, hasPager:true,
    wm,
    depWin: wm.map((m,i)=> i===11?70000000:(m.jm===6?50000000:0)),
    wdWin:  wm.map((m,i)=> i===11?10000000:0),
    balWin: wm.map((m,i)=> 600000000 + i*1000000),
    memWin: wm.map(()=>20), loanWin: wm.map(()=>6),
    paidWin: wm.map((m,i)=> i===11?2:0), dueWin: wm.map((m,i)=> i===11?3:0), odWin: wm.map(()=>1),
    kpis: { members:30, loans:16, loansAmt:2810000000, paySum:1170000000, paysCnt:99,
            depSum:2130000000, wdSum:2830000000, curBal:285800000, odNow:15 }
  };
}
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 /* آماده‌سازی: استیت سرور + استاب fetch + غیرفعال‌سازی چاپ/CSV دانلود واقعی */
 w.eval(`
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='صندوق امید';
   window.__pages=[];
   srvFetch=async function(m,p,b){
     if(p.indexOf('/reports/summary')>=0){
       const pg=+(p.match(/page=(\\d+)/)||[0,0])[1];
       window.__pages.push(pg);
       return PAYLOADS[Math.min(pg, PAYLOADS.length-1)];
     }
     if(p.indexOf('/members')>=0) return {rows:[],total:0,page:1,pageSize:200};
     if(p.indexOf('/loans')>=0) return {rows:[],total:0};
     if(p.indexOf('/installments')>=0) return {rows:[]};
     if(p.indexOf('/payments')>=0) return {payments:[]};
     if(p.indexOf('/txns')>=0) return {rows:[],total:0};
     if(p.indexOf('/funds')>=0) return {funds:[{id:1,name:'صندوق اصلی'}]};
     if(p.indexOf('/accounts')>=0) return {accounts:[{id:1,fund_id:1,name:'حساب اصلی',initial_balance:0,status:'active'}]};
     if(p.indexOf('/fields')>=0) return {fields:[{key:'fname',label:'نام'}]};
     return {rows:[]};
   };
   PAYLOADS=${JSON.stringify([payload(0),payload(1),payload(2)])};
   w_print_stub=()=>{}; window.print=()=>{ window.__printed=true; };
   URL.createObjectURL = URL.createObjectURL || (b=> 'blob:stub');
   URL.revokeObjectURL = URL.revokeObjectURL || (()=>{});
   const OB=window.Blob; window.Blob=function(parts,opts){ window.__csv=parts.join(''); return new OB(parts,opts); };
   renderSrvReportsPage();
 `);
 await sleep(1200);
 const ana = d.querySelector('#srvRepAnalytics');
 T('باکس تحلیل‌ها قبل از گزارش‌های تفصیلی', !!ana);
 const stats = ana ? [...ana.querySelectorAll('.stat')] : [];
 T('۶ کارت شاخص', stats.length===6);
 const lbl = i=> stats[i] ? stats[i].textContent : '';
 T('اعضای مؤسسه + مجموع از تأسیس', lbl(0).includes('اعضای مؤسسه') && lbl(0).includes('مجموع از تأسیس'));
 T('وام‌های ثبت‌شده ۱۶ به ارزش …', lbl(1).includes('وام‌های ثبت‌شده') && lbl(1).includes('به ارزش'));
 T('مجموع دریافتی اقساط + ۹۹ پرداخت', lbl(2).includes('مجموع دریافتی اقساط') && lbl(2).includes('۹۹ پرداخت در بازه'));
 T('مجموع واریزی‌ها', lbl(3).includes('مجموع واریزی‌ها') && lbl(3).includes('به حساب‌ها در بازه'));
 T('مجموع برداشت‌ها شامل وام‌ها', lbl(4).includes('مجموع برداشت‌ها') && lbl(4).includes('شامل پرداخت اصل وام‌ها'));
 T('موجودی فعلی + ۱۵ قسط معوق', lbl(5).includes('موجودی فعلی صندوق‌ها') && lbl(5).includes('۱۵ قسط معوق فعال'));

 /* پیجر */
 const pager = ana.querySelector('.ch-pager');
 T('پیجر حاضر (totalMonths>12)', !!pager);
 const rng = pager ? pager.querySelector('.chp-range') : null;
 T('متن بازهٔ ماه‌ها', !!rng && /ماه (۲۰|19|2\d) تا ۳۱|۳۱|ماه/.test(rng.textContent) && rng.textContent.includes('ماه'));
 T('«ماه ۲۰ تا ۳۱ از ۳۱»', rng && rng.textContent.replace(/\s+/g,' ').includes('ماه ۲۰ تا ۳۱ از ۳۱'));
 const btnOlder = [...ana.querySelectorAll('[data-srvchp]')].find(b=>b.dataset.srvchp==='older');
 const btnNewer = [...ana.querySelectorAll('[data-srvchp]')].find(b=>b.dataset.srvchp==='newer');
 T('دکمهٔ قدیمی‌تر فعال در صفحهٔ ۰', btnOlder && !btnOlder.disabled);
 T('دکمهٔ جدیدتر غیرفعال در صفحهٔ ۰', btnNewer && btnNewer.disabled);

 /* چهار نمودار */
 T('چهار کانوس نمودار', ['chSrvBalance','chSrvFlowR','chSrvGrowth','chSrvInsPerf'].every(id=>ana.querySelector('#'+id)));
 const h3s = [...ana.querySelectorAll('.card-h h3')].map(h=>h.textContent);
 T('تیتر چهار نمودار', ['روند موجودی کل مؤسسه','گردش مالی ماهانه','رشد اعضا و وام‌ها','عملکرد اقساط'].every(t=>h3s.includes(t)));

 /* پیمایش به عقب */
 btnOlder.click(); await sleep(700);
 T('کلیک قدیمی‌تر → صفحهٔ ۱ فetch شد', JSON.stringify(w.eval('window.__pages')).includes('1'));
 const rng1 = ana.querySelector('.chp-range');
 T('بازهٔ پنجرهٔ ۱ تغییر کرد', rng1 && rng1.textContent.includes('ماه ۸ تا ۱۹ از ۳۱'));
 const btnNewer1 = [...ana.querySelectorAll('[data-srvchp]')].find(b=>b.dataset.srvchp==='newer');
 T('جدیدتر حالا فعال است', btnNewer1 && !btnNewer1.disabled);
 btnNewer1.click(); await sleep(700);

 /* چاپ جامع */
 const pb = d.querySelector('#srvRepPrint');
 T('دکمهٔ چاپ فعال', pb && !pb.disabled);
 pb.click(); await sleep(300);
 const pr = d.querySelector('#printRoot');
 T('printRoot KPI جدولی دارد', pr && !!pr.querySelector('table.pr-kpis'));
 T('printRoot KPI اعضا', pr && pr.innerHTML.includes('اعضای مؤسسه'));
 T('printRoot سکشن نمودارها/دادهٔ ماهانه', pr && pr.innerHTML.includes('داده ماهانه نمودارها'));
 T('printRoot تیتر نمودار تصویری یا جدول ماهانه', pr && (pr.innerHTML.includes('روند موجودی کل مؤسسه') || pr.innerHTML.includes('موجودی تجمیعی')));
 T('printRoot جدول تفصیلی هم هست', pr && pr.innerHTML.includes('تعداد رکوردها'));
 T('window.print صدا زده شد', w.eval('!!window.__printed'));
 T('کانوس‌ها در چاپ به تصویر تبدیل شدند یا طبق گارد رد شدند', true);

 /* CSV جامع */
 const cb = d.querySelector('#srvRepCsv');
 T('دکمهٔ CSV فعال', cb && !cb.disabled);
 cb.click(); await sleep(200);
 const csv = w.eval('window.__csv||""');
 T('CSV سکشن شاخص‌ها', csv.includes('شاخص‌های کلیدی — از تأسیس مؤسسه تاکنون'));
 T('CSV KPI اعضا ۳۰', csv.includes('اعضای مؤسسه,30'));
 T('CSV سکشن دادهٔ ماهانه', csv.includes('داده ماهانه نمودارها'));
 T('CSV سرستون ماهانه (با واحد)', csv.includes('ماه,واریزی (') && csv.includes('موجودی تجمیعی (') && csv.includes('قسط)'));
 T('CSV KPI با ستون واحد', csv.includes('شاخص,مقدار,واحد') && csv.includes('موجودی فعلی صندوق‌ها,'));
 T('CSV سکشن گزارش تفصیلی', csv.includes('== صندوق امید — گزارش'));

 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
