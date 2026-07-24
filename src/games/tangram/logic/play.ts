/*
 * Pure play helpers (no React): scatter, snapping, scoring constants and the
 * win check. Kept importable so the drag/rotate/snap/win pipeline can be
 * exercised headlessly.
 */
import type { Difficulty } from '../../../platform/types';
import {
  type PieceKind,
  type Placement,
  type Pt,
  type Target,
  PIECE_SET,
  transform,
  centroid,
  bounds,
  isSolved
} from './geometry';
import type { TangramPuzzle } from './puzzles';
import { puzzleTarget } from './puzzles';

export const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
export const PAR_SEC: Record<Difficulty, number> = { easy: 120, medium: 180, hard: 240, pro: 300, extreme: 360 };
export const HINT_PENALTY = 40;
export const WIN_BASE = 400;

/** snap radius (world units): how close a vertex must be to click into place */
export const SNAP_RADIUS: Record<Difficulty, number> = {
  easy: 0.95,
  medium: 0.8,
  hard: 0.65,
  pro: 0.55,
  extreme: 0.42
};
/** the strong-snap assist widens the catch radius */
export const SNAP_BOOST = 0.55;

/* ring = clearance beyond the silhouette's half-extent: pieces scatter on a
   snug ellipse hugging the figure so the arena (and therefore the on-screen
   scale) stays compact — the figure must fill the canvas, not float in a
   sea of empty space */
export const SCATTER: Record<
  Difficulty,
  { ring: number; jitter: number; rots: number[]; flip: boolean; keepRot: boolean }
> = {
  easy: { ring: 1.0, jitter: 0.3, rots: [0, 2, 4, 6], flip: false, keepRot: true },
  medium: { ring: 1.1, jitter: 0.4, rots: [0, 2, 4, 6], flip: false, keepRot: false },
  hard: { ring: 1.2, jitter: 0.45, rots: [0, 2, 4, 6], flip: true, keepRot: false },
  pro: { ring: 1.25, jitter: 0.5, rots: [0, 1, 2, 3, 4, 5, 6, 7], flip: true, keepRot: false },
  extreme: { ring: 1.35, jitter: 0.55, rots: [0, 1, 2, 3, 4, 5, 6, 7], flip: true, keepRot: false }
};

/** content palette slot per piece instance (never --play-9 white) */
export const SLOTS = [4, 6, 5, 1, 8, 3, 7];

export interface PieceCore {
  kind: PieceKind;
  slot: number;
  home: Placement;
  rot: number;
  flip: boolean;
  pos: Pt;
}

/** centroid of a canonical piece at a given rotation/flip (translation 0) */
export function baseCentroid(kind: PieceKind, rot: number, flip: boolean): Pt {
  return centroid(transform(kind, rot, flip, { x: 0, y: 0 }));
}

/** translation that puts the piece centroid at `c` */
export function posForCentroid(kind: PieceKind, rot: number, flip: boolean, c: Pt): Pt {
  const bc = baseCentroid(kind, rot, flip);
  return { x: c.x - bc.x, y: c.y - bc.y };
}

export function scatterPieces(
  puzzle: TangramPuzzle,
  difficulty: Difficulty,
  rnd: () => number = Math.random
): PieceCore[] {
  const cfg = SCATTER[difficulty];
  const target = puzzleTarget(puzzle);
  const bb = bounds(target.polys);
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;

  const pool: Record<string, Placement[]> = {};
  for (const s of puzzle.solution) (pool[s.kind] ??= []).push(s);
  const taken: Record<string, number> = {};
  const rand = (a: number, b: number) => a + rnd() * (b - a);

  return PIECE_SET.map((kind, i) => {
    const homeList = pool[kind] ?? [];
    const idx = (taken[kind] = (taken[kind] ?? 0) + 1) - 1;
    const home = homeList[idx] ?? homeList[0];
    const ang = (i / PIECE_SET.length) * Math.PI * 2 + rand(-0.3, 0.3);
    const at = {
      x: cx + Math.cos(ang) * ((bb.maxX - bb.minX) / 2 + cfg.ring + rand(0, cfg.jitter)),
      y: cy + Math.sin(ang) * ((bb.maxY - bb.minY) / 2 + cfg.ring + rand(0, cfg.jitter))
    };
    const rot = cfg.keepRot ? home.rot : cfg.rots[Math.floor(rnd() * cfg.rots.length)];
    const flip = cfg.keepRot ? home.flip : cfg.flip ? rnd() < 0.5 : false;
    return { kind, slot: SLOTS[i], home, rot, flip, pos: posForCentroid(kind, rot, flip, at) };
  });
}

/**
 * Snap a placed piece so one of its vertices clicks onto a target-outline
 * vertex (preferring the alignment that makes the most vertices coincide);
 * if nothing is within the catch radius, tidy the position to the half grid.
 */
export function snapPos(
  kind: PieceKind,
  rot: number,
  flip: boolean,
  pos: Pt,
  target: Target,
  radius: number
): Pt {
  const verts = transform(kind, rot, flip, pos);
  const sol = target.polys.flat();
  let best: { t: Pt; score: number; dist: number } | null = null;
  for (const sv of sol) {
    for (const pv of verts) {
      const t = { x: sv.x - pv.x, y: sv.y - pv.y };
      const dist = Math.hypot(t.x, t.y);
      if (dist > radius) continue;
      let sc = 0;
      for (const q of verts) {
        const qx = q.x + t.x;
        const qy = q.y + t.y;
        if (sol.some((s) => Math.abs(s.x - qx) < 0.05 && Math.abs(s.y - qy) < 0.05)) sc++;
      }
      if (!best || sc > best.score || (sc === best.score && dist < best.dist)) best = { t, score: sc, dist };
    }
  }
  if (best && best.score >= 1) return { x: pos.x + best.t.x, y: pos.y + best.t.y };
  const half = (n: number) => Math.round(n * 2) / 2;
  return { x: half(pos.x), y: half(pos.y) };
}

/** true when the given placements tile the target silhouette */
export function isWin(pieces: { kind: PieceKind; rot: number; flip: boolean; pos: Pt }[], target: Target): boolean {
  return isSolved(pieces.map((p) => transform(p.kind, p.rot, p.flip, p.pos)), target);
}
