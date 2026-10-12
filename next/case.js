/*
 * Case-study page for the /next/ variant: next/case.html?id=<projectId>&lang=en|ua
 *
 * Data: window.VI_DATA (data.js — metadata, links, bullets from timeline.js) and
 * window.VI_CASES (presentation-data.js — present.js narratives + the per-case scene
 * manifest + image sizes). Both are generated snapshots; nothing from the original
 * site's renderer is loaded. All strings are escaped before they reach innerHTML.
 */
(function () {
  'use strict';
  var doc = document;
  var DATA = window.VI_DATA;
  var CASES = window.VI_CASES;
  var main = doc.getElementById('cs-main');

  var I18N = {
    en: {
      skip: 'Skip to the case', back: 'Timeline', backLong: 'Back to the timeline', orig: 'Original case',
      origLong: 'Open this case on the original site', allwork: 'All work', langTo: 'Українською',
      role: 'Role', employer: 'Employer', period: 'Period', platform: 'Platform', engine: 'Engine', genre: 'Genre',
      present: 'Present', overview: 'Overview', contribution: 'My contribution', facts: 'Highlights',
      sections: 'Case sections', artwork: 'All artwork', artworkLead: 'Every image of this case, as delivered.',
      showAll: 'Show all {n} images', hideAll: 'Hide images', viewScreen: 'View full size', of: 'of',
      links: 'Links', more: 'More cases', prevCase: 'Previous case', nextCase: 'Next case',
      cat: { games: 'Games', web: 'Web', apps: 'Apps', branding: 'Branding' },
      zoomIn: 'Actual size', zoomOut: 'Fit to screen', openOrig: 'Open original file', close: 'Close',
      prevImg: 'Previous image', nextImg: 'Next image', scrollShot: 'Scrollable screen, {t}',
      cover: 'Cover', mockup: 'Presentation mockup', screen: 'Screen',
      nfTitle: 'Case not found', nfBody: 'There is no case with the id “{id}”.', nfNoId: 'No case was specified.',
      nfBack: 'Browse all work on the timeline', dataErr: 'The case data could not be loaded.',
      noArt: 'No screens are published for this case.', step: 'Step',
      freelance: 'Freelance'
    },
    ua: {
      skip: 'Перейти до кейсу', back: 'Таймлайн', backLong: 'Назад до таймлайну', orig: 'Оригінальний кейс',
      origLong: 'Відкрити цей кейс на оригінальному сайті', allwork: 'Усі роботи', langTo: 'English',
      role: 'Роль', employer: 'Компанія', period: 'Період', platform: 'Платформа', engine: 'Рушій', genre: 'Жанр',
      present: 'дотепер', overview: 'Огляд', contribution: 'Мій внесок', facts: 'Ключові факти',
      sections: 'Розділи кейсу', artwork: 'Усі зображення', artworkLead: 'Усі зображення кейсу в оригінальному вигляді.',
      showAll: 'Показати всі зображення ({n})', hideAll: 'Сховати зображення', viewScreen: 'Відкрити в повному розмірі', of: 'з',
      links: 'Посилання', more: 'Інші кейси', prevCase: 'Попередній кейс', nextCase: 'Наступний кейс',
      cat: { games: 'Ігри', web: 'Веб', apps: 'Застосунки', branding: 'Брендинг' },
      zoomIn: 'Справжній розмір', zoomOut: 'Вписати в екран', openOrig: 'Відкрити оригінальний файл', close: 'Закрити',
      prevImg: 'Попереднє зображення', nextImg: 'Наступне зображення', scrollShot: 'Екран із прокруткою, {t}',
      cover: 'Обкладинка', mockup: 'Презентаційний мокап', screen: 'Екран',
      nfTitle: 'Кейс не знайдено', nfBody: 'Кейсу з ідентифікатором «{id}» немає.', nfNoId: 'Кейс не вказано.',
      nfBack: 'Переглянути всі роботи на таймлайні', dataErr: 'Не вдалося завантажити дані кейсу.',
      noArt: 'Для цього кейсу екрани не публікуються.', step: 'Крок',
      freelance: 'Фріланс'
    }
  };
  var MONTHS = {
    en: ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ua: ['', 'січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
  };

  // ── helpers ──
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function store(get, k, v) {
    try { return get ? window.localStorage.getItem(k) : window.localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var qs = new URLSearchParams(location.search);
  var lang = qs.get('lang');
  if (lang !== 'en' && lang !== 'ua') lang = store(true, 'vi-next-lang') === 'ua' ? 'ua' : 'en';
  var S = I18N[lang];
  function T(k, vars) {
    var s = own(S, k) ? S[k] : k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  }
  function L(v) { // [en, ua] arrays (data.js) or {en, ua} objects (present.js) or plain strings
    if (v == null) return '';
    if (Array.isArray(v)) return v[lang === 'ua' ? 1 : 0] || v[0] || '';
    if (typeof v === 'object') return v[lang] || v.en || '';
    return String(v);
  }
  function paras(text) {
    return String(text || '').split(/\n{2,}/).filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }
  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  doc.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
  doc.documentElement.setAttribute('data-lang', lang);
  Array.prototype.forEach.call(doc.querySelectorAll('[data-t]'), function (el) { el.textContent = T(el.getAttribute('data-t')); });

  // ── resolve the case id (kept literal: no case folding or trimming) ──
  var id = qs.get('id');
  var hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch (e) { hash = ''; }
  var projects = DATA && Array.isArray(DATA.projects) ? DATA.projects : [];
  var byId = new Map(projects.map(function (p) { return [p.id, p]; }));
  if (id == null && hash && byId.has(hash)) id = hash;
  var P = id != null && byId.has(id) ? byId.get(id) : null;
  var C = P && CASES && own(CASES.cases, P.id) ? CASES.cases[P.id] : null;

  // ── top-bar links ──
  function caseHref(pid, l, anchor) {
    return 'case.html?id=' + encodeURIComponent(pid) + '&lang=' + l + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }
  function timelineHref() {
    var u = new URL('/', location.origin);
    // Reuse the timeline state the visitor came from (filters, view) — same-origin /next/ only.
    try {
      if (doc.referrer) {
        var r = new URL(doc.referrer);
        if (r.origin === location.origin && (r.pathname === '/' || r.pathname === '/index.html' || r.pathname === '/next/' || r.pathname === '/next/index.html')) {
          ['q', 'cat', 'co', 'view', 'dens', 'y'].forEach(function (k) {
            var v = r.searchParams.get(k);
            if (v != null && v.length <= 80) u.searchParams.set(k, v);
          });
        }
      }
    } catch (e) { /* malformed referrer: fall back to the plain link */ }
    if (P) u.searchParams.set('p', P.id);
    u.searchParams.set('lang', lang);
    return u.pathname + u.search;
  }
  var backHref = timelineHref();
  var back = doc.getElementById('cs-back');
  back.href = backHref;
  back.setAttribute('aria-label', T('backLong'));
  doc.getElementById('cs-foot-back').href = '/?lang=' + lang;
  doc.querySelector('.cs-brand').href = '/?lang=' + lang;
  var other = lang === 'ua' ? 'en' : 'ua';
  var langA = doc.getElementById('cs-lang');
  langA.textContent = other === 'ua' ? 'UA' : 'EN';
  langA.setAttribute('hreflang', other === 'ua' ? 'uk' : 'en');
  langA.setAttribute('lang', other === 'ua' ? 'uk' : 'en');
  langA.setAttribute('aria-label', T('langTo'));
  var orig = doc.getElementById('cs-orig');

  function sectionAnchor() {
    var h = location.hash.slice(1);
    return /^sec-[a-z0-9-]+$/.test(h) || h === 'artwork' || h === 'more' ? h : '';
  }
  function syncLang() {
    if (P) langA.href = caseHref(P.id, other, sectionAnchor());
    else langA.href = 'case.html?' + (id != null ? 'id=' + encodeURIComponent(id) + '&' : '') + 'lang=' + other;
  }
  syncLang();
  window.addEventListener('hashchange', syncLang);

  if (!P || !C) { notFound(); return; }
  if (P.original === false) orig.remove();
  else orig.href = '/project.html#' + encodeURIComponent(P.id);
  orig.setAttribute('aria-label', T('origLong'));

  // ── derived data ──
  var co = (DATA.companies || []).find(function (c) { return c.id === P.co; }) || null;
  var sizes = CASES.sizes || {};
  var images = C.images.slice();
  var kinds = C.kinds;
  var name = L(P.name);
  var accent = /^#[0-9a-f]{6}$/i.test(C.accent || '') ? C.accent : '#9aa3b5';
  doc.documentElement.style.setProperty('--cs-accent', accent);
  doc.title = name + ' — ' + L(P.genre) + ' · Valentyn Ihnatov';
  var md = doc.querySelector('meta[name=description]');
  if (md) md.setAttribute('content', L(C.tagline) || L(P.desc));

  // caption per image: the first section that shows it, else what the source calls it
  var captions = {};
  C.sections.forEach(function (s) {
    (s.imgs || []).forEach(function (a) { if (!captions[a]) captions[a] = L(s.title) || L(s.kicker) || ''; });
  });
  images.forEach(function (a, i) {
    if (captions[a]) return;
    captions[a] = a === P.cover ? T('cover') : a === P.mockup ? T('mockup') : T('screen') + ' ' + (i + 1);
  });
  Object.keys(C.captions || {}).forEach(function (a) { captions[a] = L(C.captions[a]); });
  function alt(a) { return name + ' — ' + (captions[a] || T('screen')); }

  // ── frames ──
  // A "shot" is a button that opens the full-size viewer. The frame around the image
  // depends on the manifest kind; boards (already-composed artwork) are never framed.
  // Raster masters stay untouched ("open original file"); pages show WebP derivatives
  // from next/tools/build-web-images.py, listed in next/webp-map.js.
  var WEBP = window.VI_WEBP || {};
  function web(a, small) { var m = a && WEBP[a]; return m ? (small ? m[1] : m[0]) || a : a; }
  function imgTag(a, eager, cls) {
    var wh = sizes[a] || [1600, 1000];
    return '<img class="' + (cls || 'dv-img') + '" src="' + esc(web(a)) + '" width="' + wh[0] + '" height="' + wh[1] + '" alt="' + esc(alt(a)) + '"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
  }
  function ar(a) { var wh = sizes[a] || [16, 10]; return wh[0] + ' / ' + wh[1]; }
  function frame(a, kind, eager) {
    var st = ' style="--ar:' + ar(a) + '"';
    switch (kind) {
      case 'phone': return '<span class="dv dv-phone"' + st + '><span class="dv-screen">' + imgTag(a, eager) + '</span></span>';
      case 'tablet': return '<span class="dv dv-tablet"' + st + '><span class="dv-screen">' + imgTag(a, eager) + '</span></span>';
      case 'land': return '<span class="dv dv-land"' + st + '><span class="dv-screen">' + imgTag(a, eager) + '</span></span>';
      case 'display': return '<span class="dv dv-display"' + st + '><span class="dv-bezel"><span class="dv-screen">' + imgTag(a, eager) + '</span></span><span class="dv-stand" aria-hidden="true"></span></span>';
      case 'browser': return '<span class="dv dv-browser"' + st + '><span class="dv-chrome" aria-hidden="true"><i></i><i></i><i></i><b></b></span><span class="dv-screen">' + imgTag(a, eager) + '</span></span>';
      default: return '<span class="dv dv-board"' + st + '>' + imgTag(a, eager) + '</span>';
    }
  }
  function shot(a, opts) {
    opts = opts || {};
    var i = images.indexOf(a);
    var kind = opts.kind || kinds[a] || 'board';
    var label = esc(T('viewScreen') + ': ' + (captions[a] || name) + ' (' + (i + 1) + ' ' + T('of') + ' ' + images.length + ')');
    if (kind === 'long') {
      // very tall scroll capture: a phone with a scrollable screen + its own viewer button
      return '<div class="shot shot-long' + (opts.cls ? ' ' + opts.cls : '') + '">' +
        '<span class="dv dv-phone dv-long"><span class="dv-screen" tabindex="0" role="region" aria-label="' + esc(T('scrollShot', { t: captions[a] || name })) + '">' +
        imgTag(a, opts.eager, 'dv-img dv-img-long') + '</span></span>' +
        '<button type="button" class="shot-more" data-i="' + i + '" aria-label="' + label + '">' + zoomIcon() + '</button></div>';
    }
    return '<button type="button" class="shot shot-' + kind + (opts.cls ? ' ' + opts.cls : '') + '" data-i="' + i + '" aria-label="' + label + '">' +
      frame(a, kind, opts.eager) + '<span class="shot-zoom" aria-hidden="true">' + zoomIcon() + '</span></button>';
  }
  function zoomIcon() {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // A stage lays out 1..n shots according to their kinds and the section type.
  function stage(imgs, type, label) {
    var ks = imgs.map(function (a) { return kinds[a] || 'board'; });
    var phoneish = ks.every(function (k) { return k === 'phone' || k === 'long'; });
    var same = ks.every(function (k) { return k === ks[0]; });
    var family = phoneish ? 'phone' : same ? ks[0] : 'mixed';
    var n = imgs.length;
    var rail = (type === 'rail' || (family === 'phone' && n > 4) || (family === 'land' && n > 4));
    var cls = 'st st-' + family + ' st-n' + Math.min(n, 4) + (rail ? ' st-rail' : '') +
      (family === 'phone' && n >= 2 && n <= 3 && !rail ? ' st-persp' : '');
    var inner = imgs.map(function (a) {
      var wh = sizes[a] || [16, 10];
      return '<div class="st-cell" style="--arn:' + (wh[0] / wh[1]).toFixed(4) + '">' + shot(a) + '</div>';
    }).join('');
    if (rail) return '<div class="' + cls + '" tabindex="0" role="region" aria-label="' + esc(label || name) + '"><div class="st-track">' + inner + '</div></div>';
    return '<div class="' + cls + '">' + inner + '</div>';
  }

  // ── hero ──
  function fmtYM(ym) { return MONTHS[lang][ym[1]] + ' ' + ym[0]; }
  function period() {
    if (P.ongoing) return fmtYM(P.s) + ' – ' + T('present');
    if (P.s[0] === P.e[0]) return (P.s[1] === P.e[1] ? '' : MONTHS[lang][P.s[1]] + ' – ') + fmtYM(P.e);
    return fmtYM(P.s) + ' – ' + fmtYM(P.e);
  }
  function heroArt() {
    var h = C.hero;
    if (h.scene === 'none') {
      return '<div class="hs hs-none" role="img" aria-label="' + esc(T('noArt')) + '"><span class="hs-none-type" aria-hidden="true">' +
        esc(L(P.genre)) + '</span><span class="hs-none-note">' + esc(T('noArt')) + '</span></div>';
    }
    var kind = { trio: 'phone', land: 'land', display: 'display', browser: 'browser', board: 'board', tablet: 'tablet' }[h.scene];
    return '<div class="hs hs-' + h.scene + '">' + h.imgs.map(function (a, i) {
      return '<div class="hs-item hs-i' + i + '">' + shot(a, { kind: kind, eager: true }) + '</div>';
    }).join('') + '</div>';
  }
  function hero() {
    var role = P.role ? L(P.role) : co ? L(co.role) : '';
    var coName = co ? (P.co === 'freelance' ? T('freelance') : L(co.name)) : '';
    var meta = [
      [T('role'), role], [T('employer'), coName], [T('period'), period()],
      [T('platform'), P.platform], [T('engine'), P.engine], [T('genre'), L(P.genre)]
    ].filter(function (m) { return m[1]; });
    var links = (P.links || []).filter(function (l) { return /^https:\/\//.test(l.url); });
    return '<section class="cs-hero" aria-labelledby="cs-title">' +
      '<div class="cs-wrap cs-hero-text">' +
        '<div class="cs-hero-head">' +
          '<p class="cs-kicker"><span class="cs-dot" aria-hidden="true"></span>' + esc(T('cat')[P.category] || '') + ' · ' + esc(L(P.genre)) + '</p>' +
          '<h1 id="cs-title" class="cs-h1">' + (P.brandMark ? '<img class="cs-project-mark" src="' + esc(P.brandMark) + '" alt="" aria-hidden="true" width="88" height="88">' : '') + esc(name) + '</h1>' +
          (C.tagline ? '<p class="cs-lede">' + esc(L(C.tagline)) + '</p>' : '') +
          (links.length ? '<div class="cs-links">' + links.map(function (l) {
            return '<a class="cs-btn" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) +
              '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13 13 7M8 7h5v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></a>';
          }).join('') + '</div>' : '') +
        '</div>' +
        '<dl class="cs-meta">' + meta.map(function (m) {
          return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>';
        }).join('') + '</dl>' +
      '</div>' +
      '<div class="cs-hero-art">' + heroArt() + '</div>' +
    '</section>';
  }

  // ── sections (present.js order and grouping) ──
  var used = {};
  function head(s, fallback) {
    var t = L(s.title) || fallback || '';
    var k = L(s.kicker);
    return (k && k !== t ? '<p class="cs-kicker">' + esc(k) + '</p>' : '') + (t ? '<h2 class="cs-h2" id="' + s._id + '-h">' + esc(t) + '</h2>' : '');
  }
  function chips(items) {
    return items && items.length ? '<ul class="cs-chips">' + items.map(function (it) { return '<li>' + esc(L(it)) + '</li>'; }).join('') + '</ul>' : '';
  }
  function renderSection(s, idx) {
    var imgs = s.imgs || [];
    var body = paras(L(s.body));
    var lab = s._title ? ' aria-labelledby="' + s._id + '-h"' : ' aria-label="' + esc(captions[imgs[0]] || name) + '"';
    var open = '<section class="cs-sec cs-sec-' + s.type + (s._title ? '' : ' cs-sec-cont') + '" id="' + s._id + '"' + lab + '><div class="cs-wrap">';
    var close = '</div></section>';
    switch (s.type) {
      case 'narrative':
        return open + '<div class="cs-narr">' + '<div class="cs-narr-head">' + head(s) + '</div><div class="cs-prose">' + body + chips(s.items) + '</div></div>' + close;
      case 'metrics':
        return open + head(s, T('facts')) + '<dl class="cs-facts">' + (s.facts || []).map(function (f) {
          return '<div><dt>' + esc(L(f.k)) + '</dt><dd>' + esc(L(f.v)) + '</dd></div>';
        }).join('') + '</dl>' + close;
      case 'process':
        return open + head(s) + (body ? '<div class="cs-prose cs-prose-lead">' + body + '</div>' : '') +
          '<ol class="cs-steps">' + (s.items || []).map(function (it, i) {
            return '<li><span class="cs-step-n" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span><span>' + esc(L(it)) + '</span></li>';
          }).join('') + '</ol>' + close;
      case 'video':
        var v = s.video;
        var videoKind = s.videoKind || 'phone';
        var videoFrame = videoKind === 'landscape' ? 'dv dv-tablet' : 'dv dv-phone';
        return open + '<div class="cs-feat cs-feat-' + videoKind + '">' +
          '<div class="cs-feat-text">' + head(s) + '<div class="cs-prose">' + body + '</div>' +
          '<a class="cs-btn cs-btn-ghost cs-video-download" href="' + esc(v.src) + '" download>' + (lang === 'ua' ? 'Завантажити MP4' : 'Download MP4') + '</a></div>' +
          '<div class="cs-feat-art"><div class="cs-video-stage"><div class="' + videoFrame + '" style="--ar:' + ar(v.poster) + '"><div class="dv-screen">' +
          '<video class="dv-img" controls muted playsinline preload="none" poster="' + esc(web(v.poster)) + '" aria-label="' + esc(s._title) + '">' +
          '<source src="' + esc(v.src) + '" type="video/mp4">' +
          '<track ' + (P.id === 'budmarket-lux' && lang === 'en' ? 'default ' : '') + 'kind="captions" src="' + esc(v.captions[lang]) + '" srclang="' + (lang === 'ua' ? 'uk' : 'en') + '" label="' + (lang === 'ua' ? 'Українська' : 'English') + '">' +
          '</video></div></div></div></div></div>' + (imgs.length ? '<div class="cs-video-screens">' + stage(imgs, 'gallery', s._title) + '</div>' : '') + close;
      case 'feature':
        return open + '<div class="cs-feat' + (s.flip ? ' is-flip' : '') + ' cs-feat-' + (kinds[imgs[0]] || 'board') + '">' +
          '<div class="cs-feat-text">' + head(s) + '<div class="cs-prose">' + body + '</div>' + chips(s.items) + '</div>' +
          '<div class="cs-feat-art">' + stage(imgs, s.type, s._title || captions[imgs[0]]) + '</div></div>' + close;
      case 'anatomy':
        return open + '<div class="cs-anat cs-anat-' + (kinds[imgs[0]] || 'board') + '">' +
          '<div class="cs-anat-art">' + stage(imgs, s.type, s._title || captions[imgs[0]]) + '</div>' +
          '<div class="cs-anat-text">' + head(s) + '<div class="cs-prose">' + body + '</div>' +
          (s.items && s.items.length ? '<ol class="cs-callouts">' + s.items.map(function (it, i) {
            return '<li><span class="cs-callout-n" aria-hidden="true">' + (i + 1) + '</span><span>' + esc(L(it)) + '</span></li>';
          }).join('') + '</ol>' : '') + '</div></div>' + close;
      default: // wide, duo, themes, gallery, rail
        var single = imgs.length === 1 && (kinds[imgs[0]] === 'phone' || kinds[imgs[0]] === 'long');
        if (single) { // one portrait phone: text beside it instead of a lonely centred phone
          return open + '<div class="cs-feat cs-feat-phone">' + '<div class="cs-feat-text">' + head(s) + '<div class="cs-prose">' + body + '</div>' + chips(s.items) + '</div>' +
            '<div class="cs-feat-art">' + stage(imgs, s.type, s._title || captions[imgs[0]]) + '</div></div>' + close;
        }
        return open + '<div class="cs-block-head">' + head(s) + (body ? '<div class="cs-prose">' + body + '</div>' : '') + chips(s.items) + '</div>' +
          stage(imgs, s.type, s._title || captions[imgs[0]]) + close;
    }
  }

  function render() {
    var seen = {};
    var secs = C.sections.map(function (s, i) {
      var o = Object.assign({}, s);
      o._title = L(s.title);
      var base = 'sec-' + (slug(s.title && s.title.en) || slug(s.kicker && s.kicker.en) || String(i + 1));
      var sid = base, n = 2;
      while (seen[sid]) sid = base + '-' + n++;
      seen[sid] = 1;
      o._id = sid;
      (s.imgs || []).forEach(function (a) { used[a] = 1; });
      return o;
    });

    // Overview = the first narrative, joined by the contribution bullets from data.js.
    var ovIdx = secs.findIndex(function (s) { return s.type === 'narrative'; });
    var ov = ovIdx > -1 ? secs.splice(ovIdx, 1)[0] : null;
    var bullets = (P.bullets || []).map(L).filter(Boolean);
    var highlights = (P.highlights || []).map(L).filter(Boolean);
    var html = hero();
    var nav = [];
    if (ov || bullets.length) {
      nav.push(['sec-overview', T('overview')]);
      var ovTitle = ov ? (ov._title || T('overview')) : T('overview');
      html += '<section class="cs-sec cs-overview" id="sec-overview" aria-labelledby="sec-overview-h"><div class="cs-wrap cs-ov">' +
        '<div class="cs-ov-main">' + '<p class="cs-kicker">' + esc(ov && L(ov.kicker) && L(ov.kicker) !== ovTitle ? L(ov.kicker) : T('overview')) + '</p>' +
        '<h2 class="cs-h2" id="sec-overview-h">' + esc(ovTitle) + '</h2>' +
        '<div class="cs-prose cs-prose-lg">' + (ov ? paras(L(ov.body)) : '') + '</div>' +
        // narrative tags would repeat the bullets beside them, so they only show without bullets
        (!bullets.length && ov ? chips(ov.items) : '') + '</div>' +
        (bullets.length || highlights.length ? '<aside class="cs-ov-aside" aria-labelledby="cs-contrib-h">' +
          '<h3 class="cs-h3" id="cs-contrib-h">' + esc(T('contribution')) + '</h3>' +
          '<ul class="cs-bullets">' + bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
          (highlights.length ? '<ul class="cs-hl">' + highlights.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
        '</aside>' : '') + '</div></section>';
    }
    secs.forEach(function (s, i) {
      if (s._title) nav.push([s._id, s._title]);
      html += renderSection(s, i);
    });

    // Everything the case owns stays reachable, including art not used by any section.
    if (images.length) {
      nav.push(['artwork', T('artwork')]);
      html += '<section class="cs-sec cs-art" id="artwork" aria-labelledby="artwork-h"><div class="cs-wrap">' +
        '<div class="cs-art-head"><div><h2 class="cs-h2" id="artwork-h">' + esc(T('artwork')) + '</h2>' +
        '<p class="cs-muted">' + esc(T('artworkLead')) + '</p></div>' +
        '<button type="button" class="cs-btn cs-btn-ghost" id="cs-art-toggle" aria-expanded="false" aria-controls="cs-art-grid">' +
        esc(T('showAll', { n: images.length })) + '</button></div>' +
        '<ul class="cs-art-grid" id="cs-art-grid" hidden>' + images.map(function (a, i) {
          return '<li><button type="button" class="cs-thumb" data-i="' + i + '" aria-label="' + esc(T('viewScreen') + ': ' + captions[a] + ' (' + (i + 1) + ' ' + T('of') + ' ' + images.length + ')') + '">' +
            imgTag(a, false, 'cs-thumb-img') + '<span class="cs-thumb-cap" aria-hidden="true">' + esc(captions[a]) + '</span></button></li>';
        }).join('') + '</ul></div></section>';
    }
    html += more();
    nav.push(['more', T('more')]);

    main.innerHTML = '<nav class="cs-secnav" aria-label="' + esc(T('sections')) + '"><div class="cs-wrap"><ul>' +
      nav.map(function (n) { return '<li><a href="#' + n[0] + '">' + esc(n[1]) + '</a></li>'; }).join('') +
      '</ul></div></nav>' + html;
    // the section nav goes after the hero, as the case's own table of contents
    var navEl = main.querySelector('.cs-secnav');
    var heroEl = main.querySelector('.cs-hero');
    heroEl.parentNode.insertBefore(navEl, heroEl.nextSibling);
    main.removeAttribute('aria-busy');
  }

  // ── prev / next in timeline order (newest first) ──
  function ordered() {
    return projects.map(function (p, i) { return [p, i]; }).sort(function (a, b) {
      var A = a[0], B = b[0];
      return (B.e[0] - A.e[0]) || (B.e[1] - A.e[1]) || (B.s[0] - A.s[0]) || (B.s[1] - A.s[1]) || (a[1] - b[1]);
    }).map(function (x) { return x[0]; });
  }
  function card(p, label, dir) {
    var c = CASES.cases[p.id];
    var img = c && (c.hero.scene === 'board' ? c.hero.imgs[0] : (p.cover || p.mockup || c.hero.imgs[0])) || p.thumb;
    return '<a class="cs-next cs-next-' + dir + '" href="' + caseHref(p.id, lang) + '" rel="' + dir + '">' +
      '<span class="cs-next-label">' + esc(label) + '</span>' +
      (img ? '<span class="cs-next-img">' + '<img src="' + esc(web(img)) + '" alt="" loading="lazy" decoding="async"' +
        (sizes[img] ? ' width="' + sizes[img][0] + '" height="' + sizes[img][1] + '"' : '') + '></span>' : '<span class="cs-next-img cs-next-img-none" aria-hidden="true"></span>') +
      '<span class="cs-next-name">' + esc(L(p.name)) + '</span><span class="cs-next-genre">' + esc(L(p.genre)) + '</span></a>';
  }
  function more() {
    var list = ordered();
    var i = list.indexOf(P);
    var prev = list[(i - 1 + list.length) % list.length];
    var next = list[(i + 1) % list.length];
    return '<section class="cs-sec cs-more" id="more" aria-labelledby="more-h"><div class="cs-wrap">' +
      '<h2 class="cs-h2" id="more-h">' + esc(T('more')) + '</h2>' +
      '<div class="cs-more-grid">' + card(prev, T('prevCase'), 'prev') + card(next, T('nextCase'), 'next') + '</div>' +
      '<p class="cs-more-links"><a class="cs-btn cs-btn-ghost" href="' + esc(backHref) + '">' + esc(T('backLong')) + '</a>' +
      (P.original === false ? '' : '<a class="cs-btn cs-btn-ghost" href="/project.html#' + encodeURIComponent(P.id) + '">' + esc(T('origLong')) + '</a>') + '</p>' +
      '</div></section>';
  }

  // ── not found ──
  function notFound() {
    orig.hidden = true;
    doc.title = T('nfTitle') + ' · Valentyn Ihnatov';
    var msg = !DATA || !CASES ? T('dataErr') : id == null || id === '' ? T('nfNoId') : T('nfBody', { id: id });
    main.innerHTML = '<div class="cs-wrap cs-msg"><p class="cs-kicker">404</p><h1 class="cs-h1">' + esc(T('nfTitle')) + '</h1>' +
      '<p class="cs-lede">' + esc(msg) + '</p><p><a class="cs-btn" href="/?lang=' + lang + '">' + esc(T('nfBack')) + '</a></p></div>';
    main.removeAttribute('aria-busy');
  }

  // ── viewer (native modal dialog + explicit focus wrap) ──
  var lb = doc.getElementById('cs-lb');
  var lbImg = doc.getElementById('cs-lb-img');
  var lbStage = doc.getElementById('cs-lb-stage');
  var zoomBtn = doc.getElementById('cs-lb-zoom');
  var cur = 0, opener = null;
  function show(i) {
    cur = (i + images.length) % images.length;
    var a = images[cur];
    var wh = sizes[a] || [0, 0];
    lbImg.src = web(a);
    if (wh[0]) { lbImg.width = wh[0]; lbImg.height = wh[1]; }
    lbImg.alt = alt(a);
    doc.getElementById('cs-lb-title').textContent = captions[a] || name;
    doc.getElementById('cs-lb-count').textContent = (cur + 1) + ' ' + T('of') + ' ' + images.length;
    doc.getElementById('cs-lb-open').href = a;
    setZoom(false);
    var single = images.length < 2;
    doc.getElementById('cs-lb-prev').hidden = single;
    doc.getElementById('cs-lb-next').hidden = single;
  }
  function setZoom(on) {
    lb.classList.toggle('is-zoom', on);
    zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    zoomBtn.querySelector('.cs-vh').textContent = on ? T('zoomOut') : T('zoomIn');
    lbStage.scrollTop = 0; lbStage.scrollLeft = 0;
  }
  function openLb(i, from) {
    opener = from || doc.activeElement;
    show(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    doc.documentElement.classList.add('cs-lb-open');
    doc.getElementById('cs-lb-close').focus();
  }
  function closeLb() {
    if (lb.open && typeof lb.close === 'function') lb.close(); else lb.removeAttribute('open');
  }
  lb.addEventListener('close', function () {
    doc.documentElement.classList.remove('cs-lb-open');
    lbImg.removeAttribute('src');
    if (opener && doc.contains(opener)) opener.focus();
  });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbStage) closeLb(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' && images.length > 1) { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight' && images.length > 1) { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'Tab') {
      var f = Array.prototype.filter.call(lb.querySelectorAll('button, a[href]'), function (el) { return !el.hidden && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || !lb.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (doc.activeElement === last || !lb.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });
  doc.getElementById('cs-lb-close').addEventListener('click', closeLb);
  doc.getElementById('cs-lb-prev').addEventListener('click', function () { show(cur - 1); });
  doc.getElementById('cs-lb-next').addEventListener('click', function () { show(cur + 1); });
  zoomBtn.addEventListener('click', function () { setZoom(!lb.classList.contains('is-zoom')); });
  lbImg.addEventListener('click', function () { setZoom(!lb.classList.contains('is-zoom')); });

  // ── boot ──
  render();
  // Playback is always user-initiated, including when reduced motion is requested.
  var videos = Array.prototype.slice.call(main.querySelectorAll('video'));
  if (window.IntersectionObserver && videos.length) {
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (!entry.isIntersecting) entry.target.pause(); });
    });
    videos.forEach(function (video) { videoObserver.observe(video); });
  }
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) videos.forEach(function (video) { video.pause(); });
  });
  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    if (b && main.contains(b)) { e.preventDefault(); openLb(+b.getAttribute('data-i'), b); return; }
    var t = e.target.closest('#cs-art-toggle');
    if (t) {
      var grid = doc.getElementById('cs-art-grid');
      var open = grid.hidden;
      grid.hidden = !open;
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.textContent = open ? T('hideAll') : T('showAll', { n: images.length });
    }
  });
  Array.prototype.forEach.call(main.querySelectorAll('img'), function (im) {
    im.addEventListener('error', function () { var s = im.closest('.dv, .cs-thumb, .cs-next-img'); if (s) s.classList.add('is-broken'); });
  });

  // scrollspy for the section nav
  var links = Array.prototype.slice.call(main.querySelectorAll('.cs-secnav a'));
  var targets = links.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
  function spy() {
    var y = window.innerHeight * 0.3, active = -1;
    targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= y) active = i; });
    links.forEach(function (a, i) {
      if (i === active) {
        if (a.getAttribute('aria-current') !== 'true') {
          a.setAttribute('aria-current', 'true');
          var ul = a.closest('ul'); // keep the active chip visible in the horizontally scrolling nav
          if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollTo({ left: a.parentNode.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
        }
      } else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    window.requestAnimationFrame(function () { ticking = false; spy(); });
  }, { passive: true });
  spy();

  // content is rendered by script, so honour a section anchor once it exists
  var anchor = sectionAnchor();
  if (anchor) {
    var el = doc.getElementById(anchor);
    if (el) window.requestAnimationFrame(function () { el.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }
})();
