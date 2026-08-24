import { useEffect } from 'react';
import { sfx } from '../audio';
import { XP_PER_LEVEL, xpMeter, XP_SOURCE_LABEL, type XpAward } from '../progress/xp';

/**
 * Player level UI — the XP surfaces.
 *
 * XP chrome is painted with `--xp` (the streak orange), a SEMANTIC token
 * that deliberately does NOT follow the accent, exactly like --good/--bad:
 * levels must read the same whichever theme color the player picked, and
 * they sit beside the streak flame, which is that same orange. See
 * DESIGN.md "Player level & XP".
 */

/**
 * The circular XP ring with the level number inside — the home-header
 * token. `percent`/`level` override what XP would derive, for the level-up
 * card (a full ring showing the level just reached).
 */
export function LevelRing({
  xp,
  size = 44,
  percent,
  level,
  showNumber = false
}: {
  xp: number;
  size?: number;
  percent?: number;
  level?: number;
  /** print the level inside the ring — for the big hero/level-up dials. The
      chip leaves it off: the number sits beside it, as on the streak pill. */
  showNumber?: boolean;
}) {
  const derived = xpMeter(xp);
  const meter = { level: level ?? derived.level, percent: percent ?? derived.percent };
  // stroke-based arc: dependency-free SVG, like the profile charts
  const stroke = size < 40 ? 3.5 : 4;
  const r = (size - stroke) / 2 - 0.5;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      className="level-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      {/* nothing to draw at 0% — a zero-length round cap renders as a stray
          dot on an otherwise empty ring */}
      {meter.percent > 0 && (
        <circle
          className="level-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--xp)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(meter.percent / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {showNumber && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.4}
          fontWeight="800"
          fill="var(--text)"
        >
          {meter.level}
        </text>
      )}
    </svg>
  );
}

/** Compact level token for the home header, left of the streak pill. */
export function LevelChip({ xp }: { xp: number }) {
  const meter = xpMeter(xp);
  return (
    <div
      className="level-chip"
      title={`Level ${meter.level} — ${meter.into}/${XP_PER_LEVEL} XP`}
      aria-label={`Level ${meter.level}, ${meter.into} of ${XP_PER_LEVEL} XP`}
    >
      <LevelRing xp={xp} size={34} />
      <span className="level-chip-text">
        <span className="level-chip-num">{meter.level}</span>
        <span className="level-chip-label">level</span>
      </span>
    </div>
  );
}

/** The XP progress bar. `pending` grows it on mount for the level-up modal. */
export function XpBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="xp-bar" role="img" aria-label={label ?? `${Math.round(percent)}% to next level`}>
      <div className="xp-bar-fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

/**
 * The profile's first section: level on top, XP bar under it. Deliberately
 * shows total XP too — "how far to the next level" is the motivating number,
 * but players want to see the lifetime total they have banked.
 */
export function LevelHero({ xp }: { xp: number }) {
  const meter = xpMeter(xp);
  return (
    <div className="level-hero fx-card">
      <div className="level-hero-badge">
        <LevelRing xp={xp} size={96} showNumber />
      </div>
      <div className="level-hero-num">Level</div>
      <XpBar percent={meter.percent} label={`${meter.into} of ${XP_PER_LEVEL} XP to level ${meter.level + 1}`} />
      <p className="level-hero-sub">
        <span className="xp-strong">{meter.into}</span> / {XP_PER_LEVEL} XP ·{' '}
        <span className="xp-strong">{meter.remaining}</span> to level {meter.level + 1}
      </p>
      <p className="level-hero-note">{meter.total.toLocaleString()} XP earned in total</p>
    </div>
  );
}

/**
 * The XP block inside the results modal. Shows the total in the XP orange
 * with one line per source, so a big award is explained rather than
 * mysterious ("+100 XP" reads as a bug; "+80 Landmark earned" reads as a
 * reward).
 */
export function XpEarned({ award }: { award: XpAward }) {
  if (award.total <= 0) return null;
  return (
    <div className="xp-earned">
      <div className="xp-earned-total">
        <span className="xp-earned-num">+{award.total}</span>
        <span className="xp-earned-unit">XP</span>
      </div>
      <ul className="xp-earned-list">
        {award.entries.map((e, i) => (
          <li key={`${e.source}-${i}`}>
            <span className="xp-earned-src">
              {XP_SOURCE_LABEL[e.source]}
              {e.detail && <span className="xp-earned-detail"> · {e.detail}</span>}
            </span>
            <span className="xp-earned-amt">+{e.xp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The level-up celebration. Opens over the finished board BEFORE the
 * results modal (GameShell gates results on it), so the payoff lands on its
 * own instead of competing with a statistics table.
 */
export function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => {
    sfx.levelUp();
  }, []);

  return (
    <div className="modal-backdrop level-up-backdrop" onClick={onClose}>
      <div
        className="modal-card fx-card level-up-card"
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
      >
        <div className="level-up-burst" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`level-up-ray r${i}`} />
          ))}
          <div className="level-up-ring">
            <LevelRing xp={0} size={104} percent={100} level={level} showNumber />
          </div>
        </div>
        <h2 className="level-up-title">Level up!</h2>
        <p className="level-up-sub">
          You reached <span className="xp-strong">level {level}</span>
        </p>
        <div className="modal-actions">
          <button className="primary-btn" onClick={onClose}>
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}
