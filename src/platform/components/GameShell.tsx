import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, FinishPayload, GameDefinition, GameResult, GameSave, LiveStats } from '../types';
import { DIFFICULTIES } from '../types';
import { useAppState } from '../AppState';
import { deleteSave, loadSaves, putSave, resolveAssists, resolveOptions } from '../storage';
import { formatDate, formatDuration } from '../stats';
import { sfx } from '../audio';
import { BackIcon, Chip, HelpIcon, HomeIcon, Modal, PauseIcon, PlayIcon, RestartIcon, SaveIcon, ShareIcon, StarIcon, Toggle } from './ui';
import { beatenDifficulties, FEATS } from '../progress/progress';
import { ShareCardModal } from './ShareCard';
import { WinCelebration, WIN_CELEBRATION_MS } from './WinCelebration';
import { LevelUpModal, XpEarned } from './Level';
import { levelFromXp, NO_AWARD, rankForXp, type XpAward } from '../progress/xp';
import { TutorialModal } from './Tutorial';
import { MasteryModal } from './Mastery';
import {
  completeDaily,
  dailyStreakInfo,
  loadDaily,
  markDailyStarted,
  type DailyChallengeRecord
} from '../daily/store';
import type { DailyProgressInfo } from '../progress/progress';

type Phase = 'setup' | 'playing' | 'finished';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
  extreme: 'Extreme'
};

const emptyStats: LiveStats = { score: 0, errors: 0, hintsUsed: 0, assistsUsed: [] };

/** "Aug 24" from a 'YYYY-MM-DD' key — parsed as LOCAL parts, because
    new Date('2026-08-24') is UTC midnight and prints the day before in
    every timezone west of Greenwich. */
export function formatDailyDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Option choices from a save, keeping only the ones this build still offers.
 * A save written before a theme was renamed (or after one was removed) must
 * not put the game on a choice it can no longer draw.
 */
function pickKnownOptions(
  game: GameDefinition,
  saved: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of game.options ?? []) {
    const pick = saved[def.id];
    if (def.choices.some((c) => c.id === pick)) out[def.id] = pick;
  }
  return out;
}

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
export function GameShell({
  game,
  onExit,
  daily
}: {
  game: GameDefinition;
  onExit: () => void;
  /** present when this session is today's Daily Challenge: the board comes
      from the stored seed and the difficulty is locked to the assignment */
  daily?: DailyChallengeRecord;
}) {
  const { settings, updateSettings, setGameAssist, setGameOption, recordResult, markFeat, profile, progress } =
    useAppState();
  // difficulties this game has been WON at — green star + border on the picker
  const beaten = beatenDifficulties(progress, game.id);

  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    daily?.difficulty ?? settings.lastDifficulty[game.id] ?? 'easy'
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
  /** what the Save button did: wrote a save, or had nothing to write yet
      (games with a pre-game menu — Maze's size picker, Battleship's fleet
      placement — have no board to snapshot until real play starts) */
  const [saveOutcome, setSaveOutcome] = useState<'saved' | 'nothing' | null>(null);
  /** the stored save, but only when it belongs to this mode (see GameSave.daily) */
  const saveForThisMode = useCallback(() => {
    const save = loadSaves()[game.id];
    if (!save) return null;
    return (save.daily ?? null) === (daily?.date ?? null) ? save : null;
  }, [game.id, daily?.date]);
  const [storedSave, setStoredSave] = useState<GameSave | null>(saveForThisMode);
  const [activeSave, setActiveSave] = useState<GameSave | null>(null);

  const liveStats = useRef<LiveStats>(emptyStats);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const snapshotRef = useRef<(() => unknown) | null>(null);
  /** the running session created a save or was resumed from one */
  const sessionHasSave = useRef(false);

  useEffect(() => {
    if (phase === 'setup') setStoredSave(saveForThisMode());
  }, [phase, saveForThisMode]);

  const assists = useMemo(
    () => resolveAssists(settings, game.id, game.assistFeatures),
    [settings, game]
  );

  /* The option choices this SESSION runs under. They are frozen at start()
     rather than read live from settings: an option decides how the board is
     built, so a player flipping the theme on another screen must not change
     the deck they are halfway through. */
  const [sessionOptions, setSessionOptions] = useState<Record<string, string>>(() =>
    resolveOptions(settings, game.id, game.options)
  );
  const setupOptions = useMemo(
    () => resolveOptions(settings, game.id, game.options),
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
    const diff = daily?.difficulty ?? resume?.difficulty ?? difficulty;
    if (resume || daily) setDifficulty(diff);
    // a daily run is locked to its own tier, so it must not overwrite the
    // difficulty the player chose for their normal games
    if (!daily) {
      updateSettings({ lastDifficulty: { ...settings.lastDifficulty, [game.id]: diff } });
    }
    if (daily) markDailyStarted(daily.date);
    /* A resumed game keeps the options it was SAVED under — the deck in the
       snapshot was built from them, and drawing a Pokémon deck with zodiac
       art would be a board the screen cannot render. Anything the save does
       not name falls back to the current pick. */
    setSessionOptions(
      resume?.options ? { ...setupOptions, ...pickKnownOptions(game, resume.options) } : setupOptions
    );
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
    setSaveOutcome(null);
    setSession((s) => s + 1);
    setPhase('playing');
  };

  const saveGame = () => {
    const state = snapshotRef.current?.();
    /* Backstop, not the primary guard: the Save button is disabled while a
       game holds the clock, which is exactly when a pre-game menu (Maze's
       size picker, Battleship's fleet placement) has no board to snapshot.
       A game that returns null WITHOUT holding the clock would otherwise
       give the player a button that silently does nothing — which reads as
       "saved", and they leave and lose the run. Say so instead. */
    if (state === undefined || state === null) {
      setSaveOutcome('nothing');
      return;
    }
    putSave({
      gameId: game.id,
      difficulty,
      elapsedSec,
      savedAt: Date.now(),
      state,
      ...(daily ? { daily: daily.date } : {}),
      ...(Object.keys(sessionOptions).length > 0 ? { options: sessionOptions } : {})
    });
    sessionHasSave.current = true;
    sfx.place();
    setSaveOutcome('saved');
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
      // the options this run was played under, for the feats that turn on
      // them (an easter egg keyed to a deck). Omitted when the game has
      // none, exactly like the save's copy.
      ...(Object.keys(sessionOptions).length > 0 ? { options: sessionOptions } : {}),
      extra: stats.extra
    }),
    [game.id, difficulty, assists, sessionOptions]
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

        /* A daily is "completed" by WINNING it — a loss leaves the day open
           to try again, because the challenge is the puzzle, not the first
           attempt at it. Folded in BEFORE recordResult so the XP award can
           see the streak this very run extended. */
        let dailyInfo: DailyProgressInfo | undefined;
        if (daily && payload.outcome === 'won') {
          const clean = payload.hintsUsed === 0 && payload.assistsUsed.length === 0;
          const outcome = completeDaily(daily.date, {
            timeSec: elapsedRef.current,
            hintsUsed: payload.hintsUsed,
            assistsUsed: payload.assistsUsed,
            cleanWin: clean
          });
          dailyInfo = {
            gameId: daily.gameId,
            firstCompletion: outcome.firstCompletion,
            advanced: outcome.advanced,
            cleanWin: clean,
            best: outcome.store.streak.best
          };
        }

        const earned = recordResult(buildResult(payload.outcome, payload), dailyInfo);
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
    [buildResult, recordResult, game.id, daily]
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

        {daily ? (
          <section className="setup-section">
            <h3 className="section-title">Today&rsquo;s challenge</h3>
            <p className="section-note">
              The same board for everyone, everywhere, today only. The difficulty is fixed so
              every result is comparable.
            </p>
            <div className="daily-lock fx-card">
              <span className="daily-lock-date">{formatDailyDate(daily.date)}</span>
              <Chip tone="accent">{DIFFICULTY_LABEL[daily.difficulty]}</Chip>
            </div>
          </section>
        ) : (
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
        )}

        {/* Pick-one settings the game contributes (Memory Match's card
            theme). Above Assists because an option changes WHAT you play,
            while an assist changes how much help you get — and unlike an
            assist it costs nothing, so it must never sit under a heading
            that implies it does. */}
        {(game.options ?? []).map((def) => (
          <section className="setup-section" key={def.id}>
            <h3 className="section-title">{def.name}</h3>
            {def.description && <p className="section-note">{def.description}</p>}
            <div className="option-row">
              {def.choices.map((c) => (
                <button
                  key={c.id}
                  className={`option-btn ${setupOptions[def.id] === c.id ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setGameOption(game.id, def.id, c.id);
                  }}
                  aria-pressed={setupOptions[def.id] === c.id}
                >
                  {c.icon && <span className="option-btn-icon">{c.icon}</span>}
                  <span className="option-btn-label">{c.label}</span>
                  {c.description && <span className="option-btn-sub">{c.description}</span>}
                </button>
              ))}
            </div>
          </section>
        ))}

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
          {daily ? "Play today's challenge" : 'Start game'}
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
              {daily ? `Daily · ${formatDailyDate(daily.date)}` : DIFFICULTY_LABEL[difficulty]} ·{' '}
              {formatDuration(elapsedSec)}
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
          dailySeed={daily?.seed}
          options={sessionOptions}
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

      <Modal
        open={saveOutcome !== null}
        onClose={() => setSaveOutcome(null)}
        title={saveOutcome === 'nothing' ? 'Nothing to save yet' : 'Game saved'}
      >
        <p className="modal-text">
          {saveOutcome === 'nothing'
            ? 'This game has no board to store until you start playing. Make your first move, then save.'
            : "Pick it up any time from this game's start screen — even after closing the app."}
        </p>
        <div className="modal-actions">
          <button className="ghost-btn" onClick={() => setSaveOutcome(null)}>
            Keep playing
          </button>
          {saveOutcome === 'saved' && (
            <button className="primary-btn" onClick={() => onExit()}>
              Exit to menu
            </button>
          )}
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
            rank: rankForXp(progress.xp),
            ...(daily
              ? {
                  daily: {
                    dateLabel: formatDailyDate(daily.date),
                    streak: dailyStreakInfo(loadDaily(), daily.date).current
                  }
                }
              : {})
          }}
          onClose={() => setShowShare(false)}
          onRendered={() => markFeat(FEATS.sharedWin)}
        />
      )}
    </div>
  );
}
