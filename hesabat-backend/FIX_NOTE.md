# فیکس Round 33.4 - ورود بعد از ثبت + حذف فیلدهای انگلیسی + حذف سخت اعضا + تنظیمات فیلدها

## ۱) مشکل «در حال ورود ولی وارد پنل مؤسسه نمیشه»
**علت:** 
- `route()` در `app4.js` فقط `SESSION` را چک می‌کرد، نه `SRV.token`. بعد از ثبت‌نام سرور، `SRV.on=true` می‌شد ولی `SESSION` ساخته نمی‌شد، پس روتر برمی‌گشت به `#/login` و داشبورد باز نمی‌شد.
- `submitOnboarding()` در `app9.js` بعد از `register-v2` موفق، فقط `SRV` را ذخیره می‌کرد و `location.href='Panel.html#/app/dashboard'` می‌زد که در حالت same-origin گاهی رفرش درست کار نمی‌کرد.

**فیکس:**
- `app4.js` روتر: اگر `SRV.on && SRV.token` باشد و `SESSION` نداریم، `SESSION` را از `SRV.user` می‌سازیم و اجازه ورود می‌دهیم. چک `#/app/` هم `isSrvAuth` را قبول می‌کند.
- `app9.js` ثبت سرور: بعد از موفقیت، `SESSION` هم ساخته می‌شود (`username=phone`, `name=first+last`, `role=admin/viewer`) و در `localStorage` ذخیره می‌شود، بعد `location.hash='#/app/dashboard'` + `reload()`.

الان بعد از ساخت حساب، مستقیم وارد داشبورد مؤسسه می‌شوی.

## ۲) دو فیلد اضافی انگلیسی برای یوزرها
**علت:** `complete_schema.sql` و `002_v2.sql` ستون‌های `first_name_en` و `last_name_en` داشتند که برای transliteration شماره عضویت استفاده می‌شد ولی تو گفتی نمی‌خوای.

**فیکس:**
- از `complete_schema.sql` حذف شد (الان فقط `first_name`, `last_name` می‌ماند)
- از `migrations/002_v2.sql` حذف شد
- `patches/fix_missing_cols.sql` و `fix_missing_cols_minimal.sql` الان `DROP COLUMN IF EXISTS first_name_en/last_name_en` می‌کنند تا DB های موجود تمیز شود
- `patches/drop_en_fields.sql` جدید: فقط همین دو ستون را حذف می‌کند — اگر DB فعلی‌ات این ستون‌ها را دارد، این فایل را در Supabase اجرا کن
- `backend/*.sql` اضافی در روت حذف شد

شماره عضویت خودکار هنوز با تابع `faToEnTranslit` در JS و بک‌اند ساخته می‌شود ولی دیگر ستون جدا در DB ذخیره نمی‌شود.

## ۳) حذف عضو هنوز تو دیتابیس می‌ماند
**قبل:** `DELETE /members/:id` → `UPDATE members SET deleted_at=now()` (حذف نرم) — عضو از لیست ناپدید می‌شد ولی تو جدول می‌ماند.

**الان:** per درخواست تو، حذف سخت (hard delete):
```sql
DELETE FROM member_field_values WHERE member_id=$1;
DELETE FROM members WHERE id=$1 AND institution_id=$2;
```
`members.js` عوض شد، پاسخ `{deleted:true, hard:true}`.

اگر می‌خوای بعداً دوباره soft delete برگردونیم، ستون `deleted_at` هنوز تو اسکیما هست ولی استفاده نمی‌شود.

## ۴) تنظیمات مؤسسه تیک همه خورده با وجود انتخاب فقط نام و نام پدر
**علت دوگانه:**
- دمو: `submitOnboarding` در حالت دمو `memberFields` انتخابی را نادیده می‌گرفت و همیشه ۵ فیلد پیش‌فرض را می‌گذاشت.
- سرور: `renderSettings()` در `app7.js` همیشه `renderFieldsSec` (دمو) را صدا می‌زد، نه `srvFieldsSec` (سرور). پس حتی اگه تو سرور فقط ۲ فیلد ساخته شده بود، تو تنظیمات ۵ تا تیک‌خورده می‌دیدی.

**فیکس:**
- `app9.js` helper جدید `buildDemoFields(selected)`:
  - اگر `selected` خالی → ۵ پیش‌فرض
  - اگر مثلاً `['نام','نام پدر']` → فقط `{name, father}` با `on:1`
  - هر دو مسیر دمو (`doDemoCreate` و مستقیم) الان `DB.settings.memberFields = buildDemoFields(...)` می‌کنند
- `app7.js` `renderSettings()`:
  ```js
  if(SRV.on && srvReady() && srvFieldsSec) srvFieldsSec(box)
  else renderFieldsSec(box)
  ```
  الان تو حالت سرور، بخش «فیلدهای اعضا» دقیقاً همونایی که تو onboarding انتخاب کردی را از `/api/fields` می‌خواند و لیست می‌کند (بدون تیک‌های اضافی).

## فایل‌ها
- `panel.js` 382KB syntax ok
- `hesabat-backend.zip` 200K (بدون `first_name_en`, با حذف سخت)
- `hesabat-full.zip` 480K

## تست
1. `drop_en_fields.sql` را تو Supabase اجرا کن اگر ستون‌های en داری (اختیاری)
2. بک‌اند را ری‌دیپلوی کن (چون `members.js`, `complete_schema.sql`, `002_v2.sql`, `fields.js` عوض شد)
3. `localStorage.clear()` → `Panel.html#/onboarding` → فقط «نام» و «نام پدر» انتخاب کن → ایجاد حساب → باید مستقیم برود داشبورد (نه گیر کردن روی «در حال ورود»)
4. تنظیمات → اطلاعات مؤسسه → فیلدهای اعضا → باید دقیقاً ۲ تا ببینی (نه ۵ تیک‌خورده)
5. عضو بساز → حذف کن → تو Supabase `select * from members` بزن → باید واقعاً حذف شده باشد، نه با `deleted_at`
