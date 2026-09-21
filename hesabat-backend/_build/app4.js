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
  if(h === '#/' || h === '#' || h === ''){ showView('landing'); return; }
  if(h === '#/login'){
    if(SESSION){ location.hash = '#/app/dashboard'; return; }
    showView('login'); return;
  }
  if(h.indexOf('#/app/') === 0){
    if(!SESSION){ location.hash = '#/login'; return; }
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
  input.addEventListener('input', ()=>{
    const q = input.value.trim();
    if(q.length < 2){ box.classList.remove('open'); return; }
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
    panel.querySelectorAll('[data-go]').forEach(b => b.onclick = ()=>{ box.classList.remove('open'); input.value=''; location.hash = b.dataset.go; });
    box.classList.add('open');
  });
  document.addEventListener('click', e => { if(!box.contains(e.target)) box.classList.remove('open'); });
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
  c.fillStyle = '#14351F'; c.textAlign='center';
  c.font = '700 22px "IBM Plex Sans Arabic", sans-serif';
  c.fillText(centerVal, cx, cy+1);
  c.font = '600 11.5px "IBM Plex Sans Arabic", sans-serif';
  c.fillStyle = '#3E5747'; c.fillText(centerTitle, cx, cy+20);
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
    c.strokeStyle = i===4 ? 'rgba(20,53,31,.28)' : 'rgba(20,53,31,.10)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(padL,y); c.lineTo(w-padR+8,y); c.stroke();
    const val = max*(1-i/4);
    c.fillStyle = '#3E5747'; c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif'; c.textAlign = 'left';
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
      c.fillStyle = '#3E5747'; c.font = '700 10px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(lb, cx0, h-24);
      c.fillStyle = '#8A9A8F'; c.font = '600 8.5px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(opts.subLabels[gi]||'', cx0, h-10);
    } else {
      c.fillStyle = '#3E5747'; c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif';
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
    c.strokeStyle = i===4 ? 'rgba(20,53,31,.28)' : 'rgba(20,53,31,.10)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(padL,y); c.lineTo(w-padR+8,y); c.stroke();
    const val = max*(1-i/4);
    c.fillStyle = '#3E5747'; c.font = '600 9.5px "IBM Plex Sans Arabic", sans-serif'; c.textAlign = 'left';
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
      c.fillStyle = '#3E5747'; c.font = '700 10px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(labels[i], xs(i), h-24);
      c.fillStyle = '#8A9A8F'; c.font = '600 8.5px "IBM Plex Sans Arabic", sans-serif';
      c.fillText(opts.subLabels[i]||'', xs(i), h-10);
    } else {
      c.fillStyle = '#3E5747'; c.font = '600 9px "IBM Plex Sans Arabic", sans-serif';
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
      stat('','users','تعداد کل اعضا', fmtN(totalM), faDigits(activeM)+' عضو فعال') +
      stat('s-lime','check','اعضای فعال', fmtN(activeM), faDigits(Math.round(activeM/Math.max(1,totalM)*100))+'٪ کل اعضا') +
      stat('','loan','وام‌های فعال', fmtN(activeLoans.length), faDigits(DB.loans.filter(l=>l.status==='pending').length)+' در انتظار تصویب') +
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
