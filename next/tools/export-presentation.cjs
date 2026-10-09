#!/usr/bin/env node
/*
 * Case-study presentation snapshot for /next/case.html.
 *
 *   node next/tools/export-presentation.cjs            # writes next/presentation-data.js
 *   node next/tools/export-presentation.cjs --check    # exits 1 if next/presentation-data.js is stale
 *
 * Inputs (read only, never modified):
 *   ../../present.js   PROJECT_PRESENT — the original per-case narratives and sections.
 *                      It is a plain browser script with one top-level `const`; it is
 *                      evaluated in an empty Node `vm` context and read back as data.
 *   ../data.js         the /next/ snapshot of timeline.js (names, metadata, images).
 *   ../content/project-galleries.json  original artwork packs (sections + per-image captions)
 *                      inserted right after a case's overview.
 *
 * The MANIFEST below is the hand-made presentation decision per case, based on the
 * actual images (dimensions + visual review of every asset, 2026-10-07):
 *   kind   default frame for that case's images
 *            phone       raw portrait mobile screen  → phone shell at the image's aspect
 *            land        raw landscape mobile screen → landscape phone shell
 *            display     raw PC game screen          → desktop display with stand
 *            browser     raw web page / web app      → neutral browser window
 *            long        very tall mobile scroll     → phone shell with a scrollable screen
 *            board       already-composed artwork (brand sheets, mockups, screen exports
 *                        that already carry their own shape) → shown as-is, never framed
 *   over   per-file exceptions (file basename → kind)
 *   hero   { scene, imgs } — scene: trio (3 phones), land (2 landscape phones),
 *          display (2 displays), browser (2 windows), board (one composed artwork),
 *          none (no shareable artwork)
 * Image dimensions are read from the PNG/JPEG headers so the page can reserve space.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'present.js');
const DATA = path.join(ROOT, 'next', 'data.js');
const OUT = path.join(ROOT, 'next', 'presentation-data.js');

const MANIFEST = {
  // ── branding / print: composed presentation sheets ──
  audiostore: { kind: 'board', hero: { scene: 'board', imgs: ['audiostore-1.jpg'] } },
  soundmag: { kind: 'board', hero: { scene: 'board', imgs: ['soundmag.jpg'] } },
  mykolaivid: { kind: 'board', hero: { scene: 'board', imgs: ['mykolaivid.jpg'] } },
  boomerang: { kind: 'board', hero: { scene: 'board', imgs: ['boomerang.jpg'] } },
  woxs: { kind: 'board', over: { 'woxs-4.jpg': 'browser', 'woxs-5.jpg': 'browser', 'woxs-6.jpg': 'browser' }, hero: { scene: 'board', imgs: ['woxs.jpg'] } },
  voznesenskcity: { kind: 'board', hero: { scene: 'board', imgs: ['voznesenskcity.jpg'] } },
  cargotracker: { kind: 'board', hero: { scene: 'board', imgs: ['cargotracker.jpg'] } },
  routeschemes: { kind: 'board', hero: { scene: 'board', imgs: ['routeschemes.jpg'] } },
  anthracite: { kind: 'board', hero: { scene: 'board', imgs: ['anthracite.jpg'] } },
  voskresensk: { kind: 'board', hero: { scene: 'board', imgs: ['voskresensk.jpg'] } },
  halfgod: { kind: 'board', hero: { scene: 'board', imgs: ['halfgod.jpg'] } },
  myrazom: { kind: 'board', hero: { scene: 'board', imgs: ['myrazom.jpg'] } },
  voznesensk: { kind: 'board', hero: { scene: 'board', imgs: ['voznesensk.jpg'] } },
  // ── portrait mobile games: raw 9:16–9:19.5 screens ──
  blastjam: { kind: 'phone', hero: { scene: 'trio', imgs: ['blastjam-1.jpg', 'blastjam-2.jpg', 'blastjam-3.jpg'] } },
  tilesort: { kind: 'phone', hero: { scene: 'trio', imgs: ['tilesort-1.jpg', 'tilesort-2.jpg', 'tilesort-3.jpg'] } },
  jelly: { kind: 'phone', hero: { scene: 'trio', imgs: ['jelly-2.jpg', 'jelly-1.jpg', 'jelly-4.jpg'] } },
  nugget: { kind: 'phone', hero: { scene: 'trio', imgs: ['nugget-1.jpg', 'nugget-2.jpg', 'nugget-3.jpg'] } },
  gunbit: { kind: 'phone', hero: { scene: 'trio', imgs: ['gunbit-2.jpg', 'gunbit-1.jpg', 'gunbit-4.jpg'] } },
  domblk: { kind: 'phone', hero: { scene: 'trio', imgs: ['domino-2.jpg', 'domino-1.jpg', 'domino-3.jpg'] } },
  // tadafish screens are exported with their own rounded screen silhouette on grey → boards
  tadafish: { kind: 'board', hero: { scene: 'board', imgs: ['tadafish-mockup.jpg'] } },
  // ── landscape mobile games ──
  casino24: { kind: 'land', over: { 'casino24-4.jpg': 'board' }, hero: { scene: 'land', imgs: ['casino24-2.jpg', 'casino24-1.jpg'] } },
  tantra: { kind: 'land', hero: { scene: 'land', imgs: ['tantra-5.jpg', 'tantra-2.jpg'] } },
  // funrun-2/-4 carry design annotations along the right edge → boards
  funrun: { kind: 'land', over: { 'funrun-2.jpg': 'board', 'funrun-4.jpg': 'board' }, hero: { scene: 'land', imgs: ['funrun-3.jpg', 'funrun-1.jpg'] } },
  nftisls: { kind: 'land', hero: { scene: 'land', imgs: ['nftisls-web-2.png', 'nftisls-web-1.png'] } },
  meegos: { kind: 'land', hero: { scene: 'land', imgs: ['meegos-2.jpg', 'meegos-1.jpg'] } },
  // ── PC games: 16:9 screens ──
  undead: { kind: 'display', hero: { scene: 'display', imgs: ['undead-4.jpg', 'undead-1.jpg'] } },
  racer: { kind: 'display', hero: { scene: 'display', imgs: ['racer-2.jpg', 'racer-3.jpg'] } },
  evio: { kind: 'display', hero: { scene: 'display', imgs: ['evio-1.jpg', 'evio-3.jpg'] } },
  room8p: { kind: 'board', hero: { scene: 'none', imgs: [] } },
  // ── web / SaaS ──
  sweep: { kind: 'browser', hero: { scene: 'browser', imgs: ['admin.jpg', 'lobby.jpg'] } },
  thinks: { kind: 'browser', hero: { scene: 'browser', imgs: ['thinks-2.jpg', 'thinks-1.jpg'] } },
  trademule: { kind: 'browser', hero: { scene: 'browser', imgs: ['trademule-2.jpg', 'trademule-1.jpg'] } },
  simgate: { kind: 'browser', hero: { scene: 'browser', imgs: ['simgate-4.jpg', 'simgate-1.jpg'] } },
  // winday-web-1/2/4 are composed boards with their own blue frames; web-3 is a raw dashboard
  winday: { kind: 'board', over: { 'winday-web-3.png': 'browser' }, hero: { scene: 'board', imgs: ['winday-mockup.png'] } },
  onlyriffs: { kind: 'browser', over: { 'onlyriffs-9.jpg': 'board', 'onlyriffs-10.jpg': 'board', 'onlyriffs-11.jpg': 'board' }, hero: { scene: 'browser', imgs: ['onlyriffs-5.jpg', 'onlyriffs-3.jpg'] } },
  // ── apps with brand sheets / raw phone screens ──
  hyperian: { kind: 'board', over: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => ['hyperian-app-' + n + '.jpg', 'phone'])), hero: { scene: 'trio', imgs: ['hyperian-app-1.jpg', 'hyperian-app-2.jpg', 'hyperian-app-3.jpg'] } },
  montage: { kind: 'phone', over: { 'montage-4.jpg': 'long', 'montage-9.jpg': 'long', 'montage-12.jpg': 'board', 'montage-14.jpg': 'board' }, hero: { scene: 'trio', imgs: ['montage-3.jpg', 'montage-5.jpg', 'montage-7.jpg'] } },
};
const KINDS = new Set(['phone', 'land', 'display', 'browser', 'long', 'board', 'tablet']);
const SCENES = { trio: 3, land: 2, display: 2, browser: 2, board: 1, tablet: 1, none: 0 };

// ── source evaluation (no DOM, no globals) ──
const PRESENT = vm.runInNewContext(fs.readFileSync(SRC, 'utf8') + '\n;PROJECT_PRESENT', Object.create(null), { filename: 'present.js' });
const dataBox = { window: {} };
vm.runInNewContext(fs.readFileSync(DATA, 'utf8'), dataBox, { filename: 'data.js' });
const projects = dataBox.window.VI_DATA.projects;
const recentWork = JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/recent-work.json'), 'utf8'));
const recordings = JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/gameplay-recordings.json'), 'utf8'));
const galleries = JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/project-galleries.json'), 'utf8'));
const additions = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'next/content/additional-projects.json'), 'utf8')).map(entry => [entry.project.id, entry]));

// ── image dimensions from file headers (PNG IHDR / JPEG SOFn) ──
function dims(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  // some files keep a .png name but are WebP (RIFF … WEBP)
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    if (chunk === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  throw new Error('unreadable image header: ' + file);
}

const problems = [];
const base = (a) => a.split('/').pop();
const cases = {};
const sizes = {};
for (const p of projects) {
  const extra = additions[p.id];
  const pr = extra ? extra.presentation : PRESENT[p.id];
  const recent = recentWork[p.id];
  const manifest = extra ? extra.manifest : MANIFEST[p.id];
  if (!manifest) { problems.push(p.id + ': no manifest entry'); continue; }
  const m = Object.assign({}, manifest);
  const recentPath = f => '/next/assets/recent/' + p.id + '/' + f;
  if (recent) {
    m.hero = { scene: 'trio', imgs: recent.hero };
    m.over = Object.assign({}, m.over, Object.fromEntries(recent.assets.map(a => [a.file, a.kind])));
  }
  if (!pr) { problems.push(p.id + ': no PROJECT_PRESENT entry'); continue; }
  if (!m) { problems.push(p.id + ': no manifest entry'); continue; }
  const sections = [...(recordings[p.id] || []), ...pr.sections].map((s) => {
    const o = { type: s.type };
    for (const k of ['kicker', 'title', 'body']) if (s[k]) o[k] = s[k];
    if (s.imgs && s.imgs.length) o.imgs = s.imgs.slice();
    if (s.items) o.items = s.items;
    if (s.facts) o.facts = s.facts;
    if (s.flip) o.flip = true;
    if (s.video) {
      if (s.videoKind && !['phone', 'landscape'].includes(s.videoKind)) problems.push(p.id + ': invalid video kind');
      if (s.videoKind) o.videoKind = s.videoKind;
      o.video = { src: s.video.src, poster: s.video.poster, captions: s.video.captions };
      const media = [s.video.src, s.video.poster, ...(Object.values(s.video.captions || {}))];
      for (const a of media) {
        if (typeof a !== 'string' || !a.startsWith('/next/assets/') || a.includes('..') || !fs.existsSync(path.join(ROOT, a.slice(1)))) {
          problems.push(p.id + ': missing or invalid video asset ' + a);
        }
      }
    }
    return o;
  });
  if (recent) sections.unshift(...recent.sections.map(s => {
    const { files, ...copy } = s;
    return { ...copy, recent: true, imgs: files.map(recentPath) };
  }));
  // original artwork galleries lead the case, straight after the overview
  const gallery = galleries[p.id];
  if (gallery) {
    const owned = new Set(gallery.assets.map((a) => a.file));
    gallery.sections.forEach((s) => s.files.forEach((f) => { if (!owned.has(f)) problems.push(p.id + ': gallery section uses unlisted ' + f); }));
    const placed = new Set(gallery.sections.flatMap((s) => s.files));
    owned.forEach((f) => { if (!placed.has(f)) problems.push(p.id + ': gallery asset not in any section ' + f); });
    const lead = sections.findIndex((s) => s.type === 'narrative') + 1;
    sections.splice(lead, 0, ...gallery.sections.map(({ files, ...copy }) => ({ ...copy, imgs: files.map((f) => gallery.dir + f) })));
  }
  // every image the case owns, in order of first appearance: sections, then the rest
  const all = [];
  const add = (a) => { if (a && !all.includes(a)) all.push(a); };
  sections.forEach((s) => { (s.imgs || []).forEach(add); if (s.video) add(s.video.poster); });
  [p.mockup, p.cover, ...p.screens, p.thumb, ...(p.sourceArtwork || [])].forEach(add);
  const kinds = {};
  for (const a of all) {
    const f = path.join(ROOT, a.replace(/^\//, ''));
    if (!fs.existsSync(f)) { problems.push(p.id + ': missing asset ' + a); continue; }
    sizes[a] = dims(f);
    kinds[a] = a === p.generatedMockup ? 'board' : (m.over && m.over[base(a)]) || m.kind;
    if (!KINDS.has(kinds[a])) problems.push(p.id + ': bad kind ' + kinds[a]);
  }
  for (const f of Object.keys(m.over || {})) if (!all.some((a) => base(a) === f)) problems.push(p.id + ': override for unknown file ' + f);
  if (!(m.hero.scene in SCENES)) problems.push(p.id + ': bad hero scene ' + m.hero.scene);
  if (m.hero.imgs.length !== SCENES[m.hero.scene]) problems.push(p.id + ': hero needs ' + SCENES[m.hero.scene] + ' images');
  const hero = m.hero.imgs.map((f) => all.find((a) => base(a) === f));
  if (hero.some((a) => !a)) problems.push(p.id + ': hero image not owned by the case: ' + m.hero.imgs.join(', '));
  // device scenes must only ever wrap raw screens of the matching kind
  const want = { trio: 'phone', land: 'land', display: 'display', browser: 'browser', board: 'board', tablet: 'tablet' }[m.hero.scene];
  hero.forEach((a) => { if (a && kinds[a] !== want) problems.push(p.id + ': hero ' + base(a) + ' is ' + kinds[a] + ', scene wants ' + want); });
  cases[p.id] = { accent: pr.accent, tagline: pr.tagline,
    hero: p.generatedMockup ? { scene: 'board', imgs: [p.generatedMockup] } : { scene: m.hero.scene, imgs: hero },
    generatedMockup: p.generatedMockup || null, sections, images: all, kinds,
    captions: Object.assign({}, extra ? extra.captions : {}, gallery ? Object.fromEntries(gallery.assets.map((a) => [gallery.dir + a.file, a.title])) : {}, recent ? Object.fromEntries(recent.assets.map(a => [recentPath(a.file), a.title])) : {},
      p.generatedMockup ? { [p.generatedMockup]: { en: 'Generated presentation mockup', ua: 'Згенерований презентаційний мокап' } } : {}) };
}
for (const id of Object.keys(PRESENT)) if (!projects.some((p) => p.id === id)) problems.push(id + ': present.js entry without project');
if (problems.length) {
  console.error('export-presentation: integrity problems\n - ' + problems.join('\n - '));
  process.exit(2);
}

const out =
  '/* GENERATED by next/tools/export-presentation.cjs from ../present.js + next/data.js — do not edit by hand. */\n' +
  'window.VI_CASES = ' + JSON.stringify({ source: 'present.js', cases, sizes }, null, 1) + ';\n';

if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== out) { console.error('next/presentation-data.js is stale — run: node next/tools/export-presentation.cjs'); process.exit(1); }
  console.log('next/presentation-data.js is up to date (' + Object.keys(cases).length + ' cases, ' + Object.keys(sizes).length + ' images)');
} else {
  fs.writeFileSync(OUT, out);
  const tally = {};
  Object.values(cases).forEach((c) => Object.values(c.kinds).forEach((k) => (tally[k] = (tally[k] || 0) + 1)));
  console.log('wrote ' + path.relative(ROOT, OUT) + ': ' + Object.keys(cases).length + ' cases, ' + Object.keys(sizes).length + ' images ' + JSON.stringify(tally));
}
