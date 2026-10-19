/* DRAFT copy for the non-profit page sections below the hero (/ai/nonprofit/): how it works,
   two cases and the new microgrants project (UA/EN). The owner will edit it.
   Rules: problem-led, no invented numbers, clients, savings or percentages; screenshots are real
   captures of the demos (next/assets/ai/ngo/), shown without captions. */
window.VI_AI_NGO = {
  /* ?from=case: the demo starts afresh and its back button returns to this case */
  demos: {
    membership: '/ai/nonprofit/demo/membership/?from=case',
    posters: '/ai/nonprofit/demo/posters/?from=case',
    workspace: '/ai/nonprofit/demo/workspace/?from=case',
    cabinet: '/ai/nonprofit/demo/microgrants/?from=case#cabinet'
  },
  /* spot drawings (Codex image_gen, isometric line style of the figures): next/assets/ai/ngo/spot-*.webp */
  spots: {
    membership: '/next/assets/ai/ngo/spot-membership.webp',
    posters: '/next/assets/ai/ngo/spot-posters.webp',
    microgrants: '/next/assets/ai/ngo/spot-microgrants.webp',
    context: '/next/assets/ai/ngo/spot-context.webp'
  },
  shots: {
    membershipSign: '/next/assets/ai/ngo/membership-sign.webp',
    membershipDocs: '/next/assets/ai/ngo/membership-docs.webp',
    postersEditor: '/next/assets/ai/ngo/posters-editor.webp',
    postersStory: '/next/assets/ai/ngo/posters-story.webp',
    mgCabinet: '/next/assets/ai/ngo/microgrants-cabinet.webp',
    mgDashboard: '/next/assets/ai/ngo/microgrants-dashboard.webp',
    wsBuilder: '/next/assets/ai/ngo/workspace-builder.webp'
  },
  /* Independent step illustrations; raw outputs and prompts in assets/ai/ngo/raw/. */
  how: {
    steps: ['/next/assets/ai/ngo/how-card-1.webp', '/next/assets/ai/ngo/how-card-2.webp', '/next/assets/ai/ngo/how-card-3.webp', '/next/assets/ai/ngo/how-card-4.webp']
  },
  ua: {
    how: {
      title: 'Як це *працює*',
      lead: 'Від документів організації до інструмента, яким команда користується щодня.',
      steps: [
        { t: 'Знання організації', p: 'Статут, правила, шаблони й попередні проєкти — в одному місці. Модель спирається на них, а не на загальні знання.' },
        { t: 'Прості запитання', p: 'Працівник називає проєкт і обирає з готових варіантів. Найімовірніші відповіді вже позначені.' },
        { t: 'Робочий прототип', p: 'З відповідей складається форма, кабінет або генератор документів. Його одразу можна пройти на телефоні.' },
        { t: 'Інструмент на щодень', p: 'Перевірений на ваших прикладах, він приймає заявки чи готує документи. Наступний інструмент працівники створюють самі.' }
      ]
    },
    labels: { problem: 'Як було', did: 'Що ми зробили', result: 'Результат', heroCta: 'Спробувати демо', heroCta2: 'Як це працює', tryDemo: 'Спробувати демо', demoNote: 'Демо без брендування організації, на вигаданих даних. Нічого не надсилається.' },
    cases: [
      {
        id: 'membership', tag: 'ГО «Київтил»', title: 'Заява на вступ *з одного телефона*',
        problem: 'Щоб вступити, людина мала роздрукувати заяву, заповнити її від руки, підписати, сфотографувати разом із документами й надіслати все поштою. Потрібні були комп’ютер, принтер і телефон — і багато хто зупинявся на півдорозі.',
        did: 'Зробили застосунок, де все відбувається на одному телефоні: людина заповнює поля, заява й анкета формуються з них самі, підпис ставиться пальцем на екрані. Біля кожного поля для фото документа — схема, як має виглядати знімок, тож люди не губляться.',
        result: 'Готова заява в PDF і фото документів — за один підхід, без принтера й комп’ютера.',
        shots: [{ key: 'membershipSign', frame: 'phone', alt: 'Крок підпису: підпис пальцем на екрані телефона' }, { key: 'membershipDocs', frame: 'phone', alt: 'Фото документів: біля кожного поля схема правильного знімка' }],
        demo: 'membership'
      },
      {
        id: 'posters', tag: 'ГО «Гора добра»', title: 'Постер для кожної дитини *за хвилину*',
        problem: 'По допомогу звернулися тисячі родин. Фонд фізично не встигав готувати для кожної дитини графіку для соцмереж і друковані матеріали, щоб шукати патронів.',
        did: 'Зробили конструктор: оператор заповнює чотири кроки про дитину, а система збирає двомовний постер A4 українською й німецькою, сторіз і два пости. Ілюстрація підбирається за віком і статтю, текст — за віком, мовою й потребами.',
        result: 'Набір матеріалів для конкретної дитини готовий одразу після заповнення форми — у стилі фонду, без дизайнера.',
        shots: [{ key: 'postersEditor', frame: 'desktop', alt: 'Конструктор постерів: форма про дитину й живий перегляд постера A4' }, { key: 'postersStory', frame: 'phone', alt: 'Готова сторіз 1080 на 1920 для вигаданої дитини' }],
        demo: 'posters'
      }
    ],
    work: { title: 'Приклади *робіт*', lead: 'Два інструменти вже працюють в організаціях. Третій — новий проєкт, зібраний у конструкторі. Кожен можна відкрити й спробувати.', real: 'Реальний проєкт', fresh: 'Новий проєкт', of: 'з' },
    micro: {
      id: 'microgrants', tag: 'Центр підтримки бізнесу', title: 'Конкурс мікрогрантів, *який веде учасника*',
      lead: 'Близько 25 домогосподарств, п’ять етапів, грант до 59 000 грн на розвиток мікробізнесу. Організаторів двоє, а кожен учасник — зі своїми документами, шаблонами й питаннями. Інструмент, зібраний у конструкторі, забирає в команди ручну роботу й веде кожного учасника від заявки до угоди.',
      note: 'Концепт на вигаданих даних, побудований за правилами реального конкурсу.',
      painsTitle: 'Де конкурс буксує — і що робить інструмент',
      pains: [
        ['Перевірка', 'Учасники губляться в етапах і строках', 'Особистий кабінет показує один поточний крок, дедлайн і що саме потрібно зробити.'],
        ['Бізнес-ідея', 'Шаблон презентації важко заповнити без комп’ютера', 'Форма з телефона, по одному питанню, з підказками. Презентація .pptx і кошторис .xlsx збираються самі.'],
        ['Бізнес-ідея', 'Помилки в бюджеті видно лише після подання', 'Перевірки під час заповнення: ліміт 59 000, 80/20, збіг сум, посилання й строк доставки.'],
        ['Усі етапи', 'Команда вручну підтверджує отримання й відповідає на однакові питання', 'Підтвердження приходить автоматично, а відповіді — з положення конкурсу з посиланням на пункт.'],
        ['Усі етапи', 'Частина учасників не встигає до дедлайну', 'Нагадування до строку отримують лише ті, хто ще не подав.'],
        ['Документи', 'Документи переможців приходять неповними й нечитабельними', 'Збір комплекту з підказками до кожного фото, як у заяві «Київтилу», і перевірка, чи все на місці.']
      ],
      shots: [{ key: 'mgCabinet', frame: 'phone', alt: 'Кабінет учасника: кошторис із перевірками на телефоні' }, { key: 'wsBuilder', frame: 'desktop', alt: 'Конструктор: кроки форми для конкурсу мікрогрантів і живий перегляд на телефоні' }],
      demos: [['workspace', 'Створити свій проєкт'], ['cabinet', 'Кабінет учасника']]
    }
  },
  en: {
    how: {
      title: 'How it *works*',
      lead: 'From the organisation’s documents to a tool the team uses every day.',
      steps: [
        { t: 'Your organisation’s knowledge', p: 'Statute, rules, templates and past projects in one place. The model works from them, not from general knowledge.' },
        { t: 'A few simple questions', p: 'A staff member names the project and picks from ready options. The most likely answers are already selected.' },
        { t: 'A working prototype', p: 'The answers become a form, a portal or a document generator. You can try it on a phone straight away.' },
        { t: 'An everyday tool', p: 'Tested on your own examples, it takes applications or prepares documents. Staff build the next tool themselves.' }
      ]
    },
    labels: { problem: 'How it was', did: 'What we built', result: 'Result', heroCta: 'Try the demos', heroCta2: 'How it works', tryDemo: 'Try the demo', demoNote: 'Unbranded demo on invented data, interface in Ukrainian. Nothing is sent anywhere.' },
    cases: [
      {
        id: 'membership', tag: 'Kyivtyl NGO', title: 'A membership application *on one phone*',
        problem: 'To join, a person had to print the application, fill it in by hand, sign it, photograph it together with their documents and e-mail everything. That took a computer, a printer and a phone — and many people gave up halfway.',
        did: 'We built an app where everything happens on one phone: the person fills in the fields, the application and questionnaire are generated from them, and the signature is drawn on the screen. Every document-photo field shows what the picture must look like, so nobody gets lost.',
        result: 'A ready PDF application and document photos in one sitting, with no printer or computer.',
        shots: [{ key: 'membershipSign', frame: 'phone', alt: 'Signature step: signing with a finger on the phone screen' }, { key: 'membershipDocs', frame: 'phone', alt: 'Document photos: each field shows how the picture should look' }],
        demo: 'membership'
      },
      {
        id: 'posters', tag: 'Gora Dobra NGO', title: 'A poster for every child *in a minute*',
        problem: 'Thousands of families asked for help. The foundation physically could not prepare social-media graphics and print materials for each child to look for sponsors.',
        did: 'We built a generator: an operator fills in four steps about a child and the system produces a bilingual Ukrainian–German A4 poster, a story and two posts. The illustration is chosen by age and gender, the copy adapts to age, language and needs.',
        result: 'A full set of materials for a specific child is ready as soon as the form is filled in — in the foundation’s style, without a designer.',
        shots: [{ key: 'postersEditor', frame: 'desktop', alt: 'Poster generator: the child form and a live A4 preview' }, { key: 'postersStory', frame: 'phone', alt: 'A finished 1080 by 1920 story for an invented child' }],
        demo: 'posters'
      }
    ],
    work: { title: 'Examples of *our work*', lead: 'Two tools already run in organisations. The third is a new project assembled in the builder. Each one can be opened and tried.', real: 'Real project', fresh: 'New project', of: 'of' },
    micro: {
      id: 'microgrants', tag: 'Business support centre', title: 'A microgrant competition *that guides the applicant*',
      lead: 'About 25 households, five stages, grants of up to 59,000 UAH for micro-businesses. Two organisers, and every applicant comes with their own documents, templates and questions. A tool assembled in the builder takes the manual work off the team and guides each applicant from application to agreement.',
      note: 'A concept on invented data, built on the rules of a real competition.',
      painsTitle: 'Where the competition stalls — and what the tool does',
      pains: [
        ['Verification', 'Applicants lose track of stages and deadlines', 'A personal cabinet shows one current step, its deadline and exactly what to do.'],
        ['Business idea', 'The presentation template is hard to fill in without a computer', 'A phone form, one question at a time, with hints. The .pptx presentation and .xlsx budget are generated.'],
        ['Business idea', 'Budget mistakes surface only after submission', 'Checks while filling in: 59,000 cap, 80/20 split, matching sums, links and delivery time.'],
        ['All stages', 'The team confirms receipts by hand and answers the same questions', 'Receipts are automatic, answers come from the competition rules with the clause cited.'],
        ['All stages', 'Some applicants miss the deadline', 'Reminders go only to those who have not submitted yet.'],
        ['Documents', 'Winners’ documents arrive incomplete or unreadable', 'Package collection with a photo guide for each document, as in the Kyivtyl application, and a completeness check.']
      ],
      shots: [{ key: 'mgCabinet', frame: 'phone', alt: 'Participant cabinet: the budget with live checks on a phone' }, { key: 'wsBuilder', frame: 'desktop', alt: 'Builder: the form steps for a microgrant competition with a live phone preview' }],
      demos: [['workspace', 'Create your project'], ['cabinet', 'Participant cabinet']]
    }
  },
};
