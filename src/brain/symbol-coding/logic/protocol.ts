import { rng, shuffle } from '../../../platform/brain/timing';
import { GLYPHS, confusable } from './glyphs';

/**
 * Symbol Coding — the fixed protocol (SCIENCE.md §1.11) and the seeded
 * session generator. Every item a player sees derives from the run's seed
 * through rng() (C8), so validate can replay any run exactly and every
 * session is a fresh alternate form. Dependency-free (no DOM, no React).
 */
export const PROTOCOL = {
  /** glyphs per key — digits 1..9 */
  keySize: 9,
  /** first-run guided items (tutorial, retried until correct; not logged) */
  tutorialItems: 3,
  /** per-session practice, every run (Appendix C.7) */
  practiceItems: 10,
  /** practice criterion: at least 8/10 correct, otherwise one repeat */
  practicePass: 8,
  practiceRounds: 2,
  /** practice feedback: green/red for 250 ms */
  practiceFeedbackMs: 250,
  /** a wrong practice answer keeps the correct key cell lit this long [DC] */
  practiceCorrectiveMs: 700,
  /** motor baseline (digit matching) — 15.0 s, key strip hidden */
  motorMs: 15_000,
  /** pre-generated digit-matching items: the 120 ms double-tap rule caps a 15-s phase at 125 responses */
  motorItems: 126,
  /** DM90 = 6 × correct digit matches in 15 s */
  dmScale: 6,
  /** the scored coding block — 90.0 s */
  blockMs: 90_000,
  /** pre-generated coding items, above the highest healthy score (92.4 per 90 s) */
  blockItems: 200,
  /** responses sooner than this after the previous registered one are ignored double taps */
  doubleTapMs: 120,
  /** more ignored double taps than this flags the session */
  doubleTapFlagOver: 5,
  /** validity: at least 20 correct (the MS sherpa outlier rule) … */
  minCorrect: 20,
  /** … accuracy at least 80% [DC] … */
  minAccuracy: 0.8,
  /** … and no gap between responses longer than 5 s [DC] */
  maxGapMs: 5_000
} as const;

/** one session's alternate form — every list holds DIGITS 1..9; glyph = key[digit − 1] */
export interface SymbolSession {
  seed: number;
  /** pool indices of the scored key: testKey[d − 1] is the glyph coded by digit d */
  testKey: number[];
  /** nine DIFFERENT pool glyphs for the practice (and tutorial) key */
  practiceKey: number[];
  /** first-run guided items, on the practice key */
  tutorial: number[];
  /** practice rounds (the second runs only if the first falls below criterion) */
  practice: number[][];
  /** digit-matching items for the motor baseline */
  motor: number[];
  /** the 200 coding items of the scored block */
  block: number[];
}

/**
 * Back-to-back shuffled sets of the digits 1..size — every set shows each
 * digit once — with no immediate repeat across set boundaries (a set whose
 * first digit equals the previous set's last is redrawn). `n` items, the
 * last set possibly partial.
 */
export function setSequence(r: () => number, n: number, size = 9): number[] {
  const digits = Array.from({ length: size }, (_, i) => i + 1);
  const out: number[] = [];
  while (out.length < n) {
    let set = shuffle(r, digits);
    const last = out[out.length - 1];
    while (set[0] === last) set = shuffle(r, digits);
    out.push(...set);
  }
  return out.slice(0, n);
}

/**
 * The whole alternate form of one run, from its seed alone: 9 test glyphs
 * and 9 different practice glyphs drawn from the pool in a seeded order. A
 * glyph is skipped when it is confusable with one already in the key it
 * would join — a rotation or mirror image, or a near-copy under one
 * (`confusable`, glyphs.ts) — so every key is a matched form. Each
 * confusable pair can cost at most one skip, and validate proves the pool
 * holds at most GLYPHS.length − 18 of them, so both keys always fill (the
 * fallback below is unreachable with the shipped pool). The draw order is the
 * key order, so the glyph → digit mapping is random too. Then the item
 * sequences. The order of draws is fixed: a seed always yields the identical
 * session.
 */
export function generateSession(seed: number): SymbolSession {
  const r = rng(seed);
  const order = shuffle(r, GLYPHS.map((_, i) => i));
  const testKey: number[] = [];
  const practiceKey: number[] = [];
  for (const g of order) {
    const key = testKey.length < PROTOCOL.keySize ? testKey : practiceKey;
    if (key.some((h) => confusable(g, h))) continue;
    key.push(g);
    if (practiceKey.length === PROTOCOL.keySize) break;
  }
  for (const g of order) {
    if (practiceKey.length === PROTOCOL.keySize) break;
    if (testKey.includes(g) || practiceKey.includes(g)) continue;
    (testKey.length < PROTOCOL.keySize ? testKey : practiceKey).push(g);
  }
  const tutorial = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, PROTOCOL.tutorialItems);
  const practice = Array.from({ length: PROTOCOL.practiceRounds }, () => setSequence(r, PROTOCOL.practiceItems));
  const motor = setSequence(r, PROTOCOL.motorItems);
  const block = setSequence(r, PROTOCOL.blockItems);
  return { seed: seed >>> 0, testKey, practiceKey, tutorial, practice, motor, block };
}
