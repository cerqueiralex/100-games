/**
 * Symbol Coding — the fixed content of the animated demo and the card
 * sticker. Pure data, so the fidelity check can prove the demo key is a key
 * the generator could draw (no rotation / mirror pairs, no near-copies).
 */

/** the demo's key: pool glyph indices for the digits 1..9 */
export const DEMO_KEY: readonly number[] = [0, 3, 5, 7, 14, 17, 19, 27, 31];

/** the digits the demo's fingertip codes, in order (the third is shown, never tapped) */
export const DEMO_TARGETS: readonly number[] = [6, 2, 8];

/** the sticker's three key glyphs; the middle one is the target its tile shows */
export const ICON_GLYPHS: readonly number[] = [5, 17, 0];
