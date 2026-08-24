import { useEffect, useRef, useState } from 'react';
import type { RankTier } from '../progress/xp';
import { avatarSprite, loadAvatarSprite } from '../design/avatars';
import {
  RANK_BADGE,
  RANK_GLOSS,
  RANK_MATERIAL,
  type RankMaterial
} from '../design/rankMaterials';

export interface ShareData {
  gameName: string;
  difficultyLabel: string;
  timeStr: string;
  score: number;
  errors: number;
  hintsUsed: number;
  cleanWin: boolean;
  playerName: string;
  playerEmoji: string;
  /** the player's level and the crown it has earned (null below level 10) */
  level: number;
  rank: RankTier | null;
  /** present when the run was that day's Daily Challenge */
  daily?: { dateLabel: string; streak: number };
}

export const CARD_W = 1080;
export const CARD_H = 1350;
const W = CARD_W;
const H = CARD_H;
export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
const GREEN = '#30d158';

/** A design token, when it resolves to a plain hex (all the ones read here do). */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

export function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

/** hex + alpha → the rgba() canvas wants */
export function alpha(hex: string, a: number): string {
  return `rgba(${hexToRgb(hex)},${a})`;
}

export interface CardTheme {
  bg: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
  /** true on the light (paper) appearance — glow and texture strengths differ */
  light: boolean;
}

/**
 * The card paints with the player's OWN appearance tokens.
 *
 * It used to be hardcoded black-on-black, which meant a player on the light
 * theme opened a share sheet showing a card from a different app. Reading
 * --bg/--surface/--text here is what keeps the exported PNG and the results
 * modal behind it the same piece of design.
 */
export function cardTheme(): CardTheme {
  const bg = token('--bg', '#000000');
  const rgb = bg.slice(1).match(/../g)!.map((h) => parseInt(h, 16) / 255);
  return {
    bg,
    surface: token('--surface', '#101012'),
    text: token('--text', '#f5f5f7'),
    accent: token('--accent', '#ffffff'),
    border: token('--border', '#232328'),
    light: 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.5
  };
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  color: string,
  bg: string,
  font: string,
  padX: number,
  height: number
) {
  ctx.font = font;
  const w = ctx.measureText(text).width + padX * 2;
  roundRect(ctx, cx - w / 2, cy - height / 2, w, height, height / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 2);
}

/**
 * Shared share-card chrome — base, faint board grid, colored glows and the
 * rounded frame, used by the win card and the landmark card. Returns the
 * theme it painted with so the caller keeps the same ink.
 */
export function drawCardChrome(
  ctx: CanvasRenderingContext2D,
  glowRgb: string,
  glow2Rgb: string
): CardTheme {
  const t = cardTheme();

  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  // faint grid texture, a nod to the puzzle boards — drawn in the ink color
  // so it stays a whisper on paper as well as on black
  ctx.strokeStyle = alpha(t.text, t.light ? 0.06 : 0.045);
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // glows — softer on paper, where a strong tint turns the beige muddy
  let g = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 720);
  g.addColorStop(0, `rgba(${glowRgb},${t.light ? 0.16 : 0.26})`);
  g.addColorStop(1, `rgba(${glowRgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.85, H * 0.92, 0, W * 0.85, H * 0.92, 560);
  g.addColorStop(0, `rgba(${glow2Rgb},${t.light ? 0.08 : 0.12})`);
  g.addColorStop(1, `rgba(${glow2Rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // the card plate itself
  roundRect(ctx, 52, 52, W - 104, H - 104, 60);
  ctx.fillStyle = alpha(t.surface, t.light ? 0.92 : 0.78);
  ctx.fill();
  ctx.strokeStyle = alpha(t.text, 0.14);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // wordmark
  ctx.fillStyle = alpha(t.text, 0.5);
  ctx.font = `600 32px ${FONT}`;
  ctx.fillText('1 0 0   G A M E S', W / 2, 144);

  return t;
}

/**
 * The rank medallion — a white crown on the tier's material disc, the same
 * badge the profile and home header wear, drawn with canvas paths so the
 * shared card carries the real thing rather than an emoji stand-in.
 * Coordinates come from the 24-unit crown in icons.tsx, mapped through the
 * 64-unit disc exactly as the SVG does.
 */
export function drawRankCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  rim: string,
  material: RankMaterial
) {
  const u = size / 64;
  // 64-space → canvas, so the numbers below are literally the SVG's
  const X = (x: number) => cx - size / 2 + x * u;
  const Y = (y: number) => cy - size / 2 + y * u;

  // extruded disc: rim behind, face slightly high and small on top, so the
  // bottom crescent reads as the darker edge (identical to the SVG badge)
  ctx.beginPath();
  ctx.arc(X(RANK_BADGE.cx), Y(RANK_BADGE.cy), RANK_BADGE.r * u, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(RANK_BADGE.faceCx), Y(RANK_BADGE.faceCy), RANK_BADGE.faceR * u, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();

  /* The material texture, from the same table the SVG reads — canvas takes
     the SVG path strings straight through Path2D, which is what keeps one
     definition instead of two drawings that drift. Clipped to the face for
     the same reason the SVG clips it. */
  ctx.save();
  ctx.beginPath();
  ctx.arc(X(RANK_BADGE.faceCx), Y(RANK_BADGE.faceCy), RANK_BADGE.faceR * u, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(X(0), Y(0));
  ctx.scale(u, u);
  ctx.lineCap = 'round';
  for (const s of material.strokes) {
    ctx.globalAlpha = s.o;
    ctx.strokeStyle = rim;
    ctx.lineWidth = s.w;
    ctx.stroke(new Path2D(s.d));
  }
  ctx.fillStyle = '#ffffff';
  for (const s of material.sheens) {
    ctx.globalAlpha = s.o;
    ctx.fill(new Path2D(s.d));
  }
  if (!material.matte) {
    ctx.globalAlpha = RANK_GLOSS.o;
    ctx.beginPath();
    ctx.ellipse(RANK_GLOSS.cx, RANK_GLOSS.cy, RANK_GLOSS.rx, RANK_GLOSS.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const s = 1.71 * u;
  const crown = (dy: number, paint: () => void) => {
    const ox = cx - size / 2 + 11.5 * u;
    const oy = cy - size / 2 + dy * u;
    const px = (x: number) => ox + x * s;
    const py = (y: number) => oy + y * s;
    ctx.lineWidth = 1.05 * s;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(px(3.6), py(8.4));
    ctx.lineTo(px(8.5), py(12.2));
    ctx.lineTo(px(12), py(5.9));
    ctx.lineTo(px(15.5), py(12.2));
    ctx.lineTo(px(20.4), py(8.4));
    ctx.lineTo(px(18.6), py(17.4));
    ctx.lineTo(px(5.4), py(17.4));
    ctx.closePath();
    paint();

    for (const [x, y, r] of [
      [3.6, 8.4, 2.1],
      [12, 5.9, 2.3],
      [20.4, 8.4, 2.1]
    ]) {
      ctx.beginPath();
      ctx.arc(px(x), py(y), r * s, 0, Math.PI * 2);
      paint();
    }

    ctx.beginPath();
    roundRect(ctx, px(5.4), py(18.6), 13.2 * s, 2.8 * s, 0.7 * s);
    paint();
  };

  // the emblem's own drop edge, then the emblem — it lifts off the disc
  // rather than lying flat on it
  ctx.save();
  ctx.globalAlpha = 0.55;
  crown(12.1, () => {
    ctx.fillStyle = rim;
    ctx.fill();
  });
  ctx.restore();
  crown(10.6, () => {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.stroke();
  });
}

/**
 * A row of pills centred as a group. One pill is the common case; the daily
 * card adds the streak beside the tier, and two pills each centred on their
 * own would overlap.
 */
export function pillRow(
  ctx: CanvasRenderingContext2D,
  items: { text: string; color: string; bg: string }[],
  cy: number,
  font: string,
  padX: number,
  height: number,
  gap = 18
) {
  ctx.font = font;
  const widths = items.map((i) => ctx.measureText(i.text).width + padX * 2);
  const total = widths.reduce((a, w) => a + w, 0) + gap * (items.length - 1);
  let x = W / 2 - total / 2;
  items.forEach((item, i) => {
    pill(ctx, item.text, x + widths[i] / 2, cy, item.color, item.bg, font, padX, height);
    x += widths[i] + gap;
  });
}

/** Shrinks a font until the text fits `max` px wide — long game names must
    not run off the card (or force a second line the layout has no room for). */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, max: number): string {
  let px = start;
  for (; px > 40; px -= 2) {
    ctx.font = `${weight} ${px}px ${FONT}`;
    if (ctx.measureText(text).width <= max) break;
  }
  return `${weight} ${px}px ${FONT}`;
}

/**
 * Draws the shareable win card and returns the canvas.
 *
 * Vertical rhythm is deliberate: the emblem block up top was oversized and
 * pushed the four statistics, the badge and the footer into each other at
 * the bottom. The trophy is smaller and higher, and the space it gave back
 * is spent on even gaps between every band below the divider.
 */
export function renderShareCard(d: ShareData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const ACCENT = token('--accent', '#ffffff');
  const ACCENT_RGB = hexToRgb(ACCENT);

  const t = drawCardChrome(ctx, d.cleanWin ? '48,209,88' : ACCENT_RGB, ACCENT_RGB);
  const dim = (a: number) => alpha(t.text, a);

  // the crown you are wearing, in the corner — same place as on the
  // profile's level card, so the two read as one badge
  if (d.rank) {
    drawRankCrown(
      ctx,
      886,
      208,
      104,
      token(`--rank-${d.rank.id}`, '#ffc93c'),
      token(`--rank-${d.rank.id}-rim`, '#b07d10'),
      RANK_MATERIAL[d.rank.id]
    );
    ctx.fillStyle = dim(0.6);
    ctx.font = `700 25px ${FONT}`;
    ctx.fillText(`${d.rank.name.toUpperCase()} · LVL ${d.level}`, 886, 292);
  }

  // trophy
  ctx.font = `118px ${EMOJI_FONT}`;
  ctx.fillText('🏆', W / 2, 262);

  // headline — the daily card names the event, since "which day" is the
  // whole point of comparing one
  ctx.fillStyle = d.cleanWin ? GREEN : ACCENT;
  ctx.font = `700 37px ${FONT}`;
  ctx.fillText(
    d.daily ? `D A I L Y  ·  ${d.daily.dateLabel.toUpperCase()}` : 'P U Z Z L E   S O L V E D',
    W / 2,
    368
  );

  // game name — shrinks rather than overflowing on the long ones
  ctx.fillStyle = t.text;
  ctx.font = fitFont(ctx, d.gameName, 800, 104, W - 260);
  ctx.fillText(d.gameName, W / 2, 466);

  // tier — plus the daily streak beside it, which is the number a daily
  // player actually wants to show off
  const XP_COLOR = token('--xp', '#ff9f0a');
  pillRow(
    ctx,
    [
      {
        text: d.difficultyLabel.toUpperCase(),
        color: ACCENT,
        bg: `rgba(${ACCENT_RGB},0.14)`
      },
      ...(d.daily && d.daily.streak > 0
        ? [
            {
              text: `${d.daily.streak} DAY STREAK`,
              color: XP_COLOR,
              bg: `rgba(${hexToRgb(XP_COLOR)},0.14)`
            }
          ]
        : [])
    ],
    572,
    `700 31px ${FONT}`,
    34,
    62
  );

  // divider
  ctx.strokeStyle = dim(0.12);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 664);
  ctx.lineTo(W - 160, 664);
  ctx.stroke();

  // stats 2x2 — even bands: 126px between the two rows' baselines' blocks,
  // and the same air again before the badge
  const stats: [string, string][] = [
    [d.timeStr, 'TIME'],
    [d.score.toLocaleString(), 'SCORE'],
    [String(d.errors), 'ERRORS'],
    [String(d.hintsUsed), 'HINTS']
  ];
  const cols = [W / 2 - 235, W / 2 + 235];
  const rows = [790, 968];
  stats.forEach(([value, label], i) => {
    const x = cols[i % 2];
    const y = rows[Math.floor(i / 2)];
    ctx.fillStyle = t.text;
    ctx.font = `750 74px ${FONT}`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = dim(0.5);
    ctx.font = `600 27px ${FONT}`;
    ctx.fillText(label, x, y + 62);
  });

  // clean-win badge
  if (d.cleanWin) {
    pill(ctx, '✦  CLEAN WIN · NO HELP', W / 2, 1136, GREEN, 'rgba(48,209,88,0.13)', `700 30px ${FONT}`, 36, 62);
  } else {
    pill(ctx, 'SOLVED WITH A LITTLE HELP', W / 2, 1136, dim(0.62), dim(0.07), `600 28px ${FONT}`, 36, 62);
  }

  // footer
  const date = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  ctx.fillStyle = dim(0.6);
  ctx.font = `600 32px ${FONT}`;
  drawFooterWithAvatar(ctx, d.playerEmoji, `${d.playerName}  ·  ${date}`, W / 2, 1234);

  return canvas;
}

/**
 * The footer line, with a sprite avatar drawn beside the text when the
 * player has one.
 *
 * The sprite must already be decoded — `ShareCardModal` awaits
 * `loadAvatarSprite` before rendering, because `drawImage` with a
 * half-loaded image draws nothing at all and there is no way to notice from
 * inside a synchronous render. If it is not there, the emoji/text form is
 * used: a card missing its avatar beats a card that never renders.
 *
 * The whole line is measured first and centred as a unit, so adding a
 * picture does not shove the name off centre.
 */
export function drawFooterWithAvatar(
  ctx: CanvasRenderingContext2D,
  avatarValue: string,
  text: string,
  cx: number,
  y: number
) {
  const sprite = avatarSprite(avatarValue);
  if (!sprite) {
    ctx.fillText(`${avatarValue} ${text}`, cx, y);
    return;
  }
  const box = 44;
  const gap = 12;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const textW = ctx.measureText(text).width;
  const startX = cx - (box + gap + textW) / 2;
  // sprites are pixel art: keep the browser from smoothing them on scale
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(box / sprite.width, box / sprite.height);
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  ctx.drawImage(sprite, startX + (box - w) / 2, y - box / 2 - 6 + (box - h) / 2, w, h);
  ctx.imageSmoothingEnabled = prevSmoothing;
  ctx.fillText(text, startX + box + gap, y);
  ctx.textAlign = prevAlign;
}

/** Generic share-image viewer: renders a canvas once, then offers the
    native share sheet (when files are shareable) and a download. */
export function ShareImageModal({
  render,
  filename,
  alt,
  onClose
}: {
  /** may be async — a card whose art needs decoding first (sprite avatars)
      awaits it, so the canvas is only drawn once everything is ready */
  render: () => HTMLCanvasElement | Promise<HTMLCanvasElement>;
  filename: string;
  alt: string;
  onClose: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void Promise.resolve(render()).then((canvas) => {
      if (cancelled) return;
      canvas.toBlob((b) => {
      if (!b) return;
      blobRef.current = b;
      url = URL.createObjectURL(b);
      setImgUrl(url);
      if (typeof navigator.canShare === 'function') {
        const file = new File([b], filename, { type: 'image/png' });
        setShareSupported(navigator.canShare({ files: [file] }));
      }
      }, 'image/png');
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // render once on mount — the modal is remounted per card
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    if (!blobRef.current) return;
    const file = new File([blobRef.current], filename, { type: 'image/png' });
    try {
      await navigator.share({ files: [file] });
    } catch {
      // user closed the share sheet
    }
  };

  const download = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = filename;
    a.click();
  };

  return (
    <div className="share-backdrop" onClick={onClose}>
      <div className="share-panel" onClick={(e) => e.stopPropagation()}>
        {imgUrl ? (
          <img className="share-img" src={imgUrl} alt={alt} />
        ) : (
          <div className="share-loading">Rendering…</div>
        )}
        <p className="share-hint">
          Long-press (or right-click) the card to copy or save it — then paste it into WhatsApp.
        </p>
        <div className="share-actions">
          {shareSupported && (
            <button className="primary-btn" onClick={share}>
              Share…
            </button>
          )}
          <button className="ghost-btn" onClick={download}>
            Download
          </button>
          <button className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShareCardModal({ data, onClose }: { data: ShareData; onClose: () => void }) {
  return (
    <ShareImageModal
      // decode the sprite avatar first, then draw — see drawFooterWithAvatar
      render={() => loadAvatarSprite(data.playerEmoji).then(() => renderShareCard(data))}
      filename="100-games-win.png"
      alt="Your win card"
      onClose={onClose}
    />
  );
}
