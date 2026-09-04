import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, FlagIcon, PlayIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  applyMove,
  B,
  F_CASTLE_K,
  F_CASTLE_Q,
  F_EP,
  file,
  inCheck,
  initialPosition,
  K,
  kingSquare,
  legalMoves,
  moveFromUci,
  N,
  P,
  posKey,
  Q,
  R,
  rank,
  san,
  statusOf,
  toFen,
  type Color,
  type Move,
  type Position,
  type Status
} from './logic/engine';
import { chooseMove } from './logic/ai';
import { HINT_SEARCH, lotteryMove, pickCandidate, TIERS } from './logic/difficulty';
import { EngineError, stockfish, type EngineState } from './logic/engineClient';
import { ChessPiece } from './pieces';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BASE = 400;
const THINK_MS = 450; // the robot never answers faster than this, so the board paints first
const PAWN_VAL: Record<number, number> = { [P]: 1, [N]: 3, [B]: 3, [R]: 5, [Q]: 9, [K]: 0 };

/** the player always commands White; the robot answers as Black */
const ME: Color = 'w';
const BOT: Color = 'b';

interface SavedPos {
  board: number[];
  turn: Color;
  castling: number;
  ep: number;
  halfmove: number;
  fullmove: number;
}

interface HistEntry {
  /** the position BEFORE this ply (what undo restores) */
  pos: SavedPos;
  from: number;
  to: number;
  promo: number;
  san: string;
  /** signed code of the mover / of what it took (0 = quiet move) */
  piece: number;
  captured: number;
  /** posKey AFTER the ply — rebuilt into the repetition counter on load */
  key: string;
}

interface ChessSave {
  pos: SavedPos;
  history: HistEntry[];
  assistsUsed: string[];
  hintsUsed?: number;
}

const freeze = (pos: Position): SavedPos => ({
  board: Array.from(pos.board),
  turn: pos.turn,
  castling: pos.castling,
  ep: pos.ep,
  halfmove: pos.halfmove,
  fullmove: pos.fullmove
});
const thaw = (s: SavedPos): Position => ({
  board: new Int8Array(s.board),
  turn: s.turn,
  castling: s.castling,
  ep: s.ep,
  halfmove: s.halfmove,
  fullmove: s.fullmove
});

interface PieceView {
  id: number;
  kind: number;
  color: Color;
  sq: number;
}

let idSeq = 1;
function boardToPieces(pos: Position): PieceView[] {
  const out: PieceView[] = [];
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = pos.board[sq];
    if (p !== 0) out.push({ id: idSeq++, kind: Math.abs(p), color: p > 0 ? 'w' : 'b', sq });
  }
  return out;
}

const STATUS_REASON: Record<Status, string> = {
  playing: '',
  checkmate: 'Checkmate',
  stalemate: 'Stalemate — no legal move, no check',
  'fifty-moves': 'Fifty moves without a capture or a pawn move',
  insufficient: 'Neither side can force mate',
  repetition: 'The same position appeared three times'
};

/** the engine's load state, for the status line and the download meter */
function useEngineState(): EngineState {
  const [state, setState] = useState<EngineState>(() => stockfish.getState());
  useEffect(() => stockfish.subscribe(setState), []);
  return state;
}

export function ChessGame({ difficulty, assists, paused, events, savedState, registerSnapshot }: GameProps) {
  const saved =
    savedState && Array.isArray((savedState as ChessSave).history) && (savedState as ChessSave).pos
      ? (savedState as ChessSave)
      : undefined;
  const plan = TIERS[difficulty];

  const [pos, setPos] = useState<Position>(() => (saved ? thaw(saved.pos) : initialPosition()));
  const [history, setHistory] = useState<HistEntry[]>(() => saved?.history ?? []);
  const [pieces, setPieces] = useState<PieceView[]>(() =>
    boardToPieces(saved ? thaw(saved.pos) : initialPosition())
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [targets, setTargets] = useState<Map<number, Move[]>>(new Map());
  const [dragSq, setDragSq] = useState<number | null>(null);
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null);
  const [hoverSq, setHoverSq] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);
  const [resignArmed, setResignArmed] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  /** the engine could not load or died mid-game: the player picks a way out */
  const [engineErr, setEngineErr] = useState<string | null>(null);
  const engineState = useEngineState();

  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const posRef = useRef(pos);
  const piecesRef = useRef(pieces);
  const historyRef = useRef(history);
  const boardEl = useRef<HTMLDivElement>(null);
  const logEl = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const hintCount = useRef(typeof saved?.hintsUsed === 'number' ? saved.hintsUsed : 0);
  /** "play the built-in robot instead" — for this session only */
  const builtin = useRef(false);
  posRef.current = pos;
  piecesRef.current = pieces;
  historyRef.current = history;

  const schedule = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* the engine is shared by every chess session: hold it while this one
     lives, stop whatever it is doing when we leave */
  useEffect(() => {
    stockfish.retain();
    stockfish.newGame();
    return () => {
      stockfish.stop();
      stockfish.release();
    };
  }, []);

  /* repetition counter — rebuilt from the saved history so a resumed game
     still knows every position it has been through */
  const keyCounts = useRef<Map<string, number>>(new Map());
  const rebuildKeys = (h: HistEntry[], current: Position) => {
    const m = new Map<string, number>();
    const bump = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    bump(h.length > 0 ? posKey(thaw(h[0].pos)) : posKey(current));
    for (const e of h) bump(e.key);
    keyCounts.current = m;
  };
  useEffect(() => {
    rebuildKeys(historyRef.current, posRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived HUD data ---------- */

  const myCaptures = useMemo(() => history.filter((e) => e.captured < 0).map((e) => -e.captured), [history]);
  const botCaptures = useMemo(() => history.filter((e) => e.captured > 0).map((e) => e.captured), [history]);
  const matDiff = useMemo(
    () =>
      myCaptures.reduce((s, k) => s + PAWN_VAL[k], 0) - botCaptures.reduce((s, k) => s + PAWN_VAL[k], 0),
    [myCaptures, botCaptures]
  );
  const check = useMemo(() => inCheck(pos), [pos]);
  const checkedKingSq = check ? kingSquare(pos.board, pos.turn) : -1;
  const last = history.length > 0 ? history[history.length - 1] : null;

  /* ---------- finishing ---------- */

  const finishGame = (
    outcome: 'won' | 'lost',
    opts: { headline?: string; subline?: string; score: number }
  ) => {
    if (done.current) return;
    done.current = true;
    setSelected(null);
    setTargets(new Map());
    setDragSq(null);
    setDragXY(null);
    setHint(null);
    events.onFinish({
      outcome,
      score: opts.score,
      errors: botCapturesRef.current.length,
      hintsUsed: hintCount.current,
      assistsUsed: [...assistsUsed.current],
      ...(opts.headline ? { hideStats: true, headline: opts.headline, subline: opts.subline } : {}),
      extra: { moves: Math.ceil(historyRef.current.length / 2), material: matDiffRef.current }
    });
  };
  // finish reads these through refs so a scheduled end sees the final board
  const botCapturesRef = useRef(botCaptures);
  const matDiffRef = useRef(matDiff);
  botCapturesRef.current = botCaptures;
  matDiffRef.current = matDiff;

  const settle = (after: Position) => {
    const st = statusOf(after, keyCounts.current);
    if (st === 'playing') return;
    schedule(() => {
      if (st === 'checkmate') {
        const won = after.turn === BOT; // the side to move is the side that got mated
        finishGame(won ? 'won' : 'lost', {
          score: won ? WIN_BASE * MULT[difficulty] + 20 * Math.max(0, matDiffRef.current) : 0
        });
      } else {
        finishGame('lost', {
          headline: 'Draw',
          subline: STATUS_REASON[st],
          score: 60 * MULT[difficulty]
        });
      }
    }, 500);
  };

  /* ---------- committing a ply (player and robot share this path) ---------- */

  const performMove = (move: Move) => {
    const before = posRef.current;
    const notation = san(before, move);
    const after = applyMove(before, move);
    const key = posKey(after);
    keyCounts.current.set(key, (keyCounts.current.get(key) ?? 0) + 1);

    // keep the piece layer in step: capture, slide, castle rook, promotion
    const sign = before.turn === 'w' ? 1 : -1;
    const capSq = move.flags & F_EP ? move.to - 16 * sign : move.to;
    const next = piecesRef.current
      .filter((p) => !(move.captured !== 0 && p.sq === capSq && p.color !== before.turn))
      .map((p) => {
        if (p.sq === move.from) return { ...p, sq: move.to, kind: move.promo || p.kind };
        if (move.flags & F_CASTLE_K && p.sq === move.to + 1) return { ...p, sq: move.to - 1 };
        if (move.flags & F_CASTLE_Q && p.sq === move.to - 2) return { ...p, sq: move.to + 1 };
        return p;
      });
    setPieces(next);
    piecesRef.current = next;

    const entry: HistEntry = {
      pos: freeze(before),
      from: move.from,
      to: move.to,
      promo: move.promo,
      san: notation,
      piece: move.piece,
      captured: move.captured,
      key
    };
    const h = [...historyRef.current, entry];
    setHistory(h);
    historyRef.current = h;
    setPos(after);
    posRef.current = after;
    setSelected(null);
    setTargets(new Map());
    setPromo(null);
    setHint(null);

    if (notation.endsWith('#')) sfx.hint();
    else if (notation.endsWith('+')) sfx.hint();
    else if (move.captured) sfx.pop();
    else sfx.place();

    settle(after);
  };

  /* ---------- robot turn ---------- */

  /**
   * Easy draws its lottery ticket at once; every other tier asks Stockfish
   * for its ranked lines and lets the tier's error injection pick (see
   * difficulty.ts). The search is cancelled by the cleanup — pause, undo
   * and leaving all run it — and a cancelled search is simply ignored,
   * because the effect re-runs from the current position when play
   * resumes. An engine that cannot be loaded surfaces the two-way-out
   * card instead of a silent wait.
   */
  useEffect(() => {
    if (done.current || paused || pos.turn !== BOT || engineErr) return;
    if (statusOf(pos, keyCounts.current) !== 'playing') return;
    let live = true;
    setThinking(true);
    const position = posRef.current;
    const wait = new Promise<void>((resolve) => schedule(resolve, THINK_MS));
    const decide: Promise<Move | null> =
      plan.brain === 'lottery'
        ? Promise.resolve(lotteryMove(position))
        : builtin.current
          ? Promise.resolve(chooseMove(position, difficulty))
          : stockfish
              .search({
                fen: toFen(position),
                movetime: plan.movetime,
                depth: plan.depth,
                multipv: plan.multipv,
                uciElo: plan.uciElo
              })
              .then((lines) => {
                const uci = pickCandidate(lines, plan);
                const move = uci ? moveFromUci(position, uci) : null;
                if (!move) console.warn(`chess: engine move "${uci}" is not legal here — built-in robot answers`);
                return move ?? chooseMove(position, difficulty);
              });
    Promise.all([decide, wait])
      .then(([move]) => {
        if (!live || done.current) return;
        setThinking(false);
        if (move) performMove(move);
      })
      .catch((e: unknown) => {
        if (!live || (e instanceof EngineError && e.cancelled)) return;
        setThinking(false);
        setEngineErr(e instanceof Error ? e.message : 'The engine failed');
      });
    return () => {
      live = false;
      setThinking(false);
      stockfish.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, paused, engineErr]);

  const retryEngine = () => {
    stockfish.reset();
    setEngineErr(null);
  };
  const playBuiltin = () => {
    builtin.current = true;
    setEngineErr(null);
  };

  useEffect(() => {
    if (paused) {
      setSelected(null);
      setTargets(new Map());
      setDragSq(null);
      setDragXY(null);
      setHoverSq(null);
      setPromo(null);
      setResignArmed(false);
    }
  }, [paused]);

  /* ---------- selection, drag & drop (rect-math hit-testing) ---------- */

  const display = (sq: number) => (7 - rank(sq)) * 8 + file(sq);
  const fromDisplay = (d: number) => (7 - Math.floor(d / 8)) * 16 + (d % 8);

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardEl.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cell = el.clientWidth / 8;
    const c = Math.floor((x - rect.left - el.clientLeft) / cell);
    const r = Math.floor((y - rect.top - el.clientTop) / cell);
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    return fromDisplay(r * 8 + c);
  };

  const selectPiece = (sq: number) => {
    const map = new Map<number, Move[]>();
    for (const m of legalMoves(posRef.current)) {
      if (m.from !== sq) continue;
      const list = map.get(m.to) ?? [];
      list.push(m);
      map.set(m.to, list);
    }
    setSelected(sq);
    setTargets(map);
  };

  const tryMoveTo = (to: number) => {
    const options = targets.get(to);
    if (!options || options.length === 0) return false;
    setDragSq(null);
    setDragXY(null);
    setHoverSq(null);
    if (options.length > 1) {
      // four promotion moves land on one square — ask which piece
      setPromo({ from: options[0].from, to });
      sfx.tap();
    } else {
      performMove(options[0]);
    }
    return true;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current || promo || pos.turn !== ME) return;
    const sq = cellFromPoint(e.clientX, e.clientY);
    if (sq === null) return;
    if (selected !== null && targets.has(sq)) {
      boardEl.current?.setPointerCapture(e.pointerId);
      tryMoveTo(sq);
      return;
    }
    const piece = pos.board[sq];
    if (piece > 0) {
      boardEl.current?.setPointerCapture(e.pointerId);
      sfx.tap();
      selectPiece(sq);
      setDragSq(sq);
      setDragXY(null);
      return;
    }
    setSelected(null);
    setTargets(new Map());
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragSq === null) return;
    setDragXY({ x: e.clientX, y: e.clientY });
    setHoverSq(cellFromPoint(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragSq === null) return;
    const sq = cellFromPoint(e.clientX, e.clientY);
    if (sq === null || sq === dragSq || !tryMoveTo(sq)) {
      setDragXY(null); // snap back, keep the selection for a tap-move
      setHoverSq(null);
    }
    setDragSq(null);
  };

  /* ---------- hint, undo & resign ---------- */

  const canHint =
    !!assists['hint'] && !done.current && !paused && pos.turn === ME && !thinking && !hintBusy && !engineErr;

  /** the engine at full strength, whatever the robot's tier — an active assist */
  const requestHint = () => {
    if (!canHint) return;
    hintCount.current++;
    assistsUsed.current.add('hint');
    setHintBusy(true);
    setHint(null);
    const position = posRef.current;
    const fallback = () => chooseMove(position, 'extreme');
    const ask: Promise<Move | null> = builtin.current
      ? Promise.resolve(fallback())
      : stockfish
          .search({ fen: toFen(position), ...HINT_SEARCH })
          .then((lines) => (lines[0] ? moveFromUci(position, lines[0].move) : null) ?? fallback())
          .catch(() => fallback());
    ask.then((move) => {
      setHintBusy(false);
      if (posRef.current !== position || done.current || !move) return;
      setHint({ from: move.from, to: move.to });
      sfx.hint();
    });
  };

  const undoTargetIdx = (() => {
    for (let i = historyRef.current.length - 1; i >= 0; i--) {
      if (historyRef.current[i].pos.turn === ME) return i;
    }
    return -1;
  })();
  const canUndo = !done.current && pos.turn === ME && !thinking && undoTargetIdx >= 0;

  const undo = () => {
    if (!canUndo) return;
    assistsUsed.current.add('undo');
    sfx.tap();
    const h = historyRef.current.slice(0, undoTargetIdx);
    const restored = thaw(historyRef.current[undoTargetIdx].pos);
    setHistory(h);
    historyRef.current = h;
    setPos(restored);
    posRef.current = restored;
    const pv = boardToPieces(restored);
    setPieces(pv);
    piecesRef.current = pv;
    rebuildKeys(h, restored);
    setSelected(null);
    setTargets(new Map());
    setPromo(null);
    setHint(null);
  };

  const resign = () => {
    if (done.current || paused) return;
    if (!resignArmed) {
      setResignArmed(true);
      sfx.tap();
      schedule(() => setResignArmed(false), 2600);
      return;
    }
    finishGame('lost', {
      headline: 'You resigned',
      subline: `After ${Math.ceil(historyRef.current.length / 2)} moves`,
      score: 0
    });
  };

  /* ---------- stats & snapshot ---------- */

  useEffect(() => {
    events.onStats({
      score: Math.max(0, matDiff) * 10,
      errors: botCaptures.length,
      hintsUsed: hintCount.current,
      assistsUsed: [...assistsUsed.current],
      extra: { moves: Math.ceil(history.length / 2), material: matDiff }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, hint]);

  useEffect(() => {
    registerSnapshot(() => ({
      pos: freeze(posRef.current),
      history: historyRef.current,
      assistsUsed: [...assistsUsed.current],
      hintsUsed: hintCount.current
    }));
  });

  // the log follows the game — newest move always in view
  useEffect(() => {
    if (logEl.current) logEl.current.scrollTop = logEl.current.scrollHeight;
  }, [history]);

  /* ---------- render ---------- */

  const loading = engineState.status === 'loading';
  const loadPct = loading && engineState.percent !== null ? Math.round(engineState.percent * 100) : null;
  const status = done.current
    ? 'Game over'
    : engineErr
      ? 'The engine is unavailable'
      : pos.turn === ME
        ? check
          ? 'Check — defend your king!'
          : hintBusy
            ? 'Looking for a hint…'
            : 'Your move'
        : loading
          ? `Loading the engine (once, 7 MB)…${loadPct !== null ? ` ${loadPct}%` : ''}`
          : check
            ? 'The robot is in check'
            : 'Robot is thinking…';

  const tray = (caps: number[], color: Color) => {
    const sorted = [...caps].sort((a, b) => PAWN_VAL[a] - PAWN_VAL[b]);
    return sorted.map((kind, i) => (
      <span key={i} className="chess-cap">
        <ChessPiece kind={kind} color={color} />
      </span>
    ));
  };

  const logRows: { n: number; w?: HistEntry; b?: HistEntry }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    logRows.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] });
  }

  const sanCell = (e: HistEntry) => {
    const kind = Math.abs(e.piece);
    const figurine = kind !== P && !e.san.startsWith('O');
    return (
      <span className="chess-san">
        {figurine && (
          <span className="chess-san-icon">
            <ChessPiece kind={kind} color={e.piece > 0 ? 'w' : 'b'} />
          </span>
        )}
        {figurine ? e.san.slice(1) : e.san}
      </span>
    );
  };

  const promoChoices = promo ? targets.get(promo.to) ?? [] : [];

  return (
    <div className={`chess ${paused ? 'board-hidden' : ''}`}>
      <div className={`chess-hud ${pos.turn === BOT && !done.current ? 'active' : ''}`}>
        <span className="chess-hud-avatar b">
          <ChessPiece kind={K} color="b" />
        </span>
        <span className="chess-hud-name">Robot</span>
        <span className="chess-hud-elo">{plan.label}</span>
        <span className="chess-tray">{tray(botCaptures, 'w')}</span>
        {matDiff < 0 && <b className="chess-adv">+{-matDiff}</b>}
      </div>

      <div
        ref={boardEl}
        className="chess-board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {Array.from({ length: 64 }, (_, d) => {
          const sq = fromDisplay(d);
          const light = (rank(sq) + file(sq)) % 2 === 1;
          const target = targets.get(sq);
          const cls = [
            'chess-sq',
            light ? 'light' : 'dark',
            last && (last.from === sq || last.to === sq) ? 'last' : '',
            selected === sq ? 'sel' : '',
            hint && (hint.from === sq || hint.to === sq) ? 'hint' : '',
            checkedKingSq === sq ? 'check' : '',
            dragSq !== null && hoverSq === sq ? 'hover' : ''
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={d} className={cls}>
              {file(sq) === 0 && <span className="chess-coord rank">{rank(sq) + 1}</span>}
              {rank(sq) === 0 && <span className="chess-coord file">{'abcdefgh'[file(sq)]}</span>}
              {target && (pos.board[sq] === 0 ? <span className="chess-dot" /> : <span className="chess-ring" />)}
            </div>
          );
        })}

        <div className="chess-pieces">
          {pieces.map((p) => {
            const d = display(p.sq);
            let style: React.CSSProperties;
            let dragging = false;
            if (p.sq === dragSq && dragXY && boardEl.current) {
              const el = boardEl.current;
              const rect = el.getBoundingClientRect();
              const cell = el.clientWidth / 8;
              style = {
                transform: `translate(${dragXY.x - rect.left - el.clientLeft - cell / 2}px, ${
                  dragXY.y - rect.top - el.clientTop - cell / 2
                }px) scale(1.15)`
              };
              dragging = true;
            } else {
              style = { transform: `translate(${(d % 8) * 100}%, ${Math.floor(d / 8) * 100}%)` };
            }
            return (
              <div key={p.id} className={`chess-man ${dragging ? 'dragging' : ''}`} style={style}>
                <ChessPiece kind={p.kind} color={p.color} />
              </div>
            );
          })}
        </div>

        {promo && (
          <div className="chess-promo" onPointerDown={(e) => e.stopPropagation()}>
            <p>Promote to</p>
            <div className="chess-promo-row">
              {[Q, N, R, B].map((kind) => {
                const move = promoChoices.find((m) => m.promo === kind);
                if (!move) return null;
                return (
                  <button key={kind} className="chess-promo-btn" onClick={() => performMove(move)}>
                    <ChessPiece kind={kind} color="w" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`chess-hud me ${pos.turn === ME && !done.current ? 'active' : ''}`}>
        <span className="chess-hud-avatar w">
          <ChessPiece kind={K} color="w" />
        </span>
        <span className="chess-hud-name">You</span>
        <span className="chess-tray">{tray(myCaptures, 'b')}</span>
        {matDiff > 0 && <b className="chess-adv">+{matDiff}</b>}
      </div>

      <p className="chess-turn">{status}</p>
      {loading && !done.current && pos.turn === BOT && (
        <div className="chess-engine-bar" role="progressbar" aria-valuenow={loadPct ?? undefined}>
          <i style={{ width: `${loadPct ?? 0}%` }} />
        </div>
      )}

      {engineErr && !done.current && (
        <div className="chess-engine-note fx-card">
          <p>
            <b>The chess engine could not run.</b> {engineErr}. Try again, or play this game against the
            built-in robot instead.
          </p>
          <div className="chess-engine-actions">
            <PadTool onClick={retryEngine}>
              <RestartIcon />
              <span>Try again</span>
            </PadTool>
            <PadTool onClick={playBuiltin}>
              <PlayIcon />
              <span>Built-in robot</span>
            </PadTool>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="chess-log fx-card" ref={logEl}>
          {logRows.map((row) => (
            <div key={row.n} className="chess-log-row">
              <span className="chess-log-n">{row.n}.</span>
              {row.w && sanCell(row.w)}
              {row.b ? sanCell(row.b) : <span />}
            </div>
          ))}
        </div>
      )}

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists['hint'] && (
            <PadTool onClick={requestHint} disabled={!canHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          {assists['undo'] && (
            <PadTool onClick={undo} disabled={!canUndo}>
              <RestartIcon />
              <span>Undo</span>
            </PadTool>
          )}
          <PadTool silent onClick={resign} disabled={done.current}>
            <FlagIcon />
            <span>{resignArmed ? 'Sure?' : 'Resign'}</span>
          </PadTool>
        </div>
      </div>
    </div>
  );
}
