// Construit les fichiers servis aux cartes (public/data/*.geojson) à partir des sources brutes :
//   data/sources/osm/*.geojson                         OpenStreetMap via Nominatim (npm run osm), ODbL
//   data/sources/ferghana-valley.geojson               contour de la vallée calculé sur le relief (npm run valley)
//   data/sources/ne_10m_rivers_lake_centerlines.geojson Natural Earth 1:10m, domaine public
//
// Usage : npm run data

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { booleanPointInPolygon, point } from '@turf/turf';
import mapshaper from 'mapshaper';

const OUT = 'public/data';
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));
const osm = (key) => read(`data/sources/osm/${key}.geojson`);
const fc = (features) => ({ type: 'FeatureCollection', features });
const withProps = (geojson, properties) => geojson.features.map((f) => ({ type: 'Feature', properties, geometry: f.geometry }));

/** Passe une FeatureCollection dans mapshaper ; renvoie la (ou les) FeatureCollection(s) produites. */
async function shape(input, commands, outputs = ['out.json']) {
  const out = await mapshaper.applyCommands(`-i in.json ${commands}`, { 'in.json': input });
  return outputs.map((name) => JSON.parse(out[name].toString()));
}

const save = async (name, geojson) => {
  const text = `${JSON.stringify(geojson)}\n`;
  await writeFile(`${OUT}/${name}.geojson`, text);
  console.log(`→ ${OUT}/${name}.geojson (${(text.length / 1024).toFixed(0)} Ko, ${geojson.features.length} objets)`);
};

const GJ = 'format=geojson geojson-type=FeatureCollection precision=0.00001';

await mkdir(OUT, { recursive: true });

// ── Asie centrale : pays, frontières entre eux, enclave de Vorukh ───────────────────────────────

const COUNTRIES = { KG: 'kirghizistan', TJ: 'tadjikistan', UZ: 'ouzbekistan' };
const countriesRaw = fc((await Promise.all(Object.entries(COUNTRIES).map(async ([iso, key]) => withProps(await osm(key), { iso })))).flat());

// Simplification commune (topologie partagée) : frontières identiques des deux côtés, enclaves conservées.
const [countries, inner] = await shape(
  countriesRaw,
  `-simplify interval=80 keep-shapes -clean -o pays.json ${GJ} -innerlines -explode -o lignes.json ${GJ}`,
  ['pays.json', 'lignes.json'],
);
await save('ca-pays', countries);

// Chaque tronçon de frontière intérieure : quels pays de part et d'autre ?
const countryAt = (lng, lat) => countries.features.find((f) => booleanPointInPolygon(point([lng, lat]), f))?.properties.iso;
const borders = inner.features.map((f) => {
  const c = f.geometry.coordinates;
  const i = Math.max(1, Math.floor(c.length / 2));
  const [ax, ay] = c[i - 1];
  const [bx, by] = c[i];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const [nx, ny] = [(-(by - ay) / len) * 0.0005, ((bx - ax) / len) * 0.0005];
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
  const pair = [countryAt(mx + nx, my + ny), countryAt(mx - nx, my - ny)].filter(Boolean).sort().join('-');
  return { type: 'Feature', properties: { pair }, geometry: f.geometry };
});
const unknown = borders.filter((b) => !/^[A-Z]{2}-[A-Z]{2}$/.test(b.properties.pair)).length;
if (unknown) console.warn(`  ${unknown} tronçon(s) de frontière non attribué(s)`);
await save('ca-frontieres', fc(borders));

// Enclave de Vorukh : la partie du Tadjikistan qui contient le village.
const VORUKH = [70.58, 39.8511];
const tj = countries.features.find((f) => f.properties.iso === 'TJ');
const vorukhPart = tj.geometry.coordinates.find((poly) => booleanPointInPolygon(point(VORUKH), { type: 'Polygon', coordinates: poly }));
if (!vorukhPart) throw new Error('Enclave de Vorukh introuvable dans le Tadjikistan');
await save('vorukh', fc([{ type: 'Feature', properties: { name: 'Vorukh' }, geometry: { type: 'Polygon', coordinates: vorukhPart } }]));

// ── Régions ─────────────────────────────────────────────────────────────────────────────────────

// Province d'Och : la ville d'Och, administrativement à part, est enclavée dedans ; on les réunit.
const [och] = await shape(
  fc([...withProps(await osm('och-province'), { name: "Région d'Och" }), ...withProps(await osm('och-ville'), { name: "Région d'Och" })]),
  `-dissolve fields=name -simplify interval=150 keep-shapes -o out.json ${GJ}`,
);
await save('och', och);

const [sughd] = await shape(fc(withProps(await osm('sughd'), { name: 'Sughd' })), `-simplify interval=150 keep-shapes -o out.json ${GJ}`);
await save('sughd', sughd);

// ── Vallée de Ferghana ─────────────────────────────────────────────────────────────────────────

const [valley] = await shape(await read('data/sources/ferghana-valley.geojson'), `-simplify interval=600 -o out.json ${GJ}`);
await save('vallee-ferghana', valley);

// ── Cours d'eau d'Asie centrale ────────────────────────────────────────────────────────────────

const CA_WATER = [
  ['syr-daria', 'Syr-Daria', 'river'],
  ['naryn', 'Naryn', 'river'],
  ['kara-daria', 'Kara-Daria', 'river'],
  ['isfara', 'Isfara', 'river'],
  ['grand-canal-ferghana', 'Grand canal de Ferghana', 'canal'],
];
const caWaterRaw = fc((await Promise.all(CA_WATER.map(async ([key, name, kind]) => withProps(await osm(key), { name, kind })))).flat());
const [caWater] = await shape(caWaterRaw, `-clip bbox=66,38.5,77,43.5 -simplify interval=80 -o out.json ${GJ}`);
await save('ca-eau', caWater);

// ── Suisse, château d'eau ──────────────────────────────────────────────────────────────────────

const [suisse] = await shape(fc(withProps(await osm('suisse'), { name: 'Suisse' })), `-simplify interval=250 keep-shapes -o out.json ${GJ}`);
await save('suisse', suisse);

// Grands fleuves : Natural Earth 1:10m (tronçons de même nom regroupés, noms en français).
const RIVERS = {
  Rhin: ['Rhein', 'Rhine', 'Rhin', 'Waal'],
  Rhône: ['Rhône', 'Rhne'],
  Danube: ['Donau', 'Danube'],
  Pô: ['Po'],
  Inn: ['Inn'],
  Tessin: ['Ticino'],
};
const ne = await read('data/sources/ne_10m_rivers_lake_centerlines.geojson');
const nameOf = new Map(Object.entries(RIVERS).flatMap(([fr, names]) => names.map((n) => [n, fr])));
const riversRaw = fc(
  ne.features.filter((f) => f.geometry && nameOf.has(f.properties.name)).map((f) => ({ type: 'Feature', properties: { name: nameOf.get(f.properties.name) }, geometry: f.geometry })),
);
const [rivers] = await shape(riversRaw, `-clip bbox=-3,40,20,54 -dissolve fields=name -o out.json ${GJ}`);
await save('alpes-fleuves', rivers);

const LAKES = [
  ['leman', 'Léman'],
  ['constance', 'Lac de Constance'],
  ['majeur', 'Lac Majeur'],
];
const lakesRaw = fc((await Promise.all(LAKES.map(async ([key, name]) => withProps(await osm(key), { name })))).flat());
const [lakes] = await shape(lakesRaw, `-simplify interval=120 keep-shapes -o out.json ${GJ}`);
await save('alpes-lacs', lakes);
