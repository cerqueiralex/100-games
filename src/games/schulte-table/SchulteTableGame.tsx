import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  DIFFICULTY_CONFIGS,
  makeBoard,
  nextTarget,
  targetCell,
  tileMatchesTarget,
  totalSteps,
  type Tile
} from './logic/board';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
/** par completion time (seconds) — the speed benchmark each tier scores against */
const PAR_SEC: Record<Difficulty, number> = { easy: 8, medium: 22, hard: 40, pro: 48, extreme: 70 };
/** generous time cap (seconds): a stalled drill ends rather than running forever */
const CAP_SEC: Record<Difficulty, number> = { easy: 90, medium: 180, hard: 300, pro: 360, extreme: 540 };

const BASE = 200; // points for a par-time clean run at ×1
const PENALTY_MS = 1500; // a wrong tap adds this to your effective time
const HINT_PENALTY = 25; // flat cost of a peek
const MIN_FACTOR = 0.25;
const MAX_FACTOR = 2.5;

const PASSIVE = ['next-highlight', 'fixation-dot', 'dim-found'] as const;

interface SchulteSave {
  board: Tile[];
  cleared: number[];
  wrongTaps: number;
  hints: number;
  timeMs: number;
  assistsUsed: string[];
}

interface Fx {
  cell: number;
  n: number;
}

function fmtClock(ms: number): { body: string; tenth: string } {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const d = Math.floor((t % 1000) / 100);
  return { body: `${m}:${String(s).padStart(2, '0')}`, tenth: `.${d}` };
}

export function SchulteTableGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const total = totalSteps(cfg);
  const saved = savedState as SchulteSave | undefined;

  // Generated once; the shell remounts the component (via key) for a new game.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const board = useMemo<Tile[]>(() => saved?.board ?? makeBoard(cfg, Math.random), [cfg]);

  const [cleared, setCleared] = useState<Set<number>>(() => new Set(saved?.cleared ?? []));
  const [wrongTaps, setWrongTaps] = useState(saved?.wrongTaps ?? 0);
  const [hints, setHints] = useState(saved?.hints ?? 0);
  const [wallMs, setWallMs] = useState(saved?.timeMs ?? 0);
  const [ended, setEnded] = useState(false);
  const [won, setWon] = useState(false);
  const [popCell, setPopCell] = useState<number | null>(null);
  const [wrongFx, setWrongFx] = useState<Fx | null>(null);
  const [peekFx, setPeekFx] = useState<Fx | null>(null);

  // refs mirror the latest state for the timer/finish closures
  const doneRef = useRef(false);
  const timeMsRef = useRef(saved?.timeMs ?? 0); // banked wall time while playing
  const runningSince = useRef<number | null>(null);
  const clearedRef = useRef<Set<number>>(new Set(saved?.cleared ?? []));
  const wrongRef = useRef(saved?.wrongTaps ?? 0);
  const hintsRef = useRef(saved?.hints ?? 0);
  const fxN = useRef(0);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE.filter((a) => assists[a])])
  );

  const capMs = CAP_SEC[difficulty] * 1000;

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    for (const a of PASSIVE) if (assists[a]) assistsUsed.current.add(a);
  }, [assists]);

  const currentEffectiveMs = useCallback(() => {
    const span = runningSince.current != null ? performance.now() - runningSince.current : 0;
    return timeMsRef.current + span + wrongRef.current * PENALTY_MS;
  }, []);

  const liveScore = Math.max(
    0,
    Math.round((cleared.size / total) * BASE * MULT[difficulty]) - hints * HINT_PENALTY
  );

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: wrongTaps,
      hintsUsed: hints,
      assistsUsed: [...assistsUsed.current],
      extra: {
        timeMs: Math.round(currentEffectiveMs()),
        wrongTaps,
        found: cleared.size,
        total
      }
    });
  }, [liveScore, wrongTaps, hints, cleared.size, total, events, currentEffectiveMs]);

  const finish = useCallback(
    (outcome: 'won' | 'lost') => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (runningSince.current != null) {
        timeMsRef.current += performance.now() - runningSince.current;
        runningSince.current = null;
      }
      setEnded(true);
      setWallMs(timeMsRef.current);
      const eff = timeMsRef.current + wrongRef.current * PENALTY_MS;
      let score: number;
      if (outcome === 'won') {
        const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, PAR_SEC[difficulty] / (eff / 1000)));
        score = Math.max(0, Math.round(BASE * MULT[difficulty] * factor) - hintsRef.current * HINT_PENALTY);
        setWon(true);
      } else {
        score = Math.max(
          0,
          Math.round((clearedRef.current.size / total) * BASE * MULT[difficulty]) -
            hintsRef.current * HINT_PENALTY
        );
      }
      events.onFinish({
        outcome,
        score,
        errors: wrongRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { timeMs: Math.round(eff), wrongTaps: wrongRef.current }
      });
    },
    [difficulty, events, total]
  );
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // the precise wall clock (tenths). Pausing banks the current span and stops;
  // resuming starts a fresh span. Also enforces the generous time cap.
  useEffect(() => {
    if (paused || ended) {
      if (runningSince.current != null) {
        timeMsRef.current += performance.now() - runningSince.current;
        runningSince.current = null;
      }
      return;
    }
    runningSince.current = performance.now();
    const id = window.setInterval(() => {
      const wall =
        timeMsRef.current + (runningSince.current != null ? performance.now() - runningSince.current : 0);
      setWallMs(wall);
      if (wall >= capMs) finishRef.current('lost');
    }, 80);
    return () => {
      window.clearInterval(id);
      if (runningSince.current != null) {
        timeMsRef.current += performance.now() - runningSince.current;
        runningSince.current = null;
      }
    };
  }, [paused, ended, capMs]);

  const target = ended ? null : nextTarget(cfg, cleared.size);
  const targetIdx = targetCell(board, target, cleared);

  const onTap = (idx: number) => {
    if (paused || ended || cleared.has(idx)) return;
    const t = nextTarget(cfg, cleared.size);
    if (!t) return;
    if (tileMatchesTarget(board[idx], t)) {
      const next = new Set(cleared);
      next.add(idx);
      clearedRef.current = next;
      setCleared(next);
      setPopCell(idx);
      window.setTimeout(() => setPopCell((c) => (c === idx ? null : c)), 320);
      const frac = next.size / total;
      playNote(440 + frac * 460, 70, 'triangle');
      if (next.size >= total) finish('won');
    } else {
      const nw = wrongRef.current + 1;
      wrongRef.current = nw;
      setWrongTaps(nw);
      fxN.current += 1;
      const nonce = fxN.current;
      setWrongFx({ cell: idx, n: nonce });
      window.setTimeout(() => setWrongFx((f) => (f && f.n === nonce ? null : f)), 420);
      sfx.error();
    }
  };

  const peek = () => {
    if (paused || ended || !assists['peek-next'] || targetIdx < 0) return;
    const h = hintsRef.current + 1;
    hintsRef.current = h;
    setHints(h);
    assistsUsed.current.add('peek-next');
    fxN.current += 1;
    const nonce = fxN.current;
    setPeekFx({ cell: targetIdx, n: nonce });
    window.setTimeout(() => setPeekFx((f) => (f && f.n === nonce ? null : f)), 660);
    sfx.hint();
  };

  useEffect(() => {
    registerSnapshot(() => ({
      board,
      cleared: [...cleared],
      wrongTaps,
      hints,
      timeMs: Math.round(
        timeMsRef.current + (runningSince.current != null ? performance.now() - runningSince.current : 0)
      ),
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const clock = fmtClock(wallMs + wrongTaps * PENALTY_MS);
  const parMs = PAR_SEC[difficulty] * 1000;
  const effMs = wallMs + wrongTaps * PENALTY_MS;
  const over = effMs > parMs;
  const parFrac = Math.min(1, effMs / parMs);
  const parClock = fmtClock(parMs);
  const deltaSec = (effMs - parMs) / 1000;

  const center = (cfg.size - 1) / 2;

  return (
    <div className={`schulte ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Found: <b>{cleared.size} / {total}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${wrongTaps > 0 ? 'bad' : ''}`}>
          Misses: <b>{wrongTaps}</b>
        </span>
      </div>

      <div className="sch-hud">
        <div className={`sch-clock ${over && !won ? 'over' : ''} ${won ? 'win' : ''}`}>
          {clock.body}
          <span className="t">{clock.tenth}</span>
        </div>
        <div className={`sch-parbar ${over ? 'over' : ''}`}>
          <i style={{ width: `${parFrac * 100}%` }} />
        </div>
        {ended ? (
          <div className="sch-result">
            <span className={`chip ${won && deltaSec <= 0 ? 'good' : over ? 'bad' : 'accent'}`}>
              {deltaSec <= 0 ? `${Math.abs(deltaSec).toFixed(1)}s under par` : `${deltaSec.toFixed(1)}s over par`}
            </span>
            <span className="chip">par {parClock.body}</span>
          </div>
        ) : (
          <div className="sch-next">
            <span>Next</span>
            {target && (
              <span className={`sch-next-val ${target.color === 'a' ? 'a' : target.color === 'b' ? 'b' : ''}`}>
                {target.value}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={`sch-board n${cfg.size} ${assists['dim-found'] ? 'dim-found' : ''} ${won ? 'won' : ''}`}
        style={{ gridTemplateColumns: `repeat(${cfg.size}, 1fr)` }}
      >
        {board.map((tile, idx) => {
          const isCleared = cleared.has(idx);
          const r = Math.floor(idx / cfg.size);
          const c = idx % cfg.size;
          const dist = Math.hypot(r - center, c - center);
          const cls = [
            'sch-tile',
            tile.color === 'a' ? 'ca' : tile.color === 'b' ? 'cb' : '',
            isCleared ? 'cleared' : '',
            !isCleared && idx === targetIdx && assists['next-highlight'] ? 'next' : '',
            popCell === idx ? 'pop' : '',
            wrongFx?.cell === idx ? (wrongFx.n % 2 ? 'buzz1' : 'buzz2') : '',
            peekFx?.cell === idx ? (peekFx.n % 2 ? 'peek1' : 'peek2') : ''
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={idx}
              className={cls}
              style={won ? { animationDelay: `${Math.round(dist * 55)}ms` } : undefined}
              onClick={() => onTap(idx)}
              aria-label={`Tile ${tile.value}${tile.color === 'a' ? ' red' : tile.color === 'b' ? ' blue' : ''}`}
            >
              {tile.value}
            </button>
          );
        })}
        {assists['fixation-dot'] && <span className="sch-fixation" aria-hidden />}
      </div>

      {assists['peek-next'] && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={peek} disabled={ended || targetIdx < 0}>
              <BulbIcon />
              <span>Peek</span>
            </PadTool>
          </div>
          <p className="sch-hint-text">Peek pulses the next tile once — counts as help.</p>
        </div>
      )}
    </div>
  );
}
