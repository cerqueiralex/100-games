import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { Countdown, NumberPad, PhaseCard, useFeedback } from '../../platform/components/fx';
import { now, revealOnFrame } from '../../platform/brain/timing';
import { sfx } from '../../platform/audio';
import { DUR, haptic } from '../../platform/motion';
import { GLYPH_PATHS } from './logic/glyphs';
import { PROTOCOL, generateSession } from './logic/protocol';
import { PHASE, STATUS, frameRow, outcomeOf, trialRow } from './logic/scoring';
import { GlyphSvg } from './GlyphArt';
import { BUILD } from '../../platform/version';

/** the running build as [MAJOR, MINOR, PATCH] — stamped on the frame row of every run's log */
const APP_VERSION = BUILD.version.split('.').map((x) => Number.parseInt(x, 10));

/**
 * Symbol Coding — the Processing Speed benchmark (SCIENCE.md §1.11): see a
 * glyph, find it in the key, tap its digit. Flow of a 'test' run:
 *   [first run: 3 guided items] → practice, 10 items with green/red feedback
 *   (every session; ≥ 8/10 or one repeat) → 15-s digit-matching motor
 *   baseline (key hidden) → 3-2-1 → 90-s coding block → onFinish.
 * 'practice' mode: the guided items and the practice round, nothing scored.
 *
 * Timing (C2): every item change is a DOM write inside the requestAnimation-
 * Frame callback that reveals it (`revealOnFrame`), its onset the frame's
 * timestamp; responses come from the shared NumberPad on pointerdown (or a
 * hardware digit key), stamped with the event time. The next glyph replaces
 * the answered one on the very next frame — no inter-item interval. Item
 * content is never React state, so a re-render can never delay or undo it.
 *
 * Interruption class A: the runner ends a hidden / blurred / rotated run as
 * invalid, so this component never pauses. Feedback (C3): correctness only in
 * practice; the timed parts give a neutral acknowledgement (the key's press
 * animation and one identical soft tick for every registered response), and
 * each ends on the same neutral lock cue.
 */

type Phase =
  | 'tutorial-intro'
  | 'tutorial'
  | 'practice-intro'
  | 'practice'
  | 'motor-intro'
  | 'motor-countdown'
  | 'motor'
  | 'motor-done'
  | 'block-intro'
  | 'block-countdown'
  | 'block'
  | 'block-done'
  | 'practice-done';

/** the live item state — mutated per tap, never rendered from */
interface Run {
  /** 0 tutorial · 1 practice · 2 digit matching · 3 coding */
  code: 0 | 1 | 2 | 3;
  items: number[];
  /** glyph per digit (key[d − 1]) for the coding phases */
  key: number[];
  idx: number;
  /** practice: round × 10, so log rows number the items across rounds */
  itemBase: number;
  /** the current item's onset (rAF timestamp), NaN until its frame ran */
  onset: number;
  /** the phase's first onset, NaN before it */
  start: number;
  /** the previous registered response */
  lastReg: number;
  locked: boolean;
  durationMs: number;
  /** consecutive correct practice answers (lifts the chime) */
  streak: number;
  /** correct answers in the current practice round */
  roundCorrect: number;
}

const CARD_PHASES: Phase[] = ['tutorial-intro', 'practice-intro', 'motor-intro', 'block-intro', 'practice-done'];
const PRACTICE_KEY_PHASES: Phase[] = ['tutorial-intro', 'tutorial', 'practice-intro', 'practice', 'practice-done'];

export function SymbolCodingTest({ mode, firstRun, seed, onProgress: progressProp, onFinish: finishProp }: BrainTestProps) {
  const session = useMemo(() => generateSession(seed), [seed]);
  // the runner's callbacks, always the latest (timers and frame loops outlive renders)
  const callbacks = useRef({ progress: progressProp, finish: finishProp });
  callbacks.current = { progress: progressProp, finish: finishProp };
  const onProgress = (f: number) => callbacks.current.progress(f);
  const onFinish = (o: BrainRunOutcome) => callbacks.current.finish(o);
  const guided = mode === 'practice' || firstRun;
  const [phase, setPhaseState] = useState<Phase>(guided ? 'tutorial-intro' : 'practice-intro');
  const phaseRef = useRef<Phase>(phase);
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [round, setRound] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState<number[]>([]);
  const [answered, setAnswered] = useState(0);
  const [fb, setFb] = useState<'' | 'good' | 'bad'>('');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [missed, setMissed] = useState(false);
  /** the digit whose key cell is lit as a hint (tutorial) */
  const [hint, setHint] = useState(0);
  /** the digit whose key cell is lit as the correction after an error */
  const [answer, setAnswer] = useState(0);
  const [live, setLive] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const digitRef = useRef<HTMLSpanElement>(null);

  const run = useRef<Run>({
    code: 0,
    items: [],
    key: [],
    idx: 0,
    itemBase: 0,
    onset: NaN,
    start: NaN,
    lastReg: -Infinity,
    locked: true,
    durationMs: 0,
    streak: 0,
    roundCorrect: 0
  });
  const log = useRef<number[][]>([]);
  const frames = useRef<number[]>([]);
  const finished = useRef(false);
  const timers = useRef(new Set<number>());
  const rafs = useRef(new Set<number>());
  const cancelReveal = useRef<(() => void) | null>(null);
  const fx = useFeedback();

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  // everything stops with the component (the runner may unmount mid-block)
  useEffect(() => {
    onProgress(0);
    const ts = timers.current;
    const rs = rafs.current;
    return () => {
      run.current.locked = true;
      cancelReveal.current?.();
      ts.forEach((id) => clearTimeout(id));
      rs.forEach((id) => cancelAnimationFrame(id));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the key strip's visibility is a DOM attribute React never renders, so the
  // first coding frame can reveal key and glyph together (see beginItems)
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (PRACTICE_KEY_PHASES.includes(phase)) el.dataset.show = '1';
    else if (phase !== 'block' && phase !== 'block-done') el.dataset.show = '';
  }, [phase]);

  /* ---------- item presentation ---------- */

  const clearTarget = () => {
    pathRef.current?.setAttribute('d', '');
    if (digitRef.current) digitRef.current.textContent = '';
    const t = targetRef.current;
    if (t) {
      t.dataset.glyph = '';
      t.dataset.digit = '';
    }
  };

  /** show item `idx` of the current phase on the next frame; its onset is that frame's timestamp */
  const revealCurrent = (first: boolean) => {
    const c = run.current;
    const digit = c.items[c.idx];
    const idx = c.idx;
    c.onset = NaN;
    cancelReveal.current?.();
    cancelReveal.current = revealOnFrame(
      () => {
        const t = targetRef.current;
        if (c.code === 2) {
          if (digitRef.current) digitRef.current.textContent = String(digit);
          if (t) {
            t.dataset.digit = String(digit);
            t.dataset.glyph = '';
          }
        } else {
          const g = c.key[digit - 1];
          pathRef.current?.setAttribute('d', GLYPH_PATHS[g]);
          if (t) {
            t.dataset.glyph = String(g);
            t.dataset.digit = '';
          }
        }
        if (t) t.dataset.item = String(idx);
        // the scored key appears in the same frame as the first coding glyph
        if (first && c.code === 3 && stripRef.current) stripRef.current.dataset.show = '1';
      },
      (ts) => {
        cancelReveal.current = null;
        c.onset = ts;
        if (first) {
          c.start = ts;
          if (c.code >= 2) startClock(ts);
        }
      }
    );
  };

  const beginItems = (code: Run['code'], items: number[], key: number[], durationMs = 0, itemBase = 0) => {
    const c = run.current;
    c.code = code;
    c.items = items;
    c.key = key;
    c.idx = 0;
    c.itemBase = itemBase;
    c.onset = NaN;
    c.start = NaN;
    c.lastReg = -Infinity;
    c.durationMs = durationMs;
    c.roundCorrect = 0;
    c.locked = false;
    revealCurrent(true);
  };

  /** the timed phases' clock: locks input at exactly 15.0 / 90.0 s from the first onset */
  const startClock = (t0: number) => {
    const c = run.current;
    const code = c.code;
    let prev = t0;
    let lastReport = t0;
    const loop = (ts: number) => {
      if (c.locked || c.code !== code) return;
      if (code === 3) {
        frames.current.push(ts - prev);
        prev = ts;
        if (ts - lastReport >= 200) {
          lastReport = ts;
          onProgress(Math.min(1, (ts - t0) / PROTOCOL.blockMs));
        }
      }
      if (ts >= t0 + c.durationMs) {
        endTimed();
        return;
      }
      const id = requestAnimationFrame((t) => {
        rafs.current.delete(id);
        loop(t);
      });
      rafs.current.add(id);
    };
    loop(t0);
    // a throttled frame loop must not stretch the block: a timer backs it up
    later(() => {
      if (!c.locked && c.code === code) endTimed();
    }, Math.max(0, t0 + c.durationMs - now()) + 30);
  };

  const endTimed = () => {
    const c = run.current;
    if (c.locked) return;
    c.locked = true;
    cancelReveal.current?.();
    cancelReveal.current = null;
    clearTarget(); // the item on screen is discarded
    setLive(false);
    // the same neutral "input locked" cue ends both timed parts; the completion
    // chime belongs to the runner's results card
    sfx.place();
    if (c.code === 2) {
      setPhase('motor-done');
      later(() => setPhase('block-intro'), 750);
    } else {
      onProgress(1);
      setPhase('block-done');
      later(finishTest, 900);
    }
  };

  /* ---------- phase entry ---------- */

  useEffect(() => {
    // a target card that has just replaced a phase card is still arriving (its
    // entrance is decorative motion): the first item waits for it, so no
    // stimulus ever fades in (C3), and the pad wakes with the first symbol
    if (phase === 'tutorial') {
      const start = () => {
        setLive(true);
        beginItems(0, session.tutorial.slice(tutorialStep, tutorialStep + 1), session.practiceKey);
      };
      if (tutorialStep === 0) later(start, DUR.base);
      else start();
    } else if (phase === 'practice') {
      setAnswered(0);
      run.current.streak = 0;
      later(() => {
        setLive(true);
        beginItems(1, session.practice[round], session.practiceKey, 0, round * PROTOCOL.practiceItems);
      }, DUR.base);
    } else if (phase === 'motor') {
      setLive(true);
      beginItems(2, session.motor, [], PROTOCOL.motorMs);
    } else if (phase === 'block') {
      setLive(true);
      beginItems(3, session.block, session.testKey, PROTOCOL.blockMs);
    }
  }, [phase, tutorialStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // guided items 1–2 light the symbol's key cell; item 3 is unaided
  useEffect(() => {
    setHint(phase === 'tutorial' && tutorialStep < 2 ? session.tutorial[tutorialStep] : 0);
  }, [phase, tutorialStep, session]);

  /* ---------- responses ---------- */

  const burstAt = (kind: 'good' | 'bad', d: number, step = 0) => {
    const root = rootRef.current;
    const key = root?.querySelector(`.sc-pad .number-pad > :nth-child(${d})`);
    let at: { x: number; y: number } | undefined;
    if (root && key) {
      const rr = root.getBoundingClientRect();
      const kr = key.getBoundingClientRect();
      at = { x: ((kr.left + kr.width / 2 - rr.left) / rr.width) * 100, y: ((kr.top + kr.height / 2 - rr.top) / rr.height) * 100 };
    }
    if (kind === 'good') fx.good(at, { step });
    else fx.bad(at);
  };

  const onDigit = (d: number, t: number) => {
    const c = run.current;
    if (c.locked) return;
    const p = phaseRef.current;
    if (p === 'motor' || p === 'block') return onTimed(d, t);
    if (p !== 'tutorial' && p !== 'practice') return;
    if (!(t >= c.onset)) return; // before the item was on screen
    const digit = c.items[c.idx];
    const ok = d === digit;

    if (p === 'tutorial') {
      if (ok) {
        c.locked = true;
        burstAt('good', d, tutorialStep);
        setAnswer(0);
        setMissed(false);
        later(() => {
          if (tutorialStep + 1 < PROTOCOL.tutorialItems) setTutorialStep(tutorialStep + 1);
          else {
            setLive(false);
            clearTarget();
            setPhase('practice-intro');
          }
        }, 520);
      } else {
        burstAt('bad', d);
        setAnswer(digit);
        setMissed(true);
      }
      return;
    }

    // practice: green / red for 250 ms (a miss also lights the right key cell)
    c.locked = true;
    log.current.push(
      trialRow(PHASE.practice, c.itemBase + c.idx, c.key[digit - 1], digit, d, t - c.start, t - c.onset, c.idx % PROTOCOL.keySize, STATUS.registered)
    );
    if (ok) {
      c.roundCorrect++;
      burstAt('good', d, c.streak);
      c.streak = Math.min(8, c.streak + 1);
    } else {
      c.streak = 0;
      burstAt('bad', d);
      setAnswer(digit);
    }
    setFb(ok ? 'good' : 'bad');
    setAnswered(c.idx + 1);
    later(
      () => {
        setFb('');
        setAnswer(0);
        c.idx++;
        if (c.idx < c.items.length) {
          c.locked = false;
          revealCurrent(false);
          return;
        }
        endPracticeRound(c.roundCorrect);
      },
      ok ? PROTOCOL.practiceFeedbackMs : PROTOCOL.practiceCorrectiveMs
    );
  };

  const endPracticeRound = (correct: number) => {
    const scores = [...practiceCorrect, correct];
    setPracticeCorrect(scores);
    setLive(false);
    clearTarget();
    const passed = correct >= PROTOCOL.practicePass;
    if (!passed && round + 1 < PROTOCOL.practiceRounds) {
      setRound(round + 1);
      setPhase('practice-intro');
    } else setPhase(mode === 'practice' ? 'practice-done' : 'motor-intro');
  };

  const onTimed = (d: number, t: number) => {
    const c = run.current;
    const phaseCode = c.code === 2 ? PHASE.motor : PHASE.coding;
    const digit = c.items[c.idx];
    const glyph = c.code === 2 ? -1 : c.key[digit - 1];
    const setPos = c.idx % PROTOCOL.keySize;
    const tMs = Number.isFinite(c.start) ? Math.max(0, t - c.start) : 0;
    if (Number.isFinite(c.start) && t >= c.start + c.durationMs) return; // input locks at 15.0 / 90.0 s
    if (t - c.lastReg < PROTOCOL.doubleTapMs) {
      // a double tap: under 120 ms after the previous registered response — ignored, logged
      log.current.push(trialRow(phaseCode, c.idx, glyph, digit, d, tMs, t >= c.onset ? t - c.onset : 0, setPos, STATUS.doubleTap));
      return;
    }
    if (!(t >= c.onset)) {
      // the item was not on screen yet (its frame had not run, e.g. a stalled page): ignored, logged
      log.current.push(trialRow(phaseCode, c.idx, glyph, digit, d, tMs, 0, setPos, STATUS.beforeOnset));
      return;
    }
    log.current.push(trialRow(phaseCode, c.idx, glyph, digit, d, t - c.start, t - c.onset, setPos, STATUS.registered));
    c.lastReg = t;
    sfx.tick();
    haptic('tap');
    c.idx++;
    if (c.idx >= c.items.length) {
      endTimed(); // all pre-generated items used (the run is then invalid)
      return;
    }
    revealCurrent(false);
  };

  /* ---------- finishing ---------- */

  const finishTest = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish(outcomeOf([...log.current, frameRow(frames.current, APP_VERSION)]));
  };

  const finishPractice = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
  };

  /* ---------- render ---------- */

  const isCard = CARD_PHASES.includes(phase);
  const practiceKeyShown = PRACTICE_KEY_PHASES.includes(phase);
  const key = practiceKeyShown ? session.practiceKey : session.testKey;
  const digitMode = phase.startsWith('motor');
  const stripNote = phase.startsWith('motor') ? 'No key in this part' : phase === 'block-intro' || phase === 'block-countdown' ? 'Your key appears at Go' : '';
  const lastPractice = practiceCorrect[practiceCorrect.length - 1];

  return (
    <div
      ref={rootRef}
      className="sc"
      data-phase={phase}
      data-live={live ? '1' : '0'}
    >
      <div
        ref={stripRef}
        className="sc-strip fx-card"
        role="group"
        aria-label="Key: each symbol above its number"
        aria-hidden={stripNote ? true : undefined}
      >
        {key.map((g, i) => (
          <div
            key={`${practiceKeyShown ? 'p' : 't'}${g}`}
            className={`sc-cell${hint === i + 1 ? ' is-hint' : ''}${answer === i + 1 ? ' is-answer' : ''}`}
            data-glyph={g}
            data-digit={i + 1}
          >
            <span className="sc-cell-glyph">
              <GlyphSvg glyph={g} />
            </span>
            <span className="sc-cell-digit">{i + 1}</span>
          </div>
        ))}
        <span className="sc-strip-note" aria-hidden>
          {stripNote}
        </span>
      </div>

      <div className="sc-center">
        {isCard ? (
          <PhaseFor
            phase={phase}
            mode={mode}
            round={round}
            lastPractice={lastPractice}
            onAction={() => {
              if (phase === 'tutorial-intro') {
                setTutorialStep(0);
                setPhase('tutorial');
              } else if (phase === 'practice-intro') setPhase('practice');
              else if (phase === 'motor-intro') setPhase('motor-countdown');
              else if (phase === 'block-intro') setPhase('block-countdown');
              else if (phase === 'practice-done') finishPractice();
            }}
          />
        ) : (
          <div
            ref={targetRef}
            className="sc-target fx-card"
            data-mode={digitMode ? 'digit' : 'glyph'}
            data-fb={fb || undefined}
            role="img"
            aria-label={digitMode ? 'Number to match' : 'Symbol to find in the key'}
          >
            <svg className="sc-glyph sc-target-glyph" viewBox="1 1 22 22" aria-hidden focusable="false">
              <path ref={pathRef} />
            </svg>
            <span ref={digitRef} className="sc-target-digit" aria-hidden />
            {phase === 'tutorial' && (
              <>
                <span className="sc-kicker">
                  Guided · {tutorialStep + 1} of {PROTOCOL.tutorialItems}
                </span>
                <span className="sc-caption" aria-live="polite">
                  {missed
                    ? `Not quite: it sits above ${session.tutorial[tutorialStep]} in the key. Try again.`
                    : tutorialStep === 0
                      ? `This symbol is lit in the key, above ${session.tutorial[0]}. Tap ${session.tutorial[0]}.`
                      : tutorialStep === 1
                        ? 'Find it in the key (it is lit), then tap the number under it.'
                        : 'Your turn: find the symbol in the key, then tap its number.'}
                </span>
              </>
            )}
            {phase === 'practice' && (
              <>
                <span className="sc-kicker">Practice{round ? ' · again' : ''}</span>
                <span className="sc-dots" aria-label={`${answered} of ${PROTOCOL.practiceItems} answered`}>
                  {Array.from({ length: PROTOCOL.practiceItems }, (_, i) => (
                    <span key={i} className={`sc-dot${i < answered ? ' done' : ''}${i === answered ? ' cur' : ''}`} />
                  ))}
                </span>
                <span className="sc-sr" aria-live="polite">
                  {fb === 'good' ? 'Right' : fb === 'bad' ? 'Wrong' : ''}
                </span>
              </>
            )}
            {(phase === 'motor-done' || phase === 'block-done') && (
              <span className="sc-time" role="status">
                <svg className="sc-time-ring" viewBox="0 0 48 48" aria-hidden focusable="false">
                  <circle cx="24" cy="24" r="20" pathLength={100} />
                </svg>
                <b>Time</b>
              </span>
            )}
          </div>
        )}
        {/* the countdown sits where the first item will appear, so the eyes are already there at Go */}
        {phase === 'motor-countdown' && <Countdown label="Number match · 15 s" onDone={() => setPhase('motor')} />}
        {phase === 'block-countdown' && <Countdown label="Symbol coding · 90 s" onDone={() => setPhase('block')} />}
      </div>

      <div className="sc-pad fx-card" data-hint={phase === 'tutorial' && tutorialStep === 0 ? session.tutorial[0] : undefined}>
        <NumberPad layout="digits9" onDigit={onDigit} disabled={!live} />
      </div>

      {fx.layer}
    </div>
  );
}

/** the between-phase cards — same words in every session (C1) */
function PhaseFor({
  phase,
  mode,
  round,
  lastPractice,
  onAction
}: {
  phase: Phase;
  mode: BrainTestProps['mode'];
  round: number;
  lastPractice: number | undefined;
  onAction: () => void;
}) {
  const chip =
    lastPractice === undefined ? null : (
      <p className="sc-chip">
        Practice · {lastPractice} of {PROTOCOL.practiceItems} right
      </p>
    );
  if (phase === 'tutorial-intro')
    return (
      <PhaseCard
        kicker={mode === 'practice' ? 'Practice · guided' : 'First run · guided'}
        title="Read the key"
        body="The key above pairs nine symbols with the numbers 1 to 9. A symbol appears in the middle: find it in the key and tap the number under it. The first three are guided."
        action="Begin"
        onAction={onAction}
      />
    );
  if (phase === 'practice-intro')
    return round === 0 ? (
      <PhaseCard
        kicker="Warm-up · not scored"
        title={`Practice · ${PROTOCOL.practiceItems} symbols`}
        body="Find each symbol in the key above and tap the number under it. Practice shows right or wrong after every answer."
        action="Start practice"
        onAction={onAction}
      />
    ) : (
      <PhaseCard
        kicker="Warm-up · not scored"
        title="Once more"
        body="Look for the symbol in the key, then tap the number printed under it. Take your time — practice is not timed."
        action="Practise again"
        onAction={onAction}
      >
        {chip}
      </PhaseCard>
    );
  if (phase === 'motor-intro')
    return (
      <PhaseCard
        kicker="Part 1 of 2 · 15 seconds"
        title="Number match"
        body="A number appears in the middle: tap the same number, as fast as you can. This measures your finger and screen speed on its own."
        action="Start"
        onAction={onAction}
      >
        {chip}
      </PhaseCard>
    );
  if (phase === 'block-intro')
    return (
      <PhaseCard
        kicker="Part 2 of 2 · 90 seconds · scored"
        title="Symbol coding"
        body="A new key appears at Go. Find each symbol in the key and tap its number, as fast as you can without mistakes. Right and wrong are not shown."
        action="Start"
        onAction={onAction}
      />
    );
  return (
    <PhaseCard
      kicker="Practice · not recorded"
      title="Practice complete"
      body="The test itself adds a 15-second number match, then the 90-second scored block with a new key."
      action="Done"
      onAction={onAction}
    >
      {chip}
    </PhaseCard>
  );
}
