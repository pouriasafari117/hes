const express = require('express');
const { pool, withTenant } = require('../db');
const { hashPassword } = require('../auth');
const { asyncH, requireAuth, requireInstitution } = require('../mw');

const r = express.Router({ mergeParams: true });
r.use(requireAuth, requireInstitution);

const TYPE_FA = { membership:'عضویت', loan:'وام', payment:'پرداخت' };

async function applyFieldValues(c, iid, memberId, values){
  if(!values || typeof values !== 'object') return;
  const fields = (await c.query('select id, key from field_definitions where institution_id=$1 and archived=false', [iid])).rows;
  for(const f of fields){
    if(values[f.key] == null) continue;
    await c.query(
      `insert into member_field_values(member_id, field_id, institution_id, value)
       values($1,$2,$3,$4) on conflict (member_id, field_id) do update set value=excluded.value`,
      [memberId, f.id, iid, String(values[f.key])]);
  }
}

r.get('/requests', asyncH(async (req, res) => {
  const status = String(req.query.status||'').trim();
  const type = String(req.query.type||'').trim();
  const rows = await withTenant(req.user, req.institutionId, async c => {
    const where = ['r.institution_id=$1'];
    const args = [req.institutionId];
    if(['pending','approved','rejected','cancelled'].includes(status)){ args.push(status); where.push(`r.status=$${args.length}`); }
    if(type){ args.push(type); where.push(`r.type=$${args.length}`); }
    const q = await c.query(
      `select r.*, u.name as user_name, u.phone, u.nid
       from requests r join users u on u.id=r.user_id
       where ${where.join(' and ')} order by r.created_at desc limit 300`, args);
    return q.rows;
  });
  res.json({ requests: rows });
}));

r.get('/requests/:rid', asyncH(async (req, res) => {
  const rid = parseInt(req.params.rid, 10);
  const row = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query(
      `select r.*, u.name as user_name, u.phone, u.nid
       from requests r join users u on u.id=r.user_id
       where r.id=$1 and r.institution_id=$2`, [rid, req.institutionId]);
    return q.rows[0];
  });
  if(!row) return res.status(404).json({ error: 'درخواست پیدا نشد.' });
  res.json({ request: row });
}));

r.post('/requests/:rid/approve', asyncH(async (req, res) => {
  const rid = parseInt(req.params.rid, 10);
  const out = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query('select * from requests where id=$1 and institution_id=$2 for update', [rid, req.institutionId]);
    const row = q.rows[0];
    if(!row) return { nf: true };
    if(row.status !== 'pending') return { bad: 'این درخواست قابل تأیید نیست.' };
    const payload = row.payload || {};
    if(row.type === 'membership'){
      let memberId;
      const exist = (await c.query('select id from members where institution_id=$1 and user_id=$2 and deleted_at is null limit 1', [req.institutionId, row.user_id])).rows[0];
      if(exist) memberId = exist.id;
      else {
        const noq = await c.query(`select coalesce(max(nullif(regexp_replace(coalesce(member_no,''),'\\D','','g'),'')::int),0)+1 as n from members where institution_id=$1`, [req.institutionId]);
        const ins = await c.query(`insert into members(institution_id, status, member_no, user_id) values($1,'active',$2,$3) returning id`,
          [req.institutionId, String(noq.rows[0].n), row.user_id]);
        memberId = ins.rows[0].id;
      }
      await applyFieldValues(c, req.institutionId, memberId, payload.values || {});
    }
    if(row.type === 'loan'){
      const amount = parseInt(payload.amount, 10) || 0;
      const memberId = payload.member_id || (await c.query('select id from members where user_id=$1 and institution_id=$2 and deleted_at is null', [row.user_id, req.institutionId])).rows[0]?.id;
      if(!memberId || amount<=0) return { bad: 'عضو یا مبلغ برای ایجاد وام ناقص است.' };
      const inst = (await c.query('select fee_percent, installments_count from institutions where id=$1', [req.institutionId])).rows[0];
      const cnt = parseInt(inst.installments_count,10)||12;
      const fee = inst.fee_percent||0;
      const loan = (await c.query(
        `insert into loans (institution_id, member_id, amount, fee_percent, installments_count, description)
         values ($1,$2,$3,$4,$5,$6) returning *`,
        [req.institutionId, memberId, amount, fee, cnt, payload.note||'درخواست کاربر'])).rows[0];
      const each = Math.floor(amount/cnt);
      const remainder = amount - each*cnt;
      for(let i=0;i<cnt;i++){
        const due = new Date(); due.setMonth(due.getMonth()+(i+1));
        await c.query(`insert into installments (institution_id, loan_id, member_id, due_date, amount) values ($1,$2,$3,$4,$5)`,
          [req.institutionId, loan.id, memberId, due.toISOString().slice(0,10), i===cnt-1?each+remainder:each]);
      }
    }
    await c.query(`update requests set status='approved', reviewed_by=$1, reviewed_at=now(), updated_at=now() where id=$2`, [req.user.id, rid]);
    return { ok:true, userId: row.user_id, type: row.type };
  });
  if(out.nf) return res.status(404).json({ error: 'درخواست پیدا نشد.' });
  if(out.bad) return res.status(400).json({ error: out.bad });
  await pool.query('select fn_notify($1,$2,$3,$4,$5,$6)',
    [out.userId, req.institutionId, out.type, 'درخواست شما تأیید شد.', 'نوع: '+(TYPE_FA[out.type]||out.type), rid]);
  res.json({ approved: true });
}));

r.post('/requests/:rid/reject', asyncH(async (req, res) => {
  const rid = parseInt(req.params.rid, 10);
  const reason = String(req.body.reason || req.body.reject_reason || '').trim();
  if(!reason) return res.status(400).json({ error: 'دلیل رد الزامی است.' });
  const out = await withTenant(req.user, req.institutionId, async c => {
    const q = await c.query('select * from requests where id=$1 and institution_id=$2 for update', [rid, req.institutionId]);
    const row = q.rows[0];
    if(!row) return { nf: true };
    if(row.status !== 'pending') return { bad: 'این درخواست قابل رد نیست.' };
    await c.query(
      `update requests set status='rejected', reject_reason=$1, reviewed_by=$2, reviewed_at=now(), updated_at=now() where id=$3`,
      [reason, req.user.id, rid]);
    return { ok:true, userId: row.user_id, type: row.type };
  });
  if(out.nf) return res.status(404).json({ error: 'درخواست پیدا نشد.' });
  if(out.bad) return res.status(400).json({ error: out.bad });
  await pool.query('select fn_notify($1,$2,$3,$4,$5,$6)',
    [out.userId, req.institutionId, out.type, 'درخواست شما رد شد.', 'دلیل رد: '+reason, rid]);
  res.json({ rejected: true });
}));

r.post('/upgrade', asyncH(async (req, res) => {
  const code = String(req.body.code||'').trim();
  if(code !== 'Salam') return res.status(400).json({ error: 'کد فعال‌سازی نامعتبر است.' });
  const out = await withTenant(req.user, req.institutionId, async c => {
    await c.query(`update institutions set plan_type='pro', plan_upgraded_at=now(), updated_at=now() where id=$1`, [req.institutionId]);
    const members = (await c.query(`select m.id from members m where m.institution_id=$1 and m.deleted_at is null`, [req.institutionId])).rows;
    const fields = (await c.query(`select id, key, label, type from field_definitions where institution_id=$1 and archived=false`, [req.institutionId])).rows;
    const phoneF = fields.find(f => /mobile|phone|موبایل|تماس/i.test((f.key||'')+' '+(f.label||'')));
    const nidF = fields.find(f => /nid|national|کدملی|کد ملی/i.test((f.key||'')+' '+(f.label||'')));
    const nameF = fields.find(f => /name|نام/i.test((f.key||'')+' '+(f.label||'')) && !/پدر|father/i.test((f.key||'')+' '+(f.label||'')));
    let created=0, linked=0;
    for(const m of members){
      const vals = (await c.query(`select f.key, f.id, v.value from member_field_values v join field_definitions f on f.id=v.field_id where v.member_id=$1`, [m.id])).rows;
      const map = {}; vals.forEach(v => { map[v.id]=v.value; map[v.key]=v.value; });
      const phone = String((phoneF && (map[phoneF.id]||map[phoneF.key]))||'').replace(/\D/g,'');
      const nid = String((nidF && (map[nidF.id]||map[nidF.key]))||'').replace(/\D/g,'');
      const name = String((nameF && (map[nameF.id]||map[nameF.key]))||'عضو').trim() || 'عضو';
      let user = null;
      if(phone) user = (await c.query('select id from users where phone=$1 limit 1', [phone])).rows[0];
      if(!user && nid) user = (await c.query('select id from users where nid=$1 limit 1', [nid])).rows[0];
      if(!user){
        if(!phone && !nid) continue;
        const email = (phone || ('u'+m.id)) + '@hes.local';
        try {
          const ins = await c.query(
            `insert into users(name, email, password_hash, phone, nid, role_type) values($1,$2,$3,$4,$5,'user') returning id`,
            [name, email, hashPassword(nid || ('m'+m.id)), phone||null, nid||null]);
          user = ins.rows[0]; created++;
        } catch(e){
          if(e.code==='23505'){
            user = (await c.query('select id from users where phone=$1 or nid=$2 or lower(email)=lower($3) limit 1', [phone||'', nid||'', email])).rows[0];
          } else throw e;
        }
      } else linked++;
      if(!user) continue;
      await c.query('update members set user_id=$1 where id=$2 and user_id is null', [user.id, m.id]);
    }
    try {
      await c.query(`insert into institution_audit(institution_id,user_id,action,old_value,new_value,note) values($1,$2,'plan','free','pro','ارتقا با کد فعال‌سازی')`,
        [req.institutionId, req.user.id]);
    } catch(_){}
    return { created, linked, members: members.length };
  });
  res.json({ plan:'pro', migrated: out });
}));

module.exports = r;
