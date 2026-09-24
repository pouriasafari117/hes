/* smoke: فقط‌سرور — لایهٔ دادهٔ دمو (localStorage + سید) کاملاً حذف شده و
   همهٔ خواندن/نوشتن از طریق API سرور است. */
const fs = require('fs');
const src = fs.readFileSync(__dirname+'/../panel.js','utf8');
const panel = src;
let bad=0, n=0;
function T(name, ok){ n++; if(!ok){ bad++; console.log('✘', name); } else console.log('✔', name); }

// ── ۱) نگهدارندهٔ DB فقط موقت و درون‌حافظه‌ای است ──
const _edb=(panel.match(/function emptyDb\(\)\{[\s\S]*?\n\}/)||[''])[0];
T('emptyDb ساختار موقت بدون داده', _edb.includes('return {') && _edb.includes('settings:{') && !/localStorage\.(get|set|remove)Item/.test(_edb));
T('loadDb کلید دمو را پاک می‌کند (نه می‌خواند)', /function loadDb\(\)\{[\s\S]{0,220}localStorage\.removeItem\(DB_KEY\)/.test(panel) && !/function loadDb\(\)\{[\s\S]{0,220}localStorage\.getItem\(DB_KEY\)/.test(panel));
T('saveDb هیچ‌چیز ذخیره نمی‌کند', /function saveDb\(\)\{[^}]*\/\*/.test(panel) && !/function saveDb\(\)\{[^}]*localStorage\.setItem/.test(panel));
T('بدون seedDb/مولد دادهٔ نمونه', !panel.includes('function seedDb(') && !panel.includes('function mulberry32(') && !panel.includes('function makeNID('));
T('بدون دادهٔ نمونهٔ قدیمی', !panel.includes('علی محمدی') && !panel.includes('صندوق نمونه'));

// ── ۲) ورود و آنبردینگ فقط از سرور ──
T('ورود دمو حذف شده', !panel.includes('حالت دمو: جستجو بر اساس شماره تماس') && !panel.includes("rawP==='1234'"));
T('ورود فقط با API سرور', panel.includes("await srvFetch('POST','/api/auth/login',") && panel.includes('/api/auth/me'));
T('آنبردینگ فقط با register-v2 سرور', panel.includes("'/api/auth/register-v2'") && !panel.includes('doDemoCreate') && !panel.includes('obForceDemo') && !panel.includes('buildDemoFields('));
T('خطای شبکهٔ آنبردینگ = توقف (بدون ادامهٔ دمو)', /اتصال به سرور برقرار نشد/.test(panel) && !/ادامه در حالت دمو/.test(panel));

// ── ۳) همهٔ صفحات فقط سرور ──
T('روتر PAGES فقط‌سرور', /const PAGES = \{\s*dashboard: function\(\)\{ return renderSrvDashboard\(\); \}/.test(panel) && !panel.includes('function hookSrvMode('));
T('بدون رندرگرهای دمو', !panel.includes('function renderMembersPage(') && !panel.includes('function renderLoans(') && !panel.includes('function renderFunds(') && !panel.includes('function renderTxnsTab(') && !panel.includes('function pageDashboard(') && !panel.includes('function renderReportsPage('));
T('بدون فرم‌های دمو', !panel.includes('function memberForm(') && !panel.includes('function loanForm(') && !panel.includes('function paymentForm(') && !panel.includes('function txnForm(') && !panel.includes('function accountForm('));
T('بدون تنظیمات دمویی', !panel.includes('function renderOrgSec(') && !panel.includes('function renderFieldsSec(') && !panel.includes('function renderFinSec(') && !panel.includes('function renderDataSec(') && !panel.includes('function renderUsersTab('));
T('بدون ورود گروهی/OCR دمو (آنبردینگ فقط‌سرور باقی است)', !panel.includes('function bulkImportWizard(') && !panel.includes('function tessLoad(') && panel.includes('function renderOnboarding('));
T('بدون جستجوی سریع/میان‌برهای دمو', !panel.includes('function bindQuickSearch(') && !panel.includes('function bindGlobalShortcuts(') && !panel.includes('id="qInput"'));

// ── ۴) تنظیمات/کاربران/ممیزی — فقط از سرور ──
T('تنظیمات مالی فقط سرور (بدون بلوک فقط‌دمو)', panel.includes('async function renderSrvFinSec(body, canEdit, disAttr){') && !panel.includes('فیلدهای محلی') && !panel.includes('id="setNoTpl"'));
T('کاربران از /api/users', panel.includes("/api/users?institution_id='+SRV.instId"));
T('ممیزی از دفتر سرور', panel.includes("function renderSrvDataSec(") && panel.includes("/audit?limit=100"));
T('سینک تنظیمات نمایشی از سرور', panel.includes('async function srvSyncInstSettings(') && panel.includes('DB.settings.institution.fundBalance = inst.fund_balance'));

// ── ۵) خوانده‌های باقیماندهٔ DB فقط برای مقادیر سینک‌شده از سرور ──
T('نقش‌ها ثابت (ماتریس نقش بدون دمو)', panel.includes('const ROLE_PERMS = {') && !panel.includes('DB.settings.roles'));
T('اعلان‌ها از آمار سرور', panel.includes('function srvFillAlerts(stats)') && panel.includes('SRV_OD_COUNT'));

console.log(bad? 'FAIL '+bad : 'ALL-PASS '+n);
process.exit(bad?1:0);
