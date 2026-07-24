import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generateBoard,
  minimalSolution,
  pressCells,
  type LightsOutBoard
} from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_PTS = 100;
const EFFICIENCY_PTS = 300;
const HINT_PENALTY = 25;

/** no perfect undo icon in the design set — inline monochrome SVG instead */
const UndoGlyph = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);

/** small outward chevron for the wrap-around edge markers (extreme) */
function WrapChevron({ rotate }: { rotate: number }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <path d="m8 5 8 7-8 7" />
    </svg>
  );
}

interface LoSave {
  size: number;
  wrap: boolean;
  par: number;
  lights: number[];
  history: number[];
  hintsUsed: number;
  assistsUsed: string[];
}

interface FlipWave {
  stamp: number;
  origin: number;
  cells: number[];
}

export function LightsOutGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // ignore stale saves that lack the expected shape (board is rebuilt fresh)
  const saved =
    savedState && Array.isArray((savedState as LoSave).lights)
      ? (savedState as LoSave)
      : undefined;

  const board = useMemo<LightsOutBoard>(() => {
    if (saved) {
      return {
        size: saved.size,
        wrap: saved.wrap,
        seed: 0,
        lights: saved.lights.slice(),
        par: saved.par,
        solution: []
      };
    }
    return generateBoard(difficulty);
    // the shell remounts via key for every new game — generate exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { size, wrap, par } = board;
  const n = size * size;

  const [lights, setLights] = useState<number[]>(() => board.lights.slice());
  const [history, setHistory] = useState<number[]>(() => saved?.history ?? []);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [wave, setWave] = useState<FlipWave | null>(null);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));

  const lit = useMemo(() => lights.reduce((a, v) => a + v, 0), [lights]);
  const won = lit === 0;
  const presses = history.length;

  // passive assist: the live optimal-remaining meter counts as help
  // whenever it is on (including toggled on mid-game)
  const parMeterOn = !!assists['par-meter'];
  useEffect(() => {
    if (parMeterOn && !done.current) assistsUsed.current.add('par-meter');
  }, [parMeterOn]);

  const bestFromHere = useMemo(() => {
    if (!parMeterOn || won) return null;
    return minimalSolution(lights, size, wrap)?.length ?? null;
  }, [parMeterOn, won, lights, size, wrap]);

  const liveScore = Math.max(
    0,
    Math.round(60 * MULT[difficulty] * (1 - lit / n)) - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { presses, par, lightsOn: lit }
    });
  }, [liveScore, hintsUsed, presses, par, lit, events]);

  const finish = useCallback(
    (pressesMade: number, h: number) => {
      if (done.current) return;
      done.current = true;
      const efficiency = Math.round(
        EFFICIENCY_PTS * MULT[difficulty] * Math.min(1, par / Math.max(1, pressesMade))
      );
      events.onFinish({
        outcome: 'won',
        score: Math.max(0, WIN_PTS * MULT[difficulty] + efficiency - h * HINT_PENALTY),
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { presses: pressesMade, par }
      });
    },
    [difficulty, par, events]
  );

  const flip = useCallback(
    (i: number): number[] => {
      const cells = pressCells(i, size, wrap);
      const next = lights.slice();
      for (const c of cells) next[c] ^= 1;
      setLights(next);
      setHintCell(null);
      setWave((w) => ({ stamp: (w?.stamp ?? 0) + 1, origin: i, cells }));
      return next;
    },
    [lights, size, wrap]
  );

  const press = useCallback(
    (i: number) => {
      if (paused || done.current) return;
      const next = flip(i);
      const nh = [...history, i];
      setHistory(nh);
      const remaining = next.reduce((a, v) => a + v, 0);
      if (remaining === 0) {
        finish(nh.length, hintsUsed);
      } else {
        // pitch rises as the board empties — progress you can hear
        playNote(340 + Math.round((1 - remaining / n) * 480), 90, 'triangle');
      }
    },
    [paused, flip, history, hintsUsed, n, finish]
  );

  const undo = useCallback(() => {
    if (paused || done.current || history.length === 0) return;
    // toggling is an involution: re-pressing the last cell reverts it
    assistsUsed.current.add('undo');
    flip(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }, [paused, history, flip]);

  const hint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const sol = minimalSolution(lights, size, wrap);
    if (!sol || sol.length === 0) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setHintCell(sol[0]);
    sfx.hint();
  }, [paused, assists.hint, lights, size, wrap]);

  useEffect(() => {
    registerSnapshot(() => ({
      size,
      wrap,
      par,
      lights: [...lights],
      history: [...history],
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const cells = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);
  const overPar = presses > par;
  const hasTools = !!(assists.undo || assists.hint);

  return (
    <div className={`lo-game ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className={`info-item${overPar ? ' bad' : ''}`}>
          Presses: <b>{presses}</b>
        </span>
        <span className="info-item">
          Par: <b>{par}</b>
        </span>
        {parMeterOn && !won && (
          <span className="info-item">
            Best left: <b>{bestFromHere ?? '–'}</b>
          </span>
        )}
        <span className="info-item">
          Lit: <b>{lit}</b>
        </span>
        {wrap && (
          <span className="info-item">
            Edges <b>wrap</b>
          </span>
        )}
      </div>

      <div className={`lo-frame${wrap ? ' lo-wrapped' : ''}`}>
        {wrap && (
          <>
            <span className="lo-wrap-arrow lo-n" aria-hidden>
              <WrapChevron rotate={-90} />
            </span>
            <span className="lo-wrap-arrow lo-s" aria-hidden>
              <WrapChevron rotate={90} />
            </span>
            <span className="lo-wrap-arrow lo-w" aria-hidden>
              <WrapChevron rotate={180} />
            </span>
            <span className="lo-wrap-arrow lo-e" aria-hidden>
              <WrapChevron rotate={0} />
            </span>
          </>
        )}
        <div
          className={`lo-board${won && presses > 0 ? ' lo-done' : ''}`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {cells.map((i) => {
            const on = lights[i] === 1;
            const inWave = wave !== null && wave.cells.includes(i);
            const cls = [
              'lo-cell',
              on ? 'on' : '',
              inWave ? (wave.stamp % 2 ? 'lo-fb' : 'lo-fa') : '',
              hintCell === i ? 'lo-hint-cell' : ''
            ]
              .filter(Boolean)
              .join(' ');
            const style: CSSProperties = {
              '--lo-d': inWave && i !== wave.origin ? '55ms' : '0ms',
              '--lo-w': `${(Math.floor(i / size) + (i % size)) * 45}ms`
            } as CSSProperties;
            return (
              <button
                key={i}
                className={cls}
                style={style}
                onClick={() => press(i)}
                aria-label={`Light ${Math.floor(i / size) + 1},${(i % size) + 1} ${on ? 'on' : 'off'}`}
              />
            );
          })}
        </div>
      </div>

      {hasTools && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            {assists.undo && (
              <PadTool onClick={undo} disabled={presses === 0 || won}>
                {UndoGlyph}
                <span>Undo</span>
              </PadTool>
            )}
            {assists.hint && (
              <PadTool silent onClick={hint} disabled={won}>
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
          </div>
          <p className="lo-hint-text">
            Tap a light to flip it and its neighbours — turn every light off in as few presses as
            you can.
          </p>
        </div>
      )}
    </div>
  );
}
