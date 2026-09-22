const { verifyToken } = require('./auth');

/* middleware برای تشخیص و validation کردن JWT token
   token را از Authorization header خواند (Bearer <token>) */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(\S+)$/);
  const token = m?.[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = { id: decoded.uid, name: decoded.name, email: decoded.email };
  next();
}

/* middleware برای عضویت در موسسه (بررسی دسترسی)
   ابتدا یک کوئری با SECURITY DEFINER اجرا می‌کند تا عضویت را بررسی کند */
function mustBeMember(pool) {
  return async (req, res, next) => {
    const institutionId = req.params.institutionId || req.body.institutionId;
    if (!institutionId) {
      return res.status(400).json({ error: 'institutionId required' });
    }

    try {
      // اجرای fn_is_member با SECURITY DEFINER (اجازه می‌دهد بدون تنظیم context)
      const result = await pool.query(
        'SELECT fn_is_member($1, $2) AS is_member',
        [req.user.id, institutionId]
      );
      
      if (!result.rows[0]?.is_member) {
        return res.status(403).json({ error: 'Not a member of this institution' });
      }

      req.institutionId = institutionId;
      next();
    } catch (e) {
      console.error('[Auth] Error checking membership:', e.message);
      res.status(500).json({ error: 'Membership check failed' });
    }
  };
}

module.exports = { authMiddleware, mustBeMember };
