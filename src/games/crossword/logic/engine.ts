export type Dir = 'across' | 'down';

export interface CrosswordEntry {
  answer: string;
  clue: string;
  row: number;
  col: number;
  dir: Dir;
}

export interface CrosswordDef {
  id: string;
  title: string;
  entries: CrosswordEntry[];
}

export interface Cell {
  idx: number;
  row: number;
  col: number;
  letter: string; // solution letter
  number: number | null; // clue number if a word starts here
}

export interface Slot {
  key: string; // e.g. "3-across"
  number: number;
  dir: Dir;
  clue: string;
  answer: string;
  cells: number[]; // indices into the cells array (grid order)
}

export interface BuiltPuzzle {
  id: string;
  title: string;
  rows: number;
  cols: number;
  /** row-major grid; null = block (no letter) */
  grid: (Cell | null)[];
  slots: Slot[];
  /** cellIdx -> slot key per direction */
  slotAt: Record<number, Partial<Record<Dir, string>>>;
}

export function buildPuzzle(def: CrosswordDef): BuiltPuzzle {
  let rows = 0;
  let cols = 0;
  for (const e of def.entries) {
    const endRow = e.dir === 'down' ? e.row + e.answer.length : e.row + 1;
    const endCol = e.dir === 'across' ? e.col + e.answer.length : e.col + 1;
    rows = Math.max(rows, endRow);
    cols = Math.max(cols, endCol);
  }

  const letters: (string | null)[] = new Array(rows * cols).fill(null);
  for (const e of def.entries) {
    const word = e.answer.toUpperCase();
    for (let k = 0; k < word.length; k++) {
      const r = e.dir === 'down' ? e.row + k : e.row;
      const c = e.dir === 'across' ? e.col + k : e.col;
      const idx = r * cols + c;
      if (letters[idx] !== null && letters[idx] !== word[k]) {
        throw new Error(
          `${def.id}: conflict at (${r},${c}): "${letters[idx]}" vs "${word[k]}" from ${word}`
        );
      }
      letters[idx] = word[k];
    }
  }

  // standard numbering: scan row-major, number cells that start a word
  const grid: (Cell | null)[] = new Array(rows * cols).fill(null);
  const startNumbers = new Map<number, number>();
  let n = 0;
  const has = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && letters[r * cols + c] !== null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (letters[idx] === null) continue;
      const startsAcross = !has(r, c - 1) && has(r, c + 1);
      const startsDown = !has(r - 1, c) && has(r + 1, c);
      let number: number | null = null;
      if (startsAcross || startsDown) {
        n += 1;
        number = n;
        startNumbers.set(idx, n);
      }
      grid[idx] = { idx, row: r, col: c, letter: letters[idx]!, number };
    }
  }

  const slots: Slot[] = [];
  const slotAt: BuiltPuzzle['slotAt'] = {};
  for (const e of def.entries) {
    const startIdx = e.row * cols + e.col;
    const number = startNumbers.get(startIdx);
    if (number === undefined) {
      throw new Error(`${def.id}: entry ${e.answer} does not start at a numbered cell`);
    }
    const cellIdxs: number[] = [];
    for (let k = 0; k < e.answer.length; k++) {
      const r = e.dir === 'down' ? e.row + k : e.row;
      const c = e.dir === 'across' ? e.col + k : e.col;
      cellIdxs.push(r * cols + c);
    }
    const slot: Slot = {
      key: `${number}-${e.dir}`,
      number,
      dir: e.dir,
      clue: e.clue,
      answer: e.answer.toUpperCase(),
      cells: cellIdxs
    };
    slots.push(slot);
    for (const ci of cellIdxs) {
      (slotAt[ci] ??= {})[e.dir] = slot.key;
    }
  }
  slots.sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === 'across' ? -1 : 1));

  return { id: def.id, title: def.title, rows, cols, grid, slots, slotAt };
}

/**
 * Sanity checks used by `npm run validate` and dev builds: every maximal
 * horizontal/vertical run of 2+ letters must correspond to exactly one entry,
 * so hand-authored puzzles cannot contain accidental words.
 */
export function validatePuzzle(def: CrosswordDef): string[] {
  const errors: string[] = [];
  let built: BuiltPuzzle;
  try {
    built = buildPuzzle(def);
  } catch (e) {
    return [(e as Error).message];
  }
  const { rows, cols, grid } = built;
  const has = (r: number, c: number) =>
    r >= 0 && r < rows && c >= 0 && c < cols && grid[r * cols + c] !== null;

  const runs: { r: number; c: number; dir: Dir; len: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!has(r, c)) continue;
      if (!has(r, c - 1) && has(r, c + 1)) {
        let len = 0;
        while (has(r, c + len)) len++;
        runs.push({ r, c, dir: 'across', len });
      }
      if (!has(r - 1, c) && has(r + 1, c)) {
        let len = 0;
        while (has(r + len, c)) len++;
        runs.push({ r, c, dir: 'down', len });
      }
    }
  }
  for (const run of runs) {
    const match = def.entries.find(
      (e) =>
        e.dir === run.dir && e.row === run.r && e.col === run.c && e.answer.length === run.len
    );
    if (!match) {
      errors.push(
        `${def.id}: accidental ${run.dir} run of ${run.len} at (${run.r},${run.c}) with no matching entry`
      );
    }
  }
  if (runs.length !== def.entries.length) {
    errors.push(`${def.id}: ${def.entries.length} entries but ${runs.length} runs found`);
  }
  return errors;
}
