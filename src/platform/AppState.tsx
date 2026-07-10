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

interface AppState {
  settings: PlatformSettings;
  profile: Profile;
  history: GameResult[];
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  setGameAssist: (gameId: string, assistId: string, on: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  recordResult: (result: GameResult) => void;
  wipeHistory: () => void;
  wipeEverything: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [history, setHistory] = useState<GameResult[]>(loadHistory);

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
      },
      wipeHistory: () => {
        clearHistory();
        setHistory([]);
      },
      wipeEverything: () => {
        resetAll();
        setSettings(loadSettings());
        setProfile(loadProfile());
        setHistory([]);
      }
    }),
    [settings, profile, history]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
