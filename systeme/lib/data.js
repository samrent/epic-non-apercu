// Shared loader: tokens + points library, resolved per segment.
export async function loadSystem(base = '../data/') {
  const [tokens, lib] = await Promise.all([
    fetch(base + 'tokens.json', { cache: 'no-store' }).then(r => r.json()),
    fetch(base + 'points.json', { cache: 'no-store' }).then(r => r.json()),
  ]);
  const byId = Object.fromEntries(lib.points.map(p => [p.id, p]));
  const segmentIds = Object.keys(lib.segments).filter(k => !k.startsWith('$'));
  function resolve(seg) {
    const s = lib.segments[seg];
    const c = tokens.segments[seg];
    if (!s || !c) throw new Error('Segment inconnu : ' + seg);
    const points = s.order.map(id => {
      if (!byId[id]) throw new Error(`Point « ${id} » absent de la bibliothèque`);
      return byId[id];
    });
    return {
      id: seg, ...s, color: c, points, hero: points[0], rest: points.slice(1),
      qr: lib.campaign.qrBase.replace('{segment}', seg),
    };
  }
  return { tokens, lib, segmentIds, resolve };
}

// Count unconfirmed facts so nothing marked tbc slips into print unnoticed.
export function pendingConfirmations(points) {
  return points.filter(p => p.source && p.source.tbc).map(p => `${p.id} : ${p.source.tbc}`);
}
