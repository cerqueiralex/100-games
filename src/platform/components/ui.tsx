import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { sfx } from '../audio';

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

