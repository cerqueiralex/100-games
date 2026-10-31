import { median } from '../../../platform/brain/timing';
import { PROTOCOL, SHAPE, type Cue, type Pic, type Side } from './protocol';

/**
 * Scoring and validity (SCIENCE.md §1.12 "Metrics", "Exclusions and
 * validity"). Pure: a run is scored from its trial records alone, and the
 * compact trial log reproduces the same metrics exactly (RTs are rounded to
 * whole milliseconds BEFORE scoring, so a rescore from the log is identical).
 */

/** one answered (or timed-out) scored trial */
export interface TrialRecord {
  cue: Cue;
  pic: Pic;
  /** the correct card */
  side: Side;
  /** the card tapped, −1 when the deadline passed without a tap */
  resp: Side | -1;
  /** ms from picture onset to the tap, whole ms; the deadline on a timeout */
  rt: number;
  /** the blank interval before the cue, ms */
  isi: number;
  /** measured cue → picture lead, ms (frame-quantised; nominal 500) */
  lead: number;
  /** taps that landed before the picture appeared — ignored, logged */
  early: number;
}

/** outcome code of a trial */
export const CODE = { wrong: 0, correct: 1, timeout: 2, anticipation: 3 } as const;
export type Code = (typeof CODE)[keyof typeof CODE];

export function classify(t: Pick<TrialRecord, 'resp' | 'rt' | 'side'>): Code {
  if (t.resp === -1 || !(t.rt <= PROTOCOL.deadlineMs)) return CODE.timeout;
  if (t.rt < PROTOCOL.anticipationMs) return CODE.anticipation;
  return t.resp === t.side ? CODE.correct : CODE.wrong;
}

/** the time a trial adds to ΣRT, ms: a timeout counts the full 2.5 s, an anticipation its own RT */
export function rtForSum(t: Pick<TrialRecord, 'resp' | 'rt' | 'side'>): number {
  return classify(t) === CODE.timeout ? PROTOCOL.deadlineMs : t.rt;
}

export interface Score {
  /** every metric this run can honestly report (an undefined one is absent, never invented) */
  metrics: Record<string, number>;
  valid: boolean;
  flags: string[];
  nCorrect: number;
  sumRtS: number;
  highlights: { label: string; value: string }[];
}

function pct(n: number, d: number): number {
  return d > 0 ? (100 * n) / d : NaN;
}

/**
 * Exploratory switch costs (Hedge 2018: unreliable as a single-run score —
 * shown only pooled over the last 7 valid runs). Trial 1 and every trial
 * that follows an error (wrong card, timeout or anticipation) are excluded;
 * the RT cost uses correct trials only.
 */
export function switchCosts(trials: readonly TrialRecord[]): { rt: number; err: number } {
  const codes = trials.map(classify);
  const swRt: number[] = [];
  const rpRt: number[] = [];
  let swN = 0;
  let swErr = 0;
  let rpN = 0;
  let rpErr = 0;
  for (let i = 1; i < trials.length; i++) {
    if (codes[i - 1] !== CODE.correct) continue;
    const isSwitch = trials[i].cue !== trials[i - 1].cue;
    const ok = codes[i] === CODE.correct;
    if (isSwitch) {
      swN++;
      if (!ok) swErr++;
      else swRt.push(trials[i].rt);
    } else {
      rpN++;
      if (!ok) rpErr++;
      else rpRt.push(trials[i].rt);
    }
  }
  return { rt: median(swRt) - median(rpRt), err: pct(swErr, swN) - pct(rpErr, rpN) };
}

/**
 * Score a scored block.
 *  - RCS = N_correct / ΣRT_i (s) over the 30 trials — correct responses per
 *    second, the MTB / NIH Toolbox v3 rate score (Novack 2024); a timeout
 *    contributes 2.5 s, an anticipation (< 200 ms) its own RT and counts as
 *    an error. Tracked as ln(RCS), the primary metric.
 *  - Invalid when there are more than 3 anticipations ('too-fast') or the
 *    accuracy is below 70 % ('rushed'), or the block is incomplete.
 */
export function scoreRun(trials: readonly TrialRecord[]): Score {
  const codes = trials.map(classify);
  const n = trials.length;
  const nCorrect = codes.filter((c) => c === CODE.correct).length;
  const anticipations = codes.filter((c) => c === CODE.anticipation).length;
  const timeouts = codes.filter((c) => c === CODE.timeout).length;
  const sumRtMs = trials.reduce((s, t) => s + rtForSum(t), 0);
  const sumRtS = sumRtMs / 1000;
  const rcs = sumRtS > 0 ? nCorrect / sumRtS : NaN;
  const correctRt = (cue: Cue) => trials.filter((t, i) => codes[i] === CODE.correct && t.cue === cue).map((t) => t.rt);
  const allCorrectRt = trials.filter((_, i) => codes[i] === CODE.correct).map((t) => t.rt);
  const sc = switchCosts(trials);
  const colorTrials = trials.filter((t) => t.cue !== SHAPE).length;
  const colorCorrect = trials.filter((t, i) => t.cue !== SHAPE && codes[i] === CODE.correct).length;

  const raw: Record<string, number> = {
    lnRcs: nCorrect > 0 ? Math.log(rcs) : NaN,
    rcs,
    accuracy: pct(nCorrect, n),
    medRtShape: median(correctRt(SHAPE)),
    medRtColor: median(correctRt(1)),
    anticipations,
    timeouts,
    switchCostRt: sc.rt,
    switchCostErr: sc.err
  };
  const metrics: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) if (Number.isFinite(v)) metrics[k] = v;

  const flags: string[] = [];
  if (n < PROTOCOL.testTrials) flags.push('too-few');
  if (anticipations > PROTOCOL.maxAnticipations) flags.push('too-fast');
  if (n > 0 && nCorrect / n < PROTOCOL.minAccuracy) flags.push('rushed');
  const valid = flags.length === 0 && Number.isFinite(metrics.lnRcs);

  const med = median(allCorrectRt);
  const highlights = [
    { label: 'Correct', value: `${nCorrect} of ${n}` },
    ...(Number.isFinite(med) ? [{ label: 'Median correct time', value: `${(med / 1000).toFixed(2)} s` }] : []),
    { label: 'Color trials correct', value: `${colorCorrect} of ${colorTrials}` }
  ];
  return { metrics, valid, flags, nCorrect, sumRtS, highlights };
}

/*
 * The compact trial log (BrainRunOutcome.trialLog) — one row per scored
 * trial, numbers only:
 *   [0] cue    0 = "shape", 1 = "color"
 *   [1] pic    0 = shape A in colour 2, 1 = shape B in colour 1
 *   [2] side   the correct card: 0 = left, 1 = right
 *   [3] resp   the card tapped: 0 / 1, −1 = none (timeout)
 *   [4] rt     ms from picture onset to the tap, whole ms (2500 on a timeout)
 *   [5] code   1 correct · 0 wrong card · 2 timeout · 3 anticipation (< 200 ms)
 *   [6] isi    the blank interval before the cue, ms (300 / 1000)
 *   [7] lead   measured cue → picture lead, ms (nominal 500, frame-quantised)
 *   [8] early  taps before the picture appeared (ignored by scoring)
 */
export const LOG_COLUMNS = ['cue', 'pic', 'side', 'resp', 'rt', 'code', 'isi', 'lead', 'early'] as const;

export function toLogRow(t: TrialRecord): number[] {
  return [t.cue, t.pic, t.side, t.resp, t.rt, classify(t), t.isi, t.lead, t.early];
}

export function fromLogRow(row: readonly number[]): TrialRecord {
  return {
    cue: row[0] === 1 ? 1 : 0,
    pic: row[1] === 1 ? 1 : 0,
    side: row[2] === 1 ? 1 : 0,
    resp: row[3] === 0 || row[3] === 1 ? row[3] : -1,
    rt: row[4],
    isi: row[6],
    lead: row[7],
    early: row[8]
  };
}
