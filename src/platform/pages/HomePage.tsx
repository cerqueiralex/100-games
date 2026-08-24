import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAppState } from '../AppState';
import { GAMES } from '../registry';
import { activeCategories, categoryColor, categoryName } from '../categories';
import { computeStats, formatDuration } from '../stats';
import { allDifficultiesBeaten, computeStreak } from '../progress/progress';
import { StreakChip } from '../components/Streak';
import { LevelChip, RankCrown } from '../components/Level';
import { rankForXp } from '../progress/xp';
import { ChevronIcon, ClockIcon, CrownIcon, SearchIcon, StarIcon } from '../design/icons';
import { sfx } from '../audio';
import type { CategoryId, GameDefinition } from '../types';

/** Search text and the category filter are owned by App so they survive a
    game visit along with the list's scroll position (see App.tsx). */
export function HomePage({
  onOpenGame,
  query,
  onQueryChange,
  category,
  onCategoryChange
}: {
  onOpenGame: (gameId: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  category: CategoryId | null;
  onCategoryChange: (c: CategoryId | null) => void;
}) {
  const { profile, history, settings, updateSettings, progress } = useAppState();
  const streak = useMemo(() => computeStreak(progress.days), [progress]);
  const rank = rankForXp(progress.xp);

  /**
   * "Last played" — the 3 most recently played games, newest first (history
   * is stored newest-first). Deduped by game, because replaying one game
   * three times would otherwise fill the whole row with it and the shortcut
   * would stop being a shortcut. Any outcome counts as played, matching the
   * progress store. A result whose game has left the registry is skipped.
   */
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: GameDefinition[] = [];
    for (const r of history) {
      if (seen.has(r.gameId)) continue;
      seen.add(r.gameId);
      const game = GAMES.find((g) => g.id === r.gameId);
      if (game) out.push(game);
      if (out.length === 3) break;
    }
    return out;
  }, [history]);

  /**
   * The category row scrolls sideways so it costs ONE line of vertical
   * space instead of wrapping to three on a phone. `edges` drives the
   * fade on each side — shown only where there is actually more content,
   * so the row reads as scrollable without faking a cut-off at the ends.
   */
  const chipsRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const syncEdges = useCallback(() => {
    const el = chipsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    syncEdges();
    const el = chipsRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncEdges, { passive: true });
    // the row's overflow changes with the viewport, so re-measure on resize
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncEdges) : null;
    ro?.observe(el);

    /* A plain mouse wheel only emits deltaY, which a horizontal container
       ignores — so on desktop the row looked stuck. Translate vertical
       wheel into sideways scroll, but hand the gesture back to the page at
       either end so hovering this row can never trap the page scroll. */
    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      // trackpads send deltaX and already scroll it natively
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + e.deltaY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', syncEdges);
      el.removeEventListener('wheel', onWheel);
      ro?.disconnect();
    };
  }, [syncEdges]);

  const scrollChips = (dir: -1 | 1) => {
    const el = chipsRef.current;
    if (!el) return;
    sfx.tap();
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const q = query.trim().toLowerCase();
  const visible = GAMES.filter(
    (g) =>
      (!q || `${g.name} ${g.tagline}`.toLowerCase().includes(q)) &&
      (!category || g.category === category)
  );

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
    const mastered = allDifficultiesBeaten(progress, game.id);
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
          <span className="game-card-meta">
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
            <span
              className="game-card-cat"
              style={{ '--cat': categoryColor(game.category) } as CSSProperties}
            >
              {categoryName(game.category)}
            </span>
          </span>
        </span>
        {mastered && (
          <span
            className="game-card-trophy"
            title="Beaten on every difficulty"
            aria-label="Beaten on every difficulty"
          >
            <CrownIcon size={18} />
          </span>
        )}
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
      <header className="home-header fx-card">
        <div className="home-head-text">
          <p className="home-greeting">{greeting},</p>
          <h1 className="home-title">{profile.name}</h1>
        </div>
        <div className="home-right">
          {/* the crown rides ahead of the level token — no plate of its own,
              so the header keeps three controls rather than growing a fourth */}
          {rank && (
            <span className="home-rank" title={`${rank.name} crown — level ${rank.level}+`}>
              <RankCrown rank={rank} size={28} />
            </span>
          )}
          <LevelChip xp={progress.xp} />
          <StreakChip streak={streak} />
          <span className="home-avatar">{profile.emoji}</span>
        </div>
      </header>

      <div className="search-bar">
        <SearchIcon />
        <input
          type="search"
          className="search-input"
          placeholder="Search games…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search games"
        />
        {query && (
          <button className="search-clear" onClick={() => onQueryChange('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {/* category filter — one sideways-scrolling line; tap a tag to filter,
          tap again (or All) to clear */}
      <div className={`cat-scroller ${edges.left ? 'fade-l' : ''} ${edges.right ? 'fade-r' : ''}`}>
        {/* arrows on every device: a wheel alone can't scroll a horizontal
            row on desktop, and on touch the arrow is what tells you there
            is anything to swipe to — a fade alone doesn't read that way */}
        <button
          className="cat-nav left"
          onClick={() => scrollChips(-1)}
          aria-label="Show previous categories"
          tabIndex={-1}
        >
          <ChevronIcon dir="left" />
        </button>
        <button
          className="cat-nav right"
          onClick={() => scrollChips(1)}
          aria-label="Show more categories"
          tabIndex={-1}
        >
          <ChevronIcon dir="right" />
        </button>
        <div className="cat-chips" ref={chipsRef}>
          <button
            className={`cat-chip ${category === null ? 'active' : ''}`}
            onClick={() => {
              sfx.tap();
              onCategoryChange(null);
            }}
          >
            All
          </button>
          {activeCategories().map((c) => (
            <button
              key={c.id}
              className={`cat-chip ${category === c.id ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                onCategoryChange(category === c.id ? null : c.id);
              }}
              aria-pressed={category === c.id}
            >
              <span className="cat-dot" style={{ background: categoryColor(c.id) }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Jump back into what you were playing. Hidden while searching or
          filtering: the page is then a result list, and three unrelated
          games pinned above it would just be noise. */}
      {!q && !category && recent.length > 0 && (
        <>
          <h3 className="section-title home-section">
            <ClockIcon size={13} /> Last played
          </h3>
          <div className="recent-row">
            {recent.map((game) => (
              <button
                key={game.id}
                className="recent-tile"
                onClick={() => onOpenGame(game.id)}
                title={game.name}
              >
                <span className="recent-icon">{game.icon}</span>
                <span className="recent-name">{game.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

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

        {visible.length === 0 && (
          <p className="empty-note">
            {q ? `No games match “${query}”.` : `No ${categoryName(category!)} games yet.`}
          </p>
        )}

        {!q && !category && (
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
