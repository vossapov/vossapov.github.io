// ============================================
// LANGUAGE SWITCHER
// ============================================
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const langBtns = document.querySelectorAll('.lang-btn');

function setLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';

  document.querySelectorAll('[data-en]').forEach(el => {
    const text = el.getAttribute('data-' + lang);
    if (text) el.textContent = text;
  });

  langBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('vi-lang', lang);
  // Let effect modules (char-reveal etc.) re-init on fresh text
  document.dispatchEvent(new CustomEvent('vi-lang-changed'));
}

langBtns.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));

// Load saved preference
setLang(localStorage.getItem('vi-lang') || 'en');


// ============================================
// SCROLL ANIMATIONS
// ============================================
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.anim-item').forEach(el => observer.observe(el));


// ============================================
// HEADER — scrolled state + hero scroll fade
// ============================================
const header = document.getElementById('header');
const heroScrollEl = document.querySelector('.hero-scroll');

const onScroll = () => {
  const y = window.scrollY;
  if (header) header.classList.toggle('scrolled', y > 10);
  if (heroScrollEl) heroScrollEl.style.opacity = y > 80 ? '0' : '';
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();


// ============================================
// COLOR THEME SWITCHER
// ============================================
(function () {
  const dots = document.querySelectorAll('.theme-dot');
  if (!dots.length) return;

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    dots.forEach(d => d.classList.toggle('active', d.dataset.theme === theme));
    localStorage.setItem('vi-theme', theme);
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
  });

  // Restore saved theme
  applyTheme(localStorage.getItem('vi-theme') || '');
})();


// ============================================
// SCROLL SPY — active nav anchor links
// ============================================
(function () {
  const anchors = document.querySelectorAll('.nav-anchor');
  if (!anchors.length) return;

  const sections = [...anchors]
    .map(a => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if (!sections.length) return;

  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        anchors.forEach(a => a.classList.toggle('nav-anchor--active', a.getAttribute('href') === id));
      }
    });
  }, { threshold: 0.15, rootMargin: '-64px 0px -45% 0px' });

  sections.forEach(s => spy.observe(s));
})();


// ============================================
// MOBILE NAV — Hamburger toggle
// ============================================
(function () {
  const burger = document.getElementById('navHamburger');
  const drawer = document.getElementById('mobileNav');
  if (!burger || !drawer) return;

  // Initialize hidden state for screen readers
  drawer.setAttribute('aria-hidden', 'true');

  function setOpen(open) {
    burger.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflowY = open ? 'hidden' : '';
  }

  burger.addEventListener('click', () => setOpen(!burger.classList.contains('open')));

  // Close on any link click inside drawer
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));

  // Close on ESC or window resize to desktop
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) setOpen(false); }, { passive: true });
})();


// ============================================
// BACK TO TOP BUTTON
// ============================================
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 450);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();


// ============================================
// HERO STATS — Count-up animation
// ============================================
(function () {
  const statEls = document.querySelectorAll('.stat-n');
  if (!statEls.length) return;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el, to, suffix, dur) {
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = Math.round(easeOut(p) * to) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const m  = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (m && !reduceMotion) animateCount(el, parseInt(m[1], 10), m[2], 1400);
      obs.unobserve(el);
    });
  }, { threshold: 0.6 });

  statEls.forEach(el => obs.observe(el));
})();


// ============================================
// MARQUEE — scroll-driven horizontal strips
// ============================================
(function () {
  if (reduceMotion) return;
  const rows = [document.getElementById('mqRow1'), document.getElementById('mqRow2')].filter(Boolean);
  if (!rows.length) return;
  const section = document.querySelector('.marquee-section');
  if (!section) return;

  function onScroll() {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const off = Math.max(0, (window.scrollY - top + window.innerHeight) * 0.3);
    // opposite directions; both stay negative so the strips never expose edges
    rows[0].style.transform = `translateX(${-1400 + off}px)`;
    if (rows[1]) rows[1].style.transform = `translateX(${-200 - off}px)`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  // re-run after the timeline render populates rows
  setTimeout(onScroll, 120);
})();


// ============================================
// MAGNET — mouse-following hover effect
// (hero player card + gradient pill buttons)
// ============================================
(function () {
  if (reduceMotion) return;
  const PADDING = 110, STRENGTH = 5;

  function attach(el) {
    let active = false;
    function move(e) {
      const r = el.getBoundingClientRect();
      const inX = e.clientX > r.left - PADDING && e.clientX < r.right + PADDING;
      const inY = e.clientY > r.top - PADDING && e.clientY < r.bottom + PADDING;
      if (inX && inY) {
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (!active) { active = true; el.style.transition = 'transform .3s ease-out'; }
        el.style.transform = `${el.dataset.baseTf || ''} translate3d(${dx / STRENGTH}px, ${dy / STRENGTH}px, 0)`;
      } else if (active) {
        active = false;
        el.style.transition = 'transform .6s ease-in-out';
        el.style.transform = el.dataset.baseTf || '';
      }
    }
    window.addEventListener('mousemove', move, { passive: true });
  }

  const heroChar = document.getElementById('heroChar');
  if (heroChar && window.matchMedia('(min-width: 1025px)').matches) {
    heroChar.dataset.baseTf = 'translateX(-50%)';
    attach(heroChar);
  }
  document.querySelectorAll('.magnet-btn').forEach(b => attach(b));
})();


// ============================================
// ABOUT — character-by-character scroll reveal
// ============================================
(function () {
  const el = document.getElementById('aboutText');
  if (!el) return;

  let chars = [];

  function wrap() {
    const text = el.textContent;
    el.textContent = '';
    chars = [];
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      el.appendChild(s);
      chars.push(s);
    }
    update();
  }

  function update() {
    if (!chars.length) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // progress 0→1 while the paragraph travels from 80% to 25% of the viewport
    const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.55)));
    const lit = Math.round(p * chars.length);
    chars.forEach((c, i) => c.classList.toggle('on', i < lit || reduceMotion));
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  document.addEventListener('vi-lang-changed', () => setTimeout(wrap, 30));
  wrap();
})();

// ============================================
// INTERACTIVE HERO — perspective deck of project screens
// ============================================
(function heroDeck() {
  const stage = document.getElementById('deckStage');
  const deck  = document.getElementById('deck');
  if (!stage || !deck) return;
  const cards = Array.from(deck.querySelectorAll('.deck-card'));
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (reduceMotion) return;   // deck keeps its static CSS tilt

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let tx = 0, ty = 0;   // target (-1..1)
  let cx = 0, cy = 0;   // smoothed
  let lastMove = -1e9;

  function onMove(e) {
    const r = stage.getBoundingClientRect();
    tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 1.2), -1, 1);
    ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 1.0), -1, 1);
    lastMove = performance.now();
  }
  if (canHover) {
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
    window.addEventListener('blur', () => { tx = 0; ty = 0; });
  }

  function frame(now) {
    // slow self-drift when idle (and on touch devices)
    if (!canHover || now - lastMove > 4000) {
      const t = now / 1000;
      tx = Math.sin(t * 0.5) * 0.30;
      ty = Math.cos(t * 0.4) * 0.22;
    }
    cx += (tx - cx) * 0.075;
    cy += (ty - cy) * 0.075;

    // deck tilts toward the cursor; each screen parallaxes by its depth
    deck.style.transform =
      `rotateX(${(6 - cy * 3.5).toFixed(2)}deg) rotateY(${(-14 + cx * 5).toFixed(2)}deg)`;
    for (const c of cards) {
      const d = parseFloat(c.dataset.depth) || 0.5;
      c.style.setProperty('--px', (cx * d * 22).toFixed(1) + 'px');
      c.style.setProperty('--py', (cy * d * 14).toFixed(1) + 'px');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
