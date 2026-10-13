// Briques de couches partagées par les cartes (src/maps/*). Toutes les sources et couches sont
// préfixées `bl-` ; elles sont rajoutées à chaque chargement de style (bascule clair / sombre).
// Les couleurs « Blick » viennent de base.css (lues au moment de l'ajout) ; celles propres à la
// cartographie (pays, eau), absentes du design system, sont ici, par thème.

/** Teintes des trois pays de la vallée de Ferghana : mêmes teinte et intensité sur toutes les cartes. */
export const COUNTRY_COLORS = { KG: '#D9A82B', TJ: '#6F9A3A', UZ: '#8E5A8A' };
export const COUNTRY_OPACITY = 0.2;

/** Eau : fleuves, canaux, lacs. */
export const WATER = { light: '#2B7BB9', dark: '#5FAAE3' };

/** Trait rouge des zones entourées (px). */
const OUTLINE_WIDTH = 1.6;

/** URL absolue d'un fichier de public/data (le moteur charge les GeoJSON depuis un worker). */
const dataUrl = (name) => new URL(`data/${name}.geojson`, document.baseURI).href;

function addSource(map, name) {
  const id = `bl-src-${name}`;
  if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: dataUrl(name) });
  return id;
}

/** Pays d'Asie centrale en trame légère (KG, TJ, UZ) : le relief transparaît, y compris dans les zones entourées. */
export function addCountries(map) {
  const source = addSource(map, 'ca-pays');
  map.addLayer({
    id: 'bl-pays',
    type: 'fill',
    source,
    paint: {
      'fill-color': ['match', ['get', 'iso'], ...Object.entries(COUNTRY_COLORS).flat(), '#A5A1A1'],
      'fill-opacity': COUNTRY_OPACITY,
    },
  });
}

/** Frontières entre KG, TJ et UZ : même trait fin sur toutes les cartes. */
export function addBorders(map, { color }) {
  map.addLayer({
    id: 'bl-frontieres',
    type: 'line',
    source: addSource(map, 'ca-frontieres'),
    layout: { 'line-join': 'round' },
    paint: { 'line-color': color('--color-stroke-default'), 'line-width': 1, 'line-opacity': 0.7 },
  });
}

/**
 * Zone mise en évidence (vallée, région, enclave, pays) : contour seul, liseré rouge Blick sur halo, rien à l'intérieur.
 * Même épaisseur partout ; à poser après les frontières, qu'il recouvre là où elles se confondent.
 */
export function addOutline(map, { color }, name) {
  const width = OUTLINE_WIDTH;
  const source = addSource(map, name);
  map.addLayer({
    id: `bl-${name}-halo`,
    type: 'line',
    source,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': color('--color-fill-default'), 'line-width': width + 3.4, 'line-opacity': 0.8 },
  });
  map.addLayer({
    id: `bl-${name}-trait`,
    type: 'line',
    source,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': color('--color-stroke-brand'), 'line-width': width },
  });
}

/** Fleuves et canaux (propriété `kind` : river | canal ; canal en tirets, `canals: false` pour l'omettre). */
export function addWaterLines(map, { theme }, name, { width = 2, canals = true } = {}) {
  const source = addSource(map, name);
  const w = ['interpolate', ['linear'], ['zoom'], 4, width * 0.6, 8, width, 11, width * 1.6];
  const paint = { 'line-color': WATER[theme], 'line-width': w };
  const layout = { 'line-join': 'round', 'line-cap': 'round' };
  map.addLayer({ id: `bl-${name}`, type: 'line', source, filter: ['!=', ['get', 'kind'], 'canal'], layout, paint });
  if (!canals) return;
  map.addLayer({
    id: `bl-${name}-canal`,
    type: 'line',
    source,
    filter: ['==', ['get', 'kind'], 'canal'],
    layout: { 'line-join': 'round' },
    paint: { ...paint, 'line-dasharray': [2.5, 1.5] },
  });
}

/** Lacs en aplat. */
export function addLakes(map, { theme }, name) {
  const source = addSource(map, name);
  map.addLayer({ id: `bl-${name}`, type: 'fill', source, paint: { 'fill-color': WATER[theme], 'fill-opacity': 0.9 } });
}
