import { useAppState } from '../AppState';
import { GAMES } from '../registry';
import { computeStats, formatDuration } from '../stats';

export function HomePage({ onOpenGame }: { onOpenGame: (gameId: string) => void }) {
  const { profile, history } = useAppState();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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

      <div className="game-cards">
        {GAMES.map((game) => {
          const stats = computeStats(history.filter((r) => r.gameId === game.id));
          return (
            <button key={game.id} className="game-card" onClick={() => onOpenGame(game.id)}>
              <span className="game-card-icon">{game.icon}</span>
              <span className="game-card-body">
                <span className="game-card-name">{game.name}</span>
                <span className="game-card-tag">{game.tagline}</span>
                <span className="game-card-stats">
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
              <span className="game-card-go">›</span>
            </button>
          );
        })}

        <div className="game-card coming-soon">
          <span className="game-card-icon">…</span>
          <span className="game-card-body">
            <span className="game-card-name">More classics coming</span>
            <span className="game-card-tag">Cryptogram, Solitaire, Minesweeper…</span>
          </span>
        </div>
      </div>
    </div>
  );
}
