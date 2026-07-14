/**
 * Pure Hangman reveal + scoring logic — no React, fully importable for tests
 * and `npm run validate`. The board is a single hidden word (or two-word
 * phrase); spaces are always shown, letters reveal only once guessed.
 */

export const VOWELS = ['A', 'E', 'I', 'O', 'U'];
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function isLetter(ch: string): boolean {
  return /^[A-Z]$/.test(ch);
}

/** Distinct A–Z letters that appear in the word (ignores spaces). */
export function distinctLetters(word: string): string[] {
  return [...new Set([...word].filter(isLetter))];
}

/** A character is shown if it is a space, or its letter has been guessed. */
export function isRevealed(ch: string, guessed: ReadonlySet<string>): boolean {
  return ch === ' ' || guessed.has(ch);
}

/** All the word's letters have been guessed. */
export function isSolved(word: string, guessed: ReadonlySet<string>): boolean {
  return [...word].every((ch) => ch === ' ' || guessed.has(ch));
}

/** Guessed letters that do NOT appear in the word. */
export function wrongLetters(word: string, guessed: ReadonlySet<string>): string[] {
  const inWord = new Set([...word]);
  return [...guessed].filter((l) => !inWord.has(l));
}

export interface GuessOutcome {
  /** The letter was already guessed — a no-op. */
  repeated: boolean;
  /** The letter appears in the word. */
  correct: boolean;
  /** Indices in `word` newly revealed by this guess. */
  positions: number[];
}

/**
 * Evaluate guessing `letter` given the letters already guessed. A repeated
 * guess is a no-op (empty positions, `repeated: true`).
 */
export function guessOutcome(
  word: string,
  guessedBefore: ReadonlySet<string>,
  letter: string
): GuessOutcome {
  if (guessedBefore.has(letter)) {
    return { repeated: true, correct: [...word].includes(letter), positions: [] };
  }
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] === letter) positions.push(i);
  }
  return { repeated: false, correct: positions.length > 0, positions };
}

/** An unrevealed vowel present in the word, or null if none remain. */
export function pickPeekVowel(
  word: string,
  guessed: ReadonlySet<string>,
  rng: () => number = Math.random
): string | null {
  const candidates = VOWELS.filter((v) => [...word].includes(v) && !guessed.has(v));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

// ---- scoring ----

export const LETTER_PTS = 10; // per revealed position
export const WIN_BONUS = 50;
export const LIFE_BONUS = 15; // per remaining life, on a win
export const HINT_PENALTY = 25;

export interface ScoreInput {
  word: string;
  /** Every guessed letter (player + assist-revealed). */
  guessed: ReadonlySet<string>;
  /** Letters revealed by the vowel-peek assist — earn no guess points. */
  assistLetters: ReadonlySet<string>;
  livesRemaining: number;
  hintsUsed: number;
  won: boolean;
  mult: number;
}

/**
 * Score = points for every position revealed by the player's own correct
 * guesses × difficulty multiplier, plus (on a win) a win bonus and a bonus
 * per remaining life, minus a flat penalty per hint. Never negative.
 */
export function computeScore(input: ScoreInput): number {
  const { word, guessed, assistLetters, livesRemaining, hintsUsed, won, mult } = input;
  const inWord = new Set([...word]);
  let pts = 0;
  for (const letter of distinctLetters(word)) {
    if (!guessed.has(letter) || assistLetters.has(letter) || !inWord.has(letter)) continue;
    const positions = [...word].filter((c) => c === letter).length;
    pts += positions * LETTER_PTS * mult;
  }
  if (won) {
    pts += WIN_BONUS * mult + Math.max(0, livesRemaining) * LIFE_BONUS * mult;
  }
  pts -= hintsUsed * HINT_PENALTY;
  return Math.max(0, pts);
}
