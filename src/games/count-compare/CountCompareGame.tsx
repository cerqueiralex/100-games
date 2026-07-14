import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { PadTool, RestartIcon } from '../../platform/components/ui';
import { CONFIG } from './logic/config';
import { makeRound, type Round } from './logic/generator';
import { ShapeGlyph } from './shapes';

type Phase = 'ready' | 'flash' | 'answer' | 'reveal';
type Verdict = 'good' | 'bad';

const CD = 430; // ms per countdown tick
const CORRECT_MS = 780; // green flash before advancing
const WRONG_MS = 1750; // re-show scene + correct answer before advancing
const MAX_REPLAYS = 3;

interface CCSave {
  round: number;
  lives: number;
  score: number;
  errors: number;
  hintsUsed: number;
  replaysUsed: number;
  streak: number;
  bestStreak: number;
  current: Round;
  phase: Phase;
  assistsUsed: string[];
}

function TimerRing({ durationMs }: { durationMs: number }) {
  return (
    <svg className="cc-ring" viewBox="0 0 36 36" aria-hidden>
      <circle className="cc-ring-track" cx="18" cy="18" r="15.5" pathLength={100} />
      <circle
        className="cc-ring-fill"
        cx="18"
        cy="18"
        r="15.5"
        pathLength={100}
        style={{ animationDuration: `${durationMs}ms` }}
      />
    </svg>
  );
}

export function CountCompareGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved = savedState as CCSave | undefined;

  const genOpts = () => ({ narrow: !!assists.narrow, longerFlash: !!assists.longerFlash });

  // ----- render state (mirrors the refs that timers read) -----
  const [current, setCurrent] = useState<Round>(
    () => saved?.current ?? makeRound(cfg, 1, Math.random, genOpts())
  );
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(saved?.round ?? 1);
  const [lives, setLives] = useState(saved?.lives ?? cfg.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [replaysUsed, setReplaysUsed] = useState(saved?.replaysUsed ?? 0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Verdict | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [answerKey, setAnswerKey] = useState(0);

  // ----- source-of-truth refs (mutated synchronously, mirrored to state) -----
  const curRef = useRef(current);
  curRef.current = current;
  const phaseRef = useRef<Phase>('ready');
  const resultRef = useRef<Verdict | null>(null);
  const roundRef = useRef(saved?.round ?? 1);
  const livesRef = useRef(saved?.lives ?? cfg.lives);
  const scoreRef = useRef(saved?.score ?? 0);
  const errorsRef = useRef(saved?.errors ?? 0);
  const hintsRef = useRef(saved?.hintsUsed ?? 0);
  const streakRef = useRef(saved?.streak ?? 0);
  const bestStreakRef = useRef(saved?.bestStreak ?? 0);
  const replaysRef = useRef(saved?.replaysUsed ?? 0);
  const answerStart = useRef(0);
  const done = useRef(false);
  const wasPaused = useRef(false);
  const timeouts = useRef<number[]>([]);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...['narrow', 'longerFlash'].filter((a) => assists[a])
    ])
  );

  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };
  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ----- flow: countdown -> flash -> answer -----
  const startFlow = () => {
    clearAll();
    setPicked(null);
    setResult(null);
    resultRef.current = null;
    go('ready');
    setCount(3);
    schedule(() => setCount(2), CD);
    schedule(() => setCount(1), CD * 2);
    schedule(() => beginFlash(), CD * 3);
  };

  const beginFlash = () => {
    go('flash');
    setFlashKey((k) => k + 1);
    schedule(() => beginAnswer(), curRef.current.flashMs);
  };

  const beginAnswer = () => {
    go('answer');
    setPicked(null);
    setResult(null);
    answerStart.current = Date.now();
    setAnswerKey((k) => k + 1);
    schedule(() => resolve(null), curRef.current.answerMs);
  };

  const resolve = (choice: number | null) => {
    if (phaseRef.current !== 'answer' || done.current) return;
    clearAll();
    const q = curRef.current.question;
    const correct = choice !== null && choice === q.answerIndex;
    setPicked(choice);
    go('reveal');

    if (correct) {
      const frac = Math.max(
        0,
        Math.min(1, (curRef.current.answerMs - (Date.now() - answerStart.current)) / curRef.current.answerMs)
      );
      streakRef.current += 1;
      if (streakRef.current > bestStreakRef.current) bestStreakRef.current = streakRef.current;
      const base = 10 * roundRef.current * cfg.mult;
      const speed = Math.round(frac * 25 * cfg.mult);
      const clear = 5 * roundRef.current;
      const streakBonus = 2 * cfg.mult * Math.min(streakRef.current, 10);
      scoreRef.current += base + speed + clear + streakBonus;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setResult('good');
      resultRef.current = 'good';
      sfx.pop();
      schedule(() => advance(true), CORRECT_MS);
    } else {
      errorsRef.current += 1;
      livesRef.current -= 1;
      streakRef.current = 0;
      scoreRef.current = Math.max(0, scoreRef.current - 8 * cfg.mult);
      setErrors(errorsRef.current);
      setLives(livesRef.current);
      setStreak(0);
      setScore(scoreRef.current);
      setResult('bad');
      resultRef.current = 'bad';
      sfx.error();
      schedule(() => advance(false), WRONG_MS);
    }
  };

  const advance = (correct: boolean) => {
    if (done.current) return;
    if (livesRef.current <= 0) {
      finish('lost');
      return;
    }
    if (correct) {
      if (roundRef.current >= cfg.rounds) {
        finish('won');
        return;
      }
      roundRef.current += 1;
      setRound(roundRef.current);
    }
    // correct -> next round; wrong (but alive) -> retry this round with a fresh scene
    const next = makeRound(cfg, roundRef.current, Math.random, genOpts());
    curRef.current = next;
    setCurrent(next);
    startFlow();
  };

  const finish = (outcome: 'won' | 'lost') => {
    if (done.current) return;
    done.current = true;
    clearAll();
    let final = scoreRef.current;
    if (outcome === 'won') {
      final += 100 * cfg.mult + livesRef.current * 25 * cfg.mult;
      scoreRef.current = final;
      setScore(final);
    }
    events.onFinish({
      outcome,
      score: final,
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current],
      extra: { roundReached: roundRef.current, bestStreak: bestStreakRef.current }
    });
  };

  const onPick = (i: number) => {
    if (phaseRef.current !== 'answer' || done.current) return;
    resolve(i);
  };

  const replay = () => {
    if (
      phaseRef.current !== 'answer' ||
      done.current ||
      !assists.replay ||
      replaysRef.current >= MAX_REPLAYS
    )
      return;
    replaysRef.current += 1;
    hintsRef.current += 1;
    setReplaysUsed(replaysRef.current);
    setHintsUsed(hintsRef.current);
    assistsUsed.current.add('replay');
    sfx.hint();
    clearAll();
    go('flash');
    setFlashKey((k) => k + 1);
    schedule(() => beginAnswer(), Math.round(curRef.current.flashMs * 0.8));
  };

  // ----- mount: run the first (or resumed) round -----
  useEffect(() => {
    startFlow();
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- pause: freeze timers; on resume re-flash (or finish a pending reveal) -----
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearAll();
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (done.current) return;
      if (phaseRef.current === 'reveal') advance(resultRef.current === 'good');
      else startFlow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // passive assists toggled on mid-game still count as help
  useEffect(() => {
    if (assists.narrow) assistsUsed.current.add('narrow');
    if (assists.longerFlash) assistsUsed.current.add('longerFlash');
  }, [assists.narrow, assists.longerFlash]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { round, bestStreak: bestStreakRef.current }
    });
  }, [score, errors, hintsUsed, round, events]);

  useEffect(() => {
    registerSnapshot((): CCSave => ({
      round: roundRef.current,
      lives: livesRef.current,
      score: scoreRef.current,
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      replaysUsed: replaysRef.current,
      streak: streakRef.current,
      bestStreak: bestStreakRef.current,
      current: curRef.current,
      phase: phaseRef.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // ----- derived render values -----
  const q = current.question;
  const shapesVisible = phase === 'flash' || (phase === 'reveal' && result === 'bad');
  const cols = q.options.some((o) => o.length > 3) ? Math.min(q.options.length, 2) : q.options.length;
  const replaysLeft = MAX_REPLAYS - replaysUsed;
  const answering = phase === 'answer' || phase === 'reveal';

  return (
    <div className={`cc-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info cc-info">
        <span className="info-item">
          Round <b>{round}/{cfg.rounds}</b>
        </span>
        <span className="cc-lives" aria-label={`${lives} lives`}>
          {Array.from({ length: cfg.lives }, (_, i) => (
            <span key={i} className={`cc-pip ${i < lives ? '' : 'out'}`} />
          ))}
        </span>
        <span className={`info-item ${streak >= 3 ? 'cc-hot' : ''}`}>
          Streak <b>{streak}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
      </div>

      <div className="cc-stage-wrap">
        <div className={`cc-stage ${phase === 'reveal' && result === 'bad' ? 'shake' : ''}`}>
          <svg
            key={`canvas-${flashKey}`}
            className={`cc-canvas ${shapesVisible ? 'show' : 'hide'}`}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            {current.scene.shapes.map((s, i) => (
              <g
                key={i}
                className="cc-shape"
                style={{ animationDelay: `${Math.min(i * 34, 520)}ms` }}
              >
                <ShapeGlyph shape={s} />
              </g>
            ))}
          </svg>

          {phase === 'ready' && (
            <div className="cc-countdown" key={`count-${count}`}>
              {count}
            </div>
          )}
          {phase === 'flash' && <TimerRing key={`ring-${flashKey}`} durationMs={current.flashMs} />}
          {phase === 'reveal' && <div className={`cc-flash-overlay ${result}`} />}
        </div>
      </div>

      <div className="cc-question-area">
        {answering ? (
          <>
            <p className="cc-prompt">{q.prompt}</p>
            {phase === 'answer' && (
              <div className="cc-timebar-track">
                <div
                  className="cc-timebar"
                  key={answerKey}
                  style={{ animationDuration: `${current.answerMs}ms` }}
                />
              </div>
            )}
            {phase === 'reveal' && (
              <p className={`cc-verdict ${result}`}>
                {result === 'good' ? 'Correct!' : `It was ${q.options[q.answerIndex]}`}
              </p>
            )}
          </>
        ) : (
          <p className="cc-status">{phase === 'ready' ? 'Get ready…' : 'Memorize the shapes!'}</p>
        )}
      </div>

      <div className="game-tools fx-card">
        <div className="cc-answers" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {answering ? (
            q.options.map((opt, i) => (
              <PadTool
                key={i}
                silent
                className={
                  phase === 'reveal'
                    ? i === q.answerIndex
                      ? 'cc-correct'
                      : i === picked
                        ? 'cc-miss'
                        : ''
                    : ''
                }
                disabled={phase !== 'answer'}
                onClick={() => onPick(i)}
              >
                {opt}
              </PadTool>
            ))
          ) : (
            <div className="cc-wait">Watch carefully…</div>
          )}
        </div>

        {assists.replay && (
          <div className="cc-tools-row">
            <PadTool silent onClick={replay} disabled={phase !== 'answer' || replaysLeft <= 0}>
              <RestartIcon />
              <span>Re-flash ({replaysLeft})</span>
            </PadTool>
          </div>
        )}
      </div>
    </div>
  );
}
