-- ایندکس‌های تجمیع ماهانه برای بخش «گزارش‌ها» (d9 endpoint: /reports/summary)
-- امن برای اجرای مکرر (idempotent)
create index if not exists idx_txns_inst_created    on txns(institution_id, created_at);
create index if not exists idx_pay_inst_created     on payments(institution_id, created_at);
create index if not exists idx_ins_inst_due         on installments(institution_id, due_date);
create index if not exists idx_mem_inst_created     on members(institution_id, created_at);
create index if not exists idx_loans_inst_created   on loans(institution_id, created_at);
