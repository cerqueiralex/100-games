/**
 * Chess piece art — SVG staunton silhouettes in the familiar online-chess
 * style: white pieces pale with a dark outline, black pieces charcoal with
 * lighter detail lines so they stay readable on the dark squares.
 * Game-content art, so the colours are fixed (like the Memory Match card
 * faces), not theme tokens. One drawing per piece kind; both colours share
 * it and only swap the palette.
 *
 * The knight's horse is adapted from Colin M.L. Burnett's classic chess
 * set (Wikimedia Commons "Chess_nlt45.svg", tri-licensed GFDL/BSD/GPL —
 * used here under the BSD license), reseated on this set's base bar.
 */
import { B, K, N, P, Q, R, type Color } from './logic/engine';

const WHITE = { fill: '#f9f9f9', line: '#454545', detail: '#454545' };
const BLACK = { fill: '#3f3d3b', line: '#1e1d1c', detail: '#a29e9a' };

function PawnArt() {
  return (
    <>
      {/* head circle drawn LAST so it sits on the front layer, full outline visible */}
      <path d="M22.5 16.8c-3 0-5.4 2.4-5.4 5.4 0 1.7.8 3.2 2 4.2-3.4 1.9-5.7 5.4-5.7 9.3h18.2c0-3.9-2.3-7.4-5.7-9.3 1.2-1 2-2.5 2-4.2 0-3-2.4-5.4-5.4-5.4Z" />
      <path d="M12 36.2h21c.9 0 1.6.7 1.6 1.6v1c0 .9-.7 1.6-1.6 1.6H12c-.9 0-1.6-.7-1.6-1.6v-1c0-.9.7-1.6 1.6-1.6Z" />
      <circle cx="22.5" cy="12.6" r="5.4" />
    </>
  );
}

function RookArt({ detail }: { detail: string }) {
  return (
    <>
      <path d="M11.5 8.5h4.6v3.2h4.2V8.5h4.4v3.2h4.2V8.5h4.6v7.3l-2.4 2.7H13.9l-2.4-2.7Z" />
      <path d="M15.6 18.5h13.8l1.2 12.4H14.4Z" />
      <path d="M13.2 30.9h18.6l1.5 3.1H11.7Z" />
      <path d="M10.8 34h23.4c.9 0 1.6.7 1.6 1.6v1.2c0 .9-.7 1.6-1.6 1.6H10.8c-.9 0-1.6-.7-1.6-1.6v-1.2c0-.9.7-1.6 1.6-1.6Z" />
      <path d="M15.6 18.5h13.8" fill="none" stroke={detail} strokeWidth="1.1" />
    </>
  );
}

function KnightArt({ detail }: { detail: string }) {
  return (
    <>
      {/* cburnett horse, scaled 0.92 about its bottom centre to seat on the base bar */}
      <g transform="translate(22.5 37.3) scale(0.92) translate(-22.5 -39)" strokeWidth="1.85">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0Z" fill={detail} stroke={detail} strokeWidth="1.5" />
        <path
          d="M15 15.5a.5 1.5 0 1 1-1 0 .5 1.5 0 1 1 1 0Z"
          transform="matrix(.866 .5 -.5 .866 9.693 -5.173)"
          fill={detail}
          stroke={detail}
          strokeWidth="1.5"
        />
      </g>
      <path d="M15.2 36.8h21.6c.9 0 1.6.7 1.6 1.6v.4c0 .9-.7 1.6-1.6 1.6H15.2c-.9 0-1.6-.7-1.6-1.6v-.4c0-.9.7-1.6 1.6-1.6Z" />
    </>
  );
}

function BishopArt({ detail }: { detail: string }) {
  return (
    <>
      <circle cx="22.5" cy="7.3" r="2.4" />
      <path d="M22.5 10.6c-4.6 2.8-7.4 7-7.4 11.4 0 2.8 1.1 5.1 2.9 6.7h9c1.8-1.6 2.9-3.9 2.9-6.7 0-4.4-2.8-8.6-7.4-11.4Z" />
      {/* mitre cross: merged rectangles with a longer descender, not stroked lines */}
      <path d="M21.4 14.4h2.2v2.2h2.8v2.2h-2.8v4.6h-2.2v-4.6h-2.8v-2.2h2.8Z" fill={detail} stroke="none" />
      <path d="M16.2 28.7h12.6l1.9 4.4H14.3Z" />
      <path d="M11.6 33.1h21.8c.9 0 1.6.7 1.6 1.6v1.4c0 .9-.7 1.6-1.6 1.6H11.6c-.9 0-1.6-.7-1.6-1.6v-1.4c0-.9.7-1.6 1.6-1.6Z" />
    </>
  );
}

function QueenArt() {
  return (
    <>
      <circle cx="7.6" cy="11.6" r="1.9" />
      <circle cx="15.1" cy="8.6" r="1.9" />
      <circle cx="22.5" cy="7.6" r="1.9" />
      <circle cx="29.9" cy="8.6" r="1.9" />
      <circle cx="37.4" cy="11.6" r="1.9" />
      <path d="M9 14.4 13.6 28h17.8L36 14.4l-6.3 8.2-3.4-11-3.8 10.6-3.8-10.6-3.4 11Z" />
      <path d="M13.6 28h17.8l1.4 5.2H12.2Z" />
      <path d="M11 33.2h23c.9 0 1.6.7 1.6 1.6v1.6c0 .9-.7 1.6-1.6 1.6H11c-.9 0-1.6-.7-1.6-1.6v-1.6c0-.9.7-1.6 1.6-1.6Z" />
    </>
  );
}

function KingArt({ detail }: { detail: string }) {
  return (
    <>
      {/* crown cross: merged rectangles, crossbar high so the stem reads as a cross */}
      <path d="M21.1 1.6h2.8v2.2h2.6v2.6h-2.6V11h-2.8V6.4h-2.6V3.8h2.6Z" />
      <path d="M22.5 9.8c-2.1 0-3.8 1.5-4.1 3.5-4.3.9-7.4 4.6-7.4 9 0 2.9 1.3 5.4 3.4 7h16.2c2.1-1.6 3.4-4.1 3.4-7 0-4.4-3.1-8.1-7.4-9-.3-2-2-3.5-4.1-3.5Z" />
      <path d="M14.6 21.9h15.8" fill="none" stroke={detail} strokeWidth="1.3" />
      <path d="M15.9 29.3h13.2l1.6 4.1H14.3Z" />
      <path d="M11.4 33.4h22.2c.9 0 1.6.7 1.6 1.6v1.4c0 .9-.7 1.6-1.6 1.6H11.4c-.9 0-1.6-.7-1.6-1.6V35c0-.9.7-1.6 1.6-1.6Z" />
    </>
  );
}

/**
 * One chess piece. `kind` is the engine's unsigned code (P..K); size is
 * left to CSS (the board layer and the capture trays size the svg).
 */
export function ChessPiece({ kind, color }: { kind: number; color: Color }) {
  const c = color === 'w' ? WHITE : BLACK;
  return (
    <svg
      viewBox="0 0 45 45"
      className="chess-piece-svg"
      aria-hidden
      fill={c.fill}
      stroke={c.line}
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {kind === P && <PawnArt />}
      {kind === R && <RookArt detail={c.detail} />}
      {kind === N && <KnightArt detail={c.detail} />}
      {kind === B && <BishopArt detail={c.detail} />}
      {kind === Q && <QueenArt />}
      {kind === K && <KingArt detail={c.detail} />}
    </svg>
  );
}
