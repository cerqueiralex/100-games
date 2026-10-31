/**
 * Brain Lab measurement helpers — dependency-free (no React, no DOM at import
 * time), so validate drives them directly. Two families:
 *
 *  1. Randomness. Every test derives ALL of its trial generation from the
 *     seed the runner hands it (`BrainTestProps.seed`), through `rng()`
 *     here — never `Math.random`. That is what makes each run a fresh
 *     alternate form (no item to memorise across days) while validate can
 *     replay a protocol exactly. Validate fails on `Math.random` anywhere
 *     under src/brain/.
 *
 *  2. Timing. A reaction time is response time minus stimulus ONSET, and
 *     both ends have a trap (see SCIENCE.md "Timing"):
 *      - onset: React state → paint is asynchronous, so the onset is stamped
 *        inside the requestAnimationFrame callback that reveals the stimulus
 *        (`revealOnFrame`), not when the state was set;
 *      - response: `click` fires on release (~80–120 ms late on touch), so
 *        responses are read on `pointerdown`, stamped with `eventTime(e)`.
 */

/* ---------- seeded randomness ---------- */

/** mulberry32 — a fast, well-distributed 32-bit PRNG. Returns floats in [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a fresh seed for a new run (the ONE sanctioned Math.random in the module) */
export function freshSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** integer in [lo, hi] inclusive */
export function randInt(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}

/** uniform float in [lo, hi) — e.g. a jittered inter-stimulus interval */
export function randRange(r: () => number, lo: number, hi: number): number {
  return lo + r() * (hi - lo);
}

export function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)];
}

/** Fisher–Yates, returning a new array */
export function shuffle<T>(r: () => number, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * A shuffled trial list with at most `maxRun` identical items in a row —
 * the standard constraint on trial sequences (long runs of one condition
 * let the player predict instead of respond). Falls back to the best
 * attempt rather than looping forever on an impossible constraint.
 */
export function shuffleNoRuns<T>(
  r: () => number,
  items: readonly T[],
  maxRun: number,
  key: (t: T) => string | number = (t) => String(t)
): T[] {
  let best = shuffle(r, items);
  let bestRun = longestRun(best, key);
  for (let attempt = 0; attempt < 200 && bestRun > maxRun; attempt++) {
    const next = shuffle(r, items);
    const run = longestRun(next, key);
    if (run < bestRun) {
      best = next;
      bestRun = run;
    }
  }
  return best;
}

function longestRun<T>(items: T[], key: (t: T) => string | number): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < items.length; i++) {
    run = i > 0 && key(items[i]) === key(items[i - 1]) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/* ---------- statistics ---------- */

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function median(xs: readonly number[]): number {
  if (!xs.length) return NaN;
  const a = xs.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** sample standard deviation (n − 1) */
export function sd(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** linear-interpolated quantile, q in [0, 1] */
export function quantile(xs: readonly number[], q: number): number {
  if (!xs.length) return NaN;
  const a = xs.slice().sort((x, y) => x - y);
  const pos = (a.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** median absolute deviation scaled to estimate an SD (1.4826 × MAD) */
export function robustSd(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = median(xs);
  return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
}

/**
 * z of a raw value against a literature anchor (μ, σ), oriented so that
 * higher is better. Non-finite input or a non-positive σ yields NaN, which
 * every caller treats as "no reference".
 */
export function zFrom(value: number, mu: number, sigma: number, better: 'higher' | 'lower' = 'higher'): number {
  if (!Number.isFinite(value) || !Number.isFinite(mu) || !(sigma > 0)) return NaN;
  return (better === 'higher' ? value - mu : mu - value) / sigma;
}

/**
 * THE index scale (SCIENCE.md §2.2): 50 + 10z, rounded, clamped to [0, 100]
 * — the neuropsychological T-score. Linear in z, so averaging indices is the
 * same as averaging z (percentiles are not additive), and it avoids SD 15,
 * the IQ metric. A normal-CDF / percentile mapping MUST NOT be used for any
 * index (no grade-A norms exist), and validate fails if one appears.
 * Returns NaN for a non-finite z ("no reference").
 */
export function indexFromZ(z: number): number {
  if (!Number.isFinite(z)) return NaN;
  return clamp(Math.round(50 + 10 * z), 0, 100);
}

/* ---------- timing ---------- */

/** high-resolution clock shared by stimulus onsets and responses */
export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * The best timestamp for an input event, on the same clock as `now()`.
 * `event.timeStamp` is when the browser received the input, which beats a
 * `now()` read after the handler was scheduled — but older engines report
 * epoch milliseconds, and a value from a different clock is worse than a
 * slightly late one, so it is trusted only when it is plausibly on the
 * `performance.now()` timeline (in the past, by less than a second).
 */
export function eventTime(e: { timeStamp: number }): number {
  const t = now();
  const ts = e.timeStamp;
  return Number.isFinite(ts) && ts > 0 && ts <= t && t - ts < 1000 ? ts : t;
}

/**
 * Run `reveal` inside the next animation frame and hand back the frame's
 * timestamp as the stimulus onset — the closest a browser gets to "the
 * moment it appeared". `reveal` should flip the stimulus visible through a
 * ref/DOM write (or a canvas draw), not through React state, which would
 * paint a frame or more later. Returns a cancel function.
 */
export function revealOnFrame(reveal: () => void, onOnset: (onset: number) => void): () => void {
  if (typeof requestAnimationFrame === 'undefined') {
    reveal();
    onOnset(now());
    return () => {};
  }
  const id = requestAnimationFrame((ts) => {
    reveal();
    onOnset(ts);
  });
  return () => cancelAnimationFrame(id);
}

/** the input kind of a pointer event, as stored on a session */
export function inputKind(e: { pointerType?: string }): 'touch' | 'mouse' | 'pen' {
  return e.pointerType === 'mouse' ? 'mouse' : e.pointerType === 'pen' ? 'pen' : 'touch';
}
