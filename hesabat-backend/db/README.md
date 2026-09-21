# ساختار فایل‌های دیتابیس — منظم شده

## فایل اصلی برای نصب تازه
- **`complete_schema.sql`** ← **همین یکی را در Supabase SQL Editor اجرا کن برای DB خالی**
  - شامل همه جداول، ستون‌ها (phone, nid, bot_email, member_no, ...)، RLS، و همه توابع (register_v2, create_institution_v2, delete_institution, ...)
  - بدون نیاز به اجرای چند فایل پشت سر هم
  - با `DROP FUNCTION IF EXISTS` برای جلوگیری از ارور 42P13
  - GRANT ها داخل `DO ... EXCEPTION` تا اگر role `hesabat_app` نداری، fail نشود (Supabase)

## پوشه migrations (تاریخچه تغییرات)
برای کسانی که از نسخه قدیمی آپدیت می‌کنند:
- `migrations/001_initial.sql` = نسخه اول (Phase 1) - users, institutions, members, field_definitions
- `migrations/002_v2.sql` = اضافه شدن phone, nid, father_name, birth_date, role_type, bot_email, bot_active, member_no, join_requests + توابع جدید
- `migrations/003_delete_institution.sql` = تابع حذف کامل مؤسسه

اگر DB خالی داری، نیازی به migrations نیست — فقط `complete_schema.sql` را بزن.
اگر DB قدیمی داری و می‌خوای آپدیت کنی: به ترتیب 001 → 002 → 003 را اجرا کن.

## پوشه patches (فیکس برای DB های نیمه‌کاره)
- `patches/fix_missing_cols.sql` = فیکس ستون‌های جاافتاده + بازسازی توابع (با DROP اول) + ساخت role hesabat_app اگر نبود (با try/catch)
- `patches/fix_missing_cols_minimal.sql` = نسخه Supabase بدون ROLE و GRANT — فقط ALTER + FUNCTION — **اگر ارور role hesabat_app گرفتی، این را بزن**

## فایل‌های قدیمی (برای سازگاری نگه داشته شده، استفاده نکن)
- `schema.sql` = همون 001_initial
- `schema_v2.sql` = همون 002_v2 (الان DROP FUNCTION اضافه شده)
- `schema.supabase.sql` = نسخه قدیمی سازگار با Supabase (الان منسوخ، از complete_schema استفاده کن)
- `delete_institution.sql` = همون 003

## چطور اجرا کنم؟

### Supabase (توصیه شده)
1. Supabase → SQL Editor → New Query
2. محتوای `complete_schema.sql` را پیست کن → Run
3. تمام! حالا `/api/health` باید `db_ok:true` بدهد و `/api/debug` باید همه funcs را نشان دهد

### لوکال با migrate.js
```bash
cd backend
# .env باید DATABASE_URL داشته باشد
npm run migrate
# الان migrate.js اول complete_schema.sql را می‌زند، اگر نبود به ترتیب migrations را می‌زند
```

### چک کردن
```bash
curl https://YOUR.up.railway.app/api/health
# → {"ok":true,"v":2,"db_ok":true}

curl https://YOUR.up.railway.app/api/debug
# → users_count, institutions_count, funcs شامل fn_register_user_v2, fn_delete_institution
```

## نکته: چرا قبلاً عضو اضافه نمی‌شد؟
- اگر `field_definitions` خالی بود، backend می‌گفت "فیلد ناشناخته" و عضو ثبت نمی‌شد
- الان در `fields.js` و `members.js` اگر فیلدی نباشد، خودکار ۵ فیلد پیش‌فرض (نام، نام پدر، موبایل، کدملی، تاریخ تولد) ساخته می‌شود تا ثبت عضو قفل نشود
- فرانت‌اند هم در حالت سرور `SHORTCUTS.memberAdd` و `memberForm` را به `srvMemberForm` وصل می‌کند تا هم بنویسد هم بخواند (قبلاً فقط می‌خواند)
