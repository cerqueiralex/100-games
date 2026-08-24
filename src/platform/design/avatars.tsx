/**
 * Player avatars.
 *
 * An avatar is stored in `Profile.emoji` as a single string, and there are
 * two kinds:
 *
 *  - an emoji, stored as itself ("🦊")
 *  - a sprite, stored as "pokemon:<id>" — one of the Generation V sprites
 *    already vendored in `public/pokemon/`
 *
 * Keeping ONE field rather than adding a second `avatarKind` is what makes
 * every old profile, every old backup file and every history row keep
 * working untouched: a value with no prefix is an emoji, which is exactly
 * what every profile written before sprites existed contains.
 *
 * The sprites are an APP asset (`public/pokemon/`), not Memory Match's — the
 * game and the profile both reference them by URL. Don't delete them with a
 * theme.
 */
import type { ReactNode } from 'react';

const PREFIX = 'pokemon:';

/* `import.meta.env` only exists under Vite; scripts/validate.ts imports this
   module under plain Node, where reading .BASE_URL off an undefined env
   throws at load. */
const BASE =
  (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export interface PokemonAvatar {
  /** national dex number, which is also the sprite filename */
  id: number;
  name: string;
}

/** The starters, the mascot, the legendary and the big sleepy one. */
export const POKEMON_AVATARS: PokemonAvatar[] = [
  { id: 25, name: 'Pikachu' },
  { id: 1, name: 'Bulbasaur' },
  { id: 4, name: 'Charmander' },
  { id: 7, name: 'Squirtle' },
  { id: 143, name: 'Snorlax' },
  { id: 150, name: 'Mewtwo' }
];

const BY_VALUE = new Map(POKEMON_AVATARS.map((p) => [`${PREFIX}${p.id}`, p]));

/** the stored value for a Pokémon avatar */
export function pokemonAvatarValue(id: number): string {
  return `${PREFIX}${id}`;
}

/** true when this avatar is a sprite rather than an emoji */
export function isSpriteAvatar(value: string): boolean {
  return BY_VALUE.has(value);
}

/** where the sprite lives, or null for an emoji avatar */
export function avatarSpriteUrl(value: string): string | null {
  const p = BY_VALUE.get(value);
  return p ? `${BASE}pokemon/${p.id}.png` : null;
}

/** a name for screen readers and for the share card's text fallback */
export function avatarLabel(value: string): string {
  return BY_VALUE.get(value)?.name ?? value;
}

/**
 * The avatar, wherever one is shown. `size` drives the sprite box; emoji
 * avatars inherit the surrounding font-size as they always have, so the
 * existing header and profile styling is untouched for them.
 */
export function Avatar({ value, size }: { value: string; size?: number }): ReactNode {
  const url = avatarSpriteUrl(value);
  if (!url) return <>{value}</>;
  return (
    <img
      className="avatar-sprite"
      src={url}
      alt={avatarLabel(value)}
      draggable={false}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

/* ---------- canvas support (the shareable cards) ---------- */

const loaded = new Map<string, HTMLImageElement>();

/**
 * Loads an avatar sprite so a canvas can draw it.
 *
 * The share cards render synchronously and hand back a finished canvas, so
 * the image has to be decoded BEFORE that starts — `drawImage` with a
 * half-loaded image silently draws nothing. Resolves to null for emoji
 * avatars and for a sprite that fails to load, and the callers fall back to
 * text, because a card that fails to render at all is worse than a card
 * without a picture on it.
 */
export function loadAvatarSprite(value: string): Promise<HTMLImageElement | null> {
  const url = avatarSpriteUrl(value);
  if (!url) return Promise.resolve(null);
  const cached = loaded.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      loaded.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** the already-decoded sprite, for the synchronous canvas draw */
export function avatarSprite(value: string): HTMLImageElement | null {
  const url = avatarSpriteUrl(value);
  return url ? (loaded.get(url) ?? null) : null;
}
