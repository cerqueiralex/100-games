import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DUR, prefersReducedMotion } from '../../motion';
import { CloseIcon } from '../../design/icons';

/**
 * The Brain Lab sheet: a bottom sheet on phones (slides up, rounded top,
 * grabber), a centred card from 700 px up. Floating overlay, so it keeps
 * var(--shadow) (DESIGN.md "Elevation exception"). Accessibility is built
 * in: role="dialog" + aria-modal, focus moves into the sheet on open and
 * back to whatever opened it on close, Tab is kept inside, Escape and the
 * backdrop close it, and the page behind stops scrolling. The exit plays a
 * short slide before unmounting (instant under reduced motion).
 *
 * Also used, with `variant="dialog"`, for small confirmations (leave a run?).
 */
export function Sheet({
  open,
  onClose,
  title,
  kicker,
  children,
  footer,
  variant = 'sheet',
  dismissable = true,
  className,
  portal = false,
  style
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: ReactNode;
  /** sticky action row at the bottom */
  footer?: ReactNode;
  variant?: 'sheet' | 'dialog';
  /** false: no close button, no Escape/backdrop close (an acknowledgement) */
  dismissable?: boolean;
  className?: string;
  /**
   * render into document.body — for a sheet opened inside a page whose
   * ancestor carries a transform (which would otherwise become the fixed
   * backdrop's containing block and push the card off screen)
   */
  portal?: boolean;
  /** custom properties the portalled sheet can no longer inherit (e.g. --area) */
  style?: CSSProperties;
}) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    if (prefersReducedMotion()) {
      setMounted(false);
      return;
    }
    setLeaving(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, DUR.base);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // focus in on open, back out on unmount
  useEffect(() => {
    if (!mounted) return;
    const card = cardRef.current;
    const first = card?.querySelector<HTMLElement>('[data-autofocus]') ?? card;
    first?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      const back = returnTo.current;
      if (back && document.contains(back)) back.focus({ preventScroll: true });
    };
  }, [mounted]);

  const close = useCallback(() => {
    if (dismissable) onClose();
  }, [dismissable, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !cardRef.current) return;
    const items = [...cardRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;
  const node = (
    <div className={`bl-sheet-backdrop v-${variant}${leaving ? ' leaving' : ''}`} style={style} onClick={close} onKeyDown={onKeyDown}>
      <div
        ref={cardRef}
        className={`bl-sheet v-${variant}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {variant === 'sheet' && <span className="bl-sheet-grabber" aria-hidden />}
        <header className="bl-sheet-head">
          <div className="bl-sheet-titles">
            {kicker && <span className="bl-kicker">{kicker}</span>}
            <h2 id={titleId} className="bl-sheet-title">
              {title}
            </h2>
          </div>
          {dismissable && (
            <button type="button" className="icon-btn bl-sheet-close" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          )}
        </header>
        <div className="bl-sheet-body">{children}</div>
        {footer && <footer className="bl-sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
  return portal ? createPortal(node, document.body) : node;
}
