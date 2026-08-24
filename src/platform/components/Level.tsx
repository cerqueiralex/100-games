import { useEffect } from 'react';
import { sfx } from '../audio';
import {
  levelFromXp,
  RANK_TIERS,
  rankForXp,
  XP_PER_LEVEL,
  xpMeter,
  XP_SOURCE_LABEL,
  type RankTier,
  type XpAward
} from '../progress/xp';

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

/* ---------- rank crowns (the level ladder) ---------- */

/**
 * One rank crown: a white crown on the tier's material disc, with the same
 * darker rim every extruded token in the app wears.
 *
 * The crown is stroked in the rim color as well as filled white — on the
 * pale materials (silver, platinum) a bare white glyph on a bright disc
 * disappears, and one formula that survives all six beats six special cases.
 * Locked crowns are greyed by CSS (`.rank-step.locked`), never by different
 * art, exactly like the locked landmark plates.
 */
export function RankCrown({ rank, size = 32 }: { rank: RankTier; size?: number }) {
  const fill = `var(--rank-${rank.id})`;
  const rim = `var(--rank-${rank.id}-rim)`;
  return (
    <svg
      className="rank-crown"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${rank.name} crown, level ${rank.level}`}
    >
      <circle cx="32" cy="32" r="29" fill={fill} stroke={rim} strokeWidth="4" />
      {/* the shared 24-viewBox crown, scaled and centred inside the disc */}
      <g
        transform="translate(11.5 10.6) scale(1.71)"
        fill="#fff"
        stroke={rim}
        strokeWidth="1.05"
        strokeLinejoin="round"
      >
        <path d="M3.6 8.4 8.5 12.2 12 5.9 15.5 12.2 20.4 8.4 18.6 17.4 5.4 17.4Z" />
        <circle cx="3.6" cy="8.4" r="2.1" />
        <circle cx="12" cy="5.9" r="2.3" />
        <circle cx="20.4" cy="8.4" r="2.1" />
        <rect x="5.4" y="18.6" width="13.2" height="2.8" rx="0.7" />
      </g>
    </svg>
  );
}

/**
 * The whole crown ladder, always shown in full: earned crowns in their
 * material, the rest greyed. Showing only what you own would hide the
 * progression — the point of the row is that the next crown, and the level
 * it costs, are visible from level 1. The caption names where you are and
 * what is next, so the row needs no legend.
 */
export function RankLadder({ xp }: { xp: number }) {
  const level = levelFromXp(xp);
  const current = rankForXp(xp);
  const next = RANK_TIERS.find((t) => level < t.level) ?? null;
  return (
    <div className="rank-ladder">
      <div className="rank-steps">
        {RANK_TIERS.map((t) => (
          <div
            key={t.id}
            className={`rank-step ${level >= t.level ? '' : 'locked'}`}
            title={`${t.name} crown — level ${t.level}`}
          >
            <RankCrown rank={t} size={30} />
            <span className="rank-step-lvl">{t.level}</span>
          </div>
        ))}
      </div>
      <p className="rank-caption">
        {current ? (
          <>
            <span className="xp-strong">{current.name}</span> crown
          </>
        ) : (
          'No crown yet'
        )}
        {next ? ` · ${next.name} at level ${next.level}` : ' · every crown earned'}
      </p>
    </div>
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
  const rank = rankForXp(xp);
  return (
    <div className="level-hero fx-card">
      {/* the crown you are currently wearing, in the corner — the ladder
          below says how it was earned and what comes next */}
      {rank && (
        <span className="level-hero-rank" title={`${rank.name} crown — level ${rank.level}+`}>
          <RankCrown rank={rank} size={38} />
        </span>
      )}
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
      <RankLadder xp={xp} />
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
