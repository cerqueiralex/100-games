/**
 * Klondike Solitaire — pure game logic (no React).
 *
 * Everything here is deterministic and importable headlessly so the deal,
 * the rules and the solver can be validated by `npm run validate` and by the
 * headless test harness.
 *
 * State model
 * -----------
 *  - A `Card` is { s: suit, r: rank(1..13), up: face-up? }.
 *  - `KState` holds the stock (face-down draw pile — top = LAST element),
 *    the waste (face-up), 4 foundations (indexed by suit, built A→K), and
 *    7 tableau columns (index 0 = bottom card, last = the exposed top).
 *  - Moves are small serializable objects; `applyMove` returns a fresh state
 *    (it never mutates its input) and performs the automatic flip of a
 *    newly-exposed tableau card, so replaying a move list from the initial
 *    deal reproduces any state exactly (used for undo + save/resume).
 *
 * Winnability
 * -----------
 *  Because the whole deal is known, `isWinnable` runs a depth-first
 *  "thoughtful solitaire" search with a safe-autoplay pre-pass, a visited-set
 *  to kill cycles (stock recycling included), heuristic move ordering and a
 *  node budget. It only ever returns true when it actually reaches a won
 *  state through legal moves, so a `true` result is SOUND (no false wins);
 *  budget exhaustion yields a conservative `false`. easy/medium re-shuffle
 *  until a deal is proven winnable under that tier's own draw/redeal rules.
 */

import type { Difficulty } from '../../../platform/types';

export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export interface Card {
  s: Suit;
  r: number;
  up: boolean;
}

export interface KState {
  stock: Card[];
  waste: Card[];
  /** 4 piles indexed by suit order S,H,D,C */
  foundations: Card[][];
  /** 7 columns, index 0 = deepest card */
  tableau: Card[][];
  drawCount: 1 | 3;
  /** recycles still allowed; -1 = unlimited */
  redealsLeft: number;
}

export type Move =
  | { type: 'draw' }
  | { type: 'recycle' }
  | { type: 'wf' }
  | { type: 'wt'; to: number }
  | { type: 'tf'; from: number }
  | { type: 'tt'; from: number; to: number; count: number }
  | { type: 'ft'; suit: Suit; to: number };

/* ------------------------------------------------------------------ */
/* small card helpers                                                  */
/* ------------------------------------------------------------------ */

export const isRed = (s: Suit): boolean => s === 'H' || s === 'D';
const si = (s: Suit): number => (s === 'S' ? 0 : s === 'H' ? 1 : s === 'D' ? 2 : 3);
const oppositeSuits = (s: Suit): [Suit, Suit] => (isRed(s) ? ['S', 'C'] : ['H', 'D']);
const sameColorOther = (s: Suit): Suit => (s === 'S' ? 'C' : s === 'C' ? 'S' : s === 'H' ? 'D' : 'H');

function cloneCard(c: Card): Card {
  return { s: c.s, r: c.r, up: c.up };
}
function clonePile(p: Card[]): Card[] {
  return p.map(cloneCard);
}
export function cloneState(st: KState): KState {
  return {
    stock: clonePile(st.stock),
    waste: clonePile(st.waste),
    foundations: st.foundations.map(clonePile),
    tableau: st.tableau.map(clonePile),
    drawCount: st.drawCount,
    redealsLeft: st.redealsLeft
  };
}

const tabTop = (st: KState, c: number): Card | undefined => {
  const col = st.tableau[c];
  return col.length ? col[col.length - 1] : undefined;
};
const foundTop = (st: KState, s: Suit): Card | undefined => {
  const f = st.foundations[si(s)];
  return f.length ? f[f.length - 1] : undefined;
};
/** foundation rank for a suit (0 if empty) — equals the pile length */
const foundRank = (st: KState, s: Suit): number => st.foundations[si(s)].length;

/* ------------------------------------------------------------------ */
/* stacking rules                                                      */
/* ------------------------------------------------------------------ */

/** may `moving` be placed on tableau top `onto` (undefined = empty column)? */
export function canStackTableau(moving: Card, onto: Card | undefined): boolean {
  if (!onto) return moving.r === 13; // only Kings to an empty column
  return moving.r === onto.r - 1 && isRed(moving.s) !== isRed(onto.s);
}

/** may `moving` be placed on its foundation top `onto` (undefined = empty)? */
export function canStackFoundation(moving: Card, onto: Card | undefined): boolean {
  if (!onto) return moving.r === 1; // Ace starts a foundation
  return moving.s === onto.s && moving.r === onto.r + 1;
}

/** generic dispatch kept for the exported API */
export function canStack(moving: Card, onto: Card | undefined, dest: 'tableau' | 'foundation'): boolean {
  return dest === 'tableau' ? canStackTableau(moving, onto) : canStackFoundation(moving, onto);
}

/** index of the top-most card of the largest movable (ordered) run, or -1 */
export function runStart(col: Card[]): number {
  if (col.length === 0) return -1;
  let i = col.length - 1;
  if (!col[i].up) return -1;
  while (i > 0 && col[i - 1].up && col[i].r === col[i - 1].r - 1 && isRed(col[i].s) !== isRed(col[i - 1].s)) i--;
  return i;
}

/* ------------------------------------------------------------------ */
/* deal (seeded mulberry32 shuffle)                                    */
/* ------------------------------------------------------------------ */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** full 52-card deck, shuffled by seed, all face-down */
export function shuffledDeck(seed: number): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ s, r, up: false });
  const rng = mulberry32(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deal a fresh Klondike layout for a seed. 7 tableau columns receive 1..7
 * cards (top card face up); the remaining 24 form the stock. Deterministic.
 */
export function deal(seed: number, drawCount: 1 | 3 = 1, redeals = -1): KState {
  const deck = shuffledDeck(seed);
  let idx = 0;
  const tableau: Card[][] = [];
  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let k = 0; k <= col; k++) {
      const card = deck[idx++];
      card.up = k === col; // only the last card of each column is face up
      column.push(card);
    }
    tableau.push(column);
  }
  const stock = deck.slice(idx); // 24 face-down cards
  return { stock, waste: [], foundations: [[], [], [], []], tableau, drawCount, redealsLeft: redeals };
}

/* ------------------------------------------------------------------ */
/* apply a move (pure — returns a new state, handles the auto-flip)    */
/* ------------------------------------------------------------------ */

function flipTop(col: Card[]): void {
  if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
}

export function applyMove(state: KState, m: Move): KState {
  const st = cloneState(state);
  switch (m.type) {
    case 'draw': {
      const k = Math.min(st.drawCount, st.stock.length);
      const drawn = st.stock.splice(st.stock.length - k, k); // deepest → top
      drawn.reverse(); // deal from the top of the stock, one at a time
      for (const c of drawn) {
        c.up = true;
        st.waste.push(c);
      }
      break;
    }
    case 'recycle': {
      const back = st.waste.splice(0, st.waste.length);
      back.reverse(); // bottom of waste becomes top of stock — replays exactly
      for (const c of back) c.up = false;
      st.stock = back;
      st.waste = [];
      if (st.redealsLeft > 0) st.redealsLeft -= 1;
      break;
    }
    case 'wf': {
      const c = st.waste.pop();
      if (c) st.foundations[si(c.s)].push(c);
      break;
    }
    case 'wt': {
      const c = st.waste.pop();
      if (c) st.tableau[m.to].push(c);
      break;
    }
    case 'tf': {
      const col = st.tableau[m.from];
      const c = col.pop();
      if (c) st.foundations[si(c.s)].push(c);
      flipTop(col);
      break;
    }
    case 'tt': {
      const from = st.tableau[m.from];
      const moving = from.splice(from.length - m.count, m.count);
      st.tableau[m.to].push(...moving);
      flipTop(from);
      break;
    }
    case 'ft': {
      const f = st.foundations[si(m.suit)];
      const c = f.pop();
      if (c) st.tableau[m.to].push(c);
      break;
    }
  }
  return st;
}

/* ------------------------------------------------------------------ */
/* legal move enumeration                                              */
/* ------------------------------------------------------------------ */

/**
 * All legal moves (excluding foundation→tableau, which is legal but never
 * needed to win and only bloats search). Pointless King-to-empty shuffles
 * (moving a run that is already a whole column onto another empty column)
 * are filtered out.
 */
export function legalMoves(st: KState): Move[] {
  const moves: Move[] = [];

  if (st.stock.length > 0) moves.push({ type: 'draw' });
  else if (st.waste.length > 0 && st.redealsLeft !== 0) moves.push({ type: 'recycle' });

  const w = st.waste[st.waste.length - 1];
  if (w) {
    if (canStackFoundation(w, foundTop(st, w.s))) moves.push({ type: 'wf' });
    for (let c = 0; c < 7; c++) if (canStackTableau(w, tabTop(st, c))) moves.push({ type: 'wt', to: c });
  }

  for (let c = 0; c < 7; c++) {
    const t = tabTop(st, c);
    if (t && canStackFoundation(t, foundTop(st, t.s))) moves.push({ type: 'tf', from: c });
  }

  for (let from = 0; from < 7; from++) {
    const col = st.tableau[from];
    const rs = runStart(col);
    if (rs < 0) continue;
    for (let i = rs; i < col.length; i++) {
      const bottom = col[i];
      const count = col.length - i;
      for (let to = 0; to < 7; to++) {
        if (to === from) continue;
        const dest = st.tableau[to];
        if (dest.length === 0) {
          // King to an empty column, only when it actually uncovers something
          if (bottom.r === 13 && i > 0) moves.push({ type: 'tt', from, to, count });
        } else if (canStackTableau(bottom, dest[dest.length - 1])) {
          moves.push({ type: 'tt', from, to, count });
        }
      }
    }
  }
  return moves;
}

/** total cards on foundations */
export function foundationCount(st: KState): number {
  return st.foundations.reduce((a, f) => a + f.length, 0);
}

export function isWon(st: KState): boolean {
  return foundationCount(st) === 52;
}

/* ------------------------------------------------------------------ */
/* safe autoplay + auto-complete + hint                                */
/* ------------------------------------------------------------------ */

/** classic winnability-preserving "safe" rule for auto-sending to foundation */
function isSafe(st: KState, r: number, s: Suit): boolean {
  if (r <= 2) return true;
  const [o1, o2] = oppositeSuits(s);
  const oppMin = Math.min(foundRank(st, o1), foundRank(st, o2));
  const sameOther = foundRank(st, sameColorOther(s));
  return r <= oppMin + 1 && r <= sameOther + 2;
}

/** one obviously-safe card that can be auto-sent to a foundation, or null */
export function safeFoundationMove(st: KState): Move | null {
  const w = st.waste[st.waste.length - 1];
  if (w && w.r === foundRank(st, w.s) + 1 && isSafe(st, w.r, w.s)) return { type: 'wf' };
  for (let c = 0; c < 7; c++) {
    const t = tabTop(st, c);
    if (t && t.r === foundRank(st, t.s) + 1 && isSafe(st, t.r, t.s)) return { type: 'tf', from: c };
  }
  return null;
}

/** apply every currently-safe foundation move in place */
function autoSafe(st: KState): void {
  for (;;) {
    const m = safeFoundationMove(st);
    if (!m) break;
    const ns = applyMove(st, m);
    st.stock = ns.stock;
    st.waste = ns.waste;
    st.foundations = ns.foundations;
    st.tableau = ns.tableau;
    st.redealsLeft = ns.redealsLeft;
  }
}

/**
 * If the game can be finished purely by sending cards to the foundations
 * (greedy lowest-rank first, drawing/recycling only if that unblocks it),
 * return that finishing move list. Used to offer one-tap auto-complete.
 */
export function autoCompleteMoves(state: KState): { moves: Move[]; won: boolean } {
  const st = cloneState(state);
  const moves: Move[] = [];
  for (let guard = 0; guard < 600; guard++) {
    if (isWon(st)) return { moves, won: true };
    let best: Move | null = null;
    let bestRank = 99;
    const w = st.waste[st.waste.length - 1];
    if (w && w.r === foundRank(st, w.s) + 1 && w.r < bestRank) {
      best = { type: 'wf' };
      bestRank = w.r;
    }
    for (let c = 0; c < 7; c++) {
      const t = tabTop(st, c);
      if (t && t.r === foundRank(st, t.s) + 1 && t.r < bestRank) {
        best = { type: 'tf', from: c };
        bestRank = t.r;
      }
    }
    if (!best) {
      if (st.stock.length > 0) best = { type: 'draw' };
      else if (st.waste.length > 0 && st.redealsLeft !== 0) best = { type: 'recycle' };
    }
    if (!best) return { moves, won: false };
    moves.push(best);
    const ns = applyMove(st, best);
    st.stock = ns.stock;
    st.waste = ns.waste;
    st.foundations = ns.foundations;
    st.tableau = ns.tableau;
    st.redealsLeft = ns.redealsLeft;
  }
  return { moves, won: isWon(st) };
}

export function canAutoComplete(st: KState): boolean {
  // only offer it once there is nothing hidden left to discover
  const hidden = st.tableau.some((col) => col.some((c) => !c.up));
  if (hidden) return false;
  return autoCompleteMoves(st).won;
}

/** does removing this move's source expose a face-down tableau card? */
function flipsHidden(st: KState, m: Move): boolean {
  if (m.type === 'tf') {
    const col = st.tableau[m.from];
    return col.length > 1 && !col[col.length - 2].up;
  }
  if (m.type === 'tt') {
    const col = st.tableau[m.from];
    const rest = col.length - m.count;
    return rest > 0 && !col[rest - 1].up;
  }
  return false;
}

/** heuristic ordering used by both the solver and the hint button */
function orderedMoves(st: KState): Move[] {
  const cat = (m: Move): number => {
    if ((m.type === 'tt' || m.type === 'tf') && flipsHidden(st, m)) return 0;
    if (m.type === 'wt') return 2;
    if (m.type === 'tf' || m.type === 'wf') return 3;
    if (m.type === 'tt') return 4;
    if (m.type === 'draw') return 5;
    return 6; // recycle
  };
  return legalMoves(st)
    .map((m, i) => ({ m, i, c: cat(m) }))
    .sort((a, b) => a.c - b.c || a.i - b.i)
    .map((x) => x.m);
}

/** a useful next move to highlight for the player, or null if truly stuck */
export function hintMove(st: KState): Move | null {
  const ordered = orderedMoves(st);
  const productive = ordered.find((m) => m.type !== 'draw' && m.type !== 'recycle');
  if (productive) return productive;
  if (st.stock.length > 0) return { type: 'draw' };
  if (st.waste.length > 0 && st.redealsLeft !== 0) return { type: 'recycle' };
  return null;
}

/* ------------------------------------------------------------------ */
/* winnability solver                                                  */
/* ------------------------------------------------------------------ */

function hashState(st: KState): string {
  const enc = (p: Card[]) => p.map((c) => c.s + c.r.toString(36) + (c.up ? '1' : '0')).join('');
  const found = st.foundations.map((f) => f.length).join(',');
  return (
    st.stock.map((c) => c.s + c.r.toString(36)).join('') +
    '|' +
    st.waste.map((c) => c.s + c.r.toString(36)).join('') +
    '|' +
    found +
    '|' +
    st.tableau.map(enc).join(';') +
    '|' +
    st.redealsLeft
  );
}

/**
 * Depth-first winnability check. Returns true only when a won state is
 * actually reached, so `true` is sound. `budget` caps the number of expanded
 * nodes (and the visited-set size); exhausting it returns a safe `false`.
 */
export function isWinnable(state: KState, budget = 60000): boolean {
  const visited = new Set<string>();
  let nodes = 0;
  const MAX_DEPTH = 320;

  const dfs = (st: KState, depth: number): boolean => {
    autoSafe(st);
    if (isWon(st)) return true;
    if (nodes >= budget || visited.size >= budget || depth > MAX_DEPTH) return false;
    nodes++;
    const key = hashState(st);
    if (visited.has(key)) return false;
    visited.add(key);
    for (const m of orderedMoves(st)) {
      if (dfs(applyMove(st, m), depth + 1)) return true;
      if (nodes >= budget) return false;
    }
    return false;
  };

  return dfs(cloneState(state), 0);
}

/* ------------------------------------------------------------------ */
/* difficulty tiers + winnable-deal generation                         */
/* ------------------------------------------------------------------ */

export interface Tier {
  drawCount: 1 | 3;
  /** -1 = unlimited recycles */
  redeals: number;
  /** re-shuffle until the deal is proven winnable */
  winnableVerified: boolean;
  /** node budget for the winnability proof */
  solverBudget: number;
  /** difficulty score multiplier */
  mult: number;
}

export const TIERS: Record<Difficulty, Tier> = {
  easy: { drawCount: 1, redeals: -1, winnableVerified: true, solverBudget: 45000, mult: 1 },
  medium: { drawCount: 1, redeals: 3, winnableVerified: true, solverBudget: 45000, mult: 2 },
  hard: { drawCount: 3, redeals: -1, winnableVerified: false, solverBudget: 0, mult: 3 },
  pro: { drawCount: 3, redeals: 2, winnableVerified: false, solverBudget: 0, mult: 4 },
  extreme: { drawCount: 3, redeals: 1, winnableVerified: false, solverBudget: 0, mult: 5 }
};

/**
 * Bank of 200 original seeds whose deals were PROVEN winnable by `isWinnable`
 * (above) under medium's stricter rules (draw-1, 3 redeals). Since easy uses
 * draw-1 with UNLIMITED redeals — strictly more permissive — every seed here
 * is winnable for easy too, so one bank serves both winnable-verified tiers.
 * Baked offline (running the solver 40k+ times would be far too heavy at
 * mount); `npm run validate` re-proves a sample to keep the bank honest.
 */
export const WINNABLE_SEEDS: number[] = [
  87628868, 71072467, 2332836374, 2726892157, 2129828778, 1744294886, 2460948918, 4132947357, 66423384, 4101641996,
  2348607227, 2821642469, 2677552384, 3296055273, 1424954246, 3060815149, 2474128552, 2885633547, 2237719534, 3748223605,
  1681926480, 3187945218, 1538572630, 1063944197, 1683386784, 3493243858, 1596807433, 3846234189, 3952601095, 3364018641,
  2624276885, 3818626210, 3350164787, 3137681654, 1617615837, 3785003146, 3617717824, 2402704543, 916455794, 880689731,
  3525442413, 2826669914, 94181105, 1511400348, 3918514357, 4234232464, 1307882671, 1458625090, 3878680260, 794071891,
  3112730774, 1802695736, 1477159479, 4197941802, 3308735361, 2817273580, 1932221787, 1604508384, 1523142847, 4051379986,
  496462868, 604227655, 559638778, 2588992529, 2467450428, 2471216944, 2485557302, 5255709, 1526222715, 2377711262,
  914425728, 628708575, 3308264626, 55775924, 1420729987, 2537566726, 1630921133, 2918930216, 3117699175, 508498586,
  417743153, 1168612304, 2260780793, 1770848147, 3150413782, 549746040, 401868225, 2538498303, 949427593, 876677460,
  3153691046, 1341024200, 4154797649, 3114051093, 1268564080, 1392597263, 3579273892, 2234535347, 2756167773, 3588298444,
  2914616798, 215954341, 3715453120, 2361882610, 2466018985, 634556583, 2007019036, 2199610677, 2472346927, 3565932868,
  747482067, 633236349, 2233677496, 1593707191, 1400465578, 792942956, 872908251, 4069065086, 1229601477, 3834102079,
  1314121364, 688169187, 3757084902, 437274823, 582989969, 1776163004, 1223822670, 2930029653, 3631333711, 1844592226,
  1848191577, 1578536932, 1519492765, 3330632266, 767945740, 2025109499, 3569929524, 2667615093, 4037283408, 944213359,
  1782733826, 4270416317, 1735998442, 1225838252, 3547200027, 2209609989, 4081555104, 3535100287, 2314854921, 3775923156,
  1941535053, 3685993032, 2775749306, 2069749244, 3673621141, 2363910543, 2166901154, 2899195382, 1587949720, 18086679,
  3317489034, 700788577, 2362179916, 750501279, 3557551730, 4090595956, 1069957062, 2973701229, 2007449585, 837826716,
  57408331, 4183660590, 223347125, 1951815087, 2455870905, 4148997060, 501728339, 555320, 1831120475, 3018391520,
  840380863, 3108545609, 2713018644, 843503971, 1625112461, 2210552712, 1497593338, 3085886268, 4076234091, 165638771,
  2334003672, 103410519, 3046623649, 1194467451, 4277050270, 2703396739, 875130630, 1012660909, 2398540135, 1232445338
];

/**
 * Produce a starting deal for a tier. easy/medium draw a PROVEN-winnable seed
 * from `WINNABLE_SEEDS` (instant, no mount-time solving); a caller-supplied
 * `baseSeed` (e.g. a resumed game) is honored verbatim so saves round-trip.
 * hard/pro/extreme use a straight random deal — most are winnable-ish and
 * unlimited undo keeps them fair.
 */
export function generateDeal(
  difficulty: Difficulty,
  baseSeed?: number
): { state: KState; seed: number; winnable: boolean } {
  const tier = TIERS[difficulty];
  if (baseSeed !== undefined) {
    const seed = baseSeed >>> 0;
    return {
      state: deal(seed, tier.drawCount, tier.redeals),
      seed,
      winnable: tier.winnableVerified && WINNABLE_SEEDS.includes(seed)
    };
  }
  if (tier.winnableVerified) {
    const seed = WINNABLE_SEEDS[Math.floor(Math.random() * WINNABLE_SEEDS.length)];
    return { state: deal(seed, tier.drawCount, tier.redeals), seed, winnable: true };
  }
  const seed = Math.floor(Math.random() * 0x7fffffff) >>> 0;
  return { state: deal(seed, tier.drawCount, tier.redeals), seed, winnable: false };
}

/* labels for rendering (card content) */
export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
export function rankLabel(r: number): string {
  if (r === 1) return 'A';
  if (r === 11) return 'J';
  if (r === 12) return 'Q';
  if (r === 13) return 'K';
  return String(r);
}
