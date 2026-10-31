import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { eventTime, inputKind, revealOnFrame } from '../../platform/brain/timing';
import { PhaseCard } from '../../platform/components/fx';
import { sfx } from '../../platform/audio';
import { useReducedMotion } from '../../platform/motion';
import { TargetRingDemo } from './TargetRingDemo';
import {
  CONDITIONS,
  DEFAULT_PX_PER_MM,
  DOT_MM,
  MAX_EXTENT_MM,
  N_TARGETS,
  PRACTICE_CONDS,
  SEQUENCE,
  START_SLOP_MM,
  WARMUP_COND,
  boardScale,
  dist,
  targetAngle,
  targetCentre,
  type ConditionId,
  type Point
} from './logic/geometry';
import { blockDone, blockProgress, completeSequence, currentItem, startBlock, voidSequence, type BlockState } from './logic/block';
import { SLOTS } from './logic/plan';
import { MAX_VOIDS, buildTrialLog, scoreSession, sequenceSummary, type Tap } from './logic/scoring';

/**
 * Target Ring — the Precision benchmark (SCIENCE.md §1.9): the ISO 9241-411
 * multidirectional tapping task on a 13-target ring, scored by effective
 * throughput. Flow (C1, Appendix C.7):
 *   first run / practice mode → 3-step animated tutorial + 2 practice rings
 *   every 'test' run          → 1 warm-up ring (D 40, W 12, not scored)
 *                             → 12 scored rings (4 conditions × 3 rounds)
 * There is no countdown: every ring starts on the player's own tap on the lit
 * target 0, after a 1.2 s card that brings the new ring in.
 *
 * Timing (C2): a target lights by an opacity write inside a rAF callback
 * (revealOnFrame) — never a CSS transition; selections are read on
 * pointerdown with the event's own timestamp, and movement time is the
 * interval between two touches, so constant touch latency cancels.
 * Feedback (C3): exactly what the paradigm prescribes — a 120 ms scale pulse
 * of the hit target + a soft tick, or a 150 ms ring at the touch point in the
 * bad colour + a soft thud. No score during the run.
 * Interruptions (C5, class B): a pause while a ring is in flight voids it and
 * appends a replacement; more than 2 voids end the run as invalid.
 */

const BETWEEN_MS = 1200;
const HIT_PULSE_MS = 120;
const MISS_RING_MS = 150;
const MISS_RING_MM = 4.5;
const AFTER_LAST_MS = 320;
const FINISH_MS = 760;
const MAX_SIDE = 560;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

type SeqKind = 'practice' | 'warmup' | 'scored';
type Sub = 'idle' | 'between' | 'start' | 'run' | 'done' | 'paused';

type Phase =
  | { name: 'tutorial'; step: number }
  | { name: 'play' }
  | { name: 'practice-done'; idx: number; hits: number; total: number; mtMs: number }
  | { name: 'warmup-intro' }
  | { name: 'block-intro'; warmMisses: number }
  | { name: 'finishing' };

interface SeqView {
  kind: SeqKind;
  cond: ConditionId;
  kicker: string;
  notice: string;
  /** bumps for every presented ring — restarts the ring-in motion and the card's fill bar */
  no: number;
}

interface Run {
  kind: SeqKind;
  cond: ConditionId;
  kicker: string;
  practiceIdx: number;
  sub: Sub;
  /** the next selection index (1–13) */
  k: number;
  start: Tap | null;
  taps: Tap[];
  /** board side and scale when the ring armed (a change mid-ring is an interruption) */
  side: number;
  scale: number;
  /** after a pause: present the next queue item (voided) or the same ring again */
  resume: 'next' | 'same';
}

const TUTORIAL = [
  { title: 'Tap the lit circle' },
  { title: 'Follow the light' },
  { title: 'Every tap counts' }
];

export function TargetRingTest({ mode, firstRun, seed, paused, onProgress, onFinish, requestPause }: BrainTestProps) {
  const reduce = useReducedMotion();
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;
  const cb = useRef({ onProgress, onFinish, requestPause });
  cb.current = { onProgress, onFinish, requestPause };

  const [phase, setPhaseState] = useState<Phase>(() =>
    mode === 'practice' || firstRun ? { name: 'tutorial', step: 0 } : { name: 'warmup-intro' }
  );
  const phaseRef = useRef<Phase['name']>(phase.name);
  const setPhase = (p: Phase) => {
    phaseRef.current = p.name;
    setPhaseState(p);
  };

  const [view, setView] = useState<SeqView>({ kind: 'warmup', cond: WARMUP_COND, kicker: '', notice: '', no: 0 });
  const [sub, setSubState] = useState<Sub>('idle');
  const run = useRef<Run>({
    kind: 'warmup',
    cond: WARMUP_COND,
    kicker: '',
    practiceIdx: 0,
    sub: 'idle',
    k: 0,
    start: null,
    taps: [],
    side: 0,
    scale: 1,
    resume: 'same'
  });
  const setSub = (s: Sub) => {
    run.current.sub = s;
    setSubState(s);
  };

  const block = useRef<BlockState | null>(null);
  const minScale = useRef(Infinity);
  const pointerKind = useRef<'touch' | 'mouse' | 'pen' | null>(null);
  const pausedRef = useRef(paused);
  const finished = useRef(false);
  const prog = useRef(0);
  const notice = useRef('');
  const timers = useRef<{ between?: number; phase?: number; finish?: number }>({});

  /* ---------- board geometry ---------- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);
  const sideRef = useRef(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const s = Math.floor(Math.min(r.width, r.height, MAX_SIDE));
      if (s > 0 && s !== sideRef.current) {
        sideRef.current = s;
        setSide(s);
      }
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const pxPerMm = DEFAULT_PX_PER_MM;
  const sRaw = boardScale(side, pxPerMm);
  const scale = Number.isFinite(sRaw) ? sRaw : 1;
  const ppmm = pxPerMm * scale; // CSS px per protocol mm
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const ppmmRef = useRef(ppmm);
  ppmmRef.current = ppmm;

  const toPx = (p: Point) => ({ x: sideRef.current / 2 + p.x * ppmmRef.current, y: sideRef.current / 2 + p.y * ppmmRef.current });
  const toMm = (clientX: number, clientY: number): Point => {
    const r = boardRef.current!.getBoundingClientRect();
    return { x: (clientX - (r.left + r.width / 2)) / ppmmRef.current, y: (clientY - (r.top + r.height / 2)) / ppmmRef.current };
  };

  /* ---------- the lit target: opacity writes inside rAF (C2) ---------- */
  const targetEls = useRef<(HTMLSpanElement | null)[]>([]);
  const active = useRef<number | null>(null);
  const cancelReveal = useRef<() => void>(() => {});
  const show = (j: number | null) => {
    const prev = active.current;
    if (prev !== null) {
      const el = targetEls.current[prev];
      if (el) {
        el.style.opacity = '0';
        delete el.dataset.on;
      }
    }
    if (j !== null) {
      const el = targetEls.current[j];
      if (el) {
        el.style.opacity = '1';
        el.dataset.on = '1';
      }
    }
    active.current = j;
  };
  const reveal = (j: number | null) => {
    cancelReveal.current();
    cancelReveal.current = revealOnFrame(
      () => show(j),
      () => {}
    );
  };
  const hideNow = () => {
    cancelReveal.current();
    show(null);
  };

  /* ---------- feedback (C3: exactly the paradigm's) ---------- */
  const pulseEls = useRef<(HTMLSpanElement | null)[]>([]);
  const missEls = useRef<(HTMLSpanElement | null)[]>([]);
  const fxNext = useRef(0);
  const place = (el: HTMLSpanElement, p: Point, mm: number) => {
    const px = toPx(p);
    el.style.left = `${px.x}px`;
    el.style.top = `${px.y}px`;
    el.style.width = el.style.height = `${mm * ppmmRef.current}px`;
    el.getAnimations?.().forEach((a) => a.cancel());
  };
  const pulseAt = (j: number) => {
    const el = pulseEls.current[fxNext.current++ % 2];
    if (!el) return;
    const { D, W } = CONDITIONS[run.current.cond];
    place(el, targetCentre(j, D), W);
    el.animate?.(
      reduceRef.current
        ? [{ opacity: 0.7 }, { opacity: 0 }]
        : [
            { opacity: 0.7, transform: 'translate(-50%, -50%) scale(1)' },
            { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5)' }
          ],
      { duration: HIT_PULSE_MS, easing: EASE_OUT }
    );
  };
  const ringAt = (p: Point, kind: 'miss' | 'stray') => {
    const el = missEls.current[fxNext.current++ % 2];
    if (!el) return;
    place(el, p, MISS_RING_MM);
    el.dataset.kind = kind;
    el.animate?.(
      reduceRef.current
        ? [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }]
        : [
            { opacity: 1, transform: 'translate(-50%, -50%) scale(0.55)' },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(0.92)', offset: 0.6 },
            { opacity: 0, transform: 'translate(-50%, -50%) scale(1.05)' }
          ],
      { duration: MISS_RING_MS, easing: EASE_OUT }
    );
  };

  /* ---------- the bottom card's tap meter (imperative: off React's hot path) ---------- */
  const setMeter = (k: number) => {
    const segs = meterRef.current?.children;
    if (!segs) return;
    for (let i = 0; i < segs.length; i++) {
      const el = segs[i] as HTMLElement;
      if (i < k) el.dataset.on = '1';
      else delete el.dataset.on;
    }
  };

  const progress = (f: number) => {
    if (f > prog.current) {
      prog.current = f;
      cb.current.onProgress(f);
    }
  };
  const finish = (o: BrainRunOutcome) => {
    if (finished.current) return;
    finished.current = true;
    cb.current.onFinish(o);
  };

  /* ---------- presenting a ring ---------- */
  const present = (kind: SeqKind, cond: ConditionId, kicker: string, practiceIdx = 0) => {
    window.clearTimeout(timers.current.between);
    hideNow();
    setMeter(0);
    run.current = {
      kind,
      cond,
      kicker,
      practiceIdx,
      sub: 'between',
      k: 0,
      start: null,
      taps: [],
      side: sideRef.current,
      scale: scaleRef.current,
      resume: 'same'
    };
    const note = notice.current;
    notice.current = '';
    setView((v) => ({ kind, cond, kicker, notice: note, no: v.no + 1 }));
    setSubState('between');
    if (phaseRef.current !== 'play') setPhase({ name: 'play' });
    timers.current.between = window.setTimeout(arm, BETWEEN_MS);
  };

  /** the 1.2 s card is over: light target 0 and wait for the player's start tap */
  const arm = () => {
    const R = run.current;
    if (pausedRef.current || R.sub !== 'between') return;
    R.side = sideRef.current;
    R.scale = scaleRef.current;
    setSub('start');
    reveal(SEQUENCE[0]);
  };

  const presentScored = () => {
    const blk = block.current;
    const item = blk && currentItem(blk);
    if (!blk || !item) return;
    const kicker =
      blk.pos < SLOTS ? `Ring ${blk.pos + 1} of ${SLOTS}` : `Extra ring · ${item.origin === 'rerun' ? 'a repeat' : 'replaces an interrupted one'}`;
    present('scored', item.cond, kicker);
  };

  const finishScored = () => {
    window.clearTimeout(timers.current.between);
    hideNow();
    const blk = block.current!;
    const sc = scoreSession({
      records: blk.records,
      interruptions: blk.interruptions,
      pxPerMm,
      scale: Number.isFinite(minScale.current) ? minScale.current : scaleRef.current,
      input: pointerKind.current ?? 'touch'
    });
    const highlights: { label: string; value: string }[] = [];
    if (sc.counted) highlights.push({ label: 'On target', value: `${sc.hits} of ${sc.counted} taps` });
    if (sc.fit) highlights.push({ label: 'Fitts fit', value: `${Math.round(sc.fit.intercept)} ms + ${Math.round(sc.fit.slope)} ms/bit` });
    highlights.push({ label: 'Rings scored', value: `${sc.validSlots} of ${SLOTS}` });
    const outcome: BrainRunOutcome = {
      metrics: sc.metrics,
      trials: sc.counted,
      valid: sc.valid,
      ...(sc.flags.length ? { flags: sc.flags } : {}),
      highlights,
      trialLog: buildTrialLog(blk.records)
    };
    progress(1);
    run.current.sub = 'idle';
    if (blk.interruptions > MAX_VOIDS) {
      // over the interruption limit: the run ends here, invalid — no celebration
      setSubState('idle');
      finish(outcome);
      return;
    }
    setSubState('idle');
    setPhase({ name: 'finishing' });
    sfx.place(); // block locked — the results chime is the runner's
    timers.current.finish = window.setTimeout(() => finish(outcome), FINISH_MS);
  };

  const completeRing = () => {
    const R = run.current;
    setSub('done');
    cancelReveal.current();
    cancelReveal.current = revealOnFrame(
      () => show(null),
      () => {}
    );
    if (R.kind === 'scored') {
      const blk = completeSequence(block.current!, R.start!, R.taps);
      block.current = blk;
      minScale.current = Math.min(minScale.current, R.scale);
      progress(blockProgress(blk));
      if (blockDone(blk)) finishScored();
      else presentScored();
      return;
    }
    const sum = sequenceSummary({ cond: R.cond, start: R.start!, taps: R.taps });
    const kind = R.kind;
    const idx = R.practiceIdx;
    // not cleared by a pause: the ring is already complete
    timers.current.phase = window.setTimeout(() => {
      run.current.sub = 'idle';
      setSubState('idle');
      if (kind === 'practice') setPhase({ name: 'practice-done', idx, ...sum });
      else setPhase({ name: 'block-intro', warmMisses: sum.total - sum.hits });
    }, AFTER_LAST_MS);
  };

  /* ---------- input: pointerdown on the board area ---------- */
  const onDown = useRef<(e: PointerEvent) => void>(() => {});
  onDown.current = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (phaseRef.current !== 'play') return;
    e.preventDefault();
    const R = run.current;
    if (pausedRef.current || (R.sub !== 'start' && R.sub !== 'run')) return;
    const kind = inputKind(e);
    if (pointerKind.current === null) pointerKind.current = kind;
    else if (pointerKind.current !== kind) return; // SCIENCE.md §1.9 "Input": one modality per session
    const t = eventTime(e);
    const p = toMm(e.clientX, e.clientY);
    const { D, W } = CONDITIONS[R.cond];

    if (R.sub === 'start') {
      // the start tap must land on target 0 — it defines where the first movement begins [DC]
      if (dist(p, targetCentre(SEQUENCE[0], D)) > W / 2 + START_SLOP_MM) {
        ringAt(p, 'stray');
        return;
      }
      R.start = { x: p.x, y: p.y, t };
      R.taps = [];
      R.k = 1;
      pulseAt(SEQUENCE[0]);
      sfx.tick();
      reveal(SEQUENCE[1]);
      setSub('run');
      return;
    }

    // every touch is a selection and advances the highlight, hit or miss (ISO serial task)
    const k = R.k;
    const target = SEQUENCE[k];
    R.taps.push({ x: p.x, y: p.y, t });
    if (dist(p, targetCentre(target, D)) <= W / 2) {
      pulseAt(target);
      sfx.tick();
    } else {
      ringAt(p, 'miss');
      sfx.thud();
    }
    setMeter(k);
    if (k >= SEQUENCE.length - 1) {
      completeRing();
      return;
    }
    R.k = k + 1;
    reveal(SEQUENCE[k + 1]);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: PointerEvent) => onDown.current(e);
    const cancel = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', handler, { passive: false });
    el.addEventListener('contextmenu', cancel);
    el.addEventListener('touchstart', cancel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', handler);
      el.removeEventListener('contextmenu', cancel);
      el.removeEventListener('touchstart', cancel);
    };
  }, []);

  /* ---------- interruptions (class B) ---------- */
  useEffect(() => {
    pausedRef.current = paused;
    if (phaseRef.current !== 'play' || finished.current) return;
    const R = run.current;
    if (paused) {
      window.clearTimeout(timers.current.between);
      hideNow();
      if (R.sub === 'run') {
        if (R.kind === 'scored') {
          const res = voidSequence(block.current!);
          block.current = res.state;
          if (res.overLimit) {
            finishScored();
            return;
          }
          notice.current = 'That ring was interrupted — it will be repeated at the end.';
          R.resume = 'next';
        } else {
          notice.current = 'Interrupted — let’s take that ring again.';
          R.resume = 'same';
        }
      } else if (R.sub === 'between' || R.sub === 'start') {
        R.resume = 'same';
      } else {
        return; // 'done' / 'idle': nothing in flight
      }
      setSub('paused');
      return;
    }
    if (R.sub !== 'paused') return;
    if (R.kind === 'scored') presentScored();
    else present(R.kind, R.cond, R.kicker, R.practiceIdx);
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // a hidden page or a rotation interrupts the ring in flight (SCIENCE.md §1.9 "Input")
  useEffect(() => {
    const interrupt = (why: string) => {
      if (phaseRef.current !== 'play' || finished.current || pausedRef.current) return;
      wrapRef.current?.setAttribute('data-tr-interrupt', why);
      cb.current.requestPause(true);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') interrupt('hidden');
    };
    const onRotate = () => interrupt('rotation');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('orientationchange', onRotate);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('orientationchange', onRotate);
    };
  }, []);

  // the board changing size under a ring in flight is an interruption too (a sub-2 px wobble is not)
  useEffect(() => {
    const R = run.current;
    if (phaseRef.current === 'play' && R.sub === 'run' && Math.abs(side - R.side) >= 2 && !pausedRef.current) {
      wrapRef.current?.setAttribute('data-tr-interrupt', `resize ${R.side}→${side}`);
      cb.current.requestPause(true);
    }
  }, [side]);

  // the new ring arrives during the 1.2 s card (decorative — over long before target 0 lights)
  useEffect(() => {
    if (!view.no || reduceRef.current) return;
    ringRef.current?.animate?.(
      [
        { opacity: 0, transform: 'scale(0.9)' },
        { opacity: 1, transform: 'scale(1)' }
      ],
      { duration: 560, easing: EASE_OUT }
    );
  }, [view.no]);

  useEffect(
    () => () => {
      cancelReveal.current();
      window.clearTimeout(timers.current.between);
      window.clearTimeout(timers.current.phase);
      window.clearTimeout(timers.current.finish);
    },
    []
  );

  /* ---------- phase actions ---------- */
  const startPractice = (idx: number) => present('practice', PRACTICE_CONDS[idx], `Practice ${idx + 1} of 2 · not scored`, idx);
  const startWarmup = () => present('warmup', WARMUP_COND, 'Warm-up · not scored');
  const startBlockRun = () => {
    block.current = startBlock(seed);
    minScale.current = Infinity;
    presentScored();
  };

  /* ---------- render ---------- */
  const cond = CONDITIONS[view.cond];
  const centre = side / 2;
  const posOf = (j: number) => {
    const c = targetCentre(j, cond.D);
    return { left: centre + c.x * ppmm, top: centre + c.y * ppmm };
  };
  const plate = Math.min(side, (MAX_EXTENT_MM + 6) * ppmm);
  const isPlay = phase.name === 'play' || phase.name === 'finishing';

  let title = '';
  let line = '';
  if (phase.name === 'finishing') {
    title = 'All rings done';
    line = 'Measurement complete';
  } else if (sub === 'between') {
    title = cond.label;
    line = view.notice || 'Get ready…';
  } else if (sub === 'start') {
    title = 'Tap the lit circle to start';
    line = view.notice || cond.label;
  } else if (sub === 'run' || sub === 'done') {
    title = 'Tap each lit circle';
    line = 'As fast and accurately as you can';
  } else if (sub === 'paused') {
    title = 'Paused';
    line = notice.current || 'The ring restarts when you resume.';
  }

  return (
    <div className="tr-root" data-tr-phase={phase.name} data-tr-sub={sub} data-mode={isPlay ? 'play' : 'card'}>
      <div className="tr-wrap" ref={wrapRef}>
        {side > 0 && (
          <div
            className="tr-board"
            ref={boardRef}
            style={{ width: side, height: side }}
            role="application"
            aria-label="Target ring: tap each lit circle"
            data-tr-ppmm={ppmm.toFixed(4)}
            data-tr-scale={scale.toFixed(3)}
            data-tr-cond={view.cond}
          >
            <span className="tr-plate" style={{ width: plate, height: plate }} />
            <div className="tr-ring" ref={ringRef}>
              <span className="tr-guide" style={{ width: cond.D * ppmm, height: cond.D * ppmm }} />
              {Array.from({ length: N_TARGETS }, (_, j) => (
                <span key={`d${j}`} className="tr-dot" style={{ ...posOf(j), width: DOT_MM * ppmm, height: DOT_MM * ppmm }} />
              ))}
              {Array.from({ length: N_TARGETS }, (_, j) => (
                <span
                  key={`t${j}`}
                  ref={(el) => {
                    targetEls.current[j] = el;
                  }}
                  className="tr-target"
                  data-j={j}
                  style={{ ...posOf(j), width: cond.W * ppmm, height: cond.W * ppmm }}
                />
              ))}
            </div>
            {[0, 1].map((i) => (
              <span
                key={`p${i}`}
                className="tr-pulse"
                ref={(el) => {
                  pulseEls.current[i] = el;
                }}
              />
            ))}
            {[0, 1].map((i) => (
              <span
                key={`m${i}`}
                className="tr-miss"
                ref={(el) => {
                  missEls.current[i] = el;
                }}
              />
            ))}
            {phase.name === 'finishing' && (
              <span className="tr-done" aria-hidden>
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="21" />
                  <path d="M14.5 24.5l6.5 6.5 13-14" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="tr-card fx-card" data-sub={phase.name === 'finishing' ? 'finishing' : sub} aria-live="polite">
        <div className="tr-card-text">
          <span className="tr-kicker">{phase.name === 'finishing' ? 'Scored · 12 rings' : view.kicker}</span>
          <span key={`${sub}-${phase.name}`} className="tr-title">
            {title}
          </span>
          <span className="tr-line">{line}</span>
        </div>
        <RingGlyph key={view.cond} cond={view.cond} />
        <div className="tr-meter" aria-hidden>
          <div className="tr-segs" ref={meterRef}>
            {Array.from({ length: N_TARGETS }, (_, i) => (
              <span key={i} className="tr-seg" />
            ))}
          </div>
          <span key={view.no} className="tr-fill" />
        </div>
      </div>

      {!isPlay && (
        <div className="tr-overlay">
          {phase.name === 'tutorial' && (
            <PhaseCard
              kicker={`How it works · ${phase.step + 1} of 3`}
              title={TUTORIAL[phase.step].title}
              action={phase.step < 2 ? 'Next' : 'Start practice'}
              onAction={() => (phase.step < 2 ? setPhase({ name: 'tutorial', step: phase.step + 1 }) : startPractice(0))}
            >
              <div className="tr-tut">
                <TargetRingDemo key={phase.step} segment={phase.step as 0 | 1 | 2} />
                <div className="tr-steps" aria-hidden>
                  {TUTORIAL.map((_, i) => (
                    <span key={i} data-on={i === phase.step ? '1' : undefined} />
                  ))}
                </div>
              </div>
            </PhaseCard>
          )}
          {phase.name === 'practice-done' && (
            <PhaseCard
              kicker={`Practice ${phase.idx + 1} of 2 · not scored`}
              title={`${phase.hits} of ${phase.total} on target`}
              body={
                <>
                  <span className="tr-stat">{(phase.mtMs / 1000).toFixed(2)} s per tap</span>
                  <span className="tr-coach">{coach(phase.total - phase.hits, phase.mtMs)}</span>
                </>
              }
              action={phase.idx === 0 ? 'Next practice ring' : mode === 'practice' ? 'Finish practice' : 'Continue'}
              onAction={() => {
                if (phase.idx === 0) startPractice(1);
                else if (mode === 'practice') finish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
                else setPhase({ name: 'warmup-intro' });
              }}
            />
          )}
          {phase.name === 'warmup-intro' && (
            <PhaseCard
              kicker="Warm-up · not scored"
              title="One warm-up ring"
              body={
                <>
                  Hold the phone the way you always do — in one hand, tapping with the index finger of the other, or flat on a table.
                  Tap each lit circle as quickly and accurately as you can.
                </>
              }
              action="Start warm-up"
              onAction={startWarmup}
            />
          )}
          {phase.name === 'block-intro' && (
            <PhaseCard
              kicker={`Scored · ${SLOTS} rings`}
              title="Now the real thing"
              body={
                <>
                  Four ring sizes, three rounds — about a minute and a half. Each ring starts when you tap its lit circle. An occasional miss is
                  fine.
                  {phase.warmMisses >= 4 && (
                    <span className="tr-coach">Several warm-up taps missed — aim to land inside the circle.</span>
                  )}
                </>
              }
              action="Start"
              onAction={startBlockRun}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** corrective feedback after a practice ring (first run only — never during the scored block) */
function coach(misses: number, mtMs: number): string {
  if (misses >= 4) return 'Several taps landed outside the circle. Slow down a touch — most taps should land inside.';
  if (mtMs > 1200) return 'Try not to pause between taps — keep a steady rhythm.';
  if (misses === 0 && mtMs > 650) return 'Spot on. You can go a little faster — an occasional miss is fine.';
  return 'Good balance of speed and accuracy — keep that pace.';
}

/** the bottom card's picture of the ring in play: its size and its target size */
function RingGlyph({ cond }: { cond: ConditionId }) {
  const c = CONDITIONS[cond];
  const r = c.D === 40 ? 16 : 9.5;
  const w = c.W === 12 ? 5.6 : 3.4;
  return (
    <svg className="tr-glyph" viewBox="0 0 48 48" aria-hidden>
      <circle className="tr-glyph-ring" cx="24" cy="24" r={r} />
      {Array.from({ length: N_TARGETS }, (_, j) =>
        j === 0 ? null : (
          <circle key={j} className="tr-glyph-dot" cx={24 + r * Math.cos(targetAngle(j))} cy={24 + r * Math.sin(targetAngle(j))} r={1.4} />
        )
      )}
      <circle className="tr-glyph-target" cx={24} cy={24 - r} r={w} />
    </svg>
  );
}
