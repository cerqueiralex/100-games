import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  COLS,
  ROWS,
  checkWinner,
  drop,
  emptyBoard,
  idx,
  immediateWins,
  isFull,
  other,
  type Cell,
  type Disc
} from './logic/board';
import { chooseMove, suggestMove } from './logic/ai';

type Mode = 'bot' | 'local';

const ROUND_OPTIONS = [1, 3, 5, 10];
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const HINT_PENALTY = 30;
const MATCH_BONUS = 150;

const DISC_NAME: Record<Disc, string> = { r: 'Red', y: 'Yellow' };
/** red opens odd rounds, the opener alternates every round (classic rule) */
const roundStarter = (round: number): Disc => (round % 2 === 1 ? 'r' : 'y');

interface C4Config {
  mode: Mode;
  /** the device owner's disc colour (player 1 in local mode) */
  myDisc: Disc;
  rounds: number;
}

/** running totals threaded through settle/robot callbacks so a scheduled
    move never reads stale state */
interface Totals {
  winsR: number;
  winsY: number;
  draws: number;
  round: number;
  hintsUsed: number;
}

interface UndoFrame {
  board: Cell[];
  turn: Disc;
  lastDrop: number | null;
}

interface C4Save extends C4Config {
  board: Cell[];
  turn: Disc;
  winsR: number;
  winsY: number;
  draws: number;
  round: number;
  hintsUsed: number;
  assistsUsed: string[];
}

interface WinInfo {
  disc: Disc;
  cells: number[];
}

export function ConnectFourGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  // older / mismatched saves lack `mode` — treat them as no save
  const saved = savedState && (savedState as C4Save).mode ? (savedState as C4Save) : undefined;

  const [config, setConfig] = useState<C4Config | null>(
    saved ? { mode: saved.mode, myDisc: saved.myDisc, rounds: saved.rounds } : null
  );
  // pre-game menu picks
  const [pickMode, setPickMode] = useState<Mode>('bot');
  const [pickDisc, setPickDisc] = useState<Disc>('r');
  const [pickRounds, setPickRounds] = useState(3);

  const [board, setBoard] = useState<Cell[]>(() => (saved ? saved.board.slice() : emptyBoard()));
  const [turn, setTurn] = useState<Disc>(saved?.turn ?? 'r');
  const [round, setRound] = useState(saved?.round ?? 1);
  const [winsR, setWinsR] = useState(saved?.winsR ?? 0);
  const [winsY, setWinsY] = useState(saved?.winsY ?? 0);
  const [draws, setDraws] = useState(saved?.draws ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [banner, setBanner] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [suggestCol, setSuggestCol] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastDrop, setLastDrop] = useState<number | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);

  const done = useRef(false);
  const roundOver = useRef(false);
  const timers = useRef<number[]>([]);
  const undoStack = useRef<UndoFrame[]>([]);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // the clock only runs once the match is configured — not on the menu
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  // threat-warn is a passive assist: counts as help whenever enabled in play
  useEffect(() => {
    if (config && assists.threatWarn) assistsUsed.current.add('threatWarn');
  }, [config, assists.threatWarn]);

  const myWinsOf = (t: Totals) => (config?.myDisc === 'y' ? t.winsY : t.winsR);
  const oppWinsOf = (t: Totals) => (config?.myDisc === 'y' ? t.winsR : t.winsY);
  const scoreOf = (t: Totals) => Math.max(0, myWinsOf(t) * 100 * MULT[difficulty] - t.hintsUsed * HINT_PENALTY);
  const totalsNow = (): Totals => ({ winsR, winsY, draws, round, hintsUsed });

  useEffect(() => {
    if (!config) return;
    const t = totalsNow();
    events.onStats({
      score: scoreOf(t),
      errors: oppWinsOf(t),
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        you: myWinsOf(t),
        opponent: oppWinsOf(t),
        draws,
        rounds: config.rounds,
        mode: config.mode
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winsR, winsY, draws, hintsUsed, round, config, events]);

  const finishMatch = (winnerDisc: Disc, t: Totals) => {
    if (done.current || !config) return;
    done.current = true;
    const youWon = winnerDisc === config.myDisc;
    const base = scoreOf(t);
    const bonus = youWon ? MATCH_BONUS * MULT[difficulty] : 0;
    const payload = {
      outcome: (youWon ? 'won' : 'lost') as 'won' | 'lost',
      score: base + bonus,
      errors: oppWinsOf(t),
      hintsUsed: t.hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        you: myWinsOf(t),
        opponent: oppWinsOf(t),
        draws: t.draws,
        rounds: config.rounds,
        mode: config.mode
      }
    };
    if (config.mode === 'local') {
      const hi = Math.max(t.winsR, t.winsY);
      const lo = Math.min(t.winsR, t.winsY);
      events.onFinish({
        ...payload,
        hideStats: true,
        headline: youWon ? 'You win the match!' : 'Your friend wins the match!',
        subline:
          `${DISC_NAME[winnerDisc]} takes it ${hi}–${lo}` +
          (t.draws > 0 ? ` · ${t.draws} draw${t.draws > 1 ? 's' : ''}` : '')
      });
    } else {
      events.onFinish(payload);
    }
  };

  // on extreme the robot seizes the opening of EVERY round — a second layer
  // of difficulty on top of its near-perfect play
  const starterFor = (r: number): Disc =>
    config?.mode === 'bot' && difficulty === 'extreme' ? other(config.myDisc) : roundStarter(r);

  const nextRound = (r: number) => {
    schedule(() => {
      roundOver.current = false;
      undoStack.current = [];
      setBoard(emptyBoard());
      setWinInfo(null);
      setSuggestCol(null);
      setLastDrop(null);
      setRound(r);
      setTurn(starterFor(r));
      setBanner(null);
    }, 1500);
  };

  /** returns true when the board ended the round (win or draw) */
  const settleRound = (b: Cell[], t: Totals): boolean => {
    if (!config) return false;
    const w = checkWinner(b);
    const draw = !w && isFull(b);
    if (!w && !draw) return false;
    roundOver.current = true;
    if (w) setWinInfo(w);

    const nt: Totals = {
      ...t,
      winsR: t.winsR + (w?.disc === 'r' ? 1 : 0),
      winsY: t.winsY + (w?.disc === 'y' ? 1 : 0),
      draws: t.draws + (w ? 0 : 1)
    };
    setWinsR(nt.winsR);
    setWinsY(nt.winsY);
    setDraws(nt.draws);

    // all rounds played and someone is ahead → the match is decided;
    // a tie after the last round goes to sudden death (next win takes it)
    if (t.round >= config.rounds && nt.winsR !== nt.winsY) {
      const winnerDisc: Disc = nt.winsR > nt.winsY ? 'r' : 'y';
      const youWon = winnerDisc === config.myDisc;
      if (config.mode === 'local') {
        setBanner(`${DISC_NAME[winnerDisc]} wins the match!`);
      } else {
        setBanner(youWon ? 'You win the match!' : 'The robot takes the match.');
      }
      finishMatch(winnerDisc, nt);
      return true;
    }

    if (w) {
      // the winning disc already thunked on its drop — use a distinct
      // celebratory pop for a round win, and the error cue for a robot round
      if (config.mode === 'local') {
        setBanner(`${DISC_NAME[w.disc]} takes the round!`);
        sfx.pop();
      } else if (w.disc === config.myDisc) {
        setBanner('Round yours!');
        sfx.pop();
      } else {
        setBanner('Robot round.');
        sfx.error();
      }
    } else {
      setBanner('Draw — board full.');
      sfx.tap();
    }
    if (t.round + 1 > config.rounds) {
      // entering (or continuing) sudden death
      schedule(() => setBanner(null), 1400);
    }
    nextRound(t.round + 1);
    return true;
  };

  const placeDisc = (b: Cell[], col: number, disc: Disc, t: Totals, fromRobot: boolean) => {
    if (!config) return;
    const res = drop(b, col, disc);
    if (!res) return;
    const cell = idx(res.row, col);
    if (config.mode === 'local') undoStack.current.push({ board: b.slice(), turn: disc, lastDrop });
    setBoard(res.board);
    setLastDrop(cell);
    setSuggestCol(null);
    sfx.place();
    if (settleRound(res.board, t)) return;
    if (config.mode === 'bot') {
      if (fromRobot) {
        setTurn(config.myDisc);
      } else {
        setTurn(other(config.myDisc));
        scheduleRobot(config, res.board, t);
      }
    } else {
      setTurn(other(disc));
    }
  };

  const scheduleRobot = (cfg: C4Config, b: Cell[], t: Totals) => {
    setThinking(true);
    schedule(() => {
      if (done.current || roundOver.current) {
        setThinking(false);
        return;
      }
      const botDisc = other(cfg.myDisc);
      // heavy compute runs here, inside the timeout, after the thinking
      // shimmer + the human's drop have already painted
      const col = chooseMove(b, botDisc, difficulty);
      setThinking(false);
      if (col < 0) return;
      placeDisc(b, col, botDisc, t, true);
    }, 620);
  };

  // pause/resume + resumed-save timer management: pausing cancels every
  // pending timer (robot think, round transition); this effect re-arms the
  // one that was in flight. Empty-board robot openers stay the opener
  // effect's job — handling them here too would double-schedule the robot.
  useEffect(() => {
    if (!config || done.current) return;
    if (paused) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setThinking(false);
      return;
    }
    if (roundOver.current) {
      nextRound(round + 1);
    } else if (
      config.mode === 'bot' &&
      turn !== config.myDisc &&
      !board.every((v) => v === null) &&
      !checkWinner(board) &&
      !isFull(board)
    ) {
      scheduleRobot(config, board, totalsNow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, config]);

  // robot opens whenever a fresh round starts on its disc
  useEffect(() => {
    if (!config || config.mode !== 'bot' || done.current || roundOver.current || paused) return;
    if (turn === other(config.myDisc) && board.every((v) => v === null)) {
      scheduleRobot(config, board, totalsNow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, turn, board]);

  const dropInColumn = (col: number) => {
    if (!config || paused || done.current || roundOver.current || thinking) return;
    if (config.mode === 'bot' && turn !== config.myDisc) return;
    if (board[col] !== null) return; // column full
    placeDisc(board, col, turn, totalsNow(), false);
  };

  const useSuggest = () => {
    if (!config || paused || done.current || roundOver.current || thinking) return;
    if (config.mode !== 'bot' || turn !== config.myDisc || !assists.suggest) return;
    assistsUsed.current.add('suggest');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    const col = suggestMove(board, config.myDisc);
    if (col >= 0) setSuggestCol(col);
  };

  const useUndo = () => {
    if (!config || paused || done.current || roundOver.current) return;
    if (config.mode !== 'local' || !assists.undo) return;
    const prev = undoStack.current.pop();
    if (!prev) return;
    assistsUsed.current.add('undo');
    sfx.tap();
    setBoard(prev.board.slice());
    setTurn(prev.turn);
    setLastDrop(prev.lastDrop);
    setSuggestCol(null);
  };

  useEffect(() => {
    registerSnapshot(() => {
      if (!config) return null;
      // mid-banner the round is already tallied but the board hasn't reset;
      // snapshot the upcoming round so a resume can't re-count the finished
      // board or soft-lock on it
      const settled = roundOver.current && !done.current;
      return {
        ...config,
        board: settled ? emptyBoard() : board,
        turn: settled ? starterFor(round + 1) : turn,
        winsR,
        winsY,
        draws,
        round: settled ? round + 1 : round,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      } satisfies C4Save;
    });
  });

  /* ---------- pre-game menu ---------- */

  if (!config) {
    return (
      <div className="c4">
        <div className="c4-setup fx-card">
          <h3 className="c4-setup-title">Opponent</h3>
          <div className="c4-opt-row cols-2">
            <button
              className={`c4-opt ${pickMode === 'bot' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('bot');
              }}
            >
              Robot
            </button>
            <button
              className={`c4-opt ${pickMode === 'local' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('local');
              }}
            >
              2 players · one phone
            </button>
          </div>

          <h3 className="c4-setup-title">Your discs</h3>
          <div className="c4-opt-row cols-2">
            <button
              className={`c4-opt disc-r ${pickDisc === 'r' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickDisc('r');
              }}
            >
              <span className="c4-swatch red" /> Red
            </button>
            <button
              className={`c4-opt disc-y ${pickDisc === 'y' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickDisc('y');
              }}
            >
              <span className="c4-swatch yellow" /> Yellow
            </button>
          </div>
          <p className="c4-setup-note">
            Red always drops first; the opening disc alternates every round.
          </p>

          <h3 className="c4-setup-title">Rounds</h3>
          <div className="c4-opt-row cols-4">
            {ROUND_OPTIONS.map((r) => (
              <button
                key={r}
                className={`c4-opt ${pickRounds === r ? 'active' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setPickRounds(r);
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="c4-setup-note">
            Most round wins takes the match — a tie goes to sudden death. On extreme the robot
            opens every round.
          </p>

          <button
            className="primary-btn"
            onClick={() => {
              sfx.place();
              setConfig({ mode: pickMode, myDisc: pickDisc, rounds: pickRounds });
              setTurn(pickMode === 'bot' && difficulty === 'extreme' ? other(pickDisc) : 'r');
            }}
          >
            Start match
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */

  const suddenDeath = round > config.rounds;
  const oppLabel = config.mode === 'bot' ? 'Robot' : 'Friend';
  const myDisc = config.myDisc;
  const oppDisc = other(myDisc);
  const myWins = myDisc === 'r' ? winsR : winsY;
  const oppWins = myDisc === 'r' ? winsY : winsR;

  const myTurnNow = config.mode === 'local' ? true : turn === myDisc;
  const canPlay = !done.current && !roundOver.current && !thinking && myTurnNow;

  // threat-warn: columns where the opponent has a one-drop win right now, so
  // the current player can block. Only surfaced while it's a human's move.
  const threatCols =
    assists.threatWarn && canPlay ? immediateWins(board, config.mode === 'local' ? other(turn) : oppDisc) : [];

  const status =
    banner ??
    (config.mode === 'bot'
      ? turn === myDisc
        ? 'Your turn — drop a disc'
        : 'Robot is thinking…'
      : `${DISC_NAME[turn]} to drop`);

  const colFull = (c: number) => board[c] !== null;

  return (
    <div className={`c4 ${paused ? 'board-hidden' : ''}`}>
      <div className="c4-score">
        <span className={`c4-side ${myDisc === 'r' ? 'red' : 'yellow'}`}>
          <span className="c4-dot" />
          <span className="c4-side-name">You</span>
          <b>{myWins}</b>
        </span>
        <span className="c4-vs">{suddenDeath ? 'Sudden death' : `Round ${round} / ${config.rounds}`}</span>
        <span className={`c4-side right ${oppDisc === 'r' ? 'red' : 'yellow'}`}>
          <b>{oppWins}</b>
          <span className="c4-side-name">{oppLabel}</span>
          <span className="c4-dot" />
        </span>
      </div>

      <p className={`c4-status ${thinking ? 'thinking' : ''}`}>{status}</p>

      <div className="c4-arrows">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            className={[
              'c4-arrow',
              hoverCol === c ? 'hover' : '',
              suggestCol === c ? 'suggest' : '',
              threatCols.includes(c) ? 'threat' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={!canPlay || colFull(c)}
            aria-label={`Drop in column ${c + 1}`}
            onPointerEnter={() => setHoverCol(c)}
            onPointerLeave={() => setHoverCol((h) => (h === c ? null : h))}
            onClick={() => dropInColumn(c)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v13M6 12l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>

      <div className="c4-board">
        <div className="c4-grid">
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const disc = board[i];
            const isWin = winInfo?.cells.includes(i) ?? false;
            const cls = [
              'c4-cell',
              hoverCol === c && canPlay ? 'colhi' : '',
              suggestCol === c ? 'suggest' : '',
              threatCols.includes(c) ? 'threat' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={i}
                className={cls}
                disabled={!canPlay || colFull(c)}
                aria-label={`Column ${c + 1}, row ${r + 1}`}
                onPointerEnter={() => setHoverCol(c)}
                onPointerLeave={() => setHoverCol((h) => (h === c ? null : h))}
                onClick={() => dropInColumn(c)}
              >
                <span className="c4-slot">
                  {disc && (
                    <span
                      className={[
                        'c4-disc',
                        disc === 'r' ? 'red' : 'yellow',
                        lastDrop === i ? 'drop' : '',
                        isWin ? 'win' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={lastDrop === i ? ({ ['--fall-rows']: r + 1 } as CSSProperties) : undefined}
                    />
                  )}
                </span>
              </button>
            );
          })}

          {winInfo && (
            <svg className="c4-winline" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" aria-hidden>
              <line
                x1={(winInfo.cells[0] % COLS) + 0.5}
                y1={Math.floor(winInfo.cells[0] / COLS) + 0.5}
                x2={(winInfo.cells[winInfo.cells.length - 1] % COLS) + 0.5}
                y2={Math.floor(winInfo.cells[winInfo.cells.length - 1] / COLS) + 0.5}
              />
            </svg>
          )}
        </div>
      </div>

      {((config.mode === 'bot' && assists.suggest) || (config.mode === 'local' && assists.undo)) && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            {config.mode === 'bot' && assists.suggest && (
              <PadTool silent onClick={useSuggest} disabled={!canPlay}>
                <BulbIcon />
                <span>Suggest</span>
              </PadTool>
            )}
            {config.mode === 'local' && assists.undo && (
              <PadTool onClick={useUndo} disabled={roundOver.current || undoStack.current.length === 0}>
                <RestartIcon />
                <span>Undo</span>
              </PadTool>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
