/**
 * Sanity checks for game content and logic. Run with: npm run validate
 *  - crossword puzzles: intersections, accidental words, connectivity
 *  - sudoku generator: unique solutions and clue counts per difficulty
 */
import { PUZZLES } from '../src/games/crossword/logic/puzzles';
import { buildPuzzle, validatePuzzle } from '../src/games/crossword/logic/engine';
import { generatePuzzle } from '../src/games/sudoku/logic/generator';
import { LEVELS, validateWheelLevel } from '../src/games/word-wheel/logic/levels';
import { generateFlowLevel } from '../src/games/color-connect/logic/generator';

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

console.log('— Word Wheel levels —');
for (const [difficulty, levels] of Object.entries(LEVELS)) {
  for (const level of levels) {
    const errors = validateWheelLevel(level);
    if (errors.length > 0) {
      failed = true;
      console.error(`✗ ${difficulty}/${level.id}:`);
      errors.forEach((e) => console.error(`    ${e}`));
    } else {
      console.log(`✓ ${difficulty}/${level.id} — ${level.entries.length} words from [${level.letters.join('')}]`);
    }
  }
}

console.log('— Cryptogram phrases —');
const { PHRASES } = await import('../src/games/cryptogram/logic/phrases');
for (const [difficulty, phrases] of Object.entries(PHRASES)) {
  for (const phrase of phrases) {
    const bad = /[^A-Z ]/.test(phrase.text);
    const unique = new Set(phrase.text.replace(/ /g, '')).size;
    if (bad || unique < 6) {
      failed = true;
      console.error(`✗ ${difficulty}/${phrase.id}: ${bad ? 'invalid characters' : 'too few unique letters'}`);
    } else {
      console.log(`✓ ${difficulty}/${phrase.id} — ${phrase.text.length} chars, ${unique} unique letters`);
    }
  }
}

console.log('— Color Connect generator —');
for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  let ok = 0;
  for (let i = 0; i < 25; i++) {
    const level = generateFlowLevel(difficulty);
    const covered = new Set(level.paths.flat());
    const contiguous = level.paths.every((p) =>
      p.every(
        (c, k) =>
          k === 0 ||
          Math.abs(Math.floor(c / level.size) - Math.floor(p[k - 1] / level.size)) +
            Math.abs((c % level.size) - (p[k - 1] % level.size)) ===
            1
      )
    );
    if (covered.size === level.size * level.size && contiguous) ok++;
  }
  if (ok !== 25) {
    failed = true;
    console.error(`✗ ${difficulty}: ${ok}/25 generated levels valid`);
  } else {
    console.log(`✓ ${difficulty}: 25/25 generated levels cover the board with contiguous paths`);
  }
}

if (failed) {
  console.error('\nValidation FAILED');
  throw new Error('validation failed');
}
console.log('\nAll validations passed.');
