// Contour de la vallée de Ferghana, calculé sur le relief plutôt que dessiné à la main.
//
// La vallée est une cuvette fermée par le Tian Shan au nord et à l'est, l'Alaï et le Turkestan au sud.
// On prend la zone sous VALLEY_MAX_ELEVATION reliée à Ferghana (ville), fermée à l'ouest au défilé
// de Khodjent (WEST_GATE_LON), là où le Syr-Daria quitte la vallée vers la steppe de la Faim.
// Une ouverture morphologique (OPENING_RADIUS) coupe les gorges étroites qui relient la vallée à d'autres
// bassins bas (gorges du Naryn vers Toktogoul, vallées latérales) sans entamer la cuvette elle-même.
//
// Relief : AWS Terrarium (Mapzen / Tilezen, SRTM), zoom 9 (≈ 250 m par pixel à cette latitude).
// Sortie : data/sources/ferghana-valley.geojson (brut, en degrés), simplifié ensuite par build-data.
//
// Usage : npm run valley

import { writeFile } from 'node:fs/promises';
import { contours } from 'd3-contour';
import { PNG } from 'pngjs';

export const VALLEY_MAX_ELEVATION = 1100; // m
export const WEST_GATE_LON = 69.6;
const OPENING_RADIUS = 8; // pixels (≈ 2 km) : coupe les couloirs de moins de ≈ 4 km de large
const SEED = [71.78, 40.39]; // Ferghana (ville)
const BBOX = [68.8, 39.4, 74.4, 42.0];
const Z = 9;
const TILE = 256;
const OUT = 'data/sources/ferghana-valley.geojson';

const lon2x = (lon) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z;
const x2lon = (x) => (x / 2 ** Z) * 360 - 180;
const y2lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) * 180) / Math.PI;

const x0 = Math.floor(lon2x(BBOX[0]));
const x1 = Math.floor(lon2x(BBOX[2]));
const y0 = Math.floor(lat2y(BBOX[3]));
const y1 = Math.floor(lat2y(BBOX[1]));
const W = (x1 - x0 + 1) * TILE;
const H = (y1 - y0 + 1) * TILE;
const elev = new Float32Array(W * H);

for (let tx = x0; tx <= x1; tx++) {
  for (let ty = y0; ty <= y1; ty++) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${tx}/${ty}.png`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const i = (py * TILE + px) * 4;
        const e = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
        elev[((ty - y0) * TILE + py) * W + (tx - x0) * TILE + px] = e;
      }
    }
  }
}

// Lissage léger (moyenne 5×5) : un contour sans dents de scie.
const smooth = new Float32Array(W * H);
const R = 2;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let s = 0;
    let n = 0;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const yy = y + dy;
        const xx = x + dx;
        if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
        s += elev[yy * W + xx];
        n++;
      }
    }
    smooth[y * W + x] = s / n;
  }
}

// Masque des terres basses, à l'est du défilé.
const gateX = (lon2x(WEST_GATE_LON) - x0) * TILE;
let mask = Float32Array.from(smooth, (e, i) => (e < VALLEY_MAX_ELEVATION && i % W >= gateX ? 1 : 0));

/** Filtre min ou max sur un carré de côté 2r+1 (deux passes séparables). */
function rankFilter(src, r, pick) {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = src[y * W + x];
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < W) v = pick(v, src[y * W + xx]);
      }
      tmp[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = tmp[y * W + x];
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < H) v = pick(v, tmp[yy * W + x]);
      }
      out[y * W + x] = v;
    }
  }
  return out;
}

/** Flou 3×3. */
function boxBlur(src) {
  const out = Float32Array.from(src);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[(y + dy) * W + x + dx];
      out[y * W + x] = s / 9;
    }
  }
  return out;
}

// Ouverture (érosion puis dilatation), puis léger flou pour un contour sans marches d'escalier.
mask = rankFilter(rankFilter(mask, OPENING_RADIUS, Math.min), OPENING_RADIUS, Math.max);
const [low] = contours().size([W, H]).thresholds([0.5])(Array.from(boxBlur(boxBlur(mask))));

const toLngLat = ([px, py]) => [+x2lon(x0 + px / TILE).toFixed(5), +y2lat(y0 + py / TILE).toFixed(5)];
const seed = [(lon2x(SEED[0]) - x0) * TILE, (lat2y(SEED[1]) - y0) * TILE];

const inside = ([x, y], ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

const valley = low.coordinates.find((poly) => inside(seed, poly[0]));
if (!valley) throw new Error('Aucun contour ne contient Ferghana : seuil ou défilé à revoir');

// Contour extérieur seul : les reliefs isolés dans la vallée ne la trouent pas.
const ring = valley[0].map(toLngLat);
await writeFile(
  OUT,
  `${JSON.stringify({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { name: 'Vallée de Ferghana', maxElevation: VALLEY_MAX_ELEVATION }, geometry: { type: 'Polygon', coordinates: [ring] } }],
  })}\n`,
);
console.log(`→ ${OUT} (${ring.length} points, seuil ${VALLEY_MAX_ELEVATION} m)`);
