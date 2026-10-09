import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path('/tmp/portfolio-fluger-video-qa');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')
    count=0
    for width in [320,390,1440]:
        for lang in ['ua','en']:
            page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto('http://127.0.0.1:8765/next/case.html?id=fluger-kids&lang='+lang)
            video=page.locator('.cs-sec-video .dv-phone video')
            assert video.count()==1, 'Video must be embedded inside the phone mockup'
            video.scroll_into_view_if_needed()
            assert video.evaluate('(v)=>v.controls && v.playsInline && !v.autoplay && v.paused')
            assert 'radar-red.png' in video.get_attribute('poster')
            assert video.locator('track[kind=captions]').get_attribute('srclang')==('uk' if lang=='ua' else 'en')
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            video.evaluate('(v)=>v.play()')
            page.wait_for_function('document.querySelector("video").currentTime > .3')
            assert video.evaluate('(v)=>v.videoWidth===936 && v.videoHeight===1680 && !v.error')
            assert video.evaluate('(v)=>v.seekable.length>0 && v.seekable.end(0)>=17.9'), 'Server must support full clip seeking'
            video.evaluate('(v)=>{v.textTracks[0].mode="hidden"}')
            page.wait_for_function('document.querySelector("video").textTracks[0].cues?.length === 6')
            video.evaluate('(v)=>{v.pause();v.currentTime=13}')
            page.wait_for_function('!document.querySelector("video").seeking && Math.abs(document.querySelector("video").currentTime-13)<.15')
            page.wait_for_timeout(100)
            page.locator('.cs-sec-video').screenshot(path=str(OUT/f'video-{width}-{lang}.png'))
            video.evaluate('(v)=>v.play()');page.evaluate('scrollTo(0,0)');page.wait_for_timeout(250)
            assert video.evaluate('(v)=>v.paused'), 'Offscreen video should stop'
            assert not errors,errors
            count+=1;page.close()
    browser.close()
print(json.dumps({'video_states':count,'actual_decode':'PASS','reduced_motion':'no autoplay','offscreen_pause':'PASS'}))
