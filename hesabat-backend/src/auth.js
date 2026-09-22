const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES = process.env.JWT_EXPIRES || '7d';

/* تحقق کردن فراهم بودن کلید رمزنگاری */
if (!SECRET || SECRET === 'dev-only-secret-change-me' || SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set or too weak. Set a 32+ char secret in .env');
  }
  // فقط در development می‌توان از مقدار پیش‌فرض استفاده کرد
  console.warn('[Auth] Using dev secret. Set JWT_SECRET in .env for production.');
}

/* هش پسورد با scrypt (بدون وابستگی اضافی):
   قالب: scrypt$N$salt_hex$hash_hex */
function hashPassword(pass) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pass, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$16384$${salt}$${hash}`;
}

function verifyPassword(pass, stored) {
  try {
    const [alg, N, salt, hash] = stored.split('$');
    if (alg !== 'scrypt') return false;
    const got = crypto.scryptSync(pass, salt, Buffer.from(hash, 'hex').length, { N: +N, r: 8, p: 1 });
    return crypto.timingSafeEqual(got, Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

/* تولید JWT با اطلاعات کاربر */
function signToken(user) {
  const secretToUse = SECRET || 'dev-only-secret-change-me';
  return jwt.sign({ uid: user.id, name: user.name, email: user.email }, secretToUse, { expiresIn: EXPIRES });
}

/* تحقق JWT و بازگرداندن payload */
function verifyToken(token) {
  try {
    const secretToUse = SECRET || 'dev-only-secret-change-me';
    return jwt.verify(token, secretToUse);
  } catch (e) {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
