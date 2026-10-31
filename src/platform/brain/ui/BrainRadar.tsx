import { useEffect, useMemo, useRef, useState } from 'react';
import { DUR, easeOut, useReducedMotion } from '../../motion';

/**
 * BrainRadar — a dependency-free SVG radar (charts.tsx style) for the Brain
 * Lab areas. Shared by the Brain Lab tab ("Your profile") and the Profile →
 * Brain dashboard; its CSS lives in global.css (`.brain-radar`, "BRAIN LAB · TAB…" section).
 *
 *  - N axes clockwise from the top, concentric rings (default 25/50/75 plus
 *    the frame at `max`), spokes;
 *  - a filled 'current' polygon in accent ink, a dashed 'baseline' outline, a
 *    faint 'ghost' (e.g. four weeks ago);
 *  - vertex dots on 'current' in each area's --play-<slot> colour (colour is
 *    never the only cue: every axis carries its name);
 *  - NO FAKE ZERO: a null value leaves a gap — the outline breaks and the fill
 *    wedge on either side is omitted — and its axis label is dimmed;
 *  - labels are HTML overlaid on the SVG (so they keep their size and are
 *    real buttons when `onAxis` is given — focusable, ≥ 44 px tall);
 *  - grows in on mount and morphs when values change, both skipped under
 *    reduced motion;
 *  - role="img" with an aria-label that lists every value.
 */

export interface BrainRadarAxis {
  id: string;
  label: string;
  slot: number;
}

export interface BrainRadarSeries {
  id: string;
  label: string;
  values: (number | null)[];
  tone: 'current' | 'baseline' | 'ghost';
}

export interface BrainRadarProps {
  axes: BrainRadarAxis[];
  series: BrainRadarSeries[];
  /** the value at the outer frame (default 100) */
  max?: number;
  /** ring values (default [25, 50, 75]) — the frame at `max` is always drawn */
  rings?: number[];
  /** nominal width in CSS px (default 320); the radar scales to its container */
  size?: number;
  /** makes every axis label a button */
  onAxis?: (id: string) => void;
  /** grow-in on mount (default true; always off under reduced motion) */
  animate?: boolean;
  /** print the first 'current' series' value under each label (default true) */
  showValues?: boolean;
  /** extra text for the aria-label ("Index scale, 50 is typical") */
  caption?: string;
  className?: string;
}

const PAD_X = 64;
const PAD_Y = 40;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** tween every series' values toward the latest props (null jumps; numbers glide) */
function useTweened(series: BrainRadarSeries[], animate: boolean): { values: (number | null)[][]; grow: number } {
  const reduce = useReducedMotion();
  const still = reduce || !animate;
  const target = series.map((s) => s.values);
  const key = JSON.stringify(target);
  const [shown, setShown] = useState<(number | null)[][]>(target);
  const [grow, setGrow] = useState(still ? 1 : 0);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const first = useRef(true);

  useEffect(() => {
    if (still) {
      setShown(target);
      setGrow(1);
      first.current = false;
      return;
    }
    const from = shownRef.current;
    const isFirst = first.current;
    first.current = false;
    const t0 = performance.now();
    const dur = isFirst ? DUR.emphasis + 200 : DUR.emphasis;
    let raf = 0;
    const step = (ts: number) => {
      const p = easeOut(Math.min(1, (ts - t0) / dur));
      if (isFirst) setGrow(p);
      setShown(
        target.map((vals, si) =>
          vals.map((v, i) => {
            const a = from[si]?.[i];
            if (!finite(v)) return null;
            if (isFirst || !finite(a)) return v;
            return a + (v - a) * p;
          })
        )
      );
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, still]);

  return { values: shown.length === series.length ? shown : target, grow: still ? 1 : grow };
}

export function BrainRadar({
  axes,
  series,
  max = 100,
  rings = [25, 50, 75],
  size = 320,
  onAxis,
  animate = true,
  showValues = true,
  caption,
  className
}: BrainRadarProps) {
  const n = Math.max(1, axes.length);
  const R = Math.max(40, (size - 2 * PAD_X) / 2);
  const W = 2 * R + 2 * PAD_X;
  const H = 2 * R + 2 * PAD_Y;
  const cx = W / 2;
  const cy = H / 2;
  const { values, grow } = useTweened(series, animate);

  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, v: number, scale = 1): [number, number] => {
    const r = (Math.min(max, Math.max(0, v)) / max) * R * scale;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const ring = (v: number) =>
    axes.map((_, i) => pt(i, v).map((c) => c.toFixed(1)).join(',')).join(' ');

  const current = series.find((s) => s.tone === 'current');
  const currentIdx = current ? series.indexOf(current) : -1;

  const label = useMemo(() => {
    const parts = series.map(
      (s) => `${s.label}: ${axes.map((a, i) => `${a.label} ${finite(s.values[i]) ? Math.round(s.values[i] as number) : 'not measured'}`).join(', ')}`
    );
    return `Radar chart${caption ? ` (${caption})` : ''}. ${parts.join('. ')}.`;
  }, [series, axes, caption]);

  const drawn = series.map((s, si) => {
    const vals = values[si] ?? s.values;
    const g = grow;
    const pts = vals.map((v, i) => (finite(v) ? pt(i, v, g) : null));
    // outline segments between consecutive measured axes (wraps around)
    const segs: string[] = [];
    const wedges: string[] = [];
    const isolated: [number, number][] = [];
    const all = pts.every(Boolean) && pts.length >= 3;
    if (all) {
      segs.push(`M ${pts.map((p) => p!.map((c) => c.toFixed(1)).join(' ')).join(' L ')} Z`);
    } else {
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (a && b && pts.length > 1 && (i + 1) % pts.length !== i) {
          segs.push(`M ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
          wedges.push(
            `M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)} Z`
          );
        }
        const prev = pts[(i - 1 + pts.length) % pts.length];
        if (a && !prev && !b) isolated.push(a);
      }
    }
    return { s, pts, segs, wedges, isolated, all };
  });

  return (
    <div className={`brain-radar${className ? ` ${className}` : ''}`} style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${W.toFixed(0)} ${H.toFixed(0)}`} role="img" aria-label={label} className="brain-radar-svg">
        <g className="brain-radar-grid">
          <polygon className="brain-radar-frame" points={ring(max)} />
          {rings
            .filter((v) => v > 0 && v < max)
            .map((v) => (
              <polygon key={v} className={`brain-radar-ring${v === 50 ? ' mid' : ''}`} points={ring(v)} />
            ))}
          {axes.map((a, i) => {
            const [x, y] = pt(i, max);
            return <line key={a.id} className="brain-radar-spoke" x1={cx} y1={cy} x2={x} y2={y} />;
          })}
          {rings
            .filter((v) => v > 0 && v < max)
            .map((v) => {
              const [x, y] = pt(0, v);
              return (
                <text key={v} className="brain-radar-ringlabel" x={x + 4} y={y + 3}>
                  {v}
                </text>
              );
            })}
        </g>
        {drawn.map(({ s, wedges, segs, all }) => (
          <g key={s.id} className={`brain-radar-series tone-${s.tone}`}>
            {s.tone !== 'baseline' &&
              (all ? (
                <path className="brain-radar-fill" d={segs[0]} />
              ) : (
                wedges.map((d, k) => <path key={k} className="brain-radar-fill" d={d} />)
              ))}
            {segs.map((d, k) => (
              <path key={k} className="brain-radar-line" d={d} />
            ))}
          </g>
        ))}
        {drawn.map(({ s, isolated }) =>
          isolated.map(([x, y], k) => (
            <circle key={`${s.id}-iso-${k}`} className={`brain-radar-iso tone-${s.tone}`} cx={x} cy={y} r={2.6} />
          ))
        )}
        {currentIdx >= 0 &&
          drawn[currentIdx].pts.map((p, i) =>
            p ? (
              <circle
                key={axes[i]?.id ?? i}
                className="brain-radar-dot"
                cx={p[0]}
                cy={p[1]}
                r={4.6}
                style={{ fill: `var(--play-${axes[i]?.slot ?? 14})` }}
              />
            ) : null
          )}
      </svg>
      {axes.map((a, i) => {
        const [x, y] = pt(i, max);
        const dx = x - cx;
        const dy = y - cy;
        const off = 12;
        const lx = x + (dx / R) * off;
        const ly = y + (dy / R) * off;
        const h = Math.abs(dx) < R * 0.3 ? 'mid' : dx > 0 ? 'start' : 'end';
        const v = dy < -R * 0.7 ? 'above' : dy > R * 0.7 ? 'below' : 'center';
        const val = current ? current.values[i] : null;
        const missing = current ? !finite(val) : false;
        const style = { left: `${((lx / W) * 100).toFixed(2)}%`, top: `${((ly / H) * 100).toFixed(2)}%` };
        const cls = `brain-radar-label h-${h} v-${v}${missing ? ' missing' : ''}`;
        const body = (
          <>
            <span className="brain-radar-name">{a.label}</span>
            {showValues && current && (
              <span className="brain-radar-value">{finite(val) ? Math.round(val) : '—'}</span>
            )}
          </>
        );
        return onAxis ? (
          <button
            key={a.id}
            type="button"
            className={cls}
            style={style}
            onClick={() => onAxis(a.id)}
            aria-label={`${a.label}${current ? `, ${finite(val) ? Math.round(val) : 'not measured'}` : ''} — open`}
          >
            {body}
          </button>
        ) : (
          <span key={a.id} className={cls} style={style} aria-hidden>
            {body}
          </span>
        );
      })}
    </div>
  );
}
