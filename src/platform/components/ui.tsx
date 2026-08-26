import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { sfx } from '../audio';
import { RosetteIcon } from '../design/icons';
import { RANK_BADGE } from '../design/rankMaterials';

/** Icons live in the design system — re-exported here for convenience. */
export * from '../design/icons';

/**
 * The standard in-game tool button (see DESIGN.md "Tool buttons"). Accent
 * paint, hover/press effects and the click sound come built in — games must
 * use this instead of hand-writing `<button className="pad-tool">`. Pass
 * `active` for toggles (renders the pressed state + aria-pressed) and
 * `silent` when the handler plays its own sfx (e.g. hints).
 */
export function PadTool({
  active,
  silent,
  className,
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; silent?: boolean }) {
  return (
    <button
      {...rest}
      aria-pressed={active ?? rest['aria-pressed']}
      className={['pad-tool', active ? 'active' : '', className ?? ''].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (!silent) sfx.tap();
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

/**
 * The design-system dropdown — use this instead of native <select> anywhere
 * a themed picker is needed (see DESIGN.md). Glass panel, accent states.
 */
export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className="dropdown" ref={ref}>
      <button
        className={`dropdown-btn ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          sfx.tap();
          setOpen((o) => !o);
        }}
      >
        <span>{current?.label ?? value}</span>
        <span className={`dropdown-chev ${open ? 'up' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="dropdown-menu fx-card" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`dropdown-item ${o.value === value ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Today" / "Yesterday" / short date — labels for the calendar picker */
function calDayLabel(key: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(key);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  });
}

const CalChevron = ({ dir }: { dir: -1 | 1 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={dir === -1 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

/**
 * The design-system date picker: a month calendar in a popover. Days with
 * data are tappable and show their count; everything else is inert. Use
 * this (never a Dropdown) when the value is a date.
 */
export function CalendarPicker({
  value,
  onChange,
  days,
  ariaLabel
}: {
  /** 'all' or a Date.toDateString() key */
  value: string;
  onChange: (v: string) => void;
  /** selectable days: Date.toDateString() key -> count shown on the day */
  days: Map<string, number>;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const monthIdx = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const latestPlayed = () => {
    let best: number | null = null;
    days.forEach((_, k) => {
      const t = new Date(k).getTime();
      if (best === null || t > best) best = t;
    });
    return best === null ? new Date() : new Date(best);
  };
  const [view, setView] = useState<Date>(() => {
    const base = value !== 'all' ? new Date(value) : latestPlayed();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // month navigation stays within the range that actually has data
  let minIdx = Infinity;
  let maxIdx = -Infinity;
  days.forEach((_, k) => {
    const idx = monthIdx(new Date(k));
    if (idx < minIdx) minIdx = idx;
    if (idx > maxIdx) maxIdx = idx;
  });
  if (!Number.isFinite(minIdx)) minIdx = maxIdx = monthIdx(new Date());

  const vIdx = monthIdx(view);
  const goto = (delta: number) => setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));

  const dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const offset = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const todayKey = new Date().toDateString();
  const selCount = days.get(value) ?? 0;
  const label =
    value === 'all' ? 'All dates' : `${calDayLabel(value)} · ${selCount} game${selCount === 1 ? '' : 's'}`;

  return (
    <div className="dropdown" ref={ref}>
      <button
        className={`dropdown-btn ${open ? 'open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          sfx.tap();
          if (!open) {
            const base = value !== 'all' ? new Date(value) : latestPlayed();
            setView(new Date(base.getFullYear(), base.getMonth(), 1));
          }
          setOpen((o) => !o);
        }}
      >
        <span>{label}</span>
        <span className={`dropdown-chev ${open ? 'up' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="cal-panel fx-card" role="dialog" aria-label="Pick a day">
          <div className="cal-head">
            <button
              className="cal-nav"
              disabled={vIdx <= minIdx}
              aria-label="Previous month"
              onClick={() => {
                sfx.tap();
                goto(-1);
              }}
            >
              <CalChevron dir={-1} />
            </button>
            <span className="cal-title">
              {view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              className="cal-nav"
              disabled={vIdx >= maxIdx}
              aria-label="Next month"
              onClick={() => {
                sfx.tap();
                goto(1);
              }}
            >
              <CalChevron dir={1} />
            </button>
          </div>
          <div className="cal-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="cal-dow">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank${i}`} />
            ))}
            {Array.from({ length: dim }, (_, i) => {
              const key = new Date(view.getFullYear(), view.getMonth(), i + 1).toDateString();
              const count = days.get(key);
              return (
                <button
                  key={key}
                  className={`cal-day ${value === key ? 'sel' : ''} ${key === todayKey ? 'today' : ''}`}
                  disabled={!count}
                  aria-label={`${key} — ${count ?? 0} game${count === 1 ? '' : 's'}`}
                  onClick={() => {
                    sfx.tap();
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  <span>{i + 1}</span>
                  {count ? <b className="cal-count">{count}</b> : null}
                </button>
              );
            })}
          </div>
          <button
            className={`cal-all ${value === 'all' ? 'active' : ''}`}
            onClick={() => {
              sfx.tap();
              onChange('all');
              setOpen(false);
            }}
          >
            All dates
          </button>
        </div>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      className="toggle-row"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-desc">{description}</span>}
      </span>
      <span className={`switch ${checked ? 'on' : ''}`} aria-hidden>
        <span className="knob" />
      </span>
    </button>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card fx-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/**
 * The swept-all-difficulties rosette as a standalone ACHIEVEMENT badge, with
 * the number of games that earned it on a counter bubble beside it.
 *
 * Same family as the inline `.game-card-trophy` on game cards — `--xp` disc,
 * `--xp-rim` border, white rosette medal (the shared `RosetteIcon`, one
 * drawing for both surfaces) — so the mark means one thing everywhere; this
 * is the counted form for the level card. It is deliberately NOT a crown:
 * crowns belong to the rank ladder, and this badge faces a rank crown across
 * the level card — two crown families on one card read as one ladder.
 *
 * The count is its own COUNTER BUBBLE hanging off the bottom-right, the way
 * an app icon carries a notification count — the art disc itself is left
 * exactly as it is on a game card, at the same size as the rank crown facing
 * it across the level card. Three earlier layouts all failed on the same
 * mistake, putting the number *into* the art (in its band, stacked under
 * half-height art, overlaid across it — each broke legibility or the
 * silhouette). Art and count are separate objects; the bubble is where a
 * count belongs.
 *
 * The bubble is the SAME material as the disc it hangs off — `--xp` fill,
 * `--xp-rim` ring, extruded bottom edge, white ink — so the two read as one
 * object, which is the whole point of splitting them. White here is a
 * deliberate call taken with the contrast known (~3.5:1 on purple and blue,
 * ~2.1:1 on the default orange, ~1.4:1 on yellow), which is why the digits
 * are sized and weighted up. If a color ever reads badly, deepen the FILL to
 * `--xp-deep` rather than darkening the ink — darkening the ink is what stops
 * the bubble matching the badge.
 *
 * Zero renders GREY rather than hidden — the same locked treatment as an
 * unearned rank crown or landmark plate, so "grey means not yet" only ever
 * has to be learned once, and a player who has none can still see what there
 * is to win.
 */
export function GameCrownBadge({ count, size = 38 }: { count: number; size?: number }) {
  const label =
    count === 0
      ? 'No game crowns yet — beat a game on all five difficulties'
      : `${count} ${count === 1 ? 'game' : 'games'} beaten on every difficulty`;
  /* `size` is the RankCrown BOX, not its disc: that SVG draws its rim circle
     at r=30 in a 64 viewBox, so a plain `size`px disc here comes out ~7%
     wider than the crown facing it across the level card (which is exactly
     how the left corner ended up visibly bigger than the right). Derive the
     visible diameter from the same table both crowns already share, and keep
     the wrap at the full box so the two discs stay centred on one line. */
  const disc = (size * RANK_BADGE.r * 2) / 64;
  /* ...and the art is inset inside that disc the way the rank crown's is.
     RankCrown draws its crown ~62% of the rim's diameter tall, leaving a
     visible ring of material all round; RosetteIcon fills ~86% of its own
     viewBox height (the old crown art at 100% put its side jewels ~1px off
     the rim and read as cramped next to the crown facing it). 0.724 of the
     disc is the box that lands the art at that same ~62%. The art itself is
     the SAME RosetteIcon the inline game-card trophy renders — one drawing,
     two surfaces — inked white by .crown-badge. */
  const art = +(disc * 0.724).toFixed(2);
  return (
    <span
      className={`crown-badge-wrap ${count === 0 ? 'locked' : ''}`}
      style={{ width: size, height: size }}
      title={label}
      role="img"
      aria-label={label}
    >
      <span className="crown-badge" style={{ width: disc, height: disc }}>
        <RosetteIcon size={art} />
      </span>
      <span className="crown-badge-count" aria-hidden>
        {count}
      </span>
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat-card fx-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'good' | 'bad' | 'muted' | 'accent' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}

const QWERTY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

/** an action key docked at one end of the keyboard's bottom row
    (Enter / Backspace / submit) */
export interface KeyboardEdgeKey {
  node: ReactNode;
  onPress: () => void;
  ariaLabel: string;
  /** extra state class, e.g. 'ready' for an armed submit */
  className?: string;
}

/**
 * The standard on-screen QWERTY keyboard (see DESIGN.md "Keyboard") — the
 * one component every letter-input game must use instead of hand-rolling
 * key rows. Styling lives in the shared `.kbd` block; sounds stay with the
 * game's handlers so correct/wrong feedback isn't double-played.
 * `keyClass` paints per-letter state ('good' | 'bad' | 'correct' |
 * 'present' | 'absent' | 'shake'); `keyNonce` remounts a key so its
 * animation can replay.
 */
export function Keyboard({
  onKey,
  keyClass,
  keyNonce,
  bottomLeft,
  bottomRight
}: {
  onKey: (letter: string) => void;
  keyClass?: (letter: string) => string;
  keyNonce?: (letter: string) => number | string;
  bottomLeft?: KeyboardEdgeKey;
  bottomRight?: KeyboardEdgeKey;
}) {
  const edge = (k: KeyboardEdgeKey | undefined) =>
    k && (
      <button
        className={`kbd-key kbd-key-wide ${k.className ?? ''}`}
        onClick={k.onPress}
        aria-label={k.ariaLabel}
      >
        {k.node}
      </button>
    );
  return (
    <div className="kbd" role="group" aria-label="Keyboard">
      {QWERTY_ROWS.map((row, ri) => (
        <div key={ri} className="kbd-row">
          {ri === 2 && edge(bottomLeft)}
          {row.split('').map((k) => (
            <button
              key={`${k}-${keyNonce?.(k) ?? 0}`}
              className={`kbd-key ${keyClass?.(k) ?? ''}`}
              onClick={() => onKey(k)}
            >
              {k}
            </button>
          ))}
          {ri === 2 && edge(bottomRight)}
        </div>
      ))}
    </div>
  );
}

