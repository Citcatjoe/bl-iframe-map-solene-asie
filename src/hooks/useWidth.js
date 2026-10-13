import { useLayoutEffect, useState } from 'react';

/** Largeur maximale d'une carte (colonne d'article). */
export const MAX_WIDTH = 632;

/** Largeur → mode : `mid` (colonne de 632 px) dès 520 px, sinon `mobile`. */
export const modeFor = (w) => (w >= 520 ? 'mid' : 'mobile');

/** Hauteur de la zone carte par mode. */
export const MAP_HEIGHT = { mid: 480, mobile: 420 };

/** Largeur observée d'un élément (celle de l'iframe, plafonnée à MAX_WIDTH). */
export function useWidth(ref) {
  const [width, setWidth] = useState(() => Math.min(window.innerWidth, MAX_WIDTH));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
