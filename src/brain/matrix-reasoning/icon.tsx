/**
 * Sticker art for Matrix Reasoning — game-icon style (design/gameIcons.tsx:
 * 64×64, warm ink outline, flat saturated fills, one soft highlight). Content
 * art with its own fixed palette, identical on every theme.
 */
const INK = '#312e28';
const RED = '#ff5a4e';
const BLUE = '#3d9bff';
const GREEN = '#58c552';
const YELLOW = '#ffc933';
const WHITE = '#ffffff';

export const matrixReasoningIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="7" width="50" height="50" rx="9" fill={WHITE} stroke={INK} strokeWidth="3" />
    <path d="M23.7 9v46M40.3 9v46M9 23.7h46M9 40.3h46" stroke={INK} strokeWidth="1.6" opacity="0.28" />
    {/* row 1: triangles growing */}
    <path d="M15.4 19.2l3-5.2 3 5.2z" fill={RED} stroke={INK} strokeWidth="1.8" />
    <path d="M28 20.4l4-7 4 7z" fill={RED} stroke={INK} strokeWidth="1.8" />
    <path d="M43 21.4l5-8.8 5 8.8z" fill={RED} stroke={INK} strokeWidth="1.8" />
    {/* row 2: circles growing */}
    <circle cx="16.4" cy="32" r="3" fill={BLUE} stroke={INK} strokeWidth="1.8" />
    <circle cx="32" cy="32" r="4.2" fill={BLUE} stroke={INK} strokeWidth="1.8" />
    <circle cx="48.2" cy="32" r="5.4" fill={BLUE} stroke={INK} strokeWidth="1.8" />
    {/* row 3: squares growing, then the missing piece */}
    <rect x="13.6" y="45.4" width="5.6" height="5.6" rx="1" fill={GREEN} stroke={INK} strokeWidth="1.8" />
    <rect x="28" y="44.2" width="8" height="8" rx="1.2" fill={GREEN} stroke={INK} strokeWidth="1.8" />
    <rect x="41.8" y="41.8" width="12.8" height="12.8" rx="3" fill={YELLOW} stroke={INK} strokeWidth="2.2" />
    <text x="48.2" y="48.6" fontSize="10.5" fontWeight="900" fill={INK} textAnchor="middle" dominantBaseline="central">
      ?
    </text>
    <path d="M12.5 12.4c2.6-1.6 5.4-2.2 8.6-2.1" stroke={WHITE} strokeWidth="2.2" opacity="0.9" />
  </svg>
);
