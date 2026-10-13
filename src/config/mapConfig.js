// Configuration commune à toutes les cartes.
// Fond repris de bl-iframe-map-ski : MapLibre + OpenFreeMap (gratuit, sans clé ni quota) + relief AWS Terrarium.

const env = import.meta.env;

/** Fond de carte par thème (OpenFreeMap : Positron en clair, Dark en sombre). Remplaçables via .env. */
export const MAP_STYLES = {
  light: env.VITE_MAP_STYLE_LIGHT || 'https://tiles.openfreemap.org/styles/positron',
  dark: env.VITE_MAP_STYLE_DARK || 'https://tiles.openfreemap.org/styles/dark',
};

/** Relief ombré (AWS Terrarium, dataset public sans SLA), par thème. */
export const HILLSHADE = {
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 12,
  paint: {
    light: {
      'hillshade-shadow-color': '#6A6262',
      'hillshade-highlight-color': '#FFFFFF',
      'hillshade-accent-color': '#A5A1A1',
      'hillshade-exaggeration': 0.35,
      'hillshade-illumination-direction': 315,
    },
    dark: {
      'hillshade-shadow-color': '#000000',
      'hillshade-highlight-color': '#504949',
      'hillshade-accent-color': '#1E1A1A',
      'hillshade-exaggeration': 0.4,
      'hillshade-illumination-direction': 315,
    },
  },
};

/** Gestes coopératifs (Ctrl/⌘ + molette, deux doigts) : la carte ne capture pas le scroll de l'article. */
export const COOPERATIVE_GESTURES = true;

/** Marges autour de la zone mise en évidence (identiques sur les quatre côtés : elle reste centrée). */
export const FIT_PADDING = { mid: 28, mobile: 18 };

/** Animation d'entrée : vue large (même centre, `zoomOut` niveaux plus loin), pause, puis zoom sur la zone. */
export const INTRO = { zoomOut: 2.4, delay: 800, duration: 2800, curve: 1.3 };

/** Recul appliqué après le cadrage de la zone : elle reste lisible dans son contexte. */
export const FOCUS_ZOOM_OUT = 0.6;

/** URL publique des embeds (CMS). */
export const PUBLIC_URL = 'https://storytelling.blick.ch/fr/__is_embed_somewhere/bl-iframe-map-asie-solene/';
