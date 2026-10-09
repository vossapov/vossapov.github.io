"""Local tests; no account usage and no changes to real campaign storage."""
import os, sys, tempfile, unittest, json, base64, io, zipfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
TEMP=tempfile.TemporaryDirectory()
os.environ['LUX_CREATIVE_DATA']=TEMP.name
sys.path.insert(0,str(ROOT/'demo'));sys.path.insert(0,str(ROOT/'demo/vendor'))
import creative
from PIL import Image

class CreativeTests(unittest.TestCase):
    def test_chatgpt_access_failure(self):
        with patch.object(creative,'codex_binary',return_value=None):
            self.assertEqual(creative.status()['message'],creative.ACCESS_MESSAGE)
            with self.assertRaisesRegex(ValueError,'треба доступ до Chat GPT'):
                creative.run_codex(Path(TEMP.name),'test',creative.GEN_SCHEMA)
        with patch.object(creative,'codex_binary',return_value='codex'), patch.object(creative.subprocess,'run',side_effect=OSError('unavailable')):
            with self.assertRaisesRegex(ValueError,'треба доступ до Chat GPT'):
                creative.run_codex(Path(TEMP.name),'test',creative.GEN_SCHEMA)
    def brief(self):return {'name':'Кампанія','description':'Опис','task':'Банер','startDate':'2026-11-01','endDate':'2026-11-07','skus':['00007'],'formats':['instagram','A5'],'attachments':[]}
    def test_upload_image_and_path_validation(self):
        raw=io.BytesIO();Image.new('RGB',(80,80),'yellow').save(raw,'PNG')
        info=creative.upload({'name':'товар.png','data':base64.b64encode(raw.getvalue()).decode()})
        self.assertTrue(creative.asset_path('asset',info['id'],'image.jpg').is_file())
        with self.assertRaises(ValueError):creative.asset_path('asset','../../credentials','image.jpg')
        with self.assertRaises(ValueError):creative.asset_path('asset',info['id'],'meta.json')
    def test_csv_and_xlsx_preserve_sku(self):
        csv=creative.upload({'name':'товари.csv','data':base64.b64encode('Артикул;Назва\n00007;Шурупокрут'.encode()).decode()})
        self.assertIn('00007',creative.attachments([csv['id']])[0][1]['text'])
        raw=io.BytesIO()
        with zipfile.ZipFile(raw,'w') as z:
            z.writestr('xl/sharedStrings.xml','<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>00007</t></si></sst>')
            z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="s"><v>0</v></c></row></sheetData></worksheet>')
        x=creative.upload({'name':'товари.xlsx','data':base64.b64encode(raw.getvalue()).decode()})
        self.assertEqual(creative.attachments([x['id']])[0][1]['text'],'00007')
    def test_confirm_creates_exact_tasks_and_full_brand_context(self):
        c=creative.create({'brief':self.brief()})
        self.assertEqual([t['format'] for t in c['tasks']],['instagram','A5'])
        context=json.loads(c['tasks'][0]['prompt']);self.assertEqual(context['product']['sku'],'00007');self.assertNotIn('location',context['product']);self.assertTrue(context['brandContext']['references']);self.assertTrue(context['brandContext']['rules']);self.assertIn('Вільна',context['brandContext']['contacts']['address'])
        self.assertEqual(creative.campaign(c['id'])['fileIds'],[])
    def test_reject_bad_brief(self):
        for changes in ({'endDate':'2026-01-01'},{'skus':['99999']},{'formats':[]},{'task':''}):
            with self.subTest(changes=changes),self.assertRaises(ValueError):creative.create({'brief':dict(self.brief(),**changes)})
    def test_no_api_keys_or_fallback(self):
        with patch.dict(os.environ,{'OPENAI_API_KEY':'test-only','CODEX_API_KEY':'test-only'}):
            self.assertNotIn('OPENAI_API_KEY',creative.codex_env());self.assertNotIn('CODEX_API_KEY',creative.codex_env())
    def test_local_bridge_rejects_external_origins_and_missing_token(self):
        from types import SimpleNamespace
        import server
        replies=[]
        h=SimpleNamespace(headers={'Host':'localhost:8080'},client_address=('127.0.0.1',1234),json=lambda data,status:replies.append(status))
        self.assertTrue(server.Handler.creative_allowed(h))
        self.assertFalse(server.Handler.creative_allowed(h,write=True))
        h.headers['X-Lux-Token']=server.CREATIVE_TOKEN
        self.assertTrue(server.Handler.creative_allowed(h,write=True))
        h.headers['Origin']='https://example.com'
        self.assertFalse(server.Handler.creative_allowed(h,write=True))
        h.headers.pop('Origin');h.headers['Host']='untrusted.example:8080'
        self.assertFalse(server.Handler.creative_allowed(h))
    def test_requires_photo_source(self):
        c=creative.create({'brief':self.brief()})
        with self.assertRaises(ValueError):creative.generation({'campaignId':c['id'],'taskId':c['tasks'][0]['id'],'findPhoto':False})
        self.assertEqual(creative.campaign(c['id'])['tasks'][0]['status'],'ready')

if __name__=='__main__':unittest.main()
