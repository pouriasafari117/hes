const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

/* GET installments ?page=&pageSize=&status=&from=&to=
   status: paid | overdue | dueSoon | pending — «وضعیت واقعی» سرورمحاسبه می‌کند:
   قسط باز سررسیدگذشته = overdue، قسط باز تا ۳۰ روز آینده = dueSoon، بقیه pending.
   from/to روی due_date به‌صورت YYYY-MM-DD اعمال می‌شوند. */
r.get('/', asyncH(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page,10)||1);
  const pageSize = Math.min(1000, Math.max(1, parseInt(req.query.pageSize,10)||500));
  const status = (req.query.status||'').trim() || null;
  const from = (req.query.from||'').trim() || null;
  const to = (req.query.to||'').trim() || null;
  if (status && !['paid','overdue','dueSoon','pending'].includes(status))
    return res.status(400).json({ error: 'وضعیت نامعتبر است.' });

  const out = await withTenant(req.user, req.institutionId, async c => {
    const args = [req.institutionId];
    const where = ['i.institution_id=$1', "l.status<>'cancelled'"];
    if (from) { args.push(from); where.push(`i.due_date >= $${args.length}`); }
    if (to)   { args.push(to);   where.push(`i.due_date <= $${args.length}`); }
    if (status) {
      args.push(status);
      where.push(`(
        ($${args.length}='paid'    and i.status='paid') or
        ($${args.length}='overdue' and i.status<>'paid' and i.due_date <  current_date) or
        ($${args.length}='dueSoon' and i.status<>'paid' and i.due_date >= current_date and i.due_date <= current_date + interval '30 days') or
        ($${args.length}='pending' and i.status<>'paid' and i.due_date >  current_date + interval '30 days')
      )`);
    }
    const total = (await c.query(
      `select count(*)::int as n from installments i join loans l on l.id=i.loan_id where ${where.join(' and ')}`, args
    )).rows[0].n;
    args.push(pageSize, (page-1)*pageSize);
    const rows = (await c.query(
      `select i.id, i.loan_id, i.due_date::text as due_date, i.amount, i.status, i.paid_at,
              row_number() over (partition by i.loan_id order by i.due_date asc, i.id asc)::int as no,
              l.member_id, l.amount as loan_amount, l.fee_percent, l.status as loan_status, m.member_no,
              (select v.value from member_field_values v join field_definitions d on d.id=v.field_id
               where v.member_id=l.member_id order by d.sort_order, d.id limit 1) as member_name,
              case when i.status='paid' then 'paid'
                   when i.due_date <  current_date then 'overdue'
                   when i.due_date <= current_date + interval '30 days' then 'dueSoon'
                   else 'pending' end as eff_status
       from installments i
       join loans l on l.id=i.loan_id
       join members m on m.id=l.member_id
       where ${where.join(' and ')}
       order by i.due_date asc, i.id asc
       limit $${args.length-1} offset $${args.length}`, args
    )).rows;
    return { rows, total, page, pageSize };
  });
  res.json(out);
}));

module.exports = r;
