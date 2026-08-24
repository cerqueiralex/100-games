import type { RankId } from '../progress/xp';

/**
 * What each rank crown is MADE OF.
 *
 * The six crowns are named after materials, so they should read as those
 * materials — wood with grain, iron brushed, silver and gold polished,
 * platinum mirror-bright, challenger faceted like a gem. The colour alone
 * did none of that: six flat discs in six hues are six hues.
 *
 * ONE table, consumed by both renderers — the SVG badge (`RankCrown` in
 * components/Level.tsx, which every DOM surface uses) and the canvas port
 * on the shareable win card (`drawRankCrown` in components/ShareCard.tsx).
 * They were already two drawings of the same crown; giving each its own
 * copy of the texture is exactly how the two would drift until a shared
 * card showed a different badge from the profile. Canvas consumes the same
 * SVG path strings through `Path2D`.
 *
 * This is CONTENT art, not a surface: it keeps its own fixed `--rank-*`
 * palette and is allowed the soft sheens that DESIGN.md bars from cards
 * (same opt-out as the game sticker icons and landmark art). The texture
 * is painted in the rank's own rim colour or in white — never a new hue.
 */

/** a texture line: SVG path data, stroke width and alpha, all in 64-space */
export interface RankStroke {
  d: string;
  w: number;
  o: number;
}

/** a polished highlight: filled white at a low alpha */
export interface RankSheen {
  d: string;
  o: number;
}

export interface RankMaterial {
  /** grain / brush / facet lines, painted in the rank's rim colour */
  strokes: RankStroke[];
  /** specular bands and sparkles, painted white */
  sheens: RankSheen[];
  /** matte materials get no dome gloss — wood is not polished metal */
  matte?: boolean;
}

/**
 * Badge geometry, shared so both renderers extrude identically: a full disc
 * in the rim colour with the face disc sitting slightly high and small on
 * top. What peeks out at the bottom IS the extruded edge — the same
 * "candy / pushable" depth cue the rest of the app gets from
 * `box-shadow: inset 0 -3px 0`, drawn here in a way a canvas can copy.
 */
export const RANK_BADGE = {
  cx: 32,
  cy: 32,
  r: 30,
  /** the lit face, nudged up so the rim reads as a thicker bottom edge */
  faceCx: 32,
  faceCy: 30.6,
  faceR: 26.4
} as const;

/** the dome gloss every polished material gets, as an ellipse in 64-space */
export const RANK_GLOSS = { cx: 32, cy: 15.5, rx: 16.5, ry: 6.8, o: 0.16 } as const;

export const RANK_MATERIAL: Record<RankId, RankMaterial> = {
  /* sawn timber: long grain arcs following the cut, and no shine at all —
     the matte flag is what keeps wood from looking like painted metal */
  wood: {
    matte: true,
    strokes: [
      { d: 'M8 17 Q32 10 56 17', w: 2.6, o: 0.42 },
      { d: 'M6 27 Q32 19 58 27', w: 2.1, o: 0.3 },
      { d: 'M8 37 Q32 29 56 37', w: 2.6, o: 0.42 },
      { d: 'M12 47 Q32 40 52 47', w: 2.1, o: 0.3 }
    ],
    sheens: []
  },
  /* brushed iron: fine parallel tool marks, one dull band. Iron is worked,
     not polished, so the sheen stays far below silver's */
  iron: {
    strokes: [
      { d: 'M11 43 L39 7', w: 2.2, o: 0.34 },
      { d: 'M20 50 L49 12', w: 1.6, o: 0.24 },
      { d: 'M8 33 L29 6', w: 1.4, o: 0.2 },
      { d: 'M31 54 L55 23', w: 1.4, o: 0.2 }
    ],
    sheens: [{ d: 'M14 46 L38 9 L45 13 L21 50 Z', o: 0.12 }]
  },
  /* silver: one broad specular band across the face, edged by a fine tool
     line — on a pale disc a white band alone barely reads */
  silver: {
    strokes: [{ d: 'M17 49 L45 11', w: 1.6, o: 0.26 }],
    sheens: [{ d: 'M10 39 L33 5 L45 11 L22 46 Z', o: 0.36 }]
  },
  /* gold: a warm band plus the sparkle that says "precious" at a glance */
  gold: {
    strokes: [{ d: 'M19 50 L47 13', w: 1.5, o: 0.22 }],
    sheens: [
      { d: 'M12 41 L35 6 L46 12 L23 47 Z', o: 0.26 },
      { d: 'M47 13 L49.4 18.6 L55 21 L49.4 23.4 L47 29 L44.6 23.4 L39 21 L44.6 18.6 Z', o: 0.5 }
    ]
  },
  /* platinum: mirror finish — two crisp bands, no tool marks left */
  platinum: {
    strokes: [
      { d: 'M20 45 L40 12', w: 1.4, o: 0.2 },
      { d: 'M24 55 L44 22', w: 1.2, o: 0.14 }
    ],
    sheens: [
      { d: 'M10 37 L30 4 L38 8 L18 42 Z', o: 0.4 },
      { d: 'M27 53 L46 21 L51 25 L32 56 Z', o: 0.24 }
    ]
  },
  /* challenger: cut like a gem — facet edges meeting at a crown table */
  challenger: {
    strokes: [
      { d: 'M32 4 L32 57', w: 1.4, o: 0.3 },
      { d: 'M9 21 L55 41', w: 1.4, o: 0.24 },
      { d: 'M9 41 L55 21', w: 1.4, o: 0.24 }
    ],
    sheens: [{ d: 'M32 5 L52 20 L32 31 L12 20 Z', o: 0.28 }]
  }
};
