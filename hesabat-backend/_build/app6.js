/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۶: وام‌ها، اقساط و پرداخت‌ها، تراکنش‌ها
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════ وام‌ها ═══════════ */
const loansState = { q:'', fund:'all', status:'all', min:'', max:'', from:'', to:'', page:1, per:10 };
PAGES.loans = function(arg){ if(arg){ loanDetail(arg); return; } renderLoans(); };

function renderLoans(){
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>وام‌ها</h1><div class="ph-sub">'+faDigits(DB.loans.length)+' وام ثبت‌شده · '+faDigits(DB.loans.filter(l=>l.status==='active').length)+' فعال</div></div>' +
    '<div class="ph-actions"><button class="btn btn-solid btn-sm" id="btnAddLoan" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' ثبت وام جدید</button></div></div>' +
    '<div class="toolbar">' +
      '<div class="t-search">'+icon('search',15)+'<input id="lQ" placeholder="جستجو: نام عضو، کد ملی، موبایل، شماره عضویت…" value="'+esc(loansState.q)+'"></div>' +
      '<button class="btn btn-ghost btn-sm" id="lReset" style="margin-inline-start:auto">'+icon('refresh',13)+' حذف فیلتر</button>' +
    '</div>' +
    '<div class="card tight" id="lTblWrap"></div>';
  $('#btnAddLoan').onclick = ()=> guard('loanAdd', ()=> loanForm());
  $('#lQ').addEventListener('input', e => { loansState.q = e.target.value; loansState.page=1; renderLoansTable(); });
  $('#lReset').onclick = ()=>{ loansState.q=''; loansState.page=1; renderLoans(); };
  renderLoansTable();
}
function filteredLoans(){
  let list = DB.loans.slice();
  const q = loansState.q.trim(), qe = faToEn(q);
  if(q) list = list.filter(l => { const m = qMember(l.memberId);
    return m && (m.name.includes(q) || m.nationalId.includes(qe) || m.mobile.includes(qe) || m.memberNo.toLowerCase().includes(q.toLowerCase())); });
  return list.sort((a,b)=>(b.requestDate||'').localeCompare(a.requestDate||''));
}
function renderLoansTable(){
  const list = filteredLoans(), wrap = $('#lTblWrap');
  const per = loansState.per, pages = Math.max(1, Math.ceil(list.length/per));
  loansState.page = clampNum(loansState.page,1,pages);
  const rows = list.slice((loansState.page-1)*per, loansState.page*per);
  if(!list.length){ wrap.innerHTML = emptyState({icon:'loan', title:'وامی با این فیلترها پیدا نشد', desc:'فیلترها را تغییر دهید یا وام جدیدی ثبت کنید.',
    action:'<button class="btn btn-solid btn-sm" onclick="guard(\'loanAdd\',()=>loanForm())">'+icon('plus',14)+' ثبت وام</button>'}); return; }
  wrap.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>عضو</th><th>مبلغ اصل وام</th><th>صندوق</th><th>اقساط</th><th>پرداخت‌شده</th><th>مانده بدهی</th><th>وضعیت</th><th>تاریخ درخواست</th><th></th></tr></thead><tbody>' +
    rows.map(l => { const m = qMember(l.memberId), paidS = loanPaidSum(l), bal = loanBalance(l);
      return '<tr><td><div class="cell-main"><span class="avatar sz-34 teal">'+esc((m?m.name:'؟').charAt(0))+'</span><span class="cm-t"><b>'+esc(m?m.name:'—')+'</b><span>'+esc((m?m.memberNo:''))+'</span></span></div></td>' +
      '<td class="c-fa-num c-strong">'+fmtM(l.amount)+'</td><td>'+esc((qFund(l.fundId)||{}).name||'—')+'</td>' +
      '<td class="c-fa-num">'+faDigits(l.months)+'</td>' +
      '<td class="c-fa-num">'+fmtN(paidS)+'</td>' +
      '<td class="c-fa-num'+(bal?'" style="color:var(--red)':'')+'">'+fmtN(bal)+'</td>' +
      '<td>'+loanBadge(l.status)+'</td><td class="c-fa-num">'+J.fmt(l.requestDate)+'</td>' +
      '<td style="text-align:left"><a class="btn btn-soft btn-sm" href="#/app/loans/'+l.id+'">جزئیات '+icon('chevS',11)+'</a></td></tr>'; }).join('') +
    '</tbody></table></div>' +
    '<div class="tbl-foot"><span class="tf-info">'+faDigits(list.length)+' وام · صفحه '+faDigits(loansState.page)+' از '+faDigits(pages)+'</span>'+pagerHtml(loansState.page, list.length, per)+'</div>';
  wrap.querySelectorAll('[data-pg]').forEach(b => b.onclick = ()=>{ loansState.page = +b.dataset.pg; renderLoansTable(); });
}
SHORTCUTS.loanAdd = ()=> loanForm();

/* فرم ثبت وام — دراور چندبخشی طبق فیلدهای 7.6 */
function loanForm(preset, presetMemberId){
  if(!DB.members.filter(m=>m.status==='active').length){ toast('ابتدا حداقل یک عضو فعال ثبت کنید.','warn'); return; }
  const today = J.todayIso();
  const ld = DB.settings.loanDefaults || {}; /* پیش‌فرض‌های وام از تنظیمات */
  const body =
    '<div class="m-sec"><div class="m-sec-h"><span class="sn">۱</span> عضو و صندوق</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>عضو <span class="req">*</span></label><select id="lfMember">' +
        '<option value="">— انتخاب عضو —</option>' + DB.members.filter(m=>m.status==='active').map(m=>'<option value="'+m.id+'"'+(presetMemberId===m.id?' selected':'')+'>'+esc(m.name)+'</option>').join('') + '</select><span class="err-msg"></span></div>' +
      '<div class="field"><label>صندوق <span class="req">*</span></label><select id="lfFund">' + DB.funds.filter(f=>f.status==='active').map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('') + '</select><span class="err-msg"></span></div>' +
      '<div class="field full"><label>حساب پرداخت/دریافت</label><select id="lfAcc"></select><span class="help">برای پرداخت اصل وام و دریافت اقساط</span></div>' +
    '</div></div></div>' +

    '<div class="m-sec"><div class="m-sec-h"><span class="sn">۲</span> مبلغ و تاریخ‌ها</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>مبلغ اصل وام <small>('+CUR()+')</small> <span class="req">*</span></label><input id="lfAmt" class="num-inp"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نرخ / کارمزد سالانه <small>(٪)</small></label><input id="lfRate" class="num-inp" value="'+esc(String(ld.rate!==undefined?ld.rate:4))+'"></div>' +
      '<div class="field"><label>تاریخ درخواست</label><input id="lfReq"></div>' +
      '<div class="field"><label>تاریخ تصویب</label><input id="lfApp"></div>' +
      '<div class="field"><label>تاریخ پرداخت</label><input id="lfPay"></div>' +
      '<div class="field"><label>وضعیت وام</label><select id="lfStatus"><option value="pending">در انتظار تصویب</option><option value="active" selected>فعال (تصویب‌شده)</option></select></div>' +
    '</div></div></div>' +

    '<div class="m-sec"><div class="m-sec-h"><span class="sn">۳</span> برنامه اقساط</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>تعداد اقساط <span class="req">*</span></label><input id="lfMonths" type="number" min="1" max="120" value="'+esc(String(ld.months||12))+'" placeholder="مثلاً 12"><span class="help">متغیر - 1 تا 120</span></div>' +
      '<div class="field"><label>فاصله / دوره اقساط</label><select id="lfInt"><option value="1"'+((ld.interval||1)==1?' selected':'')+'>ماهانه</option><option value="2"'+((ld.interval||1)==2?' selected':'')+'>دوماه یک‌بار</option><option value="3"'+((ld.interval||1)==3?' selected':'')+'>سه‌ماه یک‌بار</option></select></div>' +
      '<div class="field"><label>تاریخ اولین سررسید <span class="req">*</span></label><input id="lfFirst"><span class="err-msg"></span></div>' +
      '<div class="field"><label>مبلغ هر قسط <small>('+CUR()+')</small></label><input id="lfPer" class="num-inp"><span class="help">با تغییر مبلغ/تعداد، به‌صورت خودکار پیشنهاد می‌شود</span></div>' +
      '<div class="field full"><label>ضامن / ضامنین <small>(در صورت نیاز)</small></label><input id="lfGuar" placeholder="مثلاً: یک ضامن کارمند رسمی"></div>' +
      '<div class="field full"><label>توضیحات</label><textarea id="lfNotes"></textarea></div>' +
    '</div>' +
    '<div class="card-b" style="border-top:1px dashed var(--line);background:var(--card-2)"><div id="lfSum"></div></div></div></div>';

  const foot = '<span class="grow" style="font-size:.8rem;color:var(--ink-2)">پس از ذخیره، برنامه اقساط ساخته می‌شود.</span>' +
    '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="lfSave">'+icon('check',14)+' ذخیره وام</button>';

  const drawerWrap = document.createElement('div');
  drawerWrap.className = 'drawer-wrap';
  drawerWrap.innerHTML = '<div class="m-drawer" role="dialog" aria-modal="true">' +
    '<div class="m-head"><h3>ثبت وام جدید<span class="m-sub">فرم چندبخشی — عضو، مبلغ، برنامه اقساط</span></h3>' +
    '<button class="x-btn" data-close aria-label="بستن">'+icon('x',15)+'</button></div>' +
    '<div class="m-body">'+body+'</div><div class="m-foot">'+foot+'</div></div>';
  document.getElementById('modalRoot').appendChild(drawerWrap);
  document.body.style.overflow = 'hidden';
  const h = { el: drawerWrap, close(){ drawerWrap.remove(); document.body.style.overflow = _modalStack.length?'hidden':''; } };
  drawerWrap.addEventListener('mousedown', e => { if(e.target === drawerWrap) h.close(); });
  drawerWrap.querySelector('[data-close]').onclick = ()=>h.close();
  drawerWrap.querySelector('[data-x]').onclick = ()=>h.close();

  const el = id => drawerWrap.querySelector(id);
  attachMoney(el('#lfAmt')); attachMoney(el('#lfPer')); attachMoney(el('#lfRate'));
  ['#lfReq','#lfApp','#lfPay','#lfFirst'].forEach(s => attachJDate(el(s)));
  setJd(el('#lfReq'), today);

  function fillAccs(){
    const f = el('#lfFund').value;
    el('#lfAcc').innerHTML = DB.accounts.filter(a=>a.fundId===f && a.status==='active').map(a=>'<option value="'+a.id+'">'+esc(a.name)+' ('+esc(a.number)+')</option>').join('') || '<option value="">حساب فعالی نیست</option>';
  }
  el('#lfFund').addEventListener('change', fillAccs); fillAccs();
  function suggest(){
    const amt = moneyVal(el('#lfAmt')), months = +el('#lfMonths').value, rate = parseFloat(faToEn(el('#lfRate').value))||0;
    if(amt > 0){ const per = Math.ceil(amt*(1+rate/100)/months/10000)*10000; setMoney(el('#lfPer'), per); }
    updateSum();
  }
  function updateSum(){
    const amt = moneyVal(el('#lfAmt')), per = moneyVal(el('#lfPer')), months = +el('#lfMonths').value;
    el('#lfSum').innerHTML =
      '<div class="sum-line"><span>مبلغ اصل وام</span><b>'+fmtM(amt||0)+'</b></div>' +
      '<div class="sum-line"><span>مبلغ هر قسط × '+faDigits(months)+' قسط</span><b>'+fmtM(per*months)+'</b></div>' +
      '<div class="sum-line"><span>مجموع کارمزد تقریبی</span><b style="color:var(--amber)">'+fmtM(Math.max(0, per*months - (amt||0)))+'</b></div>';
  }
  el('#lfAmt').addEventListener('input', suggest);
  el('#lfMonths').addEventListener('input', suggest);
  el('#lfMonths').addEventListener('change', suggest);
  el('#lfRate').addEventListener('input', suggest);
  el('#lfPer').addEventListener('input', updateSum);
  el('#lfPay').addEventListener('change', ()=>{
    const iso = jdVal(el('#lfPay'));
    if(iso && !jdVal(el('#lfFirst'))){ const j = J.iso2j(iso); const a = J.addMonths(j.jy,j.jm,j.jd,1); setJd(el('#lfFirst'), J.j2iso(a.jy,a.jm,a.jd)); }
  });

  el('#lfSave').onclick = ()=>{
    const memberId = el('#lfMember').value, fundId = el('#lfFund').value, accId = el('#lfAcc').value;
    const amt = moneyVal(el('#lfAmt')), months = +el('#lfMonths').value, intM = +el('#lfInt').value;
    let okf = true;
    const need = (cond, inp, msg) => { if(cond) clearErr(inp); else { markErr(inp,msg); okf = false; } };
    need(memberId, el('#lfMember'), 'عضو را انتخاب کنید.');
    need(amt > 0, el('#lfAmt'), 'مبلغ وام را وارد کنید.');
    need(!!jdVal(el('#lfFirst')), el('#lfFirst'), 'تاریخ اولین سررسید الزامی است.');
    if(!okf){ toast('برخی فیلدها ناقص است.','err'); return; }
    const status = el('#lfStatus').value;
    const payIso = jdVal(el('#lfPay'));
    const loan = {
      id: uid('l'), memberId, fundId, accountId: accId || null,
      amount: amt, rate: parseFloat(faToEn(el('#lfRate').value))||0, months, intervalMonths:intM,
      installmentAmount: moneyVal(el('#lfPer')) || Math.ceil(amt/months/10000)*10000,
      requestDate: jdVal(el('#lfReq')) || today, approveDate: jdVal(el('#lfApp')), payDate: payIso,
      firstDue: jdVal(el('#lfFirst')), guarantors: fieldVal(el('#lfGuar')) || 'بدون ضامن',
      status, notes: fieldVal(el('#lfNotes')), createdAt: J.nowIso()
    };
    DB.counters.loan++;
    DB.loans.push(loan);
    const member = qMember(memberId);
    if(status === 'active' && loan.firstDue){
      buildSchedule(loan);
      if(payIso && accId){
        const acc = qAccount(accId);
        DB.txns.push({id:uid('tx'), accountId:accId, type:'withdraw', amount:amt, at:payIso+' 10:00',
          ref:'PAY-'+loan.id.toUpperCase(), tracking:'', notes:'پرداخت اصل وام به '+member.name, user:SESSION.name});
        acc.balance -= amt;
      }
    }
    audit('ثبت وام '+fmtM(amt)+' برای '+member.name, 'loan:'+loan.id);
    saveDb(); toast('وام با موفقیت ثبت شد.','ok'); h.close();
    location.hash = '#/app/loans/' + loan.id;
  };
}
function buildSchedule(loan){
  const fd = J.iso2j(loan.firstDue);
  const existing = loanInstallments(loan.id).length;
  for(let k = existing; k < loan.months; k++){
    const d = J.addMonths(fd.jy, fd.jm, fd.jd, k * loan.intervalMonths);
    DB.installments.push({ id: uid('ins'), loanId: loan.id, no: k+1, dueDate: J.j2iso(d.jy,d.jm,d.jd),
      amount: loan.installmentAmount, paidAmount: 0, paidDate: '' });
  }
}

/* جزئیات وام */
function loanDetail(id){
  const l = qLoan(id), main = $('#main');
  if(!l){ main.innerHTML = emptyState({icon:'warn', title:'وام پیدا نشد', action:'<a class="btn btn-soft btn-sm" href="#/app/loans">بازگشت</a>'}); return; }
  const m = qMember(l.memberId), f = qFund(l.fundId);
  const ins = loanInstallments(l.id), pays = loanPayments(l.id);
  const paidS = loanPaidSum(l), bal = loanBalance(l);
  const acts = DB.audit.filter(a => a.target === 'loan:'+l.id);
  const nextIns = ins.find(i => i.paidAmount < i.amount);
  main.innerHTML =
    '<div class="page-head"><div><a href="#/app/loans" class="login-back" style="margin-bottom:6px">'+icon('arrowL',14)+' فهرست وام‌ها</a>' +
      '<h1>وام '+esc(m?m.name:'—')+'</h1><div class="ph-sub">'+loanBadge(l.status)+' &nbsp; ثبت در '+J.fmt(l.createdAt)+'</div></div>' +
      '<div class="ph-actions">' +
        (l.status==='pending' ? '<button class="btn btn-solid btn-sm" id="ldActivate" style="padding:11px 17px;font-size:.88rem">'+icon('check',15)+' تصویب و فعال‌سازی</button>' : '') +
        (l.status==='active' ? '<button class="btn btn-solid btn-sm" id="ldPay" style="padding:11px 17px;font-size:.88rem">'+icon('coins',15)+' ثبت پرداخت</button>' +
          '<button class="btn btn-danger btn-sm" id="ldCancel" style="padding:11px 17px;font-size:.88rem">'+icon('ban',15)+' لغو وام</button>' : '') +
      '</div></div>' +

    '<div class="grid g-4">' +
      '<div class="stat"><div class="stat-top"><span class="s-ic">'+icon('loan',15)+'</span>مبلغ اصل وام</div><div class="stat-val">'+fmtM(l.amount)+'</div><div class="stat-sub">کارمزد '+faDigits(l.rate)+'٪ · '+faDigits(l.months)+' قسط</div></div>' +
      '<div class="stat s-lime"><div class="stat-top"><span class="s-ic">'+icon('check',15)+'</span>مجموع پرداخت‌شده</div><div class="stat-val">'+fmtMShort(paidS)+' <small>'+CUR()+'</small></div><div class="stat-sub">'+faDigits(ins.filter(i=>i.paidAmount>=i.amount).length)+' قسط کامل</div></div>' +
      '<div class="stat s-red"><div class="stat-top"><span class="s-ic">'+icon('warn',15)+'</span>مانده بدهی</div><div class="stat-val">'+fmtMShort(bal)+' <small>'+CUR()+'</small></div><div class="stat-sub">'+faDigits(ins.filter(i=>i.paidAmount<i.amount).length)+' قسط باقی‌مانده</div></div>' +
      '<div class="stat s-teal"><div class="stat-top"><span class="s-ic">'+icon('clock',15)+'</span>قسط بعدی</div><div class="stat-val">'+(nextIns?J.fmt(nextIns.dueDate):'—')+'</div><div class="stat-sub">'+(nextIns?'قسط '+faDigits(nextIns.no)+' · '+fmtN(nextIns.amount-nextIns.paidAmount)+' '+CUR():'تسویه کامل')+'</div></div>' +
    '</div>' +

    '<div class="grid g-2" style="margin-top:14px">' +
      '<div class="card"><div class="card-h"><h3>خلاصه وام</h3></div><div class="card-b"><div class="kv-grid" style="grid-template-columns:1fr">' +
        kv('عضو', (m?m.name:'—') + ' (' + (m?m.memberNo:'') + ')') + kv('صندوق', (f?f.name:'—')) +
        kv('حساب مرتبط', l.accountId ? ((qAccount(l.accountId)||{}).name||'—') : '—') +
        kv('تاریخ درخواست', J.fmtLong(l.requestDate)) + kv('تاریخ تصویب', l.approveDate?J.fmtLong(l.approveDate):'—') +
        kv('تاریخ پرداخت', l.payDate?J.fmtLong(l.payDate):'—') + kv('دوره اقساط', l.intervalMonths===1?'ماهانه':'هر '+faDigits(l.intervalMonths)+' ماه') +
        kv('اولین سررسید', l.firstDue?J.fmtLong(l.firstDue):'—') + kv('مبلغ هر قسط', fmtM(l.installmentAmount)) +
        kv('ضامنین', l.guarantors || '—') + (l.notes ? kv('توضیحات', l.notes) : '') +
      '</div></div></div>' +
      '<div class="card tight"><div class="card-h"><h3>پرداخت‌های انجام‌شده</h3><span class="hint-t">'+faDigits(pays.length)+' پرداخت</span></div><div class="card-b">' +
        (pays.length ? '<div class="mini-list">' + pays.map(p => { const insX = DB.installments.find(i=>i.id===p.installmentId);
          return '<div class="mini-item"><span class="avatar sz-34" style="border-radius:11px">'+icon('coins',15)+'</span>' +
          '<span class="mi-t"><b>قسط '+faDigits(insX?insX.no:'—')+' — '+esc(p.method)+'</b><span>'+J.fmt(p.date)+' · مرجع '+esc(p.ref)+'</span></span>' +
          '<span class="mi-v pos">+ '+fmtN(p.amount)+'</span></div>'; }).join('') + '</div>'
        : emptyState({icon:'coins', title:'هنوز پرداختی ثبت نشده'})) + '</div></div>' +
    '</div>' +

    '<div class="card tight" style="margin-top:14px"><div class="card-h"><h3>برنامه اقساط</h3><span class="hint-t">'+faDigits(ins.length)+' قسط</span></div>' +
      (ins.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>قسط</th><th>سررسید</th><th>مبلغ</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th style="text-align:left">عملیات</th></tr></thead><tbody>' +
        ins.map(i => { const st = insStatus(i);
          return '<tr><td class="c-fa-num c-strong">'+faDigits(i.no)+'</td><td class="c-fa-num">'+J.fmt(i.dueDate)+'</td>' +
          '<td class="c-fa-num">'+fmtN(i.amount)+'</td><td class="c-fa-num">'+fmtN(i.paidAmount)+'</td><td class="c-fa-num">'+fmtN(i.amount-i.paidAmount)+'</td>' +
          '<td>'+insBadge(st)+'</td>' +
          '<td style="text-align:left">'+(st!=='paid' && l.status==='active' ? '<button class="btn btn-soft btn-sm" data-payins="'+i.id+'">'+icon('coins',13)+' پرداخت</button>' : '—')+'</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<div class="card-b"><div class="alert a-info"><span class="al-ic">'+icon('info',16)+'</span><div>این وام هنوز فعال نشده؛ پس از تصویب و فعال‌سازی، برنامه اقساط ساخته می‌شود.</div></div></div>') + '</div>' +

    '<div class="card" style="margin-top:14px"><div class="card-h"><h3>تاریخچه عملیات</h3><span class="hint-t">لاگ ممیزی</span></div><div class="card-b">' +
      (acts.length ? '<div class="timeline">' + acts.map(a => '<div class="tl-item"><div class="tl-t">'+esc(a.action)+'</div><div class="tl-d">'+esc(a.user)+' · '+J.fmt(a.at)+faTime(a.at)+'</div></div>').join('') + '</div>'
      : '<div class="notif-empty">رویدادی در لاگ ممیزی این وام نیست.</div>') + '</div></div>';

  main.querySelectorAll('[data-payins]').forEach(b => b.onclick = ()=> guard('paymentAdd', ()=> paymentForm(l.id, b.dataset.payins)));
  const pay = $('#ldPay'); if(pay) pay.onclick = ()=> guard('paymentAdd', ()=> paymentForm(l.id));
  const act = $('#ldActivate');
  if(act) act.onclick = ()=> guard('loanAdd', async ()=>{
    const ok = await askConfirm({title:'تصویب و فعال‌سازی وام', text:'وام به مبلغ <b>'+fmtM(l.amount)+'</b> برای <b>'+esc(m.name)+'</b> تصویب و برنامه اقساط ساخته شود؟'+(l.accountId?'<br>همچنین برداشت از حساب «'+esc((qAccount(l.accountId)||{}).name||'')+'» ثبت می‌گود.':''), ok:'تصویب و فعال‌سازی'});
    if(!ok) return;
    if(!l.firstDue){ const j = J.today(); const a = J.addMonths(j.jy,j.jm,j.jd,1); l.firstDue = J.j2iso(a.jy,a.jm,a.jd); }
    if(!l.payDate) l.payDate = J.todayIso();
    if(!l.approveDate) l.approveDate = J.todayIso();
    l.status = 'active';
    buildSchedule(l);
    if(l.accountId){ const acc = qAccount(l.accountId);
      DB.txns.push({id:uid('tx'), accountId:l.accountId, type:'withdraw', amount:l.amount, at:l.payDate+' 10:00', ref:'PAY-'+l.id.toUpperCase(), tracking:'', notes:'پرداخت اصل وام به '+(m?m.name:''), user:SESSION.name});
      acc.balance -= l.amount; }
    audit('تصویب و فعال‌سازی وام '+(m?m.name:''), 'loan:'+l.id);
    saveDb(); toast('وام فعال شد و برنامه اقساط ساخته شد.','ok'); route();
  });
  const cn = $('#ldCancel');
  if(cn) cn.onclick = ()=> guard('loanAdd', async ()=>{
    const ok = await askConfirm({title:'لغو وام', danger:true, text:'آیا از لغو وام <b>'+esc(m.name)+'</b> مطمئن هستید؟<br>اقساط پرداخت‌شده و تراکنش‌ها حفظ می‌شوند.', ok:'لغو وام', note:'این عملیات قابل بازگشت نیست و در لاگ ممیزی ثبت می‌شود.'});
    if(!ok) return;
    l.status = 'cancelled';
    audit('لغو وام '+(m?m.name:''), 'loan:'+l.id);
    saveDb(); toast('وام لغو شد.','warn'); route();
  });
}

/* ═══════════ اقساط و پرداخت‌ها ═══════════ */
const insState = { status:'all', q:'', page:1, per:12 };

/* تب «اقساط و پرداخت‌ها» در صفحه ترکیبی اعضا و اقساط — فقط اقساط پرداخت‌نشده */
function renderInsTab(){
  const box = $('#mmBody');
  box.innerHTML =
    '<div class="toolbar">' +
      '<div class="t-search">'+icon('search',15)+'<input id="iQ" placeholder="جستجوی عضو…" value="'+esc(insState.q)+'"></div>' +
      '<span class="hint-t" style="font-size:.8rem;margin-inline-start:auto">فقط اقساط پرداخت‌نشده نمایش داده می‌شوند؛ اقساط این هفته و معوق‌ها همیشه در دسترس‌اند.</span>' +
    '</div>' +
    '<div class="card tight" id="iWrap"></div>';
  $('#iQ').addEventListener('input', e => { insState.q = e.target.value; insState.page=1; renderInsTable(); });
  renderInsTable();
}
function filteredIns(){
  return DB.installments
    .filter(i => { const l = qLoan(i.loanId); return l && l.status !== 'cancelled' && l.status !== 'pending'; })
    .filter(i => insStatus(i) !== 'paid')
    .filter(i => { if(!insState.q.trim()) return true; const m = qMember(qLoan(i.loanId).memberId); return m && m.name.includes(insState.q.trim()); })
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}
function renderInsTable(){
  const list = filteredIns(), wrap = $('#iWrap');
  const per = insState.per, pages = Math.max(1, Math.ceil(list.length/per));
  insState.page = clampNum(insState.page,1,pages);
  const rows = list.slice((insState.page-1)*per, insState.page*per);
  if(!list.length){ wrap.innerHTML = emptyState({icon:'check', title:'قسط پرداخت‌نشده‌ای نیست 🎉', desc:'همه اقساط سررسیدشده پاس شده‌اند. به‌محض ساخت یا سررسید قسط جدید، اینجا نمایش داده می‌شود.'}); return; }
  wrap.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>شماره قسط</th><th>وام / عضو</th><th>تاریخ سررسید</th><th>مبلغ قسط</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th style="text-align:left">عملیات</th></tr></thead><tbody>' +
    rows.map(i => { const l = qLoan(i.loanId), m = qMember(l.memberId), st = insStatus(i);
      return '<tr><td class="c-fa-num c-strong">'+faDigits(i.no)+'</td>' +
      '<td><div class="cell-main"><span class="avatar sz-34 teal">'+esc((m?m.name:'؟').charAt(0))+'</span><span class="cm-t"><b><a class="row-link" href="#/app/loans/'+l.id+'">'+esc(m?m.name:'—')+'</a></b><span>'+fmtMShort(l.amount)+' '+CUR()+' · '+faDigits(l.months)+' قسط</span></span></div></td>' +
      '<td class="c-fa-num">'+J.fmt(i.dueDate)+'</td><td class="c-fa-num">'+fmtN(i.amount)+'</td><td class="c-fa-num">'+fmtN(i.paidAmount)+'</td>' +
      '<td class="c-fa-num c-strong">'+fmtN(i.amount-i.paidAmount)+'</td><td>'+insBadge(st)+'</td>' +
      '<td style="text-align:left">'+(st!=='paid' ? '<button class="btn btn-soft btn-sm" data-pay="'+i.id+'">'+icon('coins',13)+' ثبت پرداخت</button>' : '<span class="badge b-green">'+icon('check',12)+' تسویه')+'</td></tr>'; }).join('') +
    '</tbody></table></div>' +
    '<div class="tbl-foot"><span class="tf-info">'+faDigits(list.length)+' قسط · صفحه '+faDigits(insState.page)+' از '+faDigits(pages)+'</span>'+pagerHtml(insState.page, list.length, per)+'</div>';
  wrap.querySelectorAll('[data-pg]').forEach(b => b.onclick = ()=>{ insState.page = +b.dataset.pg; renderInsTable(); });
  wrap.querySelectorAll('[data-pay]').forEach(b => b.onclick = ()=>{
    const ins = DB.installments.find(x=>x.id===b.dataset.pay);
    guard('paymentAdd', ()=> paymentForm(ins.loanId, ins.id));
  });
}
SHORTCUTS.paymentAdd = ()=> paymentForm();

/* فرم ثبت پرداخت — با تشخیص ناقص/اضافه/تکراری */
function paymentForm(presetLoanId, presetInsId){
  const activeLoans = DB.loans.filter(l => l.status === 'active');
  const accs = DB.accounts.filter(a => a.status === 'active');
  const m = openModal({
    title:'ثبت پرداخت قسط', sub:'موفق، ناقص، اضافه‌پرداخت و تکراری به‌صورت خودکار تشخیص داده می‌شود', size:'lg',
    body: '<div class="fields">' +
      '<div class="field"><label>وام <span class="req">*</span></label><select id="pfLoan"'+(presetInsId?' disabled':'')+'>' +
        '<option value="">— انتخاب وام —</option>' + activeLoans.map(l => { const mm = qMember(l.memberId); return '<option value="'+l.id+'"'+(presetLoanId===l.id?' selected':'')+'>'+esc(mm?mm.name:'—')+' — '+fmtMShort(l.amount)+' '+CUR()+'</option>'; }).join('') + '</select><span class="err-msg"></span></div>' +
      (presetInsId
        ? '<div class="field"><label>قسط انتخاب‌شده</label><div class="alert a-info" style="padding:10px 14px"><span class="al-ic">'+icon('calendar',17)+'</span><div id="pfInsInfo" style="line-height:2.1"></div></div></div>'
        : '<div class="field"><label>قسط <span class="req">*</span></label><select id="pfIns"><option value="">ابتدا وام را انتخاب کنید</option></select><span class="err-msg"></span></div>') +
      '<div class="field"><label>مبلغ پرداخت <small>('+CUR()+')</small> <span class="req">*</span></label><input id="pfAmt" class="num-inp"><span class="err-msg"></span><span class="help" id="pfRemain"></span></div>' +
      '<div class="field"><label>تاریخ پرداخت <span class="req">*</span></label><input id="pfDate"></div>' +
      '<div class="field"><label>حساب دریافت‌کننده <span class="req">*</span></label><select id="pfAcc">'+accs.map(a=>'<option value="'+a.id+'">'+esc(a.name)+' — '+esc((qFund(a.fundId)||{}).name||'')+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>روش پرداخت</label><select id="pfMethod">'+['نقدی','کارت به کارت','حواله','چک','برداشت از سپرده'].map(x=>'<option>'+x+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>شماره پیگیری / مرجع</label><input id="pfRef" class="num-inp" placeholder="مثلاً FIS-6120"></div>' +
      '<div class="field full"><label>توضیحات</label><textarea id="pfNotes" rows="2"></textarea></div>' +
      '<div class="full" id="pfWarn"></div>' +
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="pfSave">'+icon('check',14)+' ثبت پرداخت</button>',
    onOpen(hh){
      const elx = id => hh.el.querySelector(id);
      attachMoney(elx('#pfAmt')); attachJDate(elx('#pfDate')); setJd(elx('#pfDate'), J.todayIso());
      function fillIns(){
        if(presetInsId){ updateRemain(); return; }
        const lid = elx('#pfLoan').value;
        const sel = elx('#pfIns');
        if(!lid){ sel.innerHTML = '<option value="">ابتدا وام را انتخاب کنید</option>'; return; }
        const open = loanInstallments(lid).filter(i => i.paidAmount < i.amount);
        sel.innerHTML = '<option value="">— انتخاب قسط —</option>' + open.map(i => {
          const st = insStatus(i);
          return '<option value="'+i.id+'"'+(presetLoanId && !presetInsId && insStatus(i)!=='paid' && i===open[0] ?' selected':'')+'>قسط '+faDigits(i.no)+' — سررسید '+J.fmt(i.dueDate)+' — مانده '+fmtN(i.amount-i.paidAmount)+' ('+INS_FA[st]+')</option>'; }).join('');
        if(!open.length) sel.innerHTML = '<option value="">این وام قسط بازی ندارد</option>';
        updateRemain();
      }
      function curIns(){ return DB.installments.find(i => i.id === (presetInsId || (elx('#pfIns') ? elx('#pfIns').value : ''))); }
      function updateRemain(){
        const i = curIns();
        const box = elx('#pfWarn'); box.innerHTML = '';
        elx('#pfRemain').textContent = i ? 'مانده این قسط: '+fmtN(i.amount-i.paidAmount)+' '+CUR() : '';
        if(i && moneyVal(elx('#pfAmt')) === 0) setMoney(elx('#pfAmt'), i.amount - i.paidAmount);
        const amt = moneyVal(elx('#pfAmt'));
        if(i && amt > 0){
          const remain = i.amount - i.paidAmount;
          if(amt > remain){
            box.innerHTML = '<div class="alert a-warn"><span class="al-ic">'+icon('warn',17)+'</span><div><b>اضافه‌پرداخت:</b> مبلغ واردشده '+fmtN(amt-remain)+' '+CUR()+' بیشتر از مانده قسط است. مقدار اضافه به قسط بعدی منظور می‌شود.</div></div>';
          }
        }
      }
      elx('#pfLoan').addEventListener('change', fillIns);
      if(!presetInsId) elx('#pfIns').addEventListener('change', ()=>{ const i = curIns(); if(i) setMoney(elx('#pfAmt'), i.amount - i.paidAmount); updateRemain(); });
      elx('#pfAmt').addEventListener('input', updateRemain);
      fillIns();
      if(presetInsId){
        /* قسط از قبل انتخاب شده — فقط خلاصه‌اش نشان داده می‌شود */
        const insP = curIns();
        if(insP){
          const loanP = qLoan(insP.loanId), memP = qMember(loanP.memberId);
          hh.el.querySelector('#pfInsInfo').innerHTML =
            '<b>قسط '+faDigits(insP.no)+'</b> از '+faDigits(loanP.months)+' — '+esc(memP?memP.name:'—')+'<br>' +
            'سررسید: '+J.fmt(insP.dueDate)+' · مانده: <b>'+fmtN(insP.amount-insP.paidAmount)+' '+CUR()+'</b>';
          setMoney(elx('#pfAmt'), insP.amount - insP.paidAmount);
        }
        updateRemain();
      } else if(presetLoanId && moneyVal(elx('#pfAmt'))===0){
        const i = curIns(); if(i) setMoney(elx('#pfAmt'), i.amount - i.paidAmount);
        updateRemain();
      }

      hh.el.querySelector('[data-x]').onclick = ()=> hh.close();
      hh.el.querySelector('#pfSave').onclick = ()=> commitPay();

      async function commitPay(){
        const lid = elx('#pfLoan').value;
        const insId = presetInsId || (elx('#pfIns') ? elx('#pfIns').value : '');
        const amt = moneyVal(elx('#pfAmt')), dateIso = jdVal(elx('#pfDate'));
        let okf = true;
        const need = (cond, inp, msg)=>{ if(cond) clearErr(inp); else { markErr(inp,msg); okf=false; } };
        need(lid, elx('#pfLoan'), 'وام را انتخاب کنید.');
        need(insId, elx('#pfIns')||elx('#pfLoan'), 'قسط را انتخاب کنید.');
        need(amt > 0, elx('#pfAmt'), 'مبلغ پرداخت را وارد کنید.');
        need(!!dateIso, elx('#pfDate'), 'تاریخ پرداخت معتبر نیست.');
        if(!okf){ toast('برخی فیلدها ناقص است.','err'); return; }
        const ins = curIns(), loan = qLoan(lid), member = qMember(loan.memberId);
        const ref = fieldVal(elx('#pfRef'));
        /* تشخیص پرداخت تکراری */
        if(ref){
          const dup = DB.payments.find(p => p.loanId === lid && p.ref.trim() === ref.trim());
          if(dup){
            const ok = await askConfirm({title:'پرداخت تکراری', danger:true, ok:'به هر حال ثبت شود',
              text:'پرداختی با مرجع <b>'+esc(ref)+'</b> قبلاً برای همین وام ثبت شده است ('+J.fmt(dup.date)+'، '+fmtM(dup.amount)+'). ادامه می‌دهید؟'});
            if(!ok) return;
          }
        }
        const remain = ins.amount - ins.paidAmount;
        let extra = 0, applied = amt;
        if(amt > remain){ extra = amt - remain; applied = remain; }
        /* ثبت روی قسط انتخابی */
        ins.paidAmount += applied;
        if(ins.paidAmount >= ins.amount){ ins.paidAmount = ins.amount; ins.paidDate = dateIso; }
        /* اضافه‌پرداخت → قسط بعدی */
        let extraNote = '';
        if(extra > 0){
          const nexts = loanInstallments(lid).filter(i => i.paidAmount < i.amount);
          if(nexts.length){ const nx = nexts[0]; nx.paidAmount = Math.min(nx.amount, nx.paidAmount + extra); if(nx.paidAmount>=nx.amount) nx.paidDate = dateIso;
            extraNote = ' اضافه‌پرداخت به قسط '+faDigits(nx.no)+' منظور شد.'; }
          else extraNote = ' اضافه‌پرداخت به‌عنوان بستانکاری عضو نزد صندوق ماند.';
        }
        const accId = elx('#pfAcc').value;
        const acc = qAccount(accId);
        DB.payments.push({ id:uid('p'), loanId:lid, installmentId:insId, amount:amt, date:dateIso, accountId:accId,
          method:elx('#pfMethod').value, ref:ref||('FIS-'+(5000+DB.payments.length+1)), notes:fieldVal(elx('#pfNotes')), user:SESSION.name, createdAt:J.nowIso() });
        DB.txns.push({ id:uid('tx'), accountId:accId, type:'deposit', amount:amt, at:dateIso+' 12:00',
          ref:'FIS-'+(5000+DB.payments.length), tracking:'', notes:'بازپرداخت قسط '+faDigits(ins.no)+' — '+(member?member.name:''), user:SESSION.name });
        acc.balance += amt;
        audit('ثبت پرداخت '+fmtM(amt)+' قسط '+faDigits(ins.no)+' وام '+(member?member.name:''), 'loan:'+lid);
        saveDb();
        /* خلاصه وضعیت */
        const newSt = insStatus(ins);
        let kind = 'ok', msg = 'پرداخت کامل ثبت شد.';
        if(applied < amt && extra > 0){ kind = 'warn'; msg = 'اضافه‌پرداخت ثبت شد.' + extraNote; }
        else if(amt < remain){ kind = 'warn'; msg = 'پرداخت ناقص ثبت شد؛ مانده قسط '+fmtN(ins.amount-ins.paidAmount)+' '+CUR()+' باقی است.'; }
        toast(msg, kind);
        /* مُهر تأیید با رنگ انتخابی از تنظیمات */
        stampFx({ text: kind==='ok' ? 'پرداخت شد' : 'ثبت شد',
          sub: fmtM(amt)+' — '+J.fmt(dateIso),
          color: kind==='ok' ? stampColor('payment') : stampColor('member'),
          hold: 1050,
          onDone: ()=>{
            hh.close();
            if(location.hash.indexOf('#/app/loans/')===0) route(); else if(location.hash==='#/app/installments'){ renderMembersPage('ins'); renderShell('installments'); }
            else route();
          } });
      }
    }
  });
}

/* ═══════════ تراکنش‌ها ═══════════ */
const txState = { acc:'all', type:'all', from:'', to:'', min:'', max:'' };
PAGES.txns = function(){ renderReportsPage('txns'); };

/* تب «تراکنش‌ها» در صفحه ترکیبی گزارش‌ها و تراکنش‌ها */
function renderTxnsTab(){
  const box = $('#rrBody');
  box.innerHTML =
    '<div class="toolbar" style="flex-wrap:wrap">' +
      '<select class="t-select" id="tAcc"><option value="all">همه حساب‌ها</option>'+DB.accounts.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('')+'</select>' +
      '<select class="t-select" id="tType"><option value="all">واریز و برداشت</option><option value="deposit">فقط واریز</option><option value="withdraw">فقط برداشت</option></select>' +
      '<span class="t-lbl">از تاریخ</span><span class="t-jd jd"><input id="tFrom"></span>' +
      '<span class="t-lbl">تا</span><span class="t-jd jd"><input id="tTo"></span>' +
      '<span class="t-lbl">مبلغ از</span><input class="t-money" id="tMin" placeholder="0">' +
      '<span class="t-lbl">تا</span><input class="t-money" id="tMax" placeholder="∞">' +
    '</div>' +
    '<div class="card tight" id="tWrap"></div>';
  $('#tAcc').value = txState.acc; $('#tType').value = txState.type;
  attachJDate($('#tFrom')); attachJDate($('#tTo'));
  if(txState.from) setJd($('#tFrom'), txState.from);
  if(txState.to) setJd($('#tTo'), txState.to);
  attachMoney($('#tMin')); attachMoney($('#tMax'));
  if(txState.min) setMoney($('#tMin'), txState.min);
  if(txState.max) setMoney($('#tMax'), txState.max);
  $('#tAcc').addEventListener('change', e=>{ txState.acc=e.target.value; renderTxTable(); });
  $('#tType').addEventListener('change', e=>{ txState.type=e.target.value; renderTxTable(); });
  $('#tFrom').addEventListener('change', e=>{ txState.from=jdVal(e.target); renderTxTable(); });
  $('#tTo').addEventListener('change', e=>{ txState.to=jdVal(e.target); renderTxTable(); });
  $('#tMin').addEventListener('input', e=>{ txState.min=moneyVal(e.target); renderTxTable(); });
  $('#tMax').addEventListener('input', e=>{ txState.max=moneyVal(e.target); renderTxTable(); });
  renderTxTable();
}
function renderTxTable(){
  let list = DB.txns.slice();
  if(txState.acc!=='all') list = list.filter(x=>x.accountId===txState.acc);
  if(txState.type!=='all') list = list.filter(x=>x.type===txState.type);
  if(txState.from) list = list.filter(x=>x.at.slice(0,10)>=txState.from);
  if(txState.to) list = list.filter(x=>x.at.slice(0,10)<=txState.to);
  if(txState.min) list = list.filter(x=>x.amount>=txState.min);
  if(txState.max) list = list.filter(x=>x.amount<=txState.max);
  list.sort((a,b)=>b.at.localeCompare(a.at));
  const wrap = $('#tWrap');
  const inSum = list.filter(x=>x.type==='deposit').reduce((s,x)=>s+x.amount,0);
  const outSum = list.filter(x=>x.type==='withdraw').reduce((s,x)=>s+x.amount,0);
  if(!list.length){ wrap.innerHTML = emptyState({icon:'swap', title:'تراکنشی با این فیلترها نیست', desc:'بازه یا فیلترها را تغییر دهید یا تراکنش جدید ثبت کنید.',
    action:'<button class="btn btn-solid btn-sm" onclick="guard(\'txnAdd\',()=>txnForm())">'+icon('plus',14)+' ثبت تراکنش</button>'}); return; }
  wrap.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>تاریخ و زمان</th><th>حساب</th><th>نوع</th><th>مبلغ</th><th>مرجع</th><th>پیگیری</th><th>توضیحات</th><th>کاربر ثبت‌کننده</th></tr></thead><tbody>' +
    list.slice(0,80).map(x => { const a = qAccount(x.accountId), dep = x.type==='deposit';
      return '<tr><td class="c-fa-num">'+J.fmt(x.at)+faTime(x.at)+'</td><td>'+esc(a?a.name:'—')+'</td>' +
      '<td>'+(dep?'<span class="badge b-green"><i class="bd"></i>واریز</span>':'<span class="badge b-red"><i class="bd"></i>برداشت</span>')+'</td>' +
      '<td class="c-fa-num c-strong" style="color:'+(dep?'var(--green-deep)':'var(--red)')+'">'+(dep?'+':'−')+' '+fmtN(x.amount)+' <small style="color:var(--ink-2)">'+CUR()+'</small></td>' +
      '<td class="c-num">'+esc(x.ref||'—')+'</td><td class="c-num">'+esc(x.tracking||'—')+'</td>' +
      '<td style="font-size:.8rem;max-width:220px">'+esc(x.notes||'—')+'</td><td>'+esc(x.user)+'</td></tr>'; }).join('') +
    '</tbody></table></div>' +
    '<div class="tbl-foot"><span class="tf-info">'+faDigits(list.length)+' تراکنش'+(list.length>80?' (نمایش ۸۰ مورد اول)':'')+' · واریزی: <b style="color:var(--green-deep)">'+fmtN(inSum)+'</b> · برداشت: <b style="color:var(--red)">'+fmtN(outSum)+'</b> '+CUR()+'</span></div>';
}
SHORTCUTS.txnAdd = ()=> txnForm();

function txnForm(presetAccId){
  const h = openModal({
    title:'ثبت تراکنش', sub:'واریز یا برداشت روی حساب‌ها',
    body:'<div class="fields">' +
      '<div class="field"><label>حساب <span class="req">*</span></label><select id="tfAcc">'+DB.accounts.filter(a=>a.status==='active').map(a=>'<option value="'+a.id+'"'+(presetAccId===a.id?' selected':'')+'>'+esc(a.name)+' — موجودی '+fmtN(a.balance)+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>نوع تراکنش <span class="req">*</span></label><select id="tfType"><option value="deposit">واریز (افزایش موجودی)</option><option value="withdraw">برداشت (کاهش موجودی)</option></select></div>' +
      '<div class="field"><label>مبلغ <small>('+CUR()+')</small> <span class="req">*</span></label><input id="tfAmt" class="num-inp"><span class="err-msg"></span></div>' +
      '<div class="field"><label>تاریخ و زمان <span class="req">*</span></label><div class="field-row"><input id="tfDate"><input type="time" id="tfTime" value="12:00" style="width:110px"></div><span class="err-msg"></span></div>' +
      '<div class="field"><label>مرجع عملیات</label><input id="tfRef" class="num-inp" placeholder="مثلاً TRX-2100"></div>' +
      '<div class="field"><label>شماره پیگیری</label><input id="tfTrack" class="num-inp"></div>' +
      '<div class="field full"><label>توضیحات</label><textarea id="tfNotes" rows="2"></textarea></div>' +
      '<div class="full" id="tfWarn"></div>' +
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="tfSave">'+icon('check',14)+' ثبت تراکنش</button>',
    onOpen(hh){
      const elx = id => hh.el.querySelector(id);
      attachMoney(elx('#tfAmt')); attachJDate(elx('#tfDate')); setJd(elx('#tfDate'), J.todayIso());
      elx('[data-x]').onclick = ()=>hh.close();
      elx('#tfSave').onclick = async ()=>{
        const accId = elx('#tfAcc').value, type = elx('#tfType').value;
        const amt = moneyVal(elx('#tfAmt')), dateIso = jdVal(elx('#tfDate'));
        let okf = true;
        if(amt<=0){ markErr(elx('#tfAmt'),'مبلغ را وارد کنید.'); okf=false; } else clearErr(elx('#tfAmt'));
        if(!dateIso){ markErr(elx('#tfDate'),'تاریخ معتبر نیست.'); okf=false; } else clearErr(elx('#tfDate'));
        if(!okf) return;
        const acc = qAccount(accId);
        if(type==='withdraw' && amt > acc.balance){
          const ok = await askConfirm({title:'برداشت بیش از موجودی', danger:true, ok:'ثبت شود',
            text:'مبلغ برداشت '+fmtM(amt)+' بیشتر از موجودی فعلی حساب «'+esc(acc.name)+'» ('+fmtM(acc.balance)+') است. ادامه می‌دهید؟'});
          if(!ok) return;
        }
        DB.txns.push({ id:uid('tx'), accountId:accId, type, amount:amt,
          at: dateIso + ' ' + (elx('#tfTime').value || '12:00'),
          ref: fieldVal(elx('#tfRef')) || ('TRX-'+(2000+DB.txns.length+1)),
          tracking: fieldVal(elx('#tfTrack')), notes: fieldVal(elx('#tfNotes')), user: SESSION.name });
        acc.balance += type==='deposit' ? amt : -amt;
        audit('ثبت تراکنش '+(type==='deposit'?'واریز':'برداشت')+' '+fmtM(amt)+' در '+acc.name, 'account:'+accId);
        saveDb(); toast('تراکنش ثبت شد و موجودی به‌روزرسانی شد.','ok'); hh.close(); route();
      };
    }
  });
}
