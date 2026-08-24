import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../types';
import { GAMES } from '../registry';
import { readGameData, writeGameData } from '../storage';
import { dayKey } from '../progress/progress';
import { assignmentFor } from './rotation';

/**
 * The Daily Challenge store (`100games.v1.daily`).
 *
 * Two very different lifetimes live here on purpose:
 *
 * - `records` is a LOG, capped like history, one entry per date. An entry is
 *   written the first time a date is opened and is then FROZEN: the rotation
 *   depends on how many games are currently eligible, so re-deriving an old
 *   date after the library grew would hand the player a different game than
 *   the one they actually played. Only a date that has never been assigned
 *   is allowed to use the live rotation.
 * - `streak` is PERMANENT, like the landmark store. Pruning old records must
 *   never cost the player a streak they earned.
 *
 * The day boundary is the device's local midnight — the same `dayKey` the
 * play streak uses. One time convention for the whole app.
 */

const DAILY_KEY = 'daily';

/** how many past days to keep; the streak counters outlive the pruning */
const RECORD_CAP = 365;

export type DailyStatus = 'unplayed' | 'in_progress' | 'completed';

const STATUSES: DailyStatus[] = ['unplayed', 'in_progress', 'completed'];

export interface DailyResult {
  timeSec: number;
  hintsUsed: number;
  assistsUsed: string[];
  /** won with no hints and no assists — the same bar as countsAsBeaten */
  cleanWin: boolean;
  completedAt: string;
  /** finished on the day it was issued; only these extend the streak */
  onTime: boolean;
}

export interface DailyChallengeRecord {
  date: string;
  gameId: string;
  difficulty: Difficulty;
  seed: number;
  status: DailyStatus;
  result?: DailyResult;
}

export interface DailyStreak {
  current: number;
  best: number;
  lastCompletedDate: string | null;
}

export interface DailyChallengeStore {
  records: Record<string, DailyChallengeRecord>;
  streak: DailyStreak;
}

export function emptyDailyStore(): DailyChallengeStore {
  return { records: {}, streak: { current: 0, best: 0, lastCompletedDate: null } };
}

/* ---------- date helpers (local calendar days, DST-safe) ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(y, m - 1, d);
  // rejects 2026-02-31 and friends, which would otherwise roll over silently
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

/** the calendar day before `key`, as a key */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 1);
  const mm = String(prev.getMonth() + 1).padStart(2, '0');
  const dd = String(prev.getDate()).padStart(2, '0');
  return `${prev.getFullYear()}-${mm}-${dd}`;
}

export function todayKey(now: number = Date.now()): string {
  return dayKey(now);
}

/* ---------- shape guarding (a backup file is untrusted input) ---------- */

function cleanCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

function cleanResult(raw: unknown): DailyResult | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<DailyResult>;
  if (typeof r.completedAt !== 'string') return undefined;
  return {
    timeSec: cleanCount(r.timeSec),
    hintsUsed: cleanCount(r.hintsUsed),
    assistsUsed: Array.isArray(r.assistsUsed)
      ? r.assistsUsed.filter((a): a is string => typeof a === 'string')
      : [],
    cleanWin: r.cleanWin === true,
    completedAt: r.completedAt,
    onTime: r.onTime === true
  };
}

/**
 * One record from a stored — and after a backup import, UNTRUSTED — file.
 * A record naming a game this build no longer has is DROPPED rather than
 * kept: the card would have nothing to launch, and a crash on someone
 * else's backup is the worst possible outcome of sharing a profile.
 */
function cleanRecord(raw: unknown): DailyChallengeRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DailyChallengeRecord>;
  if (!isDateKey(r.date)) return null;
  if (typeof r.gameId !== 'string' || !GAMES.some((g) => g.id === r.gameId)) return null;
  if (!DIFFICULTIES.includes(r.difficulty as Difficulty)) return null;
  const status: DailyStatus = STATUSES.includes(r.status as DailyStatus)
    ? (r.status as DailyStatus)
    : 'unplayed';
  const result = cleanResult(r.result);
  return {
    date: r.date,
    gameId: r.gameId,
    difficulty: r.difficulty as Difficulty,
    seed: cleanCount(r.seed),
    // a "completed" record with no usable result would render a card with
    // blank statistics; demote it rather than trust the label
    status: status === 'completed' && !result ? 'unplayed' : status,
    ...(result ? { result } : {})
  };
}

export function normalizeDailyStore(raw: unknown): DailyChallengeStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<DailyChallengeStore>;
  const out = emptyDailyStore();

  if (s.records && typeof s.records === 'object' && !Array.isArray(s.records)) {
    for (const value of Object.values(s.records as Record<string, unknown>)) {
      const rec = cleanRecord(value);
      // key off the record's OWN date, so a tampered key cannot file an
      // entry under a day it does not describe
      if (rec) out.records[rec.date] = rec;
    }
  }

  const streak = s.streak as Partial<DailyStreak> | undefined;
  if (streak && typeof streak === 'object') {
    out.streak.current = cleanCount(streak.current);
    out.streak.best = cleanCount(streak.best);
    out.streak.lastCompletedDate = isDateKey(streak.lastCompletedDate)
      ? streak.lastCompletedDate
      : null;
  }
  // best can never be below current, whatever the file claimed
  out.streak.best = Math.max(out.streak.best, out.streak.current);
  return prune(out);
}

/** keeps the newest RECORD_CAP dates; streak counters are untouched */
function prune(store: DailyChallengeStore): DailyChallengeStore {
  const dates = Object.keys(store.records).sort();
  if (dates.length <= RECORD_CAP) return store;
  for (const date of dates.slice(0, dates.length - RECORD_CAP)) delete store.records[date];
  return store;
}

/* ---------- persistence ---------- */

export function loadDaily(): DailyChallengeStore {
  return normalizeDailyStore(readGameData<DailyChallengeStore>(DAILY_KEY)) ?? emptyDailyStore();
}

export function saveDaily(store: DailyChallengeStore): void {
  writeGameData(DAILY_KEY, prune(store));
}

/**
 * Today's record, assigning (and persisting) it the first time the day is
 * seen. Persisting on first sight is what freezes the assignment: the
 * rotation would otherwise move under the player's feet the next time the
 * eligible list changes.
 *
 * Returns null only when no game is eligible at all.
 */
export function ensureTodayAssigned(now: number = Date.now()): DailyChallengeRecord | null {
  const date = todayKey(now);
  const store = loadDaily();
  const existing = store.records[date];
  if (existing) return existing;

  const assignment = assignmentFor(date);
  if (!assignment) return null;

  const record: DailyChallengeRecord = { date, ...assignment, status: 'unplayed' };
  store.records[date] = record;
  saveDaily(store);
  return record;
}

/** Marks a day's run as started (so the home card can offer "Continue"). */
export function markDailyStarted(date: string): DailyChallengeStore {
  const store = loadDaily();
  const rec = store.records[date];
  if (rec && rec.status === 'unplayed') {
    rec.status = 'in_progress';
    saveDaily(store);
  }
  return store;
}

export interface DailyCompletion {
  timeSec: number;
  hintsUsed: number;
  assistsUsed: string[];
  cleanWin: boolean;
}

/**
 * Records a finished daily run and advances the streak when it earned it.
 *
 * `onTime` is decided HERE, from the clock at completion: someone who starts
 * at 23:58 and finishes at 00:02 finishes the run they started, and it is
 * logged and shareable — it simply does not extend the streak. Same
 * philosophy as a helped win, which still counts as a play but is not a
 * conquest.
 */
export interface DailyCompletionOutcome {
  store: DailyChallengeStore;
  /** this date had never been completed before — the XP for it pays once */
  firstCompletion: boolean;
  /** the streak actually grew (or restarted) on this completion */
  advanced: boolean;
  /** the run counted for the streak, i.e. finished on its own day */
  onTime: boolean;
}

export function completeDaily(
  date: string,
  completion: DailyCompletion,
  now: number = Date.now()
): DailyCompletionOutcome {
  const store = loadDaily();
  const rec = store.records[date];
  if (!rec) return { store, firstCompletion: false, advanced: false, onTime: false };

  const onTime = todayKey(now) === date;
  // a re-run of an already-finished day must never pay the streak twice
  const alreadyCompleted = rec.status === 'completed';

  rec.status = 'completed';
  rec.result = {
    timeSec: Math.max(0, Math.floor(completion.timeSec)),
    hintsUsed: Math.max(0, Math.floor(completion.hintsUsed)),
    assistsUsed: completion.assistsUsed,
    cleanWin: completion.cleanWin,
    completedAt: new Date(now).toISOString(),
    onTime
  };

  let advanced = false;
  if (onTime && !alreadyCompleted) {
    const s = store.streak;
    if (s.lastCompletedDate === date) {
      // nothing: this day already counted
    } else {
      s.current = s.lastCompletedDate === previousDay(date) ? s.current + 1 : 1;
      s.lastCompletedDate = date;
      s.best = Math.max(s.best, s.current);
      advanced = true;
    }
  }

  saveDaily(store);
  return { store, firstCompletion: !alreadyCompleted, advanced, onTime };
}

export interface DailyStreakInfo {
  /** the run that is still alive — 0 once a day has been missed */
  current: number;
  best: number;
  doneToday: boolean;
}

/**
 * The streak as it should be SHOWN. The stored `current` is the run as of
 * `lastCompletedDate`; once that is older than yesterday the run is over,
 * and displaying the stale number would tell the player they still have a
 * streak they have already lost. Mirrors the play streak's "alive but not
 * yet extended" rule.
 */
export function dailyStreakInfo(
  store: DailyChallengeStore,
  today: string = todayKey()
): DailyStreakInfo {
  const last = store.streak.lastCompletedDate;
  const alive = last === today || last === previousDay(today);
  return {
    current: alive ? store.streak.current : 0,
    best: store.streak.best,
    doneToday: last === today
  };
}

/** Past days, newest first — the profile's daily history list. */
export function dailyHistory(store: DailyChallengeStore): DailyChallengeRecord[] {
  return Object.values(store.records).sort((a, b) => b.date.localeCompare(a.date));
}

/** Distinct games ever completed as a daily — drives the daily Collector landmark. */
export function dailyGamesCompleted(store: DailyChallengeStore): string[] {
  const seen = new Set<string>();
  for (const rec of Object.values(store.records)) {
    if (rec.status === 'completed') seen.add(rec.gameId);
  }
  return [...seen];
}
