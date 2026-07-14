import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  BOARDS,
  applyMove,
  generateGame,
  initialState,
  isWin,
  legalMoves,
  movesFrom,
  pegCount,
  requiresCenter,
  solve,
  startHole,
  undoMove,
  type BoardId,
  type Move,
  type PegState
} from './logic/boards';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 8 * 60,
  pro: 8 * 60,
  extreme: 10 * 60
};
const PEG_PTS = 8;
const WIN_BONUS = 300;
const CENTER_BONUS = 200;
const HINT_PENALTY = 40;
const HINT_BUDGET = 1_500_000;

interface PegSave {
  board: BoardId;
  start: number;
  pegs: boolean[];
  moves: Move[];
  hintsUsed: number;
  illegal: number;
  assistsUsed: string[];
}

const sameMove = (a: Move | undefined, b: Move | undefined) =>
  !!a && !!b && a.from === b.from && a.over === b.over && a.to === b.to;

/** inline monochrome undo arrow (no matching icon in the design set) */
const UndoGlyph = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden>
    <path
      d="M9 8H15.5A4.5 4.5 0 0 1 20 12.5 4.5 4.5 0 0 1 15.5 17H8"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11.5 4.5 8 8l3.5 3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PegSolitaireGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  onToggleAssist
}: GameProps) {
  const saved =
    savedState && Array.isArray((savedState as PegSave).pegs) ? (savedState as PegSave) : undefined;
  const requireCenter = requiresCenter(difficulty);

  // one-time board generation; the shell remounts (new key) for a new game
  const initial = useMemo(() => {
    if (saved) return { board: saved.board, start: saved.start, pegs: saved.pegs.slice() };
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const st = generateGame(difficulty, seed);
    return { board: st.board, start: startHole(st), pegs: st.pegs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const board = initial.board;
  const def = BOARDS[board];
  const initialPegs = def.holeList.length - 1;

  const [pegs, setPegs] = useState<boolean[]>(initial.pegs);
  const [history, setHistory] = useState<Move[]>(saved?.moves ?? []);
  const [selected, setSelected] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [illegal, setIllegal] = useState(saved?.illegal ?? 0);
  // re-derive a stuck (dead-end) position when resuming a saved board
  const [stuck, setStuck] = useState(() => {
    const st: PegState = { board: initial.board, pegs: initial.pegs };
    return !isWin(st, requireCenter) && pegCount(st) > 1 && legalMoves(st).length === 0;
  });
  const [won, setWon] = useState(false);

  const [hop, setHop] = useState<{ move: Move; id: number } | null>(null);
  const [pop, setPop] = useState<{ hole: number; id: number } | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [drag, setDrag] = useState<{ from: number; dx: number; dy: number } | null>(null);

  // synchronous mirrors so pointer/solver handlers use live values
  const pegsRef = useRef(pegs);
  pegsRef.current = pegs;
  const historyRef = useRef(history);
  historyRef.current = history;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;
  const illegalRef = useRef(illegal);
  illegalRef.current = illegal;
  const stuckRef = useRef(stuck);
  stuckRef.current = stuck;

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; from: number; moved: boolean } | null>(null);
  const animId = useRef(0);
  const solutionRef = useRef<Move[] | null>(null);
  const solIdx = useRef(0);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.legalGlow ? ['legalGlow'] : [])])
  );

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.legalGlow) assistsUsed.current.add('legalGlow');
  }, [assists.legalGlow]);

  const state: PegState = useMemo(() => ({ board, pegs }), [board, pegs]);
  const count = useMemo(() => pegCount(state), [state]);
  const dests = useMemo(
    () => (selected === null ? new Set<number>() : new Set(movesFrom(state, selected).map((m) => m.to))),
    [selected, state]
  );

  const liveScore = (initialPegs - count) * PEG_PTS * MULT[difficulty];

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: illegal,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { pegsLeft: count, moves: history.length, board }
    });
  }, [liveScore, illegal, hintsUsed, count, history.length, board, events]);

  const win = useCallback(
    (st: PegState) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      const mult = MULT[difficulty];
      const removed = initialPegs - 1;
      const centerFinish = st.pegs[def.center] === true;
      const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult;
      const centerBonus = centerFinish ? CENTER_BONUS * mult : 0;
      const score = Math.max(
        0,
        removed * PEG_PTS * mult + WIN_BONUS * mult + centerBonus + timeBonus - hintsRef.current * HINT_PENALTY
      );
      events.onFinish({
        outcome: 'won',
        score,
        errors: illegalRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { pegsLeft: 1, moves: historyRef.current.length, board, centerFinish: centerFinish ? 1 : 0 }
      });
    },
    [difficulty, initialPegs, def.center, events, board]
  );

  const giveUp = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const left = pegsRef.current.filter(Boolean).length;
    const mult = MULT[difficulty];
    const score = Math.max(0, (initialPegs - left) * PEG_PTS * mult - hintsRef.current * HINT_PENALTY);
    events.onFinish({
      outcome: 'lost',
      score,
      errors: illegalRef.current + left,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current],
      extra: { pegsLeft: left, moves: historyRef.current.length, board }
    });
  }, [difficulty, initialPegs, events, board]);

  const performMove = useCallback(
    (mv: Move) => {
      const next = applyMove({ board, pegs: pegsRef.current }, mv).pegs;

      const id = ++animId.current;
      setHop({ move: mv, id });
      setPop({ hole: mv.over, id });
      pegsRef.current = next;
      setPegs(next);
      const nh = [...historyRef.current, mv];
      historyRef.current = nh;
      setHistory(nh);
      setSelected(null);
      setHintMove(null);
      sfx.pop();

      // keep the cached hint solution aligned while the player follows it
      if (solutionRef.current && sameMove(mv, solutionRef.current[solIdx.current])) solIdx.current += 1;
      else solutionRef.current = null;

      window.setTimeout(() => setPop((p) => (p && p.id === id ? null : p)), 240);
      window.setTimeout(() => setHop((h) => (h && h.id === id ? null : h)), 300);

      const st: PegState = { board, pegs: next };
      if (isWin(st, requireCenter)) win(st);
      else if (legalMoves(st).length === 0) setStuck(true);
    },
    [board, requireCenter, win]
  );

  const bump = useCallback((hole: number) => {
    setShake(hole);
    window.setTimeout(() => setShake((s) => (s === hole ? null : s)), 380);
  }, []);

  const illegalDrop = useCallback(
    (hole: number) => {
      bump(hole);
      sfx.error();
      illegalRef.current += 1;
      setIllegal(illegalRef.current);
    },
    [bump]
  );

  // ---- unified pointer interaction (tap-to-move + drag), rect-math hit test ----
  const holeFromPoint = useCallback(
    (x: number, y: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return null;
      const nx = (x - rect.left) / rect.width;
      const ny = (y - rect.top) / rect.height;
      let best = -1;
      let bestD = Infinity;
      for (const i of def.holeList) {
        const { gx, gy } = def.coord(i);
        const hx = (gx + 0.5) / def.spanX;
        const hy = (gy + 0.5) / def.spanY;
        const d = (nx - hx) ** 2 + (ny - hy) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const thresh = (0.6 / Math.max(def.spanX, def.spanY)) ** 2;
      return bestD <= thresh ? best : null;
    },
    [def]
  );

  const blocked = () => paused || done.current || won || stuckRef.current;

  const onPointerDown = (e: React.PointerEvent) => {
    if (blocked()) return;
    const hole = holeFromPoint(e.clientX, e.clientY);
    if (hole === null) return;
    if (pegsRef.current[hole]) {
      dragStart.current = { x: e.clientX, y: e.clientY, from: hole, moved: false };
      boardRef.current?.setPointerCapture(e.pointerId);
    } else {
      // empty hole tapped: complete a tap-to-move if it is a legal destination
      const sel = selectedRef.current;
      if (sel !== null) {
        const mv = movesFrom({ board, pegs: pegsRef.current }, sel).find((m) => m.to === hole);
        if (mv) performMove(mv);
        else setSelected(null);
      }
      dragStart.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ds = dragStart.current;
    if (!ds || blocked()) return;
    const dx = e.clientX - ds.x;
    const dy = e.clientY - ds.y;
    if (!ds.moved && Math.hypot(dx, dy) > 6) {
      ds.moved = true;
      setSelected(ds.from);
    }
    if (ds.moved) setDrag({ from: ds.from, dx, dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const ds = dragStart.current;
    dragStart.current = null;
    if (!ds) return;
    if (ds.moved) {
      setDrag(null);
      const target = holeFromPoint(e.clientX, e.clientY);
      const mv =
        target !== null
          ? movesFrom({ board, pegs: pegsRef.current }, ds.from).find((m) => m.to === target)
          : undefined;
      if (mv) performMove(mv);
      else {
        illegalDrop(ds.from);
        setSelected(null);
      }
    } else {
      // a tap on the peg toggles its selection
      if (selectedRef.current === ds.from) {
        setSelected(null);
      } else {
        setSelected(ds.from);
        sfx.tap();
        if (movesFrom({ board, pegs: pegsRef.current }, ds.from).length === 0) bump(ds.from);
      }
    }
  };

  const onPointerCancel = () => {
    dragStart.current = null;
    setDrag(null);
  };

  // ---- tools ----
  const undo = useCallback(() => {
    if (paused || done.current || !assists.undo || historyRef.current.length === 0) return;
    assistsUsed.current.add('undo');
    const last = historyRef.current[historyRef.current.length - 1];
    const prev = undoMove({ board, pegs: pegsRef.current }, last);
    pegsRef.current = prev.pegs;
    setPegs(prev.pegs);
    const nh = historyRef.current.slice(0, -1);
    historyRef.current = nh;
    setHistory(nh);
    setSelected(null);
    setStuck(false);
    setHintMove(null);
    solutionRef.current = null;
    sfx.place();
  }, [paused, assists.undo, board]);

  const restart = useCallback(() => {
    if (done.current) return;
    const fresh = initialState(board, initial.start).pegs;
    pegsRef.current = fresh;
    setPegs(fresh);
    historyRef.current = [];
    setHistory([]);
    setSelected(null);
    setStuck(false);
    setHintMove(null);
    solutionRef.current = null;
    sfx.tap();
  }, [board, initial.start]);

  const useHint = useCallback(() => {
    if (paused || done.current || won || stuckRef.current) return;
    if (!assists.hint) {
      onToggleAssist('hint', true);
      return;
    }
    const st: PegState = { board, pegs: pegsRef.current };
    if (!solutionRef.current) {
      const found = solve(st, requireCenter, HINT_BUDGET);
      if (!found) {
        // no winning continuation from here — nudge to undo/restart
        sfx.error();
        return;
      }
      solutionRef.current = found;
      solIdx.current = 0;
    }
    const next = solutionRef.current[solIdx.current];
    if (!next) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    setSelected(next.from);
    setHintMove(next);
    sfx.hint();
    window.setTimeout(() => setHintMove((h) => (sameMove(h ?? undefined, next) ? null : h)), 2400);
  }, [paused, won, assists.hint, board, requireCenter, onToggleAssist]);

  useEffect(() => {
    registerSnapshot(
      (): PegSave => ({
        board,
        start: initial.start,
        pegs,
        moves: history,
        hintsUsed,
        illegal,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  // ---- render helpers ----
  const cellStyle = (i: number): CSSProperties => {
    const { gx, gy } = def.coord(i);
    return {
      left: `${(gx / def.spanX) * 100}%`,
      top: `${(gy / def.spanY) * 100}%`,
      width: `${100 / def.spanX}%`,
      height: `${100 / def.spanY}%`
    };
  };

  const boardStyle = {
    '--span-x': def.spanX,
    '--span-y': def.spanY
  } as CSSProperties;

  const targetLabel = requireCenter ? '1 · centre' : '1 peg';

  return (
    <div className={`pegsol ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Pegs: <b>{count}</b>
        </span>
        <span className="info-item">
          Target: <b>{targetLabel}</b>
        </span>
        <span className="info-item">
          Moves: <b>{history.length}</b>
        </span>
      </div>

      <div className="pegsol-board-wrap">
        <div
          ref={boardRef}
          className={`peg-board ${def.kind} ${drag ? 'dragging-active' : ''}`}
          style={boardStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {/* recessed holes */}
          {def.holeList.map((i) => {
            const isDest = dests.has(i) && (assists.legalGlow || hintMove?.to === i);
            return (
              <div
                key={`h${i}`}
                className={[
                  'peg-hole',
                  i === def.center ? 'center' : '',
                  isDest ? 'dest' : '',
                  hintMove?.to === i ? 'hint-to' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={cellStyle(i)}
              >
                <span className="peg-hole-cup" />
              </div>
            );
          })}

          {/* pegs */}
          {def.holeList.map((i) => {
            if (!pegs[i]) return null;
            const isDragged = drag?.from === i;
            const isHop = hop?.move.to === i;
            const style: CSSProperties = { ...cellStyle(i) };
            if (isHop) {
              const f = def.coord(hop!.move.from);
              const tgt = def.coord(i);
              (style as Record<string, string | number>)['--hop-dx'] = `${(f.gx - tgt.gx) * 100}%`;
              (style as Record<string, string | number>)['--hop-dy'] = `${(f.gy - tgt.gy) * 100}%`;
            }
            if (isDragged) {
              (style as Record<string, string | number>)['--drag-x'] = `${drag!.dx}px`;
              (style as Record<string, string | number>)['--drag-y'] = `${drag!.dy}px`;
            }
            return (
              <div
                key={isHop ? `p${i}-${hop!.id}` : `p${i}`}
                className={[
                  'peg',
                  selected === i ? 'selected' : '',
                  isHop ? 'hop' : '',
                  isDragged ? 'dragging' : '',
                  shake === i ? 'shake' : '',
                  hintMove?.from === i ? 'hint-from' : '',
                  won && count === 1 ? 'win' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={style}
              >
                <span className="peg-cap" />
              </div>
            );
          })}

          {/* jumped peg popping out */}
          {pop && (
            <div key={`pop${pop.id}`} className="peg peg-pop" style={cellStyle(pop.hole)}>
              <span className="peg-cap" />
            </div>
          )}

          {/* ghost hint arrow */}
          {hintMove && (
            <svg
              className="peg-hint-arrow"
              viewBox={`0 0 ${def.spanX} ${def.spanY}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <line
                x1={def.coord(hintMove.from).gx + 0.5}
                y1={def.coord(hintMove.from).gy + 0.5}
                x2={def.coord(hintMove.to).gx + 0.5}
                y2={def.coord(hintMove.to).gy + 0.5}
              />
              <circle cx={def.coord(hintMove.to).gx + 0.5} cy={def.coord(hintMove.to).gy + 0.5} r={0.16} />
            </svg>
          )}

          {won && count === 1 && (
            <div className="peg-burst" aria-hidden>
              {Array.from({ length: 14 }, (_, k) => (
                <span key={k} className={`peg-spark s${k % 7}`} style={{ '--i': k } as CSSProperties} />
              ))}
            </div>
          )}

          {stuck && !won && (
            <div className="peg-stuck">
              <div className="peg-stuck-card fx-card">
                <span className="peg-stuck-title">{requireCenter && count === 1 ? 'So close' : 'Stuck'}</span>
                <span className="peg-stuck-sub">
                  {requireCenter && count === 1 ? (
                    <>
                      One peg left, but not on the centre. Take moves back to route it home, or start the board
                      over.
                    </>
                  ) : (
                    <>
                      No jumps left with <b>{count}</b> {count === 1 ? 'peg' : 'pegs'}. Take a move back or start
                      the board over.
                    </>
                  )}
                </span>
                <div className="peg-stuck-actions">
                  {assists.undo && history.length > 0 && (
                    <button className="ghost-btn" onClick={undo}>
                      Undo
                    </button>
                  )}
                  <button className="ghost-btn" onClick={restart}>
                    Restart
                  </button>
                  <button className="danger-btn" onClick={giveUp}>
                    Give up
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="pegsol-tools">
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={history.length === 0 || done.current}>
              <UndoGlyph />
              <span>Undo</span>
            </PadTool>
          )}
          {assists.hint && (
            <PadTool silent onClick={useHint} disabled={done.current || stuck}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool onClick={restart} disabled={done.current}>
            <RestartIcon />
            <span>Restart</span>
          </PadTool>
        </div>
        <p className="pegsol-hint-text">Tap a peg then a lit hole to jump — or drag it across. Leave one peg to win.</p>
      </div>
    </div>
  );
}
