"""Exercise real Range delivery for the local preview's MP4."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
FILE=Path(__file__).resolve().parents[1]/'assets/projects/fluger-kids/radar-demo.mp4'
raw=FILE.read_bytes()
url='http://127.0.0.1:8765/next/assets/projects/fluger-kids/radar-demo.mp4'
for header,expected in [('bytes=0-31',raw[:32]),('bytes=1024-1055',raw[1024:1056]),('bytes=-16',raw[-16:])]:
    r=urlopen(Request(url,headers={'Range':header}))
    assert r.status==206
    assert r.headers['Accept-Ranges']=='bytes'
    assert r.read()==expected,header
    print('PASS',header,r.headers['Content-Range'])
try:
    urlopen(Request(url,headers={'Range':f'bytes={len(raw)}-'}))
    raise AssertionError('Out-of-range request must return 416')
except HTTPError as e:
    assert e.code==416
    assert e.headers['Content-Range']=='bytes */'+str(len(raw))
r=urlopen(Request(url,method='HEAD',headers={'Range':'bytes=0-31'}))
assert r.status==206 and r.headers['Content-Length']=='32' and r.read()==b''
print('PASS unsatisfiable range and HEAD')
