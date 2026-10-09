"""Fourth company track: data, geometry, filtering and responsive reachability."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('/tmp/portfolio-personal-qa'); OUT.mkdir(exist_ok=True)
IDS={'diaapp','diamirror','fluger-kids','lacetti-link'}
GEOM="""() => {
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height}};
 return {cards:[...document.querySelectorAll('.sp-canvas .sp-project')].map(e=>({...rect(e),id:e.dataset.open,co:e.dataset.co,s:e.dataset.start,end:e.dataset.end})),
 bands:[...document.querySelectorAll('.sp-band')].map(e=>({...rect(e),id:e.dataset.co})),overflow:document.documentElement.scrollWidth-innerWidth};
}"""
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
 for width in [1100,1440,1920,390]:
  for lang in ['ua','en']:
   p=b.new_page(viewport={'width':width,'height':950},reduced_motion='reduce')
   errors=[]; p.on('pageerror',lambda e: errors.append(str(e)))
   p.goto(f'http://127.0.0.1:8765/next/?lang={lang}',wait_until='networkidle')
   assert p.locator('#co option[value="personal"]').count()==1
   assert p.locator('.sp-project[data-co="personal"]').count()==4
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width>=1100:
    g=p.evaluate(GEOM); bands={x['id']:x for x in g['bands']}; personal=bands['personal']
    assert all(personal['x'] >= x['x']+x['w']-.5 for x in g['bands'] if x['id']!='personal'), 'Personal band must be far right'
    assert personal['h']<600,'Personal track starts in 2026, not 2017'
    assert len(g['cards'])==41
    assert p.locator('.sp-project[data-co="personal"] .sp-name').evaluate_all('(xs)=>xs.every(e=>e.scrollWidth<=e.clientWidth+1 && e.scrollHeight<=e.clientHeight+1)'), 'Personal project names must be readable without truncation'
    assert min(x['w'] for x in g['cards'])>=128-.5, min(x['w'] for x in g['cards'])
    for i,a in enumerate(g['cards']):
     for c in g['cards'][i+1:]:
      assert not (a['x']<c['x']+c['w']-.5 and c['x']<a['x']+a['w']-.5 and a['y']<c['y']+c['h']-.5 and c['y']<a['y']+a['h']-.5),(a['id'],c['id'])
    for a in g['cards']:
     for c in g['cards']:
      if a['end']==c['end']: assert abs(a['y']-c['y'])<.5
    before={x['id']:(x['x'],x['y']) for x in g['cards']}
    if width>=1440: assert p.locator('.sp-wrap').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),'All four tracks visible at normal desktop sizes'
    p.locator('#stream').evaluate("e=>scrollTo(0,e.getBoundingClientRect().top+scrollY-145)")
    p.screenshot(path=str(OUT/f'timeline-{width}-{lang}.png'))
   p.select_option('#co','personal')
   assert set(p.locator('.sp-project').evaluate_all('xs=>xs.map(e=>e.dataset.open)'))==IDS
   if width>=1100:
    after=p.evaluate(GEOM)
    assert all(abs(before[x['id']][0]-x['x'])<.5 and abs(before[x['id']][1]-x['y'])<.5 for x in after['cards'])
   for id in sorted(IDS):
    card=p.locator(f'.sp-project[data-open="{id}"]'); card.click()
    assert p.locator('#dlg').is_visible()
    assert p.locator(f'#dlg a[href*="id={id}"]').count()>0
    p.keyboard.press('Escape')
    p.wait_for_function("!document.querySelector('#dlg').open && !new URLSearchParams(location.search).has('p')")
   p.goto(f'http://127.0.0.1:8765/next/?lang={lang}&co=freelance')
   assert not p.locator('.sp-project[data-co="personal"]').count()
   assert not errors,errors
   results.append({'width':width,'lang':lang,'pass':True});p.close()
 b.close()
(OUT/'results.json').write_text(json.dumps(results,indent=2))
print(json.dumps({'layout_states':len(results),'four_personal_projects':'PASS','geometry_and_filters':'PASS'}))
