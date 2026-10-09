#!/usr/bin/env node
/*
 * Reproducible data snapshot for the /next/ portfolio variant.
 *
 *   node next/tools/export-data.cjs            # writes next/data.js
 *   node next/tools/export-data.cjs --check    # exits 1 if next/data.js is stale
 *
 * The original ../../timeline.js is a browser script: it declares COMPANIES,
 * PROJECTS, PROJECT_* maps with top-level `const`, and touches `document`,
 * `localStorage` and `window` while loading. We evaluate it inside a Node `vm`
 * sandbox with inert stubs (nothing is rendered, nothing is persisted) and
 * append one expression that reads the constants back. The source file is
 * never modified.
 *
 * "Ongoing" is detected by identity: the source marks an open-ended range with
 * `e: NOW` (the very same array object), so `c.e === NOW` BEFORE serialisation.
 * After JSON the reference is gone, which is why we flag it here.
 * Dates are copied verbatim ([year, month]).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'timeline.js');
const OUT = path.join(ROOT, 'next', 'data.js');

const noop = () => {};
const sandbox = {
  console,
  document: {
    addEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add: noop, remove: noop }, setAttribute: noop }),
    documentElement: { getAttribute: () => 'en', setAttribute: noop },
  },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  window: { matchMedia: () => ({ matches: false, addEventListener: noop }), addEventListener: noop, location: { href: '' } },
  IntersectionObserver: function () { this.observe = noop; this.unobserve = noop; },
  setTimeout: noop,
};
sandbox.window.document = sandbox.document;

const source = fs.readFileSync(SRC, 'utf8');
const probe = `;({ NOW, COMPANIES, PROJECTS, COMPANY_LOGOS, PROJECT_COVERS, PROJECT_THUMBS,
  PROJECT_MOCKUPS, PROJECT_SCREENS, PROJECT_BULLETS, PROJECT_STATS, PROJECT_STYLE, PROJECT_GENRE_FAMILY })`;
const S = vm.runInNewContext(source + probe, sandbox, { filename: 'timeline.js' });

// Category is classified on PLATFORM first (the saas genre-family also contains
// branding/print work), then on the game genre families.
function categoryOf(p) {
  const plat = (p.platform || '').toLowerCase();
  if (/(branding|print)/.test(plat)) return 'branding';
  if (S.PROJECT_GENRE_FAMILY[p.id] === 'saas') return 'web';
  return 'games';
}

const companies = S.COMPANIES.map((c) => ({
  id: c.id,
  name: c.name,
  role: c.role,
  color: c.color,
  side: c.side,
  s: c.s,
  e: c.e,
  ongoing: c.e === S.NOW,
  ambient: !!c.ambient,
  url: c.url || null,
  logo: S.COMPANY_LOGOS[c.id] || null,
}));

const projects = S.PROJECTS.map((p) => {
  const stats = S.PROJECT_STATS[p.id] || {};
  return {
    id: p.id,
    co: p.co,
    s: p.s,
    e: p.e,
    ongoing: p.e === S.NOW,
    name: p.name,
    genre: p.genre,
    platform: p.platform,
    engine: p.engine || null,
    desc: p.desc,
    links: p.links || [],
    category: categoryOf(p),
    family: S.PROJECT_GENRE_FAMILY[p.id] || null,
    style: S.PROJECT_STYLE[p.id] || null,
    cover: S.PROJECT_COVERS[p.id] || null,
    thumb: S.PROJECT_THUMBS[p.id] || null,
    mockup: S.PROJECT_MOCKUPS[p.id] || null,
    screens: S.PROJECT_SCREENS[p.id] || [],
    bullets: S.PROJECT_BULLETS[p.id] || [],
    highlights: stats.highlights || [],
  };
});

// New portfolio cases are independent of the legacy source and use inclusive calendar months.
const additions = JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/additional-projects.json'), 'utf8'));
projects.push(...additions.map(entry => Object.assign({}, entry.project, { original: false })));
companies.push({
  id: 'personal', name: ['Personal projects', 'Власні проєкти'],
  role: ['Independent products', 'Власні продукти'], color: '#c084fc',
  side: 'right', s: [2026, 7], e: S.NOW, ongoing: true, ambient: true,
  url: null, logo: null,
});
// The source snapshot can lag behind newly completed work. Extend only ongoing ranges.
const horizon = Math.max(S.NOW[0] * 12 + S.NOW[1], ...projects.map(p => p.e[0] * 12 + p.e[1] + (p.endInclusive ? 1 : 0)));
const now = [Math.floor((horizon - 1) / 12), (horizon - 1) % 12 + 1];
for (const item of [...companies, ...projects]) if (item.ongoing) item.e = now;

// Curated additions live only in the parallel version; source dates and copy stay intact.
const recentWork = JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/recent-work.json'), 'utf8'));
for (const p of projects) {
  const r = recentWork[p.id];
  if (r) p.recent = { label: r.label, summary: r.summary,
    images: r.assets.map(a => '/next/assets/recent/' + p.id + '/' + a.file),
    preview: r.preview ? '/next/assets/recent/' + p.id + '/' + r.preview : null };
}

// ── Integrity checks (fail loudly instead of shipping a partial snapshot) ──
// Finished ImageGen scenes are the primary presentation; keep source art intact.
for (const p of projects) {
  const generated = '/next/assets/generated-mockups/' + p.id + '.png';
  if (!fs.existsSync(path.join(ROOT, generated.slice(1)))) continue;
  p.sourceArtwork = [p.cover, p.thumb, p.mockup].filter(Boolean);
  p.generatedMockup = generated;
  p.cover = p.thumb = p.mockup = generated;
  if (p.recent) p.recent.preview = generated;
}

const problems = [];
const ids = new Set();
for (const p of projects) {
  if (ids.has(p.id)) problems.push('duplicate project id ' + p.id);
  ids.add(p.id);
  if (!companies.some((c) => c.id === p.co)) problems.push(p.id + ': unknown company ' + p.co);
}
for (const [id, tgt] of [['blastjam', 'Tatem Blast: Color Pop'], ['tilesort', 'Sort Dash: Enchanted']]) {
  const p = projects.find((x) => x.id === id);
  if (!p || p.name[0] !== tgt || p.links.length !== 2) problems.push('verified Tatem entry changed: ' + id);
}
const assets = [];
for (const p of projects) {
  [p.cover, p.thumb, p.mockup, ...p.screens].filter(Boolean).forEach((a) => assets.push([p.id, a]));
}
for (const c of companies) if (c.logo) assets.push([c.id, c.logo]);
for (const [id, a] of assets) {
  if (!fs.existsSync(path.join(ROOT, a.replace(/^\//, '')))) problems.push(id + ': missing asset ' + a);
}
if (problems.length) {
  console.error('export-data: integrity problems\n - ' + problems.join('\n - '));
  process.exit(2);
}

const data = { source: 'timeline.js + next/content/additional-projects.json', now, companies, projects };
const out =
  '/* GENERATED by next/tools/export-data.cjs from ../timeline.js — do not edit by hand. */\n' +
  'window.VI_DATA = ' + JSON.stringify(data, null, 1) + ';\n';

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.error('next/data.js is stale — run: node next/tools/export-data.cjs'); process.exit(1); }
  console.log('next/data.js is up to date (' + projects.length + ' projects, ' + companies.length + ' companies)');
} else {
  fs.writeFileSync(OUT, out);
  console.log('wrote ' + path.relative(ROOT, OUT) + ': ' + projects.length + ' projects, ' + companies.length +
    ' companies, ' + assets.length + ' asset refs verified; ongoing companies: ' +
    companies.filter((c) => c.ongoing).map((c) => c.id).join(', '));
}
