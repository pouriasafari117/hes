#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""سرهم‌کردن نهایی: لندینگ اصلی + پنل مدیریت حساب‌ها در یک فایل"""
import io, sys

def rd(p):
    with io.open(p, 'r', encoding='utf-8') as f:
        return f.read()

orig = rd('orig.html')
css  = rd('app.css')
body = rd('app_body.html')
js   = '\n\n'.join(rd(f'app{i}.js') for i in range(1, 8))

# ── ۱) هد: تزریق استایل پنل قبل از </head> ──
assert orig.count('</head>') == 1
head_inject = '\n<style>\n' + css + '\n</style>\n'
out = orig.replace('</head>', head_inject + '</head>', 1)

# ── ۲) بدنه: پیچیدن استیج لندینگ در ویو + افزودن ویوهای ورود/پنل ──
assert out.count('<body>') == 1 and out.count('</body>') == 1
body_start = out.index('<body>') + len('<body>')
body_end   = out.index('</body>')
inner = out[body_start:body_end]

# جدا کردن مارک‌آپ استیج از اسکریپت‌ها
script_pos = inner.index('<script>')
stage_markup = inner[:script_pos]
scripts_markup = inner[script_pos:]

# ── ۳) پچ اسکریپت‌های اصلی ──
# ۳-۱) توقف انیمیشن فرش وقتی ویوی لندینگ فعال نیست
anchor = "var canvas = document.getElementById('pile');"
assert scripts_markup.count(anchor) == 1
pause_hook = (
"var pileActive = true;\n"
"document.addEventListener('pile:active', function(e){\n"
"  var act = !!(e.detail && e.detail.active);\n"
"  if(act && !pileActive){ pileActive = true; try{ applySize(true); }catch(_){} requestAnimationFrame(tick); }\n"
"  pileActive = act;\n"
"});\n" + anchor)
scripts_markup = scripts_markup.replace(anchor, pause_hook, 1)

tick_anchor = 'function tick(t){'
assert scripts_markup.count(tick_anchor) == 1
scripts_markup = scripts_markup.replace(tick_anchor, 'function tick(t){\n  if(!pileActive) return;', 1)

# ۳-۲) دکمه‌های ورود/افتتاح حساب/CTA به صفحه ورود پنل بروند
old1 = "bindStub('lnkHelp','help');     bindStub('lnkLogin','login');"
new1 = "bindStub('lnkHelp','help');"
assert old1 in scripts_markup
scripts_markup = scripts_markup.replace(old1, new1, 1)
old2 = "bindStub('lnkOpen','open');     bindStub('lnkCta','cta');"
new2 = ("['lnkLogin','lnkOpen','lnkCta'].forEach(function(id){var el=document.getElementById(id);"
        "if(el)el.addEventListener('click',function(e){e.preventDefault();location.hash='#/login';});});")
assert old2 in scripts_markup
scripts_markup = scripts_markup.replace(old2, new2, 1)

# ۳-۳) رفع باگ نهفته در اسکریپت اصلی: زنجیره انتساب نامعتبر در updateSoundBtn
old3 = """  btnSound.title = btnSound.getAttribute('aria-label') =
    FX.muted ? T[lang].sndOff : T[lang].sndOn;"""
new3 = """  var _sndLbl = FX.muted ? T[lang].sndOff : T[lang].sndOn;
  btnSound.title = _sndLbl;
  btnSound.setAttribute('aria-label', _sndLbl);"""
assert old3 in scripts_markup
scripts_markup = scripts_markup.replace(old3, new3, 1)

# ── ۴) ترکیب نهایی ──
new_body = (
  '\n<div class="view active" id="view-landing">\n' + stage_markup.strip() + '\n</div>\n\n'
  + body + '\n\n'
  + scripts_markup +
  '\n<script>\n' + js + '\n</script>\n'
)
out = out[:body_start] + new_body + out[body_end:]

# عنوان سند
out = out.replace('<title>Sprout — Watch your money pile up</title>',
                  '<title>حساب‌ها — سامانه مدیریت صندوق‌ها و مؤسسات مالی</title>', 1)
# زبان پیش‌فرض فارسیِ تگ عنوان/لنگ روی خود سند هم حفظ شود (اسکریپت اولیه انجام می‌دهد)

with io.open('/home/user/Hesabat.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(out)

print('OK — size:', len(out.encode('utf-8')), 'bytes,', out.count('\n'), 'lines')
