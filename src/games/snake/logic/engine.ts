/**
 * Snake — the rules, dependency-free so `npm run validate` can drive them.
 *
 * The board is `size × size`, cells indexed `y * size + x`. The snake is a
 * list of cells, HEAD FIRST. Every tick the head moves one cell in the
 * current direction; the tail follows unless an apple was just eaten, in
 * which case the snake grows by one. Walls kill (unless the Wall wrap
 * assist is on, which carries the head to the opposite side), and so does
 * the snake's own body — except the cell its tail is about to vacate,
 * which is free by the time the head arrives.
 *
 * Tiers change SPEED and BOARD SIZE (and the apple target that wins the
 * run). The snake also speeds up a little with every apple (`tickFor`),
 * down to a floor, so a long snake is a fast snake.
 */
import type { Difficulty } from '../../../platform/types';

/** 0 up · 1 right · 2 down · 3 left */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

/** the one turn that is never allowed: straight back into the neck */
export const isReverse = (a: Dir, b: Dir): boolean => (a + 2) % 4 === b;

export interface SnakeTier {
  /** cells per side */
  size: number;
  /** ms per step at the start of the run */
  tickMs: number;
  /** apples that win the run */
  target: number;
  label: string;
}

export const TIERS: Record<Difficulty, SnakeTier> = {
  easy: { size: 12, tickMs: 200, target: 12, label: '12×12 · gentle' },
  medium: { size: 14, tickMs: 165, target: 18, label: '14×14 · brisk' },
  hard: { size: 16, tickMs: 135, target: 25, label: '16×16 · quick' },
  pro: { size: 18, tickMs: 112, target: 32, label: '18×18 · fast' },
  extreme: { size: 20, tickMs: 92, target: 40, label: '20×20 · frantic' }
};

/** the starting length of the snake */
export const START_LENGTH = 3;
/** points per apple, times the tier multiplier */
export const APPLE_POINTS = 10;
export const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
/** apples eaten within this many ms of each other extend a combo */
export const COMBO_WINDOW_MS = 2500;

/** the step time after `apples` apples: 1.2% faster each, never below 72% of the start */
export function tickFor(tier: SnakeTier, apples: number, slow: boolean): number {
  const base = tier.tickMs * (slow ? 1.35 : 1);
  return Math.max(base * 0.72, base * Math.pow(0.988, apples));
}

export interface SnakeState {
  size: number;
  /** cells, head first */
  body: number[];
  dir: Dir;
  /** apple cell, or -1 when the board is full */
  apple: number;
  apples: number;
  alive: boolean;
}

/** a uniformly random free cell, or -1 when there is none */
export function placeApple(body: number[], size: number, rng: () => number = Math.random): number {
  const taken = new Set(body);
  const free: number[] = [];
  for (let i = 0; i < size * size; i++) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return -1;
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
}

/** three cells long, in the middle, heading right, one apple somewhere free */
export function initialState(size: number, rng: () => number = Math.random): SnakeState {
  const y = Math.floor(size / 2);
  const x = Math.floor(size / 2) - 1;
  const body = [y * size + x, y * size + x - 1, y * size + x - 2];
  return { size, body, dir: 1, apple: placeApple(body, size, rng), apples: 0, alive: true };
}

export interface StepResult {
  state: SnakeState;
  ate: boolean;
  died: 'wall' | 'self' | null;
}

/**
 * One tick. `dir` is the direction to move (the caller has already dropped
 * reversals). A death leaves the body where it was — the snake never draws
 * itself inside a wall — and flips `alive` off.
 */
export function step(s: SnakeState, dir: Dir, wrap: boolean, rng: () => number = Math.random): StepResult {
  const { size } = s;
  const head = s.body[0];
  let x = (head % size) + DX[dir];
  let y = Math.floor(head / size) + DY[dir];
  if (x < 0 || x >= size || y < 0 || y >= size) {
    if (!wrap) return { state: { ...s, dir, alive: false }, ate: false, died: 'wall' };
    x = (x + size) % size;
    y = (y + size) % size;
  }
  const next = y * size + x;
  const ate = next === s.apple;
  // the tail cell frees up as the head arrives, unless the snake grows this tick
  const occupied = ate ? s.body : s.body.slice(0, -1);
  if (occupied.includes(next)) return { state: { ...s, dir, alive: false }, ate: false, died: 'self' };
  const body = ate ? [next, ...s.body] : [next, ...s.body.slice(0, -1)];
  return {
    state: {
      ...s,
      dir,
      body,
      apple: ate ? placeApple(body, size, rng) : s.apple,
      apples: ate ? s.apples + 1 : s.apples
    },
    ate,
    died: null
  };
}
