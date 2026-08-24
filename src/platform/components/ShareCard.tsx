import { useEffect, useRef, useState } from 'react';
import type { RankTier } from '../progress/xp';

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
  rim: string
) {
  const u = size / 64;
  ctx.beginPath();
  ctx.arc(cx, cy, 29 * u, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4 * u;
  ctx.strokeStyle = rim;
  ctx.stroke();

  const s = 1.71 * u;
  const ox = cx - size / 2 + 11.5 * u;
  const oy = cy - size / 2 + 10.6 * u;
  const px = (x: number) => ox + x * s;
  const py = (y: number) => oy + y * s;
  ctx.lineWidth = 1.05 * s;
  ctx.lineJoin = 'round';

  const paint = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.stroke();
  };

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
    drawRankCrown(ctx, 886, 208, 104, token(`--rank-${d.rank.id}`, '#ffc93c'), token(`--rank-${d.rank.id}-rim`, '#b07d10'));
    ctx.fillStyle = dim(0.6);
    ctx.font = `700 25px ${FONT}`;
    ctx.fillText(`${d.rank.name.toUpperCase()} · LVL ${d.level}`, 886, 292);
  }

  // trophy
  ctx.font = `118px ${EMOJI_FONT}`;
  ctx.fillText('🏆', W / 2, 262);

  // headline
  ctx.fillStyle = d.cleanWin ? GREEN : ACCENT;
  ctx.font = `700 37px ${FONT}`;
  ctx.fillText('P U Z Z L E   S O L V E D', W / 2, 368);

  // game name — shrinks rather than overflowing on the long ones
  ctx.fillStyle = t.text;
  ctx.font = fitFont(ctx, d.gameName, 800, 104, W - 260);
  ctx.fillText(d.gameName, W / 2, 466);

  // difficulty pill
  pill(
    ctx,
    d.difficultyLabel.toUpperCase(),
    W / 2,
    572,
    ACCENT,
    `rgba(${ACCENT_RGB},0.14)`,
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
  ctx.fillText(`${d.playerEmoji} ${d.playerName}  ·  ${date}`, W / 2, 1234);

  return canvas;
}

/** Generic share-image viewer: renders a canvas once, then offers the
    native share sheet (when files are shareable) and a download. */
export function ShareImageModal({
  render,
  filename,
  alt,
  onClose
}: {
  render: () => HTMLCanvasElement;
  filename: string;
  alt: string;
  onClose: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [shareSupported, setShareSupported] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let url: string | null = null;
    render().toBlob((b) => {
      if (!b) return;
      blobRef.current = b;
      url = URL.createObjectURL(b);
      setImgUrl(url);
      if (typeof navigator.canShare === 'function') {
        const file = new File([b], filename, { type: 'image/png' });
        setShareSupported(navigator.canShare({ files: [file] }));
      }
    }, 'image/png');
    return () => {
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
      render={() => renderShareCard(data)}
      filename="100-games-win.png"
      alt="Your win card"
      onClose={onClose}
    />
  );
}
