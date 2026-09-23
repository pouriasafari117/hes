/* تست واحد سرور: GET payments معماری جدید (فیلتر+غنی‌شده) + GET installments جدید */
const express = require('/home/user/hes/hesabat-backend/node_modules/express');
const dbModPath = require.resolve('/home/user/hes/hesabat-backend/src/db.js');
const mwModPath = require.resolve('/home/user/hes/hesabat-backend/src/mw.js');

const db = {
  fields: [{id:1, key:'fname', label:'نام', sort_order:1}],
  payments: [
    {id:11, institution_id:1, loan_id:5, installment_id:50, member_id:7, amount:5000000, type:'installment', created_at:'2026-03-01T10:00:00Z'},
    {id:12, institution_id:1, loan_id:5, installment_id:51, member_id:7, amount:3000000, type:'fee', created_at:'2026-04-15T10:00:00Z'},
  ],
  loans: [{id:5, amount:30000000, member_id:7}],
  members: [{id:7, member_no:'M-0001'}],
  installments: [
    {id:50, loan_id:5, due_date:'2026-03-01', amount:5000000, status:'paid'},
    {id:51, loan_id:5, due_date:'2020-04-01', amount:5000000, status:'pending'},
    {id:52, loan_id:5, due_date:'2027-06-01', amount:5000000, status:'pending'},
  ],
};
const fakeClient = { async query(sql, args=[]){
  const s = sql.replace(/\s+/g,' ').trim().toLowerCase();
  if(s.startsWith('select count(*)::int as n from payments p where'))
    return { rows:[{ n: db.payments.length }] };
  if(s.startsWith('select p.*, l.amount as loan_amount'))
    return { rows: db.payments.map(p=>({ ...p, loan_amount: 30000000, ins_due: db.installments.find(i=>i.id===p.installment_id)?.due_date||null, member_no:'M-0001', member_name:'علی محمدی', ins_no: p.installment_id===50?1:2 })) };
  if(s.startsWith('select count(*)::int as n from installments i join loans l'))
    return { rows:[{ n: db.installments.length }] };
  if(s.startsWith('select i.id, i.loan_id'))
    return { rows: db.installments.map((i,ix)=>({ ...i, member_id:7, loan_amount:30000000, fee_percent:4, loan_status:'active', member_no:'M-0001', member_name:'علی محمدی', no: ix+1, eff_status: i.status==='paid'?'paid':(i.due_date<'2026-01-01'?'overdue':(i.due_date<='2026-11-01'?'dueSoon':'pending')) })) };
  return { rows: [] };
}};
require.cache[dbModPath] = { id:dbModPath, filename:dbModPath, loaded:true, exports:{ withTenant: (u,iid,fn)=>fn(fakeClient) } };
require.cache[mwModPath] = { id:mwModPath, filename:mwModPath, loaded:true, exports:{
  asyncH: fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next),
  requireAuth:(req,res,next)=>{req.user={sub:1};next();},
  requireInstitution:(req,res,next)=>{req.institutionId=1;next();},
}};
const payRoutes = require('/home/user/hes/hesabat-backend/src/routes/payments.js');
const insRoutes = require('/home/user/hes/hesabat-backend/src/routes/installments.js');

const app = express();
app.use('/api/institutions/:id/payments', payRoutes);
app.use('/api/institutions/:id/installments', insRoutes);
let bad=0,n=0;
const T=(nm,ok)=>{ n++; if(!ok){ bad++; console.log('✘', nm);} else console.log('✔', nm); };
(async()=>{
  const srv = app.listen(0, async ()=>{
    const port = srv.address().port;
    const B = 'http://127.0.0.1:'+port;
    async function get(u){ const r = await fetch(B+u); return { code:r.status, body: await r.json() }; }

    const pAll = await get('/api/institutions/1/payments');
    T('payments 200', pAll.code===200);
    T('payments سازگاری با کلید payments', Array.isArray(pAll.body.payments) && pAll.body.payments.length===2);
    T('payments غنی‌شده member_name', pAll.body.payments[0].member_name==='علی محمدی');
    T('payments ins_no محاسبه‌شده', pAll.body.payments.every(p=>p.ins_no>=1));
    T('payments صفحه‌بندی در خمخروجی', pAll.body.total===2 && pAll.body.page===1);

    const pFrom = await get('/api/institutions/1/payments?from=2026-04-01');
    T('payments فیلتر from عبور می‌کند', pFrom.code===200);

    const iAll = await get('/api/institutions/1/installments');
    T('installments 200', iAll.code===200);
    T('installments ۳ رکورد', Array.isArray(iAll.body.rows) && iAll.body.rows.length===3);
    T('installments member_name', iAll.body.rows[0].member_name==='علی محمدی');
    T('installments no در هر وام ۱→۲→۳', iAll.body.rows.map(r=>r.no).join(',')==='1,2,3');
    T('installments eff_status پرداخت‌شده', iAll.body.rows[0].eff_status==='paid');
    T('installments eff_status معوق', iAll.body.rows[1].eff_status==='overdue');

    const iOd = await get('/api/institutions/1/installments?status=overdue');
    T('installments فیلتر status عبور می‌کند', iOd.code===200);
    const iBad = await get('/api/institutions/1/installments?status=junk');
    T('installments status نامعتبر → 400', iBad.code===400);

    srv.close();
    console.log(bad?('FAIL '+bad):'ALL-PASS '+n);
    process.exit(bad?1:0);
  });
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
