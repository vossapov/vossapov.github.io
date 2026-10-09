"""Axe accessibility checks for the newly added application cases."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
axe=os.environ.get('AXE_JS','/tmp/portfolio-a11y/node_modules/axe-core/axe.min.js')
assert Path(axe).is_file(), 'Set AXE_JS to a local axe-core bundle'
report=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
    for id in ['diaapp','diamirror','fluger-kids','lacetti-link']:
        for width in [390,1440]:
            page=browser.new_page(viewport={'width':width,'height':950},reduced_motion='reduce')
            page.goto('http://127.0.0.1:8765/next/case.html?id='+id+'&lang=ua',wait_until='networkidle')
            page.add_script_tag(path=axe)
            data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
            report.append({'id':id,'width':width,'violations':data['violations']})
            page.close()
    browser.close()
Path('/tmp/portfolio-three-qa/axe.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'states':len(report),'violations':sum(len(x['violations']) for x in report)}))
assert not any(x['violations'] for x in report)
