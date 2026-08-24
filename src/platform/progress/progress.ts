import type { CategoryId, Difficulty, GameResult } from '../types';
import { DIFFICULTIES } from '../types';
import { GAMES } from '../registry';
import { CATEGORIES } from '../categories';
import { loadHistory, readGameData, writeGameData } from '../storage';
import {
  levelFromXp,
  RANK_TIERS,
  XP_AWARDS,
  type RankId,
  type XpAward,
  type XpEntry,
  type XpSource
} from './xp';

/**
 * Player progress — the streak + landmark (trophy) database, kept in its own
 * store (`100games.v1.progress` via the sanctioned readGameData/writeGameData
 * helpers, so resetAll sweeps it). It is deliberately separate from history:
 * history is a capped log (last 1000 plays), while progress is PERMANENT —
 * days played, games ever played, difficulties ever beaten and unlocked
 * landmarks survive the history cap and "Clear history".
 *
 * All updates funnel through recordProgress() (called by AppState's
 * recordResult, the single sink every finished/abandoned session reaches).
 * A missing or stale-shaped store is reseeded from history, so existing
 * players get retroactive credit on first load.
 */

const PROGRESS_KEY = 'progress';

export interface LandmarkUnlock {
  /** epoch ms of the moment the landmark was earned */
  at: number;
}

/** best time (seconds, lower wins) and best score (higher wins) for one tier */
export interface PersonalBest {
  time: number;
  score: number;
}

export interface PlayerProgress {
  /** local calendar days ('YYYY-MM-DD') with at least one recorded play */
  days: string[];
  /** game ids ever played (any outcome, including abandoned) */
  played: string[];
  /** gameId -> difficulties CLEANLY beaten (see countsAsBeaten) */
  wins: Record<string, Difficulty[]>;
  /** landmarkId -> unlock info; never removed once earned */
  landmarks: Record<string, LandmarkUnlock>;
  /** total XP ever earned — drives the player level (see ./xp.ts) */
  xp: number;
  /**
   * Lifetime counters for the volume ladders. They live HERE, not in
   * history, for the same reason records do: history is capped at 1000 rows
   * and clearable, so counting from it would make a 500-game trophy
   * un-earnable and re-fire the ones already earned.
   *
   * `plays` counts FINISHED sessions (won or lost) — an abandon is not a
   * game played, exactly as it earns no play XP: quitting from the game
   * screen takes two seconds, and a trophy anyone can hold down a button
   * for is worth nothing.
   */
  plays: number;
  /** lifetime clean wins — every result countsAsBeaten() accepts */
  cleanWins: number;
  /**
   * gameId -> difficulty -> personal best. Lives HERE rather than being
   * read from history because the XP award for beating your own record must
   * not re-fire after the 1000-entry cap drops the old run, or after
   * "Clear history" — progress is the permanent side of the store.
   */
  records: Record<string, Partial<Record<Difficulty, PersonalBest>>>;
}

/* ---------- day math (local-time calendar days, DST-safe) ---------- */

function keyOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dayKey(ts: number): string {
  return keyOf(new Date(ts));
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/* ---------- streak ---------- */

export interface StreakInfo {
  /** consecutive days ending today, or ending yesterday when today is
      still unplayed (the streak is alive but not yet extended) */
  current: number;
  /** longest run ever */
  best: number;
  playedToday: boolean;
  totalDays: number;
  /** Monday-first current week for the Duolingo-style week row */
  week: { label: string; played: boolean; isToday: boolean }[];
}

const WEEK_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function computeStreak(days: string[], now: Date = new Date()): StreakInfo {
  const set = new Set(days);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const playedToday = set.has(keyOf(today));

  let cursor = playedToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(keyOf(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...set].sort()) {
    const d = parseDay(key);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const week = WEEK_LABELS.map((label, i) => {
    const d = addDays(monday, i);
    return { label, played: set.has(keyOf(d)), isToday: d.getTime() === today.getTime() };
  });

  return { current, best, playedToday, totalDays: set.size, week };
}

/* ---------- landmark catalogue ---------- */

export type LandmarkKind =
  | 'first'
  | 'streak'
  | 'plays'
  | 'clean-wins'
  | 'level'
  | 'all-played'
  | 'difficulty'
  | 'category';

export interface LandmarkDef {
  id: string;
  title: string;
  /** the requirement line shown on the card ("Keep a 7-day play streak") */
  requirement: string;
  kind: LandmarkKind;
  /** content-palette slot (--play-N) — the card's identity color */
  slot: number;
  /** celebratory emoji for the shareable card (content, not UI chrome) */
  emoji: string;
  days?: number;
  /** target for the volume ladders (plays / clean wins) */
  count?: number;
  /** target level, and the crown it earns, for the level ladder */
  level?: number;
  rank?: RankId;
  difficulty?: Difficulty;
  category?: CategoryId;
}

/** streak tiers — bimester/trimester/quadrimester/semester follow the
    2/3/4/6-month school-calendar ladder */
const STREAK_TIERS: { days: number; title: string; slot: number }[] = [
  { days: 7, title: 'One Week', slot: 3 },
  { days: 14, title: 'Two Weeks', slot: 7 },
  { days: 21, title: 'Three Weeks', slot: 2 },
  { days: 30, title: 'One Month', slot: 8 },
  { days: 60, title: 'Bimester', slot: 15 },
  { days: 90, title: 'Trimester', slot: 5 },
  { days: 120, title: 'Quadrimester', slot: 10 },
  { days: 180, title: 'Semester', slot: 4 },
  { days: 365, title: 'One Year', slot: 6 }
];

/** volume ladders — same 50/100/200/500/1000 rungs for both, so the two
    read as one scale (one counts everything you finish, one only the wins
    you took unaided) */
const PLAY_TIERS: { count: number; title: string; slot: number }[] = [
  { count: 50, title: 'Warmed Up', slot: 4 },
  { count: 100, title: 'Century', slot: 6 },
  { count: 200, title: 'Devoted', slot: 11 },
  { count: 500, title: 'Marathon', slot: 10 },
  { count: 1000, title: 'Thousand Club', slot: 15 }
];

const CLEAN_TIERS: { count: number; title: string; slot: number }[] = [
  { count: 50, title: 'Fair Play', slot: 1 },
  { count: 100, title: 'Purist', slot: 13 },
  { count: 200, title: 'Self-Made', slot: 16 },
  { count: 500, title: 'Untouchable', slot: 3 },
  { count: 1000, title: 'Flawless Thousand', slot: 8 }
];

/** the plate tint behind each rank crown, matched to its material (the
    crown itself is painted with the fixed --rank-* tokens) */
const RANK_SLOT: Record<RankId, number> = {
  wood: 12,
  iron: 14,
  silver: 6,
  gold: 3,
  platinum: 11,
  challenger: 5
};

const DIFFICULTY_TIERS: Record<Difficulty, { slot: number; emoji: string }> = {
  easy: { slot: 1, emoji: '🥉' },
  medium: { slot: 3, emoji: '🥈' },
  hard: { slot: 7, emoji: '🥇' },
  pro: { slot: 2, emoji: '🏆' },
  extreme: { slot: 5, emoji: '👑' }
};

const CATEGORY_EMOJI: Record<CategoryId, string> = {
  logic: '🧠',
  words: '📚',
  memory: '🐘',
  focus: '🎯',
  numbers: '🔢',
  spatial: '🧭',
  strategy: '♟️',
  reflex: '⚡'
};

/** Display order: first game, streak ladder, collection, difficulty
    sweeps, category masteries. Only categories that actually contain
    games get a landmark (an empty category would unlock vacuously). */
export const LANDMARKS: LandmarkDef[] = [
  {
    id: 'first-game',
    title: 'First Steps',
    requirement: 'Play your first game',
    kind: 'first',
    slot: 3,
    emoji: '🌟'
  },
  ...STREAK_TIERS.map(
    (t): LandmarkDef => ({
      id: `streak-${t.days}`,
      title: t.title,
      requirement: `Keep a ${t.days}-day play streak`,
      kind: 'streak',
      days: t.days,
      slot: t.slot,
      emoji: '🔥'
    })
  ),
  ...PLAY_TIERS.map(
    (t): LandmarkDef => ({
      id: `plays-${t.count}`,
      title: t.title,
      // "finish", not "play": an abandoned session does not count (see
      // PlayerProgress.plays), and the requirement line must not promise
      // something the meter will refuse to credit
      requirement: `Finish ${t.count} games`,
      kind: 'plays',
      count: t.count,
      slot: t.slot,
      emoji: '🎮'
    })
  ),
  ...CLEAN_TIERS.map(
    (t): LandmarkDef => ({
      id: `clean-${t.count}`,
      title: t.title,
      requirement: `Win ${t.count} games with no help`,
      kind: 'clean-wins',
      count: t.count,
      slot: t.slot,
      emoji: '✨'
    })
  ),
  ...RANK_TIERS.map(
    (t): LandmarkDef => ({
      id: `level-${t.level}`,
      title: `${t.name} Crown`,
      requirement: `Reach level ${t.level}`,
      kind: 'level',
      level: t.level,
      rank: t.id,
      slot: RANK_SLOT[t.id],
      emoji: '👑'
    })
  ),
  {
    id: 'all-played',
    title: 'Collector',
    requirement: 'Play every game in the app',
    kind: 'all-played',
    slot: 6,
    emoji: '🧩'
  },
  ...DIFFICULTIES.map(
    (d): LandmarkDef => ({
      id: `all-${d}`,
      title: `${d[0].toUpperCase()}${d.slice(1)} Sweep`,
      requirement: `Beat every game on ${d} with no help`,
      kind: 'difficulty',
      difficulty: d,
      slot: DIFFICULTY_TIERS[d].slot,
      emoji: DIFFICULTY_TIERS[d].emoji
    })
  ),
  ...CATEGORIES.filter((c) => GAMES.some((g) => g.category === c.id)).map(
    (c): LandmarkDef => ({
      id: `master-${c.id}`,
      title: `${c.name} Master`,
      requirement: `Beat every ${c.name} game with no help`,
      kind: 'category',
      category: c.id,
      slot: c.slot,
      emoji: CATEGORY_EMOJI[c.id]
    })
  )
];

export function getLandmark(id: string): LandmarkDef | undefined {
  return LANDMARKS.find((d) => d.id === id);
}

/* ---------- per-game completion (the three "beaten" UI surfaces) ---------- */

/** difficulties this game has been cleanly beaten at, in tier order */
export function beatenDifficulties(p: PlayerProgress, gameId: string): Difficulty[] {
  const won = p.wins[gameId] ?? [];
  return DIFFICULTIES.filter((d) => won.includes(d));
}

/** true when the game has been cleanly beaten on every tier, easy → extreme */
export function allDifficultiesBeaten(p: PlayerProgress, gameId: string): boolean {
  return beatenDifficulties(p, gameId).length === DIFFICULTIES.length;
}

/* ---------- evaluation ---------- */

/** progress toward a landmark, for meters ("41/67"). Streak meters show the
    CURRENT streak (what the player can still act on), while unlocking uses
    the best streak ever, so a past run keeps its trophy. */
export function landmarkMeter(
  def: LandmarkDef,
  p: PlayerProgress,
  streak: StreakInfo
): { done: number; total: number } {
  switch (def.kind) {
    case 'first':
      return { done: Math.min(p.played.length, 1), total: 1 };
    case 'streak':
      return { done: Math.min(streak.current, def.days!), total: def.days! };
    case 'plays':
      return { done: Math.min(p.plays, def.count!), total: def.count! };
    case 'clean-wins':
      return { done: Math.min(p.cleanWins, def.count!), total: def.count! };
    case 'level':
      return { done: Math.min(levelFromXp(p.xp), def.level!), total: def.level! };
    case 'all-played': {
      const played = new Set(p.played);
      return { done: GAMES.filter((g) => played.has(g.id)).length, total: GAMES.length };
    }
    case 'difficulty':
      return {
        done: GAMES.filter((g) => (p.wins[g.id] ?? []).includes(def.difficulty!)).length,
        total: GAMES.length
      };
    case 'category': {
      const gs = GAMES.filter((g) => g.category === def.category);
      return { done: gs.filter((g) => (p.wins[g.id] ?? []).length > 0).length, total: gs.length };
    }
  }
}

const NO_STREAK: StreakInfo = { current: 0, best: 0, playedToday: false, totalDays: 0, week: [] };

function achieved(def: LandmarkDef, p: PlayerProgress, bestStreak: number): boolean {
  if (def.kind === 'streak') return bestStreak >= def.days!;
  const { done, total } = landmarkMeter(def, p, NO_STREAK);
  return total > 0 && done >= total;
}

/** Stamps any newly earned landmarks (never removes). Returns true when
    something unlocked. */
function evaluateLandmarks(p: PlayerProgress, atMs: number): boolean {
  const best = computeStreak(p.days, new Date(atMs)).best;
  let changed = false;
  for (const def of LANDMARKS) {
    if (p.landmarks[def.id]) continue;
    if (achieved(def, p, best)) {
      p.landmarks[def.id] = { at: atMs };
      changed = true;
    }
  }
  return changed;
}

/* ---------- persistence ---------- */

function emptyProgress(): PlayerProgress {
  return { days: [], played: [], wins: {}, landmarks: {}, xp: 0, plays: 0, cleanWins: 0, records: {} };
}

/**
 * Does this result COUNT as beating the tier?
 *
 * Only a clean win: won with zero hints and zero assists used (the
 * `cleanWin` flag every result already carries — passive assists count as
 * used whenever they were enabled, see the assist convention in CLAUDE.md).
 * This is the single gate behind the green ring, the star seal, the game
 * trophy, the difficulty-sweep and category-mastery landmarks, and the
 * "all difficulties" XP award — so every one of those marks means exactly
 * one thing: you did it unaided. A win with help still counts as a play, a
 * streak day, XP, and a history entry; it just isn't a conquest.
 */
export function countsAsBeaten(r: GameResult): boolean {
  return r.outcome === 'won' && r.cleanWin;
}

function applyResult(p: PlayerProgress, r: GameResult): void {
  const day = dayKey(r.finishedAt);
  if (!p.days.includes(day)) p.days.push(day);
  if (!p.played.includes(r.gameId)) p.played.push(r.gameId);
  if (r.outcome !== 'abandoned') p.plays += 1;
  if (countsAsBeaten(r)) {
    p.cleanWins += 1;
    const won = p.wins[r.gameId] ?? [];
    if (!won.includes(r.difficulty)) p.wins[r.gameId] = [...won, r.difficulty];
  }
}

/**
 * Folds a win into the personal-best table and reports whether it BEAT the
 * previous best (faster time or higher score). The first win at a tier only
 * sets the bar — there was no record to beat, so it earns no record XP.
 */
function updateRecord(p: PlayerProgress, r: GameResult): boolean {
  if (r.outcome !== 'won') return false;
  const perGame = p.records[r.gameId] ?? (p.records[r.gameId] = {});
  const prev = perGame[r.difficulty];
  if (!prev) {
    perGame[r.difficulty] = { time: r.durationSec, score: r.score };
    return false;
  }
  const beat = r.durationSec < prev.time || r.score > prev.score;
  perGame[r.difficulty] = {
    time: Math.min(prev.time, r.durationSec),
    score: Math.max(prev.score, r.score)
  };
  return beat;
}

/**
 * Retroactive XP for a store that predates levels (or one just reseeded
 * from history), so an existing player is not knocked back to level 1.
 * Only what the permanent store can prove is counted: days, unlocked
 * landmarks, swept games, and the plays still in the (capped) history.
 * Records are not reconstructable and are simply not awarded.
 */
function seedXp(p: PlayerProgress, history: GameResult[]): number {
  const plays = history.filter((r) => r.outcome !== 'abandoned').length;
  const swept = GAMES.filter((g) => allDifficultiesBeaten(p, g.id)).length;
  return (
    p.days.length * XP_AWARDS.day +
    plays * XP_AWARDS.play +
    Object.keys(p.landmarks).length * XP_AWARDS.landmark +
    swept * XP_AWARDS.sweep
  );
}

function seedFromHistory(): PlayerProgress {
  const p = emptyProgress();
  const history = loadHistory();
  // applyResult also runs up the lifetime plays/cleanWins counters
  for (const r of history) applyResult(p, r);
  p.days.sort();
  for (const r of history) updateRecord(p, r);
  p.xp = seedXp(p, history);
  // after the XP, so the level ladder sees the level this history earned
  evaluateLandmarks(p, Date.now());
  return p;
}

/**
 * Lifetime counters for a store written before the volume ladders existed.
 * Only the (capped) history can be counted, so a player with more than 1000
 * recorded games is credited with what is still on the device — the
 * alternative is starting them at zero, which is further from the truth.
 */
function seedCounters(p: PlayerProgress, history: GameResult[]): void {
  p.plays = history.filter((r) => r.outcome !== 'abandoned').length;
  p.cleanWins = history.filter(countsAsBeaten).length;
}

/**
 * shape-guard: a stale/foreign store falls back to a history reseed instead
 * of crashing (see QA ledger, save/resume rule). Exported so backup import
 * can validate an untrusted file with the same rules.
 *
 * `history` overrides what the retroactive backfills count. Backup import
 * MUST pass the file's own rows: an older backup carries no lifetime
 * counters, and filling them from the importing device's history would
 * credit the wrong person's play (zero, on a fresh device).
 */
export function normalizeProgress(raw: unknown, history?: GameResult[]): PlayerProgress | null {
  return normalize(raw, history);
}

/**
 * A lifetime counter (XP, plays, clean wins) from a stored — and after a
 * backup import, UNTRUSTED — file. A NaN, an Infinity or a negative would
 * spread to every level readout, bar width and trophy meter, so anything
 * that is not a sane whole number becomes 0 rather than poisoning the UI.
 * `null` means "no such field at all" (a store written before that counter
 * existed), which the caller backfills retroactively.
 */
function cleanCount(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

function cleanRecords(raw: unknown): PlayerProgress['records'] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: PlayerProgress['records'] = {};
  for (const [gameId, perGame] of Object.entries(raw as Record<string, unknown>)) {
    if (!perGame || typeof perGame !== 'object' || Array.isArray(perGame)) continue;
    const tiers: Partial<Record<Difficulty, PersonalBest>> = {};
    for (const [diff, best] of Object.entries(perGame as Record<string, unknown>)) {
      if (!DIFFICULTIES.includes(diff as Difficulty)) continue;
      const b = best as Partial<PersonalBest> | null;
      if (!b || typeof b !== 'object') continue;
      if (!Number.isFinite(b.time) || !Number.isFinite(b.score)) continue;
      tiers[diff as Difficulty] = { time: Number(b.time), score: Number(b.score) };
    }
    if (Object.keys(tiers).length) out[gameId] = tiers;
  }
  return out;
}

function normalize(raw: unknown, backfillFrom?: GameResult[]): PlayerProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<PlayerProgress>;
  if (!Array.isArray(p.days) || !Array.isArray(p.played)) return null;
  if (!p.wins || typeof p.wins !== 'object' || Array.isArray(p.wins)) return null;
  if (!p.landmarks || typeof p.landmarks !== 'object' || Array.isArray(p.landmarks)) return null;
  const xp = cleanCount(p.xp);
  const plays = cleanCount(p.plays);
  const cleanWins = cleanCount(p.cleanWins);
  const out: PlayerProgress = {
    days: p.days.filter((d): d is string => typeof d === 'string'),
    played: p.played.filter((g): g is string => typeof g === 'string'),
    wins: p.wins as Record<string, Difficulty[]>,
    landmarks: p.landmarks as Record<string, LandmarkUnlock>,
    xp: xp ?? 0,
    plays: plays ?? 0,
    cleanWins: cleanWins ?? 0,
    records: cleanRecords(p.records)
  };
  // a store from before levels / the volume ladders: backfill from what the
  // device can still prove, so an existing player keeps the level and the
  // counts their play has earned (one history read for both)
  if (xp === null || plays === null || cleanWins === null) {
    const history = backfillFrom ?? loadHistory();
    if (xp === null) out.xp = seedXp(out, history);
    if (plays === null || cleanWins === null) seedCounters(out, history);
  }
  return out;
}

/** Loads (or reseeds) progress and re-evaluates landmarks — cheap, runs at
    app start so retroactive/registry-driven unlocks appear without a play. */
export function loadProgress(): PlayerProgress {
  const raw = readGameData<PlayerProgress>(PROGRESS_KEY);
  /**
   * A store written before levels (or before the lifetime counters) existed.
   * Its retroactive XP and counts MUST be seeded and persisted here, at
   * load — recordProgress runs after the new result is already in history,
   * so seeding there would count that game once in the backfill and again in
   * its award (and could skip the level-up card by inflating the "before"
   * level past a boundary).
   */
  const needsXpSeed =
    !!raw &&
    typeof raw === 'object' &&
    (typeof raw.xp !== 'number' ||
      typeof raw.plays !== 'number' ||
      typeof raw.cleanWins !== 'number');
  const stored = normalize(raw);
  const p = stored ?? seedFromHistory();
  const changed = evaluateLandmarks(p, Date.now());
  if (!stored || changed || needsXpSeed) writeGameData(PROGRESS_KEY, p);
  return p;
}

/**
 * Grants XP for whatever this result made NEW, then folds it in. Each award
 * is keyed to a state change (first play of a day, a landmark that was not
 * unlocked, a game that was not yet swept, a record that stood), so the same
 * moment can never pay twice.
 *
 * Abandoned sessions earn no `play` XP on purpose: quitting from the game
 * screen takes a couple of seconds, so paying for it would let a player
 * level up without playing anything, and a level nobody earned is worth
 * nothing. They still count for the streak day, which is a real play day.
 */
function awardXp(p: PlayerProgress, r: GameResult): XpAward {
  const entries: XpEntry[] = [];
  /* XP lands on p.xp as it is granted, not in one sum at the end: the level
     ladder's landmarks are evaluated against p.xp, so they must see the XP
     this very result just earned. */
  const grant = (source: XpSource, detail?: string) => {
    entries.push({ source, xp: XP_AWARDS[source], detail });
    p.xp += XP_AWARDS[source];
  };

  const isNewDay = !p.days.includes(dayKey(r.finishedAt));
  const sweptBefore = allDifficultiesBeaten(p, r.gameId);
  const levelBefore = levelFromXp(p.xp);

  applyResult(p, r);
  p.days.sort();
  const brokeRecord = updateRecord(p, r);

  if (isNewDay) grant('day');
  if (r.outcome !== 'abandoned') grant('play');
  if (brokeRecord) grant('record');
  if (!sweptBefore && allDifficultiesBeaten(p, r.gameId)) grant('sweep');

  /* Landmarks last, and in a LOOP: unlocking one pays 80 XP, which can
     itself carry the player over a level tier whose crown must then unlock
     in the same breath. Bounded by the catalogue size — each pass stamps at
     least one landmark and none is ever stamped twice. */
  for (let pass = 0; pass < LANDMARKS.length; pass++) {
    const before = new Set(Object.keys(p.landmarks));
    if (!evaluateLandmarks(p, r.finishedAt)) break;
    for (const id of Object.keys(p.landmarks)) {
      if (!before.has(id)) grant('landmark', getLandmark(id)?.title);
    }
  }

  const total = entries.reduce((sum, e) => sum + e.xp, 0);
  const levelAfter = levelFromXp(p.xp);
  return { total, entries, levelBefore, levelAfter, leveledUp: levelAfter > levelBefore };
}

export interface ProgressUpdate {
  progress: PlayerProgress;
  award: XpAward;
}

/** The single write path: fold one finished/abandoned session in, unlock
    anything newly earned, grant XP, persist. Returns a fresh object
    (React state) plus what this result earned, for the results modal. */
export function recordProgress(result: GameResult): ProgressUpdate {
  const p = normalize(readGameData<PlayerProgress>(PROGRESS_KEY)) ?? seedFromHistory();
  const award = awardXp(p, result);
  writeGameData(PROGRESS_KEY, p);
  return { progress: p, award };
}
