/* Lux store assistant inside the demo frame. The app (/lux/) is loaded unchanged in an iframe from the same
   origin; this script (a) starts it on the screen the visitor came for, (b) reports its screen to the stage
   so the tips outside the frame follow it, and (c) moves demo notices out of the mock-up: words such as
   «демо», «демопоказ», «тестовий режим» are removed or reworded inside the frame — the stage note and the
   bubbles say it instead. /lux/ itself keeps its own notices when opened on its own. */
(function () {
  'use strict';

  var frame = document.getElementById('luxFrame');
  var S = window.NGOStage;
  if (!frame || !S) return;
  var start = (window.location.hash || '#search').replace(/^#/, '') || 'search';
  if (!/^(search|marketing|product\/\d+|brand)$/.test(start)) start = 'search';
  frame.src = '/lux/#' + start;

  var win = null, doc = null;
  var DIALOG = { 'voice-dialog': 'voice', 'photo-dialog': 'photo', 'campaign-dialog': 'new', 'publish-dialog': 'publish', 'store-map-dialog': 'map', 'asset-dialog': 'asset' };

  function screenKey() {
    if (!doc) return 'search';
    var open = doc.querySelector('dialog[open]');
    if (open && DIALOG[open.id]) return DIALOG[open.id];
    var h = (win.location.hash || '').replace(/^#/, '');
    if (h.indexOf('product/') === 0) return 'product';
    if (h === 'marketing/smm' || h === 'smm') return 'smm';
    if (h.indexOf('marketing/campaign/') === 0) return 'campaign';
    if (h.indexOf('marketing') === 0) return 'marketing';
    if (h === 'brand') return 'brand';
    return 'search';
  }
  function report() { S.state(screenKey()); }
  /* the wrapper's own hash follows the app, so a reload reopens the same screen */
  function syncHash() {
    var h = (win.location.hash || '').replace(/^#/, '');
    if (/^(search|marketing|product\/\d+|brand)$/.test(h) && window.location.hash !== '#' + h) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + h);
    }
  }

  /* ───────────── demo notices out of the mock-up ───────────── */
  var REWRITE = [
    [/\s*·\s*демопоказ/gi, ''],
    /* no \b: in JS it only sees Latin letters, so Cyrillic word ends are matched by a lookahead */
    [/\s*·\s*демо(?![а-яіїєґ])/gi, ''],
    [/Синя точка — демопозиція користувача\.?/g, 'Синя точка — ваше місце.'],
    [/демопозиція/gi, 'ваше місце'],
    [/Демопозиція/g, 'Ваше місце']
  ];
  var HIDE_RE = /^(Тестовий режим|Тестова публікація)/;
  function scrub(root) {
    if (!root) return;
    var tw = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, null), n, list = [];
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(function (t) {
      var v = t.nodeValue, w = v;
      if (!/дем|ДЕМ|Тестов/.test(v)) return;
      REWRITE.forEach(function (r) { w = w.replace(r[0], r[1]); });
      if (w !== v) t.nodeValue = w;
      var p = t.parentElement;
      if (p && HIDE_RE.test(w.trim()) && p.children.length === 0) p.hidden = true;
    });
  }
  var pending = 0;
  function scheduleScrub() {
    if (pending) return;
    pending = win.requestAnimationFrame(function () { pending = 0; scrub(doc.body); report(); });
  }

  frame.addEventListener('load', function () {
    try { win = frame.contentWindow; doc = frame.contentDocument; } catch (e) { win = doc = null; }
    if (!doc) return;
    /* the app's page title is the frame's business, not the browser tab's */
    win.addEventListener('hashchange', function () { syncHash(); report(); });
    new win.MutationObserver(scheduleScrub).observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['open'] });
    scrub(doc.body);
    syncHash();
    report();
  });

  /* bubble actions drive the framed app */
  function go(h) { if (win) win.location.hash = h; }
  S.action('product', function () { go('product/00017'); });
  S.action('marketing', function () { go('marketing'); });
  S.action('campaign', function () { go('marketing/campaign/halloween'); });
  S.state('search');
})();
