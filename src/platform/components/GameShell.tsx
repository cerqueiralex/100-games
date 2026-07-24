import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, FinishPayload, GameDefinition, GameResult, GameSave, LiveStats } from '../types';
import { DIFFICULTIES } from '../types';
import { useAppState } from '../AppState';
import { deleteSave, loadSaves, putSave, resolveAssists } from '../storage';
import { formatDate, formatDuration } from '../stats';
import { sfx } from '../audio';
import { BackIcon, Chip, HelpIcon, Modal, PauseIcon, PlayIcon, RestartIcon, SaveIcon, ShareIcon, StarIcon, Toggle } from './ui';
import { ShareCardModal } from './ShareCard';
import { TutorialModal } from './Tutorial';
import { MasteryModal } from './Mastery';

type Phase = 'setup' | 'playing' | 'finished';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  extreme: 'Extreme'
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
  /** a game-requested clock hold for pre-game phases (see GameProps.holdClock) */
  const [clockHeld, setClockHeld] = useState(false);
  const [session, setSession] = useState(0);
  const [finish, setFinish] = useState<FinishPayload | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMastery, setShowMastery] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [storedSave, setStoredSave] = useState<GameSave | null>(
    () => loadSaves()[game.id] ?? null
  );
  const [activeSave, setActiveSave] = useState<GameSave | null>(null);

  const liveStats = useRef<LiveStats>(emptyStats);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const snapshotRef = useRef<(() => unknown) | null>(null);
  /** the running session created a save or was resumed from one */
  const sessionHasSave = useRef(false);

  useEffect(() => {
    if (phase === 'setup') setStoredSave(loadSaves()[game.id] ?? null);
  }, [phase, game.id]);

  const assists = useMemo(
    () => resolveAssists(settings, game.id, game.assistFeatures),
    [settings, game]
  );

  useEffect(() => {
    if (phase !== 'playing' || paused || clockHeld) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused, clockHeld]);

  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsedSec;
  }, [elapsedSec]);

  const holdClock = useCallback((hold: boolean) => {
    // re-anchor so held time never counts toward the recorded duration
    startedAt.current = Date.now() - elapsedRef.current * 1000;
    setClockHeld(hold);
  }, []);

  const start = (resume?: GameSave | null) => {
    const diff = resume?.difficulty ?? difficulty;
    if (resume) setDifficulty(diff);
    updateSettings({ lastDifficulty: { ...settings.lastDifficulty, [game.id]: diff } });
    liveStats.current = emptyStats;
    finished.current = false;
    sessionHasSave.current = !!resume;
    setActiveSave(resume ?? null);
    const elapsed = resume?.elapsedSec ?? 0;
    startedAt.current = Date.now() - elapsed * 1000;
    setElapsedSec(elapsed);
    setClockHeld(false);
    setPaused(false);
    setFinish(null);
    setShowShare(false);
    setResultsDismissed(false);
    setShowSaveModal(false);
    setSession((s) => s + 1);
    setPhase('playing');
  };

  const saveGame = () => {
    const state = snapshotRef.current?.();
    if (state === undefined || state === null) return;
    putSave({
      gameId: game.id,
      difficulty,
      elapsedSec,
      savedAt: Date.now(),
      state
    });
    sessionHasSave.current = true;
    sfx.place();
    setShowSaveModal(true);
  };

  const buildResult = useCallback(
    (outcome: GameResult['outcome'], stats: LiveStats): GameResult => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gameId: game.id,
      difficulty,
      startedAt: startedAt.current,
      finishedAt: Date.now(),
      // played time — the ticking clock excludes pauses and held pre-game
      // menus, which wall-clock (now - startedAt) would wrongly include
      durationSec: elapsedRef.current,
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
        // a finished game's save is obsolete — but only touch the stored
        // save if this session owned it (saved or resumed)
        if (sessionHasSave.current) {
          deleteSave(game.id);
          sessionHasSave.current = false;
        }
        setFinish(payload);
        setPhase('finished');
        if (payload.outcome === 'won') sfx.win();
        else sfx.lose();
      }
    }),
    [buildResult, recordResult, game.id]
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

        <button
          className="howto-btn mastery-btn"
          onClick={() => {
            sfx.tap();
            setShowMastery(true);
          }}
        >
          <StarIcon />
          <span className="howto-text">How to master {game.name}</span>
          <span className="howto-go">›</span>
        </button>

        {storedSave && (
          <div className="resume-card fx-card">
            <div className="resume-info">
              <span className="resume-title">
                <SaveIcon size={15} /> Saved game
              </span>
              <span className="resume-sub">
                {DIFFICULTY_LABEL[storedSave.difficulty]} · {formatDuration(storedSave.elapsedSec)}{' '}
                played · saved {formatDate(storedSave.savedAt)}
              </span>
            </div>
            <div className="resume-actions">
              <button
                className="ghost-btn small"
                onClick={() => {
                  sfx.tap();
                  deleteSave(game.id);
                  setStoredSave(null);
                }}
              >
                Discard
              </button>
              <button className="primary-btn resume-btn" onClick={() => start(storedSave)}>
                Continue
              </button>
            </div>
          </div>
        )}

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

        <button className="primary-btn start-btn" onClick={() => start()}>
          Start game
        </button>

        {showTutorial && <TutorialModal game={game} onClose={() => setShowTutorial(false)} />}
        {showMastery && <MasteryModal game={game} onClose={() => setShowMastery(false)} />}
      </div>
    );
  }

  // ----- playing / finished -----
  return (
    <div className="screen game-screen">
      <header className="screen-header game-header fx-card">
        <div className="game-header-top">
          <div className="game-header-mid">
            <span className="game-header-title">{game.name}</span>
            <span className="game-header-sub">
              {DIFFICULTY_LABEL[difficulty]} · {formatDuration(elapsedSec)}
            </span>
          </div>
        </div>
        <div className="game-header-actions">
          <button
            className="icon-btn"
            onClick={() => {
              sfx.tap();
              // finished games and saved sessions exit directly — nothing to abandon
              if (phase === 'finished' || sessionHasSave.current) quit(false);
              else setConfirmQuit(true);
            }}
            aria-label={phase === 'finished' ? 'Back to menu' : 'Quit game'}
          >
            <BackIcon />
          </button>
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
          {phase === 'playing' && (
            // pre-game menus (held clock) have no snapshot to save
            <button className="icon-btn" onClick={saveGame} aria-label="Save game" disabled={clockHeld}>
              <SaveIcon />
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              sfx.tap();
              setConfirmRestart(true);
            }}
            aria-label="Restart game"
            disabled={phase === 'finished'}
          >
            <RestartIcon />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              sfx.tap();
              setPaused((p) => !p);
            }}
            aria-label={paused ? 'Resume' : 'Pause'}
            disabled={phase === 'finished'}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
        </div>
      </header>

      <div className="game-body">
        {/* keep the finished board visible for review — games block input via
            their own done guards, so paused only reflects the real pause */}
        <GameComponent
          key={session}
          difficulty={difficulty}
          assists={assists}
          paused={paused}
          elapsedSec={elapsedSec}
          events={events}
          onToggleAssist={(assistId, on) => setGameAssist(game.id, assistId, on)}
          savedState={activeSave?.state}
          registerSnapshot={(fn) => {
            snapshotRef.current = fn;
          }}
          holdClock={holdClock}
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

      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title="Game saved">
        <p className="modal-text">
          Pick it up any time from this game's start screen — even after closing the app.
        </p>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setShowSaveModal(false)}>
            Keep playing
          </button>
          <button className="primary-btn" onClick={() => onExit()}>
            Exit to menu
          </button>
        </div>
      </Modal>

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

      <Modal
        open={phase === 'finished' && finish !== null && !resultsDismissed}
        onClose={() => setResultsDismissed(true)}
      >
        {finish && (
          <div className="finish-card">
            <button
              className="finish-close"
              onClick={() => setResultsDismissed(true)}
              aria-label="Close results and view the board"
            >
              ×
            </button>
            <div className={`finish-emoji ${finish.outcome}`}>
              {finish.outcome === 'won' ? '🏆' : '💥'}
            </div>
            <h2>
              {finish.hideStats && finish.headline
                ? finish.headline
                : finish.outcome === 'won'
                  ? 'Puzzle complete!'
                  : 'Game over'}
            </h2>
            {/* local-multiplayer finish: just who won, no statistics */}
            {finish.hideStats ? (
              finish.subline && <p className="finish-subline">{finish.subline}</p>
            ) : (
              <>
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
              </>
            )}
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => quit(false)}>
                Home
              </button>
              <button className="ghost-btn" onClick={() => setPhase('setup')}>
                Options
              </button>
              <button className="primary-btn" onClick={() => start()}>
                Play again
              </button>
            </div>
          </div>
        )}
      </Modal>

      {phase === 'finished' && resultsDismissed && (
        <button className="results-pill fx-card" onClick={() => setResultsDismissed(false)}>
          Show results
        </button>
      )}

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
