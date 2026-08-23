import { CheckIcon } from '../design/icons';

/**
 * The standard win celebration — one animation every game shares.
 *
 * Why it exists: games used to slam the results modal over the board the
 * instant `onFinish` fired, which cut off the game's OWN payoff animation
 * (Pipes' water reaching the last tile, a card flipping, a beam landing).
 * Players read that as "something went wrong" instead of "I won".
 *
 * The rules that make it robust for all 67 games:
 *  - It never covers the board: the layer is `pointer-events: none`, the
 *    glow lights only the screen EDGES, confetti is thin, and the banner
 *    lifts away before the celebration ends. Whatever the game is drawing
 *    underneath keeps playing in full view.
 *  - It needs no per-game cooperation — the shell owns the timing, so a
 *    game that finishes mid-transition still gets its moment.
 *  - It is purely decorative: the result is already recorded when this
 *    mounts, so skipping/unmounting it can never lose data.
 */

/** Total celebration length. Every CSS animation in the `.win-fx` block is
    pinned to this, so nothing is cut off mid-flight when it changes. */
export const WIN_CELEBRATION_MS = 3500;

/** deterministic confetti scatter — computed once at module load so the
    pieces never re-shuffle on a re-render */
const BITS = Array.from({ length: 18 }, (_, i) => {
  const rnd = (salt: number) => {
    const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  // the latest piece lands at ~3.37s — inside WIN_CELEBRATION_MS, so no
  // confetti is still mid-air when the layer unmounts
  return {
    left: 3 + rnd(1) * 94,
    delay: 120 + rnd(2) * 800,
    dur: 1500 + rnd(3) * 950,
    size: 6 + rnd(4) * 5,
    spin: -420 + rnd(5) * 840,
    tone: i % 3
  };
});

export function WinCelebration({ label, subline }: { label: string; subline?: string }) {
  return (
    <div className="win-fx" role="status" aria-live="polite">
      {/* green light around the frame — the board stays clear */}
      <span className="win-glow" />
      <span className="win-ring" />
      <span className="win-ring two" />

      {BITS.map((b, i) => (
        <span
          key={i}
          className={`win-bit tone-${b.tone}`}
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size * 1.6}px`,
            animationDelay: `${b.delay}ms`,
            animationDuration: `${b.dur}ms`,
            ['--spin' as string]: `${b.spin}deg`
          }}
        />
      ))}

      <div className="win-banner">
        <span className="win-check">
          <CheckIcon size={20} />
        </span>
        <span className="win-words">
          <span className="win-title">{label}</span>
          {subline && <span className="win-sub">{subline}</span>}
        </span>
      </div>
    </div>
  );
}
