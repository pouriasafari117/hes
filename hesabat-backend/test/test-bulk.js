const b = require('../src/bulk');
let bad=0,n=0;
function T(name,ok){ n++; if(!ok){ bad++; console.log('✘',name); } else console.log('✔',name); }

const fields = [
  {key:'name', label:'نام و نام خانوادگی', type:'text', is_required:true},
  {key:'nationalId', label:'کد ملی', type:'nid', is_required:true},
  {key:'mobile', label:'شماره تماس', type:'mobile', is_required:true},
];

T('normalize ارقام فارسی', b.normalizeNid('۰۰۱۲۳۴۵۶۷۸')==='0012345678');
T('موبایل ۹۱۲ → 0912', b.normalizeMobile('۹۱۲۱۲۳۴۵۶۷')==='09121234567');
T('nid نامعتبر ۱۰ رقم تکراری', b.validNid('0000000000')===false);
T('nid طول', b.validNid('123')===false);

const text = 'نام و نام خانوادگی\tکد ملی\tشماره تماس\nعلی محمدی\t0000000019\t09121234567\n';
const rows = b.parseMemberText(text, fields);
T('parse هدر فارسی', rows.length===1 && rows[0].name==='علی محمدی');

const prev = b.previewRows(fields, [
  {name:'علی', nationalId:'0000000019', mobile:'09121234567'},
  {name:'', nationalId:'0000000019', mobile:'09120000000'},
  {name:'رضا', nationalId:'123', mobile:'0912'},
], new Set(['1111111111']));
T('وضعیت معتبر/تکراری/نامعتبر', prev[0].status==='ok' && prev[1].status==='duplicate' && prev[2].status==='invalid');

const block = 'علی محمدی\n0074251638\n09121234567';
const br = b.parseMemberText(block, fields);
T('parse بلوک', br.length>=1 && br[0].nationalId);

const dsFields = [
  {key:'name', label:'نام', type:'text', is_required:true},
  {key:'mobile', label:'شماره تماس', type:'mobile', is_required:true},
  {key:'father', label:'نام پدر', type:'text', is_required:false},
];
const ds = b.parseMemberText('علی صفری  0938656585  علی\nرضا احمدی  09120000000  محمد', dsFields);
T('دو فاصله: هر خط یک نفر به ترتیب فیلدها', ds.length===2 && ds[0].name==='علی صفری' && ds[0].mobile==='0938656585' && ds[0].father==='علی');
T('دو فاصله نفر دوم', ds[1].name==='رضا احمدی' && ds[1].father==='محمد');

console.log(bad? 'FAIL '+bad : 'ALL-PASS '+n);
process.exit(bad?1:0);
