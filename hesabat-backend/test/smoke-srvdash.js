/* smoke: داشبورد سرور — هدر (نام مؤسسه+تاریخ+میانبرها) + آخرین تراکنش‌ها + اقساط نزدیک به سررسید + دکمهٔ تخصیص وام در اعضا */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
const STATS = {
  members:{total:2,active:2,inactive:0,newThisMonth:1},
  loans:{total:2,active:1,overdue:0,paid:1,totalAmount:42000000},
  installments:{pending:8,overdue:1,paid:4,totalPendingAmount:20000000},
  funds:{total:1,accounts:1,totalBalance:50000000},
  payments:{total:5,totalAmount:10000000},
  txns:{total:6,deposit:30000000,withdraw:5000000},
  charts:{monthlyMembers:[{m:'2026-03',c:2}],monthlyLoans:[{m:'2026-03',c:2,s:42000000}],monthlyPayments:[{m:'2026-03',c:5,s:10000000}]},
  recent:{members:[{id:7,name:'علی محمدی',member_no:'M-0001',status:'active',created_at:'2026-03-01'}],loans:[{id:5,member_id:7,member_name:'علی محمدی',amount:30000000,status:'active',created_at:'2026-03-01'}]}
};
const TXNS = { rows:[
  {id:1,type:'deposit',amount:20000000,description:'واریز اولیه',account_name:'حساب اصلی',created_at:'2026-03-02'},
  {id:2,type:'withdraw',amount:3000000,description:'برداشت خرج',account_name:'حساب اصلی',created_at:'2026-03-04'},
]};
const DUE = { rows:[
  {id:50,loan_id:5,member_id:7,member_name:'علی محمدی',due_date:'2026-10-05',amount:5000000,status:'pending',no:4,loan_amount:30000000,eff_status:'dueSoon'},
]};
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 w.eval(`
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='صندوق امید';
   srvFetch=async function(m,p,b){
     if(p.indexOf('/stats')>=0) return ${JSON.stringify(STATS)};
     if(p.indexOf('/txns')>=0) return ${JSON.stringify(TXNS)};
     if(p.indexOf('/installments')>=0) return ${JSON.stringify(DUE)};
     throw new Error('unstubbed '+m+' '+p);
   };
   renderSrvDashboard();
 `);
 await sleep(700);
 const subB = ()=>[...d.querySelectorAll('.page-head .ph-sub b')].map(b=>b.textContent);
 T('نام مؤسسه بولد در هدر', subB().some(t=>t.includes('صندوق امید')));
 const today = w.eval('J.fmtLong(J.todayIso())');
 T('تاریخ امروز بولد در هدر', subB().some(t=>t===today));
 T('بدون «متصل به» قبلی در هدر داشبورد', !/متصل به/.test(d.querySelector('.page-head').textContent));
 const btnM=d.querySelector('#srvDashAddMember'), btnL=d.querySelector('#srvDashAddLoan'), btnP=d.querySelector('#srvDashAddPay');
 T('دکمهٔ افزودن عضو', !!btnM);
 T('دکمهٔ ثبت وام', !!btnL);
 T('دکمهٔ ثبت پرداخت', !!btnP);
 w.eval('window.__called=null; srvMemberForm=()=>{window.__called="member"}; srvLoanForm=()=>{window.__called="loan"}; srvPaymentForm=()=>{window.__called="pay"};');
 btnM.click(); await sleep(80);
 T('میانبر عضو → srvMemberForm', w.eval('window.__called')==='member');
 btnL.click(); await sleep(80);
 T('میانبر وام → srvLoanForm', w.eval('window.__called')==='loan');
 btnP.click(); await sleep(80);
 T('میانبر پرداخت → srvPaymentForm', w.eval('window.__called')==='pay');
 T('کارت «آخرین تراکنش‌ها»', [...d.querySelectorAll('.card-h h3')].some(h=>h.textContent==='آخرین تراکنش‌ها'));
 T('بدون کارت «آخرین اعضا»', ![...d.querySelectorAll('.card-h h3')].some(h=>h.textContent==='آخرین اعضا'));
 const txHtml = d.querySelector('#srvDashTxns') ? d.querySelector('#srvDashTxns').innerHTML : '';
 T('تراکنش واریز با +', txHtml.includes('+') && txHtml.includes('واریز اولیه'));
 T('تراکنش برداشت با −', txHtml.includes('برداشت خرج') && txHtml.includes('−'));
 T('تیتر «اقساط نزدیک به سررسید»', [...d.querySelectorAll('.card-h h3')].some(h=>h.textContent==='اقساط نزدیک به سررسید'));
 await sleep(500);
 const insHtml = d.querySelector('#srvDashIns') ? d.querySelector('#srvDashIns').innerHTML : '';
 T('قسط سررسیدنزدیک رندر (عضو)', insHtml.includes('علی محمدی'));
 T('«روز مانده» در ردیف قسط', insHtml.includes('روز مانده'));
 T('نمودار وضعیت وام‌ها (chSrvIns) هست', !!d.querySelector('#chSrvIns'));
 T('لجند وضعیت وام‌ها: تسویه‌شده + در جریان + معوق', /تسویه‌شده/.test(d.querySelector('#chSrvInsLg').innerHTML) && /در جریان/.test(d.querySelector('#chSrvInsLg').innerHTML) && /معوق/.test(d.querySelector('#chSrvInsLg').innerHTML));

 // صفحهٔ اعضا: دکمهٔ تخصیص وام
 w.eval(`
   SRV_FIELDS=null; srvFetch=async function(m,p,b){
     if(p.indexOf('/fields')>=0) return {fields:[{key:'fname',label:'نام'},{key:'nid',label:'کدملی'}]};
     if(p.indexOf('/members')>=0) return {rows:[{id:7, member_no:'M-0001', status:'active', values:{fname:'علی محمدی',nid:'001' } }], total:1, page:1, pageSize:30};
     return {rows:[],total:0};
   };
   window.__loanFor=null;
   srvLoanForm=function(id){ window.__loanFor=id; };
   renderSrvMembersPage();
 `);
 await sleep(800);
 const loanBtn = d.querySelector('[data-loan="7"]');
 T('دکمهٔ تخصیص وام در ردیف عضو', !!loanBtn);
 T('تول‌تیپ «ثبت وام برای این عضو»', loanBtn && loanBtn.getAttribute('data-tip')==='ثبت وام برای این عضو');
 if(loanBtn){ loanBtn.click(); await sleep(100); }
 T('کلیک → srvLoanForm با آیدی عضو', String(w.eval('window.__loanFor'))==='7');
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
