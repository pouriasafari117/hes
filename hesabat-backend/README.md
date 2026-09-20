# Hesabat Backend — فاز ۱

معماری طبق سند `Architecture Specification v1.0`:

```
Panel (panel.js)  →  Backend API (Node/Express)  →  PostgreSQL (+ Row Level Security)
```

پنل هرگز مستقیم به دیتابیس وصل نمی‌شود. حالت «دمو» پنل هم دست‌نخورده باقی مانده؛
از تنظیمات پنل می‌توان بین دمودیتا و دادهٔ واقعی سرور سوئیچ کرد (حالت دوگانه).

---

## اجرا با داکر (توصیه‌شده)

```bash
cd backend
docker compose up -d          # فقط PostgreSQL (اسکیمای فاز ۱ خودکار اعمال می‌شود)
cp .env.example .env          # رمز JWT_SECRET را عوض کنید
npm install
npm run migrate               # اگر دیتابیس از قبل ساخته شده (نه اولین راه‌اندازی)
npm start                     # API روی پورت 4000
```

## اجرا بدون داکر (دیتابیس محلی)

```bash
# با کاربر مالک (مثلاً postgres):
createdb hesabat
psql -d hesabat -f db/schema.sql     # نقش hesabat_app و سیاست‌های RLS هم ساخته می‌شود
npm install && npm start
```

## تست‌ها

```bash
npm test          # تست سرتاسری (42 سناریو): احراز هویت، مؤسسه، فیلد داینامیک،
                  # اعتبارسنجی انواع، عضو، حذف نرم، آرشیو فیلد، جداسازی دو مؤسسه با RLS
```

تست اتصال پنل (نیازمند بالا بودن سرور):
```bash
node ../_build/smoke_api.js   # 14 سناریو: پنل واقعی → API → PostgreSQL
```

---

## ساختار دیتابیس

| جدول | نقش |
|---|---|
| `users` | حساب‌ها (بدون دسترسی مستقیم نقش اپ؛ فقط از طریق توابع امن) |
| `institutions` | مؤسسات — همه داده‌ها با `institution_id` جدا می‌شوند |
| `institution_members` | عضویت کاربر در مؤسسه + نقش |
| `field_definitions` | تعریف فیلدهای داینامیک هر مؤسسه (بدون ستون جدید در اعضا) |
| `members` | پوستهٔ عضو: وضعیت + زمان‌ها + `deleted_at` (حذف نرم) |
| `member_field_values` | مقادیر فیلدها به‌صورت کلید/مقدار |

### چندمستأجری (بند ۱۰ و ۱۱ سند)

- روی همهٔ جداول مستأجر `ROW LEVEL SECURITY` فعال است و نقش اپلیکیشن
  (`hesabat_app`) نه مالک است نه سوپریوزر، پس سیاست‌ها همیشه اعمال می‌شوند.
- هر درخواست داخل یک تراکنش: `app.user_id` از توکن (قابل اعتماد) و
  `app.institution_id` از URL ست می‌شود؛ سیاست‌ها با `fn_is_member` راستی‌آزمایی
  می‌کنند که کاربر واقعاً عضو آن مؤسسه است. اسپوف کردن شناسهٔ مؤسسه بی‌فایده است.
- عمل‌هایی که ذاتاً بیرون مرز مستأجرند (ثبت‌نام، ایجاد مؤسسه، لیست مؤسسات من)
  فقط از طریق توابع `SECURITY DEFINER` انجام می‌شوند.

## اعتبارسنجی فیلدها (سمت سرور)

انواع: `text, number, date, bool, select, mobile, nid`
عدد/تاریخ/کد ملی/موبایل با ارقام فارسی هم پذیرفته می‌شوند؛ `select` فقط گزینه‌های
تعریف‌شده؛ فیلد الزامی نمی‌تواند خالی باشد. خطاها با پیام فارسی و `details` برمی‌گردند.

## API

پیشوند: `/api` — احراز هویت: `Authorization: Bearer <token>`

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/auth/register` | ثبت‌نام `{name, email, password}` |
| POST | `/auth/login` | ورود `{email, password}` |
| GET | `/auth/me` | کاربر + مؤسساتش |
| POST | `/institutions` | ایجاد مؤسسه `{name, slug?}` |
| GET | `/institutions` | مؤسسات من |
| GET/PATCH | `/institutions/:id` | دریافت/ویرایش مؤسسه |
| GET/POST | `/institutions/:id/fields` | لیست/ایجاد فیلد |
| PATCH/DELETE | `/institutions/:id/fields/:fid` | ویرایش/آرشیو فیلد |
| GET/POST | `/institutions/:id/members` | لیست (با `q`, `page`, `pageSize`) / ایجاد عضو `{values:{…}}` |
| GET/PATCH/DELETE | `/institutions/:id/members/:mid` | عضو / ویرایش `{values:{…}}` / حذف نرم |

## اتصال از پنل

تنظیمات پنل ▸ تب «اطلاعات مؤسسه» ▸ کارت «اتصال به سرور»:
آدرس سرور + ایمیل/رمز → ورود یا ساخت حساب → انتخاب/ایجاد مؤسسه →
«فعال‌سازی حالت سرور». از آن لحظه صفحهٔ اعضا و مدیریت فیلدها مستقیماً
روی PostgreSQL کار می‌کنند؛ بقیهٔ پنل (وام، اقساط، گزارش‌ها) تا فاز ۲ روی دمودیتا می‌ماند.

## فازهای بعد (طبق سند)

- فاز ۲: `loans → installments → payments` روی همین RLS
- فاز ۳: استخراج داده از تصویر لیست اعضا بر اساس فیلدهای همان مؤسسه
