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
