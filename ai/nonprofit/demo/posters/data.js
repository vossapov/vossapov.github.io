/* Synthetic data for the poster demo. Every child here is invented for the demo; no names or
   stories come from the foundation's records. Regions are oblast-level only. German texts are
   pre-translated by hand, so the demo never calls a translation service. */
(function () {
  'use strict';

  var REGIONS = [
    ['Вінницька область', 'Oblast Winnyzja'], ['Волинська область', 'Oblast Wolyn'], ['Дніпропетровська область', 'Oblast Dnipropetrowsk'],
    ['Житомирська область', 'Oblast Schytomyr'], ['Закарпатська область', 'Oblast Transkarpatien'], ['Запорізька область', 'Oblast Saporischschja'],
    ['Івано-Франківська область', 'Oblast Iwano-Frankiwsk'], ['Київська область', 'Oblast Kyjiw'], ['Кіровоградська область', 'Oblast Kirowohrad'],
    ['Львівська область', 'Oblast Lwiw'], ['Миколаївська область', 'Oblast Mykolajiw'], ['Одеська область', 'Oblast Odessa'],
    ['Полтавська область', 'Oblast Poltawa'], ['Рівненська область', 'Oblast Riwne'], ['Сумська область', 'Oblast Sumy'],
    ['Тернопільська область', 'Oblast Ternopil'], ['Харківська область', 'Oblast Charkiw'], ['Херсонська область', 'Oblast Cherson'],
    ['Хмельницька область', 'Oblast Chmelnyzkyj'], ['Черкаська область', 'Oblast Tscherkassy'], ['Чернівецька область', 'Oblast Tscherniwzi'],
    ['Чернігівська область', 'Oblast Tschernihiw']
  ];

  /* phrase table for monthly needs — the only "translation" the static demo has */
  var NEEDS = [
    ['Сенсори для моніторингу глюкози', 'Sensoren zur Glukosemessung'],
    ['Інсулін', 'Insulin'],
    ['Тест-смужки для глюкометра', 'Teststreifen für das Blutzuckermessgerät'],
    ['Голки для шприц-ручок', 'Nadeln für Insulinpens'],
    ['Пластирі для фіксації сенсора', 'Pflaster zur Sensorfixierung'],
    ['Витратні матеріали для помпи', 'Verbrauchsmaterial für die Insulinpumpe'],
    ['Ланцети', 'Lanzetten'],
    ['Спиртові серветки', 'Alkoholtupfer']
  ];

  var EXAMPLES = [
    { key: 'lina', ref_id: 'D-0101', name_ua: 'Ліна', name_de: 'Lina', age: 5, gender: 'f', region_ua: 'Полтавська область',
      story_ua: 'Ліна ходить у садочок і найбільше любить малювати котів. Діабет 1 типу в неї з чотирьох років. Сенсор допомагає мамі бачити рівень цукру вночі й не будити доньку для перевірок.',
      story_de: 'Lina geht in den Kindergarten und malt am liebsten Katzen. Typ-1-Diabetes hat sie seit ihrem vierten Lebensjahr. Der Sensor hilft der Mutter, den Blutzucker nachts zu sehen, ohne die Tochter für Messungen zu wecken.',
      items: [{ k: 0, price: 120 }, { k: 4, price: 15 }, { k: 2, price: 25 }] },
    { key: 'marko', ref_id: 'D-0102', name_ua: 'Марко', name_de: 'Marko', age: 9, gender: 'm', region_ua: 'Житомирська область',
      story_ua: 'Марко у третьому класі й тренується з футболу двічі на тиждень. Після тренувань цукор швидко падає, тому сенсор для нього — це можливість грати разом з командою без зайвого ризику.',
      story_de: 'Marko geht in die dritte Klasse und trainiert zweimal pro Woche Fußball. Nach dem Training sinkt sein Zucker schnell, deshalb bedeutet der Sensor für ihn, ohne unnötiges Risiko mit seiner Mannschaft zu spielen.',
      items: [{ k: 0, price: 120 }, { k: 1, price: 30 }, { k: 3, price: 10 }] },
    { key: 'solomiia', ref_id: 'D-0103', name_ua: 'Соломія', name_de: 'Solomija', age: 12, gender: 'f', region_ua: 'Чернігівська область',
      story_ua: 'Соломія читає по книжці на тиждень і мріє стати бібліотекаркою. Інсулін і тест-смужки родина купує щомісяця, і після переїзду цих витрат стало складно покривати самостійно.',
      story_de: 'Solomija liest jede Woche ein Buch und träumt davon, Bibliothekarin zu werden. Insulin und Teststreifen kauft die Familie jeden Monat, und nach dem Umzug ist es schwer geworden, diese Kosten allein zu tragen.',
      items: [{ k: 1, price: 35 }, { k: 2, price: 30 }, { k: 3, price: 10 }, { k: 6, price: 8 }] },
    { key: 'taras', ref_id: 'D-0104', name_ua: 'Тарас', name_de: 'Taras', age: 16, gender: 'm', region_ua: 'Вінницька область',
      story_ua: 'Тарас готується вступати на інженерну спеціальність і сам веде щоденник цукру. Сенсор дозволяє йому спокійно писати контрольні та їздити на олімпіади.',
      story_de: 'Taras bereitet sich auf ein Ingenieurstudium vor und führt sein Zuckertagebuch selbst. Der Sensor erlaubt ihm, ruhig Klassenarbeiten zu schreiben und zu Olympiaden zu fahren.',
      items: [{ k: 0, price: 120 }, { k: 4, price: 15 }] },
    { key: 'ustyna', ref_id: 'D-0105', name_ua: 'Устина', name_de: 'Ustyna', age: 15, gender: 'f', region_ua: 'Кіровоградська область',
      story_ua: 'Устина співає в шкільному хорі та допомагає молодшому братові з уроками. Вона користується помпою, і щомісяця їй потрібні витратні матеріали до неї.',
      story_de: 'Ustyna singt im Schulchor und hilft ihrem jüngeren Bruder bei den Hausaufgaben. Sie benutzt eine Insulinpumpe und braucht jeden Monat Verbrauchsmaterial dafür.',
      items: [{ k: 5, price: 90 }, { k: 2, price: 25 }, { k: 7, price: 5 }] },
    { key: 'bohdan', ref_id: 'D-0106', name_ua: 'Богдан', name_de: 'Bohdan', age: 3, gender: 'm', region_ua: 'Волинська область',
      story_ua: 'Богдану три роки, і він не розлучається з плюшевим ведмедем. Про діабет родина дізналася цієї весни. Сенсор позбавляє малого від проколів пальця кілька разів на день.',
      story_de: 'Bohdan ist drei Jahre alt und trennt sich nie von seinem Teddybären. Von dem Diabetes erfuhr die Familie in diesem Frühjahr. Der Sensor erspart dem Kleinen mehrmals täglich das Stechen in den Finger.',
      items: [{ k: 0, price: 120 }, { k: 4, price: 15 }, { k: 1, price: 30 }] }
  ];

  function regionDe(ua) {
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i][0] === ua) return REGIONS[i][1];
    return '';
  }
  function needDe(ua) {
    for (var i = 0; i < NEEDS.length; i++) if (NEEDS[i][0].toLowerCase() === String(ua).trim().toLowerCase()) return NEEDS[i][1];
    return null;
  }
  function example(key) {
    var ex = EXAMPLES.filter(function (e) { return e.key === key; })[0] || EXAMPLES[0];
    return {
      example: ex.key, ref_id: ex.ref_id, name_ua: ex.name_ua, name_de: ex.name_de, age: ex.age, gender: ex.gender,
      region_ua: ex.region_ua, region_de: regionDe(ex.region_ua),
      story_ua: ex.story_ua, story_de: ex.story_de, story_src: ex.story_ua,
      items: ex.items.map(function (i) { return { ua: NEEDS[i.k][0], de: NEEDS[i.k][1], price: String(i.price) }; }),
      amountManual: false
    };
  }

  /* Ukrainian → Latin (national transliteration standard, 2010) for the DE line of the name */
  var TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu', 'я': 'ia', '\'': '', '’': '' };
  var TR_START = { 'є': 'ye', 'ї': 'yi', 'й': 'y', 'ю': 'yu', 'я': 'ya' };
  function translit(s) {
    return String(s || '').split(/(\s+|-)/).map(function (word) {
      var out = '';
      for (var i = 0; i < word.length; i++) {
        var ch = word[i], low = ch.toLowerCase(), upper = ch !== low;
        var t = (i === 0 && TR_START[low]) ? TR_START[low] : (TR[low] !== undefined ? TR[low] : ch);
        if (low === 'г' && i > 0 && word[i - 1].toLowerCase() === 'з') t = 'gh';
        out += upper && t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
      }
      return out;
    }).join('');
  }

  window.POSTER_DATA = { REGIONS: REGIONS, NEEDS: NEEDS, EXAMPLES: EXAMPLES, example: example, regionDe: regionDe, needDe: needDe, translit: translit };
})();
