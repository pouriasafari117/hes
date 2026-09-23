const express = require('express');
const { pool, withTenant } = require('../db');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router();
r.use(requireAuth);

/* فهرست مؤسسات کاربر */
r.get('/', asyncH(async (req, res) => {
  const q = await pool.query('select * from fn_my_institutions($1)', [req.user.id]);
  res.json({ institutions: q.rows });
}));

/* POST /api/institutions {name, slug?, ...v2} — ایجاد مؤسسه */
r.post('/', asyncH(async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'نام مؤسسه الزامی است.' });
  let slug = String(b.slug || b.institutionSlug || '').trim();
  if (!slug) slug = 'inst-' + Date.now().toString(36);
  slug = slug.toLowerCase().replace(/[^a-z0-9_\-]+/g,'-').replace(/^-|-$/g,'');
  if (!/^[a-z0-9_\-]{2,64}$/.test(slug))
    return res.status(400).json({ error: 'اسلاگ فقط حروف کوچک انگلیسی، عدد، - و _.' });

  // اگر فیلدهای v2 دارد، از تابع v2 استفاده کن
  const hasV2 = b.establishedAt || b.address || b.installmentsCount || b.currency || b.feePercent;
  let id;
  try {
    if (hasV2) {
      const q = await pool.query('select fn_create_institution_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',
        [req.user.id, name, slug,
         b.establishedAt ? new Date(b.establishedAt) : null,
         b.address || '',
         parseInt(b.installmentsCount)||12,
         b.currency||'تومان',
         parseFloat(b.feePercent)||4,
         b.installmentPeriod||'monthly'
        ]);
      id = q.rows[0].id;
    } else {
      const q = await pool.query('select fn_create_institution($1,$2,$3) as id', [req.user.id, name, slug]);
      id = q.rows[0].id;
    }
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'این اسلاگ قبلاً استفاده شده است.' });
    throw e;
  }
  /* موجودی اولیهٔ صندوق (اختیاری) */
  const initBalance = Math.max(0, parseInt(String(b.fundBalance == null ? 0 : b.fundBalance).replace(/[^0-9-]/g,'')) || 0);
  if (initBalance > 0) {
    try {
      await withTenant(req.user, id, async c => {
        await c.query('update institutions set fund_balance=$1, updated_at=now() where id=$2', [initBalance, id]);
        await c.query('insert into institution_audit(institution_id,user_id,action,old_value,new_value,note) values($1,$2,$3,$4,$5,$6)',
          [id, req.user.id, 'fund_balance', '0', String(initBalance), 'موجودی اولیه هنگام ساخت مؤسسه']);
      });
    } catch(e){ console.warn('set initial fund_balance failed:', e.message); }
  }
  res.status(201).json({ id, name, slug, status: 'active' });
}));

r.get('/:id', requireInstitution, asyncH(async (req, res) => {
  const inst = await withTenant(req.user, req.institutionId, async c => {
    return (await c.query('select id,name,slug,status,established_at,address,installments_count,currency,fee_percent,installment_period,fund_balance,icon,created_at from institutions where id=$1', [req.institutionId])).rows[0];
  });
  if (!inst) return res.status(404).json({ error: 'مؤسسه پیدا نشد.' });
  res.json({ institution: inst });
}));

/* PATCH /api/institutions/:id {name?, status?, address?, ...} */
r.patch('/:id', requireInstitution, asyncH(async (req, res) => {
  const { name, status, address, established_at, installments_count, currency, fee_percent, installment_period, fund_balance, fund_balance_note, icon } = req.body || {};
  if (status !== undefined && !['active','inactive'].includes(status))
    return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
  const inst = await withTenant(req.user, req.institutionId, async c => {
    const sets = [];
    const vals = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name=$${idx++}`); vals.push(String(name).trim()); }
    if (status !== undefined) { sets.push(`status=$${idx++}`); vals.push(status); }
    if (address !== undefined) { sets.push(`address=$${idx++}`); vals.push(String(address).trim()); }
    if (established_at !== undefined) { sets.push(`established_at=$${idx++}`); vals.push(established_at ? new Date(established_at) : null); }
    if (installments_count !== undefined) { sets.push(`installments_count=$${idx++}`); vals.push(parseInt(installments_count)||12); }
    if (currency !== undefined) { sets.push(`currency=$${idx++}`); vals.push(String(currency)); }
    if (fee_percent !== undefined) { sets.push(`fee_percent=$${idx++}`); vals.push(parseFloat(fee_percent)||0); }
    if (installment_period !== undefined) { sets.push(`installment_period=$${idx++}`); vals.push(String(installment_period)); }
    if (icon !== undefined) { sets.push(`icon=$${idx++}`); vals.push(String(icon)); }
    /* موجودی صندوق: فقط با مقدار متفاوت + لاگ در دفتر تغییرات */
    let balChanged = false, balOld = 0, balNew = 0;
    if (fund_balance !== undefined) {
      balNew = Math.max(0, parseInt(String(fund_balance).replace(/[^0-9-]/g,'')) || 0);
      const cur = await c.query('select fund_balance from institutions where id=$1', [req.institutionId]);
      balOld = Number((cur.rows[0] && cur.rows[0].fund_balance) || 0);
      balChanged = balNew !== balOld;
      if (balChanged) { sets.push(`fund_balance=$${idx++}`); vals.push(balNew); }
    }
    if (sets.length) {
      vals.push(req.institutionId);
      await c.query(`update institutions set ${sets.join(', ')}, updated_at=now() where id=$${idx}`, vals);
    }
    if (balChanged) {
      try {
        await c.query('insert into institution_audit(institution_id,user_id,action,old_value,new_value,note) values($1,$2,$3,$4,$5,$6)',
          [req.institutionId, req.user.id, 'fund_balance', String(balOld), String(balNew), String(fund_balance_note || '').trim()]);
      } catch(e){ console.warn('fund_balance audit insert failed:', e.message); }
    }
    return (await c.query('select id,name,slug,status,established_at,address,installments_count,currency,fee_percent,installment_period,fund_balance,icon,created_at from institutions where id=$1', [req.institutionId])).rows[0];
  });
  res.json({ institution: inst });
}));

/* دفتر تغییرات مالی مؤسسه (لاگ موجودی صندوق) */
r.get('/:id/audit', requireInstitution, asyncH(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit)||50));
  const rows = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(`
      select a.id, a.action, a.old_value, a.new_value, a.note, a.created_at,
             coalesce(u.name, u.first_name||' '||u.last_name) as user_name
      from institution_audit a left join users u on u.id=a.user_id
      where a.institution_id=$1 order by a.created_at desc, a.id desc limit $2`, [req.institutionId, limit]);
    return q.rows;
  });
  res.json({ rows });
}));

/* درخواست‌های عضویت */
r.get('/:id/join-requests', requireInstitution, asyncH(async (req, res) => {
  const rows = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(`
      select r.id, r.status, r.created_at, u.id as user_id, u.first_name, u.last_name, u.phone, u.nid
      from institution_join_requests r
      join users u on u.id = r.user_id
      where r.institution_id=$1 order by r.created_at desc`, [req.institutionId]);
    return q.rows;
  });
  res.json({ requests: rows });
}));

r.post('/:id/join-requests/:reqId/approve', requireInstitution, asyncH(async (req, res) => {
  const reqId = parseInt(req.params.reqId,10);
  const ok = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query('select fn_approve_join($1,$2) as ok', [req.user.id, reqId]);
    return q.rows[0].ok;
  });
  if (!ok) return res.status(400).json({ error: 'تأیید انجام نشد.' });
  res.json({ approved: true });
}));

r.post('/:id/join-requests/:reqId/reject', requireInstitution, asyncH(async (req, res) => {
  const reqId = parseInt(req.params.reqId,10);
  await withTenant(req.user, req.institutionId, async c => {
    await c.query('update institution_join_requests set status=$1, updated_at=now() where id=$2 and institution_id=$3', ['rejected', reqId, req.institutionId]);
  });
  res.json({ rejected: true });
}));

/* DELETE /api/institutions/:id — حذف کامل مؤسسه و تمام داده‌ها (فقط مالک) */
r.delete('/:id', requireInstitution, asyncH(async (req, res) => {
  const iid = req.institutionId;
  // اول با تابع امن سعی کن
  try {
    const q = await pool.query('select fn_delete_institution($1,$2) as ok', [req.user.id, iid]);
    if (q.rows[0].ok) return res.json({ deleted: true, id: iid });
  } catch (e) {
    // اگر تابع وجود نداشت یا خطا داد، fallback به حذف دستی با withTenant
    if (e.message && e.message.includes('does not exist')) {
      // تابع وجود ندارد، حذف دستی
    } else if (e.message && e.message.includes('مالک')) {
      return res.status(403).json({ error: e.message });
    } else {
      console.warn('fn_delete_institution failed, trying manual delete', e.message);
    }
  }
  // حذف دستی (اگر RLS اجازه دهد و کاربر owner باشد)
  try {
    await withTenant(req.user, iid, async c => {
      await c.query('delete from institution_join_requests where institution_id=$1', [iid]);
      await c.query('delete from member_field_values where member_id in (select id from members where institution_id=$1)', [iid]);
      await c.query('delete from members where institution_id=$1', [iid]);
      await c.query('delete from field_definitions where institution_id=$1', [iid]);
      await c.query('delete from institution_members where institution_id=$1', [iid]);
      // فاز ۲ اگر دارید:
      // await c.query('delete from payments where loan_id in (select id from loans where institution_id=$1)', [iid]);
      // await c.query('delete from installments where loan_id in (select id from loans where institution_id=$1)', [iid]);
      // await c.query('delete from loans where institution_id=$1', [iid]);
      // await c.query('delete from txns where account_id in (select id from accounts where fund_id in (select id from funds where institution_id=$1))', [iid]);
      // await c.query('delete from accounts where fund_id in (select id from funds where institution_id=$1)', [iid]);
      // await c.query('delete from funds where institution_id=$1', [iid]);
      await c.query('delete from institutions where id=$1', [iid]);
    });
    res.json({ deleted: true, id: iid });
  } catch (e2) {
    console.error('manual delete failed', e2);
    return res.status(400).json({ error: 'حذف انجام نشد: ' + e2.message });
  }
}));

module.exports = r;
