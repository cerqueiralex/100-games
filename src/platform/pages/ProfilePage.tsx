import { useMemo, useState, type CSSProperties } from 'react';
import { useAppState } from '../AppState';
import { sfx } from '../audio';
import { GAMES, getGame } from '../registry';
import { activeCategories, categoryName, gameCategory } from '../categories';
import { computeStats, formatDate, formatDuration } from '../stats';
import { allDifficultiesBeaten, beatenDifficulties, computeStreak } from '../progress/progress';
import { CrownIcon, StarIcon } from '../design/icons';
import { StreakHero } from '../components/Streak';
import { LevelHero } from '../components/Level';
import { LandmarkBadges, LandmarksSection } from '../components/Landmarks';
import { DailyHistorySection } from '../components/DailyChallenge';
import { dailyStreakInfo, loadDaily } from '../daily/store';
import { Avatar, POKEMON_AVATARS, pokemonAvatarValue } from '../design/avatars';
import { PROFILE_COLORS, profileHex } from '../design/profileColors';
import { CalendarPicker, Chip, Dropdown, Modal, StatCard } from '../components/ui';
import { ActivityChart, CategoryBarChart, GamesPieChart, TrendChart } from '../components/charts';
import type { CategoryId, GameResult } from '../types';

const EMOJIS = ['🎮', '🦊', '🐼', '🦉', '🐯', '🚀', '🌙', '⚡', '🎯', '🧩', '👾', '🏆'];

/** The "standard" swatch: four flat quarters of the content palette, which is
    what the charts keep when no profile color is picked. Four fills rather
    than a gradient, per the flat-surface rule. */
function StandardSwatch() {
  return (
    <svg viewBox="0 0 20 20" width="24" height="24" aria-hidden>
      <rect x="0" y="0" width="10" height="10" fill="var(--play-1)" />
      <rect x="10" y="0" width="10" height="10" fill="var(--play-4)" />
      <rect x="0" y="10" width="10" height="10" fill="var(--play-3)" />
      <rect x="10" y="10" width="10" height="10" fill="var(--play-5)" />
    </svg>
  );
}

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
  const { profile, updateProfile, history, progress, settings } = useAppState();
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const streak = useMemo(() => computeStreak(progress.days), [progress]);
  // the live daily run, for the daily landmark meters (progress only keeps
  // the best-ever, which is what UNLOCKS them — see landmarkMeter)
  const dailyCurrent = useMemo(() => dailyStreakInfo(loadDaily()).current, []);

  // scopes: everything, one category ('cat:<id>'), or a single game
  const catScope = filter.startsWith('cat:') ? (filter.slice(4) as CategoryId) : null;
  const filtered =
    filter === 'all'
      ? history
      : catScope
        ? history.filter((r) => gameCategory(r.gameId) === catScope)
        : history.filter((r) => r.gameId === filter);
  const stats = computeStats(filtered);
  const scopeGames =
    filter === 'all'
      ? GAMES
      : catScope
        ? GAMES.filter((g) => g.category === catScope)
        : GAMES.filter((g) => g.id === filter);

  /* Games wearing the swept-all-difficulties crown. Two readings, on purpose:
     the KPI in the statistics grid is SCOPED like every other card there, so
     it answers "how many in what I'm looking at"; the badge in the level
     card's corner is the lifetime total, because that card is the player's
     identity and does not move when they filter the page below it. They
     agree whenever the scope is "All games". */
  const crowns = scopeGames.filter((g) => allDifficultiesBeaten(progress, g.id)).length;
  const totalCrowns = GAMES.filter((g) => allDifficultiesBeaten(progress, g.id)).length;

  // most played category across the current scope
  const catCounts = new Map<CategoryId, number>();
  for (const r of filtered) {
    const c = gameCategory(r.gameId);
    catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  const topCat = [...catCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  // history grouped by day, with a day filter fed by the days actually
  // played. Defaults to TODAY so opening the profile isn't a wall of games
  // (falls back to all dates automatically when today has none).
  const [dateFilter, setDateFilter] = useState<string>(() => new Date().toDateString());
  const dayOf = (ts: number) => new Date(ts).toDateString();
  const dayLabel = (key: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(key);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
    });
  };
  const dateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      const k = dayOf(r.finishedAt);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([key, count]) => ({ key, label: dayLabel(key), count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);
  // a day emptied by a scope change silently falls back to all dates
  const effectiveDate = dateOptions.some((d) => d.key === dateFilter) ? dateFilter : 'all';
  const historyGroups = useMemo(() => {
    const shown =
      effectiveDate === 'all'
        ? filtered.slice(0, 100)
        : filtered.filter((r) => dayOf(r.finishedAt) === effectiveDate);
    const groups: [string, GameResult[]][] = [];
    for (const r of shown) {
      const k = dayOf(r.finishedAt);
      const last = groups[groups.length - 1];
      if (last && last[0] === k) last[1].push(r);
      else groups.push([k, [r]]);
    }
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, effectiveDate]);

  return (
    <div className="screen">
      <header className="profile-header">
        <button className="profile-avatar" onClick={() => setEditing(true)} aria-label="Edit profile">
          <Avatar value={profile.emoji} />
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

      {/* level is the first section: it summarises everything below it, and
          the badge panel at its foot is the display case for what that
          summary has actually earned */}
      <section className="setup-section">
        <LevelHero
          xp={progress.xp}
          crowns={totalCrowns}
          badges={<LandmarkBadges progress={progress} />}
        />
      </section>

      <section className="setup-section">
        <StreakHero streak={streak} />
      </section>

      {/* the two streaks sit together: "played anything" above, "played
          today's board" below, so the difference between them is visible */}
      <DailyHistorySection />

      <div className="filter-bar">
        <Dropdown
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter statistics by game"
          options={[
            { value: 'all', label: 'All games' },
            ...activeCategories().map((c) => ({ value: `cat:${c.id}`, label: `Category · ${c.name}` })),
            ...GAMES.map((g) => ({ value: g.id, label: g.name }))
          ]}
        />
      </div>

      {filter === 'all' ? (
        <>
          <section className="setup-section">
            <h3 className="section-title">Categories</h3>
            <div className="chart-card fx-card">
              <CategoryBarChart history={history} />
            </div>
          </section>
          <section className="setup-section">
            <h3 className="section-title">Most played</h3>
            <div className="chart-card fx-card">
              <GamesPieChart history={history} />
            </div>
          </section>
          <section className="setup-section">
            <h3 className="section-title">Activity — last 30 days</h3>
            <div className="chart-card fx-card">
              <ActivityChart history={history} />
            </div>
          </section>
        </>
      ) : (
        <>
          {catScope && (
            <section className="setup-section">
              <h3 className="section-title">Most played — {categoryName(catScope)}</h3>
              <div className="chart-card fx-card">
                <GamesPieChart history={filtered} />
              </div>
            </section>
          )}
          <section className="setup-section">
            <h3 className="section-title">Progress — last 30 days</h3>
            <div className="chart-card fx-card">
              <TrendChart results={filtered} />
            </div>
          </section>
        </>
      )}

      <section className="setup-section">
        <h3 className="section-title">Statistics</h3>
        <div className="stat-grid">
          <StatCard label="Games played" value={stats.played} />
          {/* The crown a game earns for being beaten on all five tiers: read
              from the PROGRESS store like every other completion marker,
              never recomputed from the capped-and-clearable history (see
              CLAUDE.md "Completion markers"). Named "Game crowns" rather than
              "Crowns" because the rank ladder on this same page has six
              crowns of its own, and the hint stays to one line — every other
              hint in this grid does, and one card growing a third row breaks
              the row rhythm. */}
          <StatCard
            label="Game crowns"
            value={crowns}
            hint={`of ${scopeGames.length} ${scopeGames.length === 1 ? 'game' : 'games'}`}
          />
          <StatCard
            label="Top category"
            value={topCat ? categoryName(topCat[0]) : '—'}
            hint={topCat ? `${topCat[1]} plays` : 'no games yet'}
          />
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

      <LandmarksSection progress={progress} streak={streak} dailyCurrent={dailyCurrent} />

      <section className="setup-section">
        <h3 className="section-title">High scores by difficulty</h3>
        {scopeGames.map((g) => {
          const gs = computeStats(history.filter((r) => r.gameId === g.id));
          const beaten = beatenDifficulties(progress, g.id);
          return (
            <div key={g.id} className="highscore-card fx-card">
              {allDifficultiesBeaten(progress, g.id) && (
                <span
                  className="game-card-trophy hs-trophy"
                  title="Beaten on every difficulty"
                  aria-label="Beaten on every difficulty"
                >
                  <CrownIcon size={18} />
                </span>
              )}
              <span className="highscore-game">{g.name}</span>
              <div className="highscore-cols">
                {(['easy', 'medium', 'hard', 'pro', 'extreme'] as const).map((d) => (
                  <div key={d} className={`highscore-col ${beaten.includes(d) ? 'beaten' : ''}`}>
                    {beaten.includes(d) && (
                      <span className="beat-seal" aria-label="completed">
                        <StarIcon size={10} filled />
                      </span>
                    )}
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
          <>
            <div className="history-datebar">
              <CalendarPicker
                value={effectiveDate}
                onChange={setDateFilter}
                ariaLabel="Filter history by date"
                days={new Map(dateOptions.map((d) => [d.key, d.count]))}
              />
            </div>
            {historyGroups.map(([key, rows]) => (
              <div key={key} className="history-group">
                <h4 className="history-day-head">
                  {dayLabel(key)}
                  <span>{rows.length}</span>
                </h4>
                <div className="history-list">
                  {rows.map((r) => (
                    <HistoryRow key={r.id} result={r} />
                  ))}
                </div>
              </div>
            ))}
          </>
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
        {/* Color sits right under the name: it is the player's identity, not a
            board setting — it paints their frames, their progression color and
            their charts, and never a game. "Standard" is a real choice, so a
            player who tries one can always get the shipped look back. */}
        <label className="field-label">Color</label>
        <div className="color-row">
          <button
            className={`color-swatch ${profile.color ? '' : 'active'}`}
            onClick={() => {
              sfx.tap();
              updateProfile({ color: undefined });
            }}
            title="Standard"
            aria-label="Standard color"
            aria-pressed={!profile.color}
          >
            <span className="color-dot standard">
              <StandardSwatch />
            </span>
          </button>
          {PROFILE_COLORS.map((c) => (
            <button
              key={c.id}
              className={`color-swatch ${profile.color === c.id ? 'active' : ''}`}
              style={{ '--sw': profileHex(c.id, settings.theme) } as CSSProperties}
              onClick={() => {
                sfx.tap();
                updateProfile({ color: c.id });
              }}
              title={c.name}
              aria-label={c.name}
              aria-pressed={profile.color === c.id}
            >
              <span className="color-dot" />
            </button>
          ))}
        </div>
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
        {/* Sprite avatars sit in their own labelled row: they are pictures
            rather than glyphs, so mixing them into the emoji grid would put
            two different kinds of art on one line. */}
        <label className="field-label">Pokémon</label>
        <div className="emoji-grid">
          {POKEMON_AVATARS.map((p) => {
            const value = pokemonAvatarValue(p.id);
            return (
              <button
                key={p.id}
                className={`emoji-btn sprite ${profile.emoji === value ? 'active' : ''}`}
                onClick={() => updateProfile({ emoji: value })}
                title={p.name}
                aria-label={p.name}
              >
                <Avatar value={value} />
              </button>
            );
          })}
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
