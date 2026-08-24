import { useRef, useState } from 'react';
import { useAppState } from '../AppState';
import { Modal, Toggle } from '../components/ui';
import { applyBackup, exportBackup, parseBackup, type ParseResult } from '../backup';
import { ExportIcon, ImportIcon, TrashIcon, WarnIcon } from '../design/icons';
import { sfx } from '../audio';
import { buildLine, VERSION_LABEL } from '../version';
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
  const { settings, updateSettings, profile, wipeHistory, wipeEverything, reloadFromStorage } =
    useAppState();
  const [confirm, setConfirm] = useState<'history' | 'all' | null>(null);
  /** the picked file, validated and awaiting the player's go-ahead */
  const [pending, setPending] = useState<ParseResult | null>(null);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `100games-${profile.name.toLowerCase().replace(/\s+/g, '-') || 'data'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickFile = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()));
    } catch {
      setPending({ ok: false, error: "That file couldn't be read. Try exporting it again." });
    }
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
        <p className="section-note">
          Your profile, history, streak and landmarks live only on this device. Export a backup to
          move them to another device — or to share your profile with a friend.
        </p>
        <div className="card-list">
          <button className="settings-action" onClick={download}>
            <ExportIcon />
            <span>Export my data (JSON)</span>
          </button>
          <button
            className="settings-action"
            onClick={() => {
              sfx.tap();
              fileRef.current?.click();
            }}
          >
            <ImportIcon />
            <span>Import data (JSON)</span>
          </button>
          {/* the picker itself stays hidden — the styled button drives it */}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              // reset so re-picking the SAME file fires change again
              e.target.value = '';
              if (file) void pickFile(file);
            }}
          />
          <button className="settings-action warn" onClick={() => setConfirm('history')}>
            <TrashIcon />
            <span>Clear game history</span>
          </button>
          <button className="settings-action warn" onClick={() => setConfirm('all')}>
            <WarnIcon />
            <span>Reset everything</span>
          </button>
        </div>
      </section>

      <p className="about-note">100 Games · built as a PWA — install it from your browser menu.</p>
      {/* selectable: this is the line a player reads back when reporting a bug */}
      <p className="about-version">
        <span className="about-version-num">{VERSION_LABEL}</span>
        {buildLine() && <span className="about-build"> · {buildLine()}</span>}
      </p>

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

      {/* import: always preview what's in the file, then confirm — it
          replaces what's on this device, so it needs the same explicit
          step as the destructive actions above */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.ok ? 'Import this backup?' : "That file didn't work"}
      >
        {pending?.ok === false && <p className="modal-text">{pending.error}</p>}
        {pending?.ok && (
          <>
            <div className="import-preview">
              <span className="import-avatar">{pending.summary.playerEmoji}</span>
              <span className="import-who">
                <strong>{pending.summary.playerName}</strong>
                <span className="toggle-desc">
                  {pending.summary.games} {pending.summary.games === 1 ? 'game' : 'games'} ·{' '}
                  {pending.summary.days} {pending.summary.days === 1 ? 'day' : 'days'} played ·{' '}
                  {pending.summary.landmarks}{' '}
                  {pending.summary.landmarks === 1 ? 'landmark' : 'landmarks'}
                </span>
                {pending.summary.exportedAt && (
                  <span className="toggle-desc">Exported {pending.summary.exportedAt}</span>
                )}
              </span>
            </div>
            <p className="modal-text">
              This replaces the {pending.summary.sections.join(', ')} on this device. Export your own
              data first if you want to keep it.
            </p>
          </>
        )}
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setPending(null)}>
            {pending?.ok ? 'Cancel' : 'Close'}
          </button>
          {pending?.ok && (
            <button
              className="primary-btn"
              onClick={() => {
                applyBackup(pending.payload);
                reloadFromStorage();
                setPending(null);
                setImported(true);
                sfx.win();
              }}
            >
              Import
            </button>
          )}
        </div>
      </Modal>

      <Modal open={imported} onClose={() => setImported(false)} title="Data imported">
        <p className="modal-text">
          Your profile, history, streak and landmarks are now on this device.
        </p>
        <div className="modal-actions">
          <button className="primary-btn" onClick={() => setImported(false)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
