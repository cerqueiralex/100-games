import { NEUTRAL, type AttrId, type Cell, type Layout, type RuleSpec } from './model';

/**
 * Hand-built matrices for teaching — the first-run tutorial's five worked
 * examples (one per rule family, §1.8 "Flow") and the animated demo. Fixed
 * content, never scored: the scored items always come from the generator.
 */

export interface WorkedExample {
  family: string;
  title: string;
  body: string;
  layout: Layout;
  rules: RuleSpec[];
  cells: Cell[];
  /** what the tutorial animation sweeps across while it explains */
  sweep: 'rows' | 'cols' | 'diag' | 'rings';
}

const grid = (fn: (r: number, c: number) => number): number[] =>
  Array.from({ length: 9 }, (_, i) => fn(Math.floor(i / 3), i % 3));

function cellsOf(base: Partial<Cell>, grids: Partial<Record<AttrId, number[]>>): Cell[] {
  return Array.from({ length: 9 }, (_, i) => {
    const cell: Cell = { ...NEUTRAL, ...base };
    for (const [a, g] of Object.entries(grids) as [AttrId, number[]][]) cell[a] = g[i];
    return cell;
  });
}

const rows = (r0: number[], r1: number[], r2: number[]) => [...r0, ...r1, ...r2];

export const WORKED_EXAMPLES: readonly WorkedExample[] = [
  {
    family: 'Constant',
    title: 'Same along a row',
    body: 'Something stays the same across each row — here, the shape. (It can also stay the same down each column.)',
    layout: 'single',
    rules: [{ attr: 'shape', kind: 'row' }],
    cells: cellsOf({ size: 3, shade: 2 }, { shape: grid((r) => [0, 3, 1][r]) }),
    sweep: 'rows'
  },
  {
    family: 'Progression',
    title: 'Step by step',
    body: 'Something changes by the same step each time — here, the size grows. Steps can also run down columns, or outward from the top-left corner.',
    layout: 'single',
    rules: [{ attr: 'size', kind: 'prog-r' }],
    cells: cellsOf({ shape: 4, shade: 3 }, { size: grid((r, c) => [0, 2, 1][r] + c) }),
    sweep: 'rows'
  },
  {
    family: 'Distribution of three',
    title: 'Three values, once each',
    body: 'Every row and column holds the same three shades, in a new order — so each one repeats along a diagonal.',
    layout: 'single',
    rules: [{ attr: 'shade', kind: 'diag-a' }],
    cells: cellsOf({ shape: 1, size: 3 }, { shade: grid((r, c) => [1, 2, 4][(((c - r) % 3) + 3) % 3]) }),
    sweep: 'diag'
  },
  {
    family: 'Addition and subtraction',
    title: 'Add or take away',
    body: 'The third picture in each row puts the first two together. (Or the second is taken away from the first.)',
    layout: 'logic',
    rules: [{ attr: 'rays', kind: 'add' }],
    cells: cellsOf({ shape: 4, shade: 2 }, { rays: rows([3, 8, 11], [20, 48, 52], [10, 32, 42]) }),
    sweep: 'rows'
  },
  {
    family: 'Distribution of two',
    title: 'Keep the differences',
    body: 'The third keeps only the rays that appear in exactly one of the first two. (Or only the ones they share.)',
    layout: 'logic',
    rules: [{ attr: 'rays', kind: 'xor' }],
    cells: cellsOf({ shape: 1, shade: 1 }, { rays: rows([7, 14, 9], [24, 48, 40], [33, 5, 36]) }),
    sweep: 'rows'
  }
];

/** the demo's matrix: shape constant in each row, size growing along it */
export const DEMO_CELLS: Cell[] = cellsOf(
  { shade: 3 },
  {
    shape: grid((r) => [0, 3, 1][r]),
    size: grid((r, c) => [0, 2, 1][r] + c)
  }
);

/** the demo's answer set: all 2³ combinations of shape / size / shade, the correct one in slot 5 */
export const DEMO_ANSWER = 5;
export const DEMO_OPTIONS: Cell[] = (() => {
  const ans = DEMO_CELLS[8];
  const wrong = { shape: 3, size: 1, shade: 2 } as const;
  const combo = (m: number): Cell => ({
    ...ans,
    shape: m & 1 ? wrong.shape : ans.shape,
    size: m & 2 ? wrong.size : ans.size,
    shade: m & 4 ? wrong.shade : ans.shade
  });
  return [3, 4, 1, 6, 2, 0, 7, 5].map(combo);
})();
