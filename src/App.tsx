import { useLayoutEffect, useRef, useState } from 'react';
import { AppStateProvider } from './platform/AppState';
import { GameShell } from './platform/components/GameShell';
import { GridIcon, UserIcon, GearIcon, BrainIcon } from './platform/components/ui';
import { HomePage } from './platform/pages/HomePage';
import { ProfilePage } from './platform/pages/ProfilePage';
import { SettingsPage } from './platform/pages/SettingsPage';
import { BrainLabPage } from './platform/brain/BrainLabPage';
import { BrainRunner } from './platform/brain/BrainRunner';
import { CheckIn } from './platform/brain/CheckIn';
import { getBrainTest } from './platform/brain/registry';
import { getGame } from './platform/registry';
import { sfx } from './platform/audio';
import type { CategoryId } from './platform/types';
import type { BrainDomainId } from './platform/brain/types';
import type { DailyChallengeRecord } from './platform/daily/store';

type Tab = 'games' | 'brain' | 'profile' | 'settings';

/** a Brain Lab full-screen layer: one benchmark, or the daily check-in */
type BrainLayer = { kind: 'test'; testId: string } | { kind: 'checkin'; quick: boolean };

function Shell() {
  const [tab, setTab] = useState<Tab>('games');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  /** set only when the open game was launched AS today's Daily Challenge —
      the same game opened from the list is an ordinary session */
  const [activeDaily, setActiveDaily] = useState<DailyChallengeRecord | null>(null);
  /** the Brain Lab runner / check-in — full screen, no tab bar, like a game */
  const [brainLayer, setBrainLayer] = useState<BrainLayer | null>(null);
  /** the Brain Lab area open in depth (survives a training-game visit) */
  const [brainArea, setBrainArea] = useState<BrainDomainId | null>(null);
  /** asks ProfilePage to switch tab (Brain Lab → "Open dashboard") */
  const [profileRequest, setProfileRequest] = useState<{ id: string; nonce: number } | undefined>(undefined);

  /**
   * Browsing state outlives a game visit. HomePage unmounts while playing,
   * so the search text and category filter live here, and the list's scroll
   * offset is captured on the way in and restored on the way out — trying
   * game #40 must not dump you back at the top of a 69-game list. The same
   * holds for Brain Lab: a training game or a benchmark opened from an
   * area returns to that area, scrolled where it was.
   */
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  /** where a full-screen layer (game, benchmark, check-in) returns to */
  const returnTab = useRef<Tab>('games');
  const returnScroll = useRef(0);
  /** each tab keeps its own scroll offset across tab switches */
  const tabScroll = useRef<Record<Tab, number>>({ games: 0, brain: 0, profile: 0, settings: 0 });
  /** the Brain Lab list's offset while an area page is open */
  const brainListScroll = useRef(0);
  const pendingScroll = useRef<number | null>(null);

  const layerTest = brainLayer?.kind === 'test' ? getBrainTest(brainLayer.testId) : undefined;
  const layerOpen = brainLayer?.kind === 'checkin' || !!layerTest;
  const layerKey = activeGameId ? `game:${activeGameId}` : layerOpen ? `brain:${brainLayer?.kind}` : null;
  useLayoutEffect(() => {
    // entering a layer starts at the top; leaving one lands where you were
    window.scrollTo(0, layerKey ? 0 : returnScroll.current);
  }, [layerKey]);

  useLayoutEffect(() => {
    if (pendingScroll.current === null) return;
    window.scrollTo(0, pendingScroll.current);
    pendingScroll.current = null;
  });

  /** capture where we are before a full-screen layer covers the tabs */
  const enterLayer = () => {
    if (!layerKey) {
      returnTab.current = tab;
      returnScroll.current = window.scrollY;
    }
  };
  const leaveLayer = () => setTab(returnTab.current);

  const openGame = (gameId: string) => {
    enterLayer();
    setBrainLayer(null);
    setActiveDaily(null);
    setActiveGameId(gameId);
  };

  const switchTab = (next: Tab) => {
    if (next === tab) {
      // tapping the active tab again goes back to its top (and closes an area page)
      if (next === 'brain' && brainArea) setBrainArea(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    tabScroll.current[tab] = window.scrollY;
    pendingScroll.current = tabScroll.current[next];
    setTab(next);
  };

  const activeGame = activeGameId ? getGame(activeGameId) : undefined;

  if (activeGame) {
    return (
      <GameShell
        game={activeGame}
        daily={activeDaily ?? undefined}
        onExit={() => {
          setActiveGameId(null);
          setActiveDaily(null);
          leaveLayer();
        }}
      />
    );
  }

  if (brainLayer && layerOpen) {
    const close = () => {
      setBrainLayer(null);
      leaveLayer();
    };
    if (brainLayer.kind === 'checkin') {
      return <CheckIn quick={brainLayer.quick} onExit={close} onOpenGame={openGame} />;
    }
    if (layerTest) return <BrainRunner test={layerTest} onClose={close} />;
  }

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'games' && (
          <HomePage
            query={query}
            onQueryChange={setQuery}
            category={category}
            onCategoryChange={setCategory}
            onOpenGame={openGame}
            onOpenDaily={(record) => {
              enterLayer();
              setActiveDaily(record);
              setActiveGameId(record.gameId);
            }}
            onOpenProfile={() => {
              sfx.tap();
              switchTab('profile');
            }}
          />
        )}
        {tab === 'brain' && (
          <BrainLabPage
            area={brainArea}
            onOpenArea={(id) => {
              brainListScroll.current = window.scrollY;
              pendingScroll.current = 0;
              setBrainArea(id);
            }}
            onCloseArea={() => {
              sfx.tap();
              pendingScroll.current = brainListScroll.current;
              setBrainArea(null);
            }}
            onRunTest={(testId) => {
              enterLayer();
              setBrainLayer({ kind: 'test', testId });
            }}
            onCheckin={(opts) => {
              enterLayer();
              setBrainLayer({ kind: 'checkin', quick: !!opts?.quick });
            }}
            onOpenGame={openGame}
            onOpenDashboard={() => {
              sfx.tap();
              setProfileRequest((r) => ({ id: 'brain', nonce: (r?.nonce ?? 0) + 1 }));
              tabScroll.current.brain = window.scrollY;
              pendingScroll.current = 0;
              setTab('profile');
            }}
          />
        )}
        {tab === 'profile' && (
          <ProfilePage
            // "Open dashboard": switch to the Brain tab whenever the nonce changes
            requestTab={profileRequest}
            onOpenBrainLab={() => {
              sfx.tap();
              switchTab('brain');
            }}
            onOpenGame={openGame}
          />
        )}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="tab-bar">
        {(
          [
            ['games', 'Games', <GridIcon key="i" />],
            ['brain', 'Brain Lab', <BrainIcon key="i" />],
            ['profile', 'Profile', <UserIcon key="i" />],
            ['settings', 'Settings', <GearIcon key="i" />]
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              sfx.tap();
              switchTab(id);
            }}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
