// EPIC-NON site script. Renders from data/points.json + data/tokens.json (same library as the flyers).
// No external service, no tracking.

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// French typography: the space before ? ! : ; » (and after «) never breaks, so a "?" is never orphaned on its own line.
// Only the kind of space changes; the words stay exactly as written.
const nbspFR = root => {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n =>
    n.parentElement && !n.parentElement.closest('script, style, textarea, code, pre') && /[ ][?!:;»]|«[ ]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(n => { n.nodeValue = n.nodeValue.replace(/ ([?!:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0'); });
};

// --- Days left ---
const DEADLINE = new Date('2026-11-28T23:59:59+01:00');
document.querySelectorAll('[data-days-left]').forEach(el => {
  const d = Math.ceil((DEADLINE - new Date()) / 864e5);
  el.textContent = d > 1 ? `Encore ${d} jours` : d === 1 ? 'Dernier jour' : 'Délai d’envoi dépassé';
});

// --- Signature counter (compteur.json, updated each evening; hidden until 6 000 signatures) ---
const box = $('#compteur');
if (box) {
  fetch('compteur.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
    const n = Number(d?.recues) || 0; if (n < (Number(d?.afficherDes) || 6000)) return; // shown only once the total passes 6 000 (or compteur.json "afficherDes")
    const goal = Number(d.objectif) || 12000, fmt = x => x.toLocaleString('fr-CH');
    box.querySelector('[data-num]').textContent = fmt(n);
    box.querySelector('[data-of]').textContent = `signatures reçues sur ${fmt(goal)} · il en manque ${fmt(Math.max(0, goal - n))}`;
    const track = box.querySelector('.bar'); track.setAttribute('aria-valuenow', n); track.setAttribute('aria-valuemax', goal);
    if (d.maj) { const t = new Date(d.maj); box.querySelector('[data-maj]').textContent = `Mis à jour le ${t.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' })} à ${t.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}. Avant contrôle par les communes.`; }
    box.hidden = false;
    requestAnimationFrame(() => { box.querySelector('[data-bar]').style.width = Math.min(100, n / goal * 100) + '%'; });
  }).catch(() => {});
}

// --- Library ---
const [tokens, lib] = await Promise.all([
  fetch('data/tokens.json').then(r => r.json()),
  fetch('data/points.json').then(r => r.json()),
]).catch(() => [null, null]);

if (tokens && lib) {
  const segIds = Object.keys(lib.segments).filter(k => !k.startsWith('$'));
  const byId = Object.fromEntries(lib.points.map(p => [p.id, p]));
  const col = id => tokens.segments[id];

  // Colour helpers (hex in, hex out) for the tile "cut" tone.
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const lum = h => rgb(h).map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const segVars = c => `--p:${c.primary};--t:${c.tint};--on-p:${c.onPrimary}`;

  // Comparison: left = status quo (muted, struck), right = what we ask (full segment colour), ≠ on the seam.
  // compare.mode "pair" (or the PAIR list) = two facts side by side, nothing struck (e.g. Norvège / Danemark).
  const PAIR = new Set(['ailleurs']);
  const cmpHTML = (p, sep = '≠') => {
    const pair = p.compare.mode === 'pair' || (!p.compare.mode && PAIR.has(p.id));
    return `<div class="cmp${pair ? ' cmp-pair' : ''}">
        <div class="cmp-l"><b>${esc(p.compare.left.label)}</b><span>${esc(p.compare.left.text)}</span></div>
        <i class="cmp-x" aria-hidden="true">${pair ? '+' : esc(sep)}</i>
        <div class="cmp-r"><b>${esc(p.compare.right.label)}</b><span>${esc(p.compare.right.text)}</span></div>
      </div>`;
  };

  // Sources as footnotes. Supports source {text, url?, tbc?} and source.links [{text, url, publisher?, date?}].
  const safeUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
  const notes = s => {
    if (!s) return '';
    const links = Array.isArray(s.links) && s.links.length ? s.links : [{ text: s.text, url: s.url }];
    const items = links.filter(l => l && (l.text || l.publisher)).map((l, i) => {
      const pub = l.publisher && l.text && l.text.toLowerCase().startsWith(l.publisher.toLowerCase()) ? '' : l.publisher;
      const label = [pub, l.text, l.date].filter(Boolean).map(esc).join(' · '), url = safeUrl(l.url);
      return `<li><span class="fn-n" aria-hidden="true">${i + 1}</span>${url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="fn-go" aria-hidden="true">↗</span><span class="sr"> (nouvel onglet)</span></a>`
        : `<span>${label}</span>`}</li>`;
    });
    if (s.tbc) items.push(`<li class="fn-tbc"><span class="fn-n" aria-hidden="true">!</span><mark class="tbc">à confirmer : ${esc(s.tbc)}</mark></li>`);
    return items.length ? `<footer class="fn"><p class="fn-h">Source${items.length > 1 ? 's' : ''}</p><ol>${items.join('')}</ol></footer>` : '';
  };

  // Point card: colour tab on the top edge (segment name), comparison, "concerne aussi" chips, footnotes.
  const pointCard = (p, tabId) => {
    const tid = tabId || p.segments[0], c = col(tid);
    const others = p.segments.filter(s => s !== tid && col(s));
    return `
    <article class="point" id="${esc(p.id)}" style="${segVars(c)}" data-segs="${esc(p.segments.join(' '))}">
      <p class="pt-tab">${esc(c.label)}</p>
      ${p.objection ? `<p class="pt-obj"><span>On entend :</span> ${esc(p.objection)}</p>` : ''}
      <h3>${esc(p.title)}</h3>
      <p class="ess">${esc(p.essential)}</p>
      ${p.analogy ? `<p class="pt-ana"><span>Autrement dit :</span> ${esc(p.analogy)}</p>` : ''}
      ${p.compare ? cmpHTML(p) : ''}
      ${others.length ? `<p class="also"><span class="also-h">Concerne aussi</span>${others.map(s =>
        `<a class="also-c" href="comprendre.html#pour=${s}" style="--c:${col(s).primary}"><i aria-hidden="true"></i>${esc(col(s).label)}</a>`).join('')}</p>` : ''}
      ${notes(p.source)}
    </article>`;
  };

  // Home: what is voted on (same comparison grammar; "ou" in the seam badge, refusal in signal red)
  const vote = $('#vote-cmp');
  if (vote && byId.vote?.compare) {
    const tpl = document.createElement('template');
    tpl.innerHTML = cmpHTML(byId.vote, 'ou');
    vote.innerHTML = tpl.content.firstElementChild.innerHTML;
    vote.style.setProperty('--p', tokens.color.signal);
    vote.style.setProperty('--on-p', tokens.color.signalInk);
  }

  // Line pictograms per segment (48-unit grid, drawn at ~44px, 2-unit stroke, currentColor).
  const PICTO = {
    secret: '<rect x="10" y="21" width="28" height="21"/><path d="M16 21v-6a8 8 0 0 1 16 0v6M24 29v6"/>',
    soignant: '<path d="M10 6h6M28 6h6M13 6v11a9 9 0 0 0 18 0V6M22 26v5a8 8 0 0 0 16 0v-4"/><rect x="34" y="19" width="8" height="8"/>',
    suisse: '<rect x="7" y="7" width="34" height="34"/><path d="M20 14h8v6h6v8h-6v6h-8v-6h-6v-8h6z"/>',
    argent: '<ellipse cx="24" cy="11" rx="13" ry="5"/><path d="M11 11v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 19v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8M11 27v8c0 2.8 5.8 5 13 5s13-2.2 13-5v-8"/>',
    egalite: '<path d="M24 9v31M15 41h18M9 14h30M9 14 4 27M9 14l5 13M39 14l-5 13M39 14l5 13M3 27h12a6 6 0 0 1-12 0zM33 27h12a6 6 0 0 1-12 0z"/><rect x="22" y="5" width="4" height="4"/>',
    ia: '<rect x="13" y="13" width="22" height="22"/><rect x="20" y="20" width="8" height="8"/><path d="M19 13V6M24 13V6M29 13V6M19 42v-7M24 42v-7M29 42v-7M13 19H6M13 24H6M13 29H6M42 19h-7M42 24h-7M42 29h-7"/>',
    technique: '<path d="M15 13 5 24l10 11M33 13l10 11-10 11M28 8l-8 32"/>',
    region: '<path d="M24 31s-9-9.3-9-16a9 9 0 0 1 18 0c0 6.7-9 16-9 16z"/><rect x="21.5" y="12.5" width="5" height="5"/><path d="M3 42l11-8 7 4 7-5 17 9"/>',
  };
  const picto = id => PICTO[id] ? `<svg class="pic" viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true" focusable="false">${PICTO[id]}</svg>` : '';

  // Home: audience tiles. --tcut = the tone of the diagonal panel that cuts in on hover/focus:
  // darker primary, or (for near-black primaries) a shade toward the on-colour, so text keeps its contrast.
  const tiles = $('#tiles');
  if (tiles) tiles.innerHTML = segIds.map(id => {
    const c = col(id), s = lib.segments[id];
    const cut = lum(c.primary) < .04 ? mix(c.primary, c.onPrimary, .18) : mix(c.primary, '#000000', .32);
    return `<a class="tile" data-seg="${id}" href="comprendre.html#pour=${id}" style="--tp:${c.primary};--ton:${c.onPrimary};--tcut:${cut}">
      ${picto(id)}<span class="lab">${esc(c.label)}</span><span class="hook">${esc(s.hook)}</span><span class="go">Voir les réponses →</span></a>`;
  }).join('');

  // Home: essentials
  const ess = $('#essentials');
  if (ess) ess.innerHTML = ess.dataset.ids.split(' ').map(id => pointCard(byId[id])).join('');

  // Library page
  const list = $('#library');
  if (list) {
    const head = $('#lib-head'), filters = $('#filters'), count = $('#count');
    filters.innerHTML = `<button class="chip" data-f="tout" aria-pressed="true"><i></i>Tout</button>` + segIds.map(id =>
      `<button class="chip" data-f="${id}" aria-pressed="false" style="--c:${col(id).primary};--on-c:${col(id).onPrimary}"><i></i>${esc(col(id).label)}</button>`).join('');
    const apply = (f, push) => {
      if (!segIds.includes(f)) f = 'tout';
      filters.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
      let pts, c = null;
      if (f === 'tout') { pts = lib.points; }
      else {
        c = col(f);
        const first = lib.segments[f].order.map(id => byId[id]);
        pts = [...first, ...lib.points.filter(p => p.segments.includes(f) && !first.includes(p))];
      }
      head.style.setProperty('--p', c ? c.primary : 'var(--ink)');
      head.style.setProperty('--on', c ? c.onPrimary : 'var(--paper)');
      head.querySelector('[data-k]').textContent = c ? `${c.label} · ${c.audience}` : 'Bibliothèque';
      head.querySelector('h1').textContent = c ? lib.segments[f].hook : 'Comprendre l’enjeu, point par point';
      head.querySelector('[data-d]').textContent = c ? 'Les points qui vous concernent d’abord. Chacun compare la situation avec Epic et ce que nous demandons.' : 'Chaque point tient en une phrase, puis compare deux situations. Choisissez ce qui compte pour vous.';
      list.innerHTML = pts.map(p => pointCard(p, c ? f : null)).join('');
      nbspFR(head); nbspFR(list);
      count.textContent = `${pts.length} point${pts.length > 1 ? 's' : ''}`;
      if (push) history.replaceState(null, '', f === 'tout' ? location.pathname : `#pour=${f}`);
    };
    filters.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) apply(b.dataset.f, true); });
    const m = location.hash.match(/pour=([a-z]+)/);
    apply(m ? m[1] : 'tout', false);
    addEventListener('hashchange', () => { const h = location.hash.match(/pour=([a-z]+)/); apply(h ? h[1] : 'tout', false); });
  }
}

// ===== Energy layer: motion grammar from the flyers =====
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Content is visible by default: the reveal only adds a short arrival on top (never a blank section).
// ?noreveal in the URL (screenshots, print checks) or reduced motion turns the effect off entirely.
const noReveal = reduce || /[?&]noreveal\b/.test(location.search);
document.documentElement.classList.add('js');
if (noReveal) document.documentElement.classList.add('no-reveal');

// Snap-in reveals (arrive 5 frames, then hold). Applied to section heads, cards, tiles, steps.
nbspFR(document.querySelector('main'));
document.querySelectorAll('.section-head, .who, .tile, .point, .card, .vote > div, .lib-head').forEach(el => el.classList.add('reveal'));
const showNow = el => { el.classList.add('in', 'now'); };
const io = !noReveal && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    // Stagger siblings by 1.5 frames (~60 ms), like the glyph staggers in the sizzle (capped so nothing waits long).
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = Math.min(240, Math.max(0, sibs.indexOf(el)) * 60) + 'ms';
    el.classList.add('in'); io.unobserve(el);
    const b = el.querySelector('[data-step-to]'); if (b) stepTo(b);
  });
}, { rootMargin: '0px 0px -8% 0px' }) : null;
document.querySelectorAll('.reveal').forEach(el => {
  // Anything already in or above the viewport at load is shown at once, without transition.
  if (!io || el.getBoundingClientRect().top < innerHeight) {
    showNow(el);
    const b = !noReveal && el.querySelector('[data-step-to]'); if (b) stepTo(b);
  } else io.observe(el);
});
// Safety: whatever has not arrived 1.2 s after a scroll stops (fast flings, jumps to anchors) is shown anyway.
if (io) {
  let t;
  const sweep = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight) { showNow(el); io.unobserve(el); }
  });
  addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(sweep, 1200); }, { passive: true });
  // Also once after load (anchor jumps, restored scroll position, throttled observers).
  setTimeout(sweep, 1200);
  addEventListener('beforeprint', () => document.querySelectorAll('.reveal').forEach(showNow));
}

// Stepped number: held values, never a tween (stepScale grammar). 6 steps, 70 ms each.
function stepTo(el) {
  const final = el.dataset.stepTo, n = parseFloat(final.replace(/\s/g, '').replace(',', '.'));
  if (reduce || !isFinite(n)) { el.textContent = final; return; }
  const dec = (final.split(',')[1] || '').length, steps = 6;
  for (let i = 1; i <= steps; i++) setTimeout(() => {
    el.textContent = i === steps ? final : (n * i / steps).toLocaleString('fr-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }, i * 70);
}

// Hero reel: "Qui contrôle …" spins to each audience's concern, lands with a hard stop, colour cuts on landing.
// QR landing (?s=<segment>, from the flyer QR codes): the reel lands on that segment and stays. Unknown values are ignored.
const track = document.getElementById('reel-track');
const qrSeg = (() => {
  const s = new URLSearchParams(location.search).get('s');
  return s && tokens && lib && !s.startsWith('$') && Object.hasOwn(lib.segments, s) && tokens.segments?.[s] ? s : null;
})();
if (track && tokens && lib && (qrSeg || !reduce)) {
  const hero = document.getElementById('hero'), forLink = document.getElementById('reel-for');
  const ids = qrSeg ? [qrSeg] : Object.keys(lib.segments).filter(k => !k.startsWith('$'));
  const items = [...(qrSeg ? [] : [{ id: null, word: 'nos données médicales' }]), ...ids.map(id => ({ id, word: lib.segments[id].reel }))];
  track.innerHTML = items.map(it => `<span>${esc(it.word)} ?</span>`).join('') + (qrSeg ? '' : `<span>${esc(items[0].word)} ?</span>`);
  let i = 0;
  const land = idx => {
    const it = items[idx % items.length], c = it.id ? tokens.segments[it.id] : null;
    hero.style.setProperty('--hb', c ? c.primary : '#16181B');
    hero.style.setProperty('--hon', c ? c.onPrimary : '#FFFFFF');
    forLink.href = c ? `comprendre.html#pour=${it.id}` : 'comprendre.html';
    forLink.textContent = c ? `Les réponses pour : ${c.label} →` : 'Voir les réponses →';
  };
  land(0);
  if (!qrSeg) setInterval(() => {
    if (document.hidden) return;
    i++;
    track.style.transition = 'transform 420ms cubic-bezier(.45,0,.85,1), filter 420ms';
    track.style.filter = 'blur(3px)';
    track.style.transform = `translateY(${-i * 1.1}em)`;
    setTimeout(() => { track.style.filter = 'none'; land(i); }, 380); // colour cut hides inside the motion
    if (i === items.length) setTimeout(() => { track.style.transition = 'none'; track.style.transform = 'translateY(0)'; i = 0; }, 460);
  }, 2600);
}

// Fit the hero headline so the longest reel word always fits its column (no clipping on phones, no overlap with the counter).
const reelH = document.querySelector('.reel-h');
if (reelH) {
  const fitReel = () => {
    const tr = document.getElementById('reel-track'), col = reelH.querySelector('.reel').clientWidth;
    reelH.style.fontSize = '';
    const base = parseFloat(getComputedStyle(reelH).fontSize);
    const widest = Math.max(...[...tr.children].map(s => s.scrollWidth), reelH.querySelector('.fixed').scrollWidth);
    if (widest > col) reelH.style.fontSize = Math.floor(base * col / widest * 0.98) + 'px';
  };
  addEventListener('resize', fitReel);
  // Refit once the display face has really loaded (fonts.ready can resolve before an @import font is fetched).
  document.fonts.load("700 72px 'IBM Plex Sans Condensed'").then(fitReel);
  document.fonts.ready.then(fitReel);
  setTimeout(fitReel, 1500);
}

// QR landing line in #signer: names the flyer the visitor holds and links to its points. Hidden otherwise.
const sgFrom = document.getElementById('sg-from');
if (sgFrom && qrSeg) {
  sgFrom.innerHTML = `Vous avez le flyer «\u00A0${esc(tokens.segments[qrSeg].label)}\u00A0»\u00A0: retrouvez ses points sur <a href="comprendre.html#pour=${qrSeg}">la page Comprendre</a>.`;
  sgFrom.hidden = false;
}

// Deep links (#signer from the flyer QR codes, #aider …): the library above is rendered from JSON after the
// browser's own jump to the anchor, which pushes the target down. Re-anchor once the content is in place.
{
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && !id.includes('=') && document.getElementById(id);
  if (target) {
    const jump = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
    requestAnimationFrame(jump);
    document.fonts.ready.then(() => requestAnimationFrame(jump));
  }
}
