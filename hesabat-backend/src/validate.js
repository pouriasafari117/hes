/* تابع‌های validation برای ورودی‌های کاربر */

/* تحقق شماره ملی (NID) ایران: 10 رقم
   الگوریتم: جمع‌بندی وزن‌دار digits[0..8] mod 11 */
function validateNID(nid) {
  const normalized = String(nid).replace(/[^\d]/g, '');
  
  if (normalized.length !== 10) return false;
  if (!/^\d+$/.test(normalized)) return false;
  
  // محاسبه checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(normalized[i]) * (10 - i);
  }
  const check = sum % 11;
  const expected = check < 2 ? check : 11 - check;
  
  return parseInt(normalized[9]) === expected;
}

/* تحقق شماره تلفن ایران: 11 رقم شروع با 0 یا 98+ */
function validatePhone(phone) {
  const normalized = String(phone).replace(/[^\d+]/g, '');
  
  // الگو: 09xx-xxxxxxx یا +989xx-xxxxxxx
  if (normalized.startsWith('0')) {
    return /^0\d{10}$/.test(normalized);
  } else if (normalized.startsWith('+98')) {
    return /^\+98\d{10}$/.test(normalized);
  }
  
  return false;
}

/* تحقق نام کاربری: 3-20 کاراکتر، حروف/اعداد/نقطه/آندرسکور */
function validateUsername(username) {
  return /^[a-zA-Z0-9_.]{3,20}$/.test(username);
}

/* تحقق رمز عبور: حداقل 6 کاراکتر */
function validatePassword(password) {
  return String(password).length >= 6;
}

/* تحقق ایمیل */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* تحقق مبلغ: عدد مثبت*/
function validateAmount(amount) {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

module.exports = {
  validateNID,
  validatePhone,
  validateUsername,
  validatePassword,
  validateEmail,
  validateAmount
};
