import { addBorders, addCountries, addOutline } from '../map/layers';

/** Cartes 2 et 3 : un village d'agriculteur kirghiz, dans la région d'Och (entourée). */
export function oshVillageMap({ id, name, description, lng, lat }) {
  return {
    id,
    title: `${name}, dans la région d’Och (Kirghizistan)`,
    description,
    bounds: [[71.5, 39.18], [74.91, 41.14]],

    addLayers(map, ctx) {
      addCountries(map);
      addBorders(map, ctx);
      addOutline(map, ctx, 'och');
    },

    labels: [
      { kind: 'pin', text: name, lng, lat },
      { kind: 'city', text: 'Och', lng: 72.8, lat: 40.53 },
      { kind: 'area', text: 'Région d’Och', within: 'och', lng: 73.0, lat: 40.0 },
      { kind: 'country', text: 'Kirghizistan', iso: 'KG', lng: 74.4, lat: 41.15 },
      { kind: 'country', text: 'Ouzbékistan', iso: 'UZ', lng: 71.6, lat: 40.75, minor: true },
      { kind: 'country', text: 'Tadjikistan', iso: 'TJ', lng: 72.6, lat: 38.95, minor: true },
    ],
  };
}
