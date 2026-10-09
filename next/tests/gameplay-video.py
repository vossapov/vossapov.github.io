"""Real Tatem recordings: media integrity and actual browser playback/seek."""
import hashlib
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('GAMEPLAY_QA', '/tmp/portfolio-gameplay-qa'))
OUT.mkdir(parents=True, exist_ok=True)
records = json.loads((ROOT/'next/content/gameplay-recordings.json').read_text())
assert set(records) == {'blastjam', 'tilesort'}
report = []
for case in records:
    d = ROOT/'next/assets/projects'/case/'videos'
    proof = json.loads((d/'provenance.json').read_text())
    video = d/'gameplay.mp4'
    assert hashlib.sha256(video.read_bytes()).hexdigest() == proof['output_sha256']
    meta = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    stream = meta['streams'][0]
    assert stream['codec_name'] == 'h264' and stream['pix_fmt'] == 'yuv420p'
    assert stream['r_frame_rate'] == '30/1'
    assert abs(float(meta['format']['duration']) - 80) < .1
    assert len(meta['streams']) == 1  # Explicitly silent, no microphone capture.
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(video),'-f','null','-'],check=True)
    for lang in ['ua','en']:
        assert (d/f'gameplay-{lang}.vtt').read_text().startswith('WEBVTT')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROME', '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'))
    for case in records:
        for lang in ['ua','en']:
            for width in [390,1440]:
                page = browser.new_page(viewport={'width':width,'height':1000},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda e: errors.append(str(e)))
                response=page.goto(f'http://127.0.0.1:8765/next/case.html?id={case}&lang={lang}')
                assert response.status==200
                video=page.locator('video')
                assert video.count()==1
                video.scroll_into_view_if_needed()
                page.wait_for_timeout(300)
                assert video.get_attribute('preload')=='none'
                assert video.get_attribute('controls') is not None
                assert video.get_attribute('playsinline') is not None
                assert video.get_attribute('autoplay') is None
                track=video.locator('track')
                assert track.get_attribute('srclang') == ('uk' if lang=='ua' else 'en')
                assert page.request.get(track.evaluate('(e)=>e.src')).status==200
                range_response=page.request.get(video.locator('source').evaluate('(e)=>e.src'),headers={'Range':'bytes=0-31'})
                assert range_response.status==206 and len(range_response.body())==32
                video.evaluate('(v)=>v.play()')
                page.wait_for_function('document.querySelector("video").currentTime > 0.5')
                video.evaluate('(v)=>{v.pause();v.currentTime=40}')
                page.wait_for_function('(()=>{const v=document.querySelector("video");return !v.seeking&&Math.abs(v.currentTime-40)<.25})()')
                assert video.evaluate('(v)=>v.videoWidth')==720
                video.evaluate('(v)=>v.play()')
                page.wait_for_function('document.querySelector("video").currentTime>40.5')
                video.evaluate('(v)=>v.pause()')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (case,lang,width)
                assert not errors, errors
                page.screenshot(path=str(OUT/f'{case}-{lang}-{width}.png'))
                duration=video.evaluate('(v)=>v.duration')
                assert abs(duration-80)<.1
                page.evaluate('scrollTo(0,0)')
                page.wait_for_timeout(300)
                assert video.evaluate('(v)=>v.paused')
                report.append({'case':case,'lang':lang,'width':width,'duration':duration,'play_seek':'PASS','range':'PASS','errors':errors})
                page.close()
    browser.close()
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'states':len(report),'media':len(records),'result':'PASS','evidence':str(OUT)}))
