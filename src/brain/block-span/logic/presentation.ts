import { PROTOCOL } from './protocol';

/**
 * Block Span — the presentation timeline as a pure frame-stepper
 * (SCIENCE.md §1.6 "Timeline", C2). The component calls `presentationEvent`
 * once per requestAnimationFrame callback with the time elapsed since the
 * layout's onset frame and applies AT MOST ONE change per frame, stamping
 * each change with that frame's timestamp — so a stalled frame shows up as
 * a measurably wrong ON period (and voids the trial) instead of a silently
 * skipped highlight.
 *
 * Timeline, from the layout onset (t = 0):
 *   0 … 1000          the new layout stands still
 *   1000 + 1000·i     highlight i on   (i = 0 … L − 1)
 *   1500 + 1000·i     highlight i off
 *   1000 + 1000·L     the recall cue ("Your turn") — 500 ms after the last off
 */

export interface Schedule {
  on: number[];
  off: number[];
  cue: number;
}

export function scheduleFor(L: number): Schedule {
  const on: number[] = [];
  const off: number[] = [];
  for (let i = 0; i < L; i++) {
    on.push(PROTOCOL.staticMs + i * (PROTOCOL.onMs + PROTOCOL.offMs));
    off.push(on[i] + PROTOCOL.onMs);
  }
  return { on, off, cue: (off[L - 1] ?? PROTOCOL.staticMs - PROTOCOL.offMs) + PROTOCOL.cueDelayMs };
}

export interface PresentState {
  /** the highlight being handled */
  i: number;
  /** is highlight i currently on? */
  lit: boolean;
  /** the cue has been given */
  cued: boolean;
}

export type PresentEvent = { type: 'on'; index: number } | { type: 'off'; index: number } | { type: 'cue' } | null;

export const PRESENT_START: PresentState = { i: 0, lit: false, cued: false };

/**
 * The change due at `elapsed` ms after onset, or null. A change is applied
 * on the first frame whose timestamp is within half a frame of its
 * scheduled time, which rounds every edge to the nearest frame.
 */
export function presentationEvent(s: PresentState, elapsed: number, sch: Schedule, halfFrame: number): PresentEvent {
  if (s.cued) return null;
  const L = sch.on.length;
  if (s.i < L) {
    if (!s.lit) return elapsed >= sch.on[s.i] - halfFrame ? { type: 'on', index: s.i } : null;
    return elapsed >= sch.off[s.i] - halfFrame ? { type: 'off', index: s.i } : null;
  }
  return elapsed >= sch.cue - halfFrame ? { type: 'cue' } : null;
}

export function applyPresentEvent(s: PresentState, ev: PresentEvent): PresentState {
  if (!ev) return s;
  if (ev.type === 'on') return { ...s, lit: true };
  if (ev.type === 'off') return { i: s.i + 1, lit: false, cued: false };
  return { ...s, cued: true };
}

/** |measured ON period − 500 ms| */
export function onDeviation(onTs: number, offTs: number): number {
  return Math.abs(offTs - onTs - PROTOCOL.onMs);
}

/** an ON period off by more than 50 ms voids the trial */
export function onPeriodOk(onTs: number, offTs: number): boolean {
  return onDeviation(onTs, offTs) <= PROTOCOL.onToleranceMs;
}
