/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۵: اعضا، پرونده عضو، صندوق‌ها/حساب‌ها، وام‌ها
   ═══════════════════════════════════════════════════════════════ */
const PAGES = {};
const SHORTCUTS = {};
PAGES.dashboard = pageDashboard;

/* ═══════════ اعضا ═══════════ */
const membersState = { q:'', status:'all', sort:'joined', dir:-1, page:1, per:10 };
let mmTab = 'members';
PAGES.members = function(arg){
  if(arg === 'ins'){ renderMembersPage('ins'); return; }
  if(arg){ memberProfile(arg); return; }
  renderMembersPage(mmTab);
};
PAGES.installments = function(){ renderMembersPage('ins'); };

/* صفحه ترکیبی «اعضا و اقساط» با دو تب */
function renderMembersPage(tab){
  mmTab = (tab === 'ins') ? 'ins' : 'members';
  const main = $('#main');
  const od = overdueCount();
  main.innerHTML =
    '<div class="page-head"><div><h1>اعضا و اقساط</h1><div class="ph-sub">مشاهده اعضا و مدیریت اقساط و پرداخت‌ها در یک‌جا</div></div>' +
    '<div class="ph-actions" id="mmActions"></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      '<button class="tab'+(mmTab==='members'?' on':'')+'" data-mt="members">اعضا<span class="tc">'+faDigits(DB.members.length)+'</span></button>' +
      '<button class="tab'+(mmTab==='ins'?' on':'')+'" data-mt="ins">اقساط و پرداخت‌ها'+(od?'<span class="tc" style="background:var(--red-bg);color:var(--red)">'+faDigits(od)+' معوق</span>':'')+'</button>' +
    '</div></div><div id="mmBody" style="padding:16px 18px"></div></div>';
  main.querySelectorAll('[data-mt]').forEach(b => b.onclick = ()=> renderMembersPage(b.dataset.mt));
  const act = $('#mmActions');
  if(mmTab === 'members'){
    act.innerHTML =
      '<button class="btn btn-ghost btn-sm" id="btnBulk" style="padding:11px 17px;font-size:.88rem">'+icon('upload',15)+' افزودن گروهی اعضا</button>' +
      '<button class="btn btn-solid btn-sm" id="btnAddMember" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' افزودن عضو</button>';
    $('#btnAddMember').onclick = ()=> guard('memberAdd', ()=> memberForm());
    $('#btnBulk').onclick = ()=> guard('memberAdd', ()=> bulkImportWizard());
    renderMembersTab();
  } else {
    act.innerHTML = '<button class="btn btn-solid btn-sm" id="btnAddPay" style="padding:11px 17px;font-size:.88rem">'+icon('coins',15)+' ثبت پرداخت</button>';
    $('#btnAddPay').onclick = ()=> guard('paymentAdd', ()=> paymentForm());
    renderInsTab();
  }
}

function renderMembersTab(){
  const box = $('#mmBody');
  box.innerHTML =
    '<div class="toolbar">' +
      '<div class="t-search">'+icon('search',15)+'<input id="mQ" placeholder="جستجو: نام، کد ملی، موبایل، شماره عضویت…" value="'+esc(membersState.q)+'"></div>' +
      '<span class="t-lbl">وضعیت:</span><select class="t-select" id="mStatus">' +
        '<option value="all">همه</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select>' +
      '<span class="t-lbl">مرتب‌سازی:</span><select class="t-select" id="mSort">' +
        '<option value="joined">تاریخ عضویت</option><option value="name">نام</option><option value="debt">بدهی جاری</option><option value="loans">تعداد وام‌ها</option></select>' +
      '<button class="btn btn-ghost btn-sm" id="mReset" style="margin-inline-start:auto">'+icon('refresh',13)+' حذف فیلترها</button>' +
    '</div>' +
    '<div id="mIncSlot"></div>' +
    '<div class="card tight" id="mTblWrap"></div>';
  $('#mStatus').value = membersState.status; $('#mSort').value = membersState.sort;
  $('#mQ').addEventListener('input', e => { membersState.q = e.target.value; membersState.page = 1; renderMembersTable(); });
  $('#mStatus').addEventListener('change', e => { membersState.status = e.target.value; membersState.page = 1; renderMembersTable(); });
  $('#mSort').addEventListener('change', e => { membersState.sort = e.target.value; renderMembersTable(); });
  $('#mReset').onclick = ()=>{ membersState.q=''; membersState.status='all'; membersState.sort='joined'; membersState.page=1; renderMembersTab(); };
  renderMembersTable();
}
function filteredMembers(){
  let list = DB.members.slice();
  const q = faToEn(membersState.q.trim());
  if(membersState.q.trim()){
    list = list.filter(m => m.name.includes(membersState.q.trim()) ||
      m.nationalId.includes(q) || m.mobile.includes(q) || m.memberNo.toLowerCase().includes(q.toLowerCase()) || m.father.includes(membersState.q.trim()));
  }
  if(membersState.status !== 'all') list = list.filter(m => m.status === membersState.status);
  const s = membersState.sort;
  list.sort((a,b) => {
    let va, vb;
    if(s==='name'){ va=a.name; vb=b.name; return membersState.dir * va.localeCompare(vb,'fa'); }
    if(s==='debt'){ va=memberDebt(a.id); vb=memberDebt(b.id); }
    else if(s==='loans'){ va=memberLoans(a.id).length; vb=memberLoans(b.id).length; }
    else { va=a.joinedAt||''; vb=b.joinedAt||''; }
    return (va<vb?-1:va>vb?1:0) * (s==='joined' ? -1 : membersState.dir);
  });
  return list;
}
function openIncompleteList(){
  const incs = incompleteMembers();
  const reqL = FIELDS().filter(f=>f.req).map(f=>f.label).join('، ');
  openModal({
    title:'تکمیل اطلاعات اعضا', size:'lg',
    sub:'فیلدهای الزامی فعلی الگو: '+esc(reqL),
    body: incs.length ? '<div class="alert a-info" style="margin-bottom:12px"><span class="al-ic">'+icon('info',16)+'</span><div>فیلدهای جدید برای این اعضا خالی است؛ روی «تکمیل» بزنید و فرم را با فیلدهای الزامی پر کنید تا ذخیره شود.</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>عضو</th><th>شماره عضویت</th><th style="text-align:left">تکمیل</th></tr></thead><tbody>' +
      incs.map(m=>'<tr><td><b>'+esc(m.name)+'</b></td><td class="c-fa-num">'+esc(m.memberNo)+'</td><td style="text-align:left"><button class="btn btn-soft btn-sm" data-ic="'+m.id+'">'+icon('edit',13)+' تکمیل</button></td></tr>').join('') + '</tbody></table></div>'
      : '<div class="notif-empty">همهٔ اعضا کامل هستند.</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>بستن</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick = ()=>h.close();
      h.el.querySelectorAll('[data-ic]').forEach(b=> b.onclick = ()=>{ h.close(); guard('memberEdit', ()=> memberForm(qMember(b.dataset.ic))); });
    }
  });
}

async function deleteMember(id){
  const m = qMember(id); if(!m) return;
  const loans = memberLoans(id);
  const debt = loans.filter(l=>l.status==='active').reduce((s2,l)=>s2+loanBalance(l),0);
  const extra = loans.length
    ? ' این عضو <b>'+faDigits(loans.length)+'</b> وام دارد'+(debt>0?' با ماندهٔ بدهی <b>'+fmtM(debt)+'</b>':'')+'؛ با حذف، وام‌ها، اقساط و پرداخت‌های او نیز حذف می‌شوند.'
    : '';
  const okc = await askConfirm({title:'حذف کامل عضو', danger:true, ok:'حذف کامل',
    text:'با حذف <b>«'+esc(m.name)+'»</b> همهٔ اطلاعات او برای همیشه پاک می‌شود و قابل بازگشت نیست.'+extra});
  if(!okc) return;
  const lids = loans.map(l=>l.id);
  DB.installments = DB.installments.filter(i=>lids.indexOf(i.loanId)<0);
  DB.payments = DB.payments.filter(p=>lids.indexOf(p.loanId)<0);
  DB.loans = DB.loans.filter(l=>l.memberId!==id);
  DB.members = DB.members.filter(x=>x.id!==id);
  audit('حذف کامل عضو '+m.name+' ('+m.memberNo+')'+(loans.length?' به‌همراه '+faDigits(loans.length)+' وام':''), 'member');
  saveDb(); toast('عضو «'+m.name+'» به‌طور کامل حذف شد.','ok');
  if(location.hash.indexOf('#/app/members/')===0){ location.hash = '#/app/members'; return; }
  renderMembersPage(mmTab);
}

function renderMembersTable(){
  const list = filteredMembers();
  const per = membersState.per;
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total/per));
  membersState.page = clampNum(membersState.page, 1, pages);
  const rows = list.slice((membersState.page-1)*per, membersState.page*per);
  const wrap = $('#mTblWrap');
  /* بنر «تکمیل اطلاعات» برای اعضای دارای فیلد الزامیِ خالی */
  const _slot = document.getElementById('mIncSlot');
  if(_slot){
    const incs = incompleteMembers();
    if(incs.length){
      _slot.innerHTML = '<div class="alert a-warn" style="margin:0 0 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="al-ic">'+icon('warn',17)+'</span><div style="flex:1"><b>'+faDigits(incs.length)+' عضو</b> فیلد(های) الزامیِ جدید را ندارند؛ باید برای هر کدام کامل شود.</div><button class="btn btn-soft btn-sm" id="mIncBtn">'+icon('edit',13)+' تکمیل اطلاعات</button></div>';
      _slot.querySelector('#mIncBtn').onclick = openIncompleteList;
    } else _slot.innerHTML = '';
  }
  if(!total){ wrap.innerHTML = emptyState({icon:'users', title:'عضوی پیدا نشد', desc:'با این فیلترها عضوی وجود ندارد. عضو جدید اضافه کنید یا فیلترها را تغییر دهید.',
    action:'<button class="btn btn-solid btn-sm" id="mEmptyAdd">'+icon('plus',14)+' افزودن عضو</button>'});
    const b = $('#mEmptyAdd'); if(b) b.onclick = ()=> guard('memberAdd', ()=> memberForm());
    return; }
  wrap.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      '<th style="min-width:190px">نام و نام خانوادگی</th>'+(fieldOn('nationalId')?'<th>کد ملی</th>':'')+(fieldOn('mobile')?'<th>شماره تماس</th>':'')+'<th>شماره عضویت</th><th>وضعیت</th>' +
      FIELDS().filter(f=>!f.core).map(f=>'<th>'+esc(f.label)+'</th>').join('') +
      '<th>تعداد وام‌ها</th><th>بدهی جاری</th><th>تاریخ عضویت</th><th style="text-align:left">عملیات</th>' +
    '</tr></thead><tbody>' + rows.map(m => {
      const loans = memberLoans(m.id).filter(l=>l.status!=='cancelled');
      const debt = memberDebt(m.id);
      const _inc = FIELDS().some(f=>f.req && !String(fldVal(m,f.key)).trim());
      const _cst = FIELDS().filter(f=>!f.core).map(f=>'<td>'+esc(fldVal(m,f.key)||'—')+'</td>').join('');
      return '<tr>' +
        '<td><div class="cell-main"><span class="avatar sz-34">'+esc((m.name||'؟').charAt(0))+'</span><span class="cm-t"><b><a class="row-link" href="#/app/members/'+m.id+'">'+esc(m.name||'—')+'</a></b>'+(fieldOn('father')&&m.father?'<span>فرزند '+esc(m.father)+'</span>':'')+'</span></div></td>' +
        (fieldOn('nationalId')?'<td class="c-num">'+esc(m.nationalId)+'</td>':'') +
        (fieldOn('mobile')?'<td class="c-num">'+esc(m.mobile)+'</td>':'') +
        '<td class="c-fa-num">'+esc(m.memberNo)+'</td>' +
        '<td>'+memberStatusBadge(m.status)+(_inc?' <span class="badge b-amber" data-tip="فیلد الزامی جدید این عضو خالی است"><i class="bd"></i>ناقص</span>':'')+'</td>' +
        _cst +
        '<td class="c-fa-num">'+faDigits(loans.length)+'</td>' +
        '<td class="c-fa-num c-strong"'+(debt?' style="color:var(--red)"':'')+'>'+(debt?fmtM(debt):'—')+'</td>' +
        '<td class="c-fa-num">'+J.fmt(m.joinedAt)+'</td>' +
        '<td><div class="row-acts">' +
          '<a class="x-btn" data-tip="مشاهده پرونده" href="#/app/members/'+m.id+'">'+icon('eye',15)+'</a>' +
          '<button class="x-btn" data-tip="ویرایش" data-edit="'+m.id+'">'+icon('edit',15)+'</button>' +
          '<button class="x-btn danger" data-tip="حذف کامل عضو" data-del="'+m.id+'">'+icon('trash',15)+'</button>' +
        '</div></td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div class="tbl-foot"><span class="tf-info">'+faDigits(total)+' عضو · صفحه '+faDigits(membersState.page)+' از '+faDigits(pages)+'</span>'+pagerHtml(membersState.page, total, per)+'</div>';
  wrap.querySelectorAll('[data-pg]').forEach(b => b.onclick = ()=>{ membersState.page = +b.dataset.pg; renderMembersTable(); });
  wrap.querySelectorAll('[data-edit]').forEach(b => b.onclick = ()=> guard('memberEdit', ()=> memberForm(qMember(b.dataset.edit))));
  wrap.querySelectorAll('[data-del]').forEach(b => b.onclick = ()=> guard('memberEdit', ()=> deleteMember(b.dataset.del)));
}
async function toggleMember(id){
  const m = qMember(id); if(!m) return;
  const deact = m.status === 'active';
  const ok = await askConfirm({
    title: deact ? 'غیرفعال‌سازی عضو' : 'فعال‌سازی عضو',
    text: deact ? 'آیا از غیرفعال‌سازی <b>«'+esc(m.name)+'»</b> مطمئن هستید؟ اطلاعات مالی او حفظ می‌شود و عضو فقط از فهرست عملیات خارج می‌شود.'
                : 'عضو <b>«'+esc(m.name)+'»</b> دوباره فعال شود؟',
    ok: deact ? 'غیرفعال‌سازی' : 'فعال‌سازی',
    danger: deact,
    note: 'طبق سیاست سامانه، اطلاعات مالی حساس حذف فیزیکی نمی‌شود و این رویداد در لاگ ممیزی ثبت می‌گردد.'
  });
  if(!ok) return;
  m.status = deact ? 'inactive' : 'active';
  audit((deact?'غیرفعال‌سازی':'فعال‌سازی')+' عضو '+m.name, 'member:'+m.id);
  saveDb();
  toast((deact?'عضو غیرفعال شد: ':'عضو فعال شد: ') + m.name, deact?'warn':'ok');
  renderMembersTable(); renderShell('members');
}

/* فرم افزودن/ویرایش عضو — فقط ۵ فیلد طبق PSD */
function memberForm(member){
  const isEdit = !!member;
  const m = openModal({
    title: isEdit ? 'ویرایش عضو' : 'افزودن عضو جدید',
    sub: isEdit ? esc(member.name) + ' · ' + esc(member.memberNo) : 'اطلاعات هویتی پایه عضو',
    size:'lg',
    body: '<div class="fields">' +
      '<div class="field"><label>نام و نام خانوادگی <span class="req">*</span></label><input id="mfName" value="'+esc(isEdit?member.name:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نام پدر</label><input id="mfFather" value="'+esc(isEdit?member.father:'')+'"></div>' +
      '<div class="field"><label>تاریخ تولد <span class="req">*</span> <small>(از تقویم انتخاب کنید یا تایپ نمایید)</small></label><input id="mfBirth" value="'+(isEdit?faDigits(member.birthDate):'')+'" data-iso="'+(isEdit&&/^\d{4}-\d{2}-\d{2}$/.test(member.birthDate)?member.birthDate:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>شماره موبایل <span class="req">*</span> <small>(هر فرمتی: ۰۹۱۲…، +98 912…، ۹۱۲… — خودکار مرتب می‌شود)</small></label><input id="mfMobile" class="num-inp" value="'+esc(isEdit?member.mobile:'')+'" placeholder="09xxxxxxxxx" maxlength="11"><span class="err-msg"></span></div>' +
      '<div class="field"><label>کد ملی <span class="req">*</span> <small>(۱۰ رقم — فاصله، خط تیره و رقم لاتین مهم نیست)</small></label><input id="mfNid" class="num-inp" value="'+esc(isEdit?member.nationalId:'')+'" maxlength="10"><span class="err-msg"></span></div>' +
      (!isEdit ? '<div class="field"><label>شماره عضویت</label><input id="mfNo" value="'+esc(DB.settings.memberNoTemplate.replace(/\{seq(?::(\d+))?\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')))+'" disabled style="background:var(--card-2)"><span class="help">به‌صورت خودکار از قالب شماره‌گذاری تنظیمات ساخته می‌شود.</span></div>' : '') +
    '</div>' +
    (isEdit ? '<div class="alert a-info" style="margin-top:14px"><span class="al-ic">'+icon('info',16)+'</span><div>تاریخ عضویت: <b>'+J.fmtLong(member.joinedAt)+'</b> — شماره عضویت <b>'+esc(member.memberNo)+'</b> قابل تغییر نیست.</div>' : ''),
    foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="mfSave">'+icon('check',14)+' ذخیره '+(isEdit?'تغییرات':'عضو')+'</button>',
    onOpen(h){
      /* فیلدهای پایهٔ خاموش‌شده از فرم حذف می‌شوند؛ فیلدهای سفارشی الگو اضافه می‌شوند */
      [['father','#mfFather'],['mobile','#mfMobile'],['nationalId','#mfNid'],['birthDate','#mfBirth']].forEach(([k,sel])=>{
        if(!fieldOn(k)){ const el=h.el.querySelector(sel); if(el){ const fd=el.closest('.field'); if(fd) fd.remove(); } }
      });
      const _cf = FIELDS().filter(f=>!f.core);
      if(_cf.length){
        const holder=h.el.querySelector('.fields');
        const mk=document.createElement('div');
        mk.innerHTML=_cf.map(f=>'<div class="field"><label>'+esc(f.label)+(f.req?' <span class="req">*</span>':'')+'</label><input id="mf_x_'+f.key+'"'+(f.type==='num'?' class="num-inp"':'')+' value="'+esc(isEdit?String((member.x||{})[f.key]||''):'')+'"><span class="err-msg"></span></div>').join('');
        const ref = isEdit ? null : holder.lastElementChild;
        while(mk.firstChild) holder.insertBefore(mk.firstChild, ref);
      }
      attachJDate(h.el.querySelector('#mfBirth'));
      if(isEdit && member.birthDate){ const j = J.parse(member.birthDate); if(j) setJd(h.el.querySelector('#mfBirth'), J.j2iso(j.jy,j.jm,j.jd)); }
      h.el.querySelector('[data-x]').onclick = ()=> h.close();
      h.el.querySelector('#mfSave').onclick = ()=> {
        /* کاربر با هر تایپی وارد می‌کند؛ برنامه هنگام ثبت نوع داده را تعیین و نرمال می‌کند:
           متن → تمیزسازی فاصله‌ها · عدد (موبایل، کد ملی، فیلدهای عددی) → فقط رقم فارسی */
        const name = String(fieldVal('#mfName')).replace(/\s+/g,' ').trim(),
              father = String(fieldVal('#mfFather')).replace(/\s+/g,' ').trim(),
              birth = h.el.querySelector('#mfBirth'),
              mobileN = normMobile(fieldVal('#mfMobile')),
              nidN = normFaDigits(fieldVal('#mfNid'));
        let okf = true;
        const check = (el, cond, msg) => { if(cond){ clearErr(el); } else { markErr(el, msg); okf = false; } };
        check($('#mfName'), name.length >= 3, 'نام و نام خانوادگی را کامل وارد کنید.');
        if(birth && (fieldReq('birthDate') || birth.value)) check(birth, !!J.parse(birth.value), 'تاریخ تولد معتبر نیست (نمونه: ۱۳۷۵/۰۴/۰۲ یا 75/4/2)');
        if(fieldOn('mobile') && (fieldReq('mobile') || fieldVal('#mfMobile'))) check($('#mfMobile'), /^۰۹[۰-۹]{9}$/.test(mobileN), 'شماره موبایل باید ۱۱ رقم و با ۰۹ باشد (با هر فرمتی تایپ کنید، خودکار تبدیل می‌شود).');
        if(fieldOn('nationalId') && (fieldReq('nationalId') || fieldVal('#mfNid'))){
          check($('#mfNid'), nidN.length===10, 'کد ملی باید ۱۰ رقم باشد (فاصله، خط تیره و رقم لاتین مهم نیست).');
          const dup = DB.members.find(x => x.nationalId === nidN && nidN && (!isEdit || x.id !== member.id));
          check($('#mfNid'), !dup, 'این کد ملی قبلاً برای «'+(dup?dup.name:'')+'» ثبت شده است.');
        }
        const _cv = {};
        for(const f of _cf){ const el=h.el.querySelector('#mf_x_'+f.key); let v=el?el.value.trim():'';
          v = f.type==='num' ? normFaDigits(v) : String(v).replace(/\s+/g,' ').trim();
          if(f.req && !v){ if(el) markErr(el, '«'+f.label+'» الزامی است — باید برای این عضو پر شود.'); okf=false; }
          _cv[f.key]=v; }
        if(!okf){ toast('برخی ورودی‌ها ناقص یا نامعتبر است.', 'err'); return; }
        if(isEdit){
          member.name = name;
          if(fieldOn('father')) member.father = father;
          if(fieldOn('mobile')) member.mobile = mobileN;
          if(fieldOn('nationalId')) member.nationalId = nidN;
          if(birth){ const jb = J.parse(birth.value); member.birthDate = jb.jy+'/'+String(jb.jm).padStart(2,'0')+'/'+String(jb.jd).padStart(2,'0'); }
          member.x = Object.assign(member.x||{}, _cv);
          audit('ویرایش اطلاعات عضو '+name, 'member:'+member.id);
          saveDb(); toast('تغییرات عضو ذخیره شد.', 'ok'); h.close();
          if(location.hash === '#/app/members') renderMembersTable(); else route();
        } else {
          const jb = birth ? J.parse(birth.value) : null;
          const nm = { id:uid('m'), name,
            father: fieldOn('father')?father:'', mobile: fieldOn('mobile')?mobileN:'',
            nationalId: fieldOn('nationalId')?nidN:'',
            birthDate: jb ? jb.jy+'/'+String(jb.jm).padStart(2,'0')+'/'+String(jb.jd).padStart(2,'0') : '',
            memberNo: memberNoNext(), status:'active', joinedAt: J.todayIso(), createdAt: J.nowIso(), x:_cv };
          DB.members.push(nm);
          audit('افزودن عضو جدید '+name+' ('+nm.memberNo+')', 'member:'+nm.id);
          saveDb(); toast('عضو «'+name+'» با موفقیت اضافه شد.', 'ok');
          /* مُهر تأیید با رنگ انتخابی از تنظیمات */
          stampFx({ text:'ثبت شد', sub:'عضویت '+esc(nm.memberNo)+' — '+J.fmt(J.todayIso()),
            color:stampColor('member'), hold:1050, onDone:()=>{
              h.close();
              const goFile = ()=> location.hash = '#/app/members/'+nm.id;
              openModal({ size:'sm', title:'عضو ثبت شد', body:'<div class="alert a-ok"><span class="al-ic">'+icon('check',17)+'</span><div>«<b>'+esc(name)+'</b>» با شماره عضویت <b>'+esc(nm.memberNo)+'</b> ثبت شد. می‌خواهید پرونده او را ببینید؟</div></div>',
                foot:'<button class="btn btn-ghost btn-sm" data-x>ماندن در فهرست</button><button class="btn btn-solid btn-sm" data-go>مشاهده پرونده عضو</button>',
                onOpen(h2){ h2.el.querySelector('[data-x]').onclick = ()=>{ h2.close(); route(); };
                  h2.el.querySelector('[data-go]').onclick = ()=>{ h2.close(); goFile(); }; } });
            }});
        }
      };
    }
  });
}
SHORTCUTS.memberAdd = ()=> memberForm();

/* ═══════════ پرونده عضو ═══════════ */
function memberProfile(id){
  const m = qMember(id), main = $('#main');
  if(!m){ main.innerHTML = emptyState({icon:'warn', title:'عضو پیدا نشد', desc:'این عضو حذف شده یا آدرس اشتباه است.', action:'<a class="btn btn-soft btn-sm" href="#/app/members">بازگشت به فهرست اعضا</a>'}); return; }
  const loans = memberLoans(m.id), debt = memberDebt(m.id), paid = memberPaid(m.id);
  const insAll = loans.flatMap(l => loanInstallments(l.id).map(i => ({...i, loan:l})));
  const pays = DB.payments.filter(p => loans.some(l=>l.id===p.loanId)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const acts = DB.audit.filter(a => a.target === 'member:'+m.id);
  main.innerHTML =
    '<div class="page-head"><div><a href="#/app/members" class="login-back" style="margin-bottom:6px">'+icon('arrowL',14)+' فهرست اعضا</a>' +
      '<div class="prof-head"><span class="avatar sz-64">'+esc((m.name||'؟').charAt(0))+'</span>' +
      '<div class="ph-info"><h2 style="font-size:1.35rem;margin:0">'+esc(m.name)+'</h2>' +
      '<div style="display:flex;gap:7px;margin-top:7px;flex-wrap:wrap">'+memberStatusBadge(m.status)+'<span class="badge b-gray">عضویت '+esc(m.memberNo)+'</span>' +
      (debt ? '<span class="badge b-red"><i class="bd"></i>بدهی '+fmtMShort(debt)+' '+CUR()+'</span>' : '<span class="badge b-green"><i class="bd"></i>بدون بدهی</span>') + '</div></div></div></div>' +
      '<div class="ph-actions">' +
        '<button class="btn btn-ghost btn-sm" id="pmEdit" style="padding:11px 17px;font-size:.88rem">'+icon('edit',14)+' ویرایش</button>' +
        '<button class="btn btn-danger btn-sm" id="pmDel" style="padding:11px 17px;font-size:.88rem">'+icon('trash',14)+' حذف کامل</button>' +
        '<button class="btn btn-solid btn-sm" id="pmLoan" style="padding:11px 17px;font-size:.88rem">'+icon('loan',14)+' ثبت وام برای این عضو</button>' +
      '</div></div>' +

    '<div class="grid g-4">' +
      '<div class="stat"><div class="stat-top"><span class="s-ic">'+icon('loan',15)+'</span>تعداد وام‌ها</div><div class="stat-val">'+faDigits(loans.length)+'</div><div class="stat-sub">'+faDigits(loans.filter(l=>l.status==='active').length)+' فعال</div></div>' +
      '<div class="stat s-red"><div class="stat-top"><span class="s-ic">'+icon('warn',15)+'</span>بدهی جاری</div><div class="stat-val">'+(debt?fmtM(debt):'صفر')+'</div><div class="stat-sub">مانده اقساط پرداخت‌نشده</div></div>' +
      '<div class="stat s-teal"><div class="stat-top"><span class="s-ic">'+icon('coins',15)+'</span>مجموع پرداخت‌ها</div><div class="stat-val">'+fmtMShort(paid)+' <small>'+CUR()+'</small></div><div class="stat-sub">'+faDigits(pays.length)+' پرداخت</div></div>' +
      '<div class="stat s-amber"><div class="stat-top"><span class="s-ic">'+icon('calendar',15)+'</span>اقساط باز</div><div class="stat-val">'+faDigits(insAll.filter(i=>i.paidAmount<i.amount).length)+'</div><div class="stat-sub">'+faDigits(insAll.filter(i=>insStatus(i)==='overdue').length)+' سررسیدگذشته</div></div>' +
    '</div>' +

    '<div class="card" style="margin-top:14px"><div class="card-h"><h3>اطلاعات هویتی</h3></div><div class="card-b"><div class="kv-grid">' +
      kv('نام و نام خانوادگی', m.name) + kv('نام پدر', m.father) + kv('کد ملی', m.nationalId, true) + kv('شماره موبایل', m.mobile, true) +
      kv('تاریخ تولد', m.birthDate ? faDigits(m.birthDate) : '—') + kv('شماره عضویت', m.memberNo) + kv('تاریخ عضویت', J.fmtLong(m.joinedAt)) + kv('وضعیت', m.status==='active'?'فعال':'غیرفعال') +
    '</div></div></div>' +

    '<div class="card tight" style="margin-top:14px"><div class="card-b" style="padding:8px 18px 0"><div class="tabs" id="mpTabs">' +
      '<button class="tab on" data-t="loans">وام‌ها<span class="tc">'+faDigits(loans.length)+'</span></button>' +
      '<button class="tab" data-t="ins">اقساط<span class="tc">'+faDigits(insAll.length)+'</span></button>' +
      '<button class="tab" data-t="pays">پرداخت‌ها<span class="tc">'+faDigits(pays.length)+'</span></button>' +
      '<button class="tab" data-t="hist">تاریخچه عملیات</button>' +
    '</div></div><div class="card-b" id="mpBody"></div></div>';

  $('#pmEdit').onclick = ()=> guard('memberEdit', ()=> memberForm(m));
  const pmD = $('#pmDel'); if(pmD) pmD.onclick = ()=> guard('memberEdit', ()=> deleteMember(m.id));
  $('#pmLoan').onclick = ()=> guard('loanAdd', ()=> loanForm(null, m.id));

  const tabs = {
    loans(){ return loans.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>مبلغ وام</th><th>صندوق</th><th>اقساط</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th>تاریخ درخواست</th><th></th></tr></thead><tbody>' +
      loans.map(l => '<tr><td class="c-strong c-fa-num">'+fmtM(l.amount)+'</td><td>'+esc((qFund(l.fundId)||{}).name||'—')+'</td>' +
        '<td class="c-fa-num">'+faDigits(l.months)+'</td><td class="c-fa-num">'+fmtN(loanPaidSum(l))+'</td><td class="c-fa-num'+(loanBalance(l)?'" style="color:var(--red)':'')+'">'+fmtN(loanBalance(l))+'</td>' +
        '<td>'+loanBadge(l.status)+'</td><td class="c-fa-num">'+J.fmt(l.requestDate)+'</td>' +
        '<td style="text-align:left"><a class="btn btn-soft btn-sm" href="#/app/loans/'+l.id+'">جزئیات</a></td></tr>').join('') +
      '</tbody></table></div>' : emptyState({icon:'loan', title:'وامی ثبت نشده', desc:'برای این عضو هنوز وامی ایجاد نشده است.', action:'<button class="btn btn-solid btn-sm" onclick="guard(\'loanAdd\',()=>loanForm(null,\''+m.id+'\'))">'+icon('plus',14)+' ثبت وام</button>'}); },
    ins(){ return insAll.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>قسط</th><th>وام</th><th>سررسید</th><th>مبلغ</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th style="text-align:left">عملیات</th></tr></thead><tbody>' +
      insAll.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(i => '<tr><td class="c-fa-num">'+faDigits(i.no)+'</td><td>'+fmtMShort(i.loan.amount)+' '+CUR()+'</td>' +
        '<td class="c-fa-num">'+J.fmt(i.dueDate)+'</td><td class="c-fa-num">'+fmtN(i.amount)+'</td><td class="c-fa-num">'+fmtN(i.paidAmount)+'</td>' +
        '<td class="c-fa-num">'+fmtN(i.amount-i.paidAmount)+'</td><td>'+insBadge(insStatus(i))+'</td>' +
        '<td style="text-align:left">'+(insStatus(i)!=='paid' && i.loan.status==='active'
          ? '<button class="btn btn-soft btn-sm" data-mpay="'+i.id+'" data-tip="ثبت پرداخت و تیک این قسط">'+icon('coins',13)+' پرداخت</button>'
          : '<span class="badge b-green">'+icon('check',12)+' تسویه')+'</td></tr>').join('') + '</tbody></table></div>'
      : emptyState({icon:'calendar', title:'قسطی وجود ندارد'}); },
    pays(){ return pays.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>تاریخ</th><th>مبلغ</th><th>روش</th><th>حساب</th><th>مرجع</th></tr></thead><tbody>' +
      pays.map(p => '<tr><td class="c-fa-num">'+J.fmt(p.date)+'</td><td class="c-fa-num c-strong">'+fmtM(p.amount)+'</td><td>'+esc(p.method)+'</td><td>'+esc((qAccount(p.accountId)||{}).name||'—')+'</td><td class="c-num">'+esc(p.ref)+'</td></tr>').join('') +
      '</tbody></table></div>' : emptyState({icon:'coins', title:'پرداختی ثبت نشده'}); },
    hist(){ return acts.length ? '<div class="timeline">' + acts.map(a => '<div class="tl-item"><div class="tl-t">'+esc(a.action)+'</div><div class="tl-d">'+esc(a.user)+' · '+J.fmt(a.at)+faTime(a.at)+'</div></div>').join('') + '</div>'
      : emptyState({icon:'clock', title:'رویدادی ثبت نشده', desc:'عملیات حساس مربوط به این عضو در لاگ ممیزی ثبت خواهد شد.'}); }
  };
  const showTab = t => { $('#mpBody').innerHTML = tabs[t](); $$('#mpTabs .tab').forEach(b => b.classList.toggle('on', b.dataset.t===t)); };
  $$('#mpTabs .tab').forEach(b => b.onclick = ()=> showTab(b.dataset.t));
  /* پرداخت سریع قسط از داخل پرونده عضو */
  $('#mpBody').addEventListener('click', e => {
    const b = e.target.closest('[data-mpay]');
    if(b){ const insX = DB.installments.find(x=>x.id===b.dataset.mpay); if(insX) guard('paymentAdd', ()=> paymentForm(insX.loanId, insX.id)); }
  });
  showTab('loans');
}
function kv(k,v,num){ return '<div class="kv"><span>'+esc(k)+'</span><b'+(num?' class="c-num" style="direction:ltr"':'')+'>'+esc(v===''?'—':v)+'</b></div>'; }

/* ═══════════ صندوق‌ها و حساب‌ها ═══════════ */
/* صندوق‌ها و حساب‌ها به‌طور کامل به تنظیمات منتقل شده؛ آدرس‌های قدیمی هم به همان تب می‌روند */
function _gotoFundsTab(tab){
  fundsTab = tab || fundsTab;
  try{ setTab = 'org'; setAnchor = 'secFa'; }catch(e){}
  if(location.hash.indexOf('#/app/settings')===0){ renderSettings(); } else location.hash = '#/app/settings';
}
PAGES.funds = function(arg){ _gotoFundsTab(arg==='accounts' ? 'accounts' : (arg&&arg!=='funds'?arg:'funds')); };
PAGES.accounts = function(arg){ if(arg){ accountDetail(arg); return; } _gotoFundsTab('accounts'); };
let fundsTab = 'funds';

function renderFunds(tab, hostSel){
  fundsTab = tab || fundsTab;
  const host = hostSel ? document.querySelector(hostSel) : $('#main');
  host.innerHTML =
    (hostSel ? '' : '<div class="page-head"><div><h1>صندوق‌ها و حساب‌ها</h1><div class="ph-sub">مدیریت صندوق‌ها، حساب‌های بانکی و موجودی آن‌ها</div></div></div>') +
    '<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-solid btn-sm" id="btnAddFA">'+icon('plus',14)+'</button></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      '<button class="tab'+(fundsTab==='funds'?' on':'')+'" data-ft="funds">صندوق‌ها<span class="tc">'+faDigits(DB.funds.length)+'</span></button>' +
      '<button class="tab'+(fundsTab==='accounts'?' on':'')+'" data-ft="accounts">حساب‌ها<span class="tc">'+faDigits(DB.accounts.length)+'</span></button>' +
    '</div></div><div class="card-b" id="faBody"></div></div>';
  $('#btnAddFA').innerHTML += fundsTab==='funds' ? ' افزودن صندوق' : ' افزودن حساب';
  $('#btnAddFA').onclick = ()=> guard('settingsEdit', fundsTab==='funds' ? fundForm : accountForm);
  host.querySelectorAll('[data-ft]').forEach(b => b.onclick = ()=> renderFunds(b.dataset.ft, hostSel));
  if(fundsTab === 'funds') renderFundsTable(); else renderAccountsTable();
}
function renderFundsTable(){
  const body = $('#faBody');
  body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام صندوق</th><th>کد صندوق</th><th>مؤسسه مالک</th><th>حساب‌ها</th><th>موجودی تجمیعی</th><th>وضعیت</th><th>توضیحات</th><th style="text-align:left">عملیات</th></tr></thead><tbody>' +
    DB.funds.map(f => {
      const accs = DB.accounts.filter(a=>a.fundId===f.id);
      const bal = accs.filter(a=>a.status==='active').reduce((s,a)=>s+a.balance,0);
      return '<tr><td><div class="cell-main"><span class="avatar sz-34 ink" style="border-radius:11px">'+icon('bank',15)+'</span><span class="cm-t"><b>'+esc(f.name)+'</b></span></div></td>' +
        '<td class="c-num">'+esc(f.code)+'</td><td>'+esc(f.institution)+'</td><td class="c-fa-num">'+faDigits(accs.length)+'</td>' +
        '<td class="c-fa-num c-strong">'+fmtM(bal)+'</td>' +
        '<td>'+(f.status==='active'?'<span class="badge b-green"><i class="bd"></i>فعال</span>':'<span class="badge b-gray"><i class="bd"></i>غیرفعال</span>')+'</td>' +
        '<td style="font-size:.8rem;color:var(--ink-2)">'+esc(f.notes||'—')+'</td>' +
        '<td><div class="row-acts"><button class="x-btn" data-tip="حساب‌های این صندوق" data-accs="'+f.id+'">'+icon('wallet',15)+'</button>' +
        '<button class="x-btn" data-tip="ویرایش" data-editf="'+f.id+'">'+icon('edit',15)+'</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
  body.querySelectorAll('[data-accs]').forEach(b => b.onclick = ()=> renderFunds('accounts'));
  body.querySelectorAll('[data-editf]').forEach(b => b.onclick = ()=> guard('settingsEdit', ()=> fundForm(qFund(b.dataset.editf))));
}
function renderAccountsTable(){
  const body = $('#faBody');
  body.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام حساب</th><th>شماره حساب</th><th>نوع</th><th>صندوق مرتبط</th><th>موجودی اولیه</th><th>موجودی فعلی</th><th>وضعیت</th><th style="text-align:left">عملیات</th></tr></thead><tbody>' +
    DB.accounts.map(a => '<tr>' +
      '<td><a class="row-link" href="#/app/accounts/'+a.id+'">'+esc(a.name)+'</a></td>' +
      '<td class="c-num">'+esc(a.number)+'</td><td><span class="badge b-teal">'+esc(a.type)+'</span></td>' +
      '<td>'+esc((qFund(a.fundId)||{}).name||'—')+'</td>' +
      '<td class="c-fa-num">'+fmtN(a.initialBalance)+'</td>' +
      '<td class="c-fa-num c-strong"'+(a.balance<40000000?' style="color:var(--amber)"':'')+'>'+fmtN(a.balance)+' <small style="color:var(--ink-2)">'+CUR()+'</small></td>' +
      '<td>'+(a.status==='active'?'<span class="badge b-green"><i class="bd"></i>فعال</span>':'<span class="badge b-gray"><i class="bd"></i>غیرفعال</span>')+'</td>' +
      '<td><div class="row-acts"><a class="x-btn" data-tip="جزئیات و گردش" href="#/app/accounts/'+a.id+'">'+icon('eye',15)+'</a>' +
      '<button class="x-btn" data-tip="ویرایش" data-edita="'+a.id+'">'+icon('edit',15)+'</button></div></td></tr>').join('') +
    '</tbody></table></div>';
  body.querySelectorAll('[data-edita]').forEach(b => b.onclick = ()=> guard('settingsEdit', ()=> accountForm(qAccount(b.dataset.edita))));
}
function fundForm(fund){
  const isEdit = !!fund;
  const h = openModal({
    title: isEdit ? 'ویرایش صندوق' : 'افزودن صندوق جدید',
    body: '<div class="fields" style="grid-template-columns:1fr">' +
      '<div class="field"><label>نام صندوق <span class="req">*</span></label><input id="ffName" value="'+esc(isEdit?fund.name:'')+'"><span class="err-msg"></span></div>' +
      '<div class="fields"><div class="field"><label>کد صندوق <span class="req">*</span></label><input id="ffCode" class="num-inp" value="'+esc(isEdit?fund.code:'')+'" placeholder="F-1005"><span class="err-msg"></span></div>' +
      '<div class="field"><label>وضعیت</label><select id="ffStatus"><option value="active"'+(isEdit&&fund.status==='active'?' selected':'')+'>فعال</option><option value="inactive"'+(isEdit&&fund.status==='inactive'?' selected':'')+'>غیرفعال</option></select></div></div>' +
      '<div class="field"><label>مؤسسه مالک</label><input id="ffInst" value="'+esc(isEdit?fund.institution:DB.settings.institution.name)+'"></div>' +
      '<div class="field"><label>توضیحات</label><textarea id="ffNotes">'+esc(isEdit?fund.notes:'')+'</textarea></div>' +
    '</div>',
    foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="ffSave">'+icon('check',14)+' ذخیره</button>',
    onOpen(hh){
      hh.el.querySelector('[data-x]').onclick = ()=>hh.close();
      hh.el.querySelector('#ffSave').onclick = ()=>{
        const name = fieldVal('#ffName'), code = fieldVal('#ffCode');
        let okf = true;
        if(name.length < 2){ markErr($('#ffName'),'نام صندوق الزامی است.'); okf = false; } else clearErr($('#ffName'));
        if(code.length < 2){ markErr($('#ffCode'),'کد صندوق الزامی است.'); okf = false; } else clearErr($('#ffCode'));
        if(!okf) return;
        if(isEdit){ Object.assign(fund, {name, code, status:$('#ffStatus').value, institution:fieldVal('#ffInst'), notes:fieldVal('#ffNotes')}); }
        else DB.funds.push({id:uid('f'), name, code, institution:fieldVal('#ffInst')||DB.settings.institution.name, status:$('#ffStatus').value, notes:fieldVal('#ffNotes')});
        audit((isEdit?'ویرایش':'ایجاد')+' صندوق '+name, 'fund');
        saveDb(); toast('صندوق «'+name+'» ذخیره شد.','ok'); hh.close(); route();
      };
    }
  });
}
function accountForm(acc){
  const isEdit = !!acc;
  const h = openModal({
    title: isEdit ? 'ویرایش حساب' : 'افزودن حساب جدید',
    body: '<div class="fields">' +
      '<div class="field"><label>نام حساب <span class="req">*</span></label><input id="afName" value="'+esc(isEdit?acc.name:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>شماره حساب <span class="req">*</span></label><input id="afNum" class="num-inp" value="'+esc(isEdit?acc.number:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نوع حساب</label><select id="afType">'+['جاری','پس‌انداز','قرض‌الحسنه'].map(x=>'<option'+(isEdit&&acc.type===x?' selected':'')+'>'+x+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>صندوق مرتبط <span class="req">*</span></label><select id="afFund">'+DB.funds.map(f=>'<option value="'+f.id+'"'+(isEdit&&acc.fundId===f.id?' selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>موجودی اولیه <small>('+CUR()+')</small></label><input id="afInit" class="num-inp" value="'+(isEdit?Number(acc.initialBalance).toLocaleString('en-US'):'')+'"><span class="help">موجودی فعلی = اولیه + گردش تراکنش‌ها</span></div>' +
      '<div class="field"><label>وضعیت</label><select id="afStatus"><option value="active"'+(isEdit&&acc.status==='active'?' selected':'')+'>فعال</option><option value="inactive"'+(isEdit&&acc.status==='inactive'?' selected':'')+'>غیرفعال</option></select></div>' +
      '<div class="field full"><label>توضیحات</label><textarea id="afNotes">'+esc(isEdit?acc.notes:'')+'</textarea></div>' +
    '</div>',
    foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="afSave">'+icon('check',14)+' ذخیره</button>',
    onOpen(hh){
      attachMoney(hh.el.querySelector('#afInit'));
      hh.el.querySelector('[data-x]').onclick = ()=>hh.close();
      hh.el.querySelector('#afSave').onclick = ()=>{
        const name = fieldVal('#afName'), num = fieldVal('#afNum');
        let okf = true;
        if(name.length<2){ markErr($('#afName'),'نام حساب الزامی است.'); okf=false; } else clearErr($('#afName'));
        if(num.length<3){ markErr($('#afNum'),'شماره حساب الزامی است.'); okf=false; } else clearErr($('#afNum'));
        if(!okf) return;
        const init = moneyVal(hh.el.querySelector('#afInit'));
        if(isEdit){
          const delta = init - acc.initialBalance;
          Object.assign(acc, {name, number:num, type:$('#afType').value, fundId:$('#afFund').value, initialBalance:init, status:$('#afStatus').value, notes:fieldVal('#afNotes')});
          acc.balance += delta;
        } else {
          DB.accounts.push({id:uid('a'), fundId:$('#afFund').value, name, number:num, type:$('#afType').value, initialBalance:init, balance:init, status:$('#afStatus').value, notes:fieldVal('#afNotes')});
        }
        audit((isEdit?'ویرایش':'ایجاد')+' حساب '+name, 'account');
        saveDb(); toast('حساب «'+name+'» ذخیره شد.','ok'); hh.close(); route();
      };
    }
  });
}
function accountDetail(id){
  const a = qAccount(id), main = $('#main');
  if(!a){ main.innerHTML = emptyState({icon:'warn', title:'حساب پیدا نشد', action:'<a class="btn btn-soft btn-sm" href="#/app/settings">بازگشت به تنظیمات</a>'}); return; }
  const f = qFund(a.fundId);
  const txs = DB.txns.filter(x=>x.accountId===a.id).sort((x,y)=>y.at.localeCompare(x.at));
  const nowK = J.todayIso().slice(0,7);
  const inM = txs.filter(x=>x.type==='deposit' && x.at.slice(0,7)===nowK).reduce((s,x)=>s+x.amount,0);
  const outM = txs.filter(x=>x.type==='withdraw' && x.at.slice(0,7)===nowK).reduce((s,x)=>s+x.amount,0);
  main.innerHTML =
    '<div class="page-head"><div><a href="#/app/settings" class="login-back" style="margin-bottom:6px">'+icon('arrowL',14)+' تنظیمات ▸ صندوق‌ها و حساب‌ها</a>' +
      '<h1>'+esc(a.name)+'</h1><div class="ph-sub">شماره <span class="c-num">'+esc(a.number)+'</span> · '+esc(a.type)+' · صندوق «'+esc((f||{}).name||'—')+'»</div></div>' +
      '<div class="ph-actions"><button class="btn btn-solid btn-sm" id="accTxn" style="padding:11px 17px;font-size:.88rem">'+icon('swap',15)+' ثبت تراکنش روی این حساب</button></div></div>' +
    '<div class="grid g-4">' +
      '<div class="stat"><div class="stat-top"><span class="s-ic">'+icon('wallet',15)+'</span>موجودی فعلی</div><div class="stat-val">'+fmtM(a.balance)+'</div><div class="stat-sub">موجودی اولیه: '+fmtN(a.initialBalance)+'</div></div>' +
      '<div class="stat s-lime"><div class="stat-top"><span class="s-ic">'+icon('download',15)+'</span>واریزی این ماه</div><div class="stat-val">'+fmtMShort(inM)+' <small>'+CUR()+'</small></div></div>' +
      '<div class="stat s-amber"><div class="stat-top"><span class="s-ic">'+icon('upload',15)+'</span>برداشت این ماه</div><div class="stat-val">'+fmtMShort(outM)+' <small>'+CUR()+'</small></div></div>' +
      '<div class="stat s-teal"><div class="stat-top"><span class="s-ic">'+icon('swap',15)+'</span>تعداد تراکنش‌ها</div><div class="stat-val">'+faDigits(txs.length)+'</div></div>' +
    '</div>' +
    '<div class="card tight" style="margin-top:14px"><div class="card-h"><h3>گردش حساب</h3><span class="hint-t">'+faDigits(txs.length)+' تراکنش</span></div>' +
    (txs.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>تاریخ و زمان</th><th>نوع</th><th>مبلغ</th><th>مرجع</th><th>پیگیری</th><th>توضیحات</th><th>کاربر</th></tr></thead><tbody>' +
      txs.map(x => { const dep = x.type==='deposit'; return '<tr><td class="c-fa-num">'+J.fmt(x.at)+faTime(x.at)+'</td>' +
        '<td>'+(dep?'<span class="badge b-green"><i class="bd"></i>واریز</span>':'<span class="badge b-red"><i class="bd"></i>برداشت</span>')+'</td>' +
        '<td class="c-fa-num c-strong" style="color:'+(dep?'var(--green-deep)':'var(--red)')+'">'+(dep?'+':'−')+' '+fmtN(x.amount)+'</td>' +
        '<td class="c-num">'+esc(x.ref)+'</td><td class="c-num">'+esc(x.tracking||'—')+'</td><td style="font-size:.8rem">'+esc(x.notes||'—')+'</td><td>'+esc(x.user)+'</td></tr>'; }).join('') +
      '</tbody></table></div>' : emptyState({icon:'swap', title:'تراکنشی ثبت نشده'})) + '</div>';
  $('#accTxn').onclick = ()=> guard('txnAdd', ()=> txnForm(a.id));
}
