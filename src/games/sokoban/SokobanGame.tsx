import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, DpadArrowIcon, RestartIcon, UndoIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { DOWN, LEFT, RIGHT, UP, isSolved, tryMove, type SokobanPuzzle } from './logic/engine';
import { generateSokoban } from './logic/generator';
import { computeDeadSquares, deadlockedCrates, hintNextMove } from './logic/solver';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const HINT_BUDGET = 90000;

interface HistoryEntry {
  player: number;
  crates: number[];
  pushed: boolean;
}

interface SokSave {
  puzzle: SokobanPuzzle;
  crates: number[];
  player: number;
  history: HistoryEntry[];
  pushes: number;
  restarts: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** A curved back-arrow — the platform has no dedicated "undo" glyph. */

/** The pusher: a rounded character whose eyes look the way it last moved. */
function Pusher({ dir }: { dir: number }) {
  const ex = dir === LEFT ? -2.2 : dir === RIGHT ? 2.2 : 0;
  const ey = dir === UP ? -1.8 : dir === DOWN ? 1.8 : 0;
  return (
    <svg viewBox="0 0 40 40" className="sok-pusher" aria-hidden>
      <rect x="7" y="9" width="26" height="26" rx="10" className="sok-pusher-edge" />
      <rect x="7" y="7" width="26" height="26" rx="10" className="sok-pusher-body" />
      <g className="sok-pusher-face" transform={`translate(${ex} ${ey})`}>
        <circle cx="15.5" cy="19" r="2.4" className="sok-pusher-eye" />
        <circle cx="24.5" cy="19" r="2.4" className="sok-pusher-eye" />
      </g>
    </svg>
  );
}

export function SokobanGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved =
    savedState && Array.isArray((savedState as SokSave).crates) && (savedState as SokSave).puzzle?.walls
      ? (savedState as SokSave)
      : undefined;

  const puzzle = useMemo(
    () => saved?.puzzle ?? generateSokoban({ difficulty }),
    // regenerate only on remount (the shell changes `key` for a new game)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const targetSet = useMemo(() => new Set(puzzle.targets), [puzzle]);
  const deadSquares = useMemo(() => computeDeadSquares(puzzle), [puzzle]);

  const [crates, setCrates] = useState<number[]>(() => saved?.crates ?? puzzle.crates.slice());
  const [player, setPlayer] = useState<number>(() => saved?.player ?? puzzle.player);
  const [pushes, setPushes] = useState<number>(() => saved?.pushes ?? 0);
  const [restarts, setRestarts] = useState<number>(() => saved?.restarts ?? 0);
  const [hintsUsed, setHintsUsed] = useState<number>(() => saved?.hintsUsed ?? 0);
  const [historyLen, setHistoryLen] = useState<number>(() => saved?.history?.length ?? 0);
  const [lastDir, setLastDir] = useState<number>(DOWN);
  const [hint, setHint] = useState<{ cell: number; dir: number } | null>(null);
  const [won, setWon] = useState(false);

  const done = useRef(false);
  const historyRef = useRef<HistoryEntry[]>(saved?.history ? saved.history.map((h) => ({ ...h })) : []);
  const playerRef = useRef(player);
  const cratesRef = useRef(crates);
  const pushesRef = useRef(pushes);
  const hintTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.deadlockWarn ? ['deadlockWarn'] : [])])
  );

  // pointer-drag bookkeeping
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const stepPx = useRef(24);

  const cols = puzzle.width;
  const rows = puzzle.height;
  const parPushes = puzzle.parPushes;

  // passive assist counts as help whenever enabled, incl. mid-game toggle-on
  useEffect(() => {
    if (assists.deadlockWarn) assistsUsed.current.add('deadlockWarn');
  }, [assists.deadlockWarn]);

  const onTarget = useMemo(() => crates.filter((c) => targetSet.has(c)).length, [crates, targetSet]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const mult = MULT[difficulty];
    const finalPushes = pushesRef.current;
    const eff = Math.min(1.5, parPushes / Math.max(1, finalPushes));
    const efficiencyBonus = Math.round(300 * mult * eff);
    const score = Math.max(
      50,
      400 * mult + efficiencyBonus - hintsUsed * 40 - restarts * 20
    );
    setWon(true);
    events.onFinish({
      outcome: 'won',
      score,
      errors: restarts,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves: historyRef.current.length, pushes: finalPushes, par: parPushes }
    });
  }, [difficulty, parPushes, hintsUsed, restarts, events]);

  const doMove = useCallback(
    (dir: number): boolean => {
      if (paused || done.current) return false;
      const from = playerRef.current;
      const crs = cratesRef.current;
      const res = tryMove(puzzle, crs, from, dir);
      if (!res) return false;

      historyRef.current.push({ player: from, crates: crs, pushed: res.pushed });
      playerRef.current = res.player;
      cratesRef.current = res.crates;
      setPlayer(res.player);
      setCrates(res.crates);
      setLastDir(dir);
      setHint(null);
      setHistoryLen(historyRef.current.length);
      if (res.pushed) {
        pushesRef.current += 1;
        setPushes(pushesRef.current);
        sfx.place();
      } else {
        sfx.drag();
      }
      if (isSolved(res.crates, puzzle.targets)) finish();
      return true;
    },
    [paused, puzzle, finish]
  );

  const undo = useCallback(() => {
    if (paused || done.current) return;
    const h = historyRef.current;
    if (h.length === 0) return;
    const e = h.pop()!;
    playerRef.current = e.player;
    cratesRef.current = e.crates;
    setPlayer(e.player);
    setCrates(e.crates);
    setHistoryLen(h.length);
    setHint(null);
    if (e.pushed) {
      pushesRef.current = Math.max(0, pushesRef.current - 1);
      setPushes(pushesRef.current);
    }
    assistsUsed.current.add('undo');
    sfx.drag();
  }, [paused]);

  const restart = useCallback(() => {
    if (done.current) return;
    historyRef.current = [];
    playerRef.current = puzzle.player;
    cratesRef.current = puzzle.crates.slice();
    pushesRef.current = 0;
    setPlayer(puzzle.player);
    setCrates(puzzle.crates.slice());
    setPushes(0);
    setHistoryLen(0);
    setHint(null);
    setRestarts((r) => r + 1);
  }, [puzzle]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const dir = hintNextMove(puzzle, cratesRef.current, playerRef.current, HINT_BUDGET);
    if (dir === null) {
      sfx.error();
      return;
    }
    assistsUsed.current.add('hint');
    setHintsUsed((n) => n + 1);
    setHint({ cell: playerRef.current, dir });
    sfx.hint();
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 2600);
  }, [paused, assists.hint, puzzle]);

  // keyboard: arrows + WASD
  useEffect(() => {
    const map: Record<string, number> = {
      ArrowUp: UP,
      ArrowDown: DOWN,
      ArrowLeft: LEFT,
      ArrowRight: RIGHT,
      w: UP,
      s: DOWN,
      a: LEFT,
      d: RIGHT,
      W: UP,
      S: DOWN,
      A: LEFT,
      D: RIGHT
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = map[e.key];
      if (dir === undefined) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // clearing the hint flash on pause so it doesn't burn away off-screen
  useEffect(() => {
    if (paused) {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      setHint(null);
    }
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [paused]);

  useEffect(() => {
    events.onStats({
      score: 0,
      errors: restarts,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves: historyLen, pushes, par: parPushes }
    });
  }, [historyLen, pushes, restarts, hintsUsed, parPushes, events]);

  useEffect(() => {
    registerSnapshot(() =>
      done.current
        ? null
        : ({
            puzzle,
            crates: cratesRef.current,
            player: playerRef.current,
            history: historyRef.current.slice(-300),
            pushes: pushesRef.current,
            restarts,
            hintsUsed,
            assistsUsed: [...assistsUsed.current]
          } satisfies SokSave)
    );
  });

  /* ----- pointer drag: dominant-axis stepping, rect-math (no elementFromPoint) ----- */
  const onDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) stepPx.current = Math.max(16, (rect.width / cols) * 0.55);
    dragging.current = true;
    lastPt.current = { x: e.clientX, y: e.clientY };
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const s = stepPx.current;
    let guard = 0;
    while (guard++ < 8) {
      const dx = e.clientX - lastPt.current.x;
      const dy = e.clientY - lastPt.current.y;
      if (Math.abs(dx) < s && Math.abs(dy) < s) break;
      if (Math.abs(dx) >= Math.abs(dy)) {
        doMove(dx > 0 ? RIGHT : LEFT);
        lastPt.current.x += Math.sign(dx) * s;
      } else {
        doMove(dy > 0 ? DOWN : UP);
        lastPt.current.y += Math.sign(dy) * s;
      }
    }
  };
  const onUp = () => {
    dragging.current = false;
  };

  const deadCrates = useMemo(
    () => (assists.deadlockWarn && !won ? new Set(deadlockedCrates(puzzle, crates, deadSquares)) : new Set<number>()),
    [assists.deadlockWarn, won, puzzle, crates, deadSquares]
  );

  const spriteStyle = (cell: number): CSSProperties =>
    ({ '--c': cell % cols, '--r': Math.floor(cell / cols) } as CSSProperties);

  const dirClass = ['up', 'down', 'left', 'right'][hint?.dir ?? DOWN];

  return (
    <div className={`sokoban ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Moves: <b>{historyLen}</b>
        </span>
        <span className={`info-item ${pushes > parPushes ? 'over-par' : ''}`}>
          Pushes: <b>{pushes}</b> / {parPushes}
        </span>
        <span className="info-item">
          On goal: <b>{onTarget}</b>/{crates.length}
        </span>
      </div>

      <div className="sok-board-wrap">
        <div
          ref={boardRef}
          className={`sok-board ${won ? 'won' : ''}`}
          style={{ aspectRatio: `${cols} / ${rows}`, '--cols': cols, '--rows': rows } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="grid"
          aria-label="Sokoban board"
        >
          <div className="sok-grid">
            {Array.from({ length: cols * rows }, (_, i) => (
              <div key={i} className={`sok-tile ${puzzle.walls[i] ? 'wall' : 'floor'}`}>
                {targetSet.has(i) && <span className="sok-pip" />}
              </div>
            ))}
          </div>

          {crates.map((cell, i) => {
            const goal = targetSet.has(cell);
            return (
              <div
                key={i}
                className={`sok-crate ${goal ? 'on-target' : ''} ${deadCrates.has(cell) ? 'deadlocked' : ''}`}
                style={spriteStyle(cell)}
              >
                <span className="sok-crate-face" />
                {goal && (
                  <svg viewBox="0 0 24 24" className="sok-crate-check" aria-hidden>
                    <path
                      d="M5 12.5 10 17 19 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            );
          })}

          <div className="sok-player" style={spriteStyle(player)}>
            <Pusher dir={lastDir} />
          </div>

          {hint && (
            <div className={`sok-ghost ${dirClass}`} style={spriteStyle(hint.cell)} aria-hidden>
              <DpadArrowIcon size={24} />
            </div>
          )}

          {won && (
            <div className="sok-burst" aria-hidden>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className="sok-spark" style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={historyLen === 0 || won}>
              <UndoIcon />
              <span>Undo</span>
            </PadTool>
          )}
          <PadTool onClick={restart} disabled={won}>
            <RestartIcon />
            <span>Restart</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint} disabled={won}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>

        <div className="sok-dpad" role="group" aria-label="Move">
          <PadTool className="sok-dbtn up" silent onClick={() => doMove(UP)} disabled={won} aria-label="Up">
            <DpadArrowIcon />
          </PadTool>
          <PadTool className="sok-dbtn left" silent onClick={() => doMove(LEFT)} disabled={won} aria-label="Left">
            <DpadArrowIcon />
          </PadTool>
          <span className="sok-dhub" aria-hidden />
          <PadTool
            className="sok-dbtn right"
            silent
            onClick={() => doMove(RIGHT)}
            disabled={won}
            aria-label="Right"
          >
            <DpadArrowIcon />
          </PadTool>
          <PadTool
            className="sok-dbtn down"
            silent
            onClick={() => doMove(DOWN)}
            disabled={won}
            aria-label="Down"
          >
            <DpadArrowIcon />
          </PadTool>
        </div>
      </div>
    </div>
  );
}
