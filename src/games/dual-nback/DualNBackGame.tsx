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
  easy: { n: 1, trials: 20, trialMs: 2800, hitPts: 25 },
  medium: { n: 2, trials: 24, trialMs: 2500, hitPts: 35 },
  hard: { n: 3, trials: 28, trialMs: 2300, hitPts: 45 },
  pro: { n: 4, trials: 32, trialMs: 2200, hitPts: 55 },
  extreme: { n: 5, trials: 36, trialMs: 2100, hitPts: 65 }
};

const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S'];
const WIN_ACCURACY = 0.65;
const PASS_PTS = 3;
const ERROR_PENALTY = 10;

function generateSequence(trials: number, n: number, symbols: number): number[] {
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

interface DualSave {
  seqPos: number[];
  seqLet: number[];
  idx: number;
  counts: { hit: number; miss: number; fa: number; cr: number };
  score: number;
  errors: number;
  assistsUsed: string[];
}

export function DualNBackGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved = savedState as DualSave | undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seqPos = useMemo(() => saved?.seqPos ?? generateSequence(cfg.trials, cfg.n, 9), [cfg]);
  const seqLet = useMemo(
    () => saved?.seqLet ?? generateSequence(cfg.trials, cfg.n, LETTERS.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg]
  );

  const [idx, setIdx] = useState(saved?.idx ?? -1);
  const [showStim, setShowStim] = useState(false);
  const [pressedPos, setPressedPos] = useState(false);
  const [pressedLet, setPressedLet] = useState(false);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);

  const pressedPosRef = useRef(false);
  const pressedLetRef = useRef(false);
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
      const accuracy = (c.hit + c.cr) / (cfg.trials * 2);
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

  useEffect(() => {
    if (paused || done.current || idx >= cfg.trials) return;
    const ms = cfg.trialMs * (assists.slowMode ? 1.35 : 1);
    const ts: number[] = [];
    if (idx === -1) {
      ts.push(window.setTimeout(() => setIdx(0), 1600));
    } else {
      setShowStim(true);
      pressedPosRef.current = false;
      pressedLetRef.current = false;
      setPressedPos(false);
      setPressedLet(false);
      setFeedback(null);
      ts.push(window.setTimeout(() => setShowStim(false), ms * 0.4));
      ts.push(
        window.setTimeout(() => {
          const c = counts.current;
          let trialErrors = 0;
          let gained = 0;
          for (const [seq, answered] of [
            [seqPos, pressedPosRef.current],
            [seqLet, pressedLetRef.current]
          ] as const) {
            const isMatch = idx >= cfg.n && seq[idx] === seq[idx - cfg.n];
            if (isMatch && answered) {
              c.hit++;
              gained += cfg.hitPts;
            } else if (isMatch && !answered) {
              c.miss++;
              trialErrors++;
            } else if (!isMatch && answered) {
              c.fa++;
              trialErrors++;
            } else {
              c.cr++;
              gained += PASS_PTS;
            }
          }
          const nextScore = Math.max(0, score + gained - trialErrors * ERROR_PENALTY);
          const nextErrors = errors + trialErrors;
          setScore(nextScore);
          if (trialErrors > 0) {
            setErrors(nextErrors);
            if (assists.feedback) sfx.error();
          }
          if (assists.feedback) setFeedback(trialErrors === 0 ? 'good' : 'bad');
          if (idx + 1 >= cfg.trials) finishRun(nextScore, nextErrors);
          else setIdx(idx + 1);
        }, ms)
      );
    }
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, paused]);

  const press = (channel: 'pos' | 'let') => {
    if (paused || done.current || idx < 0) return;
    sfx.tap();
    if (channel === 'pos' && !pressedPosRef.current) {
      pressedPosRef.current = true;
      setPressedPos(true);
    }
    if (channel === 'let' && !pressedLetRef.current) {
      pressedLetRef.current = true;
      setPressedLet(true);
    }
  };

  const ghostPos = assists.showHistory && idx >= cfg.n ? seqPos[idx - cfg.n] : null;
  const ghostLet = assists.showHistory && idx >= cfg.n ? LETTERS[seqLet[idx - cfg.n]] : null;

  useEffect(() => {
    registerSnapshot(() => ({
      seqPos,
      seqLet,
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
          : `Match the position AND/OR the letter from ${cfg.n} step${cfg.n > 1 ? 's' : ''} back`}
      </p>

      <div className="nb-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={[
              'nb-cell',
              showStim && idx >= 0 && seqPos[idx] === i ? 'active' : '',
              ghostPos === i ? 'ghost' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {showStim && idx >= 0 && seqPos[idx] === i && (
              <span className="nb-letter">{LETTERS[seqLet[idx]]}</span>
            )}
          </div>
        ))}
      </div>

      {ghostLet && (
        <p className="nb-ghost-letter">
          Letter {cfg.n} back: <b>{ghostLet}</b>
        </p>
      )}
      {feedback && (
        <p className={`nb-feedback ${feedback}`}>{feedback === 'good' ? 'Correct' : 'Wrong'}</p>
      )}

      <div className="game-tools fx-card">
      <div className="nb-dual-actions">
        <button
          className={`nb-match ${pressedPos ? 'armed' : ''}`}
          onClick={() => press('pos')}
          disabled={idx < 0 || pressedPos}
        >
          Position
        </button>
        <button
          className={`nb-match ${pressedLet ? 'armed' : ''}`}
          onClick={() => press('let')}
          disabled={idx < 0 || pressedLet}
        >
          Letter
        </button>
      </div>
      </div>
    </div>
  );
}
