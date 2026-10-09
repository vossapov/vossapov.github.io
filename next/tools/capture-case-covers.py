"""Render reusable case covers from the existing CSS mockups, never redraw screens."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parents[1]/'assets/projects'
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
    for id in (sys.argv[1:] or ['diamirror','fluger-kids','lacetti-link']):
        page=browser.new_page(viewport={'width':1440,'height':1100},reduced_motion='reduce')
        page.goto('http://127.0.0.1:8765/next/case.html?id='+id+'&lang=ua',wait_until='networkidle')
        art=page.locator('.cs-hero-art')
        assert art.locator('img').evaluate_all('(xs)=>xs.length>0 && xs.every(x=>x.complete&&x.naturalWidth>0)')
        art.screenshot(path=str(OUT/id/'overview.png'))
        print(json.dumps({'id':id,'cover':str(OUT/id/'overview.png')}))
        page.close()
    browser.close()
