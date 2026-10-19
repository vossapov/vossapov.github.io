/* Workspace demo — the deterministic "model": it classifies a project title by keyword stems, picks the
   question set of that type, proposes the most likely answers from the title and earlier answers, writes
   the description and proposes the applicant's form (steps, fields), the outputs and an FAQ.
   No live model and no network: everything here is plain rules over the organisation's (demo) context.
   Pure functions, no DOM; window.WSFlow in the browser, module.exports in node. */
(function (root) {
  'use strict';

  var ORG = {
    name: 'Центр підтримки громади',
    knows: 'Модель знає ваш статут, шаблони і 3 попередні проєкти.'
  };

  /* ───────────── text helpers ───────────── */
  function norm(s) { return String(s || '').toLowerCase().replace(/[’'`ʼ]/g, '').replace(/\s+/g, ' ').trim(); }
  function lcFirst(s) {
    s = String(s || '');
    return s.length > 1 && s[1] === s[1].toLowerCase() && s[1] !== s[1].toUpperCase() ? s[0].toLowerCase() + s.slice(1) : s;
  }
  function joinList(arr, last) {
    arr = arr.filter(Boolean);
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' ' + (last || 'і') + ' ' + arr[arr.length - 1];
  }
  function fmtNum(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  var MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  function dateIn(days, now) {
    var d = new Date(now || Date.now());
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function has(text, stems) { return stems.some(function (s) { return text.indexOf(s) > -1; }); }

  /* ───────────── classifier ───────────── */
  var TYPE_ORDER = ['grant', 'volunteers', 'sponsorship', 'membership', 'event', 'aid'];
  var STEMS = {
    grant: ['грант', 'конкурс', 'фінансуван', 'субгрант', 'стипенді'],
    volunteers: ['волонтер', 'доброволь'],
    sponsorship: ['патрон', 'спонсор', 'збір кошт', 'збір на', 'збору', 'донат', 'пожертв', 'меценат', 'фандрейз'],
    membership: ['вступ', 'членств', 'член', 'реєстрація у го', 'реєстрація в го', 'реєстрація до го', 'приєднатися до го'],
    event: ['табір', 'табор', 'захід', 'заход', 'навчанн', 'курс', 'тренінг', 'семінар', 'вебінар', 'майстер-клас', 'форум', 'конференц', 'реєстрація на', 'фестивал', 'екскурс'],
    aid: ['допомог', 'підтримк', 'вразлив', 'впо', 'переселен', 'гуманітар', 'малозабезпеч', 'продуктов', 'гігієн', 'ліки', 'видач']
  };
  /* Latin stems for links and file names («/grants/», «volunteer-camp.pdf»): matched per word — short stems only
     at the start of a word, so «paid» is not «aid» */
  var LATIN = {
    grant: ['grant', 'konkurs'], volunteers: ['volunteer', 'volonter'], sponsorship: ['sponsor', 'donat'],
    membership: ['member', 'vstup'], event: ['camp', 'tabir'], aid: ['aid', 'dopomog', 'humanitar']
  };
  function latinHits(t, stems) {
    var words = String(t).split(/[^a-z0-9]+/);
    return stems.filter(function (s) { return words.some(function (w) { return s.length < 5 ? w.indexOf(s) === 0 : w.indexOf(s) > -1; }); });
  }
  function classify(title) {
    var t = norm(title), best = 'generic', bestScore = 0;
    TYPE_ORDER.forEach(function (type) {
      var score = STEMS[type].filter(function (s) { return t.indexOf(s) > -1; }).length + latinHits(t, LATIN[type]).length;
      if (score > bestScore) { best = type; bestScore = score; }
    });
    return best;
  }

  /* the number of people mentioned in a description: «300 родин», «близько 1 200 учасників» */
  function peopleCount(t) {
    var m = String(t || '').match(/(\d[\d\s\u00a0]{0,6})\s*(людей|люди|осіб|особи|учасник|родин|сім|дітей|заяв|домогосподар|пенсіонер|ветеран)/);
    if (!m) return null;
    var n = +m[1].replace(/\D/g, '');
    return n > 0 && n < 1000000 ? n : null;
  }
  function W_who(c) { return has(c.ctx, ['працівник', 'співробітник', 'персонал', 'партнер', 'організаці', 'учасник', 'наших програм', 'клієнт']); }

  /* ───────────── context: documents and links for every project; a short description for titles the model does not know ───────────── */
  var CONTEXT_Q = {
    id: 'context', kind: 'context', short: 'Опис проєкту', q: 'Що *вже є* про цей проєкт?',
    hint: 'Положення, шаблони заяв, сторінка конкурсу — з ними питань буде менше.',
    hintNew: '2–3 речення: що відбувається, хто звертається і що людина має подати. Або додайте документи чи посилання.',
    starters: ['Люди звертаються до нас, щоб…', 'Ми збираємо заявки від…', 'Щоб отримати підтримку, людина має подати…']
  };
  var MAX_LINKS = 8;
  /* a link the person adds: http(s) only; «example.org/page» gets https://. Only the URL string and its keywords are kept. */
  function parseLink(raw, existing) {
    var s = String(raw || '').trim();
    if (!s) return { error: 'Вставте посилання.' };
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
    var u;
    try { u = new URL(s); } catch (e) { return { error: 'Це не схоже на посилання. Приклад: https://example.org/konkurs' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { error: 'Посилання має починатися з http:// або https://' };
    if (!/\.[a-z\u0400-\u04ff]{2,}$/i.test(u.hostname)) return { error: 'Перевірте адресу сайту: бракує домену, наприклад .org або .ua' };
    var href = u.href.slice(0, 500);
    var key = function (h) { return h.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase(); };
    if ((existing || []).some(function (l) { return key(l.url) === key(href); })) return { error: 'Таке посилання вже додано.' };
    if ((existing || []).length >= MAX_LINKS) return { error: 'Можна додати до ' + MAX_LINKS + ' посилань.' };
    var path = decodeURIComponentSafe(u.pathname + u.search).replace(/\/$/, '');
    return { link: { url: href, host: u.hostname.replace(/^www\./, ''), path: path.length > 26 ? path.slice(0, 24) + '…' : path, keys: keywords(decodeURIComponentSafe(href)) } };
  }
  function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  var DOC_EXT = ['pdf', 'docx', 'xlsx', 'txt'];
  /* what the model takes from a file or a description, by stem */
  var RECOGNISE = [
    ['статут', ['статут'], 'статут організації'],
    ['rules', ['положенн', 'регламент', 'правил', 'порядок'], 'правила програми'],
    ['template', ['шаблон', 'заяв', 'анкет', 'бланк', 'форма'], 'шаблон заявки'],
    ['reports', ['звіт', 'report'], 'досвід попередніх проєктів'],
    ['req', ['вимог', 'критері', 'має право', 'учасник', 'отримувач'], 'вимоги до учасників'],
    ['docs', ['документ', 'довідк', 'посвідч', 'паспорт'], 'перелік документів'],
    ['dates', ['строк', 'термін', 'дедлайн', 'дата', 'до 1', 'до 2', 'до 3'], 'строки'],
    ['money', ['кошторис', 'бюджет', 'грн', 'сума', 'budget'], 'суми й бюджет']
  ];
  var ALL_STEMS = [];
  Object.keys(STEMS).forEach(function (k) { STEMS[k].forEach(function (x) { if (ALL_STEMS.indexOf(x) < 0) ALL_STEMS.push(x); }); });
  RECOGNISE.forEach(function (r) { r[1].forEach(function (x) { if (ALL_STEMS.indexOf(x) < 0) ALL_STEMS.push(x); }); });
  /* the keywords kept from a file: only stems that occur in its name or text (the text itself is not stored) */
  function keywords(text) {
    var t = norm(String(text || '').replace(/[_\-.]+/g, ' '));
    var out = ALL_STEMS.filter(function (s) { return t.indexOf(s) > -1; });
    TYPE_ORDER.forEach(function (type) { latinHits(t, LATIN[type]).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); }); });
    return out;
  }
  function recognised(ctxData) {
    var t = contextText(ctxData);
    return RECOGNISE.filter(function (r) { return has(t, r[1]); }).map(function (r) { return r[2]; });
  }
  function contextText(ctxData) {
    if (!ctxData) return '';
    var parts = [ctxData.text || ''];
    (ctxData.files || []).forEach(function (f) { parts.push(String(f.name || '').replace(/[_\-.]+/g, ' ')); parts.push((f.keys || []).join(' ')); });
    (ctxData.links || []).forEach(function (l) { parts.push((l.keys || []).join(' ')); });
    return norm(parts.join(' '));
  }
  /* the type the description + file names + extracted keywords point to ('generic' when nothing matches) */
  function classifyContext(ctxData) { return classify(contextText(ctxData)); }

  /* ───────────── option helpers ───────────── */
  /* an option: v (id), t (label), d (form used inside the generated description; defaults to lcFirst(t)) */
  function O(v, t, d) { return { v: v, t: t, d: d }; }
  var COUNTS = [O('s', 'до 100', 'до 100'), O('m', '100–500', '100–500'), O('l', '500–2 000', '500–2 000'), O('xl', 'понад 2 000', 'понад 2 000')];
  function deadlineOptions(now) {
    return [[14, 'Через 2 тижні'], [21, 'Через 3 тижні'], [30, 'Через місяць'], [45, 'Через 6 тижнів']].map(function (x) {
      var d = dateIn(x[0], now);
      return { v: 'd' + x[0], t: x[1], sub: 'до ' + d, d: d };
    });
  }

  /* ───────────── question sets ───────────── */
  var TITLE_Q = {
    id: 'title', kind: 'title', short: 'Назва', q: 'Як *називається* проєкт?',
    hint: 'Як ви назвали б його в оголошенні. Можна обрати приклад нижче.',
    examples: ['Допомога вразливим верствам населення', 'Конкурс мікрогрантів', 'Набір волонтерів', 'Реєстрація на табір для дітей']
  };

  var AID_WHO = [O('idp', 'ВПО', 'ВПО'), O('disab', 'Люди з інвалідністю', 'людей з інвалідністю'), O('large', 'Багатодітні родини', 'багатодітних родин'),
    O('elder', 'Літні люди', 'літніх людей'), O('vets', 'Ветерани та їхні родини', 'ветеранів та їхніх родин'), O('kids', 'Діти з хронічними захворюваннями', 'дітей з хронічними захворюваннями')];
  var AID_PROOF = [O('id', 'Паспорт або ID-картка'), O('idpCert', 'Довідка ВПО'), O('disabCert', 'Посвідчення особи з інвалідністю'), O('largeCert', 'Посвідчення багатодітної родини'),
    O('pension', 'Пенсійне посвідчення'), O('ubd', 'Посвідчення УБД'), O('med', 'Медичний висновок')];
  var WHO_TO_PROOF = { idp: 'idpCert', disab: 'disabCert', large: 'largeCert', elder: 'pension', vets: 'ubd', kids: 'med' };

  var TYPES = {
    aid: {
      name: 'програма допомоги', acc: 'програму допомоги', intro: 'Схоже, це програма допомоги людям. Уточнимо кілька речей.', ref: 'ДП', color: 'violet',
      questions: [
        { id: 'who', kind: 'multi', short: 'Хто отримує', q: 'Хто *отримує* допомогу?', hint: 'Можна кілька.', options: AID_WHO,
          defaults: function (c) {
            var t = c.all, out = [];
            if (has(t, ['вразлив', 'малозабезпеч', 'соціальн'])) out.push('idp', 'disab', 'elder');
            if (has(t, ['впо', 'переселен'])) out.push('idp');
            if (has(t, ['інвалід'])) out.push('disab');
            if (has(t, ['багатодіт'])) out.push('large');
            if (has(t, ['літн', 'пенсіон', 'похил'])) out.push('elder');
            if (has(t, ['ветеран', 'військов', 'захисник'])) out.push('vets');
            if (has(t, ['дит', 'діт'])) out.push('kids');
            return out.length ? out : ['idp'];
          },
          reason: function (c) { return has(norm(c.title), ['вразлив']) ? 'Слово «вразливим» у назві: зазвичай це ВПО, люди з інвалідністю й літні люди.' : ''; } },
        { id: 'what', kind: 'multi', short: 'Яка допомога', q: 'Яку *допомогу* надаєте?', hint: 'Можна кілька.',
          options: [O('food', 'Продуктові набори'), O('hygiene', 'Гігієнічні набори'), O('meds', 'Ліки'), O('cash', 'Грошова допомога', 'грошову допомогу'), O('consult', 'Консультація', 'консультації'), O('equip', 'Обладнання')],
          defaults: function (c) {
            var t = c.all, out = [];
            if (has(t, ['продукт', 'харч'])) out.push('food');
            if (has(t, ['гігієн'])) out.push('hygiene');
            if (has(t, ['лік', 'медик'])) out.push('meds');
            if (has(t, ['грош', 'виплат', 'фінансов'])) out.push('cash');
            if (has(t, ['консульт', 'юрид', 'психолог'])) out.push('consult');
            if (has(t, ['обладнан', 'техні'])) out.push('equip');
            return out.length ? out : ['food', 'hygiene'];
          },
          reason: function (c) { return 'Найчастіше в програмах допомоги громади — продуктові й гігієнічні набори.'; } },
        { id: 'count', kind: 'single', short: 'Скільки людей', q: 'Скільки людей *очікуєте*?', options: COUNTS,
          defaults: function () { return ['m']; }, reason: function () { return 'Для програми однієї громади найчастіше 100–500 людей.'; } },
        { id: 'proof', kind: 'multi', short: 'Як перевіряємо', q: 'Як перевіряємо, що людина має *право*?', hint: 'Людина сфотографує ці документи у формі. Можна кілька.', options: AID_PROOF,
          defaults: function (c) {
            var out = ['id'];
            sel(c, 'who').forEach(function (w) { if (WHO_TO_PROOF[w]) out.push(WHO_TO_PROOF[w]); });
            return out;
          },
          reason: function () { return 'Підібрали документи до тих, хто отримує допомогу.'; } },
        { id: 'delivery', kind: 'multi', short: 'Як отримують', q: 'Як люди *отримують* допомогу?',
          options: [O('point', 'Видача в пункті'), O('home', 'Доставка додому'), O('card', 'Переказ на картку')],
          defaults: function (c) {
            var w = sel(c, 'what'), who = sel(c, 'who'), out = [];
            if (w.some(function (x) { return x !== 'cash' && x !== 'consult'; })) out.push('point');
            if (who.indexOf('elder') > -1 || who.indexOf('disab') > -1) { if (out.length) out.push('home'); }
            if (w.indexOf('cash') > -1) out.push('card');
            return out.length ? out : ['point'];
          },
          reason: function (c) {
            var who = sel(c, 'who');
            return who.indexOf('elder') > -1 || who.indexOf('disab') > -1 ? 'Літнім людям і людям з інвалідністю зручніше з доставкою додому.' : '';
          } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return 'Програма «' + c.title + '» надає ' + list(c, 'what') + ' для ' + list(c, 'who') + '. ' +
          'Очікуємо ' + list(c, 'count') + ' людей. Право на допомогу людина підтверджує документами: ' + list(c, 'proof') + '. ' +
          'Отримати допомогу можна так: ' + list(c, 'delivery', 'або') + '.';
      },
      schema: function (c) {
        var del = sel(c, 'delivery');
        return [
          step('Про вас', [F('ПІБ', 'text'), F('Телефон', 'phone'), F('Населений пункт', 'text')]),
          step('Ваша ситуація', [
            F('Категорія', 'choice', { options: labels(c, 'who'), multi: true }),
            F('Кількість членів родини', 'choice', { options: ['1', '2', '3', '4', '5 і більше'] })
          ].concat(sel(c, 'what').length > 1 ? [F('Яка допомога потрібна', 'choice', { options: labels(c, 'what'), multi: true })] : [])),
          step('Документи', proofFields(c, 'proof', AID_PROOF)),
          step('Як отримати допомогу', [F('Спосіб отримання', 'choice', { options: labels(c, 'delivery') })]
            .concat(del.indexOf('home') > -1 ? [F('Адреса доставки', 'text', { req: false, hint: 'Якщо обрали доставку додому.' })] : [])
            .concat(del.indexOf('card') > -1 ? [F('Номер картки або IBAN', 'text', { req: false, hint: 'Якщо обрали переказ на картку.' })] : [])),
          confirmStep()
        ];
      },
      outputs: ['Заявка у PDF з підписом', 'Таблиця всіх заявок (.xlsx)', 'Повідомлення людині про статус'],
      faq: [
        ['Що, якщо в людини немає документа?', 'Поле можна зробити необов’язковим, тоді заявку перевірить координатор вручну. Людина побачить, що документ можна донести пізніше.'],
        ['Чи можна подати з телефона?', 'Так, форма зроблена під телефон: фото документів знімаються камерою, підпис ставиться пальцем.'],
        ['Хто бачить дані?', 'Лише працівники, яким ви дали доступ. У прототипі дані взагалі не залишають браузер.'],
        ['Що, якщо людина літня й не користується смартфоном?', 'Заявку може заповнити родич або працівник пункту видачі з її телефона чи свого.'],
        ['Як людина дізнається про рішення?', 'Статус приходить повідомленням на телефон, указаний у формі.']
      ]
    },

    grant: {
      name: 'конкурс грантів', acc: 'конкурс грантів', intro: 'Схоже, це конкурс грантів. Візьмемо правила з вашого попереднього конкурсу.', ref: 'ГР', color: 'teal',
      questions: [
        { id: 'who', kind: 'multi', short: 'Хто подається', q: 'Хто може *подаватися*?', hint: 'Можна кілька.',
          options: [O('micro', 'Мікробізнес і ФОП', 'мікробізнес і ФОП'), O('house', 'Домогосподарства громади'), O('idp', 'ВПО', 'ВПО'), O('vets', 'Ветерани та їхні родини'),
            O('disab', 'Люди з інвалідністю'), O('ngo', 'Громадські організації')],
          defaults: function (c) {
            var t = c.all;
            if (has(t, ['організац', 'го ', 'ініціатив'])) return ['ngo'];
            return ['micro', 'house', 'idp'];
          },
          reason: function () { return 'Як у вашому конкурсі мікрогрантів: домогосподарства громади з мікробізнесом, зокрема ВПО.'; } },
        { id: 'sum', kind: 'amount', short: 'Максимальна сума', q: 'Яка *максимальна* сума гранту?', unit: 'грн',
          value: function () { return '59000'; }, quick: ['30000', '59000', '100000'],
          reason: function () { return 'З вашого попереднього конкурсу: до 59 000 грн.'; } },
        { id: 'stages', kind: 'multi', short: 'Етапи', q: 'Які *етапи* пройде учасник?', hint: 'Усі етапи з минулого конкурсу вже позначені.',
          options: [O('apply', 'Заявка'), O('verify', 'Перевірка візитом або відео'), O('idea', 'Бізнес-ідея з кошторисом'), O('committee', 'Рішення комітету'),
            O('docs', 'Документи переможців'), O('report', 'Звіт про використання гранту')],
          defaults: function () { return ['apply', 'verify', 'idea', 'committee', 'docs']; },
          reason: function () { return 'Так був побудований ваш конкурс мікрогрантів.'; } },
        { id: 'rules', kind: 'multi', short: 'Правила кошторису', q: 'Які *правила* кошторису?',
          options: [O('8020', '80 % — обладнання, до 20 % — матеріали й послуги'), O('new', 'Тільки нове обладнання, у наявності в Україні'),
            O('link', 'Конкретна модель, пряме посилання й ціна'), O('own', 'Власний внесок — за бажанням')],
          defaults: function () { return ['8020', 'new', 'link']; },
          reason: function () { return 'З інструкції до кошторису минулого конкурсу.'; } },
        { id: 'deadline', kind: 'single', short: 'Прийом заявок', q: 'До коли *приймаємо* заявки?', options: function (c) { return deadlineOptions(c.now); },
          defaults: function () { return ['d30']; }, reason: function () { return 'Минулого разу на презентацію й кошторис був приблизно місяць.'; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return 'Конкурс «' + c.title + '» для таких учасників: ' + list(c, 'who') + '. Грант — до ' + fmtNum(val(c, 'sum')) + ' грн. ' +
          'Етапи: ' + list(c, 'stages') + '. Правила кошторису: ' + labels(c, 'rules').map(lcFirst).join('; ') + '. Заявки приймаємо до ' + list(c, 'deadline') + '.';
      },
      schema: function (c) {
        var st = sel(c, 'stages'), max = fmtNum(val(c, 'sum'));
        var steps = [step('Про вас', [F('ПІБ', 'text'), F('Телефон', 'phone'), F('Громада й населений пункт', 'text'),
          F('Хто ви', 'choice', { options: labels(c, 'who') })])];
        var idea = [F('Назва бізнес-ідеї', 'text', { hint: 'Не «Розвиток бізнесу», а «Розширення виробництва домашньої випічки».' }), F('Опис бізнес-ідеї', 'text', { hint: 'Що пропонуєте, кому, що зміниться завдяки гранту.' }),
          F('Сума гранту', 'amount', { hint: 'До ' + max + ' грн.' })];
        if (sel(c, 'rules').indexOf('own') > -1) idea.push(F('Власний внесок', 'amount', { req: false }));
        steps.push(step('Бізнес-ідея', idea));
        if (st.indexOf('verify') > -1) steps.push(step('Перевірка', [F('Формат перевірки', 'choice', { options: ['Візит на місце', 'Відеовізитівка'] }), F('Зручна дата візиту', 'date', { req: false })]));
        if (st.indexOf('docs') > -1) steps.push(step('Документи', [F('Паспорт або ID-картка', 'photo', { guide: 'card' }), F('Довідка про РНОКПП (ІПН)', 'photo', { guide: 'ipn' }),
          F('Довідка з банку про IBAN', 'photo', { guide: 'bank', hint: 'Сформуйте в застосунку банку. Набраний вручну IBAN не приймається.' })]));
        steps.push(confirmStep());
        return steps.slice(0, 5);
      },
      outputs: ['Презентація .pptx за шаблоном', 'Кошторис .xlsx з перевірками 59 000 і 80/20', 'Пакет документів переможця'],
      faq: [
        ['Що, якщо в учасника немає комп’ютера?', 'Уся форма працює на телефоні, презентація й кошторис формуються з неї самі.'],
        ['Як перевіряються суми?', 'Під час заповнення: максимальна сума, частка обладнання, збіг сум у презентації й кошторисі.'],
        ['Куди учасник надсилає файли?', 'Нікуди: кнопка «Подати» замінює лист, файли одразу потрапляють до організатора.'],
        ['Хто бачить заявки?', 'Координатори програми й члени комітету, яким ви дали доступ.'],
        ['Чи можна змінити правила під інший конкурс?', 'Так, правила й етапи — це відповіді на питання вище; змініть їх, і форма зміниться.']
      ]
    },

    membership: {
      name: 'вступ до організації', acc: 'вступ до організації', intro: 'Схоже, це вступ до організації. Візьмемо основу із заяви на вступ.', ref: 'ЧЛ', color: 'coral',
      questions: [
        { id: 'who', kind: 'multi', short: 'Хто може вступити', q: 'Хто може *вступити*?',
          options: [O('adult', 'Повнолітні громадяни України'), O('local', 'Мешканці громади'), O('idp', 'ВПО', 'ВПО'), O('students', 'Студенти з 16 років'), O('foreign', 'Іноземці з посвідкою')],
          defaults: function () { return ['adult']; }, reason: function () { return 'Так записано у вашому статуті.'; } },
        { id: 'collect', kind: 'multi', short: 'Що збираємо', q: 'Що потрібно від *людини*?',
          options: [O('anketa', 'Анкета з контактами'), O('passport', 'Фото паспорта'), O('ipn', 'Фото ІПН'), O('photo', 'Фото для посвідчення'), O('statute', 'Згода зі статутом')],
          defaults: function () { return ['anketa', 'passport', 'ipn', 'statute']; }, reason: function () { return 'Як у вашій заяві на вступ з одного телефона.'; } },
        { id: 'fee', kind: 'single', short: 'Внесок', q: 'Чи є членський *внесок*?',
          options: [O('none', 'Без внеску'), O('year', 'Щорічний внесок'), O('month', 'Щомісячний внесок')],
          defaults: function () { return ['none']; }, reason: function () { return 'У статуті внесок не передбачено.'; } },
        { id: 'decide', kind: 'single', short: 'Хто вирішує', q: 'Хто *ухвалює* рішення про вступ?',
          options: [O('board', 'Правління'), O('head', 'Голова організації'), O('meeting', 'Загальні збори')],
          defaults: function () { return ['board']; }, reason: function () { return 'Так записано у вашому статуті.'; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return '«' + c.title + '»: заява на вступ з телефона. Вступити можуть: ' + list(c, 'who') + '. Від людини потрібні: ' + list(c, 'collect') + '. ' +
          'Внесок: ' + list(c, 'fee') + '. Рішення ухвалює ' + list(c, 'decide') + '.';
      },
      schema: function (c) {
        var col = sel(c, 'collect'), docs = [];
        if (col.indexOf('passport') > -1) docs.push(F('Паспорт або ID-картка', 'photo', { guide: 'card' }));
        if (col.indexOf('ipn') > -1) docs.push(F('Картка ІПН (РНОКПП)', 'photo', { guide: 'ipn' }));
        if (col.indexOf('photo') > -1) docs.push(F('Фото для посвідчення', 'photo', { guide: 'portrait', hint: 'Обличчя на світлому тлі, без головного убору.' }));
        var steps = [step('Про вас', [F('ПІБ', 'text'), F('Дата народження', 'date'), F('Телефон', 'phone'), F('Населений пункт', 'text')])];
        if (col.indexOf('anketa') > -1) steps.push(step('Анкета', [F('Освіта', 'text', { req: false }), F('Чим хочете допомагати організації', 'text', { req: false })]));
        if (docs.length) steps.push(step('Документи', docs));
        var conf = confirmStep();
        if (col.indexOf('statute') > -1) conf.fields.unshift(F('Ознайомлений(-а) зі статутом і погоджуюся з ним', 'consent'));
        steps.push(conf);
        return steps;
      },
      outputs: ['Заява й анкета у PDF з підписом', 'Фото документів одним пакетом', 'Список нових членів для правління'],
      faq: [
        ['Чи можна вступити без принтера?', 'Так: заява формується з полів, підпис ставиться пальцем на екрані.'],
        ['Що, якщо фото документа нечітке?', 'Біля кожного поля є схема правильного знімка; поганий знімок можна переробити одразу.'],
        ['Хто бачить дані?', 'Лише правління й секретар організації.'],
        ['Скільки часу займає заява?', 'Кілька хвилин, якщо документи під рукою.']
      ]
    },

    event: {
      name: 'реєстрація на захід', acc: 'реєстрацію на захід', intro: 'Схоже, це реєстрація на захід. Уточнимо формат і учасників.', ref: 'ЗХ', color: 'pink',
      questions: [
        { id: 'format', kind: 'single', short: 'Формат', q: 'Який це *формат*?',
          options: [O('camp', 'Табір'), O('course', 'Навчання або курс'), O('training', 'Тренінг'), O('day', 'Захід на один день')],
          defaults: function (c) {
            var t = c.all;
            if (has(t, ['табір', 'табор'])) return ['camp'];
            if (has(t, ['навчанн', 'курс'])) return ['course'];
            if (has(t, ['тренінг', 'семінар', 'майстер'])) return ['training'];
            return ['day'];
          } },
        { id: 'who', kind: 'multi', short: 'Учасники', q: 'Хто *бере участь*?',
          options: [O('kids', 'Діти 7–12 років'), O('teens', 'Підлітки 13–17 років'), O('adults', 'Дорослі'), O('families', 'Батьки з дітьми'), O('idp', 'ВПО', 'ВПО')],
          defaults: function (c) { return has(c.all, ['дит', 'діт', 'школяр']) ? ['kids', 'teens'] : ['adults']; },
          reason: function (c) { return has(c.all, ['дит', 'діт', 'школяр']) ? 'Йдеться про дітей — форму заповнюватимуть батьки.' : ''; } },
        { id: 'places', kind: 'single', short: 'Місць', q: 'Скільки *місць*?',
          options: [O('20', 'до 20'), O('50', '20–50'), O('100', '50–100'), O('more', 'понад 100')],
          defaults: function (c) { return sel(c, 'format').indexOf('day') > -1 ? ['100'] : ['50']; } },
        { id: 'collect', kind: 'multi', short: 'Що збираємо', q: 'Що потрібно від *учасника*?',
          options: [O('consent', 'Згода батьків'), O('birth', 'Свідоцтво про народження'), O('med', 'Медична довідка'), O('diet', 'Алергії й харчування'), O('exp', 'Досвід та очікування'), O('contacts', 'Контакти для зв’язку')],
          defaults: function (c) {
            var who = sel(c, 'who'), kids = who.indexOf('kids') > -1 || who.indexOf('teens') > -1;
            if (kids) return sel(c, 'format').indexOf('camp') > -1 ? ['consent', 'birth', 'med', 'diet'] : ['consent', 'contacts'];
            return ['contacts', 'exp'];
          },
          reason: function (c) { return sel(c, 'format').indexOf('camp') > -1 ? 'Для табору з дітьми зазвичай потрібні згода батьків і медична довідка.' : ''; } },
        { id: 'deadline', kind: 'single', short: 'Реєстрація до', q: 'До коли *реєстрація*?', options: function (c) { return deadlineOptions(c.now); },
          defaults: function () { return ['d21']; }, reason: function () { return 'Три тижні — щоб устигнути зібрати документи.'; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return '«' + c.title + '» — ' + list(c, 'format') + ' для таких учасників: ' + list(c, 'who') + '. Місць: ' + list(c, 'places') + '. ' +
          'Від учасника потрібні: ' + list(c, 'collect') + '. Реєстрація до ' + list(c, 'deadline') + '.';
      },
      schema: function (c) {
        var who = sel(c, 'who'), col = sel(c, 'collect'), kids = who.indexOf('kids') > -1 || who.indexOf('teens') > -1;
        var steps = [];
        if (kids) {
          steps.push(step('Про дитину', [F('ПІБ дитини', 'text'), F('Дата народження', 'date'), F('Вікова група', 'choice', { options: labels(c, 'who') })]));
          steps.push(step('Про батьків', [F('ПІБ одного з батьків', 'text'), F('Телефон', 'phone')]));
        } else {
          steps.push(step('Про вас', [F('ПІБ', 'text'), F('Телефон', 'phone'), F('Населений пункт', 'text')]));
          steps.push(step('Участь', (col.indexOf('exp') > -1 ? [F('Досвід та очікування', 'text', { req: false })] : [])
            .concat([F('Чи потрібна допомога з доступністю', 'choice', { options: ['Так', 'Ні'], req: false })])));
        }
        var docs = [];
        if (col.indexOf('birth') > -1) docs.push(F('Свідоцтво про народження', 'photo', { guide: 'cert' }));
        if (col.indexOf('med') > -1) docs.push(F('Медична довідка', 'photo', { guide: 'cert' }));
        if (col.indexOf('diet') > -1) docs.push(F('Алергії й особливості харчування', 'text', { req: false }));
        if (docs.length) steps.push(step('Документи й здоров’я', docs));
        var conf = confirmStep();
        if (col.indexOf('consent') > -1) conf.fields.unshift(F('Я один з батьків або законний представник і погоджуюся на участь дитини', 'consent'));
        steps.push(conf);
        return steps;
      },
      outputs: ['Список учасників (.xlsx)', 'Згоди батьків у PDF з підписом', 'Нагадування учасникам перед стартом'],
      faq: [
        ['Що, якщо місця закінчилися?', 'Нові заявки йдуть у список очікування, людина бачить це одразу.'],
        ['Чи можна подати з телефона?', 'Так, усі документи фотографуються камерою, підпис — пальцем.'],
        ['Хто бачить дані дітей?', 'Лише організатори заходу, яким ви дали доступ.'],
        ['Як змінити дату або скасувати участь?', 'Через те саме посилання: людина бачить свою заявку й може її змінити.']
      ]
    },

    volunteers: {
      name: 'набір волонтерів', acc: 'набір волонтерів', intro: 'Схоже, це набір волонтерів. Уточнимо, кого шукаєте.', ref: 'ВЛ', color: 'violet',
      questions: [
        { id: 'dirs', kind: 'multi', short: 'Напрями', q: 'У яких *напрямах* потрібна допомога?',
          options: [O('aid', 'Видача допомоги'), O('logistics', 'Логістика й доставка'), O('kids', 'Робота з дітьми'), O('online', 'Онлайн-підтримка'), O('events', 'Події та заходи')],
          defaults: function () { return ['aid', 'logistics']; }, reason: function () { return 'Там найбільше роботи у ваших поточних проєктах.'; } },
        { id: 'req', kind: 'multi', short: 'Вимоги', q: 'Які *вимоги* до волонтера?',
          options: [O('adult', 'Від 18 років'), O('noexp', 'Досвід не потрібен — навчимо'), O('car', 'Власне авто'), O('record', 'Довідка про несудимість')],
          defaults: function (c) { var d = sel(c, 'dirs'), out = ['adult', 'noexp']; if (d.indexOf('kids') > -1) out.push('record'); if (d.indexOf('logistics') > -1) out.push('car'); return out; },
          reason: function (c) {
            var d = sel(c, 'dirs');
            return d.indexOf('kids') > -1 ? 'Для роботи з дітьми зазвичай потрібна довідка про несудимість.' : d.indexOf('logistics') > -1 ? 'Для логістики й доставки потрібне власне авто.' : '';
          } },
        { id: 'time', kind: 'single', short: 'Час', q: 'Скільки *часу* очікуєте?',
          options: [O('week', 'Кілька годин на тиждень'), O('weekend', 'Вихідні'), O('once', 'Разово на події')],
          defaults: function () { return ['week']; } },
        { id: 'count', kind: 'single', short: 'Скільки людей', q: 'Скільки волонтерів *шукаєте*?',
          options: [O('10', 'до 10'), O('30', '10–30'), O('100', '30–100'), O('more', 'понад 100')],
          defaults: function () { return ['30']; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return '«' + c.title + '»: шукаємо ' + list(c, 'count') + ' волонтерів. Напрями: ' + list(c, 'dirs') + '. Вимоги: ' + list(c, 'req') + '. Час: ' + list(c, 'time') + '.';
      },
      schema: function (c) {
        var req = sel(c, 'req');
        var steps = [step('Про вас', [F('ПІБ', 'text'), F('Телефон', 'phone'), F('Населений пункт', 'text')].concat(req.indexOf('adult') > -1 ? [F('Дата народження', 'date')] : [])),
          step('Як хочете допомагати', [F('Напрям', 'choice', { options: labels(c, 'dirs'), multi: true }), F('Коли можете', 'choice', { options: ['Будні', 'Вихідні', 'Вечори', 'Разово'], multi: true }),
            F('Досвід', 'text', { req: false })].concat(req.indexOf('car') > -1 ? [F('Чи є власне авто', 'choice', { options: ['Так', 'Ні'] })] : []))];
        if (req.indexOf('record') > -1) steps.push(step('Документи', [F('Довідка про несудимість', 'photo', { guide: 'cert' })]));
        steps.push(confirmStep());
        return steps;
      },
      outputs: ['Таблиця волонтерів за напрямами (.xlsx)', 'Повідомлення волонтеру про перший крок', 'Розклад чергувань'],
      faq: [
        ['Що, якщо в людини немає досвіду?', 'Вона позначає це у формі, а координатор запрошує її на вступну зустріч.'],
        ['Чи можна волонтерити разово?', 'Так, це один із варіантів у питанні «Коли можете».'],
        ['Хто бачить дані волонтерів?', 'Координатори напрямів, яким ви дали доступ.'],
        ['Як волонтер дізнається, куди прийти?', 'Повідомленням на телефон з формою.']
      ]
    },

    sponsorship: {
      name: 'пошук патронів і збір коштів', acc: 'пошук патронів і збір коштів', intro: 'Схоже, це пошук патронів і збір коштів. Візьмемо підхід з постерів для кожної дитини.', ref: 'ПТ', color: 'pink',
      questions: [
        { id: 'for', kind: 'single', short: 'Для кого', q: 'Для *кого* шукаєте підтримку?',
          options: [O('kids', 'Для конкретних дітей'), O('families', 'Для родин'), O('programme', 'Для програми організації')],
          defaults: function (c) { var t = c.all; return has(t, ['дит', 'діт']) ? ['kids'] : has(t, ['роди']) ? ['families'] : ['programme']; } },
        { id: 'how', kind: 'multi', short: 'Як допомогти', q: 'Як людина може *допомогти*?',
          options: [O('monthly', 'Щомісячний внесок'), O('once', 'Разовий донат'), O('thing', 'Купити конкретну річ'), O('patron', 'Стати патроном дитини')],
          defaults: function (c) { return sel(c, 'for').indexOf('kids') > -1 ? ['monthly', 'patron'] : ['monthly', 'once']; } },
        { id: 'goal', kind: 'amount', short: 'Ціль збору', q: 'Яка *ціль* збору на місяць?', unit: 'грн',
          value: function (c) { return sel(c, 'for').indexOf('kids') > -1 ? '9000' : '30000'; }, quick: ['9000', '30000', '100000'],
          reason: function (c) { return sel(c, 'for').indexOf('kids') > -1 ? 'У постерах для кожної дитини ціль рахується з місячних потреб однієї дитини.' : 'Оцінка місяця роботи програми; змініть під свій кошторис.'; } },
        { id: 'report', kind: 'multi', short: 'Звітність', q: 'Як *звітуєте* донорам?',
          options: [O('photo', 'Фото й короткий звіт щомісяця'), O('receipts', 'Чеки й рахунки'), O('thanks', 'Подяка від родини')],
          defaults: function () { return ['photo', 'receipts']; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return '«' + c.title + '»: шукаємо підтримку ' + lcFirst(list(c, 'for')) + '. Допомогти можна так: ' + list(c, 'how', 'або') + '. Ціль — ' + fmtNum(val(c, 'goal')) + ' грн на місяць. Звітуємо так: ' + list(c, 'report') + '.';
      },
      schema: function (c) {
        return [step('Про вас', [F('Ім’я', 'text'), F('Телефон', 'phone'), F('Електронна пошта', 'text', { req: false })]),
          step('Ваша допомога', [F('Як хочете допомогти', 'choice', { options: labels(c, 'how') }), F('Сума', 'amount', { req: false, hint: 'Ціль збору — ' + fmtNum(val(c, 'goal')) + ' грн на місяць.' })]),
          step('Підтвердження', [F('Згода на обробку персональних даних', 'consent'), F('Хочу отримувати звіти', 'choice', { options: labels(c, 'report'), multi: true, req: false })])];
      },
      outputs: ['Постер і сторіз для збору', 'Список патронів і внесків (.xlsx)', 'Щомісячний звіт донору'],
      faq: [
        ['Чи бачить донор дані дитини?', 'Лише ім’я, вік і потреби, як на постері; документи й адреси — ні.'],
        ['Чи можна допомогти без реєстрації?', 'Так, достатньо імені й телефона.'],
        ['Як донор дізнається, на що пішли гроші?', 'Отримує звіт у тому форматі, який ви обрали.'],
        ['Що, якщо донор хоче припинити внесок?', 'Пише за тим самим посиланням, координатор бачить це в списку.']
      ]
    },

    generic: {
      name: 'новий проєкт', intro: 'Не впізнали тип проєкту, тож поставимо кілька загальних питань.', ref: 'ЗА', color: 'violet',
      questions: [
        { id: 'who', kind: 'single', short: 'Хто заповнює', q: 'Хто *заповнює* форму?',
          options: [O('anyone', 'Будь-хто з громади'), O('clients', 'Учасники наших програм'), O('partners', 'Партнери й організації'), O('staff', 'Наші працівники')],
          defaults: function (c) {
            var t = c.ctx;
            if (has(t, ['працівник', 'співробітник', 'персонал'])) return ['staff'];
            if (has(t, ['партнер', 'організаці'])) return ['partners'];
            if (has(t, ['учасник', 'наших програм', 'клієнт'])) return ['clients'];
            return ['anyone'];
          },
          reason: function (c) { return c.ctx && c.ctx !== '' && W_who(c) ? 'Підказано з вашого опису.' : ''; } },
        { id: 'collect', kind: 'multi', short: 'Що збираємо', q: 'Що потрібно від *людини*?',
          options: [O('contacts', 'Контакти'), O('situation', 'Опис ситуації або запиту'), O('id', 'Фото документа'), O('date', 'Дата'), O('sign', 'Підпис')],
          defaults: function (c) {
            var t = c.ctx;
            if (!t) return ['contacts', 'situation', 'sign'];
            var out = ['contacts'];
            if (has(t, ['ситуац', 'запит', 'потреб', 'опис', 'проблем']) || !has(t, ['документ', 'посвідч', 'довідк', 'паспорт'])) out.push('situation');
            if (has(t, ['документ', 'посвідч', 'довідк', 'паспорт', 'фото'])) out.push('id');
            if (has(t, ['дата', 'строк', 'термін', 'дедлайн'])) out.push('date');
            if (has(t, ['згод', 'заяв', 'підпис'])) out.push('sign');
            return out;
          },
          reason: function (c) {
            if (!c.ctx) return 'Мінімум, з якого починалися ваші попередні проєкти.';
            var m = [];
            if (has(c.ctx, ['документ', 'посвідч', 'довідк', 'паспорт', 'фото'])) m.push('документи');
            if (has(c.ctx, ['дата', 'строк', 'термін', 'дедлайн'])) m.push('строки');
            if (has(c.ctx, ['згод', 'заяв', 'підпис'])) m.push('згоду або заяву');
            return m.length ? 'З вашого опису: згадано ' + joinList(m) + '.' : 'Підказано з вашого опису.';
          } },
        { id: 'count', kind: 'single', short: 'Скільки людей', q: 'Скільки людей *очікуєте*?', options: COUNTS,
          defaults: function (c) { var n = peopleCount(c.ctx); return [n == null ? 's' : n < 100 ? 's' : n <= 500 ? 'm' : n <= 2000 ? 'l' : 'xl']; },
          reason: function (c) {
            var m = String(c.ctx || '').match(/(\d[\d\s\u00a0]{0,6})\s*(людей|люди|осіб|особи|учасник\S*|родин\S*|сім\S*|дітей|заяв\S*|домогосподар\S*|пенсіонер\S*|ветеран\S*)/);
            return m ? 'З вашого опису: ' + fmtNum(m[1].replace(/\D/g, '')) + ' ' + m[2] + '.' : '';
          } },
        { id: 'after', kind: 'multi', short: 'Що далі', q: 'Що має статися *після* подання?',
          options: [O('status', 'Повідомити людину про статус'), O('table', 'Додати в таблицю всіх заявок'), O('pdf', 'Зберегти PDF з підписом')],
          defaults: function (c) { var out = ['status', 'table']; if (sel(c, 'collect').indexOf('sign') > -1) out.push('pdf'); return out; } },
        { id: 'desc', kind: 'text', short: 'Опис', q: 'Короткий *опис*', hint: 'Ми підготували опис з ваших відповідей. Виправте, якщо щось не так.' }
      ],
      describe: function (c) {
        return '«' + c.title + '»: форму заповнює ' + lcFirst(list(c, 'who')) + ', очікуємо ' + list(c, 'count') + ' людей. Від людини потрібні: ' + list(c, 'collect') + '. Після подання: ' + list(c, 'after') + '.';
      },
      schema: function (c) {
        var col = sel(c, 'collect');
        var steps = [step('Про вас', [F('ПІБ', 'text')].concat(col.indexOf('contacts') > -1 ? [F('Телефон', 'phone'), F('Населений пункт', 'text', { req: false })] : []))];
        var det = [];
        if (col.indexOf('situation') > -1) det.push(F('Опишіть ситуацію або запит', 'text'));
        if (col.indexOf('date') > -1) det.push(F('Дата', 'date'));
        if (col.indexOf('id') > -1) det.push(F('Паспорт або ID-картка', 'photo', { guide: 'card' }));
        others(c, 'collect').forEach(function (t) { det.push(F(t, 'text')); });
        if (!det.length) det.push(F('Коментар', 'text', { req: false }));
        steps.push(step('Деталі', det));
        var conf = confirmStep();
        if (col.indexOf('sign') < 0) conf.fields = conf.fields.filter(function (f) { return f.type !== 'signature'; });
        steps.push(conf);
        return steps;
      },
      outputs: function (c) {
        var map = { status: 'Повідомлення людині про статус', table: 'Таблиця всіх заявок (.xlsx)', pdf: 'Заявка у PDF з підписом' };
        var out = sel(c, 'after').map(function (v) { return map[v]; }).filter(Boolean);
        return out.length ? out : ['Таблиця всіх заявок (.xlsx)'];
      },
      faq: [
        ['Чи можна подати з телефона?', 'Так, форма зроблена під телефон.'],
        ['Хто бачить дані?', 'Лише працівники, яким ви дали доступ. У прототипі дані не залишають браузер.'],
        ['Що, якщо людина помилилася?', 'Вона відкриває заявку за тим самим посиланням і виправляє.'],
        ['Чи можна додати поле пізніше?', 'Так: «+ Додати поле» в будь-якому кроці, прототип оновиться.']
      ]
    }
  };

  /* ───────────── context access ───────────── */
  function qOf(c, id) { return TYPES[c.type].questions.filter(function (q) { return q.id === id; })[0]; }
  function optionsOf(q, c) { return typeof q.options === 'function' ? q.options(c) : (q.options || []); }
  function sel(c, id) { var a = c.answers[id]; return a && a.sel ? a.sel : []; }
  function others(c, id) { var a = c.answers[id]; return a && a.otherOn && a.other && a.other.trim() ? [a.other.trim()] : []; }
  function val(c, id) { var a = c.answers[id]; return a && a.value != null ? a.value : ''; }
  /* labels of the chosen options (+ the "other" text) for a question */
  function labels(c, id) {
    var q = qOf(c, id), opts = optionsOf(q, c);
    return sel(c, id).map(function (v) { var o = opts.filter(function (x) { return x.v === v; })[0]; return o ? o.t : null; }).filter(Boolean).concat(others(c, id));
  }
  /* the same, in the form used inside a sentence */
  function list(c, id, last) {
    var q = qOf(c, id), opts = optionsOf(q, c);
    var parts = sel(c, id).map(function (v) {
      var o = opts.filter(function (x) { return x.v === v; })[0];
      return o ? (o.d != null ? o.d : lcFirst(o.t)) : null;
    }).filter(Boolean).concat(others(c, id).map(lcFirst));
    return joinList(parts, last);
  }

  /* the default answer for a question, given the answers so far */
  function defaultAnswer(q, c) {
    if (q.kind === 'text') return { value: TYPES[c.type].describe(c), auto: true };
    if (q.kind === 'amount') return { value: q.value(c), auto: true };
    return { sel: q.defaults ? q.defaults(c).slice() : [], other: '', otherOn: false, auto: true };
  }
  function reasonFor(q, c) { return q.reason ? q.reason(c) : ''; }
  function isAnswered(q, a) {
    if (!a) return false;
    if (q.kind === 'text') return !!String(a.value || '').trim();
    if (q.kind === 'amount') return +String(a.value || '').replace(/\s/g, '') > 0;
    return (a.sel && a.sel.length > 0) || !!(a.otherOn && String(a.other || '').trim());
  }
  /* short text for the summary row */
  function answerText(q, c) {
    if (q.id === 'title') return c.title;
    if (q.kind === 'context') return '';
    var a = c.answers[q.id];
    if (!a) return '—';
    if (q.kind === 'text') return a.value;
    if (q.kind === 'amount') return 'до ' + fmtNum(String(a.value).replace(/\s/g, '')) + ' ' + (q.unit || '');
    var opts = optionsOf(q, c);
    return sel(c, q.id).map(function (v) { var o = opts.filter(function (x) { return x.v === v; })[0]; return o ? o.t + (o.sub ? ' (' + o.sub + ')' : '') : ''; })
      .filter(Boolean).concat(others(c, q.id)).map(function (x, i) { return i ? lcFirst(x) : x; }).join(', ') || '—';
  }

  /* ───────────── proposed form ───────────── */
  var fid = 0;
  function F(label, type, opt) {
    opt = opt || {};
    fid++;
    var f = { id: 'f' + fid, label: label, type: type, req: opt.req !== false };
    if (opt.options) f.options = opt.options.slice();
    if (opt.multi) f.multi = true;
    if (opt.hint) f.hint = opt.hint;
    if (type === 'photo') { f.guide = opt.guide || 'cert'; if (!f.hint) f.hint = GUIDE_HINT[f.guide]; }
    return f;
  }
  var GUIDE_HINT = {
    card: 'Документ цілком у кадрі, видно чотири кути, без відблисків.',
    cert: 'Аркуш повністю в кадрі, текст і печатка читаються.',
    ipn: 'Номер із 10 цифр має бути чітким.',
    bank: 'Документ з банку цілком, IBAN читається.',
    portrait: 'Обличчя на світлому тлі, без головного убору.'
  };
  var PROOF_GUIDE = { id: 'card', idpCert: 'cert', disabCert: 'card', largeCert: 'card', pension: 'card', ubd: 'card', med: 'cert' };
  var PROOF_HINT = {
    id: 'Сторінка або сторона з фото, документ цілком у кадрі.',
    idpCert: 'Довідка з Дії або паперова, повністю в кадрі, номер читається.',
    disabCert: 'Розворот з фото й групою інвалідності.',
    largeCert: 'Розворот з фото й переліком дітей.',
    pension: 'Розворот з фото й номером посвідчення.',
    ubd: 'Розворот з фото, номер читається.',
    med: 'Висновок цілком, печатка й підпис лікаря видно.'
  };
  function proofFields(c, id, opts) {
    var out = sel(c, id).map(function (v) {
      var o = opts.filter(function (x) { return x.v === v; })[0];
      return o ? F(o.t, 'photo', { guide: PROOF_GUIDE[v], hint: PROOF_HINT[v] }) : null;
    }).filter(Boolean);
    others(c, id).forEach(function (t) { out.push(F(t, 'photo', { guide: 'cert' })); });
    return out.length ? out : [F('Документ', 'photo', { guide: 'cert' })];
  }
  var sid = 0;
  function step(title, fields) { sid++; return { id: 's' + sid, title: title, fields: fields }; }
  function confirmStep() { return step('Підтвердження', [F('Згода на обробку персональних даних', 'consent'), F('Підпис', 'signature')]); }

  function context(d, now) {
    var ctxt = contextText(d.context);
    return { title: d.title, type: d.type, answers: d.answers || {}, now: now, ctx: ctxt, all: norm(d.title + ' ' + ctxt) };
  }
  /* the screens of a draft: the title; the context screen (documents + links for every type, plus a short description
     when the model did not recognise the title); then the questions of the type. */
  function flow(d) {
    if (!d.type) return [TITLE_Q];
    var list = [TITLE_Q, CONTEXT_Q], T = TYPES[d.type] || TYPES.generic, rest = T.questions;
    if (d.base === 'generic') {
      /* own description given, or the documents switched the type: no second description screen (keeps 7 screens max) */
      if ((d.context && String(d.context.text || '').trim()) || d.type !== 'generic') rest = rest.filter(function (q) { return q.kind !== 'text'; });
    }
    return list.concat(rest);
  }
  function buildSchema(d, now) {
    var c = context(d, now), T = TYPES[d.type];
    fid = 0; sid = 0;
    var steps = T.schema(c).filter(function (s) { return s.fields.length; });
    return {
      steps: steps,
      outputs: (typeof T.outputs === 'function' ? T.outputs(c) : T.outputs).slice(0, 3),
      faq: T.faq.slice(0, 6),
      seq: fid
    };
  }
  function newField(schema, label, type) {
    schema.seq = (schema.seq || 50) + 1;
    var f = { id: 'f' + schema.seq, label: label, type: type, req: true };
    if (type === 'choice') f.options = ['Так', 'Ні'];
    if (type === 'photo') { f.guide = 'cert'; f.hint = GUIDE_HINT.cert; }
    return f;
  }

  var FIELD_TYPES = [['text', 'текст'], ['phone', 'телефон'], ['choice', 'вибір'], ['photo', 'фото документа'], ['signature', 'підпис'], ['date', 'дата'], ['amount', 'сума'], ['consent', 'згода']];
  var TYPE_LABEL = {};
  FIELD_TYPES.forEach(function (t) { TYPE_LABEL[t[0]] = t[1]; });

  var API = {
    ORG: ORG, TYPES: TYPES, TITLE_Q: TITLE_Q, FIELD_TYPES: FIELD_TYPES, TYPE_LABEL: TYPE_LABEL,
    classify: classify, context: context, flow: flow, CONTEXT_Q: CONTEXT_Q, DOC_EXT: DOC_EXT, parseLink: parseLink, MAX_LINKS: MAX_LINKS,
    keywords: keywords, recognised: recognised, classifyContext: classifyContext, contextText: contextText, peopleCount: peopleCount, optionsOf: optionsOf, defaultAnswer: defaultAnswer, reasonFor: reasonFor,
    isAnswered: isAnswered, answerText: answerText, buildSchema: buildSchema, newField: newField, fmtNum: fmtNum, norm: norm,
    questions: function (type) { return [TITLE_Q].concat(TYPES[type] ? TYPES[type].questions : []); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.WSFlow = API;
})(typeof window !== 'undefined' ? window : this);
