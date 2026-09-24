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
/* برچسب فارسی وضعیت اقساط — برای گزارش‌های سرور */
const INS_FA = {paid:'پرداخت‌شده', partial:'پرداخت ناقص', overdue:'سررسید گذشته', dueSoon:'نزدیک سررسید', pending:'در انتظار'};
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
   حساب‌ها — اسکریپت ۲: نگهدارندهٔ موقت تنظیمات مؤسسه (فقط درون‌حافظه)
   ═══════════════════════════════════════════════════════════════ */
const DB_KEY = 'hesabat-db-v1', SES_KEY = 'hesabat-session-v1';
let DB = null, SESSION = null;

function emptyDb(){
  /* فقط‌سرور: دیگر هیچ داده‌ای از حافظهٔ محلی (localStorage) خوانده یا نوشته نمی‌شود.
     این ساختار فقط یک نگهدارندهٔ موقتِ درون‌حافظه‌ای برای تنظیمات مؤسسهٔ متصل است. */
  return {
    v:1,
    counters:{member:0, loan:0},
    members:[], loans:[], installments:[], payments:[], txns:[], funds:[], accounts:[], users:[], audit:[], importTemplates:[],
    settings:{
      currency:'تومان',
      institution:{name:'', logo:'', phone:'', address:'', establishedAt:'', fundBalance:0},
      notifications:{},
      stampColors:{},
      memberNoTemplate:'M-{seq:4}',
      memberFields:[],
      loanDefaults:{rate:4, months:12, interval:1}
    }
  };
}
function loadDb(){
  try{ localStorage.removeItem(DB_KEY); }catch(e){}
  return emptyDb();
}
function saveDb(){ /* فقط‌سرور: هیچ‌چیز در مرورگر ذخیره نمی‌شود؛ خواندن/نوشتن فقط از طریق API است. */ }
function stampColor(task){
  let c = {};
  try{ c = JSON.parse(localStorage.getItem('hesabat-stamp-colors')||'{}')||{}; }catch(e){ c = {}; }
  if(!c || typeof c!=='object') c = (DB.settings&&DB.settings.stampColors)||{};
  return c[task] || (task==='payment' ? '#1C6E31' : '#B3261E');
}
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
const ROLE_PERMS = {
  admin:    {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:1,settingsEdit:1},
  operator: {memberAdd:1,memberEdit:1,loanAdd:1,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
  accountant:{memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:1,txnAdd:1,reportExport:1,userManage:0,settingsEdit:0},
  viewer:   {memberAdd:0,memberEdit:0,loanAdd:0,paymentAdd:0,txnAdd:0,reportExport:1,userManage:0,settingsEdit:0}
};
function can(perm){
  if(!SESSION) return false;
  const m = ROLE_PERMS[SESSION.role];
  return !!(m && m[perm]);
}

function audit(){ /* فقط‌سرور: لاگ عملیات روی خود سرور (institution_audit) نگه‌داری می‌شود. */ }
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
        '<select data-year>' + Array.from({length:160},(_,i)=>{ const y = 1285+i; return '<option'+(y===view.jy?' selected':'')+'>'+faDigits(y)+'</option>'; }).join('') + '</select></span>' +
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
  if(h.toLowerCase().includes('onboarding')) return; // افتتاح حساب — با شنوندهٔ hashchange (init) مدیریت می‌شود
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
let SRV_OD_COUNT = 0; /* با آمار سرور در داشبورد به‌روز می‌شود */
function overdueCount(){ return SRV_OD_COUNT||0; }
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
let SRV_ALERTS = []; /* با آمار زندهٔ سرور در داشبورد پر می‌شود */
function computeAlerts(){ return SRV_ALERTS; }
/* اعلان‌های زنگ از آمار زندهٔ سرور */
function srvFillAlerts(stats){
  const alerts = [];
  const od = Number((stats.installments&&stats.installments.overdue)||0);
  const lnOd = Number((stats.loans&&stats.loans.overdue)||0);
  if(lnOd) alerts.push({ic:'warn', color:'var(--red)', html:'<b>'+faDigits(lnOd)+'</b> وام معوق فعال است و نیازمند پیگیری است.', go:'#/app/loans'});
  if(od) alerts.push({ic:'clock', color:'var(--amber)', html:'<b>'+faDigits(od)+'</b> قسط سررسیدگذشته وجود دارد.', go:'#/app/members'});
  SRV_ALERTS = alerts;
  try{ renderNotifs(); }catch(e){}
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
function csvEsc(c){ const s = String(c==null?'':c); return /[",\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function downloadCsv(name, head, rows, auditWhat){
  const blob = new Blob(['﻿'+[head].concat(rows).map(r=>r.map(csvEsc).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  if(URL.revokeObjectURL) setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
  if(auditWhat) audit('خروجی CSV '+auditWhat+' ('+faDigits(rows.length)+' رکورد)', 'report');
  toast('فایل CSV با '+faDigits(rows.length)+' رکورد دانلود شد.','ok');
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
        '<span class="help">بازیابی رمز از طریق مدیر سامانه انجام می‌شود.</span></div></div>',
      foot:'<button class="btn btn-ghost btn-sm" data-x>انصراف</button><button class="btn btn-solid btn-sm" id="fgSend">'+icon('send',14)+' ارسال کد بازیابی</button>',
      onOpen(h){ h.el.querySelector('[data-x]').onclick = ()=>h.close();
        h.el.querySelector('#fgSend').onclick = ()=>{
          const v = fieldVal('#fgUser');
          if(v.length < 3){ markErr($('#fgUser'),'شماره تماس یا کد ملی را وارد کنید.'); return; }
          h.close(); toast('درخواست ثبت شد؛ با مدیر سامانه تماس بگیرید.','ok');
        }; } });
  });

  // تغییر placeholder به شماره تماس/کد ملی
  const userInp = $('#lgUser'), passInp = $('#lgPass');
  if(userInp){ userInp.placeholder = 'شماره تماس (مثلاً 09121234567)'; }
  if(passInp){ passInp.placeholder = 'کد ملی (10 رقم)'; }
  const hint = document.querySelector('.login-hint');
  if(hint){
    hint.innerHTML = '<b>راهنما:</b> نام کاربری = شماره تماس (مثلاً 09121234567)، رمز = کد ملی (10 رقم)';
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
        try{ await srvSyncInstSettings(); }catch(_){}
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
      // خطای شبکه → فقط‌سرور: هیچ حالت دمویی وجود ندارد؛ ورود فقط با اتصال به سرور ممکن است
      if(err && err.network){
        alertBox.innerHTML = '<div class="alert a-err shake"><span class="al-ic">'+icon('warn',17)+'</span><div><b>سرور در دسترس نیست.</b> ارتباط با سرور برقرار نشد؛ چند لحظهٔ دیگر دوباره تلاش کنید.</div></div>';
      }
      btn.disabled = false; txt.textContent = 'ورود به سامانه';
      return;
    }
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
/* اتصال خودکار: با وجود نشست سرور ذخیره‌شده، حالت سرور همیشه و بدون هیچ تنظیمات دستی فعال است —
   سوپابیس (PostgreSQL) و سرویس ریلوی هر دو از همان API نسبی به مبدأ سرو می‌شوند. */
if(SRV.token && SRV.instId) SRV.on = true;
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

/* فقط‌سرور: تنظیمات نمایشی (نام/واحد پول/تاریخ تأسیس/پیش‌فرض وام) از خود مؤسسهٔ PostgreSQL می‌آید.
   این یکی جایگزین خواندن DB از localStorage است — نگهدارندهٔ DB فقط درون‌حافظه‌ای است. */
async function srvSyncInstSettings(){
  if(!srvReady()) return;
  const r = await srvFetch('GET','/api/institutions/'+SRV.instId);
  const inst = r.institution || r;
  if(!inst) return;
  SRV.instName = inst.name || SRV.instName;
  DB.settings.institution.name = inst.name || SRV.instName || '';
  DB.settings.institution.address = inst.address || '';
  DB.settings.institution.establishedAt = inst.established_at ? String(inst.established_at).slice(0,10) : '';
  DB.settings.institution.fundBalance = inst.fund_balance!=null ? Number(inst.fund_balance) : 0;
  DB.settings.currency = inst.currency || 'تومان';
  DB.settings.loanDefaults = {
    rate: inst.fee_percent!=null ? Number(inst.fee_percent) : 4,
    months: inst.installments_count || 12,
    interval: inst.installment_period==='bimonthly'?2:inst.installment_period==='quarterly'?3:1
  };
  const el = document.getElementById('orgName'); if(el && inst.name) el.textContent = inst.name;
}

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
  bindLogin();
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

  /* فقط‌سرور: تنظیمات نمایشی از مؤسسهٔ PostgreSQL سینک می‌شود */
  try{ if(srvReady()) srvSyncInstSettings(); }catch(e){}
  route();
})();


/* ═══════════════════════════════════════════════════════════════
   لایهٔ اتصال به سرور — فقط‌سرور: همهٔ داده‌ها از API/PostgreSQL می‌آیند
   - هیچ دادهٔ محلی (localStorage) برای اطلاعات مؤسسه وجود ندارد
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

/* سکشن «تنظیمات اتصال سرور» کاملاً حذف شد — اتصال به سرور (سوپابیس/ریلوی) خودکار و از همان مبدأ است؛ ورود فقط از صفحهٔ ورود یا افتتاح حساب انجام می‌شود. */

/* ── مدیریت فیلدهای اعضا از سرور (فقط‌سرور) ── */
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
      '<button class="btn btn-soft btn-xs" data-sfh="' + f.id + '" data-sfl="' + esc(f.label) + '" style="color:var(--red)">' + icon('trash',13) + ' حذف کامل</button>' +
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
  box.querySelectorAll('[data-sfh]').forEach(b => b.onclick = async ()=>{
    const okc = await askConfirm({ title:'حذف کامل فیلد', danger:true, ok:'حذف شود',
      text:'فیلد «' + b.dataset.sfl + '» و همهٔ مقادیر آن در اعضا برای همیشه حذف می‌شوند. این کار برگشت‌پذیر نیست.' });
    if(!okc) return;
    try { await srvFetch('DELETE', '/api/institutions/' + SRV.instId + '/fields/' + b.dataset.sfh + '?hard=1'); srvDropFieldsCache(); toast('فیلد کاملاً حذف شد.', 'ok'); srvFieldsSec(box); }
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
    '<div style="padding:24px 8px"><div class="alert a-info"><span class="al-ic">'+icon('info',16)+'</span><div>اقساط هر وام در جزئیات همان وام (از منوی <b>وام‌ها</b>) به‌صورت کامل قابل مشاهده و پرداخت است.</div></div>' +
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




/* ── روتر فقط‌سرور: همهٔ صفحات از سرور می‌خوانند ── */
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
    '<div class="grid g-2" style="margin-top:14px"><div class="card"><div class="card-h"><h3>وضعیت وام‌ها</h3><span class="hint-t">تسویه‌شده + در جریان + معوق</span></div><div class="card-b"><div class="chart-box"><canvas id="chSrvIns"></canvas></div><div class="legend" id="chSrvInsLg"></div></div></div>' +
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
    SRV_OD_COUNT = Number((stats.installments&&stats.installments.overdue)||0);
    try{ srvFillAlerts(stats); }catch(e){}
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

    // چارت وضعیت وام‌ها — تسویه‌شده + در جریان + معوق (نه فقط وام‌های در جریان)
    const lnAct = Number((stats.loans&&stats.loans.active)||0), lnPaid = Number((stats.loans&&stats.loans.paid)||0), lnOd = Number((stats.loans&&stats.loans.overdue)||0);
    const lnTot = lnAct+lnPaid+lnOd;
    drawDonut($('#chSrvIns'), [
      {label:'تسویه‌شده', value:lnPaid, color:'#1C6E31'},
      {label:'در جریان', value:lnAct, color:'#C4871F'},
      {label:'معوق', value:lnOd, color:'#B3362B'}
    ].filter(d=>d.value>0), 'کل وام‌ها', faDigits(lnTot));
    $('#chSrvInsLg').innerHTML = '<span class="lg-i"><i style="background:#1C6E31"></i>تسویه‌شده ('+faDigits(lnPaid)+')</span><span class="lg-i"><i style="background:#C4871F"></i>در جریان ('+faDigits(lnAct)+')</span><span class="lg-i"><i style="background:#B3362B"></i>معوق ('+faDigits(lnOd)+')</span>';

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
  lines.push('== '+(SRV.instName||'مؤسسه')+' — '+def.title+(fs ? ' — فیلترها: '+fs : '')+' ('+faDigits(rows.length)+' رکورد) ==');
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
  const U = CUR();
  const L = [];
  L.push('== '+(SRV.instName||'مؤسسه')+' — گزارش جامع — تاریخ تهیه: '+J.fmtLong(J.todayIso())+' ==');
  L.push('');
  L.push('== شاخص‌های کلیدی — از تأسیس مؤسسه تاکنون ==');
  L.push('شاخص,مقدار,واحد');
  L.push('اعضای مؤسسه,'+K.members+',نفر');
  L.push('وام‌های ثبت‌شده,'+K.loans+',وام');
  L.push('ارزش کل وام‌ها,'+K.loansAmt+','+U);
  L.push('مجموع دریافتی اقساط,'+K.paySum+','+U);
  L.push('تعداد پرداخت‌ها,'+K.paysCnt+',پرداخت');
  L.push('مجموع واریزی‌ها,'+K.depSum+','+U);
  L.push('مجموع برداشت‌ها,'+K.wdSum+','+U);
  L.push('موجودی فعلی صندوق‌ها,'+K.curBal+','+U);
  L.push('اقساط معوق فعال,'+K.odNow+',قسط');
  L.push('');
  L.push('== داده ماهانه نمودارها — '+srvRepWinTitle(M)+' ==');
  L.push('ماه,واریزی ('+U+'),برداشت ('+U+'),موجودی تجمیعی ('+U+'),اعضای تجمیعی (نفر),وام‌های تجمیعی (عدد),اقساط پرداخت‌شده (قسط),اقساط سررسیدشده (قسط),اقساط معوق (قسط)');
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
    '<table class="pr-kpis"><tbody><tr>'+kpiPairs.slice(0,3).map(p=>'<td><b>'+esc(p[0])+':</b> '+esc(p[1])+'</td>').join('')+'</tr><tr>'+kpiPairs.slice(3).map(p=>'<td><b>'+esc(p[0])+':</b> '+esc(p[1])+'</td>').join('')+'</tr></tbody></table>' +
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
    '<button class="btn btn-ghost btn-sm" id="srvTxnCsv" style="margin-inline-start:auto">'+icon('download',13)+' خروجی CSV</button>' +
    '<button class="btn btn-ghost btn-sm" id="srvTxnReset">'+icon('refresh',13)+' حذف فیلتر</button></div>' +
    '<div class="card tight" id="srvTxnsBox"><p class="hint-t" style="padding:18px">در حال دریافت تراکنش‌ها…</p></div>';

  $('#srvAddTxn').onclick = ()=> srvTxnForm();
  $('#srvTxnType').onchange = ()=>{ srvTxnsState.type=$('#srvTxnType').value; srvTxnsState.page=1; srvLoadTxns(); };
  $('#srvTxnReset').onclick = ()=>{ srvTxnsState.type='all'; srvTxnsState.page=1; $('#srvTxnType').value='all'; $('#srvTxnQ').value=''; srvLoadTxns(); };
  $('#srvTxnCsv').onclick = async ()=>{ /* خروجی CSV تراکنش‌ها — یکی از دو منوی مجاز (گزارش‌ها و تراکنش‌ها) */
    try {
      const type = srvTxnsState.type!=='all' ? '&type='+srvTxnsState.type : '';
      // سقف هر صفحهٔ API عدد ۲۰۰ است؛ صفحه‌به‌صفحه تا همهٔ تراکنش‌ها خوانده شود (حداکثر ۲۵ صفحه ≈ ۵۰۰۰ رکورد)
      const q = ($('#srvTxnQ')?.value||'').trim();
      const all = [];
      for(let pg=1; pg<=25; pg++){
        const data = await srvFetch('GET','/api/institutions/'+SRV.instId+'/txns?page='+pg+'&pageSize=200'+type);
        const batch = (data.rows||[]);
        batch.forEach(x => {
          if(q && !((x.description||'').includes(q) || (x.account_name||'').includes(q))) return;
          const memb = x.member_values ? (Object.values(x.member_values)[0]?.value || x.member_no || '') : (x.member_no || '');
          all.push([ J.fmtLong(x.created_at||''), faTxnType(x.type), String(x.amount), x.account_name||x.fund_name||'—', memb, x.description||'' ]);
        });
        if(!batch.length) break;
      }
      if(!all.length){ toast('تراکنشی برای خروجی نیست.','warn'); return; }
      downloadCsv('hesabat-txns-'+J.todayIso()+'.csv', ['تاریخ','نوع','مبلغ ('+CUR()+')','حساب/صندوق','عضو','توضیحات'], all, 'تراکنش‌های '+(SRV.instName||'مؤسسه'));
      toast('فایل CSV تراکنش‌ها ('+faDigits(all.length)+' رکورد) دانلود شد.','ok');
    } catch(e){ toast(e.message,'err'); }
  };
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

/* تنظیمات مالی در حالت سرور — مقادیر همان institutions است که موقع «افتتاح حساب» ساخته شد.
   عنوان‌ها شامل نام مؤسسه و modifiable هر تعداد اقساط (۱ تا ۱۲۰)، دوره اقساط، واحد پول، کارمزد. */
async function renderSrvFinSec(body, canEdit, disAttr){
  body.innerHTML = '<p class="hint-t" style="padding:10px 4px">در حال بارگذاری تنظیمات مؤسسه از سرور…</p>';
  let inst = null;
  try{ const r = await srvFetch('GET', '/api/institutions/'+SRV.instId); inst = r.institution||r; }catch(e){ body.innerHTML='<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>'; return; }
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
      '<div class="field"><label>تاریخ تأسیس</label><span class="t-jd"><input id="setSrvEst"'+disAttr+'></span><span class="help">همان «تاریخ تأسیس» آنبردینگ.</span></div>' +
      '<div class="field"><label>موجودی صندوق <small>('+CUR()+')</small></label><input id="setSrvBal" class="t-money" data-cur="'+esc(String(inst.fund_balance!=null?inst.fund_balance:0))+'"'+disAttr+'><span class="help">همان «موجودی صندوق» آنبردینگ — هر کم/زیاد شدنش با توضیح در دفتر تغییرات لاگ می‌شود.</span></div>' +
      '<div class="field full" id="setSrvBalNoteWrap" style="display:none"><label>توضیح تغییر موجودی <span class="req">*</span></label><textarea id="setSrvBalNote" rows="2" placeholder="مثلاً واریز سرمایهٔ اولیه یا اصلاح مقدار اشتباه"></textarea></div>' +
      '<div class="field full" id="srvBalLogWrap"><span class="hint-t">دفتر تغییرات موجودی از سرور خوانده می‌شود…</span></div>' +
      '<div class="field full"><label>آدرس مؤسسه</label><textarea id="setSrvAddr" rows="2"'+disAttr+'>'+esc(inst.address||'')+'</textarea></div>' +
      (canEdit ? '<div class="full"><button class="btn btn-solid btn-sm" id="setSrvFinSave">'+icon('check',14)+' ذخیره تنظیمات مالی (سرور)</button></div>' : '<div class="alert a-warn full"><span class="al-ic">'+icon('warn',16)+'</span><div>نقش شما اجازه ویرایش تنظیمات را ندارد.</div></div>') +
    '</div>';
  { const balInp = $('#setSrvBal');
    if(balInp && typeof attachMoney==='function'){
      attachMoney(balInp); if(typeof setMoney==='function') setMoney(balInp, inst.fund_balance||0);
      balInp.addEventListener('input', ()=>{ const wEl = $('#setSrvBalNoteWrap'); if(wEl) wEl.style.display = (moneyVal(balInp) !== Number(balInp.dataset.cur||0)) ? '' : 'none'; });
    }
    const estInp = $('#setSrvEst');
    if(estInp && typeof attachJDate==='function'){ attachJDate(estInp); if(inst.established_at && typeof setJd==='function') setJd(estInp, String(inst.established_at).slice(0,10)); }
    (async()=>{
      const wEl = $('#srvBalLogWrap'); if(!wEl) return;
      try{
        const r = await srvFetch('GET','/api/institutions/'+SRV.instId+'/audit?limit=6');
        const rows = r.rows||[];
        wEl.innerHTML = rows.length
          ? '<div style="font-size:.8rem;font-weight:700;color:var(--ink-2);margin-bottom:4px">'+icon('clock',13)+' دفتر تغییرات موجودی صندوق</div><div class="mini-list" style="border:1px solid var(--line);border-radius:12px;padding:4px">' +
            rows.map(a=>{ const up = Number(a.new_value) >= Number(a.old_value);
              return '<div class="mini-item"><span class="avatar sz-34 '+(up?'teal':'amber')+'">'+icon(up?'download':'upload',13)+'</span><span class="mi-t"><b>'+fmtN(+a.old_value)+' ← '+fmtN(+a.new_value)+' '+CUR()+'</b><span>'+esc(a.note||'بدون توضیح')+(a.user_name?' · '+esc(a.user_name):'')+' · '+J.fmtLong(a.created_at)+'</span></span></div>';
            }).join('') + '</div>'
          : '<span class="hint-t">هنوز تغییری در موجودی صندوق ثبت نشده.</span>';
      }catch(e){ wEl.innerHTML = '<span class="hint-t">دفتر تغییرات موجودی در دسترس نیست — ابتدا اسکریپت «۰۰۵ موجودی صندوق» را در دیتابیس اجرا کنید.</span>'; }
    })();
  }
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
    const estInp2 = $('#setSrvEst');
    payload.established_at = (estInp2 && typeof jdVal==='function' && jdVal(estInp2)) ? jdVal(estInp2) : null;
    const balInp2 = $('#setSrvBal');
    if(balInp2){
      const balNew = moneyVal(balInp2);
      if(balNew !== Number(balInp2.dataset.cur||0)){
        const noteEl = $('#setSrvBalNote');
        const note = noteEl ? noteEl.value.trim() : '';
        if(!note){ toast('برای کم/زیاد شدن موجودی صندوق، نوشتن «توضیح تغییر موجودی» الزامی است.','warn'); if(noteEl) noteEl.focus(); return; }
        payload.fund_balance = balNew;
        payload.fund_balance_note = note;
      }
    }
    try{
      await srvFetch('PATCH', '/api/institutions/'+SRV.instId, payload);
      SRV.instName = payload.name; srvSave();
      toast('تنظیمات مالی در سرور ذخیره شد — با همان آپشن‌های آنبردینگ.','ok'); route();
    }catch(e){ toast('خطا در ذخیره سرور: '+e.message,'err'); }
  };
}

/* ═══════ روتر صفحات — فقط‌سرور ═══════
   حالت دمویی دیگر وجود ندارد؛ همهٔ صفحات مستقیم به رندرگرهای سرور (API + PostgreSQL) وصل‌اند. */
const PAGES = {
  dashboard: function(){ return renderSrvDashboard(); },
  members:   function(arg){ if(arg && !isNaN(parseInt(arg,10))) return renderSrvMemberProfile(arg); return renderSrvMembersPage(); },
  loans:     function(arg){ if(arg && !isNaN(parseInt(arg,10))) return srvLoanDetail(arg); return renderSrvLoansPage(); },
  funds:     function(arg){ return renderSrvFundsPage(arg||'funds'); },
  accounts:  function(){ return renderSrvFundsPage('accounts'); },
  reports:   function(){ return renderSrvReportsPage(); },
  txns:      function(){ return renderSrvTxnsPage(); },
  settings:  function(){ renderSettings(); }
};

/* ═══════ تنظیمات — فقط‌سرور ═══════
   همهٔ مقادیر از مؤسسهٔ PostgreSQL خوانده و به همان سرور ذخیره می‌شود؛ هیچ دادهٔ محلی وجود ندارد. */
let setTab = 'org';
let setAnchor = '';
function renderSettings(){
  const main = $('#main');
  const OLD = {fields:'org', fa:'org', fin:'org', notif:'org', ui:'org', roles:'us', users:'us', data:'data'};
  if(OLD[setTab]) setTab = OLD[setTab];
  const tabs = [['org','اطلاعات مؤسسه'],['us','کاربران'],['data','ممیزی و لاگ']];
  main.innerHTML =
    '<div class="page-head"><div><h1>تنظیمات</h1><div class="ph-sub">همهٔ پیکربندی مؤسسه — ذخیره‌شده در سرور (PostgreSQL)</div></div></div>' +
    '<div class="card tight"><div class="card-b" style="padding:8px 18px 0"><div class="tabs">' +
      tabs.map(t=>'<button class="tab'+(setTab===t[0]?' on':'')+'" data-st="'+t[0]+'">'+t[1]+'</button>').join('') +
    '</div></div><div class="card-b" id="setBody"></div></div>';
  main.querySelectorAll('[data-st]').forEach(b => b.onclick = ()=>{ setTab = b.dataset.st; renderSettings(); });
  const body = $('#setBody');
  const sec = (id, ic, title, sub) =>
    '<div class="card tight set-sec" id="'+id+'" style="margin-bottom:16px"><div class="card-h"><h3>'+icon(ic,16)+' '+title+'</h3><span class="hint-t">'+sub+'</span></div><div class="card-b sec-b"></div></div>';
  const disAttr = can('settingsEdit') ? '' : ' disabled style="opacity:.55;pointer-events:none"';
  if(setTab === 'org'){
    body.innerHTML =
      sec('secFin','bank','مؤسسه و تنظیمات مالی','نام، تماس، واحد پول، پیش‌فرض وام‌ها و موجودی صندوق') +
      sec('secFld','users','فیلدهای اعضا','الگوی فیلدها در فرم عضو، جدول و جستجو') +
      sec('secFa','wallet','صندوق‌ها و حساب‌ها','مدیریت صندوق‌ها و حساب‌های بانکی') +
      sec('secNotif','info','اعلان‌ها','یادآور سررسید و تأیید پرداخت') +
      sec('secUi','image','ظاهر','تم روشن/تیره');
    renderSrvFinSec(body.querySelector('#secFin .sec-b'), can('settingsEdit'), disAttr);
    srvFieldsSec(body.querySelector('#secFld .sec-b'));
    body.querySelector('#secFa .sec-b').innerHTML =
      '<div class="empty" style="padding:20px;text-align:center"><div class="e-ic">'+icon('wallet',26)+'</div><h3>صندوق‌ها و حساب‌ها</h3><p class="hint-t">مدیریت کامل صندوق‌ها، حساب‌های بانکی و موجودی آن‌ها از منوی اختصاصی انجام می‌شود.</p><a class="btn btn-solid btn-sm" style="margin-top:8px" href="#/app/funds">رفتن به صندوق‌ها</a></div>';
    body.querySelector('#secNotif .sec-b').innerHTML =
      '<p class="hint-t" style="padding:10px 4px">'+icon('info',14)+' یادآور سررسید اقساط و تأیید پرداخت‌ها به‌صورت خودکار روی داشبورد و پنل اعلان‌ها نمایش داده می‌شود — مستقیم از دادهٔ زندهٔ سرور، بدون نیاز به پیکربندی.</p>';
    const uiB = body.querySelector('#secUi .sec-b');
    const scMem = stampColor('member');
    const scPay = stampColor('payment');
    uiB.innerHTML = '<div class="field"><label>تم نمایش</label><div class="field-row"><button class="btn btn-soft btn-sm" id="setThemeLight">'+icon('sun',14)+' روشن</button><button class="btn btn-soft btn-sm" id="setThemeDark">'+icon('moon',14)+' تیره</button></div><span class="help">فقط ترجیح همین مرورگر است و روی داده‌ها اثر ندارد.</span></div>' +
      '<div class="fields" style="margin-top:14px">' +
        '<div class="field"><label>رنگ مُهر ثبت عضو</label><input id="setStampMem" type="color" value="'+esc(scMem)+'"></div>' +
        '<div class="field"><label>رنگ مُهر ثبت پرداخت</label><input id="setStampPay" type="color" value="'+esc(scPay)+'"></div>' +
      '</div><span class="help">رنگ مُهر تأیید بعد از ثبت عضو یا پرداخت.</span>';
    $('#setThemeLight').onclick = ()=>applyTheme('light', true);
    $('#setThemeDark').onclick = ()=>applyTheme('dark', true);
    const saveStamp = ()=>{
      try{ localStorage.setItem('hesabat-stamp-colors', JSON.stringify({ member: $('#setStampMem').value, payment: $('#setStampPay').value })); }catch(e){}
      if(DB && DB.settings) DB.settings.stampColors = { member: $('#setStampMem').value, payment: $('#setStampPay').value };
    };
    $('#setStampMem').onchange = saveStamp;
    $('#setStampPay').onchange = saveStamp;
  }
  else if(setTab === 'us'){
    body.innerHTML = sec('secUsers','users','کاربران مؤسسه','اعضای ثبت‌شده و سطح دسترسی آن‌ها در سرور');
    renderSrvUsersSec(body.querySelector('#secUsers .sec-b'));
  }
  else {
    body.innerHTML = sec('secData','file','ممیزی و دفتر تغییرات','همهٔ عملیات مهم روی سرور در اینجا ثبت می‌شود');
    renderSrvDataSec(body.querySelector('#secData .sec-b'));
  }
  if(setAnchor){
    const el = document.getElementById(setAnchor);
    if(el && el.scrollIntoView) try{ el.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){}
    setAnchor = '';
  }
}

/* کاربران مؤسسه از سرور — نقش فقط‌سرور */
async function renderSrvUsersSec(body){
  body.innerHTML = '<p class="hint-t" style="padding:10px 4px">در حال دریافت کاربران از سرور…</p>';
  let users = [];
  try{ const data = await srvFetch('GET','/api/users?institution_id='+SRV.instId); users = data.users||[]; }
  catch(e){ body.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>'; return; }
  const roleFa = {owner:'مالک', admin:'مدیر', user:'کاربر'};
  const rtFa = {manager:'مدیر (دسترسی کامل)', user:'کاربر (دسترسی محدود)'};
  if(!users.length){ body.innerHTML = emptyState({icon:'users', title:'کاربری ثبت نشده', desc:'در حال حاضر فقط شما در این مؤسسه ثبت دارید.'}); return; }
  const myId = SRV.user && SRV.user.id;
  body.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>نام</th><th>تلفن</th><th>ایمیل</th><th>نوع دسترسی</th></tr></thead><tbody>' +
    users.map(u=>{
      const isMgr = (u.role_type||'user')==='manager';
      const canEdit = can('userManage') && (!myId || myId===u.id || u.role==='owner' || u.role==='admin');
      return '<tr><td><b>'+esc(u.name||'—')+'</b>'+(myId && myId===u.id ? ' <span class="badge b-lime">شما</span>':'')+'</td>' +
        '<td class="c-num" dir="ltr">'+esc(u.phone||'—')+'</td>' +
        '<td>'+esc(u.email||'—')+'</td>' +
        '<td>'+(canEdit
          ? '<select data-uid="'+u.id+'" class="u-rt"><option value="manager"'+(isMgr?' selected':'')+'>مدیر (دسترسی کامل)</option><option value="user"'+(!isMgr?' selected':'')+'>کاربر (دسترسی محدود)</option></select>'
          : esc(rtFa[u.role_type]||'کاربر (دسترسی محدود)'))+'</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="hint-t" style="padding:8px 4px 0">'+icon('info',13)+' «مدیر» همهٔ دسترسی‌ها را دارد و «کاربر» بیشتر دسترسی نمایش/ثبت پرداخت. تغییر نقش مستقیم در سرور ذخیره می‌شود.</p>';
  body.querySelectorAll('select.u-rt').forEach(sel=>{
    sel.onchange = async ()=>{
      try{
        await srvFetch('PATCH','/api/users/'+sel.dataset.uid,{role_type: sel.value});
        toast('نقش کاربر در سرور به‌روز شد.','ok');
        renderSrvUsersSec(body);
      }catch(e){ toast(e.message,'err'); renderSrvUsersSec(body); }
    };
  });
}

/* دفتر ممیزی از سرور — جایگزین لاگ محلی دمو */
async function renderSrvDataSec(body){
  body.innerHTML = '<p class="hint-t" style="padding:10px 4px">در حال دریافت دفتر تغییرات از سرور…</p>';
  let rows = [];
  try{ const data = await srvFetch('GET','/api/institutions/'+SRV.instId+'/audit?limit=100'); rows = data.rows||[]; }
  catch(e){ body.innerHTML = '<div class="alert a-err"><span class="al-ic">'+icon('warn',16)+'</span><div>'+esc(e.message)+'</div></div>'; return; }
  body.innerHTML =
    '<div class="alert a-info" style="margin-bottom:12px"><span class="al-ic">'+icon('info',16)+'</span><div>داده‌ها فقط روی سرور نگهداری می‌شوند. پشتیبان‌گیری با ابزار سرور (<code dir="ltr">pg_dump</code>) انجام می‌شود و هیچ نسخهٔ محلی در مرورگر وجود ندارد.</div></div>' +
    (rows.length
      ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>زمان</th><th>عملیات</th><th>تغییر</th><th>توضیح</th><th>کاربر</th></tr></thead><tbody>' +
        rows.map(a=>'<tr><td>'+J.fmtLong(a.created_at)+'</td><td>'+esc(a.action||'—')+'</td><td class="c-num">'+(a.old_value!=null||a.new_value!=null ? esc(String(a.old_value!=null?a.old_value:'—'))+' ← '+esc(String(a.new_value!=null?a.new_value:'—')) : '—')+'</td><td>'+esc(a.note||'—')+'</td><td>'+esc(a.user_name||'—')+'</td></tr>').join('') +
        '</tbody></table></div>'
      : '<div class="empty" style="padding:20px;text-align:center"><div class="e-ic">'+icon('check',26)+'</div><h3>هنوز تغییری ثبت نشده</h3><p class="hint-t">تغییر موجودی صندوق و عملیات مهم مؤسسه به‌صورت خودکار اینجا ثبت می‌شود.</p></div>');
}



const ONBOARD_KEY = 'hesabat-onboard-v1';

// شماره عضویت ساده بدون انگلیسی - per درخواست کاربر، هیچ ستون en ساخته نمی‌شود
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
  
  const hint = document.querySelector('.login-hint');
  if (hint && !hint.dataset.fixed) {
    hint.dataset.fixed = '1';
    hint.innerHTML = '<b>راهنما:</b> نام کاربری = شماره تماس، رمز عبور = کد ملی (پیش‌فرض) — متصل به سرور (PostgreSQL)';
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
          <div class="field"><label>موجودی صندوق <small>(به ${onboardData.currency==='ریال'?'ریال':'تومان'})</small></label><input id="obFundBalance" class="num-inp" inputmode="numeric" value="${onboardData.fundBalance?Number(onboardData.fundBalance).toLocaleString('en-US'):''}" placeholder="0"><span class="help">موجودی فعلی صندوق در شروع کار — بعداً در تنظیمات قابل تغییر است (هر تغییر با توضیح لاگ می‌شود).</span></div>
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
  const obBal = document.getElementById('obFundBalance');
  if (obBal && typeof attachMoney==='function') attachMoney(obBal);
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
    const bal = document.getElementById('obFundBalance');
    if (bal) onboardData.fundBalance = (typeof moneyVal==='function') ? moneyVal(bal) : (parseInt((bal.value||'').replace(/[^0-9]/g,''),10)||0);
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
    fundBalance: onboardData.fundBalance||0,
    memberFields: (onboardData.memberFields||[]).map(label=>{
      const lbl = String(label||'');
      const type = /موبایل|شماره تماس|کد\s*ملی|کدملی/.test(lbl) ? 'number' : (/تاریخ/.test(lbl) ? 'date' : 'text');
      return {label: lbl, type, required: lbl==='نام' || lbl==='نام و نام خانوادگی'};
    }),
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
      try{ await srvSyncInstSettings(); }catch(_){}
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
    // خطای شبکه → فقط‌سرور: ساخت حساب بدون سرور ممکن نیست؛ خطای واضح نشان بده
    if (e && e.network) {
      if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><span class="al-ic">${icon('warn',16)}</span><div>❌ اتصال به سرور برقرار نشد (<code dir="ltr">${esc(typeof SRV!=='undefined'?(SRV.base||'same-origin'):'')}</code>)<br>پیام: ${esc(e.message)}<br><br><b>چک‌لیست:</b><br>۱) آیا بک‌اند روشن است؟ <code>/api/health</code> را در مرورگر باز کن.<br>۲) آیا <code>DATABASE_URL</code> در Render/Railway ست است؟<br>۳) آیا <code>npm run migrate</code> را اجرا کردی؟</div></div>`;
      if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
      return;
    }
    // سایر خطاها → نمایش
    if (alertBox) alertBox.innerHTML = `<div class="alert a-err"><div>خطا: ${esc(e.message)}</div></div>`;
    if (btn) { btn.disabled=false; btn.innerHTML = (typeof icon==='function'?icon('check',14):'✓')+' ایجاد حساب'; }
    return;
  }
  // موفقیت → خودهمان شاخهٔ سرور (serverOk) بالاتر خروجی SESSION/RSV را ساخت و به داشبورد برد
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

