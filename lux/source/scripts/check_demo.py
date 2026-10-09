"""Meaningful smoke checks for exact catalog data, ambiguous search and local photo retrieval."""
import json,sys,io,wave
from pathlib import Path
from urllib.request import urlopen,Request
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'demo'))
import server
from PIL import Image,ImageEnhance
server.seed()
assert len(server.catalog())==30
assert [p['sku'] for p in server.search('00001')]==['00001']
assert len(server.search('гіпсокартон'))==2
assert server.search('Знайди мені гіпсокартон 12,5 яка ціна та кількість на складі')
assert server.search('Яка ціна лампи E27')[0]['sku']=='00017'
assert server.search('невідомий товар qwerty')==[]
assert server.search('00029')[0]['stock']==0
for p in server.catalog():
 assert p['price']==round(p['oldPrice']*(100-p['discount'])/100,2)
 assert p['sku'].startswith('000')
p=ROOT/'demo/dist/assets/products/07.png'
result=server.vision.find(p.read_bytes())
assert result['exact'] and result['products'][0]['sku']=='00007'
im=Image.open(p).convert('RGB').resize((520,520)).rotate(8,fillcolor='white')
im=ImageEnhance.Brightness(im).enhance(.88)
buf=io.BytesIO(); im.save(buf,format='JPEG',quality=80)
result=server.vision.find(buf.getvalue())
assert not result['exact']
assert result['products'][0]['sku']=='00007',result
print('PASS: 30 rows, exact SKU, ambiguous names, voice query, unknown query, zero stock, all prices, exact photo, modified photo')
if '--http' in sys.argv:
 base='http://127.0.0.1:8080'
 wav=urlopen(base+'/api/speech?sku=00017').read()
 assert wav[:4]==b'RIFF' and len(wav)>10000
 r=urlopen(Request(base+'/api/photo',data=p.read_bytes(),method='POST',headers={'Content-Type':'image/png'}))
 assert json.load(r)['products'][0]['sku']=='00007'
 print('PASS: HTTP local Ukrainian TTS WAV and photo API')
