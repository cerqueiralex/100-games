import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../audio';
import { eventTime, now } from '../brain/timing';
import { DUR, haptic, useReducedMotion } from '../motion';
import { BackspaceIcon, CheckIcon } from '../design/icons';

/**
 * Shared feedback, HUD and onboarding primitives — the "premium floor"
 * every game and Brain Lab test builds on (design/GAME-QUALITY.md). One
 * look, one timing, one sound family everywhere; reduced motion honoured
 * in one place. CSS: global.css "FX primitives".
 *
 *  - ResponseButton / NumberPad — answers that register on POINTERDOWN with
 *    the event's own timestamp (a click fires on release, ~80–120 ms late on
 *    touch — SCIENCE.md C2). The PadTool look, but for timed responses.
 *  - useFeedback — correct / wrong / neutral bursts + sound + haptic.
 *  - Countdown, TimerBar, PhaseCard — the shape of a timed block.
 *  - DemoStage, useDemoClock, DemoFinger — looping animated demonstrations.
 */

/* ---------- timed responses ---------- */

export interface ResponseButtonProps {
  /** `t` is the press time on the performance.now() clock (eventTime) */
  onPress: (t: number, e: PointerEvent | KeyboardEvent | MouseEvent) => void;
  /** hardware keys that press it on desktop (KeyboardEvent.key, case-insensitive) */
  keys?: string[];
  disabled?: boolean;
  /** toggled / selected look */
  active?: boolean;
  /** 'big': a tall response pad (two-choice tests); 'key': a number-pad key */
  variant?: 'tool' | 'big' | 'key';
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * A response control that fires on pointerdown (primary pointer only), on
 * its hardware keys, and on a keyboard-activated click (Enter/Space on the
 * focused button) — exactly once per press. It plays NO sound itself: the
 * test decides what a press means and sounds it (feedback integrity, C3).
 * State styles change paint only — it never moves or resizes (DESIGN.md
 * "Tile grids").
 */
export function ResponseButton({
  onPress,
  keys,
  disabled,
  active,
  variant = 'tool',
  className,
  ariaLabel,
  children
}: ResponseButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const press = useRef(onPress);
  press.current = onPress;

  useEffect(() => {
    if (!keys?.length || disabled) return;
    const wanted = keys.map((k) => k.toLowerCase());
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!wanted.includes(e.key.toLowerCase())) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      flash(ref.current);
      press.current(eventTime(e), e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys?.join('|'), disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={['pad-tool', 'resp-btn', `resp-${variant}`, active ? 'active' : '', className ?? ''].filter(Boolean).join(' ')}
      onPointerDown={(e) => {
        if (disabled || !e.isPrimary) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        flash(e.currentTarget);
        press.current(eventTime(e.nativeEvent), e.nativeEvent);
      }}
      onClick={(e) => {
        // pointer presses were handled on pointerdown; a click with detail 0
        // is a keyboard activation (Enter / Space) — an accessibility path
        if (e.detail === 0 && !disabled) press.current(now(), e.nativeEvent);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** a paint-only press flash (CSS `.resp-btn[data-down]`) that works on touch too */
function flash(el: HTMLElement | null) {
  if (!el) return;
  el.setAttribute('data-down', '');
  window.setTimeout(() => el.removeAttribute('data-down'), DUR.press + 60);
}

export interface NumberPadProps {
  /** 'phone': 1-2-3 / 4-5-6 / 7-8-9 / ⌫-0-✓ — 'digits9': 1–9 in a 3×3 grid */
  layout: 'phone' | 'digits9';
  onDigit: (d: number, t: number) => void;
  onBackspace?: (t: number) => void;
  onEnter?: (t: number) => void;
  /** lights the ✓ key when there is something to submit */
  enterReady?: boolean;
  disabled?: boolean;
  /** accept the hardware digit / Backspace / Enter keys (default true) */
  hardware?: boolean;
}

/** The number pad — the Keyboard component's numeric twin, built from ResponseButtons. */
export function NumberPad({ layout, onDigit, onBackspace, onEnter, enterReady, disabled, hardware = true }: NumberPadProps) {
  const digit = (d: number) => (
    <ResponseButton
      key={d}
      variant="key"
      disabled={disabled}
      keys={hardware ? [String(d)] : undefined}
      ariaLabel={String(d)}
      onPress={(t) => onDigit(d, t)}
    >
      <span className="num-key">{d}</span>
    </ResponseButton>
  );
  return (
    <div className={`number-pad number-pad-${layout}`} role="group" aria-label="Number pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit)}
      {layout === 'phone' && (
        <>
          <ResponseButton
            variant="key"
            disabled={disabled}
            keys={hardware ? ['Backspace'] : undefined}
            ariaLabel="Delete"
            onPress={(t) => onBackspace?.(t)}
          >
            <BackspaceIcon size={24} />
          </ResponseButton>
          {digit(0)}
          <ResponseButton
            variant="key"
            disabled={disabled}
            active={enterReady}
            className="num-enter"
            keys={hardware ? ['Enter'] : undefined}
            ariaLabel="Submit"
            onPress={(t) => onEnter?.(t)}
          >
            <CheckIcon size={26} />
          </ResponseButton>
        </>
      )}
    </div>
  );
}

/* ---------- feedback ---------- */

export type FeedbackKind = 'good' | 'bad' | 'neutral';

interface Burst {
  id: number;
  kind: FeedbackKind;
  x: number;
  y: number;
}

/**
 * The one feedback layer. `good`/`bad` play the shared sound, a haptic
 * where supported and a burst at (x, y) — percentages of the layer's
 * container, default centre; `neutral` is the quiet acknowledgement a
 * scored block without correctness feedback uses (C3). Render `layer` once,
 * inside a `position: relative` container that covers the stage.
 */
export function useFeedback() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const next = useRef(1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const fire = useCallback((kind: FeedbackKind, at?: { x: number; y: number }, sound = true, step = 0) => {
    if (sound) {
      if (kind === 'good') sfx.correct(step);
      else if (kind === 'bad') sfx.wrong();
      else sfx.tap();
    }
    if (kind !== 'neutral') haptic(kind);
    const id = next.current++;
    setBursts((b) => [...b.slice(-5), { id, kind, x: at?.x ?? 50, y: at?.y ?? 50 }]);
    timers.current.push(window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), DUR.feedback * 2));
  }, []);

  return {
    good: (at?: { x: number; y: number }, o?: { sound?: boolean; step?: number }) => fire('good', at, o?.sound ?? true, o?.step),
    bad: (at?: { x: number; y: number }, o?: { sound?: boolean }) => fire('bad', at, o?.sound ?? true),
    neutral: (at?: { x: number; y: number }, o?: { sound?: boolean }) => fire('neutral', at, o?.sound ?? false),
    layer: (
      <div className="fx-layer" aria-hidden>
        {bursts.map((b) => (
          <FeedbackBurst key={b.id} kind={b.kind} x={b.x} y={b.y} />
        ))}
      </div>
    )
  };
}

/** a ring + particles + glyph; reduced motion → the glyph fades, nothing flies */
export function FeedbackBurst({ kind, x, y, size = 'md' }: { kind: FeedbackKind; x: number; y: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`fx-burst fx-${kind} fx-${size}`} style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="fx-ring" />
      {kind !== 'neutral' &&
        Array.from({ length: 8 }, (_, i) => <span key={i} className="fx-spark" style={{ ['--a' as string]: `${i * 45}deg` }} />)}
      {kind !== 'neutral' && (
        <svg className="fx-glyph" viewBox="0 0 24 24" aria-hidden>
          {kind === 'good' ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M7 7l10 10M17 7L7 17" />}
        </svg>
      )}
    </span>
  );
}

/* ---------- the shape of a timed block ---------- */

/**
 * 3-2-1-go over the stage. Beats every `stepMs`, sounded with
 * sfx.countdown / sfx.go; `onDone` fires once, after "go". While `paused`
 * it holds and restarts from the top on resume (a half-seen countdown is
 * not a countdown).
 */
export function Countdown({
  from = 3,
  stepMs = 700,
  label = 'Get ready',
  paused = false,
  onDone
}: {
  from?: number;
  stepMs?: number;
  label?: string;
  paused?: boolean;
  onDone: () => void;
}) {
  const [n, setN] = useState(from);
  const done = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;
  useEffect(() => {
    if (paused || done.current) return;
    setN(from);
    sfx.countdown(from);
    let k = from;
    const id = window.setInterval(() => {
      k--;
      if (k > 0) {
        setN(k);
        sfx.countdown(k);
      } else {
        window.clearInterval(id);
        setN(0);
        sfx.go();
        done.current = true;
        window.setTimeout(() => cb.current(), Math.min(300, stepMs / 2));
      }
    }, stepMs);
    return () => window.clearInterval(id);
  }, [paused, from, stepMs]);
  return (
    <div className="countdown-veil" role="status" aria-live="assertive">
      <div className="countdown-card fx-card">
        <span key={n} className="countdown-num">
          {n > 0 ? n : 'Go'}
        </span>
        <span className="countdown-label">{label}</span>
      </div>
    </div>
  );
}

/**
 * A thin time-remaining bar for a fixed-time block. Purely decorative: the
 * block's real end is the test's own performance.now() clock — the bar is a
 * CSS animation of `totalMs`, restarted by changing `runKey`.
 */
export function TimerBar({ totalMs, running = true, runKey = 0, label = 'Time left' }: { totalMs: number; running?: boolean; runKey?: string | number; label?: string }) {
  return (
    <div className="timer-bar" role="progressbar" aria-label={label}>
      <span
        key={runKey}
        className="timer-bar-fill"
        style={{ animationDuration: `${totalMs}ms`, animationPlayState: running ? 'running' : 'paused' }}
      />
    </div>
  );
}

/**
 * A between-phases card inside the stage ("Warm-up · not scored", "Scored
 * block · 90 s"), with one primary action. Every test uses it for the same
 * moments, so the protocol reads the same everywhere (C1).
 */
export function PhaseCard({
  kicker,
  title,
  body,
  action,
  onAction,
  children
}: {
  kicker?: string;
  title: string;
  body?: ReactNode;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="phase-card fx-card">
      {kicker && <span className="phase-kicker">{kicker}</span>}
      <h3 className="phase-title">{title}</h3>
      {body && <div className="phase-body">{body}</div>}
      {children}
      {action && onAction && (
        <button type="button" className="primary-btn phase-action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ---------- animated demonstrations ---------- */

/**
 * Elapsed ms within a looping demo of `periodMs`, ticking at ~30 fps while
 * visible. Under reduced motion it parks at `stillAt` (a representative
 * frame) and never animates.
 */
export function useDemoClock(periodMs: number, stillAt = 0): number {
  const reduce = useReducedMotion();
  const [t, setT] = useState(reduce ? stillAt : 0);
  useEffect(() => {
    if (reduce) {
      setT(stillAt);
      return;
    }
    let raf = 0;
    let start = -1;
    let last = 0;
    const tick = (ts: number) => {
      if (start < 0) start = ts;
      if (ts - last >= 33) {
        last = ts;
        setT((ts - start) % periodMs);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [periodMs, reduce, stillAt]);
  return t;
}

/** the frame of a demo script active at time `t`: the last step whose `at` ≤ t */
export function demoStep<T extends { at: number }>(steps: readonly T[], t: number): T {
  let cur = steps[0];
  for (const s of steps) if (s.at <= t) cur = s;
  return cur;
}

/**
 * The demo card: an aspect-locked stage for the test's own miniature art
 * (absolutely positioned, % coordinates) plus a caption line. Pure
 * illustration — aria-hidden art, the caption carries the meaning.
 */
export function DemoStage({ children, caption, aspect = 4 / 3 }: { children: ReactNode; caption?: ReactNode; aspect?: number }) {
  return (
    <figure className="demo-stage">
      <div className="demo-canvas" style={{ aspectRatio: String(aspect) }} aria-hidden>
        {children}
      </div>
      {caption && <figcaption className="demo-caption">{caption}</figcaption>}
    </figure>
  );
}

/** an animated fingertip at (x, y)% of the stage; `down` shows the tap ripple */
export function DemoFinger({ x, y, down }: { x: number; y: number; down: boolean }) {
  return (
    <span className={`demo-finger${down ? ' down' : ''}`} style={{ left: `${x}%`, top: `${y}%` }}>
      <span className="demo-ripple" />
      <svg viewBox="0 0 32 40" aria-hidden>
        <path d="M12 4.5a3 3 0 0 1 6 0V18l6.6 1.4a4 4 0 0 1 3.2 4.4l-1.3 9.4A5 5 0 0 1 21.5 37.5h-6.2a5 5 0 0 1-4-2L5 27.4a2.6 2.6 0 0 1 3.9-3.4L12 26.5Z" />
      </svg>
    </span>
  );
}
