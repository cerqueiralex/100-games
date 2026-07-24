import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  makePuzzle,
  piecePath,
  layout,
  homeBoxTL,
  homeCenter,
  isBorderPiece,
  BOX,
  PAD,
  SNAP_TOL,
  PILE_STEP_Y,
  type Puzzle
} from './logic/pieces';

const GRID: Record<Difficulty, { rows: number; cols: number; rotate: boolean }> = {
  easy: { rows: 3, cols: 4, rotate: false },
  medium: { rows: 4, cols: 5, rotate: false },
  hard: { rows: 5, cols: 6, rotate: false },
  pro: { rows: 6, cols: 7, rotate: true },
  extreme: { rows: 7, cols: 8, rotate: true }
};
const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 2 * 60,
  medium: 4 * 60,
  hard: 7 * 60,
  pro: 11 * 60,
  extreme: 16 * 60
};
const HINT_PENALTY = 40;
const MIN_CELL = 30;
const MAX_CELL = 92;
const BOTTOM_RESERVE = 130; // px kept for the sticky tool card + margins

/** colorful fallback "picture" when no photo can be loaded from the manifest */
const FALLBACK_STOPS = [
  'var(--play-4)',
  'var(--play-6)',
  'var(--play-11)',
  'var(--play-1)',
  'var(--play-13)',
  'var(--play-3)',
  'var(--play-8)'
];

/** small rotate glyph (monochrome, currentColor) — not in the shared icon set */
function RotateIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 8.5V13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** border/frame glyph for the edge-sort tool */
function EdgeSortIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
    </svg>
  );
}

interface Dyn {
  x: number;
  y: number;
  rot: number;
  placed: boolean;
  z: number;
}

interface JigSave {
  seed: number;
  img: string | null;
  pieces: Dyn[];
  hintsUsed: number;
  assistsUsed: string[];
}

export function JigsawGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const { rows, cols, rotate } = GRID[difficulty];
  const pieceCount = rows * cols;
  const L = useMemo(() => layout(rows, cols), [rows, cols]);

  const saved =
    savedState && Array.isArray((savedState as JigSave).pieces)
      ? (savedState as JigSave)
      : undefined;

  // static geometry — edges + homes are fully determined by the seed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle: Puzzle = useMemo(
    () => makePuzzle({ seed: saved?.seed, rows, cols, rotate }),
    [difficulty]
  );

  // unique id so multiple game instances never share SVG clip/gradient ids
  const inst = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  // dynamic per-piece state (position/rotation/placed/z)
  const [dyn, setDyn] = useState<Dyn[]>(() =>
    saved
      ? saved.pieces.map((d) => ({ ...d }))
      : puzzle.pieces.map((p, i) => ({
          x: p.currentPos.x,
          y: p.currentPos.y,
          rot: p.rotation,
          placed: false,
          z: i
        }))
  );
  const dynRef = useRef(dyn);
  const commitDyn = useCallback((next: Dyn[]) => {
    dynRef.current = next;
    setDyn(next);
  }, []);
  const commitOne = useCallback(
    (id: number, patch: Partial<Dyn>) => {
      const next = dynRef.current.map((v, i) => (i === id ? { ...v, ...patch } : v));
      dynRef.current = next;
      setDyn(next);
    },
    []
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [justPlaced, setJustPlaced] = useState<Set<number>>(() => new Set());
  const [won, setWon] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);

  // image / manifest
  const [img, setImg] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<string | null>(saved?.img ?? null);
  const [imgReady, setImgReady] = useState(false);

  // layout metrics
  const [cell, setCell] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const done = useRef(false);
  const zRef = useRef(pieceCount);
  const drag = useRef<{ id: number; pid: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(
    null
  );
  const lastTap = useRef<{ id: number; t: number } | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.preview ? ['preview'] : [])])
  );

  // refs read by stable pointer handlers
  const cellRef = useRef(cell);
  cellRef.current = cell;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const rotateRef = useRef(rotate);
  rotateRef.current = rotate;
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const placedCount = useMemo(() => dyn.filter((d) => d.placed).length, [dyn]);

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.preview) assistsUsed.current.add('preview');
  }, [assists.preview]);

  // ----- image loading (reuses the shared /public/puzzles manifest) -----
  useEffect(() => {
    let alive = true;
    const base = import.meta.env.BASE_URL;
    const use = (file: string | null) => {
      if (!file) {
        if (alive) {
          setImg(null);
          setImgReady(true);
        }
        return;
      }
      const url = `${base}puzzles/${file}`;
      const im = new Image();
      im.onload = () => {
        if (!alive) return;
        setImg(url);
        setImgFile(file);
        setImgReady(true);
      };
      im.onerror = () => {
        if (!alive) return;
        setImg(null);
        setImgReady(true);
      };
      im.src = url;
    };
    if (saved?.img) {
      use(saved.img);
    } else {
      fetch(`${base}puzzles/manifest.json`)
        .then((r) => r.json())
        .then((d: { images?: string[] }) => {
          if (!alive) return;
          const imgs = d.images ?? [];
          use(imgs.length ? imgs[Math.floor(Math.random() * imgs.length)] : null);
        })
        .catch(() => {
          if (alive) use(null);
        });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- responsive sizing -----
  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const w = wrap.clientWidth;
      if (w <= 0) return;
      const rect = wrap.getBoundingClientRect();
      const availH = Math.max(240, window.innerHeight - rect.top - BOTTOM_RESERVE);
      const byW = w / L.stageW;
      const byH = availH / L.stageH;
      const next = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(byW, byH)));
      setCell(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [L]);

  // ----- stats + snapshot -----
  const liveScore = placedCount * 8 * MULT[difficulty];
  useEffect(() => {
    if (done.current) return;
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { pieces: pieceCount, placed: placedCount, image: imgFile ?? 'pattern' }
    });
  }, [liveScore, hintsUsed, placedCount, pieceCount, imgFile, events]);

  useEffect(() => {
    registerSnapshot(
      (): JigSave => ({
        seed: puzzle.seed,
        img: imgFile,
        pieces: dyn.map((d) => ({ ...d })),
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
    const score = Math.max(
      100,
      pieceCount * 10 * MULT[difficulty] + timeBonus - hintsUsed * HINT_PENALTY
    );
    events.onFinish({
      outcome: 'won',
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { pieces: pieceCount, placed: pieceCount, timeMs: elapsedRef.current * 1000 }
    });
  }, [difficulty, pieceCount, hintsUsed, events]);

  const bounce = useCallback((id: number) => {
    setJustPlaced((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    window.setTimeout(() => {
      setJustPlaced((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }, 460);
  }, []);

  const checkWin = useCallback(() => {
    if (done.current) return;
    if (dynRef.current.every((d) => d.placed)) {
      setSelected(null);
      window.setTimeout(() => setWon(true), 60);
      finish();
    }
  }, [finish]);

  const placeHome = useCallback(
    (id: number) => {
      const tl = homeBoxTL(puzzle.pieces[id].correctPos, L);
      commitOne(id, { x: tl.x, y: tl.y, rot: 0, placed: true, z: 0 });
      bounce(id);
    },
    [puzzle, L, commitOne, bounce]
  );

  const trySnap = useCallback(
    (id: number) => {
      const d = dynRef.current[id];
      if (d.placed || d.rot % 360 !== 0) return;
      const cx = d.x + BOX / 2;
      const cy = d.y + BOX / 2;
      const home = homeCenter(puzzle.pieces[id].correctPos, L);
      if (Math.hypot(cx - home.x, cy - home.y) < SNAP_TOL) {
        placeHome(id);
        sfx.place();
        checkWin();
      }
    },
    [puzzle, L, placeHome, checkWin]
  );

  const rotatePiece = useCallback(
    (id: number) => {
      if (pausedRef.current || done.current) return;
      const d = dynRef.current[id];
      if (d.placed) return;
      commitOne(id, { rot: (d.rot + 90) % 360 });
      sfx.tap();
      trySnap(id);
    },
    [commitOne, trySnap]
  );

  // ----- pointer drag (rect/coord math, pointer capture, no elementFromPoint) -----
  const onDown = useCallback(
    (e: ReactPointerEvent, id: number) => {
      if (pausedRef.current || done.current) return;
      const d = dynRef.current[id];
      if (d.placed) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      drag.current = { id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: d.x, oy: d.y, moved: false };
      commitOne(id, { z: ++zRef.current });
      if (rotateRef.current) setSelected(id);
    },
    [commitOne]
  );

  // pointer moves coalesce to one React commit per frame — a 120 Hz
  // pointer otherwise floods renders of the whole piece field (QA-LEDGER
  // drag rule)
  const movePending = useRef<{ id: number; x: number; y: number } | null>(null);
  const moveRaf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(moveRaf.current), []);

  const onMove = useCallback(
    (e: ReactPointerEvent, id: number) => {
      const dr = drag.current;
      if (!dr || dr.id !== id) return;
      const c = cellRef.current || 1;
      if (!dr.moved && Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) > 4) dr.moved = true;
      movePending.current = { id, x: dr.ox + (e.clientX - dr.sx) / c, y: dr.oy + (e.clientY - dr.sy) / c };
      if (moveRaf.current) return;
      moveRaf.current = requestAnimationFrame(() => {
        moveRaf.current = 0;
        const m = movePending.current;
        if (m && drag.current?.id === m.id) commitOne(m.id, { x: m.x, y: m.y });
      });
    },
    [commitOne]
  );

  const onUp = useCallback(
    (e: ReactPointerEvent, id: number) => {
      const dr = drag.current;
      if (!dr || dr.id !== id) return;
      // flush the last coalesced position so the drop lands under the finger
      const m = movePending.current;
      if (m && m.id === id) commitOne(id, { x: m.x, y: m.y });
      movePending.current = null;
      drag.current = null;
      try {
        (e.currentTarget as Element).releasePointerCapture(dr.pid);
      } catch {
        /* pointer already released */
      }
      if (!dr.moved) {
        // a tap: select, and rotate on a quick double-tap (rotation tiers)
        if (rotateRef.current) {
          const now = performance.now();
          if (lastTap.current && lastTap.current.id === id && now - lastTap.current.t < 350) {
            lastTap.current = null;
            rotatePiece(id);
          } else {
            lastTap.current = { id, t: now };
            setSelected(id);
          }
        }
        return;
      }
      trySnap(id);
    },
    [rotatePiece, trySnap]
  );

  // ----- assists -----
  const useHint = useCallback(() => {
    if (pausedRef.current || done.current || !assists.hint) return;
    const unplaced = puzzle.pieces.filter((p) => !dynRef.current[p.id].placed);
    if (!unplaced.length) return;
    const p = unplaced[Math.floor(Math.random() * unplaced.length)];
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    placeHome(p.id);
    checkWin();
  }, [assists.hint, puzzle, placeHome, checkWin]);

  const edgeSort = useCallback(() => {
    if (pausedRef.current || done.current || !assists.edgeSort) return;
    assistsUsed.current.add('edgeSort');
    const edges = puzzle.pieces.filter((p) => !dynRef.current[p.id].placed && isBorderPiece(p, rows, cols));
    if (!edges.length) return;
    const next = [...dynRef.current];
    edges.forEach((p, k) => {
      const rr = Math.floor(k / cols);
      const cc = k % cols;
      next[p.id] = {
        ...next[p.id],
        x: L.boardX + cc - PAD,
        y: L.bandTop + rr * PILE_STEP_Y,
        rot: rotate ? next[p.id].rot : 0,
        z: ++zRef.current
      };
    });
    commitDyn(next);
    sfx.tap();
  }, [assists.edgeSort, puzzle, rows, cols, L, rotate, commitDyn]);

  const rotateSelected = useCallback(() => {
    if (selected == null) return;
    rotatePiece(selected);
  }, [selected, rotatePiece]);

  // ----- derived pixel geometry -----
  const paths = useMemo(() => puzzle.pieces.map((p) => piecePath(p.edges, cell)), [puzzle, cell]);
  const boxPx = cell * BOX;
  const boardWpx = cols * cell;
  const boardHpx = rows * cell;
  const padPx = cell * PAD;
  const stageW = L.stageW * cell;
  const stageH = L.stageH * cell;

  const showTools = rotate || assists.edgeSort || assists.hint;
  const ready = imgReady && cell > 0;

  return (
    <div className={`jigsaw ${paused ? 'board-hidden' : ''} ${won ? 'jig-won' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Placed: <b>{placedCount} / {pieceCount}</b>
        </span>
        {rotate && !won && (
          <span className="info-item">
            Tap a piece, then <b>Rotate</b>
          </span>
        )}
      </div>

      <div className="jig-wrap" ref={wrapRef}>
        {ready && (
          <div className="jig-stage" style={{ width: stageW, height: stageH }}>
            <div
              className="jig-board"
              style={{
                left: L.boardX * cell,
                top: L.boardY * cell,
                width: boardWpx,
                height: boardHpx
              }}
            >
              {assists.preview &&
                (img ? (
                  <img className="jig-ghost" src={img} alt="" draggable={false} />
                ) : (
                  <div className="jig-ghost jig-ghost-fallback" />
                ))}
              <div
                className="jig-slots"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`
                }}
              >
                {Array.from({ length: pieceCount }, (_, i) => (
                  <span key={i} className="jig-slot" />
                ))}
              </div>
              {won && img && <img className="jig-clean" src={img} alt="" draggable={false} />}
            </div>

            {puzzle.pieces.map((p) => {
              const d = dyn[p.id];
              return (
                <JigPiece
                  key={p.id}
                  id={p.id}
                  pathD={paths[p.id]}
                  boxPx={boxPx}
                  img={img}
                  clipId={`jc-${inst}-${p.id}`}
                  gradId={`jg-${inst}-${p.id}`}
                  imgX={padPx - p.col * cell}
                  imgY={padPx - p.row * cell}
                  boardWpx={boardWpx}
                  boardHpx={boardHpx}
                  x={d.x * cell}
                  y={d.y * cell}
                  rot={d.rot}
                  zi={d.placed ? 1 : 2 + d.z}
                  placed={d.placed}
                  selected={selected === p.id}
                  bounce={justPlaced.has(p.id)}
                  onDown={onDown}
                  onMove={onMove}
                  onUp={onUp}
                />
              );
            })}
          </div>
        )}
      </div>

      {showTools && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            {rotate && (
              <PadTool silent onClick={rotateSelected} disabled={selected == null}>
                <RotateIcon />
                <span>Rotate</span>
              </PadTool>
            )}
            {assists.edgeSort && (
              <PadTool silent onClick={edgeSort}>
                <EdgeSortIcon />
                <span>Edge sort</span>
              </PadTool>
            )}
            {assists.hint && (
              <PadTool silent onClick={useHint}>
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

interface JigPieceProps {
  id: number;
  pathD: string;
  boxPx: number;
  img: string | null;
  clipId: string;
  gradId: string;
  imgX: number;
  imgY: number;
  boardWpx: number;
  boardHpx: number;
  x: number;
  y: number;
  rot: number;
  zi: number;
  placed: boolean;
  selected: boolean;
  bounce: boolean;
  onDown: (e: ReactPointerEvent, id: number) => void;
  onMove: (e: ReactPointerEvent, id: number) => void;
  onUp: (e: ReactPointerEvent, id: number) => void;
}

const JigPiece = memo(function JigPiece({
  id,
  pathD,
  boxPx,
  img,
  clipId,
  gradId,
  imgX,
  imgY,
  boardWpx,
  boardHpx,
  x,
  y,
  rot,
  zi,
  placed,
  selected,
  bounce,
  onDown,
  onMove,
  onUp
}: JigPieceProps) {
  const style: CSSProperties = {
    left: x,
    top: y,
    width: boxPx,
    height: boxPx,
    transform: `rotate(${rot}deg)`,
    zIndex: zi
  };
  return (
    <div
      className={[
        'jig-piece',
        placed ? 'placed' : '',
        selected ? 'sel' : '',
        bounce ? 'bounce' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onPointerDown={(e) => onDown(e, id)}
      onPointerMove={(e) => onMove(e, id)}
      onPointerUp={(e) => onUp(e, id)}
      onPointerCancel={(e) => onUp(e, id)}
    >
      <svg width={boxPx} height={boxPx} viewBox={`0 0 ${boxPx} ${boxPx}`}>
        <defs>
          <clipPath id={clipId}>
            <path d={pathD} />
          </clipPath>
          {!img && (
            <linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              x1={imgX}
              y1={imgY}
              x2={imgX + boardWpx}
              y2={imgY + boardHpx}
            >
              {FALLBACK_STOPS.map((c, i) => (
                <stop
                  key={i}
                  offset={`${(i / (FALLBACK_STOPS.length - 1)) * 100}%`}
                  style={{ stopColor: c }}
                />
              ))}
            </linearGradient>
          )}
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {img ? (
            <image
              href={img}
              x={imgX}
              y={imgY}
              width={boardWpx}
              height={boardHpx}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <rect x={imgX} y={imgY} width={boardWpx} height={boardHpx} fill={`url(#${gradId})`} />
          )}
        </g>
        <path d={pathD} className="jig-outline" fill="none" />
      </svg>
    </div>
  );
});
