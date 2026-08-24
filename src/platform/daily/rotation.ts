import type { Difficulty, GameDefinition } from '../types';
import { GAMES } from '../registry';
import { hashSeed, mulberry32 } from './seededRandom';

/**
 * Which game is today's Daily Challenge.
 *
 * Pure function of the calendar date and the registry — nothing persisted,
 * nothing to sync, so two devices agree without ever talking to each other.
 *
 * THE DERIVATION RULE (same discipline as the landmark catalogue): the
 * eligible list is computed from `GAMES`, never enumerated here. A game opts
 * in by declaring `dailyChallenge` in its own definition, and the rotation
 * picks it up automatically.
 */

/** Games that opted in, in registry order (the shuffle needs a stable base). */
export function eligibleGames(): GameDefinition[] {
  return GAMES.filter((g) => g.dailyChallenge?.eligible);
}

/** The fixed difficulty a game is played at as a daily — medium unless it says otherwise. */
export function dailyDifficulty(game: GameDefinition): Difficulty {
  return game.dailyChallenge?.difficulty ?? 'medium';
}

/**
 * Days since the epoch for a 'YYYY-MM-DD' local calendar day.
 *
 * Built through `Date.UTC` on the already-local date parts rather than
 * dividing a local timestamp: the key is a pure calendar value by the time
 * it reaches here, and running it back through a local timestamp would let
 * a DST shift or a timezone change move a date by one whole day — which
 * would hand that player a different game than everyone else.
 */
export function dayIndexOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Fisher–Yates driven by the seeded PRNG — a pure function of (items, seed). */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The order for one cycle: a fresh shuffle of the whole eligible list, so
 * every game comes up exactly once per cycle and the order is not
 * memorizable from cycle to cycle.
 *
 * The one adjustment: a shuffle can put a game last in one cycle and first
 * in the next, which reads as "the same game two days running" even though
 * the within-cycle rule was honoured. When that happens the first two
 * entries swap — still exactly one appearance each, minus the repeat.
 */
function cycleOrder(games: GameDefinition[], cycleNumber: number): GameDefinition[] {
  const order = seededShuffle(games, hashSeed(`cycle:${cycleNumber}`));
  // needs at least 3 games for a swap to help; below that a repeat is
  // unavoidable and honest
  if (games.length < 3 || cycleNumber <= 0) return order;
  const prev = seededShuffle(games, hashSeed(`cycle:${cycleNumber - 1}`));
  // the previous cycle's own swap never touches its LAST slot (it swaps
  // slots 0 and 1), so the unadjusted shuffle is the right thing to read
  if (order[0].id === prev[prev.length - 1].id) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export interface DailyAssignment {
  gameId: string;
  difficulty: Difficulty;
  /** the puzzle seed — derived from the date AND the game, so two games on
      the same date do not share a board layout */
  seed: number;
}

/**
 * Today's assignment, computed fresh. Callers must persist the first result
 * for a given date (see store.ts): this depends on the current eligible-list
 * length, so adding or removing a game shifts every *future* date — which is
 * fine — but must never be allowed to rewrite a date already played.
 */
export function assignmentFor(dateKey: string): DailyAssignment | null {
  const games = eligibleGames();
  if (games.length === 0) return null;

  const dayIndex = dayIndexOf(dateKey);
  if (!Number.isFinite(dayIndex)) return null;

  const cycleLength = games.length;
  const cycleNumber = Math.floor(dayIndex / cycleLength);
  // JS % keeps the sign of the dividend; dates before 1970 would index
  // backwards off the front of the array
  const position = ((dayIndex % cycleLength) + cycleLength) % cycleLength;
  const game = cycleOrder(games, cycleNumber)[position];

  return {
    gameId: game.id,
    difficulty: dailyDifficulty(game),
    seed: hashSeed(`${dateKey}:${game.id}`)
  };
}
