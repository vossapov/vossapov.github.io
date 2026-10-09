"""Pixel-level regression: both DiaApp presentation screens include history."""
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/projects/diaapp'
assert (ASSETS/'high.png').exists(), 'Missing yellow high-glucose screen'
for name in ['current', 'low', 'high']:
    im = Image.open(ASSETS / (name + '.png')).convert('RGB')
    w,h = im.size
    plot = im.crop((int(w*.04),int(h*.81),int(w*.96),int(h*.96)))
    pixels = list(zip(*[iter(plot.tobytes())]*3))
    white = sum(min(r,g,b)>220 for r,g,b in pixels)
    green = sum(g>r*1.5 and g>b*1.25 and 55<g<200 for r,g,b in pixels)
    assert white/len(pixels)>.45, name+': missing white history card'
    assert green>400, name+': missing glucose history curve'
    if name=='low':
        reading=im.crop((100,300,500,550)).tobytes()
        assert sum(r>180 and g<65 and b<65 for r,g,b in zip(*[iter(reading)]*3))>20000, 'Low reading region must contain significant red 3.4 text'
        rejected=im.crop((220,220,650,350)).tobytes()
        assert sum(r>180 and g<65 and b<65 for r,g,b in zip(*[iter(rejected)]*3))<1000, 'Reading must not return to rejected high/right position'
        red=sum(r>180 and r>g*2 and g<100 and b<100 for r,g,b in pixels)
        assert red>120, 'Low-reading history must include the red segment'
    if name=='high':
        amber=sum(r>150 and 90<g<180 and b<90 and r>g*1.2 for r,g,b in pixels)
        assert amber>250, 'High-reading history must include an amber segment'
meta=json.loads((ASSETS/'graph-demo.json').read_text())
assert meta['synthetic'] is True
for name,value in [('current',6.2),('low',3.4),('high',12.1)]:
    readings=meta['states'][name]
    assert len(readings)==240 and readings[-1]==value
    assert len(set(readings))>30, 'History must not be a placeholder straight line'
    assert max(readings)>11, 'History includes a visible excursion, not a decorative wave'
    steps=[round(b-a,3) for a,b in zip(readings,readings[1:])]
    assert max(abs(d) for d in steps)<.35, 'No implausible minute-to-minute jumps'
    assert len(set(steps))>=5, 'Variable rate of change, not long straight ramps'
    assert meta['geometry'][name]['scale']==[0,20]
entry=next(x for x in json.loads((ROOT/'content/additional-projects.json').read_text()) if x['project']['id']=='diaapp')
assert set(entry['project']['screens']) == {f'/next/assets/projects/diaapp/{s}.png' for s in ['current','high','low']}
assert any('/next/assets/projects/diaapp/high.png' in s.get('imgs',[]) for s in entry['presentation']['sections'])
public=json.dumps(entry,ensure_ascii=False).lower()
assert not any(x in public for x in ['demo','демодан','демонстраційн']), 'Remove public demo labels'
assert 'ДЕМОДАНІ' not in (ROOT/'tools/capture-diaapp.py').read_text(), 'Remove baked-in badge'
print('PASS: three DiaApp screens have visible history curves; red/amber segments; final values 6.2/3.4/12.1')
