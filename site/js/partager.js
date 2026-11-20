// Page « Matériel à partager ». Reads partager/manifest.json + data/tokens.json + data/points.json.
// Everything is local: no external request at runtime, no tracking, no share widget (only the browser's own share sheet).

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// French typography: the space before ? ! : ; » (and after «) never breaks.
const fr = s => String(s ?? '').replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
const num = (n, d = 0) => n.toLocaleString('fr-CH', { minimumFractionDigits: d, maximumFractionDigits: d });
const ko = b => (b > 0 ? `${num(Math.max(1, Math.round(b / 1024)))} Ko` : '');
const mo = b => (b > 0 ? `${num(b / 1048576, 1)} Mo` : '');
const getJSON = url => fetch(url, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

const [man, tokens, points] = await Promise.all([
  getJSON('partager/manifest.json'), getJSON('data/tokens.json'), getJSON('data/points.json'),
]);

const segTok = (tokens && tokens.segments) || {};
const segPts = (points && points.segments) || {};
const segMan = (man && man.segments) || {};
const keys = Object.keys(segTok).filter(k => !k.startsWith('$') && (!man || segMan[k]));

// ---------- Audience chips ----------
const chips = $('pp-chips');
const pick = () => {
  const q = new URLSearchParams(location.search).get('s');
  const h = location.hash.replace(/^#/, '');
  const m = h.match(/^pour=([a-z]+)/);
  const want = q || (m ? m[1] : h);
  return keys.includes(want) ? want : keys[0];
};

chips.innerHTML = keys.map(k => {
  const t = segTok[k];
  return `<button type="button" class="pp-chip" data-seg="${esc(k)}" aria-pressed="false" style="--c:${esc(t.primary)};--on-c:${esc(t.onPrimary || '#fff')}"><i aria-hidden="true"></i>${esc(t.label)}</button>`;
}).join('');

let current = null;
const video = $('pp-video');

const setLink = (el, href, label) => {
  if (!el) return;
  if (href) { el.href = href; el.hidden = false; el.removeAttribute('aria-disabled'); }
  else { el.removeAttribute('href'); el.setAttribute('aria-disabled', 'true'); }
  if (label != null) el.textContent = label;
};

function apply(seg, push) {
  if (!seg || seg === current) return;
  current = seg;
  const t = segTok[seg] || {}, m = segMan[seg] || {}, f = m.flyer || {}, s = m.story || {}, b = f.bytes || {};
  chips.querySelectorAll('.pp-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.seg === seg)));
  document.documentElement.style.setProperty('--pp-c', t.primary || 'var(--ink)');

  const hook = segPts[seg] && segPts[seg].hook;
  $('pp-hook').innerHTML = hook ? `<span>${esc(t.audience || '')}</span> ${esc(fr(hook))}` : '';
  document.querySelectorAll('[data-seg-label]').forEach(el => { el.textContent = `Pour : ${t.label || ''}`.replace(' :', ' :'); });

  // Flyer
  const recto = $('pp-recto'), verso = $('pp-verso');
  recto.src = f.recto || ''; verso.src = f.verso || '';
  const hookAlt = hook ? ` : « ${hook} »` : '';
  recto.alt = `Recto du flyer « ${t.label} »${hookAlt}`.replace(/« /g, '« ').replace(/ »/g, ' »');
  verso.alt = `Verso du flyer « ${t.label} » : les arguments et comment signer le référendum`.replace(/« /g, '« ').replace(/ »/g, ' »');
  const sz = k => (b[k] ? `, ${ko(b[k])}` : '');
  setLink($('pp-a5'), f.a5, `Imprimer chez soi · A5 (PDF${sz('a5')})`);
  setLink($('pp-a4'), f.a4, `2 par feuille A4, à couper (PDF${sz('a4')})`);
  setLink($('pp-couleur'), f.couleur, 'Version couleur pour imprimeur (PDF)');

  // Story: swap the source without autoplay; preload stays "none".
  const wasPlaying = !video.paused;
  video.pause();
  video.poster = s.poster || '';
  if (s.mp4) { video.src = s.mp4; video.load(); } else video.removeAttribute('src');
  video.setAttribute('aria-label', `Story vidéo « ${t.label} »${s.seconds ? `, ${Math.round(s.seconds)} secondes` : ''}`.replace(/« /g, '« ').replace(/ »/g, ' »'));
  if (wasPlaying) video.play().catch(() => {});
  setLink($('pp-mp4'), s.mp4, `Télécharger la vidéo (MP4${s.bytes ? `, ${mo(s.bytes)}` : ''})`);
  $('pp-share-status').textContent = '';

  if (push) {
    const q = new URLSearchParams(location.search); q.delete('s');
    const qs = q.toString().replace(/=(&|$)/g, '$1');
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}#pour=${seg}`);
  }
}

const centerChip = () => {
  const on = chips.querySelector('[aria-pressed="true"]');
  if (!on || chips.scrollWidth <= chips.clientWidth) return;
  chips.scrollLeft = Math.max(0, on.offsetLeft - chips.offsetLeft - (chips.clientWidth - on.offsetWidth) / 2);
};
const edges = () => {
  const max = chips.scrollWidth - chips.clientWidth;
  chips.classList.toggle('more-r', chips.scrollLeft < max - 2);
  chips.classList.toggle('more-l', chips.scrollLeft > 2);
};
chips.addEventListener('click', e => { const c = e.target.closest('.pp-chip'); if (c) apply(c.dataset.seg, true); });
chips.addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const all = [...chips.querySelectorAll('.pp-chip')], i = all.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length].focus();
});
chips.addEventListener('scroll', edges, { passive: true });
addEventListener('resize', edges);
addEventListener('hashchange', () => { apply(pick(), false); centerChip(); });

if (keys.length) { apply(pick(), false); centerChip(); edges(); }

// All-audiences PDFs
const all = (man && man.all) || {};
setLink($('pp-all-a5'), all.a5); setLink($('pp-all-a4'), all.a4); setLink($('pp-all-couleur'), all.couleur);
if (!all.a5 && !all.a4 && !all.couleur) document.querySelector('.pp-all').hidden = true;

// Signature sheets (absolute links to epic-non.ch, from the manifest when present)
if (man && man.feuilles) { setLink($('pp-f-a4'), man.feuilles.a4); setLink($('pp-f-a5'), man.feuilles.a5); }

// ---------- Web Share (files) ----------
const shareBtn = $('pp-share');
let canShareFiles = false;
try { canShareFiles = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([''], 'test.mp4', { type: 'video/mp4' })] })); } catch { canShareFiles = false; }
if (canShareFiles) {
  shareBtn.hidden = false;
  shareBtn.addEventListener('click', async () => {
    const s = (segMan[current] || {}).story || {}, status = $('pp-share-status');
    if (!s.mp4) return;
    shareBtn.disabled = true; status.textContent = 'Préparation de la vidéo…';
    try {
      const blob = await fetch(s.mp4).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); });
      const file = new File([blob], s.mp4.split('/').pop(), { type: 'video/mp4' });
      const data = { files: [file], text: 'Référendum contre le choix d’Epic pour nos dossiers patients. Signez avant le 28 novembre : epic-non.ch #EpicNon' };
      if (!navigator.canShare(data)) throw new Error('unsupported');
      status.textContent = '';
      await navigator.share(data);
    } catch (err) {
      status.textContent = err && err.name === 'AbortError' ? '' : 'Le partage direct n’a pas fonctionné. Téléchargez la vidéo puis publiez-la depuis votre application.';
    } finally { shareBtn.disabled = false; }
  });
}

// ---------- Carousels ----------
const list = (man && man.carrousels) || [];
// Slide format from the manifest (render-carousels.py: 1080 x 1350, 4:5). Reserves the right box before images load.
const fmt = (man && man.carrouselsFormat) || [1080, 1350];
document.documentElement.style.setProperty('--pp-car-ar', `${fmt[0]} / ${fmt[1]}`);
const cards = $('pp-cards');
if (man && man.carrouselsZip) { setLink($('pp-all-zip'), man.carrouselsZip); $('pp-all-zip-row').hidden = false; }

cards.innerHTML = list.map((c, i) => {
  const img = c.images && c.images[0];
  const thumb = img
    ? `<img src="${esc(img)}" alt="" width="${fmt[0]}" height="${fmt[1]}" loading="lazy" decoding="async">`
    : `<span class="pp-card-empty">Images bientôt</span>`;
  return `<li><button type="button" class="pp-card" data-i="${i}" aria-haspopup="dialog">
    <span class="pp-card-img">${thumb}</span>
    <span class="pp-card-t">${esc(fr(c.title))}</span>
    ${c.subtitle ? `<span class="pp-card-s">${esc(fr(c.subtitle))}</span>` : ''}
    <span class="sr">${img ? `, ${c.images.length} images` : ', images bientôt'}, ouvrir</span>
  </button></li>`;
}).join('');
if (!list.length) cards.outerHTML = '<p class="pp-help">Les carrousels arrivent bientôt.</p>';

const dlg = $('pp-viewer'), vImg = $('pp-v-img');
vImg.width = fmt[0]; vImg.height = fmt[1];
let open = null, idx = 0, opener = null;

const show = i => {
  const imgs = open.images || [];
  if (!imgs.length) return;
  idx = (i + imgs.length) % imgs.length;
  vImg.src = imgs[idx];
  vImg.alt = `${open.title}, image ${idx + 1} sur ${imgs.length}`;
  $('pp-v-count').textContent = `${idx + 1} / ${imgs.length}`;
  if (imgs[idx + 1]) { const pre = new Image(); pre.src = imgs[idx + 1]; }
};

const openViewer = (c, btn) => {
  open = c; opener = btn;
  const imgs = c.images || [];
  $('pp-v-title').textContent = fr(c.title);
  $('pp-v-sub').textContent = fr(c.subtitle || '');
  $('pp-v-sub').hidden = !c.subtitle;
  vImg.hidden = !imgs.length; $('pp-v-empty').hidden = !!imgs.length;
  $('pp-v-nav').hidden = imgs.length < 2;
  if (!imgs.length) { vImg.removeAttribute('src'); $('pp-v-count').textContent = ''; }
  setLink($('pp-v-zip'), c.zip);
  $('pp-v-zip').hidden = !c.zip;
  const text = c.caption || '';
  $('pp-v-text').innerHTML = text.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  $('pp-v-details').hidden = !text;
  $('pp-v-details').open = !imgs.length;
  $('pp-v-copied').textContent = '';
  show(0);
  dlg.showModal();
  dlg.scrollTop = 0;
  $('pp-v-close').focus();
};

cards.addEventListener && cards.addEventListener('click', e => {
  const b = e.target.closest('.pp-card');
  if (b) openViewer(list[+b.dataset.i], b);
});
$('pp-v-prev').addEventListener('click', () => show(idx - 1));
$('pp-v-next').addEventListener('click', () => show(idx + 1));
$('pp-v-close').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); // click on the backdrop
dlg.addEventListener('keydown', e => {
  if (!open || (open.images || []).length < 2) return;
  if (e.target.closest && e.target.closest('summary, .pp-v-text')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
});
dlg.addEventListener('close', () => {
  vImg.removeAttribute('src');
  if (opener && opener.isConnected) opener.focus();
  open = null;
});

// Copy caption
const copied = $('pp-v-copied');
let copyT = 0;
$('pp-v-copy').addEventListener('click', async () => {
  const text = (open && open.caption) || '';
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    // Fallback: select the text so the person can copy it by hand.
    const r = document.createRange(); r.selectNodeContents($('pp-v-text'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  copied.textContent = ok ? 'Copié' : 'Texte sélectionné : copiez-le avec Ctrl+C ou ⌘+C.';
  clearTimeout(copyT); copyT = setTimeout(() => { copied.textContent = ''; }, 4000);
});
