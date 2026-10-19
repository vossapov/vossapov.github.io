/* Poster templates — client-side port of the Jinja templates (A4 poster, Story 1080×1920,
   Post 1 and Post 2 1080×1080). Same structure and section sizes as the original; the
   foundation brand, contacts and partner strip are replaced by the neutral «Демо» brand. */
(function () {
  'use strict';

  var FUND = {
    name_ua: 'Фонд «Демо»',
    name_de: 'Demo-Stiftung',
    website: 'demo-fond.example.org',
    phone: '+380 00 000 00 00',
    email: 'hello@example.org',
    cta_ua: 'Станьте патроном цієї дитини',
    cta_de: 'Werden Sie Pate für dieses Kind',
    partners_ua: 'Дякуємо партнерам за підтримку',
    partners_de: 'Mit Dankbarkeit an unsere Partner'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function ageBucket(age) {
    if (age <= 6) return '2_6';
    if (age <= 10) return '7_10';
    if (age <= 14) return '11_14';
    return '15_18';
  }
  function ageWordUa(age) {
    if (age % 100 >= 11 && age % 100 <= 14) return 'років';
    var last = age % 10;
    if (last === 1) return 'рік';
    if (last >= 2 && last <= 4) return 'роки';
    return 'років';
  }
  function ageWordDe(age) { return age === 1 ? 'Jahr alt' : 'Jahre alt'; }
  function illustration(age, gender) {
    return '/ai/nonprofit/demo/posters/assets/child_' + ageBucket(age) + '_' + (gender === 'm' ? 'm' : 'f') + '.webp';
  }

  /* neutral demo mark: a rounded tile with a small hill and a heart, no words */
  function mark(size) {
    return '<svg class="pz-mark" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<rect width="64" height="64" rx="16" fill="#1d1b2b"/>' +
      '<path d="M8 50 26 26l9 11 6-7 15 20z" fill="#ffd84d"/>' +
      '<path d="M32 22c-2.6-3.4-8-2.4-8 1.9 0 3.6 4.8 6.4 8 8.6 3.2-2.2 8-5 8-8.6 0-4.3-5.4-5.3-8-1.9z" fill="#fff"/></svg>';
  }
  function brandBar(cls, size) {
    return '<header class="' + cls + '"><span class="pz-brand-side">' + esc(FUND.name_ua) + '</span>' + mark(size) +
      '<span class="pz-brand-side pz-brand-side--de">' + esc(FUND.name_de) + '</span></header>';
  }
  function partners(cls) {
    return '<div class="' + cls + '"><span>Партнер</span><span>Partner</span><span>Партнер</span></div>';
  }

  function ctx(d) {
    var age = Math.max(1, Math.min(18, parseInt(d.age, 10) || 1));
    var region = d.region_ua ? d.region_ua : '';
    return {
      ref: esc(d.ref_id || 'D-0001'),
      name_ua: esc(d.name_ua || 'Ім’я'),
      name_de: esc(d.name_de || ''),
      age: age,
      age_ua: ageWordUa(age),
      age_de: ageWordDe(age),
      region_ua: esc(region),
      region_de: esc(d.region_de || ''),
      story_ua: esc(d.story_ua || ''),
      story_de: esc(d.story_de || ''),
      items: (d.items || []).filter(function (i) { return i && (i.ua || i.de); }),
      amount: esc(d.amount || 0),
      img: illustration(age, d.gender)
    };
  }
  function needsList(c, prefix) {
    return c.items.map(function (i) {
      return '<li><div class="' + prefix + 'item-texts"><span class="' + prefix + 'item-ua">' + esc(i.ua) + '</span><span class="' + prefix +
        'item-de">' + esc(i.de || '—') + '</span></div>' + (i.price ? '<span class="' + prefix + 'item-price">' + esc(i.price) + '&nbsp;€</span>' : '') + '</li>';
    }).join('');
  }

  function a4(d) {
    var c = ctx(d);
    return '<div class="pz pz-a4" data-items="' + c.items.length + '">' +
      brandBar('topbar', 60) +
      '<section class="hero"><div class="hero-content"><div class="hero-text">' +
        '<div class="hero-kicker"><span class="kicker-ua">Допоможи дитині з діабетом</span><span class="kicker-sep">·</span><span class="kicker-de">Hilf einem Kind mit Diabetes</span></div>' +
        '<h1 class="hero-name pz-fit">' + c.name_ua + '</h1>' +
        '<div class="hero-age-id-line"><span>' + c.age + ' ' + c.age_ua + '</span><span class="hero-agediv"></span><span>' + c.ref + '</span></div>' +
        '<div class="hero-location-line">' + c.region_ua + '</div>' +
        '<div class="hero-name-alt">' + c.name_de + ' · ' + c.age + ' ' + c.age_de + (c.region_de ? ' · ' + c.region_de : '') + '</div>' +
      '</div><div class="hero-illustration"><img src="' + c.img + '" alt=""></div></div></section>' +
      '<section class="story"><div class="col"><div class="col-label">ІСТОРІЯ</div><p class="col-text">' + c.story_ua + '</p></div>' +
        '<div class="col col-de"><div class="col-label">GESCHICHTE</div><p class="col-text">' + c.story_de + '</p></div></section>' +
      '<section class="needs"><div class="needs-head"><div class="needs-label-ua">ЩО ПОТРІБНО ЩОМІСЯЦЯ</div><div class="needs-label-de">MONATLICHER BEDARF</div></div>' +
        '<ul class="needs-list">' + needsList(c, '') + '</ul>' +
        '<div class="amount"><div class="amount-value">' + c.amount + '&nbsp;€</div><div class="amount-label">на місяць · pro Monat</div></div></section>' +
      '<section class="cta"><div class="cta-headline"><span class="cta-headline-ua">СТАНЬТЕ ПАТРОНОМ ЦІЄЇ ДИТИНИ</span><span class="cta-vdiv"></span><span class="cta-headline-de">Werden Sie Pate für dieses Kind</span></div>' +
        '<div class="cta-body"><div class="cta-subject"><span class="cta-subject-pre">Напишіть e-mail з темою:</span><span class="cta-subject-val">' + c.name_ua + '&nbsp;·&nbsp;' + c.ref + '</span></div>' +
        '<div class="cta-contacts-col"><div>' + esc(FUND.email) + '</div><div>' + esc(FUND.phone) + '</div><div>' + esc(FUND.website) + '</div></div></div></section>' +
      '<section class="partners"><div class="partners-label"><span class="partners-ua">' + esc(FUND.partners_ua) + '</span><span class="partners-de">' + esc(FUND.partners_de) + '</span></div>' +
        partners('partners-logos') + '<div class="ref-mark">№&nbsp;' + c.ref + '</div></section>' +
      '</div>';
  }

  function hero(c, k) {
    return '<section class="s-hero"><div class="s-hero-content"><div class="s-hero-text">' +
      '<div class="s-kicker"><span class="s-kicker-ua">Допоможи дитині з діабетом</span><span class="s-kicker-de">Hilf einem Kind mit Diabetes</span></div>' +
      '<div class="s-hero-name pz-fit">' + c.name_ua + '</div>' +
      '<div class="s-meta"><span>' + c.age + '&nbsp;' + c.age_ua + '</span>' + (c.region_ua ? '<span class="dot">·</span><span class="s-region">' + c.region_ua + '</span>' : '') + '</div>' +
      '<div class="s-name-alt">' + c.name_de + '&nbsp;·&nbsp;' + c.age + '&nbsp;' + c.age_de + (c.region_de ? '&nbsp;·&nbsp;' + c.region_de : '') + '</div>' +
      '</div><div class="s-hero-illustration"><img src="' + c.img + '" alt=""></div></div></section>';
  }
  function storyCols(c) {
    return '<section class="s-story"><div><div class="s-col-label">ІСТОРІЯ</div><p class="s-col-text">' + c.story_ua + '</p></div>' +
      '<div><div class="s-col-label">GESCHICHTE</div><p class="s-col-text">' + c.story_de + '</p></div></section>';
  }
  function needsBlock(c) {
    return '<section class="s-needs"><div class="s-needs-head"><div class="s-needs-label-ua">ЩО ПОТРІБНО ЩОМІСЯЦЯ</div><div class="s-needs-label-de">MONATLICHER BEDARF</div></div>' +
      '<ul class="s-needs-list">' + needsList(c, 's-') + '</ul>' +
      '<div class="s-amount"><div class="s-amount-value">' + c.amount + '&nbsp;€</div><div class="s-amount-label">на місяць&nbsp;·&nbsp;pro Monat</div></div></section>';
  }
  function ctaBlock() {
    return '<section class="s-cta"><div class="s-cta-main">' + esc(FUND.cta_ua) + '</div><div class="s-cta-alt">' + esc(FUND.cta_de) + '</div>' +
      '<div class="s-cta-contact"><span>' + esc(FUND.website) + '</span><span class="s-cta-sep">·</span><span>' + esc(FUND.phone) + '</span><span class="s-cta-sep">·</span><span>' + esc(FUND.email) + '</span></div></section>';
  }
  function partnersBlock(c) {
    return '<section class="s-partners"><div class="s-partners-label"><span class="s-partners-ua">' + esc(FUND.partners_ua) + '</span><span class="s-partners-de">' + esc(FUND.partners_de) + '</span></div>' +
      partners('s-partners-logos') + '<div class="s-ref">№&nbsp;' + c.ref + '</div></section>';
  }

  function story(d) {
    var c = ctx(d);
    return '<div class="pz pz-s pz-story">' + brandBar('s-topbar', 86) + hero(c) + storyCols(c) + needsBlock(c) + ctaBlock() + partnersBlock(c) + '</div>';
  }
  function post1(d) {
    var c = ctx(d);
    return '<div class="pz pz-s pz-post1">' + brandBar('s-topbar', 66) + hero(c) + storyCols(c) + partnersBlock(c) + '</div>';
  }
  function post2(d) {
    var c = ctx(d);
    return '<div class="pz pz-s pz-post2">' + brandBar('s-mini-header', 50) + needsBlock(c) + ctaBlock() + '</div>';
  }

  /* shrink the hero name until it fits on one line (same rule as the original templates) */
  function fit(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.pz-fit'), function (n) {
      n.style.fontSize = '';
      var col = n.parentElement;
      var size = parseFloat(window.getComputedStyle(n).fontSize);
      var min = n.classList.contains('hero-name') ? 24 : 36;
      while (n.scrollWidth > col.clientWidth && size > min) { size -= 1; n.style.fontSize = size + 'px'; }
    });
  }

  window.POSTERS = {
    FUND: FUND,
    FORMATS: {
      a4: { render: a4, w: 794, h: 1123, label: 'Постер A4', sub: 'UA + DE, для друку' },
      story: { render: story, w: 1080, h: 1920, label: 'Story', sub: '1080 × 1920' },
      post1: { render: post1, w: 1080, h: 1080, label: 'Пост 1', sub: 'Герой + історія' },
      post2: { render: post2, w: 1080, h: 1080, label: 'Пост 2', sub: 'Потреби + заклик' }
    },
    fit: fit, ageBucket: ageBucket, ageWordUa: ageWordUa, illustration: illustration
  };
})();
