/* smoke3.js — تست مسیر آنلاینِ افزودن گروهی: Google Vision ماک‌شده
   مقادیر موردانتظار هنگام اجرا از خودِ موک محاسبه می‌شوند (نه تایپ دستی) */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const results = [];
function ok(name, cond, extra){ results.push([name, !!cond, extra||'']); }

function word(x0,x1,y0,y1,txt){
  return { boundingBox:{vertices:[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}]},
           symbols: [...txt].map(ch=>({text:ch})) };
}
/* جدول نمونه مشابه صفحهٔ واقعی کاربر: نام | کد ملی | نام پدر | ردیف (راست‌به‌چپ) */
const pages=[{width:1000,height:400,blocks:[{paragraphs:[
  {lines:[{words:[word(890,960,55,95,'لیوبا'),word(815,885,55,95,'صفری'),
                 word(570,635,55,95,'۱۲۸'),word(640,705,55,95,'۱۷۵'),
                 word(335,385,55,95,'اکبر'), word(105,140,55,95,'۱۲')]}]},
  {lines:[{words:[word(890,945,155,195,'غلام'),word(805,885,155,195,'رضایی'),
                 word(565,705,155,195,'۱۲۲۴۲'),
                 word(335,385,155,195,'حبیب'), word(105,140,155,195,'۱۱')]}]},
  {lines:[{words:[word(880,940,255,295,'کریم'),word(800,875,255,295,'رفاعی'),
                 word(570,630,255,295,'۲۹۴'),word(635,700,255,295,'۴۳۴'),
                 word(320,395,255,295,'رمضان'), word(110,130,255,295,'۱')]}]},
]}]}];
const VISION_RESP = {responses:[{fullTextAnnotation:{pages}}]};

/* موردانتظارها از خود موک: ستون‌ها با بازهٔ x، رقم‌ها چپ‌به‌راست، نام‌ها راست‌به‌چپ */
function expectedRows(){
  const out=[];
  for(const pg of pages) for(const bl of pg.blocks) for(const pa of bl.paragraphs) for(const ln of pa.lines){
    const ws=ln.words.map(wd=>({x:(wd.boundingBox.vertices[0].x+wd.boundingBox.vertices[1].x)/2,
                                t:wd.symbols.map(s=>s.text).join('')}));
    const col=f=>ws.filter(w=>f(w.x));
    out.push({
      name:  col(x=>x>760).sort((a,b)=>b.x-a.x).map(w=>w.t).join(' '),
      nid:   col(x=>x>500&&x<=760).sort((a,b)=>a.x-b.x).map(w=>w.t).join(''),
      father:col(x=>x>250&&x<=500).map(w=>w.t).join(' '),
    });
  }
  return out;
}

/* پنل سه‌فایلی است؛ برای تست، محتوای فایل‌ها را داخل HTML تزریق می‌کنیم */
function panelHtml(){
  let h = fs.readFileSync('/home/user/Panel.html','utf8');
  /* split/join به‌جای replace: الگوهای $$ در محتوای جاوااسکریپت خراب نشوند */
  h = h.split('<link rel="stylesheet" href="panel.css">').join('<style>'+fs.readFileSync('/home/user/panel.css','utf8')+'</style>');
  h = h.split('<script src="panel.js"><\/script>').join('<script>'+fs.readFileSync('/home/user/panel.js','utf8')+'<\/script>');
  return h;
}
(async()=>{
  const vc = new VirtualConsole();
  const errors=[];
  vc.on('jsdomError', e=>{ const m=String(e.message||''); if(/scrollTo|getContext|navigation|CSS/.test(m)) return; errors.push(m); });
  vc.on('error', (...a)=>errors.push(a.join(' ')));
  const dom = new JSDOM(panelHtml(),
    {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
  const w=dom.window, d=w.document;
  await sleep(700);

  d.getElementById('lgUser').value='admin'; d.getElementById('lgPass').value='1234';
  d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await sleep(1500);

  const waitFor = async (sel, ms=6000)=>{ const t0=Date.now();
    while(Date.now()-t0<ms){ const el=d.querySelector(sel); if(el) return el; await sleep(120); } return null; };
  const navBtn = await waitFor('[data-go="members"]');
  if(!navBtn){ console.log('❌ nav members not found:', errors.slice(0,3)); process.exit(1); }
  navBtn.click(); await sleep(500);
  /* این لیست ۴ ستون دارد → فیلد تاریخ تولد را در الگو خاموش می‌کنیم */
  w.eval("(DB.settings.memberFields.find(f=>f.key==='birthDate')||{}).on=0;");
  const bulkBtn = await waitFor('#btnBulk');
  if(!bulkBtn){ console.log('❌ btnBulk not found'); process.exit(1); }
  bulkBtn.click(); await sleep(300);
  ok('ویزارد باز شد + فیلد کلید گوگل دارد', !!d.getElementById('biGKey'));
  const br=d.getElementById('biBridge');
  ok('پنجرهٔ پل لنز (iframe جدا) حاضر است', !!br && String(br.srcdoc||br.getAttribute('srcdoc')||'').includes('Lens'));
  w.localStorage.setItem('hesabat-gvision-key','TESTKEY');

  /* شبیه‌سازی پاسخ پل: پیام lens-done از سندِ iframe به پنل */
  await sleep(200);
  w.dispatchEvent(new w.MessageEvent('message',{ data:{type:'lens-done', name:'list.jpg', resp:VISION_RESP.responses[0]}, source: br.contentWindow }));
  await sleep(400);

  const set=(k,v)=>{ const el=d.querySelector('[data-map="'+k+'"]'); el.value=v; el.onchange(); };
  set(1,'name'); set(2,'nationalId'); set(3,'father'); set(4,'');
  d.getElementById('biNext').click();
  await sleep(4600);

  ok('نگاشت پس از دریافت توکن‌ها نمایش داده شد', !!d.getElementById('biNext'));
  const html=d.body.innerHTML;
  const exp=expectedRows();
  exp.forEach((r,i)=>{
    ok('سطر '+(i+1)+': کد ملی سازمان‌دهی شد', html.includes('value="'+r.nid+'"'), r.nid);
    ok('سطر '+(i+1)+': نام', html.includes('value="'+r.name+'"'), r.name);
    ok('سطر '+(i+1)+': نام پدر', html.includes('value="'+r.father+'"'), r.father);
  });
  ok('بدون خطای کنسول', errors.length===0, errors[0]);

  /* ═══ سناریوی دوم: حالت لنز شخصی (متن پیست‌شده) ═══ */
  const dom2 = new JSDOM(panelHtml(),
    {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
  const w2=dom2.window, d2=w2.document;
  await sleep(700);
  d2.getElementById('lgUser').value='admin'; d2.getElementById('lgPass').value='1234';
  d2.getElementById('loginForm').dispatchEvent(new w2.Event('submit',{cancelable:true}));
  await sleep(1400);
  const nb=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d2.querySelector('[data-go="members"]');if(e)return e;await sleep(120);}return null;})();
  nb.click(); await sleep(400);
  const bb=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d2.getElementById('btnBulk');if(e)return e;await sleep(120);}return null;})();
  bb.click(); await sleep(300);
  const br2=d2.getElementById('biBridge');
  const LENS_TEXT = 'لیوبا صفری  ۱۲۷۴۸۱۱۷۴۵  اکبر  ۱۲\nغلام رضایی  ۱۲۱۸۲۴۲  حبیب  ۱۱\nکریم رفاعی  ۲۹۲۴۴۳۴  رمضان  ۱';
  w2.dispatchEvent(new w2.MessageEvent('message',{data:{type:'lens-text',name:'lens.txt',text:LENS_TEXT},source:br2.contentWindow}));
  await sleep(400);
  const set2=(k,v)=>{const el=d2.querySelector('[data-map="'+k+'"]');if(el){el.value=v;el.onchange();}};
  set2(1,'name');set2(2,'nationalId');set2(3,'father');set2(4,'');
  d2.getElementById('biNext').click();
  await sleep(4600);
  const html2=d2.body.innerHTML;   ok('لنز شخصی: کد ملی سطر۱ از متن پیست‌شده', html2.includes('value="'+LENS_TEXT.split('\n')[0].split(/\s{2,}/)[1]+'"'));
  ok('لنز شخصی: نام سطر۳', html2.includes('کریم رفاعی'));
  ok('لنز شخصی: نام پدر سطر۲', html2.includes('حبیب'));


  /* ═══ سناریوی سوم: متن عمودیِ لنز (هر رکورد چند خط) — باید ۳ عضو بدهد نه ۱۲ ═══ */
  const dom3 = new JSDOM(panelHtml(),
    {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
  const w3=dom3.window, d3=w3.document;
  await sleep(700);
  d3.getElementById('lgUser').value='admin'; d3.getElementById('lgPass').value='1234';
  d3.getElementById('loginForm').dispatchEvent(new w3.Event('submit',{cancelable:true}));
  await sleep(1400);
  const nc=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d3.querySelector('[data-go="members"]');if(e)return e;await sleep(120);}return null;})();
  nc.click(); await sleep(400);
  const bc=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d3.getElementById('btnBulk');if(e)return e;await sleep(120);}return null;})();
  bc.click(); await sleep(300);
  const br3=d3.getElementById('biBridge');
  const VTEXT = ['پوریا صفری','۱۲۷۴۸۱۱۷۵۰','اکبر','مجید','غلام رضایی','۱۲۸۱۸۲۴۲','کریم رضوی','۲۹۲۴۶۳۲','رمضان'].join('\n');
  w3.dispatchEvent(new w3.MessageEvent('message',{data:{type:'lens-text',name:'lens.txt',text:VTEXT},source:br3.contentWindow}));
  await sleep(400);
  const set3=(k,v)=>{const el=d3.querySelector('[data-map="'+k+'"]');if(el){el.value=v;el.onchange();}};
  set3(1,'name');set3(2,'nationalId');set3(3,'father');set3(4,'');
  d3.getElementById('biNext').click();
  await sleep(4600);
  const html3=d3.body.innerHTML;
    ok('عمودی: دقیقاً ۳ رکورد (نه ۱۲)', d3.querySelectorAll('#biRows tr[data-ri]').length===3);
  ok('عمودی: نام‌ها درست', html3.includes('پوریا صفری')&&html3.includes('غلام رضایی')&&html3.includes('کریم رضوی'));
  ok('عمودی: کدهای ملی درست', html3.includes('۱۲۷۴۸۱۱۷۵۰')&&html3.includes('۱۲۸۱۸۲۴۲')&&html3.includes('۲۹۲۴۶۳۲'));
  ok('عمودی: نام پدر در جای خودش', html3.includes('value="اکبر"')&&html3.includes('value="رمضان"'));


  /* ═══ سناریوی چهارم: ستون‌های داینامیک + مُهر تأیید ═══ */
  const dom4 = new JSDOM(panelHtml(),
    {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true, virtualConsole:vc});
  const w4=dom4.window, d4=w4.document;
  await sleep(700);
  d4.getElementById('lgUser').value='admin'; d4.getElementById('lgPass').value='1234';
  d4.getElementById('loginForm').dispatchEvent(new w4.Event('submit',{cancelable:true}));
  await sleep(1400);
  ok('مهر: تابع استامپ تعریف شده', typeof w4.stampFx==='function');
  w4.stampFx({text:'تست', hold:200});
  ok('مهر: المنت روی صفحه ظاهر شد', !!d4.querySelector('.stamp-fx .st-core b'));
  await sleep(900);
  ok('مهر: پس از مکث محو و حذف شد', !d4.querySelector('.stamp-fx'));
  const nd=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d4.querySelector('[data-go="members"]');if(e)return e;await sleep(120);}return null;})();
  nd.click(); await sleep(400);
  w4.eval("DB.settings.memberFields.push({key:'cx1',label:'توضیح',type:'text',on:1});");
  const bd=await (async()=>{const t0=Date.now();while(Date.now()-t0<6000){const e=d4.getElementById('btnBulk');if(e)return e;await sleep(120);}return null;})();
  bd.click(); await sleep(300);
  ok('لینک کنسول گوگل در راهنمای کلید', !!d4.querySelector('a[href="https://console.cloud.google.com"]'));
  const br4=d4.getElementById('biBridge');
  const V6 = ['الف ب','۱۲۳۴۵۶۷۸۹۰','پدریک','۰۹۱۲۱۱۱۲۲۳۳','توضیح','اضافه','جیم د','۹۸۷۶۵۴۳۲۱۰','پدردو','۰۹۳۵۴۴۴۵۵۶۶','نکته','زائد'].join('\n');
  w4.dispatchEvent(new w4.MessageEvent('message',{data:{type:'lens-text',name:'lens6.txt',text:V6},source:br4.contentWindow}));
  await sleep(400);
  ok('داینامیک: ۶ سلکت نگاشت نمایش داده شد', d4.querySelectorAll('[data-map]').length===6);
  const set4=(k,v)=>{const el=d4.querySelector('[data-map="'+k+'"]');if(el){el.value=v;el.onchange();}};
  set4(1,'name');set4(2,'nationalId');set4(3,'father');set4(4,'mobile');set4(5,'');set4(6,'');
  d4.getElementById('biNext').click();
  await sleep(4600);
  const html4=d4.body.innerHTML;
  ok('داینامیک: ۲ رکورد شش‌ستونه', d4.querySelectorAll('#biRows tr[data-ri]').length===2);
  ok('داینامیک: ستون‌های ۵ و ۶ حذف نشدند (در متن نگاشت/رکورد حضور دارند)', html4.includes('الف ب')&&html4.includes('۱۲۳۴۵۶۷۸۹۰'));
  /* تنظیمات: پیش‌فرض‌های وام + تب فیلدها + رنگ مُهرها */
  d4.location.hash = '#/app/settings';
  await sleep(600);
  w4.eval("setTab='fin'; renderSettings();");
  await sleep(250);
  ok('تنظیمات: پیش‌فرض کارمزد/اقساط/دوره وام', !!d4.getElementById('setLdRate') && !!d4.getElementById('setLdMonths') && !!d4.getElementById('setLdInt'));
  w4.eval("setTab='fields'; renderSettings();");
  await sleep(250);
  ok('تنظیمات: تب فیلدهای اعضا (فهرست + افزودن)', !!d4.getElementById('fldList') && !!d4.getElementById('fldAdd'));
  ok('تنظیمات: کنترل کامل همهٔ فیلدها (الزامی/حذف/بازگردانی)', d4.querySelectorAll('[data-fdel]').length>=4 && d4.querySelectorAll('[data-freq]').length>=5 && !!d4.getElementById('fldRestore'));
  w4.eval("setTab='ui'; renderSettings();");
  await sleep(250);
  ok('تنظیمات: انتخاب رنگ مُهرها', !!d4.getElementById('stColMember') && !!d4.getElementById('stColPayment'));
  /* فیلد الزامی جدید → بنر تکمیل اطلاعات + فیلد در فرم عضو */
  w4.eval("DB.settings.memberFields.push({key:'cjob',label:'شغل',type:'text',on:1,req:1});");
  d4.location.hash = '#/app/members';
  await sleep(600);
  ok('بنر: اعضای دارای فیلد الزامی خالی علامت‌گذاری شدند', !!d4.querySelector('#mIncSlot .alert') && d4.querySelectorAll('#mTblWrap .badge.b-amber').length>0);
  const bi=d4.getElementById('mIncBtn'); if(bi) bi.click(); await sleep(300);
  ok('فهرست تکمیل اطلاعات باز شد', !!d4.querySelector('[data-ic]'));
  const bx=d4.querySelector('.m-modal [data-x]'); if(bx) bx.click(); await sleep(200);
  const ba=d4.getElementById('btnAddMember'); if(ba) ba.click(); await sleep(300);
  ok('فرم عضو: فیلد سفارشی الزامی اضافه شده', !!d4.getElementById('mf_x_cjob'));
  /* حذف یک فیلد پایه → فرم عضو بدون آن باز می‌شود، بقیه چیزها سالم */
  for(let q=0;q<3;q++){ const bx2=d4.querySelector('.m-modal [data-x]'); if(!bx2) break; bx2.click(); await sleep(150); }
  w4.eval("(function(){const MF=DB.settings.memberFields;const i=MF.findIndex(f=>f.key==='father');if(i>-1)MF.splice(i,1);})();");
  const ba2=d4.getElementById('btnAddMember'); if(ba2) ba2.click(); await sleep(300);
  ok('حذف فیلد پایه: فرم عضو بدون آن فیلد باز شد', !d4.getElementById('mfFather') && !!d4.getElementById('mfName'));

  let fail=0;
  for(const [n,c,x] of results){ if(!c) fail++; console.log((c?'✅ PASS ':'❌ FAIL ')+n+(x?'  ['+x+']':'')); }
  process.exit(fail?1:0);
})().catch(e=>{ console.log('❌ crash', e); process.exit(1); });
