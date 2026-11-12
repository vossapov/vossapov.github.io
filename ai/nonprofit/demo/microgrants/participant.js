/* Participant side: short application → tracking page → (after initial approval) cabinet with one current
   action; documents, terms, purchases and the report. Only the participant's own record is rendered. */
(function () {
  'use strict';
  var U = window.MGUI, M = window.MGModel, ST = window.MGStore, SEED = window.MGSeed, X = window.MGExports;
  var tr = U.tr, esc = U.esc;
  var ORG = tr('Центр підтримки бізнесу (демо)', 'Business Support Centre (demo)');
  var ui = { applyStep: 0, sent: null, trackFails: 0, lockUntil: 0, addLine: null };

  /* ---------------- short application ---------------- */
  function intakeDraft() { return ST.draft('new', 'intake') || { lastName: '', firstName: '', phone: '', community: M.PROGRAMME.community, settlement: '', members: '', vulnerabilities: [], businessType: '', ideaTitle: '', ideaShort: '', existing: '', requestedApprox: '', consents: { selection: false, contact: false } }; }
  function inp(k, label, d, attrs) { return '<div class="d-field"><label class="d-label" for="in_' + k + '">' + label + '</label><input id="in_' + k + '" class="d-input" data-in="' + k + '" value="' + esc(d[k]) + '"' + (attrs || '') + '><span class="d-error" data-err="' + k + '"></span></div>'; }
  var STEP_FIELDS = [['lastName', 'firstName', 'phone', 'community', 'settlement', 'members'], ['businessType', 'ideaTitle', 'ideaShort', 'existing', 'requestedApprox'], []];
  function apply() {
    var d = intakeDraft(), s = ui.applyStep, steps = [tr('Про вас', 'About you'), tr('Про бізнес', 'About the business'), tr('Згоди й подання', 'Consents and submit')];
    var h = '<section class="v3-p"><p class="v3-org">' + ORG + ' · ' + tr('конкурс мікрогрантів 2026', 'microgrants 2026') + '</p><h1>' + tr('Коротка заявка', 'Short application') + '</h1>' +
      '<p class="v3-lead">' + tr('Три кроки, 5 хвилин. Після первинного розгляду вас запросять до кабінету для бізнес-плану й кошторису. Рішення про грант ухвалює комісія пізніше.', 'Three steps, five minutes. After the initial review you are invited to a cabinet for the business plan and budget. The committee decides on grants later.') + '</p>' +
      '<ol class="v3-steps" aria-label="' + tr('Кроки заявки', 'Application steps') + '">' + steps.map(function (t, i) { return '<li class="' + (i === s ? 'is-cur' : i < s ? 'is-done' : '') + '"' + (i === s ? ' aria-current="step"' : '') + '><b>' + (i + 1) + '</b>' + esc(t) + '</li>'; }).join('') + '</ol><div class="v3-form">';
    if (s === 0) {
      h += inp('lastName', tr('Прізвище', 'Last name'), d) + inp('firstName', tr('Ім’я', 'First name'), d) + inp('phone', tr('Телефон для зв’язку', 'Contact phone'), d, ' inputmode="tel"') +
        '<div class="d-field"><label class="d-label" for="in_community">' + tr('Громада', 'Community') + '</label><select id="in_community" class="d-select" data-in="community">' + M.PROGRAMME.communities.map(function (c) { return '<option' + (d.community === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
        (d.community !== M.PROGRAMME.community ? '<p class="mg-warn">' + tr('Програма працює в «Демонстраційній громаді». Подати можна, але заявку можуть не допустити.', 'The programme serves the “Demonstration community”. You can submit, but the application may not be admitted.') + '</p>' : '') + '</div>' +
        inp('settlement', tr('Населений пункт', 'Settlement'), d) + inp('members', tr('Скільки людей у домогосподарстві', 'Household size'), d, ' inputmode="numeric"');
    } else if (s === 1) {
      h += '<div class="d-field"><label class="d-label" for="in_businessType">' + tr('Сфера', 'Field') + '</label><select id="in_businessType" class="d-select" data-in="businessType"><option value="">' + tr('Оберіть', 'Choose') + '</option>' +
        Object.keys(U.BUSINESS).map(function (k) { return '<option value="' + k + '"' + (d.businessType === k ? ' selected' : '') + '>' + esc(U.business(k)) + '</option>'; }).join('') + '</select><span class="d-error" data-err="businessType"></span></div>' +
        inp('ideaTitle', tr('Назва бізнес-ідеї', 'Business idea'), d) +
        '<div class="d-field"><label class="d-label" for="in_ideaShort">' + tr('Коротко: що зміниться завдяки гранту', 'In short: what the grant changes') + '</label><textarea id="in_ideaShort" class="d-textarea" data-in="ideaShort">' + esc(d.ideaShort) + '</textarea><span class="d-error" data-err="ideaShort"></span></div>' +
        '<fieldset class="d-field"><legend class="d-label">' + tr('Бізнес уже працює?', 'Is the business already running?') + '</legend><div class="mg-seg">' +
        '<label><input type="radio" name="existing" value="yes" data-in="existing"' + (d.existing === 'yes' ? ' checked' : '') + '><span>' + tr('Так', 'Yes') + '</span></label><label><input type="radio" name="existing" value="no" data-in="existing"' + (d.existing === 'no' ? ' checked' : '') + '><span>' + tr('Ні, стартап', 'No, a start-up') + '</span></label></div><span class="d-error" data-err="existing"></span></fieldset>' +
        inp('requestedApprox', tr('Орієнтовна сума гранту, грн (до 59 000)', 'Approximate grant, UAH (up to 59,000)'), d, ' inputmode="numeric"');
    } else {
      h += '<dl class="v3-summary">' + [[tr('Заявник', 'Applicant'), d.lastName + ' ' + d.firstName], [tr('Громада', 'Community'), d.community + ', ' + d.settlement], [tr('Ідея', 'Idea'), d.ideaTitle], [tr('Сума', 'Amount'), d.requestedApprox ? U.money(M.minor(d.requestedApprox)) : '—']]
        .map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<label class="v3-consent"><input type="checkbox" data-consent="selection"' + (d.consents.selection ? ' checked' : '') + '><span>' + tr('Погоджуюсь на обробку цих даних для відбору в програму.', 'I agree to the processing of this data for programme selection.') + '</span></label>' +
        '<label class="v3-consent"><input type="checkbox" data-consent="contact"' + (d.consents.contact ? ' checked' : '') + '><span>' + tr('Статуси й питання отримуватиму на сторінці заявки.', 'I will receive statuses and questions on the application page.') + '</span></label>';
    }
    h += '</div><div class="mg-nav">' + (s > 0 ? '<button type="button" class="d-btn" data-a="apply-back">' + tr('Назад', 'Back') + '</button>' : '<a class="v3-link" href="#/track">' + tr('Уже подали? Відкрити заявку', 'Already applied? Open your application') + '</a>') +
      '<button type="button" class="d-btn d-btn--primary" data-a="' + (s < 2 ? 'apply-next' : 'apply-submit') + '">' + (s < 2 ? tr('Далі', 'Next') : tr('Подати заявку', 'Submit application')) + U.icon('arrow') + '</button></div></section>';
    return h;
  }
  function sent() {
    var x = ui.sent;
    return '<section class="v3-p"><p class="v3-org">' + ORG + '</p><div class="v3-done-big">' + U.icon('check') + '</div><h1>' + tr('Заявку отримано', 'Application received') + '</h1>' +
      '<p class="v3-lead">' + tr('Збережіть код і ключ — з ними заявку можна відкрити на іншому пристрої. Ключ показуємо один раз.', 'Save the code and key — they open the application on another device. The key is shown only once.') + '</p>' +
      '<div class="v3-codes"><div><span>' + tr('Код заявки', 'Application code') + '</span><b data-code>' + esc(x.code) + '</b></div><div><span>' + tr('Ключ доступу', 'Access key') + '</span><b data-key>' + esc(x.key) + '</b></div></div>' +
      '<p class="mg-muted">' + tr('Що далі: організатор перевірить формальні умови (громада, тип діяльності) протягом кількох днів. Статус і питання з’являться на сторінці заявки.', 'Next: the organiser checks the formal criteria (community, type of activity) within a few days. Status and questions appear on the application page.') + '</p>' +
      '<div class="mg-actions"><a class="d-btn d-btn--primary" href="#/home">' + tr('Відкрити сторінку заявки', 'Open the application page') + U.icon('arrow') + '</a></div></section>';
  }
  function track() {
    var locked = Date.now() < ui.lockUntil;
    return '<section class="v3-p"><p class="v3-org">' + ORG + '</p><h1>' + tr('Відкрити заявку', 'Open your application') + '</h1>' +
      '<form class="v3-form" data-form="track"><div class="d-field"><label class="d-label" for="tr_code">' + tr('Код заявки', 'Application code') + '</label><input id="tr_code" class="d-input" name="code" placeholder="MG-12" autocomplete="off"></div>' +
      '<div class="d-field"><label class="d-label" for="tr_key">' + tr('Ключ доступу', 'Access key') + '</label><input id="tr_key" class="d-input" name="key" inputmode="numeric" autocomplete="off"></div>' +
      '<p class="d-error" id="trackErr">' + (locked ? tr('Забагато спроб. Спробуйте за 30 секунд.', 'Too many attempts. Try again in 30 seconds.') : '') + '</p>' +
      '<div class="mg-nav"><a class="v3-link" href="#/apply">' + tr('Подати нову заявку', 'Start a new application') + '</a><button type="submit" class="d-btn d-btn--primary"' + (locked ? ' disabled' : '') + '>' + tr('Відкрити', 'Open') + '</button></div></form></section>';
  }

  /* ---------------- home: one current action ---------------- */
  var STAGES = [['Заявка', 'Application'], ['Допуск', 'Admission'], ['Бізнес-план', 'Business plan'], ['Рішення комісії', 'Committee'], ['Документи й умови', 'Documents & terms'], ['Реалізація і звіт', 'Delivery & report']];
  function stageOf(st) {
    return { submitted: 0, under_review: 1, clarification_requested: 1, eligible: 1, not_eligible: 1, cabinet_active: 2, plan_submitted: 2, plan_changes_requested: 2, package_accepted: 3, awarded: 4, reserve: 3, not_selected: 3,
      agreement_sent: 4, agreement_confirmed: 4, implementation: 5, report_submitted: 5, report_changes_requested: 5, report_accepted: 5, closed: 5 }[st];
  }
  function strip(a) {
    var cur = a.status === 'withdrawn' ? -1 : stageOf(a.status);
    return '<ol class="v3-strip" aria-label="' + tr('Етапи', 'Stages') + '">' + STAGES.map(function (s, i) { return '<li class="' + (i === cur ? 'is-cur' : i < cur ? 'is-done' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '><i></i><span>' + tr(s[0], s[1]) + '</span></li>'; }).join('') + '</ol>';
  }
  function deadline(iso) { return iso ? '<p class="v3-due">' + U.icon('clock') + tr('Строк: до ', 'Due: ') + U.date(iso) + '</p>' : ''; }
  function fileRow(state, f, opts) {
    opts = opts || {};
    var cm = f.comments.filter(function (c) { return c.visibility === 'participant'; });
    var last = cm[cm.length - 1];
    return '<li class="v3-file" data-file="' + f.id + '" data-slot="' + esc(f.slot) + '"><div class="v3-file-main">' + U.icon('file') + '<div><b>' + esc(opts.title || U.slot(f.slot)) + '</b><span>v' + f.v + ' · ' + esc(f.name) + '</span></div>' + U.fileChip(f) + '</div>' +
      (last && f.status === 'needs_correction' ? '<p class="v3-pin">' + U.icon('msg') + '<span><b>' + tr('Організатор:', 'Organiser:') + '</b> ' + esc(last.text) + '</span></p>' : '') +
      (opts.actions || '') + '</li>';
  }
  function fileButtons(f) {
    if (f.kind === 'generated') return '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="dl-file" data-id="' + f.id + '">' + U.icon('dl') + tr('Завантажити', 'Download') + '</button></div>';
    return '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="view-file" data-id="' + f.id + '">' + U.icon('eye') + tr('Переглянути', 'View') + '</button></div>';
  }
  function decisionExplain() {
    return '<p class="v3-explain">' + tr('Допуск до другого етапу — ще не грант. Переможців обирає комісія після перевірки бізнес-плану й кошторису, у межах бюджету раунду.', 'Admission to the second stage is not yet a grant. The committee chooses winners after the business plan and budget are checked, within the round budget.') + '</p>';
  }
  function currentCard(state, a) {
    var na = M.nextAction(state, a.code), h = '';
    var card = function (title, body, cls) { return '<article class="v3-now ' + (cls || '') + '" id="now" data-next="' + na + '"><p class="v3-now-k">' + tr('Зараз', 'Now') + '</p><h2>' + title + '</h2>' + body + '</article>'; };
    switch (na) {
      case 'wait_review':
        return card(tr('Заявка на первинному розгляді', 'Your application is in initial review'), '<p>' + tr('Організатор перевіряє формальні умови: громаду, тип діяльності, попередні гранти. Якщо будуть питання — вони з’являться тут.', 'The organiser checks the formal criteria: community, type of activity, earlier grants. Any questions will appear here.') + '</p>' + decisionExplain());
      case 'answer_clarification': {
        var c = a.clarification;
        return card(tr('Організатор просить уточнити', 'The organiser asks for a clarification'), '<p class="v3-q">' + esc(c.question) + '</p><form data-form="respond"><div class="d-field"><label class="d-label" for="resp">' + tr('Ваша відповідь', 'Your answer') + '</label><textarea id="resp" class="d-textarea" name="value">' + esc(a.intake[c.field]) + '</textarea></div><button class="d-btn d-btn--primary" type="submit">' + tr('Надіслати відповідь', 'Send answer') + '</button></form>', 'is-warn');
      }
      case 'activate_cabinet':
        return card(tr('Вас допущено до подання документів', 'You are admitted to the documents stage'), '<p>' + tr('Активуйте кабінет: у ньому ви подасте бізнес-план і кошторис, а потім — документи й звіт.', 'Activate your cabinet to submit the business plan and budget, then documents and the report.') + '</p>' + decisionExplain() +
          '<label class="v3-consent"><input type="checkbox" id="c3"><span>' + tr('Погоджуюсь на обробку документів, які подам у кабінеті, для розгляду заявки й угоди.', 'I agree to the processing of documents I submit in the cabinet for the application and agreement.') + '</span></label>' +
          '<p class="v3-due">' + U.icon('clock') + tr('Запрошення дійсне до ', 'Invitation valid until ') + U.date(a.invite.expiresAt) + '</p><button type="button" class="d-btn d-btn--primary" data-a="activate">' + tr('Активувати кабінет', 'Activate cabinet') + U.icon('arrow') + '</button>', 'is-ok');
      case 'invite_expired':
        return card(tr('Запрошення прострочене', 'The invitation has expired'), '<p>' + tr('Організатор може надіслати нове — ми вже показали це в його черзі.', 'The organiser can send a new one — it is shown in their queue.') + '</p>', 'is-warn');
      case 'choose_verification':
        return card(tr('Перевірка: візит або відео', 'Verification: visit or video'), '<p>' + tr('Оберіть один формат. Відео замінює візит.', 'Choose one format. A video replaces the visit.') + '</p><div class="mg-choice"><button type="button" class="mg-choice-btn" data-a="verify" data-v="visit"><b>' + tr('Візит на місце', 'On-site visit') + '</b><span>' + tr('організатор узгодить день', 'the organiser agrees a day') + '</span></button><button type="button" class="mg-choice-btn" data-a="verify" data-v="video"><b>' + tr('Відеовізитівка', 'Video introduction') + '</b><span>' + tr('у демо — синтетичний зразок', 'a synthetic sample in the demo') + '</span></button></div>' + deadline(a.deadlines.plan));
      case 'submit_plan':
        return card(tr('Подайте бізнес-план і кошторис', 'Submit the business plan and budget'), '<p>' + tr('12 розділів за шаблоном презентації. Перевірки під час заповнення; файли .pptx і .xlsx збираються самі.', '12 sections following the presentation template. Checks as you type; the .pptx and .xlsx are built for you.') + '</p>' + deadline(a.deadlines.plan) + '<a class="d-btn d-btn--primary" href="#/plan">' + tr('Відкрити бізнес-план', 'Open business plan') + U.icon('arrow') + '</a>');
      case 'fix_plan': {
        var cs = window.MGPlan.corrections(state, a.code);
        return card(tr('Потрібні виправлення в бізнес-плані', 'Changes needed in the business plan'), '<ul class="v3-fixes">' + cs.map(function (c) { return '<li><b>' + esc(U.slot(c.file.slot)) + (c.anchor != null ? ' · ' + tr('позиція ', 'line ') + (c.anchor + 1) : '') + '</b><span>' + esc(c.text) + '</span></li>'; }).join('') + '</ul>' + deadline(a.deadlines.plan) +
          '<a class="d-btn d-btn--primary" href="#/plan">' + tr('Виправити', 'Fix it') + U.icon('arrow') + '</a>', 'is-warn');
      }
      case 'wait_plan_review':
        return card(tr('Бізнес-план на перевірці', 'Business plan in review'), '<p>' + tr('Організатор отримав файли й перевіряє кожен окремо.', 'The organiser received the files and reviews each one.') + '</p><ul class="v3-files">' + M.planFiles(state, a).map(function (f) { return fileRow(state, f, { actions: fileButtons(f) }); }).join('') + '</ul>');
      case 'wait_committee':
        return card(tr('Бізнес-план прийнято', 'Business plan accepted'), '<p>' + tr('Пакет повний і перевірений. Далі — рішення комісії про фінансування.', 'The package is complete and checked. Next: the committee’s funding decision.') + '</p>' + decisionExplain(), 'is-ok');
      case 'choose_ptype': case 'upload_docs': case 'wait_docs_review':
        return awardCard(a) + docsCard(state, a, na);
      case 'confirm_agreement': return awardCard(a) + agreementCard(state, a);
      case 'wait_transfer':
        return card(tr('Умови підтверджено', 'Terms confirmed'), '<p>' + tr('Організатор позначить перерахування коштів. Після цього відкриється облік покупок.', 'The organiser will mark the transfer. Then purchase tracking opens.') + '</p>', 'is-ok');
      case 'add_purchases': case 'fix_report':
        return card(na === 'fix_report' ? tr('Звіт повернуто на виправлення', 'The report was returned for changes') : tr('Купуйте за затвердженими рядками й додавайте чеки', 'Buy along the approved lines and add receipts'),
          (na === 'fix_report' ? reportFixes(state, a) : '<p>' + tr('Кожна покупка — з чеком. Після всіх покупок подайте звіт.', 'Every purchase needs a receipt. When done, submit the report.') + '</p>') + deadline(a.deadlines.report) +
          '<a class="d-btn d-btn--primary" href="#/report">' + (na === 'fix_report' ? tr('Виправити звіт', 'Fix the report') : tr('Покупки й звіт', 'Purchases and report')) + U.icon('arrow') + '</a>', na === 'fix_report' ? 'is-warn' : '');
      case 'wait_report_review':
        return card(tr('Звіт на перевірці', 'Report in review'), '<p>' + tr('Організатор перевіряє кожен чек окремо.', 'The organiser checks every receipt.') + '</p>');
      case 'wait_close': case 'closed':
        return card(na === 'closed' ? tr('Грант закрито', 'Grant closed') : tr('Звіт прийнято', 'Report accepted'), '<p>' + tr('Дякуємо! Прийняті витрати: ', 'Thank you! Accepted spending: ') + U.money(window.MGLedger.ledger(state).apps.filter(function (r) { return r.code === a.code; })[0].grantAccepted) + '.</p>', 'is-ok');
      case 'reserve':
        return card(tr('Ви в резервному списку', 'You are on the reserve list'), '<p>' + tr('Якщо хтось із переможців відмовиться, організатор зв’яжеться тут.', 'If a winner withdraws, the organiser will contact you here.') + '</p>');
      case 'not_selected':
        return card(tr('Цього разу грант не надано', 'No grant this time'), '<p>' + tr('Комісія мала більше сильних заявок, ніж бюджет раунду. Ваш бізнес-план залишається в кабінеті.', 'The committee had more strong applications than the round budget. Your business plan stays in the cabinet.') + '</p>', 'is-bad');
      case 'not_eligible':
        return card(tr('Заявку не допущено', 'Application not admitted'), '<p>' + esc(reasonText(a.screening.reason)) + '</p>' + (a.screening.note ? '<p class="v3-q">' + esc(a.screening.note) + '</p>' : ''), 'is-bad');
      case 'withdrawn':
        return card(tr('Заявку відкликано', 'Application withdrawn'), '<p>' + tr('Ви відкликали заявку. Історія залишається доступною.', 'You withdrew the application. The history stays available.') + '</p>', 'is-bad');
    }
    return h;
  }
  function reasonText(r) {
    return { outside_community: tr('Програма працює лише в «Демонстраційній громаді».', 'The programme serves the “Demonstration community” only.'), not_business: tr('Ідея не стосується підприємницької діяльності.', 'The idea is not a business activity.'),
      prior_grant: tr('Протягом двох років ви вже отримували грант програми.', 'You received a programme grant within the last two years.'), other: tr('Причина — у поясненні організатора нижче.', 'See the organiser’s explanation below.') }[r] || r;
  }
  function awardCard(a) {
    var lines = a.award.lines;
    return '<article class="v3-award" id="award"><p class="v3-now-k">' + tr('Рішення комісії', 'Committee decision') + '</p><h2>' + tr('Грант надано: ', 'Grant awarded: ') + U.money(a.award.approvedMinor) + '</h2>' +
      '<table class="v3-lines"><tbody>' + lines.map(function (l) { return '<tr><td>' + esc(l.name) + '</td><td>' + U.money(l.approvedMinor) + (l.approvedMinor !== l.requestedMinor ? '<small>' + tr('запит ', 'requested ') + U.money(l.requestedMinor) + '</small>' : '') + '</td></tr>'; }).join('') + '</tbody></table></article>';
  }
  function docsCard(state, a, na) {
    var h = '<article class="v3-now" id="now" data-next="' + na + '"><p class="v3-now-k">' + tr('Зараз', 'Now') + '</p><h2>' + (na === 'wait_docs_review' ? tr('Документи на перевірці', 'Documents in review') : tr('Документи для угоди', 'Documents for the agreement')) + '</h2>';
    if (!a.docs.ptype) {
      return h + '<p>' + tr('Який у вас паспорт?', 'Which passport do you have?') + '</p><div class="mg-seg"><button type="button" class="d-btn" data-a="ptype" data-v="id">' + tr('ID-картка', 'ID card') + '</button><button type="button" class="d-btn" data-a="ptype" data-v="book">' + tr('Книжечка', 'Booklet') + '</button></div>' + deadline(a.deadlines.docs) + '</article>';
    }
    h += '<p class="mg-muted">' + tr('У демо — лише синтетичні зразки. Справжні документи сюди не завантажуйте.', 'The demo takes synthetic samples only. Do not upload real documents.') + '</p><ul class="v3-files">';
    M.requiredDocSlots(a).forEach(function (sl) {
      var f = M.currentFile(state, a.code, 'doc:' + sl);
      if (!f) { h += '<li class="v3-file is-empty" data-slot="doc:' + sl + '"><div class="v3-file-main">' + U.icon('file') + '<div><b>' + esc(U.slot('doc:' + sl)) + '</b><span>' + tr('ще не додано', 'not added yet') + '</span></div></div><div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="doc-add" data-slot="' + sl + '">' + U.icon('plus') + tr('Додати зразок', 'Add sample') + '</button></div></li>'; return; }
      var btn = fileButtons(f).replace('</div>', (f.status === 'needs_correction' ? '<button type="button" class="d-btn d-btn--small d-btn--primary" data-a="doc-add" data-slot="' + sl + '">' + tr('Замінити зразком', 'Replace with sample') + '</button>' : '') + '</div>');
      h += fileRow(state, f, { actions: btn });
    });
    h += '</ul><div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="dl-costlist">' + U.icon('dl') + tr('Перелік статей витрат (.docx)', 'List of cost items (.docx)') + '</button></div>' + deadline(a.deadlines.docs) + '</article>';
    return h;
  }
  function agreementCard(state, a) {
    var f = state.files[a.agreement.fileId];
    return '<article class="v3-now" id="now" data-next="confirm_agreement"><p class="v3-now-k">' + tr('Зараз', 'Now') + '</p><h2>' + tr('Підтвердьте умови гранту', 'Confirm the grant terms') + '</h2>' +
      '<ul class="v3-terms"><li>' + tr('Купуєте лише за затвердженими рядками.', 'Buy only along the approved lines.') + '</li><li>' + tr('Витрати понад суму рядка грантом не покриваються.', 'Spending above a line is not covered by the grant.') + '</li><li>' + tr('Звіт з чеками й фото — протягом 30 днів після перерахування.', 'Report with receipts and photos within 30 days of the transfer.') + '</li></ul>' +
      '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="dl-file" data-id="' + f.id + '">' + U.icon('dl') + esc(U.slot(f.slot)) + '</button></div>' +
      '<form data-form="confirm"><label class="v3-consent"><input type="checkbox" name="agree"><span>' + tr('Я ознайомилась(-вся) з умовами й погоджуюсь їх виконувати.', 'I have read the terms and agree to follow them.') + '</span></label>' +
      '<div class="d-field"><label class="d-label" for="cname">' + tr('Прізвище та ім’я, як у заявці', 'Last and first name as in the application') + '</label><input id="cname" class="d-input" name="name" autocomplete="off"></div>' +
      '<p class="mg-muted">' + tr('Це підтвердження в кабінеті, а не електронний підпис.', 'This is a confirmation in the cabinet, not an electronic signature.') + '</p>' +
      '<button class="d-btn d-btn--primary" type="submit">' + tr('Підтвердити умови', 'Confirm terms') + '</button></form></article>';
  }
  function reportFixes(state, a) {
    var r = M.latestReport(a);
    return '<ul class="v3-fixes">' + r.purchases.map(function (q) { var d = M.validDecision(a, q); return d && d.decision === 'correct' ? '<li><b>' + esc(q.supplier) + ' · ' + U.money(q.amountMinor) + '</b><span>' + esc(d.reason) + '</span></li>' : ''; }).join('') + '</ul>';
  }
  function doneList(state, a) {
    var rows = [];
    var at = function (st) { var h = a.history.filter(function (x) { return x.status === st; }); return h.length ? h[h.length - 1].at : null; };
    rows.push([tr('Заявку подано', 'Application submitted'), U.date(a.createdAt)]);
    if (at('eligible')) rows.push([tr('Допущено до подання документів', 'Admitted to the documents stage'), U.date(at('eligible'))]);
    if (a.activatedAt) rows.push([tr('Кабінет активовано', 'Cabinet activated'), U.date(a.activatedAt)]);
    if (a.plan.versions.length) rows.push([tr('Бізнес-план подано', 'Business plan submitted') + (a.plan.versions.length > 1 ? ' · v' + a.plan.versions.length : ''), U.date(M.latestPlan(a).at)]);
    if (at('package_accepted')) rows.push([tr('Бізнес-план прийнято', 'Business plan accepted'), U.date(at('package_accepted'))]);
    if (a.award && a.award.decision === 'award' && M.nextAction(state, a.code).indexOf('docs') < 0 && ['awarded'].indexOf(a.status) < 0) rows.push([tr('Грант надано: ', 'Grant awarded: ') + U.money(a.award.approvedMinor), U.date(a.award.at)]);
    if (a.agreement && a.agreement.confirmedAt) rows.push([tr('Умови підтверджено', 'Terms confirmed'), U.date(a.agreement.confirmedAt)]);
    if (a.transfer) rows.push([tr('Перерахування позначено організатором', 'Transfer marked by the organiser'), U.date(a.transfer.at)]);
    if (rows.length < 2) return '';
    return '<details class="v3-donelist"><summary>' + tr('Пройдено: ', 'Done: ') + rows.length + '</summary><ul>' + rows.map(function (r) { return '<li>' + U.icon('check') + '<span>' + esc(r[0]) + '</span><time>' + r[1] + '</time></li>'; }).join('') + '</ul></details>';
  }
  function home(state, code) {
    var a = state.apps[code];
    if (!a) return '<section class="v3-p"><h1>' + tr('Заявку не знайдено', 'Application not found') + '</h1><a class="v3-link" href="#/apply">' + tr('Подати заявку', 'Apply') + '</a></section>';
    var feed = M.participantFeed(state, code).filter(function (m) { return m.kind === 'reminder' || m.kind === 'extended'; }).slice(0, 2);
    var cabinet = M.history ? true : a.activatedAt;
    var h = '<section class="v3-p"><header class="v3-head"><p class="v3-org">' + ORG + ' · ' + (a.activatedAt ? tr('кабінет учасника', 'participant cabinet') : tr('сторінка заявки', 'application page')) + '</p>' +
      '<h1>' + esc(a.intake.firstName + ' ' + a.intake.lastName) + '</h1><p class="v3-sub"><b>' + esc(code) + '</b> · ' + esc(a.intake.ideaTitle) + '</p>' + U.chip(a.status) + '</header>' + strip(a);
    h += feed.map(function (m) { return '<p class="v3-notice" role="note">' + U.icon('msg') + '<span>' + (m.kind === 'reminder' ? '<b>' + tr('Нагадування організатора:', 'Organiser reminder:') + '</b> ' + esc(m.text) : tr('Строк продовжено до ', 'Deadline extended to ') + U.date(m.text.split('|')[1])) + '</span></p>'; }).join('');
    h += currentCard(state, a) + doneList(state, a);
    h += '<nav class="v3-foot"><a class="v3-link" href="#/history">' + tr('Історія й згоди', 'History and consents') + '</a>' +
      (M.WITHDRAWABLE.indexOf(a.status) > -1 ? '<button type="button" class="v3-link v3-link--muted" data-a="withdraw">' + tr('Відкликати заявку', 'Withdraw application') + '</button>' : '') + '</nav></section>';
    void cabinet;
    return h;
  }

  /* ---------------- purchases and report ---------------- */
  function report(state, code) {
    var a = state.apps[code];
    if (['implementation', 'report_changes_requested', 'report_submitted', 'report_accepted', 'closed'].indexOf(a.status) < 0) return home(state, code);
    var editable = ['implementation', 'report_changes_requested'].indexOf(a.status) > -1;
    var ps = M.activePurchases(state, code), r = M.latestReport(a), dr = ST.draft(code, 'report') || { inUse: null, weekly: '', jobs: '', narrative: '', notPurchased: {} };
    var decOf = function (p) { if (!r) return null; var e = r.purchases.filter(function (q) { return q.id === p.id; })[0]; return e ? M.validDecision(a, e) : null; };
    var h = '<section class="v3-p v3-report"><a class="v3-back" href="#/home">' + U.icon('back') + tr('До кабінету', 'Back to cabinet') + '</a><h1>' + tr('Покупки й звіт', 'Purchases and report') + '</h1>' +
      '<p class="v3-lead">' + tr('Перерахування позначено ', 'Transfer marked ') + U.date(a.transfer.at) + ' · ' + tr('звіт до ', 'report due ') + U.date(a.deadlines.report) + '</p>';
    a.award.lines.filter(function (l) { return l.approvedMinor > 0; }).forEach(function (l) {
      var lp = ps.filter(function (p) { return p.lineIdx === l.idx; }), sum = lp.reduce(function (t, p) { return t + p.amountMinor; }, 0);
      h += '<article class="v3-line" data-line="' + l.idx + '"><header><b>' + esc(l.name) + '</b><span>' + U.money(sum) + ' / ' + U.money(l.approvedMinor) + '</span></header>' +
        (sum > l.approvedMinor ? '<p class="mg-warn">' + tr('Сума чеків більша за затверджену: різниця грантом не покривається.', 'Receipts exceed the approved amount: the difference is not covered by the grant.') + '</p>' : '') + '<ul class="v3-purchases">' +
        lp.map(function (p) {
          var d = decOf(p), rc = M.currentFile(state, code, 'receipt:' + p.id);
          return '<li data-purchase="' + p.id + '"><div><b>' + U.money(p.amountMinor) + '</b> · ' + esc(p.supplier) + ' · ' + U.date(p.date) + (p.funding === 'own' ? ' · <span class="v3-chip v3-chip--muted">' + tr('власні кошти', 'own funds') + '</span>' : '') + '</div>' +
            '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="view-file" data-id="' + rc.id + '">' + U.icon('eye') + tr('Чек', 'Receipt') + ' v' + rc.v + '</button>' +
            (d ? '<span class="v3-chip v3-chip--' + (d.decision === 'accept' ? 'ok' : d.decision === 'correct' ? 'warn' : 'bad') + '">' + (d.decision === 'accept' ? tr('прийнято ', 'accepted ') + U.money(d.acceptedMinor) : d.decision === 'correct' ? tr('виправити', 'fix') : tr('виключено', 'excluded')) + '</span>' : '') +
            (editable && (!d || d.decision === 'correct') ? '<button type="button" class="d-btn d-btn--small" data-a="receipt-replace" data-id="' + p.id + '">' + tr('Новий чек (зразок)', 'New receipt (sample)') + '</button><button type="button" class="d-btn d-btn--small d-btn--ghost" data-a="purchase-remove" data-id="' + p.id + '">' + tr('Видалити', 'Remove') + '</button>' : '') + '</div>' +
            (d && d.reason && d.decision !== 'accept' ? '<p class="v3-pin">' + U.icon('msg') + '<span>' + esc(d.reason) + '</span></p>' : d && d.reason ? '<p class="mg-muted">' + esc(d.reason) + '</p>' : '') + '</li>';
        }).join('') + '</ul>';
      if (editable) {
        if (ui.addLine === l.idx) {
          h += '<form class="v3-addp" data-form="purchase" data-line="' + l.idx + '"><div class="v3-row"><div class="d-field"><label class="d-label" for="pa_' + l.idx + '">' + tr('Сума, грн', 'Amount, UAH') + '</label><input id="pa_' + l.idx + '" class="d-input" name="amount" inputmode="decimal"></div>' +
            '<div class="d-field"><label class="d-label" for="pd_' + l.idx + '">' + tr('Дата', 'Date') + '</label><input id="pd_' + l.idx + '" class="d-input" type="date" name="date" value="' + state.clock.slice(0, 10) + '" min="' + a.transfer.at.slice(0, 10) + '" max="' + state.clock.slice(0, 10) + '"></div></div>' +
            '<div class="d-field"><label class="d-label" for="ps_' + l.idx + '">' + tr('Постачальник', 'Supplier') + '</label><input id="ps_' + l.idx + '" class="d-input" name="supplier"></div>' +
            '<div class="d-field"><label class="d-label" for="pf_' + l.idx + '">' + tr('З яких коштів', 'Paid from') + '</label><select id="pf_' + l.idx + '" class="d-select" name="funding"><option value="grant">' + tr('Грант', 'Grant') + '</option><option value="own">' + tr('Власні кошти', 'Own funds') + '</option></select></div>' +
            '<p class="mg-muted">' + tr('Чек додається синтетичним зразком.', 'A synthetic sample receipt is attached.') + '</p><div class="mg-actions"><button class="d-btn d-btn--primary d-btn--small" type="submit">' + tr('Додати покупку', 'Add purchase') + '</button><button type="button" class="d-btn d-btn--small d-btn--ghost" data-a="add-cancel">' + tr('Скасувати', 'Cancel') + '</button></div></form>';
        } else {
          h += '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-a="add-purchase" data-line="' + l.idx + '">' + U.icon('plus') + tr('Додати покупку', 'Add purchase') + '</button></div>';
          if (!lp.length) h += '<div class="d-field"><label class="d-label" for="np_' + l.idx + '">' + tr('Не купували? Поясніть чому', 'Not bought? Explain why') + '</label><input id="np_' + l.idx + '" class="d-input" data-np="' + l.idx + '" value="' + esc((dr.notPurchased || {})[l.idx] || '') + '"></div>';
        }
      }
      h += '</article>';
    });
    if (editable) {
      var ev = M.currentFile(state, code, 'evidence:photo');
      h += '<article class="v3-line"><header><b>' + tr('Результати', 'Results') + '</b></header>' +
        '<div class="mg-actions">' + (ev ? '<button type="button" class="d-btn d-btn--small" data-a="view-file" data-id="' + ev.id + '">' + U.icon('eye') + tr('Фото обладнання', 'Equipment photo') + '</button>' : '<button type="button" class="d-btn d-btn--small" data-a="evidence-add">' + U.icon('plus') + tr('Фото обладнання на місці (зразок)', 'Photo of equipment in place (sample)') + '</button>') + '</div>' +
        '<fieldset class="d-field"><legend class="d-label">' + tr('Обладнання встановлене й працює?', 'Is the equipment installed and in use?') + '</legend><div class="mg-seg"><label><input type="radio" name="inUse" value="yes" data-rep="inUse"' + (dr.inUse === true ? ' checked' : '') + '><span>' + tr('Так', 'Yes') + '</span></label><label><input type="radio" name="inUse" value="no" data-rep="inUse"' + (dr.inUse === false ? ' checked' : '') + '><span>' + tr('Ні', 'No') + '</span></label></div></fieldset>' +
        '<div class="v3-row"><div class="d-field"><label class="d-label" for="rw">' + tr('Виробів/послуг на тиждень', 'Products/services per week') + '</label><input id="rw" class="d-input" inputmode="numeric" data-rep="weekly" value="' + esc(dr.weekly) + '"></div>' +
        '<div class="d-field"><label class="d-label" for="rj">' + tr('Нових робочих місць', 'New jobs') + '</label><input id="rj" class="d-input" inputmode="numeric" data-rep="jobs" value="' + esc(dr.jobs) + '"></div></div>' +
        '<div class="d-field"><label class="d-label" for="rn">' + tr('Що змінилося', 'What changed') + '</label><textarea id="rn" class="d-textarea" data-rep="narrative">' + esc(dr.narrative) + '</textarea></div>' +
        '<p class="mg-muted">' + tr('Показники — ваша самооцінка; у звіті для донора вони так і позначені.', 'Figures are your own estimate; the sponsor report labels them so.') + '</p></article>' +
        '<div class="mg-submit"><button type="button" class="d-btn d-btn--primary" data-a="report-submit">' + U.icon('arrow') + (a.status === 'report_changes_requested' ? tr('Подати виправлений звіт', 'Submit the corrected report') : tr('Подати звіт', 'Submit report')) + '</button></div>';
    }
    return h + '</section>';
  }

  function history(state, code) {
    var a = state.apps[code];
    var rows = a.history.map(function (x) { return { ev: x.ev, at: x.at, text: U.status(x.status) + (x.version ? ' · v' + x.version : '') }; });
    a.consents.forEach(function (c) { rows.push({ ev: c.ev, at: c.at, text: tr('Згода: ', 'Consent: ') + { selection: tr('обробка даних для відбору', 'data processing for selection'), contact: tr('статуси на сторінці заявки', 'statuses on the application page'), documents: tr('обробка документів у кабінеті', 'processing documents in the cabinet') }[c.kind] }); });
    Object.keys(state.files).forEach(function (k) { var f = state.files[k]; if (f.appId === code) rows.push({ ev: f.ev, at: f.at, text: U.slot(f.slot) + ' v' + f.v + ' — ' + tr('додано', 'added') }); });
    rows.sort(function (x, y) { return y.ev - x.ev; });
    return '<section class="v3-p"><a class="v3-back" href="#/home">' + U.icon('back') + tr('До кабінету', 'Back to cabinet') + '</a><h1>' + tr('Історія й згоди', 'History and consents') + '</h1><ol class="v3-timeline">' +
      rows.map(function (r) { return '<li><time>' + U.dateTime(r.at) + '</time><span>' + esc(r.text) + '</span></li>'; }).join('') + '</ol></section>';
  }

  /* ---------------- events ---------------- */
  function readIntake() {
    var d = intakeDraft();
    Array.prototype.forEach.call(document.querySelectorAll('[data-in]'), function (el) { if (el.type === 'radio') { if (el.checked) d[el.getAttribute('data-in')] = el.value; } else d[el.getAttribute('data-in')] = el.value; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-consent]'), function (el) { d.consents[el.getAttribute('data-consent')] = el.checked; });
    ST.saveDraft('new', 'intake', d); return d;
  }
  function validateStep(d, s) {
    var bad = STEP_FIELDS[s].filter(function (k) { return !String(d[k] || '').trim(); });
    if (s === 0 && d.members && !(parseInt(d.members, 10) > 0)) bad.push('members');
    if (s === 1 && d.requestedApprox && (M.minor(d.requestedApprox) <= 0 || M.minor(d.requestedApprox) > M.PROGRAMME.grantMaxMinor)) bad.push('requestedApprox');
    Array.prototype.forEach.call(document.querySelectorAll('[data-err]'), function (el) { el.textContent = bad.indexOf(el.getAttribute('data-err')) > -1 ? tr('Заповніть поле правильно.', 'Fill this in correctly.') : ''; });
    bad.forEach(function (k) { var el = document.querySelector('[data-in="' + k + '"]'); if (el) el.classList.add('invalid'); });
    if (bad.length) { var f = document.querySelector('[data-in="' + bad[0] + '"]'); if (f) f.focus(); }
    return !bad.length;
  }
  function genKey() { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return String(100000 + a[0] % 900000); }
  function onClick(e, rerender) {
    var b = e.target.closest('[data-a]'); if (!b) return false;
    var a = b.getAttribute('data-a'), sess = ST.session(), code = sess.appId, state = U.state();
    if (a === 'apply-next') { var d = readIntake(); if (validateStep(d, ui.applyStep)) { ui.applyStep++; rerender(); } }
    else if (a === 'apply-back') { readIntake(); ui.applyStep--; rerender(); }
    else if (a === 'apply-submit') {
      var d2 = readIntake();
      if (!d2.consents.selection || !d2.consents.contact) { U.toast(U.errText('consent_required'), true); return true; }
      var intake = {}; M.INTAKE_REQUIRED.forEach(function (k) { intake[k] = d2[k]; }); intake.vulnerabilities = d2.vulnerabilities || [];
      var key = genKey(); b.disabled = true;
      ST.dispatch({ type: 'apply.submit', actor: { role: 'applicant' }, p: { intake: intake, consents: d2.consents, key: key } }).then(function (r) {
        b.disabled = false;
        if (!r.ok) { U.toast(U.errText(r.error), true); return; }
        window.localStorage.removeItem('vi-mg-v3-draft-intake-new'); ui.applyStep = 0; ui.sent = { code: r.event.appId, key: key };
        ST.setSession({ role: 'applicant', appId: r.event.appId }); window.location.hash = '#/sent';
      });
    }
    else if (a === 'activate') { if (!document.getElementById('c3').checked) { U.toast(U.errText('consent_required'), true); return true; } U.act('cabinet.activate', code, { consent: true }, tr('Кабінет активовано', 'Cabinet activated')); }
    else if (a === 'verify') U.act('verification.choose', code, { choice: b.getAttribute('data-v') }, b.getAttribute('data-v') === 'video' ? tr('Відео отримано — організатор його бачить', 'Video received — the organiser can see it') : tr('Обрано візит', 'Visit chosen'));
    else if (a === 'ptype') U.act('docs.ptype', code, { ptype: b.getAttribute('data-v') });
    else if (a === 'doc-add') U.act('doc.add', code, { slot: b.getAttribute('data-slot'), sample: true }, tr('Зразок додано — організатор бачить нову версію', 'Sample added — the organiser sees the new version'));
    else if (a === 'dl-file') U.download(window.MGState.fileJob(state, b.getAttribute('data-id')), b);
    else if (a === 'dl-costlist') U.download(X.costList(state, code), b);
    else if (a === 'view-file') { var f = state.files[b.getAttribute('data-id')], p = /^receipt:/.test(f.slot) ? state.purchases[f.slot.slice(8)] : null; U.samplePreview(f, p ? { supplier: p.supplier, amount: U.money(p.amountMinor), date: U.date(p.date) } : {}); }
    else if (a === 'withdraw') {
      U.modal(tr('Відкликати заявку?', 'Withdraw the application?'), '<p>' + tr('Організатор побачить, що ви відкликали заявку. Якщо грант уже надано, кошти повернуться в бюджет раунду. Скасувати це не можна.', 'The organiser will see the withdrawal. If a grant was awarded, the money returns to the round budget. This cannot be undone.') + '</p>',
        [{ label: tr('Скасувати', 'Cancel'), value: null }, { label: tr('Відкликати', 'Withdraw'), value: 'yes', primary: true }]).then(function (v) { if (v) U.act('app.withdraw', code, { reason: '' }, tr('Заявку відкликано', 'Application withdrawn')); });
    }
    else if (a === 'add-purchase') { ui.addLine = +b.getAttribute('data-line'); rerender(); var i = document.getElementById('pa_' + ui.addLine); if (i) i.focus(); }
    else if (a === 'add-cancel') { ui.addLine = null; rerender(); }
    else if (a === 'receipt-replace') U.act('purchase.receipt', code, { purchaseId: b.getAttribute('data-id') }, tr('Новий чек додано', 'New receipt added'));
    else if (a === 'purchase-remove') U.act('purchase.remove', code, { purchaseId: b.getAttribute('data-id') });
    else if (a === 'evidence-add') U.act('evidence.add', code, { sample: true });
    else if (a === 'report-submit') {
      var dr = ST.draft(code, 'report') || {};
      U.act('report.submit', code, { indicators: { inUse: dr.inUse, weekly: parseInt(dr.weekly, 10), jobs: parseInt(dr.jobs, 10) }, narrative: dr.narrative || '', notPurchased: dr.notPurchased || {} }, tr('Звіт подано', 'Report submitted'))
        .then(function (r) { if (r.ok) window.location.hash = '#/home'; });
    }
    else return false;
    return true;
  }
  function onSubmit(e) {
    var f = e.target.closest('[data-form]'); if (!f) return false;
    e.preventDefault();
    var kind = f.getAttribute('data-form'), code = ST.session().appId, state = U.state();
    if (kind === 'track') {
      if (Date.now() < ui.lockUntil) return true;
      var c = f.code.value.trim().toUpperCase();
      if (M.checkKey(state, c, f.key.value)) { ui.trackFails = 0; ST.setSession({ role: 'applicant', appId: c }); window.location.hash = '#/home'; }
      else {
        ui.trackFails++;
        if (ui.trackFails >= 3) { ui.lockUntil = Date.now() + 30000; ui.trackFails = 0; }
        document.getElementById('trackErr').textContent = ui.lockUntil > Date.now() ? tr('Забагато спроб. Спробуйте за 30 секунд.', 'Too many attempts. Try again in 30 seconds.') : tr('Код або ключ не збігаються.', 'The code or key does not match.');
      }
    } else if (kind === 'respond') U.act('app.respond', code, { field: state.apps[code].clarification.field, value: f.value.value }, tr('Відповідь надіслано', 'Answer sent'));
    else if (kind === 'confirm') U.act('agreement.confirm', code, { agree: f.agree.checked, name: f.name.value }, tr('Умови підтверджено', 'Terms confirmed'));
    else if (kind === 'purchase') {
      U.act('purchase.add', code, { lineIdx: +f.getAttribute('data-line'), amountMinor: M.minor(f.amount.value), date: f.date.value, supplier: f.supplier.value.trim(), funding: f.funding.value }, tr('Покупку додано', 'Purchase added'))
        .then(function (r) { if (r.ok) { ui.addLine = null; window.MGState.rerender(); } });
    }
    return true;
  }
  function onInput(e) {
    var t = e.target, code = ST.session().appId;
    if (t.hasAttribute('data-in')) { t.classList.remove('invalid'); readIntake(); return true; }
    if (t.hasAttribute('data-rep') || t.hasAttribute('data-np')) {
      var dr = ST.draft(code, 'report') || { inUse: null, weekly: '', jobs: '', narrative: '', notPurchased: {} };
      if (t.hasAttribute('data-np')) { dr.notPurchased = dr.notPurchased || {}; dr.notPurchased[t.getAttribute('data-np')] = t.value; }
      else if (t.getAttribute('data-rep') === 'inUse') dr.inUse = t.value === 'yes';
      else dr[t.getAttribute('data-rep')] = t.value;
      ST.saveDraft(code, 'report', dr); return true;
    }
    return false;
  }
  function prefillIntake() {
    var d = JSON.parse(JSON.stringify(SEED.IRYNA_INTAKE)); d.consents = { selection: false, contact: false };
    ST.saveDraft('new', 'intake', d);
  }
  function resetUi() { ui.applyStep = 0; ui.sent = null; ui.addLine = null; }

  window.MGParticipant = { apply: apply, sent: sent, track: track, home: home, report: report, history: history, onClick: onClick, onSubmit: onSubmit, onInput: onInput, prefillIntake: prefillIntake, resetUi: resetUi, hasSent: function () { return !!ui.sent; } };
})();
