import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../platform/audio';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { now, revealOnFrame } from '../../platform/brain/timing';
import { Countdown, PhaseCard, ResponseButton, useFeedback } from '../../platform/components/fx';
import { CheckIcon, ClockIcon, CloseIcon, MirrorIcon, SameShapeIcon } from '../../platform/design/icons';
import { easeOut, prefersReducedMotion } from '../../platform/motion';
import { FigureArt, turnFrame, type FigureFrame } from './Figure';
import {
  ACK_MS,
  ANTICIPATION_MS,
  FIXATION_MS,
  MAX_INTERRUPTIONS,
  MAX_PAUSED_MS,
  PRACTICE_MAX_ROUNDS,
  PRACTICE_PASS,
  PRACTICE_TRIALS,
  SCORED_TRIALS,
  TIMEOUT_MS,
  WARMUP_TRIALS,
  buildSession,
  practiceItems,
  spareItem,
  type Item
} from './logic/protocol';
import { STATUS, scoreRun, type Status, type TrialRow } from './logic/scoring';

/**
 * Mirror Twins — 3D mental rotation, same vs mirror (SCIENCE.md §1.13).
 *
 * Session shell (C1): [first run: practice — 8 pairs with feedback, repeated
 * until 6 of 8 are right (3 rounds at most)] → warm-up (4 pairs, one per
 * angle, not scored) → 3-2-1 → 40 scored pairs → onFinish.
 *
 * Trial timeline: 300 ms blank board with a fixation dot → both figures
 * appear together in ONE animation frame (opacity flip inside the rAF
 * callback; onset = its timestamp, C2) → a pointerdown / F / J response
 * (event timestamp) or the 7000 ms timeout → 150 ms neutral acknowledgement
 * (the pressed pad's ripple and a tap — never right/wrong in the scored
 * block, C3) → next trial. Under 250 ms is an anticipation: excluded and
 * re-queued once.
 *
 * Interruption class B (C5): a pause voids the pair on screen and replaces
 * it with a fresh figure of the same condition; the scored block resumes
 * after a 3-2-1. More than 3 pauses or 60 s paused in the scored block makes
 * the run invalid, and it ends at the resume that crosses the limit.
 */

type Block = 'practice' | 'warmup' | 'scored';
type Stage = 'practice-intro' | 'practice-result' | 'warmup-intro' | 'block-intro' | 'countdown' | 'trials';

interface Entry {
  item: Item;
  /** planned trial index (scored block) or position in the round */
  trial: number;
  /** anticipations already spent on this trial (re-queued once) */
  attempt: number;
}

/** the coach line under the board (warm-up and practice only) — right, wrong and too slow/too quick each have their own glyph */
interface Note {
  kind: 'good' | 'bad' | 'slow';
  text: string;
}

/**
 * Dev-only test hooks (the harness's puppeteer drives read them). Guarded so
 * the module also loads under plain Node, where validate imports the
 * registry and `import.meta.env` does not exist.
 */
const DEV = !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
const round1 = (x: number) => Math.round(x * 10) / 10;
/** warm-up: how long the coach line stays after a right answer, and after a miss (wrong, too slow, too quick) */
const WARMUP_RIGHT_MS = 650;
const WARMUP_MISS_MS = 1300;

/** the practice coach line: what the pair was, and what the turn-back is about to show */
function explain(it: Item, correct: boolean, timedOut: boolean): string {
  const turned = it.angle === 0 ? 'not turned at all' : `turned ${it.angle}°`;
  if (timedOut)
    return it.answer === 0
      ? `Time’s up — it was the same shape, ${turned}. Watch it line up.`
      : 'Time’s up — it was a mirror image: no turn lines it up.';
  if (correct)
    return it.answer === 0
      ? it.angle === 0
        ? 'Right — the very same shape.'
        : `Right — the same shape, ${turned}.`
      : 'Right — a mirror image: no turn lines it up.';
  return it.answer === 0
    ? `Not quite — it is the same shape, ${turned}. Watch it line up.`
    : 'Not quite — it is a mirror image. Turned back, it comes out reversed.';
}

/** the warm-up coach line: shorter, no turn-back */
function warmupLine(it: Item, correct: boolean, timedOut: boolean): string {
  if (timedOut) return `Time’s up — answer within ${TIMEOUT_MS / 1000} seconds.`;
  if (correct) return it.answer === 0 ? 'Right — the same shape.' : 'Right — a mirror image.';
  if (it.answer === 1) return 'Not quite — it was a mirror image.';
  return it.angle === 0 ? 'Not quite — it was the very same shape.' : `Not quite — the same shape, turned ${it.angle}°.`;
}

export function MirrorTwinsTest(props: BrainTestProps) {
  const { mode, firstRun, seed, paused } = props;
  const live = useRef(props);
  live.current = props;

  /** the session's 44 figures, built before trial 1 (~10 ms; validate times it) */
  const session = useMemo(() => buildSession(seed, now), [seed]);

  const [stage, setStageState] = useState<Stage>(mode === 'practice' || firstRun ? 'practice-intro' : 'warmup-intro');
  const [block, setBlock] = useState<Block>('practice');
  const [item, setItem] = useState<Item | null>(null);
  const [turn, setTurn] = useState<FigureFrame | null>(null);
  /** practice: how the turned-back pair settled — lined up, or reversed across a mirror */
  const [settled, setSettled] = useState<null | 'same' | 'mirror'>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [count, setCount] = useState({ i: 0, n: 0 });
  const [resumeCd, setResumeCd] = useState(0);
  const [preCd, setPreCd] = useState(0);
  const [practice, setPractice] = useState({ correct: 0, of: PRACTICE_TRIALS, round: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sameRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const fb = useFeedback();

  /** the live controller — mutated by timers, never rendered directly */
  const c = useRef({
    stage: stage as Stage,
    block: 'practice' as Block,
    queue: [] as Entry[],
    pos: 0,
    /** idle · fix (blank + dot) · live (figures up, input open) · after (answer handled) */
    t: 'idle' as 'idle' | 'fix' | 'live' | 'after',
    onset: 0,
    boardPhase: 'off' as 'off' | 'fix' | 'live',
    timers: [] as number[],
    cancelReveal: null as null | (() => void),
    raf: 0,
    rows: [] as TrialRow[],
    seq: 0,
    resolved: 0,
    spares: 0,
    interruptions: 0,
    pausedAt: 0,
    pausedMs: 0,
    resumeNext: false,
    cdToken: 0,
    practiceRound: 0,
    practiceCorrect: 0,
    /** right answers in a row (warm-up / practice) — lifts the correct chime a step */
    streak: 0,
    /** practice / warm-up pairs judged so far (voided pairs and anticipation repeats do not count) */
    judged: 0,
    /** the pre-block countdown's generation: a pause re-arms it from the top */
    preCd: 0,
    finished: false
  }).current;

  const setStage = (s: Stage) => {
    c.stage = s;
    setStageState(s);
  };

  /* ---------- board phase: written straight to the DOM (onsets must not wait for React) ---------- */

  const applyBoard = () => {
    const el = boardRef.current;
    if (el && el.dataset.phase !== c.boardPhase) el.dataset.phase = c.boardPhase;
    const root = rootRef.current;
    if (root && DEV) {
      // test hooks for the dev harness (puppeteer); never in a production build
      const e = c.queue[c.pos];
      if (c.boardPhase === 'live' && c.t === 'live' && e) {
        root.dataset.mtAnswer = e.item.answer === 0 ? 'same' : 'mirror';
        root.dataset.mtSlot = String(e.item.slot);
      } else {
        delete root.dataset.mtAnswer;
        delete root.dataset.mtSlot;
      }
    }
  };
  const setBoard = (phase: 'off' | 'fix' | 'live') => {
    c.boardPhase = phase;
    applyBoard();
  };
  useLayoutEffect(applyBoard);

  /* ---------- timers ---------- */

  const clearAll = () => {
    c.timers.forEach((id) => window.clearTimeout(id));
    c.timers = [];
    c.cancelReveal?.();
    c.cancelReveal = null;
    if (c.raf) cancelAnimationFrame(c.raf);
    c.raf = 0;
  };
  const later = (ms: number, fn: () => void) => {
    c.timers.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => clearAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- the trial loop ---------- */

  const startBlock = (b: Block, entries: Entry[]) => {
    clearAll();
    c.block = b;
    c.queue = entries;
    c.pos = 0;
    c.judged = 0;
    c.streak = 0;
    c.resumeNext = false;
    setBlock(b);
    setCount({ i: 0, n: b === 'scored' ? SCORED_TRIALS : entries.length });
    setStage('trials');
    runEntry();
  };

  const runEntry = () => {
    clearAll();
    const e = c.queue[c.pos];
    setItem(e.item);
    setTurn(null);
    setSettled(null);
    setNote(null);
    c.t = 'fix';
    setBoard('fix');
    later(FIXATION_MS, reveal);
  };

  const reveal = () => {
    c.cancelReveal = revealOnFrame(
      () => {
        c.t = 'live';
        setBoard('live');
      },
      (onset) => {
        c.cancelReveal = null;
        c.onset = onset;
        later(TIMEOUT_MS, () => resolve(-1, TIMEOUT_MS, null));
      }
    );
  };

  const at = (el: HTMLElement | null) => {
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const r = el.getBoundingClientRect();
    const o = root.getBoundingClientRect();
    return { x: ((r.left + r.width / 2 - o.left) / o.width) * 100, y: ((r.top + r.height / 2 - o.top) / o.height) * 100 };
  };

  const spare = (it: Item) => spareItem(seed, c.spares++, it);

  const respond = (resp: 0 | 1, t: number) => {
    if (c.t !== 'live' || c.finished) return;
    const rt = t - c.onset;
    if (rt > TIMEOUT_MS) resolve(-1, TIMEOUT_MS, null);
    else resolve(resp, rt, resp === 0 ? sameRef.current : mirrorRef.current);
  };

  const resolve = (resp: -1 | 0 | 1, rt: number, pad: HTMLElement | null) => {
    if (c.t !== 'live' || c.finished) return;
    clearAll();
    c.t = 'after';
    const e = c.queue[c.pos];
    const it = e.item;
    const timedOut = resp === -1;
    const correct = !timedOut && resp === it.answer;
    const early = !timedOut && rt < ANTICIPATION_MS;

    if (c.block === 'scored') {
      const status: Status = timedOut
        ? STATUS.timeout
        : early
          ? e.attempt === 0
            ? STATUS.anticipation
            : STATUS.anticipationLost
          : STATUS.answered;
      c.rows.push({
        seq: c.seq++,
        trial: e.trial,
        angle: it.angle,
        answer: it.answer,
        sign: it.sign,
        response: resp,
        correct: correct && !early ? 1 : 0,
        rt: round1(rt),
        status,
        phi: round1(it.phi),
        slot: it.slot
      });
      if (status === STATUS.anticipation) c.queue.push({ item: spare(it), trial: e.trial, attempt: 1 });
      else {
        c.resolved++;
        live.current.onProgress(c.resolved / SCORED_TRIALS);
        setCount({ i: c.resolved, n: SCORED_TRIALS });
      }
      setBoard('off');
      if (!timedOut) fb.neutral(at(pad), { sound: true }); // the acknowledgement — identical for every answer
      later(ACK_MS, next);
      return;
    }

    // warm-up and first-run practice: corrective feedback (C1). Right, wrong, too slow and too
    // quick are four distinct states — words, glyph and sound each (GAME-QUALITY Q10)
    const spot = at(boardRef.current);
    if (early) {
      sfx.early();
      setBoard('off');
      setNote({ kind: 'slow', text: 'Too quick — look at both shapes before you answer.' });
      // the pair comes back with a fresh figure (the warm-up re-queues once, so it stays one pair per angle)
      if (c.block === 'practice' || e.attempt === 0) c.queue.splice(c.pos + 1, 0, { item: spare(it), trial: e.trial, attempt: e.attempt + 1 });
      later(1200, next);
      return;
    }
    c.judged++;
    if (correct) {
      c.streak++;
      fb.good(spot, { step: Math.min(c.streak - 1, 6) });
    } else {
      c.streak = 0;
      if (timedOut) {
        sfx.tick();
        fb.neutral(spot);
      } else fb.bad(spot);
    }
    const kind: Note['kind'] = correct ? 'good' : timedOut ? 'slow' : 'bad';

    if (c.block === 'warmup') {
      setBoard('off');
      setNote({ kind, text: warmupLine(it, correct, timedOut) });
      later(correct ? WARMUP_RIGHT_MS : WARMUP_MISS_MS, next);
      return;
    }

    // practice: the comparison then turns back to show why
    if (correct) c.practiceCorrect++;
    setNote({ kind, text: explain(it, correct, timedOut) });
    playTurnBack(it, correct ? 1000 : 1700, () => {
      setBoard('off');
      later(160, next);
    });
  };

  /**
   * The comparison turns back by −s·θ: a same pair lines up, a mirror pair
   * lands reversed. The settled pair then holds for `hold` ms. Under reduced
   * motion nothing travels — the settled frame appears at once and holds for
   * as long as the turn would have taken too, so the flow keeps its timing.
   */
  const playTurnBack = (it: Item, hold: number, done: () => void) => {
    const from = it.cmpYaw;
    const to = it.cmpYaw - it.sign * it.angle;
    const settle = (extra: number) => {
      setTurn(turnFrame(it.cmpCubes, from, to, 1));
      setSettled(it.answer === 0 ? 'same' : 'mirror');
      later(hold + extra, done);
    };
    if (it.angle === 0) {
      later(260, () => settle(0));
      return;
    }
    const dur = 360 + it.angle * 4.6;
    if (prefersReducedMotion()) {
      later(280, () => settle(dur));
      return;
    }
    later(280, () => {
      let start = -1;
      const step = (ts: number) => {
        if (start < 0) start = ts;
        const p = Math.min(1, (ts - start) / dur);
        if (p < 1) {
          setTurn(turnFrame(it.cmpCubes, from, to, easeInOut(p)));
          c.raf = requestAnimationFrame(step);
        } else {
          c.raf = 0;
          settle(0);
        }
      };
      c.raf = requestAnimationFrame(step);
    });
  };

  const next = () => {
    c.pos++;
    if (c.pos >= c.queue.length) {
      endBlock();
      return;
    }
    if (c.block === 'practice') setCount({ i: c.judged, n: PRACTICE_TRIALS });
    else if (c.block === 'warmup') setCount({ i: c.judged, n: WARMUP_TRIALS });
    runEntry();
  };

  const endBlock = () => {
    clearAll();
    c.t = 'idle';
    setBoard('off');
    setItem(null);
    if (c.block === 'practice') {
      setPractice({ correct: c.practiceCorrect, of: PRACTICE_TRIALS, round: c.practiceRound });
      setStage('practice-result');
    } else if (c.block === 'warmup') setStage('block-intro');
    else finishScored();
  };

  const finish = (o: BrainRunOutcome) => {
    if (c.finished) return;
    c.finished = true;
    clearAll();
    c.t = 'idle';
    setBoard('off');
    live.current.onFinish(o);
  };

  const finishScored = () => {
    if (c.finished) return;
    live.current.onProgress(1);
    finish(scoreRun({ rows: c.rows, interruptions: c.interruptions, pausedMs: c.pausedMs }));
  };

  /* ---------- phases ---------- */

  const startPractice = (round: number) => {
    c.practiceRound = round;
    c.practiceCorrect = 0;
    startBlock(
      'practice',
      practiceItems(seed, round).map((item, i) => ({ item, trial: i, attempt: 0 }))
    );
  };

  const startWarmup = () => startBlock('warmup', session.warmup.map((item, i) => ({ item, trial: i, attempt: 0 })));

  const startScored = () => {
    c.rows = [];
    c.seq = 0;
    c.resolved = 0;
    live.current.onProgress(0);
    startBlock('scored', session.block.map((item, i) => ({ item, trial: i, attempt: 0 })));
  };

  const practicePassed = practice.correct >= PRACTICE_PASS;
  const practiceExhausted = practice.round + 1 >= PRACTICE_MAX_ROUNDS;

  const afterPractice = () => {
    if (!practicePassed && !practiceExhausted) {
      startPractice(practice.round + 1);
      return;
    }
    if (mode === 'practice') finish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
    else setStage('warmup-intro');
  };

  /* ---------- interruptions (class B) ---------- */

  const scoredContext = () => c.stage === 'trials' && c.block === 'scored';

  const onPause = () => {
    if (c.finished || c.stage !== 'trials') return; // cards and the pre-block countdown simply hold
    if (c.block === 'scored') {
      c.interruptions++;
      c.pausedAt = now();
    }
    const wasLive = c.t === 'live';
    const wasAfter = c.t === 'after';
    clearAll();
    setResumeCd(0);
    setTurn(null);
    setSettled(null);
    setBoard('off');
    if (wasLive) {
      // void the pair on screen and replace it with a fresh figure of the same condition
      const e = c.queue[c.pos];
      const it = e.item;
      if (c.block === 'scored')
        c.rows.push({
          seq: c.seq++,
          trial: e.trial,
          angle: it.angle,
          answer: it.answer,
          sign: it.sign,
          response: -1,
          correct: 0,
          rt: round1(Math.max(0, now() - c.onset)),
          status: STATUS.voided,
          phi: round1(it.phi),
          slot: it.slot
        });
      c.queue.splice(c.pos + 1, 0, { item: spare(it), trial: e.trial, attempt: e.attempt });
    }
    if (wasLive || wasAfter) c.resumeNext = true;
    c.t = 'idle';
  };

  const continueTrials = () => {
    if (c.finished) return;
    const skip = c.resumeNext;
    c.resumeNext = false;
    if (skip) next();
    else runEntry();
  };

  const onResume = () => {
    if (c.finished) return;
    if (c.pausedAt) {
      c.pausedMs += now() - c.pausedAt;
      c.pausedAt = 0;
    }
    if (c.stage === 'countdown') {
      // a half-seen countdown is not a countdown: start it again from the top
      c.preCd++;
      setPreCd(c.preCd);
      return;
    }
    if (c.stage !== 'trials') return;
    if (scoredContext()) {
      if (c.interruptions > MAX_INTERRUPTIONS || c.pausedMs > MAX_PAUSED_MS) {
        finishScored(); // beyond the limits: the run ends, recorded as invalid
        return;
      }
      c.cdToken++;
      setResumeCd(c.cdToken);
      return;
    }
    continueTrials();
  };

  /** the pre-block countdown said "go" — ignored if it is stale or the runner paused in its last beat */
  const preCountdownDone = (gen: number) => {
    if (gen !== c.preCd || c.stage !== 'countdown' || c.finished || live.current.paused) return;
    startScored();
  };

  const resumeDone = (token: number) => {
    if (token !== c.cdToken || c.finished || live.current.paused) return;
    setResumeCd(0);
    continueTrials();
  };

  const wasPaused = useRef(false);
  useEffect(() => {
    if (paused === wasPaused.current) return;
    wasPaused.current = paused;
    if (paused) onPause();
    else onResume();
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving the page or turning the phone mid-trial interrupts the run (the runner shows its pause)
  useEffect(() => {
    const interrupt = () => {
      if (c.stage === 'trials' && !c.finished && !live.current.paused) live.current.requestPause(true);
    };
    const onVis = () => {
      if (document.hidden) interrupt();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('orientationchange', interrupt);
    const so = typeof screen !== 'undefined' ? screen.orientation : undefined;
    so?.addEventListener?.('change', interrupt);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('orientationchange', interrupt);
      so?.removeEventListener?.('change', interrupt);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- render ---------- */

  const inTrials = stage === 'trials';
  const chip =
    block === 'practice'
      ? `Practice · ${Math.min(count.i + 1, count.n)} of ${count.n}`
      : block === 'warmup'
        ? `Warm-up · not scored · ${Math.min(count.i + 1, count.n)} of ${count.n}`
        : `Pair ${Math.min(count.i + 1, count.n)} of ${count.n}`;

  return (
    <div
      ref={rootRef}
      className={`mt mt-${block}`}
      data-mt-stage={stage}
      data-mt-block={block}
      data-mt-ms={DEV ? session.ms.toFixed(1) : undefined}
    >
      <div className="mt-stage">
        {inTrials && (
          <>
            <div className="mt-head">
              <span className={`mt-chip ${block === 'scored' ? 'quiet' : ''}`} aria-live="polite">
                {chip}
              </span>
            </div>
            <div className="mt-center">
              <div ref={boardRef} className="mt-board" data-phase="off">
                <div className="mt-plate" role="img" aria-label="The shape">
                  {item && <FigureArt className="mt-fig" view={item.ref} />}
                </div>
                <div className="mt-plate" role="img" aria-label="Same shape turned, or its mirror image?">
                  {item && (turn ? <FigureArt className="mt-fig" {...turn} /> : <FigureArt className="mt-fig" view={item.cmp} />)}
                  {settled && (
                    <span className="mt-badge" aria-hidden>
                      {settled === 'same' ? <CheckIcon size={15} /> : <MirrorIcon size={15} />}
                    </span>
                  )}
                </div>
                <span className="mt-fix" aria-hidden />
                {settled === 'mirror' && <span className="mt-axis" aria-hidden />}
              </div>
              {block !== 'scored' && (
                <div className="mt-legend" aria-hidden>
                  <span>The shape</span>
                  <span>Turned — or mirrored?</span>
                </div>
              )}
              {block !== 'scored' && (
                <p className={`mt-note ${note ? `on ${note.kind}` : ''}`} role="status" aria-live="polite">
                  {note && (
                    <>
                      <span className="mt-note-glyph" aria-hidden>
                        {note.kind === 'good' ? <CheckIcon size={13} /> : note.kind === 'bad' ? <CloseIcon size={13} /> : <ClockIcon size={13} />}
                      </span>
                      {note.text}
                    </>
                  )}
                </p>
              )}
            </div>
            {resumeCd > 0 && (
              <Countdown key={resumeCd} label="Resuming" paused={paused} onDone={() => resumeDone(resumeCd)} />
            )}
          </>
        )}

        {stage === 'practice-intro' && (
          <PhaseCard
            kicker={`Practice · ${PRACTICE_TRIALS} pairs · with feedback`}
            title="Same shape, or mirror image?"
            body={
              <>
                <p>The right shape is the left one turned — or its mirror image, which no turn can line up.</p>
                <p>You will see if you were right, and the shape turns back to show why.</p>
              </>
            }
            action="Start practice"
            onAction={() => startPractice(0)}
          />
        )}

        {stage === 'practice-result' && (
          <PhaseCard
            kicker={`Practice · round ${practice.round + 1}`}
            title={`${practice.correct} of ${practice.of} right`}
            body={
              practicePassed ? (
                <p>{mode === 'practice' ? 'You have the idea. Nothing from practice is recorded.' : 'You have the idea. Next, a short warm-up — then the real thing.'}</p>
              ) : practiceExhausted ? (
                <p>Seeing mirror images takes practice. Answer as well as you can — the test only asks for your best.</p>
              ) : (
                <p>
                  Let’s practise once more with new shapes — {PRACTICE_PASS} of {PRACTICE_TRIALS} right moves you on. Picture the right shape turning until it faces like the left one.
                </p>
              )
            }
            action={!practicePassed && !practiceExhausted ? 'Practise again' : mode === 'practice' ? 'Done' : 'Continue'}
            onAction={afterPractice}
          >
            <PracticeDots correct={practice.correct} of={practice.of} />
          </PhaseCard>
        )}

        {stage === 'warmup-intro' && (
          <PhaseCard
            kicker="Warm-up · not scored"
            title={`${WARMUP_TRIALS} pairs to settle in`}
            body={<p>Same shape turned, or its mirror image? Answer as fast as you can without making mistakes.</p>}
            action="Start warm-up"
            onAction={startWarmup}
          />
        )}

        {stage === 'block-intro' && (
          <PhaseCard
            kicker="Scored block"
            title={`${SCORED_TRIALS} pairs`}
            body={<p>Just like the warm-up — fast, but accurate. There is no right-or-wrong signal until the end.</p>}
            action="Start"
            onAction={() => setStage('countdown')}
          />
        )}

        {stage === 'countdown' && (
          <Countdown key={preCd} label="Scored block" paused={paused} onDone={() => preCountdownDone(preCd)} />
        )}
      </div>

      <div className="game-tools fx-card mt-tools" role="group" aria-label="Your answer">
        <div ref={sameRef} className="mt-cell">
          <ResponseButton
            variant="big"
            className="mt-answer"
            keys={['f']}
            disabled={!inTrials}
            ariaLabel="Same shape (key F)"
            onPress={(t) => respond(0, t)}
          >
            <SameShapeIcon size={30} />
            <span className="mt-answer-label">Same</span>
            <kbd className="mt-key">F</kbd>
          </ResponseButton>
        </div>
        <div ref={mirrorRef} className="mt-cell">
          <ResponseButton
            variant="big"
            className="mt-answer"
            keys={['j']}
            disabled={!inTrials}
            ariaLabel="Mirror image (key J)"
            onPress={(t) => respond(1, t)}
          >
            <MirrorIcon size={30} />
            <span className="mt-answer-label">Mirror</span>
            <kbd className="mt-key">J</kbd>
          </ResponseButton>
        </div>
      </div>
      {fb.layer}
    </div>
  );
}

function easeInOut(t: number): number {
  return t < 0.5 ? 0.5 * (1 - easeOut(1 - 2 * t)) : 0.5 + 0.5 * easeOut(2 * t - 1);
}

/** one dot per practice pair, filled for each right answer (count first, colour second) */
function PracticeDots({ correct, of }: { correct: number; of: number }) {
  return (
    <div className="mt-dots" role="img" aria-label={`${correct} of ${of} right`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={`mt-dot ${i < correct ? 'on' : ''}`} />
      ))}
    </div>
  );
}
