/* Shared helpers for the non-profit demos: browser-only storage, toast, file download, reset.
   Nothing here talks to a server. */
(function () {
  'use strict';

  function store(key) {
    return {
      get: function () {
        try { var raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
      },
      set: function (value) {
        try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
      },
      clear: function () { try { window.localStorage.removeItem(key); } catch (e) { /* unavailable */ } }
    };
  }

  var toastEl = null, toastTimer = 0;
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'd-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!opts.error);
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('visible'); }, opts.ms || 2600);
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(','), mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(parts[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* reset buttons: [data-demo-reset="<storage key>"] */
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-demo-reset]') : null;
    if (!btn) return;
    var keys = btn.getAttribute('data-demo-reset').split(/\s+/);
    if (!window.confirm(btn.getAttribute('data-confirm') || 'Почати демо спочатку? Введені дані зникнуть.')) return;
    keys.forEach(function (k) { store(k).clear(); });
    window.location.hash = '';
    window.location.reload();
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.NGODemo = { store: store, toast: toast, download: download, dataUrlToBlob: dataUrlToBlob, esc: esc };
})();
