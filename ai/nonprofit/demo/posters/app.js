/* Poster generator demo — the original 4-step editor, fully client-side:
   templates render in the browser, PNG via html-to-image, A4 PDF via jsPDF, ZIP via JSZip.
   No Flask, no Playwright, no translation API; state lives in localStorage. */
(function () {
  'use strict';

  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  var D = window.NGODemo, P = window.POSTERS, DATA = window.POSTER_DATA;
  var store = D.store('vi-ngo-demo-posters');
  var MAX_ITEMS = 5;

  var state = (function () {
    var saved = store.get();
    if (saved && saved.name_ua !== undefined) return saved;
    var s = DATA.example('lina');
    s.step = 1;
    return s;
  })();
  if (!state.step) state.step = 1;

  function save() { store.set(state); }
  function itemsSum() {
    return state.items.reduce(function (a, i) { return a + (parseFloat(i.price) || 0); }, 0);
  }
  function view() {
    return {
      ref_id: state.ref_id, name_ua: state.name_ua, name_de: state.name_de, age: state.age, gender: state.gender,
      region_ua: state.region_ua, region_de: state.region_de, story_ua: state.story_ua, story_de: state.story_de,
      items: state.items, amount: state.amountManual ? state.amount : itemsSum()
    };
  }

  /* ========= examples: the stage's bubble «Заповнити прикладом» cycles through the six invented children ========= */
  var Stage = window.NGOStage || { state: function () {}, action: function () {} };
  function nextExample() {
    var keys = DATA.EXAMPLES.map(function (e) { return e.key; });
    var key = keys[(keys.indexOf(state.example) + 1) % keys.length];
    var step = state.step;
    state = DATA.example(key);
    state.step = step;
    save();
    fillForm();
    refresh();
    var ex = DATA.EXAMPLES[keys.indexOf(key)];
    D.toast('Приклад: ' + ex.name_ua + ', ' + ex.age + ' ' + (ex.age % 10 === 1 && ex.age !== 11 ? 'рік' : ex.age % 10 >= 2 && ex.age % 10 <= 4 && (ex.age < 12 || ex.age > 14) ? 'роки' : 'років'));
  }
  Stage.action('example', nextExample);

  /* ========= form ========= */
  $('#region_ua').innerHTML = DATA.REGIONS.map(function (r) { return '<option value="' + r[0] + '">' + r[0] + '</option>'; }).join('');
  $('#needs-list').innerHTML = DATA.NEEDS.map(function (n) { return '<option value="' + n[0] + '"></option>'; }).join('');

  function fillForm() {
    $('#name_ua').value = state.name_ua || '';
    $('#name_de').value = state.name_de || '';
    $('#age').value = state.age;
    $('#ref_id').value = state.ref_id || '';
    $$('input[name="gender"]').forEach(function (r) { r.checked = r.value === state.gender; });
    $('#region_ua').value = state.region_ua;
    $('#region_de_view').textContent = state.region_de || '';
    $('#story_ua').value = state.story_ua || '';
    $('#story_de').value = state.story_de || '';
    updateGenderImages();
    updateCounters();
    renderItems();
    updateAmount();
  }
  function updateGenderImages() {
    ['f', 'm'].forEach(function (g) { $('#gender-img-' + g).src = P.illustration(state.age, g); });
  }
  function updateCounters() {
    $('#story-ua-counter').textContent = ($('#story_ua').value.length) + ' / 350';
    $('#story-de-counter').textContent = ($('#story_de').value.length) + ' / 420';
    $('#deWarn').hidden = state.story_ua === state.story_src;
  }

  $('#name_ua').addEventListener('input', function (e) {
    var autoDe = !state.name_de || state.name_de === DATA.translit(state.name_ua);
    state.name_ua = e.target.value;
    if (autoDe) { state.name_de = DATA.translit(state.name_ua); $('#name_de').value = state.name_de; }
    state.example = null;
    changed();
  });
  $('#name_de').addEventListener('input', function (e) { state.name_de = e.target.value; changed(); });
  $('#ref_id').addEventListener('input', function (e) { state.ref_id = e.target.value; changed(); });
  function setAge(v) {
    state.age = Math.max(1, Math.min(18, parseInt(v, 10) || 1));
    $('#age').value = state.age;
    updateGenderImages();
    changed();
  }
  $('#age').addEventListener('change', function (e) { setAge(e.target.value); });
  $$('.age-btn').forEach(function (b) { b.addEventListener('click', function () { setAge(state.age + (+b.dataset.delta)); }); });
  $$('input[name="gender"]').forEach(function (r) { r.addEventListener('change', function (e) { state.gender = e.target.value; changed(); }); });
  $('#region_ua').addEventListener('change', function (e) {
    state.region_ua = e.target.value;
    state.region_de = DATA.regionDe(state.region_ua);
    $('#region_de_view').textContent = state.region_de;
    changed();
  });
  $('#story_ua').addEventListener('input', function (e) { state.story_ua = e.target.value; updateCounters(); changed(); });
  $('#story_de').addEventListener('input', function (e) {
    state.story_de = e.target.value;
    state.story_src = state.story_ua; /* the person has reviewed the German text */
    updateCounters();
    changed();
  });

  /* needs */
  function renderItems() {
    var list = $('#items-list');
    list.innerHTML = '';
    state.items.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'item-row';
      var fromTable = DATA.needDe(item.ua);
      row.innerHTML =
        '<input type="text" class="d-input item-ua" list="needs-list" placeholder="Наприклад: сенсори" aria-label="Пункт ' + (idx + 1) + ' українською" value="' + D.esc(item.ua) + '">' +
        '<div class="item-price-wrap"><input type="number" class="d-input item-price" min="0" step="5" inputmode="numeric" aria-label="Ціна, євро" value="' + D.esc(item.price) + '"></div>' +
        '<button type="button" class="item-remove" aria-label="Видалити пункт">×</button>' +
        '<div class="pe-de-line"><span class="pe-tag">DE</span><input type="text" class="d-input item-de" aria-label="Пункт ' + (idx + 1) + ' німецькою" placeholder="Введіть німецькою вручну" value="' + D.esc(item.de) + '">' +
        (fromTable && fromTable === item.de ? '<span class="item-de-src">з довідника</span>' : '') + '</div>';
      row.querySelector('.item-ua').addEventListener('change', function (e) {
        item.ua = e.target.value;
        var de = DATA.needDe(item.ua);
        if (de) item.de = de;
        renderItems(); changed();
      });
      row.querySelector('.item-ua').addEventListener('input', function (e) { item.ua = e.target.value; changed(true); });
      row.querySelector('.item-de').addEventListener('input', function (e) { item.de = e.target.value; changed(true); });
      row.querySelector('.item-price').addEventListener('input', function (e) { item.price = e.target.value; updateAmount(); changed(true); });
      row.querySelector('.item-remove').addEventListener('click', function () {
        state.items.splice(idx, 1);
        renderItems(); updateAmount(); changed();
      });
      list.appendChild(row);
    });
    $('#btn-add-item').disabled = state.items.length >= MAX_ITEMS;
  }
  $('#btn-add-item').addEventListener('click', function () {
    if (state.items.length >= MAX_ITEMS) return;
    state.items.push({ ua: '', de: '', price: '' });
    renderItems();
    $$('.item-ua').pop().focus();
    changed();
  });
  function updateAmount() {
    $('#amount').value = state.amountManual ? state.amount : itemsSum();
    $('#amount-mode').textContent = state.amountManual ? 'вказано вручну' : 'рахуємо з пунктів';
    $('#btn-reset-amount').hidden = !state.amountManual;
  }
  $('#amount').addEventListener('input', function (e) { state.amountManual = true; state.amount = e.target.value; $('#amount-mode').textContent = 'вказано вручну'; $('#btn-reset-amount').hidden = false; changed(); });
  $('#btn-reset-amount').addEventListener('click', function () { state.amountManual = false; updateAmount(); changed(); });

  /* ========= steps ========= */
  function setError(id, msg) { var el = $('[data-error-for="' + id + '"]'); if (el) el.textContent = msg || ''; }
  function validate(step) {
    setError('name_ua', ''); setError('items', '');
    if (step === 1 && !String(state.name_ua).trim()) { setError('name_ua', 'Вкажіть ім’я дитини'); return false; }
    if (step === 3 && !state.items.some(function (i) { return String(i.ua).trim(); })) { setError('items', 'Додайте хоча б один пункт'); return false; }
    return true;
  }
  function goTo(step, skip) {
    if (!skip && step > state.step) {
      for (var s = state.step; s < step; s++) if (!validate(s)) { D.toast('Заповніть обов’язкові поля', { error: true }); return; }
    }
    showStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showStep(step) {
    state.step = step;
    document.body.setAttribute('data-step', String(step));
    $$('.page').forEach(function (p) { p.classList.toggle('active', +p.dataset.step === step); });
    $$('.step-dot').forEach(function (d) {
      var s = +d.dataset.step;
      d.classList.toggle('active', s === step);
      d.classList.toggle('done', s < step);
      if (s === step) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    if (step === 4) renderFormats();
    Stage.state('step' + step);
    save();
  }
  $$('.btn-next').forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.target); }); });
  $$('.btn-back').forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.target, true); }); });
  $$('.step-dot').forEach(function (d) { d.addEventListener('click', function () { goTo(+d.dataset.step, +d.dataset.step <= state.step); }); });

  /* ========= previews ========= */
  function mountPreview(frame, fmt) {
    var F = P.FORMATS[fmt];
    var scale = document.createElement('div');
    scale.className = 'pv-scale';
    scale.innerHTML = F.render(view());
    frame.innerHTML = '';
    frame.appendChild(scale);
    fitScale(frame);
    P.fit(scale);
  }
  function fitScale(frame) {
    var scale = frame.firstChild, F = P.FORMATS[frame.getAttribute('data-fmt')];
    if (scale && F && frame.clientWidth) scale.style.transform = 'scale(' + (frame.clientWidth / F.w) + ')';
  }
  var ro = window.ResizeObserver ? new ResizeObserver(function (entries) { entries.forEach(function (en) { fitScale(en.target); }); }) : null;
  function watch(frame) { if (ro) ro.observe(frame); }

  var liveTimer = 0;
  function refresh() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () {
      if (window.matchMedia('(min-width: 1000px)').matches && state.step !== 4) mountPreview($('#liveFrame'), 'a4');
      if (state.step === 4) renderFormats();
    }, 120);
  }
  function changed() {
    save();
    refresh();
  }

  function renderFormats() {
    var box = $('#formats');
    box.innerHTML = '';
    Object.keys(P.FORMATS).forEach(function (fmt) {
      var F = P.FORMATS[fmt];
      var card = document.createElement('div');
      card.className = 'format-card';
      card.innerHTML = '<div class="format-head"><b>' + F.label + '</b><span>' + F.sub + '</span></div>' +
        '<div class="pv-frame" data-fmt="' + fmt + '"></div>' +
        '<button type="button" class="d-btn d-btn--small" data-download="' + fmt + '">' + (fmt === 'a4' ? 'Завантажити PDF' : 'Завантажити PNG') + '</button>';
      box.appendChild(card);
      var frame = card.querySelector('.pv-frame');
      mountPreview(frame, fmt);
      watch(frame);
    });
  }

  /* ========= export ========= */
  function baseName() { return (String(state.ref_id || 'D-0001').trim() || 'D-0001').replace(/[\\/:*?"<>|\s]+/g, '_'); }
  function renderFull(fmt) {
    var host = $('#exportHost');
    host.innerHTML = P.FORMATS[fmt].render(view());
    var node = host.firstChild;
    var imgs = Array.prototype.slice.call(node.querySelectorAll('img'));
    return Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; }))
      .then(function () { return document.fonts ? document.fonts.ready : null; })
      .then(function () { P.fit(node); return node; });
  }
  function pngBlob(fmt, ratio) {
    var F = P.FORMATS[fmt];
    return renderFull(fmt).then(function (node) {
      return window.htmlToImage.toBlob(node, { width: F.w, height: F.h, pixelRatio: ratio || 1, cacheBust: false, backgroundColor: '#ffffff' });
    }).then(function (blob) { $('#exportHost').innerHTML = ''; return blob; });
  }
  function pdfBlob() {
    return renderFull('a4').then(function (node) {
      return window.htmlToImage.toJpeg(node, { width: 794, height: 1123, pixelRatio: 2.5, quality: 0.93, cacheBust: false, backgroundColor: '#ffffff' });
    }).then(function (url) {
      $('#exportHost').innerHTML = '';
      var doc = new window.jspdf.jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait' });
      doc.setProperties({ title: state.name_ua + ' — Патронаж / Patenschaft (демо)' });
      doc.addImage(url, 'JPEG', 0, 0, 210, 297);
      return doc.output('blob');
    });
  }
  function fileFor(fmt) { return fmt === 'a4' ? baseName() + '.pdf' : baseName() + '_' + fmt + '.png'; }
  function make(fmt) { return fmt === 'a4' ? pdfBlob() : pngBlob(fmt, 1); }

  var busy = false;
  function withBusy(btn, label, job) {
    if (busy) return;
    busy = true;
    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = label;
    job().catch(function (e) { D.toast('Помилка: ' + e.message, { error: true }); })
      .then(function () { busy = false; btn.disabled = false; btn.textContent = original; });
  }
  $('#formats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-download]');
    if (!b) return;
    var fmt = b.getAttribute('data-download');
    withBusy(b, 'Готуємо…', function () {
      return make(fmt).then(function (blob) { D.download(blob, fileFor(fmt)); D.toast('Файл ' + fileFor(fmt) + ' готовий'); });
    });
  });
  $('#btn-zip').addEventListener('click', function () {
    var btn = this;
    withBusy(btn, 'Збираємо ZIP…', function () {
      var zip = new window.JSZip(), fmts = Object.keys(P.FORMATS);
      var chain = Promise.resolve();
      fmts.forEach(function (fmt) { chain = chain.then(function () { return make(fmt).then(function (b) { zip.file(fileFor(fmt), b); }); }); });
      return chain.then(function () { return zip.generateAsync({ type: 'blob' }); })
        .then(function (blob) { D.download(blob, baseName() + '_набір.zip'); D.toast('ZIP з чотирма файлами готовий'); });
    });
  });

  /* ========= init ========= */
  fillForm();
  showStep(state.step);
  watch($('#liveFrame'));
  refresh();
})();
