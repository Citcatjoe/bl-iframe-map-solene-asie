import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COOPERATIVE_GESTURES, FIT_PADDING, FOCUS_ZOOM_OUT, INTRO, MAP_STYLES } from '../config/mapConfig';
import { cssVar } from '../lib/theme';
import { customizeBasemap, hideContextLabels } from '../map/basemap';
import { loadMapEngine, MAP_LOCALE } from '../map/engine';
import { placeLabels } from '../map/placeLabels';
import { IconButton } from './IconButton';
import { MapLabel } from './MapLabel';

/** Attente de nos couches (le placement et l'entrée en dépendent) : toutes les 50 ms, 10 s au plus. */
const POLL_MS = 50;
const POLL_TRIES = 200;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Vue finale : la zone cadrée avec des marges égales (donc centrée), puis un léger recul. */
function focusCamera(map, def, mode) {
  const cam = map.cameraForBounds(def.bounds, { padding: FIT_PADDING[mode] });
  return { center: cam.center, zoom: cam.zoom - (def.focusZoomOut ?? FOCUS_ZOOM_OUT) };
}

/** Zones où aucun libellé ne doit aller : la colonne de boutons, en haut à droite. */
const reservedZones = (map, mode) => {
  const w = map.getCanvas().clientWidth;
  return [[w - 46, 0, w, mode === 'mobile' ? 48 : 128]];
};

/**
 * Carte MapLibre pilotée par une définition (src/maps/*).
 * - créée quand elle entre dans l'écran ; entrée animée : vue large (ou `def.start`), puis vol vers la zone ;
 * - la zone (`def.bounds`) est cadrée avec des marges égales : toujours centrée, quelle que soit la largeur ;
 * - fond clair / sombre selon `theme` : les couches de la définition sont rajoutées à chaque style ;
 * - libellés en marqueurs HTML (portails React), placés sans chevauchement, révélés à la fin du vol.
 */
export function MapView({ def, theme, mode, width, height }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [labelEls, setLabelEls] = useState(null); // HTMLElement[] (un par libellé)
  const [places, setPlaces] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const live = useRef(null);
  useLayoutEffect(() => {
    live.current = { def, theme, mode };
  });

  // Création / destruction
  useEffect(() => {
    const el = containerRef.current;
    let cancelled = false;
    let started = false;
    let map = null;
    let markers = [];
    let nodes = [];
    let introTimer = null;
    let revealAfterPlacement = false;
    let introDone = false;
    let placementRun = 0;
    const dataCache = new Map(); // sourceId → Promise<GeoJSON> (traits pour le placement des libellés)

    /** Nos sources (`bl-src-*`) rendues pour la vue courante : inutile d'attendre relief et fond. */
    const ownSourcesReady = () => {
      const ids = Object.keys(map.getStyle()?.sources ?? {}).filter((id) => id.startsWith('bl-src-'));
      return ids.length > 0 && ids.every((id) => map.isSourceLoaded(id));
    };

    // Placement des libellés après chaque mouvement, une fois nos sources chargées (traits et zones lus
    // dans leurs données) ; les placements dépassés sont abandonnés.
    const requestPlacement = () => {
      const run = ++placementRun;
      const attempt = async (tries) => {
        if (cancelled || run !== placementRun || !map) return;
        if (!introDone && !revealAfterPlacement) return; // libellés encore masqués : rien à placer
        if (!ownSourcesReady()) {
          if (tries > 0) setTimeout(() => attempt(tries - 1), POLL_MS);
          return;
        }
        const result = await placeLabels(map, live.current.def.labels, nodes, reservedZones(map, live.current.mode), dataCache);
        if (cancelled || run !== placementRun) return;
        setPlaces(result);
        if (revealAfterPlacement) {
          revealAfterPlacement = false;
          introDone = true;
          hideContextLabels(map);
          setRevealed(true);
        }
      };
      setTimeout(() => attempt(POLL_TRIES), 0);
    };

    const create = async () => {
      const gl = await loadMapEngine();
      if (cancelled) return;
      const { def: d, theme: t, mode: m } = live.current;
      const reduced = prefersReducedMotion();
      map = new gl.Map({
        container: el,
        style: MAP_STYLES[t],
        bounds: d.bounds,
        fitBoundsOptions: { padding: FIT_PADDING[m] },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
        cooperativeGestures: COOPERATIVE_GESTURES,
        locale: MAP_LOCALE,
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      // Vue de départ : `def.start` (emprise) ou même centre, plus large.
      const focus = focusCamera(map, d, m);
      if (reduced) map.jumpTo(focus);
      else if (d.start) map.jumpTo(map.cameraForBounds(d.start, { padding: FIT_PADDING[m] }));
      else map.jumpTo({ center: focus.center, zoom: focus.zoom - (d.zoomOut ?? INTRO.zoomOut) });

      // À chaque style chargé (création, puis bascule clair / sombre) : fond retouché + couches de la carte.
      map.on('style.load', () => {
        const { def: dd, theme: tt } = live.current;
        try {
          customizeBasemap(map, tt, { contextLabels: dd.contextLabels && !introDone });
        } catch (err) {
          console.warn('Fond de carte : ajustements partiels', err);
        }
        dd.addLayers(map, { color: cssVar, theme: tt });
        requestPlacement();
      });

      map.on('moveend', requestPlacement);

      // Entrée : dès que nos couches sont affichées (sans attendre toutes les tuiles du fond et du relief),
      // une pause, puis le vol vers la zone.
      const startIntro = (tries) => {
        if (cancelled) return;
        if (!ownSourcesReady() && tries > 0) {
          setTimeout(() => startIntro(tries - 1), POLL_MS);
          return;
        }
        if (reduced) {
          revealAfterPlacement = true;
          requestPlacement();
          return;
        }
        introTimer = setTimeout(() => {
          map.once('moveend', () => {
            revealAfterPlacement = true;
          });
          map.flyTo({ ...focus, duration: d.duration ?? INTRO.duration, curve: INTRO.curve, essential: true });
        }, d.delay ?? INTRO.delay);
      };
      map.once('style.load', () => startIntro(POLL_TRIES));

      nodes = (d.labels ?? []).map((label) => {
        const node = document.createElement('div');
        markers.push(new gl.Marker({ element: node, anchor: 'center' }).setLngLat([label.lng, label.lat]).addTo(map));
        return node;
      });
      setLabelEls(nodes);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (started || !entry.isIntersecting || !el.clientWidth || !el.clientHeight) return;
        started = true;
        io.disconnect();
        create();
      },
      // L'animation d'entrée doit se voir : on attend que la carte soit bien dans l'écran.
      { threshold: 0.35 },
    );
    io.observe(el);

    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
      requestPlacement();
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      clearTimeout(introTimer);
      io.disconnect();
      ro.disconnect();
      markers.forEach((mk) => mk.remove());
      mapRef.current = null;
      try {
        map?.remove();
      } catch {
        // contexte WebGL déjà perdu
      }
    };
  }, []);

  // Bascule clair / sombre : nouveau fond, les couches sont rajoutées sur `style.load`.
  const lastTheme = useRef(theme);
  useEffect(() => {
    if (lastTheme.current === theme) return;
    lastTheme.current = theme;
    mapRef.current?.setStyle(MAP_STYLES[theme], { diff: false });
  }, [theme]);

  // Changement de largeur : la zone est recadrée (et reste centrée).
  const lastWidth = useRef(width);
  useEffect(() => {
    if (lastWidth.current === width) return;
    lastWidth.current = width;
    const map = mapRef.current;
    if (!map) return;
    requestAnimationFrame(() => {
      map.resize();
      map.jumpTo(focusCamera(map, def, mode));
    });
  }, [width, mode, def]);

  const zoom = (fn) => mapRef.current?.[fn]();
  const reset = () => {
    const map = mapRef.current;
    if (map) map.easeTo({ ...focusCamera(map, def, mode), duration: 800 });
  };

  return (
    <div className="relative min-w-0" style={{ height }}>
      {/* Taille explicite : la CSS de MapLibre force `position: relative` sur le conteneur. */}
      <div ref={containerRef} className="size-full bg-surface-weak" />
      <div className="absolute top-2.5 right-2.5 z-[2] flex flex-col gap-1.5">
        {mode !== 'mobile' && (
          <>
            <IconButton icon="plus" label="Zoom avant" onClick={() => zoom('zoomIn')} />
            <IconButton icon="minus" label="Zoom arrière" onClick={() => zoom('zoomOut')} />
          </>
        )}
        <IconButton icon="expand" label="Recentrer la carte" onClick={reset} />
      </div>
      {labelEls &&
        def.labels.map((label, i) =>
          createPortal(<MapLabel label={label} place={places[i]} revealed={revealed} index={i} />, labelEls[i], `${def.id}-${i}`),
        )}
    </div>
  );
}
