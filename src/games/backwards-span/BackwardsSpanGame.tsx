import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { PadTool, RestartIcon, CheckIcon } from '../../platform/components/ui';
import {
  CONFIG,
  charPool,
  expectedAnswer,
  isCorrect,
  makeSequence,
  type Config
} from './logic/game';

type Phase = 'presenting' | 'answering';

interface Save {
  span: number;
  sequence: string[];
  entered: string[];
  lives: number;
  score: number;
  errors: number;
  hintsUsed: number;
  bestSpan: number;
  phase: Phase;
  assistsUsed: string[];
}

const MAX_REPLAYS = 3;
/* rising major-ish scale so each flashed symbol has its own bright pitch */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 19, 21];
const pitch = (i: number) => 294 * Math.pow(2, SCALE[i % SCALE.length] / 12);

/** A small backspace glyph (no such icon in the design set). */
function BackspaceGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 5H8.5L2.5 12l6 7H20a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="M16 9l-5 6M11 9l5 6" />
    </svg>
  );
}

/** Direction reminder arrow: a curl-back for reverse, a straight arrow for forward. */
function DirArrow({ reverse }: { reverse: boolean }) {
  return reverse ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M3 3.5V8h4.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function BackwardsSpanGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg: Config = CONFIG[difficulty];
  const saved = savedState as Save | undefined;

  const [span, setSpan] = useState(saved?.span ?? cfg.startSpan);
  const [sequence, setSequence] = useState<string[]>(
    () => saved?.sequence ?? makeSequence(cfg, Math.random, saved?.span ?? cfg.startSpan)
  );
  const [entered, setEntered] = useState<string[]>(saved?.entered ?? []);
  const [lives, setLives] = useState(saved?.lives ?? cfg.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [bestSpan, setBestSpan] = useState(saved?.bestSpan ?? 0);
  const [phase, setPhase] = useState<Phase>(saved?.phase ?? 'presenting');

  // presentation display
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [presentedCount, setPresentedCount] = useState(0);
  // answer feedback
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [reveal, setReveal] = useState<string[] | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [reminderOn, setReminderOn] = useState(true);

  // refs read inside timeouts (kept in sync with state every render)
  const spanRef = useRef(span);
  spanRef.current = span;
  const seqRef = useRef(sequence);
  seqRef.current = sequence;
  const livesRef = useRef(lives);
  livesRef.current = lives;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;
  const bestRef = useRef(bestSpan);
  bestRef.current = bestSpan;

  const done = useRef(false);
  const evaluating = useRef(false); // guards against a double commit in one round
  const timeouts = useRef<number[]>([]);
  const wasPaused = useRef(false);
  const replaysUsed = useRef(saved?.hintsUsed ?? 0);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(['slow-flash', 'direction-reminder'] as const).filter((a) => assists[a])
    ])
  );

  const clearAll = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };

  // ── presentation ────────────────────────────────────────────────────────
  const presentRound = useCallback(
    (seq: string[]) => {
      clearAll();
      evaluating.current = false;
      setPhase('presenting');
      setFlashIdx(null);
      setPresentedCount(0);
      setEntered([]);
      setFeedback(null);
      setReveal(null);
      setBanner(null);
      const step = cfg.flashMs * (assists['slow-flash'] ? 1.4 : 1);
      const start = 550;
      seq.forEach((_, i) => {
        schedule(() => {
          setFlashIdx(i);
          setPresentedCount(i + 1);
          playNote(pitch(i), Math.min(step * 0.6, 380), 'triangle');
        }, start + i * step);
        // blank the stage before the next symbol so repeats read as two flashes
        schedule(() => setFlashIdx(null), start + i * step + step * 0.62);
      });
      schedule(() => {
        setPhase('answering');
        setFlashIdx(null);
        sfx.tap();
      }, start + seq.length * step + 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg.flashMs, assists['slow-flash']]
  );

  const nextRound = useCallback(
    (newSpan: number) => {
      const seq = makeSequence(cfg, Math.random, newSpan);
      spanRef.current = newSpan;
      seqRef.current = seq;
      setSpan(newSpan);
      setSequence(seq);
      presentRound(seq);
    },
    [cfg, presentRound]
  );

  // first round (or resume): re-present unless we resume mid-answer
  useEffect(() => {
    if (saved && saved.phase === 'answering') {
      // answering state already hydrated from the snapshot — nothing to schedule
      setFlashIdx(null);
    } else {
      presentRound(seqRef.current);
    }
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause: freeze + hide the stage; resume: re-present the current round
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearAll();
      setFlashIdx(null);
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (!done.current) presentRound(seqRef.current);
    }
  }, [paused, presentRound]);

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists['slow-flash']) assistsUsed.current.add('slow-flash');
    if (assists['direction-reminder']) assistsUsed.current.add('direction-reminder');
  }, [assists]);

  // direction reminder visibility: always on with the assist, otherwise it
  // shows briefly at "GO" then hides so you must remember the direction
  useEffect(() => {
    if (phase !== 'answering') return;
    if (assists['direction-reminder']) {
      setReminderOn(true);
      return;
    }
    setReminderOn(true);
    const t = window.setTimeout(() => setReminderOn(false), 1500);
    return () => clearTimeout(t);
  }, [phase, assists]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { spanReached: bestSpan }
    });
  }, [score, errors, hintsUsed, bestSpan, events]);

  const finish = useCallback(
    (outcome: 'won' | 'lost', finalScore: number, best: number) => {
      if (done.current) return;
      done.current = true;
      clearAll();
      events.onFinish({
        outcome,
        score: finalScore,
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { spanReached: best }
      });
    },
    [events]
  );

  // ── evaluation ──────────────────────────────────────────────────────────
  const commit = useCallback(
    (answer: string[]) => {
      if (done.current || evaluating.current) return;
      evaluating.current = true;
      const s = spanRef.current;
      if (isCorrect(seqRef.current, answer, cfg.mode)) {
        sfx.pop();
        setFeedback('good');
        const best = Math.max(bestRef.current, s);
        bestRef.current = best;
        setBestSpan(best);
        const roundGain = s * s * cfg.mult;
        if (s >= cfg.targetSpan) {
          const finalScore = scoreRef.current + roundGain + 120 * cfg.mult;
          setScore(finalScore);
          setBanner('Perfect run!');
          schedule(() => finish('won', finalScore, best), 700);
        } else {
          setScore(scoreRef.current + roundGain + 30 * cfg.mult);
          setBanner('Span up!');
          schedule(() => nextRound(s + 1), 950);
        }
      } else {
        sfx.error();
        setFeedback('bad');
        setReveal(expectedAnswer(seqRef.current, cfg.mode));
        const finalScore = Math.max(0, scoreRef.current - 12 * cfg.mult);
        setScore(finalScore);
        setErrors(errorsRef.current + 1);
        const nl = livesRef.current - 1;
        livesRef.current = nl;
        setLives(nl);
        if (nl <= 0) {
          schedule(() => finish('lost', finalScore, bestRef.current), 1600);
        } else {
          schedule(() => nextRound(s), 1700);
        }
      }
    },
    [cfg, finish, nextRound]
  );

  const busy = phase !== 'answering' || feedback !== null || reveal !== null;

  const typeSym = (sym: string) => {
    if (paused || done.current || busy) return;
    if (entered.length >= span) return;
    const next = [...entered, sym];
    setEntered(next);
    sfx.tap();
    if (next.length === span) schedule(() => commit(next), 280);
  };

  const backspace = () => {
    if (paused || done.current || busy || entered.length === 0) return;
    setEntered(entered.slice(0, -1));
    sfx.tap();
  };

  const submit = () => {
    if (paused || done.current || busy || entered.length === 0) return;
    commit(entered);
  };

  const replay = () => {
    if (paused || done.current || phase !== 'answering' || feedback || reveal) return;
    if (!assists.replay || replaysUsed.current >= MAX_REPLAYS) return;
    replaysUsed.current += 1;
    assistsUsed.current.add('replay');
    setHintsUsed((h) => h + 1);
    setScore((sc) => Math.max(0, sc - 20));
    sfx.hint();
    presentRound(seqRef.current);
  };

  // hardware keyboard support (desktop convenience)
  useEffect(() => {
    const pool = charPool(cfg.charset);
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key.length === 1) {
        const k = e.key.toUpperCase();
        if (pool.includes(k)) typeSym(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    registerSnapshot(
      (): Save => ({
        span,
        sequence,
        entered,
        lives,
        score,
        errors,
        hintsUsed,
        bestSpan,
        phase: phase === 'answering' && !feedback && !reveal ? 'answering' : 'presenting',
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  const pool = charPool(cfg.charset);
  const padClass =
    cfg.charset === 'mixed' ? 'bsp-pad-mixed' : cfg.charset === 'letters' ? 'bsp-pad-letters' : 'bsp-pad-digits';
  const replayLeft = MAX_REPLAYS - replaysUsed.current;

  return (
    <div className={`bsp ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Span: <b>{span}</b> / {cfg.targetSpan}
        </span>
        <span className="info-item bsp-lives-item" aria-label={`${lives} lives left`}>
          {Array.from({ length: cfg.lives }, (_, i) => (
            <span key={i} className={`bsp-life ${i >= lives ? 'lost' : ''}`} />
          ))}
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
      </div>

      <p className="bsp-status">
        {phase === 'presenting'
          ? 'Watch the sequence…'
          : feedback === 'good'
            ? banner ?? 'Correct!'
            : feedback === 'bad'
              ? 'Not quite — here it is'
              : cfg.mode === 'reverse'
                ? 'Your turn — enter it backwards'
                : 'Your turn — enter it in order'}
      </p>

      <div className="bsp-stage fx-card">
        {phase === 'presenting' ? (
          <>
            <div className="bsp-display">
              {flashIdx !== null ? (
                <div key={flashIdx} className="bsp-symbol">
                  {sequence[flashIdx]}
                </div>
              ) : (
                <div className="bsp-gap" />
              )}
            </div>
            <div className="bsp-dots">
              {sequence.map((_, i) => (
                <span key={i} className={`bsp-dot ${i < presentedCount ? 'on' : ''}`} />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="bsp-go-row">
              <span className="bsp-go">GO</span>
              {reminderOn && (
                <span className="bsp-reminder">
                  <DirArrow reverse={cfg.mode === 'reverse'} />
                  {cfg.mode === 'reverse' ? 'reverse' : 'in order'}
                </span>
              )}
            </div>
            <div className={`bsp-slots ${feedback === 'bad' ? 'shake' : ''}`}>
              {Array.from({ length: span }, (_, i) => {
                const shown = reveal ? reveal[i] : entered[i];
                const state = reveal
                  ? 'bad'
                  : feedback === 'good'
                    ? 'good'
                    : i === entered.length
                      ? 'cur'
                      : '';
                return (
                  <span key={i} className={`bsp-slot ${shown ? 'filled' : ''} ${state}`}>
                    {shown ?? ''}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="game-tools fx-card">
        {assists.replay && (
          <div className="bsp-toolrow">
            <PadTool
              silent
              onClick={replay}
              disabled={phase !== 'answering' || !!feedback || !!reveal || replayLeft <= 0}
            >
              <RestartIcon />
              <span>Replay{replayLeft < MAX_REPLAYS ? ` ${replayLeft}` : ''}</span>
            </PadTool>
          </div>
        )}
        <div className={`bsp-pad ${padClass}`}>
          {pool.map((sym) => (
            <button
              key={sym}
              className="bsp-key"
              onClick={() => typeSym(sym)}
              disabled={busy || entered.length >= span}
              aria-label={`Enter ${sym}`}
            >
              {sym}
            </button>
          ))}
        </div>
        <div className="bsp-actions">
          <button
            className="bsp-key bsp-back"
            onClick={backspace}
            disabled={busy || entered.length === 0}
            aria-label="Backspace"
          >
            <BackspaceGlyph />
          </button>
          <button
            className="bsp-key bsp-enter"
            onClick={submit}
            disabled={busy || entered.length === 0}
            aria-label="Enter"
          >
            <CheckIcon size={20} />
            <span>Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
