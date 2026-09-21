# ساختار فایل‌های دیتابیس — نسخه نهایی تمیز

## فایل اصلی برای نصب تازه (فقط همین یکی)
- **`complete_schema.sql`** → برای DB خالی، فقط همین را در Supabase SQL Editor اجرا کن
  - جداول: users (بدون هیچ ستون en), institutions, field_definitions, members, member_field_values, institution_members, institution_join_requests
  - ستون‌ها: phone, nid, father_name, birth_date, first_name, last_name, role_type, bot_email, member_no, ...
  - RLS + توابع + DROP FUNCTION guards + GRANT tolerant
  - **هیچ ستون first_name_en / last_name_en ساخته نمی‌شود** per درخواست کاربر

## پوشه migrations (تاریخچه)
- `001_initial.sql` = نسخه اول
- `002_v2.sql` = phone, nid, father_name, birth_date, first_name, last_name, role_type, bot_email, member_no, join_requests (بدون en)
- `003_delete_institution.sql` = حذف کامل مؤسسه

اگر DB خالی داری: فقط `complete_schema.sql`
اگر DB قدیمی داری: 001 → 002 → 003

## پوشه patches (برای DB های موجود)
- `fix_missing_cols.sql` = اضافه کردن ستون‌های جاافتاده + حذف en + بازسازی توابع
- `fix_missing_cols_minimal.sql` = نسخه Supabase بدون ROLE (اگر ارور role گرفتی این را بزن) + حذف en
- `drop_en_fields.sql` = **فقط برای حذف دو ستون اضافی انگلیسی** — اگر قبلاً نصب کردی و می‌خوای en ها را پاک کنی، فقط همین را اجرا کن:
  ```sql
  alter table users drop column if exists first_name_en;
  alter table users drop column if exists last_name_en;
  ```

## پوشه old (آرشیو - استفاده نکن)
فایل‌های قدیمی شلوغ قبلاً اینجا منتقل شد.

## بک‌اند - تغییرات Round 33.4
- `src/routes/auth.js` کاملاً بازنویسی شد: مستقیم INSERT بدون تکیه بر تابع قدیمی → مشکل "حسابی وجود ندارد" حل شد
- `src/routes/members.js` DELETE الان hard delete است (پاک از member_field_values و members) نه soft delete
- `src/routes/fields.js` اگر فیلدی نباشد خودکار 5 پیش‌فرض می‌سازد (برای جلوگیری از قفل)
- شماره عضویت الان ساده `M-` + 6 رقم کدملی + 4 رقم تصادفی است، بدون نیاز به نام انگلیسی

## فرانت‌اند - تغییرات Round 33.4
- `app4.js` route: اگر SRV.token داری، SESSION خودکار ساخته می‌شود → مشکل "در حال ورود" گیر کردن حل شد
- `app9.js` register-v2: بعد موفقیت SESSION هم ذخیره می‌شود + hash به dashboard + reload
- `app9.js` buildDemoFields(): فیلدهای دمو دقیقاً بر اساس انتخاب کاربر (مثلاً فقط نام و نام پدر) ساخته می‌شود
- `app7.js` renderSettings(): اگر SRV.on باشد، srvFieldsSec از سرور می‌خواند (دقیقاً انتخاب کاربر) نه همه تیک‌ها
- `genMemberNo` ساده شد: بدون faToEnTranslit، فقط M- + کدملی

## چطور اجرا کنم
Supabase → SQL Editor → New Query → محتوای `complete_schema.sql` → Run
یا اگر DB قدیمی داری:
1. `drop_en_fields.sql` → Run (حذف en)
2. `fix_missing_cols_minimal.sql` → Run (اضافه کردن ستون‌های جدید اگر جاافتاده)

چک:
```
curl https://YOUR.up.railway.app/api/health → {ok:true, db_ok:true}
curl https://YOUR.up.railway.app/api/debug → users_count etc
```
