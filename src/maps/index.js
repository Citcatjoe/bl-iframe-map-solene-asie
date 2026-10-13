import ferghana from './ferghana';
import patar from './patar';
import suisse from './suisse';
import { oshVillageMap } from './village';
import vorukh from './vorukh';

/**
 * Cartes disponibles, dans l'ordre de l'article ; `?map=<id>` n'affiche que celle-ci (embed).
 * Chaque définition :
 *  id, title                      title : liste des URL (sur la carte, un numéro le remplace)
 *  description                    légende sous la carte
 *  bounds                         zone mise en évidence : cadrée, centrée, puis léger recul (FOCUS_ZOOM_OUT)
 *  focusZoomOut?                  recul après cadrage (défaut : FOCUS_ZOOM_OUT)
 *  start? | zoomOut?              vue de départ : emprise, ou même centre `zoomOut` niveaux plus loin
 *  delay?, duration?              pause avant le vol d'entrée, durée du vol (ms)
 *  contextLabels?                 noms de pays du fond en repère pendant le vol d'entrée
 *  addLayers(map, { color, theme })  couches (src/map/layers.js), rappelé à chaque changement de thème
 *  labels[{ kind, text, lng, lat, side?, minor?, iso?, within? }]  libellés HTML (MapLabel), placés par placeLabels :
 *                                 iso : reste dans la trame de ce pays ; within : reste dans le contour de cette zone
 */
export const MAPS = [
  ferghana,
  oshVillageMap({
    id: 'ak-bulak',
    name: 'Ak-Bulak',
    description: 'Dans le village d’Ak-Bulak, dans la région d’Och, Abdimital Karimov teste une irrigation plus économe en eau.',
    lng: 72.7,
    lat: 40.2083,
  }),
  oshVillageMap({
    id: 'myrza-aryk',
    name: 'Myrza-Aryk',
    description: 'A Myrza-Aryk, Jumabai Omorbekov a équipé son exploitation d’un système de goutte-à-goutte.',
    lng: 73.2219,
    lat: 40.7244,
  }),
  vorukh,
  patar,
  suisse,
];

export const getMap = (id) => MAPS.find((m) => m.id === id) ?? null;
