/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۷: گزارش‌ها، کاربران، تنظیمات، افزودن گروهی
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════ گزارش‌ها (7.9) ═══════════ */
const repState = { rep:'members', f:{} };
let rrTab = 'reports';
PAGES.reports = function(arg){ renderReportsPage(arg === 'txns' ? 'txns' : arg === 'charts' ? 'charts' : rrTab); };

function reportDefs(){
  return [
    { id:'members', title:'گزارش اعضا', ic:'users',
      filters:[{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['active','فعال'],['inactive','غیرفعال']]},{k:'from',t:'date',l:'عضویت از'},{k:'to',t:'date',l:'تا'}],
      cols:['نام','کد ملی','موبایل','شماره عضویت','وضعیت','تاریخ عضویت'],
      rows(f){ return DB.members
        .filter(m=>f.status==='all'||m.status===f.status)
        .filter(m=>!f.from||(m.joinedAt||'')>=f.from).filter(m=>!f.to||(m.joinedAt||'')<=f.to)
        .map(m=>[m.name,m.nationalId,m.mobile,m.memberNo,m.status==='active'?'فعال':'غیرفعال',J.fmt(m.joinedAt)]); } },
    { id:'loans', title:'گزارش وام‌ها', ic:'loan',
      filters:[{k:'fund',t:'select',l:'صندوق',o:[['all','همه']].concat(DB.funds.map(f=>[f.id,f.name]))},{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['pending','در انتظار'],['active','فعال'],['paid','تسویه‌شده'],['cancelled','لغوشده']]}],
      cols:['عضو','صندوق','مبلغ وام','اقساط','پرداخت‌شده','مانده','وضعیت','تاریخ پرداخت'],
      rows(f){ return DB.loans
        .filter(l=>f.fund==='all'||l.fundId===f.fund).filter(l=>f.status==='all'||l.status===f.status)
        .map(l=>{ const m=qMember(l.memberId); return [m?m.name:'—',(qFund(l.fundId)||{}).name||'—',String(l.amount),String(l.months),String(loanPaidSum(l)),String(loanBalance(l)),LOAN_STATUS_FA[l.status],l.payDate?J.fmt(l.payDate):'—']; }); } },
    { id:'installments', title:'گزارش اقساط', ic:'calendar',
      filters:[{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['overdue','سررسید گذشته'],['dueSoon','نزدیک سررسید'],['pending','در انتظار'],['paid','پرداخت‌شده']]},{k:'from',t:'date',l:'سررسید از'},{k:'to',t:'date',l:'تا'}],
      cols:['عضو','وام','قسط','سررسید','مبلغ','پرداخت‌شده','مانده','وضعیت'],
      rows(f){ return DB.installments
        .filter(i=>{ const l=qLoan(i.loanId); return l && l.status!=='pending' && l.status!=='cancelled'; })
        .filter(i=>f.status==='all'||insStatus(i)===f.status)
        .filter(i=>!f.from||i.dueDate>=f.from).filter(i=>!f.to||i.dueDate<=f.to)
        .map(i=>{ const l=qLoan(i.loanId), m=qMember(l.memberId);
          return [m?m.name:'—',String(l.amount),String(i.no),J.fmt(i.dueDate),String(i.amount),String(i.paidAmount),String(i.amount-i.paidAmount),INS_FA[insStatus(i)]]; }); } },
    { id:'payments', title:'گزارش پرداخت‌ها', ic:'coins',
      filters:[{k:'from',t:'date',l:'از تاریخ'},{k:'to',t:'date',l:'تا'},{k:'method',t:'select',l:'روش',o:[['all','همه'],['نقدی','نقدی'],['کارت به کارت','کارت به کارت'],['حواله','حواله'],['چک','چک'],['برداشت از سپرده','برداشت از سپرده']]}],
      cols:['تاریخ','عضو','قسط','مبلغ','حساب','روش','مرجع'],
      rows(f){ return DB.payments
        .filter(p=>!f.from||p.date>=f.from).filter(p=>!f.to||p.date<=f.to).filter(p=>f.method==='all'||p.method===f.method)
        .map(p=>{ const l=qLoan(p.loanId), m=l?qMember(l.memberId):null, ins=DB.installments.find(i=>i.id===p.installmentId);
          return [J.fmt(p.date),m?m.name:'—',ins?'قسط '+ins.no:'—',String(p.amount),(qAccount(p.accountId)||{}).name||'—',p.method,p.ref]; }); } },
    { id:'txns', title:'گزارش تراکنش‌ها', ic:'swap',
      filters:[{k:'acc',t:'select',l:'حساب',o:[['all','همه']].concat(DB.accounts.map(a=>[a.id,a.name]))},{k:'type',t:'select',l:'نوع',o:[['all','همه'],['deposit','واریز'],['withdraw','برداشت']]},{k:'from',t:'date',l:'از'},{k:'to',t:'date',l:'تا'}],
      cols:['تاریخ','حساب','نوع','مبلغ','مرجع','کاربر'],
      rows(f){ return DB.txns
        .filter(x=>f.acc==='all'||x.accountId===f.acc).filter(x=>f.type==='all'||x.type===f.type)
        .filter(x=>!f.from||x.at.slice(0,10)>=f.from).filter(x=>!f.to||x.at.slice(0,10)<=f.to)
        .map(x=>[J.fmt(x.at)+faTime(x.at),(qAccount(x.accountId)||{}).name||'—',x.type==='deposit'?'واریز':'برداشت',String(x.amount),x.ref||'—',x.user]); } },
    { id:'balances', title:'مانده صندوق‌ها و حساب‌ها', ic:'bank', filters:[],
      cols:['صندوق','حساب','شماره','نوع','موجودی اولیه','موجودی فعلی','وضعیت'],
      rows(){ return DB.accounts.map(a=>[(qFund(a.fundId)||{}).name||'—',a.name,a.number,a.type,String(a.initialBalance),String(a.balance),a.status==='active'?'فعال':'غیرفعال']); } },
    { id:'debtors', title:'گزارش بدهکاران', ic:'warn',
      filters:[{k:'min',t:'money',l:'حداقل بدهی ('+CUR()+')'}],
      cols:['عضو','موبایل','تعداد وام','اقساط معوق','بدهی جاری'],
      rows(f){ return DB.members.map(m=>({m, debt:memberDebt(m.id),
          odIns: DB.installments.filter(i=>{ const l=qLoan(i.loanId); return l&&l.memberId===m.id&&insStatus(i)==='overdue'; }).length,
          loans: memberLoans(m.id).filter(l=>l.status!=='cancelled').length }))
        .filter(r=>r.debt>0 && (!f.min || r.debt>=f.min))
        .sort((a,b)=>b.debt-a.debt)
        .map(r=>[r.m.name,r.m.mobile,String(r.loans),String(r.odIns),String(r.debt)]); } }
  ];
}
/* صفحه ترکیبی «گزارش‌ها و تراکنش‌ها» با سه تب */
function renderReportsPage(tab){
  rrTab = (tab === 'txns') ? 'txns' : 'reports'; /* نمودارها و تحلیل‌ها با گزارش‌ها ادغام شده است */
  const main = $('#main');
  const subs = {
    txns:'گردش مالی حساب‌ها با فیلتر و جستجو',
    reports:'نمودارها و تحلیل عملکرد + گزارش‌های تفصیلی با فیلتر، چاپ و خروجی'
  };
  main.innerHTML =
    '<div class="page-head"><div><h1>گزارش‌ها و تراکنش‌ها</h1><div class="ph-sub">'+subs[rrTab]+'</div></div><div class="ph-actions" id="rrActions"></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      '<button class="tab'+(rrTab==='txns'?' on':'')+'" data-rt="txns">تراکنش‌ها</button>' +
      '<button class="tab'+(rrTab==='reports'?' on':'')+'" data-rt="reports">گزارش‌ها و تحلیل‌ها</button>' +
    '</div></div><div id="rrBody" style="padding:16px 18px"></div></div>';
  main.querySelectorAll('[data-rt]').forEach(b => b.onclick = ()=> renderReportsPage(b.dataset.rt));
  const act = $('#rrActions');
  if(rrTab === 'txns'){
    act.innerHTML = '<button class="btn btn-solid btn-sm" id="btnAddTxn" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' ثبت تراکنش</button>';
    $('#btnAddTxn').onclick = ()=> guard('txnAdd', ()=> txnForm());
    renderTxnsTab();
  } else {
    const cur = reportDefs().find(d=>d.id===repState.rep) || reportDefs()[0];
    act.innerHTML =
      '<button class="btn btn-ghost btn-sm" id="repPrint" style="padding:11px 17px;font-size:.88rem">'+icon('print',14)+' چاپ</button>' +
      '<button class="btn btn-soft btn-sm" id="repCsv" style="padding:11px 17px;font-size:.88rem"'+(can('reportExport')?'':' disabled')+'>'+icon('download',14)+' خروجی CSV</button>';
    $('#repCsv').onclick = ()=> guard('reportExport', ()=> exportCsv(cur));
    $('#repPrint').onclick = ()=> printReport(cur);
    renderReportsTab();
  }
}
function renderReportsTab(){
  const defs = reportDefs();
  const cur = defs.find(d=>d.id===repState.rep) || defs[0];
  const box = $('#rrBody');
  box.innerHTML =
    '<div id="chZone"></div>' +
    '<div class="card tight" style="margin-top:16px"><div class="card-h"><h3>'+icon('chart',16)+' گزارش‌های تفصیلی</h3><span class="hint-t">انتخاب گزارش، اعمال فیلتر، چاپ و خروجی CSV</span></div><div class="card-b">' +
      '<div class="chips" style="margin-bottom:14px">' + defs.map(d =>
        '<button class="chip'+(d.id===cur.id?' on':'')+'" data-rep="'+d.id+'">'+icon(d.ic,15)+' '+d.title+'</button>').join('') + '</div>' +
      '<div class="toolbar" id="repFilters"></div>' +
      '<div class="card tight"><div class="card-h"><h3 id="repTitle"></h3></div><div class="card-b" id="repBody"></div></div>' +
    '</div></div>';
  box.querySelectorAll('[data-rep]').forEach(b => b.onclick = ()=>{ repState.rep = b.dataset.rep; repState.f = {}; renderReportsPage('reports'); });
  renderChartsTab($('#chZone'));
  renderReportBody(cur);
}
function renderReportBody(def){
  const box = $('#repFilters');
  const f = repState.f;
  box.innerHTML = def.filters.map(fl => {
    if(fl.t==='select') return '<span class="t-lbl">'+fl.l+':</span><select class="t-select" data-fk="'+fl.k+'">'+fl.o.map(o=>'<option value="'+o[0]+'"'+((f[fl.k]||fl.o[0][0])===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
    if(fl.t==='date') return '<span class="t-lbl">'+fl.l+':</span><span class="t-jd"><input data-fk="'+fl.k+'"></span>';
    if(fl.t==='money') return '<span class="t-lbl">'+fl.l+':</span><input class="t-money" data-fk="'+fl.k+'" placeholder="0">';
    return '';
  }).join('') + (def.filters.length ? '' : '<span class="t-lbl">این گزارش فیلتری ندارد.</span>');
  box.querySelectorAll('[data-fk]').forEach(el => {
    if(el.tagName === 'SELECT') el.addEventListener('change', ()=>{ f[el.dataset.fk] = el.value; renderReportBody(def); });
    else if(el.classList.contains('t-money')){ attachMoney(el); el.addEventListener('input', ()=>{ f[el.dataset.fk] = moneyVal(el); renderReportBody(def); }); }
    else { attachJDate(el); el.addEventListener('change', ()=>{ f[el.dataset.fk] = jdVal(el); renderReportBody(def); }); }
  });
  /* بازیابی مقدار فیلترهای قبلی */
  def.filters.forEach(fl => {
    const inp = box.querySelector('[data-fk="'+fl.k+'"]');
    if(!inp) return;
    if(fl.t==='date' && f[fl.k]) setJd(inp, f[fl.k]);
    if(fl.t==='money' && f[fl.k]) setMoney(inp, f[fl.k]);
  });
  def.filters.forEach(fl => { if(f[fl.k]===undefined) f[fl.k] = (fl.o && fl.o[0]) ? fl.o[0][0] : ''; });
  const rows = def.rows(f);
  $('#repTitle').innerHTML = def.title + ' <span class="hint-t">('+faDigits(rows.length)+' رکورد)</span>';
  const moneyCols = def.cols.map(c=>/مبلغ|مانده|بدهی|موجودی|پرداخت/.test(c));
  const body = $('#repBody');
  if(!rows.length){ body.innerHTML = emptyState({icon:'chart', title:'نتیجه‌ای پیدا نشد', desc:'فیلترها را تغییر دهید.'}); return; }
  const shown = rows.slice(0,150);
  body.innerHTML = '<div class="tbl-wrap"><table class="tbl" id="repTbl"><thead><tr>'+def.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>' +
    shown.map(r => '<tr>'+r.map((cell,ci)=>{
      const isMoney = moneyCols[ci] && /^\d+$/.test(String(cell));
      return '<td class="'+(isMoney?'c-fa-num':'')+'">'+esc(isMoney?fmtN(+cell):cell)+(isMoney?' <small style="color:var(--ink-2)">'+CUR()+'</small>':'')+'</td>';
    }).join('')+'</tr>').join('') + '</tbody></table></div>' +
    (rows.length>150 ? '<div class="tbl-foot"><span class="tf-info">'+faDigits(150)+' ردیف از '+faDigits(rows.length)+' نمایش داده شد؛ برای همه موارد خروجی CSV بگیرید.</span></div>' : '');
  /* ردیف خلاصه جمع برای ستون‌های عددی */
  const sums = def.cols.map((c,ci)=> moneyCols[ci] ? rows.reduce((s,r)=> s + (/^\d+$/.test(String(r[ci])) ? +r[ci] : 0), 0) : null);
  const anySum = sums.some(s=>s!=null&&s>0);
  if(anySum){
    body.querySelector('#repTbl').insertAdjacentHTML('beforeend','<tfoot><tr>'+def.cols.map((c,ci)=>'<th>'+(sums[ci]?fmtN(sums[ci])+' '+CUR():'')+'</th>').join('')+'</tr></tfoot>');
  }
}
/* ─── تب «نمودارها و تحلیل‌ها» — تحلیل دقیق از تأسیس مؤسسه ─── */
let chartsRange = 'all';
let chartsPage = 0;                 /* ۰ = جدیدترین پنجره؛ افزایش = حرکت به سمت گذشته */
const CHART_WIN = 12;               /* اندازه پنجره نمایش: ۱۲ ماه */
function jalaliMonthSeries(startIso){
  const a = J.iso2j(startIso), t = J.today();
  const out = [];
  let jy = a.jy, jm = a.jm, guard = 0;
  while((jy*12+jm) <= (t.jy*12+t.jm) && guard++ < 480){
    out.push({ key:jy*12+jm, name:J.MONTHS[jm-1], year:faDigits(jy),
      full: J.MONTHS[jm-1]+' '+faDigits(jy) });
    jm++; if(jm>12){ jm=1; jy++; }
  }
  return out;
}
function chartWindowTitle(ms){
  if(!ms.length) return '';
  const a = ms[0], b = ms[ms.length-1];
  if(a.key === b.key) return a.full;
  return a.name+' '+a.year+' تا '+b.name+' '+b.year;
}
function chartsStartDate(){
  const today = J.todayIso();
  if(chartsRange === '12'){ const a = J.addMonths(J.today().jy, J.today().jm, 1, -12); return J.j2iso(a.jy,a.jm,1); }
  if(chartsRange === '6'){ const a = J.addMonths(J.today().jy, J.today().jm, 1, -6); return J.j2iso(a.jy,a.jm,1); }
  let earliest = today;
  const consider = iso => { const s2 = String(iso||'').slice(0,10); if(s2 && s2 < earliest) earliest = s2; };
  DB.members.forEach(m => consider(m.joinedAt));
  DB.loans.forEach(l => consider(l.requestDate));
  DB.txns.forEach(x => consider(x.at));
  DB.payments.forEach(p => consider(p.date));
  DB.installments.forEach(i => consider(i.dueDate));
  return earliest;
}
/* همهٔ محاسبات سری‌های نمودار و شاخص‌ها — مشترک بین نمایش، CSV و چاپ */
function chartsData(){
  const startIso = chartsStartDate();
  const months = jalaliMonthSeries(startIso);
  const keys = months.map(m => m.key);
  const startKey = keys[0];
  const kOf = iso => { const j = J.iso2j(String(iso).slice(0,10)); return j.jy*12 + j.jm; };

  const dep = {}, wd = {};
  DB.txns.forEach(x => { const k = kOf(x.at); if(k >= startKey){ const o = x.type==='deposit' ? dep : wd; o[k] = (o[k]||0) + x.amount; } });

  let balBase = DB.accounts.reduce((s2,a)=> s2 + a.initialBalance, 0);
  DB.txns.forEach(x => { if(kOf(x.at) < startKey) balBase += x.type==='deposit' ? x.amount : -x.amount; });
  const balVals = []; let runB = balBase;
  keys.forEach(k => { runB += (dep[k]||0) - (wd[k]||0); balVals.push(Math.max(0, runB)); });

  let memBase = 0; const memAdd = {};
  DB.members.forEach(m => { const k = kOf(m.joinedAt || J.todayIso()); if(k < startKey) memBase++; else memAdd[k] = (memAdd[k]||0)+1; });
  const memVals = []; let runM = memBase;
  keys.forEach(k => { runM += memAdd[k]||0; memVals.push(runM); });
  let loanBase = 0; const loanAdd = {}, loanAmtAdd = {};
  DB.loans.forEach(l => { const k = kOf(l.requestDate || J.todayIso());
    if(k < startKey) loanBase++;
    else { loanAdd[k] = (loanAdd[k]||0)+1; loanAmtAdd[k] = (loanAmtAdd[k]||0)+l.amount; } });
  const loanVals = []; let runL = loanBase;
  keys.forEach(k => { runL += loanAdd[k]||0; loanVals.push(runL); });

  const dueCnt = {}, paidCnt = {}, odCnt = {};
  DB.installments.forEach(i => {
    const l = qLoan(i.loanId); if(!l || l.status==='pending' || l.status==='cancelled') return;
    const kd = kOf(i.dueDate);
    if(kd >= startKey) dueCnt[kd] = (dueCnt[kd]||0)+1;
    if(i.paidDate){ const kp = kOf(i.paidDate); if(kp >= startKey) paidCnt[kp] = (paidCnt[kp]||0)+1; }
    if(insStatus(i)==='overdue' && kd >= startKey) odCnt[kd] = (odCnt[kd]||0)+1;
  });

  const totalMonths = months.length;
  const maxPage = Math.max(0, Math.ceil(totalMonths / CHART_WIN) - 1);
  if(chartsPage > maxPage) chartsPage = maxPage;
  if(chartsPage < 0) chartsPage = 0;
  const winEnd = totalMonths - chartsPage*CHART_WIN;
  const winStart = Math.max(0, winEnd - CHART_WIN);
  const wm = months.slice(winStart, winEnd);
  const wkeys = wm.map(m => m.key);
  const sl = arr => arr.slice(winStart, winEnd);
  const hasPager = totalMonths > CHART_WIN;

  const newMembers = Object.values(memAdd).reduce((a,v)=>a+v,0);
  const newLoans = Object.values(loanAdd).reduce((a,v)=>a+v,0);
  const newLoanAmt = Object.values(loanAmtAdd).reduce((a,v)=>a+v,0);
  const paysIn = DB.payments.filter(p => kOf(p.date) >= startKey);
  const paySum = paysIn.reduce((a,p)=>a+p.amount,0);
  const depSum = Object.values(dep).reduce((a,v)=>a+v,0);
  const wdSum = Object.values(wd).reduce((a,v)=>a+v,0);
  const curBal = DB.accounts.filter(a=>a.status==='active').reduce((a,x)=>a+x.balance,0);
  const odNow = overdueCount();
  const rangeTitle = chartsRange==='all' ? 'از تأسیس مؤسسه ('+J.fmtLong(startIso)+' تاکنون)' : (chartsRange==='12' ? '۱۲ ماه اخیر' : '۶ ماه اخیر');

  return {
    startIso, months, wm, wkeys, hasPager, winStart, winEnd, totalMonths, rangeTitle,
    winTitle: chartWindowTitle(wm),
    depWin: wkeys.map(k=>dep[k]||0), wdWin: wkeys.map(k=>wd[k]||0),
    balWin: sl(balVals), memWin: sl(memVals), loanWin: sl(loanVals),
    paidWin: wkeys.map(k=>paidCnt[k]||0), dueWin: wkeys.map(k=>dueCnt[k]||0), odWin: wkeys.map(k=>odCnt[k]||0),
    kpis: {
      members: memBase + newMembers, loans: loanBase + newLoans,
      newMembers, newLoans, newLoanAmt,
      paySum, paysCnt: paysIn.length, depSum, wdSum, curBal, odNow
    }
  };
}
function renderChartsTab(host){
  const box = host || $('#rrBody');
  const D = chartsData();
  const K = D.kpis;
  const cntFmt = u => v => fmtN(v) + ' ' + u;
  const maxPage = Math.max(0, Math.ceil(D.totalMonths / CHART_WIN) - 1);

  const stat = (cls, ic, label, val, sub) =>
    '<div class="stat '+cls+'"><div class="stat-top"><span class="s-ic">'+icon(ic,16)+'</span>'+label+'</div>' +
    '<div class="stat-val">'+val+'</div>'+(sub?'<div class="stat-sub">'+sub+'</div>':'')+'</div>';

  box.innerHTML =
    '<div class="chips" style="margin-bottom:14px">' +
      [['all','از تأسیس مؤسسه'],['12','۱۲ ماه اخیر'],['6','۶ ماه اخیر']].map(r =>
        '<button class="chip'+(chartsRange===r[0]?' on':'')+'" data-crr="'+r[0]+'">'+r[1]+'</button>').join('') +
      '<span class="hint-t" style="margin-inline-start:auto;font-size:.79rem">بازه: <b>'+D.rangeTitle+'</b></span>' +
    '</div>' +

    '<div class="grid g-3" style="margin-bottom:14px">' +
      stat('','users','اعضای مؤسسه', fmtN(K.members), (chartsRange!=='all' && K.newMembers ? '+'+faDigits(K.newMembers)+' عضو جدید در بازه' : 'مجموع از تأسیس')) +
      stat('s-teal','loan','وام‌های ثبت‌شده', fmtN(K.loans), (chartsRange!=='all' ? '+'+faDigits(K.newLoans)+' وام جدید' : 'به ارزش '+fmtMShort(K.newLoanAmt)+' '+CUR())) +
      stat('s-lime','coins','مجموع دریافتی اقساط', fmtMShort(K.paySum)+' <small>'+CUR()+'</small>', faDigits(K.paysCnt)+' پرداخت در بازه') +
      stat('','download','مجموع واریزی‌ها', fmtMShort(K.depSum)+' <small>'+CUR()+'</small>', 'به حساب‌ها در بازه') +
      stat('s-amber','upload','مجموع برداشت‌ها', fmtMShort(K.wdSum)+' <small>'+CUR()+'</small>', 'شامل پرداخت اصل وام‌ها') +
      stat((K.odNow?'s-red':'s-lime'),'bank','موجودی فعلی صندوق‌ها', fmtMShort(K.curBal)+' <small>'+CUR()+'</small>', (K.odNow?faDigits(K.odNow)+' قسط معوق فعال':'بدون قسط معوق')) +
    '</div>' +

    (D.hasPager ?
      '<div class="ch-pager">' +
        '<button type="button" class="chp-btn" data-chp="older"'+(chartsPage>=maxPage?' disabled':'')+'>'+icon('chevE',15)+'ماه‌های قدیمی‌تر</button>' +
        '<span class="chp-range">'+icon('calendar',14)+D.winTitle+'<i>ماه '+faDigits(D.winStart+1)+' تا '+faDigits(D.winEnd)+' از '+faDigits(D.totalMonths)+'</i></span>' +
        '<button type="button" class="chp-btn" data-chp="newer"'+(chartsPage===0?' disabled':'')+'>'+icon('chevS',15)+'ماه‌های جدیدتر</button>' +
      '</div>' :
      '<div class="ch-pager chp-only"><span class="chp-range">'+icon('calendar',14)+D.winTitle+'<i>'+faDigits(D.totalMonths)+' ماه</i></span></div>') +

    '<div class="grid g-2">' +
      '<div class="card"><div class="card-h"><h3>روند موجودی کل مؤسسه</h3><span class="hint-t">تجمیعی: موجودی اولیه + واریزی‌ها − برداشت‌ها</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chBalance"></canvas></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>گردش مالی ماهانه</h3><span class="hint-t">واریزی و برداشت به تفکیک ماه</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chFlowR"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>واریزی</span><span class="lg-i"><i style="background:#D98A1B"></i>برداشت</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>رشد اعضا و وام‌ها</h3><span class="hint-t">تعداد تجمیعی از تأسیس</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chGrowth"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>اعضا</span><span class="lg-i"><i style="background:#D98A1B"></i>وام‌ها</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>عملکرد اقساط</h3><span class="hint-t">سررسید و پرداخت ماهانه (تعداد قسط)</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chInsPerf"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>پرداخت‌شده</span><span class="lg-i"><i style="background:#E4B54A"></i>سررسیدشده</span><span class="lg-i"><i style="background:#B3362B"></i>معوق (وضعیت فعلی)</span></div></div></div>' +
    '</div>';

  box.querySelectorAll('[data-crr]').forEach(b => b.onclick = ()=>{ chartsRange = b.dataset.crr; chartsPage = 0; renderReportsPage('reports'); });
  box.querySelectorAll('[data-chp]').forEach(b => b.onclick = ()=>{
    chartsPage += (b.dataset.chp==='older' ? 1 : -1);
    renderReportsPage('reports');
  });

  const nameL = D.wm.map(m => m.name), yearL = D.wm.map(m => m.year), fullL = D.wm.map(m => m.full);
  const cOpts = { subLabels: yearL, fullLabels: fullL };
  drawLines($('#chBalance'), nameL,
    [{name:'موجودی کل', color:'#1C6E31', values:D.balWin, fmt:v=>fmtM(v)}], Object.assign({area:true}, cOpts));
  drawBars($('#chFlowR'), nameL,
    [{name:'واریزی', color:'#1C6E31', values:D.depWin},
     {name:'برداشت', color:'#D98A1B', values:D.wdWin}], cOpts);
  drawLines($('#chGrowth'), nameL,
    [{name:'اعضا', color:'#1C6E31', values:D.memWin, fmt:cntFmt('نفر')},
     {name:'وام‌ها', color:'#D98A1B', values:D.loanWin, fmt:cntFmt('وام')}], cOpts);
  drawBars($('#chInsPerf'), nameL,
    [{name:'پرداخت‌شده', color:'#1C6E31', values:D.paidWin, fmt:cntFmt('قسط')},
     {name:'سررسیدشده', color:'#E4B54A', values:D.dueWin, fmt:cntFmt('قسط')},
     {name:'معوق', color:'#B3362B', values:D.odWin, fmt:cntFmt('قسط')}], cOpts);
}

function reportFilteredRows(def){ return def.rows(repState.f); }
function filterSummary(def){
  return def.filters.map(fl => { const v = repState.f[fl.k]; if(v==null||v===''||v==='all') return '';
    const val = fl.t==='date' ? J.fmt(v) : fl.t==='money' ? fmtM(v) : ((fl.o||[]).find(o=>o[0]===v)||['',v])[1];
    return fl.l+': '+val; }).filter(Boolean).join(' · ');
}
function analyticsCsvLines(){
  const D = chartsData(), K = D.kpis;
  const L = [];
  L.push('== شاخص‌های کلیدی — '+D.rangeTitle+' ==');
  L.push('شاخص,مقدار');
  L.push('اعضای مؤسسه,'+K.members);
  L.push('وام‌های ثبت‌شده,'+K.loans);
  L.push('وام‌های جدید بازه,'+K.newLoans);
  L.push('ارزش وام‌های جدید بازه,'+K.newLoanAmt);
  L.push('مجموع دریافتی اقساط,'+K.paySum);
  L.push('تعداد پرداخت‌های بازه,'+K.paysCnt);
  L.push('مجموع واریزی‌ها,'+K.depSum);
  L.push('مجموع برداشت‌ها,'+K.wdSum);
  L.push('موجودی فعلی صندوق‌ها,'+K.curBal);
  L.push('اقساط معوق فعال,'+K.odNow);
  L.push('');
  L.push('== داده ماهانه نمودارها — '+D.winTitle+' ==');
  L.push('ماه,واریزی,برداشت,موجودی تجمیعی,اعضای تجمیعی,وام‌های تجمیعی,اقساط پرداخت‌شده,اقساط سررسیدشده,اقساط معوق');
  D.wm.forEach((m,i)=>{
    L.push([m.full, D.depWin[i], D.wdWin[i], D.balWin[i], D.memWin[i], D.loanWin[i], D.paidWin[i], D.dueWin[i], D.odWin[i]].join(','));
  });
  L.push('');
  return L;
}
function exportCsv(def){
  const rows = reportFilteredRows(def);
  const head = def.cols.join(',');
  const body = rows.map(r => r.map(c => { const s2 = String(c==null?'':c).replace(/"/g,'""'); return /["\,\n]/.test(s2) ? '"'+s2+'"' : s2; }).join(',')).join('\r\n');
  const fs = filterSummary(def);
  const lines = analyticsCsvLines();
  lines.push('== '+def.title+(fs ? ' — فیلترها: '+fs : '')+' ==');
  lines.push(head);
  lines.push(body);
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hesabat-' + def.id + '-' + J.todayIso() + '.csv';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  audit('خروجی CSV گزارش «'+def.title+'» همراه با تحلیل‌ها ('+faDigits(rows.length)+' رکورد)', 'report');
  toast('فایل CSV شامل تحلیل‌ها و '+faDigits(rows.length)+' رکورد دانلود شد.','ok');
}
function printReport(def){
  const rows = reportFilteredRows(def);
  const D = chartsData(), K = D.kpis;
  const kpiPairs = [
    ['اعضای مؤسسه', fmtN(K.members)], ['وام‌های ثبت‌شده', fmtN(K.loans)],
    ['مجموع دریافتی اقساط', fmtM(K.paySum)+' '+CUR()], ['مجموع واریزی‌ها', fmtM(K.depSum)+' '+CUR()],
    ['مجموع برداشت‌ها', fmtM(K.wdSum)+' '+CUR()], ['موجودی فعلی صندوق‌ها', fmtM(K.curBal)+' '+CUR()]
  ];
  const chartImgs = [];
  [['chBalance','روند موجودی کل مؤسسه'],['chFlowR','گردش مالی ماهانه'],['chGrowth','رشد اعضا و وام‌ها'],['chInsPerf','عملکرد اقساط']].forEach(c=>{
    try{ const cv = document.getElementById(c[0]); if(cv && cv.width > 0 && cv.toDataURL) chartImgs.push([c[1], cv.toDataURL('image/png')]); }catch(e){}
  });
  const root = $('#printRoot');
  root.innerHTML =
    '<div class="pr-head"><h1>'+esc(DB.settings.institution.name)+' — '+esc(def.title)+'</h1>' +
    '<p>تاریخ تهیه: '+J.fmtLong(J.todayIso())+' · تهیه‌کننده: '+esc(SESSION.name)+' ('+esc(ROLE_FA[SESSION.role])+')</p></div>' +
    '<h2 class="pr-h2">شاخص‌های کلیدی — '+esc(D.rangeTitle)+'</h2>' +
    '<table class="pr-kpis"><tbody><tr>'+kpiPairs.map(p=>'<td><b>'+esc(p[0])+':</b> '+esc(p[1])+'</td>').join('')+'</tr></tbody></table>' +
    (chartImgs.length ? '<h2 class="pr-h2">نمودارها — '+esc(D.winTitle)+'</h2><div class="pr-charts">' +
      chartImgs.map(c=>'<figure><img src="'+c[1]+'" alt="'+esc(c[0])+'"><figcaption>'+esc(c[0])+'</figcaption></figure>').join('') + '</div>' : '') +
    '<h2 class="pr-h2">داده ماهانه نمودارها</h2>' +
    '<table><thead><tr><th>ماه</th><th>واریزی</th><th>برداشت</th><th>موجودی تجمیعی</th><th>اعضای تجمیعی</th><th>وام‌های تجمیعی</th><th>پرداخت‌شده</th><th>سررسیدشده</th><th>معوق</th></tr></thead><tbody>' +
      D.wm.map((m,i)=>'<tr><td>'+esc(m.full)+'</td><td>'+fmtN(D.depWin[i])+'</td><td>'+fmtN(D.wdWin[i])+'</td><td>'+fmtN(D.balWin[i])+'</td><td>'+faDigits(D.memWin[i])+'</td><td>'+faDigits(D.loanWin[i])+'</td><td>'+faDigits(D.paidWin[i])+'</td><td>'+faDigits(D.dueWin[i])+'</td><td>'+faDigits(D.odWin[i])+'</td></tr>').join('') +
    '</tbody></table>' +
    (filterSummary(def) ? '<div class="pr-filters">فیلترها: '+esc(filterSummary(def))+'</div>' : '') +
    '<h2 class="pr-h2">'+esc(def.title)+' ('+faDigits(rows.length)+' رکورد)</h2>' +
    '<table><thead><tr>'+def.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>' +
    rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c==null?'':c)+'</td>').join('')+'</tr>').join('') + '</tbody></table>' +
    '<div class="pr-sum">تعداد رکوردها: '+faDigits(rows.length)+'</div>';
  document.body.classList.add('printing');
  const done = ()=>{ document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(()=>window.print(), 60);
  setTimeout(done, 3000);
}

/* ═══════════ کاربران و دسترسی‌ها (7.10) — داخل تنظیمات ═══════════ */
PAGES.users = function(){ setTab = 'us'; renderSettings(); };
function renderUsersTab(box){
  box.innerHTML =
    '<div class="field-row" style="justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">' +
      '<span class="hint-t" style="font-size:.82rem">نقش‌های اولیه: مدیر، اپراتور، حسابدار، مشاهده‌گر — سطح دسترسی هر نقش در تب «نقش‌ها و دسترسی‌ها» مدیریت می‌شود.</span>' +
      '<button class="btn btn-solid btn-sm" id="btnAddUser">'+icon('plus',14)+' افزودن کاربر</button>' +
    '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
    '<th>نام و نام خانوادگی</th><th>نام کاربری</th><th>موبایل</th><th>ایمیل</th><th>نقش</th><th>مؤسسه مجاز</th><th>وضعیت</th><th>آخرین ورود</th><th style="text-align:left">عملیات</th>' +
    '</tr></thead><tbody>' + DB.users.map(u => {
      const roleB = {admin:'b-green', operator:'b-blue', accountant:'b-amber', viewer:'b-gray'}[u.role]||'b-gray';
      return '<tr><td><div class="cell-main"><span class="avatar sz-34 ink">'+esc((u.name||'؟').charAt(0))+'</span><span class="cm-t"><b>'+esc(u.name||'—')+'</b>'+(SESSION.username===u.username?'<span style="color:var(--green-deep);font-size:.7rem"> (شما)</span>':'')+'</span></div></td>' +
      '<td class="c-num">'+esc(u.username)+'</td><td class="c-num">'+esc(u.mobile)+'</td><td class="c-num">'+esc(u.email||'—')+'</td>' +
      '<td><span class="badge '+roleB+'">'+esc(ROLE_FA[u.role]||u.role)+'</span></td>' +
      '<td style="font-size:.8rem">'+esc(u.institutions)+'</td>' +
      '<td>'+(u.status==='active'?'<span class="badge b-green"><i class="bd"></i>فعال</span>':'<span class="badge b-gray"><i class="bd"></i>غیرفعال</span>')+'</td>' +
      '<td class="c-fa-num">'+J.fmt(u.lastLogin)+faTime(u.lastLogin)+'</td>' +
      '<td><div class="row-acts"><button class="x-btn" data-tip="ویرایش" data-eu="'+u.id+'">'+icon('edit',15)+'</button>' +
      '<button class="x-btn danger" data-tip="'+(u.status==='active'?'غیرفعال‌سازی':'فعال‌سازی')+'" data-tu="'+u.id+'">'+icon(u.status==='active'?'ban':'check',15)+'</button></div></td></tr>'; }).join('') +
    '</tbody></table></div>';
  $('#btnAddUser').onclick = ()=> guard('userManage', ()=> userForm());
  box.querySelectorAll('[data-eu]').forEach(b => b.onclick = ()=> guard('userManage', ()=> userForm(qUser(b.dataset.eu))));
  box.querySelectorAll('[data-tu]').forEach(b => b.onclick = ()=> guard('userManage', async ()=>{
    const u = qUser(b.dataset.tu);
    if(u.username === SESSION.username){ toast('نمی‌توانید حساب خودتان را غیرفعال کنید.','warn'); return; }
    const deact = u.status==='active';
    const ok = await askConfirm({title:deact?'غیرفعال‌سازی کاربر':'فعال‌سازی کاربر', danger:deact, ok:deact?'غیرفعال‌سازی':'فعال‌سازی',
      text:'کاربر <b>'+esc(u.name)+'</b> ('+esc(ROLE_FA[u.role])+') '+(deact?'غیرفعال':'فعال')+' شود؟'});
    if(!ok) return;
    u.status = deact?'inactive':'active';
    audit((deact?'غیرفعال‌سازی':'فعال‌سازی')+' کاربر '+u.username, 'user:'+u.id);
    saveDb(); toast('وضعیت کاربر به‌روزرسانی شد.','ok'); route();
  }));
}
function userForm(user){
  const isEdit = !!user;
  const h = openModal({
    title: isEdit ? 'ویرایش کاربر — تغییر نام کاربری و رمز' : 'افزودن کاربر جدید',
    body:'<div class="fields">' +
      '<div class="field"><label>نام و نام خانوادگی <span class="req">*</span></label><input id="ufName" value="'+esc(isEdit?user.name:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نام کاربری <span class="req">*</span> <small>(شماره تماس یا یوزر لاتین)</small></label><input id="ufUser" class="num-inp" dir="ltr" style="text-align:left" value="'+esc(isEdit?(user.username||user.phone||''):'')+'"><span class="err-msg"></span><span class="help">قابل تغییر — برای ورود استفاده می‌شود. پیش‌فرض: شماره تماس</span></div>' +
      '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input id="ufMobile" class="num-inp" value="'+esc(isEdit?user.mobile:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>ایمیل <small>(اختیاری)</small></label><input id="ufMail" class="num-inp" dir="ltr" style="text-align:left" value="'+esc(isEdit?user.email:'')+'"></div>' +
      '<div class="field"><label>رمز عبور جدید <small>(خالی = بدون تغییر)</small></label><div class="field-row" style="gap:6px"><input id="ufPass" type="password" placeholder="حداقل ۴ کاراکتر" style="flex:1"><button type="button" class="btn btn-ghost btn-sm" id="ufEye">'+icon('eye',14)+'</button></div><span class="err-msg"></span><span class="help">در دمو رمز = کدملی یا 1234 است، ولی می‌توانید رمز دلخواه بگذارید. در سرور با همین رمز جدید لاگین می‌کنی.</span></div>' +
      (isEdit ? '<div class="field"><label>تکرار رمز جدید</label><input id="ufPass2" type="password" placeholder="تکرار رمز"><span class="err-msg"></span></div>' : '<div class="field"><label>رمز عبور <span class="req">*</span></label><input id="ufPass" type="password" placeholder="پیش‌فرض: کدملی"><span class="err-msg"></span><span class="help">اگر خالی بگذاری، رمز = کدملی می‌شود.</span></div>') +
      '<div class="field"><label>نقش <span class="req">*</span></label><select id="ufRole">'+Object.keys(ROLE_FA).map(r=>'<option value="'+r+'"'+(isEdit&&user.role===r?' selected':'')+'>'+ROLE_FA[r]+'</option>').join('')+'</select><span class="help" id="ufRoleHelp"></span></div>' +
      '<div class="field"><label>مؤسسه / مؤسسات مجاز</label><input id="ufInst" value="'+esc(isEdit?user.institutions:DB.settings.institution.name)+'"></div>' +
      '<div id="ufSrvStatus" style="margin-top:8px"></div>' +
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="ufSave">'+icon('check',14)+' ذخیره کاربر</button>',
    onOpen(hh){
      const roleHelp = ()=>{ const r = hh.el.querySelector('#ufRole').value;
        const perms = Object.keys(DB.settings.roles[r]||{}).filter(p=>DB.settings.roles[r][p]).map(p=>PERM_FA[p]);
        hh.el.querySelector('#ufRoleHelp').textContent = 'دسترسی‌ها: ' + (perms.length?perms.join('، '):'فقط مشاهده'); };
      hh.el.querySelector('#ufRole').addEventListener('change', roleHelp); roleHelp();
      const eye = hh.el.querySelector('#ufEye');
      if(eye){ eye.onclick = ()=>{ const p = hh.el.querySelector('#ufPass'); if(p) p.type = p.type==='password'?'text':'password'; }; }
      hh.el.querySelector('[data-x]').onclick = ()=>hh.close();
      // نمایش وضعیت سرور
      const srvSt = hh.el.querySelector('#ufSrvStatus');
      if(srvSt){
        if(typeof SRV!=='undefined' && SRV.on && SRV.token){
          srvSt.innerHTML = '<div class="alert a-info"><div>حالت سرور فعال — تغییر نام کاربری/رمز هم در Postgres ذخیره می‌شود.</div></div>';
        }else{
          srvSt.innerHTML = '<div class="alert a-info"><div>حالت دمو — تغییر در localStorage ذخیره می‌شود.</div></div>';
        }
      }
      hh.el.querySelector('#ufSave').onclick = async ()=>{
        const name = fieldVal('#ufName'), uname = fieldVal('#ufUser'), mob = fieldVal('#ufMobile');
        const pass = hh.el.querySelector('#ufPass') ? hh.el.querySelector('#ufPass').value.trim() : '';
        const pass2El = hh.el.querySelector('#ufPass2');
        const pass2 = pass2El ? pass2El.value.trim() : pass;
        let okf = true;
        const need = (c,i,msg)=>{ if(c) clearErr(i); else { markErr(i,msg); okf=false; } };
        need(name.length>=3, hh.el.querySelector('#ufName'),'نام را کامل وارد کنید.');
        need(uname.length>=3, hh.el.querySelector('#ufUser'),'نام کاربری حداقل ۳ کاراکتر.');
        // اجازه هم شماره تماس هم یوزر لاتین
        if(/^09\d{9}$/.test(uname) || /^[a-zA-Z0-9_.-]{3,}$/.test(uname)) clearErr(hh.el.querySelector('#ufUser')); else { markErr(hh.el.querySelector('#ufUser'),'نام کاربری معتبر نیست.'); okf=false; }
        need(validMobile(mob) || /^[a-zA-Z0-9_.-]{3,}$/.test(mob) || mob==='', hh.el.querySelector('#ufMobile'),'شماره موبایل معتبر نیست (09...)');
        const dup = DB.users.find(x=>x.username===uname && (!isEdit||x.id!==user.id));
        need(!dup, hh.el.querySelector('#ufUser'),'این نام کاربری قبلاً ثبت شده است.');
        if(pass){
          need(pass.length>=4, hh.el.querySelector('#ufPass'),'رمز حداقل ۴ کاراکتر.');
          if(pass2El) need(pass===pass2, hh.el.querySelector('#ufPass2'),'تکرار رمز مطابقت ندارد.');
        }
        if(!okf) return;
        // حالت سرور: سعی کن API بزنی
        if(typeof SRV!=='undefined' && SRV.on && SRV.token && typeof srvFetch==='function'){
          try{
            const payload = { name, phone: uname, email: fieldVal('#ufMail') };
            if(pass) payload.password = pass;
            // اگر کاربر خودش است → /auth/me، وگرنه /users/:id
            const isSelf = (typeof SRV.user!=='undefined' && SRV.user && user && (String(SRV.user.id)===String(user.id) || SRV.user.phone===user.username));
            let res;
            if(isSelf || !user || !user.id || String(user.id).startsWith('u')){
              // برای دمو idها با u شروع می‌شود، پس me بزن
              if(isSelf) res = await srvFetch('PATCH','/api/auth/me', payload);
              else {
                // ادمین در حال ویرایش کاربر دمو — فقط لوکال
              }
            }else{
              // تلاش برای آپدیت کاربر سرور
              try{ res = await srvFetch('PATCH','/api/users/'+user.id, payload); }catch(e){
                // اگر users API نبود، me را امتحان کن
                if(isSelf) res = await srvFetch('PATCH','/api/auth/me', payload);
                else throw e;
              }
            }
            if(res && res.user) toast('کاربر در سرور به‌روزرسانی شد.','ok');
          }catch(e){
            toast('خطا در سرور: '+e.message+' — تغییر لوکال اعمال می‌شود.','warn');
          }
        }
        // همیشه لوکال را هم آپدیت کن
        if(isEdit){
          Object.assign(user, {name, username:uname, mobile:mob, email:fieldVal('#ufMail'), role:hh.el.querySelector('#ufRole').value, institutions:fieldVal('#ufInst')||DB.settings.institution.name});
          if(pass) { user.password = pass; user.nationalId = user.nationalId || ''; user._customPass = true; }
        }else{
          DB.users.push({id:uid('u'), name, username:uname, mobile:mob, email:fieldVal('#ufMail'), role:hh.el.querySelector('#ufRole').value, institutions:fieldVal('#ufInst')||DB.settings.institution.name, status:'active', lastLogin:'', password: pass||'1234', _customPass: !!pass});
        }
        audit((isEdit?'ویرایش':'ایجاد')+' کاربر '+uname+(pass?' + تغییر رمز':''), 'user');
        saveDb(); toast('کاربر ذخیره شد. نام کاربری: '+uname+(pass?' — رمز جدید فعال شد':'')+'.','ok'); hh.close(); route();
      };
    }
  });
}

/* ═══════════ تنظیمات (7.11) — سه تب ادغام‌شده ═══════════
   اطلاعات مؤسسه (شامل فیلدها، صندوق‌ها، مالی، اعلان‌ها و ظاهر) ·
   کاربران، نقش‌ها و دسترسی‌ها · داده‌ها و ممیزی                */
PAGES.settings = function(){ renderSettings(); };
let setTab = 'org';
let setAnchor = ''; /* اگر تنظیم شود، پس از رندر به همان بخش اسکرول می‌شود */
function renderSettings(){
  const main = $('#main');
  /* سازگاری با نام تب‌های قدیمی: همه به تب ادغام‌شدهٔ خود می‌روند */
  const OLD = {fields:'org', fa:'org', fin:'org', notif:'org', ui:'org', roles:'us', users:'us'};
  if(OLD[setTab]) setTab = OLD[setTab];
  const tabs = [['org','اطلاعات مؤسسه'],['us','کاربران، نقش‌ها و دسترسی‌ها'],['data','داده‌ها و ممیزی']];
  main.innerHTML =
    '<div class="page-head"><div><h1>تنظیمات</h1><div class="ph-sub">پیکربندی کامل مؤسسه در سه بخش</div></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      tabs.map(t=>'<button class="tab'+(setTab===t[0]?' on':'')+'" data-st="'+t[0]+'">'+t[1]+'</button>').join('') +
    '</div></div><div class="card-b" id="setBody"></div></div>';
  main.querySelectorAll('[data-st]').forEach(b => b.onclick = ()=>{ setTab = b.dataset.st; renderSettings(); });
  const body = $('#setBody');
  const sec = (id, ic, title, sub) =>
    '<div class="card tight set-sec" id="'+id+'" style="margin-bottom:16px"><div class="card-h"><h3>'+icon(ic,16)+' '+title+'</h3><span class="hint-t">'+sub+'</span></div><div class="card-b sec-b"></div></div>';
  if(setTab === 'org'){
    body.innerHTML =
      sec('secOrg','bank','اطلاعات مؤسسه','نام، لوگو و مشخصات تماس') +
      sec('secSrv','swap','اتصال به دیتابیس','وضعیت اتصال سرور و تنظیم آدرس API') +
      sec('secFld','users','فیلدهای اعضا','الگوی فیلدها در فرم عضو، جدول و ورود گروهی') +
      sec('secFa','wallet','صندوق‌ها و حساب‌ها','مدیریت صندوق‌ها، حساب‌های بانکی و موجودی آن‌ها') +
      sec('secFin','coins','عمومی مالی و شماره‌گذاری','واحد پول، قالب شماره عضویت و پیش‌فرض‌های وام') +
      sec('secNotif','info','اعلان‌ها','یادآور سررسید، تأیید پرداخت و گزارش هفتگی') +
      sec('secUi','image','ظاهر و مُهرها','رنگ مُهرهای ثبت و ترجیحات نمایش');
    renderOrgSec(body.querySelector('#secOrg .sec-b'));
    if(typeof renderSrvConnSec === 'function') renderSrvConnSec(body.querySelector('#secSrv .sec-b'));
    renderFieldsSec(body.querySelector('#secFld .sec-b'));
    renderFunds(fundsTab, '#secFa .sec-b');
    renderFinSec(body.querySelector('#secFin .sec-b'));
    renderNotifSec(body.querySelector('#secNotif .sec-b'));
    renderUiSec(body.querySelector('#secUi .sec-b'));
  }
  else if(setTab === 'us'){
    body.innerHTML =
      sec('secRoles','shield','نقش‌ها و دسترسی‌ها','سطح دسترسی هر نقش در همهٔ بخش‌های سامانه') +
      sec('secUsers','users','کاربران','افزودن کاربر، ویرایش و مدیریت وضعیت');
    renderRolesSec(body.querySelector('#secRoles .sec-b'));
    renderUsersTab(body.querySelector('#secUsers .sec-b'));
  }
  else {
    body.innerHTML = sec('secData','file','داده‌ها و ممیزی','پشتیبان‌گیری، بازنشانی و لاگ عملیات');
    renderDataSec(body.querySelector('#secData .sec-b'));
  }
  if(setAnchor){
    const el = document.getElementById(setAnchor);
    if(el && el.scrollIntoView) try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){}
    setAnchor = '';
  }
}
function renderOrgSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    const botEmail = s.institution.email || (typeof SRV!=='undefined'&&SRV.user&&SRV.user.email?SRV.user.email:'') || (typeof SRV!=='undefined'&&SRV.instId?'مؤسسه سرور '+SRV.instId:'');
    const botEmailReal = s.institution.email || (typeof SRV!=='undefined'&&SRV.user?SRV.user.email:'');
    body.innerHTML = '<div class="fields">' +
      '<div class="field full"><label>نام و لوگوی مؤسسه</label><div class="field-row" style="gap:14px">' +
        '<span id="logoPrev" style="display:inline-flex;width:58px;height:58px;border-radius:16px;overflow:hidden;background:rgba(28,110,49,.1);align-items:center;justify-content:center;color:var(--green-deep);flex:none">' +
        (s.institution.logo ? '<img src="'+s.institution.logo+'" style="width:100%;height:100%;object-fit:cover" alt="لوگو">' : icon('image',24)) + '</span>' +
        '<div style="flex:1"><input type="file" id="setLogo" accept="image/*"><span class="help">لوگو در هدر و چاپ گزارش‌ها استفاده می‌شود.</span></div></div></div>' +
      '<div class="field"><label>نام مؤسسه <span class="req">*</span></label><input id="setOrgName" value="'+esc(s.institution.name)+'"'+disAttr+'></div>' +
      '<div class="field"><label>شماره تماس</label><input id="setOrgPhone" class="num-inp" value="'+esc(s.institution.phone)+'"'+disAttr+'></div>' +
      '<div class="field full"><label>آدرس</label><textarea id="setOrgAddr"'+disAttr+'>'+esc(s.institution.address)+'</textarea></div>' +
      (botEmailReal ? '<div class="field full"><label>ایمیل ربات مؤسسه (hes.com)</label><input value="'+esc(botEmailReal)+'" disabled style="background:var(--card-2);direction:ltr;font-family:monospace"><span class="help">این ایمیل با فرمت نام‌لاتین+کدملی@hes.com برای اتصال ربات‌های آینده ساخته شده و در دیتابیس فعال است. نام کاربری ورود = شماره تماس، رمز = کدملی.</span></div>' : '') +
      (canEdit ? '<div class="full" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn btn-solid btn-sm" id="setOrgSave">'+icon('check',14)+' ذخیره اطلاعات مؤسسه</button>' +
        '<button class="btn btn-danger btn-sm" id="btnDeleteInst" title="حذف کامل مؤسسه و تمام داده‌ها">'+icon('trash',14)+' حذف کامل مؤسسه</button></div><div id="delInstStatus" style="margin-top:8px"></div>' : noPermNote()) +
    '</div>';
    const lg = $('#setLogo'); if(lg) lg.onchange = ()=>{
      const f = lg.files[0]; if(!f) return;
      const rd = new FileReader();
      rd.onload = ()=>{ s.institution.logo = rd.result; saveDb();
        $('#logoPrev').innerHTML = '<img src="'+rd.result+'" style="width:100%;height:100%;object-fit:cover" alt="لوگو">'; toast('لوگو بارگذاری شد.','ok'); };
      rd.readAsDataURL(f);
    };
    const sv = $('#setOrgSave'); if(sv) sv.onclick = ()=>{
      const name = fieldVal('#setOrgName');
      if(name.length < 3){ markErr($('#setOrgName'),'نام مؤسسه الزامی است.'); return; }
      Object.assign(s.institution, {name, phone:fieldVal('#setOrgPhone'), address:fieldVal('#setOrgAddr')});
      audit('به‌روزرسانی اطلاعات مؤسسه', 'settings'); saveDb();
      const orgNameEl = document.getElementById('orgName'); if(orgNameEl) orgNameEl.textContent = name;
      renderShell('settings'); toast('اطلاعات مؤسسه ذخیره شد.','ok');
    };
    const delBtn = document.getElementById('btnDeleteInst');
    if(delBtn) delBtn.onclick = async ()=>{
      const ok1 = await askConfirm({title:'حذف کامل مؤسسه', danger:true, ok:'بله، حذف شود', text:'مؤسسه <b>'+esc(s.institution.name)+'</b> و تمام داده‌های آن شامل <b>'+DB.members.length+'</b> عضو، وام‌ها، اقساط و پرداخت‌ها <b>برای همیشه</b> حذف می‌شود. این عمل در حالت سرور نیز از دیتابیس Postgres حذف می‌کند. ادامه می‌دهید؟'});
      if(!ok1) return;
      const ok2 = await askConfirm({title:'تأیید نهایی حذف', danger:true, ok:'حذف نهایی', text:'آیا مطمئن هستید؟ این عمل برگشت‌ناپذیر است.'});
      if(!ok2) return;
      const statusEl = document.getElementById('delInstStatus');
      // اگر سرور فعال است، از API حذف کن
      if(typeof SRV!=='undefined' && SRV.on && SRV.instId && SRV.token){
        try{
          if(statusEl) statusEl.innerHTML = '<div class=\"alert a-info\"><div>در حال حذف از سرور...</div></div>';
          await srvFetch('DELETE','/api/institutions/'+SRV.instId);
          if(statusEl) statusEl.innerHTML = '<div class=\"alert a-ok\"><div>مؤسسه از سرور حذف شد.</div></div>';
          toast('مؤسسه از سرور حذف شد.','ok');
          // خروج
          SRV.on=false; SRV.instId=null; SRV.instName=''; try{localStorage.setItem(SRV_KEY, JSON.stringify(SRV));}catch(e){}
          setTimeout(()=>{ location.hash='#/'; location.reload(); }, 800);
          return;
        }catch(e){
          if(statusEl) statusEl.innerHTML = '<div class=\"alert a-err\"><div>حذف از سرور ناموفق: '+esc(e.message)+'</div></div>';
          toast('حذف از سرور ناموفق: '+e.message,'err');
          return;
        }
      }
      // حالت دمو: پاک‌سازی لوکال
      DB.members=[]; DB.loans=[]; DB.installments=[]; DB.payments=[]; DB.txns=[]; DB.funds=[]; DB.accounts=[]; DB.audit=[]; DB.counters={member:0, loan:0};
      DB.settings.institution = {name:'مؤسسه جدید', phone:'', address:'', logo:'', email:''};
      saveDb();
      toast('مؤسسه و تمام داده‌ها در حالت دمو پاک شد.','ok');
      setTimeout(()=>{ location.hash='#/'; location.reload(); }, 600);
    };
  }
function renderFieldsSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    const MF = s.memberFields || (s.memberFields = DEFAULT_MEMBER_FIELDS.map(f=>Object.assign({},f)));
    const TYPE_FA = {text:'متن', mobile:'موبایل', nid:'کد ملی', jdate:'تاریخ', num:'عدد'};
    /* هر تغییر فیلد، اگر مؤسسه عضو داشته باشد، با هشدار و تأیید اعمال می‌شود */
    async function applyWithWarn(desc, fn, log){
      if(DB.members.length){
        const okc = await askConfirm({title:'تغییر فیلدها با وجود اعضا', ok:'بله، اعمال شود',
          text:'این مؤسسه <b>'+faDigits(DB.members.length)+'</b> عضو دارد. '+desc+
          ' داده‌های قبلی همان‌طور که هست <b>حفظ می‌شود</b>؛ فیلدهای جدید برای اعضا <b>خالی</b> می‌ماند و تا تکمیل‌شدن در فهرست اعضا «ناقص» علامت می‌خورند.'});
        if(!okc){ renderSettings(); return; }
      }
      fn(); audit(log, 'settings'); saveDb(); toast('الگوی فیلدها به‌روزرسانی شد.','ok'); renderSettings();
    }
    body.innerHTML =
      '<div class="alert a-info" style="margin-bottom:13px"><span class="al-ic">'+icon('info',16)+'</span><div>همهٔ فیلدهای عضو این مؤسسه — پیش‌فرض و سفارشی — در این لیست است. هرکدام را می‌توانید خاموش/روشن، الزامی/اختیاری، حذف یا (برای سفارشی‌ها) تغییر نام دهید؛ فرم عضو، جدول اعضا و ورود گروهی بلافاصله از همین لیست پیروی می‌کنند. فقط «نام» همیشه فعال می‌ماند.</div></div>' +
      '<div id="fldList">' + MF.map((f,i)=>
        '<div class="setting-row"><div class="sr-t"><b>'+esc(f.label)+'</b><p>'+(TYPE_FA[f.type]||'متن')+(f.core?' · پایهٔ سامانه':' · سفارشی')+(f.on===0?' · <b style="color:var(--ink-2)">خاموش</b>':'')+'</p></div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<label class="chk" style="font-size:.76rem"><input type="checkbox" data-freq="'+i+'"'+(fieldReq(f.key)?' checked':'')+((f.key==='name'||!canEdit)?' disabled':'')+'> الزامی</label>' +
          (f.key!=='name'
            ? '<span class="sw" data-tip="خاموش = از فرم‌ها و جدول حذف می‌شود؛ داده‌ها حفظ می‌ماند"><input type="checkbox" data-ft="'+i+'"'+(f.on!==0?' checked':'')+(canEdit?'':' disabled')+'></span>'
            : '<span class="badge b-gray"><i class="bd"></i>همیشه فعال</span>') +
          (!f.core && canEdit ? '<button class="x-btn" data-fren="'+i+'" data-tip="تغییر عنوان">'+icon('edit',14)+'</button>' : '') +
          (f.key!=='name' && canEdit ? '<button class="x-btn danger" data-fdel="'+i+'" data-tip="حذف از الگو">'+icon('trash',14)+'</button>' : '') +
        '</div></div>').join('') + '</div>' +
      (canEdit ? '<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="fldRestore">'+icon('refresh',13)+' بازگردانی فیلدهای پیش‌فرضِ حذف‌شده</button></div>' : '') +
      (canEdit ?
        '<div class="card-h" style="padding:16px 0 6px;border:0"><h3>افزودن فیلد سفارشی</h3></div>' +
        '<div class="fields">' +
          '<div class="field"><label>عنوان فیلد</label><input id="fldNewLabel" placeholder="مثلاً شغل، شهر، مدرک…"></div>' +
          '<div class="field"><label>نوع فیلد</label><select id="fldNewType"><option value="text">متن</option><option value="num">عدد</option></select></div>' +
          '<div class="field"><label>الزامی؟</label><select id="fldNewReq"><option value="0">خیر</option><option value="1">بله — همهٔ اعضا باید پر کنند</option></select><span class="help">اگر الزامی باشد، اعضای فعلی تا تکمیل آن «ناقص» می‌مانند.</span></div>' +
          '<div class="full"><button class="btn btn-solid btn-sm" id="fldAdd">'+icon('plus',14)+' افزودن به الگو</button></div>' +
        '</div>'
      : noPermNote());
    /* روشن/خاموش */
    body.querySelectorAll('[data-ft]').forEach(cb => cb.onchange = ()=>{
      const f = MF[+cb.dataset.ft], turningOn = cb.checked;
      applyWithWarn(
        turningOn ? 'با روشن‌کردن «'+f.label+'»، این فیلد دوباره در فرم‌ها و جدول ظاهر می‌شود.'
                  : 'با خاموش‌کردن «'+f.label+'»، این فیلد از فرم‌ها و جدول کنار می‌رود (دادهٔ اعضا پاک نمی‌شود).',
        ()=>{ f.on = turningOn ? 1 : 0; },
        (turningOn?'فعال‌سازی':'غیرفعال‌سازی')+' فیلد «'+f.label+'» در الگوی اعضا');
    });
    /* تغییر الزامی/اختیاری */
    body.querySelectorAll('[data-freq]').forEach(cb => cb.onchange = ()=>{
      const f = MF[+cb.dataset.freq], makingReq = cb.checked;
      applyWithWarn(
        makingReq ? '«'+f.label+'» الزامی می‌شود و همهٔ اعضا باید آن را پر کنند.'
                  : '«'+f.label+'» اختیاری می‌شود و دیگر برای ذخیره اجباری نیست.',
        ()=>{ f.req = makingReq ? 1 : 0; },
        (makingReq?'الزامی‌کردن':'اختیاری‌کردن')+' فیلد «'+f.label+'»');
    });
    /* حذف فیلد (سفارشی و پایه — به‌جز نام) */
    body.querySelectorAll('[data-fdel]').forEach(b => b.onclick = ()=>{
      const i = +b.dataset.fdel, f = MF[i];
      applyWithWarn('با حذف «'+f.label+'» از الگو، این فیلد دیگر در فرم‌ها و جدول نمایش داده نمی‌شود؛'+(f.core?' این فیلد پایه است و بعداً با دکمهٔ «بازگردانی» برمی‌گردد.':''),
        ()=>{ MF.splice(i,1); }, 'حذف فیلد «'+f.label+'» از الگوی اعضا');
    });
    /* تغییر عنوان فیلد سفارشی */
    body.querySelectorAll('[data-fren]').forEach(b => b.onclick = ()=>{
      const i = +b.dataset.fren, row = b.closest('.setting-row'), tt = row.querySelector('.sr-t');
      if(tt.querySelector('#fldRenInp')) return;
      const cur = MF[i].label;
      tt.innerHTML = '<input id="fldRenInp" value="'+esc(cur)+'" style="max-width:230px"> <button class="btn btn-solid btn-sm" id="fldRenOk">ذخیرهٔ عنوان</button>';
      tt.querySelector('#fldRenOk').onclick = ()=>{
        const nv = tt.querySelector('#fldRenInp').value.trim();
        if(nv.length < 2){ toast('عنوان را کامل وارد کنید.','err'); return; }
        applyWithWarn('عنوان فیلد از «'+cur+'» به «'+nv+'» تغییر می‌کند؛', ()=>{ MF[i].label = nv; }, 'تغییر عنوان فیلد «'+cur+'» به «'+nv+'»');
      };
    });
    /* بازگردانی پیش‌فرض‌های حذف‌شده */
    const rb = $('#fldRestore'); if(rb) rb.onclick = ()=>{
      const missing = DEFAULT_MEMBER_FIELDS.filter(d=>!MF.some(f=>f.key===d.key));
      if(!missing.length){ toast('همهٔ فیلدهای پیش‌فرض در الگو موجودند.','ok'); return; }
      applyWithWarn('فیلدهای پیش‌فرضِ حذف‌شده ('+missing.map(d=>d.label).join('، ')+') دوباره اضافه می‌شوند؛',
        ()=>{ missing.forEach(d=>MF.push(Object.assign({},d,{on:1}))); }, 'بازگردانی فیلدهای پیش‌فرض اعضای مؤسسه');
    };
    /* افزودن فیلد سفارشی */
    const add = $('#fldAdd'); if(add) add.onclick = ()=>{
      const label = fieldVal('#fldNewLabel');
      if(label.length < 2){ markErr($('#fldNewLabel'),'عنوان فیلد را وارد کنید.'); return; }
      const req = $('#fldNewReq').value === '1' ? 1 : 0;
      const nf = {key:'c'+Date.now().toString(36), label, type:$('#fldNewType').value, on:1, req};
      applyWithWarn('فیلد جدید «'+label+'» اضافه می‌شود و برای همهٔ اعضا <b>خالی</b> خواهد بود؛'+(req?' چون الزامی است، باید برای تک‌تک اعضا پر شود.':''),
        ()=>{ MF.push(nf); }, 'افزودن فیلد سفارشی «'+label+'» به الگوی اعضا');
    };
}
function renderFinSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    body.innerHTML = '<div class="fields">' +
      '<div class="field"><label>واحد پول</label><select id="setCur"'+disAttr+'><option'+(s.currency==='تومان'?' selected':'')+'>تومان</option><option'+(s.currency==='ریال'?' selected':'')+'>ریال</option></select></div>' +
      '<div class="field"><label>قالب شماره‌گذاری اعضا</label><input id="setNoTpl" class="num-inp" value="'+esc(s.memberNoTemplate)+'"'+disAttr+'>' +
        '<span class="help">متغیر <b>{seq}</b> یا <b>{seq:4}</b> = شماره ردیف. پیش‌نمایش: <b id="noPrev">'+esc(s.memberNoTemplate.replace(/\{seq(?::(\d+))?\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')))+'</b></span></div>' +
      '<div class="field"><label>پیش‌فرض کارمزد سالانه وام <small>(٪)</small></label><input id="setLdRate" class="num-inp" value="'+esc(String((s.loanDefaults||{}).rate!==undefined?s.loanDefaults.rate:4))+'"'+disAttr+'><span class="help">فرم ثبت وام با این مقدار پر می‌شود.</span></div>' +
      '<div class="field"><label>پیش‌فرض تعداد اقساط</label><input id="setLdMonths" type="number" min="1" max="120" value="'+esc(String((s.loanDefaults||{}).months||12))+'"'+disAttr+'><span class="help">متغیر - 1 تا 120 قسط</span></div>' +
      '<div class="field"><label>پیش‌فرض دوره اقساط</label><select id="setLdInt"'+disAttr+'><option value="1"'+(((s.loanDefaults||{}).interval||1)==1?' selected':'')+'>ماهانه</option><option value="2"'+((s.loanDefaults||{}).interval==2?' selected':'')+'>دوماه یک‌بار</option><option value="3"'+((s.loanDefaults||{}).interval==3?' selected':'')+'>سه‌ماه یک‌بار</option></select></div>' +
      (canEdit ? '<div class="full"><button class="btn btn-solid btn-sm" id="setFinSave">'+icon('check',14)+' ذخیره تنظیمات مالی</button></div>' : noPermNote()) +
    '</div>';
    const tpl = $('#setNoTpl');
    if(tpl) tpl.addEventListener('input', ()=>{ $('#noPrev').textContent = tpl.value.replace(/\{seq(?::(\d+))?\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')); });
    const sv = $('#setFinSave'); if(sv) sv.onclick = ()=>{
      s.currency = $('#setCur').value; s.memberNoTemplate = fieldVal('#setNoTpl') || 'M-{seq:4}';
      s.loanDefaults = {
        rate: Math.max(0, Math.min(100, +fieldVal('#setLdRate') || 0)),
        months: +($('#setLdMonths')&&$('#setLdMonths').value) || 12,
        interval: +($('#setLdInt')&&$('#setLdInt').value) || 1
      };
      audit('به‌روزرسانی تنظیمات مالی', 'settings'); saveDb(); toast('تنظیمات مالی ذخیره شد.','ok'); route();
    };
  }
function renderNotifSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    const n = s.notifications;
    body.innerHTML =
      '<div class="setting-row"><div class="sr-t"><b>یادآور سررسید اقساط</b><p>نمایش هشدار برای اقساط نزدیک به سررسید و گذشته در داشبورد و اعلان‌ها.</p></div><span class="sw"><input type="checkbox" id="ntDue"'+(n.dueReminder?' checked':'')+'></span></div>' +
      '<div class="setting-row"><div class="sr-t"><b>تأیید ثبت پرداخت</b><p>نمایش تأییدیه پس از هر ثبت پرداخت برای کاربر.</p></div><span class="sw"><input type="checkbox" id="ntPay"'+(n.payConfirm?' checked':'')+'></span></div>' +
      '<div class="setting-row"><div class="sr-t"><b>گزارش هفتگی</b><p>تهیه خودکار خلاصه عملکرد هفتگی (در نسخه‌های بعدی فعال می‌شود).</p></div><span class="sw"><input type="checkbox" id="ntWeek"'+(n.weeklyReport?' checked':'')+'></span></div>' +
      '<div style="margin-top:14px">'+(canEdit?'<button class="btn btn-solid btn-sm" id="ntSave">'+icon('check',14)+' ذخیره تنظیمات اعلان</button>':noPermNote())+'</div>';
    const sv = $('#ntSave'); if(sv) sv.onclick = ()=>{
      n.dueReminder = $('#ntDue').checked; n.payConfirm = $('#ntPay').checked; n.weeklyReport = $('#ntWeek').checked;
      saveDb(); toast('تنظیمات اعلان‌ها ذخیره شد.','ok');
    };
  }
function renderRolesSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    const roles = Object.keys(ROLE_FA);
    const perms = Object.keys(PERM_FA);
    body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>دسترسی</th>' + roles.map(r=>'<th style="text-align:center">'+ROLE_FA[r]+(r==='admin'?' <small style="color:var(--ink-2)">(قفل)</small>':'')+'</th>').join('') + '</tr></thead><tbody>' +
      perms.map(p => '<tr><td><b style="font-size:.85rem">'+PERM_FA[p]+'</b></td>' + roles.map(r => {
        const checked = !!(DB.settings.roles[r]||{})[p];
        return '<td style="text-align:center"><label class="chk" style="justify-content:center"><input type="checkbox" data-r="'+r+'" data-p="'+p+'"'+(checked?' checked':'')+(r==='admin'?' disabled':'')+(!canEdit?' disabled':'')+'></label></td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="alert a-warn" style="margin-top:13px"><span class="al-ic">'+icon('warn',16)+'</span><div>تغییر دسترسی‌ها بلافاصله روی همه نشست‌ها اعمال می‌شود؛ نقش «مدیر» برای جلوگیری از قفل‌شدن سامانه همیشه همه دسترسی‌ها را دارد.</div></div>';
    body.querySelectorAll('input[data-r]').forEach(cb => cb.onchange = ()=>{
      DB.settings.roles[cb.dataset.r][cb.dataset.p] = cb.checked ? 1 : 0;
      audit('تغییر دسترسی «'+PERM_FA[cb.dataset.p]+'» برای نقش '+ROLE_FA[cb.dataset.r], 'settings');
      saveDb(); toast('دسترسی «'+PERM_FA[cb.dataset.p]+'» برای نقش «'+ROLE_FA[cb.dataset.r]+'» '+(cb.checked?'فعال':'غیرفعال')+' شد.','ok');
      renderShell('settings');
    });
}
function renderUiSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    const sc = s.stampColors || (s.stampColors = {member:'#B3261E', payment:'#1C6E31'});
    body.innerHTML =
      '<div class="setting-row"><div class="sr-t"><b>رنگ مُهر «ثبت عضو»</b><p>رنگ استامپی که هنگام ذخیرهٔ عضو جدید، از فرم بلند شده و گوشهٔ تصویر می‌کوبد.</p></div>' +
      '<input type="color" id="stColMember" value="'+(sc.member||'#B3261E')+'"'+(canEdit?'':' disabled')+' style="width:46px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:3px;cursor:pointer"></div>' +
      '<div class="setting-row"><div class="sr-t"><b>رنگ مُهر «ثبت پرداخت»</b><p>رنگ استامپ هنگام ثبت پرداخت قسط.</p></div>' +
      '<input type="color" id="stColPayment" value="'+(sc.payment||'#1C6E31')+'"'+(canEdit?'':' disabled')+' style="width:46px;height:34px;border:1px solid var(--line);border-radius:9px;background:var(--card);padding:3px;cursor:pointer"></div>' +
      '<div class="setting-row"><div class="sr-t"><b>زبان رابط کاربری</b><p>طبق سند طراحی، زبان اصلی سامانه فارسی و چیدمان راست‌به‌چپ است.</p></div><div class="chips"><span class="chip on" style="cursor:default">فارسی</span><span class="chip" style="opacity:.5;cursor:not-allowed">English (به‌زودی)</span></div></div>' +
      '<div class="setting-row"><div class="sr-t"><b>حالت نمایش</b><p>حالت تاریک در فاز بعدی توسعه اضافه می‌شود و وابسته به MVP نیست.</p></div><div class="chips"><span class="chip on" style="cursor:default">روشن</span><span class="chip" style="opacity:.5;cursor:not-allowed">تاریک (به‌زودی)</span></div></div>' +
      '<div class="setting-row"><div class="sr-t"><b>قاب سفید دور لندینگ</b><p>قاب ۲۰ پیکسلی صفحه معرفی (بر اساس طراحی فعلی).</p></div><span class="badge b-green"><i class="bd"></i>فعال</span></div>';
    const cm = $('#stColMember'), cp = $('#stColPayment');
    if(cm) cm.onchange = ()=>{ s.stampColors.member = cm.value; saveDb(); toast('رنگ مُهر ثبت عضو تغییر کرد.','ok'); };
    if(cp) cp.onchange = ()=>{ s.stampColors.payment = cp.value; saveDb(); toast('رنگ مُهر ثبت پرداخت تغییر کرد.','ok'); };
  }
function renderDataSec(box){
    const body = box; const s = DB.settings; const canEdit = can('settingsEdit'); const disAttr = canEdit ? '' : ' disabled style="opacity:.55;pointer-events:none"';
    
    body.innerHTML =
      '<div class="setting-row"><div class="sr-t"><b>پشتیبان‌گیری از داده دمو</b><p>خروجی JSON از همه رکوردهای ذخیره‌شده در مرورگر.</p></div>' +
      '<button class="btn btn-soft btn-sm" id="setBackup">'+icon('download',14)+' دانلود</button></div>' +
      '<div class="setting-row"><div class="sr-t"><b>بازگردانی از فایل JSON</b><p>جایگزینی کامل داده‌های فعلی با فایل پشتیبان (خروجی همین پنل). قبل از جایگزینی، تأیید گرفته می‌شود.</p></div>' +
      '<button class="btn btn-soft btn-sm" id="setRestore">'+icon('upload',14)+' انتخاب فایل</button></div>' +
      '<div class="setting-row"><div class="sr-t"><b>بازنشانی داده دمو</b><p>همه داده‌ها به حالت اولیه بازنشانی می‌شود (اعضا، وام‌ها، تراکنش‌ها و…).</p></div>' +
      '<button class="btn btn-danger btn-sm" id="setReset">'+icon('trash',14)+' بازنشانی</button></div>' +
      '<div class="setting-row"><div class="sr-t"><b>شروع از صفر — پاک‌سازی کامل</b><p>همهٔ اعضا، وام‌ها، اقساط، پرداخت‌ها، تراکنش‌ها، صندوق‌ها و حساب‌ها حذف می‌شوند تا سامانه کاملاً خام شود؛ فقط کاربران و تنظیمات باقی می‌ماند.</p></div>' +
      '<button class="btn btn-danger btn-sm" id="setWipe">'+icon('trash',14)+' شروع از صفر</button></div>' +
      '<div class="card-h" style="padding:18px 0 8px;border:0"><h3>لاگ ممیزی (۱۵ رویداد اخیر)</h3></div>' +
      (DB.audit.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>زمان</th><th>کاربر</th><th>عملیات</th></tr></thead><tbody>' +
        DB.audit.slice(0,15).map(a=>'<tr><td class="c-fa-num">'+J.fmt(a.at)+faTime(a.at)+'</td><td>'+esc(a.user)+'</td><td>'+esc(a.action)+'</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="notif-empty">رویدادی ثبت نشده است.</div>');
    const bk = $('#setBackup'); if(bk) bk.onclick = ()=>{
      const blob = new Blob([JSON.stringify(DB,null,1)],{type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hesabat-backup-'+J.todayIso()+'.json'; a.click();
      toast('پشتیبان دانلود شد.','ok');
    };
    const restoreInput = document.createElement('input');
    restoreInput.type = 'file'; restoreInput.accept = '.json,application/json'; restoreInput.style.display = 'none';
    document.body.appendChild(restoreInput);
    const rb2 = $('#setRestore'); if(rb2) rb2.onclick = ()=> guard('settingsEdit', ()=> restoreInput.click());
    restoreInput.onchange = ()=>{
      const f = restoreInput.files[0]; restoreInput.value = '';
      if(!f) return;
      const rd = new FileReader();
      rd.onload = async ()=>{
        let parsed = null;
        try{ parsed = JSON.parse(rd.result); }catch(e){ toast('فایل انتخاب‌شده JSON معتبر نیست.','err'); return; }
        const res = restoreDbFromObject(parsed);
        if(!res.ok){ toast(res.msg,'err'); return; }
        const d = res.data;
        const okc = await askConfirm({title:'بازگردانی داده از فایل', danger:true, ok:'بله، جایگزین شود',
          text:'داده‌های فعلی با محتوای فایل <b>جایگزین</b> می‌شوند: <b>'+faDigits(d.members.length)+'</b> عضو، <b>'+faDigits(d.loans.length)+'</b> وام و <b>'+
          faDigits(d.payments.length)+'</b> پرداخت از فایل «'+esc(f.name)+'». ادامه می‌دهید؟'});
        if(!okc) return;
        DB = d;
        saveDb();
        audit('بازگردانی داده از فایل '+f.name+' توسط '+SESSION.name, 'settings');
        saveDb();
        toast('داده‌ها از فایل بازیابی شد.','ok');
        route(); renderShell('settings');
      };
      rd.readAsText(f);
    };
    const rs = $('#setReset'); if(rs) rs.onclick = ()=> guard('settingsEdit', async ()=>{
      const ok = await askConfirm({title:'بازنشانی داده دمو', danger:true, ok:'بازنشانی کامل', text:'همه داده‌های فعلی حذف و داده نمونه اولیه دوباره ساخته می‌شود. ادامه می‌دهید؟'});
      if(!ok) return;
      resetDb(); toast('داده‌ها بازنشانی شد.','ok'); route(); renderShell('settings');
    });
    const wp = $('#setWipe'); if(wp) wp.onclick = ()=> guard('settingsEdit', async ()=>{
      const ok = await askConfirm({title:'شروع از صفر', danger:true, ok:'بله، همه داده‌ها پاک شود',
        text:'<b>'+faDigits(DB.members.length)+'</b> عضو، <b>'+faDigits(DB.loans.length)+'</b> وام، <b>'+
        faDigits(DB.installments.length)+'</b> قسط، <b>'+faDigits(DB.payments.length)+'</b> پرداخت و <b>'+
        faDigits(DB.txns.length)+'</b> تراکنش <b>برای همیشه</b> حذف می‌شوند؛ صندوق‌ها و حساب‌ها نیز پاک می‌شوند. فقط کاربران و تنظیمات باقی می‌ماند. ادامه می‌دهید؟'});
      if(!ok) return;
      DB.members = []; DB.loans = []; DB.installments = []; DB.payments = [];
      DB.txns = []; DB.funds = []; DB.accounts = [];
      DB.audit = []; DB.importTemplates = []; DB.counters.member = 0;
      saveDb();
      audit('شروع از صفر — پاک‌سازی کامل داده‌ها توسط '+SESSION.name, 'settings');
      saveDb(); toast('سامانه از صفر شروع شد؛ همه داده‌ها پاک شد.','ok'); route(); renderShell('settings');
    });
}
function noPermNote(){ return '<div class="alert a-warn full"><span class="al-ic">'+icon('warn',16)+'</span><div>نقش شما اجازه ویرایش تنظیمات را ندارد.</div></div>'; }

/* ═══════════ افزودن گروهی اعضا (بخش 8 سند) ═══════════ */
function bulkImportWizard(){
  let step = 1;
  let tplName = 'پیش‌فرض';
  let tplMap = {};
  let rows = [];           // رکوردهای استخراج‌شده
  let counters = {total:0, ok:0, err:0, dup:0};
  let fileName = '';
  let bulkVT = null; /* توکن‌های خام برگشتی از پنجرهٔ پل لنز */
  let lensHandler = null; /* دریافت پیام‌های iframe پل */

  /* ستون‌ها و گزینه‌های نگاشت از «الگوی فیلدهای مؤسسه» در تنظیمات می‌آیند */
  const _FLD = FIELDS();
  const COLS = Math.max(2, Math.min(8, _FLD.length || 4));
  const FIELD_OPTS = [['','— ثبت نشود —']].concat(_FLD.map(f=>[f.key, f.label]));
  for(let _i=0; _i<COLS; _i++) if(tplMap[_i+1]===undefined) tplMap[_i+1] = _FLD[_i] ? _FLD[_i].key : '';

  const h = openModal({
    title:'افزودن گروهی اعضا', sub:'ورود گروهی اطلاعات اعضا از تصویر لیست — آنلاین با Google Vision یا بدون کلید با موتور داخلی مرورگر', size:'xl',
    body:
      '<ol class="steps" id="biSteps">' +
        ['بارگذاری تصویر','الگو و نگاشت','پردازش','پیش‌نمایش و اعتبارسنجی','تأیید و ثبت'].map((s,i)=>'<li'+(i===0?' class="cur"':'')+'><span class="st-n">'+faDigits(i+1)+'</span>'+s+'</li>').join('') +
      '</ol><div id="biBody"></div>',
    foot:'<span class="grow" style="font-size:.78rem;color:var(--ink-2)">'+icon('shield',13)+' بدون کلید گوگل، تصویر اصلاً از دستگاه شما خارج نمی‌شود.</span>' +
      '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm hidden" id="biNext"></button>'
  });
  const body = h.el.querySelector('#biBody');
  const next = h.el.querySelector('#biNext');
  h.el.querySelector('[data-x]').onclick = ()=> h.close();

  function setStep(n){
    step = n;
    h.el.querySelectorAll('#biSteps li').forEach((li,i)=>{ li.className = i+1<n ? 'done' : i+1===n ? 'cur' : ''; });
    next.classList.add('hidden');
  }

  /* ── پنجرهٔ پلِ لنز: سند جداگانه داخل iframe — ارتباط فقط با postMessage ──
     (گوگل اجازهٔ iframe کردن lens.google.com را نمی‌دهد؛ این پنجره از سرویس
     رسمی Vision استفاده می‌کند — همان زیرساخت پشت لنز — با UX مشابه لنز) */
  const LENS_BRIDGE_HTML = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<style>
 body{font-family:Segoe UI,Tahoma,sans-serif;margin:0;background:#f8f9fa;color:#202124;display:flex;align-items:center;justify-content:center;min-height:100vh}
 .card{background:#fff;border:1px solid #dadce0;border-radius:16px;box-shadow:0 1px 3px rgba(60,64,67,.2);padding:22px 26px;width:min(560px,92%);text-align:center}
 .hd{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;margin-bottom:4px}
 .dots span{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 1.5px}
 .sub{font-size:.78rem;color:#5f6368;margin-bottom:16px}
 button{font:inherit;border:0;border-radius:22px;padding:11px 20px;margin:4px;cursor:pointer;font-weight:600}
 .bp{background:#1a73e8;color:#fff}.bp:hover{background:#1765cc}
 .bs{background:#fff;color:#1a73e8;border:1px solid #dadce0}
 #pv{max-width:100%;max-height:150px;border-radius:10px;margin-top:12px;display:none;border:1px solid #e0e0e0}
 #st{min-height:22px;margin-top:10px;font-size:.82rem;color:#5f6368}
 .scan{position:relative;overflow:hidden}
 .scan::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,rgba(26,115,232,.25) 50%,transparent 100%);animation:sc 1.1s linear infinite}
 @keyframes sc{from{transform:translateY(-100%)}to{transform:translateY(100%)}}
</style></head><body><div class="card">
 <div class="hd"><span class="dots"><span style="background:#4285F4"></span><span style="background:#EA4335"></span><span style="background:#FBBC05"></span><span style="background:#34A853"></span></span> پل Google Lens — انتخاب تصویر</div>
 <div class="sub">عکس را انتخاب یا با دوربین بگیرید؛ اسکن با سرویس گوگل انجام و نتیجه به پنل برگردانده می‌شود.</div>
 <button class="bp" id="bPick">📂 انتخاب عکس از دستگاه</button>
 <button class="bs" id="bCam">📷 گرفتن عکس با دوربین</button>
 <input type="file" id="fPick" accept="image/*" hidden>
 <input type="file" id="fCam" accept="image/*" capture="environment" hidden>
 <div id="pvw"><img id="pv"></div>
 <div id="st">منتظر تصویر…</div>
 <div style="margin-top:14px;border-top:1px dashed #dadce0;padding-top:12px">
  <div class="sub" style="margin-bottom:8px">حالت لنز شخصی: با جیمیل خودت وارد لنز خودت شو، متن را کپی و اینجا بچسبان؛ سازمان‌دهی داده‌ها با برنامهٔ پنل.</div>
  <button class="bs" id="bLens">🔗 باز کردن Google Lens من</button>
  <textarea id="ta" rows="3" style="width:100%;margin-top:8px;font:inherit;border:1px solid #dadce0;border-radius:10px;padding:8px;box-sizing:border-box" placeholder="متن کپی‌شده از لنز را اینجا بچسبانید…"></textarea>
  <button class="bp" id="bSend">➡️ انتقال به پنل و سازمان‌دهی</button>
 </div>
</div>
<script>
var KEY='';
addEventListener('message',function(e){ if(e.data&&e.data.type==='lens-init'){KEY=e.data.key||'';} });
var st=document.getElementById('st'),pv=document.getElementById('pv');
function tessLoad(){
  if(window.__tess) return window.__tess;
  window.__tess=(async function(){
    if(!window.Tesseract){
      await new Promise(function(res,rej){var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
        s.onload=res; s.onerror=function(){rej(new Error('دریافت موتور از CDN ناموفق بود'));};
        document.head.appendChild(s);});
    }
    var src=await (await fetch('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js')).text();
    var blob=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
    return await Tesseract.createWorker('fas',1,{workerPath:blob});
  })();
  return window.__tess;
}
function go(f){
  if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
    pv.src=rd.result; pv.style.display='inline-block'; pv.parentNode.classList.add('scan');
    if(KEY){ st.textContent='در حال اسکن با Google Vision…'; visionGo(rd.result,f); }
    else { st.textContent='حالت بدون کلید: موتور داخلی مرورگر — در حال اسکن…'; tessGo(rd.result,f); }
  };
  rd.readAsDataURL(f);
}
function visionGo(dataUrl,f){
    var b64=String(dataUrl).split(',')[1]||'';
    fetch('https://vision.googleapis.com/v1/images:annotate?key='+encodeURIComponent(KEY),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({requests:[{image:{content:b64},features:[{type:'DOCUMENT_TEXT_DETECTION'}],imageContext:{languageHints:['fa']}}]})
    }).then(function(r){return r.json();}).then(function(j){
      pv.parentNode.classList.remove('scan');
      if(j&&j.error){st.textContent='⚠️ '+j.error.message;parent.postMessage({type:'lens-error',message:j.error.message},'*');return;}
      var resp=j&&j.responses&&j.responses[0];
      if(!resp||resp.error){var m=(resp&&resp.error&&resp.error.message)||'پاسخ خالی';st.textContent='⚠️ '+m;parent.postMessage({type:'lens-error',message:m},'*');return;}
      st.textContent='✅ متن استخراج شد؛ در حال انتقال به پنل…';
      parent.postMessage({type:'lens-done',name:f.name||'list.png',resp:resp},'*');
    }).catch(function(e){
      pv.parentNode.classList.remove('scan');
      st.textContent='⚠️ خطا در ارتباط با گوگل: '+e.message;
      parent.postMessage({type:'lens-error',message:e.message},'*');
    });
}
function tessGo(dataUrl,f){
  tessLoad().then(function(w){ return w.recognize(dataUrl); }).then(function(r){
    pv.parentNode.classList.remove('scan');
    var toks=[]; var W=pv.naturalWidth||1000;
    (r.data.blocks||[]).forEach(function(bl){(bl.paragraphs||[]).forEach(function(pa){(pa.lines||[]).forEach(function(ln){(ln.words||[]).forEach(function(wd){
      var b=wd.bbox||{}; if(!wd.text||b.x1==null) return;
      toks.push({cx:(b.x0+b.x1)/2, cy:(b.y0+b.y1)/2, h:Math.max(4,b.y1-b.y0), txt:wd.text});
    });});});});
    if(!toks.length){ st.textContent='⚠️ متنی یافت نشد.'; parent.postMessage({type:'lens-error',message:'متنی در تصویر یافت نشد'},'*'); return; }
    st.textContent='✅ متن استخراج شد؛ در حال انتقال به پنل…';
    parent.postMessage({type:'lens-tokens',name:f.name||'list.png',toks:toks,W:W},'*');
  }).catch(function(e){
    pv.parentNode.classList.remove('scan');
    st.textContent='⚠️ '+e.message;
    parent.postMessage({type:'lens-error',message:e.message},'*');
  });
}
document.getElementById('bPick').onclick=function(){document.getElementById('fPick').click();};
document.getElementById('bCam').onclick=function(){document.getElementById('fCam').click();};
document.getElementById('bLens').onclick=function(){window.open('https://lens.google.com','_blank');};
document.getElementById('bSend').onclick=function(){
  var t=document.getElementById('ta').value||'';
  if(!t.trim()){st.textContent='⚠️ ابتدا متن لنز را بچسبانید.';return;}
  st.textContent='✅ در حال انتقال متن به پنل…';
  parent.postMessage({type:'lens-text',name:'lens-'+Date.now()+'.txt',text:t},'*');
};
document.getElementById('fPick').onchange=function(){go(this.files&&this.files[0]);};
document.getElementById('fCam').onchange=function(){go(this.files&&this.files[0]);};
<\/script></body></html>`;

  /* گام ۱: پنجرهٔ پل لنز */
  function step1(){
    setStep(1);
    body.innerHTML =
      '<details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:.82rem;color:var(--ink-2)">تنظیمات مالک (اختیاری): کلید Google Vision برای کیفیت بالاتر</summary>' +
        '<div class="field" style="margin-top:8px"><input id="biGKey" dir="ltr" style="text-align:left" placeholder="AIzaSy…" value="'+esc(localStorage.getItem('hesabat-gvision-key')||'')+'">' +
        '<small style="color:var(--ink-2)">بدون کلید، پل با موتور داخلی مرورگر کار می‌کند و تصویر اصلاً از دستگاه خارج نمی‌شود. با کلیدِ حساب خودتان، اسکن به Google Vision سپرده می‌شود؛ کاربر نهایی هیچ‌کدام را نمی‌بیند.</small></div>' +
        '<details style="margin:2px 0 6px"><summary style="cursor:pointer;font-size:.78rem;color:var(--ink-2)">راهنمای گرفتن کلید (رایگان، حدود ۵ دقیقه)</summary>' +
        '<ol style="font-size:.78rem;color:var(--ink-2);margin:6px 18px 0;padding:0;line-height:1.9">' +
        '<li>با حساب جیمیل وارد <a href="https://console.cloud.google.com" target="_blank" rel="noopener" dir="ltr" style="color:var(--green-deep);font-weight:700;text-decoration:underline">console.cloud.google.com</a> شوید.</li>' +
        '<li>یک پروژه بسازید (بالای صفحه ▸ New Project ▸ نام دلخواه ▸ Create).</li>' +
        '<li>منوی «APIs &amp; Services» ▸ «Library» ▸ جست‌وجوی <b>Cloud Vision API</b> ▸ دکمهٔ Enable.</li>' +
        '<li>«Credentials» ▸ «Create credentials» ▸ «API key» ▸ کلید را کپی کنید (با AIza شروع می‌شود).</li>' +
        '<li>کلید را همین‌جا بچسبانید و ذخیره کنید — تمام. تا ۱۰۰۰ تصویر در ماه رایگان است؛ اگر گوگل فعال‌سازی صورتحساب خواست، در این حد مبلغی کسر نمی‌شود.</li></ol></details></details>' +
      '<iframe id="biBridge" title="پل گوگل لنز" style="width:100%;height:330px;border:1px solid var(--line);border-radius:14px;background:#f8f9fa;margin-top:12px"></iframe>' +
      '<div class="alert a-info" style="margin-top:14px"><span class="al-ic">'+icon('info',16)+'</span><div>این قابلیت برای مهاجرت مؤسسات با تعداد زیاد عضو (مثلاً ۲۰۰۰ عضو) طراحی شده و داده‌ها به‌صورت <b>دسته‌ای (Batch)</b> پردازش می‌شوند.</div></div>';
    const br = body.querySelector('#biBridge');
    br.srcdoc = LENS_BRIDGE_HTML;
    const sendInit=()=>{ try{ br.contentWindow.postMessage({type:'lens-init', key:(localStorage.getItem('hesabat-gvision-key')||'').trim()},'*'); }catch(e){} };
    br.onload = sendInit;
    const gk=body.querySelector('#biGKey');
    gk.onchange=()=>{ localStorage.setItem('hesabat-gvision-key', gk.value.trim()); sendInit(); };
    const demoBtn = document.createElement('button');
    demoBtn.className = 'btn btn-soft btn-sm'; demoBtn.style.marginTop = '12px';
    demoBtn.innerHTML = icon('file',14)+' بدون فایل — استفاده از داده نمونه';
    demoBtn.onclick = ()=>{ fileName='sample-list.png'; bulkVT=null; beginMapping(); };
    br.after(demoBtn);
    /* پیست یا تایپ مستقیم — بدون پنجرهٔ لنز، با هر ساختاری */
    const pasteWrap = document.createElement('div');
    pasteWrap.style.marginTop = '14px';
    pasteWrap.innerHTML =
      '<div class="field" style="margin-bottom:8px"><label>یا متن را مستقیم اینجا بچسبانید یا تایپ کنید — با هر ساختاری که هست</label>' +
      '<textarea id="biPaste" rows="4" style="width:100%;font:inherit;direction:rtl" placeholder="هر ساختاری قبول است: لیبا صفری ۱۲۷۴۸۱۷۴۵ اکبر ۱۲ — یا با ویرگول، یا هر خط یک مورد"></textarea>' +
      '<span class="help">جدول‌بندی لازم نیست؛ برنامه خودش ستون‌ها را پیدا می‌کند و برای ثبت نهایی نوع هر ستون (متن/عدد) را تعیین می‌کند.</span></div>' +
      '<button class="btn btn-soft btn-sm" id="biPasteGo">'+icon('check',14)+' سازمان‌دهی متن و ادامه</button>';
    demoBtn.after(pasteWrap);
    pasteWrap.querySelector('#biPasteGo').onclick = ()=>{
      const t = pasteWrap.querySelector('#biPaste').value || '';
      if(!t.trim()){ toast('ابتدا متنی بچسبانید یا تایپ کنید.','warn'); return; }
      const vt = textToRows(t);
      if(!vt.toks.length){ toast('متنی برای سازمان‌دهی یافت نشد.','warn'); return; }
      bulkVT = vt; fileName = 'paste-'+Date.now()+'.txt';
      beginMapping();
    };
    lensHandler = (ev)=>{
      if(ev.source!==br.contentWindow || !ev.data) return;
      if(ev.data.type==='lens-error'){ toast('لنز: '+ev.data.message,'warn'); return; }
      if(ev.data.type==='lens-text'){
        const vt=textToRows(ev.data.text);
        if(!vt.toks.length){ toast('لنز: متنی برای سازمان‌دهی یافت نشد.','warn'); return; }
        bulkVT=vt; fileName=ev.data.name||'lens.txt';
        beginMapping(); return;
      }
      if(ev.data.type==='lens-tokens'){
        bulkVT={toks:ev.data.toks, W:ev.data.W||1000}; fileName=ev.data.name||'list.png';
        beginMapping(); return;
      }
      if(ev.data.type==='lens-done'){
        const vt=visionTokens(ev.data.resp);
        if(!vt.toks.length){ toast('لنز: متنی در تصویر یافت نشد.','warn'); return; }
        bulkVT=vt; fileName=ev.data.name||'list.png';
        beginMapping();
      }
    };
  }

  /* تولید داده شبیه‌سازی‌شده (خروجی مدل تشخیص جدول) */
  function genRows(){
    const rnd = mulberry32(Date.now()%100000|0 || 7);
    const pool = EXTRA_NAMES.slice();
    const existing = DB.members;
    const out = [];
    const n = 14;
    const dupNid = pool.length ? makeNID(rnd) : '';
    for(let i=0;i<n;i++){
      const name = pool.shift() || 'عضو جدید ' + (i+1);
      let nid = makeNID(rnd), mob = makeMobile(rnd), father = FATHERS[rnd()*FATHERS.length|0];
      if(i===3) nid = nid.slice(0,8)+'x';                        // کد ملی ناخوانا/نامعتبر
      if(i===6) mob = '0912' + String(rnd()).slice(2,7);          // موبایل ناقص
      if(i===9) nid = existing[0].nationalId;                     // تکراری با اعضای موجود
      if(i===11){ out.push({name:'عضو تکراری فایل', nationalId:dupNid, mobile:makeMobile(rnd), father}); }
      if(i===12){ nid = dupNid; }                                 // تکراری داخل فایل
      out.push({name, nationalId:nid, mobile:mob, father});
    }
    return out;
  }
  /* ── مشترک: توکن‌ها → رکوردها بر اساس ستون‌های جدول ──
     toks: [{cx,cy,h,txt}] · wordMode=true یعنی توکن‌ها کلمهٔ کامل‌اند (خروجی آنلاین) */
  function tokensToRows(toks, imgW, wordMode, colTypes){
    const rowGs=[];
    for(const t of toks.slice().sort((a,b)=>a.cy-b.cy)){
      let put=false;
      for(const g of rowGs){
        const ov=Math.min(g.maxy,t.cy+t.h/2)-Math.max(g.miny,t.cy-t.h/2);
        if(ov>Math.min(g.maxy-g.miny,t.h)*0.4){ g.toks.push(t); g.miny=Math.min(g.miny,t.cy-t.h/2); g.maxy=Math.max(g.maxy,t.cy+t.h/2); put=true; break; }
      }
      if(!put) rowGs.push({miny:t.cy-t.h/2,maxy:t.cy+t.h/2,toks:[t]});
    }
    if(!rowGs.length) return [];
    const centers=toks.map(t=>t.cx).sort((a,b)=>a-b);
    const GAP=Math.max(24,(imgW||1000)*0.045);
    const bands=[[centers[0]]];
    for(let i=1;i<centers.length;i++){
      if(centers[i]-centers[i-1]>GAP) bands.push([centers[i]]);
      else bands[bands.length-1].push(centers[i]);
    }
    /* ادغام نوارها تا دقیقاً هم‌تعداد ستون‌های الگو شود */
    bands.sort((a,b)=>(a.reduce((x,y)=>x+y,0)/a.length)-(b.reduce((x,y)=>x+y,0)/b.length));
    while(bands.length>COLS){
      let bi=0,bd=1e9;
      for(let i=1;i<bands.length;i++){
        const c0=bands[i-1].reduce((x,y)=>x+y,0)/bands[i-1].length;
        const c1=bands[i].reduce((x,y)=>x+y,0)/bands[i].length;
        if(c1-c0<bd){bd=c1-c0;bi=i-1;}
      }
      bands[bi]=bands[bi].concat(bands[bi+1]); bands.splice(bi+1,1);
    }
    const colX=bands.map(g=>g.reduce((a,b)=>a+b,0)/g.length).sort((a,b)=>b-a); /* راست‌به‌چپ */
    const out=[];
    for(const g of rowGs){
      const cells={};
      for(const t of g.toks){
        let bi=0,bd=1e9;
        for(let i=0;i<colX.length;i++){ const d=Math.abs(t.cx-colX[i]); if(d<bd){bd=d;bi=i;} }
        (cells[bi]=cells[bi]||[]).push(t);
      }
      const r={name:'',nationalId:'',mobile:'',father:''};
      for(const bi in cells){
        const field=tplMap[+bi+1]||'';
        if(!field) continue; /* ستون‌های اضافی مثل ردیف */
        const digitCol=(field==='nationalId'||field==='mobile') || (colTypes && colTypes[+bi]==='num');
        const isD=t=>/[\u06F0-\u06F9\u0660-\u06690-9]/.test(t.txt.charAt(0));
        cells[bi].sort((a,b)=>{
          if(isD(a)&&isD(b)) return a.cx-b.cx;
          if(digitCol) return a.cx-b.cx;
          return b.cx-a.cx;
        });
        let txt=cells[bi].map(t=>t.txt).join(wordMode&&!digitCol?' ':'');
        if(digitCol)
          txt=txt.replace(/[\u0660-\u0669]/g,d=>'\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'['\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(d)])
                 .replace(/[0-9]/g,d=>'\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'[d])
                 .replace(/[^\u06F0-\u06F9]/g,'');
        else if(wordMode) txt = txt.replace(/\s+/g,' ').trim();
        if(r[field]) r[field]+=' ';
        r[field]+=txt;
      }
      if(Object.keys(r).some(k=>String(r[k]).trim())) out.push(r);
    }
    return out;
  }

  /* ── پارسر آزاد: هر متنی با هر ساختاری پذیرفته می‌شود ──
     ترتیب تلاش: ۱) خطوط با جداکنندهٔ غالب (تب/چندفاصله/ویرگول/لاین)
     ۲) خطوط با فاصلهٔ تکی وقتی همهٔ خطوط هم‌ستون باشند
     ۳) بلوک‌های یکنواخت (هر L خط یک رکورد) ۴) الگوی لنگری (متن+عدد)
     ۵) هر خط یک رکورد تک‌ستونه.
     نوع هر ستون (عدد/متن) خودکار استنتاج و در ثبت نهایی اعمال می‌شود. */
  const _normDigits = s2 => String(s2).replace(/[\u0660-\u0669]/g, d => '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'['\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(d)]);
  const _isNumCell = v => { const c = String(v).replace(/[\s\-\/.،,]/g,''); return c.length>=1 && /^[\u06F0-\u06F90-9]+$/.test(c); };
  function _fitGrid(parts, k){
    return parts.map(p=>{
      if(p.length===k) return p;
      if(p.length>k){ const q=p.slice(0,k-1); q.push(p.slice(k-1).join(' ')); return q; }
      const q=p.slice(); while(q.length<k) q.push(''); return q;
    });
  }
  function textToRows(text){
    const lines = _normDigits(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!lines.length) return {toks:[], W:1000, grid:[], types:{}};

    /* ۱) جداکنندهٔ غالب: تب، چند فاصله، یا ویرگول/نقطه‌ویرگول/لاین */
    let grid = null;
    for(const re of [/\t+/, / {2,}/, /[,;|،؛]+/]){
      const parts = lines.map(l => l.split(re).map(x=>x.trim()).filter(x=>x!==''));
      const multi = parts.filter(p=>p.length>=2);
      if(multi.length >= Math.max(2, Math.ceil(lines.length*0.6))){
        const counts = {};
        parts.forEach(p=>{ if(p.length>=2) counts[p.length]=(counts[p.length]||0)+1; });
        const k = +Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
        grid = _fitGrid(parts, k);
        break;
      }
    }
    /* ۲) فاصلهٔ تکی — فقط وقتی تقریباً همهٔ خطوط دقیقاً هم‌تعداد ستون بدهند */
    if(!grid){
      const parts = lines.map(l=>l.split(' ').map(x=>x.trim()).filter(x=>x!==''));
      const counts = {};
      parts.forEach(p=>{ if(p.length>=3) counts[p.length]=(counts[p.length]||0)+1; });
      const ks = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
      if(ks.length){
        const k = +ks[0];
        const match = parts.filter(p=>p.length===k).length;
        if(match >= Math.max(2, Math.ceil(lines.length*0.8))) grid = _fitGrid(parts, k);
      }
    }
    /* ۳) بلوک‌های یکنواخت: هر L خط پشت‌سرهم یک رکورد */
    const types0 = lines.map(l=>_isNumCell(l)?'N':'T');
    if(!grid){
      let chosen = 0;
      for(let L=2; L<=Math.min(8, Math.floor(lines.length/2)); L++){
        if(lines.length % L) continue;
        const sig = types0.slice(0,L).join('');
        if(sig.indexOf('N')<0) continue;
        let okp=true;
        for(let kk=L; kk<lines.length; kk+=L){ if(types0.slice(kk,kk+L).join('')!==sig){ okp=false; break; } }
        if(okp && (!chosen || Math.abs(L-COLS)<Math.abs(chosen-COLS))) chosen=L;
      }
      if(chosen){
        grid = [];
        for(let r=0; r<lines.length; r+=chosen) grid.push(lines.slice(r, r+chosen));
      }
    }
    /* ۴) لنگری: خط متنی که بعدش عدد می‌آید = شروع رکورد جدید */
    if(!grid){
      const anchors=[];
      for(let i=0;i<lines.length-1;i++) if(types0[i]==='T' && types0[i+1]==='N') anchors.push(i);
      if(anchors.length>=2){
        const recs=[];
        for(let a=0;a<anchors.length;a++){
          const end = a+1<anchors.length ? anchors[a+1] : lines.length;
          recs.push(lines.slice(anchors[a], end));
        }
        let lead=anchors[0];
        while(lead>0 && !_isNumCell(lines[lead-1])) lead--;
        if(lead>0){
          const hdr=lines.slice(0, anchors[0]).filter(l=>!_isNumCell(l));
          if(hdr.length>1) recs.unshift(hdr);
        }
        grid = recs;
      }
    }
    /* ۵) هر خط یک رکورد تک‌ستونه */
    if(!grid) grid = lines.map(l=>[l]);

    /* هم‌اندازه‌سازی: ستون‌ها = بیشترین طول رکورد (سقف: تعداد ستون الگو)؛
       رکوردهای کوتاه‌تر با خانهٔ خالی پر می‌شوند تا داده‌ای جابه‌جا نشود */
    const maxLen = Math.max.apply(null, grid.map(r=>r.length));
    const k2 = Math.min(COLS, maxLen);
    grid = grid.map(r=>{
      let q = r;
      if(q.length>k2){ const t=q.slice(0,k2-1); t.push(q.slice(k2-1).join(' ')); q=t; }
      const p=q.slice(); while(p.length<k2) p.push(''); return p;
    });
    const types={};
    for(let c=0;c<k2;c++){
      const vals=grid.map(r=>r[c]).filter(v=>v!=='');
      const nums=vals.filter(_isNumCell).length;
      types[c] = (vals.length && nums/vals.length >= 0.6) ? 'num' : 'text';
    }
    /* نرمال‌سازی نهایی بر اساس نوع: عدد → فقط رقم؛ متن → حذف فاصله‌های اضافی */
    grid = grid.map(r=>r.map((v,c)=> types[c]==='num'
      ? String(v).replace(/[^\u06F0-\u06F90-9]/g,'')
      : String(v).replace(/\s+/g,' ').trim()));

    const step = Math.floor(900/Math.max(k2-1,1));
    const colX = ci => 950 - Math.min(ci, COLS-1)*step;
    const toks=[];
    grid.forEach((rec,ri)=>{ rec.forEach((cell,ci)=>{ if(cell!=='') toks.push({cx:colX(ci), cy:50+ri*100, h:40, txt:cell}); }); });
    return {toks, W:1000, grid, types};
  }
  function visionTokens(resp){
    const toks=[]; let W=1000;
    const ft=resp.fullTextAnnotation;
    if(!ft||!ft.pages) return {toks,W};
    for(const pg of ft.pages){
      if(pg.width) W=pg.width;
      for(const bl of (pg.blocks||[])) for(const pa of (bl.paragraphs||[])) for(const ln of (pa.lines||[])){
        for(const wd of (ln.words||[])){
          const v=wd.boundingBox&&wd.boundingBox.vertices;
          if(!v||!v.length) continue;
          const xs=v.map(q=>q.x), ys=v.map(q=>q.y);
          const x0=Math.min.apply(null,xs), x1=Math.max.apply(null,xs);
          const y0=Math.min.apply(null,ys), y1=Math.max.apply(null,ys);
          const txt=(wd.symbols||[]).map(q=>q.text).join('');
          if(!txt) continue;
          toks.push({cx:(x0+x1)/2, cy:(y0+y1)/2, h:Math.max(4,y1-y0), txt});
        }
      }
    }
    return {toks,W};
  }

  function validateRows(){
    const seen = {};
    const hasN = fieldOn('nationalId'), hasM = fieldOn('mobile'), hasName = fieldOn('name');
    counters = {total:rows.length, ok:0, err:0, dup:0};
    rows.forEach(r => {
      r._issues = [];
      if(hasN && !validNID(r.nationalId)) r._issues.push('کد ملی نامعتبر یا ناخوانا');
      if(hasM && !validMobile(r.mobile)) r._issues.push('شماره تماس نامعتبر');
      if(hasName && (!r.name || r.name.length < 3)) r._issues.push('نام ناقص');
      if(hasN && r.nationalId && DB.members.some(m => m.nationalId === r.nationalId)) r._issues.push('احتمال عضو تکراری در مؤسسه');
      if(hasN && r.nationalId && seen[r.nationalId]) r._issues.push('رکورد تکراری در همین فایل');
      if(hasN && r.nationalId) seen[r.nationalId] = true;
      r._bad = r._issues.length > 0;
      r._dup = r._issues.some(x=>x.indexOf('تکراری')>-1);
      if(r._dup) counters.dup++; else if(r._bad) counters.err++; else counters.ok++;
    });
  }

  /* گام ۲: نگاشت ستون‌ها پس از دریافت توکن‌ها از پل */
  function beginMapping(){
    setStep(2);
    body.innerHTML =
      '<div class="alert a-info" style="margin-bottom:14px"><span class="al-ic">'+icon('info',16)+'</span><div>متن دریافتی سازمان‌دهی شد؛ ساختار جدول: <b>'+faDigits(COLS)+'</b> ستون. نگاشت ستون‌ها به فیلدهای سامانه را بررسی کنید — نوع هر ستون (عدد/متن) خودکار تشخیص داده شده است.</div></div>' +
      '<div class="fields">' +
        '<div class="field"><label>نام الگو (قابل ذخیره و استفاده مجدد)</label><input id="biTplName" value="'+esc(tplName)+'"></div>' +
      '</div>' +
      '<div class="m-sec" style="margin-top:13px"><div class="m-sec-h">'+icon('filter',15)+' نگاشت ستون‌های تصویر به فیلدها</div><div class="m-sec-b"><div class="fields">' +
        Array.from({length:COLS},(_,i)=>{
          const k = i+1;
          const tt = bulkVT && bulkVT.types ? bulkVT.types[i] : '';
          const badge = tt ? '<span class="badge '+(tt==='num'?'b-blue':'b-gray')+'" style="font-size:.62rem;margin-inline-start:6px">'+(tt==='num'?'عدد':'متن')+'</span>' : '';
          return '<div class="field"><label>ستون '+faDigits(k)+badge+'</label><select data-map="'+k+'">'+FIELD_OPTS.map(o=>'<option value="'+o[0]+'"'+(tplMap[k]===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></div>';
        }).join('') +
      '</div></div></div>';
    body.querySelectorAll('[data-map]').forEach(sl => sl.onchange = ()=>{ tplMap[sl.dataset.map] = sl.value; });
    next.classList.remove('hidden');
    next.innerHTML = icon('check',14)+' شروع پردازش تصویر';
    next.onclick = ()=>{
      tplName = fieldVal('#biTplName') || 'پیش‌فرض';
      const saved = {name:tplName, map:Object.assign({},tplMap), at:J.nowIso()};
      DB.importTemplates = DB.importTemplates.filter(t=>t.name!==saved.name);
      DB.importTemplates.push(saved); saveDb();
      runProcessing();
    };
  }

  /* گام ۳: پردازش با نوار پیشرفت */
  function runProcessing(){
    setStep(3);
    body.innerHTML =
      '<div style="max-width:560px;margin:6px auto;text-align:center">' +
      '<div style="font-weight:700;margin-bottom:14px">در حال پردازش «'+esc(fileName)+'»</div>' +
      '<div class="prog"><i id="biBar"></i></div>' +
      '<div style="display:flex;justify-content:space-between;margin:10px 0 16px;font-size:.8rem;color:var(--ink-2)">' +
        '<span>پیشرفت: <b id="biPct">۰٪</b></span><span id="biBatch">دسته ۰ از ۳</span></div>' +
      '<div class="batch-log" id="biLog">> initializing…</div>' +
      '<div class="grid g-4" style="margin-top:16px">' +
        '<div class="stat"><div class="stat-top">شناسایی‌شده</div><div class="stat-val" id="biTot">۰</div></div>' +
        '<div class="stat s-lime"><div class="stat-top">موفق</div><div class="stat-val" id="biOk">۰</div></div>' +
        '<div class="stat s-red"><div class="stat-top">خطادار</div><div class="stat-val" id="biErr">۰</div></div>' +
        '<div class="stat s-amber"><div class="stat-top">تکراری</div><div class="stat-val" id="biDup">۰</div></div>' +
      '</div></div>';
    const online=!!bulkVT;
    Promise.resolve(bulkVT).then(vt=>{
      if(!vt) return genRows();
      const out=tokensToRows(vt.toks, vt.W, true, vt.types);
      if(!out.length) throw new Error('رکورد قابل استخراجی یافت نشد');
      return out;
    }).catch(err=>{
      toast('پردازش آنلاین ناموفق بود ('+err.message+') — دادهٔ نمونه نمایش داده می‌شود', 'warn');
      return genRows();
    }).then(rs=>{ rows=rs; validateRows(); startProg(online); });

    function startProg(online){
    const log = body.querySelector('#biLog');
    const steps = [
      online?'دریافت متن خام از پل Google Lens…':'آماده‌سازی دادهٔ نمونه…',
      'تشخیص ساختار جدول ('+faDigits(COLS)+' ستون)…',
      online?'سازمان‌دهی رکوردها توسط برنامه…':'اجرای شبیه‌ساز…',
      'اعمال الگوی نگاشت «'+tplName+'»…',
      'استخراج '+faDigits(rows.length)+' رکورد…',
      'اعتبارسنجی و تشخیص تکراری‌ها…',
      'آماده‌سازی پیش‌نمایش قابل ویرایش…'
    ];
    let i = 0;
    const timer = setInterval(()=>{
      if(i >= steps.length){
        clearInterval(timer);
        body.querySelector('#biBar').style.width = '100%';
        body.querySelector('#biPct').textContent = '۱۰۰٪';
        body.querySelector('#biTot').textContent = faDigits(counters.total);
        body.querySelector('#biOk').textContent = faDigits(counters.ok);
        body.querySelector('#biErr').textContent = faDigits(counters.err);
        body.querySelector('#biDup').textContent = faDigits(counters.dup);
        setTimeout(step4, 500);
        return;
      }
      const pct = Math.round((i+1)/steps.length*100);
      body.querySelector('#biBar').style.width = pct+'%';
      body.querySelector('#biPct').textContent = faDigits(pct)+'٪';
      body.querySelector('#biBatch').textContent = 'دسته '+faDigits(Math.min(3, Math.ceil((i+1)/3)))+' از ۳';
      body.querySelector('#biTot').textContent = faDigits(Math.round(counters.total*(i+1)/steps.length));
      log.innerHTML += '&gt; ' + steps[i] + '<br>'; log.scrollTop = log.scrollHeight;
      i++;
    }, 420);
    } /* پایان startProg */
  }

  /* گام ۴: پیش‌نمایش قابل ویرایش */
  function step4(){
    setStep(4);
    validateRows();
    body.innerHTML =
      '<div class="alert '+(counters.err||counters.dup?'a-warn':'a-ok')+'" style="margin-bottom:12px"><span class="al-ic">'+icon(counters.err?'warn':'check',17)+'</span><div>' +
        'نتیجه پردازش: <b>'+faDigits(counters.total)+'</b> رکورد — <b style="color:var(--green-deep)">'+faDigits(counters.ok)+'</b> معتبر، <b style="color:var(--red)">'+faDigits(counters.err)+'</b> خطادار، <b style="color:var(--amber)">'+faDigits(counters.dup)+'</b> تکراری. ' +
        'رکوردهای خطادار را اصلاح یا حذف کنید؛ فقط رکوردهای معتبر ثبت می‌شوند.</div></div>' +
      '<div class="field-row" style="justify-content:space-between;margin-bottom:10px;flex-wrap:wrap">' +
        '<label class="chk"><input type="checkbox" id="biOnlyErr"> فقط نمایش موارد مشکل‌دار</label>' +
        '<span class="badge b-gray" id="biCnt"></span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th style="min-width:170px">نام و نام خانوادگی</th><th>کد ملی</th><th>شماره تماس</th><th>نام پدر</th><th>وضعیت</th><th></th></tr></thead><tbody id="biRows"></tbody></table></div>';
    function renderRows(){
      validateRows();
      const onlyErr = body.querySelector('#biOnlyErr').checked;
      const trs = rows.map((r,ri) => {
        if(onlyErr && !r._bad) return '';
        return '<tr data-ri="'+ri+'">' +
          '<td class="c-fa-num">'+faDigits(ri+1)+'</td>' +
          '<td><input class="cell-inp" data-fl="name" value="'+esc(r.name)+'"></td>' +
          '<td><input class="cell-inp num-inp" data-fl="nationalId" value="'+esc(r.nationalId)+'"></td>' +
          '<td><input class="cell-inp num-inp" data-fl="mobile" value="'+esc(r.mobile)+'"></td>' +
          '<td><input class="cell-inp" data-fl="father" value="'+esc(r.father||'')+'"></td>' +
          '<td>'+(r._bad ? '<span class="badge b-red" data-tip="'+esc(r._issues.join(' · '))+'"><i class="bd"></i>'+(r._dup?'تکراری':'خطا')+'</span>' : '<span class="badge b-green"><i class="bd"></i>معتبر</span>')+'</td>' +
          '<td><button class="x-btn danger" data-del="'+ri+'" data-tip="حذف رکورد">'+icon('trash',14)+'</button></td></tr>';
      }).join('');
      body.querySelector('#biRows').innerHTML = trs || '<tr><td colspan="7"><div class="notif-empty">موردی نیست.</div></td></tr>';
      body.querySelector('#biCnt').innerHTML = 'معتبر برای ثبت: <b>'+faDigits(counters.ok)+'</b> از '+faDigits(counters.total);
      body.querySelectorAll('.cell-inp').forEach(inp => inp.onchange = ()=>{
        const ri = +inp.closest('tr').dataset.ri, fl = inp.dataset.fl;
        rows[ri][fl] = inp.value;
        renderRows();
      });
      body.querySelectorAll('[data-del]').forEach(b => b.onclick = ()=>{ rows.splice(+b.dataset.del,1); renderRows(); });
    }
    body.querySelector('#biOnlyErr').onchange = renderRows;
    renderRows();
    next.classList.remove('hidden');
    next.innerHTML = icon('check',14)+' تأیید و ثبت '+faDigits(counters.ok)+' عضو معتبر';
    next.onclick = ()=>{
      validateRows();
      const okRows = rows.filter(r=>!r._bad);
      if(!okRows.length){ toast('هیچ رکورد معتبری برای ثبت وجود ندارد.','err'); return; }
      step5(okRows);
    };
  }

  /* گام ۵: ثبت نهایی */
  function step5(okRows){
    setStep(5);
    const COREK = ['name','father','mobile','nationalId','birthDate'];
    okRows.forEach(r => {
      const x = {};
      Object.keys(r).forEach(k => { if(k.charAt(0)!=='_' && COREK.indexOf(k)<0) x[k] = String(r[k]||'').trim(); });
      DB.members.push({ id:uid('m'), name:(r.name||'').trim(), father:(r.father||'').trim(), mobile:(r.mobile||'').trim(),
        nationalId:(r.nationalId||'').trim(), birthDate:(r.birthDate||'').trim(), memberNo:memberNoNext(), status:'active',
        joinedAt:J.todayIso(), createdAt:J.nowIso(), x });
    });
    audit('افزودن گروهی '+faDigits(okRows.length)+' عضو از فایل «'+fileName+'» (الگوی '+tplName+')', 'bulk');
    saveDb();
    body.innerHTML =
      '<div class="alert a-ok" style="margin-bottom:14px"><span class="al-ic">'+icon('check',20)+'</span><div><b>ثبت کامل شد.</b> '+faDigits(okRows.length)+' عضو جدید به مؤسسه اضافه شد؛ '+
      faDigits(counters.total-okRows.length)+' رکورد (خطادار/تکراری) ثبت نشد.</div></div>' +
      '<div class="grid g-4">' +
        '<div class="stat s-lime"><div class="stat-top">ثبت شد</div><div class="stat-val">'+faDigits(okRows.length)+'</div></div>' +
        '<div class="stat s-red"><div class="stat-top">رد شد (خطا)</div><div class="stat-val">'+faDigits(counters.err)+'</div></div>' +
        '<div class="stat s-amber"><div class="stat-top">رد شد (تکراری)</div><div class="stat-val">'+faDigits(counters.dup)+'</div></div>' +
        '<div class="stat"><div class="stat-top">مجموع اعضا</div><div class="stat-val">'+faDigits(DB.members.length)+'</div></div>' +
      '</div>' +
      '<div class="alert a-info" style="margin-top:14px"><span class="al-ic">'+icon('shield',16)+'</span><div>طبق سیاست نگهداری اطلاعات، فایل‌های موقت پردازش حذف شدند و داده‌ای نزد سرویس خارجی باقی نمانده است.</div></div>';
    next.classList.remove('hidden');
    next.innerHTML = icon('users',14)+' مشاهده فهرست اعضا';
    next.onclick = ()=>{ h.close(); location.hash = '#/app/members'; };
    toast(faDigits(okRows.length)+' عضو به‌صورت گروهی ثبت شد.','ok');
  }

  window.addEventListener('message', ev=>{ if(lensHandler) lensHandler(ev); });

  step1();
}

/* ═══════════ ورود / بازیابی رمز ═══════════ */
function bindLogin(){
  const form = $('#loginForm');
  if(!form || form.dataset.newLoginBound) return;
  form.dataset.newLoginBound = '1';

  // تبدیل ارقام فارسی به انگلیسی
  function toEn(s){ return String(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }

  const eyeBtn = $('#btnEye');
  if(eyeBtn) eyeBtn.addEventListener('click', ()=>{
    const p = $('#lgPass');
    p.type = p.type === 'password' ? 'text' : 'password';
  });
  const forgot = $('#lnkForgot');
  if(forgot) forgot.addEventListener('click', e => {
    e.preventDefault();
    openModal({ size:'sm', title:'بازیابی رمز عبور',
      body:'<div class="fields" style="grid-template-columns:1fr">' +
        '<div class="field"><label>شماره تماس یا کد ملی</label><input id="fgUser" placeholder="0912… یا کد ملی"><span class="err-msg"></span>' +
        '<span class="help">در نسخه کامل، کد بازیابی پیامک می‌شود. (دمو: رمز = کد ملی)</span></div></div>',
      foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="fgSend">'+icon('send',14)+' ارسال کد بازیابی</button>',
      onOpen(h){ h.el.querySelector('[data-x]').onclick = ()=>h.close();
        h.el.querySelector('#fgSend').onclick = ()=>{
          const v = fieldVal('#fgUser');
          if(v.length < 3){ markErr($('#fgUser'),'شماره تماس یا کد ملی را وارد کنید.'); return; }
          h.close(); toast('اگر این حساب وجود داشته باشد، لینک بازیابی ارسال شد. (دمو: رمز = کد ملی)','ok');
        }; } });
  });

  // تغییر placeholder به شماره تماس/کد ملی
  const userInp = $('#lgUser'), passInp = $('#lgPass');
  if(userInp){ userInp.placeholder = 'شماره تماس (مثلاً 09121234567)'; }
  if(passInp){ passInp.placeholder = 'کد ملی (10 رقم)'; }
  const hint = document.querySelector('.login-hint');
  if(hint){
    hint.innerHTML = '<b>راهنما:</b> نام کاربری = شماره تماس (مثلاً 09121234567)، رمز = کد ملی (10 رقم)<br>' +
      '<small>حساب‌های قدیمی: admin / 1234 همچنان کار می‌کند</small>';
  }

  // دکمه افتتاح حساب در فرم ورود - با onclick مستقیم تا همیشه کار کند
  if(!document.getElementById('btnOpenAccount')){
    const loginBtn = $('#btnLogin');
    if(loginBtn && loginBtn.parentNode){
      const openBtn = document.createElement('button');
      openBtn.id = 'btnOpenAccount';
      openBtn.type = 'button';
      openBtn.className = 'btn btn-ghost';
      openBtn.style.cssText = 'width:100%;justify-content:center;margin-top:12px';
      openBtn.innerHTML = icon('plus',14) + ' افتتاح حساب جدید';
      openBtn.onclick = function(e){
        e.preventDefault(); e.stopPropagation();
        try { location.hash = '#/onboarding'; } catch(_){}
        setTimeout(()=>{ if(typeof window.renderOnboarding==='function') window.renderOnboarding(); else if(typeof renderOnboarding==='function') renderOnboarding(); }, 50);
      };
      loginBtn.parentNode.appendChild(openBtn);
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const rawU = toEn(fieldVal('#lgUser').trim());
    const rawP = toEn($('#lgPass').value.trim());
    const alertBox = $('#loginAlert');
    clearErr($('#lgUser')); clearErr($('#lgPass'));
    alertBox.innerHTML = '';
    let bad = false;
    if(!rawU){ markErr($('#lgUser'),'شماره تماس را وارد کنید.'); bad = true; }
    if(!rawP){ markErr($('#lgPass'),'کد ملی را وارد کنید.'); bad = true; }
    else if(rawP.length < 4){ markErr($('#lgPass'),'رمز باید حداقل ۴ کاراکتر باشد.'); bad = true; }
    if(bad){
      alertBox.innerHTML = '<div class="alert a-err shake"><span class="al-ic">'+icon('warn',17)+'</span><div><b>اطلاعات ناقص است.</b> لطفاً فیلدهای مشخص‌شده را تکمیل کنید.</div></div>';
      return;
    }
    const btn = $('#btnLogin'), txt = $('#btnLoginTxt');
    btn.disabled = true; txt.textContent = 'در حال ورود…';

    // ۱) اگر حالت سرور فعال است، اول به API بزن — '' هم معتبر است
    try {
      if(typeof SRV !== 'undefined' && typeof SRV.base === 'string' && typeof srvFetch === 'function'){
        const j = await srvFetch('POST','/api/auth/login',{email:rawU, password:rawP});
        SRV.token = j.token; SRV.user = j.user;
        // مؤسسه‌های کاربر را بگیر
        try {
          const me = await srvFetch('GET','/api/auth/me');
          if(me.institutions && me.institutions[0]){
            SRV.instId = me.institutions[0].id;
            SRV.instName = me.institutions[0].name;
            SRV.on = true;
          }
        } catch(_){}
        srvSave();
        // SESSION را هم بساز برای سازگاری
        SESSION = { username:j.user.phone||rawU, name:j.user.name, role:(j.user.roleType==='manager'?'admin':'viewer'), roleType:j.user.roleType||j.user.role_type||'user' };
        try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){}
        alertBox.innerHTML = '<div class="alert a-ok"><span class="al-ic">'+icon('check',17)+'</span><div><b>ورود موفق (سرور).</b> در حال انتقال…</div></div>';
        toast('خوش آمدید '+j.user.name+' 🌿','ok');
        setTimeout(()=>{ location.hash = '#/app/dashboard'; }, 500);
        return;
      }
    } catch(err){
      // اگر خطای شبکه نیست، پیام را نشان بده و ادامه نده
      if(err && err.status===401){
        btn.disabled = false; txt.textContent = 'ورود به سامانه';
        alertBox.innerHTML = '<div class="alert a-err shake"><span class="al-ic">'+icon('warn',17)+'</span><div><b>ورود ناموفق.</b> '+esc(err.message)+'</div></div>';
        return;
      }
      // خطای شبکه → به دمو می‌افتد
    }

    // ۲) حالت دمو: جستجو بر اساس شماره تماس / کدملی / نام کاربری قدیمی
    setTimeout(()=>{
      let user = DB.users.find(x => (x.username===rawU || x.mobile===rawU || x.phone===rawU || x.nationalId===rawU || x.nid===rawU) && x.status==='active');
      // اگر پیدا نشد، با rawU به عنوان phone/nid بگرد
      if(!user){
        user = DB.users.find(x => (x.username===rawU || toEn(x.mobile)===rawU || toEn(x.nationalId||'')===rawU) && x.status==='active');
      }
      const passOk = user && (rawP==='1234' || toEn(user.nationalId||'')===rawP || toEn(user.nid||'')===rawP || rawP===user.username || (user.password && user.password===rawP) || (user._customPass && user.password===rawP));
      if(!user || !passOk){
        btn.disabled = false; txt.textContent = 'ورود به سامانه';
        alertBox.innerHTML = '<div class="alert a-err shake"><span class="al-ic">'+icon('warn',17)+'</span><div><b>ورود ناموفق.</b> شماره تماس یا کد ملی اشتباه است. (دمو: رمز = کد ملی یا 1234)</div></div>';
        return;
      }
      user.lastLogin = J.nowIso();
      SESSION = { username:user.username, name:user.name, role:user.role, roleType:user.roleType|| (user.role==='admin'?'manager':'user') };
      if($('#lgRemember').checked){ try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){} }
      else { try{ localStorage.removeItem(SES_KEY); sessionStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){} }
      saveDb();
      alertBox.innerHTML = '<div class="alert a-ok"><span class="al-ic">'+icon('check',17)+'</span><div><b>ورود موفق.</b> در حال انتقال به داشبورد…</div></div>';
      toast('خوش آمدید '+user.name+' 🌿','ok');
      setTimeout(()=>{ location.hash = '#/app/dashboard'; }, 500);
    }, 400);
  });
}
function logout(){
  SESSION = null;
  try{ localStorage.removeItem(SES_KEY); sessionStorage.removeItem(SES_KEY); }catch(e){}
  location.hash = '#/';
  toast('از سامانه خارج شدید.','warn');
}

/* ═══════════ راه‌اندازی ═══════════ */
(function boot(){
  DB = loadDb();
  try{
    const s = localStorage.getItem(SES_KEY) || sessionStorage.getItem(SES_KEY);
    if(s){ const o = JSON.parse(s); if(o && o.username && DB.users.some(u=>u.username===o.username && u.status==='active')) SESSION = o; }
  }catch(e){}

  bindLogin();
  bindQuickSearch();
  bindDrop('#btnNotif', '#notifPanel');
  bindDrop('#btnProfile', '#profPanel');

  const profPanel = $('#profPanel');
  function renderProfPanel(){
    profPanel.innerHTML =
      '<div class="dp-h">'+esc(SESSION?SESSION.name:'')+'<span class="badge b-lime">'+esc(SESSION?ROLE_FA[SESSION.role]:'')+'</span></div>' +
      '<button class="dp-item" data-act="settings">'+icon('gear',16)+' تنظیمات</button>' +
      '<button class="dp-item" data-act="dash">'+icon('dash',16)+' داشبورد</button>' +
      '<div class="dp-sep"></div>' +
      '<button class="dp-item danger" data-act="logout">'+icon('logout',16)+' خروج از سامانه</button>';
    profPanel.querySelector('[data-act="settings"]').onclick = ()=>{ location.hash='#/app/settings'; closeDrops(); };
    profPanel.querySelector('[data-act="dash"]').onclick = ()=>{ location.hash='#/app/dashboard'; closeDrops(); };
    profPanel.querySelector('[data-act="logout"]').onclick = ()=>{ closeDrops(); logout(); };
  }
  function closeDrops(){ $$('.drop.open').forEach(d=>d.classList.remove('open')); }
  $('#btnProfile').addEventListener('click', renderProfPanel);

  /* سایدبار: جمع‌کردن، موبایل، خروج */
  const sb = $('#sidebar');
  try{ if(localStorage.getItem('hesabat-sb')==='1') sb.classList.add('collapsed'); }catch(e){}
  $('#btnSbCollapse').onclick = ()=>{ sb.classList.toggle('collapsed'); try{ localStorage.setItem('hesabat-sb', sb.classList.contains('collapsed')?'1':'0'); }catch(e){} };
  $('#btnSbLogout').onclick = ()=> logout();
  $('#btnHamb').onclick = ()=> document.body.classList.toggle('sb-open');
  $('#sbBackdrop').onclick = ()=> document.body.classList.remove('sb-open');

  route();
})();
