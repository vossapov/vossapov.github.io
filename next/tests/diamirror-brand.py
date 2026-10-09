"""Regression: all DiaMirror mockup captures reserve physical phone safe areas."""
import json
from pathlib import Path
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'assets/projects/diamirror'
for name in ['phone-current','phone-history','phone-stale']:
    im=Image.open(folder/(name+'.png')).convert('RGB')
    assert im.size == (780,1688)
    # 52 CSS px top / 32 bottom at DPR 2. No text/controls under rounded corners.
    for label,box in [('top',(0,0,780,104)),('bottom',(0,1624,780,1688))]:
        area=im.crop(box)
        assert ImageChops.difference(area,Image.new('RGB',area.size,'white')).getbbox() is None, f'{name}: {label} safe area contains UI'
    brand=im.crop((48,132,128,204))
    rgb=brand.tobytes()
    green=sum(1 for r,g,b in zip(rgb[::3],rgb[1::3],rgb[2::3]) if g>r+40 and g>b+20)
    assert green>150, f'{name}: green logo missing from header'
    print('PASS',name,'top/bottom reserved, header logo')
print(json.dumps({'screens':3,'safe_area_checks':6}))
