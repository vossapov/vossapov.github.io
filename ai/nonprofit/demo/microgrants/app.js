/* Microgrants v3 demo — router and the demo controls outside the product frame.
   One shared record (MGStore) seen by two roles; each tab keeps its own role. Synthetic data only: no server,
   no e-mail, no payments; the role switch is a demo control, not a login. */
(function () {
  'use strict';
  var U = window.MGUI, M = window.MGModel, ST = window.MGStore, SEED = window.MGSeed, X = window.MGExports;
  var P = window.MGParticipant, O = window.MGOrganiser, PLAN = window.MGPlan;
  var tr = U.tr, esc = U.esc;
  var main = document.getElementById('mgMain'), panel = document.getElementById('mgDemo');
  if (window.location.hash === '#builder') { window.location.replace('/ai/nonprofit/demo/workspace/'); return; }
  if (U.CAPTURE) document.body.classList.add('v3-capture');

  function fileJob(state, id) {
    var f = state.files[id];
    if (/^plan:(pptx|xlsx)$/.test(f.slot)) return X.planFile(state, id);
    if (f.slot === 'agreement:terms') return X.terms(state, f.appId);
    return Promise.reject(new Error('sample'));
  }

  function route() { return (window.location.hash || '').replace(/^#/, '') || ''; }
  function view(state) {
    var s = ST.session(), r = route();
    if (s.role === 'organiser') {
      document.body.setAttribute('data-role', 'organiser');
      if (/^\/org\/app\//.test(r)) return O.app(state, r.split('/')[3]);
      if (r === '/org/selection') return O.selection(state);
      if (r === '/org/sponsor') return O.sponsor(state);
      if (r === '/org/all') return O.all(state);
      if (r !== '/org') { window.history.replaceState(null, '', '#/org'); }
      return O.queues(state);
    }
    document.body.setAttribute('data-role', 'applicant');
    var code = s.appId && state.apps[s.appId] ? s.appId : null;
    if (r === '/track') return P.track();
    if (r === '/sent' && code && P.hasSent()) return P.sent();
    if (!code) { if (r !== '/apply') window.history.replaceState(null, '', '#/apply'); return P.apply(); }
    if (r === '/plan' && ['cabinet_active', 'plan_changes_requested'].indexOf(state.apps[code].status) > -1 && state.apps[code].verification) return PLAN.render(state, code);
    if (r === '/report') return P.report(state, code);
    if (r === '/history') return P.history(state, code);
    if (r !== '/home') window.history.replaceState(null, '', '#/home');
    return P.home(state, code);
  }
  var lastRoute = null, focusNext = false;
  function render() {
    var c = ST.read();
    if (c.error) {
      main.innerHTML = '<section class="v3-p"><h1>' + tr('Не вдалося відкрити збережені дані', 'Could not open the saved data') + '</h1><p>' + U.errText(c.error) + '</p><button type="button" class="d-btn d-btn--primary" data-demo="reset">' + tr('Почати спочатку', 'Start over') + '</button></section>';
      renderPanel(M.initial()); return;
    }
    var r = route();
    main.innerHTML = view(c.state);
    if (r === '/plan' && ST.session().appId) PLAN.refresh(c.state, ST.session().appId);
    if (r !== lastRoute) window.scrollTo(0, 0);
    if (focusNext) { focusNext = false; var h = main.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
    lastRoute = r;
    var title = document.querySelector('.demo-frame-title');
    if (title) title.textContent = ST.session().role === 'organiser' ? tr('Центр підтримки бізнесу · панель організатора', 'Business Support Centre · organiser workspace') : tr('Центр підтримки бізнесу · заявка й кабінет учасника', 'Business Support Centre · application and cabinet');
    renderPanel(c.state);
  }
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  /* ---------------- demo controls (outside the frame) ---------------- */
  var CP_LABEL = {
    submitted: ['Заявку подано', 'Application submitted'], eligible: ['Допущено (первинне схвалення)', 'Admitted (initial approval)'], cabinet: ['Кабінет активовано', 'Cabinet activated'],
    plan_v1: ['Бізнес-план v1 подано', 'Business plan v1 submitted'], plan_changes: ['Повернуто на виправлення', 'Returned for changes'], plan_v2: ['Бізнес-план v2 подано', 'Business plan v2 submitted'],
    package: ['Пакет прийнято', 'Package accepted'], awarded: ['Грант надано (рішення комісії)', 'Grant awarded (committee)'], docs_fix: ['Документ на виправлення', 'Document needs correction'],
    agreement: ['Умови надіслано', 'Terms sent'], confirmed: ['Умови підтверджено', 'Terms confirmed'], implementation: ['Перерахування позначено', 'Transfer marked'],
    purchases: ['Покупки додано', 'Purchases added'], report_v1: ['Звіт v1 подано', 'Report v1 submitted'], report_fix: ['Звіт повернуто', 'Report returned'],
    report_v2: ['Звіт v2 подано', 'Report v2 submitted'], report_accepted: ['Звіт прийнято', 'Report accepted']
  };
  function scenarioOptions() {
    return '<option value="">' + tr('Оберіть сценарій…', 'Choose a scenario…') + '</option><option value="empty">' + tr('Порожня програма', 'Empty programme') + '</option><option value="cohort">' + tr('Когорта з 11 учасників', 'Cohort of 11 participants') + '</option>' +
      '<optgroup label="' + tr('Когорта + історія Ірини до кроку', 'Cohort + Iryna’s story up to') + '">' + SEED.CHECKPOINTS.map(function (c) { return '<option value="cp:' + c.id + '">' + esc(tr(CP_LABEL[c.id][0], CP_LABEL[c.id][1])) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="' + tr('Інші шляхи', 'Other paths') + '"><option value="br:rejected">' + tr('Заявку не допущено', 'Application not admitted') + '</option><option value="br:withdrawn">' + tr('Учасниця відкликала заявку', 'The participant withdrew') + '</option></optgroup>';
  }
  function renderPanel(state) {
    if (!panel) return;
    var s = ST.session(), codes = state.order;
    var other = s.role === 'organiser' ? 'applicant' : 'organiser';
    var otherUrl = window.location.pathname + '?role=' + other + (U.LANG === 'en' ? '&lang=en' : '') + (other === 'organiser' ? '#/org' : '#/home');
    panel.innerHTML = '<div class="v3-demo-in">' +
      '<div class="v3-demo-row"><span class="v3-demo-k">' + tr('Роль у цій вкладці', 'Role in this tab') + '</span><div class="v3-seg" role="group" aria-label="' + tr('Роль', 'Role') + '">' +
      '<button type="button" data-demo="role" data-v="applicant" aria-pressed="' + (s.role !== 'organiser') + '">' + tr('Учасник', 'Participant') + '</button><button type="button" data-demo="role" data-v="organiser" aria-pressed="' + (s.role === 'organiser') + '">' + tr('Організатор', 'Organiser') + '</button></div>' +
      '<a class="v3-demo-link" href="' + otherUrl + '" target="_blank" rel="noopener">' + tr('Відкрити іншу роль у новій вкладці', 'Open the other role in a new tab') + '</a>' +
      (s.role !== 'organiser' && codes.length ? '<label class="v3-demo-k" for="demoApp">' + tr('Заявка', 'Application') + '</label><select id="demoApp" class="v3-demo-sel" data-demo="app"><option value="">' + tr('нова заявка', 'new application') + '</option>' + codes.map(function (c) { return '<option value="' + c + '"' + (s.appId === c ? ' selected' : '') + '>' + c + ' · ' + esc(state.apps[c].intake.lastName) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div class="v3-demo-row"><label class="v3-demo-k" for="demoScn">' + tr('Сценарій', 'Scenario') + '</label><select id="demoScn" class="v3-demo-sel" data-demo="scenario">' + scenarioOptions() + '</select>' +
      '<span class="v3-demo-k">' + tr('Демо-дата', 'Demo date') + ' <b data-clock>' + U.date(state.clock) + '</b></span><button type="button" class="v3-demo-btn" data-demo="clock" data-v="1">+1 ' + tr('день', 'day') + '</button><button type="button" class="v3-demo-btn" data-demo="clock" data-v="7">+7 ' + tr('днів', 'days') + '</button>' +
      helper(state, s) + '<a class="v3-demo-btn" href="' + langUrl() + '">' + (U.LANG === 'en' ? 'UA' : 'EN') + '</a><button type="button" class="v3-demo-btn" data-demo="reset">' + tr('Почати спочатку', 'Start over') + '</button></div>' +
      '<p class="v3-demo-note">' + tr('Демо на вигаданих даних у цьому браузері. Ролі перемикаються тут — це не вхід і не захист доступу. Листів і платежів немає: запрошення й повідомлення з’являються в кабінеті, перерахування — ручна позначка.', 'A demo on invented data in this browser. Roles switch here — this is not a login or access control. No e-mails or payments: invitations and messages appear in the cabinet; the transfer is a manual flag.') + '</p></div>';
  }
  function helper(state, s) {
    var r = route();
    if (s.role !== 'organiser' && r === '/apply') return '<button type="button" class="v3-demo-btn" data-demo="prefill-intake">' + tr('Заповнити прикладом', 'Fill with the example') + '</button>';
    if (s.role !== 'organiser' && r === '/plan') return '<button type="button" class="v3-demo-btn" data-demo="prefill-plan">' + tr('Заповнити прикладом', 'Fill with the example') + '</button>';
    return '';
  }
  function langUrl() { var q = new URLSearchParams(window.location.search); q.set('lang', U.LANG === 'en' ? 'ua' : 'en'); return window.location.pathname + '?' + q.toString() + window.location.hash; }
  function buildScenario(v) {
    var events = [], st = M.initial();
    var dispatch = function (state, a) { var r = M.reduce(state, a); if (r.ok) events.push(r.event); return r; };
    var refs = {};
    if (v !== 'empty') { var r1 = SEED.run(st, SEED.cohortSteps(), dispatch, refs); st = r1.state; }
    if (/^cp:/.test(v)) st = SEED.run(st, SEED.storySteps(v.slice(3)), dispatch, refs).state;
    if (/^br:/.test(v)) st = SEED.run(st, SEED.storySteps(null, v.slice(3)), dispatch, refs).state;
    return { events: events, state: st, me: refs.me || null };
  }
  function demoAction(b) {
    var d = b.getAttribute('data-demo'), s = ST.session();
    if (d === 'role') {
      var role = b.getAttribute('data-v');
      ST.setSession({ role: role, appId: s.appId || s.lastAppId || null, lastAppId: s.appId || s.lastAppId || null });
      window.location.hash = role === 'organiser' ? '#/org' : '#/home';
    } else if (d === 'clock') {
      ST.dispatch({ type: 'demo.clock', actor: { role: 'demo' }, p: { days: +b.getAttribute('data-v') } }).then(function (r) { if (!r.ok) U.toast(U.errText(r.error), true); });
    } else if (d === 'reset') {
      U.modal(tr('Почати спочатку?', 'Start over?'), '<p>' + tr('Буде видалено лише дані цього демо (ключі vi-mg-v3). Інші збережені демо не зачіпаються.', 'Only this demo’s data (vi-mg-v3 keys) will be removed. Other saved demos are not touched.') + '</p>',
        [{ label: tr('Скасувати', 'Cancel'), value: null }, { label: tr('Почати спочатку', 'Start over'), value: 'yes', primary: true }]).then(function (v) {
        if (!v) return;
        P.resetUi(); O.resetUi();
        ST.reset().then(function () { window.location.hash = '#/apply'; render(); U.toast(tr('Дані демо скинуто', 'Demo data reset')); });
      });
    } else if (d === 'prefill-intake') { P.prefillIntake(); render(); }
    else if (d === 'prefill-plan') { PLAN.prefill(U.state(), s.appId); render(); }
    return true;
  }
  function onPanelChange(e) {
    var t = e.target, d = t.getAttribute('data-demo');
    if (d === 'app') { ST.setSession({ role: 'applicant', appId: t.value || null, lastAppId: t.value || null }); window.location.hash = t.value ? '#/home' : '#/apply'; render(); }
    if (d === 'scenario' && t.value) {
      var v = t.value;
      U.modal(tr('Завантажити сценарій?', 'Load the scenario?'), '<p>' + tr('Поточні дані цього демо буде замінено. Кожен крок сценарію проходить ті самі перевірки, що й ваші дії.', 'Current demo data will be replaced. Every scenario step passes the same checks as your own actions.') + '</p>',
        [{ label: tr('Скасувати', 'Cancel'), value: null }, { label: tr('Завантажити', 'Load'), value: 'yes', primary: true }]).then(function (ok) {
        if (!ok) { t.value = ''; return; }
        var built = null;
        ST.replaceWith(function () { built = buildScenario(v); return built; }).then(function (r) {
          if (!r.ok) { U.toast(U.errText(r.error), true); return; }
          P.resetUi(); O.resetUi();
          var s = ST.session();
          if (s.role !== 'organiser') { ST.setSession({ role: 'applicant', appId: built.me, lastAppId: built.me }); window.location.hash = built.me ? '#/home' : '#/apply'; }
          render(); U.toast(tr('Сценарій завантажено', 'Scenario loaded'));
        });
      });
    }
  }

  /* ---------------- events ---------------- */
  main.addEventListener('click', function (e) {
    var demo = e.target.closest('[data-demo]'); if (demo) { demoAction(demo); return; }
    if (ST.session().role === 'organiser') { O.onClick(e, rerender); return; }
    if (PLAN.onClick(e, rerender)) return;
    P.onClick(e, rerender);
  });
  main.addEventListener('submit', function (e) { if (ST.session().role === 'organiser') O.onSubmit(e); else P.onSubmit(e); });
  main.addEventListener('input', function (e) { if (ST.session().role === 'organiser') { O.onInput(e); return; } if (!PLAN.onInput(e)) P.onInput(e); });
  main.addEventListener('change', function (e) {
    if (ST.session().role === 'organiser') { O.onChange(e, rerender); return; }
    if (!PLAN.onChange(e, rerender) && e.target.getAttribute('data-rep') === 'inUse') P.onInput(e);
  });
  if (panel) {
    panel.addEventListener('click', function (e) { var b = e.target.closest('[data-demo]'); if (b && b.tagName !== 'SELECT') demoAction(b); });
    panel.addEventListener('change', onPanelChange);
  }
  window.addEventListener('hashchange', function () { focusNext = true; render(); });

  /* another tab changed the shared record: refresh, unless the user is typing here */
  var live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
  var pendingBanner = null;
  ST.subscribe(function (state, origin) {
    if (origin !== 'external') { rerender(); return; }
    var ae = document.activeElement;
    if (ae && main.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'checkbox' && ae.type !== 'radio') {
      if (!pendingBanner) {
        pendingBanner = document.createElement('div'); pendingBanner.className = 'v3-sync';
        pendingBanner.innerHTML = '<span>' + tr('Дані змінилися в іншій вкладці.', 'The data changed in another tab.') + '</span><button type="button" class="d-btn d-btn--small">' + tr('Оновити', 'Refresh') + '</button>';
        pendingBanner.querySelector('button').addEventListener('click', function () { pendingBanner.remove(); pendingBanner = null; rerender(); });
        main.insertBefore(pendingBanner, main.firstChild);
      }
      return;
    }
    rerender();
    live.textContent = tr('Оновлено: зміни з іншої вкладки', 'Updated: changes from another tab');
  });

  window.MGState = { fileJob: fileJob, rerender: rerender, render: render, buildScenario: buildScenario };
  main.innerHTML = '<p class="v3-empty" style="padding:24px">' + tr('Завантаження…', 'Loading…') + '</p>';
  ST.ready().then(render);
})();
