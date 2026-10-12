"""Focused browser QA for the "AI in my process" section only (ai-content.js / experience.js / experience.css).
Independent of the hero; the older combined experience.py still carries obsolete hero assumptions.
Usage:
   /tmp/portfolio-qa-venv/bin/python next/tests/ai-block.py [base_url] [--shots DIR]
"""
import os, sys, urllib.request
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = (args[0] if args else 'http://127.0.0.1:8765').rstrip('/')
BASE = ROOT + '/next/'
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else '/tmp/portfolio-ai-block-evidence'
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
os.makedirs(SHOTS, exist_ok=True)
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra != '' and not cond else ''))
    if not cond: fails.append(name)

def open_page(ctx, lang):
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(BASE + '?lang=' + lang); pg.wait_for_selector('#ai-work .vi-phase')
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(200)
    pg.locator('#ai-work .vi-proof-list').scroll_into_view_if_needed()
    pg.wait_for_function("[...document.querySelectorAll('#ai-work .vi-proof-media img')].every(i => i.complete)", timeout=15000)
    return pg, errs

OVERFLOW = """(() => { const W = document.documentElement.clientWidth;
  return [...document.querySelectorAll('#ai-work *')].filter(n => n.offsetParent && n.getBoundingClientRect().right > W + 1)
    .map(n => n.className || n.tagName).slice(0, 5); })()"""
CLIPPED = """(() => [...document.querySelectorAll('#ai-work h2, #ai-work h3, #ai-work h4, #ai-work p, #ai-work dd, #ai-work dt, #ai-work li, #ai-work a')]
  .filter(n => n.offsetParent && n.clientWidth > 1 && n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible')
  .map(n => n.className || n.tagName).slice(0, 5))()"""
CELL_OVERLAP = """(() => { const bad = [];
  document.querySelectorAll('#ai-work .vi-phase').forEach((ph, i) => {
    const r = [...ph.children].map(c => c.getBoundingClientRect());
    for (let k = 1; k < r.length; k++) if (r[k].top < r[k - 1].bottom - 1) bad.push(i + ':' + k);
  }); return bad; })()"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH)
    for lang, title, link in (('en', 'I set the direction', 'Open the case'), ('ua', 'Я задаю напрям', 'Відкрити кейс')):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        pg, errs = open_page(ctx, lang)
        order = pg.evaluate("(() => { const s = document.getElementById('ai-work'); return s.nextElementSibling && s.nextElementSibling.id; })()")
        check('[%s] section sits right before #contact' % lang, order == 'contact', order)
        check('[%s] heading' % lang, title in pg.inner_text('#viAiTitle'), pg.inner_text('#viAiTitle'))
        check('[%s] draft badge hidden' % lang, not pg.is_visible('#ai-work .vi-draft'))
        check('[%s] 4 phases + aria-hidden key column' % lang, pg.locator('#ai-work .vi-phase').count() == 4 and pg.get_attribute('#ai-work .vi-lane-key', 'aria-hidden') == 'true')
        empty = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-cell p, #ai-work .vi-ph-t')].filter(n => !n.textContent.trim()).length")
        check('[%s] every phase has title, me and AI text' % lang, empty == 0, empty)
        tops = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-cell-ai')].map(n => Math.round(n.getBoundingClientRect().top))")
        check('[%s] desktop swimlane rows aligned across phases' % lang, len(set(tops)) == 1, tops)
        imgs = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-proof-media img')].map(i => i.naturalWidth > 0)")
        check('[%s] 4 proof images load' % lang, imgs == [True] * 4, imgs)
        hrefs = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-proof-link')].map(a => a.getAttribute('href'))")
        check('[%s] proof links target real cases in current language' % lang,
              hrefs == ['/next/case.html?id=%s&lang=%s' % (i, lang) for i in ('blastjam', 'tilesort', 'sweep', 'budmarket-lux')], hrefs)
        for h in hrefs:
            try: code = urllib.request.urlopen(ROOT + h).status
            except Exception as e: code = str(e)
            check('[%s] case page responds %s' % (lang, h), code == 200, code)
        names = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-proof-link')].map(a => a.getAttribute('aria-label'))")
        check('[%s] link accessible names start with visible text' % lang, all(n.startswith(link + ':') for n in names), names)
        srph = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-proof-phases')].map(n => n.textContent)")
        check('[%s] phase bars have a text equivalent' % lang, all(len(s) > 8 for s in srph), srph)
        pg.hover('#ai-work .vi-proof-blastjam')
        hl = pg.evaluate("[document.querySelector('#ai-work .vi-board').hasAttribute('data-hl'), [...document.querySelectorAll('#ai-work .vi-phase')].map(n => n.classList.contains('is-hl'))]")
        check('[%s] hovering a project highlights its phases' % lang, hl == [True, [True, True, True, False]], hl)
        pg.mouse.move(5, 5)
        pg.focus('#ai-work .vi-proof-sweep .vi-proof-link')
        hl = pg.evaluate("[...document.querySelectorAll('#ai-work .vi-phase')].map(n => n.classList.contains('is-hl'))")
        check('[%s] keyboard focus highlights phases too' % lang, hl == [False, True, True, True], hl)
        pg.evaluate("document.activeElement.blur()")
        check('[%s] no overflow 1440' % lang, pg.evaluate(OVERFLOW) == [], pg.evaluate(OVERFLOW))
        pg.locator('#ai-work').screenshot(path='%s/ai-%s-1440.png' % (SHOTS, lang))
        check('[%s] no console/page errors' % lang, not errs, errs[:3])
        ctx.close()

    # language toggle keeps working in place
    ctx = b.new_context(viewport={'width': 1280, 'height': 900})
    pg, _ = open_page(ctx, 'en')
    pg.evaluate("document.querySelector('[data-set-lang=ua]').click()"); pg.wait_for_timeout(200)
    check('toggle → UA title', 'Я задаю напрям' in pg.inner_text('#viAiTitle'))
    check('toggle → UA links', pg.get_attribute('#ai-work .vi-proof-link', 'href').endswith('&lang=ua'))
    check('toggle → UA footer link', pg.inner_text('.footer-row a[href="#ai-work"]') == 'AI у моєму процесі')
    ctx.close()

    for w in (1180, 1024, 961, 960, 768, 600, 390, 360):
        for lang in ('ua', 'en'):
            ctx = b.new_context(viewport={'width': w, 'height': 900}, is_mobile=w <= 600, has_touch=w <= 600)
            pg, errs = open_page(ctx, lang)
            check('[%s %d] no horizontal overflow' % (lang, w), pg.evaluate(OVERFLOW) == [], pg.evaluate(OVERFLOW))
            check('[%s %d] no clipped text' % (lang, w), pg.evaluate(CLIPPED) == [], pg.evaluate(CLIPPED))
            check('[%s %d] phase parts do not overlap' % (lang, w), pg.evaluate(CELL_OVERLAP) == [], pg.evaluate(CELL_OVERLAP))
            if w <= 960:
                check('[%s %d] lane labels visible inside cells' % (lang, w), pg.is_visible('#ai-work .vi-phase .vi-cell-me .vi-cell-k'))
            pg.locator('#ai-work').screenshot(path='%s/ai-%s-%d.png' % (SHOTS, lang, w))
            ctx.close()

    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    pg, _ = open_page(ctx, 'en')
    td = pg.evaluate("getComputedStyle(document.querySelector('#ai-work .vi-proof-media img')).transitionDuration")
    check('reduced motion: no image transition', td in ('0s', '0s, 0s'), td)
    ctx.close()
    b.close()

print('\n%d failure(s)' % len(fails) + (': ' + ', '.join(fails) if fails else '') + '\nscreenshots: ' + SHOTS)
sys.exit(1 if fails else 0)
