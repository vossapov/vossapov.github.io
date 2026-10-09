"""Scoped QA for the restored spatial timeline in /next/ (timeline worker).
Usage: /tmp/portfolio-qa-venv/bin/python next/tests/spatial.py [base]"""
import sys, json, hashlib, os, re
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765').rstrip('/')
URL = BASE + '/next/'
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
OUT = os.environ.get('OUT', '/tmp/portfolio-spatial-evidence')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.makedirs(OUT, exist_ok=True)
res = []
def check(name, ok, info=''):
    res.append((name, bool(ok), info)); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else '  -> ' + str(info)[:400]))

# original files unchanged (hashes taken before work started)
man = '/tmp/portfolio-spatial-backup/root.sha256'
if os.path.exists(man):
    bad = []
    for line in open(man):
        h, f = line.split()
        if hashlib.sha256(open(os.path.join(ROOT, f), 'rb').read()).hexdigest() != h: bad.append(f)
    check('original root files unchanged', not bad, bad)

GEOM = """() => {
  const r = e => e.getBoundingClientRect();
  const cards = [...document.querySelectorAll('.sp-canvas .sp-project')].map(b => { const q = r(b); return {id: b.dataset.open, side: b.dataset.side, co: b.dataset.co,
     s: b.dataset.start, e: b.dataset.end, x: q.left, y: q.top + scrollY, w: q.width, h: q.height,
     nameOver: (() => { const n = b.querySelector('.sp-name'); const nr = r(n); return nr.bottom > q.bottom + 0.5 || nr.top < q.top - 0.5; })(),
     contentOver: [...b.children].filter(c => !c.matches('.sp-art,.sp-rail')).some(c => r(c).bottom > q.bottom + 0.5) }; });
  const ax = document.querySelector('.sp-axis'), cv = document.querySelector('.sp-canvas');
  return {cards, axisX: ax ? r(ax).left : null, canvas: cv ? {x: r(cv).left, w: r(cv).width, h: r(cv).height} : null,
    bands: [...document.querySelectorAll('.sp-band')].map(b => ({co: b.dataset.co, x: r(b).left, w: r(b).width, side: b.classList.contains('sp-band--left') ? 'left' : 'right'})),
    ghosts: document.querySelectorAll('.sp-ghost').length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
}"""

def intersections(cards):
    hits = []
    for i, a in enumerate(cards):
        for b in cards[i + 1:]:
            if a['x'] < b['x'] + b['w'] - .5 and b['x'] < a['x'] + a['w'] - .5 and a['y'] < b['y'] + b['h'] - .5 and b['y'] < a['y'] + a['h'] - .5:
                hits.append((a['id'], b['id']))
    return hits

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=CH)
    data = None
    # ───────── desktop 1440
    pg = br.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('response', lambda r: errs.append('HTTP%d %s' % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(400)
    data = pg.evaluate('window.VI_DATA')
    side = {c['id']: c['side'] for c in data['companies']}
    iso = lambda d: '%d-%02d' % (d[0], d[1])
    g = pg.evaluate(GEOM)
    cards = g['cards']
    total = len(data['projects'])
    check('all spatial project buttons by default', len(cards) == total == 41, len(cards))
    check('every project present once', sorted(c['id'] for c in cards) == sorted(p['id'] for p in data['projects']))
    pm = {p['id']: p for p in data['projects']}
    check('start/end match data', all(c['s'] == iso(pm[c['id']]['s']) and c['e'] == iso([pm[c['id']]['e'][0], pm[c['id']]['e'][1] + (1 if pm[c['id']].get('endInclusive') else 0)]) for c in cards))
    check('source employer side preserved', all(c['side'] == side[pm[c['id']]['co']] for c in cards))
    check('cards on their side of the axis', all((c['x'] >= g['axisX']) if c['side'] == 'right' else (c['x'] + c['w'] <= g['axisX']) for c in cards))
    check('canvas uses full width (>=1300px at 1440)', g['canvas']['w'] >= 1300, g['canvas'])
    check('axis separates the two sides with equal card widths', max(c['w'] for c in cards) - min(c['w'] for c in cards) < 1, (g['axisX'], g['canvas']))
    check('8 tinted bands on both sides', len(g['bands']) == 8 and {b['side'] for b in g['bands']} == {'left', 'right'})
    hits = intersections(cards)
    check('no card intersections', not hits, hits)
    check('names never clipped vertically', not [c['id'] for c in cards if c['nameOver']], [c['id'] for c in cards if c['nameOver']])
    check('card content fits card height', not [c['id'] for c in cards if c['contentOver']], [c['id'] for c in cards if c['contentOver']])
    check('min card width readable (>=128px, narrow-slot typography)', min(c['w'] for c in cards) >= 128, min(c['w'] for c in cards))
    # shared axis: same end month -> same top on both sides; same start month -> same bottom
    tops = {}
    for c in cards: tops.setdefault(c['e'], set()).add(round(c['y'], 1))
    check('same end month = same top across sides', all(len(v) == 1 for v in tops.values()), {k: v for k, v in tops.items() if len(v) > 1})
    # height proportional to duration (64px/month at standard) except where a header break is crossed (+60 per break)
    mo = lambda s: int(s[:4]) * 12 + int(s[5:])
    bad = [c['id'] for c in cards if (round(c['h'] + 8) - (mo(c['e']) - mo(c['s'])) * 64) % 60 != 0 or round(c['h'] + 8) < (mo(c['e']) - mo(c['s'])) * 64]
    check('card height = months x scale (+ shared header breaks only)', not bad, bad)
    check('no horizontal overflow 1440', g['overflow'] <= 0, g['overflow'])
    yrs = pg.evaluate("[...document.querySelectorAll('.sp-year')].map(e=>e.id)")
    check('year anchors y2026..y2017', yrs == ['y%d' % y for y in range(2026, 2016, -1)], yrs)
    pg.screenshot(path=OUT + '/revised-1440-top.png')
    pg.evaluate("window.scrollTo(0, document.querySelector('#stream').getBoundingClientRect().top + scrollY - 140)"); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT + '/revised-1440-timeline-top.png')
    # hover preview
    pg.hover('[data-open="undead"]'); pg.wait_for_timeout(400)
    check('hover preview shows', pg.evaluate("!!document.querySelector('.sp-peek.on') && document.querySelector('.sp-peek').textContent.includes('Undead')"))
    pg.screenshot(path=OUT + '/revised-1440-hover.png')
    pg.mouse.move(5, 500); pg.wait_for_timeout(200)
    # year jump
    pg.click('#yearChips [data-year="2023"]'); pg.wait_for_timeout(1200)
    top = pg.evaluate("document.getElementById('y2023').getBoundingClientRect().top")
    stick = pg.evaluate("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick'))")
    chips_bottom = pg.evaluate("document.getElementById('yearChips').getBoundingClientRect().bottom")
    check('year jump lands 2023 below sticky chips', chips_bottom - 2 <= top <= stick + 20, (top, stick, chips_bottom))
    check('year jump updates URL + aria-current', 'y=2023' in pg.url and pg.evaluate("document.querySelector('#yearChips [aria-current]')?.dataset.year") == '2023', pg.url)
    pg.screenshot(path=OUT + '/revised-1440-2023.png')
    # dialog via click
    sy = pg.evaluate('scrollY')
    pg.click('[data-open="funrun"]'); pg.wait_for_timeout(400)
    check('dialog opens + URL p=', pg.evaluate("document.getElementById('dlg').open") and 'p=funrun' in pg.url, pg.url)
    href = pg.evaluate("document.querySelector('#dlg .btn-primary')?.getAttribute('href')")
    check('Full case link -> /next/case.html?id=&lang=', href == '/next/case.html?id=funrun&lang=en', href)
    check('Full case label', pg.evaluate("document.querySelector('#dlg .btn-primary').textContent") == 'Full case →')
    pg.screenshot(path=OUT + '/revised-1440-dialog.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    check('Escape closes, focus back on card, scroll kept', not pg.evaluate("document.getElementById('dlg').open") and pg.evaluate("document.activeElement.dataset.open") == 'funrun' and abs(pg.evaluate('scrollY') - sy) < 2 and 'p=' not in pg.url, (pg.url, pg.evaluate('scrollY'), sy))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    check('Enter on focused card reopens dialog', pg.evaluate("document.getElementById('dlg').open") and 'p=funrun' in pg.url)
    pg.go_back(); pg.wait_for_timeout(400)
    check('Back closes dialog', not pg.evaluate("document.getElementById('dlg').open") and 'p=' not in pg.url, pg.url)
    # filters keep positions
    before = {c['id']: (c['x'], c['y']) for c in pg.evaluate(GEOM)['cards']}
    pg.fill('#q', 'tatem'); pg.wait_for_timeout(500)
    g2 = pg.evaluate(GEOM)
    check('search tatem -> 2 buttons, others ghosted', len(g2['cards']) == 2 and g2['ghosts'] == total - 2, (len(g2['cards']), g2['ghosts']))
    check('filtered cards keep positions', all(abs(before[c['id']][0] - c['x']) < .5 and abs(before[c['id']][1] - c['y']) < .5 for c in g2['cards']))
    check('status count matches visible', ('2 of %d' % total) in pg.inner_text('#status'), pg.inner_text('#status'))
    check('year chips only list matching years', pg.evaluate("[...document.querySelectorAll('#yearChips [data-year]')].map(b=>b.dataset.year)") == ['2026'])
    pg.evaluate("window.scrollTo(0, document.querySelector('#stream').getBoundingClientRect().top + scrollY - 140)"); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT + '/revised-1440-filter-tatem.png')
    pg.click('#reset'); pg.wait_for_timeout(300)
    pg.click('[data-cat="games"]'); pg.wait_for_timeout(300)
    ng = sum(1 for p in data['projects'] if p['category'] == 'games')
    check('category games count', pg.locator('.sp-canvas .sp-project').count() == ng and ('%d of %d' % (ng, total)) in pg.inner_text('#status'), pg.inner_text('#status'))
    pg.select_option('#co', 'fg'); pg.wait_for_timeout(300)
    nfg = sum(1 for p in data['projects'] if p['category'] == 'games' and p['co'] == 'fg')
    check('category x employer', pg.locator('.sp-canvas .sp-project').count() == nfg and 'co=fg' in pg.url and 'cat=games' in pg.url)
    pg.go_back(); pg.wait_for_timeout(300)
    check('back restores previous filter', pg.locator('.sp-canvas .sp-project').count() == ng and 'co=' not in pg.url, pg.url)
    pg.click('#reset'); pg.wait_for_timeout(300)
    check('reset restores all projects', pg.locator('.sp-canvas .sp-project').count() == total and pg.locator('#reset').is_disabled())
    pg.fill('#q', 'zzzzqq'); pg.wait_for_timeout(400)
    check('empty state', pg.locator('.empty').count() == 1 and pg.locator('.sp-project').count() == 0)
    pg.click('.empty [data-action="reset"]'); pg.wait_for_timeout(300)
    # scale control
    h0 = pg.evaluate("document.querySelector('.sp-canvas').offsetHeight")
    pg.click('[data-scale="expanded"]'); pg.wait_for_timeout(400)
    h1 = pg.evaluate("document.querySelector('.sp-canvas').offsetHeight")
    check('expanded scale taller + URL', h1 > h0 and 'scale=expanded' in pg.url, (h0, h1, pg.url))
    pg.reload(wait_until='networkidle'); pg.wait_for_timeout(300)
    check('scale persists via URL', pg.evaluate("document.querySelector('.sp-canvas').dataset.scale") == 'expanded')
    gx = pg.evaluate(GEOM)
    check('expanded: no intersections, no clipping', not intersections(gx['cards']) and not [c for c in gx['cards'] if c['nameOver'] or c['contentOver']])
    pg.click('[data-scale="compact"]'); pg.wait_for_timeout(400)
    gc = pg.evaluate(GEOM)
    check('compact: no intersections, names fit', not intersections(gc['cards']) and not [c['id'] for c in gc['cards'] if c['nameOver']], [c['id'] for c in gc['cards'] if c['nameOver']])
    pg.evaluate("document.querySelector('#stream').scrollIntoView({behavior:'instant'})"); pg.wait_for_timeout(200)
    pg.screenshot(path=OUT + '/revised-1440-compact.png')
    pg.click('[data-scale="standard"]'); pg.wait_for_timeout(300)
    # UA
    pg.click('[data-set-lang="ua"]'); pg.wait_for_timeout(300)
    check('UA renders spatial + labels', pg.locator('.sp-canvas .sp-project').count() == total and 'Зараз' in pg.text_content('.sp-now'))
    pg.click('[data-open="undead"]'); pg.wait_for_timeout(300)
    check('UA case link', pg.evaluate("document.querySelector('#dlg .btn-primary').getAttribute('href')") == '/next/case.html?id=undead&lang=ua' and 'Повний кейс' in pg.inner_text('#dlg .btn-primary'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # deep link
    pg.goto(URL + '?p=jelly&y=2025&lang=en', wait_until='networkidle'); pg.wait_for_timeout(500)
    check('deep link opens dialog', pg.evaluate("document.getElementById('dlg').open") and 'Jelly' in pg.inner_text('#dlgTitle'))
    check('career overview collapsed by default', pg.evaluate("!document.getElementById('careerBox').open"))
    check('no console errors (desktop)', not errs, errs)
    # gallery still works
    pg.goto(URL + '?view=gallery', wait_until='networkidle')
    check('gallery alternative view', pg.locator('.tile .card-open').count() == total and pg.locator('.sp-canvas').count() == 0)
    pg.close()

    # ───────── original for comparison (same viewport)
    po = br.new_page(viewport={'width': 1440, 'height': 1000})
    po.goto(BASE + '/', wait_until='networkidle'); po.wait_for_timeout(500)
    po.evaluate("window.scrollTo(0, document.querySelector('.tl-root').getBoundingClientRect().top + scrollY - 60)"); po.wait_for_timeout(500)
    po.screenshot(path=OUT + '/original-1440-top.png'); po.close()

    # ───────── mobile 390 / tablet 1024
    for w, h in ((390, 844), (1024, 800), (320, 700)):
        m = br.new_page(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=w < 500)
        merr = []
        m.on('pageerror', lambda e: merr.append(str(e)))
        m.goto(URL, wait_until='networkidle'); m.wait_for_timeout(300)
        n = m.locator('.sk .sp-project').count()
        ov = m.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        small = m.evaluate("[...document.querySelectorAll('.sk .sp-project, #yearChips button, #scaleSeg button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height<43.5}).length")
        check('%d: employer stacks with all buttons' % w, n == total and m.locator('.sp-canvas').count() == 0, n)
        check('%d: no horizontal overflow' % w, ov <= 0, ov)
        check('%d: 44px targets' % w, small == 0, small)
        m.evaluate("document.querySelector('#stream').scrollIntoView({behavior:'instant'})"); m.wait_for_timeout(200)
        m.screenshot(path=OUT + '/revised-%d.png' % w)
        m.click('#yearChips [data-jump="g-fg"]'); m.wait_for_timeout(900)
        t = m.evaluate("document.getElementById('g-fg').getBoundingClientRect().top")
        check('%d: employer jump' % w, -2 < t < 200, t)
        m.click('[data-open="winday"]'); m.wait_for_timeout(300)
        check('%d: dialog opens' % w, m.evaluate("document.getElementById('dlg').open"))
        m.keyboard.press('Escape')
        check('%d: no page errors' % w, not merr, merr)
        m.close()
    br.close()

fails = [r for r in res if not r[1]]
print('\n%d checks, %d failed' % (len(res), len(fails)))
json.dump([{'name': n, 'ok': o, 'info': str(i)} for n, o, i in res], open(OUT + '/results.json', 'w'), indent=1)
sys.exit(1 if fails else 0)
