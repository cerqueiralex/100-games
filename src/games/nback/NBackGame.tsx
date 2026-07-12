import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';

interface Config {
  n: number;
  trials: number;
  trialMs: number;
  hitPts: number;
}

const CONFIG: Record<Difficulty, Config> = {
  easy: { n: 1, trials: 20, trialMs: 2600, hitPts: 20 },
  medium: { n: 2, trials: 24, trialMs: 2300, hitPts: 30 },
  hard: { n: 3, trials: 28, trialMs: 2100, hitPts: 40 },
  pro: { n: 4, trials: 32, trialMs: 2000, hitPts: 50 },
  extreme: { n: 5, trials: 36, trialMs: 1900, hitPts: 60 }
};

const WIN_ACCURACY = 0.7;
const PASS_PTS = 5;
const ERROR_PENALTY = 10;

export function generateSequence(trials: number, n: number, symbols: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < trials; i++) {
    if (i >= n && Math.random() < 0.3) {
      seq.push(seq[i - n]);
    } else {
      let v = Math.floor(Math.random() * symbols);
      if (i >= n) {
        while (v === seq[i - n]) v = Math.floor(Math.random() * symbols);
      }
      seq.push(v);
    }
  }
  return seq;
}

interface NBackSave {
  seq: number[];
  idx: number;
  counts: { hit: number; miss: number; fa: number; cr: number };
  score: number;
  errors: number;
  assistsUsed: string[];
}

export function NBackGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved = savedState as NBackSave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seq = useMemo(() => saved?.seq ?? generateSequence(cfg.trials, cfg.n, 9), [cfg]);

  const [idx, setIdx] = useState(saved?.idx ?? -1); // -1 = get ready
  const [showStim, setShowStim] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);

  const pressedRef = useRef(false);
  const counts = useRef(saved ? { ...saved.counts } : { hit: 0, miss: 0, fa: 0, cr: 0 });
  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...['feedback', 'showHistory', 'slowMode'].filter((a) => assists[a])
    ])
  );

  // passive assists toggled on mid-game still count as help for this game
  useEffect(() => {
    for (const a of ['feedback', 'showHistory', 'slowMode']) {
      if (assists[a]) assistsUsed.current.add(a);
    }
  }, [assists]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed: 0,
      assistsUsed: [...assistsUsed.current],
      extra: { trial: Math.max(0, idx), n: cfg.n }
    });
  }, [score, errors, idx, events, cfg.n]);

  const finishRun = useCallback(
    (finalScore: number, e: number) => {
      if (done.current) return;
      done.current = true;
      const c = counts.current;
      const accuracy = (c.hit + c.cr) / cfg.trials;
      events.onFinish({
        outcome: accuracy >= WIN_ACCURACY ? 'won' : 'lost',
        score: finalScore,
        errors: e,
        hintsUsed: 0,
        assistsUsed: [...assistsUsed.current],
        extra: {
          n: cfg.n,
          accuracy: `${Math.round(accuracy * 100)}%`,
          hits: c.hit,
          missed: c.miss,
          falseAlarms: c.fa
        }
      });
    },
    [events, cfg]
  );

  // trial state machine: show stimulus, then evaluate at the end of the trial.
  // Pausing clears the timers; resuming re-runs the same trial from its start.
  useEffect(() => {
    if (paused || done.current || idx >= cfg.trials) return;
    const ms = cfg.trialMs * (assists.slowMode ? 1.35 : 1);
    const ts: number[] = [];
    if (idx === -1) {
      ts.push(window.setTimeout(() => setIdx(0), 1600));
    } else {
      setShowStim(true);
      pressedRef.current = false;
      setPressed(false);
      setFeedback(null);
      ts.push(window.setTimeout(() => setShowStim(false), ms * 0.4));
      ts.push(
        window.setTimeout(() => {
          const isMatch = idx >= cfg.n && seq[idx] === seq[idx - cfg.n];
          const answered = pressedRef.current;
          const c = counts.current;
          let good: boolean;
          if (isMatch && answered) {
            c.hit++;
            good = true;
          } else if (isMatch && !answered) {
            c.miss++;
            good = false;
          } else if (!isMatch && answered) {
            c.fa++;
            good = false;
          } else {
            c.cr++;
            good = true;
          }
          let nextScore = score;
          let nextErrors = errors;
          if (good) {
            nextScore += isMatch ? cfg.hitPts : PASS_PTS;
          } else {
            nextScore = Math.max(0, nextScore - ERROR_PENALTY);
            nextErrors += 1;
            setErrors(nextErrors);
            if (assists.feedback) sfx.error();
          }
          setScore(nextScore);
          if (assists.feedback) setFeedback(good ? 'good' : 'bad');
          if (idx + 1 >= cfg.trials) finishRun(nextScore, nextErrors);
          else setIdx(idx + 1);
        }, ms)
      );
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused]);

  const press = () => {
    if (paused || done.current || idx < 0 || pressedRef.current) return;
    pressedRef.current = true;
    setPressed(true);
    sfx.tap();
  };

  const ghost = assists.showHistory && idx >= cfg.n ? seq[idx - cfg.n] : null;

  useEffect(() => {
    registerSnapshot(() => ({
      seq,
      idx,
      counts: { ...counts.current },
      score,
      errors,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`nback ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          N = <b>{cfg.n}</b>
        </span>
        <span className="info-item">
          Trial: <b>{Math.max(0, Math.min(idx + 1, cfg.trials))} / {cfg.trials}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
      </div>

      <p className="simon-status">
        {idx === -1
          ? 'Get ready…'
          : `Does the square match the one ${cfg.n} step${cfg.n > 1 ? 's' : ''} back?`}
      </p>

      <div className="nb-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={[
              'nb-cell',
              showStim && idx >= 0 && seq[idx] === i ? 'active' : '',
              ghost === i ? 'ghost' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      {feedback && (
        <p className={`nb-feedback ${feedback}`}>{feedback === 'good' ? 'Correct' : 'Wrong'}</p>
      )}

      <div className="game-tools fx-card">
      <button
        className={`nb-match ${pressed ? 'armed' : ''}`}
        onClick={press}
        disabled={idx < 0 || pressed}
      >
        Match
      </button>
      </div>
    </div>
  );
}
