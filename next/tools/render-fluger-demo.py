"""Record the existing Fluger prototype with synthetic motion into an H.264 demo.
No live API, source edits, geographic positions or device connections.
Run with the QA Playwright Python: render-fluger-demo.py /absolute/path/to/DiaApp
"""
import sys,json,base64,subprocess,hashlib,mimetypes
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
SOURCE=Path(sys.argv[1]).resolve()
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/projects/fluger-kids'
OUT.mkdir(parents=True,exist_ok=True)
FPS=24; SECONDS=18
blocked=[]

def serve(route):
    u=urlparse(route.request.url)
    if u.netloc!='fluger-demo.test':
        blocked.append(u.netloc);route.abort();return
    if u.path=='/':
        route.fulfill(body=(SOURCE/'ui-concept/radar-demo.html').read_bytes(),content_type='text/html');return
    if u.path=='/nunito.ttf': f=SOURCE/'app/src/main/assets/fonts/nunito.ttf'
    elif u.path in ['/radar_scene_'+s+'.png' for s in ['green','amber','red']]:
        f=SOURCE/'app/src/main/res/drawable-nodpi'/u.path.lstrip('/')
    else:
        route.abort();return
    route.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(f.name)[0] or 'application/octet-stream')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
    page=browser.new_page(viewport={'width':468,'height':840},device_scale_factor=1,service_workers='block')
    page.route('**/*',serve)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('https://fluger-demo.test/',wait_until='networkidle')
    page.add_style_tag(content="@font-face{font-family:Nunito;src:url(/nunito.ttf);font-weight:100 900}")
    page.add_script_tag(path=str(ROOT/'tools/fluger-motion.js'))
    page.wait_for_function('window.demoReady === true')
    cmd=['ffmpeg','-y','-v','error','-f','image2pipe','-framerate',str(FPS),'-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'radar-demo.mp4')]
    with (OUT/'encode.log').open('w') as log:
        encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        assert encoder.stdin is not None
        r={"hits":0}
        try:
            for frame in range(FPS*SECONDS):
                r=page.evaluate('(t)=>window.renderDemo(t)',frame*1000/FPS)
                png=base64.b64decode(r['png']);encoder.stdin.write(png)
                if frame==13*FPS: (OUT/'radar-red.png').write_bytes(png)
                if frame in [0,3*FPS,10*FPS,13*FPS]:
                    evidence=Path('/tmp/portfolio-fluger-motion');evidence.mkdir(exist_ok=True)
                    (evidence/('frame-%03d.png'%frame)).write_bytes(png)
            encoder.stdin.close()
            assert encoder.wait(timeout=120)==0, 'ffmpeg failed; inspect encode.log'
        except BaseException:
            encoder.kill();encoder.wait();raise
    assert not errors,errors
    browser.close()
proof={'synthetic':True,'evidence':'Presentation prototype animation, not an Android runtime recording. Reuses original scene PNGs, embedded threat PNGs and radar drawing functions. Only synthetic display paths are added.','source':['DiaApp/ui-concept/radar-demo.html','DiaApp/app/src/main/res/drawable-nodpi/radar_scene_{green,amber,red}.png'],'duration_seconds':SECONDS,'fps':FPS,'dimensions':[936,1680],'hit_count':r['hits'],'states':[{'second':0,'state':'calm'},{'second':2,'state':'alert'},{'second':5,'state':'danger'},{'second':15,'state':'alert'},{'second':17,'state':'calm'}],'blocked_external_hosts':sorted(set(blocked)), 'assets':{name:hashlib.sha256((OUT/name).read_bytes()).hexdigest() for name in ['radar-red.png','radar-demo.mp4']}}
(OUT/'video-provenance.json').write_text(json.dumps(proof,indent=2,ensure_ascii=False)+'\n')
(OUT/'encode.log').unlink()  # Empty on success; retain on failure.
print(json.dumps({k:proof[k] for k in ['duration_seconds','fps','dimensions','hit_count','blocked_external_hosts']}))
