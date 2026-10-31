import type { BrainRefContext, BrainRunOutcome } from '../../../platform/brain/types';
import { mean, median } from '../../../platform/brain/timing';
import { CODE, PVT, thresholds } from './protocol';

/**
 * Alertness Check — scoring, validity and the reference anchor (SCIENCE.md
 * §1.10 "Metrics", "Index", Basner & Dinges 2011; Basner, Mollicone &
 * Dinges 2011). PURE: everything is computed from the trial log
 * ([code, isiMs, onsetMs, rtMs] rows — protocol.ts) and the device offset,
 * so a stored run can be rescored exactly when the scoring version changes.
 */

export interface PvtScore {
  /** valid stimuli: every measured RT ≥ 100 ms + offset, lapses and timeouts included */
  valid: number;
  falseStarts: number;
  /** RT ≥ 355 ms + offset (timeouts included) */
  lapses: number;
  timeouts: number;
  /** PRIMARY — response speed, mean of 1000/RT over valid stimuli (s⁻¹) */
  speed: number;
  /** performance score, 100 × [1 − (L + FS)/(valid + FS)] (%) */
  ps: number;
  /** mean 1000/RT of the slowest 10% of valid stimuli (s⁻¹) */
  slowSpeed: number;
  /** mean RT of the fastest 10% of valid stimuli (ms) */
  fastRt: number;
  /** display only — never the score (Basner & Dinges 2011) */
  medianRt: number;
}

/** how many responses make "10%": k = max(1, round(n / 10)) */
export function tailCount(n: number): number {
  return Math.max(1, Math.round(n / 10));
}

/** PS = 100 × [1 − (L + FS)/(valid + FS)]; NaN when there is nothing to score */
export function performanceScore(lapses: number, falseStarts: number, valid: number): number {
  const d = valid + falseStarts;
  return d > 0 ? 100 * (1 - (lapses + falseStarts) / d) : NaN;
}

function isRow(r: unknown): r is number[] {
  return Array.isArray(r) && r.length >= 4 && r.slice(0, 4).every((x) => typeof x === 'number' && Number.isFinite(x));
}

/**
 * Score a trial log. Classification is re-derived from the raw RTs and the
 * thresholds (a timeout is valid and a lapse; any other row is a false start
 * below 100 ms + offset, a valid response otherwise), so it matches the live
 * machine exactly and follows a threshold change on rescoring. Malformed
 * rows are skipped, never trusted.
 */
export function scorePvt(rows: readonly unknown[], offsetMs: number): PvtScore {
  const th = thresholds(offsetMs);
  const rts: number[] = [];
  let falseStarts = 0;
  let timeouts = 0;
  for (const r of rows) {
    if (!isRow(r)) continue;
    const [code, , , rt] = r;
    if (code === CODE.timeout) {
      timeouts++;
      rts.push(PVT.timeoutMs);
    } else if (rt < th.falseStartMs) {
      falseStarts++;
    } else {
      rts.push(rt);
    }
  }
  const valid = rts.length;
  const lapses = rts.filter((rt) => rt >= th.lapseMs).length;
  const speeds = rts.map((rt) => 1000 / rt);
  const k = tailCount(valid);
  const slowest = speeds.slice().sort((a, b) => a - b).slice(0, k);
  const fastest = rts.slice().sort((a, b) => a - b).slice(0, k);
  return {
    valid,
    falseStarts,
    lapses,
    timeouts,
    speed: valid ? mean(speeds) : NaN,
    ps: performanceScore(lapses, falseStarts, valid),
    slowSpeed: valid ? mean(slowest) : NaN,
    fastRt: valid ? mean(fastest) : NaN,
    medianRt: valid ? median(rts) : NaN
  };
}

/** SCIENCE.md §1.10 "Validity" (+ the per-run half of "Flags specific to Reaction") */
export function judge(s: PvtScore): { valid: boolean; flags: string[] } {
  const flags: string[] = [];
  if (s.valid < PVT.minValid) flags.push('too-few');
  if (s.falseStarts > PVT.maxFalseStarts) flags.push('too-many-false-starts');
  const valid = flags.length === 0;
  if (valid && s.falseStarts >= PVT.falseStartFlagAt) flags.push('responding-before-the-counter');
  return { valid, flags };
}

/** the declared metrics (index.ts), finite values only */
export function metricsOf(s: PvtScore): Record<string, number> {
  const all: Record<string, number> = {
    speed: round(s.speed, 4),
    lapses: s.lapses,
    falseStarts: s.falseStarts,
    ps: round(s.ps, 2),
    slowSpeed: round(s.slowSpeed, 4),
    fastRt: round(s.fastRt, 1),
    medianRt: round(s.medianRt, 1)
  };
  return Object.fromEntries(Object.entries(all).filter(([, v]) => Number.isFinite(v)));
}

function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** the results card's extra lines — PS sits beside the index, as §1.10 asks */
export function highlightsOf(s: PvtScore): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (Number.isFinite(s.ps)) out.push({ label: 'Performance score', value: `${Math.round(s.ps)}%` });
  if (Number.isFinite(s.medianRt)) out.push({ label: 'Median reaction time', value: `${Math.round(s.medianRt)} ms` });
  out.push({ label: 'Lapses · false starts', value: `${s.lapses} · ${s.falseStarts}` });
  return out;
}

/** the complete outcome of a scored block, built from its trial log */
export function buildOutcome(rows: number[][], offsetMs: number): BrainRunOutcome {
  const s = scorePvt(rows, offsetMs);
  const { valid, flags } = judge(s);
  return {
    metrics: metricsOf(s),
    trials: s.valid,
    valid,
    ...(flags.length ? { flags } : {}),
    highlights: highlightsOf(s),
    trialLog: rows.map((r) => r.slice(0, 4))
  };
}

/* ---------- the reference anchor (grade C) ---------- */

/**
 * Woods et al. (2015) Exp. 1: simple RT 230.8 ms (SD 26.8, N = 1,469, ages
 * 18–65, mean age ≈ 46) minus their measured 17.8 ms hardware delay, +0.55
 * ms per year of age; the platform's touch latency (Pronk et al. 2020) is
 * added back because our RTs include it.
 */
export const ANCHOR = { rtMs: 213.0, ageSlope: 0.55, meanAge: 46, sdMs: 26.8 } as const;

/** μ_RT, μ_S and σ_S for this context — exported for the check */
export function anchorFor(ctx: BrainRefContext): { muRt: number; muS: number; sigmaS: number } {
  const age = typeof ctx.age === 'number' && Number.isFinite(ctx.age) ? ctx.age : ANCHOR.meanAge;
  const muRt = ANCHOR.rtMs + ANCHOR.ageSlope * (age - ANCHOR.meanAge) + ctx.platformOffsetMs;
  return { muRt, muS: 1000 / muRt, sigmaS: (1000 * ANCHOR.sdMs) / (muRt * muRt) };
}

/**
 * z of a response speed against the anchor: (S − μ_S)/σ_S, higher = better.
 * NaN ("no reference") where the platform's latency was never measured —
 * there the anchor would be off by an unknown amount (SCIENCE.md §1.10).
 */
export function referenceZ(speed: number, ctx: BrainRefContext): number {
  if (!ctx || !ctx.offsetKnown || !Number.isFinite(ctx.platformOffsetMs) || !Number.isFinite(speed)) return NaN;
  const { muS, sigmaS } = anchorFor(ctx);
  return sigmaS > 0 ? (speed - muS) / sigmaS : NaN;
}
