import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, FinishPayload, GameDefinition, GameResult, GameSave, LiveStats } from '../types';
import { DIFFICULTIES } from '../types';
import { useAppState } from '../AppState';
import { deleteSave, loadSaves, putSave, resolveAssists } from '../storage';
import { formatDate, formatDuration } from '../stats';
import { sfx } from '../audio';
import { BackIcon, Chip, HelpIcon, HomeIcon, Modal, PauseIcon, PlayIcon, RestartIcon, SaveIcon, ShareIcon, StarIcon, Toggle } from './ui';
import { beatenDifficulties } from '../progress/progress';
import { ShareCardModal } from './ShareCard';
import { WinCelebration, WIN_CELEBRATION_MS } from './WinCelebration';
import { LevelUpModal, XpEarned } from './Level';
import { levelFromXp, NO_AWARD, rankForXp, type XpAward } from '../progress/xp';
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

/** Where leaving a running game lands: this game's setup screen, or the home list. */
type LeaveTo = 'setup' | 'home';

const LEAVE_COPY: Record<LeaveTo, { title: string; confirm: string }> = {
  setup: { title: 'Back to game options?', confirm: 'Leave' },
  home: { title: 'Quit this game?', confirm: 'Quit' }
};

/**
 * Standard wrapper around every game: difficulty selection, assist toggles,
 * timing, pause, quit, result recording and the completion screen.
 */
export function GameShell({ game, onExit }: { game: GameDefinition; onExit: () => void }) {
  const { settings, updateSettings, setGameAssist, recordResult, profile, progress } = useAppState();
  // difficulties this game has been WON at — green star + border on the picker
  const beaten = beatenDifficulties(progress, game.id);

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
  /** a pending leave waiting on confirmation — null when nothing is asked */
  const [confirmLeave, setConfirmLeave] = useState<LeaveTo | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMastery, setShowMastery] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  /** the win animation is playing — results wait for it so the player
      actually sees the board they just finished (see WinCelebration) */
  const [celebrating, setCelebrating] = useState(false);
  /** XP this session earned, shown in the results modal */
  const [award, setAward] = useState<XpAward>(NO_AWARD);
  /** a level reached by this result — its card opens before the results */
  const [levelUp, setLevelUp] = useState<number | null>(null);
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

  // hand over to the results modal when the win animation finishes
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCelebrating(false), WIN_CELEBRATION_MS);
    return () => clearTimeout(t);
  }, [celebrating]);

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
    setCelebrating(false);
    setAward(NO_AWARD);
    setLevelUp(null);
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
        const earned = recordResult(buildResult(payload.outcome, payload));
        setAward(earned);
        // the level card opens before the results (see the modal gate below)
        if (earned.leveledUp) setLevelUp(earned.levelAfter);
        // a finished game's save is obsolete — but only touch the stored
        // save if this session owned it (saved or resumed)
        if (sessionHasSave.current) {
          deleteSave(game.id);
          sessionHasSave.current = false;
        }
        setFinish(payload);
        setPhase('finished');
        if (payload.outcome === 'won') {
          // celebrate first, THEN show the statistics
          setCelebrating(true);
          sfx.win();
        } else sfx.lose();
      }
    }),
    [buildResult, recordResult, game.id]
  );

  /**
   * Leave the running game for `to`. Both exits abandon the same way — the
   * only difference is where the player lands, so back-to-options can never
   * become a way to drop a losing game without it reaching history.
   */
  const leave = (to: LeaveTo, recordAbandon: boolean) => {
    if (recordAbandon && phase === 'playing' && !finished.current) {
      recordResult(buildResult('abandoned', liveStats.current));
    }
    setConfirmLeave(null);
    if (to === 'home') onExit();
    else {
      // the setup screen must not inherit a mid-game pause or stale results
      setPaused(false);
      setResultsDismissed(false);
      setCelebrating(false);
      setPhase('setup');
    }
  };

  /** header back/home: ask first only when a real game would be abandoned */
  const requestLeave = (to: LeaveTo) => {
    sfx.tap();
    // finished games and saved sessions exit directly — nothing to abandon
    if (phase === 'finished' || sessionHasSave.current) leave(to, false);
    else setConfirmLeave(to);
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
                className={`difficulty-btn ${difficulty === d ? 'active' : ''} ${beaten.includes(d) ? 'beaten' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setDifficulty(d);
                }}
                aria-label={`${DIFFICULTY_LABEL[d]}${beaten.includes(d) ? ' — completed' : ''}`}
              >
                {beaten.includes(d) && (
                  <span className="beat-seal" aria-hidden>
                    <StarIcon size={10} filled />
                  </span>
                )}
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
              clean and which had help. Only a clean win — no hints, no assists — earns the green
              star for a difficulty, the game's trophy, or a landmark.
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
          {/* back = one step out (this game's options); home = all the way out */}
          <button
            className="icon-btn"
            onClick={() => requestLeave('setup')}
            aria-label="Back to game options"
          >
            <BackIcon />
          </button>
          <button
            className="icon-btn"
            onClick={() => requestLeave('home')}
            aria-label="Back to the game list"
          >
            <HomeIcon />
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

      {/* plays over the finished board — never hides it (see WinCelebration) */}
      {celebrating && finish && (
        <WinCelebration
          label={finish.hideStats ? 'You win!' : 'Complete!'}
          subline={
            !finish.hideStats && finish.hintsUsed === 0 && finish.assistsUsed.length === 0
              ? 'Clean win'
              : undefined
          }
        />
      )}

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

      {confirmLeave && (
        <Modal open onClose={() => setConfirmLeave(null)} title={LEAVE_COPY[confirmLeave].title}>
          <p className="modal-text">It will be saved in your history as abandoned.</p>
          <div className="modal-actions">
            <button className="ghost-btn" onClick={() => setConfirmLeave(null)}>
              Keep playing
            </button>
            <button className="danger-btn" onClick={() => leave(confirmLeave, true)}>
              {LEAVE_COPY[confirmLeave].confirm}
            </button>
          </div>
        </Modal>
      )}

      {/* the level card gets the moment to itself: celebration → level up →
          results, so a new level never competes with a statistics table */}
      {levelUp !== null && !celebrating && (
        <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
      )}

      <Modal
        open={
          phase === 'finished' && finish !== null && !resultsDismissed && !celebrating && levelUp === null
        }
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
            {/* XP is the player's own progression, so it shows even for
                local-multiplayer finishes that hide game statistics */}
            <XpEarned award={award} />
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => leave('home', false)}>
                Home
              </button>
              <button className="ghost-btn" onClick={() => leave('setup', false)}>
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
            playerEmoji: profile.emoji,
            level: levelFromXp(progress.xp),
            rank: rankForXp(progress.xp)
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
