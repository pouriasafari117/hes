/* پردازش افزودن گروهی اعضا — Parse → Normalize → Validate
   OCR/AI اینجا نیست؛ فقط دادهٔ خام متن/ردیف. ثبت فقط با تأیید جداگانه. */

function faToEnDigits(s){
  return String(s == null ? '' : s)
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

function strip(s){
  return String(s == null ? '' : s).replace(/[\u200c\u200f\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim();
}

function normalizeMobile(raw){
  let s = faToEnDigits(strip(raw)).replace(/[^\d]/g,'');
  if(s.startsWith('0098')) s = s.slice(4);
  if(s.startsWith('98') && s.length >= 12) s = s.slice(2);
  if(s.startsWith('9') && s.length === 10) s = '0'+s;
  return s;
}

function normalizeNid(raw){
  return faToEnDigits(strip(raw)).replace(/[^\d]/g,'');
}

function validNid(s){
  if(!/^\d{10}$/.test(s)) return false;
  if(/^(\d)\1{9}$/.test(s)) return false;
  const d = s.split('').map(Number);
  let sum = 0;
  for(let i=0;i<9;i++) sum += d[i]*(10-i);
  const r = sum % 11;
  return (r < 2 && d[9] === r) || (r >= 2 && d[9] === 11-r);
}

function validMobile(s){
  return /^09\d{9}$/.test(s);
}

function fieldKind(f){
  const blob = ((f.key||'')+' '+(f.label||'')+' '+(f.type||'')).toLowerCase();
  if(f.type==='nid' || /national|nid|کدملی|کد ملی/.test(blob)) return 'nid';
  if(f.type==='mobile' || /mobile|phone|موبایل|تماس/.test(blob)) return 'mobile';
  if(f.type==='date' || /تاریخ|birth|date/.test(blob)) return 'date';
  if(/father|پدر/.test(blob)) return 'father';
  if(/last|خانواد/.test(blob) && !/نام و نام خانوادگی/.test(f.label||'')) return 'last';
  if(/^(name|fname|fullname)$/.test(f.key||'') || /نام/.test(f.label||'')) return 'name';
  return f.type || 'text';
}

function normalizeValue(f, raw){
  const kind = fieldKind(f);
  let v = strip(raw);
  if(kind==='nid') return normalizeNid(v);
  if(kind==='mobile') return normalizeMobile(v);
  if(kind==='number' || f.type==='number') return faToEnDigits(v).replace(/[^\d.-]/g,'');
  return v;
}

function splitLine(line){
  if(line.includes('\t')) return line.split('\t').map(strip);
  if((line.match(/,/g)||[]).length >= 1 && !/،/.test(line)) return line.split(',').map(strip);
  if((line.match(/؛/g)||[]).length >= 1) return line.split('؛').map(strip);
  if((line.match(/\|/g)||[]).length >= 1) return line.split('|').map(strip);
  if(/\s{2,}/.test(line)) return line.split(/\s{2,}/).map(strip);
  return [strip(line)];
}

function headerMap(cells, fields){
  const map = [];
  cells.forEach((cell, i)=>{
    const c = cell.replace(/[:：]/g,'').trim();
    const f = fields.find(x => x.label===c || x.key===c || (x.label && c.includes(x.label)) || (x.label && x.label.includes(c)));
    map[i] = f ? f.key : null;
  });
  return map.some(Boolean) ? map : null;
}

function parseBlocks(text, fields){
  const chunks = String(text||'').split(/\n\s*\n/);
  const rows = [];
  for(const ch of chunks){
    const lines = ch.split(/\r?\n/).map(strip).filter(Boolean);
    if(!lines.length) continue;
    const values = {};
    let usedKv = false;
    for(const ln of lines){
      const m = ln.match(/^(.+?)[:：]\s*(.+)$/);
      if(!m) continue;
      const lab = m[1].trim();
      const f = fields.find(x => x.label===lab || x.key===lab || (x.label && lab.includes(x.label)));
      if(f){ values[f.key] = m[2]; usedKv = true; }
    }
    if(usedKv){ rows.push(values); continue; }
    const nidF = fields.find(f=>fieldKind(f)==='nid');
    const mobF = fields.find(f=>fieldKind(f)==='mobile');
    const nameF = fields.find(f=>fieldKind(f)==='name');
    const vals = {};
    for(const ln of lines){
      const d = faToEnDigits(ln).replace(/[^\d]/g,'');
      if(nidF && /^\d{10}$/.test(d) && !vals[nidF.key]) vals[nidF.key]=d;
      else if(mobF && /^0?9\d{9}$/.test(d) && !vals[mobF.key]) vals[mobF.key]=d;
      else if(nameF && !vals[nameF.key] && /[^\d]/.test(ln)) vals[nameF.key]=ln;
    }
    if(Object.keys(vals).length) rows.push(vals);
  }
  return rows;
}

function parseMemberText(text, fields, template){
  const raw = String(text||'').replace(/^\uFEFF/,'').trim();
  if(!raw) return [];
  const lines = raw.split(/\r?\n/).map(l => l.replace(/\s+$/,'')).filter(l => l.trim());
  if(!lines.length) return [];

  if(template && Array.isArray(template.columns) && template.columns.length){
    const keys = template.columns.map(c => c.key);
    return lines.map(ln => {
      const cells = / {2,}/.test(ln) ? ln.split(/ {2,}/).map(strip) : splitLine(ln);
      const values = {};
      keys.forEach((k,i)=>{ if(k && cells[i]!=null) values[k]=cells[i]; });
      return values;
    }).filter(v => Object.values(v).some(x => strip(x)));
  }

  /* قالب اصلی: هر خط یک نفر؛ فیلدها به ترتیب تعریف مؤسسه؛ جداکننده = دو فاصله یا بیشتر */
  const dsLines = lines.filter(l => / {2,}/.test(l));
  if(dsLines.length && dsLines.length >= Math.ceil(lines.length * 0.5)){
    return lines.map(ln => {
      const cells = ln.split(/ {2,}/).map(strip);
      const values = {};
      fields.forEach((f,i)=>{ if(cells[i]) values[f.key]=cells[i]; });
      return values;
    }).filter(v => Object.values(v).some(x => strip(x)));
  }

  const firstCells = splitLine(lines[0]);
  const hmap = firstCells.length>=2 ? headerMap(firstCells, fields) : null;
  if(hmap){
    return lines.slice(1).map(ln => {
      const cells = splitLine(ln);
      const values = {};
      hmap.forEach((k,i)=>{ if(k && cells[i]!=null) values[k]=cells[i]; });
      return values;
    }).filter(v => Object.values(v).some(x => strip(x)));
  }

  const tabular = lines.filter(l => splitLine(l).length >= 2);
  if(tabular.length >= Math.max(1, Math.floor(lines.length*0.6))){
    const nidF = fields.find(f=>fieldKind(f)==='nid');
    const mobF = fields.find(f=>fieldKind(f)==='mobile');
    const nameF = fields.find(f=>fieldKind(f)==='name');
    return lines.map(ln => {
      const cells = splitLine(ln);
      const values = {};
      const leftover = [];
      for(const c of cells){
        const d = faToEnDigits(c).replace(/[^\d]/g,'');
        if(nidF && /^\d{10}$/.test(d) && !values[nidF.key]) values[nidF.key]=d;
        else if(mobF && /^0?9\d{9}$/.test(d) && !values[mobF.key]) values[mobF.key]=d;
        else leftover.push(c);
      }
      if(nameF && leftover.length && !values[nameF.key]) values[nameF.key]=leftover.join(' ');
      return values;
    }).filter(v => Object.values(v).some(x => strip(x)));
  }

  return parseBlocks(raw, fields);
}

function classifyRow(fields, values, { existingNids, batchNids } = {}){
  const norm = {};
  const errors = [];
  for(const f of fields){
    const nv = normalizeValue(f, values[f.key]);
    norm[f.key] = nv;
    const kind = fieldKind(f);
    if(f.is_required && !nv) errors.push({ key:f.key, code:'missing', msg:'فیلد «'+f.label+'» الزامی است.' });
    else if(nv && kind==='nid' && !validNid(nv)) errors.push({ key:f.key, code:'invalid', msg:'کد ملی «'+f.label+'» نامعتبر است.' });
    else if(nv && kind==='mobile' && !validMobile(nv)) errors.push({ key:f.key, code:'invalid', msg:'شماره موبایل «'+f.label+'» نامعتبر است.' });
  }
  const nidF = fields.find(f=>fieldKind(f)==='nid');
  const nid = nidF ? norm[nidF.key] : '';
  let status = 'ok';
  if(errors.some(e=>e.code==='invalid')) status = 'invalid';
  else if(errors.some(e=>e.code==='missing')) status = 'incomplete';
  if(nid){
    if(existingNids && existingNids.has(nid)) {
      status = 'duplicate';
      errors.push({ key: nidF.key, code:'duplicate', msg:'این کد ملی در مؤسسه ثبت شده است.' });
    } else if(batchNids && batchNids.has(nid)) {
      status = 'duplicate';
      errors.push({ key: nidF.key, code:'duplicate', msg:'این کد ملی در همین فهرست تکراری است.' });
    }
  }
  return { values: norm, status, errors };
}

function previewRows(fields, rawRows, existingNids){
  const batchNids = new Set();
  const nidF = fields.find(f=>fieldKind(f)==='nid');
  return rawRows.map((values, i) => {
    const r = classifyRow(fields, values, { existingNids, batchNids });
    if(nidF && r.values[nidF.key] && r.status!=='duplicate') batchNids.add(r.values[nidF.key]);
    return { i, ...r };
  });
}

module.exports = {
  faToEnDigits, strip, normalizeMobile, normalizeNid, validNid, validMobile,
  fieldKind, normalizeValue, parseMemberText, classifyRow, previewRows
};
