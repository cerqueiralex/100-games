import type { PuzzleDef } from './types';
import { generatePuzzle, type GenOptions } from './generator';

/**
 * Preset library: a fixed, curated catalog of original puzzles organized in
 * difficulty tiers (very easy → very hard), in the spirit of classic logic
 * grid collections. Every preset is produced deterministically from a baked
 * seed, so the same preset is identical on every device and provably solvable
 * (npm run validate re-derives and re-verifies each one).
 */

export interface PresetEntry {
  id: string;
  title: string;
  story?: string;
  seed: number;
  k: number;
  n: number;
  themeId: string;
  flavor: GenOptions['flavor'];
}

export interface PresetTier {
  id: string;
  name: string;
  blurb: string;
  entries: PresetEntry[];
}

const e = (
  id: string,
  title: string,
  seed: number,
  k: number,
  n: number,
  themeId: string,
  flavor: GenOptions['flavor'],
  story?: string
): PresetEntry => ({ id, title, seed, k, n, themeId, flavor, story });

export const PRESET_TIERS: PresetTier[] = [
  {
    id: 'very-easy',
    name: 'Very easy',
    blurb: '3×3 grids with friendly, direct clues — perfect to learn the ropes.',
    entries: [
      e('ve-pets', 'Meet the Neighbors', 11, 3, 3, 'neighbors', 'gentle'),
      e('ve-bakery', 'Three Sweet Orders', 12, 3, 3, 'bakery', 'gentle'),
      e('ve-race', 'Ready, Set, Go', 13, 3, 3, 'sportsday', 'gentle'),
      e('ve-books', 'Quiet Corner', 14, 3, 3, 'library', 'gentle'),
      e('ve-band', 'First Rehearsal', 15, 3, 3, 'band', 'gentle')
    ]
  },
  {
    id: 'easy',
    name: 'Easy',
    blurb: 'Still 3 categories, but with four of everything and fewer freebies.',
    entries: [
      e('ea-trips', 'Four Boarding Passes', 21, 3, 4, 'travelers', 'gentle'),
      e('ea-doors', 'Down Maple Lane', 22, 3, 4, 'neighbors', 'balanced'),
      e('ea-crumbs', 'The Crumb Trail', 23, 3, 4, 'bakery', 'balanced'),
      e('ea-warmup', 'Field Day', 24, 3, 4, 'sportsday', 'balanced'),
      e('ea-floors', 'Shelf by Shelf', 25, 3, 4, 'library', 'balanced')
    ]
  },
  {
    id: 'medium',
    name: 'Medium',
    blurb: 'A fourth category joins the grid — cross-referencing begins.',
    entries: [
      e('me-lane', 'The Whole Street', 31, 4, 4, 'neighbors', 'balanced'),
      e('me-stage', 'Soundcheck', 32, 4, 4, 'band', 'balanced'),
      e('me-passport', 'Layovers', 33, 4, 4, 'travelers', 'balanced'),
      e('me-counter', 'Behind the Counter', 34, 4, 4, 'bakery', 'balanced'),
      e('me-medals', 'Photo Finish', 35, 4, 4, 'sportsday', 'balanced')
    ]
  },
  {
    id: 'hard',
    name: 'Hard',
    blurb: 'Four categories, five of everything, and clues that make you work.',
    entries: [
      e('ha-shelves', 'The Fifth Floor', 41, 4, 5, 'library', 'balanced'),
      e('ha-quintet', 'The Quintet', 42, 4, 5, 'band', 'tricky'),
      e('ha-continent', 'Five Time Zones', 43, 4, 5, 'travelers', 'tricky'),
      e('ha-street', 'Maple Lane Census', 44, 4, 5, 'neighbors', 'tricky'),
      e('ha-dozen', "The Baker's Handful", 45, 4, 5, 'bakery', 'tricky')
    ]
  },
  {
    id: 'very-hard',
    name: 'Very hard',
    blurb: 'Minimal clue sets, heavy on comparisons and multi-eliminations.',
    entries: [
      e('vh-finals', 'Finals Day', 51, 4, 5, 'sportsday', 'tricky'),
      e('vh-archive', 'The Archive Run', 52, 4, 5, 'library', 'tricky'),
      e('vh-tour', 'The Grand Tour', 53, 4, 5, 'travelers', 'tricky'),
      e('vh-encore', 'Encore, Encore', 54, 4, 5, 'band', 'tricky'),
      e('vh-lane', 'Maple Lane Confidential', 55, 4, 5, 'neighbors', 'tricky')
    ]
  }
];

export const ALL_PRESETS: PresetEntry[] = PRESET_TIERS.flatMap((t) => t.entries);

export function presetById(id: string): PresetEntry | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/** Deterministically materialize a preset into a playable puzzle. */
export function buildPreset(entry: PresetEntry): PuzzleDef {
  const def = generatePuzzle({
    seed: entry.seed,
    k: entry.k,
    n: entry.n,
    themeId: entry.themeId,
    flavor: entry.flavor
  });
  return { ...def, id: entry.id, title: entry.title, story: entry.story ?? def.story };
}
