import { useState } from 'react';
import { useAppState } from '../AppState';
import { GAMES, getGame } from '../registry';
import { computeStats, formatDate, formatDuration } from '../stats';
import { Chip, Dropdown, Modal, StatCard } from '../components/ui';
import type { GameResult } from '../types';

const EMOJIS = ['🎮', '🦊', '🐼', '🦉', '🐯', '🚀', '🌙', '⚡', '🎯', '🧩', '👾', '🏆'];

function HistoryRow({ result }: { result: GameResult }) {
  const game = getGame(result.gameId);
  const assistNames = new Map(game?.assistFeatures.map((f) => [f.id, f.name]) ?? []);
  const [expanded, setExpanded] = useState(false);
  const helped = result.hintsUsed > 0 || result.assistsUsed.length > 0;

  return (
    <button className="history-row" onClick={() => setExpanded((e) => !e)}>
      <div className="history-main">
        <span
          className={`history-outcome ${result.outcome}`}
          title={result.outcome}
          aria-label={result.outcome}
        />
        <div className="history-text">
          <span className="history-title">
            {game?.name ?? result.gameId}
            <Chip tone="muted">{result.difficulty}</Chip>
            {result.outcome === 'won' &&
              (result.cleanWin ? <Chip tone="good">clean</Chip> : <Chip tone="accent">with help</Chip>)}
            {result.outcome === 'lost' && <Chip tone="bad">lost</Chip>}
            {result.outcome === 'abandoned' && <Chip tone="muted">abandoned</Chip>}
          </span>
          <span className="history-sub">
            {formatDate(result.finishedAt)} · {formatDuration(result.durationSec)} ·{' '}
            {result.score.toLocaleString()} pts
          </span>
        </div>
      </div>
      {expanded && (
        <div className="history-detail">
          <span>Errors: {result.errors}</span>
          <span>Hints: {result.hintsUsed}</span>
          {result.extra?.puzzle && <span>Puzzle: {result.extra.puzzle}</span>}
          <span>
            Help used:{' '}
            {helped
              ? result.assistsUsed.map((a) => assistNames.get(a) ?? a).join(', ') || 'hints'
              : 'none'}
          </span>
        </div>
      )}
    </button>
  );
}

export function ProfilePage() {
  const { profile, updateProfile, history } = useAppState();
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);

  const filtered = filter === 'all' ? history : history.filter((r) => r.gameId === filter);
  const stats = computeStats(filtered);
  const scopeGames = filter === 'all' ? GAMES : GAMES.filter((g) => g.id === filter);

  return (
    <div className="screen">
      <header className="profile-header">
        <button className="profile-avatar" onClick={() => setEditing(true)} aria-label="Edit profile">
          {profile.emoji}
        </button>
        <div>
          <h1 className="profile-name">{profile.name}</h1>
          <p className="profile-sub">
            Playing since{' '}
            {new Date(profile.joinedAt).toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <button className="ghost-btn small" onClick={() => setEditing(true)}>
          Edit
        </button>
      </header>

      <div className="filter-bar">
        <Dropdown
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter statistics by game"
          options={[
            { value: 'all', label: 'All games' },
            ...GAMES.map((g) => ({ value: g.id, label: g.name }))
          ]}
        />
      </div>

      <section className="setup-section">
        <h3 className="section-title">Statistics</h3>
        <div className="stat-grid">
          <StatCard label="Games played" value={stats.played} />
          <StatCard label="Win rate" value={`${Math.round(stats.winRate * 100)}%`} hint={`${stats.won} won · ${stats.lost} lost`} />
          <StatCard label="Best time" value={stats.bestTime !== null ? formatDuration(stats.bestTime) : '—'} />
          <StatCard label="Avg time" value={stats.avgTime !== null ? formatDuration(stats.avgTime) : '—'} />
          <StatCard label="High score" value={stats.bestScore?.toLocaleString() ?? '—'} />
          <StatCard label="Avg score" value={stats.avgScore !== null ? Math.round(stats.avgScore).toLocaleString() : '—'} />
          <StatCard label="Clean wins" value={stats.cleanWins} hint="won without help" />
          <StatCard label="Wins with help" value={stats.assistedWins} />
          <StatCard label="Total errors" value={stats.totalErrors} />
          <StatCard label="Hints used" value={stats.totalHints} />
          <StatCard label="Win streak" value={stats.currentStreak} hint={`best ${stats.bestStreak}`} />
          <StatCard label="Time played" value={formatDuration(stats.totalTimeSec)} />
        </div>
      </section>

      <section className="setup-section">
        <h3 className="section-title">High scores by difficulty</h3>
        {scopeGames.map((g) => {
          const gs = computeStats(history.filter((r) => r.gameId === g.id));
          return (
            <div key={g.id} className="highscore-card fx-card">
              <span className="highscore-game">{g.name}</span>
              <div className="highscore-cols">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <div key={d} className="highscore-col">
                    <span className="highscore-diff">{d}</span>
                    <span className="highscore-val">
                      {gs.perDifficulty[d].bestScore?.toLocaleString() ?? '—'}
                    </span>
                    <span className="highscore-time">
                      {gs.perDifficulty[d].bestTime !== null
                        ? formatDuration(gs.perDifficulty[d].bestTime!)
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="setup-section">
        <h3 className="section-title">History</h3>
        {filtered.length === 0 ? (
          <p className="empty-note">No games yet. Play something!</p>
        ) : (
          <div className="history-list">
            {filtered.slice(0, 100).map((r) => (
              <HistoryRow key={r.id} result={r} />
            ))}
          </div>
        )}
      </section>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit profile">
        <label className="field-label" htmlFor="profile-name">
          Name
        </label>
        <input
          id="profile-name"
          className="text-input"
          value={nameDraft}
          maxLength={20}
          onChange={(e) => setNameDraft(e.target.value)}
        />
        <label className="field-label">Avatar</label>
        <div className="emoji-grid">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className={`emoji-btn ${profile.emoji === e ? 'active' : ''}`}
              onClick={() => updateProfile({ emoji: e })}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button
            className="primary-btn"
            onClick={() => {
              updateProfile({ name: nameDraft.trim() || 'Player' });
              setEditing(false);
            }}
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
