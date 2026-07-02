import { useRef, type ReactNode } from 'react';

const HOVERABLE =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

/**
 * Design-system wrapper: subtle mouse-reactive 3D tilt + a glow that follows
 * the cursor (see DESIGN.md "Depth & motion"). Wrap large interactive cards
 * only — game cards, hero surfaces — never small buttons. No-op on touch.
 */
export function Tilt({
  children,
  max = 4,
  className = ''
}: {
  children: ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--tx', `${((0.5 - y) * max * 2).toFixed(2)}deg`);
    el.style.setProperty('--ty', `${((x - 0.5) * max * 2).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tx', '0deg');
    el.style.setProperty('--ty', '0deg');
  };

  return (
    <div
      ref={ref}
      className={`fx-tilt ${className}`}
      onPointerMove={HOVERABLE ? onMove : undefined}
      onPointerLeave={HOVERABLE ? onLeave : undefined}
    >
      {children}
      <span className="fx-glow" aria-hidden />
    </div>
  );
}
