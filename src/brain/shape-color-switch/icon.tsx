/**
 * The card sticker for Shape–Color Switch — content art in the style of
 * design/gameIcons.tsx (64×64, thick warm ink outline, flat saturated fills
 * from the same small palette): the test's blue balloon and orange house
 * with a two-way arrow between them — one picture, two rules.
 */
const INK = '#312e28';
const BLUE = '#3d9bff';
const ORANGE = '#ff9f0a';
const PAPER = '#f2e3c4';

export const shapeColorSwitchIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.5 19.5c7.6 0 12.8 5.6 12.8 12.9 0 8-5.9 13.5-12.8 14-6.9-.5-12.8-6-12.8-14 0-7.3 5.2-12.9 12.8-12.9Z" fill={BLUE} stroke={INK} strokeWidth="3" />
    <path d="M15.8 46.4h5.4l-1.3 3.1h-2.8Z" fill={INK} stroke={INK} strokeWidth="1.6" />
    <path d="M18.5 49.6c-2.5 2.9 2.5 5 0 8.6" stroke={INK} strokeWidth="2.2" />
    <path d="M46.5 20.5 60.5 33.5h-4V55H36.5V33.5h-4Z" fill={ORANGE} stroke={INK} strokeWidth="3" />
    <path d="M43.4 55v-7.3a3.1 3.1 0 0 1 6.2 0V55" fill={PAPER} stroke={INK} strokeWidth="2.2" />
    <path d="M17.5 13.5C23.5 5.8 40.5 5.8 46.5 13.5" stroke={INK} strokeWidth="3" />
    <path d="M14.7 8.9 17.5 13.5l5.2-1.1M49.3 8.9 46.5 13.5l-5.2-1.1" stroke={INK} strokeWidth="3" />
  </svg>
);
