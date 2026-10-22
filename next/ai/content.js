/* Copy for the light intro, the branch fork and the AI-automation branch (UA/EN).
   Product truth: no client names, prices, metrics or timelines exist yet — do not add any.
   Per audience: one paragraph (`lead`) about what the company gets, then short `bullets`.
   `figure.caption` is the drawing's accessible description (svg aria-label); nothing is shown
   around the drawings — benefits live in the copy. */
window.VI_AI = {
  /* the automation site lives on its own domain; the UI/UX portfolio stays on vossapov.github.io.
     Locally (127.0.0.1 / localhost) both are served from one checkout, so links stay relative. */
  sites: { portfolio: 'https://vossapov.github.io', ai: 'https://sab-ai.com.ua' },
  contacts: {
    telegram: 'https://t.me/vossapov',
    email: 'mailto:vossapov@gmail.com',
    linkedin: 'https://www.linkedin.com/in/valentyn-ihnatov-a103a1153/'
  },
  /* order matters: buttons, sections and pages follow it */
  audiences: ['erp', 'nonprofit', 'personal', 'it'],
  /* audiences illustrated by an Anatomy figure (next/ai/figures/<id>/): a plain id is a static
     drawing (embed-static.html); { id, live: true } is an animated one (embed.html + live.js).
     'it' is now the design/art-team assistant: the assembly workshop (one interface screen built in
     layers and checked) fits it; the engineering night-shift loop (it-nightshift) is no longer shown. */
  figures: { erp: { id: 'erp-orders', live: true }, nonprofit: { id: 'nonprofit-intake', live: true }, personal: { id: 'personal-assistant', live: true }, it: { id: 'it-assembly', live: true } },
  /* the overview on /?b=ai: which evidence each audience shows (see next/ai/home.js).
     cases → real case cards from VI_AI_BIZ / VI_AI_NGO (title, organisation, first screenshot);
     figure → the audience's live drawing; design → real projects from VI_AI_COPY (next/ai-content.js). */
  proof: {
    erp: { cases: ['lux-search', 'lux-campaign'] },
    nonprofit: { cases: ['membership', 'posters', 'microgrants'] },
    personal: { figure: true },
    it: { design: ['blastjam', 'tilesort', 'sweep'] }
  },
  art: {
    introMe: '/next/assets/ai/intro-me', introAbstract: '/next/assets/ai/intro-abstract',
    design: '/next/assets/ai/fork-design-v2', ai: '/next/assets/ai/fork-ai-v2', contact: '/next/assets/ai/contact',
    erp: '/next/assets/ai/aud-erp',
    nonprofit: '/next/assets/ai/aud-nonprofit', personal: '/next/assets/ai/aud-personal'
  },
  ua: {
    name: 'Валентин Ігнатов',
    intro: 'Проєктую інтерфейси для ігор і застосунків. Будую ШІ-помічників, що беруть рутину на себе.',
    introAlt: 'Валентин з собакою, іграшкова 3D-фігурка',
    choose: 'Що вас цікавить?',
    design: { kicker: '01 — Дизайн', title: 'UI/UX дизайн', line: 'Ігри, застосунки, веб' },
    ai: { kicker: '02 — Автоматизація', title: 'ШІ-автоматизація', line: 'Для бізнесу, НКО, дизайн-команд і вас особисто' },
    ov: {
      hero: 'ШІ-помічник, який *знає ваш контекст*',
      lead: 'Я проєктую простий і зрозумілий інтерфейс до помічника, який знає ваші документи, правила й дані. Ви описуєте задачу звичайними словами — він виконує і щоденну роботу, і нестандартні задачі, а рішення лишається за вами.',
      cta: 'Обговорити задачу',
      forLead: 'Чотири напрями, один принцип. Оберіть свій — нижче задачі, які бере помічник, і що вже зроблено.',
      how: {
        title: 'Як це *працює*',
        lead: 'Однаково для кожного напряму: від вашого контексту до помічника, яким користуються щодня.',
        steps: [
          { t: 'Ваш контекст', p: 'Документи, правила, дані й попередні проєкти — в одному місці. Помічник спирається на них, а не на загальні знання.' },
          { t: 'Задача словами', p: 'Ви описуєте задачу звичайними словами або обираєте з готових варіантів. Не треба вчити промпти.' },
          { t: 'Зручний інтерфейс', p: 'Форма, пошук, кабінет чи генератор — інструмент, спроєктований під ваших людей і їхні пристрої.' },
          { t: 'Рішення за вами', p: 'Помічник виконує й показує результат на перевірку. Що лишається і що йде далі — вирішуєте ви.' }
        ]
      },
      of: 'з',
      tasks: 'Що бере на себе',
      proof: 'Що вже зроблено',
      proofDemo: 'Публічні демо на умовних даних — їх можна відкрити й спробувати.',
      proofFigure: 'Як це виглядає',
      proofDesign: 'Мій власний процес на реальних проєктах',
      proofDesignNote: 'Цифри — кількість реальних фреймів і компонентів, а не метрики ефективності.',
      more: 'Детальніше про напрям',
      openCase: 'Відкрити кейс'
    },
    forWhom: 'Для кого це',
    how: 'Як це працює',
    benefits: 'Що ви отримуєте',
    back: 'Усі напрями',
    others: 'Інші напрями',
    fig: 'Рис 1',
    aud: {
      erp: {
        btn: 'ШІ-помічники для бізнесу',
        title: 'ШІ-помічники для бізнесу',
        hero: 'Помічник, який *знає ваш\u00a0бізнес.*',
        lead: 'Ми створюємо інтерфейс, через який ви працюєте з ШІ, — а він виконує і щоденні, і унікальні задачі. Помічник знає ваш каталог, ціни, залишки, документи й правила бренду, тож відповідає по суті вашого бізнесу.',
        bullets: [
          'Готує рекламну графіку й публікує дописи за планом.',
          'Дає працівникам актуальну інформацію: ціни, наявність, правила.',
          'Стежить за станами й залишками та попереджає заздалегідь.',
          'Веде облік і перевіряє документи — і береться за будь-яку іншу задачу, яку йому поставите.'
        ],
        figure: { title: 'Розподіл задач', caption: 'Ізометрична машина: неоформлені задачі з одного джерела оформлюються й розходяться по агентах, кожен виконує свою функцію й відправляє результат.' }
      },
      nonprofit: {
        btn: 'Некомерційним організаціям',
        title: 'Некомерційні організації',
        hero: 'AI, який уже *знає вашу організацію.*',
        lead: 'Ми налаштовуємо робоче середовище, де модель знає ваш статут, програми, шаблони, правила, бренд і попередні проєкти. Команда описує задачу — модель підтягує потрібний контекст і минулі рішення, пропонує інструмент і збирає робочий прототип, який ви тестуєте й запускаєте самі.',
        bullets: [
          'Модель працює з вашими документами й правилами, а не із загальними знаннями.',
          'Нові інструменти команда створює сама — кроками, які ми налаштували.',
          'Кожен інструмент спершу перевіряють на ваших прикладах, потім запускають.',
          'Два готові інструменти й новий проєкт можна відкрити й спробувати.'
        ],
        figure: { title: 'Приймання заявок', caption: 'Ізометрична машина: заявки надходять, звіряються з вимогами й розходяться за рішенням.' }
      },
      personal: {
        btn: 'Особисто вам',
        title: 'Особисто для вас',
        hero: 'AI, що знає ваші задачі.',
        lead: 'Пошта, документи, нотатки й плани працюють разом. Асистент розбирає пошту, готує чернетки, нагадує про важливе й тримає все в одному місці — на ваших пристроях і з вашими доступами.',
        bullets: [
          'Пошта й документи розібрані, підписані й знайдені за секунди.',
          'Чернетки листів, планів і відповідей на основі вашого контексту.',
          'Нагадування й задачі в одному місці замість розкиданих нотаток.',
          'Налаштовую під ваші пристрої та звички і лишаюсь на зв’язку.'
        ],
        figure: { title: 'Особистий робот', caption: 'Ізометричний робот на одній рейці по черзі веде облік чеків, шукає несправність у побутовому приладі й поливає квіти.' }
      },
      it: {
        btn: 'ШІ помічник для дизайн і арт відділів айті компаній',
        title: 'ШІ помічник для дизайн і арт відділів айті компаній',
        kicker: true,
        hero: 'Помічник, який *знає ваші правила дизайну.*',
        lead: 'Помічник знає ваш бренд, дизайн-систему, гайди й попередні проєкти. Він бере на себе підготовчу й повторювану роботу дизайн- і арт-відділу, а напрям, відбір і фінальне рішення лишаються за вашими арт-лідами.',
        bullets: [
          'Тримає контекст: бренд, гайди, дизайн-систему й правила неймінгу.',
          'Розбирає брифи й ресерч, збирає референси й асети в робочі добірки.',
          'Накидає вайрфрейми, стани інтерфейсу й варіанти для вибору.',
          'Перевіряє макети на відповідність правилам і готує файли до передачі.'
        ],
        figure: { title: 'Складальний цех', caption: 'Ізометричний складальний цех: плотер креслить макет, маніпулятор ставить блоки, друкувальна балка наносить текст, а контрольна вежа перевіряє — четверо агентів разом збирають один екран інтерфейсу.' }
      }
    },
    contact: { title: 'Розкажіть, що забирає ваш час', cta: 'Обговорити задачу', email: 'Пошта' },
    pageTitle: 'Валентин Ігнатов — UI/UX дизайн і ШІ-автоматизація',
    siteTitle: 'ШІ-помічники — Валентин Ігнатов',
    portfolio: 'UI/UX портфоліо',
    lang: 'Мова'
  },
  en: {
    name: 'Valentyn Ihnatov',
    intro: 'I design interfaces for games and apps, and build AI systems that take routine off your hands.',
    introAlt: 'Valentyn with his dog, a 3D toy figure',
    choose: 'What are you here for?',
    design: { kicker: '01 — Design', title: 'UI/UX design', line: 'Games, apps, web' },
    ai: { kicker: '02 — Automation', title: 'AI automation', line: 'For business, non-profits, design teams and you' },
    ov: {
      hero: 'An AI assistant that *knows your context*',
      lead: 'I design a simple, clear interface to an assistant that knows your documents, rules and data. You describe a task in plain words — it handles both everyday work and unusual tasks, and the decision stays with you.',
      cta: 'Discuss your task',
      forLead: 'Four directions, one principle. Pick yours — below are the tasks the assistant takes on and what has already been built.',
      how: {
        title: 'How it *works*',
        lead: 'The same for every direction: from your context to an assistant people use every day.',
        steps: [
          { t: 'Your context', p: 'Documents, rules, data and past projects in one place. The assistant works from them, not from general knowledge.' },
          { t: 'A task in plain words', p: 'You describe the task in your own words or pick from ready options. No prompt-writing to learn.' },
          { t: 'An easy interface', p: 'A form, a search, a portal or a generator — a tool designed around your people and their devices.' },
          { t: 'You decide', p: 'The assistant does the work and shows the result for review. What stays and what goes further is your call.' }
        ]
      },
      of: 'of',
      tasks: 'What it takes on',
      proof: 'What has been built',
      proofDemo: 'Public demos on sample data — open them and try.',
      proofFigure: 'What it looks like',
      proofDesign: 'My own process on real projects',
      proofDesignNote: 'Numbers are counts of real frames and components, not efficiency metrics.',
      more: 'More about this direction',
      openCase: 'Open the case'
    },
    forWhom: 'Who it’s for',
    how: 'How it works',
    benefits: 'What you get',
    back: 'All directions',
    others: 'Other directions',
    fig: 'Fig 1',
    aud: {
      erp: {
        btn: 'AI assistants for business',
        title: 'AI assistants for business',
        hero: 'An assistant that *knows your\u00a0business.*',
        lead: 'We build the interface through which you work with AI — and it takes on both everyday and one-off tasks. The assistant knows your catalogue, prices, stock, documents and brand rules, so its answers are about your business, not business in general.',
        bullets: [
          'Prepares ad graphics and publishes posts on schedule.',
          'Gives staff up-to-date information: prices, availability, rules.',
          'Watches statuses and stock levels and warns you in advance.',
          'Keeps records and checks documents — and takes on any other task you give it.'
        ],
        figure: { title: 'Task dispatch', caption: 'Isometric machine: unformed tasks from one source are formed and routed to agents; each does its own job and sends the result on.' }
      },
      nonprofit: {
        btn: 'Non-profits',
        title: 'Non-profit organisations',
        hero: 'AI that already *knows your organisation.*',
        lead: 'We set up a working environment where the model knows your statute, programmes, templates, rules, brand and past projects. Your team describes a task — the model pulls in the relevant context and earlier solutions, proposes a tool and builds a working prototype that you test and launch yourselves.',
        bullets: [
          'The model works from your documents and rules, not general knowledge.',
          'Your team builds new tools itself, following steps we set up.',
          'Every tool is tried on your own examples before it goes live.',
          'Two finished tools and a new project are open to try.'
        ],
        figure: { title: 'Application intake', caption: 'Isometric machine: applications arrive, are matched against the requirements and go their way.' }
      },
      personal: {
        btn: 'You personally',
        title: 'For you personally',
        hero: 'AI that knows your tasks.',
        lead: 'Email, documents, notes and plans work together. The assistant sorts your inbox, drafts the replies, reminds you of what matters and keeps everything in one place — on your devices and with your own access.',
        bullets: [
          'Email and documents sorted, labelled and found in seconds.',
          'Drafts of letters, plans and replies from your own context.',
          'Reminders and tasks in one place instead of scattered notes.',
          'Set up around your devices and habits, with support after launch.'
        ],
        figure: { title: 'Personal robot', caption: 'Isometric robot on one rail takes turns: it keeps the receipts in the ledger, finds the fault in a household appliance and waters the plants.' }
      },
      it: {
        btn: 'AI assistant for design and art teams in IT companies',
        title: 'AI assistant for design and art teams in IT companies',
        kicker: true,
        hero: 'An assistant that *knows your design rules.*',
        lead: 'The assistant knows your brand, design system, guidelines and past projects. It takes on the preparation and repetitive work of a design or art team, while direction, selection and final approval stay with your art leads.',
        bullets: [
          'Holds the context: brand, guidelines, design system and naming rules.',
          'Breaks down briefs and research, gathers references and assets into working boards.',
          'Drafts wireframes, interface states and variants to choose from.',
          'Checks layouts against the rules and prepares files for handoff.'
        ],
        figure: { title: 'Assembly workshop', caption: 'Isometric assembly workshop: a plotter draws the layout, an arm places the blocks, a print bar adds the text and an inspection tower checks it — four agents build one interface screen together.' }
      }
    },
    contact: { title: 'Tell me what’s eating your time', cta: 'Discuss your task', email: 'Email' },
    pageTitle: 'Valentyn Ihnatov — UI/UX design and AI automation',
    siteTitle: 'AI assistants — Valentyn Ihnatov',
    portfolio: 'UI/UX portfolio',
    lang: 'Language'
  }
};

/* cross-site links: VI_SITES.ai('/ai/erp/'), VI_SITES.portfolio('/next/case.html?id=x'), VI_SITES.aiHome() */
window.VI_SITES = (function () {
  var S = window.VI_AI.sites;
  var host = window.location.hostname;
  var local = host === '127.0.0.1' || host === 'localhost' || host === '';
  var onAi = !local && S.ai.indexOf('//' + host) > -1;
  var onPortfolio = !local && S.portfolio.indexOf('//' + host) > -1;
  return {
    aiHome: function () { return local ? '/ai/' : (onAi ? '/' : S.ai + '/'); },
    ai: function (path) { return local || onAi ? path : S.ai + path; },
    portfolio: function (path) { return local || onPortfolio ? path : S.portfolio + path; }
  };
})();
