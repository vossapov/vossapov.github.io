"""Acceptance for the three personal-project cases and their calendar placement."""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8765'
CH='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
OUT=Path('/tmp/portfolio-three-qa'); OUT.mkdir(exist_ok=True)
ids=sys.argv[1:] or ['diaapp','diamirror','fluger-kids','lacetti-link']
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=CH)
    for id in ids:
        for lang in ['ua','en']:
            for width in [320,390,768,1440]:
                page=browser.new_page(viewport={'width':width,'height':950},reduced_motion='reduce')
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('response',lambda r:errors.append(str(r.status)+' '+r.url) if r.status>=400 else None)
                page.goto(f'{BASE}/next/case.html?id={id}&lang={lang}',wait_until='networkidle')
                assert page.locator('#cs-title').inner_text()
                assert not page.locator('#cs-orig').is_visible(), 'No nonexistent legacy link for new cases'
                assert page.locator('a[href^="/project.html#"]').count() == 0, 'No broken legacy links, including footer'
                hero_frame = '.dv-board' if id == 'lacetti-link' else '.dv-tablet' if id == 'diaapp' else '.dv-phone'
                assert page.locator('.cs-hero ' + hero_frame).count() > 0
                if id == 'lacetti-link':
                    assert page.locator('.cs-hero .dv-tablet').count() == 0, 'Do not double-frame a generated cabin mockup'
                period=page.locator('.cs-meta').inner_text()
                assert ('вер 2026' if lang=='ua' else 'Sep 2026') in period if id=='lacetti-link' else ('лип – сер 2026' if lang=='ua' else 'Jul – Aug 2026') in period, period
                assert page.locator('.cs-sec').count()>=4
                if id == 'diamirror':
                    assert page.locator('#cs-title img').count()==1, 'DiaMirror logo belongs in the case heading'
                    assert page.locator('#cs-title img').evaluate('(x)=>x.complete && x.naturalWidth>0')
                if id == 'diaapp':
                    for state in ['current','high','low']:
                        assert page.locator(f'.cs-sec img[src$="/diaapp/{state}.png"]').count()>0, f'Missing {state} state'
                    public=page.locator('body').inner_text().lower()
                    assert not any(t in public for t in ['демодан','демонстраційн','demo values','demo history'])
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(id,lang,width)
                for shot in page.locator('.cs-sec .shot').all():
                    shot.scroll_into_view_if_needed()
                page.wait_for_timeout(150)
                assert page.evaluate("[...document.images].filter(i=>i.getBoundingClientRect().width>0).every(i=>i.complete&&i.naturalWidth>0)")
                page.locator('.cs-hero .shot').first.click()
                assert page.locator('#cs-lb').is_visible()
                page.keyboard.press('Escape')
                assert not page.locator('#cs-lb').is_visible()
                assert not errors,errors
                if lang=='ua' and width in [390,1440]:
                    page.evaluate('scrollTo(0,0)')
                    page.screenshot(path=str(OUT/f'{id}-{width}.png'),full_page=True)
                results.append({'id':id,'language':lang,'width':width,'pass':True})
                page.close()
    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page.goto(BASE+'/next/?lang=ua&co=personal&cat=apps',wait_until='networkidle')
    cards=page.locator('.sp-canvas .sp-project')
    assert cards.count()==4,cards.count()
    expected={'diaapp':('2026-07','2026-09','2 міс'),'diamirror':('2026-07','2026-09','2 міс'),'fluger-kids':('2026-07','2026-09','2 міс'),'lacetti-link':('2026-09','2026-10','1 міс')}
    for id,(start,end,duration) in expected.items():
        card=page.locator(f'.sp-canvas [data-open="{id}"]')
        assert card.get_attribute('data-start')==start
        assert card.get_attribute('data-end')==end
        assert duration in card.get_attribute('aria-label'),card.get_attribute('aria-label')
        assert card.bounding_box()['height']>=44
        card.click()
        page.wait_for_timeout(100)
        link=page.locator(f'.dlg-actions a[href*="id={id}"]')
        assert link.is_visible()
        page.keyboard.press('Escape')
    page.locator('#stream').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'personal-timeline.png'))
    page.goto(BASE+'/next/?lang=ua&co=personal&cat=apps&view=gallery',wait_until='networkidle')
    assert page.locator('#cats [data-cat="apps"]').get_attribute('aria-pressed')=='true'
    assert page.locator('[data-open]').count()>=3
    browser.close()
(OUT/'results.json').write_text(json.dumps({'case_states':results,'timeline':'PASS','gallery':'PASS'},indent=2))
print(json.dumps({'case_states':len(results),'projects':len(ids),'timeline':'PASS','gallery':'PASS'}))
