import type { ComponentType, ReactNode } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export type Outcome = 'won' | 'lost' | 'abandoned';

/**
 * Game categories — a fixed platform vocabulary that games pick from
 * (see platform/categories.ts). Designed to scale: future games either fit
 * an existing category or add ONE new entry there, never per-game strings.
 */
export type CategoryId =
  | 'logic'
  | 'words'
  | 'memory'
  | 'focus'
  | 'numbers'
  | 'spatial'
  | 'strategy'
  | 'reflex';

/** A toggleable assist/help feature declared by a game. */
export interface AssistFeature {
  id: string;
  name: string;
  description: string;
  defaultOn: boolean;
}

/** Live stats a game reports upward while being played. */
export interface LiveStats {
  score: number;
  errors: number;
  hintsUsed: number;
  /** Assist features that were actually used/triggered during play. */
  assistsUsed: string[];
  /** Game-specific extra metrics, e.g. cellsFilled. */
  extra?: Record<string, number | string>;
}

export interface FinishPayload extends LiveStats {
  outcome: 'won' | 'lost';
  /**
   * Local-multiplayer presentation (e.g. pass-the-phone matches): when
   * `hideStats` is set the completion card shows `headline`/`subline`
   * (who won) instead of the time/score/errors statistics. The result is
   * still recorded in history from the device owner's perspective.
   */
  hideStats?: boolean;
  headline?: string;
  subline?: string;
}

export interface GameEvents {
  /** Called whenever score/errors/hints change, so the shell can record abandons. */
  onStats: (stats: LiveStats) => void;
  /** Called exactly once when the game ends. */
  onFinish: (payload: FinishPayload) => void;
}

/** Props every game component receives from the platform GameShell. */
export interface GameProps {
  difficulty: Difficulty;
  /** assistId -> enabled, resolved from settings for this session. */
  assists: Record<string, boolean>;
  paused: boolean;
  elapsedSec: number;
  events: GameEvents;
  /** Flip an assist while playing; the change persists to settings. */
  onToggleAssist: (assistId: string, on: boolean) => void;
  /**
   * Present when resuming a saved game: the exact object this game's
   * snapshot provider returned. Games must initialize from it (see
   * DESIGN.md "Save & resume").
   */
  savedState?: unknown;
  /**
   * Register a provider returning a JSON-serializable snapshot of the
   * running game. Re-register on every render so it never goes stale.
   */
  registerSnapshot: (fn: () => unknown) => void;
  /**
   * Hold the session clock during a pre-game phase (e.g. a mode or level
   * picker rendered by the game itself): while held the timer neither ticks
   * nor counts toward the recorded duration. Release when real play begins.
   */
  holdClock: (hold: boolean) => void;
}

/** A resumable mid-game save, one per game, persisted on-device. */
export interface GameSave {
  gameId: string;
  difficulty: Difficulty;
  elapsedSec: number;
  savedAt: number;
  state: unknown;
}

/**
 * One step of a game's how-to-play tutorial. `art` is a small illustration
 * composed from the .tut-* CSS primitives (see design/DESIGN.md) so it
 * follows the active theme — never a static image.
 */
export interface TutorialStep {
  title: string;
  text: string;
  art: ReactNode;
}

/** The contract each game folder exports to plug into the platform. */
export interface GameDefinition {
  id: string;
  name: string;
  tagline: string;
  /** Sticker-style SVG from design/gameIcons.tsx shown on the home card. */
  icon: ReactNode;
  /** The category this game belongs to (menu filter + profile stats). */
  category: CategoryId;
  assistFeatures: AssistFeature[];
  component: ComponentType<GameProps>;
  scoringNote: string;
  /** Required: every game ships an illustrated how-to-play (3–6 steps). */
  tutorial: TutorialStep[];
}

/** A finished (or abandoned) play, persisted in history. */
export interface GameResult {
  id: string;
  gameId: string;
  difficulty: Difficulty;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  outcome: Outcome;
  score: number;
  errors: number;
  hintsUsed: number;
  assistsEnabled: string[];
  assistsUsed: string[];
  /** Won without any assist actually used and no hints. */
  cleanWin: boolean;
  extra?: Record<string, number | string>;
}

export type ThemeId = 'black' | 'dim' | 'light';

/** Accent color themes — see src/platform/design/DESIGN.md. */
export type AccentId = 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'white';

export interface PlatformSettings {
  theme: ThemeId;
  accent: AccentId;
  soundEnabled: boolean;
  volume: number; // 0..1
  /** gameId -> assistId -> enabled */
  gameAssists: Record<string, Record<string, boolean>>;
  /** gameId -> last chosen difficulty */
  lastDifficulty: Record<string, Difficulty>;
  /** pinned game ids, shown in their own section at the top of the menu */
  favorites: string[];
}

export interface Profile {
  name: string;
  emoji: string;
  joinedAt: number;
}
