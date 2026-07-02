/** Numeric category metadata, enabling comparative ("older/younger") clues. */
export interface NumericSpec {
  /** Underlying value per item, same order as `items` (ascending). */
  values: number[];
  /** Unit word for exact-difference clues, e.g. "year". */
  unit: string;
  /** Comparative words, e.g. "younger" / "older". */
  lessWord: string;
  moreWord: string;
}

export interface Category {
  id: string;
  /** Header label, e.g. "Drink". */
  name: string;
  items: string[];
  /**
   * Mid-sentence phrase for an item with `{item}` placeholder, denoting the
   * PERSON, e.g. "the {item} drinker". The primary category uses "{item}".
   */
  phrase: string;
  numeric?: NumericSpec;
}

/** [categoryIndex, itemIndex] */
export type Ref = [number, number];

export type Clue =
  /** a and b belong to the same person. */
  | { type: 'is'; a: Ref; b: Ref }
  /** a and b belong to different people. */
  | { type: 'not'; a: Ref; b: Ref }
  /** a matches b1 or b2 (b1, b2 in the same category). */
  | { type: 'either'; a: Ref; b1: Ref; b2: Ref }
  /** a matches neither b1 nor b2 (b1, b2 in the same category). */
  | { type: 'neither'; a: Ref; b1: Ref; b2: Ref }
  /** All refs denote pairwise different people (refs in pairwise different categories). */
  | { type: 'distinct'; refs: Ref[] }
  /**
   * value(a) < value(b) in numeric category `cat`; `diff` set = exact
   * difference. Implies a and b are different people.
   */
  | { type: 'less'; a: Ref; b: Ref; cat: number; diff?: number };

export interface PuzzleDef {
  id: string;
  title: string;
  story: string;
  /** categories[0] is the primary category (rows of the answer table). */
  categories: Category[];
  clues: Clue[];
  /** solution[c][e] = item index of category c for entity e; solution[0][e] === e. */
  solution: number[][];
}

/** Cell mark: 0 unknown, 1 no (✗), 2 yes (✓). */
export type CellMark = 0 | 1 | 2;
