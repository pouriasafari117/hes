-- ═══════════════════════════════════════════════════════════════
-- حذف کامل یک مؤسسه و تمام داده‌های وابسته
-- اجرا با کاربر مالک (postgres یا hesabat) در Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- روش ۱: حذف با ID (مثلاً 1)
-- فقط ID را عوض کن و اجرا کن:

-- BEGIN;

-- 1. حذف درخواست‌های عضویت
-- DELETE FROM institution_join_requests WHERE institution_id = 1;

-- 2. حذف مقادیر فیلدهای اعضا
-- DELETE FROM member_field_values WHERE member_id IN (SELECT id FROM members WHERE institution_id = 1);

-- 3. حذف اعضا
-- DELETE FROM members WHERE institution_id = 1;

-- 4. حذف تعریف فیلدها
-- DELETE FROM field_definitions WHERE institution_id = 1;

-- 5. حذف عضویت کاربران در مؤسسه
-- DELETE FROM institution_members WHERE institution_id = 1;

-- 6. حذف تراکنش‌های مرتبط (اگر فاز ۲ دارید - وام، اقساط، پرداخت)
-- اگر جداول loans, installments, payments, txns, accounts, funds دارید:
-- DELETE FROM payments WHERE loan_id IN (SELECT id FROM loans WHERE institution_id = 1);
-- DELETE FROM installments WHERE loan_id IN (SELECT id FROM loans WHERE institution_id = 1);
-- DELETE FROM loans WHERE institution_id = 1;
-- DELETE FROM txns WHERE account_id IN (SELECT id FROM accounts WHERE fund_id IN (SELECT id FROM funds WHERE institution_id = 1));
-- DELETE FROM accounts WHERE fund_id IN (SELECT id FROM funds WHERE institution_id = 1);
-- DELETE FROM funds WHERE institution_id = 1;

-- 7. حذف خود مؤسسه
-- DELETE FROM institutions WHERE id = 1;

-- COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- روش ۲: تابع امن برای حذف (فقط مالک مؤسسه می‌تواند)
-- ═══════════════════════════════════════════════════════════════

create or replace function fn_delete_institution(p_user bigint, p_institution_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare is_owner boolean;
begin
  -- چک مالک بودن
  select exists (
    select 1 from institutions where id = p_institution_id and owner_id = p_user
  ) or exists (
    select 1 from institution_members where user_id = p_user and institution_id = p_institution_id and role in ('owner','admin')
  ) into is_owner;

  if not is_owner then
    raise exception 'شما مالک این مؤسسه نیستید.';
  end if;

  -- حذف به ترتیب وابستگی
  delete from institution_join_requests where institution_id = p_institution_id;
  delete from member_field_values where member_id in (select id from members where institution_id = p_institution_id);
  delete from members where institution_id = p_institution_id;
  delete from field_definitions where institution_id = p_institution_id;
  delete from institution_members where institution_id = p_institution_id;

  -- اگر فاز ۲ جداول دارید، این‌ها را هم باز کن:
  -- delete from payments where loan_id in (select id from loans where institution_id = p_institution_id);
  -- delete from installments where loan_id in (select id from loans where institution_id = p_institution_id);
  -- delete from loans where institution_id = p_institution_id;
  -- delete from txns where account_id in (select id from accounts where fund_id in (select id from funds where institution_id = p_institution_id));
  -- delete from accounts where fund_id in (select id from funds where institution_id = p_institution_id);
  -- delete from funds where institution_id = p_institution_id;

  delete from institutions where id = p_institution_id;

  return true;
end;
$$;

grant execute on function fn_delete_institution(bigint,bigint) to hesabat_app;

-- استفاده در API:
-- DELETE /api/institutions/:id  →  select fn_delete_institution(userId, institutionId)

-- ═══════════════════════════════════════════════════════════════
-- روش ۳: حذف با نام یا اسلاگ (سریع)
-- ═══════════════════════════════════════════════════════════════

-- اگر نام مؤسسه را می‌دانی:
-- DELETE FROM institutions WHERE slug = 'mehregan' OR name = 'قرض‌الحسنه مهرگان';

-- ولی بهتر است با ID کار کنی تا اشتباه نشود.
-- ID را از این کوئری بگیر:
-- SELECT id, name, slug, owner_id FROM institutions ORDER BY id;

-- ═══════════════════════════════════════════════════════════════
-- روش ۴: پاک کردن کامل دیتابیس (همه مؤسسات)
-- فقط اگر می‌خواهی از صفر شروع کنی:
-- ═══════════════════════════════════════════════════════════════

-- BEGIN;
-- TRUNCATE institution_join_requests, member_field_values, members, field_definitions, institution_members, institutions RESTART IDENTITY CASCADE;
-- COMMIT;

-- برای فاز ۲ کامل:
-- TRUNCATE institution_join_requests, member_field_values, members, field_definitions, institution_members, payments, installments, loans, txns, accounts, funds, institutions RESTART IDENTITY CASCADE;
