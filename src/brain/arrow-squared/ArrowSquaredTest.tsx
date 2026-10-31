import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { Countdown, PhaseCard, TimerBar, useFeedback } from '../../platform/components/fx';
import { eventTime, now, revealOnFrame } from '../../platform/brain/timing';
import { sfx } from '../../platform/audio';
import { CheckIcon, CloseIcon } from '../../platform/design/icons';
import { BLOCK, blockSeed, flip, guidedItems, itemStream, WORKED_EXAMPLE, type Item, type Side } from './logic/items';
import { buildOutcome, encodeTrial } from './logic/scoring';
import { COUNTDOWN_FROM, COUNTDOWN_STEP_MS, GUIDED_ITEMS, TEST_MS, WARMUP_MS } from './logic/protocol';
import { ArrowRow, OptionButton, TargetTags, describeRow, dirWord, flashPress } from './parts';

/**
 * Arrow Squared — the Attention benchmark (SCIENCE.md §1.5: Flanker Squared,
 * Burgoyne et al. 2023, adapted for phones).
 *
 * Flow (C1): [first run → worked example + 4 guided items] → 30-s warm-up
 * with feedback (every session, unscored) → 3-s countdown → 90.0-s scored
 * block with feedback on every trial → onFinish. Interruption class A: the
 * runner ends an interrupted run itself, so there is no pause logic here.
 *
 * Timing (C2): an item is committed hidden, then made visible by an opacity
 * switch (the `data-stim` attribute, written straight to the DOM — never
 * through React state) inside requestAnimationFrame; that callback's
 * timestamp is the onset. Responses are read on pointerdown with the
 * event's own timestamp. Nothing animates a stimulus.
 */

/** the pad finishes arriving before the first warm-up item can be answered (C3) */
const ENTER_MS = 520;
/** the "Time" card stays up this long before the block hands over */
const OVER_MS = 1200;
/** HUD clock refresh */
const TICK_MS = 200;
/** a response timestamped before the stop may be dispatched a frame or two late */
const STOP_GRACE_MS = 40;
/** guided item: how long the "Right" explanation stays before the next item */
const GUIDED_NEXT_MS = 1150;

type Phase =
  | { k: 'tutorial' }
  | { k: 'practice-done'; firstTry: number }
  | { k: 'warmup-card' }
  | { k: 'warmup' }
  | { k: 'test-card'; right: number; wrong: number }
  | { k: 'test' };

export default function ArrowSquaredTest({ mode, firstRun, seed, onProgress, onFinish }: BrainTestProps) {
  const [phase, setPhase] = useState<Phase>(() => (mode === 'practice' || firstRun ? { k: 'tutorial' } : { k: 'warmup-card' }));
  const finished = useRef(false);
  const cb = useRef({ onProgress, onFinish });
  cb.current = { onProgress, onFinish };

  const finish = (o: BrainRunOutcome) => {
    if (finished.current) return;
    finished.current = true;
    cb.current.onFinish(o);
  };

  useEffect(() => {
    cb.current.onProgress(0);
  }, []);

  // protocol progress: the warm-up is the first quarter (30 of 120 timed seconds), the scored block the rest
  const warmTick = (f: number) => cb.current.onProgress(0.25 * f);
  const testTick = (f: number) => cb.current.onProgress(0.25 + 0.75 * f);

  let body: ReactNode;
  switch (phase.k) {
    case 'tutorial':
      body = (
        <Tutorial
          seed={seed}
          onDone={(firstTry) => setPhase(mode === 'practice' ? { k: 'practice-done', firstTry } : { k: 'warmup-card' })}
        />
      );
      break;
    case 'practice-done':
      body = (
        <Center>
          <PhaseCard
            kicker="Practice · nothing recorded"
            title="Practice complete"
            body={
              <>
                {phase.firstTry} of {GUIDED_ITEMS} right on the first try. The test is a 30-second warm-up, then 90 seconds of
                items: a right answer scores +1, a wrong one −1.
              </>
            }
            action="Done"
            onAction={() => finish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] })}
          />
        </Center>
      );
      break;
    case 'warmup-card':
      body = (
        <Center>
          <PhaseCard
            kicker="Warm-up · not scored"
            title="30-second warm-up"
            body={
              <>
                Same rule as the test, with feedback after every answer. Hold the phone in both hands and tap with your thumbs.
              </>
            }
            action="Start warm-up"
            onAction={() => setPhase({ k: 'warmup' })}
          >
            <RuleStrip />
          </PhaseCard>
        </Center>
      );
      break;
    case 'warmup':
      body = (
        <TimedBlock
          kind="warmup"
          seed={blockSeed(seed, BLOCK.warmup)}
          durationMs={WARMUP_MS}
          countdown={false}
          onTick={warmTick}
          onDone={(_, tally) => setPhase({ k: 'test-card', ...tally })}
        />
      );
      break;
    case 'test-card':
      body = (
        <Center>
          <PhaseCard
            kicker="Scored · 90 seconds"
            title="Now the test"
            body={
              <>
                Right answer +1, wrong answer −1. There is no time limit per item, so keep a steady pace — fast, but
                accurate.
              </>
            }
            action="Start test"
            onAction={() => setPhase({ k: 'test' })}
          >
            <p className="asq-warm-tally">
              Warm-up · <b>{phase.right}</b> right · <b>{phase.wrong}</b> wrong
            </p>
          </PhaseCard>
        </Center>
      );
      break;
    case 'test':
      body = (
        <TimedBlock
          kind="test"
          seed={blockSeed(seed, BLOCK.test)}
          durationMs={TEST_MS}
          countdown
          onTick={testTick}
          onDone={(log) => {
            cb.current.onProgress(1);
            finish(buildOutcome(log, TEST_MS));
          }}
        />
      );
      break;
  }

  return (
    <div className="asq" data-asq-phase={phase.k}>
      {body}
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="asq-center">{children}</div>;
}

/** the rule in one glance: the target's outer arrows → the option's middle arrow */
function RuleStrip() {
  return (
    <div className="asq-rule" role="img" aria-label="Rule: the option's middle arrow must point like the target's outer arrows">
      <span className="asq-rule-cell">
        <ArrowRow dirs={WORKED_EXAMPLE.target} size="demo-option" mark="outer" />
        <span className="asq-rule-cap">target · outer</span>
      </span>
      <span className="asq-rule-eq" aria-hidden>
        =
      </span>
      <span className="asq-rule-cell">
        <ArrowRow dirs={WORKED_EXAMPLE.options[WORKED_EXAMPLE.side]} size="demo-option" mark="centre" />
        <span className="asq-rule-cap">option · middle</span>
      </span>
    </div>
  );
}

/** a score with a true minus sign (−3, not -3) */
const fmtScore = (n: number) => (n < 0 ? `\u2212${-n}` : String(n));

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/* the timed blocks: warm-up (30 s) and scored test (90 s)              */
/* ------------------------------------------------------------------ */

type Stage = 'enter' | 'countdown' | 'run' | 'over';

function TimedBlock({
  kind,
  seed,
  durationMs,
  countdown,
  onTick,
  onDone
}: {
  kind: 'warmup' | 'test';
  seed: number;
  durationMs: number;
  countdown: boolean;
  onTick: (fraction: number) => void;
  onDone: (log: number[][], tally: { right: number; wrong: number }) => void;
}) {
  const stream = useRef<(() => Item) | null>(null);
  if (!stream.current) stream.current = itemStream(seed);
  const [item, setItem] = useState<Item>(() => stream.current!());
  const [seq, setSeq] = useState(0);
  const [stage, setStage] = useState<Stage>(countdown ? 'countdown' : 'enter');
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [remaining, setRemaining] = useState(durationMs);
  const fb = useFeedback();
  const live = useRef<HTMLDivElement>(null);
  const clock = useRef({ onset: -1, start: -1, end: Infinity, over: false, log: [] as number[][], right: 0, wrong: 0 });
  const timers = useRef<number[]>([]);
  const itemRef = useRef(item);
  itemRef.current = item;
  const cbs = useRef({ onTick, onDone });
  cbs.current = { onTick, onDone };

  const clearTimers = () => {
    timers.current.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const endBlock = () => {
    const c = clock.current;
    if (c.over) return;
    c.over = true;
    c.onset = -1;
    live.current?.removeAttribute('data-stim');
    clearTimers();
    setRemaining(0);
    cbs.current.onTick(1);
    setStage('over');
    sfx.place(); // block locked — the results chime is the runner's
    timers.current.push(window.setTimeout(() => cbs.current.onDone(c.log, { right: c.right, wrong: c.wrong }), OVER_MS));
  };
  const endRef = useRef(endBlock);
  endRef.current = endBlock;

  const armClock = () => {
    const c = clock.current;
    timers.current.push(window.setTimeout(() => endRef.current(), Math.max(0, c.end - now()) + STOP_GRACE_MS));
    timers.current.push(
      window.setInterval(() => {
        const left = Math.max(0, c.end - now());
        setRemaining(left);
        cbs.current.onTick(1 - left / durationMs);
      }, TICK_MS)
    );
  };

  // the entry beat before the first warm-up item
  useEffect(() => {
    if (stage !== 'enter') return;
    const id = window.setTimeout(() => setStage('run'), ENTER_MS);
    return () => clearTimeout(id);
  }, [stage]);

  // reveal the committed item on the next frame; the first onset starts the block clock
  useLayoutEffect(() => {
    if (stage !== 'run' || clock.current.over) return;
    return revealOnFrame(
      () => live.current?.setAttribute('data-stim', 'on'),
      (onset) => {
        const c = clock.current;
        if (c.over) return;
        c.onset = onset;
        if (c.start < 0) {
          c.start = onset;
          c.end = onset + durationMs;
          armClock();
        }
      }
    );
  }, [seq, stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const respond = (side: Side, at: number) => {
    const c = clock.current;
    if (c.over || c.onset < 0 || at < c.onset) return; // nothing on screen yet (or a touch from before it appeared)
    if (at >= c.end) {
      endRef.current(); // a touch after time-out is ignored
      return;
    }
    const it = itemRef.current;
    const ok = side === it.side;
    c.log.push(encodeTrial({ type: it.type, dir: it.dir, side: it.side, chosen: side, rt: at - c.onset, onset: c.onset - c.start }));
    if (ok) c.right++;
    else c.wrong++;
    setTally({ right: c.right, wrong: c.wrong });
    if (ok) fb.good(undefined, { step: 0 });
    else fb.bad();
    // hide now; the next item is revealed on the next frame (layout effect above)
    c.onset = -1;
    live.current?.removeAttribute('data-stim');
    if (now() >= c.end) {
      endRef.current();
      return;
    }
    setItem(stream.current!());
    setSeq((q) => q + 1);
  };
  const respondRef = useRef(respond);
  respondRef.current = respond;

  // desktop keys: ← / F = left option, → / J = right option
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const side: Side | -1 = k === 'arrowleft' || k === 'f' ? 0 : k === 'arrowright' || k === 'j' ? 1 : -1;
      if (side < 0) return;
      e.preventDefault();
      const btn = live.current?.querySelector<HTMLElement>(`.asq-opt[data-side="${side}"]`);
      if (btn && clock.current.onset >= 0) flashPress(btn);
      respondRef.current(side as Side, eventTime(e));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const net = tally.right - tally.wrong;
  const running = stage === 'run';
  return (
    <div ref={live} className={`asq-live asq-block asq-${kind}`} data-stage={stage} data-trial={seq}>
      <div className="asq-hud">
        <span className="asq-chip">{kind === 'warmup' ? 'Warm-up' : 'Test'}</span>
        <span className="asq-time" role="timer" aria-label={`${Math.ceil(remaining / 1000)} seconds left`}>
          {fmtClock(remaining)}
        </span>
        <span className="asq-score-box">
          <span className="asq-fb">{fb.layer}</span>
          <span className="asq-score" data-score={net}>
            <span className="asq-score-label">Score</span>
            <b key={seq} className="asq-score-num">
              {fmtScore(net)}
            </b>
          </span>
        </span>
      </div>
      <TimerBar totalMs={durationMs} running={running} label="Time left" />
      <div className="asq-stage">
        <div className="asq-target" role="img" aria-label={`Target: ${describeRow(item.target)}`}>
          <span className="asq-stim">
            <ArrowRow dirs={item.target} size="target" />
          </span>
        </div>
        {kind === 'warmup' && (
          <p className="asq-reminder">
            Tap the option whose <b>middle</b> arrow points like the target’s <b>outer</b> arrows.
          </p>
        )}
        {stage === 'countdown' && (
          <Countdown from={COUNTDOWN_FROM} stepMs={COUNTDOWN_STEP_MS} label="Scored test" onDone={() => setStage('run')} />
        )}
        {stage === 'over' && (
          <div className="asq-over" role="status">
            <div className="asq-over-card fx-card">
              <span className="asq-over-kicker">Time</span>
              <span className="asq-over-score">{fmtScore(net)}</span>
              <span className="asq-over-label">{kind === 'warmup' ? 'Warm-up score' : 'Net score · right − wrong'}</span>
            </div>
          </div>
        )}
      </div>
      <div className="asq-pad fx-card" role="group" aria-label="Options">
        <OptionButton side={0} dirs={item.options[0]} disabled={!running} onPress={respond} />
        <OptionButton side={1} dirs={item.options[1]} disabled={!running} onPress={respond} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* first run: the worked example + one guided item per trial type       */
/* ------------------------------------------------------------------ */

function Tutorial({ seed, onDone }: { seed: number; onDone: (firstTry: number) => void }) {
  const guided = useMemo(() => guidedItems(seed), [seed]);
  const [step, setStep] = useState(0); // 0 = worked example, 1..GUIDED_ITEMS = guided items
  const [picked, setPicked] = useState<Side | -1>(-1); // worked example: the player's pick
  const [missed, setMissed] = useState(false); // guided: this item already had a wrong tap
  const [solved, setSolved] = useState(false); // guided: answered correctly, moving on
  const firstTry = useRef(0);
  const fb = useFeedback();
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const worked = step === 0;
  const item = worked ? WORKED_EXAMPLE : guided[step - 1];
  const d = dirWord(item.dir);
  const revealed = worked ? picked >= 0 : missed || solved;

  const press = (side: Side) => {
    const at = { x: side === 0 ? 25 : 75, y: 34 };
    if (worked) {
      if (picked >= 0) return;
      setPicked(side);
      if (side === item.side) fb.good(at);
      else fb.bad(at);
      return;
    }
    if (solved) return;
    if (side !== item.side) {
      fb.bad(at);
      setMissed(true);
      return;
    }
    fb.good(at);
    setSolved(true);
    if (!missed) firstTry.current++;
    timer.current = window.setTimeout(() => {
      if (step >= GUIDED_ITEMS) {
        onDone(firstTry.current);
        return;
      }
      setStep(step + 1);
      setMissed(false);
      setSolved(false);
    }, GUIDED_NEXT_MS);
  };

  let title: string;
  let prompt: ReactNode;
  if (worked) {
    title = picked < 0 ? 'Which option is right?' : picked === item.side ? 'Correct' : 'Not quite';
    prompt =
      picked < 0 ? (
        <>
          The top row is the target. Find the option whose <b>middle</b> arrow points the same way as the target’s <b>outer</b> arrows.
        </>
      ) : (
        <>
          The target’s outer arrows point <b>{d}</b> — its middle arrow is a decoy. So the answer is the option whose middle arrow points{' '}
          <b>{d}</b>.
        </>
      );
  } else {
    title = solved ? 'Right' : missed ? 'Try again' : 'Your turn';
    prompt = solved ? (
      <>
        Its middle arrow points <b>{d}</b>, like the target’s outer arrows.
      </>
    ) : missed ? (
      <>
        The target’s outer arrows point <b>{d}</b>. Tap the option whose middle arrow points <b>{d}</b>.
      </>
    ) : (
      <>
        Tap the option whose <b>middle</b> arrow points like the target’s <b>outer</b> arrows.
      </>
    );
  }

  const lure = flip(item.side);
  return (
    <div className="asq-tut" data-tut-step={step}>
      <div className="asq-tut-head">
        <span className="asq-kicker">{worked ? 'How it works' : `Practice · ${step} of ${GUIDED_ITEMS}`}</span>
        <h3 className="asq-tut-title" aria-live="polite">
          {title}
        </h3>
        <span className="asq-dots" aria-hidden>
          {Array.from({ length: GUIDED_ITEMS + 1 }, (_, i) => (
            <span key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </span>
      </div>
      <div className="asq-tut-stage">
        <span className="asq-tut-label">Target</span>
        <div className={`asq-target${revealed ? ' marked' : ''}`}>
          <ArrowRow dirs={item.target} size="target" mark={revealed ? 'outer' : undefined} label={`Target: ${describeRow(item.target)}`} />
          {revealed && <TargetTags mark="outer" />}
        </div>
        <p className="asq-tut-prompt" aria-live="polite">
          {prompt}
        </p>
      </div>
      <div className="asq-pad asq-tut-pad fx-card" role="group" aria-label="Options">
        {fb.layer}
        {([0, 1] as Side[]).map((side) => (
          <OptionButton
            key={`${step}-${side}`}
            side={side}
            dirs={item.options[side]}
            mark={revealed ? 'centre' : undefined}
            verdict={worked && revealed ? (side === item.side ? 'right' : 'wrong') : undefined}
            onPress={press}
          />
        ))}
        {worked && revealed && (
          <>
            <p className="asq-verdict right" style={{ gridColumn: item.side + 1, gridRow: 2 }}>
              <CheckIcon size={15} />
              <span>
                Middle arrow points <b>{d}</b> — matches the outer arrows.
              </span>
            </p>
            <p className="asq-verdict wrong" style={{ gridColumn: lure + 1, gridRow: 2 }}>
              <CloseIcon size={15} />
              <span>
                Middle arrow points <b>{dirWord(flip(item.dir))}</b>. It only looks like the target.
              </span>
            </p>
            <button type="button" className="primary-btn asq-next" onClick={() => setStep(1)}>
              Try four on your own
            </button>
          </>
        )}
      </div>
    </div>
  );
}
