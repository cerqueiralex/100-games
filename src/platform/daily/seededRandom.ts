/**
 * Deterministic randomness for the Daily Challenge.
 *
 * Every player must generate the SAME board from the same date, with no
 * server and no sync. The games already build their boards from
 * `Math.random`, so rather than refactoring two dozen generators to thread a
 * PRNG through, we swap `Math.random` for a seeded one around the single
 * call that generates the board — the same technique `scripts/validate.ts`
 * uses to make its generator checks reproducible.
 *
 * The patch is deliberately NARROW. It is never left in place during play:
 * a game's own randomness (an AI's choice, a tile spawn, a shuffle mid-run)
 * must stay unseeded, or a daily run would quietly become a different game
 * from the normal one.
 */

/** mulberry32 — 32-bit, no dependencies, good enough for puzzle layout. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over the string, as an unsigned 32-bit int — the seed for mulberry32. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Runs `fn` with `Math.random` replaced by a stream seeded from `seed`, and
 * restores the real one afterwards — including when `fn` throws, which is
 * why the restore lives in a `finally`. Leaving the app running on a seeded
 * `Math.random` would silently make every later shuffle in the session
 * replay the same sequence.
 *
 * Nesting is safe: each call restores whatever was installed when it began.
 */
export function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    const out = fn();
    /*
     * `fn` MUST be synchronous. An async one returns its promise at the
     * first await, so `finally` restores Math.random before the generator
     * has drawn a single number — the board comes out unseeded and every
     * player gets a different one, silently. That is the worst failure this
     * feature has, so it is an error rather than a comment nobody reads.
     */
    if (out && typeof (out as { then?: unknown }).then === 'function') {
      throw new Error(
        'withSeededRandom: the callback must be synchronous — await the module first, then seed the generator call'
      );
    }
    return out;
  } finally {
    Math.random = original;
  }
}

/**
 * The form games call: seeded when a daily seed is present, untouched
 * otherwise. Keeping the branch here means an eligible game's board line
 * reads the same whether it is being played as today's challenge or not.
 */
export function withSeed<T>(seed: number | undefined, fn: () => T): T {
  return seed === undefined ? fn() : withSeededRandom(seed, fn);
}
