import type { StreakInfo } from '../progress/progress';
import { CheckIcon } from '../design/icons';

/**
 * Streak UI — the Duolingo-style play-streak surfaces. The flame is game
 * CONTENT (like memory-card faces), so it keeps a fixed identity color from
 * the content palette (--play-*) instead of following the accent; grayscale
 * "cold"/zero states are handled in CSS with a filter.
 */

/** The sticker-style flame. `color` recolors the body (streak landmark
    tiers); `label` prints a number inside the white drop. */
export function FlameArt({
  size = 32,
  color = 'var(--play-7)',
  label
}: {
  size?: number;
  color?: string;
  label?: string;
}) {
  const long = (label?.length ?? 0) > 2;
  return (
    <svg className="streak-flame" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path
        d="M32 5 C 39 15, 53 22, 53 38 A 21 21 0 0 1 11 38 C 11 22, 25 15, 32 5 Z"
        fill={color}
        stroke="var(--ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M32 27 C 36 33, 43 35, 43 44 A 11 11 0 0 1 21 44 C 21 35, 28 33, 32 27 Z"
        fill="var(--play-9)"
      />
      {label && (
        <text
          x="32"
          y={long ? 47.5 : 48.5}
          textAnchor="middle"
          fontSize={long ? 10.5 : 13.5}
          fontWeight="800"
          fill="var(--ink)"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/** Compact streak card for the home header (next to the avatar). Cold
    (not yet played today) renders grayscale as a nudge to play. */
export function StreakChip({ streak }: { streak: StreakInfo }) {
  return (
    <div
      className={`streak-chip ${streak.playedToday ? '' : 'cold'}`}
      title={streak.playedToday ? 'Streak extended today' : 'Play a game to extend your streak'}
      aria-label={`${streak.current} day play streak`}
    >
      <FlameArt size={30} />
      <span className="streak-chip-text">
        <span className="streak-chip-num">{streak.current}</span>
        <span className="streak-chip-label">day streak</span>
      </span>
    </div>
  );
}

/** The big profile streak card: flame, count, Mo–Su week row, best/total. */
export function StreakHero({ streak }: { streak: StreakInfo }) {
  const message =
    streak.playedToday
      ? 'Streak extended today — see you tomorrow!'
      : streak.current > 0
        ? 'Play any game today to keep your streak alive!'
        : 'Play any game to light your streak!';
  return (
    <div className={`streak-hero fx-card ${streak.current === 0 ? 'cold' : ''}`}>
      <FlameArt size={72} />
      <div className="streak-hero-num">{streak.current}</div>
      <div className="streak-hero-label">day streak</div>
      <div className="week-row" aria-hidden>
        {streak.week.map((d) => (
          <div
            key={d.label}
            className={`week-day ${d.played ? 'played' : ''} ${d.isToday ? 'today' : ''}`}
          >
            <span className="week-day-name">{d.label}</span>
            <span className="week-day-dot">{d.played && <CheckIcon size={14} />}</span>
          </div>
        ))}
      </div>
      <p className="streak-hero-sub">
        Best {streak.best} {streak.best === 1 ? 'day' : 'days'} · {streak.totalDays}{' '}
        {streak.totalDays === 1 ? 'day' : 'days'} played
      </p>
      <p className="streak-hero-note">{message}</p>
    </div>
  );
}
