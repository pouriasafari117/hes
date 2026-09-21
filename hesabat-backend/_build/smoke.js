const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/home/user/Hesabat.html','utf8');
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', e => { if(!/not implemented/i.test(e.message||'')) errors.push('jsdomError: '+(e.detail? e.detail.stack || e.detail : e.message)); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
const w = dom.window, d = w.document;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function ok(name, cond, extra){ results.push([name, !!cond, extra||'']); }

(async () => {
  await sleep(700);
  ok('landing active', d.getElementById('view-landing').classList.contains('active'));

  w.location.hash = '#/login';
  await sleep(300);
  ok('login view', d.getElementById('view-login').classList.contains('active'));

  // خطای اطلاعات ناقص
  d.getElementById('loginForm').dispatchEvent(new w.Event('submit', {cancelable:true}));
  await sleep(150);
  ok('login incomplete error shown', d.getElementById('loginAlert').innerHTML.includes('a-err'));

  // ورود موفق
  d.getElementById('lgUser').value = 'admin';
  d.getElementById('lgPass').value = '1234';
  d.getElementById('loginForm').dispatchEvent(new w.Event('submit', {cancelable:true}));
  await sleep(1900);
  ok('redirected to dashboard', w.location.hash === '#/app/dashboard', w.location.hash);
  ok('app view', d.getElementById('view-app').classList.contains('active'));
  ok('dashboard stats', d.querySelectorAll('.stat').length >= 8, d.querySelectorAll('.stat').length);
  ok('sidebar items', d.querySelectorAll('.sb-item').length === 9, d.querySelectorAll('.sb-item').length);
  ok('org chip filled', d.getElementById('orgName').textContent.includes('مهرگان'));

  const pages = ['members','funds','loans','installments','txns','reports','users','settings'];
  for(const p of pages){
    w.location.hash = '#/app/' + p;
    await sleep(430);
    const len = d.getElementById('main').innerHTML.length;
    ok('page ' + p, len > 1500, 'len=' + len);
  }

  // صفحات جزئیات
  w.location.hash = '#/app/members/m1'; await sleep(430);
  ok('member profile', d.getElementById('main').innerHTML.includes('اطلاعات هویتی'));
  w.location.hash = '#/app/loans/l1'; await sleep(430);
  ok('loan detail', d.getElementById('main').innerHTML.includes('برنامه اقساط'));
  w.location.hash = '#/app/accounts/a1'; await sleep(430);
  ok('account detail', d.getElementById('main').innerHTML.includes('گردش حساب'));

  // جدول اعضا ردیف دارد؟
  w.location.hash = '#/app/members'; await sleep(430);
  ok('members table rows', d.querySelectorAll('#mTblWrap tbody tr').length === 10, d.querySelectorAll('#mTblWrap tbody tr').length);

  // مودال افزودن عضو باز می‌شود؟
  const addBtn = d.getElementById('btnAddMember');
  addBtn && addBtn.click();
  await sleep(200);
  ok('member form modal', !!d.querySelector('.m-modal #mfName'));
  // تقویم شمسی: دکمه باز می‌شود؟
  const jdBtn = d.querySelector('.m-modal .jd-btn');
  jdBtn && jdBtn.click();
  await sleep(120);
  const pop = d.querySelector('.jd-pop');
  ok('jalali calendar popover', !!pop && pop.querySelectorAll('.jd-d[data-d]').length >= 28, pop ? pop.querySelectorAll('.jd-d[data-d]').length : 0);

  // گزارش‌ها: تغییر گزارش
  w.location.hash = '#/app/reports'; await sleep(430);
  const chips = d.querySelectorAll('[data-rep]');
  ok('report chips', chips.length === 7, chips.length);
  chips[6] && chips[6].click(); await sleep(200);
  ok('debtors report rendered', d.getElementById('repBody').innerHTML.includes('بدهی') || d.querySelectorAll('#repTbl tbody tr').length > 0);

  // کاربران نقش‌ها
  w.location.hash = '#/app/users'; await sleep(430);
  ok('users rows', d.querySelectorAll('.tbl tbody tr').length === 4);

  // خروج
  d.getElementById('btnSbLogout').click();
  await sleep(250);
  ok('logout → landing', w.location.hash === '#/', w.location.hash);

  // خطاهای کنسول (فیلتر خطای کانواس که مربوط به نبودن بوم در jsdom است)
  const realErrors = errors.filter(e => !e.includes('context 2d'));
  console.log('\n===== نتایج =====');
  let fails = 0;
  for(const [n,c,x] of results){ console.log((c?'✅ PASS':'❌ FAIL') + '  ' + n + (x?'  ['+x+']':'')); if(!c) fails++; }
  console.log('\nconsole errors:', realErrors.length);
  realErrors.slice(0,12).forEach(e => console.log('  ⚠', String(e).split('\n')[0].slice(0,300)));
  process.exit(fails || realErrors.length ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
