import type {
  Difficulty,
  GameOptionDef,
  GameResult,
  GameSave,
  PlatformSettings,
  Profile
} from './types';
import { isProfileColor } from './design/profileColors';

const KEYS = {
  settings: '100games.v1.settings',
  profile: '100games.v1.profile',
  history: '100games.v1.history',
  saves: '100games.v1.saves'
} as const;

const HISTORY_LIMIT = 1000;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — game keeps working, persistence degrades
  }
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  theme: 'black',
  soundEnabled: true,
  volume: 0.6,
  gameAssists: {},
  lastDifficulty: {},
  gameOptions: {},
  favorites: []
};

export const DEFAULT_PROFILE: Profile = {
  name: 'Player',
  emoji: '🎮',
  joinedAt: Date.now()
};

export function loadSettings(): PlatformSettings {
  const saved = read<Partial<PlatformSettings>>(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: PlatformSettings): void {
  write(KEYS.settings, settings);
}

export function loadProfile(): Profile {
  const saved = read<Partial<Profile>>(KEYS.profile);
  if (!saved) {
    const fresh = { ...DEFAULT_PROFILE, joinedAt: Date.now() };
    write(KEYS.profile, fresh);
    return fresh;
  }
  const profile = { ...DEFAULT_PROFILE, ...saved };
  // a color this build doesn't know (hand-edited storage, or one dropped in a
  // later version) falls back to the standard look rather than painting the
  // chrome with a value nothing can resolve
  if (!isProfileColor(profile.color)) delete profile.color;
  return profile;
}

export function saveProfile(profile: Profile): void {
  write(KEYS.profile, profile);
}

export function loadHistory(): GameResult[] {
  return read<GameResult[]>(KEYS.history) ?? [];
}

export function appendResult(result: GameResult): GameResult[] {
  const history = [result, ...loadHistory()].slice(0, HISTORY_LIMIT);
  write(KEYS.history, history);
  return history;
}

export function clearHistory(): void {
  write(KEYS.history, []);
}

/** One resumable save per game. */
export function loadSaves(): Record<string, GameSave> {
  return read<Record<string, GameSave>>(KEYS.saves) ?? {};
}

export function putSave(save: GameSave): void {
  const saves = loadSaves();
  saves[save.gameId] = save;
  write(KEYS.saves, saves);
}

export function deleteSave(gameId: string): void {
  const saves = loadSaves();
  if (!(gameId in saves)) return;
  delete saves[gameId];
  write(KEYS.saves, saves);
}

/**
 * Namespaced persistence for game-specific extras (e.g. Logic Puzzles preset
 * progress) — the ONLY sanctioned way for game code to persist outside the
 * shell's save/history flow, so resetAll can find everything.
 */
export function readGameData<T>(subKey: string): T | null {
  return read<T>(`100games.v1.${subKey}`);
}

export function writeGameData(subKey: string, value: unknown): void {
  write(`100games.v1.${subKey}`, value);
}

export function resetAll(): void {
  try {
    // sweep the whole version prefix so per-game extras are wiped too
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('100games.v1.')) localStorage.removeItem(k);
    }
  } catch {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  }
}

/** Overwrite the whole history log (used by backup import). */
export function replaceHistory(results: GameResult[]): void {
  write(KEYS.history, results.slice(0, HISTORY_LIMIT));
}

export function resolveAssists(
  settings: PlatformSettings,
  gameId: string,
  defaults: { id: string; defaultOn: boolean }[]
): Record<string, boolean> {
  const saved = settings.gameAssists[gameId] ?? {};
  const out: Record<string, boolean> = {};
  for (const f of defaults) out[f.id] = saved[f.id] ?? f.defaultOn;
  return out;
}

export function lastDifficultyFor(settings: PlatformSettings, gameId: string): Difficulty {
  return settings.lastDifficulty[gameId] ?? 'easy';
}

/**
 * The game's option choices for this session, falling back to each option's
 * default. A stored choice that the game no longer offers is DROPPED rather
 * than passed through — a theme removed in an update would otherwise leave
 * the player on a board nothing knows how to draw.
 */
export function resolveOptions(
  settings: PlatformSettings,
  gameId: string,
  defs: GameOptionDef[] | undefined
): Record<string, string> {
  const saved = settings.gameOptions[gameId] ?? {};
  const out: Record<string, string> = {};
  for (const def of defs ?? []) {
    const pick = saved[def.id];
    out[def.id] = def.choices.some((c) => c.id === pick) ? pick : def.defaultChoice;
  }
  return out;
}
