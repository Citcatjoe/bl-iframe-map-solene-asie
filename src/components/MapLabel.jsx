// Libellés et points posés sur la carte (marqueurs HTML : polices Blick, couleurs base.css, thème automatique).
// Le marqueur est un point de taille nulle à la coordonnée ; le texte est placé autour selon `place`,
// calculé par src/map/placeLabels.js pour ne rien recouvrir. Ils ne captent pas la souris.
//
// Genres (`kind`) :
//   pin      lieu de l'article : point rouge Blick, liseré blanc 3 px, ombre portée, nom en gras
//   city     ville de repère : petit point, nom
//   country  pays ; `minor` : pays voisin, en retrait
//   area     zone entourée (vallée, région, enclave), en rouge Blick
//   water    fleuve, canal, lac (italique, couleur de l'eau ; posé le long du cours, voir placeLabels.js)

const HALO = '0 0 2px var(--color-fill-default), 0 0 4px var(--color-fill-default), 0 0 6px var(--color-fill-default)';
const GAP = 11; // px entre le point et son nom (placeLabels.js)

/** Position du texte d'un point selon le côté retenu. */
const SIDE = {
  right: (dy) => ({ left: GAP, top: dy, transform: 'translateY(-50%)' }),
  left: (dy) => ({ right: GAP, top: dy, transform: 'translateY(-50%)', textAlign: 'right' }),
  top: (dy) => ({ bottom: GAP - dy, left: 0, transform: 'translateX(-50%)', textAlign: 'center' }),
  bottom: (dy) => ({ top: GAP + dy, left: 0, transform: 'translateX(-50%)', textAlign: 'center' }),
};

const MOVE = 'left 250ms ease-out, right 250ms ease-out, top 250ms ease-out, bottom 250ms ease-out, transform 250ms ease-out';

export function MapLabel({ label, place, revealed, index }) {
  const { kind, text, rotate = 0, minor = false } = label;
  // Apparition après le zoom d'entrée, en cascade.
  const delay = revealed ? `${index * 60}ms` : '0ms';
  const appear = { opacity: revealed ? 1 : 0, transition: 'opacity 400ms ease-out', transitionDelay: delay };

  if (kind === 'pin' || kind === 'city') {
    const pin = kind === 'pin';
    const { side = label.side ?? 'right', dy = 0 } = place ?? {};
    return (
      <div className="pointer-events-none relative size-0 font-body" style={appear}>
        <span
          className={`absolute top-0 left-0 block rounded-full ${
            pin ? 'size-[18px] border-[3px] border-solid border-[#fff] bg-brand' : 'size-[9px] border-2 border-solid border-surface bg-inverse'
          }`}
          style={{
            boxShadow: pin ? '0 2px 6px rgba(18,16,16,.45)' : '0 1px 2px rgba(18,16,16,.3)',
            transform: `translate(-50%, -50%) scale(${revealed ? 1 : 0.2})`,
            transition: 'transform 450ms cubic-bezier(.3,1.6,.5,1)',
            transitionDelay: delay,
          }}
        />
        <span
          data-label-text
          className={`absolute leading-[1.15] whitespace-nowrap ${pin ? 'text-[14px] font-bold text-ink' : 'text-[12px] font-medium text-ink'}`}
          style={{ textShadow: HALO, transition: MOVE, ...SIDE[side](dy) }}
        >
          {text}
        </span>
      </div>
    );
  }

  const style = {
    country: `text-[12px] font-semibold uppercase tracking-[0.14em] ${minor ? 'text-ink-weak' : 'text-ink'}`,
    area: 'text-[13px] font-bold italic text-ink-brand',
    water: `italic font-medium text-water ${minor ? 'text-[11px]' : 'text-[12.5px]'}`,
  }[kind];
  const { dx = 0, dy = 0, rotate: angle = rotate } = place ?? {};

  return (
    <div className="pointer-events-none relative size-0 font-body" style={appear}>
      <span
        data-label-text
        className={`absolute top-0 left-0 text-center leading-[1.15] whitespace-nowrap ${style}`}
        style={{ textShadow: HALO, transition: MOVE, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${angle}deg)` }}
      >
        {text}
      </span>
    </div>
  );
}
