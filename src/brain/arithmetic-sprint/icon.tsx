/*
 * Arithmetic Sprint sticker — content art in the gameIcons.tsx formula
 * (64×64 viewBox, thick warm ink outline, flat saturated fills, one soft
 * highlight each). Fixed palette, identical on every theme — the documented
 * content-art opt-out from the token rule; UI controls stay monochrome.
 * Four tiles, one per operation the test samples.
 */

const INK = '#312e28';
const BLUE = '#3d9bff';
const RED = '#ff5a4e';
const GREEN = '#58c552';
const YELLOW = '#ffc933';
const WHITE = '#ffffff';

export function ArithmeticSprintArt({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="25" height="25" rx="7" fill={BLUE} stroke={INK} strokeWidth="3" />
      <rect x="34" y="5" width="25" height="25" rx="7" fill={RED} stroke={INK} strokeWidth="3" />
      <rect x="5" y="34" width="25" height="25" rx="7" fill={GREEN} stroke={INK} strokeWidth="3" />
      <rect x="34" y="34" width="25" height="25" rx="7" fill={YELLOW} stroke={INK} strokeWidth="3" />
      <rect x="9" y="9" width="8" height="3" rx="1.5" fill={WHITE} opacity="0.45" />
      <rect x="38" y="9" width="8" height="3" rx="1.5" fill={WHITE} opacity="0.45" />
      <rect x="9" y="38" width="8" height="3" rx="1.5" fill={WHITE} opacity="0.45" />
      <rect x="38" y="38" width="8" height="3" rx="1.5" fill={WHITE} opacity="0.6" />
      {/* + */}
      <path d="M17.5 12v11M12 17.5h11" stroke={WHITE} strokeWidth="3.8" />
      {/* − */}
      <path d="M41 17.5h11" stroke={WHITE} strokeWidth="3.8" />
      {/* × */}
      <path d="M13.6 42.6l7.8 7.8M21.4 42.6l-7.8 7.8" stroke={WHITE} strokeWidth="3.8" />
      {/* ÷ */}
      <path d="M41 46.5h11" stroke={INK} strokeWidth="3.4" />
      <circle cx="46.5" cy="40.6" r="2.2" fill={INK} />
      <circle cx="46.5" cy="52.4" r="2.2" fill={INK} />
    </svg>
  );
}

export const arithmeticSprintIcon = <ArithmeticSprintArt />;
