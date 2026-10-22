/* Branch fork and the light AI-automation branch on / (the hero above is the dark main-site hero). All copy comes from
   window.VI_AI (next/ai/content.js); the design branch is untouched existing markup. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var COPY = window.VI_AI;
  var PICK_KEYS = ['p', 'q', 'cat', 'co', 'view', 'y'];
  var HASH_RE = /^#(work|contact|ai-work|year-\d+)$/;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { branch: null };
  var lastLang = null;
  var aiRevealed = false;
  var designShown = false;

  /* ───────── helpers ───────── */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function h(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function svgEl(d, box) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = doc.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 ' + box + ' ' + box);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = doc.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    return s;
  }
  function arrowRight() { return svgEl('M2.5 8h10M8.7 4.2 12.5 8l-3.8 3.8', 16); }
  function setText(n, s) { if (s && n.textContent !== s) n.textContent = s; }
  /* "*phrase*" → <mark class="hl">phrase</mark>, same convention as page.js */
  function setRich(n, s) {
    if (!s) return;
    n.textContent = '';
    String(s).split('*').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var m = doc.createElement('mark'); m.className = 'hl'; m.textContent = part; n.appendChild(m); }
      else n.appendChild(doc.createTextNode(part));
    });
  }

  function lang() {
    var l = root.getAttribute('data-lang');
    if (l === 'en' || l === 'ua') return l;
    return /^uk/i.test(root.lang) ? 'ua' : 'en';
  }
  function T() { return COPY ? (COPY[lang()] || COPY.en) : null; }
  function byPath(key) {
    var t = T();
    if (!t || !key) return null;
    var cur = t, parts = key.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || typeof cur !== 'object' || cur[parts[i]] === undefined) return null;
      cur = cur[parts[i]];
    }
    return typeof cur === 'string' ? cur : null;
  }
  function params() { return new URLSearchParams(window.location.search); }
  function pickParam(search, key) {
    try { return new URLSearchParams(search).get(key); } catch (e) { return null; }
  }
  /* app.js rewrites the address bar from its own state on load — it drops every param it does not
     own (?p=, ?q=, ?art=…) and, depending on which task runs first, it may already have done so
     before we run. The navigation entry keeps the URL the visitor actually opened; use it for the
     initial decision only (later navigations must read the live URL). */
  function openedUrl() {
    try {
      var nav = window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation');
      if (nav && nav[0] && nav[0].name) return nav[0].name;
    } catch (e) { /* ignore */ }
    return window.location.href;
  }
  function searchOf(url) {
    var q = url.split('#')[0].split('?')[1];
    return q ? '?' + q : '';
  }
  function hashOf(url) {
    var i = url.indexOf('#');
    return i > -1 ? url.slice(i) : '';
  }
  function artUrl(path, size) { return path + (size === 480 ? '-480.webp' : '.webp'); }
  function imgEl(path, size, alt, priority) {
    var im = doc.createElement('img');
    im.setAttribute('src', artUrl(path, size));
    im.setAttribute('width', String(size));
    im.setAttribute('height', String(size));
    im.setAttribute('alt', alt || '');
    if (priority) im.setAttribute('fetchpriority', 'high');
    else { im.setAttribute('loading', 'lazy'); im.setAttribute('decoding', 'async'); }
    im.addEventListener('error', function () { im.hidden = true; });
    return im;
  }
  function pageUrl(slug) { return '/ai/' + slug + '/' + (lang() === 'ua' ? '?lang=ua' : ''); }

  /* ───────── URL ↔ branch ───────── */
  function branchFrom(search, hash) {
    var v = pickParam(search, 'b');
    if (v === 'design' || v === 'ai') return v;
    for (var i = 0; i < PICK_KEYS.length; i++) { if (pickParam(search, PICK_KEYS[i])) return 'design'; }
    return HASH_RE.test(hash) ? 'design' : null;
  }
  function writeUrl(branch, mode) {
    var u = params();
    if (branch) u.set('b', branch); else u.delete('b');
    var qs = u.toString();
    var next = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    if (next === window.location.pathname + window.location.search + window.location.hash) return;
    try { window.history[mode](null, '', next); } catch (e) { /* sandboxed */ }
  }

  /* ───────── branch visibility ───────── */
  function branchStart(branch) {
    if (branch === 'design') return doc.getElementById('work') || doc.getElementById('branch-design');
    return doc.getElementById('vhAiTitle') || doc.getElementById('branch-ai');
  }
  function setBranch(branch, opts) {
    opts = opts || {};
    state.branch = branch;
    var design = doc.getElementById('branch-design');
    var ai = doc.getElementById('branch-ai');
    if (design) design.hidden = branch !== 'design';
    if (ai) ai.hidden = branch !== 'ai';
    /* the page frame (header, hero, fork, footer) is always dark; only #branch-ai is light */
    if (doc.body) {
      doc.body.classList.remove('vh-light');
      doc.body.classList.add('vh-dark');
    }
    /* the two illustrated choices are toggles; header and hero links only mark the open branch */
    $$('[data-branch-pick]').forEach(function (c) {
      var on = c.getAttribute('data-branch-pick') === branch;
      if (c.classList.contains('vh-choice')) c.setAttribute('aria-pressed', String(on));
      else if (on) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
    /* one contact link in the header: the open branch's own contact block */
    var contact = $('[data-nav-contact]');
    if (contact) contact.setAttribute('href', branch === 'ai' ? '#ai-contact' : '#contact');
    syncTitle();
    if (branch === 'design' && !designShown) {
      designShown = true;
      /* the atlas laid out while hidden — let it measure again */
      window.dispatchEvent(new Event('resize'));
      requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
    }
    if (branch === 'ai' && opts.animate !== false) revealAi();
  }
  function revealAi() {
    var ai = doc.getElementById('branch-ai');
    if (!ai || aiRevealed || reduce) return;
    aiRevealed = true;
    ai.classList.add('vh-anim');
    setTimeout(function () { ai.classList.remove('vh-anim'); }, 1600);
  }
  function focusBranch(branch) {
    var el = branchStart(branch);
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { /* ignore */ } }
    requestAnimationFrame(function () {
      try { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
      catch (e) { el.scrollIntoView(); }
    });
  }

  /* ───────── AI branch markup ───────── */
  if (!window.VIRich) window.VIRich = setRich; /* ngo.js highlights through it */
  function plain(s) { return String(s || '').replace(/\*/g, ''); }
  function pill(href, label, cls, key, external) {
    var a = h('a', 'vh-pill' + (cls ? ' ' + cls : ''), { href: href, 'data-key': key });
    if (external) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
    var sp = h('span');
    setText(sp, label);
    a.appendChild(sp);
    a.appendChild(arrowRight());
    return a;
  }
  function richOf(slug) {
    var N = { erp: window.VI_AI_BIZ, nonprofit: window.VI_AI_NGO }[slug];
    return N ? { N: N, T: N[lang()] || N.en } : null;
  }
  /* a real case from the business / non-profit content: framed first screenshot, organisation, title, result */
  function caseCard(slug, id, ov) {
    var R = richOf(slug);
    if (!R) return null;
    var c = null;
    (R.T.cases || []).forEach(function (x) { if (x.id === id) c = x; });
    if (!c && R.T.micro && R.T.micro.id === id) c = R.T.micro;
    if (!c || !c.shots || !c.shots.length) return null;
    var s0 = c.shots[0];
    var a = h('a', 'vh-ov-case vh-ov-case--' + s0.frame, { href: pageUrl(slug) + '#case-' + id, 'data-key': 'case:' + id });
    var fig = h('span', 'vh-ov-case-shot ngo-shot ngo-shot--' + s0.frame);
    var im = h('img', null, { src: R.N.shots[s0.key], alt: '', loading: 'lazy', decoding: 'async' });
    if (s0.frame === 'phone') { im.setAttribute('width', '390'); im.setAttribute('height', '844'); }
    else { im.setAttribute('width', '1440'); im.setAttribute('height', '900'); }
    im.addEventListener('error', function () { fig.hidden = true; });
    fig.appendChild(im);
    a.appendChild(fig);
    var body = h('span', 'vh-ov-case-body');
    var org = h('span', 'vh-ov-case-org'); setText(org, c.tag); body.appendChild(org);
    var title = h('span', 'vh-ov-case-title'); setText(title, plain(c.title)); body.appendChild(title);
    var res = h('span', 'vh-ov-case-text'); setText(res, c.result || c.note); body.appendChild(res);
    var go = h('span', 'vh-ov-case-go'); setText(go, ov.openCase); go.appendChild(arrowRight()); body.appendChild(go);
    a.appendChild(body);
    return a;
  }
  /* a real design project from "AI in my process" (next/ai-content.js): image, the counted figure, case link */
  function designCard(key, ov) {
    var D = window.VI_AI_COPY && (window.VI_AI_COPY[lang()] || window.VI_AI_COPY.en);
    var p = null;
    (D && D.proof || []).forEach(function (x) { if (x.key === key) p = x; });
    if (!p) return null;
    var caseHref = '/next/case.html?id=' + encodeURIComponent(p.case) + '&lang=' + lang();
    var a = h('a', 'vh-ov-case vh-ov-case--project', { href: window.VI_SITES ? window.VI_SITES.portfolio(caseHref) : caseHref, 'data-key': 'project:' + key });
    var fig = h('span', 'vh-ov-case-shot vh-ov-project-shot' + (p.fit === 'contain' ? ' is-contain' : ''));
    /* the web-sized WebP from next/webp-map.js, not the multi-MB master (same rule as experience.js) */
    var webp = window.VI_WEBP && window.VI_WEBP[p.img];
    var im = h('img', null, { src: webp && webp[0] || p.img, alt: '', loading: 'lazy', decoding: 'async' });
    im.addEventListener('error', function () { fig.hidden = true; });
    fig.appendChild(im);
    a.appendChild(fig);
    var body = h('span', 'vh-ov-case-body');
    var org = h('span', 'vh-ov-case-org'); setText(org, p.meta); body.appendChild(org);
    var title = h('span', 'vh-ov-case-title'); setText(title, p.title); body.appendChild(title);
    if (p.figure) {
      var num = h('span', 'vh-ov-case-figure');
      var b = h('b'); setText(b, p.figure.value); num.appendChild(b);
      var l = h('span'); setText(l, p.figure.label); num.appendChild(l);
      body.appendChild(num);
    }
    var go = h('span', 'vh-ov-case-go'); setText(go, ov.openCase); go.appendChild(arrowRight()); body.appendChild(go);
    a.appendChild(body);
    return a;
  }

  function renderAi() {
    var box = doc.getElementById('branch-ai');
    var t = T();
    if (!box || !t || !COPY.art) return;
    var C = COPY.contacts || {};
    var AUD = COPY.audiences || [];
    var ov = t.ov || {};

    /* keep focus if the visitor is switching language while tabbed into the branch */
    var active = doc.activeElement, key = null;
    if (active && box.contains(active)) key = active.id || active.getAttribute('data-key');

    box.innerHTML = '';

    /* 1 — the shared proposition: one promise, one paragraph, the next action */
    var top = h('section', 'vh-ov-hero', { 'aria-labelledby': 'vhAiTitle' });
    var topWrap = h('div', 'vh-wrap');
    var topHead = h('h2', 'ngo-h2 vh-ov-title', { id: 'vhAiTitle', tabindex: '-1' });
    setRich(topHead, ov.hero);
    topWrap.appendChild(topHead);
    var topLead = h('p', 'ngo-lead vh-ov-lead');
    setText(topLead, ov.lead);
    topWrap.appendChild(topLead);
    if (C.telegram && ov.cta) {
      var topCta = h('div', 'ai-hero-cta');
      topCta.appendChild(pill(C.telegram, ov.cta, 'ngo-pill--primary', 'top:cta', true));
      topWrap.appendChild(topCta);
    }
    top.appendChild(topWrap);
    box.appendChild(top);

    /* 2 — four audiences, each its own colour (same tones as the case fields on the rich pages) */
    var forSec = h('section', 'vh-for', { 'aria-labelledby': 'vhForWhom' });
    var forWrap = h('div', 'vh-wrap');
    var forHead = h('h2', 'ngo-h2 vh-ov-h2', { id: 'vhForWhom', tabindex: '-1' });
    setText(forHead, t.forWhom);
    forWrap.appendChild(forHead);
    if (ov.forLead) {
      var forLead = h('p', 'ngo-lead');
      setText(forLead, ov.forLead);
      forWrap.appendChild(forLead);
    }
    var grid = h('ol', 'vh-for-grid vh-ov-nav');
    AUD.forEach(function (slug) {
      var aud = t.aud && t.aud[slug];
      if (!aud) return;
      var li = h('li', 'vh-ov-tone--' + slug);
      var a = h('a', 'vh-for-btn', { href: '#aud-' + slug, 'data-key': 'for:' + slug });
      var label = h('span', 'vh-for-label');
      setText(label, aud.btn);
      a.appendChild(label);
      li.appendChild(a);
      grid.appendChild(li);
    });
    forWrap.appendChild(grid);
    forSec.appendChild(forWrap);
    box.appendChild(forSec);

    /* 3 — how it works, the same principle for every audience (shared band from next/ai/ngo/ngo.js) */
    var art = window.VI_AI_BIZ && window.VI_AI_BIZ.how;
    if (ov.how && window.VIPageParts && window.VIPageParts.how) {
      var howSec = window.VIPageParts.how({ how: art }, { how: ov.how });
      howSec.classList.add('vh-ov-how');
      box.appendChild(howSec);
    }

    /* 4 — per audience: a clean half/half field — the drawing on one side, all the copy on the
       other. Sides alternate down the page. The drawing fades in once and blends with the tint. */
    var fadeEls = [];
    AUD.forEach(function (slug, idx) {
      var aud = t.aud && t.aud[slug];
      if (!aud) return;
      var sec = h('section', 'vh-aud vh-ov-aud vh-ov-tone--' + slug + ' vh-aud--' + slug, { id: 'aud-' + slug, 'aria-labelledby': 'aud-' + slug + '-title', 'data-ov-idx': String(idx) });
      var panel = h('div', 'vh-wrap vh-ov-panel');

      var row = h('div', 'vh-aud-grid vh-ov-grid');
      var figId = COPY.figures && COPY.figures[slug];
      var fig = h('figure', 'vh-aud-art vh-ov-art' + (figId && window.VIAnatomy ? ' vh-aud-art--figure' : ''));
      if (figId && window.VIAnatomy) window.VIAnatomy.mount(fig, slug);
      row.appendChild(fig);
      fadeEls.push(fig);

      var copy = h('div', 'vh-aud-copy vh-ov-copy');
      var meta = h('p', 'ngo-case-meta');
      var count = h('span', 'ngo-case-count');
      setText(count, (idx + 1) + ' ' + (ov.of || '/') + ' ' + AUD.length);
      meta.appendChild(count);
      copy.appendChild(meta);
      var h3 = h('h3', 'ngo-h2 vh-ov-aud-title', { id: 'aud-' + slug + '-title', tabindex: '-1' });
      setText(h3, aud.title);
      copy.appendChild(h3);
      var promise = h('p', 'vh-ov-promise');
      setRich(promise, aud.hero);
      copy.appendChild(promise);
      var lead = h('p', 'vh-aud-lead');
      setText(lead, aud.lead || aud.line);
      copy.appendChild(lead);
      if (aud.bullets && aud.bullets.length) {
        var tl = h('h4', 'vh-ov-label');
        setText(tl, ov.tasks);
        copy.appendChild(tl);
        var ul = h('ul', 'vh-points');
        aud.bullets.forEach(function (point) {
          var li = h('li');
          setText(li, point);
          ul.appendChild(li);
        });
        copy.appendChild(ul);
      }
      copy.appendChild(pill(pageUrl(slug), ov.more || t.how, 'ngo-pill--primary vh-ov-more', 'pill:' + slug));
      row.appendChild(copy);
      panel.appendChild(row);

      sec.appendChild(panel);
      box.appendChild(sec);
    });

    /* fade the drawings in as they enter the viewport (once each); respect reduced motion */
    if (fadeEls.length) {
      if (reduce || !window.IntersectionObserver) {
        fadeEls.forEach(function (el) { el.classList.add('is-in'); });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
          });
        }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
        fadeEls.forEach(function (el) { io.observe(el); });
      }
    }

    var c = t.contact;
    if (c) {
      var csec = h('section', 'vh-contact', { id: 'ai-contact', 'aria-labelledby': 'vhContactTitle' });
      var cwrap = h('div', 'vh-wrap vh-contact-plain');
      var cc = h('div', 'vh-contact-copy');
      var ch = h('h2', null, { id: 'vhContactTitle', tabindex: '-1' });
      setText(ch, c.title);
      cc.appendChild(ch);
      if (C.telegram) {
        var cta = h('a', 'vh-pill vh-pill--primary', { href: C.telegram, target: '_blank', rel: 'noopener', 'data-key': 'contact:cta' });
        var ctal = h('span');
        setText(ctal, c.cta);
        cta.appendChild(ctal);
        cta.appendChild(arrowRight());
        cc.appendChild(cta);
      }
      var quiet = h('p', 'vh-quiet');
      if (C.email) {
        var em = h('a', null, { href: C.email, 'data-key': 'contact:email' });
        setText(em, c.email);
        quiet.appendChild(em);
      }
      if (C.linkedin) {
        var ln = h('a', null, { href: C.linkedin, target: '_blank', rel: 'noopener', 'data-key': 'contact:linkedin' });
        setText(ln, 'LinkedIn');
        quiet.appendChild(ln);
      }
      cc.appendChild(quiet);
      cwrap.appendChild(cc);
      csec.appendChild(cwrap);
      box.appendChild(csec);
    }

    if (key) {
      var again = doc.getElementById(key) || box.querySelector('[data-key="' + key + '"]');
      if (again) { try { again.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
  }

  /* ───────── shared light copy ───────── */
  function fillStatic() {
    $$('[data-ai]').forEach(function (el) {
      var v = byPath(el.getAttribute('data-ai'));
      if (v) setText(el, v);
    });
    $$('[data-ai-alt]').forEach(function (el) {
      var v = byPath(el.getAttribute('data-ai-alt'));
      if (v) el.setAttribute('alt', v);
    });
  }
  function syncIntroArt() {
    var im = doc.getElementById('vhIntroArt');
    if (!im || !COPY.art) return;
    var path = pickParam(searchOf(openedUrl()), 'art') === 'abstract' ? COPY.art.introAbstract : COPY.art.introMe;
    if (path && im.getAttribute('src') !== artUrl(path, 960)) im.setAttribute('src', artUrl(path, 960));
  }
  function syncBrand() {
    var brand = $('.brand');
    if (brand) brand.setAttribute('href', lang() === 'ua' ? '/?lang=ua' : '/');
  }
  function syncTitle() {
    if (state.branch === 'design') return; /* the design branch keeps app.js's title */
    var t = T();
    if (t && t.pageTitle) doc.title = t.pageTitle;
  }

  /* ───────── wiring ───────── */
  /* standalone automation home (/ai/ locally, / on sab-ai.com.ua): no fork, no design branch,
     the page owns language switching (app.js is not loaded there) */
  function standaloneLang() {
    var p = pickParam(searchOf(openedUrl()), 'lang');
    if (p === 'ua' || p === 'en') return p;
    try { return window.localStorage.getItem('vi-next-lang') === 'ua' ? 'ua' : 'en'; } catch (e) { return 'en'; }
  }
  function applyStandaloneLang(l) {
    root.lang = l === 'ua' ? 'uk' : 'en';
    root.setAttribute('data-lang', l);
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === l)); });
    var t = T();
    if (t && t.siteTitle) doc.title = t.siteTitle;
    var seg = $('.lang-seg');
    if (t && t.lang && seg) seg.setAttribute('aria-label', t.lang);
    $$('[data-portfolio-link]').forEach(function (a) {
      a.setAttribute('href', (window.VI_SITES ? window.VI_SITES.portfolio('/') : '/') + (l === 'ua' ? '?lang=ua' : ''));
      if (t && t.portfolio) setText(a.querySelector('span') || a, t.portfolio);
    });
    var brand = $('.brand');
    if (brand) brand.setAttribute('href', (window.VI_SITES ? window.VI_SITES.aiHome() : '/ai/') + (l === 'ua' ? '?lang=ua' : ''));
  }
  function initStandalone(box) {
    var l = standaloneLang();
    applyStandaloneLang(l);
    renderAi();
    box.hidden = false;
    var bootHash = hashOf(openedUrl()) || window.location.hash;
    if (bootHash.length > 1) {
      var target = doc.getElementById(bootHash.slice(1));
      if (target && box.contains(target)) requestAnimationFrame(function () { target.scrollIntoView({ block: 'start' }); });
    }
    doc.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-set-lang]') : null;
      if (!btn) return;
      var v = btn.getAttribute('data-set-lang');
      if ((v !== 'ua' && v !== 'en') || v === lang()) return;
      try { window.localStorage.setItem('vi-next-lang', v); } catch (err) { /* unavailable */ }
      var u = params();
      if (v === 'ua') u.set('lang', 'ua'); else u.delete('lang');
      var qs = u.toString();
      try { window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash); } catch (err) { /* sandboxed */ }
      applyStandaloneLang(v);
      renderAi();
    });
    return true;
  }

  function init() {
    var box = doc.getElementById('branch-ai');
    if (!box || !doc.body || !COPY) return false;
    if (doc.body.hasAttribute('data-ai-home')) return initStandalone(box);

    var opened = openedUrl();
    state.branch = branchFrom(searchOf(opened) || window.location.search, hashOf(opened) || window.location.hash);
    renderAi();
    setBranch(state.branch, { animate: false });
    fillStatic();
    syncIntroArt();
    syncBrand();
    syncTitle();

    doc.addEventListener('click', function (e) {
      var t = e.target;
      var pick = t && t.closest ? t.closest('[data-branch-pick]') : null;
      if (!pick) return;
      var branch = pick.getAttribute('data-branch-pick');
      if (branch !== 'design' && branch !== 'ai') return;
      e.preventDefault();
      writeUrl(branch, 'pushState');
      setBranch(branch);
      focusBranch(branch);
    });

    window.addEventListener('popstate', function () {
      setBranch(branchFrom(window.location.search, window.location.hash), { animate: false });
    });

    /* a branch opened from the URL was hidden when the browser tried to jump to its hash */
    var designBox = doc.getElementById('branch-design');
    var bootHash = hashOf(opened) || window.location.hash;
    if (state.branch && bootHash.length > 1) {
      var target = doc.getElementById(bootHash.slice(1));
      if (target && ((designBox && designBox.contains(target)) || box.contains(target))) {
        requestAnimationFrame(function () { target.scrollIntoView({ block: 'start' }); });
      }
    }
    if (state.branch === 'ai') revealAi();

    lastLang = lang();
    new MutationObserver(function () {
      var l = lang();
      if (l === lastLang) return;
      lastLang = l;
      renderAi();
      fillStatic();
      syncIntroArt();
      syncBrand();
      syncTitle();
    }).observe(root, { attributes: true, attributeFilter: ['lang', 'data-lang'] });

    return true;
  }

  if (!init() && doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { init(); });
})();
