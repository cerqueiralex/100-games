import type { ReactNode } from 'react';
import { PixelArt } from './pixelArt';
import { cardSprite } from './cardArt';

/**
 * Memory Match card themes.
 *
 * A theme is a POOL OF FACE IDS plus a way to draw one. The deck stored in a
 * save is a list of ids, never rendered art — which is what lets the same
 * snapshot survive a redesign, and why the standard theme's ids are the
 * emoji themselves (a save written before themes existed still resumes).
 *
 * THE RULE EVERY THEME MUST MEET: it needs at least as many distinct faces
 * as the hardest tier has pairs (28). A theme with fewer would either crash
 * or quietly deal duplicate pairs, which in a memory game means an
 * unwinnable board. `npm run validate` re-proves the count for every theme.
 */

export type MemoryThemeId = 'standard' | 'pokemon' | 'cards';

export interface MemoryTheme {
  id: MemoryThemeId;
  label: string;
  /** every face this theme can deal, in a stable order */
  faces: string[];
  /** what the card front shows for a face id */
  render: (faceId: string) => ReactNode;
  /** one sample face, shown on the setup screen's theme button */
  preview: ReactNode;
  /** screen-reader name for a face id */
  describe: (faceId: string) => string;
  /** extra class on the board, for per-theme card sizing */
  boardClass?: string;
}

/* ---------------- standard: the original emoji set ---------------- */

/* Card faces are game content (like avatars), not UI chrome — emojis allowed. */
const EMOJI = [
  '🐶', '🦊', '🐼', '🐸', '🦉', '🐙', '🦋', '🌵', '🍕',
  '🍩', '🚀', '⚽', '🎲', '🎧', '🌙', '⭐', '🔑', '🎈',
  '🍄', '🐝', '🦀', '🐬', '🍓', '🥑', '🌈', '🔥', '🎁',
  '🛸', '🧲', '🎹', '⚓', '🧊'
];

const standard: MemoryTheme = {
  id: 'standard',
  label: 'Classic',
  faces: EMOJI,
  render: (f) => <span className="mm-emoji">{f}</span>,
  preview: <span className="mm-emoji">🦊</span>,
  describe: (f) => f
};

/* ---------------- pokémon: the original 151 ---------------- */

/**
 * The original 151, as the GAME's own pixel art: PokéAPI's Generation V
 * sprites, 96×96 and the high-water mark of hand-drawn Pokémon spritework.
 * They are also 8× smaller than the vector artwork this theme first shipped
 * with (600 KB for all 151, against 5 MB) — small enough to precache, so the
 * theme works offline from the moment the app is installed rather than only
 * after its first online game.
 *
 * Sprites are vendored under `public/pokemon/<id>.png` rather than
 * hot-linked: the app is offline-first, and a card that needs the network to
 * show its face is a blank card on a plane.
 *
 * `BASE_URL` matters: the app is hosted on a subpath (/100-games/), so an
 * absolute "/pokemon/1.png" would 404 in production.
 */
const GEN1 = 151;

/* `import.meta.env` only exists under Vite, and this module is imported by
   scripts/validate.ts under plain Node — where reading .BASE_URL off an
   undefined env throws at module load. The preview element below is built
   eagerly, so that crash took the whole gate down. */
const BASE =
  (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const spriteUrl = (id: string) => `${BASE}pokemon/${id}.png`;

const POKEMON_NAMES: Record<number, string> = {
  1: 'Bulbasaur', 4: 'Charmander', 7: 'Squirtle', 25: 'Pikachu', 39: 'Jigglypuff',
  52: 'Meowth', 54: 'Psyduck', 143: 'Snorlax', 150: 'Mewtwo', 151: 'Mew'
};

const pokemon: MemoryTheme = {
  id: 'pokemon',
  label: 'Pokémon',
  faces: Array.from({ length: GEN1 }, (_, i) => String(i + 1)),
  render: (f) => (
    <img
      className="mm-sprite"
      src={spriteUrl(f)}
      alt=""
      draggable={false}
      loading="eager"
    />
  ),
  // Pikachu, because a theme button should be recognisable at 40px
  preview: (
    <img src={spriteUrl('25')} alt="" draggable={false} />
  ),
  describe: (f) => POKEMON_NAMES[Number(f)] ?? `Pokémon number ${f}`,
  boardClass: 'mm-theme-sprite'
};

/* ---------------- cards: a French deck ---------------- */

const SUITS = [
  { id: 's', pip: '♠', name: 'spades', red: false },
  { id: 'h', pip: '♥', name: 'hearts', red: true },
  { id: 'd', pip: '♦', name: 'diamonds', red: true },
  { id: 'c', pip: '♣', name: 'clubs', red: false }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_NAME: Record<string, string> = {
  A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King'
};

/** 52 cards plus the two jokers — 54 faces, comfortably over the 28 needed */
const DECK = [
  ...SUITS.flatMap((s) => RANKS.map((r) => `${s.id}${r}`)),
  'joker-red',
  'joker-black'
];

const SUIT_BY_ID = new Map(SUITS.map((s) => [s.id, s]));

function parseCard(faceId: string) {
  if (faceId.startsWith('joker')) return null;
  return { suit: SUIT_BY_ID.get(faceId[0]), rank: faceId.slice(1) };
}

const cards: MemoryTheme = {
  id: 'cards',
  label: 'Card deck',
  faces: DECK,
  render: (f) => <PixelArt sprite={cardSprite(f)} className="mm-pixel" />,
  preview: (
    <span className="option-card-chip">
      <PixelArt sprite={cardSprite('hA')} className="mm-pixel" />
    </span>
  ),
  describe: (f) => {
    if (f === 'joker-red') return 'Red joker';
    if (f === 'joker-black') return 'Black joker';
    const c = parseCard(f);
    if (!c?.suit) return f;
    return `${RANK_NAME[c.rank] ?? c.rank} of ${c.suit.name}`;
  },
  boardClass: 'mm-theme-cards'
};

/* ---------------- registry ---------------- */

export const MEMORY_THEMES: Record<MemoryThemeId, MemoryTheme> = {
  standard,
  pokemon,
  cards
};

export const MEMORY_THEME_LIST = [standard, pokemon, cards];

/** the stored choice, falling back to the classic set for anything unknown */
export function memoryTheme(id: string | undefined): MemoryTheme {
  return MEMORY_THEMES[id as MemoryThemeId] ?? standard;
}
