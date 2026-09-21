# فیکس Round 33.7 - ریشه‌یابی پرش بعد از ثبت‌نام

## مشکل واقعی که گفتی
- بعد ساخت حساب می‌پره بیرون و می‌ره به URL خراب `Panel.html#/)/dashboard` (در واقع `Panel.html#/app/dashboard` بود ولی مارک‌داون لینک را شکسته بود)
- هر چی تو لاگین می‌زنی وارد نمی‌شه، باید بری Hesabat.html

## ریشه‌یابی دقیق (Root Cause)
ترتیب لود اسکریپت‌ها در `assemble2.py` اشتباه بود:
```python
# قدیمی - BUG
panel_js = app1+app2+app3+app4+app5+app6+app7+app8+app9
# app7 = boot() که SESSION را چک می‌کند
# app8 = SRV تعریف می‌شود
```
`boot()` تو `app7.js` یک IIFE است که **بلافاصله** موقع لود اجرا می‌شود. چون `SRV` هنوز تعریف نشده بود (تو app8 بعدی است)، شرط `typeof SRV!=='undefined' && SRV.token` همیشه false بود. پس boot فکر می‌کرد تو حالت دمو هستی و `SESSION` را که تازه از سرور ساخته بودی، چون تو `DB.users` دمو نبود، دور می‌ریخت → `SESSION=null` → `route()` می‌رفت `#/login` → انگار پریدی بیرون.

## فیکس‌ها

### 1. ترتیب لود درست شد (`assemble2.py`)
```python
# جدید - FIX
panel_js = app1+app2+app3+app4+app5+app6+app8+app7+app9
# الان SRV قبل از boot لود می‌شود
```
الان تو `panel.js`:
- line 812: `function route()`
- line 2372: `const SRV_KEY` (app8)
- line 4430: `function logout()`
- line 4456: `(function boot()`
SRV قبل از boot است.

### 2. boot مقاوم شد (`app7.js`)
حتی اگر SRV global نباشد، از localStorage مستقیم می‌خواند:
```js
function getSrvFromStorage(){
  try{
    if(typeof SRV!=='undefined' && SRV.token) return SRV;
    const raw = localStorage.getItem('hesabat-srv-v1');
    if(raw){ const o = JSON.parse(raw); if(o && o.token) return o; }
  }catch(e){}
  return null;
}
const srv = getSrvFromStorage();
const isSrv = !!(srv && srv.token);
if(isSrv || DB.users.some(...)) SESSION = o;
```
و اگر SESSION نداریم ولی SRV token داریم، از SRV می‌سازد.

### 3. route مقاوم شد (`app4.js`)
همان `getSrv()` از localStorage، و حتی اگر `SRV.on=false` باشد، فقط وجود token کافیست برای ورود به `#/app/dashboard`:
```js
const srv = getSrv();
const isSrvAuth = !!(srv && srv.token);
if(!SESSION && !isSrvAuth){ location.hash='#/login'; }
```
و `showView('landing')` به `showView('login')` تغییر کرد تا تو Panel.html گیر نکنی.

### 4. register و login همیشه on=true می‌کنند
قبلاً فقط وقتی `institutionId` داشت `on=true` می‌شد. اگر ساخت مؤسسه به هر دلیلی خطا می‌داد، on=false می‌ماند و روتر SESSION را نمی‌پذیرفت.

الان:
```js
// app9.js register
SRV.token = res.token;
SRV.user = res.user;
SRV.instId = res.institutionId || null;
SRV.instName = onboardData.institutionName || '';
SRV.on = true; // همیشه true وقتی توکن داریم

// app7.js login
SRV.token = j.token; SRV.user = j.user;
SRV.on = true; // فوری true
```

### 5. logout می‌ره Hesabat.html
```js
function logout(){
  SESSION=null; remove SES_KEY;
  SRV.on=false; save
  setTimeout(()=> location.href='Hesabat.html', 250);
}
```

## تست نهایی
1. `hesabat-backend.zip` جدید (201K) را روی Railway دیپلوی کن (همون `hes-production-4d37.up.railway.app`)
2. تو مرورگر: `localStorage.clear()` + `sessionStorage.clear()`
3. برو `Panel.html#/onboarding` → مدیر → اطلاعات → مؤسسه → ایجاد
4. باید بره `Panel.html#/app/dashboard` و **دیگر بیرون نپره** حتی با رفرش (F5)
5. خروج بزن → باید بری `Hesabat.html` نه لاگین
6. از Hesabat.html ورود بزن → شماره تماس + کدملی → باید بره داشبورد

## فایل‌ها
- `panel.js` 384KB (قبلاً 382KB) - ترتیب درست SRV قبل boot
- `hesabat-backend.zip` 201K
- `hesabat-full.zip` 482K
- فقط `drop_en_fields.sql` برای DB قدیمی لازم است (en ستون‌ها را حذف می‌کند)
