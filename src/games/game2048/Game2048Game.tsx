import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  BLOCKER,
  EMPTY,
  bestMove,
  emptyCells,
  hasMoves,
  maxTile,
  slideTiles,
  spawn,
  tilesToGrid,
  type Dir,
  type Tile
} from './logic/engine';
import { BLOCKER_TTL, MAX_UNDOS, RULES, computeScore } from './logic/config';

interface SavedTile {
  id: number;
  value: number;
  r: number;
  c: number;
  ttl?: number;
}
interface UndoEntry {
  tiles: SavedTile[];
  score: number;
  best: number;
  moves: number;
  won: boolean;
}
interface G2Save {
  tiles: SavedTile[];
  nextId: number;
  score: number;
  best: number;
  moves: number;
  won: boolean;
  undosLeft: number;
  undoStack: UndoEntry[];
  hintsUsed: number;
  assistsUsed: string[];
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right'
};

const LockGlyph = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" fill="currentColor" opacity="0.9" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const HintArrow = () => (
  <svg viewBox="0 0 48 48" width="54" height="54" fill="none" aria-hidden>
    <path d="M24 6 L38 24 H30 V42 H18 V24 H10 Z" fill="currentColor" strokeLinejoin="round" />
  </svg>
);

export function Game2048Game({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const rules = RULES[difficulty];
  const size = rules.size;

  const saved =
    savedState && Array.isArray((savedState as G2Save).tiles) ? (savedState as G2Save) : undefined;

  // ----- one-time initial board (fresh mount = new game; shell owns the key) -----
  const initial = useMemo(() => {
    if (saved) {
      return {
        tiles: saved.tiles.map((t) => ({ ...t })) as Tile[],
        nextId: saved.nextId,
        score: saved.score,
        best: saved.best,
        moves: saved.moves,
        won: saved.won,
        undosLeft: saved.undosLeft,
        undoStack: saved.undoStack ?? [],
        hintsUsed: saved.hintsUsed,
        assists: saved.assistsUsed ?? []
      };
    }
    let id = 1;
    let grid = new Array<number>(size * size).fill(EMPTY);
    const tiles: Tile[] = [];
    for (let k = 0; k < 2; k++) {
      const s = spawn(grid, Math.random, rules.fourChance);
      if (!s) break;
      grid = s.grid;
      tiles.push({ id: id++, value: s.value, r: Math.floor(s.index / size), c: s.index % size });
    }
    return {
      tiles,
      nextId: id,
      score: 0,
      best: maxTile(grid),
      moves: 0,
      won: false,
      undosLeft: MAX_UNDOS,
      undoStack: [] as UndoEntry[],
      hintsUsed: 0,
      assists: [] as string[]
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tiles, setTiles] = useState<Tile[]>(initial.tiles);
  const [ghosts, setGhosts] = useState<Tile[]>([]);
  const [score, setScore] = useState(initial.score);
  const [best, setBest] = useState(initial.best);
  const [moves, setMoves] = useState(initial.moves);
  const [won, setWon] = useState(initial.won);
  const [dead, setDead] = useState(false);
  const [undosLeft, setUndosLeft] = useState(initial.undosLeft);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>(initial.undoStack);
  const [hintsUsed, setHintsUsed] = useState(initial.hintsUsed);
  const [wave, setWave] = useState(0);
  const [floatFx, setFloatFx] = useState<{ amt: number; key: number } | null>(null);
  const [hintDir, setHintDir] = useState<Dir | null>(null);

  const idRef = useRef(initial.nextId);
  const newId = () => {
    const id = idRef.current;
    idRef.current += 1;
    return id;
  };
  const assistsUsed = useRef<Set<string>>(new Set(initial.assists));
  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const ghostTimer = useRef<number | null>(null);

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.easySpawns) assistsUsed.current.add('easySpawns');
  }, [assists.easySpawns]);

  useEffect(() => {
    events.onStats({
      score: computeScore(score, won, hintsUsed, rules.mult),
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { bestTile: best, moves, target: rules.target }
    });
  }, [score, won, hintsUsed, best, moves, events, rules.mult, rules.target, assists.easySpawns]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', rawScore: number, h: number, bestTile: number, mv: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome,
        score: computeScore(rawScore, outcome === 'won', h, rules.mult),
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { bestTile, moves: mv, target: rules.target }
      });
    },
    [events, rules.mult, rules.target]
  );

  const doMove = useCallback(
    (dir: Dir) => {
      if (paused) return;
      if (dead) return;
      const res = slideTiles(tiles, size, dir);
      if (!res.moved) return; // no-op swipe: nothing changes, errors stay 0

      // snapshot the pre-move board for undo
      const snapshot: UndoEntry = {
        tiles: tiles.map((t) => ({ id: t.id, value: t.value, r: t.r, c: t.c, ttl: t.ttl })),
        score,
        best,
        moves,
        won
      };

      const survivors = res.tiles.filter((t) => !t.removing);
      const ghostTiles = res.tiles.filter((t) => t.removing);

      // age blockers; clear expired
      const working: Tile[] = survivors
        .map((t) => (t.value === BLOCKER ? { ...t, ttl: (t.ttl ?? BLOCKER_TTL) - 1 } : t))
        .filter((t) => !(t.value === BLOCKER && (t.ttl ?? 0) <= 0));

      const gainedNow = res.gained;
      const nextScoreRaw = score + gainedNow;
      const nextMoves = moves + 1;
      const topTile = working.reduce((m, t) => (t.value > m ? t.value : m), 0);
      const nextBest = Math.max(best, topTile);
      const justWon = !won && topTile >= rules.target;
      const topMerged = working.reduce((m, t) => (t.merged && t.value > m ? t.value : m), 0);

      // spawn a fresh number tile
      let grid = tilesToGrid(working, size);
      const sp = spawn(grid, Math.random, assists.easySpawns ? 0 : rules.fourChance);
      if (sp) {
        working.push({
          id: newId(),
          value: sp.value,
          r: Math.floor(sp.index / size),
          c: sp.index % size,
          isNew: true
        });
        grid = sp.grid;
      }
      // extreme: occasionally drop a temporary blocker (max one, needs room)
      if (rules.blockers && !working.some((t) => t.value === BLOCKER)) {
        const empties = emptyCells(grid);
        if (empties.length >= 3 && Math.random() < 0.12) {
          const bi = empties[Math.floor(Math.random() * empties.length)];
          working.push({
            id: newId(),
            value: BLOCKER,
            r: Math.floor(bi / size),
            c: bi % size,
            ttl: BLOCKER_TTL,
            isNew: true
          });
          grid[bi] = BLOCKER;
        }
      }

      setUndoStack((s) => [...s.slice(-(MAX_UNDOS - 1)), snapshot]);
      setTiles(working);
      setGhosts(ghostTiles);
      setScore(nextScoreRaw);
      setBest(nextBest);
      setMoves(nextMoves);
      setWave((w) => w + 1);

      if (gainedNow > 0) {
        setFloatFx({ amt: gainedNow, key: nextMoves });
        sfx.pop();
        // a bright pop pitched up with the size of the merge
        const semis = Math.log2(Math.max(4, topMerged));
        playNote(180 * Math.pow(1.062, semis * 2), 80, 'triangle');
      } else {
        sfx.drag();
      }

      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      ghostTimer.current = window.setTimeout(() => setGhosts([]), 170);

      if (justWon) {
        setWon(true);
        finish('won', nextScoreRaw, hintsUsed, nextBest, nextMoves);
      } else if (!hasMoves(grid)) {
        setDead(true);
        finish('lost', nextScoreRaw, hintsUsed, nextBest, nextMoves);
      }
    },
    [tiles, size, paused, dead, score, best, moves, won, assists.easySpawns, rules, hintsUsed, finish]
  );

  // keep a live ref so window listeners always call the latest closure
  const moveRef = useRef(doMove);
  useEffect(() => {
    moveRef.current = doMove;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      moveRef.current(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(
    () => () => {
      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
    },
    []
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    boardRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s || paused) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 22) return;
    moveRef.current(ax > ay ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };

  const undo = () => {
    if (paused || done.current || !assists.undo || undosLeft <= 0 || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    assistsUsed.current.add('undo');
    setUndoStack((s) => s.slice(0, -1));
    setUndosLeft((u) => u - 1);
    setTiles(prev.tiles.map((t) => ({ ...t })));
    setGhosts([]);
    setScore(prev.score);
    setBest(prev.best);
    setMoves(prev.moves);
    setWon(prev.won);
    setDead(false);
    setWave((w) => w + 1);
    sfx.hint();
  };

  const showHint = () => {
    if (paused || done.current || !assists.hint) return;
    const dir = bestMove(tilesToGrid(tiles, size));
    if (!dir) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setHintDir(dir);
    sfx.hint();
    window.setTimeout(() => setHintDir(null), 1100);
  };

  useEffect(() => {
    registerSnapshot(
      (): G2Save => ({
        tiles: tiles.map((t) => ({ id: t.id, value: t.value, r: t.r, c: t.c, ttl: t.ttl })),
        nextId: idRef.current,
        score,
        best,
        moves,
        won,
        undosLeft,
        undoStack,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const slots = useMemo(() => Array.from({ length: size * size }, (_, i) => i), [size]);
  const render = [...tiles, ...ghosts];

  return (
    <div className={`g2-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info g2-info">
        <span className="info-item g2-score">
          <b>{computeScore(score, won, hintsUsed, rules.mult).toLocaleString()}</b> pts
          {floatFx && (
            <span className="g2-float" key={floatFx.key}>
              +{floatFx.amt}
            </span>
          )}
        </span>
        <span className="info-item">
          Goal <b>{rules.target}</b>
        </span>
        <span className="info-item">
          Best <b>{best || '—'}</b>
        </span>
      </div>

      <div className="g2-board-wrap">
        <div
          ref={boardRef}
          className={`g2-board ${dead ? 'dead' : ''}`}
          style={{ '--n': size } as CSSProperties}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {slots.map((i) => (
            <div key={i} className="g2-slot" />
          ))}

          {render.map((t) => {
            const isBlock = t.value === BLOCKER;
            const label = String(t.value);
            return (
              <div
                key={t.id}
                className={`g2-tile ${t.removing ? 'ghost' : ''}`}
                style={{ '--r': t.r, '--c': t.c } as CSSProperties}
              >
                <div
                  key={`${t.id}:${wave}`}
                  className={[
                    'g2-face',
                    isBlock ? 'blocker' : `v${Math.min(t.value, 4096)}`,
                    isBlock ? '' : `len${label.length}`,
                    t.merged ? 'merged' : '',
                    t.isNew ? 'new' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isBlock ? (
                    <>
                      <LockGlyph />
                      {t.ttl != null && <span className="g2-ttl">{t.ttl}</span>}
                    </>
                  ) : (
                    label
                  )}
                </div>
              </div>
            );
          })}

          {hintDir && (
            <div className={`g2-hint g2-hint-${hintDir}`} aria-hidden>
              <HintArrow />
            </div>
          )}

          {won && (
            <div className="g2-confetti" aria-hidden>
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`g2-dot d${i % 7}`} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
          )}

          {dead && (
            <div className="g2-dead">
              <span className="g2-dead-title">No moves left</span>
              <span className="g2-dead-sub">The board is full</span>
            </div>
          )}
        </div>
      </div>

      {(assists.undo || assists.hint) && (
        <div className="game-tools fx-card">
          <div className="g2-tools">
            {assists.undo && (
              <PadTool
                silent
                onClick={undo}
                disabled={undosLeft <= 0 || undoStack.length === 0 || done.current}
              >
                <RestartIcon />
                <span>Undo ({undosLeft})</span>
              </PadTool>
            )}
            {assists.hint && (
              <PadTool silent onClick={showHint} disabled={done.current}>
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
