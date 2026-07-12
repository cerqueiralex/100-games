import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';

const COLS = 5;
const ROWS = 7;
const N = COLS * ROWS;

const TARGET: Record<Difficulty, number> = { easy: 256, medium: 512, hard: 1024, pro: 2048, extreme: 4096 };
const MAX_UNDOS = 3;

const rowOf = (i: number) => Math.floor(i / COLS);
const colOf = (i: number) => i % COLS;
const adjacent = (a: number, b: number) =>
  a !== b && Math.abs(rowOf(a) - rowOf(b)) <= 1 && Math.abs(colOf(a) - colOf(b)) <= 1;

function spawnValue(maxTile: number): number {
  const cap = Math.max(16, maxTile / 8);
  const options: number[] = [];
  for (let v = 2; v <= cap; v *= 2) options.push(v);
  // lower values more likely
  const weights = options.map((_, i) => options.length - i);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return 2;
}

/** Chain rule: values never decrease, each step equal to or double the previous. */
function canExtend(prev: number, next: number): boolean {
  return next === prev || next === prev * 2;
}

function chainResult(values: number[]): number {
  const sum = values.reduce((a, b) => a + b, 0);
  let p = 2;
  while (p * 2 <= sum) p *= 2;
  return p;
}

function hasAnyMove(board: number[]): boolean {
  for (let i = 0; i < N; i++) {
    for (const d of [1, COLS - 1, COLS, COLS + 1]) {
      const j = i + d;
      if (j < N && adjacent(i, j) && board[i] === board[j]) return true;
    }
  }
  return false;
}

interface MergeSave {
  board: number[];
  score: number;
  best: number;
  undosLeft: number;
  hintsUsed: number;
  assistsUsed: string[];
  /** pre-merge state the Undo tool restores (absent in older saves) */
  undoState?: { board: number[]; score: number; best: number } | null;
}

export function NumberMergeGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const target = TARGET[difficulty];
  // ignore old-format saves that lack the expected shape
  const saved =
    savedState && Array.isArray((savedState as MergeSave).board)
      ? (savedState as MergeSave)
      : undefined;
  const [board, setBoard] = useState<number[]>(() =>
    saved ? [...saved.board] : Array.from({ length: N }, () => spawnValue(16))
  );
  const [chain, setChain] = useState<number[]>([]);
  const [undoState, setUndoState] = useState<MergeSave['undoState']>(saved?.undoState ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [undosLeft, setUndosLeft] = useState(saved?.undosLeft ?? MAX_UNDOS);
  const [hintCells, setHintCells] = useState<Set<number>>(() => new Set());
  const [best, setBest] = useState(saved?.best ?? 0);
  /* per-merge animation pass: how many rows each tile fell, which cell is
     the fresh merge result, and a wave counter that remounts tiles so the
     CSS animations replay on every merge */
  const [fx, setFx] = useState<{ fall: number[]; mergedAt: number | null; wave: number }>(() => ({
    fall: new Array(N).fill(0),
    mergedAt: null,
    wave: 0
  }));

  const done = useRef(false);
  const dragging = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  // synchronous mirror so pointer handlers compute OUTSIDE setState updaters
  // (side effects in updaters run during render) without racing batched moves
  const chainRef = useRef<number[]>([]);
  const commitChain = (ch: number[]) => {
    chainRef.current = ch;
    setChain(ch);
  };
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.chainPreview ? ['chainPreview'] : [])])
  );

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.chainPreview) assistsUsed.current.add('chainPreview');
  }, [assists.chainPreview]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { bestTile: best, target }
    });
  }, [score, errors, hintsUsed, best, events, target]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, h: number, bestTile: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome,
        score: finalScore,
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { bestTile, target }
      });
    },
    [events, target]
  );

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = rect.width / COLS;
    const c = Math.floor((x - rect.left) / cs);
    const r = Math.floor((y - rect.top) / cs);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    // require being reasonably inside the cell to avoid diagonal slips
    const cx = rect.left + c * cs + cs / 2;
    const cy = rect.top + r * cs + cs / 2;
    if (Math.abs(x - cx) > cs * 0.42 || Math.abs(y - cy) > cs * 0.42) return null;
    return r * COLS + c;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    dragging.current = true;
    boardRef.current?.setPointerCapture(e.pointerId);
    setHintCells(new Set());
    commitChain([cell]);
    sfx.tap();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || paused || done.current) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell === null) return;
    const ch = chainRef.current;
    if (ch.length === 0 || cell === ch[ch.length - 1]) return;
    if (ch.length >= 2 && cell === ch[ch.length - 2]) {
      commitChain(ch.slice(0, -1)); // backtrack
      return;
    }
    if (ch.includes(cell) || !adjacent(ch[ch.length - 1], cell)) return;
    const prevVal = board[ch[ch.length - 1]];
    const ok = ch.length === 1 ? board[cell] === prevVal : canExtend(prevVal, board[cell]);
    if (!ok) return;
    sfx.tap();
    commitChain([...ch, cell]);
  };

  const resolveChain = () => {
    dragging.current = false;
    const ch = chainRef.current;
    commitChain([]);
    // a pointerup delivered after pausing (captured pointer) must not commit
    if (ch.length < 2 || done.current || paused) return;
    const values = ch.map((i) => board[i]);
    const result = chainResult(values);
    setUndoState({ board: [...board], score, best });

    const next = [...board];
    const last = ch[ch.length - 1];
    for (const i of ch) next[i] = 0;
    next[last] = result;
    // gravity per column, then refill from the top — tracking how far
    // every tile falls so the board can animate the drops
    const maxTile = Math.max(result, best);
    const fall = new Array<number>(N).fill(0);
    let mergedAt: number | null = null;
    for (let c = 0; c < COLS; c++) {
      const stack: { v: number; oldR: number }[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        const v = next[r * COLS + c];
        if (v !== 0) stack.push({ v, oldR: r });
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        const k = ROWS - 1 - r;
        const idx = r * COLS + c;
        if (k < stack.length) {
          next[idx] = stack[k].v;
          fall[idx] = r - stack[k].oldR;
          if (stack[k].oldR * COLS + c === last) mergedAt = idx;
        } else {
          next[idx] = spawnValue(maxTile);
          // fresh tiles drop in from above the board edge
          fall[idx] = r + 1;
        }
      }
    }
    setFx((f) => ({ fall, mergedAt, wave: f.wave + 1 }));
    const nextScore = score + result;
    const nextBest = Math.max(best, result);
    setBoard(next);
    setScore(nextScore);
    setBest(nextBest);
    sfx.place();
    if (result >= target) {
      finish('won', nextScore, hintsUsed, nextBest);
    } else if (!hasAnyMove(next)) {
      sfx.lose();
      finish('lost', nextScore, hintsUsed, nextBest);
    }
  };

  const undo = () => {
    if (paused || done.current || !assists.undo || undosLeft === 0 || !undoState) return;
    assistsUsed.current.add('undo');
    setHintsUsed((h) => h + 1);
    setUndosLeft((u) => u - 1);
    setBoard(undoState.board);
    setScore(undoState.score);
    setBest(undoState.best);
    setUndoState(null);
    // no fall replay when a board is restored
    setFx((f) => ({ fall: new Array(N).fill(0), mergedAt: null, wave: f.wave + 1 }));
    sfx.hint();
  };

  const showHint = () => {
    if (paused || done.current || !assists.showHint) return;
    for (let i = 0; i < N; i++) {
      for (const d of [1, COLS - 1, COLS, COLS + 1]) {
        const j = i + d;
        if (j < N && adjacent(i, j) && board[i] === board[j]) {
          assistsUsed.current.add('showHint');
          setHintsUsed((h) => h + 1);
          setHintCells(new Set([i, j]));
          sfx.hint();
          return;
        }
      }
    }
  };

  const chainSum = useMemo(
    () => chain.reduce((a, i) => a + board[i], 0),
    [chain, board]
  );

  useEffect(() => {
    registerSnapshot(() => ({
      board,
      score,
      best,
      undosLeft,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      undoState
    }));
  });

  return (
    <div className={`nmerge ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Goal: <b>{target}</b>
        </span>
        <span className="info-item">
          Best: <b>{best || '—'}</b>
        </span>
      </div>

      <div className="nm-preview">
        {assists.chainPreview && chain.length >= 2 ? (
          <span className="chip accent">
            {chain.length} tiles → {chainResult(chain.map((i) => board[i]))}
          </span>
        ) : (
          <span className="chip">{chainSum > 0 ? ' ' : 'Drag equal numbers to merge'}</span>
        )}
      </div>

      <div
        ref={boardRef}
        className="nm-board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={resolveChain}
        onPointerCancel={resolveChain}
      >
        {board.map((v, i) => (
          <div
            key={`${i}-${fx.wave}`}
            className={[
              'nm-tile',
              `v${Math.min(v, 2048)}`,
              chain.includes(i) ? 'in-chain' : '',
              hintCells.has(i) ? 'hinted' : '',
              fx.fall[i] > 0 ? 'fall' : '',
              fx.mergedAt === i ? 'merged' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            style={fx.fall[i] > 0 ? ({ '--fd': fx.fall[i] } as CSSProperties) : undefined}
          >
            {v}
          </div>
        ))}

        {/* the drag chain drawn as a connected rope through the tiles */}
        {chain.length >= 2 && (
          <svg className="nm-links" aria-hidden>
            {chain.slice(1).map((cell, k) => (
              <line
                key={`${k}-${cell}`}
                className={`nm-link v${Math.min(board[cell], 2048)}`}
                x1={`${((colOf(chain[k]) + 0.5) / COLS) * 100}%`}
                y1={`${((rowOf(chain[k]) + 0.5) / ROWS) * 100}%`}
                x2={`${((colOf(cell) + 0.5) / COLS) * 100}%`}
                y2={`${((rowOf(cell) + 0.5) / ROWS) * 100}%`}
                pathLength={100}
              />
            ))}
          </svg>
        )}
      </div>

      {(assists.undo || assists.showHint) && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            {assists.undo && (
              <PadTool silent onClick={undo} disabled={undosLeft === 0 || !undoState}>
                <RestartIcon />
                <span>Undo ({undosLeft})</span>
              </PadTool>
            )}
            {assists.showHint && (
              <PadTool silent onClick={showHint}>
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
