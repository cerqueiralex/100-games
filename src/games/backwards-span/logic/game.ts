import type { Difficulty } from '../../../platform/types';

/**
 * Backwards Span — pure game logic (no React, headlessly testable).
 *
 * A memory-span test: a sequence of symbols is flashed one at a time, then
 * the player re-enters it. On the gentle tier the order is FORWARD; the
 * higher tiers ask for it in REVERSE — the classic backwards digit span.
 */

export type SpanMode = 'forward' | 'reverse';
export type CharSet = 'digits' | 'letters' | 'mixed';

export interface Config {
  /** whether the player re-enters the sequence forwards or reversed */
  mode: SpanMode;
  /** which symbol pool the sequence is drawn from */
  charset: CharSet;
  /** span (sequence length) of the very first round */
  startSpan: number;
  /** milliseconds each symbol is shown during presentation */
  flashMs: number;
  /** how many mistakes the player can survive */
  lives: number;
  /** reaching this span wins the run */
  targetSpan: number;
  /** score multiplier for the tier (1–5) */
  mult: number;
}

export const CONFIG: Record<Difficulty, Config> = {
  easy: { mode: 'forward', charset: 'digits', startSpan: 3, flashMs: 900, lives: 4, targetSpan: 7, mult: 1 },
  medium: { mode: 'reverse', charset: 'digits', startSpan: 3, flashMs: 800, lives: 3, targetSpan: 7, mult: 2 },
  hard: { mode: 'reverse', charset: 'digits', startSpan: 4, flashMs: 700, lives: 3, targetSpan: 8, mult: 3 },
  pro: { mode: 'reverse', charset: 'letters', startSpan: 4, flashMs: 650, lives: 2, targetSpan: 8, mult: 4 },
  extreme: { mode: 'reverse', charset: 'mixed', startSpan: 5, flashMs: 550, lives: 2, targetSpan: 9, mult: 5 }
};

/**
 * Symbol pools. Confusable characters are deliberately excluded — no letters
 * I/O (mistaken for digits 1/0), so every symbol on the pad is unambiguous.
 */
export const POOLS: Record<CharSet, string[]> = {
  digits: '0123456789'.split(''),
  letters: 'ABCDEFGHJKLMNPQRSTUV'.split(''), // 20 letters, no I/O
  mixed: '0123456789ABCDEFGH'.split('') // 18 alphanumeric symbols, no I/O
};

export function charPool(charset: CharSet): string[] {
  return POOLS[charset];
}

export type RNG = () => number;

/** Deterministic RNG for tests (mulberry32). */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a fresh sequence of `span` symbols from the tier's pool. Consecutive
 * duplicates are avoided so each flash is visibly distinct from the last
 * (a repeated symbol elsewhere in the sequence is fine and expected).
 */
export function makeSequence(cfg: Config, rng: RNG = Math.random, span: number = cfg.startSpan): string[] {
  const pool = charPool(cfg.charset);
  const seq: string[] = [];
  for (let i = 0; i < span; i++) {
    let c = pool[Math.floor(rng() * pool.length)];
    // re-draw to avoid an immediate repeat (pool always has >1 symbol)
    while (i > 0 && c === seq[i - 1]) c = pool[Math.floor(rng() * pool.length)];
    seq.push(c);
  }
  return seq;
}

/**
 * The answer the player must enter: the sequence as-shown for forward mode,
 * or reversed for the backwards-span tiers.
 */
export function expectedAnswer(seq: string[], mode: SpanMode): string[] {
  return mode === 'reverse' ? [...seq].reverse() : [...seq];
}

/** True when `answer` matches the expected answer exactly (full length + order). */
export function isCorrect(seq: string[], answer: string[], mode: SpanMode): boolean {
  const want = expectedAnswer(seq, mode);
  return answer.length === want.length && want.every((c, i) => c === answer[i]);
}
