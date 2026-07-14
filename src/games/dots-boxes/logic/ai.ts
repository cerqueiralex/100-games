/**
 * Dots & Boxes opponent — pure, stateless, everything derived from the visible
 * board each turn (so save/resume is free, like Battleship's AI).
 *
 * Strategy scales with difficulty:
 *   easy    — random legal edge, but grabs a free box if one is offered.
 *   medium  — never draws the 3rd side of a box unless forced (plays only
 *             "safe" neutral edges), always takes free boxes greedily.
 *   hard    — medium + chain awareness: when forced to give something away,
 *             opens the SHORTEST chain (cheapest sacrifice).
 *   pro     — the real game: the double-cross ("all-but-two") endgame keeps
 *             control of the chains, plus a short Monte-Carlo rollout in the
 *             endgame to pick the safe/opening move that wins the parity.
 *   extreme — same brain on a bigger board with a deeper rollout budget.
 */
import type { Difficulty } from '../../../platform/types';
import {
  applyMove,
  boxEdges,
  boxSides,
  edgeBoxes,
  legalEdges,
  missingEdge,
  boxCounts,
  isComplete,
  type Board,
  type GameSnap,
  type Owner
} from './engine';

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const other = (p: Owner): Owner => (p === 0 ? 1 : 0);

/** undrawn edges that immediately complete at least one box */
export function capturingEdges(b: Board, snap: GameSnap): number[] {
  return legalEdges(snap).filter((e) =>
    edgeBoxes(b, e).some((bi) => snap.boxes[bi] === null && boxSides(b, snap.edges, bi) === 3)
  );
}

/** an edge is "neutral" when it leaves every adjacent unclaimed box at ≤2
 *  walls — i.e. it neither captures nor hands the opponent a 3rd side */
function isNeutral(b: Board, snap: GameSnap, e: number): boolean {
  return edgeBoxes(b, e).every((bi) => snap.boxes[bi] !== null || boxSides(b, snap.edges, bi) <= 1);
}

export function safeEdges(b: Board, snap: GameSnap): number[] {
  return legalEdges(snap).filter((e) => isNeutral(b, snap, e));
}

/** first unclaimed 3-sided box, or -1 */
function findCapturableBox(b: Board, snap: GameSnap): number {
  for (let bi = 0; bi < snap.boxes.length; bi++) {
    if (snap.boxes[bi] === null && boxSides(b, snap.edges, bi) === 3) return bi;
  }
  return -1;
}

/** the connected region of unclaimed boxes joined by undrawn shared walls */
function component(b: Board, snap: GameSnap, start: number): Set<number> {
  const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    const r = Math.floor(cur / b.cols);
    const c = cur % b.cols;
    const [top, bottom, left, right] = boxEdges(b, r, c);
    const step = (nb: number, wall: number) => {
      if (nb < 0 || snap.edges[wall] || snap.boxes[nb] !== null || seen.has(nb)) return;
      seen.add(nb);
      stack.push(nb);
    };
    if (r > 0) step(cur - b.cols, top);
    if (r < b.rows - 1) step(cur + b.cols, bottom);
    if (c > 0) step(cur - 1, left);
    if (c < b.cols - 1) step(cur + 1, right);
  }
  return seen;
}

/** greedy capture order (edges) restricted to a set of boxes */
function greedyOrderInComp(b: Board, snap: GameSnap, comp: Set<number>): number[] {
  let s = snap;
  const order: number[] = [];
  let guard = 0;
  while (guard++ < 500) {
    let capBox = -1;
    for (const bi of comp) {
      if (s.boxes[bi] === null && boxSides(b, s.edges, bi) === 3) {
        capBox = bi;
        break;
      }
    }
    if (capBox === -1) break;
    const e = missingEdge(b, s, capBox);
    order.push(e);
    s = applyMove(b, s, e, 0).snap;
  }
  return order;
}

/**
 * Capture-phase move for the smart tiers. Normally grabs the next free box,
 * but when only two boxes of a chain remain and other regions are still on the
 * board it plays the "double-dealing" handback instead — declining both boxes
 * so the opponent is forced to take them and then open the next chain.
 */
function captureMove(b: Board, snap: GameSnap, player: Owner, doubleCross: boolean): number {
  const caps = capturingEdges(b, snap);
  const takeNow = caps[0];
  if (!doubleCross) return takeNow;

  const capBox = findCapturableBox(b, snap);
  if (capBox === -1) return takeNow;
  const comp = component(b, snap, capBox);
  const totalUnclaimed = snap.boxes.filter((o) => o === null).length;
  const otherRegions = totalUnclaimed - comp.size > 0;

  // leave exactly the last two of a chain as a handback
  if (comp.size === 2 && otherRegions) {
    const order = greedyOrderInComp(b, snap, comp);
    const handback = order[order.length - 1];
    if (handback !== undefined && handback !== takeNow) {
      const test = applyMove(b, snap, handback, player);
      const bothCapturable = [...comp].every(
        (bi) => test.snap.boxes[bi] === null && boxSides(b, test.snap.edges, bi) === 3
      );
      if (test.captured.length === 0 && bothCapturable) return handback;
    }
  }
  return takeNow;
}

/** how many boxes the opponent could greedily grab if we open with `e` */
function sacrificeCost(b: Board, snap: GameSnap, e: number, player: Owner): number {
  const opp = other(player);
  let s = applyMove(b, snap, e, player).snap;
  let count = 0;
  let guard = 0;
  while (guard++ < 500) {
    const caps = capturingEdges(b, s);
    if (caps.length === 0) break;
    const res = applyMove(b, s, caps[0], opp);
    count += res.captured.length;
    s = res.snap;
  }
  return count;
}

/** the opening edges that give away the fewest boxes */
function shortestSacrifices(b: Board, snap: GameSnap, player: Owner): number[] {
  const legal = legalEdges(snap);
  let best: number[] = [];
  let bestCost = Infinity;
  for (const e of legal) {
    const cost = sacrificeCost(b, snap, e, player);
    if (cost < bestCost) {
      bestCost = cost;
      best = [e];
    } else if (cost === bestCost) {
      best.push(e);
    }
  }
  return best.length ? best : legal;
}

/**
 * A fixed, DETERMINISTIC strong policy used to play a position out to the end
 * (a static continuation for the 1-ply endgame search). Keeping it
 * deterministic makes one rollout enough — no Monte-Carlo noise — so the whole
 * endgame can be searched cheaply. Both sides play the double-cross, so the
 * search scores each candidate by the box margin under mutual best play —
 * which is exactly what decides who wins the chain parity.
 */
function basePolicy(b: Board, snap: GameSnap): number {
  const caps = capturingEdges(b, snap);
  if (caps.length) return captureMove(b, snap, snap.turn, true);
  const safe = safeEdges(b, snap);
  if (safe.length) return safe[0];
  return shortestSacrifices(b, snap, snap.turn)[0];
}

/** play `snap` to completion with basePolicy; return aiBoxes − oppBoxes */
function rollout(b: Board, snap: GameSnap, aiPlayer: Owner): number {
  let s = snap;
  let guard = 0;
  while (!isComplete(s) && guard++ < 4000) {
    s = applyMove(b, s, basePolicy(b, s), s.turn).snap;
  }
  const [c0, c1] = boxCounts(s);
  return aiPlayer === 0 ? c0 - c1 : c1 - c0;
}

/** pick the candidate whose fixed-policy continuation yields the best margin */
function evalBest(b: Board, snap: GameSnap, player: Owner, candidates: number[]): number {
  let best = candidates[0];
  let bestVal = -Infinity;
  for (const e of candidates) {
    const after = applyMove(b, snap, e, player).snap;
    const val = rollout(b, after, player);
    if (val > bestVal) {
      bestVal = val;
      best = e;
    }
  }
  return best;
}

/** Choose the AI's next edge for `player` on the given board + snapshot. */
export function pickAiMove(b: Board, snap: GameSnap, difficulty: Difficulty, player: Owner): number {
  const caps = capturingEdges(b, snap);

  // 1) a box is free — take it (or double-deal on the smart tiers)
  if (caps.length) {
    if (difficulty === 'pro' || difficulty === 'extreme') return captureMove(b, snap, player, true);
    return rand(caps);
  }

  const safe = safeEdges(b, snap);

  if (difficulty === 'easy') {
    return rand(legalEdges(snap));
  }
  if (difficulty === 'medium') {
    return safe.length ? rand(safe) : rand(legalEdges(snap));
  }
  if (difficulty === 'hard') {
    return safe.length ? rand(safe) : rand(shortestSacrifices(b, snap, player));
  }

  // pro / extreme: a 1-ply endgame search (static strong continuation) picks
  // the safe move — or the opening — that wins the box margin, which is what
  // controls the chain parity. Only kicks in once the board is small enough to
  // read to the end; the wide opening is still random-safe.
  const remaining = legalEdges(snap).length;
  const threshold = difficulty === 'extreme' ? 52 : 40;
  if (safe.length) {
    if (remaining <= threshold) return evalBest(b, snap, player, safe);
    return rand(safe);
  }
  // forced to open — the search prefers the shortest chain that also keeps
  // control of the parity battle
  const openings = shortestSacrifices(b, snap, player);
  return evalBest(b, snap, player, openings);
}
