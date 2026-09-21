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
};
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
