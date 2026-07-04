import type { GameResult, GameSave, PlatformSettings, Profile, Difficulty } from './types';

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
  accent: 'orange',
  soundEnabled: true,
  volume: 0.6,
  gameAssists: {},
  lastDifficulty: {},
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
  return { ...DEFAULT_PROFILE, ...saved };
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

export function exportData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      settings: loadSettings(),
      profile: loadProfile(),
      history: loadHistory()
    },
    null,
    2
  );
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
