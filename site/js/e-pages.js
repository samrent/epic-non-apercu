// Package E: library page chrome (sticky filter bar, poster head), per-card print, print safety.
// Runs independently of site.js timing: everything hooks in through observers.

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Header height -> --hdr-h (the header shrinks on scroll, so keep measuring) ---
const header = document.querySelector('.site-header');
const setHdr = () => {
  if (!header) return;
  const h = header.getBoundingClientRect().height;
  root.style.setProperty('--hdr-h', `${Math.round(h)}px`);
};
setHdr();
if (header && 'ResizeObserver' in window) new ResizeObserver(setHdr).observe(header);
addEventListener('resize', setHdr);

// --- Library page ---
const top = document.querySelector('.lib-top');
const bar = document.getElementById('lib-bar');
const filters = document.getElementById('filters');
const head = document.getElementById('lib-head');
const library = document.getElementById('library');

if (top && bar && filters) {
  const setBar = () => root.style.setProperty('--bar-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
  if ('ResizeObserver' in window) new ResizeObserver(setBar).observe(bar);
  setBar();

  // Stuck state: hairline + segment stripe once the bar is pinned under the header.
  let raf = 0;
  const checkStuck = () => {
    raf = 0;
    const hdr = parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 0;
    bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= hdr + 1 && scrollY > 0);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(checkStuck); }, { passive: true });
  checkStuck();

  // Horizontal chip row: edge fades only where there is more to scroll.
  const edges = () => {
    const max = filters.scrollWidth - filters.clientWidth;
    filters.classList.toggle('more-r', filters.scrollLeft < max - 2);
    filters.classList.toggle('more-l', filters.scrollLeft > 2);
  };
  filters.addEventListener('scroll', edges, { passive: true });
  addEventListener('resize', edges);

  const centerActive = smooth => {
    const on = filters.querySelector('[aria-pressed="true"]');
    if (!on || filters.scrollWidth <= filters.clientWidth) return;
    const left = on.offsetLeft - (filters.clientWidth - on.offsetWidth) / 2;
    filters.scrollTo({ left: Math.max(0, left), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };

  // Mirror the active segment onto the section (bar stripe, dark-mode-safe "Tout" head).
  const sync = () => {
    const on = filters.querySelector('[aria-pressed="true"]');
    const seg = on ? on.dataset.f : 'tout';
    top.dataset.seg = seg;
    if (head) {
      const cs = head.style;
      const p = cs.getPropertyValue('--p'), o = cs.getPropertyValue('--on');
      if (p) top.style.setProperty('--seg', seg === 'tout' ? 'var(--signal)' : p);
      if (o) top.style.setProperty('--seg-on', o);
    }
    edges();
  };
  // site.js renders the chips after its data fetch (often after this module ran): centre the active chip once they exist.
  new MutationObserver(muts => {
    sync();
    if (muts.some(m => m.type === 'childList' && m.target === filters)) centerActive(false);
  }).observe(filters, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'], childList: true });
  sync(); centerActive(false);

  // Head swap: a short arrival when the headline changes (colour itself cuts hard).
  if (head) {
    const h1 = head.querySelector('h1');
    let last = h1 ? h1.textContent : '';
    // Only animate swaps the reader asked for (chip click, hash change), never the first render.
    let armed = false;
    const arm = () => { armed = true; };
    filters.addEventListener('click', arm, true);
    addEventListener('hashchange', arm, true);
    new MutationObserver(() => {
      if (!h1 || h1.textContent === last) return;
      last = h1.textContent;
      if (reduce || !armed || root.classList.contains('no-reveal')) return;
      head.classList.remove('swap'); void head.offsetWidth; head.classList.add('swap');
    }).observe(head, { subtree: true, childList: true, characterData: true });
  }

  // Choosing a filter while pinned: bring the list start back under the bar.
  filters.addEventListener('click', e => {
    if (!e.target.closest('.chip')) return;
    requestAnimationFrame(() => {
      centerActive(true);
      if (!bar.classList.contains('is-stuck') || !library) return;
      const hdr = parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 0;
      const y = top.getBoundingClientRect().top + scrollY + (head ? head.offsetHeight : 0) - hdr;
      scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  addEventListener('hashchange', () => requestAnimationFrame(() => centerActive(true)));
}

// --- "Imprimer ce point": prints a single card as a clean handout ---
const clearPrintOne = () => {
  document.body.classList.remove('print-one');
  document.querySelectorAll('[data-print-one],[data-print-path]').forEach(el => {
    el.removeAttribute('data-print-one'); el.removeAttribute('data-print-path');
  });
};
const printOne = card => {
  clearPrintOne();
  card.setAttribute('data-print-one', '');
  for (let el = card.parentElement; el && el !== document.body; el = el.parentElement) el.setAttribute('data-print-path', '');
  document.body.classList.add('print-one');
  window.print();
};
addEventListener('afterprint', clearPrintOne);

const addPrintButtons = container => {
  container.querySelectorAll(':scope > .point').forEach(card => {
    if (card.querySelector(':scope > .print-one')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'print-one';
    b.textContent = 'Imprimer ce point';
    const t = card.querySelector('h3');
    if (t) b.setAttribute('aria-label', `Imprimer ce point : ${t.textContent}`);
    b.addEventListener('click', () => printOne(card));
    card.appendChild(b);
  });
};
['library', 'essentials'].forEach(id => {
  const c = document.getElementById(id);
  if (!c) return;
  addPrintButtons(c);
  new MutationObserver(() => addPrintButtons(c)).observe(c, { childList: true });
});

// Print safety: everything visible, whatever the reveal state.
addEventListener('beforeprint', () => document.querySelectorAll('.reveal').forEach(el => el.classList.add('in', 'now')));
