import { addBorders, addCountries, addOutline, addWaterLines } from '../map/layers';

/** 4. L'enclave tadjike de Vorukh, au Kirghizistan : des frontières très imbriquées. */
export default {
  id: 'vorukh',
  title: 'Vorukh, une enclave tadjike au Kirghizistan',
  description: 'Vorukh, enclave tadjike au Kirghizistan, se trouve au cœur d’une zone frontalière longtemps marquée par les tensions.',
  bounds: [[70.45, 39.75], [70.8, 40.15]],
  zoomOut: 3,

  addLayers(map, ctx) {
    addCountries(map);
    addWaterLines(map, ctx, 'ca-eau', { width: 1.6 });
    addBorders(map, ctx);
    addOutline(map, ctx, 'vorukh');
  },

  labels: [
    { kind: 'pin', text: 'Vorukh', lng: 70.58, lat: 39.8511 },
    { kind: 'city', text: 'Isfara', lng: 70.6214, lat: 40.1214 },
    { kind: 'area', text: 'Enclave tadjike', lng: 70.62, lat: 39.79 },
    { kind: 'country', text: 'Tadjikistan', iso: 'TJ', lng: 70.48, lat: 40.17 },
    { kind: 'country', text: 'Kirghizistan', iso: 'KG', lng: 70.74, lat: 39.98 },
    { kind: 'water', text: 'Isfara', lng: 70.56, lat: 39.96, minor: true },
  ],
};
