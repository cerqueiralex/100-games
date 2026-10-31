/*
 * Alertness Check sticker — CONTENT art in the gameIcons.tsx formula (64×64
 * viewBox, warm ink outline, flat saturated fills, one soft highlight), so it
 * deliberately uses its own fixed palette and looks the same on every theme:
 * a miniature of the test itself — the dark panel, the red box with its
 * yellow millisecond counter, and the tap zone below.
 */

const INK = '#312e28';
const RED = '#ff5a4e';
const YELLOW = '#ffc933';
const BLUE = '#3d9bff';
const SCREEN = '#2b2832';
const GLASS = '#17151c';
const PAPER = '#ffffff';

export const alertnessCheckIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="5" width="50" height="36" rx="9" fill={SCREEN} stroke={INK} strokeWidth="3" />
    <path d="M14 11.5h9" stroke={PAPER} strokeWidth="2.2" opacity="0.4" />
    <rect x="14.5" y="14.5" width="35" height="18" rx="4" fill={GLASS} stroke={RED} strokeWidth="2.8" />
    <text
      x="32"
      y="23.8"
      fontSize="11.5"
      fontWeight="800"
      fill={YELLOW}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      274
    </text>
    <rect x="10" y="45" width="44" height="14" rx="7" fill={PAPER} stroke={INK} strokeWidth="3" />
    <circle cx="32" cy="52" r="3.4" fill={BLUE} />
    <path d="M25.2 52a6.8 6.8 0 0 1 13.6 0" stroke={BLUE} strokeWidth="2.2" />
  </svg>
);
