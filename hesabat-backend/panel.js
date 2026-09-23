/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۱: ابزارهای پایه (تقویم جلالی، فرمت، آیکون‌ها)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── کمکی ── */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FA_D = '۰۱۲۳۴۵۶۷۸۹', AR_D = '٠١٢٣٤٥٦٧٨٩';
function faToEn(s){
  return String(s).split('').map(ch => {
    let i = FA_D.indexOf(ch); if(i > -1) return i;
    i = AR_D.indexOf(ch); if(i > -1) return i;
    return ch;
  }).join('');
}
function faDigits(s){ return String(s).replace(/\d/g, d => FA_D[d]); }
function uid(p){ return p + '-' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4); }
function clampNum(n,a,b){ return Math.max(a, Math.min(b,n)); }

/* ── تبدیل تقویم جلالی (الگوریتم استاندارد jalaali) ── */
function jdiv(a,b){ return ~~(a/b); }
function jmod(a,b){ return a - ~~(a/b)*b; }
const J_BREAKS = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
function jalCal(jy){
  const bl = J_BREAKS.length; let gy = jy + 621, leapJ = -14, jp = J_BREAKS[0], jm, jump;
  for(let i=1;i<bl;i++){
    jm = J_BREAKS[i]; jump = jm - jp;
    if(jy < jm) break;
    leapJ += jdiv(jump,33)*8 + jdiv(jmod(jump,33),4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ += jdiv(n,33)*8 + jdiv(jmod(n,33)+3,4);
  if(jmod(jump,33)===4 && jump-n===4) leapJ += 1;
  const leapG = jdiv(gy,4) - jdiv((jdiv(gy,100)+1)*3,4) - 150;
  const march = 20 + leapJ - leapG;
  let n2 = n; if(jump-n < 6) n2 = n - jump + jdiv(jump+4,33)*33;
  let leap = jmod(jmod(n2+1,33)-1,4); if(leap===-1) leap = 4;
  return {leap, gy, march};
}
function g2d(gy,gm,gd){
  let d = jdiv((gy + jdiv(gm-8,6) + 100100)*1461,4) + jdiv(153*jmod(gm+9,12)+2,5) + gd - 34840408;
  d = d - jdiv(jdiv(gy+100100+jdiv(gm-8,6),100)*3,4) + 752;
  return d;
}
function d2g(jdn){
  let j = 4*jdn + 139361631;
  j = j + jdiv(jdiv(4*jdn+183187720,146097)*3,4)*4 - 3908;
  const i = jdiv(jmod(j,1461),4)*5 + 308;
  const gd = jdiv(jmod(i,153),5)+1, gm = jmod(jdiv(i,153),12)+1, gy = jdiv(j,1461)-100100+jdiv(8-gm,6);
  return {gy,gm,gd};
}
function j2d(jy,jm,jd){ const r = jalCal(jy); return g2d(r.gy,3,r.march) + (jm-1)*31 - jdiv(jm,7)*(jm-7) + jd - 1; }
function d2j(jdn){
  const gy = d2g(jdn).gy; let jy = gy - 621;
  const r = jalCal(jy), jdn1f = g2d(gy,3,r.march);
  let k = jdn - jdn1f, jd, jm;
  if(k >= 0){ if(k <= 185){ return {jy, jm:1+jdiv(k,31), jd:jmod(k,31)+1}; } k -= 186; }
  else { jy -= 1; k += 179; if(r.leap===1) k += 1; }
  jm = 7 + jdiv(k,30); jd = jmod(k,30)+1;
  return {jy,jm,jd};
}

const J = {
  MONTHS:['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'],
  MONTHS_SHORT:['فرو','ارد','خرد','تیر','مرد','شهر','مهر','آبا','آذر','دی','بهم','اسف'],
  WD:['ش','ی','د','س','چ','پ','ج'],
  mLen(jy,jm){ if(jm<=6) return 31; if(jm<=11) return 30; return jalCal(jy).leap===0 ? 30 : 29; },
  g2j(gy,gm,gd){ return d2j(g2d(gy,gm,gd)); },
  j2g(jy,jm,jd){ return d2g(j2d(jy,jm,jd)); },
  today(){ const n = new Date(); return this.g2j(n.getFullYear(), n.getMonth()+1, n.getDate()); },
  todayIso(){ const n = new Date(); return isoOf(n.getFullYear(), n.getMonth()+1, n.getDate()); },
  nowIso(){ const n = new Date(); return isoOf(n.getFullYear(),n.getMonth()+1,n.getDate()) + ' ' +
    String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0'); },
  iso2j(iso){ if(!iso) return null; const p = String(iso).slice(0,10).split('-').map(Number); return this.g2j(p[0],p[1],p[2]); },
  j2iso(jy,jm,jd){ const g = this.j2g(jy,jm,jd); return isoOf(g.gy,g.gm,g.gd); },
  fmt(iso){ if(!iso) return '—'; const j = this.iso2j(iso); if(!j) return '—';
    return faDigits(j.jy + '/' + String(j.jm).padStart(2,'0') + '/' + String(j.jd).padStart(2,'0')); },
  fmtLong(iso){ if(!iso) return '—'; const j = this.iso2j(iso);
    return faDigits(j.jd) + ' ' + this.MONTHS[j.jm-1] + ' ' + faDigits(j.jy); },
  fmtShort(iso){ if(!iso) return '—'; const j = this.iso2j(iso); return faDigits(j.jm + '/' + j.jd); },
  parse(str){
    if(!str) return null;
    const s = faToEn(String(str)).trim().replace(/[./\s]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    const p = s.split('-').map(x => parseInt(x,10));
    if(p.length !== 3 || p.some(isNaN)) return null;
    let [jy,jm,jd] = p;
    if(jy >= 0 && jy < 100) jy += 1300; /* سال دومرحله‌ای: 70/5/2 = ۱۳۷۰ */
    if(jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > this.mLen(jy,jm)) return null;
    return {jy,jm,jd};
  },
  addMonths(jy,jm,jd,n){
    let m = jm + n, y = jy + Math.floor((m-1)/12);
    m = jmod(m-1,12)+1; if(m<1){ m+=12; y-=1; }
    return {jy:y, jm:m, jd:Math.min(jd, this.mLen(y,m))};
  },
  addDaysIso(iso, days){ const p = iso.slice(0,10).split('-').map(Number); const d = new Date(p[0],p[1]-1,p[2]+days);
    return isoOf(d.getFullYear(), d.getMonth()+1, d.getDate()); },
  diffDays(aIso,bIso){ const A = aIso.slice(0,10).split('-').map(Number), B = bIso.slice(0,10).split('-').map(Number);
    return Math.round((new Date(B[0],B[1]-1,B[2]) - new Date(A[0],A[1]-1,A[2]))/86400000); },
  monthKey(iso){ return iso.slice(0,7); }
}

const LOAN_STATUS_FA = {
  active: 'فعال',
  paid: 'تسویه‌شده',
  overdue: 'معوق',
  cancelled: 'لغو شده',
  pending: 'در انتظار',
  inactive: 'غیرفعال',
  draft: 'پیش‌نویس'
};
const INS_STATUS_FA = {
  pending: 'در انتظار',
  paid: 'پرداخت‌شده',
  overdue: 'معوق',
  partial: 'جزئی پرداخت'
};
const TXN_TYPE_FA = {
  deposit: 'واریز',
  withdraw: 'برداشت',
  loan_out: 'پرداخت وام',
  repayment: 'بازپرداخت',
  fee: 'کارمزد',
  transfer: 'انتقال'
};
function faLoanStatus(st){ return LOAN_STATUS_FA[st] || st; }
function faInsStatus(st){ return INS_STATUS_FA[st] || st; }
function faTxnType(st){ return TXN_TYPE_FA[st] || st; }

;
function isoOf(y,m,d){ return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0'); }

/* ── فرمت اعداد و پول ── */
const _nf = new Intl.NumberFormat('fa-IR');
function fmtN(n){ return _nf.format(Math.round(Number(n)||0)); }
function CUR(){ return (DB && DB.settings.currency) || 'تومان'; }
function fmtM(n){ return fmtN(n) + ' ' + CUR(); }
function fmtMShort(n){
  const v = Number(n)||0;
  if(Math.abs(v) >= 1e9) return faDigits((v/1e9).toLocaleString('en-US',{maximumFractionDigits:2})) + ' میلیارد';
  if(Math.abs(v) >= 1e6) return faDigits((v/1e6).toLocaleString('en-US',{maximumFractionDigits:1})) + ' میلیون';
  return fmtN(v);
}
function timeAgo(iso){
  if(!iso) return '—';
  const d = iso.length > 10 ? new Date(iso.replace(' ','T')) : new Date(iso.slice(0,10)+'T12:00');
  const mins = Math.round((Date.now() - d.getTime())/60000);
  if(mins < 1) return 'لحظاتی پیش';
  if(mins < 60) return faDigits(mins) + ' دقیقه پیش';
  const h = Math.round(mins/60);
  if(h < 24) return faDigits(h) + ' ساعت پیش';
  const days = Math.round(h/24);
  if(days < 30) return faDigits(days) + ' روز پیش';
  return J.fmt(iso);
}
function faTime(iso){ if(!iso || iso.length < 16) return ''; return '، ساعت ' + faDigits(iso.slice(11,16)); }

/* ── اعتبارسنجی ── */
function validNID(code){
  const s = faToEn(String(code||'').trim());
  if(!/^\d{10}$/.test(s)) return false;
  if(/(\d)\1{9}/.test(s)) return false;
  let sum = 0; for(let i=0;i<9;i++) sum += (+s[i])*(10-i);
  const r = sum % 11, c = r < 2 ? r : 11 - r;
  return (+s[9]) === c;
}
function validMobile(v){ return /^09\d{9}$/.test(faToEn(String(v||'').trim())); }
/* نرمال‌سازی ورودی آزاد کاربر: عدد → فقط رقم فارسی؛ تعیین نوع داده با خود برنامه */
function normFaDigits(v){
  return faToEn(String(v||'')).replace(/\D/g,'').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function normMobile(v){
  let s = faToEn(String(v||'')).replace(/\D/g,'');
  if(s.slice(0,4)==='0098') s = '0'+s.slice(4);
  else if(s.slice(0,2)==='98' && s.length===12) s = '0'+s.slice(2);
  else if(s.charAt(0)==='9' && s.length===10) s = '0'+s;
  return s.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

/* ── آیکون‌ها (خطی) ── */
function icon(name, size){
  const s = size || 18;
  const P = {
    dash:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    users:'<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.4c.7-3 3.2-4.6 6.2-4.6s5.5 1.6 6.2 4.6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.4 14.9c2.5.3 4.3 1.7 4.9 4"/>',
    wallet:'<rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M3 10h18M16.5 15h2"/><path d="M6 6.5 14.5 3.6a1.6 1.6 0 0 1 2 1.2l.3 1.7"/>',
    loan:'<circle cx="12" cy="12" r="8.6"/><path d="m8.6 15.4 6.8-6.8"/><circle cx="9.2" cy="9.2" r="1.4"/><circle cx="14.8" cy="14.8" r="1.4"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/><path d="m9 15 2 2 4-4"/>',
    swap:'<path d="M7 4v13M7 4 3.5 7.5M7 4l3.5 3.5"/><path d="M17 20V7M17 20l3.5-3.5M17 20l-3.5-3.5"/>',
    chart:'<path d="M4 20h16"/><rect x="5.5" y="11" width="3.4" height="6" rx="1"/><rect x="10.5" y="6" width="3.4" height="11" rx="1"/><rect x="15.5" y="9" width="3.4" height="8" rx="1"/>',
    shield:'<path d="M12 3 5 5.8v5.4c0 4.6 3 7.6 7 9 4-1.4 7-4.4 7-9V5.8Z"/><path d="m9.2 11.6 2 2 3.8-3.9"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.8 12h3M18.2 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell:'<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>',
    check:'<path d="m4.5 12.5 5 5L19.5 7"/>',
    chevD:'<path d="m6 9 6 6 6-6"/>',
    chevS:'<path d="m14 6-6 6 6 6"/>',
    chevE:'<path d="m10 6 6 6-6 6"/>',
    logout:'<path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M9 12h12M17 8l4 4-4 4"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    edit:'<path d="M4 20h16"/><path d="M13.8 5.2 15.9 7.3 8.6 14.6 5.7 15.4l.8-2.9z"/><path d="m13.8 5.2 1.2-1.2a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1l-1.2 1.2"/>',
    ban:'<circle cx="12" cy="12" r="8.6"/><path d="M6 6l12 12"/>',
    folder:'<path d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.7a2 2 0 0 0-2-2h-8L9 5H5a2 2 0 0 0-2 2z"/>',
    print:'<path d="M7 8V3.5h10V8"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 13h10v7H7z"/>',
    download:'<path d="M12 4v10M12 14l4-4M12 14l-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    moon:'<path d="M20 13.8A8.4 8.4 0 0 1 10.2 3.7a.65.65 0 0 0-.8.85 6.9 6.9 0 1 0 9.9 8.5.65.65 0 0 0 .7-.75Z"/>',
    sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.3m0 14.2v2.3M2.6 12h2.3m14.2 0h2.3M4.9 4.9l1.6 1.6m11 11 1.6 1.6M4.9 19.1l1.6-1.6m11-11 1.6-1.6"/>',
    upload:'<path d="M12 16V6M12 6l4 4M12 6 8 10"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    warn:'<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.4M12 16.8v.6"/>',
    info:'<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5M12 7.6v.6"/>',
    clock:'<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5l3.4 2"/>',
    trash:'<path d="M4.5 6.5h15M9.5 3.5h5M6.5 6.5 7.4 20a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/>',
    filter:'<path d="M4 5.5h16L14.5 12v6L9.5 20v-8Z"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    sort:'<path d="M8 5v14M8 5 5 8M8 5l3 3"/><path d="M16 19V5M16 19l3-3M16 19l-3-3"/>',
    coins:'<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M3 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M18 9.5c1.9.4 3 1.3 3 2.5v5c0 1.4-2 2.6-4.6 2.9"/>',
    bank:'<path d="M3 9.5 12 4l9 5.5"/><path d="M5 9.5V18M9.7 9.5V18M14.3 9.5V18M19 9.5V18"/><path d="M3.5 18h17M3 21h18"/>',
    user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.9-5.4 7.2-5.4s6.3 1.8 7.2 5.4"/>',
    send:'<path d="M21 3 3.6 10.3l7 2.1M21 3l-6.4 17.4-2.9-8M21 3 10.6 12.4"/>',
    refresh:'<path d="M20 5v5h-5"/><path d="M20 10a8 8 0 1 0 1.5 5"/>',
    arrowL:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
    file:'<path d="M6.5 3h7L19 8.5V21h-12.5z"/><path d="M13 3v6h6"/><path d="M9.5 13h5M9.5 17h5"/>',
    image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="m5 18 4.5-4.5 3 3 3-3.5L20.5 18"/>'
  };
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name]||P.info) + '</svg>';
}

/* ═══ مُهر تأیید (استامپ) — الهام از feralui.dev/stamp، متن فارسی ═══
   هنگام زدن دکمهٔ ثبت نهایی، مُهر می‌آید، گوشهٔ تصویر می‌کوبد
   و بعد از مکث کوتاه محو می‌شود. رنگ هر تسک از تنظیمات می‌آید. */
function stampFx(opts){
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'stamp-fx';
  el.setAttribute('dir','ltr');
  el.innerHTML =
    '<div class="stamp" style="'+(opts.color?('color:'+opts.color):'')+'">' +
      '<div class="st-ring"><div class="st-core">' +
        '<span class="st-top">✦ ✦ ✦</span>' +
        '<b>'+(opts.text||'ثبت شد')+'</b>' +
        (opts.sub ? '<span class="st-sub">'+opts.sub+'</span>' : '') +
        '<span class="st-bot">سامانه حسابات</span>' +
      '</div></div>' +
    '</div>';
  document.body.appendChild(el);
  void el.offsetWidth;
  el.classList.add('go');
  setTimeout(()=>{ el.classList.add('lift');
    setTimeout(()=>{ el.remove(); if(opts.onDone) opts.onDone(); }, 480);
  }, opts.hold||1200);
}


/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۲: لایه داده (ذخیره‌سازی محلی + داده دمو)
   ═══════════════════════════════════════════════════════════════ */
const DB_KEY = 'hesabat-db-v1', SES_KEY = 'hesabat-session-v1';
let DB = null, SESSION = null;

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

const NAMES = ['محمدرضا احمدی','فاطمه حسینی','علی رضایی','زهرا کریمی','حسین موسوی','مریم عباسی','مهدی جعفری','نرگس قاسمی','رضا نوری','سارا محمدی','امیر صادقی','الهام رحیمی','مجید توکلی','شیما ابراهیمی','کاظم حیدری','پریسا سلطانی','بهرام ملکی','نجمه صالحی','سعید افشار','لیلا کاظمی','فرشاد یوسفی','مینا رستمی','حامد شریفی','عاطفه نجفی','ابراهیم دولتی','شکوفه ایزدی','ناصر فلاحی','ریحانه مرادی','وحید کمالی','پگاه شهریاری'];
const EXTRA_NAMES = ['آرش قنبری','بهناز مقدم','پیمان شریفی','ترانه حبیبی','جمشید امیری','حلیمه نوروزی','داوود خسروی','رویا پناهی','سیاوش مظفری','شهلا رستگار','صفر علیزاده','ضیاء حقیقی','طلا نعمتی','ظفر اکبری','عزت رمضانی','غلام شفیعی','فرنگیس بهرامی','قاسم دلاوری','کتایون فرزانه','گلنار صدری'];
const FATHERS = ['محمد','حسین','علی','رضا','مهدی','اکبر','ناصر','ابراهیم','جواد','کاظم','غلامرضا','اسدالله','منصور','یدالله','عباس','حسن','اسماعیل','رحیم'];

function makeNID(rnd){
  let base = ''; for(let i=0;i<9;i++) base += (rnd()*10|0);
  let sum = 0; for(let i=0;i<9;i++) sum += (+base[i])*(10-i);
  const r = sum % 11, c = r < 2 ? r : 11 - r;
  return base + c;
}
function makeMobile(rnd){
  const ops = ['10','11','12','13','14','15','16','17','18','19','20','21','22','23','30','33','35','36','37','38','39','90','91','92','93','94','95','98','99'];
  let s = '09' + ops[rnd()*ops.length|0];
  for(let i=0;i<7;i++) s += (rnd()*10|0);
  return s;
}

function seedDb(){
  const rnd = mulberry32(20260913);
  const pick = a => a[rnd()*a.length|0];
  const todayIso = J.todayIso();
  const db = { v:1, counters:{member:1030, loan:100}, members:[], funds:[], accounts:[], loans:[], installments:[], payments:[], txns:[], users:[], audit:[], importTemplates:[],
    settings:{
      institution:{ name:'مؤسسه قرض‌الحسنه مهرگان', phone:'۰۲۱-۸۸۷۷۶۶۵۵', address:'تهران، خیابان ولیعصر، کوچه مهر، پلاک ۱۲۳', logo:null },
      currency:'تومان',
      memberNoTemplate:'MH-{seq:4}',
      stampColors:{ member:'#B3261E', payment:'#1C6E31' },
      /* پیش‌فرض‌های وام — در تنظیمات قابل تغییر است و فرم وام با اینها پر می‌شود */
      loanDefaults:{ rate:4, months:12, interval:1 },
      /* الگوی فیلدهای عضو — پیش‌فرض همین پنج فیلد است؛ مدیر می‌تواند فیلد کم/زیاد کند */
      memberFields:[
        {key:'name',      label:'نام و نام خانوادگی', type:'text',   on:1, core:1, req:1},
        {key:'father',    label:'نام پدر',            type:'text',   on:1, core:1},
        {key:'mobile',    label:'شماره تماس',         type:'mobile', on:1, core:1, req:1},
        {key:'nationalId',label:'کد ملی',             type:'nid',    on:1, core:1, req:1},
        {key:'birthDate', label:'تاریخ تولد',         type:'jdate',  on:1, core:1, req:1}
      ],
      notifications:{ dueReminder:true, payConfirm:true, weeklyReport:false },
      roles:{
        admin:    {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:1,settingsEdit:1},
        operator: {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
        accountant:{memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
        viewer:   {memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:0,txnAdd:0,reportExport:1,userManage:0,settingsEdit:0}
      }
    }
  };

  /* صندوق‌ها و حساب‌ها */
  db.funds = [
    {id:'f1', name:'صندوق اصلی مهرگان', code:'F-1001', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'صندوق مرکزی مؤسسه'},
    {id:'f2', name:'صندوق ولایت', code:'F-1002', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'شعبه غرب'},
    {id:'f3', name:'صندوق امید', code:'F-1003', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'active', notes:'ویژه وام‌های خُرد'},
    {id:'f4', name:'صندوق آینده‌سازان', code:'F-1004', institution:'مؤسسه قرض‌الحسنه مهرگان', status:'inactive', notes:'در حال بازنگری'}
  ];
  db.accounts = [
    {id:'a1', fundId:'f1', name:'جاری اصلی', number:'100-110-220', type:'جاری', initialBalance:420000000, status:'active', notes:''},
    {id:'a2', fundId:'f1', name:'پس‌انداز مهرگان', number:'100-110-330', type:'پس‌انداز', initialBalance:300000000, status:'active', notes:''},
    {id:'a3', fundId:'f2', name:'قرض‌الحسنه ولایت', number:'200-210-110', type:'قرض‌الحسنه', initialBalance:180000000, status:'active', notes:''},
    {id:'a4', fundId:'f3', name:'جاری امید', number:'300-310-110', type:'جاری', initialBalance:90000000, status:'active', notes:''},
    {id:'a5', fundId:'f4', name:'پس‌انداز آینده‌سازان', number:'400-410-110', type:'پس‌انداز', initialBalance:60000000, status:'inactive', notes:''}
  ];
  db.accounts.forEach(a => a.balance = a.initialBalance);

  /* اعضا */
  const usedNid = new Set();
  for(let i=0;i<NAMES.length;i++){
    let nid; do { nid = makeNID(rnd); } while(usedNid.has(nid)); usedNid.add(nid);
    const by = 1348 + (rnd()*42|0), bm = 1 + (rnd()*12|0), bd = 1 + (rnd()*28|0);
    const jy = J.today(); const joined = J.j2iso(jy.jy - (rnd()<.5?1:2), 1+(rnd()*12|0), 1+(rnd()*28|0));
    db.members.push({
      id:'m'+(i+1), name:NAMES[i], father:pick(FATHERS),
      mobile:makeMobile(rnd), nationalId:nid,
      birthDate: by+'/'+String(bm).padStart(2,'0')+'/'+String(bd).padStart(2,'0'),
      memberNo:'MH-'+String(1000+i+1),
      status: i >= 26 ? 'inactive' : 'active',
      joinedAt: joined,
      createdAt: joined
    });
  }

  /* تراکنش‌های متفرقه ۶ ماه اخیر */
  const TX_NOTES_IN = ['سپرده‌گذاری عضو','واریز سود سپرده','بازگشت وجه','واریز کارمزد'];
  const TX_NOTES_OUT = ['برداشت هزینه جاری','پرداخت اجاره شعبه','خرید ملزومات','برداشت عضو'];
  const users3 = ['بهرام نادری','نازنین شاکری','کیوان معتمدی'];
  for(let i=0;i<42;i++){
    const acc = db.accounts[rnd()*4|0];
    const dep = rnd() < .6;
    const daysAgo = rnd()*175|0;
    const iso = J.addDaysIso(todayIso, -daysAgo);
    const amt = dep ? (5+(rnd()*60|0))*1000000 : (3+(rnd()*30|0))*1000000;
    db.txns.push({
      id:uid('tx'), accountId:acc.id, type:dep?'deposit':'withdraw', amount:amt,
      at: iso + ' ' + String(8+(rnd()*9|0)).padStart(2,'0') + ':' + String(rnd()*60|0).padStart(2,'0'),
      ref:'TRX-'+(2000+i), tracking: String(100000 + (rnd()*899999|0)),
      notes: dep ? pick(TX_NOTES_IN) : pick(TX_NOTES_OUT), user: pick(users3)
    });
    acc.balance += dep ? amt : -amt;
  }

  /* وام‌ها + اقساط + پرداخت‌ها */
  const loanPlan = [
    {mi:0, amt:150000000, months:12, rate:4, state:'normal', start:-8, fund:'f1', acc:'a1'},
    {mi:1, amt:80000000,  months:6,  rate:4, state:'normal', start:-4, fund:'f3', acc:'a4'},
    {mi:2, amt:300000000, months:24, rate:5, state:'normal', start:-13, fund:'f1', acc:'a1'},
    {mi:4, amt:50000000,  months:6,  rate:4, state:'normal', start:-3, fund:'f3', acc:'a4'},
    {mi:5, amt:200000000, months:18, rate:4, state:'overdue', start:-9, fund:'f2', acc:'a3'},
    {mi:6, amt:120000000, months:12, rate:4, state:'overdue', start:-7, fund:'f2', acc:'a3'},
    {mi:8, amt:450000000, months:36, rate:6, state:'normal', start:-16, fund:'f1', acc:'a2'},
    {mi:9, amt:60000000,  months:6,  rate:4, state:'normal', start:-2, fund:'f3', acc:'a4'},
    {mi:10,amt:250000000, months:24, rate:5, state:'overdue', start:-11, fund:'f1', acc:'a1'},
    {mi:12,amt:100000000, months:12, rate:4, state:'normal', start:-6, fund:'f2', acc:'a3'},
    {mi:13,amt:180000000, months:18, rate:4, state:'normal', start:-10, fund:'f1', acc:'a2'},
    {mi:15,amt:90000000,  months:12, rate:4, state:'paid',   start:-14, fund:'f3', acc:'a4'},
    {mi:16,amt:350000000, months:24, rate:5, state:'overdue', start:-15, fund:'f1', acc:'a1'},
    {mi:19,amt:70000000,  months:6,  rate:4, state:'paid',   start:-12, fund:'f3', acc:'a4'},
    {mi:21,amt:140000000, months:12, rate:4, state:'normal', start:-5, fund:'f2', acc:'a3'},
    {mi:23,amt:220000000, months:18, rate:5, state:'pending', start:0, fund:'f1', acc:'a1'}
  ];
  const METHODS = ['نقدی','کارت به کارت','حواله','چک'];
  loanPlan.forEach((pl, idx) => {
    const member = db.members[pl.mi];
    const startIso = J.addDaysIso(todayIso, Math.round(pl.start * 30.4));
    const reqIso = J.addDaysIso(startIso, -12), appIso = J.addDaysIso(startIso, -5);
    const per = Math.ceil(pl.amt * (1 + pl.rate/100) / pl.months / 10000) * 10000;
    const loan = {
      id:'l'+(idx+1), memberId:member.id, fundId:pl.fund, accountId:pl.acc,
      amount:pl.amt, rate:pl.rate, months:pl.months, intervalMonths:1,
      installmentAmount:per,
      requestDate:reqIso, approveDate: pl.state==='pending' ? '' : appIso,
      payDate: pl.state==='pending' ? '' : startIso,
      firstDue: pl.state==='pending' ? '' : J.j2iso(...(() => { const j = J.iso2j(startIso); const a = J.addMonths(j.jy,j.jm,j.jd,1); return [a.jy,a.jm,a.jd]; })()),
      guarantors: pl.amt >= 200000000 ? 'یک ضامن کارمند' : 'بدون ضامن',
      status: pl.state==='pending' ? 'pending' : 'active',
      notes:'', createdAt: reqIso
    };
    db.counters.loan++;
    if(pl.state !== 'pending'){
      const fd = J.iso2j(loan.firstDue);
      for(let k=0;k<pl.months;k++){
        const d = J.addMonths(fd.jy, fd.jm, fd.jd, k);
        db.installments.push({
          id:'ins-'+loan.id+'-'+(k+1), loanId:loan.id, no:k+1,
          dueDate:J.j2iso(d.jy,d.jm,d.jd), amount:per, paidAmount:0, paidDate:''
        });
      }
      /* برداشت پرداخت وام */
      db.txns.push({ id:uid('tx'), accountId:pl.acc, type:'withdraw', amount:pl.amt, at:startIso+' 10:30',
        ref:'PAY-'+loan.id.toUpperCase(), tracking:String(300000+idx*7), notes:'پرداخت اصل وام به '+member.name, user:'کیوان معتمدی' });
      db.accounts.find(a=>a.id===pl.acc).balance -= pl.amt;

      const insOf = db.installments.filter(x=>x.loanId===loan.id);
      const now = new Date(todayIso+'T12:00');
      let paidCount = 0;
      insOf.forEach(ins => {
        const isPast = ins.dueDate <= todayIso;
        let payIt = false;
        if(pl.state === 'paid') payIt = true;
        else if(pl.state === 'overdue') payIt = isPast && J.diffDays(ins.dueDate, todayIso) >= 75;
        else payIt = isPast && ins.no <= (J.diffDays(loan.firstDue, todayIso)/30.4 | 0);
        if(payIt){
          const payDate = J.addDaysIso(ins.dueDate, -(rnd()*5|0));
          const method = pick(METHODS);
          db.payments.push({ id:uid('p'), loanId:loan.id, installmentId:ins.id, amount:per, date:payDate,
            accountId:pl.acc, method, ref:'FIS-'+(5000+db.payments.length), notes:'', user:'نازنین شاکری', createdAt:payDate+' 11:00' });
          ins.paidAmount = per; ins.paidDate = payDate;
          const acc = db.accounts.find(a=>a.id===pl.acc);
          db.txns.push({ id:uid('tx'), accountId:pl.acc, type:'deposit', amount:per, at:payDate+' 11:00',
            ref:'FIS-'+(5000+db.payments.length-1), tracking:String(400000+db.payments.length*3), notes:'بازپرداخت قسط '+faDigits(ins.no)+' — '+member.name, user:'نازنین شاکری' });
          acc.balance += per;
          paidCount++;
        }
      });
      if(pl.state === 'paid' || insOf.every(i => i.paidAmount >= i.amount)){ loan.status = 'paid'; }
    }
    db.loans.push(loan);
  });

  /* کاربران */
  db.users = [
    {id:'u1', name:'بهرام نادری', username:'admin', mobile:'09121234567', email:'admin@mehregan.ir', role:'admin', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:todayIso+' 08:12'},
    {id:'u2', name:'نازنین شاکری', username:'operator', mobile:'09129876543', email:'n.shakeri@mehregan.ir', role:'operator', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:J.addDaysIso(todayIso,-1)+' 16:40'},
    {id:'u3', name:'کیوان معتمدی', username:'accountant', mobile:'09354442211', email:'', role:'accountant', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'active', lastLogin:J.addDaysIso(todayIso,-2)+' 09:05'},
    {id:'u4', name:'الهه روشنی', username:'viewer', mobile:'09198887766', email:'', role:'viewer', institutions:'مؤسسه قرض‌الحسنه مهرگان', status:'inactive', lastLogin:J.addDaysIso(todayIso,-21)+' 13:22'}
  ];

  /* لاگ ممیزی اولیه */
  db.audit = [
    {at:J.addDaysIso(todayIso,-16)+' 09:14', user:'بهرام نادری', action:'ثبت وام جدید برای '+NAMES[21], target:'loan:l15'},
    {at:J.addDaysIso(todayIso,-12)+' 11:31', user:'نازنین شاکری', action:'ثبت پرداخت قسط — '+NAMES[0], target:'loan:l1'},
    {at:J.addDaysIso(todayIso,-6)+' 15:02', user:'بهرام نادری', action:'ثبت درخواست وام برای '+NAMES[23], target:'loan:l16'},
    {at:J.addDaysIso(todayIso,-2)+' 10:20', user:'کیوان معتمدی', action:'ثبت تراکنش واریز در حساب جاری اصلی', target:'account:a1'}
  ];
  return db;
}

function loadDb(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(raw){ const d = JSON.parse(raw); if(d && d.v === 1 && Array.isArray(d.members)){
      /* تور ایمنی برای داده‌های قدیمی: هیچ عضوی نباید فیلد پایهٔ گم‌شده داشته باشد */
      d.members.forEach(m=>{ ['name','father','mobile','nationalId','birthDate','memberNo'].forEach(k=>{ if(typeof m[k]!=='string') m[k]=''; });
        if(!m.name.trim()) m.name='(عضو بدون نام)'; });
      if(d.settings && Array.isArray(d.settings.memberFields)) d.settings.memberFields = d.settings.memberFields.filter(f=>f && f.key && f.label);
      return d; } }
  }catch(e){}
  const d = seedDb();
  try{ localStorage.setItem(DB_KEY, JSON.stringify(d)); }catch(e){}
  return d;
}
function saveDb(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }catch(e){} }
/* اعتبارسنجی و آماده‌سازی دادهٔ فایل پشتیبان برای جایگزینی — بدون دست‌زدن به DB تا تأیید کاربر */
function restoreDbFromObject(d){
  if(!d || d.v !== 1 || !Array.isArray(d.members)) return {ok:false, msg:'ساختار فایل با سامانه سازگار نیست (فایل باید خروجی «پشتیبان‌گیری» همین پنل باشد).'};
  ['loans','installments','payments','txns','funds','accounts','users','audit','importTemplates'].forEach(k=>{ if(!Array.isArray(d[k])) d[k]=[]; });
  if(!d.settings || typeof d.settings !== 'object') return {ok:false, msg:'فایل، تنظیمات سامانه را ندارد.'};
  if(!d.users.length) return {ok:false, msg:'فایل حداقل باید یک کاربر داشته باشد وگرنه دیگر نمی‌توان وارد شد.'};
  if(!d.counters || typeof d.counters !== 'object') d.counters = {member: d.members.length};
  d.members.forEach(m=>{ ['name','father','mobile','nationalId','birthDate','memberNo'].forEach(k=>{ if(typeof m[k]!=='string') m[k]=''; });
    if(!m.name.trim()) m.name='(عضو بدون نام)'; });
  if(Array.isArray(d.settings.memberFields)) d.settings.memberFields = d.settings.memberFields.filter(x=>x && x.key && x.label);
  return {ok:true, data:d};
}

/* ── الگوی فیلدهای عضو (داینامیک، تنظیم‌شده توسط مدیر مؤسسه) ── */
const DEFAULT_MEMBER_FIELDS = [
  {key:'name',      label:'نام و نام خانوادگی', type:'text',   on:1, core:1, req:1},
  {key:'father',    label:'نام پدر',            type:'text',   on:1, core:1},
  {key:'mobile',    label:'شماره تماس',         type:'mobile', on:1, core:1, req:1},
  {key:'nationalId',label:'کد ملی',             type:'nid',    on:1, core:1, req:1},
  {key:'birthDate', label:'تاریخ تولد',         type:'jdate',  on:1, core:1, req:1}
];
function _MF(){ const MF=(DB.settings||{}).memberFields; return (MF&&MF.length) ? MF : DEFAULT_MEMBER_FIELDS; }
function FIELDS(){ try{ return _MF().filter(f=>f.on!==0); }catch(e){ return []; } }
function fldVal(m, key){ if(!m) return ''; const v = m[key]; if(v!==undefined && v!=='') return v; return ((m.x||{})[key]!==undefined ? (m.x||{})[key] : ''); }
function fieldOn(key){ try{ const f=_MF().find(x=>x.key===key); return !!f && f.on!==0; }catch(e){ return true; } }
function fieldDef(key){ try{ return _MF().find(x=>x.key===key); }catch(e){ return null; } }
/* الزامی بودن: برای فیلدهای پایه طبق پیش‌فرض، مگر مدیر مقدارش را عوض کرده باشد */
function fieldReq(key){ const f=fieldDef(key); if(!f) return false; if(f.req!==undefined) return !!f.req; return f.core && key!=='father'; }
/* اعضای دارای فیلد الزامیِ خالی — برای اجبار تکمیل داده‌های جدید */
function incompleteMembers(){
  const req = FIELDS().filter(f=>fieldReq(f.key));
  return DB.members.filter(m => req.some(f => !String(fldVal(m, f.key)).trim()));
}
function stampColor(task){ const c=(DB.settings&&DB.settings.stampColors)||{}; return c[task] || (task==='payment' ? '#1C6E31' : '#B3261E'); }
function resetDb(){ DB = seedDb(); saveDb(); }

/* ── تم روشن/تیره ── */
function cssVar(name, fallback){
  try{ const v = getComputedStyle(document.body).getPropertyValue(name).trim(); return v || fallback; }
  catch(e){ return fallback; }
}
function isDark(){ return document.body.classList.contains('theme-dark'); }
function applyTheme(t, rerender){
  const dark = (t === 'dark');
  document.body.classList.toggle('theme-dark', dark);
  try{ localStorage.setItem('hesabat-theme', dark ? 'dark' : 'light'); }catch(e){}
  const b = document.getElementById('btnTheme');
  if(b){ b.innerHTML = icon(dark ? 'sun' : 'moon', 17); b.title = dark ? 'حالت روشن' : 'حالت تیره';
    b.setAttribute('aria-label', dark ? 'حالت روشن' : 'حالت تیره'); }
  if(rerender && SESSION && location.hash.indexOf('#/app/') === 0){
    const page = (location.hash.slice(6).split('/')[0]) || 'dashboard';
    renderShell(page); route();
  }
}
function initTheme(){
  let t = null;
  try{ t = localStorage.getItem('hesabat-theme'); }catch(e){}
  if(!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark';
  applyTheme(t || 'light', false);
}

/* ── دسترسی‌ها ── */
const ROLE_FA = {admin:'مدیر', operator:'اپراتور', accountant:'حسابدار', viewer:'مشاهده‌گر'};
const PERM_FA = {memberAdd:'افزودن عضو', memberEdit:'ویرایش عضو', loanAdd:'ثبت وام', paymentAdd:'ثبت پرداخت', txnAdd:'ثبت تراکنش', reportExport:'خروجی گزارش', userManage:'مدیریت کاربران', settingsEdit:'ویرایش تنظیمات'};
function can(perm){
  if(!SESSION) return false;
  const m = DB.settings.roles[SESSION.role];
  return !!(m && m[perm]);
}

/* ── کوئری‌های کمکی ── */
const qMember = id => DB.members.find(m => m.id === id);
const qFund   = id => DB.funds.find(f => f.id === id);
const qAccount= id => DB.accounts.find(a => a.id === id);
const qLoan   = id => DB.loans.find(l => l.id === id);
const qUser   = id => DB.users.find(u => u.id === id);
function memberLoans(mid){ return DB.loans.filter(l => l.memberId === mid); }
function loanInstallments(lid){ return DB.installments.filter(i => i.loanId === lid).sort((a,b)=>a.no-b.no); }
function loanPayments(lid){ return DB.payments.filter(p => p.loanId === lid).sort((a,b)=> (b.date||'').localeCompare(a.date||'')); }
function insStatus(ins){
  if(ins.paidAmount >= ins.amount) return 'paid';
  const today = J.todayIso();
  if(ins.paidAmount > 0) return ins.dueDate < today ? 'overdue' : 'partial';
  if(ins.dueDate < today) return 'overdue';
  if(J.diffDays(today, ins.dueDate) <= 7) return 'dueSoon';
  return 'pending';
}
const INS_FA = {paid:'پرداخت‌شده', partial:'پرداخت ناقص', overdue:'سررسید گذشته', dueSoon:'نزدیک سررسید', pending:'در انتظار'};
function insBadge(st){
  const map = {paid:'b-green', partial:'b-amber', overdue:'b-red', dueSoon:'b-amber', pending:'b-gray'};
  return '<span class="badge '+map[st]+'"><i class="bd"></i>'+INS_FA[st]+'</span>';
}
function loanBalance(loan){
  return loanInstallments(loan.id).reduce((s,i)=> s + Math.max(0, i.amount - i.paidAmount), 0);
}
function loanPaidSum(loan){
  return loanInstallments(loan.id).reduce((s,i)=> s + i.paidAmount, 0);
}
function memberDebt(mid){
  return DB.loans.filter(l=>l.memberId===mid && l.status!=='pending')
    .reduce((s,l)=> s + loanBalance(l), 0);
}
function memberPaid(mid){
  return DB.payments.filter(p=>{ const l=qLoan(p.loanId); return l && l.memberId===mid; }).reduce((s,p)=>s+p.amount,0);
}
/* وضعیت مؤثر وام: تسویه و معوق از روی اقساط استنتاج می‌شود تا حتی اگر
   فیلد status به‌روز نشده باشد، نمایش همیشه درست باشد */
function loanEffStatus(l){
  if(!l) return 'active';
  if(l.status === 'pending' || l.status === 'cancelled') return l.status;
  const ins = loanInstallments(l.id);
  if(ins.length && ins.every(i => i.paidAmount >= i.amount)) return 'paid';
  if(l.status === 'paid') return 'paid';
  if(l.amount > 0 && loanPaidSum(l) >= l.amount) return 'paid'; /* با رسیدن مجموع پرداخت‌ها به مبلغ وام */
  const t = J.todayIso();
  if(ins.some(i => i.dueDate < t && i.paidAmount < i.amount)) return 'overdue';
  return 'active';
}
function loanBadge(lor){
  const st = (lor && typeof lor === 'object') ? loanEffStatus(lor) : lor;
  const map = {pending:'b-blue', active:'b-green', overdue:'b-red', paid:'b-lime', cancelled:'b-gray'};
  return '<span class="badge '+(map[st]||'b-gray')+'"><i class="bd"></i>'+(LOAN_STATUS_FA[st]||st)+'</span>';
}
function memberStatusBadge(st){
  return st==='active' ? '<span class="badge b-green"><i class="bd"></i>فعال</span>' : '<span class="badge b-gray"><i class="bd"></i>غیرفعال</span>';
}
function memberNoNext(){
  const t = DB.settings.memberNoTemplate || 'MH-{seq:4}';
  const seq = ++DB.counters.member;
  return t.replace(/\{seq(?::(\d+))?\}/g, (m,pad)=> String(seq).padStart(pad ? +pad : 1, '0'));
}
function audit(action, target){
  DB.audit.unshift({at: J.nowIso(), user: SESSION ? SESSION.name : 'سیستم', action, target: target||''});
  if(DB.audit.length > 400) DB.audit.length = 400;
  saveDb();
}


/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۳: کیت رابط (مودال، تقویم شمسی، توست و…)
   ═══════════════════════════════════════════════════════════════ */

/* ── توست سراسری ── */
function toast(msg, type){
  const holder = $('#gToast'); if(!holder) return;
  const d = document.createElement('div');
  d.className = 'g-toast t-' + (type || 'ok');
  d.innerHTML = icon(type==='err' ? 'warn' : type==='warn' ? 'info' : 'check', 16) + '<span>' + msg + '</span>';
  holder.appendChild(d);
  setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(), 320); }, 3600);
}

/* ── مودال ── */
let _modalStack = [];
function closeModal(){ closeJdPop(); const m = _modalStack.pop(); if(m){ m.overlay.remove(); } document.body.style.overflow = _modalStack.length ? 'hidden' : ''; }
function closeAllModals(){ while(_modalStack.length) closeModal(); }
function openModal(o){
  const root = $('#modalRoot');
  const ov = document.createElement('div');
  ov.className = 'm-overlay';
  const size = o.size ? ' sz-' + o.size : '';
  ov.innerHTML =
    '<div class="m-modal'+size+'" role="dialog" aria-modal="true">' +
      '<div class="m-head"><h3>'+o.title+(o.sub ? '<span class="m-sub">'+o.sub+'</span>' : '')+'</h3>' +
      '<button class="x-btn" data-close aria-label="بستن">'+icon('x',15)+'</button></div>' +
      '<div class="m-body">'+o.body+'</div>' +
      (o.foot ? '<div class="m-foot">'+o.foot+'</div>' : '') +
    '</div>';
  root.appendChild(ov);
  document.body.style.overflow = 'hidden';
  /* Esc آخرین مودال باز را می‌بندد (مگر بسته‌شدن غیرفعال باشد) */
  const escH = e => { if(e.key === 'Escape' && _modalStack[_modalStack.length-1] === handle && o.dismissible !== false){ e.stopPropagation(); handle.close(); } };
  document.addEventListener('keydown', escH, true);
  const handle = {
    overlay: ov,
    el: ov.querySelector('.m-modal'),
    close(){ document.removeEventListener('keydown', escH, true); const i = _modalStack.indexOf(handle); if(i>-1){ _modalStack.splice(i,1); ov.remove(); document.body.style.overflow = _modalStack.length ? 'hidden':''; } if(o.onClose) o.onClose(); }
  };
  ov.addEventListener('mousedown', e => { if(e.target === ov && o.dismissible !== false) handle.close(); });
  ov.querySelector('[data-close]').addEventListener('click', ()=>handle.close());
  _modalStack.push(handle);
  const focusable = ov.querySelector('input,select,textarea,button.btn');
  if(focusable) setTimeout(()=>focusable.focus({preventScroll:true}), 60);
  if(o.onOpen) o.onOpen(handle);
  return handle;
}
function askConfirm(o){
  return new Promise(res => {
    const m = openModal({
      size:'sm',
      title: o.title || 'تأیید عملیات',
      body: '<div class="alert '+(o.danger?'a-err':'a-warn')+'"><span class="al-ic">'+icon(o.danger?'warn':'info',18)+'</span><div>'+(o.text||'')+'</div></div>' +
            (o.note ? '<p style="font-size:.8rem;color:var(--ink-2);margin-top:10px;line-height:1.8">'+o.note+'</p>' : ''),
      foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button>' +
            '<button class="btn '+(o.danger?'btn-danger':'btn-solid')+' btn-sm" data-ok>'+esc(o.ok||'تأیید')+'</button>',
      onClose(){ res(false); }
    });
    let done = false;
    m.el.querySelector('[data-x]').onclick = ()=>{ done = true; m.close(); res(false); };
    m.el.querySelector('[data-ok]').onclick = ()=>{ done = true; res(true); m.close(); };
    const origClose = m.close; m.close = function(){ if(!done) res(false); origClose.call(m); };
  });
}

/* ── دراپ‌داون ── */
function bindDrop(btnSel, panelSel){
  const btn = $(btnSel), panel = $(panelSel); if(!btn || !panel) return;
  const wrap = btn.closest('.drop');
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = wrap.classList.contains('open');
    $$('.drop.open').forEach(d => d.classList.remove('open'));
    if(!open) wrap.classList.add('open');
  });
  panel.addEventListener('click', e => e.stopPropagation());
}
document.addEventListener('click', ()=> $$('.drop.open').forEach(d => d.classList.remove('open')));
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ $$('.drop.open').forEach(d => d.classList.remove('open')); } });

/* ── تقویم شمسی شناور (Date Picker) ── */
let _jdCloseFn = null;
function closeJdPop(){ if(_jdCloseFn) _jdCloseFn(); }
function attachJDate(input){
  if(!input || input.dataset.jdone) return;
  input.dataset.jdone = '1';
  input.classList.add('jd-inp');
  input.setAttribute('placeholder', '۱۴۰۵/۰۶/۲۲');
  const wrap = document.createElement('span');
  wrap.className = 'jd';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'jd-btn'; btn.setAttribute('aria-label','انتخاب تاریخ از تقویم');
  btn.innerHTML = icon('calendar', 15);
  wrap.appendChild(btn);

  let pop = null, view = null; // view = {jy,jm}

  function cleanupWin(){ window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); }
  function closePop(){
    if(pop){ pop.remove(); pop = null; if(_jdCloseFn === apiClose) _jdCloseFn = null; }
    cleanupWin();
  }
  const apiClose = ()=> closePop();
  /* موقعیت‌یابی شناور روی کل صفحه (بدون بریده‌شدن داخل مودال/اسکرول) */
  function reposition(){
    if(!pop) return;
    const r = wrap.getBoundingClientRect();
    if(r.bottom < -40 || r.top > window.innerHeight + 40){ closePop(); return; }
    const pw = pop.offsetWidth || 292, ph = pop.offsetHeight || 350;
    let left = (document.documentElement.dir === 'rtl') ? (r.right - pw) : r.left;
    left = clampNum(left, 8, Math.max(8, window.innerWidth - pw - 8));
    let top = r.bottom + 6;
    if(top + ph > window.innerHeight - 8) top = r.top - ph - 6;
    if(top < 8) top = 8;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function cur(){ const j = J.parse(input.value); return j || J.today(); }
  function select(j){
    input.value = faDigits(j.jy + '/' + String(j.jm).padStart(2,'0') + '/' + String(j.jd).padStart(2,'0'));
    input.dataset.iso = J.j2iso(j.jy,j.jm,j.jd);
    input.classList.remove('err');
    const f = input.closest('.field'); if(f) f.classList.remove('has-err');
    input.dispatchEvent(new Event('change', {bubbles:true}));
    closePop();
  }
  function render(){
    if(!pop) return;
    const t = J.today();
    const sel = J.parse(input.value);
    const mLen = J.mLen(view.jy, view.jm);
    // اولین روز هفته‌ی این ماه (شنبه=0)
    const g = J.j2g(view.jy, view.jm, 1);
    const dow = (new Date(g.gy, g.gm-1, g.gd).getDay() + 1) % 7; // Sat=0
    let cells = '';
    for(let i=0;i<dow;i++) cells += '<span class="jd-d blank"></span>';
    for(let d=1;d<=mLen;d++){
      const isToday = view.jy===t.jy && view.jm===t.jm && d===t.jd;
      const isSel = sel && sel.jy===view.jy && sel.jm===view.jm && sel.jd===d;
      cells += '<button type="button" class="jd-d'+(isToday?' today':'')+(isSel?' sel':'')+'" data-d="'+d+'">'+faDigits(d)+'</button>';
    }
    pop.innerHTML =
      '<div class="jd-head">' +
        '<button type="button" class="jd-nav" data-nav="next" aria-label="ماه بعد">'+icon(document.documentElement.dir==='rtl'?'chevS':'chevE',14)+'</button>' +
        '<span class="jd-t"><span>'+J.MONTHS[view.jm-1]+'</span>' +
        '<select data-year>' + Array.from({length:60},(_,i)=>{ const y = 1385+i; return '<option'+(y===view.jy?' selected':'')+'>'+faDigits(y)+'</option>'; }).join('') + '</select></span>' +
        '<button type="button" class="jd-nav" data-nav="prev" aria-label="ماه قبل">'+icon(document.documentElement.dir==='rtl'?'chevE':'chevS',14)+'</button>' +
      '</div>' +
      '<div class="jd-grid">' + J.WD.map(w=>'<span class="jd-wd">'+w+'</span>').join('') + cells + '</div>' +
      '<div class="jd-foot"><button type="button" data-today>امروز</button><button type="button" class="jclear" data-clear>پاک کردن</button></div>';
    pop.querySelector('[data-nav="next"]').onclick = ()=>{ view.jm++; if(view.jm>12){view.jm=1;view.jy++;} render(); };
    pop.querySelector('[data-nav="prev"]').onclick = ()=>{ view.jm--; if(view.jm<1){view.jm=12;view.jy--;} render(); };
    pop.querySelector('[data-year]').onchange = function(){ view.jy = parseInt(faToEn(this.value),10); render(); };
    pop.querySelectorAll('.jd-d[data-d]').forEach(b => b.onclick = ()=> select({jy:view.jy, jm:view.jm, jd:+b.dataset.d}));
    pop.querySelector('[data-today]').onclick = ()=>{ view = {jy:t.jy, jm:t.jm}; select(t); };
    pop.querySelector('[data-clear]').onclick = ()=>{ input.value=''; delete input.dataset.iso; closePop(); input.dispatchEvent(new Event('change',{bubbles:true})); };
  }
  function openPop(){
    closePop();
    const c = cur(); view = {jy:c.jy, jm:c.jm};
    pop = document.createElement('div');
    pop.className = 'jd-pop jd-fixed';
    document.body.appendChild(pop);
    _jdCloseFn = apiClose;
    render();
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    setTimeout(()=> document.addEventListener('mousedown', outside), 0);
  }
  function outside(e){
    if(pop && !wrap.contains(e.target) && !pop.contains(e.target)){ closePop(); }
    if(!pop){ document.removeEventListener('mousedown', outside); }
  }
  btn.addEventListener('click', e => { e.stopPropagation(); pop ? closePop() : openPop(); });
  input.addEventListener('focus', ()=>{ if(!pop && !input.value) {} });
  input.addEventListener('blur', ()=>{
    if(!input.value){ delete input.dataset.iso; return; }
    const j = J.parse(input.value);
    if(j){ input.value = faDigits(j.jy+'/'+String(j.jm).padStart(2,'0')+'/'+String(j.jd).padStart(2,'0')); input.dataset.iso = J.j2iso(j.jy,j.jm,j.jd); input.classList.remove('err'); }
  });
}
function jdVal(input){ // خروجی: ISO یا ''
  if(!input) return '';
  if(input.dataset.iso) return input.dataset.iso;
  const j = J.parse(input.value);
  return j ? J.j2iso(j.jy,j.jm,j.jd) : '';
}
function setJd(input, iso){
  if(!input) return;
  if(!iso){ input.value=''; delete input.dataset.iso; return; }
  const j = J.iso2j(iso);
  input.value = faDigits(j.jy+'/'+String(j.jm).padStart(2,'0')+'/'+String(j.jd).padStart(2,'0'));
  input.dataset.iso = iso;
}

/* ── ورودی مبلغ با جداکننده ── */
function attachMoney(input){
  if(!input || input.dataset.mdone) return;
  input.dataset.mdone = '1';
  input.classList.add('num-inp');
  input.setAttribute('inputmode','numeric');
  input.setAttribute('placeholder','مثلاً 50,000,000');
  const fmt = () => { const raw = faToEn(input.value).replace(/[^\d]/g,''); input.dataset.raw = raw;
    input.value = raw ? Number(raw).toLocaleString('en-US') : ''; };
  input.addEventListener('input', fmt);
  if(input.value) fmt();
}
function moneyVal(input){ return parseInt(faToEn(input ? (input.dataset.raw || input.value) : '0').replace(/[^\d]/g,''),10) || 0; }
function setMoney(input, v){ if(!input) return; input.dataset.raw = String(v||''); input.value = v ? Number(v).toLocaleString('en-US') : ''; }

/* ── اعتبارسنجی فرم ── */
function markErr(input, msg){
  const f = input.closest('.field');
  input.classList.add('err');
  if(f){ f.classList.add('has-err'); const e = f.querySelector('.err-msg'); if(e && msg) e.textContent = msg; }
}
function clearErr(input){
  const f = input.closest('.field');
  input.classList.remove('err');
  if(f) f.classList.remove('has-err');
}
function fieldVal(id){ const el = typeof id === 'string' ? $(id.charAt(0)==='#' ? id : '#'+id) : id; return el ? el.value.trim() : ''; }

/* ── جدول + صفحه‌بندی ── */
function pagerHtml(page, total, per){
  const pages = Math.max(1, Math.ceil(total/per));
  if(pages <= 1) return '';
  let nums = [];
  const add = p => { if(p>=1 && p<=pages && !nums.includes(p)) nums.push(p); };
  add(1); add(2); for(let p=page-1;p<=page+1;p++) add(p); add(pages-1); add(pages);
  nums.sort((a,b)=>a-b);
  let html = '<div class="pager">';
  html += '<button class="pg-btn" data-pg="'+(page-1)+'"'+(page<=1?' disabled':'')+'>'+icon('chevE',13)+'</button>';
  let last = 0;
  nums.forEach(p => { if(p-last>1) html += '<span style="color:var(--ink-2);font-size:.8rem">…</span>'; html += '<button class="pg-btn'+(p===page?' on':'')+'" data-pg="'+p+'">'+faDigits(p)+'</button>'; last = p; });
  html += '<button class="pg-btn" data-pg="'+(page+1)+'"'+(page>=pages?' disabled':'')+'>'+icon('chevS',13)+'</button></div>';
  return html;
}
function emptyState(o){
  return '<div class="empty"><span class="e-ic">'+icon(o.icon||'folder',26)+'</span>' +
    '<h4>'+esc(o.title)+'</h4><p>'+esc(o.desc||'')+'</p>' + (o.action || '') + '</div>';
}
function skelPage(){
  return '<div class="skel-page"><div class="skel" style="height:34px;width:38%"></div>' +
    '<div class="grid g-4">' + Array.from({length:4},()=>'<div class="skel" style="height:96px"></div>').join('') + '</div>' +
    '<div class="skel" style="height:52px"></div>' +
    '<div class="skel skel-row" style="height:330px"></div></div>';
}


/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۴: روتر، پوسته پنل، ورود و داشبورد
   ═══════════════════════════════════════════════════════════════ */

/* ── تغییر ویو ── */
function showView(name){
  $$('.view').forEach(v => v.classList.remove('active'));
  const v = $('#view-' + name); if(v) v.classList.add('active');
  document.body.classList.remove('in-landing','in-login','in-app');
  document.body.classList.add('in-' + name);
  try{ document.dispatchEvent(new CustomEvent('pile:active', {detail:{active: name==='landing'}})); }catch(e){}
  window.scrollTo(0,0);
}

/* ── روتر ── */
function route(){
  closeJdPop();
  const h = location.hash || '#/';
  function getSrv(){
    try{
      if(typeof SRV!=='undefined' && SRV.token) return SRV;
      const raw = localStorage.getItem('hesabat-srv-v1');
      if(raw){ const o = JSON.parse(raw); if(o && o.token) return o; }
    }catch(e){}
    return null;
  }
  // اگر حالت سرور فعال است، SESSION را از SRV بساز اگر نداریم — حتی اگر on=false باشد، اگر توکن داریم بساز
  try{
    const srv = getSrv();
    if(srv && srv.token && !SESSION){
      const nm = (srv.user&&srv.user.name) || srv.instName || 'مدیر';
      const ph = (srv.user&&srv.user.phone) || '';
      const rt = (srv.user&&srv.user.roleType) || (srv.user&&srv.user.role_type) || 'manager';
      SESSION = { username: ph||'srv', name: nm, role: 'admin', roleType: rt };
      try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){}
    }
  }catch(e){}
  if(h === '#/' || h === '#' || h === ''){ showView('login'); return; }
  if(h === '#/login'){
    const srv = getSrv();
    if(SESSION || (srv && srv.token)){ location.hash = '#/app/dashboard'; return; }
    showView('login'); return;
  }
  if(h.indexOf('#/app/') === 0){
    const srv = getSrv();
    const isSrvAuth = !!(srv && srv.token);
    if(!SESSION && !isSrvAuth){ location.hash = '#/login'; return; }
    showView('app');
    const parts = h.slice(6).split('/').filter(Boolean);
    const page = parts[0] || 'dashboard', arg = parts[1];
    renderShell(page);
    const main = $('#main');
    main.innerHTML = skelPage();
    main.scrollTop = 0;
    setTimeout(()=>{
      const fn = PAGES[page];
      if(fn){ try{ fn(arg); }catch(err){ console.error(err); renderError(err); } }
      else { main.innerHTML = emptyState({icon:'warn', title:'صفحه پیدا نشد', desc:'آدرس درخواستی معتبر نیست.', action:'<a class="btn btn-soft btn-sm" href="#/app/dashboard">بازگشت به داشبورد</a>'}); }
    }, 240);
    return;
  }
  location.hash = '#/';
}
function renderError(err){
  $('#main').innerHTML = emptyState({icon:'warn', title:'خطا در نمایش صفحه', desc:'مشکلی پیش آمد: ' + esc(err.message), action:'<button class="btn btn-soft btn-sm" onclick="route()">تلاش دوباره</button>'});
}
window.addEventListener('hashchange', route);

/* ── ناوبری سایدبار ── */
const NAV = [
  {key:'dashboard', label:'داشبورد', ic:'dash'},
  {key:'members', label:'اعضا و اقساط', ic:'users'},
  {key:'loans', label:'وام‌ها', ic:'loan'},
  {key:'reports', label:'گزارش‌ها و تراکنش‌ها', ic:'chart'},
  {key:'settings', label:'تنظیمات', ic:'gear'}
];
const PAGE_ALIAS = {installments:'members', txns:'reports', users:'settings'};
function overdueCount(){
  const t = J.todayIso();
  return DB.installments.filter(i => i.dueDate < t && i.paidAmount < i.amount && qLoan(i.loanId) && qLoan(i.loanId).status === 'active').length;
}
function renderShell(page){
  const active = PAGE_ALIAS[page] || page;
  const nav = $('#sbNav');
  nav.innerHTML = NAV.map(n =>
    '<button class="sb-item'+(active===n.key?' on':'')+'" data-go="'+n.key+'">' +
    icon(n.ic,19) + '<span class="lbl">'+n.label+'</span>' +
    (n.key==='members' && overdueCount() ? '<span class="cnt warn">'+faDigits(overdueCount())+'</span>' : '') +
    '</button>').join('');
  nav.querySelectorAll('[data-go]').forEach(b => b.onclick = ()=>{ location.hash = '#/app/' + b.dataset.go; document.body.classList.remove('sb-open'); });
  $('#orgName').textContent = DB.settings.institution.name;
  if(SESSION){
    $('#profName').textContent = SESSION.name;
    $('#profRole').textContent = ROLE_FA[SESSION.role] || SESSION.role;
    $('#profAv').textContent = (SESSION.name||'؟').trim().charAt(0);
    $('#sbUser').innerHTML = '<span class="avatar sz-34 amber">'+esc((SESSION.name||'؟').charAt(0))+'</span>' +
      '<span class="su-t"><b>'+esc(SESSION.name)+'</b><span>'+esc(ROLE_FA[SESSION.role]||'')+' · ' + esc(DB.settings.institution.name) + '</span></span>';
  }
  renderNotifs();
}

/* ── اعلان‌ها ── */
function computeAlerts(){
  const t = J.todayIso(), alerts = [];
  const od = DB.installments.filter(i => i.dueDate < t && i.paidAmount < i.amount && (qLoan(i.loanId)||{}).status === 'active');
  if(od.length){
    const sum = od.reduce((s,i)=> s + (i.amount - i.paidAmount), 0);
    alerts.push({ic:'warn', color:'var(--red)', html:'<b>'+faDigits(od.length)+'</b> قسط سررسیدگذشته به مبلغ <b>'+fmtMShort(sum)+'</b> '+CUR()+' نیازمند پیگیری است.', go:'#/app/installments'});
  }
  const soon = DB.installments.filter(i => insStatus(i)==='dueSoon');
  if(soon.length){
    const sum = soon.reduce((s,i)=> s + (i.amount - i.paidAmount), 0);
    alerts.push({ic:'clock', color:'var(--amber)', html:'<b>'+faDigits(soon.length)+'</b> قسط تا ۷ روز آینده سررسید می‌شود (جمعاً '+fmtMShort(sum)+' '+CUR()+').', go:'#/app/installments'});
  }
  const pendingLoans = DB.loans.filter(l=>l.status==='pending');
  if(pendingLoans.length) alerts.push({ic:'loan', color:'var(--blue)', html:'<b>'+faDigits(pendingLoans.length)+'</b> درخواست وام در انتظار تصویب/پرداخت است.', go:'#/app/loans'});
  const lowAcc = DB.accounts.filter(a=>a.status==='active' && a.balance < 40000000);
  if(lowAcc.length) alerts.push({ic:'wallet', color:'var(--amber)', html:'موجودی حساب <b>«'+esc(lowAcc[0].name)+'»</b> کمتر از ۴۰ میلیون '+CUR()+' است.', go:'#/app/settings'});
  return alerts;
}
function renderNotifs(){
  const alerts = computeAlerts();
  const pip = $('#notifPip');
  pip.classList.toggle('hidden', !alerts.length);
  pip.textContent = faDigits(alerts.length);
  $('#notifPanel').innerHTML = '<div class="dp-h">اعلان‌ها و هشدارها</div>' + (alerts.length
    ? alerts.map(a => '<button class="notif-item" data-go="'+a.go+'"><span class="ni-ic" style="color:'+a.color+'">'+icon(a.ic,17)+'</span><span>'+a.html+'</span></button>').join('')
    : '<div class="notif-empty">'+icon('check',22)+'<br>همه‌چیز مرتب است؛ هشداری وجود ندارد.</div>');
  $('#notifPanel').querySelectorAll('[data-go]').forEach(b => b.onclick = ()=>{ location.hash = b.dataset.go; $('#notifDrop').classList.remove('open'); });
}

/* ── جستجوی سریع ── */
function bindQuickSearch(){
  const box = $('#qsearch'), input = $('#qInput'), panel = $('#qsPanel');
  let hl = -1; /* نتیجهٔ برجسته برای پیمایش با کیبورد */
  const close = ()=>{ box.classList.remove('open'); hl = -1; };
  const go = (btn)=>{ close(); input.value=''; location.hash = btn.dataset.go; };
  const refresh = ()=>{
    const q = input.value.trim();
    if(q.length < 2){ close(); return; }
    const ql = q.toLowerCase();
    const mems = DB.members.filter(m => m.name.includes(q) || m.nationalId.includes(faToEn(q)) || m.mobile.includes(faToEn(q)) || m.memberNo.toLowerCase().includes(ql)).slice(0,5);
    const loans = DB.loans.filter(l => { const m = qMember(l.memberId); return m && (m.name.includes(q) || faDigits(l.amount).includes(q)); }).slice(0,4);
    const accs = DB.accounts.filter(a => a.name.includes(q) || a.number.includes(q)).slice(0,3);
    let html = '';
    if(mems.length) html += '<div class="qs-group">اعضا</div>' + mems.map(m =>
      '<button class="dp-item" data-go="#/app/members/'+m.id+'"><span class="avatar sz-34">'+esc((m.name||'؟').charAt(0))+'</span>'+esc(m.name||'—')+'<small>'+esc(m.memberNo||'')+'</small></button>').join('');
    if(loans.length) html += '<div class="qs-group">وام‌ها</div>' + loans.map(l => { const m = qMember(l.memberId); return
      '<button class="dp-item" data-go="#/app/loans/'+l.id+'">'+icon('loan',16)+esc(m?m.name:'—')+'<small>'+fmtMShort(l.amount)+' '+CUR()+'</small></button>'; }).join('');
    if(accs.length) html += '<div class="qs-group">حساب‌ها</div>' + accs.map(a =>
      '<button class="dp-item" data-go="#/app/accounts/'+a.id+'">'+icon('bank',16)+esc(a.name)+'<small>'+esc(a.number)+'</small></button>').join('');
    if(!html) html = '<div class="notif-empty">نتیجه‌ای برای «'+esc(q)+'» پیدا نشد.</div>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-go]').forEach(b => b.onclick = ()=> go(b));
    box.classList.add('open'); hl = -1;
  };
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', e => {
    const items = Array.prototype.slice.call(panel.querySelectorAll('[data-go]'));
    if(e.key === 'Escape'){ close(); input.blur(); return; }
    if(!box.classList.contains('open') || !items.length) return;
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      hl = e.key === 'ArrowDown' ? (hl + 1) % items.length : (hl - 1 + items.length) % items.length;
      items.forEach((b,i)=>{ b.classList.toggle('qs-hl', i === hl); if(i === hl && b.scrollIntoView) b.scrollIntoView({block:'nearest'}); });
    } else if(e.key === 'Enter'){
      e.preventDefault();
      (items[hl >= 0 ? hl : 0]).click();
    }
  });
  document.addEventListener('click', e => { if(!box.contains(e.target)) close(); });
}

/* ── میان‌برهای سراسری کیبورد ── */
function bindGlobalShortcuts(){
  document.addEventListener('keydown', e => {
    /* ورودی‌های متنی را مختل نکنیم مگر برای میان‌برهای ضروری */
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target && e.target.tagName || '') || e.target.isContentEditable;
    /* Ctrl/Cmd + K یا / : تمرکز جستجوی سریع */
    if(((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !inField)){
      const q = $('#qsearch');
      if(q){
        e.preventDefault();
        const inp = $('#qInput');
        if(inp){ inp.focus(); inp.select(); }
      }
      return;
    }
  });
}

/* ── نمودارها (کانواس، بدون کتابخانه) ── */
function niceCeil(v){
  if(v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for(const m of [1,1.5,2,2.5,3,4,5,6,8,10]){ if(m*p >= v) return m*p; }
  return 10*p;
}
function axisFmt(v){
  if(v >= 1e9) return faDigits((v/1e9).toLocaleString('en-US',{maximumFractionDigits:1})) + ' میلیارد';
  if(v >= 1e6) return faDigits((v/1e6).toLocaleString('en-US',{maximumFractionDigits:1}).replace(/\.0$/,'')) + ' میلیون';
  if(v >= 1e3) return faDigits((v/1e3).toLocaleString('en-US',{maximumFractionDigits:0})) + ' هزار';
  return fmtN(v);
}
function chartTip(){
  let t = $('#chartTip');
  if(!t){ t = document.createElement('div'); t.id = 'chartTip'; t.className = 'chart-tip'; document.body.appendChild(t); }
  return t;
}
function bindChartHover(cv){
  if(cv.__hoverBound) return; cv.__hoverBound = true;
  cv.addEventListener('mousemove', e => {
    const rc = cv.getBoundingClientRect();
    const x = e.clientX - rc.left, y = e.clientY - rc.top;
    const tip = chartTip();
    let html = '';
    if(cv.__bars){
      const hit = cv.__bars.find(b => x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h);
      if(hit) html = '<b>'+hit.label+'</b><span>'+(hit.fmt||fmtM)(hit.value)+'</span>';
    } else if(cv.__donut){
      const d0 = cv.__donut;
      const dx = x-d0.cx, dy = y-d0.cy, dist = Math.hypot(dx,dy);
      if(dist >= d0.r && dist <= d0.R){
        let ang = Math.atan2(dy,dx); if(ang < -Math.PI/2) ang += Math.PI*2;
        const seg = d0.segs.find(s => ang >= s.a0 && ang < s.a1);
        if(seg){
          const pct = Math.round(seg.value/d0.total*100);
          html = '<b>'+seg.label+'</b><span>'+fmtN(seg.value)+' قسط · '+faDigits(pct)+'٪</span>';
        }
      }
    } else if(cv.__lines){
      const L = cv.__lines;
      let best = null, bd = 26;
      for(const p of L.points){ const dd = Math.abs(p.x - x); if(dd < bd){ bd = dd; best = p; } }
      if(best){
        html = '<b>'+best.label+'</b>' + best.vals.map(v =>
          '<div class="ct-row"><span style="color:'+v.color+'">●</span><span>'+esc(v.name)+'</span><span class="ct-v">'+v.fmt(v.value)+'</span></div>').join('');
      }
    }
    if(html){
      tip.innerHTML = html; tip.style.opacity = '1';
      tip.style.left = Math.min(e.clientX+14, Math.max(8, window.innerWidth-240))+'px';
      tip.style.top = (e.clientY+16)+'px';
    } else tip.style.opacity = '0';
  });
  cv.addEventListener('mouseleave', ()=>{ chartTip().style.opacity = '0'; });
}
function drawDonut(cv, data, centerTitle, centerVal){
  if(!cv) return;
  const dpr = Math.min(window.devicePixelRatio||1,2);
  const rc = cv.getBoundingClientRect(); if(!rc.width) return;
  cv.width = rc.width*dpr; cv.height = rc.height*dpr;
  const c = cv.getContext('2d'); c.scale(dpr,dpr);
  const w = rc.width, h = rc.height, cx = w/2, cy = h/2, R = Math.min(w,h)/2 - 8, r = R*0.62;
  const total = data.reduce((s,d)=>s+d.value,0) || 1;
  let a0 = -Math.PI/2;
  const segs = [];
  data.forEach(d => {
    const a1 = a0 + (d.value/total)*Math.PI*2;
    c.beginPath(); c.arc(cx,cy,R,a0+0.02,Math.max(a0+0.02,a1-0.02)); c.arc(cx,cy,r,Math.max(a0+0.02,a1-0.02),a0+0.02,true); c.closePath();
    c.fillStyle = d.color; c.fill();
    segs.push({a0, a1, label:d.label, value:d.value, color:d.color});
    a0 = a1;
  });
  cv.__donut = {cx, cy, R, r, segs, total};
  c.fillStyle = cssVar('--ink','#14351F'); c.textAlign='center';
  c.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  c.fillText(centerVal, cx, cy+1);
  c.font = '600 11.5px "IBM Plex Sans Arabic", sans-serif';
  c.fillStyle = cssVar('--ink-2','#3E5747'); c.fillText(centerTitle, cx, cy+20);
  bindChartHover(cv);
}
function drawBars(cv, labels, series, opts){
  if(!cv) return;
  const dpr = Math.min(window.devicePixelRatio||1,2);
  const rc = cv.getBoundingClientRect(); if(!rc.width) return;
  cv.width = rc.width*dpr; cv.height = rc.height*dpr;
  const c = cv.getContext('2d'); c.scale(dpr,dpr);
  const w = rc.width, h = rc.height;
  const padL = 8, padR = 64, padT = 14, padB = (opts && opts.subLabels) ? 46 : 30;
  const max = niceCeil(Math.max(1, ...series.flatMap(s=>s.values)));
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const group = plotW / labels.length;
  /* محور عمودی + خطوط راهنما */
  for(let i=0;i<=4;i++){
    const y = padT + plotH*(i/4);
    c.strokeStyle = i===4 ? cssVar('--grid-strong','rgba(20,53,31,.28)') : cssVar('--grid-clr','rgba(20,53,31,.10)');
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(padL,y); c.lineTo(w-padR+8,y); c.stroke();
    const val = max*(1-i/4);
    c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif'; c.textAlign = 'left';
    c.fillText(val===0 ? '۰' : axisFmt(val), w-padR+14, y+3.5);
  }
  const rects = [];
  const full = (opts && opts.fullLabels) || labels;
  labels.forEach((lb, gi) => {
    const bw = Math.min(26, (group*0.62)/series.length);
    const gx = padL + group*gi + group/2 - (bw*series.length + 5*(series.length-1))/2;
    series.forEach((s, si) => {
      const v = s.values[gi]||0, bh = Math.max(2, (v/max)*plotH);
      const x = gx + si*(bw+5), y = padT + plotH - bh;
      c.fillStyle = s.color;
      c.beginPath();
      const rr = Math.min(6, bw/2, bh);
      c.moveTo(x, y+bh); c.lineTo(x, y+rr); c.quadraticCurveTo(x, y, x+rr, y); c.lineTo(x+bw-rr, y); c.quadraticCurveTo(x+bw, y, x+bw, y+rr); c.lineTo(x+bw, y+bh); c.closePath(); c.fill();
      rects.push({x, y, w:bw, h:bh, label:s.name+' · '+full[gi], value:v, fmt:s.fmt||fmtM});
    });
  });
  /* برچسب‌های محور افقی (پراکنده برای بازه‌های طولانی؛ با خط دوم اختیاری برای سال) */
  const step = Math.max(1, Math.ceil(labels.length/12));
  c.textAlign = 'center';
  labels.forEach((lb, gi) => {
    if(gi % step !== 0) return;
    const cx0 = padL + group*gi + group/2;
    if(opts && opts.subLabels){
      c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '700 10px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(lb, cx0, h-24);
      c.fillStyle = cssVar('--ink-2','#8A9A8F'); c.font = '600 8.5px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(opts.subLabels[gi]||'', cx0, h-10);
    } else {
      c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(lb, cx0, h-10);
    }
  });
  cv.__bars = rects;
  bindChartHover(cv);
}
/* نمودار خطی/سطحی چند سری با محور و هاور */
function drawLines(cv, labels, series, opts){
  opts = opts || {};
  if(!cv) return;
  const dpr = Math.min(window.devicePixelRatio||1,2);
  const rc = cv.getBoundingClientRect(); if(!rc.width) return;
  cv.width = rc.width*dpr; cv.height = rc.height*dpr;
  const c = cv.getContext('2d'); c.scale(dpr,dpr);
  const w = rc.width, h = rc.height;
  const padL = 8, padR = 64, padT = 14, padB = opts.subLabels ? 46 : 30;
  const max = niceCeil(Math.max(1, ...series.flatMap(s=>s.values)));
  const plotW = w - padL - padR, plotH = h - padT - padB;
  for(let i=0;i<=4;i++){
    const y = padT + plotH*(i/4);
    c.strokeStyle = i===4 ? cssVar('--grid-strong','rgba(20,53,31,.28)') : cssVar('--grid-clr','rgba(20,53,31,.10)');
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(padL,y); c.lineTo(w-padR+8,y); c.stroke();
    const val = max*(1-i/4);
    c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif'; c.textAlign = 'left';
    c.fillText(val===0 ? '۰' : axisFmt(val), w-padR+14, y+3.5);
  }
  const n = labels.length;
  const xs = i => n<=1 ? padL+plotW/2 : padL + plotW*(i/(n-1));
  const ys = v => padT + plotH*(1 - v/max);
  series.forEach(s => {
    if(opts.area){
      c.beginPath();
      s.values.forEach((v,i)=>{ i ? c.lineTo(xs(i),ys(v)) : c.moveTo(xs(i),ys(v)); });
      c.lineTo(xs(n-1), padT+plotH); c.lineTo(xs(0), padT+plotH); c.closePath();
      c.fillStyle = s.color + '26'; c.fill();
    }
    c.beginPath();
    s.values.forEach((v,i)=>{ i ? c.lineTo(xs(i),ys(v)) : c.moveTo(xs(i),ys(v)); });
    c.strokeStyle = s.color; c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke();
    s.values.forEach((v,i)=>{ c.beginPath(); c.arc(xs(i),ys(v),2.5,0,7); c.fillStyle = s.color; c.fill(); });
  });
  const step = Math.max(1, Math.ceil(n/12));
  c.textAlign = 'center';
  for(let i=0;i<n;i+=step){
    if(opts.subLabels){
      c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '700 10px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(labels[i], xs(i), h-24);
      c.fillStyle = cssVar('--ink-2','#8A9A8F'); c.font = '600 8.5px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(opts.subLabels[i]||'', xs(i), h-10);
    } else {
      c.fillStyle = cssVar('--ink-2','#3E5747'); c.font = '600 9px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(labels[i], xs(i), h-10);
    }
  }
  cv.__lines = { points: labels.map((lb,i)=>({
    x: xs(i),
    label: (opts.fullLabels ? opts.fullLabels[i] : lb),
    vals: series.map(s=>({name:s.name, color:s.color, value:s.values[i]||0, fmt:s.fmt||(v=>fmtN(v))}))
  }))};
  bindChartHover(cv);
}
function last6MonthLabels(){
  const t = J.today();
  return Array.from({length:6},(_,idx)=>{ const a = J.addMonths(t.jy,t.jm,1,idx-5); return J.MONTHS[a.jm-1]; });
}
function jMonthKey(iso){ const j = J.iso2j(String(iso).slice(0,10)); return j.jy*12 + j.jm; }
function monthKeys6(){ const t = J.today(); return Array.from({length:6},(_,idx)=>{ const a = J.addMonths(t.jy,t.jm,1,idx-5); return a.jy*12 + a.jm; }); }

/* ═══════════ داشبورد ═══════════ */
function pageDashboard(){
  const main = $('#main');
  const t = J.todayIso();
  const totalM = DB.members.length;
  const activeM = DB.members.filter(m=>m.status==='active').length;
  const activeLoans = DB.loans.filter(l=>l.status==='active');
  const paidLoans = DB.loans.filter(l=>l.status==='paid');
  const paidLoansSum = paidLoans.reduce((s,l)=>s+l.amount,0);
  const odIns = DB.installments.filter(i=> insStatus(i)==='overdue' && (qLoan(i.loanId)||{}).status==='active');
  const odSum = odIns.reduce((s,i)=> s+(i.amount-i.paidAmount), 0);
  const unpaidSum = DB.installments.filter(i=>{ const l=qLoan(i.loanId); return l && l.status==='active' && i.paidAmount < i.amount; })
    .reduce((s,i)=> s+(i.amount-i.paidAmount), 0);
  /* شاخص‌های کلیدی مدیریتی — جایگزین کارت‌های کم‌کاربرد «اعضای فعال» و «وام‌های فعال» */
  const openLoans = DB.loans.filter(l => l.status !== 'pending' && l.status !== 'cancelled' && loanEffStatus(l) !== 'paid');
  const debtSum = openLoans.reduce((s,l)=> s + loanBalance(l), 0);
  const todaysPays = DB.payments.filter(p => (p.date||'') === t);
  const todaysPaySum = todaysPays.reduce((s,p)=> s + p.amount, 0);
  const todayDue = DB.installments.filter(i => { const l = qLoan(i.loanId); return l && l.status === 'active' && i.dueDate === t && i.paidAmount < i.amount; });
  const fundsBalance = DB.accounts.filter(a=>a.status==='active').reduce((s,a)=>s+a.balance,0);
  const activeAccs = DB.accounts.filter(a=>a.status==='active').length;

  const stat = (cls, ic, label, val, sub) =>
    '<div class="stat '+cls+'"><div class="stat-top"><span class="s-ic">'+icon(ic,16)+'</span>'+label+'</div>' +
    '<div class="stat-val">'+val+'</div>'+(sub?'<div class="stat-sub">'+sub+'</div>':'')+'</div>';

  main.innerHTML =
    '<div class="page-head"><div><h1>داشبورد</h1><div class="ph-sub">نمای کلی '+esc(DB.settings.institution.name)+' — ' + J.fmtLong(t) + '</div></div>' +
      '<div class="ph-actions">' +
        qaBtn('memberAdd','plus','افزودن عضو','#addMember') +
        qaBtn('loanAdd','loan','ثبت وام','#addLoan') +
        qaBtn('paymentAdd','coins','ثبت پرداخت','#addPay') +
        qaBtn('txnAdd','swap','ثبت تراکنش','#addTxn') +
      '</div></div>' +

    '<div class="grid g-stats">' +
      stat('','users','تعداد کل اعضا', fmtN(totalM), faDigits(DB.members.filter(m=>memberDebt(m.id)>0).length)+' عضو با بدهی جاری') +
      stat(debtSum?'s-red':'s-lime','loan','بدهی جاری کل', fmtMShort(debtSum)+' <small>'+CUR()+'</small>', faDigits(openLoans.length)+' وام در حال بازپرداخت') +
      stat(todaysPaySum?'s-lime':'','coins','دریافتی امروز', fmtMShort(todaysPaySum)+' <small>'+CUR()+'</small>', faDigits(todaysPays.length)+' پرداخت · '+faDigits(todayDue.length)+' قسط سررسید امروز') +
      stat('s-teal','coins','وام‌های تسویه‌شده', fmtMShort(paidLoansSum)+' <small>'+CUR()+'</small>', faDigits(paidLoans.length)+' وام') +
      stat('s-red','warn','اقساط سررسیدگذشته', fmtMShort(odSum)+' <small>'+CUR()+'</small>', faDigits(odIns.length)+' قسط معوق') +
      stat('s-amber','clock','اقساط پرداخت‌نشده', fmtMShort(unpaidSum)+' <small>'+CUR()+'</small>', 'مانده کل اقساط جاری') +
      stat('','bank','موجودی صندوق‌ها', fmtMShort(fundsBalance)+' <small>'+CUR()+'</small>', 'جمع حساب‌های فعال') +
      stat('s-lime','wallet','حساب‌های فعال', fmtN(activeAccs), 'از '+faDigits(DB.accounts.length)+' حساب') +
    '</div>' +

    '<div class="grid g-2" style="margin-top:14px">' +
      '<div class="card"><div class="card-h"><h3>وضعیت دریافت اقساط</h3><span class="hint-t">کل اقساط وام‌های فعال</span></div><div class="card-b">' +
        '<div class="chart-box"><canvas id="chIns"></canvas></div><div class="legend" id="chInsLg"></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>گردش مالی ۶ ماه اخیر</h3><span class="hint-t">واریدی و برداشت حساب‌ها</span></div><div class="card-b">' +
        '<div class="chart-box"><canvas id="chFlow"></canvas></div><div class="legend">' +
          '<span class="lg-i"><i style="background:#1C6E31"></i>واریزی</span><span class="lg-i"><i style="background:#D98A1B"></i>برداشت</span></div></div></div>' +
    '</div>' +

    '<div class="grid g-2" style="margin-top:14px">' +
      '<div class="card tight"><div class="card-h"><h3>آخرین تراکنش‌ها</h3><a class="btn btn-soft btn-sm" href="#/app/txns">همه '+icon('chevS',12)+'</a></div><div class="card-b" id="dashTxns"></div></div>' +
      '<div class="card tight"><div class="card-h"><h3>آخرین وام‌ها</h3><a class="btn btn-soft btn-sm" href="#/app/loans">همه '+icon('chevS',12)+'</a></div><div class="card-b" id="dashLoans"></div></div>' +
    '</div>' +

    '<div class="grid g-2" style="margin-top:14px">' +
      '<div class="card tight"><div class="card-h"><h3>اقساط نزدیک به سررسید</h3><span class="hint-t">تا ۷ روز آینده</span></div><div class="card-b" id="dashSoon"></div></div>' +
      '<div class="card"><div class="card-h"><h3>هشدارها و موارد نیازمند اقدام</h3></div><div class="card-b" id="dashAlerts"></div>' +
        '<div class="card-b" style="border-top:1px dashed var(--line)"><div class="dp-h" style="padding:0 0 8px">میانبرها</div><div class="grid g-4" id="dashShorts"></div></div></div>' +
    '</div>';

  /* نمودار اقساط */
  const actIns = DB.installments.filter(i => { const l=qLoan(i.loanId); return l && l.status==='active'; });
  const cPaid = actIns.filter(i=>i.paidAmount>=i.amount).length;
  const cOd = actIns.filter(i=>insStatus(i)==='overdue').length;
  const cPart = actIns.filter(i=>insStatus(i)==='partial').length;
  const cPend = actIns.length - cPaid - cOd - cPart;
  drawDonut($('#chIns'), [
    {label:'پرداخت‌شده', value:cPaid, color:'#1C6E31'},
    {label:'در انتظار', value:cPend, color:'#9CCB3C'},
    {label:'نزدیک سررسید', value:actIns.filter(i=>insStatus(i)==='dueSoon').length, color:'#E4B54A'},
    {label:'معوق', value:cOd, color:'#B3362B'}
  ].filter(d=>d.value>0), 'کل اقساط', faDigits(actIns.length));
  $('#chInsLg').innerHTML = [
    ['#1C6E31','پرداخت‌شده',cPaid],['#9CCB3C','در انتظار',cPend],['#E4B54A','نزدیک سررسید',actIns.filter(i=>insStatus(i)==='dueSoon').length],['#B3362B','معوق',cOd]
  ].filter(x=>x[2]>0).map(x=>'<span class="lg-i"><i style="background:'+x[0]+'"></i>'+x[1]+' ('+faDigits(x[2])+')</span>').join('');

  /* نمودار گردش مالی */
  const keys = monthKeys6();
  const depV = keys.map(k => DB.txns.filter(x=>x.type==='deposit' && jMonthKey(x.at)===k).reduce((s,x)=>s+x.amount,0));
  const wdV  = keys.map(k => DB.txns.filter(x=>x.type==='withdraw' && jMonthKey(x.at)===k).reduce((s,x)=>s+x.amount,0));
  drawBars($('#chFlow'), last6MonthLabels(), [
    {name:'واریزی', color:'#1C6E31', values:depV},
    {name:'برداشت', color:'#D98A1B', values:wdV}
  ]);

  /* آخرین تراکنش‌ها */
  const ltx = [...DB.txns].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
  $('#dashTxns').innerHTML = '<div class="mini-list">' + ltx.map(x => {
    const a = qAccount(x.accountId); const dep = x.type==='deposit';
    return '<div class="mini-item"><span class="avatar sz-34 '+(dep?'':'amber')+'" style="border-radius:11px">'+icon(dep?'download':'upload',15)+'</span>' +
      '<span class="mi-t"><b>'+esc(x.notes||'—')+'</b><span>'+esc(a?a.name:'—')+' · '+J.fmt(x.at)+faTime(x.at)+'</span></span>' +
      '<span class="mi-v '+(dep?'pos':'neg')+'">'+(dep?'+':'−')+' '+fmtN(x.amount)+'</span></div>';
  }).join('') + '</div>';

  /* آخرین وام‌ها */
  const ll = [...DB.loans].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,5);
  $('#dashLoans').innerHTML = '<div class="mini-list">' + ll.map(l => {
    const m = qMember(l.memberId);
    return '<div class="mini-item" style="cursor:pointer" data-go="#/app/loans/'+l.id+'">' +
      '<span class="avatar sz-34 teal">'+esc((m?m.name:'؟').charAt(0))+'</span>' +
      '<span class="mi-t"><b>'+esc(m?m.name:'—')+'</b><span>'+faDigits(l.months)+' قسط · درخواست '+J.fmt(l.requestDate)+'</span></span>' +
      '<span class="mi-v">'+fmtMShort(l.amount)+' '+CUR()+'</span></div>';
  }).join('') + '</div>';
  $('#dashLoans').querySelectorAll('[data-go]').forEach(r => r.onclick = ()=> location.hash = r.dataset.go);

  /* اقساط نزدیک سررسید */
  const soon = DB.installments.filter(i=>{ const l=qLoan(i.loanId); return l && l.status==='active' && insStatus(i)==='dueSoon'; })
    .sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,6);
  $('#dashSoon').innerHTML = soon.length ? '<div class="mini-list">' + soon.map(i => {
    const l = qLoan(i.loanId), m = qMember(l.memberId);
    return '<div class="mini-item" style="cursor:pointer" data-go="#/app/loans/'+l.id+'">' +
      '<span class="avatar sz-34 amber" style="border-radius:11px">'+icon('clock',15)+'</span>' +
      '<span class="mi-t"><b>'+esc(m?m.name:'—')+'</b><span>قسط '+faDigits(i.no)+' · سررسید '+J.fmt(i.dueDate)+'</span></span>' +
      '<span class="mi-v neg">'+fmtN(i.amount-i.paidAmount)+'</span></div>';
  }).join('') + '</div>' : emptyState({icon:'check', title:'مورد نزدیکی نیست', desc:'تا ۷ روز آینده قسطی سررسید نمی‌شود.'});
  $('#dashSoon').querySelectorAll('[data-go]').forEach(r => r.onclick = ()=> location.hash = r.dataset.go);

  /* هشدارها + میانبرها */
  const alerts = computeAlerts();
  $('#dashAlerts').innerHTML = alerts.length
    ? alerts.map(a => '<div class="alert a-' + (a.color==='var(--red)'?'err':'warn') + '" style="margin-bottom:9px;cursor:pointer" data-go="'+a.go+'"><span class="al-ic" style="color:'+a.color+'">'+icon(a.ic,17)+'</span><div>'+a.html+'</div></div>').join('')
    : '<div class="alert a-ok"><span class="al-ic">'+icon('check',17)+'</span><div>همه‌چیز تحت کنترل است؛ مورد نیازمند اقدامی وجود ندارد.</div></div>';
  $('#dashAlerts').querySelectorAll('[data-go]').forEach(r => r.onclick = ()=> location.hash = r.dataset.go);
  $('#dashShorts').innerHTML = [
    ['memberAdd','plus','افزودن عضو','member'],['loanAdd','loan','ثبت وام','loan'],
    ['paymentAdd','coins','ثبت پرداخت','calendar'],['txnAdd','swap','ثبت تراکنش','swap']
  ].map(s => '<button class="btn btn-soft btn-sm" style="justify-content:center" data-shortcut="'+s[0]+'">'+icon(s[1],15)+' '+s[2]+'</button>').join('');
  bindShortcuts(main);
}
function qaBtn(perm, ic, label, anchor){
  const ok = can(perm);
  return '<a class="btn '+(ok?'btn-solid':'btn-ghost dis')+'" href="'+anchor+'" data-perm="'+perm+'" style="padding:11px 17px;font-size:.88rem">'+icon(ic,15)+' '+label+'</a>';
}
function bindShortcuts(root){
  root.querySelectorAll('[data-shortcut]').forEach(b => b.onclick = ()=> guard(b.dataset.shortcut, ()=> SHORTCUTS[b.dataset.shortcut]()));
  root.querySelectorAll('a[data-perm]').forEach(a => a.addEventListener('click', e => {
    if(!can(a.dataset.perm)){ e.preventDefault(); toastNoPerm(); }
    else { e.preventDefault(); SHORTCUTS[a.dataset.perm](); }
  }));
}
function toastNoPerm(){ toast('نقش شما («'+(ROLE_FA[SESSION.role]||'')+'») دسترسی لازم برای این عملیات را ندارد.', 'warn'); }
function guard(perm, fn){ if(can(perm)) fn(); else toastNoPerm(); }


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
      '<button class="btn btn-ghost btn-sm" id="mCsv" style="margin-inline-start:auto"'+(can('reportExport')?'':' disabled data-tip="مجوز خروجی ندارید"')+'>'+icon('download',13)+' خروجی CSV</button>' +
      '<button class="btn btn-ghost btn-sm" id="mReset">'+icon('refresh',13)+' حذف فیلترها</button>' +
    '</div>' +
    '<div id="mIncSlot"></div>' +
    '<div class="card tight" id="mTblWrap"></div>';
  $('#mStatus').value = membersState.status; $('#mSort').value = membersState.sort;
  $('#mCsv').onclick = ()=> guard('reportExport', ()=>{
    const head = FIELDS().map(f=>f.label).concat(['شماره عضویت','وضعیت','تعداد وام‌ها','بدهی جاری ('+CUR()+')','تاریخ عضویت']);
    const rows = filteredMembers().map(m => FIELDS().map(f=>fldVal(m,f.key)).concat([
      m.memberNo, m.status==='active'?'فعال':'غیرفعال',
      memberLoans(m.id).filter(l=>l.status!=='cancelled').length, memberDebt(m.id), J.fmt(m.joinedAt)]));
    downloadCsv('hesabat-members-'+J.todayIso()+'.csv', head, rows, 'فهرست اعضا');
  });
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
    sub: isEdit ? esc(member.name) + ' · ' + esc(member.memberNo) : 'اطلاعات هویتی عضو جدید',
    size:'lg',
    body:
      '<div class="fields" id="mfGrid">' +
          '<div class="field"><label>نام و نام خانوادگی <span class="req">*</span></label><input id="mfName" value="'+esc(isEdit?member.name:'')+'"><span class="err-msg"></span></div>' +
          '<div class="field"><label>نام پدر</label><input id="mfFather" value="'+esc(isEdit?member.father:'')+'"></div>' +
          '<div class="field"><label>تاریخ تولد'+(fieldReq('birthDate')?' <span class="req">*</span>':'')+'</label><input id="mfBirth" value="'+(isEdit?faDigits(member.birthDate):'')+'" data-iso="'+(isEdit&&/^\\d{4}-\\d{2}-\\d{2}$/.test(member.birthDate)?member.birthDate:'')+'" placeholder="۱۳۷۵/۰۴/۰۲"><span class="err-msg"></span><span class="help">از تقویم شمسی انتخاب کنید یا تایپ نمایید.</span></div>' +
          '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input id="mfMobile" class="num-inp" value="'+esc(isEdit?member.mobile:'')+'" placeholder="0912xxxxxxx" maxlength="11"><span class="err-msg"></span><span class="help">هر فرمتی (۰۹۱۲…، +98 912…، ۹۱۲…) قبول است — خودکار مرتب می‌شود.</span></div>' +
          '<div class="field"><label>کد ملی <span class="req">*</span></label><input id="mfNid" class="num-inp" value="'+esc(isEdit?member.nationalId:'')+'" maxlength="10" placeholder="۱۰ رقم"><span class="err-msg"></span></div>' +
          (!isEdit ? '<div class="field"><label>شماره عضویت</label><input id="mfNo" value="'+esc(DB.settings.memberNoTemplate.replace(/\\{seq(?::(\\d+))?\\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')))+'" disabled style="background:var(--card-2)"><span class="help">خودکار، از قالب شماره‌گذاری تنظیمات.</span></div>' : '') +
      '</div>' +
    (isEdit ? '<div class="alert a-info" style="margin-top:14px"><span class="al-ic">'+icon('info',16)+'</span><div>تاریخ عضویت: <b>'+J.fmtLong(member.joinedAt)+'</b> — شماره عضویت <b>'+esc(member.memberNo)+'</b> قابل تغییر نیست.</div></div>' : ''),
    foot: '<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="mfSave">'+icon('check',14)+' ذخیره '+(isEdit?'تغییرات':'عضو')+'</button>',
    onOpen(h){
      /* فیلدهای پایهٔ خاموش‌شده از فرم حذف می‌شوند؛ فیلدهای سفارشی در بخش سوم می‌نشینند */
      [['father','#mfFather'],['mobile','#mfMobile'],['nationalId','#mfNid'],['birthDate','#mfBirth']].forEach(([k,sel])=>{
        if(!fieldOn(k)){ const el=h.el.querySelector(sel); if(el){ const fd=el.closest('.field'); if(fd) fd.remove(); } }
      });
      const _cf = FIELDS().filter(f=>!f.core);
      if(_cf.length){
        const holder=h.el.querySelector('#mfGrid');
        const mk=document.createElement('div');
        mk.innerHTML=_cf.map(f=>'<div class="field"><label>'+esc(f.label)+(f.req?' <span class="req">*</span>':'')+'</label><input id="mf_x_'+f.key+'"'+(f.type==='num'?' class="num-inp"':'')+' value="'+esc(isEdit?String((member.x||{})[f.key]||''):'')+'"><span class="err-msg"></span></div>').join('');
        while(mk.firstChild) holder.appendChild(mk.firstChild);
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
        '<button class="btn btn-ghost btn-sm" id="pmStatement" style="padding:11px 17px;font-size:.88rem">'+icon('print',14)+' صورت‌حساب</button>' +
        '<button class="btn btn-ghost btn-sm" id="pmEdit" style="padding:11px 17px;font-size:.88rem">'+icon('edit',14)+' ویرایش</button>' +
        '<button class="btn btn-danger btn-sm" id="pmDel" style="padding:11px 17px;font-size:.88rem">'+icon('trash',14)+' حذف کامل</button>' +
        '<button class="btn btn-solid btn-sm" id="pmLoan" style="padding:11px 17px;font-size:.88rem">'+icon('loan',14)+' ثبت وام برای این عضو</button>' +
      '</div></div>' +

    '<div class="grid g-4">' +
      '<div class="stat"><div class="stat-top"><span class="s-ic">'+icon('loan',15)+'</span>تعداد وام‌ها</div><div class="stat-val">'+faDigits(loans.length)+'</div><div class="stat-sub">'+faDigits(loans.filter(l=>loanEffStatus(l)==='overdue').length)+' معوق · '+faDigits(loans.filter(l=>loanEffStatus(l)==='active').length)+' در حال بازپرداخت</div></div>' +
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
  $('#pmStatement').onclick = ()=> memberStatement(m, loans, pays, insAll);

  const tabs = {
    loans(){ return loans.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>مبلغ وام</th><th>صندوق</th><th>اقساط</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th>تاریخ درخواست</th><th></th></tr></thead><tbody>' +
      loans.map(l => '<tr><td class="c-strong c-fa-num">'+fmtM(l.amount)+'</td><td>'+esc((qFund(l.fundId)||{}).name||'—')+'</td>' +
        '<td class="c-fa-num">'+faDigits(l.months)+'</td><td class="c-fa-num">'+fmtN(loanPaidSum(l))+'</td><td class="c-fa-num'+(loanBalance(l)?'" style="color:var(--red)':'')+'">'+fmtN(loanBalance(l))+'</td>' +
        '<td>'+loanBadge(l)+'</td><td class="c-fa-num">'+J.fmt(l.requestDate)+'</td>' +
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


/* ═══════════════════════════════════════════════════════════════
   حساب‌ها — اسکریپت ۶: وام‌ها، اقساط و پرداخت‌ها، تراکنش‌ها
   ═══════════════════════════════════════════════════════════════ */

/* ═══════════ وام‌ها ═══════════ */
const loansState = { q:'', fund:'all', status:'all', min:'', max:'', from:'', to:'', page:1, per:10 };
PAGES.loans = function(arg){ if(arg){ loanDetail(arg); return; } renderLoans(); };

function renderLoans(){
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>وام‌ها</h1><div class="ph-sub">'+faDigits(DB.loans.length)+' وام · بدهی جاری کل '+fmtMShort(DB.loans.filter(l=>l.status!=='pending'&&l.status!=='cancelled').reduce((s2,lx)=>s2+loanBalance(lx),0))+' '+CUR()+'</div></div>' +
    '<div class="ph-actions"><button class="btn btn-solid btn-sm" id="btnAddLoan" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' ثبت وام جدید</button></div></div>' +
    '<div class="toolbar">' +
      '<div class="t-search">'+icon('search',15)+'<input id="lQ" placeholder="جستجو: نام عضو، کد ملی، موبایل، شماره عضویت…" value="'+esc(loansState.q)+'"></div>' +
      '<span class="t-lbl">وضعیت:</span><select class="t-select" id="lStatus">' +
        '<option value="all">همه</option><option value="active">فعال</option><option value="overdue">معوق</option><option value="pending">در انتظار تصویب</option><option value="paid">تسویه‌شده</option><option value="cancelled">لغو شده</option></select>' +
      '<span class="t-lbl">صندوق:</span><select class="t-select" id="lFund">' +
        '<option value="all">همه</option>' + DB.funds.map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('') + '</select>' +
      '<button class="btn btn-ghost btn-sm" id="lCsv" style="margin-inline-start:auto"'+(can('reportExport')?'':' disabled data-tip="مجوز خروجی ندارید"')+'>'+icon('download',13)+' خروجی CSV</button>' +
      '<button class="btn btn-ghost btn-sm" id="lReset">'+icon('refresh',13)+' حذف فیلتر</button>' +
    '</div>' +
    '<div class="card tight" id="lTblWrap"></div>';
  $('#btnAddLoan').onclick = ()=> guard('loanAdd', ()=> loanForm());
  $('#lCsv').onclick = ()=> guard('reportExport', ()=>{
    const head = ['عضو','شماره عضویت','مبلغ اصل وام ('+CUR()+')','صندوق','تعداد اقساط','پرداخت‌شده ('+CUR()+')','مانده بدهی ('+CUR()+')','وضعیت','تاریخ درخواست'];
    const rows = filteredLoans().map(l => { const m = qMember(l.memberId);
      return [m?m.name:'—', m?m.memberNo:'', l.amount, (qFund(l.fundId)||{}).name||'—', l.months, loanPaidSum(l), loanBalance(l), faLoanStatus(loanEffStatus(l)), J.fmt(l.requestDate)]; });
    downloadCsv('hesabat-loans-'+J.todayIso()+'.csv', head, rows, 'فهرست وام‌ها');
  });
  $('#lStatus').value = loansState.status; $('#lFund').value = loansState.fund;
  $('#lQ').addEventListener('input', e => { loansState.q = e.target.value; loansState.page=1; renderLoansTable(); });
  $('#lStatus').addEventListener('change', e => { loansState.status = e.target.value; loansState.page=1; renderLoansTable(); });
  $('#lFund').addEventListener('change', e => { loansState.fund = e.target.value; loansState.page=1; renderLoansTable(); });
  $('#lReset').onclick = ()=>{ loansState.q=''; loansState.status='all'; loansState.fund='all'; loansState.page=1; renderLoans(); };
  renderLoansTable();
}
function filteredLoans(){
  let list = DB.loans.slice();
  const q = loansState.q.trim(), qe = faToEn(q);
  if(q) list = list.filter(l => { const m = qMember(l.memberId);
    return m && (m.name.includes(q) || m.nationalId.includes(qe) || m.mobile.includes(qe) || m.memberNo.toLowerCase().includes(q.toLowerCase())); });
  if(loansState.status !== 'all') list = list.filter(l => loanEffStatus(l) === loansState.status);
  if(loansState.fund !== 'all') list = list.filter(l => l.fundId === loansState.fund);
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
      '<td>'+loanBadge(l)+'</td><td class="c-fa-num">'+J.fmt(l.requestDate)+'</td>' +
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
    '<div class="m-sec t-green"><div class="m-sec-h"><span class="sn">۱</span> عضو و صندوق</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>عضو <span class="req">*</span></label><select id="lfMember">' +
        '<option value="">— انتخاب عضو —</option>' + DB.members.filter(m=>m.status==='active').map(m=>'<option value="'+m.id+'"'+(presetMemberId===m.id?' selected':'')+'>'+esc(m.name)+'</option>').join('') + '</select><span class="err-msg"></span></div>' +
      '<div class="field"><label>صندوق <span class="req">*</span></label><select id="lfFund">' + DB.funds.filter(f=>f.status==='active').map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('') + '</select><span class="err-msg"></span></div>' +
      '<div class="field full"><label>حساب پرداخت/دریافت</label><select id="lfAcc"></select><span class="help">برای پرداخت اصل وام و دریافت اقساط</span></div>' +
    '</div></div></div>' +

    '<div class="m-sec t-amber"><div class="m-sec-h"><span class="sn">۲</span> مبلغ و تاریخ‌ها</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>مبلغ اصل وام <small>('+CUR()+')</small> <span class="req">*</span></label><input id="lfAmt" class="num-inp"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نرخ / کارمزد سالانه <small>(٪)</small></label><input id="lfRate" class="num-inp" value="'+esc(String(ld.rate!==undefined?ld.rate:4))+'"></div>' +
      '<div class="field"><label>تاریخ درخواست</label><input id="lfReq"></div>' +
      '<div class="field"><label>تاریخ تصویب</label><input id="lfApp"></div>' +
      '<div class="field"><label>تاریخ پرداخت</label><input id="lfPay"></div>' +
      '<div class="field"><label>وضعیت وام</label><select id="lfStatus"><option value="pending">در انتظار تصویب</option><option value="active" selected>فعال (تصویب‌شده)</option></select></div>' +
    '</div></div></div>' +

    '<div class="m-sec t-blue"><div class="m-sec-h"><span class="sn">۳</span> برنامه اقساط</div><div class="m-sec-b"><div class="fields">' +
      '<div class="field"><label>تعداد اقساط <span class="req">*</span> <small>(هر عددی — ۱ تا ۱۲۰)</small></label><input id="lfMonths" type="number" inputmode="numeric" class="num-inp" min="1" max="120" value="'+esc(String(ld.months||12))+'"><span class="help">به میل خودت؛ مثلاً ۷، ۹، ۱۵…</span><span class="err-msg"></span></div>' +
      '<div class="field"><label>فاصله / دوره اقساط</label><select id="lfInt"><option value="1"'+((ld.interval||1)==1?' selected':'')+'>ماهانه</option><option value="2"'+((ld.interval||1)==2?' selected':'')+'>دوماه یک‌بار</option><option value="3"'+((ld.interval||1)==3?' selected':'')+'>سه‌ماه یک‌بار</option></select></div>' +
      '<div class="field"><label>تاریخ اولین سررسید <span class="req">*</span></label><input id="lfFirst"><span class="err-msg"></span></div>' +
      '<div class="field"><label>مبلغ هر قسط <small>('+CUR()+')</small></label><input id="lfPer" class="num-inp"><span class="help">با تغییر مبلغ/تعداد، به‌صورت خودکار پیشنهاد می‌شود</span></div>' +
      '<div class="field full"><label>نوع اقساط</label><div class="chips" id="lfKindChips"><span class="chip on" data-k="equal">مساوی — همه اقساط یک مبلغ</span><span class="chip" data-k="custom">متغیر — مبلغ هر قسط جداگانه</span></div><span class="help">در حالت «متغیر» مبلغ هر قسط را جداگانه وارد می‌کنی؛ مجموع باید دقیقاً با «مبلغ قابل‌بازپرداخت» برابر باشد.</span></div>' +
      '<div class="field full" id="lfVarBox" style="display:none">' +
        '<div class="var-head"><b>ویرایش مبلغ هر قسط</b><div style="display:flex;gap:6px"><button type="button" class="btn btn-ghost btn-xs" id="lfVarEq">'+icon('refresh',12)+' توزیع مساوی</button><button type="button" class="btn btn-soft btn-xs" id="lfVarBal">'+icon('check',12)+' تراز خودکار روی قسط آخر</button></div></div>' +
        '<div class="var-grid" id="lfVarGrid"></div>' +
        '<div class="var-sum" id="lfVarSum"></div>' +
      '</div>' +
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
    if(lfKind==='custom') buildVarGrid();
    updateSum();
  }
  function updateSum(){
    const amt = moneyVal(el('#lfAmt')), per = moneyVal(el('#lfPer')), months = +el('#lfMonths').value;
    const rate = parseFloat(faToEn(el('#lfRate').value))||0;
    el('#lfSum').innerHTML =
      '<div class="sum-line"><span>مبلغ اصل وام</span><b>'+fmtM(amt||0)+'</b></div>' +
      '<div class="sum-line"><span>مبلغ قابل‌بازپرداخت ('+faDigits(months)+' قسط)</span><b>'+fmtM(per*months)+'</b></div>' +
      (rate > 0 ? '<div class="sum-line"><span>مجموع کارمزد تقریبی ('+faDigits(rate)+'٪)</span><b style="color:var(--amber)">'+fmtM(Math.max(0, per*months - (amt||0)))+'</b></div>' : '');
    updateVarUI();
  }
  /* ── اقساط متغیر: مبلغ هر قسط جداگانه ── */
  let lfKind = 'equal';
  function varTarget(){ return moneyVal(el('#lfPer')) * (+el('#lfMonths').value); }
  function equalPlan(){ const per = moneyVal(el('#lfPer')); return Array.from({length:+el('#lfMonths').value}, ()=>per); }
  function buildVarGrid(prefill){
    const grid = el('#lfVarGrid'); if(!grid) return; grid.innerHTML = '';
    const months = +el('#lfMonths').value;
    const base = (prefill && prefill.length===months) ? prefill : equalPlan();
    for(let i=0;i<months;i++){
      const it = document.createElement('div'); it.className = 'var-it';
      it.innerHTML = '<span class="vn">'+faDigits(i+1)+'</span>';
      const inp = document.createElement('input'); inp.className = 'num-inp vamt'; inp.dataset.i = i;
      it.appendChild(inp); grid.appendChild(it);
      attachMoney(inp); setMoney(inp, base[i]||0);
      inp.addEventListener('input', updateVarUI);
    }
    updateVarUI();
  }
  function readPlan(){ const g = el('#lfVarGrid'); if(!g) return []; return Array.from(g.querySelectorAll('.vamt')).map(i=>moneyVal(i)); }
  function updateVarUI(){
    if(lfKind !== 'custom') return;
    const sum = el('#lfVarSum'); if(!sum) return;
    const plan = readPlan(); if(!plan.length) return;
    const tot = plan.reduce((x,y)=>x+y,0), tg = varTarget(), diff = tg - tot;
    sum.innerHTML = '<span>مجموع اقساط: <b>'+fmtM(tot)+'</b></span><span>مبلغ قابل‌بازپرداخت: <b>'+fmtM(tg)+'</b></span>' +
      (diff===0 ? '<span class="badge b-green"><i class="bd"></i>تراز است</span>'
                : '<span class="badge b-red"><i class="bd"></i>'+fmtM(Math.abs(diff))+' '+(diff>0?'کم‌تر':'بیش‌تر')+'</span>');
  }
  el('#lfKindChips').querySelectorAll('.chip').forEach(c => c.onclick = ()=>{
    lfKind = c.dataset.k;
    el('#lfKindChips').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on', x===c));
    el('#lfVarBox').style.display = lfKind==='custom' ? '' : 'none';
    if(lfKind==='custom') buildVarGrid();
    updateVarUI();
  });
  el('#lfVarEq').onclick = ()=> buildVarGrid();
  el('#lfVarBal').onclick = ()=>{
    const plan = readPlan(); if(!plan.length) return;
    const diff = varTarget() - plan.reduce((x,y)=>x+y,0);
    if(diff!==0) plan[plan.length-1] = Math.max(0, (plan[plan.length-1]||0) + diff);
    buildVarGrid(plan);
  };
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
    const amt = moneyVal(el('#lfAmt')), intM = +el('#lfInt').value;
    const months = clampNum(Math.round(+el('#lfMonths').value || 0), 1, 120);
    let okf = true;
    const need = (cond, inp, msg) => { if(cond) clearErr(inp); else { markErr(inp,msg); okf = false; } };
    need(memberId, el('#lfMember'), 'عضو را انتخاب کنید.');
    need(amt > 0, el('#lfAmt'), 'مبلغ وام را وارد کنید.');
    need(months >= 1 && months <= 120, el('#lfMonths'), 'تعداد اقساط بین ۱ تا ۱۲۰ باشد.');
    need(!!jdVal(el('#lfFirst')), el('#lfFirst'), 'تاریخ اولین سررسید الزامی است.');
    if(!okf){ toast('برخی فیلدها ناقص است.','err'); return; }
    const status = el('#lfStatus').value;
    const payIso = jdVal(el('#lfPay'));
    let _plan = null;
    if(lfKind === 'custom'){
      _plan = readPlan();
      const _t = _plan.reduce((x,y)=>x+y,0), _g = varTarget();
      if(_t !== _g){ toast('مجموع اقساط ('+fmtM(_t)+') با مبلغ قابل‌بازپرداخت ('+fmtM(_g)+') برابر نیست — «تراز خودکار» را بزنید یا مبلغ‌ها را اصلاح کنید.','err'); return; }
    }
    const loan = {
      id: uid('l'), memberId, fundId, accountId: accId || null,
      amount: amt, rate: parseFloat(faToEn(el('#lfRate').value))||0, months, intervalMonths:intM,
      installmentAmount: moneyVal(el('#lfPer')) || Math.ceil(amt/months/10000)*10000,
      plan: _plan,
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
  const plan = Array.isArray(loan.plan) ? loan.plan : null;
  for(let k = existing; k < loan.months; k++){
    const d = J.addMonths(fd.jy, fd.jm, fd.jd, k * loan.intervalMonths);
    const amt = (plan && plan[k] !== undefined && plan[k] !== null) ? +plan[k] : loan.installmentAmount;
    DB.installments.push({ id: uid('ins'), loanId: loan.id, no: k+1, dueDate: J.j2iso(d.jy,d.jm,d.jd),
      amount: amt, paidAmount: 0, paidDate: '' });
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
      '<h1>وام '+esc(m?m.name:'—')+'</h1><div class="ph-sub">'+loanBadge(l)+' &nbsp; ثبت در '+J.fmt(l.createdAt)+'</div></div>' +
      '<div class="ph-actions">' +
        (l.status==='pending' ? '<button class="btn btn-solid btn-sm" id="ldActivate" style="padding:11px 17px;font-size:.88rem">'+icon('check',15)+' تصویب و فعال‌سازی</button>' : '') +
        (loanEffStatus(l)!=='paid' && (l.status==='active') ? '<button class="btn btn-solid btn-sm" id="ldPay" style="padding:11px 17px;font-size:.88rem">'+icon('coins',15)+' ثبت پرداخت</button>' +
          '<button class="btn btn-danger btn-sm" id="ldCancel" style="padding:11px 17px;font-size:.88rem">'+icon('ban',15)+' لغو وام</button>' : '') +
        (loanEffStatus(l)==='paid' && l.status==='active' ? '<button class="btn btn-solid btn-sm" id="ldSettle" style="padding:11px 17px;font-size:.88rem">'+icon('check',15)+' تسویه وام</button>' : '') +
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

    (l.status==='paid' ? '<div class="alert a-ok" style="margin-top:14px"><span class="al-ic">'+icon('check',16)+'</span><div>این وام به‌طور کامل <b>تسویه</b> شده و بسته است — دیگر پرداخت روی آن ممکن نیست؛ فقط تاریخچهٔ اقساط پرداخت‌شده نمایش داده می‌شود.</div></div>' : '') +

    '<div class="card tight" style="margin-top:14px"><div class="card-h"><h3>'+(l.status==='paid'?'تاریخچهٔ اقساط پرداخت‌شده':'برنامه اقساط')+'</h3><span class="hint-t">'+faDigits(ins.length)+' قسط</span></div>' +
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
  const stl = $('#ldSettle');
  if(stl) stl.onclick = ()=> guard('loanAdd', async ()=>{
    const ok = await askConfirm({title:'تسویهٔ نهایی وام', text:'ماندهٔ بدهی این وام <b>صفر</b> است. با تسویه، وام بسته می‌شود و <b>دیگر هیچ پرداختی</b> روی آن ممکن نیست؛ فقط تاریخچهٔ اقساط پرداخت‌شده نمایش داده می‌شود. ادامه می‌دهید؟', ok:'بله، تسویهٔ نهایی'});
    if(!ok) return;
    l.status = 'paid';
    audit('تسویهٔ نهایی وام '+(m?m.name:'')+' (ماندهٔ صفر)', 'loan:'+l.id);
    saveDb(); toast('وام «'+(m?m.name:'')+'» به‌طور کامل تسویه شد. 🎉','ok'); route();
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
/* رسید پرداخت صفی — فهرست اقساط پوشش‌داده‌شده و ماندهٔ پس از پرداخت (دمو و سرور) */
function payReceipt(o){
  const lbl = a => (typeof a.no === 'number' ? 'قسط '+faDigits(a.no) : String(a.no));
  const rows = (o.alloc||[]).map(a =>
    '<div class="pq-row done"><span class="pq-n">'+icon('calendar',13)+' '+esc(lbl(a))+'</span>' +
    '<span class="pq-m">'+fmtN(a.take)+'</span>' +
    '<span class="pq-tick">'+(a.full ? icon('check',13)+' کامل شد' : 'جزئی شد')+'</span></div>').join('');
  openModal({ size:'sm', title:o.title||'رسید پرداخت', sub:o.sub||'',
    body:'<div class="pq-box">'+(rows||'<div class="pq-empty">تخصیصی ثبت نشد.</div>') +
      '<div class="pq-row pq-total"><span class="pq-n">'+icon('wallet',13)+' ماندهٔ بدهی پس از این پرداخت</span><b class="pq-m">'+(o.remainAfter>0?fmtN(o.remainAfter)+' '+CUR():'صفر — تسویه کامل ✅')+'</b></div></div>',
    foot:'<button class="btn btn-solid btn-sm" data-x style="min-width:130px">'+icon('check',14)+' متوجه شدم</button>',
    onOpen(h){ h.el.querySelector('[data-x]').onclick=()=>h.close(); }
  });
}
function paymentForm(presetLoanId, presetInsId){
  /* پرداخت صفی: فیلد انتخاب قسط برداشته شد — مبلغ به‌ترتیب از «اولین قسط باز» تخصیص می‌یابد
     و بزرگ‌تر از «ماندهٔ قابل‌پرداخت» پذیرفته نمی‌شود تا بدهی هرگز منفی نشود */
  const activeLoans = DB.loans.filter(l => { const st = loanEffStatus(l); return st === 'active' || st === 'overdue'; });
  const accs = DB.accounts.filter(a => a.status === 'active');
  const m = openModal({
    title:'ثبت پرداخت قسط', sub:'تخصیص خودکار و صفی — از اولین قسط باز به ترتیب جلو می‌رود', size:'lg',
    body: '<div class="fields">' +
      '<div class="field"><label>وام <span class="req">*</span></label><select id="pfLoan">' +
        '<option value="">— انتخاب وام —</option>' + activeLoans.map(l => { const mm = qMember(l.memberId); return '<option value="'+l.id+'"'+(presetLoanId===l.id?' selected':'')+'>'+esc(mm?mm.name:'—')+' — '+fmtMShort(l.amount)+' '+CUR()+'</option>'; }).join('') + '</select><span class="err-msg"></span></div>' +
      '<div class="field"><label>مبلغ پرداخت <small>('+CUR()+')</small> <span class="req">*</span></label><input id="pfAmt" class="num-inp"><span class="err-msg"></span><span class="help" id="pfRemain"></span></div>' +
      '<div class="field"><label>تاریخ پرداخت <span class="req">*</span></label><input id="pfDate"></div>' +
      '<div class="field"><label>حساب دریافت‌کننده <span class="req">*</span></label><select id="pfAcc">'+accs.map(a=>'<option value="'+a.id+'">'+esc(a.name)+' — '+esc((qFund(a.fundId)||{}).name||'')+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>روش پرداخت</label><select id="pfMethod">'+['نقدی','کارت به کارت','حواله','چک','برداشت از سپرده'].map(x=>'<option>'+x+'</option>').join('')+'</select></div>' +
      '<div class="field"><label>شماره پیگیری / مرجع</label><input id="pfRef" class="num-inp" placeholder="مثلاً FIS-6120"></div>' +
      '<div class="field full"><label>توضیحات</label><textarea id="pfNotes" rows="2"></textarea></div>' +
      '<div class="full"><div id="pfQueue" class="pq-box"><div class="pq-empty">وام را انتخاب کنید تا صف اقساط و نحوهٔ تخصیص مبلغ نمایش داده شود.</div></div></div>' +
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="pfSave">'+icon('check',14)+' ثبت پرداخت</button>',
    onOpen(hh){
      const elx = id => hh.el.querySelector(id);
      attachMoney(elx('#pfAmt')); attachJDate(elx('#pfDate')); setJd(elx('#pfDate'), J.todayIso());
      const loanOf = ()=> qLoan(elx('#pfLoan').value);
      const openIns = lid => loanInstallments(lid).filter(i => i.paidAmount < i.amount);
      const remainOf = l => l ? loanBalance(l) : 0;
      /* پیش‌نمایش زندهٔ صف: این مبلغ دقیقاً روی کدام اقساط می‌نشیند */
      function renderQueue(){
        const box = elx('#pfQueue'), l = loanOf();
        if(elx('#pfRemain')) elx('#pfRemain').textContent = l ? 'ماندهٔ قابل‌پرداخت: '+fmtN(remainOf(l))+' '+CUR() : '';
        if(!l){ box.innerHTML = '<div class="pq-empty">وام را انتخاب کنید تا صف اقساط و نحوهٔ تخصیص مبلغ نمایش داده شود.</div>'; return; }
        const amt = moneyVal(elx('#pfAmt')), rem = remainOf(l), open = openIns(l.id);
        if(!open.length){ box.innerHTML = '<div class="pq-empty">این وام قسط بازی ندارد.</div>'; return; }
        let left = Math.min(amt, rem), rows = '';
        open.forEach(i => {
          const need = i.amount - i.paidAmount;
          const take = Math.max(0, Math.min(need, left)); if(take > 0) left -= take;
          const st = take<=0 ? 'wait' : (take >= need ? 'full' : 'part');
          rows += '<div class="pq-row '+st+'"><span class="pq-n">'+icon('calendar',13)+' قسط '+faDigits(i.no)+'</span>' +
                  '<span class="pq-m">'+fmtN(need)+'</span>' +
                  '<span class="pq-tick">'+(st==='full' ? icon('check',13)+' کامل می‌شود' : st==='part' ? 'جزئی — '+fmtN(take) : 'در انتظار')+'</span></div>';
        });
        box.innerHTML = '<div class="pq-head"><b>تخصیص خودکار مبلغ — صف اقساط</b><span class="pq-rem">مانده پس از این پرداخت: <b>'+fmtN(Math.max(0, rem - Math.min(amt, rem)))+'</b> '+CUR()+'</span></div>' + rows +
          (amt > rem ? '<div class="pq-over">'+icon('warn',15)+' مبلغ بیشتر از مانده است؛ سقف واریز <b>'+fmtN(rem)+' '+CUR()+'</b></div>' : '');
      }
      function defaultFill(){
        const l = loanOf(); if(!l){ renderQueue(); return; }
        const open = openIns(l.id);
        let pre = open[0] ? (open[0].amount - open[0].paidAmount) : 0;
        if(presetInsId){ const pi = open.find(x=>x.id===presetInsId); if(pi) pre = pi.amount - pi.paidAmount; }
        setMoney(elx('#pfAmt'), pre);
        renderQueue();
      }
      elx('#pfLoan').addEventListener('change', defaultFill);
      elx('#pfAmt').addEventListener('input', renderQueue);
      defaultFill();

      hh.el.querySelector('[data-x]').onclick = ()=> hh.close();
      hh.el.querySelector('#pfSave').onclick = ()=> commitPay();

      async function commitPay(){
        const l = loanOf();
        const amt = moneyVal(elx('#pfAmt')), dateIso = jdVal(elx('#pfDate'));
        let okf = true;
        const need = (cond, inp, msg)=>{ if(cond) clearErr(inp); else { markErr(inp,msg); okf=false; } };
        need(l, elx('#pfLoan'), 'وام را انتخاب کنید.');
        need(amt > 0, elx('#pfAmt'), 'مبلغ پرداخت را وارد کنید.');
        need(!!dateIso, elx('#pfDate'), 'تاریخ پرداخت معتبر نیست.');
        if(!okf){ toast('برخی فیلدها ناقص است.','err'); return; }
        const member = qMember(l.memberId);
        if(loanEffStatus(l) === 'paid'){ toast('این وام پیش‌تر به‌طور کامل تسویه شده و قابل واریز نیست.','warn'); return; }
        const rem = remainOf(l);
        if(rem <= 0){ toast('این وام ماندهٔ قابل‌پرداختی ندارد.','warn'); return; }
        if(amt > rem){ markErr(elx('#pfAmt'), 'بیشتر از مانده نمی‌توانی واریز کنی — سقف '+fmtN(rem)+' '+CUR()+' است.'); toast('بیشتر از ماندهٔ وام قابل واریز نیست.','err'); renderQueue(); return; }
        const ref = fieldVal(elx('#pfRef'));
        if(ref){
          const dup = DB.payments.find(p => p.loanId === l.id && p.ref.trim() === ref.trim());
          if(dup){
            const ok = await askConfirm({title:'پرداخت تکراری', danger:true, ok:'به هر حال ثبت شود',
              text:'پرداختی با مرجع <b>'+esc(ref)+'</b> قبلاً برای همین وام ثبت شده است ('+J.fmt(dup.date)+'، '+fmtM(dup.amount)+'). ادامه می‌دهید؟'});
            if(!ok) return;
          }
        }
        /* تخصیص صفی: از اولین قسط باز، هر قسط فقط تا سقف ماندهٔ خودش — نه ریال اضافه */
        let left = amt; const alloc = [];
        openIns(l.id).forEach(i => {
          if(left <= 0) return;
          const nd = i.amount - i.paidAmount;
          const take = Math.min(nd, left);
          i.paidAmount += take; left -= take;
          if(i.paidAmount >= i.amount){ i.paidAmount = i.amount; i.paidDate = dateIso; }
          alloc.push({ id:i.id, no:i.no, take, full:(i.paidAmount >= i.amount) });
        });
        const firstNo = alloc.length ? alloc[0].no : '';
        const accId = elx('#pfAcc').value;
        const acc = qAccount(accId);
        DB.payments.push({ id:uid('p'), loanId:l.id, installmentId:(alloc[0]||{}).id||'', amount:amt, date:dateIso, accountId:accId,
          method:elx('#pfMethod').value, ref:ref||('FIS-'+(5000+DB.payments.length+1)), notes:fieldVal(elx('#pfNotes')), user:SESSION.name, createdAt:J.nowIso(),
          alloc: alloc.map(a => ({insId:a.id, no:a.no, take:a.take, full:a.full})) });
        DB.txns.push({ id:uid('tx'), accountId:accId, type:'deposit', amount:amt, at:dateIso+' 12:00',
          ref:'FIS-'+(5000+DB.payments.length), tracking:'', notes:'بازپرداخت '+(alloc.length>1 ? faDigits(alloc.length)+' قسط' : 'قسط '+faDigits(firstNo))+' — '+(member?member.name:''), user:SESSION.name });
        acc.balance += amt;
        audit('ثبت پرداخت '+fmtM(amt)+' ('+faDigits(alloc.length)+' قسط) وام '+(member?member.name:''), 'loan:'+l.id);
        /* ماندهٔ صفر = «آمادهٔ تسویه»؛ بستن نهایی فقط با تأیید کاربر از دکمهٔ «تسویه وام» */
        const readyToSettle = (rem - amt) <= 0;
        saveDb();
        const fullN = alloc.filter(a=>a.full).length, partN = alloc.length - fullN;
        toast(readyToSettle ? 'پرداخت ثبت شد؛ ماندهٔ بدهی صفر شد — برای بستن وام، دکمهٔ «تسویه وام» را در صفحهٔ وام بزنید.'
                            : 'پرداخت ثبت شد — '+faDigits(fullN)+' قسط کامل'+(partN?' + '+faDigits(partN)+' قسط ناقص':'')+'.', 'ok');
        stampFx({ text: 'پرداخت شد',
          sub: fmtM(amt)+' — '+J.fmt(dateIso),
          color: stampColor('payment'),
          hold: 1050,
          onDone: ()=>{
            hh.close();
            payReceipt({ title: readyToSettle ? 'ماندهٔ بدهی صفر شد — آمادهٔ تسویه 🎉' : 'رسید پرداخت',
              sub: (member?member.name:'—')+' · '+fmtM(amt)+' · '+J.fmt(dateIso),
              alloc, amt, remainAfter: Math.max(0, rem - amt), settled: readyToSettle });
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
      '<button class="btn btn-ghost btn-sm" id="tCsv" style="margin-inline-start:auto"'+(can('reportExport')?'':' disabled data-tip="مجوز خروجی ندارید"')+'>'+icon('download',13)+' خروجی CSV</button>' +
    '</div>' +
    '<div class="card tight" id="tWrap"></div>';
  $('#tCsv').onclick = ()=> guard('reportExport', ()=>{
    let list = DB.txns.slice();
    if(txState.acc!=='all') list = list.filter(x=>x.accountId===txState.acc);
    if(txState.type!=='all') list = list.filter(x=>x.type===txState.type);
    if(txState.from) list = list.filter(x=>x.at.slice(0,10)>=txState.from);
    if(txState.to) list = list.filter(x=>x.at.slice(0,10)<=txState.to);
    if(txState.min) list = list.filter(x=>x.amount>=txState.min);
    if(txState.max) list = list.filter(x=>x.amount<=txState.max);
    list = list.slice().sort((a,b)=>a.at.localeCompare(b.at));
    const head = ['تاریخ و زمان','حساب','نوع','مبلغ ('+CUR()+')','مرجع','پیگیری','توضیحات','کاربر ثبت‌کننده'];
    const rows = list.map(x => [J.fmt(x.at)+faTime(x.at), (qAccount(x.accountId)||{}).name||'—', faTxnType(x.type), x.amount, x.ref||'', x.tracking||'', x.notes||'', x.user||'']);
    downloadCsv('hesabat-txns-'+J.todayIso()+'.csv', head, rows, 'تراکنش‌ها');
  });
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
/* صورت‌حساب عضو برای چاپ — از همان چارچوب printRoot گزارش‌ها */
function memberStatement(m, loans, pays, insAll){
  const inst = DB.settings.institution || {name:''};
  const prField = (k,v)=> '<td><b>'+esc(k)+':</b> '+esc(v==null||v===''?'—':v)+'</td>';
  const idRows = FIELDS().map(f => prField(f.label, fldVal(m,f.key))).join('') +
    prField('شماره عضویت', m.memberNo) + prField('وضعیت', m.status==='active'?'فعال':'غیرفعال') + prField('تاریخ عضویت', J.fmtLong(m.joinedAt));
  const lnTbl = loans.length
    ? '<h2 class="pr-h2">وام‌ها ('+faDigits(loans.length)+')</h2><table><thead><tr><th>مبلغ اصل وام</th><th>صندوق</th><th>اقساط</th><th>پرداخت‌شده</th><th>مانده</th><th>وضعیت</th><th>تاریخ درخواست</th></tr></thead><tbody>' +
      loans.map(l=>'<tr><td>'+fmtN(l.amount)+' '+CUR()+'</td><td>'+esc((qFund(l.fundId)||{}).name||'—')+'</td><td>'+faDigits(l.months)+'</td><td>'+fmtN(loanPaidSum(l))+'</td><td>'+fmtN(loanBalance(l))+'</td><td>'+faLoanStatus(loanEffStatus(l))+'</td><td>'+J.fmt(l.requestDate)+'</td></tr>').join('') +
      '</tbody></table>' : '<h2 class="pr-h2">وام‌ها</h2><p class="pr-filters">وامی ثبت نشده است.</p>';
  const insUnpaid = insAll.filter(i=>i.paidAmount < i.amount).sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''));
  const insTbl = insUnpaid.length
    ? '<h2 class="pr-h2">اقساط باقی‌مانده ('+faDigits(insUnpaid.length)+')</h2><table><thead><tr><th>قسط</th><th>وام</th><th>سررسید</th><th>مبلغ</th><th>مانده</th><th>وضعیت</th></tr></thead><tbody>' +
      insUnpaid.map(i=>'<tr><td>'+faDigits(i.no)+'</td><td>'+fmtMShort(i.loan.amount)+' '+CUR()+'</td><td>'+J.fmt(i.dueDate)+'</td><td>'+fmtN(i.amount)+'</td><td>'+fmtN(i.amount-i.paidAmount)+'</td><td>'+faInsStatus(insStatus(i))+'</td></tr>').join('') +
      '</tbody></table>' : '';
  const payTbl = pays.length
    ? '<h2 class="pr-h2">پرداخت‌ها ('+faDigits(pays.length)+')</h2><table><thead><tr><th>تاریخ</th><th>مبلغ</th><th>روش</th><th>حساب</th><th>مرجع</th></tr></thead><tbody>' +
      pays.map(p=>'<tr><td>'+J.fmt(p.date)+'</td><td>'+fmtN(p.amount)+' '+CUR()+'</td><td>'+esc(p.method||'—')+'</td><td>'+esc((qAccount(p.accountId)||{}).name||'—')+'</td><td>'+esc(p.ref||'—')+'</td></tr>').join('') +
      '</tbody></table>' : '';
  const totPaid = pays.reduce((s,p)=>s+(p.amount||0),0);
  const totDebt = loans.reduce((s,l)=>s+(l.status==='cancelled'?0:loanBalance(l)),0);
  const root = document.getElementById('printRoot');
  root.innerHTML =
    '<div class="pr-head"><h1>'+esc(inst.name)+' — صورت‌حساب عضو</h1>' +
    '<p>تاریخ تهیه: '+J.fmtLong(J.todayIso())+' · تهیه‌کننده: '+esc(SESSION.name)+' ('+esc(ROLE_FA[SESSION.role])+')</p></div>' +
    '<h2 class="pr-h2">اطلاعات عضو</h2><table class="pr-kpis"><tbody><tr>'+idRows+'</tr></tbody></table>' +
    '<table class="pr-kpis"><tbody><tr><td><b>مجموع پرداخت‌ها:</b> '+fmtN(totPaid)+' '+CUR()+'</td><td><b>بدهی جاری:</b> '+fmtN(totDebt)+' '+CUR()+'</td><td><b>تعداد وام‌ها:</b> '+faDigits(loans.length)+'</td></tr></tbody></table>' +
    lnTbl + insTbl + payTbl +
    '<div class="pr-sum">امضای تأیید مؤسسه: ــــــــــــــــــــــــ &nbsp;&nbsp; امضای عضو: ــــــــــــــــــــــــ</div>';
  document.body.classList.add('printing');
  const done = ()=>{ document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(()=>window.print(), 60);
  setTimeout(done, 3000);
  audit('تهیه صورت‌حساب چاپی برای '+m.name, 'report');
}

/* خروجی CSV عمومی جدول‌ها (ساده، بدون تحلیل) — جدا از گزارش‌های بخش گزارش‌ها */
function csvEsc(c){ const s = String(c==null?'':c); return /[",\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function downloadCsv(name, head, rows, auditWhat){
  const blob = new Blob(['﻿'+[head].concat(rows).map(r=>r.map(csvEsc).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  if(URL.revokeObjectURL) setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  if(auditWhat) audit('خروجی CSV '+auditWhat+' ('+faDigits(rows.length)+' رکورد)', 'report');
  toast('فایل CSV با '+faDigits(rows.length)+' رکورد دانلود شد.','ok');
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
  a.click(); if(URL.revokeObjectURL) setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
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
    title: isEdit ? 'ویرایش کاربر' : 'افزودن کاربر جدید',
    body:'<div class="fields">' +
      '<div class="field"><label>نام و نام خانوادگی <span class="req">*</span></label><input id="ufName" value="'+esc(isEdit?user.name:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>نام کاربری <span class="req">*</span></label><input id="ufUser" class="num-inp" value="'+esc(isEdit?user.username:'')+'"'+(isEdit?' disabled style="background:var(--card-2)"':'')+'><span class="err-msg"></span></div>' +
      '<div class="field"><label>شماره موبایل <span class="req">*</span></label><input id="ufMobile" class="num-inp" value="'+esc(isEdit?user.mobile:'')+'"><span class="err-msg"></span></div>' +
      '<div class="field"><label>ایمیل <small>(اختیاری)</small></label><input id="ufMail" class="num-inp" value="'+esc(isEdit?user.email:'')+'"></div>' +
      '<div class="field"><label>نقش <span class="req">*</span></label><select id="ufRole">'+Object.keys(ROLE_FA).map(r=>'<option value="'+r+'"'+(isEdit&&user.role===r?' selected':'')+'>'+ROLE_FA[r]+'</option>').join('')+'</select><span class="help" id="ufRoleHelp"></span></div>' +
      '<div class="field"><label>مؤسسه / مؤسسات مجاز</label><input id="ufInst" value="'+esc(isEdit?user.institutions:DB.settings.institution.name)+'"></div>' +
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="ufSave">'+icon('check',14)+' ذخیره کاربر</button>',
    onOpen(hh){
      const roleHelp = ()=>{ const r = hh.el.querySelector('#ufRole').value;
        const perms = Object.keys(DB.settings.roles[r]||{}).filter(p=>DB.settings.roles[r][p]).map(p=>PERM_FA[p]);
        hh.el.querySelector('#ufRoleHelp').textContent = 'دسترسی‌ها: ' + (perms.length?perms.join('، '):'فقط مشاهده'); };
      hh.el.querySelector('#ufRole').addEventListener('change', roleHelp); roleHelp();
      hh.el.querySelector('[data-x]').onclick = ()=>hh.close();
      hh.el.querySelector('#ufSave').onclick = ()=>{
        const name = fieldVal('#ufName'), uname = fieldVal('#ufUser'), mob = fieldVal('#ufMobile');
        let okf = true;
        const need = (c,i,msg)=>{ if(c) clearErr(i); else { markErr(i,msg); okf=false; } };
        need(name.length>=3, $('#ufName'),'نام را کامل وارد کنید.');
        need(/^[a-zA-Z0-9_.-]{3,}$/.test(uname), $('#ufUser'),'نام کاربری معتبر نیست (حداقل ۳ کاراکتر لاتین).');
        need(validMobile(mob), $('#ufMobile'),'شماره موبایل معتبر نیست.');
        const dup = DB.users.find(x=>x.username===uname && (!isEdit||x.id!==user.id));
        need(!dup, $('#ufUser'),'این نام کاربری قبلاً ثبت شده است.');
        if(!okf) return;
        if(isEdit) Object.assign(user, {name, mobile:mob, email:fieldVal('#ufMail'), role:$('#ufRole').value, institutions:fieldVal('#ufInst')||DB.settings.institution.name});
        else DB.users.push({id:uid('u'), name, username:uname, mobile:mob, email:fieldVal('#ufMail'), role:$('#ufRole').value, institutions:fieldVal('#ufInst')||DB.settings.institution.name, status:'active', lastLogin:''});
        audit((isEdit?'ویرایش':'ایجاد')+' کاربر '+uname, 'user');
        saveDb(); toast('کاربر ذخیره شد.','ok'); hh.close(); route();
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
      sec('secFld','users','فیلدهای اعضا','الگوی فیلدها در فرم عضو، جدول و ورود گروهی') +
      sec('secFa','wallet','صندوق‌ها و حساب‌ها','مدیریت صندوق‌ها، حساب‌های بانکی و موجودی آن‌ها') +
      sec('secFin','coins','عمومی مالی و شماره‌گذاری','واحد پول، قالب شماره عضویت و پیش‌فرض‌های وام') +
      sec('secNotif','info','اعلان‌ها','یادآور سررسید، تأیید پرداخت و گزارش هفتگی') +
      sec('secUi','image','ظاهر و مُهرها','رنگ مُهرهای ثبت و ترجیحات نمایش');
    renderOrgSec(body.querySelector('#secOrg .sec-b'));
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
    
    body.innerHTML = '<div class="fields">' +
      '<div class="field full"><label>نام و لوگوی مؤسسه</label><div class="field-row" style="gap:14px">' +
        '<span id="logoPrev" style="display:inline-flex;width:58px;height:58px;border-radius:16px;overflow:hidden;background:rgba(28,110,49,.1);align-items:center;justify-content:center;color:var(--green-deep);flex:none">' +
        (s.institution.logo ? '<img src="'+s.institution.logo+'" style="width:100%;height:100%;object-fit:cover" alt="لوگو">' : icon('image',24)) + '</span>' +
        '<div style="flex:1"><input type="file" id="setLogo" accept="image/*"><span class="help">لوگو در هدر و چاپ گزارش‌ها استفاده می‌شود.</span></div></div></div>' +
      '<div class="field"><label>نام مؤسسه <span class="req">*</span></label><input id="setOrgName" value="'+esc(s.institution.name)+'"'+disAttr+'></div>' +
      '<div class="field"><label>شماره تماس</label><input id="setOrgPhone" class="num-inp" value="'+esc(s.institution.phone)+'"'+disAttr+'></div>' +
      '<div class="field full"><label>آدرس</label><textarea id="setOrgAddr"'+disAttr+'>'+esc(s.institution.address)+'</textarea></div>' +
      (canEdit ? '<div class="full"><button class="btn btn-solid btn-sm" id="setOrgSave">'+icon('check',14)+' ذخیره اطلاعات مؤسسه</button></div>' : noPermNote()) +
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
      $('#orgName').textContent = name; renderShell('settings'); toast('اطلاعات مؤسسه ذخیره شد.','ok');
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
  /* حالت سرور: تنظیمات مالی از خود مؤسسهٔ PostgreSQL می‌آید و به آن برمی‌گردد —
     یعنی همان چیزهایی که در «افتتاح حساب» انتخاب شده، اینجا هم خوش‌دیده و قابل ویرایش است */
  const srvFin = (SRV.on && srvReady());
  if(srvFin) return renderSrvFinSec(body, canEdit, disAttr, s);
    
    body.innerHTML = '<div class="fields">' +
      '<div class="field"><label>واحد پول</label><select id="setCur"'+disAttr+'><option'+(s.currency==='تومان'?' selected':'')+'>تومان</option><option'+(s.currency==='ریال'?' selected':'')+'>ریال</option></select></div>' +
      '<div class="field"><label>قالب شماره‌گذاری اعضا</label><input id="setNoTpl" class="num-inp" value="'+esc(s.memberNoTemplate)+'"'+disAttr+'>' +
        '<span class="help">متغیر <b>{seq}</b> یا <b>{seq:4}</b> = شماره ردیف. پیش‌نمایش: <b id="noPrev">'+esc(s.memberNoTemplate.replace(/\{seq(?::(\d+))?\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')))+'</b></span></div>' +
      '<div class="field"><label>پیش‌فرض کارمزد سالانه وام <small>(٪)</small></label><input id="setLdRate" class="num-inp" value="'+esc(String((s.loanDefaults||{}).rate!==undefined?s.loanDefaults.rate:4))+'"'+disAttr+'><span class="help">فرم ثبت وام با این مقدار پر می‌شود.</span></div>' +
      '<div class="field"><label>پیش‌فرض تعداد اقساط <small>(هر عددی — ۱ تا ۱۲۰)</small></label><input id="setLdMonths" class="num-inp" type="number" inputmode="numeric" min="1" max="120" value="'+esc(String((s.loanDefaults||{}).months||12))+'"'+disAttr+'><span class="help">تعداد اقساط پیشنهادی هنگام ثبت وام جدید — با آنبردینگ سینک است.</span></div>' +
      '<div class="field"><label>پیش‌فرض دوره اقساط</label><select id="setLdInt"'+disAttr+'><option value="1"'+(((s.loanDefaults||{}).interval||1)==1?' selected':'')+'>ماهانه</option><option value="2"'+((s.loanDefaults||{}).interval==2?' selected':'')+'>دوماه یک‌بار</option><option value="3"'+((s.loanDefaults||{}).interval==3?' selected':'')+'>سه‌ماه یک‌بار</option></select></div>' +
      (canEdit ? '<div class="full"><button class="btn btn-solid btn-sm" id="setFinSave">'+icon('check',14)+' ذخیره تنظیمات مالی</button></div>' : noPermNote()) +
    '</div>';
    const tpl = $('#setNoTpl');
    if(tpl) tpl.addEventListener('input', ()=>{ $('#noPrev').textContent = tpl.value.replace(/\{seq(?::(\d+))?\}/g,(x,p)=>String(DB.counters.member+1).padStart(p?+p:1,'0')); });
    const sv = $('#setFinSave'); if(sv) sv.onclick = ()=>{
      s.currency = $('#setCur').value; s.memberNoTemplate = fieldVal('#setNoTpl') || 'M-{seq:4}';
      s.loanDefaults = {
        rate: Math.max(0, Math.min(100, +fieldVal('#setLdRate') || 0)),
        months: clampNum(Math.round(+($('#setLdMonths')&&$('#setLdMonths').value)||0),1,120)||12,
        interval: +($('#setLdInt')&&$('#setLdInt').value) || 1
      };
      audit('به‌روزرسانی تنظیمات مالی', 'settings'); saveDb(); toast('تنظیمات مالی ذخیره شد.','ok'); route();
    };
  }

/* تنظیمات مالی در حالت سرور — مقادیر همان institutions است که موقع «افتتاح حساب» ساخته شد.
   عنوان‌ها شامل نام مؤسسه و modifiable هر تعداد اقساط (۱ تا ۱۲۰)، دوره اقساط، واحد پول، کارمزد. */
async function renderSrvFinSec(body, canEdit, disAttr, s){
  body.innerHTML = '<p class="hint-t" style="padding:10px 4px">در حال بارگذاری تنظیمات مؤسسه از سرور…</p>';
  let inst = null;
  try{ const r = await srvFetch('GET', '/api/institutions/'+SRV.instId); inst = r.institution||r; }catch(e){ body.innerHTML='<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>'; return; }
  const lm = s.loanDefaults||{};
  const perOpts = [['monthly','ماهانه'],['bimonthly','دوماه یک‌بار'],['quarterly','سه‌ماه یک‌بار']];
  const per = inst.installment_period||'monthly';
  body.innerHTML =
    '<div class="alert a-info" style="margin-bottom:14px"><span class="al-ic">'+icon('info',16)+'</span><div>این تنظیمات از <b>'+esc(inst.name||SRV.instName||'')+'</b> (PostgreSQL) خوانده می‌شود و علاوه‌بر نمایش، با کلیک ذخیره، در دیتابیس سرور هم به‌روزرسانی می‌شود — همان آپشن‌های «افتتاح حساب».</div></div>'+
    '<div class="fields">' +
      '<div class="field"><label>واحد پول</label><select id="setSrvCur"'+disAttr+'><option'+(inst.currency==='تومان'?' selected':'')+'>تومان</option><option'+(inst.currency==='ریال'?' selected':'')+'>ریال</option></select></div>' +
      '<div class="field"><label>پیش‌فرض کارمزد سالانه وام <small>(٪)</small></label><input id="setSrvFee" class="num-inp" type="number" min="0" max="100" value="'+esc(String(inst.fee_percent!=null?inst.fee_percent:4))+'"'+disAttr+'><span class="help">همان «کارمزد» آنبردینگ — فرم ثبت وام با این مقدار پر می‌شود.</span></div>' +
      '<div class="field"><label>پیش‌فرض تعداد اقساط <small>(هر عددی — ۱ تا ۱۲۰)</small></label><input id="setSrvMonths" class="num-inp" type="number" inputmode="numeric" min="1" max="120" value="'+esc(String(inst.installments_count||12))+'"'+disAttr+'><span class="help">همان «تعداد اقساط پیش‌فرض» آنبردینگ.</span></div>' +
      '<div class="field"><label>دوره اقساط</label><select id="setSrvPeriod"'+disAttr+'>'+perOpts.map(o=>'<option value="'+o[0]+'"'+(per===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><span class="help">همان «دوره اقساط» آنبردینگ.</span></div>' +
      '<div class="field full"><label>نام مؤسسه</label><input id="setSrvName" value="'+esc(inst.name||'')+'"'+disAttr+'></div>' +
      '<div class="field full"><label>آدرس مؤسسه</label><textarea id="setSrvAddr" rows="2"'+disAttr+'>'+esc(inst.address||'')+'</textarea></div>' +
      '<div class="field full"><label style="color:var(--ink-2);font-weight:600">فیلدهای محلی (فقط حالت دمو)</label></div>'+
      '<div class="field"><label>قالب شماره‌گذاری اعضا (فقط دمو)</label><input id="setNoTpl" class="num-inp" value="'+esc(s.memberNoTemplate)+'"'+disAttr+'><span class="help">متغیر {seq} یا {seq:4} = شماره ردیف.</span></div>' +
      '<div class="field"><label>پیش‌فرض محلی کارمزد/اقساط (فقط دمو)</label><div style="display:flex;gap:6px">'+
        '<input id="setLdRate" class="num-inp" value="'+esc(String(lm.rate!==undefined?lm.rate:4))+'"'+disAttr+' placeholder="کارمزد ٪">'+
        '<input id="setLdMonths" class="num-inp" type="number" min="1" max="120" value="'+esc(String(lm.months||12))+'"'+disAttr+' placeholder="اقساط">'+
        '<select id="setLdInt"'+disAttr+'><option value="1"'+(((lm.interval||1)==1)?' selected':'')+'>ماهانه</option><option value="2"'+((lm.interval)==2?' selected':'')+'>دوماه یک‌بار</option><option value="3"'+((lm.interval)==3?' selected':'')+'>سه‌ماه یک‌بار</option></select>'+
      '</div></div>' +
      (canEdit ? '<div class="full"><button class="btn btn-solid btn-sm" id="setSrvFinSave">'+icon('check',14)+' ذخیره تنظیمات مالی (سرور)</button></div>' : noPermNote()) +
    '</div>';
  const sv = $('#setSrvFinSave'); if(sv) sv.onclick = async ()=>{
    const monthsN = clampNum(Math.round(parseInt($('#setSrvMonths').value)||0),1,120);
    const payload = {
      name: $('#setSrvName').value.trim()||inst.name,
      address: $('#setSrvAddr').value,
      currency: $('#setSrvCur').value,
      fee_percent: Math.max(0,Math.min(100,+$('#setSrvFee').value||0)),
      installments_count: monthsN,
      installment_period: $('#setSrvPeriod').value
    };
    try{
      await srvFetch('PATCH', '/api/institutions/'+SRV.instId, payload);
      s.memberNoTemplate = fieldVal('#setNoTpl') || s.memberNoTemplate;
      s.loanDefaults = {
        rate: Math.max(0, Math.min(100, +fieldVal('#setLdRate') || 0)),
        months: clampNum(Math.round(+($('#setLdMonths')&&$('#setLdMonths').value)||0),1,120)||12,
        interval: +($('#setLdInt')&&$('#setLdInt').value) || 1
      };
      SRV.instName = payload.name; srvSave();
      audit('به‌روزرسانی تنظیمات مالی مؤسسه در سرور', 'settings'); saveDb();
      toast('تنظیمات مالی در سرور ذخیره شد — با همان آپشن‌های آنبردینگ.','ok'); route();
    }catch(e){ toast('خطا در ذخیره سرور: '+e.message,'err'); }
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
    
    let _srcSrv = false;
    try{ _srcSrv = (typeof SRV!=='undefined' && SRV.on && srvReady()); }catch(e){}
    body.innerHTML =
      '<div class="alert '+(_srcSrv?'a-info':'a-warn')+'" style="margin-bottom:13px"><span class="al-ic">'+icon('info',16)+'</span><div>' +
        (_srcSrv ? '<b>منبع دادهٔ نمایش: سرور PostgreSQL.</b> عملیات این بخش روی «دادهٔ محلی (دمو)» انجام می‌شود و هیچ اثری روی داده‌های سرور ندارد؛ پس پاک‌سازیِ این‌جا عددهای داشبورد سرور را صفر نمی‌کند.'
                 : '<b>منبع دادهٔ نمایش: حافظهٔ محلی مرورگر (دمو).</b> عملیات این بخش روی همین داده اعمال می‌شود؛ «شروع از صفر» همهٔ رکوردها را برای همیشه پاک می‌کند و دادهٔ نمونه دوباره ساخته نمی‌شود.') +
      '</div></div>' +
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
      DB.audit = []; DB.importTemplates = [];
      DB.counters.member = 0; DB.counters.loan = 0; /* ری‌است کامل شمارنده‌ها؛ وام/عضو بعدی دوباره از یک شروع می‌شود */
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
        SRV.on = true;
        // مؤسسه‌های کاربر را بگیر
        try {
          const me = await srvFetch('GET','/api/auth/me');
          if(me.institutions && me.institutions[0]){
            SRV.instId = me.institutions[0].id;
            SRV.instName = me.institutions[0].name;
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
  try{
    if(typeof SRV!=='undefined'){
      SRV.on = false;
      try{ localStorage.setItem(SRV_KEY, JSON.stringify(SRV)); }catch(e){}
    } else {
      // اگر SRV global نیست، از storage بخوان و on را false کن
      try{
        const raw = localStorage.getItem('hesabat-srv-v1');
        if(raw){
          const o = JSON.parse(raw);
          o.on = false;
          localStorage.setItem('hesabat-srv-v1', JSON.stringify(o));
        }
      }catch(e){}
    }
  }catch(e){}
  try{ toast('از سامانه خارج شدید.','warn'); }catch(e){}
  setTimeout(()=>{
    try{ location.href = 'Hesabat.html'; }catch(e){ location.hash = '#/'; }
  }, 250);
}

/* ═══════════ راه‌اندازی ═══════════ */
const SRV_KEY = 'hesabat-srv-v1';
/* وقتی پنل با http/https سرو شود (مثلاً پیش‌نمایش یا سرور واقعی)، آدرس سرور همان مبدأ است؛
   وقتی به‌صورت فایل محلی (file:) باز شود، سرور محلی پیش‌فرض استفاده می‌شود. */
const SRV_DEFAULT_BASE = (typeof location !== 'undefined' && /^https?:$/.test(location.protocol))
  ? '' : 'http://localhost:4000';
let SRV = { base:SRV_DEFAULT_BASE, token:'', user:null, instId:null, instName:'', on:false };
try { const sv = JSON.parse(localStorage.getItem(SRV_KEY)); if(sv && typeof sv === 'object') SRV = Object.assign(SRV, sv); } catch(e){}
function srvSave(){ try{ localStorage.setItem(SRV_KEY, JSON.stringify(SRV)); }catch(e){} }
function srvReady(){ return !!(SRV.token && SRV.instId); }

let SRV_FIELDS = null; /* کش تعریف فیلدهای مؤسسهٔ متصل */

/* ── کلاینت API ── */
async function srvFetch(method, path, body){
  const headers = {'Content-Type':'application/json'};
  if(SRV.token) headers['Authorization'] = 'Bearer ' + SRV.token;
  let r;
  try {
    const baseUrl = (typeof SRV.base === 'string' ? SRV.base : '').replace(/\/+$/,'');
    r = await fetch(baseUrl + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch(e){
    const err = new Error('اتصال به سرور برقرار نشد. آدرس سرور و اجرای بودن آن را بررسی کنید.');
    err.network = true; throw err;
  }
  let j = null; try { j = await r.json(); } catch(_){}
  if(!r.ok){
    const err = new Error((j && j.error) || ('خطای سرور (' + r.status + ')'));
    err.status = r.status; err.details = j && j.details; throw err;
  }
  return j;
}
async function srvLoadFields(force){
  if(!force && SRV_FIELDS) return SRV_FIELDS;
  const r = await srvFetch('GET', '/api/institutions/' + SRV.instId + '/fields');
  SRV_FIELDS = r.fields || [];
  return SRV_FIELDS;
}
function srvDropFieldsCache(){ SRV_FIELDS = null; }

(function boot(){
  DB = loadDb();
  // کمکی: توکن سرور را هم از global هم از localStorage بخوان
  function getSrvFromStorage(){
    try{
      if(typeof SRV!=='undefined' && SRV.token) return SRV;
      const raw = localStorage.getItem('hesabat-srv-v1');
      if(raw){ const o = JSON.parse(raw); if(o && o.token) return o; }
    }catch(e){}
    return null;
  }
  try{
    const s = localStorage.getItem(SES_KEY) || sessionStorage.getItem(SES_KEY);
    if(s){
      const o = JSON.parse(s);
      if(o && o.username){
        const srv = getSrvFromStorage();
        const isSrv = !!(srv && srv.token);
        if(isSrv || DB.users.some(u=>u.username===o.username && u.status==='active')) SESSION = o;
      }
    }
  }catch(e){}
  // اگر SRV توکن دارد ولی SESSION نداریم، از SRV بساز (فیکس خروج سریع بعد ثبت)
  try{
    const srv = getSrvFromStorage();
    if(!SESSION && srv && srv.token && srv.user){
      const nm = srv.user.name || srv.instName || 'مدیر';
      const ph = srv.user.phone || '';
      const rt = srv.user.roleType || srv.user.role_type || 'manager';
      SESSION = { username: ph||'srv', name: nm, role: 'admin', roleType: rt };
      try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){}
    } else if(!SESSION && typeof SRV!=='undefined' && SRV.token && SRV.user){
      const nm = SRV.user.name || SRV.instName || 'مدیر';
      const ph = SRV.user.phone || '';
      SESSION = { username: ph||'srv', name: nm, role: 'admin', roleType: SRV.user.roleType||'manager' };
      try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){}
    }
  }catch(e){}

  if(SESSION && (location.hash==='' || location.hash==='#/' || location.hash==='#' || location.hash==='#/login')){
    location.hash = '#/app/dashboard';
  }

  initTheme();
  const btnTheme = $('#btnTheme');
  if(btnTheme) btnTheme.addEventListener('click', ()=> applyTheme(isDark() ? 'light' : 'dark', true));
  bindGlobalShortcuts();
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


/* ═══════════════════════════════════════════════════════════════
   لایهٔ اتصال به سرور (فاز ۱ معماری): حالت دوگانهٔ دمو + سرور
   - دمودیتا دست‌نخورده باقی می‌ماند
   - با روشن‌شدن «حالت سرور»، فیلدها و اعضا از Backend/PostgreSQL می‌آیند
   ═══════════════════════════════════════════════════════════════ */



/* ── نگاشت نوع فیلد سرور به کنترل ورودی ── */
const SRV_TYPE_LABEL = { text:'متن', number:'عدد', date:'تاریخ', bool:'بله/خیر', select:'انتخابی', mobile:'شماره تماس', nid:'کد ملی' };
function srvFieldInput(f, val){
  const id = 'sf_' + f.key;
  const v = val === undefined || val === null ? '' : val;
  const req = f.is_required ? ' <span style="color:var(--red)">*</span>' : '';
  const lbl = '<label for="' + id + '">' + esc(f.label) + req + '</label>';
  if(f.type === 'bool'){
    return '<div class="field"><label>' + esc(f.label) + req + '</label><div class="field-row">' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="' + id + '" ' + (v === 'true' ? 'checked' : '') + '> فعال</label>' +
      '</div></div>';
  }
  if(f.type === 'select'){
    const opts = (Array.isArray(f.options) ? f.options : []).map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
    return '<div class="field">' + lbl + '<select id="' + id + '"><option value="">—</option>' + opts + '</select></div>';
  }
  const ph = f.type === 'date' ? '۱۴۰۳/۰۵/۰۲' : f.type === 'mobile' ? '۰۹۱۲…' : f.type === 'nid' ? '۱۰ رقم' : f.type === 'number' ? 'عدد' : '';
  return '<div class="field">' + lbl + '<input type="text" id="' + id + '" value="' + esc(v) + '" placeholder="' + ph + '"></div>';
}

/* ── بخش اتصال در تنظیمات (تب سازمان) ── */
function injectSrvSec(){
  const body = $('#setBody'); if(!body || $('#secSrv')) return;
  const div = document.createElement('div');
  div.className = 'card tight set-sec';
  div.id = 'secSrv';
  div.style.marginBottom = '16px';
  div.innerHTML = '<div class="card-h"><h3>' + icon('gear',16) + ' منبع داده و اتصال سرور (PostgreSQL)</h3><span class="hint-t">داده‌ها از کجا خوانده/نوشته شوند: حافظهٔ محلی (دمو) یا سرور واقعی</span></div><div class="card-b sec-b" id="srvBox"></div>';
  body.insertBefore(div, body.firstChild);
  renderSrvSec();
}
function renderSrvSec(){
  const box = $('#srvBox'); if(!box) return;
  const conn = srvReady();
  const dsOn = SRV.on && srvReady();
  const dsCard = (k, on, ic, t, d) => '<div class="ds-card'+(on?' on':'')+'" data-ds="'+k+'" role="button" tabindex="0">' +
    '<span class="ds-ic">'+icon(ic,17)+'</span><span class="ds-t"><b>'+t+'</b><p>'+d+'</p></span>' +
    '<span class="ds-check">'+(on?icon('check',12):'')+'</span></div>';
  box.innerHTML =
    '<div style="margin-bottom:6px"><b style="font-size:.93rem">منبع داده</b><p style="font-size:.78rem;color:var(--ink-2);margin-top:3px">پنل داده‌ها را از کجا بخواند؟ همهٔ صفحات (داشبورد، اعضا، وام‌ها، گزارش‌ها) بر اساس این انتخاب پر می‌شوند.</p></div>' +
    '<div class="ds-grid">' +
      dsCard('local', !dsOn, 'wallet', 'حافظهٔ محلی مرورگر (دمو)', 'داده‌ها روی همین مرورگر ذخیره می‌شود؛ برای آزمایش سریع. نیازی به سرور نیست.') +
      dsCard('server', dsOn, 'bank', 'سرور PostgreSQL', conn ? 'متصل به مؤسسهٔ «'+esc(SRV.instName||('#'+SRV.instId))+'» — داده‌ها از API خوانده می‌شود.' : 'داده‌ها از پایگاه‌دادهٔ واقعی از طریق API خوانده می‌شود. ابتدا اتصال را از فرم پایین بسازید.') +
    '</div>' +
    '<div class="card-h" style="padding:14px 0 8px;border:0"><h3 style="font-size:.82rem">'+icon('gear',15)+' تنظیمات اتصال سرور</h3></div>' +
    '<div class="setting-row"><div class="sr-t"><b>وضعیت اتصال</b><p>' +
      (conn ? 'متصل به <b>' + esc(SRV.base) + '</b> — مؤسسهٔ <b>' + esc(SRV.instName || ('#' + SRV.instId)) + '</b> (' + esc((SRV.user && SRV.user.name) || '') + ')</p>'
            : 'هنوز به سروری متصل نشده‌اید. ابتدا وارد شوید یا حساب بسازید.</p>') +
      '</div>' + (conn ? '<button class="btn btn-soft btn-sm" id="srvLogout">' + icon('x',14) + ' قطع اتصال</button>' : '') + '</div>' +
    (conn ? '' :
      '<div class="fields" style="max-width:640px">' +
        '<div class="field full"><label>آدرس سرور (API)</label><input type="text" id="srvBase" value="' + esc(SRV.base) + '" placeholder="http://localhost:4000"></div>' +
        '<div class="field"><label>ایمیل</label><input type="text" id="srvEmail" placeholder="admin@example.com"></div>' +
        '<div class="field"><label>رمز عبور</label><input type="password" id="srvPass" placeholder="حداقل ۶ حرف"></div>' +
      '</div>' +
      '<div class="field-row" style="gap:8px;margin-top:10px">' +
        '<button class="btn btn-soft btn-sm" id="srvLogin">' + icon('check',14) + ' ورود</button>' +
        '<button class="btn btn-soft btn-sm" id="srvReg">' + icon('plus',14) + ' ساخت حساب</button>' +
        '<button class="btn btn-soft btn-sm" id="srvPing">' + icon('info',14) + ' آزمایش سلامت سرور</button>' +
      '</div>' +
      '<div id="srvInstBox" style="display:none;margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">' +
        '<div class="fields" style="max-width:640px">' +
          '<div class="field full"><label>مؤسسهٔ خود را انتخاب کنید</label><select id="srvInstSel"></select></div>' +
          '<div class="field"><label>یا مؤسسهٔ جدید — نام</label><input type="text" id="srvNewName" placeholder="قرض‌الحسنه …"></div>' +
          '<div class="field"><label>اسلاگ (اختیاری)</label><input type="text" id="srvNewSlug" placeholder="my-inst"></div>' +
        '</div>' +
        '<div class="field-row" style="gap:8px;margin-top:10px">' +
          '<button class="btn btn-soft btn-sm" id="srvInstCreate">' + icon('plus',14) + ' ساخت مؤسسه</button>' +
          '<button class="btn btn-primary btn-sm" id="srvInstGo">' + icon('check',14) + ' اتصال به مؤسسهٔ انتخابی</button>' +
        '</div>' +
      '</div>') +
    (conn ?
      '<div class="setting-row"><div class="sr-t"><b>حالت سرور</b><p>با فعال‌شدن، فیلدها و اعضا از سرور (PostgreSQL) خوانده و نوشته می‌شوند. دمودیتا دست نمی‌خورد.</p></div>' +
        '<button class="btn btn-sm ' + (SRV.on ? 'btn-primary' : 'btn-soft') + '" id="srvToggle">' + icon('check',14) + (SRV.on ? ' فعال است — برای غیرفعال‌کردن بزنید' : ' فعال‌سازی حالت سرور') + '</button></div>'
      : '');
  const $id = x => document.getElementById(x);
  const ping = $id('srvPing');
  if(ping) ping.onclick = async ()=>{
    SRV.base = ($id('srvBase').value || '').trim() || SRV.base; srvSave();
    try { const j = await fetch(SRV.base.replace(/\/+$/,'') + '/api/health').then(r => r.json());
      toast(j.ok ? 'سرور پاسخ می‌دهد ✔' : 'پاسخ سرور معتبر نبود.', j.ok ? 'ok' : 'err');
    } catch(e){ toast('سرور در دسترس نیست: ' + SRV.base, 'err'); }
  };
  const doAuth = async (path)=>{
    SRV.base = ($id('srvBase').value || '').trim() || SRV.base;
    const email = ($id('srvEmail').value || '').trim();
    const pass = ($id('srvPass').value || '');
    if(!email || !pass){ toast('ایمیل و رمز را وارد کنید.', 'err'); return; }
    try {
      const j = await srvFetch('POST', path, { email, password: pass, name: email.split('@')[0] });
      SRV.token = j.token; SRV.user = j.user; srvSave();
      toast('ورود موفق. حالا مؤسسه را انتخاب کنید.', 'ok');
      renderSrvSec(); await srvFillInstSel();
    } catch(e){ toast(e.message, 'err'); }
  };
  const bl = $id('srvLogin'); if(bl) bl.onclick = ()=> doAuth('/api/auth/login');
  const br = $id('srvReg');  if(br) br.onclick = ()=> doAuth('/api/auth/register');
  const bi = $id('srvInstCreate');
  if(bi) bi.onclick = async ()=>{
    const name = ($id('srvNewName').value || '').trim();
    if(!name){ toast('نام مؤسسه را وارد کنید.', 'err'); return; }
    const slug = ($id('srvNewSlug').value || '').trim();
    try {
      const j = await srvFetch('POST', '/api/institutions', { name, slug: slug || undefined });
      toast('مؤسسهٔ «' + j.name + '» ساخته شد.', 'ok');
      await srvFillInstSel(String(j.id));
    } catch(e){ toast(e.message, 'err'); }
  };
  const bg = $id('srvInstGo');
  if(bg) bg.onclick = ()=>{
    const sel = $id('srvInstSel');
    if(!sel || !sel.value){ toast('اول یک مؤسسه انتخاب یا ایجاد کنید.', 'err'); return; }
    SRV.instId = +sel.value; SRV.instName = sel.options[sel.selectedIndex].text; srvSave();
    srvDropFieldsCache();
    toast('به مؤسسهٔ «' + SRV.instName + '» متصل شدید.', 'ok');
    renderSrvSec();
  };
  const bo = $id('srvLogout');
  if(bo) bo.onclick = async ()=>{
    const okc = await askConfirm({ title:'قطع اتصال از سرور', ok:'قطع شود', danger:true,
      text:'اتصال و توکن حذف می‌شود' + (SRV.on ? ' و حالت سرور غیرفعال می‌شود' : '') + '. دمودیتا تغییری نمی‌کند.' });
    if(!okc) return;
    SRV.token = ''; SRV.user = null; SRV.instId = null; SRV.instName = ''; SRV.on = false; srvSave(); srvDropFieldsCache();
    toast('اتصال قطع شد.', 'ok'); renderSrvSec();
  };
  /* انتخاب منبع داده */
  box.querySelectorAll('.ds-card').forEach(c => c.onclick = async ()=>{
    if(c.dataset.ds === 'local'){
      if(SRV.on && srvReady()){
        const okc = await askConfirm({ title:'تغییر منبع داده به لوکال', ok:'بله، روی دمو برگرد',
          text:'همهٔ صفحات دوباره از «حافظهٔ محلی مرورگر (دمو)» خوانده می‌شوند. اتصال سرور حفظ می‌شود و هر وقت بخواهی از همین‌جا فعالش می‌کنی.' });
        if(!okc) return;
        SRV.on = false; srvSave(); toast('منبع داده: لوکال (دمو)','ok');
      }
      renderSrvSec(); try{ route(); }catch(e){} return;
    }
    if(!srvReady()){
      toast('هنوز به سروری متصل نیستی — اول با فرم «تنظیمات اتصال سرور» همین بخش وارد شو و مؤسسه را انتخاب کن.','warn');
      const f = $id('srvBase'); if(f){ try{ f.focus(); f.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){} }
      return;
    }
    if(!SRV.on){
      try { await srvLoadFields(true); } catch(e){ toast('خطا در اتصال: '+e.message, 'err'); return; }
      SRV.on = true; srvSave();
      toast('منبع داده: سرور — اعضا، وام‌ها و گزارش‌ها از PostgreSQL می‌آیند.','ok');
    }
    renderSrvSec();
    if(SRV.on && srvReady() && document.getElementById('secFld')){ const fb = document.querySelector('#secFld .sec-b'); if(fb) srvFieldsSec(fb); }
    try{ route(); }catch(e){}
  });
  const bt = $id('srvToggle');
  if(bt) bt.onclick = async ()=>{
    if(!SRV.on){
      try { await srvLoadFields(true); }
      catch(e){ toast('خطا در اتصال: ' + e.message, 'err'); return; }
      SRV.on = true; srvSave();
      toast('حالت سرور فعال شد — اعضا و فیلدها از این پس از سرور می‌آیند.', 'ok');
    } else {
      SRV.on = false; srvSave();
      toast('حالت سرور غیرفعال شد — روی دمودیتا برگشتید.', 'ok');
    }
    renderSrvSec();
    if(SRV.on && srvReady() && document.getElementById('secFld')){
      const fb = document.querySelector('#secFld .sec-b'); if(fb) srvFieldsSec(fb);
    }
  };
}
async function srvFillInstSel(selectId){
  const box = document.getElementById('srvInstBox');
  const sel = document.getElementById('srvInstSel');
  if(!box || !sel) return;
  box.style.display = '';
  try {
    const me = await srvFetch('GET', '/api/auth/me');
    sel.innerHTML = (me.institutions || []).map(i => '<option value="' + i.id + '"' + (String(i.id) === selectId ? ' selected' : '') + '>' + esc(i.name) + ' (' + esc(i.slug) + ')</option>').join('')
      || '<option value="">— هنوز مؤسسه‌ای ندارید؛ بسازید —</option>';
  } catch(e){ toast(e.message, 'err'); }
}

/* ── مدیریت فیلدها از سرور (جایگزین بخش فیلدهای دمو وقتی حالت سرور روشن است) ── */
async function srvFieldsSec(box){
  box.innerHTML = '<p class="hint-t">در حال دریافت فیلدها از سرور…</p>';
  let fields;
  try { fields = await srvLoadFields(true); }
  catch(e){ box.innerHTML = '<p style="color:var(--red)">' + esc(e.message) + '</p>'; return; }
  const rows = fields.map(f =>
    '<div class="setting-row"><div class="sr-t"><b>' + esc(f.label) + '</b><p>' +
      '<code style="font-size:11px">' + esc(f.key) + '</code> · ' + (SRV_TYPE_LABEL[f.type] || f.type) +
      (f.is_required ? ' · <span style="color:var(--red)">الزامی</span>' : '') +
      (f.type === 'select' && Array.isArray(f.options) && f.options.length ? ' · گزینه‌ها: ' + esc(f.options.join('، ')) : '') +
    '</p></div><div class="field-row" style="gap:6px">' +
      '<button class="btn btn-soft btn-xs" data-sfe="' + f.id + '">' + icon('pen',13) + ' ویرایش</button>' +
      '<button class="btn btn-soft btn-xs" data-sfd="' + f.id + '" data-sfl="' + esc(f.label) + '">' + icon('trash',13) + ' آرشیو</button>' +
    '</div></div>').join('');
  box.innerHTML = (rows || '<p class="hint-t">هنوز فیلدی تعریف نشده — اولین فیلد را بسازید.</p>') +
    '<div class="field-row" style="gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm" id="srvFieldAdd">' + icon('plus',14) + ' فیلد جدید</button></div>';
  box.querySelectorAll('[data-sfe]').forEach(b => b.onclick = ()=>{
    const f = fields.find(x => String(x.id) === b.dataset.sfe); if(f) srvFieldForm(f);
  });
  box.querySelectorAll('[data-sfd]').forEach(b => b.onclick = async ()=>{
    const okc = await askConfirm({ title:'آرشیو فیلد', danger:true, ok:'آرشیو شود',
      text:'فیلد «' + b.dataset.sfl + '» آرشیو می‌شود؛ مقادیر قبلی اعضا حذف نمی‌شوند ولی فیلد از فرم‌ها حذف می‌شود.' });
    if(!okc) return;
    try { await srvFetch('DELETE', '/api/institutions/' + SRV.instId + '/fields/' + b.dataset.sfd); srvDropFieldsCache(); toast('فیلد آرشیو شد.', 'ok'); srvFieldsSec(box); }
    catch(e){ toast(e.message, 'err'); }
  });
  const add = $('#srvFieldAdd'); if(add) add.onclick = ()=> srvFieldForm(null);
}
function srvFieldForm(f){
  const types = Object.keys(SRV_TYPE_LABEL).map(t => '<option value="' + t + '"' + (f && f.type === t ? ' selected' : '') + '>' + SRV_TYPE_LABEL[t] + '</option>').join('');
  openModal({
    title: f ? 'ویرایش فیلد «' + esc(f.label) + '»' : 'فیلد جدید',
    body:
      '<div class="fields">' +
        '<div class="field"><label>عنوان فیلد</label><input id="sffLabel" value="' + esc(f ? f.label : '') + '" placeholder="مثلاً شماره حساب"></div>' +
        '<div class="field"><label>کلید (انگلیسی؛ خالی = خودکار)</label><input id="sffKey" value="' + esc(f ? f.key : '') + '" placeholder="account_no" ' + (f ? 'disabled' : '') + '></div>' +
        '<div class="field"><label>نوع</label><select id="sffType"' + (f ? ' disabled' : '') + '>' + types + '</select></div>' +
        '<div class="field"><label>الزامی؟</label><select id="sffReq"><option value="0"' + (f && !f.is_required ? ' selected' : '') + '>خیر</option><option value="1"' + (f && f.is_required ? ' selected' : '') + '>بله</option></select></div>' +
        '<div class="field full"><label>گزینه‌ها (فقط برای نوع انتخابی؛ هر خط یکی)</label><textarea id="sffOpts" rows="3" placeholder="تهران&#10;مشهد">' + esc(f && Array.isArray(f.options) ? f.options.join('\n') : '') + '</textarea></div>' +
      '</div>' +
      '<div class="field-row" style="gap:8px;justify-content:flex-end;margin-top:12px">' +
        '<button class="btn btn-soft btn-sm" onclick="closeModal()">انصراف</button>' +
        '<button class="btn btn-primary btn-sm" id="sffSave">' + icon('check',14) + (f ? ' ذخیره تغییرات' : ' ایجاد فیلد') + '</button>' +
      '</div>',
    width: 560
  });
  $('#sffSave').onclick = async ()=>{
    const label = ($('#sffLabel').value || '').trim();
    if(!label){ toast('عنوان فیلد الزامی است.', 'err'); return; }
    const payload = {
      label,
      is_required: $('#sffReq').value === '1',
      options: ($('#sffOpts').value || '').split('\n').map(x => x.trim()).filter(Boolean)
    };
    if(!f){
      payload.key = ($('#sffKey').value || '').trim();
      payload.type = $('#sffType').value;
      if(payload.type !== 'select') payload.options = [];
      try { await srvFetch('POST', '/api/institutions/' + SRV.instId + '/fields', payload); }
      catch(e){ toast(e.message, 'err'); return; }
      toast('فیلد ساخته شد.', 'ok');
    } else {
      if(payload.options.length === 0) delete payload.options;
      try { await srvFetch('PATCH', '/api/institutions/' + SRV.instId + '/fields/' + f.id, payload); }
      catch(e){ toast(e.message, 'err'); return; }
      toast('فیلد به‌روزرسانی شد.', 'ok');
    }
    srvDropFieldsCache(); closeModal();
    const box = $('#secFld .sec-b'); if(box) srvFieldsSec(box);
  };
}

/* ── صفحهٔ اعضا از سرور ── */
let srvQ = '', srvPage = 1;
async function renderSrvMembersPage(){
  srvFieldsCache = null; // پاک کردن کش تا فیلدهای جدید ظاهر بشن

  const main = $('#main');
  const instName = esc(SRV.instName || ('مؤسسهٔ #' + SRV.instId));
  main.innerHTML =
    '<div class="page-head"><div><h1>اعضا و اقساط</h1><div class="ph-sub">حالت سرور — داده از <b>'+instName+'</b> (PostgreSQL) — <span class="badge b-green">متصل</span></div></div>' +
    '<div class="ph-actions"><button class="btn btn-ghost btn-sm" id="srvBulkBtn" style="padding:11px 17px;font-size:.88rem">'+icon('upload',15)+' افزودن گروهی</button>' +
    '<button class="btn btn-solid btn-sm" id="srvAddMember" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' افزودن عضو</button></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      '<button class="tab on" data-mt="members">اعضا<span class="tc" id="srvMemCount">—</span></button>' +
      '<button class="tab" data-mt="ins">اقساط و پرداخت‌ها<span class="tc" id="srvInsCount" style="background:var(--red-bg);color:var(--red);display:none">0 معوق</span></button>' +
    '</div></div><div id="mmBody" style="padding:16px 18px"></div></div>';

  main.querySelectorAll('[data-mt]').forEach(b => b.onclick = ()=> {
    main.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
    b.classList.add('on');
    if(b.dataset.mt==='members') srvLoadMembers();
    else srvLoadInstallments();
  });

  $('#srvAddMember').onclick = ()=> srvMemberForm(null);
  const bulk = $('#srvBulkBtn');
  if(bulk) bulk.onclick = ()=> toast('افزودن گروهی به‌زودی از فایل اکسل — فعلاً تکی اضافه کنید.','info');

  await srvLoadMembers();
}

async function srvLoadMembers(){
  const box = $('#mmBody'); if(!box) return;
  box.innerHTML =
    '<div class="toolbar">' +
      '<div class="t-search">'+icon('search',15)+'<input id="srvSearch" placeholder="جستجو: نام، کد ملی، موبایل، شماره عضویت…" value="'+esc(srvQ)+'"></div>' +
      '<span class="t-lbl">وضعیت:</span><select class="t-select" id="srvStatus"><option value="all">همه</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select>' +
      '<span class="t-lbl">مرتب‌سازی:</span><select class="t-select" id="srvSort"><option value="newest">جدیدترین</option><option value="name">نام</option></select>' +
      '<button class="btn btn-ghost btn-sm" id="srvReset" style="margin-inline-start:auto">'+icon('refresh',13)+' حذف فیلترها</button>' +
    '</div>' +
    '<div id="srvMemBox" style="margin-top:12px"><p class="hint-t" style="padding:18px 4px">در حال دریافت…</p></div>';

  const searchEl = $('#srvSearch');
  if(searchEl){
    searchEl.oninput = ()=>{ srvQ = searchEl.value.trim(); srvPage = 1; srvLoadMembersData(); };
    searchEl.focus();
  }
  const resetBtn = $('#srvReset');
  if(resetBtn) resetBtn.onclick = ()=>{ srvQ=''; srvPage=1; const se=$('#srvSearch'); if(se) se.value=''; srvLoadMembersData(); };

  await srvLoadMembersData();
}

let srvFieldsCache = null;
async function srvLoadFieldsCached(){
  if(srvFieldsCache) return srvFieldsCache;
  srvFieldsCache = await srvLoadFields();
  return srvFieldsCache;
}

async function srvLoadMembersData(){
  const box = $('#srvMemBox'); if(!box) return;
  let fields, data;
  try {
    fields = await srvLoadFieldsCached();
    const qs = '/api/institutions/' + SRV.instId + '/members?page=' + srvPage + '&pageSize=30' + (srvQ ? '&q=' + encodeURIComponent(srvQ) : '');
    data = await srvFetch('GET', qs);
  } catch(e){
    box.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div><button class="btn btn-soft btn-sm" onclick="srvLoadMembersData()" style="margin-top:10px">تلاش دوباره</button>';
    return;
  }
  const cntEl = $('#srvMemCount');
  if(cntEl) cntEl.textContent = faDigits(data.total);

  if(!data.rows.length){
    box.innerHTML = '<div class="empty" style="padding:32px 18px;text-align:center"><div class="e-ic">'+icon('users',28)+'</div><h3>عضوی پیدا نشد</h3><p class="hint-t">برای شروع، اولین عضو را اضافه کنید.</p><button class="btn btn-solid btn-sm" id="mEmptyAdd" style="margin-top:12px">'+icon('plus',14)+' افزودن عضو</button></div>';
    const b = $('#mEmptyAdd'); if(b) b.onclick = ()=> srvMemberForm(null);
    return;
  }

  // Determine which keys to show: try to find name, nationalId, mobile
  const nameKey = fields.find(f=>/name|نام/.test(f.label))?.key || fields[0]?.key || 'name';
  const fatherKey = fields.find(f=>/father|پدر/.test(f.label))?.key;
  const nidKey = fields.find(f=>/national|کدملی|کد ملی/.test(f.key+f.label))?.key;
  const mobKey = fields.find(f=>/mobile|موبایل|تماس/.test(f.key+f.label))?.key;

  const head =
    '<th style="min-width:210px">نام و نام خانوادگی</th>' +
    (nidKey?'<th>کد ملی</th>':'') +
    (mobKey?'<th>شماره تماس</th>':'') +
    '<th>شماره عضویت</th><th>وضعیت</th><th></th>';

  const rows = data.rows.map(m => {
    const vals = m.values || {};
    const nm = esc(vals[nameKey] || vals['name'] || Object.values(vals)[0] || '—');
    const father = fatherKey ? esc(vals[fatherKey]||'') : '';
    const nid = nidKey ? esc(vals[nidKey]||'—') : '';
    const mob = mobKey ? esc(vals[mobKey]||'—') : '';
    const av = (nm.charAt(0) || '؟');
    const st = m.status==='active' ? '<span class="badge b-green">فعال</span>' : '<span class="badge b-gray">غیرفعال</span>';
    return '<tr>' +
      '<td><div class="cell-main"><span class="avatar sz-34">'+esc(av)+'</span><span class="cm-t"><b><a class="row-link" href="javascript:void(0)" data-view="'+m.id+'">'+nm+'</a></b>'+(father?'<span>فرزند '+father+'</span>':'')+'</span></div></td>' +
      (nidKey?'<td><span class="num">'+nid+'</span></td>':'') +
      (mobKey?'<td><span class="num">'+mob+'</span></td>':'') +
      '<td><span class="badge b-gray">'+esc(m.member_no||'')+'</span></td>' +
      '<td>'+st+'</td>' +
      '<td><div class="row-actions"><button class="x-btn" data-tip="مشاهده" data-view="'+m.id+'">'+icon('eye',15)+'</button>' +
        '<button class="x-btn" data-tip="ثبت وام برای این عضو" data-loan="'+m.id+'">'+icon('loan',15)+'</button>' +
        '<button class="x-btn" data-tip="ویرایش" data-edit="'+m.id+'">'+icon('pen',15)+'</button>' +
        '<button class="x-btn" data-tip="حذف" data-del="'+m.id+'">'+icon('trash',15)+'</button></div></td>' +
    '</tr>';
  }).join('');

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  box.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>' +
    '<div class="tbl-foot"><span class="tf-info">'+faDigits(data.total)+' عضو · صفحه '+faDigits(srvPage)+' از '+faDigits(pages)+'</span>' +
      (pages>1 ? '<div class="pager"><button class="btn btn-soft btn-xs" id="srvPrev"'+(srvPage<=1?' disabled':'')+'>قبلی</button>' +
      '<span class="hint-t">صفحه '+faDigits(srvPage)+'</span>' +
      '<button class="btn btn-soft btn-xs" id="srvNext"'+(srvPage>=pages?' disabled':'')+'>بعدی</button></div>' : '') +
    '</div>';

  box.querySelectorAll('[data-view]').forEach(b=> b.onclick = ()=> srvViewMember(b.dataset.view, data.rows));
  box.querySelectorAll('[data-loan]').forEach(b=> b.onclick = ()=> srvLoanForm(parseInt(b.dataset.loan,10)));
  box.querySelectorAll('[data-edit]').forEach(b=> b.onclick = ()=> { const m=data.rows.find(x=>String(x.id)===String(b.dataset.edit)); if(m) srvMemberForm(m); });
  box.querySelectorAll('[data-del]').forEach(b=> b.onclick = async ()=> {
    const m=data.rows.find(x=>String(x.id)===String(b.dataset.del));
    const nm = m ? (Object.values(m.values)[0]||'#'+m.id) : '#'+b.dataset.del;
    const okc = await askConfirm({ title:'حذف عضو', danger:true, ok:'حذف شود', text:'عضو «'+esc(nm)+'» حذف می‌شود (حذف سخت از دیتابیس). این عمل قابل بازگشت نیست.' });
    if(!okc) return;
    try { await srvFetch('DELETE', '/api/institutions/' + SRV.instId + '/members/' + b.dataset.del); toast('عضو حذف شد.','ok'); srvLoadMembersData(); }
    catch(e){ toast(e.message,'err'); }
  });
  const pv=$('#srvPrev'); if(pv) pv.onclick=()=>{ srvPage--; srvLoadMembersData(); };
  const nx=$('#srvNext'); if(nx) nx.onclick=()=>{ srvPage++; srvLoadMembersData(); };
}

async function srvLoadInstallments(){
  const box = $('#mmBody');
  if(!box) return;
  box.innerHTML = '<div class="toolbar"><div class="t-search">'+icon('search',15)+'<input placeholder="جستجوی اقساط — به‌زودی" disabled></div></div>' +
    '<div style="padding:24px 8px"><div class="alert a-info"><span class="al-ic">'+icon('info',16)+'</span><div>اقساط وام‌ها در فاز بعد به دیتابیس وصل می‌شوند. فعلاً از منوی <b>وام‌ها</b> استفاده کنید یا در حالت دمو بمانید.</div></div>' +
    '<div class="grid g-2" style="margin-top:14px"><div class="card tight"><div class="card-h"><h3>وام‌های ثبت‌شده</h3><a class="btn btn-soft btn-sm" href="#/app/loans">همه</a></div><div class="card-b" id="srvInsLoans"><p class="hint-t">در حال دریافت…</p></div></div>' +
    '<div class="card tight"><div class="card-h"><h3>اقساط سررسید</h3></div><div class="card-b"><p class="hint-t">به‌زودی</p></div></div></div></div>';
  // try load loans
  try {
    const loans = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans?page=1&pageSize=10');
    const lb = $('#srvInsLoans');
    if(lb){
      if(!loans.rows.length) lb.innerHTML = '<p class="hint-t">وامی ثبت نشده.</p>';
      else lb.innerHTML = '<div class="mini-list">'+loans.rows.map(l=>'<div class="mini-item"><span class="avatar sz-34 teal">'+esc((l.member_name||'؟').charAt(0))+'</span><span class="mi-t"><b>'+esc(l.member_name||'عضو #'+l.member_id)+'</b><span>'+fmtMShort(l.amount)+' · '+faDigits(l.installments_count)+' قسط</span></span><span class="mi-v">'+faLoanStatus(l.status)+'</span></div>').join('')+'</div>';
    }
  } catch(e){
    const lb=$('#srvInsLoans'); if(lb) lb.innerHTML='<p class="hint-t">'+esc(e.message)+'</p>';
  }
}

async function srvViewMember(id, cachedRows){
  let m = cachedRows ? cachedRows.find(x=>String(x.id)===String(id)) : null;
  if(!m){
    try { const r = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/members/'+id); m = r.member; } catch(e){ toast(e.message,'err'); return; }
  }
  const vals = m.values || {};
  const name = vals[Object.keys(vals)[0]] || m.member_no || '#'+m.id;
  let fields;
  try { fields = await srvLoadFieldsCached(); } catch(e){ fields=[]; }
  let loans = [];
  try { const lData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans?memberId='+m.id+'&page=1&pageSize=100'); loans = lData.rows||[]; } catch(e){}
  const rowsHtml = fields.map(f=>'<div class="kv"><span class="k">'+esc(f.label)+'</span><span class="v">'+esc(vals[f.key]||'—')+'</span></div>').join('') || Object.entries(vals).map(([k,v])=>'<div class="kv"><span class="k">'+esc(k)+'</span><span class="v">'+esc(v)+'</span></div>').join('');
  /* تاریخچهٔ وام‌ها: در جریان و تسویه‌شده جدا، با امکان پرش به جزئیات هر وام */
  const ongoing = loans.filter(l=>l.status!=='paid' && l.status!=='cancelled');
  const settled = loans.filter(l=>l.status==='paid');
  const loanRow = l => '<div class="mini-item" style="padding:10px 0;border-bottom:1px dashed var(--line)"><span class="avatar sz-34 teal" style="border-radius:11px">'+icon('loan',15)+'</span>' +
    '<span class="mi-t"><b>'+fmtM(l.amount)+' <small>'+CUR()+'</small></b><span>'+faDigits(l.installments_count)+' قسط · '+J.fmtLong(l.created_at||'')+'</span></span>' +
    '<span class="badge '+(l.status==='paid'?'b-lime':l.status==='active'?'b-green':'b-gray')+'" style="font-size:.72rem">'+(l.status==='paid'?icon('check',11)+' تسویه‌شده':faLoanStatus(l.status))+'</span>' +
    '<button class="btn btn-soft btn-xs" data-vloan="'+l.id+'" style="border-radius:16px">جزئیات</button></div>';
  const loansSec =
    (loans.length ? '<div class="m-sec"><div class="m-sec-h">'+icon('loan',14)+' تاریخچهٔ وام‌های این عضو ('+faDigits(loans.length)+')</div><div class="m-sec-b">' +
      (ongoing.length ? '<div style="font-size:.75rem;font-weight:700;color:var(--green-deep);margin:2px 0 4px">وام‌های در جریان ('+faDigits(ongoing.length)+')</div><div class="mini-list">'+ongoing.map(loanRow).join('')+'</div>' : '') +
      (settled.length ? '<div style="font-size:.75rem;font-weight:700;color:var(--ink-2);margin:'+(ongoing.length?'14px':'2px')+' 0 4px">وام‌های تسویه‌شده ('+faDigits(settled.length)+')</div><div class="mini-list">'+settled.map(loanRow).join('')+'</div>' : '') +
    '</div></div>'
    : '<div class="m-sec"><div class="m-sec-h">'+icon('loan',14)+' تاریخچهٔ وام‌های این عضو</div><div class="m-sec-b"><p class="hint-t" style="padding:8px 2px">هنوز وامی برای این عضو ثبت نشده است.</p></div></div>');
  openModal({
    title: esc(name),
    sub: 'پرونده عضو · '+esc(m.member_no||'')+' · '+ (m.status==='active'?'فعال':'غیرفعال') + (loans.length ? ' · '+faDigits(ongoing.length)+' وام در جریان · '+faDigits(settled.length)+' تسویه‌شده' : ''),
    size:'md',
    body: '<div class="m-sec"><div class="m-sec-h">اطلاعات هویتی</div><div class="m-sec-b"><div class="kv-list">'+rowsHtml+'</div></div></div>' +
          '<div class="m-sec"><div class="m-sec-h">اطلاعات سیستمی</div><div class="m-sec-b"><div class="kv-list"><div class="kv"><span class="k">شماره عضویت</span><span class="v">'+esc(m.member_no||'')+'</span></div><div class="kv"><span class="k">تاریخ ثبت</span><span class="v">'+esc(m.created_at||'')+'</span></div><div class="kv"><span class="k">وضعیت</span><span class="v"><span class="badge '+(m.status==='active'?'b-green':'b-gray')+'"><i class="bd"></i>'+(m.status==='active'?'فعال':'غیرفعال')+'</span></span></div></div></div></div>' +
          loansSec,
    foot: '<button class="btn btn-ghost btn-sm" data-x>بستن</button><button class="btn btn-solid btn-sm" id="srvViewEdit">'+icon('pen',14)+' ویرایش</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick=()=>h.close();
      h.el.querySelector('#srvViewEdit').onclick=()=>{ h.close(); srvMemberForm(m); };
      h.el.querySelectorAll('[data-vloan]').forEach(b=>{ b.onclick=()=>{ h.close(); if(typeof srvLoanDetail==='function') srvLoanDetail(b.dataset.vloan); }; });
    }
  });
}



function srvMemberForm(m){
  // همیشه کش را پاک کن تا فیلدهای جدید ظاهر بشن
  srvFieldsCache = null;
  srvLoadFields().then(fields => {
    const isEdit = !!m;
    const vals = (m && m.values) ? m.values : {};
    // ذخیره کش جدید
    srvFieldsCache = fields;

    const makeInput = (f, v) => {
      const req = f.is_required ? ' <span class="req">*</span>' : '';
      const type = f.type;
      let input = '';
      if(type==='bool'){
        input = '<label class="check" style="padding:12px;background:var(--card-2);border-radius:12px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="sf_'+f.key+'" '+(v==='true'?'checked':'')+'><span style="font-weight:600">'+esc(f.label)+'</span></label>';
        return '<div class="field full">'+input+'</div>';
      } else if(type==='select' && Array.isArray(f.options) && f.options.length){
        const opts = f.options.map(o=>'<option value="'+esc(o)+'" '+(o===v?'selected':'')+'>'+esc(o)+'</option>').join('');
        input = '<select id="sf_'+f.key+'" style="border-radius:12px;padding:12px"><option value="">— انتخاب —</option>'+opts+'</select>';
      } else if(type==='date'){
        input = '<div style="position:relative"><input id="sf_'+f.key+'" type="text" placeholder="1403/02/15" value="'+esc(v)+'" style="border-radius:12px;padding:12px 40px 12px 12px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--green-deep);display:inline-flex"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/><path d="m9 15 2 2 4-4"/></svg></span></div><small style="color:var(--ink-2)">تقویم شمسی</small>';
      } else if(type==='number'){
        input = '<input id="sf_'+f.key+'" class="num-inp" value="'+esc(v)+'" placeholder="'+esc(f.label)+'" style="border-radius:12px;padding:12px">';
      } else if(type==='mobile'){
        input = '<div style="position:relative"><input id="sf_'+f.key+'" class="num-inp" value="'+esc(v)+'" placeholder="09123456789" style="border-radius:12px;padding:12px 40px 12px 12px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--green-deep);display:inline-flex"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.44c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.9Z"/></svg></span></div>';
      } else if(type==='nid'){
        input = '<div style="position:relative"><input id="sf_'+f.key+'" class="num-inp" value="'+esc(v)+'" placeholder="1234567890" maxlength="10" style="border-radius:12px;padding:12px 40px 12px 12px"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--green-deep);display:inline-flex"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 5.8v5.4c0 4.6 3 7.6 7 9 4-1.4 7-4.4 7-9V5.8Z"/><path d="m9.2 11.6 2 2 3.8-3.9"/></svg></span></div>';
      } else {
        input = '<input id="sf_'+f.key+'" value="'+esc(v)+'" placeholder="'+esc(f.label)+'" style="border-radius:12px;padding:12px">';
      }
      return '<div class="field"><label style="font-weight:700;display:flex;align-items:center;gap:6px">'+esc(f.label)+req+'</label>'+input+'<span class="err-msg"></span></div>';
    };

    // مرتب‌سازی: فیلدهای اصلی اول
    const coreOrder = ['name','firstName','lastName','father','fatherName','birthDate','mobile','phone','nationalId','nid'];
    const sorted = [];
    coreOrder.forEach(k=>{
      const f = fields.find(x=> x.key===k || x.label.includes(k));
      if(f && !sorted.includes(f)) sorted.push(f);
    });
    fields.forEach(f=>{ if(!sorted.includes(f)) sorted.push(f); });

    // همهٔ فیلدها پشت سر هم در یک گرید — بدون سکشن و فاصله
    const allFields = sorted.map(f=>makeInput(f, vals[f.key]||'')).join('');

    const totalFields = fields.length;

    const h = openModal({
      title: isEdit ? 'ویرایش عضو' : 'افزودن عضو جدید — فیلدهای جدید همینجا',
      sub: isEdit ? esc(Object.values(vals)[0]||'')+' · '+esc(m.member_no||'')+' · '+faDigits(totalFields)+' فیلد' : 'حالت سرور — '+faDigits(totalFields)+' فیلد از تنظیمات — فیلد جدید اضافه کردی؟ همینجا ظاهر میشه (کش پاک شد)',
      size:'lg',
      body: '<div class="alert a-info" style="border-radius:12px;margin-bottom:16px"><span class="al-ic">'+icon('info',16)+'</span><div><b>فیلد جدید اضافه کردی؟</b> کش پاک شد — الان <b>'+faDigits(totalFields)+' فیلد</b> از DB لود شد. اگر فیلد جدید نمی‌بینی، صفحه را رفرش کن.</div></div>' +
            '<div class="fields" style="gap:16px">'+allFields+'</div>' +
            '<div id="srvFormErr" style="display:none;color:var(--red);font-size:13px;margin-top:14px;padding:12px;background:#ffebee;border:1px solid #ffcdd2;border-radius:12px"></div>',
      foot: '<button class="btn btn-ghost btn-sm" data-x style="border-radius:12px">انصراف</button><button class="btn btn-solid btn-sm" id="srvMemSave" style="border-radius:12px;padding:11px 20px;box-shadow:0 4px 12px rgba(28,110,49,.3)">'+icon('check',14)+' '+(isEdit?'ذخیره تغییرات':'ثبت عضو')+'</button>',
      onOpen(h){
        h.el.querySelector('[data-x]').onclick = ()=> h.close();
        fields.forEach(f=>{
          if(f.type==='date'){
            const el = document.getElementById('sf_'+f.key);
            if(el && typeof attachJDate==='function') attachJDate(el);
          }
        });
        const saveBtn = h.el.querySelector('#srvMemSave');
        saveBtn.onclick = async ()=>{
          const values = {};
          for(const f of fields){
            const el = document.getElementById('sf_' + f.key);
            if(!el) continue;
            values[f.key] = f.type === 'bool' ? (el.checked ? 'true' : 'false') : (el.value || '').trim();
          }
          const errBox = h.el.querySelector('#srvFormErr');
          for(const f of fields){
            if(f.is_required && !values[f.key]){
              errBox.style.display='';
              errBox.innerHTML = '«'+esc(f.label)+'» الزامی است — لطفا پر کنید.';
              const el = document.getElementById('sf_'+f.key);
              if(el) el.focus();
              return;
            }
          }
          saveBtn.disabled=true; saveBtn.textContent='در حال ثبت…';
          try {
            if(m) await srvFetch('PATCH', '/api/institutions/' + SRV.instId + '/members/' + m.id, { values });
            else await srvFetch('POST', '/api/institutions/' + SRV.instId + '/members', { values });
            const nm = Object.values(values)[0] || 'عضو';
            const mno = m ? m.member_no : ('M-'+Date.now().toString().slice(-6));
            if(typeof stampFx==='function') stampFx({ text:'ثبت شد', sub:'عضویت '+esc(mno)+' — '+J.fmtLong(J.todayIso()), color: (typeof stampColor==='function'?stampColor('member'):'#B3261E'), hold:1100, onDone:()=>{
              toast(isEdit ? 'عضو به‌روزرسانی شد.' : 'عضو «'+esc(nm)+'» با '+faDigits(totalFields)+' فیلد ثبت شد.', 'ok');
              h.close();
              srvFieldsCache=null;
              if(typeof srvLoadMembersData==='function') srvLoadMembersData();
            }});
            else {
              toast(isEdit ? 'عضو به‌روزرسانی شد.' : 'عضو ثبت شد.', 'ok');
              h.close();
              srvFieldsCache=null;
              if(typeof srvLoadMembersData==='function') srvLoadMembersData();
            }
          } catch(e){
            errBox.style.display='';
            errBox.innerHTML = esc(e.message) + (Array.isArray(e.details) ? '<br>'+e.details.map(esc).join('<br>') : '');
            saveBtn.disabled=false;
            saveBtn.innerHTML = icon('check',14)+' '+(isEdit?'ذخیره تغییرات':'ثبت عضو');
          }
        };
      }
    });
  }).catch(e => toast(e.message, 'err'));
}




/* ── قلاب‌های مسیریابی: حالت سرور فقط اعضا و فیلدها را عوض می‌کند؛ بقیه دمو می‌ماند ── */
/* ── داشبورد متصل به DB ── */
async function renderSrvDashboard(){
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>داشبورد</h1>' +
    '<div class="ph-sub" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:6px">' +
      '<b style="font-size:.92rem;color:var(--ink)">' + esc(SRV.instName||'مؤسسه') + '</b><span style="color:var(--ink-2)">·</span><b style="font-weight:700">'+J.fmtLong(J.todayIso())+'</b>' +
      '<span style="display:inline-flex;gap:6px;margin-inline-start:auto">' +
        '<button class="btn btn-soft btn-xs" id="srvDashAddMember" style="border-radius:16px">'+icon('plus',13)+' افزودن عضو</button>' +
        '<button class="btn btn-soft btn-xs" id="srvDashAddLoan" style="border-radius:16px">'+icon('loan',13)+' ثبت وام</button>' +
        '<button class="btn btn-soft btn-xs" id="srvDashAddPay" style="border-radius:16px">'+icon('coins',13)+' ثبت پرداخت</button>' +
      '</span></div></div></div>' +
    '<div class="grid g-stats" id="srvStats"><div class="stat"><div class="stat-top">در حال دریافت آمار…</div><div class="stat-val">—</div></div></div>' +
    '<div class="grid g-2" style="margin-top:14px"><div class="card"><div class="card-h"><h3>وضعیت اقساط</h3><span class="hint-t">توزیع اقساط بر اساس وضعیت</span></div><div class="card-b"><div class="chart-box"><canvas id="chSrvIns"></canvas></div><div class="legend" id="chSrvInsLg"></div></div></div>' +
    '<div class="card"><div class="card-h"><h3>گردش مالی ۱۲ ماه اخیر</h3><span class="hint-t">وام‌ها و پرداخت‌ها</span></div><div class="card-b"><div class="chart-box"><canvas id="chSrvFlow"></canvas></div><div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>وام‌ها</span><span class="lg-i"><i style="background:#9CCB3C"></i>پرداخت‌ها</span></div></div></div></div>' +
    '<div class="grid g-2" style="margin-top:14px"><div class="card tight"><div class="card-h"><h3>آخرین تراکنش‌ها</h3><a class="btn btn-soft btn-sm" href="#/app/txns">همه '+icon('chevS',12)+'</a></div><div class="card-b" id="srvDashTxns"><p class="hint-t">در حال دریافت…</p></div></div>' +
    '<div class="card tight"><div class="card-h"><h3>آخرین وام‌ها</h3><a class="btn btn-soft btn-sm" href="#/app/loans">همه '+icon('chevS',12)+'</a></div><div class="card-b" id="srvDashLoans"><p class="hint-t">در حال دریافت…</p></div></div></div>' +
    '<div class="grid g-2" style="margin-top:14px"><div class="card tight"><div class="card-h"><h3>اقساط نزدیک به سررسید</h3><a class="btn btn-soft btn-sm" href="#/app/installments">همه '+icon('chevS',12)+'</a></div><div class="card-b" id="srvDashIns"><p class="hint-t">در حال دریافت…</p></div></div>' +
    '<div class="card"><div class="card-h"><h3>خلاصه مالی</h3></div><div class="card-b" id="srvDashFinance"></div></div></div>';

  { const b1=$('#srvDashAddMember'); if(b1) b1.onclick = ()=>{ if(typeof srvMemberForm==='function') srvMemberForm(); };
    const b2=$('#srvDashAddLoan'); if(b2) b2.onclick = ()=>{ if(typeof srvLoanForm==='function') srvLoanForm(); };
    const b3=$('#srvDashAddPay'); if(b3) b3.onclick = ()=>{ if(typeof srvPaymentForm==='function') srvPaymentForm(); };
  }
  try {
    const stats = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/stats');
    const stat = (cls, ic, label, val, sub) =>
      '<div class="stat '+cls+'"><div class="stat-top"><span class="s-ic">'+icon(ic,16)+'</span>'+label+'</div><div class="stat-val">'+val+'</div>'+(sub?'<div class="stat-sub">'+sub+'</div>':'')+'</div>';

    $('#srvStats').innerHTML =
      stat('','users','تعداد کل اعضا', fmtN(stats.members.total), faDigits(stats.members.newThisMonth)+' عضو جدید این ماه') +
      stat((stats.installments.totalPendingAmount?'s-red':'s-lime'),'loan','مانده کل اقساط', fmtMShort(stats.installments.totalPendingAmount)+' <small>'+CUR()+'</small>', faDigits(stats.installments.pending+stats.installments.overdue)+' قسط باز') +
      stat('','loan','کل وام‌ها', fmtN(stats.loans.total), fmtMShort(stats.loans.totalAmount)+' '+CUR()) +
      stat((stats.installments.overdue?'s-red':'s-teal'),'warn','اقساط معوق', fmtN(stats.installments.overdue), 'روی '+faDigits(stats.loans.overdue||0)+' وام') +
      stat('s-amber','clock','اقساط در انتظار', fmtN(stats.installments.pending), faDigits(stats.installments.paid)+' قسط تسویه‌شده') +
      stat('','bank','موجودی صندوق‌ها', fmtMShort(stats.funds.totalBalance)+' <small>'+CUR()+'</small>', faDigits(stats.funds.total)+' صندوق · '+faDigits(stats.funds.accounts)+' حساب') +
      stat('s-lime','wallet','پرداخت‌ها', fmtMShort(stats.payments.totalAmount)+' <small>'+CUR()+'</small>', faDigits(stats.payments.total)+' تراکنش');

    // chart installments status — پرداخت‌شده / در انتظار / معوق
    const insPaid = stats.installments.paid||0, insPend = stats.installments.pending||0, insOd = stats.installments.overdue||0;
    const insTot = insPaid+insPend+insOd;
    drawDonut($('#chSrvIns'), [
      {label:'پرداخت‌شده', value:insPaid, color:'#1C6E31'},
      {label:'در انتظار', value:insPend, color:'#C4871F'},
      {label:'معوق', value:insOd, color:'#B3362B'}
    ].filter(d=>d.value>0), 'کل اقساط', faDigits(insTot));
    $('#chSrvInsLg').innerHTML = '<span class="lg-i"><i style="background:#1C6E31"></i>پرداخت‌شده ('+faDigits(insPaid)+')</span><span class="lg-i"><i style="background:#C4871F"></i>در انتظار ('+faDigits(insPend)+')</span><span class="lg-i"><i style="background:#B3362B"></i>معوق ('+faDigits(insOd)+')</span>';

    // chart flow - loans vs payments monthly - تماما شمسی با نام ماه کامل
    function gregToShamsiMonth(gregYM){
      try {
        const parts = String(gregYM).split('-');
        if(parts.length<2) return gregYM;
        const gy = parseInt(parts[0]), gm = parseInt(parts[1]);
        const j = J.g2j(gy, gm, 15);
        if(!j) return gregYM;
        return J.MONTHS[j.jm-1] + ' ' + faDigits(j.jy);
      } catch(e){ return gregYM; }
    }
    const rawLabels = (stats.charts.monthlyLoans||[]).map(x=>x.m).slice(-6);
    const loanVals = (stats.charts.monthlyLoans||[]).map(x=>Number(x.s||0)).slice(-6);
    const payVals = (stats.charts.monthlyPayments||[]).map(x=>Number(x.s||0)).slice(-6);
    const lastLabels = rawLabels.length ? rawLabels.map(gregToShamsiMonth) : (function(){ const t=J.today(); return Array.from({length:6},(_,idx)=>{ const a=J.addMonths(t.jy,t.jm,1,idx-5); return J.MONTHS[a.jm-1]+' '+faDigits(a.jy); }); })();
    drawBars($('#chSrvFlow'), lastLabels, [
      {name:'وام‌ها', color:'#1C6E31', values: loanVals.length?loanVals:[0,0,0,0,0,0]},
      {name:'پرداخت‌ها', color:'#9CCB3C', values: payVals.length?payVals:[0,0,0,0,0,0]}
    ]);

    // آخرین تراکنش‌ها — زنده از DB
    (async()=>{
      const txBox = $('#srvDashTxns');
      if(!txBox) return;
      try {
        const tData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/txns?page=1&pageSize=5');
        const rows = tData.rows||[];
        if(!rows.length){ txBox.innerHTML='<p class="hint-t">تراکنشی ثبت نشده.</p>'; return; }
        txBox.innerHTML = '<div class="mini-list">'+rows.map(t=>{
          const dep = t.type==='deposit' || t.type==='repayment';
          return '<div class="mini-item"><span class="avatar sz-34" style="background:'+(dep?'var(--green-bg)':'var(--red-bg)')+'" title="'+esc(faTxnType(t.type))+'">'+icon(dep?'download':'upload',14)+'</span><span class="mi-t"><b>'+esc(t.description||faTxnType(t.type))+'</b><span>'+(t.account_name?esc(t.account_name)+' · ':'')+J.fmt(t.created_at||'')+'</span></span><span class="mi-v '+(dep?'pos':'neg')+'">'+(dep?'+':'−')+' '+fmtN(t.amount)+'</span></div>';
        }).join('')+'</div>';
      } catch(e){ txBox.innerHTML = '<p class="hint-t">'+esc(e.message)+'</p>'; }
    })();
    // recent loans
    const rlBox = $('#srvDashLoans');
    if(rlBox){
      if(!stats.recent.loans.length) rlBox.innerHTML='<p class="hint-t">وامی ثبت نشده. از منوی وام‌ها ثبت کنید.</p>';
      else rlBox.innerHTML='<div class="mini-list">'+stats.recent.loans.map(l=>'<div class="mini-item"><span class="avatar sz-34 teal">'+esc((l.member_name||'؟').charAt(0))+'</span><span class="mi-t"><b>'+esc(l.member_name||'عضو #'+l.member_id)+'</b><span>'+fmtMShort(l.amount)+' · '+J.fmt(l.created_at||'')+'</span></span><span class="mi-v">'+faLoanStatus(l.status)+'</span></div>').join('')+'</div>';
    }
    // اقساط نزدیک به سررسید — سررسید تا ۳۰ روز آینده، زنده از DB
    (async()=>{
      const insBox = $('#srvDashIns');
      if(!insBox) return;
      try {
        const iData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/installments?status=dueSoon&page=1&pageSize=6');
        const rows = iData.rows||[];
        const head = '<div style="display:flex;gap:12px;font-size:.78rem;color:var(--ink-2);padding:2px 4px 8px"><span>'+faDigits(stats.installments.pending)+' در انتظار کلی</span><span style="color:var(--red)">'+faDigits(stats.installments.overdue)+' معوق</span></div>';
        if(!rows.length){ insBox.innerHTML = head + '<p class="hint-t" style="padding:4px">قسطِ سررسیدنزدیکی نیست — همه مرتب‌اند. 🌿</p>'; return; }
        insBox.innerHTML = head + '<div class="mini-list">'+rows.map(i=>
          '<div class="mini-item"><span class="avatar sz-34 amber">'+icon('clock',14)+'</span><span class="mi-t"><b>'+esc(i.member_name||('عضو #'+i.member_id))+'</b><span>قسط '+faDigits(i.no)+' · '+faDigits(Math.max(0, J.diffDays(J.todayIso(), i.due_date)))+' روز مانده · '+J.fmtLong(i.due_date)+'</span></span><span class="mi-v">'+fmtN(i.amount)+'</span></div>'
        ).join('')+'</div>';
      } catch(e){
        insBox.innerHTML = '<p class="hint-t">'+esc(e.message)+'</p>';
      }
    })();
    // finance summary
    const finBox = $('#srvDashFinance');
    if(finBox){
      finBox.innerHTML = '<div class="kv-list"><div class="kv"><span class="k">موجودی کل</span><span class="v">'+fmtMShort(stats.funds.totalBalance)+' '+CUR()+'</span></div><div class="kv"><span class="k">واریزی</span><span class="v pos">+'+fmtMShort(stats.txns.deposit)+' '+CUR()+'</span></div><div class="kv"><span class="k">برداشت</span><span class="v neg">−'+fmtMShort(stats.txns.withdraw)+' '+CUR()+'</span></div><div class="kv"><span class="k">کل تراکنش‌ها</span><span class="v">'+faDigits(stats.txns.total)+'</span></div><div class="kv"><span class="k">کل پرداخت‌ها</span><span class="v">'+fmtMShort(stats.payments.totalAmount)+' '+CUR()+'</span></div></div>';
    }

  } catch(e){
    $('#srvStats').innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>خطا در دریافت آمار: '+esc(e.message)+'</div></div>';
  }
}

/* ── قلاب‌های مسیریابی: حالت سرور ── */

/* ── وام‌ها — حالت سرور — دقیقا مثل قالب اصلی ── */
let srvLoansState = { q:'', page:1, per:10 };
async function renderSrvLoansPage(){
  srvFieldsCache = null; // پاک کردن کش تا فیلدهای جدید ظاهر بشن

  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>وام‌ها</h1><div class="ph-sub">حالت سرور — داده از PostgreSQL</div></div>' +
    '<div class="ph-actions"><button class="btn btn-solid btn-sm" id="srvAddLoan" style="padding:11px 17px;font-size:.88rem">'+icon('plus',15)+' ثبت وام جدید</button></div></div>' +
    '<div class="toolbar"><div class="t-search">'+icon('search',15)+'<input id="srvLoanQ" placeholder="جستجو: نام عضو، شماره عضویت…"></div>' +
    '<button class="btn btn-ghost btn-sm" id="srvLoanReset" style="margin-inline-start:auto">'+icon('refresh',13)+' حذف فیلتر</button></div>' +
    '<div class="card tight" id="srvLoansBox"><p class="hint-t" style="padding:18px">در حال دریافت وام‌ها…</p></div>';

  $('#srvAddLoan').onclick = ()=> srvLoanForm();
  const qEl = $('#srvLoanQ');
  if(qEl) qEl.oninput = ()=>{ srvLoansState.q = qEl.value.trim(); srvLoansState.page=1; srvLoadLoans(); };
  const rEl = $('#srvLoanReset');
  if(rEl) rEl.onclick = ()=>{ srvLoansState.q=''; srvLoansState.page=1; const q=$('#srvLoanQ'); if(q) q.value=''; srvLoadLoans(); };
  await srvLoadLoans();
}

async function srvLoadLoans(){
  const box = $('#srvLoansBox'); if(!box) return;
  box.innerHTML = '<p class="hint-t" style="padding:18px">در حال دریافت…</p>';
  try {
    const qs = '/api/institutions/'+SRV.instId+'/loans?page='+srvLoansState.page+'&pageSize=20' + (srvLoansState.q ? '&q='+encodeURIComponent(srvLoansState.q) : '');
    const data = await srvFetch('GET', qs);
    if(!data.rows.length){
      box.innerHTML = '<div class="empty" style="padding:32px;text-align:center"><div class="e-ic">'+icon('loan',28)+'</div><h3>وامی ثبت نشده</h3><p class="hint-t">برای شروع، اولین وام را ثبت کنید.</p><button class="btn btn-solid btn-sm" id="srvEmptyLoan">'+icon('plus',14)+' ثبت وام</button></div>';
      const b=$('#srvEmptyLoan'); if(b) b.onclick=()=>srvLoanForm();
      return;
    }
    const head = '<th>عضو</th><th>مبلغ اصل وام</th><th>اقساط</th><th>وضعیت</th><th>تاریخ درخواست</th><th></th>';
    const rows = data.rows.map(l=>{
      const nm = esc(l.member_name||('عضو #'+l.member_id));
      const av = nm.charAt(0)||'؟';
      return '<tr><td><div class="cell-main"><span class="avatar sz-34 teal">'+av+'</span><span class="cm-t"><b>'+nm+'</b><span>'+esc(l.member_no||'')+'</span></span></div></td>' +
        '<td class="c-fa-num c-strong">'+fmtM(l.amount)+'</td>' +
        '<td class="c-fa-num">'+faDigits(l.installments_count)+'</td>' +
        '<td><span class="badge '+(l.status==='active'?'b-green':(l.status==='paid'?'b-gray':'b-amber'))+'">'+faLoanStatus(l.status)+'</span></td>' +
        '<td class="c-fa-num">'+J.fmt(l.created_at||'')+'</td>' +
        '<td style="text-align:left"><a class="btn btn-soft btn-sm" href="javascript:void(0)" data-loan="'+l.id+'">جزئیات '+icon('chevS',11)+'</a></td></tr>';
    }).join('');
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>' +
      '<div class="tbl-foot"><span class="tf-info">'+faDigits(data.total)+' وام · صفحه '+faDigits(srvLoansState.page)+' از '+faDigits(pages)+'</span>' +
      (pages>1?'<div class="pager"><button class="btn btn-soft btn-xs" id="srvLoanPrev"'+(srvLoansState.page<=1?' disabled':'')+'>قبلی</button><span class="hint-t">صفحه '+faDigits(srvLoansState.page)+'</span><button class="btn btn-soft btn-xs" id="srvLoanNext"'+(srvLoansState.page>=pages?' disabled':'')+'>بعدی</button></div>':'')+'</div>';
    box.querySelectorAll('[data-loan]').forEach(b=> b.onclick=()=> srvLoanDetail(b.dataset.loan));
    const pv=$('#srvLoanPrev'); if(pv) pv.onclick=()=>{ srvLoansState.page--; srvLoadLoans(); };
    const nx=$('#srvLoanNext'); if(nx) nx.onclick=()=>{ srvLoansState.page++; srvLoadLoans(); };
  } catch(e){
    box.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>';
  }
}


async function srvLoanDetail(loanId){
  const main = $('#main');
  main.innerHTML = '<div class="page-head"><div><a href="#/app/loans" class="login-back" style="margin-bottom:8px">'+icon('arrowL',14)+' بازگشت به وام‌ها</a><h1>در حال بارگذاری...</h1></div></div><div class="card"><div class="card-b"><p class="hint-t">در حال دریافت اطلاعات کامل وام و عضو...</p></div></div>';
  try {
    const data = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans/'+loanId);
    const l = data.loan;
    const ins = data.installments||[];
    const pays = data.payments||[];
    const member = data.member||{};
    const mVals = l.member_values||member.values||{};
    const mName = l.member_name || Object.values(mVals)[0] || ('عضو #'+l.member_id);

    const paidSum = pays.reduce((sum,p)=>sum+Number(p.amount||0),0);
    const bal = Math.max(0, Number(l.amount||0) - paidSum);
    const nextIns = ins.find(i=>i.status!=='paid');
    const isSettled = l.status==='paid';
    const canSettle = !isSettled && bal<=0; /* ماندهٔ بدهی صفر → فقط دکمهٔ تسویه نهایی */

    // Convert all dates to Shamsi full
    main.innerHTML =
      '<div class="page-head"><div><a href="#/app/loans" class="login-back" style="margin-bottom:8px">'+icon('arrowL',14)+' فهرست وام‌ها</a>' +
        '<h1>وام '+esc(mName)+' — '+fmtM(l.amount)+'</h1><div class="ph-sub"><span class="badge '+(l.status==='active'?'b-green':'b-gray')+'">'+faLoanStatus(l.status)+'</span> &nbsp; ثبت در <b>'+J.fmtLong(l.created_at||'')+'</b> — '+J.fmt(l.created_at||'')+'</div></div>' +
        '<div class="ph-actions">' +
          (isSettled ? '' : canSettle
            ? '<button class="btn btn-solid btn-sm" id="srvLoanSettle" style="padding:11px 18px">'+icon('check',15)+' تسویه وام</button>'
            : '<button class="btn btn-solid btn-sm" id="srvLoanPay" style="padding:11px 18px">'+icon('coins',15)+' ثبت پرداخت قسط</button>') +
          '<button class="btn btn-ghost btn-sm" id="srvLoanBack" style="padding:11px 18px">بازگشت</button></div></div>' +

      (isSettled ? '<div class="alert a-ok" style="margin-top:12px"><span class="al-ic">'+icon('check',16)+'</span><div>این وام به‌طور کامل <b>تسویه</b> شده و بسته است — دیگر پرداخت روی آن ممکن نیست؛ فقط <b>تاریخچهٔ اقساط پرداخت‌شده</b> نمایش داده می‌شود.</div></div>' : '') +

      '<div class="grid g-4" style="margin-top:12px">' +
        '<div class="stat"><div class="stat-top"><span class="s-ic">'+icon('loan',15)+'</span>مبلغ اصل وام</div><div class="stat-val">'+fmtM(l.amount)+'</div><div class="stat-sub">کارمزد '+faDigits(l.fee_percent||0)+'% · '+faDigits(l.installments_count)+' قسط — از تنظیمات</div></div>' +
        '<div class="stat s-lime"><div class="stat-top"><span class="s-ic">'+icon('check',15)+'</span>پرداخت‌شده</div><div class="stat-val">'+fmtMShort(paidSum)+' <small>'+CUR()+'</small></div><div class="stat-sub">'+faDigits(pays.length)+' پرداخت تا امروز '+J.fmtLong(J.todayIso())+'</div></div>' +
        '<div class="stat s-red"><div class="stat-top"><span class="s-ic">'+icon('warn',15)+'</span>مانده بدهی</div><div class="stat-val">'+fmtMShort(bal)+' <small>'+CUR()+'</small></div><div class="stat-sub">'+faDigits(ins.filter(i=>i.status!=='paid').length)+' قسط باقی‌مانده</div></div>' +
        '<div class="stat s-teal"><div class="stat-top"><span class="s-ic">'+icon('clock',15)+'</span>قسط بعدی شمسی</div><div class="stat-val" style="font-size:1rem">'+(nextIns?J.fmtLong(nextIns.due_date):'—')+'</div><div class="stat-sub">'+(nextIns?J.fmt(nextIns.due_date)+' · '+fmtN(nextIns.amount)+' '+CUR():'تسویه کامل')+'</div></div>' +
      '</div>' +

      '<div class="grid g-2" style="margin-top:16px">' +
        '<div class="card" style="border-radius:16px"><div class="card-h"><h3>اطلاعات عضو — مرتبط و دقیق</h3><span class="hint-t">حتی فیلدهایی که بعداً اضافه کردید اینجا هستند</span></div><div class="card-b"><div class="kv-list">' +
          Object.entries(mVals).map(([k,v])=>{
            const label = v.label || k;
            const val = v.value || v;
            const isDate = /date|تاریخ/i.test(k+label);
            return '<div class="kv"><span class="k">'+esc(label)+'</span><span class="v">'+(isDate?J.fmtLong(val):esc(val||'—'))+'</span></div>';
          }).join('') +
          '<div class="kv"><span class="k">شماره عضویت</span><span class="v" style="font-family:monospace;background:var(--green-deep);color:white;padding:3px 8px;border-radius:6px">'+esc(l.member_no||member.member_no||'')+'</span></div>' +
          '<div class="kv"><span class="k">تاریخ عضویت شمسی</span><span class="v">'+J.fmtLong(member.created_at||'')+'</span></div>' +
        '</div></div></div>' +

        '<div class="card" style="border-radius:16px"><div class="card-h"><h3>خلاصه وام</h3></div><div class="card-b"><div class="kv-list">' +
          '<div class="kv"><span class="k">مبلغ وام</span><span class="v">'+fmtM(l.amount)+'</span></div>' +
          '<div class="kv"><span class="k">تعداد اقساط</span><span class="v">'+faDigits(l.installments_count)+' قسط</span></div>' +
          '<div class="kv"><span class="k">کارمزد از تنظیمات</span><span class="v">'+faDigits(l.fee_percent||0)+'%</span></div>' +
          '<div class="kv"><span class="k">وضعیت</span><span class="v"><span class="badge '+(l.status==='active'?'b-green':'b-gray')+'">'+faLoanStatus(l.status)+'</span></span></div>' +
          '<div class="kv"><span class="k">تاریخ ثبت شمسی کامل</span><span class="v">'+J.fmtLong(l.created_at||'')+'</span></div>' +
          '<div class="kv"><span class="k">تاریخ میلادی</span><span class="v" style="font-family:monospace;font-size:.8rem">'+esc(l.created_at||'')+'</span></div>' +
          (l.description ? '<div class="kv"><span class="k">توضیحات</span><span class="v">'+esc(l.description)+'</span></div>' : '') +
        '</div></div></div>' +
      '</div>' +

      '<div class="grid g-2" style="margin-top:16px">' +
        '<div class="card tight" style="border-radius:16px"><div class="card-h"><h3>'+(isSettled?'تاریخچهٔ پرداخت‌ها — شمسی':'پرداخت‌های انجام‌شده — تاریخ شمسی')+'</h3><span class="hint-t">'+faDigits(pays.length)+' پرداخت</span></div><div class="card-b">'+
          (pays.length?'<div class="mini-list">'+pays.map(p=>'<div class="mini-item"><span class="avatar sz-34" style="border-radius:11px;background:var(--green-bg)">'+icon('coins',15)+'</span><span class="mi-t"><b>'+fmtM(p.amount)+' '+CUR()+'</b><span>تاریخ شمسی: '+J.fmtLong(p.created_at||'')+' — '+J.fmt(p.created_at||'')+'<br>نوع: '+esc(p.type||'')+'</span></span><span class="mi-v pos">+ '+fmtN(p.amount)+'</span></div>').join('')+'</div>':'<div class="empty" style="padding:24px;text-align:center"><p class="hint-t">هنوز پرداختی ثبت نشده — دکمه ثبت پرداخت را بزنید.</p></div>')+
        '</div></div>' +

        '<div class="card tight" style="border-radius:16px"><div class="card-h"><h3>'+(isSettled?'تاریخچهٔ اقساط پرداخت‌شده':'برنامه اقساط — تاریخ شمسی کامل')+'</h3><span class="hint-t">'+faDigits(ins.length)+' قسط با نام ماه کامل</span></div>' +
          (ins.length?'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>سررسید شمسی کامل</th><th>مبلغ</th><th>وضعیت</th><th>پرداخت شمسی</th><th></th></tr></thead><tbody>'+
            ins.map(i=>{
              const jDate = J.iso2j(i.due_date);
              const fullMonth = jDate ? J.MONTHS[jDate.jm-1] : '';
              const fullDate = J.fmtLong(i.due_date);
              return '<tr><td class="c-fa-num"><b>'+fullDate+'</b><br><small class="hint-t">'+fullMonth+' ماه '+ (jDate?faDigits(jDate.jy):'') +' — '+J.fmt(i.due_date)+'</small></td><td class="c-fa-num c-strong">'+fmtN(i.amount)+'</td><td><span class="badge '+(i.status==='paid'?'b-green':'b-amber')+'"><i class="bd"></i>'+(typeof faInsStatus==='function'?faInsStatus(i.status):i.status)+'</span></td><td class="c-fa-num">'+(i.paid_at?J.fmtLong(i.paid_at)+'<br><small>'+J.fmt(i.paid_at)+'</small>':'—')+'</td><td>'+(i.status!=='paid' && !isSettled && !canSettle ?'<button class="btn btn-soft btn-xs" data-pay="'+i.id+'">پرداخت</button>':(i.status==='paid'?'<span class="badge b-green">تسویه</span>':'—'))+'</td></tr>';
            }).join('')+
          '</tbody></table></div>':'<div class="card-b"><p class="hint-t">قسطی وجود ندارد.</p></div>')+
        '</div>' +
      '</div>';

    const payBtn = document.getElementById('srvLoanPay');
    if(payBtn) payBtn.onclick = ()=> srvPaymentForm(l.id);
    const settleBtn = document.getElementById('srvLoanSettle');
    if(settleBtn) settleBtn.onclick = async ()=>{
      const ok = await askConfirm({title:'تسویهٔ نهایی وام',
        text:'ماندهٔ بدهی این وام <b>صفر</b> است. با تسویه، وام بسته می‌شود و <b>دیگر هیچ پرداختی</b> روی آن ممکن نیست؛ فقط تاریخچهٔ اقساط پرداخت‌شده نمایش داده می‌شود. ادامه می‌دهید؟',
        ok:'بله، تسویهٔ نهایی'});
      if(!ok) return;
      settleBtn.disabled = true; settleBtn.textContent = 'در حال تسویه…';
      try{
        const resp = await srvFetch('POST','/api/institutions/'+SRV.instId+'/loans/'+l.id+'/settle',{});
        toast('وام «'+mName+'» به‌طور کامل تسویه شد. 🎉','ok');
        if(typeof stampFx==='function') stampFx({ text:'تسویه شد', sub:mName, color:'#1C6E31', hold:1100, onDone:()=>srvLoanDetail(l.id) });
        else srvLoanDetail(l.id);
      }catch(e){
        settleBtn.disabled = false; settleBtn.innerHTML = icon('check',15)+' تسویه وام';
        toast(e.message||'خطا در تسویه وام.','err');
      }
    };
    const backBtn = document.getElementById('srvLoanBack');
    if(backBtn) backBtn.onclick = ()=> location.hash='#/app/loans';
    main.querySelectorAll('[data-pay]').forEach(b=> b.onclick=()=> srvPaymentForm(l.id, b.dataset.pay));

  } catch(e){
    main.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>خطا: '+esc(e.message)+'</div></div><a class="btn btn-soft btn-sm" href="#/app/loans" style="margin-top:12px">بازگشت به وام‌ها</a>';
  }
}



async function srvLoanForm(presetMemberId){
  let members = [], funds = [], inst = null;
  try {
    const [mData, fData, iData] = await Promise.all([
      srvFetch('GET', '/api/institutions/'+SRV.instId+'/members?page=1&pageSize=200'),
      srvFetch('GET', '/api/institutions/'+SRV.instId+'/funds').catch(()=>({funds:[]})),
      srvFetch('GET', '/api/institutions/'+SRV.instId).then(r=>r.institution||r).catch(()=>null)
    ]);
    members = mData.rows||[];
    funds = fData.funds||[];
    inst = iData;
  } catch(e){ toast(e.message,'err'); return; }
  if(!members.length){ toast('ابتدا حداقل یک عضو ثبت کنید.','warn'); return; }

  const feeDefault = inst ? (inst.fee_percent!=null ? inst.fee_percent : 4) : 4;
  const cntDefault = inst ? (inst.installments_count||12) : 12;

  const memberOpts = members.map(m=>{
    const nm = m.values ? (Object.values(m.values)[0]||m.member_no) : m.member_no;
    return '<option value="'+m.id+'"'+(String(presetMemberId)===String(m.id)?' selected':'')+'>'+esc(nm)+' ('+esc(m.member_no||'')+')</option>';
  }).join('');

  const fundOpts = funds.length ? funds.map(f=>'<option value="'+f.id+'">'+esc(f.name)+'</option>').join('') : '<option value="">— بدون صندوق —</option>';

  const drawerWrap = document.createElement('div');
  drawerWrap.className = 'drawer-wrap';
  drawerWrap.innerHTML = '<div class="m-drawer" role="dialog" aria-modal="true">' +
    '<div class="m-head"><h3>ثبت وام جدید<span class="m-sub">فرم چندبخشی — عضو، مبلغ، برنامه اقساط — کارمزد از تنظیمات: '+faDigits(feeDefault)+'%</span></h3>' +
    '<button class="x-btn" data-close aria-label="بستن">'+icon('x',15)+'</button></div>' +
    '<div class="m-body">' +
      '<div class="m-sec t-green"><div class="m-sec-h"><span class="sn">۱</span> عضو و صندوق</div><div class="m-sec-b"><div class="fields">' +
        '<div class="field"><label>عضو <span class="req">*</span></label><select id="slfMember"><option value="">— انتخاب عضو —</option>'+memberOpts+'</select><span class="err-msg"></span></div>' +
        '<div class="field"><label>صندوق</label><select id="slfFund"><option value="">— انتخاب صندوق —</option>'+fundOpts+'</select><span class="help">صندوقی که وام از آن پرداخت می‌شود</span></div>' +
        '<div class="field full"><label>حساب پرداخت</label><select id="slfAcc"><option value="">— انتخاب حساب —</option></select><span class="help">برای پرداخت اصل وام</span></div>' +
      '</div></div></div>' +
      '<div class="m-sec t-amber"><div class="m-sec-h"><span class="sn">۲</span> مبلغ و تاریخ‌ها</div><div class="m-sec-b"><div class="fields">' +
        '<div class="field"><label>مبلغ اصل وام <small>('+CUR()+')</small> <span class="req">*</span></label><input id="slfAmt" class="num-inp" placeholder="مثلاً 50000000"><span class="err-msg"></span></div>' +
        '<div class="field"><label>نرخ / کارمزد سالانه <small>(٪) — از تنظیمات</small></label><input id="slfFee" class="num-inp" value="'+esc(String(feeDefault))+'"><span class="help">اگر 0 بزنید بدون کارمزد</span></div>' +
        '<div class="field"><label>تاریخ درخواست</label><input id="slfReq" placeholder="1403/02/15"></div>' +
        '<div class="field"><label>تاریخ پرداخت</label><input id="slfPay" placeholder="1403/02/16"></div>' +
      '</div></div></div>' +
      '<div class="m-sec t-blue"><div class="m-sec-h"><span class="sn">۳</span> برنامه اقساط</div><div class="m-sec-b"><div class="fields">' +
        '<div class="field"><label>تعداد اقساط <span class="req">*</span> <small>(هر عددی — ۱ تا ۱۲۰)</small></label><input id="slfCnt" type="number" inputmode="numeric" class="num-inp" min="1" max="120" value="'+esc(String(cntDefault))+'"><span class="help">به میل خودت؛ مثلاً ۷، ۹، ۱۵…</span></div>' +
        '<div class="field"><label>فاصله اقساط</label><select id="slfInt"><option value="1" selected>ماهانه</option><option value="2">دوماه یک‌بار</option><option value="3">سه‌ماه یک‌بار</option></select></div>' +
        '<div class="field"><label>تاریخ اولین سررسید <span class="req">*</span></label><input id="slfFirst" placeholder="1403/03/15"><span class="err-msg"></span></div>' +
        '<div class="field"><label>مبلغ هر قسط <small>('+CUR()+')</small></label><input id="slfPer" class="num-inp"><span class="help">خودکار محاسبه می‌شود</span></div>' +
        '<div class="field full"><label>نوع اقساط</label><div class="chips" id="slfKindChips"><span class="chip on" data-k="equal">مساوی — همه اقساط یک مبلغ</span><span class="chip" data-k="custom">متغیر — مبلغ هر قسط جداگانه</span></div><span class="help">در حالت «متغیر» مبلغ هر قسط را جداگانه وارد می‌کنی؛ مجموع باید دقیقاً با «مبلغ قابل‌بازپرداخت» برابر باشد.</span></div>' +
        '<div class="field full" id="slfVarBox" style="display:none">' +
          '<div class="var-head"><b>ویرایش مبلغ هر قسط</b><div style="display:flex;gap:6px"><button type="button" class="btn btn-ghost btn-xs" id="slfVarEq">'+icon('refresh',12)+' توزیع مساوی</button><button type="button" class="btn btn-soft btn-xs" id="slfVarBal">'+icon('check',12)+' تراز خودکار روی قسط آخر</button></div></div>' +
          '<div class="var-grid" id="slfVarGrid"></div>' +
          '<div class="var-sum" id="slfVarSum"></div>' +
        '</div>' +
        '<div class="field full"><label>توضیحات</label><textarea id="slfDesc" rows="2" placeholder="اختیاری"></textarea></div>' +
      '</div><div class="card-b" style="border-top:1px dashed var(--line);background:var(--card-2);margin-top:12px;border-radius:10px"><div id="slfSum"></div></div></div></div>' +
      '<div id="slfErr" style="display:none;color:var(--red);font-size:12px;margin:12px;padding:10px;background:var(--red-bg);border-radius:8px"></div>' +
    '</div>' +
    '<div class="m-foot"><span class="grow" style="font-size:.8rem;color:var(--ink-2)">پس از ذخیره، برنامه اقساط ساخته می‌شود.</span><button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="slfSave">'+icon('check',14)+' ثبت وام</button></div>' +
  '</div>';
  document.getElementById('modalRoot').appendChild(drawerWrap);
  document.body.style.overflow='hidden';
  const close = ()=>{ drawerWrap.remove(); document.body.style.overflow=''; };
  drawerWrap.addEventListener('mousedown', e=>{ if(e.target===drawerWrap) close(); });
  drawerWrap.querySelector('[data-close]').onclick=close;
  drawerWrap.querySelector('[data-x]').onclick=close;

  const el = id => drawerWrap.querySelector(id);
  if(typeof attachMoney==='function'){ attachMoney(el('#slfAmt')); attachMoney(el('#slfPer')); attachMoney(el('#slfFee')); }
  if(typeof attachJDate==='function'){
    ['#slfReq','#slfPay','#slfFirst'].forEach(s=>{ const e=el(s); if(e) attachJDate(e); });
  }
  const today = J.todayIso();
  if(typeof setJd==='function'){ setJd(el('#slfReq'), today); }

  // Load accounts when fund changes
  async function loadAccounts(){
    const fid = el('#slfFund').value;
    const accSel = el('#slfAcc');
    if(!fid){ accSel.innerHTML='<option value="">— ابتدا صندوق انتخاب کنید —</option>'; return; }
    try {
      const aData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/accounts');
      const accs = (aData.accounts||[]).filter(a=>String(a.fund_id)===String(fid));
      accSel.innerHTML = accs.length ? accs.map(a=>'<option value="'+a.id+'">'+esc(a.name)+' — موجودی '+fmtN(a.initial_balance)+'</option>').join('') : '<option value="">حساب فعالی نیست — از منوی صندوق‌ها بسازید</option>';
    } catch(e){ accSel.innerHTML='<option value="">خطا: '+esc(e.message)+'</option>'; }
  }
  el('#slfFund').addEventListener('change', loadAccounts);
  loadAccounts();

  function slfNum(x){ return parseInt(String(x||'').replace(/[^0-9]/g,''))||0; }
  function updateSum(){
    const amt = slfNum(el('#slfAmt').value);
    const months = parseInt(el('#slfCnt').value)||12;
    const rate = parseFloat(faToEn(el('#slfFee').value))||0;
    const perEl = el('#slfPer');
    if(amt>0 && months>0){
      const per = Math.ceil(amt*(1+rate/100)/months/10000)*10000;
      if(typeof setMoney==='function') setMoney(perEl, per);
      else perEl.value = per;
      if(slfKind==='custom') slfBuildGrid();
    }
    const per = slfNum(perEl.value);
    el('#slfSum').innerHTML =
      '<div class="sum-line"><span>مبلغ اصل وام</span><b>'+fmtM(amt||0)+'</b></div>' +
      '<div class="sum-line"><span>مبلغ قابل‌بازپرداخت ('+faDigits(months)+' قسط)</span><b>'+fmtM(per*months)+'</b></div>' +
      (rate > 0 ? '<div class="sum-line"><span>مجموع کارمزد ('+faDigits(rate)+'٪)</span><b style="color:var(--amber)">'+fmtM(Math.max(0, per*months - (amt||0)))+'</b></div>' : '');
    slfUpdateVar();
  }
  /* ── اقساط متغیر (حالت سرور) ── */
  let slfKind = 'equal';
  function slfVarTarget(){ return slfNum(el('#slfPer').value) * (parseInt(el('#slfCnt').value)||12); }
  function slfBuildGrid(prefill){
    const grid = el('#slfVarGrid'); if(!grid) return; grid.innerHTML = '';
    const months = parseInt(el('#slfCnt').value)||12;
    const per = slfNum(el('#slfPer').value);
    const base = (prefill && prefill.length===months) ? prefill : Array.from({length:months}, ()=>per);
    for(let i=0;i<months;i++){
      const it = document.createElement('div'); it.className = 'var-it';
      it.innerHTML = '<span class="vn">'+faDigits(i+1)+'</span>';
      const inp = document.createElement('input'); inp.className = 'num-inp vamt'; inp.dataset.i = i;
      it.appendChild(inp); grid.appendChild(it);
      if(typeof attachMoney==='function') attachMoney(inp);
      if(typeof setMoney==='function') setMoney(inp, base[i]||0); else inp.value = base[i]||0;
      inp.addEventListener('input', slfUpdateVar);
    }
    slfUpdateVar();
  }
  function slfReadPlan(){ const g = el('#slfVarGrid'); if(!g) return []; return Array.from(g.querySelectorAll('.vamt')).map(i=>slfNum(i.value)); }
  function slfUpdateVar(){
    if(slfKind !== 'custom') return;
    const sum = el('#slfVarSum'); if(!sum) return;
    const plan = slfReadPlan(); if(!plan.length) return;
    const tot = plan.reduce((x,y)=>x+y,0), tg = slfVarTarget(), diff = tg - tot;
    sum.innerHTML = '<span>مجموع اقساط: <b>'+fmtM(tot)+'</b></span><span>مبلغ قابل‌بازپرداخت: <b>'+fmtM(tg)+'</b></span>' +
      (diff===0 ? '<span class="badge b-green"><i class="bd"></i>تراز است</span>'
                : '<span class="badge b-red"><i class="bd"></i>'+fmtM(Math.abs(diff))+' '+(diff>0?'کم‌تر':'بیش‌تر')+'</span>');
  }
  el('#slfKindChips').querySelectorAll('.chip').forEach(c => c.onclick = ()=>{
    slfKind = c.dataset.k;
    el('#slfKindChips').querySelectorAll('.chip').forEach(x=>x.classList.toggle('on', x===c));
    el('#slfVarBox').style.display = slfKind==='custom' ? '' : 'none';
    if(slfKind==='custom') slfBuildGrid();
    slfUpdateVar();
  });
  el('#slfVarEq').onclick = ()=> slfBuildGrid();
  el('#slfVarBal').onclick = ()=>{
    const plan = slfReadPlan(); if(!plan.length) return;
    const diff = slfVarTarget() - plan.reduce((x,y)=>x+y,0);
    if(diff!==0) plan[plan.length-1] = Math.max(0, (plan[plan.length-1]||0) + diff);
    slfBuildGrid(plan);
  };
  el('#slfAmt').addEventListener('input', updateSum);
  el('#slfCnt').addEventListener('input', updateSum);
  el('#slfCnt').addEventListener('change', updateSum);
  el('#slfFee').addEventListener('input', updateSum);
  el('#slfPer').addEventListener('input', updateSum);
  updateSum();

  el('#slfSave').onclick = async ()=>{
    const mid = el('#slfMember').value;
    const amt = el('#slfAmt').value.replace(/[^0-9]/g,'');
    const cnt = el('#slfCnt').value;
    const fee = el('#slfFee').value;
    const desc = el('#slfDesc').value;
    const first = el('#slfFirst').value;
    const err = el('#slfErr');
    if(!mid){ err.style.display=''; err.textContent='عضو را انتخاب کنید.'; return; }
    if(!amt || Number(amt)<=0){ err.style.display=''; err.textContent='مبلغ وام را وارد کنید.'; return; }
    if(!first){ err.style.display=''; err.textContent='تاریخ اولین سررسید الزامی است.'; return; }
    const cntN = Math.round(parseInt(cnt)||0);
    if(cntN < 1 || cntN > 120){ err.style.display=''; err.textContent='تعداد اقساط باید بین ۱ تا ۱۲۰ باشد.'; return; }
    const payload = { memberId: parseInt(mid), amount: amt, installmentsCount: cntN, feePercent: fee, description: desc,
      intervalMonths: parseInt(el('#slfInt').value)||1 };
    try { const fd = (typeof jdVal==='function') ? jdVal(el('#slfFirst')) : ''; if(fd) payload.firstDue = fd; } catch(e){}
    if(slfKind === 'custom'){
      const pl = slfReadPlan();
      const tot = pl.reduce((x,y)=>x+y,0), tg = slfVarTarget();
      if(tot !== tg){ err.style.display=''; err.textContent = 'مجموع اقساط ('+fmtM(tot)+') با مبلغ قابل‌بازپرداخت ('+fmtM(tg)+') برابر نیست — «تراز خودکار» را بزنید یا مبلغ‌ها را اصلاح کنید.'; return; }
      payload.plan = pl;
    }
    const btn = el('#slfSave'); btn.disabled=true; btn.textContent='در حال ثبت…';
    try {
      await srvFetch('POST', '/api/institutions/'+SRV.instId+'/loans', payload);
      toast('وام ثبت شد.','ok');
      if(typeof stampFx==='function') stampFx({ text:'ثبت شد', sub:'وام '+fmtM(amt)+' — '+J.fmt(J.todayIso()), color:'#1C6E31', hold:1100, onDone:()=>{ close(); if(typeof srvLoadLoans==='function') srvLoadLoans(); }});
      else { close(); if(typeof srvLoadLoans==='function') srvLoadLoans(); }
    } catch(e){
      err.style.display=''; err.innerHTML = esc(e.message) + (e.details?'<br>'+e.details.join('<br>'):'');
      btn.disabled=false; btn.innerHTML=icon('check',14)+' ثبت وام';
    }
  };
}


/* ── پرونده عضو — حالت سرور — دقیقا مثل قالب اصلی ── */


async function renderSrvMemberProfile(memberId){
  const main = $('#main');
  main.innerHTML = '<div class="page-head"><div><a href="#/app/members" class="login-back" style="margin-bottom:8px">'+icon('arrowL',14)+' بازگشت</a><div class="skeleton" style="height:24px;width:200px"></div></div></div><div class="card"><div class="card-b"><p class="hint-t">در حال بارگذاری پرونده زیبا...</p></div></div>';
  try {
    // Always fresh fields
    srvFieldsCache = null;
    const [mRes, fieldsData] = await Promise.all([
      srvFetch('GET', '/api/institutions/'+SRV.instId+'/members/'+memberId),
      srvLoadFields().catch(()=>[])
    ]);
    const m = mRes.member;
    const vals = m.values||{};
    const fields = Array.isArray(fieldsData) ? fieldsData : (fieldsData.fields||fieldsData||[]);
    const fieldMap = {};
    fields.forEach(f=> fieldMap[f.key]=f.label);

    const name = Object.values(vals)[0] || m.member_no || '#'+m.id;
    const av = (name.charAt(0)||'؟').toUpperCase();

    let loans = [];
    try {
      const lData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans?memberId='+memberId+'&page=1&pageSize=100');
      loans = lData.rows||[];
    } catch(e){}

    // Fetch transactions for member
    let txns = [];
    try {
      const tData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/txns?page=1&pageSize=50').catch(()=>({rows:[]}));
      txns = (tData.rows||[]).filter(t=> String(t.member_id)===String(memberId)).slice(0,10);
    } catch(e){}

    main.innerHTML =
      '<div class="page-head"><div><a href="#/app/members" class="login-back" style="margin-bottom:10px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--card-2);border-radius:20px;font-size:.82rem">'+icon('arrowL',14)+' بازگشت به اعضا</a>' +
        '<div style="background:linear-gradient(135deg,#1C6E31 0%,#2e7d32 50%,#43a047 100%);padding:24px;border-radius:20px;color:white;position:relative;overflow:hidden;margin-top:12px;box-shadow:0 8px 24px rgba(28,110,49,.25)">' +
          '<div style="position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:rgba(255,255,255,.08);border-radius:50%"></div>' +
          '<div style="position:absolute;bottom:-30px;left:-30px;width:80px;height:80px;background:rgba(255,255,255,.05);border-radius:50%"></div>' +
          '<div style="display:flex;gap:20px;align-items:center;position:relative;z-index:1">' +
            '<div style="width:84px;height:84px;border-radius:20px;background:linear-gradient(135deg,white 0%,#f1f8e9 100%);color:var(--green-deep);display:flex;align-items:center;justify-content:center;font-size:2.2rem;font-weight:900;box-shadow:0 4px 16px rgba(0,0,0,.15)">'+esc(av)+'</div>' +
            '<div style="flex:1"><h1 style="font-size:1.7rem;margin:0;color:white;font-weight:800">'+esc(name)+'</h1>' +
            '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
              '<span style="background:rgba(255,255,255,.2);backdrop-filter:blur(8px);padding:6px 14px;border-radius:20px;font-size:.82rem;border:1px solid rgba(255,255,255,.25)">'+(m.status==='active'?'✓ فعال':'○ غیرفعال')+'</span>' +
              '<span style="background:rgba(255,255,255,.15);padding:6px 14px;border-radius:20px;font-size:.82rem">🆔 '+esc(m.member_no||'')+'</span>' +
              '<span style="background:rgba(255,255,255,.15);padding:6px 14px;border-radius:20px;font-size:.82rem"><span style="display:inline-flex;vertical-align:middle;margin-inline-end:3px;color:var(--green-deep)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/></svg></span> '+J.fmtLong(m.created_at||'')+'</span>' +
            '</div></div>' +
          '</div>' +
        '</div></div>' +
        '<div class="ph-actions" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="srvPmEdit" style="padding:11px 18px;border-radius:12px">'+icon('edit',14)+' ویرایش</button>' +
        '<button class="btn btn-ghost btn-sm" id="srvPmDel" style="padding:11px 18px;border-radius:12px;color:var(--red);border-color:var(--red-bg)">'+icon('trash',14)+' حذف</button>' +
        '<button class="btn btn-solid btn-sm" id="srvPmLoan" style="padding:12px 22px;border-radius:12px;box-shadow:0 4px 12px rgba(28,110,49,.3)">'+icon('loan',15)+' ثبت وام جدید</button></div></div>' +

      '<div class="grid g-4" style="margin-top:18px">' +
        '<div class="card" style="border-radius:16px;background:linear-gradient(135deg,#e8f5e9 0%,#c8e6c9 100%);border:none;box-shadow:0 2px 12px rgba(0,0,0,.06)"><div class="card-b" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.82rem;color:#2e7d32;font-weight:600">کل وام‌ها</span><span style="width:36px;height:36px;background:#1C6E31;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white">'+icon('loan',18)+'</span></div><div style="font-size:1.8rem;font-weight:800;margin-top:8px;color:#1b5e20">'+faDigits(loans.length)+'</div><div style="font-size:.78rem;color:#388e3c;margin-top:4px">'+faDigits(loans.filter(l=>l.status==='active').length)+' در حال بازپرداخت · '+faDigits(loans.filter(l=>l.status==='paid').length)+' تسویه‌شده</div></div></div>' +
        '<div class="card" style="border-radius:16px;background:linear-gradient(135deg,#fff3e0 0%,#ffe0b2 100%);border:none;box-shadow:0 2px 12px rgba(0,0,0,.06)"><div class="card-b" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.82rem;color:#e65100;font-weight:600">مجموع وام‌ها</span><span style="width:36px;height:36px;background:#ef6c00;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white">'+icon('coins',18)+'</span></div><div style="font-size:1.4rem;font-weight:800;margin-top:8px;color:#bf360c">'+fmtMShort(loans.reduce((s,l)=>s+Number(l.amount||0),0))+'</div><div style="font-size:.78rem;color:#ef6c00">'+CUR()+'</div></div></div>' +
        '<div class="card" style="border-radius:16px;background:linear-gradient(135deg,#fce4ec 0%,#f8bbd0 100%);border:none;box-shadow:0 2px 12px rgba(0,0,0,.06)"><div class="card-b" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.82rem;color:#ad1457;font-weight:600">وضعیت عضویت</span><span style="width:36px;height:36px;background:#c2185b;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white">'+icon('users',18)+'</span></div><div style="font-size:1.3rem;font-weight:800;margin-top:8px;color:#880e4f">'+(m.status==='active'?'فعال':'غیرفعال')+'</div><div style="font-size:.78rem;color:#ad1457">'+esc(m.member_no||'')+'</div></div></div>' +
        '<div class="card" style="border-radius:16px;background:linear-gradient(135deg,#e3f2fd 0%,#90caf9 100%);border:none;box-shadow:0 2px 12px rgba(0,0,0,.06)"><div class="card-b" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.82rem;color:#0d47a1;font-weight:600">عضویت شمسی</span><span style="width:36px;height:36px;background:#1565c0;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white">'+icon('calendar',18)+'</span></div><div style="font-size:1rem;font-weight:800;margin-top:8px;color:#0d47a1">'+J.fmtLong(m.created_at||'')+'</div><div style="font-size:.78rem;color:#1565c0">'+J.fmt(m.created_at||'')+'</div></div></div>' +
      '</div>' +

      '<div class="grid g-2" style="margin-top:18px">' +
        '<div class="card" style="border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid #e8f5e9"><div class="card-h" style="background:linear-gradient(90deg,#f1f8e9,#e8f5e9);padding:16px 20px;border-bottom:1px solid #c8e6c9"><h3 style="display:flex;align-items:center;gap:10px;font-size:1rem">'+icon('card',18)+' اطلاعات هویتی کامل — دقیق و مرتبط</h3><span class="badge b-green">زنده از DB</span></div><div class="card-b" style="padding:0"><div style="padding:8px 20px">' +
          Object.entries(vals).map(([k,v])=>{
            const label = fieldMap[k] || k;
            const isDate = /date|تاریخ|birth/i.test(k+label);
            const isMobile = /mobile|phone|تماس/i.test(k+label);
            const isNid = /national|کدملی|کد ملی/i.test(k+label);
            const ic = isMobile ? 'phone' : (isNid ? 'card' : (isDate ? 'calendar' : 'user'));
            const displayVal = isDate && v ? J.fmtLong(v) + ' <br><small class="hint-t">'+J.fmt(v)+'</small>' : esc(v||'—');
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px dashed #e0e0e0"><span style="display:flex;align-items:center;gap:10px;color:var(--ink-2);font-size:.88rem"><span style="width:32px;height:32px;background:var(--card-2);border-radius:10px;display:flex;align-items:center;justify-content:center">'+icon(ic,16)+'</span>'+esc(label)+'</span><span style="font-weight:700;font-size:.92rem;text-align:left;max-width:60%">'+displayVal+'</span></div>';
          }).join('') +
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;background:linear-gradient(90deg,#f1f8e9,#e8f5e9);margin:12px -20px -8px;padding:16px 20px;border-radius:0 0 12px 12px"><span style="font-weight:700;color:#2e7d32">شماره عضویت</span><span style="font-family:monospace;background:#1C6E31;color:white;padding:6px 14px;border-radius:10px;font-weight:800;letter-spacing:1px">'+esc(m.member_no||'')+'</span></div>' +
        '</div></div></div></div>' +

        '<div style="display:flex;flex-direction:column;gap:16px">' +
          '<div class="card" style="border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid #e3f2fd"><div class="card-h" style="background:linear-gradient(90deg,#e3f2fd,#bbdefb);padding:14px 20px"><h3 style="display:flex;align-items:center;gap:8px">'+icon('loan',18)+' وام‌های این عضو — مرتبط</h3><button class="btn btn-soft btn-xs" id="srvMpAddLoan2" style="border-radius:20px">'+icon('plus',12)+' وام جدید</button></div><div id="srvMpLoansBox" style="padding:0;max-height:320px;overflow:auto"></div></div>' +
          '<div class="card" style="border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.06)"><div class="card-h" style="padding:14px 20px"><h3>تراکنش‌های اخیر</h3></div><div id="srvMpTxnsBox" style="padding:12px"></div></div>' +
        '</div>' +
      '</div>' +

      '<div class="card tight" style="margin-top:18px;border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.05)"><div class="card-b" style="padding:8px 20px 0"><div class="tabs" id="srvMpTabs" style="gap:4px">' +
        '<button class="tab on" data-t="loans" style="border-radius:12px 12px 0 0">وام‌ها<span class="tc">'+faDigits(loans.length)+'</span></button>' +
        '<button class="tab" data-t="timeline" style="border-radius:12px 12px 0 0">تاریخچه شمسی کامل</button>' +
        '<button class="tab" data-t="fields" style="border-radius:12px 12px 0 0">فیلدهای سفارشی — جدید</button>' +
      '</div></div><div class="card-b" id="srvMpBody" style="padding:20px"></div></div>';

    // Bind
    $('#srvPmEdit').onclick = ()=> srvMemberForm(m);
    $('#srvPmDel').onclick = async ()=>{
      const ok = await askConfirm({ title:'حذف عضو', danger:true, ok:'حذف شود', text:'عضو «'+esc(name)+'» حذف می‌شود.' });
      if(!ok) return;
      try { await srvFetch('DELETE', '/api/institutions/'+SRV.instId+'/members/'+memberId); toast('عضو حذف شد.','ok'); location.hash='#/app/members'; } catch(e){ toast(e.message,'err'); }
    };
    $('#srvPmLoan').onclick = ()=> srvLoanForm(m.id);
    const addLoan2 = $('#srvMpAddLoan2'); if(addLoan2) addLoan2.onclick = ()=> srvLoanForm(m.id);

    const loansBox = $('#srvMpLoansBox');
    if(!loans.length){
      loansBox.innerHTML = '<div style="padding:36px 20px;text-align:center"><div style="width:64px;height:64px;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;color:#1C6E31">'+icon('loan',32)+'</div><h3 style="margin:0">وامی ثبت نشده</h3><p class="hint-t" style="margin:8px 0 0">این عضو هنوز وامی ندارد — وام‌ها اینجا با اطلاعات کامل عضو نمایش داده می‌شوند</p><button class="btn btn-solid btn-sm" id="srvMpAddLoan" style="margin-top:16px;border-radius:12px">'+icon('plus',14)+' ثبت اولین وام</button></div>';
      const b=$('#srvMpAddLoan'); if(b) b.onclick=()=>srvLoanForm(m.id);
    } else {
      loansBox.innerHTML = '<div style="padding:8px"><div class="mini-list">'+loans.map(l=>{
        const fee = l.fee_percent!=null ? faDigits(l.fee_percent)+'٪' : '—';
        return '<div class="mini-item" style="padding:14px;border-radius:12px;margin-bottom:6px;background:linear-gradient(90deg,#fafafa,#f5f5f5);border:1px solid #eee"><span class="avatar sz-40 teal" style="border-radius:12px;width:44px;height:44px">'+icon('loan',20)+'</span><span class="mi-t"><b style="font-size:.95rem">'+fmtM(l.amount)+' '+CUR()+'</b><span style="display:flex;gap:6px;margin-top:4px"><span class="badge b-gray" style="font-size:.7rem">'+faDigits(l.installments_count)+' قسط</span><span class="badge b-amber" style="font-size:.7rem">'+fee+'</span><span class="badge '+(l.status==='active'?'b-green':'b-gray')+'" style="font-size:.7rem">'+faLoanStatus(l.status)+'</span></span><span style="font-size:.75rem;color:var(--ink-2);margin-top:4px"><span style="display:inline-flex;vertical-align:middle;margin-inline-end:3px;color:var(--green-deep)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/></svg></span> '+J.fmtLong(l.created_at||'')+'</span></span><button class="btn btn-soft btn-xs" data-ld="'+l.id+'" style="border-radius:20px">جزئیات</button></div>';
      }).join('')+'</div></div>';
      loansBox.querySelectorAll('[data-ld]').forEach(b=> b.onclick=()=> srvLoanDetail(b.dataset.ld));
    }

    const txnsBox = $('#srvMpTxnsBox');
    if(!txns.length) txnsBox.innerHTML = '<p class="hint-t" style="padding:12px">تراکنشی نیست.</p>';
    else txnsBox.innerHTML = '<div class="mini-list">'+txns.map(t=>'<div class="mini-item" style="padding:10px"><span class="avatar sz-32" style="border-radius:10px;background:'+(t.type==='deposit'?'#e8f5e9':'#ffebee')+'">'+icon(t.type==='deposit'?'download':'upload',14)+'</span><span class="mi-t"><b>'+faTxnType(t.type)+' '+fmtM(t.amount)+'</b><span>'+J.fmtLong(t.created_at||'')+'</span></span></div>').join('')+'</div>';

    const tabs = {
      loans(){
        if(!loans.length) return '<p class="hint-t">وامی نیست.</p>';
        return '<div class="alert a-info" style="border-radius:12px"><span class="al-ic">'+icon('info',16)+'</span><div>این عضو <b>'+faDigits(loans.length)+'</b> وام دارد. هر وام با اطلاعات کامل عضو (حتی فیلدهایی که بعداً اضافه کردید) مرتبط است — چون اطلاعات عضو زنده از DB می‌آید و در منوی وام هم نمایش داده می‌شود.</div></div>' +
          '<div class="tbl-wrap" style="margin-top:16px;border-radius:12px;overflow:hidden"><table class="tbl"><thead><tr><th>مبلغ</th><th>اقساط</th><th>کارمزد</th><th>وضعیت فارسی</th><th>تاریخ شمسی کامل</th><th></th></tr></thead><tbody>' +
          loans.map(l=>'<tr><td class="c-strong">'+fmtM(l.amount)+'</td><td>'+faDigits(l.installments_count)+'</td><td>'+faDigits(l.fee_percent||0)+'%</td><td><span class="badge '+(l.status==='active'?'b-green':'b-gray')+'">'+faLoanStatus(l.status)+'</span></td><td><b>'+J.fmtLong(l.created_at||'')+'</b><br><small class="hint-t">'+J.fmt(l.created_at||'')+'</small></td><td><button class="btn btn-soft btn-xs" data-ld2="'+l.id+'" style="border-radius:20px">مشاهده</button></td></tr>').join('')+
          '</tbody></table></div>';
      },
      timeline(){
        return '<div class="timeline" style="position:relative;padding-right:20px">' +
          '<div style="position:absolute;right:7px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,#1C6E31,#c8e6c9)"></div>' +
          '<div class="tl-item" style="position:relative;padding-right:28px;margin-bottom:18px"><div style="position:absolute;right:-4px;top:4px;width:16px;height:16px;background:#1C6E31;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #e8f5e9"></div><div class="tl-t" style="font-weight:700">عضو ثبت شد</div><div class="tl-d" style="color:var(--ink-2);font-size:.85rem;margin-top:4px"><span style="display:inline-flex;vertical-align:middle;margin-inline-end:3px;color:var(--green-deep)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/></svg></span> '+J.fmtLong(m.created_at||'')+' — '+esc(m.created_at||'')+'</div></div>' +
          '<div class="tl-item" style="position:relative;padding-right:28px;margin-bottom:18px"><div style="position:absolute;right:-4px;top:4px;width:16px;height:16px;background:#f57f17;border-radius:50%;border:3px solid white"></div><div class="tl-t">آخرین ویرایش</div><div class="tl-d">'+J.fmtLong(m.updated_at||m.created_at||'')+'</div></div>' +
          loans.map(l=>'<div class="tl-item" style="position:relative;padding-right:28px;margin-bottom:18px"><div style="position:absolute;right:-4px;top:4px;width:16px;height:16px;background:#1565c0;border-radius:50%;border:3px solid white"></div><div class="tl-t">وام '+fmtM(l.amount)+' ثبت شد</div><div class="tl-d"><span style="display:inline-flex;vertical-align:middle;margin-inline-end:3px;color:var(--green-deep)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V7M16 2.8V7"/></svg></span> '+J.fmtLong(l.created_at||'')+' — '+faDigits(l.installments_count)+' قسط، کارمزد '+faDigits(l.fee_percent||0)+'% — وضعیت: '+faLoanStatus(l.status)+'</div></div>').join('') +
        '</div>';
      },
      fields(){
        return '<div class="alert a-ok" style="border-radius:12px;background:linear-gradient(90deg,#e8f5e9,#f1f8e9)"><span class="al-ic">'+icon('check',16)+'</span><div><b>فیلدهای جدید همینجا ظاهر می‌شن!</b> تمام فیلدهای این عضو — حتی فیلدهایی که بعد از ثبت وام اضافه کردید — اینجا نمایش داده می‌شوند و در منوی وام هم قابل مشاهده هستند چون هر بار زنده از DB می‌خوانیم. کش پاک می‌شود.</div></div>' +
          '<div class="grid g-2" style="margin-top:16px">' +
          Object.entries(vals).map(([k,v])=>{
            const label = fieldMap[k]||k;
            return '<div class="card" style="border-radius:14px;border:1px solid #e0e0e0;box-shadow:0 2px 8px rgba(0,0,0,.04)"><div class="card-b" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:.8rem;color:var(--ink-2)">'+esc(label)+'</span><span style="font-family:monospace;font-size:.7rem;background:var(--card-2);padding:2px 8px;border-radius:12px">'+esc(k)+'</span></div><div style="font-size:1.05rem;font-weight:800;margin-top:8px;color:var(--ink)">'+esc(v||'—')+'</div></div></div>';
          }).join('') +
          '</div>';
      }
    };
    const showTab = t=>{
      const body = $('#srvMpBody');
      if(!body) return;
      body.innerHTML = tabs[t]();
      $$('#srvMpTabs .tab').forEach(b=> b.classList.toggle('on', b.dataset.t===t));
      if(t==='loans'){
        body.querySelectorAll('[data-ld2]').forEach(b=> b.onclick=()=> srvLoanDetail(b.dataset.ld2));
      }
    };
    $$('#srvMpTabs .tab').forEach(b=> b.onclick=()=> showTab(b.dataset.t));
    showTab('loans');

  } catch(e){
    main.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>خطا: '+esc(e.message)+'</div></div><a class="btn btn-soft btn-sm" href="#/app/members" style="margin-top:12px">بازگشت</a>';
  }
}





/* ── صندوق‌ها و حساب‌ها — حالت سرور — موجودی صندوق کجا وارد می‌شود ── */
let srvFundsTab = 'funds';
async function renderSrvFundsPage(tab){
  srvFundsTab = tab || srvFundsTab;
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>صندوق‌ها و حساب‌ها</h1><div class="ph-sub">حالت سرور — مدیریت صندوق‌ها و موجودی — داده از PostgreSQL</div></div>' +
    '<div class="ph-actions"><button class="btn btn-solid btn-sm" id="srvAddFA" style="padding:11px 17px">'+icon('plus',15)+' '+(srvFundsTab==='funds'?'افزودن صندوق':'افزودن حساب')+'</button></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      '<button class="tab'+(srvFundsTab==='funds'?' on':'')+'" data-ft="funds">صندوق‌ها<span class="tc" id="srvFundsCnt">—</span></button>' +
      '<button class="tab'+(srvFundsTab==='accounts'?' on':'')+'" data-ft="accounts">حساب‌ها<span class="tc" id="srvAccCnt">—</span></button>' +
    '</div></div><div id="srvFundsBody" style="padding:16px 18px"><p class="hint-t">در حال دریافت…</p></div></div>';

  main.querySelectorAll('[data-ft]').forEach(b=> b.onclick=()=> renderSrvFundsPage(b.dataset.ft));
  $('#srvAddFA').onclick = ()=>{ if(srvFundsTab==='funds') srvFundForm(); else srvAccountForm(); };
  if(srvFundsTab==='funds') await srvLoadFunds();
  else await srvLoadAccounts();
}

async function srvLoadFunds(){
  const box = $('#srvFundsBody'); if(!box) return;
  box.innerHTML = '<p class="hint-t">در حال دریافت صندوق‌ها…</p>';
  try {
    const data = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/funds');
    const funds = data.funds||[];
    const cnt = $('#srvFundsCnt'); if(cnt) cnt.textContent = faDigits(funds.length);
    if(!funds.length){
      box.innerHTML = '<div class="empty" style="padding:32px;text-align:center"><div class="e-ic">'+icon('bank',28)+'</div><h3>صندوقی ثبت نشده</h3><p class="hint-t">برای شروع موجودی صندوق، ابتدا صندوق بسازید سپس حساب با موجودی اولیه بسازید.</p><button class="btn btn-solid btn-sm" id="srvEmptyFund">'+icon('plus',14)+' افزودن صندوق</button></div>';
      const b=$('#srvEmptyFund'); if(b) b.onclick=()=>srvFundForm();
      return;
    }
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام صندوق</th><th>کد</th><th>تعداد حساب</th><th>موجودی کل</th><th>وضعیت</th><th></th></tr></thead><tbody>' +
      funds.map(f=>'<tr><td><b>'+esc(f.name)+'</b><br><small class="hint-t">'+esc(f.notes||'')+'</small></td><td>'+esc(f.code||'—')+'</td><td class="c-fa-num">'+faDigits(f.accounts_count||0)+'</td><td class="c-fa-num c-strong">'+fmtM(f.total_balance||0)+'</td><td><span class="badge '+(f.status==='active'?'b-green':'b-gray')+'"><i class="bd"></i>'+(f.status==='active'?'فعال':'غیرفعال')+'</span></td><td style="text-align:left"><div class="row-actions"><button class="x-btn" data-editf="'+f.id+'">'+icon('pen',15)+'</button><button class="x-btn" data-delf="'+f.id+'">'+icon('trash',15)+'</button></div></td></tr>').join('') +
      '</tbody></table></div>';
    box.querySelectorAll('[data-editf]').forEach(b=> b.onclick=()=> srvFundForm(funds.find(x=>String(x.id)===b.dataset.editf)));
    box.querySelectorAll('[data-delf]').forEach(b=> b.onclick=async()=>{
      const ok = await askConfirm({title:'حذف صندوق', danger:true, text:'صندوق حذف شود؟ حساب‌های آن بدون صندوق می‌مانند.'});
      if(!ok) return;
      try { await srvFetch('DELETE', '/api/institutions/'+SRV.instId+'/funds/'+b.dataset.delf); toast('صندوق حذف شد.','ok'); srvLoadFunds(); } catch(e){ toast(e.message,'err'); }
    });
  } catch(e){
    box.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>';
  }
}

async function srvLoadAccounts(){
  const box = $('#srvFundsBody'); if(!box) return;
  box.innerHTML = '<p class="hint-t">در حال دریافت حساب‌ها…</p>';
  try {
    const data = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/accounts');
    const accs = data.accounts||[];
    const cnt = $('#srvAccCnt'); if(cnt) cnt.textContent = faDigits(accs.length);
    if(!accs.length){
      box.innerHTML = '<div class="empty" style="padding:32px;text-align:center"><div class="e-ic">'+icon('wallet',28)+'</div><h3>حسابی ثبت نشده</h3><p class="hint-t">موجودی صندوق را اینجا وارد کنید: حساب جدید بسازید و موجودی اولیه را بزنید.</p><button class="btn btn-solid btn-sm" id="srvEmptyAcc">'+icon('plus',14)+' افزودن حساب با موجودی</button></div>';
      const b=$('#srvEmptyAcc'); if(b) b.onclick=()=>srvAccountForm();
      return;
    }
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام حساب</th><th>شماره</th><th>صندوق</th><th>نوع</th><th>موجودی اولیه</th><th>وضعیت</th><th></th></tr></thead><tbody>' +
      accs.map(a=>'<tr><td><b>'+esc(a.name)+'</b></td><td class="c-fa-num">'+esc(a.number||'—')+'</td><td>'+esc(a.fund_name||'—')+'</td><td>'+esc(a.type||'')+'</td><td class="c-fa-num c-strong">'+fmtM(a.initial_balance||0)+'</td><td><span class="badge '+(a.status==='active'?'b-green':'b-gray')+'"><i class="bd"></i>'+(a.status==='active'?'فعال':'غیرفعال')+'</span></td><td style="text-align:left"><div class="row-actions"><button class="x-btn" data-edita="'+a.id+'">'+icon('pen',15)+'</button><button class="x-btn" data-dela="'+a.id+'">'+icon('trash',15)+'</button></div></td></tr>').join('') +
      '</tbody></table></div>';
    box.querySelectorAll('[data-edita]').forEach(b=> b.onclick=()=> srvAccountForm(accs.find(x=>String(x.id)===b.dataset.edita)));
    box.querySelectorAll('[data-dela]').forEach(b=> b.onclick=async()=>{
      const ok = await askConfirm({title:'حذف حساب', danger:true, text:'حساب حذف شود؟'});
      if(!ok) return;
      try { await srvFetch('DELETE', '/api/institutions/'+SRV.instId+'/accounts/'+b.dataset.dela); toast('حساب حذف شد.','ok'); srvLoadAccounts(); } catch(e){ toast(e.message,'err'); }
    });
  } catch(e){
    box.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>';
  }
}

function srvFundForm(f){
  const isEdit = !!f;
  openModal({
    title: isEdit ? 'ویرایش صندوق' : 'افزودن صندوق جدید',
    sub: 'حالت سرور — موجودی صندوق از مجموع حساب‌ها محاسبه می‌شود',
    size:'md',
    body:'<div class="fields">'+
      '<div class="field"><label>نام صندوق <span class="req">*</span></label><input id="sffName" value="'+esc(isEdit?f.name:'')+'" placeholder="مثلاً صندوق اصلی"><span class="err-msg"></span></div>'+
      '<div class="field"><label>کد صندوق</label><input id="sffCode" value="'+esc(isEdit?f.code||'':'')+'" placeholder="F-1001"></div>'+
      '<div class="field full"><label>توضیحات</label><textarea id="sffNotes" rows="2">'+esc(isEdit?f.notes||'':'')+'</textarea></div>'+
      '<div id="sffErr" style="display:none;color:var(--red);font-size:12px;margin-top:8px;padding:10px;background:var(--red-bg);border-radius:8px"></div>'+
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="sffSave">'+icon('check',14)+' '+(isEdit?'ذخیره':'ثبت صندوق')+'</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick=()=>h.close();
      h.el.querySelector('#sffSave').onclick=async()=>{
        const name = h.el.querySelector('#sffName').value.trim();
        const code = h.el.querySelector('#sffCode').value.trim();
        const notes = h.el.querySelector('#sffNotes').value.trim();
        const err = h.el.querySelector('#sffErr');
        if(!name){ err.style.display=''; err.textContent='نام صندوق الزامی است.'; return; }
        const btn = h.el.querySelector('#sffSave'); btn.disabled=true; btn.textContent='در حال ثبت…';
        try {
          if(isEdit) await srvFetch('PATCH', '/api/institutions/'+SRV.instId+'/funds/'+f.id, { name, code, notes });
          else await srvFetch('POST', '/api/institutions/'+SRV.instId+'/funds', { name, code, notes });
          toast(isEdit?'صندوق ویرایش شد.':'صندوق ثبت شد.','ok'); h.close(); srvLoadFunds();
        } catch(e){ err.style.display=''; err.textContent=e.message; btn.disabled=false; btn.innerHTML=icon('check',14)+' '+(isEdit?'ذخیره':'ثبت صندوق'); }
      };
    }
  });
}

async function srvAccountForm(a){
  const isEdit = !!a;
  let funds=[];
  try { const d=await srvFetch('GET','/api/institutions/'+SRV.instId+'/funds'); funds=d.funds||[]; } catch(e){}
  if(!funds.length && !isEdit){ toast('ابتدا صندوق بسازید.','warn'); srvFundForm(); return; }
  const fundOpts = funds.map(f=>'<option value="'+f.id+'"'+(isEdit&&String(a.fund_id)===String(f.id)?' selected':'')+'>'+esc(f.name)+'</option>').join('');

  openModal({
    title: isEdit ? 'ویرایش حساب' : 'افزودن حساب جدید — موجودی صندوق کجاست؟',
    sub: isEdit ? 'ویرایش موجودی اولیه' : 'موجودی صندوق را در فیلد «موجودی اولیه» وارد کنید — اینجا محل ورود موجودی است',
    size:'lg',
    body:'<div class="alert a-info" style="margin-bottom:12px"><span class="al-ic">'+icon('info',16)+'</span><div><b>موجودی صندوق کجاست؟</b> موجودی هر صندوق = مجموع موجودی اولیه حساب‌های آن. پس برای شارژ صندوق، حساب جدید با موجودی اولیه بسازید یا حساب موجود را ویرایش کنید.</div></div>'+
      '<div class="fields">'+
      '<div class="field"><label>صندوق مرتبط <span class="req">*</span></label><select id="sfaFund">'+fundOpts+'</select></div>'+
      '<div class="field"><label>نام حساب <span class="req">*</span></label><input id="sfaName" value="'+esc(isEdit?a.name:'')+'" placeholder="مثلاً حساب جاری بانک ملت"></div>'+
      '<div class="field"><label>شماره حساب</label><input id="sfaNum" value="'+esc(isEdit?a.number||'':'')+'" placeholder="603799..."></div>'+
      '<div class="field"><label>نوع حساب</label><select id="sfaType"><option value="پس‌انداز"'+(isEdit&&a.type==='پس‌انداز'?' selected':'')+'>پس‌انداز</option><option value="جاری"'+(isEdit&&a.type==='جاری'?' selected':'')+'>جاری</option><option value="قرض‌الحسنه"'+(isEdit&&a.type==='قرض‌الحسنه'?' selected':'')+'>قرض‌الحسنه</option></select></div>'+
      '<div class="field"><label>موجودی اولیه <span class="req">*</span> <small>('+CUR()+')</small></label><input id="sfaBal" class="num-inp" value="'+esc(isEdit?String(a.initial_balance||0):'')+'" placeholder="مثلاً 1000000000"><span class="help">این فیلد همان موجودی صندوق است — هر حساب موجودی دارد و جمع آن‌ها موجودی صندوق می‌شود</span><span class="err-msg"></span></div>'+
      '<div class="field"><label>وضعیت</label><select id="sfaStatus"><option value="active"'+(isEdit&&a.status==='active'?' selected':'')+'>فعال</option><option value="inactive">غیرفعال</option></select></div>'+
      '<div class="field full"><label>توضیحات</label><textarea id="sfaNotes" rows="2">'+esc(isEdit?a.notes||'':'')+'</textarea></div>'+
      '<div id="sfaErr" style="display:none;color:var(--red);font-size:12px;margin-top:8px;padding:10px;background:var(--red-bg);border-radius:8px"></div>'+
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="sfaSave">'+icon('check',14)+' '+(isEdit?'ذخیره':'ثبت حساب')+'</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick=()=>h.close();
      if(typeof attachMoney==='function') attachMoney(h.el.querySelector('#sfaBal'));
      h.el.querySelector('#sfaSave').onclick=async()=>{
        const fundId = h.el.querySelector('#sfaFund').value;
        const name = h.el.querySelector('#sfaName').value.trim();
        const num = h.el.querySelector('#sfaNum').value.trim();
        const type = h.el.querySelector('#sfaType').value;
        const bal = h.el.querySelector('#sfaBal').value.replace(/[^0-9]/g,'');
        const status = h.el.querySelector('#sfaStatus').value;
        const notes = h.el.querySelector('#sfaNotes').value.trim();
        const err = h.el.querySelector('#sfaErr');
        if(!fundId){ err.style.display=''; err.textContent='صندوق را انتخاب کنید.'; return; }
        if(!name){ err.style.display=''; err.textContent='نام حساب الزامی است.'; return; }
        if(!bal){ err.style.display=''; err.textContent='موجودی اولیه را وارد کنید — این همان موجودی صندوق است.'; return; }
        const btn = h.el.querySelector('#sfaSave'); btn.disabled=true; btn.textContent='در حال ثبت…';
        try {
          if(isEdit) await srvFetch('PATCH','/api/institutions/'+SRV.instId+'/accounts/'+a.id, { fundId:parseInt(fundId), name, number:num, type, initialBalance:bal, status, notes });
          else await srvFetch('POST','/api/institutions/'+SRV.instId+'/accounts', { fundId:parseInt(fundId), name, number:num, type, initialBalance:bal, status, notes });
          toast(isEdit?'حساب ویرایش شد.':'حساب با موجودی ثبت شد.','ok'); h.close();
          if(srvFundsTab==='accounts') srvLoadAccounts(); else srvLoadFunds();
          if(typeof renderSrvDashboard==='function' && location.hash==='#/app/dashboard') renderSrvDashboard();
        } catch(e){ err.style.display=''; err.textContent=e.message; btn.disabled=false; btn.innerHTML=icon('check',14)+' '+(isEdit?'ذخیره':'ثبت حساب'); }
      };
    }
  });
}

/* ── پرداخت وام — دکمه کار نمی‌کرد ── */

async function srvPaymentForm(loanId, installmentId){
  let loanData = null;
  try { loanData = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans/'+loanId); } catch(e){ toast(e.message,'err'); return; }
  const l = loanData.loan;
  const insAll = (loanData.installments||[]).slice().sort((a,b)=> String(a.due_date||'').localeCompare(String(b.due_date||'')));
  const pays = loanData.payments||[];
  const mVals = l.member_values||{};
  const mName = l.member_name || Object.values(mVals)[0] || ('عضو #'+l.member_id);
  const paidSum = pays.reduce((s,p)=>s+Number(p.amount||0),0);
  const planTotal = insAll.reduce((s,i)=>s+Number(i.amount||0),0);
  /* سقف واریز = ماندهٔ واقعی — هرگز بیشتر از آن پرداخت پذیرفته نمی‌شود تا بدهی منفی نشود */
  const cap = Math.max(0, planTotal - paidSum);
  if(l.status==='paid'){ toast('این وام تسویه و بسته شده؛ دیگر پرداخت روی آن ممکن نیست.','warn'); return; }
  if(cap<=0){ toast('ماندهٔ بدهی این وام صفر است — از صفحهٔ وام دکمهٔ «تسویه وام» را بزنید تا بسته شود.','warn'); return; }
  const openIns = insAll.filter(i=>i.status!=='paid');
  let pref = openIns.length ? Number(openIns[0].amount||0) : 0;
  if(installmentId){ const pi = openIns.find(x=>String(x.id)===String(installmentId)); if(pi) pref = Number(pi.amount||0); }

  openModal({
    title:'ثبت پرداخت قسط — تخصیص خودکار صفی',
    sub:'وام '+esc(mName)+' — '+fmtM(l.amount)+' — مبلغ به‌ترتیب از اولین قسط باز تخصیص می‌یابد',
    size:'lg',
    body:'<div class="m-sec t-green"><div class="m-sec-h"><span class="sn">۱</span> اطلاعات وام و عضو</div><div class="m-sec-b"><div class="kv-list">'+
      '<div class="kv"><span class="k">عضو</span><span class="v"><b>'+esc(mName)+'</b> ('+esc(l.member_no||'')+')</span></div>'+
      Object.entries(mVals).slice(0,3).map(([k,v])=>'<div class="kv"><span class="k">'+esc(v.label||k)+'</span><span class="v">'+esc(v.value||v||'—')+'</span></div>').join('')+
      '<div class="kv"><span class="k">مبلغ وام</span><span class="v">'+fmtM(l.amount)+'</span></div>'+
      '<div class="kv"><span class="k">پرداخت‌شده تا امروز</span><span class="v">'+fmtM(paidSum)+'</span></div>'+
      '<div class="kv"><span class="k">ماندهٔ قابل‌پرداخت</span><span class="v" style="color:var(--red)">'+fmtM(cap)+'</span></div>'+
    '</div></div></div>'+
    '<div class="m-sec t-amber"><div class="m-sec-h"><span class="sn">۲</span> مبلغ و تاریخ پرداخت شمسی</div><div class="m-sec-b"><div class="fields">'+
      '<div class="field"><label>مبلغ پرداخت <span class="req">*</span> <small>('+CUR()+')</small></label><input id="spfAmt" class="num-inp" placeholder="مثلاً ۵٬۰۰۰٬۰۰۰"><span class="err-msg"></span><span class="help" id="spfRemain">سقف واریز: '+fmtN(cap)+' '+CUR()+'</span></div>'+
      '<div class="field"><label>تاریخ پرداخت شمسی <span class="req">*</span></label><input id="spfDate" placeholder="1403/02/15"><span class="help">از تقویم شمسی انتخاب کنید</span><span class="err-msg"></span></div>'+
      '<div class="field"><label>نوع پرداخت</label><select id="spfType"><option value="installment">قسط</option><option value="fee">کارمزد</option><option value="other">سایر</option></select></div>'+
      '<div class="field full"><div id="spfQueue" class="pq-box"></div></div>'+
      '<div id="spfErr" style="display:none;color:var(--red);font-size:12px;margin-top:8px;padding:10px;background:var(--red-bg);border-radius:8px"></div>'+
    '</div></div></div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="spfSave">'+icon('check',14)+' ثبت پرداخت</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick=()=>h.close();
      const amtEl = h.el.querySelector('#spfAmt');
      if(typeof attachMoney==='function') attachMoney(amtEl);
      if(typeof setMoney==='function') setMoney(amtEl, pref); else amtEl.value = pref;
      const dEl = h.el.querySelector('#spfDate');
      if(typeof attachJDate==='function' && dEl){ attachJDate(dEl); if(typeof setJd==='function') setJd(dEl, J.todayIso()); }
      const num = v => parseInt(String(v||'').replace(/[^0-9]/g,''))||0;
      /* پیش‌نمایش زندهٔ صف روی اقساط باز */
      function renderQueue(){
        const box = h.el.querySelector('#spfQueue'); if(!box) return;
        const amt = num(amtEl.value);
        let left = Math.min(amt, cap), rows = '';
        openIns.forEach(i => {
          const need = Number(i.amount||0);
          const take = Math.max(0, Math.min(need, left)); if(take>0) left -= take;
          const st = take<=0 ? 'wait' : (take>=need ? 'full' : 'part');
          rows += '<div class="pq-row '+st+'"><span class="pq-n">'+icon('calendar',13)+' سررسید '+J.fmt(i.due_date)+'</span><span class="pq-m">'+fmtN(need)+'</span><span class="pq-tick">'+(st==='full'?icon('check',13)+' کامل می‌شود':st==='part'?'جزئی — '+fmtN(take):'در انتظار')+'</span></div>';
        });
        box.innerHTML = '<div class="pq-head"><b>تخصیص خودکار مبلغ — صف اقساط</b><span class="pq-rem">مانده پس از این پرداخت: <b>'+fmtN(Math.max(0, cap-Math.min(amt,cap)))+'</b> '+CUR()+'</span></div>'+
          (rows||'<div class="pq-empty">قسط بازی وجود ندارد.</div>')+
          (amt>cap ? '<div class="pq-over">'+icon('warn',15)+' مبلغ بیشتر از مانده است؛ سقف واریز <b>'+fmtN(cap)+' '+CUR()+'</b></div>':'');
      }
      amtEl.addEventListener('input', renderQueue);
      renderQueue();

      h.el.querySelector('#spfSave').onclick=async()=>{
        const amt = num(amtEl.value);
        const type = h.el.querySelector('#spfType').value;
        const dateIso = dEl ? (dEl.dataset.iso || (typeof jdVal==='function'?jdVal(dEl):'')) : J.todayIso();
        const err = h.el.querySelector('#spfErr');
        const bad = m => { err.style.display=''; err.textContent=m; };
        if(!amt){ bad('مبلغ را وارد کنید.'); return; }
        if(amt > cap){ bad('بیشتر از ماندهٔ وام نمی‌توانی واریز کنی — سقف '+fmtN(cap)+' '+CUR()+' است.'); return; }
        err.style.display='none';
        const btn = h.el.querySelector('#spfSave'); btn.disabled=true; btn.textContent='در حال ثبت…';
        try {
          const resp = await srvFetch('POST','/api/institutions/'+SRV.instId+'/payments', { loanId:parseInt(loanId), amount:amt, type });
          const covered = (resp && resp.covered) || [];
          const settled = !!(resp && resp.settled);
          const remainAfter = resp && (resp.remaining!==undefined) ? Number(resp.remaining) : Math.max(0, cap-amt);
          toast(settled ? 'پرداخت ثبت شد؛ ماندهٔ بدهی صفر شد — برای بستن وام، دکمهٔ «تسویه وام» را در صفحهٔ وام بزنید.' : 'پرداخت ثبت شد — '+faDigits(covered.length)+' قسط در صف پوشش داده شد.','ok');
          const done = ()=>{ h.close();
            payReceipt({ title: settled ? 'ماندهٔ بدهی صفر شد — آمادهٔ تسویه 🎉' : 'رسید پرداخت',
              sub: mName+' · '+fmtM(amt)+' · '+J.fmt(dateIso||J.todayIso()),
              alloc: covered.map(cc=>({no:('سررسید '+J.fmt(cc.due||'')), take:cc.take, full:cc.full})),
              amt, remainAfter, settled });
            if(typeof srvLoanDetail==='function') srvLoanDetail(loanId); };
          if(typeof stampFx==='function') stampFx({ text: 'پرداخت شد', sub:fmtM(amt)+' — '+J.fmtLong(dateIso||J.todayIso()), color:'#1C6E31', hold:1100, onDone:done });
          else done();
        } catch(e){ bad(e.message); btn.disabled=false; btn.innerHTML=icon('check',14)+' ثبت پرداخت'; }
      };
    }
  });
}

/* ── گزارش‌ها و تراکنش‌ها — حالت سرور — وصل به DB ── */
let srvTxnsState = { page:1, type:'all', accountId:'all' };
/* ════════════════════════════════════════════════════════
   گزارش‌ها — حالت سرور، عین قالب تب گزارش‌های دمو:
   چیپ گزارش‌ها + فیلترها + جدول + جمع ستون‌ها + چاپ + CSV — داده زنده از PostgreSQL
   ════════════════════════════════════════════════════════ */
const srvRepState = { rep:'members', f:{} };
let srvRepData = null; /* کش دادهٔ یک بازهٔ نمایش */

async function srvFetchReportData(){
  const [mData, lData, iData, pData, tData, fData, aData] = await Promise.all([
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/members?page=1&pageSize=200'),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/loans?page=1&pageSize=200'),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/installments?page=1&pageSize=1000').catch(()=>({rows:[]})),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/payments?page=1&pageSize=1000').catch(()=>({payments:[]})),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/txns?page=1&pageSize=200'),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/funds').catch(()=>({funds:[]})),
    srvFetch('GET', '/api/institutions/'+SRV.instId+'/accounts').catch(()=>({accounts:[]})),
  ]);
  let fields = []; try { fields = await srvLoadFieldsCached(); } catch(e){}
  const members = (mData.rows||[]).map(m=>{
    const vals = m.values||{}; const first = Object.values(vals)[0];
    const name = first || m.member_no || ('عضو #'+m.id);
    const fld = k => { const f = (fields||[]).find(x => x.label===k || (x.key||'')===k); return f&&vals[f.key] ? vals[f.key] : ''; };
    const nid = fld('کد ملی') || fld('کدملی') || fld('nid');
    const mobile = fld('موبایل') || fld('موبایل/تماس') || fld('شماره تماس') || fld('نام تماس') || '';
    return { id:m.id, member_no:m.member_no, status:m.status, created_at:m.created_at, name, nid:nid||'', mobile:mobile||'', vals };
  });
  const loans = lData.rows||[];
  const installments = iData.rows||[];
  const payments = (pData.payments||[]).map(p=>({...p}));
  const txns = tData.rows||[];
  const funds = fData.funds||[];
  const accounts = aData.accounts||[];
  const fundName = id => { const f2 = funds.find(x=>String(x.id)===String(id)); return f2?f2.name:'—'; };
  const accName = id => { const a = accounts.find(x=>String(x.id)===String(id)); return a?a.name:'—'; };
  /* ماندهٔ هر وام = مبلغ وام − مجموع پرداخت‌های آن (plan≈amount برای اقساط استاندارد) */
  const paySumByLoan = {}; payments.forEach(p=>{ paySumByLoan[p.loan_id] = (paySumByLoan[p.loan_id]||0) + Number(p.amount||0); });
  const odInsByMember = {};
  installments.forEach(i=>{ if(i.eff_status==='overdue'){ odInsByMember[i.member_id]=(odInsByMember[i.member_id]||0)+1; } });
  return { members, loans, installments, payments, txns, funds, accounts, fundName, accName, paySumByLoan, odInsByMember };
}

function srvReportDefs(D){
  return [
    { id:'members', title:'گزارش اعضا', ic:'users',
      filters:[{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['active','فعال'],['inactive','غیرفعال']]},{k:'from',t:'date',l:'عضویت از'},{k:'to',t:'date',l:'تا'}],
      cols:['نام','کد ملی','موبایل','شماره عضویت','وضعیت','تاریخ عضویت'],
      rows(f){ return D.members
        .filter(m=>f.status==='all'||m.status===f.status)
        .filter(m=>!f.from||(m.created_at||'').slice(0,10)>=f.from)
        .filter(m=>!f.to||(m.created_at||'').slice(0,10)<=f.to)
        .map(m=>[m.name, m.nid||'—', m.mobile||'—', m.member_no||'', m.status==='active'?'فعال':'غیرفعال', J.fmt(m.created_at||'')]); } },
    { id:'loans', title:'گزارش وام‌ها', ic:'loan',
      filters:[{k:'fund',t:'select',l:'صندوق',o:[['all','همه']].concat(D.funds.map(x=>[String(x.id),x.name]))},{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['active','فعال'],['paid','تسویه‌شده'],['cancelled','لغوشده']]}],
      cols:['عضو','صندوق','مبلغ وام','اقساط','پرداخت‌شده','مانده','وضعیت','تاریخ ثبت'],
      rows(f){ return D.loans
        .filter(l=>f.fund==='all'||String(l.fund_id)===String(f.fund))
        .filter(l=>f.status==='all'||l.status===f.status)
        .map(l=>{ const paid = D.paySumByLoan[l.id]||0;
          return [l.member_name||'', D.fundName(l.fund_id), String(l.amount), String(l.installments_count), String(paid), String(Math.max(0, Number(l.amount)-paid)), faLoanStatus(l.status), J.fmt(l.created_at||'')]; }); } },
    { id:'installments', title:'گزارش اقساط', ic:'calendar',
      filters:[{k:'status',t:'select',l:'وضعیت',o:[['all','همه'],['overdue','سررسید گذشته'],['dueSoon','نزدیک سررسید'],['pending','در انتظار'],['paid','پرداخت‌شده']]},{k:'from',t:'date',l:'سررسید از'},{k:'to',t:'date',l:'تا'}],
      cols:['عضو','وام','قسط','سررسید','مبلغ','پرداخت‌شده','مانده','وضعیت'],
      rows(f){ return D.installments
        .filter(i=>f.status==='all'||i.eff_status===f.status)
        .filter(i=>!f.from||i.due_date>=f.from)
        .filter(i=>!f.to||i.due_date<=f.to)
        .map(i=>{ const paid = i.status==='paid' ? Number(i.amount) : 0;
          return [i.member_name||'', String(i.loan_amount), String(i.no), J.fmt(i.due_date), String(i.amount), String(paid), String(Number(i.amount)-paid), INS_FA[i.eff_status]||'' ]; }); } },
    { id:'payments', title:'گزارش پرداخت‌ها', ic:'coins',
      filters:[{k:'from',t:'date',l:'از تاریخ'},{k:'to',t:'date',l:'تا'},{k:'type',t:'select',l:'نوع',o:[['all','همه'],['installment','اقساط'],['fee','کارمزد'],['other','سایر']]}],
      cols:['تاریخ','عضو','قسط','مبلغ','وام'],
      rows(f){ return D.payments
        .filter(p=>!f.from||(p.created_at||'').slice(0,10)>=f.from)
        .filter(p=>!f.to||(p.created_at||'').slice(0,10)<=f.to)
        .filter(p=>f.type==='all'||p.type===f.type)
        .map(p=>[J.fmt(p.created_at||''), p.member_name||'', p.ins_no ? 'قسط '+faDigits(p.ins_no) : '—', String(p.amount), String(p.loan_amount||0)]); } },
    { id:'txns', title:'گزارش تراکنش‌ها', ic:'swap',
      filters:[{k:'acc',t:'select',l:'حساب',o:[['all','همه']].concat(D.accounts.map(a=>[String(a.id),a.name]))},{k:'type',t:'select',l:'نوع',o:[['all','همه'],['deposit','واریز'],['withdraw','برداشت'],['loan_out','پرداخت وام'],['repayment','بازپرداخت']]},{k:'from',t:'date',l:'از'},{k:'to',t:'date',l:'تا'}],
      cols:['تاریخ','حساب','نوع','مبلغ','توضیحات'],
      rows(f){ return D.txns
        .filter(x=>f.acc==='all'||String(x.account_id)===String(f.acc))
        .filter(x=>f.type==='all'||x.type===f.type)
        .filter(x=>!f.from||(x.created_at||'').slice(0,10)>=f.from)
        .filter(x=>!f.to||(x.created_at||'').slice(0,10)<=f.to)
        .map(x=>[J.fmt(x.created_at||'')+' '+faTime(x.created_at||''), x.account_name||D.accName(x.account_id), faTxnType(x.type), String(x.amount), x.description||'—']); } },
    { id:'balances', title:'مانده صندوق‌ها و حساب‌ها', ic:'bank', filters:[],
      cols:['صندوق','حساب','شماره','نوع','موجودی','وضعیت'],
      rows(){ return D.accounts.map(a=>[a.fund_name||D.fundName(a.fund_id), a.name, a.number||'—', a.type||'', String(a.initial_balance||0), a.status==='active'?'فعال':'غیرفعال']); } },
    { id:'debtors', title:'گزارش بدهکاران', ic:'warn',
      filters:[{k:'min',t:'money',l:'حداقل بدهی ('+CUR()+')'}],
      cols:['عضو','شماره عضویت','وام‌های فعال','اقساط معوق','بدهی جاری'],
      rows(f){ return D.members.map(m=>{
          const lns = D.loans.filter(l=>String(l.member_id)===String(m.id) && l.status==='active');
          const debt = lns.reduce((s3,l)=> s3 + Math.max(0, Number(l.amount)-(D.paySumByLoan[l.id]||0)), 0);
          return { name:m.name, no:m.member_no, loans:lns.length, od:D.odInsByMember[m.id]||0, debt }; })
        .filter(r=>r.debt>0 && (!f.min || r.debt>=f.min))
        .sort((a,b)=>b.debt-a.debt)
        .map(r=>[r.name, r.no||'', String(r.loans), String(r.od), String(r.debt)]); } }
  ];
}

function srvRepFilterSummary(def){
  return def.filters.map(fl => { const v = srvRepState.f[fl.k]; if(v==null||v===''||v==='all') return '';
    const val = fl.t==='date' ? J.fmt(v) : fl.t==='money' ? fmtM(v) : ((fl.o||[]).find(o=>String(o[0])===String(v))||['',v])[1];
    return fl.l+': '+val; }).filter(Boolean).join(' · ');
}

function srvRenderReportBody(def, D){
  const box = $('#srvRepFilters');
  const f = srvRepState.f;
  box.innerHTML = def.filters.map(fl => {
    if(fl.t==='select') return '<span class="t-lbl">'+fl.l+':</span><select class="t-select" data-fk="'+fl.k+'">'+fl.o.map(o=>'<option value="'+o[0]+'"'+((f[fl.k]!==undefined?f[fl.k]:fl.o[0][0])==o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
    if(fl.t==='date') return '<span class="t-lbl">'+fl.l+':</span><span class="t-jd"><input data-fk="'+fl.k+'"></span>';
    if(fl.t==='money') return '<span class="t-lbl">'+fl.l+':</span><input class="t-money" data-fk="'+fl.k+'" placeholder="0">';
    return '';
  }).join('') + (def.filters.length ? '' : '<span class="t-lbl">این گزارش فیلتری ندارد.</span>');
  box.querySelectorAll('[data-fk]').forEach(el => {
    if(el.tagName === 'SELECT') el.addEventListener('change', ()=>{ f[el.dataset.fk] = String(el.value); srvRenderReportBody(def, D); });
    else if(el.classList.contains('t-money')){ attachMoney(el); el.addEventListener('input', ()=>{ f[el.dataset.fk] = moneyVal(el); srvRenderReportBody(def, D); }); }
    else { attachJDate(el); el.addEventListener('change', ()=>{ f[el.dataset.fk] = jdVal(el); srvRenderReportBody(def, D); }); }
  });
  def.filters.forEach(fl => {
    const inp = box.querySelector('[data-fk="'+fl.k+'"]');
    if(!inp) return;
    if(fl.t==='date' && f[fl.k] && typeof setJd==='function') setJd(inp, f[fl.k]);
    if(fl.t==='money' && f[fl.k] && typeof setMoney==='function') setMoney(inp, f[fl.k]);
  });
  def.filters.forEach(fl => { if(f[fl.k]===undefined) f[fl.k] = (fl.o && fl.o[0]) ? fl.o[0][0] : ''; });

  const rows = def.rows(f);
  const title = $('#srvRepTitle'); if(title) title.innerHTML = def.title + ' <span class="hint-t">('+faDigits(rows.length)+' رکورد)</span>';
  const moneyCols = def.cols.map(c=>/مبلغ|مانده|بدهی|موجودی|پرداخت/.test(c));
  const body = $('#srvRepBody');
  if(!rows.length){ body.innerHTML = emptyState({icon:'chart', title:'نتیجه‌ای پیدا نشد', desc:'فیلترها را تغییر دهید.'}); return; }
  const shown = rows.slice(0,150);
  body.innerHTML = '<div class="tbl-wrap"><table class="tbl" id="srvRepTbl"><thead><tr>'+def.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr></thead><tbody>' +
    shown.map(r => '<tr>'+r.map((cell,ci)=>{
      const isMoney = moneyCols[ci] && /^\d+$/.test(String(cell));
      return '<td class="'+(isMoney?'c-fa-num':'')+'">'+(isMoney?fmtN(+cell):esc(String(cell==null?'':cell)))+(isMoney?' <small style="color:var(--ink-2)">'+CUR()+'</small>':'')+'</td>';
    }).join('')+'</tr>').join('') + '</tbody></table></div>' +
    (rows.length>150 ? '<div class="tbl-foot"><span class="tf-info">'+faDigits(150)+' ردیف از '+faDigits(rows.length)+' نمایش داده شد؛ برای همه موارد خروجی CSV بگیرید.</span></div>' : '');
  const sums = def.cols.map((c,ci)=> moneyCols[ci] ? rows.reduce((s2,r)=> s2 + (/^\d+$/.test(String(r[ci])) ? +r[ci] : 0), 0) : null);
  const anySum = sums.some(x=>x!=null&&x>0);
  if(anySum){
    body.querySelector('#srvRepTbl').insertAdjacentHTML('beforeend','<tfoot><tr>'+def.cols.map((c,ci)=>'<th>'+(sums[ci]?fmtN(sums[ci])+' '+CUR():'')+'</th>').join('')+'</tr></tfoot>');
  }
}

/* CSV — ساختار دقیقاً مثل خروجی دمو: ستون‌ها + سطرها (با BOM فارسی) */
function srvExportCsv(def, D){
  const rows = def.rows(srvRepState.f);
  const fs = srvRepFilterSummary(def);
  const lines = srvAnalyticsCsvLines();
  lines.push('== '+esc(SRV.instName||'مؤسسه')+' — '+def.title+(fs ? ' — فیلترها: '+fs : '')+' ==');
  lines.push(def.cols.join(','));
  lines.push(rows.map(r => r.map(c => { const s2 = String(c==null?'':c).replace(/"/g,'""'); return /["\,\n]/.test(s2) ? '"'+s2+'"' : s2; }).join(',')).join('\r\n'));
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hesabat-' + def.id + '-' + J.todayIso() + '.csv';
  a.click(); if(URL.revokeObjectURL) setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  if(typeof toast==='function') toast('فایل CSV با '+faDigits(rows.length)+' رکورد دانلود شد.','ok');
}

/* چاپ — قالب printRoot ای دمو با سرستون مؤسسه و جدول */
function srvPrintReport(def, D){
  const rows = def.rows(srvRepState.f);
  const fs = srvRepFilterSummary(def);
  const root = $('#printRoot'); if(!root) return;
  root.innerHTML =
    '<div class="pr-head"><h1>'+esc(SRV.instName||'مؤسسه')+' — '+esc(def.title)+'</h1>' +
    '<p>تاریخ تهیه: '+J.fmtLong(J.todayIso())+' · تهیه‌کننده: '+esc((SESSION&&SESSION.name)||'مدیر')+'</p></div>' +
    (fs ? '<div class="pr-filters">فیلترها: '+esc(fs)+'</div>' : '') +
    srvRepAnalyticsPrintHtml() +
    '<h2 class="pr-h2">'+esc(def.title)+' ('+faDigits(rows.length)+' رکورد)</h2>' +
    '<table><thead><tr>'+def.cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>' +
    rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(String(c==null?'':c))+'</td>').join('')+'</tr>').join('') + '</tbody></table>' +
    '<div class="pr-sum">تعداد رکوردها: '+faDigits(rows.length)+'</div>';
  document.body.classList.add('printing');
  const done = ()=>{ document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(()=>window.print(), 60);
  setTimeout(done, 3000);
}


/* ═══ تحلیل‌های گزارش سرور — کپی دقیق تب «نمودارها و تحلیل‌ها» دمو ولی دادهٔ زنده از DB ═══ */
let srvRepPage = 0;          /* ۰ = جدیدترین پنجرهٔ ۱۲ماهه؛ افزایش = قدیمی‌تر */
let srvRepMonthly = null;    /* آخرین پاسخ GET /reports/summary */
const SRV_REP_WIN = 12;

function srvRepMonthFmt(m){ return { name: J.MONTHS[m.jm-1], year: faDigits(m.jy), full: J.MONTHS[m.jm-1]+' '+faDigits(m.jy) }; }
function srvRepWinTitle(M){
  if(!M || !M.wm.length) return '';
  const a = srvRepMonthFmt(M.wm[0]), b = srvRepMonthFmt(M.wm[M.wm.length-1]);
  return (M.wm.length===1) ? a.full : (a.full+' تا '+b.full);
}

async function srvLoadSrvAnalytics(){
  const box = $('#srvRepAnalytics');
  if(!box) return;
  box.innerHTML = '<div class="card tight"><div class="card-b" style="padding:20px"><p class="hint-t">در حال دریافت تحلیل‌ها از دیتابیس…</p></div></div>';
  try {
    const M = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/reports/summary?page='+srvRepPage);
    M.page = Math.min(M.page, M.maxPage); srvRepPage = M.page;
    srvRepMonthly = M;
    srvRenderSrvAnalytics(M);
  } catch(e){
    box.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>خطا در دریافت تحلیل‌ها: '+esc(e.message)+'</div></div>';
  }
}

function srvRenderSrvAnalytics(M){
  const box = $('#srvRepAnalytics');
  const K = M.kpis;
  const cntFmt = u => v => fmtN(v) + ' ' + u;
  const stat = (cls, ic, label, val, sub) =>
    '<div class="stat '+cls+'"><div class="stat-top"><span class="s-ic">'+icon(ic,16)+'</span>'+label+'</div>' +
    '<div class="stat-val">'+val+'</div>'+(sub?'<div class="stat-sub">'+sub+'</div>':'')+'</div>';
  const winTitle = srvRepWinTitle(M);

  box.innerHTML =
    '<div class="grid g-3" style="margin-bottom:14px">' +
      stat('','users','اعضای مؤسسه', fmtN(K.members), 'مجموع از تأسیس') +
      stat('s-teal','loan','وام‌های ثبت‌شده', fmtN(K.loans), 'به ارزش '+fmtMShort(K.loansAmt)+' '+CUR()) +
      stat('s-lime','coins','مجموع دریافتی اقساط', fmtMShort(K.paySum)+' <small>'+CUR()+'</small>', faDigits(K.paysCnt)+' پرداخت در بازه') +
      stat('','download','مجموع واریزی‌ها', fmtMShort(K.depSum)+' <small>'+CUR()+'</small>', 'به حساب‌ها در بازه') +
      stat('s-amber','upload','مجموع برداشت‌ها', fmtMShort(K.wdSum)+' <small>'+CUR()+'</small>', 'شامل پرداخت اصل وام‌ها') +
      stat((K.odNow?'s-red':'s-lime'),'bank','موجودی فعلی صندوق‌ها', fmtMShort(K.curBal)+' <small>'+CUR()+'</small>', (K.odNow?faDigits(K.odNow)+' قسط معوق فعال':'بدون قسط معوق')) +
    '</div>' +

    (M.hasPager ?
      '<div class="ch-pager">' +
        '<button type="button" class="chp-btn" data-srvchp="older"'+(M.page>=M.maxPage?' disabled':'')+'>'+icon('chevE',15)+'ماه‌های قدیمی‌تر</button>' +
        '<span class="chp-range">'+icon('calendar',14)+winTitle+'<i>ماه '+faDigits(M.winStart+1)+' تا '+faDigits(M.winEnd)+' از '+faDigits(M.totalMonths)+'</i></span>' +
        '<button type="button" class="chp-btn" data-srvchp="newer"'+(M.page===0?' disabled':'')+'>'+icon('chevS',15)+'ماه‌های جدیدتر</button>' +
      '</div>' :
      '<div class="ch-pager chp-only"><span class="chp-range">'+icon('calendar',14)+winTitle+'<i>'+faDigits(M.totalMonths)+' ماه</i></span></div>') +

    '<div class="grid g-2" style="margin-bottom:14px">' +
      '<div class="card"><div class="card-h"><h3>روند موجودی کل مؤسسه</h3><span class="hint-t">تجمیعی: موجودی اولیه + واریزی‌ها − برداشت‌ها</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chSrvBalance"></canvas></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>گردش مالی ماهانه</h3><span class="hint-t">واریزی و برداشت به تفکیک ماه</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chSrvFlowR"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>واریزی</span><span class="lg-i"><i style="background:#D98A1B"></i>برداشت</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>رشد اعضا و وام‌ها</h3><span class="hint-t">تعداد تجمیعی از تأسیس</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chSrvGrowth"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>اعضا</span><span class="lg-i"><i style="background:#D98A1B"></i>وام‌ها</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>عملکرد اقساط</h3><span class="hint-t">سررسید و پرداخت ماهانه (تعداد قسط)</span></div><div class="card-b">' +
        '<div class="chart-box" style="height:250px"><canvas id="chSrvInsPerf"></canvas></div>' +
        '<div class="legend"><span class="lg-i"><i style="background:#1C6E31"></i>پرداخت‌شده</span><span class="lg-i"><i style="background:#E4B54A"></i>سررسیدشده</span><span class="lg-i"><i style="background:#B3362B"></i>معوق (وضعیت فعلی)</span></div></div></div>' +
    '</div>';

  box.querySelectorAll('[data-srvchp]').forEach(b => b.onclick = ()=>{
    srvRepPage += (b.dataset.srvchp==='older' ? 1 : -1);
    srvLoadSrvAnalytics();
  });

  const fmts = M.wm.map(srvRepMonthFmt);
  const nameL = fmts.map(f=>f.name), yearL = fmts.map(f=>f.year), fullL = fmts.map(f=>f.full);
  const cOpts = { subLabels: yearL, fullLabels: fullL };
  drawLines($('#chSrvBalance'), nameL,
    [{name:'موجودی کل', color:'#1C6E31', values:M.balWin, fmt:v=>fmtM(v)}], Object.assign({area:true}, cOpts));
  drawBars($('#chSrvFlowR'), nameL,
    [{name:'واریزی', color:'#1C6E31', values:M.depWin},
     {name:'برداشت', color:'#D98A1B', values:M.wdWin}], cOpts);
  drawLines($('#chSrvGrowth'), nameL,
    [{name:'اعضا', color:'#1C6E31', values:M.memWin, fmt:cntFmt('نفر')},
     {name:'وام‌ها', color:'#D98A1B', values:M.loanWin, fmt:cntFmt('وام')}], cOpts);
  drawBars($('#chSrvInsPerf'), nameL,
    [{name:'پرداخت‌شده', color:'#1C6E31', values:M.paidWin, fmt:cntFmt('قسط')},
     {name:'سررسیدشده', color:'#E4B54A', values:M.dueWin, fmt:cntFmt('قسط')},
     {name:'معوق', color:'#B3362B', values:M.odWin, fmt:cntFmt('قسط')}], cOpts);
}

/* خطوط CSV تحلیل‌ها — شاخص‌ها + دادهٔ ماهانهٔ نمودارها (کپی analyticsCsvLines دمو) */
function srvAnalyticsCsvLines(){
  const M = srvRepMonthly;
  if(!M) return [];
  const K = M.kpis;
  const L = [];
  L.push('== شاخص‌های کلیدی — از تأسیس مؤسسه تاکنون ==');
  L.push('شاخص,مقدار');
  L.push('اعضای مؤسسه,'+K.members);
  L.push('وام‌های ثبت‌شده,'+K.loans);
  L.push('ارزش کل وام‌ها,'+K.loansAmt);
  L.push('مجموع دریافتی اقساط,'+K.paySum);
  L.push('تعداد پرداخت‌ها,'+K.paysCnt);
  L.push('مجموع واریزی‌ها,'+K.depSum);
  L.push('مجموع برداشت‌ها,'+K.wdSum);
  L.push('موجودی فعلی صندوق‌ها,'+K.curBal);
  L.push('اقساط معوق فعال,'+K.odNow);
  L.push('');
  L.push('== داده ماهانه نمودارها — '+srvRepWinTitle(M)+' ==');
  L.push('ماه,واریزی,برداشت,موجودی تجمیعی,اعضای تجمیعی,وام‌های تجمیعی,اقساط پرداخت‌شده,اقساط سررسیدشده,اقساط معوق');
  M.wm.forEach((m,i)=>{
    L.push([srvRepMonthFmt(m).full, M.depWin[i], M.wdWin[i], M.balWin[i], M.memWin[i], M.loanWin[i], M.paidWin[i], M.dueWin[i], M.odWin[i]].join(','));
  });
  L.push('');
  return L;
}

/* HTML چاپ تحلیل‌ها — شاخص‌ها + تصویر چهار نمودار + جدول ماهانه (کپی printReport دمو) */
function srvRepAnalyticsPrintHtml(){
  const M = srvRepMonthly;
  if(!M) return '';
  const K = M.kpis;
  const kpiPairs = [
    ['اعضای مؤسسه', fmtN(K.members)], ['وام‌های ثبت‌شده', fmtN(K.loans)+' (به ارزش '+fmtM(K.loansAmt)+' '+CUR()+')'],
    ['مجموع دریافتی اقساط', fmtM(K.paySum)+' '+CUR()+' ('+faDigits(K.paysCnt)+' پرداخت)'], ['مجموع واریزی‌ها', fmtM(K.depSum)+' '+CUR()],
    ['مجموع برداشت‌ها', fmtM(K.wdSum)+' '+CUR()], ['موجودی فعلی صندوق‌ها', fmtM(K.curBal)+' '+CUR()+' ('+faDigits(K.odNow)+' قسط معوق)']
  ];
  const chartImgs = [];
  [['chSrvBalance','روند موجودی کل مؤسسه'],['chSrvFlowR','گردش مالی ماهانه'],['chSrvGrowth','رشد اعضا و وام‌ها'],['chSrvInsPerf','عملکرد اقساط']].forEach(c=>{
    try{ const cv = document.getElementById(c[0]); if(cv && cv.width > 0 && cv.toDataURL) chartImgs.push([c[1], cv.toDataURL('image/png')]); }catch(e){}
  });
  return '<h2 class="pr-h2">شاخص‌های کلیدی — از تأسیس مؤسسه تاکنون</h2>' +
    '<table class="pr-kpis"><tbody><tr>'+kpiPairs.map(p=>'<td><b>'+esc(p[0])+':</b> '+esc(p[1])+'</td>').join('')+'</tr></tbody></table>' +
    (chartImgs.length ? '<h2 class="pr-h2">نمودارها — '+esc(srvRepWinTitle(M))+'</h2><div class="pr-charts">' +
      chartImgs.map(c=>'<figure><img src="'+c[1]+'" alt="'+esc(c[0])+'"><figcaption>'+esc(c[0])+'</figcaption></figure>').join('') + '</div>' : '') +
    '<h2 class="pr-h2">داده ماهانه نمودارها</h2>' +
    '<table><thead><tr><th>ماه</th><th>واریزی</th><th>برداشت</th><th>موجودی تجمیعی</th><th>اعضای تجمیعی</th><th>وام‌های تجمیعی</th><th>پرداخت‌شده</th><th>سررسیدشده</th><th>معوق</th></tr></thead><tbody>' +
      M.wm.map((m,i)=>'<tr><td>'+esc(srvRepMonthFmt(m).full)+'</td><td>'+fmtN(M.depWin[i])+'</td><td>'+fmtN(M.wdWin[i])+'</td><td>'+fmtN(M.balWin[i])+'</td><td>'+faDigits(M.memWin[i])+'</td><td>'+faDigits(M.loanWin[i])+'</td><td>'+faDigits(M.paidWin[i])+'</td><td>'+faDigits(M.dueWin[i])+'</td><td>'+faDigits(M.odWin[i])+'</td></tr>').join('') +
    '</tbody></table>';
}

async function renderSrvReportsPage(){
  const main = $('#main');
  const defs0 = srvReportDefs({members:[],loans:[],installments:[],payments:[],txns:[],funds:[],accounts:[],fundName:()=>'—',accName:()=>'—',paySumByLoan:{},odInsByMember:{}});
  const cur0 = defs0.find(d=>d.id===srvRepState.rep) || defs0[0];
  main.innerHTML =
    '<div class="page-head"><div><h1>گزارش‌ها</h1><div class="ph-sub">شاخص‌ها و نمودارهای ماهانه با پیمایش تاریخ + گزارش‌های تفصیلی با فیلتر، چاپ و خروجی CSV — داده زنده از PostgreSQL</div></div><div class="ph-actions" id="srvRepActions">' +
      '<button class="btn btn-ghost btn-sm" id="srvRepPrint" style="padding:11px 17px;font-size:.88rem" disabled>'+icon('print',14)+' چاپ</button>' +
      '<button class="btn btn-soft btn-sm" id="srvRepCsv" style="padding:11px 17px;font-size:.88rem" disabled>'+icon('download',14)+' خروجی CSV</button></div></div>' +
    '<div id="srvRepAnalytics" style="margin-top:14px"></div>' +
    '<div class="card tight" style="margin-top:14px"><div class="card-h"><h3>'+icon('chart',16)+' گزارش‌های تفصیلی</h3><span class="hint-t">انتخاب گزارش، اعمال فیلتر، چاپ و خروجی CSV</span></div><div class="card-b">' +
      '<div class="chips" style="margin-bottom:14px">' + defs0.map(d=>'<button class="chip'+(d.id===cur0.id?' on':'')+'" data-srep="'+d.id+'">'+icon(d.ic,15)+' '+d.title+'</button>').join('') + '</div>' +
      '<div class="toolbar" id="srvRepFilters"><span class="hint-t">در حال بارگذاری داده‌ها…</span></div>' +
      '<div class="card tight"><div class="card-h"><h3 id="srvRepTitle"></h3></div><div class="card-b" id="srvRepBody"><p class="hint-t">در حال خارج از دیتابیس…</p></div></div>' +
    '</div></div>';
  main.querySelectorAll('[data-srep]').forEach(b => b.onclick = ()=>{ srvRepState.rep = b.dataset.srep; srvRepState.f = {}; renderSrvReportsPage(); });
  let D;
  try { D = await srvFetchReportData(); srvRepData = D; }
  catch(e){
    $('#srvRepBody').innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>';
    return;
  }
  const defs = srvReportDefs(D);
  const cur = defs.find(d=>d.id===srvRepState.rep) || defs[0];
  const pb = $('#srvRepPrint'), cb = $('#srvRepCsv');
  if(pb){ pb.disabled = false; pb.onclick = ()=> srvPrintReport(cur, D); }
  if(cb){ cb.disabled = false; cb.onclick = ()=> srvExportCsv(cur, D); }
  srvRenderReportBody(cur, D);
  srvLoadSrvAnalytics();
}

async function renderSrvTxnsPage(){
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>تراکنش‌ها</h1><div class="ph-sub">حالت سرور — تمام تراکنش‌ها از PostgreSQL — تاریخ شمسی کامل با نام ماه</div></div><div class="ph-actions"><button class="btn btn-solid btn-sm" id="srvAddTxn">'+icon('plus',15)+' ثبت تراکنش</button></div></div>' +
    '<div class="toolbar"><div class="t-search">'+icon('search',15)+'<input id="srvTxnQ" placeholder="جستجو توضیحات..."></div>' +
    '<select class="t-select" id="srvTxnType"><option value="all">همه انواع</option><option value="deposit">واریز</option><option value="withdraw">برداشت</option><option value="loan_out">پرداخت وام</option><option value="repayment">بازپرداخت</option></select>' +
    '<button class="btn btn-ghost btn-sm" id="srvTxnReset">'+icon('refresh',13)+' حذف فیلتر</button></div>' +
    '<div class="card tight" id="srvTxnsBox"><p class="hint-t" style="padding:18px">در حال دریافت تراکنش‌ها…</p></div>';

  $('#srvAddTxn').onclick = ()=> srvTxnForm();
  $('#srvTxnType').onchange = ()=>{ srvTxnsState.type=$('#srvTxnType').value; srvTxnsState.page=1; srvLoadTxns(); };
  $('#srvTxnReset').onclick = ()=>{ srvTxnsState.type='all'; srvTxnsState.page=1; $('#srvTxnType').value='all'; $('#srvTxnQ').value=''; srvLoadTxns(); };
  $('#srvTxnQ').oninput = ()=>{ srvTxnsState.page=1; srvLoadTxns(); };

  await srvLoadTxns();
}

async function srvLoadTxns(){
  const box = $('#srvTxnsBox'); if(!box) return;
  box.innerHTML='<p class="hint-t" style="padding:18px">در حال دریافت…</p>';
  try {
    const type = srvTxnsState.type!=='all' ? '&type='+srvTxnsState.type : '';
    const data = await srvFetch('GET', '/api/institutions/'+SRV.instId+'/txns?page='+srvTxnsState.page+'&pageSize=30'+type);
    const rows = data.rows||[];
    if(!rows.length){
      box.innerHTML='<div class="empty" style="padding:32px;text-align:center"><div class="e-ic">'+icon('swap',28)+'</div><h3>تراکنشی نیست</h3><p class="hint-t">تراکنش‌ها از وام‌ها، پرداخت‌ها و حساب‌ها خودکار ساخته می‌شوند.</p></div>';
      return;
    }
    const q = ($('#srvTxnQ')?.value||'').trim();
    let filtered = rows;
    if(q) filtered = rows.filter(t=> (t.description||'').includes(q) || (t.account_name||'').includes(q));

    box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>تاریخ شمسی کامل با نام ماه</th><th>نوع فارسی</th><th>مبلغ</th><th>حساب / صندوق</th><th>عضو</th><th>توضیحات</th></tr></thead><tbody>' +
      filtered.map(t=>{
        const jDate = J.iso2j((t.created_at||'').slice(0,10));
        const fullMonth = jDate ? J.MONTHS[jDate.jm-1] : '';
        const fullDate = J.fmtLong(t.created_at||'');
        return '<tr><td><b>'+fullDate+'</b><br><small class="hint-t">'+fullMonth+' '+ (jDate?faDigits(jDate.jy):'') +' — '+J.fmt(t.created_at||'')+'</small><br><small style="font-family:monospace;font-size:.7rem;color:var(--ink-2)">'+esc((t.created_at||'').slice(0,19))+'</small></td>' +
          '<td><span class="badge '+(t.type==='deposit'?'b-green':(t.type==='withdraw'?'b-red':'b-gray'))+'">'+faTxnType(t.type)+'</span></td>' +
          '<td class="c-fa-num c-strong" style="color:'+(t.type==='deposit'?'var(--green-deep)':'var(--red)')+'">'+(t.type==='deposit'?'+':'−')+' '+fmtN(t.amount)+'</td>' +
          '<td>'+esc(t.account_name||'—')+'<br><small class="hint-t">'+esc(t.fund_name||'')+'</small></td>' +
          '<td>'+esc(t.member_values ? Object.values(t.member_values)[0]?.value || t.member_no || '' : t.member_no||'')+'</td>' +
          '<td>'+esc(t.description||'—')+'</td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div class="tbl-foot"><span class="tf-info">'+faDigits(data.total)+' تراکنش · صفحه '+faDigits(srvTxnsState.page)+'</span><div class="pager"><button class="btn btn-soft btn-xs" id="srvTxnPrev"'+(srvTxnsState.page<=1?' disabled':'')+'>قبلی</button><button class="btn btn-soft btn-xs" id="srvTxnNext"'+(srvTxnsState.page>=Math.ceil(data.total/data.pageSize)?' disabled':'')+'>بعدی</button></div></div>';

    const pv=$('#srvTxnPrev'); if(pv) pv.onclick=()=>{ srvTxnsState.page--; srvLoadTxns(); };
    const nx=$('#srvTxnNext'); if(nx) nx.onclick=()=>{ srvTxnsState.page++; srvLoadTxns(); };

  } catch(e){
    box.innerHTML='<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>';
  }
}

function srvTxnForm(){
  openModal({
    title:'ثبت تراکنش جدید',
    sub:'حالت سرور — واریز/برداشت دستی',
    size:'md',
    body:'<div class="fields">'+
      '<div class="field"><label>نوع تراکنش فارسی <span class="req">*</span></label><select id="stfType"><option value="deposit">واریز</option><option value="withdraw">برداشت</option><option value="transfer">انتقال</option></select></div>'+
      '<div class="field"><label>مبلغ <span class="req">*</span></label><input id="stfAmt" class="num-inp" placeholder="10000000"></div>'+
      '<div class="field full"><label>توضیحات</label><textarea id="stfDesc" rows="2" placeholder="مثلاً واریز اولیه"></textarea></div>'+
      '<div id="stfErr" style="display:none;color:var(--red);padding:10px;background:var(--red-bg);border-radius:8px;margin-top:8px"></div>'+
    '</div>',
    foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="stfSave">ثبت تراکنش</button>',
    onOpen(h){
      h.el.querySelector('[data-x]').onclick=()=>h.close();
      if(typeof attachMoney==='function') attachMoney(h.el.querySelector('#stfAmt'));
      h.el.querySelector('#stfSave').onclick=async()=>{
        const type=h.el.querySelector('#stfType').value;
        const amt=h.el.querySelector('#stfAmt').value.replace(/[^0-9]/g,'');
        const desc=h.el.querySelector('#stfDesc').value;
        const err=h.el.querySelector('#stfErr');
        if(!amt){ err.style.display=''; err.textContent='مبلغ را وارد کنید.'; return; }
        try {
          await srvFetch('POST','/api/institutions/'+SRV.instId+'/txns',{ type, amount:amt, description:desc });
          toast('تراکنش ثبت شد.','ok'); h.close(); srvLoadTxns();
        } catch(e){ err.style.display=''; err.textContent=e.message; }
      };
    }
  });
}

(function hookSrvMode(){
  const _pgMembers = PAGES.members;
  PAGES.members = function(arg){
    if(SRV.on && srvReady()){
      if(arg && !isNaN(parseInt(arg,10))){ return renderSrvMemberProfile(arg); }
      if(arg==='ins'){ return renderSrvMembersPage(); }
      return renderSrvMembersPage();
    }
    return _pgMembers(arg);
  };
  const _pgDash = PAGES.dashboard;
  PAGES.dashboard = function(){ if(SRV.on && srvReady()) return renderSrvDashboard(); return _pgDash(); };
  const _pgLoans = PAGES.loans;
  PAGES.loans = function(arg){
    if(SRV.on && srvReady()){
      if(arg && !isNaN(parseInt(arg,10))){ return srvLoanDetail(arg); }
      return renderSrvLoansPage();
    }
    return _pgLoans(arg);
  };
  const _pgFunds = PAGES.funds;
  PAGES.funds = function(arg){
    if(SRV.on && srvReady()){
      return renderSrvFundsPage(arg||'funds');
    }
    return _pgFunds(arg);
  };
  const _pgAccounts = PAGES.accounts;
  PAGES.accounts = function(arg){
    if(SRV.on && srvReady()){
      if(arg && !isNaN(parseInt(arg,10))){ return renderSrvFundsPage('accounts'); }
      return renderSrvFundsPage('accounts');
    }
    return _pgAccounts(arg);
  };
  const _pgReports = PAGES.reports;
  PAGES.reports = function(arg){
    if(SRV.on && srvReady()){
      return renderSrvReportsPage();
    }
    return _pgReports ? _pgReports(arg) : null;
  };
  const _pgTxns = PAGES.txns;
  PAGES.txns = function(){
    if(SRV.on && srvReady()){
      return renderSrvTxnsPage();
    }
    return _pgTxns ? _pgTxns() : null;
  };
  const _renderSettings = renderSettings;
  renderSettings = function(){
    _renderSettings();
    /* منبع داده/اتصال PostgreSQL منتقل شد به تب «داده‌ها و ممیزی» */
    if(setTab === 'data'){
      injectSrvSec();
    }
    if(setTab === 'org' && SRV.on && srvReady()){
      const fb = document.querySelector('#secFld .sec-b'); if(fb) srvFieldsSec(fb);
    }
  };
  PAGES.settings = function(){ renderSettings(); };
})();


const ONBOARD_KEY = 'hesabat-onboard-v1';

// شماره عضویت ساده بدون انگلیسی - per درخواست کاربر، هیچ ستون en ساخته نمی‌شود
function faToEnTranslit(s){ return ''; } // دیگر استفاده نمی‌شود، برای سازگاری نگه داشته شد
function genMemberNo(firstName, lastName, nid){
  const nidPart = String(nid||'').replace(/\D/g,'').slice(-6) || '';
  const rand = Date.now().toString().slice(-4);
  if(nidPart) return ('M-' + nidPart + rand);
  return ('M-' + Date.now().toString(36).toUpperCase());
}


// مپ فیلدهای انتخابی به تعریف فیلد دمو — دقیقاً بر اساس انتخاب کاربر
function buildDemoFields(selected){
  const MAP = {
    'نام': {key:'name', label:'نام و نام خانوادگی', type:'text', on:1, core:1, req:1},
    'نام و نام خانوادگی': {key:'name', label:'نام و نام خانوادگی', type:'text', on:1, core:1, req:1},
    'نام پدر': {key:'father', label:'نام پدر', type:'text', on:1, core:1},
    'موبایل': {key:'mobile', label:'شماره تماس', type:'mobile', on:1, core:1, req:1},
    'شماره تماس': {key:'mobile', label:'شماره تماس', type:'mobile', on:1, core:1, req:1},
    'کدملی': {key:'nationalId', label:'کد ملی', type:'nid', on:1, core:1, req:1},
    'کد ملی': {key:'nationalId', label:'کد ملی', type:'nid', on:1, core:1, req:1},
    'تاریخ تولد': {key:'birthDate', label:'تاریخ تولد', type:'jdate', on:1, core:1, req:1},
    'آدرس': {key:'address', label:'آدرس', type:'text', on:1},
    'شغل': {key:'job', label:'شغل', type:'text', on:1},
  };
  if(!Array.isArray(selected) || !selected.length){
    return [
      {key:'name', label:'نام و نام خانوادگی', type:'text', on:1, core:1, req:1},
      {key:'father', label:'نام پدر', type:'text', on:1, core:1},
      {key:'mobile', label:'شماره تماس', type:'mobile', on:1, core:1, req:1},
      {key:'nationalId', label:'کد ملی', type:'nid', on:1, core:1, req:1},
      {key:'birthDate', label:'تاریخ تولد', type:'jdate', on:1, core:1, req:1},
    ];
  }
  const out=[];
  const seen=new Set();
  for(const lbl of selected){
    const def = MAP[lbl];
    if(def && !seen.has(def.key)){ out.push(Object.assign({},def)); seen.add(def.key); }
  }
  // اگر فقط نام انتخاب شده بود، حداقل نام را نگه دار
  if(!out.length) return [
    {key:'name', label:'نام و نام خانوادگی', type:'text', on:1, core:1, req:1},
    {key:'father', label:'نام پدر', type:'text', on:1, core:1},
  ];
  return out;
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
          <div class="field"><label>شماره تماس <span class="req">*</span></label><input id="obPhone" class="num-inp" inputmode="numeric" value="${esc(onboardData.phone||'')}" placeholder="09121234567" maxlength="11"></div>
          <div class="field"><label>کد ملی <span class="req">*</span></label><input id="obNid" class="num-inp" inputmode="numeric" value="${esc(onboardData.nid||'')}" placeholder="10 رقم" maxlength="10"></div>
          <div class="field"><label>نام پدر</label><input id="obFather" value="${esc(onboardData.fatherName||'')}" placeholder="مثلاً حسین"></div>
          <div class="field"><label>تاریخ تولد</label><input id="obBirth" class="num-inp" inputmode="numeric" value="${esc(onboardData.birthDate||'')}" placeholder="۱۳۷۰/۰۵/۰۲" data-jdate><span class="help">تقویم شمسی باز می‌شود.</span></div>
        </div>
      `;
    } else if (onboardStep === 2) {
      stepHtml = `
        <div class="onb-step"><span class="sn">۲</span><div><h4>اطلاعات مؤسسه مالی</h4><p>مشخصات قرض‌الحسنه یا صندوق</p></div></div>
        <div class="fields">
          <div class="field full"><label>نام مؤسسه <span class="req">*</span></label><input id="obInstName" value="${esc(onboardData.institutionName||'')}" placeholder="مثلاً قرض‌الحسنه مهرگان"></div>
          <div class="field"><label>تاریخ تأسیس</label><input id="obEstDate" class="num-inp" inputmode="numeric" value="${esc(onboardData.establishedAt||'')}" placeholder="1390/01/01"></div>
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
          <div class="field"><label>شماره تماس <span class="req">*</span></label><input id="obPhone" class="num-inp" inputmode="numeric" value="${esc(onboardData.phone||'')}" placeholder="09121234567" maxlength="11"></div>
          <div class="field"><label>کد ملی <span class="req">*</span></label><input id="obNid" class="num-inp" inputmode="numeric" value="${esc(onboardData.nid||'')}" placeholder="10 رقم" maxlength="10"></div>
          <div class="field"><label>نام پدر</label><input id="obFather" value="${esc(onboardData.fatherName||'')}" placeholder="مثلاً حسین"></div>
          <div class="field"><label>تاریخ تولد</label><input id="obBirth" class="num-inp" inputmode="numeric" value="${esc(onboardData.birthDate||'')}" placeholder="۱۳۷۰/۰۵/۰۲" data-jdate><span class="help">تقویم شمسی باز می‌شود.</span></div>
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

  // اول سعی کن به سرور بزنی — اگر SRV.base تعریف شده (حتی '') یعنی می‌خوایم سرور
  let serverOk = false;
  let serverAttempted = false;
  try {
    if (typeof SRV !== 'undefined' && typeof SRV.base === 'string' && typeof srvFetch === 'function') {
      serverAttempted = true;
      if (alertBox) alertBox.innerHTML = `<div class="alert a-info"><span class="al-ic">${icon('info',16)}</span><div>در حال اتصال به سرور (<code dir="ltr">${esc(SRV.base==='' ? 'same-origin' : SRV.base)}</code>)...</div></div>`;
      const res = await srvFetch('POST', '/api/auth/register-v2', payload);
      SRV.token = res.token;
      SRV.user = res.user;
      SRV.instId = res.institutionId || null;
      SRV.instName = onboardData.institutionName || '';
      SRV.on = true;
      try { localStorage.setItem(SRV_KEY, JSON.stringify(SRV)); } catch(e){}
      // SESSION را هم بساز تا روتر اجازه ورود بدهد — فیکس باگ ورود
      try{
        const nm = (res.user&&res.user.name) || (onboardData.firstName+' '+onboardData.lastName);
        const ph = (res.user&&res.user.phone) || onboardData.phone;
        const rt = (res.user&&res.user.roleType) || onboardRole;
        SESSION = { username: ph, name: nm, role: rt==='manager'?'admin':'viewer', roleType: rt };
        localStorage.setItem(SES_KEY, JSON.stringify(SESSION));
      }catch(e){}
      toast('حساب با موفقیت در سرور ساخته شد!','ok');
      if (alertBox) alertBox.innerHTML = `<div class="alert a-ok"><span class="al-ic">${icon('check',16)}</span><div>✅ حساب در <b>Postgres</b> ساخته شد! ایمیل ربات: <b dir="ltr">${esc(res.institutionEmail||payload.email)}</b><br><small>در حال ورود...</small></div></div>`;
      try{ localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); }catch(e){}
      setTimeout(()=>{ 
        location.hash = '#/app/dashboard';
        // یک رفرش کافیست، SESSION از قبل ذخیره شده
        setTimeout(()=>{ location.reload(); }, 350);
      }, 400);
      serverOk = true;
      return;
    }
  } catch(e) {
    console.warn('[onboard] server register failed:', e.message, e);
    // خطای منطقی 400-500 → نمایش خطا و توقف (مثلاً تکراری)
    if (e && e.status && e.status>=400 && e.status<500) {
      if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><span class="al-ic">${icon('warn',16)}</span><div>❌ خطا از سرور (${e.status}): ${esc(e.message)}${e.details ? '<br><small>'+esc(JSON.stringify(e.details))+'</small>':''}</div></div>`;
      if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
      return;
    }
    // خطای شبکه → اگر سرور ست شده بود، خطا را واضح نشان بده و اجازه انتخاب دمو بده
    if (e && e.network) {
      if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><span class="al-ic">${icon('warn',16)}</span><div>❌ اتصال به سرور برقرار نشد (<code dir="ltr">${esc(typeof SRV!=='undefined'?SRV.base:'')}</code>)<br>پیام: ${esc(e.message)}<br><br><b>چک‌لیست:</b><br>۱) آیا بک‌اند روشن است؟ <code>/api/health</code> را در مرورگر باز کن.<br>۲) آیا <code>DATABASE_URL</code> در Render/Railway ست است؟<br>۳) آیا <code>npm run migrate</code> را اجرا کردی؟<br>۴) اگر فایل را با file:// باز کردی، باید از <code>http://localhost:4000/Panel.html</code> باز کنی.<br><br><button class="btn btn-soft btn-sm" id="obForceDemo">${icon('users',14)} ادامه در حالت دمو (localStorage)</button></div></div>`;
      if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
      setTimeout(()=>{
        const fd = document.getElementById('obForceDemo');
        if(fd) fd.onclick = async ()=>{
          if (alertBox) alertBox.innerHTML = `<div class="alert a-warn"><div>در حال ساخت حساب دمو...</div></div>`;
          await new Promise(r=>setTimeout(r,300));
          // ادامه به دمو - کد پایین اجرا می‌شود
          doDemoCreate();
        };
      },100);
      // تابع ساخت دمو را جدا می‌کنیم تا دکمه بتواند صدا بزند
      const doDemoCreate = async ()=>{
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
            DB.settings.institution.email = payload.email;
            DB.settings.currency = payload.currency||'تومان';
            DB.settings.loanDefaults = {
              months: parseInt(payload.installmentsCount)||12,
              interval: payload.installmentPeriod==='monthly'?1:payload.installmentPeriod==='bimonthly'?2:3,
              rate: parseFloat(payload.feePercent)||4
            };
            // فیلدهای اعضا دقیقاً بر اساس انتخاب کاربر
            try{ DB.settings.memberFields = buildDemoFields(onboardData.memberFields||[]); }catch(e){}
          } else {
            DB.settings.institution.email = payload.email;
            try{ DB.settings.memberFields = buildDemoFields(onboardData.memberFields||[]); }catch(e){}
          }
          saveDb();
          SESSION = { username:newUser.username, name:newUser.name, role:newUser.role, roleType: onboardRole };
          try { localStorage.setItem(SES_KEY, JSON.stringify(SESSION)); } catch(e){}
          toast('حساب دمو ساخته شد!','ok');
          setTimeout(()=>{ location.hash='#/app/dashboard'; location.reload(); }, 600);
        } catch(err) {
          if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><div>خطا: ${esc(err.message)}</div></div>`;
        }
        if (btn) { btn.disabled=false; btn.innerHTML = icon('check',14)+' ایجاد حساب'; }
      };
      const isFile = typeof location!=='undefined' && location.protocol==='file:';
      if(isFile || (typeof SRV!=='undefined' && SRV.base && SRV.base.includes('localhost'))){
        return;
      }
      return;
    }
    // سایر خطاها → نمایش
    if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><div>خطا: ${esc(e.message)}</div></div>`;
    if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
    return;
  }
  if (serverOk) return;
  // اگر به اینجا رسیدیم یعنی SRV تعریف نشده بود - مستقیم دمو

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
      DB.settings.institution.email = payload.email;
      DB.settings.currency = payload.currency||'تومان';
      DB.settings.loanDefaults = {
        months: parseInt(payload.installmentsCount)||12,
        interval: payload.installmentPeriod==='monthly'?1:payload.installmentPeriod==='bimonthly'?2:3,
        rate: parseFloat(payload.feePercent)||4
      };
      try{ DB.settings.memberFields = buildDemoFields(onboardData.memberFields||[]); }catch(e){}
      if (alertBox) alertBox.innerHTML = `<div class="alert a-info"><div>مؤسسه «${esc(payload.institutionName)}» با ایمیل ربات <b dir="ltr">${esc(payload.email)}</b> ساخته شد و دیتابیس دمو تمیز شد (0 عضو).</div></div>`;
    } else {
      DB.settings.institution.email = payload.email;
      try{ DB.settings.memberFields = buildDemoFields(onboardData.memberFields||[]); }catch(e){}
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


// ── اجرا ──
(function(){
  // صبر کن تا همه چیز لود شود
  function init(){
    if (typeof DB === 'undefined' || typeof SESSION === 'undefined') {
      setTimeout(init, 100);
      return;
    }
    bindNewLogin();
    /* این چهار پچ در نسخه‌های قدیمی وجود داشتند و بعداً حذف شدند؛
       اگر نباشند نباید کل مراحل راه‌اندازی (مخصوصاً روتر افتتاح حساب) بشکند */
    ['patchSettings','patchMemberForm','patchUserPanel','fixPopupFont'].forEach(function(fname){
      try {
        if (typeof window[fname] === 'function') window[fname]();
      } catch(e){ console.warn('[init] ' + fname + ' failed:', e); }
    });

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

