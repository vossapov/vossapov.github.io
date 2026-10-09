const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const box = {window:{}};
for (const f of ['data.js','presentation-data.js']) vm.runInNewContext(fs.readFileSync('next/'+f,'utf8'),box);
const p = box.window.VI_DATA.projects.find(p=>p.id==='blastjam');
const c = box.window.VI_CASES.cases.blastjam;
assert.equal(p.name[0], 'Tatem Blast: Color Pop');
assert.equal(box.window.VI_DATA.projects.filter(p=>p.original !== false).length,37,'Preserve every legacy project');
assert.equal(box.window.VI_DATA.projects.filter(p=>p.id==='blastjam').length,1,'Do not duplicate Blast Jam');
const shots=c.images.filter(a=>a.startsWith('/next/assets/recent/blastjam/'));
assert.equal(shots.length,5,'Curate exactly five recent screens');
assert.equal(new Set(shots).size,5);
assert.equal(c.sections.filter(s=>s.recent).length,2,'Only two compact additions');
assert(c.hero.imgs.every(a=>shots.includes(a)),'New visual screens lead the case');
assert(p.recent && p.recent.summary.en && p.recent.summary.ua);
for (const src of shots) {
 assert(fs.existsSync('.'+src));
 assert.equal(c.kinds[src],'phone');
 assert(c.captions[src].en && c.captions[src].ua);
}
assert(c.sections.some(s=>s.recent && s.body.en.includes('wireframes')),'Label unfinished UX honestly');
console.log('PASS existing release title, five actual screens, two curated additions, mockup kinds, both languages and wireframe distinction');
