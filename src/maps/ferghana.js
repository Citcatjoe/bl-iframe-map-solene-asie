import { addBorders, addCountries, addOutline, addWaterLines } from '../map/layers';

/** 1. La vallée de Ferghana, partagée entre le Kirghizistan, le Tadjikistan et l'Ouzbékistan. */
export default {
  id: 'ferghana',
  title: 'La vallée de Ferghana, partagée entre trois pays',
  description:
    'Au cœur de l’Asie centrale, la fertile vallée de Ferghana s’étend sur l’est de l’Ouzbékistan, le sud du Kirghizistan et le nord du Tadjikistan.',
  bounds: [[69.55, 39.95], [73.45, 41.5]],
  // Départ sur l'Europe, pour situer la région ; noms de pays du fond en repère pendant le vol.
  start: [[-10, 35], [45, 62]],
  delay: 1400,
  duration: 4200,
  contextLabels: true,

  addLayers(map, ctx) {
    addCountries(map);
    addWaterLines(map, ctx, 'ca-eau', { width: 2.2, canals: false });
    addBorders(map, ctx);
    addOutline(map, ctx, 'vallee-ferghana');
  },

  labels: [
    { kind: 'country', text: 'Kirghizistan', iso: 'KG', lng: 73.1, lat: 41.95 },
    { kind: 'country', text: 'Ouzbékistan', iso: 'UZ', lng: 69.95, lat: 41.15 },
    { kind: 'country', text: 'Tadjikistan', iso: 'TJ', lng: 69.95, lat: 39.45 },
    { kind: 'area', text: 'Vallée de Ferghana', within: 'vallee-ferghana', lng: 71.5, lat: 40.6 },
    { kind: 'water', text: 'Syr-Daria', lng: 70.6, lat: 40.55 },
    { kind: 'water', text: 'Naryn', lng: 71.9, lat: 41.15 },
    { kind: 'water', text: 'Kara-Daria', lng: 72.6, lat: 40.82 },
  ],
};
