// package a-header — header that slims on scroll, carries the countdown, and takes over from the red deadline band.
// No external service, no tracking. Passive scroll listener, one rAF per frame at most.

const root = document.documentElement;
const header = document.querySelector('.site-header');
const band = document.querySelector('.deadline');
const DEADLINE = new Date('2026-11-28T23:59:59+01:00'); // same deadline as site.js
const daysLeft = Math.ceil((DEADLINE - new Date()) / 864e5);

if (header) {
  root.classList.add('hdr-js');
  if (daysLeft <= 0) root.classList.add('deadline-past');

  // "Signer · J-8" — J-n counts down to the last sending day (J = 28 November). Hidden once past.
  const btn = header.querySelector('.nav .btn-signal');
  if (btn && daysLeft >= 1 && !btn.querySelector('.sig-days')) {
    const label = daysLeft === 1 ? 'Jour J' : `J-${daysLeft - 1}`;
    const spoken = daysLeft === 1 ? ', dernier jour' : `, encore ${daysLeft} jours`;
    btn.insertAdjacentHTML('beforeend', `<span class="sig-days" aria-hidden="true">${label}</span><span class="sr">${spoken}</span>`);
  }

  // Measure the sticky stack so the header sits under the band, and anchors land below both.
  const measure = () => {
    const dl = band && !root.classList.contains('deadline-past') ? band.offsetHeight : 0;
    root.style.setProperty('--dl-h', dl + 'px');
    root.style.setProperty('--head-h', header.offsetHeight + 'px');
  };
  measure();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(measure);
    ro.observe(header); if (band) ro.observe(band);
  } else addEventListener('resize', measure);

  // Two states: .is-scrolled (slim bar, with hysteresis so it never flickers at the threshold)
  // and .past-fold (first screen left behind: the band folds away, the header carries the countdown).
  let scrolled = false, past = false, ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const s = scrolled ? y > 8 : y > 48;
    if (s !== scrolled) { scrolled = s; header.classList.toggle('is-scrolled', s); root.classList.toggle('is-scrolled', s); }
    const p = y > window.innerHeight * 0.8;
    if (p !== past) { past = p; root.classList.toggle('past-fold', p); }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// Phones: « Partager » sits just left of the « Signer » button, whose width changes with the countdown.
{
  const sg = document.querySelector('.nav .btn-signal');
  const fit = () => { if (sg) document.documentElement.style.setProperty('--sg-w', sg.offsetWidth + 'px'); };
  fit(); addEventListener('resize', fit); document.fonts?.ready.then(fit);
}
