/* Microgrants demo — an existing project of the workspace (/ai/nonprofit/demo/workspace/), two views
   over one browser-only state:
   #cabinet   the applicant's single link (mobile-first): stages, guided form, live checks, files
   #dashboard the organiser's table, reminders, receipts, FAQ over the instruction text — kept working
              but unlinked until it is redesigned
   The old #builder walkthrough is replaced by the workspace's guided "new project" flow.
   Deterministic and offline: no live model, no API keys, no e-mail, nothing leaves the browser. */
(function () {
  'use strict';

  var WORKSPACE = '/ai/nonprofit/demo/workspace/';
  if (window.location.hash === '#builder') { window.location.replace(WORKSPACE); return; }

  var D = window.NGODemo, C = window.MGChecks, DATA = window.MGData, OUT = window.MGOutputs, CORPUS = window.MGCorpus;
  var esc = D.esc;
  var store = D.store('vi-ngo-demo-microgrants');
  var main = document.getElementById('mgMain');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Stage = window.NGOStage || { state: function () {}, action: function () {} };

  var FIELDS_EMPTY = {};
  C.REQUIRED.forEach(function (r) { FIELDS_EMPTY[r[0]] = ''; });
  ['members', 'otherInfo', 'otherVuln', 'demand', 'totalNeeded', 'grantRequested', 'ownContribution', 'ownUse', 'startupText'].forEach(function (k) { FIELDS_EMPTY[k] = ''; });
  FIELDS_EMPTY.vulnerabilities = [];
  FIELDS_EMPTY.startup = 'no';

  function defaults() {
    var features = {};
    DATA.FEATURES.forEach(function (f) { features[f.id] = true; });
    return {
      features: features,
      stage2: { choice: '', video: null },
      form: JSON.parse(JSON.stringify(FIELDS_EMPTY)), items: [], photos: [], formStep: 0,
      sub3: null, stage4: false,
      docs: { ptype: '', files: {}, ibanBank: false, typedIban: '' }, sub4: null,
      log: [], dashFilter: 'all', faqQ: ''
    };
  }
  var S = (function () {
    var saved = store.get(), base = defaults();
    if (!saved || typeof saved !== 'object') return base;
    Object.keys(base).forEach(function (k) { if (saved[k] === undefined) saved[k] = base[k]; });
    /* the tool counts as built now, with every feature on; drop the old builder's fields */
    saved.features = base.features;
    delete saved.built; delete saved.bStep; delete saved.brief;
    return saved;
  })();
  function save() {
    if (!store.set(S)) {
      var lite = JSON.parse(JSON.stringify(S));
      lite.photos = []; lite.docs.files = {};
      store.set(lite);
    }
  }
  function on(id) { return !!S.features[id]; }
  function stamp() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function logEvent(kind, text) { S.log.unshift({ at: stamp(), kind: kind, text: text }); S.log = S.log.slice(0, 30); }
  function fmtBytes(n) { return n < 1024 * 1024 ? (n / 1024).toFixed(0) + ' KB' : (n / (1024 * 1024)).toFixed(1) + ' MB'; }
  function icon(name) {
    var p = {
      check: 'M5 12.5l4.2 4.2L19 7',
      arrow: 'M5 12h14M13 6l6 6-6 6',
      file: 'M7 3h7l5 5v13H7zM14 3v5h5',
      up: 'M12 19V6M6 11l6-6 6 6',
      lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
      dl: 'M12 4v12M6 11l6 6 6-6M5 20h14'
    }[name];
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + p + '"/></svg>';
  }

  /* ============================== router ============================== */
  function view() {
    var h = (window.location.hash || '').replace('#', '');
    return h === 'dashboard' ? h : 'cabinet';
  }
  function render() {
    var v = view();
    document.body.setAttribute('data-view', v);
    Array.prototype.forEach.call(document.querySelectorAll('.mg-tab'), function (t) {
      if (t.getAttribute('data-view') === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    if (v === 'cabinet') { renderCabinet(); if (stageNow() === 3) refreshChecks(); }
    else renderDashboard();
    Stage.state(tipKey());
  }
  function tipKey() {
    if (view() === 'dashboard') return 'dashboard';
    if (ui.sheet) return 'faq';
    var cur = stageNow();
    if (cur === 2 || ui.open2) return S.stage2.choice === 'video' && !S.stage2.video ? 'stage2-video' : 'stage2';
    if (cur === 3) { var i = S.formStep || 0; return i >= GROUPS.length ? 'stage3-review' : i === 6 ? 'stage3-budget' : i === 11 ? 'stage3-photos' : 'stage3'; }
    if (cur === 4) return S.stage4 ? 'stage4' : 'stage4-wait';
    return 'stage5';
  }
  window.addEventListener('hashchange', function () {
    if (window.location.hash === '#builder') { window.location.replace(WORKSPACE); return; }
    render(); window.scrollTo(0, 0);
  });

  /* ============================== cabinet ============================== */
  var GROUPS = [
    { t: 'Титульна сторінка', s: 'Слайд 1', f: [['lastName', 'Прізвище'], ['firstName', 'Ім’я'], ['ideaTitle', 'Назва бізнес-ідеї', 'Коротко поясніть, що реалізуєте: не «Розвиток бізнесу», а «Розширення виробництва домашньої випічки».']] },
    { t: 'Про вас і родину', s: 'Слайд 2', f: [['age', 'Вік', '', 'num'], ['family', 'Склад родини', 'Не лише цифра: «4 особи: заявниця, чоловік, двоє дітей — 8 і 14 років».'],
      ['familyIncome', 'Середньомісячний дохід сім’ї, грн', '', 'num'], ['members', 'Кількість членів сім’ї', 'Дохід на одну особу порахуємо самі.', 'num'],
      ['community', 'Громада'], ['settlement', 'Населений пункт'], ['education', 'Освіта', 'Підкресліть навчання, пов’язане з бізнесом.'], ['otherInfo', 'Інша інформація', 'Якщо нічого — «не застосовується».']] },
    { t: 'Вразливості', s: 'Слайд 3', f: [['vulnerabilities', 'Що стосується вас або родини', 'Можна кілька. Позначайте лише те, чому відповідаєте.', 'vuln'], ['otherVuln', 'Інше — поясніть']] },
    { t: 'Про бізнес', s: 'Слайд 4', f: [['registered', 'Чи має бізнес офіційну реєстрацію', 'Наприклад: «Так, ФОП з 2023 року» або «Ні».'], ['mainIncome', 'Чи є бізнес основним джерелом доходу'],
      ['employees', 'Працевлаштовані особи', 'Скільки й які функції; або «найманих працівників немає».'], ['newJobs', 'Нові робочі місця', 'Лише якщо справді плануєте: скільки, для кого, коли.'],
      ['experience', 'Досвід', 'Скільки часу, у якій сфері, що робите, чи є постійні клієнти.', 'area'], ['grants', 'Отримані раніше гранти', 'Хто, коли, від кого, скільки, на що; або «не отримував/ла».', 'area']] },
    { t: 'Бізнес-ідея', s: 'Слайд 5', f: [['ideaDesc', 'Опис бізнес-ідеї', 'Що пропонуєте? Кому? Де? Чому це потрібно клієнтам? Що зміниться завдяки гранту?', 'area'], ['demand', 'Чим підтверджується попит', 'Постійні клієнти, повторні замовлення, немає такої послуги поруч, продажі в соцмережах.', 'area']] },
    { t: 'Мета гранту', s: 'Слайд 6', f: [['goal', 'Основна мета', '', 'goal'], ['incomeImpact', 'Як це вплине на дохід родини', 'Ланцюжок: що купите → що це дасть змогу → який результат.', 'area']] },
    { t: 'Бюджет', s: 'Слайд 7 · кошторис', f: [['totalNeeded', 'Загальна сума на бізнес-ідею, грн', 'Сума всіх позицій — і грантових, і власних.', 'num'], ['grantRequested', 'Сума грантових коштів, грн', 'До 59 000 грн. Має збігатися з кошторисом.', 'num'], ['items', '', '', 'items']] },
    { t: 'Власний внесок і закупівлі', s: 'Слайд 8', f: [['ownContribution', 'Власний внесок, грн', 'Якщо немає — 0. Має збігатися з позиціями «власні кошти».', 'num'], ['ownUse', 'На що піде власний внесок'],
      ['procurement', 'Наскільки опрацьовані закупівлі', 'Де купуєте, яка ціна, чи є в наявності, строк доставки, інші постачальники.', 'area']] },
    { t: 'Клієнти й розвиток', s: 'Слайд 9', f: [['clients', 'Як залучаєте клієнтів зараз і після гранту', 'Конкретні канали: групи громади, OLX, ярмарки, крамниці, рекомендації.', 'area'], ['development', 'Подальший розвиток', 'Реалістичний наступний крок.', 'area']] },
    { t: 'Дохід і строки', s: 'Слайд 10', f: [['incomeForecast', 'Очікуваний дохід', '«50 виробів на місяць по 400 грн — виручка близько 20 000 грн». Розрізняйте виручку й прибуток.', 'area'], ['firstResults', 'Коли перші результати', 'Місяць і рік, і чому саме тоді.', 'area']] },
    { t: 'Мотивація і стартап', s: 'Слайди 11–12', f: [['motivation', 'Чому варто підтримати', 'Що вже є → що обмежує → що змінить грант → який результат.', 'area'], ['startup', 'Підтримка стартапу без досвіду', 'Для людей з інвалідністю, ветеранів, одиноких батьків.', 'startup']] },
    { t: 'Фото бізнесу', s: 'Слайди 13–15', f: [['photos', '', '', 'photos']] }
  ];
  var FIELD_GROUP = {};
  GROUPS.forEach(function (g, i) { g.f.forEach(function (f) { FIELD_GROUP[f[0]] = i; }); });

  function stageNow() {
    if (!S.stage2.choice || (S.stage2.choice === 'video' && !S.stage2.video)) return 2;
    if (!S.sub3) return 3;
    if (!S.sub4) return 4;
    return 5;
  }
  /* view-only state (not saved): «Змінити» on the finished verification, the questions sheet, the sections list */
  var ui = { open2: false, sheet: false, sections: false };
  var STAGES = [
    { t: 'Відбір', due: '' }, { t: 'Перевірка', due: 'до 22 серпня' }, { t: 'Бізнес-ідея', due: 'до 20 вересня' },
    { t: 'Документи', due: 'до 20 жовтня' }, { t: 'Угода', due: 'після документів' }
  ];
  var ORG_NAME = DATA.ORG.name.replace(/\s*\(демо\)\s*$/, '');

  /* one compact line instead of five stage cards */
  function stageLine(cur) {
    var st = STAGES[cur - 1], due = cur === 4 && !S.stage4 ? 'рішення комітету' : st.due;
    return '<div class="mg-stage-line" id="mgStageLine"><p><b>Етап ' + cur + ' з ' + STAGES.length + '</b> · ' + esc(st.t) + (due ? ' · ' + esc(due) : '') + '</p>' +
      '<div class="mg-thin" role="progressbar" aria-label="Етапи конкурсу" aria-valuemin="1" aria-valuemax="' + STAGES.length + '" aria-valuenow="' + cur + '"><i style="width:' + Math.round(cur / STAGES.length * 100) + '%"></i></div></div>';
  }
  function doneRow(id, title, state, action, note) {
    return '<li class="mg-done-row" id="' + id + '"><span class="mg-done-mark" aria-hidden="true">' + icon('check') + '</span><div class="mg-done-text">' +
      '<p><b>' + esc(title) + '</b> — ' + state + (action || '') + '</p>' + (note ? '<div class="mg-done-note">' + note + '</div>' : '') + '</div></li>';
  }
  function doneRows(cur) {
    var rows = [doneRow('stage1', 'Відбір', 'пройдено')];
    if (cur > 2 && !ui.open2) {
      var s2 = S.stage2, video = s2.choice === 'video';
      rows.push(doneRow('stage2', 'Перевірка', video ? 'відео отримано' : 'обрано візит', ' · <button type="button" class="mg-inline-link" data-act="open2">Змінити</button>',
        video && s2.video ? esc(s2.video.name) + ' · ' + fmtBytes(s2.video.size) + ' · ' + esc(s2.video.at) + ' · підтвердження надіслано автоматично' : 'Дату візиту організатор запропонує тут, у кабінеті.'));
    }
    if (cur > 3) {
      rows.push(doneRow('stage3', 'Бізнес-ідея', 'подано ' + esc(S.sub3.at), ' · <button type="button" class="mg-inline-link" data-act="reopen3">Внести зміни</button>',
        'Отримано організатором: ' + S.sub3.files.map(esc).join(' · ') + filesRow(true)));
    }
    if (cur > 4) rows.push(doneRow('stage4', 'Документи', 'пакет отримано', '', 'Пакет документів отримано ' + esc(S.sub4.at) + ': ' + S.sub4.files.map(esc).join(' · ')));
    return '<ol class="mg-done-list" aria-label="Пройдені етапи">' + rows.join('') + '</ol>';
  }

  function renderCabinet() {
    var f = S.form, who = [f.firstName, f.lastName].filter(Boolean).join(' ') || 'Учасник MG-01';
    var cur = stageNow(), res = C.check(S);
    if (cur === 2) ui.open2 = false;
    var html = '<section class="mg-wrap mg-cabinet">' +
      '<header class="mg-cab-head"><span class="mg-src">' + esc(ORG_NAME) + ' · конкурс мікрогрантів</span><h1>' + esc(who) + '</h1></header>';
    if (ui.sheet) {
      html += '<section class="mg-sheet" id="mgSheet" aria-labelledby="mgSheetT"><header class="mg-sheet-head"><h2 id="mgSheetT">Питання й інструкції</h2>' +
        '<button type="button" class="d-btn d-btn--small" data-act="sheet-close">Закрити</button></header>' + faqCard('cab') + hubCard() + '</section></section>';
      main.innerHTML = html;
      return;
    }
    html += stageLine(cur) + doneRows(cur);
    if (ui.open2 && cur > 2) html += stage2Card();
    html += cur === 2 ? stage2Card() : cur === 3 ? stage3Card(res) : cur === 4 ? stage4Card() : stage5Card();
    var next = STAGES.slice(cur).map(function (x) { return x.t.toLowerCase(); });
    if (next.length) html += '<p class="mg-next-line">Далі: ' + esc(next.join(', ')) + '</p>';
    html += '<div class="mg-help"><button type="button" class="d-btn d-btn--small" data-act="sheet">Питання й інструкції</button></div></section>';
    main.innerHTML = html;
  }

  function stage2Card() {
    var s2 = S.stage2;
    var h = '<article class="mg-card mg-current" id="stage2"><h2>Перевірка: візит або відео</h2>' +
      '<p class="mg-muted">Оберіть один формат. Відео не обов’язкове для всіх — воно замінює візит.</p>' +
      '<div class="mg-choice" role="group" aria-label="Формат перевірки">' +
      '<button type="button" class="mg-choice-btn" data-act="s2" data-v="visit" aria-pressed="' + (s2.choice === 'visit') + '"><b>Візит на місце</b><span>організатор приїде в узгоджений день</span></button>' +
      '<button type="button" class="mg-choice-btn" data-act="s2" data-v="video" aria-pressed="' + (s2.choice === 'video') + '"><b>Відеовізитівка</b><span>2–3 хвилини, з телефона</span></button></div>';
    if (s2.choice === 'visit') h += '<p class="mg-ok">' + icon('check') + 'Обрано візит. Дату організатор запропонує в кабінеті.</p>';
    if (s2.choice === 'video') {
      if (s2.video) {
        h += '<div class="mg-receipt">' + icon('check') + '<div><b>Відео отримано</b><span>' + esc(s2.video.name) + ' · ' + fmtBytes(s2.video.size) + ' · ' + esc(s2.video.at) + '</span><span>Підтвердження надіслано автоматично. Дублювати в месенджер не потрібно.</span></div></div>' +
          '<div class="mg-actions"><button type="button" class="d-btn d-btn--small d-btn--ghost" data-act="video-remove">Замінити відео</button></div>';
      } else {
        h += '<div class="mg-upload"><label class="d-btn">' + icon('up') + 'Обрати відео<input type="file" accept="video/*" data-upload="video" hidden></label></div>' +
          '<div class="mg-progress" id="videoProgress" hidden><div class="mg-bar"><i></i></div><span>Завантажуємо відео…</span></div>';
      }
    }
    if (ui.open2) h += '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-act="close2">Готово</button></div>';
    return h + '</article>';
  }

  function fieldHtml(fd) {
    var k = fd[0], label = fd[1], hint = fd[2], type = fd[3] || 'text', f = S.form, id = 'f_' + k;
    if (type === 'items') return itemsHtml();
    if (type === 'photos') return photosHtml();
    var help = hint ? '<span class="mg-hint">' + esc(hint) + '</span>' : '';
    if (type === 'vuln') {
      return '<fieldset class="mg-field"><legend class="d-label">' + label + '</legend>' + help + '<div class="mg-checks">' + OUT.VULNS.map(function (vn, i) {
        return '<label class="mg-check"><input type="checkbox" data-vuln="' + i + '"' + ((f.vulnerabilities || []).indexOf(vn) > -1 ? ' checked' : '') + '><span>' + esc(vn) + '</span></label>';
      }).join('') + '</div></fieldset>';
    }
    if (type === 'goal') {
      var opts = ['', 'Збільшення доходу', 'Збереження існуючого бізнесу', 'Розширення бізнесу', 'Запуск нового напряму', 'Інше'];
      return '<div class="mg-field"><label class="d-label" for="' + id + '">' + label + '</label><select id="' + id + '" class="d-select" data-f="' + k + '">' +
        opts.map(function (o) { return '<option value="' + o + '"' + (f[k] === o ? ' selected' : '') + '>' + (o || 'Оберіть') + '</option>'; }).join('') + '</select></div>';
    }
    if (type === 'startup') {
      return '<div class="mg-field"><span class="d-label">' + label + '</span>' + help + '<div class="mg-seg">' +
        '<label><input type="radio" name="startup" value="no" data-f="startup"' + (f.startup !== 'yes' ? ' checked' : '') + '><span>Не стосується</span></label>' +
        '<label><input type="radio" name="startup" value="yes" data-f="startup"' + (f.startup === 'yes' ? ' checked' : '') + '><span>Стосується</span></label></div>' +
        (f.startup === 'yes' ? '<label class="sr-only" for="f_startupText">Навчання, консультації, клієнти, план Б</label><textarea id="f_startupText" class="d-textarea" data-f="startupText" placeholder="Де навчитеся, з ким радилися, хто клієнт, що робитимете, якщо бізнес розвиватиметься повільніше">' + esc(f.startupText) + '</textarea>' : '') + '</div>';
    }
    var input = type === 'area'
      ? '<textarea id="' + id + '" class="d-textarea" data-f="' + k + '" rows="3">' + esc(f[k]) + '</textarea>'
      : '<input id="' + id + '" class="d-input" data-f="' + k + '"' + (type === 'num' ? ' inputmode="numeric"' : '') + ' value="' + esc(f[k]) + '">';
    var extra = k === 'members' ? '<span class="mg-calc" id="perPerson">' + perPersonText() + '</span>' : '';
    return '<div class="mg-field"><label class="d-label" for="' + id + '">' + label + '</label>' + help + input + extra + '<span class="mg-flag" data-flag-for="' + k + '"></span></div>';
  }
  function perPersonText() {
    var inc = parseFloat(String(S.form.familyIncome || '').replace(/\s/g, '')), m = parseFloat(S.form.members);
    return inc > 0 && m > 0 ? 'На одну особу: ' + C.fmt(inc / m) + ' грн' : '';
  }

  function itemsHtml() {
    var t = C.totals(S.items);
    var h = '<div class="mg-items">';
    S.items.forEach(function (it, i) {
      h += '<div class="mg-item" data-item="' + i + '"><div class="mg-item-head"><b>Позиція ' + (i + 1) + '</b><button type="button" class="d-btn d-btn--small d-btn--ghost" data-act="item-remove" data-i="' + i + '">Видалити</button></div>' +
        '<label class="mg-field mg-item-name"><span class="d-label">Назва: тип, бренд, модель, характеристика</span><input class="d-input" data-it="name" data-i="' + i + '" value="' + esc(it.name) + '" placeholder="Морозильна скриня, модель, 290 л"></label>' +
        '<div class="mg-item-row">' +
          '<label class="mg-field"><span class="d-label">Кількість</span><input class="d-input" inputmode="decimal" data-it="qty" data-i="' + i + '" value="' + esc(it.qty) + '"></label>' +
          '<label class="mg-field"><span class="d-label">Одиниця</span><input class="d-input" data-it="unit" data-i="' + i + '" value="' + esc(it.unit) + '"></label>' +
          '<label class="mg-field"><span class="d-label">Ціна, грн</span><input class="d-input" inputmode="decimal" data-it="price" data-i="' + i + '" value="' + esc(it.price) + '"></label>' +
          '<div class="mg-field"><span class="d-label">Разом</span><output class="mg-item-total" data-total="' + i + '">' + C.fmt(C.itemTotal(it)) + ' грн</output></div>' +
        '</div><div class="mg-item-row">' +
          '<label class="mg-field"><span class="d-label">Джерело</span><select class="d-select" data-it="source" data-i="' + i + '"><option value="grant"' + (it.source !== 'own' ? ' selected' : '') + '>Грант</option><option value="own"' + (it.source === 'own' ? ' selected' : '') + '>Власні кошти</option></select></label>' +
          '<label class="mg-field"><span class="d-label">Тип</span><select class="d-select" data-it="kind" data-i="' + i + '"><option value="equipment"' + (it.kind === 'equipment' ? ' selected' : '') + '>Обладнання</option><option value="materials"' + (it.kind === 'materials' ? ' selected' : '') + '>Матеріали</option><option value="services"' + (it.kind === 'services' ? ' selected' : '') + '>Послуги</option></select></label>' +
          '<label class="mg-field"><span class="d-label">Доставка, днів</span><input class="d-input" inputmode="numeric" data-it="deliveryDays" data-i="' + i + '" value="' + esc(it.deliveryDays) + '"></label>' +
        '</div>' +
        '<label class="mg-field"><span class="d-label">Пряме посилання на товар</span><input class="d-input" type="url" data-it="link" data-i="' + i + '" value="' + esc(it.link) + '" placeholder="https://магазин/сторінка-моделі"></label>' +
        '<div class="mg-item-checks"><label class="mg-check"><input type="checkbox" data-it="isNew" data-i="' + i + '"' + (it.isNew ? ' checked' : '') + '><span>Новий товар</span></label>' +
          '<label class="mg-check"><input type="checkbox" data-it="inUkraine" data-i="' + i + '"' + (it.inUkraine ? ' checked' : '') + '><span>У наявності в Україні</span></label></div>' +
        '<label class="mg-field"><span class="d-label">Коментар</span><input class="d-input" data-it="comment" data-i="' + i + '" value="' + esc(it.comment) + '" placeholder="Вартість включає доставку"></label>' +
        '<ul class="mg-item-flags" data-item-flags="' + i + '"></ul></div>';
    });
    h += '<button type="button" class="d-btn d-btn--small" data-act="item-add">Додати позицію</button>';
    h += '<div class="mg-totals" id="mgTotals">' + totalsHtml(t) + '</div></div>';
    return h;
  }
  function totalsHtml(t) {
    return '<span>Грант: <b>' + C.fmt(t.grant) + '</b> / 59 000 грн</span><span>Обладнання: <b>' + Math.round(t.equipmentShare * 100) + ' %</b> гранту</span><span>Власні: <b>' + C.fmt(t.own) + '</b> грн</span><span>Усього: <b>' + C.fmt(t.all) + '</b> грн</span>';
  }
  function photosHtml() {
    var h = '<p class="mg-hint">2–4 власні фото: приміщення, обладнання, продукція, ви за роботою — з коротким підписом. Необов’язково.</p><div class="mg-photos">';
    for (var i = 0; i < 3; i++) {
      var p = S.photos[i];
      h += '<div class="mg-photo">' + (p ? '<img src="' + p.dataUrl + '" alt=""><label class="sr-only" for="ph' + i + '">Підпис фото ' + (i + 1) + '</label><input id="ph' + i + '" class="d-input" data-photo-cap="' + i + '" value="' + esc(p.caption) + '" placeholder="Підпис"><button type="button" class="d-btn d-btn--small d-btn--ghost" data-act="photo-remove" data-i="' + i + '">Видалити</button>'
        : '<label class="mg-photo-add">' + icon('up') + '<span>Фото ' + (i + 1) + '</span><input type="file" accept="image/*" data-upload="photo" data-i="' + i + '" hidden></label>') + '</div>';
    }
    return h + '</div>';
  }

  /* stage 3: one section of the presentation form at a time («Розділ 3 з 12»), then «Перевірка й подання» */
  function touched(i) {
    var f = S.form;
    return GROUPS[i].f.some(function (fd) {
      var k = fd[0], t = fd[3];
      if (t === 'items') return S.items.length > 0;
      if (t === 'photos') return S.photos.length > 0;
      if (t === 'vuln') return (f.vulnerabilities || []).length > 0;
      if (t === 'startup') return f.startup === 'yes';
      return !!String(f[k] || '').trim();
    });
  }
  var FLAG_FIELD = { grant_mismatch: 'grantRequested', total_mismatch: 'totalNeeded', own_mismatch: 'ownContribution', grant_over_limit: 'items', equipment_share: 'items', no_items: 'items' };
  function flagGroup(fl) {
    if (fl.item !== undefined) return 6;
    var key = fl.field || FLAG_FIELD[fl.id.split(':')[0]];
    return key !== undefined && FIELD_GROUP[key] !== undefined ? FIELD_GROUP[key] : 6;
  }
  function groupHasErrors(res, i) { return res.flags.some(function (fl) { return fl.level === 'error' && flagGroup(fl) === i; }); }
  function groupState(res, i) { return !touched(i) ? '' : groupHasErrors(res, i) ? 'bad' : 'ok'; }
  function secMark(st) { return st === 'ok' ? icon('check') : st === 'bad' ? '!' : ''; }
  function sectionsList(res, cur) {
    var n = GROUPS.length;
    return '<details class="mg-sections"' + (ui.sections ? ' open' : '') + '><summary>Усі розділи</summary><ol>' + GROUPS.map(function (g, i) {
      var st = groupState(res, i);
      return '<li><button type="button" class="mg-sec' + (i === cur ? ' is-cur' : '') + '" data-act="group" data-i="' + i + '" data-state="' + st + '"' + (i === cur ? ' aria-current="step"' : '') + '>' +
        '<span class="mg-sec-mark" aria-hidden="true">' + secMark(st) + '</span><span class="mg-sec-name">' + esc(g.t) + '</span>' +
        '<span class="sr-only">' + (st === 'ok' ? ' — заповнено' : st === 'bad' ? ' — є що виправити' : '') + '</span></button></li>';
    }).join('') + '<li><button type="button" class="mg-sec mg-sec--final' + (cur === n ? ' is-cur' : '') + '" data-act="group" data-i="' + n + '"><span class="mg-sec-mark" aria-hidden="true"></span><span class="mg-sec-name">Перевірка й подання</span></button></li></ol></details>';
  }
  /* checks that belong to the section but not to one field (sums, 80/20, limits); field flags sit under their fields */
  function sectionChecks(res, i) {
    if (!touched(i)) return '';
    var list = res.flags.filter(function (fl) { return !fl.field && fl.item === undefined && flagGroup(fl) === i; });
    if (!list.length) return '';
    return '<ul>' + list.map(function (fl) { return '<li class="' + fl.level + '" data-flag="' + esc(fl.id) + '">' + esc(fl.msg) + '</li>'; }).join('') + '</ul>';
  }
  function secHead(title, pct) {
    return '<div class="mg-sec-head"><p class="mg-sec-title">' + title + '</p><div class="mg-thin" aria-hidden="true"><i style="width:' + pct + '%"></i></div></div>';
  }
  function stage3Card(res) {
    var n = GROUPS.length, i = Math.max(0, Math.min(S.formStep || 0, n));
    var h = '<article class="mg-card mg-current" id="stage3"><h2>Бізнес-ідея: презентація й кошторис</h2>';
    if (i === n) {
      return h + secHead('<b>Перевірка й подання</b>', 100) + sectionsList(res, i) + checksPanel(res) + filesRow() +
        '<div class="mg-preview" id="slidePreview" hidden></div>' +
        '<div class="mg-submit"><button type="button" class="d-btn d-btn--primary" data-act="submit3">' + icon('arrow') + 'Подати організатору</button>' +
        '<span class="mg-muted">Без листа, теми й адрес: файли одразу потрапляють до організатора.</span></div>' +
        '<div class="mg-nav"><button type="button" class="d-btn d-btn--small" data-act="group" data-i="' + (n - 1) + '">Назад до розділів</button></div></article>';
    }
    var g = GROUPS[i];
    if (i === 0) h += '<p class="mg-muted">Форма повторює шаблон презентації — 16 слайдів. Файли з правильними назвами кабінет збере сам.</p>';
    h += secHead('<b>Розділ ' + (i + 1) + ' з ' + n + '</b> · ' + esc(g.t) + ' <span class="mg-src">' + esc(g.s) + '</span>', Math.round((i + 1) / n * 100)) +
      sectionsList(res, i) +
      '<div class="mg-group-body">' + g.f.map(fieldHtml).join('') + '</div>' +
      '<div class="mg-sec-checks" id="sectionChecks" aria-live="polite">' + sectionChecks(res, i) + '</div>' +
      '<div class="mg-nav"><button type="button" class="d-btn" data-act="group" data-i="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>Назад</button>' +
      '<button type="button" class="d-btn d-btn--primary" data-act="group" data-i="' + (i + 1) + '">' + (i === n - 1 ? 'До перевірки' : 'Далі') + icon('arrow') + '</button></div>';
    return h + '</article>';
  }
  function checksPanel(res) {
    var errs = res.flags.filter(function (x) { return x.level === 'error'; }), warns = res.flags.filter(function (x) { return x.level === 'warn'; });
    var h = '<div class="mg-checks-panel" id="checksPanel" aria-live="polite">';
    if (!errs.length && !warns.length) return h + '<p class="mg-ok">' + icon('check') + 'Усі перевірки пройдено: сума, 80/20, збіг сум, посилання, доставка, заповнені поля.</p></div>';
    h += '<h3>' + (errs.length ? 'Що виправити: ' + errs.length : 'Порада') + '</h3><ul>';
    errs.concat(warns).forEach(function (fl) {
      var grp = flagGroup(fl);
      h += '<li class="' + fl.level + '" data-flag="' + esc(fl.id) + '"><button type="button" data-act="group" data-i="' + grp + '">' + esc(fl.msg) + '<span class="mg-flag-sec"> · ' + esc(GROUPS[grp].t) + '</span></button></li>';
    });
    return h + '</ul></div>';
  }
  function filesRow(compact) {
    var n = OUT.names(S);
    return '<div class="mg-files' + (compact ? ' mg-files--compact' : '') + '">' + (compact ? '' : '<span class="d-label">Файли для організатора</span>') + '<div class="mg-actions">' +
      (compact ? '' : '<button type="button" class="d-btn d-btn--small" data-act="preview">Переглянути презентацію</button>') +
      '<button type="button" class="d-btn d-btn--small" data-act="dl" data-kind="pptx">' + icon('dl') + esc(n.pptx) + '</button>' +
      '<button type="button" class="d-btn d-btn--small" data-act="dl" data-kind="xlsx">' + icon('dl') + esc(n.xlsx) + '</button></div></div>';
  }

  /* stage 4 — the membership-application pattern: branching passport type, visual photo guides, one package */
  var DOC_SETS = {
    book: [['bookPhoto', 'Паспорт-книжечка: усі сторінки з фото', 'Розгорніть паспорт; кожен розворот з фотографією — окремим фото.'], ['bookReg', 'Сторінка з реєстрацією місця проживання', 'Печатка й адреса мають читатися.']],
    id: [['idFront', 'ID-картка: лицьова сторона', 'Картка цілком у кадрі, видно чотири кути.'], ['idBack', 'ID-картка: зворотна сторона', 'Три рядки внизу картки читаються.'], ['idReg', 'Витяг з реєстру про місце проживання', 'Документ з Дії або ЦНАП, повністю в кадрі.']]
  };
  var COMMON_DOCS = [['ipn', 'Довідка про РНОКПП (ІПН)', 'Номер із 10 цифр має бути чітким.'], ['iban', 'Довідка з банку про IBAN', 'Сформуйте в застосунку банку: «Реквізити» → «Довідка». Набраний вручну IBAN не приймається.']];
  function guide(kind) {
    var body = kind === 'idFront' || kind === 'idBack'
      ? '<rect x="24" y="24" width="112" height="62" rx="7" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' + (kind === 'idFront' ? '<rect x="32" y="34" width="26" height="34" rx="3" fill="#d9d6ea"/><path d="M66 38h50M66 48h40M66 58h56" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>' : '<path d="M32 66h96M32 72h96M32 78h96" stroke="#1d1b2b" stroke-width="2.4" stroke-dasharray="3 2"/><path d="M34 36h44" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>')
      : kind === 'bookPhoto' || kind === 'bookReg'
        ? '<rect x="30" y="20" width="100" height="70" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/><path d="M80 20v70" stroke="#1d1b2b" stroke-width="1.5"/>' + (kind === 'bookPhoto' ? '<rect x="88" y="30" width="20" height="26" rx="2" fill="#d9d6ea"/><path d="M38 32h34M38 42h28M38 52h34" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>' : '<circle cx="102" cy="52" r="14" fill="none" stroke="#a9a5c4" stroke-width="2.5"/><path d="M38 32h34M38 42h28" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>')
        : '<rect x="40" y="16" width="80" height="78" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/><path d="M50 30h60M50 40h44M50 50h52M50 60h36" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>' + (kind === 'iban' ? '<rect x="50" y="70" width="60" height="12" rx="2" fill="#d9d6ea"/>' : '');
    return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect width="160" height="110" rx="12" fill="#ece9fd"/>' + body + '<path d="M14 26v-10h10M136 16h10v10M146 84v10h-10M24 94H14V84" fill="none" stroke="#5b4fd6" stroke-width="3" stroke-linecap="round"/></svg>';
  }
  function stage4Card() {
    var h = '<article class="mg-card mg-current" id="stage4"><h2>Документи для угоди</h2>';
    if (!S.stage4) return h + '<p class="mg-muted">Комітет розглядає заявки. Результат з’явиться тут.</p></article>';
    var d = S.docs;
    h += '<p class="mg-muted">Усе збирається в один пакет: теми листа й назв файлів вигадувати не треба.</p>' +
      '<fieldset class="mg-field"><legend class="d-label">Який у вас паспорт?</legend><div class="mg-seg">' +
      '<label><input type="radio" name="ptype" value="book" data-ptype' + (d.ptype === 'book' ? ' checked' : '') + '><span>Книжечка</span></label>' +
      '<label><input type="radio" name="ptype" value="id" data-ptype' + (d.ptype === 'id' ? ' checked' : '') + '><span>ID-картка</span></label></div></fieldset>';
    if (d.ptype) {
      h += '<ul class="mg-photo-rules"><li>Без відблисків і тіней.</li><li>Краї документа не обрізані.</li><li>Текст читається.</li></ul><div class="mg-docslots">';
      DOC_SETS[d.ptype].concat(COMMON_DOCS).forEach(function (slot) {
        var file = d.files[slot[0]];
        h += '<div class="mg-docslot' + (file ? ' filled' : '') + '"><div class="mg-docslot-guide">' + guide(slot[0]) + '</div><div class="mg-docslot-main"><b>' + esc(slot[1]) + '</b><span class="mg-hint">' + esc(slot[2]) + '</span>' +
          (file ? '<span class="mg-ok">' + icon('check') + esc(file.name) + ' · ' + fmtBytes(file.size) + '</span><button type="button" class="d-btn d-btn--small d-btn--ghost" data-act="doc-remove" data-k="' + slot[0] + '">Замінити</button>'
            : '<div class="mg-actions"><label class="d-btn d-btn--small">' + icon('up') + 'Фото або PDF<input type="file" accept="image/*,application/pdf" data-upload="doc" data-k="' + slot[0] + '" hidden></label>' +
              '</div>') +
          (slot[0] === 'iban' ? '<details class="mg-iban"><summary>Немає довідки, можу ввести IBAN</summary><label class="sr-only" for="typedIban">IBAN</label><input id="typedIban" class="d-input" data-typed-iban value="' + esc(d.typedIban) + '" placeholder="UA…">' +
            (d.typedIban ? '<p class="mg-warn">Набраний IBAN не приймається: потрібна довідка, сформована банком. Її можна отримати в застосунку банку за хвилину.</p>' : '') + '</details>' : '') +
          '</div></div>';
      });
      h += '<div class="mg-docslot filled"><div class="mg-docslot-guide">' + guide('list') + '</div><div class="mg-docslot-main"><b>Перелік статей витрат (.docx)</b><span class="mg-hint">Сформовано з вашого кошторису — шаблон завантажувати не треба.</span>' +
        '<button type="button" class="d-btn d-btn--small" data-act="dl" data-kind="docx">' + icon('dl') + esc(OUT.names(S).docx) + '</button></div></div>';
      h += '</div><div class="mg-submit"><button type="button" class="d-btn d-btn--primary" data-act="submit4">' + icon('arrow') + 'Подати пакет документів</button></div>';
    }
    return h + '</article>';
  }

  function stage5Card() {
    return '<article class="mg-card mg-current" id="stage5"><h2>Угода</h2><p class="mg-muted">Документи отримано. Організатор перевірить їх і надішле угоду на підпис сюди, у кабінет.</p></article>';
  }
  function hubCard() {
    return '<article class="mg-card mg-side"><h2>Шаблони й інструкції</h2><ul class="mg-hub">' +
      '<li><button type="button" data-act="instr" data-src="Інструкція з презентації">Інструкція з презентації</button><span>читати тут</span></li>' +
      '<li><button type="button" data-act="instr" data-src="Інструкція з кошторису">Інструкція з кошторису</button><span>читати тут</span></li>' +
      '<li><b>Шаблон презентації</b><span>не потрібен — форма його повторює</span></li>' +
      '<li><b>Кошторис (Додаток 4)</b><span>формується з форми</span></li>' +
      '<li><b>Перелік статей витрат</b><span>формується з кошторису</span></li></ul><div id="instrBox"></div></article>';
  }
  function faqCard(where) {
    var sugg = ['Куди надсилати презентацію?', 'Відео обов’язкове для всіх?', 'Що якщо немає комп’ютера?', 'Чи можна б/у обладнання?', 'Доставка 45 днів — підходить?'];
    return '<article class="mg-card mg-side mg-faq"><h2>Питання до інструкції</h2><p class="mg-muted">Пошук по тексту інструкцій з цитатою джерела — не чат-бот.</p>' +
      '<form class="mg-faq-form" data-faq="' + where + '"><label class="sr-only" for="faq-' + where + '">Ваше питання</label><input id="faq-' + where + '" class="d-input" name="q" value="' + esc(S.faqQ) + '" placeholder="Наприклад: куди надсилати?"><button type="submit" class="d-btn d-btn--small d-btn--primary">Знайти</button></form>' +
      '<div class="mg-sugg">' + sugg.map(function (q) { return '<button type="button" data-act="faq" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<div class="mg-answer" id="faqAnswer-' + where + '">' + (S.faqQ ? answerHtml(S.faqQ) : '') + '</div></article>';
  }
  function answerHtml(q) {
    var r = CORPUS.search(q, 2);
    if (!r.length) return '<p class="mg-muted">В інструкціях немає відповіді на це питання — його отримає координатор.</p>';
    return r.map(function (x, i) {
      return '<blockquote class="' + (i ? 'is-more' : '') + '"><p>' + esc(x.p.text) + '</p><cite>' + esc(x.p.src) + '</cite></blockquote>';
    }).join('');
  }

  /* ============================== dashboard ============================== */
  var FLAG_LABEL = {};
  DATA.CHECK_POOL.forEach(function (c) { FLAG_LABEL[c[0]] = c[1]; });
  FLAG_LABEL.own_mismatch = 'Власний внесок не збігається'; FLAG_LABEL.total_mismatch = 'Загальна сума не збігається'; FLAG_LABEL.grant_missing = 'Немає суми гранту';
  FLAG_LABEL.item_not_ua = 'Не в Україні'; FLAG_LABEL.no_items = 'Порожній кошторис'; FLAG_LABEL.item_amount = 'Немає кількості чи ціни'; FLAG_LABEL.item_name = 'Позиція без назви';

  function youRow() {
    var res = C.check(S), started = S.items.length || S.form.ideaTitle;
    var ids = [];
    if (started) res.flags.forEach(function (f) { if (f.level === 'error') { var id = f.id.split(':')[0]; if (ids.indexOf(id) < 0) ids.push(id); } });
    var missing = [];
    if (!S.sub3) { if (!S.form.ideaTitle) missing.push('Презентація'); if (!S.items.length) missing.push('Кошторис'); }
    return {
      code: 'MG-01', you: true, idea: S.form.ideaTitle || '—', verify: S.stage2.choice, videoReceived: !!S.stage2.video,
      status: S.sub3 ? 'submitted' : (started ? 'draft' : 'none'),
      fails: ids.map(function (id) { return [id, FLAG_LABEL[id] || id]; }), missing: missing, last: S.log.length ? S.log[0].at : '—'
    };
  }
  function renderDashboard() {
    var rows = [youRow()].concat(DATA.participants());
    var submitted = rows.filter(function (r) { return r.status === 'submitted'; }).length;
    var drafts = rows.filter(function (r) { return r.status === 'draft'; }).length;
    var none = rows.filter(function (r) { return r.status === 'none'; }).length;
    var withErr = rows.filter(function (r) { return r.fails.length; }).length;
    var pending = rows.filter(function (r) { return r.status !== 'submitted'; });
    var filter = S.dashFilter;
    var shown = rows.filter(function (r) { return filter === 'all' || (filter === 'pending' && r.status !== 'submitted') || (filter === 'errors' && r.fails.length); });
    var visits = rows.filter(function (r) { return r.verify === 'visit'; }).length, videos = rows.filter(function (r) { return r.verify === 'video'; }).length;
    var videosIn = rows.filter(function (r) { return r.verify === 'video' && r.videoReceived; }).length;

    var html = '<section class="mg-wrap mg-dash"><header class="mg-head"><h1>Панель організатора</h1><p class="mg-muted">' + esc(ORG_NAME) + ' · етап «Презентація й кошторис» · дедлайн 20 вересня. Рядок MG-01 — ваш кабінет.</p></header>' +
      '<div class="mg-kpis"><div><b>' + submitted + '</b><span>подали</span></div><div><b>' + drafts + '</b><span>чернетки</span></div><div><b>' + none + '</b><span>не почали</span></div><div><b>' + withErr + '</b><span>з помилками</span></div></div>' +
      '<div class="mg-dash-grid"><div class="mg-dash-main">' +
      '<div class="mg-filter" role="group" aria-label="Фільтр">' + [['all', 'Усі'], ['pending', 'Не подали'], ['errors', 'Є помилки']].map(function (f) {
        return '<button type="button" data-act="filter" data-v="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="mg-table-wrap" tabindex="0" aria-label="Таблиця учасників"><table class="mg-table"><thead><tr><th>Учасник</th><th>Бізнес-ідея</th>' + (on('verify') ? '<th>Перевірка</th>' : '') + '<th>Статус</th><th>Перевірки не пройдено</th><th>Бракує</th><th>Активність</th></tr></thead><tbody>' +
      shown.map(function (r) {
        var st = { submitted: ['ok', 'подано'], draft: ['warn', 'чернетка'], none: ['bad', 'не почато'] }[r.status];
        return '<tr' + (r.you ? ' class="is-you"' : '') + '><td><b>' + r.code + '</b>' + (r.you ? '<small>ваш кабінет</small>' : '') + '</td><td>' + esc(r.idea) + '</td>' +
          (on('verify') ? '<td>' + (r.verify === 'visit' ? 'візит' : r.verify === 'video' ? (r.videoReceived ? 'відео отримано' : 'відео очікується') : '—') + '</td>' : '') +
          '<td><span class="mg-st ' + st[0] + '">' + st[1] + '</span></td>' +
          '<td>' + (on('checks') ? (r.fails.length ? r.fails.map(function (f) { return '<span class="mg-chip">' + esc(f[1]) + '</span>'; }).join('') : (r.status === 'none' ? '—' : '<span class="mg-chip ok">усе гаразд</span>')) : '<span class="mg-muted">вимкнено</span>') + '</td>' +
          '<td>' + (r.missing.length ? esc(r.missing.join(', ')) : '—') + '</td><td>' + esc(r.last) + '</td></tr>';
      }).join('') + '</tbody></table></div></div><aside class="mg-dash-side">';

    if (on('reminders')) {
      html += '<article class="mg-card mg-side"><h2>Нагадування в черзі</h2><p class="mg-muted">Автоматично за 72 і 24 години до дедлайну тим, хто ще не подав.</p><ul class="mg-queue">' +
        pending.slice(0, 8).map(function (r) { return '<li><b>' + r.code + '</b><span>' + (r.status === 'none' ? 'ще не почав(-ла)' : 'чернетка: ' + esc((r.missing[0] || 'перевірки')).toLowerCase()) + '</span></li>'; }).join('') +
        (pending.length > 8 ? '<li class="more">і ще ' + (pending.length - 8) + '</li>' : '') + '</ul></article>';
    } else {
      html += '<article class="mg-card mg-side"><h2>Нагадування</h2><p class="mg-muted">Вимкнено в конструкторі — нагадування пишуться вручну.</p></article>';
    }
    if (on('verify')) html += '<article class="mg-card mg-side"><h2>Формат перевірки</h2><p class="mg-split"><span><b>' + visits + '</b> візитів</span><span><b>' + videos + '</b> відео, отримано ' + videosIn + '</span></p></article>';
    if (on('receipts')) {
      var rec = S.log.filter(function (e) { return e.kind === 'receipt'; }).slice(0, 4);
      html += '<article class="mg-card mg-side"><h2>Підтвердження отримання</h2><p class="mg-muted">Надсилаються учасникам автоматично — ручних «чи дійшло?» немає.</p>' +
        (rec.length ? '<ul class="mg-log">' + rec.map(function (e) { return '<li><span>' + esc(e.at) + '</span>MG-01: ' + esc(e.text) + '</li>'; }).join('') + '</ul>' : '<p class="mg-muted">Подайте щось у кабінеті — підтвердження з’явиться тут.</p>') + '</article>';
    }
    if (on('faq')) html += faqCard('dash');
    if (on('hub')) html += hubCard();
    html += '</aside></div></section>';
    main.innerHTML = html;
  }

  /* ============================== events ============================== */
  function rerender(keepScroll) {
    var y = window.scrollY;
    render();
    if (keepScroll) window.scrollTo(0, y);
  }
  /* live checks while typing: field flags under their fields, item flags in the item, section-wide flags under the
     section, the section marks in «Усі розділи» and the full list on «Перевірка й подання» */
  function refreshChecks() {
    var res = C.check(S), cur = S.formStep, open = cur < GROUPS.length && touched(cur);
    var panel = document.getElementById('checksPanel');
    if (panel) panel.outerHTML = checksPanel(res);
    var sc = document.getElementById('sectionChecks');
    if (sc) sc.innerHTML = cur < GROUPS.length ? sectionChecks(res, cur) : '';
    var tot = document.getElementById('mgTotals');
    if (tot) tot.innerHTML = totalsHtml(res.totals);
    S.items.forEach(function (it, i) {
      var out = document.querySelector('[data-total="' + i + '"]');
      if (out) out.textContent = C.fmt(C.itemTotal(it)) + ' грн';
      var ul = document.querySelector('[data-item-flags="' + i + '"]');
      if (ul) ul.innerHTML = res.flags.filter(function (fl) { return fl.item === i; }).map(function (fl) { return '<li class="' + fl.level + '" data-flag="' + esc(fl.id) + '">' + esc(fl.msg.replace(/^Позиція \d+: /, '')) + '</li>'; }).join('');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-flag-for]'), function (el) {
      var k = el.getAttribute('data-flag-for');
      var fl = open && res.flags.filter(function (x) { return x.field === k; })[0];
      el.textContent = fl ? fl.msg : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mg-sec[data-state]'), function (b) {
      var st = groupState(res, +b.getAttribute('data-i'));
      if (b.getAttribute('data-state') === st) return;
      b.setAttribute('data-state', st);
      b.querySelector('.mg-sec-mark').innerHTML = secMark(st);
      b.querySelector('.sr-only').textContent = st === 'ok' ? ' — заповнено' : st === 'bad' ? ' — є що виправити' : '';
    });
    var pp = document.getElementById('perPerson');
    if (pp) pp.textContent = perPersonText();
  }

  function sampleImage(label, w, h) {
    var c = document.createElement('canvas');
    c.width = w || 960; c.height = h || 640;
    var x = c.getContext('2d');
    x.fillStyle = '#e9e7f2'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#ffffff'; x.fillRect(40, 40, c.width - 80, c.height - 80);
    x.fillStyle = '#d6d2e8'; x.fillRect(80, 90, c.width * 0.3, c.height * 0.45);
    x.fillStyle = '#a9a5c4';
    for (var i = 0; i < 4; i++) x.fillRect(c.width * 0.42, 100 + i * 50, c.width * (0.45 - i * 0.06), 16);
    x.fillStyle = '#5b4fd6'; x.font = '600 44px "Fixel Text", system-ui, sans-serif';
    x.fillText('ЗРАЗОК · ДЕМО', 80, c.height - 120);
    x.fillStyle = '#5b5870'; x.font = '400 28px "Fixel Text", system-ui, sans-serif';
    x.fillText(label, 80, c.height - 74);
    return c.toDataURL('image/jpeg', 0.8);
  }
  function readImage(file, max) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () {
        if (!/^image\//.test(file.type)) { resolve(null); return; }
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = function () { resolve(null); };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function fakeUpload(done) {
    var box = document.getElementById('videoProgress');
    if (!box) { done(); return; }
    box.hidden = false;
    var bar = box.querySelector('i'), t0 = performance.now(), dur = reduce ? 0 : 1400;
    (function step(now) {
      var p = dur ? Math.min(1, (now - t0) / dur) : 1;
      bar.style.width = Math.round(p * 100) + '%';
      if (p < 1) requestAnimationFrame(step); else done();
    })(t0);
  }
  function receiveVideo(name, size) {
    fakeUpload(function () {
      S.stage2.video = { name: name, size: size, at: stamp() };
      if (on('receipts')) logEvent('receipt', 'відео ' + name + ' отримано');
      save();
      rerender(true);
      D.toast('Відео отримано — підтвердження в кабінеті');
    });
  }

  function makeFile(kind) {
    var n = OUT.names(S);
    var job = kind === 'pptx' ? OUT.pptx(S) : kind === 'xlsx' ? OUT.xlsx(S) : OUT.docx(S);
    return job.then(function (blob) { return { blob: blob, name: n[kind] }; });
  }

  /* demo-only shortcuts are buttons in the tip bubbles outside the frame (stage.js), not in the cabinet */
  Stage.action('prefill', function () {
    S.form = JSON.parse(JSON.stringify(DATA.SAMPLE.form));
    S.items = JSON.parse(JSON.stringify(DATA.SAMPLE.items));
    save(); rerender(true); D.toast('Заповнено вигаданим прикладом');
  });
  Stage.action('video-sample', function () {
    if (stageNow() !== 2 && !ui.open2) return;
    if (S.stage2.choice !== 'video') { S.stage2.choice = 'video'; S.stage2.video = null; save(); rerender(true); }
    receiveVideo('videovizytivka.mp4', 23 * 1024 * 1024 + 412 * 1024);
  });
  Stage.action('photo-sample', function () {
    var caps = ['Кухня, де я працюю зараз', 'Випічка, яку виготовляю', 'Місце для нового обладнання'];
    S.photos = caps.map(function (c) { return { caption: c, dataUrl: sampleImage(c) }; });
    save(); rerender(true); D.toast('Додано три тестові фото');
  });
  Stage.action('doc-samples', function () {
    if (!S.docs.ptype) S.docs.ptype = 'id';
    DOC_SETS[S.docs.ptype].concat(COMMON_DOCS).forEach(function (slot) {
      if (S.docs.files[slot[0]]) return;
      var url = sampleImage(slot[1].slice(0, 40), 900, 600);
      S.docs.files[slot[0]] = { name: slot[0] + '_зразок.jpg', size: Math.round(url.length * 0.75), dataUrl: url };
    });
    save(); rerender(true); D.toast('Тестові фото додано в усі поля');
  });
  Stage.action('winner', function () { if (stageNow() === 4 && !S.stage4) { S.stage4 = true; save(); rerender(true); } });

  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 's2') {
      S.stage2.choice = b.getAttribute('data-v');
      if (S.stage2.choice === 'visit') S.stage2.video = null;
      save(); rerender(true);
    } else if (act === 'video-remove') {
      S.stage2.video = null; save(); rerender(true);
    } else if (act === 'group') {
      S.formStep = Math.max(0, Math.min(GROUPS.length, +b.getAttribute('data-i'))); ui.sections = false; save(); rerender(false);
      var st = document.getElementById('stage3');
      if (st && st.getBoundingClientRect().top < 0) st.scrollIntoView({ block: 'start' });
    } else if (act === 'open2') {
      ui.open2 = true; rerender(true);
    } else if (act === 'close2') {
      ui.open2 = false; rerender(true);
    } else if (act === 'sheet') {
      ui.sheet = true; rerender(false); window.scrollTo(0, 0);
    } else if (act === 'sheet-close') {
      ui.sheet = false; rerender(false);
    } else if (act === 'item-add') {
      S.items.push({ name: '', unit: 'шт.', qty: '1', price: '', source: 'grant', kind: 'equipment', isNew: true, inUkraine: true, link: '', deliveryDays: '', comment: '' });
      save(); rerender(true);
    } else if (act === 'item-remove') {
      S.items.splice(+b.getAttribute('data-i'), 1); save(); rerender(true);
    } else if (act === 'photo-remove') {
      S.photos.splice(+b.getAttribute('data-i'), 1); save(); rerender(true);
    } else if (act === 'preview') {
      var box = document.getElementById('slidePreview');
      if (!box) return;
      box.hidden = !box.hidden;
      if (!box.hidden) { box.innerHTML = OUT.previewHtml(S); box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    } else if (act === 'dl') {
      var kind = b.getAttribute('data-kind'), label = b.innerHTML;
      b.disabled = true;
      makeFile(kind).then(function (f) { D.download(f.blob, f.name); D.toast('Файл ' + f.name + ' готовий'); })
        .catch(function (err) { D.toast('Помилка: ' + err.message, { error: true }); })
        .then(function () { b.disabled = false; b.innerHTML = label; });
    } else if (act === 'submit3') {
      var res = C.check(S);
      if (!res.ok) {
        D.toast('Спершу виправте помилки: ' + res.flags.filter(function (x) { return x.level === 'error'; }).length, { error: true });
        var p = document.getElementById('checksPanel');
        if (p) p.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      var n = OUT.names(S);
      Promise.all([OUT.pptx(S), OUT.xlsx(S)]).then(function (blobs) {
        S.sub3 = { at: stamp(), files: [n.pptx + ' (' + fmtBytes(blobs[0].size) + ')', n.xlsx + ' (' + fmtBytes(blobs[1].size) + ')'] };
        if (on('receipts')) logEvent('receipt', 'презентація й кошторис отримано');
        save(); rerender(false);
        D.toast('Подано. Підтвердження — у кабінеті');
      });
    } else if (act === 'reopen3') {
      S.sub3 = null; S.stage4 = false; S.sub4 = null; save(); rerender(true);
    } else if (act === 'doc-remove') {
      delete S.docs.files[b.getAttribute('data-k')]; save(); rerender(true);
    } else if (act === 'submit4') {
      var need = DOC_SETS[S.docs.ptype].concat(COMMON_DOCS).filter(function (s) { return !S.docs.files[s[0]]; });
      if (need.length) { D.toast('Бракує: ' + need.map(function (s) { return s[1]; }).join('; '), { error: true, ms: 4200 }); return; }
      var names = DOC_SETS[S.docs.ptype].concat(COMMON_DOCS).map(function (s) { return s[1]; });
      names.push(OUT.names(S).docx);
      S.sub4 = { at: stamp(), files: names };
      if (on('receipts')) logEvent('receipt', 'пакет документів отримано');
      save(); rerender(true);
      D.toast('Пакет документів подано');
    } else if (act === 'filter') {
      S.dashFilter = b.getAttribute('data-v'); save(); rerender(true);
    } else if (act === 'faq') {
      runFaq(b.getAttribute('data-q'), b.closest('.mg-faq'));
    } else if (act === 'instr') {
      var src = b.getAttribute('data-src'), boxI = b.closest('.mg-side').querySelector('#instrBox');
      boxI.innerHTML = '<div class="mg-instr"><h3>' + esc(src) + '</h3>' + CORPUS.paragraphs.filter(function (p) { return p.src.indexOf(src) === 0; })
        .map(function (p) { return '<p>' + esc(p.text) + ' <span class="mg-src">' + esc(p.src.replace(src + ' · ', '')) + '</span></p>'; }).join('') + '</div>';
    }
  });

  function runFaq(q, card) {
    S.faqQ = q; save();
    if (!card) return;
    var input = card.querySelector('input[name="q"]');
    if (input) input.value = q;
    card.querySelector('.mg-answer').innerHTML = answerHtml(q);
  }
  main.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-faq]');
    if (!form) return;
    e.preventDefault();
    runFaq(form.q.value, form.closest('.mg-faq'));
  });

  main.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-f') && t.type !== 'radio') { S.form[t.getAttribute('data-f')] = t.value; save(); refreshChecks(); }
    else if (t.hasAttribute('data-it') && t.type !== 'checkbox' && t.tagName !== 'SELECT') { S.items[+t.getAttribute('data-i')][t.getAttribute('data-it')] = t.value; save(); refreshChecks(); }
    else if (t.hasAttribute('data-photo-cap')) { S.photos[+t.getAttribute('data-photo-cap')].caption = t.value; save(); }
    else if (t.hasAttribute('data-typed-iban')) {
      S.docs.typedIban = t.value; save();
      var det = t.closest('details'), warn = det.querySelector('.mg-warn');
      if (t.value && !warn) { det.insertAdjacentHTML('beforeend', '<p class="mg-warn">Набраний IBAN не приймається: потрібна довідка, сформована банком. Її можна отримати в застосунку банку за хвилину.</p>'); }
      if (!t.value && warn) warn.remove();
    }
  });
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-vuln')) {
      var v = OUT.VULNS[+t.getAttribute('data-vuln')], list = S.form.vulnerabilities || (S.form.vulnerabilities = []);
      if (t.checked && list.indexOf(v) < 0) list.push(v);
      if (!t.checked) S.form.vulnerabilities = list.filter(function (x) { return x !== v; });
      save();
    } else if (t.getAttribute('data-f') === 'startup') { S.form.startup = t.value; save(); rerender(true); }
    else if (t.tagName === 'SELECT' && t.hasAttribute('data-f')) { S.form[t.getAttribute('data-f')] = t.value; save(); refreshChecks(); }
    else if (t.hasAttribute('data-it') && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
      S.items[+t.getAttribute('data-i')][t.getAttribute('data-it')] = t.type === 'checkbox' ? t.checked : t.value; save(); refreshChecks();
    } else if (t.hasAttribute('data-ptype')) { S.docs.ptype = t.value; save(); rerender(true); }
    else if (t.getAttribute('data-upload') === 'video' && t.files[0]) { receiveVideo(t.files[0].name, t.files[0].size); }
    else if (t.getAttribute('data-upload') === 'photo' && t.files[0]) {
      var i = +t.getAttribute('data-i');
      readImage(t.files[0], 1200).then(function (url) { if (!url) return; S.photos[i] = { caption: '', dataUrl: url }; S.photos = S.photos.filter(Boolean); save(); rerender(true); });
    } else if (t.getAttribute('data-upload') === 'doc' && t.files[0]) {
      var k = t.getAttribute('data-k'), file = t.files[0];
      readImage(file, 1200).then(function (url) { S.docs.files[k] = { name: file.name, size: file.size, dataUrl: url || '' }; save(); rerender(true); });
    }
  });

  render();
})();
