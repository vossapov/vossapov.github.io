/* Portfolio filters and AI section; the real WebGL hero lives in avatar.js. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var onLang = [];

  function lang() {
    var l = root.getAttribute('data-lang');
    if (l === 'en' || l === 'ua') return l;
    return /^uk/i.test(root.lang) ? 'ua' : 'en';
  }
  function h(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function setText(n, s) { if (n.textContent !== s) n.textContent = s; }

  /* ───────── AI section: phase swimlanes (me / AI agents) + proof strip ───────── */
  var IO_SVG = '<svg viewBox="0 0 44 30" aria-hidden="true" focusable="false">' +
    '<path class="vi-io-me" d="M12 3v23M7.5 21.5 12 26l4.5-4.5"/><path class="vi-io-ai" d="M32 27V4M27.5 8.5 32 4l4.5 4.5"/></svg>';
  var BACK_SVG = '<svg class="vi-cycle-back" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/></svg>';

  function initAI() {
    /* The "AI in my process" section (#ai-work) is hidden for now on the owner's request — we will
       rework it later. Skip building the section and its header/footer entry links entirely. */
    return;
    /* eslint-disable no-unreachable */
    var COPY = window.VI_AI_COPY;
    var contact = doc.getElementById('contact');
    if (!COPY || !COPY.en || !contact || doc.getElementById('ai-work')) return;
    function C() { return COPY[lang()] || COPY.en; }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var base = COPY.en, phaseCount = (base.phases || []).length;

    var sec = h('section', 'vi-ai', { id: 'ai-work', 'aria-labelledby': 'viAiTitle', tabindex: '-1' });
    sec.innerHTML =
      '<div class="wrap">' +
        '<header class="vi-ai-head">' +
          '<div class="vi-ai-heading">' +
            '<p class="eyebrow" data-vi="eyebrow"></p>' +
            '<h2 id="viAiTitle"><span data-vi="title"></span> <span class="vi-draft" data-vi="badge"></span></h2>' +
          '</div>' +
          '<div class="vi-ai-intro">' +
            '<p class="vi-ai-lede" data-vi="lede"></p>' +
            '<ul class="vi-legend"><li class="vi-k vi-k-me" data-lg="me"></li><li class="vi-k vi-k-ai" data-lg="ai"></li></ul>' +
          '</div>' +
        '</header>' +
        '<div class="vi-board">' +
          '<div class="vi-board-top">' +
            '<h3 class="vi-label" id="viMapLabel" data-vi="mapLabel"></h3>' +
            '<div class="vi-cycle-wrap">' +
              '<p class="vi-cycle-label" id="viCycleLabel" data-vi="cycleLabel"></p>' +
              '<ol class="vi-cycle" aria-labelledby="viCycleLabel"></ol>' +
            '</div>' +
          '</div>' +
          '<ol class="vi-lanes" aria-labelledby="viMapLabel"></ol>' +
        '</div>' +
        '<section class="vi-proof" aria-labelledby="viProofLabel">' +
          '<div class="vi-proof-head"><h3 class="vi-label" id="viProofLabel" data-vi="proofLabel"></h3><p class="vi-proof-hint" data-vi="proofHint"></p></div>' +
          '<ul class="vi-proof-list"></ul>' +
        '</section>' +
        '<div class="vi-ai-foot">' +
          '<div class="vi-principles"><h3 class="vi-label" data-vi="principlesLabel"></h3><ol></ol></div>' +
          '<div class="vi-tools"><h3 class="vi-label" data-vi="toolsLabel"></h3><ul class="vi-tool-list"></ul></div>' +
          '<p class="vi-ai-note" data-vi="note"></p>' +
        '</div>' +
      '</div>';
    contact.parentNode.insertBefore(sec, contact);
    var board = sec.querySelector('.vi-board');

    // Loop rail: the same four beats repeat inside every phase.
    var cycle = sec.querySelector('.vi-cycle'), beats = [];
    (base.cycle || []).forEach(function (b, i, all) {
      var li = h('li', 'is-' + b.who);
      li.innerHTML = '<span></span>' + (i === all.length - 1 ? BACK_SVG : '');
      cycle.appendChild(li); beats.push(li);
    });

    // Swimlanes: a decorative key column, then one list item per phase (head / me / brief-result / AI).
    var lanes = sec.querySelector('.vi-lanes'), phases = [];
    lanes.style.setProperty('--n', phaseCount);
    var key = h('li', 'vi-lane-key', { 'aria-hidden': 'true' });
    key.innerHTML = '<span class="vi-key-head"></span><span class="vi-key-me"></span><span class="vi-key-io"></span><span class="vi-key-ai"></span>';
    lanes.appendChild(key);
    for (var i = 0; i < phaseCount; i++) {
      var ph = h('li', 'vi-phase');
      ph.innerHTML =
        '<div class="vi-ph-head"><span class="vi-ph-n">' + pad(i + 1) + '</span><h4 class="vi-ph-t"></h4><ul class="vi-ph-proj"></ul></div>' +
        '<div class="vi-cell vi-cell-me"><span class="vi-cell-k"></span><p></p></div>' +
        '<div class="vi-io">' + IO_SVG + '</div>' +
        '<div class="vi-cell vi-cell-ai"><span class="vi-cell-k"></span><p></p></div>';
      lanes.appendChild(ph); phases.push(ph);
    }

    // Proof strip: real project visuals; each card marks the phases it used and highlights them above.
    var plist = sec.querySelector('.vi-proof-list'), cards = [];
    (base.proof || []).forEach(function (p) {
      var li = h('li', 'vi-proof-item vi-proof-' + p.key);
      var bars = '';
      for (var k = 1; k <= phaseCount; k++) bars += '<li' + (p.phases.indexOf(k) >= 0 ? ' class="is-on"' : '') + '>' + pad(k) + '</li>';
      var webp = window.VI_WEBP && window.VI_WEBP[p.img], src = webp ? webp[0] || p.img : p.img;
      li.innerHTML =
        '<div class="vi-proof-media' + (p.fit === 'contain' ? ' is-contain' : '') + '"><img src="' + src + '" alt="" loading="lazy" decoding="async"></div>' +
        '<div class="vi-proof-body">' +
          '<h4 class="vi-proof-t"></h4><p class="vi-proof-meta"></p>' +
          '<p class="vi-proof-fig"><b></b><span></span></p>' +
          '<dl class="vi-proof-rows">' +
            '<div class="vi-pr vi-pr-me"><dt data-pl="me"></dt><dd data-pf="me"></dd></div>' +
            '<div class="vi-pr vi-pr-ai"><dt data-pl="ai"></dt><dd data-pf="ai"></dd></div>' +
          '</dl>' +
          '<p class="vi-sr vi-proof-phases"></p>' +
          '<ol class="vi-proof-ph" aria-hidden="true">' + bars + '</ol>' +
          '<a class="vi-proof-link"></a>' +
        '</div>';
      plist.appendChild(li); cards.push(li);
      function on() {
        board.setAttribute('data-hl', '');
        phases.forEach(function (n, j) { n.classList.toggle('is-hl', p.phases.indexOf(j + 1) >= 0); });
      }
      function off() { board.removeAttribute('data-hl'); }
      li.addEventListener('mouseenter', on); li.addEventListener('mouseleave', off);
      li.addEventListener('focusin', on); li.addEventListener('focusout', off);
    });

    function render() {
      var c = C(), labels = c.labels || {}, keys = c.keys || {};
      sec.querySelectorAll('[data-vi]').forEach(function (n) { setText(n, c[n.getAttribute('data-vi')] || ''); });
      sec.querySelectorAll('[data-lg]').forEach(function (n) { setText(n, (c.legend || {})[n.getAttribute('data-lg')] || ''); });
      sec.querySelector('.vi-draft').hidden = c.draft === false;
      sec.classList.toggle('is-draft', c.draft !== false);

      beats.forEach(function (li, i) { setText(li.firstChild, ((c.cycle || [])[i] || base.cycle[i]).text); });

      setText(key.querySelector('.vi-key-me'), keys.me || '');
      setText(key.querySelector('.vi-key-ai'), keys.ai || '');
      setText(key.querySelector('.vi-key-io'), keys.io || '');
      phases.forEach(function (ph, i) {
        var s = (c.phases || [])[i] || base.phases[i];
        setText(ph.querySelector('.vi-ph-t'), s.title);
        fillList(ph.querySelector('.vi-ph-proj'), s.projects || []);
        setText(ph.querySelector('.vi-cell-me .vi-cell-k'), keys.me || '');
        setText(ph.querySelector('.vi-cell-me p'), s.me);
        setText(ph.querySelector('.vi-cell-ai .vi-cell-k'), keys.ai || '');
        setText(ph.querySelector('.vi-cell-ai p'), s.ai);
      });

      cards.forEach(function (li, i) {
        var p = (c.proof || [])[i] || base.proof[i], fig = p.figure || {};
        setText(li.querySelector('.vi-proof-t'), p.title);
        setText(li.querySelector('.vi-proof-meta'), p.meta || '');
        setText(li.querySelector('.vi-proof-fig b'), fig.value || '');
        setText(li.querySelector('.vi-proof-fig span'), fig.label || '');
        li.querySelector('.vi-proof-fig').hidden = !fig.value;
        li.querySelectorAll('[data-pl]').forEach(function (n) { setText(n, labels[n.getAttribute('data-pl')] || ''); });
        li.querySelectorAll('[data-pf]').forEach(function (n) { setText(n, p[n.getAttribute('data-pf')] || ''); });
        setText(li.querySelector('.vi-proof-phases'), (labels.phases || '') + ': ' + p.phases.map(function (k) {
          return ((c.phases || [])[k - 1] || base.phases[k - 1]).title;
        }).join(', '));
        var a = li.querySelector('.vi-proof-link');
        a.href = '/next/case.html?id=' + encodeURIComponent(p.case) + '&lang=' + lang();
        setText(a, p.link || '');
        a.setAttribute('aria-label', (p.link || '') + ': ' + p.title);
      });

      fillList(sec.querySelector('.vi-principles ol'), c.principles || []);
      fillList(sec.querySelector('.vi-tool-list'), c.tools || []);
      sec.querySelector('.vi-principles').hidden = !(c.principles || []).length;
      sec.querySelector('.vi-tools').hidden = !(c.tools || []).length;
      links(c);
    }
    function fillList(ul, items) {
      while (ul.children.length > items.length) ul.removeChild(ul.lastChild);
      items.forEach(function (s, i) { setText(ul.children[i] || ul.appendChild(h('li')), s); });
    }

    // Entry points: a short header link (hidden by CSS where the compact header has no room) + a footer link.
    var nav = doc.querySelector('.header-nav'), navA = null, footA = null;
    if (nav) {
      navA = h('a', 'vi-nav-ai', { href: '#ai-work' });
      var contactLink = nav.querySelector('a[href="#contact"]');
      nav.insertBefore(navA, contactLink || null);
    }
    var foot = doc.querySelector('.footer-row');
    if (foot) {
      footA = h('a', 'vi-foot-ai', { href: '#ai-work' });
      var top = foot.querySelector('a[href="#top"]');
      foot.insertBefore(footA, top || null);
    }
    function links(c) {
      if (navA) setText(navA, c.navLabel || 'AI');
      if (footA) setText(footA, c.footerLabel || c.eyebrow);
    }

    render();
    onLang.push(render);
  }

  /* Filters disclosure: Escape / outside click closes it, summary shows how many filters are active. */
  function initFilters() {
    var box = doc.getElementById('filtersBox');
    if (!box) return;
    var sum = box.querySelector('summary');
    var badge = h('span', 'filters-count', { hidden: '', 'aria-hidden': 'true' });
    sum.appendChild(badge);
    function pressed(sel, def) {
      var b = box.querySelector(sel + ' [aria-pressed="true"]');
      return b && b !== box.querySelector(sel + ' ' + def) ? 1 : 0;
    }
    function count() {
      var n = 0;
      var cat = box.querySelector('#cats [aria-pressed="true"]');
      if (cat && cat !== box.querySelector('#cats button')) n++;
      var co = doc.getElementById('co');
      if (co && co.selectedIndex > 0) n++;
      n += pressed('#viewSeg', '[data-view="timeline"]') + pressed('#densSeg', '[data-dens="detail"]') + pressed('#scaleSeg', '[data-scale="standard"]');
      badge.textContent = n; badge.hidden = !n;
    }
    box.addEventListener('click', function () { setTimeout(count, 0); });
    box.addEventListener('change', count);
    var reset = doc.getElementById('reset');
    if (reset) reset.addEventListener('click', function () { setTimeout(count, 0); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.open) { box.open = false; sum.focus(); }
    });
    doc.addEventListener('pointerdown', function (e) {
      if (box.open && !box.contains(e.target) && window.matchMedia('(min-width: 761px)').matches) box.open = false;
    });
    setTimeout(count, 300);
  }

  function init() {
    try { initFilters(); } catch (err) { if (window.console) console.error('[experience] filters failed:', err); }
    try { initAI(); } catch (err) { if (window.console) console.error('[experience] AI section failed:', err); }
    var last = lang();
    new MutationObserver(function () {
      var l = lang();
      if (l === last) return;
      last = l;
      onLang.forEach(function (fn) { fn(); });
    }).observe(root, { attributes: true, attributeFilter: ['lang', 'data-lang'] });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
