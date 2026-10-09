"""Curated Blast Jam update: real screens, phone mockups, responsive layout and dialog entry."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('/tmp/portfolio-recent-review');out.mkdir(exist_ok=True)
checks=[]
def check(label,ok):
 checks.append({'label':label,'ok':bool(ok)});print(('PASS ' if ok else 'FAIL ')+label)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 for width in [320,390,768,1440]:
  for lang in ['ua','en']:
   pg=b.new_page(viewport={'width':width,'height':900},reduced_motion='reduce');errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
   pg.goto('http://127.0.0.1:8765/next/case.html?id=blastjam&lang='+lang,wait_until='networkidle')
   scope='#sec-shop-and-offers .dv-phone img, #sec-fortune-wheel-and-last-chance .dv-phone img'
   check(f'{width}/{lang}: exactly five curated phone screens',pg.locator(scope).count()==5)
   check(f'{width}/{lang}: no document overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   check(f'{width}/{lang}: not labelled final game art','wireframe' in pg.locator('#sec-fortune-wheel-and-last-chance').inner_text().lower() if lang=='en' else 'вайрфрейм' in pg.locator('#sec-fortune-wheel-and-last-chance').inner_text().lower())
   for sel in ['#sec-shop-and-offers','#sec-fortune-wheel-and-last-chance']:
    pg.locator(sel).scroll_into_view_if_needed();pg.wait_for_timeout(120)
   check(f'{width}/{lang}: real images decoded',pg.locator(scope).evaluate_all('(xs)=>xs.every(x=>x.complete&&x.naturalWidth>0)'))
   if width<641:
    strip=pg.locator('#sec-shop-and-offers .st');strip.evaluate('e=>e.scrollLeft=e.scrollWidth');pg.wait_for_timeout(150)
    check(f'{width}/{lang}: swipe reveals last phone',strip.evaluate('e=>e.scrollLeft>0'))
   pg.locator('#sec-fortune-wheel-and-last-chance .shot').first.click();check(f'{width}/{lang}: screen opens full-size',pg.locator('dialog[open]').count()==1);pg.keyboard.press('Escape')
   check(f'{width}/{lang}: no JS errors',not errs)
   pg.close()
 pg=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 pg.goto('http://127.0.0.1:8765/next/?lang=ua&p=blastjam',wait_until='networkidle')
 check('Existing timeline project opens recent mockup cover',pg.locator('#dlgStage img').get_attribute('src')=='/next/assets/recent/blastjam/overview.png')
 check('Recent work description in project dialog',pg.locator('.dlg-recent').count()==1 and 'Last Chance' in pg.locator('.dlg-recent').inner_text())
 pg.screenshot(path=str(out/'timeline-dialog.png'));b.close()
(out/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));bad=[x for x in checks if not x['ok']];print({'checks':len(checks),'failed':len(bad)});raise SystemExit(bool(bad))
