import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { AreaView, CheckinMark, DayRow, RunDot } from './dashModel';
import { DAY_MS, addDays, keyToMs, shortDate } from './dashModel';

/**
 * The Profile → Brain dashboard's charts — dependency-free SVG in the
 * charts.tsx family, drawn at the container's REAL pixel width (measured with
 * a ResizeObserver) so 11 px axis text stays 11 px on a phone instead of
 * scaling with a viewBox. Styling lives in global.css ("BRAIN LAB · PROFILE → BRAIN DASHBOARD")
 * (`.bd-*`); a chart's identity colour arrives as the `--ink` custom
 * property, already lifted to 3:1 on the theme (legibleOn), so a yellow
 * area line is still a line on warm paper.
 *
 * Mark rules (the dataviz standard, within DESIGN.md): thin 2 px lines,
 * solid hairline grids, one axis per chart (sleep and Reaction are two
 * aligned charts, never a dual axis), colour never the only cue (every
 * series is named by a legend or its panel title), every value reachable
 * without hovering (end labels, the run logs), and a tooltip that only
 * enhances. Motion — lines drawing in, dots popping, bars growing — keys off
 * the motion tokens, so reduced motion gets the finished chart at once.
 */

/* ---------- measuring & scales ---------- */

export function useWidth<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.round(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const lin = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** round ticks (1/2/2.5/5 × 10^k) covering [lo, hi] */
export function niceTicks(lo: number, hi: number, count = 4, integer = false): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const mag = integer ? Math.max(1, 10 ** Math.floor(Math.log10(raw))) : 10 ** Math.floor(Math.log10(raw));
  const steps = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step = steps.map((m) => m * mag).find((s) => s >= raw * 0.999) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const stepDecimals = (ticks: number[]) => {
  if (ticks.length < 2) return 0;
  const step = Math.abs(ticks[1] - ticks[0]);
  return step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9));
};

/** date ticks on local midnights: days, Mondays, fortnights or month starts, ≤ max of them */
export function timeTicks(t0: number, t1: number, max: number): number[] {
  const days = (t1 - t0) / DAY_MS;
  const steps = [1, 2, 3, 7, 14, 28];
  const step = steps.find((s) => days / s <= max) ?? 28;
  const start = new Date(t0);
  start.setHours(0, 0, 0, 0);
  const out: number[] = [];
  if (step === 28) {
    const d = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const every = Math.max(1, Math.ceil(days / 30 / max));
    while (d.getTime() <= t1) {
      out.push(d.getTime());
      d.setMonth(d.getMonth() + every);
    }
    return out;
  }
  const d = new Date(start);
  if (step >= 7) d.setDate(d.getDate() + ((8 - d.getDay()) % 7)); // next Monday
  else d.setDate(d.getDate() + 1);
  while (d.getTime() <= t1) {
    if (d.getTime() >= t0) out.push(d.getTime());
    d.setDate(d.getDate() + step);
  }
  return out;
}

/* ---------- tooltip ---------- */

/** a tap anywhere outside the chart puts its tooltip away (touch has no "leave") */
function useDismiss(ref: React.RefObject<HTMLElement>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, ref, close]);
}

export function ChartTip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const below = y < 64;
  // the tip is at most 200 px wide, centred on the mark but kept inside the chart
  const left = Math.max(100, Math.min(width - 100, x));
  return (
    <div className={`bd-tip${below ? ' below' : ''}`} style={{ left, top: y }} role="status">
      {children}
    </div>
  );
}

/** pointer position inside an element, in CSS px */
function localPoint(e: React.PointerEvent<Element>, el: Element | null): [number, number] {
  const r = el?.getBoundingClientRect();
  return r ? [e.clientX - r.left, e.clientY - r.top] : [0, 0];
}

const inkStyle = (ink: string): CSSProperties => ({ ['--ink' as string]: ink });

/* ---------- the per-area chart (small multiple + detail) ---------- */

export interface AreaChartProps {
  view: AreaView;
  ink: string;
  t0: number;
  t1: number;
  height: number;
  variant: 'mini' | 'full';
  fmt: (x: number) => string;
  /** full variant: what the tooltip says about a run / a week */
  describeRun?: (d: RunDot) => ReactNode;
  describeWeek?: (w: AreaView['weekly'][number]) => ReactNode;
  /** an accessible one-sentence summary */
  label: string;
}

export function AreaChart({ view, ink, t0, t1, height, variant, fmt, describeRun, describeWeek, label }: AreaChartProps) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; body: ReactNode } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const full = variant === 'full';
  useDismiss(ref, !!tip, () => setTip(null));

  const extent = (() => {
    const xs: number[] = [];
    for (const d of view.dots) if (finite(d.x) && d.t >= t0 && d.t <= t1) xs.push(d.x);
    for (const k of view.weekly) if (k.t >= t0 && k.t <= t1) xs.push(k.x);
    for (const s of view.smooth) if (s.t >= t0 && s.t <= t1) xs.push(s.x);
    if (view.base) xs.push(view.base.value - view.base.half, view.base.value + view.base.half);
    if (!xs.length) return null;
    let lo = Math.min(...xs);
    let hi = Math.max(...xs);
    if (hi - lo < 1e-9) {
      const p = Math.abs(hi) * 0.1 || 1;
      lo -= p;
      hi += p;
    }
    const p = (hi - lo) * (full ? 0.08 : 0.12);
    return [lo - p, hi + p] as [number, number];
  })();

  const padL = full ? 46 : 4;
  const padR = full ? 14 : 6;
  const padT = full ? 14 : 8;
  const padB = full ? 24 : 16;
  const W = Math.max(0, w);
  const H = height;
  const x = lin(t0, t1, padL, W - padR);
  const yTicks = extent ? niceTicks(extent[0], extent[1], full ? 4 : 2) : [];
  const yDom: [number, number] = extent
    ? [Math.min(extent[0], yTicks[0] ?? extent[0]), Math.max(extent[1], yTicks[yTicks.length - 1] ?? extent[1])]
    : [0, 1];
  const y = lin(yDom[0], yDom[1], H - padB, padT);
  const dec = stepDecimals(yTicks);
  const xTicks = W ? timeTicks(t0, t1, Math.max(2, Math.floor(W / (full ? 64 : 56)))) : [];
  const inRange = (t: number) => t >= t0 - 1 && t <= t1 + 1;
  const bottom = H - padB;

  const dots = view.dots.filter((d) => inRange(d.t));
  const latest = view.latest && inRange(view.latest.t) ? view.latest : null;
  const weeks = view.weekly.filter((k) => inRange(k.t));
  const smooth = view.smooth.filter((s) => inRange(s.t));
  const path = (pts: { t: number; x: number }[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.x).toFixed(1)}`).join(' ');

  const calib =
    view.calib && view.calib.t1 >= t0 && view.calib.t0 <= t1
      ? { x0: Math.max(padL, x(view.calib.t0) - 6), x1: Math.min(W - padR, x(view.calib.t1) + 6) }
      : null;
  const base = view.base;
  const baseX0 = base ? Math.max(padL, x(Math.max(base.from, t0))) : 0;

  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    if (!full || !extent) return;
    const [px, py] = localPoint(e, svgRef.current);
    let best: { d2: number; x: number; y: number; body: ReactNode } | null = null;
    for (const d of dots) {
      const dx = x(d.t);
      const dy = finite(d.x) ? y(d.x) : bottom - 3;
      const d2 = (dx - px) ** 2 + (dy - py) ** 2;
      if (!best || d2 < best.d2) best = { d2, x: dx, y: dy, body: describeRun?.(d) };
    }
    for (const k of weeks) {
      const dx = x(k.t);
      const dy = y(k.x);
      const d2 = (dx - px) ** 2 + (dy - py) ** 2 - 40; // weeks win a near tie
      if (!best || d2 < best.d2) best = { d2, x: dx, y: dy, body: describeWeek?.(k) };
    }
    if (best && best.d2 <= 34 ** 2 && best.body) setTip({ x: best.x, y: best.y, body: best.body });
    else setTip(null);
  };

  return (
    <div ref={ref} className={`bd-chart bd-area-chart ${variant}`} style={{ ...inkStyle(ink), height: H }}>
      {W > 0 && (
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          {full &&
            yTicks.map((v) => (
              <g key={v}>
                <line className="bd-grid" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
                <text className="bd-axis" x={padL - 7} y={y(v) + 3.5} textAnchor="end">
                  {v.toFixed(dec)}
                </text>
              </g>
            ))}
          {!full && <line className="bd-grid" x1={padL} x2={W - padR} y1={bottom} y2={bottom} />}
          {calib && calib.x1 > calib.x0 && (
            <g className="bd-calib">
              <rect x={calib.x0} y={padT - 4} width={calib.x1 - calib.x0} height={bottom - padT + 4} rx={4} />
              {calib.x1 - calib.x0 >= (full ? 64 : 58) ? (
                <text x={(calib.x0 + calib.x1) / 2} y={padT + (full ? 8 : 6)} textAnchor="middle">
                  Calibrating
                </text>
              ) : null}
            </g>
          )}
          {base && baseX0 < W - padR && (
            <g className="bd-base">
              <rect
                className="bd-band"
                x={baseX0}
                width={W - padR - baseX0}
                y={y(base.value + base.half)}
                height={Math.max(1, y(base.value - base.half) - y(base.value + base.half))}
              />
              <line className="bd-baseline" x1={baseX0} x2={W - padR} y1={y(base.value)} y2={y(base.value)} />
              <line className="bd-band-edge" x1={baseX0} x2={W - padR} y1={y(base.value + base.half)} y2={y(base.value + base.half)} />
              <line className="bd-band-edge" x1={baseX0} x2={W - padR} y1={y(base.value - base.half)} y2={y(base.value - base.half)} />
            </g>
          )}
          {smooth.length > 1 && <path className="bd-ewma bd-draw" d={path(smooth)} pathLength={1} />}
          {weeks.length > 1 && <path className="bd-week bd-draw" d={path(weeks)} pathLength={1} />}
          <g className="bd-dots">
            {dots.map((d, i) => {
              const cx = x(d.t);
              const nan = !finite(d.x);
              const cy = nan ? bottom - 3 : y(d.x);
              const isLatest = latest && d.t === latest.t && !nan && d.role !== 'invalid';
              if (isLatest) return null;
              const cls =
                d.role === 'invalid'
                  ? 'invalid'
                  : !d.current
                    ? 'other'
                    : d.role === 'practice'
                      ? 'practice'
                      : d.role === 'run-in'
                        ? 'runin'
                        : 'scored';
              const r = cls === 'practice' ? (full ? 2 : 1.6) : cls === 'other' ? 2.2 : full ? 3 : 2.4;
              return (
                <circle
                  key={d.run.s.id}
                  className={`bd-dot ${cls} bd-pop`}
                  cx={cx}
                  cy={cy}
                  r={r}
                  style={{ ['--i' as string]: Math.min(i, 60) }}
                />
              );
            })}
          </g>
          {weeks.map((k, i) => (
            <circle
              key={k.start}
              className="bd-week-dot bd-pop"
              cx={x(k.t)}
              cy={y(k.x)}
              r={full ? 4.5 : 3.6}
              style={{ ['--i' as string]: 20 + i }}
            />
          ))}
          {latest && (
            <g className="bd-latest bd-pop" style={{ ['--i' as string]: 70 }}>
              <circle cx={x(latest.t)} cy={y(latest.x)} r={full ? 5 : 4} />
              <text
                className={`bd-end-label${full ? '' : ' sm'}`}
                x={x(latest.t) - (full ? 8 : 7)}
                y={y(latest.x) < padT + 16 ? y(latest.x) + (full ? 18 : 15) : y(latest.x) - (full ? 9 : 7)}
                textAnchor="end"
              >
                {fmt(latest.x)}
              </text>
            </g>
          )}
          {xTicks.map((t) => {
            const tx = x(t);
            if (tx < padL + (full ? 14 : 12) || tx > W - padR - 14) return null;
            return (
              <g key={t}>
                {full && <line className="bd-tick" x1={tx} x2={tx} y1={bottom} y2={bottom + 4} />}
                <text className="bd-axis" x={tx} y={H - (full ? 6 : 3)} textAnchor="middle">
                  {shortDate(t)}
                </text>
              </g>
            );
          })}
          {full && (
            <rect
              className="bd-hit"
              x={padL}
              y={0}
              width={Math.max(0, W - padL - padR)}
              height={H}
              onPointerDown={pick}
              onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setTip(null)}
            />
          )}
        </svg>
      )}
      {tip && <ChartTip x={tip.x} y={tip.y} width={W}>{tip.body}</ChartTip>}
    </div>
  );
}

/* ---------- the Mean's weekly line ---------- */

export interface MeanPoint {
  start: string;
  index: number;
}

export function MeanTrendChart({
  weeks,
  baseIndex,
  height = 176
}: {
  weeks: MeanPoint[];
  baseIndex: number | null;
  height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  useDismiss(ref, hover !== null, () => setHover(null));
  const pts = weeks.map((k) => ({ t: keyToMs(k.start) + 3.5 * DAY_MS, v: k.index, start: k.start }));
  const W = w;
  const H = height;
  const padL = 34;
  const padR = 16;
  const padT = 16;
  const padB = 24;
  const vals = pts.map((p) => p.v);
  if (baseIndex !== null) vals.push(baseIndex);
  let lo = Math.min(...vals) - 3;
  let hi = Math.max(...vals) + 3;
  // keep the reference 50 in view when the data sits near it
  if (lo > 50 && lo - 50 <= 10) lo = 49;
  if (hi < 50 && 50 - hi <= 10) hi = 51;
  const ticks = niceTicks(lo, hi, 4, true);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);
  const t0 = pts[0].t - 3.5 * DAY_MS;
  const t1 = pts[pts.length - 1].t + 3.5 * DAY_MS;
  const x = lin(t0, t1, padL, W - padR);
  const y = lin(lo, hi, H - padB, padT);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const xTicks = W ? timeTicks(t0, t1, Math.max(2, Math.floor(W / 80))) : [];
  const last = pts[pts.length - 1];
  const show50 = lo <= 50 && hi >= 50;

  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const [px] = localPoint(e, svgRef.current);
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px)) best = i;
    });
    setHover(best);
  };
  const hp = hover !== null ? pts[hover] : null;

  return (
    <div ref={ref} className="bd-chart bd-mean-chart" style={{ height: H }}>
      {W > 0 && (
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`The Mean by week: ${pts.map((p) => `week of ${shortDate(keyToMs(p.start))} ${Math.round(p.v)}`).join(', ')}.`}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line className="bd-grid" x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} />
              <text className="bd-axis" x={padL - 7} y={y(v) + 3.5} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {show50 && (
            <g className="bd-ref50">
              <line x1={padL} x2={W - padR} y1={y(50)} y2={y(50)} />
              {Math.abs(y(50) - y(last.v)) > 18 && (baseIndex === null || Math.abs(y(50) - y(baseIndex)) > 14) && (
                <text x={W - padR} y={y(50) - 5} textAnchor="end">
                  Reference average
                </text>
              )}
            </g>
          )}
          {baseIndex !== null && (
            <g className="bd-base">
              <line className="bd-baseline" x1={padL} x2={W - padR} y1={y(baseIndex)} y2={y(baseIndex)} />
              <text className="bd-base-label" x={padL + 4} y={y(baseIndex) + (y(baseIndex) > H - padB - 14 ? -5 : 13)}>
                Your baseline {Math.round(baseIndex)}
              </text>
            </g>
          )}
          {pts.length > 1 && <path className="bd-mean-line bd-draw" d={d} pathLength={1} />}
          {pts.map((p, i) => (
            <circle
              key={p.start}
              className={`bd-mean-dot bd-pop${p === last ? ' last' : ''}`}
              cx={x(p.t)}
              cy={y(p.v)}
              r={p === last ? 5 : 3.5}
              style={{ ['--i' as string]: i * 2 }}
            />
          ))}
          <text className="bd-end-label" x={x(last.t)} y={y(last.v) - 10} textAnchor="end">
            {Math.round(last.v)}
          </text>
          {xTicks.map((t) => {
            const tx = x(t);
            if (tx < padL + 14 || tx > W - padR - 12) return null;
            return (
              <text key={t} className="bd-axis" x={tx} y={H - 6} textAnchor="middle">
                {shortDate(t)}
              </text>
            );
          })}
          {hp && <line className="bd-cross" x1={x(hp.t)} x2={x(hp.t)} y1={padT - 6} y2={H - padB} />}
          <rect
            className="bd-hit"
            x={padL}
            y={0}
            width={Math.max(0, W - padL - padR)}
            height={H}
            onPointerDown={pick}
            onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          />
        </svg>
      )}
      {hp && (
        <ChartTip x={x(hp.t)} y={y(hp.v)} width={W}>
          <b>{Math.round(hp.v)}</b>
          <span>Week of {shortDate(keyToMs(hp.start))}</span>
        </ChartTip>
      )}
    </div>
  );
}

/* ---------- sleep · Reaction · flags: three aligned panels, one crosshair ---------- */

export function ContextStack({
  days,
  reactionInk,
  reactionLabel,
  reactionBase,
  fmtReaction,
  describeDay
}: {
  days: DayRow[];
  reactionInk: string;
  reactionLabel: string;
  reactionBase: number | null;
  fmtReaction: (x: number) => string;
  describeDay: (d: DayRow) => ReactNode;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  useDismiss(ref, hover !== null, () => setHover(null));
  const W = w;
  const padL = 34;
  const padR = 8;
  const sleepTop = 22;
  const sleepH = 74;
  const reactTop = sleepTop + sleepH + 34;
  const reactH = 74;
  const flagTop = reactTop + reactH + 30;
  const flagRow = 16;
  const axisY = flagTop + flagRow * 3 + 16;
  const H = axisY + 4;
  const n = days.length;
  const band = (W - padL - padR) / Math.max(1, n);
  const cx = (i: number) => padL + band * (i + 0.5);
  const barW = Math.max(2, Math.min(14, band * 0.62));

  const sleeps = days.map((d) => d.sleep).filter(finite);
  const sleepMax = Math.max(9 * 60, ...sleeps, ...days.map((d) => d.usual).filter(finite));
  const sy = lin(0, sleepMax, sleepTop + sleepH, sleepTop);
  const sleepTicks = [3, 6, 9, 12, 15].filter((v) => v * 60 <= sleepMax);

  const reacts = days.map((d) => d.reaction).filter(finite);
  let rlo = Math.min(...reacts, ...(reactionBase !== null ? [reactionBase] : []));
  let rhi = Math.max(...reacts, ...(reactionBase !== null ? [reactionBase] : []));
  if (!reacts.length) {
    rlo = 0;
    rhi = 1;
  } else if (rhi - rlo < 1e-9) {
    rlo -= Math.abs(rlo) * 0.1 || 1;
    rhi += Math.abs(rhi) * 0.1 || 1;
  }
  const rp = (rhi - rlo) * 0.15;
  const rTicks = niceTicks(rlo - rp, rhi + rp, 2);
  const ry = lin(Math.min(rlo - rp, rTicks[0]), Math.max(rhi + rp, rTicks[rTicks.length - 1]), reactTop + reactH, reactTop);
  const rdec = stepDecimals(rTicks);

  // usual sleep as a step line (the reference the short-sleep flag uses)
  const usual = days
    .map((d, i) => (finite(d.usual) ? `${i && finite(days[i - 1].usual) ? 'L' : 'M'}${(cx(i) - band / 2).toFixed(1)} ${sy(d.usual).toFixed(1)} H${(cx(i) + band / 2).toFixed(1)}` : ''))
    .join(' ');
  const reactLine = (() => {
    let s = '';
    let pen = false;
    days.forEach((d, i) => {
      if (!finite(d.reaction)) return;
      s += `${pen ? 'L' : 'M'}${cx(i).toFixed(1)} ${ry(d.reaction).toFixed(1)} `;
      pen = true;
    });
    return s;
  })();

  let lastReact = -1;
  days.forEach((d, i) => {
    if (finite(d.reaction)) lastReact = i;
  });
  const flagRows: { id: 'sleepy' | 'short-sleep' | 'high-stress'; label: string }[] = [
    { id: 'sleepy', label: 'Sleepy' },
    { id: 'short-sleep', label: 'Short sleep' },
    { id: 'high-stress', label: 'High stress' }
  ];
  // day labels: every other day up to two weeks, Mondays up to five, then every other Monday
  const labelDay = (d: DayRow, i: number) => {
    if (n <= 14) return i % 2 === (n - 1) % 2;
    if (new Date(d.t).getDay() !== 1) return false;
    return n <= 35 || Math.round((d.t - days[0].t) / DAY_MS / 7) % 2 === 0;
  };
  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const [px] = localPoint(e, svgRef.current);
    const i = Math.max(0, Math.min(n - 1, Math.floor((px - padL) / band)));
    setHover(i);
  };
  const hd = hover !== null ? days[hover] : null;

  return (
    <div ref={ref} className="bd-chart bd-context" style={{ ...inkStyle(reactionInk), height: H }}>
      {W > 0 && (
        <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sleep, Reaction and check-in flags by day">
          {/* sleep */}
          <text className="bd-panel-title" x={padL} y={sleepTop - 9}>
            Sleep last night (hours)
          </text>
          {sleepTicks.map((v) => (
            <g key={`s${v}`}>
              <line className="bd-grid" x1={padL} x2={W - padR} y1={sy(v * 60)} y2={sy(v * 60)} />
              <text className="bd-axis" x={padL - 6} y={sy(v * 60) + 3.5} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          <line className="bd-axis-line" x1={padL} x2={W - padR} y1={sy(0)} y2={sy(0)} />
          {days.map((d, i) =>
            finite(d.sleep) ? (
              <rect
                key={d.key}
                className="bd-sleep-bar bd-grow-y"
                x={cx(i) - barW / 2}
                y={sy(d.sleep)}
                width={barW}
                height={Math.max(1, sy(0) - sy(d.sleep))}
                rx={Math.min(3, barW / 2)}
                style={{ ['--i' as string]: i }}
              />
            ) : null
          )}
          {usual && <path className="bd-usual" d={usual} />}

          {/* reaction */}
          <text className="bd-panel-title" x={padL} y={reactTop - 9}>
            {reactionLabel}
          </text>
          {reacts.length ? (
            <>
              {rTicks.map((v) => (
                <g key={`r${v}`}>
                  <line className="bd-grid" x1={padL} x2={W - padR} y1={ry(v)} y2={ry(v)} />
                  <text className="bd-axis" x={padL - 6} y={ry(v) + 3.5} textAnchor="end">
                    {v.toFixed(rdec)}
                  </text>
                </g>
              ))}
              {reactionBase !== null && (
                <line className="bd-baseline" x1={padL} x2={W - padR} y1={ry(reactionBase)} y2={ry(reactionBase)} />
              )}
              <path className="bd-react-line bd-draw" d={reactLine} pathLength={1} />
              {lastReact >= 0 && (
                <text
                  className="bd-end-label"
                  x={cx(lastReact) - 7}
                  y={ry(days[lastReact].reaction as number) - 8}
                  textAnchor="end"
                >
                  {fmtReaction(days[lastReact].reaction as number)}
                </text>
              )}
              {days.map((d, i) =>
                finite(d.reaction) ? (
                  <circle
                    key={d.key}
                    className={`bd-dot ${d.reactionRole === 'run-in' ? 'runin-hollow' : 'scored-solid'} bd-pop`}
                    cx={cx(i)}
                    cy={ry(d.reaction)}
                    r={3.2}
                    style={{ ['--i' as string]: i }}
                  />
                ) : null
              )}
            </>
          ) : (
            <text className="bd-empty-text" x={(padL + W - padR) / 2} y={reactTop + reactH / 2} textAnchor="middle">
              No scored Reaction runs in this window
            </text>
          )}

          {/* flags */}
          {flagRows.map((f, r) => (
            <g key={f.id}>
              <line className="bd-flag-track" x1={padL} x2={W - padR} y1={flagTop + r * flagRow + 4} y2={flagTop + r * flagRow + 4} />
              {days.map((d, i) =>
                d.flags.includes(f.id) ? (
                  <rect
                    key={d.key}
                    className="bd-flag-mark bd-pop"
                    x={cx(i) - Math.min(5, band * 0.38)}
                    y={flagTop + r * flagRow}
                    width={Math.min(10, band * 0.76)}
                    height={8}
                    rx={2}
                    style={{ ['--i' as string]: i }}
                  />
                ) : null
              )}
            </g>
          ))}
          <text className="bd-panel-title" x={padL} y={flagTop - 12}>
            Check-in flags
          </text>
          {!days.some((d) => d.flags.length) && (
            <text className="bd-empty-text" x={W - padR} y={flagTop - 12} textAnchor="end">
              none in this window
            </text>
          )}
          {flagRows.map((f, r) => (
            <text key={`l${f.id}`} className="bd-axis bd-flag-name" x={padL - 6} y={flagTop + r * flagRow + 7.5} textAnchor="end">
              {f.label === 'Short sleep' ? 'Short' : f.label === 'High stress' ? 'Stress' : f.label}
            </text>
          ))}

          {/* shared day axis */}
          {days.map((d, i) => {
            if (!labelDay(d, i)) return null;
            if (cx(i) < padL + 10 || cx(i) > W - padR - 12) return null;
            return (
              <text key={d.key} className="bd-axis" x={cx(i)} y={axisY} textAnchor="middle">
                {shortDate(d.t)}
              </text>
            );
          })}
          {hd && hover !== null && <line className="bd-cross" x1={cx(hover)} x2={cx(hover)} y1={sleepTop - 4} y2={flagTop + flagRow * 3} />}
          <rect
            className="bd-hit"
            x={padL}
            y={0}
            width={Math.max(0, W - padL - padR)}
            height={H}
            onPointerDown={pick}
            onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
          />
        </svg>
      )}
      {hd && hover !== null && (
        <ChartTip x={cx(hover)} y={sleepTop + 6} width={W}>
          {describeDay(hd)}
        </ChartTip>
      )}
    </div>
  );
}

/* ---------- a 1..n answer distribution ---------- */

export function LikertBars({ counts, low, high, title, scale }: { counts: number[]; low: string; high: string; title: string; scale: string }) {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((s, c) => s + c, 0);
  return (
    <figure className="bd-likert" aria-label={`${title}: ${counts.map((c, i) => `${i + 1}: ${c}`).join(', ')}`}>
      <figcaption className="bd-panel-cap">{title}</figcaption>
      <div className="bd-likert-bars" style={{ ['--n' as string]: counts.length }}>
        {counts.map((c, i) => (
          <div key={i} className="bd-likert-col">
            <span className="bd-likert-count">{c ? c : ''}</span>
            <span
              className={`bd-likert-bar bd-grow-y${c ? '' : ' zero'}`}
              style={{ height: c ? Math.max(3, Math.round((c / max) * 64)) : 2, ['--i' as string]: i }}
            />
            <span className="bd-likert-tick">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="bd-likert-ends">
        <span>{low}</span>
        <span>{high}</span>
      </div>
      <p className="bd-mini-note">
        {total ? `${total} answer${total === 1 ? '' : 's'}` : 'No answers in this window'} · {scale}
      </p>
    </figure>
  );
}

/* ---------- check-in calendar ---------- */

export function CheckinCalendar({
  marks,
  todayKey,
  onPick
}: {
  marks: Map<string, CheckinMark>;
  todayKey: string;
  onPick: (key: string) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<string | null>(null);
  const labelW = 26;
  const gap = 3;
  const topH = 16;
  const weeks = Math.max(8, Math.min(26, Math.floor((w - labelW + gap) / (16 + gap))));
  const cs = w ? Math.min(20, (w - labelW - (weeks - 1) * gap) / weeks) : 0;
  const today = new Date(keyToMs(todayKey));
  const monday = addDays(todayKey, -((today.getDay() + 6) % 7));
  const firstMonday = addDays(monday, -(weeks - 1) * 7);
  const H = topH + 7 * cs + 6 * gap + 2;
  const cols: { key: string; month: number }[] = [];
  for (let c = 0; c < weeks; c++) {
    const k = addDays(firstMonday, c * 7);
    cols.push({ key: k, month: new Date(keyToMs(k)).getMonth() });
  }
  let lastLabel = -10;
  const pick = (e: React.PointerEvent<SVGRectElement>) => {
    const [px, py] = localPoint(e, svgRef.current);
    const c = Math.floor((px - labelW) / (cs + gap));
    const r = Math.floor((py - topH) / (cs + gap));
    if (c < 0 || c >= weeks || r < 0 || r > 6) return;
    const key = addDays(firstMonday, c * 7 + r);
    if (key > todayKey) return;
    setSel(key);
    onPick(key);
  };
  return (
    <div ref={ref} className="bd-chart bd-calendar" style={{ height: H || 140 }}>
      {w > 0 && cs > 0 && (
        <svg ref={svgRef} width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label="Check-in calendar">
          {cols.map((col, c) => {
            const show = c === 0 ? false : col.month !== cols[c - 1].month && c - lastLabel >= 3;
            if (show) lastLabel = c;
            return show ? (
              <text key={`m${col.key}`} className="bd-axis" x={labelW + c * (cs + gap)} y={10}>
                {new Date(keyToMs(col.key)).toLocaleDateString(undefined, { month: 'short' })}
              </text>
            ) : null;
          })}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} className="bd-axis" x={0} y={topH + (i * 2) * (cs + gap) + cs * 0.72}>
              {d}
            </text>
          ))}
          {cols.map((col, c) =>
            Array.from({ length: 7 }, (_, r) => {
              const key = addDays(col.key, r);
              if (key > todayKey) return null;
              const m = marks.get(key);
              return (
                <rect
                  key={key}
                  className={`bd-cal-cell ${m ?? 'none'}${key === todayKey ? ' today' : ''}${key === sel ? ' sel' : ''} bd-fade`}
                  x={labelW + c * (cs + gap)}
                  y={topH + r * (cs + gap)}
                  width={cs}
                  height={cs}
                  rx={Math.min(4, cs / 3.5)}
                  style={{ ['--i' as string]: c }}
                />
              );
            })
          )}
          <rect className="bd-hit" x={labelW} y={topH} width={Math.max(0, w - labelW)} height={H - topH} onPointerDown={pick} />
        </svg>
      )}
    </div>
  );
}

/* ---------- training volume (context, never a score) ---------- */

export function VolumeBars({
  rows
}: {
  rows: { id: string; name: string; ink: string; d7: number; d28: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.d28));
  return (
    <div className="bd-volume" role="table" aria-label="Training plays per area, last 7 and 28 days">
      <div className="bd-volume-head" role="row">
        <span role="columnheader">Area</span>
        <span role="columnheader" aria-hidden />
        <span role="columnheader">7 d · 28 d</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="bd-volume-row" role="row" style={inkStyle(r.ink)}>
          <span className="bd-volume-name" role="rowheader">
            <span className="bd-ink-dot" aria-hidden />
            {r.name}
          </span>
          <span className="bd-volume-track" aria-hidden>
            {r.d28 > 0 && <span className="bd-volume-bar d28 bd-grow-x" style={{ width: `${(r.d28 / max) * 100}%`, ['--i' as string]: i }} />}
            {r.d7 > 0 && <span className="bd-volume-bar d7 bd-grow-x" style={{ width: `${(r.d7 / max) * 100}%`, ['--i' as string]: i }} />}
          </span>
          <span className="bd-volume-num" role="cell">
            <b>{r.d7}</b> · {r.d28}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- a secondary metric over time (detail view) ---------- */

export function MetricLine({
  points,
  ink,
  fmt,
  t0,
  t1
}: {
  points: { t: number; x: number }[];
  ink: string;
  fmt: (x: number) => string;
  t0: number;
  t1: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const H = 74;
  const padL = 4;
  const padR = 4;
  const padT = 10;
  const padB = 10;
  const pts = points.filter((p) => p.t >= t0 && p.t <= t1 && finite(p.x));
  if (pts.length === 0) {
    return (
      <div ref={ref} className="bd-chart bd-metric-line empty">
        <p className="bd-mini-note">No valid runs in this range.</p>
      </div>
    );
  }
  let lo = Math.min(...pts.map((p) => p.x));
  let hi = Math.max(...pts.map((p) => p.x));
  if (hi - lo < 1e-9) {
    lo -= Math.abs(lo) * 0.1 || 1;
    hi += Math.abs(hi) * 0.1 || 1;
  }
  const x = lin(t0, t1, padL, w - padR);
  const y = lin(lo, hi, H - padB, padT);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.x).toFixed(1)}`).join(' ');
  return (
    <div ref={ref} className="bd-chart bd-metric-line" style={{ ...inkStyle(ink), height: H }}>
      {w > 0 && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden>
          <line className="bd-grid" x1={padL} x2={w - padR} y1={y(hi)} y2={y(hi)} />
          <line className="bd-grid" x1={padL} x2={w - padR} y1={y(lo)} y2={y(lo)} />
          {pts.length > 1 && <path className="bd-week bd-thin bd-draw" d={d} pathLength={1} />}
          {pts.map((p, i) => (
            <circle key={i} className="bd-dot scored bd-pop" cx={x(p.t)} cy={y(p.x)} r={2.4} style={{ ['--i' as string]: i }} />
          ))}
        </svg>
      )}
      <span className="bd-metric-max">{fmt(hi)}</span>
      <span className="bd-metric-min">{fmt(lo)}</span>
    </div>
  );
}
