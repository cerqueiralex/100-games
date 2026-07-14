import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { EyeIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { CONFIG, makeDecoy, makePattern, roundParams } from './logic/patterns';

/* scoring knobs (see index.ts scoringNote) */
const CELL_PTS = 5; // × round × mult, per correct cell tapped
const ROUND_BONUS = 25; // × round × mult, on clearing a round
const MISTAKE_PEN = 20; // × mult, per wrong tap
const HINT_PEN = 30; // per peek
const WIN_BONUS = 150; // × mult, on winning
const LIFE_BONUS = 50; // × mult, per life left on winning
const MAX_PEEKS = 3;

/* timing (ms) */
const READY_STEP = 460; // per countdown tick (3 → 2 → 1)
const DECOY_MS = 480; // decoy flash window (pro/extreme)
const WRONG_MS = 450; // wrong-cell red flash
const PENALTY_MS = 600; // re-reveal of the true pattern after a mistake
const PEEK_MS = 500; // peek re-flash window
const CLEAR_WIN_MS = 780; // celebration before a winning finish
const CLEAR_NEXT_MS = 980; // celebration before the next round

type Phase = 'ready' | 'flash' | 'decoy' | 'recall' | 'clear';

interface PatternRecallSave {
  round: number;
  pattern: number[];
  selected: number[];
  lives: number;
  hints: number;
  score: number;
  errors: number;
  assistsUsed: string[];
}

export function PatternRecallGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const mult = cfg.mult;
  const saved = savedState as PatternRecallSave | undefined;

  const [round, setRound] = useState(saved?.round ?? 1);
  const [pattern, setPattern] = useState<number[]>(
    saved?.pattern ?? makePattern(roundParams(cfg, 1), Math.random)
  );
  const [selected, setSelected] = useState<Set<number>>(new Set(saved?.selected ?? []));
  const [decoy, setDecoy] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [peeking, setPeeking] = useState(false);
  const [penalty, setPenalty] = useState(false);
  const [wrongCell, setWrongCell] = useState<number | null>(null);

  const [lives, setLives] = useState(saved?.lives ?? cfg.lives);
  const [hints, setHints] = useState(saved?.hints ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);

  const { gridSize } = roundParams(cfg, round);
  const cells = gridSize * gridSize;

  const done = useRef(false);
  const timeouts = useRef<number[]>([]);
  const wasPaused = useRef(false);
  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  // refs kept in sync so timer/finish callbacks never read stale state
  const roundRef = useRef(round);
  roundRef.current = round;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const hintsRef = useRef(hints);
  hintsRef.current = hints;

  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.slowFlash ? ['slowFlash'] : []),
      ...(assists.countShown ? ['countShown'] : [])
    ])
  );

  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };

  // reveal the pattern, hold for the flash window, then (maybe) show the
  // decoy, then hand over to the recall phase. Reads roundRef so a resumed
  // or advanced round always flashes with the right grid.
  const runFlash = useCallback(
    (pat: number[]) => {
      clearAll();
      setPeeking(false);
      setPenalty(false);
      setDecoy(null);
      setPhase('flash');
      playNote(523.25, 130, 'triangle');
      const dur = cfg.flashMs * (assists.slowFlash ? 1.4 : 1);
      schedule(() => {
        if (cfg.distractor) {
          const gs = roundParams(cfg, roundRef.current).gridSize;
          setDecoy(makeDecoy(pat, gs, Math.random));
          setPhase('decoy');
          schedule(() => {
            setDecoy(null);
            setPhase('recall');
          }, DECOY_MS);
        } else {
          setPhase('recall');
        }
      }, dur);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cfg, assists.slowFlash]
  );

  // a fresh "get ready" countdown, then the flash for `pat`
  const beginRound = useCallback(
    (pat: number[], preserveSelected: boolean) => {
      clearAll();
      if (!preserveSelected) setSelected(new Set());
      setWrongCell(null);
      setPenalty(false);
      setPeeking(false);
      setDecoy(null);
      setPhase('ready');
      setCountdown(3);
      schedule(() => setCountdown(2), READY_STEP);
      schedule(() => setCountdown(1), READY_STEP * 2);
      schedule(() => runFlash(pat), READY_STEP * 3);
    },
    [runFlash]
  );

  // first mount: fresh run, or replay the saved round's flash
  useEffect(() => {
    beginRound(patternRef.current, !!saved);
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause freezes everything (board hidden by the shell); resume re-flashes
  // the current pattern briefly so nothing leaks and the player re-orients
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearAll();
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (!done.current) beginRound(patternRef.current, true);
    }
  }, [paused, beginRound]);

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists.slowFlash) assistsUsed.current.add('slowFlash');
    if (assists.countShown) assistsUsed.current.add('countShown');
  }, [assists.slowFlash, assists.countShown]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed: hints,
      assistsUsed: [...assistsUsed.current],
      extra: { roundReached: round }
    });
  }, [score, errors, hints, round, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', sc: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      clearAll();
      let total = sc;
      if (outcome === 'won') total += WIN_BONUS * mult + livesRef.current * LIFE_BONUS * mult;
      events.onFinish({
        outcome,
        score: Math.max(0, Math.round(total)),
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { roundReached: roundRef.current }
      });
    },
    [events, mult]
  );

  const roundClear = useCallback(() => {
    clearAll();
    setPhase('clear');
    setWrongCell(null);
    sfx.pop();
    playNote(783.99, 200, 'triangle');
    const bonus = ROUND_BONUS * roundRef.current * mult;
    setScore((s) => s + bonus);
    if (roundRef.current >= cfg.targetRounds) {
      schedule(() => finish('won', scoreRef.current, errorsRef.current, hintsRef.current), CLEAR_WIN_MS);
    } else {
      schedule(() => {
        const nr = roundRef.current + 1;
        const pat = makePattern(roundParams(cfg, nr), Math.random);
        patternRef.current = pat;
        setPattern(pat);
        setRound(nr);
        beginRound(pat, false);
      }, CLEAR_NEXT_MS);
    }
  }, [cfg, mult, finish, beginRound]);

  const tapCell = (i: number) => {
    if (paused || done.current || phase !== 'recall' || penalty) return;
    if (selected.has(i)) return;
    if (pattern.includes(i)) {
      sfx.pop();
      const next = new Set(selected);
      next.add(i);
      setSelected(next);
      setScore((s) => s + CELL_PTS * round * mult);
      if (next.size === pattern.length) roundClear();
    } else {
      sfx.error();
      setWrongCell(i);
      schedule(() => setWrongCell((w) => (w === i ? null : w)), WRONG_MS);
      const nextLives = lives - 1;
      const nextErrors = errors + 1;
      const nextScore = Math.max(0, score - MISTAKE_PEN * mult);
      setLives(nextLives);
      setErrors(nextErrors);
      setScore(nextScore);
      if (nextLives <= 0) {
        finish('lost', nextScore, nextErrors, hints);
        return;
      }
      // penalty: briefly re-reveal the true pattern
      setPenalty(true);
      schedule(() => setPenalty(false), PENALTY_MS);
    }
  };

  const peek = () => {
    if (paused || done.current || phase !== 'recall' || !assists.peek || hints >= MAX_PEEKS) return;
    assistsUsed.current.add('peek');
    setHints((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PEN));
    sfx.hint();
    setPeeking(true);
    schedule(() => setPeeking(false), PEEK_MS);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      round,
      pattern,
      selected: [...selected],
      lives,
      hints,
      score,
      errors,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const showTrue = phase === 'flash' || peeking || penalty;
  const remaining = pattern.length - selected.size;

  const status =
    phase === 'ready'
      ? countdown > 0
        ? `Get ready… ${countdown}`
        : 'Get ready…'
      : phase === 'flash'
        ? 'Memorize the pattern'
        : phase === 'decoy'
          ? 'Ignore the red — that is a decoy'
          : phase === 'clear'
            ? 'Round clear!'
            : penalty
              ? 'Look again…'
              : assists.countShown
                ? `Tap ${pattern.length} cells — ${remaining} to go`
                : 'Tap the cells you saw';

  return (
    <div className={`pattern-recall ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Round <b>{round}/{cfg.targetRounds}</b>
        </span>
        <span className="pr-lives" aria-label={`${lives} of ${cfg.lives} lives left`}>
          {Array.from({ length: cfg.lives }, (_, k) => (
            <span key={k} className={`pr-pip ${k < lives ? 'on' : 'off'}`} aria-hidden />
          ))}
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
      </div>

      <p className="pr-status">{status}</p>

      <div
        className={`pr-board ${phase !== 'recall' ? 'watching' : ''} ${penalty ? 'penalty' : ''}`}
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {Array.from({ length: cells }, (_, i) => {
          const r = Math.floor(i / gridSize);
          const c = i % gridSize;
          const isLit = pattern.includes(i);
          const cls = ['pr-cell'];
          if (isLit && showTrue) cls.push('lit');
          if (phase === 'decoy' && decoy?.includes(i)) cls.push('decoy');
          if (selected.has(i)) cls.push('found');
          if (wrongCell === i) cls.push('wrong');
          if (phase === 'clear') cls.push('cleared');
          return (
            <button
              key={i}
              className={cls.join(' ')}
              style={{ '--d': r + c } as React.CSSProperties}
              onClick={() => tapCell(i)}
              aria-label={`Cell ${r + 1}, ${c + 1}`}
            />
          );
        })}
      </div>

      {assists.peek && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={peek}
              disabled={phase !== 'recall' || hints >= MAX_PEEKS}
            >
              <EyeIcon />
              <span>Peek {MAX_PEEKS - hints}</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
