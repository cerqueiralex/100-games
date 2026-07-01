import { useState } from 'react';
import { AppStateProvider } from './platform/AppState';
import { GameShell } from './platform/components/GameShell';
import { GridIcon, UserIcon, GearIcon } from './platform/components/ui';
import { HomePage } from './platform/pages/HomePage';
import { ProfilePage } from './platform/pages/ProfilePage';
import { SettingsPage } from './platform/pages/SettingsPage';
import { getGame } from './platform/registry';
import { sfx } from './platform/audio';

type Tab = 'games' | 'profile' | 'settings';

function Shell() {
  const [tab, setTab] = useState<Tab>('games');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const activeGame = activeGameId ? getGame(activeGameId) : undefined;

  if (activeGame) {
    return <GameShell game={activeGame} onExit={() => setActiveGameId(null)} />;
  }

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'games' && <HomePage onOpenGame={setActiveGameId} />}
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
