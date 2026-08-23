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
import { loadProgress, recordProgress, type PlayerProgress } from './progress/progress';

interface AppState {
  settings: PlatformSettings;
  profile: Profile;
  history: GameResult[];
  /** streak + landmark store — permanent, survives the history cap */
  progress: PlayerProgress;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  setGameAssist: (gameId: string, assistId: string, on: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  recordResult: (result: GameResult) => void;
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
    document.documentElement.dataset.accent = settings.accent;
    // browser/PWA chrome follows the active surface theme
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  }, [settings.soundEnabled, settings.volume, settings.theme, settings.accent]);

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
      setGameAssist: (gameId, assistId, on) => {
        setSettings((prev) => {
          const next: PlatformSettings = {
            ...prev,
            gameAssists: {
              ...prev.gameAssists,
              [gameId]: { ...prev.gameAssists[gameId], [assistId]: on }
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
      recordResult: (result) => {
        setHistory(appendResult(result));
        // fold the play into the permanent streak/landmark store
        setProgress(recordProgress(result));
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
