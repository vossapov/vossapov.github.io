/* "AI in my process" — editable copy for the #ai-work section (rendered by experience.js).
   ─────────────────────────────────────────────────────────────────────────────────────────
   Grounded in real project work (Tatem Blast, Sort Dash, Sweepstake, Budmarket Lux).
   Describes the method, not client results:
   - no invented metrics: `figure` values are counts of real frames, components or formats;
   - `phases` drive the swimlane (me / AI agents) and must keep the same order in both languages;
   - `proof[].phases` are 1-based phase numbers, `case` is a project id for /next/case.html;
   - `img` must be an existing project visual; `fit: 'contain'` keeps tall screens uncropped;
   - `draft: true` shows the "Draft" badge. */
window.VI_AI_COPY = {
  en: {
    draft: false,
    navLabel: 'AI in process',
    footerLabel: 'AI in my process',
    eyebrow: 'AI in my process',
    title: 'I set the direction. Agents produce. I\u00a0decide what stays.',
    badge: 'Draft / to be refined',
    lede: 'On Tatem games, Sweepstake and my own Budmarket Lux concept, AI agents work as my production team: they research, generate and build in Figma and code. Direction, selection and final approval stay with me.',
    legend: { me: 'Me — direction and decisions', ai: 'AI agents — production' },
    mapLabel: 'Where AI sits in my process',
    cycleLabel: 'Every phase runs the same loop',
    cycle: [
      { who: 'me', text: 'I set the direction' },
      { who: 'ai', text: 'Agents produce' },
      { who: 'both', text: 'Checked on screen' },
      { who: 'me', text: 'I keep, fix by hand or send back' }
    ],
    keys: { me: 'Me', ai: 'AI agents', io: '↓ brief · ↑ result' },
    phases: [
      {
        title: 'Brief & flows',
        projects: ['Tatem Blast', 'Budmarket Lux'],
        me: 'I set the scope, bring references and cut what doesn’t belong.',
        ai: 'Turn long specs into open questions, gather desk research, build editable wireframes in Figma.'
      },
      {
        title: 'Visuals & assets',
        projects: ['Tatem Blast', 'Sweepstake', 'Budmarket Lux'],
        me: 'I sketch the direction, then choose, reject or correct every round.',
        ai: 'Generate concepts and asset sets before layout: tabs, shop cards, campaign scenes.'
      },
      {
        title: 'Components & handoff',
        projects: ['Tatem Blast', 'Sort Dash', 'Sweepstake'],
        me: 'I define the rules: 1:1 export, naming, what counts as atomic, one token system.',
        ai: 'Build components and 9-slice masters, audit text and buttons, annotate specs for developers.'
      },
      {
        title: 'Prototype & review',
        projects: ['Sweepstake', 'Budmarket Lux'],
        me: 'I write prompts and redlines, run review rounds and give the final approval.',
        ai: 'Iterate screens as working code; a separate check catches overlaps, safe-area breaks and wrong values.'
      }
    ],
    proofLabel: 'Proof from real projects',
    proofHint: 'The bar under each project marks the phases it went through.',
    labels: { me: 'Me', ai: 'AI', phases: 'Phases' },
    proof: [
      {
        key: 'blastjam',
        title: 'Tatem Blast: Color Pop',
        meta: 'Tatem Games · mobile game',
        img: '/next/assets/recent/blastjam/fortune-wheel.png',
        fit: 'contain',
        figure: { value: '29 → 19', label: 'promo wireframes built → kept' },
        me: 'Kept 19 of 29 promo wireframes; sent the first handoff back as not atomic enough.',
        ai: 'Claude built frames and the UI kit in Figma, Codex generated assets. The handoff returned as 52 atomic components.',
        phases: [1, 2, 3],
        case: 'blastjam',
        link: 'Open the case'
      },
      {
        key: 'tilesort',
        title: 'Sort Dash: Enchanted',
        meta: 'Tatem Games · mobile game',
        img: '/next/assets/generated-mockups/tilesort.png',
        figure: { value: '81 → 10', label: 'button instances → types' },
        me: 'Set the kit rules for the Unity developer: 1:1 export, layer order, names that say what an element shows.',
        ai: 'Claude worked on a copy of my screens, annotated every element and audited the buttons.',
        phases: [3],
        case: 'tilesort',
        link: 'Open the case'
      },
      {
        key: 'sweep',
        title: 'Sweepstake',
        meta: 'Whimsy Games · web platform',
        img: '/next/assets/generated-mockups/sweep.png',
        figure: { value: 'Dark + Light', label: 'themes from one token system' },
        me: 'Prompts, redlines and client review rounds across many variants.',
        ai: 'Claude Code and Codex generated and iterated the player and admin screens.',
        phases: [2, 3, 4],
        case: 'sweep',
        link: 'Open the case'
      },
      {
        key: 'budmarket',
        title: 'Budmarket Lux',
        meta: 'Own concept · demo with a sample catalog',
        img: '/next/assets/projects/budmarket-lux/videos/campaign-poster.jpg',
        fit: 'contain',
        figure: { value: '5 × 4', label: 'campaign stories × formats' },
        me: 'Started from my own hypothesis and approved the style at each checkpoint.',
        ai: 'Desk research, campaign scenes generated without text, prices typeset from data, a separate QA pass.',
        phases: [1, 2, 4],
        case: 'budmarket-lux',
        link: 'Open the case'
      }
    ],
    principlesLabel: 'Rules I keep',
    principles: [
      'Direction, selection and final approval stay with me.',
      'Agents work on copies; my original screens stay the reference.',
      'Prices and product facts come from data, not from an image model.'
    ],
    toolsLabel: 'Tools I use now',
    tools: ['Figma', 'Claude', 'Codex', 'Gemini'],
    note: 'Numbers are counts of real frames, components and formats, not efficiency metrics.'
  },
  ua: {
    draft: false,
    navLabel: 'AI у процесі',
    footerLabel: 'AI у моєму процесі',
    eyebrow: 'AI у моєму процесі',
    title: 'Я задаю напрям. Агенти виконують. Я\u00a0вирішую, що лишається.',
    badge: 'Чернетка / доповнюється',
    lede: 'На іграх Tatem, Sweepstake і моєму концепті Budmarket Lux AI-агенти працюють як моя продакшн-команда: досліджують, генерують, збирають у Figma й коді. Напрям, відбір і фінальне рішення лишаються за мною.',
    legend: { me: 'Я — напрям і рішення', ai: 'AI-агенти — виконання' },
    mapLabel: 'Де AI в моєму процесі',
    cycleLabel: 'Кожна фаза — той самий цикл',
    cycle: [
      { who: 'me', text: 'Я задаю напрям' },
      { who: 'ai', text: 'Агенти виконують' },
      { who: 'both', text: 'Перевірка на екрані' },
      { who: 'me', text: 'Лишаю, правлю вручну або повертаю' }
    ],
    keys: { me: 'Я', ai: 'AI-агенти', io: '↓ задача · ↑ результат' },
    phases: [
      {
        title: 'Бриф і флоу',
        projects: ['Tatem Blast', 'Budmarket Lux'],
        me: 'Задаю рамки, даю референси й відсікаю зайве.',
        ai: 'Стискають довгі специфікації до відкритих питань, проводять desk research, будують редаговані вайрфрейми у Figma.'
      },
      {
        title: 'Візуал і асети',
        projects: ['Tatem Blast', 'Sweepstake', 'Budmarket Lux'],
        me: 'Накидаю напрям, далі обираю, відхиляю або правлю кожен раунд.',
        ai: 'Генерують концепти й набори асетів до верстки: таби, картки магазину, сцени кампанії.'
      },
      {
        title: 'Компоненти й передача',
        projects: ['Tatem Blast', 'Sort Dash', 'Sweepstake'],
        me: 'Визначаю правила: експорт 1:1, неймінг, що вважати атомарним, одна система токенів.',
        ai: 'Збирають компоненти й 9-slice мастери, проводять аудит текстів і кнопок, анотують специфікації для розробників.'
      },
      {
        title: 'Прототип і перевірка',
        projects: ['Sweepstake', 'Budmarket Lux'],
        me: 'Пишу промпти й редлайни, веду раунди рев’ю і даю фінальне схвалення.',
        ai: 'Ітерують екрани як робочий код; окрема перевірка ловить накладання, вихід за безпечні зони й хибні значення.'
      }
    ],
    proofLabel: 'Приклади з реальних проєктів',
    proofHint: 'Смужка під кожним проєктом показує, через які фази він пройшов.',
    labels: { me: 'Я', ai: 'AI', phases: 'Фази' },
    proof: [
      {
        key: 'blastjam',
        title: 'Tatem Blast: Color Pop',
        meta: 'Tatem Games · мобільна гра',
        img: '/next/assets/recent/blastjam/fortune-wheel.png',
        fit: 'contain',
        figure: { value: '29 → 19', label: 'промо-вайрфреймів зібрано → лишив' },
        me: 'Лишив 19 із 29 промо-вайрфреймів; перший хендоф повернув як недостатньо атомарний.',
        ai: 'Claude зібрав фрейми й UI-кіт у Figma, Codex згенерував асети. Хендоф повернувся як 52 атомарні компоненти.',
        phases: [1, 2, 3],
        case: 'blastjam',
        link: 'Відкрити кейс'
      },
      {
        key: 'tilesort',
        title: 'Sort Dash: Enchanted',
        meta: 'Tatem Games · мобільна гра',
        img: '/next/assets/generated-mockups/tilesort.png',
        figure: { value: '81 → 10', label: 'кнопок у макетах → типів' },
        me: 'Задав правила кіту для Unity-розробника: експорт 1:1, порядок шарів, назви за тим, що показує елемент.',
        ai: 'Claude працював на копії моїх екранів, анотував кожен елемент і провів аудит кнопок.',
        phases: [3],
        case: 'tilesort',
        link: 'Відкрити кейс'
      },
      {
        key: 'sweep',
        title: 'Sweepstake',
        meta: 'Whimsy Games · вебплатформа',
        img: '/next/assets/generated-mockups/sweep.png',
        figure: { value: 'Темна + світла', label: 'теми з однієї системи токенів' },
        me: 'Промпти, редлайни й раунди рев’ю з клієнтом у багатьох варіантах.',
        ai: 'Claude Code і Codex генерували й ітерували екрани для гравця та адмінки.',
        phases: [2, 3, 4],
        case: 'sweep',
        link: 'Відкрити кейс'
      },
      {
        key: 'budmarket',
        title: 'Budmarket Lux',
        meta: 'Власний концепт · демо з умовним каталогом',
        img: '/next/assets/projects/budmarket-lux/videos/campaign-poster.jpg',
        fit: 'contain',
        figure: { value: '5 × 4', label: 'історій кампанії × формати' },
        me: 'Почав із власної гіпотези й погоджував стиль на кожному чекпоінті.',
        ai: 'Desk research, сцени кампанії без тексту, ціни накладаються з даних, окрема QA-перевірка.',
        phases: [1, 2, 4],
        case: 'budmarket-lux',
        link: 'Відкрити кейс'
      }
    ],
    principlesLabel: 'Правила, яких тримаюся',
    principles: [
      'Напрям, відбір і фінальне рішення — за мною.',
      'Агенти працюють на копіях; мої оригінальні екрани лишаються еталоном.',
      'Ціни й факти про товар беруться з даних, а не з генератора зображень.'
    ],
    toolsLabel: 'Інструменти, якими користуюся зараз',
    tools: ['Figma', 'Claude', 'Codex', 'Gemini'],
    note: 'Цифри — це кількість реальних фреймів, компонентів і форматів, а не метрики ефективності.'
  }
};
