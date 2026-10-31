import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BrainTestProps } from '../../platform/brain/types';
import { Countdown, NumberPad, PhaseCard, TimerBar, useFeedback } from '../../platform/components/fx';
import { clamp, now, revealOnFrame } from '../../platform/brain/timing';
import { sfx } from '../../platform/audio';
import { haptic } from '../../platform/motion';
import { CheckIcon, ClockIcon } from '../../platform/design/icons';
import { ArithmeticSprintArt } from './icon';
import { generateItems, generatePractice, OP_SYMBOL, problemText, type Problem } from './logic/items';
import { scoreRun, type Submission } from './logic/scoring';
import { BLOCK_MS, MAX_DIGITS, PRACTICE_BAD_MS, PRACTICE_GOOD_MS } from './logic/protocol';

/**
 * Arithmetic Sprint — the Calculation benchmark (SCIENCE.md §1.7).
 *
 * Flow: [first run / Practice mode → 4 untimed practice items with feedback,
 * a missed item repeated once] → intro card ("Solve as many as you can in 2
 * minutes…") → 3-2-1 → 120.0 s scored block → onFinish. Interruption class
 * A: the runner aborts and invalidates an interrupted run, so there is no
 * pause logic here (C5).
 *
 * Timing (C2): each problem is written into the DOM and made visible inside
 * the requestAnimationFrame callback that stamps its onset (revealOnFrame) —
 * never through React state or a CSS animation; keys register on pointerdown
 * (NumberPad → ResponseButton) with the event's own timestamp. Keystrokes
 * stamped before the current problem's onset are ignored.
 *
 * Feedback (C3): the scored block shows NO correctness — every key gets the
 * same press flash and tick, every ✓ the same ring and sound, right or wrong.
 * Correct / wrong marks appear only in the untimed practice.
 */

type Phase = 'practice-intro' | 'practice' | 'practice-done' | 'intro' | 'countdown' | 'block' | 'done';

interface PracticeEntry {
  p: Problem;
  /** the second showing of a missed item (shown once more, never a third time) */
  repeat: boolean;
}

interface PracticeFeedback {
  ok: boolean;
  typed: string;
  p: Problem;
}

const OPS_ROW = ['+', '−', '×', '÷'];

export function ArithmeticSprintTest({ mode, firstRun, seed, onProgress, onFinish }: BrainTestProps) {
  const items = useMemo(() => generateItems(seed), [seed]);
  const practiceItems = useMemo(() => generatePractice(seed, items), [seed, items]);
  const withPractice = mode === 'practice' || firstRun;

  const [phase, setPhase] = useState<Phase>(withPractice ? 'practice-intro' : 'intro');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [typed, setTypedState] = useState('');
  const typedRef = useRef('');
  const setTyped = (v: string) => {
    typedRef.current = v;
    setTypedState(v);
  };

  /* ---------- practice state ---------- */
  const queue = useRef<PracticeEntry[]>(practiceItems.map((p) => ({ p, repeat: false })));
  const [pIdx, setPIdx] = useState(0);
  const pIdxRef = useRef(0);
  pIdxRef.current = pIdx;
  const [pLen, setPLen] = useState(queue.current.length);
  const [fb, setFb] = useState<PracticeFeedback | null>(null);
  const firstTry = useRef(0);
  const streak = useRef(0);

  /* ---------- block state (refs: written in input handlers and rAF callbacks) ---------- */
  const idx = useRef(0);
  const onset = useRef(0);
  const blockStart = useRef(0);
  const firstDigit = useRef(Number.NaN);
  const edits = useRef(0);
  const locked = useRef(true);
  const ended = useRef(false);
  const finished = useRef(false);
  const subs = useRef<Submission[]>([]);
  const timeouts = useRef<number[]>([]);
  const intervals = useRef<number[]>([]);
  const cancelReveal = useRef<() => void>(() => {});
  const [barKey, setBarKey] = useState(0);

  const progressCb = useRef(onProgress);
  progressCb.current = onProgress;
  const finishCb = useRef(onFinish);
  finishCb.current = onFinish;

  /* ---------- DOM ---------- */
  const probRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const opRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const shown = useRef(0);

  const stageFx = useFeedback();
  const keyFx = useFeedback();

  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    intervals.current.forEach((t) => window.clearInterval(t));
    timeouts.current = [];
    intervals.current = [];
  };

  useEffect(() => {
    progressCb.current(0);
    return () => {
      clearTimers();
      cancelReveal.current();
    };
  }, []);

  /**
   * Show a problem (or blank the stage) on the next frame, stamping its onset
   * as that frame's timestamp. Input stays locked from the call until the
   * onset, so no keystroke can land on a problem the player has not seen.
   */
  const present = (p: Problem | null, onOnset?: (ts: number) => void) => {
    cancelReveal.current();
    locked.current = true;
    const write = (): boolean => {
      const el = probRef.current;
      const a = aRef.current;
      const op = opRef.current;
      const b = bRef.current;
      if (!el || !a || !op || !b) return false;
      a.textContent = p ? String(p.a) : '';
      op.textContent = p ? OP_SYMBOL[p.op] : '';
      b.textContent = p ? String(p.b) : '';
      el.style.opacity = p ? '1' : '0';
      el.dataset.n = String(++shown.current);
      return true;
    };
    let tries = 0;
    const attempt = () => {
      let wrote = false;
      cancelReveal.current = revealOnFrame(
        () => {
          wrote = write();
        },
        (ts) => {
          if (!wrote) {
            // the stage mounts this frame — reveal on the next one
            if (++tries < 30) attempt();
            return;
          }
          if (!p) return;
          onset.current = ts;
          firstDigit.current = Number.NaN;
          edits.current = 0;
          locked.current = false;
          onOnset?.(ts);
        }
      );
    };
    attempt();
  };

  const finish = (outcome: Parameters<typeof onFinish>[0]) => {
    if (finished.current) return;
    finished.current = true;
    finishCb.current(outcome);
  };

  /* ---------- the scored block ---------- */

  const endBlock = (exhausted = false) => {
    if (ended.current) return;
    ended.current = true;
    locked.current = true;
    clearTimers();
    present(null); // the item on screen at time-out is discarded, not an error
    setPhase('done');
    progressCb.current(1);
    sfx.place(); // block locked — the results chime is the runner's
    const outcome = scoreRun(subs.current, { exhausted });
    later(() => finish(outcome), 900);
  };

  // the first problem appears on the frame after the countdown veil is gone
  useLayoutEffect(() => {
    if (phase !== 'block') return;
    setBarKey((k) => k + 1);
    present(items[0], (ts) => {
      blockStart.current = ts;
      later(() => endBlock(), Math.max(0, BLOCK_MS - (now() - ts)));
      intervals.current.push(
        window.setInterval(() => progressCb.current(clamp((now() - blockStart.current) / BLOCK_MS, 0, 1)), 250)
      );
    });
    // no cleanup: endBlock's own blanking reveal must survive the phase change
    // (the unmount effect cancels whatever reveal is pending)
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- practice ---------- */

  useLayoutEffect(() => {
    if (phase !== 'practice') return;
    present(queue.current[pIdx].p);
  }, [phase, pIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitPractice = (cur: string) => {
    const entry = queue.current[pIdxRef.current];
    const ok = Number(cur) === entry.p.answer;
    locked.current = true;
    if (ok) {
      if (!entry.repeat) firstTry.current++;
      stageFx.good(beside(stageRef.current, answerRef.current), { step: streak.current++ });
    } else {
      streak.current = 0;
      stageFx.bad(beside(stageRef.current, answerRef.current));
      if (!entry.repeat) {
        queue.current.push({ p: entry.p, repeat: true });
        setPLen(queue.current.length);
      }
    }
    setFb({ ok, typed: cur, p: entry.p });
    later(() => {
      setFb(null);
      setTyped('');
      const next = pIdxRef.current + 1;
      if (next >= queue.current.length) setPhase(mode === 'practice' ? 'practice-done' : 'intro');
      else setPIdx(next);
    }, ok ? PRACTICE_GOOD_MS : PRACTICE_BAD_MS);
  };

  /* ---------- input ---------- */

  const accepting = (t: number): boolean => {
    const ph = phaseRef.current;
    if ((ph !== 'practice' && ph !== 'block') || locked.current || ended.current) return false;
    if (t < onset.current) return false; // pressed before this problem appeared
    if (ph === 'block' && t > blockStart.current + BLOCK_MS) {
      endBlock(); // input locks at 120.0 s
      return false;
    }
    return true;
  };

  const onDigit = (d: number, t: number) => {
    if (!accepting(t)) return;
    const cur = typedRef.current;
    if (cur.length >= MAX_DIGITS) return;
    if (!Number.isFinite(firstDigit.current)) firstDigit.current = t;
    setTyped(cur + d);
    sfx.tick();
    haptic('tap');
  };

  const onBackspace = (t: number) => {
    if (!accepting(t)) return;
    const cur = typedRef.current;
    if (!cur) return;
    edits.current++;
    setTyped(cur.slice(0, -1));
    sfx.tick();
    haptic('tap');
  };

  const onEnter = (t: number) => {
    if (!accepting(t)) return;
    const cur = typedRef.current;
    if (!cur) return; // an empty ✓ is ignored
    if (phaseRef.current === 'practice') {
      submitPractice(cur);
      return;
    }
    const at = idx.current;
    const o = onset.current;
    subs.current.push({
      order: at,
      item: items[at],
      typed: Number(cur),
      firstDigitMs: (Number.isFinite(firstDigit.current) ? firstDigit.current : t) - o,
      rtMs: t - o,
      edits: edits.current,
      onsetMs: o - blockStart.current
    });
    // neutral acknowledgement only — identical for right and wrong (C3)
    sfx.place();
    haptic('tap');
    keyFx.neutral(centerOf(toolsRef.current, toolsRef.current?.querySelector('.num-enter')));
    setTyped('');
    idx.current = at + 1;
    if (idx.current >= items.length) {
      endBlock(true); // all 120 items gone before time-out: not an honest pace
      return;
    }
    present(items[idx.current]);
  };

  /* ---------- between-phase cards ---------- */

  const startPractice = () => {
    if (phaseRef.current !== 'practice-intro') return;
    sfx.tap();
    setPhase('practice');
  };
  const startCountdown = () => {
    if (phaseRef.current !== 'intro') return;
    sfx.tap();
    setPhase('countdown');
  };
  const closePractice = () => {
    if (phaseRef.current !== 'practice-done') return;
    finish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
  };
  const cardAction = phase === 'practice-intro' ? startPractice : phase === 'intro' ? startCountdown : phase === 'practice-done' ? closePractice : null;

  // desktop: Enter starts from a card too
  useEffect(() => {
    if (!cardAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      cardAction();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- render ---------- */

  if (phase === 'practice-intro' || phase === 'intro' || phase === 'practice-done') {
    return (
      <div className="as-test as-cards" data-phase={phase}>
        {phase === 'practice-intro' && (
          <PhaseCard
            kicker="Practice · not scored"
            title="Four practice problems"
            body={
              <>
                <p>One of each kind, untimed. Type the answer and press ✓.</p>
                <p>You'll see whether each answer is right — the scored block won't tell you.</p>
              </>
            }
            action="Start practice"
            onAction={startPractice}
          >
            <OpsChips />
          </PhaseCard>
        )}
        {phase === 'intro' && (
          <PhaseCard
            kicker="Scored · 2 minutes"
            title="Solve as many as you can in 2 minutes"
            body={
              <>
                <p>Be accurate and quick. Answer every problem, mentally, no paper.</p>
                <p className="as-card-quiet">No right or wrong marks until the end.</p>
              </>
            }
            action="Start"
            onAction={startCountdown}
          >
            <div className="as-card-meta" aria-hidden>
              <span className="as-chip as-chip-time">
                <ClockIcon size={15} /> 2:00
              </span>
              <OpsChips />
            </div>
          </PhaseCard>
        )}
        {phase === 'practice-done' && (
          <PhaseCard
            kicker="Practice complete"
            title={`${firstTry.current} of ${practiceItems.length} right first time`}
            body={<p>That's the whole task. A scored run lasts 2 minutes and shows no right or wrong marks until the end.</p>}
            action="Done"
            onAction={closePractice}
          >
            <span className="as-card-art" aria-hidden>
              <ArithmeticSprintArt size={56} />
            </span>
          </PhaseCard>
        )}
      </div>
    );
  }

  const inPractice = phase === 'practice';
  const current = inPractice ? queue.current[pIdx] : null;
  const answerState = fb ? (fb.ok ? ' good' : ' bad') : '';
  const digits = fb ? fb.typed : typed;

  return (
    <div className="as-test as-play" data-phase={phase}>
      <div className="as-top">
        {inPractice ? (
          <>
            <span className="as-kicker">Practice · not scored</span>
            <span className="as-pips" role="img" aria-label={`Problem ${Math.min(pIdx + 1, pLen)} of ${pLen}`}>
              {Array.from({ length: pLen }, (_, i) => (
                <span key={i} className={`as-pip${i < pIdx ? ' done' : i === pIdx ? ' now' : ''}`} />
              ))}
            </span>
          </>
        ) : (
          <TimerBar key={barKey} totalMs={BLOCK_MS} running={phase === 'block'} label="Time left" />
        )}
      </div>

      <div className="as-stage" ref={stageRef}>
        <div className="as-problem" ref={probRef} aria-live="polite" aria-atomic="true">
          <span className="as-num" ref={aRef} />
          <span className="as-op" ref={opRef} />
          <span className="as-num" ref={bRef} />
          <span className="as-eq">=</span>
        </div>
        <div
          ref={answerRef}
          className={`as-answer${digits ? ' has-value' : ''}${digits.length >= MAX_DIGITS ? ' full' : ''}${answerState}`}
          role="status"
          aria-label={digits ? `Your answer ${digits}` : 'Your answer, empty'}
          data-typed={digits}
        >
          <span className="as-digits">
            {digits.split('').map((d, i) => (
              <span key={i} className="as-digit">
                {d}
              </span>
            ))}
          </span>
          <span key={digits.length} className="as-caret" />
        </div>
        <p className={`as-note${fb ? (fb.ok ? ' good' : ' bad') : ''}`} aria-live="polite">
          {fb?.ok && (
            <>
              <CheckIcon size={18} /> Correct
            </>
          )}
          {fb && !fb.ok && (
            <>
              Not quite — {problemText(fb.p)} = <strong className="as-fix">{fb.p.answer}</strong>
            </>
          )}
          {!fb && current?.repeat && <span className="as-again">Once more — this one again</span>}
        </p>
        {stageFx.layer}
        {phase === 'countdown' && <Countdown from={3} stepMs={700} label="Get ready" onDone={() => setPhase('block')} />}
        {phase === 'done' && (
          <div className="as-done fx-card" role="status">
            <ClockIcon size={22} />
            <strong>Time's up</strong>
          </div>
        )}
      </div>

      <div className="as-tools fx-card" ref={toolsRef}>
        <NumberPad
          layout="phone"
          onDigit={onDigit}
          onBackspace={onBackspace}
          onEnter={onEnter}
          enterReady={typed.length > 0 && !fb && (phase === 'practice' || phase === 'block')}
          disabled={phase === 'countdown' || phase === 'done'}
        />
        {keyFx.layer}
      </div>

    </div>
  );
}

function OpsChips() {
  return (
    <span className="as-ops" aria-hidden>
      {OPS_ROW.map((s) => (
        <span key={s} className="as-chip as-chip-op">
          {s}
        </span>
      ))}
    </span>
  );
}

/** centre of `el` in % of `container` (a feedback layer's coordinate system) */
function centerOf(container: HTMLElement | null, el: Element | null | undefined): { x: number; y: number } | undefined {
  if (!container || !el) return undefined;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (!c.width || !c.height) return undefined;
  return { x: ((r.left + r.width / 2 - c.left) / c.width) * 100, y: ((r.top + r.height / 2 - c.top) / c.height) * 100 };
}

/** just right of `el` (the practice burst sits beside the answer, never over it) */
function beside(container: HTMLElement | null, el: Element | null | undefined): { x: number; y: number } | undefined {
  if (!container || !el) return undefined;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (!c.width || !c.height) return undefined;
  const x = Math.min(r.right + 34, c.right - 24);
  return { x: ((x - c.left) / c.width) * 100, y: ((r.top + r.height / 2 - c.top) / c.height) * 100 };
}
