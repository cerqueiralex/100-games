import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, EyeIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generatePuzzle,
  traceBeam,
  gridFromOrients,
  type Orient,
  type Puzzle
} from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 60, medium: 120, hard: 200, pro: 260, extreme: 340 };
const WIN_BASE = 400;
const HINT_PENALTY = 60;

interface LmSave {
  puzzle: Puzzle;
  orients: (Orient | null)[];
  loose: boolean[];
  trayCount: number;
  rotations: number;
  hintsUsed: number;
  assistsUsed: string[];
}

const isSave = (s: unknown): s is LmSave =>
  !!s && typeof s === 'object' && Array.isArray((s as LmSave).orients) && !!(s as LmSave).puzzle;

interface Drag {
  orient: Orient;
  from: 'tray' | number;
  x: number;
  y: number;
}

export function LaserMirrorsGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = isSave(savedState) ? savedState : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo<Puzzle>(() => saved?.puzzle ?? generatePuzzle({ difficulty }), [difficulty]);
  const { rows, cols, source } = puzzle;
  const n = rows * cols;

  const wallSet = useMemo(() => new Set(puzzle.walls), [puzzle]);
  const targetSet = useMemo(() => new Set(puzzle.targets), [puzzle]);
  const solutionMirrors = puzzle.solutionMirrors;

  const [orients, setOrients] = useState<(Orient | null)[]>(() => {
    if (saved) return saved.orients.slice();
    const arr = new Array<Orient | null>(n).fill(null);
    for (const m of puzzle.fixedMirrors) arr[m.cell] = m.orient;
    return arr;
  });
  const [loose, setLoose] = useState<boolean[]>(() => (saved ? saved.loose.slice() : new Array<boolean>(n).fill(false)));
  const [trayCount, setTrayCount] = useState(saved?.trayCount ?? puzzle.trayCount);
  const [rotations, setRotations] = useState(saved?.rotations ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [fired, setFired] = useState(false);
  const [won, setWon] = useState(false);
  const [drag, setDragState] = useState<Drag | null>(null);

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ cell: number; loose: boolean; x: number; y: number; dragging: boolean } | null>(null);
  const trayDragging = useRef(false);
  // synchronous mirror of `drag` so pointer-up can resolve the drop WITHOUT a
  // side effect inside a setState updater (StrictMode double-invokes those)
  const dragRef = useRef<Drag | null>(null);
  const beginDrag = (d: Drag) => {
    dragRef.current = d;
    setDragState(d);
  };
  const moveDrag = (x: number, y: number) => {
    const d = dragRef.current;
    if (!d) return;
    const nd = { ...d, x, y };
    dragRef.current = nd;
    setDragState(nd);
  };
  const endDrag = (): Drag | null => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragState(null);
    return d;
  };
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.beamAlways ? ['beamAlways'] : []),
      ...(assists.targetGlow ? ['targetGlow'] : [])
    ])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assists count as help whenever enabled (including mid-game)
  useEffect(() => {
    if (assists.beamAlways) assistsUsed.current.add('beamAlways');
  }, [assists.beamAlways]);
  useEffect(() => {
    if (assists.targetGlow) assistsUsed.current.add('targetGlow');
  }, [assists.targetGlow]);

  const trace = useMemo(() => traceBeam(gridFromOrients(puzzle, orients), source), [puzzle, orients, source]);
  const litSet = useMemo(() => new Set(trace.targetsHit), [trace]);
  const total = puzzle.targets.length;
  const lit = litSet.size;

  const liveScore = won ? 0 : Math.round((lit / total) * WIN_BASE * MULT[difficulty]);

  useEffect(() => {
    if (done.current) return;
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { lit, targets: total, rotations, mirrors: solutionMirrors.length }
    });
  }, [liveScore, hintsUsed, lit, total, rotations, solutionMirrors.length, events]);

  const finishWin = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setWon(true);
    const mult = MULT[difficulty];
    const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult * 2;
    const parRot = solutionMirrors.length * 3;
    const effBonus = Math.max(0, parRot - rotations) * 12 * mult;
    const score = Math.max(0, WIN_BASE * mult + timeBonus + effBonus - hintsUsed * HINT_PENALTY);
    events.onFinish({
      outcome: 'won',
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { targets: total, rotations, timeMs: Math.round(elapsedRef.current * 1000), mirrors: solutionMirrors.length }
    });
  }, [difficulty, rotations, hintsUsed, solutionMirrors.length, total, events]);

  useEffect(() => {
    if (trace.hitAll && !done.current) finishWin();
  }, [trace.hitAll, finishWin]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      orients,
      loose,
      trayCount,
      rotations,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // ---- interaction helpers -------------------------------------------------

  const bump = useCallback(() => setFired(false), []);

  const cellFromPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      const c = Math.floor(x / (rect.width / cols));
      const r = Math.floor(y / (rect.height / rows));
      if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
      return r * cols + c;
    },
    [cols, rows]
  );

  const rotateMirror = useCallback(
    (cell: number) => {
      setOrients((o) => {
        if (o[cell] == null) return o;
        const next = o.slice();
        next[cell] = o[cell] === '/' ? '\\' : '/';
        return next;
      });
      setRotations((r) => r + 1);
      sfx.tap();
      bump();
    },
    [bump]
  );

  const dropDrag = useCallback(
    (cur: Drag, clientX: number, clientY: number) => {
      const cell = cellFromPoint(clientX, clientY);
      const droppable =
        cell !== null &&
        orients[cell] == null &&
        !wallSet.has(cell) &&
        !targetSet.has(cell) &&
        cell !== source.cell;
      if (droppable && cell !== null) {
        setOrients((o) => {
          const next = o.slice();
          next[cell] = cur.orient;
          return next;
        });
        setLoose((l) => {
          const next = l.slice();
          next[cell] = true;
          return next;
        });
        if (cur.from === 'tray') setTrayCount((t) => t - 1);
        sfx.place();
      } else {
        // invalid drop → return to tray (a lifted board mirror grows the tray)
        if (cur.from !== 'tray') setTrayCount((t) => t + 1);
        sfx.tap();
      }
      bump();
    },
    [cellFromPoint, orients, wallSet, targetSet, source.cell, bump]
  );

  // board pointer (rotate fixed mirrors · lift loose mirrors)
  const onBoardDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null || orients[cell] == null) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    press.current = { cell, loose: loose[cell], x: e.clientX, y: e.clientY, dragging: false };
  };
  const onBoardMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      if (!p.loose) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 7) return;
      p.dragging = true;
      const o = orients[p.cell];
      if (o == null) return;
      // lift the loose mirror into the hand
      setOrients((arr) => {
        const next = arr.slice();
        next[p.cell] = null;
        return next;
      });
      setLoose((arr) => {
        const next = arr.slice();
        next[p.cell] = false;
        return next;
      });
      beginDrag({ orient: o, from: p.cell, x: e.clientX, y: e.clientY });
    } else {
      moveDrag(e.clientX, e.clientY);
    }
  };
  const onBoardUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (p.dragging) {
      const cur = endDrag();
      if (cur) dropDrag(cur, e.clientX, e.clientY);
    } else {
      rotateMirror(p.cell);
    }
  };

  // tray pointer (drag a fresh loose mirror out of the tray)
  const onTrayDown = (e: React.PointerEvent) => {
    if (paused || done.current || trayCount <= 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    trayDragging.current = true;
    beginDrag({ orient: '\\', from: 'tray', x: e.clientX, y: e.clientY });
  };
  const onTrayMove = (e: React.PointerEvent) => {
    if (!trayDragging.current) return;
    moveDrag(e.clientX, e.clientY);
  };
  const onTrayUp = (e: React.PointerEvent) => {
    if (!trayDragging.current) return;
    trayDragging.current = false;
    const cur = endDrag();
    if (cur) dropDrag(cur, e.clientX, e.clientY);
  };

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    let fix: { type: 'rotate' | 'place'; cell: number; orient: Orient } | null = null;
    for (const m of solutionMirrors) {
      const cur = orients[m.cell];
      if (cur != null && cur !== m.orient) {
        fix = { type: 'rotate', cell: m.cell, orient: m.orient };
        break;
      }
    }
    if (!fix) {
      for (const m of solutionMirrors) {
        if (orients[m.cell] == null) {
          fix = { type: 'place', cell: m.cell, orient: m.orient };
          break;
        }
      }
    }
    if (!fix) return;
    const f = fix;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();

    if (f.type === 'place') {
      // supply a mirror: prefer the tray, else move a misplaced loose one
      if (trayCount > 0) {
        setTrayCount((t) => t - 1);
      } else {
        const solCells = new Set(solutionMirrors.map((s) => s.cell));
        const stray = loose.findIndex((ls, idx) => ls && !solCells.has(idx) && idx !== f.cell);
        if (stray !== -1) {
          setOrients((o) => {
            const next = o.slice();
            next[stray] = null;
            return next;
          });
          setLoose((l) => {
            const next = l.slice();
            next[stray] = false;
            return next;
          });
        }
      }
      setLoose((l) => {
        const next = l.slice();
        next[f.cell] = true;
        return next;
      });
    }
    setOrients((o) => {
      const next = o.slice();
      next[f.cell] = f.orient;
      return next;
    });
    bump();
  };

  const showBeam = assists.beamAlways || fired || won;
  const pointsSig = trace.points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

  const dirClass = `dir-${source.dir}`;
  const bottomCard = assists.hint || !assists.beamAlways || puzzle.mode === 'place';

  return (
    <div className={`laser-mirrors ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Beam:{' '}
          <b>
            {solutionMirrors.length} {solutionMirrors.length === 1 ? 'mirror' : 'mirrors'}
          </b>
        </span>
        <span className={`lm-lit ${lit === total ? 'all' : ''}`}>
          {lit} / {total} lit
        </span>
        <span className="info-item">
          Turns: <b>{rotations}</b>
        </span>
      </div>

      <div
        ref={boardRef}
        className={`lm-board ${won ? 'won' : ''}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}
        onPointerDown={onBoardDown}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        onPointerCancel={onBoardUp}
      >
        {Array.from({ length: n }, (_, i) => {
          const o = orients[i];
          const isSource = i === source.cell;
          const isWall = wallSet.has(i);
          const isTarget = targetSet.has(i);
          const isLit = litSet.has(i);
          return (
            <div key={i} className="lm-cell">
              {isSource && (
                <div className={`lm-src ${dirClass}`} aria-label="Laser source">
                  <span className="lm-src-core" />
                  <span className="lm-src-nub" />
                </div>
              )}
              {isWall && <div className="lm-tile lm-wall" aria-label="Wall" />}
              {isTarget && (
                <div
                  className={`lm-target ${isLit ? 'lit' : assists.targetGlow ? 'glow' : ''}`}
                  aria-label={isLit ? 'Target lit' : 'Target'}
                >
                  <span className="lm-target-ring" />
                  <span className="lm-target-core" />
                </div>
              )}
              {o && (
                <div className={`lm-tile lm-mirror ${loose[i] ? 'loose' : ''}`} aria-label={`Mirror ${o}`}>
                  <span className={`lm-bar ${o === '\\' ? 'o-back' : 'o-fwd'}`} />
                </div>
              )}
            </div>
          );
        })}

        {showBeam && trace.points.length >= 2 && (
          <svg
            className={`lm-beam ${trace.hitAll ? 'all-lit' : ''}`}
            viewBox={`0 0 ${cols} ${rows}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <g key={pointsSig}>
              <polyline className="lm-ray-glow" points={pointsSig} />
              <polyline className="lm-ray-core" points={pointsSig} pathLength={1} />
              <polyline className="lm-ray-flow" points={pointsSig} />
            </g>
          </svg>
        )}
      </div>

      {drag && (
        <div className="lm-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <div className="lm-tile lm-mirror loose">
            <span className={`lm-bar ${drag.orient === '\\' ? 'o-back' : 'o-fwd'}`} />
          </div>
        </div>
      )}

      {bottomCard && (
        <div className="game-tools fx-card">
          {(assists.hint || !assists.beamAlways) && (
            <div className="sudoku-controls">
              {assists.hint && (
                <PadTool silent onClick={useHint}>
                  <BulbIcon />
                  <span>Hint</span>
                </PadTool>
              )}
              {!assists.beamAlways && (
                <PadTool active={fired} onClick={() => setFired(true)}>
                  <EyeIcon />
                  <span>Fire beam</span>
                </PadTool>
              )}
            </div>
          )}
          {puzzle.mode === 'place' && (
            <div className="lm-tray-row">
              <div
                className={`lm-tray ${trayCount <= 0 ? 'empty' : ''}`}
                onPointerDown={onTrayDown}
                onPointerMove={onTrayMove}
                onPointerUp={onTrayUp}
                onPointerCancel={onTrayUp}
              >
                {trayCount > 0 ? (
                  Array.from({ length: trayCount }, (_, k) => (
                    <div key={k} className="lm-tray-mirror" aria-label="Loose mirror">
                      <span className="lm-bar o-back" />
                    </div>
                  ))
                ) : (
                  <span className="lm-tray-empty">Tray empty</span>
                )}
              </div>
              <p className="lm-hint-text">Drag a mirror onto an empty cell · tap any mirror to rotate</p>
            </div>
          )}
          {puzzle.mode !== 'place' && (
            <p className="lm-hint-text">Tap a mirror to flip it between / and \</p>
          )}
        </div>
      )}
    </div>
  );
}
