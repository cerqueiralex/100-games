import { useEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { eventTime, now, revealOnFrame } from '../../platform/brain/timing';
import { loadBrain } from '../../platform/brain/store';
import { PhaseCard, ResponseButton, useDemoClock, useFeedback } from '../../platform/components/fx';
import { sfx } from '../../platform/audio';
import { haptic } from '../../platform/motion';
import { CheckIcon, ChevronIcon, ClockIcon, CloseIcon } from '../../platform/design/icons';
import { CellArt } from './render';
import type { Item } from './logic/model';
import { generateItem, PHASE_BLOCK, PHASE_PRACTICE, PHASE_WARMUP, probeMask, subSeed } from './logic/generator';
import { selectClass, startTheta } from './logic/irt';
import {
  COL,
  KIND_SCORED,
  KIND_VOID_SCORED,
  KIND_VOID_WARMUP,
  KIND_WARMUP,
  PROTOCOL,
  scoreRun,
  thetaSoFar
} from './logic/protocol';
import { describeCell, explainItem } from './logic/explain';
import { WORKED_EXAMPLES } from './logic/examples';

/**
 * Matrix Reasoning — the Analysis benchmark (SCIENCE.md §1.8).
 *
 * Flow: [first run → five worked examples, then practice with feedback until
 * 3 are correct] → 1 timed warm-up item (D2, corrective feedback) → 12 scored
 * items chosen adaptively (class nearest θ̂ − 0.2), no feedback. Every item:
 * 500-ms blank → matrix + options revealed together inside one animation
 * frame (the onset) → 30-s window, the countdown ring from 25 s → select,
 * then tap again or Confirm (RT at commit).
 *
 * Interruption class B: a pause while an item is showing voids it (logged)
 * and a replacement from the same class follows the resume; a pause during
 * the blank replays the same item; a 4th void ends the run as invalid. The
 * 240-s cap counts active time only.
 *
 * Protocol state lives in one mutable ref (the timers read it at the moment
 * they fire, never a stale render's copy) and a counter forces the redraw.
 */

const TEST_ID = 'matrix-reasoning';
const r3 = (x: number) => Math.round(x * 1000) / 1000;

type Phase = 'tutorial' | 'practiceIntro' | 'practice' | 'warmupIntro' | 'warmup' | 'blockIntro' | 'block' | 'done';
type ItemState = 'idle' | 'blank' | 'live' | 'feedback';

interface Feedback {
  correct: boolean;
  chosen: number | null;
  timeout: boolean;
}

interface Machine {
  phase: Phase;
  item: Item | null;
  state: ItemState;
  selected: number | null;
  fb: Feedback | null;
  ring: boolean;
  ringLeft: number;
  live: boolean;
  onset: number;
  practiceAttempt: number;
  practiceCorrect: number;
  warmAttempt: number;
  slot: number;
  attempt: number;
  voids: number;
  log: number[][];
  prevKey: string | null;
  thetaIn: number;
  activeMs: number;
  activeSince: number | null;
  capped: boolean;
  finished: boolean;
  wasPaused: boolean;
  replace: boolean;
  replay: boolean;
  timeUp: boolean;
  /** when the practice / warm-up feedback appeared — Continue ignores taps for a moment */
  fbAt: number;
}

/** θ of the last valid sessions of this test — only steers the first item (§1.8 "Adaptive rule") */
function previousThetas(): number[] {
  try {
    return loadBrain()
      .sessions.filter((s) => s.testId === TEST_ID && s.valid && s.protocolVersion === 1 && Number.isFinite(s.metrics.theta))
      .map((s) => s.metrics.theta);
  } catch {
    return [];
  }
}

export function MatrixReasoningTest({ mode, firstRun, seed, paused, onProgress, onFinish }: BrainTestProps) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [theta0] = useState(() => startTheta(previousThetas()));
  const fb = useFeedback();
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const cancelReveal = useRef<(() => void) | null>(null);
  const finished = useRef(false);
  const M = useRef<Machine>({
    phase: mode === 'practice' || firstRun ? 'tutorial' : 'warmupIntro',
    item: null,
    state: 'idle',
    selected: null,
    fb: null,
    ring: false,
    ringLeft: 5,
    live: false,
    onset: 0,
    practiceAttempt: 0,
    practiceCorrect: 0,
    warmAttempt: 0,
    slot: 0,
    attempt: 0,
    voids: 0,
    log: [],
    prevKey: null,
    thetaIn: theta0,
    activeMs: 0,
    activeSince: null,
    capped: false,
    finished: false,
    wasPaused: false,
    replace: false,
    replay: false,
    timeUp: false,
    fbAt: 0
  });
  const props = useRef({ onProgress, onFinish });
  props.current = { onProgress, onFinish };

  /* ---------- timers & reveal ---------- */

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    cancelReveal.current?.();
    cancelReveal.current = null;
  };
  /** the stimulus is shown/hidden by one attribute written straight to the DOM (C2: no CSS transition) */
  const setLive = (on: boolean) => {
    if (rootRef.current) rootRef.current.dataset.live = on ? '1' : '0';
  };
  const activeNow = () => {
    const m = M.current;
    return m.activeMs + (m.activeSince !== null ? now() - m.activeSince : 0);
  };

  useEffect(() => {
    props.current.onProgress(0);
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      cancelReveal.current?.();
    };
  }, []);

  const finish = (o: BrainRunOutcome) => {
    if (finished.current) return;
    finished.current = true;
    props.current.onFinish(o);
  };

  /* ---------- one item ---------- */

  const showBlank = () => {
    const m = M.current;
    m.state = 'blank';
    m.live = false;
    setLive(false);
    rerender();
    later(() => {
      cancelReveal.current = revealOnFrame(
        () => setLive(true),
        (t) => {
          cancelReveal.current = null;
          m.onset = t;
          m.live = true;
          m.state = 'live';
          m.timeUp = false;
          if (m.phase !== 'practice') armWindow();
          rerender();
        }
      );
    }, PROTOCOL.blankMs);
  };

  const begin = (classId: number) => {
    const m = M.current;
    const [code, slot, attempt] =
      m.phase === 'practice'
        ? [PHASE_PRACTICE, m.practiceAttempt, 0]
        : m.phase === 'warmup'
          ? [PHASE_WARMUP, 0, m.warmAttempt]
          : [PHASE_BLOCK, m.slot, m.attempt];
    const item = generateItem(classId, subSeed(seed, code, slot, attempt), m.prevKey);
    m.prevKey = item.key;
    m.item = item;
    m.selected = null;
    m.fb = null;
    m.ring = false;
    m.ringLeft = 5;
    showBlank();
  };

  const armWindow = () => {
    const m = M.current;
    later(() => {
      if (!m.live) return;
      m.ring = true;
      m.ringLeft = 5;
      sfx.tick();
      rerender();
    }, PROTOCOL.ringFromMs);
    for (let s = 1; s < 5; s++)
      later(() => {
        if (!m.live) return;
        m.ringLeft = 5 - s;
        sfx.tick();
        rerender();
      }, PROTOCOL.ringFromMs + s * 1000);
    later(onTimeout, PROTOCOL.windowMs);
  };

  /** one trial-log row (columns documented in logic/protocol.ts) */
  const record = (kind: number, chosen: number, rt: number, timeout: boolean) => {
    const m = M.current;
    const it = m.item as Item;
    const row = [
      kind,
      it.classId,
      chosen === it.answer ? 1 : 0,
      Math.round(rt),
      timeout ? 1 : 0,
      !timeout && chosen >= 0 && rt < PROTOCOL.rapidMs ? 1 : 0,
      chosen,
      it.answer,
      chosen >= 0 ? probeMask(it, chosen) : -1,
      it.family,
      r3(m.thetaIn),
      0
    ];
    m.log.push(row);
    row[COL.thetaOut] = r3(kind === KIND_SCORED ? (thetaSoFar(m.log) ?? m.thetaIn) : m.thetaIn);
  };

  const tileCentre = (slot: number) => {
    const root = rootRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (!root || !el) return undefined;
    const a = root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: ((b.left + b.width / 2 - a.left) / a.width) * 100, y: ((b.top + b.height / 2 - a.top) / a.height) * 100 };
  };

  const commit = (slot: number, t: number) => {
    const m = M.current;
    if (!m.live || !m.item || m.finished) return;
    m.live = false;
    clearTimers();
    const rt = Math.max(0, t - m.onset);
    const correct = slot === m.item.answer;
    const at = tileCentre(slot);
    m.selected = slot;
    if (m.phase === 'block') {
      // C3: a neutral acknowledgement only — no correctness during the scored block
      record(KIND_SCORED, slot, rt, false);
      fb.neutral(at);
      sfx.place();
      haptic('tap');
      afterScored();
      return;
    }
    if (m.phase === 'warmup') record(KIND_WARMUP, slot, rt, false);
    if (m.phase === 'practice' && correct) m.practiceCorrect++;
    if (correct) fb.good(at, { step: m.practiceCorrect });
    else fb.bad(at);
    m.fb = { correct, chosen: slot, timeout: false };
    m.fbAt = now();
    m.state = 'feedback';
    rerender();
  };

  const onTimeout = () => {
    const m = M.current;
    if (!m.live || !m.item) return;
    m.live = false;
    clearTimers();
    sfx.thud();
    if (m.phase === 'block') {
      record(KIND_SCORED, -1, PROTOCOL.windowMs, true);
      m.timeUp = true;
      afterScored();
      return;
    }
    record(KIND_WARMUP, -1, PROTOCOL.windowMs, true);
    m.fb = { correct: false, chosen: null, timeout: true };
    m.fbAt = now();
    m.state = 'feedback';
    rerender();
  };

  /* ---------- the scored block ---------- */

  const progressNow = () => Math.min(1, Math.max(M.current.slot / PROTOCOL.scoredItems, activeNow() / PROTOCOL.capMs));

  const end = (interrupted: boolean) => {
    const m = M.current;
    if (m.finished) return;
    m.finished = true;
    m.live = false;
    clearTimers();
    m.phase = 'done';
    rerender();
    props.current.onProgress(1);
    sfx.place(); // block locked — the results chime is the runner's
    finish(scoreRun(m.log, { interrupted, capped: m.capped }));
  };

  const nextScored = () => {
    const m = M.current;
    if (m.slot >= PROTOCOL.scoredItems) return end(false);
    if (activeNow() >= PROTOCOL.capMs) {
      m.capped = true;
      return end(false);
    }
    const th = thetaSoFar(m.log) ?? theta0;
    m.thetaIn = th;
    begin(selectClass(th));
  };

  const afterScored = () => {
    const m = M.current;
    m.slot++;
    m.attempt = 0;
    props.current.onProgress(progressNow());
    nextScored();
  };

  const startBlock = () => {
    const m = M.current;
    m.phase = 'block';
    m.activeSince = now();
    m.slot = 0;
    m.attempt = 0;
    nextScored();
  };

  /* ---------- practice & warm-up ---------- */

  const nextPractice = () => {
    const m = M.current;
    if (m.practiceCorrect >= PROTOCOL.practiceTarget || m.practiceAttempt >= PROTOCOL.practiceMax) {
      m.item = null;
      m.state = 'idle';
      if (mode === 'practice') {
        m.finished = true;
        m.phase = 'done';
        rerender();
        finish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
        return;
      }
      m.phase = 'warmupIntro';
      rerender();
      return;
    }
    begin(PROTOCOL.practiceClasses[m.practiceAttempt % PROTOCOL.practiceClasses.length]);
  };

  const onContinue = () => {
    const m = M.current;
    // the answer registers on pointerdown, so the same touch's click lands on
    // whatever replaced the tile — often this very button: ignore it
    if (m.state !== 'feedback' || now() - m.fbAt < 450) return;
    if (m.phase === 'practice') {
      m.practiceAttempt++;
      nextPractice();
    } else if (m.phase === 'warmup') {
      m.item = null;
      m.fb = null;
      m.state = 'idle';
      m.phase = 'blockIntro';
      rerender();
    }
  };

  /* ---------- input ---------- */

  const tap = (slot: number, t: number) => {
    const m = M.current;
    if (!m.live) return;
    if (m.selected === slot) commit(slot, t);
    else {
      m.selected = slot;
      sfx.tap();
      haptic('tap');
      rerender();
    }
  };

  const onTileDown = (slot: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setAttribute('data-down', '');
    window.setTimeout(() => el.removeAttribute('data-down'), 140);
    tap(slot, eventTime(e.nativeEvent));
  };

  // desktop: 1–8 pick an option (the same digit again answers); Enter is Confirm's own key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const d = Number(e.key);
      if (!Number.isInteger(d) || d < 1 || d > 8) return;
      if (!M.current.live) return;
      e.preventDefault();
      tap(d - 1, eventTime(e));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- interruptions (class B) ---------- */

  const voidCurrent = () => {
    const m = M.current;
    const block = m.phase === 'block';
    record(block ? KIND_VOID_SCORED : KIND_VOID_WARMUP, -1, Math.max(0, now() - m.onset), false);
    m.live = false;
    m.state = 'idle';
    m.selected = null;
    m.ring = false;
    setLive(false);
    if (block) {
      m.voids++;
      if (m.voids > PROTOCOL.maxVoids) {
        end(true);
        return;
      }
      m.attempt++;
    } else m.warmAttempt++;
    m.replace = true;
  };

  useEffect(() => {
    const m = M.current;
    if (m.finished) return;
    if (paused) {
      if (m.activeSince !== null) {
        m.activeMs += now() - m.activeSince;
        m.activeSince = null;
      }
      m.wasPaused = true;
      const timed = m.phase === 'block' || m.phase === 'warmup';
      if (m.item && m.state === 'blank') {
        clearTimers();
        m.replay = true;
      } else if (m.item && m.state === 'live' && timed) {
        clearTimers();
        voidCurrent();
      }
      rerender();
    } else if (m.wasPaused) {
      m.wasPaused = false;
      if (m.phase === 'block' && m.activeSince === null) m.activeSince = now();
      if (m.replace && m.item) {
        m.replace = false;
        begin(m.item.classId);
      } else if (m.replay) {
        m.replay = false;
        showBlank();
      } else rerender();
    }
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- view ---------- */

  const m = M.current;
  const it = m.item;
  const inItem = (m.phase === 'practice' || m.phase === 'warmup' || m.phase === 'block') && it;

  let body;
  if (m.phase === 'tutorial') {
    body = (
      <Tutorial
        onDone={() => {
          m.phase = 'practiceIntro';
          rerender();
        }}
      />
    );
  } else if (m.phase === 'practiceIntro') {
    body = (
      <PhaseCard
        kicker="Practice · with feedback"
        title="Solve 3 patterns"
        body={
          <>
            Find the piece that completes each pattern. Tap it to select it, then tap it again — or press Confirm. After each
            one you’ll see the answer and the rule.
          </>
        }
        action="Start practice"
        onAction={() => {
          m.phase = 'practice';
          nextPractice();
        }}
      />
    );
  } else if (m.phase === 'warmupIntro') {
    body = (
      <PhaseCard
        kicker="Warm-up · not scored"
        title="One pattern to warm up"
        body={<>Timed like the real thing: 30 seconds, with a ring counting down the last 5. You’ll see the answer after this one.</>}
        action="Start warm-up"
        onAction={() => {
          m.phase = 'warmup';
          m.thetaIn = theta0;
          begin(PROTOCOL.warmupClass);
        }}
      />
    );
  } else if (m.phase === 'blockIntro') {
    body = (
      <PhaseCard
        kicker={`Scored · ${PROTOCOL.scoredItems} patterns`}
        title="Now for real"
        body={
          <>
            The patterns adapt to you, and there’s no feedback until the end. Take a proper look at each one — answers in under
            1.5&nbsp;s count as guesses.
          </>
        }
        action="Begin"
        onAction={startBlock}
      />
    );
  } else if (m.phase === 'done') {
    body = (
      <div className="mr-done fx-card" role="status">
        <span className="mr-done-mark">
          <CheckIcon size={26} />
        </span>
        <strong>{mode === 'practice' ? 'Practice complete' : 'All patterns done'}</strong>
      </div>
    );
  } else if (inItem && it) {
    const kicker =
      m.phase === 'practice'
        ? `Practice · ${m.practiceCorrect} of ${PROTOCOL.practiceTarget} correct`
        : m.phase === 'warmup'
          ? 'Warm-up · not scored'
          : `Pattern ${Math.min(m.slot + 1, PROTOCOL.scoredItems)} of ${PROTOCOL.scoredItems}`;
    body = (
      <div className="mr-run" data-phase={m.phase}>
        <header className="mr-head">
          <span className="mr-kicker">{kicker}</span>
          {m.phase === 'block' && (
            <span className="mr-pips" aria-hidden>
              {Array.from({ length: PROTOCOL.scoredItems }, (_, i) => (
                <i key={i} className={i < m.slot ? 'done' : i === m.slot ? 'now' : undefined} />
              ))}
            </span>
          )}
          <span className={`mr-ring${m.ring ? ' on' : ''}`} role="timer" aria-hidden={!m.ring} aria-label={m.ring ? `${m.ringLeft} seconds left` : undefined}>
            <svg viewBox="0 0 36 36" aria-hidden>
              <circle className="mr-ring-track" cx="18" cy="18" r="15" />
              <circle key={m.ring ? `on-${m.slot}-${m.attempt}` : 'off'} className="mr-ring-fill" cx="18" cy="18" r="15" />
            </svg>
            <b>{m.ringLeft}</b>
          </span>
        </header>

        <div className="mr-matrix mr-stim" role="group" aria-label="Pattern, 3 by 3 — the bottom-right cell is missing">
          {it.cells.slice(0, 8).map((c, i) => (
            <div key={i} className="mr-cell">
              <CellArt cell={c} layout={it.layout} label={describeCell(c, it.layout)} />
            </div>
          ))}
          <div className={`mr-cell mr-missing${m.fb ? ' solved' : ''}`}>
            {m.fb ? (
              <CellArt cell={it.cells[8]} layout={it.layout} label={`Answer: ${describeCell(it.cells[8], it.layout)}`} />
            ) : (
              <span className="mr-q mr-art" aria-label="Missing cell">
                ?
              </span>
            )}
          </div>
          {m.timeUp && m.state === 'blank' && (
            <span className="mr-note" role="status">
              Time’s up — next pattern
            </span>
          )}
        </div>

        <div className="mr-dock fx-card">
          {m.fb ? (
            <FeedbackPanel item={it} fb={m.fb} onContinue={onContinue} last={m.phase === 'warmup'} />
          ) : (
            <>
              <div
                className="mr-options mr-stim"
                role="radiogroup"
                aria-label="Answer options"
                data-answer={import.meta.env.DEV ? it.answer : undefined}
              >
                {it.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={m.selected === i}
                    aria-label={`Option ${i + 1}: ${describeCell(o, it.layout)}`}
                    data-slot={i}
                    className={`mr-opt${m.selected === i ? ' sel' : ''}`}
                    onPointerDown={onTileDown(i)}
                    onClick={(e) => {
                      if (e.detail === 0) tap(i, now());
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <CellArt cell={o} layout={it.layout} />
                    <span className="mr-opt-badge" aria-hidden>
                      <CheckIcon size={12} />
                    </span>
                  </button>
                ))}
              </div>
              <ResponseButton
                className="mr-confirm"
                active={m.selected !== null && m.state === 'live'}
                disabled={m.selected === null || m.state !== 'live'}
                keys={['Enter']}
                ariaLabel="Confirm answer"
                onPress={(t) => {
                  if (M.current.selected !== null) commit(M.current.selected, t);
                }}
              >
                <CheckIcon size={18} />
                <span>Confirm</span>
              </ResponseButton>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mr" ref={rootRef} data-mr-phase={m.phase} data-mr-state={m.state}>
      {body}
      {fb.layer}
    </div>
  );
}

/* ---------- practice / warm-up feedback ---------- */

function FeedbackPanel({ item, fb, onContinue, last }: { item: Item; fb: Feedback; onContinue: () => void; last: boolean }) {
  const lines = explainItem(item);
  return (
    <div className={`mr-fb ${fb.correct ? 'good' : 'bad'}`} role="status" aria-live="polite">
      <div className="mr-fb-head">
        <span className="mr-fb-mark" aria-hidden>
          {fb.correct ? <CheckIcon size={18} /> : fb.timeout ? <ClockIcon size={18} /> : <CloseIcon size={18} />}
        </span>
        <strong>{fb.correct ? 'Correct' : fb.timeout ? 'Time’s up' : 'Not quite'}</strong>
        {!fb.correct && fb.chosen !== null && (
          <span className="mr-fb-pick">
            <span>You picked</span>
            <span className="mr-fb-tile">
              <CellArt cell={item.options[fb.chosen]} layout={item.layout} label={describeCell(item.options[fb.chosen], item.layout)} />
            </span>
          </span>
        )}
      </div>
      <ul className="mr-fb-why">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <button type="button" className="primary-btn mr-fb-next" onClick={onContinue} data-mr-continue>
        {last ? 'Continue to the test' : 'Next'}
      </button>
    </div>
  );
}

/* ---------- first-run tutorial: five rule families, one worked example each ---------- */

function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const n = WORKED_EXAMPLES.length;
  return (
    <div className="mr-tut fx-card">
      <span className="phase-kicker">
        The five rule types · {step + 1} of {n}
      </span>
      <WorkedExampleView key={step} index={step} />
      <div className="mr-tut-nav">
        <button
          type="button"
          className="mr-tut-back"
          disabled={step === 0}
          aria-label="Previous rule"
          onClick={() => {
            sfx.tap();
            setStep((s) => Math.max(0, s - 1));
          }}
        >
          <ChevronIcon size={20} dir="left" />
        </button>
        <span className="mr-tut-dots" aria-hidden>
          {WORKED_EXAMPLES.map((_, i) => (
            <i key={i} className={i === step ? 'on' : i < step ? 'seen' : undefined} />
          ))}
        </span>
        <button
          type="button"
          className="primary-btn mr-tut-next"
          data-mr-next
          onClick={() => {
            sfx.tap();
            if (step < n - 1) setStep(step + 1);
            else onDone();
          }}
        >
          {step < n - 1 ? 'Next' : 'Practise'}
        </button>
      </div>
    </div>
  );
}

const SWEEPS: Record<'rows' | 'cols' | 'diag' | 'rings', number[][]> = {
  rows: [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8]
  ],
  cols: [
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8]
  ],
  diag: [
    [1, 5, 6],
    [2, 3, 7],
    [0, 4, 8]
  ],
  rings: [[0], [1, 3, 4], [2, 5, 6, 7, 8]]
};

function WorkedExampleView({ index }: { index: number }) {
  const ex = WORKED_EXAMPLES[index];
  // 0–3.6 s: the three groups light up in turn; the answer lands at 2.9 s; hold, loop
  const t = useDemoClock(5600, 4600);
  const g = Math.floor(t / 1200);
  const hl = g < 3 ? SWEEPS[ex.sweep][g] : [];
  const solved = t >= 2900;
  return (
    <>
      <h3 className="phase-title">{ex.title}</h3>
      <div className="mr-matrix mr-matrix-sm" role="img" aria-label={`Worked example: ${ex.body}`}>
        {ex.cells.map((c, i) =>
          i < 8 ? (
            <div key={i} className={`mr-cell${hl.includes(i) ? ' hl' : ''}`}>
              <CellArt cell={c} layout={ex.layout} />
            </div>
          ) : (
            <div key={i} className={`mr-cell mr-missing${solved ? ' solved' : ''}${hl.includes(i) ? ' hl' : ''}`}>
              {solved ? (
                <span className="mr-pop">
                  <CellArt cell={c} layout={ex.layout} />
                </span>
              ) : (
                <span className="mr-q">?</span>
              )}
            </div>
          )
        )}
      </div>
      <p className="phase-body mr-tut-body">{ex.body}</p>
    </>
  );
}
