/**
 * Nonogram (picture cross) generation + line solver.
 *
 * A puzzle is accepted only when the LINE SOLVER — per-row/column constraint
 * propagation over all legal run placements, iterated to fixpoint — fully
 * decides every cell. Because the source pattern is always one valid
 * solution and the solver only deduces forced cells, a fully-decided grid
 * proves BOTH guess-free solvability AND uniqueness of the solution.
 *
 * Pure TS, no React — importable headlessly for validation.
 */

/** Deterministic RNG so validation is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface NonogramPuzzle {
  seed: number;
  size: number;
  /** Solution pattern, 0/1, length size*size (row-major). */
  cells: number[];
  rowClues: number[][];
  colClues: number[][];
}

/** Runs of filled (1) cells in a line — the clue numbers. Empty line → []. */
export function deriveLineClues(line: number[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run > 0) {
      out.push(run);
      run = 0;
    }
  }
  if (run > 0) out.push(run);
  return out;
}

/* ------------------------------------------------------------------ */
/* Line solver                                                         */
/* ------------------------------------------------------------------ */

/**
 * Merge all legal placements of `clue` into a partially-known line.
 * `line` values: 0 unknown, 1 filled, -1 empty. Returns the deduced line
 * (forced cells resolved) or null when no placement fits (contradiction).
 */
export function lineSolve(clue: number[], line: number[]): number[] | null {
  const L = line.length;
  const K = clue.length;
  // suffix space needed to place clues k..K-1 (runs + single separators)
  const need = new Array<number>(K + 1);
  need[K] = 0;
  for (let k = K - 1; k >= 0; k--) need[k] = need[k + 1] + clue[k] + (k < K - 1 ? 1 : 0);

  const feasMemo = new Int8Array((L + 2) * (K + 1)); // 0 unknown, 1 yes, -1 no
  const key = (i: number, k: number) => i * (K + 1) + k;

  const feasible = (i: number, k: number): boolean => {
    const m = feasMemo[key(i, k)];
    if (m !== 0) return m === 1;
    let ok = false;
    if (k === K) {
      ok = true;
      for (let j = i; j < L; j++) {
        if (line[j] === 1) {
          ok = false;
          break;
        }
      }
    } else {
      for (let s = i; s + need[k] <= L; s++) {
        // cells i..s-1 must be allowed empty; once we pass a fixed fill, stop
        if (s > i && line[s - 1] === 1) break;
        let runOk = true;
        for (let j = s; j < s + clue[k]; j++) {
          if (line[j] === -1) {
            runOk = false;
            break;
          }
        }
        // separator after the run must be allowed empty
        if (runOk && s + clue[k] < L && line[s + clue[k]] === 1) runOk = false;
        if (runOk) {
          const nx = s + clue[k] + (s + clue[k] < L ? 1 : 0);
          if (feasible(nx, k + 1)) ok = true;
        }
      }
    }
    feasMemo[key(i, k)] = ok ? 1 : -1;
    return ok;
  };

  if (!feasible(0, 0)) return null;

  const canFill = new Array<boolean>(L).fill(false);
  const canEmpty = new Array<boolean>(L).fill(false);
  const visited = new Set<number>();
  const mark = (i: number, k: number): void => {
    // precondition: feasible(i, k)
    const vk = key(i, k);
    if (visited.has(vk)) return;
    visited.add(vk);
    if (k === K) {
      for (let j = i; j < L; j++) canEmpty[j] = true;
      return;
    }
    for (let s = i; s + need[k] <= L; s++) {
      if (s > i && line[s - 1] === 1) break;
      let runOk = true;
      for (let j = s; j < s + clue[k]; j++) {
        if (line[j] === -1) {
          runOk = false;
          break;
        }
      }
      if (runOk && s + clue[k] < L && line[s + clue[k]] === 1) runOk = false;
      if (!runOk) continue;
      const nx = s + clue[k] + (s + clue[k] < L ? 1 : 0);
      if (!feasible(nx, k + 1)) continue;
      for (let j = i; j < s; j++) canEmpty[j] = true;
      for (let j = s; j < s + clue[k]; j++) canFill[j] = true;
      if (s + clue[k] < L) canEmpty[s + clue[k]] = true;
      mark(nx, k + 1);
    }
  };
  mark(0, 0);

  const out = line.slice();
  for (let j = 0; j < L; j++) {
    if (out[j] !== 0) continue;
    if (canFill[j] && !canEmpty[j]) out[j] = 1;
    else if (canEmpty[j] && !canFill[j]) out[j] = -1;
  }
  return out;
}

export interface SolveResult {
  /** 0 unknown, 1 filled, -1 empty (row-major). */
  grid: number[];
  decided: boolean;
  contradiction: boolean;
}

/** Iterate the line solver over every row and column until fixpoint. */
export function solveByLines(rowClues: number[][], colClues: number[][], size: number): SolveResult {
  const g = new Array<number>(size * size).fill(0);
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      const line = g.slice(r * size, (r + 1) * size);
      const solved = lineSolve(rowClues[r], line);
      if (!solved) return { grid: g, decided: false, contradiction: true };
      for (let c = 0; c < size; c++) {
        if (solved[c] !== g[r * size + c]) {
          g[r * size + c] = solved[c];
          changed = true;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const line: number[] = [];
      for (let r = 0; r < size; r++) line.push(g[r * size + c]);
      const solved = lineSolve(colClues[c], line);
      if (!solved) return { grid: g, decided: false, contradiction: true };
      for (let r = 0; r < size; r++) {
        if (solved[r] !== g[r * size + c]) {
          g[r * size + c] = solved[r];
          changed = true;
        }
      }
    }
  }
  return { grid: g, decided: g.every((v) => v !== 0), contradiction: false };
}

/* ------------------------------------------------------------------ */
/* Pattern generation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Random pattern with a bias toward connected/symmetric blobs so results
 * look picture-like: seeded blob growth (random-walk neighbour expansion)
 * with occasional jumps, optional horizontal mirror, and every row/column
 * guaranteed at least one filled cell.
 */
function genPattern(rnd: () => number, size: number, density: number): number[] {
  const n = size * size;
  const cells = new Array<number>(n).fill(0);
  const target = Math.max(4, Math.round(density * n));
  const mirror = rnd() < 0.45;
  const filledList: number[] = [];
  let filled = 0;

  const paint = (i: number) => {
    if (cells[i] === 0) {
      cells[i] = 1;
      filledList.push(i);
      filled++;
    }
  };
  const paintM = (r: number, c: number) => {
    paint(r * size + c);
    if (mirror) paint(r * size + (size - 1 - c));
  };

  const seeds = 1 + Math.floor(size / 4);
  for (let s = 0; s < seeds; s++) {
    paintM(Math.floor(rnd() * size), Math.floor(rnd() * size));
  }

  let guard = 0;
  while (filled < target && guard++ < n * 40) {
    if (rnd() < 0.1 || filledList.length === 0) {
      paintM(Math.floor(rnd() * size), Math.floor(rnd() * size));
      continue;
    }
    const from = filledList[Math.floor(rnd() * filledList.length)];
    const r = Math.floor(from / size);
    const c = from % size;
    const dirs = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ].filter(([rr, cc]) => rr >= 0 && rr < size && cc >= 0 && cc < size);
    const [nr, nc] = dirs[Math.floor(rnd() * dirs.length)];
    paintM(nr, nc);
  }

  // picture-likeness: no fully empty rows/columns
  for (let r = 0; r < size; r++) {
    let has = false;
    for (let c = 0; c < size; c++) if (cells[r * size + c] === 1) has = true;
    if (!has) paintM(r, Math.floor(rnd() * size));
  }
  for (let c = 0; c < size; c++) {
    let has = false;
    for (let r = 0; r < size; r++) if (cells[r * size + c] === 1) has = true;
    if (!has) paint(Math.floor(rnd() * size) * size + c);
  }
  return cells;
}

function cluesOf(cells: number[], size: number): { rowClues: number[][]; colClues: number[][] } {
  const rowClues: number[][] = [];
  const colClues: number[][] = [];
  for (let r = 0; r < size; r++) rowClues.push(deriveLineClues(cells.slice(r * size, (r + 1) * size)));
  for (let c = 0; c < size; c++) {
    const line: number[] = [];
    for (let r = 0; r < size; r++) line.push(cells[r * size + c]);
    colClues.push(deriveLineClues(line));
  }
  return { rowClues, colClues };
}

/**
 * Generate a nonogram: random blob pattern at ~45–60% density, accepted
 * only when the line solver fully decides the board (guess-free + unique).
 * Deterministic for a given seed.
 */
export function generateNonogram(opts: { seed?: number; size: number }): NonogramPuzzle {
  const size = opts.size;
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const rnd = mulberry32(seed);
  const base = 0.45 + rnd() * 0.15;

  for (let attempt = 0; attempt < 900; attempt++) {
    // denser boards are more strongly determined — ramp gently on retries
    const density = Math.min(0.62, base + attempt * 0.003);
    const cells = genPattern(rnd, size, density);
    const { rowClues, colClues } = cluesOf(cells, size);
    const res = solveByLines(rowClues, colClues, size);
    if (res.decided && !res.contradiction) {
      return { seed, size, cells, rowClues, colClues };
    }
  }

  // unreachable in practice; a solid board is trivially line-decidable
  const cells = new Array<number>(size * size).fill(1);
  const { rowClues, colClues } = cluesOf(cells, size);
  return { seed, size, cells, rowClues, colClues };
}

/* ------------------------------------------------------------------ */
/* Play-state helpers (player grid: 0 unknown, 1 filled, 2 marked)     */
/* ------------------------------------------------------------------ */

/** A line is satisfied when its runs of FILLED cells equal the clue exactly. */
export function lineSatisfied(clue: number[], line: number[]): boolean {
  const runs = deriveLineClues(line.map((v) => (v === 1 ? 1 : 0)));
  const want = clue.filter((n) => n > 0);
  if (runs.length !== want.length) return false;
  return runs.every((n, i) => n === want[i]);
}

/**
 * Which clue numbers should render dimmed: all of them when the line is
 * satisfied, else runs fully resolved at the line's ends (closed by marks
 * or the edge) matched greedily from the left and from the right.
 */
export function clueDims(clue: number[], line: number[]): boolean[] {
  const want = clue.filter((n) => n > 0);
  if (want.length === 0) return clue.map(() => lineSatisfied(clue, line));
  const dims = want.map(() => false);
  if (lineSatisfied(clue, line)) return want.map(() => true);

  const L = line.length;
  // left scan
  let k = 0;
  let i = 0;
  while (i < L && k < want.length) {
    if (line[i] === 2) {
      i++;
      continue;
    }
    if (line[i] === 1) {
      let j = i;
      while (j < L && line[j] === 1) j++;
      if ((j === L || line[j] === 2) && j - i === want[k]) {
        dims[k] = true;
        k++;
        i = j;
        continue;
      }
    }
    break;
  }
  // right scan (never crossing the left scan)
  let k2 = want.length - 1;
  let i2 = L - 1;
  while (i2 >= 0 && k2 > k - 1 && k2 >= 0) {
    if (line[i2] === 2) {
      i2--;
      continue;
    }
    if (line[i2] === 1) {
      let j = i2;
      while (j >= 0 && line[j] === 1) j--;
      if ((j < 0 || line[j] === 2) && i2 - j === want[k2] && !dims[k2]) {
        dims[k2] = true;
        k2--;
        i2 = j;
        continue;
      }
    }
    break;
  }
  return dims;
}
