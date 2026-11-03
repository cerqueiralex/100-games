import { median, meetsAccuracyFloor, quantile, stopThreshold } from '../../../platform/brain/timing';
import type { BrainRescoreInput, BrainRunOutcome } from '../../../platform/brain/types';
import { PROTOCOL } from './protocol';

/**
 * Symbol Coding — scoring and validity, computed ONLY from the trial log, so
 * a stored run can be rescored exactly when the scoring version changes
 * (SCIENCE.md §0.9). Dependency-free (no DOM, no React).
 *
 * TRIAL LOG — one numeric row per tap (columns in `COL` order):
 *   0 phase     1 practice · 2 digit matching (motor baseline) · 3 coding block · 9 frame summary
 *   1 item      index of the item in its phase's sequence (practice: round × 10 + item)
 *   2 glyph     pool index of the item's glyph (−1 in digit matching)
 *   3 digit     the correct answer, 1–9
 *   4 response  the digit tapped, 1–9
 *   5 tMs       response time from the phase start (first item's onset), ms (0.1 ms)
 *   6 rtMs      response time from this item's onset, ms (0.1 ms)
 *   7 setPos    position of the item in its shuffled set of 9 (0–8)
 *   8 status    0 registered · 1 ignored double tap (< 120 ms after the previous
 *               registered response) · 2 ignored, arrived before the item's onset
 * The single phase-9 row summarises the coding block's frame intervals and
 * names the build that ran it (the spec logs the app version per session):
 *   [9, frames, median ms, p95 ms, max ms, frames over 50 ms, MAJOR, MINOR, PATCH]
 * (a software slowdown once corrupted smartphone SDMT data — Lam et al. 2022).
 */
export const COL = { phase: 0, item: 1, glyph: 2, digit: 3, response: 4, t: 5, rt: 6, setPos: 7, status: 8 } as const;
export const PHASE = { practice: 1, motor: 2, coding: 3, frames: 9 } as const;
export const STATUS = { registered: 0, doubleTap: 1, beforeOnset: 2 } as const;

const r1 = (x: number) => Math.round(x * 10) / 10;

/** one trial-log row, columns in COL order (times rounded to 0.1 ms) */
export function trialRow(
  phase: number,
  item: number,
  glyph: number,
  digit: number,
  response: number,
  tMs: number,
  rtMs: number,
  setPos: number,
  status: number
): number[] {
  return [phase, item, glyph, digit, response, r1(tMs), r1(rtMs), setPos, status];
}

/** the frame-interval summary row of the coding block, stamped with the app version [MAJOR, MINOR, PATCH] */
export function frameRow(deltas: readonly number[], version: readonly number[] = []): number[] {
  const v = [0, 1, 2].map((i) => (Number.isInteger(version[i]) && version[i] >= 0 ? version[i] : 0));
  const d = deltas.filter((x) => Number.isFinite(x) && x > 0);
  if (!d.length) return [PHASE.frames, 0, 0, 0, 0, 0, ...v];
  return [PHASE.frames, d.length, r1(median(d)), r1(quantile(d, 0.95)), r1(Math.max(...d)), d.filter((x) => x > 50).length, ...v];
}

export interface SymbolScore {
  /** raw metrics keyed by the definition's metric ids (only what is computable) */
  metrics: Record<string, number>;
  valid: boolean;
  /** invalidating reasons and quality flags */
  flags: string[];
  /** registered responses in the coding block — the outcome's `trials` */
  responses: number;
  correct: number;
  errors: number;
  /** 0..1 */
  accuracy: number;
  /** correct digit matches in the 15-s motor baseline */
  dm15: number;
  /** ignored taps across both timed phases */
  ignored: number;
  /** the longest stretch without a registered coding response, block onset and lock included */
  longestGapMs: number;
  /** how long a stretch may last before it counts as a stop — scaled to this run's own pace (C13) */
  stopMs: number;
  /** all 200 coding items were used before the 90 s ran out */
  exhausted: boolean;
  /** correct answers per practice round */
  practiceCorrect: number[];
}

/**
 * Score one run from its trial log (SCIENCE.md §1.11 "Metrics", "Exclusions
 * and validity"):
 *  - SDS90 = correct coding responses in the 90-s block (primary);
 *  - errors, accuracy = correct ÷ all registered responses (%);
 *  - DM90 = 6 × correct digit matches in 15 s;
 *  - median time between correct responses (the first measured from the
 *    block onset), ms;
 *  - diagnostics only: coding ratio SDS90 ÷ DM90 (0 when DM90 is 0) and the
 *    learning slope = correct per minute in the last 30 s − the first 30 s.
 * Validity, scoring v2 (SCIENCE.md C13 — a slow run is a low score, never an
 * invalid one): invalid with no answer at all ('too-few'), accuracy below
 * 80 % with more than one wrong ('low-accuracy'), a STOP — a stretch without a
 * response, first onset to the 90-s lock, longer than 4 × the run's own
 * median interval clamped to 10–20 s ('long-gap') — or all 200 items used
 * ('items-exhausted'). No minimum score. Flags (not invalidating): more than
 * 5 ignored double taps, practice still below 8/10 after its repeat, no
 * correct digit match. Ignored taps never count as answers.
 */
export function scoreRun(log: readonly (readonly number[])[]): SymbolScore {
  const coding = log.filter((r) => r[COL.phase] === PHASE.coding && r[COL.status] === STATUS.registered && r[COL.t] < PROTOCOL.blockMs);
  const motor = log.filter((r) => r[COL.phase] === PHASE.motor && r[COL.status] === STATUS.registered && r[COL.t] < PROTOCOL.motorMs);
  const ignored = log.filter(
    (r) => (r[COL.phase] === PHASE.coding || r[COL.phase] === PHASE.motor) && r[COL.status] !== STATUS.registered
  ).length;

  const isRight = (r: readonly number[]) => r[COL.response] === r[COL.digit];
  const times = coding.map((r) => r[COL.t]).sort((a, b) => a - b);
  const correctTimes = coding.filter(isRight).map((r) => r[COL.t]).sort((a, b) => a - b);
  const responses = coding.length;
  const correct = correctTimes.length;
  const errors = responses - correct;
  const accuracy = responses ? correct / responses : 0;
  const exhausted = responses >= PROTOCOL.blockItems;

  // gaps without a registered response: onset → first, between responses, last → lock
  const end = exhausted ? times[times.length - 1] : PROTOCOL.blockMs;
  let longestGapMs = 0;
  let prev = 0;
  for (const t of [...times, end]) {
    longestGapMs = Math.max(longestGapMs, t - prev);
    prev = t;
  }
  // the player's own pace: intervals onset → first response and between responses
  const intervals = times.map((t, i) => t - (i ? times[i - 1] : 0));
  const stopMs = stopThreshold(intervals, PROTOCOL.stopMinMs, PROTOCOL.stopMaxMs, PROTOCOL.stopFactor);

  const gaps = correctTimes.map((t, i) => t - (i ? correctTimes[i - 1] : 0));
  const dm15 = motor.filter(isRight).length;
  const dm90 = PROTOCOL.dmScale * dm15;
  const firstWindow = correctTimes.filter((t) => t < 30_000).length;
  const lastWindow = correctTimes.filter((t) => t >= PROTOCOL.blockMs - 30_000 && t < PROTOCOL.blockMs).length;

  const metrics: Record<string, number> = {
    sds90: correct,
    errors,
    accuracy: Math.round(accuracy * 1000) / 10,
    dm90,
    codingRatio: dm90 > 0 ? Math.round((correct / dm90) * 1000) / 1000 : 0,
    learningSlope: 2 * lastWindow - 2 * firstWindow
  };
  if (gaps.length) metrics.medianGapMs = r1(median(gaps));

  const practiceCorrect: number[] = [];
  for (const r of log) {
    if (r[COL.phase] !== PHASE.practice || r[COL.status] !== STATUS.registered) continue;
    const round = Math.floor(r[COL.item] / PROTOCOL.practiceItems);
    practiceCorrect[round] = (practiceCorrect[round] ?? 0) + (isRight(r) ? 1 : 0);
  }
  for (let i = 0; i < practiceCorrect.length; i++) practiceCorrect[i] = practiceCorrect[i] ?? 0;

  const flags: string[] = [];
  if (!responses) flags.push('too-few');
  else {
    if (!meetsAccuracyFloor(correct, responses, PROTOCOL.minAccuracy)) flags.push('low-accuracy');
    if (longestGapMs > stopMs) flags.push('long-gap');
  }
  if (exhausted) flags.push('items-exhausted');
  const valid = flags.length === 0;
  if (ignored > PROTOCOL.doubleTapFlagOver) flags.push('double-taps');
  if (practiceCorrect.length && practiceCorrect[practiceCorrect.length - 1] < PROTOCOL.practicePass) flags.push('practice-below-criterion');
  if (dm90 === 0) flags.push('no-digit-matches');

  return { metrics, valid, flags, responses, correct, errors, accuracy, dm15, ignored, longestGapMs, stopMs, exhausted, practiceCorrect };
}

/**
 * The run's outcome from its whole trial log — the ONE builder the live run
 * and `rescore` share, so a rescored run is exactly what the same log would
 * score today.
 */
export function outcomeOf(rows: number[][]): BrainRunOutcome {
  const s = scoreRun(rows);
  const m = s.metrics;
  const highlights: { label: string; value: string }[] = [
    { label: 'Accuracy', value: `${Math.round(m.accuracy)}%` },
    { label: 'Number match', value: `${m.dm90} per 90 s` }
  ];
  if (Number.isFinite(m.medianGapMs)) highlights.push({ label: 'Median time per correct symbol', value: `${(m.medianGapMs / 1000).toFixed(2)} s` });
  return {
    metrics: m,
    trials: s.responses,
    valid: s.valid,
    ...(s.flags.length ? { flags: s.flags } : {}),
    highlights,
    trialLog: rows
  };
}

/**
 * Rescore a stored run under the current rules (scoring v1 → v2). The trial
 * log holds everything this test scores, so the outcome is rebuilt from it
 * alone; the runner's own 'interrupted' runs carry no log and are never
 * rescored. Null when the log holds no coding row (nothing to rescore).
 */
export function rescoreRun(stored: BrainRescoreInput): BrainRunOutcome | null {
  if (!stored.trialLog.some((r) => r[COL.phase] === PHASE.coding)) return null;
  return outcomeOf(stored.trialLog);
}
