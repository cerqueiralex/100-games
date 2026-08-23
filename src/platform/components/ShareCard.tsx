import { useEffect, useRef, useState } from 'react';

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
}

export const CARD_W = 1080;
export const CARD_H = 1350;
const W = CARD_W;
const H = CARD_H;
export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
const GREEN = '#30d158';

/** The card follows the active accent theme (see design/tokens.css). */
function activeAccent(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ff9f0a';
}

export function hexToRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
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

/** Shared share-card chrome: black base, faint board grid, colored glows
    and the rounded frame — used by the win card and the landmark card. */
export function drawCardChrome(ctx: CanvasRenderingContext2D, glowRgb: string, glow2Rgb: string) {
  // deep black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // faint grid texture, a nod to the puzzle boards
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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

  // glows
  let g = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 720);
  g.addColorStop(0, `rgba(${glowRgb},0.26)`);
  g.addColorStop(1, `rgba(${glowRgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W * 0.85, H * 0.92, 0, W * 0.85, H * 0.92, 560);
  g.addColorStop(0, `rgba(${glow2Rgb},0.12)`);
  g.addColorStop(1, `rgba(${glow2Rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // card
  roundRect(ctx, 52, 52, W - 104, H - 104, 60);
  ctx.fillStyle = 'rgba(14,14,17,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // wordmark
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('1 0 0   G A M E S', W / 2, 150);
}

/** Draws the shareable win card and returns the canvas. */
export function renderShareCard(d: ShareData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const ACCENT = activeAccent();
  const ACCENT_RGB = hexToRgb(ACCENT);

  drawCardChrome(ctx, d.cleanWin ? '48,209,88' : ACCENT_RGB, ACCENT_RGB);

  // trophy
  ctx.font = `150px ${EMOJI_FONT}`;
  ctx.fillText('🏆', W / 2, 340);

  // headline
  ctx.fillStyle = d.cleanWin ? GREEN : ACCENT;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('P U Z Z L E   S O L V E D', W / 2, 476);

  // game name
  ctx.fillStyle = '#f5f5f7';
  ctx.font = `800 112px ${FONT}`;
  ctx.fillText(d.gameName, W / 2, 580);

  // difficulty pill
  pill(
    ctx,
    d.difficultyLabel.toUpperCase(),
    W / 2,
    692,
    ACCENT,
    `rgba(${ACCENT_RGB},0.14)`,
    `700 32px ${FONT}`,
    34,
    64
  );

  // divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 776);
  ctx.lineTo(W - 160, 776);
  ctx.stroke();

  // stats 2x2
  const stats: [string, string][] = [
    [d.timeStr, 'TIME'],
    [d.score.toLocaleString(), 'SCORE'],
    [String(d.errors), 'ERRORS'],
    [String(d.hintsUsed), 'HINTS']
  ];
  const cols = [W / 2 - 235, W / 2 + 235];
  const rows = [880, 1046];
  stats.forEach(([value, label], i) => {
    const x = cols[i % 2];
    const y = rows[Math.floor(i / 2)];
    ctx.fillStyle = '#f5f5f7';
    ctx.font = `750 74px ${FONT}`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = `600 27px ${FONT}`;
    ctx.fillText(label, x, y + 62);
  });

  // clean-win badge
  if (d.cleanWin) {
    pill(ctx, '✦  CLEAN WIN · NO HELP', W / 2, 1180, GREEN, 'rgba(48,209,88,0.13)', `700 30px ${FONT}`, 36, 62);
  } else {
    pill(
      ctx,
      'SOLVED WITH A LITTLE HELP',
      W / 2,
      1180,
      'rgba(255,255,255,0.55)',
      'rgba(255,255,255,0.06)',
      `600 28px ${FONT}`,
      36,
      62
    );
  }

  // footer
  const date = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 33px ${FONT}`;
  ctx.fillText(`${d.playerEmoji} ${d.playerName}  ·  ${date}`, W / 2, 1256);

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
