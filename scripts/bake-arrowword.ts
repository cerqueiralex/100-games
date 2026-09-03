/**
 * Arrow Crossword grid builder — the offline half of the puzzle bank.
 *
 *   npx tsx scripts/bake-arrowword.ts <tier> [count=3] [seed=1] [attempts=150] [budget=40000] [ban=A,B] [used=C,D]
 *
 * Lays out arrowword GRIDS for one tier (the clues are written by hand
 * afterwards, into CLUES in src/games/arrow-crossword/logic/puzzles.ts).
 * Prints the best `count` grids by score with their entries as the
 * `[answer, row, col, dir]` tuples the bank stores, ready to paste.
 *
 * How it builds: row 0 and column 0 are clue cells (an answer needs its clue
 * one step before its first letter, so the top and left edges can only hold
 * clues). Rows are filled top-down as a sequence of clue cells, words of 3+
 * letters and single letters that only extend a vertical word; every letter
 * placed must keep its column a feasible prefix of an unused dictionary
 * word that can still finish inside the grid, and a vertical run is closed
 * only when it IS a word (or a single, unchecked letter, within a quota).
 * The dictionary is the app's own word banks (Word Wheel, Anagram Sprint,
 * Word Ladder, Word Guess, Hangman, Word Search, Letter Hunt), weighted
 * toward base-form nouns and away from inflections. Every result is proven
 * by the game's real `validateArrowPuzzle`, and scored by density, stagger
 * (words not all starting at the edge), shared clue cells and few unchecked
 * letters. `ban` drops words you would rather not clue; `used` down-weights
 * words already in other puzzles so the bank stays varied.
 *
 * Tier sizes here must match `ARROW_SIZE` in scripts/validate.ts.
 */
import {
  buildArrowPuzzle,
  validateArrowPuzzle,
  uncheckedLetters,
  enclosedHoles,
  type ArrowEntry
} from '../src/games/arrow-crossword/logic/engine';
import { HUNT_WORDS } from '../src/games/letter-hunt/logic/words';
import { WORD_BANK as WHEEL_WORDS } from '../src/games/word-wheel/logic/wordbank';
import { WORD_BANK as ANAGRAM_WORDS } from '../src/games/anagram-sprint/logic/words';
import { WORDS3, WORDS4, WORDS5 } from '../src/games/word-ladder/logic/words';
import { ANSWERS_4, ANSWERS_5, ANSWERS_6, ANSWERS_7 } from '../src/games/word-guess/logic/words';
import { CATEGORIES } from '../src/games/hangman/logic/words';
import { THEMES } from '../src/games/word-search/logic/themes';

declare const process: { argv: string[] };

const TIERS: Record<string, { cols: number; rows: number; maxLen: number; unchecked: number }> = {
  easy: { cols: 6, rows: 7, maxLen: 5, unchecked: 3 },
  medium: { cols: 7, rows: 8, maxLen: 6, unchecked: 4 },
  hard: { cols: 8, rows: 10, maxLen: 7, unchecked: 6 },
  pro: { cols: 9, rows: 12, maxLen: 8, unchecked: 8 },
  extreme: { cols: 10, rows: 13, maxLen: 9, unchecked: 10 }
};

/* ---------- dictionary ---------- */

interface Dict {
  byLen: Map<number, string[]>;
  set: Set<string>;
  prefixLens: Map<string, number[]>;
  weight: Map<string, number>;
}

function makeDict(banned: Set<string>, usedElsewhere: Set<string>): Dict {
  const curated = new Set<string>();
  const add = (w: string) => {
    w = w.toUpperCase();
    if (/^[A-Z]{3,9}$/.test(w)) curated.add(w);
  };
  WHEEL_WORDS.forEach(add);
  Object.values(ANAGRAM_WORDS).flat().forEach(add);
  [...WORDS3, ...WORDS4, ...WORDS5].forEach(add);
  [...ANSWERS_4, ...ANSWERS_5, ...ANSWERS_6, ...ANSWERS_7].forEach(add);
  CATEGORIES.forEach((c) => [...c.common, ...c.tricky].forEach(add));
  THEMES.forEach((t) => t.words.forEach(add));
  const secondary = new Set<string>();
  for (const w of HUNT_WORDS) if (w.length >= 4 && !curated.has(w)) secondary.add(w);
  const all = new Set<string>([...curated, ...secondary]);
  const nouns = new Set<string>();
  CATEGORIES.forEach((c) => [...c.common, ...c.tricky].forEach((w) => nouns.add(w)));
  THEMES.forEach((t) => t.words.forEach((w) => nouns.add(w)));
  const inflected = (w: string) => {
    const stem = (n: number) => w.slice(0, -n);
    if (w.endsWith('ING') && (all.has(stem(3)) || all.has(stem(3) + 'E'))) return 0.05;
    if (w.endsWith('ED') && (all.has(stem(2)) || all.has(stem(1)))) return 0.05;
    if (w.endsWith('EST') && all.has(stem(3))) return 0.05;
    if (w.endsWith('ER') && all.has(stem(2))) return 0.35;
    if (w.endsWith('LY') && all.has(stem(2))) return 0.2;
    if (w.endsWith('IES') && all.has(stem(3) + 'Y')) return 0.2;
    if (w.endsWith('ES') && all.has(stem(2))) return 0.2;
    if (w.endsWith('S') && !w.endsWith('SS') && all.has(stem(1))) return 0.2;
    return 1;
  };
  const weight = new Map<string, number>();
  for (const w of curated) if (!banned.has(w)) weight.set(w, (nouns.has(w) ? 1.6 : 1) * inflected(w));
  for (const w of secondary) if (!banned.has(w) && !weight.has(w)) weight.set(w, 0.3 * inflected(w));
  for (const w of usedElsewhere) if (weight.has(w)) weight.set(w, weight.get(w)! * 0.08);
  const words = [...weight.keys()];
  const byLen = new Map<number, string[]>();
  for (const w of words) (byLen.get(w.length) ?? byLen.set(w.length, []).get(w.length)!).push(w);
  const prefixLens = new Map<string, number[]>();
  for (const w of words) {
    for (let i = 1; i <= w.length; i++) {
      const p = w.slice(0, i);
      const arr = prefixLens.get(p) ?? prefixLens.set(p, []).get(p)!;
      if (!arr.includes(w.length)) arr.push(w.length);
    }
  }
  return { byLen, set: new Set(words), prefixLens, weight };
}

/* ---------- seeded rng ---------- */

let seed = 1;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function shuffleWeighted<T>(arr: T[], w: (x: T) => number): T[] {
  return arr
    .map((x) => ({ x, k: Math.pow(rnd(), 1 / Math.max(0.001, w(x))) }))
    .sort((a, b) => b.k - a.k)
    .map((o) => o.x);
}

/* ---------- one attempt ---------- */

interface Result {
  entries: ArrowEntry[];
  grid: string[];
  unchecked: number;
  holes: number;
  letters: number;
}

function attempt(tier: string, D: Dict, nodeBudget: number): Result | null {
  const { cols: C, rows: R, maxLen, unchecked: UNCHECKED_MAX } = TIERS[tier];
  const cell: string[][] = Array.from({ length: R }, () => new Array<string>(C).fill(''));
  const hcheck: boolean[][] = Array.from({ length: R }, () => new Array<boolean>(C).fill(false));
  for (let c = 0; c < C; c++) cell[0][c] = '#';
  for (let r = 0; r < R; r++) cell[r][0] = '#';
  const used = new Set<string>();
  const entries: ArrowEntry[] = [];
  let unchecked = 0;
  let nodes = 0;

  /** the vertical run ending just above (r, c) */
  const vprefixAt = (r: number, c: number) => {
    let s = '';
    let rr = r - 1;
    while (rr >= 0 && cell[rr][c] !== '#' && cell[rr][c] !== '') {
      s = cell[rr][c] + s;
      rr--;
    }
    return s;
  };
  /** can prefix p (whose last letter sits on row r) still finish in the grid? */
  const feasiblePrefix = (p: string, r: number) => {
    const lens = D.prefixLens.get(p);
    if (!lens) return false;
    const remaining = R - 1 - r;
    return lens.some((L) => L - p.length <= remaining);
  };
  /** (r, c) is not a letter: the run above must close as a word, or as one unchecked letter */
  const closeRun = (r: number, c: number, commit: (fn: () => void) => void): boolean => {
    const p = vprefixAt(r, c);
    if (p.length === 0) return true;
    if (p.length === 1) {
      if (!hcheck[r - 1][c]) return false;
      if (unchecked + 1 > UNCHECKED_MAX) return false;
      unchecked++;
      commit(() => {
        unchecked--;
      });
      return true;
    }
    if (p.length === 2) return false;
    if (!D.set.has(p) || used.has(p)) return false;
    used.add(p);
    entries.push({ answer: p, clue: '', row: r - p.length, col: c, dir: 'down' });
    commit(() => {
      used.delete(p);
      entries.pop();
    });
    return true;
  };

  const finish = (): boolean => {
    let lastRowLetters = 0;
    for (let c = 1; c < C; c++) if (cell[R - 1][c] !== '#' && cell[R - 1][c] !== '') lastRowLetters++;
    if (lastRowLetters < Math.ceil((C - 1) * 0.4)) return false;
    const undo: (() => void)[] = [];
    for (let c = 1; c < C; c++) {
      if (!closeRun(R, c, (fn) => undo.push(fn))) {
        while (undo.length) undo.pop()!();
        return false;
      }
    }
    return true;
  };

  const fillRow = (r: number, c: number): boolean => {
    if (++nodes > nodeBudget) return false;
    if (c >= C) return r === R - 1 ? finish() : fillRow(r + 1, 1);
    const vp = vprefixAt(r, c);
    const options: (() => boolean)[] = [];

    // a clue cell (or blank)
    options.push(() => {
      const undo: (() => void)[] = [];
      if (!closeRun(r, c, (fn) => undo.push(fn))) return false;
      cell[r][c] = '#';
      if (fillRow(r, c + 1)) return true;
      cell[r][c] = '';
      while (undo.length) undo.pop()!();
      return false;
    });

    // a word of n letters
    const lens: number[] = [];
    for (let n = 3; n <= Math.min(maxLen, C - c); n++) lens.push(n);
    for (const n of shuffleWeighted(lens, (x) => 1 + x * 0.35)) {
      options.push(() => {
        const endC = c + n;
        const vps: string[] = [];
        for (let i = 0; i < n; i++) vps.push(i === 0 ? vp : vprefixAt(r, c + i));
        // a vertical run that starts this low can only end as an unchecked letter
        let lateStarts = 0;
        for (let i = 0; i < n; i++) if (vps[i].length === 0 && r >= R - 2) lateStarts++;
        if (unchecked + lateStarts > UNCHECKED_MAX) return false;
        const cands = (D.byLen.get(n) ?? []).filter((w) => {
          if (used.has(w)) return false;
          for (let i = 0; i < n; i++) {
            if (vps[i].length > 0 && !feasiblePrefix(vps[i] + w[i], r)) return false;
          }
          return true;
        });
        for (const w of shuffleWeighted(cands, (x) => D.weight.get(x) ?? 0.3).slice(0, 14)) {
          if (++nodes > nodeBudget) return false;
          if (endC < C && cell[r][endC] !== '' && cell[r][endC] !== '#') continue;
          for (let i = 0; i < n; i++) {
            cell[r][c + i] = w[i];
            hcheck[r][c + i] = true;
          }
          used.add(w);
          entries.push({ answer: w, clue: '', row: r, col: c, dir: 'right' });
          const termUndo: (() => void)[] = [];
          let okTerm = true;
          if (endC < C) {
            if (!closeRun(r, endC, (fn) => termUndo.push(fn))) okTerm = false;
            else cell[r][endC] = '#';
          }
          if (okTerm && fillRow(r, endC + 1)) return true;
          if (endC < C) {
            cell[r][endC] = '';
            while (termUndo.length) termUndo.pop()!();
          }
          entries.pop();
          used.delete(w);
          for (let i = 0; i < n; i++) {
            cell[r][c + i] = '';
            hcheck[r][c + i] = false;
          }
        }
        return false;
      });
    }

    // a single letter that only extends the vertical word above it
    if (vp.length >= 1) {
      options.push(() => {
        if (c + 1 < C && cell[r][c + 1] !== '' && cell[r][c + 1] !== '#') return false;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((x) => feasiblePrefix(vp + x, r));
        for (const x of shuffleWeighted(letters, () => 1).slice(0, 6)) {
          if (++nodes > nodeBudget) return false;
          if (unchecked + 1 > UNCHECKED_MAX) return false;
          cell[r][c] = x;
          unchecked++;
          const termUndo: (() => void)[] = [];
          let okTerm = true;
          if (c + 1 < C) {
            if (!closeRun(r, c + 1, (fn) => termUndo.push(fn))) okTerm = false;
            else cell[r][c + 1] = '#';
          }
          if (okTerm && fillRow(r, c + 2)) return true;
          if (c + 1 < C) {
            cell[r][c + 1] = '';
            while (termUndo.length) termUndo.pop()!();
          }
          unchecked--;
          cell[r][c] = '';
        }
        return false;
      });
    }

    const order = shuffleWeighted(
      options.map((f, i) => ({ f, i })),
      (o) => (o.i === 0 ? 0.8 : 1)
    );
    for (const o of order) if (o.f()) return true;
    return false;
  };

  if (!fillRow(1, 1)) return null;
  const def = { id: 'bake', title: 'bake', entries: entries.map((e) => ({ ...e, clue: 'x' })) };
  const errs = validateArrowPuzzle(def);
  if (errs.length) {
    console.error('engine rejected a built grid — builder bug:', errs);
    return null;
  }
  const built = buildArrowPuzzle(def);
  const grid: string[] = [];
  for (let r = 0; r < built.rows; r++) {
    let line = '';
    for (let c = 0; c < built.cols; c++) {
      const cl = built.grid[r * built.cols + c];
      line += cl.kind === 'letter' ? cl.letter : cl.kind === 'clue' ? (cl.right && cl.down ? '┼' : cl.right ? '→' : '↓') : '·';
    }
    grid.push(line);
  }
  return { entries, grid, unchecked: uncheckedLetters(built), holes: enclosedHoles(built), letters: built.letterCount };
}

/* ---------- main ---------- */

const [tier = 'easy', countArg = '3', seedArg = '1', attemptsArg = '150', budgetArg = '40000', banArg = '', usedArg = ''] =
  process.argv.slice(2);
if (!TIERS[tier]) throw new Error(`unknown tier ${tier}`);
const want = Number(countArg);
const seedStart = Number(seedArg);
const attempts = Number(attemptsArg);
const budget = Number(budgetArg);
const list = (s: string) => new Set(s.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean));
const D = makeDict(list(banArg), list(usedArg));
const { cols, rows } = TIERS[tier];

const results: (Result & { seed: number; score: number })[] = [];
const t0 = Date.now();
for (let i = 0; i < attempts; i++) {
  seed = seedStart + i;
  const res = attempt(tier, D, budget);
  if (!res || res.holes > 0) continue;
  const rights = res.entries.filter((e) => e.dir === 'right');
  const downs = res.entries.filter((e) => e.dir === 'down');
  const col1 = rights.filter((e) => e.col === 1).length / Math.max(1, rights.length);
  const row1 = downs.filter((e) => e.row === 1).length / Math.max(1, downs.length);
  const shared = res.grid.join('').split('┼').length - 1;
  const density = res.letters / (cols * rows);
  const score = density * 100 - res.unchecked * 3 - col1 * 15 - row1 * 15 + shared * 1.5;
  results.push({ ...res, seed: seedStart + i, score });
}
results.sort((a, b) => b.score - a.score);
console.error(`${results.length} grids from ${attempts} attempts in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const res of results.slice(0, want)) {
  console.log(
    `\n# ${tier} seed=${res.seed} score=${res.score.toFixed(1)} letters=${res.letters} density=${(res.letters / (cols * rows)).toFixed(2)} words=${res.entries.length} unchecked=${res.unchecked}`
  );
  console.log(res.grid.map((l) => `      // ${l}`).join('\n'));
  const sorted = [...res.entries].sort((a, b) => a.row - b.row || a.col - b.col || a.dir.localeCompare(b.dir));
  console.log('      entries: [');
  console.log(sorted.map((e) => `        ['${e.answer}', ${e.row}, ${e.col}, '${e.dir}']`).join(',\n'));
  console.log('      ]');
  console.log('words:', sorted.map((e) => e.answer).join(' '));
}
