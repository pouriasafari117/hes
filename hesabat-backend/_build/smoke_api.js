/* تست سرتاسری «پنل → API → PostgreSQL» در حالت سرور
   پیش‌نیاز: بک‌اند روی پورت ۴۰۰۰ و دیتابیس بالا باشند. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const BASE = 'http://localhost:4000';
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if(cond){ pass++; console.log('✅', name); } else { fail++; console.log('❌ FAIL', name, extra||''); } };

function panelHtml(){
  let h = fs.readFileSync('/home/user/Panel.html','utf8');
  h = h.split('<link rel="stylesheet" href="panel.css">').join('<style>'+fs.readFileSync('/home/user/panel.css','utf8')+'</style>');
  h = h.split('<script src="panel.js"><\/script>').join('<script>'+fs.readFileSync('/home/user/panel.js','utf8')+'<\/script>');
  return h;
}

async function api(method, path, { token, body } = {}) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let j = null; try { j = await r.json(); } catch(_){}
  return { status:r.status, json:j };
}

(async () => {
  /* ۱) ساخت کاربر + مؤسسه + فیلدها روی سرور واقعی */
  const rnd = Date.now().toString(36);
  const email = `panel-${rnd}@test.ir`;
  let r = await api('POST','/api/auth/register',{ body:{ name:'مدیر تست پنل', email, password:'secret123' }});
  const token = r.json.token;
  r = await api('POST','/api/institutions',{ token, body:{ name:'مؤسسهٔ تست پنل', slug:'panel_'+rnd }});
  const inst = r.json;
  await api('POST',`/api/institutions/${inst.id}/fields`,{ token, body:{ key:'name', label:'نام', type:'text', is_required:true }});
  await api('POST',`/api/institutions/${inst.id}/fields`,{ token, body:{ key:'meli', label:'کد ملی', type:'nid', is_required:true }});
  await api('POST',`/api/institutions/${inst.id}/fields`,{ token, body:{ key:'age', label:'سن', type:'number' }});
  ok('زیرساخت: کاربر/مؤسسه/فیلدها روی سرور ساخته شدند', !!token && !!inst.id);

  /* ۲) بارگذاری پنل در جی‌ساداوم + پل fetch به سرور واقعی */
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => { const m = String(e.message||''); if(/scrollTo|getContext|Invalid left-hand|CSS|Not implemented: navigation/.test(m)) return; errors.push(m); });
  vc.on('error', (...a)=>errors.push(a.join(' ')));
  const dom = new JSDOM(panelHtml(), { runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc });
  const w = dom.window, d = w.document;
  w.fetch = (u,o) => fetch(u,o); /* پنل → سرور واقعی */
  await sleep(700);

  /* ورود به پنل (کاربر دمو) */
  d.getElementById('lgUser').value='admin'; d.getElementById('lgPass').value='1234';
  d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await sleep(1900); /* ورود پنل دو مرحله‌ای است: ۸۵۰ + ۶۵۰ میلی‌ثانیه */

  /* ۳) فعال‌سازی حالت سرور از طریق تنظیمات (مثل کلیک کاربر) */
  w.eval(`Object.assign(SRV, ${JSON.stringify({ base:BASE, token, user:{name:'مدیر تست پنل'}, instId:inst.id, instName:inst.name, on:false })}); srvSave(); srvDropFieldsCache();`);
  w.location.hash = '#/app/settings'; await sleep(450);
  ok('تنظیمات: کارت اتصال به سرور تزریق شد', !!d.getElementById('secSrv'));
  ok('تنظیمات: وضعیت اتصال نشان داده می‌شود', (d.getElementById('secSrv')||{}).textContent.includes('مؤسسهٔ تست پنل'));
  ok('تنظیمات: دکمهٔ حالت سرور وجود دارد', !!d.getElementById('srvToggle'));
  d.getElementById('srvToggle').click(); await sleep(1200);
  ok('حالت سرور فعال شد', w.eval('SRV.on') === true);
  ok('تب فیلدها از سرور پر شد', !!d.getElementById('srvFieldAdd') && d.querySelector('#secFld').textContent.includes('کد ملی'));

  /* ۴) صفحه اعضا از سرور */
  w.location.hash = '#/app/members'; await sleep(1600);
  ok('اعضا: صفحهٔ حالت سرور رندر شد (نام مؤسسه)', d.querySelector('#main').textContent.includes('مؤسسهٔ تست پنل'));
  ok('اعضا: حالت خالی نمایش می‌شود', d.getElementById('srvMemBox').textContent.includes('عضویی پیدا نشد'));

  /* ۵) افزودن عضو از فرم داینامیک سرور */
  w.eval('srvMemberForm(null)'); await sleep(900);
  const sfName = d.getElementById('sf_name'), sfMeli = d.getElementById('sf_meli'), sfAge = d.getElementById('sf_age');
  ok('فرم داینامیک از تعریف فیلدهای سرور ساخته شد', !!sfName && !!sfMeli && !!sfAge);
  sfName.value = 'رضا کریمی'; sfMeli.value = '۱۲۳۴۵۶۷۸۹۰'; sfAge.value = '۴۲';
  d.getElementById('srvMemSave').click(); await sleep(1200);
  ok('عضو جدید در لیست سرور ظاهر شد', d.getElementById('srvMemBox').textContent.includes('رضا کریمی'));
  const saved = await api('GET',`/api/institutions/${inst.id}/members`,{ token });
  ok('عضو واقعاً در PostgreSQL ذخیره شد', saved.json.total === 1 && saved.json.rows[0].values.meli === '۱۲۳۴۵۶۷۸۹۰');

  /* ۶) اعتبارسنجی سرور از فرم پنل: کد ملی کوتاه → خطای فارسی در فرم */
  w.eval('srvMemberForm(null)'); await sleep(900);
  d.getElementById('sf_name').value = 'کاربر بد'; d.getElementById('sf_meli').value = '123';
  d.getElementById('srvMemSave').click(); await sleep(1000);
  const errBox = d.getElementById('srvFormErr');
  ok('خطای اعتبارسنجی سرور در فرم نمایش داده شد', errBox && errBox.textContent.includes('کد ملی'));

  /* ۷) حذف عضو از طریق رابط پنل — اول مودالِ خطای باز را ببند */
  w.eval('closeModal()'); await sleep(200);
  d.querySelector('[data-smd]').click(); await sleep(500);
  const oks = d.querySelectorAll('.m-overlay [data-ok]');
  oks[oks.length-1].click(); await sleep(1100);
  const after = await api('GET',`/api/institutions/${inst.id}/members`,{ token });
  ok('حذف نرم از پنل روی سرور اعمال شد', after.json.total === 0);

  ok('خطای کنسول غیرمنتظره ندارد', errors.length === 0, errors[0]);
  console.log(`\n${pass}✅ ${fail}❌`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
