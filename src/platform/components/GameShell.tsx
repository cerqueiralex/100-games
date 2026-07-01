import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, FinishPayload, GameDefinition, GameResult, LiveStats } from '../types';
import { DIFFICULTIES } from '../types';
import { useAppState } from '../AppState';
import { resolveAssists } from '../storage';
import { formatDuration } from '../stats';
import { sfx } from '../audio';
import { BackIcon, Chip, HelpIcon, Modal, PauseIcon, PlayIcon, RestartIcon, ShareIcon, Toggle } from './ui';
import { ShareCardModal } from './ShareCard';
import { TutorialModal } from './Tutorial';

type Phase = 'setup' | 'playing' | 'finished';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
};

const emptyStats: LiveStats = { score: 0, errors: 0, hintsUsed: 0, assistsUsed: [] };

/**
 * Standard wrapper around every game: difficulty selection, assist toggles,
 * timing, pause, quit, result recording and the completion screen.
 */
export function GameShell({ game, onExit }: { game: GameDefinition; onExit: () => void }) {
  const { settings, updateSettings, setGameAssist, recordResult, profile } = useAppState();

  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    settings.lastDifficulty[game.id] ?? 'easy'
  );
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [session, setSession] = useState(0);
  const [finish, setFinish] = useState<FinishPayload | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const liveStats = useRef<LiveStats>(emptyStats);
  const startedAt = useRef(0);
  const finished = useRef(false);

  const assists = useMemo(
    () => resolveAssists(settings, game.id, game.assistFeatures),
    [settings, game]
  );

  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  const start = () => {
    updateSettings({ lastDifficulty: { ...settings.lastDifficulty, [game.id]: difficulty } });
    liveStats.current = emptyStats;
    finished.current = false;
    startedAt.current = Date.now();
    setElapsedSec(0);
    setPaused(false);
    setFinish(null);
    setShowShare(false);
    setSession((s) => s + 1);
    setPhase('playing');
  };

  const buildResult = useCallback(
    (outcome: GameResult['outcome'], stats: LiveStats): GameResult => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameId: game.id,
      difficulty,
      startedAt: startedAt.current,
      finishedAt: Date.now(),
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      outcome,
      score: stats.score,
      errors: stats.errors,
      hintsUsed: stats.hintsUsed,
      assistsEnabled: Object.entries(assists)
        .filter(([, on]) => on)
        .map(([id]) => id),
      assistsUsed: stats.assistsUsed,
      cleanWin: outcome === 'won' && stats.hintsUsed === 0 && stats.assistsUsed.length === 0,
      extra: stats.extra
    }),
    [game.id, difficulty, assists]
  );

  const events = useMemo(
    () => ({
      onStats: (stats: LiveStats) => {
        liveStats.current = stats;
      },
      onFinish: (payload: FinishPayload) => {
        if (finished.current) return;
        finished.current = true;
        liveStats.current = payload;
        recordResult(buildResult(payload.outcome, payload));
        setFinish(payload);
        setPhase('finished');
        if (payload.outcome === 'won') sfx.win();
        else sfx.lose();
      }
    }),
    [buildResult, recordResult]
  );

  const quit = (recordAbandon: boolean) => {
    if (recordAbandon && phase === 'playing' && !finished.current) {
      recordResult(buildResult('abandoned', liveStats.current));
    }
    onExit();
  };

  const restart = () => {
    if (phase === 'playing' && !finished.current) {
      recordResult(buildResult('abandoned', liveStats.current));
    }
    setConfirmRestart(false);
    start();
  };

  const GameComponent = game.component;
  const assistNames = useMemo(
    () => new Map(game.assistFeatures.map((f) => [f.id, f.name])),
    [game]
  );

  // ----- setup screen -----
  if (phase === 'setup') {
    return (
      <div className="screen game-setup">
        <header className="screen-header">
          <button className="icon-btn" onClick={() => onExit()} aria-label="Back">
            <BackIcon />
          </button>
          <h1>{game.name}</h1>
          <span className="header-spacer" />
        </header>

        <button
          className="howto-btn"
          onClick={() => {
            sfx.tap();
            setShowTutorial(true);
          }}
        >
          <HelpIcon />
          <span className="howto-text">How to play {game.name}</span>
          <span className="howto-go">›</span>
        </button>

        <section className="setup-section">
          <h3 className="section-title">Difficulty</h3>
          <div className="difficulty-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setDifficulty(d);
                }}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        </section>

        {game.assistFeatures.length > 0 && (
          <section className="setup-section">
            <h3 className="section-title">Assists</h3>
            <p className="section-note">
              Assists you use are recorded with each game, so your history shows which wins were
              clean and which had help.
            </p>
            <div className="card-list">
              {game.assistFeatures.map((f) => (
                <Toggle
                  key={f.id}
                  checked={assists[f.id]}
                  onChange={(v) => setGameAssist(game.id, f.id, v)}
                  label={f.name}
                  description={f.description}
                />
              ))}
            </div>
          </section>
        )}

        <p className="scoring-note">{game.scoringNote}</p>

        <button className="primary-btn start-btn" onClick={start}>
          Start game
        </button>

        {showTutorial && <TutorialModal game={game} onClose={() => setShowTutorial(false)} />}
      </div>
    );
  }

  // ----- playing / finished -----
  return (
    <div className="screen game-screen">
      <header className="screen-header game-header">
        <button className="icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Quit game">
          <BackIcon />
        </button>
        <div className="game-header-mid">
          <span className="game-header-title">{game.name}</span>
          <span className="game-header-sub">
            {DIFFICULTY_LABEL[difficulty]} · {formatDuration(elapsedSec)}
          </span>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            sfx.tap();
            if (phase === 'playing') setPaused(true);
            setShowTutorial(true);
          }}
          aria-label="How to play"
        >
          <HelpIcon />
        </button>
        <button
          className="icon-btn"
          onClick={() => setConfirmRestart(true)}
          aria-label="Restart game"
          disabled={phase === 'finished'}
        >
          <RestartIcon />
        </button>
        <button
          className="icon-btn"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume' : 'Pause'}
          disabled={phase === 'finished'}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      </header>

      <div className="game-body">
        <GameComponent
          key={session}
          difficulty={difficulty}
          assists={assists}
          paused={paused || phase === 'finished'}
          elapsedSec={elapsedSec}
          events={events}
          onToggleAssist={(assistId, on) => setGameAssist(game.id, assistId, on)}
        />
        {paused && phase === 'playing' && (
          <div className="pause-overlay">
            <h2>Paused</h2>
            <p>The board is hidden while paused.</p>
            <button className="primary-btn" onClick={() => setPaused(false)}>
              Resume
            </button>
          </div>
        )}
      </div>

      <Modal open={confirmRestart} onClose={() => setConfirmRestart(false)} title="Restart game?">
        <p className="modal-text">
          A fresh puzzle will be dealt. The current game will be saved in your history as
          abandoned.
        </p>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setConfirmRestart(false)}>
            Keep playing
          </button>
          <button className="primary-btn" onClick={restart}>
            Restart
          </button>
        </div>
      </Modal>

      <Modal open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Quit this game?">
        <p className="modal-text">It will be saved in your history as abandoned.</p>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setConfirmQuit(false)}>
            Keep playing
          </button>
          <button className="danger-btn" onClick={() => quit(true)}>
            Quit
          </button>
        </div>
      </Modal>

      <Modal open={phase === 'finished' && finish !== null}>
        {finish && (
          <div className="finish-card">
            <div className={`finish-emoji ${finish.outcome}`}>
              {finish.outcome === 'won' ? '🏆' : '💥'}
            </div>
            <h2>{finish.outcome === 'won' ? 'Puzzle complete!' : 'Game over'}</h2>
            <div className="finish-badges">
              <Chip tone="accent">{DIFFICULTY_LABEL[difficulty]}</Chip>
              {finish.outcome === 'won' &&
                (finish.hintsUsed === 0 && finish.assistsUsed.length === 0 ? (
                  <Chip tone="good">Clean win — no help</Chip>
                ) : (
                  <Chip tone="muted">Won with help</Chip>
                ))}
            </div>
            <div className="finish-grid">
              <div>
                <span className="finish-num">{formatDuration(elapsedSec)}</span>
                <span className="finish-lbl">Time</span>
              </div>
              <div>
                <span className="finish-num">{finish.score.toLocaleString()}</span>
                <span className="finish-lbl">Score</span>
              </div>
              <div>
                <span className="finish-num">{finish.errors}</span>
                <span className="finish-lbl">Errors</span>
              </div>
              <div>
                <span className="finish-num">{finish.hintsUsed}</span>
                <span className="finish-lbl">Hints</span>
              </div>
            </div>
            {finish.assistsUsed.length > 0 && (
              <p className="finish-assists">
                Help used: {finish.assistsUsed.map((a) => assistNames.get(a) ?? a).join(', ')}
              </p>
            )}
            {finish.outcome === 'won' && (
              <button className="share-btn" onClick={() => setShowShare(true)}>
                <ShareIcon />
                <span>Share this win</span>
              </button>
            )}
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => quit(false)}>
                Home
              </button>
              <button className="ghost-btn" onClick={() => setPhase('setup')}>
                Options
              </button>
              <button className="primary-btn" onClick={start}>
                Play again
              </button>
            </div>
          </div>
        )}
      </Modal>

      {showTutorial && <TutorialModal game={game} onClose={() => setShowTutorial(false)} />}

      {showShare && finish && (
        <ShareCardModal
          data={{
            gameName: game.name,
            difficultyLabel: DIFFICULTY_LABEL[difficulty],
            timeStr: formatDuration(elapsedSec),
            score: finish.score,
            errors: finish.errors,
            hintsUsed: finish.hintsUsed,
            cleanWin: finish.hintsUsed === 0 && finish.assistsUsed.length === 0,
            playerName: profile.name,
            playerEmoji: profile.emoji
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
