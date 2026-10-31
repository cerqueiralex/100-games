/*
 * Block Span's card sticker — content art in the game-icon style
 * (design/gameIcons.tsx: 64×64, thick warm ink outline, flat saturated
 * fills, one soft highlight). A violet board in the Memory area's colour
 * family with scattered blocks, three of them lit and joined by the dashed
 * path the player has to replay. Fixed palette, identical on every theme.
 */

const INK = '#312e28';
const BOARD = '#a979f0';
const BLOCK = '#f4ecff';
const LIT = '#ffc933';
const WHITE = '#ffffff';

export const blockSpanIcon = (
  <svg
    width={42}
    height={42}
    viewBox="0 0 64 64"
    aria-hidden
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="6" width="52" height="52" rx="12" fill={BOARD} stroke={INK} strokeWidth="3" />
    <path d="M18.5 20 L42 29 L27 46" stroke={WHITE} strokeWidth="3" strokeDasharray="0.1 5.2" opacity="0.95" />
    <rect x="40" y="10.5" width="9" height="9" rx="2.4" fill={BLOCK} stroke={INK} strokeWidth="2" />
    <rect x="11.5" y="30.5" width="8.5" height="8.5" rx="2.4" fill={BLOCK} stroke={INK} strokeWidth="2" />
    <rect x="40" y="41" width="10" height="10" rx="2.6" fill={BLOCK} stroke={INK} strokeWidth="2" />
    <rect x="12.5" y="14" width="12" height="12" rx="3" fill={LIT} stroke={INK} strokeWidth="2.2" />
    <rect x="36" y="23" width="12" height="12" rx="3" fill={LIT} stroke={INK} strokeWidth="2.2" />
    <rect x="21" y="40" width="12" height="12" rx="3" fill={LIT} stroke={INK} strokeWidth="2.2" />
    <rect x="10.5" y="9.6" width="9" height="2.6" rx="1.3" fill={WHITE} opacity="0.55" />
  </svg>
);
