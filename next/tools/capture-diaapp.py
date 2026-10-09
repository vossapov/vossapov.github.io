"""Add the missing native-style history layer to DiaApp portfolio concepts.
Offline presentation reconstruction, NOT an Android runtime screenshot.
Usage: QA_PLAYWRIGHT_PYTHON next/tools/capture-diaapp.py SOURCE_DIAAPP
"""
import base64
import hashlib
import json
import random
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve()
OUT = ROOT / 'assets/projects/diaapp'
CHROME = '/home/vossapov/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'

# Synthetic one-minute readings with gradual excursions and correlated noise.
# Values are quantised like CGM readings; never sourced from a person's history.
def fixture(name):
    anchors = ([(0,7.1),(18,6.7),(39,7.3),(58,9.7),(80,12.4),(98,11.6),
                (122,9.4),(146,7.8),(166,7.0),(189,6.5),(210,6.8),(229,6.2),(239,6.2)]
               if name == 'current' else
               [(0,8.2),(22,7.7),(42,8.4),(65,10.5),(89,12.1),(109,11.3),
                (133,9.5),(155,7.6),(179,6.4),(200,5.2),(220,4.3),(239,3.4)])
    if name == 'high':
        anchors = [(0,6.8),(24,6.3),(49,7.0),(70,8.7),(94,10.7),(116,8.4),
                   (141,7.9),(163,8.3),(185,9.1),(204,10.2),(222,11.0),(239,12.1)]
    rng = random.Random({'current':71, 'low':83, 'high':97}[name])
    points, noise, segment = [], 0.0, 0
    for i in range(240):
        while segment < len(anchors)-2 and i > anchors[segment+1][0]:
            segment += 1
        (a,av),(b,bv) = anchors[segment:segment+2]
        t = (i-a)/(b-a)
        value = av + (bv-av)*(t*t*(3-2*t))
        noise = .72*noise + rng.uniform(-.055,.055)
        # Let the final trend settle onto the visible reading without a jump.
        weight = min(1, max(0,(239-i)/10))
        points.append(round(value + noise*weight, 1))
    return points

# Portfolio chart treatment: fixed 0–20 scale, subdued range/grid and a fine
# threshold-coloured trace. This deliberately refines the native chart styling.
DRAW = """async ({image, data}) => {
 const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
 const img=new Image(); img.src=image; await img.decode();
 canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
 const w=canvas.width,h=canvas.height;
 ctx.drawImage(img,0,0);
 const m=28, ch=h*.19, card={x:m,y:h-m-ch,w:w-2*m,h:ch};
 ctx.fillStyle='#fcfdfb';ctx.shadowColor='rgba(15,40,25,.13)';ctx.shadowBlur=18;ctx.shadowOffsetY=4;
 ctx.beginPath();ctx.roundRect(card.x,card.y,card.w,card.h,24);ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.shadowColor='transparent';
 const plot={x:card.x+62,y:card.y+19,w:card.w-90,h:card.h-53};
 const low=4,high=10,min=0,max=20;
 const x=i=>plot.x+i/(data.length-1)*plot.w;
 const y=v=>plot.y+plot.h-(v-min)/(max-min)*plot.h;
 ctx.fillStyle='rgba(47,164,87,.065)';ctx.fillRect(plot.x,y(high),plot.w,y(low)-y(high));
 ctx.font='500 16px Arial';ctx.textAlign='right';ctx.textBaseline='middle';
 for(const value of [0,5,10,15,20]) {
   ctx.fillStyle='#7b867e';ctx.fillText(String(value),plot.x-16,y(value));
   ctx.strokeStyle='rgba(57,81,66,.10)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(plot.x,y(value));ctx.lineTo(plot.x+plot.w,y(value));ctx.stroke();
 }
 ctx.setLineDash([4,6]);ctx.strokeStyle='rgba(65,117,80,.23)';
 for(const value of [low,high]) {ctx.beginPath();ctx.moveTo(plot.x,y(value));ctx.lineTo(plot.x+plot.w,y(value));ctx.stroke();}
 ctx.setLineDash([]);
 ctx.textBaseline='alphabetic';
 ['08:00','09:00','10:00','11:00','12:00'].forEach((label,i)=>{
   ctx.textAlign=i===0?'left':i===4?'right':'center';ctx.fillStyle='#7b867e';
   ctx.fillText(label,plot.x+i/4*plot.w,card.y+card.h-12);
 });
 const gradient=ctx.createLinearGradient(0,plot.y,0,plot.y+plot.h);
 const hi=(y(high)-plot.y)/plot.h,lo=(y(low)-plot.y)/plot.h;
 [[0,'#d08a21'],[hi,'#d08a21'],[hi,'#30965b'],[lo,'#30965b'],[lo,'#db4a47'],[1,'#db4a47']].forEach(([s,c])=>gradient.addColorStop(s,c));
 ctx.strokeStyle=gradient;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();ctx.moveTo(x(0),y(data[0]));
 for(let i=1;i<data.length;i++) ctx.lineTo(x(i),y(data[i]));
 ctx.stroke();
 const last=data[data.length-1];ctx.fillStyle=last<low?'#db4a47':last>high?'#d08a21':'#30965b';
 ctx.beginPath();ctx.arc(x(data.length-1),y(last),5,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#fcfdfb';ctx.lineWidth=2;ctx.stroke();
 return {width:w,height:h,card,plot,scale:[min,max]};
}"""

OUT.mkdir(parents=True,exist_ok=True)
meta={'synthetic':True,'source':'KidGlucoseView.kt:drawGraphCard','states':{},'artwork_sha256':{},'geometry':{}}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=CHROME)
    page=browser.new_page(viewport={'width':1600,'height':1200},device_scale_factor=1)
    page.route('**/*',lambda route:route.abort())
    page.set_content('<style>html,body{margin:0}canvas{display:block}</style><canvas></canvas>')
    for name,src in [('current','gen_inrange.png'),('low','gen_low.png'),('high','gen_high.png')]:
        artwork = OUT/'low-artwork.png' if name == 'low' else SOURCE/'ui-concept'/src
        raw=artwork.read_bytes()
        data=fixture(name)
        meta['states'][name]=data
        meta['artwork_sha256'][name]=hashlib.sha256(raw).hexdigest()
        meta['geometry'][name]=page.evaluate(DRAW,{'image':'data:image/png;base64,'+base64.b64encode(raw).decode(),'data':data})
        page.locator('canvas').screenshot(path=str(OUT/(name+'.png')))
    browser.close()
(OUT/'graph-demo.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({'screens':len(meta['states']),'history_samples_per_screen':240,'synthetic':True,'output':str(OUT)}))
