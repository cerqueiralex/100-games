import type { CategoryId, Difficulty, GameResult } from '../types';
import { DIFFICULTIES } from '../types';
import { GAMES } from '../registry';
import { CATEGORIES } from '../categories';
import { loadHistory, readGameData, writeGameData } from '../storage';

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

export interface PlayerProgress {
  /** local calendar days ('YYYY-MM-DD') with at least one recorded play */
  days: string[];
  /** game ids ever played (any outcome, including abandoned) */
  played: string[];
  /** gameId -> difficulties this game has been WON at */
  wins: Record<string, Difficulty[]>;
  /** landmarkId -> unlock info; never removed once earned */
  landmarks: Record<string, LandmarkUnlock>;
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

export type LandmarkKind = 'first' | 'streak' | 'all-played' | 'difficulty' | 'category';

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
      requirement: `Beat every game on ${d}`,
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
      requirement: `Beat every ${c.name} game`,
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

/** difficulties this game has been WON at, in tier order */
export function beatenDifficulties(p: PlayerProgress, gameId: string): Difficulty[] {
  const won = p.wins[gameId] ?? [];
  return DIFFICULTIES.filter((d) => won.includes(d));
}

/** true when the game has been won on every tier, easy through extreme */
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
  return { days: [], played: [], wins: {}, landmarks: {} };
}

function applyResult(p: PlayerProgress, r: GameResult): void {
  const day = dayKey(r.finishedAt);
  if (!p.days.includes(day)) p.days.push(day);
  if (!p.played.includes(r.gameId)) p.played.push(r.gameId);
  if (r.outcome === 'won') {
    const won = p.wins[r.gameId] ?? [];
    if (!won.includes(r.difficulty)) p.wins[r.gameId] = [...won, r.difficulty];
  }
}

function seedFromHistory(): PlayerProgress {
  const p = emptyProgress();
  for (const r of loadHistory()) applyResult(p, r);
  p.days.sort();
  return p;
}

/** shape-guard: a stale/foreign store falls back to a history reseed
    instead of crashing (see QA ledger, save/resume rule) */
function normalize(raw: unknown): PlayerProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<PlayerProgress>;
  if (!Array.isArray(p.days) || !Array.isArray(p.played)) return null;
  if (!p.wins || typeof p.wins !== 'object' || Array.isArray(p.wins)) return null;
  if (!p.landmarks || typeof p.landmarks !== 'object' || Array.isArray(p.landmarks)) return null;
  return {
    days: p.days.filter((d): d is string => typeof d === 'string'),
    played: p.played.filter((g): g is string => typeof g === 'string'),
    wins: p.wins as Record<string, Difficulty[]>,
    landmarks: p.landmarks as Record<string, LandmarkUnlock>
  };
}

/** Loads (or reseeds) progress and re-evaluates landmarks — cheap, runs at
    app start so retroactive/registry-driven unlocks appear without a play. */
export function loadProgress(): PlayerProgress {
  const stored = normalize(readGameData<PlayerProgress>(PROGRESS_KEY));
  const p = stored ?? seedFromHistory();
  const changed = evaluateLandmarks(p, Date.now());
  if (!stored || changed) writeGameData(PROGRESS_KEY, p);
  return p;
}

/** The single write path: fold one finished/abandoned session in, unlock
    anything newly earned, persist. Returns a fresh object (React state). */
export function recordProgress(result: GameResult): PlayerProgress {
  const p = normalize(readGameData<PlayerProgress>(PROGRESS_KEY)) ?? seedFromHistory();
  applyResult(p, result);
  p.days.sort();
  evaluateLandmarks(p, result.finishedAt);
  writeGameData(PROGRESS_KEY, p);
  return p;
}
