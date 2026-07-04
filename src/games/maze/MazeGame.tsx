import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, DpadArrowIcon, MoveIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';

const SIZE: Record<Difficulty, number> = { easy: 9, medium: 13, hard: 17 };
const PAR_SEC: Record<Difficulty, number> = { easy: 60, medium: 180, hard: 360 };

/** generation tuning: twistier corridors + best-of-N boards = harder mazes */
const GEN: Record<Difficulty, { turnBias: number; attempts: number }> = {
  easy: { turnBias: 0.2, attempts: 1 },
  medium: { turnBias: 0.55, attempts: 6 },
  hard: { turnBias: 0.75, attempts: 12 }
};

const CUSTOM_COLS = [9, 11, 13, 15];
const CUSTOM_ROWS = [15, 25, 40, 60, 90, 130];

// wall bits per cell
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [
  { bit: N, dr: -1, dc: 0, opp: S },
  { bit: E, dr: 0, dc: 1, opp: W },
  { bit: S, dr: 1, dc: 0, opp: N },
  { bit: W, dr: 0, dc: -1, opp: E }
];

interface MazeConfig {
  kind: 'classic' | 'custom';
  cols: number;
  rows: number;
}

interface Maze {
  cols: number;
  rows: number;
  walls: number[]; // bitmask per cell
  exit: number;
  par: number; // moves on the shortest path
  solution: number[]; // shortest path cell indices, start → exit
}

/** depth-first backtracker; turnBias > 0 prefers changing direction, which
    makes corridors twisty and boards much harder to read */
function carve(cols: number, rows: number, turnBias: number): number[] {
  const n = cols * rows;
  const walls = new Array<number>(n).fill(N | E | S | W);
  const visited = new Array<boolean>(n).fill(false);
  const stack: { cell: number; dir: number }[] = [{ cell: 0, dir: 0 }];
  visited[0] = true;
  while (stack.length) {
    const top = stack[stack.length - 1];
    const r = Math.floor(top.cell / cols);
    const c = top.cell % cols;
    const options = DIRS.filter(({ dr, dc }) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr * cols + nc];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    let pool = options;
    if (Math.random() < turnBias) {
      const turning = options.filter((d) => d.bit !== top.dir);
      if (turning.length) pool = turning;
    }
    const d = pool[Math.floor(Math.random() * pool.length)];
    const next = (r + d.dr) * cols + (c + d.dc);
    walls[top.cell] &= ~d.bit;
    walls[next] &= ~d.opp;
    visited[next] = true;
    stack.push({ cell: next, dir: d.bit });
  }
  return walls;
}

/** BFS from the start; the exit is the hardest-to-reach cell of the LAST
    row, so tall (custom) mazes always finish at the bottom edge */
function solve(walls: number[], cols: number, rows: number): { exit: number; solution: number[] } {
  const n = cols * rows;
  const prev = new Array<number>(n).fill(-1);
  const dist = new Array<number>(n).fill(-1);
  const queue = [0];
  dist[0] = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const r = Math.floor(cur / cols);
    const c = cur % cols;
    for (const d of DIRS) {
      if (walls[cur] & d.bit) continue;
      const nxt = (r + d.dr) * cols + (c + d.dc);
      if (dist[nxt] === -1) {
        dist[nxt] = dist[cur] + 1;
        prev[nxt] = cur;
        queue.push(nxt);
      }
    }
  }
  let exit = n - 1;
  for (let c = 0; c < cols; c++) {
    const cell = (rows - 1) * cols + c;
    if (dist[cell] > dist[exit]) exit = cell;
  }
  const solution: number[] = [];
  for (let at = exit; at !== -1; at = prev[at]) solution.unshift(at);
  return { exit, solution };
}

function generateMaze(cols: number, rows: number, turnBias: number, attempts: number): Maze {
  let best: Maze | null = null;
  for (let a = 0; a < attempts; a++) {
    const walls = carve(cols, rows, turnBias);
    const { exit, solution } = solve(walls, cols, rows);
    const maze: Maze = { cols, rows, walls, exit, par: solution.length - 1, solution };
    if (!best || maze.par > best.par) best = maze;
  }
  return best!;
}

interface MazeSave {
  config: MazeConfig;
  maze: Maze;
  pos: number;
  steps: number;
  path: number[]; // the trail: the simple path from the start to the player
  hintsUsed: number;
  assistsUsed: string[];
}

/** walking forward extends the trail; stepping back onto it erases the
    segment you came from, so the trail is always one connected line */
function stepTrail(p: number[], next: number): number[] {
  return p.length >= 2 && p[p.length - 2] === next ? p.slice(0, -1) : [...p, next];
}

/* ---------- SVG geometry (10 user-units per cell) ---------- */
const U = 10;
const cx = (cell: number, cols: number) => (cell % cols) * U + U / 2;
const cy = (cell: number, cols: number) => Math.floor(cell / cols) * U + U / 2;

export function MazeGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  // older saves (pre custom-size) stored maze.size — treat them as no save
  const saved =
    savedState && (savedState as MazeSave).maze?.cols ? (savedState as MazeSave) : undefined;

  const [config, setConfig] = useState<MazeConfig | null>(saved?.config ?? null);
  const [pickCols, setPickCols] = useState(11);
  const [pickRows, setPickRows] = useState(25);

  // the clock only runs once a maze is actually chosen — not on the menu
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  const maze = useMemo(() => {
    if (!config) return null;
    if (saved?.maze) return saved.maze;
    const gen = config.kind === 'classic' ? GEN[difficulty] : GEN.hard;
    // cap best-of attempts on huge custom boards
    const attempts =
      config.kind === 'classic'
        ? gen.attempts
        : Math.max(2, Math.min(10, Math.floor(30000 / (config.cols * config.rows))));
    return generateMaze(config.cols, config.rows, gen.turnBias, attempts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const [pos, setPos] = useState(saved?.pos ?? 0);
  const [steps, setSteps] = useState(saved?.steps ?? 0);
  const [path, setPath] = useState<number[]>(() => saved?.path ?? [0]);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [showPath, setShowPath] = useState(false);
  const [dragMode, setDragMode] = useState(false);

  const done = useRef(false);
  // refs mirror pos/steps so rapid drag events never read a stale render
  const posRef = useRef(pos);
  posRef.current = pos;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const showPathTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.breadcrumbs ? ['breadcrumbs'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assists toggled on mid-game still count as help for this game
  useEffect(() => {
    if (assists.breadcrumbs) assistsUsed.current.add('breadcrumbs');
  }, [assists.breadcrumbs]);

  useEffect(() => {
    if (!config || !maze) return;
    events.onStats({
      score: 0,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { steps, par: maze.par, size: `${config.cols}×${config.rows}` }
    });
  }, [steps, hintsUsed, maze, config, events]);

  const finish = useCallback(
    (finalSteps: number, h: number) => {
      if (done.current || !config || !maze) return;
      done.current = true;
      const mult =
        config.kind === 'classic'
          ? { easy: 1, medium: 2, hard: 3 }[difficulty]
          : Math.max(2, Math.round((config.cols * config.rows) / 90));
      const parSec = config.kind === 'classic' ? PAR_SEC[difficulty] : Math.round(maze.par * 1.5);
      const bonus = Math.max(0, parSec - elapsedRef.current) * mult;
      const score = Math.max(100, 600 * mult - (finalSteps - maze.par) * 5) + bonus;
      events.onFinish({
        outcome: 'won',
        score,
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { steps: finalSteps, par: maze.par, size: `${config.cols}×${config.rows}` }
      });
    },
    [difficulty, maze, config, events]
  );

  /** one cell per tap — no corridor running. Reads posRef/stepsRef (kept in
      sync by drag mode) so interleaved drag + key input never acts on a
      stale position. */
  const move = useCallback(
    (bit: number) => {
      if (paused || done.current || !maze) return;
      const cur = posRef.current;
      if (maze.walls[cur] & bit) return;
      const d = DIRS.find((dd) => dd.bit === bit)!;
      const next = (Math.floor(cur / maze.cols) + d.dr) * maze.cols + ((cur % maze.cols) + d.dc);
      sfx.tap();
      posRef.current = next;
      setPos(next);
      setPath((p) => stepTrail(p, next));
      const total = stepsRef.current + 1;
      stepsRef.current = total;
      setSteps(total);
      if (next === maze.exit) {
        sfx.place();
        finish(total, hintsUsed);
      }
    },
    [paused, maze, hintsUsed, finish]
  );

  /* ---- drag mode: pull the ball through the maze, Color Connect style.
     Rect-math cell hit-testing + segment interpolation; the ball only ever
     advances one LEGAL adjacent cell at a time, so walls still block. ---- */

  const applySteps = useCallback(
    (targets: number[]) => {
      if (!maze || done.current || paused) return;
      let cur = posRef.current;
      const added: number[] = [];
      for (const t of targets) {
        if (t === cur) continue;
        const dr = Math.floor(t / maze.cols) - Math.floor(cur / maze.cols);
        const dc = (t % maze.cols) - (cur % maze.cols);
        if (Math.abs(dr) + Math.abs(dc) !== 1) break;
        const d = DIRS.find((dd) => dd.dr === dr && dd.dc === dc)!;
        if (maze.walls[cur] & d.bit) break;
        cur = t;
        added.push(t);
        if (t === maze.exit) break;
      }
      if (!added.length) return;
      posRef.current = cur;
      setPos(cur);
      setPath((p) => added.reduce(stepTrail, p));
      const total = stepsRef.current + added.length;
      stepsRef.current = total;
      setSteps(total);
      sfx.tap();
      if (cur === maze.exit) {
        sfx.place();
        finish(total, hintsUsed);
      }
    },
    [maze, paused, hintsUsed, finish]
  );

  /** pointer position in SVG user units */
  const toUnits = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = rect.width / (maze!.cols * U + 3);
    return { x: (e.clientX - rect.left) / scale - 1.5, y: (e.clientY - rect.top) / scale - 1.5 };
  };

  const unitCell = (x: number, y: number) => {
    if (!maze) return -1;
    const c = Math.floor(x / U);
    const r = Math.floor(y / U);
    return c < 0 || c >= maze.cols || r < 0 || r >= maze.rows ? -1 : r * maze.cols + c;
  };

  const onBoardDown = (e: React.PointerEvent) => {
    if (!dragMode || !maze || paused || done.current) return;
    const p = toUnits(e);
    const dx = p.x - cx(posRef.current, maze.cols);
    const dy = p.y - cy(posRef.current, maze.cols);
    // grab only when the press lands on (or right next to) the ball
    if (dx * dx + dy * dy > (U * 1.3) ** 2) return;
    dragging.current = true;
    lastPt.current = p;
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onBoardMove = (e: React.PointerEvent) => {
    if (!dragging.current || !lastPt.current || !maze) return;
    const p = toUnits(e);
    const from = lastPt.current;
    const dist = Math.hypot(p.x - from.x, p.y - from.y);
    const samples = Math.max(1, Math.ceil(dist / (U / 2)));
    const targets: number[] = [];
    for (let i = 1; i <= samples; i++) {
      const cell = unitCell(from.x + ((p.x - from.x) * i) / samples, from.y + ((p.y - from.y) * i) / samples);
      if (cell >= 0 && cell !== targets[targets.length - 1]) targets.push(cell);
    }
    applySteps(targets);
    lastPt.current = p;
  };

  const onBoardUp = () => {
    dragging.current = false;
    lastPt.current = null;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, number> = { ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const useHint = () => {
    if (paused || done.current || !maze || !assists.showPath || showPath) return;
    assistsUsed.current.add('showPath');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    setShowPath(true);
    showPathTimer.current = window.setTimeout(
      () => setShowPath(false),
      Math.min(5000, 1200 + maze.par * 25)
    );
  };

  // pausing ends the flash immediately so it doesn't burn away off-screen
  useEffect(() => {
    if (paused) {
      if (showPathTimer.current) {
        clearTimeout(showPathTimer.current);
        showPathTimer.current = null;
      }
      setShowPath(false);
    }
    return () => {
      if (showPathTimer.current) clearTimeout(showPathTimer.current);
    };
  }, [paused]);

  useEffect(() => {
    registerSnapshot(() =>
      config && maze
        ? ({
            config,
            maze,
            pos,
            steps,
            path,
            hintsUsed,
            assistsUsed: [...assistsUsed.current]
          } satisfies MazeSave)
        : null
    );
  });

  /* ---------- size menu ---------- */

  if (!config || !maze) {
    const classic = SIZE[difficulty];
    return (
      <div className="maze">
        <div className="mz-menu">
          <button
            className="mz-quick fx-card"
            onClick={() => {
              sfx.place();
              setConfig({ kind: 'classic', cols: classic, rows: classic });
            }}
          >
            <span className="mz-quick-title">Classic maze</span>
            <span className="mz-quick-sub">
              {classic}×{classic} on <b>{difficulty}</b> — bigger and twistier with difficulty.
            </span>
          </button>

          <section className="mz-custom fx-card">
            <h3 className="mz-custom-title">Custom maze</h3>
            <p className="mz-custom-note">
              Built for portrait play: tall mazes extend downward and the page scrolls with you.
            </p>
            <h4 className="mz-set-label">Width</h4>
            <div className="mz-chips">
              {CUSTOM_COLS.map((c) => (
                <button
                  key={c}
                  className={`mz-chip ${pickCols === c ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickCols(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <h4 className="mz-set-label">Height</h4>
            <div className="mz-chips">
              {CUSTOM_ROWS.map((r) => (
                <button
                  key={r}
                  className={`mz-chip ${pickRows === r ? 'active' : ''}`}
                  onClick={() => {
                    sfx.tap();
                    setPickRows(r);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              className="primary-btn"
              onClick={() => {
                sfx.place();
                setConfig({ kind: 'custom', cols: pickCols, rows: pickRows });
              }}
            >
              Start {pickCols}×{pickRows} maze
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* ---------- board ---------- */

  const { cols, rows, walls, exit } = maze;

  // walls as round-capped line segments: N + W per cell, S/E on the borders
  const wallLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const w = walls[r * cols + c];
      const x = c * U;
      const y = r * U;
      if (w & N) wallLines.push({ x1: x, y1: y, x2: x + U, y2: y });
      if (w & W) wallLines.push({ x1: x, y1: y, x2: x, y2: y + U });
      if (r === rows - 1 && w & S) wallLines.push({ x1: x, y1: y + U, x2: x + U, y2: y + U });
      if (c === cols - 1 && w & E) wallLines.push({ x1: x + U, y1: y, x2: x + U, y2: y + U });
    }
  }

  return (
    <div className={`maze ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Steps: <b>{steps}</b>
        </span>
        <span className="info-item">
          Shortest: <b>{maze.par}</b>
        </span>
      </div>

      <div className="mz-board">
        <svg
          ref={svgRef}
          className={`mz-svg ${dragMode ? 'drag' : ''}`}
          viewBox={`-1.5 -1.5 ${cols * U + 3} ${rows * U + 3}`}
          role="img"
          aria-label="Maze board"
          onPointerDown={onBoardDown}
          onPointerMove={onBoardMove}
          onPointerUp={onBoardUp}
          onPointerCancel={onBoardUp}
        >
          <rect className="mz-floor" x={-1.5} y={-1.5} width={cols * U + 3} height={rows * U + 3} rx={3} />

          {/* walked trail, painted segment by segment behind the player */}
          {assists.breadcrumbs &&
            path.slice(1).map((cell, i) => (
              <line
                key={`${i}-${cell}`}
                className="mz-trail-seg"
                x1={cx(path[i], cols)}
                y1={cy(path[i], cols)}
                x2={cx(cell, cols)}
                y2={cy(cell, cols)}
                pathLength={100}
              />
            ))}

          {/* optimal route reveal (Show path) */}
          {showPath && (
            <polyline
              className="mz-solution"
              points={maze.solution.map((cell) => `${cx(cell, cols)},${cy(cell, cols)}`).join(' ')}
              pathLength={100}
            />
          )}

          {/* the goal: a pulsing target */}
          <g className="mz-goal" transform={`translate(${cx(exit, cols)}, ${cy(exit, cols)})`}>
            <circle className="mz-goal-pulse" r={3.4} />
            <circle className="mz-goal-ring" r={3} />
            <circle className="mz-goal-dot" r={1.2} />
          </g>

          {/* the player glides between cells (CSS transition on transform) */}
          <g className="mz-player" style={{ transform: `translate(${cx(pos, cols)}px, ${cy(pos, cols)}px)` }}>
            <circle className="mz-player-pulse" r={3.4} />
            <circle className="mz-player-core" r={2.9} />
          </g>

          <g className="mz-walls">
            {wallLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        </svg>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={dragMode} onClick={() => setDragMode((v) => !v)}>
            <MoveIcon />
            <span>Drag</span>
          </PadTool>
          {assists.showPath && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Show path</span>
            </PadTool>
          )}
        </div>
        <div className="mz-dpad">
          <button className="mz-dbtn left" onClick={() => move(W)} aria-label="Move left">
            <DpadArrowIcon />
          </button>
          <div className="mz-dpad-mid">
            <button className="mz-dbtn up" onClick={() => move(N)} aria-label="Move up">
              <DpadArrowIcon />
            </button>
            <button className="mz-dbtn down" onClick={() => move(S)} aria-label="Move down">
              <DpadArrowIcon />
            </button>
          </div>
          <button className="mz-dbtn right" onClick={() => move(E)} aria-label="Move right">
            <DpadArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
