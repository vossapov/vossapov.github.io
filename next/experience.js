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
  function mq(q) {
    var m = window.matchMedia ? window.matchMedia(q) : null;
    return m || { matches: false, addEventListener: function () {} };
  }
  function watch(m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  function h(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function setText(n, s) { if (n.textContent !== s) n.textContent = s; }

  /* ───────── AI section ───────── */
  function initAI() {
    var COPY = window.VI_AI_COPY;
    var contact = doc.getElementById('contact');
    if (!COPY || !COPY.en || !contact || doc.getElementById('ai-work')) return;
    function C() { return COPY[lang()] || COPY.en; }

    var sec = h('section', 'vi-ai', { id: 'ai-work', 'aria-labelledby': 'viAiTitle', tabindex: '-1' });
    sec.innerHTML =
      '<div class="wrap">' +
        '<header class="vi-ai-head">' +
          '<div class="vi-ai-heading">' +
            '<p class="eyebrow" data-vi="eyebrow"></p>' +
            '<h2 id="viAiTitle"><span data-vi="title"></span> <span class="vi-draft" data-vi="badge"></span></h2>' +
          '</div>' +
          '<p class="vi-ai-thesis" data-vi="thesis"></p>' +
        '</header>' +
        '<div class="vi-bench">' +
          '<p class="vi-bench-label" id="viBenchLabel" data-vi="benchLabel"></p>' +
          '<div class="vi-steps" role="tablist" aria-labelledby="viBenchLabel"></div>' +
          '<div class="vi-panels"></div>' +
        '</div>' +
        '<div class="vi-ai-foot">' +
          '<div class="vi-principles"><h3 data-vi="principlesLabel"></h3><ul></ul></div>' +
          '<div class="vi-tools"><h3 data-vi="toolsLabel"></h3><ul class="vi-tool-list"></ul></div>' +
          '<p class="vi-ai-note" data-vi="note"></p>' +
        '</div>' +
      '</div>';
    contact.parentNode.insertBefore(sec, contact);

    var tablist = sec.querySelector('.vi-steps'), panels = sec.querySelector('.vi-panels');
    var vertical = mq('(min-width: 861px)');
    var tabs = [], pans = [], sel = 0;
    function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

    function build(n) {
      tablist.textContent = ''; panels.textContent = ''; tabs = []; pans = [];
      for (var i = 0; i < n; i++) {
        var tab = h('button', 'vi-step', { type: 'button', role: 'tab', id: 'viTab' + i, 'aria-controls': 'viPanel' + i });
        tab.innerHTML = '<span class="vi-step-n" aria-hidden="true">' + pad(i) + '</span>' +
          '<span class="vi-step-txt"><span class="vi-step-t"></span><span class="vi-step-s"></span></span>';
        var pan = h('div', 'vi-panel', { role: 'tabpanel', id: 'viPanel' + i, 'aria-labelledby': 'viTab' + i, tabindex: '0' });
        pan.innerHTML =
          '<p class="vi-panel-kicker"><span class="vi-panel-n"></span> <span class="vi-panel-t"></span></p>' +
          '<dl class="vi-rows">' +
            '<div class="vi-row vi-row-in"><dt data-l="input"></dt><dd data-f="input"></dd></div>' +
            '<div class="vi-row vi-row-ai"><dt data-l="ai"></dt><dd data-f="ai"></dd></div>' +
            '<div class="vi-row vi-row-me"><dt data-l="me"></dt><dd data-f="me"></dd></div>' +
          '</dl>' +
          '<details class="vi-prompt"><summary data-l="prompt"></summary>' +
            '<blockquote><p data-f="prompt"></p></blockquote><p class="vi-prompt-note" data-l="promptNote"></p></details>';
        tablist.appendChild(tab); panels.appendChild(pan);
        tabs.push(tab); pans.push(pan);
        tab.addEventListener('click', select.bind(null, i, false));
      }
    }
    function select(i, focus) {
      sel = i;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        pans[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tablist.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = tabs.length, j = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j === null) return;
      e.preventDefault();
      select(j, true);
    });

    function render() {
      var c = C(), steps = c.steps || [];
      if (steps.length !== tabs.length) {
        var hadFocus = tabs.indexOf(doc.activeElement) >= 0;
        build(steps.length);
        select(Math.min(sel, steps.length - 1), hadFocus);
      }
      sec.querySelectorAll('[data-vi]').forEach(function (n) { setText(n, c[n.getAttribute('data-vi')] || ''); });
      sec.querySelector('.vi-draft').hidden = c.draft === false;
      sec.classList.toggle('is-draft', c.draft !== false);
      tabs.forEach(function (t, i) {
        var s = steps[i];
        setText(t.querySelector('.vi-step-t'), s.title);
        setText(t.querySelector('.vi-step-s'), s.short || '');
        var p = pans[i];
        setText(p.querySelector('.vi-panel-n'), (c.stepWord || '') + ' ' + pad(i));
        setText(p.querySelector('.vi-panel-t'), s.title);
        p.querySelectorAll('[data-l]').forEach(function (n) { setText(n, (c.labels || {})[n.getAttribute('data-l')] || ''); });
        p.querySelectorAll('[data-f]').forEach(function (n) { setText(n, s[n.getAttribute('data-f')] || ''); });
        p.querySelector('.vi-prompt').hidden = !s.prompt;
      });
      fillList(sec.querySelector('.vi-principles ul'), c.principles || []);
      fillList(sec.querySelector('.vi-tool-list'), c.tools || []);
      sec.querySelector('.vi-principles').hidden = !(c.principles || []).length;
      sec.querySelector('.vi-tools').hidden = !(c.tools || []).length;
      tablist.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
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
      if (footA) setText(footA, c.footerLabel || c.title);
    }

    watch(vertical, render);
    select(0, false);
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
