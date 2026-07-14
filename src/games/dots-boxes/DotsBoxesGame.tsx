import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  makeBoard,
  initSnap,
  applyMove,
  isComplete,
  boxCounts,
  type GameSnap,
  type Owner
} from './logic/engine';
import { pickAiMove, safeEdges } from './logic/ai';

type Mode = 'bot' | 'local';

const DIMS: Record<Difficulty, [number, number]> = {
  easy: [3, 3],
  medium: [4, 4],
  hard: [5, 5],
  pro: [5, 5],
  extreme: [6, 6]
};
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };

interface DBConfig {
  mode: Mode;
}

interface DBSave extends DBConfig {
  rows: number;
  cols: number;
  edges: boolean[];
  boxes: (Owner | null)[];
  turn: Owner;
  lastEdge: number | null;
  hintsUsed: number;
  assistsUsed: string[];
}

/** small owner emblem drawn inside a claimed box */
function Emblem({ owner }: { owner: Owner }) {
  return owner === 0 ? (
    <svg className="db-emblem" viewBox="0 0 12 12" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1.4" transform="rotate(45 6 6)" fill="currentColor" />
    </svg>
  ) : (
    <svg className="db-emblem" viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="3.4" fill="currentColor" />
    </svg>
  );
}

export function DotsBoxesGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  const [rows, cols] = DIMS[difficulty];
  const board = useMemo(() => makeBoard(rows, cols), [rows, cols]);
  const totalBoxes = rows * cols;

  const saved =
    savedState && (savedState as DBSave).mode && (savedState as DBSave).edges?.length === board.edgeCount
      ? (savedState as DBSave)
      : undefined;

  const [config, setConfig] = useState<DBConfig | null>(saved ? { mode: saved.mode } : null);
  const [pickMode, setPickMode] = useState<Mode>('bot');

  const [edges, setEdges] = useState<boolean[]>(() => (saved ? [...saved.edges] : initSnap(board).edges));
  const [boxes, setBoxes] = useState<(Owner | null)[]>(() =>
    saved ? [...saved.boxes] : initSnap(board).boxes
  );
  const [turn, setTurn] = useState<Owner>(saved?.turn ?? 0);
  const [lastEdge, setLastEdge] = useState<number | null>(saved?.lastEdge ?? null);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [suggest, setSuggest] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  // the clock is held on the mode menu — real play starts once configured
  useEffect(() => {
    holdClock(config === null);
  }, [config, holdClock]);

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists['box-count']) assistsUsed.current.add('box-count');
    if (assists['safe-edges']) assistsUsed.current.add('safe-edges');
  }, [assists]);

  const [you, opp] = boxCounts({ edges, boxes, turn });

  const computeScore = (won: boolean): number => {
    const margin = you - opp;
    const base = you * 10 + (won ? 100 + Math.max(0, margin) * 20 : 0);
    return Math.max(0, base * MULT[difficulty] - hintsUsed * 25);
  };

  useEffect(() => {
    if (!config) return;
    events.onStats({
      score: computeScore(false),
      errors: opp,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { you, opponent: opp, boxes: totalBoxes, mode: config.mode }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you, opp, hintsUsed, config]);

  const finish = (snap: GameSnap) => {
    if (done.current || !config) return;
    done.current = true;
    const [y, o] = boxCounts(snap);
    const youWon = y > o;
    const base = {
      outcome: (youWon ? 'won' : 'lost') as 'won' | 'lost',
      score: Math.max(0, (y * 10 + (youWon ? 100 + Math.max(0, y - o) * 20 : 0)) * MULT[difficulty] - hintsUsed * 25),
      errors: o,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { you: y, opponent: o, boxes: totalBoxes, mode: config.mode }
    };
    if (config.mode === 'local') {
      const headline = y === o ? "It's a draw!" : y > o ? 'Player 1 wins!' : 'Player 2 wins!';
      events.onFinish({
        ...base,
        hideStats: true,
        headline,
        subline: `Boxes ${y}–${o} of ${totalBoxes}`
      });
    } else {
      events.onFinish(base);
    }
  };

  const commit = (snap: GameSnap, edge: number) => {
    setEdges(snap.edges);
    setBoxes(snap.boxes);
    setTurn(snap.turn);
    setLastEdge(edge);
  };

  // --- robot (player 1 in bot mode) ---
  const scheduleRobot = (snap: GameSnap, ms: number) => {
    schedule(() => {
      if (done.current || !config || config.mode !== 'bot' || snap.turn !== 1) return;
      const e = pickAiMove(board, snap, difficulty, 1);
      const res = applyMove(board, snap, e, 1);
      commit(res.snap, e);
      if (res.captured.length) sfx.pop();
      else sfx.tap();
      if (isComplete(res.snap)) {
        finish(res.snap);
        return;
      }
      if (res.snap.turn === 1) scheduleRobot(res.snap, 380);
    }, ms);
  };

  // pause clears timers; resume re-arms a robot turn in flight (also covers a
  // save resumed while it's the robot's move)
  useEffect(() => {
    if (!config || done.current) return;
    if (paused) {
      clearTimers();
      return;
    }
    if (config.mode === 'bot' && turn === 1 && !isComplete({ edges, boxes, turn })) {
      scheduleRobot({ edges, boxes, turn }, 460);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, config]);

  const humanCanTap = (t: Owner): boolean => {
    if (!config || paused || done.current) return false;
    if (config.mode === 'bot') return t === 0; // only you tap vs the robot
    return true; // pass-and-play: whichever player's turn
  };

  const tap = (edge: number) => {
    if (edges[edge] || !humanCanTap(turn)) return;
    const player = turn;
    const res = applyMove(board, { edges, boxes, turn }, edge, player);
    commit(res.snap, edge);
    setSuggest(null);
    if (res.captured.length) {
      sfx.pop();
      setFlash('Box! Go again');
      schedule(() => setFlash(null), 900);
    } else {
      sfx.tap();
      setFlash(null);
    }
    if (isComplete(res.snap)) {
      finish(res.snap);
      return;
    }
    if (res.snap.turn === player) return; // captured — same player continues
    if (config?.mode === 'bot') scheduleRobot(res.snap, 460);
  };

  const useHint = () => {
    if (!config || paused || done.current || config.mode !== 'bot' || turn !== 0 || !assists.hint) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    const e = pickAiMove(board, { edges, boxes, turn: 0 }, 'pro', 0);
    setSuggest(e);
  };

  useEffect(() => {
    registerSnapshot(() => {
      if (!config) return null;
      return {
        mode: config.mode,
        rows,
        cols,
        edges,
        boxes,
        turn,
        lastEdge,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      } satisfies DBSave;
    });
  });

  /* ---------- pre-game menu ---------- */
  if (!config) {
    return (
      <div className="db">
        <div className="db-setup fx-card">
          <h3 className="db-setup-title">Opponent</h3>
          <div className="db-opt-row">
            <button
              className={`db-opt ${pickMode === 'bot' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('bot');
              }}
            >
              Robot
            </button>
            <button
              className={`db-opt ${pickMode === 'local' ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setPickMode('local');
              }}
            >
              2 players · one phone
            </button>
          </div>
          <p className="db-setup-note">
            Board this difficulty: <b>{rows}×{cols}</b> boxes. Draw an edge; close a box to
            claim it and go again. Most boxes wins.
          </p>
          <button
            className="primary-btn"
            onClick={() => {
              sfx.place();
              setConfig({ mode: pickMode });
            }}
          >
            Start game
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */
  const snap: GameSnap = { edges, boxes, turn };
  const over = isComplete(snap);
  const showSafe = !!assists['safe-edges'] && !over && humanCanTap(turn);
  const safeSet = showSafe ? new Set(safeEdges(board, snap)) : null;
  const showCount = !!assists['box-count'];

  const p0Label = config.mode === 'bot' ? 'You' : 'Player 1';
  const p1Label = config.mode === 'bot' ? 'Robot' : 'Player 2';

  const status = over
    ? you > opp
      ? config.mode === 'bot'
        ? 'You win!'
        : 'Player 1 wins!'
      : you < opp
      ? config.mode === 'bot'
        ? 'Robot wins'
        : 'Player 2 wins!'
      : "It's a draw"
    : flash ??
      (config.mode === 'bot'
        ? turn === 0
          ? 'Your turn'
          : 'Robot is thinking…'
        : `${turn === 0 ? p0Label : p1Label}'s turn`);

  // build the (2R+1) × (2C+1) render grid
  const cells: ReactNode[] = [];
  for (let gr = 0; gr <= 2 * rows; gr++) {
    for (let gc = 0; gc <= 2 * cols; gc++) {
      const rEven = gr % 2 === 0;
      const cEven = gc % 2 === 0;
      const key = `${gr}-${gc}`;
      if (rEven && cEven) {
        cells.push(<span key={key} className="db-dot" />);
      } else if (rEven && !cEven) {
        // horizontal edge
        const row = gr / 2;
        const col = (gc - 1) / 2;
        const e = row * cols + col;
        const drawn = edges[e];
        cells.push(
          <button
            key={key}
            className={[
              'db-edge h',
              drawn ? 'drawn' : '',
              e === lastEdge ? 'last' : '',
              e === suggest ? 'suggest' : '',
              !drawn && safeSet?.has(e) ? 'safe' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => tap(e)}
            aria-label="horizontal edge"
            disabled={drawn}
          />
        );
      } else if (!rEven && cEven) {
        // vertical edge
        const row = (gr - 1) / 2;
        const col = gc / 2;
        const e = board.hCount + row * (cols + 1) + col;
        const drawn = edges[e];
        cells.push(
          <button
            key={key}
            className={[
              'db-edge v',
              drawn ? 'drawn' : '',
              e === lastEdge ? 'last' : '',
              e === suggest ? 'suggest' : '',
              !drawn && safeSet?.has(e) ? 'safe' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => tap(e)}
            aria-label="vertical edge"
            disabled={drawn}
          />
        );
      } else {
        // box
        const row = (gr - 1) / 2;
        const col = (gc - 1) / 2;
        const owner = boxes[row * cols + col];
        cells.push(
          <span
            key={key}
            className={['db-box', owner === 0 ? 'p0' : owner === 1 ? 'p1' : ''].filter(Boolean).join(' ')}
          >
            {owner !== null && <Emblem owner={owner} />}
          </span>
        );
      }
    }
  }

  const showTools = config.mode === 'bot' && !!assists.hint;

  return (
    <div className={`db ${paused ? 'board-hidden' : ''}`}>
      <div className="db-score">
        <span className={`db-side p0 ${turn === 0 && !over ? 'active' : ''}`}>
          <span className="db-name">{p0Label}</span>
          <b>{showCount ? you : '·'}</b>
        </span>
        <span className="db-vs">{showCount ? `${you + opp} / ${totalBoxes}` : 'boxes'}</span>
        <span className={`db-side p1 ${turn === 1 && !over ? 'active' : ''}`}>
          <b>{showCount ? opp : '·'}</b>
          <span className="db-name">{p1Label}</span>
        </span>
      </div>

      <p className="simon-status">{status}</p>

      <div
        className="db-board"
        style={{
          gridTemplateColumns: `repeat(${cols}, var(--db-dot) 1fr) var(--db-dot)`,
          gridTemplateRows: `repeat(${rows}, var(--db-dot) 1fr) var(--db-dot)`
        }}
      >
        {cells}
      </div>

      {showTools && (
        <div className="game-tools fx-card">
          <div className="db-tools">
            <PadTool silent onClick={useHint} disabled={turn !== 0 || over}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
