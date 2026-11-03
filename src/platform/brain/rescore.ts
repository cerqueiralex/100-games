import type { BrainBaseline, BrainSession, BrainStore, BrainTestDefinition } from './types';
import { getBrainTest } from './registry';
import { loadBrain, saveBrain } from './store';
import { classifyRuns, baselineFor } from './analytics';

/**
 * Rescoring stored runs when a benchmark's scoring changes (SCIENCE.md §2.3:
 * "changes to the scoring or reference version rescore history … they do not
 * start a new segment"; C13).
 *
 * A test that bumps `scoringVersion` supplies `rescore`, a pure function that
 * rebuilds a run's outcome from its stored trial log under the CURRENT rules.
 * Every stored run recorded under an older version whose log is still kept is
 * re-judged ONCE and the result is PERSISTED — never recomputed on each read,
 * because store.ts trims trial logs after a test's 12 newest runs: a verdict
 * recomputed on read would silently flip back the day its log was trimmed,
 * and every later run would be re-classified behind the player's back.
 *
 * What the rescore can and cannot do:
 *  - a run with no trial log (the runner's own 'interrupted' class-A runs,
 *    logs already trimmed) is left exactly as stored;
 *  - the stored metrics are kept and overwritten by every finite metric the
 *    log reproduces (the primary metric is recomputed, never invented);
 *  - a run that the new rules accept but the old ones discarded is marked
 *    with the 'rescored' flag, so the player can see why it now counts;
 *  - a baseline that the re-judged runs complete is frozen and stored, like
 *    `recordRun` does at write time (§2.11).
 */

export interface RescoreReport {
  /** sessions re-judged under a newer scoring version */
  changed: number;
  /** of those, runs discarded before that count now */
  revived: number;
  /** of those, runs that counted before and no longer do */
  retired: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** re-judge one stored run, or null when it cannot be (unknown test, current version, no log, no rescore) */
export function rescoreSession(s: BrainSession, test: BrainTestDefinition | undefined): BrainSession | null {
  if (!test?.rescore || !(s.scoringVersion < test.scoringVersion) || !s.trialLog?.length) return null;
  let out;
  try {
    out = test.rescore({ trialLog: s.trialLog, metrics: s.metrics, flags: s.flags ?? [], valid: s.valid, scoringVersion: s.scoringVersion });
  } catch {
    out = null;
  }
  if (!out) return null;
  const metrics: Record<string, number> = { ...s.metrics };
  for (const [k, v] of Object.entries(out.metrics)) if (finite(v)) metrics[k] = v;
  const valid = out.valid === true && finite(metrics[test.primaryMetric]);
  const revived = valid && !s.valid;
  const flags = (out.flags ?? []).filter((f) => typeof f === 'string' && f.length > 0).slice(0, revived ? 11 : 12);
  if (revived) flags.push('rescored');
  let refZ: number | null = null;
  if (test.reference) {
    try {
      const z = test.reference.z(metrics, s.ctx);
      refZ = finite(z) ? z : null;
    } catch {
      refZ = null;
    }
  }
  const { flags: _old, ...rest } = s;
  return {
    ...rest,
    metrics,
    refZ,
    valid,
    ...(flags.length ? { flags } : {}),
    // informational (analytics re-derives every role); never 'invalid' on a valid run
    runType: valid ? (s.runType === 'invalid' ? 'tracking' : s.runType) : 'invalid',
    scoringVersion: test.scoringVersion
  };
}

/**
 * Re-judge every stale run of a store (pure: returns a new store when
 * anything changed). `lookup` is the live registry, swappable for validate.
 */
export function rescoreSessions(
  store: BrainStore,
  lookup: (id: string) => BrainTestDefinition | undefined = getBrainTest
): { store: BrainStore; report: RescoreReport } {
  const report: RescoreReport = { changed: 0, revived: 0, retired: 0 };
  const touched = new Set<string>();
  const sessions = store.sessions.map((s) => {
    const next = rescoreSession(s, lookup(s.testId));
    if (!next) return s;
    report.changed++;
    if (next.valid && !s.valid) report.revived++;
    if (!next.valid && s.valid) report.retired++;
    touched.add(s.testId);
    return next;
  });
  if (!report.changed) return { store, report };

  // freeze the baselines the re-judged runs complete (recordRun does this at write time)
  const baselines: BrainBaseline[] = store.baselines.slice();
  for (const id of touched) {
    const test = lookup(id);
    if (!test) continue;
    const runs = classifyRuns(test, sessions, store.resets, baselines);
    const segments = new Set(runs.filter((r) => r.role === 'baseline').map((r) => r.segment));
    for (const segment of segments) {
      if (baselines.some((b) => b.testId === id && b.segment === segment)) continue;
      const b = baselineFor(test, runs.filter((r) => r.segment === segment));
      if (b) baselines.push({ testId: id, segment: b.segment, value: b.value, sigma: b.sigma, frozenAt: b.frozenAt, sessionIds: b.sessionIds });
    }
  }
  return { store: { ...store, sessions, baselines }, report };
}

/**
 * Bring the stored runs up to every benchmark's current scoring version and
 * persist the result. Called once before the first view reads the store (app
 * start) and after a backup import replaced it. Never throws: a failure
 * leaves the store exactly as it was.
 */
export function ensureScoringCurrent(): RescoreReport {
  try {
    const { store, report } = rescoreSessions(loadBrain());
    if (report.changed) saveBrain(store);
    return report;
  } catch (err) {
    console.error('Brain Lab: rescoring stored runs failed', err);
    return { changed: 0, revived: 0, retired: 0 };
  }
}
