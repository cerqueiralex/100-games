import { useMemo, useState } from 'react';
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
import { Chip, Modal } from './ui';
import { LockIcon } from '../design/icons';
import {
  alpha,
  CARD_H,
  CARD_W,
  drawCardChrome,
  drawFooterWithAvatar,
  FONT,
  hexToRgb,
  pill,
  ShareImageModal
} from './ShareCard';
import { sfx } from '../audio';
import { loadAvatarSprite } from '../design/avatars';
import { LANDMARK_GRID, landmarkPixels, drawLandmarkPixels } from '../design/landmarkPixels';

/**
 * Landmarks — the profile trophy collection. Every landmark is always
 * visible: locked cards render their art grayscale at soft opacity behind a
 * padlock; unlocking colors them in. Art is drawn from the content palette
 * (--play-* tokens), so it stays colorful and identical across accent
 * themes, like game stickers — grayscale comes from a CSS filter, not from
 * separate art.
 */

/** Every achievement surface uses the same crisp, hand-drawn pixel sprite. */
export function LandmarkArt({
  def,
  size = 48,
  hidden = false
}: {
  def: LandmarkDef;
  size?: number;
  hidden?: boolean;
}) {
  const pixels = useMemo(() => landmarkPixels(def, hidden), [def, hidden]);
  return (
    <svg
      className="lm-pixel-art"
      width={size}
      height={size}
      viewBox={`0 0 ${LANDMARK_GRID} ${LANDMARK_GRID}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixels.map((pixel, i) => (
        <rect key={i} x={pixel.x} y={pixel.y} width={pixel.width} height={1} fill={pixel.color} />
      ))}
    </svg>
  );
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
    case 'daily-first':
      return ['DAY 1', 'THE DAILY HABIT BEGINS'];
    case 'daily-streak':
      return [String(def.days), 'DAILY CHALLENGES IN A ROW'];
    case 'daily-collector':
      return [String(total), 'GAMES SOLVED AS A DAILY'];
    case 'all-played':
      return [String(total), 'GAMES PLAYED'];
    case 'difficulty':
      return [String(total), `GAMES BEATEN ON ${def.difficulty!.toUpperCase()}`];
    case 'category':
      return [String(total), `${categoryName(def.category!).toUpperCase()} GAMES BEATEN`];
    case 'clean-streak':
      return [String(def.count), 'CLEAN WINS IN A ROW'];
    case 'flawless':
      return ['0', 'MISTAKES, NO HELP'];
    case 'speed':
      return [`${def.seconds}s`, 'CLEAN WIN, UNDER'];
    case 'time-of-day':
      return def.moment === 'night' ? ['4AM', 'STILL PLAYING BEFORE'] : ['6AM', 'ALREADY PLAYING BY'];
    case 'comeback':
      return def.count === 1 ? ['1', 'LOSS, THEN A WIN'] : ['3', 'RD TIME LUCKY'];
    case 'genre-hopper':
      return [String(total), 'CATEGORIES IN ONE DAY'];
    case 'deep-cut':
      return ['10%', 'THE BOTTOM OF THE PLAY COUNTS'];
    case 'share':
      return def.feat === 'share-app' ? ['1st', 'FRIEND GIVEN THE LINK'] : ['1st', 'WIN CARD MADE'];
    case 'backup':
      return def.feat === 'backup-export' ? ['OUT', 'DATA EXPORTED'] : ['IN', 'DATA BROUGHT HOME'];
    case 'renaissance':
      return [String(total), 'CATEGORIES, ALL WON CLEAN'];
    case 'full-house':
      return [String(total), 'GAMES SWEPT IN ONE CATEGORY'];
    case 'egg':
      return ['★', 'SECRET FOUND'];
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

  // The same sprite as the gallery, painted at an integer pixel scale.
  drawLandmarkPixels(ctx, def, W / 2 - 120, 190, 240);

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
  drawFooterWithAvatar(ctx, player.emoji, `${player.name}  ·  100 GAMES`, W / 2, 1256);

  return canvas;
}

/* ---------- earned badges (the panel inside the level card) ---------- */

/**
 * Every UNLOCKED landmark as a small plate, in catalogue order, shown at the
 * foot of the level card.
 *
 * Unlocked ONLY — this is the one surface in the app that is a display case
 * rather than a checklist. The gallery below already shows the whole
 * catalogue with locked art and live meters, which is what tells a player
 * what to chase; repeating the locked half here would make the level card a
 * second, worse copy of it. So the panel answers a different question: what
 * have I actually got? Catalogue order (not newest-first) keeps the families
 * grouped, so a wall of unlabelled 24px art still reads as a collection, and
 * it matches the gallery below rather than disagreeing with it.
 *
 * With nothing unlocked it renders nothing at all: an empty case with a "0"
 * over it is worse than no case.
 */
export function LandmarkBadges({ progress }: { progress: PlayerProgress }) {
  const [selected, setSelected] = useState<LandmarkDef | null>(null);
  const earned = LANDMARKS.filter((d) => progress.landmarks[d.id]);
  if (earned.length === 0) return null;

  const unlockedAt = selected ? progress.landmarks[selected.id]?.at : null;
  return (
    <div className="lm-badges">
      <p className="lm-badges-head">
        Badges earned
        <span>{earned.length}</span>
      </p>
      <div className="lm-badge-row">
        {earned.map((def) => (
          <button
            key={def.id}
            className="lm-badge"
            style={{ '--lm': `var(--play-${def.slot})` } as CSSProperties}
            onClick={() => {
              sfx.tap();
              setSelected(def);
            }}
            title={def.title}
            aria-label={`${def.title} — unlocked`}
          >
            <LandmarkArt def={def} size={24} />
          </button>
        ))}
      </div>

      {/* tappable, because a 24px emblem with no caption says nothing on a
          phone, where `title` never appears. Deliberately the short form —
          art, requirement, date: sharing lives in the gallery, and two Share
          buttons for one trophy is a choice nobody needs to make. */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && unlockedAt && (
          <div
            className="lm-detail"
            style={{ '--lm': `var(--play-${selected.slot})` } as CSSProperties}
          >
            <div className="lm-modal-art">
              <LandmarkArt def={selected} size={72} />
            </div>
            <p className="lm-req">{selected.requirement}</p>
            <div className="lm-status">
              <Chip tone="good">
                Unlocked{' '}
                {new Date(unlockedAt).toLocaleDateString(undefined, {
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
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
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
  /* A secret keeps its secret: no title, no meter, no emblem until it is
     found. The card still exists — knowing there IS something to find is
     the whole appeal of an easter egg; knowing what it is would end it. */
  const hidden = locked && !!def.secret;
  return (
    <button
      className={`lm-card fx-card ${locked ? 'locked' : ''}`}
      style={{ '--lm': `var(--play-${def.slot})` } as CSSProperties}
      onClick={onClick}
      aria-label={hidden ? 'Undiscovered secret' : `${def.title} — ${locked ? 'locked' : 'unlocked'}`}
    >
      {locked && (
        <span className="lm-lock" aria-hidden>
          <LockIcon size={14} />
        </span>
      )}
      <span className="lm-plate">
        <LandmarkArt def={def} size={48} hidden={hidden} />
      </span>
      <span className="lm-title">{hidden ? '???' : def.title}</span>
      <span className="lm-sub">
        {hidden
          ? 'Hidden'
          : locked
            ? `${meter.done}/${meter.total}`
            : new Date(unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </button>
  );
}

export function LandmarksSection({
  progress,
  streak,
  dailyCurrent
}: {
  progress: PlayerProgress;
  streak: StreakInfo;
  /** the live Daily Challenge streak — the daily meters show what the
      player can still act on, exactly as the play-streak meters do */
  dailyCurrent: number;
}) {
  const { profile } = useAppState();
  const [selected, setSelected] = useState<LandmarkDef | null>(null);
  const [sharing, setSharing] = useState<LandmarkDef | null>(null);

  /* Two galleries, one catalogue: the trophies you can read off and go
     earn, and the secrets you cannot. They are split HERE rather than in
     progress.ts — a secret is an ordinary landmark in every other way
     (unlocks, pays XP, shares), it is only presented differently. */
  const trophies = LANDMARKS.filter((d) => !d.secret);
  const secrets = LANDMARKS.filter((d) => d.secret);
  const unlockedCount = trophies.filter((d) => progress.landmarks[d.id]).length;
  const foundCount = secrets.filter((d) => progress.landmarks[d.id]).length;

  const selectedUnlock = selected ? (progress.landmarks[selected.id] ?? null) : null;
  const selectedHidden = !!selected?.secret && !selectedUnlock;
  const selectedMeter = selected
    ? landmarkMeter(selected, progress, streak, dailyCurrent)
    : null;

  const card = (def: LandmarkDef) => (
    <LandmarkCard
      key={def.id}
      def={def}
      unlockedAt={progress.landmarks[def.id]?.at ?? null}
      meter={landmarkMeter(def, progress, streak, dailyCurrent)}
      onClick={() => {
        sfx.tap();
        setSelected(def);
      }}
    />
  );

  return (
    <section className="setup-section">
      <h3 className="section-title lm-head">
        Landmarks
        <span className="lm-count">
          {unlockedCount} / {trophies.length}
        </span>
      </h3>
      <div className="lm-grid">{trophies.map(card)}</div>

      {secrets.length > 0 && (
        <>
          <h3 className="section-title lm-head lm-egg-head">
            Easter eggs
            <span className="lm-count">
              {foundCount} / {secrets.length}
            </span>
          </h3>
          <p className="lm-egg-note">
            Secrets hidden inside the games. No hints — you'll know when you find one.
          </p>
          <div className="lm-grid">{secrets.map(card)}</div>
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedHidden ? 'Undiscovered' : selected?.title}
      >
        {selected && selectedMeter && (
          <div
            className="lm-detail"
            style={{ '--lm': `var(--play-${selected.slot})` } as CSSProperties}
          >
            <div className={`lm-modal-art ${selectedUnlock ? '' : 'locked'}`}>
              <LandmarkArt def={selected} size={72} hidden={selectedHidden} />
            </div>
            <p className="lm-req">
              {selectedHidden
                ? 'A secret somewhere in the app. Play around — it will find you.'
                : selected.requirement}
            </p>
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
            ) : selectedHidden ? (
              <>
                <div className="lm-status">
                  <Chip tone="muted">Not found yet</Chip>
                </div>
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={() => setSelected(null)}>
                    Close
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
                  {selected.kind === 'streak' || selected.kind === 'daily-streak'
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
          // decode the sprite avatar first, then draw (see ShareCard)
          render={() =>
            loadAvatarSprite(profile.emoji).then(() =>
              renderLandmarkCard(
                sharing,
                progress.landmarks[sharing.id].at,
                landmarkMeter(sharing, progress, streak).total,
                { name: profile.name, emoji: profile.emoji }
              )
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
