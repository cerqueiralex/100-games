/**
 * Arrow Squared — scoring and validity (SCIENCE.md §1.5). Pure: the outcome
 * is computed from the compact trial log alone, so a stored run can be
 * re-scored exactly whenever `scoringVersion` changes.
 *
 * TRIAL LOG — one numeric row per SCORED trial (warm-up and tutorial trials
 * are never logged), columns:
 *   0 type     0 FC · 1 FI · 2 TC-OI · 3 TI-OC
 *   1 d        direction of the target's outer arrows (0 left, 1 right)
 *   2 side     side of the correct option (0 left, 1 right)
 *   3 chosen   side the player tapped (0 left, 1 right)
 *   4 rtMs     onset → pointerdown, ms (rounded to 0.1 ms)
 *   5 correct  1 / 0 (redundant with side === chosen; scoring recomputes it)
 *   6 onsetMs  item onset, ms from the first item's onset (rounded to 0.1 ms)
 */
import type { BrainRunOutcome } from '../../../platform/brain/types';
import { median } from '../../../platform/brain/timing';
import type { Dir, Side, TrialType } from './items';
import { FAST_MAX_SHARE, FAST_RT_MS, TEST_MS } from './protocol';

export const LOG_COLUMNS = ['type', 'd', 'side', 'chosen', 'rtMs', 'correct', 'onsetMs'] as const;

export interface ArrowTrial {
  type: TrialType;
  dir: Dir;
  side: Side;
  chosen: Side;
  /** ms, onset → response */
  rt: number;
  /** ms from the first item's onset */
  onset: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export function encodeTrial(t: ArrowTrial): number[] {
  return [t.type, t.dir, t.side, t.chosen, r1(t.rt), t.side === t.chosen ? 1 : 0, r1(t.onset)];
}

export interface ArrowScore {
  correct: number;
  incorrect: number;
  /** correct + incorrect — the scored trials */
  responses: number;
  /** THE primary metric: correct − incorrect within the block */
  net: number;
  /** % correct of all responses (NaN with no response) */
  accuracy: number;
  /** correct responses per second of the 90-s block */
  throughput: number;
  /** median RT of correct responses, ms (NaN with none) */
  medianRt: number;
  /** responses under FAST_RT_MS — probable mis-taps */
  fast: number;
  fastShare: number;
  longestStreak: number;
}

/**
 * Score a trial log. A row counts when its response landed before the hard
 * stop (onset + RT < blockMs) — the stop rule, re-applied here so a log can
 * never score a touch after time-out.
 */
export function scoreLog(log: readonly (readonly number[])[], blockMs = TEST_MS): ArrowScore {
  let correct = 0;
  let incorrect = 0;
  let fast = 0;
  let streak = 0;
  let longestStreak = 0;
  const rts: number[] = [];
  for (const row of log) {
    const rt = row[4];
    const onset = row[6];
    if (!Number.isFinite(rt) || !Number.isFinite(onset) || rt < 0 || onset < 0 || onset + rt >= blockMs) continue;
    const ok = row[3] === row[2];
    if (ok) {
      correct++;
      rts.push(rt);
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      incorrect++;
      streak = 0;
    }
    if (rt < FAST_RT_MS) fast++;
  }
  const responses = correct + incorrect;
  return {
    correct,
    incorrect,
    responses,
    net: correct - incorrect,
    accuracy: responses ? (100 * correct) / responses : NaN,
    throughput: correct / (blockMs / 1000),
    medianRt: median(rts),
    fast,
    fastShare: responses ? fast / responses : 0,
    longestStreak
  };
}

/**
 * Validity (SCIENCE.md §1.5): net ≤ 0 is at or below chance → invalid
 * ('at-chance') [V]; more than 10% of responses under 200 ms → invalid
 * ('too-fast') [DC]. Fewer probable mis-taps keep the run valid with the
 * 'probable-mis-taps' annotation (they still count, as every response did
 * in the source).
 */
export function validity(s: ArrowScore): { valid: boolean; flags: string[] } {
  const flags: string[] = [];
  if (s.net <= 0) flags.push('at-chance');
  if (s.fastShare > FAST_MAX_SHARE) flags.push('too-fast');
  const valid = flags.length === 0;
  if (valid && s.fast > 0) flags.push('probable-mis-taps');
  return { valid, flags };
}

/** the runner's outcome for a finished scored block */
export function buildOutcome(log: number[][], blockMs = TEST_MS): BrainRunOutcome {
  const s = scoreLog(log, blockMs);
  const { valid, flags } = validity(s);
  const metrics: Record<string, number> = { net: s.net, throughput: Math.round(s.throughput * 1000) / 1000 };
  if (Number.isFinite(s.accuracy)) metrics.accuracy = Math.round(s.accuracy * 10) / 10;
  if (Number.isFinite(s.medianRt)) metrics.medianRt = Math.round(s.medianRt);
  return {
    metrics,
    trials: s.responses,
    valid,
    ...(flags.length ? { flags } : {}),
    highlights: [
      { label: 'Answers', value: `${s.correct} right · ${s.incorrect} wrong` },
      { label: 'Longest streak', value: `${s.longestStreak} right in a row` }
    ],
    trialLog: log.map((row) => row.slice())
  };
}

/**
 * Exploratory readouts only (SCIENCE.md §1.5 — never tracked, never shown as
 * a score): accuracy and median correct RT per trial type, and the conflict
 * cost accuracy(FC) − accuracy(FI). Difference scores are unreliable for
 * individuals (Hedge et al. 2018), which is why nothing else reads this.
 */
export function exploratory(log: readonly (readonly number[])[], blockMs = TEST_MS) {
  const byType = [0, 1, 2, 3].map((type) => {
    const rows = log.filter((r) => r[0] === type && r[6] + r[4] < blockMs);
    const ok = rows.filter((r) => r[3] === r[2]);
    return {
      type,
      n: rows.length,
      accuracy: rows.length ? (100 * ok.length) / rows.length : NaN,
      medianRt: median(ok.map((r) => r[4]))
    };
  });
  return { byType, conflictCost: byType[0].accuracy - byType[1].accuracy };
}
