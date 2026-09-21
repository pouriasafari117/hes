# فیکس‌های Round 33 - اتصال DB + شروع از صفر + تغییر یوزر/پس

## مشکل اصلی: چرا داده در Postgres نمی‌رفت؟
- `SRV.base = ''` (same-origin) بود ولی شرط `if (SRV.base)` در onboarding و login falsy می‌شد → همیشه دمو
- فیکس: شرط به `typeof SRV.base === 'string'` تغییر کرد. حالا '' هم معتبر است.
- وقتی Panel.html از بک‌اند سرو می‌شود (Render/Railway) → `fetch('/api/...')` به همان هاست می‌زند → اتصال برقرار است.
- وقتی با file:// باز می‌کنی → base خودکار `http://localhost:4000` می‌شود. باید بک‌اند را `npm start` کنی و از `http://localhost:4000/Panel.html` باز کنی.

## اتصال به دیتابیس - چک لیست
1. بک‌اند را دیپلوی کن (Render/Railway) یا لوکال `npm start`
2. در تنظیمات → اطلاعات مؤسسه → **اتصال به دیتابیس** آدرس API را ببین:
   - خالی = same-origin (برای Render/Railway که Panel.html را خودش سرو می‌کند)
   - `http://localhost:4000` برای لوکال
   - `https://your-app.onrender.com` اگر Panel.html را جدا باز می‌کنی
3. دکمه **تست اتصال** → باید `✅ متصل!` بدهد
4. حالا افتتاح حساب کن → ایمیل `slug+nid@hes.com` ساخته می‌شود و در `/api/debug` ببینی `users_count` زیاد شد

## شروع از صفر - برگردانده شد
- در `app9.js` patchSettings قبلاً `#setWipe` را حذف می‌کرد → حذف شد.
- حالا در تنظیمات → داده‌ها و ممیزی دو دکمه هست:
  - **بازنشانی داده دمو** → داده نمونه اولیه
  - **شروع از صفر** → همه اعضا/وام‌ها/اقساط/پرداخت‌ها/تراکنش‌ها/صندوق‌ها پاک، فقط کاربران و تنظیمات می‌ماند

## تغییر نام کاربری و رمز برای هر عضو (کاربر/مدیر)
- جدول کاربران (تنظیمات → کاربران) قبلاً username را disabled می‌کرد.
- حالا `userForm` جدید:
  - نام کاربری قابل ویرایش (شماره تماس یا یوزر لاتین)
  - رمز عبور جدید + تکرار رمز، با دکمه چشم
  - در حالت سرور: `PATCH /api/users/:id` یا `PATCH /api/auth/me` صدا می‌زند → Postgres آپدیت
  - در حالت دمو: `DB.users[].password` آپدیت و login با رمز جدید کار می‌کند
- بک‌اند جدید:
  - `PATCH /api/auth/me` → تغییر نام/فون/ایمیل/رمز خودم (با چک رمز فعلی اختیاری)
  - `PATCH /api/users/:id` → ادمین می‌تواند کاربر دیگر را ویرایش کند (نام کاربری/رمز/نقش)
  - `GET /api/users?institution_id=` و `DELETE /api/users/:id`

## فایل‌ها
- `panel.js` تنها فایل منطق است (361KB) — جایگزین کن در روت و backend/
- `hesabat-backend.zip` (167K) شامل `server.js` + `src/routes/users.js` جدید + `delete_institution.sql`
- `hesabat-full.zip` (437K) شامل همه + _build

## تست سریع لوکال
```
cd backend
npm i
npm start
# مرورگر: http://localhost:4000/Panel.html
# تنظیمات → اتصال → تست → باید ok بدهد
# افتتاح حساب مدیر → ببین در /api/debug users_count++
```

## نکته امنیتی
- رمزها با sha256 هش می‌شوند (ساده). در پروداکشن bcrypt بگذار.
- `CORS_ORIGIN=*` برای تست است؛ در پروداکشن دامنه خاص بگذار.
