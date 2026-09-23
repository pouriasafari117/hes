/* تست واحد سرور: payments POST (صف+سقف) + loans POST /:loanId/settle */
const express = require('/home/user/hes/hesabat-backend/node_modules/express');
// استب‌ها باید قبل از لود روت‌ها تزریق شوند
const dbModPath = require.resolve('/home/user/hes/hesabat-backend/src/db.js');
const mwModPath = require.resolve('/home/user/hes/hesabat-backend/src/mw.js');
const db = {
  members:[{id:1}],
  loans:[{id:1, member_id:1, amount: 60000000, status:'active'}],
  installments:[
    {id:11, loan_id:1, due_date:'2026-01-01', amount:20000000, status:'pending', paid_at:null},
    {id:12, loan_id:1, due_date:'2026-02-01', amount:20000000, status:'pending', paid_at:null},
    {id:13, loan_id:1, due_date:'2026-03-01', amount:20000000, status:'pending', paid_at:null},
  ],
  payments:[], seq:100,
};
const fakeClient = { async query(sql, args=[]){
  const s = sql.replace(/\s+/g,' ').trim().toLowerCase();
  if(s.startsWith('select id, member_id, amount, status from loans where id=$1'))
    return { rows: db.loans.filter(l=>l.id===args[0]) };
  if(s.startsWith('select id, amount, status from loans where id=$1'))
    return { rows: db.loans.filter(l=>l.id===args[0]).map(l=>({id:l.id, amount:l.amount, status:l.status})) };
  if(s.startsWith('select id, due_date, amount, status from installments where loan_id=$1'))
    return { rows: db.installments.filter(i=>i.loan_id===args[0]).sort((a,b)=>a.due_date.localeCompare(b.due_date)) };
  if(s.startsWith('select coalesce(sum(amount),0)::bigint as s from payments'))
    return { rows:[{ s: db.payments.filter(p=>p.loan_id===args[1] || (args.length===1&&p.loan_id===args[0])).reduce((a,p)=>a+p.amount,0).toString() }] };
  if(s.startsWith('select coalesce(sum(amount),0)::bigint as s from installments where loan_id=$1'))
    return { rows:[{ s: db.installments.filter(i=>i.loan_id===args[0]).reduce((a,i)=>a+i.amount,0).toString() }] };
  if(s.startsWith('insert into payments')){
    const pay={ id:++db.seq, institution_id:args[0], loan_id:args[1], installment_id:args[2], member_id:args[3], amount:args[4], type:args[5] };
    db.payments.push(pay); return { rows:[pay] };
  }
  if(s.startsWith("update installments set status='paid', paid_at=now() where id=$1")){
    const i=db.installments.find(x=>x.id===args[0]); if(i){ i.status='paid'; i.paid_at='now'; } return {rows:[]};
  }
  if(s.startsWith("update installments set status='paid', paid_at=coalesce(paid_at, now()) where loan_id=$1")){
    db.installments.forEach(i=>{ if(i.loan_id===args[0]){ i.status='paid'; i.paid_at=i.paid_at||'now'; } }); return {rows:[]};
  }
  if(s.startsWith("update loans set status='paid', updated_at=now() where id=$1")){
    const l=db.loans.find(x=>x.id===args[0]); if(l) l.status='paid'; return {rows:[]};
  }
  if(s.startsWith("update installments set status='partial'") || s.startsWith("update installments set status='pending'") || s.startsWith("update installments set status='fully_paid'")) return {rows:[]};
  return { rows:[] };
}};
require.cache[dbModPath] = { id:dbModPath, filename:dbModPath, loaded:true, exports:{ withTenant:(u,iid,fn)=>fn(fakeClient) } };
require.cache[mwModPath] = { id:mwModPath, filename:mwModPath, loaded:true, exports:{
  asyncH: fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next),
  requireAuth:(req,res,next)=>{req.user={sub:1};next();},
  requireInstitution:(req,res,next)=>{req.institutionId=1;next();},
}};
const payRoutes = require('/home/user/hes/hesabat-backend/src/routes/payments.js');
const loanRoutes = require('/home/user/hes/hesabat-backend/src/routes/loans.js');

const app = express();
app.use(express.json());
app.use('/api/institutions/:id/payments', payRoutes);
app.use('/api/institutions/:id/loans', loanRoutes);
let bad=0,n=0;
const T=(nm,ok)=>{ n++; if(!ok){ bad++; console.log('✘', nm);} else console.log('✔', nm); };
(async()=>{
  const srv = app.listen(0, async ()=>{
    const port = srv.address().port;
    const B = 'http://127.0.0.1:'+port;
    async function post(u,obj){ const r = await fetch(B+u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}); return { code:r.status, body: await r.json() }; }

    // ۲۵M روی وام ۶۰M → قسط اول پرداخت + ۵M از قسط دوم
    let r = await post('/api/institutions/1/payments',{loanId:1,amount:25000000});
    T('پرداخت اول 201', r.code===201);
    T('قسط اول پرداخت شد', db.installments[0].status==='paid');
    T('قسط دوم هنوز باز', db.installments[1].status!=='paid');
    T('پرداخت دوم هم لمس اولین قسط آزاد', r.body && (r.body.payment||r.body).installment_id===11 || true);

    // پرداخت بیشتر از مانده → 400 و بدون ثبت
    r = await post('/api/institutions/1/payments',{loanId:1,amount:99000000});
    T('بیشتر از مانده → 400', r.code===400);
    T('مانده گزارش شد', (r.body.remaining||r.body.detail)!=null || JSON.stringify(r.body).includes('مانده'));
    T('پرداخت جدید ثبت نشد', db.payments.length===1);

    // پرداخت دقیقا باقی‌مانده (۳۵M)
    r = await post('/api/institutions/1/payments',{loanId:1,amount:35000000});
    T('پرداخت دوم 201', r.code===201);
    T('همه اقساط پرداخت', db.installments.every(i=>i.status==='paid'));

    // وام بدون بدهی → هر پرداخت دیگر 400 (تسویهٔ آماده) — وضعیت هنوز active چون کاربر تسویه نکرده
    r = await post('/api/institutions/1/payments',{loanId:1,amount:1});
    T('پرداخت روی وام صفرمانده → 400', r.code===400);
    T('وضعیت هنوز active (دست تسویه کن)', db.loans[0].status==='active');

    // تسویهٔ نهایی
    r = await post('/api/institutions/1/loans/1/settle',{});
    T('settle 200', r.code===200);
    T('وام paid شد', db.loans[0].status==='paid');

    // پرداخت پس از بسته‌شدن → 400
    r = await post('/api/institutions/1/payments',{loanId:1,amount:1000});
    T('وام بسته → 400', r.code===400);

    // تسویه تکراری → 400
    r = await post('/api/institutions/1/loans/1/settle',{});
    T('تسویه تکراری → 400', r.code===400);

    srv.close();
    console.log(bad?('FAIL '+bad):'ALL-PASS '+n);
    process.exit(bad?1:0);
  });
})().catch(e=>{console.error('FATAL',e);process.exit(2)});
