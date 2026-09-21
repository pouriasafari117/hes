# فیکس Round 33.8 - بازگشت ظاهر به قالب اصلی + حفظ منطق اتصال

## درخواست کاربر
- اتصال عالی شد ولی ظاهر کند/به‌هم‌ریخته شده
- سه فایل پنل (Panel.html, panel.css, panel.js) که فرستادی همون قالب اصلی ماست
- ظاهر رو دقیقا به اون حالت برگردون، **بدون دست زدن به اتصال**
- به جز منوی تنظیمات که همین خوبه، فقط فاصله‌ها/مارجین و فونت رو بهتر کن

## چی کار شد

### 1. Panel.html برگشت به قالب اصلی
- فایل آپلودی `Panel.html` (9.6K) مبنا بود
- اسکریپت Cloudflare چلنج (`cdn-cgi/challenge-platform`) که باعث کندی و iframe مخفی می‌شد حذف شد
- الان 9037 بایت، تمیز، بدون اسکریپت اضافی
- ساختار `#view-login` و `#view-app` و سایدبار دقیقا مثل قالب

### 2. panel.css برگشت به قالب اصلی + بهبود تنظیمات
- مبنا: `uploads/panel.css` (47K) که CRLF بود → تبدیل به LF (46474 بایت)
- استایل‌های افتتاح حساب که تو منطق امروز اضافه شده بود (role-btn, onb-step, steps-line, plans) چون تو CSS اصلی نبود، دوباره اضافه شد تا ویزارد افتتاح حساب ظاهر درست داشته باشه
- فونت یکسان برای پاپ‌آپ‌ها:
```css
.drop-panel,.notif-item,.dp-item,.profile-chip{font-family:'IBM Plex Sans Arabic' !important}
```
- **بهبود منوی تنظیمات** per درخواست:
```css
#setBody{padding:22px 22px 10px}
.set-sec{margin-bottom:20px !important;border-radius:16px}
.set-sec .card-h{padding:16px 20px;background:var(--card-2)}
.set-sec .sec-b{padding:18px 20px}
.setting-row{padding:14px 6px !important;gap:16px !important}
.setting-row .sr-t b{font-size:.93rem !important;font-weight:700}
.setting-row .sr-t p{font-size:.8rem !important;line-height:1.8 !important}
```
الان تنظیمات فاصله و مارجین بهتر و فونت یکسان داره ولی منطقش دست نخورده.

- حجم نهایی `panel.css` = 49901 بایت (قبلاً 48520) — یعنی قالب اصلی + بهبودها

### 3. panel.js منطق اتصال امروز حفظ شد
- فایل آپلودی `panel.js` (302K) قالب قدیمی بدون فیکس اتصال بود
- فایل فعلی `panel.js` (384KB) که تو راند 33.7 درست کردیم حفظ شد:
  - ترتیب لود درست: `app8 (SRV)` قبل از `app7 (boot)` → دیگه SESSION پاک نمی‌شه
  - `boot()` از `localStorage.getItem('hesabat-srv-v1')` هم می‌خونه حتی اگر SRV global هنوز نباشه
  - `route()` هم از localStorage می‌خونه و `showView('login')` به جای landing
  - `register` و `login` همیشه `SRV.on=true` می‌کنند وقتی توکن دارن
  - `logout()` می‌ره `Hesabat.html`
- رندر منوها (dashboard, members, loans, reports) تو هر دو نسخه یکسان بود، پس ظاهر دقیقا مثل قالب می‌مونه
- `fixPopupFont()` که تو app9 بود، استایل‌های اضافی inject می‌کرد، الان چون تو CSS هست، redundant ولی مشکلی نداره

### 4. بک‌اند دست نخورده
- `auth.js` مستقیم SQL بدون en
- `members.js` hard delete + memberNo ساده
- `complete_schema.sql` بدون en
- فقط `drop_en_fields.sql` برای DB قدیمی

## تست
1. `hesabat-backend.zip` (202K) دیپلوی روی Railway
2. `Panel.html` باید دقیقا مثل فایل آپلودی باز بشه — سایدبار تیره، کارت‌ها با radius 20، هدر blur
3. `Panel.html#/onboarding` → ساخت حساب → باید بره داشبورد و نمونه با F5 (فیکس راند قبل)
4. تنظیمات → فاصله‌ها بیشتر، فونت IBM Plex Sans Arabic، ولی تب‌ها همون 3 تا (اطلاعات مؤسسه، کاربران، داده‌ها)

## فایل‌ها
- `Panel.html` 9037 بایت (تمیز بدون CF)
- `panel.css` 49901 بایت (قالب اصلی + onboarding + بهبود تنظیمات)
- `panel.js` 384059 بایت (منطق اتصال فیکس‌شده)
- `hesabat-backend.zip` 202K
- `hesabat-full.zip` 484K
