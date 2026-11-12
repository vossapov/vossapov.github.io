/* Files built in the browser from recorded data:
   - the participant's PPTX / XLSX of a submitted plan version (MGOutputs, from the stored snapshot),
   - the list of cost items DOCX, the grant terms DOCX (sample, not a legal agreement),
   - the sponsor report XLSX / DOCX from MGLedger (accepted decisions only; codes, no personal data). */
(function () {
  'use strict';
  var M = window.MGModel, L = window.MGLedger, OUT = window.MGOutputs, C = window.MGChecks;

  function uah(minor) { var neg = minor < 0; minor = Math.abs(minor); var s = C.fmt(Math.floor(minor / 100)); var k = minor % 100; return (neg ? '−' : '') + s + (k ? ',' + String(k).padStart(2, '0') : ''); }
  function planVersionOf(state, fileId) {
    var f = state.files[fileId], a = state.apps[f.appId];
    return a.plan.versions.filter(function (v) { return v.fileIds.indexOf(fileId) > -1; })[0];
  }
  function planApp(v) { return { form: v.form, items: v.items, photos: (v.photos || []).map(function (p) { return { caption: p.caption, dataUrl: window.MGSamples.photo(p.caption) }; }), date: v.at.slice(8, 10) + '.' + v.at.slice(5, 7) + '.' + v.at.slice(0, 4) }; }
  function planFile(state, fileId) {
    var f = state.files[fileId], v = planVersionOf(state, fileId);
    var job = f.slot === 'plan:pptx' ? OUT.pptx(planApp(v)) : OUT.xlsx(planApp(v));
    return job.then(function (blob) { return { blob: blob, name: f.name }; });
  }
  function costList(state, code) {
    var v = M.latestPlan(state.apps[code]);
    return OUT.docx(planApp(v)).then(function (blob) { return { blob: blob, name: OUT.names(v).docx }; });
  }

  /* ---- minimal DOCX writer (same structure as outputs.js) ---- */
  function xml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function para(text, o) { o = o || {}; return '<w:p>' + (o.center ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : '') + '<w:r><w:rPr>' + (o.bold ? '<w:b/>' : '') + '<w:sz w:val="' + (o.size || 22) + '"/></w:rPr><w:t xml:space="preserve">' + xml(text) + '</w:t></w:r></w:p>'; }
  function table(head, rows, widths) {
    var cell = function (t, w, b) { return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + para(t, { bold: b, size: 18 }) + '</w:tc>'; };
    var border = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (b) { return '<w:' + b + ' w:val="single" w:sz="4" w:color="999999"/>'; }).join('') + '</w:tblBorders>';
    return '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/>' + border + '</w:tblPr><w:tblGrid>' + widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' +
      '<w:tr>' + head.map(function (h, i) { return cell(h, widths[i], true); }).join('') + '</w:tr>' +
      rows.map(function (r) { return '<w:tr>' + r.map(function (x, i) { return cell(x, widths[i]); }).join('') + '</w:tr>'; }).join('') + '</w:tbl>';
  }
  function docx(body) {
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var zip = new window.JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml', doc);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function terms(state, code) {
    var a = state.apps[code], f = state.files[a.agreement.fileId];
    var rows = a.award.lines.filter(function (l) { return l.approvedMinor > 0; }).map(function (l, i) { return [String(i + 1), l.name, uah(l.approvedMinor)]; });
    rows.push(['', 'Разом', uah(a.award.approvedMinor)]);
    var body = para('Умови гранту — зразок для демо', { bold: true, size: 30, center: true }) +
      para('СИНТЕТИЧНІ ДАНІ · ДЕМО. Не є договором і не має юридичної сили.', { size: 18, center: true }) + para('') +
      para('Заявка: ' + code + ' · ' + a.intake.ideaTitle) + para('Затверджена сума гранту: ' + uah(a.award.approvedMinor) + ' грн') + para('') +
      table(['№', 'Затверджений рядок кошторису', 'Сума, грн'], rows, [600, 6400, 2000]) + para('') +
      para('Звіт: чеки на кожен рядок, фото обладнання на місці й короткий опис результатів — у кабінеті протягом 30 днів після перерахування коштів.') +
      para('Витрати понад затверджену суму рядка грантом не покриваються.');
    return docx(body).then(function (blob) { return { blob: blob, name: f.name }; });
  }

  /* ---- sponsor report ---- */
  var EN = {
    title: 'Microgrants programme 2026 — sponsor report (SYNTHETIC DEMO DATA)', asOf: 'Demo date', basis: 'Built from accepted reports only. Requested amounts are shown separately and are never counted as spending.',
    sel: 'Selection', awarded: 'Grants awarded', requested: 'Requested in budgets (for reference)', approved: 'Approved', transferred: 'Marked as transferred (demo flag)',
    spend: 'Spending', grantAccepted: 'Accepted grant spending', overCap: 'Accepted above approved line (not covered by the grant)', ownAccepted: 'Participant’s own funds (accepted)',
    disallowed: 'Not accepted part of a receipt', excluded: 'Excluded receipts', pending: 'Not yet reviewed (pending reports)', unspent: 'Unspent balance (accepted reports)', reported: 'Total reported in submitted reports',
    process: 'Process', applications: 'Applications', eligible: 'Admitted to documents stage', plans: 'Business plans accepted', reports: 'Reports accepted', missing: 'Reports not submitted', receipts: 'Receipts accepted',
    outcomes: 'Outcomes (self-reported unless marked as evidence accepted)', code: 'Code', community: 'Community', type: 'Business type', status: 'Status', line: 'Line', bucket: 'Bucket', amount: 'Amount, UAH',
    source: 'Sources', ev: 'Event', reason: 'Reason', inUse: 'Equipment installed and in use', weekly: 'Products/services per week', jobs: 'New jobs', evidence: 'Evidence', accepted: 'evidence accepted', self: 'self-reported'
  };
  var UA = {
    title: 'Програма мікрогрантів 2026 — звіт для донора (СИНТЕТИЧНІ ДАНІ · ДЕМО)', asOf: 'Демо-дата', basis: 'Сформовано лише з прийнятих звітів. Запитані суми показані окремо й ніколи не рахуються як витрати.',
    sel: 'Відбір', awarded: 'Надано грантів', requested: 'Запитано в кошторисах (довідково)', approved: 'Затверджено', transferred: 'Позначено як перераховане (демо-позначка)',
    spend: 'Витрати', grantAccepted: 'Прийняті витрати гранту', overCap: 'Прийнято понад затверджений рядок (грантом не покрито)', ownAccepted: 'Власні кошти учасника (прийнято)',
    disallowed: 'Неприйнята частина чеків', excluded: 'Виключені чеки', pending: 'Ще не перевірено (звіти на розгляді)', unspent: 'Невикористаний залишок (прийняті звіти)', reported: 'Усього заявлено в поданих звітах',
    process: 'Процес', applications: 'Заявок', eligible: 'Допущено до подання документів', plans: 'Прийнято бізнес-планів', reports: 'Прийнято звітів', missing: 'Звітів не подано', receipts: 'Прийнято чеків',
    outcomes: 'Результати (зі слів учасника, якщо не позначено «доказ прийнято»)', code: 'Код', community: 'Громада', type: 'Тип бізнесу', status: 'Статус', line: 'Рядок', bucket: 'Категорія', amount: 'Сума, грн',
    source: 'Джерела', ev: 'Подія', reason: 'Причина', inUse: 'Обладнання встановлене й працює', weekly: 'Виробів/послуг на тиждень', jobs: 'Нових робочих місць', evidence: 'Доказ', accepted: 'доказ прийнято', self: 'зі слів учасника'
  };
  function sponsorRows(Lg, T) {
    return {
      summary: [[T.title], [T.asOf, Lg.asOf.replace('T', ' ')], [T.basis], [],
        [T.sel], [T.awarded, Lg.selection.awarded], [T.requested, Lg.selection.requestedMinor / 100], [T.approved, Lg.selection.approvedMinor / 100], [T.transferred, Lg.selection.transferredMinor / 100], [],
        [T.spend], [T.reported, Lg.totals.reportedMinor / 100], [T.grantAccepted, Lg.totals.grantAccepted / 100], [T.overCap, Lg.totals.overCap / 100], [T.ownAccepted, Lg.totals.ownAccepted / 100],
        [T.disallowed, Lg.totals.disallowed / 100], [T.excluded, Lg.totals.excluded / 100], [T.pending, Lg.totals.pending / 100], [T.unspent, Lg.counts.unspentMinor / 100], [],
        [T.process], [T.applications, Lg.counts.applications], [T.eligible, Lg.counts.eligible], [T.plans, Lg.counts.plansAccepted], [T.reports, Lg.counts.reportsAccepted], [T.missing, Lg.counts.reportsMissing], [T.receipts, Lg.counts.receiptsAccepted]],
      apps: [[T.code, T.community, T.type, T.status, T.approved, T.grantAccepted, T.overCap, T.ownAccepted, T.disallowed, T.excluded, T.pending, T.unspent]].concat(Lg.apps.map(function (r) {
        return [r.code, r.community, r.businessType, r.status, r.approvedMinor / 100, r.grantAccepted / 100, r.overCap / 100, r.ownAccepted / 100, r.disallowed / 100, r.excluded / 100, r.pending / 100, r.unspentMinor == null ? '' : r.unspentMinor / 100];
      })),
      entries: [[T.code, T.line, T.bucket, T.amount, T.reason, 'purchase', 'report.submit #', 'purchase.decide #', 'report.accept #', 'selection.publish #']].concat(Lg.entries.map(function (e) {
        return [e.code, e.lineIdx + 1, T[e.bucket], e.amountMinor / 100, e.reason, e.purchaseId, e.reportEv, e.decisionEv == null ? '' : e.decisionEv, e.acceptEv == null ? '' : e.acceptEv, e.awardEv];
      })),
      outcomes: [[T.code, T.outcomes, '', T.evidence]].concat(Lg.outcomes.map(function (o) {
        return [o.code, T[o.key], typeof o.value === 'boolean' ? (o.value ? '✓' : '—') : o.value, o.evidence === 'accepted' ? T.accepted : T.self];
      }))
    };
  }
  function summaryList(Lg, T) {
    return [[T.awarded, Lg.selection.awarded], [T.requested, Lg.selection.requestedMinor, 1], [T.approved, Lg.selection.approvedMinor, 1], [T.transferred, Lg.selection.transferredMinor, 1],
      [T.reported, Lg.totals.reportedMinor, 1], [T.grantAccepted, Lg.totals.grantAccepted, 1], [T.overCap, Lg.totals.overCap, 1], [T.ownAccepted, Lg.totals.ownAccepted, 1],
      [T.disallowed, Lg.totals.disallowed, 1], [T.excluded, Lg.totals.excluded, 1], [T.pending, Lg.totals.pending, 1], [T.unspent, Lg.counts.unspentMinor, 1],
      [T.applications, Lg.counts.applications], [T.eligible, Lg.counts.eligible], [T.plans, Lg.counts.plansAccepted], [T.reports, Lg.counts.reportsAccepted], [T.missing, Lg.counts.reportsMissing], [T.receipts, Lg.counts.receiptsAccepted]];
  }
  function sponsorXlsx(state, lang) {
    var Lg = L.ledger(state), T = lang === 'en' ? EN : UA, R = sponsorRows(Lg, T), X = window.XLSX, wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(R.summary), lang === 'en' ? 'Summary' : 'Підсумок');
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(R.apps), lang === 'en' ? 'Participants' : 'Учасники');
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(R.entries), lang === 'en' ? 'Sources' : 'Джерела');
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(R.outcomes), lang === 'en' ? 'Outcomes' : 'Результати');
    var out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    return Promise.resolve({ blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: lang === 'en' ? 'Sponsor_report_microgrants_2026_DEMO.xlsx' : 'Звіт_для_донора_мікрогранти_2026_ДЕМО.xlsx', digest: Lg.digest });
  }
  function sponsorDocx(state, lang) {
    var Lg = L.ledger(state), T = lang === 'en' ? EN : UA, R = sponsorRows(Lg, T);
    var body = para(T.title, { bold: true, size: 28, center: true }) + para(T.asOf + ': ' + Lg.asOf.replace('T', ' '), { size: 18, center: true }) + para(T.basis, { size: 18 }) + para('') +
      table(['', ''], summaryList(Lg, T).map(function (r) { return [r[0], r[2] ? uah(r[1]) : String(r[1])]; }), [6600, 2600]) + para('') +
      para(lang === 'en' ? 'By participant (codes only)' : 'За учасниками (лише коди)', { bold: true }) +
      table([T.code, T.approved, T.grantAccepted, T.overCap, T.excluded, T.pending], Lg.apps.map(function (r) { return [r.code, uah(r.approvedMinor), uah(r.grantAccepted), uah(r.overCap), uah(r.excluded + r.disallowed), uah(r.pending)]; }), [1200, 1700, 1700, 1600, 1500, 1500]) + para('') +
      para(T.outcomes, { bold: true }) +
      table([T.code, '', '', T.evidence], R.outcomes.slice(1).map(function (r) { return r.map(String); }), [1200, 4600, 1200, 2200]);
    return docx(body).then(function (blob) { return { blob: blob, name: lang === 'en' ? 'Sponsor_report_microgrants_2026_DEMO.docx' : 'Звіт_для_донора_мікрогранти_2026_ДЕМО.docx', digest: Lg.digest }; });
  }

  window.MGExports = { planFile: planFile, costList: costList, terms: terms, sponsorXlsx: sponsorXlsx, sponsorDocx: sponsorDocx, uah: uah, T: { ua: UA, en: EN } };
})();
