/* ═══════════════════════════════════════════════════════════════
   لایهٔ اتصال به سرور (فاز ۲) - نسخه بدون کارت PostgreSQL در تنظیمات
   - اتصال در افتتاح حساب انجام می‌شود
   - کارت تنظیمات حذف شد per Round 32
   - حالت سرور برای اعضا/فیلدها همچنان فعال است
   ═══════════════════════════════════════════════════════════════ */

const SRV_KEY = 'hesabat-srv-v1';
const SRV_DEFAULT_BASE = (typeof location !== 'undefined' && /^https?:$/.test(location.protocol))
  ? '' : 'http://localhost:4000';
let SRV = { base:SRV_DEFAULT_BASE, token:'', user:null, instId:null, instName:'', on:false };
try { const sv = JSON.parse(localStorage.getItem(SRV_KEY)); if(sv && typeof sv === 'object') SRV = Object.assign(SRV, sv); } catch(e){}
// اگر base خالی بود ولی از file:// باز شده، localhost را بگذار
if (typeof location !== 'undefined' && location.protocol === 'file:' && !SRV.base) SRV.base = 'http://localhost:4000';
function srvSave(){ try{ localStorage.setItem(SRV_KEY, JSON.stringify(SRV)); }catch(e){} }
function srvReady(){ return !!(SRV.token && SRV.instId); }
function srvHasBase(){ return typeof SRV.base === 'string'; } // '' هم معتبر است (same-origin)

let SRV_FIELDS = null;

async function srvFetch(method, path, body){
  const headers = {'Content-Type':'application/json'};
  if(SRV.token) headers['Authorization'] = 'Bearer ' + SRV.token;
  const baseUrl = (typeof SRV.base === 'string' ? SRV.base : '').replace(/\/+$/,'');
  let r;
  try {
    r = await fetch(baseUrl + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch(e){
    const err = new Error('اتصال به سرور برقرار نشد ('+ (baseUrl||'same-origin') +'). آدرس سرور را در تنظیمات چک کن.');
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

/* ── کارت اتصال به دیتابیس (ساده) ── */
function injectSrvSec(){ /* برای سازگاری قدیمی */ }
function renderSrvSec(){ /* no-op */ }
async function srvFillInstSel(selectId){ /* no-op - handled in onboarding */ }

async function srvAutoProbe(){
  try{
    if(typeof srvFetch !== 'function') return;
    const baseToTry = (typeof SRV.base === 'string' ? SRV.base : '');
    const h = await srvFetch('GET','/api/health');
    if(h && h.ok){
      console.log('[srv] health ok via', baseToTry||'same-origin', h);
      // اگر قبلاً SRV.on نبود ولی health ok است، یعنی سرور در دسترس است
      // اما توکن نداریم → حالت دمو می‌ماند ولی تست اتصال سبز می‌شود
    }
  }catch(e){
    console.warn('[srv] health probe failed:', e.message);
  }
}
if(typeof window!=='undefined') setTimeout(srvAutoProbe, 1200);

function renderSrvConnSec(box){
  if(!box) return;
  const isFile = typeof location !== 'undefined' && location.protocol === 'file:';
  const baseDisplay = SRV.base === '' ? '(same-origin) ' + (location.origin||'') : (SRV.base || '—');
  const statusHtml = SRV.on && SRV.token ? 
    `<span class="badge b-green"><i class="bd"></i>متصل به سرور</span> <small>${esc(SRV.instName||'مؤسسه #'+SRV.instId)} — ${esc(SRV.user&&SRV.user.email||'')}</small>` :
    `<span class="badge b-gray"><i class="bd"></i>حالت دمو (localStorage)</span> <small>داده در مرورگر ذخیره می‌شود، نه در Postgres</small>`;
  box.innerHTML = `
    <div class="alert ${SRV.on?'a-ok':'a-info'}" style="margin-bottom:12px"><span class="al-ic">${icon(SRV.on?'check':'info',16)}</span><div>${statusHtml}<br><small>آدرس سرور: <code dir="ltr">${esc(baseDisplay)}</code></small></div></div>
    <div class="fields">
      <div class="field"><label>آدرس بک‌اند (API)</label><input id="srvBaseInp" dir="ltr" style="text-align:left" placeholder="https://your-app.onrender.com یا خالی برای same-origin" value="${esc(SRV.base||'')}"><span class="help">خالی = همین هاست (وقتی Panel.html از بک‌اند سرو می‌شود). برای file:// باید http://localhost:4000 بگذاری.</span></div>
      <div class="field"><label>تست اتصال</label><div style="display:flex;gap:8px"><button class="btn btn-soft btn-sm" id="srvTestBtn">${icon('search',14)} تست اتصال</button><button class="btn btn-ghost btn-sm" id="srvClearBtn">${icon('ban',14)} قطع اتصال و رفتن به دمو</button></div><div id="srvTestRes" style="margin-top:8px"></div></div>
    </div>
    <div class="field-row" style="margin-top:12px"><button class="btn btn-solid btn-sm" id="srvSaveBase">${icon('check',14)} ذخیره آدرس سرور</button></div>
    ${isFile ? `<div class="alert a-warn" style="margin-top:12px"><span class="al-ic">${icon('warn',16)}</span><div>شما فایل را با file:// باز کرده‌اید. برای اتصال به دیتابیس باید بک‌اند را اجرا کنی (<code>npm start</code>) و Panel.html را از <code>http://localhost:4000/Panel.html</code> یا از آدرس Render باز کنی، نه با دوبار کلیک.</div></div>` : ''}
  `;
  const inp = box.querySelector('#srvBaseInp');
  const saveBtn = box.querySelector('#srvSaveBase');
  const testBtn = box.querySelector('#srvTestBtn');
  const clearBtn = box.querySelector('#srvClearBtn');
  const resBox = box.querySelector('#srvTestRes');
  if(saveBtn) saveBtn.onclick = ()=>{
    SRV.base = inp.value.trim();
    srvSave();
    toast('آدرس سرور ذخیره شد.','ok');
    renderSrvConnSec(box);
  };
  if(testBtn) testBtn.onclick = async ()=>{
    const oldBase = SRV.base;
    SRV.base = inp.value.trim();
    resBox.innerHTML = '<span class="hint-t">در حال تست...</span>';
    try{
      const h = await srvFetch('GET','/api/health');
      resBox.innerHTML = `<div class="alert a-ok"><div>✅ متصل! پاسخ سرور: ${esc(JSON.stringify(h))}</div></div>`;
      SRV.base = inp.value.trim();
      srvSave();
    }catch(e){
      resBox.innerHTML = `<div class="alert a-err"><div>❌ خطا: ${esc(e.message)}</div></div>`;
      SRV.base = oldBase;
    }
  };
  if(clearBtn) clearBtn.onclick = async ()=>{
    const okc = await askConfirm({title:'قطع اتصال سرور', danger:true, ok:'قطع شود', text:'اتصال به سرور قطع و پنل به حالت دمو برمی‌گردد. توکن و اطلاعات مؤسسه سرور پاک می‌شود.'});
    if(!okc) return;
    SRV.on=false; SRV.token=''; SRV.instId=null; SRV.instName=''; SRV.user=null;
    srvSave();
    toast('به حالت دمو برگشتی.','warn');
    renderSrvConnSec(box);
  };
}

const SRV_TYPE_LABEL = { text:'متن', number:'عدد', date:'تاریخ', bool:'بله/خیر', select:'انتخابی', mobile:'شماره تماس', nid:'کد ملی' };
function srvFieldInput(f, val){
  const id = 'sf_' + f.key;
  const v = val === undefined || val === null ? '' : val;
  const req = f.is_required ? ' <span style="color:var(--red)\">*</span>' : '';
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

let srvQ = '', srvPage = 1;
async function renderSrvMembersPage(){
  const main = $('#main');
  main.innerHTML =
    '<div class="page-head"><div><h1>اعضا و اقساط</h1><div class="ph-sub">حالت سرور — داده از <b>' + esc(SRV.instName || ('مؤسسهٔ #' + SRV.instId)) + '</b> (PostgreSQL)</div></div>' +
      '<div class="ph-actions"><button class="btn btn-primary" id="srvAddMember">' + icon('plus',16) + ' عضو جدید</button></div></div>' +
    '<div class="card tight"><div class="card-b" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<input id="srvSearch" placeholder="جستجو در اعضا…" value="' + esc(srvQ) + '" style="max-width:280px">' +
      '<span class="hint-t" id="srvMeta"></span>' +
    '</div><div class="card-b" id="srvMemBox"><p class="hint-t">در حال دریافت…</p></div></div>';
  $('#srvAddMember').onclick = ()=> srvMemberForm(null);
  $('#srvSearch').oninput = ()=>{ srvQ = $('#srvSearch').value.trim(); srvPage = 1; srvLoadMembers(); };
  await srvLoadMembers();
}
async function srvLoadMembers(){
  const box = $('#srvMemBox'); if(!box) return;
  let fields, data;
  try {
    fields = await srvLoadFields();
    const qs = '/api/institutions/' + SRV.instId + '/members?page=' + srvPage + '&pageSize=30' + (srvQ ? '&q=' + encodeURIComponent(srvQ) : '');
    data = await srvFetch('GET', qs);
  } catch(e){
    box.innerHTML = '<p style="color:var(--red)">' + esc(e.message) + '</p><button class="btn btn-soft btn-sm" onclick="srvLoadMembers()">تلاش دوباره</button>';
    return;
  }
  const meta = $('#srvMeta'); if(meta) meta.textContent = faDigits(data.total) + ' عضو · صفحهٔ ' + faDigits(data.page);
  const show = fields.slice(0, 5);
  if(!data.rows.length){
    box.innerHTML = '<p class="hint-t" style="padding:18px 4px">عضویی پیدا نشد.</p>';
    return;
  }
  const head = show.map(f => '<th>' + esc(f.label) + '</th>').join('') + '<th>وضعیت</th><th></th>';
  const rows = data.rows.map(m => {
    const tds = show.map(f => '<td>' + esc(m.values[f.key] || '—') + '</td>').join('');
    return '<tr>' + tds + '<td>' + (m.status === 'active' ? 'فعال' : 'غیرفعال') + '</td>' +
      '<td><div class="field-row" style="gap:6px;justify-content:flex-end">' +
        '<button class="btn btn-soft btn-xs" data-sme="' + m.id + '">' + icon('pen',13) + ' ویرایش</button>' +
        '<button class="btn btn-soft btn-xs" data-smd="' + m.id + '">' + icon('trash',13) + ' حذف</button>' +
      '</div></td></tr>';
  }).join('');
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  box.innerHTML =
    '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (pages > 1 ? '<div class="field-row" style="gap:8px;justify-content:center;padding:12px 0">' +
      '<button class="btn btn-soft btn-xs" id="srvPrev"' + (srvPage <= 1 ? ' disabled' : '') + '>قبلی</button>' +
      '<span class="hint-t">صفحهٔ ' + faDigits(srvPage) + ' از ' + faDigits(pages) + '</span>' +
      '<button class="btn btn-soft btn-xs" id="srvNext"' + (srvPage >= pages ? ' disabled' : '') + '>بعدی</button></div>' : '');
  const byId = id => data.rows.find(m => String(m.id) === String(id));
  box.querySelectorAll('[data-sme]').forEach(b => b.onclick = ()=> srvMemberForm(byId(b.dataset.sme)));
  box.querySelectorAll('[data-smd]').forEach(b => b.onclick = async ()=>{
    const m = byId(b.dataset.smd);
    const nm = m ? Object.values(m.values).filter(Boolean)[0] || ('#' + m.id) : '#' + b.dataset.smd;
    const okc = await askConfirm({ title:'حذف عضو', danger:true, ok:'حذف شود',
      text:'عضو «' + esc(nm) + '» حذف نرم می‌شود.' });
    if(!okc) return;
    try { await srvFetch('DELETE', '/api/institutions/' + SRV.instId + '/members/' + b.dataset.smd); toast('عضو حذف شد.', 'ok'); srvLoadMembers(); }
    catch(e){ toast(e.message, 'err'); }
  });
  const pv = $('#srvPrev'); if(pv) pv.onclick = ()=>{ srvPage--; srvLoadMembers(); };
  const nx = $('#srvNext'); if(nx) nx.onclick = ()=>{ srvPage++; srvLoadMembers(); };
}
function srvMemberForm(m){
  srvLoadFields().then(fields => {
    const inputs = fields.map(f => srvFieldInput(f, m ? m.values[f.key] : '')).join('');
    openModal({
      title: m ? 'ویرایش عضو #' + faDigits(m.id) : 'عضو جدید (از سرور)',
      body:
        '<div class="fields">' + inputs + '</div>' +
        '<div id="srvFormErr" style="display:none;color:var(--red);font-size:12px;margin-top:8px"></div>' +
        '<div class="field-row" style="gap:8px;justify-content:flex-end;margin-top:12px">' +
          '<button class="btn btn-soft btn-sm" onclick="closeModal()">انصراف</button>' +
          '<button class="btn btn-primary btn-sm" id="srvMemSave">' + icon('check',14) + (m ? ' ذخیره تغییرات' : ' ثبت عضو') + '</button>' +
        '</div>',
      width: 640
    });
    $('#srvMemSave').onclick = async ()=>{
      const values = {};
      for(const f of fields){
        const el = document.getElementById('sf_' + f.key);
        values[f.key] = f.type === 'bool' ? (el.checked ? 'true' : 'false') : (el.value || '');
      }
      const errBox = $('#srvFormErr');
      try {
        if(m) await srvFetch('PATCH', '/api/institutions/' + SRV.instId + '/members/' + m.id, { values });
        else await srvFetch('POST', '/api/institutions/' + SRV.instId + '/members', { values });
        toast(m ? 'عضو به‌روزرسانی شد.' : 'عضو ثبت شد.', 'ok');
        closeModal(); srvLoadMembers();
      } catch(e){
        errBox.style.display = '';
        errBox.innerHTML = esc(e.message) + (Array.isArray(e.details) ? '<br>' + e.details.map(esc).join('<br>') : '');
      }
    };
  }).catch(e => toast(e.message, 'err'));
}

/* ── قلاب‌های مسیریابی: حالت سرور فقط اعضا و فیلدها را عوض می‌کند ── */
(function hookSrvMode(){
  if (typeof PAGES !== 'undefined' && PAGES.members) {
    const _pgMembers = PAGES.members;
    PAGES.members = function(arg){ if(SRV.on && srvReady()) return renderSrvMembersPage(); return _pgMembers(arg); };
  }
  // دیگر injectSrvSec در تنظیمات صدا زده نمی‌شود
})();
