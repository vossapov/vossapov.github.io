/* Microgrants v3 — deterministic demo scenarios. Nothing here is a record by itself: every step is an
   ordinary action that goes through the model's guards (MGModel.reduce). The cohort and the canonical
   story are started only by the visible demo controls outside the product frame. All people, ideas,
   suppliers, links (example.org) and phone numbers are invented. */
(function (root) {
  'use strict';
  var M = (typeof module !== 'undefined' && module.exports) ? require('./model.js') : root.MGModel;
  var C = (typeof module !== 'undefined' && module.exports) ? require('./checks.js') : root.MGChecks;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* the same invented applicant as the earlier demo (data.js SAMPLE) */
  var IRYNA_FORM = {
    lastName: 'Зразкова', firstName: 'Ірина', ideaTitle: 'Розширення виробництва домашньої випічки',
    age: '38', family: '4 особи: заявниця, чоловік, двоє дітей — 8 і 13 років', familyIncome: '18 000', members: '4',
    community: 'Демонстраційна громада', settlement: 'с. Приклад', education: 'Професійно-технічна, кухар-кондитер; курс сучасних десертів',
    otherInfo: 'не застосовується', vulnerabilities: ['Родина ВПО'], otherVuln: '',
    registered: 'Так, ФОП з 2024 року', mainIncome: 'Так, разом із зарплатою чоловіка', employees: 'Найманих працівників немає',
    newJobs: 'Одне робоче місце помічниці з весни наступного року', experience: '5 років печу на замовлення: торти, булочки, печиво; постійні клієнти в селі й сусідньому містечку',
    grants: 'Не отримувала',
    ideaDesc: 'Печу на замовлення для мешканців села й двох сусідніх. Побутова духовка вміщує одну деко — у святкові тижні відмовляю частині клієнтів. Конвекційна піч і тістоміс дозволять пекти втричі більше за той самий час і продавати через місцеву крамницю.',
    demand: 'Постійні клієнти, повторні замовлення, найближча пекарня — за 20 км.',
    goal: 'Збільшення доходу', incomeImpact: 'Більше замовлень за той самий час: зможу приймати святкові замовлення й щотижневі поставки в крамницю, дохід родини зросте.',
    totalNeeded: '65 500', grantRequested: '58 500', ownContribution: '7 000', ownUse: 'Робочий стіл з нержавіючої сталі',
    procurement: 'Порівняла пропозиції двох постачальників. Піч і тістоміс у наявності, доставка 3–7 днів; коробки під замовлення — 10 днів.',
    clients: 'Зараз — рекомендації й група села в месенджері. Після гранту — домовленість з місцевою крамницею, сторінка в соцмережі.',
    development: 'Розширити асортимент хлібом на заквасці й вийти на сусідню громаду.',
    incomeForecast: 'Близько 60 виробів на тиждень по 120 грн — виручка до 28 800 грн на місяць; чистий результат близько 9 000 грн.',
    firstResults: 'Листопад 2026: закупівля й доставка в жовтні, перші поставки в крамницю наприкінці листопада.',
    motivation: 'Маю досвід, клієнтів і облаштовану кухню. Обмежує потужність побутової духовки. Нове обладнання дасть змогу виконувати всі замовлення й постачати крамницю.',
    startup: 'no', startupText: ''
  };
  var IRYNA_ITEMS = [
    { name: 'Конвекційна піч Demo-Bake 4, 4 рівні', unit: 'шт.', qty: '1', price: '38000', source: 'grant', kind: 'equipment', isNew: true, inUkraine: true, link: 'https://shop.example.org/ovens/demo-bake-4', deliveryDays: '5', comment: 'Вартість включає доставку' },
    { name: 'Тістоміс спіральний Demo-Mix 20, 20 л', unit: 'шт.', qty: '1', price: '9500', source: 'grant', kind: 'equipment', isNew: true, inUkraine: true, link: 'https://shop.example.org/mixers/demo-mix-20', deliveryDays: '7', comment: 'Гарантія 12 місяців' },
    { name: 'Коробки для випічки з логотипом, 20×20 см', unit: 'шт.', qty: '500', price: '12', source: 'grant', kind: 'materials', isNew: true, inUkraine: true, link: 'https://pack.example.org/boxes/20x20', deliveryDays: '10', comment: 'Під замовлення' },
    { name: 'Інгредієнти на перший місяць: борошно 1 ґатунку 50 кг та інше', unit: 'компл.', qty: '1', price: '5000', source: 'grant', kind: 'materials', isNew: true, inUkraine: true, link: 'https://food.example.org/flour/50kg', deliveryDays: '3', comment: '' },
    { name: 'Робочий стіл з нержавіючої сталі Demo-Steel 120', unit: 'шт.', qty: '1', price: '7000', source: 'own', kind: 'equipment', isNew: true, inUkraine: true, link: '', deliveryDays: '', comment: 'Власний внесок' }
  ];
  var IRYNA_INTAKE = {
    lastName: 'Зразкова', firstName: 'Ірина', phone: '+380 00 000 00 12', community: 'Демонстраційна громада', settlement: 'с. Приклад',
    members: '4', vulnerabilities: ['Родина ВПО'], businessType: 'food', ideaTitle: 'Розширення виробництва домашньої випічки',
    ideaShort: 'Печу на замовлення; конвекційна піч і тістоміс дозволять приймати більше замовлень і постачати місцеву крамницю.',
    existing: 'yes', requestedApprox: '58500'
  };

  function fmtUah(n) { return C.fmt(n); }
  /* plan with sums on slides 7–8 taken from its own items, so the live checks pass */
  function planFrom(form, items) {
    var t = C.totals(items), f = clone(form);
    f.totalNeeded = fmtUah(t.all); f.grantRequested = fmtUah(t.grant); f.ownContribution = fmtUah(t.own);
    return { form: f, items: clone(items), photos: [] };
  }
  function item(name, price, kind, slug, extra) {
    var it = { name: name, unit: 'шт.', qty: '1', price: String(price), source: 'grant', kind: kind, isNew: true, inUkraine: true,
      link: 'https://shop.example.org/' + slug, deliveryDays: '7', comment: '' };
    if (extra) Object.keys(extra).forEach(function (k) { it[k] = extra[k]; });
    return it;
  }

  /* eleven invented cohort participants; `goal` is where each one's story stops */
  var COHORT = [
    { ref: 'c1', last: 'Приклад', first: 'Олена', type: 'services', idea: 'Перукарня вдома', community: 'Сусідня громада (поза програмою)', goal: 'not_eligible',
      items: [item('Перукарське крісло Demo-Chair 2, гідравлічне', 14000, 'equipment', 'chairs/demo-chair-2'), item('Мийка перукарська Demo-Wash 1 з кріслом', 12000, 'equipment', 'wash/demo-wash-1')] },
    { ref: 'c2', last: 'Тестовий', first: 'Андрій', type: 'repair', idea: 'Ремонт велосипедів', goal: 'withdrawn',
      items: [item('Стенд ремонтний Demo-Stand 3, складаний', 9000, 'equipment', 'stands/demo-stand-3'), item('Набір інструментів Demo-Tools 68 предметів', 11000, 'equipment', 'tools/demo-68')] },
    { ref: 'c3', last: 'Вигаданенко', first: 'Марія', type: 'crafts', idea: 'Кравецька майстерня', goal: 'accepted_mixed',
      items: [item('Швейна машина Demo-Sew 500, промислова', 26000, 'equipment', 'sew/demo-500'), item('Оверлок Demo-Lock 4, 4-нитковий', 14000, 'equipment', 'lock/demo-4'), item('Тканини й нитки на 2 місяці, набір 1', 6000, 'materials', 'fabric/set-1')] },
    { ref: 'c4', last: 'Умовний', first: 'Сергій', type: 'agri', idea: 'Теплиця для розсади', goal: 'overdue_report',
      items: [item('Теплиця полікарбонатна Demo-Green 6×3 м', 30000, 'equipment', 'green/demo-6x3'), item('Система крапельного поливу Demo-Drip 60 м', 8000, 'equipment', 'drip/demo-60'), item('Насіння й субстрат, набір 2 на сезон', 5000, 'materials', 'seeds/set-2')] },
    { ref: 'c5', last: 'Демченко', first: 'Тетяна', type: 'food', idea: 'Сушіння фруктів', goal: 'report_pending',
      items: [item('Дегідратор Demo-Dry 10, 10 ярусів', 24000, 'equipment', 'dry/demo-10'), item('Вакууматор Demo-Vac 2 для пакування', 9000, 'equipment', 'vac/demo-2'), item('Пакети з етикетками, набір 3 на 1000 шт', 4000, 'materials', 'bags/set-3')] },
    { ref: 'c6', last: 'Пробний', first: 'Віктор', type: 'crafts', idea: 'Столярна майстерня', goal: 'next_round',
      items: [item('Рейсмус-фуганок Demo-Plane 2, 1500 Вт', 28000, 'equipment', 'plane/demo-2'), item('Пила торцювальна Demo-Saw 255 мм', 12000, 'equipment', 'saw/demo-255'), item('Деревина й клей, партія 1', 5000, 'materials', 'wood/batch-1')] },
    { ref: 'c7', last: 'Зразченко', first: 'Наталія', type: 'services', idea: 'Манікюрний кабінет', goal: 'reserve',
      items: [item('Манікюрний стіл Demo-Nail 1 з витяжкою', 15000, 'equipment', 'nail/demo-1'), item('Лампа й фрезер Demo-Set 2, комплект', 9000, 'equipment', 'nail/demo-set-2')] },
    { ref: 'c8', last: 'Ілюстрацій', first: 'Богдан', type: 'agri', idea: 'Пасіка на 20 вуликів', goal: 'closed_overcap',
      items: [item('Вулики Demo-Hive 10 рамок, 20 шт', 2000, 'equipment', 'hives/demo-10', { qty: '20' }), item('Медогонка Demo-Spin 4 рамки', 11000, 'equipment', 'spin/demo-4'), item('Рамки й вощина, набір 5', 3000, 'materials', 'frames/set-5')] },
    { ref: 'c9', last: 'Модельна', first: 'Ганна', type: 'food', idea: 'Міні-сироварня', goal: 'accepted_own',
      items: [item('Сироварня Demo-Cheese 50 л', 32000, 'equipment', 'cheese/demo-50'), item('Холодильна шафа Demo-Cold 400 л', 14000, 'equipment', 'cold/demo-400'), item('Закваски й форми, набір 6', 4000, 'materials', 'cult/set-6')] },
    { ref: 'c10', last: 'Шаблонний', first: 'Ігор', type: 'repair', idea: 'Ремонт телефонів', goal: 'clarification',
      items: [item('Паяльна станція Demo-Solder 2 з феном', 9000, 'equipment', 'solder/demo-2')] },
    { ref: 'c11', last: 'Пробна', first: 'Оксана', type: 'crafts', idea: 'Виготовлення свічок', goal: 'plan_overdue',
      items: [item('Воскотопка Demo-Melt 10 л', 8000, 'equipment', 'melt/demo-10')] }
  ];

  function cohortIntake(c) {
    return { lastName: c.last, firstName: c.first, phone: '+380 00 000 00 ' + String(20 + COHORT.indexOf(c)).padStart(2, '0'), community: c.community || 'Демонстраційна громада',
      settlement: 'с. Демо-' + (COHORT.indexOf(c) + 1), members: '3', vulnerabilities: [], businessType: c.type, ideaTitle: c.idea,
      ideaShort: c.idea + ': обладнання з кошторису дасть змогу збільшити обсяг робіт.', existing: 'yes', requestedApprox: String(Math.min(59000, C.totals(c.items).grant)) };
  }
  function cohortPlan(c) {
    var f = clone(IRYNA_FORM);
    f.lastName = c.last; f.firstName = c.first; f.ideaTitle = c.idea; f.community = c.community || 'Демонстраційна громада';
    f.settlement = 'с. Демо-' + (COHORT.indexOf(c) + 1); f.vulnerabilities = []; f.ownUse = ''; f.family = '3 особи';
    f.ideaDesc = c.idea + ' (вигаданий приклад для демо): обладнання з кошторису.';
    return planFrom(f, c.items);
  }

  var CHECKS_OK = { community: true, household: true, priorGrant: true, business: true };
  function org(type, ref, p) { return { ref: ref, type: type, role: 'organiser', p: p || {} }; }
  function usr(type, ref, p) { return { ref: ref, type: type, role: 'applicant', p: p || {} }; }
  function clock(days) { return { type: 'demo.clock', role: 'demo', p: { days: days } }; }
  function fullAward(state, code) {
    return M.grantLines(M.latestPlan(state.apps[code])).map(function (l) { return { idx: l.idx, approvedMinor: l.requestedMinor }; });
  }

  /* cohort: earlier participants of the same round, in chronological phases */
  function cohortSteps() {
    var s = [], reach = function (c, stage) {
      var order = ['submit', 'review', 'activate', 'plan', 'accept', 'award', 'docs', 'agreement', 'transfer', 'report', 'reportReview', 'close'];
      var stop = { not_eligible: 'review', withdrawn: 'activate', clarification: 'review', plan_overdue: 'activate', next_round: 'plan', reserve: 'award',
        accepted_mixed: 'reportReview', overdue_report: 'transfer', report_pending: 'report', closed_overcap: 'close', accepted_own: 'reportReview' }[c.goal];
      return order.indexOf(stage) <= order.indexOf(stop);
    };
    COHORT.forEach(function (c) { s.push(usr('apply.submit', c.ref, { intake: cohortIntake(c), consents: { selection: true, contact: true }, key: 'demo-' + c.ref })); });
    s.push(clock(3));
    COHORT.forEach(function (c) {
      s.push(org('review.start', c.ref));
      if (c.goal === 'not_eligible') s.push(org('review.decide', c.ref, { decision: 'not_eligible', reason: 'outside_community', checks: { community: false } }));
      else if (c.goal === 'clarification') s.push(org('review.clarify', c.ref, { field: 'ideaShort', question: 'Уточніть, які саме послуги надаватимете і де працюватимете.' }));
      else s.push(org('review.decide', c.ref, { decision: 'eligible', checks: CHECKS_OK }));
    });
    s.push(clock(2));
    COHORT.forEach(function (c) { if (reach(c, 'activate') && c.goal !== 'not_eligible' && c.goal !== 'clarification') s.push(usr('cabinet.activate', c.ref, { consent: true })); });
    s.push(usr('app.withdraw', 'c2', { reason: 'Отримав роботу за наймом' }));
    s.push(clock(10));
    COHORT.forEach(function (c) {
      if (!reach(c, 'plan') || ['withdrawn', 'plan_overdue', 'not_eligible', 'clarification'].indexOf(c.goal) > -1) return;
      s.push(usr('verification.choose', c.ref, { choice: 'visit' }));
      s.push({ ref: c.ref, type: 'plan.submit', role: 'applicant', p: cohortPlan(c) });
    });
    s.push(clock(4));
    COHORT.forEach(function (c) {
      if (!reach(c, 'accept') || ['withdrawn', 'plan_overdue', 'not_eligible', 'clarification', 'next_round'].indexOf(c.goal) > -1) return;
      s.push({ ref: c.ref, type: 'review.files', role: 'organiser', p: { status: 'accepted' } });
      s.push(org('plan.accept', c.ref));
    });
    s.push(clock(5));
    s.push({ type: 'selection.round1', role: 'organiser', p: {} });
    /* c6 is accepted after this committee meeting and waits for the next one */
    s.push({ ref: 'c6', type: 'review.files', role: 'organiser', p: { status: 'accepted' } });
    s.push(org('plan.accept', 'c6'));
    s.push(clock(3));
    var awarded = COHORT.filter(function (c) { return ['accepted_mixed', 'overdue_report', 'report_pending', 'closed_overcap', 'accepted_own'].indexOf(c.goal) > -1; });
    awarded.forEach(function (c) {
      s.push(usr('docs.ptype', c.ref, { ptype: 'id' }));
      M.DOC_SLOTS.id.forEach(function (sl) { s.push(usr('doc.add', c.ref, { slot: sl, sample: true })); });
    });
    s.push(clock(2));
    awarded.forEach(function (c) {
      s.push({ ref: c.ref, type: 'review.files', role: 'organiser', p: { status: 'accepted', prefix: 'doc:' } });
      s.push(org('agreement.send', c.ref));
    });
    s.push(clock(1));
    awarded.forEach(function (c) { s.push({ ref: c.ref, type: 'agreement.confirm', role: 'applicant', p: { agree: true, name: c.last + ' ' + c.first } }); });
    s.push(clock(2));
    awarded.forEach(function (c) { s.push({ ref: c.ref, type: 'transfer.full', role: 'organiser', p: {} }); });
    s.push(clock(20));
    /* reports: amounts in kopecks; overdue_report never reports */
    var P = {
      c3: [[0, 2550000, '2026-09-12', 'Постачальник А (демо)'], [0, 60000, '2026-09-14', 'Постачальник А (демо)'], [1, 1400000, '2026-09-13', 'Постачальник Б (демо)'], [2, 640000, '2026-09-15', 'Тканини (демо)']],
      c5: [[0, 2400000, '2026-09-12', 'Постачальник В (демо)'], [1, 900000, '2026-09-12', 'Постачальник В (демо)'], [2, 400000, '2026-09-16', 'Пакування (демо)']],
      c8: [[0, 4000000, '2026-09-11', 'Пасіка-постач (демо)'], [1, 1250000, '2026-09-12', 'Пасіка-постач (демо)'], [2, 300000, '2026-09-13', 'Пасіка-постач (демо)']],
      c9: [[0, 3200000, '2026-09-11', 'Сир-техніка (демо)'], [1, 1400000, '2026-09-12', 'Холод (демо)'], [2, 400000, '2026-09-12', 'Закваски (демо)'], [1, 250000, '2026-09-14', 'Холод (демо)', 'own']]
    };
    Object.keys(P).forEach(function (ref) {
      P[ref].forEach(function (r) { s.push(usr('purchase.add', ref, { lineIdx: r[0], amountMinor: r[1], date: r[2], supplier: r[3], funding: r[4] || 'grant' })); });
      s.push(usr('evidence.add', ref, { sample: true }));
      s.push(usr('report.submit', ref, { indicators: { inUse: true, weekly: ref === 'c8' ? 0 : 25, jobs: ref === 'c9' ? 1 : 0 }, narrative: 'Обладнання закуплено й використовується (вигаданий приклад).', notPurchased: {} }));
    });
    s.push(clock(4));
    /* c3: one part disallowed (accessories above the price in the plan) and one purchase excluded */
    s.push({ ref: 'c3', type: 'decide.all', role: 'organiser', p: { overrides: { 0: { acceptedMinor: 2500000, reason: 'Прийнято в межах ціни з кошторису' }, 1: { decision: 'exclude', reason: 'Чек на аксесуари, яких немає в кошторисі' } } } });
    s.push(org('report.accept', 'c3', { evidenceAccepted: true }));
    s.push({ ref: 'c8', type: 'decide.all', role: 'organiser', p: {} });
    s.push(org('report.accept', 'c8', { evidenceAccepted: true }));
    s.push(org('grant.close', 'c8'));
    s.push({ ref: 'c9', type: 'decide.all', role: 'organiser', p: {} });
    s.push(org('report.accept', 'c9', { evidenceAccepted: false }));
    s.push(clock(14));
    return s;
  }

  /* the canonical story of one applicant (Iryna); checkpoints are positions in this list */
  var IRYNA_KEY = '582941';
  function irynaPlanV2() {
    var items = clone(IRYNA_ITEMS);
    items[0].name = 'Конвекційна піч Demo-Bake 4M, 4 рівні'; items[0].price = '37400'; items[0].link = 'https://shop.example.org/ovens/demo-bake-4m';
    return planFrom(IRYNA_FORM, items);
  }
  function irynaSteps() {
    var me = 'me';
    return [
      { cp: 'submitted', step: usr('apply.submit', me, { intake: IRYNA_INTAKE, consents: { selection: true, contact: true }, key: IRYNA_KEY }) },
      { step: clock(2) },
      { step: org('review.start', me) },
      { cp: 'eligible', step: org('review.decide', me, { decision: 'eligible', checks: CHECKS_OK }) },
      { step: clock(1) },
      { cp: 'cabinet', step: usr('cabinet.activate', me, { consent: true }) },
      { step: usr('verification.choose', me, { choice: 'video' }) },
      { step: clock(6) },
      { cp: 'plan_v1', step: { ref: me, type: 'plan.submit', role: 'applicant', p: planFrom(IRYNA_FORM, IRYNA_ITEMS) } },
      { step: clock(2) },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'plan:pptx', status: 'accepted' } } },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'plan:video', status: 'accepted' } } },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'plan:xlsx', status: 'needs_correction', anchor: 0,
        comment: 'Позиція 1: за посиланням модель Demo-Bake 4 знято з продажу. Оновіть посилання й ціну на актуальну модель.' } } },
      { cp: 'plan_changes', step: org('plan.return', me) },
      { step: clock(1) },
      { cp: 'plan_v2', step: { ref: me, type: 'plan.submit', role: 'applicant', p: irynaPlanV2() } },
      { step: clock(1) },
      { step: { ref: me, type: 'review.files', role: 'organiser', p: { status: 'accepted' } } },
      { cp: 'package', step: org('plan.accept', me) },
      { step: clock(5) },
      { cp: 'awarded', step: { type: 'selection.round2', role: 'organiser', p: {} } },
      { step: clock(1) },
      { step: usr('docs.ptype', me, { ptype: 'id' }) },
      { step: usr('doc.add', me, { slot: 'idFront', sample: true }) },
      { step: usr('doc.add', me, { slot: 'idBack', sample: true }) },
      { step: usr('doc.add', me, { slot: 'idReg', sample: true }) },
      { step: usr('doc.add', me, { slot: 'ipn', sample: true }) },
      { step: usr('doc.add', me, { slot: 'iban', sample: true, variant: 'blurred' }) },
      { step: clock(1) },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:idFront', status: 'accepted' } } },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:idBack', status: 'accepted' } } },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:idReg', status: 'accepted' } } },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:ipn', status: 'accepted' } } },
      { cp: 'docs_fix', step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:iban', status: 'needs_correction', comment: 'Довідку не видно повністю: нижній край з IBAN обрізаний. Завантажте довідку цілком.' } } },
      { step: usr('doc.add', me, { slot: 'iban', sample: true }) },
      { step: { ref: me, type: 'review.slot', role: 'organiser', p: { slot: 'doc:iban', status: 'accepted' } } },
      { cp: 'agreement', step: org('agreement.send', me) },
      { step: clock(1) },
      { cp: 'confirmed', step: usr('agreement.confirm', me, { agree: true, name: 'Зразкова Ірина' }) },
      { step: clock(1) },
      { cp: 'implementation', step: { ref: me, type: 'transfer.full', role: 'organiser', p: {} } },
      { step: clock(12) },
      { step: usr('purchase.add', me, { lineIdx: 0, amountMinor: 3740000, date: '2026-11-06', supplier: 'Демо-Техніка ТОВ (вигадано)', funding: 'grant' }) },
      { step: usr('purchase.add', me, { lineIdx: 1, amountMinor: 950000, date: '2026-11-06', supplier: 'Демо-Техніка ТОВ (вигадано)', funding: 'grant' }) },
      { step: usr('purchase.add', me, { lineIdx: 2, amountMinor: 600000, date: '2026-11-10', supplier: 'Пак-Демо (вигадано)', funding: 'grant' }) },
      { cp: 'purchases', step: usr('purchase.add', me, { lineIdx: 3, amountMinor: 530000, date: '2026-11-12', supplier: 'Борошно-Демо (вигадано)', funding: 'grant', receiptVariant: 'blurred' }) },
      { step: usr('evidence.add', me, { sample: true }) },
      { cp: 'report_v1', step: usr('report.submit', me, { indicators: { inUse: true, weekly: 45, jobs: 0 }, narrative: 'Піч і тістоміс встановлені й працюють з 7 листопада. Перші поставки в крамницю — двічі на тиждень.', notPurchased: {} }) },
      { step: clock(2) },
      { step: { ref: me, type: 'decide.one', role: 'organiser', p: { n: 0, decision: 'accept' } } },
      { step: { ref: me, type: 'decide.one', role: 'organiser', p: { n: 1, decision: 'accept' } } },
      { step: { ref: me, type: 'decide.one', role: 'organiser', p: { n: 2, decision: 'accept' } } },
      { step: { ref: me, type: 'decide.one', role: 'organiser', p: { n: 3, decision: 'correct', reason: 'Чек нечитабельний: не видно суми й дати. Додайте чіткий чек.' } } },
      { cp: 'report_fix', step: org('report.return', me) },
      { step: clock(1) },
      { step: { ref: me, type: 'receipt.replace', role: 'applicant', p: { n: 3 } } },
      { cp: 'report_v2', step: usr('report.submit', me, { indicators: { inUse: true, weekly: 45, jobs: 0 }, narrative: 'Піч і тістоміс встановлені й працюють з 7 листопада. Перші поставки в крамницю — двічі на тиждень.', notPurchased: {} }) },
      { step: clock(1) },
      { step: { ref: me, type: 'decide.one', role: 'organiser', p: { n: 3, decision: 'accept', acceptedMinor: 500000, reason: 'Прийнято в межах затвердженого рядка (5 000 грн); решта — не з гранту' } } },
      { cp: 'report_accepted', step: org('report.accept', me, { evidenceAccepted: true }) }
    ];
  }
  var CHECKPOINTS = irynaSteps().map(function (x, i) { return x.cp ? { id: x.cp, index: i } : null; }).filter(Boolean);
  var BRANCHES = {
    rejected: { after: 'submitted', steps: [clock(2), org('review.start', 'me'), org('review.decide', 'me', { decision: 'not_eligible', reason: 'other', checks: { community: true }, note: 'Ідея стосується перепродажу готової продукції, а програма підтримує власне виробництво чи послуги.' })] },
    withdrawn: { after: 'cabinet', steps: [clock(1), usr('app.withdraw', 'me', { reason: 'Змінились сімейні обставини' })] }
  };

  /* expand macro steps to real actions against the current state */
  function expand(state, st, refs) {
    var code = st.ref ? refs[st.ref] : null, x = code ? state.apps[code] : null;
    var actor = function (role) { return role === 'applicant' ? { role: 'applicant', appId: code } : { role: role }; };
    var one = function (type, p) { return { type: type, actor: actor(st.role), appId: code, p: p || {}, demo: true }; };
    switch (st.type) {
      case 'review.files':
        return Object.keys(state.files).map(function (k) { return state.files[k]; })
          .filter(function (f) { return f.appId === code && !f.superseded && f.slot.indexOf(st.p.prefix || 'plan:') === 0 && f.status !== st.p.status && (st.p.prefix ? true : M.planFiles(state, x).indexOf(f) > -1); })
          .map(function (f) { return one('file.review', { fileId: f.id, status: st.p.status }); });
      case 'review.slot': {
        var f = M.currentFile(state, code, st.p.slot);
        return [one('file.review', { fileId: f ? f.id : 'none', status: st.p.status, comment: st.p.comment || '', anchor: st.p.anchor == null ? null : st.p.anchor })];
      }
      case 'selection.round1': case 'selection.round2': {
        var round2 = st.type === 'selection.round2';
        var decisions = state.order.filter(function (c) { return state.apps[c].status === 'package_accepted'; }).map(function (c) {
          var ref = Object.keys(refs).filter(function (r) { return refs[r] === c; })[0];
          var def = COHORT.filter(function (k) { return k.ref === ref; })[0];
          var dec = (def && def.goal === 'reserve') ? 'reserve' : (def && def.goal === 'next_round' && round2) ? 'not_selected' : 'award';
          var lines = dec === 'award' ? fullAward(state, c) : [];
          if (ref === 'c5') lines[2].approvedMinor = 300000; /* committee cut the packaging line */
          return { code: c, decision: dec, score: def ? (dec === 'award' ? 7 : dec === 'reserve' ? 6 : 5) : 8, lines: lines };
        });
        return [{ type: 'selection.publish', actor: { role: 'organiser' }, p: { decisions: decisions }, demo: true }];
      }
      case 'transfer.full':
        return [one('transfer.mark', { amountMinor: x.award.approvedMinor, demoFlag: true })];
      case 'decide.all': {
        var r = M.latestReport(x), ov = st.p.overrides || {};
        return r.purchases.map(function (q, i) {
          var o = ov[i] || {};
          return one('purchase.decide', { purchaseId: q.id, decision: o.decision || 'accept', acceptedMinor: o.decision ? undefined : (o.acceptedMinor || q.amountMinor), reason: o.reason || '' });
        });
      }
      case 'decide.one': {
        var q = M.latestReport(x).purchases[st.p.n];
        return [one('purchase.decide', { purchaseId: q.id, decision: st.p.decision, acceptedMinor: st.p.decision === 'accept' ? (st.p.acceptedMinor || q.amountMinor) : undefined, reason: st.p.reason || '' })];
      }
      case 'receipt.replace': {
        var p = M.activePurchases(state, code)[st.p.n];
        return [one('purchase.receipt', { purchaseId: p.id })];
      }
      default:
        return [{ type: st.type, actor: st.role === 'demo' ? { role: 'demo' } : actor(st.role), appId: st.type === 'apply.submit' || st.role === 'demo' ? null : code, p: clone(st.p || {}), demo: true }];
    }
  }

  /* scenario refs recovered from the records (by the invented names) */
  function refsFor(state) {
    var refs = {};
    state.order.forEach(function (code) {
      var i = state.apps[code].intake;
      COHORT.forEach(function (c) { if (i.lastName === c.last && i.firstName === c.first) refs[c.ref] = code; });
      if (i.lastName === IRYNA_INTAKE.lastName && i.firstName === IRYNA_INTAKE.firstName) refs.me = code;
    });
    return refs;
  }
  /* runs macro steps with a dispatcher (state, action) → {ok, state, event}; returns refs */
  function run(state, steps, dispatch, refs) {
    refs = refs || refsFor(state);
    steps.forEach(function (st) {
      expand(state, st, refs).forEach(function (action) {
        var r = dispatch(state, action);
        if (!r.ok) throw new Error('scenario step failed: ' + action.type + ' ' + (action.appId || st.ref || '') + ' → ' + r.error);
        state = r.state;
        if (action.type === 'apply.submit' && st.ref) refs[st.ref] = r.event.appId;
      });
    });
    return { state: state, refs: refs };
  }
  function storySteps(upTo, branch) {
    var all = irynaSteps(), out = [], target = upTo ? CHECKPOINTS.filter(function (c) { return c.id === upTo; })[0] : null;
    if (branch) target = CHECKPOINTS.filter(function (c) { return c.id === BRANCHES[branch].after; })[0];
    var end = target ? target.index : all.length - 1;
    for (var i = 0; i <= end; i++) out.push(all[i].step);
    if (branch) out = out.concat(BRANCHES[branch].steps);
    return out;
  }

  var api = { COHORT: COHORT, IRYNA_FORM: IRYNA_FORM, IRYNA_ITEMS: IRYNA_ITEMS, IRYNA_INTAKE: IRYNA_INTAKE, IRYNA_KEY: IRYNA_KEY, CHECKPOINTS: CHECKPOINTS,
    BRANCHES: Object.keys(BRANCHES), cohortSteps: cohortSteps, refsFor: refsFor, storySteps: storySteps, run: run, planFrom: planFrom, irynaPlanV2: irynaPlanV2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MGSeed = api;
})(this);
