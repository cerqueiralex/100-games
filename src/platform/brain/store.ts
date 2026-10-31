import type {
  BrainBaseline,
  BrainCheckin,
  BrainDevice,
  BrainRefContext,
  BrainRunType,
  BrainSession,
  BrainSettings,
  BrainStateReport,
  BrainStore
} from './types';
import { readGameData, writeGameData } from '../storage';
import { dayKey } from '../progress/progress';
import { isDateKey } from '../daily/store';

/**
 * The Brain Lab store — `100games.v1.brain`, PERMANENT like the progress
 * store: it survives the 1000-row history cap and Settings → Clear history
 * (a measurement series is the whole point of the module, and a baseline
 * deleted by a history purge would silently restart every trend), and only
 * "Reset everything" sweeps it, through the shared `100games.v1.` prefix.
 *
 * It is also UNTRUSTED input: the same normaliser reads localStorage and a
 * backup file (backup.ts), so a hand-edited or newer-build blob is cleaned
 * field by field rather than cast. One deliberate leniency, the same one the
 * feats list makes: a session naming a test or area this build does not
 * know is KEPT — a file from a newer build must not lose its history to an
 * older reader. Analytics simply skip ids the registry does not have.
 *
 * Writes go through analytics.ts `recordRun`, which classifies the run and
 * freezes baselines; the functions here only persist.
 */

const KEY = 'brain';

/** ~3 years of a 3-test daily check-in; the oldest runs fall off first */
export const SESSION_CAP = 4000;
export const CHECKIN_CAP = 1500;
/** trial logs are kept for each test's newest runs and every baseline run */
export const TRIAL_LOG_KEEP = 12;
const TRIAL_ROWS_MAX = 400;
const TRIAL_COLS_MAX = 12;

export function emptyBrainStore(): BrainStore {
  return { version: 1, sessions: [], checkins: [], baselines: [], resets: [], settings: {} };
}

/* ---------- shape guarding ---------- */

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const str = (v: unknown, max = 200): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0).map((x) => x.slice(0, 80)) : [];

const intIn = (v: unknown, lo: number, hi: number): number | undefined =>
  finite(v) && v >= lo && v <= hi ? Math.round(v) : undefined;

const RUN_TYPES: BrainRunType[] = ['run-in', 'baseline', 'tracking', 'practice', 'invalid'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanMetrics(raw: unknown): Record<string, number> | null {
  if (!isObj(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) if (finite(v)) out[k.slice(0, 60)] = v;
  return out;
}

function cleanTrialLog(raw: unknown): number[][] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw
    .slice(0, TRIAL_ROWS_MAX)
    .filter(Array.isArray)
    .map((row) => (row as unknown[]).slice(0, TRIAL_COLS_MAX).map((x) => (finite(x) ? x : NaN)))
    .filter((row) => row.length > 0 && row.every(Number.isFinite));
  return rows.length ? rows : undefined;
}

function cleanDevice(raw: unknown): BrainDevice {
  const d = isObj(raw) ? raw : {};
  const input = d.input === 'mouse' || d.input === 'pen' ? d.input : 'touch';
  const screen = typeof d.screen === 'string' && /^\d{1,5}x\d{1,5}$/.test(d.screen) ? d.screen : '0x0';
  const dpr = finite(d.dpr) && d.dpr > 0 && d.dpr < 10 ? d.dpr : 1;
  const platform = str(d.platform, 40) ?? 'other';
  return {
    // a missing key is rebuilt from the parts so legacy rows still group
    key: str(d.key, 120) ?? `${input}|${screen}@${dpr}|${platform.split('-')[0]}`,
    input,
    platform,
    ua: str(d.ua, 300) ?? '',
    screen,
    dpr,
    frameMs: finite(d.frameMs) && d.frameMs > 0 && d.frameMs < 1000 ? d.frameMs : 16.7,
    standalone: d.standalone === true
  };
}

function cleanCtx(raw: unknown): BrainRefContext {
  const c = isObj(raw) ? raw : {};
  const age = intIn(c.age, 10, 110);
  return {
    ...(age !== undefined ? { age } : {}),
    platformOffsetMs: finite(c.platformOffsetMs) && c.platformOffsetMs >= 0 && c.platformOffsetMs <= 500 ? c.platformOffsetMs : 60,
    offsetKnown: c.offsetKnown === true
  };
}

function cleanState(raw: unknown): BrainStateReport | undefined {
  if (!isObj(raw)) return undefined;
  const out: BrainStateReport = {};
  const sss = intIn(raw.sss, 1, 7);
  if (sss !== undefined) out.sss = sss;
  if (typeof raw.bedTime === 'string' && HHMM.test(raw.bedTime)) out.bedTime = raw.bedTime;
  if (typeof raw.wakeTime === 'string' && HHMM.test(raw.wakeTime)) out.wakeTime = raw.wakeTime;
  if (finite(raw.awakeMin) && raw.awakeMin >= 0 && raw.awakeMin <= 600) {
    out.awakeMin = Math.round(raw.awakeMin / 15) * 15;
  }
  const q = intIn(raw.sleepQuality, 1, 5);
  if (q !== undefined) out.sleepQuality = q;
  const stress = intIn(raw.stress, 1, 5);
  if (stress !== undefined) out.stress = stress;
  if (raw.caffeine === 0 || raw.caffeine === 1 || raw.caffeine === 2) out.caffeine = raw.caffeine;
  if (typeof raw.exercise === 'boolean') out.exercise = raw.exercise;
  return Object.keys(out).length ? out : undefined;
}

function cleanSession(raw: unknown): BrainSession | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 80);
  const testId = str(raw.testId, 80);
  const domain = str(raw.domain, 40);
  const { finishedAt } = raw;
  if (!id || !testId || !domain) return null;
  // beyond ±8.64e15 ms a Date is invalid and the run's day would be "NaN-NaN-NaN"
  if (!finite(finishedAt) || finishedAt <= 0 || finishedAt > 8.64e15) return null;
  const metrics = cleanMetrics(raw.metrics);
  if (!metrics) return null;
  const flags = strings(raw.flags);
  const trialLog = cleanTrialLog(raw.trialLog);
  const valid = raw.valid === true;
  return {
    id,
    testId,
    domain: domain as BrainSession['domain'],
    finishedAt,
    // the session's OWN timestamp decides its day when the stored key is bad
    date: isDateKey(raw.date) ? raw.date : dayKey(finishedAt),
    tzOffset: finite(raw.tzOffset) && Math.abs(raw.tzOffset) <= 900 ? Math.round(raw.tzOffset) : 0,
    durationSec: finite(raw.durationSec) ? Math.min(3600, Math.max(0, raw.durationSec)) : 0,
    seed: finite(raw.seed) ? raw.seed >>> 0 : 0,
    metrics,
    refZ: finite(raw.refZ) ? raw.refZ : null,
    protocolVersion: finite(raw.protocolVersion) ? Math.max(1, Math.floor(raw.protocolVersion)) : 1,
    scoringVersion: finite(raw.scoringVersion) ? Math.max(1, Math.floor(raw.scoringVersion)) : 1,
    referenceVersion: finite(raw.referenceVersion) ? Math.max(1, Math.floor(raw.referenceVersion)) : 1,
    // only an explicit true counts: a run of unknown validity never feeds a score
    valid,
    ...(flags.length ? { flags } : {}),
    runType: !valid
      ? 'invalid'
      : RUN_TYPES.includes(raw.runType as BrainRunType) && raw.runType !== 'invalid'
        ? (raw.runType as BrainRunType)
        : 'tracking',
    device: cleanDevice(raw.device),
    ctx: cleanCtx(raw.ctx),
    theme: str(raw.theme, 20) ?? 'black',
    ...(str(raw.checkinId, 80) ? { checkinId: str(raw.checkinId, 80) } : {}),
    ...(trialLog ? { trialLog } : {})
  };
}

function cleanCheckin(raw: unknown): BrainCheckin | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 80);
  const { date, startedAt } = raw;
  if (!id) return null;
  if (!isDateKey(date)) return null;
  if (!finite(startedAt) || startedAt <= 0) return null;
  const testIds = strings(raw.testIds);
  if (!testIds.length) return null;
  const state = cleanState(raw.state);
  return {
    id,
    date,
    startedAt,
    ...(finite(raw.completedAt) && raw.completedAt >= startedAt ? { completedAt: raw.completedAt } : {}),
    testIds,
    ...(state ? { state } : {})
  };
}

function cleanBaseline(raw: unknown): BrainBaseline | null {
  if (!isObj(raw)) return null;
  const testId = str(raw.testId, 80);
  const segment = str(raw.segment, 200);
  if (!testId || !segment) return null;
  if (!finite(raw.value) || !finite(raw.sigma) || raw.sigma <= 0) return null;
  if (!finite(raw.frozenAt) || raw.frozenAt <= 0) return null;
  return {
    testId,
    segment,
    value: raw.value,
    sigma: raw.sigma,
    frozenAt: raw.frozenAt,
    sessionIds: strings(raw.sessionIds).slice(0, 10)
  };
}

function cleanSettings(raw: unknown): BrainSettings {
  if (!isObj(raw)) return {};
  const out: BrainSettings = {};
  const year = new Date().getFullYear();
  const by = intIn(raw.birthYear, year - 110, year - 10);
  if (by !== undefined) out.birthYear = by;
  if (finite(raw.introAt) && raw.introAt > 0) out.introAt = raw.introAt;
  return out;
}

/** chronological, de-duplicated by key (the later copy wins), capped to the newest */
function tidy<T>(items: T[], key: (t: T) => string, time: (t: T) => number, cap: number): T[] {
  const byKey = new Map<string, T>();
  for (const it of items) byKey.set(key(it), it);
  return [...byKey.values()].sort((a, b) => time(a) - time(b)).slice(-cap);
}

/** drop trial logs outside each test's newest runs and the baseline runs */
function trimTrialLogs(sessions: BrainSession[], baselines: BrainBaseline[]): BrainSession[] {
  const keep = new Set(baselines.flatMap((b) => b.sessionIds));
  const seen = new Map<string, number>();
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (!s.trialLog) continue;
    const n = (seen.get(s.testId) ?? 0) + 1;
    seen.set(s.testId, n);
    if (n > TRIAL_LOG_KEEP && !keep.has(s.id)) {
      const { trialLog: _drop, ...rest } = s;
      sessions[i] = rest;
    }
  }
  return sessions;
}

/**
 * Clean any stored or imported blob into a valid store. Returns null when
 * there is nothing usable at all (so a backup without Brain Lab data leaves
 * the device's own data untouched).
 */
export function normalizeBrainStore(raw: unknown): BrainStore | null {
  if (!isObj(raw)) return null;
  if (!Array.isArray(raw.sessions) && !Array.isArray(raw.checkins)) return null;
  const list = <T>(v: unknown, clean: (x: unknown) => T | null): T[] =>
    Array.isArray(v) ? v.map(clean).filter((x): x is T => x !== null) : [];
  const baselines = tidy(
    list(raw.baselines, cleanBaseline),
    (b) => `${b.testId}\u0000${b.segment}`,
    (b) => b.frozenAt,
    500
  );
  const sessions = tidy(list(raw.sessions, cleanSession), (s) => s.id, (s) => s.finishedAt, SESSION_CAP);
  const resets = tidy(
    Array.isArray(raw.resets)
      ? raw.resets
          .filter(isObj)
          .map((r) => ({ testId: str(r.testId, 80), at: r.at }))
          .filter((r): r is { testId: string; at: number } => !!r.testId && finite(r.at) && r.at > 0)
      : [],
    (r) => `${r.testId}\u0000${r.at}`,
    (r) => r.at,
    500
  );
  return {
    version: 1,
    sessions: trimTrialLogs(sessions, baselines),
    checkins: tidy(list(raw.checkins, cleanCheckin), (c) => c.id, (c) => c.startedAt, CHECKIN_CAP),
    baselines,
    resets,
    settings: cleanSettings(raw.settings)
  };
}

/* ---------- persistence ---------- */

export function loadBrain(): BrainStore {
  return normalizeBrainStore(readGameData<unknown>(KEY)) ?? emptyBrainStore();
}

export function saveBrain(store: BrainStore): void {
  writeGameData(KEY, {
    version: 1,
    sessions: trimTrialLogs(store.sessions.slice(-SESSION_CAP), store.baselines),
    checkins: store.checkins.slice(-CHECKIN_CAP),
    baselines: store.baselines,
    resets: store.resets,
    settings: store.settings
  });
}

/** the raw stored blob, for the backup file */
export function exportBrainData(): unknown {
  return readGameData<unknown>(KEY);
}

export const newBrainId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------- writes (each persists and returns the new store) ---------- */

export type NewSession = Omit<BrainSession, 'id' | 'date'> & { id?: string };

/**
 * Append one recorded run. Callers go through analytics.ts `recordRun`,
 * which classifies it and freezes any baseline it completes (passing the id
 * it classified the run under). Closes the run's check-in once every planned
 * test has a run.
 */
export function appendSession(input: NewSession, freeze: BrainBaseline[] = []): { store: BrainStore; session: BrainSession } {
  const store = loadBrain();
  const session: BrainSession = { ...input, id: input.id ?? newBrainId('bs'), date: dayKey(input.finishedAt) };
  store.sessions.push(session);
  for (const b of freeze) {
    const fixed = { ...b, sessionIds: b.sessionIds.slice() };
    if (!store.baselines.some((x) => x.testId === b.testId && x.segment === b.segment)) store.baselines.push(fixed);
  }
  if (session.checkinId) {
    const ci = store.checkins.find((c) => c.id === session.checkinId);
    if (ci && !ci.completedAt) {
      const done = new Set(store.sessions.filter((s) => s.checkinId === ci.id).map((s) => s.testId));
      if (ci.testIds.every((t) => done.has(t))) ci.completedAt = session.finishedAt;
    }
  }
  saveBrain(store);
  return { store: loadBrain(), session };
}

/** persist baselines that froze outside a write (e.g. after an import) */
export function storeBaselines(freeze: BrainBaseline[]): BrainStore {
  const store = loadBrain();
  let changed = false;
  for (const b of freeze) {
    if (!store.baselines.some((x) => x.testId === b.testId && x.segment === b.segment)) {
      store.baselines.push({ ...b, sessionIds: b.sessionIds.slice() });
      changed = true;
    }
  }
  if (changed) saveBrain(store);
  return changed ? loadBrain() : store;
}

/** open a check-in with its planned tests and optional state report */
export function startCheckin(
  testIds: string[],
  state?: BrainStateReport,
  at: number = Date.now()
): { store: BrainStore; checkin: BrainCheckin } {
  const store = loadBrain();
  const clean = cleanState(state);
  const checkin: BrainCheckin = {
    id: newBrainId('ci'),
    date: dayKey(at),
    startedAt: at,
    testIds: testIds.slice(),
    ...(clean ? { state: clean } : {})
  };
  store.checkins.push(checkin);
  saveBrain(store);
  return { store: loadBrain(), checkin };
}

export function setBrainSettings(patch: Partial<BrainSettings>): BrainStore {
  const store = loadBrain();
  store.settings = cleanSettings({ ...store.settings, ...patch });
  if (patch.birthYear === undefined && 'birthYear' in patch) delete store.settings.birthYear;
  saveBrain(store);
  return loadBrain();
}

/**
 * "Reset my baseline" for one test (after an illness or a long break —
 * SCIENCE.md §2.3): starts a new segment, so the next 5 scored runs form a
 * fresh baseline. Old segments stay stored and visible.
 */
export function resetBaseline(testId: string, at: number = Date.now()): BrainStore {
  const store = loadBrain();
  store.resets.push({ testId, at });
  saveBrain(store);
  return loadBrain();
}

/** permanently forget every Brain Lab run and check-in (the dashboard's own reset) */
export function clearBrain(): BrainStore {
  const keep = loadBrain().settings;
  const fresh = { ...emptyBrainStore(), settings: keep };
  saveBrain(fresh);
  return fresh;
}
