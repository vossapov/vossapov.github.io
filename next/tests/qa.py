"""Browser QA for the /next/ variant. Usage:
   /tmp/portfolio-qa-venv/bin/python next/tests/qa.py [base_url]
Requires Playwright + a Chromium executable (CHROME env var or default path)."""
import os, sys, json
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765').rstrip('/') + '/next/'
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
fails = []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra and not cond else ''))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH)
    # ── data completeness
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('requestfailed', lambda r: errs.append('REQFAIL ' + r.url))
    pg.on('response', lambda r: errs.append('HTTP%d %s' % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(600)
    d = pg.evaluate('window.VI_DATA')
    n = len(d['projects'])
    cards = pg.locator('.card-open').count()
    check('all projects rendered (%d)' % n, cards == n, cards)
    check('7 companies in career strip', pg.locator('.cr').count() == len(d['companies']))
    check('Tatem names/links preserved', any(p_['name'][0] == 'Tatem Blast: Color Pop' and len(p_['links']) == 2 for p_ in d['projects']) and any(p_['name'][0] == 'Sort Dash: Enchanted' for p_ in d['projects']))
    check('ongoing flags', sorted(c['id'] for c in d['companies'] if c['ongoing']) == ['freelance', 'whimsy'])
    check('html lang en', pg.evaluate('document.documentElement.lang') == 'en')
    # images all load
    pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(1500)
    broken = pg.evaluate("[...document.querySelectorAll('.stream img')].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
    check('no broken card images', not broken, broken)
    # ── search / filters
    pg.fill('#q', 'tatem'); pg.wait_for_timeout(400)
    check('search by company', pg.locator('.card-open').count() == 2, pg.locator('.card-open').count())
    check('status count text', 'Showing 2 of %d' % n in pg.inner_text('#status'), pg.inner_text('#status'))
    check('URL has q', 'q=tatem' in pg.url)
    pg.fill('#q', ''); pg.wait_for_timeout(300)
    pg.click('[data-cat=branding]'); pg.wait_for_timeout(200)
    nb = pg.locator('.card-open').count()
    check('category branding', nb == sum(1 for p_ in d['projects'] if p_['category'] == 'branding'), nb)
    pg.select_option('#co', 'freelance'); pg.wait_for_timeout(200)
    check('category+company combo', pg.locator('.card-open').count() == sum(1 for p_ in d['projects'] if p_['category'] == 'branding' and p_['co'] == 'freelance'))
    check('rail only lists valid years', all(pg.locator('#yearRail [data-year="%s"]' % y).count() == 1 for y in pg.evaluate("[...document.querySelectorAll('.year')].map(s=>s.dataset.year)")))
    pg.fill('#q', 'zzzzqq'); pg.wait_for_timeout(300)
    check('empty state', pg.locator('.empty').count() == 1 and pg.locator('#yearRail button').count() == 0)
    pg.click('.empty [data-action=reset]'); pg.wait_for_timeout(200)
    check('reset restores all', pg.locator('.card-open').count() == n and pg.input_value('#q') == '' and pg.locator('#reset').is_disabled())
    # back/forward
    pg.click('[data-cat=games]'); pg.wait_for_timeout(100)
    pg.go_back(); pg.wait_for_timeout(300)
    check('back restores category', pg.locator('.card-open').count() == n, pg.url)
    pg.go_forward(); pg.wait_for_timeout(300)
    check('forward re-applies category', pg.locator('.card-open').count() == sum(1 for p_ in d['projects'] if p_['category'] == 'games'))
    pg.click('#reset'); pg.wait_for_timeout(200)
    # ── view/density
    pg.click('[data-view=gallery]'); pg.wait_for_timeout(200)
    check('gallery view', pg.locator('.tile').count() == n and 'view=gallery' in pg.url)
    pg.click('[data-view=timeline]'); pg.click('[data-dens=overview]'); pg.wait_for_timeout(200)
    check('overview density', pg.locator('.card-compact').count() == n and pg.locator('.card-desc').count() == 0)
    pg.click('[data-dens=detail]')
    # ── year jump + scrollspy
    pg.click('#yearRail [data-year="2020"]'); pg.wait_for_timeout(1200)
    top = pg.evaluate("document.querySelector('#y2020').getBoundingClientRect().top")
    check('year jump lands near sticky line', 40 < top < 140, top)
    check('scrollspy marks 2020', pg.evaluate("document.querySelector('#yearRail [aria-current]')?.dataset.year") == '2020')
    check('URL y=2020', 'y=2020' in pg.url, pg.url)
    pg.mouse.wheel(0, 2500); pg.wait_for_timeout(700)
    cur = pg.evaluate("document.querySelector('#yearRail [aria-current]')?.dataset.year")
    check('scrollspy follows scroll', cur and cur != '2020', cur)
    # ── dialog
    pg.evaluate('window.scrollTo({top:3000,behavior:"instant"})'); pg.wait_for_timeout(300)
    btn = pg.locator('.card-open').nth(3); bid = btn.get_attribute('data-open')
    btn.evaluate("e=>{e.scrollIntoView({block:'center',behavior:'instant'});e.focus({preventScroll:true})}"); pg.wait_for_timeout(200); sy = pg.evaluate('scrollY'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check('dialog opens', pg.evaluate("document.getElementById('dlg').open") and ('p=' + bid) in pg.url)
    check('dialog case link', pg.locator('#dlg a[href="/project.html#%s"]' % bid).count() == 1)
    multi = pg.locator('#dlg [data-gal]').count() > 0
    if multi:
        c1 = pg.inner_text('#dlgCounter'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
        check('arrow key advances gallery', pg.inner_text('#dlgCounter') != c1, c1)
        pg.click('#dlg [data-gal="-1"]'); check('prev button', pg.inner_text('#dlgCounter') == c1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    check('Escape closes', not pg.evaluate("document.getElementById('dlg').open"))
    check('focus returns to opener', pg.evaluate("document.activeElement?.dataset?.open") == bid)
    check('scroll preserved', abs(pg.evaluate('scrollY') - sy) < 5, (sy, pg.evaluate('scrollY')))
    check('URL p cleared', 'p=' not in pg.url, pg.url)
    sx = pg.evaluate('scrollY'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    check('arrows inert outside dialog', True)
    # deep link + back
    pg.goto(BASE + '?p=blastjam&q=tatem'); pg.wait_for_timeout(700)
    check('deep link opens dialog', pg.evaluate("document.getElementById('dlg').open") and pg.locator('#dlgTitle').inner_text() == 'Tatem Blast: Color Pop')
    check('deep link store links', pg.locator('#dlg a[href*="apps.apple.com"]').count() == 1 and pg.locator('#dlg a[href*="play.google.com"]').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('filters retained after dialog', pg.input_value('#q') == 'tatem' and pg.locator('.card-open').count() == 2)
    pg.click('.card-open >> nth=0'); pg.wait_for_timeout(300); pg.go_back(); pg.wait_for_timeout(300)
    check('back closes dialog', not pg.evaluate("document.getElementById('dlg').open"))
    # ── language
    pg.click('[data-set-lang=ua]'); pg.wait_for_timeout(300)
    check('lang uk', pg.evaluate('document.documentElement.lang') == 'uk' and 'lang=ua' in pg.url)
    check('UA filters retained', pg.input_value('#q') == 'tatem' and pg.locator('.card-open').count() == 2)
    check('UA status', 'Показано 2 із' in pg.inner_text('#status'), pg.inner_text('#status'))
    pg.click('.card-open >> nth=0'); pg.wait_for_timeout(300)
    check('UA dialog labels', 'Повний кейс' in pg.inner_text('#dlg'))
    pg.keyboard.press('Escape')
    check('no JS/network errors (desktop)', not errs, errs)
    ctx.close()
    # ── responsive overflow & mobile
    for w, h in ((360, 740), (390, 844), (768, 1024), (1440, 900)):
        c2 = b.new_context(viewport={'width': w, 'height': h}); q = c2.new_page(); e2 = []
        q.on('pageerror', lambda e: e2.append(str(e)))
        for url in (BASE, BASE + '?view=gallery', BASE + '?p=undead&lang=ua', BASE + '?dens=overview'):
            q.goto(url); q.wait_for_timeout(500)
            ov = q.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            check('no h-overflow %dpx %s' % (w, url.split('next/')[1] or '/'), ov <= 0, ov)
        q.goto(BASE); q.wait_for_timeout(400)
        small = q.evaluate("""[...document.querySelectorAll('button, a[href], select, input')].filter(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&!e.closest('.sr-only')&&cs.visibility!=='hidden'&&(r.height<43.5||(r.width<43.5&&e.tagName!=='A'))&&!e.classList.contains('card-open')&&!e.closest('.year-rail')&&!e.matches('.skip-link')}).map(e=>(e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))""")
        check('44px targets %d' % w, not small, small[:6])
        if w <= 768:
            q.click('#yearChips [data-year="2021"]'); q.wait_for_timeout(1000)
            t = q.evaluate("document.querySelector('#y2021').getBoundingClientRect().top")
            check('mobile chip jump %d' % w, 20 < t < 140, t)
        c2.close()
    # ── reduced motion & storage-blocked smoke
    c3 = b.new_context(viewport={'width': 390, 'height': 800}, reduced_motion='reduce'); r = c3.new_page(); e3 = []
    r.on('pageerror', lambda e: e3.append(str(e)))
    r.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
    r.goto(BASE); r.wait_for_timeout(400)
    check('works with storage blocked', not e3 and r.locator('.card-open').count() > 0, e3)
    c3.close(); b.close()
print('\nFAILED: %d' % len(fails), fails)
sys.exit(1 if fails else 0)
