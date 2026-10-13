import { useEffect, useState } from 'react';

// Thème clair / sombre Blick : entièrement géré par iframeHeightAdjustment.js.
// Le script lit #theme=dark|light dans l'URL posée par le CMS, pose la paire
// --is-light-theme / --is-dark-theme dont base.css dérive chaque couleur, et suit
// les changements de thème de la page parente (CHANGE_THEME).
// L'app ne fait que suivre ce thème pour choisir le fond de carte.

const hashTheme = () => (new URLSearchParams(window.location.hash.slice(1)).get('theme') === 'dark' ? 'dark' : 'light');

const currentTheme = () => (window.blickIframeUtils?.currentTheme === 'dark' ? 'dark' : window.blickIframeUtils ? 'light' : hashTheme());

const CALLBACK_ID = 'bl-iframe-map';

/** Thème courant, tenu à jour par iframeHeightAdjustment.js. */
export function useTheme() {
  const [theme, setTheme] = useState(currentTheme);

  useEffect(() => {
    let utils = null;
    const register = () => {
      utils = window.blickIframeUtils;
      if (!utils?.registerThemeChangeCallback) return false;
      utils.registerThemeChangeCallback(CALLBACK_ID, (t) => setTheme(t === 'dark' ? 'dark' : 'light'));
      setTheme(currentTheme());
      return true;
    };
    // Repli local (CDN indisponible) : le script s'exécute après le bundle, on attend `load`.
    const onLoad = () => register();
    if (!register()) window.addEventListener('load', onLoad, { once: true });
    return () => {
      window.removeEventListener('load', onLoad);
      utils?.deregisterThemeChangeCallback?.(CALLBACK_ID);
    };
  }, []);

  return theme;
}

/** Valeur résolue d'une variable CSS de base.css (le moteur de carte ne lit pas var()). */
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
