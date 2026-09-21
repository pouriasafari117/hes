const express = require('express');
const { withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

/* GET /api/institutions/:id/stats — داشبورد متصل به DB */
r.get('/', asyncH(async (req, res) => {
  const stats = await withTenant(req.user, req.institutionId, async c => {
    // اعضا
    const memTotal = (await c.query('select count(*)::int as n from members where institution_id=$1 and deleted_at is null', [req.institutionId])).rows[0].n;
    const memActive = (await c.query("select count(*)::int as n from members where institution_id=$1 and status='active' and deleted_at is null", [req.institutionId])).rows[0].n;
    const memNewMonth = (await c.query("select count(*)::int as n from members where institution_id=$1 and created_at >= date_trunc('month', now()) and deleted_at is null", [req.institutionId])).rows[0].n;

    // صندوق‌ها و حساب‌ها
    let fundsTotal = 0, accountsTotal = 0, totalBalance = 0;
    try {
      fundsTotal = (await c.query('select count(*)::int as n from funds where institution_id=$1', [req.institutionId])).rows[0].n;
      accountsTotal = (await c.query('select count(*)::int as n from accounts where institution_id=$1', [req.institutionId])).rows[0].n;
      totalBalance = (await c.query('select coalesce(sum(initial_balance),0)::bigint as s from accounts where institution_id=$1', [req.institutionId])).rows[0].s;
    } catch(e) { /* جدول نیست */ }

    // وام‌ها
    let loansTotal = 0, loansActive = 0, loansAmount = 0, loansOverdue = 0;
    try {
      loansTotal = (await c.query('select count(*)::int as n from loans where institution_id=$1', [req.institutionId])).rows[0].n;
      loansActive = (await c.query("select count(*)::int as n from loans where institution_id=$1 and status='active'", [req.institutionId])).rows[0].n;
      loansAmount = (await c.query('select coalesce(sum(amount),0)::bigint as s from loans where institution_id=$1', [req.institutionId])).rows[0].s;
      loansOverdue = (await c.query("select count(*)::int as n from loans where institution_id=$1 and status='overdue'", [req.institutionId])).rows[0].n;
    } catch(e) {}

    // اقساط
    let insPending = 0, insOverdue = 0, insPaid = 0, insTotalAmount = 0;
    try {
      insPending = (await c.query("select count(*)::int as n from installments where institution_id=$1 and status='pending'", [req.institutionId])).rows[0].n;
      insOverdue = (await c.query("select count(*)::int as n from installments where institution_id=$1 and status='overdue'", [req.institutionId])).rows[0].n;
      insPaid = (await c.query("select count(*)::int as n from installments where institution_id=$1 and status='paid'", [req.institutionId])).rows[0].n;
      insTotalAmount = (await c.query("select coalesce(sum(amount),0)::bigint as s from installments where institution_id=$1 and status='pending'", [req.institutionId])).rows[0].s;
    } catch(e) {}

    // پرداخت‌ها
    let payTotal = 0, payAmount = 0;
    try {
      payTotal = (await c.query('select count(*)::int as n from payments where institution_id=$1', [req.institutionId])).rows[0].n;
      payAmount = (await c.query('select coalesce(sum(amount),0)::bigint as s from payments where institution_id=$1', [req.institutionId])).rows[0].s;
    } catch(e) {}

    // تراکنش‌ها
    let txnsTotal = 0, txnsDeposit = 0, txnsWithdraw = 0;
    try {
      txnsTotal = (await c.query('select count(*)::int as n from txns where institution_id=$1', [req.institutionId])).rows[0].n;
      txnsDeposit = (await c.query("select coalesce(sum(amount),0)::bigint as s from txns where institution_id=$1 and type='deposit'", [req.institutionId])).rows[0].s;
      txnsWithdraw = (await c.query("select coalesce(sum(amount),0)::bigint as s from txns where institution_id=$1 and type='withdraw'", [req.institutionId])).rows[0].s;
    } catch(e) {}

    // نمودارها — ماهانه
    let monthlyMembers = [], monthlyLoans = [], monthlyPayments = [];
    try {
      const mm = await c.query(`
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, count(*)::int as c
        from members where institution_id=$1 and deleted_at is null and created_at >= now() - interval '12 months'
        group by 1 order by 1
      `, [req.institutionId]);
      monthlyMembers = mm.rows;

      const ml = await c.query(`
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, count(*)::int as c, coalesce(sum(amount),0)::bigint as s
        from loans where institution_id=$1 and created_at >= now() - interval '12 months'
        group by 1 order by 1
      `, [req.institutionId]);
      monthlyLoans = ml.rows;

      const mp = await c.query(`
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, coalesce(sum(amount),0)::bigint as s
        from payments where institution_id=$1 and created_at >= now() - interval '12 months'
        group by 1 order by 1
      `, [req.institutionId]);
      monthlyPayments = mp.rows;
    } catch(e) {}

    // آخرین اعضا
    let recentMembers = [];
    try {
      const rm = await c.query(`
        select m.id, m.member_no, m.status, m.created_at,
               (select value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=m.id and f.key='name' limit 1) as name
        from members m where m.institution_id=$1 and m.deleted_at is null order by m.id desc limit 8
      `, [req.institutionId]);
      recentMembers = rm.rows;
    } catch(e) {}

    // آخرین وام‌ها
    let recentLoans = [];
    try {
      const rl = await c.query(`
        select l.id, l.amount, l.status, l.created_at, l.member_id,
               (select value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=l.member_id and f.key='name' limit 1) as member_name
        from loans l where l.institution_id=$1 order by l.id desc limit 8
      `, [req.institutionId]);
      recentLoans = rl.rows;
    } catch(e) {}

    return {
      members: { total: memTotal, active: memActive, newThisMonth: memNewMonth },
      funds: { total: fundsTotal, accounts: accountsTotal, totalBalance: Number(totalBalance) },
      loans: { total: loansTotal, active: loansActive, overdue: loansOverdue, totalAmount: Number(loansAmount) },
      installments: { pending: insPending, overdue: insOverdue, paid: insPaid, totalPendingAmount: Number(insTotalAmount) },
      payments: { total: payTotal, totalAmount: Number(payAmount) },
      txns: { total: txnsTotal, deposit: Number(txnsDeposit), withdraw: Number(txnsWithdraw) },
      charts: { monthlyMembers, monthlyLoans, monthlyPayments },
      recent: { members: recentMembers, loans: recentLoans }
    };
  });
  res.json(stats);
}));

module.exports = r;
