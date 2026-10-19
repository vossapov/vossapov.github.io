/* Files the organiser needs, generated in the browser from the applicant's form:
   the 16-slide presentation (.pptx via PptxGenJS + an HTML preview of the same slides),
   the budget in the Annex 4 layout (.xlsx via SheetJS) and the list of cost items (.docx, built
   with JSZip). The templates are rebuilt here; no organiser file is copied. */
(function () {
  'use strict';

  var C = window.MGChecks;
  var ORG = window.MGData.ORG;
  var VULNS = ['Люди з інвалідністю (особиста чи члена родини)', 'Родина ВПО', 'Родина, постраждала від війни', 'Одинокі батьки',
    'Домогосподарство, очолюване жінкою без дієздатних чоловіків 18–60 років', 'Родина з трьома і більше дітьми',
    'Родина з вагітною або годуючою жінкою', 'Родина з низьким доходом', 'Ветерани війни та члени їхніх родин'];

  function v(x) { return String(x == null ? '' : x).trim() || '—'; }
  function money(n) { return C.fmt(n) + ' грн'; }
  function safe(s) { return String(s || '').trim().replace(/[\\/:*?"<>|\s]+/g, '_'); }
  function personPart(f) { return [safe(f.lastName) || 'Прізвище', safe(f.firstName) || 'Ім’я'].join('_'); }
  function names(app) {
    var p = personPart(app.form || {});
    return {
      pptx: 'Мікрогрант_' + p + '.pptx',
      xlsx: 'Annex_4_MBG_' + p + '.xlsx',
      docx: 'Перелік_статей_витрат_' + p + '.docx'
    };
  }
  function perPerson(f) {
    var inc = parseFloat(String(f.familyIncome || '').replace(/\s/g, '')), m = parseFloat(f.members);
    return inc > 0 && m > 0 ? C.fmt(inc / m) + ' грн' : '—';
  }

  /* the 16 slides of the template, filled from the form */
  function slides(app) {
    var f = app.form || {}, items = app.items || [], t = C.totals(items);
    var today = new Date();
    var date = String(today.getDate()).padStart(2, '0') + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + today.getFullYear();
    var vul = (f.vulnerabilities || []).slice();
    if (f.otherVuln) vul.push('Інше: ' + f.otherVuln);
    var photos = app.photos || [];
    var S = [
      { type: 'title', title: v(f.ideaTitle), sub: [f.lastName, f.firstName].filter(Boolean).join(' ') || '—', date: date },
      { title: 'Інформація про учасника', rows: [['Вік', f.age], ['Склад родини', f.family], ['Середньомісячний дохід сім’ї та на одного члена родини', (f.familyIncome ? f.familyIncome + ' грн' : '—') + ' · на особу ' + perPerson(f)],
        ['Громада', f.community], ['Населений пункт проживання', f.settlement], ['Освіта', f.education], ['Інша інформація', f.otherInfo]] },
      { title: 'Вразливості учасника / родини', rows: VULNS.map(function (x) { return [x, vul.indexOf(x) > -1 ? 'так' : '']; }).concat([['Інше', f.otherVuln]]) },
      { title: 'Інформація про бізнес', rows: [['Чи має бізнес офіційну реєстрацію', f.registered], ['Чи є бізнес основним джерелом доходу', f.mainIncome],
        ['Чи має бізнес працевлаштованих осіб', f.employees], ['Чи будуть відкриті робочі місця', f.newJobs], ['Досвід ведення бізнесу', f.experience],
        ['Отримані раніше гранти', f.grants]] },
      { title: 'Інформація про бізнес-ідею', rows: [['Назва бізнесу чи бізнес-ідеї', f.ideaTitle], ['Опис: що, кому, де, чому потрібно', f.ideaDesc], ['Попит у громаді', f.demand]] },
      { title: 'Мета використання гранту', rows: [['Основна мета', f.goal], ['Вплив на дохід учасника й родини', f.incomeImpact]] },
      { type: 'budget', title: 'Бюджет бізнес-ідеї', total: f.totalNeeded, grant: f.grantRequested, items: items, totals: t },
      { title: 'Власний внесок і готовність до закупівель', rows: [['Власний внесок (сума, на що)', (f.ownContribution ? f.ownContribution + ' грн' : '0 грн') + (f.ownUse ? ' — ' + f.ownUse : '')], ['Опрацювання закупівель', f.procurement]] },
      { title: 'Залучення клієнтів і розвиток', rows: [['Як залучаєте клієнтів зараз і після гранту', f.clients], ['Плани подальшого розвитку', f.development]] },
      { title: 'Очікуваний дохід і строки', rows: [['Орієнтовний дохід', f.incomeForecast], ['Коли перші результати й чому', f.firstResults]] },
      { title: 'Мотивація', rows: [['Чому варто підтримати бізнес', f.motivation]] },
      { title: 'Підтримка стартапу', rows: f.startup === 'yes' ? [['Навчання, консультації, клієнти, план Б', f.startupText]] : [['Чи стосується', 'Не застосовується: бізнес уже працює']] }
    ];
    for (var i = 0; i < 3; i++) S.push({ type: 'photo', title: 'Фото бізнесу', photo: photos[i] || null });
    S.push({ type: 'end', title: 'Дякуємо за увагу!', sub: ORG.name });
    return S;
  }

  /* ---------- HTML preview of the slides ---------- */
  function esc(s) { return window.NGODemo.esc(s); }
  function previewHtml(app) {
    return slides(app).map(function (s, i) {
      var body;
      if (s.type === 'title') {
        body = '<div class="sl-title-page"><span class="sl-kicker">Презентація бізнес-ідеї</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.sub) + '</p><p class="sl-date">Дата: ' + esc(s.date) + '</p></div>';
      } else if (s.type === 'budget') {
        body = '<h3>' + s.title + '</h3><p class="sl-line">Загальна сума: <b>' + esc(v(s.total)) + ' грн</b> · сума гранту: <b>' + esc(v(s.grant)) + ' грн</b></p>' +
          '<table class="sl-table sl-table--budget"><tr><th>Стаття витрат</th><th>Од.</th><th>К-сть</th><th>Ціна</th><th>Разом</th><th>Джерело</th></tr>' +
          s.items.map(function (it) {
            return '<tr><td>' + esc(it.name) + '</td><td>' + esc(it.unit) + '</td><td>' + esc(it.qty) + '</td><td>' + esc(C.fmt(parseFloat(it.price) || 0)) + '</td><td>' +
              esc(C.fmt(C.itemTotal(it))) + '</td><td>' + (it.source === 'own' ? 'власні' : 'грант') + '</td></tr>';
          }).join('') + '</table>';
      } else if (s.type === 'photo') {
        body = '<h3>' + s.title + '</h3>' + (s.photo ? '<figure class="sl-photo"><img src="' + s.photo.dataUrl + '" alt=""><figcaption>' + esc(s.photo.caption || '') + '</figcaption></figure>'
          : '<div class="sl-photo sl-photo--empty">Фото не додано</div>');
      } else if (s.type === 'end') {
        body = '<div class="sl-title-page"><h3>' + s.title + '</h3><p>' + esc(s.sub) + '</p></div>';
      } else {
        body = '<h3>' + s.title + '</h3><table class="sl-table">' + s.rows.map(function (r) {
          return '<tr><th>' + esc(r[0]) + '</th><td' + (String(r[1] || '').trim() ? '' : ' class="sl-empty"') + '>' + esc(v(r[1])) + '</td></tr>';
        }).join('') + '</table>';
      }
      return '<div class="sl"><span class="sl-n">' + (i + 1) + '</span>' + body + '</div>';
    }).join('');
  }

  /* ---------- PPTX ---------- */
  function pptx(app) {
    var P = new window.PptxGenJS();
    P.layout = 'LAYOUT_WIDE';
    P.title = 'Презентація бізнес-ідеї (демо)';
    var ink = '1D1B2B', soft = 'F6F5FB', font = 'Arial';
    slides(app).forEach(function (s, i) {
      var sl = P.addSlide();
      sl.background = { color: 'FFFFFF' };
      sl.addText(String(i + 1), { x: 12.6, y: 7.0, w: 0.5, h: 0.3, fontSize: 9, color: '8A879C', fontFace: font, align: 'right' });
      if (s.type === 'title' || s.type === 'end') {
        if (s.type === 'title') sl.addText('Презентація бізнес-ідеї', { x: 0.8, y: 1.6, w: 11.7, h: 0.5, fontSize: 16, color: '5B5870', fontFace: font });
        sl.addText(s.title, { x: 0.8, y: 2.2, w: 11.7, h: 1.6, fontSize: 36, bold: true, color: ink, fontFace: font });
        sl.addText(s.sub, { x: 0.8, y: 4.0, w: 11.7, h: 0.6, fontSize: 20, color: ink, fontFace: font });
        if (s.date) sl.addText('Дата: ' + s.date, { x: 0.8, y: 4.7, w: 11.7, h: 0.5, fontSize: 14, color: '5B5870', fontFace: font });
        return;
      }
      sl.addText(s.title, { x: 0.6, y: 0.35, w: 12, h: 0.7, fontSize: 26, bold: true, color: ink, fontFace: font });
      if (s.type === 'budget') {
        sl.addText('Загальна сума: ' + v(s.total) + ' грн    Сума гранту: ' + v(s.grant) + ' грн', { x: 0.6, y: 1.1, w: 12, h: 0.4, fontSize: 14, color: ink, fontFace: font });
        var head = ['№', 'Стаття витрат', 'Од.', 'К-сть', 'Ціна, грн', 'Разом, грн', 'Джерело'].map(function (h) { return { text: h, options: { bold: true, fill: { color: soft } } }; });
        var rows = [head].concat(s.items.map(function (it, k) {
          return [String(k + 1), it.name || '', it.unit || '', String(it.qty || ''), C.fmt(parseFloat(it.price) || 0), C.fmt(C.itemTotal(it)), it.source === 'own' ? 'власні' : 'грант'];
        }));
        sl.addTable(rows, { x: 0.6, y: 1.65, w: 12.1, colW: [0.5, 5.4, 0.9, 0.9, 1.4, 1.6, 1.4], fontSize: 11, fontFace: font, color: ink, border: { type: 'solid', color: 'DDDBE6', pt: 0.75 }, valign: 'middle' });
        return;
      }
      if (s.type === 'photo') {
        if (s.photo) {
          sl.addImage({ data: s.photo.dataUrl, x: 2.6, y: 1.3, w: 8, h: 5, sizing: { type: 'contain', w: 8, h: 5 } });
          if (s.photo.caption) sl.addText(s.photo.caption, { x: 0.6, y: 6.45, w: 12, h: 0.4, fontSize: 13, color: '5B5870', fontFace: font, align: 'center' });
        } else sl.addText('Фото не додано', { x: 0.6, y: 3.2, w: 12, h: 0.6, fontSize: 16, color: '8A879C', fontFace: font, align: 'center' });
        return;
      }
      var trows = s.rows.map(function (r) { return [{ text: r[0], options: { bold: true, fill: { color: soft } } }, String(r[1] || '').trim() || '—']; });
      sl.addTable(trows, { x: 0.6, y: 1.3, w: 12.1, colW: [4.3, 7.8], fontSize: s.rows.length > 7 ? 11 : 13, fontFace: font, color: ink, border: { type: 'solid', color: 'DDDBE6', pt: 0.75 }, valign: 'top' });
    });
    return P.write({ outputType: 'blob' });
  }

  /* ---------- XLSX in the Annex 4 layout ---------- */
  function xlsx(app) {
    var f = app.form || {}, X = window.XLSX;
    var grantItems = (app.items || []).filter(function (it) { return it.source !== 'own'; });
    var rows = Math.max(15, grantItems.length);
    var aoa = [[], ['Costed Budget Template for Micro Business Grants / Кошторис витрат для грантів для мікропідприємств'], [], [],
      ['ПІБ УЧАСНИКА / Назва бізнес-ідеї\nPARTICIPANT\'S NAME / Business idea name', '', [f.lastName, f.firstName].filter(Boolean).join(' ') + ' / ' + (f.ideaTitle || '')], [],
      ['#', 'Item name / Назва товару', 'Estimated cost (UAH) / Орієнтовна вартість (грн)', 'Чи контактували ви з виробниками обладнання?', 'Чи встигнете ви закупити товар протягом місяця?', 'Comments from the applicant / Коментарі від заявника', 'Comments from the organiser staff / Коментарі організатора']];
    for (var i = 0; i < rows; i++) {
      var it = grantItems[i];
      if (!it) { aoa.push([i + 1, '', 0]); continue; }
      var kind = it.kind === 'equipment' ? 'Обладнання, нове, в наявності в Україні' : (it.kind === 'services' ? 'Послуги' : 'Матеріали');
      aoa.push([i + 1, it.name + ' — ' + (it.qty || 1) + ' ' + (it.unit || 'шт.') + ' × ' + C.fmt(parseFloat(it.price) || 0) + ' грн', C.itemTotal(it),
        it.link || '', it.deliveryDays ? 'Доставка — ' + it.deliveryDays + ' дн.' : '', [kind, it.comment].filter(Boolean).join('. '), '']);
    }
    var last = 7 + rows;
    aoa.push(['Total costs / Загальні витрати', '', null]);
    var ws = X.utils.aoa_to_sheet(aoa);
    var total = C.totals(app.items || []).grant;
    ws['C' + (last + 1)] = { t: 'n', f: 'SUM(C8:C' + last + ')', v: total };
    ws['!merges'] = [X.utils.decode_range('A2:F4'), X.utils.decode_range('A5:B6'), X.utils.decode_range('C5:G6'), X.utils.decode_range('A' + (last + 1) + ':B' + (last + 1))];
    ws['!cols'] = [{ wch: 5.5 }, { wch: 52 }, { wch: 23 }, { wch: 34 }, { wch: 22 }, { wch: 36 }, { wch: 37 }];
    var wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'MBG_costed_budget');
    var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    return Promise.resolve(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  }

  /* ---------- DOCX: list of cost items ---------- */
  function xml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function para(text, opts) {
    opts = opts || {};
    return '<w:p>' + (opts.center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '') + '<w:r><w:rPr>' + (opts.bold ? '<w:b/>' : '') + '<w:sz w:val="' + (opts.size || 22) + '"/></w:rPr><w:t xml:space="preserve">' + xml(text) + '</w:t></w:r></w:p>';
  }
  function cell(text, w, bold) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + para(text, { bold: bold, size: 20 }) + '</w:tc>';
  }
  function docx(app) {
    var f = app.form || {};
    var grantItems = (app.items || []).filter(function (it) { return it.source !== 'own'; });
    var W = [600, 4600, 1100, 1500, 1600];
    var head = ['№', 'Стаття витрат', 'Кількість', 'Ціна, грн', 'Сума, грн'];
    var border = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="4" w:color="999999"/>'; }).join('') + '</w:tblBorders>';
    var table = '<w:tbl><w:tblPr><w:tblW w:w="9400" w:type="dxa"/>' + border + '</w:tblPr><w:tblGrid>' + W.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' +
      '<w:tr>' + head.map(function (h, i) { return cell(h, W[i], true); }).join('') + '</w:tr>' +
      grantItems.map(function (it, i) {
        return '<w:tr>' + [String(i + 1), it.name, (it.qty || '') + ' ' + (it.unit || ''), C.fmt(parseFloat(it.price) || 0), C.fmt(C.itemTotal(it))].map(function (x, k) { return cell(x, W[k]); }).join('') + '</w:tr>';
      }).join('') +
      '<w:tr>' + cell('', W[0]) + cell('Разом', W[1], true) + cell('', W[2]) + cell('', W[3]) + cell(C.fmt(C.totals(app.items || []).grant), W[4], true) + '</w:tr></w:tbl>';
    var body = para('Перелік статей витрат', { bold: true, size: 32, center: true }) +
      para('Учасник: ' + [f.lastName, f.firstName].filter(Boolean).join(' ')) + para('Бізнес-ідея: ' + (f.ideaTitle || '')) + para('') + table + para('') +
      para('Сформовано автоматично з кошторису в кабінеті учасника. Демо-документ, дані вигадані.', { size: 18 });
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var zip = new window.JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml', doc);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  window.MGOutputs = { slides: slides, previewHtml: previewHtml, pptx: pptx, xlsx: xlsx, docx: docx, names: names, VULNS: VULNS, money: money };
})();
