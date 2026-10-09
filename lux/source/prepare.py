"""Build a private local runtime from the public demo shipped alongside this source."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parent
PUBLIC=ROOT.parent
DIST=ROOT/'demo/dist'
DIST.mkdir(parents=True,exist_ok=True)
for name in ['index.html','app.js','marketing.js','campaign-wizard.js','store-map.js','style.css','catalog.json','photo-index.json','photo-static.js','assets','audio','campaign','models','vendor','licenses','research','review']:
 source=PUBLIC/name;target=DIST/name
 if not source.exists():continue
 if source.is_dir():shutil.copytree(source,target,dirs_exist_ok=True)
 else:shutil.copy2(source,target)
p=DIST/'index.html';p.write_text(p.read_text().replace(' data-mode="static"',''))
(ROOT/'demo/models').mkdir(exist_ok=True)
shutil.copy2(DIST/'models/clip-vision.onnx',ROOT/'demo/models/clip-vision.onnx')
print('Local runtime ready. Run bash start.sh from this folder.')
