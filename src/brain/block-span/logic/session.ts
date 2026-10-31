import type { BrainRunOutcome } from '../../../platform/brain/types';
import { makeTrial, type TrialItem } from './layout';
import { LADDERS, type LadderConfig, type TrialKind } from './protocol';
import {
  buildOutcome,
  isCorrect,
  limitReasons,
  type RunCounters,
  type TrialRecord,
  type TrialResponse
} from './scoring';
import { stairStart, stairStep, type StairState } from './staircase';

/**
 * Block Span — one ladder of trials (first-run practice, the per-session
 * warm-up, or the scored block). The component and validate drive the SAME
 * object: it hands out the next trial (generated from the run seed), folds
 * each response into the staircase, keeps the interruption counters and
 * builds the outcome — so the protocol validate proves is the protocol the
 * player gets. No DOM, no React.
 *
 * A voided trial (pause, presentation timing) is logged but changes nothing
 * else: the next trial is drawn at the SAME length from a fresh attempt
 * stream, and the ladder still needs its full count of completed trials.
 */
export class TrialLadder {
  readonly config: LadderConfig;
  readonly seed: number;
  readonly records: TrialRecord[] = [];
  readonly counters: RunCounters = { interruptions: 0, pausedMs: 0, timeouts: 0, voidedTiming: 0 };
  private stair: StairState;
  private attempts = 0;

  constructor(seed: number, kind: TrialKind) {
    this.seed = seed >>> 0;
    this.config = LADDERS[kind];
    this.stair = stairStart(this.config.start);
  }

  /** trials completed and counted */
  get completed(): number {
    return this.records.filter((r) => r.status === 'scored').length;
  }

  get done(): boolean {
    return this.completed >= this.config.trials;
  }

  /** the length the next trial will have */
  get nextLength(): number {
    return this.stair.L;
  }

  /** the next trial attempt for an arena of side S */
  next(S: number): TrialItem {
    return makeTrial(this.seed, this.config.kind, this.attempts++, this.stair.L, this.config.n, S);
  }

  private record(item: TrialItem, status: TrialRecord['status'], resp: TrialResponse | null, correct: boolean): TrialRecord {
    const rec: TrialRecord = {
      status,
      kind: item.kind,
      attempt: item.attempt,
      L: item.L,
      correct,
      end: status === 'scored' && resp ? resp.end : 'voided',
      tapMs: resp?.tapMs.slice() ?? [],
      tapped: resp?.tapped.slice() ?? [],
      earlyTaps: resp?.earlyTaps ?? 0,
      maxOnDevMs: resp?.maxOnDevMs ?? 0,
      pathLen: item.pathLen,
      crossings: item.crossings,
      fallback: item.layout.fallback,
      S: item.layout.S,
      viewportW: resp?.viewportW ?? 0,
      viewportH: resp?.viewportH ?? 0
    };
    this.records.push(rec);
    return rec;
  }

  /** fold a finished trial into the ladder; returns its record */
  complete(item: TrialItem, resp: TrialResponse): TrialRecord {
    const correct = resp.end === 'complete' && isCorrect(item.seq, resp.tapped);
    const rec = this.record(item, 'scored', resp, correct);
    this.stair = stairStep(this.stair, correct, this.config);
    if (resp.end === 'timeout') this.counters.timeouts++;
    return rec;
  }

  /** a trial voided by a pause or by presentation timing — replaced at the same length, uncounted */
  void(item: TrialItem, why: 'pause' | 'timing', partial: TrialResponse | null): TrialRecord {
    if (why === 'timing') this.counters.voidedTiming++;
    return this.record(item, why === 'pause' ? 'voided-pause' : 'voided-timing', partial, false);
  }

  interruption(): void {
    this.counters.interruptions++;
  }

  addPausedMs(ms: number): void {
    if (Number.isFinite(ms) && ms > 0) this.counters.pausedMs += ms;
  }

  /** limits reached right now — a non-empty list ends the block early (invalid) */
  limitReasons(): string[] {
    return limitReasons(this.counters);
  }

  outcome(): BrainRunOutcome {
    return buildOutcome(this.records, this.counters);
  }
}
