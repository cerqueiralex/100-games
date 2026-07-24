import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { GameProps } from '../../platform/types';
import { playNote, sfx } from '../../platform/audio';
import { EyeIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { makeRound, type Round } from './logic/round';
import { TIERS, roundConfigFor } from './logic/config';

/* ---- timing constants (ms) ---- */
const CD_MS = 480; // countdown step
const CLEAR_MS = 850; // round-clear celebration
const PENALTY_MS = 1050; // wrong tap re-reveal
const PEEK_MS = 500; // peek re-reveal
const RESUME_FLASH_MS = 1200; // re-flash after pause / resume
const HIDE_MS = 280; // squish-to-blank flip
const SLOW_FLASH_MULT = 1.4; // slow-flash assist bonus

/* ---- scoring ---- */
const MISTAKE_PENALTY = 20;
const PEEK_PENALTY = 30;
const MAX_PEEKS = 3;
const tapPoints = (round: number, mult: number) => round * mult * 5;
const roundBonus = (round: number, mult: number) => round * mult * 15;
const winBonus = (livesLeft: number, mult: number) => (150 + livesLeft * 50) * mult;

type Phase = 'countdown' | 'flash' | 'recall' | 'clear';

interface NTSave {
  round: number;
  gridDim: number;
  items: Round['items'];
  order: number[];
  progress: number;
  lives: number;
  score: number;
  errors: number;
  hintsUsed: number;
  peeksUsed: number;
  assistsUsed: string[];
}

/** state value that is also mirrored into a ref for stale-free reads inside timers */
function useMirror<T>(init: T): [T, MutableRefObject<T>, (v: T) => void] {
  const [s, setS] = useState<T>(init);
  const ref = useRef<T>(s);
  const set = useCallback((v: T) => {
    ref.current = v;
    setS(v);
  }, []);
  return [s, ref, set];
}

export function NumberTrailGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = TIERS[difficulty];
  const saved =
    savedState && Array.isArray((savedState as NTSave).order) && Array.isArray((savedState as NTSave).items)
      ? (savedState as NTSave)
      : undefined;

  // the current round's numbers + target order (mirrored for timer reads)
  const initialRound = useMemo<Round>(() => {
    if (saved) {
      return {
        gridDim: saved.gridDim,
        cells: saved.gridDim * saved.gridDim,
        items: saved.items,
        order: saved.order
      };
    }
    return makeRound(roundConfigFor(cfg, 1), Math.random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [data, dataRef, setData] = useMirror<Round>(initialRound);
  const [round, roundRef, setRound] = useMirror<number>(saved?.round ?? 1);
  const [tapped, tappedRef, setTapped] = useMirror<number[]>(
    saved ? saved.order.slice(0, saved.progress) : []
  );
  const [phase, phaseRef, setPhase] = useMirror<Phase>(saved ? 'flash' : 'countdown');
  const [lives, livesRef, setLives] = useMirror<number>(saved?.lives ?? cfg.lives);
  const [score, scoreRef, setScore] = useMirror<number>(saved?.score ?? 0);
  const [errors, errorsRef, setErrors] = useMirror<number>(saved?.errors ?? 0);
  const [hintsUsed, hintsRef, setHints] = useMirror<number>(saved?.hintsUsed ?? 0);

  const [reveal, setReveal] = useState(!!saved); // numbers currently visible
  const [locked, setLocked] = useState(true); // taps disabled (flash / countdown / penalty)
  const [hiding, setHiding] = useState(false); // squish-to-blank flip in progress
  const [countN, setCountN] = useState(saved ? 0 : 3);
  const [wrongPos, setWrongPos] = useState<number | null>(null);
  const [hintPos, setHintPos] = useState<number | null>(null);
  const [peeksUsed, setPeeksUsed] = useState(saved?.peeksUsed ?? 0);

  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const wasPaused = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.slowFlash ? ['slowFlash'] : []),
      ...(assists.outline ? ['outline'] : [])
    ])
  );

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  /* ---------- round flow ---------- */

  const beginFlash = useCallback(() => {
    setPhase('flash');
    setLocked(true);
    setReveal(true);
    setHiding(false);
    setCountN(0);
    const fm = cfg.flashMs * (assists.slowFlash ? SLOW_FLASH_MULT : 1);
    schedule(() => {
      setReveal(false);
      setHiding(true);
      schedule(() => setHiding(false), HIDE_MS);
      setLocked(false);
      setPhase('recall');
    }, fm);
  }, [cfg.flashMs, assists.slowFlash, schedule, setPhase]);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setLocked(true);
    setReveal(false);
    setCountN(3);
    schedule(() => setCountN(2), CD_MS);
    schedule(() => setCountN(1), CD_MS * 2);
    schedule(() => beginFlash(), CD_MS * 3);
  }, [schedule, beginFlash, setPhase]);

  // brief re-flash of the still-hidden numbers (after a pause/resume)
  const reflash = useCallback(() => {
    setPhase('flash');
    setLocked(true);
    setReveal(true);
    setHiding(false);
    setCountN(0);
    setWrongPos(null);
    setHintPos(null);
    schedule(() => {
      setReveal(false);
      setHiding(true);
      schedule(() => setHiding(false), HIDE_MS);
      setLocked(false);
      setPhase('recall');
    }, RESUME_FLASH_MS);
  }, [schedule, setPhase]);

  const finish = useCallback(
    (outcome: 'won' | 'lost') => {
      if (done.current) return;
      done.current = true;
      clearAll();
      let finalScore = scoreRef.current;
      if (outcome === 'won') {
        finalScore = scoreRef.current + winBonus(livesRef.current, cfg.mult);
        setScore(finalScore);
      }
      events.onFinish({
        outcome,
        score: finalScore,
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { roundReached: roundRef.current }
      });
    },
    [events, cfg.mult, clearAll, scoreRef, livesRef, errorsRef, hintsRef, roundRef, setScore]
  );

  const startRound = useCallback(
    (r: number) => {
      setRound(r);
      setData(makeRound(roundConfigFor(cfg, r), Math.random));
      setTapped([]);
      setWrongPos(null);
      setHintPos(null);
      startCountdown();
    },
    [cfg, setRound, setData, setTapped, startCountdown]
  );

  const advanceAfterClear = useCallback(() => {
    if (roundRef.current >= cfg.targetRounds) finish('won');
    else startRound(roundRef.current + 1);
  }, [cfg.targetRounds, finish, startRound, roundRef]);

  /* ---------- interaction ---------- */

  const tap = (pos: number) => {
    if (paused || done.current || phase !== 'recall' || locked || reveal) return;
    if (tappedRef.current.includes(pos)) return;
    const expected = dataRef.current.order[tappedRef.current.length];
    if (pos === expected) {
      const next = [...tappedRef.current, pos];
      setTapped(next);
      const idx = next.length - 1;
      playNote(300 * Math.pow(2, idx / 12), 150, 'sine');
      setScore(scoreRef.current + tapPoints(roundRef.current, cfg.mult));
      if (next.length === dataRef.current.order.length) {
        // round cleared
        setScore(scoreRef.current + roundBonus(roundRef.current, cfg.mult));
        setPhase('clear');
        setLocked(true);
        playNote(784, 120, 'triangle');
        playNote(1047, 220, 'triangle');
        schedule(advanceAfterClear, CLEAR_MS);
      }
    } else {
      // wrong tap
      setErrors(errorsRef.current + 1);
      const nl = livesRef.current - 1;
      setLives(nl);
      setScore(Math.max(0, scoreRef.current - MISTAKE_PENALTY));
      sfx.error();
      setWrongPos(pos);
      if (nl <= 0) {
        setReveal(true); // show the missed numbers for review
        finish('lost');
        return;
      }
      // penalty: re-reveal remaining + flag the correct next tile
      setLocked(true);
      setReveal(true);
      setHintPos(dataRef.current.order[tappedRef.current.length]);
      schedule(() => {
        setReveal(false);
        setHiding(true);
        schedule(() => setHiding(false), HIDE_MS);
        setLocked(false);
        setWrongPos(null);
        setHintPos(null);
      }, PENALTY_MS);
    }
  };

  const peek = () => {
    if (paused || done.current || phase !== 'recall' || locked || reveal) return;
    if (!assists.peek || peeksUsed >= MAX_PEEKS) return;
    assistsUsed.current.add('peek');
    setPeeksUsed((p) => p + 1);
    setHints(hintsRef.current + 1);
    setScore(Math.max(0, scoreRef.current - PEEK_PENALTY));
    sfx.hint();
    setLocked(true);
    setReveal(true);
    schedule(() => {
      setReveal(false);
      setHiding(true);
      schedule(() => setHiding(false), HIDE_MS);
      setLocked(false);
    }, PEEK_MS);
  };

  /* ---------- lifecycle ---------- */

  // first mount: fresh countdown, or re-flash the resumed round
  useEffect(() => {
    if (saved) reflash();
    else startCountdown();
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause: freeze + hide; resume: replay the current round so nothing leaks
  useEffect(() => {
    if (paused) {
      wasPaused.current = true;
      clearAll();
    } else if (wasPaused.current) {
      wasPaused.current = false;
      if (done.current) return;
      const p = phaseRef.current;
      if (p === 'countdown') startCountdown();
      else if (p === 'clear') advanceAfterClear();
      else reflash();
    }
  }, [paused, clearAll, startCountdown, advanceAfterClear, reflash, phaseRef]);

  // passive assists toggled on mid-game still count as help
  useEffect(() => {
    if (assists.slowFlash) assistsUsed.current.add('slowFlash');
    if (assists.outline) assistsUsed.current.add('outline');
  }, [assists.slowFlash, assists.outline]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { roundReached: round }
    });
  }, [score, errors, hintsUsed, round, events, assists.outline, assists.slowFlash]);

  useEffect(() => {
    registerSnapshot(
      (): NTSave => ({
        round,
        gridDim: data.gridDim,
        items: data.items,
        order: data.order,
        progress: tapped.length,
        lives,
        score,
        errors,
        hintsUsed,
        peeksUsed,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  /* ---------- render ---------- */

  const valueAt = useMemo(() => {
    const m = new Map<number, number>();
    data.items.forEach((it) => m.set(it.pos, it.value));
    return m;
  }, [data]);
  const orderIndexAt = useMemo(() => {
    const m = new Map<number, number>();
    data.order.forEach((pos, i) => m.set(pos, i));
    return m;
  }, [data]);

  // keep the stagger inside the flash window even when many numbers show
  const staggerStep = Math.min(35, 220 / Math.max(1, data.items.length));

  const statusText =
    phase === 'countdown'
      ? 'Get ready…'
      : phase === 'flash'
        ? 'Memorize the numbers'
        : phase === 'clear'
          ? round >= cfg.targetRounds
            ? 'Cleared!'
            : 'Nice — round clear!'
          : 'Tap 1 → up in order';

  return (
    <div className={`number-trail ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Round: <b>{round} / {cfg.targetRounds}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className={`info-item ${lives <= 1 ? 'bad' : ''}`}>
          <span className="ntr-lives" aria-label={`${lives} lives left`}>
            {Array.from({ length: cfg.lives }, (_, i) => (
              <span key={i} className={`ntr-pip ${i < lives ? '' : 'lost'}`} />
            ))}
          </span>
        </span>
      </div>

      <p className="ntr-status">{statusText}</p>

      <div className="ntr-stage">
        <div
          className={`ntr-board ${phase === 'flash' ? 'flashing' : ''}`}
          style={{ gridTemplateColumns: `repeat(${data.gridDim}, 1fr)` }}
          role="grid"
        >
          {Array.from({ length: data.cells }, (_, pos) => {
            const value = valueAt.get(pos);
            const has = value !== undefined;
            const isTapped = tapped.includes(pos);
            const showNum = isTapped || (reveal && has);
            const oi = orderIndexAt.get(pos) ?? 0;
            const cls = [
              'ntr-tile',
              has ? 'has' : 'empty',
              isTapped ? 'locked' : '',
              reveal && has && !isTapped ? 'show' : '',
              hiding && has && !isTapped ? 'hiding' : '',
              wrongPos === pos ? 'wrong' : '',
              hintPos === pos ? 'hint' : '',
              !showNum && has && !isTapped && phase === 'recall' && assists.outline ? 'had' : ''
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={pos}
                className={cls}
                onClick={() => has && tap(pos)}
                disabled={!has}
                aria-label={showNum && has ? `Tile ${value}` : has ? 'Hidden tile' : 'Empty'}
                tabIndex={has ? 0 : -1}
              >
                {showNum && has && (
                  <span
                    className="ntr-val"
                    style={phase === 'flash' ? { animationDelay: `${oi * staggerStep}ms` } : undefined}
                  >
                    {value}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {(phase === 'countdown' || phase === 'clear') && (
          <div className="ntr-overlay" aria-hidden>
            {phase === 'countdown' ? (
              <>
                <span className="ntr-ov-label">Round {round}</span>
                <span className="ntr-count" key={countN}>
                  {countN}
                </span>
              </>
            ) : (
              <span className="ntr-ov-big">
                {round >= cfg.targetRounds ? 'Cleared!' : 'Round clear'}
              </span>
            )}
          </div>
        )}
      </div>

      {assists.peek && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool
              silent
              onClick={peek}
              disabled={phase !== 'recall' || locked || reveal || peeksUsed >= MAX_PEEKS}
            >
              <EyeIcon />
              <span>Peek {MAX_PEEKS - peeksUsed}</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
