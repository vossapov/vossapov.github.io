/* Shared UI helpers for the microgrants v3 demo: language, formatting, labels, actions, modal. */
(function () {
  'use strict';
  var D = window.NGODemo, M = window.MGModel, ST = window.MGStore;
  var q = new URLSearchParams(window.location.search);
  var LANG = q.get('lang') === 'en' ? 'en' : q.get('lang') === 'ua' ? 'ua' : (function () { try { return window.localStorage.getItem('vi-next-lang') === 'en' ? 'en' : 'ua'; } catch (e) { return 'ua'; } })();
  document.documentElement.lang = LANG === 'en' ? 'en' : 'uk';
  function tr(ua, en) { return LANG === 'en' ? en : ua; }
  var esc = D.esc;

  function money(minor) {
    var s = window.MGExports.uah(minor);
    return LANG === 'en' ? 'UAH ' + s : s + ' грн';
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function date(iso) {
    if (!iso) return '—';
    var y = iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10);
    return LANG === 'en' ? d + ' ' + MON[m - 1] + ' ' + y : String(d).padStart(2, '0') + '.' + String(m).padStart(2, '0') + '.' + y;
  }
  function dateTime(iso) { return date(iso) + (iso && iso.length > 10 ? ' ' + iso.slice(11, 16) : ''); }

  var STATUS = {
    submitted: ['Заявку отримано', 'Application received'], under_review: ['На первинному розгляді', 'Initial review'],
    clarification_requested: ['Потрібне уточнення', 'Clarification needed'], eligible: ['Допущено до подання документів', 'Admitted to documents stage'],
    not_eligible: ['Не допущено', 'Not admitted'], cabinet_active: ['Кабінет активовано', 'Cabinet active'], plan_submitted: ['Бізнес-план на перевірці', 'Business plan in review'],
    plan_changes_requested: ['Потрібні виправлення', 'Changes requested'], package_accepted: ['Пакет прийнято · чекає комісії', 'Package accepted · awaiting committee'],
    awarded: ['Грант надано', 'Grant awarded'], reserve: ['У резерві', 'Reserve list'], not_selected: ['Не обрано цього разу', 'Not selected this time'],
    agreement_sent: ['Умови надіслано', 'Terms sent'], agreement_confirmed: ['Умови підтверджено', 'Terms confirmed'], implementation: ['Реалізація', 'Implementation'],
    report_submitted: ['Звіт на перевірці', 'Report in review'], report_changes_requested: ['Звіт повернуто на виправлення', 'Report returned for changes'],
    report_accepted: ['Звіт прийнято', 'Report accepted'], closed: ['Грант закрито', 'Grant closed'], withdrawn: ['Відкликано', 'Withdrawn']
  };
  function status(s) { var x = STATUS[s]; return x ? tr(x[0], x[1]) : s; }
  function tone(s) {
    if (['not_eligible', 'not_selected', 'withdrawn'].indexOf(s) > -1) return 'bad';
    if (['clarification_requested', 'plan_changes_requested', 'report_changes_requested'].indexOf(s) > -1) return 'warn';
    if (['eligible', 'package_accepted', 'awarded', 'agreement_confirmed', 'report_accepted', 'closed'].indexOf(s) > -1) return 'ok';
    return 'info';
  }
  function chip(s) { return '<span class="v3-chip v3-chip--' + tone(s) + '" data-status="' + esc(s) + '">' + esc(status(s)) + '</span>'; }
  var FILE_ST = { received: ['Отримано', 'Received'], reviewing: ['Перевіряється', 'In review'], accepted: ['Прийнято', 'Accepted'], needs_correction: ['Потрібне виправлення', 'Needs correction'] };
  function fileChip(f) {
    if (f.superseded) return '<span class="v3-chip v3-chip--muted">' + tr('Замінено новою версією', 'Superseded') + '</span>';
    var x = FILE_ST[f.status];
    return '<span class="v3-chip v3-chip--' + (f.status === 'accepted' ? 'ok' : f.status === 'needs_correction' ? 'warn' : 'info') + '" data-file-status="' + f.status + '">' + tr(x[0], x[1]) + '</span>';
  }
  var BUSINESS = { food: ['Харчове виробництво', 'Food production'], crafts: ['Ремесла й виробництво', 'Crafts & making'], services: ['Послуги', 'Services'], agri: ['Сільське господарство', 'Agriculture'], repair: ['Ремонт', 'Repair'], other: ['Інше', 'Other'] };
  function business(k) { var x = BUSINESS[k]; return x ? tr(x[0], x[1]) : k; }
  var SLOT = {
    'plan:pptx': ['Презентація бізнес-ідеї (.pptx)', 'Business idea presentation (.pptx)'], 'plan:xlsx': ['Кошторис, Додаток 4 (.xlsx)', 'Budget, Annex 4 (.xlsx)'], 'plan:video': ['Відеовізитівка (зразок)', 'Video introduction (sample)'],
    'doc:idFront': ['ID-картка: лицьова сторона', 'ID card: front'], 'doc:idBack': ['ID-картка: зворотна сторона', 'ID card: back'], 'doc:idReg': ['Витяг про місце проживання', 'Residence extract'],
    'doc:bookPhoto': ['Паспорт-книжечка: розвороти з фото', 'Passport booklet: photo pages'], 'doc:bookReg': ['Сторінка з реєстрацією', 'Registration page'],
    'doc:ipn': ['Довідка РНОКПП (ІПН)', 'Taxpayer number certificate'], 'doc:iban': ['Довідка з банку про IBAN', 'Bank IBAN certificate'], 'agreement:terms': ['Умови гранту (зразок, .docx)', 'Grant terms (sample, .docx)'],
    'evidence:photo': ['Фото обладнання на місці (зразок)', 'Photo of equipment in place (sample)']
  };
  function slot(s) { if (/^receipt:/.test(s)) return tr('Чек', 'Receipt'); var x = SLOT[s]; return x ? tr(x[0], x[1]) : s; }

  var ERR = {
    wrong_status: ['Цю дію зараз виконати не можна: статус заявки вже інший.', 'This action is not available in the current status.'],
    forbidden_role: ['Ця дія доступна іншій ролі.', 'This action belongs to the other role.'], forbidden_app: ['Це не ваша заявка.', 'This is not your application.'],
    consent_required: ['Потрібна ваша згода.', 'Your consent is required.'], screening_incomplete: ['Позначте всі пункти перевірки допуску.', 'Tick every eligibility check.'],
    'required:reason': ['Вкажіть причину.', 'Give a reason.'], 'required:note': ['Додайте пояснення.', 'Add an explanation.'], 'required:comment': ['Напишіть, що саме виправити.', 'Say what needs to be fixed.'],
    'required:question': ['Напишіть питання.', 'Write the question.'], 'required:value': ['Напишіть відповідь.', 'Write the answer.'], unchanged: ['Нічого не змінено.', 'Nothing has changed.'],
    invite_expired: ['Запрошення прострочене. Попросіть організатора надіслати нове.', 'The invitation has expired. Ask the organiser for a new one.'],
    checks_failed: ['Спершу виправте помилки в бізнес-плані.', 'Fix the errors in the business plan first.'], verification_required: ['Спершу оберіть формат перевірки.', 'Choose the verification format first.'],
    files_not_accepted: ['Спершу прийміть усі файли.', 'Accept all files first.'], no_correction_marked: ['Позначте, що саме виправити.', 'Mark what needs to be fixed first.'],
    decisions_incomplete: ['Ухваліть рішення щодо кожного прийнятого пакета.', 'Decide on every accepted package.'], over_pool: ['Сума перевищує бюджет раунду.', 'The total exceeds the round budget.'],
    docs_not_accepted: ['Спершу прийміть усі документи.', 'Accept all documents first.'], name_mismatch: ['Ім’я не збігається з заявкою.', 'The name does not match the application.'],
    'invalid:amount': ['Перевірте суму.', 'Check the amount.'], 'required:supplier': ['Вкажіть постачальника.', 'Enter the supplier.'], date_out_of_period: ['Дата має бути в періоді реалізації.', 'The date must be within the implementation period.'],
    'invalid:date': ['Перевірте дату.', 'Check the date.'], 'required:narrative': ['Коротко опишіть результати.', 'Briefly describe the results.'], undecided_purchases: ['Ухваліть рішення щодо кожного чека.', 'Decide on every receipt.'],
    samples_only: ['У демо — лише синтетичні зразки документів.', 'The demo accepts synthetic samples only.'], storage_failed: ['Не вдалося зберегти в браузері (сховище недоступне або переповнене). Дію не виконано.', 'Could not save in this browser (storage unavailable or full). Nothing was changed.'],
    write_conflict: ['Інша вкладка саме змінює дані. Спробуйте ще раз.', 'Another tab is changing the data. Try again.'], corrupt: ['Збережені дані демо пошкоджені. Почніть спочатку.', 'Saved demo data is damaged. Start over.'],
    storage_unavailable: ['Браузер не дає зберігати дані (наприклад, приватний режим). Демо не може працювати без локального сховища.', 'The browser does not allow saving data (e.g. a private window). The demo needs local storage.'],
    no_purchases: ['Додайте хоча б одну покупку.', 'Add at least one purchase.'], already_accepted: ['Цей документ уже прийнято.', 'This document is already accepted.'],
    'invalid:until': ['Нова дата має бути пізніше за поточну.', 'The new date must be later than now.'], 'required:text': ['Напишіть текст.', 'Write the text.'], 'invalid:acceptedMinor': ['Прийнята сума — від 0,01 до суми чека.', 'Accepted amount must be between 0.01 and the receipt amount.']
  };
  function errText(code) {
    if (!code) return '';
    var base = String(code).split(':').slice(0, 2).join(':'), x = ERR[code] || ERR[base] || ERR[String(code).split(':')[0]];
    if (/^line_without_purchase:/.test(code)) return tr('Додайте покупку до рядка ' + (+code.split(':')[1] + 1) + ' або поясніть, чому її немає.', 'Add a purchase to line ' + (+code.split(':')[1] + 1) + ' or explain why there is none.');
    if (/^required:/.test(code)) return tr('Заповніть обов’язкове поле.', 'Fill in the required field.');
    return x ? tr(x[0], x[1]) : tr('Дію не виконано: ', 'Not done: ') + code;
  }

  var toastEl = null, toastTimer = 0;
  function toast(msg, isError) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'd-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.toggle('error', !!isError); toastEl.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('visible'); }, isError ? 4200 : 2400);
  }
  function state() { return ST.read().state; }
  function actor() { var s = ST.session(); return s.role === 'organiser' ? { role: 'organiser' } : { role: 'applicant', appId: s.appId }; }
  /* runs an action through the shared store; shows the guard's reason when it is refused */
  function act(type, appId, p, okMsg) {
    var seen = state().seq;
    return ST.dispatch({ type: type, actor: actor(), appId: appId, p: p || {} }, seen).then(function (r) {
      if (!r.ok) toast((r.stale ? tr('Дані змінилися в іншій вкладці. ', 'The data changed in another tab. ') : '') + errText(r.error), true);
      else if (okMsg) toast(okMsg);
      return r;
    });
  }
  function icon(name) {
    var p = {
      check: 'M5 12.5l4.2 4.2L19 7', arrow: 'M5 12h14M13 6l6 6-6 6', back: 'M19 12H5M11 6l-6 6 6 6', file: 'M7 3h7l5 5v13H7zM14 3v5h5', dl: 'M12 4v12M6 11l6 6 6-6M5 20h14',
      eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
      alert: 'M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', plus: 'M12 5v14M5 12h14', msg: 'M4 5h16v11H8l-4 4z'
    }[name];
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + p + '"/></svg>';
  }
  /* one modal at a time; returns a promise of the pressed button value */
  function modal(title, bodyHtml, buttons) {
    return new Promise(function (resolve) {
      var prev = document.activeElement, box = document.createElement('div');
      box.className = 'v3-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'v3ModalT');
      box.innerHTML = '<div class="v3-modal-in"><h2 id="v3ModalT">' + esc(title) + '</h2><div class="v3-modal-body">' + bodyHtml + '</div><div class="v3-modal-actions">' +
        buttons.map(function (b, i) { return '<button type="button" class="d-btn ' + (b.primary ? 'd-btn--primary' : '') + '" data-v="' + i + '">' + esc(b.label) + '</button>'; }).join('') + '</div></div>';
      (document.querySelector('.demo-frame-body') || document.body).appendChild(box);
      function close(v) { box.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); resolve(v); }
      function key(e) { if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', key);
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) close(buttons[+b.getAttribute('data-v')].value); else if (e.target === box) close(null); });
      var first = box.querySelector('.d-btn--primary') || box.querySelector('button'); if (first) first.focus();
    });
  }
  function download(job, btn) {
    if (btn) btn.disabled = true;
    return job.then(function (f) { D.download(f.blob, f.name); toast(tr('Файл готовий: ', 'File ready: ') + f.name); return f; })
      .catch(function (e) { toast(tr('Не вдалося сформувати файл: ', 'Could not build the file: ') + e.message, true); })
      .then(function (f) { if (btn) btn.disabled = false; return f; });
  }
  function samplePreview(f, opts) {
    var url = window.MGSamples.draw(f, Object.assign({ lang: LANG }, opts || {}));
    return modal(slot(f.slot) + ' · v' + f.v, '<img class="v3-sample" src="' + url + '" alt="' + esc(tr('Синтетичний зразок документа', 'Synthetic sample document')) + '">', [{ label: tr('Закрити', 'Close'), value: 'close', primary: true }]);
  }

  window.MGUI = { LANG: LANG, tr: tr, esc: esc, money: money, date: date, dateTime: dateTime, status: status, tone: tone, chip: chip, fileChip: fileChip, business: business, BUSINESS: BUSINESS,
    slot: slot, errText: errText, toast: toast, state: state, actor: actor, act: act, icon: icon, modal: modal, download: download, samplePreview: samplePreview, CAPTURE: q.get('capture') === '1' };
})();
