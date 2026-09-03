/**
 * Arrow Crossword ("Scandinavian" / arrowword) engine.
 *
 * The clue lives INSIDE the grid: a clue cell carries up to two short texts,
 * each with an arrow — the `right` answer starts in the cell to its right and
 * reads on until the next clue cell, empty cell or edge; the `down` answer
 * starts in the cell below it. There are no numbers and no clue list.
 *
 * Author format: like Crossword, a puzzle is a list of entries positioned by
 * their FIRST LETTER. The engine derives the rest — the clue cell is the cell
 * one step before the first letter (left of it for `right`, above it for
 * `down`), every cell nobody uses is `empty` (drawn as page background, which
 * is what gives the board its notched silhouette), and one clue cell may host
 * both a `right` and a `down` clue. `validateArrowPuzzle` proves a hand-
 * authored puzzle: crossings agree, every letter run of 2+ is exactly one
 * entry (no accidental words), every answer has its clue and the grid is one
 * connected piece. `npm run validate` runs it on every baked puzzle.
 */

export type Dir = 'right' | 'down';

export interface ArrowEntry {
  answer: string;
  clue: string;
  /** row/col of the FIRST LETTER — the clue cell sits one step before it */
  row: number;
  col: number;
  dir: Dir;
}

export interface ArrowPuzzleDef {
  id: string;
  title: string;
  entries: ArrowEntry[];
}

/** one answer: the clue text, its arrow direction and the cells it fills */
export interface ClueSlot {
  key: string;
  dir: Dir;
  clue: string;
  answer: string;
  /** letter cell indices, in reading order */
  cells: number[];
  /** the clue cell the arrow is drawn in */
  clueCell: number;
}

export type ArrowCell =
  | { kind: 'empty'; idx: number; row: number; col: number }
  | { kind: 'letter'; idx: number; row: number; col: number; letter: string }
  | { kind: 'clue'; idx: number; row: number; col: number; right?: ClueSlot; down?: ClueSlot };

export interface BuiltArrow {
  id: string;
  title: string;
  rows: number;
  cols: number;
  /** row-major */
  grid: ArrowCell[];
  /** reading order: by clue cell, `right` before `down` */
  slots: ClueSlot[];
  /** letter cell idx -> slot key per direction */
  slotAt: Record<number, Partial<Record<Dir, string>>>;
  letterCount: number;
}

/** the longest clue text a cell can hold legibly (see the .ac-clue CSS):
    a cell with ONE clue wraps it over up to four short lines, a cell that
    hosts two clues gives each about two lines — validate enforces both. */
export const CLUE_MAX_SINGLE = 30;
export const CLUE_MAX_DOUBLE = 20;
export const MIN_ANSWER = 3;

/**
 * How a clue wraps inside its cell, simulated. The print scales with the
 * cell (font = cell × 0.175, or 0.15 in a shared cell, floored at 6px at the
 * 34px cell floor), so the number of characters a line holds is roughly the
 * same on every tier — about 9 average characters — and the cell's height
 * fixes the line count: four lines when the cell has one clue, two per
 * half when it has two. A budget of 8 per line keeps wide letters safe.
 * Words wider than a line break mid-word (`overflow-wrap: anywhere`).
 */
export const CLUE_LINE_CHARS = 8;
export const CLUE_LINES_SINGLE = 4;
export const CLUE_LINES_DOUBLE = 2;

/** the pieces a line can break between: words, and the halves of a
    hyphenated word (the hyphen stays with the first half, as CSS breaks) */
export function clueSegments(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(' ')) {
    if (!word) continue;
    const parts = word.split('-');
    parts.forEach((part, i) => out.push(i < parts.length - 1 ? part + '-' : part));
  }
  return out.filter((p) => p.length > 0);
}

/** lines a clue wraps to; a segment longer than a line returns Infinity —
    it would break mid-word, which a printed clue must never do */
export function clueLines(text: string, perLine: number = CLUE_LINE_CHARS): number {
  let lines = 1;
  let used = 0;
  for (const seg of clueSegments(text)) {
    if (seg.length > perLine) return Infinity;
    const sep = used > 0 ? 1 : 0;
    if (used + sep + seg.length <= perLine) {
      used += sep + seg.length;
    } else {
      lines++;
      used = seg.length;
    }
  }
  return lines;
}

export function buildArrowPuzzle(def: ArrowPuzzleDef): BuiltArrow {
  let rows = 0;
  let cols = 0;
  for (const e of def.entries) {
    const word = e.answer.toUpperCase();
    if (!/^[A-Z]+$/.test(word)) throw new Error(`${def.id}: answer "${e.answer}" must be letters A–Z`);
    if (word.length < MIN_ANSWER) throw new Error(`${def.id}: answer "${word}" is shorter than ${MIN_ANSWER} letters`);
    if (e.dir === 'right' && e.col < 1) throw new Error(`${def.id}: ${word} needs a clue cell left of column ${e.col}`);
    if (e.dir === 'down' && e.row < 1) throw new Error(`${def.id}: ${word} needs a clue cell above row ${e.row}`);
    if (e.row < 0 || e.col < 0) throw new Error(`${def.id}: ${word} starts off the grid`);
    rows = Math.max(rows, e.dir === 'down' ? e.row + word.length : e.row + 1);
    cols = Math.max(cols, e.dir === 'right' ? e.col + word.length : e.col + 1);
  }

  const letters: (string | null)[] = new Array(rows * cols).fill(null);
  for (const e of def.entries) {
    const word = e.answer.toUpperCase();
    for (let k = 0; k < word.length; k++) {
      const r = e.dir === 'down' ? e.row + k : e.row;
      const c = e.dir === 'right' ? e.col + k : e.col;
      const idx = r * cols + c;
      if (letters[idx] !== null && letters[idx] !== word[k]) {
        throw new Error(`${def.id}: conflict at (${r},${c}): "${letters[idx]}" vs "${word[k]}" from ${word}`);
      }
      letters[idx] = word[k];
    }
  }

  const clueCells = new Map<number, { right?: ClueSlot; down?: ClueSlot }>();
  const slots: ClueSlot[] = [];
  const slotAt: BuiltArrow['slotAt'] = {};
  for (const e of def.entries) {
    const word = e.answer.toUpperCase();
    const cr = e.dir === 'down' ? e.row - 1 : e.row;
    const cc = e.dir === 'right' ? e.col - 1 : e.col;
    const clueIdx = cr * cols + cc;
    if (letters[clueIdx] !== null) {
      throw new Error(`${def.id}: the clue cell of ${word} at (${cr},${cc}) is a letter cell`);
    }
    const host = clueCells.get(clueIdx) ?? {};
    if (host[e.dir]) {
      throw new Error(`${def.id}: clue cell (${cr},${cc}) already has a ${e.dir} clue (${host[e.dir]!.answer})`);
    }
    const cells: number[] = [];
    for (let k = 0; k < word.length; k++) {
      const r = e.dir === 'down' ? e.row + k : e.row;
      const c = e.dir === 'right' ? e.col + k : e.col;
      cells.push(r * cols + c);
    }
    const slot: ClueSlot = {
      key: `${clueIdx}-${e.dir}`,
      dir: e.dir,
      clue: e.clue,
      answer: word,
      cells,
      clueCell: clueIdx
    };
    host[e.dir] = slot;
    clueCells.set(clueIdx, host);
    slots.push(slot);
    for (const ci of cells) (slotAt[ci] ??= {})[e.dir] = slot.key;
  }
  slots.sort((a, b) => (a.clueCell === b.clueCell ? (a.dir === 'right' ? -1 : 1) : a.clueCell - b.clueCell));

  const grid: ArrowCell[] = [];
  let letterCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const host = clueCells.get(idx);
      if (host) grid.push({ kind: 'clue', idx, row: r, col: c, ...host });
      else if (letters[idx] !== null) {
        letterCount++;
        grid.push({ kind: 'letter', idx, row: r, col: c, letter: letters[idx]! });
      } else grid.push({ kind: 'empty', idx, row: r, col: c });
    }
  }
  return { id: def.id, title: def.title, rows, cols, grid, slots, slotAt, letterCount };
}

/**
 * Proves a hand-authored puzzle (run by `npm run validate`): it must build,
 * every maximal run of 2+ letters must be exactly one entry (so no
 * accidental words and no answer without its arrow), every answer is unique,
 * every clue fits its cell, and the letters form one connected grid.
 */
export function validateArrowPuzzle(def: ArrowPuzzleDef): string[] {
  const errors: string[] = [];
  let built: BuiltArrow;
  try {
    built = buildArrowPuzzle(def);
  } catch (e) {
    return [(e as Error).message];
  }
  const { rows, cols, grid } = built;
  const has = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && grid[r * cols + c].kind === 'letter';

  let runs = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!has(r, c)) continue;
      if (!has(r, c - 1) && has(r, c + 1)) {
        let len = 0;
        while (has(r, c + len)) len++;
        runs++;
        const match = def.entries.find(
          (e) => e.dir === 'right' && e.row === r && e.col === c && e.answer.length === len
        );
        if (!match) errors.push(`${def.id}: right run of ${len} at (${r},${c}) has no matching entry`);
      }
      if (!has(r - 1, c) && has(r + 1, c)) {
        let len = 0;
        while (has(r + len, c)) len++;
        runs++;
        const match = def.entries.find(
          (e) => e.dir === 'down' && e.row === r && e.col === c && e.answer.length === len
        );
        if (!match) errors.push(`${def.id}: down run of ${len} at (${r},${c}) has no matching entry`);
      }
    }
  }
  if (runs !== def.entries.length) {
    errors.push(`${def.id}: ${def.entries.length} entries but ${runs} letter runs`);
  }

  const seen = new Set<string>();
  for (const e of def.entries) {
    const w = e.answer.toUpperCase();
    if (seen.has(w)) errors.push(`${def.id}: ${w} appears twice`);
    seen.add(w);
    if (e.clue.trim() !== e.clue || e.clue.length === 0) errors.push(`${def.id}: ${w} has an empty or untrimmed clue`);
  }
  for (const cell of grid) {
    if (cell.kind !== 'clue') continue;
    const both = cell.right && cell.down;
    const cap = both ? CLUE_MAX_DOUBLE : CLUE_MAX_SINGLE;
    const lines = both ? CLUE_LINES_DOUBLE : CLUE_LINES_SINGLE;
    for (const slot of [cell.right, cell.down]) {
      if (!slot) continue;
      if (slot.clue.length > cap) {
        errors.push(
          `${def.id}: clue for ${slot.answer} is ${slot.clue.length} chars, over the ${both ? 'shared' : 'single'}-cell cap of ${cap}`
        );
      } else if (clueLines(slot.clue) > lines) {
        errors.push(
          `${def.id}: clue for ${slot.answer} "${slot.clue}" wraps to ${clueLines(slot.clue)} lines, a ${both ? 'shared' : 'single'} cell holds ${lines}`
        );
      }
    }
  }

  // one connected grid: walk letters through 4-neighbour letter adjacency
  const first = grid.find((c) => c.kind === 'letter');
  if (first) {
    const stack = [first.idx];
    const visited = new Set<number>(stack);
    while (stack.length) {
      const idx = stack.pop()!;
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        if (!has(r + dr, c + dc)) continue;
        const n = (r + dr) * cols + (c + dc);
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      }
    }
    if (visited.size !== built.letterCount) {
      errors.push(`${def.id}: the grid is not one connected piece (${visited.size}/${built.letterCount} letters reachable)`);
    }
  }
  return errors;
}

/** letters that belong to only ONE answer (nothing checks them) — a quality
    number for validate and the offline builder, not a rule of the game */
export function uncheckedLetters(built: BuiltArrow): number {
  let n = 0;
  for (const cell of built.grid) {
    if (cell.kind !== 'letter') continue;
    const at = built.slotAt[cell.idx] ?? {};
    if (!(at.right && at.down)) n++;
  }
  return n;
}

/** empty cells fully enclosed by the puzzle (holes, as opposed to the notches
    on the silhouette that open onto the page) */
export function enclosedHoles(built: BuiltArrow): number {
  const { rows, cols, grid } = built;
  const outside = new Set<number>();
  const stack: number[] = [];
  const push = (idx: number) => {
    if (grid[idx].kind === 'empty' && !outside.has(idx)) {
      outside.add(idx);
      stack.push(idx);
    }
  };
  for (let r = 0; r < rows; r++) {
    push(r * cols);
    push(r * cols + cols - 1);
  }
  for (let c = 0; c < cols; c++) {
    push(c);
    push((rows - 1) * cols + c);
  }
  while (stack.length) {
    const idx = stack.pop()!;
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    if (r > 0) push(idx - cols);
    if (r < rows - 1) push(idx + cols);
    if (c > 0) push(idx - 1);
    if (c < cols - 1) push(idx + 1);
  }
  return grid.filter((cell) => cell.kind === 'empty' && !outside.has(cell.idx)).length;
}
