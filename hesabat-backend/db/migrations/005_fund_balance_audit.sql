-- ═══════════════════════════════════════════════════════════════
--۰۰۵ — «موجودی صندوق» برای هر مؤسسه + دفتر تغییرات مالی (لاگ با توضیحات)
-- امن برای اجرای مکرر (idempotent) — کافی است همین فایل را در
-- Supabase SQL Editor اجرا کنید. هیچ داده‌ای پاک نمی‌شود.
-- ═══════════════════════════════════════════════════════════════

-- ۱) ستون موجودی صندوق (تومان/ریال هر مؤسسه)
alter table institutions add column if not exists fund_balance bigint not null default 0;

-- ۲) جدول دفتر تغییرات مالی مؤسسه — هر کم/زیاد شدن موجودی این‌جا لاگ می‌شود
create table if not exists institution_audit (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  user_id        bigint references users(id) on delete set null,
  action         text not null,
  old_value      text,
  new_value      text,
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_inst_audit_inst on institution_audit(institution_id);

-- ۳) امنیت رکورد-سطحی مثل بقیهٔ جداول
drop policy if exists p_inst_audit on institution_audit;
create policy p_inst_audit on institution_audit for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
alter table institution_audit enable row level security;
