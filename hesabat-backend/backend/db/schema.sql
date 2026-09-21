-- ═══════════════════════════════════════════════════════════════
-- Hesabat — PostgreSQL Schema (Phase 1) + Row Level Security
-- این فایل باید با کاربر «مالک» (در ترکیب: hesabat) اجرا شود.
-- نقش اپلیکیشن: hesabat_app (بدون دسترسی superuser؛ RLS روی آن اعمال می‌شود)
-- ═══════════════════════════════════════════════════════════════

-- ── کاربران (خارج از حوزهٔ مستأجری؛ فقط از طریق توابع امن) ──
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

-- ── عضویت کاربر در مؤسسه ──
create table if not exists institution_members (
  user_id        bigint not null references users(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  role           text not null default 'admin' check (role in ('owner','admin','operator')),
  primary key (user_id, institution_id)
);

-- ── تعریف فیلدهای داینامیک (بند ۵ سند: بدون ستون جدید در جدول اعضا) ──
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

-- ── اعضا (فقط وضعیت و زمان‌ها؛ دادهٔ واقعی در جدول مقادیر) ──
create table if not exists members (
  id             bigserial primary key,
  institution_id bigint not null references institutions(id) on delete cascade,
  status         text not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- ── مقادیر فیلدهای داینامیک عضو (institution برای سادگی RLS غیرنرمال نگه داشته شده) ──
create table if not exists member_field_values (
  member_id      bigint not null references members(id) on delete cascade,
  field_id       bigint not null references field_definitions(id) on delete cascade,
  institution_id bigint not null references institutions(id) on delete cascade,
  value          text not null default '',
  primary key (member_id, field_id)
);

create index if not exists idx_fields_inst    on field_definitions(institution_id);
create index if not exists idx_members_inst   on members(institution_id);
create index if not exists idx_mfv_inst       on member_field_values(institution_id);
create index if not exists idx_mfv_field      on member_field_values(field_id);
create index if not exists idx_instmem_inst   on institution_members(institution_id);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (بند ۱۰ و ۱۱ سند)
-- کانتکست هر درخواست داخل تراکنش ست می‌شود:
--   SET LOCAL app.user_id         ← از JWT (قابل اعتماد)
--   SET LOCAL app.institution_id  ← از URL (غیرقابل اعتماد؛ با چک عضویت راستی‌آزمایی می‌شود)
-- ═══════════════════════════════════════════════════════════════

-- آیا کاربر جاری عضو این مؤسسه است؟ (SECURITY DEFINER تا خودش درگیر چرخهٔ سیاست‌ها نشود)
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

-- مؤسسات: فقط مؤسسهٔ جاری، و فقط اگر کاربر عضو آن باشد
drop policy if exists p_inst on institutions;
create policy p_inst on institutions
  for all
  using      (id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(id))
  with check (id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(id));

-- عضویت‌ها: کاربر عضویت‌های خودش یا عضویت‌های مؤسسهٔ جاری را می‌بیند؛ نوشتن فقط از طریق تابع امن
drop policy if exists p_im_sel on institution_members;
create policy p_im_sel on institution_members
  for select
  using (user_id = nullif(current_setting('app.user_id', true), '')::bigint
         or fn_is_member(institution_id));

-- فیلدها
drop policy if exists p_fields on field_definitions;
create policy p_fields on field_definitions
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id));

-- اعضا
drop policy if exists p_members on members;
create policy p_members on members
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id));

-- مقادیر اعضا
drop policy if exists p_mfv on member_field_values;
create policy p_mfv on member_field_values
  for all
  using      (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id))
  with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint
              and fn_is_member(institution_id));

-- ═══════════════════════════════════════════════════════════════
-- توابع امن (SECURITY DEFINER): تنها راه‌های عبور از مرز مستأجری برای عمل‌های بوتهای اولیه
-- ═══════════════════════════════════════════════════════════════

-- ثبت‌نام کاربر (بدون دسترسی مستقیم اپ به جدول users)
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

-- خواندن کاربر با ایمیل (برای لاگین)
create or replace function fn_user_by_email(p_email text)
returns table (id bigint, name text, email text, password_hash text)
language sql stable security definer set search_path = public as $$
  select id, name, email, password_hash from users where email = lower(trim(p_email));
$$;

-- ایجاد مؤسسه + عضویت مالک (چون در لحظهٔ ایجاد هنوز کانتکست مستأجر معنا ندارد)
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

-- فهرست مؤسسات یک کاربر
create or replace function fn_my_institutions(p_user bigint)
returns table (id bigint, name text, slug text, status text, role text)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.slug, i.status, im.role
  from institution_members im join institutions i on i.id = im.institution_id
  where im.user_id = p_user
  order by i.id;
$$;

-- ═══════════════════════════════════════════════════════════════
-- دسترسی‌های نقش اپلیکیشن
-- ═══════════════════════════════════════════════════════════════
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'hesabat_app') then
    create role hesabat_app login password 'hesabat_app_pass';
  end if;
end $$;

grant usage on schema public to hesabat_app;
grant select, insert, update, delete on institutions, field_definitions, members, member_field_values to hesabat_app;
grant select on institution_members to hesabat_app;
grant usage, select on sequence field_definitions_id_seq, members_id_seq to hesabat_app;
grant execute on function fn_is_member(bigint), fn_register_user(text,text,text),
  fn_user_by_email(text), fn_create_institution(bigint,text,text), fn_my_institutions(bigint) to hesabat_app;

-- جدول users: هیچ دسترسی مستقیمی به اپ داده نمی‌شود.
