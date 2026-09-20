/* تست سرتاسری فاز ۱: ثبت‌نام → مؤسسه → فیلد داینامیک → اعضا → اعتبارسنجی → جداسازی مستأجرها
   اجرا: سرور بالا باشد، سپس  node test/e2e.js */
const BASE = process.env.API_BASE || 'http://localhost:4000';
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('✅', name); } else { fail++; console.log('❌ FAIL', name); } };

async function api(method, path, { token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await r.json(); } catch (_) {}
  return { status: r.status, json };
}

(async () => {
  const rnd = Date.now().toString(36);
  const uA = `admin-${rnd}@test.ir`, uB = `other-${rnd}@test.ir`;

  /* سلامت */
  ok('health', (await api('GET', '/api/health')).json?.ok === true);

  /* ثبت‌نام و لاگین */
  let r = await api('POST', '/api/auth/register', { body: { name: 'مدیر نمونه', email: uA, password: 'secret123' } });
  ok('ثبت‌نام کاربر A', r.status === 201 && r.json.token);
  const tokA = r.json.token;
  r = await api('POST', '/api/auth/register', { body: { name: 'مدیر دیگر', email: uB, password: 'secret123' } });
  ok('ثبت‌نام کاربر B', r.status === 201 && r.json.token);
  const tokB = r.json.token;
  ok('ایمیل تکراری رد می‌شود', (await api('POST', '/api/auth/register', { body: { name: 'x', email: uA, password: 'secret123' } })).status === 409);
  ok('رمز اشتباه رد می‌شود', (await api('POST', '/api/auth/login', { body: { email: uA, password: 'wrong' } })).status === 401);
  r = await api('POST', '/api/auth/login', { body: { email: uA, password: 'secret123' } });
  ok('لاگین صحیح', r.status === 200 && r.json.token);
  ok('بدون توکن رد می‌شود', (await api('GET', '/api/institutions')).status === 401);

  /* ایجاد مؤسسه (بند ۳) */
  r = await api('POST', '/api/institutions', { token: tokA, body: { name: 'قرض الحسنه نمونه', slug: `gh_rezvan_${rnd}` } });
  ok('ایجاد مؤسسه A', r.status === 201 && r.json.id && r.json.slug === `gh_rezvan_${rnd}`);
  const instA = r.json.id;
  ok('اسلاگ تکراری رد می‌شود', (await api('POST', '/api/institutions', { token: tokA, body: { name: 'تکراری', slug: `gh_rezvan_${rnd}` } })).status === 409);
  r = await api('POST', '/api/institutions', { token: tokB, body: { name: 'مؤسسه بی' } });
  ok('ایجاد مؤسسه B', r.status === 201 && r.json.id);
  const instB = r.json.id;
  ok('دریافت مؤسسه', (await api('GET', `/api/institutions/${instA}`, { token: tokA })).status === 200);
  r = await api('PATCH', `/api/institutions/${instA}`, { token: tokA, body: { name: 'قرض الحسنه نمونه ویرایش‌شده' } });
  ok('ویرایش نام مؤسسه', r.status === 200 && r.json.institution.name.includes('ویرایش'));

  /* فیلدهای داینامیک (بند ۵) */
  const mkF = (b) => api('POST', `/api/institutions/${instA}/fields`, { token: tokA, body: b });
  r = await mkF({ key: 'first_name', label: 'نام', type: 'text', is_required: true });
  ok('ایجاد فیلد متن الزامی', r.status === 201 && r.json.field.id);
  const fName = r.json.field.id;
  await mkF({ key: 'national_code', label: 'کد ملی', type: 'nid', is_required: true });
  await mkF({ key: 'phone', label: 'شماره تماس', type: 'mobile' });
  await mkF({ key: 'birth_date', label: 'تاریخ تولد', type: 'date' });
  await mkF({ key: 'age', label: 'سن', type: 'number' });
  await mkF({ key: 'is_active', label: 'فعال', type: 'bool' });
  r = await mkF({ key: 'city', label: 'شهر', type: 'select', options: ['تهران', 'مشهد'] });
  ok('ایجاد فیلد انتخابی', r.status === 201);
  const fCity = r.json.field.id;
  ok('کلید تکراری رد می‌شود', (await mkF({ key: 'city', label: 'شهر ۲', type: 'text' })).status === 409);
  ok('نوع نامعتبر رد می‌شود', (await mkF({ key: 'bad', label: 'بد', type: 'whatever' })).status === 400);
  r = await api('GET', `/api/institutions/${instA}/fields`, { token: tokA });
  ok('دریافت فیلدها (۷ تا)', r.status === 200 && r.json.fields.length === 7);

  /* عضو: اعتبارسنجی (بند ۱۴) */
  const mkM = (values, tok = tokA) => api('POST', `/api/institutions/${instA}/members`, { token: tok, body: { values } });
  r = await mkM({ first_name: 'بدون کد ملی' });
  ok('عضو بدون فیلد الزامی رد می‌شود', r.status === 400);
  r = await mkM({ first_name: 'علی رضایی', national_code: '123' });
  ok('کد ملی ۳ رقمی رد می‌شود', r.status === 400);
  r = await mkM({ first_name: 'علی رضایی', national_code: '1234567890', city: 'شیراز' });
  ok('گزینه خارج از لیست رد می‌شود', r.status === 400);
  r = await mkM({ first_name: 'علی رضایی', national_code: '1234567890', age: 'نه' });
  ok('عدد نامعتبر رد می‌شود', r.status === 400);
  r = await mkM({ first_name: 'علی رضایی', national_code: '1234567890', birth_date: '۱۴۰۳-۹۹-۰۱' });
  ok('تاریخ نامعتبر رد می‌شود', r.status === 400);

  r = await mkM({ first_name: 'علی رضایی', national_code: '۱۲۳۴۵۶۷۸۹۰', phone: '۰۹۱۲۱۲۳۴۵۶۷', birth_date: '۱۳۷۵/۰۴/۰۲', age: '۳۰', is_active: true, city: 'تهران' });
  ok('ایجاد عضو معتبر', r.status === 201 && r.json.member.id);
  const m1 = r.json.member.id;
  ok('مقادیر فارسی ذخیره شده‌اند', r.json.member.values.city === 'تهران' && r.json.member.values.age === '30');
  r = await mkM({ first_name: 'زهرا محمدی', national_code: '0987654321', city: 'مشهد' });
  ok('عضو دوم', r.status === 201);
  const m2 = r.json.member.id;

  /* خواندن/جستجو/ویرایش/حذف نرم */
  r = await api('GET', `/api/institutions/${instA}/members`, { token: tokA });
  ok('لیست اعضا (۲ تا)', r.status === 200 && r.json.total === 2 && r.json.rows.length === 2);
  r = await api('GET', `/api/institutions/${instA}/members?q=زهرا`, { token: tokA });
  ok('جستجوی زهرا', r.status === 200 && r.json.total === 1 && r.json.rows[0].id === m2);
  r = await api('PATCH', `/api/institutions/${instA}/members/${m1}`, { token: tokA, body: { values: { age: '31', city: 'مشهد' } } });
  ok('ویرایش عضو', r.status === 200 && r.json.member.values.age === '31' && r.json.member.values.city === 'مشهد');
  r = await api('PATCH', `/api/institutions/${instA}/members/${m1}`, { token: tokA, body: { values: { age: 'abc' } } });
  ok('ویرایش نامعتبر رد می‌شود', r.status === 400);
  ok('حذف نرم', (await api('DELETE', `/api/institutions/${instA}/members/${m2}`, { token: tokA })).json.deleted === true);
  r = await api('GET', `/api/institutions/${instA}/members`, { token: tokA });
  ok('عضو حذف‌شده در لیست نیست', r.status === 200 && r.json.total === 1);
  ok('دریافت عضو حذف‌شده ۴۰۴', (await api('GET', `/api/institutions/${instA}/members/${m2}`, { token: tokA })).status === 404);

  /* آرشیو فیلد */
  r = await api('DELETE', `/api/institutions/${instA}/fields/${fCity}`, { token: tokA });
  ok('آرشیو فیلد', r.json.archived === true);
  r = await api('GET', `/api/institutions/${instA}/fields`, { token: tokA });
  ok('فیلد آرشیوی در لیست فعال نیست', r.json.fields.length === 6);
  r = await mkM({ first_name: 'تست', national_code: '1111111111', city: 'تهران' });
  ok('نوشتن روی فیلد آرشیوی رد می‌شود', r.status === 400);

  /* جداسازی مستأجرها (بند ۱۰) — کاربر B به دادهٔ مؤسسهٔ A دسترسی ندارد */
  ok('B فیلدهای A را نمی‌بیند', (await api('GET', `/api/institutions/${instA}/fields`, { token: tokB })).status === 403);
  ok('B اعضای A را نمی‌بیند', (await api('GET', `/api/institutions/${instA}/members`, { token: tokB })).status === 403);
  ok('B نمی‌تواند عضو A را بسازد', (await api('POST', `/api/institutions/${instA}/members`, { token: tokB, body: { values: { first_name: 'نفوذی' } } })).status === 403);
  ok('B مؤسسه خودش را دارد', (await api('GET', `/api/institutions/${instB}`, { token: tokB })).status === 200);
  r = await api('POST', `/api/institutions/${instB}/fields`, { token: tokB, body: { key: 'full_name', label: 'نام', type: 'text' } });
  ok('B فیلد خودش را می‌سازد', r.status === 201);
  r = await api('GET', `/api/institutions/${instB}/fields`, { token: tokA });
  ok('A هم فیلدهای B را نمی‌بیند', r.status === 403);

  /* /api/auth/me */
  r = await api('GET', '/api/auth/me', { token: tokA });
  ok('me: فهرست مؤسسات کاربر', r.status === 200 && r.json.institutions.length === 1 && r.json.institutions[0].id === instA);

  console.log(`\n${pass}✅ ${fail}❌`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
