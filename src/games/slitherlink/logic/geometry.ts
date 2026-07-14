/**
 * Slitherlink lattice geometry — pure helpers shared by the generator,
 * the solver and the game component. No React.
 *
 * A rows×cols CELL grid has a (rows+1)×(cols+1) DOT lattice. Edges are
 * indexed in one flat array: all horizontal edges first, then vertical.
 *   H edge (r, c) = between dot (r,c) and (r,c+1) — r in 0..rows, c in 0..cols-1
 *   V edge (r, c) = between dot (r,c) and (r+1,c) — r in 0..rows-1, c in 0..cols
 */

export interface Geometry {
  rows: number;
  cols: number;
  /** count of horizontal edges — vertical edge ids start here */
  HN: number;
  /** total edge count */
  E: number;
  /** per cell (row-major): its 4 edge ids [top, right, bottom, left] */
  cellEdges: number[][];
  /** per dot (row-major, (cols+1) wide): incident edge ids (2–4) */
  dotEdges: number[][];
  /** per edge: its two dot ids */
  edgeDots: [number, number][];
  /** per edge: adjacent cell ids (1 on the border, else 2) */
  edgeCells: number[][];
}

export function hIndex(cols: number, r: number, c: number): number {
  return r * cols + c;
}

export function vIndex(rows: number, cols: number, r: number, c: number): number {
  return (rows + 1) * cols + r * (cols + 1) + c;
}

const cache = new Map<string, Geometry>();

export function geometry(rows: number, cols: number): Geometry {
  const key = `${rows}x${cols}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const HN = (rows + 1) * cols;
  const E = HN + rows * (cols + 1);

  const cellEdges: number[][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cellEdges.push([
        hIndex(cols, r, c),
        vIndex(rows, cols, r, c + 1),
        hIndex(cols, r + 1, c),
        vIndex(rows, cols, r, c)
      ]);
    }
  }

  const dotEdges: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const list: number[] = [];
      if (c > 0) list.push(hIndex(cols, r, c - 1));
      if (c < cols) list.push(hIndex(cols, r, c));
      if (r > 0) list.push(vIndex(rows, cols, r - 1, c));
      if (r < rows) list.push(vIndex(rows, cols, r, c));
      dotEdges.push(list);
    }
  }

  const edgeDots: [number, number][] = new Array(E);
  const edgeCells: number[][] = new Array(E);
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const e = hIndex(cols, r, c);
      edgeDots[e] = [r * (cols + 1) + c, r * (cols + 1) + c + 1];
      const cells: number[] = [];
      if (r > 0) cells.push((r - 1) * cols + c);
      if (r < rows) cells.push(r * cols + c);
      edgeCells[e] = cells;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const e = vIndex(rows, cols, r, c);
      edgeDots[e] = [r * (cols + 1) + c, (r + 1) * (cols + 1) + c];
      const cells: number[] = [];
      if (c > 0) cells.push(r * cols + c - 1);
      if (c < cols) cells.push(r * cols + c);
      edgeCells[e] = cells;
    }
  }

  const g: Geometry = { rows, cols, HN, E, cellEdges, dotEdges, edgeDots, edgeCells };
  cache.set(key, g);
  return g;
}
