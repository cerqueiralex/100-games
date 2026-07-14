import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  makeRound,
  TIERS,
  withBiggerDiff,
  type DiffKind,
  type TierConfig
} from './logic/round';

const MAX_HINTS = 3;

/* scoring */
const ROUND_PTS = 12; // × round number × tier multiplier
const SPEED_MAX = 40; // × remaining-time fraction × tier multiplier
const CLEAR_BONUS = 25; // × tier multiplier, per cleared round
const WRONG_PENALTY = 30;
const HINT_PENALTY = 20;
const WIN_BONUS = 200; // × tier multiplier
const LIFE_BONUS = 40; // × tier multiplier, per surviving life

/** a saturated content palette slot to shift the odd tile's HUE toward */
const HUE_TARGETS = ['--play-4', '--play-2', '--play-5', '--play-1'];

interface Layout {
  size: number;
  oddIndex: number;
  diffKind: DiffKind;
  diffAmount: number;
  /** ± direction for rotation / size, so the odd isn't always the same way */
  dir: 1 | -1;
  /** which --play token the hue variant leans toward */
  hueVar: string;
}

interface OooSave {
  round: number;
  layout: Layout;
  lives: number;
  hintsUsed: number;
  errors: number;
  score: number;
  maxRound: number;
  assistsUsed: string[];
}

type Phase = 'play' | 'found' | 'reveal';

function dealLayout(cfg: TierConfig, roundIndex: number): Layout {
  const r = makeRound(cfg, roundIndex, Math.random);
  return {
    size: r.size,
    oddIndex: r.oddIndex,
    diffKind: r.diffKind,
    diffAmount: r.diffAmount,
    dir: Math.random() < 0.5 ? 1 : -1,
    hueVar: HUE_TARGETS[Math.floor(Math.random() * HUE_TARGETS.length)]
  };
}

/** Inline style that expresses the odd tile's difference — paint/transform only. */
function oddChipStyle(l: Layout): CSSProperties {
  const d = l.diffAmount;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  switch (l.diffKind) {
    case 'shade': {
      const share = clamp(Math.round(84 - d * 100), 10, 96);
      return { background: `color-mix(in srgb, var(--accent) ${share}%, var(--surface))` };
    }
    case 'hue': {
      const k = clamp(Math.round(6 + d * 100), 6, 55);
      return {
        background: `color-mix(in srgb, var(--ooo-fill) ${100 - k}%, var(${l.hueVar}) ${k}%)`
      };
    }
    case 'rotation': {
      const deg = clamp(Math.round(d * 100 * 1.6), 5, 44) * l.dir;
      return { ['--ooo-rot' as string]: `${deg}deg` } as CSSProperties;
    }
    case 'size': {
      const delta = clamp(0.05 + d * 0.75, 0.06, 0.34);
      const scale = l.dir > 0 ? 1 - delta : 1 + delta * 0.7;
      return { ['--ooo-size' as string]: `${scale}` } as CSSProperties;
    }
    case 'shape':
      return { borderRadius: '50%' };
  }
}

/** The 2×2 block of tile indices containing the odd tile (for the hint). */
function hintRegion(l: Layout): Set<number> {
  const size = l.size;
  const r = Math.floor(l.oddIndex / size);
  const c = l.oddIndex % size;
  const r0 = Math.min(Math.max(0, r - (Math.random() < 0.5 ? 0 : 1)), Math.max(0, size - 2));
  const c0 = Math.min(Math.max(0, c - (Math.random() < 0.5 ? 0 : 1)), Math.max(0, size - 2));
  const out = new Set<number>();
  for (let dr = 0; dr < 2; dr++) {
    for (let dc = 0; dc < 2; dc++) {
      const rr = r0 + dr;
      const cc = c0 + dc;
      if (rr < size && cc < size) out.add(rr * size + cc);
    }
  }
  return out;
}

export function OddOneOutGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const baseCfg = TIERS[difficulty];
  const cfg: TierConfig = assists.biggerDiff ? withBiggerDiff(baseCfg) : baseCfg;
  const saved = savedState as OooSave | undefined;

  const roundMs = baseCfg.roundSec * 1000 * (assists.moreTime ? 1.4 : 1);

  const [round, setRound] = useState(saved?.round ?? 0);
  const [layout, setLayout] = useState<Layout>(() => saved?.layout ?? dealLayout(cfg, saved?.round ?? 0));
  const [lives, setLives] = useState(saved?.lives ?? baseCfg.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [phase, setPhase] = useState<Phase>('play');
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [hintCells, setHintCells] = useState<Set<number>>(new Set());
  const [timeFrac, setTimeFrac] = useState(1);
  const [flash, setFlash] = useState<{ msg: string; id: number } | null>(null);
  const [dealId, setDealId] = useState(0);

  const maxRound = useRef(saved?.maxRound ?? (saved?.round ?? 0) + 1);
  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const remainingRef = useRef(roundMs);
  const lastDeal = useRef(-1);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...['moreTime', 'biggerDiff'].filter((a) => assists[a])
    ])
  );

  // refs mirrors so event handlers read fresh values without re-subscribing
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const roundRef = useRef(round);
  roundRef.current = round;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // passive assists toggled on mid-game still count as help
  useEffect(() => {
    if (assists.moreTime) assistsUsed.current.add('moreTime');
    if (assists.biggerDiff) assistsUsed.current.add('biggerDiff');
  }, [assists.moreTime, assists.biggerDiff]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { round: round + 1, roundReached: maxRound.current, lives }
    });
  }, [score, errors, hintsUsed, round, lives, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number) => {
      if (done.current) return;
      done.current = true;
      clearTimers();
      events.onFinish({
        outcome,
        score: Math.max(0, Math.round(finalScore)),
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { roundReached: maxRound.current }
      });
    },
    [events]
  );

  const dealNext = useCallback(
    (nextRound: number, growMsg: boolean) => {
      const next = dealLayout(cfg, nextRound);
      setLayout(next);
      setRound(nextRound);
      maxRound.current = Math.max(maxRound.current, nextRound + 1);
      setWrongIndex(null);
      setHintCells(new Set());
      setPhase('play');
      setDealId((d) => d + 1);
      if (growMsg) {
        setFlash({
          msg: next.size > layoutRef.current.size ? 'Bigger grid!' : 'Harder!',
          id: Date.now()
        });
      }
    },
    [cfg]
  );

  // re-deal the SAME round after a miss (no progression, fresh layout)
  const redeal = useCallback(() => {
    const same = dealLayout(cfg, roundRef.current);
    setLayout(same);
    setWrongIndex(null);
    setHintCells(new Set());
    setPhase('play');
    setDealId((d) => d + 1);
  }, [cfg]);

  const onTimeoutOrMiss = useCallback(
    (fromTap: number | null) => {
      if (done.current) return;
      clearTimers();
      setPhase('reveal');
      if (fromTap !== null) setWrongIndex(fromTap);
      sfx.error();
      const nextErrors = errorsRef.current + 1;
      setErrors(nextErrors);
      const nextLives = livesRef.current - 1;
      setLives(nextLives);
      const nextScore = Math.max(0, scoreRef.current - WRONG_PENALTY);
      setScore(nextScore);
      if (nextLives <= 0) {
        schedule(() => finish('lost', nextScore), 950);
      } else {
        schedule(() => redeal(), 950);
      }
    },
    [finish, redeal]
  );

  const onTap = (idx: number) => {
    if (paused || done.current || phaseRef.current !== 'play') return;
    const l = layoutRef.current;
    if (idx === l.oddIndex) {
      // correct
      sfx.pop();
      setPhase('found');
      const frac = remainingRef.current / roundMs;
      const roundNo = roundRef.current + 1;
      const gained =
        ROUND_PTS * roundNo * baseCfg.mult +
        Math.round(frac * SPEED_MAX * baseCfg.mult) +
        CLEAR_BONUS * baseCfg.mult;
      const nextScore = scoreRef.current + gained;
      setScore(nextScore);
      if (roundNo >= baseCfg.targetRound) {
        const win = nextScore + WIN_BONUS * baseCfg.mult + livesRef.current * LIFE_BONUS * baseCfg.mult;
        setScore(win);
        schedule(() => finish('won', win), 650);
      } else {
        schedule(() => dealNext(roundRef.current + 1, true), 620);
      }
    } else {
      onTimeoutOrMiss(idx);
    }
  };

  // per-round countdown, timestamp-based; pausing freezes the remaining time
  useEffect(() => {
    if (paused || done.current || phase !== 'play') return;
    if (lastDeal.current !== dealId) {
      lastDeal.current = dealId;
      remainingRef.current = roundMs;
    }
    const deadline = performance.now() + remainingRef.current;
    let raf = 0;
    const tick = () => {
      const rem = deadline - performance.now();
      remainingRef.current = Math.max(0, rem);
      setTimeFrac(Math.max(0, Math.min(1, rem / roundMs)));
      if (rem <= 0) {
        onTimeoutOrMiss(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      remainingRef.current = Math.max(0, deadline - performance.now());
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, paused, phase, roundMs]);

  useEffect(() => clearTimers, []);

  const useHint = () => {
    if (paused || done.current || phase !== 'play' || !assists.hint) return;
    if (hintsRef.current >= MAX_HINTS) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PENALTY));
    sfx.hint();
    setHintCells(hintRegion(layoutRef.current));
    schedule(() => setHintCells(new Set()), 1300);
  };

  useEffect(() => {
    registerSnapshot(
      (): OooSave => ({
        round,
        layout,
        lives,
        hintsUsed,
        errors,
        score,
        maxRound: maxRound.current,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const oddStyle = oddChipStyle(layout);
  const n = layout.size * layout.size;
  const lowTime = timeFrac <= 0.28;
  const roundNo = round + 1;

  return (
    <div className={`ooo ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Round: <b>{roundNo} / {baseCfg.targetRound}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="ooo-lives" aria-label={`${lives} lives left`}>
          {Array.from({ length: baseCfg.lives }, (_, i) => (
            <span key={i} className={`ooo-pip ${i < lives ? '' : 'empty'}`} aria-hidden />
          ))}
        </span>
      </div>

      <div className={`ooo-timerbar ${lowTime ? 'low' : ''}`} aria-hidden>
        <i style={{ width: `${Math.round(timeFrac * 100)}%` }} />
      </div>

      <p className="ooo-status">
        {phase === 'reveal'
          ? 'The odd tile is highlighted'
          : phase === 'found'
            ? 'Found it!'
            : 'Tap the tile that does not match'}
        {flash && (
          <span key={flash.id} className="ooo-flash">
            {flash.msg}
          </span>
        )}
      </p>

      <div
        key={dealId}
        className="ooo-board"
        style={{ gridTemplateColumns: `repeat(${layout.size}, 1fr)` }}
      >
        {Array.from({ length: n }, (_, i) => {
          const isOdd = i === layout.oddIndex;
          const revealOdd = isOdd && (phase === 'reveal' || phase === 'found');
          return (
            <button
              key={i}
              className="ooo-tile"
              onClick={() => onTap(i)}
              aria-label={`Tile ${i + 1}`}
            >
              <span
                className={[
                  'ooo-chip',
                  isOdd && phase === 'found' ? 'found' : '',
                  revealOdd && phase === 'reveal' ? 'reveal' : '',
                  wrongIndex === i ? 'wrong' : '',
                  hintCells.has(i) ? 'hint' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isOdd ? oddStyle : undefined}
              />
            </button>
          );
        })}
      </div>

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={useHint}
              disabled={phase !== 'play' || hintsUsed >= MAX_HINTS}
            >
              <BulbIcon />
              <span>Hint {MAX_HINTS - hintsUsed}</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
