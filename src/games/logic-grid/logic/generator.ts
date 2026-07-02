import type { Category, Clue, PuzzleDef, Ref } from './types';
import { decidedCount, isFullyDecided, solveByPropagation, stateMatchesSolution } from './solver';
import { themeById, THEMES, type Theme } from './themes';

/**
 * Seeded puzzle generator. Correctness contract (see solver.ts): a candidate
 * clue set is only accepted when propagation alone fully decides the grid,
 * which both guarantees a unique solution and that the puzzle is solvable by
 * pure step-by-step deduction — never guessing.
 */

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

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pick = <T,>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length)];

export interface GenOptions {
  seed: number;
  /** number of categories (3–4) */
  k: number;
  /** items per category (3–5) */
  n: number;
  themeId?: string;
  /**
   * Clue-mix bias. 'gentle' favors direct clues and keeps some redundancy;
   * 'tricky' favors relational clue types and strips every redundant clue.
   */
  flavor: 'gentle' | 'balanced' | 'tricky';
}

/** Ranking of clue types by flavor — lower rank is preferred by the greedy pass. */
const TYPE_RANK: Record<GenOptions['flavor'], Record<Clue['type'], number>> = {
  gentle: { is: 0, not: 1, either: 2, neither: 2, less: 3, distinct: 3 },
  balanced: { not: 0, either: 1, neither: 1, is: 2, less: 1, distinct: 2 },
  tricky: { less: 0, distinct: 0, either: 1, neither: 1, not: 2, is: 3 }
};

function buildCategories(theme: Theme, k: number, n: number, rnd: () => number): Category[] {
  const cats: Category[] = [];
  const namePool = shuffled(theme.primary.pool!, rnd).slice(0, n).sort();
  cats.push({ id: theme.primary.id, name: theme.primary.name, items: namePool, phrase: theme.primary.phrase });

  const others = shuffled(theme.others, rnd);
  // at most one numeric category per puzzle
  let numericUsed = false;
  for (const t of others) {
    if (cats.length === k) break;
    if (t.numeric) {
      if (numericUsed) continue;
      numericUsed = true;
      const values = shuffled(t.numeric.pool, rnd).slice(0, n).sort((a, b) => a - b);
      cats.push({
        id: t.id,
        name: t.name,
        items: values.map(t.numeric.format),
        phrase: t.phrase,
        numeric: { values, unit: t.numeric.unit, lessWord: t.numeric.lessWord, moreWord: t.numeric.moreWord }
      });
    } else {
      cats.push({ id: t.id, name: t.name, items: shuffled(t.pool!, rnd).slice(0, n), phrase: t.phrase });
    }
  }
  if (cats.length < k) throw new Error('theme has too few categories');
  return cats;
}

function buildCluePool(def: PuzzleDef, rnd: () => number): Clue[] {
  const k = def.categories.length;
  const n = def.categories[0].items.length;
  const sol = def.solution;
  const refOf = (e: number, c: number): Ref => [c, sol[c][e]];
  const pool: Clue[] = [];

  // direct positives — every true cross-category pair
  for (let ca = 0; ca < k; ca++) {
    for (let cb = ca + 1; cb < k; cb++) {
      for (let e = 0; e < n; e++) pool.push({ type: 'is', a: refOf(e, ca), b: refOf(e, cb) });
    }
  }
  // direct negatives
  for (let t = 0; t < 3 * n; t++) {
    const e1 = Math.floor(rnd() * n);
    let e2 = Math.floor(rnd() * n);
    if (e1 === e2) e2 = (e2 + 1) % n;
    const ca = Math.floor(rnd() * k);
    let cb = Math.floor(rnd() * k);
    if (ca === cb) cb = (cb + 1) % k;
    pool.push({ type: 'not', a: refOf(e1, ca), b: refOf(e2, cb) });
  }
  // either / neither (options always within one category)
  for (let t = 0; t < 3 * n; t++) {
    const e = Math.floor(rnd() * n);
    const ca = Math.floor(rnd() * k);
    let cb = Math.floor(rnd() * k);
    if (ca === cb) cb = (cb + 1) % k;
    const trueItem = sol[cb][e];
    const wrong = shuffled(
      Array.from({ length: n }, (_, x) => x).filter((x) => x !== trueItem),
      rnd
    );
    if (rnd() < 0.5) {
      const b = [ [cb, trueItem] as Ref, [cb, wrong[0]] as Ref ];
      const [b1, b2] = rnd() < 0.5 ? b : [b[1], b[0]];
      pool.push({ type: 'either', a: refOf(e, ca), b1, b2 });
    } else if (wrong.length >= 2) {
      pool.push({ type: 'neither', a: refOf(e, ca), b1: [cb, wrong[0]], b2: [cb, wrong[1]] });
    }
  }
  // multi-elimination: three refs, pairwise different people and categories
  if (k >= 3) {
    for (let t = 0; t < n; t++) {
      const es = shuffled(Array.from({ length: n }, (_, x) => x), rnd).slice(0, 3);
      const cs = shuffled(Array.from({ length: k }, (_, x) => x), rnd).slice(0, 3);
      if (es.length === 3 && cs.length === 3) {
        pool.push({ type: 'distinct', refs: [refOf(es[0], cs[0]), refOf(es[1], cs[1]), refOf(es[2], cs[2])] });
      }
    }
  }
  // comparatives on the numeric category
  const numCat = def.categories.findIndex((c) => c.numeric);
  if (numCat > 0) {
    const V = def.categories[numCat].numeric!.values;
    for (let t = 0; t < 3 * n; t++) {
      const e1 = Math.floor(rnd() * n);
      let e2 = Math.floor(rnd() * n);
      if (e1 === e2) e2 = (e2 + 1) % n;
      const [lo, hi] = V[sol[numCat][e1]] < V[sol[numCat][e2]] ? [e1, e2] : [e2, e1];
      const okCats = Array.from({ length: k }, (_, x) => x).filter((x) => x !== numCat);
      const ca = pick(okCats, rnd);
      const cb = pick(okCats, rnd);
      if (ca === cb && sol[ca][lo] === sol[cb][hi]) continue;
      const exact = rnd() < 0.4;
      pool.push({
        type: 'less',
        a: refOf(lo, ca),
        b: refOf(hi, cb),
        cat: numCat,
        diff: exact ? V[sol[numCat][hi]] - V[sol[numCat][lo]] : undefined
      });
    }
  }
  return pool;
}

const clueKey = (c: Clue): string => JSON.stringify(c);

export function generatePuzzle(opts: GenOptions): PuzzleDef {
  const rnd = mulberry32(opts.seed);
  const theme = opts.themeId ? themeById(opts.themeId) : pick(THEMES, rnd);
  const { k, n } = opts;

  for (let attempt = 0; attempt < 12; attempt++) {
    const categories = buildCategories(theme, k, n, rnd);
    const solution: number[][] = [Array.from({ length: n }, (_, e) => e)];
    for (let c = 1; c < k; c++) solution.push(shuffled(Array.from({ length: n }, (_, e) => e), rnd));

    const def: PuzzleDef = {
      id: `gen-${opts.seed}`,
      title: 'Logic grid',
      story: theme.story.replace('{n}', String(n)),
      categories,
      clues: [],
      solution
    };

    // rank the candidate pool by flavor (with jitter), then greedily add
    // clues that decide new cells until propagation solves the grid
    const rank = TYPE_RANK[opts.flavor];
    const seen = new Set<string>();
    const pool = buildCluePool(def, rnd)
      .filter((c) => {
        const key = clueKey(c);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => ({ c, w: rank[c.type] + rnd() * 1.6 }))
      .sort((a, b) => a.w - b.w)
      .map((x) => x.c);

    const chosen: Clue[] = [];
    let decided = 0;
    for (const cand of pool) {
      const s = solveByPropagation(def, [...chosen, cand]);
      if (s.contradiction) continue;
      const d = decidedCount(s);
      if (d > decided) {
        chosen.push(cand);
        decided = d;
        if (isFullyDecided(s)) break;
      }
    }
    if (!isFullyDecided(solveByPropagation(def, chosen))) continue; // rare: pool insufficient — reroll

    // strip redundant clues; 'gentle' keeps up to two redundant direct clues
    const keepRedundant = opts.flavor === 'gentle' ? 2 : 0;
    let spared = 0;
    for (const cand of shuffled([...chosen], rnd)) {
      const without = chosen.filter((c) => c !== cand);
      if (isFullyDecided(solveByPropagation(def, without))) {
        if (spared < keepRedundant && cand.type === 'is') {
          spared++;
          continue;
        }
        chosen.length = 0;
        chosen.push(...without);
      }
    }

    const finalState = solveByPropagation(def, chosen);
    if (!isFullyDecided(finalState) || !stateMatchesSolution(def, finalState)) continue;

    def.clues = shuffled(chosen, rnd);
    return def;
  }
  throw new Error(`logic-grid generation failed for seed ${opts.seed}`);
}

/** Sentence for a clue, assembled from the categories' person-denoting phrases. */
export function clueText(def: PuzzleDef, clue: Clue): string {
  const phrase = ([c, i]: Ref) => def.categories[c].phrase.replace('{item}', def.categories[c].items[i]);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  switch (clue.type) {
    case 'is':
      return `${cap(phrase(clue.a))} is ${phrase(clue.b)}.`;
    case 'not':
      return `${cap(phrase(clue.a))} is not ${phrase(clue.b)}.`;
    case 'either':
      return `${cap(phrase(clue.a))} is either ${phrase(clue.b1)} or ${phrase(clue.b2)}.`;
    case 'neither':
      return `${cap(phrase(clue.a))} is neither ${phrase(clue.b1)} nor ${phrase(clue.b2)}.`;
    case 'distinct':
      return `${clue.refs.map((r, i) => (i === 0 ? cap(phrase(r)) : phrase(r))).join(', ').replace(/, ([^,]*)$/, ' and $1')} are ${clue.refs.length} different people.`;
    case 'less': {
      const spec = def.categories[clue.cat].numeric!;
      if (clue.diff != null) {
        const plural = clue.diff === 1 ? spec.unit : `${spec.unit}s`;
        return `${cap(phrase(clue.a))} is ${clue.diff} ${plural} ${spec.lessWord} than ${phrase(clue.b)}.`;
      }
      return `${cap(phrase(clue.a))} is ${spec.lessWord} than ${phrase(clue.b)}.`;
    }
  }
}
