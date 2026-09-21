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
  const handle = {
    overlay: ov,
    el: ov.querySelector('.m-modal'),
    close(){ const i = _modalStack.indexOf(handle); if(i>-1){ _modalStack.splice(i,1); ov.remove(); document.body.style.overflow = _modalStack.length ? 'hidden':''; } if(o.onClose) o.onClose(); }
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
