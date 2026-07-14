import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generatePipes,
  rot4,
  isSolved,
  floodWatered,
  networkDistance,
  DIRS,
  N,
  E,
  S,
  W,
  type PipesPuzzle
} from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_PTS = 100;
const EFFICIENCY_PTS = 300;
const HINT_PENALTY = 30;
const PAR_SEC: Record<Difficulty, number> = {
  easy: 90,
  medium: 150,
  hard: 210,
  pro: 300,
  extreme: 420
};

/** endpoint of each arm — reaches the tile edge with a small overshoot so
    connected pipes bridge the inter-tile gap and read as one continuous run */
const OV = 3;
const EDGE: Record<number, [number, number]> = {
  [N]: [50, -OV],
  [E]: [100 + OV, 50],
  [S]: [50, 100 + OV],
  [W]: [-OV, 50]
};

interface PipSave {
  puzzle: PipesPuzzle;
  rot: number[];
  rotations: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/** small water-drop tank drawn on the source cell (never rotates) */
const SourceBadge = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      className="pip-badge-fill"
      d="M12 2.5c0 0-6.5 7-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2.5 12 2.5Z"
    />
    <path
      className="pip-badge-shine"
      d="M9.4 12.6a3 3 0 0 0 .5 3.4"
      fill="none"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/** little outlet cup drawn on each drain cell (never rotates) */
const DrainBadge = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path
      className="pip-badge-fill"
      d="M6 8.5h12l-1.2 9.2a2.4 2.4 0 0 1 -2.38 2.1H9.58a2.4 2.4 0 0 1 -2.38 -2.1Z"
    />
    <rect className="pip-badge-fill" x="4.6" y="6" width="14.8" height="3.2" rx="1.4" />
  </svg>
);

const CheckGlyph = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" aria-hidden>
    <path d="M5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** outward chevron for the torus edge markers (extreme) */
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

/** the pipe arms + hub, drawn from the solved mask; the wrapper rotates it */
function PipeArt({ mask }: { mask: number }) {
  const arms = DIRS.filter((d) => mask & d);
  return (
    <svg viewBox="0 0 100 100" className="pip-svg" aria-hidden>
      {arms.map((d) => (
        <line key={`c${d}`} className="pip-casing" x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} />
      ))}
      <circle className="pip-hub-casing" cx={50} cy={50} r={20.5} />
      {arms.map((d) => (
        <line key={`t${d}`} className="pip-tube" x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} />
      ))}
      <circle className="pip-hub-tube" cx={50} cy={50} r={15} />
      {arms.map((d) => (
        <line key={`s${d}`} className="pip-core" x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} />
      ))}
      <circle className="pip-hub-core" cx={50} cy={50} r={5.5} />
    </svg>
  );
}

export function PipesGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as PipSave | undefined;

  const puzzle = useMemo<PipesPuzzle>(() => {
    if (saved) return saved.puzzle;
    return generatePipes({ difficulty });
    // shell remounts via key for each new game — generate exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { size, wrap, solved, source, drains, par } = puzzle;
  const n = size * size;

  const [rot, setRot] = useState<number[]>(() => saved?.rot ?? puzzle.startRot.slice());
  const [rotations, setRotations] = useState(saved?.rotations ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [won, setWon] = useState(false);

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const hintTimer = useRef<number | null>(null);

  const flowOn = !!assists['flow-preview'];
  const lockOn = !!assists['lock-correct'];

  // passive assists count as help whenever enabled (incl. toggled on mid-game)
  useEffect(() => {
    if (flowOn && !done.current) assistsUsed.current.add('flow-preview');
  }, [flowOn]);
  useEffect(() => {
    if (lockOn && !done.current) assistsUsed.current.add('lock-correct');
  }, [lockOn]);

  const effMasks = useMemo(() => solved.map((m, i) => rot4(m, rot[i])), [solved, rot]);
  const watered = useMemo(
    () => floodWatered(effMasks, size, wrap, source),
    [effMasks, size, wrap, source]
  );
  const wateredCount = useMemo(() => watered.reduce((a, v) => a + (v ? 1 : 0), 0), [watered]);
  const correct = useMemo(
    () => effMasks.map((m, i) => m === solved[i]),
    [effMasks, solved]
  );
  const correctCount = useMemo(() => correct.reduce((a, v) => a + (v ? 1 : 0), 0), [correct]);
  const waveDelay = useMemo(
    () => networkDistance(solved, size, wrap, source),
    [solved, size, wrap, source]
  );

  const liveScore = Math.max(
    0,
    Math.round(60 * MULT[difficulty] * (wateredCount / n)) - hintsUsed * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { rotations, par, connected: wateredCount, solvedTiles: correctCount }
    });
  }, [liveScore, hintsUsed, rotations, par, wateredCount, correctCount, events]);

  const finish = useCallback(
    (turns: number, h: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      const efficiency = Math.round(
        EFFICIENCY_PTS * MULT[difficulty] * Math.min(1, par / Math.max(1, turns))
      );
      const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * MULT[difficulty];
      events.onFinish({
        outcome: 'won',
        score: Math.max(0, WIN_PTS * MULT[difficulty] + efficiency + timeBonus - h * HINT_PENALTY),
        errors: 0,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { rotations: turns, par }
      });
    },
    [difficulty, par, events]
  );

  const rotate = useCallback(
    (i: number) => {
      if (paused || done.current) return;
      const nextRot = rot.slice();
      nextRot[i] += 1;
      setRot(nextRot);
      const turns = rotations + 1;
      setRotations(turns);
      setHintCell(null);
      sfx.place();
      const eff = solved.map((m, idx) => rot4(m, nextRot[idx]));
      if (isSolved(eff, size, wrap, source)) finish(turns, hintsUsed);
    },
    [paused, rot, rotations, solved, size, wrap, source, finish, hintsUsed]
  );

  const hint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const wrong: number[] = [];
    for (let i = 0; i < n; i++) if (rot4(solved[i], rot[i]) !== solved[i]) wrong.push(i);
    if (wrong.length === 0) return;
    const pick = wrong[Math.floor(Math.random() * wrong.length)];
    let k = 1;
    while (rot4(solved[pick], rot[pick] + k) !== solved[pick]) k++;
    const nextRot = rot.slice();
    nextRot[pick] += k;
    setRot(nextRot);
    const turns = rotations + k;
    setRotations(turns);
    assistsUsed.current.add('hint');
    const h = hintsUsed + 1;
    setHintsUsed(h);
    setHintCell(pick);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintCell(null), 1600);
    sfx.hint();
    const eff = solved.map((m, idx) => rot4(m, nextRot[idx]));
    if (isSolved(eff, size, wrap, source)) finish(turns, h);
  }, [paused, assists.hint, n, solved, rot, rotations, hintsUsed, size, wrap, source, finish]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  useEffect(() => {
    registerSnapshot(
      (): PipSave => ({
        puzzle,
        rot: [...rot],
        rotations,
        hintsUsed,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const cells = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);
  const overPar = rotations > par;
  const hasTools = !!assists.hint;

  return (
    <div className={`pip-game ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className={`info-item${overPar ? ' bad' : ''}`}>
          Turns: <b>{rotations}</b>
        </span>
        <span className="info-item">
          Par: <b>{par}</b>
        </span>
        {flowOn && !won && (
          <span className="info-item">
            Flowing: <b>{wateredCount}/{n}</b>
          </span>
        )}
        {wrap && (
          <span className="info-item">
            Edges <b>wrap</b>
          </span>
        )}
      </div>

      <div className={`pip-frame${wrap ? ' pip-wrapped' : ''}`}>
        {wrap && (
          <>
            <span className="pip-wrap-arrow pip-n" aria-hidden>
              <WrapChevron rotate={-90} />
            </span>
            <span className="pip-wrap-arrow pip-s" aria-hidden>
              <WrapChevron rotate={90} />
            </span>
            <span className="pip-wrap-arrow pip-w" aria-hidden>
              <WrapChevron rotate={180} />
            </span>
            <span className="pip-wrap-arrow pip-e" aria-hidden>
              <WrapChevron rotate={0} />
            </span>
          </>
        )}
        <div
          className={`pip-board${won ? ' pip-won' : ''}`}
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        >
          {cells.map((i) => {
            const isSource = i === source;
            const isDrain = drains.includes(i);
            const wet = won || (flowOn && watered[i]);
            const showCheck = lockOn && !won && correct[i];
            const cls = [
              'pip-cell',
              wet ? 'wet' : '',
              isSource ? 'pip-src-cell' : '',
              hintCell === i ? 'pip-hint-cell' : ''
            ]
              .filter(Boolean)
              .join(' ');
            const style = { '--pip-w': `${waveDelay[i] * 55}ms` } as CSSProperties;
            return (
              <button
                key={i}
                className={cls}
                style={style}
                onClick={() => rotate(i)}
                aria-label={`Pipe ${Math.floor(i / size) + 1},${(i % size) + 1}`}
              >
                <span
                  className="pip-rot"
                  style={{ transform: `rotate(${rot[i] * 90}deg)` }}
                >
                  <PipeArt mask={solved[i]} />
                </span>
                {isSource && <span className="pip-badge pip-source">{SourceBadge}</span>}
                {isDrain && <span className="pip-badge pip-drain">{DrainBadge}</span>}
                {showCheck && <span className="pip-check">{CheckGlyph}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {hasTools && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={hint} disabled={won}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
          <p className="pip-hint-text">
            Tap a pipe to rotate it — connect the tank to every outlet with no leaks.
          </p>
        </div>
      )}
    </div>
  );
}
