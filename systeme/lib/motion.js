// Motion grammar for EPIC-NON, ported from the measured method:
// holds dominate, moves are short; speed is drawn as blur; cuts hide inside motion; stepped scale.

export function bezier([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return p => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - p) / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Local progress of a move that starts at `at` and lasts `frames`.
export function prog(local, at, frames) { return clamp((local - at) / Math.max(1, frames - 1)); }

// Hold for a broad public: frames per word with a floor.
export function readHold(text, rate) {
  const words = String(text).trim().split(/\s+/).length;
  return Math.max(rate.floor, words * rate.framesPerWord);
}

export function wrap(ctx, text, maxW) {
  // Split on plain spaces only, so non-breaking spaces (French « ? », « : ») keep punctuation attached.
  const words = String(text).split(/ +/); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Draw a text block; velocity blur = sub-sampled copies along the motion vector.
export function textBlock(ctx, { text, x, y, maxW, size, weight = 800, color, lh = 1.12, vx = 0, vy = 0, alpha = 1, align = 'left' }) {
  ctx.save();
  // Plex: heavy roles use Sans Condensed Bold, text roles use Sans.
  ctx.font = weight >= 650 ? `700 ${size}px 'IBM Plex Sans Condensed', 'Arial Narrow', sans-serif` : `${weight} ${size}px 'IBM Plex Sans', 'Helvetica Neue', sans-serif`;
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = align;
  const lines = wrap(ctx, text, maxW);
  const speed = Math.hypot(vx, vy);
  const n = speed > 2 ? 7 : 1;
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : (i / (n - 1) - 0.5);
    ctx.globalAlpha = alpha * (n === 1 ? 1 : 1.9 / n);
    lines.forEach((l, j) => ctx.fillText(l, x - vx * k, y + j * size * lh - vy * k));
  }
  ctx.restore();
  return lines.length * size * lh;
}
