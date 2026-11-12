/* Microgrants v3 — browser storage for the shared demo records.
   - Shared records: one event log in IndexedDB (database vi-mg-v3, this browser only; no server, no e-mail).
     Every write reads the log, validates the action against the freshest state and appends the event inside ONE
     readwrite transaction; IndexedDB serializes such transactions across tabs, so concurrent writes are never
     lost. (localStorage was not enough: Chrome propagates it between tab processes asynchronously.)
   - Other tabs learn about changes through BroadcastChannel (+ a slow poll as a fallback) and re-read the log.
   - Role session is per tab (sessionStorage or ?role= in memory), never shared: two tabs can be participant
     and organiser at the same time. This is a demo switch, not authentication or access control.
   - Drafts stay in localStorage under vi-mg-v3-*. Reset clears only v3-owned data; older demo data is left alone. */
(function () {
  'use strict';
  var M = window.MGModel;
  var DB = 'vi-mg-v3', OS = 'log', REC = 'main', SKEY = 'vi-mg-v3-session', PREFIX = 'vi-mg-v3';
  var listeners = [], cache = { state: M.initial(), events: [], error: null, stamp: '' };
  var bc = null, dbp = null;
  try { bc = new BroadcastChannel('vi-mg-v3'); } catch (e) { bc = null; }

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      var rq;
      try { rq = window.indexedDB.open(DB, 1); } catch (e) { reject(e); return; }
      rq.onupgradeneeded = function () { rq.result.createObjectStore(OS); };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
    return dbp;
  }
  function stampOf(events) { var l = events[events.length - 1]; return events.length + ':' + (l ? l.at + l.type : ''); }
  /* bring the cached state up to date with a log read from the database (validates every new event) */
  function sync(events) {
    if (stampOf(events) === cache.stamp && !cache.error) return cache;
    var base = cache.events, prefixOk = !cache.error && events.length >= base.length && (base.length === 0 || JSON.stringify(events[base.length - 1]) === JSON.stringify(base[base.length - 1]));
    try {
      var st;
      if (prefixOk) {
        st = cache.state;
        for (var i = base.length; i < events.length; i++) {
          var e = events[i];
          var r = M.reduce(st, { type: e.type, actor: e.actor, appId: e.type === 'apply.submit' ? null : e.appId, p: e.p, demo: e.demo });
          if (!r.ok || r.event.seq !== e.seq || r.event.at !== e.at) throw new Error('invalid_event:' + e.seq);
          st = r.state;
        }
      } else st = M.replay(events);
      cache = { state: st, events: events, error: null, stamp: stampOf(events) };
    } catch (err) {
      cache = { state: M.initial(), events: [], error: 'corrupt', stamp: 'corrupt' };
    }
    return cache;
  }
  function readDb() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(OS, 'readonly'), rq = tx.objectStore(OS).get(REC);
        rq.onsuccess = function () { var v = rq.result; resolve(v && v.schema === 3 && Array.isArray(v.events) ? v.events : v ? null : []); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function refresh(origin) {
    var before = cache.stamp;
    return readDb().then(function (events) {
      if (events === null) cache = { state: M.initial(), events: [], error: 'corrupt', stamp: 'corrupt' };
      else sync(events);
      if (cache.stamp !== before) notify(origin || 'external');
    }, function () { cache = { state: M.initial(), events: [], error: 'storage_unavailable', stamp: 'na' }; notify(origin || 'external'); });
  }
  function notify(origin) { listeners.forEach(function (fn) { try { fn(cache.state, origin); } catch (e) { setTimeout(function () { throw e; }); } }); }
  if (bc) bc.onmessage = function () { refresh('external'); };
  setInterval(function () { if (!document.hidden) refresh('external'); }, 2500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh('external'); });

  /* dispatch(action, seenSeq) → Promise<{ok, error?, event?, stale?}> */
  function dispatch(action, seenSeq) {
    return open().then(function (db) {
      return new Promise(function (resolve) {
        var result = null, tx;
        try { tx = db.transaction(OS, 'readwrite'); } catch (e) { resolve({ ok: false, error: 'storage_failed' }); return; }
        var os = tx.objectStore(OS), rq = os.get(REC);
        rq.onsuccess = function () {
          var v = rq.result, events = v && Array.isArray(v.events) ? v.events : [];
          var c = sync(events);
          if (c.error) { result = { ok: false, error: c.error }; return; }
          var r = M.reduce(c.state, action);
          if (!r.ok) { result = { ok: false, error: r.error, stale: seenSeq != null && seenSeq !== c.state.seq }; return; }
          var next = events.concat([r.event]);
          try { os.put({ schema: 3, events: next }, REC); }
          catch (e) { result = { ok: false, error: 'storage_failed' }; tx.abort(); return; }
          result = { ok: true, event: r.event, stale: seenSeq != null && seenSeq !== c.state.seq, state: r.state, events: next };
        };
        tx.oncomplete = function () {
          if (result && result.ok) {
            cache = { state: result.state, events: result.events, error: null, stamp: stampOf(result.events) };
            delete result.state; delete result.events;
            if (bc) bc.postMessage(result.event.seq);
            notify('local');
          }
          resolve(result || { ok: false, error: 'storage_failed' });
        };
        tx.onabort = tx.onerror = function () { resolve(result && !result.ok ? result : { ok: false, error: 'storage_failed' }); };
      });
    }, function () { return { ok: false, error: 'storage_unavailable' }; });
  }
  /* replace the whole log with a scenario built by the same reducer (demo control) */
  function replaceWith(build) {
    return open().then(function (db) {
      var res = build();
      return new Promise(function (resolve) {
        var tx = db.transaction(OS, 'readwrite');
        try { tx.objectStore(OS).put({ schema: 3, events: res.events }, REC); } catch (e) { resolve({ ok: false, error: 'storage_failed' }); return; }
        tx.oncomplete = function () {
          cache = { state: res.state, events: res.events, error: null, stamp: stampOf(res.events) };
          if (bc) bc.postMessage('replace'); notify('local'); resolve({ ok: true });
        };
        tx.onabort = tx.onerror = function () { resolve({ ok: false, error: 'storage_failed' }); };
      });
    });
  }
  function ownedKeys() {
    var out = [];
    for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) out.push(k); }
    return out;
  }
  function reset() {
    return open().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(OS, 'readwrite');
        tx.objectStore(OS).delete(REC);
        tx.oncomplete = function () {
          ownedKeys().forEach(function (k) { window.localStorage.removeItem(k); });
          try { window.sessionStorage.removeItem(SKEY); } catch (e) {}
          memSession = pinned ? { role: memSession.role, appId: null } : null;
          cache = { state: M.initial(), events: [], error: null, stamp: stampOf([]) };
          if (bc) bc.postMessage('reset'); notify('local'); resolve({ ok: true });
        };
        tx.onerror = function () { resolve({ ok: false, error: 'storage_failed' }); };
      });
    });
  }

  /* per-tab role session */
  var memSession = null, pinned = false;
  (function () {
    var q = new URLSearchParams(window.location.search);
    var role = q.get('role');
    if (role === 'organiser' || role === 'applicant') {
      var stored = null;
      try { stored = JSON.parse(window.sessionStorage.getItem(SKEY) || 'null'); } catch (e) {}
      /* the URL pins the role; this tab's remembered application survives a reload */
      memSession = { role: role, appId: q.get('app') || (stored && stored.appId) || null, lastAppId: stored && stored.lastAppId || null };
      pinned = true;
    }
  })();
  function session() {
    if (memSession) return memSession;
    try { var s = JSON.parse(window.sessionStorage.getItem(SKEY) || 'null'); if (s && s.role) return s; } catch (e) {}
    return { role: 'applicant', appId: null };
  }
  function setSession(s) {
    if (pinned) memSession = s;
    try { window.sessionStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { memSession = s; }
    notify('session');
  }
  function draft(code, kind) { try { return JSON.parse(window.localStorage.getItem(PREFIX + '-draft-' + kind + '-' + code) || 'null'); } catch (e) { return null; } }
  function saveDraft(code, kind, value) {
    try { window.localStorage.setItem(PREFIX + '-draft-' + kind + '-' + code, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  var ready = refresh('init');
  window.MGStore = {
    ready: function () { return ready; }, read: function () { return cache; }, refresh: refresh, dispatch: dispatch, replaceWith: replaceWith, reset: reset, ownedKeys: ownedKeys,
    session: session, setSession: setSession, draft: draft, saveDraft: saveDraft,
    subscribe: function (fn) { listeners.push(fn); }
  };
})();
