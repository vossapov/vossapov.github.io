/* Design/art-team page /ai/it/ — sections below the hero: how it works (the shared band from
   next/ai/ngo/ngo.js) and proof from Valentyn's own projects (window.VI_AI_COPY.proof, next/ai-content.js).
   page.js calls window.VIPageExtra.it(lang) and inserts the nodes before the contact block. */
(function () {
  'use strict';

  var doc = document;
  function h(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function text(tag, cls, s, attrs) { var n = h(tag, cls, attrs); n.textContent = s; return n; }
  function rich(tag, cls, s, attrs) {
    var n = h(tag, cls, attrs);
    if (window.VIRich) window.VIRich(n, s); else n.textContent = String(s).replace(/\*/g, '');
    return n;
  }
  function arrow() {
    var ns = 'http://www.w3.org/2000/svg', s = doc.createElementNS(ns, 'svg'), p = doc.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    p.setAttribute('d', 'M2.5 8h10M8.7 4.2 12.5 8l-3.8 3.8');
    s.appendChild(p);
    return s;
  }

  function project(p, W, lang) {
    var caseHref = '/next/case.html?id=' + encodeURIComponent(p.case) + '&lang=' + lang;
    var a = h('a', 'vh-ov-case vh-ov-case--project', { href: window.VI_SITES ? window.VI_SITES.portfolio(caseHref) : caseHref });
    var fig = h('span', 'vh-ov-case-shot vh-ov-project-shot' + (p.fit === 'contain' ? ' is-contain' : ''));
    var webp = window.VI_WEBP && window.VI_WEBP[p.img]; /* web-sized WebP (next/webp-map.js), not the master */
    var im = h('img', null, { src: webp && webp[0] || p.img, alt: '', loading: 'lazy', decoding: 'async' });
    im.addEventListener('error', function () { fig.hidden = true; });
    fig.appendChild(im);
    a.appendChild(fig);
    var body = h('span', 'vh-ov-case-body');
    body.appendChild(text('span', 'vh-ov-case-org', p.meta));
    body.appendChild(text('span', 'vh-ov-case-title', p.title));
    if (p.figure) {
      var num = h('span', 'vh-ov-case-figure');
      num.appendChild(text('b', null, p.figure.value));
      num.appendChild(text('span', null, p.figure.label));
      body.appendChild(num);
    }
    var split = h('span', 'vh-ov-case-split');
    [[W.ai, p.ai], [W.me, p.me]].forEach(function (r) {
      var row = h('span');
      row.appendChild(text('b', null, r[0]));
      row.appendChild(doc.createTextNode(r[1]));
      split.appendChild(row);
    });
    body.appendChild(split);
    var go = text('span', 'vh-ov-case-go', W.open);
    go.appendChild(arrow());
    body.appendChild(go);
    a.appendChild(body);
    return a;
  }

  function sections(lang) {
    var N = window.VI_AI_IT;
    if (!N) return [];
    var T = N[lang] || N.en;
    var out = [];
    if (window.VIPageParts && window.VIPageParts.how) out.push(window.VIPageParts.how(N, T));

    var D = window.VI_AI_COPY && (window.VI_AI_COPY[lang] || window.VI_AI_COPY.en);
    var byKey = {};
    (D && D.proof || []).forEach(function (p) { byKey[p.key] = p; });
    var W = T.work;
    var sec = h('section', 'it-proof', { id: 'work', 'aria-labelledby': 'itWorkTitle' });
    var wrap = h('div', 'vh-wrap');
    wrap.appendChild(rich('h2', 'ngo-h2', W.title, { id: 'itWorkTitle' }));
    wrap.appendChild(text('p', 'ngo-lead', W.lead));
    var panel = h('div', 'it-proof-panel');
    var list = h('div', 'vh-ov-cases', { 'data-n': String(N.projects.length) });
    N.projects.forEach(function (k) { if (byKey[k]) list.appendChild(project(byKey[k], W, lang)); });
    panel.appendChild(list);
    panel.appendChild(text('p', 'vh-ov-proof-note', W.note));
    panel.appendChild(text('h3', 'vh-ov-label', W.keepTitle));
    var keep = h('ul', 'it-keep');
    W.keep.forEach(function (s) { keep.appendChild(text('li', null, s)); });
    panel.appendChild(keep);
    wrap.appendChild(panel);
    sec.appendChild(wrap);
    out.push(sec);
    return out;
  }

  window.VIPageExtra = window.VIPageExtra || {};
  window.VIPageExtra.it = sections;
})();
