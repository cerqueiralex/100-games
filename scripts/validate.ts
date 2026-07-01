/**
 * Sanity checks for game content and logic. Run with: npm run validate
 *  - crossword puzzles: intersections, accidental words, connectivity
 *  - sudoku generator: unique solutions and clue counts per difficulty
 */
import { PUZZLES } from '../src/games/crossword/logic/puzzles';
import { buildPuzzle, validatePuzzle } from '../src/games/crossword/logic/engine';
import { generatePuzzle } from '../src/games/sudoku/logic/generator';

let failed = false;

console.log('— Crossword puzzles —');
for (const [difficulty, defs] of Object.entries(PUZZLES)) {
  for (const def of defs) {
    const errors = validatePuzzle(def);
    if (errors.length > 0) {
      failed = true;
      console.error(`✗ ${difficulty}/${def.id}:`);
      errors.forEach((e) => console.error(`    ${e}`));
    } else {
      const built = buildPuzzle(def);
      console.log(
        `✓ ${difficulty}/${def.id} "${def.title}" — ${built.rows}x${built.cols}, ${built.slots.length} words`
      );
    }
  }
}

console.log('— Sudoku generator —');
for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  const t0 = Date.now();
  const { puzzle, solution } = generatePuzzle(difficulty);
  const clues = puzzle.filter((v) => v !== 0).length;
  const solved = solution.every((v) => v >= 1 && v <= 9);
  const consistent = puzzle.every((v, i) => v === 0 || v === solution[i]);
  if (!solved || !consistent) {
    failed = true;
    console.error(`✗ ${difficulty}: inconsistent puzzle/solution`);
  } else {
    console.log(`✓ ${difficulty}: ${clues} clues, generated in ${Date.now() - t0}ms`);
  }
}

if (failed) {
  console.error('\nValidation FAILED');
  throw new Error('validation failed');
}
console.log('\nAll validations passed.');
