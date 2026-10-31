import { memo } from 'react';
import { VIEW_UNITS, project, type P3, type View } from './logic/geometry';

/**
 * One projected polycube as crisp vector art: flat quads in painter's order,
 * three tones (top / left-facing / right-facing — CSS custom properties on
 * `.mt-art`, derived from theme tokens) and a 1.5 px darker edge that never
 * scales with the drawing. No gradients, no filters.
 *
 * Every figure is drawn into the same VIEW_UNITS-wide square centred on its
 * own bounding box, so cube size is identical on both plates and across the
 * whole session.
 */
export interface FigureFrame {
  view: View;
  /** centre of the square, in view units — defaults to the view's bounding-box centre */
  cx?: number;
  cy?: number;
  /** blend the two side tones by the face's angle — only for frames of a turning animation */
  blend?: boolean;
}

const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export const FigureArt = memo(function FigureArt({ view, cx, cy, blend, className, label }: FigureFrame & { className?: string; label?: string }) {
  const mx = cx ?? (view.minX + view.maxX) / 2;
  const my = cy ?? (view.minY + view.maxY) / 2;
  const h = VIEW_UNITS / 2;
  return (
    <svg
      className={['mt-art', className].filter(Boolean).join(' ')}
      viewBox={`${fmt(mx - h)} ${fmt(my - h)} ${VIEW_UNITS} ${VIEW_UNITS}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {view.faces.map((f, i) => {
        const points = `${fmt(f.pts[0])},${fmt(f.pts[1])} ${fmt(f.pts[2])},${fmt(f.pts[3])} ${fmt(f.pts[4])},${fmt(f.pts[5])} ${fmt(f.pts[6])},${fmt(f.pts[7])}`;
        if (blend && f.tone !== 0) {
          // a side face sweeping through front-on changes tone smoothly instead of popping
          const w = Math.round(smooth((f.lx + 0.3) / 0.6) * 100);
          return <polygon key={i} points={points} className="mt-face" style={{ fill: `color-mix(in srgb, var(--mt-right) ${w}%, var(--mt-left))` }} />;
        }
        return <polygon key={i} points={points} className={`mt-face t${f.tone}`} />;
      })}
    </svg>
  );
});

/** subtract the horizontal centroid, so a turn spins the figure about its own vertical axis */
export function centreCubes(cubes: readonly P3[]): P3[] {
  const n = cubes.length || 1;
  const mx = cubes.reduce((s, c) => s + c[0], 0) / n;
  const mz = cubes.reduce((s, c) => s + c[2], 0) / n;
  return cubes.map((c) => [c[0] - mx, c[1], c[2] - mz] as P3);
}

/**
 * A frame of a turn from yaw `from` to yaw `to` at eased progress `e`: the
 * figure spins about its own vertical axis while the square's centre glides
 * between the start and end framings, so neither end jumps.
 */
export function turnFrame(cubes: readonly P3[], from: number, to: number, e: number): FigureFrame {
  const c = centreCubes(cubes);
  const a = project(c, from);
  const b = project(c, to);
  const v = e <= 0 ? a : e >= 1 ? b : project(c, from + (to - from) * e);
  const ca = [(a.minX + a.maxX) / 2, (a.minY + a.maxY) / 2];
  const cb = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  return { view: v, cx: ca[0] + (cb[0] - ca[0]) * e, cy: ca[1] + (cb[1] - ca[1]) * e, blend: e > 0 && e < 1 };
}
