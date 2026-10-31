import { useEffect, useState } from 'react';

/**
 * Motion — the JS/canvas twins of the motion tokens in design/tokens.css
 * (keep the numbers in step; validate compares them). See
 * design/GAME-QUALITY.md "Motion". Dependency-free apart from React's hooks,
 * and no DOM access at import, so validate can import it under Node.
 */

export const DUR = { press: 80, fast: 140, base: 220, feedback: 360, emphasis: 600 } as const;

/** cubic-bezier(0.22, 1, 0.36, 1) — the default exit/arrive curve, as a function of t ∈ [0, 1] */
export function easeOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 4);
}

/** a damped overshoot for pops and lands (≈ --ease-spring) */
export function spring(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.cos(x * Math.PI * 1.5) * Math.exp(-5 * x);
}

/** true when the player asked the OS for reduced motion */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** live reduced-motion preference */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

/**
 * A short vibration where the platform supports it (Android; iOS Safari has
 * no Vibration API, so this is silently a no-op there). Always paired with a
 * visual and an audio cue — never the only feedback.
 */
export function haptic(kind: 'tap' | 'good' | 'bad' = 'tap'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(kind === 'bad' ? [18, 40, 18] : kind === 'good' ? 12 : 6);
  } catch {
    /* some browsers throw without a user gesture — feedback is best-effort */
  }
}
