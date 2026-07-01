/**
 * All platform icons. Monochrome, single-color SVGs on a 24×24 viewBox that
 * inherit `currentColor`, so they automatically follow the active theme.
 * NEVER use emojis for UI controls — add an icon here instead (see DESIGN.md).
 */

interface IconProps {
  size?: number;
}

function Svg({
  size = 20,
  fill = false,
  children
}: IconProps & { fill?: boolean; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/* ---------- navigation / chrome ---------- */

export function BackIcon() {
  return (
    <Svg size={20}>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function PauseIcon() {
  return (
    <Svg size={18} fill>
      <rect x="6" y="4" width="4" height="16" rx="1.4" />
      <rect x="14" y="4" width="4" height="16" rx="1.4" />
    </Svg>
  );
}

export function PlayIcon() {
  return (
    <Svg size={18} fill>
      <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.7L9.52 4.63A1 1 0 0 0 8 5.5z" />
    </Svg>
  );
}

export function RestartIcon() {
  return (
    <Svg size={18}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

export function GearIcon() {
  return (
    <Svg size={22}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </Svg>
  );
}

export function UserIcon() {
  return (
    <Svg size={22}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function GridIcon() {
  return (
    <Svg size={22}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </Svg>
  );
}

/* ---------- game tools ---------- */

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Svg>
  );
}

export function EraseIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-7-6 7-6z" />
      <path d="M13 9.5l5 5M18 9.5l-5 5" />
    </Svg>
  );
}

export function BulbIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M9 18h6" />
      <path d="M10 21.5h4" />
      <path d="M12 2.5a6 6 0 0 0-4.2 10.3c.7.7 1.2 1.7 1.2 2.7v.5h6v-.5c0-1 .5-2 1.2-2.7A6 6 0 0 0 12 2.5z" />
    </Svg>
  );
}

export function DropletIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 2.7l5.66 5.66a8 8 0 1 1-11.32 0L12 2.7z" />
    </Svg>
  );
}

export function TargetIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </Svg>
  );
}

export function SameIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function ShareIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v13" />
    </Svg>
  );
}
