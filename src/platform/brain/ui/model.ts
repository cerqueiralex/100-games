import type { BrainDomainId, BrainStore, BrainTestDefinition } from '../types';
import type { AreaSummary, ClassifiedRun, TestSummary } from '../analytics';
import { BASELINE_N, isScored, refZOfValue, runIndex } from '../analytics';
import { getBrainTest } from '../registry';
import { indexFromZ } from '../timing';

/**
 * View-model helpers shared by the Brain Lab tab, the area page, the runner
 * and the check-in. Pure functions over the analytics summaries — no React,
 * no storage — so every surface derives "what to show for an area" the same
 * way (SCIENCE.md §2.1, §2.9: what may be shown, and when).
 */

const DAY_MS = 86_400_000;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export type AreaState =
  /** a level from scored runs in the last 14 days */
  | 'level'
  /** only run-in runs so far: the latest session index, labelled "Calibrating" */
  | 'calibrating'
  /**
   * personal-only (grade P) area, calibration done, its baseline still
   * forming: no index exists yet BY DEFINITION (a personal index is measured
   * from the frozen baseline — SCIENCE.md §2.1, §2.9), so the area shows how
   * far along the baseline is — never "lapsed"
   */
  | 'forming'
  /** scored before, but nothing in the last 14 days — the level has lapsed */
  | 'stale'
  /** never measured (or the area has no benchmark in this build) */
  | 'none';

export interface AreaView {
  state: AreaState;
  /** the number to print (null = nothing honest to print) */
  value: number | null;
  /** true when `value` is a personal index (grade P), never a reference one */
  personal: boolean;
  runInDone: number;
  runIn: number;
  /** scored runs toward the current baseline, 0..5 */
  baselineProgress: number;
  hasBaseline: boolean;
}

/** what an area card / radar vertex shows (SCIENCE.md §2.1 "Area level", §2.9) */
export function areaView(a: AreaSummary): AreaView {
  const s = a.summary;
  const runIn = a.test?.runIn ?? 0;
  if (!s || !a.test) {
    return { state: 'none', value: null, personal: false, runInDone: 0, runIn, baselineProgress: 0, hasBaseline: false };
  }
  const base = {
    runInDone: s.runInDone,
    runIn,
    baselineProgress: s.baselineProgress,
    hasBaseline: !!s.baseline
  };
  if (a.grade === 'P') {
    if (finite(s.level.personal)) return { state: 'level', value: s.level.personal, personal: true, ...base };
    if (s.latest && s.runInComplete && !s.baseline) return { state: 'forming', value: null, personal: true, ...base };
  } else if (finite(s.level.index)) {
    return { state: 'level', value: s.level.index, personal: false, ...base };
  }
  if (!s.latest) return { state: 'none', value: null, personal: a.grade === 'P', ...base };
  if (s.level.calibrating) {
    // grade P has no index until a baseline exists — print nothing rather than invent one
    return { state: 'calibrating', value: a.grade === 'P' ? null : s.latestIndex, personal: false, ...base };
  }
  return { state: 'stale', value: a.grade === 'P' ? null : s.latestIndex, personal: a.grade === 'P', ...base };
}

/** the radar's 'current' value: a live level only (stale and calibrating leave a gap — no fake zero) */
export function radarValue(a: AreaSummary): number | null {
  const v = areaView(a);
  return v.state === 'level' ? v.value : null;
}

/**
 * The radar's dashed baseline: the frozen baseline on the same scale as the
 * level — the reference index of B for graded areas, 50 by definition for a
 * personal (grade P) index.
 */
export function baselineValue(a: AreaSummary): number | null {
  const s = a.summary;
  if (!s?.baseline || !a.test) return null;
  if (a.grade === 'P') return 50;
  const ctx = s.latest?.s.ctx ?? { platformOffsetMs: 60, offsetKnown: false };
  const z = refZOfValue(a.test, s.baseline.value, ctx);
  return finite(z) ? indexFromZ(z) : null;
}

/** days since the last scored run, or null */
export function daysSinceScored(s: TestSummary, now: number): number | null {
  return s.lastScoredAt === null ? null : (now - s.lastScoredAt) / DAY_MS;
}

/**
 * The "due" dot (SCIENCE.md §2.10 cadence): calibration still to finish, or
 * at least one cadence interval (7 / perWeek days) since the last scored run
 * — never when today's score for the area is already taken.
 */
export function isDue(s: TestSummary | null, now: number): boolean {
  // never measured: the card already says so — a wall of "due" dots on day one is noise
  if (!s || s.scoredToday || s.firstRun) return false;
  if (!s.runInComplete) return true;
  const d = daysSinceScored(s, now);
  return d === null || d >= 7 / s.test.perWeek - 0.25;
}

/** estimated minutes for a battery (plus ~25 s of state questions when asked) */
export function batteryMinutes(testIds: string[], withQuestions = true): number {
  const sec = testIds.reduce((t, id) => t + (getBrainTest(id)?.durationSec ?? 120), 0) + (withQuestions ? 25 : 0);
  return Math.max(1, Math.round(sec / 60));
}

/** valid runs of the current segment, newest last (run-in, baseline, tracking — not practice) */
export function trackRuns(s: TestSummary): ClassifiedRun[] {
  return s.segRuns.filter((r) => r.role === 'run-in' || isScored(r));
}

/** recent primary-metric values for a sparkline (raw metric — every primary metric is higher-is-better) */
export function sparkPoints(s: TestSummary | null, n = 12): { x: number; hollow: boolean }[] {
  if (!s) return [];
  return trackRuns(s)
    .slice(-n)
    .filter((r) => finite(r.x))
    .map((r) => ({ x: r.x, hollow: r.role === 'run-in' }));
}

/** a run's index on its area's scale (reference for A–C, personal for P after the baseline) */
export function indexOfRun(s: TestSummary, r: ClassifiedRun): number | null {
  return runIndex(s, r);
}

/** "Calibrating 1/3", "Baseline forming 2/5", "Baseline set" */
export function baselineStatus(s: TestSummary | null, test?: BrainTestDefinition): { label: string; done: number; total: number; phase: 'calibrating' | 'forming' | 'set' | 'none' } {
  const runIn = test?.runIn ?? s?.test.runIn ?? 1;
  if (!s || !s.runs.some((r) => r.role !== 'invalid')) return { label: 'Not measured yet', done: 0, total: runIn, phase: 'none' };
  if (!s.runInComplete) return { label: `Calibrating ${s.runInDone}/${runIn}`, done: s.runInDone, total: runIn, phase: 'calibrating' };
  if (!s.baseline) {
    return { label: `Baseline forming ${s.baselineProgress}/${BASELINE_N}`, done: s.baselineProgress, total: BASELINE_N, phase: 'forming' };
  }
  return { label: 'Baseline set', done: BASELINE_N, total: BASELINE_N, phase: 'set' };
}

/** the best and the latest primary metric among this test's valid recorded runs */
export function bestAndLast(s: TestSummary | null): { best: number | null; last: number | null; lastAt: number | null; runs: number } {
  if (!s) return { best: null, last: null, lastAt: null, runs: 0 };
  const valid = s.runs.filter((r) => r.role !== 'invalid' && finite(r.x));
  if (!valid.length) return { best: null, last: null, lastAt: null, runs: 0 };
  const latest = valid[valid.length - 1];
  return { best: Math.max(...valid.map((r) => r.x)), last: latest.x, lastAt: latest.s.finishedAt, runs: valid.length };
}

/** the usual time of day this test is taken (median minute of the last scored runs) */
export function usualTime(s: TestSummary | null): string | null {
  if (!s) return null;
  const runs = trackRuns(s).slice(-10);
  if (runs.length < 3) return null;
  const mins = runs
    .map((r) => {
      const d = new Date(r.s.finishedAt);
      return d.getHours() * 60 + d.getMinutes();
    })
    .sort((a, b) => a - b);
  const m = mins[Math.floor(mins.length / 2)];
  const d = new Date();
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** the area ids, weakest first, that have a level — for "Today's training" */
export function weakestAreas(areas: AreaSummary[], ranked: AreaSummary[], n = 2): BrainDomainId[] {
  const out = [...ranked].reverse().map((a) => a.domain.id);
  // too few levels yet: fill with the areas that have training links, in display order
  for (const a of areas) if (out.length < n && !out.includes(a.domain.id) && a.domain.training.length) out.push(a.domain.id);
  return out.filter((id) => areas.find((a) => a.domain.id === id)?.domain.training.length).slice(0, n);
}

/** runs belonging to one check-in, by test id (the latest per test) */
export function checkinRuns(store: BrainStore, checkinId: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of store.sessions) if (s.checkinId === checkinId) m.set(s.testId, s.id);
  return m;
}

/** the session ids already recorded for a check-in's planned tests */
export function remainingTests(store: BrainStore, checkin: { id: string; testIds: string[] }): string[] {
  const done = checkinRuns(store, checkin.id);
  return checkin.testIds.filter((t) => !done.has(t) && getBrainTest(t));
}

/** a short local date ("Fri 30 Oct") */
export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "today", "yesterday", "3 days ago", "12 Oct" */
export function relativeDay(ts: number, now: number): string {
  const a = new Date(ts);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const d = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
