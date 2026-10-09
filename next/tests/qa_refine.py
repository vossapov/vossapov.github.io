"""Refinement QA for the /next/ variant (deterministic; outputs under /tmp only).
   /tmp/portfolio-qa-venv/bin/python next/tests/qa_refine.py [base_url]
Writes screenshots + results.json to $OUT (default /tmp/portfolio-next-refine)."""
import os, sys, json, re
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765').rstrip('/')
NEXT = BASE + '/next/'
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
OUT = os.environ.get('OUT', '/tmp/portfolio-next-refine'); os.makedirs(OUT, exist_ok=True)
results, fails = [], []
def check(name, cond, extra=''):
    results.append({'name': name, 'ok': bool(cond), 'info': str(extra)[:300]})
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond or not extra else ' — ' + str(extra)[:300]))
    if not cond: fails.append(name)

CONTRAST_JS = """() => {
  const parse = c => { const m = c.match(/[\\d.]+/g).map(Number); return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}; };
  const lum = ({r,g,b}) => { const f = v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return .2126*f(r)+.7152*f(g)+.0722*f(b); };
  const over = (top, bot) => ({ r: top.r*top.a+bot.r*(1-top.a), g: top.g*top.a+bot.g*(1-top.a), b: top.b*top.a+bot.b*(1-top.a), a: 1 });
  const bad = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (seen.has(el)) continue; seen.add(el);
    if (el.closest('script,style,noscript,.sr-only,dialog:not([open])') || el.closest('[disabled]')) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') continue;
    let layers = [], op = 1;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e); op *= parseFloat(s.opacity);
      const bg = parse(s.backgroundColor); if (bg.a > 0) layers.push(bg);
      if (bg.a === 1) break;
    }
    let base = {r:14,g:15,b:18,a:1};
    for (let i = layers.length-1; i >= 0; i--) base = over(layers[i], base);
    let fg = parse(cs.color); fg = over({...fg, a: fg.a*op}, base);
    const L1 = lum(fg), L2 = lum(base), ratio = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    if (ratio < 4.5) bad.push((el.className||el.tagName)+' "'+n.textContent.trim().slice(0,24)+'" '+ratio.toFixed(2));
  }
  return bad;
}"""

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=CH)
    def new(w, h, **kw):
        c = b.new_context(viewport={'width': w, 'height': h}, **kw); pg = c.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('response', lambda r: errs.append('HTTP%d %s' % (r.status, r.url)) if r.status >= 400 else None)
        pg.on('requestfailed', lambda r: errs.append('REQFAIL ' + r.url))
        return c, pg, errs
    c0, pg, errs0 = new(1440, 900); pg.goto(NEXT); pg.wait_for_timeout(500)
    data = pg.evaluate('window.VI_DATA'); ids = [p['id'] for p in data['projects']]; names = {p['id']: p['name'] for p in data['projects']}

    # ── all local asset fetches
    urls = set(['/cv.pdf', '/project.html', '/', '/next/styles.css', '/next/app.js', '/next/data.js'])
    for p in data['projects']:
        for k in ('cover', 'thumb', 'mockup'):
            if p[k]: urls.add(p[k])
        urls.update(p['screens'])
    for c in data['companies']:
        if c['logo']: urls.add(c['logo'])
    urls.update(['/assets/mockups/mascot-scene.png'] + ['/next/assets/fonts/FixelText-%s.otf' % w for w in ('Regular', 'Medium', 'SemiBold')])
    bad = [(u, pg.context.request.get(BASE + u).status) for u in sorted(urls)]
    bad = [x for x in bad if x[1] != 200]
    check('all %d local asset URLs return 200' % len(urls), not bad, bad[:5])
    check('fonts: Fixel Text first in stack and loaded', pg.evaluate("document.fonts.check('16px \"Fixel Text\"') && getComputedStyle(document.body).fontFamily.startsWith('\"Fixel Text\"')"))
    check('fonts load only 400/500/600 faces', pg.evaluate("[...document.fonts].filter(f=>f.family.includes('Fixel')).map(f=>f.weight).sort().join()") == '400,500,600')
    for lang in ('en', 'ua'):
        pg.goto(NEXT + ('?lang=ua' if lang == 'ua' else '')); pg.wait_for_timeout(500)
        txt = pg.inner_text('body')
        check('audience copy (%s): no dev-viewer wording' % lang, not re.search(r'Dataset range|Projects in this atlas|Experience atlas|Діапазон даних|Проєктів в атласі|Атлас досвіду', txt))
        bad = pg.evaluate(CONTRAST_JS)
        check('text contrast >= 4.5:1 desktop (%s)' % lang, not bad, bad[:6])
    pg.goto(NEXT); pg.wait_for_timeout(300)
    t = pg.inner_text('#heroFacts'); check('hero facts labels', 'Design journey' in t and 'Projects' in t, t)
    check('work eyebrow', 'work & experience' in pg.inner_text('.section-head').lower())

    # ── career toggle buttons
    rows = pg.locator('.cr-btn'); check('career rows are buttons (7)', rows.count() == 7)
    hs = pg.evaluate("[...document.querySelectorAll('.cr-btn')].map(b=>b.getBoundingClientRect().height)")
    check('career rows >= 44px', min(hs) >= 43.9, hs)
    check('career buttons have title + aria-pressed', pg.evaluate("[...document.querySelectorAll('.cr-btn')].every(b=>b.title.length>10&&b.getAttribute('aria-pressed')==='false')"))
    pg.click('.cr-btn[data-co=fg]'); pg.wait_for_timeout(200)
    nfg = sum(1 for p in data['projects'] if p['co'] == 'fg')
    check('career click selects employer + syncs select/count', pg.input_value('#co') == 'fg' and pg.locator('.card-open').count() == nfg and pg.locator('.cr-btn[data-co=fg]').get_attribute('aria-pressed') == 'true' and ('%d of' % nfg) in pg.inner_text('#status') and 'co=fg' in pg.url, pg.url)
    check('career focus kept after select', pg.evaluate("document.activeElement?.dataset?.co") == 'fg')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    check('second activation (keyboard) clears', pg.input_value('#co') == 'all' and pg.locator('.card-open').count() == len(ids) and 'co=' not in pg.url)
    pg.select_option('#co', 'room8'); pg.wait_for_timeout(200)
    check('dropdown syncs career selection', pg.locator('.cr-btn[data-co=room8]').get_attribute('aria-pressed') == 'true')
    pg.click('#reset'); pg.wait_for_timeout(200)
    pg.fill('#q', 'zzzz'); pg.wait_for_timeout(300); pg.click('.empty [data-action=reset]'); pg.wait_for_timeout(200)
    check('filters clear from empty state', pg.locator('.card-open').count() == len(ids) and pg.locator('.cr-btn[aria-pressed=true]').count() == 0)
    check('desktop errors', not errs0, errs0[:4])
    c0.close()

    # ── dialog links: all projects, both languages (390)
    c1, pg, errs1 = new(390, 844)
    for lang in ('en', 'ua'):
        okc = 0; badl = []
        for pid in ids:
            pg.goto(NEXT + '?p=%s&lang=%s' % (pid, lang)); pg.wait_for_timeout(120)
            try:
                pg.wait_for_function("document.getElementById('dlg').open", timeout=3000)
                tt = pg.inner_text('#dlgTitle'); lg = pg.evaluate('document.documentElement.lang')
                g = pg.evaluate("(()=>{const d=document.getElementById('dlg').getBoundingClientRect(),c=document.getElementById('dlgClose').getBoundingClientRect(),w=document.documentElement.clientWidth;return [d.left>=0&&d.right<=w+0.5, c.left>=d.left&&c.right<=d.right&&c.top>=0&&Math.abs(c.width-44)<.6&&Math.abs(c.height-44)<.6]})()")
                if tt == names[pid][1 if lang == 'ua' else 0] and lg == ('uk' if lang == 'ua' else 'en') and all(g): okc += 1
                else: badl.append((pid, tt, lg, g))
            except Exception as e: badl.append((pid, str(e)[:60]))
        check('direct dialog link %s: all %d open, localized, geometry ok' % (lang, len(ids)), okc == len(ids), badl[:3])
    check('dialog deep-link errors', not errs1, errs1[:4]); c1.close()

    # ── per-width mobile layout (both languages)
    for w, h in ((320, 640), (360, 740), (390, 844)):
        for lang in ('en', 'ua'):
            c, pg, errs = new(w, h)
            pg.goto(NEXT + ('?lang=ua' if lang == 'ua' else '')); pg.wait_for_timeout(500)
            tag = '%d/%s' % (w, lang)
            g = pg.evaluate("""(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();
              const hdr=r('.site-header'),brand=r('.brand'),lang=r('.lang-seg'),nav=r('.header-nav'),orig=r('.original-link'),fig=r('.hero-figure'),h1=r('.hero h1'),work=r('#work'),
              wk=r('.section-head');
              return {hdrH:hdr.height, sameRow1:Math.abs((brand.top+brand.bottom)/2-(lang.top+lang.bottom)/2)<8, sameRow2:Math.abs((nav.top+nav.bottom)/2-(orig.top+orig.bottom)/2)<12, rows2below:nav.top>=Math.max(brand.bottom,lang.bottom)-2,
              figBesideTitle: fig.top < h1.bottom && fig.left > h1.left, work:work.top, ovf: document.documentElement.scrollWidth-document.documentElement.clientWidth,
              figInView: fig.right <= document.documentElement.clientWidth && fig.width>=90, heroH: r('.hero').height}})()""")
            check('header two compact rows %s (h=%d)' % (tag, g['hdrH']), g['hdrH'] <= 124 and g['sameRow1'] and g['sameRow2'] and g['rows2below'], g)
            check('hero mascot beside title %s, work starts y=%d' % (tag, g['work']), g['figBesideTitle'] and g['figInView'] and g['work'] < 760, g)
            check('no overflow %s' % tag, g['ovf'] <= 0, g['ovf'])
            small = pg.evaluate("[...document.querySelectorAll('header a, header button, .hero a')].filter(e=>e.getBoundingClientRect().height<43.5&&!e.classList.contains('skip-link')).map(e=>e.className+e.textContent.trim())")
            check('header/hero hit targets >= 44 %s' % tag, not small, small)
            if lang == 'en' and w == 390: pg.screenshot(path=OUT + '/hero-390-en.png')
            if lang == 'ua': pg.screenshot(path=OUT + '/hero-%d-ua.png' % w)
            bad = pg.evaluate(CONTRAST_JS); check('contrast %s' % tag, not bad, bad[:5])
            # dialog geometry while scrolling the dialog
            pg.goto(NEXT + '?p=undead' + ('&lang=ua' if lang == 'ua' else '')); pg.wait_for_timeout(500)
            pg.evaluate("document.getElementById('dlgBody').scrollTop=600"); pg.wait_for_timeout(150)
            g = pg.evaluate("(()=>{const d=document.getElementById('dlg').getBoundingClientRect(),c=document.getElementById('dlgClose').getBoundingClientRect(),w=document.documentElement.clientWidth;const top=document.elementFromPoint(c.left+22,c.top+22);return {dl:d.left,dr:d.right,w,cl:c.left,cr:c.right,cw:c.width,ch:c.height,ct:c.top,hit:top&&top.closest('#dlgClose')!==null,sc:document.getElementById('dlgBody').scrollTop,ovf:document.documentElement.scrollWidth-w}})()")
            check('dialog fits + close 44x44 visible while scrolling %s' % tag, g['dl'] >= 0 and g['dr'] <= g['w'] + .5 and g['cr'] <= g['dr'] and g['cl'] >= 0 and abs(g['cw'] - 44) < .6 and abs(g['ch'] - 44) < .6 and g['ct'] >= 0 and g['hit'] and g['sc'] > 100, g)
            pg.screenshot(path=OUT + '/dialog-%d-%s.png' % (w, lang))
            check('no console/HTTP errors %s' % tag, not errs, errs[:3]); c.close()

    # ── 200% zoom equivalent (1440 → 720 css px) and 400% (320)
    for w, h in ((720, 450), (1440, 900), (1024, 768), (768, 1024)):
        c, pg, errs = new(w, h)
        for u in (NEXT, NEXT + '?p=undead&lang=ua', NEXT + '?view=gallery'):
            pg.goto(u); pg.wait_for_timeout(350)
            ov = pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
            check('no overflow %dx%d %s' % (w, h, u.split('next/')[1] or '/'), ov <= 0, ov)
        pg.goto(NEXT + '?p=undead'); pg.wait_for_timeout(400)
        g = pg.evaluate("(()=>{const d=document.getElementById('dlg').getBoundingClientRect(),c=document.getElementById('dlgClose').getBoundingClientRect();return [d.left>=0,d.right<=innerWidth,d.top>=0,d.bottom<=innerHeight+.5,c.left>=d.left,c.right<=d.right,c.top>=d.top,c.width>=43.9]})()")
        check('dialog + close inside viewport %dx%d' % (w, h), all(g), g)
        if w == 1440:
            pg.screenshot(path=OUT + '/dialog-1440.png'); pg.goto(NEXT + '?co=whimsy'); pg.wait_for_timeout(500)
            pg.evaluate("document.querySelector('#career').scrollIntoView({behavior:'instant'})"); pg.screenshot(path=OUT + '/career-1440.png')
        c.close()

    # ── native modal focus cycle
    c, pg, errs = new(1440, 900)
    pg.goto(NEXT + '?p=undead'); pg.wait_for_timeout(500)
    inside = lambda: pg.evaluate("document.getElementById('dlg').contains(document.activeElement)&&document.activeElement!==document.getElementById('dlg')")
    seq = []; allin = True
    for i in range(70):
        pg.keyboard.press('Tab'); seq.append(pg.evaluate("document.activeElement.getAttribute('aria-label')||document.activeElement.textContent.trim().slice(0,12)")); allin &= inside()
    check('Tab x70 never leaves dialog', allin and len(set(seq)) > 5, seq[:12])
    check('Tab wraps (sequence repeats)', len(seq) > 20 and seq[0] in seq[1:])
    allin = True
    for i in range(70):
        pg.keyboard.press('Shift+Tab'); allin &= inside()
    check('Shift+Tab x70 never leaves dialog', allin)
    first = pg.evaluate("document.getElementById('dlgClose')===document.activeElement")
    pg.evaluate("document.getElementById('dlgClose').focus()"); pg.keyboard.press('Shift+Tab')
    last_is_link = pg.evaluate("document.activeElement.tagName==='A'&&document.activeElement.href.includes('project.html#undead')")
    check('Shift+Tab from first goes to last (case link)', last_is_link)
    pg.keyboard.press('Tab')
    check('Tab from last returns to first (close)', pg.evaluate("document.getElementById('dlgClose')===document.activeElement"))
    check('focus-cycle errors', not errs, errs[:3])

    # ── back/forward/close restore: scroll, filters, focus
    pg.goto(NEXT + '?q=a&cat=all'); pg.wait_for_timeout(500)
    pg.evaluate("window.scrollTo({top:2300,behavior:'instant'})"); pg.wait_for_timeout(500)
    btn = pg.locator('.card-open').nth(4); pid = btn.get_attribute('data-open')
    btn.evaluate("e=>{e.scrollIntoView({block:'center',behavior:'instant'});e.focus({preventScroll:true})}"); pg.wait_for_timeout(300)
    sy = pg.evaluate('scrollY'); n0 = pg.locator('.card-open').count(); url0 = pg.url
    def state_ok(tag, wait=700):
        pg.wait_for_timeout(wait)
        check('%s: dialog closed' % tag, not pg.evaluate("document.getElementById('dlg').open"))
        check('%s: exact scroll' % tag, abs(pg.evaluate('scrollY') - sy) <= 2, (sy, pg.evaluate('scrollY')))
        check('%s: filter kept' % tag, pg.input_value('#q') == 'a' and pg.locator('.card-open').count() == n0)
        check('%s: focus on opener' % tag, pg.evaluate("document.activeElement?.dataset?.open") == pid, pg.evaluate("document.activeElement?.tagName+':'+document.activeElement?.className"))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check('open pushes ?p=', 'p=' + pid in pg.url)
    pg.keyboard.press('Escape'); state_ok('Escape'); check('Escape URL restored (async)', pg.url == url0 and 'p=' not in pg.url, pg.url)
    btn = pg.locator('[data-open="%s"]' % pid); btn.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    pg.click('#dlgClose'); state_ok('close button'); check('close button URL restored', 'p=' not in pg.url, pg.url)
    pg.locator('[data-open="%s"]' % pid).focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    pg.go_back(); state_ok('Back while open')
    pg.go_forward(); pg.wait_for_timeout(500)
    check('Forward reopens dialog', pg.evaluate("document.getElementById('dlg').open") and 'p=' + pid in pg.url)
    pg.keyboard.press('Escape'); state_ok('Escape after Forward'); check('URL clean after Forward+Escape', 'p=' not in pg.url, pg.url)
    # arrows outside dialog inert
    s2 = pg.evaluate('scrollY'); pg.keyboard.press('ArrowRight'); check('ArrowRight outside dialog does not open/alter', not pg.evaluate("document.getElementById('dlg').open"))
    c.close(); b.close()

json.dump(results, open(OUT + '/results.json', 'w'), indent=1)
print('\nTOTAL %d  FAILED %d' % (len(results), len(fails)), fails)
sys.exit(1 if fails else 0)
