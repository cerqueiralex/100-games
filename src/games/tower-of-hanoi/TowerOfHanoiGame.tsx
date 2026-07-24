import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon, RestartIcon, UndoIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  optimalMoves,
  nextOptimalMove,
  stacksToState,
  type Move
} from './logic/hanoi';

interface Layout {
  discs: number;
  pegs: number;
}

const CONFIG: Record<Difficulty, Layout> = {
  easy: { discs: 3, pegs: 3 },
  medium: { discs: 4, pegs: 3 },
  hard: { discs: 5, pegs: 3 },
  pro: { discs: 6, pegs: 3 },
  extreme: { discs: 7, pegs: 4 }
};

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 90, medium: 150, hard: 240, pro: 360, extreme: 300 };
const WIN_BONUS = 1000;
const HINT_PENALTY = 60;
const MOVE_THRESHOLD = 7; // px before a press becomes a drag

/** A stack of graduated discs on the source peg, bottom (largest) → top. */
function makeInitial(discs: number, pegs: number, source = 0): number[][] {
  const arr: number[][] = Array.from({ length: pegs }, () => []);
  for (let s = discs; s >= 1; s--) arr[source].push(s);
  return arr;
}

interface Lifted {
  peg: number;
  disc: number;
}

interface HanoiSave {
  pegs: number[][];
  moves: number;
  history: Move[];
  lifted: Lifted | null;
  hintsUsed: number;
  errors: number;
  assistsUsed: string[];
}

interface Landing {
  peg: number;
  disc: number;
  dx: number;
  ly: number;
  key: number;
}

export function TowerOfHanoiGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const { discs: n, pegs: pegCount } = CONFIG[difficulty];
  const targetPeg = pegCount - 1;
  const par = useMemo(() => optimalMoves(n, pegCount), [n, pegCount]);

  const saved =
    savedState && Array.isArray((savedState as HanoiSave).pegs)
      ? (savedState as HanoiSave)
      : undefined;

  const [pegs, setPegs] = useState<number[][]>(() =>
    saved ? saved.pegs.map((s) => [...s]) : makeInitial(n, pegCount)
  );
  const [moves, setMoves] = useState(saved?.moves ?? 0);
  const [history, setHistory] = useState<Move[]>(() => (saved ? [...saved.history] : []));
  const [lifted, setLifted] = useState<Lifted | null>(saved?.lifted ?? null);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [score, setScore] = useState(0);

  // transient presentation-only state
  const [dragging, setDragging] = useState(false);
  const [hoverPeg, setHoverPeg] = useState<number | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  // synchronous mirrors so pointer handlers compute OUTSIDE setState updaters
  const pegsRef = useRef(pegs);
  const liftedRef = useRef(lifted);
  const movesRef = useRef(moves);
  const historyRef = useRef(history);
  const errorsRef = useRef(errors);
  const hintsRef = useRef(hintsUsed);
  const commitPegs = (next: number[][]) => {
    pegsRef.current = next;
    setPegs(next);
  };

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0 });
  // simple drag physics: the held nut spring-chases the pointer each frame
  // and tilts with its lag, so it swings like something with real weight
  const liftedEl = useRef<HTMLSpanElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const phys = useRef({ x: 0, y: 0, tilt: 0 });
  const rafRef = useRef(0);

  const applyPhys = () => {
    const el = liftedEl.current;
    if (!el) return;
    const p = phys.current;
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    el.style.transform = `translate(-50%, -50%) rotate(${p.tilt.toFixed(2)}deg) scale(1.07)`;
  };

  const stopPhysics = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    pointerRef.current = null;
  };

  const startPhysics = () => {
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const target = pointerRef.current;
      if (!target) return;
      const p = phys.current;
      const dx = target.x - p.x;
      p.x += dx * 0.3;
      p.y += (target.y - p.y) * 0.3;
      const tiltTarget = Math.max(-15, Math.min(15, dx * 0.32));
      p.tilt += (tiltTarget - p.tilt) * 0.22;
      applyPhys();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // re-renders mid-drag (hover peg changes) must not wipe the loop's
  // inline position — re-apply it before paint
  useLayoutEffect(() => {
    if (pointerRef.current) applyPhys();
  });
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.legalGlow ? ['legalGlow'] : [])])
  );

  // passive assist: counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.legalGlow) assistsUsed.current.add('legalGlow');
  }, [assists.legalGlow]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves, par, discs: n, pegs: pegCount }
    });
  }, [score, errors, hintsUsed, moves, par, n, pegCount, events]);

  const finish = useCallback(
    (finalMoves: number) => {
      if (done.current) return;
      done.current = true;
      const mult = MULT[difficulty];
      const eff = Math.round(600 * mult * (par / Math.max(finalMoves, par)));
      const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult;
      const final = Math.max(
        0,
        Math.round(WIN_BONUS * mult + eff + timeBonus - hintsRef.current * HINT_PENALTY)
      );
      setScore(final);
      setCelebrate(true);
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: finalMoves, par, discs: n, pegs: pegCount }
      });
    },
    [difficulty, par, n, pegCount, events]
  );

  /* ---------- geometry ---------- */

  const pegFromPoint = (clientX: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * pegCount);
    return Math.max(0, Math.min(pegCount - 1, col));
  };

  const boardRel = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // disc width as a fraction of ONE peg column (largest ≈ 0.96, smallest ≈ 0.4)
  const discFrac = useCallback(
    (size: number) => (n <= 1 ? 0.9 : 0.42 + (0.54 * (size - 1)) / (n - 1)),
    [n]
  );

  /* ---------- move resolution ---------- */

  const putDown = () => {
    liftedRef.current = null;
    setLifted(null);
  };

  const legalDrop = (target: number, disc: number): boolean => {
    const stack = pegsRef.current[target];
    const top = stack.length ? stack[stack.length - 1] : Infinity;
    return disc < top;
  };

  const commitMove = (from: number, to: number) => {
    const next = pegsRef.current.map((s) => [...s]);
    const disc = next[from].pop();
    if (disc === undefined) return;
    next[to].push(disc);

    const rect = boardRef.current?.getBoundingClientRect();
    let dx = 0;
    let ly = -140;
    if (rect) {
      const pitch = rect.width / pegCount;
      dx = (from - to) * pitch;
      ly = -(rect.height * 0.72);
    }

    const nextMoves = movesRef.current + 1;
    const nextHistory = [...historyRef.current, { from, to }];
    commitPegs(next);
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    putDown();
    setHintMove(null);
    setLanding({ peg: to, disc, dx, ly, key: nextMoves });
    // land with a pitch that tracks disc size (big disc → low thunk)
    playNote(300 + (n - disc) * 55, 90, 'triangle');

    if (next[targetPeg].length === n) finish(nextMoves);
  };

  const attemptDrop = (target: number) => {
    const lift = liftedRef.current;
    if (!lift) return;
    if (target === lift.peg) {
      putDown(); // dropping back on the source cancels
      return;
    }
    if (legalDrop(target, lift.disc)) {
      commitMove(lift.peg, target);
    } else {
      const nextErrors = errorsRef.current + 1;
      errorsRef.current = nextErrors;
      setErrors(nextErrors);
      setShakeKey((k) => k + 1); // shake the held disc; it stays lifted for a retry
      sfx.error();
    }
  };

  /* ---------- pointer handlers (tap-tap OR drag) ---------- */

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const peg = pegFromPoint(e.clientX);
    if (peg === null) return;
    if (liftedRef.current === null) {
      const stack = pegsRef.current[peg];
      if (stack.length === 0) return; // empty peg — nothing to pick up
      const disc = stack[stack.length - 1];
      liftedRef.current = { peg, disc };
      setLifted({ peg, disc });
      drag.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY };
      boardRef.current?.setPointerCapture(e.pointerId);
      setHintMove(null);
      sfx.tap();
    } else {
      // a disc is already held (tap-to-pick) → this press picks the target
      drag.current.active = false;
      attemptDrop(peg);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || liftedRef.current === null) return;
    if (!drag.current.moved) {
      const dist = Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY);
      if (dist > MOVE_THRESHOLD) {
        drag.current.moved = true;
        // seed the spring at the tap-hover spot so the nut glides into the hand
        const rect = boardRef.current?.getBoundingClientRect();
        phys.current = {
          x: rect ? ((liftedRef.current.peg + 0.5) / pegCount) * rect.width : 0,
          y: 22,
          tilt: 0
        };
        pointerRef.current = boardRel(e.clientX, e.clientY);
        setDragging(true);
        startPhysics();
      }
    }
    if (drag.current.moved) {
      pointerRef.current = boardRel(e.clientX, e.clientY);
      setHoverPeg(pegFromPoint(e.clientX));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const wasMoved = drag.current.moved;
    drag.current.active = false;
    boardRef.current?.releasePointerCapture?.(e.pointerId);
    stopPhysics();
    setDragging(false);
    setHoverPeg(null);
    if (wasMoved) {
      const target = pegFromPoint(e.clientX);
      if (target === null || target === liftedRef.current?.peg) putDown();
      else attemptDrop(target);
    }
    // a pure tap keeps the disc lifted for tap-then-tap play
  };

  const onPointerCancel = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    stopPhysics();
    setDragging(false);
    setHoverPeg(null);
    putDown();
  };

  /* ---------- tools ---------- */

  const restart = () => {
    if (done.current) return;
    const fresh = makeInitial(n, pegCount);
    commitPegs(fresh);
    movesRef.current = 0;
    setMoves(0);
    historyRef.current = [];
    setHistory([]);
    putDown();
    setLanding(null);
    setHintMove(null);
  };

  const undo = () => {
    if (paused || done.current || !assists.undo) return;
    const hist = historyRef.current;
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    const next = pegsRef.current.map((s) => [...s]);
    const disc = next[last.to].pop();
    if (disc === undefined) return;
    next[last.from].push(disc);
    commitPegs(next);
    const nextMoves = Math.max(0, movesRef.current - 1);
    movesRef.current = nextMoves;
    setMoves(nextMoves);
    const nextHistory = hist.slice(0, -1);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    putDown();
    setLanding(null);
    setHintMove(null);
    assistsUsed.current.add('undo');
    playNote(300 + (n - disc) * 55, 80, 'sine');
  };

  const showHint = () => {
    if (paused || done.current || !assists.hint) return;
    const mv = nextOptimalMove(stacksToState(pegsRef.current, n), pegCount, targetPeg);
    if (!mv) return;
    assistsUsed.current.add('hint');
    const h = hintsRef.current + 1;
    hintsRef.current = h;
    setHintsUsed(h);
    setHintMove(mv);
    putDown();
    sfx.hint();
  };

  /* ---------- save / resume ---------- */

  useEffect(() => {
    registerSnapshot(() => ({
      pegs,
      moves,
      history,
      lifted,
      hintsUsed,
      errors,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- derived render helpers ---------- */

  const validTargets = useMemo(() => {
    const set = new Set<number>();
    if (!lifted || !assists.legalGlow) return set;
    for (let p = 0; p < pegCount; p++) {
      if (p === lifted.peg) continue;
      const stack = pegs[p];
      const top = stack.length ? stack[stack.length - 1] : Infinity;
      if (lifted.disc < top) set.add(p);
    }
    return set;
  }, [lifted, pegs, pegCount, assists.legalGlow]);

  const liftedStyle: CSSProperties | undefined = useMemo(() => {
    if (!lifted) return undefined;
    const w = `${(discFrac(lifted.disc) * 100) / pegCount}%`;
    // while dragging, position comes from the physics loop's inline styles
    if (dragging) return { width: w };
    // tap mode: hover above the source peg
    return { left: `${((lifted.peg + 0.5) / pegCount) * 100}%`, top: '4px', width: w, transform: 'translateX(-50%)' };
  }, [lifted, dragging, pegCount, discFrac]);

  return (
    <div className={`toh ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Moves: <b>{moves}</b>
        </span>
        <span className="info-item">
          Par: <b>{par}</b>
        </span>
        <span className="info-item">
          Discs: <b>{n}</b>
        </span>
      </div>

      <div className="toh-preview">
        {moves === 0 ? (
          <span className="chip">Move the whole tower to the last peg</span>
        ) : (
          <span className={`chip ${moves <= par ? 'good' : ''}`}>
            {moves} {moves === 1 ? 'move' : 'moves'} · par {par}
          </span>
        )}
      </div>

      <div
        ref={boardRef}
        className="toh-board"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {pegs.map((stack, p) => {
          // the lifted disc leaves its peg's rendered stack
          const shown =
            lifted && lifted.peg === p ? stack.slice(0, stack.length - 1) : stack;
          const topFirst = [...shown].reverse(); // DOM top→bottom
          const glow = validTargets.has(p);
          const hovered = hoverPeg === p && glow;
          const hintFrom = hintMove?.from === p;
          const hintTo = hintMove?.to === p;
          const isTarget = p === targetPeg;
          return (
            <div
              key={p}
              className={[
                'toh-peg',
                glow ? 'glow' : '',
                hovered ? 'hover' : '',
                hintFrom ? 'hint-from' : '',
                hintTo ? 'hint-to' : '',
                isTarget ? 'target' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="toh-post" aria-hidden />
              <div className="toh-stack">
                {topFirst.map((size, k) => {
                  const isNewTop =
                    landing && landing.peg === p && k === 0 && stack.length === shown.length;
                  return (
                    <span
                      key={`${size}-${landing && isNewTop ? landing.key : 'x'}`}
                      className={[
                        'toh-disc',
                        `toh-d${size}`,
                        isNewTop ? 'landing' : '',
                        celebrate && isTarget ? 'celebrate' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        {
                          width: `${discFrac(size) * 100}%`,
                          ...(isNewTop
                            ? ({ '--dx': `${landing!.dx}px`, '--ly': `${landing!.ly}px` } as CSSProperties)
                            : {}),
                          ...(celebrate && isTarget
                            ? ({ animationDelay: `${(shown.length - 1 - k) * 70}ms` } as CSSProperties)
                            : {})
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {lifted && (
          <span
            key={`lift-${shakeKey}`}
            ref={liftedEl}
            className={`toh-disc toh-d${lifted.disc} toh-lifted ${shakeKey ? 'shake' : ''} ${
              dragging ? 'dragging' : 'held'
            }`}
            style={liftedStyle}
            aria-hidden
          />
        )}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool silent onClick={restart} disabled={moves === 0 || done.current}>
            <RestartIcon />
            <span>Restart</span>
          </PadTool>
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={history.length === 0 || done.current}>
              <UndoIcon />
              <span>Undo</span>
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
    </div>
  );
}

