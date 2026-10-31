import { Component, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import type { BrainRunOutcome, BrainSession, BrainTestDefinition } from './types';
import type { ClassifiedRun, TestSummary } from './analytics';
import { formatMetric, recordRun, runIndex, stateFlags, summarizeTest } from './analytics';
import { getBrainDomain, IMPLEMENTATION_NOTE } from './domains';
import { loadBrain } from './store';
import { freshSeed, inputKind } from './timing';
import { currentDevice, currentRefContext, measureFrameMs } from './device';
import { notifyBrainChanged, useBrainStore } from './ui/useBrainStore';
import {
  C6_AFTER,
  C6_BEFORE,
  CALIBRATING_RESULT,
  calibratingCopy,
  flagCopy,
  INTERRUPTED_BODY,
  INTERRUPTED_TITLE,
  PRACTICE_MODE_NOTE,
  roleCopy,
  standardisationPrompts,
  stateCopy,
  stateNote,
  stateTone,
  baselineFormingCopy
} from './ui/copy';
import { areaStyle, GradeBadge, ProgressRing, signed, StateFlagChips, StepDots, TestPlate, useCountUp } from './ui/parts';
import { baselineStatus, bestAndLast, usualTime } from './ui/model';
import { Sheet } from './ui/Sheet';
import { sfx } from '../audio';
import { CheckIcon, ClockIcon, CloseIcon, InfoIcon, PauseIcon, PlayIcon, RestartIcon } from '../design/icons';
import { DUR, useReducedMotion } from '../motion';

/**
 * The Brain Lab runner — GameShell's counterpart for MEASUREMENTS. A
 * full-screen layer (App hides the tab bar while it is up) that walks one
 * benchmark through SCIENCE.md C1: intro (demo, instructions, standardisation
 * prompts) → the run (the test's own warm-up, countdown and scored block) →
 * a results card whose layout never varies (Thompson 2024).
 *
 * What it owns, so no benchmark has to:
 *  - a fresh seed per run (C8), the frame interval measured at run start
 *    (C2), the input kind from the first pointer event, the device
 *    fingerprint (C10), the reference context and the theme (C9);
 *  - interruptions (C5): class A (fixed-time blocks) ends as INVALID with
 *    flags ['interrupted'] when the page is hidden or blurred for more than
 *    1 s or the orientation changes — recorded through recordRun, never
 *    silently dropped (C11) — and offers a restart; class B pauses behind a
 *    veil (also on hide/blur) and the test voids the trial in flight;
 *  - the write path: one recordRun per finished 'test' run; practice-mode
 *    runs record nothing;
 *  - leaving mid-run discards the run (nothing recorded), behind a confirm.
 * No confetti: a measurement is not a win. The results animate calmly.
 */

export interface SessionStep {
  id: string;
  label: string;
  state: 'done' | 'current' | 'todo';
}

export interface BrainRunnerProps {
  test: BrainTestDefinition;
  /** the daily check-in this run belongs to */
  checkinId?: string;
  /** inside a check-in: the session strip (check-in ✓, test 1, test 2 …) */
  steps?: SessionStep[];
  /** inside a check-in: the advance action on the results card */
  next?: { label: string; onNext: () => void };
  onClose: () => void;
}

type Stage =
  | { kind: 'intro'; notice?: string }
  | { kind: 'run'; mode: 'test' | 'practice'; seed: number; startedAt: number; firstRun: boolean; key: number }
  | { kind: 'saving' }
  | { kind: 'interrupted'; mode: 'test' | 'practice' }
  | { kind: 'results'; session: BrainSession; summary: TestSummary; outcome: BrainRunOutcome }
  | { kind: 'crashed' };

const FRAME_FALLBACK_MS = 16.7;

/** the frame interval, or a fallback if rAF stalls (hidden page) */
function frameMeasure(): Promise<number> {
  return Promise.race([measureFrameMs(60), new Promise<number>((r) => window.setTimeout(() => r(FRAME_FALLBACK_MS), 4000))]);
}

function themeNow(): string {
  return document.documentElement.dataset.theme ?? 'black';
}

/** a benchmark that throws must not white-screen the app */
class TestBoundary extends Component<{ onCrash: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Brain Lab test crashed', error, info.componentStack);
    this.props.onCrash();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** the check-in's step strip */
export function SessionStrip({ steps }: { steps: SessionStep[] }) {
  const cur = steps.findIndex((s) => s.state === 'current');
  return (
    <nav className="bl-strip" aria-label="Check-in progress">
      <ol>
        {steps.map((s, i) => (
          <li key={s.id} className={`bl-strip-step s-${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
            <span className="bl-strip-dot" aria-hidden>
              {s.state === 'done' ? <CheckIcon size={12} /> : i + 1}
            </span>
            <span className="bl-strip-label">{s.label}</span>
          </li>
        ))}
      </ol>
      <span className="bl-sr">
        Step {cur + 1} of {steps.length}
      </span>
    </nav>
  );
}

export function BrainRunner({ test, checkinId, steps, next, onClose }: BrainRunnerProps) {
  const store = useBrainStore();
  const summary = useMemo(() => summarizeTest(test, store), [test, store]);
  const domain = getBrainDomain(test.domain);
  const [stage, setStage] = useState<Stage>({ kind: 'intro' });
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const doneRef = useRef(false);
  const inputRef = useRef<'touch' | 'mouse' | 'pen' | null>(null);
  const frameRef = useRef<Promise<number>>(Promise.resolve(FRAME_FALLBACK_MS));
  const ctxRef = useRef(currentRefContext(store.settings.birthYear));
  const runKey = useRef(0);
  const headRef = useRef<HTMLHeadingElement>(null);
  const classA = test.interruption === 'A';

  // move focus to each stage's heading (screen readers announce the new screen)
  useEffect(() => {
    if (stage.kind !== 'run') headRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [stage.kind]);

  const start = useCallback(
    (mode: 'test' | 'practice') => {
      const fresh = summarizeTest(test, loadBrain());
      doneRef.current = false;
      inputRef.current = null;
      frameRef.current = frameMeasure();
      ctxRef.current = currentRefContext(loadBrain().settings.birthYear);
      runKey.current++;
      setProgress(0);
      setPaused(false);
      setConfirmLeave(false);
      setStage({ kind: 'run', mode, seed: freshSeed(), startedAt: Date.now(), firstRun: fresh.firstRun, key: runKey.current });
    },
    [test]
  );

  const device = useCallback(async () => {
    const frameMs = await frameRef.current;
    const input =
      inputRef.current ?? (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse');
    return currentDevice(input, frameMs);
  }, []);

  const record = useCallback(
    async (outcome: BrainRunOutcome, run: Extract<Stage, { kind: 'run' }>) => {
      const dev = await device();
      const { session, summary: after } = recordRun({
        test,
        outcome,
        seed: run.seed,
        startedAt: run.startedAt,
        finishedAt: Date.now(),
        device: dev,
        ctx: ctxRef.current,
        theme: themeNow(),
        checkinId
      });
      notifyBrainChanged();
      return { session, after };
    },
    [test, checkinId, device]
  );

  /** the test's onFinish — stable identity, guarded to fire once */
  const onFinish = useCallback(
    (outcome: BrainRunOutcome) => {
      const run = stageRef.current;
      if (run.kind !== 'run' || doneRef.current) return;
      doneRef.current = true;
      if (run.mode === 'practice') {
        sfx.tap();
        setStage({ kind: 'intro', notice: PRACTICE_MODE_NOTE });
        return;
      }
      setStage({ kind: 'saving' });
      record(outcome, run).then(
        ({ session, after }) => {
          sfx.complete();
          setStage({ kind: 'results', session, summary: after, outcome });
        },
        (err) => {
          // storage full or unavailable: say so rather than hang on "Saving…"
          console.error('Brain Lab: could not record the run', err);
          setStage({ kind: 'crashed' });
        }
      );
    },
    [record]
  );

  /** C5 class A: end the run as invalid and offer a restart */
  const interrupt = useCallback(() => {
    const run = stageRef.current;
    if (run.kind !== 'run' || doneRef.current) return;
    doneRef.current = true;
    sfx.error();
    if (run.mode === 'test') {
      // C5/C11: an interrupted fixed-time run is kept, as invalid, with its reason
      record({ metrics: {}, trials: 0, valid: false, flags: ['interrupted'] }, run).catch((err) =>
        console.error('Brain Lab: could not record the interrupted run', err)
      );
    }
    setConfirmLeave(false);
    setStage({ kind: 'interrupted', mode: run.mode });
  }, [record]);

  const onProgress = useCallback((f: number) => {
    if (Number.isFinite(f)) setProgress(Math.max(0, Math.min(1, f)));
  }, []);
  const requestPause = useCallback(
    (p: boolean) => {
      if (!classA) setPaused(p);
    },
    [classA]
  );

  // interruptions while a run is on screen (C5)
  const running = stage.kind === 'run';
  useEffect(() => {
    if (!running) return;
    let awayAt: number | null = null;
    let timer = 0;
    const away = () => {
      if (awayAt !== null) return;
      awayAt = performance.now();
      if (classA) timer = window.setTimeout(interrupt, 1000);
      else setPaused(true);
    };
    const back = () => {
      if (awayAt === null) return;
      const gone = performance.now() - awayAt;
      awayAt = null;
      window.clearTimeout(timer);
      if (classA && gone > 1000) interrupt();
    };
    const onVis = () => (document.hidden ? away() : back());
    const portrait = typeof matchMedia !== 'undefined' ? matchMedia('(orientation: portrait)') : null;
    const onRotate = () => {
      if (classA) interrupt();
      else setPaused(true);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', away);
    window.addEventListener('focus', back);
    portrait?.addEventListener?.('change', onRotate);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', away);
      window.removeEventListener('focus', back);
      portrait?.removeEventListener?.('change', onRotate);
    };
  }, [running, classA, interrupt]);

  // Escape: leave from any screen; mid-run it asks first (class B also pauses)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.bl-sheet-backdrop')) return;
      if (stageRef.current.kind === 'run') {
        if (!classA) setPaused(true);
        setConfirmLeave(true);
      } else if (stageRef.current.kind !== 'saving') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [classA, onClose]);

  const askLeave = () => {
    sfx.tap();
    if (stage.kind !== 'run') return onClose();
    if (!classA) setPaused(true);
    setConfirmLeave(true);
  };

  const style = areaStyle(test.domain);

  /* ---------- the run ---------- */
  if (stage.kind === 'run') {
    const Test = test.component;
    return (
      <div
        className={`bl-layer bl-run-layer${classA ? ' class-a' : ' class-b'}`}
        style={style}
        onPointerDownCapture={(e) => {
          if (!inputRef.current) inputRef.current = inputKind(e);
        }}
      >
        <header className="bl-run-head">
          <button type="button" className="icon-btn" onClick={askLeave} aria-label="Leave this run">
            <CloseIcon />
          </button>
          <div className="bl-run-title">
            <span className="bl-run-name">
              {test.name}
              {stage.mode === 'practice' && <span className="bl-run-tag">Practice</span>}
            </span>
            {test.ownTimerBar ? (
              // the test shows its own countdown; keep the slot so the header never shifts
              <span className="bl-run-bar is-off" aria-hidden />
            ) : (
              <span className="bl-run-bar" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <span style={{ transform: `scaleX(${progress})` }} />
              </span>
            )}
          </div>
          {classA ? (
            <span className="header-spacer" aria-hidden />
          ) : (
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                sfx.tap();
                setPaused(true);
              }}
              aria-label="Pause"
              disabled={paused}
            >
              <PauseIcon />
            </button>
          )}
        </header>
        <main className="bl-run-stage">
          <TestBoundary
            key={stage.key}
            onCrash={() => {
              doneRef.current = true;
              setStage({ kind: 'crashed' });
            }}
          >
            <Test
              mode={stage.mode}
              firstRun={stage.firstRun}
              seed={stage.seed}
              paused={paused}
              ctx={ctxRef.current}
              onProgress={onProgress}
              onFinish={onFinish}
              requestPause={requestPause}
            />
          </TestBoundary>
          {paused && !classA && (
            <div className="bl-pause-veil" role="dialog" aria-modal="true" aria-labelledby="bl-paused-title">
              <div className="bl-pause-card fx-card">
                <span className="bl-pause-icon" aria-hidden>
                  <PauseIcon />
                </span>
                <h2 id="bl-paused-title" className="bl-pause-title">
                  Paused
                </h2>
                <p className="bl-note">The trial in progress is replaced when you resume, so nothing you saw counts twice.</p>
                <button
                  type="button"
                  className="primary-btn"
                  data-autofocus
                  autoFocus
                  onClick={() => {
                    sfx.tap();
                    setConfirmLeave(false);
                    setPaused(false);
                  }}
                >
                  <span className="bl-btn-in">
                    <PlayIcon /> Resume
                  </span>
                </button>
                <button type="button" className="ghost-btn bl-wide" onClick={() => setConfirmLeave(true)}>
                  End run
                </button>
              </div>
            </div>
          )}
        </main>
        <Sheet
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          variant="dialog"
          title="Leave this run?"
          footer={
            <>
              <button type="button" className="ghost-btn" data-autofocus onClick={() => setConfirmLeave(false)}>
                Keep going
              </button>
              <button
                type="button"
                className="primary-btn bl-auto"
                onClick={() => {
                  doneRef.current = true;
                  setConfirmLeave(false);
                  onClose();
                }}
              >
                Leave
              </button>
            </>
          }
        >
          <p className="bl-note">
            {classA
              ? 'Leaving discards this run — nothing is recorded. The timed block keeps running while this is open.'
              : 'Leaving discards this run — nothing is recorded.'}
          </p>
        </Sheet>
      </div>
    );
  }

  /* ---------- every other screen shares the top bar ---------- */
  const top = (
    <header className="bl-layer-head">
      <button type="button" className="icon-btn" onClick={askLeave} aria-label={checkinId ? 'Close — the check-in can be resumed later' : 'Close'}>
        <CloseIcon />
      </button>
      <span className="bl-area-chip" style={style}>
        <span className="bl-area-dot" aria-hidden />
        {domain?.name ?? test.domain}
      </span>
      <span className="header-spacer" aria-hidden />
    </header>
  );

  if (stage.kind === 'saving') {
    return (
      <div className="bl-layer" style={style}>
        {top}
        <div className="bl-saving" role="status">
          <ProgressRing value={1} size={64} color="var(--area)" />
          <span>Saving your run…</span>
        </div>
      </div>
    );
  }

  if (stage.kind === 'crashed') {
    return (
      <div className="bl-layer" style={style}>
        {top}
        <section className="bl-center-card fx-card">
          <h1 ref={headRef} tabIndex={-1} className="bl-h1">
            Something went wrong
          </h1>
          <p className="bl-note">This run could not be completed or saved, so nothing was recorded. Try again — if it keeps happening, the test needs a fix.</p>
          <button type="button" className="primary-btn" onClick={() => start('test')}>
            Try again
          </button>
          <button type="button" className="ghost-btn bl-wide" onClick={onClose}>
            Close
          </button>
        </section>
      </div>
    );
  }

  if (stage.kind === 'interrupted') {
    return (
      <div className="bl-layer" style={style}>
        {top}
        {steps && <SessionStrip steps={steps} />}
        <section className="bl-center-card fx-card bl-interrupted">
          <span className="bl-interrupted-icon" aria-hidden>
            <ClockIcon size={28} />
          </span>
          <h1 ref={headRef} tabIndex={-1} className="bl-h1">
            {INTERRUPTED_TITLE}
          </h1>
          <p className="bl-note">
            {stage.mode === 'test' ? INTERRUPTED_BODY : 'Fixed-time tests can’t be paused. This was a practice run, so nothing was recorded.'}
          </p>
          <button type="button" className="primary-btn" onClick={() => start(stage.mode)}>
            <span className="bl-btn-in">
              <RestartIcon /> Restart
            </span>
          </button>
          {next && stage.mode === 'test' && (
            <button type="button" className="ghost-btn bl-wide" onClick={next.onNext}>
              {next.label === 'See summary' ? 'Skip to the summary' : 'Skip to the next test'}
            </button>
          )}
          <button type="button" className="ghost-btn bl-wide" onClick={onClose}>
            {checkinId ? 'Later' : 'Done'}
          </button>
        </section>
      </div>
    );
  }

  if (stage.kind === 'results') {
    return (
      <div className="bl-layer" style={style}>
        {top}
        {steps && <SessionStrip steps={steps} />}
        <RunResults
          test={test}
          session={stage.session}
          summary={stage.summary}
          outcome={stage.outcome}
          headRef={headRef}
          inCheckin={!!checkinId}
          next={next}
          onAgain={() => start('test')}
          onClose={onClose}
        />
      </div>
    );
  }

  /* ---------- intro ---------- */
  const Demo = test.Demo;
  const bl = bestAndLast(summary);
  const status = baselineStatus(summary, test);
  const primary = test.metrics.find((m) => m.id === test.primaryMetric);
  const minutes = Math.max(1, Math.round(test.durationSec / 60));
  const prompts = standardisationPrompts({ usualTime: usualTime(summary), reaction: test.domain === 'reaction' });
  return (
    <div className="bl-layer bl-intro" style={style}>
      {top}
      {steps && <SessionStrip steps={steps} />}
      <section className="bl-intro-hero">
        <TestPlate test={test} domain={test.domain} size={76} />
        <div>
          <h1 ref={headRef} tabIndex={-1} className="bl-intro-name">
            {test.name}
          </h1>
          <p className="bl-intro-paradigm">{test.paradigm}</p>
        </div>
      </section>

      {stage.notice && (
        <p className="bl-banner good" role="status">
          <CheckIcon size={16} /> {stage.notice}
        </p>
      )}
      {summary.firstRun && (
        <p className="bl-banner">
          <InfoIcon size={16} /> Your first run starts with a short guided practice, so you learn the test before anything is scored.
        </p>
      )}
      {summary.scoredToday && (
        <p className="bl-banner">
          <InfoIcon size={16} /> {C6_BEFORE}
        </p>
      )}

      <div className="bl-demo-wrap">
        <Demo />
      </div>

      <section className="bl-block">
        <h2 className="bl-h3">How it works</h2>
        <ol className="bl-howto">
          {test.instructions.map((line, i) => (
            <li key={i} style={{ ['--i' as string]: i } as CSSProperties}>
              <span className="bl-howto-num" aria-hidden>
                {i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <div className="bl-chips">
          <span className="bl-chip strong">
            <ClockIcon size={14} /> ≈ {minutes} min
          </span>
          {test.skills.map((s) => (
            <span key={s} className="bl-chip">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="bl-info-grid" aria-label="Your record on this test">
        <div className="bl-info">
          <span className="bl-info-label">Personal best</span>
          <span className="bl-info-value">{bl.best === null ? '—' : formatMetric(primary, bl.best)}</span>
        </div>
        <div className="bl-info">
          <span className="bl-info-label">Last run</span>
          <span className="bl-info-value">{bl.last === null ? '—' : formatMetric(primary, bl.last)}</span>
        </div>
        <div className="bl-info">
          <span className="bl-info-label">Runs so far</span>
          <span className="bl-info-value">{bl.runs}</span>
        </div>
        <div className="bl-info">
          <span className="bl-info-label">Baseline</span>
          <span className="bl-info-value small">{status.label}</span>
          {status.phase !== 'none' && status.phase !== 'set' && <StepDots done={status.done} total={status.total} color="var(--area)" />}
        </div>
      </section>

      <section className="bl-block">
        <h2 className="bl-h3">Before you start</h2>
        <ul className="bl-checklist">
          {prompts.map((p) => (
            <li key={p}>
              <CheckIcon size={14} />
              <span>{p}</span>
            </li>
          ))}
          {test.interruption === 'A' ? (
            <li>
              <CheckIcon size={14} />
              <span>This is a fixed-time test: leaving the app or rotating the screen ends the run.</span>
            </li>
          ) : (
            <li>
              <CheckIcon size={14} />
              <span>You can pause between trials; the trial in progress is replaced.</span>
            </li>
          )}
        </ul>
      </section>

      <footer className="bl-footnote">
        <GradeBadge grade={summary.grade} anchor={test.reference?.anchor} interactive />
        <p>{IMPLEMENTATION_NOTE}</p>
      </footer>

      <div className="bl-actions sticky">
        <button
          type="button"
          className="ghost-btn"
          onPointerDown={(e) => (inputRef.current = inputKind(e))}
          onClick={() => {
            sfx.tap();
            start('practice');
          }}
        >
          Practice
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            sfx.tap();
            start('test');
          }}
        >
          {summary.scoredToday ? 'Start (practice run)' : 'Start'}
        </button>
      </div>
    </div>
  );
}

/* ---------- results ---------- */

function RunResults({
  test,
  session,
  summary,
  outcome,
  headRef,
  inCheckin,
  next,
  onAgain,
  onClose
}: {
  test: BrainTestDefinition;
  session: BrainSession;
  summary: TestSummary;
  outcome: BrainRunOutcome;
  headRef: React.RefObject<HTMLHeadingElement>;
  inCheckin: boolean;
  next?: { label: string; onNext: () => void };
  onAgain: () => void;
  onClose: () => void;
}) {
  const store = useBrainStore();
  const reduce = useReducedMotion();
  const run: ClassifiedRun | undefined = summary.runs.find((r) => r.s.id === session.id);
  const role = run?.role ?? session.runType;
  const valid = role !== 'invalid';
  const idx = run && valid ? runIndex(summary, run) : null;
  const personal = summary.grade === 'P';
  const primary = test.metrics.find((m) => m.id === test.primaryMetric);
  const pv = session.metrics[test.primaryMetric];
  const shown = useCountUp(idx, { duration: 1100 });
  const status = baselineStatus(summary, test);

  // the previous valid run (any role but invalid), for "vs last run"
  const prev = useMemo(() => {
    const i = summary.runs.findIndex((r) => r.s.id === session.id);
    for (let k = i - 1; k >= 0; k--) if (summary.runs[k].role !== 'invalid' && Number.isFinite(summary.runs[k].x)) return summary.runs[k];
    return null;
  }, [summary, session.id]);
  const dec = primary?.decimals ?? 0;
  const rawDelta = prev && Number.isFinite(pv) && prev.segment === run?.segment ? pv - prev.x : null;
  const delta = rawDelta === null ? null : Number(rawDelta.toFixed(dec));

  // today vs typical — only for today's scored run, once a baseline exists
  const isTodayScored = (role === 'baseline' || role === 'tracking') && summary.today !== null;
  const ci = session.checkinId ? store.checkins.find((c) => c.id === session.checkinId) : undefined;
  const flags = ci ? stateFlags(store, ci) : [];

  const showNumber = valid && idx !== null;
  const indexName = personal ? 'Personal index' : 'Reference index';
  let caption: string;
  let pill: string | null = null;
  let line: string | undefined;
  if (!valid) {
    caption = 'Not scored';
  } else if (role === 'practice') {
    caption = showNumber ? indexName : 'Practice run';
    pill = roleCopy('practice');
    line = C6_AFTER;
  } else if (role === 'run-in') {
    caption = `Calibrating ${Math.min(summary.runInDone, test.runIn)}/${test.runIn}`;
    line = summary.runInComplete ? calibratingCopy(summary.runInDone, test.runIn) : CALIBRATING_RESULT;
  } else if (role === 'baseline' && !summary.baseline) {
    caption = showNumber ? indexName : `Baseline run ${summary.baselineProgress}/5`;
    pill = showNumber ? `Baseline run ${summary.baselineProgress}/5` : null;
  } else if (role === 'baseline') {
    caption = indexName;
    pill = 'Baseline set';
    line = 'Your baseline is now frozen. From your next scored run on, each day is compared with your typical range.';
  } else {
    caption = indexName;
    pill = 'Scored';
  }
  // a run that opens a new series (another device or input, a new protocol, a reset)
  const newSeries = !!(run && prev && prev.segment !== run.segment);

  const ringValue = showNumber ? Math.max(0.04, Math.min(1, (idx as number) / 100)) : valid ? 1 : 0;
  const others = test.metrics.filter((m) => m.id !== test.primaryMetric && Number.isFinite(session.metrics[m.id]));
  // one row per label: a highlight named like a metric fills that metric's row (keeping its
  // description) instead of repeating it — highlights are EXTRA lines (types.ts)
  const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const highlightFor = (label: string) => outcome.highlights?.find((h) => sameLabel(h.label, label));
  const extraHighlights = (outcome.highlights ?? []).filter((h) => !others.some((m) => sameLabel(m.label, h.label)));

  return (
    <div className={`bl-results${valid ? '' : ' invalid'}`}>
      <section className="bl-results-hero" aria-live="polite">
        <div className={`bl-results-ring${reduce ? '' : ' animate'}`}>
          <ProgressRing value={ringValue} size={168} stroke={10} color={valid ? 'var(--area)' : 'var(--text-dim)'}>
            {showNumber ? (
              <span className="bl-results-index">{Math.round(shown ?? 0)}</span>
            ) : valid ? (
              <span className="bl-results-done" aria-hidden>
                <CheckIcon size={44} />
              </span>
            ) : (
              <span className="bl-results-index dim">—</span>
            )}
          </ProgressRing>
          {!reduce && valid && <span className="bl-results-pulse" aria-hidden style={{ animationDelay: `${DUR.emphasis}ms` }} />}
        </div>
        <h1 ref={headRef} tabIndex={-1} className="bl-results-caption">
          {caption}
        </h1>
        {(pill || showNumber) && (
          <span className="bl-results-badges">
            {/* every reference index wears its grade (SCIENCE.md §4) — a calibration run's too */}
            {showNumber && <GradeBadge grade={summary.grade} anchor={test.reference?.anchor} interactive personal={personal} />}
            {pill && <span className="bl-pill">{pill}</span>}
          </span>
        )}
        {showNumber && role === 'run-in' && <span className="bl-sub">Session index — calibration runs never count toward your level</span>}
        {line && <p className="bl-results-line">{line}</p>}
        {newSeries && valid && (
          <p className="bl-banner">
            <InfoIcon size={16} /> This run starts a new series — a different device or input, a new test version or a baseline reset means a fresh
            baseline. Earlier runs stay in your history.
          </p>
        )}
        {isTodayScored && summary.today && (
          <div className={`bl-today-line t-${stateTone(summary.today.label)}`}>
            <strong>{stateCopy(summary.today.label)}</strong>
            {stateNote(summary.today.label) && <span>{stateNote(summary.today.label)}</span>}
            {flags.length > 0 && (
              <span className="bl-today-ctx">
                Today’s check-in: <StateFlagChips flags={flags} />
              </span>
            )}
          </div>
        )}
      </section>

      {valid && (
        <section className="bl-metric-card fx-card">
          <span className="bl-metric-label">{primary?.label ?? 'Score'}</span>
          <span className="bl-metric-big">{formatMetric(primary, pv)}</span>
          {primary?.about && <span className="bl-note">{primary.about}</span>}
          {delta !== null && prev && (
            <span className={`bl-delta${delta > 0 ? ' up' : delta < 0 ? ' down' : ''}`}>
              <span aria-hidden>{delta > 0 ? '▲' : delta < 0 ? '▼' : '='}</span> {delta === 0 ? 'Same as' : signed(delta, dec)}
              {delta === 0 ? '' : primary?.unit ? (primary.unit === '%' ? ' pts' : ` ${primary.unit}`) : ''}
              {delta === 0 ? ' your last run' : ' vs your last run'}
              {prev.role === 'run-in' || role === 'run-in' ? ' · early runs usually rise with practice' : ''}
            </span>
          )}
        </section>
      )}

      {valid && (others.length > 0 || extraHighlights.length > 0) && (
        <section className="bl-metric-list fx-card">
          {others.map((m) => (
            <div key={m.id} className="bl-metric-row">
              <span className="bl-metric-row-label">
                {m.label}
                {m.about && <small>{m.about}</small>}
              </span>
              <span className="bl-metric-row-value">{highlightFor(m.label)?.value ?? formatMetric(m, session.metrics[m.id])}</span>
            </div>
          ))}
          {extraHighlights.map((h) => (
            <div key={h.label} className="bl-metric-row hl">
              <span className="bl-metric-row-label">{h.label}</span>
              <span className="bl-metric-row-value">{h.value}</span>
            </div>
          ))}
        </section>
      )}

      {(session.flags?.length ?? 0) > 0 && (
        <section className={`bl-flag-card fx-card${valid ? '' : ' strong'}`}>
          <h2 className="bl-h3">{valid ? 'Notes on this run' : 'Why this run wasn’t scored'}</h2>
          <ul>
            {session.flags!.map((f) => (
              <li key={f}>{flagCopy(f)}</li>
            ))}
          </ul>
          {!valid && <p className="bl-note">It is kept in your history with this reason and excluded from every level, baseline and verdict.</p>}
        </section>
      )}

      {valid && (
        <section className="bl-progress-card fx-card">
          <div className="bl-progress-head">
            <span className="bl-h3">Your baseline</span>
            <span className="bl-progress-label">{status.label}</span>
          </div>
          {status.phase === 'set' && summary.baseline ? (
            <p className="bl-note">
              Frozen at {formatMetric(primary, summary.baseline.value)}. Day-to-day variation is about ±{formatMetric(primary, summary.baseline.sigma)}.
              {summary.today && ` Typical range lately: ${formatMetric(primary, summary.today.typical - summary.today.sigma)} – ${formatMetric(primary, summary.today.typical + summary.today.sigma)}.`}
            </p>
          ) : (
            <>
              <StepDots done={status.done} total={status.total} color="var(--area)" label={status.label} />
              <p className="bl-note">
                {status.phase === 'calibrating' ? calibratingCopy(summary.runInDone, test.runIn) : baselineFormingCopy(summary.baselineProgress)}
              </p>
            </>
          )}
        </section>
      )}

      <div className="bl-actions sticky">
        {next && valid ? (
          <>
            <button type="button" className="ghost-btn" onClick={onClose}>
              Later
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                sfx.tap();
                next.onNext();
              }}
            >
              {next.label}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                sfx.tap();
                onAgain();
              }}
            >
              {valid ? (summary.scoredToday ? 'Run again (practice)' : 'Run again') : 'Try again'}
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                sfx.tap();
                if (next && !valid) next.onNext();
                else onClose();
              }}
            >
              {next && !valid ? next.label : inCheckin ? 'Done' : 'Done'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
