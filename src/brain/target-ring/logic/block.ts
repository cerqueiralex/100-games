import type { ConditionId } from './geometry';
import { buildPlan } from './plan';
import { MAX_VOIDS, measureSequence, sequenceValid, type SequenceRecord, type Tap } from './scoring';

/**
 * The scored block's bookkeeping (SCIENCE.md §1.9 "Blocks", "Trial
 * exclusions", "Input"; C5 class B). Pure and immutable so validate can
 * drive whole runs through it:
 *  - the queue starts as the 12 planned slots;
 *  - a FIRST attempt with more than 3 exclusions appends one re-run of its
 *    slot at the end (a re-run that fails again leaves the slot invalid);
 *  - a sequence interrupted mid-flight (pause, hidden page, rotation) is
 *    voided — nothing of it is kept — and a replacement with the same slot
 *    and attempt is appended at the end; more than 2 voids invalidate the
 *    run [DC, the limit Memory uses].
 * Appended items always go to the END, so queue positions 0–11 are always
 * the plan's 12 slots in order.
 */

export interface QueueItem {
  slot: number;
  cond: ConditionId;
  attempt: 0 | 1;
  origin: 'plan' | 'rerun' | 'replacement';
}

export interface BlockState {
  queue: QueueItem[];
  /** the item in play (or next to play) */
  pos: number;
  records: SequenceRecord[];
  interruptions: number;
}

export function startBlock(seed: number): BlockState {
  return {
    queue: buildPlan(seed).map((cond, slot) => ({ slot, cond, attempt: 0, origin: 'plan' })),
    pos: 0,
    records: [],
    interruptions: 0
  };
}

export function currentItem(s: BlockState): QueueItem | undefined {
  return s.queue[s.pos];
}

/** the current sequence finished all 13 selections */
export function completeSequence(s: BlockState, start: Tap, taps: Tap[]): BlockState {
  const item = s.queue[s.pos];
  if (!item) return s;
  const rec: SequenceRecord = { slot: item.slot, cond: item.cond, attempt: item.attempt, start, taps: taps.slice() };
  const queue = s.queue.slice();
  if (item.attempt === 0 && !sequenceValid(measureSequence(rec))) {
    queue.push({ slot: item.slot, cond: item.cond, attempt: 1, origin: 'rerun' });
  }
  return { ...s, queue, pos: s.pos + 1, records: [...s.records, rec] };
}

/** the current sequence was interrupted after its start tap: void it and append a replacement */
export function voidSequence(s: BlockState): { state: BlockState; overLimit: boolean } {
  const item = s.queue[s.pos];
  if (!item) return { state: s, overLimit: false };
  const interruptions = s.interruptions + 1;
  return {
    state: { ...s, queue: [...s.queue, { ...item, origin: 'replacement' }], pos: s.pos + 1, interruptions },
    overLimit: interruptions > MAX_VOIDS
  };
}

export function blockDone(s: BlockState): boolean {
  return s.pos >= s.queue.length;
}

/** completed share of the (possibly grown) queue */
export function blockProgress(s: BlockState): number {
  return s.queue.length ? Math.min(1, s.pos / s.queue.length) : 0;
}
