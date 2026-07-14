import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BackIcon, BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generateGridlock,
  nextBestMove,
  slideRange,
  startPositions,
  SIZE,
  EXIT_ROW,
  type GridlockPuzzle,
  type Piece
} from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BONUS = 400;
const EFFICIENCY = 600;
const HINT_PENALTY = 60;

/** content-palette slots for the traffic cars (skip 2=red hero, 9=white). */
const CAR_SLOTS = [4, 7, 1, 5, 6, 10, 8, 11, 13, 12, 16, 15, 14];

interface Snapshot {
  puzzle: GridlockPuzzle;
  pos: number[];
  moves: number;
  history: { id: number; from: number }[];
  hintsUsed: number;
  assistsUsed: string[];
}

const isSnapshot = (s: unknown): s is Snapshot =>
  !!s && Array.isArray((s as Snapshot).pos) && Array.isArray((s as Snapshot).puzzle?.pieces);

export function GridlockGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = isSnapshot(savedState) ? savedState : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateGridlock({ difficulty }), [difficulty]);
  const pieces = puzzle.pieces;
  const redId = puzzle.redId;
  const redLen = pieces[redId].len;
  const winPos = SIZE - redLen;

  const [pos, setPos] = useState<number[]>(() =>
    saved ? [...saved.pos] : startPositions(pieces)
  );
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [score, setScore] = useState(0);
  const [driving, setDriving] = useState(false);
  const [hint, setHint] = useState<{ id: number; toPos: number } | null>(null);
  const [liftId, setLiftId] = useState<number | null>(null);

  // synchronous mirrors so pointer handlers read fresh values
  const posRef = useRef(pos);
  posRef.current = pos;
  const movesRef = useRef(moves);
  movesRef.current = moves;
  const historyRef = useRef<{ id: number; from: number }[]>(saved?.history ? [...saved.history] : []);
  const done = useRef(false);
  const driveTimer = useRef<number | undefined>(undefined);
  const boardRef = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.moveCount ? ['moveCount'] : [])])
  );

  const dragRef = useRef<{
    id: number;
    pointerId: number;
    startCoord: number;
    pitch: number;
    lo: number;
    hi: number;
    cur: number;
    axis: 'x' | 'y';
    el: HTMLElement;
  } | null>(null);

  // passive assist: counts as help whenever the live counter is enabled
  useEffect(() => {
    if (assists.moveCount) assistsUsed.current.add('moveCount');
  }, [assists.moveCount]);

  // never let the win animation's timer fire after unmount (quit mid-drive)
  useEffect(() => () => window.clearTimeout(driveTimer.current), []);

  useEffect(() => {
    events.onStats({
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves, minMoves: puzzle.minMoves }
    });
  }, [score, hintsUsed, moves, puzzle.minMoves, events]);

  const finish = useCallback(
    (finalMoves: number, hints: number) => {
      if (done.current) return;
      done.current = true;
      const base = WIN_BONUS * MULT[difficulty];
      const eff = Math.round(EFFICIENCY * MULT[difficulty] * (puzzle.minMoves / Math.max(1, finalMoves)));
      const final = Math.max(0, base + eff - hints * HINT_PENALTY);
      setScore(final);
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: 0,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: finalMoves, minMoves: puzzle.minMoves }
      });
    },
    [difficulty, puzzle.minMoves, events]
  );

  const commitMove = useCallback(
    (id: number, newPos: number) => {
      const from = posRef.current[id];
      if (newPos === from) return;
      const next = posRef.current.slice();
      next[id] = newPos;
      posRef.current = next;
      setPos(next);
      historyRef.current = [...historyRef.current, { id, from }];
      movesRef.current += 1;
      setMoves(movesRef.current);
      setHint(null);
      if (id === redId && newPos === winPos) {
        // red reaches the exit → drive it off and win
        setDriving(true);
        sfx.place();
        const fm = movesRef.current;
        const h = hintsUsed;
        driveTimer.current = window.setTimeout(() => finish(fm, h), 620);
      } else {
        sfx.place();
      }
    },
    [redId, winPos, hintsUsed, finish]
  );

  const onPointerDown = (e: React.PointerEvent, id: number) => {
    if (paused || done.current || driving) return;
    e.preventDefault();
    const board = boardRef.current;
    if (!board) return;
    const piece = pieces[id];
    const pitch = board.getBoundingClientRect().width / SIZE;
    const [lo, hi] = slideRange(pieces, posRef.current, id);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startCoord: piece.orient === 'h' ? e.clientX : e.clientY,
      pitch,
      lo,
      hi,
      cur: posRef.current[id],
      axis: piece.orient === 'h' ? 'x' : 'y',
      el
    };
    setLiftId(id);
    if (hint?.id === id) setHint(null);
    sfx.tap();
  };

  const clampDelta = (dr: NonNullable<typeof dragRef.current>, raw: number) => {
    const minPx = (dr.lo - dr.cur) * dr.pitch;
    const maxPx = (dr.hi - dr.cur) * dr.pitch;
    return Math.max(minPx, Math.min(maxPx, raw));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dr = dragRef.current;
    if (!dr || dr.pointerId !== e.pointerId) return;
    const coord = dr.axis === 'x' ? e.clientX : e.clientY;
    const delta = clampDelta(dr, coord - dr.startCoord);
    dr.el.style.transform = dr.axis === 'x' ? `translateX(${delta}px)` : `translateY(${delta}px)`;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const dr = dragRef.current;
    if (!dr || dr.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setLiftId(null);
    dr.el.style.transform = '';
    if (paused || done.current) return; // paused mid-drag → abandon the slide
    const coord = dr.axis === 'x' ? e.clientX : e.clientY;
    const delta = clampDelta(dr, coord - dr.startCoord);
    const newPos = Math.max(dr.lo, Math.min(dr.hi, Math.round(dr.cur + delta / dr.pitch)));
    commitMove(dr.id, newPos);
  };

  const undo = () => {
    if (paused || done.current || driving || !assists.undo) return;
    const hist = historyRef.current;
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    historyRef.current = hist.slice(0, -1);
    const next = posRef.current.slice();
    next[last.id] = last.from;
    posRef.current = next;
    setPos(next);
    movesRef.current = Math.max(0, movesRef.current - 1);
    setMoves(movesRef.current);
    assistsUsed.current.add('undo');
    setHint(null);
    sfx.pop();
  };

  const restart = () => {
    if (done.current || driving) return;
    const fresh = startPositions(pieces);
    posRef.current = fresh;
    setPos(fresh);
    historyRef.current = [];
    movesRef.current = 0;
    setMoves(0);
    setHint(null);
  };

  const useHint = () => {
    if (paused || done.current || driving || !assists.hint) return;
    const move = nextBestMove(pieces, posRef.current, redId);
    if (!move) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setHint({ id: move.pieceId, toPos: move.toPos });
    sfx.hint();
  };

  useEffect(() => {
    registerSnapshot(
      (): Snapshot => ({
        puzzle,
        pos,
        moves,
        history: historyRef.current,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const footprint = (piece: Piece, p: number): CSSProperties => {
    const G = 0.06; // gap around each car, in cell fractions
    const col = piece.orient === 'h' ? p : piece.col;
    const row = piece.orient === 'h' ? piece.row : p;
    const w = piece.orient === 'h' ? piece.len : 1;
    const h = piece.orient === 'v' ? piece.len : 1;
    return {
      left: `${((col + G) / SIZE) * 100}%`,
      top: `${((row + G) / SIZE) * 100}%`,
      width: `${((w - 2 * G) / SIZE) * 100}%`,
      height: `${((h - 2 * G) / SIZE) * 100}%`
    };
  };

  const cars = useMemo(() => pieces.map((p, i) => ({ piece: p, slot: CAR_SLOTS[(i - 1 + CAR_SLOTS.length) % CAR_SLOTS.length] })), [pieces]);

  // the exit glows once the red car's lane to the gap is clear
  const canExit = slideRange(pieces, pos, redId)[1] === winPos;

  return (
    <div className={`grd ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info grd-info">
        <span className="info-item">
          Moves: <b>{moves}</b>
        </span>
        {assists.moveCount && (
          <span className={`info-item ${moves > puzzle.minMoves ? '' : 'good-par'}`}>
            Par: <b>{puzzle.minMoves}</b>
          </span>
        )}
      </div>

      <div
        ref={boardRef}
        className="grd-board"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* road grid */}
        {Array.from({ length: SIZE * SIZE }, (_, i) => (
          <span
            key={i}
            className={`grd-cell ${Math.floor(i / SIZE) === EXIT_ROW ? 'exit-row' : ''}`}
          />
        ))}

        {/* exit gap on the right edge of the exit row */}
        <span
          className={`grd-exit ${canExit ? 'open' : ''}`}
          style={{ top: `${(EXIT_ROW / SIZE) * 100}%`, height: `${(1 / SIZE) * 100}%` }}
          aria-hidden
        />

        {/* hint ghost: where the suggested car should slide to */}
        {hint && (
          <span
            className="grd-ghost"
            style={footprint(pieces[hint.id], hint.toPos)}
            aria-hidden
          />
        )}

        {/* the cars */}
        {cars.map(({ piece, slot }) => {
          const isRed = piece.id === redId;
          return (
            <div
              key={piece.id}
              className={[
                'grd-piece',
                piece.orient === 'h' ? 'h' : 'v',
                isRed ? 'target' : `grd-c${slot}`,
                liftId === piece.id ? 'lift' : '',
                hint?.id === piece.id ? 'hinted' : '',
                isRed && driving ? 'driving' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={footprint(piece, pos[piece.id])}
              onPointerDown={(e) => onPointerDown(e, piece.id)}
            >
              <span className="grd-cabin" />
              {isRed && <span className="grd-shine" />}
            </div>
          );
        })}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={moves === 0} aria-label="Undo last slide">
              <BackIcon />
              <span>Undo</span>
            </PadTool>
          )}
          {assists.hint && (
            <PadTool silent onClick={useHint} aria-label="Show a hint">
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool onClick={restart} aria-label="Restart puzzle">
            <RestartIcon />
            <span>Restart</span>
          </PadTool>
        </div>
      </div>
    </div>
  );
}
