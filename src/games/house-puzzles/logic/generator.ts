import { CATEGORY_BANK, COLOR_CATEGORY } from './themes';
import {
  isFullyDecided,
  solveByPropagation,
  stateMatchesSolution,
  type HpAttr,
  type HpClue,
  type HpPuzzle
} from './solver';

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

export type HpFlavor = 'gentle' | 'tricky';

export interface HpGenOptions {
  seed: number;
  n: number; // houses
  k: number; // categories (color included)
  flavor: HpFlavor;
}

/** greedy pass prefers lower ranks — gentle leans direct, tricky relational */
const TYPE_RANK: Record<HpFlavor, Record<HpClue['type'], number>> = {
  gentle: { at: 0, same: 1, directRight: 2, adjacent: 3, ends: 3, rightOf: 4, between: 5 },
  tricky: { between: 0, rightOf: 0, adjacent: 1, ends: 1, directRight: 2, same: 3, at: 4 }
};

export function generateHousePuzzle(opts: HpGenOptions): HpPuzzle {
  const rnd = mulberry32(opts.seed);
  const { n, k } = opts;

  for (let attempt = 0; attempt < 40; attempt++) {
    const cats = [COLOR_CATEGORY, ...shuffled(CATEGORY_BANK, rnd).slice(0, k - 1)].map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      kind: t.kind,
      items: shuffled(t.items, rnd).slice(0, n)
    }));
    // solution[c][house] = item index
    const solution = cats.map(() => shuffled(Array.from({ length: n }, (_, i) => i), rnd));
    const posOf = (a: HpAttr) => solution[a.c].indexOf(a.i);

    /* ---------- every clue candidate that is TRUE in this solution ---------- */
    const candidates: HpClue[] = [];
    const attrs: HpAttr[] = [];
    for (let c = 0; c < k; c++) for (let i = 0; i < n; i++) attrs.push({ c, i });

    for (const a of attrs) {
      const p = posOf(a);
      candidates.push({ type: 'at', a, house: p });
      if (p === 0 || p === n - 1) candidates.push({ type: 'ends', a });
    }
    for (const a of attrs) {
      for (const b of attrs) {
        if (a.c === b.c && a.i === b.i) continue;
        const pa = posOf(a);
        const pb = posOf(b);
        if (a.c !== b.c && pa === pb && a.c < b.c) candidates.push({ type: 'same', a, b });
        if (pa === pb + 1) candidates.push({ type: 'directRight', a, b });
        if (Math.abs(pa - pb) === 1 && (a.c < b.c || (a.c === b.c && a.i < b.i)))
          candidates.push({ type: 'adjacent', a, b });
        if (pa > pb + 1 && rnd() < 0.5) candidates.push({ type: 'rightOf', a, b });
      }
    }
    // a sample of ordered "between" triples (the full set is huge)
    for (let t = 0; t < n * k * 4; t++) {
      const a = attrs[Math.floor(rnd() * attrs.length)];
      const l = attrs[Math.floor(rnd() * attrs.length)];
      const r = attrs[Math.floor(rnd() * attrs.length)];
      const pa = posOf(a);
      if (posOf(l) < pa && pa < posOf(r) && a.c !== l.c && a.c !== r.c && l.c !== r.c) {
        candidates.push({ type: 'between', a, left: l, right: r });
      }
    }

    /* ---------- greedy build-up, then strip every redundant clue ---------- */
    const rank = TYPE_RANK[opts.flavor];
    const pool = shuffled(candidates, rnd).sort((x, y) => rank[x.type] - rank[y.type] + (rnd() - 0.5) * 0.9);

    const chosen: HpClue[] = [];
    const solved = (clues: HpClue[]) => {
      const s = solveByPropagation({ id: '', n, categories: cats, solution, clues });
      return isFullyDecided(s, n) && stateMatchesSolution({ id: '', n, categories: cats, solution, clues }, s);
    };

    // no budget cap: weak relational clues may pile up before the anchors
    // arrive — the removal pass below strips everything redundant anyway
    for (const cl of pool) {
      if (chosen.length > 0 && solved(chosen)) break;
      chosen.push(cl);
    }
    if (!solved(chosen)) continue;

    for (let i = chosen.length - 1; i >= 0; i--) {
      const trimmed = [...chosen.slice(0, i), ...chosen.slice(i + 1)];
      if (trimmed.length > 0 && solved(trimmed)) chosen.splice(i, 1);
    }

    return {
      id: `hp-${opts.seed}`,
      n,
      categories: cats,
      solution,
      clues: shuffled(chosen, rnd)
    };
  }
  throw new Error(`house-puzzle generation failed for seed ${opts.seed}`);
}

/* ---------- clue text ---------- */

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

function subjectOf(puzzle: HpPuzzle, a: HpAttr): string {
  const cat = puzzle.categories[a.c];
  const item = cat.items[a.i];
  return cat.subject.replace('{item}', item.charAt(0).toUpperCase() + item.slice(1));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function clueText(puzzle: HpPuzzle, cl: HpClue): string {
  const S = (a: HpAttr) => subjectOf(puzzle, a);
  const kind = (a: HpAttr) => puzzle.categories[a.c].kind;
  switch (cl.type) {
    case 'at': {
      const { n } = puzzle;
      const name =
        cl.house === n - 1 ? 'last' : n % 2 === 1 && cl.house === (n - 1) / 2 ? 'middle' : ORDINALS[cl.house];
      return `${cap(S(cl.a))} is in the ${name} house.`;
    }
    case 'ends':
      return `${cap(S(cl.a))} is in one of the end houses.`;
    case 'same': {
      // put the person first: "the Doctor lives in the Green house"
      const [x, y] = kind(cl.a) === 'person' || kind(cl.b) === 'house' ? [cl.a, cl.b] : [cl.b, cl.a];
      if (kind(x) === 'person' && kind(y) === 'house') return `${cap(S(x))} lives in ${S(y)}.`;
      return `${cap(S(x))} is ${S(y)}.`;
    }
    case 'directRight':
      return `${cap(S(cl.a))} is directly to the right of ${S(cl.b)}.`;
    case 'adjacent':
      return `${cap(S(cl.a))} is next to ${S(cl.b)}.`;
    case 'rightOf':
      return `${cap(S(cl.a))} is somewhere to the right of ${S(cl.b)}.`;
    case 'between':
      return `${cap(S(cl.a))} is somewhere between ${S(cl.left)} and ${S(cl.right)}, in that order.`;
  }
}
