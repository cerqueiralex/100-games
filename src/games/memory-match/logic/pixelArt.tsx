/**
 * A tiny pixel-art renderer for Memory Match's hand-drawn themes.
 *
 * Sprites are authored as rows of single characters — one character per
 * pixel, keyed to a per-sprite palette, `.` transparent. That format is the
 * point: pixel art edited as a picture in the source file stays editable,
 * where a wall of SVG path data does not.
 *
 * Pixels are emitted as ONE path per colour rather than a rect per pixel:
 * an extreme board shows 56 cards at once, and a rect-per-pixel sprite would
 * put ~15 000 nodes on screen. Runs of the same colour inside a row are
 * merged into a single rectangle first, which typically cuts the geometry by
 * another two thirds.
 *
 * `shapeRendering="crispEdges"` is what keeps it PIXEL art at any card size:
 * without it the browser antialiases every pixel boundary and the sprite
 * turns to mush as the board scales.
 */
import type { ReactNode } from 'react';

export interface PixelSprite {
  /** character -> CSS colour. `.` is always transparent and never listed. */
  palette: Record<string, string>;
  /** one string per row; every row must be the same length */
  rows: string[];
}

/** `M x y h w v 1 h -w z` for one run of pixels */
function runPath(x: number, y: number, w: number): string {
  return `M${x} ${y}h${w}v1h-${w}z`;
}

/**
 * Merges each row's same-colour runs, then groups the runs by colour so the
 * sprite renders as a handful of paths.
 */
function pathsFor(sprite: PixelSprite): { color: string; d: string }[] {
  const byColor = new Map<string, string[]>();
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      const color = sprite.palette[ch];
      if (color) {
        const list = byColor.get(color) ?? [];
        list.push(runPath(x, y, run));
        byColor.set(color, list);
      }
      x += run;
    }
  });
  return [...byColor].map(([color, parts]) => ({ color, d: parts.join('') }));
}

/* Sprites are static, so the geometry is computed once per sprite and kept —
   the board re-renders on every flip and must not re-walk 56 bitmaps. */
const cache = new WeakMap<PixelSprite, { paths: { color: string; d: string }[]; w: number; h: number }>();

function geometry(sprite: PixelSprite) {
  let g = cache.get(sprite);
  if (!g) {
    g = {
      paths: pathsFor(sprite),
      w: sprite.rows[0]?.length ?? 0,
      h: sprite.rows.length
    };
    cache.set(sprite, g);
  }
  return g;
}

export function PixelArt({
  sprite,
  className,
  title
}: {
  sprite: PixelSprite;
  className?: string;
  title?: string;
}): ReactNode {
  const { paths, w, h } = geometry(sprite);
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {paths.map((p) => (
        <path key={p.color} d={p.d} fill={p.color} />
      ))}
    </svg>
  );
}

/** Validate uses this to prove every authored sprite is a clean rectangle. */
export function spriteSize(sprite: PixelSprite): { w: number; h: number; ragged: boolean } {
  const w = sprite.rows[0]?.length ?? 0;
  return { w, h: sprite.rows.length, ragged: sprite.rows.some((r) => r.length !== w) };
}
