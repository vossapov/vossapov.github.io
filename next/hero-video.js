/* Decorative hero video: no controls; respect motion preferences and visibility. */
(() => {
  const video = document.querySelector('.hero-film video');
  if (!video) return;
  const figure = video.closest('.hero-film');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  function sync() {
    if (!visible || document.hidden || reduced.matches) video.pause();
    else video.play().catch(() => { /* The poster remains when autoplay is unavailable. */ });
  }
  video.addEventListener('playing', () => figure.classList.add('is-playing'));
  video.addEventListener('error', () => figure.classList.add('film-failed'));
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .15 }).observe(figure);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
})();
