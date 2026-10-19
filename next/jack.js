/* The hero portrait used to lean toward a nearby cursor (a parallax magnet from the pinned
   motionsites reference). Removed on the owner's request — the hero video now sits still.
   Kept as a no-op so the cached script URL and any references stay valid. */
(function () {
  'use strict';
  var el = document.querySelector('.hero-film');
  if (el) el.style.transform = '';
})();
