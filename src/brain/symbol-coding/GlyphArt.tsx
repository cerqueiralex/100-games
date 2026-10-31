import { GLYPHS, GLYPH_PATHS, GLYPH_VIEWBOX, gridXY } from './logic/glyphs';

/**
 * Glyph rendering shared by the test, its demo and its sticker (icon.tsx). The
 * strokes are non-scaling (CSS sets their width in px per size), so a glyph
 * stays equally crisp at 26 px in the key and ~100 px on the target card.
 */
export function GlyphSvg({ glyph, className }: { glyph: number; className?: string }) {
  return (
    <svg className={`sc-glyph${className ? ` ${className}` : ''}`} viewBox={GLYPH_VIEWBOX} aria-hidden focusable="false">
      <path d={GLYPH_PATHS[glyph] ?? ''} />
    </svg>
  );
}

/** a pool glyph as raw path data inside an arbitrary box (for the sticker art) */
export function glyphPathIn(glyph: number, x0: number, y0: number, size: number): string {
  const g = GLYPHS[glyph] ?? [];
  const p = (pt: number) => {
    const [x, y] = gridXY(pt);
    return `${x0 + (x * size) / 2} ${y0 + (y * size) / 2}`;
  };
  return g.map((st) => (st.length === 2 ? `M${p(st[0])}L${p(st[1])}` : `M${p(st[0])}Q${p(st[1])} ${p(st[2])}`)).join('');
}
