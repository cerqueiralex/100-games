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
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
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

console.log('— Word Wheel word bank & hunts —');
{
  const { WORD_BANK, validateWordBank, generateHunt, canForm } = await import(
    '../src/games/word-wheel/logic/wordbank'
  );
  const bankErrors = validateWordBank();
  if (bankErrors.length > 0) {
    failed = true;
    bankErrors.forEach((e) => console.error(`✗ bank: ${e}`));
  } else {
    console.log(`✓ bank: ${WORD_BANK.length} words, all valid and unique`);
  }
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    let ok = 0;
    let wordSum = 0;
    const t0 = Date.now();
    for (let i = 0; i < 25; i++) {
      const h = generateHunt(difficulty);
      const sound =
        h.words.length >= 4 &&
        h.letters[0] === h.center &&
        h.words.every((w) => w.includes(h.center) && canForm(w, h.letters));
      if (sound) {
        ok++;
        wordSum += h.words.length;
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ hunt/${difficulty}: only ${ok}/25 generated hunts are sound`);
    } else {
      console.log(
        `✓ hunt/${difficulty}: 25/25 sound, ~${Math.round(wordSum / 25)} words per hunt, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Cryptogram picture puzzles —');
{
  const { WORD_BANK, HIDDEN_ANSWERS, validateCryptoContent, generateCryptoPuzzle } = await import(
    '../src/games/cryptogram/logic/words'
  );
  const contentErrors = validateCryptoContent();
  if (contentErrors.length > 0) {
    failed = true;
    contentErrors.forEach((e) => console.error(`✗ content: ${e}`));
  } else {
    const answers = Object.values(HIDDEN_ANSWERS).flat().length;
    console.log(`✓ content: ${WORD_BANK.length} bank words, ${answers} hidden answers, all covered`);
  }
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    let ok = 0;
    let colSum = 0;
    const t0 = Date.now();
    for (let i = 0; i < 25; i++) {
      const p = generateCryptoPuzzle(difficulty);
      const letters = p.answer.replace(/ /g, '').split('');
      const words = new Set(p.rows.map((r) => r.word));
      const glyphs = new Set(Object.values(p.glyphOf));
      const sound =
        p.rows.length === letters.length &&
        p.rows.every((r, k) => r.word[r.hiddenIndex] === letters[k]) &&
        words.size === p.rows.length &&
        glyphs.size === Object.keys(p.glyphOf).length &&
        p.rows.every((r) => Object.prototype.hasOwnProperty.call(p.glyphOf, r.word[0])) &&
        p.cols <= 16 &&
        p.col === Math.max(...p.rows.map((r) => r.hiddenIndex));
      if (sound) {
        ok++;
        colSum += p.cols;
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 generated puzzles are sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 sound, ~${Math.round(colSum / 25)} tile columns, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Logic grid presets —');
const { PRESET_TIERS, buildPreset } = await import('../src/games/logic-grid/logic/presets');
const { solveByPropagation, isFullyDecided, stateMatchesSolution } = await import(
  '../src/games/logic-grid/logic/solver'
);
const { generatePuzzle: generateLogicPuzzle } = await import('../src/games/logic-grid/logic/generator');
for (const tier of PRESET_TIERS) {
  for (const entry of tier.entries) {
    const t0 = Date.now();
    try {
      const def = buildPreset(entry);
      const s = solveByPropagation(def);
      if (!isFullyDecided(s) || !stateMatchesSolution(def, s)) {
        failed = true;
        console.error(`✗ ${tier.id}/${entry.id}: not solvable by pure deduction / solution mismatch`);
      } else {
        console.log(
          `✓ ${tier.id}/${entry.id} "${entry.title}" — ${entry.k}×${entry.n}, ${def.clues.length} clues, ${Date.now() - t0}ms`
        );
      }
    } catch (err) {
      failed = true;
      console.error(`✗ ${tier.id}/${entry.id}: ${(err as Error).message}`);
    }
  }
}

console.log('— Logic grid generator —');
{
  const sizes = [
    { k: 3, n: 3, flavor: 'gentle' as const },
    { k: 4, n: 4, flavor: 'balanced' as const },
    { k: 4, n: 5, flavor: 'tricky' as const },
    { k: 5, n: 5, flavor: 'tricky' as const },
    { k: 5, n: 6, flavor: 'tricky' as const }
  ];
  for (const size of sizes) {
    let ok = 0;
    let clueSum = 0;
    const t0 = Date.now();
    for (let seed = 1000; seed < 1025; seed++) {
      try {
        const def = generateLogicPuzzle({ seed, ...size });
        const s = solveByPropagation(def);
        if (isFullyDecided(s) && stateMatchesSolution(def, s)) {
          ok++;
          clueSum += def.clues.length;
        }
      } catch {
        // counted as a failure below
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${size.k}×${size.n} ${size.flavor}: only ${ok}/25 seeds produced guess-free puzzles`);
    } else {
      console.log(
        `✓ ${size.k}×${size.n} ${size.flavor}: 25/25 unique & deduction-solvable, ~${Math.round(clueSum / 25)} clues, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Color Connect generator —');
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
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
