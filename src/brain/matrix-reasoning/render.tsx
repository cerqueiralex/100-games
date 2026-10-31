import type { ReactNode } from 'react';
import { RAY_COUNT, SIZE_LEVELS, type Cell, type Layout } from './logic/model';

/**
 * The matrix art — one crisp SVG per cell, in a 100×100 box. Ink and paper
 * come from the theme (CSS: --mr-ink / --mr-paper on .mr); the five shades
 * are mixes of ink into paper (luminance only, never hue — MaRs-IB's
 * colour-vision caveat), so the same level looks the same in a matrix cell
 * and on an answer tile, in every theme.
 */

const C = 50;
/** visual balance between shapes of one "size" (circumradius multipliers) */
const SHAPE_SCALE = [1.12, 0.95, 1, 1, 0.9];
/** distance from the centre to the outline in the figure's "up" direction, per unit radius */
const UP_EXTENT = [1, Math.SQRT1_2, 1, 1, 1];

interface FigureGeom {
  r: number;
  stroke: number;
  dotGap: number;
  dotR: number;
}

const GEOM: Record<Layout, FigureGeom> = {
  single: { r: 34, stroke: 3.2, dotGap: 6.5, dotR: 3.9 },
  number: { r: 13.5, stroke: 2.6, dotGap: 4.2, dotR: 3.3 },
  position: { r: 11.5, stroke: 2.5, dotGap: 3.6, dotR: 3.1 },
  logic: { r: 15, stroke: 2.8, dotGap: 4.6, dotR: 3 }
};

const NUMBER_SPOTS: [number, number][][] = [
  [[50, 50]],
  [
    [31, 50],
    [69, 50]
  ],
  [
    [50, 31],
    [31, 67],
    [69, 67]
  ],
  [
    [31, 31],
    [69, 31],
    [31, 69],
    [69, 69]
  ]
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const f2 = (x: number) => Math.round(x * 100) / 100;

function polygon(sides: number, cx: number, cy: number, r: number, turnDeg: number): string {
  const start = sides === 4 ? 45 : 0;
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rad(start + (i * 360) / sides + turnDeg);
    pts.push(`${f2(cx + r * Math.sin(a))},${f2(cy - r * Math.cos(a))}`);
  }
  return pts.join(' ');
}

/** one figure: outline + shade fill + the asymmetric marker dot that makes rotation visible */
function Figure({ cell, cx, cy, layout, k }: { cell: Cell; cx: number; cy: number; layout: Layout; k?: number }) {
  const g = GEOM[layout];
  const sizeMul = layout === 'single' ? SIZE_LEVELS[cell.size] : 1;
  const r = g.r * sizeMul * SHAPE_SCALE[cell.shape];
  const turn = cell.orient * 45;
  const reach = r * UP_EXTENT[cell.shape] + g.dotGap;
  const a = rad(turn);
  const cls = `mr-fig mr-sh${cell.shade}`;
  return (
    <g key={k}>
      {cell.shape === 4 ? (
        <circle className={cls} cx={cx} cy={cy} r={f2(r)} strokeWidth={g.stroke} />
      ) : (
        <polygon className={cls} points={polygon(cell.shape + 3, cx, cy, r, turn)} strokeWidth={g.stroke} />
      )}
      <circle className="mr-dot" cx={f2(cx + reach * Math.sin(a))} cy={f2(cy - reach * Math.cos(a))} r={g.dotR} />
    </g>
  );
}

function Rays({ mask }: { mask: number }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < RAY_COUNT; i++) {
    if (!(mask & (1 << i))) continue;
    const a = rad(i * 60);
    out.push(
      <line
        key={i}
        className="mr-ray"
        x1={f2(C + 29 * Math.sin(a))}
        y1={f2(C - 29 * Math.cos(a))}
        x2={f2(C + 44 * Math.sin(a))}
        y2={f2(C - 44 * Math.cos(a))}
      />
    );
  }
  return <>{out}</>;
}

/** the contents of one cell (no <svg> wrapper — for embedding in a larger drawing) */
export function CellGlyph({ cell, layout }: { cell: Cell; layout: Layout }) {
  switch (layout) {
    case 'number':
      return (
        <>
          {NUMBER_SPOTS[cell.number].map(([x, y], i) => (
            <Figure key={i} k={i} cell={cell} cx={x} cy={y} layout="number" />
          ))}
        </>
      );
    case 'position': {
      const col = cell.position % 3;
      const row = Math.floor(cell.position / 3);
      return <Figure cell={cell} cx={23 + 27 * col} cy={23 + 27 * row} layout="position" />;
    }
    case 'logic':
      return (
        <>
          <Rays mask={cell.rays} />
          <Figure cell={cell} cx={C} cy={C} layout="logic" />
        </>
      );
    default:
      return <Figure cell={cell} cx={C} cy={C} layout="single" />;
  }
}

/** one cell as a standalone, aspect-locked SVG */
export function CellArt({ cell, layout, label }: { cell: Cell; layout: Layout; label?: string }) {
  return (
    <svg className="mr-art" viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <CellGlyph cell={cell} layout={layout} />
    </svg>
  );
}
