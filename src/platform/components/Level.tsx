import { useEffect } from 'react';
import { sfx } from '../audio';
import { XP_PER_LEVEL, xpMeter, XP_SOURCE_LABEL, type XpAward } from '../progress/xp';

/** The XP bar's height in px — the hero ring matches it (see .xp-bar). */
const XP_BAR_THICKNESS = 12;

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
  showNumber = false,
  label,
  stroke = size < 40 ? 3.5 : XP_BAR_THICKNESS
}: {
  xp: number;
  size?: number;
  percent?: number;
  level?: number;
  /** print the level inside the ring — for the big hero/level-up dials. The
      chip leaves it off: the number sits beside it, as on the streak pill. */
  showNumber?: boolean;
  /** small caption inside the ring instead of the level — the home chip
      writes "XP" there, since on a phone its outside caption is hidden and
      a bare dial tells a new player nothing. */
  label?: string;
  /** ring thickness; the hero matches the XP bar under it so the two read
      as one instrument instead of two unrelated shapes */
  stroke?: number;
}) {
  const derived = xpMeter(xp);
  const meter = { level: level ?? derived.level, percent: percent ?? derived.percent };
  // stroke-based arc: dependency-free SVG, like the profile charts
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
      {(showNumber || label) && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={label ? size * 0.3 : size * 0.4}
          fontWeight="800"
          letterSpacing={label ? '0.04em' : undefined}
          fill={label ? 'var(--xp)' : 'var(--text)'}
        >
          {label ?? meter.level}
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
      <LevelRing xp={xp} size={34} label="XP" />
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
        <LevelRing xp={xp} size={96} showNumber stroke={XP_BAR_THICKNESS} />
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
 * The XP block inside the results modal: a solid orange bar, white text.
 *
 * With ONE source (the common case) it is a single centred line — printing
 * a "+10" total above a "+10 Game played" row showed the same number twice
 * and read like a bug. The per-source breakdown only appears when there is
 * actually something to break down, because that is the case where a bare
 * "+100 XP" would be mysterious instead of a reward.
 */
export function XpEarned({ award }: { award: XpAward }) {
  if (award.total <= 0) return null;
  const only = award.entries.length === 1 ? award.entries[0] : null;
  const describe = (e: XpAward['entries'][number]) =>
    `${XP_SOURCE_LABEL[e.source]}${e.detail ? ` · ${e.detail}` : ''}`;

  return (
    <div className="xp-earned">
      <p className="xp-earned-head">
        <span className="xp-earned-num">+{award.total}</span>
        <span className="xp-earned-unit">XP</span>
        {only && <span className="xp-earned-why">{describe(only)}</span>}
      </p>
      {!only && (
        <ul className="xp-earned-list">
          {award.entries.map((e, i) => (
            <li key={`${e.source}-${i}`}>
              <span className="xp-earned-src">{describe(e)}</span>
              <span className="xp-earned-amt">+{e.xp}</span>
            </li>
          ))}
        </ul>
      )}
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
