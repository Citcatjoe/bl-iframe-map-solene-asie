import { HILLSHADE } from '../config/mapConfig';

// Retouches du fond OpenFreeMap, appliquées à chaque style chargé (clair ou sombre).
// Tolérant : une couche absente du style est ignorée.

const LABEL_FR = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name']];
const CONTEXT_TONE = {
  light: { color: '#837C7C', halo: 'rgba(255,255,255,0.9)' },
  dark: { color: '#A5A1A1', halo: 'rgba(18,16,16,0.9)' },
};

const isContextLayer = (l) => l.type === 'symbol' && /country/.test(l.id);

/**
 * Libellés du fond masqués : chaque carte pose les siens (Inter, en français).
 * `contextLabels` : noms de pays du fond gardés en repère pendant le vol d'entrée (voir hideContextLabels).
 */
export function customizeBasemap(map, theme, { contextLabels = false } = {}) {
  for (const l of map.getStyle().layers) {
    if (l.type !== 'symbol') continue;
    if (contextLabels && isContextLayer(l)) {
      map.setLayoutProperty(l.id, 'text-field', LABEL_FR);
      map.setPaintProperty(l.id, 'text-color', CONTEXT_TONE[theme].color);
      map.setPaintProperty(l.id, 'text-halo-color', CONTEXT_TONE[theme].halo);
    } else {
      map.setLayoutProperty(l.id, 'visibility', 'none');
    }
  }

  // Relief ombré sous l'eau : la mer et les lacs restent nets, seules les terres sont ombrées.
  const before = map.getLayer('water') ? 'water' : undefined;
  map.addSource('bl-dem', {
    type: 'raster-dem',
    tiles: HILLSHADE.tiles,
    encoding: HILLSHADE.encoding,
    tileSize: HILLSHADE.tileSize,
    maxzoom: HILLSHADE.maxzoom,
  });
  map.addLayer({ id: 'bl-hill', type: 'hillshade', source: 'bl-dem', paint: HILLSHADE.paint[theme] }, before);
}

/** Fin du vol d'entrée : les noms de pays du fond s'effacent, ceux de la carte prennent le relais. */
export function hideContextLabels(map) {
  for (const l of map.getStyle().layers) {
    if (isContextLayer(l) && map.getLayoutProperty(l.id, 'visibility') !== 'none') map.setPaintProperty(l.id, 'text-opacity', 0);
  }
}
