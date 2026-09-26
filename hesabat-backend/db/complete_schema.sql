-- ═══════════════════════════════════════════════════════════════
-- Hesabat — اسکیمای واحد پنل (جداول پایه + وام + پورتال کاربر)
-- idempotent: روی دیتابیس خالی یا زنده قابل اجراست. داده را DROP نمی‌کند.
-- در سوپابیس فقط همین فایل را بزنید: complete_schema.sql
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'hesabat_app') then
    begin
      create role hesabat_app login password 'hesabat_app_pass';
    exception when others then null;
    end;
  end if;
end $$;

-- ── جداول پایه (قبلی) ──
create table if not exists users (
  id            bigserial primary key,
  name          text not null,
  email         text not null,
  password_hash text not null,
  phone         text,
  nid           text,
  father_name   text,
  birth_date    date,
  first_name    text,
  last_name     text,
  role_type     text default 'user' check (role_type in ('manager','user')),
  created_at    timestamptz not null default now()
);
create unique index if not exists idx_users_email_unique on users(lower(email));
create unique index if not exists idx_users_phone_unique on users(lower(phone)) where phone is not null and phone <> '';
create unique index if not exists idx_users_nid_unique on users(nid) where nid is not null and nid <> '';
alter table users add column if not exists phone text;
alter table users add column if not exists nid text;
alter table users add column if not exists father_name text;
alter table users add column if not exists birth_date date;
alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists role_type text default 'user';

create table if not exists institutions (
  id                  bigserial primary key,
  name                text not null,
  slug                text not null unique,
  status              text not null default 'active' check (status in ('active','inactive')),
  owner_id            bigint not null references users(id),
  established_at      date,
  address             text,
  installments_count  integer default 12,
  currency            text default 'تومان',
  fee_percent         numeric default 4,
  installment_period  text default 'monthly',
  member_fields_config jsonb default '[]',
  icon                text,
  bot_email           text,
  bot_active          boolean default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table institutions add column if not exists established_at date;
alter table institutions add column if not exists address text;
alter table institutions add column if not exists installments_count integer default 12;
alter table institutions add column if not exists currency text default 'تومان';
alter table institutions add column if not exists fee_percent numeric default 4;
alter table institutions add column if not exists installment_period text default 'monthly';
alter table institutions add column if not exists member_fields_config jsonb default '[]';
alter table institutions add column if not exists icon text;
alter table institutions add column if not exists bot_email text;
alter table institutions add column if not exists bot_active boolean default true;
alter table institutions add column if not exists fund_balance bigint not null default 0;
alter table institutions add column if not exists plan_type text not null default 'free';
alter table institutions add column if not exists import_templates jsonb not null default '[]';

create table if not exists institution_members (
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  role           text not null default 'admin' check (role in ('owner','admin','operator')),
  primary key (user_id, institution_id)
);

create table if not exists field_definitions (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  key            text not null,
  label          text not null,
  type           text not null check (type in ('text','number','date','bool','select','mobile','nid')),
  is_required    boolean not null default false,
  options        jsonb not null default '[]',
  sort_order     integer not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (institution_id, key)
);

create table if not exists members (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  status         text not null default 'active',
  member_no      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
alter table members add column if not exists member_no text;
create unique index if not exists idx_members_no_unique on members(institution_id, member_no) where member_no is not null and member_no <> '';

create table if not exists member_field_values (
  member_id      bigint not null references members(id) on delete cascade,
  field_id       bigint not null references field_definitions(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  value          text not null default '',
  primary key (member_id, field_id)
);

create table if not exists institution_join_requests (
  id             bigserial primary key,
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, institution_id)
);

-- ── جداول جدید برای داشبورد و وام‌ها ──
create table if not exists funds (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  name           text not null,
  code           text,
  status         text not null default 'active' check (status in ('active','inactive')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists accounts (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  fund_id        bigint references funds(id) on delete set null,
  name           text not null,
  number         text,
  type           text not null default 'پس‌انداز' check (type in ('پس‌انداز','جاری','قرض‌الحسنه')),
  initial_balance bigint not null default 0,
  status         text not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists loans (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  member_id      bigint not null references members(id) on delete cascade,
  fund_id        bigint references funds(id) on delete set null,
  amount         bigint not null check (amount > 0),
  fee_percent    numeric default 4,
  installments_count integer not null default 12,
  status         text not null default 'active' check (status in ('active','paid','overdue','cancelled')),
  description    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists installments (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  loan_id        bigint not null references loans(id) on delete cascade,
  member_id      bigint not null references members(id) on delete cascade,
  due_date       date not null,
  amount         bigint not null,
  status         text not null default 'pending' check (status in ('pending','paid','overdue')),
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists payments (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  loan_id        bigint not null references loans(id) on delete cascade,
  installment_id bigint references installments(id) on delete set null,
  member_id      bigint not null references members(id) on delete cascade,
  amount         bigint not null,
  type           text not null default 'installment' check (type in ('installment','fee','other')),
  created_at     timestamptz not null default now()
);

create table if not exists txns (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  account_id     bigint references accounts(id) on delete set null,
  member_id      bigint references members(id) on delete set null,
  loan_id        bigint references loans(id) on delete set null,
  type           text not null check (type in ('deposit','withdraw','loan_out','repayment','fee','transfer')),
  amount         bigint not null,
  description    text,
  created_at     timestamptz not null default now()
);

/* دفتر تغییرات مالی مؤسسه — لاگ کاهش/افزایش موجودی صندوق با توضیحات */
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

create index if not exists idx_fields_inst  on field_definitions(institution_id);
create index if not exists idx_members_inst on members(institution_id);
create index if not exists idx_mfv_inst     on member_field_values(institution_id);
create index if not exists idx_mfv_field    on member_field_values(field_id);
create index if not exists idx_instmem_inst on institution_members(institution_id);
create index if not exists idx_join_req_inst on institution_join_requests(institution_id);
create index if not exists idx_join_req_user on institution_join_requests(user_id);
create index if not exists idx_funds_inst on funds(institution_id);
create index if not exists idx_accounts_inst on accounts(institution_id);
create index if not exists idx_accounts_fund on accounts(fund_id);
create index if not exists idx_loans_inst on loans(institution_id);
create index if not exists idx_loans_member on loans(member_id);
create index if not exists idx_loans_fund on loans(fund_id);
create index if not exists idx_ins_loan on installments(loan_id);
create index if not exists idx_ins_inst on installments(institution_id);
create index if not exists idx_ins_member on installments(member_id);
create index if not exists idx_pay_loan on payments(loan_id);
create index if not exists idx_pay_inst on payments(installment_id);
create index if not exists idx_txns_inst on txns(institution_id);
create index if not exists idx_txns_acc on txns(account_id);

-- گزارش‌های تحلیلی ماهانه (بخش «گزارش‌ها» پنل): تجمیع بر اساس ماه
create index if not exists idx_txns_inst_created    on txns(institution_id, created_at);
create index if not exists idx_inst_audit_inst  on institution_audit(institution_id);
create index if not exists idx_pay_inst_created     on payments(institution_id, created_at);
create index if not exists idx_ins_inst_due         on installments(institution_id, due_date);
create index if not exists idx_mem_inst_created     on members(institution_id, created_at);
create index if not exists idx_loans_inst_created   on loans(institution_id, created_at);

-- ── RLS ──
create or replace function fn_is_member(iid bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from institution_members
    where institution_id = iid
      and user_id = nullif(current_setting('app.user_id', true), '')::bigint
  );
$$;

alter table institutions        enable row level security;
alter table institution_members enable row level security;
alter table field_definitions   enable row level security;
alter table members             enable row level security;
alter table member_field_values enable row level security;
alter table institution_join_requests enable row level security;
alter table funds enable row level security;
alter table accounts enable row level security;
alter table loans enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table txns enable row level security;
alter table institution_audit enable row level security;

alter table institutions        force row level security;
alter table institution_members force row level security;
alter table field_definitions   force row level security;
alter table members             force row level security;
alter table member_field_values force row level security;
alter table institution_join_requests force row level security;
alter table funds force row level security;
alter table accounts force row level security;
alter table loans force row level security;
alter table installments force row level security;
alter table payments force row level security;
alter table txns force row level security;

drop policy if exists p_inst on institutions;
create policy p_inst on institutions for all
  using (id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(id))
  with check (id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(id));

drop policy if exists p_im_sel on institution_members;
create policy p_im_sel on institution_members for select
  using (user_id = nullif(current_setting('app.user_id', true), '')::bigint or fn_is_member(institution_id));

drop policy if exists p_fields on field_definitions;
create policy p_fields on field_definitions for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_members on members;
create policy p_members on members for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_mfv on member_field_values;
create policy p_mfv on member_field_values for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_inst_audit on institution_audit;
create policy p_inst_audit on institution_audit for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_join_req on institution_join_requests;
create policy p_join_req on institution_join_requests for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
         or user_id = nullif(current_setting('app.user_id', true), '')::bigint)
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
              or user_id = nullif(current_setting('app.user_id', true), '')::bigint);

drop policy if exists p_funds on funds;
create policy p_funds on funds for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_accounts on accounts;
create policy p_accounts on accounts for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_loans on loans;
create policy p_loans on loans for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_installments on installments;
create policy p_installments on installments for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_payments on payments;
create policy p_payments on payments for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_txns on txns;
create policy p_txns on txns for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

-- ── توابع (با DROP اول) ──
drop function if exists fn_user_by_email(text);
drop function if exists fn_user_by_phone(text);
drop function if exists fn_register_user(text,text,text);
drop function if exists fn_register_user_v2(text,text,text,text,text,date,text,text,text);
drop function if exists fn_create_institution(bigint,text,text);
drop function if exists fn_create_institution_v2(bigint,text,text,date,text,int,text,numeric,text);
drop function if exists fn_my_institutions(bigint);
drop function if exists fn_request_join(bigint,bigint);
drop function if exists fn_approve_join(bigint,bigint);
drop function if exists fn_delete_institution(bigint,bigint);

create or replace function fn_register_user(p_name text, p_email text, p_hash text)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid bigint;
begin
  insert into users(name, email, password_hash) values (trim(p_name), lower(trim(p_email)), p_hash) returning id into uid;
  return uid;
end;
$$;

create or replace function fn_register_user_v2(
  p_first_name text, p_last_name text, p_phone text, p_nid text,
  p_father_name text, p_birth_date date, p_role_type text,
  p_email text, p_hash text
) returns bigint language plpgsql security definer set search_path = public as $$
declare uid bigint;
declare email_final text;
begin
  email_final := lower(trim(p_email));
  if email_final = '' or email_final is null then email_final := lower(trim(p_phone)) || '@hes.local'; end if;
  insert into users(first_name, last_name, name, phone, nid, father_name, birth_date, role_type, email, password_hash)
  values (trim(p_first_name), trim(p_last_name), trim(p_first_name) || ' ' || trim(p_last_name), trim(p_phone), trim(p_nid), trim(p_father_name), p_birth_date, case when p_role_type in ('manager','user') then p_role_type else 'user' end, email_final, p_hash)
  returning id into uid;
  return uid;
end;
$$;

create or replace function fn_user_by_email(p_email text)
returns table (id bigint, name text, email text, password_hash text, phone text, nid text, role_type text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash, phone, nid, role_type from users where email = lower(trim(p_email)) or lower(phone) = lower(trim(p_email));
$$;

create or replace function fn_user_by_phone(p_phone text)
returns table (id bigint, name text, email text, password_hash text, phone text, nid text, role_type text, first_name text, last_name text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash, phone, nid, role_type, first_name, last_name from users where lower(phone) = lower(trim(p_phone));
$$;

create or replace function fn_create_institution(p_owner bigint, p_name text, p_slug text)
returns bigint language plpgsql security definer set search_path = public as $$
declare iid bigint;
begin
  insert into institutions(name, slug, owner_id) values (trim(p_name), trim(p_slug), p_owner) returning id into iid;
  insert into institution_members(user_id, institution_id, role) values (p_owner, iid, 'owner') on conflict do nothing;
  return iid;
end;
$$;

create or replace function fn_create_institution_v2(
  p_owner bigint, p_name text, p_slug text,
  p_established_at date, p_address text,
  p_installments_count int, p_currency text, p_fee_percent numeric, p_installment_period text
) returns bigint language plpgsql security definer set search_path = public as $$
declare iid bigint;
declare owner_nid text;
declare email_auto text;
begin
  select nid into owner_nid from users where id = p_owner;
  email_auto := lower(regexp_replace(trim(p_slug), '[^a-z0-9]+', '', 'g')) || coalesce(owner_nid,'') || '@hes.com';
  insert into institutions(name, slug, owner_id, established_at, address, installments_count, currency, fee_percent, installment_period, bot_email, bot_active)
  values (trim(p_name), trim(p_slug), p_owner, p_established_at, trim(p_address), coalesce(p_installments_count,12), coalesce(p_currency,'تومان'), coalesce(p_fee_percent,4), coalesce(p_installment_period,'monthly'), email_auto, true)
  returning id into iid;
  insert into institution_members(user_id, institution_id, role) values (p_owner, iid, 'owner') on conflict do nothing;
  update users set email = email_auto where id = p_owner;
  return iid;
end;
$$;

create or replace function fn_my_institutions(p_user bigint)
returns table (id bigint, name text, slug text, status text, role text)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.slug, i.status, im.role from institution_members im join institutions i on i.id = im.institution_id where im.user_id = p_user order by i.id;
$$;

create or replace function fn_request_join(p_user bigint, p_institution_id bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  insert into institution_join_requests(user_id, institution_id, status) values (p_user, p_institution_id, 'pending')
  on conflict (user_id, institution_id) do update set status = 'pending', updated_at = now() returning id into rid;
  return rid;
end;
$$;

create or replace function fn_approve_join(p_manager bigint, p_request_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare r institution_join_requests%rowtype;
begin
  select * into r from institution_join_requests where id = p_request_id;
  if not found then return false; end if;
  update institution_join_requests set status = 'approved', updated_at = now() where id = p_request_id;
  insert into institution_members(user_id, institution_id, role) values (r.user_id, r.institution_id, 'operator') on conflict do nothing;
  return true;
end;
$$;

create or replace function fn_delete_institution(p_user bigint, p_institution_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare is_owner boolean;
begin
  select exists (select 1 from institutions where id = p_institution_id and owner_id = p_user) or exists (select 1 from institution_members where user_id = p_user and institution_id = p_institution_id and role in ('owner','admin')) into is_owner;
  if not is_owner then raise exception 'شما مالک این مؤسسه نیستید.'; end if;
  delete from institution_join_requests where institution_id = p_institution_id;
  delete from member_field_values where member_id in (select id from members where institution_id = p_institution_id);
  delete from members where institution_id = p_institution_id;
  delete from field_definitions where institution_id = p_institution_id;
  delete from institution_members where institution_id = p_institution_id;
  delete from institutions where id = p_institution_id;
  return true;
end;
$$;

-- ── GRANT ها ──
do $$ begin grant usage on schema public to hesabat_app; exception when others then null; end $$;
do $$ begin grant select, insert, update, delete on institutions, field_definitions, members, member_field_values, institution_join_requests, funds, accounts, loans, installments, payments, txns to hesabat_app; exception when others then null; end $$;
do $$ begin grant select on institution_members to hesabat_app; exception when others then null; end $$;
do $$ begin grant usage, select on all sequences in schema public to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_is_member(bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_register_user(text,text,text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_register_user_v2(text,text,text,text,text,date,text,text,text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_user_by_email(text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_user_by_phone(text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_create_institution(bigint,text,text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_create_institution_v2(bigint,text,text,date,text,int,text,numeric,text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_my_institutions(bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_request_join(bigint,bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_approve_join(bigint,bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_delete_institution(bigint,bigint) to hesabat_app; exception when others then null; end $$;

-- ── پورتال (هم‌تراز پنل فعلی) ──
alter table members add column if not exists user_id bigint references users(id) on delete set null;
create unique index if not exists idx_members_user_inst
  on members(institution_id, user_id) where user_id is not null and deleted_at is null;

alter table institutions add column if not exists plan_type text not null default 'free';
alter table institutions add column if not exists plan_upgraded_at timestamptz;
alter table institutions add column if not exists public_code text;
alter table institutions add column if not exists import_templates jsonb not null default '[]';
update institutions
  set public_code = coalesce(nullif(public_code,''), nullif(bot_email,''))
  where public_code is null or public_code = '';

create table if not exists requests (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  user_id        bigint not null references users(id) on delete cascade,
  type           text not null default 'membership',
  status         text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  payload        jsonb not null default '{}',
  reject_reason  text,
  reviewed_by    bigint references users(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_requests_inst on requests(institution_id, status, created_at desc);
create index if not exists idx_requests_user on requests(user_id, created_at desc);
create unique index if not exists idx_requests_pending_unique
  on requests(user_id, institution_id, type) where status = 'pending';

create table if not exists notifications (
  id             bigserial primary key,
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint references institutions(id) on delete cascade,
  type           text not null default 'info',
  title          text not null,
  body           text,
  request_id     bigint references requests(id) on delete set null,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, created_at desc);

do $$ begin
  grant select, insert, update, delete on requests, notifications to hesabat_app;
exception when others then null; end $$;
do $$ begin
  grant usage, select on sequence requests_id_seq, notifications_id_seq to hesabat_app;
exception when others then null; end $$;

alter table requests enable row level security;
alter table notifications enable row level security;
drop policy if exists p_requests on requests;
create policy p_requests on requests for all
  using (
    institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
    and fn_is_member(institution_id)
    or user_id = nullif(current_setting('app.user_id', true), '')::bigint
  )
  with check (
    institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
    and fn_is_member(institution_id)
    or user_id = nullif(current_setting('app.user_id', true), '')::bigint
  );
drop policy if exists p_notifications on notifications;
create policy p_notifications on notifications for all
  using (user_id = nullif(current_setting('app.user_id', true), '')::bigint
         or (institution_id is not null and fn_is_member(institution_id)))
  with check (user_id = nullif(current_setting('app.user_id', true), '')::bigint
         or (institution_id is not null and fn_is_member(institution_id)));


create or replace function fn_inst_by_code(p_code text)
returns table (id bigint, name text, slug text, owner_id bigint, plan_type text, public_code text)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.slug, i.owner_id, coalesce(i.plan_type,'free'), coalesce(i.public_code, i.bot_email)
  from institutions i
  where lower(trim(coalesce(i.public_code,''))) = lower(trim(p_code))
     or lower(trim(coalesce(i.bot_email,''))) = lower(trim(p_code))
     or lower(trim(i.slug)) = lower(trim(p_code))
  limit 1;
$$;

create or replace function fn_notify(p_user bigint, p_inst bigint, p_type text, p_title text, p_body text, p_req bigint)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, institution_id, type, title, body, request_id)
  values (p_user, p_inst, coalesce(p_type,'info'), p_title, coalesce(p_body,''), p_req);
$$;

create or replace function fn_portal_profile(p_user bigint, p_inst bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  m members%rowtype;
  vals jsonb;
begin
  select * into m from members
   where institution_id = p_inst and user_id = p_user and deleted_at is null
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'عضویت فعال ندارید.');
  end if;
  select coalesce(jsonb_object_agg(f.key, v.value), '{}'::jsonb) into vals
    from member_field_values v
    join field_definitions f on f.id = v.field_id
   where v.member_id = m.id;
  return jsonb_build_object(
    'ok', true,
    'member', jsonb_build_object('id', m.id, 'status', m.status, 'member_no', m.member_no, 'created_at', m.created_at, 'values', vals),
    'loans', coalesce((select jsonb_agg(x) from (select * from loans where member_id=m.id and institution_id=p_inst order by id desc) x), '[]'::jsonb),
    'installments', coalesce((select jsonb_agg(x) from (select * from installments where member_id=m.id and institution_id=p_inst order by due_date) x), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(x) from (select * from payments where member_id=m.id and institution_id=p_inst order by id desc limit 50) x), '[]'::jsonb),
    'txns', coalesce((select jsonb_agg(x) from (select * from txns where member_id=m.id and institution_id=p_inst order by id desc limit 50) x), '[]'::jsonb)
  );
end;
$$;

create or replace function fn_portal_fields(p_inst bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select id, key, label, type, is_required, options, sort_order
    from field_definitions
    where institution_id = p_inst and archived = false
    order by sort_order, id
  ) x;
$$;

create or replace function fn_portal_my_memberships(p_user bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select m.institution_id, i.name as institution_name, 'active'::text as status,
           coalesce(i.plan_type,'free') as plan_type, coalesce(i.public_code, i.bot_email) as public_code
    from members m
    join institutions i on i.id = m.institution_id
    where m.user_id = p_user and m.deleted_at is null
    order by m.id desc
  ) x;
$$;

create or replace function fn_my_institutions(p_user bigint)
returns table (id bigint, name text, slug text, status text, role text)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.slug, i.status, im.role
  from institution_members im
  join institutions i on i.id = im.institution_id
  where im.user_id = p_user
  union
  select i.id, i.name, i.slug, i.status, 'owner'::text
  from institutions i
  where i.owner_id = p_user
  order by 1;
$$;

do $$ begin grant execute on function fn_inst_by_code(text) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_notify(bigint,bigint,text,text,text,bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_portal_profile(bigint,bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_portal_fields(bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_portal_my_memberships(bigint) to hesabat_app; exception when others then null; end $$;
do $$ begin grant execute on function fn_my_institutions(bigint) to hesabat_app; exception when others then null; end $$;

do $$ begin grant select on users to hesabat_app; exception when others then null; end $$;
do $$ begin grant select, insert, update, delete on requests, notifications to hesabat_app; exception when others then null; end $$;
