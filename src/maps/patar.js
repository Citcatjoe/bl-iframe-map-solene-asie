import { addBorders, addCountries, addOutline, addWaterLines } from '../map/layers';

/** 5. Patar, dans la région de Sughd : coopération autour de la mesure et du partage de l'eau. */
export default {
  id: 'patar',
  title: 'Patar, dans la région de Sughd (Tadjikistan)',
  description: 'A Patar, près de la frontière tadjiko-ouzbèke, un hydroposte permet de mieux mesurer et répartir l’eau.',
  bounds: [[67.33, 38.92], [70.99, 41.05]],

  addLayers(map, ctx) {
    addCountries(map);
    addWaterLines(map, ctx, 'ca-eau', { width: 2 });
    addBorders(map, ctx);
    addOutline(map, ctx, 'sughd');
  },

  labels: [
    { kind: 'pin', text: 'Patar', lng: 70.45, lat: 40.3333, side: 'top' },
    { kind: 'city', text: 'Isfara', lng: 70.6214, lat: 40.1214, side: 'bottom' },
    { kind: 'area', text: 'Région de Sughd', within: 'sughd', lng: 69.0, lat: 39.5 },
    { kind: 'country', text: 'Tadjikistan', iso: 'TJ', lng: 68.6, lat: 39.15 },
    { kind: 'country', text: 'Ouzbékistan', iso: 'UZ', lng: 67.7, lat: 40.3 },
    { kind: 'country', text: 'Kirghizistan', iso: 'KG', lng: 71.35, lat: 40.0, minor: true },
    { kind: 'water', text: 'Syr-Daria', lng: 69.15, lat: 40.45 },
    { kind: 'water', text: 'Grand canal de Ferghana', lng: 70.6, lat: 40.4, minor: true },
  ],
};
