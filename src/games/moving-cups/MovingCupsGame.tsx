import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  CUPS_CONFIG,
  durationForRound,
  makeRound,
  resolveFinalPosition,
  type RoundData,
  type Rng
} from './logic/swaps';

/* --- layout constant: each cup fills this fraction of its slot cell, the
   rest is the gap so the arcs read clearly. translateX is expressed in the
   cup's OWN width, so one whole cell = 100 / CUP_FILL percent. --- */
const CUP_FILL = 0.78;
const STEP_PCT = 100 / CUP_FILL;
const slotX = (slot: number): string => `${(slot * STEP_PCT).toFixed(4)}%`;

/* scoring */
const CORRECT_PTS = 100;
const ROUND_BONUS = 40;
const WRONG_PEN = 60;
const HINT_PEN = 25;
const WIN_BONUS = 300;
const LIFE_BONUS = 60;

const PEEK_MAX = 2; // peeks allowed per round

type Phase = 'watch' | 'shuffle' | 'pick' | 'reveal';
type Arc = 'over' | 'under';
interface AnimDesc {
  x0: string;
  x1: string;
  arc: Arc;
  dur: number;
}

interface Step {
  cupA: number;
  cupB: number;
  aFrom: number;
  aTo: number;
  bFrom: number;
  bTo: number;
  over: 'A' | 'B';
  orderAfter: number[];
}

/** Precompute every swap's two moving cups + resulting order, deterministically. */
function buildSteps(cups: number, swaps: RoundData['swaps']): Step[] {
  const order = Array.from({ length: cups }, (_, i) => i); // slot -> cupId
  const steps: Step[] = [];
  swaps.forEach((sw, k) => {
    const cupA = order[sw.a];
    const cupB = order[sw.b];
    order[sw.a] = cupB;
    order[sw.b] = cupA;
    steps.push({
      cupA,
      cupB,
      aFrom: sw.a,
      aTo: sw.b,
      bFrom: sw.b,
      bTo: sw.a,
      over: k % 2 === 0 ? 'A' : 'B',
      orderAfter: order.slice()
    });
  });
  return steps;
}

const identity = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** an upside-down party cup: tapered body with rounded base up top, moulded
    ridges near the mouth, a rolled lip resting on the table, and a soft gloss.
    Drawn once per cup; CSS recolors the outline for hover/result/hint states. */
const CupArt = (
  <svg className="cup-art" viewBox="0 0 96 128" aria-hidden>
    <path className="cup-body" d="M10 116 L24 12 Q25 3 34 3 L62 3 Q71 3 72 12 L86 116 Z" />
    <path className="cup-shade" d="M12 104 L84 104 L86 116 L10 116 Z" />
    <path className="cup-ridge" d="M15.7 88 H80.3" />
    <path className="cup-ridge" d="M14.5 97 H81.5" />
    <rect className="cup-base-hl" x="27" y="7" width="42" height="7" rx="3.5" />
    <path className="cup-gloss" d="M30 16 L22 90" />
    <rect className="cup-lip" x="3" y="113" width="90" height="13" rx="6.5" />
    <rect className="cup-lip-shade" x="5" y="120" width="86" height="5" rx="2.5" />
  </svg>
);

interface CupsSave {
  round: number;
  roundData: RoundData;
  lives: number;
  score: number;
  errors: number;
  hintsUsed: number;
  peeksLeft: number;
  assistsUsed: string[];
}

export function MovingCupsGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CUPS_CONFIG[difficulty];
  const saved = savedState as CupsSave | undefined;
  const rng: Rng = Math.random;

  const [round, setRound] = useState(saved?.round ?? 1);
  const [roundData, setRoundData] = useState<RoundData>(
    () => saved?.roundData ?? makeRound(cfg, saved?.round ?? 1, rng)
  );
  const [lives, setLives] = useState(saved?.lives ?? cfg.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [peeksLeft, setPeeksLeft] = useState(saved?.peeksLeft ?? PEEK_MAX);

  // ephemeral board visuals (reset every round)
  const [order, setOrder] = useState<number[]>(() => identity(cfg.cups));
  const [anim, setAnim] = useState<Record<number, AnimDesc | undefined>>({});
  const [lifted, setLifted] = useState<number[]>([]);
  const [ballShown, setBallShown] = useState(false);
  const [phase, setPhase] = useState<Phase>('watch');
  const [chosen, setChosen] = useState<number | null>(null);
  const [pickResult, setPickResult] = useState<'correct' | 'wrong' | null>(null);
  const [burst, setBurst] = useState<number | null>(null);

  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const wasPaused = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roundRef = useRef(round);
  roundRef.current = round;
  const roundDataRef = useRef(roundData);
  roundDataRef.current = roundData;
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.slowMotion ? ['slowMotion'] : []),
      ...(assists.ballTint ? ['ballTint'] : [])
    ])
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  // cup id -> current slot
  const slotOf = identity(cfg.cups);
  order.forEach((cup, slot) => {
    slotOf[cup] = slot;
  });
  const ballCup = roundData.ballStart; // ball follows this cup's identity all round
  const ballSlot = slotOf[ballCup];

  /** Run the current round: reveal the ball, then perform the shuffle. */
  const playRound = useCallback(
    (rd: RoundData, roundNum: number) => {
      clearTimers();
      setOrder(identity(cfg.cups));
      setAnim({});
      setChosen(null);
      setPickResult(null);
      setBurst(null);
      setPeeksLeft(PEEK_MAX);

      const steps = buildSteps(cfg.cups, rd.swaps);
      const dur = Math.round(durationForRound(cfg, roundNum) * (assists.slowMotion ? 1.5 : 1));
      const gap = Math.max(60, Math.round(dur * 0.16));

      // (1) watch — lift the ball's cup so its ball shows, then lower it
      setPhase('watch');
      setLifted([rd.ballStart]);
      setBallShown(true);
      playNote(640, 170, 'sine');
      const WATCH_UP = 260;
      const WATCH_HOLD = 640;
      const WATCH_DOWN = 300;
      at(WATCH_UP + WATCH_HOLD, () => {
        setLifted([]);
        setBallShown(false);
      });

      // (2) shuffle
      const shuffleStart = WATCH_UP + WATCH_HOLD + WATCH_DOWN;
      at(shuffleStart, () => setPhase('shuffle'));
      let t = shuffleStart + 130;
      steps.forEach((st) => {
        const start = t;
        at(start, () => {
          setAnim({
            [st.cupA]: {
              x0: slotX(st.aFrom),
              x1: slotX(st.aTo),
              arc: st.over === 'A' ? 'over' : 'under',
              dur
            },
            [st.cupB]: {
              x0: slotX(st.bFrom),
              x1: slotX(st.bTo),
              arc: st.over === 'B' ? 'over' : 'under',
              dur
            }
          });
          sfx.drag();
        });
        at(start + dur, () => {
          setOrder(st.orderAfter.slice());
          setAnim({});
        });
        t = start + dur + gap;
      });

      // (3) pick
      at(t + 60, () => setPhase('pick'));
    },
    [assists.slowMotion, at, cfg, clearTimers]
  );

  // start the first round (or the resumed one) exactly once
  useEffect(() => {
    playRound(roundDataRef.current, roundRef.current);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause freezes the shuffle; resume replays the current round cleanly
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearTimers();
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (!done.current) playRound(roundDataRef.current, roundRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // passive assists toggled on mid-game still count as help
  useEffect(() => {
    if (assists.slowMotion) assistsUsed.current.add('slowMotion');
  }, [assists.slowMotion]);
  useEffect(() => {
    if (assists.ballTint) assistsUsed.current.add('ballTint');
  }, [assists.ballTint]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { roundReached: round }
    });
  }, [score, errors, hintsUsed, round, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, e: number, h: number, roundReached: number) => {
      if (done.current) return;
      done.current = true;
      clearTimers();
      events.onFinish({
        outcome,
        score: Math.max(0, Math.round(finalScore)),
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { roundReached }
      });
    },
    [clearTimers, events]
  );

  const goToRound = useCallback(
    (newRound: number) => {
      const rd = makeRound(cfg, newRound, rng);
      setRoundData(rd);
      setRound(newRound);
      roundDataRef.current = rd;
      roundRef.current = newRound;
      playRound(rd, newRound);
    },
    [cfg, playRound, rng]
  );

  const pick = (tappedSlot: number) => {
    if (paused || done.current || phase !== 'pick') return;
    const rd = roundData;
    const finalSlot = resolveFinalPosition(rd.ballStart, rd.swaps);
    const tappedCup = order[tappedSlot];
    const correct = tappedSlot === finalSlot;

    setChosen(tappedCup);
    setPhase('reveal');
    setLifted([tappedCup]);

    if (correct) {
      setBallShown(true);
      setPickResult('correct');
      setBurst(finalSlot);
      sfx.pop();
      playNote(760, 120, 'sine');
      playNote(1180, 180, 'sine');
      const gained = (CORRECT_PTS * round + ROUND_BONUS) * cfg.mult;
      const ns = score + gained;
      setScore(ns);
      if (round >= cfg.targetRound) {
        const winBonus = (WIN_BONUS + lives * LIFE_BONUS) * cfg.mult;
        at(1100, () => finish('won', ns + winBonus, errors, hintsUsed, round));
      } else {
        at(1150, () => goToRound(round + 1));
      }
    } else {
      setPickResult('wrong');
      sfx.error();
      // reveal the true cup a beat later
      at(420, () => {
        setLifted([tappedCup, order[finalSlot]]);
        setBallShown(true);
      });
      const ns = Math.max(0, score - WRONG_PEN * cfg.mult);
      setScore(ns);
      const nl = lives - 1;
      setLives(nl);
      const ne = errors + 1;
      setErrors(ne);
      if (nl <= 0) {
        at(1500, () => finish('lost', ns, ne, hintsUsed, round));
      } else {
        at(1600, () => goToRound(round)); // retry the same round
      }
    }
  };

  const peek = () => {
    if (paused || done.current || phase !== 'pick' || !assists.peek || peeksLeft <= 0) return;
    assistsUsed.current.add('peek');
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PEN));
    setPeeksLeft((p) => p - 1);
    sfx.hint();
    setLifted(identity(cfg.cups));
    setBallShown(true);
    at(420, () => {
      if (phaseRef.current === 'pick') {
        setLifted([]);
        setBallShown(false);
      }
    });
  };

  useEffect(() => {
    registerSnapshot(() => ({
      round,
      roundData,
      lives,
      score,
      errors,
      hintsUsed,
      peeksLeft,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const statusText =
    phase === 'watch'
      ? 'Watch the ball…'
      : phase === 'shuffle'
        ? 'Shuffling…'
        : phase === 'pick'
          ? "Where's the ball?"
          : pickResult === 'correct'
            ? 'Found it!'
            : 'Not there…';

  const showPeek = !!assists.peek;

  return (
    <div className={`moving-cups ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Round: <b>{round} / {cfg.targetRound}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${lives <= 1 ? 'bad' : ''}`}>
          Lives:
          <span className="cup-lives" aria-label={`${lives} lives left`}>
            {Array.from({ length: cfg.lives }, (_, i) => (
              <i key={i} className={i < lives ? 'on' : ''} />
            ))}
          </span>
        </span>
      </div>

      <p className={`cup-status ${pickResult ?? ''}`}>{statusText}</p>

      <div
        className={`cup-stage ${phase === 'pick' ? 'pickable' : ''}`}
        style={{ '--n': cfg.cups } as CSSProperties}
      >
        <div className="cup-lane">
          {order.map((_, slot) => slot).map((cup) => {
            const a = anim[cup];
            const style: CSSProperties = { '--tx': slotX(slotOf[cup]) } as CSSProperties;
            if (a) {
              (style as Record<string, string | number>)['--x0'] = a.x0;
              (style as Record<string, string | number>)['--x1'] = a.x1;
              style.animationDuration = `${a.dur}ms`;
            }
            const isLift = lifted.includes(cup);
            return (
              <button
                key={cup}
                type="button"
                className={[
                  'cup',
                  a ? `anim ${a.arc}` : '',
                  isLift ? 'lift' : '',
                  chosen === cup && pickResult === 'wrong' ? 'wrong' : '',
                  chosen === cup && pickResult === 'correct' ? 'right' : '',
                  assists.ballTint && cup === ballCup ? 'ball-hint' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={style}
                onClick={() => pick(slotOf[cup])}
                aria-label={`Cup ${slotOf[cup] + 1}`}
              >
                {CupArt}
              </button>
            );
          })}

          <div
            className={`cup-ball ${ballShown ? 'show' : ''}`}
            style={{ '--slot': ballSlot } as CSSProperties}
            aria-hidden
          />

          {burst !== null && (
            <div className="cup-burst" style={{ '--slot': burst } as CSSProperties} aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </div>
          )}

          <div className="cup-table" aria-hidden />
        </div>
      </div>

      {showPeek && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={peek}
              disabled={phase !== 'pick' || peeksLeft <= 0}
              aria-label="Peek at the ball"
            >
              <BulbIcon />
              <span>Peek{peeksLeft < PEEK_MAX ? ` (${peeksLeft})` : ''}</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
