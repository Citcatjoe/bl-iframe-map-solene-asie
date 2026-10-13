# bl-iframe-map-asie-solene

Cartes en iframe pour l'article de Solène (Asie centrale, eau et agriculture, avec Helvetas ; lien avec la Suisse).
React 19 + Vite 8 + Tailwind CSS 4 + MapLibre GL 5, fond OpenFreeMap (comme bl-iframe-map-ski).

## Démarrer

```sh
npm install
npm run dev            # http://localhost:5173/
npm run build          # dist/ — chemins relatifs, publiable dans n'importe quel dossier
```

## Pages

- **Sans paramètre** : les URL d'embed en tête, puis toutes les cartes empilées (632 px max).
- **`?map=<id>`** : une seule carte. Ce sont ces URL qui vont dans l'article.

Chaque carte : la carte, puis une légende courte (style des figures Blick, comme bl-tool-timeline-r : text-xs).
Rien au-dessus de la carte ni au-dessous de la légende ; pleine largeur, 632 px au plus.

Publication : `https://storytelling.blick.ch/fr/__is_embed_somewhere/bl-iframe-map-asie-solene/`

| N° | Carte | `?map=` |
| --- | --- | --- |
| 1 | La vallée de Ferghana, partagée entre trois pays | `ferghana` |
| 2 | Ak-Bulak, dans la région d'Och | `ak-bulak` |
| 3 | Myrza-Aryk, dans la région d'Och | `myrza-aryk` |
| 4 | Vorukh, une enclave tadjike au Kirghizistan | `vorukh` |
| 5 | Patar, dans la région de Sughd | `patar` |
| 6 | La Suisse, château d'eau de l'Europe | `suisse` |

Entrée animée (quand la carte entre dans l'écran, dès que ses couches sont affichées) : pause, vue large centrée sur
la zone, puis vol vers elle ; la carte 1 part de l'Europe (pause plus longue, vol de 4,2 s), avec les noms de pays du
fond en repère pendant le vol. Vue finale : la zone cadrée et centrée, avec un léger recul (`FOCUS_ZOOM_OUT`, réduit
sur la carte 6). Sans animation si le lecteur a demandé à réduire les mouvements.

Les libellés sont placés automatiquement (`src/map/placeLabels.js`), recalculés après chaque mouvement : au plus près
de leur position, dans le cadre et hors des boutons, sans recouvrir fleuve, frontière, contour, rive de lac, autre
libellé ni point. Les noms de cours d'eau longent leur tracé ; les noms de pays (`iso`) restent dans leur trame,
ceux des zones (`within`) dans leur contour. Les positions données dans `src/maps/*` sont les points de départ.

## Thème et hauteur : iframeHeightAdjustment.js

Le CMS gère l'URL de l'iframe ; `iframeHeightAdjustment.js` (CDN Blick, copie de secours dans `public/js/`) fait le reste :
hauteur envoyée au parent, thème lu dans `#theme=dark|light` et suivi en direct (`CHANGE_THEME`), via les variables
`--is-light-theme` / `--is-dark-theme` dont `base.css` dérive chaque couleur. L'app suit ce thème (`src/lib/theme.js`)
pour le fond de carte et les couleurs des couches.

## Représentation

| Élément | Rendu |
| --- | --- |
| Lieu de l'article (village) | point rouge Blick (`--color-fill-brand`), liseré blanc 3 px, ombre portée, nom en gras |
| Ville de repère (Och, Isfara) | petit point, nom |
| Zone « entourée » (vallée, région, enclave, Suisse) | contour seul : liseré rouge Blick 1,6 px sur halo, rien à l'intérieur (relief et trame des pays visibles) |
| Frontière (entre KG, TJ, UZ) | trait gris fin, identique sur toutes les cartes (le contour rouge passe par-dessus) |
| Pays (KG, TJ, UZ) | trame pâle, même teinte et même intensité partout (`COUNTRY_COLORS`, `COUNTRY_OPACITY`) |
| Fleuve / canal | ligne bleue / tirets bleus |
| Lac | aplat bleu |

Libellés et légendes en Inter Variable. Libellés du fond masqués :
chaque carte pose les siens (`labels` dans `src/maps/*`). Couleurs hors design system (pays, eau) : `src/map/layers.js`
et `--map-water` dans `src/index.css`.

## Données

```sh
npm run osm      # OpenStreetMap via Nominatim → data/sources/osm/ (pays, régions, cours d'eau, lacs)
npm run valley   # contour de la vallée de Ferghana calculé sur le relief → data/sources/
npm run data     # → public/data/*.geojson (simplifiés, chargés par chaque carte)
```

- **Frontières, régions, cours d'eau d'Asie centrale, lacs, Suisse** : OpenStreetMap (ODbL), relations listées dans
  `scripts/fetch-osm.mjs`. La région d'Och réunit la province et la ville d'Och (administrativement à part, enclavée).
- **Frontières entre pays** : tronçons communs extraits des contours, classés par paire (KG–TJ, KG–UZ, TJ–UZ).
- **Enclave de Vorukh** : la partie du Tadjikistan qui contient le village.
- **Vallée de Ferghana** : pas de contour officiel. Terres sous 1100 m reliées à Ferghana, fermées au défilé de Khodjent
  (69,6° E), gorges étroites coupées (relief SRTM via AWS Terrarium). Réglages en tête de `scripts/build-valley.mjs`.
- **Grands fleuves (carte Suisse)** : Natural Earth 1:10m. Inn et Tessin ajoutés : ils relient la Suisse au Danube et au Pô.
- **Canal près de Patar** : le Grand canal de Ferghana, qui passe à Patar d'après OpenStreetMap.

### Crédits à reprendre dans le CMS

Retirés des cartes à la demande de la rédaction ; ils doivent figurer dans l'article (licences ODbL et OpenFreeMap) :

> Cartes : fond © OpenFreeMap, © OpenMapTiles, données © contributeurs OpenStreetMap ; relief Mapzen (SRTM) ;
> fleuves (carte Suisse) Natural Earth.

## Structure

```
src/maps/          une définition par carte (zone, couches, libellés, légende) + registre index.js
src/map/           moteur, retouches du fond, briques de couches, placement des libellés
src/components/    MapCard (carte, légende), MapView (MapLibre, animation), MapLabel, IconButton
scripts/           fetch-osm, build-valley, build-data
public/data/       GeoJSON servis
```
