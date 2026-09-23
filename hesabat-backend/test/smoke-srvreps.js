/* smoke: renderSrvReportsPage — گزارش‌های سرور با داده زنده + فیلتر + CSV/print فعال */
const {JSDOM,VirtualConsole}=require('/home/user/hes/hesabat-backend/node_modules/jsdom');
const vc=new VirtualConsole(); const errs=[];
vc.on('jsdomError',e=>{ if(e.message&&!/Could not (load|parse)|Not implemented/.test(e.message)) errs.push(e.message); });
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bad=[];
const T=(n,c)=>{ if(!c) bad.push(n); console.log((c?'✔':'✘')+' '+n); };
const DATA = {
  members: { rows:[
    {id:7, member_no:'M-0001', status:'active', created_at:'2026-01-10T10:00:00Z', values:{fname:'علی محمدی', nid:'0012345678', mob:'09120001122'}},
    {id:8, member_no:'M-0002', status:'active', created_at:'2026-02-15T10:00:00Z', values:{fname:'مهدی رضایی', nid:'0011112222', mob:'09123334455'}},
  ], total:2 },
  loans: { rows:[
    {id:5, member_id:7, member_name:'علی محمدی', member_values:{}, fund_id:2, amount:30000000, installments_count:6, fee_percent:4, status:'active', created_at:'2026-01-15T10:00:00Z'},
    {id:6, member_id:8, member_name:'مهدی رضایی', member_values:{}, fund_id:2, amount:12000000, installments_count:12, fee_percent:2, status:'paid', created_at:'2025-06-01T10:00:00Z'},
  ], total:2 },
  installments: { rows:[
    {id:50, loan_id:5, member_id:7, member_name:'علی محمدی', due_date:'2026-09-01', amount:5000000, status:'pending', paid_at:null, no:4, loan_amount:30000000, eff_status:'pend'+'ing'},
    {id:51, loan_id:5, member_id:7, member_name:'علی محمدی', due_date:'2026-04-01', amount:5000000, status:'pending', paid_at:null, no:3, loan_amount:30000000, eff_status:'overdue'},
  ], total:2 },
  payments: { payments:[
    {id:11, loan_id:5, member_id:7, member_name:'علی محمدی', amount:5000000, type:'installment', loan_amount:30000000, ins_no:1, created_at:'2026-03-01T10:00:00Z'},
    {id:12, loan_id:6, member_id:8, member_name:'مهدی رضایی', amount:1000000, type:'installment', loan_amount:12000000, ins_no:12, created_at:'2026-06-01T10:00:00Z'},
  ], total:2 },
  txns: { rows:[
    {id:1, account_id:3, account_name:'حساب اصلی', fund_name:'صندوق مرکزی', member_no:'M-0001', type:'deposit', amount:20000000, description:'واریز اولیه', created_at:'2026-01-01T10:00:00Z'},
  ], total:1 },
  funds: { funds:[{id:2, name:'صندوق مرکزی', status:'active'}] },
  accounts: { accounts:[{id:3, fund_id:2, fund_name:'صندوق مرکزی', name:'حساب اصلی', number:'603799', type:'جاری', initial_balance:50000000, status:'active'}] },
};
(async()=>{
 const dom=await JSDOM.fromURL('http://127.0.0.1:8931/Panel.html#/login',{runScripts:'dangerously',resources:'usable',virtualConsole:vc,pretendToBeVisual:true});
 const w=dom.window,d=w.document; await sleep(900);
 w.eval(`
   SRV.on=true;SRV.token='t';SRV.instId=1;SRV.instName='صندوق تست';
   srvFieldsCache=null;
   const DATA=${JSON.stringify(DATA)};
   srvLoadFields=async()=>[{key:'fname',label:'نام'},{key:'nid',label:'کد ملی'},{key:'mob',label:'موبایل'}];
   srvFetch=async function(m,p,b){
     if(p.indexOf('/members')>=0) return DATA.members;
     if(p.indexOf('/installments')>=0) return DATA.installments;
     if(p.indexOf('/loans')>=0) return DATA.loans;
     if(p.indexOf('/payments')>=0) return DATA.payments;
     if(p.indexOf('/txns')>=0) return DATA.txns;
     if(p.indexOf('/funds')>=0) return DATA.funds;
     if(p.indexOf('/accounts')>=0) return DATA.accounts;
     throw new Error('unstubbed '+m+' '+p);
   };
   SESSION = { username:'srv', name:'مدیر تست', role:'admin', roleType:'manager' };
   renderSrvReportsPage();
 `);
 await sleep(600);
 T('هیچ خطای jsdom نیست تا رندر', errs.length===0 || (console.log('ERRS',errs.slice(0,2)),false));
 const chips = d.querySelectorAll('[data-srep]');
 T('هفت چیپ گزارش', chips.length===7);
 T('چیپ‌های کلیدی', [...chips].map(c=>c.textContent.includes('گزارش اعضا')?'عضو':'').join('')!=='');
 T('بدون clarservices قبلی «خلاصه مالی»', !d.querySelector('#srvRepSummary'));
 T('بدون دکمه به‌روزرسانی srvRepRefresh', !d.querySelector('#srvRepRefresh'));
 T('فیلدهای فیلتر رندر شدند', !!d.querySelector('#srvRepFilters [data-fk]'));
 T('جدول گزارش اعضا', d.querySelectorAll('#srvRepBody tbody tr').length>=2);
 const firstCell = d.querySelector('#srvRepBody tbody tr td');
 T('نام عضو در جدول', firstCell && firstCell.textContent.includes('علی'));
 T('شماره عضویت', d.querySelector('#srvRepBody').innerHTML.includes('M-0001'));
 T('پرینت فعال شد', d.querySelector('#srvRepPrint') && !d.querySelector('#srvRepPrint').disabled);
 T('CSV فعال شد', d.querySelector('#srvRepCsv') && !d.querySelector('#srvRepCsv').disabled);

 // تغییر گزارش به اقساط
 const insChip=[...chips].find(c=>c.dataset.srep==='installments');
 T('چیپ اقساط موجود', !!insChip);
 if(insChip){
   insChip.click(); await sleep(700);
   T('فیلتر وضعیت اقساط رندر', !!d.querySelector('#srvRepFilters select[data-fk="status"]'));
   const body = d.querySelector('#srvRepBody').innerHTML;
   T('ردیف قسط معوق', body.includes('سررسید گذشته'));
   T('ردیف عضو در گزارش قسط', body.includes('علی'));
   T('عنوان گزارش اقساط', d.querySelector('#srvRepTitle') && d.querySelector('#srvRepTitle').textContent.includes('اقساط'));
   // فیلتر وضعیت = فقط معوق
   const sel=d.querySelector('#srvRepFilters select[data-fk="status"]');
   if(sel){
     sel.value='overdue'; sel.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(300);
     T('بعد از فیلتر معوق فقط ۱ قسط', d.querySelectorAll('#srvRepBody tbody tr').length===1);
   }
 }

 // گزارش بدهکاران
 const debtChip=[...d.querySelectorAll('[data-srep]')].find(c=>c.dataset.srep==='debtors');
 if(debtChip){
   debtChip.click(); await sleep(700);
   const body = d.querySelector('#srvRepBody').innerHTML;
   T('بدهکار: علی (مانده ۲۵ میلیون)', body.includes('علی'));
   T('بدهکار: مهدی (وام تسویه‌شده) نیست', !body.includes('مهدی'));
   T('ستون اقساط معوق', d.querySelector('#srvRepBody thead') && d.querySelector('#srvRepBody thead').textContent.includes('اقساط معوق'));
 }
 T('بدون خطای jsdom', errs.length===0 || (console.log('ERRS',errs.slice(0,3)),false));
 console.log(bad.length?('FAIL '+bad.length):'ALL-PASS');
 process.exit(bad.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
