/*
 * Tower of Hanoi — pure logic (no React, headlessly testable).
 *
 * Two solvers:
 *  - `optimalMoves` / `solveHanoi`: the classic 3-peg recursion and the
 *    Frame–Stewart optimum for 4+ pegs, used for the par count and covered
 *    by `npm run validate`.
 *  - `nextOptimalMove`: a breadth-first search over the (tiny) state graph
 *    that returns the single best move from ANY legal position, so the
 *    in-game hint keeps guiding the player even after mistakes.
 */

export interface Move {
  from: number;
  to: number;
}

/** state[disc] = peg index the disc sits on; disc index 0 is the smallest. */
export type HanoiState = number[];

const fsMemo = new Map<string, number>();

/**
 * Minimum number of single-disc moves to transfer `discs` discs across
 * `pegs` pegs: 2^n − 1 for the classic 3 pegs, the Frame–Stewart recurrence
 * (best split, dynamic-programming) for 4+ pegs.
 */
export function optimalMoves(discs: number, pegs: number): number {
  if (discs <= 0) return 0;
  if (discs === 1) return 1;
  // fewer than 3 pegs cannot move a stack taller than one disc
  if (pegs < 3) return Infinity;
  const key = `${discs}:${pegs}`;
  const cached = fsMemo.get(key);
  if (cached !== undefined) return cached;
  let best = Infinity;
  for (let k = 1; k < discs; k++) {
    // move top k with all pegs, the rest with one fewer peg, then the k back
    const cost = 2 * optimalMoves(k, pegs) + optimalMoves(discs - k, pegs - 1);
    if (cost < best) best = cost;
  }
  fsMemo.set(key, best);
  return best;
}

/**
 * An optimal move list transferring `discs` discs from peg `from` to peg
 * `to`, using the remaining pegs as intermediates. Classic recursion when
 * only three pegs are available; Frame–Stewart with the optimal split
 * otherwise. Its length equals `optimalMoves(discs, pegs)`.
 */
export function solveHanoi(discs: number, pegs: number, from = 0, to = pegs - 1): Move[] {
  const spares: number[] = [];
  for (let p = 0; p < pegs; p++) if (p !== from && p !== to) spares.push(p);
  const out: Move[] = [];
  transfer(discs, from, to, spares, out);
  return out;
}

function transfer(n: number, from: number, to: number, spares: number[], out: Move[]): void {
  if (n <= 0) return;
  if (n === 1) {
    out.push({ from, to });
    return;
  }
  if (spares.length === 1) {
    // only three pegs in play → classic recursion
    const via = spares[0];
    transfer(n - 1, from, via, [to], out);
    out.push({ from, to });
    transfer(n - 1, via, to, [from], out);
    return;
  }
  const totalPegs = spares.length + 2;
  // Frame–Stewart: pick the split k that minimises the move count
  let bestK = 1;
  let best = Infinity;
  for (let k = 1; k < n; k++) {
    const cost = 2 * optimalMoves(k, totalPegs) + optimalMoves(n - k, totalPegs - 1);
    if (cost < best) {
      best = cost;
      bestK = k;
    }
  }
  const hold = spares[0];
  const rest = spares.slice(1);
  transfer(bestK, from, hold, [to, ...rest], out); // top k aside — all pegs free
  transfer(n - bestK, from, to, rest, out); // rest across — `hold` is off-limits
  transfer(bestK, hold, to, [from, ...rest], out); // k onto the target — all pegs free
}

/* ------- state helpers (shared by the BFS hint) ------- */

function encode(state: HanoiState, pegs: number): number {
  let code = 0;
  for (let i = state.length - 1; i >= 0; i--) code = code * pegs + state[i];
  return code;
}

function decode(code: number, n: number, pegs: number): HanoiState {
  const st = new Array<number>(n);
  let c = code;
  for (let i = 0; i < n; i++) {
    st[i] = c % pegs;
    c = Math.floor(c / pegs);
  }
  return st;
}

/** Every legal single-disc move from `state`. */
export function legalMoves(state: HanoiState, pegs: number): Move[] {
  const top = new Array<number>(pegs).fill(-1); // smallest disc index per peg (-1 = empty)
  for (let d = 0; d < state.length; d++) {
    const p = state[d];
    if (top[p] === -1) top[p] = d; // ascending d → first seen is the smallest
  }
  const moves: Move[] = [];
  for (let from = 0; from < pegs; from++) {
    const d = top[from];
    if (d === -1) continue;
    for (let to = 0; to < pegs; to++) {
      if (to === from) continue;
      const t = top[to];
      if (t === -1 || t > d) moves.push({ from, to }); // land only on a bigger disc / empty peg
    }
  }
  return moves;
}

function applyMove(state: HanoiState, mv: Move): HanoiState {
  const ns = state.slice();
  for (let d = 0; d < ns.length; d++) {
    if (ns[d] === mv.from) {
      ns[d] = mv.to; // smallest disc on `from` = its top
      break;
    }
  }
  return ns;
}

/**
 * The single move that most quickly brings `state` to having every disc
 * stacked on `target` (fewest remaining moves), via BFS over the state
 * graph — small enough (≤ pegs^discs) to solve instantly. Returns null when
 * already solved. Robust to any legal position, so it still helps after a
 * player has wandered off the optimal line.
 */
export function nextOptimalMove(state: HanoiState, pegs: number, target: number): Move | null {
  const n = state.length;
  const start = encode(state, pegs);
  const goal = encode(new Array<number>(n).fill(target), pegs);
  if (start === goal) return null;

  const prev = new Map<number, { code: number; move: Move }>();
  const seen = new Set<number>([start]);
  const queue: number[] = [start];
  let head = 0;
  let reached = false;
  while (head < queue.length) {
    const code = queue[head++];
    if (code === goal) {
      reached = true;
      break;
    }
    const st = decode(code, n, pegs);
    for (const mv of legalMoves(st, pegs)) {
      const nc = encode(applyMove(st, mv), pegs);
      if (seen.has(nc)) continue;
      seen.add(nc);
      prev.set(nc, { code, move: mv });
      queue.push(nc);
    }
  }
  if (!reached) return null;

  // walk the parent chain back to the start; the last step taken is our move
  let cur = goal;
  let first: Move | null = null;
  while (cur !== start) {
    const p = prev.get(cur);
    if (!p) break;
    first = p.move;
    cur = p.code;
  }
  return first;
}

/** Convert peg stacks (each bottom→top disc SIZES, 1..n) to a HanoiState. */
export function stacksToState(pegs: number[][], n: number): HanoiState {
  const st = new Array<number>(n).fill(0);
  pegs.forEach((stack, p) => stack.forEach((size) => (st[size - 1] = p)));
  return st;
}
