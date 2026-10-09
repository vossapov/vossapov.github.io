"""Lux demo: read-only SQLite catalog, local CLIP image retrieval and Ukrainian speech."""
import argparse, secrets, mimetypes, base64, hashlib, io, json, os, re, sqlite3, subprocess, sys, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'vendor'))
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
Image.MAX_IMAGE_PIXELS = 24_000_000
WEB = ROOT/'dist'
DB = ROOT/'catalog.sqlite'
STOP = set('знайди знайти мені будь ласка товар товару товари яка який які скільки кількість ціна ціною ціни наявність залишок складі склад на в у є та і ці цього його її їх нього цьому той така такого товщини товщиною міліметрів гривень коштує покажи для мене нас скажи чи мм'.split())

def seed():
    products = json.loads((WEB/'catalog.json').read_text())
    with sqlite3.connect(DB) as db:
        db.execute('CREATE TABLE IF NOT EXISTS products (sku TEXT PRIMARY KEY, payload TEXT NOT NULL)')
        db.execute('DELETE FROM products')
        db.executemany('INSERT INTO products VALUES (?,?)', [(p['sku'],json.dumps(p,ensure_ascii=False)) for p in products])

def catalog():
    with sqlite3.connect(f'file:{DB}?mode=ro',uri=True) as db:
        return [json.loads(r[0]) for r in db.execute('SELECT payload FROM products ORDER BY sku')]

def norm(s):
    return re.sub(r'[^\w.]+',' ',s.lower().replace(',','.').replace('’','').replace("'",'')).strip()

def search(q):
    products=catalog()
    q=norm(q)
    q=q.replace('дванадцять з половиною','12.5').replace('дванадцять і п ять','12.5')
    if not q: return products
    sku=re.search(r'(?<!\d)\d{5}(?!\d)',q)
    if sku: return [p for p in products if p['sku']==sku[0]]
    if q.isdigit() and len(q)>=3: return [p for p in products if p['sku'].endswith(q)]
    tokens=[t for t in q.split() if t not in STOP]
    if not tokens: return []
    scored=[]
    for p in products:
        hay=norm(p['name']+' '+p['details']+' '+p['keywords'])
        words=hay.split()
        score=sum(3 if t in words else 1 if any(w.startswith(t[:4] if len(t)==5 else t[:5]) for w in words) and len(t)>=4 else 0 for t in tokens)
        matches=sum(t in words or (len(t)>=4 and any(w.startswith(t[:4] if len(t)==5 else t[:5]) for w in words)) for t in tokens)
        if matches==len(tokens): scored.append((score,p))
    return [p for _,p in sorted(scored,key=lambda x:-x[0])]

class Vision:
    def __init__(self):
        self.lock=threading.Lock(); self.session=None; self.cache={}
    def embed(self,im):
        if self.session is None:
            import onnxruntime as ort
            ort.disable_telemetry_events()
            options=ort.SessionOptions(); options.intra_op_num_threads=2
            self.session=ort.InferenceSession(str(ROOT/'models/clip-vision.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
            self.session.disable_fallback()
        im=ImageOps.exif_transpose(im).convert('RGB')
        im=ImageOps.fit(im,(224,224),method=Image.Resampling.BICUBIC)
        arr=np.asarray(im,dtype=np.float32)/255
        arr=(arr-np.array([.48145466,.4578275,.40821073],np.float32))/np.array([.26862954,.26130258,.27577711],np.float32)
        out=self.session.run(['image_embeds'],{'pixel_values':arr.transpose(2,0,1)[None]})[0][0]
        return out/np.linalg.norm(out)
    def find(self,data):
        im=Image.open(io.BytesIO(data)); im.load()
        if min(im.size)<32: raise ValueError('Фото надто маленьке. Мінімум 32 × 32 пікселі.')
        with self.lock:
            vector=self.embed(im); scored=[]
            for p in catalog():
                path=WEB/p['image'].lstrip('/')
                if not path.exists(): continue
                key=(p['id'],path.stat().st_mtime_ns)
                if key not in self.cache:
                    raw=path.read_bytes()
                    self.cache[key]=(self.embed(Image.open(io.BytesIO(raw))),hashlib.sha256(raw).digest())
                emb,digest=self.cache[key]
                exact=hashlib.sha256(data).digest()==digest
                score=float(np.dot(vector,emb))
                scored.append((score,exact,p))
        scored.sort(key=lambda x:-x[0])
        if not scored: return {'products':[],'message':'Фотокаталог ще не готовий.'}
        if scored[0][1]: return {'products':[scored[0][2]],'exact':True,'message':'Точний збіг із фото демокаталогу.'}
        # Similarity is a ranking, NOT a calibrated probability or SKU identification.
        if scored[0][0]<.58: return {'products':[],'exact':False,'message':'Надійного збігу немає. Спробуйте фото одного товару на простому фоні або введіть артикул.'}
        candidates=[p for score,_,p in scored[:5] if score>=max(.58,scored[0][0]-.13)]
        return {'products':candidates,'exact':False,'message':'Схожі товари. Звірте модель, розмір і артикул: фото не підтверджує точний SKU.'}

vision=Vision()
import creative
CREATIVE_TOKEN=secrets.token_urlsafe(32)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(WEB),**kw)
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def json(self,data,status=200):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def creative_allowed(self,write=False):
        host=self.headers.get('Host','').split(':')[0]
        local=self.client_address[0] in ('127.0.0.1','::1') and host in ('localhost','127.0.0.1')
        origin=self.headers.get('Origin')
        if origin and origin not in ('http://'+self.headers.get('Host',''),'https://'+self.headers.get('Host','')):local=False
        if write and not secrets.compare_digest(self.headers.get('X-Lux-Token',''),CREATIVE_TOKEN):local=False
        if not local:self.json({'error':'Створення кампаній доступне тільки на цьому ПК через localhost.'},403)
        return local
    def do_GET(self):
        u=urlparse(self.path)
        if u.path.startswith('/api/creative/'):
            if not self.creative_allowed():return
            try:
                if u.path=='/api/creative/status':return self.json({**creative.status(),'token':CREATIVE_TOKEN})
                if u.path=='/api/creative/campaigns':return self.json({'campaigns':creative.list_campaigns()})
                if u.path=='/api/creative/context':return self.json(creative.brand_context())
                if u.path.startswith('/api/creative/jobs/'):return self.json(creative.job(u.path.split('/')[-1]))
                parts=u.path.split('/')
                if len(parts)==6 and parts[3] in ('asset','output'):
                    path=creative.asset_path(parts[3],parts[4],parts[5])
                    if not path.is_file():return self.json({'error':'Файл не знайдено'},404)
                    raw=path.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(path.name)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw);return
                return self.json({'error':'Невідомий запит'},404)
            except ValueError as exc:return self.json({'error':str(exc)},400)
        if u.path=='/api/search': return self.json({'products':search(parse_qs(u.query).get('q',[''])[0][:500])})
        if u.path=='/api/status': return self.json({'demo':True,'database':'SQLite','vision':(ROOT/'models/clip-vision.onnx').exists(),'speech':True,'updated':'2026-10-09T12:00:00+03:00'})
        if u.path=='/api/speech':
            sku=parse_qs(u.query).get('sku',[''])[0]
            products=[p for p in catalog() if p['sku']==sku]
            if not products: return self.json({'error':'Товар не знайдено'},404)
            p=products[0]; text=f"Демонстраційні дані. {p['name']}. {p['details']}. "
            text+=f"Ціна {p['price']:g} гривень. "
            text+=f"В наявності {p['stock']} {p['unit']}." if p['stock'] else 'Немає в наявності.'
            try: raw=subprocess.run(['espeak-ng','-v','uk','-s','155','--stdout',text],capture_output=True,check=True,timeout=15).stdout
            except (OSError,subprocess.SubprocessError): return self.json({'error':'Озвучення недоступне на сервері'},503)
            self.send_response(200); self.send_header('Content-Type','audio/wav'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw); return
        return super().do_GET()
    def do_POST(self):
        route=urlparse(self.path).path
        if route.startswith('/api/creative/'):
            if not self.creative_allowed(write=True):return
            try:
                n=int(self.headers.get('Content-Length','0'))
                if not 0<n<=18_000_000:return self.json({'error':'Запит завеликий.'},413)
                body=json.loads(self.rfile.read(n))
                if not isinstance(body,dict):raise ValueError('Очікується об’єкт JSON.')
                handlers={'/api/creative/upload':creative.upload,'/api/creative/analyze':creative.analyze,'/api/creative/create':creative.create,'/api/creative/generate':creative.generation}
                if route not in handlers:return self.json({'error':'Невідомий запит'},404)
                return self.json(handlers[route](body))
            except (ValueError,KeyError,TypeError) as exc:return self.json({'error':str(exc)},400)
            except Exception as exc:
                print('Creative error:',type(exc).__name__,str(exc),file=sys.stderr)
                return self.json({'error':'Не вдалося виконати запит. Перевірте файл або повторіть спробу.'},500)
        if route!='/api/photo': return self.json({'error':'Невідомий запит'},404)
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n<=0 or n>12_000_000: return self.json({'error':'Оберіть фото розміром до 12 МБ.'},413)
            data=self.rfile.read(n)
            return self.json(vision.find(data))
        except (ValueError,UnidentifiedImageError,Image.DecompressionBombError,Image.DecompressionBombWarning): return self.json({'error':'Не вдалося прочитати фото. Оберіть JPG, PNG або WebP до 24 мегапікселів.'},400)
        except Exception as e:
            print('Vision error:',type(e).__name__,str(e),file=sys.stderr)
            return self.json({'error':'Фотопошук тимчасово недоступний. Скористайтеся назвою або артикулом.'},503)

if __name__=='__main__':
    args=argparse.ArgumentParser(); args.add_argument('--host',default='127.0.0.1'); args.add_argument('--port',default=8080,type=int); cfg=args.parse_args()
    seed()
    print(f'Lux demo at http://{cfg.host}:{cfg.port}',flush=True)
    ThreadingHTTPServer((cfg.host,cfg.port),Handler).serve_forever()
