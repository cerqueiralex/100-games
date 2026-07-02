import { useState } from 'react';
import { useAppState } from '../AppState';
import { Modal, Toggle } from '../components/ui';
import { exportData } from '../storage';
import { sfx } from '../audio';
import type { AccentId, ThemeId } from '../types';

const THEMES: { id: ThemeId; name: string; desc: string }[] = [
  { id: 'black', name: 'Pure black', desc: 'True black, easy on OLED screens' },
  { id: 'dim', name: 'Dim', desc: 'Soft dark gray' },
  { id: 'light', name: 'Light', desc: 'For bright rooms' }
];

/** Swatch colors mirror the accent tokens in src/platform/design/tokens.css. */
const ACCENTS: { id: AccentId; name: string; color: string }[] = [
  { id: 'orange', name: 'Orange', color: '#ff9f0a' },
  { id: 'blue', name: 'Blue', color: '#0a84ff' },
  { id: 'green', name: 'Green', color: '#30d158' },
  { id: 'red', name: 'Red', color: '#ff453a' },
  { id: 'purple', name: 'Purple', color: '#bf5af2' },
  { id: 'white', name: 'B & W', color: '#ffffff' }
];

export function SettingsPage() {
  const { settings, updateSettings, profile, wipeHistory, wipeEverything } = useAppState();
  const [confirm, setConfirm] = useState<'history' | 'all' | null>(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '100games-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen">
      <header className="screen-header plain">
        <h1>Settings</h1>
      </header>

      <section className="setup-section">
        <h3 className="section-title">Appearance</h3>
        <div className="theme-row">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-btn theme-${t.id} ${settings.theme === t.id ? 'active' : ''}`}
              onClick={() => updateSettings({ theme: t.id })}
            >
              <span className="theme-dot" />
              <span className="theme-name">{t.name}</span>
              <span className="theme-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="setup-section">
        <h3 className="section-title">Theme color</h3>
        <p className="section-note">
          Colors every tool in every game — highlights, hints, selections and toggles.
        </p>
        <div className="accent-row">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              className={`accent-btn ${settings.accent === a.id ? 'active' : ''}`}
              onClick={() => updateSettings({ accent: a.id })}
            >
              <span className="accent-dot" style={{ background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>
      </section>

      <section className="setup-section">
        <h3 className="section-title">Sound</h3>
        <div className="card-list">
          <Toggle
            checked={settings.soundEnabled}
            onChange={(v) => {
              updateSettings({ soundEnabled: v });
              if (v) setTimeout(sfx.place, 50);
            }}
            label="Sound effects"
            description="Taps, placements, wins and errors"
          />
          <div className="volume-row">
            <span className="toggle-label">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
              onMouseUp={() => sfx.place()}
              onTouchEnd={() => sfx.place()}
              disabled={!settings.soundEnabled}
            />
          </div>
        </div>
      </section>

      <section className="setup-section">
        <h3 className="section-title">Account</h3>
        <div className="card-list">
          <div className="settings-info-row">
            <span className="toggle-label">
              {profile.emoji} {profile.name}
            </span>
            <span className="toggle-desc">Edit your name and avatar from the Profile tab.</span>
            <span className="toggle-desc">
              All data lives on this device — no account or internet needed.
            </span>
          </div>
        </div>
      </section>

      <section className="setup-section">
        <h3 className="section-title">Game assists</h3>
        <p className="section-note">
          Each game has its own assist toggles on its start screen. Whatever you use is recorded in
          your history, so clean wins stay distinguishable from assisted ones.
        </p>
      </section>

      <section className="setup-section">
        <h3 className="section-title">Data</h3>
        <div className="card-list">
          <button className="settings-action" onClick={download}>
            Export my data (JSON)
          </button>
          <button className="settings-action warn" onClick={() => setConfirm('history')}>
            Clear game history
          </button>
          <button className="settings-action warn" onClick={() => setConfirm('all')}>
            Reset everything
          </button>
        </div>
      </section>

      <p className="about-note">100 Games · v0.1 · built as a PWA — install it from your browser menu.</p>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'history' ? 'Clear all game history?' : 'Reset everything?'}
      >
        <p className="modal-text">
          {confirm === 'history'
            ? 'All scores and statistics will be deleted. This cannot be undone.'
            : 'History, settings and profile will be wiped. This cannot be undone.'}
        </p>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            className="danger-btn"
            onClick={() => {
              if (confirm === 'history') wipeHistory();
              else wipeEverything();
              setConfirm(null);
            }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
