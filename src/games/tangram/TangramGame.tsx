import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, PadTool } from '../../platform/components/ui';
import {
  type PieceKind,
  type Pt,
  type Target,
  transform,
  transformPlacement,
  centroid,
  bounds,
  isSolved,
  matchesSolutionCell,
  silhouetteLoops
} from './logic/geometry';
import { allPuzzles, pickPuzzle, puzzleTarget } from './logic/puzzles';
import {
  type PieceCore,
  MULT,
  PAR_SEC,
  HINT_PENALTY,
  WIN_BASE,
  SNAP_RADIUS,
  SNAP_BOOST,
  baseCentroid,
  scatterPieces,
  snapPos
} from './logic/play';

interface Piece extends PieceCore {
  id: number;
}

interface TangramSave {
  puzzleId: string;
  pieces: PieceCore[];
  selected: number | null;
  hintsUsed: number;
  assistsUsed: string[];
}

export function TangramGame({
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
    savedState && Array.isArray((savedState as TangramSave).pieces) && (savedState as TangramSave).puzzleId
      ? (savedState as TangramSave)
      : undefined;

  const gen = useMemo(() => {
    const puzzle = saved
      ? allPuzzles().find((p) => p.id === saved.puzzleId) ?? pickPuzzle(difficulty, Math.random())
      : pickPuzzle(difficulty, Math.random());
    const target = puzzleTarget(puzzle);
    const pieces: Piece[] = saved
      ? saved.pieces.map((p, i) => ({ id: i, ...p }))
      : scatterPieces(puzzle, difficulty).map((p, i) => ({ id: i, ...p }));
    // arena from union of target + scattered pieces, padded — the pad is
    // deliberately small so the figure fills the canvas instead of
    // shrinking into it
    const polys = [...target.polys, ...pieces.map((p) => transform(p.kind, p.rot, p.flip, p.pos))];
    const bb = bounds(polys);
    const pad = 0.55;
    const arena = { x: bb.minX - pad, y: bb.minY - pad, w: bb.maxX - bb.minX + pad * 2, h: bb.maxY - bb.minY + pad * 2 };
    const loops = silhouetteLoops(target.polys);
    const silPath = loops.map((lp) => 'M' + lp.map((p) => `${round(p.x)},${round(p.y)}`).join('L') + 'Z').join(' ');
    return { puzzle, target, pieces, arena, silPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const target: Target = gen.target;
  const [pieces, setPieces] = useState<Piece[]>(() => gen.pieces.map((p) => ({ ...p })));
  const [selected, setSelected] = useState<number | null>(saved?.selected ?? null);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  /** the snap-settle micro-animation: the just-dropped piece glides the
      last stretch into its clicked position instead of teleporting */
  const [settle, setSettle] = useState<{ id: number; dx: number; dy: number; n: number } | null>(null);

  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const commit = (next: Piece[]) => {
    piecesRef.current = next;
    setPieces(next);
  };
  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; startWorld: Pt; startPos: Pt; moved: boolean; wasSelected: boolean } | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.edgeHints ? ['edgeHints'] : []),
      ...(assists.snapStrong ? ['snapStrong'] : [])
    ])
  );
  useEffect(() => {
    if (assists.edgeHints) assistsUsed.current.add('edgeHints');
  }, [assists.edgeHints]);
  useEffect(() => {
    if (assists.snapStrong) assistsUsed.current.add('snapStrong');
  }, [assists.snapStrong]);

  const snapRadius = SNAP_RADIUS[difficulty] + (assists.snapStrong ? SNAP_BOOST : 0);

  // which pieces sit exactly on a target cell (for the green "locked" look)
  const placedFlags = useMemo(
    () => pieces.map((p) => matchesSolutionCell(transform(p.kind, p.rot, p.flip, p.pos), target)),
    [pieces, target]
  );
  const piecesPlaced = placedFlags.filter(Boolean).length;

  useEffect(() => {
    events.onStats({
      score,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { piecesPlaced, timeMs: elapsedRef.current * 1000 }
    });
  }, [score, hintsUsed, piecesPlaced, events]);

  const finishIfSolved = useCallback(
    (next: Piece[], hints: number) => {
      if (done.current) return false;
      const polys = next.map((p) => transform(p.kind, p.rot, p.flip, p.pos));
      if (!isSolved(polys, target)) return false;
      done.current = true;
      setSolved(true);
      const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      const final = Math.max(0, WIN_BASE * MULT[difficulty] + bonus - hints * HINT_PENALTY);
      setScore(final);
      sfx.pop();
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: 0,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { piecesPlaced: 7, timeMs: elapsedRef.current * 1000, figure: gen.puzzle.name }
      });
      return true;
    },
    [target, difficulty, events, gen.puzzle.name]
  );

  // ---- coordinate helpers ---------------------------------------------------
  const toWorld = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const { x, y, w, h } = gen.arena;
    const scale = Math.min(rect.width / w, rect.height / h);
    const offX = (rect.width - w * scale) / 2;
    const offY = (rect.height - h * scale) / 2;
    return { x: x + (clientX - rect.left - offX) / scale, y: y + (clientY - rect.top - offY) / scale };
  };

  const clampToArena = (kind: PieceKind, rot: number, flip: boolean, pos: Pt): Pt => {
    const poly = transform(kind, rot, flip, pos);
    const b = bounds([poly]);
    const a = gen.arena;
    let dx = 0;
    let dy = 0;
    if (b.minX < a.x) dx = a.x - b.minX;
    if (b.maxX > a.x + a.w) dx = a.x + a.w - b.maxX;
    if (b.minY < a.y) dy = a.y - b.minY;
    if (b.maxY > a.y + a.h) dy = a.y + a.h - b.maxY;
    return { x: pos.x + dx, y: pos.y + dy };
  };

  /** snap a piece so a vertex clicks onto a solution vertex; else tidy to 0.5 */
  const snapPiece = useCallback(
    (p: Piece): Piece => ({ ...p, pos: snapPos(p.kind, p.rot, p.flip, p.pos, target, snapRadius) }),
    [target, snapRadius]
  );

  // ---- pointer interaction --------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const w = toWorld(e.clientX, e.clientY);
    // topmost piece under the point (later in array = on top)
    let hit = -1;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (pointInPoly(w, transform(p.kind, p.rot, p.flip, p.pos))) {
        hit = i;
        break;
      }
    }
    if (hit === -1) {
      setSelected(null);
      return;
    }
    const p = pieces[hit];
    svgRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id: p.id, startWorld: w, startPos: p.pos, moved: false, wasSelected: selected === p.id };
    // bring to front for z-order
    const next = [...pieces.filter((q) => q.id !== p.id), p];
    commit(next);
    setSelected(p.id);
  };

  // pointer moves are coalesced to one React commit per frame — a 120 Hz
  // pointer otherwise floods state updates and the drag feels rough
  const pendingWorld = useRef<Pt | null>(null);
  const rafId = useRef(0);
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  const applyDragTo = (w: Pt) => {
    const d = drag.current;
    if (!d) return;
    const dx = w.x - d.startWorld.x;
    const dy = w.y - d.startWorld.y;
    if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08) d.moved = true;
    commit(
      piecesRef.current.map((q) =>
        q.id === d.id ? { ...q, pos: clampToArena(q.kind, q.rot, q.flip, { x: d.startPos.x + dx, y: d.startPos.y + dy }) } : q
      )
    );
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || paused || done.current) return;
    pendingWorld.current = toWorld(e.clientX, e.clientY);
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      if (pendingWorld.current && drag.current) applyDragTo(pendingWorld.current);
    });
  };

  const endDrag = () => {
    const d = drag.current;
    if (d && !done.current && !paused && pendingWorld.current) applyDragTo(pendingWorld.current);
    pendingWorld.current = null;
    drag.current = null;
    if (!d || done.current || paused) return;
    if (!d.moved) {
      // tap on an already-selected piece → rotate it 45°
      if (d.wasSelected) rotateSelected(d.id);
      return;
    }
    const before = piecesRef.current.find((q) => q.id === d.id)!;
    const snapped = snapPiece(before);
    const next = piecesRef.current.map((q) => (q.id === d.id ? snapped : q));
    commit(next);
    // glide the snap distance instead of teleporting
    const sx = before.pos.x - snapped.pos.x;
    const sy = before.pos.y - snapped.pos.y;
    if (Math.hypot(sx, sy) > 0.02 && !done.current) {
      setSettle((s) => ({ id: d.id, dx: sx, dy: sy, n: (s?.n ?? 0) + 1 }));
    }
    // a lock onto the correct cell clicks louder than a plain drop
    const lockedNow = matchesSolutionCell(transform(snapped.kind, snapped.rot, snapped.flip, snapped.pos), target);
    if (lockedNow) sfx.pop();
    else sfx.place();
    finishIfSolved(next, hintsUsed);
  };

  // ---- transforms -----------------------------------------------------------
  const rotateSelected = (id?: number) => {
    const sid = id ?? selected;
    if (sid === null || paused || done.current) return;
    const next = piecesRef.current.map((q) => {
      if (q.id !== sid) return q;
      const nrot = (q.rot + 1) % 8;
      const c = centroid(transform(q.kind, q.rot, q.flip, q.pos));
      const c2 = baseCentroid(q.kind, nrot, q.flip);
      const pos = clampToArena(q.kind, nrot, q.flip, { x: c.x - c2.x, y: c.y - c2.y });
      return snapPiece({ ...q, rot: nrot, pos });
    });
    commit(next);
    sfx.tap();
    finishIfSolved(next, hintsUsed);
  };

  const flipSelected = () => {
    if (selected === null || paused || done.current) return;
    const next = piecesRef.current.map((q) => {
      if (q.id !== selected) return q;
      const c = centroid(transform(q.kind, q.rot, q.flip, q.pos));
      const c2 = baseCentroid(q.kind, q.rot, !q.flip);
      const pos = clampToArena(q.kind, q.rot, !q.flip, { x: c.x - c2.x, y: c.y - c2.y });
      return snapPiece({ ...q, flip: !q.flip, pos });
    });
    commit(next);
    sfx.tap();
    finishIfSolved(next, hintsUsed);
  };

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    // find a piece not yet correctly placed and drop it onto its home cell
    const cur = piecesRef.current;
    const idx = cur.findIndex((p) => !matchesSolutionCell(transform(p.kind, p.rot, p.flip, p.pos), target));
    if (idx === -1) return;
    assistsUsed.current.add('hint');
    const h = hintsUsed + 1;
    setHintsUsed(h);
    sfx.hint();
    const p = cur[idx];
    const placed: Piece = { ...p, rot: p.home.rot, flip: p.home.flip, pos: p.home.pos };
    const next = cur.map((q) => (q.id === p.id ? placed : q));
    commit(next);
    setSelected(p.id);
    finishIfSolved(next, h);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      puzzleId: gen.puzzle.id,
      pieces: piecesRef.current.map(({ kind, slot, home, rot, flip, pos }) => ({ kind, slot, home, rot, flip, pos })),
      selected,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // ---- render ---------------------------------------------------------------
  const { arena, silPath } = gen;
  const selPiece = pieces.find((p) => p.id === selected) ?? null;

  return (
    <div className={`tangram ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Figure: <b>{gen.puzzle.name}</b>
        </span>
        <span className="info-item">
          Placed: <b>{piecesPlaced}/7</b>
        </span>
      </div>

      <svg
        ref={svgRef}
        className={`tgr-canvas ${solved ? 'solved' : ''}`}
        viewBox={`${arena.x} ${arena.y} ${arena.w} ${arena.h}`}
        style={{ aspectRatio: `${arena.w} / ${arena.h}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* transparent backdrop so taps on empty space register (deselect) */}
        <rect x={arena.x} y={arena.y} width={arena.w} height={arena.h} fill="transparent" />
        {/* half-unit dot lattice: quiet spatial reference for lining pieces up */}
        <defs>
          <pattern
            id="tgr-dots"
            x={0}
            y={0}
            width={0.5}
            height={0.5}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={0} cy={0} r={0.028} className="tgr-dot" />
          </pattern>
        </defs>
        <rect
          x={arena.x}
          y={arena.y}
          width={arena.w}
          height={arena.h}
          fill="url(#tgr-dots)"
          pointerEvents="none"
        />
        {/* target silhouette */}
        <path className="tgr-silhouette" d={silPath} fillRule="evenodd" />
        {assists.edgeHints &&
          !solved &&
          target.solution.map((s, i) => (
            <polygon key={`eh${i}`} className="tgr-edgehint" points={ptsStr(transformPlacement(s))} />
          ))}

        {/* pieces */}
        {pieces.map((p, i) => {
          const poly = transform(p.kind, p.rot, p.flip, p.pos);
          const facePts = ptsStr(poly);
          const edgePts = ptsStr(poly.map((q) => ({ x: q.x, y: q.y + 0.13 })));
          const good = placedFlags[i] ?? false;
          const settling = !solved && settle?.id === p.id;
          return (
            <g
              key={settling ? `${p.id}-s${settle.n}` : p.id}
              className={`tgr-piece c${p.slot} ${selected === p.id ? 'sel' : ''} ${good ? 'good' : ''} ${
                solved ? 'won' : ''
              } ${settling ? 'settling' : ''}`}
              style={{
                ['--i' as string]: i,
                ...(settling
                  ? { ['--sx' as string]: `${round(settle.dx)}px`, ['--sy' as string]: `${round(settle.dy)}px` }
                  : null)
              }}
            >
              <polygon className="tgr-edge" points={edgePts} />
              <polygon className="tgr-face" points={facePts} />
            </g>
          );
        })}

        {/* selection rotation handle */}
        {selPiece && !solved && (
          <Handle piece={selPiece} />
        )}
      </svg>

      <div className="game-tools fx-card">
        <div className="sudoku-controls tgr-tools">
          <PadTool silent onClick={() => rotateSelected()} disabled={selected === null} aria-label="Rotate">
            <RotateGlyph />
            <span>Rotate</span>
          </PadTool>
          <PadTool silent onClick={flipSelected} disabled={selected === null} aria-label="Flip">
            <FlipGlyph />
            <span>Flip</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint} aria-label="Hint">
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool
            active={!!assists.edgeHints}
            onClick={() => onToggleAssist('edgeHints', !assists.edgeHints)}
            aria-label="Guides"
          >
            <GuideGlyph />
            <span>Guides</span>
          </PadTool>
        </div>
      </div>
    </div>
  );
}

// ---- small render helpers ---------------------------------------------------
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
function ptsStr(poly: Pt[]): string {
  return poly.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}
function pointInPoly(pt: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function Handle({ piece }: { piece: Piece }) {
  const poly = transform(piece.kind, piece.rot, piece.flip, piece.pos);
  const c = centroid(poly);
  const b = bounds([poly]);
  const top = b.minY - 0.35;
  return (
    <g className="tgr-handle" aria-hidden>
      <line x1={round(c.x)} y1={round(b.minY)} x2={round(c.x)} y2={round(top)} className="tgr-handle-stem" />
      <circle cx={round(c.x)} cy={round(top)} r={0.22} className="tgr-handle-knob" />
    </g>
  );
}

function RotateGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}
function FlipGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v18" />
      <path d="M7 8 3 12l4 4" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  );
}
function GuideGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3h18v18H3z" />
      <path d="M3 12h18M12 3v18" strokeDasharray="2 2" />
    </svg>
  );
}
