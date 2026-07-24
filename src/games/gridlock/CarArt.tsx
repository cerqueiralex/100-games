import { useId } from 'react';

/**
 * Top-down vehicle art for a Gridlock piece. Drawn once in a horizontal,
 * nose-right coordinate space (one cell = 100 units) and rotated into
 * place for vertical pieces, so both orientations share the same shapes.
 * The body takes `currentColor` (set by the piece's palette class);
 * details are fixed translucent paints so they read on every body color.
 */
export function CarArt({ len, orient }: { len: number; orient: 'h' | 'v' }) {
  const uid = useId();
  const W = len * 100;
  const truck = len >= 3;

  // body silhouette: curvy tapered nose (right), softly squared tail (left)
  const body = [
    `M 22 12`,
    `L ${W - 46} 12`,
    `C ${W - 16} 14 ${W - 5} 28 ${W - 5} 50`,
    `C ${W - 5} 72 ${W - 16} 86 ${W - 46} 88`,
    `L 22 88`,
    `Q 4 88 4 64`,
    `L 4 36`,
    `Q 4 12 22 12`,
    'Z'
  ].join(' ');

  const wheel = (cx: number, top: boolean) => (
    <rect
      key={`${cx}-${top}`}
      x={cx - 14}
      y={top ? 1 : 85}
      width={28}
      height={14}
      rx={6.5}
      fill="#23262e"
    />
  );
  const axles = truck ? [34, 72, W - 54] : [40, W - 56];

  // glass band helper: a slightly slanted trapezoid across the body
  const band = (x1: number, x2: number, inset: number, fill: string) => (
    <path
      d={`M ${x1} ${18 + inset} L ${x2} ${18 + inset + 6} L ${x2} ${82 - inset - 6} L ${x1} ${82 - inset} Z`}
      fill={fill}
    />
  );

  return (
    <svg
      className="grd-car"
      viewBox={orient === 'h' ? `0 0 ${W} 100` : `0 0 100 ${W}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-body`}>
          <path d={body} />
        </clipPath>
      </defs>
      <g transform={orient === 'h' ? undefined : 'translate(100 0) rotate(90)'}>
        {/* tires peek out beside the body */}
        {axles.map((cx) => [wheel(cx, true), wheel(cx, false)])}

        {/* wing mirrors at the windshield's base */}
        <rect x={W - 84} y={2} width={9} height={13} rx={3.5} fill="#23262e" />
        <rect x={W - 84} y={85} width={9} height={13} rx={3.5} fill="#23262e" />

        <path d={body} fill="currentColor" />

        <g clipPath={`url(#${uid}-body)`}>
          {/* candy edge: the app-wide extruded bottom lip */}
          <rect x={0} y={78} width={W} height={22} fill="rgba(0, 0, 0, 0.16)" />
          {/* hood sheen along the top */}
          <rect x={0} y={12} width={W} height={10} fill="rgba(255, 255, 255, 0.16)" />

          {truck ? (
            <>
              {/* cargo box with a panel seam */}
              <rect x={14} y={17} width={158} height={66} rx={9} fill="rgba(255, 255, 255, 0.34)" />
              <rect x={14} y={17} width={158} height={66} rx={9} fill="none" stroke="rgba(0, 0, 0, 0.18)" strokeWidth={3} />
              <line x1={94} y1={20} x2={94} y2={80} stroke="rgba(0, 0, 0, 0.14)" strokeWidth={3} />
              {/* cab roof + windshield */}
              <rect x={188} y={20} width={40} height={60} rx={10} fill="rgba(0, 0, 0, 0.16)" />
              {band(228, 248, 2, 'rgba(255, 255, 255, 0.5)')}
            </>
          ) : (
            <>
              {/* rear window, roof, windshield */}
              {band(56, 42, 4, 'rgba(255, 255, 255, 0.38)')}
              <rect x={56} y={20} width={62} height={60} rx={12} fill="rgba(0, 0, 0, 0.16)" />
              {band(118, 142, 0, 'rgba(255, 255, 255, 0.5)')}
            </>
          )}

          {/* headlights and taillights */}
          <rect x={W - 15} y={24} width={10} height={15} rx={4} fill="rgba(255, 250, 214, 0.85)" />
          <rect x={W - 15} y={61} width={10} height={15} rx={4} fill="rgba(255, 250, 214, 0.85)" />
          <rect x={4} y={22} width={7} height={14} rx={3} fill="rgba(60, 8, 8, 0.55)" />
          <rect x={4} y={64} width={7} height={14} rx={3} fill="rgba(60, 8, 8, 0.55)" />
        </g>
      </g>
    </svg>
  );
}
