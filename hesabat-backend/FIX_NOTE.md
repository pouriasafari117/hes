# فیکس Round 33.1 - چرا DB خالی می‌ماند؟

## ریشه‌یابی
شما `hesabat-full.zip` را جایگزین کردی ولی هنوز DB خالی → ۳ علت محتمل:

1. **migration اجرا نشده:** `fn_register_user_v2` و `fn_create_institution_v2` در Postgres نیست → `/api/auth/register-v2` خطای `function does not exist` می‌دهد → پنل ساکت می‌رفت دمو (قبلاً)
2. **Panel.html با file:// باز شده:** `SRV.base='http://localhost:4000'` ولی بک‌اند روی Render است → اتصال fail
3. **DATABASE_URL ست نیست:** `/api/health` می‌گوید `db_ok:false`

## چی فیکس شد الان؟

### بک‌اند
- `db/migrate.js` قبلاً فقط `schema.sql` را می‌زد، حالا `schema.sql + schema_v2.sql + schema.supabase.sql + delete_institution.sql` را به ترتیب می‌زند. `ADMIN_URL` هم از `DATABASE_URL` می‌خواند.
- `server.js`:
  - `/api/health` حالا واقعاً DB را چک می‌کند → `{ok:true, db_ok:true}` یا `{db_ok:false, error:...}`
  - `/api/debug` حالا `institutions_count`, `recent_institutions`, `recent_users` هم برمی‌گرداند تا ببینی ثبت شده یا نه.

### فرانت‌اند (panel.js 369KB)
- `submitOnboarding` دیگر ساکت به دمو نمی‌رود:
  - اول بنر «در حال اتصال به سرور (same-origin / URL)...» نشان می‌دهد
  - اگر سرور خطای 400-500 بدهد (مثلاً تکراری)، خطا را با status نشان می‌دهد و متوقف می‌شود
  - اگر network fail، چک‌لیست کامل + دکمه «ادامه در حالت دمو» نشان می‌دهد
  - اگر موفق، بنر سبز «✅ حساب در Postgres ساخته شد! ایمیل ربات: ...»
- `patchSettings` دیگر `secSrv` را حذف نمی‌کند → در تنظیمات → اطلاعات مؤسسه → **اتصال به دیتابیس** همیشه هست (برای دیباگ)
- `pageDashboard` بنر جدید:
  - سبز: «متصل به PostgreSQL — مؤسسه ... — آدرس same-origin — دیباگ DB» + دکمه دیباگ که `/api/debug` را pretty-print می‌کند
  - زرد: «حالت دمو (localStorage) — داده در Postgres نمی‌رود» + لینک تنظیمات + نمایش آدرس فعلی + هشدار file://
- `app8.js`:
  - `srvHasBase()` اضافه، `srvAutoProbe()` که `/api/health` را ۱.۲ ثانیه بعد از لود چک می‌کند
  - `srvFetch` پیام خطا را با base نمایش می‌دهد

### مستندات
- `DEBUG_GUIDE.md` اضافه شد با چک‌لیست Render/Railway + تست `/api/health` و `/api/debug` + `localStorage.getItem('hesabat-srv-v1')`

## چطور الان درست تست کنی؟

1. **بک‌اند را آپدیت کن:**
   - فایل‌های جدید را جایگزین کن (مخصوصاً `server.js`, `db/migrate.js`, `src/routes/users.js`)
   - در Render/Railway: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=*` را چک کن
   - یک بار `npm run migrate` بزن (یا در Supabase SQL Editor فایل‌های `db/*.sql` را به ترتیب اجرا کن)
   - لاگ باید بگوید `Hesabat API on ...` بدون خطای DB

2. **سلامت را چک کن:**
   - مرورگر: `https://YOUR.onrender.com/api/health` → باید `db_ok:true`
   - `https://YOUR.onrender.com/api/debug` → باید `funcs` شامل `fn_register_user_v2` باشد، `users_count` عدد

3. **پنل را از بک‌اند باز کن، نه file://:**
   - `https://YOUR.onrender.com/Panel.html` (یا `/Hesabat.html`)
   - F12 → Console → `localStorage.clear()` → رفرش
   - `#/onboarding` → مدیر جدید بساز
   - اگر خطا دیدی، متن خطا + `/api/debug` را بفرست

4. **بعد از ثبت:**
   - داشبورد باید بنر سبز «متصل به PostgreSQL» باشد
   - `/api/debug` → `recent_institutions` باید مؤسسه جدید + `bot_email` مثل `mehregan1234567890@hes.com` را نشان دهد
   - تنظیمات → اتصال → تست اتصال → `✅ متصل!`

## فایل‌ها
- `panel.js` تنها فایل منطق (369KB)
- `hesabat-backend.zip` (173K) شامل `server.js` جدید + `migrate.js` جدید + `users.js` + `DEBUG_GUIDE.md`
- `hesabat-full.zip` (449K) همه چیز
