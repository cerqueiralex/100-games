import type { BrainRunOutcome } from '../../../platform/brain/types';
import { mean } from '../../../platform/brain/timing';
import { PROTOCOL, type TrialKind } from './protocol';

/**
 * Block Span — scoring, validity and the trial log (SCIENCE.md §1.6
 * "Scoring rule", "Metrics", "Interruptions", "Log"). Pure: the outcome is
 * computed from the trial records alone, so validate can score a scripted
 * run and a stored trial log can be rescored when `scoringVersion` moves.
 */

export type TrialEnd = 'complete' | 'gave-up' | 'timeout' | 'stopped';
export type TrialStatus = 'scored' | 'voided-pause' | 'voided-timing';

/** what the player did on one trial */
export interface TrialResponse {
  /**
   * complete = L taps registered · gave-up = "Don't remember" · timeout =
   * 15 s without a tap · stopped = practice only: ended at the first wrong tap
   */
  end: TrialEnd;
  /** registered taps, ms from the recall cue */
  tapMs: number[];
  /** registered taps, block index */
  tapped: number[];
  /** taps ignored because they came during the presentation */
  earlyTaps: number;
  /** the largest |ON period − 500 ms| measured during the presentation */
  maxOnDevMs: number;
  viewportW: number;
  viewportH: number;
}

export interface TrialRecord {
  status: TrialStatus;
  kind: TrialKind;
  attempt: number;
  L: number;
  correct: boolean;
  end: TrialEnd | 'voided';
  tapMs: number[];
  tapped: number[];
  earlyTaps: number;
  maxOnDevMs: number;
  pathLen: number;
  crossings: number;
  fallback: boolean;
  S: number;
  viewportW: number;
  viewportH: number;
}

/** the counters the interruption and validity rules read (scored block only) */
export interface RunCounters {
  interruptions: number;
  pausedMs: number;
  timeouts: number;
  voidedTiming: number;
}

/** correct only if all L taps match the sequence in exact order */
export function isCorrect(seq: readonly number[], tapped: readonly number[]): boolean {
  return tapped.length === seq.length && seq.every((b, i) => tapped[i] === b);
}

/**
 * MnS = (L_start − 0.5) + Σ p(L) over L = L_start … 10, p(L) = correct ÷
 * presented at length L. Lengths never reached add 0; dips below L_start
 * add nothing (the L_start − 0.5 term already assumes full credit there).
 * Woods 2011's worked example: 2.5 + (1 + 1 + 1 + 1 + 0.25 + 0.33 + 0) = 7.08.
 */
export function meanSpan(
  trials: readonly { L: number; correct: boolean }[],
  lStart: number = PROTOCOL.lStart,
  lMax: number = PROTOCOL.lMax
): number {
  let mns = lStart - 0.5;
  for (let L = lStart; L <= lMax; L++) {
    const at = trials.filter((t) => t.L === L);
    if (at.length) mns += at.filter((t) => t.correct).length / at.length;
  }
  return mns;
}

/** the longest length recalled correctly (0 when no trial was correct) */
export function maxCorrectLength(trials: readonly { L: number; correct: boolean }[]): number {
  return trials.reduce((m, t) => (t.correct && t.L > m ? t.L : m), 0);
}

/**
 * Mean time per tap, ms: every registered tap's interval from the previous
 * response event (the recall cue for the first tap). Device-dependent and
 * never part of any index. NaN when nothing was tapped.
 */
export function meanTapInterval(trials: readonly { tapMs: number[] }[]): number {
  const gaps: number[] = [];
  for (const t of trials) t.tapMs.forEach((ms, i) => gaps.push(ms - (i ? t.tapMs[i - 1] : 0)));
  return mean(gaps);
}

export function runMetrics(scored: readonly TrialRecord[]): Record<string, number> {
  return {
    mns: meanSpan(scored),
    maxSpan: maxCorrectLength(scored),
    correct: scored.filter((t) => t.correct).length,
    tapMs: meanTapInterval(scored)
  };
}

/**
 * Limits that end the scored block early (SCIENCE.md §1.6 "Interruptions"):
 * more than 2 interruptions, more than 60 s paused in total, 3 or more
 * inactivity timeouts, or 3 or more trials voided for presentation timing.
 */
export function limitReasons(c: RunCounters): string[] {
  const out: string[] = [];
  if (c.interruptions > PROTOCOL.maxInterruptions || c.pausedMs > PROTOCOL.maxPausedMs) out.push('too-many-interruptions');
  if (c.timeouts >= PROTOCOL.timeoutsInvalid) out.push('too-many-timeouts');
  if (c.voidedTiming >= PROTOCOL.voidedTimingInvalid) out.push('unstable-timing');
  return out;
}

/**
 * Every reason the run is invalid — empty for a valid run. Beyond the
 * protocol's limits: a block that did not reach its 14 scored trials, and
 * two [DC] floors that catch a run which measured no recall at all —
 * 'too-few' when not a single tap was registered (every trial abandoned
 * through "Don't remember"), 'at-chance' when taps came but not one of 14
 * trials was right. Two misses send the staircase to 2-block sequences, so
 * anybody attempting the task gets some right; random tapping almost never
 * does (1 in 90 at L = 2).
 */
export function invalidReasons(c: RunCounters, records: readonly TrialRecord[]): string[] {
  const out = limitReasons(c);
  if (out.length) return out;
  const scored = records.filter((r) => r.status === 'scored');
  const anyTap = scored.some((r) => r.tapped.length > 0);
  if (scored.length < PROTOCOL.scoredTrials || !anyTap) out.push('too-few');
  else if (!scored.some((r) => r.correct)) out.push('at-chance');
  return out;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const END_CODE: Record<TrialRecord['end'], number> = { complete: 0, 'gave-up': 1, timeout: 2, voided: 3, stopped: 4 };
const STATUS_CODE: Record<TrialStatus, number> = { scored: 0, 'voided-pause': 1, 'voided-timing': 2 };

/**
 * The compact trial log stored with the run — one row per scored-block
 * attempt (voided ones included), numbers only:
 *
 *   [0]  status: 0 scored · 1 voided by a pause · 2 voided for presentation timing
 *   [1]  attempt number — with the run seed and [10] regenerates the exact layout and sequence
 *   [2]  L, the sequence length
 *   [3]  correct (1 / 0; voided rows 0)
 *   [4]  end: 0 all L taps · 1 "Don't remember" · 2 inactivity timeout · 3 voided
 *   [5]  n, taps registered
 *   [6]  first-tap latency, ms from the recall cue (−1 without a tap)
 *   [7]  path length, block sides (2 decimals)
 *   [8]  path self-crossings
 *   [9]  lattice fallback (1 / 0)
 *   [10] arena side S, px
 *   [11] largest ON-period deviation from 500 ms, ms (1 decimal)
 *   [12] taps ignored during the presentation
 *   [13] viewport width, px
 *   [14] viewport height, px
 *   [15 … 15+n)    tap times, ms from the recall cue
 *   [15+n … 15+2n) tapped block indices (the sequence itself regenerates from the seed)
 */
export function encodeTrialLog(records: readonly TrialRecord[]): number[][] {
  return records
    .filter((r) => r.kind === 'scored')
    .map((r) => [
      STATUS_CODE[r.status],
      r.attempt,
      r.L,
      r.correct ? 1 : 0,
      END_CODE[r.end],
      r.tapped.length,
      r.tapMs.length ? Math.round(r.tapMs[0]) : -1,
      r2(r.pathLen),
      r.crossings,
      r.fallback ? 1 : 0,
      r.S,
      r1(r.maxOnDevMs),
      r.earlyTaps,
      Math.round(r.viewportW),
      Math.round(r.viewportH),
      ...r.tapMs.map((ms) => Math.round(ms)),
      ...r.tapped
    ]);
}

/** the run's outcome, from its records and counters */
export function buildOutcome(records: readonly TrialRecord[], counters: RunCounters): BrainRunOutcome {
  const scored = records.filter((r) => r.kind === 'scored' && r.status === 'scored');
  const all = runMetrics(scored);
  const metrics: Record<string, number> = {};
  for (const [k, v] of Object.entries(all)) if (Number.isFinite(v)) metrics[k] = v;
  const reasons = invalidReasons(counters, records.filter((r) => r.kind === 'scored'));
  const longest = all.maxSpan;
  return {
    metrics,
    trials: scored.length,
    valid: reasons.length === 0,
    ...(reasons.length ? { flags: reasons } : {}),
    ...(scored.length
      ? {
          highlights: [
            { label: 'Longest sequence recalled', value: longest ? `${longest} blocks` : 'None' },
            { label: 'Trials correct', value: `${all.correct} of ${scored.length}` }
          ]
        }
      : {}),
    trialLog: encodeTrialLog(records)
  };
}
