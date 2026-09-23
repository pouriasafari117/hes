-- ═══ ریست کامل دیتابیس حسابات ═══
-- این کوئری را مستقیم در دیتابیس اجرا کن (psql یا SQL Editor ساپابیس/رندر).
-- ✔ همهٔ داده‌ها (موسسه‌ها، کاربران، اعضا، وام‌ها، اقساط، پرداخت‌ها، تراکنش‌ها) پاک می‌شوند
-- ✔ جداول و ستون‌ها (members, loans, installments, payments, ...) کاملاً دست‌نخورده می‌مانند
-- ✔ شمارندهٔ آیدی‌ها (id) به ۱ برمی‌گردد → رکورد جدید دوباره از ۱ شماره می‌گیرد
-- بعد از اجرا: پنل را باز کن و از «افتتاح حساب» دوباره مؤسسه/مدیر بساز و داده‌ها را از صفر وارد کن.

BEGIN;

TRUNCATE TABLE
  txns,
  payments,
  installments,
  loans,
  accounts,
  funds,
  member_field_values,
  members,
  institution_join_requests,
  field_definitions,
  institution_members,
  users,
  institutions
RESTART IDENTITY CASCADE;

COMMIT;
