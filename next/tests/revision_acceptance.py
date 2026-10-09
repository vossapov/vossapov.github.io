"""Parent acceptance for the user's spatial-timeline correction and expanded brief."""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8765').rstrip('/')
CHROME = os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
OUT = Path(os.environ.get('OUT', '/tmp/portfolio-revision-acceptance'))
OUT.mkdir(parents=True, exist_ok=True)
results = []

def check(name, ok, detail=None):
    results.append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/next/?lang=ua')
    page.wait_for_timeout(500)
    data = page.evaluate('window.VI_DATA')
    cards = page.locator('.sp-project')
    check('All source projects have spatial timeline slots', cards.count() == len(data['projects']), cards.count())
    geometry = cards.evaluate_all("es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})")
    check('Projects occupy both sides, not a single chronological feed', bool(geometry) and any(r['x'] < 700 for r in geometry) and any(r['x'] > 730 for r in geometry))
    check('Timeline slot lengths encode duration', bool(geometry) and max(r['h'] for r in geometry) > min(r['h'] for r in geometry) * 2)
    check('Character/dog module integrated', page.locator('script[src*="experience.js"]').count() == 1)
    check('AI draft section exists', page.locator('#ai-work').count() == 1)
    if page.locator('#ai-work').count():
        text = page.inner_text('#ai-work').lower()
        check('AI copy explicitly marked as draft', 'чернетк' in text or 'draft' in text)
    check('No homepage JS exceptions', not errors, errors)
    response = page.goto(BASE + '/next/case.html?id=blastjam&lang=ua')
    check('Parallel full case is served', response.status == 200, response.status)
    if response.status == 200:
        page.wait_for_timeout(300)
        check('Parallel case uses exact source title', page.locator('h1').count() == 1 and page.inner_text('h1') == next(p['name'][1] for p in data['projects'] if p['id'] == 'blastjam'))
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
failed = [x['name'] for x in results if not x['ok']]
print(json.dumps({'checks': len(results), 'failures': failed}, ensure_ascii=False))
sys.exit(bool(failed))
