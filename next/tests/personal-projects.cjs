const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const box = {window:{}};
for (const file of ['data.js','presentation-data.js']) vm.runInNewContext(fs.readFileSync('next/'+file,'utf8'),box);
const data = box.window.VI_DATA;
const ids = ['diaapp','fluger-kids','diamirror','lacetti-link'];
const company = data.companies.find(c=>c.id==='personal');
assert(company, 'Separate personal-projects band exists');
assert.deepEqual(Array.from(company.name), ['Personal projects','Власні проєкти']);
assert.equal(company.side,'right');
assert(company.ambient);
assert.deepEqual(Array.from(data.projects.filter(p=>p.co==='personal'),p=>p.id).sort(),ids.sort());
assert.equal(data.projects.length,41);
assert.equal(new Set(data.projects.map(p=>p.id)).size,41);
for (const id of ids) {
  const p = data.projects.find(p=>p.id===id);
  assert.equal(p.original,false);
  assert.equal(p.category,'apps');
  assert(p.endInclusive);
  const c = box.window.VI_CASES.cases[id];
  assert(c && c.hero.imgs.length && c.images.length>=2,id+': separate usable case');
  for (const src of c.images) assert(fs.existsSync('.'+src),src);
}
console.log('PASS: right-hand personal band, exactly four distinct projects, 41 unique cases');
