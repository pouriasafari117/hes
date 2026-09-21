/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۹: افتتاح حساب جدید + لاگین با شماره تماس/کدملی + تنظیمات جدید
   - بازطراحی کامل افتتاح حساب
   - لاگین با شماره تماس (پیش‌فرض) و کدملی (پیش‌فرض رمز)
   - حذف اتصال PostgreSQL از تنظیمات
   - شماره عضویت خودکار: نام انگلیسی + نام خانوادگی انگلیسی + کدملی
   ═══════════════════════════════════════════════════════════════ */

const ONBOARD_KEY = 'hesabat-onboard-v1';

// تابع تبدیل فارسی به انگلیسی ساده
function faToEnTranslit(s){
  const map = {
    'ا':'a','آ':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh',
    'د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z',
    'ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l',
    'م':'m','ن':'n','و':'o','ه':'h','ی':'y','ئ':'y','ء':'',
    ' ': '', '‌':''
  };
  let out = '';
  for (const ch of String(s||'')) {
    if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase();
    else if (map[ch]) out += map[ch];
  }
  return out.replace(/[^a-z0-9]/g,'').slice(0,20) || 'user';
}

function genMemberNo(firstName, lastName, nid){
  const firstWord = String(firstName||'').trim().split(/\s+/)[0] || '';
  const lastWord = String(lastName||'').trim().split(/\s+/)[0] || '';
  const enFirst = faToEnTranslit(firstWord) || 'user';
  const enLast = faToEnTranslit(lastWord) || '';
  const nidPart = String(nid||'').replace(/\D/g,'').slice(-6) || Date.now().toString().slice(-4);
  return (enFirst + (enLast ? enLast.charAt(0) : '') + nidPart).toLowerCase();
}

function genInstitutionEmail(slug, nid){
  const cleanSlug = String(slug||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,20) || 'inst';
  return cleanSlug + (nid||'') + '@hes.com';
}

// ── لاگین جدید با شماره تماس/کدملی ──
function bindNewLogin(){
  const form = document.getElementById('loginForm');
  if (!form) return;
  // همیشه دکمه را چک کن حتی اگر قبلاً bind شده
  // تغییر placeholder ها
  const userInput = document.getElementById('lgUser');
  const passInput = document.getElementById('lgPass');
  if (userInput) {
    userInput.placeholder = 'شماره تماس (مثلاً 09121234567)';
    const label = document.querySelector('label[for="lgUser"]');
    if (label) label.innerHTML = 'شماره تماس <span class="req">*</span> <small>(نام کاربری پیش‌فرض)</small>';
  }
  if (passInput) {
    passInput.placeholder = 'کد ملی (10 رقم)';
    const label = document.querySelector('label[for="lgPass"]');
    if (label) label.innerHTML = 'کد ملی <span class="req">*</span> <small>(رمز پیش‌فرض)</small>';
  }
  
  // حذف حساب‌های نمایشی قدیمی
  const hint = document.querySelector('.login-hint');
  if (hint && !hint.dataset.fixed) {
    hint.dataset.fixed = '1';
    hint.innerHTML = '<b>راهنما:</b> نام کاربری = شماره تماس، رمز عبور = کد ملی (پیش‌فرض)<br>' +
      '<small>برای حساب‌های قدیمی: admin/1234 همچنان کار می‌کند</small>';
  }

  // اضافه کردن دکمه افتتاح حساب - با onclick مستقیم
  if (!document.getElementById('btnOpenAccount')) {
    const loginBtn = document.getElementById('btnLogin');
    if (loginBtn && loginBtn.parentNode) {
      const openBtn = document.createElement('button');
      openBtn.id = 'btnOpenAccount';
      openBtn.type = 'button';
      openBtn.className = 'btn btn-ghost';
      openBtn.style.cssText = 'width:100%;justify-content:center;margin-top:12px';
      openBtn.innerHTML = (typeof icon==='function' ? icon('plus',14) : '+') + ' افتتاح حساب جدید';
      openBtn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        console.log('[onboard] opening onboarding wizard');
        try { location.hash = '#/onboarding'; } catch(_){}
        // مستقیم هم رندر کن تا اگر hashchange کار نکرد، باز هم باز شود
        setTimeout(()=>{ if(typeof renderOnboarding==='function') renderOnboarding(); }, 50);
      };
      loginBtn.parentNode.appendChild(openBtn);
    }
  }
  if (form.dataset.newLogin) return;
  form.dataset.newLogin = '1';
}

// ── افتتاح حساب جدید ──
let onboardRole = 'manager';
let onboardStep = 1;
let onboardData = {};

function renderOnboarding(){
  console.log('[onboard] renderOnboarding called, role=', onboardRole, 'step=', onboardStep);
  // همیشه ویو لاگین را فعال کن
  if (typeof showView === 'function') {
    try { showView('login'); } catch(e){}
  }
  const loginView = document.getElementById('view-login');
  if (loginView) loginView.classList.add('active');
  const appView = document.getElementById('view-app');
  if (appView) appView.classList.remove('active');
  if (document.body) { document.body.classList.add('in-login'); document.body.classList.remove('in-app'); }

  const wrap = document.querySelector('.login-wrap');
  if (wrap) {
    wrap.innerHTML = onboardingHtml();
    bindOnboarding();
    return;
  }
  // اگر wrap پیدا نشد (مثلاً در حالت اپ)، main را بساز
  const appMain = document.getElementById('main');
  if (appMain) {
    // اگر داخل اپ هستیم، کل main را به onboarding تبدیل کن
    const container = document.createElement('div');
    container.className = 'login-wrap';
    container.style.cssText = 'max-width:640px;margin:0 auto;padding:28px 16px';
    container.innerHTML = onboardingHtml();
    appMain.innerHTML = '';
    appMain.appendChild(container);
    bindOnboarding();
  } else {
    // آخرین تلاش: body را مستقیم پر کن
    document.body.innerHTML = '<div id="view-login" class="view active" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px 16px"><div class="login-wrap" style="width:min(640px,100%)">' + onboardingHtml() + '</div></div>';
    bindOnboarding();
  }
}
// برای دسترسی از بیرون
if (typeof window !== 'undefined') { window.renderOnboarding = renderOnboarding; window.openOnboarding = renderOnboarding; }

function onboardingHtml(){
  const roleBtn = (role, label, ic) => 
    '<button class="role-btn ' + (onboardRole===role ? 'on' : '') + '" data-role="' + role + '">' +
    icon(ic,18) + '<span><b>' + label + '</b><small>' + (role==='manager' ? 'ایجاد مؤسسه جدید' : 'عضویت در مؤسسه موجود') + '</small></span></button>';

  let stepHtml = '';
  if (onboardRole === 'manager') {
    if (onboardStep === 1) {
      stepHtml = `
        <div class="onb-step"><span class="sn">۱</span><div><h4>مشخصات فردی مدیر</h4><p>اطلاعات هویتی مدیر مؤسسه</p></div></div>
        <div class="fields">
          <div class="field"><label>نام <span class="req">*</span></label><input id="obFirstName" value="${esc(onboardData.firstName||'')}" placeholder="مثلاً علی"></div>
          <div class="field"><label>نام خانوادگی <span class="req">*</span></label><input id="obLastName" value="${esc(onboardData.lastName||'')}" placeholder="مثلاً رضایی"></div>
          <div class="field"><label>شماره تماس <span class="req">*</span></label><input id="obPhone" value="${esc(onboardData.phone||'')}" placeholder="09121234567" maxlength="11"></div>
          <div class="field"><label>کد ملی <span class="req">*</span></label><input id="obNid" value="${esc(onboardData.nid||'')}" placeholder="10 رقم" maxlength="10"></div>
          <div class="field"><label>نام پدر</label><input id="obFather" value="${esc(onboardData.fatherName||'')}" placeholder="مثلاً حسین"></div>
          <div class="field"><label>تاریخ تولد</label><input id="obBirth" value="${esc(onboardData.birthDate||'')}" placeholder="1370/05/02"></div>
        </div>
      `;
    } else if (onboardStep === 2) {
      stepHtml = `
        <div class="onb-step"><span class="sn">۲</span><div><h4>اطلاعات مؤسسه مالی</h4><p>مشخصات قرض‌الحسنه یا صندوق</p></div></div>
        <div class="fields">
          <div class="field full"><label>نام مؤسسه <span class="req">*</span></label><input id="obInstName" value="${esc(onboardData.institutionName||'')}" placeholder="مثلاً قرض‌الحسنه مهرگان"></div>
          <div class="field"><label>تاریخ تأسیس</label><input id="obEstDate" value="${esc(onboardData.establishedAt||'')}" placeholder="1390/01/01"></div>
          <div class="field full"><label>آدرس مؤسسه</label><textarea id="obAddress" rows="2" placeholder="تهران، خیابان...">${esc(onboardData.address||'')}</textarea></div>
          <div class="field"><label>تعداد اقساط پیش‌فرض</label><input id="obInstCount" type="number" min="1" max="120" value="${esc(onboardData.installmentsCount||'12')}" placeholder="مثلاً 12"><span class="help">متغیر - هر عددی (1 تا 120)</span></div>
          <div class="field"><label>دوره اقساط</label><select id="obPeriod"><option value="monthly" ${!onboardData.installmentPeriod||onboardData.installmentPeriod=='monthly'?'selected':''}>ماهانه</option><option value="bimonthly" ${onboardData.installmentPeriod=='bimonthly'?'selected':''}>دوماه یک‌بار</option><option value="quarterly" ${onboardData.installmentPeriod=='quarterly'?'selected':''}>سه‌ماه یک‌بار</option></select></div>
          <div class="field"><label>واحد پول</label><select id="obCurrency"><option ${!onboardData.currency||onboardData.currency=='تومان'?'selected':''}>تومان</option><option ${onboardData.currency=='ریال'?'selected':''}>ریال</option></select></div>
          <div class="field"><label>کارمزد ٪</label><input id="obFee" type="number" value="${esc(onboardData.feePercent||'4')}" min="0" max="100"></div>
          <div class="field full"><label>فیلدهای اعضا (اختیاری)</label><div class="chips" style="flex-wrap:wrap">${['نام','نام پدر','موبایل','کدملی','تاریخ تولد','آدرس','شغل'].map(f=>`<span class="chip ${onboardData.memberFields&&onboardData.memberFields.includes(f)?'on':''}" data-mf="${f}">${f}</span>`).join('')}</div><small>فیلدهای پیش‌فرض اعضا - بعداً در تنظیمات قابل تغییر</small></div>
        </div>
        <div class="alert a-info" style="margin-top:12px"><span class="al-ic">${icon('info',16)}</span><div>پس از تأیید، ایمیل <b>${esc(genInstitutionEmail(onboardData.institutionName||'inst', onboardData.nid||''))}</b> برای اتصال ربات‌ها ساخته می‌شود.</div></div>
      `;
    } else {
      stepHtml = `
        <div class="onb-step"><span class="sn">۳</span><div><h4>انتخاب پلن</h4><p>پلن مورد نظر خود را انتخاب کنید (فعلاً نمایشی)</p></div></div>
        <div class="plans">
          <div class="plan on"><h5>پلن پایه</h5><p>رایگان - تا 100 عضو</p><span class="badge b-green">فعال</span></div>
          <div class="plan" style="opacity:.6"><h5>پلن حرفه‌ای</h5><p>به‌زودی</p></div>
          <div class="plan" style="opacity:.6"><h5>پلن سازمانی</h5><p>به‌زودی</p></div>
        </div>
        <div class="alert a-ok" style="margin-top:16px"><span class="al-ic">${icon('check',16)}</span><div><b>آماده ایجاد حساب!</b><br>مدیر: ${esc(onboardData.firstName||'')+' '+esc(onboardData.lastName||'')} - مؤسسه: ${esc(onboardData.institutionName||'')}<br>ایمیل: ${esc(genInstitutionEmail(onboardData.institutionName||'inst', onboardData.nid||''))}</div></div>
      `;
    }
  } else {
    if (onboardStep === 1) {
      stepHtml = `
        <div class="onb-step"><span class="sn">۱</span><div><h4>مشخصات فردی</h4><p>اطلاعات هویتی شما</p></div></div>
        <div class="fields">
          <div class="field"><label>نام <span class="req">*</span></label><input id="obFirstName" value="${esc(onboardData.firstName||'')}" placeholder="مثلاً علی"></div>
          <div class="field"><label>نام خانوادگی <span class="req">*</span></label><input id="obLastName" value="${esc(onboardData.lastName||'')}" placeholder="مثلاً رضایی"></div>
          <div class="field"><label>شماره تماس <span class="req">*</span></label><input id="obPhone" value="${esc(onboardData.phone||'')}" placeholder="09121234567" maxlength="11"></div>
          <div class="field"><label>کد ملی <span class="req">*</span></label><input id="obNid" value="${esc(onboardData.nid||'')}" placeholder="10 رقم" maxlength="10"></div>
          <div class="field"><label>نام پدر</label><input id="obFather" value="${esc(onboardData.fatherName||'')}" placeholder="مثلاً حسین"></div>
          <div class="field"><label>تاریخ تولد</label><input id="obBirth" value="${esc(onboardData.birthDate||'')}" placeholder="1370/05/02"></div>
        </div>
      `;
    } else {
      stepHtml = `
        <div class="onb-step"><span class="sn">۲</span><div><h4>اتصال به مؤسسه</h4><p>نام مؤسسه را وارد کنید یا بعداً اضافه کنید</p></div></div>
        <div class="fields">
          <div class="field full"><label>نام مؤسسه (اختیاری)</label><input id="obInstName" value="${esc(onboardData.institutionName||'')}" placeholder="مثلاً قرض‌الحسنه مهرگان"><span class="help">اگر نام مؤسسه را دارید وارد کنید و منتظر تأیید مدیر بمانید. اگر ندارید خالی بگذارید و بعداً در پنل خود اضافه کنید.</span></div>
        </div>
        <div class="alert a-info" style="margin-top:12px"><span class="al-ic">${icon('info',16)}</span><div>پس از ثبت‌نام، می‌توانید در پنل کاربری خود درخواست اتصال به مؤسسه جدید بدهید.</div></div>
      `;
    }
  }

  const totalSteps = onboardRole==='manager' ? 3 : 2;
  return `
    <a href="Hesabat.html" class="login-back">${icon('arrowL',14)} بازگشت به صفحه اصلی</a>
    <div class="login-card" style="max-width:640px">
      <span class="lg-brand">${icon('bank',24)} حساب‌ها</span>
      <h2>افتتاح حساب جدید</h2>
      <p class="login-sub">نقش خود را انتخاب کنید</p>
      
      <div class="role-sel">
        ${roleBtn('manager','مدیر مؤسسه','bank')}
        ${roleBtn('user','متقاضی وام / کاربر','user')}
      </div>

      <div class="steps-line">
        ${Array.from({length:totalSteps},(_,i)=>`<span class="st ${i+1===onboardStep?'cur':''} ${i+1<onboardStep?'done':''}"><i>${faDigits(i+1)}</i></span>`).join('<span class="st-sep"></span>')}
      </div>

      <div id="onbBody">${stepHtml}</div>

      <div class="field-row" style="justify-content:space-between;margin-top:18px">
        <button class="btn btn-ghost btn-sm" id="obPrev" ${onboardStep===1?'disabled style="opacity:.4"':''}>${icon('chevE',14)} مرحله قبل</button>
        <div style="display:flex;gap:8px">
          <a href="Panel.html" class="btn btn-ghost btn-sm">انصراف</a>
          <button class="btn btn-solid btn-sm" id="obNext">${onboardStep===totalSteps ? icon('check',14)+' ایجاد حساب' : 'مرحله بعد '+icon('chevS',14)}</button>
        </div>
      </div>

      <div id="obAlert" style="margin-top:12px"></div>
    </div>
  `;
}

function bindOnboarding(){
  // نقش
  document.querySelectorAll('.role-btn').forEach(b=>{
    b.onclick = ()=>{
      onboardRole = b.dataset.role;
      onboardStep = 1;
      const wrap = document.querySelector('.login-wrap');
      if (wrap) { wrap.innerHTML = onboardingHtml(); bindOnboarding(); }
    };
  });

  // فیلدهای اعضا
  document.querySelectorAll('[data-mf]').forEach(ch=>{
    ch.onclick = ()=>{
      ch.classList.toggle('on');
      onboardData.memberFields = Array.from(document.querySelectorAll('[data-mf].on')).map(x=>x.dataset.mf);
    };
  });

  // قبلی
  const prev = document.getElementById('obPrev');
  if (prev) prev.onclick = ()=>{
    if (onboardStep>1) { saveOnboardStep(); onboardStep--; const wrap=document.querySelector('.login-wrap'); wrap.innerHTML=onboardingHtml(); bindOnboarding(); }
  };

  // بعدی / ایجاد
  const next = document.getElementById('obNext');
  if (next) next.onclick = async ()=>{
    if (!validateOnboardStep()) return;
    saveOnboardStep();
    const totalSteps = onboardRole==='manager'?3:2;
    if (onboardStep < totalSteps) {
      onboardStep++;
      const wrap=document.querySelector('.login-wrap');
      wrap.innerHTML=onboardingHtml();
      bindOnboarding();
    } else {
      await submitOnboarding();
    }
  };

  // تاریخ‌ها
  const birth = document.getElementById('obBirth');
  if (birth) attachJDate(birth);
  const est = document.getElementById('obEstDate');
  if (est) attachJDate(est);
}

function saveOnboardStep(){
  const g = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };
  if (onboardStep===1) {
    onboardData.firstName = g('obFirstName');
    onboardData.lastName = g('obLastName');
    onboardData.phone = g('obPhone');
    onboardData.nid = g('obNid');
    onboardData.fatherName = g('obFather');
    onboardData.birthDate = g('obBirth');
  } else if (onboardStep===2) {
    onboardData.institutionName = g('obInstName');
    onboardData.establishedAt = g('obEstDate');
    onboardData.address = g('obAddress');
    const ic = document.getElementById('obInstCount'); if (ic) onboardData.installmentsCount = ic.value;
    const pr = document.getElementById('obPeriod'); if (pr) onboardData.installmentPeriod = pr.value;
    const cur = document.getElementById('obCurrency'); if (cur) onboardData.currency = cur.value;
    const fee = document.getElementById('obFee'); if (fee) onboardData.feePercent = fee.value;
    // memberFields already saved via chips
  }
  try { localStorage.setItem(ONBOARD_KEY, JSON.stringify({role:onboardRole, step:onboardStep, data:onboardData})); } catch(e){}
}

function validateOnboardStep(){
  const alertBox = document.getElementById('obAlert');
  if (alertBox) alertBox.innerHTML = '';
  const g = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };
  let err = '';
  if (onboardStep===1) {
    if (!g('obFirstName') || g('obFirstName').length<2) err = 'نام را کامل وارد کنید.';
    else if (!g('obLastName') || g('obLastName').length<2) err = 'نام خانوادگی را کامل وارد کنید.';
    else if (!/^09\d{9}$/.test(faToEn(g('obPhone')))) err = 'شماره تماس باید 11 رقم و با 09 شروع شود.';
    else if (!/^\d{10}$/.test(faToEn(g('obNid')))) err = 'کد ملی باید 10 رقم باشد.';
  } else if (onboardStep===2 && onboardRole==='manager') {
    if (!g('obInstName') || g('obInstName').length<3) err = 'نام مؤسسه الزامی است.';
  }
  if (err) {
    if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><span class="al-ic">${icon('warn',16)}</span><div>${err}</div></div>`;
    return false;
  }
  return true;
}

async function submitOnboarding(){
  const btn = document.getElementById('obNext');
  const alertBox = document.getElementById('obAlert');
  if (btn) { btn.disabled=true; btn.textContent='در حال ایجاد...'; }

  // ساخت payload برای API
  const payload = {
    firstName: onboardData.firstName,
    lastName: onboardData.lastName,
    phone: onboardData.phone,
    nid: onboardData.nid,
    fatherName: onboardData.fatherName,
    birthDate: onboardData.birthDate ? (J.parse(onboardData.birthDate) ? J.j2iso(J.parse(onboardData.birthDate).jy, J.parse(onboardData.birthDate).jm, J.parse(onboardData.birthDate).jd) : null) : null,
    roleType: onboardRole,
    institutionName: onboardData.institutionName,
    institutionSlug: onboardData.institutionName ? onboardData.institutionName.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30) : '',
    establishedAt: onboardData.establishedAt ? (J.parse(onboardData.establishedAt) ? J.j2iso(J.parse(onboardData.establishedAt).jy, J.parse(onboardData.establishedAt).jm, J.parse(onboardData.establishedAt).jd) : null) : null,
    address: onboardData.address,
    installmentsCount: onboardData.installmentsCount,
    installmentPeriod: onboardData.installmentPeriod,
    currency: onboardData.currency,
    feePercent: onboardData.feePercent,
    memberFields: (onboardData.memberFields||[]).map(label=>({label, type:'text', required: label==='نام'})),
    email: genInstitutionEmail(onboardData.institutionName||'inst', onboardData.nid||'')
  };

  // اول سعی کن به سرور بزنی، اگر نشد برو حالت دمو — '' هم معتبر است (same-origin)
  let serverOk = false;
  try {
    if (typeof SRV !== 'undefined' && typeof SRV.base === 'string' && typeof srvFetch === 'function') {
      const res = await srvFetch('POST', '/api/auth/register-v2', payload);
      SRV.token = res.token;
      SRV.user = res.user;
      if (res.institutionId) {
        SRV.instId = res.institutionId;
        SRV.instName = onboardData.institutionName;
        SRV.on = true;
      }
      try { localStorage.setItem(SRV_KEY, JSON.stringify(SRV)); } catch(e){}
      toast('حساب با موفقیت ساخته شد! در حال ورود...','ok');
      setTimeout(()=>{ location.href='Panel.html#/app/dashboard'; }, 800);
      serverOk = true;
      return;
    }
  } catch(e) {
    console.warn('[onboard] server register failed, falling back to demo:', e.message);
    // اگر خطای شبکه بود، برو دمو؛ اگر خطای منطقی (مثلاً تکراری) بود، نشان بده
    if (e && e.network) {
      if (alertBox) alertBox.innerHTML = `<div class="alert a-warn"><span class="al-ic">${icon('info',16)}</span><div>سرور در دسترس نیست، حساب دمو ساخته می‌شود...</div></div>`;
    } else if (e && e.status && e.status>=400 && e.status<500) {
      if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><span class="al-ic">${icon('warn',16)}</span><div>خطا: ${esc(e.message)}</div></div>`;
      if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
      return;
    }
    // در غیر اینصورت ادامه بده به دمو
  }
  if (serverOk) return;

  // حالت دمو - ذخیره در localStorage
  try {
    const newUser = {
      id: 'u'+Date.now(),
      name: payload.firstName+' '+payload.lastName,
      username: payload.phone,
      mobile: payload.phone,
      phone: payload.phone,
      nationalId: payload.nid,
      nid: payload.nid,
      father: payload.fatherName,
      birthDate: onboardData.birthDate||'',
      role: onboardRole==='manager' ? 'admin' : 'viewer',
      roleType: onboardRole,
      institutions: payload.institutionName||'',
      status:'active',
      lastLogin: J.nowIso(),
      email: payload.email
    };
    DB.users.push(newUser);
    if (onboardRole==='manager' && payload.institutionName) {
      // مؤسسه جدید = شروع تمیز، نه 30 عضو نمونه
      DB.members = [];
      DB.loans = [];
      DB.installments = [];
      DB.payments = [];
      DB.txns = [];
      DB.funds = [{id:'f1', name: payload.institutionName, status:'active'}];
      DB.accounts = [{id:'a1', fundId:'f1', name:'صندوق اصلی', number:'', type:'cash', initialBalance:0, balance:0, status:'active'}];
      DB.audit = [];
      DB.counters = {member:0, loan:0};
      DB.settings.institution.name = payload.institutionName;
      DB.settings.institution.address = payload.address||'';
      DB.settings.institution.establishedAt = onboardData.establishedAt||'';
      DB.settings.institution.email = payload.email; // ایمیل ربات hes.com
      DB.settings.currency = payload.currency||'تومان';
      DB.settings.loanDefaults = {
        months: parseInt(payload.installmentsCount)||12,
        interval: payload.installmentPeriod==='monthly'?1:payload.installmentPeriod==='bimonthly'?2:3,
        rate: parseFloat(payload.feePercent)||4
      };
      if (alertBox) alertBox.innerHTML = `<div class="alert a-info"><div>مؤسسه «${esc(payload.institutionName)}» با ایمیل ربات <b dir="ltr">${esc(payload.email)}</b> ساخته شد و دیتابیس دمو تمیز شد (0 عضو).</div></div>`;
    } else {
      // کاربر عادی دمو - مؤسسه ندارد
      DB.settings.institution.email = payload.email;
    }
    saveDb();
    SESSION = { username:newUser.username, name:newUser.name, role:newUser.role, roleType: onboardRole };
    try { localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); } catch(e){}
    toast('حساب دمو ساخته شد!','ok');
    setTimeout(()=>{ location.hash='#/app/dashboard'; location.reload(); }, 600);
  } catch(e) {
    if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><div>خطا: ${esc(e.message)}</div></div>`;
  }
  if (btn) { btn.disabled=false; btn.innerHTML = icon('check',14)+' ایجاد حساب'; }
}

// ── تنظیمات جدید ──
function patchSettings(){
  // حذف اتصال PostgreSQL از تنظیمات
  const origRenderSettings = window.renderSettings;
  if (origRenderSettings && !origRenderSettings._patched) {
    window.renderSettings = function(){
      origRenderSettings();
      // حذف secSrv
      const srvSec = document.getElementById('secSrv');
      if (srvSec) srvSec.remove();
      
      // اطلاعات مؤسسه را با داده‌های کاربر پر کن
      const orgBox = document.querySelector('#secOrg .sec-b');
      if (orgBox && DB && DB.settings) {
        const inst = DB.settings.institution;
        const nameInput = orgBox.querySelector('#setOrgName');
        if (nameInput && !nameInput.value) nameInput.value = inst.name||'';
        // آیکون مؤسسه - درست کردن ظاهر
        const fileInput = orgBox.querySelector('#setLogo');
        if (fileInput) {
          fileInput.style.display = 'none';
          const prev = orgBox.querySelector('#logoPrev');
          if (prev && !prev.dataset.fixed) {
            prev.dataset.fixed = '1';
            prev.style.cursor = 'pointer';
            prev.title = 'کلیک برای انتخاب آیکون';
            prev.onclick = ()=> fileInput.click();
            // دکمه انتخاب آیکون زیبا
            const btn = document.createElement('button');
            btn.className = 'btn btn-soft btn-sm';
            btn.style.marginTop = '8px';
            btn.innerHTML = icon('image',14)+' انتخاب آیکون مؤسسه';
            btn.onclick = ()=> fileInput.click();
            prev.parentNode.appendChild(btn);
          }
        }
      }

      // حذف قالب شماره‌گذاری اعضا
      const finBox = document.querySelector('#secFin .sec-b');
      if (finBox) {
        const tplField = finBox.querySelector('#setNoTpl');
        if (tplField) {
          const field = tplField.closest('.field');
          if (field) field.remove();
        }
      }

      // داده‌ها و ممیزی: دکمه شروع از صفر برگردانده شد per درخواست کاربر
      // دیگر حذف نمی‌کنیم — هر دو دکمه بازنشانی و شروع از صفر بماند

      // فیلدها را بر اساس تنظیمات اولیه پر کن
      const fldBox = document.querySelector('#secFld .sec-b');
      if (fldBox && SRV && SRV.on) {
        // در حالت سرور، فیلدها از سرور می‌آیند - دست نزن
      }
    };
    window.renderSettings._patched = true;
  }
}

// ── شماره عضویت خودکار ──
function patchMemberForm(){
  const origMemberForm = window.memberForm;
  if (origMemberForm && !origMemberForm._patched) {
    window.memberForm = function(member){
      const isEdit = !!member;
      // اگر ویرایش است، همان قدیمی
      if (isEdit) return origMemberForm(member);
      
      // برای افزودن جدید، شماره عضویت خودکار
      const m = openModal({
        title: 'افزودن عضو جدید',
        sub: 'شماره عضویت به‌صورت خودکار ساخته می‌شود',
        size:'lg',
        body: '<div class="fields">' +
          '<div class="field"><label>نام <span class="req">*</span></label><input id="mfName" placeholder="نام"><span class="err-msg"></span></div>' +
          '<div class="field"><label>نام خانوادگی <span class="req">*</span></label><input id="mfFamily" placeholder="نام خانوادگی"><span class="err-msg"></span></div>' +
          '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input id="mfMobile" placeholder="09121234567" maxlength="11"><span class="err-msg"></span></div>' +
          '<div class="field"><label>کد ملی <span class="req">*</span></label><input id="mfNid" placeholder="10 رقم" maxlength="10"><span class="err-msg"></span></div>' +
          '<div class="field"><label>نام پدر</label><input id="mfFather" placeholder="نام پدر"></div>' +
          '<div class="field"><label>تاریخ تولد <span class="req">*</span></label><input id="mfBirth" placeholder="1370/05/02"><span class="err-msg"></span></div>' +
          '<div class="field"><label>شماره عضویت (خودکار)</label><input id="mfNo" disabled style="background:var(--card-2);font-family:monospace;direction:ltr"><span class="help">از نام انگلیسی + کدملی ساخته می‌شود</span></div>' +
        '</div>',
        foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="mfSave">'+icon('check',14)+' ذخیره عضو</button>',
        onOpen(h){
          attachJDate(h.el.querySelector('#mfBirth'));
          const gen = ()=>{
            const fn = h.el.querySelector('#mfName').value;
            const ln = h.el.querySelector('#mfFamily').value;
            const nid = h.el.querySelector('#mfNid').value;
            h.el.querySelector('#mfNo').value = genMemberNo(fn, ln, nid);
          };
          h.el.querySelector('#mfName').addEventListener('input', gen);
          h.el.querySelector('#mfFamily').addEventListener('input', gen);
          h.el.querySelector('#mfNid').addEventListener('input', gen);
          gen();

          h.el.querySelector('[data-x]').onclick = ()=>h.close();
          h.el.querySelector('#mfSave').onclick = ()=>{
            const name = h.el.querySelector('#mfName').value.trim();
            const family = h.el.querySelector('#mfFamily').value.trim();
            const mobile = h.el.querySelector('#mfMobile').value.trim();
            const nid = h.el.querySelector('#mfNid').value.trim();
            const father = h.el.querySelector('#mfFather').value.trim();
            const birth = h.el.querySelector('#mfBirth');
            const memberNo = h.el.querySelector('#mfNo').value;

            let ok = true;
            const check = (sel, cond, msg)=>{
              const el = h.el.querySelector(sel);
              if (cond) clearErr(el); else { markErr(el, msg); ok=false; }
            };
            check('#mfName', name.length>=2, 'نام الزامی است');
            check('#mfFamily', family.length>=2, 'نام خانوادگی الزامی است');
            check('#mfMobile', /^09\d{9}$/.test(faToEn(mobile)), 'موبایل معتبر نیست');
            check('#mfNid', /^\d{10}$/.test(faToEn(nid)), 'کدملی 10 رقم');
            if (!ok) { toast('برخی فیلدها ناقص است','err'); return; }

            const fullName = name + ' ' + family;
            const jb = birth ? J.parse(birth.value) : null;
            const nm = {
              id: uid('m'),
              name: fullName,
              father: father,
              mobile: faToEn(mobile).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),
              nationalId: faToEn(nid).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]),
              birthDate: jb ? jb.jy+'/'+String(jb.jm).padStart(2,'0')+'/'+String(jb.jd).padStart(2,'0') : '',
              memberNo: memberNo,
              status:'active',
              joinedAt: J.todayIso(),
              createdAt: J.nowIso(),
              x:{}
            };
            DB.members.push(nm);
            audit('افزودن عضو جدید '+fullName+' ('+memberNo+')', 'member:'+nm.id);
            saveDb();
            toast('عضو «'+fullName+'» با شماره '+memberNo+' ثبت شد.','ok');
            h.close();
            route();
          };
        }
      });
    };
    window.memberForm._patched = true;
  }
}

// ── پنل کاربر ──
function patchUserPanel(){
  // اگر کاربر عادی است، پرونده شخصی را مثل مدیر نشان بده ولی با درخواست اتصال به مؤسسه
  const origMemberProfile = window.memberProfile;
  if (origMemberProfile && !origMemberProfile._userPatched) {
    // برای نقش کاربر، داشبورد متفاوت
    const origDashboard = window.pageDashboard;
    if (origDashboard) {
      window.pageDashboard = function(){
        if (SESSION && SESSION.roleType==='user') {
          // پنل کاربر ساده
          const main = document.getElementById('main');
          const user = DB.users.find(u=>u.username===SESSION.username) || {name:SESSION.name};
          main.innerHTML = `
            <div class="page-head"><div><h1>پنل کاربری</h1><div class="ph-sub">خوش آمدید ${esc(user.name||'')} - نقش: کاربر</div></div></div>
            <div class="grid g-2">
              <div class="card"><div class="card-h"><h3>اطلاعات شخصی</h3></div><div class="card-b">
                <div class="kv-grid">
                  <div class="kv"><span>نام</span><b>${esc(user.name||'—')}</b></div>
                  <div class="kv"><span>موبایل</span><b class="c-num">${esc(user.mobile||'—')}</b></div>
                  <div class="kv"><span>کد ملی</span><b class="c-num">${esc(user.nationalId||'—')}</b></div>
                  <div class="kv"><span>مؤسسه</span><b>${esc(user.institutions||'هنوز عضو مؤسسه‌ای نیستید')}</b></div>
                </div>
              </div></div>
              <div class="card"><div class="card-h"><h3>درخواست اتصال به مؤسسه جدید</h3></div><div class="card-b">
                <div class="fields">
                  <div class="field full"><label>نام مؤسسه</label><input id="reqInstName" placeholder="نام مؤسسه مورد نظر"><span class="help">نام مؤسسه‌ای که می‌خواهید به آن بپیوندید را وارد کنید و منتظر تأیید مدیر بمانید.</span></div>
                </div>
                <button class="btn btn-solid btn-sm" id="btnReqJoin" style="margin-top:12px">${icon('send',14)} ارسال درخواست</button>
                <div id="joinStatus" style="margin-top:12px"></div>
              </div></div>
            </div>
          `;
          const btn = document.getElementById('btnReqJoin');
          if (btn) btn.onclick = async ()=>{
            const name = document.getElementById('reqInstName').value.trim();
            if (!name) { toast('نام مؤسسه را وارد کنید','err'); return; }
            try {
              if (typeof SRV !== 'undefined' && SRV.token) {
                const r = await srvFetch('POST','/api/auth/request-join',{institutionName:name});
                document.getElementById('joinStatus').innerHTML = `<div class="alert a-ok"><span class="al-ic">${icon('check',16)}</span><div>درخواست شما برای مؤسسه «${esc(name)}» ارسال شد و در انتظار تأیید مدیر است.</div></div>`;
                toast('درخواست ارسال شد','ok');
              } else {
                document.getElementById('joinStatus').innerHTML = `<div class="alert a-ok"><div>درخواست برای «${esc(name)}» ثبت شد (دمو).</div></div>`;
              }
            } catch(e){
              document.getElementById('joinStatus').innerHTML = `<div class="alert a-err"><div>${esc(e.message)}</div></div>`;
            }
          };
          return;
        }
        return origDashboard();
      };
    }
    window.memberProfile._userPatched = true;
  }
}

// ── فونت پاپ‌آپ وضعیت کاربر ──
function fixPopupFont(){
  const style = document.createElement('style');
  style.textContent = `
    .drop-panel, .notif-item, .dp-item, .profile-chip, .pc-t, .pc-t b, .pc-t span {
      font-family: 'IBM Plex Sans Arabic', 'DM Sans', Tahoma, sans-serif !important;
    }
    .badge, .stat-val, .c-fa-num, .c-num {
      font-family: 'IBM Plex Sans Arabic', monospace !important;
    }
    .role-btn {
      display:flex;align-items:center;gap:12px;padding:14px 16px;border:1.5px solid var(--line);border-radius:14px;background:var(--card);cursor:pointer;transition:all .2s;width:100%;text-align:right;margin-bottom:8px;
    }
    .role-btn.on { border-color:var(--green-deep); background:rgba(28,110,49,.08); }
    .role-btn b { display:block; font-size:.95rem; }
    .role-btn small { display:block; font-size:.78rem; color:var(--ink-2); margin-top:2px; }
    .role-sel { display:flex; flex-direction:column; gap:8px; margin:16px 0; }
    .onb-step { display:flex; gap:12px; align-items:flex-start; margin:18px 0 12px; padding-bottom:12px; border-bottom:1px dashed var(--line); }
    .onb-step .sn { width:32px; height:32px; border-radius:50%; background:var(--green-deep); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex:none; }
    .onb-step h4 { margin:0; font-size:1rem; }
    .onb-step p { margin:2px 0 0; font-size:.82rem; color:var(--ink-2); }
    .steps-line { display:flex; align-items:center; gap:8px; margin:16px 0; justify-content:center; }
    .steps-line .st { width:28px; height:28px; border-radius:50%; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:.85rem; background:var(--card); }
    .steps-line .st.cur { background:var(--green-deep); color:#fff; border-color:var(--green-deep); }
    .steps-line .st.done { background:var(--lime); color:var(--ink); border-color:var(--lime); }
    .steps-line .st-sep { width:24px; height:2px; background:var(--line); }
    .plans { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin:16px 0; }
    .plan { border:1.5px solid var(--line); border-radius:12px; padding:16px; text-align:center; cursor:pointer; }
    .plan.on { border-color:var(--green-deep); background:rgba(28,110,49,.06); }
    .plan h5 { margin:0 0 4px; }
    .plan p { font-size:.82rem; color:var(--ink-2); margin:0 0 8px; }
  `;
  document.head.appendChild(style);
}

// ── اجرا ──
(function(){
  // صبر کن تا همه چیز لود شود
  function init(){
    if (typeof DB === 'undefined' || typeof SESSION === 'undefined') {
      setTimeout(init, 100);
      return;
    }
    bindNewLogin();
    patchSettings();
    patchMemberForm();
    patchUserPanel();
    fixPopupFont();

    // روتر برای onboarding - بسیار مقاوم
    function doOnboardRoute(){
      const h = (location.hash || '').toLowerCase();
      if (h.includes('onboarding')) {
        console.log('[onboard] route intercepted', h);
        if (typeof showView === 'function') { try { showView('login'); } catch(e){} }
        const lv = document.getElementById('view-login');
        if (lv) lv.classList.add('active');
        const av = document.getElementById('view-app');
        if (av) av.classList.remove('active');
        setTimeout(()=>{
          if (typeof renderOnboarding === 'function') renderOnboarding();
          else {
            const wrap = document.querySelector('.login-wrap');
            if (wrap) { wrap.innerHTML = onboardingHtml(); bindOnboarding(); }
          }
        }, 30);
        return true;
      }
      return false;
    }

    const origRoute = window.route;
    if (origRoute && !origRoute._onbPatched) {
      window.route = function(){
        if (doOnboardRoute()) return;
        return origRoute();
      };
      window.route._onbPatched = true;
    }
    // شنونده مستقیم hashchange برای اطمینان
    window.addEventListener('hashchange', function(){
      if (doOnboardRoute()) {
        console.log('[onboard] hashchange handled');
      }
    });

    // اگر در Hesabat.html هستیم، لینک ورود را به Panel.html با لاگین جدید وصل کن
    if (location.pathname.includes('Hesabat.html') || document.getElementById('lnkLogin')) {
      const loginLinks = document.querySelectorAll('#lnkLogin, #lnkOpen, #lnkCta');
      loginLinks.forEach(a=>{
        if (a) {
          if (a.id === 'lnkOpen' || a.id === 'lnkCta') a.href = 'Panel.html#/onboarding';
          else a.href = 'Panel.html';
        }
      });
    }

    // اگر از اول با #/onboarding آمدیم
    setTimeout(()=>{ doOnboardRoute(); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 200);
  }

  // برای حالت لاگین مستقیم - چند بار تلاش کن
  function tryOnboardDirect(){
    const h = (location.hash || '').toLowerCase();
    if (h.includes('onboarding')) {
      console.log('[onboard] direct try', h);
      if (typeof renderOnboarding === 'function') renderOnboarding();
      else {
        const wrap = document.querySelector('.login-wrap');
        if (wrap) { wrap.innerHTML = onboardingHtml(); bindOnboarding(); }
      }
    } else {
      bindNewLogin();
    }
  }
  setTimeout(tryOnboardDirect, 300);
  setTimeout(tryOnboardDirect, 800);
  setTimeout(tryOnboardDirect, 1500);
})();
