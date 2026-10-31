/**
 * Mirror Twins — the figure geometry (SCIENCE.md §1.13, "Generator" and
 * "Rendering"). Pure and dependency-free (no DOM, no React), so validate and
 * scripts/brain-checks/mirror-twins.ts drive it under Node.
 *
 * A figure is a Shepard–Metzler polycube: a path of 10 unit cubes in 4
 * straight arms joined by 3 right-angle bends, the shape family of Shepard &
 * Metzler (1971) and of the Ganis & Kievit (2015) set (7–11 cubes, four arms).
 * Coordinates are integer lattice points; y is the world VERTICAL axis — the
 * axis every rotation in this test turns about.
 *
 * Acceptance rules (all four must hold before a figure is ever shown):
 *  1. it spans all three axes (it is not flat);
 *  2. no two non-consecutive arms touch face to face — read literally: a
 *     corner cube belongs to BOTH of its arms, so a 2-cube middle arm (whose
 *     two corners touch) is rejected and 2-cube arms only occur at the ends;
 *  3. it is chiral: its mirror image (x → −x), normalised, matches none of
 *     the 24 proper rotations of the original — otherwise a "mirror" trial
 *     would have no right answer;
 *  4. from the camera, every cube shows at least 25 % of one face in every
 *     view a trial uses, and no arm lies within 15° of the line of sight
 *     (`viewIsReadable`). A face whose full projection is a sliver (under
 *     0.2 of a unit square — a face seen nearly edge-on) cannot satisfy the
 *     rule on its own.
 *
 * Rendering is an orthographic camera at 25° elevation; faces are painted
 * back to front. For a lattice of unit cubes, sorting whole cubes by the
 * depth of their centres is an exact painter's order: if cube A hides part
 * of cube B, B is no nearer than A along any axis, so its centre is strictly
 * farther along the view direction (validate re-proves it against a
 * z-buffer). Faces between two cubes of the figure are never drawn.
 */

export type P3 = [number, number, number];

/** cubes per figure, arms per figure and the allowed arm lengths (cubes, corners counted in both arms) */
export const CUBES = 10;
export const ARMS = 4;
export const ARM_LENGTHS: readonly number[] = [2, 3, 4];
/** camera elevation, degrees above the horizon */
export const ELEVATION = 25;
/** rule 4: share of one face that must stay visible, and the sliver floor (unit squares) */
export const MIN_VISIBLE_FRACTION = 0.25;
export const MIN_FACE_AREA = 0.2;
/** rule 4: no arm closer than this to the line of sight (degrees) */
export const MIN_SIGHT_ANGLE = 15;
/** raster resolution of the visibility check (pixels per cube edge) */
export const RASTER = 12;
/**
 * Every figure is drawn into a square VIEW_UNITS cube edges wide (one scale
 * for the whole session, so cube size never varies between trials or
 * between the two figures), and a view must fit inside FIT_UNITS of it.
 */
export const VIEW_UNITS = 7.8;
export const FIT_UNITS = 6.8;

export const DIRS: readonly P3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1]
];

/**
 * Every ordering of four arm lengths from {2, 3, 4} that makes 10 cubes:
 * L1 + L2 + L3 + L4 − 3 shared corners = 10, so the lengths sum to 13 —
 * the orderings of {4, 4, 3, 2} and {4, 3, 3, 3} (16 in all; rule 2 later
 * rejects the six with a 2-cube middle arm).
 */
export const ARM_ORDERINGS: readonly number[][] = (() => {
  const out: number[][] = [];
  for (const a of ARM_LENGTHS)
    for (const b of ARM_LENGTHS)
      for (const c of ARM_LENGTHS)
        for (const d of ARM_LENGTHS) if (a + b + c + d - (ARMS - 1) === CUBES) out.push([a, b, c, d]);
  return out;
})();

export interface Figure {
  /** cube positions in path order */
  cubes: P3[];
  /** cube indices of each arm (a corner cube is listed in both of its arms) */
  arms: number[][];
  /** each arm's direction (a unit lattice vector) */
  dirs: P3[];
  lengths: number[];
}

const key = (p: readonly number[]) => `${p[0]},${p[1]},${p[2]}`;
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** lay the arms out as a path from the origin */
export function buildFigure(lengths: readonly number[], dirs: readonly P3[]): Figure {
  const cubes: P3[] = [[0, 0, 0]];
  const arms: number[][] = [];
  for (let a = 0; a < lengths.length; a++) {
    const arm = [cubes.length - 1];
    for (let s = 1; s < lengths[a]; s++) {
      const last = cubes[cubes.length - 1];
      const d = dirs[a];
      cubes.push([last[0] + d[0], last[1] + d[1], last[2] + d[2]]);
      arm.push(cubes.length - 1);
    }
    arms.push(arm);
  }
  return { cubes, arms, dirs: dirs.map((d) => [d[0], d[1], d[2]] as P3), lengths: lengths.slice() };
}

/* ---------- acceptance rules 1–3 (shape) ---------- */

/** consecutive arms are perpendicular unit lattice vectors (the "right-angle bend") */
export function bendsAreRightAngles(f: Figure): boolean {
  for (const d of f.dirs) if (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) !== 1) return false;
  for (let a = 1; a < f.dirs.length; a++) if (dot(f.dirs[a], f.dirs[a - 1]) !== 0) return false;
  return true;
}

/** no cube occupies another's cell */
export function isSelfAvoiding(cubes: readonly P3[]): boolean {
  return new Set(cubes.map(key)).size === cubes.length;
}

/** rule 1: the figure extends along all three axes (at least two cubes deep on each) */
export function spansThreeAxes(cubes: readonly P3[]): boolean {
  for (let k = 0; k < 3; k++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of cubes) {
      lo = Math.min(lo, c[k]);
      hi = Math.max(hi, c[k]);
    }
    if (hi - lo < 1) return false;
  }
  return true;
}

/** rule 2: no two non-consecutive arms share a cell or touch face to face */
export function nonConsecutiveArmsApart(f: Figure): boolean {
  for (let a = 0; a < f.arms.length; a++)
    for (let b = a + 2; b < f.arms.length; b++)
      for (const i of f.arms[a])
        for (const j of f.arms[b]) {
          const p = f.cubes[i];
          const q = f.cubes[j];
          const manhattan = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
          if (manhattan <= 1) return false;
        }
  return true;
}

/** the 24 proper rotations of the cube: signed permutation matrices with determinant +1 */
export const ROTATIONS: readonly ((p: readonly number[]) => P3)[] = (() => {
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ];
  const parity = [1, -1, -1, 1, 1, -1];
  const out: ((p: readonly number[]) => P3)[] = [];
  perms.forEach((perm, pi) => {
    for (const sx of [1, -1])
      for (const sy of [1, -1])
        for (const sz of [1, -1]) {
          if (parity[pi] * sx * sy * sz !== 1) continue;
          out.push((p) => [sx * p[perm[0]], sy * p[perm[1]], sz * p[perm[2]]]);
        }
  });
  return out;
})();

/** the reflection used for every mirror twin: x → −x */
export function mirrorCubes(cubes: readonly P3[]): P3[] {
  return cubes.map((c) => [-c[0], c[1], c[2]] as P3);
}

/** a translation-invariant fingerprint of a cube SET (path order ignored) */
export function shapeKey(cubes: readonly P3[]): string {
  const lo = [0, 1, 2].map((k) => Math.min(...cubes.map((c) => c[k])));
  return cubes
    .map((c) => [c[0] - lo[0], c[1] - lo[1], c[2] - lo[2]])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    .map(key)
    .join(';');
}

/** rule 3: the mirror image matches none of the 24 proper rotations */
export function isChiral(cubes: readonly P3[]): boolean {
  const mirrored = shapeKey(mirrorCubes(cubes));
  for (const rot of ROTATIONS) if (shapeKey(cubes.map(rot)) === mirrored) return false;
  return true;
}

/** rules 1–3 plus the path's own construction rules */
export function shapeIsAcceptable(f: Figure): boolean {
  return (
    f.cubes.length === CUBES &&
    f.arms.length === ARMS &&
    f.lengths.every((l) => ARM_LENGTHS.includes(l)) &&
    bendsAreRightAngles(f) &&
    isSelfAvoiding(f.cubes) &&
    nonConsecutiveArmsApart(f) &&
    spansThreeAxes(f.cubes) &&
    isChiral(f.cubes)
  );
}

/* ---------- projection ---------- */

export interface Face {
  /** the projected quad, x0 y0 x1 y1 … in cube-edge units, screen y pointing DOWN */
  pts: number[];
  /** 0 top, 1 left-facing side, 2 right-facing side — the three flat tones */
  tone: 0 | 1 | 2;
  /** screen-x component of a side face's normal (−1…1) — lets an animation blend the two side tones */
  lx: number;
  /** index of the cube it belongs to */
  cube: number;
}

export interface View {
  /** visible faces, back to front (painter's order) */
  faces: Face[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Project a figure turned by `yawDeg` about the vertical axis through an
 * orthographic camera `elevDeg` above the horizon. World: x right, y up,
 * z toward the viewer. Screen x = x′; screen y (down) = −(y·cos e − z′·sin e);
 * depth toward the camera = y·sin e + z′·cos e.
 */
export function project(cubes: readonly P3[], yawDeg: number, elevDeg: number = ELEVATION): View {
  const a = (yawDeg * Math.PI) / 180;
  const e = (elevDeg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const ce = Math.cos(e);
  const se = Math.sin(e);
  const occupied = new Set(cubes.map(key));
  const toScreen = (x: number, y: number, z: number): [number, number] => {
    const xr = x * ca + z * sa;
    const zr = -x * sa + z * ca;
    return [xr, -(y * ce - zr * se)];
  };
  const depth = (c: readonly number[]) => c[1] * se + (-c[0] * sa + c[2] * ca) * ce;
  const order = cubes.map((c, i) => ({ i, d: depth(c) })).sort((p, q) => p.d - q.d || p.i - q.i);

  const faces: Face[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { i } of order) {
    const c = cubes[i];
    for (const n of DIRS) {
      if (occupied.has(key([c[0] + n[0], c[1] + n[1], c[2] + n[2]]))) continue; // shared with a neighbour
      const nx = n[0] * ca + n[2] * sa;
      const nz = -n[0] * sa + n[2] * ca;
      const ny = n[1];
      let tone: 0 | 1 | 2;
      if (ny > 0) tone = 0;
      else if (ny < 0 || nz <= 1e-6) continue; // bottom faces and faces turned away (or edge-on)
      else tone = nx < 0 ? 1 : 2;
      // the face's two tangent axes, corners in cyclic order
      const k = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2;
      const u = (k + 1) % 3;
      const w = (k + 2) % 3;
      const pts: number[] = [];
      for (const [su, sw] of [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5]
      ]) {
        const p = [c[0] + n[0] * 0.5, c[1] + n[1] * 0.5, c[2] + n[2] * 0.5];
        p[u] += su;
        p[w] += sw;
        const [sx, sy] = toScreen(p[0], p[1], p[2]);
        pts.push(sx, sy);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
      faces.push({ pts, tone, lx: ny > 0 ? 0 : nx, cube: i });
    }
  }
  return { faces, minX, minY, maxX, maxY };
}

/** the larger side of a view's bounding box, in cube edges */
export function viewExtent(v: View): number {
  return Math.max(v.maxX - v.minX, v.maxY - v.minY);
}

/* ---------- acceptance rule 4 (visibility) ---------- */

function quadArea(pts: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    s += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  return s / 2;
}

/**
 * Rasterise a view in painter's order and return, per face, how many raster
 * cells it covers on its own (`full`) and how many stay on top (`shown`).
 * Pixel centres are tested against each (convex) quad.
 */
export function rasterFaces(v: View, raster: number = RASTER): { full: number[]; shown: number[]; ids: Int16Array; w: number; h: number } {
  const ox = v.minX - 0.5 / raster;
  const oy = v.minY - 0.5 / raster;
  const w = Math.ceil((v.maxX - v.minX) * raster) + 2;
  const h = Math.ceil((v.maxY - v.minY) * raster) + 2;
  const ids = new Int16Array(w * h).fill(-1);
  const full = new Array<number>(v.faces.length).fill(0);
  v.faces.forEach((f, fi) => {
    const p = f.pts;
    const sign = quadArea(p) >= 0 ? 1 : -1;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < 4; i++) {
      x0 = Math.min(x0, p[2 * i]);
      x1 = Math.max(x1, p[2 * i]);
      y0 = Math.min(y0, p[2 * i + 1]);
      y1 = Math.max(y1, p[2 * i + 1]);
    }
    const px0 = Math.max(0, Math.floor((x0 - ox) * raster));
    const px1 = Math.min(w - 1, Math.ceil((x1 - ox) * raster));
    const py0 = Math.max(0, Math.floor((y0 - oy) * raster));
    const py1 = Math.min(h - 1, Math.ceil((y1 - oy) * raster));
    for (let py = py0; py <= py1; py++) {
      const y = oy + (py + 0.5) / raster;
      for (let px = px0; px <= px1; px++) {
        const x = ox + (px + 0.5) / raster;
        let inside = true;
        for (let i = 0; i < 4 && inside; i++) {
          const j = (i + 1) % 4;
          const cross = (p[2 * j] - p[2 * i]) * (y - p[2 * i + 1]) - (p[2 * j + 1] - p[2 * i + 1]) * (x - p[2 * i]);
          if (cross * sign < 0) inside = false;
        }
        if (!inside) continue;
        full[fi]++;
        ids[py * w + px] = fi; // later (nearer) faces overwrite
      }
    }
  });
  const shown = new Array<number>(v.faces.length).fill(0);
  for (let i = 0; i < ids.length; i++) if (ids[i] >= 0) shown[ids[i]]++;
  return { full, shown, ids, w, h };
}

/**
 * Per cube, the best visible share of one of its faces (0 when every face it
 * shows is a sliver or hidden). Rule 4 asks this to be ≥ 0.25 for every cube.
 */
export function cubeVisibility(v: View, cubeCount: number, raster: number = RASTER): number[] {
  const { full, shown } = rasterFaces(v, raster);
  const best = new Array<number>(cubeCount).fill(0);
  const floor = MIN_FACE_AREA * raster * raster;
  v.faces.forEach((f, fi) => {
    if (full[fi] < floor) return;
    best[f.cube] = Math.max(best[f.cube], shown[fi] / full[fi]);
  });
  return best;
}

/** the smallest angle (degrees) between any arm and the camera's line of sight */
export function minSightAngle(dirs: readonly P3[], yawDeg: number, elevDeg: number = ELEVATION): number {
  const a = (yawDeg * Math.PI) / 180;
  const e = (elevDeg * Math.PI) / 180;
  const view = [0, -Math.sin(e), -Math.cos(e)];
  let min = 90;
  for (const d of dirs) {
    const r = [d[0] * Math.cos(a) + d[2] * Math.sin(a), d[1], -d[0] * Math.sin(a) + d[2] * Math.cos(a)];
    const c = Math.min(1, Math.abs(dot(r, view)));
    min = Math.min(min, (Math.acos(c) * 180) / Math.PI);
  }
  return min;
}

/** rule 4 for one view, plus the fit-to-square rule */
export function viewIsReadable(cubes: readonly P3[], dirs: readonly P3[], yawDeg: number, view: View = project(cubes, yawDeg)): boolean {
  if (viewExtent(view) > FIT_UNITS) return false;
  if (minSightAngle(dirs, yawDeg) < MIN_SIGHT_ANGLE) return false;
  return cubeVisibility(view, cubes.length).every((s) => s >= MIN_VISIBLE_FRACTION);
}
