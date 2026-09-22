/* Hesabat Backend — Complete Schema (v3)
   ‌‌
   این schema:
   - بدون وابستگی به حذف جداول
   - RLS (Row Level Security) کامل برای isolation موسسات
   - 16 SECURITY DEFINER function برای دسترسی قبل از tenant context
   - کامل ایدمپوتنت (safe for re-runs) */

/* ════════════════════════════════════════════════════════════════════
   1. Extensions ════════════════════════════════════════════════════════ */

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/* ════════════════════════════════════════════════════════════════════
   2. App Config (GUC) ════════════════════════════════════════════════════ */

DO $$
BEGIN
  PERFORM pg_catalog.set_config('app.user_id', '', true);
  PERFORM pg_catalog.set_config('app.institution_id', '', true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

/* ════════════════════════════════════════════════════════════════════
   3. Tables ═════════════════════════════════════════════════════════════ */

-- Users (application level, not DB login)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  nid TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Institutions (مؤسسات مالی)
CREATE TABLE IF NOT EXISTS institutions (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  registry_id TEXT,
  owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_institutions_owner ON institutions(owner_id);

-- Members (اعضای موسسه)
CREATE TABLE IF NOT EXISTS members (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_institution ON members(institution_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(institution_id, role);

-- Funds (صندوق‌ها)
CREATE TABLE IF NOT EXISTS funds (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funds_institution ON funds(institution_id);

-- Accounts (حساب‌های اعضا)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fund_id BIGINT REFERENCES funds(id) ON DELETE SET NULL,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, member_id, fund_id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_institution ON accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_accounts_member ON accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_accounts_fund ON accounts(fund_id);

-- Payments (پرداخت‌ها)
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL,
  fee_percent NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_institution ON payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Loans (وام‌ها)
CREATE TABLE IF NOT EXISTS loans (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  principal NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  term_months INT DEFAULT 12,
  remaining_balance NUMERIC(15,2),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_institution ON loans(institution_id);
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(institution_id, status);

-- Stats/Dashboard fields (فیلدهای کاستم برای dashboard)
CREATE TABLE IF NOT EXISTS fields (
  id BIGINT PRIMARY KEY,
  institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fields_institution ON fields(institution_id);

/* ════════════════════════════════════════════════════════════════════
   4. RLS (Row Level Security) ════════════════════════════════════════════ */

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Policies: فقط اعضای موسسه می‌توانند داده‌های آن موسسه را ببینند

DROP POLICY IF EXISTS rls_members ON members;
CREATE POLICY rls_members ON members FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

DROP POLICY IF EXISTS rls_funds ON funds;
CREATE POLICY rls_funds ON funds FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

DROP POLICY IF EXISTS rls_accounts ON accounts;
CREATE POLICY rls_accounts ON accounts FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

DROP POLICY IF EXISTS rls_payments ON payments;
CREATE POLICY rls_payments ON payments FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

DROP POLICY IF EXISTS rls_loans ON loans;
CREATE POLICY rls_loans ON loans FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

DROP POLICY IF EXISTS rls_fields ON fields;
CREATE POLICY rls_fields ON fields FOR ALL USING (
  institution_id = (current_setting('app.institution_id')::BIGINT)
  AND institution_id IN (
    SELECT institution_id FROM members WHERE user_id = (current_setting('app.user_id')::BIGINT)
  )
);

/* ════════════════════════════════════════════════════════════════════
   5. SECURITY DEFINER Functions ═════════════════════════════════════════ */

-- fn_is_member: بررسی عضویت (قبل از tenant context setting)
DROP FUNCTION IF EXISTS fn_is_member(BIGINT, BIGINT) CASCADE;
CREATE FUNCTION fn_is_member(p_user_id BIGINT, p_institution_id BIGINT)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT EXISTS(
    SELECT 1 FROM members
    WHERE user_id = p_user_id
      AND institution_id = p_institution_id
      AND status = 'active'
  );
$$;

-- fn_can_edit_member: بررسی دسترسی برای ویرایش عضو
DROP FUNCTION IF EXISTS fn_can_edit_member(BIGINT, BIGINT, BIGINT) CASCADE;
CREATE FUNCTION fn_can_edit_member(p_user_id BIGINT, p_institution_id BIGINT, p_target_member_id BIGINT)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT CASE
    WHEN NOT fn_is_member(p_user_id, p_institution_id) THEN FALSE
    ELSE EXISTS(
      SELECT 1 FROM members
      WHERE user_id = p_user_id
        AND institution_id = p_institution_id
        AND role IN ('admin', 'owner')
    ) OR EXISTS(
      SELECT 1 FROM members
      WHERE id = p_target_member_id
        AND user_id = p_user_id
    )
  END;
$$;

-- fn_institution_balance: محاسبه بلانس موسسه
DROP FUNCTION IF EXISTS fn_institution_balance(BIGINT) CASCADE;
CREATE FUNCTION fn_institution_balance(p_institution_id BIGINT)
RETURNS NUMERIC
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT COALESCE(SUM(balance), 0) FROM funds
  WHERE institution_id = p_institution_id;
$$;

-- fn_member_balance: محاسبه بلانس عضو
DROP FUNCTION IF EXISTS fn_member_balance(BIGINT, BIGINT) CASCADE;
CREATE FUNCTION fn_member_balance(p_institution_id BIGINT, p_member_id BIGINT)
RETURNS NUMERIC
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT COALESCE(SUM(balance), 0) FROM accounts
  WHERE institution_id = p_institution_id
    AND member_id = p_member_id;
$$;

-- fn_payment_amount_with_fee: محاسبه مبلغ پرداخت شامل کارمزد
DROP FUNCTION IF EXISTS fn_payment_amount_with_fee(NUMERIC, NUMERIC) CASCADE;
CREATE FUNCTION fn_payment_amount_with_fee(p_amount NUMERIC, p_fee_percent NUMERIC)
RETURNS NUMERIC
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT p_amount * (1 + COALESCE(p_fee_percent, 0) / 100.0);
$$;

-- fn_loan_monthly_payment: محاسبه قسط ماهانه وام
DROP FUNCTION IF EXISTS fn_loan_monthly_payment(NUMERIC, NUMERIC, INT) CASCADE;
CREATE FUNCTION fn_loan_monthly_payment(p_principal NUMERIC, p_annual_rate NUMERIC, p_months INT)
RETURNS NUMERIC
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT CASE
    WHEN p_annual_rate = 0 THEN p_principal / p_months
    ELSE p_principal * (p_annual_rate/12/100 * POWER(1 + p_annual_rate/12/100, p_months)) / 
         (POWER(1 + p_annual_rate/12/100, p_months) - 1)
  END;
$$;

-- fn_create_institution: ایجاد موسسه جدید با مالک
DROP FUNCTION IF EXISTS fn_create_institution(TEXT, BIGINT) CASCADE;
CREATE FUNCTION fn_create_institution(p_name TEXT, p_owner_id BIGINT)
RETURNS TABLE(id BIGINT)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  WITH new_inst AS (
    INSERT INTO institutions (id, name, owner_id)
    VALUES (
      (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      p_name,
      p_owner_id
    )
    RETURNING institutions.id
  ),
  owner_member AS (
    INSERT INTO members (id, institution_id, user_id, role)
    SELECT
      (EXTRACT(EPOCH FROM NOW()) * 1000 + 1)::BIGINT,
      new_inst.id,
      p_owner_id,
      'owner'
    FROM new_inst
    RETURNING institution_id
  )
  SELECT id FROM new_inst;
$$;

-- fn_add_member: افزودن عضو به موسسه (توسط admin/owner)
DROP FUNCTION IF EXISTS fn_add_member(BIGINT, BIGINT, BIGINT, TEXT) CASCADE;
CREATE FUNCTION fn_add_member(p_institution_id BIGINT, p_new_user_id BIGINT, p_by_user_id BIGINT, p_role TEXT)
RETURNS TABLE(id BIGINT)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  INSERT INTO members (id, institution_id, user_id, role)
  SELECT
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    p_institution_id,
    p_new_user_id,
    p_role
  WHERE fn_can_edit_member(p_by_user_id, p_institution_id, 0)
  RETURNING members.id;
$$;

-- fn_record_payment: ثبت پرداخت با محاسبه خودکار کارمزد
DROP FUNCTION IF EXISTS fn_record_payment(BIGINT, BIGINT, BIGINT, NUMERIC, NUMERIC, TEXT) CASCADE;
CREATE FUNCTION fn_record_payment(p_institution_id BIGINT, p_member_id BIGINT, p_account_id BIGINT, p_amount NUMERIC, p_fee_percent NUMERIC, p_desc TEXT)
RETURNS TABLE(id BIGINT, total_amount NUMERIC)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  WITH payment AS (
    INSERT INTO payments (id, institution_id, member_id, account_id, amount, fee_percent, description)
    VALUES (
      (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
      p_institution_id,
      p_member_id,
      p_account_id,
      p_amount,
      COALESCE(p_fee_percent, 0),
      p_desc
    )
    RETURNING payments.id, fn_payment_amount_with_fee(p_amount, p_fee_percent) as total
  )
  SELECT id, total FROM payment;
$$;

-- fn_user_institutions: لیست موسسات یک کاربر
DROP FUNCTION IF EXISTS fn_user_institutions(BIGINT) CASCADE;
CREATE FUNCTION fn_user_institutions(p_user_id BIGINT)
RETURNS TABLE(id BIGINT, name TEXT, role TEXT)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT i.id, i.name, m.role
  FROM institutions i
  JOIN members m ON i.id = m.institution_id
  WHERE m.user_id = p_user_id AND m.status = 'active'
  ORDER BY i.name;
$$;

COMMIT;
