/* Workspace demo — the organisation's projects and the guided "new project" flow.
   #            home: the organisation, «Новий проєкт», «Ваші проєкти»
   #new         one question per screen (title first; the rest come from the type the title is classified into)
   #check       summary with «Змінити» per answer
   #build       the proposed applicant form: steps, fields, outputs, FAQ, live phone preview
   #edit/<id>   the same builder for a created project
   #p/<id>      the generated prototype: the applicant's form, one step per screen
   Deterministic and offline (rules in flow.js); state in localStorage, nothing leaves the browser. */
(function () {
  'use strict';

  var D = window.NGODemo, W = window.WSFlow, esc = D.esc;
  var store = D.store('vi-ngo-demo-workspace');
  var main = document.getElementById('wsMain');
  var layer = document.getElementById('wsLayer');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Stage = window.NGOStage || { state: function () {}, action: function () {} };

  var EXISTING = [
    { title: 'Заява на вступ з одного телефона', purpose: 'Людина заповнює заяву й фотографує документи на телефоні, підпис ставить пальцем.', href: '/ai/nonprofit/demo/membership/?from=workspace', tone: 'coral', spot: 'membership' },
    { title: 'Постер для кожної дитини', purpose: 'Оператор заповнює чотири кроки — постер A4, сторіз і пости готові.', href: '/ai/nonprofit/demo/posters/?from=workspace', tone: 'pink', spot: 'posters' },
    { title: 'Мікрогранти для мікробізнесу', purpose: 'Кабінет учасника: етапи конкурсу, бізнес-ідея й кошторис з перевірками.', href: '/ai/nonprofit/demo/microgrants/?from=workspace#cabinet', tone: 'teal', spot: 'microgrants' }
  ];
  function spotSrc(name) { return '/next/assets/ai/ngo/spot-' + name + '.webp'; }

  /* ───────────── state ───────────── */
  var S = (function () {
    var saved = store.get();
    if (!saved || typeof saved !== 'object') return { draft: null, projects: [], n: 0 };
    saved.projects = saved.projects || [];
    saved.n = saved.n || 0;
    /* a file that was still being read when the page closed counts as read by name only */
    if (saved.draft && saved.draft.context) (saved.draft.context.files || []).forEach(function (f) { f.reading = false; });
    return saved;
  })();
  function save() {
    if (store.set(S)) return;
    /* storage full: keep everything but the pictures */
    var lite = JSON.parse(JSON.stringify(S));
    lite.projects.forEach(function (p) {
      Object.keys(p.run.values).forEach(function (k) { var v = p.run.values[k]; if (v && v.dataUrl) v.dataUrl = ''; });
    });
    store.set(lite);
  }
  function project(id) { return S.projects.filter(function (p) { return p.id === id; })[0]; }
  function ctx(d) { return W.context(d); }
  function qs(d) { return W.flow(d); }

  /* ───────────── small pieces ───────────── */
  function icon(name) {
    var p = {
      back: 'M15 6l-6 6 6 6',
      check: 'M5 12.5l4.2 4.2L19 7',
      up: 'M12 19V6M6 11l6-6 6 6',
      down: 'M12 5v13M6 13l6 6 6-6',
      x: 'M6 6l12 12M18 6L6 18',
      plus: 'M12 5v14M5 12h14',
      cam: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
      arrow: 'M5 12h14M13 6l6 6-6 6',
      phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
      req: 'M12 5v14M6 8.5l12 7M18 8.5l-12 7',
      prev: 'M14.5 6l-6 6 6 6',
      next: 'M9.5 6l6 6-6 6'
    }[name];
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + p + '"/></svg>';
  }
  /* "*word*" in a question becomes the highlighter mark */
  function hl(s) { return esc(s).replace(/\*([^*]+)\*/g, '<mark class="hl">$1</mark>'); }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    return n + ' ' + (m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many);
  }
  function today() { var d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }

  /* visual instruction for a document photo: a small drawing of the right shot (as in the membership demo) */
  var GUIDE_FRAME = '<path d="M14 26v-10h10M136 16h10v10M146 84v10h-10M24 94H14V84" fill="none" stroke="#6b4ce6" stroke-width="3" stroke-linecap="round"/>';
  function guideSvg(kind) {
    var body;
    if (kind === 'card') {
      body = '<rect x="24" y="24" width="112" height="62" rx="7" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<rect x="32" y="34" width="26" height="34" rx="3" fill="#d9d6ea"/><circle cx="45" cy="46" r="6" fill="#a9a5c4"/>' +
        '<path d="M66 38h50M66 48h40M66 58h56M66 68h30" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>';
    } else if (kind === 'ipn') {
      body = '<rect x="24" y="24" width="112" height="62" rx="7" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<path d="M34 38h60M34 48h40" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>' +
        '<rect x="34" y="60" width="92" height="16" rx="3" fill="#d9d6ea"/><path d="M40 68h80" stroke="#1d1b2b" stroke-width="2.4" stroke-dasharray="5 3"/>';
    } else if (kind === 'bank') {
      body = '<rect x="40" y="16" width="80" height="78" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<path d="M50 30h60M50 40h44M50 50h52" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="50" y="62" width="60" height="14" rx="2" fill="#d9d6ea"/><path d="M55 69h50" stroke="#1d1b2b" stroke-width="2.2" stroke-dasharray="4 3"/>';
    } else if (kind === 'portrait') {
      body = '<rect x="52" y="14" width="56" height="80" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<circle cx="80" cy="44" r="13" fill="#d9d6ea"/><path d="M60 86c3-14 11-20 20-20s17 6 20 20" fill="#d9d6ea"/>';
    } else {
      body = '<rect x="40" y="16" width="80" height="78" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<path d="M50 30h60M50 40h44M50 50h52M50 60h36" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="98" cy="76" r="9" fill="none" stroke="#a9a5c4" stroke-width="2.5"/>';
    }
    return '<svg viewBox="0 0 160 110" role="img" aria-label="Як має виглядати фото"><rect width="160" height="110" rx="12" fill="#efebff"/>' + body + GUIDE_FRAME + '</svg>';
  }

  /* ───────────── router ───────────── */
  function route() {
    var h = (window.location.hash || '').replace(/^#/, '');
    var m = h.match(/^(edit|p)\/(\w+)$/);
    if (m) return { view: m[1] === 'p' ? 'proto' : 'edit', id: m[2] };
    if (h === 'new' || h === 'check' || h === 'build') return { view: h };
    return { view: 'home' };
  }
  function go(hash) {
    if (window.location.hash === hash || (hash === '#' && !window.location.hash)) render();
    else window.location.hash = hash;
  }
  var sheet = null, overlay = false;
  function render() {
    var r = route();
    closeLayers();
    if ((r.view === 'check' || r.view === 'build') && !(S.draft && S.draft.type)) { r = { view: S.draft ? 'new' : 'home' }; }
    if ((r.view === 'edit' || r.view === 'proto') && !project(r.id)) r = { view: 'home' };
    if (r.view === 'new' && !S.draft) { S.draft = newDraft(); save(); }
    document.body.setAttribute('data-view', r.view);
    if (r.view === 'home') renderHome();
    else if (r.view === 'new') renderQuestion();
    else if (r.view === 'check') renderSummary();
    else if (r.view === 'build') renderBuilder(draftTarget());
    else if (r.view === 'edit') renderBuilder(projectTarget(project(r.id)));
    else renderProto(project(r.id));
    tips();
  }
  /* the tip bubbles outside the frame follow the screen */
  function tips() {
    var r = route(), v = document.body.getAttribute('data-view'), d = S.draft;
    if (v === 'new' && d) {
      var q = qs(d)[Math.min(d.qi, qs(d).length - 1)];
      Stage.state(q.kind === 'title' ? 'q-title' : q.kind === 'context' ? (d.base === 'generic' ? 'q-context-new' : 'q-context') : q.kind === 'text' ? 'q-desc' : q.kind === 'amount' ? 'q-amount' : 'q');
    } else if (v === 'proto' && current) {
      var steps = liveSteps(current), st = steps[Math.min(current.run.step, steps.length - 1)];
      Stage.state(current.run.done ? 'proto-done' : st && st.fields.some(function (f) { return f.type === 'photo'; }) ? 'proto-photo' : st && st.fields.some(function (f) { return f.type === 'signature'; }) ? 'proto-sign' : 'proto');
    } else Stage.state(v === 'check' ? 'check' : v === 'build' || v === 'edit' ? 'build' : 'home');
    return r;
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  function newDraft() { return { title: '', type: '', answers: {}, qi: 0, ret: false, schema: null, sel: 0 }; }

  /* ============================== home ============================== */
  function renderHome() {
    var d = S.draft;
    var h = '<section class="ws-wrap ws-home">' +
      '<header class="ws-org"><h1 class="ws-h1">' + esc(W.ORG.name) + '</h1><p class="ws-org-line">' + esc(W.ORG.knows) + '</p></header>' +
      '<button type="button" class="ws-new" data-act="new"><span class="ws-new-plus">' + icon('plus') + '</span>' +
      '<span class="ws-new-text"><b>Новий проєкт</b><span>Кілька коротких питань — і прототип форми готовий</span></span></button>';
    if (d && d.title) {
      h += '<p class="ws-resume">Незавершений: «' + esc(d.title) + '» <button type="button" class="ws-link" data-act="resume">Продовжити</button></p>';
    }
    h += '<h2 class="ws-h2">Ваші проєкти</h2><ul class="ws-projects">';
    S.projects.forEach(function (p) {
      var n = p.schema.steps.filter(function (s) { return s.fields.length; }).length;
      h += '<li><a class="ws-project ws-project--violet" data-pid="' + p.id + '" href="#p/' + p.id + '">' +
        '<span class="ws-thumb"><img src="' + spotSrc('context') + '" alt="" width="600" height="600" loading="lazy"></span>' +
        '<span class="ws-project-body"><b>' + esc(p.title) + '</b><span>Форма заявника · ' + plural(n, 'крок', 'кроки', 'кроків') + ' · створено ' + esc(p.created) + '</span></span>' +
        '<span class="ws-status ws-status--proto">Прототип</span></a></li>';
    });
    EXISTING.forEach(function (p) {
      h += '<li><a class="ws-project ws-project--' + p.tone + '" href="' + p.href + '">' +
        '<span class="ws-thumb"><img src="' + spotSrc(p.spot) + '" alt="" width="600" height="600" loading="lazy"></span>' +
        '<span class="ws-project-body"><b>' + esc(p.title) + '</b><span>' + esc(p.purpose) + '</span></span>' +
        '<span class="ws-status">Працює</span></a></li>';
    });
    h += '</ul></section>';
    main.innerHTML = h;
  }

  /* ============================== questions ============================== */
  function ensureAnswer(d, q) {
    if (q.id === 'title' || q.kind === 'context') return null;
    var a = d.answers[q.id];
    if (!a || a.auto) { a = W.defaultAnswer(q, ctx(d)); d.answers[q.id] = a; }
    return a;
  }
  /* answers the user has not touched follow the earlier answers */
  function refreshAuto(d, fromIndex) {
    qs(d).forEach(function (q, i) {
      if (i <= fromIndex || q.id === 'title' || q.kind === 'context') return;
      var a = d.answers[q.id];
      if (a && a.auto) d.answers[q.id] = W.defaultAnswer(q, ctx(d));
    });
  }
  function topBar(label, count, pct) {
    return '<div class="ws-top"><button type="button" class="ws-back" data-act="back">' + icon('back') + '<span>' + esc(label) + '</span></button>' +
      (count ? '<span class="ws-count">' + esc(count) + '</span>' : '') + '</div>' +
      (pct != null ? '<div class="ws-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' : '');
  }

  /* one centred column: the model line (only when it says something new), the question, one muted line, the choices, «Далі» */
  function renderQuestion() {
    var d = S.draft, list = qs(d), qi = Math.min(d.qi, list.length - 1), q = list[qi];
    d.qi = qi;
    var total = d.type ? list.length : 0;
    var count = total ? 'Крок ' + (qi + 1) + ' з ' + total : 'Крок 1';
    var pct = total ? Math.round(((qi + 1) / total) * 100) : 8;
    var h = '<section class="ws-wrap ws-wrap--q ws-q" data-q="' + q.id + '"' + (d.type ? ' data-type="' + d.type + '"' : '') + '>' +
      topBar(d.ret ? 'До перевірки' : 'Назад', count, pct);
    var line = modelLine(d, list, qi);
    if (line) h += '<p class="ws-model"><span class="ws-model-dot" aria-hidden="true"></span>' + esc(line) + '</p>';
    h += '<h1 class="ws-question" id="wsQ">' + hl(q.q) + '</h1>';
    var c = d.type ? ctx(d) : null, a = q.kind === 'title' || q.kind === 'context' ? null : ensureAnswer(d, q);
    var likely = a && q.defaults ? q.defaults(c) : [];
    var reason = c ? W.reasonFor(q, c) : '';
    /* hint and reason merged into one muted line; a quiet note when options are pre-selected */
    var sub = q.kind === 'context' ? (d.base === 'generic' ? q.hintNew : q.hint)
      : [q.hint, reason || (likely.length && a && a.auto && q.kind !== 'text' ? 'Ми вже позначили найімовірніше.' : '')].filter(Boolean).join(' ');
    if (sub) h += '<p class="ws-sub">' + esc(sub) + '</p>';

    if (q.kind === 'context') {
      h += contextHtml(d);
    } else if (q.kind === 'title') {
      h += '<label class="sr-only" for="wsTitle">Назва проєкту</label><input id="wsTitle" class="ws-input ws-input--big" data-title value="' + esc(d.title) + '" autocomplete="off" placeholder="Наприклад: Набір волонтерів">' +
        '<p class="ws-err" data-err></p>' +
        '<div class="ws-examples" role="group" aria-label="Приклади назв">' + W.TITLE_Q.examples.map(function (t) {
          return '<button type="button" class="ws-example" data-act="example" data-v="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('') + '</div>';
    } else if (q.kind === 'text') {
      h += '<label class="sr-only" for="wsDesc">Опис</label><textarea id="wsDesc" class="ws-input ws-textarea" data-desc rows="7">' + esc(a.value) + '</textarea><p class="ws-err" data-err></p>';
    } else if (q.kind === 'amount') {
      h += '<div class="ws-amount"><label class="sr-only" for="wsAmount">Сума</label><input id="wsAmount" class="ws-input ws-input--big" inputmode="numeric" data-amount value="' + esc(W.fmtNum(a.value)) + '"><span>' + esc(q.unit || '') + '</span></div>' +
        '<div class="ws-quick" role="group" aria-label="Інші суми">' + q.quick.map(function (v) {
          return '<button type="button" class="ws-example" data-act="quick" data-v="' + v + '" aria-pressed="' + (String(a.value).replace(/\D/g, '') === v) + '">' + W.fmtNum(v) + ' ' + esc(q.unit) + '</button>';
        }).join('') + '</div><p class="ws-err" data-err></p>';
    } else {
      var opts = W.optionsOf(q, c), multi = q.kind === 'multi';
      h += '<div class="ws-chips' + (multi ? ' is-multi' : ' is-single') + '" role="group" aria-labelledby="wsQ">' + opts.map(function (o) {
        var on = a.sel.indexOf(o.v) > -1;
        return '<button type="button" class="ws-chip" data-act="pick" data-v="' + esc(o.v) + '" aria-pressed="' + on + '"' + (on && a.auto ? ' data-auto' : '') + '><span class="ws-chip-box" aria-hidden="true">' + icon('check') + '</span>' +
          '<span class="ws-chip-t">' + esc(o.t) + (o.sub ? '<small class="ws-chip-sub">' + esc(o.sub) + '</small>' : '') + '</span></button>';
      }).join('') +
        '<button type="button" class="ws-chip ws-chip--other" data-act="other" aria-pressed="' + !!a.otherOn + '"><span class="ws-chip-box" aria-hidden="true">' + icon('check') + '</span><span class="ws-chip-t">Інше…</span></button></div>' +
        (a.otherOn ? '<label class="sr-only" for="wsOther">Свій варіант</label><input id="wsOther" class="ws-input" data-other value="' + esc(a.other) + '" placeholder="Напишіть свій варіант">' : '') +
        '<p class="ws-err" data-err></p>';
    }
    var last = qi === list.length - 1 && d.type;
    h += '<div class="ws-next' + (q.kind === 'context' ? ' ws-next--skip' : '') + '">' +
      (q.kind === 'context' ? '<button type="button" class="ws-link ws-skip" data-act="skip">Пропустити</button>' : '') +
      '<button type="button" class="ws-btn ws-btn--primary" data-act="next">' + (d.ret ? 'Готово — до перевірки' : last ? 'Перевірити відповіді' : 'Далі') + icon('arrow') + '</button></div></section>';
    main.innerHTML = h;
    var other = document.getElementById('wsOther');
    if (other && !other.value) other.focus();
    autosize(document.getElementById('wsDesc'));
    autosize(document.getElementById('wsCtx'));
    tips();
  }

  /* the one line the model says above a question — only when it adds something */
  function modelLine(d, list, qi) {
    if (!d.type) return '';
    var q = list[qi], c = d.context || {};
    var given = !!(String(c.text || '').trim() || (c.files || []).length || (c.links || []).length);
    if (q.kind === 'context') return d.base === 'generic' ? 'Не впізнали тип проєкту за назвою — схоже, він новий.' : W.TYPES[d.type].intro;
    if (list[qi - 1] && list[qi - 1].kind === 'context') {
      if (d.base !== 'generic') return given ? 'Врахували те, що ви додали, — відповіді вже підказані.' : '';
      if (d.type !== 'generic') return 'З опису й документів схоже на: ' + W.TYPES[d.type].acc + '. Уточнимо кілька речей.';
      if (c.skipped || !given) return W.TYPES.generic.intro;
      return 'Знайомого типу не знайшли, тож питання загальні — але відповіді вже підказані з вашого опису.';
    }
    return '';
  }

  /* ───────────── context: documents + links (every type), a short description (titles the model did not recognise) ───────────── */
  var reading = 0;
  function contextHtml(d) {
    var c = d.context || { text: '', files: [], links: [] }, isNew = d.base === 'generic', h = '';
    if (isNew) {
      h += '<label class="ws-ctx-label" for="wsCtx">Коротко про проєкт</label><textarea id="wsCtx" class="ws-input ws-textarea ws-textarea--short" data-ctx rows="3" placeholder="Наприклад: збираємо заявки від родин, які…">' + esc(c.text || '') + '</textarea>' +
        '<div class="ws-examples ws-starters" role="group" aria-label="Почати з фрази">' + W.CONTEXT_Q.starters.map(function (t) {
          return '<button type="button" class="ws-example" data-act="starter" data-v="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('') + '</div>';
    }
    h += '<div class="ws-drop" data-drop><input type="file" id="wsFiles" class="ws-drop-input" data-files multiple accept=".pdf,.docx,.xlsx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">' +
      '<label for="wsFiles" class="ws-drop-label">' + docIcon() + '<span class="ws-drop-text"><b class="ws-drop-desk">Перетягніть документи сюди або <u>оберіть файли</u></b><b class="ws-drop-phone">Додати документи</b>' +
      '<small><span class="ws-drop-kinds">Статут, положення, шаблони заяв, звіти · </span>PDF, DOCX, XLSX або TXT</small></span></label></div>' +
      '<div class="ws-linkbox"><label class="ws-ctx-label" for="wsLink">Посилання</label><div class="ws-link-row">' +
      '<input id="wsLink" class="ws-input" data-link type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://… сторінка конкурсу чи програми">' +
      '<button type="button" class="ws-btn ws-btn--small" data-act="link-add">Додати</button></div><p class="ws-err" data-link-err></p></div>' +
      '<div id="wsCtxInfo" class="ws-ctx-info" aria-live="polite">' + ctxInfoHtml(d) + '</div>' +
      '<p class="ws-err" data-err></p>';
    return h;
  }
  function docIcon() {
    return '<svg class="ws-drop-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M13 6h15l9 9v27H13z" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M28 6v9h9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M19 24h12M19 30h12M19 36h7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function ctxInfoHtml(d) {
    var c = d.context || { text: '', files: [], links: [] }, files = c.files || [], links = c.links || [], h = '';
    if (files.length) {
      h += '<ul class="ws-files" aria-label="Додані документи">' + files.map(function (f, i) {
        var state = f.reading ? 'читаємо…' : f.read ? 'текст прочитано' : TEXT_EXT.indexOf(f.ext) < 0 ? 'лише назва' : f.big ? 'завеликий · лише назва' : 'не прочитано · лише назва';
        return '<li class="ws-file' + (f.reading ? ' is-reading' : '') + '" data-read="' + (f.reading ? 'pending' : f.read ? 'text' : 'name') + '"><span class="ws-file-ext">' + esc(f.ext.toUpperCase()) + '</span>' +
          '<span class="ws-file-name" title="' + esc(f.name) + '">' + esc(f.name) + '</span><span class="ws-file-state">' + state + '</span>' +
          '<button type="button" class="ws-file-x" data-act="file-remove" data-i="' + i + '" aria-label="Прибрати ' + esc(f.name) + '">' + icon('x') + '</button></li>';
      }).join('') + '</ul>';
    }
    if (links.length) {
      h += '<ul class="ws-files ws-links" aria-label="Додані посилання">' + links.map(function (l, i) {
        return '<li class="ws-file ws-linkchip"><span class="ws-file-name" title="' + esc(l.url) + '"><b>' + esc(l.host) + '</b>' + (l.path ? '<span class="ws-link-path">' + esc(l.path) + '</span>' : '') + '</span>' +
          '<button type="button" class="ws-file-x" data-act="link-remove" data-i="' + i + '" aria-label="Прибрати посилання ' + esc(l.host) + '">' + icon('x') + '</button></li>';
      }).join('') + '</ul>';
    }
    var rec = W.recognised(c);
    if (rec.length) h += '<p class="ws-took"><b>Звідси візьмемо:</b> ' + esc(rec.join(', ')) + '.</p>';
    var t = W.classifyContext(c);
    if (d.base === 'generic' && t !== 'generic') h += '<p class="ws-detect">Схоже на: ' + esc(W.TYPES[t].acc) + '.</p>';
    return h;
  }
  function updateCtxInfo() {
    var box = document.getElementById('wsCtxInfo');
    if (box) box.innerHTML = ctxInfoHtml(S.draft);
  }
  /* only DOCX and TXT are read (in the browser); PDF and XLSX count by file name only */
  var TEXT_EXT = ['docx', 'txt'], MAX_FILE = 8 * 1024 * 1024, MAX_TEXT = 1024 * 1024, MAX_XML = 6 * 1024 * 1024;
  function readText(file, ext) {
    if (TEXT_EXT.indexOf(ext) < 0 || file.size > MAX_FILE) return Promise.resolve('');
    var job;
    if (ext === 'txt') {
      job = new Promise(function (resolve) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result || '')); };
        r.onerror = function () { resolve(''); };
        r.readAsText(file.slice(0, MAX_TEXT));
      });
    } else {
      if (!window.JSZip) return Promise.resolve('');
      job = window.JSZip.loadAsync(file).then(function (z) {
        var x = z.file('word/document.xml');
        /* a zip bomb is refused before it is inflated: the declared size of the text part is checked first */
        var size = x && x._data && x._data.uncompressedSize;
        if (!x || !(size > 0) || size > MAX_XML) return '';
        return x.async('string');
      }).then(function (xml) {
        return String(xml).slice(0, MAX_XML).replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').slice(0, MAX_TEXT);
      });
    }
    /* a file that cannot be read in a few seconds counts by its name */
    return Promise.race([job, new Promise(function (resolve) { setTimeout(function () { resolve(''); }, 6000); })]).catch(function () { return ''; });
  }
  function addFiles(list) {
    var d = S.draft, bad = [], over = 0;
    d.context = d.context || { text: '', files: [] };
    d.context.files = d.context.files || [];
    Array.prototype.forEach.call(list || [], function (file) {
      var ext = (String(file.name).split('.').pop() || '').toLowerCase();
      if (W.DOC_EXT.indexOf(ext) < 0) { bad.push(file.name); return; }
      if (d.context.files.length >= 8) { over++; return; }
      if (d.context.files.some(function (f) { return f.name === file.name && f.size === file.size; })) return;
      var entry = { name: String(file.name).slice(0, 160), size: file.size, ext: ext, keys: W.keywords(file.name), reading: true, read: false };
      if (file.size > MAX_FILE) entry.big = true;
      d.context.files.push(entry);
      reading++;
      readText(file, ext).then(function (text) {
        /* the text itself is dropped here: only the stems found in it are kept */
        entry.keys = W.keywords(file.name + ' ' + text);
        entry.read = !!String(text).trim();
        entry.reading = false;
        reading = Math.max(0, reading - 1);
        save(); updateCtxInfo();
      });
    });
    d.context.skipped = false;
    save(); updateCtxInfo();
    questionError(bad.length ? 'Не підходить формат: ' + bad.join(', ') + '. Додайте PDF, DOCX, XLSX або TXT.' : over ? 'Можна додати до 8 документів.' : '');
  }
  /* links are not opened here: only the URL string and the keywords in it count */
  function addLink() {
    var d = S.draft, input = document.getElementById('wsLink'), err = main.querySelector('[data-link-err]');
    d.context = d.context || { text: '', files: [], links: [] };
    d.context.links = d.context.links || [];
    var r = W.parseLink(input.value, d.context.links);
    if (r.error) { if (err) err.textContent = r.error; input.focus(); return; }
    d.context.links.push(r.link);
    d.context.skipped = false;
    input.value = ''; if (err) err.textContent = '';
    questionError(''); save(); updateCtxInfo(); input.focus();
  }
  /* «Далі» or «Пропустити» on the description screen: classify description + documents, then continue */
  function leaveContext(skip) {
    var d = S.draft;
    d.context = d.context || { text: '', files: [], links: [] };
    if (d.base !== 'generic') {
      /* a known type: documents and links are optional and only sharpen the suggested answers */
      if (!skip && reading) { questionError('Зачекайте секунду — документи ще читаються.'); return; }
      if (skip) d.context = { text: '', files: [], links: [], skipped: true };
      else d.context.skipped = !((d.context.files || []).length || (d.context.links || []).length);
      refreshAuto(d, 1); d.schema = null;
      if (d.ret) { d.ret = false; save(); go('#check'); return; }
      d.qi = 2; save(); renderQuestion(); window.scrollTo(0, 0);
      return;
    }
    if (skip) { d.context = { text: '', files: [], links: [], skipped: true }; }
    else {
      if (reading) { questionError('Зачекайте секунду — документи ще читаються.'); return; }
      if (!String(d.context.text || '').trim() && !(d.context.files || []).length && !(d.context.links || []).length) {
        questionError('Додайте кілька речень, документ або посилання — або натисніть «Пропустити».'); return;
      }
      d.context.skipped = false;
    }
    var type = skip ? 'generic' : W.classifyContext(d.context);
    if (type !== d.type) { d.type = type; d.answers = {}; d.ret = false; }
    else refreshAuto(d, 1);
    d.schema = null;
    if (d.ret) { d.ret = false; save(); go('#check'); return; }
    d.qi = 2; save(); renderQuestion(); window.scrollTo(0, 0);
  }
  /* the description is read whole, without an inner scrollbar */
  function autosize(ta, min) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(min || 0, ta.scrollHeight + 4) + 'px';
  }

  function questionError(msg) {
    var e = main.querySelector('[data-err]');
    if (e) e.textContent = msg;
  }
  function nextQuestion() {
    var d = S.draft, list = qs(d), q = list[d.qi];
    if (q.kind === 'context') { leaveContext(false); return; }
    if (q.kind === 'title') {
      var t = (document.getElementById('wsTitle').value || '').trim();
      if (t.length < 3) { questionError('Напишіть назву або оберіть приклад.'); return; }
      /* the type of the title itself; for an unrecognised title the description screen may refine it later */
      var type = W.classify(t), changed = type !== (d.base || d.type);
      d.title = t;
      if (changed) {
        var hadAnswers = Object.keys(d.answers).length > 0 || !!d.context;
        d.base = type; d.type = type; d.answers = {}; d.context = null; d.ret = false; d.schema = null; d.qi = 1; save();
        if (hadAnswers) D.toast('Тип проєкту змінився — питання оновлено');
        renderQuestion(); window.scrollTo(0, 0);
        return;
      }
      refreshAuto(d, 0);
    } else {
      var a = d.answers[q.id];
      if (!W.isAnswered(q, a)) { questionError(q.kind === 'text' ? 'Опис не може бути порожнім.' : q.kind === 'amount' ? 'Вкажіть суму.' : 'Оберіть хоча б один варіант або напишіть свій.'); return; }
      refreshAuto(d, d.qi);
    }
    d.schema = null;
    if (d.ret) { d.ret = false; save(); go('#check'); return; }
    if (d.qi >= list.length - 1) { save(); go('#check'); return; }
    d.qi++; save(); renderQuestion(); window.scrollTo(0, 0);
  }

  /* ============================== summary ============================== */
  function renderSummary() {
    var d = S.draft, c = ctx(d), T = W.TYPES[d.type];
    var h = '<section class="ws-wrap ws-check">' + topBar('Назад', '', null) +
      '<h1 class="ws-question"><mark class="hl">Перевірте</mark> відповіді</h1>' +
      '<p class="ws-hint">Тип проєкту — ' + esc(T.name) + (d.base === 'generic' && d.type !== 'generic' ? ' (з опису й документів)' : '') + '. З цих відповідей модель запропонує форму для заявника.</p>' +
      '<dl class="ws-sum">' + qs(d).map(function (q, i) {
        if (q.kind === 'context') return contextRows(d, i);
        return '<div class="ws-sum-row" data-q="' + q.id + '"><dt>' + esc(q.short) + '</dt><dd>' + esc(W.answerText(q, c)) + '</dd>' +
          '<button type="button" class="ws-link" data-act="edit" data-qi="' + i + '" data-q="' + q.id + '">Змінити<span class="sr-only">: ' + esc(q.short) + '</span></button></div>';
      }).join('') + '</dl>' +
      '<div class="ws-next"><button type="button" class="ws-btn ws-btn--primary" data-act="build">Все правильно — будуємо прототип' + icon('arrow') + '</button></div></section>';
    main.innerHTML = h;
  }

  function contextRows(d, i) {
    var c = d.context || {}, files = c.files || [], links = c.links || [];
    function row(id, label, body) {
      return '<div class="ws-sum-row" data-q="' + id + '"><dt>' + label + '</dt><dd>' + body + '</dd>' +
        '<button type="button" class="ws-link" data-act="edit" data-qi="' + i + '" data-q="' + id + '">Змінити<span class="sr-only">: ' + label + '</span></button></div>';
    }
    var none = '<span class="ws-sum-empty">' + (c.skipped ? 'пропущено' : 'не додано') + '</span>';
    var text = String(c.text || '').trim(), out = '';
    if (d.base === 'generic') out += row('context', 'Опис проєкту', text ? esc(text) : none);
    out += row('files', 'Документи', files.length
      ? '<span class="ws-sum-files">' + files.map(function (f) { return '<span class="ws-file ws-file--mini"><span class="ws-file-ext">' + esc(f.ext.toUpperCase()) + '</span><span class="ws-file-name">' + esc(f.name) + '</span>' + (f.read ? '' : '<span class="ws-file-state">лише назва</span>') + '</span>'; }).join('') + '</span>' +
        (W.recognised(c).length ? '<span class="ws-sum-took">Звідси візьмемо: ' + esc(W.recognised(c).join(', ')) + '.</span>' : '')
      : none);
    out += row('links', 'Посилання', links.length
      ? '<span class="ws-sum-files">' + links.map(function (l) { return '<span class="ws-file ws-file--mini ws-linkchip"><span class="ws-file-name"><b>' + esc(l.host) + '</b>' + (l.path ? '<span class="ws-link-path">' + esc(l.path) + '</span>' : '') + '</span></span>'; }).join('') + '</span>'
      : none);
    return out;
  }

  /* ============================== builder ============================== */
  /* a target is the thing being edited: the draft (before «Створити прототип») or a created project */
  function draftTarget() {
    var d = S.draft;
    if (!d.schema) { d.schema = W.buildSchema(d); d.sel = 0; save(); }
    return { kind: 'draft', title: d.title, type: d.type, schema: d.schema, get sel() { return d.sel || 0; }, set sel(v) { d.sel = v; } };
  }
  function projectTarget(p) {
    return { kind: 'project', id: p.id, title: p.title, type: p.type, schema: p.schema, get sel() { return p.sel || 0; }, set sel(v) { p.sel = v; } };
  }
  var target = null;

  function renderBuilder(t) {
    target = t;
    var sc = t.schema, n = sc.steps.length;
    if (t.sel >= n) t.sel = 0;
    var h = '<section class="ws-wrap ws-wrap--wide ws-build">' + topBar(t.kind === 'draft' ? 'До відповідей' : 'Ваші проєкти', '', null) +
      '<header class="ws-build-head"><h1 class="ws-h1">' + esc(t.title) + '</h1>' +
      '<p class="ws-model"><span class="ws-model-dot" aria-hidden="true"></span>Модель запропонувала форму для заявника: ' + plural(n, 'крок', 'кроки', 'кроків') + '. Поля можна додати, прибрати й переставити.</p></header>' +
      '<div class="ws-build-grid"><div class="ws-build-main"><ol class="ws-steps">';
    sc.steps.forEach(function (s, si) {
      h += '<li class="ws-step' + (si === t.sel ? ' is-sel' : '') + '" data-step="' + si + '">' +
        '<button type="button" class="ws-step-head" data-act="sel-step" data-si="' + si + '" aria-pressed="' + (si === t.sel) + '"><span class="ws-step-n">' + (si + 1) + '</span>' +
        '<span class="ws-step-title">' + esc(s.title) + '</span><span class="ws-step-meta">' + plural(s.fields.length, 'поле', 'поля', 'полів') + '</span></button>' +
        '<ul class="ws-fields">' + s.fields.map(function (f, fi) {
          var first = si === 0 && fi === 0, lastF = si === n - 1 && fi === s.fields.length - 1;
          return '<li class="ws-field" data-fid="' + f.id + '" data-type="' + f.type + '">' +
            '<div class="ws-field-main"><span class="ws-field-label">' + esc(f.label) + '</span><span class="ws-type ws-type--' + f.type + '">' + esc(W.TYPE_LABEL[f.type] || f.type) + '</span>' +
              (f.req ? '' : '<span class="ws-field-opt">необов’язкове</span>') + '</div>' +
            '<div class="ws-field-tools">' +
              '<button type="button" class="ws-tool ws-tool--req" role="switch" aria-checked="' + !!f.req + '" data-act="req" data-fid="' + f.id + '" aria-label="Обов’язкове: ' + esc(f.label) + '" title="Обов’язкове поле">' + icon('req') + '</button>' +
              '<span class="ws-tool-group">' +
              '<button type="button" class="ws-tool" data-act="up" data-fid="' + f.id + '" aria-label="Вище: ' + esc(f.label) + '"' + (first ? ' disabled' : '') + '>' + icon('up') + '</button>' +
              '<button type="button" class="ws-tool" data-act="down" data-fid="' + f.id + '" aria-label="Нижче: ' + esc(f.label) + '"' + (lastF ? ' disabled' : '') + '>' + icon('down') + '</button>' +
              '<button type="button" class="ws-tool ws-tool--x" data-act="remove" data-fid="' + f.id + '" aria-label="Прибрати: ' + esc(f.label) + '">' + icon('x') + '</button></span>' +
            '</div></li>';
        }).join('') + (s.fields.length ? '' : '<li class="ws-field-empty">У кроці немає полів — додайте або перенесіть сюди поле.</li>') + '</ul>' +
        '<button type="button" class="ws-add" data-act="add" data-si="' + si + '">' + icon('plus') + 'Додати поле</button></li>';
    });
    h += '</ol><button type="button" class="ws-btn ws-preview-open" data-act="preview">' + icon('phone') + 'Переглянути як заявник</button>' +
      '<section class="ws-outputs" aria-labelledby="wsOut"><h2 class="ws-h3" id="wsOut">Що вийде в кінці</h2><ul>' +
      sc.outputs.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></section>' +
      '<div class="ws-next ws-next--build"><button type="button" class="ws-btn ws-btn--primary" data-act="create">' + (t.kind === 'draft' ? 'Створити прототип' : 'Відкрити прототип') + icon('arrow') + '</button></div>' +
      '<details class="ws-faq"><summary>Часті питання</summary><dl>' + sc.faq.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl></details>' +
      '</div><aside class="ws-build-side" aria-label="Як це побачить заявник">' + phonePreview(t) + '</aside></div></section>';
    main.innerHTML = h;
  }
  function phonePreview(t) {
    var steps = t.schema.steps;
    return '<p class="ws-side-title">Як це побачить заявник</p>' +
      '<div class="ws-phone"><div class="ws-phone-screen" inert>' + formHtml({ title: t.title, schema: t.schema }, { step: t.sel, values: {} }, 'preview') + '</div></div>' +
      /* «‹ Крок 2 з 5 · Ваша ситуація ›» instead of a row of numbers */
      '<div class="ws-phone-steps" role="group" aria-label="Крок у перегляді">' +
        '<button type="button" class="ws-phone-arrow" data-act="sel-step" data-si="' + Math.max(0, t.sel - 1) + '" aria-label="Попередній крок"' + (t.sel === 0 ? ' disabled' : '') + '>' + icon('prev') + '</button>' +
        '<span class="ws-phone-step" aria-live="polite"><b>Крок ' + (t.sel + 1) + ' з ' + steps.length + '</b> · ' + esc(steps[t.sel] ? steps[t.sel].title : '') + '</span>' +
        '<button type="button" class="ws-phone-arrow" data-act="sel-step" data-si="' + Math.min(steps.length - 1, t.sel + 1) + '" aria-label="Наступний крок"' + (t.sel >= steps.length - 1 ? ' disabled' : '') + '>' + icon('next') + '</button></div>';
  }
  function findField(sc, fid) {
    for (var si = 0; si < sc.steps.length; si++) {
      var fi = sc.steps[si].fields.map(function (f) { return f.id; }).indexOf(fid);
      if (fi > -1) return { si: si, fi: fi, f: sc.steps[si].fields[fi] };
    }
    return null;
  }
  function moveField(sc, fid, dir) {
    var at = findField(sc, fid);
    if (!at) return;
    var fields = sc.steps[at.si].fields;
    if (dir < 0) {
      if (at.fi > 0) { fields.splice(at.fi, 1); fields.splice(at.fi - 1, 0, at.f); }
      else if (at.si > 0) { fields.splice(0, 1); sc.steps[at.si - 1].fields.push(at.f); }
    } else {
      if (at.fi < fields.length - 1) { fields.splice(at.fi, 1); fields.splice(at.fi + 1, 0, at.f); }
      else if (at.si < sc.steps.length - 1) { fields.splice(at.fi, 1); sc.steps[at.si + 1].fields.unshift(at.f); }
    }
  }
  function rebuild(keepScroll, focusSel) {
    var y = window.scrollY;
    save();
    renderBuilder(target);
    if (keepScroll) window.scrollTo(0, y);
    if (focusSel) { var b = main.querySelector(focusSel); if (b && !b.disabled) b.focus(); }
  }

  /* the add-field sheet and the full-screen preview live in #wsLayer */
  function openSheet(si) {
    sheet = { si: si, type: 'text' };
    var s = target.schema.steps[si];
    layer.innerHTML = '<div class="ws-scrim" data-act="sheet-close"></div><div class="ws-sheet" id="wsSheet" role="dialog" aria-modal="true" aria-labelledby="wsSheetT">' +
      '<h2 class="ws-h3" id="wsSheetT">Нове поле · «' + esc(s.title) + '»</h2>' +
      '<label class="ws-sheet-label" for="wsFieldName">Назва поля</label><input id="wsFieldName" class="ws-input" placeholder="Наприклад: Дата народження" autocomplete="off">' +
      '<span class="ws-sheet-label" id="wsTypeL">Тип</span><div class="ws-types" role="radiogroup" aria-labelledby="wsTypeL">' + W.FIELD_TYPES.map(function (x) {
        return '<button type="button" class="ws-example" role="radio" data-act="sheet-type" data-ftype="' + x[0] + '" aria-checked="' + (x[0] === 'text') + '">' + esc(x[1]) + '</button>';
      }).join('') + '</div><p class="ws-err" data-sheet-err></p>' +
      '<div class="ws-sheet-actions"><button type="button" class="ws-btn" data-act="sheet-close">Скасувати</button><button type="button" class="ws-btn ws-btn--primary" data-act="sheet-add">Додати</button></div></div>';
    layer.hidden = false;
    document.body.classList.add('ws-locked');
    document.getElementById('wsFieldName').focus();
  }
  function openOverlay() {
    overlay = true;
    layer.innerHTML = '<div class="ws-overlay" role="dialog" aria-modal="true" aria-label="Перегляд як заявник"><div class="ws-overlay-bar"><span>Як це побачить заявник</span>' +
      '<button type="button" class="ws-btn ws-btn--small" data-act="overlay-close">Закрити</button></div><div class="ws-overlay-body">' + phonePreview(target) + '</div></div>';
    layer.hidden = false;
    document.body.classList.add('ws-locked');
  }
  function closeLayers() {
    sheet = null; overlay = false;
    if (!layer.hidden) { layer.hidden = true; layer.innerHTML = ''; }
    document.body.classList.remove('ws-locked');
  }

  /* ============================== prototype ============================== */
  function liveSteps(p) { return p.schema.steps.filter(function (s) { return s.fields.length; }); }
  function formHtml(p, run, mode) {
    var steps = liveSteps(p);
    if (!steps.length) return '<div class="pf"><p class="pf-empty">У формі немає полів.</p></div>';
    var si = Math.min(run.step || 0, steps.length - 1), s = steps[si], v = run.values || {};
    var hasPhoto = s.fields.some(function (f) { return f.type === 'photo'; });
    var h = '<div class="pf" data-mode="' + mode + '">' +
      '<header class="pf-head"><span class="pf-org">' + esc(W.ORG.name) + '</span><p class="pf-title">' + esc(p.title) + '</p></header>' +
      '<div class="pf-progress"><span>Крок ' + (si + 1) + ' з ' + steps.length + '</span><div class="pf-bar"><i style="width:' + Math.round(((si + 1) / steps.length) * 100) + '%"></i></div></div>' +
      '<h2 class="pf-step">' + esc(s.title) + '</h2>';
    if (hasPhoto) h += '<ul class="pf-rules"><li>Без відблисків</li><li>Краї не обрізані</li><li>Текст читається</li></ul>';
    h += s.fields.map(function (f) { return fieldHtml(f, v[f.id], mode); }).join('');
    h += '<div class="pf-nav">' + (si > 0 ? '<button type="button" class="pf-btn" data-act="pf-back">Назад</button>' : '') +
      '<button type="button" class="pf-btn pf-btn--primary" data-act="pf-next">' + (si === steps.length - 1 ? 'Надіслати заявку' : 'Далі') + '</button></div></div>';
    return h;
  }
  function optional(f) { return f.req ? '' : '<span class="pf-opt">необов’язково</span>'; }
  function fieldHtml(f, val, mode) {
    var id = mode + '_' + f.id, err = '<span class="pf-error" data-err-for="' + f.id + '"></span>';
    var hint = f.hint && f.type !== 'photo' ? '<span class="pf-hint">' + esc(f.hint) + '</span>' : '';
    if (f.type === 'choice') {
      var sel = f.multi ? (val || []) : (val ? [val] : []);
      return '<fieldset class="pf-field" data-field="' + f.id + '"><legend class="pf-label">' + esc(f.label) + optional(f) + '</legend>' + hint +
        (f.multi ? '<span class="pf-hint">Можна кілька.</span>' : '') +
        '<div class="pf-chips">' + (f.options || []).map(function (o) {
          return '<button type="button" class="pf-chip" data-act="pf-pick" data-fid="' + f.id + '" data-v="' + esc(o) + '" aria-pressed="' + (sel.indexOf(o) > -1) + '">' + esc(o) + '</button>';
        }).join('') + '</div>' + err + '</fieldset>';
    }
    if (f.type === 'consent') {
      return '<div class="pf-field" data-field="' + f.id + '"><button type="button" class="pf-consent" role="checkbox" aria-checked="' + !!val + '" data-act="pf-consent" data-fid="' + f.id + '">' +
        '<span class="pf-box" aria-hidden="true">' + icon('check') + '</span><span>' + esc(f.label) + optional(f) + '</span></button>' + err + '</div>';
    }
    if (f.type === 'photo') {
      var file = val && val.name ? val : null;
      return '<div class="pf-field pf-photo' + (file ? ' is-filled' : '') + '" data-field="' + f.id + '"><div class="pf-guide">' + guideSvg(f.guide) + '</div><div class="pf-photo-main">' +
        '<span class="pf-label">' + esc(f.label) + optional(f) + '</span><span class="pf-hint">' + esc(f.hint || '') + '</span>' +
        (file
          ? '<div class="pf-file">' + (file.dataUrl ? '<img src="' + file.dataUrl + '" alt="Фото: ' + esc(f.label) + '">' : '') + '<span>' + esc(file.name) + '</span>' +
            '<button type="button" class="pf-link" data-act="pf-photo-remove" data-fid="' + f.id + '">Замінити</button></div>'
          : '<div class="pf-photo-actions"><label class="pf-btn pf-btn--small">' + icon('cam') + 'Сфотографувати<input type="file" accept="image/*" data-photo="' + f.id + '" hidden' + (mode === 'preview' ? ' disabled' : '') + '></label></div>') +
        err + '</div></div>';
    }
    if (f.type === 'signature') {
      return '<div class="pf-field" data-field="' + f.id + '"><span class="pf-label">' + esc(f.label) + optional(f) + '</span>' +
        '<div class="pf-sig' + (val ? ' has-content' : '') + '" data-sig="' + f.id + '"><canvas aria-label="Поле для підпису"></canvas><span class="pf-sig-ph">Підпишіть пальцем</span></div>' +
        '<button type="button" class="pf-link pf-sig-clear" data-act="pf-sig-clear" data-fid="' + f.id + '">Очистити підпис</button>' + err + '</div>';
    }
    var attrs = f.type === 'phone' ? ' type="tel" inputmode="tel" placeholder="+380 __ ___ __ __" autocomplete="tel"'
      : f.type === 'date' ? ' inputmode="numeric" placeholder="ДД.ММ.РРРР"'
        : f.type === 'amount' ? ' inputmode="numeric" placeholder="0"' : '';
    var input = '<input id="' + id + '" class="pf-input" data-fv="' + f.id + '" data-ftype="' + f.type + '"' + attrs + ' value="' + esc(val || '') + '">';
    if (f.type === 'amount') input = '<span class="pf-amount">' + input + '<span>грн</span></span>';
    return '<div class="pf-field" data-field="' + f.id + '"><label class="pf-label" for="' + id + '">' + esc(f.label) + optional(f) + '</label>' + hint + input + err + '</div>';
  }

  function fmtPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('380') === 0) d = d.slice(3); else if (d.indexOf('80') === 0 && d.length > 10) d = d.slice(2); else if (d[0] === '0') d = d.slice(1);
    d = d.slice(0, 9);
    if (!d) return '';
    var g = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return '+380 ' + g.join(' ');
  }
  function fmtDate(raw) {
    var d = String(raw || '').replace(/\D/g, '').slice(0, 8);
    return d.length > 4 ? d.slice(0, 2) + '.' + d.slice(2, 4) + '.' + d.slice(4) : d.length > 2 ? d.slice(0, 2) + '.' + d.slice(2) : d;
  }
  function validDate(s) {
    var m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return false;
    var dt = new Date(+m[3], +m[2] - 1, +m[1]);
    return dt.getDate() === +m[1] && dt.getMonth() === +m[2] - 1 && +m[3] >= 1900 && +m[3] <= 2100;
  }
  function fieldProblem(f, v) {
    var empty = v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !v.name);
    if (empty) {
      if (!f.req) return '';
      return { photo: 'Додайте фото', signature: 'Поставте підпис', consent: 'Потрібна ваша згода', choice: 'Оберіть варіант' }[f.type] || 'Заповніть поле';
    }
    if (f.type === 'phone' && String(v).replace(/\D/g, '').length !== 12) return 'Номер має бути у форматі +380 XX XXX XX XX';
    if (f.type === 'date' && !validDate(v)) return 'Дата у форматі ДД.ММ.РРРР';
    if (f.type === 'amount' && !(+String(v).replace(/\D/g, '') > 0)) return 'Вкажіть суму';
    if (f.type === 'text' && String(v).trim().length < 2) return 'Заповніть поле';
    return '';
  }

  var pad = null, current = null;
  function renderProto(p) {
    current = p;
    var run = p.run;
    var h = '<div class="ws-protobar"><span><b>Прототип</b> · як це побачить заявник</span><a class="ws-link" href="#edit/' + p.id + '">Повернутися до проєкту</a></div>' +
      '<section class="ws-wrap ws-wrap--form ws-proto">';
    if (run.done) {
      h += '<div class="pf pf-done" data-mode="live"><span class="pf-done-mark" aria-hidden="true">' + icon('check') + '</span><h1 class="pf-done-title">Заявку прийнято</h1>' +
        '<p class="pf-done-ref">Номер заявки <b class="pf-ref">' + esc(run.done.ref) + '</b></p>' +
        '<p class="pf-hint">Збережіть номер: за ним можна дізнатися статус. ' + esc(run.done.at) + '</p>' +
        '<div class="pf-after"><p class="pf-label">Що далі</p><ul>' + p.schema.outputs.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="pf-nav"><button type="button" class="pf-btn" data-act="pf-again">Заповнити ще раз</button><a class="pf-btn pf-btn--primary" href="#edit/' + p.id + '">До проєкту</a></div></div>';
    } else {
      h += formHtml(p, run, 'live');
    }
    h += '</section>';
    main.innerHTML = h;
    initPad();
    tips();
  }
  /* bubble «Тестове фото»: every empty photo field of the current step gets an invented sample */
  Stage.action('photo-sample', function () {
    var p = current;
    if (!p || route().view !== 'proto' || p.run.done) return;
    var steps = liveSteps(p), st = steps[Math.min(p.run.step, steps.length - 1)], n = 0;
    st.fields.forEach(function (f) {
      if (f.type !== 'photo' || (p.run.values[f.id] && p.run.values[f.id].name)) return;
      var url = sampleImage(f.label);
      p.run.values[f.id] = { name: f.label.replace(/[^\wА-Яа-яІіЇїЄєҐґ]+/g, '_').slice(0, 32) + '_зразок.jpg', size: Math.round(url.length * 0.75), dataUrl: url };
      n++;
    });
    save(); renderProto(p);
    if (n) D.toast(n === 1 ? 'Додано тестове фото' : 'Додано тестові фото: ' + n);
  });
  function initPad() {
    pad = null;
    var wrap = main.querySelector('.pf[data-mode="live"] [data-sig]');
    if (!wrap || !window.SignaturePad) return;
    var canvas = wrap.querySelector('canvas'), fid = wrap.getAttribute('data-sig');
    var rect = wrap.getBoundingClientRect(), ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    canvas.getContext('2d').scale(ratio, ratio);
    pad = new window.SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: '#1d1b2b', minWidth: 0.8, maxWidth: 2.4 });
    var saved = current.run.values[fid];
    if (saved) pad.fromDataURL(saved, { ratio: ratio, width: rect.width, height: rect.height }).catch(function () {});
    pad.addEventListener('beginStroke', function () { wrap.classList.add('has-content'); });
    pad.addEventListener('endStroke', function () {
      if (pad.isEmpty()) return;
      current.run.values[fid] = pad.toDataURL('image/png');
      setFieldError(fid, '');
      save();
    });
  }
  function setFieldError(fid, msg) {
    var e = main.querySelector('[data-err-for="' + fid + '"]');
    if (e) e.textContent = msg;
    var box = main.querySelector('[data-field="' + fid + '"]');
    if (box) box.classList.toggle('is-invalid', !!msg);
  }
  function protoNext() {
    var p = current, steps = liveSteps(p), si = Math.min(p.run.step, steps.length - 1), s = steps[si], bad = null;
    s.fields.forEach(function (f) {
      var msg = fieldProblem(f, p.run.values[f.id]);
      setFieldError(f.id, msg);
      if (msg && !bad) bad = f.id;
    });
    if (bad) {
      var el = main.querySelector('[data-field="' + bad + '"]');
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    if (si < steps.length - 1) { p.run.step = si + 1; save(); renderProto(p); window.scrollTo(0, 0); return; }
    p.run.count = (p.run.count || 0) + 1;
    p.run.done = { ref: refNumber(p), at: 'Подано ' + today() + '.' };
    save(); renderProto(p); window.scrollTo(0, 0);
  }
  function refNumber(p) {
    var s = p.id + ':' + p.run.count + ':' + p.title, hsh = 7;
    for (var i = 0; i < s.length; i++) hsh = (hsh * 31 + s.charCodeAt(i)) % 9000;
    return W.TYPES[p.type].ref + '-' + new Date().getFullYear() + '-' + String(1000 + hsh);
  }
  function sampleImage(label) {
    var c = document.createElement('canvas');
    c.width = 900; c.height = 600;
    var x = c.getContext('2d');
    x.fillStyle = '#e4e1ef'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#ffffff'; x.fillRect(50, 50, c.width - 100, c.height - 100);
    x.fillStyle = '#d6d2e8'; x.fillRect(90, 100, 200, 250);
    x.fillStyle = '#a9a5c4';
    for (var i = 0; i < 5; i++) x.fillRect(330, 110 + i * 46, 420 - i * 40, 16);
    x.fillStyle = '#6b4ce6'; x.font = '600 52px "Fixel Text", system-ui, sans-serif';
    x.fillText('ЗРАЗОК · ДЕМО', 90, c.height - 110);
    x.fillStyle = '#5b5870'; x.font = '400 28px "Fixel Text", system-ui, sans-serif';
    x.fillText(String(label).slice(0, 44), 90, c.height - 160);
    return c.toDataURL('image/jpeg', 0.78);
  }
  function readImage(file, max) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type)) { resolve(null); return; }
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = function () { resolve(null); };
        img.src = r.result;
      };
      r.onerror = function () { resolve(null); };
      r.readAsDataURL(file);
    });
  }

  /* ============================== events ============================== */
  function onClick(e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var act = b.getAttribute('data-act'), d = S.draft;

    /* home */
    if (act === 'new') { S.draft = newDraft(); save(); go('#new'); return; }
    if (act === 'resume') { go(d && d.type && d.qi >= qs(d).length - 1 ? '#check' : '#new'); return; }

    /* questions */
    if (act === 'back') {
      var r = route().view;
      if (r === 'new') {
        if (d.ret) { d.ret = false; save(); go('#check'); return; }
        if (d.qi === 0) { go('#'); return; }
        d.qi--; save(); renderQuestion(); window.scrollTo(0, 0); return;
      }
      if (r === 'check') { d.qi = qs(d).length - 1; save(); go('#new'); return; }
      if (r === 'build') { go('#check'); return; }
      go('#'); return;
    }
    if (act === 'example') {
      var inp = document.getElementById('wsTitle');
      inp.value = b.getAttribute('data-v'); questionError(''); inp.focus(); return;
    }
    if (act === 'next') { nextQuestion(); return; }
    if (act === 'skip') { leaveContext(true); return; }
    if (act === 'starter') {
      var ta = document.getElementById('wsCtx'), st = b.getAttribute('data-v').replace(/…$/, ' ');
      d.context = d.context || { text: '', files: [] };
      ta.value = (ta.value.trim() ? ta.value.replace(/\s*$/, ' ') : '') + st;
      d.context.text = ta.value; d.context.skipped = false; save();
      autosize(ta); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      questionError(''); updateCtxInfo(); return;
    }
    if (act === 'link-add') { addLink(); return; }
    if (act === 'link-remove') {
      d.context.links.splice(+b.getAttribute('data-i'), 1); save(); updateCtxInfo();
      var lx = main.querySelector('[data-act="link-remove"]'); (lx || document.getElementById('wsLink')).focus();
      return;
    }
    if (act === 'file-remove') {
      d.context.files.splice(+b.getAttribute('data-i'), 1); save(); updateCtxInfo();
      var fx = main.querySelector('[data-act="file-remove"]'); (fx || document.getElementById('wsFiles')).focus();
      return;
    }
    if (act === 'pick' || act === 'other') {
      var q = qs(d)[d.qi], a = d.answers[q.id], v = b.getAttribute('data-v');
      a.auto = false;
      if (act === 'other') {
        a.otherOn = !a.otherOn;
        if (q.kind === 'single' && a.otherOn) a.sel = [];
        /* turning «Інше» off on a single choice brings the suggestion back instead of leaving nothing chosen */
        if (q.kind === 'single' && !a.otherOn && !a.sel.length && q.defaults) a.sel = q.defaults(ctx(d)).slice(0, 1);
      } else if (q.kind === 'single') {
        a.sel = [v]; a.otherOn = false;
      } else {
        a.sel = a.sel.indexOf(v) > -1 ? a.sel.filter(function (x) { return x !== v; }) : a.sel.concat([v]);
      }
      save(); renderQuestion();
      var again = main.querySelector('[data-act="' + act + '"]' + (v ? '[data-v="' + v + '"]' : ''));
      if (again && act !== 'other') again.focus();
      return;
    }
    if (act === 'quick') {
      var qa = qs(d)[d.qi], aa = d.answers[qa.id];
      aa.value = b.getAttribute('data-v'); aa.auto = false; save(); renderQuestion(); return;
    }

    /* summary */
    if (act === 'edit') { d.qi = +b.getAttribute('data-qi'); d.ret = true; save(); go('#new'); return; }
    if (act === 'build') { d.schema = null; save(); go('#build'); return; }

    /* builder */
    if (act === 'sel-step') {
      target.sel = +b.getAttribute('data-si'); save();
      if (overlay) { layer.querySelector('.ws-overlay-body').innerHTML = phonePreview(target); return; }
      rebuild(true, b.closest('.ws-build-side') ? '.ws-build-side .ws-phone-arrow[aria-label="' + b.getAttribute('aria-label') + '"]' : '.ws-step[data-step="' + target.sel + '"] .ws-step-head');
      return;
    }
    if (act === 'req') { var at = findField(target.schema, b.getAttribute('data-fid')); at.f.req = !at.f.req; rebuild(true, '[data-act="req"][data-fid="' + at.f.id + '"]'); return; }
    if (act === 'up' || act === 'down') {
      var fid = b.getAttribute('data-fid');
      moveField(target.schema, fid, act === 'up' ? -1 : 1);
      var now = findField(target.schema, fid); target.sel = now.si;
      rebuild(true, '[data-act="' + act + '"][data-fid="' + fid + '"]'); return;
    }
    if (act === 'remove') {
      var rm = findField(target.schema, b.getAttribute('data-fid'));
      target.schema.steps[rm.si].fields.splice(rm.fi, 1);
      D.toast('Поле «' + rm.f.label + '» прибрано');
      rebuild(true); return;
    }
    if (act === 'add') { openSheet(+b.getAttribute('data-si')); return; }
    if (act === 'sheet-type') {
      sheet.type = b.getAttribute('data-ftype');
      Array.prototype.forEach.call(layer.querySelectorAll('[data-act="sheet-type"]'), function (x) { x.setAttribute('aria-checked', String(x === b)); });
      return;
    }
    if (act === 'sheet-close') { closeLayers(); return; }
    if (act === 'sheet-add') {
      var name = (document.getElementById('wsFieldName').value || '').trim();
      if (!name) { layer.querySelector('[data-sheet-err]').textContent = 'Напишіть назву поля.'; return; }
      var nf = W.newField(target.schema, name, sheet.type), si = sheet.si;
      target.schema.steps[si].fields.push(nf);
      target.sel = si;
      closeLayers(); rebuild(true);
      var row = main.querySelector('[data-fid="' + nf.id + '"]');
      if (row) row.scrollIntoView({ block: 'center' });
      D.toast('Поле «' + name + '» додано');
      return;
    }
    if (act === 'preview') { openOverlay(); return; }
    if (act === 'overlay-close') { closeLayers(); return; }
    if (act === 'create') {
      if (!target.schema.steps.some(function (s) { return s.fields.length; })) { D.toast('Додайте хоча б одне поле', { error: true }); return; }
      if (target.kind === 'project') { var pp = project(target.id); pp.run = { step: 0, values: {}, done: null, count: pp.run.count || 0 }; save(); go('#p/' + target.id); return; }
      S.n++;
      var p = { id: 'p' + S.n, title: d.title, type: d.type, base: d.base, context: d.context || null, answers: d.answers, schema: d.schema, created: today(), sel: 0, run: { step: 0, values: {}, done: null, count: 0 } };
      S.projects.unshift(p); S.draft = null; save();
      D.toast('Проєкт «' + p.title + '» додано до ваших проєктів');
      go('#p/' + p.id); return;
    }

    /* prototype */
    var P = current;
    if (!P) return;
    if (act === 'pf-next') { protoNext(); return; }
    if (act === 'pf-back') { P.run.step = Math.max(0, P.run.step - 1); save(); renderProto(P); window.scrollTo(0, 0); return; }
    if (act === 'pf-again') { P.run = { step: 0, values: {}, done: null, count: P.run.count }; save(); renderProto(P); window.scrollTo(0, 0); return; }
    var pfid = b.getAttribute('data-fid'), pf = pfid ? findField(P.schema, pfid) : null;
    if (act === 'pf-pick') {
      var pv = b.getAttribute('data-v');
      if (pf.f.multi) {
        var arr = P.run.values[pfid] || [];
        P.run.values[pfid] = arr.indexOf(pv) > -1 ? arr.filter(function (x) { return x !== pv; }) : arr.concat([pv]);
      } else P.run.values[pfid] = pv;
      var chosen = pf.f.multi ? P.run.values[pfid] : [P.run.values[pfid]];
      Array.prototype.forEach.call(b.parentNode.querySelectorAll('.pf-chip'), function (x) { x.setAttribute('aria-pressed', String(chosen.indexOf(x.getAttribute('data-v')) > -1)); });
      setFieldError(pfid, ''); save(); return;
    }
    if (act === 'pf-consent') {
      P.run.values[pfid] = !P.run.values[pfid];
      b.setAttribute('aria-checked', String(!!P.run.values[pfid]));
      setFieldError(pfid, ''); save(); return;
    }
    if (act === 'pf-photo-remove') { delete P.run.values[pfid]; save(); renderProto(P); return; }
    if (act === 'pf-sig-clear') {
      if (pad) pad.clear();
      delete P.run.values[pfid];
      var sw = main.querySelector('[data-sig="' + pfid + '"]'); if (sw) sw.classList.remove('has-content');
      save(); return;
    }
  }
  main.addEventListener('click', onClick);
  layer.addEventListener('click', onClick);

  main.addEventListener('input', function (e) {
    var t = e.target, d = S.draft;
    if (t.hasAttribute('data-title')) { questionError(''); return; }
    if (t.hasAttribute('data-link')) { var le = main.querySelector('[data-link-err]'); if (le) le.textContent = ''; return; }
    if (t.hasAttribute('data-ctx')) {
      d.context = d.context || { text: '', files: [], links: [] };
      d.context.text = t.value; d.context.skipped = false;
      autosize(t); questionError(''); save(); updateCtxInfo(); return;
    }
    if (t.hasAttribute('data-other') || t.hasAttribute('data-desc') || t.hasAttribute('data-amount')) {
      var a = d.answers[qs(d)[d.qi].id];
      a.auto = false;
      if (t.hasAttribute('data-other')) a.other = t.value;
      else if (t.hasAttribute('data-desc')) { a.value = t.value; autosize(t); }
      else { var raw = t.value.replace(/\D/g, '').slice(0, 9); a.value = raw; t.value = raw ? W.fmtNum(raw) : ''; }
      questionError(''); save(); return;
    }
    if (t.hasAttribute('data-fv') && current) {
      var ft = t.getAttribute('data-ftype'), fid = t.getAttribute('data-fv');
      if (ft === 'phone') t.value = fmtPhone(t.value);
      else if (ft === 'date') t.value = fmtDate(t.value);
      else if (ft === 'amount') { var n = t.value.replace(/\D/g, '').slice(0, 9); t.value = n ? W.fmtNum(n) : ''; }
      current.run.values[fid] = t.value;
      setFieldError(fid, ''); save();
    }
  });
  main.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('#wsLink')) { e.preventDefault(); addLink(); return; }
    if (e.key === 'Enter' && e.target.matches('#wsTitle, #wsOther, #wsAmount')) { e.preventDefault(); nextQuestion(); }
  });
  layer.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'wsFieldName') { e.preventDefault(); onClick({ target: layer.querySelector('[data-act="sheet-add"]') }); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !layer.hidden) closeLayers(); });
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-files')) { addFiles(t.files); t.value = ''; return; }
    if (!t.hasAttribute('data-photo') || !t.files[0] || !current) return;
    var fid = t.getAttribute('data-photo'), file = t.files[0];
    readImage(file, 1000).then(function (url) {
      if (!url) { setFieldError(fid, 'Це не схоже на фото. Оберіть зображення.'); return; }
      current.run.values[fid] = { name: file.name, size: file.size, dataUrl: url };
      save(); renderProto(current);
    });
  });
  /* drag and drop onto the documents zone; elsewhere a dropped file must not open in the tab */
  document.addEventListener('dragover', function (e) {
    var zone = e.target.closest && e.target.closest('[data-drop]');
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = zone ? 'copy' : 'none';
    Array.prototype.forEach.call(document.querySelectorAll('[data-drop]'), function (z) { z.classList.toggle('is-over', z === zone); });
  });
  document.addEventListener('dragleave', function (e) {
    var zone = e.target.closest && e.target.closest('[data-drop]');
    if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-over');
  });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    var zone = e.target.closest && e.target.closest('[data-drop]');
    Array.prototype.forEach.call(document.querySelectorAll('[data-drop]'), function (z) { z.classList.remove('is-over'); });
    if (zone && e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    if (route().view === 'proto' && pad) initPad();
  });

  render();
})();
