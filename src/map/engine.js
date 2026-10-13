// maplibre-gl (≈ 1 Mo) n'est téléchargé qu'à l'approche de la carte (import dynamique).

let enginePromise = null;

export function loadMapEngine() {
  enginePromise ??= Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(
    ([mod]) => mod.default ?? mod,
  );
  return enginePromise;
}

/** Textes de l'interface de la carte, en français. */
export const MAP_LOCALE = {
  'CooperativeGesturesHandler.WindowsHelpText': 'Utilise Ctrl + molette pour zoomer',
  'CooperativeGesturesHandler.MacHelpText': 'Utilise ⌘ + molette pour zoomer',
  'CooperativeGesturesHandler.MobileHelpText': 'Utilise deux doigts pour déplacer la carte',
};
