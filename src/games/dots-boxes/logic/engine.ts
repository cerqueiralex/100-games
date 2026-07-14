/**
 * Dots & Boxes — pure board engine (no React, headlessly testable).
 *
 * Geometry: a grid of `rows × cols` boxes drawn from `(rows+1) × (cols+1)`
 * dots. Edges are addressed by a single stable integer:
 *   - horizontal edges first, row-major: rows+1 rows × cols each
 *   - then vertical edges, row-major:     rows rows × cols+1 each
 * so an edge id survives JSON round-trips for save/resume.
 */

export type Owner = 0 | 1;

export interface Board {
  rows: number;
  cols: number;
  /** count of horizontal edges — the offset where vertical edges begin */
  hCount: number;
  edgeCount: number;
}

export interface GameSnap {
  /** drawn?[edge] */
  edges: boolean[];
  /** owner?[box], row-major (rows × cols) */
  boxes: (Owner | null)[];
  /** whose move it is */
  turn: Owner;
}

export function makeBoard(rows: number, cols: number): Board {
  const hCount = (rows + 1) * cols;
  const vCount = rows * (cols + 1);
  return { rows, cols, hCount, edgeCount: hCount + vCount };
}

export function initSnap(board: Board): GameSnap {
  return {
    edges: new Array(board.edgeCount).fill(false),
    boxes: new Array(board.rows * board.cols).fill(null),
    turn: 0
  };
}

/** horizontal edge id (row 0..rows, col 0..cols-1) */
export function hIndex(b: Board, row: number, col: number): number {
  return row * b.cols + col;
}

/** vertical edge id (row 0..rows-1, col 0..cols) */
export function vIndex(b: Board, row: number, col: number): number {
  return b.hCount + row * (b.cols + 1) + col;
}

export function boxIndex(b: Board, r: number, c: number): number {
  return r * b.cols + c;
}

/** the four edge ids of a box: [top, bottom, left, right] */
export function boxEdges(b: Board, r: number, c: number): [number, number, number, number] {
  return [hIndex(b, r, c), hIndex(b, r + 1, c), vIndex(b, r, c), vIndex(b, r, c + 1)];
}

export interface EdgeInfo {
  type: 'h' | 'v';
  row: number;
  col: number;
}

export function edgeInfo(b: Board, edge: number): EdgeInfo {
  if (edge < b.hCount) {
    return { type: 'h', row: Math.floor(edge / b.cols), col: edge % b.cols };
  }
  const e = edge - b.hCount;
  const w = b.cols + 1;
  return { type: 'v', row: Math.floor(e / w), col: e % w };
}

/** the box (or two boxes) an edge borders */
export function edgeBoxes(b: Board, edge: number): number[] {
  const info = edgeInfo(b, edge);
  const res: number[] = [];
  if (info.type === 'h') {
    if (info.row - 1 >= 0) res.push(boxIndex(b, info.row - 1, info.col));
    if (info.row <= b.rows - 1) res.push(boxIndex(b, info.row, info.col));
  } else {
    if (info.col - 1 >= 0) res.push(boxIndex(b, info.row, info.col - 1));
    if (info.col <= b.cols - 1) res.push(boxIndex(b, info.row, info.col));
  }
  return res;
}

/** how many of a box's four walls are drawn */
export function boxSides(b: Board, edges: boolean[], boxI: number): number {
  const r = Math.floor(boxI / b.cols);
  const c = boxI % b.cols;
  const [t, bo, l, ri] = boxEdges(b, r, c);
  return (edges[t] ? 1 : 0) + (edges[bo] ? 1 : 0) + (edges[l] ? 1 : 0) + (edges[ri] ? 1 : 0);
}

export interface MoveResult {
  snap: GameSnap;
  /** box ids claimed by this move (0, 1 or 2) */
  captured: number[];
}

/**
 * Draw `edge` for `player`. Completing the 4th side of a box claims it AND
 * grants another turn (turn stays with the mover); otherwise the turn passes.
 * Pure — returns a fresh snapshot.
 */
export function applyMove(b: Board, snap: GameSnap, edge: number, player: Owner): MoveResult {
  const edges = snap.edges.slice();
  const boxes = snap.boxes.slice();
  edges[edge] = true;
  const captured: number[] = [];
  for (const bi of edgeBoxes(b, edge)) {
    if (boxes[bi] === null && boxSides(b, edges, bi) === 4) {
      boxes[bi] = player;
      captured.push(bi);
    }
  }
  const again = captured.length > 0;
  const turn: Owner = again ? player : player === 0 ? 1 : 0;
  return { snap: { edges, boxes, turn }, captured };
}

export function legalEdges(snap: GameSnap): number[] {
  const res: number[] = [];
  for (let i = 0; i < snap.edges.length; i++) if (!snap.edges[i]) res.push(i);
  return res;
}

export function isComplete(snap: GameSnap): boolean {
  for (let i = 0; i < snap.edges.length; i++) if (!snap.edges[i]) return false;
  return true;
}

/** [boxes owned by player 0, boxes owned by player 1] */
export function boxCounts(snap: GameSnap): [number, number] {
  let a = 0;
  let d = 0;
  for (const o of snap.boxes) {
    if (o === 0) a++;
    else if (o === 1) d++;
  }
  return [a, d];
}

/** the single undrawn wall of a 3-sided box, or -1 */
export function missingEdge(b: Board, snap: GameSnap, boxI: number): number {
  const r = Math.floor(boxI / b.cols);
  const c = boxI % b.cols;
  for (const e of boxEdges(b, r, c)) if (!snap.edges[e]) return e;
  return -1;
}
