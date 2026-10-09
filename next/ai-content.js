/* "AI in my process" — editable copy for the #ai-work section (rendered by experience.js).
   ─────────────────────────────────────────────────────────────────────────────────────────
   DRAFT. Everything below is a placeholder written for Valentyn to revise:
   - keep it first-person and honest: describe how you actually use AI, not results;
   - do not add client names, metrics or "shipped with AI" claims unless they are true and allowed;
   - `steps` can have 3–5 items; each needs title, short, input, ai, me and an optional prompt;
   - `tools` is a plain list — add or remove names freely;
   - set `draft: false` (both languages) once the copy is final to hide the "Draft" badge. */
window.VI_AI_COPY = {
  en: {
    draft: true,
    navLabel: 'AI',
    footerLabel: 'AI in my process',
    eyebrow: 'AI in my process',
    title: 'How I work with AI',
    badge: 'Draft / to be refined',
    // TODO(Valentyn): rewrite the thesis in your own words.
    thesis: 'I use AI for visual exploration, interactive prototypes and repetitive production tasks. I set the direction, select the useful options and check how each decision works in the context of the game.',
    note: 'This is a working draft of my approach. I will add concrete examples later.',
    benchLabel: 'Workflow, step by step',
    stepWord: 'Step',
    labels: {
      input: 'Input / task',
      ai: 'Where AI helps',
      me: 'What I decide and check myself',
      prompt: 'Example prompt',
      promptNote: 'An illustration of how I phrase a request — not a recorded session.'
    },
    // TODO(Valentyn): adjust the stages to match your real process.
    steps: [
      {
        title: 'Brief & research',
        short: 'Turn a brief into questions',
        input: 'A game brief, genre and audience, existing screens or competitor references.',
        ai: 'Summarise the brief into open questions, list common UX patterns for the genre, and draft a checklist of screens and states I might be missing.',
        me: 'I check every point against the actual game and its players, drop generic patterns, and decide what the core loop and priorities really are.',
        prompt: 'Here is a brief for the meta-progression of a casual puzzle game. List the screens and UI states a player meets in the first 10 minutes, and the questions I should ask the producer before wireframing.'
      },
      {
        title: 'Visual exploration',
        short: 'Widen the range of directions',
        input: 'Mood and art-direction constraints, the screen or component I am working on.',
        ai: 'Suggest contrasting directions, colour moods, icon ideas and copy variants, so I can compare more options early.',
        me: 'I select the options and check style, composition and readability. I then refine the material for the task and assess whether it is suitable for use in the project.',
        prompt: 'Suggest five distinct visual directions for a reward popup in a cozy farming game. For each: mood, palette idea, and how the main button stands out.'
      },
      {
        title: 'Prototype & automation',
        short: 'Speed up the repetitive parts',
        input: 'Wireframes, component specs and repetitive production tasks.',
        ai: 'Help me write small scripts and Figma plugin snippets, generate placeholder data, or sketch a quick HTML prototype to test a flow.',
        me: 'I read and run the code myself, test it on real files, and keep anything that goes to developers clean and documented.',
        prompt: 'Write a small Figma plugin script that renames the selected layers to the pattern Button/Primary/State. Explain each step so I can check it.'
      },
      {
        title: 'Review & handoff',
        short: 'A second pair of eyes',
        input: 'Finished screens, specs, UI copy and localisation strings.',
        ai: 'Act as a second reviewer: point out inconsistent states, missing edge cases, strings that may overflow in other languages, and accessibility issues to double-check.',
        me: 'I verify each remark against the design system and the build, decide what to fix, and stay responsible for the final result and the handoff.',
        prompt: 'Review these UI strings for a shop screen. Flag the ones likely to get too long in German or Ukrainian and suggest shorter alternatives.'
      }
    ],
    principlesLabel: 'Ground rules',
    principles: [
      'AI drafts, I decide.',
      'Nothing goes into a project without my review.',
      'Confidential materials stay out of AI tools unless the team allows it.'
    ],
    toolsLabel: 'Tools I use now',
    // Editable list — keep only the tools you actually use.
    tools: ['Gemini', 'Claude', 'Codex']
  },
  ua: {
    draft: true,
    navLabel: 'AI',
    footerLabel: 'AI у моєму процесі',
    eyebrow: 'AI у моєму процесі',
    title: 'Як я працюю з AI',
    badge: 'Чернетка / доповнюється',
    // TODO(Valentyn): перепиши тезу своїми словами.
    thesis: 'Я використовую AI для візуального пошуку, інтерактивних прототипів і автоматизації рутинних задач. Задаю напрям, відбираю варіанти й перевіряю, як рішення працюють у контексті гри.',
    note: 'Це робоча чернетка мого підходу. Конкретні приклади додам пізніше.',
    benchLabel: 'Процес крок за кроком',
    stepWord: 'Крок',
    labels: {
      input: 'Вхідні дані / задача',
      ai: 'Де допомагає AI',
      me: 'Що я вирішую і перевіряю сам',
      prompt: 'Приклад запиту',
      promptNote: 'Ілюстрація того, як я формулюю запит, — не запис реальної сесії.'
    },
    // TODO(Valentyn): підлаштуй етапи під свій реальний процес.
    steps: [
      {
        title: 'Бриф і дослідження',
        short: 'Перетворити бриф на питання',
        input: 'Бриф гри, жанр і аудиторія, наявні екрани або референси конкурентів.',
        ai: 'Стиснути бриф до відкритих питань, перелічити типові UX-патерни жанру і накидати чекліст екранів та станів, які я міг пропустити.',
        me: 'Я звіряю кожен пункт із реальною грою та її гравцями, відкидаю шаблонні рішення і сам визначаю core loop і пріоритети.',
        prompt: 'Ось бриф метапрогресії казуальної головоломки. Перелічи екрани та UI-стани, які гравець побачить за перші 10 хвилин, і питання, які варто поставити продюсеру до вайрфреймів.'
      },
      {
        title: 'Візуальний пошук',
        short: 'Розширити діапазон напрямів',
        input: 'Настрій і обмеження арт-дирекшену, екран або компонент, над яким працюю.',
        ai: 'Запропонувати контрастні напрями, колірні настрої, ідеї іконок і варіанти тексту, щоб раніше порівняти більше опцій.',
        me: 'Я відбираю варіанти, перевіряю стиль, композицію й читабельність. Далі доопрацьовую матеріал під задачу та перевіряю, чи придатний він для використання в проєкті.',
        prompt: 'Запропонуй п’ять різних візуальних напрямів для попапу нагороди в затишній фермерській грі. Для кожного: настрій, ідея палітри і як виділити головну кнопку.'
      },
      {
        title: 'Прототип і автоматизація',
        short: 'Пришвидшити рутину',
        input: 'Вайрфрейми, специфікації компонентів і повторювані виробничі задачі.',
        ai: 'Допомогти написати невеликі скрипти й фрагменти Figma-плагінів, згенерувати тестові дані або накидати швидкий HTML-прототип, щоб перевірити флоу.',
        me: 'Код я читаю і запускаю сам, тестую на реальних файлах, а все, що йде розробникам, тримаю чистим і задокументованим.',
        prompt: 'Напиши невеликий скрипт для Figma-плагіна, який перейменовує виділені шари за шаблоном Button/Primary/State. Поясни кожен крок, щоб я міг перевірити.'
      },
      {
        title: 'Рев’ю і передача',
        short: 'Друга пара очей',
        input: 'Готові екрани, специфікації, UI-тексти й рядки локалізації.',
        ai: 'Бути другим рев’юером: вказати на неузгоджені стани, пропущені крайові випадки, рядки, що можуть не влізти в інших мовах, і питання доступності, які варто перевірити.',
        me: 'Я звіряю кожне зауваження з дизайн-системою та білдом, вирішую, що виправляти, і відповідаю за фінальний результат і передачу.',
        prompt: 'Переглянь ці UI-рядки для екрана магазину. Познач ті, що можуть стати задовгими німецькою чи українською, і запропонуй коротші варіанти.'
      }
    ],
    principlesLabel: 'Базові правила',
    principles: [
      'AI робить чернетку, рішення — за мною.',
      'Ніщо не потрапляє в проєкт без моєї перевірки.',
      'Конфіденційні матеріали не йдуть в AI-інструменти без дозволу команди.'
    ],
    toolsLabel: 'Інструменти, якими користуюся зараз',
    // Редагований список — лиши лише ті інструменти, якими реально користуєшся.
    tools: ['Gemini', 'Claude', 'Codex']
  }
};
