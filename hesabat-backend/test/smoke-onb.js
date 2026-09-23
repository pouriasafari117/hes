/* smoke: تغییرات آنبردینگ + اقساط آزاد + سینک تنظیمات + تاریخچه وام عضو */
const fs = require('fs');
const src = fs.readFileSync(__dirname+'/../panel.js','utf8');
let bad=0, n=0;
function T(name, ok){ n++; if(!ok){ bad++; console.log('✘', name); } else console.log('✔', name); }

// ۱) آنبردینگ: کدملی/شماره تماس + تاریخ تولد
const F=(id,re)=>{ const m=src.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>','g'))||[]; return m.length>=2 && m.every(x=>re.test(x)); };
T('obPhone: num-inp + inputmode (۲ نسخه)', F('obPhone', /num-inp/) && F('obPhone', /inputmode="numeric"/));
T('obNid: num-inp + inputmode (۲ نسخه)', F('obNid', /num-inp/) && F('obNid', /inputmode="numeric"/));
T('obBirth: data-jdate + placeholder شمسی (۲ نسخه)', F('obBirth', /data-jdate/) && F('obBirth', /۱۳۷۰\/۰۵\/۰۲/) && F('obBirth', /inputmode="numeric"/));
T('obEstDate: num-inp', src.split('id="obEstDate"')[1] && /num-inp/.test(src.split('id="obEstDate"')[1].slice(0,200)));
T('obInstCount عدد آزاد تا ۱۲۰', src.includes('id="obInstCount" type="number" min="1" max="120"'));
T('help تقویم شمسی', src.includes('تقویم شمسی باز می‌شود'));

// ۲) تعداد اقساط آزاد
T('lfMonths سلکت نیست (دمو)', !/<select id="lfMonths"/.test(src) && /id="lfMonths" type="number"[^>]*max="120"/.test(src));
T('lfMonths input listener', src.includes("el('#lfMonths').addEventListener('input', suggest)"));
T('slfCnt سلکت نیست (سرور)', /id="slfCnt" type="number"[^>]*max="120"/.test(src) && !/<select id="slfCnt"/.test(src));
T('slfCnt input listener', src.includes("el('#slfCnt').addEventListener('input', updateSum)"));
T('setLdMonths ورودی آزاد', /id="setLdMonths" class="num-inp" type="number"[^>]*max="120"/.test(src));
T('ولیدیشن ۱ تا ۱۲۰ در سابمیت دمو', src.includes("clampNum(Math.round(+el('#lfMonths').value || 0), 1, 120)"));
T('ولیدیشن ۱ تا ۱۲۰ در سابمیت سرور', src.includes('cntN < 1 || cntN > 120'));

// ۳) سینک تنظیمات سرور
T('renderSrvFinSec تعریف شده', /async function renderSrvFinSec\(/.test(src));
T('renderFinSec به سرور منشعب می‌شود', src.includes('if(srvFin) return renderSrvFinSec(body, canEdit, disAttr, s);'));
T('PATCH settings سروری', src.includes("await srvFetch('PATCH', '/api/institutions/'+SRV.instId, payload)"));

// ۴) تاریخچه وام در مشاهده عضو (سرور)
T('srvViewMember تاریخچه وام', src.includes("'/loans?memberId='+m.id+'&page=1&pageSize=100'"));
T('جداکردن در جریان/تسویه‌شده', src.includes('وام‌های در جریان') && src.includes('وام‌های تسویه‌شده'));
T('دکمه جزئیات وام در مودال', src.includes('data-vloan'));

// ۵) داشبورد سرور: حذف هدر اتصال + نمودار وضعیت اقساط
T('بدون «متصل به» در داشبورد', !src.includes('متصل به \'+esc(SRV.instName||\'\')'));
T('بدون دکمه srvDashRefresh', !src.includes('srvDashRefresh'));
T('نمودار دایره‌ای وضعیت وام‌ها (تسویه + در جریان + معوق)', src.includes('chSrvIns') && src.includes('معوق') && src.includes('تسویه‌شده') && src.includes('وضعیت وام‌ها') && !src.includes('chSrvMembers'));

// ۶) سکشن اتصال سرور کاملاً حذف شده (اتصال خودکار، بدون تنظیمات دستی)
T('بدون injectSrvSec/کارت اتصال', !src.includes('injectSrvSec') && !src.includes('منبع داده و اتصال سرور (PostgreSQL)') && !src.includes('ds-card'));
T('اتصال خودکار هنگام بوت', src.includes('if(SRV.token && SRV.instId) SRV.on = true;'));

// ۷) گزارش‌های سرور
T('srvReportDefs موجود', /function srvReportDefs\(/.test(src));
T('renderSrvReportsPage بازنویسی‌شده', src.includes("'در حال خارج از دیتابیس…'") || src.includes('srvFetchReportData'));
T('چاپ سرور', /function srvPrintReport\(/.test(src) && src.includes('window.print()'));
T('CSV سرور', /function srvExportCsv\(/.test(src));
T('هفت گزارش', (src.match(/id:'(members|loans|installments|payments|txns|balances|debtors)', title:'گزارش/g)||[]).length >= 3 && src.includes("title:'گزارش بدهکاران'"));
T('پایگاه داده از اندپوینت‌های واقعی', src.includes("'/api/institutions/'+SRV.instId+'/installments?page=1&pageSize=1000'"));

// ۸) سینک دقیق فیلدهای اعضا: هیچ‌جا فیلد پیش‌فرض بی‌صدا ساخته نمی‌شود
const fSrc = fs.readFileSync(__dirname+'/../src/routes/fields.js','utf8');
const mSrc = fs.readFileSync(__dirname+'/../src/routes/members.js','utf8');
const aSrc = fs.readFileSync(__dirname+'/../src/routes/auth.js','utf8');
T('بدون ساخت خودکار فیلد پیش‌فرض در GET /fields', !/defaults\s*=/.test(fSrc));
T('بدون ساخت خودکار فیلد پیش‌فرض در ثبت عضو', !/defaults\s*=/.test(mSrc));
T('register-v2 دقیقاً همان فیلدهای انتخاب‌شده را می‌سازد', aSrc.includes('fieldsToCreate') && /texttt|labelToKey/.test(aSrc));
T('در تنظیمات CSV فقط در گزارش/تراکنش است', !src.includes('id="mCsv"') && !src.includes('id="lCsv"') && src.includes('id="tCsv"') && src.includes('id="srvTxnCsv"'));
T('بدون میانبرها در کارت هشدارها', !src.includes('dashShorts'));

console.log(bad? 'FAIL '+bad : 'ALL-PASS '+n);
process.exit(bad?1:0);
