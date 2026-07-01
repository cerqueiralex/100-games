import type { ReactNode } from 'react';

/** Icons live in the design system — re-exported here for convenience. */
export * from '../design/icons';

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
      <div className="modal-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'good' | 'bad' | 'muted' | 'accent' }) {
  return <span className={`chip ${tone ?? ''}`}>{children}</span>;
}

