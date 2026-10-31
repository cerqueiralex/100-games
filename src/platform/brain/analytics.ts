import type {
  BrainBaseline,
  BrainDevice,
  BrainDomain,
  BrainDomainId,
  BrainMetricDef,
  BrainRefContext,
  BrainRunOutcome,
  BrainRunType,
  BrainSession,
  BrainStateReport,
  BrainStore,
  BrainTestDefinition,
  ReferenceGrade
} from './types';
import type { GameResult } from '../types';
import { BRAIN_TESTS, getBrainTest, benchmarkFor } from './registry';
import { BRAIN_DOMAINS } from './domains';
import { appendSession, loadBrain, newBrainId, type NewSession } from './store';
import { indexFromZ, mean, median, robustSd } from './timing';
import { dayKey } from '../progress/progress';

/**
 * Brain Lab analytics — every number the tab and the dashboard show is
 * computed here, from the permanent store and the live registry, as PURE
 * functions of their inputs (no storage reads except in `recordRun`, the one
 * write path). SCIENCE.md §2 is the specification; section numbers below
 * point into it. Validate drives these functions on synthetic series.
 *
 * Vocabulary:
 *  - x: a run's PRIMARY metric (always oriented higher = better).
 *  - run-in: the first R valid runs of a test — "Calibrating", never scored.
 *  - segment: one device + protocol version + baseline epoch; analytics never
 *    pool across segments (§2.3).
 *  - scored run: the day's first valid run after the run-in (C6) — the only
 *    kind that feeds levels, baselines, σ_w, verdicts and the Mean.
 *  - baseline: median x of a segment's first 5 scored runs, then FROZEN.
 *  - σ_w: the player's own session-to-session noise, floored (§2.4).
 */

/* ---------- constants (SCIENCE.md §2.12, §2.6, §2.7) ---------- */

export const BASELINE_N = 5;
/** a 5-session median has ~64% of a mean's efficiency (§2.6) */
export const N_EFF = 3.2;
export const RELIABLE_Z = 1.96;
/** the area level averages scored runs from this many days (§2.1) */
export const LEVEL_WINDOW_DAYS = 14;
export const EWMA_LAMBDA = 0.25;
const DAY_MS = 86_400_000;

/* ---------- small helpers ---------- */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** the run's primary metric, NaN when missing */
export function primaryOf(test: BrainTestDefinition, s: BrainSession): number {
  const v = s.metrics[test.primaryMetric];
  return finite(v) ? v : NaN;
}

/** reference z through the LIVE test (so a corrected anchor rescores history), else the stored copy */
export function refZOf(test: BrainTestDefinition | undefined, s: BrainSession): number | null {
  if (test) {
    if (!test.reference) return null;
    try {
      const z = test.reference.z(s.metrics, s.ctx);
      return finite(z) ? z : null;
    } catch {
      return null;
    }
  }
  return finite(s.refZ) ? s.refZ : null;
}

/** z of a bare primary value — reference functions read only the primary metric (+ ctx) */
export function refZOfValue(test: BrainTestDefinition, x: number, ctx: BrainRefContext): number | null {
  if (!test.reference || !finite(x)) return null;
  try {
    const z = test.reference.z({ [test.primaryMetric]: x }, ctx);
    return finite(z) ? z : null;
  } catch {
    return null;
  }
}

export function gradeOf(test: BrainTestDefinition | undefined): ReferenceGrade {
  return test?.reference?.grade ?? 'P';
}

/** local minutes since midnight at the run's own time-zone offset */
function minuteOfDay(s: BrainSession): number {
  return (((Math.floor(s.finishedAt / 60000) + s.tzOffset) % 1440) + 1440) % 1440;
}

/** Monday 00:00 (local) of the ISO week containing `ts`, as 'YYYY-MM-DD' */
export function isoWeekStart(ts: number): string {
  const d = new Date(ts);
  const back = (d.getDay() + 6) % 7;
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime());
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days).getTime());
}

/** ordinary least-squares slope of y over 0..n−1 */
function olsSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (ys[i] - my);
    den += (i - mx) ** 2;
  }
  return den ? num / den : 0;
}

/** Theil–Sen slope: the median of all pairwise slopes (robust to outliers) */
export function theilSen(points: { t: number; x: number }[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dt = points[j].t - points[i].t;
      if (dt !== 0) slopes.push((points[j].x - points[i].x) / dt);
    }
  }
  return slopes.length ? median(slopes) : 0;
}

/** exponentially weighted moving average (display only, §2.7) */
export function ewma(xs: number[], lambda = EWMA_LAMBDA): number[] {
  const out: number[] = [];
  let e = NaN;
  for (const x of xs) {
    e = Number.isFinite(e) ? lambda * x + (1 - lambda) * e : x;
    out.push(e);
  }
  return out;
}

/* ---------- segments & run classification (§2.3, C6) ---------- */

export function segmentOf(s: BrainSession, resets: BrainStore['resets']): string {
  let epoch = 0;
  for (const r of resets) if (r.testId === s.testId && r.at <= s.finishedAt && r.at > epoch) epoch = r.at;
  return `${s.device.key}|p${s.protocolVersion}|r${epoch}`;
}

export interface ClassifiedRun {
  s: BrainSession;
  role: BrainRunType;
  segment: string;
  /** primary metric (NaN for an invalid run that lacks it) */
  x: number;
}

/** scored = the runs that feed personal statistics */
export const isScored = (r: ClassifiedRun) => r.role === 'baseline' || r.role === 'tracking';

/**
 * Classify every run of one test, chronologically:
 *  - invalid runs are 'invalid' (they still use up one of the day's two
 *    attempts once the run-in is over);
 *  - the first R valid runs are 'run-in' (exempt from the day rule, so they
 *    can be done back to back on day 1);
 *  - after that, each local day's score is its first valid run among the
 *    first two attempts (C6); any other valid run that day is 'practice';
 *  - a segment's first 5 scored runs are its 'baseline' (or exactly the runs a
 *    stored baseline names), the rest 'tracking'.
 */
export function classifyRuns(
  test: BrainTestDefinition,
  sessions: BrainSession[],
  resets: BrainStore['resets'],
  stored: BrainBaseline[] = []
): ClassifiedRun[] {
  const sorted = sessions.filter((s) => s.testId === test.id).sort((a, b) => a.finishedAt - b.finishedAt);
  const storedBySeg = new Map(stored.filter((b) => b.testId === test.id).map((b) => [b.segment, b]));
  const out: ClassifiedRun[] = [];
  let runIn = 0;
  const days = new Map<string, { attempts: number; scored: boolean }>();
  const baselineCount = new Map<string, number>();
  for (const s of sorted) {
    const segment = segmentOf(s, resets);
    const x = primaryOf(test, s);
    const valid = s.valid && finite(x);
    if (valid && runIn < test.runIn) {
      runIn++;
      out.push({ s, role: 'run-in', segment, x });
      continue;
    }
    if (runIn < test.runIn) {
      out.push({ s, role: 'invalid', segment, x });
      continue;
    }
    const day = days.get(s.date) ?? { attempts: 0, scored: false };
    days.set(s.date, day);
    if (!valid) {
      day.attempts++;
      out.push({ s, role: 'invalid', segment, x });
      continue;
    }
    if (day.scored || day.attempts >= 2) {
      out.push({ s, role: 'practice', segment, x });
      continue;
    }
    day.scored = true;
    day.attempts++;
    const st = storedBySeg.get(segment);
    let role: BrainRunType;
    if (st) {
      role = st.sessionIds.includes(s.id) ? 'baseline' : 'tracking';
    } else {
      const n = baselineCount.get(segment) ?? 0;
      baselineCount.set(segment, n + 1);
      role = n < BASELINE_N ? 'baseline' : 'tracking';
    }
    out.push({ s, role, segment, x });
  }
  return out;
}

/* ---------- baseline & personal noise (§2.3, §2.4) ---------- */

export interface TestBaseline {
  value: number;
  sigma: number;
  segment: string;
  frozenAt: number;
  sessionIds: string[];
  /** true when it came from the store (it can outlive capped runs) */
  stored: boolean;
}

function noiseFloor(test: BrainTestDefinition, base: number): number {
  return 'abs' in test.noiseFloor ? test.noiseFloor.abs : Math.abs(base) * test.noiseFloor.relative;
}

/**
 * σ_w = max(floor, 1.4826 × MAD(residuals)): residuals against the baseline
 * while the segment is young, against a centred 7-run rolling median from 10
 * scored runs on (robust to a trend).
 */
export function personalSigma(test: BrainTestDefinition, scored: ClassifiedRun[], base: number): number {
  const xs = scored.map((r) => r.x);
  let residuals: number[];
  if (xs.length >= 10) {
    residuals = xs.map((x, i) => x - median(xs.slice(Math.max(0, i - 3), Math.min(xs.length, i + 4))));
  } else {
    residuals = scored.filter((r) => r.role === 'baseline').map((r) => r.x - base);
  }
  const est = robustSd(residuals);
  return Math.max(noiseFloor(test, base), finite(est) ? est : 0);
}

/** the segment's baseline: the stored frozen one, else computed once 5 scored runs exist */
export function baselineFor(
  test: BrainTestDefinition,
  segRuns: ClassifiedRun[],
  stored?: BrainBaseline
): TestBaseline | null {
  const scored = segRuns.filter(isScored);
  if (stored) {
    // §2.11: σ_w is stored WITH the baseline so capping can never destroy it.
    // Once the cap has dropped baseline runs and the segment is too young for
    // the rolling-median residuals, the live estimate is missing its inputs
    // (it would fall to the floor and inflate every verdict z) — keep the
    // frozen σ_w instead.
    const live = scored.length >= 10 || scored.filter((r) => r.role === 'baseline').length >= BASELINE_N;
    return {
      value: stored.value,
      sigma: live ? personalSigma(test, scored, stored.value) : Math.max(noiseFloor(test, stored.value), stored.sigma),
      segment: stored.segment,
      frozenAt: stored.frozenAt,
      sessionIds: stored.sessionIds,
      stored: true
    };
  }
  const base = scored.filter((r) => r.role === 'baseline');
  if (base.length < BASELINE_N) return null;
  const value = median(base.map((r) => r.x));
  return {
    value,
    sigma: personalSigma(test, scored, value),
    segment: base[0].segment,
    frozenAt: base[base.length - 1].s.finishedAt,
    sessionIds: base.map((r) => r.s.id),
    stored: false
  };
}

/* ---------- today vs typical (§2.5) ---------- */

export type StateLabel = 'within' | 'above' | 'below' | 'well-above' | 'well-below';

export interface StateRead {
  z: number;
  label: StateLabel;
  /** the median the run is compared with, and the noise used */
  typical: number;
  sigma: number;
}

export function stateLabel(z: number): StateLabel {
  const a = Math.abs(z);
  if (a < 1) return 'within';
  if (a < 2) return z > 0 ? 'above' : 'below';
  return z > 0 ? 'well-above' : 'well-below';
}

/**
 * Compare one scored run with the median of the (≤14) scored runs on
 * EARLIER days of its segment — only the ones within ±2 h of its time of day
 * when at least 5 such runs exist. Requires a completed baseline.
 */
export function stateOf(run: ClassifiedRun, segRuns: ClassifiedRun[], baseline: TestBaseline | null): StateRead | null {
  if (!baseline || !finite(run.x)) return null;
  const prior = segRuns.filter((r) => isScored(r) && r.s.date < run.s.date).slice(-14);
  if (!prior.length) return null;
  const t = minuteOfDay(run.s);
  const near = prior.filter((r) => {
    const d = Math.abs(minuteOfDay(r.s) - t);
    return Math.min(d, 1440 - d) <= 120;
  });
  const pool = near.length >= 5 ? near : prior;
  const typical = median(pool.map((r) => r.x));
  const z = (run.x - typical) / baseline.sigma;
  return { z, label: stateLabel(z), typical, sigma: baseline.sigma };
}

/* ---------- weekly reliable change (§2.6) ---------- */

export type Verdict =
  | 'none' // no baseline yet
  | 'pending' // baseline set, no completed week to evaluate yet
  | 'within'
  | 'possibly-above'
  | 'possibly-below'
  | 'reliably-above'
  | 'reliably-below';

export interface WeekBlock {
  /** Monday of the ISO week, 'YYYY-MM-DD' */
  start: string;
  k: number;
  mean: number;
  z: number;
}

export interface VerdictResult {
  verdict: Verdict;
  weeks: WeekBlock[];
  /** the week the verdict was evaluated on */
  asOf?: string;
}

/**
 * ISO-week blocks of a segment's tracking runs, completed weeks only, each
 * with z = (x̄_w − B) / (σ_w·√(1/k + 1/n_eff)). "Reliably" needs |z| ≥ 1.96
 * in two CONSECUTIVE calendar weeks; one crossing week is only "possibly";
 * a week without a valid run breaks the chain. Never tested daily.
 */
export function weeklyVerdict(segRuns: ClassifiedRun[], baseline: TestBaseline | null, now: number): VerdictResult {
  if (!baseline) return { verdict: 'none', weeks: [] };
  const current = isoWeekStart(now);
  const groups = new Map<string, number[]>();
  for (const r of segRuns) {
    if (r.role !== 'tracking') continue;
    const w = isoWeekStart(r.s.finishedAt);
    if (w >= current) continue;
    const g = groups.get(w) ?? [];
    g.push(r.x);
    groups.set(w, g);
  }
  const weeks: WeekBlock[] = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([start, xs]) => {
      const m = mean(xs);
      const z = (m - baseline.value) / (baseline.sigma * Math.sqrt(1 / xs.length + 1 / N_EFF));
      return { start, k: xs.length, mean: m, z };
    });
  if (!weeks.length) return { verdict: 'pending', weeks };
  const w1 = weeks[weeks.length - 1];
  const w0 = weeks.length > 1 && weeks[weeks.length - 2].start === addDaysKey(w1.start, -7) ? weeks[weeks.length - 2] : null;
  let verdict: Verdict = 'within';
  if (w1.z >= RELIABLE_Z) verdict = w0 && w0.z >= RELIABLE_Z ? 'reliably-above' : 'possibly-above';
  else if (w1.z <= -RELIABLE_Z) verdict = w0 && w0.z <= -RELIABLE_Z ? 'reliably-below' : 'possibly-below';
  return { verdict, weeks, asOf: w1.start };
}

/* ---------- trend & learning phase (§2.7) ---------- */

export type TrendLabel = 'rising' | 'falling' | 'steady';

/**
 * Four-week trend: Theil–Sen slope over the segment's scored runs from the
 * last 28 days; needs ≥ 8 runs spanning ≥ 21 days; rising/falling only when
 * the 28-day change reaches σ_w.
 */
export function trendOf(segRuns: ClassifiedRun[], sigma: number | null, now: number): TrendLabel | null {
  if (!sigma) return null;
  const recent = segRuns.filter((r) => isScored(r) && r.s.finishedAt >= now - 28 * DAY_MS);
  if (recent.length < 8) return null;
  const span = (recent[recent.length - 1].s.finishedAt - recent[0].s.finishedAt) / DAY_MS;
  if (span < 21) return null;
  const slope = theilSen(recent.map((r) => ({ t: r.s.finishedAt / DAY_MS, x: r.x })));
  const change = slope * 28;
  if (Math.abs(change) < sigma) return 'steady';
  return change > 0 ? 'rising' : 'falling';
}

/**
 * The "learning phase" band: shown until the run-in is complete AND the OLS
 * slope over the last 7 valid runs, times 6, is below σ_w.
 */
export function inLearningPhase(runs: ClassifiedRun[], runInComplete: boolean, sigma: number | null): boolean {
  if (!runInComplete || !sigma) return true;
  const valid = runs.filter((r) => r.role !== 'invalid' && finite(r.x));
  if (valid.length < 7) return true;
  return Math.abs(olsSlope(valid.slice(-7).map((r) => r.x))) * 6 >= sigma;
}

/* ---------- per-test summary ---------- */

export interface TestLevel {
  /** the area level on the reference scale (50 + 10·mean z), grade A–C */
  index: number | null;
  z: number | null;
  /** the personal index (50 + 10·(x̄ − B)/σ_w) — the only level for grade P */
  personal: number | null;
  /** scored runs in the window */
  n: number;
  /** true while there is no scored run yet: show the latest run labelled "Calibrating" */
  calibrating: boolean;
}

export interface TestSummary {
  test: BrainTestDefinition;
  grade: ReferenceGrade;
  /** every run, chronological, all segments */
  runs: ClassifiedRun[];
  /** the current segment (the latest valid run's), and its runs */
  segment: string | null;
  segRuns: ClassifiedRun[];
  runInDone: number;
  runInComplete: boolean;
  baseline: TestBaseline | null;
  /** scored runs toward the current segment's baseline (0..5) */
  baselineProgress: number;
  sigma: number | null;
  /** the latest valid run (any role) and its reference index */
  latest: ClassifiedRun | null;
  latestIndex: number | null;
  level: TestLevel;
  /** today's scored run compared with the typical range */
  today: StateRead | null;
  verdict: VerdictResult;
  trend: TrendLabel | null;
  learningPhase: boolean;
  /** C6: today's score is already taken — another run today is practice */
  scoredToday: boolean;
  lastScoredAt: number | null;
  /** no valid run yet: the next 'test' run starts with first-run practice */
  firstRun: boolean;
}

export function summarizeTest(test: BrainTestDefinition, store: BrainStore, now: number = Date.now()): TestSummary {
  const runs = classifyRuns(test, store.sessions, store.resets, store.baselines);
  const lastValid = [...runs].reverse().find((r) => r.role !== 'invalid') ?? null;
  const segment = lastValid?.segment ?? runs[runs.length - 1]?.segment ?? null;
  const segRuns = segment ? runs.filter((r) => r.segment === segment) : [];
  const runInDone = runs.filter((r) => r.role === 'run-in').length;
  const runInComplete = runInDone >= test.runIn;
  const stored = store.baselines.find((b) => b.testId === test.id && b.segment === segment);
  const baseline = baselineFor(test, segRuns, stored);
  const scored = segRuns.filter(isScored);
  const grade = gradeOf(test);
  const sigma = baseline?.sigma ?? null;

  const windowRuns = scored.filter((r) => r.s.finishedAt >= now - LEVEL_WINDOW_DAYS * DAY_MS);
  const zs = windowRuns.map((r) => refZOf(test, r.s)).filter(finite);
  const z = zs.length ? mean(zs) : null;
  const personal =
    baseline && windowRuns.length ? indexFromZ((mean(windowRuns.map((r) => r.x)) - baseline.value) / baseline.sigma) : null;
  const level: TestLevel = {
    index: z !== null ? indexFromZ(z) : null,
    z,
    personal: personal !== null && finite(personal) ? personal : null,
    n: windowRuns.length,
    calibrating: !scored.length
  };

  const todayKey = dayKey(now);
  const todayRun = scored.find((r) => r.s.date === todayKey) ?? null;
  const latestZ = lastValid ? refZOf(test, lastValid.s) : null;
  return {
    test,
    grade,
    runs,
    segment,
    segRuns,
    runInDone,
    runInComplete,
    baseline,
    baselineProgress: baseline ? BASELINE_N : Math.min(BASELINE_N, scored.length),
    sigma,
    latest: lastValid,
    latestIndex: latestZ !== null ? indexFromZ(latestZ) : null,
    level,
    today: todayRun ? stateOf(todayRun, segRuns, baseline) : null,
    verdict: weeklyVerdict(segRuns, baseline, now),
    trend: trendOf(segRuns, sigma, now),
    learningPhase: inLearningPhase(runs, runInComplete, sigma ?? noiseFloor(test, lastValid?.x ?? 0)),
    scoredToday: runsTakeToday(runs, todayKey, runInComplete),
    lastScoredAt: scored.length ? scored[scored.length - 1].s.finishedAt : null,
    firstRun: !runs.some((r) => r.role !== 'invalid')
  };
}

/** true once a run today can only be practice (score taken, or both attempts used) */
function runsTakeToday(runs: ClassifiedRun[], todayKey: string, runInComplete: boolean): boolean {
  if (!runInComplete) return false;
  // mirror classifyRuns: a day's two attempts only count once the run-in is
  // over, so an invalid run from before the last run-in never used one up
  let after = 0;
  runs.forEach((r, i) => {
    if (r.role === 'run-in') after = i + 1;
  });
  const today = runs.slice(after).filter((r) => r.s.date === todayKey);
  return today.some(isScored) || today.filter((r) => r.role === 'invalid' || isScored(r)).length >= 2;
}

/** a run's index on the scale its area uses: reference for A–C, personal for P */
export function runIndex(summary: TestSummary, run: ClassifiedRun): number | null {
  if (run.role === 'invalid' || !finite(run.x)) return null;
  if (summary.grade !== 'P') {
    const z = refZOf(summary.test, run.s);
    return z !== null ? indexFromZ(z) : null;
  }
  const b = summary.baseline;
  if (!b || run.segment !== b.segment) return null;
  return indexFromZ((run.x - b.value) / b.sigma);
}

/* ---------- areas, the Mean and Today (§2.1, §2.6) ---------- */

export interface AreaSummary {
  domain: BrainDomain;
  /** the area's benchmark (the first test registered for it) */
  test: BrainTestDefinition | undefined;
  summary: TestSummary | null;
  grade: ReferenceGrade;
}

export function summarizeAreas(store: BrainStore, now: number = Date.now()): AreaSummary[] {
  return BRAIN_DOMAINS.map((domain) => {
    const test = benchmarkFor(domain.id);
    return {
      domain,
      test,
      summary: test ? summarizeTest(test, store, now) : null,
      grade: gradeOf(test)
    };
  });
}

export interface MeanSummary {
  /** 50 + 10·mean(area z) — null while any reference-graded area is stale */
  index: number | null;
  /** how many areas the Mean averages (reference-graded areas with a benchmark) */
  m: number;
  /** reference-graded areas with no scored run in the last 14 days */
  missing: BrainDomainId[];
  /** personal-only (grade P) areas, shown beside the Mean, never averaged in */
  personalOnly: BrainDomainId[];
  /** completed ISO weeks with every included area current: the Mean's own series */
  weeks: { start: string; index: number; z: number }[];
  verdict: Verdict;
}

/**
 * The Mean (§2.1): 50 + 10 × the average area z over the m reference-graded
 * areas, shown only while EVERY one of them has a scored run in the last 14
 * days (no composite while a component is missing — Maruff et al. 2013). It
 * is labelled "Mean — average of m areas", never "brain score".
 */
export function meanSummary(areas: AreaSummary[], now: number = Date.now()): MeanSummary {
  const graded = areas.filter((a) => a.test && a.grade !== 'P');
  const personalOnly = areas.filter((a) => a.test && a.grade === 'P').map((a) => a.domain.id);
  const missing = graded.filter((a) => a.summary?.level.z == null).map((a) => a.domain.id);
  const index =
    graded.length && !missing.length ? indexFromZ(mean(graded.map((a) => a.summary!.level.z as number))) : null;

  // the weekly Mean series: each area contributes its weekly mean z, carrying
  // its latest value forward up to 14 days (§2.6)
  const current = isoWeekStart(now);
  const weekStarts = new Set<string>();
  for (const a of graded) for (const r of a.summary?.segRuns ?? []) if (isScored(r)) weekStarts.add(isoWeekStart(r.s.finishedAt));
  const ordered = [...weekStarts].filter((w) => w < current).sort();
  const weeks: MeanSummary['weeks'] = [];
  for (const w of ordered) {
    const [y, m, d] = w.split('-').map(Number);
    const end = new Date(y, m - 1, d + 7).getTime();
    const zs: number[] = [];
    for (const a of graded) {
      const sum = a.summary!;
      const inWeek = sum.segRuns.filter((r) => isScored(r) && isoWeekStart(r.s.finishedAt) === w);
      const pool = inWeek.length
        ? inWeek
        : sum.segRuns.filter((r) => isScored(r) && r.s.finishedAt < end && r.s.finishedAt >= end - 14 * DAY_MS).slice(-1);
      const z = pool.map((r) => refZOf(sum.test, r.s)).filter(finite);
      if (!z.length) break;
      zs.push(mean(z));
    }
    if (zs.length === graded.length && zs.length) {
      const z = mean(zs);
      weeks.push({ start: w, index: indexFromZ(z), z });
    }
  }

  // the Mean's verdict: every included area has a baseline and ≥ 8 weekly values
  let verdict: Verdict = 'none';
  const baseZ = graded.map((a) =>
    a.summary?.baseline ? refZOfValue(a.test!, a.summary.baseline.value, a.summary.latest?.s.ctx ?? { platformOffsetMs: 60, offsetKnown: false }) : null
  );
  if (graded.length && baseZ.every(finite) && weeks.length >= 8) {
    const b = mean(baseZ as number[]);
    const zs = weeks.map((w) => w.z);
    const residuals = zs.map((v, i) => v - median(zs.slice(Math.max(0, i - 2), Math.min(zs.length, i + 3))));
    const s = Math.max(0.05, robustSd(residuals) || 0);
    const z1 = (zs[zs.length - 1] - b) / s;
    const consecutive = weeks.length > 1 && weeks[weeks.length - 2].start === addDaysKey(weeks[weeks.length - 1].start, -7);
    const z0 = consecutive ? (zs[zs.length - 2] - b) / s : 0;
    verdict = 'within';
    if (z1 >= RELIABLE_Z) verdict = z0 >= RELIABLE_Z ? 'reliably-above' : 'possibly-above';
    else if (z1 <= -RELIABLE_Z) verdict = z0 <= -RELIABLE_Z ? 'reliably-below' : 'possibly-below';
  } else if (graded.length && baseZ.every(finite)) {
    verdict = 'pending';
  }
  return { index, m: graded.length, missing, personalOnly, weeks, verdict };
}

/**
 * "Today — compared with your typical range" (§2.1): the mean state z over
 * the state-sensitive areas completed today, shown only with ≥ 3 of them,
 * each with a baseline. Never merged with the Mean.
 */
export function todayComposite(areas: AreaSummary[]): { index: number; n: number; of: number } | null {
  const sensitive = areas.filter((a) => a.test?.stateSensitive);
  const zs = sensitive.map((a) => a.summary?.today?.z).filter(finite);
  if (zs.length < 3) return null;
  return { index: indexFromZ(mean(zs)), n: zs.length, of: sensitive.length };
}

/** strongest / weakest areas by level (reference index, or personal for grade P) */
export function rankAreas(areas: AreaSummary[]): AreaSummary[] {
  const value = (a: AreaSummary) => a.summary?.level.index ?? a.summary?.level.personal ?? null;
  return areas.filter((a) => value(a) !== null).sort((a, b) => (value(b) as number) - (value(a) as number));
}

/* ---------- check-in planning (§2.10, C12) ---------- */

/**
 * Today's battery, in canonical order (registry order — C12): the daily core
 * (perWeek 7: Reaction) plus 2 rotating benchmarks. Tests still in their
 * run-in come first (front-loaded at first use), then the most overdue by
 * cadence (days since the last scored run ÷ the cadence interval). A test
 * whose score is already taken today is skipped.
 */
export function planCheckin(store: BrainStore, now: number = Date.now(), rotating = 2): string[] {
  const sums = BRAIN_TESTS.map((t) => summarizeTest(t, store, now)).filter((s) => !s.scoredToday);
  const core = sums.filter((s) => s.test.perWeek === 7);
  const rest = sums.filter((s) => s.test.perWeek !== 7);
  const urgency = (s: TestSummary) => {
    if (!s.runInComplete) return 1e6 - s.runInDone;
    if (s.lastScoredAt === null) return 1e5;
    return (now - s.lastScoredAt) / DAY_MS / (7 / s.test.perWeek);
  };
  const order = new Map(BRAIN_TESTS.map((t, i) => [t.id, i]));
  const picked = [...rest]
    .sort((a, b) => urgency(b) - urgency(a) || (order.get(a.test.id) ?? 0) - (order.get(b.test.id) ?? 0))
    .slice(0, rotating);
  return [...core, ...picked]
    .sort((a, b) => (order.get(a.test.id) ?? 0) - (order.get(b.test.id) ?? 0))
    .map((s) => s.test.id);
}

/** today's check-in, if one was started */
export function todaysCheckin(store: BrainStore, now: number = Date.now()) {
  const key = dayKey(now);
  return [...store.checkins].reverse().find((c) => c.date === key) ?? null;
}

/** consecutive local days with a completed check-in, ending today or yesterday */
export function checkinStreak(store: BrainStore, now: number = Date.now()): number {
  const days = new Set(store.checkins.filter((c) => c.completedAt).map((c) => c.date));
  let key = dayKey(now);
  if (!days.has(key)) key = addDaysKey(key, -1);
  let n = 0;
  while (days.has(key)) {
    n++;
    key = addDaysKey(key, -1);
  }
  return n;
}

/* ---------- daily state (§2.8) ---------- */

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** total sleep time in minutes: (wake − bed) − awake, across midnight; null if unanswered */
export function sleepMinutes(state: BrainStateReport | undefined): number | null {
  if (!state?.bedTime || !state.wakeTime) return null;
  let span = toMin(state.wakeTime) - toMin(state.bedTime);
  if (span <= 0) span += 1440;
  const tst = span - (state.awakeMin ?? 0);
  return tst > 0 && tst <= 16 * 60 ? tst : null;
}

/** the median sleep of the check-ins in the 14 days before `date` */
export function usualSleep(store: BrainStore, date: string): number | null {
  const from = addDaysKey(date, -14);
  const xs = store.checkins
    .filter((c) => c.date < date && c.date >= from)
    .map((c) => sleepMinutes(c.state))
    .filter(finite);
  return xs.length ? median(xs) : null;
}

export type StateFlag = 'sleepy' | 'short-sleep' | 'high-stress';

/** context flags on a check-in (icons only — flagged runs stay in every analysis) */
export function stateFlags(store: BrainStore, checkin: { date: string; state?: BrainStateReport }): StateFlag[] {
  const st = checkin.state;
  if (!st) return [];
  const out: StateFlag[] = [];
  if ((st.sss ?? 0) >= 5) out.push('sleepy');
  const tst = sleepMinutes(st);
  const usual = usualSleep(store, checkin.date);
  if (tst !== null && (tst < 360 || (usual !== null && tst - usual <= -90))) out.push('short-sleep');
  if ((st.stress ?? 0) >= 4) out.push('high-stress');
  return out;
}

/** the check-in state attached to a run, if any */
export function stateForRun(store: BrainStore, s: BrainSession): BrainStateReport | undefined {
  if (!s.checkinId) return undefined;
  return store.checkins.find((c) => c.id === s.checkinId)?.state;
}

/**
 * An association between sleep and one area (§2.8 "Insights"): scored runs
 * after shorter-than-usual sleep vs the rest, as a difference in σ_w units
 * with a Welch 95% interval. Shown only after ≥ 28 days and ≥ 20 runs with
 * sleep recorded, ≥ 10 per bin, and an interval that excludes 0 — and always
 * phrased as an association, never a cause. (A simplification of the
 * dossier's regression model, documented in SCIENCE.md.)
 */
export function sleepAssociation(store: BrainStore, summary: TestSummary): { diff: number; lo: number; hi: number; nShort: number; nRest: number } | null {
  if (!summary.baseline) return null;
  const rows = summary.segRuns
    .filter(isScored)
    .map((r) => {
      const ci = r.s.checkinId ? store.checkins.find((c) => c.id === r.s.checkinId) : undefined;
      const tst = sleepMinutes(ci?.state);
      const usual = ci ? usualSleep(store, ci.date) : null;
      return tst !== null && usual !== null ? { x: r.x / summary.baseline!.sigma, short: tst - usual <= -60, t: r.s.finishedAt } : null;
    })
    .filter((r): r is { x: number; short: boolean; t: number } => r !== null);
  if (rows.length < 20 || rows[rows.length - 1].t - rows[0].t < 28 * DAY_MS) return null;
  const a = rows.filter((r) => r.short).map((r) => r.x);
  const b = rows.filter((r) => !r.short).map((r) => r.x);
  if (a.length < 10 || b.length < 10) return null;
  const va = a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mean(b)) ** 2, 0) / (b.length - 1);
  const diff = mean(a) - mean(b);
  const se = Math.sqrt(va / a.length + vb / b.length);
  const lo = diff - 1.96 * se;
  const hi = diff + 1.96 * se;
  if (lo <= 0 && hi >= 0) return null;
  return { diff, lo, hi, nShort: a.length, nRest: b.length };
}

/* ---------- training volume (games played per area) ---------- */

/**
 * Finished plays (won or lost — an abandon is not a game played) of each
 * area's training games in the last `days` days, from the game history.
 * Training is never a score; this is context beside the benchmark trend.
 */
export function trainingVolume(history: GameResult[], now: number = Date.now(), days = 7): Record<BrainDomainId, number> {
  const since = now - days * DAY_MS;
  const out = Object.fromEntries(BRAIN_DOMAINS.map((d) => [d.id, 0])) as Record<BrainDomainId, number>;
  for (const r of history) {
    if (r.finishedAt < since || r.outcome === 'abandoned') continue;
    for (const d of BRAIN_DOMAINS) if (d.training.some((t) => t.gameId === r.gameId)) out[d.id]++;
  }
  return out;
}

/* ---------- formatting ---------- */

export function formatMetric(def: BrainMetricDef | undefined, value: number | undefined): string {
  if (!def || !finite(value)) return '—';
  const v = value.toFixed(def.decimals ?? 0);
  return def.unit ? (def.unit === '%' ? `${v}%` : `${v} ${def.unit}`) : v;
}

/* ---------- the write path ---------- */

export interface RecordArgs {
  test: BrainTestDefinition;
  outcome: BrainRunOutcome;
  seed: number;
  startedAt: number;
  finishedAt: number;
  device: BrainDevice;
  ctx: BrainRefContext;
  theme: string;
  checkinId?: string;
}

/**
 * Record one 'test' run: classify it against the stored history, stamp its
 * reference z and versions, freeze the baseline it completes (stored
 * explicitly — §2.11), persist, and hand back the test's new summary for the
 * results screen. Practice-mode runs are never recorded.
 */
export function recordRun(a: RecordArgs): { store: BrainStore; session: BrainSession; summary: TestSummary } {
  const before = loadBrain();
  const metrics: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.outcome.metrics)) if (finite(v)) metrics[k] = v;
  let refZ: number | null = null;
  if (a.test.reference) {
    try {
      const z = a.test.reference.z(metrics, a.ctx);
      refZ = finite(z) ? z : null;
    } catch {
      refZ = null;
    }
  }
  const draft: NewSession = {
    testId: a.test.id,
    domain: a.test.domain,
    finishedAt: a.finishedAt,
    tzOffset: -new Date(a.finishedAt).getTimezoneOffset(),
    durationSec: Math.max(0, Math.round((a.finishedAt - a.startedAt) / 1000)),
    seed: a.seed >>> 0,
    metrics,
    refZ,
    protocolVersion: a.test.protocolVersion,
    scoringVersion: a.test.scoringVersion,
    referenceVersion: a.test.referenceVersion,
    valid: a.outcome.valid,
    ...(a.outcome.flags?.length ? { flags: a.outcome.flags.slice(0, 12) } : {}),
    runType: a.outcome.valid ? 'tracking' : 'invalid',
    device: a.device,
    ctx: a.ctx,
    theme: a.theme,
    ...(a.checkinId ? { checkinId: a.checkinId } : {}),
    ...(a.outcome.trialLog?.length ? { trialLog: a.outcome.trialLog } : {})
  };
  // classify the draft against the existing history to stamp its role
  const id = newBrainId('bs');
  const probe: BrainSession = { ...draft, id, date: dayKey(a.finishedAt) };
  const runs = classifyRuns(a.test, [...before.sessions, probe], before.resets, before.baselines);
  const mine = runs.find((r) => r.s.id === id);
  draft.runType = mine?.role ?? draft.runType;

  // a baseline this run completes is frozen now (and stored explicitly)
  const freeze: BrainBaseline[] = [];
  if (mine && mine.role === 'baseline' && !before.baselines.some((b) => b.testId === a.test.id && b.segment === mine.segment)) {
    const b = baselineFor(a.test, runs.filter((r) => r.segment === mine.segment));
    if (b) freeze.push({ testId: a.test.id, segment: b.segment, value: b.value, sigma: b.sigma, frozenAt: b.frozenAt, sessionIds: b.sessionIds });
  }
  const { store, session } = appendSession({ ...draft, id }, freeze);
  return { store, session, summary: summarizeTest(a.test, store, a.finishedAt) };
}

/** the benchmark a session belongs to, if this build still has it */
export function testOf(s: BrainSession): BrainTestDefinition | undefined {
  return getBrainTest(s.testId);
}
