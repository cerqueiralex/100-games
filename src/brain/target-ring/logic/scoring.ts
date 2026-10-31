import { mean, sd } from '../../../platform/brain/timing';
import {
  CONDITIONS,
  EASIEST,
  HARDEST,
  SCALE_COMPARABLE,
  SEQUENCE,
  dist,
  nominalId,
  targetCentre,
  type ConditionId,
  type Point
} from './geometry';
import { SLOTS } from './plan';

/**
 * Target Ring scoring (SCIENCE.md §1.9 "Metrics", "Trial exclusions",
 * "Validity"). Pure: raw taps in, metrics + validity out — validate drives
 * it on scripted runs.
 *
 * Per trial, the serial-task method (MacKenzie 2015):
 *   a = |from − to|, b = |sel − to|, c = |sel − from|
 *   dx = (c² − b² − a²) / (2a)          signed overshoot along the axis
 *   ae = a + dx + dx_prev               dx_prev = 0 at the start of a sequence
 * where `to` is the lit target's centre and `from` is the start tap's touch
 * point for k = 1 and the previous target's centre for k ≥ 2 (the previous
 * selection's own overshoot enters through dx_prev, so using its touch point
 * as well would count it twice).
 *
 * Per condition, pooling its scored sequences after exclusions (n ≈ 39):
 *   We = 4.133 · SD(dx)   (univariate scatter — Yamanaka & MacKenzie 2026)
 *   Ae = mean(ae), IDe = log2(Ae / We + 1), MT = mean inter-tap interval
 *   TP_c = IDe / MT (bits/s)
 * Session TP = the mean of the four TP_c ("mean of means", Soukoreff &
 * MacKenzie 2004) — never pooled across conditions, never per trial.
 */

/** a touch: protocol mm from the board centre (y down), time on the performance.now() clock */
export interface Tap {
  x: number;
  y: number;
  t: number;
}

/** one completed scored sequence */
export interface SequenceRecord {
  /** which of the 12 scored slots it fills (0–11) */
  slot: number;
  cond: ConditionId;
  /** 0 = first attempt, 1 = the one re-run a sequence with > 3 exclusions gets */
  attempt: 0 | 1;
  /** the unscored tap on target 0 that started the sequence */
  start: Tap;
  /** the 13 scored selections, k = 1…13 */
  taps: Tap[];
}

export const MT_MIN_MS = 80;
export const MT_MAX_MS = 2500;
export const GROSS_MISS_MM = 20;
export const AE_MIN_FRACTION = 0.5;
/** a sequence with MORE than this many exclusions is invalid (re-run once at the end) */
export const MAX_EXCLUSIONS = 3;
export const WE_FACTOR = 4.133;
/** session validity: at least 10 of the 12 slots valid … */
export const MIN_VALID_SLOTS = 10;
/** … and an overall error rate of at most 25 % */
export const MAX_ERROR_RATE = 25;
/** class B limit [DC, as Memory]: more than 2 voided sequences invalidate the run */
export const MAX_VOIDS = 2;

/** trial exclusion codes (trial log column `excl`) */
export const EXCL = { none: 0, fast: 1, slow: 2, gross: 3, direction: 4 } as const;

export interface Trial {
  k: number;
  target: number;
  a: number;
  b: number;
  c: number;
  dx: number;
  ae: number;
  /** ms since the previous tap */
  mt: number;
  hit: boolean;
  excl: number;
}

/** the per-trial measures and exclusion code of one sequence */
export function measureSequence(seq: Pick<SequenceRecord, 'cond' | 'start' | 'taps'>): Trial[] {
  const { D, W } = CONDITIONS[seq.cond];
  const out: Trial[] = [];
  let dxPrev = 0;
  let prevT = seq.start.t;
  const n = Math.min(seq.taps.length, SEQUENCE.length - 1);
  for (let k = 1; k <= n; k++) {
    const sel = seq.taps[k - 1];
    const to = targetCentre(SEQUENCE[k], D);
    const from: Point = k === 1 ? { x: seq.start.x, y: seq.start.y } : targetCentre(SEQUENCE[k - 1], D);
    const a = dist(from, to);
    const b = dist(sel, to);
    const c = dist(sel, from);
    const dx = a > 0 ? (c * c - b * b - a * a) / (2 * a) : 0;
    const ae = a + dx + dxPrev;
    const mt = sel.t - prevT;
    const excl =
      mt < MT_MIN_MS
        ? EXCL.fast
        : mt > MT_MAX_MS
          ? EXCL.slow
          : b > GROSS_MISS_MM
            ? EXCL.gross
            : ae < AE_MIN_FRACTION * a
              ? EXCL.direction
              : EXCL.none;
    out.push({ k, target: SEQUENCE[k], a, b, c, dx, ae, mt, hit: b <= W / 2, excl });
    dxPrev = dx;
    prevT = sel.t;
  }
  return out;
}

export function exclusionCount(trials: readonly Trial[]): number {
  return trials.reduce((n, t) => n + (t.excl !== EXCL.none ? 1 : 0), 0);
}

/** a sequence is valid with at most 3 exclusions (and all 13 selections) */
export function sequenceValid(trials: readonly Trial[]): boolean {
  return trials.length === SEQUENCE.length - 1 && exclusionCount(trials) <= MAX_EXCLUSIONS;
}

export interface ConditionResult {
  cond: ConditionId;
  nominalId: number;
  /** counted (non-excluded) trials pooled */
  n: number;
  misses: number;
  /** effective width, protocol mm */
  we: number;
  /** mean effective amplitude, protocol mm */
  ae: number;
  /** effective index of difficulty, bits */
  ide: number;
  /** mean movement time, ms */
  mtMs: number;
  /** throughput, bits/s */
  tp: number;
}

/** pool one condition's counted trials into We, Ae, IDe, MT and TP */
export function conditionResult(cond: ConditionId, counted: readonly Trial[]): ConditionResult {
  const n = counted.length;
  const sdx = sd(counted.map((t) => t.dx));
  const we = WE_FACTOR * sdx;
  const ae = mean(counted.map((t) => t.ae));
  const ide = we > 0 && ae > 0 ? Math.log2(ae / we + 1) : NaN;
  const mtMs = mean(counted.map((t) => t.mt));
  const tp = mtMs > 0 ? ide / (mtMs / 1000) : NaN;
  return {
    cond,
    nominalId: nominalId(CONDITIONS[cond]),
    n,
    misses: counted.reduce((m, t) => m + (t.hit ? 0 : 1), 0),
    we,
    ae,
    ide,
    mtMs,
    tp
  };
}

export interface SessionInput {
  /** every completed scored sequence, in completion order (voided ones are not here) */
  records: readonly SequenceRecord[];
  /** sequences voided by a pause / hidden page / rotation */
  interruptions: number;
  pxPerMm: number;
  /** the smallest board scale s used by a scored sequence */
  scale: number;
  input: 'touch' | 'mouse' | 'pen';
}

export interface SessionScore {
  metrics: Record<string, number>;
  valid: boolean;
  flags: string[];
  conditions: ConditionResult[];
  validSlots: number;
  hits: number;
  counted: number;
  /** MT = intercept + slope · IDe over the four conditions (ms, ms/bit) — display only */
  fit: { intercept: number; slope: number } | null;
}

/**
 * The scored attempt of each slot: its first valid attempt (a slot whose
 * first attempt had > 3 exclusions is re-run once; if that fails too the
 * slot is invalid and contributes nothing).
 */
export function scoredAttempts(records: readonly SequenceRecord[]): SequenceRecord[] {
  const out: SequenceRecord[] = [];
  for (let slot = 0; slot < SLOTS; slot++) {
    const hit = records.find((r) => r.slot === slot && sequenceValid(measureSequence(r)));
    if (hit) out.push(hit);
  }
  return out;
}

export function scoreSession(inp: SessionInput): SessionScore {
  const used = scoredAttempts(inp.records);
  const pools: Trial[][] = CONDITIONS.map(() => []);
  for (const r of used) for (const t of measureSequence(r)) if (t.excl === EXCL.none) pools[r.cond].push(t);
  const conditions = CONDITIONS.map((c) => conditionResult(c.id, pools[c.id]));
  const counted = pools.reduce((n, p) => n + p.length, 0);
  const misses = conditions.reduce((m, c) => m + c.misses, 0);
  const tps = conditions.map((c) => c.tp);
  const scorable = tps.every(Number.isFinite);

  const metrics: Record<string, number> = {};
  const put = (id: string, v: number) => {
    if (Number.isFinite(v)) metrics[id] = v;
  };
  if (scorable) {
    put('tp', mean(tps));
    put('mtMs', mean(conditions.map((c) => c.mtMs)));
  }
  put('errorRate', counted ? (100 * misses) / counted : NaN);
  put('tightness', mean(conditions.filter((c) => CONDITIONS[c.cond].W === 7).map((c) => c.we)));
  put('pxPerMm', inp.pxPerMm);
  put('scale', inp.scale);

  const flags: string[] = [];
  if (inp.interruptions > MAX_VOIDS) flags.push('too-many-interruptions');
  if (used.length < MIN_VALID_SLOTS || !scorable) flags.push('too-few');
  if (!(counted > 0) || (100 * misses) / counted > MAX_ERROR_RATE) flags.push('rushed');
  const valid = flags.length === 0;
  // quality flags — annotate, never invalidate (SCIENCE.md C11)
  const easy = conditions[EASIEST].mtMs;
  const hard = conditions[HARDEST].mtMs;
  if (Number.isFinite(easy) && Number.isFinite(hard) && hard < easy) flags.push('fitts-signature-violated');
  if (Number.isFinite(inp.scale) && inp.scale < SCALE_COMPARABLE) flags.push('not-comparable');
  if (inp.input !== 'touch') flags.push(`input-${inp.input}`);

  return {
    metrics,
    valid,
    flags,
    conditions,
    validSlots: used.length,
    hits: counted - misses,
    counted,
    fit: scorable ? fittsFit(conditions) : null
  };
}

/** ordinary least squares of MT (ms) on IDe over the conditions — the Fitts fit, display only */
export function fittsFit(conds: readonly Pick<ConditionResult, 'ide' | 'mtMs'>[]): { intercept: number; slope: number } | null {
  const pts = conds.filter((c) => Number.isFinite(c.ide) && Number.isFinite(c.mtMs));
  if (pts.length < 2) return null;
  const mx = mean(pts.map((p) => p.ide));
  const my = mean(pts.map((p) => p.mtMs));
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.ide - mx) * (p.mtMs - my);
    sxx += (p.ide - mx) ** 2;
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  return { intercept: my - slope * mx, slope };
}

/**
 * The compact trial log (BrainRunOutcome.trialLog) — one row per tap of
 * every completed scored sequence, voided sequences omitted:
 *   [0] seq     order of the completed scored sequence (0-based)
 *   [1] slot    scored slot 0–11
 *   [2] cond    0 = D20 W12, 1 = D20 W7, 2 = D40 W12, 3 = D40 W7
 *   [3] attempt 0 first, 1 re-run (after > 3 exclusions)
 *   [4] k       0 = the unscored start tap, 1–13 = scored selections
 *   [5] target  lit target index (t_k = 7k mod 13; target 0 at 12 o'clock, clockwise)
 *   [6] mt      ms since the previous tap, 0.1 ms (0 for k = 0)
 *   [7] x       touch, protocol mm right of the board centre, 0.01 mm
 *   [8] y       touch, protocol mm below the board centre, 0.01 mm
 *   [9] excl    −1 start tap, 0 counted, 1 MT < 80 ms, 2 MT > 2,500 ms,
 *               3 > 20 mm from the target, 4 ae < 0.5·a
 * Enough to rescore a run from scratch (from_1 = the k = 0 row's touch).
 */
export function buildTrialLog(records: readonly SequenceRecord[]): number[][] {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const rows: number[][] = [];
  records.forEach((rec, i) => {
    rows.push([i, rec.slot, rec.cond, rec.attempt, 0, SEQUENCE[0], 0, r2(rec.start.x), r2(rec.start.y), -1]);
    for (const t of measureSequence(rec)) {
      const sel = rec.taps[t.k - 1];
      rows.push([i, rec.slot, rec.cond, rec.attempt, t.k, t.target, r1(t.mt), r2(sel.x), r2(sel.y), t.excl]);
    }
  });
  return rows;
}

/** hits and mean tap interval of one practice / warm-up sequence (corrective feedback only) */
export function sequenceSummary(seq: Pick<SequenceRecord, 'cond' | 'start' | 'taps'>): { hits: number; total: number; mtMs: number } {
  const trials = measureSequence(seq);
  return {
    hits: trials.filter((t) => t.hit).length,
    total: trials.length,
    mtMs: mean(trials.map((t) => t.mt))
  };
}
