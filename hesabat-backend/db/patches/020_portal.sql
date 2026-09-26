-- لایه کاربر/درخواست/اعلان — بدون بازنویسی جداول فعلی
-- membership جدا ساخته نمی‌شود: pending در requests، عضو فعال = members.user_id

alter table members add column if not exists user_id bigint references users(id) on delete set null;
create unique index if not exists idx_members_user_inst
  on members(institution_id, user_id) where user_id is not null and deleted_at is null;

alter table institutions add column if not exists plan_type text not null default 'free';
alter table institutions add column if not exists plan_upgraded_at timestamptz;
alter table institutions add column if not exists public_code text;
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
