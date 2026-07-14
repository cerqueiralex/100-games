/**
 * Pure geometry for the Jigsaw game — no React, fully headless-testable.
 *
 * An R×C grid of interlocking pieces is laid over a (square-celled) image.
 * Every interior edge is a tab (+1, protrudes out) or a blank (-1, notches
 * in); the two pieces sharing an edge always get complementary signs so
 * neighbours interlock. Border edges are flat (0). All positional geometry
 * is expressed in CELL UNITS (1 unit = one cell side) so the renderer can
 * scale the whole board by a single `cell` pixel size and resize for free.
 */

export type Edge = -1 | 0 | 1; // -1 blank (notch in) · 0 flat border · +1 tab (out)

export interface EdgeShape {
  top: Edge;
  right: Edge;
  bottom: Edge;
  left: Edge;
}

export interface Piece {
  id: number;
  row: number;
  col: number;
  /** the piece's home cell — where it locks when solved */
  correctPos: { row: number; col: number };
  edges: EdgeShape;
  /** initial scatter position: bounding-box top-left, in CELL UNITS */
  currentPos: { x: number; y: number };
  /** 0 | 90 | 180 | 270 — only ever non-zero when the tier allows rotation */
  rotation: number;
}

export interface Puzzle {
  seed: number;
  rows: number;
  cols: number;
  rotate: boolean;
  pieces: Piece[];
}

export interface MakeOpts {
  seed?: number;
  rows: number;
  cols: number;
  rotate?: boolean;
}

// ---- tunables (cell units) ----
export const TAB = 0.3; // tab apex height as a fraction of the cell side
export const PAD = 0.34; // piece bounding-box overhang on every side
export const BOX = 1 + 2 * PAD; // piece bounding-box side, in cell units
export const SNAP_TOL = 0.42; // max centre distance (cell units) to snap home

/** deterministic PRNG so a seed fully reproduces a puzzle (edges + scatter) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Stage layout — all in cell units, shared by the renderer so scatter and
// board positions live in one coordinate space.
// ---------------------------------------------------------------------------

export interface Layout {
  stageW: number;
  stageH: number;
  boardX: number;
  boardY: number;
  bandTop: number; // top of the scatter band (below the board)
}

export const PILE_STEP_Y = 0.62; // vertical pitch of scatter rows (overlapping)
const BAND_GAP = 0.5; // gap between board bottom and the scatter band

export function layout(rows: number, cols: number): Layout {
  const boardX = PAD;
  const boardY = PAD + 0.2;
  const stageW = cols + 2 * PAD;
  const pileRows = Math.max(1, Math.ceil((rows * cols) / cols));
  const bandTop = boardY + rows + BAND_GAP;
  const bandH = 1 + (pileRows - 1) * PILE_STEP_Y + 2 * PAD;
  const stageH = bandTop + bandH;
  return { stageW, stageH, boardX, boardY, bandTop };
}

// ---------------------------------------------------------------------------
// Geometry helpers (cell units)
// ---------------------------------------------------------------------------

/** home bounding-box top-left for a piece (where it renders when placed) */
export function homeBoxTL(p: { row: number; col: number }, l: Layout): { x: number; y: number } {
  return { x: l.boardX + p.col - PAD, y: l.boardY + p.row - PAD };
}

/** centre of a bounding box given its top-left */
export function boxCenter(tl: { x: number; y: number }): { x: number; y: number } {
  return { x: tl.x + BOX / 2, y: tl.y + BOX / 2 };
}

/** home cell centre for a piece (== boxCenter(homeBoxTL)) */
export function homeCenter(p: { row: number; col: number }, l: Layout): { x: number; y: number } {
  return { x: l.boardX + p.col + 0.5, y: l.boardY + p.row + 0.5 };
}

export function isBorderPiece(p: Piece, rows: number, cols: number): boolean {
  return p.row === 0 || p.col === 0 || p.row === rows - 1 || p.col === cols - 1;
}

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

export function makePuzzle({ seed, rows, cols, rotate = false }: MakeOpts): Puzzle {
  const s = seed ?? Math.floor(Math.random() * 0x7fffffff);
  const rng = mulberry32(s);
  const l = layout(rows, cols);

  // interior edge signs — one random sign per shared boundary
  // vSign[r][c] : boundary between (r,c) and (r,c+1),  c in 0..cols-2
  // hSign[r][c] : boundary between (r,c) and (r+1,c),  r in 0..rows-2
  const vSign: number[][] = [];
  for (let r = 0; r < rows; r++) {
    vSign[r] = [];
    for (let c = 0; c < cols - 1; c++) vSign[r][c] = rng() < 0.5 ? 1 : -1;
  }
  const hSign: number[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    hSign[r] = [];
    for (let c = 0; c < cols; c++) hSign[r][c] = rng() < 0.5 ? 1 : -1;
  }

  const pieces: Piece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const edges: EdgeShape = {
        // the shared boundary gives one piece the tab and its neighbour the
        // exact complement (−sign), so tab always meets blank
        right: (c < cols - 1 ? vSign[r][c] : 0) as Edge,
        left: (c > 0 ? -vSign[r][c - 1] : 0) as Edge,
        bottom: (r < rows - 1 ? hSign[r][c] : 0) as Edge,
        top: (r > 0 ? -hSign[r - 1][c] : 0) as Edge
      };
      pieces.push({
        id: r * cols + c,
        row: r,
        col: c,
        correctPos: { row: r, col: c },
        edges,
        currentPos: { x: 0, y: 0 },
        rotation: 0
      });
    }
  }

  // scatter: shuffle piece order (seeded) and lay them into an overlapping
  // grid within the bottom band, so border and interior pieces are mixed
  const order = pieces.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const pileCols = cols;
  order.forEach((pieceIdx, i) => {
    const prow = Math.floor(i / pileCols);
    const pcol = i % pileCols;
    const jitterX = (rng() - 0.5) * 0.28;
    const jitterY = (rng() - 0.5) * 0.28;
    const p = pieces[pieceIdx];
    p.currentPos = {
      x: l.boardX + pcol - PAD + jitterX,
      y: l.bandTop + prow * PILE_STEP_Y + jitterY
    };
    p.rotation = rotate ? Math.floor(rng() * 4) * 90 : 0;
  });

  return { seed: s, rows, cols, rotate, pieces };
}

// ---------------------------------------------------------------------------
// Path generator — a closed SVG path for one piece, with bezier tab curves.
// Drawn in a box of side `size*(1+2*PAD)` with the cell region inset by `pad`.
// ---------------------------------------------------------------------------

interface Seg {
  t: 'L' | 'C';
  p: number[];
}

/** one edge from t=0 to t=1 in local (t along edge, p outward) coordinates */
function edgeSegs(sign: Edge): Seg[] {
  if (sign === 0) return [{ t: 'L', p: [1, 0] }];
  const s = sign;
  const h = TAB;
  // flat shoulder → bulbous knob (control x outside [0.35,0.65] gives the
  // interlocking undercut neck) → mirrored down → flat shoulder
  return [
    { t: 'L', p: [0.35, 0] },
    { t: 'C', p: [0.5, 0, 0.27, s * h, 0.5, s * h] },
    { t: 'C', p: [0.73, s * h, 0.5, 0, 0.65, 0] },
    { t: 'L', p: [1, 0] }
  ];
}

/**
 * Closed SVG path for a piece with the given edge shape. `size` is the cell
 * side in px; `pad` (default size*PAD) is the tab overhang. Always begins
 * with `M` and ends with `Z`.
 */
export function piecePath(edges: EdgeShape, size = 100, pad = size * PAD): string {
  const frames = [
    { P: [pad, pad], D: [1, 0], N: [0, -1], sign: edges.top },
    { P: [pad + size, pad], D: [0, 1], N: [1, 0], sign: edges.right },
    { P: [pad + size, pad + size], D: [-1, 0], N: [0, 1], sign: edges.bottom },
    { P: [pad, pad + size], D: [0, -1], N: [-1, 0], sign: edges.left }
  ];
  const map = (f: (typeof frames)[number], t: number, p: number): [number, number] => [
    f.P[0] + f.D[0] * t * size + f.N[0] * p * size,
    f.P[1] + f.D[1] * t * size + f.N[1] * p * size
  ];
  const r = (n: number) => Math.round(n * 100) / 100;
  let d = `M ${r(frames[0].P[0])} ${r(frames[0].P[1])}`;
  for (const f of frames) {
    for (const seg of edgeSegs(f.sign)) {
      if (seg.t === 'L') {
        const [x, y] = map(f, seg.p[0], seg.p[1]);
        d += ` L ${r(x)} ${r(y)}`;
      } else {
        const [x1, y1] = map(f, seg.p[0], seg.p[1]);
        const [x2, y2] = map(f, seg.p[2], seg.p[3]);
        const [x, y] = map(f, seg.p[4], seg.p[5]);
        d += ` C ${r(x1)} ${r(y1)} ${r(x2)} ${r(y2)} ${r(x)} ${r(y)}`;
      }
    }
  }
  return d + ' Z';
}
