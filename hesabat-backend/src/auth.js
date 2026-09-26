const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES || '7d';

/* هش پسورد با scrypt (بدون وابستگی اضافه):
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
  } catch (e) { return false; }
}

function signToken(user) {
  return jwt.sign({ uid: user.id, name: user.name, email: user.email, role_type: user.role_type || user.roleType || 'user' }, SECRET, { expiresIn: EXPIRES });
}

function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
