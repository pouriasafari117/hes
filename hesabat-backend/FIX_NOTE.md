# فیکس Round 33.6 - ورود پایدار + خروج به صفحه اصلی

## مشکلاتی که گفتی
- حساب می‌سازی یک بار می‌ره تو پنل بعد سریعا خارج می‌شه و دوباره باید لاگین کنی
- تو صفحه ورود هرچی می‌زنی قبول نمی‌کنه، باید بری صفحه اصلی Hesabat.html و از اونجا ورود بزنی تا وارد شی
- می‌خوای بعد ساخت دیگه بیرون نیاد و مستقیم بره داخل
- وقتی لاگ‌اوت کردی تو صفحه ورود گیر می‌کنی، می‌خوای بری Hesabat.html

## علت‌ها
1. **خروج سریع بعد ثبت:** `boot()` تو `app7.js` بعد از هر رفرش `SESSION` را از `localStorage` می‌خواند و چک می‌کرد `DB.users.some(u=>username==...)`. چون کاربر سرور تو `DB.users` دمو نیست، `SESSION` دور ریخته می‌شد → `SESSION=null` → روتر می‌رفت لاگین → انگار بیرون پریدی.
2. **لاگین قبول نمی‌کرد:** همین چک باعث می‌شد حتی بعد از لاگین موفق سرور، اگر رفرش کنی SESSION دوباره پاک شود. برای همین مجبور بودی بری Hesabat.html و دوباره بیای.
3. **لاگ‌اوت گیر می‌کرد:** `logout()` فقط `location.hash='#/'` می‌زد. تو `Panel.html`، `#/` یعنی `showView('login')` نه صفحه اصلی، پس تو لاگین گیر می‌کردی.

## فیکس‌ها

### boot پایدار شد (`app7.js`)
```js
const s = localStorage.getItem(SES_KEY)
if(s){
  const o = JSON.parse(s)
  if(o && o.username){
    const isSrv = (typeof SRV!=='undefined' && SRV.token)
    if(isSrv || DB.users.some(...)) SESSION = o // اگر توکن سرور داری، بدون چک دمو قبول کن
  }
}
// اگر SRV توکن دارد ولی SESSION نداریم، از SRV بساز
if(!SESSION && SRV.token && SRV.user){
  SESSION = { username: SRV.user.phone, name: SRV.user.name, role:'admin', roleType:'manager' }
}
```
الان بعد از ساخت حساب و رفرش، SESSION حفظ می‌شود و بیرون نمی‌پری.

### ثبت‌نام مستقیم می‌ره داخل (`app9.js`)
بعد از `register-v2` موفق:
```js
SESSION = { username: phone, name: first+last, role: 'admin', roleType: 'manager' }
localStorage.setItem(SES_KEY, SESSION)
location.hash = '#/app/dashboard'
setTimeout(()=>location.reload(), 400)
```
دیگر `Panel.html#/app/dashboard` با href کامل نمی‌زنیم که باعث لود دوباره از صفر شود.

### لاگ‌اوت می‌ره Hesabat.html (`app7.js`)
```js
function logout(){
  SESSION=null; removeItem(SES_KEY)
  SRV.on=false; save SRV
  toast('خارج شدید')
  setTimeout(()=>{
    if(location.pathname.includes('Panel.html')) location.href='Hesabat.html'
    else location.href='Hesabat.html'
  }, 300)
}
```
الان بعد خروج مستقیم می‌ری صفحه اصلی، نه گیر کردن تو لاگین.

### بک‌اند بدون en (از قبل)
- `complete_schema.sql` بدون `first_name_en/last_name_en`
- `auth.js` مستقیم INSERT بدون تابع → مشکل «حسابی وجود ندارد» حل شد
- `members.js` hard delete + شماره عضویت ساده `M-xxxxxx`

## فایل‌ها
- `panel.js` 382KB syntax ok
- `hesabat-backend.zip` 201K
- `hesabat-full.zip` 482K

## تست
1. Railway دیپلوی
2. `localStorage.clear()` → `Panel.html#/onboarding` → حساب بساز → باید مستقیم بره داشبورد و دیگر بیرون نپره (حتی با رفرش)
3. خروج بزن → باید بری `Hesabat.html` نه لاگین
4. از `Hesabat.html` ورود بزن → شماره + کدملی → باید مستقیم بره پنل
5. اگر DB قدیمی داری: `drop_en_fields.sql` را یک بار تو Supabase بزن
