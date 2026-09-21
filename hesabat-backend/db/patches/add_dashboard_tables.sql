-- افزودن جداول داشبورد برای اتصال آمار به دیتابیس
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
  type           text not null default 'پس‌انداز',
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
  type           text not null default 'installment',
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
create index if not exists idx_funds_inst on funds(institution_id);
create index if not exists idx_accounts_inst on accounts(institution_id);
create index if not exists idx_loans_inst on loans(institution_id);
create index if not exists idx_loans_member on loans(member_id);
create index if not exists idx_ins_loan on installments(loan_id);
create index if not exists idx_ins_inst on installments(institution_id);
create index if not exists idx_pay_loan on payments(loan_id);
create index if not exists idx_txns_inst on txns(institution_id);

-- RLS
alter table funds enable row level security;
alter table accounts enable row level security;
alter table loans enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table txns enable row level security;
alter table funds force row level security;
alter table accounts force row level security;
alter table loans force row level security;
alter table installments force row level security;
alter table payments force row level security;
alter table txns force row level security;

drop policy if exists p_funds on funds;
create policy p_funds on funds for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
drop policy if exists p_accounts on accounts;
create policy p_accounts on accounts for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
drop policy if exists p_loans on loans;
create policy p_loans on loans for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
drop policy if exists p_installments on installments;
create policy p_installments on installments for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
drop policy if exists p_payments on payments;
create policy p_payments on payments for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));
drop policy if exists p_txns on txns;
create policy p_txns on txns for all using (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id)) with check (institution_id = nullif(current_setting('app.institution_id', true), '')::bigint and fn_is_member(institution_id));

do $$ begin grant select, insert, update, delete on funds, accounts, loans, installments, payments, txns to hesabat_app; exception when others then null; end $$;
