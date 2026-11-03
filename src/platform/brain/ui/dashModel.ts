import type {
  BrainDomain,
  BrainRefContext,
  BrainRunType,
  BrainStateReport,
  BrainStore,
  BrainTestDefinition,
  ReferenceGrade
} from '../types';
import {
  N_EFF,
  RELIABLE_Z,
  ewma,
  isScored,
  refZOfValue,
  sleepMinutes,
  stateFlags,
  usualSleep,
  type AreaSummary,
  type ClassifiedRun,
  type StateFlag,
  type TestSummary
} from '../analytics';
import { indexFromZ, mean } from '../timing';
import { dayKey } from '../../progress/progress';

/**
 * Profile → Brain dashboard view-model: the chart-ready shapes the dashboard
 * draws, derived ONLY from analytics.ts summaries (no statistic is computed
 * here — this file positions what analytics decided). Pure and Node-
 * importable (no DOM at import), like the rest of the module.
 *
 * Every layer follows SCIENCE.md §2.7: each run a dot (run-in inside the
 * "Calibrating" band, practice small, invalid hollow and excluded, other
 * device segments greyed), the weekly-mean progress line (the completed ISO
 * weeks the §2.6 verdict is evaluated on), a display-only EWMA (λ 0.25) and
 * the frozen baseline with its band ±1.96·σ_w·√(1/k̄ + 1/n_eff).
 */

export const DAY_MS = 86_400_000;
const FALLBACK_CTX: BrainRefContext = { platformOffsetMs: 60, offsetKnown: false };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** local midnight of a 'YYYY-MM-DD' key */
export function keyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** the key `days` days after `key` (local calendar arithmetic, DST-safe) */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days).getTime());
}

/** "Today" / "Yesterday" / "Mon, Oct 12" (with the year when it is not this one) */
export function relDay(key: string, todayKey: string): string {
  if (key === todayKey) return 'Today';
  if (key === addDays(todayKey, -1)) return 'Yesterday';
  const d = new Date(keyToMs(key));
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}

export const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const clockTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** "7 h 20 m" */
export function hoursLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return m ? `${h} h ${String(m).padStart(2, '0')} m` : `${h} h`;
}

/* ---------- per-area view ---------- */

export type AreaStatus = 'no-test' | 'unmeasured' | 'calibrating' | 'forming' | 'reset' | 'tracking';

export interface RunDot {
  t: number;
  /** primary metric; NaN for an invalid run that never produced one */
  x: number;
  role: BrainRunType;
  /** in the segment the statistics are computed on (else greyed) */
  current: boolean;
  run: ClassifiedRun;
}

export interface AreaView {
  domain: BrainDomain;
  test?: BrainTestDefinition;
  sum: TestSummary | null;
  grade: ReferenceGrade;
  status: AreaStatus;
  /** the number on the card, and what it is */
  level: number | null;
  levelKind: 'reference' | 'personal' | 'calibrating' | 'forming' | 'stale' | null;
  /** the frozen baseline on the area's index scale (radar's baseline polygon) */
  baselineIndex: number | null;
  dots: RunDot[];
  /** completed ISO weeks (the §2.6 blocks), each placed at mid-week */
  weekly: { t: number; x: number; k: number; start: string; z: number }[];
  /** EWMA over the current segment's scored runs — display only */
  smooth: { t: number; x: number }[];
  /** baseline ± the weekly reliable-change band, from the first baseline run on */
  base: { value: number; sigma: number; half: number; kbar: number; from: number } | null;
  /** the time span of the run-in runs ("Calibrating" band) */
  calib: { t0: number; t1: number } | null;
  /** a baseline reset newer than the latest valid run: the next runs start a new segment */
  resetAt: number | null;
  /** the latest valid run (any role) */
  latest: { t: number; x: number } | null;
}

/** the context a reference function should use for this area's baseline value */
export function ctxOf(sum: TestSummary | null): BrainRefContext {
  return sum?.latest?.s.ctx ?? FALLBACK_CTX;
}

export function buildAreaView(a: AreaSummary, store: BrainStore): AreaView {
  const { domain, test, summary: sum, grade } = a;
  const empty: AreaView = {
    domain,
    test,
    sum,
    grade,
    status: test ? 'unmeasured' : 'no-test',
    level: null,
    levelKind: null,
    baselineIndex: null,
    dots: [],
    weekly: [],
    smooth: [],
    base: null,
    calib: null,
    resetAt: null,
    latest: null
  };
  if (!test || !sum || !sum.runs.length) return empty;

  const latestT = sum.latest?.s.finishedAt ?? 0;
  const reset = store.resets
    .filter((r) => r.testId === test.id && r.at > latestT)
    .reduce<number | null>((m, r) => (m === null || r.at > m ? r.at : m), null);

  let status: AreaStatus;
  if (reset !== null) status = 'reset';
  else if (!sum.runInComplete) status = 'calibrating';
  else if (!sum.baseline) status = 'forming';
  else status = 'tracking';

  // the card's number (SCIENCE.md §2.1): the 14-day level; before the run-in
  // is complete, the latest run's index labelled "Calibrating"
  let level: number | null = null;
  let levelKind: AreaView['levelKind'] = null;
  if (status === 'calibrating') {
    if (sum.latestIndex !== null) {
      level = sum.latestIndex;
      levelKind = 'calibrating';
    }
  } else if (grade !== 'P' && sum.level.index !== null) {
    level = sum.level.index;
    levelKind = 'reference';
  } else if (grade === 'P' && status !== 'reset' && sum.level.personal !== null) {
    level = sum.level.personal;
    levelKind = 'personal';
  } else if (grade === 'P' && (status === 'forming' || status === 'reset')) {
    // a personal index is measured FROM the frozen baseline, so while it forms there is none
    // by definition (SCIENCE.md §2.9) — that is progress to show, never a lapsed level
    levelKind = 'forming';
  } else if (sum.runs.some(isScored)) {
    levelKind = 'stale';
  }

  const b = status === 'reset' ? null : sum.baseline;
  let baselineIndex: number | null = null;
  if (b) {
    if (grade === 'P') baselineIndex = 50;
    else {
      const z = refZOfValue(test, b.value, ctxOf(sum));
      baselineIndex = z !== null ? indexFromZ(z) : null;
    }
  }

  const dots: RunDot[] = sum.runs.map((r) => ({
    t: r.s.finishedAt,
    x: r.x,
    role: r.role,
    current: r.segment === sum.segment,
    run: r
  }));

  const weekly = sum.verdict.weeks.map((w) => ({
    t: keyToMs(w.start) + 3.5 * DAY_MS,
    x: w.mean,
    k: w.k,
    start: w.start,
    z: w.z
  }));

  const scored = sum.segRuns.filter(isScored);
  const sm = ewma(scored.map((r) => r.x));
  const smooth = scored.map((r, i) => ({ t: r.s.finishedAt, x: sm[i] }));

  let base: AreaView['base'] = null;
  if (b) {
    // k̄: the mean sessions per evaluated week; before any week is evaluated,
    // the test's own cadence (the k a typical week will have)
    const kbar = weekly.length ? mean(weekly.map((w) => w.k)) : test.perWeek;
    const half = RELIABLE_Z * b.sigma * Math.sqrt(1 / kbar + 1 / N_EFF);
    const firstBase = sum.runs.filter((r) => b.sessionIds.includes(r.s.id)).map((r) => r.s.finishedAt);
    base = { value: b.value, sigma: b.sigma, half, kbar, from: firstBase.length ? Math.min(...firstBase) : b.frozenAt };
  }

  const runIn = sum.runs.filter((r) => r.role === 'run-in');
  const calib = runIn.length ? { t0: runIn[0].s.finishedAt, t1: runIn[runIn.length - 1].s.finishedAt } : null;

  return {
    domain,
    test,
    sum,
    grade,
    status,
    level,
    levelKind,
    baselineIndex,
    dots,
    // after a reset the old segment's weekly blocks and smoothing describe a
    // baseline that no longer applies — only the dots stay
    weekly: status === 'reset' ? [] : weekly,
    smooth: status === 'reset' ? [] : smooth,
    base,
    calib,
    resetAt: reset,
    latest: sum.latest ? { t: sum.latest.s.finishedAt, x: sum.latest.x } : null
  };
}

/** the y-extent every layer of an area chart needs (dots in range, band, lines) */
export function areaExtent(v: AreaView, t0: number, t1: number): [number, number] | null {
  const xs: number[] = [];
  for (const d of v.dots) if (finite(d.x) && d.t >= t0 && d.t <= t1) xs.push(d.x);
  for (const w of v.weekly) if (w.t >= t0 && w.t <= t1) xs.push(w.x);
  if (v.base) xs.push(v.base.value - v.base.half, v.base.value + v.base.half);
  if (!xs.length) return null;
  let lo = Math.min(...xs);
  let hi = Math.max(...xs);
  if (hi - lo < 1e-9) {
    const pad = Math.abs(hi) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

/** the Mean's own baseline (§2.6): the average of the included areas' baselines, in z */
export function meanBaselineIndex(areas: AreaSummary[]): number | null {
  const graded = areas.filter((a) => a.test && a.grade !== 'P');
  if (!graded.length) return null;
  const zs: number[] = [];
  for (const a of graded) {
    const b = a.summary?.baseline;
    if (!b || !a.test) return null;
    const z = refZOfValue(a.test, b.value, ctxOf(a.summary));
    if (z === null) return null;
    zs.push(z);
  }
  return indexFromZ(mean(zs));
}

/* ---------- segments (§2.3) ---------- */

export interface SegmentRow {
  segment: string;
  from: number;
  to: number;
  runs: number;
  valid: number;
  input: string;
  screen: string;
  platform: string;
  protocol: number;
  resetAt: number | null;
  current: boolean;
}

export function segmentRows(sum: TestSummary): SegmentRow[] {
  const groups = new Map<string, ClassifiedRun[]>();
  for (const r of sum.runs) {
    const g = groups.get(r.segment) ?? [];
    g.push(r);
    groups.set(r.segment, g);
  }
  return [...groups.entries()]
    .map(([segment, rs]) => {
      const s = rs[0].s;
      const epoch = Number(segment.slice(segment.lastIndexOf('|r') + 2));
      return {
        segment,
        from: rs[0].s.finishedAt,
        to: rs[rs.length - 1].s.finishedAt,
        runs: rs.length,
        valid: rs.filter((r) => r.role !== 'invalid').length,
        input: s.device.input,
        screen: s.device.screen,
        platform: s.device.platform,
        protocol: s.protocolVersion,
        resetAt: finite(epoch) && epoch > 0 ? epoch : null,
        current: segment === sum.segment
      };
    })
    .sort((a, b) => b.from - a.from);
}

/* ---------- check-ins ---------- */

export type CheckinMark = 'done' | 'started';

/** one mark per local day: completed wins over merely started */
export function checkinMarks(store: BrainStore): Map<string, CheckinMark> {
  const out = new Map<string, CheckinMark>();
  for (const c of store.checkins) {
    if (c.completedAt) out.set(c.date, 'done');
    else if (!out.has(c.date)) out.set(c.date, 'started');
  }
  return out;
}

/** the longest run of consecutive completed check-in days, ever */
export function longestCheckinStreak(marks: Map<string, CheckinMark>): number {
  const days = [...marks.entries()].filter(([, m]) => m === 'done').map(([k]) => k).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of days) {
    run = prev !== null && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/* ---------- daily context rows (sleep, state, reaction) ---------- */

export interface DayRow {
  key: string;
  t: number;
  checkedIn: boolean;
  sleep: number | null;
  usual: number | null;
  sss: number | null;
  stress: number | null;
  flags: StateFlag[];
  /** the day's scored Reaction run (or its calibrating run), primary metric */
  reaction: number | null;
  reactionRole: BrainRunType | null;
}

/**
 * The last `days` local days, oldest first. A day's state is its latest
 * check-in that carries one; the Reaction value is that day's scored run,
 * else a calibrating run (drawn hollow) — practice and invalid runs never
 * plot as a day's value.
 */
export function dayRows(store: BrainStore, reaction: TestSummary | null, todayKey: string, days: number): DayRow[] {
  const byDay = new Map<string, { date: string; state?: BrainStateReport }>();
  for (const c of store.checkins) if (c.state) byDay.set(c.date, c);
  const checked = new Set(store.checkins.map((c) => c.date));
  const reactByDay = new Map<string, ClassifiedRun>();
  for (const r of reaction?.segRuns ?? []) {
    if (!finite(r.x)) continue;
    const prev = reactByDay.get(r.s.date);
    if (isScored(r)) reactByDay.set(r.s.date, r);
    else if (r.role === 'run-in' && !prev) reactByDay.set(r.s.date, r);
  }
  const out: DayRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    const ci = byDay.get(key);
    const st = ci?.state;
    const rr = reactByDay.get(key);
    out.push({
      key,
      t: keyToMs(key),
      checkedIn: checked.has(key),
      sleep: sleepMinutes(st),
      usual: ci ? usualSleep(store, key) : null,
      sss: finite(st?.sss) ? st!.sss! : null,
      stress: finite(st?.stress) ? st!.stress! : null,
      flags: ci ? stateFlags(store, ci) : [],
      reaction: rr ? rr.x : null,
      reactionRole: rr ? rr.role : null
    });
  }
  return out;
}

/** how many answers sit at each point of a 1..n scale */
export function histogram(values: (number | null)[], n: number): number[] {
  const out = new Array<number>(n).fill(0);
  for (const v of values) if (v !== null && v >= 1 && v <= n) out[Math.round(v) - 1]++;
  return out;
}
