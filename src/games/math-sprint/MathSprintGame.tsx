import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  TIERS,
  makeProblem,
  answerOf,
  problemTokens,
  problemAria,
  type Problem,
  type TierConfig
} from './logic/problems';

/* ------------------------------------------------------------- tuning knobs */
const BASE = 10; // base points per correct answer
const SPEED_MAX = 8; // max speed bonus × diffMult (full budget remaining)
const WIN_BONUS = 120; // × diffMult
const TIME_BONUS = 4; // × diffMult, per remaining second
const WRONG_PEN = 3; // clock seconds lost on a wrong answer
const TIMEOUT_PEN = 3; // clock seconds lost when the per-problem timer expires
const SKIP_PEN = 2; // clock seconds lost on skip
const HINT_PEN = 15; // score lost when the nudge is used
const MAX_LEN = 4; // typed answers never exceed 4 digits

/** streak (consecutive correct) → score multiplier, capped at ×3 */
function streakMult(streak: number): number {
  return 1 + Math.min(4, Math.floor(streak / 3)) * 0.5;
}

const PASSIVE_ASSISTS = ['moreTime', 'simpleMode'];

interface MathSprintSave {
  problem: Problem;
  entry: string;
  correctCount: number;
  streak: number;
  bestStreak: number;
  score: number;
  errors: number;
  hintsUsed: number;
  penaltySec: number;
  assistsUsed: string[];
}

/** skip-forward glyph (no matching icon in the shared set) */
function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5l9 7-9 7z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </svg>
  );
}

/** backspace glyph (no matching icon in the shared set) */
function BackspaceGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9L3 12z" />
      <path d="M17 9l-5 6M12 9l5 6" />
    </svg>
  );
}

/** little flame badge for the streak meter */
function FlameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2c1.5 3.2.4 5.2-1.2 6.9-1.6 1.7-2.8 3.2-2.8 5.6A4 4 0 0 0 12 22a4 4 0 0 0 4-4c0-1.7-.8-2.9-1.6-4 .2 1-.4 1.9-1.2 2.2.6-2 .1-4-1.7-6.2C14 7.4 14.6 5 12 2Z" />
    </svg>
  );
}

export function MathSprintGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = TIERS[difficulty];
  const saved = savedState as MathSprintSave | undefined;

  // effective config used when generating the NEXT problem (simple-mode may
  // toggle mid-run, so read it off a ref rather than baking it in)
  const effCfgRef = useRef<TierConfig>(cfg);
  effCfgRef.current = { ...cfg, capScaling: !!assists.simpleMode };

  const [problem, setProblem] = useState<Problem>(
    () => saved?.problem ?? makeProblem({ ...cfg, capScaling: !!assists.simpleMode }, 0, Math.random)
  );
  const [entry, setEntry] = useState(saved?.entry ?? '');
  const [correctCount, setCorrectCount] = useState(saved?.correctCount ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [penaltySec, setPenaltySec] = useState(saved?.penaltySec ?? 0);

  const [index, setIndex] = useState(0); // advances every problem, keys animations
  const [armSeq, setArmSeq] = useState(0); // restarts the per-problem bar on each (re)arm
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [reveal, setReveal] = useState<string | null>(null); // correct answer flashed on a miss
  const [nudge, setNudge] = useState<string | null>(null);
  const [float, setFloat] = useState<{ key: number; text: string } | null>(null);
  const [penaltyFlash, setPenaltyFlash] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);

  const done = useRef(false);
  const bestStreak = useRef(saved?.bestStreak ?? 0);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const timers = useRef<number[]>([]);
  const floatKey = useRef(0);
  const probStartRef = useRef(performance.now());

  // mirrors so timeout / finish paths always read the freshest values
  const scoreRef = useRef(score); scoreRef.current = score;
  const errorsRef = useRef(errors); errorsRef.current = errors;
  const hintsRef = useRef(hintsUsed); hintsRef.current = hintsUsed;
  const streakRef = useRef(streak); streakRef.current = streak;
  const correctRef = useRef(correctCount); correctRef.current = correctCount;
  const penaltyRef = useRef(penaltySec); penaltyRef.current = penaltySec;
  const elapsedRef = useRef(elapsedSec); elapsedRef.current = elapsedSec;

  const effTime = Math.round(cfg.timeSec * (assists.moreTime ? 1.2 : 1));
  const remaining = Math.max(0, effTime - elapsedSec - penaltySec);
  const low = remaining <= 10;
  const dispMult = streakMult(streak);

  /* ---------------------------------------------------------------- finish */
  const finishGame = (outcome: 'won' | 'lost', finalScore: number) => {
    if (done.current) return;
    done.current = true;
    setEnded(true);
    bestStreak.current = Math.max(bestStreak.current, streakRef.current);
    events.onFinish({
      outcome,
      score: Math.max(0, Math.round(finalScore)),
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current],
      extra: {
        correct: correctRef.current,
        target: cfg.target,
        bestStreak: bestStreak.current
      }
    });
  };

  // overall clock empties → lose (penalties can also drive it to zero)
  useEffect(() => {
    if (done.current) return;
    if (remaining <= 0) finishGame('lost', scoreRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // countdown ticks under 5s
  useEffect(() => {
    if (ended || paused) return;
    if (remaining <= 5 && remaining > 0) playNote(1180, 55, 'square');
  }, [remaining, ended, paused]);

  /* ------------------------------------------------------------ live stats */
  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { correct: correctCount, target: cfg.target, streak, bestStreak: bestStreak.current }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, errors, hintsUsed, correctCount, streak, events, cfg.target]);

  // passive assists toggled on at any point still count as help
  useEffect(() => {
    for (const a of PASSIVE_ASSISTS) if (assists[a]) assistsUsed.current.add(a);
  }, [assists]);

  /* ------------------------------------------------------------- advancing */
  const advance = () => {
    setProblem(makeProblem(effCfgRef.current, streakRef.current, Math.random));
    setEntry('');
    setReveal(null);
    setFeedback(null);
    setNudge(null);
    setIndex((i) => i + 1);
  };

  const handleMiss = (isTimeout: boolean) => {
    if (done.current || reveal) return;
    sfx.error();
    setErrors((e) => e + 1);
    streakRef.current = 0;
    setStreak(0);
    const pen = isTimeout ? TIMEOUT_PEN : WRONG_PEN;
    penaltyRef.current += pen;
    setPenaltySec((p) => p + pen);
    setPenaltyFlash(pen);
    setReveal(String(answerOf(problem)));
    setFeedback('bad');
    timers.current.push(window.setTimeout(() => setPenaltyFlash(null), 750));
    timers.current.push(window.setTimeout(advance, 950));
  };

  const submit = () => {
    if (ended || paused || reveal || entry === '') return;
    if (Number(entry) === answerOf(problem)) {
      // correct
      const ns = streakRef.current + 1;
      sfx.pop();
      playNote(430 + Math.min(ns, 14) * 42, 130, 'triangle');
      const spent = performance.now() - probStartRef.current;
      const speed = Math.round(Math.max(0, 1 - spent / (cfg.budgetSec * 1000)) * SPEED_MAX * cfg.diffMult);
      const gained = Math.round(BASE * streakMult(ns) * cfg.diffMult) + speed;
      const nScore = scoreRef.current + gained;
      const nCorrect = correctRef.current + 1;
      bestStreak.current = Math.max(bestStreak.current, ns);
      streakRef.current = ns;
      scoreRef.current = nScore;
      correctRef.current = nCorrect;
      setStreak(ns);
      setScore(nScore);
      setCorrectCount(nCorrect);
      setFeedback('good');
      setFloat({ key: floatKey.current++, text: `+${gained}` });
      if (nCorrect >= cfg.target) {
        const winBonus = WIN_BONUS * cfg.diffMult + remaining * TIME_BONUS * cfg.diffMult;
        finishGame('won', nScore + winBonus);
      } else {
        timers.current.push(window.setTimeout(advance, 260));
      }
    } else {
      handleMiss(false);
    }
  };

  /* -------------------------------------------------- per-problem soft timer */
  // arms a fresh countdown for each problem; a timeout is scored like a miss.
  // Cleared on pause; on resume it replays the current problem's budget from
  // full (platform convention for timed games) — armSeq restarts the bar too.
  const missRef = useRef(handleMiss);
  missRef.current = handleMiss;
  useEffect(() => {
    if (ended || paused) return;
    probStartRef.current = performance.now();
    setArmSeq((s) => s + 1);
    const t = window.setTimeout(() => missRef.current(true), cfg.budgetSec * 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, ended]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  /* --------------------------------------------------------------- input */
  const pushDigit = (d: string) => {
    if (ended || paused || reveal) return;
    sfx.tap();
    setEntry((e) => {
      if (e.length >= MAX_LEN) return e;
      if (e === '0') return d; // no leading zeros
      return e + d;
    });
  };

  const backspace = () => {
    if (ended || paused || reveal) return;
    sfx.tap();
    setEntry((e) => e.slice(0, -1));
  };

  const skip = () => {
    if (ended || paused || reveal || !assists.skip) return;
    assistsUsed.current.add('skip');
    streakRef.current = 0;
    setStreak(0);
    penaltyRef.current += SKIP_PEN;
    setPenaltySec((p) => p + SKIP_PEN);
    setPenaltyFlash(SKIP_PEN);
    timers.current.push(window.setTimeout(() => setPenaltyFlash(null), 750));
    advance();
  };

  const useNudge = () => {
    if (ended || paused || reveal || !assists.nudge || nudge) return;
    const s = String(answerOf(problem));
    setNudge(s.length === 1 ? '1 digit' : `${s.length} digits · tens ${s[s.length - 2]}`);
    setHintsUsed((h) => h + 1);
    hintsRef.current += 1;
    assistsUsed.current.add('nudge');
    setScore((v) => Math.max(0, v - HINT_PEN));
    sfx.hint();
  };

  // physical keyboard (desktop)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (ended || paused || reveal) return;
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      pushDigit(e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      backspace();
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      submit();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* --------------------------------------------------------------- snapshot */
  useEffect(() => {
    registerSnapshot(
      () =>
        ({
          problem,
          entry,
          correctCount,
          streak,
          bestStreak: bestStreak.current,
          score,
          errors,
          hintsUsed,
          penaltySec,
          assistsUsed: [...assistsUsed.current]
        }) satisfies MathSprintSave
    );
  });

  /* ------------------------------------------------------------------- view */
  const tokens = problemTokens(problem);
  const slotContent = reveal ?? (entry === '' ? null : entry);
  const showTools = assists.skip || assists.nudge;

  return (
    <div className={`math-sprint ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Solved: <b>{correctCount} / {cfg.target}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
      </div>

      <div className="ms-top">
        <div className="ms-timer">
          <div
            className={`ms-timer-fill ${low ? 'low' : ''}`}
            style={{ width: `${(remaining / effTime) * 100}%` }}
          />
          <span className={`ms-timer-label ${low ? 'low' : ''}`}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
          {penaltyFlash !== null && <span className="ms-penalty">-{penaltyFlash}s</span>}
        </div>
        <div className={`ms-streak ${dispMult > 1 ? 'hot' : ''} ${streak === 0 ? 'idle' : ''}`}>
          <FlameIcon />
          <span>
            {streak}
            {dispMult > 1 ? ` ·×${dispMult}` : ''}
          </span>
        </div>
      </div>

      <div className="ms-prob" aria-hidden>
        <div
          key={armSeq}
          className={`ms-prob-fill ${paused || ended || reveal ? 'paused' : ''}`}
          style={{ animationDuration: `${cfg.budgetSec * 1000}ms` }}
        />
      </div>

      <div className="ms-stage">
        <div
          key={index}
          className={`ms-card fx-card ${feedback ? `flash-${feedback}` : ''}`}
          aria-label={problemAria(problem)}
        >
          <div className="ms-equation">
            {tokens.map((tk, i) => {
              if (tk.t === 'slot') {
                return (
                  <span
                    key={i}
                    className={`ms-slot ${reveal ? 'reveal' : ''} ${feedback === 'good' ? 'good' : ''}`}
                  >
                    {slotContent}
                    {!reveal && <span className="ms-caret" />}
                  </span>
                );
              }
              if (tk.t === 'eq') return <span key={i} className="ms-eq">=</span>;
              if (tk.t === 'op') return <span key={i} className="ms-op">{tk.s}</span>;
              if (tk.t === 'sq')
                return (
                  <span key={i} className="ms-num">
                    {tk.s}
                    <sup>2</sup>
                  </span>
                );
              return <span key={i} className="ms-num">{tk.s}</span>;
            })}
          </div>
        </div>
        {float && (
          <span key={float.key} className="ms-float">
            {float.text}
          </span>
        )}
      </div>

      {nudge && <div className="ms-nudge">Answer: {nudge}</div>}

      <div className="game-tools fx-card">
        {showTools && (
          <div className="sudoku-controls">
            {assists.nudge && (
              <PadTool silent onClick={useNudge} disabled={!!nudge}>
                <BulbIcon />
                <span>Nudge</span>
              </PadTool>
            )}
            {assists.skip && (
              <PadTool onClick={skip}>
                <SkipIcon />
                <span>Skip</span>
              </PadTool>
            )}
          </div>
        )}
        <div className="ms-pad">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((d) => (
            <button key={d} className="ms-key" onClick={() => pushDigit(d)} disabled={ended || !!reveal}>
              {d}
            </button>
          ))}
          <button className="ms-key ms-key-util" onClick={backspace} disabled={ended || !!reveal} aria-label="Delete">
            <BackspaceGlyph />
          </button>
          <button className="ms-key" onClick={() => pushDigit('0')} disabled={ended || !!reveal}>
            0
          </button>
          <button
            className="ms-key ms-key-enter"
            onClick={submit}
            disabled={ended || !!reveal || entry === ''}
            aria-label="Submit answer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
