/* Synthetic sample "files" for the demo. Nothing is uploaded: a record only says which sample it is,
   and the picture is drawn here on demand. Every picture is stamped ЗРАЗОК · ДЕМО / SAMPLE · DEMO. */
(function () {
  'use strict';
  var TITLES = {
    idFront: ['ID-картка: лицьова сторона', 'ID card: front'], idBack: ['ID-картка: зворотна сторона', 'ID card: back'],
    idReg: ['Витяг про місце проживання', 'Residence extract'], bookPhoto: ['Паспорт-книжечка: розвороти з фото', 'Passport booklet: photo pages'],
    bookReg: ['Сторінка з реєстрацією', 'Registration page'], ipn: ['Довідка РНОКПП (ІПН)', 'Taxpayer number certificate'],
    iban: ['Довідка з банку про IBAN', 'Bank IBAN certificate'], receipt: ['Чек', 'Receipt'], evidence: ['Фото обладнання на місці', 'Photo of equipment in place'],
    video: ['Відеовізитівка', 'Video introduction']
  };
  function title(label, lang) { var t = TITLES[label] || [label, label]; return lang === 'en' ? t[1] : t[0]; }
  var cache = {};
  function draw(f, opts) {
    opts = opts || {};
    var key = f.id + ':' + (opts.lang || 'ua') + ':' + (opts.amount || '');
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas'), w = 900, h = f.label === 'receipt' ? 1100 : 600;
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#e9e7f2'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ffffff';
    if (f.label === 'receipt') {
      x.fillRect(220, 40, 460, h - 80);
      x.fillStyle = '#1d1b2b'; x.font = '600 30px "Fixel Text", system-ui, sans-serif'; x.fillText(opts.supplier || '—', 250, 110);
      x.fillStyle = '#a9a5c4';
      for (var i = 0; i < 9; i++) x.fillRect(250, 160 + i * 52, 400 - (i % 3) * 60, 14);
      x.fillStyle = '#1d1b2b'; x.font = '700 40px "Fixel Text", system-ui, sans-serif'; x.fillText(opts.amount || '', 250, h - 220);
      x.font = '400 26px "Fixel Text", system-ui, sans-serif'; x.fillText(opts.date || '', 250, h - 170);
    } else {
      x.fillRect(40, 40, w - 80, h - 80);
      x.fillStyle = '#d6d2e8'; x.fillRect(80, 90, w * 0.28, h * 0.45);
      x.fillStyle = '#a9a5c4';
      for (var k = 0; k < 4; k++) x.fillRect(w * 0.42, 100 + k * 50, w * (0.45 - k * 0.06), 16);
      x.fillStyle = '#5b5870'; x.font = '400 28px "Fixel Text", system-ui, sans-serif'; x.fillText(title(f.label, opts.lang), 80, h - 74);
    }
    x.save(); x.translate(w / 2, h / 2); x.rotate(-0.35);
    x.fillStyle = 'rgba(91, 79, 214, .22)'; x.font = '800 74px "Fixel Text", system-ui, sans-serif'; x.textAlign = 'center';
    x.fillText(opts.lang === 'en' ? 'SAMPLE · DEMO' : 'ЗРАЗОК · ДЕМО', 0, 20); x.restore();
    if (f.variant === 'blurred') {
      var c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      var y = c2.getContext('2d'); y.filter = 'blur(7px)'; y.drawImage(c, 0, 0);
      if (f.label !== 'receipt') { y.filter = 'none'; y.fillStyle = '#e9e7f2'; y.fillRect(0, h - 150, w, 150); }
      c = c2;
    }
    cache[key] = c.toDataURL('image/jpeg', 0.82);
    return cache[key];
  }
  function photo(label, lang) {
    return draw({ id: 'photo-' + label, label: 'evidence', variant: '' }, { lang: lang });
  }
  window.MGSamples = { draw: draw, title: title, photo: photo };
})();
