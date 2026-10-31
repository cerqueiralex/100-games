import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BrainDomainId, BrainTestDefinition, ReferenceGrade } from '../types';
import type { StateFlag } from '../analytics';
import { domainColor, getBrainDomain } from '../domains';
import { gradeCopy, stateFlagCopy } from './copy';
import { DUR, easeOut, useReducedMotion } from '../../motion';
import { BedIcon, BoltIcon, MoonIcon } from '../../design/icons';

/**
 * Small shared pieces of the Brain Lab UI (tab, area page, runner,
 * check-in): grade badge, sparkline, count-up, progress ring, step dots,
 * the check-in streak emblem, state-flag chips and the test plate. CSS in
 * global.css ("BRAIN LAB · TAB…" section). Every animation here is decorative and collapses
 * under reduced motion; none of them ever runs during a scored block.
 */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/* ---------- grade badge (SCIENCE.md §2.2, §4.2) ---------- */

/**
 * The badge every reference index carries. Grade C reads "Approximate" with
 * a ≈ mark; grade P reads "Personal". `interactive` makes it a button that
 * opens the anchor sentence (touch has no hover tooltips); otherwise the
 * sentence rides on `title` and the surrounding surface explains it.
 */
export function GradeBadge({
  grade,
  anchor,
  interactive = false,
  personal = false
}: {
  grade: ReferenceGrade;
  anchor?: string;
  interactive?: boolean;
  /** a personal index on a graded test (after its baseline) */
  personal?: boolean;
}) {
  const g = gradeCopy(personal ? 'P' : grade, personal ? undefined : anchor);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open]);
  const kind = personal || grade === 'P' ? 'p' : grade === 'C' ? 'c' : 'ab';
  const body = (
    <>
      {kind === 'c' && <span className="bl-grade-mark" aria-hidden>≈</span>}
      {g.badge}
    </>
  );
  if (!interactive) {
    return (
      <span className={`bl-grade g-${kind}`} title={g.tooltip}>
        {body}
      </span>
    );
  }
  return (
    <span className="bl-grade-wrap" ref={ref}>
      <button
        type="button"
        className={`bl-grade g-${kind} is-btn`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {body}
      </button>
      {open && (
        <span className="bl-grade-tip fx-card" role="tooltip" id={tipId}>
          {g.tooltip}
        </span>
      )}
    </span>
  );
}

/* ---------- count-up ---------- */

/** an animated number toward `target` (instant under reduced motion or when `skip`) */
export function useCountUp(target: number | null, { duration = 900, from = 0, skip = false } = {}): number | null {
  const reduce = useReducedMotion();
  const [v, setV] = useState<number | null>(reduce || skip || target === null ? target : from);
  useEffect(() => {
    if (target === null) {
      setV(null);
      return;
    }
    if (reduce || skip) {
      setV(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (ts: number) => {
      const p = easeOut(Math.min(1, (ts - t0) / duration));
      setV(from + (target - from) * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, skip, duration, from]);
  return v;
}

/* ---------- sparkline ---------- */

/**
 * A tiny trend line of raw primary-metric values (every primary metric is
 * higher-is-better, so up is better on every card). Dim points are
 * calibration runs. Scaled to its own range — a shape, never a score.
 */
export function Sparkline({
  points,
  color,
  width = 96,
  height = 28,
  label
}: {
  points: { x: number; hollow?: boolean }[];
  color: string;
  width?: number;
  height?: number;
  label?: string;
}) {
  if (points.length < 2) return <span className="bl-spark empty" style={{ width, height }} aria-hidden />;
  const xs = points.map((p) => p.x);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const span = hi - lo || 1;
  const pad = 3;
  const px = (i: number) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const py = (x: number) => height - pad - ((x - lo) / span) * (height - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.x).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg
      className="bl-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ ['--spark' as string]: color } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path className="bl-spark-line" d={d} />
      {points.map((p, i) =>
        p.hollow ? <circle key={i} className="bl-spark-cal" cx={px(i)} cy={py(p.x)} r={1.8} /> : null
      )}
      <circle className="bl-spark-last" cx={px(points.length - 1)} cy={py(last.x)} r={3} />
    </svg>
  );
}

/* ---------- progress ring & step dots ---------- */

/** a ring that fills to `value` (0..1), with content in the middle; the fill eases in on mount */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--accent)',
  children,
  label
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <span
      className="bl-ring"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="bl-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="bl-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          style={{ stroke: color, strokeDasharray: c, strokeDashoffset: c * (1 - shown) }}
        />
      </svg>
      {children !== undefined && <span className="bl-ring-mid">{children}</span>}
    </span>
  );
}

/** n of total as discrete dots (calibration runs, baseline runs) */
export function StepDots({ done, total, color, label }: { done: number; total: number; color?: string; label?: string }) {
  return (
    <span className="bl-steps" role="img" aria-label={label ?? `${done} of ${total}`} style={color ? ({ ['--step' as string]: color } as CSSProperties) : undefined}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`bl-step${i < done ? ' on' : ''}`} style={{ ['--i' as string]: i } as CSSProperties} />
      ))}
    </span>
  );
}

/* ---------- the check-in streak emblem ---------- */

/**
 * The daily check-in's own streak emblem — a lab flask, deliberately neither
 * the play streak's flame nor the Daily Challenge's calendar page (DESIGN.md
 * "Streak & landmarks": two trophies must never be confused). Sticker art:
 * content-palette fill with --ink outlines, identical on every theme. Cold
 * (no check-in yet today) renders grayscale, the same nudge the flame uses.
 */
export function CheckinEmblem({ size = 44, warm, count }: { size?: number; warm: boolean; count?: number }) {
  const label = count !== undefined ? String(count) : undefined;
  const long = (label?.length ?? 0) > 2;
  return (
    <svg className={`bl-emblem${warm ? ' warm' : ' cold'}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <path className="bl-emblem-glass" d="M24 6h16v4h-2v13.5l15.2 24.6A6 6 0 0 1 48.1 57H15.9a6 6 0 0 1-5.1-8.9L26 23.5V10h-2Z" />
      <path className="bl-emblem-liquid" d="M18.6 38h26.8l6 9.8a3.6 3.6 0 0 1-3.1 5.4H15.7a3.6 3.6 0 0 1-3.1-5.4Z" />
      <circle className="bl-emblem-bubble b1" cx="27" cy="31" r="2.2" />
      <circle className="bl-emblem-bubble b2" cx="35" cy="25" r="1.6" />
      <circle className="bl-emblem-bubble b3" cx="31" cy="18" r="1.2" />
      <path className="bl-emblem-shine" d="M29.5 12v12.6L22 37" />
      {label && (
        <text x="32" y={long ? 49.5 : 50.5} textAnchor="middle" fontSize={long ? 10 : 12.5} fontWeight="800" className="bl-emblem-num">
          {label}
        </text>
      )}
    </svg>
  );
}

/* ---------- check-in context flags (SCIENCE.md §2.8 — icons, never a verdict) ---------- */

const FLAG_ICON: Record<StateFlag, ReactNode> = {
  sleepy: <MoonIcon size={14} />,
  'short-sleep': <BedIcon size={14} />,
  'high-stress': <BoltIcon size={14} />
};

export function StateFlagChips({ flags, compact = false }: { flags: StateFlag[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <span className={`bl-flags${compact ? ' compact' : ''}`}>
      {flags.map((f) => {
        const c = stateFlagCopy(f);
        return (
          <span key={f} className="bl-flag" title={c.detail} aria-label={`${c.label}: ${c.detail}`}>
            {FLAG_ICON[f]}
            {!compact && <span>{c.label}</span>}
          </span>
        );
      })}
    </span>
  );
}

/* ---------- the test plate ---------- */

/** a benchmark's sticker on a plate tinted with its area colour */
export function TestPlate({ test, domain, size = 44 }: { test?: BrainTestDefinition; domain: BrainDomainId; size?: number }) {
  return (
    <span className="bl-plate" style={{ width: size, height: size, ['--area' as string]: domainColor(domain) } as CSSProperties} aria-hidden>
      {test ? <span className="bl-plate-art">{test.icon}</span> : <span className="bl-plate-dot" />}
    </span>
  );
}

/** the CSS custom property that carries an area's colour */
export function areaStyle(domain: BrainDomainId | string, extra?: CSSProperties): CSSProperties {
  return { ['--area' as string]: domainColor(domain), ...extra } as CSSProperties;
}

/** the area's display name */
export function areaName(domain: BrainDomainId | string): string {
  return getBrainDomain(domain)?.name ?? domain;
}

/** round an index for display */
export function fmtIndex(v: number | null | undefined): string {
  return finite(v) ? String(Math.round(v)) : '—';
}

/** a signed delta ("+3", "−1.2") with a real minus sign */
export function signed(v: number, decimals = 0): string {
  const s = Math.abs(v).toFixed(decimals);
  if (Number(s) === 0) return `±${s}`;
  return `${v > 0 ? '+' : '−'}${s}`;
}

/** DUR re-export for components that pace their own entrances */
export const ENTER_MS = DUR.emphasis;
