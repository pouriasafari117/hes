-- حذف فیلدهای انگلیسی اضافی که کاربر نمی‌خواهد
-- اگر قبلاً نصب کردی، این را اجرا کن تا first_name_en و last_name_en حذف شود
alter table users drop column if exists first_name_en;
alter table users drop column if exists last_name_en;
