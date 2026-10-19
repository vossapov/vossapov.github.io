/* ================================
   Membership application — wizard logic (demo port)
   Same flow as the original: 5 steps → 2-page PDF (Заява + Анкета) with an on-screen signature
   or a photo of it, document photos with visual instructions. Differences in the demo:
   no network submission (the worker/e-mail call is removed), state lives in localStorage,
   the stage's tip bubble fills synthetic data (NGOStage action «prefill»), uploaded photos never leave the browser.
   ================================ */
(function () {
  'use strict';

  var $ = function (s, p) { return (p || document).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  var D = window.NGODemo;
  var store = D.store('vi-ngo-demo-membership');
  var toast = D.toast;
  var Stage = window.NGOStage || { state: function () {}, action: function () {} };

  var STATE = {
    lastName: '', firstName: '', middleName: '',
    birthDate: '', ipn: '', passport: '',
    phone: '', email: '', contactPref: [],
    education: '', occupation: '',
    otherMembership: 'no', otherMembershipName: '',
    purpose: '', ideas: '', otherInfo: '',
    signatureData: '', signatureSource: '',
    docType: '', docs: {},
    step: 1
  };

  var TEXT_FIELDS = ['lastName', 'firstName', 'middleName', 'birthDate', 'ipn', 'passport', 'phone', 'email',
    'education', 'occupation', 'otherMembershipName', 'purpose', 'ideas', 'otherInfo'];

  /* ========= PERSISTENCE ========= */
  var saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (!store.set(STATE)) {
        /* photos can exceed the browser quota: keep the form, drop the pictures */
        var lite = JSON.parse(JSON.stringify(STATE));
        lite.docs = {};
        store.set(lite);
      }
    }, 200);
  }
  function restore() {
    var saved = store.get();
    if (!saved || typeof saved !== 'object') return;
    Object.keys(STATE).forEach(function (k) { if (saved[k] !== undefined) STATE[k] = saved[k]; });
    if (!STATE.docs || typeof STATE.docs !== 'object') STATE.docs = {};
  }
  function fillInputs() {
    TEXT_FIELDS.forEach(function (id) { var el = $('#' + id); if (el) el.value = STATE[id] || ''; });
    $$('input[name="contactPref"]').forEach(function (cb) { cb.checked = STATE.contactPref.indexOf(cb.value) > -1; });
    $$('input[name="otherMembership"]').forEach(function (r) { r.checked = r.value === STATE.otherMembership; });
    $('#otherMembershipDetails').classList.toggle('hidden', STATE.otherMembership !== 'yes');
    $$('input[name="docType"]').forEach(function (r) { r.checked = r.value === STATE.docType; });
    if (STATE.signatureSource === 'photo' && STATE.signatureData) showSigPhoto(STATE.signatureData);
    counters.forEach(function (fn) { fn(); });
    renderDocSlots();
  }

  /* ========= SIMPLE INPUTS ========= */
  TEXT_FIELDS.forEach(function (id) {
    var el = $('#' + id);
    if (!el) return;
    el.addEventListener('input', function (e) { STATE[id] = e.target.value; clearError(id); save(); });
  });

  $('#ipn').addEventListener('input', function (e) {
    var cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (cleaned !== e.target.value) e.target.value = cleaned;
    STATE.ipn = cleaned;
    save();
  });

  /* phone mask: +38 (0XX) XXX-XX-XX */
  function maskPhone(v) {
    var d = v.replace(/\D/g, '');
    if (d.indexOf('38') !== 0) d = '38' + d.replace(/^3?8?/, '');
    d = d.slice(0, 12);
    var r = '+' + d.slice(0, 2);
    if (d.length > 2) r += ' (' + d.slice(2, 5);
    if (d.length >= 5) r += ')';
    if (d.length > 5) r += ' ' + d.slice(5, 8);
    if (d.length > 8) r += '-' + d.slice(8, 10);
    if (d.length > 10) r += '-' + d.slice(10, 12);
    return r;
  }
  $('#phone').addEventListener('input', function (e) {
    var masked = e.target.value.replace(/\D/g, '').length ? maskPhone(e.target.value) : '';
    e.target.value = masked;
    STATE.phone = masked;
    save();
  });

  /* birth date mask: дд.мм.рррр */
  $('#birthDate').addEventListener('input', function (e) {
    var d = e.target.value.replace(/\D/g, '').slice(0, 8);
    var r = d.slice(0, 2);
    if (d.length > 2) r += '.' + d.slice(2, 4);
    if (d.length > 4) r += '.' + d.slice(4, 8);
    e.target.value = r;
    STATE.birthDate = r;
    save();
  });

  $$('input[name="otherMembership"]').forEach(function (r) {
    r.addEventListener('change', function (e) {
      STATE.otherMembership = e.target.value;
      $('#otherMembershipDetails').classList.toggle('hidden', e.target.value !== 'yes');
      if (e.target.value !== 'yes') { STATE.otherMembershipName = ''; $('#otherMembershipName').value = ''; }
      save();
    });
  });

  $$('input[name="contactPref"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      STATE.contactPref = $$('input[name="contactPref"]:checked').map(function (c) { return c.value; });
      save();
    });
  });

  var counters = [];
  function bindCounter(inputId, counterId, limit) {
    var input = $('#' + inputId), counter = $('#' + counterId);
    if (!input || !counter) return;
    var update = function () {
      var len = input.value.length;
      counter.textContent = len + ' / ' + limit;
      counter.classList.toggle('warn', len >= Math.floor(limit * 0.9));
    };
    input.addEventListener('input', update);
    counters.push(update);
  }
  bindCounter('purpose', 'purpose-counter', 400);
  bindCounter('ideas', 'ideas-counter', 400);
  bindCounter('otherInfo', 'otherInfo-counter', 400);

  /* ========= VALIDATION ========= */
  function setError(id, msg) {
    var el = $('[data-error-for="' + id + '"]');
    if (el) el.textContent = msg || '';
    var input = $('#' + id);
    if (input) input.classList.toggle('invalid', !!msg);
  }
  function clearError(id) { setError(id, ''); }
  function clearAllErrors() {
    $$('.field-error').forEach(function (e) { e.textContent = ''; });
    $$('.big-input.invalid, .big-textarea.invalid').forEach(function (e) { e.classList.remove('invalid'); });
  }

  function validateStep(step) {
    clearAllErrors();
    var ok = true;
    var req = function (id, msg) {
      if (!String(STATE[id] || '').trim()) { setError(id, msg || 'Обов\'язкове поле'); ok = false; }
    };
    if (step === 1) {
      req('lastName'); req('firstName'); req('middleName');
      if (!STATE.birthDate) { setError('birthDate', 'Вкажіть дату народження'); ok = false; }
      else {
        var m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(STATE.birthDate), valid = false;
        if (m) {
          var dd = +m[1], mm = +m[2], yyyy = +m[3], d = new Date(yyyy, mm - 1, dd);
          valid = d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd && yyyy >= 1900 && d <= new Date();
        }
        if (!valid) { setError('birthDate', 'Дата некоректна, формат дд.мм.рррр'); ok = false; }
      }
      if (!STATE.ipn) { setError('ipn', 'Обов\'язкове поле'); ok = false; }
      else if (!/^\d{10}$/.test(STATE.ipn)) { setError('ipn', 'Має бути рівно 10 цифр'); ok = false; }
      req('passport');
    }
    if (step === 2) {
      if (!STATE.phone || STATE.phone.replace(/\D/g, '').length < 12) { setError('phone', 'Вкажіть телефон повністю'); ok = false; }
      if (!STATE.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STATE.email)) { setError('email', 'Некоректна адреса пошти'); ok = false; }
    }
    if (step === 3) req('purpose', 'Вкажіть мету вступу');
    if (step === 4 && !STATE.signatureData) { setError('signature', 'Поставте підпис або завантажте фото'); ok = false; }
    return ok;
  }

  /* ========= STEP NAVIGATION ========= */
  var pages = $$('.page'), dots = $$('.step-dot');
  var MAX_STEP = 5;

  function goTo(step, opts) {
    opts = opts || {};
    step = Math.max(1, Math.min(MAX_STEP, step));
    if (!opts.skipValidation && step > STATE.step) {
      for (var s = STATE.step; s < step; s++) {
        if (!validateStep(s)) {
          if (s !== STATE.step) showStep(s);
          toast('Заповніть обов\'язкові поля', { error: true });
          return;
        }
      }
    }
    showStep(step);
    if (!opts.noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function showStep(step) {
    STATE.step = step;
    pages.forEach(function (p) { p.classList.toggle('active', +p.dataset.step === step); });
    dots.forEach(function (d) {
      var s = +d.dataset.step;
      d.classList.toggle('active', s === step);
      d.classList.toggle('done', s < step);
      if (s === step) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    if (step === 4) prepareSignatureArea();
    if (step === 5) renderReview();
    tipState();
    save();
  }
  /* the tip bubbles outside the frame follow the step (and the finished package) */
  function tipState() { Stage.state(STATE.step === 5 && !$('#donePanel').classList.contains('hidden') ? 'done' : 'step' + STATE.step); }

  $$('.btn-next').forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.target); }); });
  $$('.btn-back').forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.target, { skipValidation: true }); }); });
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var target = +d.dataset.step;
      goTo(target, { skipValidation: target <= STATE.step });
    });
  });

  /* ========= SIGNATURE PAD ========= */
  var canvas = $('#signatureCanvas');
  var canvasWrap = canvas.parentElement;
  var signaturePad = null;

  function redrawSaved() {
    if (!signaturePad || STATE.signatureSource !== 'draw' || !STATE.signatureData) return;
    signaturePad.fromDataURL(STATE.signatureData).then(function () { canvasWrap.classList.add('has-content'); }, function () {});
  }
  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    if (signaturePad) { signaturePad.clear(); redrawSaved(); }
  }
  function initSignaturePad() {
    if (signaturePad) return;
    resizeCanvas();
    signaturePad = new window.SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: '#1d1b2b', minWidth: 0.8, maxWidth: 2.2 });
    signaturePad.addEventListener('beginStroke', function () { canvasWrap.classList.add('has-content'); });
    signaturePad.addEventListener('endStroke', function () {
      if (signaturePad.isEmpty()) { canvasWrap.classList.remove('has-content'); return; }
      STATE.signatureSource = 'draw';
      STATE.signatureData = signaturePad.toDataURL('image/png');
      clearError('signature');
      save();
    });
    redrawSaved();
  }
  function prepareSignatureArea() {
    if (!$('.sig-panel[data-sig-panel="draw"]').classList.contains('active')) return;
    initSignaturePad();
    requestAnimationFrame(function () { resizeCanvas(); });
  }
  $('#btn-clear-sig').addEventListener('click', function () {
    if (signaturePad) signaturePad.clear();
    canvasWrap.classList.remove('has-content');
    if (STATE.signatureSource === 'draw') { STATE.signatureData = ''; STATE.signatureSource = ''; save(); }
  });
  var lastWidth = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastWidth) return; /* mobile toolbars change only the height */
    lastWidth = window.innerWidth;
    if (STATE.step === 4 && $('.sig-panel[data-sig-panel="draw"]').classList.contains('active')) resizeCanvas();
  });

  $$('.sig-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.dataset.sigTab;
      $$('.sig-tab').forEach(function (t) { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      $$('.sig-panel').forEach(function (p) { p.classList.toggle('active', p.dataset.sigPanel === target); });
      if (target === 'draw') prepareSignatureArea();
    });
  });

  var sigPhotoInput = $('#sigPhoto'), sigPreview = $('#sigPreview'), sigPreviewWrap = $('#sigPreviewWrap'), sigUploadBtn = $('.sig-upload-btn');
  function showSigPhoto(src) {
    sigPreview.src = src;
    sigPreviewWrap.classList.remove('hidden');
    sigUploadBtn.classList.add('hidden');
  }
  sigPhotoInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    readImage(file, 900).then(function (url) {
      showSigPhoto(url);
      STATE.signatureSource = 'photo';
      STATE.signatureData = url;
      clearError('signature');
      save();
    });
  });
  $('#btn-clear-photo').addEventListener('click', function () {
    sigPhotoInput.value = '';
    sigPreview.removeAttribute('src');
    sigPreviewWrap.classList.add('hidden');
    sigUploadBtn.classList.remove('hidden');
    if (STATE.signatureSource === 'photo') { STATE.signatureData = ''; STATE.signatureSource = ''; save(); }
  });

  /* images are downscaled in the browser so they fit local storage; nothing is uploaded */
  function readImage(file, max) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { resolve(reader.result); };
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k));
          c.height = Math.max(1, Math.round(img.height * k));
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ========= REVIEW ========= */
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }
  function renderReview() {
    var fio = [STATE.lastName, STATE.firstName, STATE.middleName].filter(Boolean).join(' ');
    var otherMemb = STATE.otherMembership === 'yes' ? (STATE.otherMembershipName || 'Так') : 'Ні';
    var section = function (title, step, rows, extra) {
      return '<div class="review-section"><div class="review-section-head"><div class="review-section-title">' + title +
        '</div><button type="button" class="review-edit" data-edit-step="' + step + '">Змінити</button></div><div class="review-body">' +
        rows.map(function (r) {
          return '<div class="review-row"><div class="review-key">' + r[0] + '</div><div class="review-val ' + (r[1] ? '' : 'empty') + '">' +
            (r[1] ? escapeHtml(r[1]) : '—') + '</div></div>';
        }).join('') + (extra || '') + '</div></div>';
    };
    var sigExtra = '<div class="review-row"><div class="review-key">Підпис</div><div class="review-val' + (STATE.signatureData ? '' : ' empty') + '">' +
      (STATE.signatureData ? '<img src="' + STATE.signatureData + '" class="review-sig-img" alt="Підпис">' : '—') + '</div></div>';
    $('#review').innerHTML =
      section('Особисті дані', 1, [['ПІБ', fio], ['Дата народження', STATE.birthDate], ['РНОКПП (ІПН)', STATE.ipn], ['Паспорт / ID', STATE.passport]]) +
      section('Контакти', 2, [['Телефон', STATE.phone], ['Пошта', STATE.email], ['Спосіб зв\'язку', STATE.contactPref.join(', ')]]) +
      section('Анкета', 3, [['Освіта', STATE.education], ['Місце роботи / служби', STATE.occupation], ['Член інших ГО', otherMemb],
        ['Мета вступу', STATE.purpose], ['Ідеї та проєкти', STATE.ideas], ['Інша інформація', STATE.otherInfo]]) +
      section('Підпис', 4, [], sigExtra);
    $$('.review-edit').forEach(function (b) {
      b.addEventListener('click', function () { goTo(+b.dataset.editStep, { skipValidation: true }); });
    });
    if (!$('#pdfPreview').classList.contains('hidden')) renderPreview();
  }

  /* ========= PDF ========= */
  var DEMO_MARK = '<div class="pdf-demo-mark">Демо-документ · вигадані дані</div>';
  function fillPdfPages() {
    var data = JSON.parse(JSON.stringify(STATE));
    $('#pdfPage1').innerHTML = window.PDF_TEMPLATE.renderZayava(data) + DEMO_MARK;
    $('#pdfPage2').innerHTML = window.PDF_TEMPLATE.renderAnketa(data) + DEMO_MARK;
  }
  function renderPreview() {
    fillPdfPages();
    var box = $('#pdfPreview');
    box.innerHTML = '';
    ['#pdfPage1', '#pdfPage2'].forEach(function (sel) {
      var sheet = document.createElement('div');
      sheet.className = 'pdf-preview-sheet';
      var clone = $(sel).cloneNode(true);
      clone.removeAttribute('id');
      sheet.appendChild(clone);
      box.appendChild(sheet);
    });
    scalePreview();
  }
  function scalePreview() {
    $$('.pdf-preview-sheet').forEach(function (sheet) {
      var page = sheet.firstChild;
      if (page) page.style.transform = 'scale(' + (sheet.clientWidth / 794) + ')';
    });
  }
  window.addEventListener('resize', scalePreview);
  $('#btn-preview').addEventListener('click', function () {
    var box = $('#pdfPreview'), open = box.classList.contains('hidden');
    box.classList.toggle('hidden', !open);
    this.setAttribute('aria-expanded', String(open));
    this.textContent = open ? 'Сховати перегляд' : 'Переглянути заяву';
    if (open) renderPreview();
  });

  function buildPdfDoc() {
    fillPdfPages();
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait' });
    /* fixed A4 pixel size so a phone viewport does not shrink the capture */
    var opts = { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 794, height: 1123, windowWidth: 794, windowHeight: 1123 };
    return window.html2canvas($('#pdfPage1'), opts).then(function (c1) {
      doc.addImage(c1.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      doc.addPage();
      return window.html2canvas($('#pdfPage2'), opts);
    }).then(function (c2) {
      doc.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      return doc;
    });
  }
  function pdfFilename() { return 'Заява_' + (STATE.lastName.trim() || 'вступ') + '.pdf'; }

  var btnPdf = $('#btn-pdf');
  btnPdf.addEventListener('click', function () {
    if (![1, 2, 3, 4].every(validateStep)) { toast('Заповніть обов\'язкові поля', { error: true }); return; }
    var original = btnPdf.textContent;
    btnPdf.disabled = true;
    btnPdf.textContent = 'Готуємо PDF…';
    buildPdfDoc().then(function (doc) {
      D.download(doc.output('blob'), pdfFilename());
      toast('PDF завантажено');
    }).catch(function (e) {
      toast('Помилка: ' + e.message, { error: true });
    }).then(function () { btnPdf.disabled = false; btnPdf.textContent = original; });
  });

  /* ========= DOCUMENT PHOTOS (with a visual instruction per slot) ========= */
  var GUIDE_FRAME = '<path d="M14 26v-10h10M136 16h10v10M146 84v10h-10M24 94H14V84" fill="none" stroke="#5b4fd6" stroke-width="3" stroke-linecap="round"/>';
  function guideSvg(kind) {
    var body;
    if (kind === 'card-front') {
      body = '<rect x="24" y="24" width="112" height="62" rx="7" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<rect x="32" y="34" width="26" height="34" rx="3" fill="#d9d6ea"/><circle cx="45" cy="46" r="6" fill="#a9a5c4"/>' +
        '<path d="M66 38h50M66 48h40M66 58h56M66 68h30" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>';
    } else if (kind === 'card-back') {
      body = '<rect x="24" y="24" width="112" height="62" rx="7" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<path d="M34 36h44M34 46h30" stroke="#8a879c" stroke-width="3.5" stroke-linecap="round"/>' +
        '<rect x="96" y="32" width="30" height="20" rx="2" fill="#d9d6ea"/>' +
        '<path d="M32 66h96M32 72h96M32 78h96" stroke="#1d1b2b" stroke-width="2.4" stroke-dasharray="3 2"/>';
    } else if (kind === 'book-p1' || kind === 'book-p2') {
      body = '<rect x="30" y="20" width="100" height="70" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/><path d="M80 20v70" stroke="#1d1b2b" stroke-width="1.5"/>' +
        (kind === 'book-p1'
          ? '<path d="M38 32h34M38 42h28M38 52h34M38 62h22" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/><rect x="88" y="30" width="20" height="26" rx="2" fill="#d9d6ea"/><circle cx="98" cy="40" r="5" fill="#a9a5c4"/><path d="M88 66h34M88 76h28" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>'
          : '<path d="M38 32h34M38 42h28M38 52h34" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/><circle cx="102" cy="52" r="14" fill="none" stroke="#a9a5c4" stroke-width="2.5"/><path d="M88 32h30" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>');
    } else {
      body = '<rect x="36" y="20" width="88" height="70" rx="4" fill="#fff" stroke="#1d1b2b" stroke-width="2"/>' +
        '<path d="M46 32h68M46 42h50" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="46" y="54" width="68" height="14" rx="2" fill="#d9d6ea"/><path d="M52 61h56" stroke="#1d1b2b" stroke-width="2.4" stroke-dasharray="4 3"/>' +
        '<path d="M46 78h40" stroke="#8a879c" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 160 110" role="img"><rect width="160" height="110" rx="12" fill="#ece9fd"/>' + body + GUIDE_FRAME + '</svg>';
  }

  var DOC_SETS = {
    card: [
      { id: 'passportFront', guide: 'card-front', label: 'Лицьова сторона ID-картки', hint: 'Картка цілком у рамці, фото й дані читаються.', fileBase: 'Паспорт-картка_лицьова' },
      { id: 'passportBack', guide: 'card-back', label: 'Зворотна сторона ID-картки', hint: 'Видно всі три рядки внизу картки.', fileBase: 'Паспорт-картка_зворотна' }
    ],
    booklet: [
      { id: 'passportP1', guide: 'book-p1', label: '1-а сторінка паспорта', hint: 'Розгорніть паспорт, обидві половини розвороту в кадрі.', fileBase: 'Паспорт-сторінка-1' },
      { id: 'passportP2', guide: 'book-p2', label: '2-а сторінка паспорта', hint: 'Розворот із печаткою, без пальців на тексті.', fileBase: 'Паспорт-сторінка-2' },
      { id: 'ipnPhoto', guide: 'ipn', label: 'Картка ІПН (РНОКПП)', hint: 'Номер із 10 цифр має бути чітким.', fileBase: 'ІПН' }
    ]
  };

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function renderDocSlots() {
    var box = $('#docSlotsContainer');
    box.innerHTML = '';
    $('#photoRules').hidden = !STATE.docType;
    if (!STATE.docType) return;
    DOC_SETS[STATE.docType].forEach(function (slot) {
      var node = $('#docSlotTpl').content.cloneNode(true);
      var root = node.querySelector('.doc-slot');
      root.dataset.docId = slot.id;
      root.querySelector('.doc-slot-guide').innerHTML = guideSvg(slot.guide);
      root.querySelector('.doc-slot-label').textContent = slot.label;
      root.querySelector('.doc-slot-hint').textContent = slot.hint;
      root.querySelector('.doc-slot-error').setAttribute('data-error-for', slot.id);
      root.querySelector('input[type="file"]').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        readImage(file, 1200).then(function (url) {
          STATE.docs[slot.id] = { name: file.name, size: file.size, dataUrl: url };
          applySlotPreview(root, STATE.docs[slot.id]);
          clearError(slot.id);
          save();
        });
        e.target.value = '';
      });
      root.querySelector('.doc-slot-remove').addEventListener('click', function () {
        delete STATE.docs[slot.id];
        root.classList.remove('filled');
        root.querySelector('.doc-slot-btn').classList.remove('hidden');
        root.querySelector('.doc-slot-preview').classList.add('hidden');
        save();
      });
      box.appendChild(node);
      if (STATE.docs[slot.id]) applySlotPreview(box.querySelector('.doc-slot[data-doc-id="' + slot.id + '"]'), STATE.docs[slot.id]);
    });
  }
  function applySlotPreview(root, doc) {
    root.classList.add('filled');
    root.querySelector('.doc-slot-thumb').src = doc.dataUrl;
    root.querySelector('.doc-slot-filename').textContent = doc.name;
    root.querySelector('.doc-slot-size').textContent = formatBytes(doc.size);
    root.querySelector('.doc-slot-btn').classList.add('hidden');
    root.querySelector('.doc-slot-preview').classList.remove('hidden');
  }
  $$('input[name="docType"]').forEach(function (r) {
    r.addEventListener('change', function (e) {
      STATE.docType = e.target.value;
      var valid = DOC_SETS[STATE.docType].map(function (s) { return s.id; });
      Object.keys(STATE.docs).forEach(function (id) { if (valid.indexOf(id) < 0) delete STATE.docs[id]; });
      renderDocSlots();
      clearError('docType');
      $('#donePanel').classList.add('hidden');
      tipState();
      save();
    });
  });

  /* ========= FINISH: build the package locally ========= */
  var btnFinish = $('#btn-finish');
  btnFinish.addEventListener('click', function () {
    if (![1, 2, 3, 4].every(validateStep)) { toast('Заповніть усі обов\'язкові поля', { error: true }); return; }
    if (!STATE.docType) { setError('docType', 'Оберіть тип документа'); toast('Оберіть тип документа', { error: true }); return; }
    var slots = DOC_SETS[STATE.docType];
    var missing = slots.filter(function (s) { return !STATE.docs[s.id]; });
    if (missing.length) {
      missing.forEach(function (s) { setError(s.id, 'Додайте фото'); });
      toast('Додайте всі фото документів', { error: true });
      return;
    }
    var original = btnFinish.textContent;
    btnFinish.disabled = true;
    btnFinish.textContent = 'Формуємо пакет…';
    buildPdfDoc().then(function (doc) {
      var blob = doc.output('blob');
      var items = ['<li>' + escapeHtml(pdfFilename()) + ' — ' + formatBytes(blob.size) + ', 2 сторінки</li>'].concat(slots.map(function (s) {
        return '<li>' + escapeHtml(s.fileBase) + '.jpg — ' + formatBytes(STATE.docs[s.id].size) + '</li>';
      }));
      $('#doneList').innerHTML = items.join('');
      $('#donePanel').classList.remove('hidden');
      $('#donePanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      tipState();
    }).catch(function (e) {
      toast('Помилка: ' + e.message, { error: true });
    }).then(function () { btnFinish.disabled = false; btnFinish.textContent = original; });
  });

  /* ========= PREFILL (synthetic person) ========= */
  function sampleSignature() {
    var c = document.createElement('canvas');
    c.width = 600; c.height = 200;
    var ctx = c.getContext('2d');
    ctx.strokeStyle = '#1d1b2b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(70, 130);
    ctx.bezierCurveTo(100, 40, 140, 40, 135, 120);
    ctx.bezierCurveTo(132, 160, 170, 70, 205, 95);
    ctx.bezierCurveTo(240, 120, 250, 60, 290, 85);
    ctx.bezierCurveTo(330, 110, 340, 130, 380, 92);
    ctx.bezierCurveTo(410, 64, 450, 110, 520, 80);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(150, 150); ctx.bezierCurveTo(260, 140, 380, 150, 470, 132); ctx.stroke();
    return c.toDataURL('image/png');
  }
  function samplePhoto(slot) {
    var portrait = slot.guide === 'book-p1' || slot.guide === 'book-p2';
    var c = document.createElement('canvas');
    c.width = portrait ? 900 : 860; c.height = portrait ? 640 : 540;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#d8d5e4'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(40, 40, c.width - 80, c.height - 80);
    ctx.fillStyle = '#c9c5dd'; ctx.fillRect(80, 90, 170, 220);
    ctx.fillStyle = '#8a879c';
    for (var i = 0; i < 5; i++) ctx.fillRect(290, 100 + i * 46, 360 - i * 30, 14);
    ctx.fillStyle = '#5b4fd6';
    ctx.font = '600 54px "Fixel Text", system-ui, sans-serif';
    ctx.fillText('ЗРАЗОК · ДЕМО', 80, c.height - 90);
    ctx.font = '400 28px "Fixel Text", system-ui, sans-serif';
    ctx.fillStyle = '#5b5870';
    ctx.fillText(slot.label, 80, c.height - 140);
    var url = c.toDataURL('image/jpeg', 0.8);
    return { name: slot.fileBase + '_зразок.jpg', size: Math.round(url.length * 0.75), dataUrl: url };
  }
  function prefill() {
    Object.assign(STATE, {
      lastName: 'Зразкова', firstName: 'Марія', middleName: 'Іванівна',
      birthDate: '01.01.1990', ipn: '0000000000', passport: 'ДЕ 000000',
      phone: '+38 (000) 000-00-00', email: 'maria.demo@example.org', contactPref: ['Електронна пошта', 'Месенджери'],
      education: 'Вища, соціальна робота',
      occupation: 'Бібліотека громади, координаторка програм',
      otherMembership: 'no', otherMembershipName: '',
      purpose: 'Хочу долучитися до волонтерських проєктів організації у своїй громаді й допомагати з подіями для молоді.',
      ideas: 'Розмовний клуб для підлітків раз на тиждень у бібліотеці.',
      otherInfo: '',
      signatureData: sampleSignature(), signatureSource: 'draw',
      docType: 'card', docs: {}
    });
    DOC_SETS.card.forEach(function (slot) { STATE.docs[slot.id] = samplePhoto(slot); });
    fillInputs();
    clearAllErrors();
    if (signaturePad) { signaturePad.clear(); redrawSaved(); }
    if (STATE.step === 5) renderReview();
    save();
    toast('Заповнено вигаданими даними');
  }
  Stage.action('prefill', prefill);

  /* ========= INIT ========= */
  restore();
  fillInputs();
  showStep(STATE.step || 1);
})();
