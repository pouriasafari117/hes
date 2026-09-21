/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۲: لایه داده (ذخیره‌سازی محلی + داده دمو)
   ═══════════════════════════════════════════════════════════════ */
const DB_KEY = 'hesabat-db-v1', SES_KEY = 'hesabat-session-v1';
let DB = null, SESSION = null;

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

const NAMES = ['محمدرضا احمدی','فاطمه حسینی','علی رضایی','زهرا کریمی','حسین موسوی','مریم عباسی','مهدی جعفری','نرگس قاسمی','رضا نوری','سارا محمدی','امیر صادقی','الهام رحیمی','مجید توکلی','شیما ابراهیمی','کاظم حیدری','پریسا سلطانی','بهرام ملکی','نجمه صالحی','سعید افشار','لیلا کاظمی','فرشاد یوسفی','مینا رستمی','حامد شریفی','عاطفه نجفی','ابراهیم دولتی','شکوفه ایزدی','ناصر فلاحی','ریحانه مرادی','وحید کمالی','پگاه شهریاری'];
const EXTRA_NAMES = ['آرش قنبری','بهناز مقدم','پیمان شریفی','ترانه حبیبی','جمشید امیری','حلیمه نوروزی','داوود خسروی','رویا پناهی','سیاوش مظفری','شهلا رستگار','صفر علیزاده','ضیاء حقیقی','طلا نعمتی','ظفر اکبری','عزت رمضانی','غلام شفیعی','فرنگیس بهرامی','قاسم دلاوری','کتایون فرزانه','گلنار صدری'];
const FATHERS = ['محمد','حسین','علی','رضا','مهدی','اکبر','ناصر','ابراهیم','جواد','کاظم','غلامرضا','اسدالله','منصور','یدالله','عباس','حسن','اسماعیل','رحیم'];

function makeNID(rnd){
  let base = ''; for(let i=0;i<9;i++) base += (rnd()*10|0);
  let sum = 0; for(let i=0;i<9;i++) sum += (+base[i])*(10-i);
  const r = sum % 11, c = r < 2 ? r : 11 - r;
  return base + c;
}
function makeMobile(rnd){
  const ops = ['10','11','12','13','14','15','16','17','18','19','20','21','22','23','30','33','35','36','37','38','39','90','91','92','93','94','95','98','99'];
  let s = '09' + ops[rnd()*ops.length|0];
  for(let i=0;i<7;i++) s += (rnd()*10|0);
  return s;
}

function seedDb(){
  const rnd = mulberry32(20260913);
  const pick = a => a[rnd()*a.length|0];
  const todayIso = J.todayIso();
  const db = { v:1, counters:{member:1030, loan:100}, members:[], funds:[], accounts:[], loans:[], installments:[], payments:[], txns:[], users:[], audit:[], importTemplates:[],
    settings:{
      institution:{ name:'مؤسسه قرض‌الحسنه مهرگان', phone:'۰۲۱-۸۸۷۷۶۶۵۵', address:'تهران، خیابان ولیعصر، کوچه مهر، پلاک ۱۲۳', logo:null },
      currency:'تومان',
      memberNoTemplate:'MH-{seq:4}',
      stampColors:{ member:'#B3261E', payment:'#1C6E31' },
      /* پیش‌فرض‌های وام — در تنظیمات قابل تغییر است و فرم وام با اینها پر می‌شود */
      loanDefaults:{ rate:4, months:12, interval:1 },
      /* الگوی فیلدهای عضو — پیش‌فرض همین پنج فیلد است؛ مدیر می‌تواند فیلد کم/زیاد کند */
      memberFields:[
        {key:'name',      label:'نام و نام خانوادگی', type:'text',   on:1, core:1, req:1},
        {key:'father',    label:'نام پدر',            type:'text',   on:1, core:1},
        {key:'mobile',    label:'شماره تماس',         type:'mobile', on:1, core:1, req:1},
        {key:'nationalId',label:'کد ملی',             type:'nid',    on:1, core:1, req:1},
        {key:'birthDate', label:'تاریخ تولد',         type:'jdate',  on:1, core:1, req:1}
      ],
      notifications:{ dueReminder:true, payConfirm:true, weeklyReport:false },
      roles:{
        admin:    {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:1,settingsEdit:1},
        operator: {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
        accountant:{memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
        viewer:   {memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:0,txnAdd:0,reportExport:1,userManage:0,settingsEdit:0}
      }
    }
  };

  /* صندوق‌ها و حساب‌ها */
  db.funds = [
    {id:'f1', name:'صندوق اصلی مهرگان', code:'F-1001', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'صندوق مرکزی مؤسسه'},
    {id:'f2', name:'صندوق ولایت', code:'F-1002', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'شعبه غرب'},
    {id:'f3', name:'صندوق امید', code:'F-1003', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'ویژه وام‌های خُرد'},
    {id:'f4', name:'صندوق آینده‌سازان', code:'F-1004', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'inactive', notes:'در حال بازنگری'}
  ];
  db.accounts = [
    {id:'a1', fundId:'f1', name:'جاری اصلی', number:'100-110-220', type:'جاری', initialBalance:420000000, status:'active', notes:''},
    {id:'a2', fundId:'f1', name:'پس‌انداز مهرگان', number:'100-110-330', type:'پس‌انداز', initialBalance:300000000, status:'active', notes:''},
    {id:'a3', fundId:'f2', name:'قرض‌الحسنه ولایت', number:'200-210-110', type:'قرض‌الحسنه', initialBalance:180000000, status:'active', notes:''},
    {id:'a4', fundId:'f3', name:'جاری امید', number:'300-310-110', type:'جاری', initialBalance:90000000, status:'active', notes:''},
    {id:'a5', fundId:'f4', name:'پس‌انداز آینده‌سازان', number:'400-410-110', type:'پس‌انداز', initialBalance:60000000, status:'inactive', notes:''}
  ];
  db.accounts.forEach(a => a.balance = a.initialBalance);

  /* اعضا */
  const usedNid = new Set();
  for(let i=0;i<NAMES.length;i++){
    let nid; do { nid = makeNID(rnd); } while(usedNid.has(nid)); usedNid.add(nid);
    const by = 1348 + (rnd()*42|0), bm = 1 + (rnd()*12|0), bd = 1 + (rnd()*28|0);
    const jy = J.today(); const joined = J.j2iso(jy.jy - (rnd()<.5?1:2), 1+(rnd()*12|0), 1+(rnd()*28|0));
    db.members.push({
      id:'m'+(i+1), name:NAMES[i], father:pick(FATHERS),
      mobile:makeMobile(rnd), nationalId:nid,
      birthDate: by+'/'+String(bm).padStart(2,'0')+'/'+String(bd).padStart(2,'0'),
      memberNo:'MH-'+String(1000+i+1),
      status: i >= 26 ? 'inactive' : 'active',
      joinedAt: joined,
      createdAt: joined
    });
  }

  /* تراکنش‌های متفرقه ۶ ماه اخیر */
  const TX_NOTES_IN = ['سپرده‌گذاری عضو','واریز سود سپرده','بازگشت وجه','واریز کارمزد'];
  const TX_NOTES_OUT = ['برداشت هزینه جاری','پرداخت اجاره شعبه','خرید ملزومات','برداشت عضو'];
  const users3 = ['بهرام نادری','نازنین شاکری','کیوان معتمدی'];
  for(let i=0;i<42;i++){
    const acc = db.accounts[rnd()*4|0];
    const dep = rnd() < .6;
    const daysAgo = rnd()*175|0;
    const iso = J.addDaysIso(todayIso, -daysAgo);
    const amt = dep ? (5+(rnd()*60|0))*1000000 : (3+(rnd()*30|0))*1000000;
    db.txns.push({
      id:uid('tx'), accountId:acc.id, type:dep?'deposit':'withdraw', amount:amt,
      at: iso + ' ' + String(8+(rnd()*9|0)).padStart(2,'0') + ':' + String(rnd()*60|0).padStart(2,'0'),
      ref:'TRX-'+(2000+i), tracking: String(100000 + (rnd()*899999|0)),
      notes: dep ? pick(TX_NOTES_IN) : pick(TX_NOTES_OUT), user: pick(users3)
    });
    acc.balance += dep ? amt : -amt;
  }

  /* وام‌ها + اقساط + پرداخت‌ها */
  const loanPlan = [
    {mi:0, amt:150000000, months:12, rate:4, state:'normal', start:-8, fund:'f1', acc:'a1'},
    {mi:1, amt:80000000,  months:6,  rate:4, state:'normal', start:-4, fund:'f3', acc:'a4'},
    {mi:2, amt:300000000, months:24, rate:5, state:'normal', start:-13, fund:'f1', acc:'a1'},
    {mi:4, amt:50000000,  months:6,  rate:4, state:'normal', start:-3, fund:'f3', acc:'a4'},
    {mi:5, amt:200000000, months:18, rate:4, state:'overdue', start:-9, fund:'f2', acc:'a3'},
    {mi:6, amt:120000000, months:12, rate:4, state:'overdue', start:-7, fund:'f2', acc:'a3'},
    {mi:8, amt:450000000, months:36, rate:6, state:'normal', start:-16, fund:'f1', acc:'a2'},
    {mi:9, amt:60000000,  months:6,  rate:4, state:'normal', start:-2, fund:'f3', acc:'a4'},
    {mi:10,amt:250000000, months:24, rate:5, state:'overdue', start:-11, fund:'f1', acc:'a1'},
    {mi:12,amt:100000000, months:12, rate:4, state:'normal', start:-6, fund:'f2', acc:'a3'},
    {mi:13,amt:180000000, months:18, rate:4, state:'normal', start:-10, fund:'f1', acc:'a2'},
    {mi:15,amt:90000000,  months:12, rate:4, state:'paid',   start:-14, fund:'f3', acc:'a4'},
    {mi:16,amt:350000000, months:24, rate:5, state:'overdue', start:-15, fund:'f1', acc:'a1'},
    {mi:19,amt:70000000,  months:6,  rate:4, state:'paid',   start:-12, fund:'f3', acc:'a4'},
    {mi:21,amt:140000000, months:12, rate:4, state:'normal', start:-5, fund:'f2', acc:'a3'},
    {mi:23,amt:220000000, months:18, rate:5, state:'pending', start:0, fund:'f1', acc:'a1'}
  ];
  const METHODS = ['نقدی','کارت به کارت','حواله','چک'];
  loanPlan.forEach((pl, idx) => {
    const member = db.members[pl.mi];
    const startIso = J.addDaysIso(todayIso, Math.round(pl.start * 30.4));
    const reqIso = J.addDaysIso(startIso, -12), appIso = J.addDaysIso(startIso, -5);
    const per = Math.ceil(pl.amt * (1 + pl.rate/100) / pl.months / 10000) * 10000;
    const loan = {
      id:'l'+(idx+1), memberId:member.id, fundId:pl.fund, accountId:pl.acc,
      amount:pl.amt, rate:pl.rate, months:pl.months, intervalMonths:1,
      installmentAmount:per,
      requestDate:reqIso, approveDate: pl.state==='pending' ? '' : appIso,
      payDate: pl.state==='pending' ? '' : startIso,
      firstDue: pl.state==='pending' ? '' : J.j2iso(...(() => { const j = J.iso2j(startIso); const a = J.addMonths(j.jy,j.jm,j.jd,1); return [a.jy,a.jm,a.jd]; })()),
      guarantors: pl.amt >= 200000000 ? 'یک ضامن کارمند' : 'بدون ضامن',
      status: pl.state==='pending' ? 'pending' : 'active',
      notes:'', createdAt: reqIso
    };
    db.counters.loan++;
    if(pl.state !== 'pending'){
      const fd = J.iso2j(loan.firstDue);
      for(let k=0;k<pl.months;k++){
        const d = J.addMonths(fd.jy, fd.jm, fd.jd, k);
        db.installments.push({
          id:'ins-'+loan.id+'-'+(k+1), loanId:loan.id, no:k+1,
          dueDate:J.j2iso(d.jy,d.jm,d.jd), amount:per, paidAmount:0, paidDate:''
        });
      }
      /* برداشت پرداخت وام */
      db.txns.push({ id:uid('tx'), accountId:pl.acc, type:'withdraw', amount:pl.amt, at:startIso+' 10:30',
        ref:'PAY-'+loan.id.toUpperCase(), tracking:String(300000+idx*7), notes:'پرداخت اصل وام به '+member.name, user:'کیوان معتمدی' });
      db.accounts.find(a=>a.id===pl.acc).balance -= pl.amt;

      const insOf = db.installments.filter(x=>x.loanId===loan.id);
      const now = new Date(todayIso+'T12:00');
      let paidCount = 0;
      insOf.forEach(ins => {
        const isPast = ins.dueDate <= todayIso;
        let payIt = false;
        if(pl.state === 'paid') payIt = true;
        else if(pl.state === 'overdue') payIt = isPast && J.diffDays(ins.dueDate, todayIso) >= 75;
        else payIt = isPast && ins.no <= (J.diffDays(loan.firstDue, todayIso)/30.4 | 0);
        if(payIt){
          const payDate = J.addDaysIso(ins.dueDate, -(rnd()*5|0));
          const method = pick(METHODS);
          db.payments.push({ id:uid('p'), loanId:loan.id, installmentId:ins.id, amount:per, date:payDate,
            accountId:pl.acc, method, ref:'FIS-'+(5000+db.payments.length), notes:'', user:'نازنین شاکری', createdAt:payDate+' 11:00' });
          ins.paidAmount = per; ins.paidDate = payDate;
          const acc = db.accounts.find(a=>a.id===pl.acc);
          db.txns.push({ id:uid('tx'), accountId:pl.acc, type:'deposit', amount:per, at:payDate+' 11:00',
            ref:'FIS-'+(5000+db.payments.length-1), tracking:String(400000+db.payments.length*3), notes:'بازپرداخت قسط '+faDigits(ins.no)+' — '+member.name, user:'نازنین شاکری' });
          acc.balance += per;
          paidCount++;
        }
      });
      if(pl.state === 'paid' || insOf.every(i => i.paidAmount >= i.amount)){ loan.status = 'paid'; }
    }
    db.loans.push(loan);
  });

  /* کاربران */
  db.users = [
    {id:'u1', name:'بهرام نادری', username:'admin', mobile:'09121234567', email:'admin@mehregan.ir', role:'admin', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:todayIso+' 08:12'},
    {id:'u2', name:'نازنین شاکری', username:'operator', mobile:'09129876543', email:'n.shakeri@mehregan.ir', role:'operator', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:J.addDaysIso(todayIso,-1)+' 16:40'},
    {id:'u3', name:'کیوان معتمدی', username:'accountant', mobile:'09354442211', email:'', role:'accountant', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:J.addDaysIso(todayIso,-2)+' 09:05'},
    {id:'u4', name:'الهه روشنی', username:'viewer', mobile:'09198887766', email:'', role:'viewer', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'inactive', lastLogin:J.addDaysIso(todayIso,-21)+' 13:22'}
  ];

  /* لاگ ممیزی اولیه */
  db.audit = [
    {at:J.addDaysIso(todayIso,-16)+' 09:14', user:'بهرام نادری', action:'ثبت وام جدید برای '+NAMES[21], target:'loan:l15'},
    {at:J.addDaysIso(todayIso,-12)+' 11:31', user:'نازنین شاکری', action:'ثبت پرداخت قسط — '+NAMES[0], target:'loan:l1'},
    {at:J.addDaysIso(todayIso,-6)+' 15:02', user:'بهرام نادری', action:'ثبت درخواست وام برای '+NAMES[23], target:'loan:l16'},
    {at:J.addDaysIso(todayIso,-2)+' 10:20', user:'کیوان معتمدی', action:'ثبت تراکنش واریز در حساب جاری اصلی', target:'account:a1'}
  ];
  return db;
}

function loadDb(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(raw){ const d = JSON.parse(raw); if(d && d.v === 1 && Array.isArray(d.members)){
      /* تور ایمنی برای داده‌های قدیمی: هیچ عضوی نباید فیلد پایهٔ گم‌شده داشته باشد */
      d.members.forEach(m=>{ ['name','father','mobile','nationalId','birthDate','memberNo'].forEach(k=>{ if(typeof m[k]!=='string') m[k]=''; });
        if(!m.name.trim()) m.name='(عضو بدون نام)'; });
      if(d.settings && Array.isArray(d.settings.memberFields)) d.settings.memberFields = d.settings.memberFields.filter(f=>f && f.key && f.label);
      return d; } }
  }catch(e){}
  const d = seedDb();
  try{ localStorage.setItem(DB_KEY, JSON.stringify(d)); }catch(e){}
  return d;
}
function saveDb(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }catch(e){} }
/* اعتبارسنجی و آماده‌سازی دادهٔ فایل پشتیبان برای جایگزینی — بدون دست‌زدن به DB تا تأیید کاربر */
function restoreDbFromObject(d){
  if(!d || d.v !== 1 || !Array.isArray(d.members)) return {ok:false, msg:'ساختار فایل با سامانه سازگار نیست (فایل باید خروجی «پشتیبان‌گیری» همین پنل باشد).'};
  ['loans','installments','payments','txns','funds','accounts','users','audit','importTemplates'].forEach(k=>{ if(!Array.isArray(d[k])) d[k]=[]; });
  if(!d.settings || typeof d.settings !== 'object') return {ok:false, msg:'فایل، تنظیمات سامانه را ندارد.'};
  if(!d.users.length) return {ok:false, msg:'فایل حداقل باید یک کاربر داشته باشد وگرنه دیگر نمی‌توان وارد شد.'};
  if(!d.counters || typeof d.counters !== 'object') d.counters = {member: d.members.length};
  d.members.forEach(m=>{ ['name','father','mobile','nationalId','birthDate','memberNo'].forEach(k=>{ if(typeof m[k]!=='string') m[k]=''; });
    if(!m.name.trim()) m.name='(عضو بدون نام)'; });
  if(Array.isArray(d.settings.memberFields)) d.settings.memberFields = d.settings.memberFields.filter(x=>x && x.key && x.label);
  return {ok:true, data:d};
}

/* ── الگوی فیلدهای عضو (داینامیک، تنظیم‌شده توسط مدیر مؤسسه) ── */
const DEFAULT_MEMBER_FIELDS = [
  {key:'name',      label:'نام و نام خانوادگی', type:'text',   on:1, core:1, req:1},
  {key:'father',    label:'نام پدر',            type:'text',   on:1, core:1},
  {key:'mobile',    label:'شماره تماس',         type:'mobile', on:1, core:1, req:1},
  {key:'nationalId',label:'کد ملی',             type:'nid',    on:1, core:1, req:1},
  {key:'birthDate', label:'تاریخ تولد',         type:'jdate',  on:1, core:1, req:1}
];
function _MF(){ const MF=(DB.settings||{}).memberFields; return (MF&&MF.length) ? MF : DEFAULT_MEMBER_FIELDS; }
function FIELDS(){ try{ return _MF().filter(f=>f.on!==0); }catch(e){ return []; } }
function fldVal(m, key){ if(!m) return ''; const v = m[key]; if(v!==undefined && v!=='') return v; return ((m.x||{})[key]!==undefined ? (m.x||{})[key] : ''); }
function fieldOn(key){ try{ const f=_MF().find(x=>x.key===key); return !!f && f.on!==0; }catch(e){ return true; } }
function fieldDef(key){ try{ return _MF().find(x=>x.key===key); }catch(e){ return null; } }
/* الزامی بودن: برای فیلدهای پایه طبق پیش‌فرض، مگر مدیر مقدارش را عوض کرده باشد */
function fieldReq(key){ const f=fieldDef(key); if(!f) return false; if(f.req!==undefined) return !!f.req; return f.core && key!=='father'; }
/* اعضای دارای فیلد الزامیِ خالی — برای اجبار تکمیل داده‌های جدید */
function incompleteMembers(){
  const req = FIELDS().filter(f=>fieldReq(f.key));
  return DB.members.filter(m => req.some(f => !String(fldVal(m, f.key)).trim()));
}
function stampColor(task){ const c=(DB.settings&&DB.settings.stampColors)||{}; return c[task] || (task==='payment' ? '#1C6E31' : '#B3261E'); }
function resetDb(){ DB = seedDb(); saveDb(); }

/* ── دسترسی‌ها ── */
const ROLE_FA = {admin:'مدیر', operator:'اپراتور', accountant:'حسابدار', viewer:'مشاهده‌گر'};
const PERM_FA = {memberAdd:'افزودن عضو', memberEdit:'ویرایش عضو', loanAdd:'ثبت وام', paymentAdd:'ثبت پرداخت', txnAdd:'ثبت تراکنش', reportExport:'خروجی گزارش', userManage:'مدیریت کاربران', settingsEdit:'ویرایش تنظیمات'};
function can(perm){
  if(!SESSION) return false;
  const m = DB.settings.roles[SESSION.role];
  return !!(m && m[perm]);
}

/* ── کوئری‌های کمکی ── */
const qMember = id => DB.members.find(m => m.id === id);
const qFund   = id => DB.funds.find(f => f.id === id);
const qAccount= id => DB.accounts.find(a => a.id === id);
const qLoan   = id => DB.loans.find(l => l.id === id);
const qUser   = id => DB.users.find(u => u.id === id);
function memberLoans(mid){ return DB.loans.filter(l => l.memberId === mid); }
function loanInstallments(lid){ return DB.installments.filter(i => i.loanId === lid).sort((a,b)=>a.no-b.no); }
function loanInstallments(lid){ return DB.installments.filter(i => i.loanId === lid).sort((a,b)=>a.no-b.no); }
function loanPayments(lid){ return DB.payments.filter(p => p.loanId === lid).sort((a,b)=> (b.date||'').localeCompare(a.date||'')); }
function insStatus(ins){
  if(ins.paidAmount >= ins.amount) return 'paid';
  const today = J.todayIso();
  if(ins.paidAmount > 0) return ins.dueDate < today ? 'overdue' : 'partial';
  if(ins.dueDate < today) return 'overdue';
  if(J.diffDays(today, ins.dueDate) <= 7) return 'dueSoon';
  return 'pending';
}
const INS_FA = {paid:'پرداخت‌شده', partial:'پرداخت ناقص', overdue:'سررسید گذشته', dueSoon:'نزدیک سررسید', pending:'در انتظار'};
function insBadge(st){
  const map = {paid:'b-green', partial:'b-amber', overdue:'b-red', dueSoon:'b-amber', pending:'b-gray'};
  return '<span class="badge '+map[st]+'"><i class="bd"></i>'+INS_FA[st]+'</span>';
}
function loanBalance(loan){
  return loanInstallments(loan.id).reduce((s,i)=> s + Math.max(0, i.amount - i.paidAmount), 0);
}
function loanPaidSum(loan){
  return loanInstallments(loan.id).reduce((s,i)=> s + i.paidAmount, 0);
}
function memberDebt(mid){
  return DB.loans.filter(l=>l.memberId===mid && l.status!=='pending')
    .reduce((s,l)=> s + loanBalance(l), 0);
}
function memberPaid(mid){
  return DB.payments.filter(p=>{ const l=qLoan(p.loanId); return l && l.memberId===mid; }).reduce((s,p)=>s+p.amount,0);
}
const LOAN_STATUS_FA = {pending:'در انتظار تصویب', active:'فعال', paid:'تسویه‌شده', cancelled:'لغوشده'};
function loanBadge(st){
  const map = {pending:'b-blue', active:'b-green', paid:'b-lime', cancelled:'b-gray'};
  return '<span class="badge '+map[st]+'"><i class="bd"></i>'+LOAN_STATUS_FA[st]+'</span>';
}
function memberStatusBadge(st){
  return st==='active' ? '<span class="badge b-green"><i class="bd"></i>فعال</span>' : '<span class="badge b-gray"><i class="bd"></i>غیرفعال</span>';
}
function memberNoNext(){
  const t = DB.settings.memberNoTemplate || 'MH-{seq:4}';
  const seq = ++DB.counters.member;
  return t.replace(/\{seq(?::(\d+))?\}/g, (m,pad)=> String(seq).padStart(pad ? +pad : 1, '0'));
}
function audit(action, target){
  DB.audit.unshift({at: J.nowIso(), user: SESSION ? SESSION.name : 'سیستم', action, target: target||''});
  if(DB.audit.length > 400) DB.audit.length = 400;
  saveDb();
}
