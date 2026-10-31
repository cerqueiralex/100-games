import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { eventTime, now, revealOnFrame } from '../../platform/brain/timing';
import { measureFrameMs } from '../../platform/brain/device';
import { AREA_STYLE } from './area';
import { Countdown, PhaseCard, ResponseButton, useFeedback } from '../../platform/components/fx';
import { DUR, haptic } from '../../platform/motion';
import { sfx } from '../../platform/audio';
import { CheckIcon, CloseIcon, EyeIcon, InfoIcon } from '../../platform/design/icons';
import { PROTOCOL, type TrialKind } from './logic/protocol';
import { arenaSide, hitBlock, type TrialItem } from './logic/layout';
import { TrialLadder } from './logic/session';
import { PRESENT_START, applyPresentEvent, onDeviation, presentationEvent, scheduleFor, type PresentState } from './logic/presentation';
import type { TrialEnd, TrialRecord, TrialResponse } from './logic/scoring';

/**
 * Block Span — the Memory benchmark (SCIENCE.md §1.6): an adaptive,
 * randomised-layout Corsi span after the C-SST (Woods et al. 2016).
 *
 * Shape of a run (C1): [first run: practice card → 4 practice trials with
 * per-tap feedback] → warm-up card → 1 warm-up trial at L = 3 → scored-block
 * card → 3-2-1 → 14 scored trials (no correctness feedback, C3) → onFinish.
 *
 * Timing (C2): a trial's layout is revealed inside a requestAnimationFrame
 * callback (its timestamp is the onset), and every highlight edge is a
 * data-attribute write that flips an overlay's OPACITY inside a later frame
 * — never a CSS transition — stamped with that frame's timestamp. The
 * stepper in logic/presentation.ts allows one edge per frame, so a stalled
 * frame shows up as an ON period outside 500 ± 50 ms and voids the trial.
 * Taps register on pointerup inside the block + 6 px, stamped with
 * eventTime(). React state only carries what the labels print.
 *
 * Interruptions (class B, C5): `paused` voids the trial in flight; after
 * resume a 3-2-1 runs a fresh trial at the same length. The scored block
 * ends early, invalid, past its limits (logic/scoring.ts limitReasons) —
 * checked on resume, so onFinish never fires while the runner is paused.
 */

type Card = 'practice' | 'warmup' | 'block';
/** iti: between trials · present: layout + highlights · respond: after the cue · ending: all taps in · feedback: practice/warm-up verdict · void: a trial replaced */
type Stage = 'iti' | 'present' | 'respond' | 'ending' | 'feedback' | 'void';

interface Engine {
  ladder: TrialLadder | null;
  item: TrialItem | null;
  /** bumps to cancel every frame loop and timer in flight */
  token: number;
  stage: Stage;
  cueTs: number;
  present: PresentState;
  onTs: number[];
  maxDev: number;
  tapMs: number[];
  tapped: number[];
  earlyTaps: number;
  /** how the trial will end once its 'ending' beat is over */
  pendingEnd: TrialEnd;
  /** the press in progress began during the response phase */
  pressOk: boolean;
  pressed: number;
  inactivity: number;
  raf: number;
  pausedAt: number;
  resume: (() => void) | null;
  /** the scored block has begun: pauses now count as interruptions */
  blockActive: boolean;
}

/** how long the "Wait for Your turn" hint stays after a tap during the presentation (flow timing — unchanged under reduced motion) */
const HINT_MS = 1600;

const KICKER: Record<TrialKind, (n: number, total: number) => string> = {
  practice: (n, total) => `Practice · ${n} of ${total}`,
  warmup: () => 'Warm-up · not scored',
  scored: (n, total) => `Trial ${n} of ${total}`
};

function stopCopy(flags: string[] = []): string {
  if (flags.includes('too-many-timeouts')) return 'Three trials went without a tap, so this run can’t be scored.';
  if (flags.includes('unstable-timing')) return 'The display could not keep the presentation timing, so this run can’t be scored.';
  if (flags.includes('too-many-interruptions')) return 'Paused too often or for too long to compare with your other runs.';
  if (flags.includes('too-few')) return 'Every trial ended with “Don’t remember”, so there is nothing to score this time.';
  if (flags.includes('at-chance')) return 'No sequence came back in order, so this run can’t be scored.';
  return 'This run can’t be scored.';
}

export function BlockSpanTest({ mode, firstRun, seed, paused, onProgress, onFinish }: BrainTestProps) {
  const fb = useFeedback();
  const cb = useRef({ onProgress, onFinish });
  cb.current = { onProgress, onFinish };

  const [card, setCard] = useState<Card | null>(mode === 'practice' || firstRun ? 'practice' : 'warmup');
  const [kind, setKind] = useState<TrialKind>('practice');
  const [item, setItem] = useState<TrialItem | null>(null);
  const [stage, setStage] = useState<Stage>('iti');
  const [kicker, setKicker] = useState('');
  /** 1-based number of the trial on screen within its ladder */
  const [trialNo, setTrialNo] = useState(0);
  const [taps, setTaps] = useState(0);
  const [hint, setHint] = useState(0);
  const [note, setNote] = useState('');
  const [verdict, setVerdict] = useState<'good' | 'bad' | null>(null);
  const [order, setOrder] = useState<number[] | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState('Get ready');
  const [done, setDone] = useState<null | { kind: 'complete' | 'practice' | 'stopped'; text: string }>(null);
  const [side, setSide] = useState(() =>
    typeof window === 'undefined' ? 320 : arenaSide(window.innerWidth, window.innerHeight)
  );

  const eng = useRef<Engine>({
    ladder: null,
    item: null,
    token: 0,
    stage: 'iti',
    cueTs: 0,
    present: PRESENT_START,
    onTs: [],
    maxDev: 0,
    tapMs: [],
    tapped: [],
    earlyTaps: 0,
    pendingEnd: 'complete',
    pressOk: false,
    pressed: -1,
    inactivity: 0,
    raf: 0,
    pausedAt: 0,
    resume: null,
    blockActive: false
  });
  const timers = useRef(new Set<number>());
  const frameMs = useRef(16.7);
  const sideRef = useRef(side);
  const pausedRef = useRef(paused);
  const cardRef = useRef(card);
  cardRef.current = card;
  const finished = useRef(false);
  const delivered = useRef(false);
  const finishTimer = useRef(0);
  const hintTimer = useRef(0);
  const countdownNext = useRef<(() => void) | null>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const blockEls = useRef<(HTMLDivElement | null)[]>([]);

  /* ---------- timers bound to the current token ---------- */

  function later(fn: () => void, ms: number): number {
    const e = eng.current;
    const tok = e.token;
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (tok === e.token) fn();
    }, ms);
    timers.current.add(id);
    return id;
  }

  function clearMarks() {
    for (const el of blockEls.current) {
      el?.removeAttribute('data-lit');
      el?.removeAttribute('data-tap');
      el?.removeAttribute('data-press');
    }
  }

  function cancelAll() {
    const e = eng.current;
    e.token++;
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(e.raf);
    clearMarks();
  }

  /* ---------- mount: frame interval, arena size, cleanup ---------- */

  useEffect(() => {
    let live = true;
    void measureFrameMs(60).then((ms) => {
      if (live && ms > 4 && ms < 50) frameMs.current = ms;
    });
    cb.current.onProgress(0);
    return () => {
      live = false;
      cancelAll();
      window.clearTimeout(finishTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = stageBox.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const s = arenaSide(window.innerWidth, window.innerHeight, r.width, r.height);
      sideRef.current = s;
      setSide(s);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  /* ---------- flow ---------- */

  function begin(k: TrialKind) {
    const e = eng.current;
    if (e.ladder?.config.kind === k) return; // a double tap on the card's button
    e.ladder = new TrialLadder(seed, k);
    setKind(k);
    setCard(null);
    setNote('');
    setVerdict(null);
    setKicker(KICKER[k](1, e.ladder.config.trials));
    if (k === 'scored') {
      e.blockActive = true;
      startCountdown(advance);
    } else {
      later(advance, 420);
    }
  }

  function startCountdown(next: () => void, label?: string) {
    countdownNext.current = next;
    setCountdownLabel(label ?? (eng.current.ladder?.config.kind === 'scored' ? 'Scored trials' : 'Get ready'));
    setCountdown((c) => c + 1);
  }

  function onCountdownDone() {
    const next = countdownNext.current;
    if (!next) return;
    if (pausedRef.current) {
      // the countdown's last beat landed during a pause: run it again on resume
      eng.current.resume = () => startCountdown(next, 'Resuming');
      return;
    }
    countdownNext.current = null;
    setCountdown(0);
    next();
  }

  /** after a trial is fully recorded (or at a ladder's start): the next step */
  function advance() {
    const e = eng.current;
    const ladder = e.ladder;
    if (!ladder || finished.current) return;
    if (pausedRef.current) {
      e.resume = resumeAfterTrial;
      return;
    }
    if (ladder.config.kind === 'scored' && ladder.limitReasons().length) return finishScored();
    if (ladder.done) return ladderDone(ladder.config.kind);
    nextTrial();
  }

  function resumeAfterTrial() {
    const ladder = eng.current.ladder;
    if (!ladder) return;
    if (ladder.config.kind === 'scored' && ladder.limitReasons().length) return finishScored();
    if (ladder.done) return advance();
    startCountdown(advance, 'Resuming · a fresh trial');
  }

  function ladderDone(k: TrialKind) {
    setItem(null);
    setStage('iti');
    setNote('');
    setVerdict(null);
    setOrder(null);
    if (k === 'practice') {
      if (mode === 'practice') return finishPractice();
      setCard('warmup');
    } else if (k === 'warmup') {
      setCard('block');
    } else {
      finishScored();
    }
  }

  function nextTrial() {
    const e = eng.current;
    const ladder = e.ladder;
    if (!ladder) return;
    const it = ladder.next(sideRef.current);
    e.item = it;
    e.stage = 'iti';
    e.present = PRESENT_START;
    e.onTs = [];
    e.maxDev = 0;
    e.tapMs = [];
    e.tapped = [];
    e.earlyTaps = 0;
    e.pendingEnd = 'complete';
    e.pressOk = false;
    e.pressed = -1;
    blockEls.current = [];
    setKicker(KICKER[ladder.config.kind](ladder.completed + 1, ladder.config.trials));
    setTrialNo(ladder.completed + 1);
    setItem(it);
    setStage('present');
    setTaps(0);
    setHint(0);
    setNote('');
    setVerdict(null);
    setOrder(null);
  }

  // reveal each new layout on a frame and start its presentation from that frame
  useLayoutEffect(() => {
    if (!item) return;
    const e = eng.current;
    const tok = e.token;
    return revealOnFrame(
      () => {
        if (tok === e.token) layerRef.current?.setAttribute('data-show', '');
      },
      (t0) => {
        if (tok === e.token) startPresentation(t0);
      }
    );
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  function light(block: number, on: boolean) {
    const el = blockEls.current[block];
    if (!el) return;
    if (on) el.setAttribute('data-lit', '');
    else el.removeAttribute('data-lit');
  }

  function startPresentation(t0: number) {
    const e = eng.current;
    const it = e.item;
    if (!it) return;
    const tok = e.token;
    e.stage = 'present';
    const sch = scheduleFor(it.L);
    const step = (ts: number) => {
      if (tok !== e.token) return;
      const ev = presentationEvent(e.present, ts - t0, sch, frameMs.current / 2);
      if (ev) {
        if (ev.type === 'on') {
          light(it.seq[ev.index], true);
          e.onTs[ev.index] = ts;
        } else if (ev.type === 'off') {
          light(it.seq[ev.index], false);
          const dev = onDeviation(e.onTs[ev.index], ts);
          e.maxDev = Math.max(e.maxDev, dev);
          if (dev > PROTOCOL.onToleranceMs) return voidForTiming();
        }
        e.present = applyPresentEvent(e.present, ev);
        if (ev.type === 'cue') return cue(ts);
      }
      e.raf = requestAnimationFrame(step);
    };
    e.raf = requestAnimationFrame(step);
  }

  function cue(ts: number) {
    const e = eng.current;
    e.stage = 'respond';
    e.cueTs = ts;
    setStage('respond');
    sfx.go();
    haptic('tap');
    armInactivity();
  }

  function clearInactivity() {
    const e = eng.current;
    window.clearTimeout(e.inactivity);
    timers.current.delete(e.inactivity);
  }

  function armInactivity() {
    clearInactivity();
    eng.current.inactivity = later(() => endTrial('timeout'), PROTOCOL.inactivityMs);
  }

  function response(end: TrialEnd): TrialResponse {
    const e = eng.current;
    return {
      end,
      tapMs: e.tapMs.slice(),
      tapped: e.tapped.slice(),
      earlyTaps: e.earlyTaps,
      maxOnDevMs: e.maxDev,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight
    };
  }

  function centrePct(it: TrialItem, block: number) {
    const c = it.layout.centres[block];
    return { x: (c.x / it.layout.S) * 100, y: (c.y / it.layout.S) * 100 };
  }

  /* ---------- responses ---------- */

  function blockAt(clientX: number, clientY: number): number {
    const it = eng.current.item;
    const el = arenaRef.current;
    if (!it || !el) return -1;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0)) return -1;
    const k = it.layout.S / r.width;
    return hitBlock((clientX - r.left) * k, (clientY - r.top) * k, it.layout.centres, it.layout.b, PROTOCOL.hitPadPx * k);
  }

  function setPressed(block: number) {
    const e = eng.current;
    if (e.pressed === block) return;
    if (e.pressed >= 0) blockEls.current[e.pressed]?.removeAttribute('data-press');
    e.pressed = block;
    if (block >= 0) blockEls.current[block]?.setAttribute('data-press', '');
  }

  function onPointerDown(ev: ReactPointerEvent<HTMLDivElement>) {
    if (!ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    ev.preventDefault();
    const e = eng.current;
    if (e.stage === 'present') {
      // taps during the presentation are ignored, with a quiet "wait" hint
      e.earlyTaps++;
      e.pressOk = false;
      setHint((h) => h + 1);
      window.clearTimeout(hintTimer.current);
      timers.current.delete(hintTimer.current);
      hintTimer.current = later(() => setHint(0), HINT_MS);
      return;
    }
    e.pressOk = e.stage === 'respond';
    if (!e.pressOk) return;
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      /* capture is best-effort */
    }
    setPressed(blockAt(ev.clientX, ev.clientY));
  }

  function onPointerMove(ev: ReactPointerEvent<HTMLDivElement>) {
    if (!ev.isPrimary || !eng.current.pressOk) return;
    setPressed(blockAt(ev.clientX, ev.clientY));
  }

  function onPointerUp(ev: ReactPointerEvent<HTMLDivElement>) {
    if (!ev.isPrimary) return;
    const e = eng.current;
    const ok = e.pressOk;
    e.pressOk = false;
    setPressed(-1);
    if (!ok || e.stage !== 'respond') return;
    const block = blockAt(ev.clientX, ev.clientY);
    if (block >= 0) registerTap(block, eventTime(ev.nativeEvent));
  }

  function onPointerCancel() {
    eng.current.pressOk = false;
    setPressed(-1);
  }

  function flashTap(block: number) {
    const el = blockEls.current[block];
    if (!el) return;
    el.setAttribute('data-tap', '');
    // alternate the ping animation name so a repeat tap restarts it
    el.setAttribute('data-ping', el.getAttribute('data-ping') === 'a' ? 'b' : 'a');
    later(() => el.removeAttribute('data-tap'), PROTOCOL.tapFlashMs);
  }

  function registerTap(block: number, t: number) {
    const e = eng.current;
    const it = e.item;
    const ladder = e.ladder;
    if (!it || !ladder || e.tapped.length >= it.L) return;
    e.tapped.push(block);
    e.tapMs.push(Math.max(0, t - e.cueTs));
    const n = e.tapped.length;
    flashTap(block);
    setTaps(n);
    if (ladder.config.kind === 'practice') {
      // first-run practice: corrective feedback on every tap
      const at = centrePct(it, block);
      if (it.seq[n - 1] === block) {
        fb.good(at, { step: n - 1 });
      } else {
        fb.bad(at);
        return enterEnding('stopped', 520);
      }
    } else {
      sfx.tick();
    }
    if (n >= it.L) enterEnding('complete', PROTOCOL.endDelayMs);
    else armInactivity();
  }

  function enterEnding(end: TrialEnd, ms: number) {
    const e = eng.current;
    clearInactivity();
    e.stage = 'ending';
    e.pendingEnd = end;
    setStage('ending');
    later(() => endTrial(end), ms);
  }

  function giveUp() {
    if (eng.current.stage !== 'respond') return;
    sfx.tap();
    endTrial('gave-up');
  }

  /** record the trial in its ladder; false when the run just ended */
  function recordTrial(end: TrialEnd): TrialRecord | null {
    const e = eng.current;
    const it = e.item;
    const ladder = e.ladder;
    if (!it || !ladder) return null;
    clearInactivity();
    const rec = ladder.complete(it, response(end));
    e.item = null;
    if (ladder.config.kind === 'scored') {
      cb.current.onProgress(Math.min(1, ladder.completed / ladder.config.trials));
      if (ladder.limitReasons().length) {
        finishScored();
        return null;
      }
    }
    return rec;
  }

  function endTrial(end: TrialEnd) {
    const e = eng.current;
    const it = e.item;
    const ladder = e.ladder;
    if (!it || !ladder || (e.stage !== 'respond' && e.stage !== 'ending')) return;
    const rec = recordTrial(end);
    if (!rec) return;
    if (ladder.config.kind === 'scored') {
      e.stage = 'iti';
      setStage('iti');
      setNote(end === 'timeout' ? 'Time’s up' : '');
      fadeOut(advance);
      return;
    }
    // practice / warm-up: corrective feedback (C1)
    e.stage = 'feedback';
    setStage('feedback');
    if (rec.correct) {
      setVerdict('good');
      setNote('Correct');
      if (ladder.config.kind === 'warmup') fb.good({ x: 50, y: 50 });
    } else {
      setVerdict('bad');
      setNote(end === 'timeout' ? 'Time’s up — here’s the order' : end === 'gave-up' ? 'Here’s the order' : 'Not quite — here’s the order');
      if (ladder.config.kind === 'warmup' && end === 'complete') fb.bad({ x: 50, y: 50 });
      setOrder(it.seq.slice());
    }
    later(() => fadeOut(advance), rec.correct ? 1000 : 1700 + it.L * 220);
  }

  function fadeOut(next: () => void) {
    layerRef.current?.removeAttribute('data-show');
    later(() => {
      eng.current.stage = 'iti';
      setItem(null);
      setStage('iti');
      setOrder(null);
      later(next, PROTOCOL.itiBlankMs);
    }, PROTOCOL.itiFadeMs);
  }

  function voidForTiming() {
    const e = eng.current;
    const it = e.item;
    const ladder = e.ladder;
    if (!it || !ladder) return;
    const partial = response('complete');
    cancelAll();
    ladder.void(it, 'timing', partial);
    e.item = null;
    e.stage = 'void';
    setItem(null);
    setStage('void');
    setNote('Display hiccup — a fresh trial');
    if (ladder.config.kind === 'scored' && ladder.limitReasons().length) return finishScored();
    later(advance, 1100);
  }

  /* ---------- interruptions (class B) ---------- */

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) handlePause();
    else handleResume();
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePause() {
    const e = eng.current;
    if (e.pausedAt) return;
    e.pausedAt = now();
    if (finished.current || cardRef.current) return;
    const ladder = e.ladder;
    if (!ladder) return;
    if (e.blockActive) ladder.interruption();
    if (countdownNext.current) return; // the Countdown holds and restarts by itself
    const it = e.item;
    const st = e.stage;
    if (it && (st === 'present' || st === 'respond')) {
      // void the trial in flight; a fresh one at the same length follows a 3-2-1
      const partial = response('complete');
      cancelAll();
      ladder.void(it, 'pause', partial);
      e.item = null;
    } else if (it && st === 'ending') {
      // every tap is in: the trial stands
      cancelAll();
      recordTrial(e.pendingEnd);
      if (finished.current) return;
    } else {
      cancelAll();
    }
    e.stage = 'iti';
    setItem(null);
    setStage('iti');
    setNote('');
    setVerdict(null);
    setOrder(null);
    setTaps(0);
    e.resume = resumeAfterTrial;
  }

  function handleResume() {
    const e = eng.current;
    if (!e.pausedAt) return;
    const away = now() - e.pausedAt;
    e.pausedAt = 0;
    const act = e.resume;
    e.resume = null;
    if (finished.current) return act?.();
    const ladder = e.ladder;
    if (ladder && e.blockActive && !cardRef.current) {
      ladder.addPausedMs(away);
      if (ladder.limitReasons().length) return finishScored();
    }
    act?.();
  }

  /* ---------- the end ---------- */

  function deliver(outcome: BrainRunOutcome, ms: number) {
    const send = () => {
      if (delivered.current) return;
      if (pausedRef.current) {
        eng.current.resume = send;
        return;
      }
      delivered.current = true;
      cb.current.onFinish(outcome);
    };
    window.clearTimeout(finishTimer.current);
    finishTimer.current = window.setTimeout(send, ms);
  }

  function finishScored() {
    const ladder = eng.current.ladder;
    if (finished.current || !ladder) return;
    finished.current = true;
    cancelAll();
    countdownNext.current = null;
    setCountdown(0);
    setItem(null);
    const outcome = ladder.outcome();
    if (outcome.valid) {
      cb.current.onProgress(1);
      setDone({ kind: 'complete', text: 'Block complete' });
    } else {
      setDone({ kind: 'stopped', text: stopCopy(outcome.flags) });
    }
    deliver(outcome, outcome.valid ? 900 : 2200);
  }

  function finishPractice() {
    if (finished.current) return;
    finished.current = true;
    cancelAll();
    setDone({ kind: 'practice', text: 'Practice complete' });
    deliver({ metrics: {}, trials: 0, valid: false, flags: ['practice'] }, 900);
  }

  /* ---------- render ---------- */

  const S = item ? item.layout.S : side;
  const running = card === null && !done;
  const L = item?.L ?? 0;
  const practice = kind === 'practice';
  const showSlots = running && (stage === 'respond' || stage === 'ending' || stage === 'feedback') && L > 0;

  let label = '';
  if (stage === 'present') label = practice ? 'Watch the order' : 'Watch';
  else if (stage === 'respond' || stage === 'ending') label = 'Your turn';
  else if (stage === 'feedback' || stage === 'void') label = note;
  else if (stage === 'iti') label = note;

  // the first-run practice coaches step by step; the scored block reminds twice, then stays quiet
  let coach = '';
  const turn = stage === 'respond' || stage === 'ending';
  if (practice && trialNo === 1) {
    if (stage === 'present') coach = `${L} blocks will light up, one at a time.`;
    else if (turn) coach = taps === 0 ? 'Tap the block that lit up first…' : '…then the next one.';
  } else if (practice) {
    if (stage === 'present') coach = 'Remember the order they light up in.';
    else if (turn) coach = 'Tap them in the same order.';
  } else if (kind === 'scored' && stage === 'respond' && taps === 0 && trialNo <= 2) {
    coach = 'Lost the order? Tap “Don’t remember”.';
  }

  return (
    <div
      className="bspan-root"
      style={AREA_STYLE}
      data-bspan-stage={done ? 'done' : card ? 'card' : stage}
      data-bspan-kind={kind}
      data-bspan-card={card ?? undefined}
    >
      <header className={`bspan-head${running ? '' : ' is-idle'}`} aria-live="polite">
        <span className="bspan-kicker">{running ? kicker : ''}</span>
        <span
          // one key across respond → ending: the "Your turn" pill holds through the 300 ms end beat
          key={`${turn ? 'turn' : stage}-${label}`}
          className={`bspan-label${running && verdict ? ` is-${verdict}` : ''}${running && turn ? ' is-turn' : ''}`}
        >
          {running && stage === 'present' && <EyeIcon size={20} />}
          {running && stage === 'feedback' && verdict && (
            // the verdict's glyph sits on a semantic disc; the words stay in --text (Q8, Q26)
            <span className={`bspan-verdict is-${verdict}`} aria-hidden>
              {verdict === 'good' ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
            </span>
          )}
          {running ? label : ''}
        </span>
        <span className="bspan-sub">
          {running && hint > 0 && stage === 'present' ? (
            <span key={hint} className="bspan-hint">
              Wait for “Your turn”
            </span>
          ) : (
            <span key={coach} className="bspan-coach">
              {running ? coach : ''}
            </span>
          )}
        </span>
      </header>

      <div className="bspan-stage" ref={stageBox}>
        <div
          ref={arenaRef}
          className={`bspan-arena${running ? '' : ' is-hidden'}${running && turn ? ' is-turn' : ''}`}
          style={{ width: S, height: S }}
          role="group"
          aria-label={
            stage === 'respond'
              ? `Your turn: tap the ${L} blocks in the order they lit up`
              : stage === 'present'
                ? 'Watch the blocks light up'
                : 'Block Span board'
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(ev) => ev.preventDefault()}
        >
          {item && (
            <div key={`${item.kind}-${item.attempt}`} ref={layerRef} className="bspan-blocks">
              {item.layout.centres.map((p, i) => {
                const pos = order ? order.indexOf(i) : -1;
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      blockEls.current[i] = el;
                    }}
                    className="bspan-block"
                    data-bspan-block={i}
                    style={{
                      left: `${(p.x / S) * 100}%`,
                      top: `${(p.y / S) * 100}%`,
                      width: `${(item.layout.b / S) * 100}%`,
                      height: `${(item.layout.b / S) * 100}%`
                    }}
                  >
                    <span className="bspan-lit" />
                    {pos >= 0 && (
                      <span className="bspan-order" style={{ animationDelay: `${pos * DUR.fast}ms` }}>
                        {pos + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {fb.layer}
        </div>

        {card === 'practice' && (
          <PhaseCard
            kicker="Practice · with feedback"
            title="Learn the test"
            body={
              <>
                Blocks light up one at a time. When you see <strong>Your turn</strong>, tap them in the same order. Four
                short trials, starting with 2 blocks — every tap is checked.
              </>
            }
            action="Start practice"
            onAction={() => begin('practice')}
          />
        )}
        {card === 'warmup' && (
          <PhaseCard
            kicker="Warm-up · not scored"
            title="One warm-up trial"
            body="3 blocks, played exactly like the real trials. You’ll see whether you got it."
            action="Start warm-up"
            onAction={() => begin('warmup')}
          />
        )}
        {card === 'block' && (
          <PhaseCard
            kicker="Scored block"
            title="14 trials · about 2½ minutes"
            body="No feedback from here on. A correct trial adds a block; two misses in a row take one away."
            action="Begin"
            onAction={() => begin('scored')}
          >
            <ul className="bspan-facts">
              <li>Only the order counts — take your time.</li>
              <li>Lost the order? Tap “Don’t remember” rather than guessing.</li>
            </ul>
          </PhaseCard>
        )}

        {done && (
          <div className={`bspan-done is-${done.kind}`} role="status">
            <span className="bspan-done-badge">{done.kind === 'stopped' ? <InfoIcon size={26} /> : <CheckIcon size={28} />}</span>
            <strong>{done.kind === 'stopped' ? 'Run stopped' : done.text}</strong>
            {done.kind === 'stopped' && <span className="bspan-done-text">{done.text}</span>}
          </div>
        )}

        {countdown > 0 && (
          <Countdown key={countdown} paused={paused} label={countdownLabel} onDone={onCountdownDone} />
        )}
      </div>

      <div className={`bspan-dock fx-card${running ? '' : ' is-hidden'}`}>
        <div className="bspan-slots" aria-label={showSlots ? `${taps} of ${L} taps` : undefined} aria-hidden={!showSlots}>
          {showSlots &&
            Array.from({ length: L }, (_, i) => <span key={i} className={`bspan-slot${i < taps ? ' is-on' : ''}`} />)}
        </div>
        <ResponseButton
          className="bspan-dont"
          disabled={!running || stage !== 'respond'}
          ariaLabel="Don’t remember — end this trial"
          onPress={giveUp}
        >
          Don’t remember
        </ResponseButton>
      </div>
    </div>
  );
}
