const PATHS = {
  plus: 'M8 3v10M3 8h10',
  minus: 'M3 8h10',
  expand: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
  close: 'M4 4l8 8M12 4l-8 8',
};

/** Bouton rond à icône (contrôles de carte, fermeture de fiche). */
export function IconButton({ icon, label, onClick, size = 32 }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid cursor-pointer place-items-center rounded-pill border border-solid border-line bg-surface text-glyph shadow-control transition-colors hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
      style={{ width: size, height: size }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={PATHS[icon]} />
      </svg>
    </button>
  );
}
