/* Anatomy figures (isometric SVG drawings built by next/ai/figures/<id>/build.mjs).
   window.VIAnatomy.mount(host, slug) puts the drawing for an audience into `host`.

   Two kinds, chosen in window.VI_AI.figures[slug]:
   - 'id'                      static: fetch embed-static.html, nothing moves;
   - { id: 'id', live: true }  live:   fetch embed.html once and run live.js once. On a re-render
                               (language switch) the same live node is moved into the new host,
                               so the figure's script keeps its references.

   Only the drawing is shown: no corner texts, hint, readout, legend or caption. Its accessible
   description (svg aria-label) comes from window.VI_AI[lang].aud[slug].figure.caption and is
   re-set when the page language changes; a nested slug such as 'it.qa' reads aud.it.qa.
   Live figures run a calm automatic loop and take no input. Missing files leave the host empty. */
(function () {
  'use strict';

  var BASE = '/next/ai/figures/';
  var VERSION = 'anatomy-6';
  var COPY = window.VI_AI;
  var htmlCache = {};
  var liveNodes = {};
  var started = {};

  function lang() {
    var root = document.documentElement;
    var v = root.getAttribute('data-lang');
    if (v === 'ua' || v === 'en') return v;
    return /^uk/i.test(root.lang || '') ? 'ua' : 'en';
  }
  function spec(slug) {
    var f = COPY && COPY.figures && COPY.figures[slug];
    if (!f) return null;
    return typeof f === 'string' ? { id: f, live: false } : { id: f.id, live: !!f.live };
  }
  function caption(slug) {
    var node = COPY && COPY[lang()] && COPY[lang()].aud;
    slug.split('.').forEach(function (key) { node = node && node[key]; });
    return node && node.figure && node.figure.caption || '';
  }
  function applyTexts(host, slug) {
    var text = caption(slug), svg = host.querySelector('.iso-figure svg');
    if (text && svg && svg.getAttribute('aria-label') !== text) svg.setAttribute('aria-label', text);
  }
  function fetchHtml(id, file) {
    var key = id + '/' + file;
    if (!htmlCache[key]) {
      htmlCache[key] = fetch(BASE + id + '/' + file + '?v=' + VERSION, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .catch(function () { return null; });
    }
    return htmlCache[key];
  }
  function shell(html) {
    var node = document.createElement('div');
    node.className = 'iso vh-anatomy';
    node.setAttribute('data-theme', 'light');
    node.innerHTML = html;
    return node;
  }
  function startLive(id) {
    if (started[id]) return;
    started[id] = true;
    var s = document.createElement('script');
    s.src = BASE + id + '/live.js?v=' + VERSION;
    s.async = true;
    document.body.appendChild(s);
  }
  function watchLanguage() {
    if (watchLanguage.on) return;
    watchLanguage.on = true;
    new MutationObserver(function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-anatomy-host]'), function (h) {
        applyTexts(h, h.getAttribute('data-anatomy-host'));
      });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }

  window.VIAnatomy = {
    mount: function (host, slug) {
      var s = spec(slug);
      if (!host || !s || !s.id) return;
      host.setAttribute('data-anatomy-host', slug);
      watchLanguage();
      if (s.live) {
        fetchHtml(s.id, 'embed.html').then(function (html) {
          if (!html || !host.isConnected) return;   /* a newer render replaced this host */
          if (!liveNodes[s.id]) liveNodes[s.id] = shell(html);
          host.appendChild(liveNodes[s.id]);          /* moves it out of an old host, if any */
          applyTexts(host, slug);
          startLive(s.id);
        });
        return;
      }
      fetchHtml(s.id, 'embed-static.html').then(function (html) {
        if (!html || !host.isConnected) return;
        host.appendChild(shell(html));
        applyTexts(host, slug);
      });
    }
  };
})();
