import { useLayoutEffect, useRef, useState } from 'react';
import { AppStateProvider } from './platform/AppState';
import { GameShell } from './platform/components/GameShell';
import { GridIcon, UserIcon, GearIcon } from './platform/components/ui';
import { HomePage } from './platform/pages/HomePage';
import { ProfilePage } from './platform/pages/ProfilePage';
import { SettingsPage } from './platform/pages/SettingsPage';
import { getGame } from './platform/registry';
import { sfx } from './platform/audio';
import type { CategoryId } from './platform/types';

type Tab = 'games' | 'profile' | 'settings';

function Shell() {
  const [tab, setTab] = useState<Tab>('games');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  /**
   * Browsing state outlives a game visit. HomePage unmounts while playing,
   * so the search text and category filter live here, and the list's scroll
   * offset is captured on the way in and restored on the way out — trying
   * game #40 must not dump you back at the top of a 67-game list.
   */
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const listScroll = useRef(0);

  useLayoutEffect(() => {
    // entering a game starts at the top; leaving one lands where you were
    window.scrollTo(0, activeGameId ? 0 : listScroll.current);
  }, [activeGameId]);

  const activeGame = activeGameId ? getGame(activeGameId) : undefined;

  if (activeGame) {
    return <GameShell game={activeGame} onExit={() => setActiveGameId(null)} />;
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
            onOpenGame={(gameId) => {
              listScroll.current = window.scrollY;
              setActiveGameId(gameId);
            }}
          />
        )}
        {tab === 'profile' && <ProfilePage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="tab-bar">
        {(
          [
            ['games', 'Games', <GridIcon key="i" />],
            ['profile', 'Profile', <UserIcon key="i" />],
            ['settings', 'Settings', <GearIcon key="i" />]
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => {
              sfx.tap();
              setTab(id);
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
