import { addLakes, addOutline, addWaterLines } from '../map/layers';

/** 6. La Suisse, château d'eau : en amont du Rhin, du Rhône, du Pô et du Danube. */
export default {
  id: 'suisse',
  title: 'La Suisse, château d’eau de l’Europe',
  description: 'Rhône, Rhin, Pô, Danube: la Suisse se trouve en amont de plusieurs grands systèmes fluviaux européens.',
  // Centrée sur la Suisse (8,23° E, 46,8° N) ; recul réduit : les noms des fleuves restent dans le cadre.
  bounds: [[5.2, 45.0], [11.3, 48.6]],
  focusZoomOut: 0.4,
  zoomOut: 2,

  addLayers(map, ctx) {
    addOutline(map, ctx, 'suisse');
    addWaterLines(map, ctx, 'alpes-fleuves', { width: 1.6 });
    addLakes(map, ctx, 'alpes-lacs');
  },

  labels: [
    { kind: 'country', text: 'Suisse', within: 'suisse', lng: 7.6, lat: 46.95 },
    { kind: 'country', text: 'France', lng: 5.6, lat: 47.3, minor: true },
    { kind: 'country', text: 'Allemagne', lng: 9.0, lat: 48.25, minor: true },
    { kind: 'country', text: 'Italie', lng: 10.2, lat: 45.6, minor: true },
    { kind: 'country', text: 'Autriche', lng: 10.8, lat: 47.2, minor: true },
    { kind: 'water', text: 'Léman', lng: 6.5, lat: 46.25, minor: true },
    { kind: 'water', text: 'Lac de Constance', lng: 9.5, lat: 47.75, minor: true },
    { kind: 'water', text: 'Lac Majeur', lng: 9.15, lat: 45.95, minor: true },
    { kind: 'water', text: 'Rhin', lng: 7.6, lat: 47.9 },
    { kind: 'water', text: 'Rhône', lng: 5.5, lat: 45.9 },
    { kind: 'water', text: 'Pô', lng: 8.8, lat: 45.15 },
    { kind: 'water', text: 'Danube', lng: 9.6, lat: 48.2 },
  ],
};
