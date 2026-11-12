/* Microgrants v3 — the sponsor ledger, derived only from recorded decisions in the model state.
   Every reported kopeck lands in exactly one bucket:
     pending       report of the latest submitted version is not accepted yet (report_submitted /
                   report_changes_requested) — nothing in it counts as accepted
     grantAccepted accepted amount of a grant-classified purchase, within the remaining approved line cap
                   (two receipts on one line consume the cap in date, then id order)
     overCap       accepted grant-classified amount above the approved line cap — shown separately and NOT
                   relabelled as own funds (no funding classification was recorded for it)
     ownAccepted   accepted amount of a purchase the participant classified as own funds
     disallowed    the part of a purchase the organiser did not accept (partial acceptance residual)
     excluded      a purchase the organiser excluded, with the reason
   Accepted report states: report_accepted and closed. Drafts and unsubmitted edits never count; a report
   returned for changes stays on its last submitted snapshot until the next submission. Requested
   (budgeted) amounts appear only in the separate selection block. */
(function (root) {
  'use strict';
  var M = (typeof module !== 'undefined' && module.exports) ? require('./model.js') : root.MGModel;
  var BUCKETS = ['grantAccepted', 'overCap', 'ownAccepted', 'disallowed', 'excluded', 'pending'];

  function zero() { var o = { reportedMinor: 0 }; BUCKETS.forEach(function (b) { o[b] = 0; }); return o; }
  function everReached(a, st) { return a.history.some(function (h) { return h.status === st; }); }

  function ledger(s) {
    var entries = [], apps = [], totals = zero(), lines = [];
    var sel = { awarded: 0, requestedMinor: 0, approvedMinor: 0, transferredMinor: 0 };
    var counts = { applications: s.order.length, eligible: 0, notEligible: 0, withdrawn: 0, plansAccepted: 0, awarded: 0, reserve: 0, notSelected: 0,
      reportsAccepted: 0, reportsPending: 0, reportsMissing: 0, closed: 0, receiptsAccepted: 0, unspentMinor: 0 };
    var outcomes = [];

    s.order.forEach(function (code) {
      var a = s.apps[code];
      if (everReached(a, 'eligible')) counts.eligible++;
      if (a.status === 'not_eligible') counts.notEligible++;
      if (a.status === 'withdrawn') counts.withdrawn++;
      if (everReached(a, 'package_accepted')) counts.plansAccepted++;
      if (a.status === 'reserve') counts.reserve++;
      if (a.status === 'not_selected') counts.notSelected++;
      if (!a.award || a.award.decision !== 'award' || a.status === 'withdrawn') return;

      counts.awarded++;
      sel.awarded++; sel.requestedMinor += a.award.requestedMinor; sel.approvedMinor += a.award.approvedMinor;
      if (a.transfer) sel.transferredMinor += a.transfer.amountMinor;

      var r = M.latestReport(a), accepted = M.REPORT_ACCEPTED.indexOf(a.status) > -1;
      var row = zero();
      row.code = code; row.community = a.intake.community; row.businessType = a.intake.businessType; row.status = a.status;
      row.requestedMinor = a.award.requestedMinor; row.approvedMinor = a.award.approvedMinor; row.transferredMinor = a.transfer ? a.transfer.amountMinor : 0;
      row.reportV = r ? r.v : 0; row.reportAccepted = accepted; row.receiptsAccepted = 0; row.awardEv = a.award.ev; row.acceptEv = accepted ? a.report.acceptedEv : null;
      var cap = {}, lineRows = {};
      a.award.lines.forEach(function (l) {
        cap[l.idx] = l.approvedMinor;
        var lr = zero(); lr.code = code; lr.lineIdx = l.idx; lr.name = l.name; lr.requestedMinor = l.requestedMinor; lr.approvedMinor = l.approvedMinor;
        lineRows[l.idx] = lr;
      });
      if (!r) counts.reportsMissing++;
      else if (accepted) counts.reportsAccepted++;
      else counts.reportsPending++;
      if (a.status === 'closed') counts.closed++;

      var list = r ? r.purchases.slice().sort(function (p, q) { return p.date < q.date ? -1 : p.date > q.date ? 1 : (p.id < q.id ? -1 : 1); }) : [];
      list.forEach(function (q) {
        var base = { code: code, purchaseId: q.id, lineIdx: q.lineIdx, funding: q.funding, reportV: r.v, reportEv: r.ev, receiptFileId: q.receiptFileId,
          awardEv: a.award.ev, acceptEv: row.acceptEv, decisionEv: null, reason: '' };
        var lr = lineRows[q.lineIdx];
        function put(bucket, amt, d) {
          if (amt <= 0) return;
          var e = {}; Object.keys(base).forEach(function (k) { e[k] = base[k]; });
          e.bucket = bucket; e.amountMinor = amt;
          if (d) { e.decisionEv = d.ev; e.reason = d.reason || ''; }
          entries.push(e); row[bucket] += amt; totals[bucket] += amt; if (lr) lr[bucket] += amt;
        }
        row.reportedMinor += q.amountMinor; totals.reportedMinor += q.amountMinor; if (lr) lr.reportedMinor += q.amountMinor;
        if (!accepted) { put('pending', q.amountMinor, null); return; }
        var d = M.validDecision(a, q);
        if (!d) throw new Error('accepted report without decision: ' + code + ' ' + q.id);
        if (d.decision === 'exclude') { put('excluded', q.amountMinor, d); return; }
        var A = d.acceptedMinor;
        put('disallowed', q.amountMinor - A, d);
        row.receiptsAccepted++; counts.receiptsAccepted++;
        if (q.funding === 'own') { put('ownAccepted', A, d); return; }
        var g = Math.min(A, Math.max(0, cap[q.lineIdx] || 0));
        cap[q.lineIdx] = (cap[q.lineIdx] || 0) - g;
        put('grantAccepted', g, d);
        put('overCap', A - g, d);
      });
      row.unspentMinor = accepted ? row.approvedMinor - row.grantAccepted : null;
      if (accepted) counts.unspentMinor += row.unspentMinor;
      apps.push(row);
      Object.keys(lineRows).forEach(function (k) { lines.push(lineRows[k]); });

      if (r && accepted) {
        var ind = r.indicators || {};
        outcomes.push({ code: code, key: 'inUse', value: !!ind.inUse, evidence: ind.inUse && a.report.evidenceAccepted && r.evidenceFileId ? 'accepted' : 'self_reported', reportEv: r.ev });
        outcomes.push({ code: code, key: 'weekly', value: ind.weekly, evidence: 'self_reported', reportEv: r.ev });
        outcomes.push({ code: code, key: 'jobs', value: ind.jobs, evidence: 'self_reported', reportEv: r.ev });
      }
    });

    var out = { synthetic: true, programme: s.programme.id, poolMinor: s.programme.poolMinor, asOf: s.clock, basedOnSeq: s.seq,
      selection: sel, totals: totals, counts: counts, apps: apps, lines: lines, entries: entries, outcomes: outcomes };
    out.digest = M.hashStr(JSON.stringify([sel, totals, counts, apps, entries, outcomes]));
    return out;
  }

  /* entries behind one figure: bucket (optional), code (optional), lineIdx (optional) */
  function trace(L, f) {
    return L.entries.filter(function (e) {
      return (!f.bucket || e.bucket === f.bucket) && (!f.code || e.code === f.code) && (f.lineIdx == null || e.lineIdx === f.lineIdx);
    });
  }
  function sumBuckets(o) { return BUCKETS.reduce(function (t, b) { return t + o[b]; }, 0); }

  var api = { BUCKETS: BUCKETS, ledger: ledger, trace: trace, sumBuckets: sumBuckets };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MGLedger = api;
})(this);
