-- فیکس سریع: اگر migration قبلی ناقص بود، این فایل را در Supabase SQL Editor اجرا کن
-- همه ستون‌های جدید Round 32-33 را اضافه می‌کند

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
alter table institutions add column if not exists bot_email text;
alter table institutions add column if not exists bot_active boolean default true;

alter table members add column if not exists member_no text;
create unique index if not exists idx_members_no_unique on members(institution_id, member_no) where member_no is not null and member_no <> '';

-- جدول درخواست‌های عضویت
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

-- RLS برای join_requests (اگر قبلاً نبود)
alter table institution_join_requests enable row level security;
alter table institution_join_requests force row level security;
drop policy if exists p_join_req on institution_join_requests;
create policy p_join_req on institution_join_requests
  for all
  using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
         or user_id = nullif(current_setting('app.user_id', true), '')::bigint)
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)
              or user_id = nullif(current_setting('app.user_id', true), '')::bigint);

-- توابع را دوباره بساز (کپی از schema_v2.sql)
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
  select id, name, email, password_hash, phone, nid, role_type, first_name, last_name from users where lower(phone) = lower(trim(p_phone));
$$;

create or replace function fn_user_by_email(p_email text)
returns table (id bigint, name text, email text, password_hash text, phone text, nid text, role_type text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash, phone, nid, role_type from users where email = lower(trim(p_email)) or lower(phone) = lower(trim(p_email));
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
  values (
    trim(p_name), trim(p_slug), p_owner,
    p_established_at, trim(p_address),
    coalesce(p_installments_count,12), coalesce(p_currency,'تومان'), coalesce(p_fee_percent,4), coalesce(p_installment_period,'monthly'),
    email_auto, true
  )
  returning id into iid;
  insert into institution_members(user_id, institution_id, role) values (p_owner, iid, 'owner');
  update users set email = email_auto where id = p_owner;
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

create or replace function fn_delete_institution(p_user bigint, p_institution_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare is_owner boolean;
begin
  select exists (
    select 1 from institutions where id = p_institution_id and owner_id = p_user
  ) or exists (
    select 1 from institution_members where user_id = p_user and institution_id = p_institution_id and role in ('owner','admin')
  ) into is_owner;
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

create or replace function fn_approve_join(p_manager bigint, p_request_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare r institution_join_requests%rowtype;
begin
  select * into r from institution_join_requests where id = p_request_id;
  if not found then return false; end if;
  if not fn_is_member(r.institution_id) then
    if not exists (select 1 from institution_members where user_id = p_manager and institution_id = r.institution_id and role in ('owner','admin')) then
      return false;
    end if;
  end if;
  update institution_join_requests set status = 'approved', updated_at = now() where id = p_request_id;
  insert into institution_members(user_id, institution_id, role) values (r.user_id, r.institution_id, 'operator') on conflict do nothing;
  return true;
end;
$$;

-- دسترسی‌ها
grant select, insert, update, delete on institution_join_requests to hesabat_app;
grant usage, select on sequence institution_join_requests_id_seq to hesabat_app;
grant execute on function fn_register_user_v2(text,text,text,text,text,date,text,text,text) to hesabat_app;
grant execute on function fn_user_by_phone(text) to hesabat_app;
grant execute on function fn_create_institution_v2(bigint,text,text,date,text,int,text,numeric,text) to hesabat_app;
grant execute on function fn_request_join(bigint,bigint) to hesabat_app;
grant execute on function fn_approve_join(bigint,bigint) to hesabat_app;
grant execute on function fn_delete_institution(bigint,bigint) to hesabat_app;
