/* The business plan form (12 sections that mirror the 16-slide template) with live checks — carried over from
   the earlier demo, now a participant-only draft (this browser) that becomes a recorded version on submit. */
(function () {
  'use strict';
  var U = window.MGUI, M = window.MGModel, C = window.MGChecks, ST = window.MGStore, OUT = window.MGOutputs, SEED = window.MGSeed;
  var tr = U.tr, esc = U.esc;

  /* [key, ua, en, hint ua, hint en, type] */
  var GROUPS = [
    { t: ['Титульна сторінка', 'Title page'], s: 1, f: [['lastName', 'Прізвище', 'Last name'], ['firstName', 'Ім’я', 'First name'], ['ideaTitle', 'Назва бізнес-ідеї', 'Business idea title', 'Не «Розвиток бізнесу», а що саме: «Розширення виробництва домашньої випічки».', 'Not “Business development” but what exactly: “Expanding home bakery production”.']] },
    { t: ['Про вас і родину', 'About you and your family'], s: 2, f: [['age', 'Вік', 'Age', '', '', 'num'], ['family', 'Склад родини', 'Household', '«4 особи: заявниця, чоловік, двоє дітей — 8 і 14 років».', '“4 people: applicant, husband, two children aged 8 and 14”.'],
      ['familyIncome', 'Середньомісячний дохід сім’ї, грн', 'Average monthly household income, UAH', '', '', 'num'], ['members', 'Кількість членів сім’ї', 'Household members', 'Дохід на одну особу порахуємо самі.', 'Income per person is calculated for you.', 'num'],
      ['community', 'Громада', 'Community'], ['settlement', 'Населений пункт', 'Settlement'], ['education', 'Освіта', 'Education', 'Підкресліть навчання, пов’язане з бізнесом.', 'Highlight business-related training.'], ['otherInfo', 'Інша інформація', 'Other information', 'Якщо нічого — «не застосовується».', 'If nothing — “not applicable”.']] },
    { t: ['Вразливості', 'Vulnerabilities'], s: 3, f: [['vulnerabilities', 'Що стосується вас або родини', 'What applies to you or your household', 'Можна кілька.', 'Several are allowed.', 'vuln'], ['otherVuln', 'Інше — поясніть', 'Other — explain']] },
    { t: ['Про бізнес', 'About the business'], s: 4, f: [['registered', 'Чи має бізнес офіційну реєстрацію', 'Is the business registered', '«Так, ФОП з 2023 року» або «Ні».', '“Yes, sole trader since 2023” or “No”.'], ['mainIncome', 'Чи є бізнес основним джерелом доходу', 'Is it the main source of income'],
      ['employees', 'Працевлаштовані особи', 'Employees', 'Скільки й які функції; або «найманих працівників немає».', 'How many and what roles; or “no employees”.'], ['newJobs', 'Нові робочі місця', 'New jobs', 'Лише якщо справді плануєте.', 'Only if you really plan them.'],
      ['experience', 'Досвід', 'Experience', 'Скільки часу, у якій сфері, чи є постійні клієнти.', 'How long, in what field, regular clients.', 'area'], ['grants', 'Отримані раніше гранти', 'Earlier grants', 'Хто, коли, скільки; або «не отримував/ла».', 'Who, when, how much; or “none”.', 'area']] },
    { t: ['Бізнес-ідея', 'Business idea'], s: 5, f: [['ideaDesc', 'Опис бізнес-ідеї', 'Idea description', 'Що, кому, де, чому потрібно, що зміниться завдяки гранту.', 'What, for whom, where, why, what the grant changes.', 'area'], ['demand', 'Чим підтверджується попит', 'Evidence of demand', '', '', 'area']] },
    { t: ['Мета гранту', 'Purpose of the grant'], s: 6, f: [['goal', 'Основна мета', 'Main purpose', '', '', 'goal'], ['incomeImpact', 'Як це вплине на дохід родини', 'Effect on household income', 'Що купите → що це дасть → який результат.', 'What you buy → what it enables → result.', 'area']] },
    { t: ['Бюджет', 'Budget'], s: 7, f: [['totalNeeded', 'Загальна сума на бізнес-ідею, грн', 'Total for the idea, UAH', 'Сума всіх позицій — грантових і власних.', 'All lines — grant and own.', 'num'], ['grantRequested', 'Сума грантових коштів, грн', 'Grant amount, UAH', 'До 59 000 грн. Має збігатися з кошторисом.', 'Up to UAH 59,000. Must match the budget.', 'num'], ['items', '', '', '', '', 'items']] },
    { t: ['Власний внесок і закупівлі', 'Own contribution and procurement'], s: 8, f: [['ownContribution', 'Власний внесок, грн', 'Own contribution, UAH', 'Якщо немає — 0.', 'If none — 0.', 'num'], ['ownUse', 'На що піде власний внесок', 'What the own contribution buys'],
      ['procurement', 'Наскільки опрацьовані закупівлі', 'Procurement readiness', 'Де купуєте, ціна, наявність, строк доставки.', 'Where, price, availability, delivery time.', 'area']] },
    { t: ['Клієнти й розвиток', 'Clients and growth'], s: 9, f: [['clients', 'Як залучаєте клієнтів зараз і після гранту', 'How you find clients now and after the grant', '', '', 'area'], ['development', 'Подальший розвиток', 'Next steps', '', '', 'area']] },
    { t: ['Дохід і строки', 'Income and timing'], s: 10, f: [['incomeForecast', 'Очікуваний дохід', 'Expected income', 'Розрізняйте виручку й прибуток.', 'Tell revenue from profit.', 'area'], ['firstResults', 'Коли перші результати', 'When the first results come', '', '', 'area']] },
    { t: ['Мотивація і стартап', 'Motivation and start-up'], s: 11, f: [['motivation', 'Чому варто підтримати', 'Why support this', 'Що вже є → що обмежує → що змінить грант.', 'What exists → what limits it → what the grant changes.', 'area'], ['startup', 'Підтримка стартапу без досвіду', 'Start-up without experience', '', '', 'startup']] },
    { t: ['Фото бізнесу', 'Business photos'], s: 13, f: [['photos', '', '', '', '', 'photos']] }
  ];
  var FIELD_GROUP = {};
  GROUPS.forEach(function (g, i) { g.f.forEach(function (f) { FIELD_GROUP[f[0]] = i; }); });
  var FLAG_FIELD = { grant_mismatch: 'grantRequested', total_mismatch: 'totalNeeded', own_mismatch: 'ownContribution', grant_over_limit: 'items', equipment_share: 'items', no_items: 'items' };
  function flagGroup(fl) { if (fl.item !== undefined) return 6; var k = fl.field || FLAG_FIELD[fl.id.split(':')[0]]; return k !== undefined && FIELD_GROUP[k] !== undefined ? FIELD_GROUP[k] : 6; }

  /* English text for the same check results (checks.js speaks Ukrainian) */
  function msg(fl, res) {
    if (U.LANG !== 'en') return fl.msg;
    var id = fl.id.split(':')[0], n = fl.item !== undefined ? 'Line ' + (fl.item + 1) + ': ' : '', t = res.totals;
    var m = {
      no_items: 'The budget has no grant-funded line.', grant_over_limit: 'Grant total UAH ' + C.fmt(t.grant) + ' exceeds the UAH 59,000 maximum.',
      equipment_share: 'Equipment is ' + Math.round(t.equipmentShare * 100) + '% of the grant; it must be at least 80%.', grant_mismatch: 'The grant amount on slide 7 does not match the budget (UAH ' + C.fmt(t.grant) + ').',
      grant_missing: 'Enter the grant amount on slide 7.', total_mismatch: 'The total on slide 7 does not match all lines (UAH ' + C.fmt(t.all) + ').', own_mismatch: 'Own contribution on slide 8 does not match own-funded lines (UAH ' + C.fmt(t.own) + ').',
      item_name: n + 'no name.', item_amount: n + 'enter quantity and price.', item_vague: n + 'give type, brand and model as the seller does.',
      item_no_link: n + (/https/.test(fl.msg) ? 'the link must start with https://.' : /пряме/.test(fl.msg) ? 'a direct product page is needed, not the shop’s home page.' : 'no product link.'),
      item_delivery: n + (/вкажіть/.test(fl.msg) ? 'enter delivery time in days.' : 'delivery over 30 days — the purchase must fit in a month. Find another supplier.'),
      item_not_new: n + 'the grant buys new equipment only.', item_not_ua: n + 'equipment must be in stock in Ukraine.',
      required: (fl.msg.split(':')[0] || '').replace('Слайд', 'Slide').replace(/ · .*/, '') + ': the field is empty. The committee reads the presentation without you — answer or write “not applicable”.'
    };
    return m[id] || fl.msg;
  }

  function emptyForm() {
    var f = {};
    C.REQUIRED.forEach(function (r) { f[r[0]] = ''; });
    ['members', 'otherInfo', 'otherVuln', 'demand', 'totalNeeded', 'grantRequested', 'ownContribution', 'ownUse', 'startupText'].forEach(function (k) { f[k] = ''; });
    f.vulnerabilities = []; f.startup = 'no';
    return f;
  }
  function getDraft(state, code) {
    var d = ST.draft(code, 'plan');
    if (d) return d;
    var a = state.apps[code], last = M.latestPlan(a);
    if (last) return { form: JSON.parse(JSON.stringify(last.form)), items: JSON.parse(JSON.stringify(last.items)), photos: JSON.parse(JSON.stringify(last.photos || [])), step: 6 };
    var f = emptyForm(), i = a.intake;
    f.lastName = i.lastName; f.firstName = i.firstName; f.ideaTitle = i.ideaTitle; f.community = i.community; f.settlement = i.settlement; f.members = i.members; f.vulnerabilities = (i.vulnerabilities || []).slice();
    return { form: f, items: [], photos: [], step: 0 };
  }
  function save(code, d) { if (!ST.saveDraft(code, 'plan', d)) U.toast(U.errText('storage_failed'), true); }

  function touched(d, i) {
    return GROUPS[i].f.some(function (fd) {
      var k = fd[0], t = fd[5];
      if (t === 'items') return d.items.length > 0;
      if (t === 'photos') return d.photos.length > 0;
      if (t === 'vuln') return (d.form.vulnerabilities || []).length > 0;
      if (t === 'startup') return d.form.startup === 'yes';
      return !!String(d.form[k] || '').trim();
    });
  }
  function groupState(d, res, i) { return !touched(d, i) ? '' : res.flags.some(function (fl) { return fl.level === 'error' && flagGroup(fl) === i; }) ? 'bad' : 'ok'; }

  /* organiser's open comments on the latest submitted version */
  function corrections(state, code) {
    var a = state.apps[code], out = [];
    if (a.status !== 'plan_changes_requested') return out;
    M.planFiles(state, a).forEach(function (f) {
      if (f.status !== 'needs_correction') return;
      f.comments.forEach(function (c) { if (c.visibility === 'participant' && f.history[f.history.length - 1].ev === c.ev) out.push({ file: f, text: c.text, anchor: c.anchor }); });
    });
    return out;
  }

  function field(d, fd) {
    var k = fd[0], label = tr(fd[1], fd[2]), hint = tr(fd[3] || '', fd[4] || ''), type = fd[5] || 'text', f = d.form, id = 'f_' + k;
    if (type === 'items') return items(d);
    if (type === 'photos') return photos(d);
    var help = hint ? '<span class="mg-hint">' + esc(hint) + '</span>' : '';
    if (type === 'vuln') {
      return '<fieldset class="mg-field"><legend class="d-label">' + esc(label) + '</legend>' + help + '<div class="mg-checks">' + OUT.VULNS.map(function (vn, i) {
        return '<label class="mg-check"><input type="checkbox" data-pvuln="' + i + '"' + ((f.vulnerabilities || []).indexOf(vn) > -1 ? ' checked' : '') + '><span>' + esc(vn) + '</span></label>';
      }).join('') + '</div></fieldset>';
    }
    if (type === 'goal') {
      var opts = ['', 'Збільшення доходу', 'Збереження існуючого бізнесу', 'Розширення бізнесу', 'Запуск нового напряму', 'Інше'];
      return '<div class="mg-field"><label class="d-label" for="' + id + '">' + esc(label) + '</label><select id="' + id + '" class="d-select" data-pf="' + k + '">' +
        opts.map(function (o) { return '<option value="' + o + '"' + (f[k] === o ? ' selected' : '') + '>' + (o || tr('Оберіть', 'Choose')) + '</option>'; }).join('') + '</select></div>';
    }
    if (type === 'startup') {
      return '<div class="mg-field"><span class="d-label">' + esc(label) + '</span><div class="mg-seg">' +
        '<label><input type="radio" name="startup" value="no" data-pf="startup"' + (f.startup !== 'yes' ? ' checked' : '') + '><span>' + tr('Не стосується', 'Not applicable') + '</span></label>' +
        '<label><input type="radio" name="startup" value="yes" data-pf="startup"' + (f.startup === 'yes' ? ' checked' : '') + '><span>' + tr('Стосується', 'Applies') + '</span></label></div>' +
        (f.startup === 'yes' ? '<textarea class="d-textarea" data-pf="startupText" aria-label="' + tr('Навчання, консультації, план Б', 'Training, advice, plan B') + '">' + esc(f.startupText) + '</textarea>' : '') + '</div>';
    }
    var input = type === 'area' ? '<textarea id="' + id + '" class="d-textarea" data-pf="' + k + '" rows="3">' + esc(f[k]) + '</textarea>'
      : '<input id="' + id + '" class="d-input" data-pf="' + k + '"' + (type === 'num' ? ' inputmode="numeric"' : '') + ' value="' + esc(f[k]) + '">';
    return '<div class="mg-field"><label class="d-label" for="' + id + '">' + esc(label) + '</label>' + help + input + '<span class="mg-flag" data-flag-for="' + k + '"></span></div>';
  }
  function items(d) {
    var t = C.totals(d.items), cmts = ctx.corrections;
    var h = '<div class="mg-items">';
    d.items.forEach(function (it, i) {
      var pin = cmts.filter(function (c) { return c.anchor === i; });
      h += '<div class="mg-item' + (pin.length ? ' v3-pinned' : '') + '" data-item="' + i + '" id="item-' + i + '">' +
        pin.map(function (c) { return '<p class="v3-pin" role="note">' + U.icon('msg') + '<span><b>' + tr('Організатор:', 'Organiser:') + '</b> ' + esc(c.text) + '</span></p>'; }).join('') +
        '<div class="mg-item-head"><b>' + tr('Позиція ', 'Line ') + (i + 1) + '</b><button type="button" class="d-btn d-btn--small d-btn--ghost" data-pact="item-remove" data-i="' + i + '">' + tr('Видалити', 'Remove') + '</button></div>' +
        '<label class="mg-field mg-item-name"><span class="d-label">' + tr('Назва: тип, бренд, модель', 'Name: type, brand, model') + '</span><input class="d-input" data-pit="name" data-i="' + i + '" value="' + esc(it.name) + '"></label>' +
        '<div class="mg-item-row">' +
        '<label class="mg-field"><span class="d-label">' + tr('Кількість', 'Qty') + '</span><input class="d-input" inputmode="decimal" data-pit="qty" data-i="' + i + '" value="' + esc(it.qty) + '"></label>' +
        '<label class="mg-field"><span class="d-label">' + tr('Одиниця', 'Unit') + '</span><input class="d-input" data-pit="unit" data-i="' + i + '" value="' + esc(it.unit) + '"></label>' +
        '<label class="mg-field"><span class="d-label">' + tr('Ціна, грн', 'Price, UAH') + '</span><input class="d-input" inputmode="decimal" data-pit="price" data-i="' + i + '" value="' + esc(it.price) + '"></label>' +
        '<div class="mg-field"><span class="d-label">' + tr('Разом', 'Total') + '</span><output class="mg-item-total" data-total="' + i + '">' + C.fmt(C.itemTotal(it)) + '</output></div></div><div class="mg-item-row">' +
        '<label class="mg-field"><span class="d-label">' + tr('Джерело', 'Source') + '</span><select class="d-select" data-pit="source" data-i="' + i + '"><option value="grant"' + (it.source !== 'own' ? ' selected' : '') + '>' + tr('Грант', 'Grant') + '</option><option value="own"' + (it.source === 'own' ? ' selected' : '') + '>' + tr('Власні кошти', 'Own funds') + '</option></select></label>' +
        '<label class="mg-field"><span class="d-label">' + tr('Тип', 'Type') + '</span><select class="d-select" data-pit="kind" data-i="' + i + '">' + [['equipment', 'Обладнання', 'Equipment'], ['materials', 'Матеріали', 'Materials'], ['services', 'Послуги', 'Services']].map(function (o) { return '<option value="' + o[0] + '"' + (it.kind === o[0] ? ' selected' : '') + '>' + tr(o[1], o[2]) + '</option>'; }).join('') + '</select></label>' +
        '<label class="mg-field"><span class="d-label">' + tr('Доставка, днів', 'Delivery, days') + '</span><input class="d-input" inputmode="numeric" data-pit="deliveryDays" data-i="' + i + '" value="' + esc(it.deliveryDays) + '"></label></div>' +
        '<label class="mg-field"><span class="d-label">' + tr('Пряме посилання на товар', 'Direct product link') + '</span><input class="d-input" type="url" data-pit="link" data-i="' + i + '" value="' + esc(it.link) + '"></label>' +
        '<div class="mg-item-checks"><label class="mg-check"><input type="checkbox" data-pit="isNew" data-i="' + i + '"' + (it.isNew ? ' checked' : '') + '><span>' + tr('Новий товар', 'New item') + '</span></label>' +
        '<label class="mg-check"><input type="checkbox" data-pit="inUkraine" data-i="' + i + '"' + (it.inUkraine ? ' checked' : '') + '><span>' + tr('У наявності в Україні', 'In stock in Ukraine') + '</span></label></div>' +
        '<ul class="mg-item-flags" data-item-flags="' + i + '"></ul></div>';
    });
    h += '<button type="button" class="d-btn d-btn--small" data-pact="item-add">' + tr('Додати позицію', 'Add line') + '</button>';
    return h + '<div class="mg-totals" id="mgTotals">' + totals(t) + '</div></div>';
  }
  function totals(t) {
    return '<span>' + tr('Грант', 'Grant') + ': <b>' + C.fmt(t.grant) + '</b> / 59 000</span><span>' + tr('Обладнання', 'Equipment') + ': <b>' + Math.round(t.equipmentShare * 100) + ' %</b></span><span>' +
      tr('Власні', 'Own') + ': <b>' + C.fmt(t.own) + '</b></span><span>' + tr('Усього', 'Total') + ': <b>' + C.fmt(t.all) + '</b></span>';
  }
  function photos(d) {
    var h = '<p class="mg-hint">' + tr('2–3 фото з підписами потраплять на слайди 13–15. У демо — синтетичні зразки.', '2–3 captioned photos go to slides 13–15. The demo uses synthetic samples.') + '</p><div class="mg-photos">';
    for (var i = 0; i < 3; i++) {
      var p = d.photos[i];
      h += '<div class="mg-photo">' + (p ? '<img src="' + window.MGSamples.photo(p.caption) + '" alt=""><input class="d-input" data-pphoto="' + i + '" value="' + esc(p.caption) + '" aria-label="' + tr('Підпис фото', 'Photo caption') + ' ' + (i + 1) + '"><button type="button" class="d-btn d-btn--small d-btn--ghost" data-pact="photo-remove" data-i="' + i + '">' + tr('Видалити', 'Remove') + '</button>'
        : '<button type="button" class="mg-photo-add" data-pact="photo-add">' + U.icon('plus') + '<span>' + tr('Додати зразок фото', 'Add sample photo') + '</span></button>') + '</div>';
    }
    return h + '</div>';
  }

  var ctx = { code: null, corrections: [] };
  function render(state, code) {
    var d = getDraft(state, code), a = state.apps[code], n = GROUPS.length, i = Math.max(0, Math.min(d.step || 0, n));
    ctx.code = code; ctx.corrections = corrections(state, code);
    var res = C.check({ form: d.form, items: d.items });
    var h = '<section class="v3-plan" id="plan"><a class="v3-back" href="#/home">' + U.icon('back') + tr('До кабінету', 'Back to cabinet') + '</a>' +
      '<h1>' + tr('Бізнес-план і кошторис', 'Business plan and budget') + '</h1>';
    if (ctx.corrections.length) {
      h += '<div class="v3-fixlist" role="note"><b>' + tr('Організатор просить виправити', 'The organiser asks you to fix') + '</b><ul>' + ctx.corrections.map(function (c) {
        return '<li><span>' + esc(U.slot(c.file.slot)) + ' · v' + c.file.v + ': ' + esc(c.text) + '</span>' + (c.anchor != null ? ' <button type="button" class="v3-link" data-pact="goto-item" data-i="' + c.anchor + '">' + tr('Перейти до позиції ', 'Go to line ') + (c.anchor + 1) + '</button>' : '') + '</li>';
      }).join('') + '</ul></div>';
    }
    h += '<details class="mg-sections"><summary>' + tr('Усі розділи', 'All sections') + '</summary><ol>' + GROUPS.map(function (g, k) {
      var st = groupState(d, res, k);
      return '<li><button type="button" class="mg-sec' + (k === i ? ' is-cur' : '') + '" data-pact="group" data-i="' + k + '" data-state="' + st + '"><span class="mg-sec-mark" aria-hidden="true">' + (st === 'ok' ? U.icon('check') : st === 'bad' ? '!' : '') + '</span><span class="mg-sec-name">' + esc(tr(g.t[0], g.t[1])) + '</span></button></li>';
    }).join('') + '<li><button type="button" class="mg-sec mg-sec--final' + (i === n ? ' is-cur' : '') + '" data-pact="group" data-i="' + n + '"><span class="mg-sec-mark"></span><span class="mg-sec-name">' + tr('Перевірка й подання', 'Review and submit') + '</span></button></li></ol></details>';
    if (i === n) {
      var errs = res.flags.filter(function (x) { return x.level === 'error'; });
      h += '<div class="mg-sec-head"><p class="mg-sec-title"><b>' + tr('Перевірка й подання', 'Review and submit') + '</b></p></div><div class="mg-checks-panel" id="checksPanel" aria-live="polite">' +
        (errs.length ? '<h3>' + tr('Що виправити: ', 'To fix: ') + errs.length + '</h3><ul>' + errs.map(function (fl) { return '<li class="error" data-flag="' + esc(fl.id) + '"><button type="button" data-pact="group" data-i="' + flagGroup(fl) + '">' + esc(msg(fl, res)) + '</button></li>'; }).join('') + '</ul>'
          : '<p class="mg-ok">' + U.icon('check') + tr('Усі перевірки пройдено: ліміт, 80/20, збіг сум, посилання, доставка, заповнені поля.', 'All checks passed: limit, 80/20, matching sums, links, delivery, required fields.') + '</p>') + '</div>' +
        '<p class="mg-muted">' + tr('Після подання кабінет збере презентацію .pptx і кошторис .xlsx з цих відповідей. Організатор побачить їх одразу — без листів.', 'On submit the cabinet builds the .pptx presentation and .xlsx budget from these answers. The organiser sees them at once — no e-mail.') + '</p>' +
        '<div class="mg-submit"><button type="button" class="d-btn d-btn--primary" data-pact="submit"' + (errs.length ? ' aria-disabled="true"' : '') + '>' + U.icon('arrow') + (a.plan.versions.length ? tr('Подати виправлену версію', 'Submit the corrected version') : tr('Подати організатору', 'Submit to the organiser')) + '</button></div>' +
        '<div class="mg-nav"><button type="button" class="d-btn d-btn--small" data-pact="group" data-i="' + (n - 1) + '">' + tr('Назад до розділів', 'Back to sections') + '</button></div>';
    } else {
      var g = GROUPS[i];
      h += '<div class="mg-sec-head"><p class="mg-sec-title"><b>' + tr('Розділ ', 'Section ') + (i + 1) + tr(' з ', ' of ') + n + '</b> · ' + esc(tr(g.t[0], g.t[1])) + ' <span class="mg-src">' + tr('Слайд ', 'Slide ') + g.s + '</span></p><div class="mg-thin" aria-hidden="true"><i style="width:' + Math.round((i + 1) / n * 100) + '%"></i></div></div>' +
        '<div class="mg-group-body">' + g.f.map(function (fd) { return field(d, fd); }).join('') + '</div><div class="mg-sec-checks" id="sectionChecks" aria-live="polite"></div>' +
        '<div class="mg-nav"><button type="button" class="d-btn" data-pact="group" data-i="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>' + tr('Назад', 'Back') + '</button>' +
        '<button type="button" class="d-btn d-btn--primary" data-pact="group" data-i="' + (i + 1) + '">' + (i === n - 1 ? tr('До перевірки', 'To review') : tr('Далі', 'Next')) + U.icon('arrow') + '</button></div>';
    }
    return h + '</section>';
  }
  function refresh(state, code) {
    var d = getDraft(state, code), res = C.check({ form: d.form, items: d.items }), cur = d.step || 0;
    var sc = document.getElementById('sectionChecks');
    if (sc && cur < GROUPS.length && touched(d, cur)) {
      var list = res.flags.filter(function (fl) { return !fl.field && fl.item === undefined && flagGroup(fl) === cur; });
      sc.innerHTML = list.length ? '<ul>' + list.map(function (fl) { return '<li class="' + fl.level + '" data-flag="' + esc(fl.id) + '">' + esc(msg(fl, res)) + '</li>'; }).join('') + '</ul>' : '';
    } else if (sc) sc.innerHTML = '';
    var tot = document.getElementById('mgTotals'); if (tot) tot.innerHTML = totals(res.totals);
    d.items.forEach(function (it, i) {
      var o = document.querySelector('[data-total="' + i + '"]'); if (o) o.textContent = C.fmt(C.itemTotal(it));
      var ul = document.querySelector('[data-item-flags="' + i + '"]');
      if (ul) ul.innerHTML = res.flags.filter(function (fl) { return fl.item === i; }).map(function (fl) { return '<li class="' + fl.level + '" data-flag="' + esc(fl.id) + '">' + esc(msg(fl, res).replace(/^(Позиція|Line) \d+: /, '')) + '</li>'; }).join('');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-flag-for]'), function (el) {
      var fl = touched(d, cur) && res.flags.filter(function (x) { return x.field === el.getAttribute('data-flag-for'); })[0];
      el.textContent = fl ? msg(fl, res) : '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mg-sec[data-state]'), function (b) {
      var st = groupState(d, res, +b.getAttribute('data-i'));
      if (b.getAttribute('data-state') === st) return;
      b.setAttribute('data-state', st); b.querySelector('.mg-sec-mark').innerHTML = st === 'ok' ? U.icon('check') : st === 'bad' ? '!' : '';
    });
  }

  /* events (delegated from #mgMain) */
  function onClick(e, rerender) {
    var b = e.target.closest('[data-pact]'); if (!b || !ctx.code) return false;
    var state = U.state(), code = ctx.code, d = getDraft(state, code), a = b.getAttribute('data-pact');
    if (a === 'group') { d.step = Math.max(0, Math.min(GROUPS.length, +b.getAttribute('data-i'))); save(code, d); rerender(); var p = document.getElementById('plan'); if (p) p.scrollIntoView({ block: 'start' }); }
    else if (a === 'goto-item') { d.step = 6; save(code, d); rerender(); var it = document.getElementById('item-' + b.getAttribute('data-i')); if (it) { it.scrollIntoView({ block: 'center' }); var inp = it.querySelector('input'); if (inp) inp.focus(); } }
    else if (a === 'item-add') { d.items.push({ name: '', unit: 'шт.', qty: '1', price: '', source: 'grant', kind: 'equipment', isNew: true, inUkraine: true, link: '', deliveryDays: '', comment: '' }); save(code, d); rerender(); }
    else if (a === 'item-remove') { d.items.splice(+b.getAttribute('data-i'), 1); save(code, d); rerender(); }
    else if (a === 'photo-add') { var caps = [tr('Кухня, де я працюю зараз', 'Where I work now'), tr('Продукція', 'Products'), tr('Місце для нового обладнання', 'Space for the new equipment')]; d.photos.push({ caption: caps[d.photos.length] || '' }); save(code, d); rerender(); }
    else if (a === 'photo-remove') { d.photos.splice(+b.getAttribute('data-i'), 1); save(code, d); rerender(); }
    else if (a === 'submit') {
      var res = C.check({ form: d.form, items: d.items });
      if (!res.ok) { U.toast(U.errText('checks_failed'), true); return true; }
      b.disabled = true;
      U.act('plan.submit', code, { form: d.form, items: d.items, photos: d.photos }, tr('Подано. Організатор уже бачить файли.', 'Submitted. The organiser can see the files now.')).then(function (r) {
        b.disabled = false;
        if (r.ok) { window.localStorage.removeItem('vi-mg-v3-draft-plan-' + code); window.location.hash = '#/home'; }
      });
    }
    return true;
  }
  function onInput(e) {
    var t = e.target; if (!ctx.code) return false;
    var state = U.state(), d = getDraft(state, ctx.code);
    if (t.hasAttribute('data-pf') && t.type !== 'radio') d.form[t.getAttribute('data-pf')] = t.value;
    else if (t.hasAttribute('data-pit') && t.type !== 'checkbox' && t.tagName !== 'SELECT') d.items[+t.getAttribute('data-i')][t.getAttribute('data-pit')] = t.value;
    else if (t.hasAttribute('data-pphoto')) d.photos[+t.getAttribute('data-pphoto')].caption = t.value;
    else return false;
    save(ctx.code, d); refresh(state, ctx.code); return true;
  }
  function onChange(e, rerender) {
    var t = e.target; if (!ctx.code) return false;
    var state = U.state(), d = getDraft(state, ctx.code);
    if (t.hasAttribute('data-pvuln')) {
      var v = OUT.VULNS[+t.getAttribute('data-pvuln')], l = d.form.vulnerabilities || [];
      d.form.vulnerabilities = t.checked ? (l.indexOf(v) < 0 ? l.concat([v]) : l) : l.filter(function (x) { return x !== v; });
    } else if (t.getAttribute('data-pf') === 'startup') { d.form.startup = t.value; save(ctx.code, d); rerender(); return true; }
    else if (t.tagName === 'SELECT' && t.hasAttribute('data-pf')) d.form[t.getAttribute('data-pf')] = t.value;
    else if (t.hasAttribute('data-pit') && (t.type === 'checkbox' || t.tagName === 'SELECT')) d.items[+t.getAttribute('data-i')][t.getAttribute('data-pit')] = t.type === 'checkbox' ? t.checked : t.value;
    else return false;
    save(ctx.code, d); refresh(state, ctx.code); return true;
  }
  /* demo helper: fill with the invented example (outside the product frame) */
  function prefill(state, code) {
    var p = SEED.planFrom(SEED.IRYNA_FORM, SEED.IRYNA_ITEMS), a = state.apps[code];
    p.form.lastName = a.intake.lastName; p.form.firstName = a.intake.firstName;
    save(code, { form: p.form, items: p.items, photos: [{ caption: tr('Кухня, де я працюю зараз', 'Where I work now') }], step: GROUPS.length });
  }

  window.MGPlan = { render: render, refresh: refresh, onClick: onClick, onInput: onInput, onChange: onChange, prefill: prefill, corrections: corrections, GROUPS: GROUPS };
})();
