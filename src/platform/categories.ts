import type { CategoryId } from './types';
import { GAMES } from './registry';

/**
 * The category registry — the platform-level vocabulary games classify
 * themselves with. Built to scale past the current library: when a future
 * game doesn't fit, add ONE entry here (plus the CategoryId union in
 * types.ts) and every surface — menu filter chips, card tags, profile
 * charts and stats scopes — picks it up automatically.
 *
 * `slot` is the content-palette slot (--play-N) used wherever a category
 * needs a stable color (chips, charts). Slots come from the chart-safe
 * list in charts.tsx — never 9 (white).
 */
export const CATEGORIES: { id: CategoryId; name: string; slot: number }[] = [
  { id: 'logic', name: 'Logic', slot: 4 },
  { id: 'words', name: 'Words', slot: 3 },
  { id: 'memory', name: 'Memory', slot: 5 },
  { id: 'focus', name: 'Focus', slot: 6 },
  { id: 'numbers', name: 'Numbers', slot: 7 },
  { id: 'spatial', name: 'Spatial', slot: 1 },
  { id: 'strategy', name: 'Strategy', slot: 8 },
  // reserved for future arcade/speed games (e.g. reaction testers)
  { id: 'reflex', name: 'Reflex', slot: 15 }
];

export function categoryName(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export function categoryColor(id: CategoryId): string {
  return `var(--play-${CATEGORIES.find((c) => c.id === id)?.slot ?? 14})`;
}

/** category of a recorded game id ('logic' fallback keeps old ids rendering) */
export function gameCategory(gameId: string): CategoryId {
  return GAMES.find((g) => g.id === gameId)?.category ?? 'logic';
}

/** categories that actually contain at least one registered game, in
    registry-agnostic display order */
export function activeCategories(): { id: CategoryId; name: string; slot: number }[] {
  return CATEGORIES.filter((c) => GAMES.some((g) => g.category === c.id));
}
