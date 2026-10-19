/* Demo stage shared by the non-profit demos: the entry (?from=case|workspace → a fresh start, the origin
   remembered for this tab), the back link, and the tips («підказки») — notification bubbles outside the
   frame, chosen by the app's current state.
     NGOStage.init({ id, storage, first, primary, tips, casePage, caseAnchor, columnMin, noFloat })  once, before the app script runs
     NGOStage.state('key')                                  whenever the app's screen or state changes
     NGOStage.action('name', fn)                            handler for a bubble button
   Nothing here talks to a server. */
(function () {
  'use strict';

  var CASE = { membership: 'case-membership', posters: 'case-posters', microgrants: 'case-microgrants', workspace: 'case-microgrants' };
  var WORKSPACE = '/ai/nonprofit/demo/workspace/';
  var KINDS = {
    what: ['Що відбувається', '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'],
    how: ['Як це працює', '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>'],
    tip: ['Порада', '<path d="M9.2 17.5h5.6M10.2 20.5h3.6M12 3.2a6 6 0 0 0-3.6 10.8c.7.5 1 1.3 1 2v.5h5.2V16c0-.7.3-1.5 1-2A6 6 0 0 0 12 3.2z"/>'],
    demo: ['У демо', '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 7.6v.1"/>']
  };
  var X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  var cfg = null, tips = {}, actions = {}, key = null, closed = {}, more = false, collapsed = false, autoHidden = false, mode = '';
  var root = null, list = null, moreBtn = null, qBtn = null, frame = null, raf = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function session(k, v) {
    try {
      if (v === undefined) return JSON.parse(window.sessionStorage.getItem(k) || 'null');
      window.sessionStorage.setItem(k, JSON.stringify(v));
    } catch (e) { /* unavailable */ }
    return null;
  }
  function siteLang() { try { return window.localStorage.getItem('vi-next-lang'); } catch (e) { return null; } }
  /* the language the case page was shown in: its ?lang=, else the page's own rule (stored «ua», otherwise English) */
  function caseLang() {
    var ref = '';
    try { ref = new URL(document.referrer).searchParams.get('lang') || ''; } catch (e) { /* no referrer */ }
    if (ref === 'ua' || ref === 'en') return ref;
    return siteLang() === 'ua' ? 'ua' : 'en';
  }

  /* ───────────── entry: a link from the case page or the workspace starts the demo afresh ───────────── */
  function entry(c) {
    var p = new URLSearchParams(window.location.search), from = p.get('from'), lang = p.get('lang');
    var okey = 'vi-ngo-stage-origin:' + c.id;
    if (from === 'case' || from === 'workspace') {
      (c.storage || []).forEach(function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* unavailable */ } });
      if (lang !== 'en' && lang !== 'ua') lang = from === 'case' ? caseLang() : '';
      session(okey, { from: from, lang: lang });
      p.delete('from'); p.delete('lang');
      var qs = p.toString();
      /* the param goes away, so a reload keeps the progress made from here on */
      window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + (c.first || ''));
    }
    return session(okey) || { from: '', lang: '' };
  }
  function backTarget(origin) {
    if (origin.from === 'workspace') return { href: WORKSPACE, label: 'Назад до робочого простору' };
    var lang = origin.lang || siteLang() || 'ua';
    /* other pages (business assistants) pass their own case page and anchor */
    var page = cfg.casePage || '/ai/nonprofit/', anchor = cfg.caseAnchor || CASE[cfg.id] || 'case-membership';
    return { href: page + '?lang=' + (lang === 'en' ? 'en' : 'ua') + '#' + anchor, label: 'Назад до кейсу' };
  }

  /* ───────────── tips ───────────── */
  function build() {
    var stage = document.querySelector('.stage');
    frame = document.querySelector('.demo-frame');
    if (!stage || !frame) return;
    root = document.createElement('aside');
    root.className = 'stage-tips';
    root.setAttribute('aria-label', 'Підказки до демо');
    root.innerHTML = '<div class="stage-tips-in"><div class="stage-tips-list" role="status" aria-live="polite"></div>' +
      '<button type="button" class="stage-tips-more" hidden></button>' +
      '<button type="button" class="stage-tips-q" aria-label="Показати підказки" title="Підказки" hidden>?</button></div>';
    stage.insertBefore(root, stage.firstChild);
    list = root.querySelector('.stage-tips-list');
    moreBtn = root.querySelector('.stage-tips-more');
    qBtn = root.querySelector('.stage-tips-q');

    root.addEventListener('click', function (e) {
      var x = e.target.closest('.tip-x'), act = e.target.closest('[data-tip-action]');
      if (x) {
        closed[key + ':' + x.getAttribute('data-i')] = true;
        render(false);
        var next = list.querySelector('.tip-x') || (qBtn.hidden ? null : qBtn);
        if (next) next.focus();
        return;
      }
      if (act) {
        var fn = actions[act.getAttribute('data-tip-action')];
        if (fn) fn(act);
        return;
      }
      if (e.target.closest('.stage-tips-more')) { more = true; render(false); return; }
      if (e.target.closest('.stage-tips-q')) {
        if (mode === 'float' && !collapsed && !autoHidden && !hiddenCount()) { collapsed = true; render(false); return; }
        collapsed = false; autoHidden = false; reopen(); render(true);
      }
    });
    /* cfg.columnMin: the width from which the tips get their own column; cfg.noFloat: no floating stack
       (an iframe app has no primary buttons the stack could step aside for), inline card instead */
    var mqCol = window.matchMedia('(min-width: ' + (cfg.columnMin || 1360) + 'px)'), mqFloat = window.matchMedia('(min-width: 1024px)');
    function setMode() {
      var m = mqCol.matches ? 'column' : mqFloat.matches && !cfg.noFloat ? 'float' : 'inline';
      if (m === mode) return;
      mode = m; root.setAttribute('data-mode', m); render(false);
    }
    [mqCol, mqFloat].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener('change', setMode); else mq.addListener(setMode); });
    setMode();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (window.MutationObserver) new MutationObserver(schedule).observe(frame, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  }
  function reopen() { Object.keys(closed).forEach(function (k) { if (k.indexOf(key + ':') === 0) delete closed[k]; }); }
  function hiddenCount() { return (tips[key] || []).filter(function (t, i) { return closed[key + ':' + i]; }).length; }
  function bubble(t, i, n) {
    var k = KINDS[t.kind] || KINDS.what, a = t.action;
    return '<div class="tip tip--' + (KINDS[t.kind] ? t.kind : 'what') + (n < 0 ? ' is-still' : '') + '" data-tip="' + esc(key + ':' + i) + '" data-kind="' + esc(t.kind) + '" style="--i:' + Math.max(0, n) + '">' +
      '<span class="tip-icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + k[1] + '</svg></span>' +
      '<div class="tip-body"><p class="tip-kind">' + k[0] + '</p><p class="tip-title">' + esc(t.title) + '</p><p class="tip-text">' + esc(t.text) + '</p>' +
      (a && actions[a.name] ? '<button type="button" class="tip-action" data-tip-action="' + esc(a.name) + '">' + esc(a.label) + '</button>' : '') + '</div>' +
      '<button type="button" class="tip-x" data-i="' + i + '" aria-label="Закрити підказку «' + esc(t.title) + '»">' + X + '</button></div>';
  }
  function render(animate) {
    if (!root) return;
    var all = tips[key] || [], vis = [];
    all.forEach(function (t, i) { if (!closed[key + ':' + i]) vis.push({ t: t, i: i }); });
    /* inline and floating: the most important bubble first, the rest behind «Ще підказки» so the form stays visible */
    var compact = mode === 'inline' || mode === 'float';
    var shown = compact && !more ? vis.slice(0, 1) : vis;
    list.innerHTML = shown.map(function (x, n) { return bubble(x.t, x.i, animate ? n : -1); }).join('');
    moreBtn.hidden = !(compact && !more && vis.length > 1);
    moreBtn.textContent = 'Ще підказки · ' + Math.max(0, vis.length - 1);
    var floatHidden = mode === 'float' && (collapsed || autoHidden);
    qBtn.hidden = mode === 'float' ? !all.length : !(all.length - vis.length);
    qBtn.setAttribute('aria-label', floatHidden || all.length - vis.length ? 'Показати підказки' : 'Згорнути підказки');
    qBtn.setAttribute('aria-expanded', String(!floatHidden && vis.length > 0));
    root.classList.toggle('is-empty', !shown.length);
    root.classList.toggle('is-collapsed', mode === 'float' && collapsed);
    root.classList.toggle('is-auto-hidden', mode === 'float' && autoHidden && !collapsed);
    root.hidden = !all.length;
    schedule();
  }

  /* 1024–1359: the floating stack never covers the frame's primary buttons — it steps aside while one is under it */
  function schedule() { if (!raf) raf = window.requestAnimationFrame(function () { raf = 0; check(); }); }
  function intersects(a, b) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
  function check() {
    if (!root) return;
    var was = autoHidden;
    if (mode !== 'float' || collapsed) autoHidden = false;
    else {
      var boxes = Array.prototype.map.call(list.children, function (n) { return n.getBoundingClientRect(); });
      if (!moreBtn.hidden) boxes.push(moreBtn.getBoundingClientRect());
      autoHidden = boxes.length > 0 && Array.prototype.some.call(frame.querySelectorAll(cfg.primary || '.d-btn--primary'), function (el) {
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && boxes.some(function (b) { return intersects(r, b); });
      });
    }
    if (was !== autoHidden) {
      root.classList.toggle('is-auto-hidden', autoHidden);
      qBtn.setAttribute('aria-label', autoHidden ? 'Показати підказки' : 'Згорнути підказки');
    }
  }

  function init(c) {
    cfg = c || {};
    tips = cfg.tips || {};
    var back = backTarget(entry(cfg));
    var a = document.querySelector('[data-stage-back]');
    if (a) {
      a.href = back.href;
      a.setAttribute('aria-label', back.label);
      var l = a.querySelector('.stage-back-long');
      if (l) l.textContent = back.label;
    }
    build();
  }
  function state(k) {
    if (k === key) return;
    key = k; more = false; autoHidden = false;
    render(true);
  }
  function action(name, fn) { actions[name] = fn; if (root && key) render(false); }

  window.NGOStage = { init: init, state: state, action: action, refresh: function () { render(false); }, key: function () { return key; } };
})();
