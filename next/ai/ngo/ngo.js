/* Non-profit page sections below the hero: how it works (dark band), two cases and the microgrants
   project. Each case has its own tinted field: tag + title + spot drawing, then "how it was → what we
   did" and the result as a statement, and real demo screenshots on a solid tone panel with the demo
   button. Copy lives in next/ai/ngo/content.js; page.js calls window.VIPageExtra.nonprofit(lang) and
   inserts the returned nodes before the contact block. */
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
  /* "*phrase*" in copy becomes a highlighter mark (window.VIRich from page.js when present) */
  function rich(tag, cls, s, attrs) {
    var n = h(tag, cls, attrs);
    if (window.VIRich) window.VIRich(n, s); else n.textContent = String(s).replace(/\*/g, '');
    return n;
  }
  function icon(d) {
    var ns = 'http://www.w3.org/2000/svg', s = doc.createElementNS(ns, 'svg'), p = doc.createElementNS(ns, 'path');
    s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }
  function arrow() { return icon('M2.5 8h10M8.7 4.2 12.5 8l-3.8 3.8'); }
  function pill(href, label, primary) {
    var a = h('a', 'vh-pill' + (primary ? ' ngo-pill--primary' : ''), { href: href });
    a.appendChild(text('span', null, label));
    a.appendChild(arrow());
    return a;
  }
  function spot(src) {
    if (!src) return null;
    var fig = h('figure', 'ngo-spot', { 'aria-hidden': 'true' });
    var img = h('img', null, { src: src, alt: '', width: '600', height: '600', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', function () { fig.hidden = true; });
    fig.appendChild(img);
    return fig;
  }
  function shot(N, s) {
    var fig = h('figure', 'ngo-shot ngo-shot--' + s.frame);
    var img = h('img', null, { src: N.shots[s.key], alt: s.alt, loading: 'lazy', decoding: 'async' });
    if (s.frame === 'phone') { img.setAttribute('width', '390'); img.setAttribute('height', '844'); }
    else { img.setAttribute('width', '1440'); img.setAttribute('height', '900'); }
    img.addEventListener('error', function () { fig.hidden = true; });
    fig.appendChild(img);
    return fig;
  }
  function visuals(N, shots, cls) {
    var box = h('div', 'ngo-visuals ' + (cls || ''));
    shots.forEach(function (s) { box.appendChild(shot(N, s)); });
    return box;
  }
  function stage(N, T, shots, demos, note) {
    var b = h('div', 'ngo-stage');
    b.appendChild(visuals(N, shots, 'ngo-visuals--' + shots.map(function (s) { return s.frame; }).join('-')));
    var act = h('div', 'ngo-try');
    var row = h('div', 'ngo-try-row');
    demos.forEach(function (d, i) { row.appendChild(pill(N.demos[d[0]], d[1] || T.labels.tryDemo, i === 0)); });
    Array.prototype.forEach.call(row.children, function (a, i) { if (demos[i][2]) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); } });
    act.appendChild(row);
    act.appendChild(text('p', 'ngo-try-note', note || T.labels.demoNote));
    b.appendChild(act);
    return b;
  }
  function head(N, c, titleId) {
    var hd = h('div', 'ngo-case-head');
    var titles = h('div', 'ngo-case-titles');
    titles.appendChild(text('p', 'ngo-tag', c.tag));
    titles.appendChild(rich('h2', 'ngo-h2', c.title, { id: titleId }));
    hd.appendChild(titles);
    var sp = spot(N.spots[c.id]);
    if (sp) hd.appendChild(sp);
    return hd;
  }

  /* how it works: one generated infographic band (desktop) above four numbered columns; on phones each
     step carries its own scene from the same drawing */
  function how(N, T) {
    var sec = h('section', 'ngo-how', { 'aria-labelledby': 'ngoHowTitle' });
    var wrap = h('div', 'vh-wrap');
    var hd = h('div', 'ngo-how-head');
    hd.appendChild(rich('h2', 'ngo-h2', T.how.title, { id: 'ngoHowTitle' }));
    if (T.how.lead) hd.appendChild(text('p', 'ngo-lead', T.how.lead));
    wrap.appendChild(hd);
    var art = N.how || {};
    var list = h('ol', 'ngo-steps');
    T.how.steps.forEach(function (st, i) {
      var li = h('li', 'ngo-step');
      if (art.steps && art.steps[i]) {
        var f = h('figure', 'ngo-step-art', { 'aria-hidden': 'true' });
        var im = h('img', null, { src: art.steps[i], alt: '', width: '600', height: '600', loading: 'lazy', decoding: 'async' });
        im.addEventListener('error', function () { f.hidden = true; });
        f.appendChild(im); li.appendChild(f);
      }
      li.appendChild(text('h3', null, st.t));
      li.appendChild(text('p', null, st.p));
      list.appendChild(li);
    });
    wrap.appendChild(list);
    sec.appendChild(wrap);
    return sec;
  }

  /* "examples of our work": one clearly named section; each project is a numbered item with its own
     colour, the kind of project (real / new) and the organisation */
  function workHead(T, total) {
    var sec = h('section', 'ngo-work-head', { id: 'work', 'aria-labelledby': 'ngoWorkTitle' });
    var wrap = h('div', 'vh-wrap');
    wrap.appendChild(rich('h2', 'ngo-h2', T.work.title, { id: 'ngoWorkTitle' }));
    wrap.appendChild(text('p', 'ngo-lead', T.work.lead));
    var items = T.cases.map(function (c) { return [c.id, c.title]; }).concat(T.micro ? [[T.micro.id, T.micro.title]] : []);
    var nav = h('ol', 'ngo-work-nav', { 'data-n': String(items.length) });
    items.forEach(function (c, i) {
      var li = h('li', 'ngo-work-nav-item ngo-work-nav-item--' + c[0]);
      var a = h('a', null, { href: '#case-' + c[0] });
      a.appendChild(text('span', 'ngo-work-num', String(i + 1)));
      a.appendChild(text('span', 'ngo-work-name', String(c[1]).replace(/\*/g, '')));
      li.appendChild(a); nav.appendChild(li);
    });
    wrap.appendChild(nav);
    sec.appendChild(wrap);
    return sec;
  }
  function meta(T, n, total, kind, org) {
    var m = h('div', 'ngo-case-meta');
    m.appendChild(text('span', 'ngo-case-count', n + ' ' + T.work.of + ' ' + total));
    m.appendChild(text('span', 'ngo-case-kind', kind));
    m.appendChild(text('span', 'ngo-case-org', org));
    return m;
  }
  function head(N, T, c, titleId, n, total, kind) {
    var hd = h('div', 'ngo-case-head');
    var titles = h('div', 'ngo-case-titles');
    titles.appendChild(meta(T, n, total, kind, c.tag));
    titles.appendChild(rich('h3', 'ngo-h2', c.title, { id: titleId }));
    hd.appendChild(titles);
    var sp = spot(N.spots && N.spots[c.id]);
    if (sp) hd.appendChild(sp);
    return hd;
  }

  function caseBlock(N, T, c, n, total) {
    var sec = h('article', 'ngo-case ngo-case--' + c.id, { id: 'case-' + c.id, 'aria-labelledby': 'case-' + c.id + '-title' });
    var wrap = h('div', 'vh-wrap');
    wrap.appendChild(head(N, T, c, 'case-' + c.id + '-title', n, total, c.kind || T.work.real));
    var grid = h('div', 'ngo-case-grid');
    var story = h('div', 'ngo-story');
    var ba = h('div', 'ngo-ba');
    var before = h('div', 'ngo-ba-item ngo-ba-item--before');
    var bl = h('p', 'ngo-ba-label'); bl.appendChild(icon('M4 4l8 8M12 4l-8 8')); bl.appendChild(text('span', null, T.labels.problem));
    before.appendChild(bl); before.appendChild(text('p', null, c.problem));
    var after = h('div', 'ngo-ba-item ngo-ba-item--after');
    var al = h('p', 'ngo-ba-label'); al.appendChild(icon('M3.5 8.4 6.6 11.5 12.5 5')); al.appendChild(text('span', null, T.labels.did));
    after.appendChild(al); after.appendChild(text('p', null, c.did));
    ba.appendChild(before); ba.appendChild(after);
    story.appendChild(ba);
    var res = h('p', 'ngo-result');
    res.appendChild(text('span', 'ngo-result-label', T.labels.result));
    res.appendChild(doc.createTextNode(c.result));
    story.appendChild(res);
    grid.appendChild(story);
    grid.appendChild(stage(N, T, c.shots, c.demos || [[c.demo, T.labels.tryDemo]], c.note));
    wrap.appendChild(grid);
    sec.appendChild(wrap);
    return sec;
  }

  /* microgrants: what the competition is, then pain points grouped by stage, each with the tool's answer */
  function micro(N, T, n, total) {
    var m = T.micro;
    var sec = h('article', 'ngo-case ngo-case--microgrants ngo-micro', { id: 'case-' + m.id, 'aria-labelledby': 'case-' + m.id + '-title' });
    var wrap = h('div', 'vh-wrap');
    var hd = head(N, T, m, 'case-' + m.id + '-title', n, total, T.work.fresh);
    var intro = h('div', 'ngo-micro-intro');
    intro.appendChild(text('p', 'ngo-lead', m.lead));
    intro.appendChild(text('p', 'ngo-note', m.note));
    hd.querySelector('.ngo-case-titles').appendChild(intro);
    wrap.appendChild(hd);

    var a = h('div', 'ngo-story');
    a.appendChild(text('h4', 'ngo-h3 ngo-map-title', m.painsTitle));
    var map = h('ul', 'ngo-map');
    m.pains.forEach(function (p) {
      var li = h('li', 'ngo-pain');
      li.appendChild(text('span', 'ngo-pain-stage', p[0]));
      li.appendChild(text('p', 'ngo-pain-text', p[1]));
      li.appendChild(text('p', 'ngo-map-tool', p[2]));
      map.appendChild(li);
    });
    a.appendChild(map);
    wrap.appendChild(a);
    wrap.appendChild(stage(N, T, m.shots, m.demos));
    sec.appendChild(wrap);
    return sec;
  }

  /* the same sections for every page that has a content object: non-profit (VI_AI_NGO) and
     business assistants on /ai/erp/ (VI_AI_BIZ, next/ai/biz/content.js) */
  function sections(N, lang) {
    if (!N) return [];
    var T = N[lang] || N.en;
    var total = T.cases.length + (T.micro ? 1 : 0);
    var out = [how(N, T), workHead(T, total)]
      .concat(T.cases.map(function (c, i) { return caseBlock(N, T, c, i + 1, total); }));
    if (T.micro) out.push(micro(N, T, total, total));
    return out;
  }
  window.VIPageExtra = window.VIPageExtra || {};
  /* the "how it works" band is shared with the AI overview on / and the design-team page /ai/it/ */
  window.VIPageParts = { how: how };
  window.VIPageExtra.nonprofit = function (lang) { return sections(window.VI_AI_NGO, lang); };
  window.VIPageExtra.erp = function (lang) { return sections(window.VI_AI_BIZ, lang); };
})();
