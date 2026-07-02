import type { Clue, PuzzleDef } from './types';

/**
 * Deduction engine for logic grid puzzles. It only ever applies SOUND rules
 * (facts true in every solution consistent with the clues), so if propagation
 * reaches a fully decided grid, that grid is provably the unique solution.
 * The generator relies on this: a puzzle is only accepted when propagation
 * alone solves it — no guessing needed, no ambiguity possible.
 */

export interface PairIndex {
  /** ordered list of category pairs [a, b] with a < b */
  pairs: [number, number][];
  /** idx[a][b] -> position in `pairs` (a < b) */
  idx: number[][];
}

export function makePairs(k: number): PairIndex {
  const pairs: [number, number][] = [];
  const idx = Array.from({ length: k }, () => Array<number>(k).fill(-1));
  for (let a = 0; a < k; a++) {
    for (let b = a + 1; b < k; b++) {
      idx[a][b] = pairs.length;
      pairs.push([a, b]);
    }
  }
  return { pairs, idx };
}

export interface SolveState {
  k: number;
  n: number;
  pi: PairIndex;
  /** per pair, flat n*n array of 0/1/2 */
  marks: number[][];
  contradiction: boolean;
}

export function createState(k: number, n: number): SolveState {
  const pi = makePairs(k);
  return {
    k,
    n,
    pi,
    marks: pi.pairs.map(() => new Array<number>(n * n).fill(0)),
    contradiction: false
  };
}

export function getMark(s: SolveState, ca: number, i: number, cb: number, j: number): number {
  if (ca === cb) return i === j ? 2 : 1;
  if (ca > cb) return getMark(s, cb, j, ca, i);
  return s.marks[s.pi.idx[ca][cb]][i * s.n + j];
}

/** Set a mark; returns true if it changed, flags contradiction on conflict. */
export function setMark(s: SolveState, ca: number, i: number, cb: number, j: number, m: number): boolean {
  if (ca === cb) {
    if ((i === j ? 2 : 1) !== m) s.contradiction = true;
    return false;
  }
  if (ca > cb) return setMark(s, cb, j, ca, i, m);
  const p = s.pi.idx[ca][cb];
  const at = i * s.n + j;
  const cur = s.marks[p][at];
  if (cur === m) return false;
  if (cur !== 0) {
    s.contradiction = true;
    return false;
  }
  s.marks[p][at] = m;
  return true;
}

function applyClue(s: SolveState, c: Clue, def: PuzzleDef): boolean {
  let ch = false;
  switch (c.type) {
    case 'is':
      ch = setMark(s, c.a[0], c.a[1], c.b[0], c.b[1], 2) || ch;
      break;
    case 'not':
      ch = setMark(s, c.a[0], c.a[1], c.b[0], c.b[1], 1) || ch;
      break;
    case 'neither':
      ch = setMark(s, c.a[0], c.a[1], c.b1[0], c.b1[1], 1) || ch;
      ch = setMark(s, c.a[0], c.a[1], c.b2[0], c.b2[1], 1) || ch;
      break;
    case 'either': {
      const cb = c.b1[0];
      for (let x = 0; x < s.n; x++) {
        if (x !== c.b1[1] && x !== c.b2[1]) ch = setMark(s, c.a[0], c.a[1], cb, x, 1) || ch;
      }
      if (getMark(s, c.a[0], c.a[1], cb, c.b1[1]) === 1) {
        ch = setMark(s, c.a[0], c.a[1], cb, c.b2[1], 2) || ch;
      }
      if (getMark(s, c.a[0], c.a[1], cb, c.b2[1]) === 1) {
        ch = setMark(s, c.a[0], c.a[1], cb, c.b1[1], 2) || ch;
      }
      break;
    }
    case 'distinct':
      for (let x = 0; x < c.refs.length; x++) {
        for (let y = x + 1; y < c.refs.length; y++) {
          ch = setMark(s, c.refs[x][0], c.refs[x][1], c.refs[y][0], c.refs[y][1], 1) || ch;
        }
      }
      break;
    case 'less': {
      const V = def.categories[c.cat].numeric!.values;
      const [ca, ia] = c.a;
      const [cb, ib] = c.b;
      // strict inequality ⇒ different people
      if (ca !== cb) ch = setMark(s, ca, ia, cb, ib, 1) || ch;
      const candA: number[] = [];
      const candB: number[] = [];
      for (let v = 0; v < s.n; v++) {
        if (getMark(s, ca, ia, c.cat, v) !== 1) candA.push(v);
        if (getMark(s, cb, ib, c.cat, v) !== 1) candB.push(v);
      }
      const fits = (va: number, vb: number) =>
        va !== vb && (c.diff == null ? V[vb] > V[va] : V[vb] - V[va] === c.diff);
      for (const va of candA) {
        if (!candB.some((vb) => fits(va, vb))) ch = setMark(s, ca, ia, c.cat, va, 1) || ch;
      }
      for (const vb of candB) {
        if (!candA.some((va) => fits(va, vb))) ch = setMark(s, cb, ib, c.cat, vb, 1) || ch;
      }
      break;
    }
  }
  return ch;
}

/** Within each pair grid: a ✓ excludes its row/column; a row/column with one option left gets the ✓. */
function basicElimination(s: SolveState): boolean {
  let ch = false;
  const { n } = s;
  for (let p = 0; p < s.pi.pairs.length; p++) {
    const [a, b] = s.pi.pairs[p];
    const M = s.marks[p];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (M[i * n + j] !== 2) continue;
        for (let x = 0; x < n; x++) {
          if (x !== j) ch = setMark(s, a, i, b, x, 1) || ch;
          if (x !== i) ch = setMark(s, a, x, b, j, 1) || ch;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      let yes = 0;
      let unknown = -1;
      let unknowns = 0;
      for (let j = 0; j < n; j++) {
        const m = M[i * n + j];
        if (m === 2) yes++;
        else if (m === 0) {
          unknowns++;
          unknown = j;
        }
      }
      if (yes === 0 && unknowns === 0) s.contradiction = true;
      if (yes === 0 && unknowns === 1) ch = setMark(s, a, i, b, unknown, 2) || ch;
    }
    for (let j = 0; j < n; j++) {
      let yes = 0;
      let unknown = -1;
      let unknowns = 0;
      for (let i = 0; i < n; i++) {
        const m = M[i * n + j];
        if (m === 2) yes++;
        else if (m === 0) {
          unknowns++;
          unknown = i;
        }
      }
      if (yes === 0 && unknowns === 0) s.contradiction = true;
      if (yes === 0 && unknowns === 1) ch = setMark(s, a, unknown, b, j, 2) || ch;
    }
  }
  return ch;
}

/** A confirmed ✓ merges the two items' relations with every third category. */
function transitive(s: SolveState): boolean {
  let ch = false;
  const { n, k } = s;
  for (let p = 0; p < s.pi.pairs.length; p++) {
    const [a, b] = s.pi.pairs[p];
    const M = s.marks[p];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (M[i * n + j] !== 2) continue;
        for (let c = 0; c < k; c++) {
          if (c === a || c === b) continue;
          for (let x = 0; x < n; x++) {
            const m1 = getMark(s, a, i, c, x);
            const m2 = getMark(s, b, j, c, x);
            if (m1 !== 0 && m2 === 0) ch = setMark(s, b, j, c, x, m1) || ch;
            if (m2 !== 0 && m1 === 0) ch = setMark(s, a, i, c, x, m2) || ch;
            if (m1 !== 0 && m2 !== 0 && m1 !== m2) s.contradiction = true;
          }
        }
      }
    }
  }
  return ch;
}

/** If two items share no possible partner in some third category, they can't match. */
function disjointCandidates(s: SolveState): boolean {
  let ch = false;
  const { n, k } = s;
  for (let p = 0; p < s.pi.pairs.length; p++) {
    const [a, b] = s.pi.pairs[p];
    const M = s.marks[p];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (M[i * n + j] !== 0) continue;
        for (let c = 0; c < k; c++) {
          if (c === a || c === b) continue;
          let compatible = false;
          for (let x = 0; x < n; x++) {
            if (getMark(s, a, i, c, x) !== 1 && getMark(s, b, j, c, x) !== 1) {
              compatible = true;
              break;
            }
          }
          if (!compatible) {
            ch = setMark(s, a, i, b, j, 1) || ch;
            break;
          }
        }
      }
    }
  }
  return ch;
}

export function propagate(def: PuzzleDef, s: SolveState, clues: Clue[] = def.clues): void {
  let changed = true;
  while (changed && !s.contradiction) {
    changed = false;
    for (const c of clues) changed = applyClue(s, c, def) || changed;
    changed = basicElimination(s) || changed;
    changed = transitive(s) || changed;
    changed = disjointCandidates(s) || changed;
  }
}

export function decidedCount(s: SolveState): number {
  let d = 0;
  for (const M of s.marks) for (const m of M) if (m !== 0) d++;
  return d;
}

export function isFullyDecided(s: SolveState): boolean {
  if (s.contradiction) return false;
  for (const M of s.marks) for (const m of M) if (m === 0) return false;
  return true;
}

/** Run propagation from a blank grid with the given clues. */
export function solveByPropagation(def: PuzzleDef, clues: Clue[] = def.clues): SolveState {
  const s = createState(def.categories.length, def.categories[0].items.length);
  propagate(def, s, clues);
  return s;
}

/** True mark for a cell according to the baked solution. */
export function truthAt(def: PuzzleDef, a: number, i: number, b: number, j: number): 1 | 2 {
  const n = def.categories[0].items.length;
  for (let e = 0; e < n; e++) {
    if (def.solution[a][e] === i && def.solution[b][e] === j) return 2;
  }
  return 1;
}

/** Verify a fully-decided state exactly matches the baked solution. */
export function stateMatchesSolution(def: PuzzleDef, s: SolveState): boolean {
  const { n } = s;
  for (let p = 0; p < s.pi.pairs.length; p++) {
    const [a, b] = s.pi.pairs[p];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (s.marks[p][i * n + j] !== truthAt(def, a, i, b, j)) return false;
      }
    }
  }
  return true;
}
