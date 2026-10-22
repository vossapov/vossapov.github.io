/* Detail pages /ai/<slug>/ — rendered from window.VI_AI and body[data-ai-page]. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var COPY = window.VI_AI;
  var SLUGS = ['erp', 'nonprofit', 'personal', 'it'];
  var body = doc.body;
  var main = doc.getElementById('aiMain');
  var slug = body ? body.getAttribute('data-ai-page') : null;
  if (!COPY || !main || SLUGS.indexOf(slug) < 0) return;

  var AUD = (COPY.audiences && COPY.audiences.length ? COPY.audiences : SLUGS).filter(function (s) {
    return SLUGS.indexOf(s) > -1;
  });
  var store = {
    get: function () { try { return window.localStorage.getItem('vi-next-lang'); } catch (e) { return null; } },
    set: function (v) { try { window.localStorage.setItem('vi-next-lang', v); } catch (e) { /* unavailable */ } }
  };
  var state = { lang: readLang() };

  /* ───────── helpers ───────── */
  function $(s) { return doc.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); }
  function h(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function svgEl(d, size) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = doc.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = doc.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }
  function arrowLeft() { return svgEl('M11.5 3.6 7.1 8l4.4 4.4', 16); }
  function arrowRight() { return svgEl('M2.5 8h10M8.7 4.2 12.5 8l-3.8 3.8', 16); }
  function setText(n, s) { if (s && n.textContent !== s) n.textContent = s; }
  /* "*phrase*" in copy → <mark class="hl">phrase</mark>; everything else stays plain text */
  function setRich(n, s) {
    if (!s) return;
    n.textContent = '';
    String(s).split('*').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var m = doc.createElement('mark'); m.className = 'hl'; m.textContent = part; n.appendChild(m); }
      else n.appendChild(doc.createTextNode(part));
    });
  }
  window.VIRich = setRich;
  function artUrl(path, size) { return path + (size === 480 ? '-480.webp' : '.webp'); }
  function imgEl(path, size, priority) {
    var im = doc.createElement('img');
    im.setAttribute('src', artUrl(path, size));
    im.setAttribute('width', String(size));
    im.setAttribute('height', String(size));
    im.setAttribute('alt', '');
    if (priority) { im.setAttribute('fetchpriority', 'high'); im.setAttribute('decoding', 'async'); }
    else { im.setAttribute('loading', 'lazy'); im.setAttribute('decoding', 'async'); }
    /* art still being produced: never show a broken-image box */
    im.addEventListener('error', function () { im.hidden = true; });
    return im;
  }
  function readLang() {
    var p = new URLSearchParams(window.location.search).get('lang');
    if (p === 'ua' || p === 'en') return p;
    return store.get() === 'ua' ? 'ua' : 'en';
  }
  function T() { return COPY[state.lang] || COPY.en; }
  function pageUrl(s) { return '/ai/' + s + '/' + (state.lang === 'ua' ? '?lang=ua' : ''); }
  function branchUrl() {
    var home = window.VI_SITES ? window.VI_SITES.aiHome() : '/ai/';
    return home + (state.lang === 'ua' ? '?lang=ua' : '');
  }

  /* ───────── blocks ───────── */
  function contactBlock() {
    var t = T(), C = COPY.contacts || {};
    var c = t.contact;
    if (!c) return null;
    var sec = h('section', 'vh-contact', { 'aria-labelledby': 'aiContactTitle' });
    var wrap = h('div', 'vh-wrap vh-contact-plain');
    var copy = h('div', 'vh-contact-copy');
    var head = h('h2', null, { id: 'aiContactTitle' });
    setText(head, c.title);
    copy.appendChild(head);
    if (C.telegram) {
      var cta = h('a', 'vh-pill vh-pill--primary', { href: C.telegram, target: '_blank', rel: 'noopener' });
      var label = h('span');
      setText(label, c.cta);
      cta.appendChild(label);
      cta.appendChild(arrowRight());
      copy.appendChild(cta);
    }
    var quiet = h('p', 'vh-quiet');
    if (C.email) {
      var em = h('a', null, { href: C.email });
      setText(em, c.email);
      quiet.appendChild(em);
    }
    if (C.linkedin) {
      var ln = h('a', null, { href: C.linkedin, target: '_blank', rel: 'noopener' });
      setText(ln, 'LinkedIn');
      quiet.appendChild(ln);
    }
    copy.appendChild(quiet);
    wrap.appendChild(copy);
    sec.appendChild(wrap);
    return sec;
  }

  function render() {
    var t = T();
    var aud = t.aud && t.aud[slug];
    if (!aud) return;

    main.innerHTML = '';

    /* 1 + 2 — back link and hero: the drawing, the promise, then the paragraph */
    var hero = h('section', 'ai-hero');
    var heroWrap = h('div', 'vh-wrap');
    hero.appendChild(heroWrap);
    var back = h('a', 'ai-back', { href: branchUrl() + '#aud-' + slug });
    back.appendChild(arrowLeft());
    var backLabel = h('span');
    setText(backLabel, t.back);
    back.appendChild(backLabel);
    heroWrap.appendChild(back);

    var figId = COPY.figures && COPY.figures[slug];
    var useFigure = !!(figId && window.VIAnatomy);
    var grid = h('div', 'ai-hero-grid');
    var art = h('figure', 'ai-hero-art' + (useFigure ? ' ai-hero-art--figure' : ''));
    if (useFigure) window.VIAnatomy.mount(art, slug);
    grid.appendChild(art);
    var copy = h('div', 'ai-hero-copy');
    /* a page whose promise does not name its audience shows the audience title above it (design teams) */
    if (aud.kicker) {
      var kicker = h('p', 'ai-kicker');
      setText(kicker, aud.title);
      copy.appendChild(kicker);
    }
    var h1 = h('h1', null, { id: 'aiTitle', tabindex: '-1' });
    setRich(h1, aud.hero);
    copy.appendChild(h1);
    var lead = h('p', 'ai-hero-lead');
    setText(lead, aud.lead || aud.line);
    copy.appendChild(lead);
    /* pages with cases and demos (non-profit, business assistants) or project proof (design teams): content object per slug */
    var RICH = { nonprofit: window.VI_AI_NGO, erp: window.VI_AI_BIZ, it: window.VI_AI_IT }[slug];
    var ngoT = RICH && (RICH[state.lang] || RICH.en);
    if (ngoT && ngoT.labels && ngoT.labels.heroCta) {
      var cta = h('div', 'ai-hero-cta');
      [[ngoT.labels.heroCtaHref || '#case-membership', ngoT.labels.heroCta], ['#ngoHowTitle', ngoT.labels.heroCta2]].forEach(function (c) {
        var a = h('a', 'vh-pill', { href: c[0] });
        var sp = h('span'); setText(sp, c[1]); a.appendChild(sp); a.appendChild(arrowRight());
        cta.appendChild(a);
      });
      copy.appendChild(cta);
    }
    grid.appendChild(copy);
    heroWrap.appendChild(grid);
    main.appendChild(hero);

    /* 3 — what the company gets, as plain points */
    if (aud.bullets && aud.bullets.length) {
      var got = h('section', 'ai-got', { 'aria-labelledby': 'aiGotTitle' });
      var gotWrap = h('div', 'vh-wrap');
      var gotHead = h('h2', 'ai-got-title', { id: 'aiGotTitle', tabindex: '-1' });
      setText(gotHead, t.benefits || t.how);
      gotWrap.appendChild(gotHead);
      var list = h('ul', 'vh-points vh-points--wide');
      aud.bullets.forEach(function (point) {
        var li = h('li');
        setText(li, point);
        list.appendChild(li);
      });
      gotWrap.appendChild(list);
      var ctxSpot = RICH && RICH.spots && RICH.spots.context;
      if (ctxSpot) {
        var sfig = h('figure', 'ngo-spot', { 'aria-hidden': 'true' });
        var simg = h('img', null, { src: ctxSpot, alt: '', width: '600', height: '600', loading: 'lazy', decoding: 'async' });
        simg.addEventListener('error', function () { sfig.hidden = true; });
        sfig.appendChild(simg);
        gotWrap.appendChild(sfig);
      }
      got.appendChild(gotWrap);
      main.appendChild(got);
    }

    /* 3b — a QA subsection with its own drawing (IT page: the night-shift loop) */
    var qa = aud.qa;
    if (qa && COPY.figures && COPY.figures[slug + '.qa'] && window.VIAnatomy) {
      var qaSec = h('section', 'ai-qa', { 'aria-labelledby': 'aiQaTitle' });
      var qaWrap = h('div', 'vh-wrap');
      var qaGrid = h('div', 'ai-qa-grid');
      var qaArt = h('figure', 'ai-qa-art ai-hero-art--figure');
      window.VIAnatomy.mount(qaArt, slug + '.qa');
      qaGrid.appendChild(qaArt);
      var qaCopy = h('div', 'ai-qa-copy');
      var qaHead = h('h2', 'ai-qa-title', { id: 'aiQaTitle', tabindex: '-1' });
      setText(qaHead, qa.title);
      qaCopy.appendChild(qaHead);
      var qaLead = h('p', 'ai-hero-lead');
      setText(qaLead, qa.lead);
      qaCopy.appendChild(qaLead);
      qaGrid.appendChild(qaCopy);
      qaWrap.appendChild(qaGrid);
      qaSec.appendChild(qaWrap);
      main.appendChild(qaSec);
    }

    /* 3c — page-specific sections (non-profit and business: how it works, cases, demos — next/ai/ngo/ngo.js) */
    var extra = window.VIPageExtra && window.VIPageExtra[slug];
    if (extra) extra(state.lang).forEach(function (n) { main.appendChild(n); });

    /* 4 — contact */
    var contact = contactBlock();
    if (contact) main.appendChild(contact);

    /* 5 — the other three directions */
    var others = AUD.filter(function (s) { return s !== slug; });
    if (others.length) {
      var sec = h('section', 'ai-others', { 'aria-labelledby': 'aiOthersTitle' });
      var wrap = h('div', 'vh-wrap');
      var head = h('h2', 'ai-others-title', { id: 'aiOthersTitle' });
      setText(head, t.others || t.back);
      wrap.appendChild(head);
      var box = h('div', 'ai-others-grid');
      others.forEach(function (s) {
        var other = t.aud && t.aud[s];
        if (!other) return;
        var link = h('a', 'ai-other', { href: pageUrl(s), 'data-key': 'other:' + s });
        var label = h('span');
        setText(label, other.btn);
        link.appendChild(label);
        box.appendChild(link);
      });
      wrap.appendChild(box);
      sec.appendChild(wrap);
      main.appendChild(sec);
    }
  }

  /* ───────── shell (language, title, links) ───────── */
  function syncShell() {
    var t = T();
    root.lang = state.lang === 'ua' ? 'uk' : 'en';
    root.setAttribute('data-lang', state.lang);
    var aud = t.aud && t.aud[slug];
    doc.title = (aud ? aud.title : t.name) + ' — Valentyn Ihnatov';
    $$('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === state.lang));
    });
    var seg = $('.lang-seg');
    if (seg && t.lang) seg.setAttribute('aria-label', t.lang);
    var brand = $('.brand');
    if (brand) brand.setAttribute('href', branchUrl());
    var foot = doc.getElementById('aiFootBack');
    if (foot) { foot.setAttribute('href', branchUrl()); setText(foot, t.back); }
  }
  function syncUrl() {
    var u = new URLSearchParams(window.location.search);
    if (state.lang === 'ua') u.set('lang', 'ua'); else u.delete('lang');
    var qs = u.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    } catch (e) { /* sandboxed */ }
  }

  doc.addEventListener('click', function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('[data-set-lang]') : null;
    if (!btn) return;
    var v = btn.getAttribute('data-set-lang');
    if ((v !== 'ua' && v !== 'en') || v === state.lang) return;
    state.lang = v;
    store.set(v);
    syncUrl();
    syncShell();
    render();
  });

  syncShell();
  render();
})();
