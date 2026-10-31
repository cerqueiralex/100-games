import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ThemeId } from '../../types';
import type { BrainRunType, ReferenceGrade } from '../types';
import { gradeCopy, roleCopy, type CopyTone } from './copy';
import { legibleOn } from '../../design/profileColors';
import { InfoIcon } from '../../design/icons';
import { sfx } from '../../audio';
import { DUR, easeOut, useReducedMotion } from '../../motion';

/**
 * Small shared pieces of the Profile → Brain dashboard (badges, arrows,
 * chips, the hero count-up). Kept apart from the sections so the overview
 * and the area detail speak one visual language.
 */

/**
 * Area identity colours for the dashboard's marks: the area's fixed
 * --play-<slot>, lifted in LIGHTNESS only until it clears 3:1 on the theme
 * (the profile-colour rule, legibleOn) — yellow is 1.3:1 on warm paper and a
 * 2 px line in it would vanish. Hue is untouched, so the area keeps its
 * colour on every surface. Falls back to the raw token when the computed
 * value cannot be read.
 */
export function useInks(theme: ThemeId): (slot: number) => string {
  return useMemo(() => {
    const cache = new Map<number, string>();
    const root = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    return (slot: number) => {
      const hit = cache.get(slot);
      if (hit) return hit;
      const raw = root?.getPropertyValue(`--play-${slot}`).trim() ?? '';
      const v = /^#[0-9a-f]{6}$/i.test(raw) ? legibleOn(raw, theme) : `var(--play-${slot})`;
      cache.set(slot, v);
      return v;
    };
  }, [theme]);
}

export const inkVar = (ink: string): CSSProperties => ({ ['--ink' as string]: ink });

/** an arrow glyph for a copy tone — ALWAYS neutral ink (SCIENCE.md §4.1 "no alarm") */
export function ToneArrow({ tone, size = 14 }: { tone: CopyTone; size?: number }) {
  // "within" needs no glyph — a flat dash read as punctuation
  if (tone === 'neutral') return null;
  const rot = tone === 'up' ? -40 : 40;
  return (
    <svg className={`bd-arrow ${tone}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <g transform={`rotate(${rot} 8 8)`}>
        <path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" />
      </g>
    </svg>
  );
}

/** the reference-grade badge; tapping it explains the grade (SCIENCE.md §4.2) */
export function GradeBadge({ grade, anchor, label }: { grade: ReferenceGrade; anchor?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const copy = gradeCopy(grade, anchor);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <span className="bd-grade-wrap" ref={wrap}>
      <button
        type="button"
        className={`bd-grade g-${grade}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          sfx.tap();
          setOpen((o) => !o);
        }}
      >
        {label ?? copy.badge}
        <InfoIcon size={12} />
      </button>
      {open && (
        <span className="bd-pop-note" role="note" onClick={(e) => e.stopPropagation()}>
          {copy.tooltip}
        </span>
      )}
    </span>
  );
}

/** how a run was used (Calibrating, Baseline run, Scored, Practice, Not valid) */
export function RoleChip({ role }: { role: BrainRunType }) {
  return <span className={`bd-role r-${role}`}>{roleCopy(role)}</span>;
}

/** a row of pick-one chips (the profile's metric-chip look) */
export function ChipRow<T extends string | number>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="metric-chips bd-chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={`metric-chip ${o.id === value ? 'active' : ''}`}
          onClick={() => {
            if (o.id === value) return;
            sfx.tap();
            onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="bd-section-head">
      <h3 className="section-title">{children}</h3>
      {aside}
    </div>
  );
}

/** a number that counts up once on mount (instant under reduced motion) */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (ts: number) => {
      const p = easeOut(Math.min(1, (ts - t0) / (DUR.emphasis + 300)));
      setShown(start + (value - start) * p);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span className={className}>{Math.round(shown)}</span>;
}

/** the reference scale (SCIENCE.md §2.2): 50 + 10z, with an optional marker */
export function ScaleBar({ value, caption }: { value: number | null; caption: string }) {
  const lo = 20;
  const hi = 80;
  const pos = (v: number) => `${((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100}%`;
  return (
    <figure className="bd-scale" aria-label={caption}>
      <div className="bd-scale-track">
        {[30, 40, 50, 60, 70].map((t) => (
          <span key={t} className={`bd-scale-tick${t === 50 ? ' mid' : ''}`} style={{ left: pos(t) }} />
        ))}
        {value !== null && <span className="bd-scale-marker" style={{ left: pos(value) }} />}
      </div>
      <div className="bd-scale-labels" aria-hidden>
        {[30, 40, 50, 60, 70].map((t) => (
          <span key={t} style={{ left: pos(t) }}>
            {t}
          </span>
        ))}
      </div>
      <figcaption className="bd-mini-note">{caption}</figcaption>
    </figure>
  );
}
