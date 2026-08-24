import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  LANDMARKS,
  landmarkMeter,
  type LandmarkDef,
  type PlayerProgress,
  type StreakInfo
} from '../progress/progress';
import { categoryName } from '../categories';
import { useAppState } from '../AppState';
import { FlameArt } from './Streak';
import { RankCrown } from './Level';
import { RANK_TIERS } from '../progress/xp';
import { Chip, Modal } from './ui';
import { LockIcon } from '../design/icons';
import {
  alpha,
  CARD_H,
  CARD_W,
  drawCardChrome,
  EMOJI_FONT,
  FONT,
  hexToRgb,
  pill,
  ShareImageModal
} from './ShareCard';
import { sfx } from '../audio';

/**
 * Landmarks — the profile trophy collection. Every landmark is always
 * visible: locked cards render their art grayscale at soft opacity behind a
 * padlock; unlocking colors them in. Art is drawn from the content palette
 * (--play-* tokens), so it stays colorful and identical across accent
 * themes, like game stickers — grayscale comes from a CSS filter, not from
 * separate art.
 */

const ROMAN: Record<string, string> = { easy: 'I', medium: 'II', hard: 'III', pro: 'IV', extreme: 'V' };

/** sticker-style SVG art per landmark kind, colored via --lm (set on the
    plate from the def's content-palette slot) */
export function LandmarkArt({ def, size = 44 }: { def: LandmarkDef; size?: number }) {
  const lm = `var(--play-${def.slot})`;
  switch (def.kind) {
    case 'streak':
      return <FlameArt size={size} color={lm} label={String(def.days)} />;
    case 'first':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 10 L37.3 24.7 L52.9 25.2 L40.6 34.8 L44.9 49.8 L32 41 L19.1 49.8 L23.4 34.8 L11.1 25.2 L26.7 24.7 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M53 6 L55.5 10.5 L53 15 L50.5 10.5 Z" fill="var(--play-6)" />
          <path d="M11 48 L13.5 52.5 L11 57 L8.5 52.5 Z" fill="var(--play-6)" />
        </svg>
      );
    case 'plays': {
      // a stack of finished boards; the rung's count is the whole message
      const n = String(def.count);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="16" y="5" width="42" height="42" rx="10" fill={lm} opacity="0.4" />
          <rect x="6" y="14" width="45" height="45" rx="11" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <text
            x="28.5"
            y="43.5"
            textAnchor="middle"
            fontSize={n.length >= 4 ? 15 : 19}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'clean-wins': {
      const n = String(def.count);
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 5 57 18.5 57 45.5 32 59 7 45.5 7 18.5Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* the tick is what separates this ladder from plays: these are
              the wins nobody helped with */}
          <path
            d="M23 24.5 29.5 31 41 19"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="49"
            textAnchor="middle"
            fontSize={n.length >= 4 ? 14 : 17}
            fontWeight="800"
            fill="var(--play-9)"
          >
            {n}
          </text>
        </svg>
      );
    }
    case 'level': {
      const tier = RANK_TIERS.find((t) => t.id === def.rank);
      return tier ? <RankCrown rank={tier} size={size} /> : null;
    }
    case 'all-played':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <rect x="9" y="9" width="21" height="21" rx="6" fill="var(--play-4)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="34" y="9" width="21" height="21" rx="6" fill="var(--play-3)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="9" y="34" width="21" height="21" rx="6" fill="var(--play-1)" stroke="var(--ink)" strokeWidth="3" />
          <rect x="34" y="34" width="21" height="21" rx="6" fill="var(--play-2)" stroke="var(--ink)" strokeWidth="3" />
        </svg>
      );
    case 'difficulty':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path
            d="M32 6 L54 13 V33 C54 46 45 54 32 59 C19 54 10 46 10 33 V13 Z"
            fill={lm}
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <text x="32" y="40" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--play-9)">
            {ROMAN[def.difficulty!]}
          </text>
        </svg>
      );
    case 'category':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
          <path d="M23 38 L18 58 L28 52 L30 41 Z" fill={lm} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <path d="M41 38 L46 58 L36 52 L34 41 Z" fill={lm} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="26" r="17" fill={lm} stroke="var(--ink)" strokeWidth="3" />
          <circle
            cx="32"
            cy="26"
            r="11.5"
            fill="none"
            stroke="var(--play-9)"
            strokeWidth="2"
            strokeDasharray="2.5 3.2"
            opacity="0.75"
          />
          <text x="32" y="31.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--play-9)">
            {categoryName(def.category!)[0]}
          </text>
        </svg>
      );
  }
}

/* ---------- shareable landmark card (canvas, same family as the win card) ---------- */

function resolvePlayColor(slot: number): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--play-${slot}`).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ff9f0a';
}

/** the card's headline number and its caption, one per landmark kind */
function cardStat(def: LandmarkDef, total: number): [string, string] {
  switch (def.kind) {
    case 'streak':
      return [String(def.days), 'DAY STREAK'];
    case 'first':
      return ['GO!', 'THE COLLECTION BEGINS'];
    case 'plays':
      return [String(def.count), 'GAMES FINISHED'];
    case 'clean-wins':
      return [String(def.count), 'WINS WITH NO HELP'];
    case 'level':
      return [String(def.level), `LEVEL · ${def.title.toUpperCase()}`];
    case 'all-played':
      return [String(total), 'GAMES PLAYED'];
    case 'difficulty':
      return [String(total), `GAMES BEATEN ON ${def.difficulty!.toUpperCase()}`];
    case 'category':
      return [String(total), `${categoryName(def.category!).toUpperCase()} GAMES BEATEN`];
  }
}

function renderLandmarkCard(
  def: LandmarkDef,
  unlockedAt: number,
  total: number,
  player: { name: string; emoji: string }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const COLOR = resolvePlayColor(def.slot);
  const RGB = hexToRgb(COLOR);
  const W = CARD_W;

  const t = drawCardChrome(ctx, RGB, RGB);

  // emblem
  ctx.font = `170px ${EMOJI_FONT}`;
  ctx.fillText(def.emoji, W / 2, 330);

  // headline
  ctx.fillStyle = COLOR;
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText('L A N D M A R K   U N L O C K E D', W / 2, 478);

  // title
  ctx.fillStyle = t.text;
  ctx.font = `800 ${def.title.length > 12 ? 84 : 104}px ${FONT}`;
  ctx.fillText(def.title, W / 2, 588);

  // requirement pill
  pill(ctx, def.requirement.toUpperCase(), W / 2, 700, COLOR, `rgba(${RGB},0.14)`, `700 30px ${FONT}`, 34, 62);

  // the big middle stat — exhaustive on kind, never a fallback: a new
  // landmark kind falling into the category branch would read another
  // trophy's caption (and crash on the missing category name)
  const stat = cardStat(def, total);
  ctx.fillStyle = COLOR;
  ctx.font = `800 190px ${FONT}`;
  ctx.fillText(stat[0], W / 2, 905);
  ctx.fillStyle = alpha(t.text, 0.6);
  ctx.font = `700 33px ${FONT}`;
  ctx.fillText(stat[1], W / 2, 1030);

  // unlock date
  const date = new Date(unlockedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  pill(ctx, `★  UNLOCKED ${date.toUpperCase()}`, W / 2, 1150, '#30d158', 'rgba(48,209,88,0.13)', `700 29px ${FONT}`, 36, 62);

  // footer
  ctx.fillStyle = alpha(t.text, 0.6);
  ctx.font = `600 33px ${FONT}`;
  ctx.fillText(`${player.emoji} ${player.name}  ·  100 GAMES`, W / 2, 1256);

  return canvas;
}

/* ---------- the gallery ---------- */

function LandmarkCard({
  def,
  unlockedAt,
  meter,
  onClick
}: {
  def: LandmarkDef;
  unlockedAt: number | null;
  meter: { done: number; total: number };
  onClick: () => void;
}) {
  const locked = unlockedAt === null;
  return (
    <button
      className={`lm-card fx-card ${locked ? 'locked' : ''}`}
      style={{ '--lm': `var(--play-${def.slot})` } as CSSProperties}
      onClick={onClick}
      aria-label={`${def.title} — ${locked ? 'locked' : 'unlocked'}`}
    >
      {locked && (
        <span className="lm-lock" aria-hidden>
          <LockIcon size={14} />
        </span>
      )}
      <span className="lm-plate">
        <LandmarkArt def={def} size={40} />
      </span>
      <span className="lm-title">{def.title}</span>
      <span className="lm-sub">
        {locked
          ? `${meter.done}/${meter.total}`
          : new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </button>
  );
}

export function LandmarksSection({
  progress,
  streak
}: {
  progress: PlayerProgress;
  streak: StreakInfo;
}) {
  const { profile } = useAppState();
  const [selected, setSelected] = useState<LandmarkDef | null>(null);
  const [sharing, setSharing] = useState<LandmarkDef | null>(null);

  const unlockedCount = LANDMARKS.filter((d) => progress.landmarks[d.id]).length;

  const selectedUnlock = selected ? (progress.landmarks[selected.id] ?? null) : null;
  const selectedMeter = selected ? landmarkMeter(selected, progress, streak) : null;

  return (
    <section className="setup-section">
      <h3 className="section-title lm-head">
        Landmarks
        <span className="lm-count">
          {unlockedCount} / {LANDMARKS.length}
        </span>
      </h3>
      <div className="lm-grid">
        {LANDMARKS.map((def) => (
          <LandmarkCard
            key={def.id}
            def={def}
            unlockedAt={progress.landmarks[def.id]?.at ?? null}
            meter={landmarkMeter(def, progress, streak)}
            onClick={() => {
              sfx.tap();
              setSelected(def);
            }}
          />
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && selectedMeter && (
          <div
            className="lm-detail"
            style={{ '--lm': `var(--play-${selected.slot})` } as CSSProperties}
          >
            <div className={`lm-modal-art ${selectedUnlock ? '' : 'locked'}`}>
              <LandmarkArt def={selected} size={64} />
            </div>
            <p className="lm-req">{selected.requirement}</p>
            {selectedUnlock ? (
              <>
                <div className="lm-status">
                  <Chip tone="good">
                    Unlocked{' '}
                    {new Date(selectedUnlock.at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
                  </button>
                  <button
                    className="primary-btn"
                    onClick={() => {
                      sfx.tap();
                      setSharing(selected);
                      setSelected(null);
                    }}
                  >
                    Share card
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="lm-meter" role="progressbar" aria-valuenow={selectedMeter.done} aria-valuemax={selectedMeter.total}>
                  <div
                    className="lm-meter-fill"
                    style={{
                      width: `${Math.round((selectedMeter.done / Math.max(1, selectedMeter.total)) * 100)}%`
                    }}
                  />
                </div>
                <p className="lm-meter-text">
                  {selectedMeter.done} / {selectedMeter.total}
                  {selected.kind === 'streak'
                    ? ' days'
                    : selected.kind === 'level'
                      ? ' levels'
                      : ''}
                </p>
                <div className="lm-status">
                  <Chip tone="muted">Locked</Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {sharing && progress.landmarks[sharing.id] && (
        <ShareImageModal
          render={() =>
            renderLandmarkCard(
              sharing,
              progress.landmarks[sharing.id].at,
              landmarkMeter(sharing, progress, streak).total,
              { name: profile.name, emoji: profile.emoji }
            )
          }
          filename="100-games-landmark.png"
          alt={`${sharing.title} landmark card`}
          onClose={() => setSharing(null)}
        />
      )}
    </section>
  );
}
