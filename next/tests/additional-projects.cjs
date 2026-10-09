const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const box = { window: {} };
for (const file of ['data.js', 'presentation-data.js']) vm.runInNewContext(fs.readFileSync('next/' + file, 'utf8'), box);
const expected = {
  'budmarket-lux': { s: [2026, 10], e: [2026, 10] },
  'diamirror': { s: [2026, 7], e: [2026, 8] },
  'fluger-kids': { s: [2026, 7], e: [2026, 8] },
  'lacetti-link': { s: [2026, 9], e: [2026, 9] }
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(expected);
for (const id of ids) {
  const matches = box.window.VI_DATA.projects.filter(p => p.id === id);
  assert.equal(matches.length, 1, id + ': exactly one new standalone project');
  const p = matches[0];
  assert.equal(p.co, 'personal');
  assert.deepEqual(Array.from(p.s), expected[id].s);
  assert.deepEqual(Array.from(p.e), expected[id].e);
  assert.equal(p.endInclusive, true, 'full calendar months, including single-month work');
  assert.equal(p.original, false, 'new cases must not link to missing legacy pages');
  assert.equal(p.ongoing, false);
  assert.equal(p.category, 'apps');
  assert(p.name.every(Boolean) && p.desc.every(Boolean));
  if (id === 'diamirror') assert.equal(p.bullets.length, 0, 'Owner requested short purpose/problem copy, not a contribution list');
  else assert(p.bullets.length >= 3);
  const c = box.window.VI_CASES.cases[id];
  assert(c && c.sections.length >= 3, id + ': a real narrative and visual sections');
  assert(c.sections.every(s => s.title.en && s.title.ua && s.body.en && s.body.ua));
  assert(c.images.length >= 2 && c.hero.imgs.length > 0);
  for (const src of c.images) {
    assert(src.startsWith('/next/assets/projects/' + id + '/') || src === '/next/assets/generated-mockups/' + id + '.png');
    assert(fs.existsSync('.' + src), src);
    assert(box.window.VI_CASES.sizes[src].every(x => x > 0));
    assert(c.captions[src].en && c.captions[src].ua);
  }
  assert(c.sections.some(s => /demo|prototype/i.test(s.body.en)), 'State the evidence/demo boundary');
  console.log('PASS ' + id + ': standalone case, personal-project dates, source screens, UA/EN, provenance boundary');
}
if (ids.length === 4) {
  assert.equal(box.window.VI_DATA.projects.length, 42);
  assert.equal(Object.keys(box.window.VI_CASES.cases).length, 42);
}
