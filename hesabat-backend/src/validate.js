/* اعتبارسنجی سمت سرور برای مقادیر فیلدهای داینامیک (بند ۱۴ سند) */

const FIELD_TYPES = ['text','number','date','bool','select','mobile','nid'];
const KEY_RE = /^[a-z][a-z0-9_]{1,63}$/;

function faToEnDigits(s){ return String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function isDigits(s){ return /^[0-9]+$/.test(faToEnDigits(s)); }

/* تاریخ شمسی/میلادی: ۱۴۰۳/۰۵/۰۲ یا 1403-05-02 یا 2024-05-02 — بررسی ساختاری سبک */
function isValidDateStr(s) {
  const m = faToEnDigits(s).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) return false;
  const mo = +m[2], d = +m[3];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
}

/* مقدار را طبق نوع فیلد نرمال/اعتبارسنجی می‌کند. خروجی: {ok, value?, error?} */
function checkValue(def, raw) {
  const empty = raw === undefined || raw === null || String(raw).trim() === '';
  if (empty) {
    return def.is_required
      ? { ok:false, error: `فیلد «${def.label}» الزامی است.` }
      : { ok:true, value: '' };
  }
  const s = String(raw).trim();
  switch (def.type) {
    case 'number': {
      const fa = faToEnDigits(s);
      if (!/^-?\d+(\.\d+)?$/.test(fa)) return { ok:false, error: `«${def.label}» باید عدد معتبر باشد.` };
      return { ok:true, value: fa };
    }
    case 'date':
      return isValidDateStr(s)
        ? { ok:true, value: s }
        : { ok:false, error: `«${def.label}» باید تاریخ معتبر باشد (مثل ۱۴۰۳/۰۵/۰۲).` };
    case 'bool': {
      const v = String(raw);
      if (['true','false','1','0'].includes(v) || typeof raw === 'boolean')
        return { ok:true, value: (v === 'true' || v === '1' || raw === true) ? 'true' : 'false' };
      return { ok:false, error: `«${def.label}» باید بله/خیر باشد.` };
    }
    case 'select': {
      const opts = Array.isArray(def.options) ? def.options : [];
      return opts.includes(s)
        ? { ok:true, value: s }
        : { ok:false, error: `«${def.label}» باید یکی از گزینه‌های تعریف‌شده باشد.` };
    }
    case 'mobile':
      return isDigits(s.replace(/[\s\-+()]/g,'')) && s.replace(/[\s\-+()]/g,'').length >= 8
        ? { ok:true, value: s }
        : { ok:false, error: `«${def.label}» شماره تماس معتبر نیست.` };
    case 'nid':
      return isDigits(s) && s.length === 10
        ? { ok:true, value: s }
        : { ok:false, error: `«${def.label}» باید ۱۰ رقم باشد.` };
    case 'text':
    default:
      return { ok:true, value: s };
  }
}

/* گرفتن {key: rawValue} و لیست فیلدها → {ok, values?, errors?}
   در حالت partial (ویرایش) فقط فیلدهای ارسالی بررسی می‌شوند. */
function validateValues(fieldDefs, values, { partial = false } = {}) {
  const out = {};
  const errors = [];
  const byKey = new Map(fieldDefs.map(f => [f.key, f]));
  for (const [k, raw] of Object.entries(values || {})) {
    const def = byKey.get(k);
    if (!def) { errors.push(`فیلد ناشناخته: ${k}`); continue; }
    if (def.archived) { errors.push(`فیلد «${def.label}» آرشیو شده و قابل نوشتن نیست.`); continue; }
    const r = checkValue(def, raw);
    if (!r.ok) errors.push(r.error); else out[k] = r.value;
  }
  if (!partial) {
    for (const f of fieldDefs) {
      if (f.is_required && !f.archived && !(f.key in (values || {}))) errors.push(`فیلد «${f.label}» الزامی است.`);
    }
  }
  return errors.length ? { ok:false, errors } : { ok:true, values: out };
}

function validateFieldPayload(body, { partial = false } = {}) {
  const errors = [];
  const label = (body.label || '').trim();
  const type = body.type;
  const key = (body.key || '').trim();
  if (!partial || 'label' in body) { if (!label) errors.push('عنوان فیلد الزامی است.'); if (label.length > 60) errors.push('عنوان فیلد طولانی است.'); }
  if (!partial || 'type' in body) { if (!FIELD_TYPES.includes(type)) errors.push(`نوع فیلد نامعتبر است (${FIELD_TYPES.join('، ')}).`); }
  if (key !== undefined && key !== '' && !KEY_RE.test(key)) errors.push('کلید فیلد فقط حروف کوچک انگلیسی، عدد و _ و با حرف شروع می‌شود.');
  if (body.options !== undefined && !Array.isArray(body.options)) errors.push('گزینه‌های فیلد باید آرایه باشند.');
  return errors;
}

module.exports = { FIELD_TYPES, KEY_RE, checkValue, validateValues, validateFieldPayload };
