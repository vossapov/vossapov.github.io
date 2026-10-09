import sys, json
from playwright.sync_api import sync_playwright
CH='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
url=sys.argv[1]; out=sys.argv[2]; w=int(sys.argv[3]); h=int(sys.argv[4]); full=len(sys.argv)>5 and sys.argv[5]=='full'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CH)
    pg=b.new_page(viewport={'width':w,'height':h})
    errs=[]
    pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('requestfailed',lambda r: errs.append('REQFAIL '+r.url))
    pg.on('response',lambda r: errs.append('HTTP%d %s'%(r.status,r.url)) if r.status>=400 else None)
    pg.goto(url); pg.wait_for_timeout(800)
    pg.screenshot(path=out,full_page=full)
    print('overflow',pg.evaluate('document.documentElement.scrollWidth-innerWidth'),'errs',errs)
    b.close()
