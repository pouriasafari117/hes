-- ═══════════════════════════════════════════════════════════════
-- Hesabat — Schema سازگار با Supabase (SQL Editor)
-- این فایل را عیناً در Supabase > SQL Editor > New Query پیست و Run کنید
-- نقش hesabat_app لازم نیست — با کاربر postgres خود Supabase اجرا می‌شود
-- FORCE RLS حتی روی postgres هم اعمال می‌شود (امنیت مستأجری حفظ می‌شود)
-- ═══════════════════════════════════════════════════════════════

-- ── کاربران ──
create table if not exists users (
  id            bigserial primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ── مؤسسات ──
create table if not exists institutions (
  id         bigserial primary key,
  name       text not null,
  slug       text not null unique,
  status     text not null default 'active' check (status in ('active','inactive')),
  owner_id   bigint not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── عضویت ──
create table if not exists institution_members (
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  role           text not null default 'admin' check (role in ('owner','admin','operator')),
  primary key (user_id, institution_id)
);

-- ── فیلدهای داینامیک ──
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

-- ── اعضا ──
create table if not exists members (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  status         text not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ── مقادیر فیلدها ──
create table if not exists member_field_values (
  member_id      bigint not null references members(id) on delete cascade,
  field_id       bigint not null references field_definitions(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  value          text not null default '',
  primary key (member_id, field_id)
);

create index if not exists idx_fields_inst  on field_definitions(institution_id);
create index if not exists idx_members_inst on members(institution_id);
create index if not exists idx_mfv_inst     on member_field_values(institution_id);
create index if not exists idx_mfv_field    on member_field_values(field_id);
create index if not exists idx_instmem_inst on institution_members(institution_id);

-- ═══════════════════════════════════════════════════════════════
-- RLS — منطق دقیقاً مثل نسخه اصلی
-- ═══════════════════════════════════════════════════════════════
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

alter table institutions        force row level security;
alter table institution_members force row level security;
alter table field_definitions   force row level security;
alter table members             force row level security;
alter table member_field_values force row level security;

drop policy if exists p_inst on institutions;
create policy p_inst on institutions
  for all
  using      (id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(id))
  with check (id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(id));

drop policy if exists p_im_sel on institution_members;
create policy p_im_sel on institution_members
  for select
  using (user_id = nullif(current_setting('app.user_id', true), '')::bigint or fn_is_member(institution_id));

drop policy if exists p_fields on field_definitions;
create policy p_fields on field_definitions
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_members on members;
create policy p_members on members
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

drop policy if exists p_mfv on member_field_values;
create policy p_mfv on member_field_values
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

-- ═══════════════════════════════════════════════════════════════
-- توابع امن
-- ═══════════════════════════════════════════════════════════════
create or replace function fn_register_user(p_name text, p_email text, p_hash text)
returns bigint language plpgsql security definer set search_path = public as $$
declare uid bigint;
begin
  insert into users(name, email, password_hash)
  values (trim(p_name), lower(trim(p_email)), p_hash)
  returning id into uid;
  return uid;
end;
$$;

create or replace function fn_user_by_email(p_email text)
returns table (id bigint, name text, email text, password_hash text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash from users where email = lower(trim(p_email));
$$;

create or replace function fn_create_institution(p_owner bigint, p_name text, p_slug text)
returns bigint language plpgsql security definer set search_path = public as $$
declare iid bigint;
begin
  insert into institutions(name, slug, owner_id)
  values (trim(p_name), trim(p_slug), p_owner)
  returning id into iid;
  insert into institution_members(user_id, institution_id, role)
  values (p_owner, iid, 'owner');
  return iid;
end;
$$;

create or replace function fn_my_institutions(p_user bigint)
returns table (id bigint, name text, slug text, status text, role text)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.slug, i.status, im.role
  from institution_members im join institutions i on i.id = im.institution_id
  where im.user_id = p_user
  order by i.id;
$$;

-- ═══════════════════════════════════════════════════════════════
-- v2 — افتتاح حساب جدید
-- ═══════════════════════════════════════════════════════════════
alter table users add column if not exists phone text;
alter table users add column if not exists nid text;
alter table users add column if not exists father_name text;
alter table users add column if not exists birth_date date;
alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists first_name_en text;
alter table users add column if not exists last_name_en text;
alter table users add column if not exists role_type text default 'user' check (role_type in ('manager','user'));

create unique index if not exists idx_users_phone_unique on users(lower(phone)) where phone is not null and phone <> '';
create unique index if not exists idx_users_nid_unique on users(nid) where nid is not null and nid <> '';

alter table institutions add column if not exists established_at date;
alter table institutions add column if not exists address text;
alter table institutions add column if not exists installments_count integer default 12;
alter table institutions add column if not exists currency text default 'تومان';
alter table institutions add column if not exists fee_percent numeric default 4;
alter table institutions add column if not exists installment_period text default 'monthly';
alter table institutions add column if not exists member_fields_config jsonb default '[]';
alter table institutions add column if not exists icon text;

create table if not exists institution_join_requests (
  id             bigserial primary key,
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, institution_id)
);
create index if not exists idx_join_req_inst on institution_join_requests(institution_id);
create index if not exists idx_join_req_user on institution_join_requests(user_id);

alter table institution_join_requests enable row level security;
alter table institution_join_requests force row level security;
drop policy if exists p_join_req on institution_join_requests;
create policy p_join_req on institution_join_requests
  for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
         or user_id = nullif(current_setting('app.user_id', true), '')::bigint)
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
              or user_id = nullif(current_setting('app.user_id', true), '')::bigint);

alter table members add column if not exists member_no text;
create unique index if not exists idx_members_no_unique on members(institution_id, member_no) where member_no is not null and member_no <> '';

create or replace function fn_register_user_v2(
  p_first_name text, p_last_name text, p_phone text, p_nid text,
  p_father_name text, p_birth_date date, p_role_type text,
  p_email text, p_hash text
) returns bigint language plpgsql security definer set search_path = public as $$
declare uid bigint;
declare email_final text;
begin
  email_final := lower(trim(p_email));
  if email_final = '' or email_final is null then
    email_final := lower(trim(p_phone)) || '@hes.local';
  end if;
  insert into users(first_name, last_name, name, phone, nid, father_name, birth_date, role_type, email, password_hash)
  values (
    trim(p_first_name), trim(p_last_name),
    trim(p_first_name) || ' ' || trim(p_last_name),
    trim(p_phone), trim(p_nid),
    trim(p_father_name), p_birth_date,
    case when p_role_type in ('manager','user') then p_role_type else 'user' end,
    email_final, p_hash
  )
  returning id into uid;
  return uid;
end;
$$;

create or replace function fn_user_by_phone(p_phone text)
returns table (id bigint, name text, email text, password_hash text, phone text, nid text, role_type text, first_name text, last_name text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash, phone, nid, role_type, first_name, last_name from users where lower(phone) = lower(trim(p_phone)) or nid = trim(p_phone);
$$;

create or replace function fn_user_by_email(p_email text)
returns table (id bigint, name text, email text, password_hash text, phone text, nid text, role_type text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash, phone, nid, role_type from users where email = lower(trim(p_email)) or lower(phone) = lower(trim(p_email)) or nid = trim(p_email);
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
  insert into institutions(name, slug, owner_id, established_at, address, installments_count, currency, fee_percent, installment_period)
  values (
    trim(p_name), trim(p_slug), p_owner,
    p_established_at, trim(p_address),
    coalesce(p_installments_count,12), coalesce(p_currency,'تومان'), coalesce(p_fee_percent,4), coalesce(p_installment_period,'monthly')
  )
  returning id into iid;
  insert into institution_members(user_id, institution_id, role)
  values (p_owner, iid, 'owner');
  update users set email = email_auto where id = p_owner and (email like '%@hes.local' or email = '');
  return iid;
end;
$$;

create or replace function fn_request_join(p_user bigint, p_institution_id bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  insert into institution_join_requests(user_id, institution_id, status)
  values (p_user, p_institution_id, 'pending')
  on conflict (user_id, institution_id) do update set status = 'pending', updated_at = now()
  returning id into rid;
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
  insert into institution_members(user_id, institution_id, role)
  values (r.user_id, r.institution_id, 'operator')
  on conflict do nothing;
  return true;
end;
$$;
