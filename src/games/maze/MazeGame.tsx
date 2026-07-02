import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BackIcon, BulbIcon } from '../../platform/design/icons';

const SIZE: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 15 };
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const PAR_SEC: Record<Difficulty, number> = { easy: 60, medium: 150, hard: 300 };

// wall bits per cell
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [
  { bit: N, dr: -1, dc: 0, opp: S },
  { bit: E, dr: 0, dc: 1, opp: W },
  { bit: S, dr: 1, dc: 0, opp: N },
  { bit: W, dr: 0, dc: -1, opp: E }
];

interface Maze {
  size: number;
  walls: number[]; // bitmask per cell
  par: number; // BFS shortest path length
  solution: number[]; // shortest path cell indices
}

function generateMaze(size: number): Maze {
  const n = size * size;
  const walls = new Array<number>(n).fill(N | E | S | W);
  const visited = new Array<boolean>(n).fill(false);
  const stack = [0];
  visited[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / size);
    const c = cur % size;
    const options = DIRS.filter(({ dr, dc }) => {
      const nr = r + dr;
      const nc = c + dc;
      return nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr * size + nc];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(Math.random() * options.length)];
    const next = (r + d.dr) * size + (c + d.dc);
    walls[cur] &= ~d.bit;
    walls[next] &= ~d.opp;
    visited[next] = true;
    stack.push(next);
  }
  // BFS for par + solution
  const prev = new Array<number>(n).fill(-1);
  const queue = [0];
  const seen = new Array<boolean>(n).fill(false);
  seen[0] = true;
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === n - 1) break;
    const r = Math.floor(cur / size);
    const c = cur % size;
    for (const d of DIRS) {
      if (walls[cur] & d.bit) continue;
      const nxt = (r + d.dr) * size + (c + d.dc);
      if (!seen[nxt]) {
        seen[nxt] = true;
        prev[nxt] = cur;
        queue.push(nxt);
      }
    }
  }
  const solution: number[] = [];
  for (let at = n - 1; at !== -1; at = prev[at]) solution.unshift(at);
  return { size, walls, par: solution.length - 1, solution };
}

interface MazeSave {
  maze: Maze;
  pos: number;
  steps: number;
  trail: number[];
  hintsUsed: number;
  assistsUsed: string[];
}

export function MazeGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const size = SIZE[difficulty];
  const saved = savedState as MazeSave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const maze = useMemo(() => saved?.maze ?? generateMaze(size), [size]);
  const exit = size * size - 1;

  const [pos, setPos] = useState(saved?.pos ?? 0);
  const [steps, setSteps] = useState(saved?.steps ?? 0);
  const [trail, setTrail] = useState<Set<number>>(() => new Set(saved?.trail ?? [0]));
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [showPath, setShowPath] = useState(false);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.breadcrumbs ? ['breadcrumbs'] : [])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(() => {
    events.onStats({
      score: 0,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { steps, par: maze.par }
    });
  }, [steps, hintsUsed, maze.par, events]);

  const finish = useCallback(
    (finalSteps: number, h: number) => {
      if (done.current) return;
      done.current = true;
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const score = Math.max(100, 600 * MULT[difficulty] - (finalSteps - maze.par) * 5) + bonus;
      events.onFinish({
        outcome: 'won',
        score,
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { steps: finalSteps, par: maze.par }
      });
    },
    [difficulty, maze.par, events]
  );

  /** Move and keep running through corridors until a junction, wall or the exit. */
  const move = useCallback(
    (bit: number) => {
      if (paused || done.current) return;
      let cur = pos;
      let dir = DIRS.find((d) => d.bit === bit)!;
      if (maze.walls[cur] & dir.bit) return;
      let count = 0;
      const newTrail = new Set(trail);
      for (;;) {
        cur = (Math.floor(cur / size) + dir.dr) * size + ((cur % size) + dir.dc);
        count++;
        newTrail.add(cur);
        if (cur === exit) break;
        // continue only through corridors (exactly one way forward)
        const exits = DIRS.filter((d) => !(maze.walls[cur] & d.bit) && d.bit !== dir.opp);
        if (exits.length !== 1) break;
        dir = exits[0];
      }
      sfx.tap();
      setPos(cur);
      setTrail(newTrail);
      const total = steps + count;
      setSteps(total);
      if (cur === exit) {
        sfx.place();
        finish(total, hintsUsed);
      }
    },
    [paused, pos, maze, size, exit, trail, steps, hintsUsed, finish]
  );

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
    if (paused || done.current || !assists.showPath || showPath) return;
    assistsUsed.current.add('showPath');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    setShowPath(true);
    window.setTimeout(() => setShowPath(false), 2000);
  };

  const solutionSet = useMemo(() => new Set(maze.solution), [maze]);

  useEffect(() => {
    registerSnapshot(() => ({
      maze,
      pos,
      steps,
      trail: [...trail],
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

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

      <div className="mz-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {maze.walls.map((w, i) => (
          <div
            key={i}
            className={[
              'mz-cell',
              w & N ? 'wn' : '',
              w & E ? 'we' : '',
              w & S ? 'ws' : '',
              w & W ? 'ww' : '',
              assists.breadcrumbs && trail.has(i) ? 'trail' : '',
              showPath && solutionSet.has(i) ? 'sol' : '',
              i === exit ? 'exit' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {i === pos && <span className="mz-player" />}
          </div>
        ))}
      </div>

      <div className="mz-controls game-tools fx-card">
        <div className="mz-dpad">
          <span />
          <button className="icon-btn mz-up" onClick={() => move(N)} aria-label="Up">
            <BackIcon />
          </button>
          <span />
          <button className="icon-btn mz-left" onClick={() => move(W)} aria-label="Left">
            <BackIcon />
          </button>
          <button className="icon-btn mz-down" onClick={() => move(S)} aria-label="Down">
            <BackIcon />
          </button>
          <button className="icon-btn mz-right" onClick={() => move(E)} aria-label="Right">
            <BackIcon />
          </button>
        </div>
        {assists.showPath && (
          <button className="pad-tool" onClick={useHint}>
            <BulbIcon />
            <span>Show path</span>
          </button>
        )}
      </div>
    </div>
  );
}
