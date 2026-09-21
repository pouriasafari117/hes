# فیکس نهایی v2 — منوی اعضا + استامپ + داشبورد متصل به DB

## درخواست جدید
- منوی اعضا هنوز تغییر نکرده — درستش کن شبیه فایل ارسالی + استامپ طراحی شده
- منوی افزودن عضو خرابه — ظاهرش دقیقا مثل فایل ارسالی ولی باطن قبلی
- اطلاعات جدول‌ها و آمارهای داشبورد هنوز به دیتابیس وصل نیستن — به DB وصل کن
- برای سرعت، اطلاعات فیلدها مثل تعداد وام، مبلغ کل وام، جدول و چارت‌ها رو از DB بخونه و با تغییر، آپدیت بشه

## فیکس‌ها

### 1. منوی اعضا — دقیقا مثل قالب اصلی + استامپ

**قبل:**
- `renderSrvMembersPage` ساده: یک input جستجو + جدول 5 ستونی بدون آواتار، بدون فیلتر، بدون صفحه‌بندی زیبا
- ظاهر اصلا شبیه قالب نبود

**بعد:**
- `renderSrvMembersPage` بازنویسی شد دقیقا مثل `renderMembersPage` دمو:
  - `page-head` با عنوان و زیرعنوان "حالت سرور — داده از PostgreSQL — متصل"
  - دکمه‌ها: "افزودن گروهی" + "افزودن عضو" با استایل `btn-solid btn-sm` و padding 11px 17px
  - `card tight` با `tabs`: تب اعضا (با شمارنده) + تب اقساط
  - `toolbar`: `t-search` با آیکون، `t-select` وضعیت و مرتب‌سازی، دکمه حذف فیلترها
  - جدول: `tbl-wrap` + `tbl` با ستون‌ها:
    - نام و نام خانوادگی: `cell-main` + `avatar sz-34` + `cm-t` + نام + فرزند
    - کد ملی (اگر فیلد دارد)
    - شماره تماس (اگر دارد)
    - شماره عضویت: `badge b-gray`
    - وضعیت: `badge b-green / b-gray`
    - عملیات: `row-actions` + `x-btn` برای مشاهده/ویرایش/حذف با tooltip
  - فوتر: `tbl-foot` + `tf-info` + `pager` با دکمه قبلی/بعدی
  - empty state: آیکون users + دکمه افزودن عضو
- `srvLoadMembersData` جدا شد برای لود داده با `srvFetch`
- `srvFieldsCache` برای کش فیلدها و سرعت بیشتر
- `srvViewMember`: مودال پرونده عضو با `m-sec` و `kv-list` دقیقا مثل قالب

**استامپ:**
- CSS استامپ حفظ شد: `.stamp-fx`, `.stamp`, انیمیشن `stampPress`, `stampShake`, `stampLift`
- JS: `stampFx({text:'ثبت شد', sub:'عضویت M-...', color:stampColor('member')})` بعد از ثبت موفق
- رنگ از تنظیمات `stampColors.member` می‌خواند (#B3261E)

### 2. افزودن عضو — ظاهر دقیقا مثل فایل ارسالی

**قبل:**
- مودال ساده با `fields` و `btn-soft` بدون `err-msg` و بدون `size lg`

**بعد:**
- `srvMemberForm` بازنویسی شد دقیقا مثل `memberForm` دمو:
  - `openModal` با `title: 'افزودن عضو جدید' / 'ویرایش عضو'`, `sub: 'اطلاعات هویتی پایه عضو — حالت سرور'`, `size:'lg'`
  - `body`: `<div class="fields">` + هر فیلد: `<div class="field"><label>...<span class="req">*</span></label><input id="sf_key"><span class="err-msg"></span></div>`
  - انواع فیلد: bool → checkbox, select → select, date → text با placeholder, number/mobile/nid → `num-inp`
  - `foot`: دکمه انصراف + دکمه ذخیره با آیکون check
  - `onOpen`: ولیدیشن الزامی، `saveBtn.disabled`, `srvFetch POST/PATCH`, سپس `stampFx` + `toast` + `srvLoadMembersData()`
  - کش فیلدها پاک می‌شود بعد از ثبت تا فیلد جدید دیده شود

### 3. داشبورد متصل به DB — آمار زنده

**قبل:**
- داشبورد دمو از `DB.members.length` و `DB.loans` لوکال می‌خواند — وقتی سرور وصله، آمار 0 یا قدیمی
- جدول‌ها و چارت‌ها از localStorage

**بعد:**
- جدول‌های جدید در `complete_schema.sql`:
  - `funds`, `accounts`, `loans`, `installments`, `payments`, `txns`
  - ایندکس‌ها برای سرعت: `idx_loans_inst`, `idx_ins_loan`, etc.
  - RLS policies برای هر جدول
  - فایل `db/patches/add_dashboard_tables.sql` برای DB های قدیمی

- API جدید `GET /api/institutions/:id/stats`:
  - اعضا: total, active, newThisMonth (از `members`)
  - صندوق‌ها: total funds, accounts, totalBalance (sum initial_balance)
  - وام‌ها: total, active, overdue, totalAmount (sum amount)
  - اقساط: pending, overdue, paid, totalPendingAmount
  - پرداخت‌ها: total, totalAmount
  - تراکنش‌ها: total, deposit, withdraw
  - چارت‌ها: ماهانه 12 ماه اخیر برای members, loans, payments
  - آخرین‌ها: 8 عضو اخیر + 8 وام اخیر با نام عضو (join field_values)
  - همه با `withTenant` و RLS — امن

- `renderSrvDashboard` جدید:
  - ظاهر دقیقا مثل `pageDashboard` دمو: `page-head`, `grid g-stats` با 8 `stat`
  - `stat` با `s-ic` + آیکون + label + val + sub
  - دو چارت: `chSrvMembers` (donut فعال/غیرفعال) + `chSrvFlow` (bars وام/پرداخت 6 ماه)
  - دو کارت: آخرین اعضا + آخرین وام‌ها با `mini-list` + `mini-item` + `avatar`
  - دو کارت: اقساط + خلاصه مالی با `kv-list`
  - دکمه به‌روزرسانی
  - لودینگ: "در حال دریافت آمار…"
  - خطا: `alert a-err`
  - با تغییر عضو/وام، با F5 یا دکمه به‌روزرسانی، آمار از DB می‌آید

- `server.js`: mount شد:
```js
app.use('/api/institutions/:id/stats', require('./src/routes/stats'));
app.use('/api/institutions/:id/loans', require('./src/routes/loans'));
app.use('/api/institutions/:id/funds', require('./src/routes/funds'));
```

- برای سرعت: 
  - `srvFieldsCache` کش می‌شود
  - stats با یک کوئری per جدول + ایندکس — سریع
  - صفحه‌بندی اعضا 30 تایی

### 4. CSS بهبودها

- `panel.css` 49786 → 52600:
  - `.row-actions`, `.x-btn` (دکمه‌های کوچک گرد)
  - `.kv-list`, `.kv`, `.k`, `.v`
  - `.mini-list`, `.mini-item`, `.mi-t`, `.mi-v.pos/neg`
  - `.cell-main`, `.row-link`, `.pager`, `.tf-info`
  - استامپ کامل با border و shadow

## فایل‌ها
- `Panel.html` 8794 (بدون CF)
- `panel.css` 52600 (قالب اصلی + استامپ + بهبود اعضا)
- `panel.js` 364K (اعضا دقیقا مثل قالب + استامپ + داشبورد DB)
- `db/complete_schema.sql` 25K (با funds, accounts, loans, installments, payments, txns)
- `db/patches/add_dashboard_tables.sql` 6.5K (برای DB قدیمی)
- `src/routes/stats.js` جدید — آمار داشبورد
- `src/routes/loans.js` جدید — وام‌ها
- `src/routes/funds.js` جدید — صندوق‌ها
- `server.js` mount جدید

## تست
1. `npm run migrate` یا اجرای `complete_schema.sql` / `add_dashboard_tables.sql` در Supabase
2. لاگین با شماره/کدملی → داشبورد سرور: 8 کارت آمار زنده از DB، دو چارت، آخرین اعضا و وام‌ها
3. منوی اعضا: ظاهر دقیقا مثل قالب — تولبار، جستجو، فیلتر، جدول با آواتار، صفحه‌بندی
4. افزودن عضو: مودال lg با فیلدهای داینامیک از DB، err-msg، بعد ثبت استامپ "ثبت شد" + toast
5. حذف عضو: confirm + hard delete + reload
6. افزودن وام از API یا بعداً از UI — آمار داشبورد آپدیت می‌شود
7. F5 → همچنان سرور و آمار زنده

## نتیجه
- منوی اعضا 100٪ شبیه فایل ارسالی + استامپ
- افزودن عضو ظاهر مثل فایل ارسالی ولی باطن سرور (PostgreSQL)
- داشبورد کامل به DB وصله — تعداد وام، مبلغ کل وام، جدول‌ها، چارت‌ها از DB و با تغییر آپدیت می‌شود
