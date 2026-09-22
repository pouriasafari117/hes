const express = require('express');
const { authMiddleware, mustBeMember } = require('../mw');

module.exports = (pool) => {
  const router = express.Router();

  // GET /institutions/:institutionId/payments — لیست تمام پرداخت‌ها
  router.get('/:institutionId/payments', authMiddleware, mustBeMember(pool), async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, member_id, amount, description, created_at, updated_at
         FROM payments
         WHERE institution_id = $1
         ORDER BY created_at DESC`,
        [req.institutionId]
      );
      res.json(result.rows);
    } catch (e) {
      console.error('[Payments] GET error:', e.message);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // POST /institutions/:institutionId/payments — ثبت پرداخت جدید
  router.post('/:institutionId/payments', authMiddleware, mustBeMember(pool), async (req, res) => {
    const { member_id, amount, description } = req.body;

    if (!member_id || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid member_id or amount' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO payments (institution_id, member_id, amount, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, member_id, amount, description, created_at, updated_at`,
        [req.institutionId, member_id, amount, description || '']
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('[Payments] POST error:', e.message);
      res.status(500).json({ error: 'Failed to create payment' });
    }
  });

  // PATCH /institutions/:institutionId/payments/:paymentId — ویرایش پرداخت
  router.patch('/:institutionId/payments/:paymentId', authMiddleware, mustBeMember(pool), async (req, res) => {
    const { paymentId } = req.params;
    const { amount, description } = req.body;

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
      const result = await pool.query(
        `UPDATE payments
         SET amount = COALESCE($1, amount),
             description = COALESCE($2, description),
             updated_at = NOW()
         WHERE id = $3 AND institution_id = $4
         RETURNING id, member_id, amount, description, created_at, updated_at`,
        [amount || null, description || null, paymentId, req.institutionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(result.rows[0]);
    } catch (e) {
      console.error('[Payments] PATCH error:', e.message);
      res.status(500).json({ error: 'Failed to update payment' });
    }
  });

  // DELETE /institutions/:institutionId/payments/:paymentId — حذف پرداخت
  router.delete('/:institutionId/payments/:paymentId', authMiddleware, mustBeMember(pool), async (req, res) => {
    const { paymentId } = req.params;

    try {
      const result = await pool.query(
        `DELETE FROM payments
         WHERE id = $1 AND institution_id = $2
         RETURNING id`,
        [paymentId, req.institutionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.sendStatus(204);
    } catch (e) {
      console.error('[Payments] DELETE error:', e.message);
      res.status(500).json({ error: 'Failed to delete payment' });
    }
  });

  return router;
};
