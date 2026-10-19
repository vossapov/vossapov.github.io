/* Magnet from the pinned reference (motionsites "3D Portfolio"): the hero portrait leans toward a
   nearby cursor (padding 150px, strength 3; in 0.3s ease-out, out 0.6s ease-in-out).
   Fine pointers only; off under reduced motion. */
(function () {
  'use strict';
  var el = document.querySelector('.hero-film');
  if (!el || !window.matchMedia) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var PAD = 150, STRENGTH = 3, active = false, frame = 0, last = null;

  function apply() {
    frame = 0;
    if (!last) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var near = Math.abs(last.x - cx) < r.width / 2 + PAD && Math.abs(last.y - cy) < r.height / 2 + PAD;
    if (near) {
      if (!active) { active = true; el.style.transition = 'transform .3s ease-out'; }
      el.style.transform = 'translate3d(' + ((last.x - cx) / STRENGTH).toFixed(1) + 'px,' + ((last.y - cy) / STRENGTH).toFixed(1) + 'px,0)';
    } else if (active) {
      active = false;
      el.style.transition = 'transform .6s ease-in-out';
      el.style.transform = 'translate3d(0,0,0)';
    }
  }
  function move(e) {
    if (!fine.matches || reduce.matches) return;
    last = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(apply);
  }
  window.addEventListener('pointermove', move, { passive: true });
  reduce.addEventListener && reduce.addEventListener('change', function () { if (reduce.matches) { el.style.transform = ''; active = false; } });
})();
