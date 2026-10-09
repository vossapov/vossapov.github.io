"""Browser contract for the homepage refinement: filters hidden behind one disclosure,
large animated hero art (ambient motion, pause, reduced motion), no horizontal overflow.
Run: <venv>/bin/python next/tests/homepage-refine.py  (preview on 127.0.0.1:8765)"""
import os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get('URL', 'http://127.0.0.1:8765/next/')
CHROME = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
fails = []
def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)

VX = "document.querySelector('.vi-scene').style.getPropertyValue('--vx')"
with sync_playwright() as s:
    b = s.chromium.launch(executable_path=CHROME, headless=True)
    for name, vp, mobile in [('desktop', {'width': 1440, 'height': 1000}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
        for lang in ('ua', 'en'):
            ctx = b.new_context(viewport=vp, has_touch=mobile, is_mobile=mobile)
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'{URL}?lang={lang}'); pg.wait_for_timeout(1200)
            tag = f'{name}/{lang}'
            check(pg.evaluate('document.documentElement.scrollWidth') <= vp['width'], f'{tag}: no horizontal overflow')
            box = pg.locator('.vi-base').bounding_box()
            check(box and box['height'] >= (600 if not mobile else 260), f'{tag}: hero art large ({box and round(box["height"])}px tall)')
            check(box and box['x'] >= 0 and box['x'] + box['width'] <= vp['width'], f'{tag}: hero art inside viewport')
            check(not pg.evaluate("document.getElementById('filtersBox').open"), f'{tag}: filters collapsed initially')
            check(not pg.locator('#cats').is_visible() and not pg.locator('#co').is_visible(), f'{tag}: filter controls hidden')
            pg.locator('.hero-figure').scroll_into_view_if_needed()
            a = pg.evaluate(VX); pg.wait_for_timeout(1300); c = pg.evaluate(VX)
            check(a != c, f'{tag}: ambient animation moves ({a} -> {c})')
            pg.click('.vi-ctrl'); pg.wait_for_timeout(500)
            a = pg.evaluate(VX); pg.wait_for_timeout(800); c = pg.evaluate(VX)
            check(a == c == '0.0000', f'{tag}: pause stops motion')
            pg.click('.vi-ctrl')
            pg.click('#filtersBox summary'); pg.wait_for_timeout(200)
            check(pg.locator('#cats').is_visible(), f'{tag}: disclosure opens')
            pg.click('#cats button:nth-child(2)'); pg.wait_for_timeout(300)
            check(pg.evaluate("document.querySelector('.filters-count').textContent") == '1', f'{tag}: active filter count')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
            check(not pg.evaluate("document.getElementById('filtersBox').open"), f'{tag}: Escape closes')
            pg.click('#filtersBox summary'); pg.click('#reset'); pg.wait_for_timeout(300)
            check(pg.evaluate("document.querySelector('.filters-count').hidden"), f'{tag}: reset clears count')
            check(not errs, f'{tag}: no JS errors {errs}')
            ctx.close()
    ctx = b.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    pg = ctx.new_page(); pg.goto(URL); pg.wait_for_timeout(1500)
    check(pg.evaluate(VX) in ('', '0.0000') and pg.locator('.vi-ctrl').is_hidden(), 'reduced motion: still, no control')
    b.close()
print(f'FAILED {len(fails)}' if fails else 'ALL PASSED')
sys.exit(1 if fails else 0)
