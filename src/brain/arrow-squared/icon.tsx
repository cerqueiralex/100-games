/*
 * Arrow Squared's sticker — CONTENT art in the gameIcons.tsx formula (64×64
 * viewBox, thick warm ink outline, flat saturated fills, one soft
 * highlight), so its fixed palette deliberately ignores the theme, like the
 * game stickers. The story: the target strip's outer chevrons point right,
 * its decoy centre points left, and the yellow option's middle chevron
 * points right — the answer.
 */
const INK = '#312e28';
const BLUE = '#3d9bff';
const PAPER = '#f2e3c4';
const RED = '#ff5a4e';
const YELLOW = '#ffc933';
const WHITE = '#ffffff';

/** a chevron centred at (x, y), half-height h, pointing right (1) or left (0) */
const chev = (x: number, y: number, h: number, dir: 0 | 1) => {
  const w = h * 0.62 * (dir ? 1 : -1);
  return `M${x - w / 2} ${y - h}L${x + w / 2} ${y}L${x - w / 2} ${y + h}`;
};

export const arrowSquaredIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="7" width="54" height="50" rx="12" fill={BLUE} stroke={INK} strokeWidth="3" />
    <rect x="10" y="11" width="20" height="3.6" rx="1.8" fill={WHITE} opacity="0.4" />
    <rect x="10" y="18" width="44" height="17" rx="5" fill={PAPER} stroke={INK} strokeWidth="2.6" />
    {[17, 24.5, 32, 39.5, 47].map((x, i) => (
      <path key={x} d={chev(x, 26.5, 4.6, i === 2 ? 0 : 1)} stroke={i === 2 ? RED : INK} strokeWidth="2.8" />
    ))}
    <rect x="10" y="39" width="20" height="13" rx="4.5" fill={YELLOW} stroke={INK} strokeWidth="2.6" />
    <path d={chev(20, 45.5, 3.4, 1)} stroke={INK} strokeWidth="2.6" />
    <rect x="34" y="39" width="20" height="13" rx="4.5" fill={WHITE} stroke={INK} strokeWidth="2.6" />
    <path d={chev(44, 45.5, 3.4, 0)} stroke={INK} strokeWidth="2.6" />
  </svg>
);
