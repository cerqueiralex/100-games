import type { ProfileColorId, ThemeId } from '../types';

/**
 * The player's profile color — the ONE bit of color taste the app offers.
 *
 * This is deliberately NOT a return of the six-way accent picker that was
 * removed (see DESIGN.md): `--accent` stays monochrome ink, so every tool in
 * every game looks the same for everybody and there is still only one surface
 * to check. What a profile color repaints is the player's own chrome — the
 * progression color `--xp` (level, XP, streak flame, daily marks), the profile
 * frames, and the profile page's charts. No game board is touched.
 *
 * Unset is a real state, not a missing value: a profile with no color is the
 * app exactly as it shipped (orange progression, content-palette charts). That
 * is what makes this additive — no existing profile, backup file or screenshot
 * changes until somebody picks something.
 *
 * Dependency-free by design (no storage, no registry, no React), exactly like
 * progress/xp.ts, so both the CSS layer and the chart layer can read it.
 */

export interface ProfileColorDef {
  id: ProfileColorId;
  name: string;
  /** the identity color, as picked. Reuses content-palette values so the app
      stays one family. */
  hex: string;
}

/**
 * The picker shows Standard plus these, and the row is a fixed
 * single-line grid — see `.color-row`. Adding a seventh entry does not wrap
 * it, it squeezes it, so weigh a new color against the width every existing
 * swatch loses.
 */
export const PROFILE_COLORS: ProfileColorDef[] = [
  { id: 'yellow', name: 'Yellow', hex: '#ffd60a' },
  { id: 'green', name: 'Green', hex: '#30d158' },
  { id: 'orange', name: 'Orange', hex: '#ff9f0a' },
  { id: 'blue', name: 'Blue', hex: '#0a84ff' },
  { id: 'purple', name: 'Purple', hex: '#bf5af2' }
];

export function isProfileColor(value: unknown): value is ProfileColorId {
  return typeof value === 'string' && PROFILE_COLORS.some((c) => c.id === value);
}

const DARK_THEMES: ThemeId[] = ['black', 'dim'];
const isDark = (theme: ThemeId) => DARK_THEMES.includes(theme);

/**
 * Every profile color must clear 3:1 against the surface it is painted on —
 * the WCAG bar for non-text UI, which is what these are: frames, rings, bars
 * and big numerals. Colors are nudged in LIGHTNESS ONLY (up on the dark
 * themes, down on light), so the hue the player picked survives.
 *
 * Both directions are load-bearing, and both were found by measuring: yellow
 * lands at 1.3:1 on warm paper, worse than anything the app ships, and a deep
 * teal that briefly sat in the picker was 1.9:1 on black — the frame looked
 * like no frame and the level number was unreadable. That teal was dropped
 * (it wrapped the picker to a second row), so today only the darkening
 * branch fires for a shipped color; the lift stays because the next color
 * anybody adds may well need it, and validate proves both directions.
 */
const MIN_CONTRAST = 3;
const THEME_BG: Record<ThemeId, string> = {
  black: '#000000',
  dim: '#121316',
  light: '#faf8f3'
};

/* ---------- color math (HSL, so a ramp can move lightness alone) ---------- */

export interface Hsl {
  /** degrees, 0..360 */
  h: number;
  /** 0..1 */
  s: number;
  /** 0..1 */
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = 60 * (((g - b) / d + 6) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return { h, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r1, g1, b1] =
    hh < 1 ? [c, x, 0]
    : hh < 2 ? [x, c, 0]
    : hh < 3 ? [0, c, x]
    : hh < 4 ? [0, x, c]
    : hh < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v + m)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

/** WCAG relative luminance — used by validate to prove the dark floor bites. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255)
  );
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- the two things the app reads ---------- */

/**
 * Any hex, nudged in lightness until it clears MIN_CONTRAST on this theme.
 * Exported so the rule can be proven on colors the picker does not (yet)
 * ship — the lift branch would otherwise be untested the moment every
 * catalogue color happens to be bright enough.
 */
export function legibleOn(hex: string, theme: ThemeId): string {
  const bg = THEME_BG[theme];
  if (contrast(hex, bg) >= MIN_CONTRAST) return hex;

  // walk the lightness away from the background until it clears the bar; 24
  // halvings resolve far past 8-bit precision, and the search is bounded so a
  // hue that simply cannot reach 3:1 still returns its best try rather than
  // spinning or bottoming out at black/white
  const hsl = hexToHsl(hex);
  let lo = hsl.l;
  let hi = isDark(theme) ? 0.95 : 0.06;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(hslToHex({ ...hsl, l: mid }), bg) >= MIN_CONTRAST) hi = mid;
    else lo = mid;
  }
  return hslToHex({ ...hsl, l: hi });
}

/** The profile color as it should actually be painted on this surface theme. */
export function profileHex(id: ProfileColorId, theme: ThemeId): string {
  const base = PROFILE_COLORS.find((c) => c.id === id)?.hex ?? PROFILE_COLORS[0].hex;
  return legibleOn(base, theme);
}

/**
 * `n` chart-series colors derived from one profile color: a MONOTONIC ramp,
 * lightest first, so a bar chart reads as one gradient from the biggest row
 * down and a donut reads as a graduated wheel.
 *
 * Two things this deliberately does not do, both because they were tried and
 * looked wrong:
 *
 * - It does not interleave the ramp to push neighbouring slices apart. That
 *   maximises local contrast, but it turns an ordered chart into two
 *   alternating colors — it reads as arbitrary, not as a palette. Neighbours
 *   in a gradient are meant to be close; the legend carries the identity.
 * - It keeps the hue sweep TIGHT (±9°) and the saturation flat. A wide sweep
 *   walks yellow out to tan at one end and lime at the other, which stops
 *   looking like the color the player picked, and easing the saturation down
 *   at the ends is what made the pale end look washed out.
 *
 * The lightness band is theme-aware, and not symmetric, because the two
 * grounds are not: on black a ramp may run bright, but on warm paper the
 * light end of a cyan or a yellow lands within 1.5:1 of the card and the
 * slice disappears, so the light theme inks DOWN from a mid tone.
 */
export function chartRamp(id: ProfileColorId, n: number, theme: ThemeId): string[] {
  if (n <= 0) return [];
  const { h, s } = hexToHsl(PROFILE_COLORS.find((c) => c.id === id)?.hex ?? '#ff9f0a');
  const dark = isDark(theme);
  const hi = dark ? 0.82 : 0.44;
  const lo = dark ? 0.38 : 0.18;
  const sat = Math.min(0.98, Math.max(0.5, s));
  const SPREAD = 18; // total hue sweep in degrees, centred on the base hue

  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push(hslToHex({ h: h + (t - 0.5) * SPREAD, s: sat, l: hi - t * (hi - lo) }));
  }
  return out;
}

/**
 * Push the picked color into CSS custom properties (or clear them, for the
 * default). `--profile` is the ONLY place the hex lands: tokens.css derives
 * `--xp` and its rims from it, so nothing else ever needs the value and the
 * six hexes are never written down a second time.
 */
export function applyProfileColor(
  root: HTMLElement,
  id: ProfileColorId | undefined,
  theme: ThemeId
): void {
  if (!id) {
    root.style.removeProperty('--profile');
    delete root.dataset.profileColor;
    return;
  }
  root.style.setProperty('--profile', profileHex(id, theme));
  // the attribute is the hook for the profile frames (4px borders), which
  // must not appear at all on a default profile
  root.dataset.profileColor = id;
}
