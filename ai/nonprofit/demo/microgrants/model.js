/* Microgrants v3 — the programme model: one application from the short form to a closed grant.
   Pure and deterministic (no DOM, no Date.now): actions are checked by guards and turned into events;
   the state is the replay of the event log. Loaded by the browser app and by Node tests
   (next/tests/mg-model.cjs). Money is stored in integer kopecks ("minor"). All data is synthetic.

   Statuses (application):
     submitted → under_review → clarification_requested → submitted (answer) …
     under_review → eligible (initial approval: admission to the documents stage, NOT a grant) | not_eligible
     eligible → cabinet_active (in-app invitation + consent) → plan_submitted ⇄ plan_changes_requested
     plan_submitted → package_accepted → awarded | reserve | not_selected   (final funding decision, committee)
     awarded → agreement_sent → agreement_confirmed → implementation (organiser's manual demo transfer flag)
     implementation → report_submitted ⇄ report_changes_requested → report_accepted → closed
     withdrawn — by the applicant before the agreement is confirmed. */
(function (root) {
  'use strict';

  var C = (typeof module !== 'undefined' && module.exports) ? require('./checks.js') : root.MGChecks;

  var PROGRAMME = {
    id: 'mg-2026',
    grantMaxMinor: 5900000,
    poolMinor: 36000000,
    community: 'Демонстраційна громада',
    communities: ['Демонстраційна громада', 'Сусідня громада (поза програмою)'],
    start: '2026-08-03T09:00',
    days: { plan: 21, docs: 14, report: 30, invite: 14 }
  };

  var INTAKE_REQUIRED = ['lastName', 'firstName', 'phone', 'community', 'settlement', 'members', 'businessType', 'ideaTitle', 'ideaShort', 'existing', 'requestedApprox'];
  var SCREENING = ['community', 'household', 'priorGrant', 'business'];
  var REJECT_REASONS = ['outside_community', 'not_business', 'prior_grant', 'other'];
  var DOC_SLOTS = { id: ['idFront', 'idBack', 'idReg', 'ipn', 'iban'], book: ['bookPhoto', 'bookReg', 'ipn', 'iban'] };
  var WITHDRAWABLE = ['submitted', 'under_review', 'clarification_requested', 'eligible', 'cabinet_active', 'plan_submitted',
    'plan_changes_requested', 'package_accepted', 'awarded', 'reserve', 'agreement_sent'];
  var TERMINAL = ['not_eligible', 'not_selected', 'withdrawn', 'closed'];
  var REPORT_ACCEPTED = ['report_accepted', 'closed'];

  /* ---------------- helpers ---------------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function blank(v) { return v == null || String(v).trim() === ''; }
  function toMin(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(iso); return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000; }
  function fromMin(n) { var d = new Date(n * 60000); return d.toISOString().slice(0, 16); }
  function addMin(iso, n) { return fromMin(toMin(iso) + n); }
  function addDays(iso, n) { return addMin(iso, n * 1440); }
  function isIso(s) { return typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(s); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function hashStr(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  /* not a security measure: a static demo cannot protect access; it only avoids keeping the key in plain text */
  function keyHash(key) { return hashStr('mg-demo-key:' + String(key || '').trim()); }
  function minor(uah) { return Math.round((typeof uah === 'number' ? uah : parseFloat(String(uah || '').replace(/\s/g, '').replace(',', '.')) || 0) * 100); }
  function normName(s) { return String(s || '').toLowerCase().replace(/[’'`ʼ]/g, '').replace(/\s+/g, ' ').trim(); }
  function fullName(app) { return (app.intake.lastName + ' ' + app.intake.firstName).trim(); }

  function initial(programme) {
    var p = clone(programme || PROGRAMME);
    return { v: 3, seq: 0, clock: p.start, programme: p, apps: {}, order: [], files: {}, purchases: {}, nextFile: 1, nextPurchase: 1, sponsorRuns: [] };
  }

  /* ---------------- selectors ---------------- */
  function app(s, code) { return s.apps[code] || null; }
  function slotVersions(s, code, slot) { return Object.keys(s.files).map(function (k) { return s.files[k]; }).filter(function (f) { return f.appId === code && f.slot === slot; }).sort(function (a, b) { return a.v - b.v; }); }
  function currentFile(s, code, slot) { var l = slotVersions(s, code, slot); return l.length ? l[l.length - 1] : null; }
  function latestPlan(a) { return a && a.plan.versions.length ? a.plan.versions[a.plan.versions.length - 1] : null; }
  function planFiles(s, a) { var p = latestPlan(a); return p ? p.fileIds.map(function (id) { return s.files[id]; }) : []; }
  function requiredDocSlots(a) { return a.docs.ptype ? DOC_SLOTS[a.docs.ptype] : []; }
  function grantLines(plan) {
    var out = [];
    (plan.items || []).forEach(function (it) {
      if (it.source === 'own') return;
      out.push({ idx: out.length, name: it.name, kind: it.kind, requestedMinor: minor(C.itemTotal(it)) });
    });
    return out;
  }
  function requestedGrantMinor(plan) { return grantLines(plan).reduce(function (t, l) { return t + l.requestedMinor; }, 0); }
  function activePurchases(s, code) { return Object.keys(s.purchases).map(function (k) { return s.purchases[k]; }).filter(function (p) { return p.appId === code && !p.removed; }).sort(function (a, b) { return a.n - b.n; }); }
  function purchaseHash(s, p) { var r = currentFile(s, p.appId, 'receipt:' + p.id); return [p.lineIdx, p.amountMinor, p.funding, r ? r.id : '', p.date, p.supplier].join('|'); }
  function latestReport(a) { return a && a.report.versions.length ? a.report.versions[a.report.versions.length - 1] : null; }
  function validDecision(a, entry) { var d = a.report.decisions[entry.id]; return d && d.hash === entry.hash ? d : null; }
  /* committed pool: awards that still stand (withdrawn awards are released) */
  function committedMinor(s) {
    return s.order.reduce(function (t, code) { var a = s.apps[code]; return t + (a.award && a.award.decision === 'award' && a.status !== 'withdrawn' ? a.award.approvedMinor : 0); }, 0);
  }
  function overdue(s, a) {
    var d = a.deadlines, now = toMin(s.clock), out = [];
    if (d.plan && ['eligible', 'cabinet_active', 'plan_changes_requested'].indexOf(a.status) > -1 && toMin(d.plan) < now) out.push('plan');
    if (d.docs && a.status === 'awarded' && toMin(d.docs) < now) out.push('docs');
    if (d.report && ['implementation', 'report_changes_requested'].indexOf(a.status) > -1 && toMin(d.report) < now) out.push('report');
    return out;
  }

  /* ---------------- actions: roles, guards, effects ---------------- */
  function setStatus(a, status, ev, extra) {
    a.status = status;
    var h = { status: status, at: ev.at, ev: ev.seq, by: ev.actor.role };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    a.history.push(h);
  }
  function message(a, ev, kind, text, from) { a.messages.push({ at: ev.at, ev: ev.seq, kind: kind, text: text || '', from: from || ev.actor.role }); }
  function addFile(s, ev, code, slot, data) {
    var prev = currentFile(s, code, slot);
    if (prev) prev.superseded = true;
    var f = { id: 'F' + String(s.nextFile++).padStart(3, '0'), appId: code, slot: slot, v: prev ? prev.v + 1 : 1, name: data.name, kind: data.kind, label: data.label || '',
      variant: data.variant || '', size: data.size || 0, at: ev.at, ev: ev.seq, by: ev.actor.role, status: 'received', superseded: false,
      history: [{ status: 'received', at: ev.at, ev: ev.seq, by: ev.actor.role }], comments: [] };
    s.files[f.id] = f;
    return f;
  }
  function needApp(s, a) { var x = app(s, a.appId); return x ? null : 'no_application'; }
  function statusIn(list) { return function (s, a) { var x = app(s, a.appId); return list.indexOf(x.status) > -1 ? null : 'wrong_status'; }; }

  var A = {};

  A['apply.submit'] = {
    roles: ['applicant'], noApp: true,
    guard: function (s, a) {
      var i = a.p && a.p.intake;
      if (!i) return 'missing_intake';
      for (var k = 0; k < INTAKE_REQUIRED.length; k++) if (blank(i[INTAKE_REQUIRED[k]])) return 'required:' + INTAKE_REQUIRED[k];
      if (!(parseInt(i.members, 10) > 0)) return 'invalid:members';
      var req = minor(i.requestedApprox);
      if (req <= 0 || req > s.programme.grantMaxMinor) return 'invalid:requestedApprox';
      if (!(a.p.consents && a.p.consents.selection && a.p.consents.contact)) return 'consent_required';
      if (!/^[0-9a-f]{8}$/.test(a.p.keyHash || '')) return 'invalid:key';
      return null;
    },
    apply: function (s, a, ev) {
      var n = s.order.length + 1, code = 'MG-' + String(n).padStart(2, '0');
      var i = clone(a.p.intake);
      var x = { code: code, n: n, createdAt: ev.at, demo: !!a.demo, status: '', history: [], intake: i, intakeV: 1, keyHash: a.p.keyHash,
        consents: [{ kind: 'selection', at: ev.at, ev: ev.seq }, { kind: 'contact', at: ev.at, ev: ev.seq }],
        clarification: null, screening: null, invite: null, activatedAt: null, verification: null,
        plan: { versions: [] }, award: null, docs: { ptype: '' }, agreement: null, transfer: null,
        deadlines: {}, report: { versions: [], decisions: {}, evidenceAccepted: false }, messages: [], notes: [] };
      s.apps[code] = x; s.order.push(code);
      setStatus(x, 'submitted', ev);
      ev.appId = code;
    }
  };
  A['review.start'] = {
    roles: ['organiser'], guard: statusIn(['submitted']),
    apply: function (s, a, ev) { setStatus(app(s, a.appId), 'under_review', ev); }
  };
  A['review.clarify'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['under_review'])(s, a); if (e) return e;
      if (INTAKE_REQUIRED.indexOf(a.p && a.p.field) < 0) return 'invalid:field';
      if (blank(a.p.question)) return 'required:question';
      return null;
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId);
      x.clarification = { field: a.p.field, question: a.p.question, at: ev.at, ev: ev.seq, answer: null };
      setStatus(x, 'clarification_requested', ev);
      message(x, ev, 'clarification', a.p.question);
    }
  };
  A['app.respond'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = statusIn(['clarification_requested'])(s, a); if (e) return e;
      var x = app(s, a.appId);
      if (!a.p || a.p.field !== x.clarification.field) return 'invalid:field';
      if (blank(a.p.value)) return 'required:value';
      if (String(a.p.value).trim() === String(x.intake[a.p.field]).trim()) return 'unchanged';
      return null;
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId);
      x.clarification.answer = { from: x.intake[a.p.field], to: a.p.value, at: ev.at, ev: ev.seq };
      x.intake[a.p.field] = a.p.value; x.intakeV++;
      setStatus(x, 'submitted', ev, { resubmitted: true });
    }
  };
  A['review.decide'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['under_review'])(s, a); if (e) return e;
      var p = a.p || {};
      if (p.decision === 'eligible') {
        for (var i = 0; i < SCREENING.length; i++) if (!(p.checks && p.checks[SCREENING[i]] === true)) return 'screening_incomplete';
        return null;
      }
      if (p.decision === 'not_eligible') return REJECT_REASONS.indexOf(p.reason) > -1 ? (p.reason === 'other' && blank(p.note) ? 'required:note' : null) : 'required:reason';
      return 'invalid:decision';
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId), p = a.p;
      x.screening = { decision: p.decision, checks: clone(p.checks || {}), reason: p.reason || '', note: p.note || '', at: ev.at, ev: ev.seq };
      if (p.decision === 'eligible') {
        x.invite = { issuedAt: ev.at, expiresAt: addDays(ev.at, s.programme.days.invite), ev: ev.seq };
        x.deadlines.plan = addDays(ev.at, s.programme.days.plan);
        setStatus(x, 'eligible', ev);
        message(x, ev, 'invite', '');
      } else {
        setStatus(x, 'not_eligible', ev, { reason: p.reason });
        message(x, ev, 'rejected', p.note || '');
      }
    }
  };
  A['invite.reissue'] = {
    roles: ['organiser'],
    guard: function (s, a) { var e = statusIn(['eligible'])(s, a); if (e) return e; return toMin(app(s, a.appId).invite.expiresAt) < toMin(s.clock) ? null : 'invite_valid'; },
    apply: function (s, a, ev) { var x = app(s, a.appId); x.invite = { issuedAt: ev.at, expiresAt: addDays(ev.at, s.programme.days.invite), ev: ev.seq }; message(x, ev, 'invite', ''); }
  };
  A['cabinet.activate'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = statusIn(['eligible'])(s, a); if (e) return e;
      if (toMin(app(s, a.appId).invite.expiresAt) < toMin(s.clock)) return 'invite_expired';
      return a.p && a.p.consent === true ? null : 'consent_required';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); x.activatedAt = ev.at; x.consents.push({ kind: 'documents', at: ev.at, ev: ev.seq }); setStatus(x, 'cabinet_active', ev); }
  };
  A['verification.choose'] = {
    roles: ['applicant'],
    guard: function (s, a) { var e = statusIn(['cabinet_active', 'plan_changes_requested'])(s, a); if (e) return e; return ['visit', 'video'].indexOf(a.p && a.p.choice) > -1 ? null : 'invalid:choice'; },
    apply: function (s, a, ev) {
      var x = app(s, a.appId), fid = null;
      if (a.p.choice === 'video') fid = addFile(s, ev, x.code, 'plan:video', { name: 'videovizytivka_zrazok.mp4', kind: 'sample', label: 'video', size: 24 * 1024 * 1024 }).id;
      x.verification = { choice: a.p.choice, fileId: fid, at: ev.at, ev: ev.seq };
    }
  };
  A['plan.submit'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = statusIn(['cabinet_active', 'plan_changes_requested'])(s, a); if (e) return e;
      var x = app(s, a.appId);
      if (!x.verification) return 'verification_required';
      if (!a.p || !a.p.form || !a.p.items) return 'missing_plan';
      var res = C.check({ form: a.p.form, items: a.p.items });
      if (!res.ok) return 'checks_failed';
      if (requestedGrantMinor(a.p) > s.programme.grantMaxMinor) return 'over_limit';
      var last = latestPlan(x);
      if (last && JSON.stringify({ f: last.form, i: last.items, p: last.photos }) === JSON.stringify({ f: a.p.form, i: a.p.items, p: a.p.photos || [] })) return 'unchanged';
      return null;
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId), v = x.plan.versions.length + 1;
      var who = (a.p.form.lastName + '_' + a.p.form.firstName).replace(/[\\/:*?"<>|\s]+/g, '_');
      var pptx = addFile(s, ev, x.code, 'plan:pptx', { name: 'Мікрогрант_' + who + '.pptx', kind: 'generated' });
      var xlsx = addFile(s, ev, x.code, 'plan:xlsx', { name: 'Annex_4_MBG_' + who + '.xlsx', kind: 'generated' });
      var ids = [pptx.id, xlsx.id];
      if (x.verification.fileId) {
        var vid = s.files[x.verification.fileId];
        if (vid && !vid.superseded) ids.push(vid.id);
      }
      x.plan.versions.push({ v: v, at: ev.at, ev: ev.seq, form: clone(a.p.form), items: clone(a.p.items), photos: clone(a.p.photos || []), fileIds: ids, verification: x.verification.choice });
      setStatus(x, 'plan_submitted', ev, { version: v });
    }
  };
  A['file.review'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var p = a.p || {}, f = s.files[p.fileId], x = app(s, a.appId);
      if (!f || f.appId !== a.appId) return 'no_file';
      if (f.superseded) return 'superseded';
      if (['reviewing', 'accepted', 'needs_correction'].indexOf(p.status) < 0) return 'invalid:status';
      if (p.status === 'needs_correction' && blank(p.comment)) return 'required:comment';
      if (/^plan:/.test(f.slot)) return x.status === 'plan_submitted' && planFiles(s, x).indexOf(f) > -1 ? null : 'wrong_status';
      if (/^doc:/.test(f.slot)) return x.status === 'awarded' ? null : 'wrong_status';
      return 'not_reviewable';
    },
    apply: function (s, a, ev) {
      var f = s.files[a.p.fileId];
      f.status = a.p.status;
      f.history.push({ status: a.p.status, at: ev.at, ev: ev.seq, by: 'organiser' });
      if (!blank(a.p.comment)) f.comments.push({ at: ev.at, ev: ev.seq, by: 'organiser', text: a.p.comment, visibility: 'participant', anchor: a.p.anchor == null ? null : a.p.anchor });
    }
  };
  A['app.note'] = {
    roles: ['organiser'], guard: function (s, a) { return blank(a.p && a.p.text) ? 'required:text' : null; },
    apply: function (s, a, ev) { app(s, a.appId).notes.push({ at: ev.at, ev: ev.seq, text: a.p.text }); }
  };
  A['plan.return'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['plan_submitted'])(s, a); if (e) return e;
      return planFiles(s, app(s, a.appId)).some(function (f) { return f.status === 'needs_correction'; }) ? null : 'no_correction_marked';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); setStatus(x, 'plan_changes_requested', ev); message(x, ev, 'plan_changes', ''); }
  };
  A['plan.accept'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['plan_submitted'])(s, a); if (e) return e;
      return planFiles(s, app(s, a.appId)).every(function (f) { return f.status === 'accepted'; }) ? null : 'files_not_accepted';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); setStatus(x, 'package_accepted', ev); message(x, ev, 'plan_accepted', ''); }
  };
  A['selection.publish'] = {
    roles: ['organiser'], noApp: true,
    guard: function (s, a) {
      var ds = (a.p && a.p.decisions) || [];
      var pending = s.order.filter(function (c) { return s.apps[c].status === 'package_accepted'; });
      if (!pending.length) return 'nothing_to_decide';
      var codes = ds.map(function (d) { return d.code; }).sort();
      if (JSON.stringify(codes) !== JSON.stringify(pending.slice().sort())) return 'decisions_incomplete';
      var add = 0;
      for (var i = 0; i < ds.length; i++) {
        var d = ds[i], x = s.apps[d.code];
        if (['award', 'reserve', 'not_selected'].indexOf(d.decision) < 0) return 'invalid:decision:' + d.code;
        if (d.decision !== 'award') continue;
        var lines = grantLines(latestPlan(x)), sum = 0;
        if (!d.lines || d.lines.length !== lines.length) return 'invalid:lines:' + d.code;
        for (var k = 0; k < lines.length; k++) {
          var ap = d.lines[k].approvedMinor;
          if (d.lines[k].idx !== k || !isInt(ap) || ap < 0 || ap > lines[k].requestedMinor) return 'invalid:line:' + d.code + ':' + k;
          sum += ap;
        }
        if (sum <= 0) return 'zero_award:' + d.code;
        if (sum > s.programme.grantMaxMinor) return 'over_limit:' + d.code;
        add += sum;
      }
      if (committedMinor(s) + add > s.programme.poolMinor) return 'over_pool';
      return null;
    },
    apply: function (s, a, ev) {
      a.p.decisions.forEach(function (d) {
        var x = s.apps[d.code], lines = grantLines(latestPlan(x));
        var award = { decision: d.decision, score: d.score == null ? null : d.score, at: ev.at, ev: ev.seq, requestedMinor: requestedGrantMinor(latestPlan(x)), lines: [], approvedMinor: 0 };
        if (d.decision === 'award') {
          award.lines = lines.map(function (l, k) { return { idx: k, name: l.name, kind: l.kind, requestedMinor: l.requestedMinor, approvedMinor: d.lines[k].approvedMinor }; });
          award.approvedMinor = award.lines.reduce(function (t, l) { return t + l.approvedMinor; }, 0);
          x.deadlines.docs = addDays(ev.at, s.programme.days.docs);
        }
        x.award = award;
        setStatus(x, d.decision === 'award' ? 'awarded' : d.decision, ev);
        message(x, ev, 'decision', '');
      });
    }
  };
  A['docs.ptype'] = {
    roles: ['applicant'],
    guard: function (s, a) { var e = statusIn(['awarded'])(s, a); if (e) return e; return DOC_SLOTS[a.p && a.p.ptype] ? null : 'invalid:ptype'; },
    apply: function (s, a) { app(s, a.appId).docs.ptype = a.p.ptype; }
  };
  A['doc.add'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = statusIn(['awarded'])(s, a); if (e) return e;
      var x = app(s, a.appId);
      if (requiredDocSlots(x).indexOf(a.p && a.p.slot) < 0) return 'invalid:slot';
      if (a.p.sample !== true) return 'samples_only';
      var cur = currentFile(s, x.code, 'doc:' + a.p.slot);
      if (cur && cur.status === 'accepted') return 'already_accepted';
      return null;
    },
    apply: function (s, a, ev) { addFile(s, ev, a.appId, 'doc:' + a.p.slot, { name: a.p.slot + '_zrazok.jpg', kind: 'sample', label: a.p.slot, variant: a.p.variant || '', size: 180000 }); }
  };
  A['agreement.send'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['awarded'])(s, a); if (e) return e;
      var x = app(s, a.appId), req = requiredDocSlots(x);
      if (!req.length) return 'docs_missing';
      return req.every(function (sl) { var f = currentFile(s, x.code, 'doc:' + sl); return f && f.status === 'accepted'; }) ? null : 'docs_not_accepted';
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId);
      var f = addFile(s, ev, x.code, 'agreement:terms', { name: 'Umovy_grantu_' + x.code + '_zrazok.docx', kind: 'generated' });
      x.agreement = { sentAt: ev.at, ev: ev.seq, fileId: f.id, confirmedAt: null };
      setStatus(x, 'agreement_sent', ev);
      message(x, ev, 'agreement', '');
    }
  };
  A['agreement.confirm'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = statusIn(['agreement_sent'])(s, a); if (e) return e;
      if (!(a.p && a.p.agree === true)) return 'consent_required';
      return normName(a.p.name) === normName(fullName(app(s, a.appId))) ? null : 'name_mismatch';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); x.agreement.confirmedAt = ev.at; x.agreement.confirmEv = ev.seq; x.agreement.name = a.p.name; setStatus(x, 'agreement_confirmed', ev); }
  };
  A['transfer.mark'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['agreement_confirmed'])(s, a); if (e) return e;
      var amt = a.p && a.p.amountMinor;
      if (!isInt(amt) || amt <= 0 || amt > app(s, a.appId).award.approvedMinor) return 'invalid:amount';
      return a.p.demoFlag === true ? null : 'demo_flag_required';
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId);
      x.transfer = { amountMinor: a.p.amountMinor, at: ev.at, ev: ev.seq, demoFlag: true };
      x.deadlines.report = addDays(ev.at, s.programme.days.report);
      setStatus(x, 'implementation', ev);
      message(x, ev, 'transfer', '');
    }
  };
  function purchaseGuardBase(s, a) {
    var e = statusIn(['implementation', 'report_changes_requested'])(s, a); if (e) return e;
    return null;
  }
  function purchaseFieldsError(s, x, p, partial) {
    if (!partial || p.lineIdx !== undefined) {
      var line = x.award.lines.filter(function (l) { return l.idx === p.lineIdx; })[0];
      if (!line || line.approvedMinor <= 0) return 'invalid:line';
    }
    if (!partial || p.amountMinor !== undefined) if (!isInt(p.amountMinor) || p.amountMinor <= 0) return 'invalid:amount';
    if (!partial || p.supplier !== undefined) if (blank(p.supplier)) return 'required:supplier';
    if (!partial || p.date !== undefined) {
      if (!/^\d{4}-\d\d-\d\d$/.test(p.date || '')) return 'invalid:date';
      if (p.date < x.transfer.at.slice(0, 10) || p.date > s.clock.slice(0, 10)) return 'date_out_of_period';
    }
    if (!partial || p.funding !== undefined) if (['grant', 'own'].indexOf(p.funding) < 0) return 'invalid:funding';
    return null;
  }
  A['purchase.add'] = {
    roles: ['applicant'],
    guard: function (s, a) { return purchaseGuardBase(s, a) || purchaseFieldsError(s, app(s, a.appId), a.p || {}, false); },
    apply: function (s, a, ev) {
      var id = 'P' + String(s.nextPurchase).padStart(3, '0');
      var p = { id: id, n: s.nextPurchase++, appId: a.appId, lineIdx: a.p.lineIdx, amountMinor: a.p.amountMinor, date: a.p.date, supplier: a.p.supplier, funding: a.p.funding, removed: false, at: ev.at, ev: ev.seq };
      s.purchases[id] = p;
      addFile(s, ev, a.appId, 'receipt:' + id, { name: 'chek_' + id + '_zrazok.jpg', kind: 'sample', label: 'receipt', variant: a.p.receiptVariant || '', size: 120000 });
      ev.p.purchaseId = id;
    }
  };
  A['purchase.edit'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = purchaseGuardBase(s, a); if (e) return e;
      var p = s.purchases[a.p && a.p.purchaseId];
      if (!p || p.appId !== a.appId || p.removed) return 'no_purchase';
      return purchaseFieldsError(s, app(s, a.appId), a.p, true);
    },
    apply: function (s, a) { var p = s.purchases[a.p.purchaseId]; ['lineIdx', 'amountMinor', 'supplier', 'date', 'funding'].forEach(function (k) { if (a.p[k] !== undefined) p[k] = a.p[k]; }); }
  };
  A['purchase.receipt'] = {
    roles: ['applicant'],
    guard: function (s, a) { var e = purchaseGuardBase(s, a); if (e) return e; var p = s.purchases[a.p && a.p.purchaseId]; return p && p.appId === a.appId && !p.removed ? null : 'no_purchase'; },
    apply: function (s, a, ev) { addFile(s, ev, a.appId, 'receipt:' + a.p.purchaseId, { name: 'chek_' + a.p.purchaseId + '_zrazok.jpg', kind: 'sample', label: 'receipt', variant: a.p.variant || '', size: 120000 }); }
  };
  A['purchase.remove'] = {
    roles: ['applicant'],
    guard: function (s, a) { var e = purchaseGuardBase(s, a); if (e) return e; var p = s.purchases[a.p && a.p.purchaseId]; return p && p.appId === a.appId && !p.removed ? null : 'no_purchase'; },
    apply: function (s, a) { s.purchases[a.p.purchaseId].removed = true; }
  };
  A['evidence.add'] = {
    roles: ['applicant'],
    guard: function (s, a) { return purchaseGuardBase(s, a) || (a.p && a.p.sample === true ? null : 'samples_only'); },
    apply: function (s, a, ev) { addFile(s, ev, a.appId, 'evidence:photo', { name: 'foto_obladnannya_zrazok.jpg', kind: 'sample', label: 'evidence', size: 200000 }); }
  };
  A['report.submit'] = {
    roles: ['applicant'],
    guard: function (s, a) {
      var e = purchaseGuardBase(s, a); if (e) return e;
      var x = app(s, a.appId), p = a.p || {}, ps = activePurchases(s, x.code), np = p.notPurchased || {};
      if (!ps.length) return 'no_purchases';
      for (var i = 0; i < x.award.lines.length; i++) {
        var l = x.award.lines[i];
        if (l.approvedMinor <= 0) continue;
        if (!ps.some(function (q) { return q.lineIdx === l.idx; }) && blank(np[l.idx])) return 'line_without_purchase:' + l.idx;
      }
      var ind = p.indicators || {};
      if (typeof ind.inUse !== 'boolean') return 'required:inUse';
      if (!isInt(ind.weekly) || ind.weekly < 0) return 'invalid:weekly';
      if (!isInt(ind.jobs) || ind.jobs < 0) return 'invalid:jobs';
      if (blank(p.narrative)) return 'required:narrative';
      return null;
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId), v = x.report.versions.length + 1;
      var ev2 = currentFile(s, x.code, 'evidence:photo');
      var snap = activePurchases(s, x.code).map(function (p) {
        var r = currentFile(s, x.code, 'receipt:' + p.id);
        return { id: p.id, lineIdx: p.lineIdx, amountMinor: p.amountMinor, date: p.date, supplier: p.supplier, funding: p.funding, receiptFileId: r ? r.id : null, hash: purchaseHash(s, p) };
      });
      x.report.versions.push({ v: v, at: ev.at, ev: ev.seq, purchases: snap, indicators: clone(a.p.indicators), narrative: a.p.narrative, notPurchased: clone(a.p.notPurchased || {}), evidenceFileId: ev2 ? ev2.id : null });
      setStatus(x, 'report_submitted', ev, { version: v });
    }
  };
  A['purchase.decide'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['report_submitted'])(s, a); if (e) return e;
      var x = app(s, a.appId), p = a.p || {}, r = latestReport(x);
      var entry = r.purchases.filter(function (q) { return q.id === p.purchaseId; })[0];
      if (!entry) return 'not_in_report';
      if (p.decision === 'accept') return isInt(p.acceptedMinor) && p.acceptedMinor > 0 && p.acceptedMinor <= entry.amountMinor ? null : 'invalid:acceptedMinor';
      if (p.decision === 'correct' || p.decision === 'exclude') return blank(p.reason) ? 'required:reason' : null;
      return 'invalid:decision';
    },
    apply: function (s, a, ev) {
      var x = app(s, a.appId), entry = latestReport(x).purchases.filter(function (q) { return q.id === a.p.purchaseId; })[0];
      x.report.decisions[entry.id] = { decision: a.p.decision, acceptedMinor: a.p.decision === 'accept' ? a.p.acceptedMinor : 0, reason: a.p.reason || '', hash: entry.hash, at: ev.at, ev: ev.seq, reportV: latestReport(x).v };
    }
  };
  A['report.return'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['report_submitted'])(s, a); if (e) return e;
      var x = app(s, a.appId);
      return latestReport(x).purchases.some(function (q) { var d = validDecision(x, q); return d && d.decision === 'correct'; }) ? null : 'no_correction_marked';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); setStatus(x, 'report_changes_requested', ev); message(x, ev, 'report_changes', ''); }
  };
  A['report.accept'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var e = statusIn(['report_submitted'])(s, a); if (e) return e;
      var x = app(s, a.appId);
      return latestReport(x).purchases.every(function (q) { var d = validDecision(x, q); return d && (d.decision === 'accept' || d.decision === 'exclude'); }) ? null : 'undecided_purchases';
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); x.report.evidenceAccepted = !!(a.p && a.p.evidenceAccepted); x.report.acceptedEv = ev.seq; setStatus(x, 'report_accepted', ev); message(x, ev, 'report_accepted', ''); }
  };
  A['grant.close'] = {
    roles: ['organiser'], guard: statusIn(['report_accepted']),
    apply: function (s, a, ev) { setStatus(app(s, a.appId), 'closed', ev); }
  };
  A['app.withdraw'] = {
    roles: ['applicant'], guard: statusIn(WITHDRAWABLE),
    apply: function (s, a, ev) { setStatus(app(s, a.appId), 'withdrawn', ev, { reason: (a.p && a.p.reason) || '' }); }
  };
  A['deadline.extend'] = {
    roles: ['organiser'],
    guard: function (s, a) {
      var x = app(s, a.appId), p = a.p || {};
      if (TERMINAL.indexOf(x.status) > -1) return 'wrong_status';
      if (!x.deadlines[p.which]) return 'no_deadline';
      if (!isIso(p.until) || toMin(p.until) <= toMin(s.clock)) return 'invalid:until';
      return blank(p.reason) ? 'required:reason' : null;
    },
    apply: function (s, a, ev) { var x = app(s, a.appId); x.deadlines[a.p.which] = a.p.until; message(x, ev, 'extended', a.p.which + '|' + a.p.until); }
  };
  A['app.remind'] = {
    roles: ['organiser'],
    guard: function (s, a) { return blank(a.p && a.p.text) ? 'required:text' : (TERMINAL.indexOf(app(s, a.appId).status) > -1 ? 'wrong_status' : null); },
    apply: function (s, a, ev) { message(app(s, a.appId), ev, 'reminder', a.p.text, 'organiser'); }
  };
  A['sponsor.generate'] = {
    roles: ['organiser'], noApp: true,
    guard: function (s, a) { return a.p && /^[0-9a-f]{8}$/.test(a.p.digest || '') ? null : 'invalid:digest'; },
    apply: function (s, a, ev) { s.sponsorRuns.push({ at: ev.at, ev: ev.seq, digest: a.p.digest, format: a.p.format || '' }); }
  };
  A['demo.clock'] = {
    roles: ['demo'], noApp: true,
    guard: function (s, a) { return a.p && isInt(a.p.days) && a.p.days > 0 && a.p.days <= 120 ? null : 'invalid:days'; },
    apply: function () {}
  };

  /* ---------------- dispatch ---------------- */
  function can(s, action) {
    var def = A[action && action.type];
    if (!def) return 'unknown_action';
    var role = action.actor && action.actor.role;
    if (def.roles.indexOf(role) < 0) return 'forbidden_role';
    if (!def.noApp) {
      var e = needApp(s, action); if (e) return e;
      if (role === 'applicant' && action.actor.appId !== action.appId) return 'forbidden_app';
    }
    if (def.noApp && role === 'applicant' && action.type !== 'apply.submit') return 'forbidden_app';
    return def.guard(s, action);
  }
  /* returns {ok, state, event} or {ok:false, error}; never mutates the given state */
  function reduce(s, action) {
    if (action && action.type === 'apply.submit' && action.p && action.p.key !== undefined) {
      if (String(action.p.key).trim().length < 6) return { ok: false, error: 'invalid:key' };
      var probe = clone(action.p); probe.keyHash = keyHash(probe.key); delete probe.key;
      var e0 = can(s, { type: action.type, actor: action.actor, p: probe });
      if (e0) return { ok: false, error: e0 };
    } else {
      var err = can(s, action);
      if (err) return { ok: false, error: err };
    }
    var n = clone(s);
    if (action.type === 'apply.submit' && action.p && action.p.key !== undefined) {
      action = { type: action.type, actor: action.actor, p: clone(action.p), demo: action.demo };
      action.p.keyHash = keyHash(action.p.key); delete action.p.key;
    }
    var at = action.type === 'demo.clock' ? addDays(n.clock, action.p.days) : addMin(n.clock, 1);
    var ev = { seq: n.seq + 1, at: at, type: action.type, actor: clone(action.actor), appId: action.appId || null, p: clone(action.p || {}) };
    if (action.demo) ev.demo = true;
    n.seq = ev.seq; n.clock = at;
    A[action.type].apply(n, ev.p === action.p ? action : { type: action.type, actor: action.actor, appId: action.appId, p: ev.p, demo: action.demo }, ev);
    return { ok: true, state: n, event: ev };
  }
  /* rebuild from an event log; every event must pass its guard again (detects a corrupt log) */
  function replay(events, programme) {
    var s = initial(programme);
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.seq !== s.seq + 1) throw new Error('bad_sequence:' + e.seq);
      var r = reduce(s, { type: e.type, actor: e.actor, appId: e.type === 'apply.submit' ? null : e.appId, p: e.p, demo: e.demo });
      if (!r.ok) throw new Error('invalid_event:' + e.seq + ':' + r.error);
      if (r.event.at !== e.at) throw new Error('clock_mismatch:' + e.seq);
      s = r.state;
    }
    return s;
  }

  /* ---------------- views for the UI ---------------- */
  function nextAction(s, code) {
    var x = app(s, code); if (!x) return 'none';
    switch (x.status) {
      case 'submitted': case 'under_review': return 'wait_review';
      case 'clarification_requested': return 'answer_clarification';
      case 'eligible': return toMin(x.invite.expiresAt) < toMin(s.clock) ? 'invite_expired' : 'activate_cabinet';
      case 'cabinet_active': return x.verification ? 'submit_plan' : 'choose_verification';
      case 'plan_submitted': return 'wait_plan_review';
      case 'plan_changes_requested': return 'fix_plan';
      case 'package_accepted': return 'wait_committee';
      case 'awarded': {
        if (!x.docs.ptype) return 'choose_ptype';
        var req = requiredDocSlots(x), cur = req.map(function (sl) { return currentFile(s, code, 'doc:' + sl); });
        if (cur.some(function (f) { return !f || f.status === 'needs_correction'; })) return 'upload_docs';
        return 'wait_docs_review';
      }
      case 'agreement_sent': return 'confirm_agreement';
      case 'agreement_confirmed': return 'wait_transfer';
      case 'implementation': return 'add_purchases';
      case 'report_submitted': return 'wait_report_review';
      case 'report_changes_requested': return 'fix_report';
      case 'report_accepted': return 'wait_close';
      default: return x.status; /* reserve, not_selected, not_eligible, withdrawn, closed */
    }
  }
  function queues(s) {
    var q = { new: [], responses: [], review: [], plans: [], selection: [], docs: [], transfer: [], reports: [], close: [], overdue: [] };
    s.order.forEach(function (code) {
      var x = s.apps[code];
      if (x.status === 'submitted') (x.intakeV > 1 ? q.responses : q.new).push(code);
      if (x.status === 'under_review') q.review.push(code);
      if (x.status === 'plan_submitted') q.plans.push(code);
      if (x.status === 'package_accepted') q.selection.push(code);
      if (x.status === 'awarded' && x.docs.ptype && requiredDocSlots(x).every(function (sl) { return currentFile(s, code, 'doc:' + sl); }) &&
        requiredDocSlots(x).some(function (sl) { var f = currentFile(s, code, 'doc:' + sl); return f.status !== 'needs_correction'; })) q.docs.push(code);
      if (x.status === 'agreement_confirmed') q.transfer.push(code);
      if (x.status === 'report_submitted') q.reports.push(code);
      if (x.status === 'report_accepted') q.close.push(code);
      if (overdue(s, x).length) q.overdue.push(code);
    });
    return q;
  }
  /* participant-visible messages: organiser's internal notes never appear here */
  function participantFeed(s, code) {
    var x = app(s, code); if (!x) return [];
    var out = x.history.map(function (h) { return { at: h.at, ev: h.ev, kind: 'status', status: h.status }; });
    x.messages.forEach(function (m) { out.push({ at: m.at, ev: m.ev, kind: m.kind, text: m.text }); });
    Object.keys(s.files).forEach(function (k) {
      var f = s.files[k]; if (f.appId !== code) return;
      f.comments.forEach(function (c) { if (c.visibility === 'participant') out.push({ at: c.at, ev: c.ev, kind: 'comment', fileId: f.id, text: c.text, anchor: c.anchor }); });
    });
    return out.sort(function (a, b) { return b.ev - a.ev; });
  }
  function checkKey(s, code, key) { var x = app(s, String(code || '').trim().toUpperCase()); return !!x && x.keyHash === keyHash(key); }

  var api = {
    PROGRAMME: PROGRAMME, INTAKE_REQUIRED: INTAKE_REQUIRED, SCREENING: SCREENING, REJECT_REASONS: REJECT_REASONS, DOC_SLOTS: DOC_SLOTS,
    WITHDRAWABLE: WITHDRAWABLE, TERMINAL: TERMINAL, REPORT_ACCEPTED: REPORT_ACCEPTED, ACTIONS: Object.keys(A),
    initial: initial, can: can, reduce: reduce, replay: replay, clone: clone,
    app: app, currentFile: currentFile, slotVersions: slotVersions, latestPlan: latestPlan, planFiles: planFiles, requiredDocSlots: requiredDocSlots,
    grantLines: grantLines, requestedGrantMinor: requestedGrantMinor, activePurchases: activePurchases, latestReport: latestReport, validDecision: validDecision,
    purchaseHash: purchaseHash, committedMinor: committedMinor, overdue: overdue, nextAction: nextAction, queues: queues, participantFeed: participantFeed,
    checkKey: checkKey, keyHash: keyHash, hashStr: hashStr, minor: minor, addDays: addDays, toMin: toMin, fullName: fullName, normName: normName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MGModel = api;
})(this);
