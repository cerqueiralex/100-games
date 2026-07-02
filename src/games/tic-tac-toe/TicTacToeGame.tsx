import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';

type Mark = 'X' | 'O' | null;

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const TARGET_WINS = 3;
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
/** chance the robot plays a perfect (minimax) move instead of a simple one */
const AI_STRENGTH: Record<Difficulty, number> = { easy: 0.25, medium: 0.7, hard: 0.92 };

function winner(b: Mark[]): Mark {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

const full = (b: Mark[]) => b.every(Boolean);
const empties = (b: Mark[]) => b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

function minimax(b: Mark[], me: 'X' | 'O', turn: 'X' | 'O'): { score: number; move: number } {
  const w = winner(b);
  if (w) return { score: w === me ? 1 : -1, move: -1 };
  if (full(b)) return { score: 0, move: -1 };
  let best = { score: turn === me ? -2 : 2, move: -1 };
  for (const i of empties(b)) {
    b[i] = turn;
    const r = minimax(b, me, turn === 'X' ? 'O' : 'X');
    b[i] = null;
    if (turn === me ? r.score > best.score : r.score < best.score) {
      best = { score: r.score, move: i };
    }
  }
  return best;
}

/** win if possible, block if needed, otherwise center/corner/random */
function heuristicMove(b: Mark[], me: 'X' | 'O'): number {
  const other: 'X' | 'O' = me === 'X' ? 'O' : 'X';
  for (const player of [me, other] as ('X' | 'O')[]) {
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

function robotMove(b: Mark[], difficulty: Difficulty): number {
  if (Math.random() < AI_STRENGTH[difficulty]) {
    const m = minimax([...b], 'O', 'O').move;
    if (m >= 0) return m;
  }
  if (difficulty !== 'easy' || Math.random() < 0.5) return heuristicMove([...b], 'O');
  const e = empties(b);
  return e[Math.floor(Math.random() * e.length)];
}

interface TttSave {
  board: Mark[];
  youScore: number;
  botScore: number;
  draws: number;
  score: number;
  hintsUsed: number;
  yourTurn: boolean;
  youStart: boolean;
  assistsUsed: string[];
}

export function TicTacToeGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as TttSave | undefined;
  const [board, setBoard] = useState<Mark[]>(() =>
    saved ? [...saved.board] : new Array(9).fill(null)
  );
  const [youScore, setYouScore] = useState(saved?.youScore ?? 0);
  const [botScore, setBotScore] = useState(saved?.botScore ?? 0);
  const [draws, setDraws] = useState(saved?.draws ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [yourTurn, setYourTurn] = useState(saved?.yourTurn ?? true);
  const [banner, setBanner] = useState<string | null>(null);
  const [suggest, setSuggest] = useState<number | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);

  const done = useRef(false);
  const roundOver = useRef(false);
  const youStart = useRef(saved?.youStart ?? true);
  const timers = useRef<number[]>([]);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    events.onStats({
      score,
      errors: botScore,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { you: youScore, robot: botScore, draws }
    });
  }, [score, botScore, youScore, draws, hintsUsed, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, you: number, bot: number, h: number, d: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome,
        score: finalScore,
        errors: bot,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { you, robot: bot, draws: d }
      });
    },
    [events]
  );

  const nextRound = useCallback(
    (you: number, bot: number) => {
      if (you >= TARGET_WINS || bot >= TARGET_WINS) return;
      schedule(() => {
        youStart.current = !youStart.current;
        roundOver.current = false;
        setBoard(new Array(9).fill(null));
        setWinLine(null);
        setBanner(null);
        setSuggest(null);
        setYourTurn(youStart.current);
      }, 1300);
    },
    []
  );

  const settleRound = useCallback(
    (b: Mark[], you: number, bot: number, d: number, h: number, sc: number) => {
      const w = winner(b);
      if (!w && !full(b)) return false;
      roundOver.current = true;
      if (w) {
        const line = WINS.find(([a, c, e]) => b[a] === w && b[c] === w && b[e] === w) ?? null;
        setWinLine(line);
      }
      if (w === 'X') {
        const nyou = you + 1;
        const nsc = sc + 100 * MULT[difficulty];
        setYouScore(nyou);
        setScore(nsc);
        setBanner(nyou >= TARGET_WINS ? 'You win the match!' : 'Round yours!');
        sfx.place();
        if (nyou >= TARGET_WINS) finish('won', nsc, nyou, bot, h, d);
        else nextRound(nyou, bot);
      } else if (w === 'O') {
        const nbot = bot + 1;
        setBotScore(nbot);
        setBanner(nbot >= TARGET_WINS ? 'The robot takes the match.' : 'Robot round.');
        sfx.error();
        if (nbot >= TARGET_WINS) finish('lost', sc, you, nbot, h, d);
        else nextRound(you, nbot);
      } else {
        setDraws(d + 1);
        setBanner('Draw — go again.');
        sfx.tap();
        nextRound(you, bot);
      }
      return true;
    },
    [difficulty, finish, nextRound]
  );

  const playRobot = useCallback(
    (b: Mark[], you: number, bot: number, d: number, h: number, sc: number) => {
      schedule(() => {
        if (done.current || roundOver.current) return;
        const move = robotMove(b, difficulty);
        const nb = [...b];
        nb[move] = 'O';
        setBoard(nb);
        sfx.tap();
        if (!settleRound(nb, you, bot, d, h, sc)) setYourTurn(true);
      }, 550);
    },
    [difficulty, settleRound]
  );

  // resumed mid-robot-turn: let the robot finish its move
  useEffect(() => {
    if (saved && !saved.yourTurn && saved.board.some(Boolean) && !winner(saved.board) && !full(saved.board)) {
      playRobot([...saved.board], saved.youScore, saved.botScore, saved.draws, saved.hintsUsed, saved.score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // robot opens when it starts the round
  useEffect(() => {
    if (!yourTurn && board.every((v) => v === null) && !done.current) {
      playRobot(board, youScore, botScore, draws, hintsUsed, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourTurn, board]);

  const tap = (i: number) => {
    if (paused || done.current || roundOver.current || !yourTurn || board[i]) return;
    const nb = [...board];
    nb[i] = 'X';
    setBoard(nb);
    setSuggest(null);
    sfx.tap();
    if (!settleRound(nb, youScore, botScore, draws, hintsUsed, score)) {
      setYourTurn(false);
      playRobot(nb, youScore, botScore, draws, hintsUsed, score);
    }
  };

  const useSuggest = () => {
    if (paused || done.current || roundOver.current || !yourTurn || !assists.suggest) return;
    assistsUsed.current.add('suggest');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    const m = minimax([...board], 'X', 'X').move;
    setSuggest(m >= 0 ? m : empties(board)[0]);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      board,
      youScore,
      botScore,
      draws,
      score,
      hintsUsed,
      yourTurn,
      youStart: youStart.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`ttt ${paused ? 'board-hidden' : ''}`}>
      <div className="ttt-score">
        <span className="ttt-side you">
          You <b>{youScore}</b>
        </span>
        <span className="ttt-vs">first to {TARGET_WINS}</span>
        <span className="ttt-side bot">
          <b>{botScore}</b> Robot
        </span>
      </div>

      <p className="simon-status">
        {banner ?? (yourTurn ? 'Your turn — you are X' : 'Robot is thinking…')}
      </p>

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
            {v ?? ''}
          </button>
        ))}
      </div>

      {assists.suggest && (
        <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <button className="pad-tool" onClick={useSuggest} disabled={!yourTurn}>
            <BulbIcon />
            <span>Suggest move</span>
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
