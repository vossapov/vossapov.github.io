/* Organiser side: actionable queues, one application with its decision panel, file versions and history,
   the selection board with the round budget, and the sponsor report built from accepted decisions. */
(function () {
  'use strict';
  var U = window.MGUI, M = window.MGModel, L = window.MGLedger, ST = window.MGStore, X = window.MGExports;
  var tr = U.tr, esc = U.esc;
  var ui = { sel: {}, trace: null, allFilter: 'all' };

  function nav(cur) {
    var items = [['#/org', tr('Черги', 'Queues'), 'queues'], ['#/org/selection', tr('Відбір', 'Selection'), 'selection'], ['#/org/sponsor', tr('Звіт для донора', 'Sponsor report'), 'sponsor'], ['#/org/all', tr('Усі заявки', 'All applications'), 'all']];
    return '<nav class="v3-onav" aria-label="' + tr('Розділи організатора', 'Organiser sections') + '">' + items.map(function (i) { return '<a href="' + i[0] + '"' + (i[2] === cur ? ' aria-current="page"' : '') + '>' + i[1] + '</a>'; }).join('') + '</nav>';
  }
  function head(title, sub) { return '<header class="v3-ohead"><p class="v3-org">' + tr('Центр підтримки бізнесу (демо) · мікрогранти 2026', 'Business Support Centre (demo) · microgrants 2026') + '</p><h1>' + title + '</h1>' + (sub ? '<p class="mg-muted">' + sub + '</p>' : '') + '</header>'; }
  function since(state, a) { var h = a.history[a.history.length - 1]; var d = Math.floor((M.toMin(state.clock) - M.toMin(h.at)) / 1440); return d <= 0 ? tr('сьогодні', 'today') : tr(d + ' дн.', d + ' d'); }

  var QUEUES = [
    ['new', 'Нові заявки', 'New applications', 'Взяти в роботу', 'Start review'], ['responses', 'Відповіді на уточнення', 'Clarification answers', 'Переглянути', 'Review'],
    ['review', 'На первинному розгляді', 'In initial review', 'Ухвалити рішення', 'Decide'], ['plans', 'Бізнес-плани на перевірку', 'Business plans to review', 'Перевірити файли', 'Review files'],
    ['selection', 'Готові до відбору', 'Ready for selection', 'До дошки відбору', 'To selection board'], ['docs', 'Документи переможців', 'Winners’ documents', 'Перевірити документи', 'Review documents'],
    ['transfer', 'Позначити перерахування', 'Mark the transfer', 'Позначити', 'Mark'], ['reports', 'Звіти на перевірку', 'Reports to review', 'Перевірити звіт', 'Review report'],
    ['close', 'Закрити гранти', 'Close grants', 'Закрити', 'Close'], ['overdue', 'Прострочено', 'Overdue', 'Нагадати або продовжити', 'Remind or extend']
  ];
  function queues(state) {
    var q = M.queues(state), total = 0;
    var h = head(tr('Що потребує дії', 'What needs action'), tr('Демо-дата ', 'Demo date ') + U.date(state.clock) + ' · ' + tr('бюджет раунду: розподілено ', 'round budget: committed ') + U.money(M.committedMinor(state)) + tr(' з ', ' of ') + U.money(state.programme.poolMinor)) + nav('queues');
    h += '<div class="v3-queues">';
    QUEUES.forEach(function (qq) {
      var list = q[qq[0]]; if (!list.length) return; total += list.length;
      h += '<section class="v3-queue" data-queue="' + qq[0] + '"><h2>' + tr(qq[1], qq[2]) + ' <span>' + list.length + '</span></h2><ul>' + list.map(function (code) {
        var a = state.apps[code], od = M.overdue(state, a);
        var href = qq[0] === 'selection' ? '#/org/selection' : '#/org/app/' + code;
        return '<li data-code="' + code + '"><a class="v3-qrow" href="' + href + '"><b>' + code + '</b><span class="v3-qname">' + esc(a.intake.lastName + ' ' + a.intake.firstName) + '<small>' + esc(a.intake.ideaTitle) + '</small></span>' +
          '<span class="v3-qmeta">' + (od.length ? '<span class="v3-chip v3-chip--bad">' + od.map(function (x) { return { plan: tr('бізнес-план', 'plan'), docs: tr('документи', 'documents'), report: tr('звіт', 'report') }[x]; }).join(', ') + ' · ' + tr('строк ', 'due ') + U.date(a.deadlines[od[0]]) + '</span>' : U.chip(a.status)) + '<small>' + tr('без руху ', 'idle ') + since(state, a) + '</small></span>' +
          '<span class="v3-qact">' + tr(qq[3], qq[4]) + U.icon('arrow') + '</span></a></li>';
      }).join('') + '</ul></section>';
    });
    if (!total) h += '<p class="v3-empty">' + tr('Нічого не чекає дії. Нові заявки з’являться тут, щойно учасник їх подасть.', 'Nothing is waiting. New applications appear here as soon as someone submits.') + '</p>';
    return '<section class="v3-o">' + h + '</div></section>';
  }

  function all(state) {
    var rows = state.order.map(function (c) { return state.apps[c]; }).filter(function (a) { return ui.allFilter === 'all' || a.status === ui.allFilter; });
    var sts = []; state.order.forEach(function (c) { if (sts.indexOf(state.apps[c].status) < 0) sts.push(state.apps[c].status); });
    return '<section class="v3-o">' + head(tr('Усі заявки', 'All applications')) + nav('all') + '<div class="v3-filter"><label for="allf">' + tr('Статус', 'Status') + '</label><select id="allf" class="d-select" data-o="allfilter"><option value="all">' + tr('Усі', 'All') + '</option>' +
      sts.map(function (s) { return '<option value="' + s + '"' + (ui.allFilter === s ? ' selected' : '') + '>' + esc(U.status(s)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="v3-tablewrap"><table class="v3-table"><thead><tr><th>' + tr('Код', 'Code') + '</th><th>' + tr('Учасник', 'Participant') + '</th><th>' + tr('Ідея', 'Idea') + '</th><th>' + tr('Статус', 'Status') + '</th><th>' + tr('Затверджено', 'Approved') + '</th></tr></thead><tbody>' +
      rows.map(function (a) { return '<tr><td><a href="#/org/app/' + a.code + '">' + a.code + '</a></td><td>' + esc(a.intake.lastName + ' ' + a.intake.firstName) + '</td><td>' + esc(a.intake.ideaTitle) + '</td><td>' + U.chip(a.status) + '</td><td>' + (a.award && a.award.decision === 'award' ? U.money(a.award.approvedMinor) : '—') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (rows.length ? '' : '<p class="v3-empty">' + tr('Заявок ще немає.', 'No applications yet.') + '</p>') + '</section>';
  }

  /* ---------------- one application ---------------- */
  function fileReview(state, f, opts) {
    opts = opts || {};
    var cm = f.comments.map(function (c) { return '<p class="v3-pin">' + U.icon('msg') + '<span>' + U.dateTime(c.at) + (c.anchor != null ? ' · ' + tr('позиція ', 'line ') + (c.anchor + 1) : '') + ': ' + esc(c.text) + '</span></p>'; }).join('');
    var controls = '';
    if (opts.review && !f.superseded) {
      controls = '<form class="v3-freview" data-form="file" data-id="' + f.id + '"><div class="mg-seg v3-fstatus">' + [['accepted', 'Прийняти', 'Accept'], ['needs_correction', 'Потрібне виправлення', 'Needs correction'], ['reviewing', 'Перевіряю', 'Reviewing']].map(function (o) {
        return '<button type="submit" class="d-btn d-btn--small' + (f.status === o[0] ? ' is-on' : '') + '" name="st" value="' + o[0] + '">' + tr(o[1], o[2]) + '</button>';
      }).join('') + '</div><label class="sr-only" for="fc_' + f.id + '">' + tr('Коментар учаснику', 'Comment to participant') + '</label><input id="fc_' + f.id + '" class="d-input" name="comment" placeholder="' + tr('Що саме виправити (бачить учасник)', 'What to fix (participant sees it)') + '">' +
        (opts.items ? '<label class="sr-only" for="fa_' + f.id + '">' + tr('Позиція', 'Line') + '</label><select id="fa_' + f.id + '" class="d-select" name="anchor"><option value="">' + tr('Увесь файл', 'Whole file') + '</option>' + opts.items.map(function (it, i) { return '<option value="' + i + '">' + tr('Позиція ', 'Line ') + (i + 1) + ': ' + esc(it.name.slice(0, 40)) + '</option>'; }).join('') + '</select>' : '') + '</form>';
    }
    return '<li class="v3-file' + (f.superseded ? ' is-old' : '') + '" data-file="' + f.id + '" data-slot="' + esc(f.slot) + '"><div class="v3-file-main">' + U.icon('file') + '<div><b>' + esc(U.slot(f.slot)) + '</b><span>v' + f.v + ' · ' + U.dateTime(f.at) + '</span></div>' + U.fileChip(f) +
      '<button type="button" class="d-btn d-btn--small" data-o="' + (f.kind === 'generated' ? 'dl' : 'view') + '" data-id="' + f.id + '">' + U.icon(f.kind === 'generated' ? 'dl' : 'eye') + '</button></div>' + cm + controls + '</li>';
  }
  function planDiff(a) {
    var v = a.plan.versions; if (v.length < 2) return '';
    var p = v[v.length - 2], c = v[v.length - 1], ch = [];
    Object.keys(c.form).forEach(function (k) { if (JSON.stringify(c.form[k]) !== JSON.stringify(p.form[k])) ch.push(k); });
    c.items.forEach(function (it, i) { var o = p.items[i]; if (!o) ch.push(tr('нова позиція ', 'new line ') + (i + 1)); else Object.keys(it).forEach(function (k) { if (it[k] !== o[k]) ch.push(tr('позиція ', 'line ') + (i + 1) + ' · ' + k); }); });
    return '<p class="v3-diff"><b>v' + c.v + tr(' порівняно з v', ' vs v') + p.v + ':</b> ' + esc(ch.join(', ') || '—') + '</p>';
  }
  function budget(v) {
    var t = window.MGChecks.totals(v.items);
    return '<table class="v3-lines"><tbody>' + v.items.map(function (it, i) { return '<tr><td>' + (i + 1) + '. ' + esc(it.name) + (it.source === 'own' ? ' <small>' + tr('власні', 'own') + '</small>' : '') + '<small><a href="' + esc(it.link) + '" rel="noopener noreferrer" tabindex="-1">' + esc(it.link) + '</a></small></td><td>' + U.money(M.minor(window.MGChecks.itemTotal(it))) + '</td></tr>'; }).join('') +
      '<tr class="v3-total"><td>' + tr('Грант', 'Grant') + ' · ' + tr('обладнання ', 'equipment ') + Math.round(t.equipmentShare * 100) + ' %</td><td>' + U.money(M.minor(t.grant)) + '</td></tr></tbody></table>';
  }
  function decisionPanel(state, a) {
    var c = a.code, s = a.status, h = '';
    var box = function (title, body) { return '<article class="v3-decide" id="decide" data-status="' + s + '"><h2>' + title + '</h2>' + body + '</article>'; };
    if (s === 'submitted') return box(tr('Нова заявка', 'New application'), (a.intakeV > 1 ? '<p class="v3-diff"><b>' + tr('Відповідь на уточнення:', 'Clarification answer:') + '</b> ' + esc(a.clarification.answer.to) + '</p>' : '') + '<button type="button" class="d-btn d-btn--primary" data-o="start">' + tr('Взяти в роботу', 'Start review') + '</button>');
    if (s === 'under_review') {
      var CH = [['community', 'Проживає в громаді програми', 'Lives in the programme community'], ['household', 'Мікробізнес домогосподарства', 'Household micro-business'], ['priorGrant', 'Не отримував грант програми 2 роки', 'No programme grant in 2 years'], ['business', 'Ідея — підприємницька діяльність', 'The idea is a business activity']];
      return box(tr('Первинний розгляд', 'Initial review'), '<p class="v3-explain">' + tr('Допуск відкриває учаснику кабінет для бізнес-плану. Це не рішення про грант — його ухвалює комісія після перевірки пакета.', 'Admission opens the cabinet for the business plan. It is not a grant decision — the committee decides after the package is checked.') + '</p>' +
        '<form data-form="screen"><fieldset class="v3-checklist"><legend>' + tr('Перевірка допуску', 'Eligibility checklist') + '</legend>' + CH.map(function (x) { return '<label class="mg-check"><input type="checkbox" name="' + x[0] + '"><span>' + tr(x[1], x[2]) + '</span></label>'; }).join('') + '</fieldset>' +
        '<div class="mg-actions"><button type="submit" class="d-btn d-btn--primary" name="d" value="eligible">' + tr('Допустити до подання документів', 'Admit to documents stage') + '</button></div></form>' +
        '<details class="v3-more"><summary>' + tr('Уточнити поле', 'Ask for a clarification') + '</summary><form data-form="clarify"><select class="d-select" name="field" aria-label="' + tr('Поле', 'Field') + '">' + ['settlement', 'ideaShort', 'ideaTitle', 'members', 'phone'].map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('') + '</select><input class="d-input" name="question" aria-label="' + tr('Питання', 'Question') + '" placeholder="' + tr('Питання учаснику', 'Question to the participant') + '"><button class="d-btn d-btn--small" type="submit">' + tr('Надіслати питання', 'Send question') + '</button></form></details>' +
        '<details class="v3-more"><summary>' + tr('Відмовити', 'Reject') + '</summary><form data-form="reject"><select class="d-select" name="reason" aria-label="' + tr('Причина', 'Reason') + '">' + M.REJECT_REASONS.map(function (r) { return '<option value="' + r + '">' + { outside_community: tr('Поза громадою програми', 'Outside the programme community'), not_business: tr('Не підприємницька діяльність', 'Not a business activity'), prior_grant: tr('Грант програми протягом 2 років', 'Programme grant within 2 years'), other: tr('Інше', 'Other') }[r] + '</option>'; }).join('') + '</select><input class="d-input" name="note" aria-label="' + tr('Пояснення', 'Explanation') + '" placeholder="' + tr('Пояснення (бачить учасник)', 'Explanation (participant sees it)') + '"><button class="d-btn d-btn--small" type="submit">' + tr('Відмовити', 'Reject') + '</button></form></details>');
    }
    if (s === 'clarification_requested') return box(tr('Чекаємо відповідь', 'Waiting for the answer'), '<p class="v3-q">' + esc(a.clarification.question) + '</p>');
    if (s === 'eligible') {
      var exp = M.toMin(a.invite.expiresAt) < M.toMin(state.clock);
      return box(tr('Запрошення до кабінету', 'Cabinet invitation'), '<p>' + tr('Запрошення показане на сторінці заявки учасника (листів демо не надсилає). Дійсне до ', 'The invitation is shown on the participant’s application page (the demo sends no e-mail). Valid until ') + U.date(a.invite.expiresAt) + '.</p>' + (exp ? '<button type="button" class="d-btn d-btn--primary" data-o="reissue">' + tr('Надіслати нове запрошення', 'Issue a new invitation') + '</button>' : ''));
    }
    if (s === 'cabinet_active' || s === 'plan_changes_requested') return box(s === 'cabinet_active' ? tr('Чекаємо бізнес-план', 'Waiting for the business plan') : tr('Чекаємо виправлену версію', 'Waiting for the corrected version'), '<p>' + tr('Строк: ', 'Due: ') + U.date(a.deadlines.plan) + '</p>' +
      (a.plan.versions.length ? '<ul class="v3-files">' + M.planFiles(state, a).map(function (f) { return fileReview(state, f); }).join('') + '</ul>' : ''));
    if (s === 'plan_submitted') {
      var v = M.latestPlan(a), files = M.planFiles(state, a);
      var anyFix = files.some(function (f) { return f.status === 'needs_correction'; }), allOk = files.every(function (f) { return f.status === 'accepted'; });
      return box(tr('Перевірка бізнес-плану · v', 'Business plan review · v') + v.v, planDiff(a) + budget(v) + '<p class="mg-ok">' + U.icon('check') + tr('Автоматичні перевірки кошторису пройдено під час подання.', 'Automatic budget checks passed on submission.') + '</p><ul class="v3-files">' + files.map(function (f) { return fileReview(state, f, { review: true, items: f.slot === 'plan:xlsx' ? v.items : null }); }).join('') + '</ul>' +
        '<div class="mg-actions"><button type="button" class="d-btn" data-o="plan-return"' + (anyFix ? '' : ' disabled') + '>' + tr('Повернути на виправлення', 'Return for changes') + '</button><button type="button" class="d-btn d-btn--primary" data-o="plan-accept"' + (allOk ? '' : ' disabled') + '>' + tr('Прийняти пакет', 'Accept package') + '</button></div>');
    }
    if (s === 'package_accepted') return box(tr('Чекає рішення комісії', 'Awaiting the committee'), '<a class="d-btn d-btn--primary" href="#/org/selection">' + tr('До дошки відбору', 'To selection board') + '</a>');
    if (s === 'awarded') {
      var req = M.requiredDocSlots(a), cur = req.map(function (sl) { return M.currentFile(state, c, 'doc:' + sl); });
      var ok = cur.length && cur.every(function (f) { return f && f.status === 'accepted'; });
      return box(tr('Документи переможця', 'Winner’s documents'), (req.length ? '<ul class="v3-files">' + req.map(function (sl, i) { return cur[i] ? fileReview(state, cur[i], { review: true }) : '<li class="v3-file is-empty"><div class="v3-file-main">' + U.icon('file') + '<div><b>' + esc(U.slot('doc:' + sl)) + '</b><span>' + tr('ще не подано', 'not submitted yet') + '</span></div></div></li>'; }).join('') + '</ul>' : '<p>' + tr('Учасник ще не обрав тип паспорта.', 'The participant has not chosen the passport type yet.') + '</p>') +
        '<button type="button" class="d-btn d-btn--primary" data-o="agreement"' + (ok ? '' : ' disabled') + '>' + tr('Надіслати умови в кабінет', 'Send terms to the cabinet') + '</button>');
    }
    if (s === 'agreement_sent') return box(tr('Чекаємо підтвердження умов', 'Waiting for terms confirmation'), '');
    if (s === 'agreement_confirmed') {
      return box(tr('Позначити перерахування', 'Mark the transfer'), '<form data-form="transfer"><div class="d-field"><label class="d-label" for="tamt">' + tr('Сума, грн', 'Amount, UAH') + '</label><input id="tamt" class="d-input" name="amount" value="' + (a.award.approvedMinor / 100) + '"></div>' +
        '<label class="v3-consent"><input type="checkbox" name="flag"><span>' + tr('Це ручна демо-позначка. Реального платежу в демо немає.', 'This is a manual demo flag. There is no real payment in the demo.') + '</span></label><button class="d-btn d-btn--primary" type="submit">' + tr('Позначити', 'Mark') + '</button></form>');
    }
    if (s === 'implementation' || s === 'report_changes_requested') {
      var ps = M.activePurchases(state, c);
      return box(tr('Реалізація', 'Implementation'), '<p>' + tr('Звіт до ', 'Report due ') + U.date(a.deadlines.report) + ' · ' + tr('покупок у чернетці учасника: ', 'purchases in the participant’s draft: ') + ps.length + tr(' (не рахуються, доки звіт не подано)', ' (not counted until the report is submitted)') + '</p>');
    }
    if (s === 'report_submitted') {
      var r = M.latestReport(a), allDec = r.purchases.every(function (q) { var d = M.validDecision(a, q); return d && d.decision !== 'correct'; }), anyCor = r.purchases.some(function (q) { var d = M.validDecision(a, q); return d && d.decision === 'correct'; });
      var ev = r.evidenceFileId ? state.files[r.evidenceFileId] : null;
      return box(tr('Звіт · v', 'Report · v') + r.v, '<ul class="v3-rlist">' + r.purchases.map(function (q) {
        var d = M.validDecision(a, q), line = a.award.lines[q.lineIdx];
        return '<li data-purchase="' + q.id + '"><div class="v3-rhead"><b>' + U.money(q.amountMinor) + '</b><span>' + esc(line.name) + ' · ' + tr('затв. ', 'appr. ') + U.money(line.approvedMinor) + '</span><span>' + esc(q.supplier) + ' · ' + U.date(q.date) + (q.funding === 'own' ? ' · ' + tr('власні кошти', 'own funds') : '') + '</span>' +
          '<button type="button" class="d-btn d-btn--small" data-o="view" data-id="' + q.receiptFileId + '" data-p="' + q.id + '">' + U.icon('eye') + tr('Чек', 'Receipt') + '</button>' +
          (d ? '<span class="v3-chip v3-chip--' + (d.decision === 'accept' ? 'ok' : d.decision === 'correct' ? 'warn' : 'bad') + '">' + (d.decision === 'accept' ? tr('прийнято ', 'accepted ') + U.money(d.acceptedMinor) : d.decision === 'correct' ? tr('виправити', 'fix') : tr('виключено', 'excluded')) + '</span>' : '') + '</div>' +
          '<form class="v3-pdec" data-form="decide" data-id="' + q.id + '"><label class="sr-only" for="am_' + q.id + '">' + tr('Прийнята сума', 'Accepted amount') + '</label><input id="am_' + q.id + '" class="d-input" name="amount" value="' + ((d && d.decision === 'accept' ? d.acceptedMinor : q.amountMinor) / 100) + '">' +
          '<input class="d-input" name="reason" aria-label="' + tr('Причина', 'Reason') + '" placeholder="' + tr('Причина / коментар', 'Reason / comment') + '" value="' + esc(d ? d.reason : '') + '">' +
          '<button type="submit" class="d-btn d-btn--small" name="d" value="accept">' + tr('Прийняти', 'Accept') + '</button><button type="submit" class="d-btn d-btn--small" name="d" value="correct">' + tr('Виправити', 'Fix') + '</button><button type="submit" class="d-btn d-btn--small" name="d" value="exclude">' + tr('Виключити', 'Exclude') + '</button></form></li>';
      }).join('') + '</ul>' +
        '<dl class="v3-summary"><div><dt>' + tr('Обладнання працює', 'Equipment in use') + '</dt><dd>' + (r.indicators.inUse ? tr('так', 'yes') : tr('ні', 'no')) + '</dd></div><div><dt>' + tr('На тиждень', 'Per week') + '</dt><dd>' + r.indicators.weekly + '</dd></div><div><dt>' + tr('Нові місця', 'New jobs') + '</dt><dd>' + r.indicators.jobs + '</dd></div><div><dt>' + tr('Опис', 'Narrative') + '</dt><dd>' + esc(r.narrative) + '</dd></div></dl>' +
        (ev ? '<div class="mg-actions"><button type="button" class="d-btn d-btn--small" data-o="view" data-id="' + ev.id + '">' + U.icon('eye') + tr('Фото обладнання', 'Equipment photo') + '</button><label class="mg-check"><input type="checkbox" id="evok"><span>' + tr('Фото підтверджує, що обладнання на місці', 'The photo shows the equipment in place') + '</span></label></div>' : '') +
        '<div class="mg-actions"><button type="button" class="d-btn" data-o="report-return"' + (anyCor ? '' : ' disabled') + '>' + tr('Повернути на виправлення', 'Return for changes') + '</button><button type="button" class="d-btn d-btn--primary" data-o="report-accept"' + (allDec ? '' : ' disabled') + '>' + tr('Прийняти звіт', 'Accept report') + '</button></div>');
    }
    if (s === 'report_accepted') return box(tr('Звіт прийнято', 'Report accepted'), '<button type="button" class="d-btn d-btn--primary" data-o="close">' + tr('Закрити грант', 'Close grant') + '</button>');
    return box(U.status(s), '');
  }
  function appView(state, code) {
    var a = state.apps[code];
    if (!a) return '<section class="v3-o">' + nav('') + '<p class="v3-empty">' + tr('Заявку не знайдено.', 'Application not found.') + '</p></section>';
    var od = M.overdue(state, a), i = a.intake;
    var tl = a.history.map(function (h) { return { ev: h.ev, at: h.at, t: U.status(h.status) + (h.version ? ' · v' + h.version : ''), by: h.by }; })
      .concat(a.notes.map(function (n) { return { ev: n.ev, at: n.at, t: tr('Нотатка: ', 'Note: ') + n.text, by: 'organiser', internal: true }; }))
      .concat(a.consents.map(function (c) { return { ev: c.ev, at: c.at, t: tr('Згода учасника: ', 'Participant consent: ') + c.kind, by: 'applicant' }; }))
      .concat(a.messages.filter(function (m) { return m.kind === 'reminder' || m.kind === 'extended'; }).map(function (m) { return { ev: m.ev, at: m.at, t: m.kind === 'reminder' ? tr('Нагадування в кабінеті: ', 'Cabinet reminder: ') + m.text : tr('Строк продовжено', 'Deadline extended'), by: 'organiser' }; }))
      .sort(function (x, y) { return y.ev - x.ev; });
    var old = Object.keys(state.files).map(function (k) { return state.files[k]; }).filter(function (f) { return f.appId === code && f.superseded; });
    var h = '<section class="v3-o">' + nav('') + '<header class="v3-ohead v3-apphead"><a class="v3-back" href="#/org">' + U.icon('back') + tr('Черги', 'Queues') + '</a><h1>' + code + ' · ' + esc(i.lastName + ' ' + i.firstName) + '</h1><p class="mg-muted">' + esc(i.ideaTitle) + ' · ' + esc(U.business(i.businessType)) + ' · ' + esc(i.community) + ', ' + esc(i.settlement) + '</p>' + U.chip(a.status) +
      (od.length ? ' <span class="v3-chip v3-chip--bad">' + tr('прострочено', 'overdue') + '</span>' : '') + '</header><div class="v3-appgrid"><div class="v3-appmain">' + decisionPanel(state, a);
    if (a.status !== 'under_review') h += '<details class="v3-more"><summary>' + tr('Коротка заявка', 'Short application') + '</summary><dl class="v3-summary">' + [[tr('Телефон', 'Phone'), i.phone], [tr('Домогосподарство', 'Household'), i.members], [tr('Опис', 'Summary'), i.ideaShort], [tr('Запит', 'Requested'), U.money(M.minor(i.requestedApprox))]].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></details>';
    else h += '<dl class="v3-summary">' + [[tr('Телефон', 'Phone'), i.phone], [tr('Домогосподарство', 'Household'), i.members + ' ' + tr('осіб', 'people')], [tr('Бізнес працює', 'Running'), i.existing === 'yes' ? tr('так', 'yes') : tr('ні', 'no')], [tr('Опис', 'Summary'), i.ideaShort], [tr('Запит', 'Requested'), U.money(M.minor(i.requestedApprox))]].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
    if (old.length) h += '<details class="v3-more"><summary>' + tr('Попередні версії файлів: ', 'Earlier file versions: ') + old.length + '</summary><ul class="v3-files">' + old.map(function (f) { return fileReview(state, f); }).join('') + '</ul></details>';
    h += '</div><aside class="v3-appside">';
    if (M.TERMINAL.indexOf(a.status) < 0) {
      var which = a.deadlines.report ? 'report' : a.deadlines.docs && a.status === 'awarded' ? 'docs' : a.deadlines.plan ? 'plan' : null;
      h += '<article class="v3-side"><h3>' + tr('Нагадати в кабінеті', 'Remind in the cabinet') + '</h3><form data-form="remind"><input class="d-input" name="text" aria-label="' + tr('Текст нагадування', 'Reminder text') + '" placeholder="' + tr('Текст (учасник побачить у кабінеті)', 'Text (shown in the cabinet)') + '"><button class="d-btn d-btn--small" type="submit">' + tr('Надіслати', 'Send') + '</button></form>' +
        (which ? '<h3>' + tr('Продовжити строк', 'Extend deadline') + '</h3><form data-form="extend" data-which="' + which + '"><input class="d-input" type="date" name="until" aria-label="' + tr('Нова дата', 'New date') + '" value="' + M.addDays(state.clock, 7).slice(0, 10) + '"><input class="d-input" name="reason" aria-label="' + tr('Причина', 'Reason') + '" placeholder="' + tr('Причина', 'Reason') + '"><button class="d-btn d-btn--small" type="submit">' + tr('Продовжити', 'Extend') + '</button></form>' : '') + '</article>';
    }
    h += '<article class="v3-side"><h3>' + tr('Внутрішня нотатка', 'Internal note') + '</h3><p class="mg-muted">' + tr('Учасник її не бачить.', 'Not visible to the participant.') + '</p><form data-form="note"><input class="d-input" name="text" aria-label="' + tr('Нотатка', 'Note') + '"><button class="d-btn d-btn--small" type="submit">' + tr('Додати', 'Add') + '</button></form></article>' +
      '<article class="v3-side"><h3>' + tr('Історія', 'History') + '</h3><ol class="v3-timeline">' + tl.map(function (x) { return '<li' + (x.internal ? ' class="is-internal"' : '') + '><time>' + U.dateTime(x.at) + ' · #' + x.ev + '</time><span>' + esc(x.t) + '</span></li>'; }).join('') + '</ol></article></aside></div></section>';
    return h;
  }

  /* ---------------- selection board ---------------- */
  function selDraft(state, code) {
    if (!ui.sel[code]) ui.sel[code] = { decision: '', score: '', lines: M.grantLines(M.latestPlan(state.apps[code])).map(function (l) { return { idx: l.idx, approvedMinor: l.requestedMinor }; }) };
    return ui.sel[code];
  }
  function selection(state) {
    var pending = state.order.filter(function (c) { return state.apps[c].status === 'package_accepted'; });
    var committed = M.committedMinor(state), round = 0;
    pending.forEach(function (c) { var d = selDraft(state, c); if (d.decision === 'award') round += d.lines.reduce(function (t, l) { return t + l.approvedMinor; }, 0); });
    var left = state.programme.poolMinor - committed - round;
    var h = '<section class="v3-o">' + head(tr('Відбір переможців', 'Selecting winners'), tr('Фінальне рішення про фінансування — лише для прийнятих пакетів. Допуск до другого етапу грантом не є.', 'The final funding decision covers accepted packages only. Admission to the second stage is not a grant.')) + nav('selection') +
      '<div class="v3-pool" data-left="' + left + '"><div><span>' + tr('Бюджет раунду', 'Round budget') + '</span><b>' + U.money(state.programme.poolMinor) + '</b></div><div><span>' + tr('Уже надано', 'Already awarded') + '</span><b>' + U.money(committed) + '</b></div><div><span>' + tr('Це засідання', 'This meeting') + '</span><b data-pool="round">' + U.money(round) + '</b></div><div class="' + (left < 0 ? 'is-bad' : '') + '" data-pool-left><span>' + tr('Залишок', 'Remaining') + '</span><b data-pool="left">' + U.money(left) + '</b></div></div>';
    if (!pending.length) h += '<p class="v3-empty">' + tr('Немає прийнятих пакетів, що чекають рішення.', 'No accepted packages are waiting for a decision.') + '</p>';
    else {
      h += '<div class="v3-tablewrap"><table class="v3-table v3-seltable"><thead><tr><th>' + tr('Заявка', 'Application') + '</th><th>' + tr('Запит', 'Requested') + '</th><th>' + tr('Оцінка комісії', 'Committee score') + '</th><th>' + tr('Рішення', 'Decision') + '</th><th>' + tr('Затверджено', 'Approved') + '</th></tr></thead><tbody>' +
        pending.map(function (c) {
          var a = state.apps[c], d = selDraft(state, c), lines = M.grantLines(M.latestPlan(a)), sum = d.lines.reduce(function (t, l) { return t + l.approvedMinor; }, 0);
          return '<tr data-code="' + c + '"><td><a href="#/org/app/' + c + '"><b>' + c + '</b></a> ' + esc(a.intake.lastName + ' ' + a.intake.firstName) + '<small>' + esc(a.intake.ideaTitle) + '</small></td><td>' + U.money(M.requestedGrantMinor(M.latestPlan(a))) + '</td>' +
            '<td><input class="d-input v3-score" data-sel="score" data-code="' + c + '" inputmode="numeric" value="' + esc(d.score) + '" aria-label="' + tr('Оцінка', 'Score') + ' ' + c + '"></td>' +
            '<td><select class="d-select" data-sel="decision" data-code="' + c + '" aria-label="' + tr('Рішення', 'Decision') + ' ' + c + '"><option value="">' + tr('Оберіть', 'Choose') + '</option>' + [['award', 'Надати грант', 'Award'], ['reserve', 'Резерв', 'Reserve'], ['not_selected', 'Не обрано', 'Not selected']].map(function (o) { return '<option value="' + o[0] + '"' + (d.decision === o[0] ? ' selected' : '') + '>' + tr(o[1], o[2]) + '</option>'; }).join('') + '</select></td>' +
            '<td>' + (d.decision === 'award' ? '<b data-sum="' + c + '">' + U.money(sum) + '</b><details class="v3-more"><summary>' + tr('По рядках', 'By line') + '</summary>' + lines.map(function (l, k) { return '<label class="v3-lineedit"><span>' + esc(l.name.slice(0, 34)) + ' · ' + tr('запит ', 'req. ') + U.money(l.requestedMinor) + '</span><input class="d-input" data-sel="line" data-code="' + c + '" data-i="' + k + '" value="' + d.lines[k].approvedMinor / 100 + '"></label>'; }).join('') + '</details>' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="mg-actions"><button type="button" class="d-btn d-btn--primary" data-o="publish">' + tr('Опублікувати рішення', 'Publish decisions') + '</button></div>';
    }
    var done = state.order.filter(function (c) { var a = state.apps[c]; return a.award; });
    if (done.length) h += '<details class="v3-more"><summary>' + tr('Попередні рішення: ', 'Earlier decisions: ') + done.length + '</summary><ul class="v3-plain">' + done.map(function (c) { var a = state.apps[c]; return '<li><b>' + c + '</b> · ' + U.chip(a.award.decision === 'award' ? 'awarded' : a.award.decision) + ' ' + (a.award.decision === 'award' ? U.money(a.award.approvedMinor) : '') + ' · ' + U.date(a.award.at) + ' · #' + a.award.ev + (a.status === 'withdrawn' ? ' · ' + U.status('withdrawn') : '') + '</li>'; }).join('') + '</ul></details>';
    return h + '</section>';
  }
  function publish(state) {
    var pending = state.order.filter(function (c) { return state.apps[c].status === 'package_accepted'; });
    var ds = pending.map(function (c) { var d = selDraft(state, c); return { code: c, decision: d.decision, score: d.score === '' ? null : +d.score, lines: d.decision === 'award' ? d.lines : [] }; });
    var missing = ds.filter(function (d) { return !d.decision; });
    if (missing.length) { U.toast(U.errText('decisions_incomplete'), true); return; }
    var body = '<ul class="v3-plain">' + ds.map(function (d) { var a = state.apps[d.code]; return '<li><b>' + d.code + '</b> ' + esc(a.intake.lastName) + ' — ' + U.status(d.decision === 'award' ? 'awarded' : d.decision) + (d.decision === 'award' ? ' · ' + U.money(d.lines.reduce(function (t, l) { return t + l.approvedMinor; }, 0)) : '') + '</li>'; }).join('') + '</ul><p>' + tr('Учасники одразу побачать рішення у своїх кабінетах. Змінити опубліковане рішення не можна.', 'Participants see the decisions in their cabinets at once. A published decision cannot be edited.') + '</p>';
    U.modal(tr('Опублікувати рішення комісії?', 'Publish the committee decisions?'), body, [{ label: tr('Скасувати', 'Cancel'), value: null }, { label: tr('Опублікувати', 'Publish'), value: 'yes', primary: true }]).then(function (v) {
      if (!v) return;
      U.act('selection.publish', null, { decisions: ds }, tr('Рішення опубліковано', 'Decisions published')).then(function (r) { if (r.ok) ui.sel = {}; });
    });
  }

  /* ---------------- sponsor report ---------------- */
  function sponsor(state) {
    var Lg = L.ledger(state), last = state.sponsorRuns[state.sponsorRuns.length - 1], T = X.T[U.LANG];
    var cell = function (code, bucket, v, lineIdx) { return v ? '<button type="button" class="v3-num" data-o="trace" data-code="' + (code || '') + '" data-bucket="' + bucket + '">' + U.money(v) + '</button>' : '<span class="v3-zero">' + U.money(0) + '</span>'; };
    var h = '<section class="v3-o">' + head(tr('Звіт для донора', 'Sponsor report'), tr('Синтетичні дані демо · станом на ', 'Synthetic demo data · as of ') + U.date(Lg.asOf) + '. ' + T.basis) + nav('sponsor');
    h += '<div class="v3-gen">' + (last ? (last.digest === Lg.digest ? '<span class="v3-chip v3-chip--ok">' + tr('Останній експорт відповідає поточним даним', 'The last export matches current data') + ' · ' + U.date(last.at) + '</span>' : '<span class="v3-chip v3-chip--warn" data-stale>' + tr('Дані змінилися після експорту ', 'Data changed since the export of ') + U.date(last.at) + tr(' — сформуйте знову', ' — export again') + '</span>') : '<span class="v3-chip v3-chip--muted">' + tr('Ще не експортувався', 'Not exported yet') + '</span>') +
      '<div class="mg-actions"><button type="button" class="d-btn d-btn--primary d-btn--small" data-o="sp-xlsx">' + U.icon('dl') + 'XLSX</button><button type="button" class="d-btn d-btn--small" data-o="sp-docx">' + U.icon('dl') + 'DOCX</button></div></div>';
    h += '<div class="v3-spgrid"><article class="v3-spcol"><h2>' + T.spend + '</h2><dl class="v3-figs">' + ['grantAccepted', 'overCap', 'ownAccepted', 'disallowed', 'excluded', 'pending'].map(function (b) { return '<div data-bucket="' + b + '"><dt>' + T[b] + '</dt><dd>' + cell('', b, Lg.totals[b]) + '</dd></div>'; }).join('') +
      '<div class="is-sum"><dt>' + T.reported + '</dt><dd>' + U.money(Lg.totals.reportedMinor) + '</dd></div><div><dt>' + T.unspent + '</dt><dd>' + U.money(Lg.counts.unspentMinor) + '</dd></div></dl></article>' +
      '<article class="v3-spcol"><h2>' + T.sel + '</h2><dl class="v3-figs"><div><dt>' + T.awarded + '</dt><dd>' + Lg.selection.awarded + '</dd></div><div><dt>' + T.approved + '</dt><dd>' + U.money(Lg.selection.approvedMinor) + '</dd></div><div><dt>' + T.transferred + '</dt><dd>' + U.money(Lg.selection.transferredMinor) + '</dd></div><div class="is-ref"><dt>' + T.requested + '</dt><dd>' + U.money(Lg.selection.requestedMinor) + '</dd></div></dl>' +
      '<h2>' + T.process + '</h2><dl class="v3-figs">' + [['applications', Lg.counts.applications], ['eligible', Lg.counts.eligible], ['plans', Lg.counts.plansAccepted], ['reports', Lg.counts.reportsAccepted], ['missing', Lg.counts.reportsMissing], ['receipts', Lg.counts.receiptsAccepted]].map(function (r) { return '<div><dt>' + T[r[0]] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl></article></div>';
    h += '<h2 class="v3-h2">' + tr('За учасниками (лише коди)', 'By participant (codes only)') + '</h2><div class="v3-tablewrap"><table class="v3-table v3-sptable"><thead><tr><th>' + T.code + '</th><th>' + T.status + '</th><th>' + T.approved + '</th><th>' + tr('Прийнято', 'Accepted') + '</th><th>' + tr('Понад рядок', 'Over line') + '</th><th>' + tr('Власні', 'Own') + '</th><th>' + tr('Не прийнято / виключено', 'Not accepted / excluded') + '</th><th>' + tr('Не перевірено', 'Pending') + '</th><th>' + tr('Залишок', 'Unspent') + '</th></tr></thead><tbody>' +
      Lg.apps.map(function (r) { return '<tr data-code="' + r.code + '"><td><a href="#/org/app/' + r.code + '">' + r.code + '</a></td><td>' + U.chip(r.status) + '</td><td>' + U.money(r.approvedMinor) + '</td><td>' + cell(r.code, 'grantAccepted', r.grantAccepted) + '</td><td>' + cell(r.code, 'overCap', r.overCap) + '</td><td>' + cell(r.code, 'ownAccepted', r.ownAccepted) + '</td><td>' + cell(r.code, 'disallowed', r.disallowed) + ' ' + cell(r.code, 'excluded', r.excluded) + '</td><td>' + cell(r.code, 'pending', r.pending) + '</td><td>' + (r.unspentMinor == null ? '—' : U.money(r.unspentMinor)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    if (Lg.outcomes.length) h += '<h2 class="v3-h2">' + T.outcomes + '</h2><ul class="v3-plain v3-outcomes">' + Lg.apps.filter(function (r) { return r.reportAccepted; }).map(function (r) {
      var os = Lg.outcomes.filter(function (o) { return o.code === r.code; });
      return '<li><b>' + r.code + '</b> ' + os.map(function (o) { return T[o.key] + ': ' + (typeof o.value === 'boolean' ? (o.value ? tr('так', 'yes') : tr('ні', 'no')) : o.value) + ' <span class="v3-chip v3-chip--' + (o.evidence === 'accepted' ? 'ok' : 'muted') + '">' + (o.evidence === 'accepted' ? T.accepted : T.self) + '</span>'; }).join(' · ') + '</li>';
    }).join('') + '</ul>';
    if (ui.trace) {
      var es = L.trace(Lg, ui.trace);
      h += '<aside class="v3-trace" id="trace" aria-label="' + tr('Походження суми', 'Where the figure comes from') + '"><header><h2>' + T[ui.trace.bucket] + (ui.trace.code ? ' · ' + ui.trace.code : '') + ' — ' + U.money(es.reduce(function (t, e) { return t + e.amountMinor; }, 0)) + '</h2><button type="button" class="d-btn d-btn--small" data-o="trace-close">' + tr('Закрити', 'Close') + '</button></header>' +
        '<table class="v3-table"><thead><tr><th>' + T.code + '</th><th>' + T.line + '</th><th>' + T.amount + '</th><th>' + tr('Подання звіту', 'Report') + '</th><th>' + tr('Рішення по чеку', 'Receipt decision') + '</th><th>' + tr('Рішення комісії', 'Award') + '</th></tr></thead><tbody>' +
        es.map(function (e) { var a = state.apps[e.code]; return '<tr><td><a href="#/org/app/' + e.code + '">' + e.code + '</a></td><td>' + (e.lineIdx + 1) + '. ' + esc(a.award.lines[e.lineIdx].name.slice(0, 32)) + '</td><td>' + U.money(e.amountMinor) + '</td><td>v' + e.reportV + ' · #' + e.reportEv + '</td><td>' + (e.decisionEv ? '#' + e.decisionEv + (e.reason ? ' · ' + esc(e.reason) : '') : '—') + '</td><td>#' + e.awardEv + '</td></tr>'; }).join('') + '</tbody></table></aside>';
    }
    return h + '</section>';
  }

  /* ---------------- events ---------------- */
  function codeFromHash() { var m = /^#\/org\/app\/(MG-\d+)/.exec(window.location.hash); return m ? m[1] : null; }
  function onClick(e, rerender) {
    var b = e.target.closest('[data-o]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return false;
    var o = b.getAttribute('data-o'), state = U.state(), code = codeFromHash();
    if (o === 'start') U.act('review.start', code, {});
    else if (o === 'reissue') U.act('invite.reissue', code, {}, tr('Нове запрошення в кабінеті учасника', 'New invitation shown to the participant'));
    else if (o === 'plan-return') U.act('plan.return', code, {}, tr('Повернуто учаснику', 'Returned to the participant'));
    else if (o === 'plan-accept') U.act('plan.accept', code, {}, tr('Пакет прийнято', 'Package accepted'));
    else if (o === 'agreement') U.act('agreement.send', code, {}, tr('Умови в кабінеті учасника', 'Terms are in the participant’s cabinet'));
    else if (o === 'report-return') U.act('report.return', code, {}, tr('Звіт повернуто', 'Report returned'));
    else if (o === 'report-accept') { var ev = document.getElementById('evok'); U.act('report.accept', code, { evidenceAccepted: !!(ev && ev.checked) }, tr('Звіт прийнято', 'Report accepted')); }
    else if (o === 'close') U.act('grant.close', code, {}, tr('Грант закрито', 'Grant closed'));
    else if (o === 'dl') U.download(window.MGState.fileJob(state, b.getAttribute('data-id')), b);
    else if (o === 'view') { var f = state.files[b.getAttribute('data-id')], p = /^receipt:/.test(f.slot) ? state.purchases[f.slot.slice(8)] : null; U.samplePreview(f, p ? { supplier: p.supplier, amount: U.money(p.amountMinor), date: U.date(p.date) } : {}); }
    else if (o === 'publish') publish(state);
    else if (o === 'trace') { ui.trace = { code: b.getAttribute('data-code') || null, bucket: b.getAttribute('data-bucket') }; rerender(); var t = document.getElementById('trace'); if (t) { t.scrollIntoView({ block: 'start' }); t.querySelector('button').focus(); } }
    else if (o === 'trace-close') { ui.trace = null; rerender(); }
    else if (o === 'sp-xlsx' || o === 'sp-docx') {
      U.download(o === 'sp-xlsx' ? X.sponsorXlsx(state, U.LANG) : X.sponsorDocx(state, U.LANG), b).then(function (f) { if (f) U.act('sponsor.generate', null, { digest: f.digest, format: o.slice(3) }); });
    }
    else return false;
    return true;
  }
  function onSubmit(e) {
    var f = e.target.closest('[data-form]'); if (!f) return false;
    var kind = f.getAttribute('data-form'), code = codeFromHash(), sub = e.submitter;
    var known = ['screen', 'clarify', 'reject', 'file', 'transfer', 'decide', 'remind', 'extend', 'note'];
    if (known.indexOf(kind) < 0) return false;
    e.preventDefault();
    if (kind === 'screen') { var ch = {}; M.SCREENING.forEach(function (k) { ch[k] = f[k].checked; }); U.act('review.decide', code, { decision: 'eligible', checks: ch }, tr('Допущено. Учасник бачить запрошення.', 'Admitted. The participant sees the invitation.')); }
    else if (kind === 'clarify') U.act('review.clarify', code, { field: f.field.value, question: f.question.value }, tr('Питання надіслано в кабінет', 'Question sent to the cabinet'));
    else if (kind === 'reject') U.act('review.decide', code, { decision: 'not_eligible', reason: f.reason.value, note: f.note.value }, tr('Рішення збережено', 'Decision saved'));
    else if (kind === 'file') U.act('file.review', code, { fileId: f.getAttribute('data-id'), status: sub ? sub.value : 'reviewing', comment: f.comment.value, anchor: f.anchor && f.anchor.value !== '' ? +f.anchor.value : null });
    else if (kind === 'transfer') U.act('transfer.mark', code, { amountMinor: M.minor(f.amount.value), demoFlag: f.flag.checked }, tr('Позначено. Учасник бачить облік покупок.', 'Marked. The participant now sees purchase tracking.'));
    else if (kind === 'decide') U.act('purchase.decide', code, { purchaseId: f.getAttribute('data-id'), decision: sub ? sub.value : 'accept', acceptedMinor: M.minor(f.amount.value), reason: f.reason.value });
    else if (kind === 'remind') U.act('app.remind', code, { text: f.text.value }, tr('Нагадування з’явиться в кабінеті', 'The reminder appears in the cabinet'));
    else if (kind === 'extend') U.act('deadline.extend', code, { which: f.getAttribute('data-which'), until: f.until.value + 'T23:59', reason: f.reason.value }, tr('Строк продовжено', 'Deadline extended'));
    else if (kind === 'note') U.act('app.note', code, { text: f.text.value });
    return true;
  }
  /* typing a score or an amount must not rebuild the table (a click on «Publish» right after would be lost) */
  function refreshPool(state) {
    var round = 0;
    state.order.filter(function (c) { return state.apps[c].status === 'package_accepted'; }).forEach(function (c) {
      var d = selDraft(state, c), sum = d.lines.reduce(function (t, l) { return t + l.approvedMinor; }, 0);
      if (d.decision === 'award') round += sum;
      var b = document.querySelector('[data-sum="' + c + '"]'); if (b) b.textContent = U.money(sum);
    });
    var left = state.programme.poolMinor - M.committedMinor(state) - round;
    var r = document.querySelector('[data-pool="round"]'), l = document.querySelector('[data-pool="left"]'), box = document.querySelector('[data-pool-left]');
    if (r) r.textContent = U.money(round);
    if (l) { l.textContent = U.money(left); box.classList.toggle('is-bad', left < 0); }
  }
  function onInput(e) {
    var t = e.target; if (!t.hasAttribute('data-sel')) return false;
    var state = U.state(), d = selDraft(state, t.getAttribute('data-code')), k = t.getAttribute('data-sel');
    if (k === 'score') d.score = t.value;
    else if (k === 'line') d.lines[+t.getAttribute('data-i')].approvedMinor = M.minor(t.value);
    else return false;
    refreshPool(state); return true;
  }
  function onChange(e, rerender) {
    var t = e.target, state = U.state();
    if (t.getAttribute('data-o') === 'allfilter') { ui.allFilter = t.value; rerender(); return true; }
    if (!t.hasAttribute('data-sel')) return false;
    if (t.getAttribute('data-sel') !== 'decision') return onInput(e);
    selDraft(state, t.getAttribute('data-code')).decision = t.value;
    rerender(); return true;
  }
  function resetUi() { ui.sel = {}; ui.trace = null; ui.allFilter = 'all'; }

  window.MGOrganiser = { queues: queues, all: all, app: appView, selection: selection, sponsor: sponsor, onClick: onClick, onSubmit: onSubmit, onChange: onChange, onInput: onInput, resetUi: resetUi };
})();
