import { useRef, useState } from 'react';
import { useAppState } from '../AppState';
import { Modal, Toggle } from '../components/ui';
import { applyBackup, exportBackup, parseBackup, type ParseResult } from '../backup';
import { ExportIcon, ExternalLinkIcon, ImportIcon, ShareIcon, TrashIcon, WarnIcon } from '../design/icons';
import { sfx } from '../audio';
import { buildLine, VERSION_LABEL } from '../version';
import { FEATS } from '../progress/progress';
import type { ThemeId } from '../types';
import { Avatar } from '../design/avatars';

const THEMES: { id: ThemeId; name: string; desc: string }[] = [
  { id: 'black', name: 'Pure black', desc: 'True black, easy on OLED screens' },
  { id: 'dim', name: 'Dim', desc: 'Soft dark gray' },
  { id: 'light', name: 'Light', desc: 'For bright rooms' }
];

export function SettingsPage() {
  const { settings, updateSettings, profile, wipeHistory, wipeEverything, reloadFromStorage, markFeat } =
    useAppState();
  const [confirm, setConfirm] = useState<'history' | 'all' | null>(null);
  /** brief "Link copied!" feedback on the share card */
  const [copied, setCopied] = useState(false);
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
    markFeat(FEATS.backupOut);
  };

  const pickFile = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()));
    } catch {
      setPending({ ok: false, error: "That file couldn't be read. Try exporting it again." });
    }
  };

  /* The shareable link is DERIVED, never hardcoded: origin + BASE_URL is
     the deployed Pages URL in production and the LAN address in dev, so the
     card always hands out the app the player is actually running. */
  const appUrl = new URL(import.meta.env.BASE_URL, window.location.href).toString();

  /* Tapping the card always copies the link; devices with a native share
     sheet (the installed PWA on a phone) get it opened on top, with the
     copy as the safety net underneath. Either outcome is a share, so the
     Spread the Word feat stamps on the first success — recordFeat pays
     only once, like every out-of-game feat. Dismissing the sheet after a
     successful copy still copied, so the stamp stands. */
  const shareApp = async () => {
    sfx.tap();
    let done = false;
    try {
      await navigator.clipboard.writeText(appUrl);
      done = true;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard blocked — the share sheet below may still succeed
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: '100 Games', url: appUrl });
        done = true;
      } catch {
        // sheet dismissed — not a share unless the copy above landed
      }
    }
    if (done) markFeat(FEATS.sharedApp);
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
        <h3 className="section-title">Share the app</h3>
        <p className="section-note">
          100 Games is free and needs no store, no account and no install — anyone who opens the
          link gets the whole library. Tap the card to copy it (your phone&rsquo;s share sheet opens
          too, where it has one).
        </p>
        <div className="card-list">
          <button className="settings-action" onClick={() => void shareApp()}>
            <ShareIcon />
            <span>{copied ? 'Link copied!' : appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
          </button>
          <div className="settings-info-row">
            <span className="toggle-label">Add to your iPhone home screen</span>
            <span className="toggle-desc">
              Open the link in Safari, tap the Share button (the square with an arrow), then choose
              &ldquo;Add to Home Screen&rdquo;. The app gets its own icon and runs full-screen,
              fully offline.
            </span>
          </div>
          <div className="settings-info-row">
            <span className="toggle-label">Add to your Android home screen</span>
            <span className="toggle-desc">
              Open the link in Chrome, tap the ⋮ menu, then choose &ldquo;Add to Home screen&rdquo;
              (on some phones &ldquo;Install app&rdquo;). Same thing: an icon of its own, works
              offline.
            </span>
          </div>
        </div>
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

      <section className="setup-section">
        <h3 className="section-title">About</h3>
        <p className="section-note">
          Every change ever shipped to the app, newest first — the build number below is this
          list&rsquo;s length.
        </p>
        <div className="card-list">
          {/* opens the source repository in a new tab; the row wears the same
              plate as the actions above, minus an anchor's own link styling */}
          <a
            className="settings-action"
            href="https://github.com/cerqueiralex/100-games/commits/main/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.tap()}
          >
            <ExternalLinkIcon />
            <span>Updates and patches</span>
          </a>
          {/* Chess plays against Stockfish (GPLv3), shipped as a separate
              program under public/stockfish/ and spoken to over UCI — the
              credit and the license are the one obligation that brings */}
          <a
            className="settings-action"
            href={`${import.meta.env.BASE_URL}stockfish/LICENSE-STOCKFISH.txt`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.tap()}
          >
            <ExternalLinkIcon />
            <span>Stockfish engine license (GPLv3)</span>
          </a>
        </div>
        <p className="section-note">
          Chess is played against the Stockfish engine (Stockfish.js build by Nathan Rugg / Chess.com,
          GPLv3), which runs on this device as a separate program the app talks to over UCI. It is
          downloaded once, the first time a medium-or-harder game starts.
        </p>
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
              <span className="import-avatar">
                <Avatar value={pending.summary.playerEmoji} />
              </span>
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
                // after the reload: the imported file replaced the progress
                // store, so the feat belongs to the store that is now on the
                // device (and may already be in it)
                markFeat(FEATS.backupIn);
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
