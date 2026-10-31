import { RAY_COUNT, type AttrId, type Cell, type Item, type Layout, type RuleSpec } from './model';
import { stepOf } from './rules';

/**
 * Words for the matrices — the practice feedback ("why was that the
 * answer?") and the screen-reader labels. Pure strings, no DOM.
 */

export const ATTR_NAME: Record<AttrId, string> = {
  shape: 'Shape',
  size: 'Size',
  shade: 'Shade',
  orient: 'Rotation',
  number: 'Count',
  position: 'Position',
  rays: 'Rays'
};

const SHAPES = ['triangle', 'square', 'pentagon', 'hexagon', 'circle'];
const SIZES = ['tiny', 'small', 'medium', 'large', 'full-size'];
/** ink-based words — 'light' and 'dark' would swap meaning between the light and dark themes */
const SHADES = ['outlined', 'lightly shaded', 'half-shaded', 'heavily shaded', 'solid'];
const POSITIONS = ['top left', 'top', 'top right', 'left', 'centre', 'right', 'bottom left', 'bottom', 'bottom right'];

function change(attr: AttrId, k: number): string {
  const up = k > 0;
  const n = Math.abs(k);
  switch (attr) {
    case 'size':
      return up ? 'grows one step' : 'shrinks one step';
    case 'shade':
      return up ? 'fills in one step' : 'fades one step';
    case 'shape':
      return up ? 'gains a side' : 'loses a side';
    case 'number':
      return up ? 'adds one copy' : 'drops one copy';
    case 'orient':
      return `turns ${n * 45}° ${up ? 'clockwise' : 'anticlockwise'}`;
    default:
      return 'changes one step';
  }
}

/** one sentence per rule of an item, from its visible grid */
export function explainRule(rule: RuleSpec, cells: readonly Cell[]): string {
  const name = ATTR_NAME[rule.attr];
  const g = cells.map((c) => c[rule.attr]);
  switch (rule.kind) {
    case 'row':
      return `${name} stays the same across each row.`;
    case 'col':
      return `${name} stays the same down each column.`;
    case 'prog-r':
      return `${name} ${change(rule.attr, stepOf(rule.attr, g[0], g[1]))} along each row.`;
    case 'prog-c':
      return `${name} ${change(rule.attr, stepOf(rule.attr, g[0], g[3]))} down each column.`;
    case 'diag-a':
      return `${name}: every row and column holds the same three — they repeat along the diagonals running down to the right.`;
    case 'diag-b':
      return `${name}: every row and column holds the same three — they repeat along the diagonals running down to the left.`;
    case 'out':
      return `${name} ${change(rule.attr, stepOf(rule.attr, g[0], g[1]))} with each ring outward from the top-left corner.`;
    case 'add':
      return 'Rays: the third picture puts the first two together.';
    case 'sub':
      return 'Rays: the third picture is the first with the second one’s rays taken away.';
    case 'xor':
      return 'Rays: the third keeps only the rays that appear in exactly one of the first two.';
    case 'and':
      return 'Rays: the third keeps only the rays the first two share.';
  }
}

/** the practice explanation: each rule, then "everything else stays the same" */
export function explainItem(item: Pick<Item, 'rules' | 'cells'>): string[] {
  return [...item.rules.map((r) => explainRule(r, item.cells)), 'Everything else stays the same.'];
}

function raysWords(mask: number): string {
  const hours: string[] = [];
  for (let i = 0; i < RAY_COUNT; i++) if (mask & (1 << i)) hours.push(String(i === 0 ? 12 : i * 2));
  return hours.length ? `rays at ${hours.join(', ')} o’clock` : 'no rays';
}

/** a short screen-reader description of one cell */
export function describeCell(cell: Cell, layout: Layout): string {
  const shape = SHAPES[cell.shape];
  const shade = SHADES[cell.shade];
  const turn = cell.orient ? `, turned ${cell.orient * 45}°` : '';
  switch (layout) {
    case 'single':
      return `${SIZES[cell.size]} ${shade} ${shape}${turn}`;
    case 'number':
      return `${cell.number + 1} × ${shade} ${shape}${turn}`;
    case 'position':
      return `${shade} ${shape} at ${POSITIONS[cell.position]}${turn}`;
    case 'logic':
      return `${shade} ${shape}${turn}, ${raysWords(cell.rays)}`;
  }
}
