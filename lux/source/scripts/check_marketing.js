// Run with: node scripts/check_marketing.js
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('demo/dist/marketing.js','utf8');
const files=JSON.parse(fs.readFileSync('demo/dist/campaign/manifest.json','utf8'));
const fields=new Map();const field=id=>{if(!fields.has(id))fields.set(id,{value:'',hidden:true,close(){},textContent:''});return fields.get(id)};
const stored=new Map();let choices={};
const ctx=vm.createContext({Blob,TextEncoder,Uint8Array,DataView,Date,Intl,serverCampaigns:[],crypto:require('node:crypto').webcrypto,files,location:{hash:'#marketing'},$ :field,$$:selector=>(choices[selector]||[]).map(value=>({value})),notice(){},localStorage:{setItem:(k,v)=>stored.set(k,v)}});
vm.runInContext(source,ctx);
// Rendering is browser-tested separately; exercise state and persistence here.
vm.runInContext('renderMarketing=()=>{};renderSMM=()=>{};',ctx);
field('#new-campaign-name').value='Нова кампанія';field('#new-campaign-description').value='Власний опис';choices['[name="campaign-set"]:checked']=['05'];
vm.runInContext('createCampaign({preventDefault(){}})',ctx);
const campaign=JSON.parse(stored.get('lux-campaigns-v1'))[0];assert.equal(campaign.fileIds.length,4);assert.ok(campaign.fileIds.every(id=>id.startsWith('05-')));assert.equal(campaign.description,'Власний опис');
vm.runInContext("publicationCampaign=allCampaigns()[0];publicationFiles=files.filter(f=>f.productId==='05');",ctx);
choices['[name="publish-file"]:checked']=['05-stories'];choices['[name="publish-account"]:checked']=['instagram-stories'];field('#publish-copy').value='Власний допис';field('[name="publish-time"]:checked').value='now';
vm.runInContext('submitPublication({preventDefault(){}})',ctx);
let posts=JSON.parse(stored.get('lux-smm-posts-v1'));assert.equal(posts.length,1);assert.deepEqual(posts[0].attachments,[{account:'instagram-stories',fileIds:['05-stories']}]);assert.equal(posts[0].status,'published');assert.equal(posts[0].campaignId,'halloween');
choices['[name="publish-file"]:checked']=['05-instagram','05-stories','05-facebook','05-threads'];choices['[name="publish-account"]:checked']=['instagram','instagram-stories','facebook','threads'];field('[name="publish-time"]:checked').value='later';field('#publish-date').value=new Date(Date.now()+3600000).toISOString();
vm.runInContext('submitPublication({preventDefault(){}})',ctx);posts=JSON.parse(stored.get('lux-smm-posts-v1'));assert.equal(posts.length,2);assert.equal(posts[0].status,'scheduled');assert.equal(posts[0].attachments.flatMap(a=>a.fileIds).length,4);
field('#publish-date').value='2000-01-01T12:00';vm.runInContext('submitPublication({preventDefault(){}})',ctx);assert.equal(JSON.parse(stored.get('lux-smm-posts-v1')).length,2);assert.match(field('#publish-error').textContent,/майбутньому/);
field('[name="publish-time"]:checked').value='now';choices['[name="publish-account"]:checked']=['instagram'];vm.runInContext('submitPublication({preventDefault(){}})',ctx);assert.equal(JSON.parse(stored.get('lux-smm-posts-v1')).length,2);assert.match(field('#publish-error').textContent,/всіх/);
(async()=>{ctx.entries=files.filter(f=>f.productId==='05').map(f=>({name:f.url.split('/').pop().split('?')[0],bytes:new Uint8Array(fs.readFileSync('demo/dist'+f.url.split('?')[0]))}));const zip=vm.runInContext('zipFiles(entries)',ctx);fs.writeFileSync('/tmp/lux-set-check.zip',Buffer.from(await zip.arrayBuffer()));console.log('Passed: campaign creation, single-file publish, full-set schedule, past-date rejection, incomplete selection rejection. ZIP: /tmp/lux-set-check.zip')})();
