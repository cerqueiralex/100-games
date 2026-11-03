/**
 * Mirror Twins — scoring and validity (SCIENCE.md §1.13 "Metrics",
 * "Validity", "Index"). Pure: the outcome is a function of the trial log
 * alone, so validate rescoring a stored log reproduces the metrics.
 *
 * TRIAL LOG — one row per presentation in the scored block, numbers only:
 *   [0] seq       presentation order in the block (0…)
 *   [1] trial     planned trial (0–39) the presentation belongs to
 *   [2] angle     θ in degrees (0, 50, 100, 150)
 *   [3] answer    correct answer: 0 same, 1 mirror
 *   [4] sign      turn direction s (+1 / −1)
 *   [5] response  0 same, 1 mirror, −1 none (timeout or voided)
 *   [6] correct   1 / 0
 *   [7] rt        ms from onset (0.1 ms; 7000 for a timeout; time shown for a voided one)
 *   [8] status    0 answered · 1 timeout (an error at 7000 ms) · 2 anticipation (< 250 ms,
 *                 excluded, trial re-queued) · 3 anticipation again (excluded, trial lost) ·
 *                 4 voided by an interruption (excluded, trial replaced)
 *   [9] phi       reference yaw φ (0.1°)
 *  [10] slot      generation slot (the item is rebuilt from the run seed + slot + condition)
 */
import { median } from '../../../platform/brain/timing';
import type { BrainRescoreInput, BrainRunOutcome } from '../../../platform/brain/types';
import { ANGLES, MAX_ANTICIPATION_FRACTION, MAX_INTERRUPTIONS, MAX_PAUSED_MS, MIN_ACCURACY, SCORED_TRIALS, TIMEOUT_MS } from './protocol';

export const STATUS = { answered: 0, timeout: 1, anticipation: 2, anticipationLost: 3, voided: 4 } as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];

export interface TrialRow {
  seq: number;
  trial: number;
  angle: number;
  answer: 0 | 1;
  sign: number;
  response: -1 | 0 | 1;
  correct: 0 | 1;
  rt: number;
  status: Status;
  phi: number;
  slot: number;
}

export const toLogRow = (r: TrialRow): number[] => [r.seq, r.trial, r.angle, r.answer, r.sign, r.response, r.correct, r.rt, r.status, r.phi, r.slot];

export function fromLogRow(a: readonly number[]): TrialRow {
  return {
    seq: a[0],
    trial: a[1],
    angle: a[2],
    answer: a[3] === 1 ? 1 : 0,
    sign: a[4],
    response: a[5] === 0 || a[5] === 1 ? (a[5] as 0 | 1) : -1,
    correct: a[6] === 1 ? 1 : 0,
    rt: a[7],
    status: a[8] as Status,
    phi: a[9],
    slot: a[10]
  };
}

/** rows that count: answered trials and timeouts (an error at 7000 ms) */
export const isScoredRow = (r: TrialRow) => r.status === STATUS.answered || r.status === STATUS.timeout;

export interface RotationFit {
  /** ms per degree */
  slope: number;
  /** ms at 0° */
  intercept: number;
  /** degrees per second (1000 / slope); NaN when the slope is not positive */
  rate: number;
}

/** OLS through the four per-angle median correct RTs (diagnostic — never an index input) */
export function rotationFit(perAngle: readonly number[]): RotationFit {
  const xs = ANGLES as readonly number[];
  const n = Math.min(xs.length, perAngle.length);
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = perAngle.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (perAngle[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : NaN;
  return { slope, intercept: my - slope * mx, rate: slope > 0 ? 1000 / slope : NaN };
}

/**
 * The 5-session rolling estimate SCIENCE.md allows for the diagnostics:
 * per angle, the median of the last five runs' per-angle medians, then the
 * OLS fit. Pass metrics oldest → newest (valid runs only).
 */
export function rollingRotation(runs: readonly Record<string, number>[], window = 5): RotationFit | null {
  const recent = runs.slice(-window);
  if (recent.length < window) return null;
  const perAngle = ANGLES.map((a) => median(recent.map((m) => m[`rt${a}`]).filter(Number.isFinite)));
  return perAngle.every(Number.isFinite) ? rotationFit(perAngle) : null;
}

export interface ScoreInput {
  rows: readonly TrialRow[];
  /** pauses during the scored block */
  interruptions: number;
  /** total paused time during the scored block, ms */
  pausedMs: number;
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Metrics, validity and highlights of a scored block.
 *  - RCS (primary) = correct ÷ (sum of RTs of all valid trials, in minutes),
 *    where valid = answered + timed out (a timeout is an error at 7000 ms);
 *    anticipations and voided presentations are excluded.
 *  - accuracy = correct ÷ valid trials (%).
 *  - medianRt = median RT of correct trials; ies = medianRt ÷ accuracy.
 *  - rt0…rt150 = median correct RT per angle; an angle with no correct trial
 *    is reported at the 7000 ms ceiling and flagged.
 * Validity, scoring v2 (SCIENCE.md C13 — a slow run is a low score, never an
 * invalid one): invalid below 65 % accuracy on the ANSWERED pairs ('at-
 * chance'), when anticipations exceed 20 % of the 40 planned trials, with no
 * answer at all, or beyond the interruption limits (> 3 pauses or > 60 s
 * paused). Timeouts lower the score and never invalidate it. Quality flags
 * (kept, never invalidating): no positive RT-vs-angle slope, accuracy at 0°
 * under 75 %.
 */
export function scoreRun({ rows, interruptions, pausedMs }: ScoreInput): BrainRunOutcome {
  const scored = rows.filter(isScoredRow);
  const correct = scored.filter((r) => r.correct === 1);
  const sumRt = scored.reduce((s, r) => s + r.rt, 0);
  const anticipations = rows.filter((r) => r.status === STATUS.anticipation || r.status === STATUS.anticipationLost).length;
  const timeouts = rows.filter((r) => r.status === STATUS.timeout).length;

  const metrics: Record<string, number> = {};
  const accuracy = scored.length ? (100 * correct.length) / scored.length : 0;
  metrics.rcs = sumRt > 0 ? (correct.length * 60_000) / sumRt : 0;
  metrics.accuracy = accuracy;
  const medianRt = median(correct.map((r) => r.rt));
  if (Number.isFinite(medianRt)) {
    metrics.medianRt = medianRt;
    if (accuracy > 0) metrics.ies = medianRt / (accuracy / 100);
  }
  const flags: string[] = [];
  const perAngle = ANGLES.map((a) => median(correct.filter((r) => r.angle === a).map((r) => r.rt)));
  let missingAngle = false;
  ANGLES.forEach((a, i) => {
    if (Number.isFinite(perAngle[i])) metrics[`rt${a}`] = perAngle[i];
    else if (correct.length) {
      metrics[`rt${a}`] = TIMEOUT_MS;
      missingAngle = true;
    }
  });

  // validity — each reason once, named by what happened
  let valid = true;
  if (interruptions > MAX_INTERRUPTIONS || pausedMs > MAX_PAUSED_MS) {
    valid = false;
    flags.push('too-many-interruptions');
  }
  if (anticipations > MAX_ANTICIPATION_FRACTION * SCORED_TRIALS) {
    valid = false;
    flags.push('too-fast');
  }
  // C13: guessing is judged on the answers GIVEN — a timeout is a slow pair, not a guess
  const answered = scored.length - timeouts;
  if (answered > 0 && 100 * correct.length < MIN_ACCURACY * answered) {
    valid = false;
    flags.push('at-chance');
  }
  if (!answered) {
    valid = false;
    if (!flags.length) flags.push('too-few');
  }
  // quality flags (annotate, never invalidate) — about the pattern of the answers, so none without one
  if (answered > 0) {
    if (missingAngle) flags.push('no-correct-answer-at-one-angle');
    else if (perAngle.every(Number.isFinite) && !(rotationFit(perAngle).slope > 0)) flags.push('time-did-not-rise-with-angle');
    const atZero = scored.filter((r) => r.angle === 0);
    if (atZero.length && atZero.filter((r) => r.correct === 1).length / atZero.length < 0.75) flags.push('errors-on-unturned-pairs');
  }

  const sec = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
  const highlights: { label: string; value: string }[] = [
    scored.length ? { label: 'Correct', value: `${correct.length} of ${scored.length}` } : { label: 'Pairs scored', value: `0 of ${SCORED_TRIALS}` }
  ];
  if (Number.isFinite(medianRt)) highlights.push({ label: 'Median time (correct)', value: sec(medianRt) });
  if (Number.isFinite(perAngle[0]) && Number.isFinite(perAngle[ANGLES.length - 1]))
    highlights.push({ label: `Time at 0° → ${ANGLES[ANGLES.length - 1]}°`, value: `${sec(perAngle[0])} → ${sec(perAngle[ANGLES.length - 1])}` });
  if (!scored.length) {
    // nothing to score: say what happened instead
    if (anticipations) highlights.push({ label: 'Answers under 0.25 s', value: String(anticipations) });
    if (interruptions) highlights.push({ label: 'Pauses', value: String(interruptions) });
  }

  for (const k of Object.keys(metrics)) metrics[k] = round(metrics[k], 3);
  return {
    metrics,
    trials: scored.length,
    valid,
    ...(flags.length ? { flags } : {}),
    highlights,
    trialLog: rows.map(toLogRow)
  };
}

/**
 * Rescore a stored run under the current rules (scoring v1 → v2) from its
 * trial log — every presentation of the scored block, voided ones included.
 * The pause count is not in the log: a stored 'too-many-interruptions' flag
 * carries it (and keeps the run invalid). The runner never records a
 * class-B run without its log, so a log-less session is left as it is.
 */
export function rescoreRun(stored: BrainRescoreInput): BrainRunOutcome | null {
  const rows = stored.trialLog.filter((r) => r.length >= 11);
  if (!rows.length || rows.length !== stored.trialLog.length) return null;
  const over = stored.flags.includes('too-many-interruptions');
  return scoreRun({ rows: rows.map(fromLogRow), interruptions: over ? MAX_INTERRUPTIONS + 1 : 0, pausedMs: 0 });
}

/** the reference anchor (grade C): RCS 20.4 ± 6 correct/min, derived from Ganis & Kievit (2015) */
export const REF_MEAN = 20.4;
export const REF_SD = 6;
export function referenceZ(metrics: Record<string, number>): number {
  return (metrics.rcs - REF_MEAN) / REF_SD;
}
