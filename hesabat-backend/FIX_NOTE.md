# فیکس Round 33.3 - داشبورد صفر + فیلدهای انتخابی مؤسسه

## مشکل ۱: عضو ساختی ولی داشبورد صفر می‌زد
**علت:** `pageDashboard()` همیشه از `DB.members.length` (localStorage دمو) می‌خواند. وقتی `SRV.on=true` هست، `DB.members` خالیه چون داده از سرور میاد (`/api/institutions/:id/members`). پس داشبورد ۰ می‌زد حتی با وجود عضو در لیست.

**فیکس:**
- `app8.js` تابع جدید `renderSrvDashboard()`:
  - `GET /api/institutions/:id/fields` → تعداد فیلدها
  - `GET /api/institutions/:id/members?page=1&pageSize=20` → `total` واقعی از Postgres + ۲۰ عضو اخیر
  - استت‌ها: تعداد کل اعضا (سرور)، اعضای صفحه اول، مؤسسه، فیلدها + لیست اعضای اخیر + وضعیت اتصال
- `hookSrvMode` الان `PAGES.dashboard` و `window.pageDashboard` را هم override می‌کند: اگر `SRV.on` باشد → `renderSrvDashboard()`، وگرنه داشبورد قدیمی دمو

الان داشبورد در حالت سرور تعداد واقعی را از Postgres نشان می‌دهد.

## مشکل ۲: تو ساخت مؤسسه فیلد انتخاب می‌کنی ولی باز پیش‌فرض‌ها میاد
**علت:** `auth.js` register-v2 همیشه ۵ فیلد پیش‌فرض (نام، نام پدر، موبایل، کدملی، تاریخ تولد) را می‌ساخت و بعد فیلدهای انتخابی تو را اضافه می‌کرد. تو می‌خواستی فقط «نام و نام پدر» ولی ۵ تا می‌آمد.

**فیکس:**
- `backend/src/routes/auth.js`:
  - مپ فارسی به کلید: `نام`→`name`, `نام پدر`→`father`, `موبایل`→`mobile`, `کدملی`→`nationalId`, `تاریخ تولد`→`birthDate`, `آدرس`→`address`, `شغل`→`job`
  - اگر `memberFields` فرستاده شده و طول>۰ → **دقیقاً همونا** را بساز (نه پیش‌فرض)
  - اگر خالی → ۵ پیش‌فرض را بساز
- `fields.js` GET: اگر هیچ فیلدی نیست، خودکار ۵ پیش‌فرض می‌سازد تا عضو اضافه کردن قفل نشود (قبلاً اضافه شده بود)
- `members.js` POST: اگر فیلدی نیست، اول پیش‌فرض می‌سازد (قبلاً اضافه شده بود) + `genMemberNo` حالا `name` که شامل نام+فامیلی است را درست جدا می‌کند

الان اگه تو onboarding فقط «نام» و «نام پدر» را انتخاب کنی، تو `field_definitions` دقیقاً ۲ تا می‌شیند و تو تنظیمات → فیلدهای اعضا هم همونا را می‌بینی، نه ۵ تا.

## منظم‌سازی DB (درخواست قبلی)
- `backend/db/README.md` توضیح کامل
- `complete_schema.sql` تنها فایل برای نصب تازه (۱۹KB)
- `migrations/001_initial.sql`, `002_v2.sql`, `003_delete_institution.sql`
- `patches/fix_missing_cols.sql` و `fix_missing_cols_minimal.sql` (برای Supabase بدون ROLE)
- `old/` آرشیو فایل‌های قدیمی شلوغ

## فایل‌ها
- `panel.js` 378KB (قبلاً 372KB) — شامل داشبورد سرور + فیکس memberAdd
- `hesabat-backend.zip` 208K
- `hesabat-full.zip` 490K

## تست
1. Railway دیپلوی جدید (چون `auth.js`, `fields.js`, `members.js` عوض شد)
2. `localStorage.clear()` → onboarding جدید → فقط «نام» و «نام پدر» را انتخاب کن → ثبت
3. تنظیمات → فیلدهای اعضا → باید دقیقاً ۲ تا ببینی
4. اعضا → عضو جدید → باید فقط همون ۲ فیلد بیاد (یا اگه خالی بود، ۵ پیش‌فرض خودکار)
5. داشبورد → باید تعداد کل اعضا (سرور) را درست نشان دهد، نه صفر
