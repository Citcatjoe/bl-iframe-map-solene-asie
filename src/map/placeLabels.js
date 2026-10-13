// Placement des libellés HTML, recalculé après chaque mouvement (la même carte reste lisible en 632 px
// comme sur mobile). Chaque libellé cherche, autour de sa position, l'emplacement le moins coûteux :
//   - interdit : hors du cadre, sur les boutons ;
//   - à éviter : sur un trait de la carte (fleuve, canal, frontière, contour, rive de lac), sur un autre
//     libellé ou point, hors de sa zone (pays : dans sa trame ; zone : dans son contour) ;
//   - préféré : le plus près possible de sa position.
// Les noms de cours d'eau se posent le long de leur tracé, parallèles à lui, juste à côté.
// Les traits et zones sont lus dans les données sources (pas dans les tuiles : pas de faux bords).

const PRIORITY = { pin: 0, city: 1, area: 2, country: 3, water: 4 };
const DOT_RADIUS = { pin: 9, city: 4.5 };
const GAP = 11; // écart texte ↔ point (MapLabel)
const EDGE = 4;
const CELL = 32; // maille de l'index des traits (px)
const MIN_SEGMENT = 3; // simplification à l'écran (px)
const MAX_LINE_HITS = 3; // au-delà, inutile de compter

const COST = { frame: 1000, label: 300, outside: 300, line: 40 };

/** Décalages essayés pour un libellé centré : sur place, puis en anneaux de plus en plus larges. */
const RINGS = [6, 12, 18, 26, 36, 48, 62];
const DIRECTIONS = [[0, -1], [0, 1], [-1, 0], [1, 0], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];
const CENTER_OFFSETS = [[0, 0], ...RINGS.flatMap((r) => DIRECTIONS.map(([x, y]) => [Math.round(x * r), Math.round(y * r)]))];

const SIDES = ['right', 'left', 'top', 'bottom'];
const SIDE_SHIFTS = [0, -8, 8, -16, 16];

/** Cours d'eau : rayon de recherche le long du tracé, pas entre deux essais, écart au trait, pente max (au-delà : horizontal). */
const ALONG = { reach: 110, step: 8, clearance: 3, maxAngle: 50 };

// ── Géométrie : rectangles orientés { cx, cy, w, h, a (rad), cos, sin } ─────────────────────────────

const rectOf = (cx, cy, w, h, a) => ({ cx, cy, w, h, a, cos: Math.cos(a), sin: Math.sin(a) });

const corners = ({ cx, cy, w, h, cos, sin }) =>
  [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);

const aabb = (r) => {
  const ex = (Math.abs(r.w * r.cos) + Math.abs(r.h * r.sin)) / 2;
  const ey = (Math.abs(r.w * r.sin) + Math.abs(r.h * r.cos)) / 2;
  return [r.cx - ex, r.cy - ey, r.cx + ex, r.cy + ey];
};

const boxesOverlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** Deux rectangles orientés se chevauchent-ils ? (axes séparateurs) */
function rectsOverlap(r1, r2) {
  if (!boxesOverlap(aabb(r1), aabb(r2))) return false;
  const c1 = corners(r1);
  const c2 = corners(r2);
  for (const [ax, ay] of [[r1.cos, r1.sin], [-r1.sin, r1.cos], [r2.cos, r2.sin], [-r2.sin, r2.cos]]) {
    let min1 = Infinity;
    let max1 = -Infinity;
    let min2 = Infinity;
    let max2 = -Infinity;
    for (const [x, y] of c1) {
      const p = x * ax + y * ay;
      min1 = Math.min(min1, p);
      max1 = Math.max(max1, p);
    }
    for (const [x, y] of c2) {
      const p = x * ax + y * ay;
      min2 = Math.min(min2, p);
      max2 = Math.max(max2, p);
    }
    if (max1 <= min2 || max2 <= min1) return false;
  }
  return true;
}

/** Un segment coupe-t-il le rectangle orienté ? (repère du rectangle, puis Liang–Barsky) */
function segmentHitsRect(s, r) {
  const ax = s.x1 - r.cx;
  const ay = s.y1 - r.cy;
  const bx = s.x2 - r.cx;
  const by = s.y2 - r.cy;
  const x0 = ax * r.cos + ay * r.sin;
  const y0 = -ax * r.sin + ay * r.cos;
  const dx = bx * r.cos + by * r.sin - x0;
  const dy = -bx * r.sin + by * r.cos - y0;
  const hw = r.w / 2;
  const hh = r.h / 2;
  let t0 = 0;
  let t1 = 1;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, x0 + hw) && clip(dx, hw - x0) && clip(-dy, y0 + hh) && clip(dy, hh - y0);
}

// ── Données sources ──────────────────────────────────────────────────────────────────────────────

const sourceData = (map, sourceId, dataCache) => {
  if (!dataCache.has(sourceId)) dataCache.set(sourceId, map.getSource(sourceId).getData());
  return dataCache.get(sourceId);
};

/** Filtres des couches `bl-*` : sous-ensemble d'expressions utilisé par src/map/layers.js. */
function matches(filter, props) {
  if (!filter) return true;
  const [op, a, b] = filter;
  const value = (x) => (Array.isArray(x) && x[0] === 'get' ? props[x[1]] : Array.isArray(x) && x[0] === 'literal' ? x[1] : x);
  if (op === '!') return !matches(a, props);
  if (op === '==') return value(a) === value(b);
  if (op === '!=') return value(a) !== value(b);
  if (op === 'in') return value(b).includes(value(a));
  return true;
}

const linesOf = (g) =>
  g.type === 'LineString' ? [g.coordinates]
  : g.type === 'MultiLineString' || g.type === 'Polygon' ? g.coordinates
  : g.type === 'MultiPolygon' ? g.coordinates.flat()
  : [];

/** Ligne projetée à l'écran, simplifiée (sommets à moins de MIN_SEGMENT px du précédent écartés). */
function projectLine(map, line) {
  const out = [];
  for (const coord of line) {
    const p = map.project(coord);
    const last = out[out.length - 1];
    if (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) >= MIN_SEGMENT) out.push(p);
  }
  return out;
}

/** Segments à l'écran de toutes les couches-obstacles, indexés par maille ; segments des cours d'eau à part. */
async function collectSegments(map, dataCache) {
  const layers = map
    .getStyle()
    .layers.filter((l) => l.id.startsWith('bl-') && !l.id.endsWith('-halo') && (l.type === 'line' || l.id.includes('lacs')));
  const W = map.getCanvas().clientWidth;
  const H = map.getCanvas().clientHeight;
  const grid = new Map();
  const water = [];
  for (const layer of layers) {
    if (!map.getSource(layer.source)?.getData) continue;
    const data = await sourceData(map, layer.source, dataCache);
    const isWater = /eau|fleuves/.test(layer.id);
    for (const f of data.features ?? []) {
      if (!matches(layer.filter, f.properties ?? {})) continue;
      for (const line of linesOf(f.geometry)) {
        const pts = projectLine(map, line);
        for (let k = 1; k < pts.length; k++) {
          const s = { x1: pts[k - 1].x, y1: pts[k - 1].y, x2: pts[k].x, y2: pts[k].y, name: f.properties?.name };
          const x1 = Math.min(s.x1, s.x2);
          const x2 = Math.max(s.x1, s.x2);
          const y1 = Math.min(s.y1, s.y2);
          const y2 = Math.max(s.y1, s.y2);
          if (x2 < -CELL || x1 > W + CELL || y2 < -CELL || y1 > H + CELL) continue;
          if (isWater) water.push(s);
          for (let gx = Math.floor(x1 / CELL); gx <= Math.floor(x2 / CELL); gx++) {
            for (let gy = Math.floor(y1 / CELL); gy <= Math.floor(y2 / CELL); gy++) {
              const key = gx * 10007 + gy;
              if (!grid.has(key)) grid.set(key, []);
              grid.get(key).push(s);
            }
          }
        }
      }
    }
  }
  return { grid, water };
}

/** Nombre de segments coupés par le rectangle (plafonné). */
function linesHit(grid, rect) {
  const box = aabb(rect);
  const seen = new Set();
  let hits = 0;
  for (let gx = Math.floor(box[0] / CELL); gx <= Math.floor(box[2] / CELL); gx++) {
    for (let gy = Math.floor(box[1] / CELL); gy <= Math.floor(box[3] / CELL); gy++) {
      for (const s of grid.get(gx * 10007 + gy) ?? []) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (segmentHitsRect(s, rect) && ++hits >= MAX_LINE_HITS) return hits;
      }
    }
  }
  return hits;
}

/** Anneaux à l'écran des polygones d'une source (filtrés par pays si `iso`). */
async function zoneRings(map, sourceId, iso, dataCache) {
  if (!map.getSource(sourceId)) return null;
  const data = await sourceData(map, sourceId, dataCache);
  const rings = [];
  for (const f of data.features ?? []) {
    if (iso && f.properties?.iso !== iso) continue;
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const ring of polys.flat()) {
      const pts = projectLine(map, ring);
      if (pts.length < 3) continue;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      rings.push({ pts, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
  }
  return rings;
}

/** Point dans la zone (règle pair-impair sur tous les anneaux : trous et enclaves respectés). */
function inRings(rings, x, y) {
  let inside = false;
  for (const { pts, box } of rings) {
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i];
      const b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
  }
  return inside;
}

// ── Candidats ────────────────────────────────────────────────────────────────────────────────────

/** Points du cours d'eau nommé `name` à moins de ALONG.reach px de `p` (espacés de ALONG.step), avec la pente locale. */
function riverSamples(water, name, p) {
  const out = [];
  for (const s of water) {
    if (s.name !== name) continue;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const n = Math.max(1, Math.floor(len / ALONG.step));
    for (let k = 0; k < n; k++) {
      const x = s.x1 + ((s.x2 - s.x1) * k) / n;
      const y = s.y1 + ((s.y2 - s.y1) * k) / n;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > ALONG.reach) continue;
      const last = out[out.length - 1];
      if (last && Math.hypot(last.x - x, last.y - y) < ALONG.step) continue;
      out.push({ x, y, d, a: Math.atan2(s.y2 - s.y1, s.x2 - s.x1) });
    }
  }
  return out;
}

function waterCandidates(samples, w, h) {
  const out = [];
  const off = h / 2 + ALONG.clearance;
  for (const { x, y, d, a: raw } of samples) {
    // Lisible : jamais à l'envers, à l'horizontale si le cours est trop raide.
    let a = raw > Math.PI / 2 ? raw - Math.PI : raw < -Math.PI / 2 ? raw + Math.PI : raw;
    const steep = Math.abs((a * 180) / Math.PI) > ALONG.maxAngle;
    if (steep) a = 0;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const offsets = steep
      ? [[0, -off], [0, off], [w / 2 + ALONG.clearance + 2, 0], [-(w / 2 + ALONG.clearance + 2), 0]]
      : [[-nx * off, -ny * off], [nx * off, ny * off]];
    offsets.forEach(([ox, oy], k) => out.push({ cx: x + ox, cy: y + oy, a, cost: d * 0.12 + k * 0.5 }));
  }
  return out;
}

// ── Placement ────────────────────────────────────────────────────────────────────────────────────

/**
 * @param map       carte MapLibre
 * @param labels    def.labels
 * @param nodes     éléments des marqueurs (un par libellé, contenant `[data-label-text]`)
 * @param reserved  zones interdites (boutons), en coordonnées écran [x1, y1, x2, y2]
 * @param dataCache Map sourceId → Promise<GeoJSON>, partagée entre les appels
 * @returns         un placement par libellé : { dx, dy, rotate } (centré) ou { side, dy } (point)
 */
export async function placeLabels(map, labels, nodes, reserved, dataCache) {
  const canvas = map.getCanvas();
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const { grid, water } = await collectSegments(map, dataCache);

  // Zones attendues : un pays, ou l'intérieur d'une zone entourée.
  const zoneKey = (l) => (l.iso ? `iso:${l.iso}` : l.within ? `in:${l.within}` : null);
  const zones = new Map();
  for (const l of labels) {
    const key = zoneKey(l);
    if (key && !zones.has(key)) zones.set(key, await zoneRings(map, `bl-src-${l.iso ? 'ca-pays' : l.within}`, l.iso, dataCache));
  }

  const points = labels.map((l) => map.project([l.lng, l.lat]));
  const dots = labels.map((l, i) => (DOT_RADIUS[l.kind] ? rectOf(points[i].x, points[i].y, DOT_RADIUS[l.kind] * 2, DOT_RADIUS[l.kind] * 2, 0) : null));

  const placed = [];
  const result = labels.map(() => null);
  const order = labels.map((_, i) => i).sort((a, b) => PRIORITY[labels[a].kind] - PRIORITY[labels[b].kind]);

  for (const i of order) {
    const label = labels[i];
    const text = nodes[i]?.querySelector('[data-label-text]');
    if (!text) continue;
    const w = text.offsetWidth;
    const h = text.offsetHeight;
    const p = points[i];
    const isPoint = label.kind === 'pin' || label.kind === 'city';
    const zone = zones.get(zoneKey(label));

    let candidates;
    if (isPoint) {
      const preferred = label.side ?? 'right';
      candidates = [preferred, ...SIDES.filter((s) => s !== preferred)].flatMap((side, rank) =>
        SIDE_SHIFTS.map((dy) => {
          const y = p.y + dy;
          const cx = side === 'right' ? p.x + GAP + w / 2 : side === 'left' ? p.x - GAP - w / 2 : p.x;
          const cy = side === 'top' ? y - GAP - h / 2 : side === 'bottom' ? y + GAP + h / 2 : y;
          return { cx, cy, a: 0, side, dy, cost: rank * 3 + Math.abs(dy) * 0.3 };
        }),
      );
    } else {
      const rings = CENTER_OFFSETS.map(([dx, dy]) => ({ cx: p.x + dx, cy: p.y + dy, a: 0, cost: Math.hypot(dx, dy) * 0.35 }));
      const samples = label.kind === 'water' ? riverSamples(water, label.text, p) : [];
      // Le long du tracé d'abord ; à défaut (lac, tracé hors cadre), autour de la position, un peu plus cher.
      candidates = samples.length ? [...waterCandidates(samples, w, h), ...rings.map((c) => ({ ...c, cost: c.cost + 15 }))] : rings;
    }

    let best = null;
    for (const c of candidates) {
      const rect = rectOf(c.cx, c.cy, w, h, c.a);
      const box = aabb(rect);
      let score = c.cost;
      if (box[0] < EDGE || box[1] < EDGE || box[2] > W - EDGE || box[3] > H - EDGE) score += COST.frame;
      for (const r of reserved) if (boxesOverlap(box, r)) score += COST.frame;
      if (best && score >= best.score) continue; // les tests suivants ne font qu'ajouter
      for (const other of placed) if (rectsOverlap(rect, other)) score += COST.label;
      for (let j = 0; j < dots.length; j++) if (dots[j] && j !== i && rectsOverlap(rect, dots[j])) score += COST.label;
      if (best && score >= best.score) continue;
      score += linesHit(grid, rect) * COST.line;
      if (best && score >= best.score) continue;
      if (zone && !corners(rect).concat([[c.cx, c.cy]]).every(([x, y]) => inRings(zone, x, y))) score += COST.outside;
      if (!best || score < best.score) best = { c, rect, score };
      if (best.score <= 0.5) break; // sur place, sans conflit
    }

    placed.push(best.rect);
    const { c } = best;
    result[i] = isPoint ? { side: c.side, dy: c.dy } : { dx: c.cx - p.x, dy: c.cy - p.y, rotate: (c.a * 180) / Math.PI };
  }
  return result;
}
