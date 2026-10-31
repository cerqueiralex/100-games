import { glyphPathIn } from './GlyphArt';
import { ICON_GLYPHS } from './logic/demo';

/*
 * Symbol Coding sticker — content art in the gameIcons.tsx formula (64×64
 * viewBox, thick warm ink outline, flat saturated fills, one soft highlight
 * each). Fixed palette, identical on every theme — the documented
 * content-art opt-out from the token rule; UI controls stay monochrome.
 * A three-cell key strip, the blue target tile showing the key's middle
 * symbol, and the yellow answer bubble with its number.
 */

const INK = '#312e28';
const BLUE = '#3d9bff';
const PINK = '#ff5d8f';
const GREEN = '#58c552';
const YELLOW = '#ffc933';
const WHITE = '#ffffff';

export function SymbolCodingArt({ size = 42 }: { size?: number }) {
  const [left, target, right] = ICON_GLYPHS;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* the key strip: three cells, the target's cell lit */}
      <rect x="5" y="5" width="54" height="25" rx="7" fill={WHITE} stroke={INK} strokeWidth="3" />
      <rect x="23.5" y="6.5" width="17" height="22" fill="#dcebff" />
      <path d="M23.5 6.5v22M40.5 6.5v22" stroke={INK} strokeWidth="2" />
      <path d={glyphPathIn(left, 8.6, 10.2, 11)} stroke={PINK} strokeWidth="2.6" />
      <path d={glyphPathIn(target, 26.5, 10.2, 11)} stroke={BLUE} strokeWidth="2.6" />
      <path d={glyphPathIn(right, 44.4, 10.2, 11)} stroke={GREEN} strokeWidth="2.6" />
      {/* the target tile */}
      <rect x="5" y="35" width="30" height="24" rx="7" fill={BLUE} stroke={INK} strokeWidth="3" />
      <rect x="9" y="39" width="8" height="3" rx="1.5" fill={WHITE} opacity="0.45" />
      <path d={glyphPathIn(target, 13.2, 40, 13.6)} stroke={WHITE} strokeWidth="3.2" />
      {/* the answer: the target sits in the key's second cell */}
      <circle cx="48" cy="47" r="11" fill={YELLOW} stroke={INK} strokeWidth="3" />
      <path d="M43.6 41.6a6.4 6.4 0 0 1 4.4 -2.4" stroke={WHITE} strokeWidth="1.8" opacity="0.7" />
      <text x="48" y="47.8" fontSize="14" fontWeight="800" fill={INK} textAnchor="middle" dominantBaseline="central">
        2
      </text>
    </svg>
  );
}

export const symbolCodingIcon = <SymbolCodingArt />;
