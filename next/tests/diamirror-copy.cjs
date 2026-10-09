const fs = require('fs');
const assert = require('node:assert/strict');
const d = JSON.parse(fs.readFileSync('next/content/additional-projects.json')).find(x => x.project.id === 'diamirror');
for (const lang of ['ua','en']) {
  const text = d.presentation.sections.map(s => s.body[lang]).join(' ');
  assert(text.split(/\s+/).length <= 100, 'DiaMirror body copy must be short: '+lang);
  for (const pattern of (lang==='ua' ? [/рідних застосунків/,/різних сенсорів/,/будь-якою кількістю/,/скриншот/,/телефон/] : [/native apps/,/different sensors/,/any number/,/screenshots/,/phone/])) assert(pattern.test(text), 'Missing purpose/problem: '+pattern);
  assert.equal(d.project.bullets.length, 0, 'No redundant contribution list');
}
console.log('PASS short UA/EN DiaMirror copy: source apps, sharing and concrete problems');
