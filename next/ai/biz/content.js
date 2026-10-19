/* Copy for the business-assistants page (/ai/erp/): how it works, two cases from the Lux store demo.
   Rendered by next/ai/ngo/ngo.js (same sections as the non-profit page) through window.VIPageExtra.erp.
   Demos open framed on the demo stage (/ai/erp/demo/lux/, same stage as the non-profit demos); videos open
   the Lux review page in a new tab. Case screenshots: next/tools/capture-biz-shots.py from the live /lux/ demo; the campaign phone frame
   is the poster of lux/review/media/campaign.mp4 (real mobile UI capture). */
window.VI_AI_BIZ = {
  demos: {
    luxSearch: '/ai/erp/demo/lux/?from=case#search',
    luxSearchVideo: '/lux/review/#search',
    luxMarketing: '/ai/erp/demo/lux/?from=case#marketing',
    luxCampaignVideo: '/lux/review/#campaign'
  },
  shots: {
    luxSearch: '/next/assets/ai/biz/lux-search.webp',
    luxProduct: '/next/assets/ai/biz/lux-product.webp',
    luxMarketing: '/next/assets/ai/biz/lux-marketing.webp',
    luxCampaignPhone: '/next/assets/ai/biz/lux-campaign-phone.webp'
  },
  /* the same four step illustrations as the non-profit page: the principle is the same */
  how: {
    steps: ['/next/assets/ai/ngo/how-card-1.webp', '/next/assets/ai/ngo/how-card-2.webp', '/next/assets/ai/ngo/how-card-3.webp', '/next/assets/ai/ngo/how-card-4.webp']
  },
  ua: {
    how: {
      title: 'Як це *працює*',
      lead: 'Від даних вашого бізнесу до помічника, яким команда користується щодня.',
      steps: [
        { t: 'Знання бізнесу', p: 'Каталог, ціни, залишки, правила бренду й документи — в одному місці. Помічник спирається на них, а не на загальні знання.' },
        { t: 'Прості запитання', p: 'Ви описуєте задачу звичайними словами й обираєте з готових варіантів. Найімовірніші відповіді вже позначені.' },
        { t: 'Робочий інструмент', p: 'Пошук, генератор реклами, звіт чи перевірка — інструмент одразу можна спробувати на телефоні.' },
        { t: 'Помічник на щодень', p: 'Перевірений на ваших даних, він щодня бере задачі на себе. Нові додаються тим самим шляхом.' }
      ]
    },
    labels: { problem: 'Як було', did: 'Що зроблено', result: 'Результат', heroCta: 'Приклади роботи', heroCtaHref: '#work', heroCta2: 'Як це працює', tryDemo: 'Спробувати демо', demoNote: 'Публічне демо на умовних даних. Нічого не надсилається.' },
    work: { title: 'Приклади *роботи*', lead: 'Два інструменти помічника для будмаркету «Люкс». Обидва можна відкрити й спробувати або подивитися коротке відео.', real: 'Демо для магазину', fresh: 'Новий проєкт', of: 'з' },
    cases: [
      {
        id: 'lux-search', tag: 'Будмаркет «Люкс»', title: 'Товар із бази *за секунди*',
        problem: 'Покупець питає ціну, наявність чи де лежить товар — і працівник іде до комп’ютера або шукає старшого. Покупець чекає.',
        did: 'Помічник у телефоні працівника: пошук за назвою, артикулом, фото чи голосом. Картка показує ціну, акцію, залишок і місце в залі — ряд, секцію й полицю на мапі магазину.',
        result: 'Відповідь покупцю — не відходячи від нього.',
        shots: [{ key: 'luxSearch', frame: 'phone', alt: 'Пошук товару за назвою в телефоні працівника' }, { key: 'luxProduct', frame: 'phone', alt: 'Картка товару: ціна, залишок і місце на мапі магазину' }],
        demos: [['luxSearch', 'Спробувати пошук'], ['luxSearchVideo', 'Відео · 19 с', 1]],
        note: 'Демо: 30 умовних товарів, ціни й залишки не з реального обліку, позиція на мапі — симуляція.'
      },
      {
        id: 'lux-campaign', tag: 'Будмаркет «Люкс»', title: 'Рекламна кампанія *з одного опису*',
        problem: 'Для кожної акції треба пояснити дизайнеру, що рекламуємо, дочекатися макетів під кожну соцмережу, окремо підготувати друк і дописи.',
        did: 'Менеджер описує акцію словами чи голосом. Помічник сам знаходить товари, дати й формати, показує підсумок на перевірку і створює макети у стилі магазину. Правки — теж словами, а готовий набір одразу ставиться в план публікацій.',
        result: 'Від ідеї акції до макетів і запланованих дописів — в одному інструменті.',
        shots: [{ key: 'luxMarketing', frame: 'desktop', alt: 'Маркетинг: промокампанії магазину з готовими макетами' }, { key: 'luxCampaignPhone', frame: 'phone', alt: 'Створення кампанії з телефона' }],
        demos: [['luxMarketing', 'Відкрити маркетинг'], ['luxCampaignVideo', 'Відео · 30 с', 1]],
        note: 'Генерація макетів працює на підключеному ПК; у публічному демо — готові кампанії й тестова публікація без надсилання в соцмережі.'
      }
    ]
  },
  en: {
    how: {
      title: 'How it *works*',
      lead: 'From your business data to an assistant the team uses every day.',
      steps: [
        { t: 'Your business knowledge', p: 'Catalogue, prices, stock, brand rules and documents in one place. The assistant works from them, not from general knowledge.' },
        { t: 'A few simple questions', p: 'You describe the task in plain words and pick from ready options. The most likely answers are already selected.' },
        { t: 'A working tool', p: 'A search, an ad generator, a report or a check — you can try it on a phone straight away.' },
        { t: 'An everyday assistant', p: 'Tested on your own data, it takes tasks off your hands every day. New ones are added the same way.' }
      ]
    },
    labels: { problem: 'How it was', did: 'What we built', result: 'Result', heroCta: 'Examples', heroCtaHref: '#work', heroCta2: 'How it works', tryDemo: 'Try the demo', demoNote: 'Public demo on sample data, interface in Ukrainian. Nothing is sent anywhere.' },
    work: { title: 'Examples of *our work*', lead: 'Two assistant tools for the Lux building-supplies store. Both can be opened and tried, or watched as a short video.', real: 'Store demo', fresh: 'New project', of: 'of' },
    cases: [
      {
        id: 'lux-search', tag: 'Lux building supplies', title: 'Any product from the database *in seconds*',
        problem: 'A customer asks for a price, stock or where an item is — and the employee walks to a computer or looks for a senior colleague. The customer waits.',
        did: 'An assistant on the employee’s phone: search by name, SKU, photo or voice. The product card shows price, discount, stock and the exact spot in the store — row, section and shelf on the store map.',
        result: 'The customer gets an answer without the employee leaving their side.',
        shots: [{ key: 'luxSearch', frame: 'phone', alt: 'Product search by name on the employee’s phone' }, { key: 'luxProduct', frame: 'phone', alt: 'Product card: price, stock and its place on the store map' }],
        demos: [['luxSearch', 'Try the search'], ['luxSearchVideo', 'Video · 19 s', 1]],
        note: 'Demo: 30 sample products; prices and stock are not from real accounting, the map position is simulated.'
      },
      {
        id: 'lux-campaign', tag: 'Lux building supplies', title: 'An ad campaign *from one description*',
        problem: 'For every promotion someone had to brief a designer, wait for layouts for each social network, and prepare print and posts separately.',
        did: 'The manager describes the promotion in words or by voice. The assistant finds the products, dates and formats itself, shows a summary to confirm and creates layouts in the store’s style. Changes are requested in words too, and the finished set goes straight into the posting plan.',
        result: 'From a promotion idea to layouts and scheduled posts in one tool.',
        shots: [{ key: 'luxMarketing', frame: 'desktop', alt: 'Marketing: the store’s promo campaigns with finished layouts' }, { key: 'luxCampaignPhone', frame: 'phone', alt: 'Creating a campaign from a phone' }],
        demos: [['luxMarketing', 'Open marketing'], ['luxCampaignVideo', 'Video · 30 s', 1]],
        note: 'Layout generation runs on a connected PC; the public demo shows finished campaigns and a test publication that is not sent to social networks.'
      }
    ]
  }
};
