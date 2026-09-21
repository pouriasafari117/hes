# فیکس نهایی Round 33.5 - سازماندهی + ورود + بدون en

## مشکلاتی که گفتی
1. حساب می‌سازی ولی وارد پنل نمی‌شه، «در حال ورود» گیر می‌کنه
2. از ورود هم می‌زنی می‌گه حسابی وجود نداره
3. ستون‌های en-name نمی‌خوای کلا نساز
4. فایل‌ها شلوغه

## فیکس‌ها

### ۱) ورود گیر می‌کرد
- `app4.js` route بازنویسی: اگر `SRV.on && SRV.token` داری، حتی اگر `SESSION` نداری، `SESSION` از `SRV.user` ساخته می‌شه و اجازه می‌ده بری `#/app/dashboard`
- `app9.js` register-v2: بعد موفقیت، `SESSION` هم ذخیره می‌شه (username=phone, name=first+last, role=admin) و بعد `location.hash='#/app/dashboard'` + `reload()`. قبلاً فقط `Panel.html#/app/dashboard` می‌زد که گاهی کار نمی‌کرد.

### ۲) لاگین می‌گه حسابی وجود نداره
- `backend/src/routes/auth.js` کاملاً بازنویسی شد **بدون تکیه بر تابع‌های قدیمی DB**:
  - register-v2: مستقیم `INSERT INTO users(first_name, last_name, name, phone, nid, ...)` + چک تکراری phone/nid با SELECT
  - login: مستقیم `SELECT ... FROM users WHERE lower(phone)=lower($1) OR nid=$1 OR lower(email)=lower($1)` — با `faToEnDigits` برای فارسی
  - دیگر ارور `fn_user_by_phone does not exist` یا return type عوض شده پیش نمیاد
- `members.js` genMemberNo ساده شد: `M-` + 6 رقم کدملی + 4 رقم تصادفی، بدون `faToEnTranslit` — پس نیازی به ستون en نیست

### ۳) ستون‌های en کلا نساز
- `complete_schema.sql` (19K): فقط `first_name, last_name` دارد، `first_name_en/last_name_en` حذف
- `migrations/002_v2.sql`: همین‌طور
- `patches/fix_missing_cols.sql` و `minimal`: الان `DROP COLUMN IF EXISTS first_name_en/last_name_en` می‌کنند
- `patches/drop_en_fields.sql` جدید: فقط همین دو خط — **برای DB فعلی‌ات فقط همین را تو Supabase بزن**:
  ```sql
  alter table users drop column if exists first_name_en;
  alter table users drop column if exists last_name_en;
  ```
- `backend/*.sql` اضافی در روت پاک شد

### ۴) فایل‌ها منظم شد
```
backend/db/
  complete_schema.sql      ← فقط همین برای نصب تازه
  README.md                ← توضیح کامل
  migrate.js
  migrations/
    001_initial.sql
    002_v2.sql
    003_delete_institution.sql
  patches/
    drop_en_fields.sql     ← فقط برای حذف en از DB موجود
    fix_missing_cols.sql
    fix_missing_cols_minimal.sql
  old/                     ← آرشیو شلوغی‌های قبلی
```
- `backend/` روت دیگه هیچ `.sql` ندارد
- `hesabat-backend.zip` 201K تمیز

### ۵) حذف عضو و تنظیمات فیلدها (از قبل)
- `members.js` DELETE الان hard delete: `DELETE FROM member_field_values` + `DELETE FROM members`
- `app7.js` settings: اگر `SRV.on` باشه `srvFieldsSec` از سرور می‌خواند، دقیقاً همون فیلدهایی که انتخاب کردی (نه همه تیک‌ها)
- `app9.js` buildDemoFields: دمو هم دقیقاً بر اساس انتخاب کاربر فیلد می‌سازد

## چطور آپدیت کنی
1. **Supabase SQL Editor** → `drop_en_fields.sql` را Run کن (اگر en داری)
2. **اختیاری** اگر ستون‌های دیگر جاافتاده: `fix_missing_cols_minimal.sql` را Run کن
3. **Railway** → بک‌اند را ری‌دیپلوی کن (چون `auth.js` و `members.js` عوض شد)
4. مرورگر → `localStorage.clear()` → `Panel.html#/onboarding` → فقط نام و نام پدر انتخاب کن → ایجاد حساب → باید مستقیم بره داشبورد
5. ورود با شماره تماس + کدملی → باید کار کند
6. تنظیمات → فیلدهای اعضا → باید فقط همون ۲ تا باشد
