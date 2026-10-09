"""Capture portfolio-only demos. No production requests or device connections.
Uses the existing DiaMirror HTML and original Fluger web radar prototype/artwork.
Fluger captures are presentation reconstructions, NOT Android runtime screenshots.
Run: /tmp/portfolio-qa-venv/bin/python next/tools/capture-personal-projects.py SOURCE_DIAAPP
"""
import sys, json, math, hashlib, mimetypes
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

SOURCE = Path(sys.argv[1]).resolve()
OUT = Path(__file__).resolve().parents[1] / 'assets/projects'
CHROME = '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
ORIGIN = 'https://portfolio-capture.test'
NOW = 1785760200000  # Fixed demo time; never an actual reading.
mode = 'current'
blocked = []
proof = {'diamirror': [], 'fluger-kids': []}

def route(request):
    global mode
    u = urlparse(request.request.url)
    if u.netloc != 'portfolio-capture.test':
        blocked.append(u.netloc)
        request.abort()
        return
    if u.path == '/portfolio-logo.png':
        request.fulfill(body=(OUT/'diamirror/logo-mark.png').read_bytes(), content_type='image/png')
        return
    if u.path == '/api/data':
        age = 45 * 60000 if mode == 'stale' else 30000
        readings = [{'t': NOW - age - (288-i)*5*60000,
                     'v': round(6.8 + .8*math.sin(i/16) + .3*math.cos(i/7), 2)} for i in range(289)]
        requested_hours = int(parse_qs(u.query).get('hours', ['6'])[0])
        readings = [row for row in readings if row['t'] >= NOW - requested_hours * 3600000]
        request.fulfill(json={'now': NOW, 'latest': readings[-1], 'readings': readings, 'low': 4.0,
                              'high': 10.0, 'staleMinutes': 15})
        return
    if u.path.startswith('/api/'):
        request.fulfill(status=404, json={'error': 'Disabled for offline portfolio capture'})
        return
    # Explicit static allowlist, never a generic server for the source tree.
    if u.path in ('/', '/index.html'):
        f = SOURCE / 'web/worker/static/index.html'
    elif u.path == '/radar.html':
        f = SOURCE / 'ui-concept/radar-demo.html'
    elif u.path.startswith('/fonts/') and Path(u.path).suffix in ('.woff2', '.ttf'):
        f = SOURCE / 'web/worker/static' / u.path.lstrip('/')
    elif u.path in ['/radar_scene_' + s + '.png' for s in ('green','amber','red')]:
        f = SOURCE / 'app/src/main/res/drawable-nodpi' / u.path.lstrip('/')
    elif u.path == '/nunito.ttf':
        f = SOURCE / 'app/src/main/assets/fonts/nunito.ttf'
    else:
        request.fulfill(status=404, body='Capture allowlist only')
        return
    if not f.is_file():
        request.fulfill(status=404, body='Asset unavailable')
        return
    assert SOURCE in f.resolve().parents
    request.fulfill(body=f.read_bytes(), content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream')

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME)
    ctx = browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,
                              timezone_id='Europe/Kyiv',service_workers='block')
    ctx.route('**/*', route)
    page = ctx.new_page()
    page.clock.install(time=datetime.fromtimestamp(NOW / 1000, tz=timezone.utc))
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(ORIGIN, wait_until='networkidle')
    page.evaluate('document.fonts.ready')
    page.wait_for_function("document.querySelector('#val').textContent !== '--'")
    page.add_style_tag(path=str(OUT.parent.parent/'content/diamirror-capture.css'))
    page.evaluate("""() => {
        const logo=document.createElement('img');
        logo.src='/portfolio-logo.png';logo.alt='';logo.setAttribute('aria-hidden','true');
        document.querySelector('.brand').prepend(logo);
    }""")
    page.wait_for_function("document.querySelector('.brand img').complete && document.querySelector('.brand img').naturalWidth>0")
    for name, state, hours in [('phone-current','current',6),('phone-history','current',24),('phone-stale','stale',6)]:
        mode=state
        page.locator('[data-h="%d"]' % hours).click()
        page.wait_for_timeout(150)
        page.evaluate("document.querySelector('#sn').textContent = 'ДЕМО · не реальні дані'")
        assert page.locator('#sn').inner_text() == 'ДЕМО · не реальні дані'
        assert page.evaluate('Number.isFinite(data.now)'), 'Chart API fixture needs a finite now'
        if state == 'stale':
            assert 'застаріли' in page.locator('#ago').inner_text()
        else:
            assert 'stale' not in page.locator('#val').get_attribute('class'), 'Demo current reading must be fresh'
            assert abs(page.evaluate('Date.now()') - NOW) < 60000, 'Fixture/browser clock units differ'
        p=OUT/'diamirror'/(name+'.png'); p.parent.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(p))
        proof['diamirror'].append({'file':p.name,'source':'DiaApp/web/worker/static/index.html',
            'kind':'phone','fixture':state,'hours':hours,
            'adaptation':'Portfolio-only layout: generated logo, 54px top / 34px bottom safe area, 24px gutters. Setup form and technical footer omitted from focused dashboard view.',
            'privacy':'Synthetic values only; sensor ID replaced in capture DOM.',
            'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    assert not errors, errors
    page.close()
    if '--only-diamirror' not in sys.argv[2:]:
        # Reuse the real radar-demo canvas drawing code and original scene assets.
        # Position mirrors KidDisplayActivity.positionRadarInScene; all states are synthetic.
        page=ctx.new_page()
        page.set_viewport_size({'width':468,'height':840})
        page.goto(ORIGIN+'/radar.html',wait_until='networkidle')
        page.evaluate("""() => {
            const canvas=document.getElementById('radar');
            document.querySelector('.wrap').style.display='none';
            const panel=document.createElement('div');panel.id='capture-panel';
            panel.style.cssText='width:468px;height:840px;position:relative;overflow:hidden;background:#18231c';
            const scene=document.createElement('img');scene.id='capture-scene';
            scene.style.cssText='width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
            panel.append(scene,canvas);
            canvas.style.cssText='position:absolute;width:372.5px;height:372.5px;max-width:none;left:45.4px;top:236.3px;border-radius:0';
            const label=document.createElement('div');label.id='capture-label';
            label.style.cssText='position:absolute;bottom:30px;width:100%;text-align:center;color:white;font:800 30px Nunito,sans-serif;text-shadow:0 2px 8px #000';
            panel.append(label);document.body.append(panel);
            document.body.style.cssText='margin:0;background:#111';
            const style=document.createElement('style');style.textContent='@font-face{font-family:Nunito;src:url(/nunito.ttf);font-weight:100 900}';
            document.head.append(style);
            cancelAnimationFrame(raf);cfg.paused=true;
        }""")
        for state, label in [('green','спокійно'),('amber','тривога'),('grey','немає даних')]:
            page.evaluate("""([state,label]) => {
                cfg.state=state;
                tracks=state==='amber' ? [mk(1,60,'shahed')] : [];
                draw(2400);cancelAnimationFrame(raf);
                document.querySelector('#capture-scene').src='/radar_scene_'+(state==='grey'?'green':state)+'.png';
                document.querySelector('#capture-scene').style.filter=state==='grey'?'grayscale(1) brightness(.65)':'';
                document.querySelector('#capture-label').textContent=label;
            }""",[state,label])
            page.evaluate('document.fonts.ready')
            page.wait_for_function("document.querySelector('#capture-scene').complete && document.querySelector('#capture-scene').naturalWidth > 0")
            p=OUT/'fluger-kids'/('radar-'+state+'.png');p.parent.mkdir(parents=True,exist_ok=True)
            page.locator('#capture-panel').screenshot(path=str(p))
            proof['fluger-kids'].append({'file':p.name,'source':['DiaApp/ui-concept/radar-demo.html',
                'DiaApp/app/src/main/res/drawable-nodpi/radar_scene_'+('green' if state=='grey' else state)+'.png',
                'DiaApp/app/src/main/java/com/vossa/linxdisplay/KidDisplayActivity.kt:370'],
                'kind':'phone','evidence':'Presentation reconstruction from original web prototype + app artwork and layout. Not an Android runtime capture.',
                'state':state,'privacy':'Synthetic radar, no location, time, targets or live alert API.',
                'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    browser.close()
for id,rows in proof.items():
    if not rows:
        continue
    (OUT/id/'provenance.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'captured':{k:len(v) for k,v in proof.items()},'external_requests_blocked':sorted(set(blocked))}))
