import { median, meetsAccuracyFloor, stopThreshold } from '../../../platform/brain/timing';
import type { BrainRescoreInput, BrainRunOutcome } from '../../../platform/brain/types';
import { classCode, classOf, OPS, type Op, type Problem } from './items';
import { BLOCK_MINUTES, BLOCK_MS, FAST_MS, MIN_ACCURACY_PCT, STOP_FACTOR, STOP_MAX_MS, STOP_MIN_MS } from './protocol';

/**
 * Arithmetic Sprint scoring (SCIENCE.md §1.7 "Metrics", "Validity"). Pure —
 * the component hands it the submission log, validate hands it scripted runs.
 *
 *  - C = correct submissions, N = all submissions, accuracy = C / N.
 *  - PRIMARY: CPM = C / 2.0 (correct per minute of the 120-s block). Never
 *    replaced by an RCS / IES / LISAS composite (Vandierendonck 2017;
 *    Liesefeld & Janczyk 2019).
 *  - Per-operation rate = that operation's correct items ÷ the sum of its
 *    submit RTs, in minutes. Like CPM it counts every submission.
 *  - RT diagnostics (this session): median submit RT and median first-digit
 *    latency over CORRECT submissions, minus the ones under 400 ms (flagged
 *    in the log, dropped from RT statistics). Cross-session pooling (last 7
 *    valid sessions, per operation × complexity) is the analytics layer's
 *    job — it reads the trial log.
 *  - The item on screen at time-out never reaches this log: discarded, not an
 *    error.
 */

export interface Submission {
  /** position of the item in the session's pre-generated sequence (0-based) */
  order: number;
  item: Problem;
  /** the submitted answer, read as a number */
  typed: number;
  /** ms from the item's onset to its first digit key */
  firstDigitMs: number;
  /** ms from the item's onset to ✓ (submit RT) */
  rtMs: number;
  /** ⌫ presses that removed a digit */
  edits: number;
  /** the item's onset, ms after the block's first onset */
  onsetMs: number;
}

/**
 * The compact trial log — one row per SUBMISSION (store.ts keeps only rows
 * whose every cell is finite, ≤ 12 columns):
 *
 *   0 order       item position in the session's sequence (0-based)
 *   1 class       0 add-simple · 1 add-complex · 2 sub-simple · 3 sub-complex ·
 *                 4 mul-simple · 5 mul-complex · 6 div-simple · 7 div-complex
 *   2 a           left operand as shown ("a op b =")
 *   3 b           right operand as shown
 *   4 typed       the submitted answer
 *   5 correct     1 / 0
 *   6 firstDigit  ms, onset → first digit key
 *   7 rt          ms, onset → ✓
 *   8 edits       ⌫ presses that removed a digit
 *   9 high        1 when the answer is above the class's median (problem size)
 *  10 onset       ms after the block's first onset
 *  11 fast        1 when rt < 400 ms — flagged, dropped from RT statistics
 */
export const TRIAL_COLUMNS = ['order', 'class', 'a', 'b', 'typed', 'correct', 'firstDigit', 'rt', 'edits', 'high', 'onset', 'fast'] as const;

export function isCorrect(s: Pick<Submission, 'typed' | 'item'>): boolean {
  return s.typed === s.item.answer;
}

export function trialRow(s: Submission): number[] {
  return [
    s.order,
    classCode(s.item.op, s.item.complex),
    s.item.a,
    s.item.b,
    s.typed,
    isCorrect(s) ? 1 : 0,
    Math.round(s.firstDigitMs),
    Math.round(s.rtMs),
    s.edits,
    s.item.high ? 1 : 0,
    Math.round(s.onsetMs),
    s.rtMs < FAST_MS ? 1 : 0
  ];
}

/** the longest stretch without a submission (block onset → first, between, last → the 120-s lock) and the stop threshold at this run's own pace */
export function stretches(subs: readonly Pick<Submission, 'onsetMs' | 'rtMs'>[], exhausted = false): { longestMs: number; stopMs: number } {
  const times = subs.map((s) => s.onsetMs + s.rtMs).sort((a, b) => a - b);
  const end = exhausted && times.length ? times[times.length - 1] : BLOCK_MS;
  let longestMs = 0;
  let prev = 0;
  for (const t of [...times, end]) {
    longestMs = Math.max(longestMs, t - prev);
    prev = t;
  }
  const intervals = times.map((t, i) => t - (i ? times[i - 1] : 0));
  return { longestMs, stopMs: stopThreshold(intervals, STOP_MIN_MS, STOP_MAX_MS, STOP_FACTOR) };
}

/**
 * Validity reasons, scoring v2 (flag ids shared with ui/copy.ts flagCopy) —
 * empty = valid. SCIENCE.md C13: a slow run is a low CPM, never an invalid
 * one, so there is no minimum number of answers.
 *  - 'too-few': no answer at all — nothing to score;
 *  - 'rushed': accuracy below 85%, a single wrong answer alone excepted;
 *  - 'long-gap': a stop — no submission for longer than 4 × the run's own
 *    median interval, held between 30 and 60 s;
 *  - 'too-fast' (`exhausted`): the run got through all 120 pre-generated
 *    items before the 120 s were up — at least one answer a second, faster
 *    than this task can be done honestly — so the block ended early and is
 *    not a 2-minute measurement.
 */
export function validityFlags(subs: readonly Submission[], exhausted = false): string[] {
  const flags: string[] = [];
  const n = subs.length;
  if (!n) flags.push('too-few');
  else {
    if (!meetsAccuracyFloor(subs.filter(isCorrect).length, n, MIN_ACCURACY_PCT / 100)) flags.push('rushed');
    const { longestMs, stopMs } = stretches(subs, exhausted);
    if (longestMs > stopMs) flags.push('long-gap');
  }
  if (exhausted) flags.push('too-fast');
  return flags;
}

export const RATE_METRIC: Record<Op, string> = { add: 'addRate', sub: 'subRate', mul: 'mulRate', div: 'divRate' };

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** the run's outcome from its submission log (chronological) */
export function scoreRun(subs: readonly Submission[], opts: { exhausted?: boolean } = {}): BrainRunOutcome {
  const n = subs.length;
  const right = subs.filter(isCorrect);
  const c = right.length;

  const metrics: Record<string, number> = { cpm: c / BLOCK_MINUTES };
  if (n > 0) metrics.accuracy = (100 * c) / n;

  // RT statistics: correct submissions, without the implausibly fast ones
  // (a valid run always has some; the fallback only keeps a scripted or
  // robotic all-fast log finite)
  const timed = right.filter((s) => s.rtMs >= FAST_MS);
  const rtPool = timed.length ? timed : right;
  if (rtPool.length) {
    metrics.rtCorrect = median(rtPool.map((s) => s.rtMs)) / 1000;
    metrics.firstDigit = median(rtPool.map((s) => s.firstDigitMs)) / 1000;
  }

  for (const op of OPS) {
    const mine = subs.filter((s) => s.item.op === op);
    const minutes = sum(mine.map((s) => s.rtMs)) / 60_000;
    if (mine.length && minutes > 0) metrics[RATE_METRIC[op]] = mine.filter(isCorrect).length / minutes;
  }

  const flags = validityFlags(subs, opts.exhausted);
  // the results card already lists every metric (time per correct answer included) — highlights are extra lines
  const highlights: { label: string; value: string }[] = [{ label: 'Answers', value: `${c} correct of ${n}` }];

  return {
    metrics,
    trials: n,
    valid: flags.length === 0,
    ...(flags.length ? { flags } : {}),
    highlights,
    trialLog: subs.map(trialRow)
  };
}

/** the answer of a logged item, from its class and its operands in display order */
function answerOf(op: Op, a: number, b: number): number {
  return op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
}

/**
 * Rebuild the submissions from a stored trial log (TRIAL_COLUMNS). Null when
 * a row is malformed or its recomputed answer disagrees with the logged
 * `correct` column — a log that cannot reproduce itself is never rescored.
 */
export function submissionsFromLog(log: readonly (readonly number[])[]): Submission[] | null {
  const out: Submission[] = [];
  for (const row of log) {
    if (row.length < TRIAL_COLUMNS.length || !row.every(Number.isFinite)) return null;
    const [order, cls, a, b, typed, correct, firstDigit, rt, edits, high, onset] = row;
    if (!Number.isInteger(cls) || cls < 0 || cls > 7) return null;
    const { op, complex } = classOf(cls);
    const answer = answerOf(op, a, b);
    if ((typed === answer) !== (correct === 1)) return null;
    out.push({
      order,
      item: { op, complex, a, b, answer, high: high === 1, key: '' },
      typed,
      firstDigitMs: firstDigit,
      rtMs: rt,
      edits,
      onsetMs: onset
    });
  }
  return out;
}

/**
 * Rescore a stored run under the current rules (scoring v1 → v2), from its
 * trial log. Whether the item pool ran out is not in the log — the stored
 * 'too-fast' flag carries it. The runner's own 'interrupted' runs carry no
 * log and are never rescored.
 */
export function rescoreRun(stored: BrainRescoreInput): BrainRunOutcome | null {
  const subs = submissionsFromLog(stored.trialLog);
  if (!subs) return null;
  return scoreRun(subs, { exhausted: stored.flags.includes('too-fast') });
}
