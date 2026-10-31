/**
 * Target Ring's card sticker — content art in the spirit of
 * design/gameIcons.tsx (64×64, thick warm ink outline, flat saturated fills,
 * one soft highlight; a fixed palette that looks the same on every theme).
 * A sky plate, the ring of dots, a dashed path across it and the lit red
 * target with a tap burst.
 */

const INK = '#312e28';
const SKY = '#dff2fb';
const RED = '#ff5a4e';
const YELLOW = '#ffc933';

const ring = Array.from({ length: 13 }, (_, j) => {
  const a = -Math.PI / 2 + (2 * Math.PI * j) / 13;
  return { x: 32 + 15.5 * Math.cos(a), y: 32 + 15.5 * Math.sin(a) };
});
const LIT = 2;
const FROM = 9;

export const targetRingIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="32" cy="32" r="26" fill={SKY} stroke={INK} strokeWidth="3" />
    {ring.map((p, j) => (j === LIT ? null : <circle key={j} cx={p.x} cy={p.y} r={j === FROM ? 2.4 : 1.7} fill={INK} />))}
    <path
      d={`M${ring[FROM].x + 2.5} ${ring[FROM].y - 2}Q30 25 ${ring[LIT].x - 7} ${ring[LIT].y + 2.5}`}
      stroke={INK}
      strokeWidth="2"
      strokeDasharray="2.6 3.4"
    />
    <path
      d={`M${ring[LIT].x + 6} ${ring[LIT].y - 9.5}l1.6 -3.2M${ring[LIT].x + 9.6} ${ring[LIT].y - 3.6}l3.4 -1.2M${ring[LIT].x + 0.6} ${ring[LIT].y - 11}l-0.2 -3.4`}
      stroke={INK}
      strokeWidth="2.4"
    />
    <circle cx={ring[LIT].x} cy={ring[LIT].y} r="7.2" fill={RED} stroke={INK} strokeWidth="2.8" />
    <circle cx={ring[LIT].x} cy={ring[LIT].y} r="2.6" fill={YELLOW} />
    <path d={`M${ring[LIT].x - 4.2} ${ring[LIT].y - 1.6}a4.6 4.6 0 0 1 2.6 -2.6`} stroke="#ffffff" strokeWidth="1.8" opacity="0.85" />
  </svg>
);
