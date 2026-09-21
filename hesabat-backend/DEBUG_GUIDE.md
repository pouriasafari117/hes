# چرا دیتابیس خالی می‌ماند؟ راهنمای دیباگ سریع

## ۱) بک‌اند واقعاً به Postgres وصل است؟
مرورگر را باز کن:
- `https://YOUR-BACKEND.onrender.com/api/health`
  - باید `{"ok":true,"db_ok":true}` بدهد
  - اگر `db_ok:false` → `DATABASE_URL` اشتباه یا DB خاموش
- `https://YOUR-BACKEND.onrender.com/api/debug`
  - باید `users_count`, `institutions_count`, `funcs` شامل `fn_register_user_v2`, `fn_create_institution_v2`, `fn_delete_institution` باشد
  - اگر خطا `function does not exist` → migration اجرا نشده

### حل migration
در Render Shell یا لوکال:
```bash
cd backend
# .env باید DATABASE_URL داشته باشد (یا ADMIN_URL)
npm run migrate
# لاگ باید بگوید schema.sql, schema_v2.sql, delete_institution.sql applied
```

یا در Supabase SQL Editor:
- فایل‌های `db/schema.sql`, `db/schema_v2.sql`, `db/delete_institution.sql` را به ترتیب اجرا کن.

## ۲) پنل از کجا سرو می‌شود؟
- **درست:** `https://YOUR-BACKEND.onrender.com/Panel.html` → `SRV.base=''` (same-origin) → `fetch('/api/...')` به همان هاست می‌زند
- **غلط:** دوبار کلیک روی فایل → `file:///C:/.../Panel.html` → `SRV.base='http://localhost:4000'` → اگر بک‌اند روی Render است، به localhost می‌زند و fail → fallback به دمو

چک کن: کنسول مرورگر (F12) → `localStorage.getItem('hesabat-srv-v1')`
- باید `{"base":"","on":true,"instId":...,"token":"..."}`
- اگر `base` خالی و `on:false` → هنوز لاگین/ثبت‌نام سرور انجام نشده

## ۳) افتتاح حساب چه می‌کند؟
- در `Panel.html#/onboarding` فرم را پر می‌کنی → `POST /api/auth/register-v2`
- اگر موفق → توکن و instId در `hesabat-srv-v1` ذخیره، `SRV.on=true`
- اگر ناموفق → الان دیگر ساکت به دمو نمی‌رود، بلکه خطا را با چک‌لیست نشان می‌دهد و دکمه «ادامه در حالت دمو» دارد.

## ۴) چک‌لیست Render/Railway
- Root Directory = `backend` (اگر از روت ریپو دیپلوی می‌کنی)
- Environment Variables:
  - `DATABASE_URL=postgres://...` (از Supabase Connection String, با `?sslmode=require`)
  - `JWT_SECRET=یک رشته طولانی تصادفی`
  - `PORT=10000` (Render) یا خالی (Railway)
  - `CORS_ORIGIN=*`
- Logs: باید ببینی `Hesabat API on http://localhost:10000` و بعد از اولین درخواست، خطای DB نباشد.

## ۵) بعد از فیکس
1. `localStorage.clear()` در کنسول (برای پاک کردن دمو)
2. رفرش → `Panel.html#/onboarding` → مدیر جدید بساز
3. برو ` /api/debug` → باید `recent_users` و `recent_institutions` جدید را ببینی
4. داشبورد باید بنر سبز «متصل به PostgreSQL» نشان دهد، نه زرد «حالت دمو»

## ۶) اگر هنوز مشکل داری
- اسکرین‌شات از `/api/health` و `/api/debug`
- اسکرین‌شات از کنسول مرورگر بعد از افتتاح حساب (خطای قرمز)
- مقدار `localStorage.getItem('hesabat-srv-v1')`
را بفرست تا دقیق بگویم کجای زنجیره قطع است.
