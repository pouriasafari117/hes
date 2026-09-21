# فیکس Round 33.2 - منظم‌سازی DB + ثبت عضو دوطرفه

## ۱) منظم‌سازی فایل‌های دیتابیس (قبلاً شلوغ بود)
قبلاً تو `backend/db/` اینا بود: `schema.sql`, `schema_v2.sql`, `schema.supabase.sql`, `delete_institution.sql`, `fix_missing_cols.sql`, `fix_missing_cols_minimal.sql` — ۶ فایل شلوغ.

الان:
```
backend/db/
├── README.md                    ← توضیح همه فایل‌ها
├── complete_schema.sql          ← **تنها فایل برای نصب تازه** (همه چیز توش: جداول + ستون‌های v2 + bot_email + member_no + join_requests + RLS + توابع)
├── migrate.js                   ← اول complete_schema را می‌زند، اگر نبود migrations را به ترتیب
├── migrations/
│   ├── 001_initial.sql          (از schema.sql)
│   ├── 002_v2.sql               (از schema_v2.sql + DROP FUNCTION برای جلوگیری از 42P13)
│   └── 003_delete_institution.sql
├── patches/
│   ├── fix_missing_cols.sql     (با DO ... EXCEPTION برای role)
│   └── fix_missing_cols_minimal.sql (بدون ROLE، مخصوص Supabase)
└── old/                         (فایل‌های قدیمی آرشیو)
```

برای Supabase فقط `complete_schema.sql` را یک بار اجرا کن.

## ۲) عضو اضافه کردن کار نمی‌کرد — الان دوطرفه شد
**مشکل:** 
- وقتی `field_definitions` خالی بود، backend می‌گفت "فیلد ناشناخته" و عضو ثبت نمی‌شد
- فرانت‌اند `SHORTCUTS.memberAdd` (دکمه داشبورد) همیشه می‌رفت فرم دمو `memberForm()` که فقط `localStorage` می‌نوشت، نه Postgres
- `renderSrvMembersPage` فقط می‌خواند، نمی‌نوشت

**فیکس:**
- `backend/src/routes/fields.js` GET: اگر هیچ فیلدی نیست، خودکار ۵ فیلد پیش‌فرض می‌سازد:
  `name` (نام و نام خانوادگی), `father`, `mobile`, `nationalId`, `birthDate`
- `backend/src/routes/members.js` POST: اگر فیلدی نیست، اول پیش‌فرض می‌سازد، بعد عضو را می‌سازد. `genMemberNo` هم `name` را که شامل نام+فامیلی است درست هندل می‌کند
- `backend/src/routes/auth.js` register-v2: اگر مدیر مؤسسه می‌سازد و `memberFields` نفرستاد، خودکار ۵ فیلد پیش‌فرض + فیلدهای سفارشی را می‌سازد
- `app8.js` hookSrvMode:
  - `PAGES.members` → `renderSrvMembersPage` (قبلاً بود)
  - **جدید:** `SHORTCUTS.memberAdd` → اگر `SRV.on` باشد `srvMemberForm(null)` وگرنه دمو
  - **جدید:** `window.memberForm` → اگر سرور روشن باشد به `srvMemberForm` می‌رود (هم می‌نویسد هم می‌خواند)
- `app9.js` patchMemberForm: اول چک می‌کند اگر سرور روشن است، برود سرور (قبلاً مستقیم می‌رفت دمو)
- `app8.js` renderSrvMembersPage: اگر فیلدی نیست پیام راهنما + اگر عضوی نیست جدول با دکمه، و نمایش `member_no` + badge وضعیت

الان:
- مدیر لاگین می‌کند (حالت سرور سبز) → داشبورد → «افزودن عضو» → فرم سرور باز می‌شود → ثبت → `POST /api/institutions/:id/members` → تو Postgres می‌رود → لیست رفرش می‌شود و عضو را می‌بینی
- `/api/debug` → `institutions_count` و `users_count` و `members` (از طریق `/api/institutions/:id/members` با توکن) قابل چک

## ۳) درخواست عضویت کاربر فعلاً بی‌خیال
- تو `app9.js` پنل کاربر (role=user) قبلاً درخواست join داشت، الان فعلاً تمرکز روی مدیر است
- API `request-join` هنوز هست ولی UI کاربر ساده شده: فقط اطلاعات شخصی + پیام "فعلاً مدیر باید شما را اضافه کند"
- بعداً می‌تونی دوباره فعال کنی

## فایل‌ها
- `panel.js` 372KB (قبلاً 369KB) — تنها فایل منطق
- `hesabat-backend.zip` 207K شامل `complete_schema.sql`, `README.md`, `migrations/`, `patches/`, `src/routes/fields.js` و `members.js` فیکس شده
- `hesabat-full.zip` 485K همه چیز

## تست سریع بعد از دیپلوی Railway
1. `https://YOUR.up.railway.app/api/health` → `v:2, db_ok:true`
2. `https://YOUR.up.railway.app/api/debug` → `funcs` کامل
3. `localStorage.clear()` → `Panel.html#/onboarding` → مدیر جدید → باید بنر سبز Postgres
4. برو اعضا و اقساط → عضو جدید → پر کن (نام، نام پدر، موبایل، کدملی، تاریخ تولد) → ثبت
5. باید تو جدول ببینی + تو `/api/debug` اگر `/api/institutions/1/members` را با توکن بزنی، عضو را ببینی

اگر هنوز عضو اضافه نشد، کنسول F12 → Network → ببین POST به `/members` چه اروری می‌دهد و بفرست.
