"""Browser QA for the hero scene + "AI in my process" module (experience.js / experience.css / ai-content.js).
Usage:
   /tmp/portfolio-qa-venv/bin/python next/tests/experience.py [base_url] [--inject|--integrated] [--shots DIR]
Default mode is auto: if the page does not load the module itself (window.VI_AI_COPY missing), the three files are
injected with add_style_tag / add_script_tag — so it works both before and after index.html integrates them."""
import os, sys
from playwright.sync_api import sync_playwright

args = [a for a in sys.argv[1:] if not a.startswith('--')]
BASE = (args[0] if args else 'http://127.0.0.1:8765').rstrip('/') + '/next/'
MODE = 'inject' if '--inject' in sys.argv else 'integrated' if '--integrated' in sys.argv else 'auto'
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else '/tmp/portfolio-experience-evidence'
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
os.makedirs(SHOTS, exist_ok=True)
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra != '' and not cond else ''))
    if not cond: fails.append(name)

def open_page(ctx, query=''):
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('response', lambda r: errs.append('HTTP%d %s' % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(BASE + query); pg.wait_for_load_state('load')
    has = pg.evaluate('!!window.VI_AI_COPY')
    if MODE == 'inject' or (MODE == 'auto' and not has):
        pg.add_style_tag(url=BASE + 'experience.css')
        pg.add_script_tag(url=BASE + 'ai-content.js')
        pg.add_script_tag(url=BASE + 'experience.js')
    elif MODE == 'integrated':
        check('integrated: module loaded by index.html', has)
    pg.wait_for_selector('.hero-figure.vi-on .vi-scene', timeout=8000)
    pg.wait_for_selector('#ai-work')
    pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(250)
    return pg, errs

VARS = "(() => { const s = getComputedStyle(document.querySelector('.vi-scene')); return ['--vx','--vy','--vt'].map(k => parseFloat(s.getPropertyValue(k)) || 0); })()"
CAM = "getComputedStyle(document.querySelector('.vi-cam')).transform"
IDENT = ('none', 'matrix(1, 0, 0, 1, 0, 0)')
def rect(pg, sel): return pg.evaluate("(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })", sel)
def overlap(a, b): return min(a[2], b[2]) - max(a[0], b[0]) > 1 and min(a[3], b[3]) - max(a[1], b[1]) > 1
def label(pg, sel): return pg.evaluate("(s => { const n = document.querySelector(s); return (n.getAttribute('aria-label') || n.textContent).trim(); })", sel)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH)

    # ── desktop 1440: layers, alignment, pointer tilt, pause, language, AI section
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg, errs = open_page(ctx)
    imgs = pg.evaluate("[...document.querySelectorAll('.vi-scene img')].map(i => [i.src.split('/').pop(), i.complete && i.naturalWidth > 0])")
    check('scene layers load (base + native dog head)', len(imgs) == 2 and all(ok for _, ok in imgs) and {n for n, _ in imgs} == {'mascot-scene-base.png', 'mascot-scene-doghead.png'}, imgs)
    al = pg.evaluate("""(() => { const b = document.querySelector('.vi-base').getBoundingClientRect(), h = document.querySelector('.vi-head').getBoundingClientRect();
        return [h.left - b.left - b.width * 558 / 1024, h.top - b.top - b.height * 838 / 1536, h.width - b.width * 250 / 1024, h.height - b.height * 270 / 1536]; })()""")
    check('dog head aligned to base within 0.5px', all(abs(v) < 0.5 for v in al), al)
    check('only one dog head layer in scene', pg.locator('.vi-scene .vi-head').count() == 1)
    orig = pg.evaluate("(() => { const i = document.querySelector('.hero-figure .vi-orig'); return i && [i.alt, i.getAttribute('aria-hidden')]; })()")
    check('original hero img kept for its alt text', bool(orig and orig[0]) and orig[1] is None, orig)
    check('decorative scene is aria-hidden', pg.get_attribute('.vi-scene', 'aria-hidden') == 'true')
    check('hover mode: pause visible, tap hidden', pg.is_visible('.vi-ctrl') and not pg.is_visible('.vi-tap'))
    cb = pg.evaluate("document.querySelector('.vi-ctrl').getBoundingClientRect().height")
    check('pause control >= 44px', cb >= 44, cb)
    check('neutral at rest', pg.evaluate(CAM) in IDENT and pg.evaluate(VARS) == [0, 0, 0], pg.evaluate(CAM))
    pg.screenshot(path=SHOTS + '/desktop-hero-rest.png', clip={'x': 0, 'y': 0, 'width': 1440, 'height': 720})
    sc = rect(pg, '.vi-scene')
    pg.mouse.move(sc[0] + 10, sc[1] + 120); pg.mouse.move(260, 360, steps=6); pg.wait_for_timeout(700)
    v = pg.evaluate(VARS); t1 = pg.evaluate(CAM)
    check('pointer tilts the stage', t1 not in IDENT and v[0] < -0.2, (t1, v))
    check('tilt bounded', all(-1 <= x <= 1 for x in v), v)
    check('dog head turns toward cursor on owner side', 0 < v[2] <= 1, v)
    pg.screenshot(path=SHOTS + '/desktop-hero-tilt-left.png', clip={'x': 0, 'y': 0, 'width': 1440, 'height': 720})
    pg.mouse.move(sc[2] - 6, sc[1] + 40, steps=6); pg.wait_for_timeout(700)
    v2 = pg.evaluate(VARS)
    check('tilt follows pointer to the right', v2[0] > v[0] and pg.evaluate(CAM) != t1, v2)
    pg.screenshot(path=SHOTS + '/desktop-hero-tilt-right.png', clip={'x': 0, 'y': 0, 'width': 1440, 'height': 720})
    hero_bottom = rect(pg, '.hero')[3]
    pg.mouse.move(700, hero_bottom + 60, steps=4); pg.wait_for_timeout(1200)
    check('resets to neutral on pointer leave', pg.evaluate(CAM) in IDENT and pg.evaluate(VARS) == [0, 0, 0], (pg.evaluate(CAM), pg.evaluate(VARS)))
    check('pause label EN', label(pg, '.vi-ctrl') == 'Pause motion', label(pg, '.vi-ctrl'))
    pg.click('.vi-ctrl')
    check('pause → resume label', label(pg, '.vi-ctrl') == 'Resume motion', label(pg, '.vi-ctrl'))
    pg.mouse.move(300, 300, steps=6); pg.wait_for_timeout(500)
    check('paused: pointer does not move the stage', pg.evaluate(VARS) == [0, 0, 0], pg.evaluate(VARS))
    pg.focus('.vi-ctrl'); pg.keyboard.press('Enter')
    check('keyboard resumes motion', label(pg, '.vi-ctrl') == 'Pause motion')
    # off-screen pause: synthetic pointer events while the hero is scrolled out of view must be ignored
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelector('.hero').dispatchEvent(new PointerEvent('pointermove', {clientX: 50, clientY: 50, pointerType: 'mouse', bubbles: true}))"); pg.wait_for_timeout(300)
    check('off-screen: stage stays still', pg.evaluate(VARS) == [0, 0, 0], pg.evaluate(VARS))
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300)

    # AI section
    order = pg.evaluate("(() => { const s = document.getElementById('ai-work'); return [s.tagName, s.nextElementSibling && s.nextElementSibling.id]; })()")
    check('#ai-work section sits right before #contact', order == ['SECTION', 'contact'], order)
    check('AI marked draft (EN)', pg.inner_text('#ai-work .vi-draft').strip() == 'Draft / to be refined' and pg.is_visible('#ai-work .vi-draft'))
    check('draft badge inside the section heading', 'Draft' in pg.evaluate("document.getElementById('viAiTitle').textContent"))
    check('header nav link to #ai-work visible at 1440', pg.is_visible('.header-nav a[href="#ai-work"]'))
    check('footer link to #ai-work', pg.locator('.footer-row a[href="#ai-work"]').count() == 1)
    tabs = pg.locator('#ai-work [role=tab]')
    check('4 process tabs', tabs.count() == 4, tabs.count())
    sel = lambda: pg.evaluate("[...document.querySelectorAll('#ai-work [role=tab]')].map(t => t.getAttribute('aria-selected') === 'true').indexOf(true)")
    vis = lambda: pg.evaluate("[...document.querySelectorAll('#ai-work [role=tabpanel]')].filter(p => !p.hidden).map(p => p.id)")
    act = lambda: pg.evaluate("document.activeElement.id")
    check('first tab selected, one panel shown', sel() == 0 and vis() == ['viPanel0'], (sel(), vis()))
    check('panel labelled by tab', pg.get_attribute('#viPanel0', 'aria-labelledby') == 'viTab0' and pg.get_attribute('#viTab0', 'aria-controls') == 'viPanel0')
    check('roving tabindex', pg.evaluate("[...document.querySelectorAll('#ai-work [role=tab]')].map(t => t.tabIndex).join()") == '0,-1,-1,-1')
    pg.focus('#viTab0'); pg.keyboard.press('ArrowDown')
    check('ArrowDown → next tab focused + selected', sel() == 1 and act() == 'viTab1' and vis() == ['viPanel1'], (sel(), act(), vis()))
    pg.keyboard.press('End'); check('End → last', sel() == 3 and act() == 'viTab3')
    pg.keyboard.press('Home'); check('Home → first', sel() == 0 and act() == 'viTab0')
    pg.keyboard.press('ArrowLeft'); check('ArrowLeft wraps to last', sel() == 3)
    pg.keyboard.press('ArrowRight'); check('ArrowRight wraps to first', sel() == 0)
    pg.click('#viTab2'); check('click selects tab', sel() == 2 and vis() == ['viPanel2'])
    rows = pg.evaluate("[...document.querySelectorAll('#viPanel2 .vi-row dt')].map(d => d.textContent)")
    check('panel shows input / AI / human review rows', rows == ['Input / task', 'Where AI helps', 'What I decide and check myself'], rows)
    pg.click('#viPanel2 summary'); pg.wait_for_timeout(150)
    check('example prompt expands', pg.evaluate("document.querySelector('#viPanel2 details').open") and pg.is_visible('#viPanel2 blockquote'))
    check('no fake AI output in panels', pg.locator('#ai-work [class*=output], #ai-work [class*=typing]').count() == 0)
    # language follows the app toggle, focus is preserved
    pg.focus('#viTab2')
    pg.evaluate("document.querySelector('[data-set-lang=ua]').click()"); pg.wait_for_timeout(200)
    check('lang → UA: html data-lang', pg.evaluate("document.documentElement.getAttribute('data-lang')") == 'ua')
    check('UA pause label', label(pg, '.vi-ctrl') == 'Призупинити рух', label(pg, '.vi-ctrl'))
    check('UA AI title + draft badge', pg.inner_text('#viAiTitle span').strip() == 'Як я працюю з AI' and pg.inner_text('#ai-work .vi-draft').strip() == 'Чернетка / доповнюється', pg.inner_text('#viAiTitle'))
    check('UA panel labels', pg.inner_text('#viPanel2 .vi-row-me dt') == 'Що я вирішую і перевіряю сам')
    check('UA footer link', pg.inner_text('.footer-row a[href="#ai-work"]') == 'AI у моєму процесі')
    check('focus kept on tab across language change', act() == 'viTab2' and sel() == 2, (act(), sel()))
    check('UA hero alt follows app', 'Валентин' in pg.get_attribute('.hero-figure .vi-orig', 'alt'))
    pg.locator('#ai-work').scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    pg.locator('#ai-work').screenshot(path=SHOTS + '/desktop-ai-ua.png')
    pg.evaluate("document.querySelector('[data-set-lang=en]').click()"); pg.wait_for_timeout(200)
    check('lang → EN restores labels', label(pg, '.vi-ctrl') == 'Pause motion' and 'How I work with AI' in pg.inner_text('#viAiTitle'))
    pg.click('#viTab0')
    pg.locator('#ai-work').screenshot(path=SHOTS + '/desktop-ai-en.png')
    check('no console errors (desktop)', not errs, errs)
    ctx.close()

    # ── layout at 320 / 390 / 768 / 1440: overflow, overlaps, compact header
    for w, hgt, touch in ((320, 700, True), (390, 844, True), (768, 1024, True), (960, 800, False), (1440, 900, False)):
        c = b.new_context(viewport={'width': w, 'height': hgt}, has_touch=touch, is_mobile=touch and w < 700, device_scale_factor=2 if touch else 1)
        q, e = open_page(c, '?lang=ua' if w == 390 else '')
        ov = q.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check('no h-overflow %dpx' % w, ov <= 0, ov)
        sc = rect(q, '.vi-scene')
        for s in ('.hero-lede', '.hero-actions', '#heroTitle', '.hero .eyebrow'):
            if overlap(sc, rect(q, s)): check('scene clear of %s at %dpx' % (s, w), False, (sc, rect(q, s)))
        check('scene inside viewport %dpx' % w, sc[0] >= 0 and sc[2] <= w, sc)
        nav_h = q.evaluate("document.querySelector('.header-nav').getBoundingClientRect().height")
        check('header nav stays one row %dpx' % w, nav_h <= 48, nav_h)
        hdr_h = q.evaluate("document.querySelector('.site-header').getBoundingClientRect().height")
        # baseline without the module: 2 rows ≈ 117px at 521–959, 2 compact rows ≈ 100px at ≤520, 1 row ≈ 73px at ≥960
        check('compact header (<=2 rows) %dpx' % w, hdr_h <= (110 if w <= 520 else 120 if w <= 959 else 80), hdr_h)
        if w <= 520: check('nav AI link hidden in compact header %dpx' % w, not q.is_visible('.header-nav a[href="#ai-work"]'))
        tr = q.evaluate("[...document.querySelectorAll('#ai-work [role=tab]')].map(t => { const r = t.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })")
        bad = [(i, j) for i in range(len(tr)) for j in range(i + 1, len(tr)) if overlap(tr[i], tr[j])]
        check('tabs do not overlap %dpx' % w, not bad, bad)
        check('tabs >= 44px tall %dpx' % w, all(r[3] - r[1] >= 44 for r in tr), tr)
        pr = rect(q, '#ai-work .vi-panel:not([hidden])')
        check('panel clear of tabs %dpx' % w, not any(overlap(pr, r) for r in tr))
        clipped = q.evaluate("[...document.querySelectorAll('#ai-work *')].filter(n => n.offsetParent && n.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length")
        check('AI section within viewport %dpx' % w, clipped == 0, clipped)
        if touch:
            check('tap mode %dpx: Animate visible, pause hidden' % w, q.is_visible('.vi-tap') and not q.is_visible('.vi-ctrl'))
            tb = rect(q, '.vi-tap')
            check('Animate target >= 44px %dpx' % w, tb[2] - tb[0] >= 44 and tb[3] - tb[1] >= 44, tb)
        q.screenshot(path=SHOTS + '/hero-%d.png' % w, clip={'x': 0, 'y': 0, 'width': w, 'height': min(hgt, 760)})
        q.locator('#ai-work').screenshot(path=SHOTS + '/ai-%d.png' % w)
        check('no console errors %dpx' % w, not e, e)
        if w == 390:
            check('UA Animate label', q.get_attribute('.vi-tap', 'aria-label') == 'Оживити сцену')
            q.locator('.vi-tap').tap(); q.wait_for_timeout(700)
            mv = q.evaluate(VARS)
            check('Animate plays a finite look-around', mv[0] != 0, mv)
            check('Animate → Stop label while playing', q.get_attribute('.vi-tap', 'aria-label') == 'Зупинити анімацію')
            q.screenshot(path=SHOTS + '/hero-390-animating.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 420})
            q.wait_for_timeout(2600)
            check('Animate returns to still', q.evaluate(VARS) == [0, 0, 0] and q.get_attribute('.vi-tap', 'aria-label') == 'Оживити сцену', q.evaluate(VARS))
            q.locator('.vi-tap').tap(); q.wait_for_timeout(300); q.locator('.vi-tap').tap(); q.wait_for_timeout(100)
            check('second tap stops immediately', q.evaluate(VARS) == [0, 0, 0])
        c.close()

    # ── reduced motion: never moves, no motion controls
    for w in (1440, 390):
        c = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce', has_touch=w < 700)
        r, e = open_page(c)
        check('reduced %dpx: motion controls hidden' % w, not r.is_visible('.vi-ctrl') and not r.is_visible('.vi-tap'))
        check('reduced %dpx: data-mode' % w, r.get_attribute('.vi-scene', 'data-mode') == 'reduced')
        if w == 1440:
            r.mouse.move(200, 300); r.mouse.move(900, 200, steps=8); r.wait_for_timeout(600)
        else:
            r.evaluate("document.querySelector('.hero').dispatchEvent(new PointerEvent('pointermove', {clientX: 10, clientY: 10, pointerType: 'mouse', bubbles: true}))"); r.wait_for_timeout(300)
        check('reduced %dpx: stage stays still' % w, r.evaluate(CAM) in IDENT and r.evaluate(VARS) == [0, 0, 0], (r.evaluate(CAM), r.evaluate(VARS)))
        check('no console errors reduced %dpx' % w, not e, e)
        c.close()

    # ── no JS: original hero image remains
    c = b.new_context(viewport={'width': 1440, 'height': 900}, java_script_enabled=False)
    n = c.new_page(); n.goto(BASE); n.wait_for_timeout(500)
    check('no-JS: original hero image visible', n.is_visible('.hero-figure img') and n.evaluate("document.querySelector('.hero-figure img').naturalWidth") > 0)
    c.close()
    b.close()

print('\n%d failure(s)' % len(fails) + (': ' + ', '.join(fails) if fails else '') + '\nscreenshots: ' + SHOTS)
sys.exit(1 if fails else 0)
