import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, DropletIcon, TttCrossIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { AQU_CONFIG, generateAquarium, tankRowSpans, type AquariumPuzzle } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = { easy: 180, medium: 300, hard: 480, pro: 660, extreme: 900 };
const CELL_PTS = 10;
const ERR_PENALTY = 15;
const HINT_PENALTY = 40;
const WIN_BONUS = 150;

const ROW_STAGGER_MS = 55;
const POUR_MS = 420;

interface AquSave {
  puzzle: AquariumPuzzle;
  levels: number[];
  marks: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

interface FlowAnim {
  tick: number;
  kind: 'fill' | 'drain';
  delays: Record<number, number>;
}

/** Animated water surface: one periodic wave per cell — every crest cell
 *  runs the same loop, so waves line up across a tank. */
function Wave() {
  return (
    <svg className="aqu-wave" viewBox="0 0 80 8" preserveAspectRatio="none" aria-hidden>
      <path d="M0 5 Q5 2 10 5 T20 5 T30 5 T40 5 T50 5 T60 5 T70 5 T80 5 L80 8 L0 8 Z" />
    </svg>
  );
}

export function AquariumGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as AquSave | undefined;
  const cfg = AQU_CONFIG[difficulty];

  // the shell remounts via key for a new game, so generating once is safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo<AquariumPuzzle>(
    () => saved?.puzzle ?? generateAquarium({ size: cfg.size, minTank: cfg.minTank, maxTank: cfg.maxTank }),
    []
  );
  const size = puzzle.size;
  const n = size * size;

  const spans = useMemo(() => tankRowSpans(size, puzzle.tankOf, puzzle.tankCount), [size, puzzle]);
  const tankCells = useMemo(() => {
    const out: number[][] = Array.from({ length: puzzle.tankCount }, () => []);
    for (let i = 0; i < n; i++) out[puzzle.tankOf[i]].push(i);
    return out;
  }, [puzzle, n]);

  // thick tank walls: each cell draws its top/left wall where the tank
  // changes (box-shadow on an overlay span — zero layout impact)
  const walls = useMemo(() => {
    const out: (string | undefined)[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = puzzle.tankOf[i];
      const parts: string[] = [];
      if (Math.floor(i / size) > 0 && puzzle.tankOf[i - size] !== t) parts.push('inset 0 3px 0 var(--aqu-line)');
      if (i % size > 0 && puzzle.tankOf[i - 1] !== t) parts.push('inset 3px 0 0 var(--aqu-line)');
      out[i] = parts.length > 0 ? parts.join(', ') : undefined;
    }
    return out;
  }, [puzzle, n, size]);

  const [levels, setLevels] = useState<number[]>(() => saved?.levels ?? spans.rMax.map((r) => r + 1));
  const [marks, setMarks] = useState<number[]>(() => saved?.marks ?? []);
  const [markMode, setMarkMode] = useState(false);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [anim, setAnim] = useState<FlowAnim | null>(null);
  const [glowTank, setGlowTank] = useState<number | null>(null);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const tickRef = useRef(0);
  const animTimer = useRef<number | null>(null);
  const errTimer = useRef<number | null>(null);

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists.lineCheck) assistsUsed.current.add('lineCheck');
  }, [assists.lineCheck]);
  useEffect(() => {
    if (assists.tankGlow) assistsUsed.current.add('tankGlow');
  }, [assists.tankGlow]);

  useEffect(
    () => () => {
      if (animTimer.current) clearTimeout(animTimer.current);
      if (errTimer.current) clearTimeout(errTimer.current);
    },
    []
  );

  const water = useMemo(() => puzzle.tankOf.map((t, i) => Math.floor(i / size) >= levels[t]), [puzzle, levels, size]);
  const { rowFill, colFill, waterCount, correct } = useMemo(() => {
    const rf = new Array<number>(size).fill(0);
    const cf = new Array<number>(size).fill(0);
    let total = 0;
    let good = 0;
    for (let i = 0; i < n; i++) {
      if (!water[i]) continue;
      rf[Math.floor(i / size)]++;
      cf[i % size]++;
      total++;
      if (puzzle.water[i]) good++;
    }
    return { rowFill: rf, colFill: cf, waterCount: total, correct: good };
  }, [water, puzzle, n, size]);
  const totalWater = useMemo(() => puzzle.rowCounts.reduce((a, b) => a + b, 0), [puzzle]);
  const solved = useMemo(() => water.every((w, i) => w === puzzle.water[i]), [water, puzzle]);

  const markSet = useMemo(() => new Set(marks), [marks]);

  // line-check assist: auto-X every dry cell whose filling (plus the water
  // physics forces beneath it) would overflow a row or column count
  const autoX = useMemo(() => {
    const out = new Set<number>();
    if (!assists.lineCheck || done.current) return out;
    const rowAdd = new Array<number>(size).fill(0);
    const colAdd = new Array<number>(size).fill(0);
    for (let i = 0; i < n; i++) {
      const t = puzzle.tankOf[i];
      const r = Math.floor(i / size);
      const L = levels[t];
      if (r >= L) continue; // already water
      rowAdd.fill(0);
      colAdd.fill(0);
      for (const j of tankCells[t]) {
        const rj = Math.floor(j / size);
        if (rj >= r && rj < L) {
          rowAdd[rj]++;
          colAdd[j % size]++;
        }
      }
      for (let x = 0; x < size; x++) {
        if (
          (rowAdd[x] > 0 && rowFill[x] + rowAdd[x] > puzzle.rowCounts[x]) ||
          (colAdd[x] > 0 && colFill[x] + colAdd[x] > puzzle.colCounts[x])
        ) {
          out.add(i);
          break;
        }
      }
    }
    return out;
  }, [assists.lineCheck, levels, rowFill, colFill, puzzle, n, size, tankCells]);

  const liveScore = Math.max(
    0,
    correct * CELL_PTS * MULT[difficulty] - errors * ERR_PENALTY - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { water: waterCount, target: totalWater, tanks: puzzle.tankCount }
    });
  }, [liveScore, errors, hintsUsed, waterCount, totalWater, puzzle.tankCount, events]);

  useEffect(() => {
    if (!solved || done.current) return;
    done.current = true;
    // no sfx here — GameShell plays the win sound
    const score = Math.max(
      0,
      totalWater * CELL_PTS * MULT[difficulty] +
        WIN_BONUS * MULT[difficulty] +
        Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty] -
        errors * ERR_PENALTY -
        hintsUsed * HINT_PENALTY
    );
    events.onFinish({
      outcome: 'won',
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { water: totalWater, tanks: puzzle.tankCount }
    });
  }, [solved, errors, hintsUsed, difficulty, events, totalWater, puzzle.tankCount]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      levels,
      marks,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const startFlow = useCallback((kind: 'fill' | 'drain', delays: Record<number, number>) => {
    tickRef.current++;
    setAnim({ tick: tickRef.current, kind, delays });
    if (animTimer.current) clearTimeout(animTimer.current);
    let maxDelay = 0;
    for (const d of Object.values(delays)) if (d > maxDelay) maxDelay = d;
    animTimer.current = window.setTimeout(() => setAnim(null), maxDelay + POUR_MS);
  }, []);

  /** Set a tank's water level, cascading the fill/drain row by row. */
  const applyLevel = useCallback(
    (t: number, newLevel: number, viaHint: boolean) => {
      const cur = levels[t];
      if (newLevel === cur) return;
      const kind: 'fill' | 'drain' = newLevel < cur ? 'fill' : 'drain';
      const lo = Math.min(newLevel, cur);
      const hi = Math.max(newLevel, cur) - 1;
      const delays: Record<number, number> = {};
      for (const i of tankCells[t]) {
        const r = Math.floor(i / size);
        if (r < lo || r > hi) continue;
        // water pours in bottom-up and drains top-down
        delays[i] = (kind === 'fill' ? hi - r : r - lo) * ROW_STAGGER_MS;
      }

      if (kind === 'fill' && !viaHint) {
        // overflowing a row/column that was fine before counts as an error
        const rowAdd = new Array<number>(size).fill(0);
        const colAdd = new Array<number>(size).fill(0);
        for (const key of Object.keys(delays)) {
          const i = Number(key);
          rowAdd[Math.floor(i / size)]++;
          colAdd[i % size]++;
        }
        let newlyOver = false;
        for (let x = 0; x < size && !newlyOver; x++) {
          if (rowAdd[x] > 0 && rowFill[x] <= puzzle.rowCounts[x] && rowFill[x] + rowAdd[x] > puzzle.rowCounts[x])
            newlyOver = true;
          if (colAdd[x] > 0 && colFill[x] <= puzzle.colCounts[x] && colFill[x] + colAdd[x] > puzzle.colCounts[x])
            newlyOver = true;
        }
        if (newlyOver) {
          setErrors((e) => e + 1);
          if (errTimer.current) clearTimeout(errTimer.current);
          errTimer.current = window.setTimeout(() => sfx.error(), 180);
        }
      }

      const next = [...levels];
      next[t] = newLevel;
      setLevels(next);
      // water washes marks away
      setMarks((prev) => prev.filter((m) => Math.floor(m / size) < next[puzzle.tankOf[m]]));
      startFlow(kind, delays);
      sfx.splash();
    },
    [levels, tankCells, size, rowFill, colFill, puzzle, startFlow]
  );

  const tapCell = useCallback(
    (i: number) => {
      if (paused || done.current) return;
      const t = puzzle.tankOf[i];
      const r = Math.floor(i / size);
      if (markMode) {
        if (r >= levels[t]) return; // can't mark water
        sfx.tap();
        setMarks((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
        return;
      }
      if (r >= levels[t]) applyLevel(t, r + 1, false);
      else applyLevel(t, r, false);
    },
    [paused, puzzle, size, markMode, levels, applyLevel]
  );

  const hint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const wrong: number[] = [];
    for (let t = 0; t < puzzle.tankCount; t++) if (levels[t] !== puzzle.levels[t]) wrong.push(t);
    if (wrong.length === 0) return;
    const t = wrong[Math.floor(Math.random() * wrong.length)];
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    sfx.hint();
    applyLevel(t, puzzle.levels[t], true);
  }, [paused, assists.hint, puzzle, levels, applyLevel]);

  const pressCell = useCallback(
    (i: number) => {
      if (assists.tankGlow && !paused && !done.current) setGlowTank(puzzle.tankOf[i]);
    },
    [assists.tankGlow, paused, puzzle]
  );
  const clearGlow = useCallback(() => setGlowTank(null), []);
  useEffect(() => {
    window.addEventListener('pointerup', clearGlow);
    window.addEventListener('pointercancel', clearGlow);
    return () => {
      window.removeEventListener('pointerup', clearGlow);
      window.removeEventListener('pointercancel', clearGlow);
    };
  }, [clearGlow]);

  const clueClass = useCallback(
    (fill: number, count: number) =>
      fill > count ? ' over' : fill === count ? (assists.lineCheck ? ' ok done' : ' ok') : '',
    [assists.lineCheck]
  );

  const cells = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);

  return (
    <div className={`aquarium ${paused ? 'board-hidden' : ''} ${solved ? 'aqu-won' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Water: <b>{waterCount} / {totalWater}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Errors: <b>{errors}</b>
        </span>
      </div>

      <div className="aqu-wrap" style={{ '--aqu-n': size } as React.CSSProperties}>
        <div className="aqu-corner" aria-hidden />
        <div className="aqu-cols" aria-hidden>
          {puzzle.colCounts.map((count, c) => (
            <span key={c} className={`aqu-clue${clueClass(colFill[c], count)}`}>
              {count}
            </span>
          ))}
        </div>
        <div className="aqu-rows" aria-hidden>
          {puzzle.rowCounts.map((count, r) => (
            <span key={r} className={`aqu-clue${clueClass(rowFill[r], count)}`}>
              {count}
            </span>
          ))}
        </div>
        <div className="aqu-board" onContextMenu={(e) => e.preventDefault()}>
          {cells.map((i) => {
            const r = Math.floor(i / size);
            const c = i % size;
            const t = puzzle.tankOf[i];
            const isWater = r >= levels[t];
            const crest = r === levels[t];
            const d = anim && anim.delays[i] !== undefined ? anim : null;
            const marked = markSet.has(i);
            const auto = !marked && autoX.has(i);
            return (
              <button
                key={i}
                className={`aqu-cell${c === size - 1 ? ' aqu-lc' : ''}${r === size - 1 ? ' aqu-lr' : ''}`}
                onClick={() => tapCell(i)}
                onPointerDown={() => pressCell(i)}
                onPointerLeave={clearGlow}
                aria-label={`Row ${r + 1}, column ${c + 1}${isWater ? ', water' : marked ? ', marked dry' : ''}`}
              >
                {isWater && (
                  <span
                    key={`w${d ? d.tick : ''}`}
                    className={`aqu-fill${crest ? ' aqu-crest' : ''}${d && d.kind === 'fill' ? ' aqu-pour' : ''}`}
                    style={d && d.kind === 'fill' ? { animationDelay: `${d.delays[i]}ms` } : undefined}
                  >
                    {crest && <Wave />}
                  </span>
                )}
                {!isWater && d && d.kind === 'drain' && (
                  <span key={`d${d.tick}`} className="aqu-drainfx" style={{ animationDelay: `${d.delays[i]}ms` }} />
                )}
                {!isWater && (marked || auto) && (
                  <svg className={`aqu-x${auto ? ' auto' : ''}`} viewBox="0 0 24 24" aria-hidden>
                    <path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" fill="none" />
                  </svg>
                )}
                {glowTank === t && <span className="aqu-glowfx" aria-hidden />}
                {walls[i] && <span className="aqu-walls" style={{ boxShadow: walls[i] }} aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          <PadTool active={!markMode} onClick={() => setMarkMode(false)}>
            <DropletIcon />
            <span>Water</span>
          </PadTool>
          <PadTool active={markMode} onClick={() => setMarkMode(true)}>
            <TttCrossIcon />
            <span>Mark</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={hint}>
              <BulbIcon />
              <span>Level</span>
            </PadTool>
          )}
        </div>
        <p className="aqu-hint-text">
          Tap a cell to pour water up to that row · tap water to drain it · marks note dry cells
        </p>
      </div>
    </div>
  );
}
