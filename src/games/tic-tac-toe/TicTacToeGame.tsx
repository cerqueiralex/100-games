import { useEffect, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, TttCrossIcon, TttRingIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';

type Mode = 'bot' | 'local';
type Mark = 'X' | 'O';
type Cell = Mark | null;

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const ROUND_OPTIONS = [1, 3, 5, 10];
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
/** chance the robot plays a perfect (minimax) move instead of a simple one */
const AI_STRENGTH: Record<Difficulty, number> = { easy: 0.25, medium: 0.7, hard: 0.92 };

const MARK_NAME: Record<Mark, string> = { X: 'Cross', O: 'Circle' };
const other = (m: Mark): Mark => (m === 'X' ? 'O' : 'X');
/** classic rule: X opens the match, then the opener alternates every round */
const roundStarter = (round: number): Mark => (round % 2 === 1 ? 'X' : 'O');

function winner(b: Cell[]): Mark | null {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

const full = (b: Cell[]) => b.every(Boolean);
const empties = (b: Cell[]) => b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

function minimax(b: Cell[], me: Mark, turn: Mark): { score: number; move: number } {
  const w = winner(b);
  if (w) return { score: w === me ? 1 : -1, move: -1 };
  if (full(b)) return { score: 0, move: -1 };
  let best = { score: turn === me ? -2 : 2, move: -1 };
  for (const i of empties(b)) {
    b[i] = turn;
    const r = minimax(b, me, other(turn));
    b[i] = null;
    if (turn === me ? r.score > best.score : r.score < best.score) {
      best = { score: r.score, move: i };
    }
  }
  return best;
}

/** win if possible, block if needed, otherwise center/corner/random */
function heuristicMove(b: Cell[], me: Mark): number {
  const opp = other(me);
  for (const player of [me, opp]) {
    for (const i of empties(b)) {
      b[i] = player;
      const w = winner(b);
      b[i] = null;
      if (w === player) return i;
    }
  }
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  const e = empties(b);
  return e[Math.floor(Math.random() * e.length)];
}

function robotMove(b: Cell[], difficulty: Difficulty, me: Mark): number {
  if (Math.random() < AI_STRENGTH[difficulty]) {
    const m = minimax([...b], me, me).move;
    if (m >= 0) return m;
  }
  if (difficulty !== 'easy' || Math.random() < 0.5) return heuristicMove([...b], me);
  const e = empties(b);
  return e[Math.floor(Math.random() * e.length)];
}

/** match settings picked on the pre-game menu */
interface TttConfig {
  mode: Mode;
  /** the device owner's mark (in local mode: player 1's mark) */
  myMark: Mark;
  rounds: number;
}

/** running totals threaded through settle/robot callbacks so a scheduled
    move never reads stale state */
interface Totals {
  winsX: number;
  winsO: number;
  draws: number;
  round: number;
  hintsUsed: number;
}

interface TttSave extends TttConfig {
  board: Cell[];
  turn: Mark;
  winsX: number;
  winsO: number;
  draws: number;
  round: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function TicTacToeGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  // older saves (pre mode/rounds) lack `mode` — treat them as no save
  const saved =
    savedState && (savedState as TttSave).mode ? (savedState as TttSave) : undefined;

  const [config, setConfig] = useState<TttConfig | null>(
    saved ? { mode: saved.mode, myMark: saved.myMark, rounds: saved.rounds } : null
  );
  // pre-game menu picks
  const [pickMode, setPickMode] = useState<Mode>('bot');
  const [pickMark, setPickMark] = useState<Mark>('X');
  const [pickRounds, setPickRounds] = useState(3);

  const [board, setBoard] = useState<Cell[]>(() =>
    saved ? [...saved.board] : new Array(9).fill(null)
  );
  const [turn, setTurn] = useState<Mark>(saved?.turn ?? 'X');
  const [round, setRound] = useState(saved?.round ?? 1);
  const [winsX, setWinsX] = useState(saved?.winsX ?? 0);
  const [winsO, setWinsO] = useState(saved?.winsO ?? 0);
  const [draws, setDraws] = useState(saved?.draws ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [banner, setBanner] = useState<string | null>(null);
  const [suggest, setSuggest] = useState<number | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);

  const done = useRef(false);
  const roundOver = useRef(false);
  const timers = useRef<number[]>([]);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // the clock only runs once the match is configured — not on the menu
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  const myWinsOf = (t: Totals) => (config?.myMark === 'O' ? t.winsO : t.winsX);
  const oppWinsOf = (t: Totals) => (config?.myMark === 'O' ? t.winsX : t.winsO);
  const scoreOf = (t: Totals) => myWinsOf(t) * 100 * MULT[difficulty];
  const totalsNow = (): Totals => ({ winsX, winsO, draws, round, hintsUsed });

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
  }, [winsX, winsO, draws, hintsUsed, round, config, events]);

  const finishMatch = (winnerMark: Mark, t: Totals) => {
    if (done.current || !config) return;
    done.current = true;
    const youWon = winnerMark === config.myMark;
    const hi = Math.max(t.winsX, t.winsO);
    const lo = Math.min(t.winsX, t.winsO);
    const base = {
      outcome: (youWon ? 'won' : 'lost') as 'won' | 'lost',
      score: scoreOf(t),
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
      // pass-the-phone match: show WHO won instead of statistics
      events.onFinish({
        ...base,
        hideStats: true,
        headline: youWon ? 'You win the match!' : 'Your friend wins the match!',
        subline:
          `${MARK_NAME[winnerMark]} (${winnerMark}) takes it ${hi}–${lo}` +
          (t.draws > 0 ? ` · ${t.draws} draw${t.draws > 1 ? 's' : ''}` : '')
      });
    } else {
      events.onFinish(base);
    }
  };

  const nextRound = (r: number) => {
    schedule(() => {
      roundOver.current = false;
      setBoard(new Array(9).fill(null));
      setWinLine(null);
      setSuggest(null);
      setRound(r);
      setTurn(roundStarter(r));
      setBanner(null);
    }, 1300);
  };

  /** returns true when the board ended the round (win or draw) */
  const settleRound = (b: Cell[], t: Totals): boolean => {
    if (!config) return false;
    const w = winner(b);
    if (!w && !full(b)) return false;
    roundOver.current = true;
    if (w) {
      const line = WINS.find(([a, c, e]) => b[a] === w && b[c] === w && b[e] === w) ?? null;
      setWinLine(line);
    }
    const nt: Totals = {
      ...t,
      winsX: t.winsX + (w === 'X' ? 1 : 0),
      winsO: t.winsO + (w === 'O' ? 1 : 0),
      draws: t.draws + (w ? 0 : 1)
    };
    setWinsX(nt.winsX);
    setWinsO(nt.winsO);
    setDraws(nt.draws);

    // all rounds played and someone is ahead → the match is decided;
    // a tie after the last round goes to sudden death (next win takes it)
    if (t.round >= config.rounds && nt.winsX !== nt.winsO) {
      const winnerMark: Mark = nt.winsX > nt.winsO ? 'X' : 'O';
      const youWon = winnerMark === config.myMark;
      if (config.mode === 'local') {
        setBanner(`${MARK_NAME[winnerMark]} (${winnerMark}) wins the match!`);
        sfx.place();
      } else {
        setBanner(youWon ? 'You win the match!' : 'The robot takes the match.');
        if (youWon) sfx.place();
        else sfx.error();
      }
      finishMatch(winnerMark, nt);
      return true;
    }

    if (w) {
      if (config.mode === 'local') {
        setBanner(`${MARK_NAME[w]} (${w}) takes the round!`);
        sfx.place();
      } else if (w === config.myMark) {
        setBanner('Round yours!');
        sfx.place();
      } else {
        setBanner('Robot round.');
        sfx.error();
      }
    } else {
      setBanner('Draw.');
      sfx.tap();
    }
    if (t.round + 1 > config.rounds) {
      // entering (or continuing) sudden death
      schedule(() => setBanner(null), 1300);
    }
    nextRound(t.round + 1);
    return true;
  };

  const scheduleRobot = (cfg: TttConfig, b: Cell[], t: Totals) => {
    schedule(() => {
      if (done.current || roundOver.current) return;
      const botMark = other(cfg.myMark);
      const move = robotMove(b, difficulty, botMark);
      const nb = [...b];
      nb[move] = botMark;
      setBoard(nb);
      sfx.tap();
      if (!settleRound(nb, t)) setTurn(cfg.myMark);
    }, 550);
  };

  // pause/resume + resumed-save timer management: pausing cancels every
  // pending timer (robot think, round transition); this effect re-arms the
  // one that was in flight. It also covers a save resumed mid-robot-turn on
  // mount. Empty-board robot openers stay the round-opener effect's job —
  // handling them here too would double-schedule the robot.
  useEffect(() => {
    if (!config || done.current) return;
    if (paused) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      return;
    }
    if (roundOver.current) {
      nextRound(round + 1);
    } else if (
      config.mode === 'bot' &&
      turn !== config.myMark &&
      !board.every((v) => v === null) &&
      !winner(board) &&
      !full(board)
    ) {
      scheduleRobot(config, board, totalsNow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, config]);

  // robot opens whenever a fresh round starts on its mark
  useEffect(() => {
    if (!config || config.mode !== 'bot' || done.current || roundOver.current) return;
    if (turn === other(config.myMark) && board.every((v) => v === null)) {
      scheduleRobot(config, board, totalsNow());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, turn, board]);

  const tap = (i: number) => {
    if (!config || paused || done.current || roundOver.current || board[i]) return;
    if (config.mode === 'bot' && turn !== config.myMark) return;
    const mark = turn;
    const nb = [...board];
    nb[i] = mark;
    setBoard(nb);
    setSuggest(null);
    sfx.tap();
    if (!settleRound(nb, totalsNow())) {
      setTurn(other(mark));
      if (config.mode === 'bot') scheduleRobot(config, nb, totalsNow());
    }
  };

  const useSuggest = () => {
    if (!config || paused || done.current || roundOver.current || !assists.suggest) return;
    if (config.mode === 'bot' && turn !== config.myMark) return;
    assistsUsed.current.add('suggest');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    const m = minimax([...board], turn, turn).move;
    setSuggest(m >= 0 ? m : empties(board)[0]);
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
        board: settled ? new Array(9).fill(null) : board,
        turn: settled ? roundStarter(round + 1) : turn,
        winsX,
        winsO,
        draws,
        round: settled ? round + 1 : round,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      } satisfies TttSave;
    });
  });

  /* ---------- pre-game menu ---------- */

  if (!config) {
    return (
      <div className="ttt">
        <div className="ttt-setup fx-card">
          <h3 className="ttt-setup-title">Opponent</h3>
          <div className="ttt-opt-row cols-2">
            <button
              className={`ttt-opt ${pickMode === 'bot' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('bot');
              }}
            >
              Robot
            </button>
            <button
              className={`ttt-opt ${pickMode === 'local' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('local');
              }}
            >
              2 players · one phone
            </button>
          </div>

          <h3 className="ttt-setup-title">Your mark</h3>
          <div className="ttt-opt-row cols-2">
            <button
              className={`ttt-opt mark-x ${pickMark === 'X' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMark('X');
              }}
            >
              <TttCrossIcon /> Cross
            </button>
            <button
              className={`ttt-opt mark-o ${pickMark === 'O' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMark('O');
              }}
            >
              <TttRingIcon /> Circle
            </button>
          </div>
          <p className="ttt-setup-note">
            Cross always opens the first round; the opener alternates every round.
          </p>

          <h3 className="ttt-setup-title">Rounds</h3>
          <div className="ttt-opt-row cols-4">
            {ROUND_OPTIONS.map((r) => (
              <button
                key={r}
                className={`ttt-opt ${pickRounds === r ? 'active' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setPickRounds(r);
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="ttt-setup-note">
            Most round wins takes the match — a tie goes to sudden death.
          </p>

          <button
            className="primary-btn"
            onClick={() => {
              sfx.place();
              setConfig({ mode: pickMode, myMark: pickMark, rounds: pickRounds });
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
  const myMark = config.myMark;
  const oppMark = other(myMark);
  const myWins = myMark === 'X' ? winsX : winsO;
  const oppWins = myMark === 'X' ? winsO : winsX;

  const status =
    banner ??
    (config.mode === 'bot'
      ? turn === myMark
        ? `Your turn — you are ${myMark}`
        : 'Robot is thinking…'
      : `${MARK_NAME[turn]} (${turn}) plays`);

  return (
    <div className={`ttt ${paused ? 'board-hidden' : ''}`}>
      <div className="ttt-score">
        <span className={`ttt-side you ${config.mode === 'local' ? `m${myMark.toLowerCase()}` : ''}`}>
          You · {myMark} <b>{myWins}</b>
        </span>
        <span className="ttt-vs">
          {suddenDeath ? 'Sudden death' : `Round ${round} of ${config.rounds}`}
        </span>
        <span className={`ttt-side bot ${config.mode === 'local' ? `m${oppMark.toLowerCase()}` : ''}`}>
          <b>{oppWins}</b> {oppLabel} · {oppMark}
        </span>
      </div>

      <p className="simon-status">{status}</p>

      <div className="ttt-board">
        {board.map((v, i) => (
          <button
            key={i}
            className={[
              'ttt-cell',
              v === 'X' ? 'x' : v === 'O' ? 'o' : '',
              winLine?.includes(i) ? 'win' : '',
              suggest === i ? 'suggest' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => tap(i)}
          >
            {v === 'X' ? <TttCrossIcon /> : v === 'O' ? <TttRingIcon /> : null}
          </button>
        ))}
      </div>

      {assists.suggest && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={useSuggest}
              disabled={config.mode === 'bot' && turn !== myMark}
            >
              <BulbIcon />
              <span>Suggest move</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
