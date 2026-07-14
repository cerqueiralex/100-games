/**
 * Count & Compare — pure scene + question generation and the answer verifier.
 *
 * Design contract (validated by scripts/validate.ts):
 *  - `makeScene(cfg, rng)` scatters exactly `cfg.count` shapes, colors/kinds
 *    drawn uniformly from the tier palettes.
 *  - `makeQuestion(scene, qcfg, rng)` returns a question whose `answerIndex`
 *    equals `answer(scene, q)`, or `null` when it cannot form a well-defined
 *    question (only happens for a strict "more A or B?" when every present
 *    pair ties — the caller then regenerates the scene).
 *  - Strict comparison questions NEVER tie: `makeRound` regenerates the scene
 *    until a differing pair exists (and falls back to a total-count question,
 *    which is always well-defined). We therefore do NOT offer an "equal"
 *    option — every comparison has a strict winner.
 */

import type {
  ColorKey,
  ShapeKind,
  Scene,
  PlacedShape,
  Question,
  QuestionType
} from './types';
import { COLOR_LABEL, SHAPE_LABEL, SHAPE_PLURAL } from './types';
import type { Rng } from './rng';
import { pick, shuffle } from './rng';
import type { TierConfig } from './config';
import { tierColors, tierShapes, shapesForRound, flashMsForRound } from './config';

export interface SceneConfig {
  count: number;
  colors: ColorKey[];
  shapes: ShapeKind[];
}

export interface QuestionConfig {
  types: QuestionType[];
  optionCount: number;
}

export interface Round {
  round: number;
  scene: Scene;
  question: Question;
  flashMs: number;
  answerMs: number;
}

/* ------------------------------- counting ------------------------------- */

export const countColor = (s: Scene, c: ColorKey): number =>
  s.shapes.reduce((n, x) => (x.color === c ? n + 1 : n), 0);
export const countShape = (s: Scene, k: ShapeKind): number =>
  s.shapes.reduce((n, x) => (x.kind === k ? n + 1 : n), 0);
export const countBoth = (s: Scene, c: ColorKey, k: ShapeKind): number =>
  s.shapes.reduce((n, x) => (x.color === c && x.kind === k ? n + 1 : n), 0);

const presentColors = (s: Scene): ColorKey[] => [...new Set(s.shapes.map((x) => x.color))];
const presentShapes = (s: Scene): ShapeKind[] => [...new Set(s.shapes.map((x) => x.kind))];

/* -------------------------------- scene --------------------------------- */

/** base diameter (% of stage) shrinks as the shape count grows so a busy
 *  scene still fits without heavy overlap */
export function diameterForCount(count: number): number {
  return Math.max(9, Math.min(22, Math.round(27 - count * 0.72)));
}

export function makeScene(cfg: SceneConfig, rng: Rng): Scene {
  const d0 = diameterForCount(cfg.count);
  const margin = (d0 * 1.15) / 2 + 2;
  const span = 100 - 2 * margin;
  const shapes: PlacedShape[] = [];

  for (let i = 0; i < cfg.count; i++) {
    const d = d0 * (0.85 + rng() * 0.3);
    let bx = margin + rng() * span;
    let by = margin + rng() * span;
    let bestDist = -1;
    // light Poisson-disc rejection: prefer the roomiest of a few candidates
    for (let a = 0; a < 32; a++) {
      const x = margin + rng() * span;
      const y = margin + rng() * span;
      let md = Infinity;
      for (const s of shapes) md = Math.min(md, Math.hypot(s.x - x, s.y - y));
      if (md >= d * 0.9) {
        bx = x;
        by = y;
        bestDist = md;
        break;
      }
      if (md > bestDist) {
        bestDist = md;
        bx = x;
        by = y;
      }
    }
    shapes.push({
      kind: pick(cfg.shapes, rng),
      color: pick(cfg.colors, rng),
      x: bx,
      y: by,
      d,
      rot: Math.floor(rng() * 360)
    });
  }
  return { shapes };
}

/* ------------------------------ questions ------------------------------- */

/** build `k` distinct non-negative integer choices around the true value `t`
 *  (always including `t`), shuffled and stringified */
function numOptions(t: number, k: number, rng: Rng): string[] {
  const set = new Set<number>([t]);
  let guard = 0;
  while (set.size < k && guard < 300) {
    const delta = (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 3));
    const cand = t + delta;
    if (cand >= 0) set.add(cand);
    guard++;
  }
  // guarantee we always reach k distinct values even for tiny t
  let v = 0;
  while (set.size < k) {
    if (!set.has(v)) set.add(v);
    v++;
  }
  return shuffle([...set], rng).map(String);
}

function compareColorQ(scene: Scene, rng: Rng): Question | null {
  const colors = presentColors(scene);
  const pairs: [ColorKey, ColorKey][] = [];
  for (let i = 0; i < colors.length; i++)
    for (let j = i + 1; j < colors.length; j++)
      if (countColor(scene, colors[i]) !== countColor(scene, colors[j]))
        pairs.push([colors[i], colors[j]]);
  if (pairs.length === 0) return null;
  const [p, q] = pick(pairs, rng);
  const [colorA, colorB] = rng() < 0.5 ? [p, q] : [q, p];
  const options = [COLOR_LABEL[colorA], COLOR_LABEL[colorB]];
  const answerIndex = countColor(scene, colorA) > countColor(scene, colorB) ? 0 : 1;
  return {
    type: 'compare-color',
    prompt: `More ${COLOR_LABEL[colorA].toLowerCase()} or ${COLOR_LABEL[colorB].toLowerCase()}?`,
    options,
    answerIndex,
    colorA,
    colorB
  };
}

function compareShapeQ(scene: Scene, rng: Rng): Question | null {
  const kinds = presentShapes(scene);
  const pairs: [ShapeKind, ShapeKind][] = [];
  for (let i = 0; i < kinds.length; i++)
    for (let j = i + 1; j < kinds.length; j++)
      if (countShape(scene, kinds[i]) !== countShape(scene, kinds[j]))
        pairs.push([kinds[i], kinds[j]]);
  if (pairs.length === 0) return null;
  const [p, q] = pick(pairs, rng);
  const [shapeA, shapeB] = rng() < 0.5 ? [p, q] : [q, p];
  const options = [SHAPE_LABEL[shapeA], SHAPE_LABEL[shapeB]];
  const answerIndex = countShape(scene, shapeA) > countShape(scene, shapeB) ? 0 : 1;
  return {
    type: 'compare-shape',
    prompt: `More ${SHAPE_PLURAL[shapeA]} or ${SHAPE_PLURAL[shapeB]}?`,
    options,
    answerIndex,
    shapeA,
    shapeB
  };
}

function countShapeQ(scene: Scene, k: number, rng: Rng): Question | null {
  const kinds = presentShapes(scene);
  if (kinds.length === 0) return null;
  const shape = pick(kinds, rng);
  const t = countShape(scene, shape);
  const options = numOptions(t, k, rng);
  return {
    type: 'count-shape',
    prompt: `How many ${SHAPE_PLURAL[shape]}?`,
    options,
    answerIndex: options.indexOf(String(t)),
    shape
  };
}

function countColorQ(scene: Scene, k: number, rng: Rng): Question | null {
  const colors = presentColors(scene);
  if (colors.length === 0) return null;
  const color = pick(colors, rng);
  const t = countColor(scene, color);
  const options = numOptions(t, k, rng);
  return {
    type: 'count-color',
    prompt: `How many ${COLOR_LABEL[color].toLowerCase()} shapes?`,
    options,
    answerIndex: options.indexOf(String(t)),
    color
  };
}

function countTotalQ(scene: Scene, k: number, rng: Rng): Question {
  const t = scene.shapes.length;
  const options = numOptions(t, k, rng);
  return {
    type: 'count-total',
    prompt: 'How many shapes in total?',
    options,
    answerIndex: options.indexOf(String(t))
  };
}

function parityQ(scene: Scene, rng: Rng): Question | null {
  // only ask about an attribute present at least twice, so it reads as a real
  // odd/even judgement rather than "is there one or none"
  const shapeCands = presentShapes(scene).filter((k) => countShape(scene, k) >= 2);
  const colorCands = presentColors(scene).filter((c) => countColor(scene, c) >= 2);
  const useShape = shapeCands.length > 0 && (colorCands.length === 0 || rng() < 0.5);
  const options = shuffle(['Odd', 'Even'], rng);
  if (useShape) {
    const shape = pick(shapeCands, rng);
    const t = countShape(scene, shape);
    return {
      type: 'parity',
      prompt: `Odd or even number of ${SHAPE_PLURAL[shape]}?`,
      options,
      answerIndex: options.indexOf(t % 2 === 0 ? 'Even' : 'Odd'),
      shape
    };
  }
  if (colorCands.length > 0) {
    const color = pick(colorCands, rng);
    const t = countColor(scene, color);
    return {
      type: 'parity',
      prompt: `Odd or even number of ${COLOR_LABEL[color].toLowerCase()} shapes?`,
      options,
      answerIndex: options.indexOf(t % 2 === 0 ? 'Even' : 'Odd'),
      color
    };
  }
  return null;
}

function countTwoQ(scene: Scene, k: number, rng: Rng): Question | null {
  // prefer a combo that actually appears, so the answer is a fair recall
  const combos: [ColorKey, ShapeKind][] = [];
  for (const c of presentColors(scene))
    for (const s of presentShapes(scene)) if (countBoth(scene, c, s) >= 1) combos.push([c, s]);
  if (combos.length === 0) return null;
  const [color, shape] = pick(combos, rng);
  const t = countBoth(scene, color, shape);
  const options = numOptions(t, k, rng);
  return {
    type: 'count-two-attr',
    prompt: `How many ${COLOR_LABEL[color].toLowerCase()} ${SHAPE_PLURAL[shape]}?`,
    options,
    answerIndex: options.indexOf(String(t)),
    color,
    shape
  };
}

export function makeQuestion(scene: Scene, qcfg: QuestionConfig, rng: Rng): Question | null {
  const type = pick(qcfg.types, rng);
  switch (type) {
    case 'compare-color':
      return compareColorQ(scene, rng);
    case 'compare-shape':
      return compareShapeQ(scene, rng);
    case 'count-shape':
      return countShapeQ(scene, qcfg.optionCount, rng);
    case 'count-color':
      return countColorQ(scene, qcfg.optionCount, rng);
    case 'count-total':
      return countTotalQ(scene, qcfg.optionCount, rng);
    case 'parity':
      return parityQ(scene, rng);
    case 'count-two-attr':
      return countTwoQ(scene, qcfg.optionCount, rng);
  }
}

/* ---------------------------- answer verifier --------------------------- */

/** Recompute the correct option index purely from the scene + question params.
 *  Used both to bake `answerIndex` and to validate soundness headlessly. */
export function answer(scene: Scene, q: Question): number {
  switch (q.type) {
    case 'compare-color':
      return countColor(scene, q.colorA!) > countColor(scene, q.colorB!) ? 0 : 1;
    case 'compare-shape':
      return countShape(scene, q.shapeA!) > countShape(scene, q.shapeB!) ? 0 : 1;
    case 'count-shape':
      return q.options.indexOf(String(countShape(scene, q.shape!)));
    case 'count-color':
      return q.options.indexOf(String(countColor(scene, q.color!)));
    case 'count-total':
      return q.options.indexOf(String(scene.shapes.length));
    case 'count-two-attr':
      return q.options.indexOf(String(countBoth(scene, q.color!, q.shape!)));
    case 'parity': {
      const t = q.shape !== undefined ? countShape(scene, q.shape) : countColor(scene, q.color!);
      return q.options.indexOf(t % 2 === 0 ? 'Even' : 'Odd');
    }
  }
}

/* ------------------------------- one round ------------------------------ */

export function makeRound(
  cfg: TierConfig,
  round: number,
  rng: Rng,
  opts: { narrow?: boolean; longerFlash?: boolean } = {}
): Round {
  const scfg: SceneConfig = {
    count: shapesForRound(cfg, round),
    colors: tierColors(cfg),
    shapes: tierShapes(cfg)
  };
  const qcfg: QuestionConfig = {
    types: opts.narrow ? ['compare-color'] : cfg.types,
    optionCount: cfg.optionCount
  };

  let scene = makeScene(scfg, rng);
  let question = makeQuestion(scene, qcfg, rng);
  for (let a = 0; a < 40 && question === null; a++) {
    scene = makeScene(scfg, rng);
    question = makeQuestion(scene, qcfg, rng);
  }
  if (question === null) {
    // guaranteed-sound fallback (a total count always has a well-defined answer)
    scene = makeScene(scfg, rng);
    question = countTotalQ(scene, cfg.optionCount, rng);
  }

  let flashMs = flashMsForRound(cfg, round);
  if (opts.longerFlash) flashMs = Math.round(flashMs * 1.4);

  let answerMs = cfg.answerMs;
  if (question.type === 'count-two-attr') answerMs += 700;
  else if (question.type.startsWith('count')) answerMs += 350;
  if (opts.longerFlash) answerMs = Math.round(answerMs * 1.15);

  return { round, scene, question, flashMs, answerMs };
}
