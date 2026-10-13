import { useRef } from 'react';
import { MAP_HEIGHT, MAX_WIDTH, modeFor, useWidth } from '../hooks/useWidth';
import { MapView } from './MapView';

/**
 * Une carte : la carte, puis sa légende (style des figures Blick, bl-tool-timeline-r : text-xs).
 * Rien au-dessus ni au-dessous : pleine largeur, 632 px au plus.
 * Sa hauteur est remontée au CMS par iframeHeightAdjustment.js.
 */
export function MapCard({ def, theme }) {
  const rootRef = useRef(null);
  const width = useWidth(rootRef);
  const mode = modeFor(width);

  return (
    <figure ref={rootRef} className="m-0 mx-auto flex w-full flex-col bg-surface font-body text-ink" style={{ maxWidth: MAX_WIDTH }}>
      <MapView def={def} theme={theme} mode={mode} width={width} height={MAP_HEIGHT[mode]} />
      <figcaption className="pt-2 text-xs">
        <span className="block text-ink">{def.description}</span>
      </figcaption>
    </figure>
  );
}
