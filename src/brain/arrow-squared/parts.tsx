import type { PointerEvent as ReactPointerEvent } from 'react';
import { eventTime, now } from '../../platform/brain/timing';
import { DUR } from '../../platform/motion';
import type { Dir, Side } from './logic/items';

/*
 * Arrow Squared — presentational parts shared by the test, the tutorial and
 * the demo: the SVG chevron, a 5-arrow row and the option pad button. All
 * ink is currentColor (theme tokens via CSS); nothing here animates a
 * stimulus — onsets are applied by the test through an opacity switch
 * inside requestAnimationFrame (SCIENCE.md C2).
 */

/** right- and left-pointing chevrons in a 24-unit box, drawn as round-capped strokes */
const CHEVRON: Record<Dir, string> = {
  0: 'M14.6 4.6 7.2 12l7.4 7.4',
  1: 'M9.4 4.6 16.8 12l-7.4 7.4'
};

export const dirWord = (d: Dir) => (d === 0 ? 'left' : 'right');

/** "left left right left left" — the row for screen readers */
export function describeRow(dirs: readonly Dir[]): string {
  return dirs.map(dirWord).join(' ');
}

/**
 * Tutorial / demo emphasis: 'outer' lights the four flankers and dims the
 * centre; 'centre' does the opposite. The live test never marks anything.
 */
export type RowMark = 'outer' | 'centre';

export function ArrowRow({
  dirs,
  size,
  mark,
  label
}: {
  dirs: readonly Dir[];
  size: 'target' | 'option' | 'demo-target' | 'demo-option';
  mark?: RowMark;
  /** an accessible name; omitted = decorative (the owning control names it) */
  label?: string;
}) {
  return (
    <span
      className={`asq-row asq-row-${size}${mark ? ` mark-${mark}` : ''}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {dirs.map((d, i) => {
        const centre = i === 2;
        const cls = !mark ? '' : (mark === 'outer') !== centre ? ' hi' : ' dim';
        return (
          <svg key={i} className={`asq-chev${cls}`} viewBox="0 0 24 24" data-dir={d === 0 ? 'l' : 'r'} aria-hidden>
            <path d={CHEVRON[d]} />
          </svg>
        );
      })}
    </span>
  );
}

/** the "outer · ignore · outer" captions that sit under a marked target row */
export function TargetTags({ mark }: { mark: RowMark }) {
  return (
    <span className="asq-tags" aria-hidden>
      {mark === 'outer' ? (
        <>
          <span className="asq-tag hi">outer</span>
          <span className="asq-tag dim">ignore</span>
          <span className="asq-tag hi">outer</span>
        </>
      ) : (
        <>
          <span className="asq-tag dim">ignore</span>
          <span className="asq-tag hi">middle</span>
          <span className="asq-tag dim">ignore</span>
        </>
      )}
    </span>
  );
}

/** a paint-only press flash that also works for a second thumb (CSS `.asq-opt[data-down]`) */
export function flashPress(el: HTMLElement) {
  el.setAttribute('data-down', '');
  window.setTimeout(() => el.removeAttribute('data-down'), DUR.press + 70);
}

/**
 * One option pad. It answers on POINTERDOWN with the event's own timestamp
 * (C2) and — unlike the shared ResponseButton, which only accepts the
 * primary pointer — on ANY touch: in a two-thumb posture the second thumb
 * often lands while the first is still on the glass (or a thumb rests on the
 * screen edge), and that touch is non-primary. Dropping it would freeze the
 * test for that player. Sound and feedback belong to the test (C3).
 */
export function OptionButton({
  side,
  dirs,
  disabled,
  mark,
  verdict,
  onPress
}: {
  side: Side;
  dirs: readonly Dir[];
  disabled?: boolean;
  mark?: RowMark;
  /** tutorial only: outlines the pad after the explanation is shown */
  verdict?: 'right' | 'wrong';
  onPress: (side: Side, t: number) => void;
}) {
  const name = `${side === 0 ? 'Left' : 'Right'} option: ${describeRow(dirs)}`;
  return (
    <button
      type="button"
      className={`asq-opt${verdict ? ` verdict-${verdict}` : ''}`}
      data-side={side}
      aria-label={name}
      aria-disabled={disabled || undefined}
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        flashPress(e.currentTarget);
        onPress(side, eventTime(e.nativeEvent));
      }}
      onClick={(e) => {
        // pointer presses were handled on pointerdown; detail 0 = keyboard activation
        if (e.detail === 0 && !disabled) onPress(side, now());
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="asq-opt-face asq-stim">
        <ArrowRow dirs={dirs} size="option" mark={mark} />
      </span>
    </button>
  );
}
