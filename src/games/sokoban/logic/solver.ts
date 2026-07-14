/**
 * Sokoban solver & static analysis. All push-optimal, all pure TS.
 *
 * The search works at the PUSH level (the standard Sokoban reduction): a state
 * is the multiset of crate cells plus the player's reachable region, and each
 * edge is a single crate push whose required standing cell the player can walk
 * to. Player position is canonicalised to the minimum reachable cell so
 * walk-only differences collapse into one node. Dead-square pruning + an
 * admissible push-distance heuristic keep the tiny puzzle boards fast.
 */

import { OPP, step, type SokobanPuzzle } from './engine';

type Board = Pick<SokobanPuzzle, 'width' | 'height' | 'walls'>;

/** Reachable floor region for the player, avoiding walls and crates. */
function reachable(
  b: Board,
  crates: Set<number>,
  start: number
): { visited: Uint8Array; canon: number } {
  const { width: w, height: h, walls } = b;
  const visited = new Uint8Array(w * h);
  const queue = [start];
  visited[start] = 1;
  let canon = start;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (let d = 0; d < 4; d++) {
      const nb = step(cur, d, w, h);
      if (nb < 0 || walls[nb] || crates.has(nb) || visited[nb]) continue;
      visited[nb] = 1;
      if (nb < canon) canon = nb;
      queue.push(nb);
    }
  }
  return { visited, canon };
}

/**
 * Minimum pushes to move a lone crate from each cell to its nearest target,
 * ignoring other crates (an admissible lower bound). Computed by a reverse
 * push BFS out of every target: a crate at `a` can be pushed to `a+d` only if
 * the player can stand at `a-d`, so both `a` and `a-d` must be floor.
 */
export function pushDistField(b: Board, targets: number[]): number[] {
  const { width: w, height: h, walls } = b;
  const dist = new Array<number>(w * h).fill(Infinity);
  const queue: number[] = [];
  for (const t of targets) {
    if (dist[t] !== 0) {
      dist[t] = 0;
      queue.push(t);
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const bcell = queue[qi];
    for (let d = 0; d < 4; d++) {
      const a = step(bcell, OPP[d], w, h); // crate came from here (pushed in dir d)
      if (a < 0 || walls[a]) continue;
      const pusher = step(a, OPP[d], w, h); // player must have stood here
      if (pusher < 0 || walls[pusher]) continue;
      if (dist[bcell] + 1 < dist[a]) {
        dist[a] = dist[bcell] + 1;
        queue.push(a);
      }
    }
  }
  return dist;
}

/**
 * Floor cells from which a crate can NEVER reach any target (corners, dead
 * edges). A non-target crate parked here is an unrecoverable deadlock. Static
 * (walls only), so it never produces a false positive.
 */
export function computeDeadSquares(puzzle: SokobanPuzzle): boolean[] {
  const { width: w, height: h, walls } = puzzle;
  const dist = pushDistField(puzzle, puzzle.targets);
  const dead = new Array<boolean>(w * h).fill(false);
  for (let i = 0; i < w * h; i++) dead[i] = !walls[i] && !isFinite(dist[i]);
  return dead;
}

/** Crates (cell indices) sitting on a static dead square and off-target. */
export function deadlockedCrates(
  puzzle: SokobanPuzzle,
  crates: number[],
  dead?: boolean[]
): number[] {
  const d = dead ?? computeDeadSquares(puzzle);
  const targets = new Set(puzzle.targets);
  return crates.filter((c) => d[c] && !targets.has(c));
}

export interface PushStep {
  from: number;
  to: number;
  dir: number;
  stand: number;
}

interface HeapNode {
  f: number;
  g: number;
  crates: number[];
  canon: number;
  key: string;
}

/** Minimal binary min-heap keyed on `f`. */
class MinHeap {
  private a: HeapNode[] = [];
  get size(): number {
    return this.a.length;
  }
  push(n: HeapNode): void {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): HeapNode {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Push-optimal A*. Returns the ordered push list solving the given state and
 * its length (= pushes), or `null` if unsolvable within `budget` expansions.
 */
export function solve(
  puzzle: SokobanPuzzle,
  cratesStart: number[],
  playerStart: number,
  budget = 120000
): { pushes: number; steps: PushStep[] } | null {
  const { width: w, height: h, walls } = puzzle;
  const targetSet = new Set(puzzle.targets);
  const dead = computeDeadSquares(puzzle);
  const pd = pushDistField(puzzle, puzzle.targets);

  const heuristic = (crates: number[]): number => {
    let s = 0;
    for (const c of crates) {
      if (targetSet.has(c)) continue;
      const d = pd[c];
      if (!isFinite(d)) return Infinity;
      s += d;
    }
    return s;
  };
  const keyOf = (crates: number[], canon: number): string => crates.join(',') + '|' + canon;
  const solved = (crates: number[]): boolean => crates.every((c) => targetSet.has(c));

  const start = cratesStart.slice().sort((a, b) => a - b);
  const r0 = reachable(puzzle, new Set(start), playerStart);
  const startKey = keyOf(start, r0.canon);
  const h0 = heuristic(start);
  if (!isFinite(h0)) return null;

  const gScore = new Map<string, number>([[startKey, 0]]);
  const came = new Map<string, { prev: string; push: PushStep }>();
  const heap = new MinHeap();
  heap.push({ f: h0, g: 0, crates: start, canon: r0.canon, key: startKey });

  let expansions = 0;
  while (heap.size) {
    const cur = heap.pop();
    if (cur.g !== gScore.get(cur.key)) continue; // stale
    if (solved(cur.crates)) {
      const steps: PushStep[] = [];
      let k = cur.key;
      while (k !== startKey) {
        const e = came.get(k)!;
        steps.push(e.push);
        k = e.prev;
      }
      steps.reverse();
      return { pushes: cur.g, steps };
    }
    if (++expansions > budget) return null;

    const crateSet = new Set(cur.crates);
    const reach = reachable(puzzle, crateSet, cur.canon).visited;
    for (let ci = 0; ci < cur.crates.length; ci++) {
      const c = cur.crates[ci];
      for (let d = 0; d < 4; d++) {
        const to = step(c, d, w, h);
        if (to < 0 || walls[to] || crateSet.has(to) || dead[to]) continue;
        const stand = step(c, OPP[d], w, h);
        if (stand < 0 || walls[stand] || crateSet.has(stand) || !reach[stand]) continue;
        const next = cur.crates.slice();
        next[ci] = to;
        next.sort((a, b) => a - b);
        const nr = reachable(puzzle, new Set(next), c);
        const nk = keyOf(next, nr.canon);
        const ng = cur.g + 1;
        const prevG = gScore.get(nk);
        if (prevG === undefined || ng < prevG) {
          gScore.set(nk, ng);
          came.set(nk, { prev: cur.key, push: { from: c, to, dir: d, stand } });
          const hh = heuristic(next);
          if (isFinite(hh)) heap.push({ f: ng + hh, g: ng, crates: next, canon: nr.canon, key: nk });
        }
      }
    }
  }
  return null;
}

/** BFS the player from `start` to `goal` over empty floor; first-step dir or -1. */
function walkFirstStep(b: Board, crates: Set<number>, start: number, goal: number): number {
  if (start === goal) return -1;
  const { width: w, height: h, walls } = b;
  const prev = new Int32Array(w * h).fill(-1);
  const prevDir = new Int32Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const queue = [start];
  seen[start] = 1;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    if (cur === goal) break;
    for (let d = 0; d < 4; d++) {
      const nb = step(cur, d, w, h);
      if (nb < 0 || walls[nb] || crates.has(nb) || seen[nb]) continue;
      seen[nb] = 1;
      prev[nb] = cur;
      prevDir[nb] = d;
      queue.push(nb);
    }
  }
  if (!seen[goal]) return -1;
  let at = goal;
  let dir = prevDir[goal];
  while (prev[at] !== start && prev[at] !== -1) {
    dir = prevDir[prev[at]];
    at = prev[at];
  }
  return dir;
}

/**
 * The next single player move (Dir 0..3) on an optimal solution from the
 * current live state, or `null` when it can't be solved within budget (e.g.
 * the player has created a deadlock). Powers the Hint assist's ghost arrow.
 */
export function hintNextMove(
  puzzle: SokobanPuzzle,
  crates: number[],
  player: number,
  budget = 120000
): number | null {
  const sol = solve(puzzle, crates, player, budget);
  if (!sol || sol.steps.length === 0) return null;
  const first = sol.steps[0];
  if (player === first.stand) return first.dir; // already in place → push
  const walk = walkFirstStep(puzzle, new Set(crates), player, first.stand);
  return walk === -1 ? null : walk;
}
