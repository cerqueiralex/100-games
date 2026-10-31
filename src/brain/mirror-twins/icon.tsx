import { mirrorCubes, project, type P3, type View } from './logic/geometry';

/*
 * Card sticker for Mirror Twins — content art in the house sticker formula
 * (64×64 viewBox drawn at 42 px, warm ink outline, flat saturated fills from
 * the shared game-icon family, one soft highlight). Fixed palette, the same
 * on every theme, like the game stickers in design/gameIcons.tsx.
 *
 * The art is computed, not hand-drawn: a chiral tetracube and its true
 * mirror image, projected by the test's own camera (25° elevation) — so the
 * card shows exactly the judgement the test asks for, across a dashed
 * mirror line.
 */

const INK = '#312e28';
const TONE = ['#c9f2bd', '#58c552', '#2f8a37'] as const;

/** the right-handed "screw" tetracube — the smallest chiral polycube */
const SCREW: P3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, -1]
];

/**
 * One figure as a sticker: a thick ink pass underneath gives the silhouette
 * its outline, then the faces are filled on top with thin inner lines — the
 * house "thick outline, flat fills" formula without darkening small faces.
 */
function place(v: View, cx: number, cy: number, size: number) {
  const s = size / Math.max(v.maxX - v.minX, v.maxY - v.minY);
  const ox = cx - ((v.minX + v.maxX) / 2) * s;
  const oy = cy - ((v.minY + v.maxY) / 2) * s;
  const pts = v.faces.map((f) => [0, 1, 2, 3].map((k) => `${(ox + f.pts[2 * k] * s).toFixed(2)},${(oy + f.pts[2 * k + 1] * s).toFixed(2)}`).join(' '));
  return (
    <>
      {pts.map((p, i) => (
        <polygon key={`o${i}`} points={p} fill={INK} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      ))}
      {v.faces.map((f, i) => (
        <polygon key={i} points={pts[i]} fill={TONE[f.tone]} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      ))}
    </>
  );
}

const LEFT = project(SCREW, 32);
const RIGHT = project(mirrorCubes(SCREW), -32);

export const mirrorTwinsIcon = (
  <svg width={42} height={42} viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="9" width="54" height="46" rx="12" fill="#dff2fb" stroke={INK} strokeWidth="3" />
    <path d="M12 15.5h9" stroke="#ffffff" strokeWidth="3" opacity="0.85" />
    <path d="M32 14v36" stroke={INK} strokeWidth="2.4" strokeDasharray="3 3.4" />
    {place(LEFT, 19, 33, 22)}
    {place(RIGHT, 45, 33, 22)}
  </svg>
);
