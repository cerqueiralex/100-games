import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  applyHop,
  applyMove,
  applySimple,
  captureHopsFrom,
  countPieces,
  initialBoard,
  otherSide,
  sideHasCapture,
  simpleTargetsFrom,
  winnerOf,
  type Board,
  type Cell,
  type Hop,
  type Side
} from './logic/engine';
import { chooseMove, suggestMove } from './logic/ai';

type Mode = 'bot' | 'local';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BASE = 300;
const HINT_PENALTY = 40;
const HOP_MS = 230; // slide / jump-arc duration
const THINK_MS = 400; // pause before the robot answers (so the board paints)
const CROWN_MS = 560;

const SIDE_NAME: Record<Side, string> = { r: 'Red', b: 'Black' };

interface Config {
  mode: Mode;
  /** the device owner's color (in local mode the board owner = Red) */
  myColor: Side;
}

interface PieceView {
  id: number;
  side: Side;
  king: boolean;
  sq: number;
}

interface PopGhost {
  id: number;
  sq: number;
  side: Side;
  king: boolean;
}

type Target = { kind: 'move'; sq: number } | { kind: 'capture'; sq: number; hop: Hop };

interface CheckersSave {
  mode: Mode;
  myColor: Side;
  board: Cell[];
  turn: Side;
  mustContinue: number | null;
  hintsUsed: number;
  assistsUsed: string[];
}

let idSeq = 1;
function boardToPieces(board: Board): PieceView[] {
  const out: PieceView[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p) out.push({ id: idSeq++, side: p.side, king: p.king, sq: i });
  }
  return out;
}

function Crown() {
  return (
    <svg className="chk-crown" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M4 18h16l1-9-5 3.2L12 5 8 12.2 3 9z" />
      <rect x="4" y="18.4" width="16" height="2.6" rx="1.3" />
    </svg>
  );
}

export function CheckersGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  const saved =
    savedState && (savedState as CheckersSave).mode && Array.isArray((savedState as CheckersSave).board)
      ? (savedState as CheckersSave)
      : undefined;

  const [config, setConfig] = useState<Config | null>(
    saved ? { mode: saved.mode, myColor: saved.myColor } : null
  );
  const [pickMode, setPickMode] = useState<Mode>('bot');
  const [pickColor, setPickColor] = useState<Side>('r');

  const [board, setBoard] = useState<Board>(() => (saved ? [...saved.board] : initialBoard()));
  const [turn, setTurn] = useState<Side>(saved?.turn ?? 'r');
  const [pieces, setPieces] = useState<PieceView[]>(() =>
    boardToPieces(saved ? [...saved.board] : initialBoard())
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<Map<number, Target>>(new Map());
  const [mustContinue, setMustContinue] = useState<number | null>(saved?.mustContinue ?? null);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [hintMove, setHintMove] = useState<{ from: number; to: number } | null>(null);

  const [popGhosts, setPopGhosts] = useState<PopGhost[]>([]);
  const [arcId, setArcId] = useState<number | null>(null);
  const [crownId, setCrownId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);

  const done = useRef(false);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const boardRef = useRef(board);
  const piecesRef = useRef(pieces);
  const turnRef = useRef(turn);
  const boardEl = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  // local (pass-and-play) undo — snapshot of the board at the start of each ply
  const plyStart = useRef<{ board: Board; turn: Side }>({
    board: saved ? [...saved.board] : initialBoard(),
    turn: saved?.turn ?? 'r'
  });
  const history = useRef<{ board: Board; turn: Side }[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  boardRef.current = board;
  piecesRef.current = pieces;
  turnRef.current = turn;

  const botColor = config ? otherSide(config.myColor) : 'b';
  const ownerColor: Side = config ? (config.mode === 'local' ? 'r' : config.myColor) : 'r';
  const flip = config?.mode === 'bot' && config.myColor === 'b';

  const schedule = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // clock runs only once a match is configured (not on the menu)
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  // passive assist counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists['move-hints']) assistsUsed.current.add('move-hints');
  }, [assists]);

  const display = (sq: number) => (flip ? 63 - sq : sq);
  const fromDisplay = (d: number) => (flip ? 63 - d : d);

  const mustContinueRef = useRef(mustContinue);
  mustContinueRef.current = mustContinue;

  /* ---------- selection & legality ---------- */

  const computeTargets = (sq: number, b: Board, side: Side, cont: number | null): Map<number, Target> => {
    const map = new Map<number, Target>();
    const forced = cont !== null || sideHasCapture(b, side);
    if (forced) {
      for (const hop of captureHopsFrom(b, sq)) map.set(hop.to, { kind: 'capture', sq: hop.to, hop });
    } else {
      for (const t of simpleTargetsFrom(b, sq)) map.set(t.to, { kind: 'move', sq: t.to });
    }
    return map;
  };

  const selectPiece = (sq: number) => {
    setSelected(sq);
    setTargets(computeTargets(sq, boardRef.current, turnRef.current, mustContinueRef.current));
  };

  // resuming mid multi-jump: re-arm the selection so the continuation shows
  useEffect(() => {
    if (config && mustContinue !== null && selected === null) {
      selectPiece(mustContinue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelectable = (sq: number): boolean => {
    const b = boardRef.current;
    const p = b[sq];
    if (!p || p.side !== turn) return false;
    if (config?.mode === 'bot' && turn !== config.myColor) return false;
    if (mustContinue !== null) return sq === mustContinue;
    if (sideHasCapture(b, turn)) return captureHopsFrom(b, sq).length > 0;
    return simpleTargetsFrom(b, sq).length > 0;
  };

  const pieceIdAt = (sq: number) => piecesRef.current.find((p) => p.sq === sq)?.id ?? null;

  /* ---------- animation primitive ---------- */

  const animateStep = (
    fromSq: number,
    toSq: number,
    promoted: boolean,
    captured: number[],
    isCapture: boolean
  ) => {
    const cur = piecesRef.current;
    const moving = cur.find((p) => p.sq === fromSq);
    const next = cur
      .filter((p) => !captured.includes(p.sq))
      .map((p) => (p.id === moving?.id ? { ...p, sq: toSq, king: p.king || promoted } : p));
    setPieces(next);
    piecesRef.current = next;

    // captured pieces pop off as transient ghosts (decoupled from logic state)
    captured.forEach((csq, k) => {
      const gone = cur.find((p) => p.sq === csq);
      if (!gone) return;
      const ghost: PopGhost = { id: idSeq++, sq: csq, side: gone.side, king: gone.king };
      schedule(() => setPopGhosts((g) => [...g, ghost]), k * 70);
      schedule(() => setPopGhosts((g) => g.filter((x) => x.id !== ghost.id)), 320 + k * 70);
    });

    if (isCapture && moving) {
      setArcId(moving.id);
      schedule(() => setArcId((v) => (v === moving.id ? null : v)), HOP_MS);
    }
    if (promoted && moving) {
      setCrownId(moving.id);
      schedule(() => sfx.place(), HOP_MS);
      schedule(() => setCrownId((v) => (v === moving.id ? null : v)), CROWN_MS);
    }
    isCapture ? sfx.pop() : sfx.place();

    busy.current = true;
    schedule(() => (busy.current = false), HOP_MS);
  };

  /* ---------- committing moves ---------- */

  const commitBoard = (nb: Board) => {
    setBoard(nb);
    boardRef.current = nb;
  };

  const recordPly = () => {
    if (config?.mode !== 'local') return;
    history.current.push(plyStart.current);
    if (history.current.length > 60) history.current.shift();
    setCanUndo(true);
  };

  const afterMove = (nb: Board, next: Side) => {
    recordPly();
    plyStart.current = { board: nb, turn: next };
    setTurn(next);
    turnRef.current = next;
    setSelected(null);
    setTargets(new Map());
    setMustContinue(null);
    mustContinueRef.current = null;
    setHintMove(null);
    const w = winnerOf(nb, next);
    if (w) schedule(() => finishGame(w, nb), HOP_MS + 220);
  };

  const doSimple = (fromSq: number, toSq: number) => {
    const nb = applySimple(boardRef.current, fromSq, toSq);
    const promoted = nb[toSq]?.king && !boardRef.current[fromSq]?.king;
    animateStep(fromSq, toSq, !!promoted, [], false);
    commitBoard(nb);
    afterMove(nb, otherSide(turnRef.current));
  };

  const doHop = (fromSq: number, hop: Hop) => {
    const nb = applyHop(boardRef.current, fromSq, hop);
    animateStep(fromSq, hop.to, hop.promotes, [hop.captured], true);
    commitBoard(nb);
    // crowning ends the move; otherwise a further jump is mandatory
    if (!hop.promotes && captureHopsFrom(nb, hop.to).length > 0) {
      setMustContinue(hop.to);
      mustContinueRef.current = hop.to;
      setSelected(hop.to);
      setTargets(computeTargets(hop.to, nb, turnRef.current, hop.to));
      setHintMove(null);
    } else {
      afterMove(nb, otherSide(turnRef.current));
    }
  };

  const executeTarget = (sq: number) => {
    const t = targets.get(sq);
    if (!t || selected === null) return;
    setDragId(null);
    setDragXY(null);
    if (t.kind === 'capture') doHop(selected, t.hop);
    else doSimple(selected, sq);
  };

  /* ---------- robot ---------- */

  const runRobot = () => {
    if (done.current || paused || busy.current) return;
    if (!config || config.mode !== 'bot' || turnRef.current !== botColor) return;
    const move = chooseMove(boardRef.current, botColor, difficulty);
    if (!move) return; // stalemate handled by winnerOf on the turn switch
    const nb = applyMove(boardRef.current, move);
    animateStep(move.from, move.to, move.promoted, move.captures, move.captures.length > 0);
    commitBoard(nb);
    afterMove(nb, config.myColor);
  };

  useEffect(() => {
    if (!config || config.mode !== 'bot' || done.current || paused) return;
    if (turn !== botColor) return;
    const t = schedule(runRobot, THINK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, config, paused]);

  // pause cancels every pending timer and clears transient animation
  useEffect(() => {
    if (paused) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      busy.current = false;
      setPopGhosts([]);
      setArcId(null);
      setCrownId(null);
      setDragId(null);
      setDragXY(null);
    }
  }, [paused]);

  /* ---------- pointer input (tap + drag, rect-math hit-testing) ---------- */

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardEl.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const inner = el.clientWidth;
    const cell = inner / 8;
    const x0 = rect.left + el.clientLeft;
    const y0 = rect.top + el.clientTop;
    const c = Math.floor((x - x0) / cell);
    const r = Math.floor((y - y0) / cell);
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    return fromDisplay(r * 8 + c);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!config || paused || done.current || busy.current) return;
    const b = cellFromPoint(e.clientX, e.clientY);
    if (b === null) return;
    if (selected !== null && targets.has(b)) {
      boardEl.current?.setPointerCapture(e.pointerId);
      executeTarget(b);
      return;
    }
    if (isSelectable(b)) {
      boardEl.current?.setPointerCapture(e.pointerId);
      sfx.tap();
      selectPiece(b);
      setDragId(pieceIdAt(b));
      setDragXY(null);
      return;
    }
    if (mustContinue === null) {
      setSelected(null);
      setTargets(new Map());
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragId === null) return;
    setDragXY({ x: e.clientX, y: e.clientY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragId === null) return;
    const b = cellFromPoint(e.clientX, e.clientY);
    if (b !== null && selected !== null && b !== selected && targets.has(b)) {
      executeTarget(b);
    } else {
      setDragXY(null); // snap the piece back, keep the selection
    }
    setDragId(null);
  };

  /* ---------- hint & undo ---------- */

  const useHint = () => {
    if (!config || config.mode !== 'bot' || paused || done.current || busy.current) return;
    if (turn !== config.myColor) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    const m = suggestMove(boardRef.current, config.myColor);
    if (m) setHintMove({ from: m.from, to: m.to });
  };

  const undo = () => {
    if (!config || config.mode !== 'local' || done.current || busy.current) return;
    const prev = history.current.pop();
    if (!prev) return;
    assistsUsed.current.add('undo');
    sfx.tap();
    commitBoard([...prev.board]);
    const p = boardToPieces([...prev.board]);
    setPieces(p);
    piecesRef.current = p;
    setTurn(prev.turn);
    turnRef.current = prev.turn;
    plyStart.current = { board: [...prev.board], turn: prev.turn };
    setSelected(null);
    setTargets(new Map());
    setMustContinue(null);
    mustContinueRef.current = null;
    setHintMove(null);
    setCanUndo(history.current.length > 0);
  };

  /* ---------- stats & finish ---------- */

  const counts = useMemo(() => countPieces(board), [board]);
  const ownerTotal = ownerColor === 'r' ? counts.rMen + counts.rKings : counts.bMen + counts.bKings;
  const oppTotal = ownerColor === 'r' ? counts.bMen + counts.bKings : counts.rMen + counts.rKings;
  const ownerMen = ownerColor === 'r' ? counts.rMen : counts.bMen;
  const ownerKings = ownerColor === 'r' ? counts.rKings : counts.bKings;

  useEffect(() => {
    if (!config) return;
    events.onStats({
      score: ownerMen * 8 + ownerKings * 20,
      errors: 12 - ownerTotal,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { you: ownerTotal, opponent: oppTotal, kings: ownerKings, mode: config.mode }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, hintsUsed, config, events]);

  const finishGame = (winnerSide: Side, nb: Board) => {
    if (done.current || !config) return;
    done.current = true;
    const c = countPieces(nb);
    const oMen = ownerColor === 'r' ? c.rMen : c.bMen;
    const oKings = ownerColor === 'r' ? c.rKings : c.bKings;
    const oTotal = oMen + oKings;
    const won = winnerSide === ownerColor;
    const score = won
      ? Math.max(0, WIN_BASE * MULT[difficulty] + oMen * 20 + oKings * 40 - hintsUsed * HINT_PENALTY)
      : oMen * 10 + oKings * 20;
    const base = {
      outcome: (won ? 'won' : 'lost') as 'won' | 'lost',
      score,
      errors: 12 - oTotal,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        you: oTotal,
        opponent: (c.rMen + c.rKings + c.bMen + c.bKings) - oTotal,
        mode: config.mode
      }
    };
    if (config.mode === 'local') {
      events.onFinish({
        ...base,
        hideStats: true,
        headline: `${SIDE_NAME[winnerSide]} wins!`,
        subline: `Red ${c.rMen + c.rKings} — Black ${c.bMen + c.bKings} pieces left`
      });
    } else {
      events.onFinish(base);
    }
  };

  /* ---------- snapshot ---------- */

  useEffect(() => {
    registerSnapshot(() => {
      if (!config) return null;
      return {
        mode: config.mode,
        myColor: config.myColor,
        board,
        turn,
        mustContinue,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      } satisfies CheckersSave;
    });
  });

  /* ---------- pre-game menu ---------- */

  if (!config) {
    return (
      <div className="chk">
        <div className="chk-setup fx-card">
          <h3 className="chk-setup-title">Opponent</h3>
          <div className="chk-opt-row cols-2">
            <button
              className={`chk-opt ${pickMode === 'bot' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('bot');
              }}
            >
              Robot
            </button>
            <button
              className={`chk-opt ${pickMode === 'local' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('local');
              }}
            >
              2 players · one phone
            </button>
          </div>

          {pickMode === 'bot' && (
            <>
              <h3 className="chk-setup-title">Play as</h3>
              <div className="chk-opt-row cols-2">
                <button
                  className={`chk-opt col-r ${pickColor === 'r' ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickColor('r');
                  }}
                >
                  <span className="chk-swatch r" /> Red
                </button>
                <button
                  className={`chk-opt col-b ${pickColor === 'b' ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickColor('b');
                  }}
                >
                  <span className="chk-swatch b" /> Black
                </button>
              </div>
            </>
          )}

          <p className="chk-setup-note">
            Red always moves first. Captures are mandatory — if you can jump, you must. Reach the far
            row to crown a King.
          </p>

          <button
            className="primary-btn"
            onClick={() => {
              sfx.place();
              setConfig({ mode: pickMode, myColor: pickMode === 'bot' ? pickColor : 'r' });
              setTurn('r');
              turnRef.current = 'r';
            }}
          >
            Start game
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */

  const forced = mustContinue !== null || sideHasCapture(board, turn);
  const showHints = !!assists['move-hints'];
  const mustSquares =
    showHints && forced && (config.mode === 'local' || turn === config.myColor)
      ? new Set(
          mustContinue !== null
            ? [mustContinue]
            : pieces.filter((p) => p.side === turn && captureHopsFrom(board, p.sq).length > 0).map((p) => p.sq)
        )
      : new Set<number>();

  const status =
    config.mode === 'bot'
      ? turn === config.myColor
        ? mustContinue !== null
          ? 'Keep jumping!'
          : forced
            ? 'You must capture'
            : 'Your move'
        : 'Robot is thinking…'
      : mustContinue !== null
        ? `${SIDE_NAME[turn]}: keep jumping!`
        : `${SIDE_NAME[turn]} to move${forced ? ' — must capture' : ''}`;

  const showToolsCard =
    (config.mode === 'bot' && assists['hint']) || (config.mode === 'local' && assists['undo']);

  return (
    <div className={`chk ${paused ? 'board-hidden' : ''}`}>
      <div className="chk-hud">
        <div className={`chk-side ${turn === 'r' ? 'active' : ''}`}>
          <span className="chk-side-top">
            <span className="chk-dot r" />
            <span className="chk-side-name">
              {config.mode === 'bot' ? (config.myColor === 'r' ? 'You' : 'Robot') : 'Red'}
            </span>
            <b>{counts.rMen + counts.rKings}</b>
          </span>
          <span className="chk-tray">
            {Array.from({ length: 12 - (counts.bMen + counts.bKings) }, (_, i) => (
              <i key={i} className="chk-cap b" />
            ))}
          </span>
        </div>
        <div className={`chk-side end ${turn === 'b' ? 'active' : ''}`}>
          <span className="chk-side-top">
            <b>{counts.bMen + counts.bKings}</b>
            <span className="chk-side-name">
              {config.mode === 'bot' ? (config.myColor === 'b' ? 'You' : 'Robot') : 'Black'}
            </span>
            <span className="chk-dot b" />
          </span>
          <span className="chk-tray end">
            {Array.from({ length: 12 - (counts.rMen + counts.rKings) }, (_, i) => (
              <i key={i} className="chk-cap r" />
            ))}
          </span>
        </div>
      </div>

      <p className="chk-turn">{status}</p>

      <div
        ref={boardEl}
        className="chk-board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Array.from({ length: 64 }, (_, d) => {
          const b = fromDisplay(d);
          const dark = (Math.floor(b / 8) + (b % 8)) % 2 === 1;
          const target = targets.get(b);
          const cls = [
            'chk-sq',
            dark ? 'dark' : 'light',
            selected === b ? 'sel' : '',
            showHints && target ? (target.kind === 'capture' ? 'cap-target' : 'move-target') : '',
            mustSquares.has(b) ? 'must' : '',
            hintMove?.from === b ? 'hint-from' : '',
            hintMove?.to === b ? 'hint-to' : ''
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={d} className={cls}>
              {showHints && target && <span className="chk-target-dot" />}
            </div>
          );
        })}

        <div className="chk-pieces">
          {pieces.map((p) => {
            const dsp = display(p.sq);
            const row = Math.floor(dsp / 8);
            const col = dsp % 8;
            let style: React.CSSProperties;
            let dragging = false;
            if (p.id === dragId && dragXY && boardEl.current) {
              const el = boardEl.current;
              const rect = el.getBoundingClientRect();
              const cell = el.clientWidth / 8;
              const x0 = rect.left + el.clientLeft;
              const y0 = rect.top + el.clientTop;
              style = {
                transform: `translate(${dragXY.x - x0 - cell / 2}px, ${dragXY.y - y0 - cell / 2}px) scale(1.12)`
              };
              dragging = true;
            } else {
              style = { transform: `translate(${col * 100}%, ${row * 100}%)` };
            }
            return (
              <div
                key={p.id}
                className={[
                  'chk-piece',
                  p.side === 'r' ? 'r' : 'b',
                  p.king ? 'king' : '',
                  dragging ? 'dragging' : '',
                  selected === p.sq ? 'lifted' : '',
                  arcId === p.id ? 'arc' : '',
                  crownId === p.id ? 'crowning' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={style}
              >
                <span className="chk-disc">{p.king && <Crown />}</span>
              </div>
            );
          })}

          {popGhosts.map((g) => {
            const dsp = display(g.sq);
            return (
              <div
                key={g.id}
                className={`chk-piece ${g.side === 'r' ? 'r' : 'b'} ${g.king ? 'king' : ''} ghost`}
                style={{ transform: `translate(${(dsp % 8) * 100}%, ${Math.floor(dsp / 8) * 100}%)` }}
              >
                <span className="chk-disc">{g.king && <Crown />}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showToolsCard && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            {config.mode === 'bot' && assists['hint'] && (
              <PadTool silent onClick={useHint} disabled={turn !== config.myColor}>
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
            {config.mode === 'local' && assists['undo'] && (
              <PadTool onClick={undo} disabled={!canUndo}>
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
