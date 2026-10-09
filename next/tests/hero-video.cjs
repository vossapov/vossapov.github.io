const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const docEvents = {}, mediaEvents = {};
const figure = { classList: { add() {} } };
const video = { paused: true, closest: () => figure, addEventListener() {}, pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); } };
const reduced = { matches: true, addEventListener: (k,v) => mediaEvents[k] = v };
const doc = { hidden: false, querySelector: () => video, addEventListener: (k,v) => docEvents[k] = v };
let intersection;
vm.runInNewContext(fs.readFileSync('next/hero-video.js', 'utf8'), {
  document: doc, matchMedia: () => reduced,
  IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} }
});
intersection([{ isIntersecting: true }]); assert(video.paused, 'reduced motion starts still');
reduced.matches = false; mediaEvents.change(); assert(!video.paused);
doc.hidden = true; docEvents.visibilitychange(); assert(video.paused);
doc.hidden = false; docEvents.visibilitychange(); assert(!video.paused);
intersection([{ isIntersecting: false }]); assert(video.paused);
intersection([{ isIntersecting: true }]); assert(!video.paused);
reduced.matches = true; mediaEvents.change(); assert(video.paused);
const html = fs.readFileSync('next/index.html', 'utf8');
assert(!html.includes('hero-film-toggle'));
assert(!html.includes('data-i18n="nav.original"'));
console.log('PASS hero: no pause/original-version controls; reduced motion and visibility');
