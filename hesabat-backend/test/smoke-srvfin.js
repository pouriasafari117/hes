/* smoke: renderSrvFinSec — سینک تنظیمات مالی سرور با آنبردینگ + ذخیره PATCH */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 d.querySelector('#lgUser').value='admin'; d.querySelector('#lgPass').value='admin';
 d.querySelector('#loginForm button[type=submit],#loginForm .btn-solid').click();
 await sleep(500);
 const inst={id:1, name:'صندوق رفاه', address:'تهران', currency:'تومان', fee_percent:7.5, installments_count:15, installment_period:'quarterly'};
 w.eval(`
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='${inst.name}';
   const INST=${JSON.stringify(inst)};
   window.__patched=null;
   srvFetch=async function(m,p,b){
     if(m==='GET' && p==='/api/institutions/1') return {institution:INST};
     if(m==='PATCH' && p==='/api/institutions/1'){ window.__patched={...b}; return {ok:true,institution:{...INST,...b}}; }
     throw new Error('unstubbed '+m+' '+p);
   };
   const box=document.createElement('div'); document.body.appendChild(box);
   renderSrvFinSec(box, true, '');
 `);
 await sleep(400);
 T('فیلد اقساط از مؤسسه پر', !!d.querySelector('#setSrvMonths'));
 const mInp = d.querySelector('#setSrvMonths');
 T('مقدار پیش‌فرض آنبردینگ (۱۵ قسط)', mInp && mInp.value==='15');
 T('مقدار پیش‌فرض کارمزد آنبردینگ (۷٫۵)', d.querySelector('#setSrvFee') && d.querySelector('#setSrvFee').value==='7.5');
 T('دوره اقساط انتخاب‌شده quarterly', d.querySelector('#setSrvPeriod') && d.querySelector('#setSrvPeriod').value==='quarterly');
 T('نام مؤسسه پر شده', d.querySelector('#setSrvName') && d.querySelector('#setSrvName').value==='صندوق رفاه');
 T('آدرس مؤسسه پر شده', !!(d.querySelector('#setSrvAddr') && d.querySelector('#setSrvAddr').value==='تهران'));
 T('دکمه ذخیره', !!d.querySelector('#setSrvFinSave'));
 const feeEl = d.querySelector('#setSrvFee');
 feeEl.value='9';
 d.querySelector('#setSrvFinSave').click();
 await sleep(400);
 const patched = w.eval('window.__patched && JSON.stringify(window.__patched)');
 T('PATCH با کارمزد ۹ ارسال شد', patched && JSON.parse(patched).fee_percent===9);
 T('PATCH شامل اقساط پیش‌فرض بود', patched && JSON.parse(patched).installments_count===15);
 T('PATCH شامل دوره بود', patched && JSON.parse(patched).installment_period==='quarterly');
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
