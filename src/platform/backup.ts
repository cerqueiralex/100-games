import type { Difficulty, GameResult, PlatformSettings, Profile, ThemeId } from './types';
import { DIFFICULTIES } from './types';
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  loadHistory,
  loadProfile,
  loadSettings,
  readGameData,
  replaceHistory,
  saveProfile,
  saveSettings,
  writeGameData
} from './storage';
import { isProfileColor } from './design/profileColors';
import { normalizeProgress, type PlayerProgress } from './progress/progress';
import { normalizeDailyStore, type DailyChallengeStore } from './daily/store';

/**
 * Backup export / import — moving a player between devices, or handing a
 * profile to a friend.
 *
 * An imported file is UNTRUSTED input (hand-edited, from an older build, or
 * simply the wrong file), so nothing here casts and hopes: every section is
 * validated field by field, malformed history rows are dropped rather than
 * poisoning the log, and an unknown theme can never brick the UI. A file
 * from an older build may still carry an `accent` — it is simply ignored,
 * along with any other field this build no longer knows.
 * Parsing is separate from applying so the UI can preview what's in the file
 * before the player agrees to replace what's on the device.
 */

const THEMES: ThemeId[] = ['black', 'dim', 'light'];
const PROGRESS_KEY = 'progress';
const DAILY_KEY = 'daily';

export interface BackupPayload {
  settings?: PlatformSettings;
  profile?: Profile;
  history?: GameResult[];
  progress?: PlayerProgress;
  daily?: DailyChallengeStore;
}

export interface BackupSummary {
  playerName: string;
  playerEmoji: string;
  games: number;
  days: number;
  landmarks: number;
  /** localized export date, or null when the file didn't carry one */
  exportedAt: string | null;
  /** sections the file actually contains, for the preview line */
  sections: string[];
}

export type ParseResult =
  | { ok: true; payload: BackupPayload; summary: BackupSummary }
  | { ok: false; error: string };

/** The backup file: everything that makes a player's account. */
export function exportBackup(): string {
  return JSON.stringify(
    {
      app: '100-games',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: loadSettings(),
      profile: loadProfile(),
      history: loadHistory(),
      // streak + landmark store (see platform/progress/progress.ts)
      progress: readGameData(PROGRESS_KEY),
      // Daily Challenge records + streak (see platform/daily/store.ts)
      daily: readGameData(DAILY_KEY)
    },
    null,
    2
  );
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** a history row is kept only when every field the app dereferences is sound */
function validResult(raw: unknown): GameResult | null {
  if (!isObj(raw)) return null;
  const { id, gameId, difficulty, outcome } = raw;
  if (typeof id !== 'string' || typeof gameId !== 'string') return null;
  if (typeof difficulty !== 'string' || !DIFFICULTIES.includes(difficulty as Difficulty)) return null;
  if (outcome !== 'won' && outcome !== 'lost' && outcome !== 'abandoned') return null;
  if (typeof raw.finishedAt !== 'number' || !Number.isFinite(raw.finishedAt)) return null;
  return {
    id,
    gameId,
    difficulty: difficulty as Difficulty,
    startedAt: num(raw.startedAt, raw.finishedAt),
    finishedAt: raw.finishedAt,
    durationSec: Math.max(0, num(raw.durationSec, 0)),
    outcome,
    score: num(raw.score, 0),
    errors: Math.max(0, num(raw.errors, 0)),
    hintsUsed: Math.max(0, num(raw.hintsUsed, 0)),
    assistsEnabled: strings(raw.assistsEnabled),
    assistsUsed: strings(raw.assistsUsed),
    cleanWin: raw.cleanWin === true,
    ...(isObj(raw.extra) ? { extra: raw.extra as GameResult['extra'] } : {})
  };
}

function validSettings(raw: unknown): PlatformSettings | null {
  if (!isObj(raw)) return null;
  const assists = isObj(raw.gameAssists) ? (raw.gameAssists as PlatformSettings['gameAssists']) : {};
  const lastDiff: PlatformSettings['lastDifficulty'] = {};
  if (isObj(raw.lastDifficulty)) {
    for (const [gameId, d] of Object.entries(raw.lastDifficulty)) {
      if (typeof d === 'string' && DIFFICULTIES.includes(d as Difficulty)) {
        lastDiff[gameId] = d as Difficulty;
      }
    }
  }
  /* Per-game option choices (see GameOptionDef). Only string→string pairs
     survive; an unknown choice id is harmless because resolveOptions falls
     back to the option's default when the game no longer offers it. */
  const options: PlatformSettings['gameOptions'] = {};
  if (isObj(raw.gameOptions)) {
    for (const [gameId, picks] of Object.entries(raw.gameOptions)) {
      if (!isObj(picks)) continue;
      const clean: Record<string, string> = {};
      for (const [optId, choice] of Object.entries(picks)) {
        if (typeof choice === 'string') clean[optId] = choice;
      }
      if (Object.keys(clean).length > 0) options[gameId] = clean;
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    theme: THEMES.includes(raw.theme as ThemeId) ? (raw.theme as ThemeId) : DEFAULT_SETTINGS.theme,
    soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : true,
    volume: Math.min(1, Math.max(0, num(raw.volume, DEFAULT_SETTINGS.volume))),
    gameAssists: assists,
    lastDifficulty: lastDiff,
    gameOptions: options,
    favorites: strings(raw.favorites)
  };
}

function validProfile(raw: unknown): Profile | null {
  if (!isObj(raw)) return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 20) : '';
  return {
    name: name || DEFAULT_PROFILE.name,
    emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : DEFAULT_PROFILE.emoji,
    joinedAt: num(raw.joinedAt, Date.now()),
    // an unknown color (older/newer build, hand-edited file) is DROPPED, not
    // passed through: the standard look is always a valid profile, while an
    // unresolvable one would leave --profile painting the chrome with nothing
    ...(isProfileColor(raw.color) ? { color: raw.color } : {})
  };
}

/** Validate a backup file's text. Never throws — a bad file yields a
    human-readable reason the UI can show. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON — pick the .json file you exported." };
  }
  if (!isObj(raw)) return { ok: false, error: 'That file doesn’t contain a 100 Games backup.' };

  const settings = validSettings(raw.settings);
  const profile = validProfile(raw.profile);
  const history = Array.isArray(raw.history)
    ? raw.history.map(validResult).filter((r): r is GameResult => r !== null)
    : null;
  // the file's OWN rows back-fill any counter it predates — never this
  // device's history, which belongs to whoever is importing
  const progress = normalizeProgress(raw.progress, history ?? undefined);
  /* Imported daily records are AUTHORITATIVE for their own dates: they were
     assigned when those days were live, and re-deriving them against this
     device's eligible list would hand the player a different game than the
     one they actually solved. normalizeDailyStore drops anything malformed
     (unknown status, a game this build no longer has, a bad date) rather
     than throwing, and clamps the streak counters. */
  const daily = normalizeDailyStore(raw.daily);

  if (!settings && !profile && !history && !progress && !daily) {
    return {
      ok: false,
      error: 'No 100 Games data found in that file — it may be from another app.'
    };
  }

  const sections = [
    profile && 'profile',
    history && `${history.length} games`,
    progress && 'streak & landmarks',
    daily && `${Object.keys(daily.records).length} daily challenges`,
    settings && 'settings'
  ].filter(Boolean) as string[];

  return {
    ok: true,
    payload: {
      ...(settings ? { settings } : {}),
      ...(profile ? { profile } : {}),
      ...(history ? { history } : {}),
      ...(progress ? { progress } : {}),
      ...(daily ? { daily } : {})
    },
    summary: {
      playerName: profile?.name ?? 'Unknown player',
      playerEmoji: profile?.emoji ?? '🎮',
      games: history?.length ?? 0,
      days: progress?.days.length ?? 0,
      landmarks: progress ? Object.keys(progress.landmarks).length : 0,
      exportedAt:
        typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt))
          ? new Date(raw.exportedAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : null,
      sections
    }
  };
}

/** Write a validated payload to storage. Sections the file didn't carry are
    left untouched rather than blanked. */
export function applyBackup(payload: BackupPayload): void {
  if (payload.settings) saveSettings(payload.settings);
  if (payload.profile) saveProfile(payload.profile);
  if (payload.history) replaceHistory(payload.history);
  if (payload.progress) writeGameData(PROGRESS_KEY, payload.progress);
  if (payload.daily) writeGameData(DAILY_KEY, payload.daily);
}
