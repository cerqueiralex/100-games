import { useEffect, useRef } from 'react';
import type { BrainCheckin, BrainDomainId, BrainSession, BrainStore, BrainTestDefinition, BrainTestProps } from './types';
import { BRAIN_TESTS, benchmarkFor } from './registry';
import { BRAIN_DOMAINS } from './domains';
import { classifyRuns, baselineFor } from './analytics';
import { emptyBrainStore, saveBrain } from './store';
import { rng, zFrom } from './timing';
import { dayKey } from '../progress/progress';

/**
 * DEV-ONLY fixture: `/?brainFixture=1` registers a stub benchmark per area
 * (only while the real registry is empty) and, when the store is empty,
 * seeds ~60 days of realistic synthetic runs and check-ins — recorded under
 * each area's REAL benchmark (its id, primary metric and reference anchor)
 * once one is registered, under the stub otherwise — so the Brain
 * Lab tab and the dashboard can be built and screenshotted before (or
 * without) real data. `/?brainFixture=fresh` registers the stubs over an
 * EMPTY store (the first-open experience). main.tsx loads this only under
 * `import.meta.env.DEV`; it never ships.
 */

interface StubSpec {
  domain: BrainDomainId;
  id: string;
  name: string;
  metric: string;
  label: string;
  unit?: string;
  decimals: number;
  mu: number | null; // null → grade P
  sigma: number;
  runIn: 1 | 2 | 3;
  perWeek: 1 | 2 | 7;
  floor: { abs: number } | { relative: number };
  practiceProne: boolean;
  stateSensitive: boolean;
  interruption: 'A' | 'B';
  /** personal level in reference z, practice gain in z */
  level: number;
  gain: number;
}

const SPECS: StubSpec[] = [
  { domain: 'reaction', id: 'fx-reaction', name: 'Alertness Check', metric: 'speed', label: 'Response speed', unit: '/s', decimals: 2, mu: 3.7, sigma: 0.37, runIn: 1, perWeek: 7, floor: { abs: 0.16 }, practiceProne: false, stateSensitive: true, interruption: 'A', level: 0.2, gain: 0 },
  { domain: 'speed', id: 'fx-speed', name: 'Symbol Coding', metric: 'sds90', label: 'Correct in 90 s', decimals: 0, mu: 54, sigma: 9, runIn: 3, perWeek: 2, floor: { abs: 3.1 }, practiceProne: true, stateSensitive: true, interruption: 'A', level: 0.4, gain: 0.6 },
  { domain: 'attention', id: 'fx-attention', name: 'Arrow Squared', metric: 'net', label: 'Net score', decimals: 0, mu: 40.43, sigma: 14.17, runIn: 2, perWeek: 2, floor: { abs: 7.2 }, practiceProne: false, stateSensitive: true, interruption: 'A', level: -0.2, gain: 0.1 },
  { domain: 'flexibility', id: 'fx-flexibility', name: 'Shape–Color Switch', metric: 'lnRcs', label: 'ln rate-correct', decimals: 3, mu: null, sigma: 0.08, runIn: 3, perWeek: 2, floor: { abs: 0.05 }, practiceProne: true, stateSensitive: false, interruption: 'A', level: 0, gain: 0.5 },
  { domain: 'memory', id: 'fx-memory', name: 'Block Span', metric: 'mns', label: 'Mean span', unit: 'items', decimals: 2, mu: 5.27, sigma: 1.01, runIn: 2, perWeek: 2, floor: { abs: 0.4 }, practiceProne: false, stateSensitive: true, interruption: 'B', level: 0.5, gain: 0.15 },
  { domain: 'calculation', id: 'fx-calculation', name: 'Arithmetic Sprint', metric: 'cpm', label: 'Correct per minute', unit: '/min', decimals: 1, mu: 10.1, sigma: 4, runIn: 3, perWeek: 2, floor: { abs: 1.7 }, practiceProne: true, stateSensitive: false, interruption: 'A', level: 0.8, gain: 0.5 },
  { domain: 'spatial', id: 'fx-spatial', name: 'Mirror Twins', metric: 'rcs', label: 'Correct per minute', unit: '/min', decimals: 1, mu: 20.4, sigma: 6, runIn: 3, perWeek: 2, floor: { relative: 0.05 }, practiceProne: true, stateSensitive: false, interruption: 'B', level: -0.4, gain: 0.7 },
  { domain: 'precision', id: 'fx-precision', name: 'Target Ring', metric: 'tp', label: 'Throughput', unit: 'bits/s', decimals: 2, mu: 6.39, sigma: 0.9, runIn: 1, perWeek: 1, floor: { relative: 0.03 }, practiceProne: false, stateSensitive: false, interruption: 'B', level: 0.1, gain: 0.05 },
  { domain: 'analysis', id: 'fx-analysis', name: 'Matrix Reasoning', metric: 'theta', label: 'Ability (θ)', unit: 'logits', decimals: 2, mu: 0, sigma: 1, runIn: 3, perWeek: 1, floor: { abs: 0.55 }, practiceProne: true, stateSensitive: false, interruption: 'B', level: 0.6, gain: 0.4 }
];

/** a placeholder benchmark: tap to finish with a plausible score */
function StubTest(spec: StubSpec) {
  return function Stub({ seed, onFinish, onProgress, mode }: BrainTestProps) {
    const done = useRef(false);
    useEffect(() => onProgress(0), [onProgress]);
    const finish = (valid: boolean) => {
      if (done.current) return;
      done.current = true;
      if (mode === 'practice') return onFinish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
      const r = rng(seed);
      const z = spec.level + (r() - 0.5) * 0.8;
      const x = spec.mu === null ? -0.1 + z * spec.sigma : spec.mu + z * spec.sigma;
      onProgress(1);
      onFinish({
        metrics: { [spec.metric]: x },
        trials: 30,
        valid,
        ...(valid ? {} : { flags: ['fixture-invalid'] }),
        highlights: [{ label: 'Fixture', value: 'synthetic run' }]
      });
    };
    return (
      <div className="phase-card fx-card" style={{ margin: 'auto' }}>
        <span className="phase-kicker">Dev fixture</span>
        <h3 className="phase-title">{spec.name}</h3>
        <div className="phase-body">A stub benchmark. Finish it to exercise the runner and the dashboard.</div>
        <button type="button" className="primary-btn" data-fixture-finish onClick={() => finish(true)}>
          Finish (valid)
        </button>
        <button type="button" className="pad-tool" data-fixture-invalid onClick={() => finish(false)}>
          Finish (invalid)
        </button>
      </div>
    );
  };
}

function StubDemo() {
  return (
    <div className="demo-stage">
      <div className="demo-canvas" style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center' }}>
        fixture demo
      </div>
    </div>
  );
}

function stubDefinition(spec: StubSpec): BrainTestDefinition {
  return {
    id: spec.id,
    domain: spec.domain,
    name: spec.name,
    paradigm: 'Dev fixture (no real paradigm)',
    tagline: 'A stub benchmark for building the UI.',
    instructions: ['This is a dev fixture.', 'Tap Finish to record a synthetic run.'],
    skills: ['Fixture'],
    durationSec: 120,
    Demo: StubDemo,
    component: StubTest(spec),
    icon: (
      <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
        <rect x="4" y="4" width="40" height="40" rx="12" fill={`var(--play-${BRAIN_DOMAINS.find((d) => d.id === spec.domain)?.slot ?? 14})`} />
      </svg>
    ),
    metrics: [{ id: spec.metric, label: spec.label, unit: spec.unit, better: 'higher', decimals: spec.decimals }],
    primaryMetric: spec.metric,
    reference:
      spec.mu === null
        ? null
        : {
            grade: 'C',
            anchor: 'Dev fixture anchor (synthetic).',
            z: (m) => zFrom(m[spec.metric], spec.mu as number, spec.sigma)
          },
    runIn: spec.runIn,
    noiseFloor: spec.floor,
    practiceProne: spec.practiceProne,
    stateSensitive: spec.stateSensitive,
    interruption: spec.interruption,
    perWeek: spec.perWeek,
    protocolVersion: 1,
    scoringVersion: 1,
    referenceVersion: 1,
    science: {
      summary: 'Dev fixture.',
      scoring: 'Dev fixture.',
      deviations: [],
      references: [
        { label: 'Fixture A', url: 'https://doi.org/10.0000/fixture-a' },
        { label: 'Fixture B', url: 'https://doi.org/10.0000/fixture-b' }
      ]
    }
  };
}

const DAY = 86_400_000;

/** ~60 days of check-ins and runs, ending today, deterministic */
/** the spec as recorded: the area's real benchmark when one is registered (a stub id would read as an unknown test) */
function resolved(spec: StubSpec): StubSpec & { real: BrainTestDefinition | null } {
  const real = benchmarkFor(spec.domain);
  if (!real || real.id === spec.id) return { ...spec, real: null };
  return { ...spec, id: real.id, name: real.name, metric: real.primaryMetric, runIn: real.runIn, perWeek: real.perWeek, practiceProne: real.practiceProne, stateSensitive: real.stateSensitive, interruption: real.interruption, real };
}

export function syntheticStore(days = 60, now: number = Date.now()): BrainStore {
  const r = rng(20261030);
  const specs = SPECS.map(resolved);
  const store = emptyBrainStore();
  store.settings.introAt = now - days * DAY;
  const device = {
    key: 'touch|390x844@3|ios',
    input: 'touch' as const,
    platform: 'ios-safari',
    ua: 'fixture',
    screen: '390x844',
    dpr: 3,
    frameMs: 16.7,
    standalone: true
  };
  const ctx = { platformOffsetMs: 57.6, offsetKnown: true };
  const count = new Map<string, number>();
  const last = new Map<string, number>();
  let n = 0;
  for (let d = days; d >= 0; d--) {
    const day = new Date(now - d * DAY);
    day.setHours(8, 30, 0, 0);
    const t0 = day.getTime();
    if (t0 > now) continue;
    if (r() < 0.12 && d > 0) continue; // skipped day
    const sleepH = 7.3 + (r() - 0.5) * 2.6;
    const bed = 23 * 60 + Math.round((r() - 0.5) * 80);
    const wake = (bed + Math.round(sleepH * 60)) % 1440;
    const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const sleepDev = sleepH - 7.3;
    const checkin: BrainCheckin = {
      id: `ci-fx-${d}`,
      date: dayKey(t0),
      startedAt: t0,
      testIds: [],
      state: {
        sss: Math.max(1, Math.min(7, Math.round(2.6 - sleepDev * 0.8 + (r() - 0.5) * 2))),
        bedTime: hhmm(((bed % 1440) + 1440) % 1440),
        wakeTime: hhmm(wake),
        awakeMin: r() < 0.3 ? 15 : 0,
        sleepQuality: Math.max(1, Math.min(5, Math.round(3.4 + sleepDev * 0.7 + (r() - 0.5)))),
        stress: Math.max(1, Math.min(5, Math.round(2 + (r() - 0.5) * 3))),
        caffeine: r() < 0.6 ? 1 : r() < 0.5 ? 0 : 2,
        exercise: r() < 0.15
      }
    };
    // the day's battery: reaction + two rotating (plus front-loaded run-ins)
    const rotating = specs.filter((s) => s.perWeek !== 7);
    const due = rotating
      .map((s) => ({
        s,
        k:
          (count.get(s.id) ?? 0) < s.runIn
            ? 100
            : (t0 - (last.get(s.id) ?? 0)) / DAY / (7 / s.perWeek) + r() * 0.3
      }))
      .sort((a, b) => b.k - a.k)
      .slice(0, d === days ? 4 : 2)
      .map((x) => x.s);
    for (const s of due) last.set(s.id, t0);
    const battery = [specs[0], ...due];
    checkin.testIds = battery.map((s) => s.id);
    let t = t0 + 40_000;
    for (const s of battery) {
      const runs = (count.get(s.id) ?? 0) + 1;
      count.set(s.id, runs);
      const practice = s.gain * (1 - Math.exp(-runs / 4));
      const sleepEffect = s.stateSensitive ? sleepDev * 0.18 : 0;
      const z = s.level + practice + sleepEffect + (r() - 0.5) * 0.7;
      const x = s.mu === null ? -0.1 + z * s.sigma : s.mu + z * s.sigma;
      const valid = r() > 0.04;
      t += 150_000;
      const session: BrainSession = {
        id: `bs-fx-${n++}`,
        testId: s.id,
        domain: s.domain,
        finishedAt: t,
        date: dayKey(t),
        tzOffset: -new Date(t).getTimezoneOffset(),
        durationSec: 150,
        seed: Math.floor(r() * 2 ** 31),
        metrics: { [s.metric]: x },
        refZ: s.real ? (s.real.reference ? s.real.reference.z({ [s.metric]: x }, ctx) : null) : s.mu === null ? null : (x - s.mu) / s.sigma,
        protocolVersion: 1,
        scoringVersion: 1,
        referenceVersion: 1,
        valid,
        ...(valid ? {} : { flags: ['interrupted'] }),
        runType: valid ? 'tracking' : 'invalid',
        device,
        ctx,
        theme: 'black',
        checkinId: checkin.id
      };
      store.sessions.push(session);
    }
    checkin.completedAt = t;
    store.checkins.push(checkin);
  }
  // stamp roles and freeze baselines exactly as the write path would
  for (const spec of specs) {
    const test = spec.real ?? BRAIN_TESTS.find((x) => x.id === spec.id) ?? stubDefinition(spec);
    const runs = classifyRuns(test, store.sessions, store.resets, []);
    for (const run of runs) run.s.runType = run.role;
    const seg = runs.find((x) => x.role === 'baseline')?.segment;
    const b = seg ? baselineFor(test, runs.filter((x) => x.segment === seg)) : null;
    if (b) store.baselines.push({ testId: spec.id, segment: b.segment, value: b.value, sigma: b.sigma, frozenAt: b.frozenAt, sessionIds: b.sessionIds });
  }
  return store;
}

export function installBrainFixture(mode: string): void {
  if (BRAIN_TESTS.length === 0) for (const s of SPECS) BRAIN_TESTS.push(stubDefinition(s));
  if (mode === 'fresh') {
    saveBrain(emptyBrainStore());
    return;
  }
  const raw = localStorage.getItem('100games.v1.brain');
  const hasData = !!raw && raw.includes('"sessions":[{');
  if (!hasData || mode === 'reseed') saveBrain(syntheticStore());
}
