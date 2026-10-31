import type { ReactNode } from 'react';

/**
 * The four pictogram silhouettes (SCIENCE.md §1.12 "Stimuli"): balloon and
 * house for the scored block, dog and car for practice — the Mobile Toolbox
 * pairs, drawn here as original vector art. Each is a handful of primitives
 * in a 100×100 box, rendered in three layers so every one reads as the
 * app's extruded 2.5D style without gradients or highlights:
 *   1. the underside — the silhouette in the deep shade, 4 units lower;
 *   2. the rim — the silhouette in the deep shade with a fat round stroke;
 *   3. the face — the silhouette in the flat colour.
 * Overlapping primitives fuse (internal rims are covered by the face), and
 * holes (door, windows, hubs, the eye) get a rim and a sliver of depth.
 *
 * Colours are content colours (see shape-color-switch.css: a blue and an
 * orange that differ in hue AND lightness, never red/green) — the picture is
 * the stimulus, so it never follows the accent.
 */

export type ShapeName = 'balloon' | 'house' | 'dog' | 'car';

/** the stimulus pairs: shape A pairs with colour 1 on its target card, shape B with colour 2 */
export const TEST_PAIR = { A: 'balloon', B: 'house' } as const;
export const PRACTICE_PAIR = { A: 'dog', B: 'car' } as const;

export const COLOR_NAME: Record<1 | 2, string> = { 1: 'blue', 2: 'orange' };

const PARTS: Record<ShapeName, ReactNode> = {
  balloon: (
    <>
      <path d="M50 7C67 7 79 19.6 79 36.2 79 53.5 65.6 66.2 50 67.2 34.4 66.2 21 53.5 21 36.2 21 19.6 33 7 50 7Z" />
      <path d="M44 65.6h12l-3.2 6.6h-5.6Z" />
      <path className="ln" d="M50 72.2c-5 6.4 5 11 0 19.6" />
    </>
  ),
  house: (
    <>
      <rect x="63.5" y="20" width="10.5" height="22" rx="1.5" />
      <path
        fillRule="evenodd"
        d="M50 13.5 88.5 49.5H78.5V88.5H22V49.5H11.5ZM42.5 88.5V73a7.5 7.5 0 0 1 15 0v15.5Z"
      />
    </>
  ),
  dog: (
    <>
      <path className="ln" d="M27 47c-8.5-3-12.5-11-10-20" />
      <rect x="24" y="42" width="47" height="24" rx="12" />
      <rect x="25.5" y="56" width="8.5" height="30" rx="4.25" />
      <rect x="37.5" y="56" width="8.5" height="30" rx="4.25" />
      <rect x="53.5" y="56" width="8.5" height="30" rx="4.25" />
      <rect x="65" y="56" width="8.5" height="30" rx="4.25" />
      <path d="M63.5 27.5 65.6 11.5l9.6 10.6Z" />
      <path fillRule="evenodd" d="M61 35a13 13 0 1 0 26 0a13 13 0 1 0-26 0ZM76.6 30.4a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0Z" />
      <rect x="77" y="35.5" width="17" height="12.5" rx="6.25" />
    </>
  ),
  car: (
    <g transform="translate(0 5)">
      <path
        fillRule="evenodd"
        d="M10 62Q10 50 20 49L31 48 41 33Q43 30 47 30H63Q67 30 69.5 33L79 47 88 49Q94 50.5 94 57V63Q94 66 91 66H87.5A12.5 12.5 0 0 0 62.5 66H41.5A12.5 12.5 0 0 0 16.5 66H13Q10 66 10 63ZM36.5 46.5 43.8 34.5H53V46.5ZM57 46.5V34.5H66.5L74.5 46.5Z"
      />
      <path fillRule="evenodd" d="M19.5 66a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0ZM25.5 66a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z" />
      <path fillRule="evenodd" d="M65.5 66a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0ZM71.5 66a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0Z" />
    </g>
  )
};

/**
 * One pictogram. `color` 1 = blue, 2 = orange. Pure art: aria-hidden — the
 * control or region around it carries the label.
 */
export function Pictogram({ shape, color, className, ...rest }: { shape: ShapeName; color: 1 | 2; className?: string } & Record<`data-${string}`, string | number | undefined>) {
  const parts = PARTS[shape];
  return (
    <svg viewBox="0 0 100 100" className={`scs-pic scs-c${color}${className ? ` ${className}` : ''}`} aria-hidden focusable="false" {...rest}>
      <g className="scs-pic-under" transform="translate(0 4)">
        {parts}
      </g>
      <g className="scs-pic-rim">{parts}</g>
      <g className="scs-pic-face">{parts}</g>
    </svg>
  );
}
