import { useState } from 'react';
import { useAppState } from '../AppState';
import { GAMES } from '../registry';
import { computeStats, formatDuration } from '../stats';
import { SearchIcon, StarIcon } from '../design/icons';
import { sfx } from '../audio';
import type { GameDefinition } from '../types';

export function HomePage({ onOpenGame }: { onOpenGame: (gameId: string) => void }) {
  const { profile, history, settings, updateSettings } = useAppState();
  const [query, setQuery] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const q = query.trim().toLowerCase();
  const visible = q
    ? GAMES.filter((g) => `${g.name} ${g.tagline}`.toLowerCase().includes(q))
    : GAMES;

  const favorites = settings.favorites;
  const pinned = visible.filter((g) => favorites.includes(g.id));
  const rest = visible.filter((g) => !favorites.includes(g.id));

  const toggleFavorite = (gameId: string) => {
    sfx.tap();
    updateSettings({
      favorites: favorites.includes(gameId)
        ? favorites.filter((id) => id !== gameId)
        : [...favorites, gameId]
    });
  };

  const renderCard = (game: GameDefinition) => {
    const stats = computeStats(history.filter((r) => r.gameId === game.id));
    const fav = favorites.includes(game.id);
    return (
      <button key={game.id} className="game-card fx-card" onClick={() => onOpenGame(game.id)}>
        {/* info column (icon + name/tagline, stats pill below) fills the
            card; pin and arrow sit beside it, centered on the FULL card
            height */}
        <span className="game-card-main">
          <span className="game-card-top">
            <span className="game-card-icon">{game.icon}</span>
            <span className="game-card-body">
              <span className="game-card-name">{game.name}</span>
              <span className="game-card-tag">{game.tagline}</span>
            </span>
          </span>
          <span className={`game-card-stats ${stats.played > 0 ? 'has-stats' : ''}`}>
            {stats.played > 0 ? (
              <>
                {stats.played} played · best{' '}
                {stats.bestTime !== null ? formatDuration(stats.bestTime) : '—'} ·{' '}
                {Math.round(stats.winRate * 100)}% wins
              </>
            ) : (
              'Not played yet'
            )}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label={fav ? `Unpin ${game.name}` : `Pin ${game.name}`}
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(game.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(game.id);
            }
          }}
        >
          <StarIcon filled={fav} />
        </span>
        <span className="game-card-go">›</span>
      </button>
    );
  };

  return (
    <div className="screen">
      <header className="home-header">
        <div>
          <p className="home-greeting">
            {greeting}, {profile.name}
          </p>
          <h1 className="home-title">What are we playing?</h1>
        </div>
        <span className="home-avatar">{profile.emoji}</span>
      </header>

      <div className="search-bar">
        <SearchIcon />
        <input
          type="search"
          className="search-input"
          placeholder="Search games…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search games"
        />
        {query && (
          <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {pinned.length > 0 && (
        <>
          <h3 className="section-title home-section">
            <StarIcon size={13} filled /> Pinned
          </h3>
          <div className="game-cards">{pinned.map(renderCard)}</div>
        </>
      )}

      {pinned.length > 0 && rest.length > 0 && (
        <h3 className="section-title home-section">All games</h3>
      )}

      <div className="game-cards">
        {rest.map(renderCard)}

        {visible.length === 0 && <p className="empty-note">No games match “{query}”.</p>}

        {!q && (
          <div className="game-card fx-card coming-soon">
            <span className="game-card-main">
              <span className="game-card-top">
                <span className="game-card-icon">…</span>
                <span className="game-card-body">
                  <span className="game-card-name">More classics coming</span>
                  <span className="game-card-tag">Solitaire, 2048, Nonograms…</span>
                </span>
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
