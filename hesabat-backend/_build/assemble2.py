#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تولید نسخه دو فایلی: Hesabat.html (لندینگ) + Panel.html (پنل مستقل)"""
import io, re

def rd(p):
    with io.open(p, 'r', encoding='utf-8') as f:
        return f.read()

orig = rd('orig.html')
css  = rd('app.css')
body = rd('app_body.html')
js   = [rd(f'app{i}.js') for i in range(1, 10)]

# ════════════════════════ ۱) ساخت Panel.html ════════════════════════

# استخراج بلوک دکمه‌ها و انیمیشن pulse از استایل لندینگ (برای استقلال پنل)
m1 = re.search(r'  \.btn \{.*?\.btn:focus-visible \{[^\n]*\n', orig, re.S)
assert m1, 'btn block not found'
btn_block = m1.group(0)
m2 = re.search(r'@keyframes pulse \{[^\n]*\}', orig)
assert m2, 'pulse not found'
pulse = m2.group(0)

base_css = """  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --paper:  #F4F0E2;
    --cream:  #FBF7EA;
    --ink:    #14351F;
    --ink-2:  #3E5747;
    --green-deep: #1C6E31;
    --lime:   #C4F45F;
    --line:   rgba(20,53,31,.16);
    --font-ui:      'IBM Plex Sans Arabic', 'DM Sans', Tahoma, sans-serif;
    --font-display: 'IBM Plex Sans Arabic', 'Fredoka', sans-serif;
  }
  body {
    background: var(--paper);
    font-family: var(--font-ui);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
""" + btn_block + "  " + pulse + "\n"

# بدنه پنل: لینک بازگشت به لندینگ + فعال‌بودن ویوی ورود در شروع
body = body.replace(
    '<a href="#/" class="login-back" id="lnkBackHome">',
    '<a href="Hesabat.html" class="login-back" id="lnkBackHome">')
body = body.replace(
    '<div class="view" id="view-login">',
    '<div class="view active" id="view-login">')

# روتر پنل: خانه = صفحه ورود (لندینگی در کار نیست)
js4 = js[3]
js4 = js4.replace(
    "if(h === '#/' || h === '#' || h === ''){ showView('landing'); return; }",
    "if(h === '#/' || h === '#' || h === ''){ showView('login'); return; }")
assert js4 != js[3]

# بوت پنل: اگر نشست فعال بود، مستقیم به داشبورد
js7 = js[6]
js7 = js7.replace(
    "  bindLogin();",
    "  if(SESSION && (location.hash==='' || location.hash==='#/' || location.hash==='#' || location.hash==='#/login')){\n"
    "    location.hash = '#/app/dashboard';\n"
    "  }\n\n"
    "  bindLogin();", 1)
assert js7 != js[6]

# خروجی سه‌فایلی: Panel.html (ساختار) + panel.css (استایل) + panel.js (منطق)
panel_css = base_css + "\n" + css
panel_js = '\n\n'.join(js[:3] + [js4, js[4], js[5], js7, js[7], js[8]])

panel = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#F4F0E2">
<title>حساب‌ها — پنل مدیریت صندوق‌ها و مؤسسات مالی</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fredoka:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="panel.css">
</head>
<body class="in-login">
""" + body + """
<script src="panel.js"></script>
</body>
</html>"""

with io.open('/home/user/Panel.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(panel)
with io.open('/home/user/panel.css', 'w', encoding='utf-8', newline='\n') as f:
    f.write(panel_css)
with io.open('/home/user/panel.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(panel_js)

# ════════════════════════ ۲) ساخت Hesabat.html (لندینگ مستقل) ════════════════════════
land = orig

# رفع باگ زنجیره انتساب در اسکریپت اصلی (اگر هنوز قدیمی باشد)
old3 = """  btnSound.title = btnSound.getAttribute('aria-label') =
    FX.muted ? T[lang].sndOff : T[lang].sndOn;"""
new3 = """  var _sndLbl = FX.muted ? T[lang].sndOff : T[lang].sndOn;
  btnSound.title = _sndLbl;
  btnSound.setAttribute('aria-label', _sndLbl);"""
if old3 in land:
    land = land.replace(old3, new3, 1)

# اتصال دکمه‌های ورود/افتتاح حساب/CTA به فایل پنل
# حالت قدیمی (اگر هنوز قدیمی باشد)
old1 = "bindStub('lnkHelp','help');     bindStub('lnkLogin','login');"
new1 = "bindStub('lnkHelp','help');"
if old1 in land:
    land = land.replace(old1, new1, 1)
    old2 = "bindStub('lnkOpen','open');     bindStub('lnkCta','cta');"
    new2 = ("['lnkLogin'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){e.preventDefault();location.href='Panel.html';});});\n"
            "['lnkOpen','lnkCta'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){e.preventDefault();location.href='Panel.html#/onboarding';});});")
    if old2 in land:
        land = land.replace(old2, new2, 1)
else:
    # حالت جدید قبلاً در orig.html اعمال شده - فقط مطمئن شو که لینک‌ها درست هستند
    # اگر هنوز Panel.html ساده است، آن را به onboarding تبدیل کن
    if "location.href='Panel.html';" in land and "Panel.html#/onboarding" not in land:
        land = land.replace(
            "['lnkLogin'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){e.preventDefault();location.href='Panel.html';});});",
            "['lnkLogin'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){e.preventDefault();location.href='Panel.html';});});\n['lnkOpen','lnkCta'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(e){e.preventDefault();location.href='Panel.html#/onboarding';});});"
        )

with io.open('/home/user/Hesabat.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(land)

print('Panel.html :', len(panel.encode('utf-8')), 'bytes')
print('panel.css  :', len(panel_css.encode('utf-8')), 'bytes')
print('panel.js   :', len(panel_js.encode('utf-8')), 'bytes')
print('Hesabat.html:', len(land.encode('utf-8')), 'bytes')
