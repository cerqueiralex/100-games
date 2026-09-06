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

export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 7L4 12l5 5" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
    </Svg>
  );
}

export function BackIcon() {
  return (
    <Svg size={20}>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.6 10.4L12 3.6l8.4 6.8" />
      <path d="M5.6 12v7.4a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V12" />
      <path d="M9.9 20.4v-5.2h4.2v5.2" />
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

export function HelpIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9.2a2.9 2.9 0 0 1 5.7.8c0 1.9-2.8 2.3-2.8 3.8" />
      <path d="M12 17.1v.1" />
    </Svg>
  );
}

/** solid flame — the daily-streak counter (FlameArt in Streak.tsx is the
    big colored one; this is the monochrome inline glyph) */
export function FlameIcon({ size = 14 }: IconProps) {
  return (
    <Svg size={size} fill>
      <path d="M12 2.6c.9 3.1-.8 4.6-2.2 5.9C8.2 9.9 7 11.2 7 13.6A5 5 0 0 0 12 18.6a5 5 0 0 0 5-5c0-3.4-2.1-5-3.3-6.6-.3 1-1 1.7-1.8 2.2.6-2.3.5-4.5.1-6.6z" />
    </Svg>
  );
}

export function ClockIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.4 2" />
    </Svg>
  );
}

export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

export function EyeIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

/* Pixel-art flag matching MineIcon: pole on the left, a bold triangular
   banner waving right, base under the pole — unmistakably a flag. */
export function FlagIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        fill="currentColor"
        stroke="none"
        shapeRendering="crispEdges"
        d="M5 3h4v16H5z M9 3h6v2H9z M9 5h10v2H9z M9 7h14v2H9z M9 9h10v2H9z M9 11h6v2H9z M3 19h10v2H3z"
      />
    </Svg>
  );
}

/* Classic pixel-art mine on an 11×11 pixel grid (2 units per pixel).
   Single evenodd path in currentColor; the highlight pixel is a hole,
   so the cell background shines through and the icon stays monochrome. */
export function MineIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        fill="currentColor"
        stroke="none"
        fillRule="evenodd"
        shapeRendering="crispEdges"
        d="M11 1h2v4h-2z M11 19h2v4h-2z M1 11h4v2H1z M19 11h4v2h-4z M5 5h2v2H5z M17 5h2v2h-2z M5 17h2v2H5z M17 17h2v2h-2z M9 5h6v2H9z M7 7h10v2H7z M5 9h14v6H5z M7 15h10v2H7z M9 17h6v2H9z M7 9h4v4H7z"
      />
    </Svg>
  );
}

/* Four-way move cursor — the "drag" affordance. */
export function MoveIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3v18M3 12h18" />
      <path d="M9.5 5.5L12 3l2.5 2.5M9.5 18.5L12 21l2.5-2.5M5.5 9.5L3 12l2.5 2.5M18.5 9.5L21 12l-2.5 2.5" />
    </Svg>
  );
}

/* Solid rounded triangle for directional pads (points up; rotate via CSS).
   Stroked in its own color so the corners come out soft. */
/** rotate clockwise — Block Drop's spin buttons (a circular arrow with the head at the end) */
export function RotateCwIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  );
}

export function RotateCcwIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

/** hard drop — an arrow slamming onto a floor line */
export function HardDropIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </Svg>
  );
}

export function DpadArrowIcon({ size = 22 }: IconProps) {
  return (
    <Svg size={size} fill>
      <path
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        d="M12 6.2l6.2 9.3H5.8z"
      />
    </Svg>
  );
}

/* Tic-tac-toe marks — geometric vector glyphs (never text: the glyphs must
   be perfectly symmetric). Both are centered on 12,12 with strokeWidth 3
   so they stay bold when scaled up to fill a board cell. */
export function TttCrossIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path strokeWidth="3" d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function TttRingIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <circle strokeWidth="3" cx="12" cy="12" r="7" />
    </Svg>
  );
}

export function SaveIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </Svg>
  );
}

export function StarIcon({ size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.8l2.9 5.85 6.46.94-4.68 4.56 1.11 6.44L12 17.55l-5.79 3.04 1.11-6.44-4.68-4.56 6.46-.94L12 2.8z" />
    </svg>
  );
}

/** party popper — the Daily Challenge's festive mark (the daily start
    button). Solid cone + streamers + confetti so it reads at ~18px;
    monochrome currentColor like every UI icon — the ludic color comes from
    the --xp surface it sits on, never from the glyph (no emoji in UI
    controls, per DESIGN.md). */
export function PartyIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {/* the cone, firing up-right */}
      <path fill="currentColor" d="M2.9 21.1 8.2 8.9 15.1 15.8Z" />
      {/* streamers */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M12.6 5.4c.4-1.6-.3-2.4-1.5-2.9"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M18.6 11.4c1.6-.4 2.4.3 2.9 1.5"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" d="M16.2 7.8 20.9 3.1" />
      {/* confetti */}
      <circle fill="currentColor" cx="14.2" cy="3.1" r="1.3" />
      <circle fill="currentColor" cx="21" cy="8.1" r="1.3" />
      <circle fill="currentColor" cx="18.9" cy="16.4" r="1.2" />
    </svg>
  );
}

/** Instagram-style like heart — the favorites toggle on home cards and the
    "Favorites" section header. Outline at rest, solid when favorited, same
    stroke language as StarIcon. Deliberately NOT a star: stars mark beaten
    difficulties (the `.beat-seal`), and one glyph must not mean two things. */
export function HeartIcon({ size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/** share = a paper plane (the "send" mark every chat app uses), outline like
    the rest of the set; used by Settings → Share the app and the win card */
export function ShareIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M21.5 2.5L3 10.2l8.2 3.2 3.2 8.1z" />
      <path d="M21.5 2.5L11.2 13.4" />
    </Svg>
  );
}

/** copy to clipboard: two stacked sheets */
export function CopyIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </Svg>
  );
}

/** "more destinations": the three dots that open the device's own share sheet */
export function MoreIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size} fill>
      <circle cx="5" cy="12" r="2.1" />
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="19" cy="12" r="2.1" />
    </Svg>
  );
}

/* ---------- share destinations: monochrome marks in currentColor, drawn
   in the set's own stroke language rather than the brands' logos ---------- */

/** WhatsApp: a chat bubble with a tail and a handset inside */
export function WhatsAppIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9.2 8.4c.3-.7.9-.7 1.2-.1l.8 1.6c.1.3 0 .6-.2.8l-.6.6c.6 1.3 1.6 2.3 2.9 2.9l.6-.6c.2-.2.5-.3.8-.2l1.6.8c.6.3.6.9-.1 1.2-.9.5-1.9.5-2.9 0a8.3 8.3 0 0 1-4.2-4.2c-.5-1-.4-2 .1-2.8z" />
    </Svg>
  );
}

/** Telegram: the plane in a circle */
export function TelegramIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M17 7.5l-2.2 9-3.3-2.4-1.9 1.8.3-2.9 5.3-4.6-6.7 4-2.8-1z" />
    </Svg>
  );
}

/** X: the crossed strokes */
export function XIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4.5 4h4.2l10.8 16h-4.2z" />
      <path d="M19 4l-6.2 7.2M4.5 20l6.4-7.4" />
    </Svg>
  );
}

/** plain chevron — scroll/step controls (see the category row) */
export function ChevronIcon({ size = 16, dir = 'right' }: IconProps & { dir?: 'left' | 'right' }) {
  return (
    <Svg size={size}>
      <path d={dir === 'left' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} />
    </Svg>
  );
}

/* ---------- settings / data actions ---------- */

/** arrow leaving a tray — export/download a backup */
export function ExportIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3v11" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

/** arrow dropping into a tray — import/restore a backup */
export function ImportIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 14V3" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

/** box with an arrow leaving it — this row opens something outside the app */
export function ExternalLinkIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M10 5H5.6A1.6 1.6 0 0 0 4 6.6v11.8A1.6 1.6 0 0 0 5.6 20h11.8a1.6 1.6 0 0 0 1.6-1.6V14" />
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
    </Svg>
  );
}

/** trash can — clear the game history */
export function TrashIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

/** warning triangle — the nuclear "reset everything" */
export function WarnIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 4.5 3 20h18L12 4.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.6v.01" />
    </Svg>
  );
}

export function LockIcon({ size = 14 }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

/** rosette medal — "beaten on every difficulty".
    The same badge shape the category-mastery landmarks wear (medal disc +
    two ribbon tails, see Landmarks.tsx `category`), because CROWNS belong
    to the rank ladder alone — this mark used to be a three-pointed crown
    and the two crown families read as one ladder. Solid flat silhouette
    for the same reason as the trophy above: at badge size a 2px stroke
    turns to mush. The disc carries a cut-out inner ring (evenodd) so it
    still reads as a medal, not a dot, at ~18px. Monochrome currentColor. */
export function RosetteIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {/* ribbon tails, drawn first so the disc overlaps their roots */}
      <path fill="currentColor" d="M8.7 13.9 6.4 22.3 10.3 19.9 11.2 15.4Z" />
      <path fill="currentColor" d="M15.3 13.9 17.6 22.3 13.7 19.9 12.8 15.4Z" />
      {/* medal disc with a cut inner ring: solid r7.5, hole to r5.3, core r3.7 */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.5 9.1a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0Z M6.7 9.1a5.3 5.3 0 1 0 10.6 0a5.3 5.3 0 1 0 -10.6 0Z M8.3 9.1a3.7 3.7 0 1 0 7.4 0a3.7 3.7 0 1 0 -7.4 0Z"
      />
    </svg>
  );
}

/* ---------- cryptogram cipher glyphs ----------
   26 mini pictograms — the Cryptogram picture cipher assigns one to each
   letter of a puzzle. Same rules as every icon (monochrome, currentColor,
   24×24); solid fills where a stroke would vanish at ~13px. Array order is
   meaningless: puzzles shuffle the letter→glyph mapping every game. */

const CIPHER_GLYPHS: React.ReactNode[] = [
  /* heart */
  <path
    key="heart"
    fill="currentColor"
    stroke="none"
    d="M12 21s-7.5-4.9-9.7-9.4C.9 8.7 2.9 5 6.4 5c2.2 0 3.9 1.2 5.6 3.2C13.7 6.2 15.4 5 17.6 5c3.5 0 5.5 3.7 4.1 6.6C19.5 16.1 12 21 12 21z"
  />,
  /* star */
  <path
    key="star"
    fill="currentColor"
    stroke="none"
    d="M12 2.8l2.9 5.85 6.46.94-4.68 4.56 1.11 6.44L12 17.55l-5.79 3.04 1.11-6.44-4.68-4.56 6.46-.94L12 2.8z"
  />,
  /* moon */
  <path
    key="moon"
    fill="currentColor"
    stroke="none"
    d="M20.4 14.7A8.8 8.8 0 1 1 9.3 3.6a7.2 7.2 0 1 0 11.1 11.1z"
  />,
  /* sun */
  <g key="sun">
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2" />
  </g>,
  /* cloud */
  <path key="cloud" d="M6.3 17.5a3.8 3.8 0 0 1-.4-7.6 5.4 5.4 0 0 1 10.5-1.4 4 4 0 0 1 .8 9H6.3z" />,
  /* umbrella */
  <g key="umbrella">
    <path d="M12 2.8a9.2 9.2 0 0 1 9.2 9.2H2.8A9.2 9.2 0 0 1 12 2.8z" />
    <path d="M12 12v6.6a2.1 2.1 0 0 1-4.2 0" />
  </g>,
  /* key */
  <g key="key">
    <circle cx="7.3" cy="15.7" r="3.6" />
    <path d="M9.9 13.1L19.5 3.5M15.2 7.8l3.3 3.3" />
  </g>,
  /* bell */
  <g key="bell">
    <path d="M12 3.5a5.3 5.3 0 0 1 5.3 5.3c0 3.9 1.3 5.4 2.2 6.7H4.5c.9-1.3 2.2-2.8 2.2-6.7A5.3 5.3 0 0 1 12 3.5z" />
    <path d="M10 19.5a2.1 2.1 0 0 0 4 0" />
  </g>,
  /* leaf */
  <g key="leaf">
    <path d="M4.5 19.5c0-9 6-15 15-15 0 9-6 15-15 15z" />
    <path d="M4.5 19.5C8 14.5 11.5 11 16.5 7.5" />
  </g>,
  /* drop */
  <path
    key="drop"
    fill="currentColor"
    stroke="none"
    d="M12 2.7l5.66 5.66a8 8 0 1 1-11.32 0L12 2.7z"
  />,
  /* bolt */
  <path key="bolt" fill="currentColor" stroke="none" d="M13 2L3.8 13.5h6.3L9 22l9.2-11.5h-6.3z" />,
  /* anchor */
  <g key="anchor">
    <circle cx="12" cy="5" r="2.2" />
    <path d="M12 7.2V21M4 13a8 8 0 0 0 16 0M8.7 10.5h6.6" />
  </g>,
  /* note */
  <g key="note">
    <path d="M9.3 18V5.5L19 3.6v12" />
    <circle cx="6.9" cy="18" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="16.6" cy="15.6" r="2.4" fill="currentColor" stroke="none" />
  </g>,
  /* eye */
  <g key="eye">
    <path d="M1.8 12S5.5 4.9 12 4.9 22.2 12 22.2 12 18.5 19.1 12 19.1 1.8 12 1.8 12z" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </g>,
  /* house */
  <g key="house">
    <path d="M3.5 11.5L12 4l8.5 7.5" />
    <path d="M6 10.2V20h12v-9.8" />
    <path d="M10 20v-5.4h4V20" />
  </g>,
  /* pine tree */
  <path
    key="tree"
    fill="currentColor"
    stroke="none"
    d="M12 2.5L17 10h-2.8l4.3 7h-5V21.5h-3V17h-5L9.8 10H7z"
  />,
  /* sailboat */
  <g key="boat">
    <path d="M12 3v13" />
    <path fill="currentColor" stroke="none" d="M12 4l7 9.2h-7z" />
    <path fill="currentColor" stroke="none" d="M4 17.5h16l-2.6 4H6.6z" />
  </g>,
  /* mug */
  <g key="mug">
    <path d="M4.5 7H16v8.5a4 4 0 0 1-4 4H8.5a4 4 0 0 1-4-4z" />
    <path d="M16 9.5h2.2a2.6 2.6 0 0 1 0 5.2H16" />
  </g>,
  /* flag */
  <g key="flag">
    <path d="M5.5 21V3.5" />
    <path fill="currentColor" stroke="none" d="M7 4h11.5l-3.4 4.25L18.5 12.5H7z" />
  </g>,
  /* clock */
  <g key="clock">
    <circle cx="12" cy="12" r="8.7" />
    <path d="M12 7.2V12l3.4 2" />
  </g>,
  /* snowflake */
  <path key="flake" d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4L4 16.6" />,
  /* crown */
  <path
    key="crown"
    fill="currentColor"
    stroke="none"
    d="M3.7 18.5h16.6L22 8.6l-5.2 3.5L12 5.3 7.2 12.1 2 8.6z"
  />,
  /* gem */
  <g key="gem">
    <path d="M7.2 4h9.6L21 9.2 12 20.8 3 9.2z" />
    <path d="M3 9.2h18M8.8 9.2L12 4.6l3.2 4.6" />
  </g>,
  /* arrow */
  <path key="arrow" fill="currentColor" stroke="none" d="M12 2.8l6.8 7.4h-4.3V21h-5V10.2H5.2z" />,
  /* target */
  <g key="target">
    <circle cx="12" cy="12" r="8.7" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </g>,
  /* book */
  <g key="book">
    <path d="M12 6.7C10 4.9 7.4 4.2 4 4.2v15.1c3.4 0 6 .7 8 2.5 2-1.8 4.6-2.5 8-2.5V4.2c-3.4 0-6 .7-8 2.5z" />
    <path d="M12 6.7v15.1" />
  </g>
];

export const CIPHER_GLYPH_COUNT = CIPHER_GLYPHS.length;

/** One cipher pictogram by index (0–25) — used by the Cryptogram tiles. */
export function CipherGlyph({ glyph, size = 14 }: { glyph: number; size?: number }) {
  return <Svg size={size}>{CIPHER_GLYPHS[((glyph % CIPHER_GLYPHS.length) + CIPHER_GLYPHS.length) % CIPHER_GLYPHS.length]}</Svg>;
}
