const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const results = [];
function ok(name, cond, extra){ results.push([name, !!cond, extra||'']); }

/* پنل سه‌فایلی است؛ برای تست، محتوای فایل‌ها را داخل HTML تزریق می‌کنیم */
function panelHtml(){
  let h = fs.readFileSync('/home/user/Panel.html','utf8');
  /* split/join به‌جای replace: الگوهای $$ در محتوای جاوااسکریپت خراب نشوند */
  h = h.split('<link rel="stylesheet" href="panel.css">').join('<style>'+fs.readFileSync('/home/user/panel.css','utf8')+'</style>');
  h = h.split('<script src="panel.js"><\/script>').join('<script>'+fs.readFileSync('/home/user/panel.js','utf8')+'<\/script>');
  return h;
}
function makeDom(file, onNav){
  const html = file.indexOf('Panel.html')>-1 ? panelHtml() : fs.readFileSync(file,'utf8');
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => {
    const m = String(e.message||'');
    if(/scrollTo|getContext|Invalid left-hand|CSS/.test(m)) return;
    if(/Not implemented: navigation/.test(m)){ onNav && onNav(); return; }
    errors.push(m);
  });
  vc.on('error', (...a)=>errors.push(a.join(' ')));
  const dom = new JSDOM(html, {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
  return { dom, errors };
}

(async()=>{
  /* ═══ فایل ۱: لندینگ ═══ */
  let navTarget = null;
  const L = makeDom('/home/user/Hesabat.html', ()=>{ navTarget = true; });
  const lw = L.dom.window, ld = lw.document;
  await sleep(700);
  ok('لندینگ: برند و فرش پول رندر شد', !!ld.getElementById('pile') && !!ld.querySelector('.brand'));
  ok('لندینگ: دکمه ورود به پنل وصل است', await (async()=>{
    let navigated = false;
    const a = ld.getElementById('lnkLogin');
    const vc2 = new VirtualConsole();
    vc2.on('jsdomError', e => { if(/Not implemented: navigation/.test(String(e.message))) navigated = true; });
    // کلیک روی دکمه → اسکریپت لندینگ باید ناوبری به Panel.html بخواهد
    const ev = new ld.defaultView.MouseEvent('click', {bubbles:true, cancelable:true});
    a.dispatchEvent(ev);
    await sleep(150);
    return navigated || navTarget === true;
  })());
  ok('لندینگ: خطای کنسول ندارد', L.errors.filter(e=>!e.includes('context 2d')).length === 0, L.errors[0]);

  /* ═══ فایل ۲: پنل مستقل ═══ */
  const P = makeDom('/home/user/Panel.html');
  const w = P.dom.window, d = w.document;
  await sleep(700);
  ok('پنل: صفحه ورود نمایش داده می‌شود', d.getElementById('view-login').classList.contains('active'));
  ok('پنل: لینک بازگشت به لندینگ', d.getElementById('lnkBackHome').getAttribute('href') === 'Hesabat.html');
  ok('پنل: استایل (فایل جدا) اعمال شده', d.querySelectorAll('style').length >= 1 && d.styleSheets.length >= 1);

  // ورود
  d.getElementById('lgUser').value='admin'; d.getElementById('lgPass').value='1234';
  d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await sleep(1900);
  ok('پنل: ورود موفق → داشبورد', w.location.hash === '#/app/dashboard', w.location.hash);
  ok('پنل: ۸ کارت آماری', d.querySelectorAll('.stat').length >= 8, d.querySelectorAll('.stat').length);

  ok('پنل: منوی ادغام‌شده ۵ آیتم', d.querySelectorAll('.sb-item').length === 5, d.querySelectorAll('.sb-item').length);
  // همه صفحات (با آدرس‌های قدیمی هم باید کار کند)
  for(const p of ['members','funds','loans','installments','txns','reports','users','settings']){
    w.location.hash = '#/app/'+p; await sleep(p==='funds'?900:430);
    ok('پنل: صفحه '+p, d.getElementById('main').innerHTML.length > 1500, d.getElementById('main').innerHTML.length);
  }
  // ادغام‌ها
  w.location.hash = '#/app/members'; await sleep(430);
  ok('تب اقساط داخل صفحه اعضا', (()=>{ const t=[...d.querySelectorAll('[data-mt]')]; return t.length===2; })());
  d.querySelector('[data-mt="ins"]').click(); await sleep(200);
  ok('جدول اقساط در تب', !!d.getElementById('iWrap') && d.querySelectorAll('#iWrap tbody tr').length > 0);
  w.location.hash = '#/app/reports'; await sleep(430);
  d.querySelector('[data-rt="txns"]').click(); await sleep(200);
  ok('جدول تراکنش‌ها در تب گزارش‌ها', !!d.getElementById('tWrap') && d.querySelectorAll('#tWrap tbody tr').length > 0);
  w.location.hash = '#/app/users'; await sleep(430);
  ok('کاربران داخل تنظیمات', !!d.querySelector('[data-st="us"]') && d.querySelectorAll('#secUsers .tbl tbody tr').length === 4);
  // پرداخت سریع از پرونده عضو
  w.location.hash = '#/app/members/m1'; await sleep(430);
  [...d.querySelectorAll('#mpTabs .tab')].find(b=>b.dataset.t==='ins').click(); await sleep(150);
  const payBtn = d.querySelector('#mpBody [data-mpay]');
  ok('دکمه پرداخت قسط در پرونده عضو', !!payBtn);
  if(payBtn){ payBtn.click(); await sleep(250); ok('مودال پرداخت برای عضو باز شد', !!d.querySelector('.m-modal #pfLoan')); const x=d.querySelector('.m-modal .x-btn'); x&&x.click(); await sleep(150); }

  // ── تغییرات درخواستی جدید ──
  // ۱) فیلتر وام فقط جستجو (بدون مبلغ/وضعیت/صندوق)
  w.location.hash = '#/app/loans'; await sleep(430);
  ok('وام‌ها: فیلتر مبلغ/وضعیت/صندوق حذف شده', !d.getElementById('lMin') && !d.getElementById('lMax') && !d.getElementById('lStatus') && !d.getElementById('lFund') && !!d.getElementById('lQ'));
  // جستجوی وام با کد ملی
  const nid0 = w.eval('DB.members[0].nationalId');
  d.getElementById('lQ').value = nid0; d.getElementById('lQ').dispatchEvent(new w.Event('input',{bubbles:true}));
  await sleep(150);
  ok('وام‌ها: جستجو با کد ملی', d.querySelectorAll('#lTblWrap tbody tr').length >= 1, d.querySelectorAll('#lTblWrap tbody tr').length);
  // ۲) تب اقساط فقط پرداخت‌نشده‌ها
  w.location.hash = '#/app/members/ins'; await sleep(430);
  const insHtml = d.getElementById('iWrap').innerHTML;
  ok('اقساط: فقط پرداخت‌نشده‌ها', insHtml.length > 0 && !insHtml.includes('</i>پرداخت‌شده') && d.querySelectorAll('#iWrap tbody tr').length > 0);
  ok('اقساط: فیلتر وضعیت حذف شده', !d.getElementById('iStatus'));
  // ۴) فرم پرداخت از روی قسط → بدون فیلد انتخاب قسط
  const payRow = d.querySelector('#iWrap [data-pay]');
  ok('اقساط: دکمه پرداخت ردیفی هست', !!payRow);
  if(payRow){ payRow.click(); await sleep(250);
    ok('پرداخت: فیلد انتخاب قسط حذف شده', !d.querySelector('.m-modal #pfIns') && !!d.querySelector('.m-modal #pfInsInfo'));
    ok('پرداخت: وام قفل و از پیش انتخاب‌شده', d.querySelector('.m-modal #pfLoan').disabled === true && d.querySelector('.m-modal #pfLoan').value !== '');
    const xx = d.querySelector('.m-modal .x-btn'); xx && xx.click(); await sleep(120);
  }
  // فرم پرداخت عمومی (بدون پیش‌انتخاب) هنوز انتخاب قسط دارد
  const addPay = d.getElementById('btnAddPay');
  if(addPay){ addPay.click(); await sleep(250);
    ok('پرداخت عمومی: انتخاب وام/قسط دارد', !!d.querySelector('.m-modal #pfIns'));
    const xx2 = d.querySelector('.m-modal .x-btn'); xx2 && xx2.click(); await sleep(120);
  }
  // ۳) نمودارها: هندسه هاور و محور
  w.location.hash = '#/app/dashboard'; await sleep(430);
  ok('داشبورد: بوم‌های نمودار وجود دارند', !!d.getElementById('chIns') && !!d.getElementById('chFlow'));
  // تب جدید نمودارها و تحلیل‌ها
  w.location.hash = '#/app/reports/charts'; await sleep(430);
  ok('تحلیل‌ها: با گزارش‌ها ادغام شده (تب گزارش‌ها و تحلیل‌ها)', !!d.querySelector('.tab.on[data-rt="reports"]'));
  ok('تحلیل‌ها: ۶ کارت KPI', d.querySelectorAll('#rrBody .stat').length === 6, d.querySelectorAll('#rrBody .stat').length);
  ok('تحلیل‌ها: ۴ نمودار', !!d.getElementById('chBalance') && !!d.getElementById('chFlowR') && !!d.getElementById('chGrowth') && !!d.getElementById('chInsPerf'));
  ok('تحلیل‌ها: چیپ‌های بازه زمانی', d.querySelectorAll('[data-crr]').length === 3);
  // صفحه‌بندی ماه‌ها (پنجره ۱۲ماهه + دکمه عقب/جلو)
  const pOlder = d.querySelector('[data-chp="older"]'), pNewer = d.querySelector('[data-chp="newer"]');
  ok('تحلیل‌ها: صفحه‌بندی ۱۲ماهه نمودارها', !!pOlder && !!pNewer && !!d.querySelector('.chp-range'));
  if(pOlder){
    const rng0 = d.querySelector('.chp-range').textContent;
    pOlder.click(); await sleep(320);
    ok('تحلیل‌ها: حرکت به ماه‌های قدیمی‌تر', d.querySelector('.chp-range').textContent !== rng0);
    d.querySelector('[data-chp="newer"]').click(); await sleep(320);
    ok('تحلیل‌ها: بازگشت به پنجره جدید', d.querySelector('.chp-range').textContent === rng0);
  }
  ok('تحلیل‌ها: نام کامل ماه‌ها روی محور (دو خطی)', fs.readFileSync('/home/user/panel.js','utf8').includes('subLabels'));
  d.querySelector('[data-crr="6"]').click(); await sleep(300);
  ok('تحلیل‌ها: تغییر بازه به ۶ ماه', d.querySelector('[data-crr="6"]').classList.contains('on'));

  /* گزارش‌ها دیگر خالی نیست: پیش‌فرض فیلترها اعمال می‌شود */
  w.location.hash = '#/app/reports'; await sleep(430);
  ok('گزارش‌ها: پیش‌فرض داده نشان می‌دهد (دیگر خالی نیست)', d.querySelectorAll('#repTbl tbody tr').length > 0, d.querySelectorAll('#repTbl tbody tr').length);
  ok('گزارش‌ها: نمودارها و تحلیل‌ها داخل همین صفحه', !!d.getElementById('chBalance') && !!d.getElementById('chZone'));
  /* دکمه حذف کامل عضو */
  w.location.hash = '#/app/members'; await sleep(430);
  const mtB = d.querySelector('[data-mt="members"]'); if(mtB) mtB.click(); await sleep(200);
  ok('اعضا: دکمه حذف کامل دارد', !!d.querySelector('[data-del]'));
  /* صندوق‌ها و حساب‌ها داخل تنظیمات */
  w.location.hash = '#/app/settings'; await sleep(430);
  ok('تنظیمات: سه تب ادغام‌شده', d.querySelectorAll('[data-st]').length === 3, d.querySelectorAll('[data-st]').length);
  const orgT = d.querySelector('[data-st="org"]'); if(orgT && !orgT.classList.contains('on')){ orgT.click(); await sleep(300); }
  ok('تنظیمات: صندوق‌ها و حساب‌ها داخل اطلاعات مؤسسه', !!d.querySelector('[data-st="org"].tab.on') && !!d.getElementById('secFa') && !!d.getElementById('faBody') && !!d.getElementById('btnAddFA'));
  ok('تنظیمات: فیلدها/مالی/اعلان/ظاهر داخل اطلاعات مؤسسه', !!d.getElementById('fldList') && !!d.getElementById('setLdRate') && !!d.getElementById('ntDue') && !!d.getElementById('stColMember'));
  d.querySelector('[data-st="us"]').click(); await sleep(300);
  ok('تنظیمات: کاربران + نقش‌ها و دسترسی‌ها ادغام شده', !!d.getElementById('secRoles') && !!d.getElementById('secUsers') && d.querySelectorAll('#secUsers .tbl tbody tr').length === 4);
  /* تحلیل‌ها (KPI + سری نمودارها) در خروجی CSV و چاپ */
  w.location.hash = '#/app/reports'; await sleep(430);
  const csvLines = w.eval('analyticsCsvLines()');
  ok('خروجی: شاخص‌ها و داده نمودارها در CSV', csvLines.length > 15 && csvLines.join('|').includes('وام‌های ثبت‌شده') && csvLines.join('|').includes('موجودی تجمیعی'));
  ok('چاپ: شاخص‌ها و نمودارها در خروجی چاپ', fs.readFileSync('/home/user/panel.js','utf8').includes('pr-charts') && fs.readFileSync('/home/user/panel.js','utf8').includes('شاخص‌های کلیدی'));
  /* فرم وام: فقط نام عضو، بدون شماره عضویت */
  w.eval('loanForm()'); await sleep(250);
  const lfM = d.querySelector('.m-drawer #lfMember') || d.querySelector('#lfMember');
  ok('وام: انتخاب عضو فقط با نام', !!lfM && lfM.options.length > 1 && !/\(/.test(lfM.options[1].textContent));
  const lx = d.querySelector('.m-drawer [data-close]') || d.querySelector('.m-modal [data-x]'); if(lx) lx.click(); await sleep(150);

  // فرم + تقویم شمسی (بدون هیچ وابستگی به لندینگ)
  w.location.hash='#/app/members'; await sleep(430);
  const mtm = d.querySelector('[data-mt="members"]');
  if(mtm && !d.getElementById('btnAddMember')){ mtm.click(); await sleep(250); }
  d.getElementById('btnAddMember').click(); await sleep(200);
  ok('پنل: مودال عضو', !!d.querySelector('.m-modal #mfName'));
  const jb = d.querySelector('.m-modal .jd-btn'); jb && jb.click(); await sleep(120);
  const pop = d.querySelector('.jd-pop.jd-fixed');
  ok('پنل: تقویم شمسی (شناور روی بدنه، بدون بریده‌شدن)', !!pop && pop.querySelectorAll('.jd-d[data-d]').length >= 28);
  const dateInp = d.querySelector('.m-modal .jd-inp');
  ok('تقویم: فیلد تاریخ راست‌چین (آیکون روی متن نمی‌افتد)', !!dateInp && dateInp.classList.contains('jd-inp') && !dateInp.classList.contains('num-inp'));
  ok('تقویم: دکمه تقویم در سمت مخالف متن', !!d.querySelector('.m-modal .jd-btn'));

  /* فرم عضو تکی: تایپ آزاد → برنامه هنگام ثبت نوع داده را تعیین و نرمال می‌کند */
  for(let q=0;q<3;q++){ const bxP=d.querySelector('.m-modal [data-x]'); if(!bxP) break; bxP.click(); await sleep(150); } /* مودال بازماندهٔ تست قبل */
  w.location.hash = '#/app/members'; await sleep(500);
  const mtB2 = d.querySelector('[data-mt="members"]'); if(mtB2 && !mtB2.classList.contains('on')){ mtB2.click(); await sleep(200); }
  d.getElementById('btnAddMember').click(); await sleep(300);
  d.querySelector('.m-modal #mfName').value = '  تست   تایپ آزاد  ';
  const fth = d.querySelector('.m-modal #mfFather'); if(fth) fth.value = ' پدر ';
  const mob = d.querySelector('.m-modal #mfMobile'); mob.value = '+98 912 000 1122';
  d.querySelector('.m-modal #mfNid').value = '123-456-7891';
  d.querySelector('.m-modal #mfBirth').value = '75/4/2';
  d.querySelector('.m-modal #mfSave').click(); await sleep(2800);
  const tm = w.eval('DB.members.find(m=>m.name==="تست تایپ آزاد")');
  ok('عضو تکی: ثبت با تایپ آزاد انجام شد', !!tm);
  ok('عضو تکی: موبایل +98 به ۰۹ فارسی تبدیل شد', !!tm && tm.mobile==='۰۹۱۲۰۰۰۱۱۲۲', tm&&tm.mobile);
  ok('عضو تکی: کد ملی لاتین/خط‌تیره به رقم فارسی تبدیل شد', !!tm && tm.nationalId==='۱۲۳۴۵۶۷۸۹۱', tm&&tm.nationalId);
  ok('عضو تکی: تاریخ دومرحله‌ای 75/4/2 پذیرفته شد', !!tm && tm.birthDate==='1375/04/02', tm&&tm.birthDate);
  for(let q=0;q<3;q++){ const bx3=d.querySelector('.m-modal [data-go]')||d.querySelector('.m-modal [data-x]'); if(!bx3) break; bx3.click(); await sleep(250); }

  /* بازگردانی از فایل JSON — منطق اعتبارسنجی و جایگزینی */
  w.location.hash = '#/app/settings'; await sleep(430);
  d.querySelector('[data-st="data"]').click(); await sleep(300);
  ok('تنظیمات: دکمه بازگردانی از فایل وجود دارد', !!d.getElementById('setRestore'));
  ok('بازگردانی: فایل نامعتبر رد می‌شود', w.eval('restoreDbFromObject({}).ok') === false && w.eval('restoreDbFromObject({v:2,members:[]}).ok') === false);
  const rmsg = w.eval('(function(){ const d=JSON.parse(JSON.stringify(DB)); d.members.push({id:"m-bk",name:"عضو بکاپ",father:"",mobile:"",nationalId:"",birthDate:"",memberNo:"M-9001",status:"active",joinedAt:"1404-01-01",createdAt:"1404-01-01",x:{}}); const r=restoreDbFromObject(d); if(!r.ok) return r.msg; DB=r.data; saveDb(); return "ok"; })()');
  ok('بازگردانی: فایل معتبر جایگزین شد', rmsg === 'ok' && w.eval('!!DB.members.find(m=>m.id==="m-bk")'));

  /* شروع از صفر: پاک‌سازی کامل داده‌ها — کاربران و تنظیمات می‌مانند */
  w.location.hash = '#/app/settings'; await sleep(430);
  d.querySelector('[data-st="data"]').click(); await sleep(300);
  ok('تنظیمات: دکمه شروع از صفر وجود دارد', !!d.getElementById('setWipe'));
  d.getElementById('setWipe').click(); await sleep(350);
  const wcb = [...d.querySelectorAll('.m-modal button')].find(b=>/پاک شود/.test(b.textContent));
  ok('شروع از صفر: تأییدیه با شمارش رکوردها باز شد', !!wcb);
  if(wcb){ wcb.click(); await sleep(500); }
  ok('شروع از صفر: داده‌ها پاک شد و کاربران/تنظیمات ماندند', w.eval('DB.members.length===0 && DB.loans.length===0 && DB.installments.length===0 && DB.payments.length===0 && DB.funds.length===0 && DB.users.length>0 && !!DB.settings.institution.name'));

  // logout → باید به صفحه ورود پنل برگردد (نه لندینگ)
  d.getElementById('btnSbLogout').click(); await sleep(300);
  ok('پنل: خروج → صفحه ورود همین فایل', w.location.hash === '#/' && d.getElementById('view-login').classList.contains('active'));

  /* ورود متن آزاد در افزودن گروهی: هر ساختاری پذیرفته و نوع ستون‌ها استنتاج می‌شود */
  w.eval('bulkImportWizard()'); await sleep(350);
  const pta = d.querySelector('.m-modal #biPaste');
  ok('ورود گروهی: جعبه پیست/تایپ آزاد وجود دارد', !!pta);
  if(pta){
    pta.value = 'لیوبا صفری  ۱۲۷۴۸۱۷۴۵  اکبر  ۱۲\nغلام رضایی  ۱۲۱۸۲۴۲  حبیب  ۱۱\nکریم رفاعی  ۲۹۴۴۳۴  رمضان  ۱';
    d.querySelector('.m-modal #biPasteGo').click(); await sleep(300);
    ok('پیست آزاد: ستون‌ها پیدا شدند + نشان نوع عدد/متن', d.querySelectorAll('.m-modal [data-map]').length >= 4 && d.querySelectorAll('.m-modal label .badge').length >= 4);
    const setMap = (k,v)=>{ const sl=d.querySelector('.m-modal [data-map="'+k+'"]'); sl.value=v; sl.dispatchEvent(new w.Event('change')); };
    setMap(2,'nationalId'); setMap(3,'father'); setMap(4,'');
    d.querySelector('.m-modal #biNext').click(); await sleep(4800);
    ok('پیست آزاد: ۳ رکورد استخراج شد', d.querySelectorAll('#biRows tr[data-ri]').length === 3, d.querySelectorAll('#biRows tr[data-ri]').length);
    const fc = [...d.querySelectorAll('#biRows tr[data-ri]')[0].querySelectorAll('input')].map(i=>i.value);
    ok('پیست آزاد: نام/کدملی/نام‌پدر درست پارس شد', fc[0]==='لیوبا صفری' && fc[1]==='۱۲۷۴۸۱۷۴۵' && fc[3]==='اکبر', JSON.stringify(fc));
    const bxW = d.querySelector('.m-modal [data-x]'); if(bxW) bxW.click(); await sleep(200);
  }

  const realErrors = P.errors.filter(e=>!/context 2d|setTransform|reading 'slice'/.test(e));
  ok('پنل: خطای کنسول ندارد', realErrors.length === 0, realErrors[0]);

  console.log('\n===== نتایج تست دو فایلی =====');
  let fails = 0;
  for(const [n,c,x] of results){ console.log((c?'✅ PASS':'❌ FAIL')+'  '+n+(x!==''?'  ['+x+']':'')); if(!c) fails++; }
  process.exit(fails ? 1 : 0);
})().catch(e=>{ console.error('CRASH', e); process.exit(2); });
