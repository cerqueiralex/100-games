import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameResult, PlatformSettings, Profile } from './types';
import {
  appendResult,
  clearHistory,
  loadHistory,
  loadProfile,
  loadSettings,
  resetAll,
  saveProfile,
  saveSettings
} from './storage';
import { configureAudio } from './audio';
import { applyProfileColor } from './design/profileColors';
import {
  loadProgress,
  recordFeat,
  recordProgress,
  type DailyProgressInfo,
  type PlayerProgress
} from './progress/progress';
import type { XpAward } from './progress/xp';

interface AppState {
  settings: PlatformSettings;
  profile: Profile;
  history: GameResult[];
  /** streak + landmark + XP store — permanent, survives the history cap */
  progress: PlayerProgress;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  /** pick a value for one of a game's setup-screen options (see GameOptionDef) */
  setGameOption: (gameId: string, optionId: string, choiceId: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** records the play and returns the XP it earned (see progress/xp.ts) */
  recordResult: (result: GameResult, daily?: DailyProgressInfo) => XpAward;
  /**
   * Stamps a feat earned OUTSIDE a game — making a win card, exporting or
   * importing a backup (see FEATS). Idempotent: a feat already held is a
   * no-op, so a player who exports weekly is paid once, like every other
   * award in the store.
   */
  markFeat: (feat: string) => void;
  wipeHistory: () => void;
  wipeEverything: () => void;
  /** re-read every store — used after a backup import replaces them */
  reloadFromStorage: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [history, setHistory] = useState<GameResult[]>(loadHistory);
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);

  useEffect(() => {
    configureAudio(settings.soundEnabled, settings.volume);
    document.documentElement.dataset.theme = settings.theme;
    // no data-accent: the accent is monochrome and fixed (see tokens.css).
    // The profile color is a different thing entirely — it paints only the
    // player's own chrome (--xp and the profile frames), never a game tool,
    // and it depends on the surface theme, so it is re-applied with it.
    applyProfileColor(document.documentElement, profile.color, settings.theme);
    // browser/PWA chrome follows the active surface theme
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }, [settings.soundEnabled, settings.volume, settings.theme, profile.color]);

  const value = useMemo<AppState>(
    () => ({
      settings,
      profile,
      history,
      progress,
      updateSettings: (patch) => {
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          saveSettings(next);
          return next;
        });
      },
      setGameOption: (gameId, optionId, choiceId) => {
        setSettings((prev) => {
          const next: PlatformSettings = {
            ...prev,
            gameOptions: {
              ...prev.gameOptions,
              [gameId]: { ...prev.gameOptions[gameId], [optionId]: choiceId }
            }
          };
          saveSettings(next);
          return next;
        });
      },
      updateProfile: (patch) => {
        setProfile((prev) => {
          const next = { ...prev, ...patch };
          saveProfile(next);
          return next;
        });
      },
      recordResult: (result, daily) => {
        setHistory(appendResult(result));
        // fold the play into the permanent streak/landmark/XP store
        const { progress: next, award } = recordProgress(result, daily);
        setProgress(next);
        // handed back so the results modal can show what this result earned
        return award;
      },
      markFeat: (feat) => {
        const next = recordFeat(feat);
        if (next) setProgress(next);
      },
      wipeHistory: () => {
        // the game log clears; streaks and landmarks are trophies and persist
        clearHistory();
        setHistory([]);
      },
      wipeEverything: () => {
        resetAll();
        setSettings(loadSettings());
        setProfile(loadProfile());
        setHistory([]);
        setProgress(loadProgress());
      },
      reloadFromStorage: () => {
        setSettings(loadSettings());
        setProfile(loadProfile());
        setHistory(loadHistory());
        setProgress(loadProgress());
      }
    }),
    [settings, profile, history, progress]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
