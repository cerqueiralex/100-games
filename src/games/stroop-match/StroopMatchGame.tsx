import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { BulbIcon, PadTool } from '../../platform/components/ui';
import {
  activeColorIds,
  colorById,
  correctAnswer,
  makeTrial,
  PALETTE,
  streakMult,
  TIERS,
  trialScore,
  winBonus,
  type GlyphId,
  type Trial
} from './logic/trials';

interface StroopSave {
  trial: Trial;
  nextTrial: Trial;
  correct: number;
  streak: number;
  bestStreak: number;
  lives: number;
  score: number;
  errors: number;
  hints: number;
  assistsUsed: string[];
  trialSeq: number;
}

const PASSIVE = ['slowTimer', 'ruleLabel'] as const;

/** Colourblind-safe swatch glyphs, monochrome, drawn in --ink on the swatch. */
function Glyph({ id }: { id: GlyphId }) {
  const common = { fill: 'currentColor' } as const;
  switch (id) {
    case 'circle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="8" {...common} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 4 L20 19 L4 19 Z" {...common} />
        </svg>
      );
    case 'square':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <rect x="5" y="5" width="14" height="14" rx="2.5" {...common} />
        </svg>
      );
    case 'star':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3 L14.7 9.3 L21.5 9.9 L16.4 14.4 L18 21 L12 17.3 L6 21 L7.6 14.4 L2.5 9.9 L9.3 9.3 Z" {...common} />
        </svg>
      );
    case 'diamond':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3 L20 12 L12 21 L4 12 Z" {...common} />
        </svg>
      );
    case 'hexagon':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M7 4 H17 L22 12 L17 20 H7 L2 12 Z" {...common} />
        </svg>
      );
    case 'heart':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 20 C4 14 3 9 6 6.4 C8.3 4.4 11 5.4 12 7.4 C13 5.4 15.7 4.4 18 6.4 C21 9 20 14 12 20 Z" {...common} />
        </svg>
      );
  }
}

function HeartPip({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className={`stp-pip ${filled ? 'on' : ''}`} aria-hidden>
      <path
        d="M12 20 C4 14 3 9 6 6.4 C8.3 4.4 11 5.4 12 7.4 C13 5.4 15.7 4.4 18 6.4 C21 9 20 14 12 20 Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 5 L13 12 L5 19 Z" fill="currentColor" stroke="none" />
      <path d="M17 5 V19" />
    </svg>
  );
}

export function StroopMatchGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = TIERS[difficulty];
  const saved = savedState as StroopSave | undefined;

  const [trial, setTrial] = useState<Trial>(() => saved?.trial ?? makeTrial(cfg, Math.random));
  const [nextTrial, setNextTrial] = useState<Trial>(() => saved?.nextTrial ?? makeTrial(cfg, Math.random));
  const [correct, setCorrect] = useState(saved?.correct ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [bestStreak, setBestStreak] = useState(saved?.bestStreak ?? 0);
  const [lives, setLives] = useState(saved?.lives ?? cfg.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hints, setHints] = useState(saved?.hints ?? 0);
  const [trialSeq, setTrialSeq] = useState(saved?.trialSeq ?? 0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [fiftyOut, setFiftyOut] = useState<string[]>([]);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  const [ringKey, setRingKey] = useState(0);

  const done = useRef(false);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const flashRef = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE.filter((a) => assists[a])])
  );

  const effectiveMs = cfg.trialMs * (assists.slowTimer ? 1.4 : 1);
  const colors = PALETTE.slice(0, cfg.colorCount);
  const active = activeColorIds(trial, cfg);
  const wordColor = colorById(trial.word);
  const inkColor = colorById(trial.ink);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, e: number, h: number, cor: number, best: number) => {
      if (done.current) return;
      done.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      events.onFinish({
        outcome,
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { correct: cor, goal: cfg.goal, bestStreak: best }
      });
    },
    [events, cfg.goal]
  );

  const scheduleFlashClear = () => {
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => setFlash(null), 380);
  };

  const advance = useCallback(() => {
    setTrial(nextTrial);
    setNextTrial(makeTrial(cfg, Math.random));
    setFiftyOut([]);
    setFiftyUsed(false);
    setTrialSeq((s) => s + 1);
  }, [nextTrial, cfg]);

  const resolve = useCallback(
    (picked: string | null) => {
      if (done.current || paused) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const answerId = correctAnswer(trial);
      const hit = picked !== null && picked === answerId;

      if (hit) {
        const frac = 1 - (performance.now() - startRef.current) / effectiveMs;
        const newStreak = streak + 1;
        const gain = trialScore(cfg, newStreak, frac);
        const newCorrect = correct + 1;
        const won = newCorrect >= cfg.goal;
        const finalScore = score + gain + (won ? winBonus(cfg) : 0);
        setStreak(newStreak);
        setBestStreak((b) => Math.max(b, newStreak));
        setScore(finalScore);
        setCorrect(newCorrect);
        setFlash('good');
        sfx.pop();
        playNote(440 + Math.min(newStreak, 12) * 36, 130, 'triangle');
        if (won) {
          finish('won', finalScore, errors, hints, newCorrect, Math.max(bestStreak, newStreak));
          return;
        }
        scheduleFlashClear();
        advance();
      } else {
        const newLives = lives - 1;
        const newErrors = errors + 1;
        setLives(newLives);
        setErrors(newErrors);
        setStreak(0);
        setFlash('bad');
        sfx.error();
        if (newLives <= 0) {
          finish('lost', score, newErrors, hints, correct, bestStreak);
          return;
        }
        scheduleFlashClear();
        advance();
      }
    },
    [trial, paused, effectiveMs, streak, correct, score, lives, errors, hints, bestStreak, cfg, advance, finish]
  );

  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  // Per-trial countdown. Cleared on pause; on resume the current trial's
  // timer (and its ring) restart from full — the platform pattern for timed
  // games (see simon/nback). A new trial or a slow-timer toggle restarts too.
  useEffect(() => {
    if (paused || done.current) return;
    startRef.current = performance.now();
    setRingKey((k) => k + 1);
    timerRef.current = window.setTimeout(() => resolveRef.current(null), effectiveMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [trialSeq, paused, effectiveMs]);

  // passive assists toggled on mid-game still count as help
  useEffect(() => {
    for (const a of PASSIVE) if (assists[a]) assistsUsed.current.add(a);
  }, [assists]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed: hints,
      assistsUsed: [...assistsUsed.current],
      extra: { correct, goal: cfg.goal, bestStreak }
    });
  }, [score, errors, hints, correct, bestStreak, events, cfg.goal]);

  useEffect(() => {
    registerSnapshot(() => ({
      trial,
      nextTrial,
      correct,
      streak,
      bestStreak,
      lives,
      score,
      errors,
      hints,
      assistsUsed: [...assistsUsed.current],
      trialSeq
    }));
  });

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    },
    []
  );

  const skip = () => {
    if (done.current || paused || !assists.skip) return;
    assistsUsed.current.add('skip');
    if (timerRef.current) clearTimeout(timerRef.current);
    setFlash(null);
    advance();
  };

  const fifty = () => {
    if (done.current || paused || !assists.fifty || fiftyUsed) return;
    const answerId = correctAnswer(trial);
    const wrong = active.filter((id) => id !== answerId);
    // grey up to two wrong buttons
    for (let i = wrong.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrong[i], wrong[j]] = [wrong[j], wrong[i]];
    }
    const hide = wrong.slice(0, 2);
    if (hide.length === 0) return;
    setFiftyOut(hide);
    setFiftyUsed(true);
    setHints((h) => h + 1);
    assistsUsed.current.add('fifty');
    sfx.hint();
  };

  const ruleWord = trial.rule === 'word' ? 'WORD' : trial.rule === 'odd' ? 'ODD' : 'INK';
  const instruction = assists.ruleLabel
    ? trial.rule === 'word'
      ? 'Tap the colour the WORD names'
      : trial.rule === 'odd'
        ? 'Tap the colour that is NEITHER word nor ink'
        : 'Tap the INK colour, not the word'
    : ruleWord;

  const mult = streakMult(streak);

  return (
    <div className={`stp ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Correct <b>{correct}/{cfg.goal}</b>
        </span>
        <span className="info-item">
          Streak <b>{streak}</b>
          {streak >= 2 && <span className="stp-mult"> ×{mult.toFixed(2)}</span>}
        </span>
        <span className="stp-lives" aria-label={`${lives} of ${cfg.lives} lives`}>
          {Array.from({ length: cfg.lives }, (_, i) => (
            <HeartPip key={i} filled={i < lives} />
          ))}
        </span>
      </div>

      <p className={`stp-instruction ${assists.ruleLabel ? '' : 'tag'} r-${trial.rule}`}>{instruction}</p>

      <div className="stp-stage">
        <div className={`stp-card ${flash ?? ''} ${trial.rule !== 'ink' ? 'flip' : ''}`}>
          <span className={`stp-tag r-${trial.rule}`}>{ruleWord}</span>
          <span key={trialSeq} className="stp-word" style={{ color: `var(${inkColor.token})` }}>
            {wordColor.name}
          </span>
        </div>
        <svg className="stp-ring" viewBox="0 0 100 100" aria-hidden>
          <rect className="stp-ring-track" x="3" y="3" width="94" height="94" rx="18" pathLength={100} />
          <rect
            key={ringKey}
            className={`stp-ring-fill ${paused ? 'paused' : ''}`}
            x="3"
            y="3"
            width="94"
            height="94"
            rx="18"
            pathLength={100}
            style={{ animationDuration: `${effectiveMs}ms` }}
          />
        </svg>
      </div>

      <div className="game-tools fx-card">
        <div className={`stp-answers cols-${colors.length}`}>
          {colors.map((c) => {
            const enabled = active.includes(c.id) && !fiftyOut.includes(c.id);
            return (
              <PadTool
                key={c.id}
                silent
                className="stp-answer"
                disabled={!enabled || paused}
                onClick={() => resolve(c.id)}
                style={{ '--sw': `var(${c.token})` } as CSSProperties}
                aria-label={c.name}
              >
                <span className="stp-swatch">
                  <Glyph id={c.glyph} />
                </span>
                <span className="stp-name">{c.name}</span>
              </PadTool>
            );
          })}
        </div>

        {(assists.fifty || assists.skip) && (
          <div className="stp-tools">
            {assists.fifty && (
              <PadTool silent onClick={fifty} disabled={fiftyUsed || paused} aria-label="Grey out two wrong colours">
                <BulbIcon />
                <span>50/50</span>
              </PadTool>
            )}
            {assists.skip && (
              <PadTool onClick={skip} disabled={paused} aria-label="Skip this trial without penalty">
                <SkipIcon />
                <span>Skip</span>
              </PadTool>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
