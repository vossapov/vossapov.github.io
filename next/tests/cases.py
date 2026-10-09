"""Browser QA for the /next/ case-study pages (next/case.html). Usage:
   /tmp/portfolio-qa-venv/bin/python next/tests/cases.py [base_url]
Requires Playwright + a Chromium executable (CHROME env var or default path).
Screenshots and results.json go to /tmp/portfolio-case-evidence (override with OUT=)."""
import os, sys, json, subprocess, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765').rstrip('/')
CH = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
OUT = pathlib.Path(os.environ.get('OUT', '/tmp/portfolio-case-evidence')); OUT.mkdir(parents=True, exist_ok=True)
fails, passes = [], []
def check(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(extra)[:400] if extra and not cond else ''))
    (passes if cond else fails).append(name)

# ── snapshot freshness + untouched sources ──
r = subprocess.run(['node', 'next/tools/export-presentation.cjs', '--check'], cwd=ROOT, capture_output=True, text=True)
check('presentation-data.js is up to date', r.returncode == 0, r.stderr)
r = subprocess.run(['git', 'diff', '--quiet', '--', 'present.js', 'timeline.js', 'project.html', 'index.html', 'script.js'], cwd=ROOT)
check('original source files unchanged', r.returncode == 0)

def url(q): return BASE + '/next/case.html' + q

def watch(pg, errs):
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('requestfailed', lambda q: errs.append('REQFAIL ' + q.url))
    pg.on('response', lambda q: errs.append('HTTP%d %s' % (q.status, q.url)) if q.status >= 400 else None)

OVERFLOW = 'document.documentElement.scrollWidth - document.documentElement.clientWidth'
SMALL_TARGETS = """[...document.querySelectorAll('a[href], button, [tabindex="0"]')].filter(e => {
  const r = e.getBoundingClientRect(), s = getComputedStyle(e);
  if (!r.width || !r.height || s.visibility === 'hidden' || e.closest('[hidden], dialog:not([open]), .cs-skip')) return false;
  return r.height < 44 || r.width < 44;
}).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))"""

results = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); errs = []; watch(pg, errs)
    pg.goto(url('?id=blastjam&lang=en')); pg.wait_for_selector('#cs-title')
    D = pg.evaluate('window.VI_DATA'); C = pg.evaluate('window.VI_CASES')
    ids = [x['id'] for x in D['projects']]
    check('41 projects and 41 cases', len(ids) == 41 and sorted(C['cases']) == sorted(ids), len(ids))
    kinds_seen = {}
    for c in C['cases'].values():
        for k in c['kinds'].values(): kinds_seen[k] = kinds_seen.get(k, 0) + 1
    check('every frame kind used', all(k in kinds_seen for k in ('phone', 'land', 'display', 'browser', 'board', 'long', 'tablet')), kinds_seen)

    # ── every case in EN and UA ──
    all_imgs = set()
    for lang, li in (('en', 0), ('ua', 1)):
        for pid in ids:
            P = next(x for x in D['projects'] if x['id'] == pid); cs = C['cases'][pid]
            errs.clear()
            pg.goto(url('?id=%s&lang=%s' % (pid, lang))); pg.wait_for_selector('#cs-title')
            info = pg.evaluate("""() => ({
              h1: document.querySelector('h1').textContent, lang: document.documentElement.lang,
              back: document.getElementById('cs-back').getAttribute('href'),
              orig: document.getElementById('cs-orig')?.getAttribute('href') || null,
              tog: document.getElementById('cs-lang').getAttribute('href'),
              next: [...document.querySelectorAll('.cs-next')].map(a => a.getAttribute('href')),
              secs: document.querySelectorAll('main section').length,
              h2: document.querySelectorAll('main h2').length,
              text: document.querySelector('main').innerText.length,
              srcs: [...document.querySelectorAll('main img')].map(i => i.getAttribute('src')),
              shots: [...document.querySelectorAll('main [data-i]')].map(e => +e.dataset.i),
              boardsInDevice: [...document.querySelectorAll('.dv-phone img, .dv-land img, .dv-display img, .dv-browser img')].map(i => i.getAttribute('src')),
              noAlt: [...document.querySelectorAll('main img')].filter(i => i.getAttribute('alt') === null).length,
              eager: [...document.querySelectorAll('main img:not([loading=lazy])')].filter(i => !i.closest('.cs-hero')).length,
              ov: """ + OVERFLOW + """ })""")
            tag = '%s/%s' % (pid, lang)
            ok = (info['h1'] == P['name'][li] and info['lang'] == ('uk' if lang == 'ua' else 'en')
                  and info['back'].startswith('/next/?') and ('p=%s' % pid) in info['back'] and ('lang=' + lang) in info['back']
                  and info['orig'] == (None if P.get('original') is False else '/project.html#' + pid)
                  and info['tog'].startswith('case.html?id=%s&lang=%s' % (pid, 'ua' if lang == 'en' else 'en'))
                  and len(info['next']) == 2 and all(h.split('id=')[1].split('&')[0] in ids for h in info['next'])
                  and info['secs'] >= 3 and info['h2'] >= 2 and info['text'] > 600 and info['ov'] <= 0
                  and info['noAlt'] == 0 and info['eager'] == 0)
            missing = set(cs['images']) - set(info['srcs'])
            framed_wrong = [s for s in info['boardsInDevice'] if cs['kinds'].get(s) == 'board' or '/mockups/' in s]
            shots_ok = all(0 <= i < len(cs['images']) for i in info['shots'])
            check('case %s renders (h1, links, content)' % tag, ok, {k: v for k, v in info.items() if k not in ('srcs', 'shots', 'boardsInDevice')})
            check('case %s: all images discoverable, no double framing' % tag, not missing and not framed_wrong and shots_ok, (missing, framed_wrong))
            check('case %s: no console/network errors' % tag, not errs, errs)
            all_imgs.update(info['srcs'])
            results[tag] = {'h1': info['h1'], 'sections': info['secs'], 'images': len(cs['images'])}

    bad = []
    for s in sorted(all_imgs):
        r = pg.request.get(BASE + s)
        if r.status != 200: bad.append((s, r.status))
    check('all %d case images return HTTP 200' % len(all_imgs), not bad, bad)

    # ── routing edge cases: never the wrong case ──
    for q, want in (('?id=nope&lang=en', 'Case not found'), ('?id=BLASTJAM&lang=en', 'Case not found'),
                    ('?id=__proto__&lang=en', 'Case not found'), ('?id=blastjam%20', 'Case not found'),
                    ('', 'Case not found'), ('?lang=ua&id=zz', 'Кейс не знайдено'),
                    ('#blastjam', 'Tatem Blast: Color Pop'), ('?id=undead&lang=xx', 'Undead')):
        errs.clear(); pg.goto(url(q)); pg.wait_for_selector('main h1')
        h1 = pg.inner_text('main h1')
        back = pg.evaluate("[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href'))")
        check('route %r → %s' % (q, want), h1 == want and not errs and (want not in ('Case not found', 'Кейс не знайдено') or any(h.startswith('/next/') for h in back)), (h1, errs))

    # ── back link keeps safe same-origin timeline state only ──
    pg.goto(BASE + '/next/?cat=games&q=tatem&lang=en'); pg.wait_for_timeout(300)
    pg.evaluate("location.href = '/next/case.html?id=blastjam&lang=en'"); pg.wait_for_selector('#cs-title')
    back = pg.get_attribute('#cs-back', 'href')
    check('back link restores timeline filters + project', back.startswith('/next/?') and 'cat=games' in back and 'q=tatem' in back and 'p=blastjam' in back, back)
    pg.goto(url('?id=blastjam&lang=ua#sec-gameplay-screen')); pg.wait_for_selector('#cs-title'); pg.wait_for_timeout(300)
    check('language toggle keeps id + anchor', pg.get_attribute('#cs-lang', 'href') == 'case.html?id=blastjam&lang=en#sec-gameplay-screen')
    check('section anchor scrolls into view', abs(pg.evaluate("document.getElementById('sec-gameplay-screen').getBoundingClientRect().top")) < 200)

    # ── viewer: open, arrows, zoom, focus trap, Escape, focus return ──
    pg.goto(url('?id=undead&lang=en')); pg.wait_for_selector('#cs-title')
    opener = pg.locator('.cs-sec .shot').first
    opener.scroll_into_view_if_needed(); opener.focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    st = pg.evaluate("({open: document.getElementById('cs-lb').open, modal: document.getElementById('cs-lb').matches(':modal'), focusIn: document.getElementById('cs-lb').contains(document.activeElement), count: document.getElementById('cs-lb-count').textContent, src: document.getElementById('cs-lb-img').getAttribute('src')})")
    check('viewer opens as modal with focus inside', st['open'] and st['modal'] and st['focusIn'], st)
    check('viewer shows the original file unframed', st['src'] in C['cases']['undead']['images'] and pg.locator('#cs-lb .dv').count() == 0)
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    check('ArrowRight advances', pg.inner_text('#cs-lb-count') != st['count'])
    inside = []
    for _ in range(8): pg.keyboard.press('Tab'); inside.append(pg.evaluate("document.getElementById('cs-lb').contains(document.activeElement)"))
    for _ in range(8): pg.keyboard.press('Shift+Tab'); inside.append(pg.evaluate("document.getElementById('cs-lb').contains(document.activeElement)"))
    check('Tab / Shift+Tab stay inside the viewer', all(inside))
    pg.click('#cs-lb-zoom'); pg.wait_for_timeout(100)
    check('zoom toggles actual size', pg.get_attribute('#cs-lb-zoom', 'aria-pressed') == 'true' and pg.evaluate("document.getElementById('cs-lb-img').getBoundingClientRect().width") >= 1599)
    check('open-original link targets the file', pg.get_attribute('#cs-lb-open', 'href') == pg.get_attribute('#cs-lb-img', 'src'))
    pg.screenshot(path=str(OUT / 'viewer-undead-1440.png'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('Escape closes and returns focus to the opener', not pg.evaluate("document.getElementById('cs-lb').open") and pg.evaluate("document.activeElement.classList.contains('shot')"))
    pg.click('#cs-art-toggle'); pg.wait_for_timeout(100)
    check('all-artwork toggle expands', pg.get_attribute('#cs-art-toggle', 'aria-expanded') == 'true' and pg.is_visible('#cs-art-grid'))
    ctx.close()

    # ── responsive: overflow, targets, screenshots ──
    reps = ['blastjam', 'undead', 'winday', 'soundmag', 'montage', 'tadafish', 'nftisls', 'room8p', 'hyperian', 'onlyriffs']
    for w in (320, 390, 768, 1440):
        ctx = b.new_context(viewport={'width': w, 'height': 900 if w > 800 else 844}, reduced_motion='reduce' if w == 390 else 'no-preference')
        pg = ctx.new_page(); errs = []; watch(pg, errs)
        for pid in reps:
            for lang in (('en', 'ua') if w in (390, 1440) else ('en',)):
                pg.goto(url('?id=%s&lang=%s' % (pid, lang))); pg.wait_for_selector('#cs-title')
                h = pg.evaluate('document.body.scrollHeight')
                for y in range(0, h, 700): pg.evaluate('scrollTo(0,%d)' % y); pg.wait_for_timeout(40)
                pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(250)
                ov = pg.evaluate(OVERFLOW); small = pg.evaluate(SMALL_TARGETS)
                check('%s/%s @%d: no horizontal overflow' % (pid, lang, w), ov <= 0, ov)
                check('%s/%s @%d: targets ≥ 44px' % (pid, lang, w), not small, small)
                if lang == 'en' and pid in reps[:6] and w in (390, 1440):
                    pg.screenshot(path=str(OUT / ('case-%s-%d.png' % (pid, w))))
                    pg.screenshot(path=str(OUT / ('case-%s-%d-full.png' % (pid, w))), full_page=True)
        if w == 390:
            check('reduced motion disables smooth scroll', pg.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == 'auto')
        check('no console errors @%d' % w, not errs, errs)
        ctx.close()

    # ── storage blocked ──
    ctx = b.new_context(viewport={'width': 1024, 'height': 800}); pg = ctx.new_page(); errs = []; watch(pg, errs)
    pg.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
    pg.goto(url('?id=sweep')); pg.wait_for_selector('#cs-title')
    check('works with storage blocked (defaults to EN)', pg.inner_text('#cs-title') == 'Sweepstake' and not [e for e in errs if 'PAGEERR' in e], errs)
    ctx.close()
    b.close()

(OUT / 'results.json').write_text(json.dumps({'passed': len(passes), 'failed': fails, 'cases': results}, ensure_ascii=False, indent=1))
print('\n%d passed, %d failed' % (len(passes), len(fails)))
sys.exit(1 if fails else 0)
