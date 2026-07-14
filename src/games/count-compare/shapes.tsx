/** SVG drawing for a single Count & Compare shape, positioned in the logical
 *  0..100 stage. Rotation is baked into the polygon points so the wrapping
 *  <g> is free to run the CSS pop-in (scale + opacity) animation. */

import type { PlacedShape } from './logic/types';
import { COLOR_TOKEN } from './logic/types';

function poly(cx: number, cy: number, r: number, sides: number, rotDeg: number): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const ang = ((rotDeg - 90 + (i * 360) / sides) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function star(cx: number, cy: number, rOut: number, rIn: number, rotDeg: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const ang = ((rotDeg - 90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(ang)).toFixed(2)},${(cy + r * Math.sin(ang)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export function ShapeGlyph({ shape }: { shape: PlacedShape }) {
  const { kind, x, y, d, rot, color } = shape;
  const fill = COLOR_TOKEN[color];
  const r = d / 2;
  switch (kind) {
    case 'circle':
      return <circle cx={x} cy={y} r={r} fill={fill} />;
    case 'square': {
      const side = d * 0.88;
      return (
        <rect
          x={x - side / 2}
          y={y - side / 2}
          width={side}
          height={side}
          rx={side * 0.16}
          fill={fill}
        />
      );
    }
    case 'triangle':
      return <polygon points={poly(x, y, r * 1.08, 3, rot)} fill={fill} />;
    case 'star':
      return <polygon points={star(x, y, r * 1.12, r * 0.46, rot)} fill={fill} />;
  }
}
