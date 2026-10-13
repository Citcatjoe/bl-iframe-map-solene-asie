// Télécharge depuis OpenStreetMap (via Nominatim) les géométries utilisées par les cartes.
// Sorties brutes, versionnées : data/sources/osm/<clé>.geojson (données © OpenStreetMap, ODbL).
// À relancer seulement pour rafraîchir les tracés ; `npm run data` reconstruit ensuite les fichiers servis.
//
// Usage : npm run osm
// Respecte la politique d'usage de Nominatim : une requête par seconde, User-Agent explicite.

import { mkdir, writeFile } from 'node:fs/promises';

const OUT = 'data/sources/osm';
const UA = 'bl-iframe-map-asie-solene/0.1 (Blick storytelling)';

/** Clé de fichier → relation OSM. */
const RELATIONS = {
  // Pays
  kirghizistan: 178009,
  tadjikistan: 214626,
  ouzbekistan: 196240,
  suisse: 51701,
  // Régions
  'och-province': 178020,
  'och-ville': 19059632,
  sughd: 3279374,
  // Cours d'eau et canaux (Asie centrale)
  'syr-daria': 1206456,
  naryn: 1162834,
  'kara-daria': 2822801,
  isfara: 17348465,
  'grand-canal-ferghana': 1163139,
  // Lacs (Suisse)
  leman: 332617,
  constance: 1156846,
  majeur: 11758,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
for (const [key, id] of Object.entries(RELATIONS)) {
  const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=R${id}&format=geojson&polygon_geojson=1&accept-language=fr`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${key} (R${id}) : HTTP ${res.status}`);
  const fc = await res.json();
  if (!fc.features?.length) throw new Error(`${key} (R${id}) : aucune géométrie`);
  const f = fc.features[0];
  f.properties = { key, osm_id: id, name: f.properties.name ?? f.properties.display_name };
  await writeFile(`${OUT}/${key}.geojson`, `${JSON.stringify(fc)}\n`);
  console.log(`→ ${key} R${id} ${f.geometry.type}`);
  await sleep(1100);
}
