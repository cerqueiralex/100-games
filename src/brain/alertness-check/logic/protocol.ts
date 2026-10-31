import { rng, shuffle } from '../../../platform/brain/timing';

/**
 * Alertness Check — the protocol (SCIENCE.md §1.10: PVT-B, the 3-minute
 * Psychomotor Vigilance Test of Basner, Mollicone & Dinges 2011). PURE: no
 * DOM, no React, no unseeded randomness — the component drives this exact state
 * machine frame by frame, and scripts/brain-checks/alertness-check.ts drives
 * the same machine under Node with a scripted responder, so what validate
 * proves is what the player gets.
 *
 * Every time here is a performance.now()-clock millisecond: the component
 * feeds `frame(ts)` the requestAnimationFrame timestamp (the onset of a
 * stimulus revealed in that callback, SCIENCE.md C2) and `press(t)` the
 * pointerdown event's own timestamp (eventTime).
 */

export const PVT = {
  /** scored block: the test ends with the first response after this much time */
  blockMs: 180_000,
  /** first lifetime run only: unscored practice, same machine and stop rule */
  practiceMs: 20_000,
  /** the ISI deck: 1,000 … 4,000 ms in 100 ms steps — 31 values */
  isiMinMs: 1_000,
  isiMaxMs: 4_000,
  isiStepMs: 100,
  /** the frozen RT / "FS" / "OVERRUN" display; it is part of the next ISI */
  feedbackMs: 1_000,
  /** no response by then → OVERRUN: a valid stimulus and a lapse at this RT */
  timeoutMs: 30_000,
  /** false start: a measured RT below this + the device offset */
  falseStartBaseMs: 100,
  /** lapse: a measured RT at or above this + the device offset (PVT-B threshold) */
  lapseBaseMs: 355,
  /** offset used when the context carries no usable one (SCIENCE.md: 60 ms placeholder) */
  fallbackOffsetMs: 60,
  /** validity: fewer valid stimuli than this → invalid */
  minValid: 40,
  /** validity: more false starts than this → invalid */
  maxFalseStarts: 10,
  /** quality flag on a valid run ("responding before the counter") */
  falseStartFlagAt: 4
} as const;

/** trialLog column 0 — what the row records */
export const CODE = {
  /** a response to a visible counter, RT ≥ the false-start threshold (valid) */
  response: 0,
  /** no response within 30 s — OVERRUN (valid, a lapse, RT = 30,000) */
  timeout: 1,
  /** a false start — a tap with no counter running (RT < 0) or too fast (0 ≤ RT < threshold) */
  falseStart: 2
} as const;

/** the 31 ISI values, ascending */
export const ISI_DECK: readonly number[] = Object.freeze(
  Array.from({ length: (PVT.isiMaxMs - PVT.isiMinMs) / PVT.isiStepMs + 1 }, (_, i) => PVT.isiMinMs + i * PVT.isiStepMs)
);

/**
 * Block-randomised ISIs: a shuffled deck of the 31 values, reshuffled from
 * the same seeded stream when exhausted — every session gets the same ISI
 * distribution and no run can be predicted from another.
 */
export class IsiStream {
  private readonly r: () => number;
  private deck: number[] = [];
  private i = 0;
  constructor(seed: number) {
    this.r = rng(seed);
  }
  next(): number {
    if (this.i >= this.deck.length) {
      this.deck = shuffle(this.r, ISI_DECK);
      this.i = 0;
    }
    return this.deck[this.i++];
  }
}

/** the first `n` ISIs a seed produces (the order stimuli consume them) */
export function isiSequence(seed: number, n: number): number[] {
  const s = new IsiStream(seed);
  return Array.from({ length: n }, () => s.next());
}

/** the practice block's own stream — distinct from the scored block's, still from the run seed */
export function practiceSeed(seed: number): number {
  return (seed ^ 0x9e3779b9) >>> 0;
}

/** the device offset actually used (a missing / hostile value falls back to the 60 ms placeholder) */
export function usableOffset(offsetMs: number): number {
  return Number.isFinite(offsetMs) && offsetMs >= 0 && offsetMs < 1000 ? offsetMs : PVT.fallbackOffsetMs;
}

/** the false-start and lapse thresholds on this device — both include the platform offset */
export function thresholds(offsetMs: number): { falseStartMs: number; lapseMs: number } {
  const off = usableOffset(offsetMs);
  return { falseStartMs: PVT.falseStartBaseMs + off, lapseMs: PVT.lapseBaseMs + off };
}

/** round to 0.1 ms — the trial log's resolution (scoring reads the log, so live and rescored agree) */
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** what the stimulus panel shows */
export type PvtDisplay =
  | { kind: 'blank' }
  | { kind: 'counter'; onset: number }
  | { kind: 'rt'; rt: number; until: number }
  | { kind: 'fs'; until: number }
  | { kind: 'overrun'; until: number };

export interface PvtPress {
  kind: 'response' | 'false-start';
  /** ms from the counter's onset (negative: no counter was running — how early) */
  rt: number;
  lapse: boolean;
  /** true when a counter was on screen (a too-fast response rather than a tap into the wait) */
  stimulus: boolean;
  /** this response ended the block (first response after the block time) */
  ended: boolean;
}

export interface PvtFrame {
  /** the counter must become visible in THIS frame (onset = the frame's timestamp) */
  revealed: boolean;
  /** the counter ran 30 s without a response: OVERRUN (play its sound) */
  timedOut: boolean;
  ended: boolean;
}

/**
 * One PVT-B block. Trial log rows (all numbers, times relative to `begin`):
 *   [code, isiMs, onsetMs, rtMs]
 *   code   CODE.response | CODE.timeout | CODE.falseStart
 *   isiMs  the interval that preceded the stimulus (for a false start into
 *          the wait: the interval that was running, and restarts)
 *   onsetMs  the counter's onset — for a false start into the wait, the
 *          onset that was scheduled; response time = onsetMs + rtMs always
 *   rtMs   measured RT (30,000 for a timeout; negative for a false start
 *          with no counter running), 0.1 ms resolution
 */
export class PvtSession {
  readonly durationMs: number;
  readonly offsetMs: number;
  readonly falseStartMs: number;
  readonly lapseMs: number;
  readonly rows: number[][] = [];
  display: PvtDisplay = { kind: 'blank' };
  ended = false;

  private readonly isi: IsiStream;
  private start = NaN;
  /** when the running interval started (last response, false start or timeout) */
  private isiStart = 0;
  /** the interval that will precede the next stimulus */
  private pending = 0;
  /** the interval that preceded the stimulus on screen */
  private current = 0;
  private onset = 0;
  private stim = false;

  constructor(o: { seed: number; offsetMs: number; durationMs: number }) {
    this.durationMs = o.durationMs;
    this.offsetMs = usableOffset(o.offsetMs);
    const th = thresholds(this.offsetMs);
    this.falseStartMs = th.falseStartMs;
    this.lapseMs = th.lapseMs;
    this.isi = new IsiStream(o.seed);
  }

  get started(): boolean {
    return Number.isFinite(this.start);
  }

  /** the block starts: the first interval runs from `t` */
  begin(t: number): void {
    if (this.started) return;
    this.start = t;
    this.isiStart = t;
    this.pending = this.isi.next();
  }

  elapsed(t: number): number {
    return this.started ? t - this.start : 0;
  }

  /** a running counter's onset, or NaN */
  get stimulusOnset(): number {
    return this.stim ? this.onset : NaN;
  }

  /**
   * Advance to the animation frame stamped `ts`: expire the 1 s feedback,
   * reveal the counter when its interval has run, time it out after 30 s.
   * Input that happened before this frame must be pressed first (browsers
   * dispatch input before running rAF callbacks).
   */
  frame(ts: number): PvtFrame {
    const out: PvtFrame = { revealed: false, timedOut: false, ended: false };
    if (this.ended || !this.started) return out;
    if (this.stim) {
      if (ts - this.onset >= PVT.timeoutMs) {
        const at = this.onset + PVT.timeoutMs;
        this.log(CODE.timeout, this.current, this.onset, PVT.timeoutMs);
        this.stim = false;
        this.display = { kind: 'overrun', until: at + PVT.feedbackMs };
        this.restartInterval(at, true);
        out.timedOut = true;
        // a timeout after the block time ends the block like a response would
        if (at - this.start >= this.durationMs) this.ended = out.ended = true;
      }
      return out;
    }
    const d = this.display;
    if ((d.kind === 'rt' || d.kind === 'fs' || d.kind === 'overrun') && ts >= d.until) this.display = { kind: 'blank' };
    // safety cap: false starts keep restarting the interval, so a block that
    // nobody lets reach a stimulus would never end — stop it one timeout late
    if (ts - this.start >= this.durationMs + PVT.timeoutMs) {
      this.ended = out.ended = true;
      return out;
    }
    if (ts >= this.isiStart + this.pending) {
      this.stim = true;
      this.onset = ts;
      this.current = this.pending;
      this.display = { kind: 'counter', onset: ts };
      out.revealed = true;
    }
    return out;
  }

  /** a tap (or key press) at `t`; null once the block has ended or before it began */
  press(t: number): PvtPress | null {
    if (this.ended || !this.started) return null;
    if (this.stim) {
      const rt = t - this.onset;
      this.stim = false;
      if (rt < this.falseStartMs) {
        // measured RT below 100 ms + offset: a false start, not a valid stimulus
        this.log(CODE.falseStart, this.current, this.onset, rt);
        this.display = { kind: 'fs', until: t + PVT.feedbackMs };
        this.restartInterval(t, true);
        return { kind: 'false-start', rt, lapse: false, stimulus: true, ended: false };
      }
      this.log(CODE.response, this.current, this.onset, rt);
      this.display = { kind: 'rt', rt, until: t + PVT.feedbackMs };
      this.restartInterval(t, true);
      const ended = t - this.start >= this.durationMs;
      if (ended) this.ended = true;
      return { kind: 'response', rt, lapse: rt >= this.lapseMs, stimulus: true, ended };
    }
    // no counter running (the wait, or the 1 s display): a false start — show
    // "FS" for 1 s and restart the SAME interval from the tap
    const scheduled = this.isiStart + this.pending;
    const rt = t - scheduled;
    this.log(CODE.falseStart, this.pending, scheduled, rt);
    this.display = { kind: 'fs', until: t + PVT.feedbackMs };
    this.restartInterval(t, false);
    return { kind: 'false-start', rt, lapse: false, stimulus: false, ended: false };
  }

  private restartInterval(from: number, draw: boolean): void {
    this.isiStart = from;
    if (draw) this.pending = this.isi.next();
  }

  private log(code: number, isi: number, onset: number, rt: number): void {
    this.rows.push([code, isi, round1(onset - this.start), round1(rt)]);
  }
}
