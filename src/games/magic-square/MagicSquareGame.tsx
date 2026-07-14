import { useMemo, useRef, useState, useEffect, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, GridIcon, TargetIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  allLines,
  generateMagic,
  isMagic,
  magicConstant,
  MAGIC_CONFIG,
  remainingNumbers,
  type Grid
} from './logic/generator';
import { computeScore } from './logic/scoring';

/** Passive assists count as "help used" for the whole game while enabled. */
const PASSIVE_ASSISTS = ['lineSums', 'targetGlow'];

interface MagicSave {
  n: number;
  solution: number[];
  givens: number[];
  values: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** A small diagonal marker (↘ / ↗) drawn inline so it follows the text color. */
function DiagMark({ anti }: { anti?: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden
      style={anti ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M2.5 2.5 L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 5.5 L9 9 L5.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MagicSquareGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = MAGIC_CONFIG[difficulty];
  const saved =
    savedState &&
    Array.isArray((savedState as MagicSave).solution) &&
    Array.isArray((savedState as MagicSave).givens) &&
    Array.isArray((savedState as MagicSave).values)
      ? (savedState as MagicSave)
      : undefined;

  const { n, solution, givens } = useMemo(
    () =>
      saved
        ? { n: saved.n, solution: saved.solution, givens: saved.givens }
        : generateMagic({ n: cfg.n, clues: cfg.clues }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );

  const M = magicConstant(n);
  const LINES = useMemo(() => allLines(n), [n]);
  const givenMask = useMemo(() => givens.map((v) => v !== 0), [givens]);

  const [values, setValues] = useState<Grid>(() => (saved ? [...saved.values] : [...givens]));
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [flash, setFlash] = useState<{ cells: number[]; kind: 'good' | 'bad' }>({ cells: [], kind: 'good' });
  const [won, setWon] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ v: number; x: number; y: number } | null>(null);

  const done = useRef(false);
  const flashTimer = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ value: number; startX: number; startY: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const filled = useMemo(
    () => values.reduce((a, v, i) => a + (v !== 0 && !givenMask[i] ? 1 : 0), 0),
    [values, givenMask]
  );
  const tray = useMemo(() => remainingNumbers(values, n), [values, n]);

  // continuous stats (so abandons capture the latest state)
  useEffect(() => {
    for (const a of PASSIVE_ASSISTS) if (assists[a]) assistsUsed.current.add(a);
    events.onStats({
      score: computeScore({ difficulty, filled, errors, hintsUsed, won: false, elapsedSec: elapsedRef.current }),
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { n, magicConstant: M }
    });
  }, [filled, errors, hintsUsed, assists, difficulty, n, M, events]);

  useEffect(() => {
    registerSnapshot(() => ({
      n,
      solution,
      givens,
      values,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // per-line running status (for the gutters + glow)
  const lineInfo = useMemo(
    () =>
      LINES.map((l) => {
        let sum = 0;
        let complete = true;
        for (const c of l.cells) {
          const v = values[c];
          sum += v;
          if (v === 0) complete = false;
        }
        return { ...l, sum, complete, good: complete && sum === M };
      }),
    [LINES, values, M]
  );

  // target glow: an empty cell that is the ONLY gap in a line and whose
  // needed value is still available in the tray is forced — nudge the player.
  const glowCells = useMemo(() => {
    const out = new Set<number>();
    if (!assists.targetGlow) return out;
    const traySet = new Set(tray);
    for (const l of lineInfo) {
      const empties = l.cells.filter((c) => values[c] === 0);
      if (empties.length !== 1) continue;
      const need = M - l.sum;
      if (need >= 1 && need <= n * n && traySet.has(need)) out.add(empties[0]);
    }
    return out;
  }, [assists.targetGlow, lineInfo, values, tray, M, n]);

  function triggerFlash(cells: number[], kind: 'good' | 'bad') {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash({ cells, kind });
    flashTimer.current = window.setTimeout(() => setFlash({ cells: [], kind }), 520);
  }

  function finish(filledCount: number, errs: number, hints: number) {
    if (done.current) return;
    done.current = true;
    const s = computeScore({ difficulty, filled: filledCount, errors: errs, hintsUsed: hints, won: true, elapsedSec: elapsedRef.current });
    events.onFinish({
      outcome: 'won',
      score: s,
      errors: errs,
      hintsUsed: hints,
      assistsUsed: [...assistsUsed.current],
      extra: { n, magicConstant: M }
    });
  }

  /** Apply a new grid, detecting newly-completed lines for feedback + win. */
  function commit(next: Grid, opts: { viaHint?: boolean; hints?: number } = {}) {
    const hints = opts.hints ?? hintsUsed;
    const newBad: number[] = [];
    const newGood: number[] = [];
    for (const l of LINES) {
      let beforeComplete = true;
      let afterComplete = true;
      let afterSum = 0;
      for (const c of l.cells) {
        if (values[c] === 0) beforeComplete = false;
        if (next[c] === 0) afterComplete = false;
        afterSum += next[c];
      }
      if (afterComplete && !beforeComplete) {
        if (afterSum === M) newGood.push(...l.cells);
        else newBad.push(...l.cells);
      }
    }

    setValues(next);

    let errs = errors;
    if (!opts.viaHint && newBad.length) {
      errs = errors + 1;
      setErrors(errs);
    }

    if (newBad.length) {
      triggerFlash(newBad, 'bad');
      sfx.error();
    } else if (newGood.length) {
      triggerFlash(newGood, 'good');
      sfx.pop();
    } else {
      if (opts.viaHint) sfx.hint();
      else sfx.place();
    }

    if (isMagic(next, n)) {
      setWon(true);
      const filledCount = next.reduce((a, v, i) => a + (v !== 0 && !givenMask[i] ? 1 : 0), 0);
      finish(filledCount, errs, hints);
    }
  }

  /** Place `value` at `cell`, clearing it from any previous (non-given) home. */
  function placeValue(cell: number, value: number) {
    if (paused || done.current || givenMask[cell] || values[cell] === value) return;
    const next = [...values];
    const prev = next.indexOf(value);
    if (prev >= 0 && !givenMask[prev]) next[prev] = 0;
    next[cell] = value;
    commit(next);
  }

  function tapCell(cell: number) {
    if (paused || done.current) return;
    if (givenMask[cell]) {
      setSelected(null);
      return;
    }
    if (selected != null) {
      const v = selected;
      setSelected(null);
      placeValue(cell, v);
    } else if (values[cell] !== 0) {
      // pick the number back up (and keep it selected for a quick re-drop)
      const v = values[cell];
      const next = [...values];
      next[cell] = 0;
      setValues(next);
      setSelected(v);
      sfx.tap();
    }
  }

  function useHint() {
    if (paused || done.current || !assists.hint) return;
    const next = [...values];
    const empties: number[] = [];
    for (let i = 0; i < n * n; i++) if (next[i] === 0 && !givenMask[i]) empties.push(i);
    let placed = false;
    if (empties.length) {
      const traySet = new Set(remainingNumbers(next, n));
      const free = empties.find((c) => traySet.has(solution[c]));
      if (free != null) {
        next[free] = solution[free];
        placed = true;
      } else {
        const c = empties[0];
        const v = solution[c];
        const w = next.indexOf(v);
        if (w >= 0 && !givenMask[w]) next[w] = 0;
        next[c] = v;
        placed = true;
      }
    } else {
      const c1 = [...Array(n * n).keys()].find((c) => !givenMask[c] && next[c] !== solution[c]);
      if (c1 != null) {
        const v = solution[c1];
        const c2 = next.indexOf(v);
        const tmp = next[c1];
        next[c1] = v;
        if (c2 >= 0) next[c2] = tmp;
        placed = true;
      }
    }
    if (!placed) return;
    const h = hintsUsed + 1;
    setHintsUsed(h);
    assistsUsed.current.add('hint');
    setSelected(null);
    commit(next, { viaHint: true, hints: h });
  }

  /* ---------- drag-from-tray (pointer events + rect math) ---------- */

  function cellFromPoint(x: number, y: number): number | null {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = rect.width / n;
    const c = Math.floor((x - rect.left) / cs);
    const r = Math.floor((y - rect.top) / cs);
    if (c < 0 || c >= n || r < 0 || r >= n) return null;
    return r * n + c;
  }

  function chipPointerDown(e: React.PointerEvent, value: number) {
    if (paused || done.current) return;
    suppressClick.current = false;
    dragRef.current = { value, startX: e.clientX, startY: e.clientY, moved: false, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function chipPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 8) return;
    d.moved = true;
    setGhost({ v: d.value, x: e.clientX, y: e.clientY });
    setDragOver(cellFromPoint(e.clientX, e.clientY));
  }
  function chipPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    setGhost(null);
    setDragOver(null);
    if (!d) return;
    if (d.moved) {
      suppressClick.current = true;
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (cell != null && !givenMask[cell]) placeValue(cell, d.value);
      else sfx.tap();
    }
  }
  function chipClick(value: number) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (paused || done.current) return;
    sfx.tap();
    setSelected((s) => (s === value ? null : value));
  }

  /* ---------- render ---------- */

  const showSums = !!assists.lineSums;
  const rowInfo = lineInfo.slice(0, n);
  const colInfo = lineInfo.slice(n, 2 * n);
  const diagInfo = lineInfo[2 * n];
  const antiInfo = lineInfo[2 * n + 1];

  const sumClass = (info: { complete: boolean; good: boolean }) =>
    'mgs-sum' + (info.complete ? (info.good ? ' good' : ' bad') : '');

  const cellNodes = values.map((v, i) => {
    const isGiven = givenMask[i];
    const classes = ['mgs-cell'];
    if (isGiven) classes.push('given');
    else if (v !== 0) classes.push('placed');
    else classes.push('empty');
    if (!isGiven && v === 0 && selected != null) classes.push('droppable');
    if (glowCells.has(i)) classes.push('glow');
    if (dragOver === i && !isGiven) classes.push('drag-over');
    if (flash.cells.includes(i)) classes.push(flash.kind === 'good' ? 'good-flash' : 'bad-flash');
    const r = Math.floor(i / n);
    const c = i % n;
    return (
      <button
        key={i}
        className={classes.join(' ')}
        style={{ '--wd': r + c } as CSSProperties}
        onClick={() => tapCell(i)}
        aria-label={`Cell row ${r + 1} column ${c + 1}${v ? `, ${v}` : ', empty'}`}
      >
        {v !== 0 ? v : ''}
      </button>
    );
  });

  return (
    <div className={`mgs-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item mgs-magic">
          Magic sum <b>{M}</b>
        </span>
        <span className="info-item">
          Placed <b>{filled} / {n * n - givenMask.filter(Boolean).length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors <b>{errors}</b>
        </span>
      </div>

      <div className={`mgs-arena n${n} ${showSums ? 'with-sums' : ''}`}>
        <div
          ref={boardRef}
          className={`mgs-board ${won ? 'mgs-won' : ''}`}
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        >
          {cellNodes}
        </div>

        {showSums && (
          <>
            <div className="mgs-rowsums" style={{ gridTemplateRows: `repeat(${n}, 1fr)` }}>
              {rowInfo.map((info) => (
                <span key={info.id} className={sumClass(info)}>
                  {info.sum}
                </span>
              ))}
            </div>
            <div className="mgs-colsums" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
              {colInfo.map((info) => (
                <span key={info.id} className={sumClass(info)}>
                  {info.sum}
                </span>
              ))}
            </div>
            <div className="mgs-corner">
              <span className={sumClass(diagInfo)}>
                <DiagMark />
                {diagInfo.sum}
              </span>
              <span className={sumClass(antiInfo)}>
                <DiagMark anti />
                {antiInfo.sum}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool active={showSums} onClick={() => onToggleAssist('lineSums', !showSums)}>
            <GridIcon />
            <span>Sums</span>
          </PadTool>
          <PadTool active={!!assists.targetGlow} onClick={() => onToggleAssist('targetGlow', !assists.targetGlow)}>
            <TargetIcon />
            <span>Glow</span>
          </PadTool>
        </div>

        <div className="mgs-tray" role="list" aria-label="Number tray">
          {tray.length === 0 ? (
            <span className="mgs-tray-empty">All numbers placed — check the sums.</span>
          ) : (
            tray.map((v) => (
              <button
                key={v}
                role="listitem"
                className={`mgs-chip ${selected === v ? 'selected' : ''}`}
                onPointerDown={(e) => chipPointerDown(e, v)}
                onPointerMove={chipPointerMove}
                onPointerUp={chipPointerUp}
                onPointerCancel={chipPointerUp}
                onClick={() => chipClick(v)}
              >
                {v}
              </button>
            ))
          )}
        </div>
      </div>

      {ghost && (
        <div className="mgs-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden>
          {ghost.v}
        </div>
      )}
    </div>
  );
}
