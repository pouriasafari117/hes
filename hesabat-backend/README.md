# Hesabat Backend — فاز ۲ (Round 32)

معماری طبق تغییرات جدید:

```
Hesabat.html (لندینگ) → Panel.html (ورود با شماره تماس/کد ملی یا افتتاح حساب)
  → افتتاح حساب: مدیر ۳ مرحله / کاربر ۲ مرحله
  → Backend API (Node/Express) → PostgreSQL (Supabase) با RLS
```

**داکر حذف شد** — per Round 32، اتصال به PostgreSQL در زمان ساخت حساب انجام می‌شود، نه از تنظیمات. 
نیازی به `docker-compose.yml` نیست. برای لوکال هم مستقیم از Supabase یا هر Postgres استفاده کنید.

---

## اجرا (بدون داکر)

```bash
cd backend
cp .env.example .env   # DATABASE_URL و JWT_SECRET را پر کن
npm install
npm run migrate        # اعمال schema.sql + schema_v2.sql
npm start              # API روی PORT (پیش‌فرض 10000 برای Render)
```

### متغیرهای محیطی (.env)

```
DATABASE_URL=postgres://... (از Supabase > Connection String)
PORT=10000
JWT_SECRET=یک رشته طولانی تصادفی
JWT_EXPIRES=7d
CORS_ORIGIN=*
```

---

## احراز هویت جدید (Round 32)

- **لاگین:** `POST /api/auth/login` با `{email: phone|nid|email, password: nid|1234}`
  - نام کاربری پیش‌فرض = شماره تماس (09xxxxxxxxx)
  - رمز پیش‌فرض = کد ملی (10 رقم)
  - برای حساب‌های قدیمی admin/1234 همچنان کار می‌کند
- **افتتاح حساب:** `POST /api/auth/register-v2`
  ```json
  {
    "firstName":"علی", "lastName":"رضایی",
    "phone":"09121234567", "nid":"1234567890",
    "fatherName":"حسین", "birthDate":"1991-07-23",
    "roleType":"manager|user",
    "institutionName":"قرض‌الحسنه مهرگان",
    "institutionSlug":"mehregan",
    "establishedAt":"2011-03-21",
    "address":"تهران...",
    "installmentsCount":12,
    "currency":"تومان",
    "feePercent":4,
    "installmentPeriod":"monthly",
    "memberFields":[{"label":"نام","type":"text","required":true}]
  }
  ```
  - برای مدیر: مؤسسه ساخته می‌شود + ایمیل خودکار `{slug}{nid}@hes.com`
  - برای کاربر: اگر `institutionName` داشت، درخواست join ثبت می‌شود

- **درخواست عضویت:** `POST /api/auth/request-join` با `{institutionName}` (نیاز به توکن)

---

## API

پیشوند: `/api` — احراز هویت: `Authorization: Bearer <token>`

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/auth/register-v2` | افتتاح حساب جدید (مدیر/کاربر) |
| POST | `/auth/login` | ورود با phone/nid/email |
| GET | `/auth/me` | کاربر + مؤسساتش |
| POST | `/auth/request-join` | درخواست عضویت در مؤسسه |
| POST | `/institutions` | ایجاد مؤسسه (قدیمی) |
| GET | `/institutions` | مؤسسات من |
| GET | `/institutions/:id/join-requests` | لیست درخواست‌ها (مدیر) |
| POST | `/institutions/:id/join-requests/:reqId/approve` | تأیید عضویت |
| DELETE | `/institutions/:id` | **جدید** حذف کامل مؤسسه و تمام داده‌ها (مالک) — `fn_delete_institution` |
| POST | `/institutions/:id/join-requests/:reqId/reject` | رد عضویت |
| GET/POST | `/institutions/:id/fields` | فیلدها |
| GET/POST | `/institutions/:id/members` | اعضا (با member_no خودکار) |

### حذف مؤسسه (جدید)

- **از پنل:** تنظیمات → اطلاعات مؤسسه → دکمه قرمز «حذف کامل مؤسسه» → دو بار تأیید
  - حالت سرور: `DELETE /api/institutions/:id` → `fn_delete_institution(userId, instId)` → cascade حذف `join_requests`, `member_field_values`, `members`, `field_definitions`, `institution_members`, `institutions`
  - حالت دمو: پاک‌سازی `localStorage` (members, loans, ...)
- **از SQL (Supabase SQL Editor):** فایل `db/delete_institution.sql` را باز کن:
  ```sql
  SELECT id, name, slug FROM institutions;
  -- سپس:
  SELECT fn_delete_institution(1, 3); -- userId, institutionId
  -- یا دستی:
  -- BEGIN; DELETE FROM ... WHERE institution_id=3; DELETE FROM institutions WHERE id=3; COMMIT;
  -- برای پاک کردن کل DB: TRUNCATE ... RESTART IDENTITY CASCADE;
  ```

### تعداد اقساط متغیر (جدید)

- قبلاً select با [6,12,18,24,30,36,48] بود
- حالا در **همه جا** `type=number min=1 max=120`:
  - onboarding: `obInstCount` (app9.js)
  - ثبت وام: `lfMonths` (app6.js)
  - تنظیمات → پیش‌فرض اقساط: `setLdMonths` (app7.js)

### شماره عضویت خودکار

در `members.js`:
```
en(firstName) + en(lastName[0]) + nidLast6
```
با نگاشت فارسی→انگلیسی: ا→a, ب→b, پ→p, ... (مثلاً علی رضایی 1234567890 → alir567890)

---

## فرانت‌اند

- `Panel.html` + `panel.css` + `panel.js` — پنل مستقل (3 فایل کنار هم)
- `Hesabat.html` — لندینگ، دکمه ورود → Panel.html، افتتاح حساب → Panel.html#/onboarding
- افتتاح حساب در `app9.js`: ویزارد کامل با role selector، 3 مرحله مدیر، 2 مرحله کاربر
  - **دمو:** وقتی `SRV.base` خالی است یا سرور down → حساب دمو در `localStorage` (کلید `hesabat-db-vX`) ساخته می‌شود. قبلاً 30 عضو نمونه داشت، **حالا برای مدیر جدید 0 عضو** (تمیز).
  - **سرور:** وقتی `SRV.base` ست است (در `panel.js` اول فایل: `SRV.base='https://...'` یا از `localStorage hesabat-srv`) → `POST /api/auth/register-v2` → مؤسسه در Postgres ساخته می‌شود با ایمیل ربات `{slug}{nid}@hes.com` و `bot_email`، کاربر ایمیلش به همان تغییر می‌کند، `SRV.on=true, instId, token` در `localStorage hesabat-srv` ذخیره می‌شود، داشبورد داده را از سرور می‌خواند (ابتدا خالی است).
- تنظیمات: کارت PostgreSQL حذف شد، آیکون مؤسسه با دکمه زیبا، قالب شماره‌گذاری حذف شد، داده‌ها فقط «بازنشانی دمو»، نمایش ایمیل ربات hes.com، دکمه حذف کامل مؤسسه

### چرا DB خالی ولی پنل 30 عضو نشان می‌دهد؟

- DB (Postgres) خالی است تا وقتی عضو از پنل در حالت سرور نسازی.
- پنل در حالت دمو داده را از `localStorage` می‌خواند که با 30 عضو نمونه seed شده.
- برای دیدن داده سرور: مطمئن شو `panel.js` اولش `SRV.base` دارد یا در کنسول `localStorage.getItem('hesabat-srv')` دارای `on:true` است. اگر نیست، دوباره افتتاح حساب کن وقتی سرور روشن است.
- برای شروع تمیز دمو: افتتاح حساب مدیر جدید → حالا 0 عضو می‌بینی (fix جدید).

---

## دیپلوی رایگان (بدون کارت)

- **دیتابیس:** Supabase (500MB رایگان) — DATABASE_URL را از Dashboard کپی کن
- **بک‌اند:** Render Free (بدون کارت، ولی بعد 15 دقیقه sleep) یا Railway ($5 trial)
- Root Directory در Railway باید `backend` باشد اگر از روت ریپو دیپلوی می‌کنی

تست سلامت: `GET /api/health` → `{ok:true}`

---

## فازهای بعد

- فاز ۲ تکمیل: وام، اقساط، پرداخت‌ها روی همین RLS
- پلن‌ها در onboarding فعلاً placeholder
