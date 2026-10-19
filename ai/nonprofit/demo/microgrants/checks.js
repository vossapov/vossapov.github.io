/* Live checks for the microgrant application — the rules from the participants' instructions,
   as one pure function. Used by the applicant cabinet, the organiser dashboard and the tests
   (next/tests/ngo-checks.test.js loads this file in Node). */
(function (root) {
  'use strict';

  var LIMIT = 59000;
  var EQUIPMENT_SHARE = 0.8;
  var MAX_DELIVERY_DAYS = 30;

  /* the presentation is read to the committee without the applicant: these must not be empty */
  var REQUIRED = [
    ['lastName', 'Слайд 1 · прізвище'], ['firstName', 'Слайд 1 · ім’я'], ['ideaTitle', 'Слайд 1 · назва бізнес-ідеї'],
    ['age', 'Слайд 2 · вік'], ['family', 'Слайд 2 · склад родини'], ['familyIncome', 'Слайд 2 · дохід сім’ї'],
    ['community', 'Слайд 2 · громада'], ['settlement', 'Слайд 2 · населений пункт'], ['education', 'Слайд 2 · освіта'],
    ['registered', 'Слайд 4 · реєстрація'], ['mainIncome', 'Слайд 4 · основне джерело доходу'], ['employees', 'Слайд 4 · працівники'],
    ['newJobs', 'Слайд 4 · нові робочі місця'], ['experience', 'Слайд 4 · досвід'], ['grants', 'Слайд 4 · отримані гранти'],
    ['ideaDesc', 'Слайд 5 · опис бізнес-ідеї'], ['goal', 'Слайд 6 · мета'], ['incomeImpact', 'Слайд 6 · вплив на дохід'],
    ['procurement', 'Слайд 8 · опрацювання закупівель'], ['clients', 'Слайд 9 · залучення клієнтів'],
    ['development', 'Слайд 9 · подальший розвиток'], ['incomeForecast', 'Слайд 10 · прогноз доходу'],
    ['firstResults', 'Слайд 10 · перші результати'], ['motivation', 'Слайд 11 · мотивація']
  ];

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  function blank(v) { return v == null || String(v).trim() === ''; }
  function itemTotal(it) { return Math.round(num(it.qty) * num(it.price) * 100) / 100; }

  /* a direct product link: http(s), a real host and a path beyond the shop's home page */
  function linkProblem(link) {
    if (blank(link)) return 'missing';
    var m = /^https?:\/\/([^\/?#\s]+\.[^\/?#\s]+)(\/[^\s]*)?$/i.exec(String(link).trim());
    if (!m) return 'invalid';
    var path = (m[2] || '').replace(/[?#].*$/, '');
    if (path === '' || path === '/') return 'domain';
    return '';
  }

  function totals(items) {
    var t = { grant: 0, own: 0, all: 0, equipment: 0, other: 0 };
    (items || []).forEach(function (it) {
      var sum = itemTotal(it);
      t.all += sum;
      if (it.source === 'own') { t.own += sum; return; }
      t.grant += sum;
      if (it.kind === 'equipment') t.equipment += sum; else t.other += sum;
    });
    t.equipmentShare = t.grant > 0 ? t.equipment / t.grant : 0;
    return t;
  }

  function check(app) {
    app = app || {};
    var f = app.form || {}, items = app.items || [];
    var flags = [];
    var add = function (id, level, msg, extra) {
      var flag = { id: id, level: level, msg: msg };
      if (extra) Object.keys(extra).forEach(function (k) { flag[k] = extra[k]; });
      flags.push(flag);
    };
    var t = totals(items);

    var grantItems = items.filter(function (it) { return it.source !== 'own'; });
    if (!grantItems.length) add('no_items', 'error', 'У кошторисі немає жодної позиції за грантові кошти.');
    if (t.grant > LIMIT) add('grant_over_limit', 'error', 'Сума гранту ' + fmt(t.grant) + ' грн більша за максимум ' + fmt(LIMIT) + ' грн.');
    if (t.grant > 0 && t.equipmentShare < EQUIPMENT_SHARE - 1e-9) {
      add('equipment_share', 'error', 'Обладнання — ' + Math.round(t.equipmentShare * 100) + ' % гранту, а має бути щонайменше 80 %.');
    }
    if (!blank(f.grantRequested) && Math.abs(num(f.grantRequested) - t.grant) > 0.5) {
      add('grant_mismatch', 'error', 'На слайді 7 сума гранту ' + fmt(num(f.grantRequested)) + ' грн, а в кошторисі — ' + fmt(t.grant) + ' грн.');
    } else if (blank(f.grantRequested) && t.grant > 0) {
      add('grant_missing', 'error', 'Вкажіть на слайді 7 суму грантових коштів.', { field: 'grantRequested' });
    }
    if (!blank(f.totalNeeded) && Math.abs(num(f.totalNeeded) - t.all) > 0.5) {
      add('total_mismatch', 'error', 'Загальна сума на слайді 7 (' + fmt(num(f.totalNeeded)) + ' грн) не збігається з сумою всіх позицій (' + fmt(t.all) + ' грн).');
    }
    if (Math.abs(num(f.ownContribution) - t.own) > 0.5) {
      add('own_mismatch', 'error', 'Власний внесок на слайді 8 — ' + fmt(num(f.ownContribution)) + ' грн, а позиції за власні кошти — ' + fmt(t.own) + ' грн.');
    }

    items.forEach(function (it, i) {
      var n = i + 1, where = { item: i };
      if (blank(it.name)) { add('item_name:' + i, 'error', 'Позиція ' + n + ': немає назви.', where); return; }
      if (num(it.qty) <= 0 || num(it.price) <= 0) add('item_amount:' + i, 'error', 'Позиція ' + n + ': вкажіть кількість і ціну.', where);
      if (it.source === 'own') return;
      if (String(it.name).trim().split(/\s+/).length < 3 || !/\d/.test(it.name)) {
        add('item_vague:' + i, 'warn', 'Позиція ' + n + ': вкажіть тип, бренд і модель, як у продавця.', where);
      }
      var lp = linkProblem(it.link);
      if (lp === 'missing') add('item_no_link:' + i, 'error', 'Позиція ' + n + ': немає посилання на товар.', where);
      else if (lp === 'invalid') add('item_no_link:' + i, 'error', 'Позиція ' + n + ': посилання має починатися з https://.', where);
      else if (lp === 'domain') add('item_no_link:' + i, 'error', 'Позиція ' + n + ': потрібне пряме посилання на сторінку моделі, а не на магазин.', where);
      if (blank(it.deliveryDays)) add('item_delivery:' + i, 'error', 'Позиція ' + n + ': вкажіть строк доставки в днях.', where);
      else if (num(it.deliveryDays) > MAX_DELIVERY_DAYS) add('item_delivery:' + i, 'error', 'Позиція ' + n + ': доставка ' + num(it.deliveryDays) + ' днів — закупівля має вкластися в місяць. Пошукайте іншого постачальника.', where);
      if (it.kind === 'equipment') {
        if (!it.isNew) add('item_not_new:' + i, 'error', 'Позиція ' + n + ': за грант купується лише нове обладнання.', where);
        if (!it.inUkraine) add('item_not_ua:' + i, 'error', 'Позиція ' + n + ': обладнання має бути в наявності в Україні.', where);
      }
    });

    REQUIRED.forEach(function (r) {
      if (blank(f[r[0]])) add('required:' + r[0], 'error', r[1] + ': поле порожнє. Презентацію читають без вас — напишіть відповідь або «не застосовується».', { field: r[0] });
    });

    return {
      ok: !flags.some(function (x) { return x.level === 'error'; }),
      flags: flags,
      totals: t,
      ids: flags.map(function (x) { return x.id.split(':')[0]; })
    };
  }

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  var api = { check: check, totals: totals, itemTotal: itemTotal, linkProblem: linkProblem, fmt: fmt, LIMIT: LIMIT, REQUIRED: REQUIRED };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MGChecks = api;
})(this);
