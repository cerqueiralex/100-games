import type { BrainRescoreInput, BrainRunOutcome } from '../../../platform/brain/types';
import { median } from '../../../platform/brain/timing';
import { popcount } from './model';
import { CLASSES, bOf, eap, type IrtResponse } from './irt';

/**
 * The protocol as numbers (SCIENCE.md §1.8 "Protocol", "Stop rule",
 * "Exclusions") plus the scoring of a finished trial log. Pure — the
 * component drives exactly these constants and hands its log to `scoreRun`,
 * and the check replays scripted logs through the same function.
 */
export const PROTOCOL = {
  /** blank before every item (MaRs-IB) */
  blankMs: 500,
  /** response window from onset; a timeout scores as incorrect */
  windowMs: 30_000,
  /** the 5-s countdown ring appears only after 25 s (MaRs-IB) */
  ringFromMs: 25_000,
  scoredItems: 12,
  /** session cap on ACTIVE time (paused time excluded [DC]); the current item finishes */
  capMs: 240_000,
  /**
   * Scoring v2 (SCIENCE.md C13 — a slow run is a low score, never an invalid
   * one): a run the 240-s cap cuts short is scored from the items it
   * answered; θ's SE (shown as ± index points) carries the lower precision.
   * v1 required 9 valid items, but at the slowest pace the 30-s window allows
   * the cap completes only 8, so it discarded every slow, careful reasoner.
   * Only a run with no valid item has nothing to score ('too-few-items') [DC].
   */
  minValidItems: 1,
  /** a response under 1.5 s is a rapid guess: excluded from θ [DC] */
  rapidMs: 1_500,
  /** 3 or more rapid guesses → invalid, "careless" [DC] */
  carelessAt: 3,
  /** interrupted items are voided and replaced from the same class; a 4th interruption invalidates the run [DC] */
  maxVoids: 3,
  /** the per-session warm-up item is class D2 */
  warmupClass: 2,
  /** first run: practice with feedback until 3 are correct (MaRs-IB criterion), at most 8 items [DC] */
  practiceTarget: 3,
  practiceMax: 8,
  /** practice classes in order — the five rule families, easy to hard [DC] */
  practiceClasses: [1, 2, 5, 3, 7, 8, 4, 6] as readonly number[]
} as const;

/**
 * One row of the trial log (BrainRunOutcome.trialLog), numbers only:
 *  0 kind        0 warm-up · 1 scored · 2 voided scored item · 3 voided warm-up item
 *  1 class       difficulty class 1–9
 *  2 correct     1 / 0 (a timeout is 0)
 *  3 rtMs        commit − onset, rounded (30000 on timeout; time shown before a void)
 *  4 timeout     1 / 0
 *  5 rapid       1 when rtMs < 1500 (excluded from θ)
 *  6 chosen      option slot 0–7, −1 when nothing was committed
 *  7 answer      the correct slot 0–7
 *  8 probeMask   bit i = the chosen option had probe i right, −1 when nothing was chosen
 *  9 family      rule-family bitmask (model.ts FAMILY_BIT)
 * 10 thetaIn     θ̂ the item was selected at (θ0 for the first scored item)
 * 11 thetaOut    EAP θ̂ after this response (unchanged for excluded rows)
 */
export const COL = {
  kind: 0,
  cls: 1,
  correct: 2,
  rt: 3,
  timeout: 4,
  rapid: 5,
  chosen: 6,
  answer: 7,
  probes: 8,
  family: 9,
  thetaIn: 10,
  thetaOut: 11
} as const;

export const KIND_WARMUP = 0;
export const KIND_SCORED = 1;
export const KIND_VOID_SCORED = 2;
export const KIND_VOID_WARMUP = 3;

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** the IRT responses a log contributes to θ: scored, not voided, not a rapid guess */
export function irtResponses(log: readonly number[][]): IrtResponse[] {
  return log
    .filter((row) => row[COL.kind] === KIND_SCORED && row[COL.rapid] === 0)
    .map((row) => ({ b: bOf(row[COL.cls]), correct: row[COL.correct] === 1 }));
}

export interface RunEnd {
  /** a 4th interruption ended the run */
  interrupted: boolean;
  /** the 240-s cap stopped the block before 12 items */
  capped: boolean;
}

/** the metric ids, in the order index.ts declares them */
export const METRIC_IDS = ['theta', 'se', 'accuracy', 'opAccuracy', 'rtCorrect', 'timeouts', 'rapidGuesses'] as const;

/**
 * Score a finished block from its trial log (SCIENCE.md §1.8 "Metrics").
 *  theta        EAP θ (3PL, a = 1, c = 1/8, prior N(0,1), quadrature −4…4 by 0.05) — primary
 *  se           posterior SD of θ
 *  accuracy     % correct of the valid items (timeouts count as wrong)
 *  opAccuracy   % of probe attributes the chosen option had right (HeiQ operation level;
 *               items with no committed answer are left out)
 *  rtCorrect    median time to a correct answer, seconds (30 = the window, when none was correct [DC])
 *  timeouts     items that ran out of time
 *  rapidGuesses responses under 1.5 s
 */
export function scoreRun(log: readonly number[][], end: RunEnd): BrainRunOutcome {
  const scored = log.filter((row) => row[COL.kind] === KIND_SCORED);
  const valid = scored.filter((row) => row[COL.rapid] === 0);
  const { theta, se } = eap(irtResponses(log));
  const correct = valid.filter((row) => row[COL.correct] === 1);
  const answered = valid.filter((row) => row[COL.chosen] >= 0);
  const rapid = scored.length - valid.length;
  const timeouts = scored.filter((row) => row[COL.timeout] === 1).length;
  const rtCorrect = correct.length ? median(correct.map((row) => row[COL.rt])) / 1000 : PROTOCOL.windowMs / 1000;
  const metrics: Record<string, number> = {
    theta: r3(theta),
    se: r3(se),
    accuracy: valid.length ? (100 * correct.length) / valid.length : 0,
    opAccuracy: answered.length
      ? (100 * answered.reduce((s, row) => s + popcount(row[COL.probes]), 0)) / (3 * answered.length)
      : 0,
    rtCorrect: Math.round(rtCorrect * 100) / 100,
    timeouts,
    rapidGuesses: rapid
  };

  const flags: string[] = [];
  if (rapid >= PROTOCOL.carelessAt) flags.push('careless');
  if (valid.length < PROTOCOL.minValidItems) flags.push('too-few-items');
  if (end.interrupted) flags.push('interrupted');
  if (end.capped) flags.push('time-cap');
  if (log.some((row) => row[COL.kind] === KIND_VOID_SCORED)) flags.push('items-replaced');
  const isValid = !end.interrupted && rapid < PROTOCOL.carelessAt && valid.length >= PROTOCOL.minValidItems;

  const hardest = correct.reduce((m, row) => Math.max(m, row[COL.cls]), 0);
  const highlights = [
    { label: 'Solved', value: `${correct.length} of ${scored.length}` },
    { label: 'Hardest solved', value: hardest ? `difficulty ${hardest} of ${CLASSES.length}` : '—' },
    // the index is 50 + 10θ, so ±SE in θ is ±10·SE index points
    { label: 'Precision', value: `± ${Math.round(se * 10)} index points` }
  ];

  return {
    metrics,
    trials: scored.length,
    valid: isValid,
    flags,
    highlights,
    trialLog: log.map((row) => row.slice())
  };
}

/** θ of a log so far (selection uses it after every response) */
export function thetaSoFar(log: readonly number[][]): number | null {
  const resp = irtResponses(log);
  return resp.length ? eap(resp).theta : null;
}

/**
 * Rescore a stored run under the current rules (scoring v1 → v2) from its
 * trial log. How the block ended is not in the log: the stored flags carry it
 * ('interrupted' — a 4th void, which keeps the run invalid — and 'time-cap').
 */
export function rescoreRun(stored: BrainRescoreInput): BrainRunOutcome | null {
  const rows = stored.trialLog.filter((r) => r.length >= 12);
  if (!rows.length || rows.length !== stored.trialLog.length) return null;
  return scoreRun(rows, { interrupted: stored.flags.includes('interrupted'), capped: stored.flags.includes('time-cap') });
}
