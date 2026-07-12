/**
 * Positional propagation solver. The invariant everything relies on: a clue
 * set is only accepted when sound deduction alone fully decides every
 * category — which proves both uniqueness and guess-free solvability
 * (same contract as Logic Puzzles' solver, but over house positions).
 */

/** attribute = one item of one category */
export interface HpAttr {
  c: number;
  i: number;
}

export type HpClue =
  | { type: 'at'; a: HpAttr; house: number }
  | { type: 'ends'; a: HpAttr }
  | { type: 'same'; a: HpAttr; b: HpAttr }
  | { type: 'directRight'; a: HpAttr; b: HpAttr } // a is immediately right of b
  | { type: 'adjacent'; a: HpAttr; b: HpAttr }
  | { type: 'rightOf'; a: HpAttr; b: HpAttr } // a is somewhere right of b
  | { type: 'between'; a: HpAttr; left: HpAttr; right: HpAttr }; // left < a < right

export interface HpPuzzle {
  id: string;
  n: number;
  categories: { id: string; name: string; subject: string; kind: 'house' | 'person'; items: string[] }[];
  /** solution[c][house] = item index */
  solution: number[][];
  clues: HpClue[];
}

/** possibility matrices: state[c][i * n + h] = 1 while item i may sit at house h */
export type HpState = Uint8Array[];

export function blankState(k: number, n: number): HpState {
  return Array.from({ length: k }, () => new Uint8Array(n * n).fill(1));
}

export function solveByPropagation(puzzle: HpPuzzle): HpState {
  const { n, clues } = puzzle;
  const k = puzzle.categories.length;
  const s = blankState(k, n);

  const can = (a: HpAttr, h: number) => s[a.c][a.i * n + h] === 1;
  let changed = true;
  const kill = (a: HpAttr, h: number) => {
    if (s[a.c][a.i * n + h] === 1) {
      s[a.c][a.i * n + h] = 0;
      changed = true;
    }
  };

  const houseOptions = (a: HpAttr): number[] => {
    const out: number[] = [];
    for (let h = 0; h < n; h++) if (can(a, h)) out.push(h);
    return out;
  };

  while (changed) {
    changed = false;

    // singles: an item with one possible house owns it; a house down to one
    // possible item takes it
    for (let c = 0; c < k; c++) {
      for (let i = 0; i < n; i++) {
        const opts = houseOptions({ c, i });
        if (opts.length === 1) {
          const h = opts[0];
          for (let x = 0; x < n; x++) if (x !== i) kill({ c, i: x }, h);
        }
      }
      for (let h = 0; h < n; h++) {
        const items: number[] = [];
        for (let i = 0; i < n; i++) if (can({ c, i }, h)) items.push(i);
        if (items.length === 1) {
          for (let x = 0; x < n; x++) if (x !== h) kill({ c, i: items[0] }, x);
        }
      }
    }

    for (const cl of clues) {
      switch (cl.type) {
        case 'at':
          for (let h = 0; h < n; h++) if (h !== cl.house) kill(cl.a, h);
          break;
        case 'ends':
          for (let h = 1; h < n - 1; h++) kill(cl.a, h);
          break;
        case 'same':
          for (let h = 0; h < n; h++) {
            if (!can(cl.a, h)) kill(cl.b, h);
            if (!can(cl.b, h)) kill(cl.a, h);
          }
          break;
        case 'directRight':
          for (let h = 0; h < n; h++) {
            if (h === 0 || !can(cl.b, h - 1)) kill(cl.a, h);
            if (h === n - 1 || !can(cl.a, h + 1)) kill(cl.b, h);
          }
          break;
        case 'adjacent':
          for (let h = 0; h < n; h++) {
            const bNear = (h > 0 && can(cl.b, h - 1)) || (h < n - 1 && can(cl.b, h + 1));
            if (!bNear) kill(cl.a, h);
            const aNear = (h > 0 && can(cl.a, h - 1)) || (h < n - 1 && can(cl.a, h + 1));
            if (!aNear) kill(cl.b, h);
          }
          break;
        case 'rightOf': {
          const bMin = Math.min(...houseOptions(cl.b), n);
          const aMax = Math.max(...houseOptions(cl.a), -1);
          for (let h = 0; h <= bMin && h < n; h++) kill(cl.a, h);
          for (let h = n - 1; h >= aMax && h >= 0; h--) kill(cl.b, h);
          break;
        }
        case 'between': {
          const pairs: [HpAttr, HpAttr][] = [
            [cl.a, cl.left],
            [cl.right, cl.a]
          ];
          for (const [hi, lo] of pairs) {
            const loMin = Math.min(...houseOptions(lo), n);
            const hiMax = Math.max(...houseOptions(hi), -1);
            for (let h = 0; h <= loMin && h < n; h++) kill(hi, h);
            for (let h = n - 1; h >= hiMax && h >= 0; h--) kill(lo, h);
          }
          break;
        }
      }
    }
  }

  return s;
}

/** every category reduced to a permutation matrix */
export function isFullyDecided(state: HpState, n: number): boolean {
  for (const cat of state) {
    for (let i = 0; i < n; i++) {
      let count = 0;
      for (let h = 0; h < n; h++) if (cat[i * n + h] === 1) count++;
      if (count !== 1) return false;
    }
  }
  return true;
}

export function stateMatchesSolution(puzzle: HpPuzzle, state: HpState): boolean {
  const { n, solution } = puzzle;
  for (let c = 0; c < state.length; c++) {
    for (let h = 0; h < n; h++) {
      if (state[c][solution[c][h] * n + h] !== 1) return false;
    }
  }
  return true;
}
