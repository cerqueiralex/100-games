/**
 * Count & Compare — shared content types + palette mappings.
 * Pure data, no React, so the generator and validator can import freely.
 */

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star';
export type ColorKey = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';

/** Ordered so a tier can take the first N (see config.tierColors/tierShapes). */
export const SHAPE_KINDS: ShapeKind[] = ['circle', 'square', 'triangle', 'star'];
export const COLOR_KEYS: ColorKey[] = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];

/** Content colors map to the fixed --play-* palette (never the accent). */
export const COLOR_TOKEN: Record<ColorKey, string> = {
  blue: 'var(--play-4)',
  red: 'var(--play-2)',
  green: 'var(--play-1)',
  yellow: 'var(--play-3)',
  purple: 'var(--play-5)',
  orange: 'var(--play-7)'
};

export const COLOR_LABEL: Record<ColorKey, string> = {
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  purple: 'Purple',
  orange: 'Orange'
};

export const SHAPE_LABEL: Record<ShapeKind, string> = {
  circle: 'Circles',
  square: 'Squares',
  triangle: 'Triangles',
  star: 'Stars'
};

export const SHAPE_PLURAL: Record<ShapeKind, string> = {
  circle: 'circles',
  square: 'squares',
  triangle: 'triangles',
  star: 'stars'
};

/** One drawn shape, positioned in a logical 0..100 stage. */
export interface PlacedShape {
  kind: ShapeKind;
  color: ColorKey;
  /** center x/y as a percentage of the stage (0..100) */
  x: number;
  y: number;
  /** diameter as a percentage of the stage */
  d: number;
  /** rotation in degrees (baked into star/triangle points) */
  rot: number;
}

export interface Scene {
  shapes: PlacedShape[];
}

export type QuestionType =
  | 'compare-color'
  | 'compare-shape'
  | 'count-shape'
  | 'count-color'
  | 'count-total'
  | 'parity'
  | 'count-two-attr';

/**
 * A generated question about a scene. `options` are the button labels and
 * `answerIndex` is the correct one — always equal to `answer(scene, q)`.
 * The remaining fields are the semantic params the pure `answer()` verifier
 * recomputes the ground truth from.
 */
export interface Question {
  type: QuestionType;
  prompt: string;
  options: string[];
  answerIndex: number;
  /** compare-color: options[0] is colorA, options[1] is colorB */
  colorA?: ColorKey;
  colorB?: ColorKey;
  /** compare-shape: options[0] is shapeA, options[1] is shapeB */
  shapeA?: ShapeKind;
  shapeB?: ShapeKind;
  /** single target attribute for count/parity/two-attr questions */
  color?: ColorKey;
  shape?: ShapeKind;
}
