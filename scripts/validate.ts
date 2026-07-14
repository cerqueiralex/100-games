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

console.log('— House Puzzles generator —');
{
  const { generateHousePuzzle } = await import('../src/games/house-puzzles/logic/generator');
  const hpSolver = await import('../src/games/house-puzzles/logic/solver');
  const sizes = [
    { n: 4, k: 3, flavor: 'gentle' as const },
    { n: 4, k: 4, flavor: 'gentle' as const },
    { n: 5, k: 4, flavor: 'tricky' as const },
    { n: 5, k: 5, flavor: 'tricky' as const },
    { n: 6, k: 5, flavor: 'tricky' as const }
  ];
  for (const size of sizes) {
    let ok = 0;
    let clueSum = 0;
    const t0 = Date.now();
    for (let seed = 3000; seed < 3025; seed++) {
      try {
        const p = generateHousePuzzle({ seed, ...size });
        const s = hpSolver.solveByPropagation(p);
        if (hpSolver.isFullyDecided(s, p.n) && hpSolver.stateMatchesSolution(p, s)) {
          ok++;
          clueSum += p.clues.length;
        }
      } catch {
        // counted as a failure below
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${size.n} houses × ${size.k} cats: only ${ok}/25 seeds produced guess-free puzzles`);
    } else {
      console.log(
        `✓ ${size.n} houses × ${size.k} cats (${size.flavor}): 25/25 unique & guess-free, ~${Math.round(clueSum / 25)} clues, ${Date.now() - t0}ms total`
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

console.log('— Lights Out generator —');
{
  const { generateBoard, applyPress, LO_CONFIG } = await import(
    '../src/games/lights-out/logic/generator'
  );
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = LO_CONFIG[difficulty];
    let ok = 0;
    let parSum = 0;
    const t0 = Date.now();
    for (let seed = 9000; seed < 9025; seed++) {
      const b = generateBoard(difficulty, seed);
      const lights = b.lights.slice();
      for (const p of b.solution) applyPress(lights, p, b.size, b.wrap);
      const cleared = lights.every((v) => v === 0);
      const inBand = b.par >= cfg.parMin && b.par <= cfg.parMax;
      const sound =
        cleared && inBand && b.par === b.solution.length && b.lights.some((v) => v === 1);
      if (sound) {
        ok++;
        parSum += b.par;
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded boards are sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 solvable at exact GF(2) par (band ${cfg.parMin}–${cfg.parMax}, avg ${Math.round(parSum / 25)}), ${cfg.size}×${cfg.size}${cfg.wrap ? ' torus' : ''}, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Futoshiki generator —');
{
  const { DIFFICULTY_CONFIG, generateFutoshiki, verifyFutoshiki } = await import(
    '../src/games/futoshiki/logic/generator'
  );
  const bases: Record<string, number> = { easy: 4100, medium: 4200, hard: 4300, pro: 4400, extreme: 4500 };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    let ok = 0;
    let signSum = 0;
    let givenSum = 0;
    const t0 = Date.now();
    for (let seed = bases[difficulty]; seed < bases[difficulty] + 25; seed++) {
      try {
        const p = generateFutoshiki({ seed, ...cfg });
        const errs = verifyFutoshiki(p);
        if (errs.length > 0) {
          console.error(`✗ ${difficulty}/seed ${seed}: ${errs.join('; ')}`);
        } else if (JSON.stringify(generateFutoshiki({ seed, ...cfg })) !== JSON.stringify(p)) {
          console.error(`✗ ${difficulty}/seed ${seed}: not deterministic`);
        } else {
          ok++;
          signSum += p.ineqs.length;
          givenSum += p.givens.filter((v: number) => v !== 0).length;
        }
      } catch (err) {
        console.error(`✗ ${difficulty}/seed ${seed}: ${(err as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound puzzles`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 unique & consistent (${cfg.n}×${cfg.n} ${cfg.flavor}), ~${Math.round(signSum / 25)} signs, ~${Math.round(givenSum / 25)} givens, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Nonogram generator —');
{
  const { generateNonogram, solveByLines, deriveLineClues } = await import(
    '../src/games/nonogram/logic/generator'
  );
  const sizes = { easy: 5, medium: 8, hard: 10, pro: 12, extreme: 15 };
  for (const [difficulty, size] of Object.entries(sizes)) {
    let ok = 0;
    let densSum = 0;
    const t0 = Date.now();
    for (let seed = 5000; seed < 5025; seed++) {
      const p = generateNonogram({ seed, size });
      let cluesOk = true;
      for (let r = 0; r < size; r++) {
        const want = deriveLineClues(p.cells.slice(r * size, (r + 1) * size));
        if (JSON.stringify(want) !== JSON.stringify(p.rowClues[r])) cluesOk = false;
      }
      for (let c = 0; c < size; c++) {
        const line: number[] = [];
        for (let r = 0; r < size; r++) line.push(p.cells[r * size + c]);
        if (JSON.stringify(deriveLineClues(line)) !== JSON.stringify(p.colClues[c])) cluesOk = false;
      }
      const res = solveByLines(p.rowClues, p.colClues, size);
      const sound =
        cluesOk &&
        res.decided &&
        !res.contradiction &&
        res.grid.every((v, i) => (v === 1 ? 1 : 0) === p.cells[i]);
      if (sound) {
        ok++;
        densSum += p.cells.reduce((a, v) => a + v, 0) / (size * size);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded boards are fully line-solver decided`);
    } else {
      console.log(
        `✓ ${difficulty} (${size}×${size}): 25/25 line-solver decided & unique, ~${Math.round((densSum / 25) * 100)}% density, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Tents & Trees generator —');
{
  const { generateTents, tentTarget } = await import('../src/games/tents/logic/generator');
  const { countSolutions, kingNeighbors, maxMatching, orthNeighbors, verifySolution } = await import(
    '../src/games/tents/logic/solver'
  );
  const sizes: Record<string, number> = { easy: 6, medium: 8, hard: 9, pro: 10, extreme: 12 };
  for (const [difficulty, size] of Object.entries(sizes)) {
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 5000; seed < 5025; seed++) {
      try {
        const p = generateTents({ seed, size });
        const solSet = new Set(p.solution);
        const countsOk =
          p.rowCounts.every((v, r) => v === p.solution.filter((t) => ((t / size) | 0) === r).length) &&
          p.colCounts.every((v, c) => v === p.solution.filter((t) => t % size === c).length);
        const noTouch = p.solution.every((t) => !kingNeighbors(t, size).some((nb) => solSet.has(nb)));
        const everyTreePairs =
          maxMatching(p.trees.map((tr) => orthNeighbors(tr, size).filter((c) => solSet.has(c)))).size ===
          p.trees.length;
        const sound =
          p.solution.length === tentTarget(size) &&
          p.trees.length === p.solution.length &&
          countsOk &&
          noTouch &&
          everyTreePairs &&
          verifySolution(p, p.solution) &&
          countSolutions(p, 2) === 1;
        if (sound) ok++;
      } catch {
        // counted as a failure below
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound unique puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} ${size}×${size} (${tentTarget(size)} tents): 25/25 unique, every tree paired, no touching tents, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— MathDoku generator —');
{
  const { DIFF_CONFIG, generateMathdoku, countSolutions, validateIntegrity } = await import(
    '../src/games/mathdoku/logic/generator'
  );
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = DIFF_CONFIG[difficulty];
    let ok = 0;
    let cageSum = 0;
    const t0 = Date.now();
    for (let seed = 7000; seed < 7025; seed++) {
      try {
        // validateIntegrity: Latin solution, exact-cover partition, connected
        // cages, op rules, every cage arithmetic consistent with the solution.
        // countSolutions re-proves uniqueness (under any-op rules when noOps).
        const p = generateMathdoku({ seed, ...cfg });
        const structural = validateIntegrity(p);
        const unique = countSolutions(p, 2) === 1;
        const singles = p.cages.filter((c) => c.cells.length === 1).length;
        if (structural.length > 0) {
          console.error(`    ${difficulty}/${seed}: ${structural[0]}`);
        } else if (!unique) {
          console.error(`    ${difficulty}/${seed}: solution not unique`);
        } else if (cfg.bigCages && singles > 0) {
          console.error(`    ${difficulty}/${seed}: pro board has ${singles} single-cell cages`);
        } else {
          ok++;
          cageSum += p.cages.length;
        }
      } catch (err) {
        console.error(`    ${difficulty}/${seed}: ${(err as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.n}×${cfg.n}${cfg.noOps ? ', hidden ops' : ''}${cfg.bigCages ? ', big cages' : ''}): 25/25 unique & valid, ~${Math.round(cageSum / 25)} cages, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Aquarium generator —');
{
  const { generateAquarium, verifyAquarium, AQU_CONFIG } = await import(
    '../src/games/aquarium/logic/generator'
  );
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = AQU_CONFIG[difficulty];
    let ok = 0;
    let tankSum = 0;
    const t0 = Date.now();
    for (let seed = 9100; seed < 9125; seed++) {
      try {
        const p = generateAquarium({ seed, ...cfg });
        const problems = verifyAquarium(p);
        if (problems.length > 0) {
          console.error(`✗ aquarium/${difficulty}/seed ${seed}: ${problems.join('; ')}`);
        } else {
          ok++;
          tankSum += p.tankCount;
        }
      } catch (e) {
        console.error(`✗ aquarium/${difficulty}/seed ${seed}: threw ${(e as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ aquarium/${difficulty}: only ${ok}/25 seeds produced sound puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.size}×${cfg.size}): 25/25 unique & physics-consistent, ~${Math.round(
          tankSum / 25
        )} tanks, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Skyscrapers generator —');
{
  const { SKY_CONFIGS, generateSkyscrapers, countSolutions, visibleCount } = await import(
    '../src/games/skyscrapers/logic/generator'
  );
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = SKY_CONFIGS[difficulty];
    let ok = 0;
    let clueSum = 0;
    let givenSum = 0;
    const t0 = Date.now();
    for (let seed = 9100; seed < 9125; seed++) {
      const p = generateSkyscrapers({ seed, n: cfg.n, minClues: cfg.minClues });
      const n = p.n;
      let sound = true;
      // solution is a valid Latin square of 1..n
      for (let i = 0; i < n; i++) {
        const row = new Set<number>();
        const col = new Set<number>();
        for (let j = 0; j < n; j++) {
          row.add(p.solution[i * n + j]);
          col.add(p.solution[j * n + i]);
        }
        if (row.size !== n || col.size !== n) sound = false;
      }
      if (!p.solution.every((v) => v >= 1 && v <= n)) sound = false;
      // every visible clue matches the solution's skyline visibility
      let visible = 0;
      for (let c = 0; c < n; c++) {
        const col = Array.from({ length: n }, (_, r) => p.solution[r * n + c]);
        if (p.top[c] > 0) { visible++; if (p.top[c] !== visibleCount(col)) sound = false; }
        if (p.bottom[c] > 0) { visible++; if (p.bottom[c] !== visibleCount([...col].reverse())) sound = false; }
      }
      for (let r = 0; r < n; r++) {
        const row = p.solution.slice(r * n, r * n + n);
        if (p.left[r] > 0) { visible++; if (p.left[r] !== visibleCount(row)) sound = false; }
        if (p.right[r] > 0) { visible++; if (p.right[r] !== visibleCount([...row].reverse())) sound = false; }
      }
      // givens agree with the solution, and the puzzle has a UNIQUE solution
      if (!p.givens.every((v, i) => v === 0 || v === p.solution[i])) sound = false;
      const u = countSolutions(p, 2, 8_000_000);
      if (u.aborted || u.count !== 1) sound = false;
      if (sound) {
        ok++;
        clueSum += visible;
        givenSum += p.givens.filter((v) => v > 0).length;
      } else {
        console.error(`✗ ${difficulty}/seed ${seed}: unsound puzzle`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound unique puzzles`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 unique ${cfg.n}×${cfg.n}, ~${Math.round(clueSum / 25)} clues, ~${(givenSum / 25).toFixed(1)} givens, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Binary Grid generator —');
{
  const { generateBinary, countSolutions, findViolations } = await import(
    '../src/games/binary-grid/logic/generator'
  );
  const tiers = [
    { name: 'easy', size: 6, uniqueLines: false, targetGivens: 14, depth: 0 as const },
    { name: 'medium', size: 8, uniqueLines: false, targetGivens: 22, depth: 0 as const },
    { name: 'hard', size: 10, uniqueLines: true, targetGivens: 34, depth: 0 as const },
    { name: 'pro', size: 10, uniqueLines: true, targetGivens: 26, depth: 1 as const },
    { name: 'extreme', size: 12, uniqueLines: true, targetGivens: 46, depth: 1 as const }
  ];
  for (const tier of tiers) {
    let ok = 0;
    let givenSum = 0;
    const t0 = Date.now();
    for (let seed = 9000; seed < 9025; seed++) {
      try {
        const p = generateBinary({
          seed,
          size: tier.size,
          uniqueLines: tier.uniqueLines,
          targetGivens: tier.targetGivens,
          depth: tier.depth
        });
        // full solution obeys every rule (complete + no violations ⇒ balanced too)
        const solutionValid =
          p.solution.every((v) => v === 1 || v === 2) &&
          findViolations(p.solution, p.size, p.uniqueLines).size === 0;
        // givens consistent with the solution
        const consistent = p.givens.every((v, i) => v === 0 || v === p.solution[i]);
        // solver-unique (count-to-2 backtracking)
        const unique = countSolutions(p.givens, p.size, p.uniqueLines, 2) === 1;
        if (solutionValid && consistent && unique) {
          ok++;
          givenSum += p.givens.filter((v) => v !== 0).length;
        }
      } catch {
        // counted as a failure below
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ binary-grid/${tier.name}: only ${ok}/25 seeds produced sound unique boards`);
    } else {
      console.log(
        `✓ binary-grid/${tier.name}: 25/25 unique & rule-sound, ~${Math.round(givenSum / 25)}/${
          tier.size * tier.size
        } givens, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Bridges (Hashi) generator —');
{
  const { HASHI_CONFIG, generateHashi, verifyHashi } = await import(
    '../src/games/hashi/logic/generator'
  );
  const bases: Record<string, number> = { easy: 7100, medium: 7200, hard: 7300, pro: 7400, extreme: 7500 };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = HASHI_CONFIG[difficulty];
    let ok = 0;
    let bridgedSum = 0;
    let doubleSum = 0;
    const t0 = Date.now();
    for (let seed = bases[difficulty]; seed < bases[difficulty] + 25; seed++) {
      try {
        const p = generateHashi({ seed, ...cfg });
        const errs = verifyHashi(p);
        if (errs.length > 0) {
          console.error(`✗ ${difficulty}/seed ${seed}: ${errs.join('; ')}`);
        } else if (JSON.stringify(generateHashi({ seed, ...cfg })) !== JSON.stringify(p)) {
          console.error(`✗ ${difficulty}/seed ${seed}: not deterministic`);
        } else if (p.islands.length !== cfg.islands) {
          console.error(`✗ ${difficulty}/seed ${seed}: ${p.islands.length} islands, wanted ${cfg.islands}`);
        } else {
          ok++;
          bridgedSum += p.solution.filter((v: number) => v > 0).length;
          doubleSum += p.solution.filter((v: number) => v === 2).length;
        }
      } catch (err) {
        console.error(`✗ ${difficulty}/seed ${seed}: ${(err as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound puzzles`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 unique, connected & crossing-free (${cfg.w}×${cfg.h}, ${cfg.islands} islands), ~${Math.round(bridgedSum / 25)} bridged links (~${Math.round(doubleSum / 25)} double), ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Killer Sudoku generator —');
{
  // 10 seeded puzzles per difficulty (not the usual 25): every killer board
  // is re-proven unique with a count-to-2 solver, which is much heavier than
  // the other generators' checks — 10×5 keeps validate fast while still
  // exercising the whole pool ladder per tier.
  const { generateKiller, countSolutions } = await import(
    '../src/games/killer-sudoku/logic/generator'
  );
  const GIVENS = { easy: 30, medium: 18, hard: 8, pro: 0, extreme: 0 } as const;
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    let ok = 0;
    let cageSum = 0;
    const t0 = Date.now();
    for (let i = 0; i < 10; i++) {
      const p = generateKiller({ seed: 9100 + i, difficulty });
      // cage partition is an exact cover with consistent sums/digits
      const covered = new Array(81).fill(0);
      let cagesOk = true;
      p.cages.forEach((cage, k) => {
        let sum = 0;
        const digits = new Set<number>();
        for (const c of cage.cells) {
          covered[c]++;
          sum += p.solution[c];
          digits.add(p.solution[c]);
          if (p.cageOf[c] !== k) cagesOk = false;
        }
        if (sum !== cage.sum || digits.size !== cage.cells.length) cagesOk = false;
        if (cage.cells.length < 1 || cage.cells.length > 5) cagesOk = false;
      });
      const exactCover = covered.every((n) => n === 1);
      const givenCount = p.givens.filter((v) => v !== 0).length;
      const givensOk =
        givenCount === GIVENS[difficulty] &&
        p.givens.every((v, c) => v === 0 || v === p.solution[c]);
      const unique = countSolutions(p) === 1;
      if (cagesOk && exactCover && givensOk && unique) {
        ok++;
        cageSum += p.cages.length;
      }
    }
    if (ok < 10) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/10 seeded puzzles are sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 10/10 unique & consistent, ~${Math.round(cageSum / 10)} cages, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Word Search bank & generator —');
{
  const { validateWordSearchBank, THEMES } = await import('../src/games/word-search/logic/themes');
  const { generateWordSearch, findAllOccurrences, scanAxesFor, WS_CONFIG } = await import(
    '../src/games/word-search/logic/generator'
  );
  const bankErrors = validateWordSearchBank();
  if (bankErrors.length > 0) {
    failed = true;
    console.error('✗ word bank:');
    bankErrors.forEach((e) => console.error(`    ${e}`));
  } else {
    console.log(
      `✓ word bank: ${THEMES.length} themes, ${THEMES.reduce((a, t) => a + t.words.length, 0)} words`
    );
  }
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = WS_CONFIG[difficulty];
    const axes = scanAxesFor(difficulty);
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 9100; seed < 9125; seed++) {
      const p = generateWordSearch({ seed, difficulty });
      let good =
        p.grid.length === cfg.size * cfg.size &&
        p.grid.every((ch) => /^[A-Z]$/.test(ch)) &&
        p.words.length === cfg.count;
      for (const w of p.words) {
        // the intended placement matches the grid…
        for (let i = 0; i < w.word.length; i++) {
          if (p.grid[(w.row + w.dr * i) * cfg.size + (w.col + w.dc * i)] !== w.word[i]) good = false;
        }
        if (!cfg.dirs.some(([dr, dc]) => dr === w.dr && dc === w.dc)) good = false;
        // …and is the word's ONLY findable instance along this tier's rays
        if (findAllOccurrences(p.grid, p.size, w.word, axes).length !== 1) good = false;
      }
      if (good) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded boards are sound`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.size}×${cfg.size}, ${cfg.count} words): 25/25 boards sound & unique placements, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Code Breaker logic —');
{
  const { CONFIG, randomCode, scoreGuess, mulberry32 } = await import(
    '../src/games/code-breaker/logic/game'
  );
  // scoreGuess against known Mastermind cases (incl. duplicate edge cases)
  const cases: [number[], number[], number, number][] = [
    [[0, 0, 1, 1], [0, 1, 0, 0], 1, 2], // AABB vs ABAA
    [[0, 1, 2, 3], [0, 1, 2, 3], 4, 0],
    [[0, 1, 2, 3], [3, 2, 1, 0], 0, 4],
    [[0, 0, 1, 1], [1, 1, 0, 0], 0, 4],
    [[0, 0, 0, 1], [0, 0, 1, 0], 2, 2], // AAAB vs AABA
    [[0, 1, 2], [3, 3, 3], 0, 0],
    [[1, 2, 3], [1, 1, 1], 1, 0],
    [[1, 1, 2], [1, 2, 1], 1, 2],
    [[5, 5, 5, 5], [5, 5, 1, 1], 2, 0],
    [[2, 4], [4, 2], 0, 2]
  ];
  let scoreOk = 0;
  for (const [secret, guess, exact, present] of cases) {
    const f = scoreGuess(secret, guess);
    if (f.exact === exact && f.present === present) scoreOk++;
    else {
      failed = true;
      console.error(
        `✗ scoreGuess(${JSON.stringify(secret)}, ${JSON.stringify(guess)}): expected ${exact}/${present}, got ${f.exact}/${f.present}`
      );
    }
  }
  if (scoreOk === cases.length) console.log(`✓ scoreGuess: ${scoreOk}/${cases.length} known cases`);

  // randomCode respects each tier's config over 25 seeded draws
  for (const [difficulty, cfg] of Object.entries(CONFIG)) {
    let ok = 0;
    let sawDupe = false;
    for (let seed = 1000; seed < 1025; seed++) {
      const code = randomCode(cfg, mulberry32(seed));
      const inRange = code.every((c) => Number.isInteger(c) && c >= 0 && c < cfg.colors);
      const hasDupe = new Set(code).size < code.length;
      if (hasDupe) sawDupe = true;
      if (code.length === cfg.slots && inRange && (cfg.allowDupes || !hasDupe)) ok++;
    }
    const dupeShown = !cfg.allowDupes || sawDupe;
    if (ok < 25 || !dupeShown) {
      failed = true;
      console.error(
        `✗ code-breaker/${difficulty}: ${ok}/25 valid codes${dupeShown ? '' : ', no duplicate ever drawn on a dupes-allowed tier'}`
      );
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.slots} of ${cfg.colors}${cfg.allowDupes ? ', repeats' : ''}, ${cfg.guesses} guesses): 25/25 codes valid`
      );
    }
  }
}

console.log('— Slitherlink generator —');
{
  const { generateSlitherlink, validateLoop } = await import('../src/games/slitherlink/logic/generator');
  const { solveSlitherlink } = await import('../src/games/slitherlink/logic/solver');
  const { geometry } = await import('../src/games/slitherlink/logic/geometry');
  const CFG = {
    easy: { rows: 5, cols: 5, removeFrac: 0.35 },
    medium: { rows: 6, cols: 6, removeFrac: 0.5 },
    hard: { rows: 7, cols: 7, removeFrac: 0.6 },
    pro: { rows: 8, cols: 8, removeFrac: 0.7 },
    extreme: { rows: 10, cols: 10, removeFrac: 1 }
  };
  for (const [difficulty, cfg] of Object.entries(CFG)) {
    const { rows, cols, removeFrac } = cfg;
    const g = geometry(rows, cols);
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 4000; seed < 4025; seed++) {
      const p = generateSlitherlink({ seed, rows, cols, removeFrac });
      // 1) the stored solution is one single closed loop
      const lv = validateLoop(rows, cols, p.solution);
      // 2) every kept clue equals its edge count in that loop
      let cluesOk = true;
      for (let cell = 0; cell < rows * cols && cluesOk; cell++) {
        const k = p.clues[cell];
        if (k == null) continue;
        let on = 0;
        for (const e of g.cellEdges[cell]) on += p.solution[e];
        if (on !== k) cluesOk = false;
      }
      // 3) the clue set has exactly one solution (independent solver run)
      const res = solveSlitherlink(rows, cols, p.clues, { limit: 2, budget: 400000 });
      const unique =
        res.solutions === 1 &&
        !res.budgetExceeded &&
        res.solution!.every((v, e) => v === p.solution[e]);
      if (lv.ok && cluesOk && unique) ok++;
      else {
        failed = true;
        console.error(
          `✗ slitherlink ${difficulty} seed ${seed}: loop=${lv.ok} clues=${cluesOk} unique=${unique} (${res.solutions} sol)`
        );
      }
    }
    if (ok === 25) {
      console.log(
        `✓ ${difficulty} (${rows}×${cols}): 25/25 unique, loop-closed & clue-consistent, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Fleet Finder generator —');
{
  const { generateFleet, auditPuzzle, TIERS } = await import('../src/games/fleet-solitaire/logic/generator');
  const { runSizes, solutionShape } = await import('../src/games/fleet-solitaire/logic/board');
  const { countSolutions, propagationSolves } = await import('../src/games/fleet-solitaire/logic/solver');
  const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
  for (const difficulty of diffs) {
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 4000; seed < 4025; seed++) {
      try {
        const p = generateFleet({ seed, difficulty });
        const cfg = TIERS[difficulty];
        const isShip = (i: number) => p.solution[i] === 1;
        // fleet legal: exact sizes + no diagonal touching
        let noTouch = true;
        for (let i = 0; i < p.size * p.size && noTouch; i++) {
          if (!isShip(i)) continue;
          const r = (i / p.size) | 0;
          const c = i % p.size;
          for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < p.size && nc >= 0 && nc < p.size && isShip(nr * p.size + nc)) noTouch = false;
          }
        }
        const runs = runSizes(isShip, p.size).sort((a: number, b: number) => b - a).join(',');
        const want = [...cfg.fleet].sort((a, b) => b - a).join(',');
        // reveal shapes derivable without throwing
        for (const rv of p.reveals) if (rv.ship) solutionShape(p.solution, p.size, rv.cell);
        const sound =
          p.size === cfg.size &&
          auditPuzzle(p).length === 0 &&
          noTouch &&
          runs === want &&
          countSolutions(p, 2) === 1 &&
          (!cfg.guessFree || propagationSolves(p)) &&
          JSON.stringify(generateFleet({ seed, difficulty })) === JSON.stringify(p);
        if (sound) ok++;
      } catch {
        // counted as a failure below
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound unique puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} ${TIERS[difficulty].size}×${TIERS[difficulty].size} [${TIERS[difficulty].fleet.join(',')}]: 25/25 unique${TIERS[difficulty].guessFree ? ', guess-free' : ''}, fleet legal, reveals & counts consistent, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Word Guess banks & feedback —');
{
  const { validateWordGuessBank } = await import('../src/games/word-guess/logic/words');
  const { CONFIG, evaluateGuess, pickSecret } = await import('../src/games/word-guess/logic/engine');
  const bankErrors = validateWordGuessBank();
  if (bankErrors.length) {
    failed = true;
    console.error(`✗ word bank: ${bankErrors.length} error(s)`);
    bankErrors.slice(0, 12).forEach((e) => console.error('   ' + e));
  } else {
    console.log('✓ validateWordGuessBank() clean (answers ⊆ allowed, no dupes, charset ok)');
  }

  // duplicate-letter feedback truth table (G=correct, Y=present, .=absent)
  const abbr = (m: ReturnType<typeof evaluateGuess>) =>
    m.map((x) => (x === 'correct' ? 'G' : x === 'present' ? 'Y' : '.')).join('');
  const cases: Array<[string, string, string]> = [
    ['ROBOT', 'BOOTS', 'YGYY.'],
    ['ALLOY', 'LOLLY', 'YYG.G'],
    ['SPEED', 'ERASE', 'Y..YY'],
    ['ABBEY', 'BABES', 'YYGG.'],
    ['LEVEL', 'EAGLE', 'Y..YY'],
    ['GEESE', 'THREE', '...YG'],
    ['HOUSE', 'HOUSE', 'GGGGG'],
    ['CRANE', 'MOIST', '.....']
  ];
  let fb = 0;
  for (const [secret, guess, want] of cases) {
    if (abbr(evaluateGuess(guess, secret)) !== want) {
      failed = true;
      fb++;
      console.error(`✗ feedback ${guess} vs ${secret}: got ${abbr(evaluateGuess(guess, secret))}, want ${want}`);
    }
  }
  if (fb === 0) console.log(`✓ ${cases.length}/${cases.length} duplicate-letter feedback cases correct`);

  // every secret is reachable: a greedy feedback filter solves 25/25 seeds
  const consistent = (cand: string, guess: string, m: ReturnType<typeof evaluateGuess>) =>
    abbr(evaluateGuess(guess, cand)) === abbr(m);
  for (const d of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = CONFIG[d];
    let ok = 0;
    for (let seed = 0; seed < 25; seed++) {
      let a = (seed * 2654435761) >>> 0;
      const rng = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const secret = pickSecret(d, rng);
      let pool = [...cfg.pool];
      let win = false;
      for (let t = 0; t < cfg.tries; t++) {
        const guess = t === 0 ? cfg.pool[0] : pool[Math.floor(rng() * pool.length)];
        const m = evaluateGuess(guess, secret);
        if (m.every((x) => x === 'correct')) { win = true; break; }
        pool = pool.filter((c) => c !== guess && consistent(c, guess, m));
        if (pool.length === 0) break;
      }
      if (win) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${d}: only ${ok}/25 secrets solved by greedy feedback solver`);
    } else {
      console.log(`✓ ${d} (${cfg.len}L, ${cfg.tries} tries): 25/25 secrets solvable`);
    }
  }
}

console.log('— Word Ladder banks & ladders —');
{
  const { validateLadderBank, shortestPath, wordSet, DICTS } = await import(
    '../src/games/word-ladder/logic/words'
  );
  const { generateLadder, LADDER_CONFIG } = await import(
    '../src/games/word-ladder/logic/generator'
  );

  const bank = validateLadderBank();
  if (!bank.ok) {
    failed = true;
    console.error('✗ word bank invalid:');
    bank.issues.slice(0, 8).forEach((i) => console.error(`    ${i}`));
  } else {
    console.log(
      `✓ banks: 3-letter ${DICTS[3].length}, 4-letter ${DICTS[4].length}, 5-letter ${DICTS[5].length} (unique, A–Z)`
    );
  }

  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = LADDER_CONFIG[difficulty];
    const set = wordSet(cfg.length);
    let ok = 0;
    let parSum = 0;
    const t0 = Date.now();
    for (let seed = 7000; seed < 7025; seed++) {
      const L = generateLadder({ seed, difficulty });
      const path = shortestPath(L.start, L.end, DICTS[cfg.length]);
      let stepsOk = path !== null && path.length - 1 === L.par;
      if (path) {
        for (let i = 1; i < path.length; i++) {
          let diff = 0;
          for (let k = 0; k < path[i].length; k++) if (path[i][k] !== path[i - 1][k]) diff++;
          if (diff !== 1 || !set.has(path[i])) stepsOk = false;
        }
      }
      const sound =
        stepsOk &&
        L.start !== L.end &&
        set.has(L.start) &&
        set.has(L.end) &&
        L.par >= cfg.parMin &&
        L.par <= cfg.parMax;
      if (sound) {
        ok++;
        parSum += L.par;
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded ladders are sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 sound (${cfg.length}-letter, par band ${cfg.parMin}–${cfg.parMax}, avg ${(parSum / 25).toFixed(1)}, ${Date.now() - t0}ms)`
      );
    }
  }
}

console.log('— Kakuro generator —');
{
  const { generateKakuro, verifyKakuro, KAKURO_CONFIGS } = await import(
    '../src/games/kakuro/logic/generator'
  );
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = KAKURO_CONFIGS[difficulty];
    let ok = 0;
    let entrySum = 0;
    let longest = 0;
    let worst = 0;
    const t0 = Date.now();
    for (let seed = 4200; seed < 4225; seed++) {
      const s0 = Date.now();
      try {
        const p = generateKakuro({ difficulty, seed });
        worst = Math.max(worst, Date.now() - s0);
        // verifyKakuro checks: 180° symmetry, contiguous clued runs with
        // distinct digits + matching sums, every entry in one across AND one
        // down run, connectivity, and a UNIQUE solution.
        const errs = verifyKakuro(p, cfg);
        if (errs.length === 0) {
          ok++;
          entrySum += p.blocks.filter((b) => b === 0).length;
          for (const r of p.runs) longest = Math.max(longest, r.cells.length);
        } else {
          console.error(`✗ ${difficulty}/${seed}: ${errs[0]}`);
        }
      } catch {
        console.error(`✗ ${difficulty}/${seed}: generation exhausted attempts`);
      }
    }
    if (ok !== 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound unique puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.size}x${cfg.size}): 25/25 unique & sound, ~${Math.round(
          entrySum / 25
        )} entries, longest run ${longest}, worst ${worst}ms, ${Date.now() - t0}ms total`
      );
    }
  }
}

console.log('— Hangman bank & reveal logic —');
{
  const { validateHangmanBank, CATEGORIES, RARITIES, LIVES, pickWord } = await import(
    '../src/games/hangman/logic/words'
  );
  const { guessOutcome, isRevealed, isSolved, distinctLetters } = await import(
    '../src/games/hangman/logic/engine'
  );

  const bankErrors = validateHangmanBank();
  if (bankErrors.length > 0) {
    failed = true;
    console.error('✗ word bank:');
    bankErrors.forEach((e) => console.error(`    ${e}`));
  } else {
    const total = CATEGORIES.reduce((a, c) => a + c.common.length + c.tricky.length + c.rare.length, 0);
    console.log(`✓ word bank: ${CATEGORIES.length} categories, ${total} words (sizes, charset, no dupes)`);
  }

  // reveal-logic invariants
  {
    const phrase = 'POLAR BEAR';
    const empty = new Set<string>();
    let ok = true;
    if (!isRevealed(' ', empty)) ok = false; // spaces auto-revealed
    if (!isSolved(phrase, new Set(distinctLetters(phrase)))) ok = false; // spaces don't block solving
    const rep = guessOutcome(phrase, new Set(['P']), 'P'); // repeated guess = no-op
    if (!rep.repeated || rep.positions.length !== 0) ok = false;
    const twoA = guessOutcome(phrase, empty, 'A'); // A appears twice
    if (twoA.repeated || !twoA.correct || twoA.positions.length !== 2) ok = false;
    const miss = guessOutcome('CAT', empty, 'Z'); // wrong guess
    if (miss.correct || miss.positions.length !== 0) ok = false;
    if (!ok) {
      failed = true;
      console.error('✗ reveal logic failed');
    } else {
      console.log('✓ reveal logic: spaces auto-revealed, repeats no-op, positions counted');
    }
  }

  // pickWord always draws a valid word from the difficulty's tiers
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const rarities = RARITIES[difficulty];
    let ok = 0;
    for (let i = 0; i < 200; i++) {
      const p = pickWord(difficulty);
      const inTier = CATEGORIES.some(
        (c) => c.name === p.category && rarities.some((r) => c[r].includes(p.word))
      );
      if (inTier && /^[A-Z]+( [A-Z]+)?$/.test(p.word)) ok++;
    }
    if (ok < 200) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/200 picks valid`);
    } else {
      console.log(`✓ ${difficulty} (${LIVES[difficulty]} lives): 200/200 picks from ${rarities.join('/')}`);
    }
  }
}

console.log('— Anagram Sprint bank & scramble —');
{
  const { validateAnagramBank, WORD_BANK, LENGTHS, scramble, isBankWord, SPRINT_CONFIG, SKIP_BUFFER, pickRunWords } =
    await import('../src/games/anagram-sprint/logic/words');

  const bankErrors = validateAnagramBank();
  if (bankErrors.length > 0) {
    failed = true;
    console.error('✗ word bank:');
    bankErrors.forEach((e) => console.error(`    ${e}`));
  } else {
    const total = LENGTHS.reduce((a, l) => a + WORD_BANK[l].length, 0);
    console.log(`✓ word bank: ${total} words (${LENGTHS.map((l) => `${l}:${WORD_BANK[l].length}`).join(', ')})`);
  }

  const sameLetters = (a: string, b: string) =>
    a.split('').sort().join('') === b.split('').sort().join('');

  // 25 scrambles per length: always a permutation, never the source word, and
  // never any OTHER valid bank word (so the tiles never pre-spell an answer)
  for (const len of LENGTHS) {
    const list = WORD_BANK[len];
    let ok = 0;
    for (let i = 0; i < 25; i++) {
      const word = list[Math.floor(Math.random() * list.length)];
      const s = scramble(word);
      if (sameLetters(s, word) && s !== word && !isBankWord(s)) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ length ${len}: only ${ok}/25 scrambles sound`);
    } else {
      console.log(`✓ length ${len}: 25/25 scrambles — permutation, never the word or another bank word`);
    }
  }

  // every difficulty draws enough distinct, in-range words for a run
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = SPRINT_CONFIG[difficulty];
    let ok = 0;
    for (let i = 0; i < 25; i++) {
      const words = pickRunWords(cfg.quota + SKIP_BUFFER, cfg.minLen, cfg.maxLen);
      if (
        new Set(words).size === words.length &&
        words.length >= cfg.quota &&
        words.every((w) => w.length >= cfg.minLen && w.length <= cfg.maxLen)
      )
        ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 run draws valid`);
    } else {
      console.log(`✓ ${difficulty}: 25/25 run draws — distinct, in-range, ≥ quota`);
    }
  }
}

console.log('— Nurikabe generator —');
{
  const { generateNurikabe, countSolutions, validateNurikabeSolution } = await import(
    '../src/games/nurikabe/logic/generator'
  );
  const sizes = { easy: 5, medium: 6, hard: 7, pro: 8, extreme: 10 };
  for (const [difficulty, size] of Object.entries(sizes)) {
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 9200; seed < 9225; seed++) {
      const p = generateNurikabe({ seed, size });
      // solution satisfies every rule (island sizes/isolation, sea connected, no 2×2)
      const ruleErrors = validateNurikabeSolution(p.size, p.solution, p.clues);
      // one number per island, on an island cell
      const cluesOk = p.clues.every((c) => p.solution[c.cell] === 0 && c.value >= 1);
      // the clue set has EXACTLY one solution (unique + solver-solvable)
      const unique = countSolutions(size, p.clues, 2) === 1;
      // deterministic per seed
      const same = JSON.stringify(generateNurikabe({ seed, size })) === JSON.stringify(p);
      // really generated (never the trivial comb fallback, which keeps seed 0)
      const generated = p.seed === seed;
      if (ruleErrors.length === 0 && cluesOk && unique && same && generated) ok++;
      else {
        failed = true;
        console.error(
          `✗ ${difficulty} seed ${seed}: rules=[${ruleErrors.join('; ')}] clues=${cluesOk} unique=${unique} det=${same} gen=${generated}`
        );
      }
    }
    if (ok === 25) {
      console.log(`✓ ${difficulty} (${size}×${size}): 25/25 unique, rule-valid, 1-number islands, ${Date.now() - t0}ms total`);
    } else {
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded boards are sound`);
    }
  }
}

// ── Pattern Recall — paste into scripts/validate.ts ──
// add to the imports at the top of the file:
//   import { CONFIG as PR_CONFIG, roundParams as prRoundParams, makePattern as prMakePattern, mulberry32 as prRng } from '../src/games/pattern-recall/logic/patterns';

console.log('— Pattern Recall patterns —');
{
  const {
    CONFIG: PR_CONFIG,
    roundParams: prRoundParams,
    makePattern: prMakePattern,
    mulberry32: prRng
  } = await import('../src/games/pattern-recall/logic/patterns');
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
  const cfg = PR_CONFIG[difficulty];
  let ok = 0;
  for (let seed = 0; seed < 25; seed++) {
    const rng = prRng(seed * 2654435761 + 12345);
    let sound = true;
    for (let round = 1; round <= cfg.targetRounds; round++) {
      const rp = prRoundParams(cfg, round);
      const pat = prMakePattern(rp, rng);
      const cells = rp.gridSize * rp.gridSize;
      const distinct = new Set(pat).size === pat.length;
      const rightCount = pat.length === rp.litCount;
      const inBounds = pat.every((c) => c >= 0 && c < cells);
      const fits = rp.litCount <= cells - 1;
      if (!distinct || !rightCount || !inBounds || !fits) {
        sound = false;
        break;
      }
    }
    if (sound) ok++;
  }
  if (ok < 25) {
    failed = true;
    console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound patterns`);
  } else {
    console.log(
      `✓ ${difficulty}: 25/25 sound — grid ${prRoundParams(cfg, 1).gridSize}²→${
        prRoundParams(cfg, cfg.targetRounds).gridSize
      }², ${prRoundParams(cfg, 1).litCount}→${prRoundParams(cfg, cfg.targetRounds).litCount} lit`
    );
  }
}
}

console.log('— Number Trail rounds —');
{
  const { makeRound, mulberry32 } = await import('../src/games/number-trail/logic/round');
  const { TIERS, roundConfigFor, countForRound } = await import(
    '../src/games/number-trail/logic/config'
  );
  const SEEDS = 25;
  for (const [tier, cfg] of Object.entries(TIERS)) {
    let ok = 0;
    let attempts = 0;
    for (let round = 1; round <= cfg.targetRounds; round++) {
      const rc = roundConfigFor(cfg, round);
      const expect = countForRound(cfg, round);
      const cells = rc.gridDim * rc.gridDim;
      for (let s = 0; s < SEEDS; s++) {
        attempts++;
        const r = makeRound(rc, mulberry32(s * 7919 + round * 31 + 1));
        const positions = r.items.map((it) => it.pos);
        const values = r.items.map((it) => it.value);
        const sortedByVal = [...r.items].sort((a, b) => a.value - b.value).map((it) => it.pos);
        const along = r.order.map((p) => r.items.find((it) => it.pos === p)!.value);
        const asc = along.every((v, i) => i === 0 || v > along[i - 1]);
        const good =
          r.items.length === expect &&
          new Set(positions).size === expect &&
          positions.every((p) => p >= 0 && p < cells) &&
          new Set(values).size === expect &&
          r.order.length === expect &&
          new Set(r.order).size === expect &&
          JSON.stringify(r.order) === JSON.stringify(sortedByVal) &&
          asc &&
          (cfg.nonConsecutive
            ? values.every((v) => v >= 1 && v <= 99)
            : JSON.stringify([...values].sort((a, b) => a - b)) ===
              JSON.stringify(Array.from({ length: expect }, (_, i) => i + 1)));
        if (good) ok++;
      }
    }
    if (ok !== attempts) {
      failed = true;
      console.error(`✗ number-trail ${tier}: ${ok}/${attempts} sound rounds`);
    } else {
      console.log(`✓ number-trail ${tier}: ${ok}/${attempts} rounds sound (25 seeds × ${cfg.targetRounds} rounds)`);
    }
  }
}

console.log('— Backwards Span logic —');
{
  const { CONFIG, POOLS, makeSequence, expectedAnswer, isCorrect, mulberry32 } = await import(
    '../src/games/backwards-span/logic/game'
  );

  const arrEq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

  for (const [difficulty, cfg] of Object.entries(CONFIG)) {
    const pool = new Set(POOLS[cfg.charset]);
    const runs = 25;
    let seqOk = 0;
    let ansOk = 0;
    let dirOk = 0; // direction handled correctly (reverse actually differs from shown)
    for (let seed = 4000; seed < 4000 + runs; seed++) {
      const rng = mulberry32(seed);
      let good = true;
      let expGood = true;
      let sawDistinct = false;
      // sweep every span this tier will actually reach in a run
      for (let span = cfg.startSpan; span <= cfg.targetSpan; span++) {
        const seq = makeSequence(cfg, rng, span);
        // length + charset + no adjacent duplicates
        const lenOk = seq.length === span;
        const charOk = seq.every((c) => pool.has(c));
        const adjOk = seq.every((c, i) => i === 0 || c !== seq[i - 1]);
        if (!(lenOk && charOk && adjOk)) good = false;

        const want = expectedAnswer(seq, cfg.mode);
        const reversed = [...seq].reverse();
        if (cfg.mode === 'reverse') {
          if (!arrEq(want, reversed)) expGood = false; // reverse mode reverses
          if (!arrEq(reversed, seq)) sawDistinct = true; // reversal is a real change
        } else {
          if (!arrEq(want, seq)) expGood = false; // forward preserves order
          // a non-palindrome typed in reverse must be rejected in forward mode
          if (span >= 2 && !arrEq(seq, reversed) && isCorrect(seq, reversed, cfg.mode)) expGood = false;
        }
        // isCorrect agrees with expectedAnswer, and a truncated answer is rejected
        if (!isCorrect(seq, want, cfg.mode)) expGood = false;
        if (span >= 2 && isCorrect(seq, want.slice(0, span - 1), cfg.mode)) expGood = false;
      }
      if (good) seqOk++;
      if (expGood) ansOk++;
      if (cfg.mode === 'forward' || sawDistinct) dirOk++;
    }
    if (seqOk < runs || ansOk < runs || dirOk < runs) {
      failed = true;
      console.error(
        `✗ backwards-span/${difficulty}: seq ${seqOk}/${runs}, answers ${ansOk}/${runs}, direction ${dirOk}/${runs}`
      );
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.mode} ${cfg.charset}, span ${cfg.startSpan}→${cfg.targetSpan}): ${runs}/${runs} sound`
      );
    }
  }
}

// ── Add this import near the other logic imports at the top of scripts/validate.ts ──
import {
  DIFFICULTY_CONFIGS as SCHULTE_CONFIGS,
  makeBoard as schulteMakeBoard,
  nextTarget as schulteNextTarget,
  targetSequence as schulteTargets,
  tileMatchesTarget as schulteMatches,
  mulberry32 as schulteRng
} from '../src/games/schulte-table/logic/board';

// ── Add this block in the body (same style as the other sections) ──
console.log('— Schulte Table —');
for (const [difficulty, cfg] of Object.entries(SCHULTE_CONFIGS)) {
  const n = cfg.size * cfg.size;
  let ok = 0;
  for (let seed = 4200; seed < 4225; seed++) {
    try {
      const board = schulteMakeBoard(cfg, schulteRng(seed));

      // (1) the board holds exactly the expected multiset of (value|colour)
      const expect = new Map<string, number>();
      for (const t of schulteTargets(cfg)) {
        const k = `${t.color ?? '-'}:${t.value}`;
        expect.set(k, (expect.get(k) ?? 0) + 1);
      }
      const got = new Map<string, number>();
      for (const tile of board) {
        const k = `${tile.color ?? '-'}:${tile.value}`;
        got.set(k, (got.get(k) ?? 0) + 1);
      }
      let permOk = board.length === n && expect.size === got.size;
      for (const [k, v] of expect) if (got.get(k) !== v) permOk = false;

      // (2) walking nextTarget clears every cell exactly once, in order, then ends
      const cleared = new Set<number>();
      let seqOk = true;
      for (let step = 0; step < n; step++) {
        const t = schulteNextTarget(cfg, step);
        if (!t) { seqOk = false; break; }
        const idx = board.findIndex((tile, i) => !cleared.has(i) && schulteMatches(tile, t));
        if (idx < 0) { seqOk = false; break; }
        cleared.add(idx);
      }
      if (schulteNextTarget(cfg, n) !== null) seqOk = false;

      // (3) determinism: same seed → identical board
      const deterministic =
        JSON.stringify(schulteMakeBoard(cfg, schulteRng(seed))) === JSON.stringify(board);

      if (permOk && seqOk && cleared.size === n && deterministic) ok++;
    } catch (err) {
      console.error(`✗ schulte/${difficulty}/seed ${seed}: threw ${(err as Error).message}`);
    }
  }
  if (ok === 25) {
    console.log(`✓ schulte ${difficulty} (${cfg.size}×${cfg.size} ${cfg.mode}) — 25/25 sound boards`);
  } else {
    failed = true;
    console.error(`✗ schulte ${difficulty}: only ${ok}/25 seeded boards are sound`);
  }
}

// ——— paste into scripts/validate.ts (logic-only: seeded soundness) ———
console.log('— Moving Cups shuffles —');
{
  const { CUPS_CONFIG, makeRound, makeSwaps, mulberry32, resolveFinalPosition, swapsForRound } =
    await import('../src/games/moving-cups/logic/swaps');
  // reference: apply swaps to a ball position one step at a time
  const stepByStep = (start: number, swaps: { a: number; b: number }[]): number => {
    let p = start;
    for (const s of swaps) p = p === s.a ? s.b : p === s.b ? s.a : p;
    return p;
  };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = CUPS_CONFIG[difficulty];
    let ok = 0;
    let maxSwaps = 0;
    for (let seed = 5000; seed < 5025; seed++) {
      const rng = mulberry32(seed);
      let sound = true;
      for (let round = 1; round <= cfg.targetRound; round++) {
        const rd = makeRound(cfg, round, rng);
        const expectN = swapsForRound(cfg, round);
        maxSwaps = Math.max(maxSwaps, rd.swaps.length);
        // right number of swaps, ball start in range
        if (rd.swaps.length !== expectN) sound = false;
        if (rd.ballStart < 0 || rd.ballStart >= cfg.cups) sound = false;
        // every swap is a valid, distinct, in-range slot pair
        for (const s of rd.swaps) {
          if (s.a === s.b) sound = false;
          if (s.a < 0 || s.a >= cfg.cups || s.b < 0 || s.b >= cfg.cups) sound = false;
        }
        // resolveFinalPosition agrees with step-by-step from every start slot
        for (let start = 0; start < cfg.cups; start++) {
          if (resolveFinalPosition(start, rd.swaps) !== stepByStep(start, rd.swaps)) sound = false;
        }
      }
      if (sound) ok++;
    }
    // makeSwaps always honours the requested count and bounds
    const rng2 = mulberry32(777);
    for (let t = 0; t < 300; t++) {
      const n = 1 + Math.floor(rng2() * 18);
      const sw = makeSwaps(cfg.cups, n, rng2);
      if (sw.length !== n || sw.some((s) => s.a === s.b || s.a < 0 || s.b >= cfg.cups)) ok = -1;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded runs sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 runs sound — ${cfg.cups} cups, ${cfg.baseSwaps}→${maxSwaps} swaps, target R${cfg.targetRound}`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Missing Vowels — paste this block into scripts/validate.ts (top level,
// alongside the other "— … —" sections). It is self-contained: it only
// imports from the game's own logic/ file via a scoped dynamic import.
// ─────────────────────────────────────────────────────────────────────
console.log('— Missing Vowels bank & rounds —');
{
  const {
    validateVowelBank,
    validateRoundtrip,
    pickPhrases,
    buildPuzzle,
    stripVowels,
    restore,
    isVowel,
    MV_CONFIG,
    PHRASE_BANK
  } = await import('../src/games/missing-vowels/logic/phrases');

  const bank = validateVowelBank();
  if (!bank.ok) {
    failed = true;
    bank.errors.forEach((e) => console.error(`✗ bank: ${e}`));
  } else {
    const total = PHRASE_BANK.reduce((n, c) => n + c.phrases.length, 0);
    console.log(`✓ bank: ${PHRASE_BANK.length} categories, ${total} phrases — charset, counts & pools valid`);
  }

  const rt = validateRoundtrip();
  if (!rt.ok) {
    failed = true;
    rt.errors.forEach((e) => console.error(`✗ roundtrip: ${e}`));
  } else {
    console.log('✓ roundtrip: strip vowels + fill the answer reproduces every phrase; consonant-only excluded');
  }

  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = MV_CONFIG[difficulty];
    let ok = 0;
    for (let s = 0; s < 25; s++) {
      const puzzles = pickPhrases(difficulty);
      let good =
        puzzles.length === cfg.goal &&
        new Set(puzzles.map((p) => p.phrase)).size === puzzles.length;
      for (const p of puzzles) {
        if (p.slots.length === 0) good = false;
        for (let k = 0; k < p.slots.length; k++) {
          if (!isVowel(p.answer[k]) || p.chars[p.slots[k]] !== p.answer[k]) good = false;
        }
        if (restore(stripVowels(p.phrase), p.answer) !== p.phrase) good = false;
        if (buildPuzzle(p.phrase, p.category).slots.join(',') !== p.slots.join(',')) good = false;
      }
      if (good) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 rounds sound`);
    } else {
      console.log(`✓ ${difficulty}: 25/25 rounds sound — ${cfg.goal} distinct phrases each`);
    }
  }
}

// ===== Stroop Match (paste into scripts/validate.ts) =====
// Add to the imports at the top of scripts/validate.ts:
//   import {
//     TIERS as STROOP_TIERS,
//     PALETTE as STROOP_PALETTE,
//     makeTrial as stroopMakeTrial,
//     correctAnswer as stroopCorrectAnswer,
//     activeColorIds as stroopActiveColorIds,
//     mulberry32 as stroopRng
//   } from '../src/games/stroop-match/logic/trials';

console.log('— Stroop Match trials —');
{
  const {
    TIERS: STROOP_TIERS,
    PALETTE: STROOP_PALETTE,
    makeTrial: stroopMakeTrial,
    correctAnswer: stroopCorrectAnswer,
    activeColorIds: stroopActiveColorIds,
    mulberry32: stroopRng
  } = await import('../src/games/stroop-match/logic/trials');
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
  const cfg = STROOP_TIERS[difficulty];
  const tierIds = new Set(STROOP_PALETTE.slice(0, cfg.colorCount).map((c) => c.id));
  const rng = stroopRng(0x57 + difficulty.length * 100);
  let ok = 0;
  for (let i = 0; i < 25; i++) {
    const t = stroopMakeTrial(cfg, rng);
    const ans = stroopCorrectAnswer(t);
    const answerable = stroopActiveColorIds(t, cfg).includes(ans);
    const inRange = tierIds.has(t.word) && tierIds.has(t.ink) && (!t.odd || tierIds.has(t.odd));
    // rule invariants: ink-rule answers the ink, word-rule answers the word
    const ruleOk =
      (t.rule === 'ink' && ans === t.ink) ||
      (t.rule === 'word' && ans === t.word && t.word !== t.ink) ||
      (t.rule === 'odd' && ans !== t.word && ans !== t.ink && t.word !== t.ink);
    // tier limits: no flips below the tiers that allow them
    const flipsOk =
      (cfg.ruleFlipProb > 0 || t.rule !== 'word') && (cfg.oddProb > 0 || t.rule !== 'odd');
    if (answerable && inRange && ruleOk && flipsOk) ok++;
  }
  if (ok < 25) {
    failed = true;
    console.error(`✗ ${difficulty}: only ${ok}/25 stroop trials sound`);
  } else {
    console.log(`✓ ${difficulty}: 25/25 trials — answerable, in-range, rule-correct`);
  }
}
}

console.log('— Letter Hunt dictionary & boards —');
{
  const { validateHuntDictionary, huntDictStats, isHuntWord } = await import(
    '../src/games/letter-hunt/logic/words'
  );
  const { generateHuntBoard, solveBoard, HUNT_CONFIG } = await import(
    '../src/games/letter-hunt/logic/generator'
  );

  const dictErrors = validateHuntDictionary();
  if (dictErrors.length > 0) {
    failed = true;
    console.error('✗ dictionary:');
    dictErrors.forEach((e) => console.error(`    ${e}`));
  } else {
    const s = huntDictStats();
    console.log(
      `✓ dictionary: ${s.total} words (3:${s.byLen[3]} 4:${s.byLen[4]} 5:${s.byLen[5]} 6:${s.byLen[6]} 7:${s.byLen[7]} 8:${s.byLen[8]}), Q always with U`
    );
  }

  // every solution path must spell its word through 8-adjacent, single-use tiles
  const verify = (
    size: number,
    tiles: string[],
    minLen: number,
    sols: { word: string; path: number[] }[]
  ): string | null => {
    const adj8 = (a: number, b: number) => {
      const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
      const dc = Math.abs((a % size) - (b % size));
      return dr <= 1 && dc <= 1 && a !== b;
    };
    for (const { word, path } of sols) {
      if (word.length < minLen) return `${word} shorter than minLen ${minLen}`;
      if (!isHuntWord(word)) return `${word} not in dictionary`;
      if (new Set(path).size !== path.length) return `${word} reuses a tile`;
      for (let i = 1; i < path.length; i++)
        if (!adj8(path[i - 1], path[i])) return `${word} has a non-adjacent step`;
      if (path.map((c) => tiles[c]).join('') !== word) return `${word} path spells something else`;
    }
    return null;
  };

  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = HUNT_CONFIG[difficulty];
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 4200; seed < 4225; seed++) {
      const b = generateHuntBoard({ seed, difficulty });
      let good =
        b.tiles.length === cfg.size * cfg.size &&
        b.availableWords >= cfg.minWords &&
        b.availablePoints >= cfg.minPoints &&
        b.target > 0 &&
        b.target <= b.availablePoints; // target is always attainable by the solver
      // an independent re-solve must reproduce the same findable set (determinism)
      if (solveBoard(b.tiles, b.size, b.minLen).length !== b.availableWords) good = false;
      // Qu tiles render as the single two-letter "QU"
      if (b.tiles.some((t) => t !== 'QU' && t.length !== 1)) good = false;
      const err = verify(b.size, b.tiles, b.minLen, b.solutions);
      if (err) {
        good = false;
        if (ok === 0) console.error(`    ${difficulty} seed ${seed}: ${err}`);
      }
      if (good) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeded boards sound`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.size}×${cfg.size}, ${cfg.timeSec}s, minLen ${cfg.minLen}): 25/25 boards ≥${cfg.minWords} words / ${cfg.minPoints} pts, paths valid, target attainable, ${Date.now() - t0}ms total`
      );
    }
  }
}

// ---- add near the other imports at the top of scripts/validate.ts ----
import {
  TIERS as OOO_TIERS,
  makeRound as oooMakeRound,
  roundSize as oooRoundSize,
  mulberry32 as oooRng
} from '../src/games/odd-one-out/logic/round';

// ---- add this block alongside the other game sections ----
console.log('— Odd One Out rounds —');
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
  const cfg = OOO_TIERS[difficulty];
  const runs = 25;
  let ok = 0;
  for (let s = 0; s < runs; s++) {
    const rng = oooRng(0x0dd1 + s * 131 + difficulty.length * 7);
    let good = true;
    let prevSize = 0;
    // round 0 must open at startSize; the winning round must reach endSize
    if (oooRoundSize(cfg, 0) !== cfg.startSize) good = false;
    if (oooRoundSize(cfg, cfg.targetRound - 1) !== cfg.endSize) good = false;
    for (let r = 0; r < runs; r++) {
      const round = oooMakeRound(cfg, r, rng);
      const n = round.size * round.size;
      // oddIndex is always a real cell of the grid
      if (!(round.oddIndex >= 0 && round.oddIndex < n)) good = false;
      // grid never shrinks and stays within the tier's declared bounds
      if (round.size < prevSize) good = false;
      if (round.size < cfg.startSize || round.size > cfg.endSize) good = false;
      prevSize = round.size;
      // diffKind is one the tier actually allows
      if (!cfg.kinds.includes(round.diffKind)) good = false;
      // magnitude stays inside the shrinking band and never below the floor
      if (round.diffAmount < cfg.diffFloor - 1e-9) good = false;
      if (round.diffAmount > cfg.diffStart + 1e-9) good = false;
    }
    if (good) ok++;
  }
  if (ok < runs) {
    failed = true;
    console.error(`✗ odd-one-out/${difficulty}: ${ok}/${runs} sound`);
  } else {
    console.log(
      `✓ ${difficulty} (${cfg.startSize}×${cfg.startSize}→${cfg.endSize}×${cfg.endSize}, ` +
        `diff ${cfg.diffStart}→${cfg.diffEnd} floor ${cfg.diffFloor}): ${runs}/${runs} sound`
    );
  }
}

console.log('— Count & Compare —');
{
  const { CONFIG: CC_CONFIG, shapesForRound: ccShapesForRound } = await import(
    '../src/games/count-compare/logic/config'
  );
  const {
    makeRound: ccMakeRound,
    answer: ccAnswer,
    countColor: ccCountColor,
    countShape: ccCountShape
  } = await import('../src/games/count-compare/logic/generator');
  const { mulberry32: ccRng } = await import('../src/games/count-compare/logic/rng');
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = CC_CONFIG[difficulty];
    let ok = 0;
    const typeSeen = new Set<string>();
    for (let seed = 0; seed < 25; seed++) {
      const rng = ccRng(seed * 7919 + 17);
      let good = true;
      for (let round = 1; round <= cfg.rounds; round++) {
        const r = ccMakeRound(cfg, round, rng);
        typeSeen.add(r.question.type);
        const n = r.scene.shapes.length;
        if (n !== ccShapesForRound(cfg, round) || n < cfg.shapeMin || n > cfg.shapeMax) good = false;
        const ai = ccAnswer(r.scene, r.question);
        if (ai !== r.question.answerIndex || ai < 0 || ai >= r.question.options.length) good = false;
        if (new Set(r.question.options).size !== r.question.options.length) good = false;
        if (
          r.question.type === 'compare-color' &&
          ccCountColor(r.scene, r.question.colorA!) === ccCountColor(r.scene, r.question.colorB!)
        )
          good = false;
        if (
          r.question.type === 'compare-shape' &&
          ccCountShape(r.scene, r.question.shapeA!) === ccCountShape(r.scene, r.question.shapeB!)
        )
          good = false;
      }
      if (good) ok++;
    }
    const missing = cfg.types.filter((t: string) => !typeSeen.has(t));
    if (ok < 25 || missing.length > 0) {
      failed = true;
      console.error(`✗ ${difficulty}: ${ok}/25 sound, missing types [${missing.join(', ')}]`);
    } else {
      console.log(`✓ ${difficulty}: 25/25 runs sound — bands, answers, no ties; types {${[...typeSeen].join(', ')}}`);
    }
  }
}

console.log('— Magic Square generator —');
{
  const { generateMagic, isMagic, magicConstant, remainingNumbers, MAGIC_CONFIG } = await import(
    '../src/games/magic-square/logic/generator'
  );
  const bases: Record<string, number> = { easy: 6100, medium: 6200, hard: 6300, pro: 6400, extreme: 6500 };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = MAGIC_CONFIG[difficulty];
    const M = magicConstant(cfg.n);
    let ok = 0;
    const t0 = Date.now();
    for (let seed = bases[difficulty]; seed < bases[difficulty] + 25; seed++) {
      const p = generateMagic({ seed, n: cfg.n, clues: cfg.clues });
      // 1) the canonical solution is a valid magic square
      const solutionMagic = isMagic(p.solution, cfg.n) && p.solution.length === cfg.n * cfg.n;
      // 2) givens agree with the solution and there are exactly `clues` of them
      const givenCount = p.givens.filter((v) => v !== 0).length;
      const givensConsistent =
        p.givens.every((v, i) => v === 0 || v === p.solution[i]) && givenCount === cfg.clues;
      // 3) the tray is exactly the numbers missing from the givens…
      const tray = remainingNumbers(p.givens, cfg.n);
      const missing = p.solution.filter((_, i) => p.givens[i] === 0).sort((a, b) => a - b);
      const trayCorrect =
        tray.length === cfg.n * cfg.n - cfg.clues &&
        JSON.stringify(tray) === JSON.stringify([...missing].sort((a, b) => a - b));
      // 4) dropping the missing numbers into the empty cells rebuilds a magic square
      const completed = p.solution.slice();
      const filledFromTray = p.givens.map((v, i) => (v === 0 ? completed[i] : v));
      const completable = isMagic(filledFromTray, cfg.n);
      // 5) generation is deterministic for a given seed
      const deterministic =
        JSON.stringify(generateMagic({ seed, n: cfg.n, clues: cfg.clues })) === JSON.stringify(p);
      if (solutionMagic && givensConsistent && trayCorrect && completable && deterministic && M > 0) {
        ok++;
      } else {
        console.error(
          `✗ magic-square/${difficulty}/seed ${seed}: solution=${solutionMagic} givens=${givensConsistent} tray=${trayCorrect} completable=${completable} deterministic=${deterministic}`
        );
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ magic-square/${difficulty}: only ${ok}/25 seeds produced sound puzzles`);
    } else {
      console.log(
        `✓ ${difficulty} (${cfg.n}×${cfg.n}, M=${M}, ${cfg.clues} givens): 25/25 valid magic squares, tray = missing numbers, deterministic, ${Date.now() - t0}ms total`
      );
    }
  }
}


console.log('— 2048 engine —');
{
  const { slide, spawn, hasMoves, emptyCells, BLOCKER, EMPTY, ALL_DIRS } = await import(
    '../src/games/game2048/logic/engine'
  );
  const { RULES } = await import('../src/games/game2048/logic/config');
  const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rowGrid = (vals: number[]) => {
    const g = new Array(16).fill(0);
    for (let i = 0; i < 4; i++) g[i] = vals[i];
    return g;
  };
  const colGrid = (vals: number[]) => {
    const g = new Array(16).fill(0);
    for (let i = 0; i < 4; i++) g[i * 4] = vals[i];
    return g;
  };
  const eq = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

  // 1) slide correctness table
  type Case = { name: string; grid: number[]; dir: 'left' | 'right' | 'up'; row?: number[]; col?: number[]; gained: number; merges: number; moved: boolean };
  const cases: Case[] = [
    { name: '[2,2,0,0]←', grid: rowGrid([2, 2, 0, 0]), dir: 'left', row: [4, 0, 0, 0], gained: 4, merges: 1, moved: true },
    { name: '[2,0,2,0]←', grid: rowGrid([2, 0, 2, 0]), dir: 'left', row: [4, 0, 0, 0], gained: 4, merges: 1, moved: true },
    { name: '[2,2,2,0]←', grid: rowGrid([2, 2, 2, 0]), dir: 'left', row: [4, 2, 0, 0], gained: 4, merges: 1, moved: true },
    { name: '[2,2,2,2]←', grid: rowGrid([2, 2, 2, 2]), dir: 'left', row: [4, 4, 0, 0], gained: 8, merges: 2, moved: true },
    { name: '[4,4,8,8]←', grid: rowGrid([4, 4, 8, 8]), dir: 'left', row: [8, 16, 0, 0], gained: 24, merges: 2, moved: true },
    { name: '[2,4,2,4]←', grid: rowGrid([2, 4, 2, 4]), dir: 'left', row: [2, 4, 2, 4], gained: 0, merges: 0, moved: false },
    { name: 'blocker[2,-1,2,0]←', grid: rowGrid([2, BLOCKER, 2, 0]), dir: 'left', row: [2, BLOCKER, 2, 0], gained: 0, merges: 0, moved: false },
    { name: '[2,0,0,2]→', grid: rowGrid([2, 0, 0, 2]), dir: 'right', row: [0, 0, 0, 4], gained: 4, merges: 1, moved: true },
    { name: 'col[2,2,0,0]↑', grid: colGrid([2, 2, 0, 0]), dir: 'up', col: [4, 0, 0, 0], gained: 4, merges: 1, moved: true }
  ];
  let tableOk = 0;
  for (const c of cases) {
    const r = slide(c.grid, c.dir);
    const line = c.row ? [r.grid[0], r.grid[1], r.grid[2], r.grid[3]] : [r.grid[0], r.grid[4], r.grid[8], r.grid[12]];
    const want = c.row ?? c.col!;
    const good = eq(line, want) && r.gained === c.gained && r.merges.length === c.merges && r.moved === c.moved;
    if (good) tableOk++;
    else {
      failed = true;
      console.error(`✗ slide ${c.name}: got line=[${line}] gained=${r.gained} merges=${r.merges.length} moved=${r.moved}`);
    }
  }
  console.log(`✓ slide table: ${tableOk}/${cases.length} cases correct`);

  // 2) hasMoves detects dead vs live boards
  const dead = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  const deadWithBlocker = dead.slice();
  deadWithBlocker[5] = BLOCKER;
  const liveEmpty = dead.slice();
  liveEmpty[5] = EMPTY;
  const liveMerge = dead.slice();
  liveMerge[0] = 4; // now (0,0)=4 equals (0,1)=4
  const hmChecks = [
    !hasMoves(dead),
    !hasMoves(deadWithBlocker),
    hasMoves(liveEmpty),
    hasMoves(liveMerge)
  ];
  if (hmChecks.every(Boolean)) console.log('✓ hasMoves: dead/blocked boards locked, empty & mergeable boards open');
  else {
    failed = true;
    console.error(`✗ hasMoves misfired: [${hmChecks}]`);
  }

  // 3) random-move soundness: 25 sequences per difficulty keep the invariants
  //    (sum of tiles conserved by a slide, blocker count preserved, tile
  //    count drops by exactly the merge count, spawns land only in empties).
  const posCount = (g: number[]) => g.filter((v) => v > 0).length;
  const posSum = (g: number[]) => g.reduce((s, v) => s + (v > 0 ? v : 0), 0);
  const blkCount = (g: number[]) => g.filter((v) => v === BLOCKER).length;

  for (const [diff, rules] of Object.entries(RULES)) {
    let ok = 0;
    for (let seed = 0; seed < 25; seed++) {
      const rng = mulberry32(seed * 2654435761 + diff.length * 40503);
      let grid = new Array(rules.size * rules.size).fill(0);
      const s1 = spawn(grid, rng, rules.fourChance);
      if (s1) grid = s1.grid;
      const s2 = spawn(grid, rng, rules.fourChance);
      if (s2) grid = s2.grid;
      if (rules.blockers) {
        const em = emptyCells(grid);
        if (em.length) grid[em[Math.floor(rng() * em.length)]] = BLOCKER;
      }
      let good = true;
      for (let step = 0; step < 80 && good; step++) {
        if (!hasMoves(grid)) break;
        // pick a legal direction
        const dirs = [...ALL_DIRS].sort(() => rng() - 0.5);
        let applied = false;
        for (const dir of dirs) {
          const r = slide(grid, dir);
          if (!r.moved) continue;
          applied = true;
          if (posCount(r.grid) !== posCount(grid) - r.merges.length) good = false;
          if (posSum(r.grid) !== posSum(grid)) good = false;
          if (blkCount(r.grid) !== blkCount(grid)) good = false;
          const mergedSum = r.merges.reduce((s, i) => s + r.grid[i], 0);
          if (mergedSum !== r.gained) good = false;
          // spawn lands only in an empty cell, adds exactly one 2 or 4
          const emptyBefore = emptyCells(r.grid).length;
          const sp = spawn(r.grid, rng, rules.fourChance);
          if (sp) {
            if (r.grid[sp.index] !== EMPTY) good = false;
            if (sp.value !== 2 && sp.value !== 4) good = false;
            if (emptyCells(sp.grid).length !== emptyBefore - 1) good = false;
            grid = sp.grid;
          } else {
            grid = r.grid;
          }
          break;
        }
        if (!applied) break;
      }
      if (good) ok++;
      else {
        failed = true;
        console.error(`✗ 2048 ${diff}: invariant broken on seed ${seed}`);
      }
    }
    console.log(`✓ 2048 ${diff}: ${ok}/25 random-move sequences sound (target ${rules.target}, ${rules.size}x${rules.size})`);
  }
}

// ---- paste into scripts/validate.ts (anywhere before the final `if (failed)` block) ----
console.log('— Math Sprint problems —');
{
  const { TIERS, makeProblem, answerOf, problemTokens } = await import(
    '../src/games/math-sprint/logic/problems'
  );
  const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ap = (x: number, o: string, y: number) =>
    o === '+' ? x + y : o === '-' ? x - y : o === '*' ? x * y : x / y;
  const hi = (o: string) => o === '*' || o === '/';
  const STREAKS = [0, 3, 6, 10, 16];

  for (const [diff, cfg] of Object.entries(TIERS)) {
    let ok = 0;
    const N = 25;
    const kinds = new Set<string>();
    for (let s = 0; s < N; s++) {
      const rng = mulberry32(4021 * (s + 1));
      let good = true;
      for (let r = 0; r < STREAKS.length * 5; r++) {
        const p = makeProblem(cfg, STREAKS[r % STREAKS.length], rng);
        kinds.add(p.kind);
        const ans = answerOf(p);
        // answers are always non-negative integers within 4 digits
        if (!Number.isInteger(ans) || ans < 0 || ans > 9999) {
          good = false;
          break;
        }
        // the equation renders with exactly one answer slot
        if (problemTokens(p).filter((t) => t.t === 'slot').length !== 1) {
          good = false;
          break;
        }
        if (p.kind === 'binary') {
          if (ap(p.a, p.op, p.b) !== ans || (p.op === '/' && p.a % p.b !== 0)) good = false;
        } else if (p.kind === 'twostep') {
          if (p.op1 === '/' || p.op2 === '/') good = false; // two-step never divides
          const e =
            !hi(p.op1) && hi(p.op2)
              ? ap(p.a, p.op1, ap(p.b, p.op2, p.c))
              : ap(ap(p.a, p.op1, p.b), p.op2, p.c);
          if (e !== ans) good = false; // precedence honoured
        } else if (p.kind === 'missing') {
          const target = ap(p.a, p.op, p.b);
          const plug = (v: number) => (p.blank === 'a' ? ap(v, p.op, p.b) : ap(p.a, p.op, v));
          if (!Number.isInteger(target) || target < 0 || plug(ans) !== target) good = false; // unique integer solution
        } else if (p.kind === 'square') {
          if (p.a * p.a !== ans || p.a < cfg.sqMin || p.a > cfg.sqMax) good = false;
        }
        if (!good) break;
      }
      if (good) ok++;
    }
    if (ok === N) {
      console.log(`✓ ${diff}: ${ok}/${N} seeds sound (5 streak levels) — kinds {${[...kinds].join(', ')}}`);
    } else {
      failed = true;
      console.error(`✗ ${diff}: only ${ok}/${N} seeds sound`);
    }
  }
}


console.log('— Make 24 deals —');
{
  const { generateDeal, solve, DIFF_CONFIG } = await import(
    '../src/games/make-24/logic/generator'
  );
for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
  const cfg = DIFF_CONFIG[difficulty];
  let ok = 0;
  const N = 25;
  for (let s = 0; s < N; s++) {
    const seed = 4200 + s * 13;
    const deal = generateDeal({ seed, difficulty });
    const problems: string[] = [];

    for (const c of deal.cards) {
      if (!Number.isInteger(c) || c < cfg.poolMin || c > cfg.poolMax) {
        problems.push(`card ${c} outside pool ${cfg.poolMin}..${cfg.poolMax}`);
      }
    }
    if (!cfg.targets.includes(deal.target)) problems.push(`target ${deal.target} not allowed`);

    const sol = solve(deal.cards, deal.target);
    if (!sol) {
      problems.push('no solution found');
    } else {
      const evalNode = (n: typeof sol): { n: number; d: number } => {
        if (!n.op) return n.value;
        const a = evalNode(n.a!);
        const b = evalNode(n.b!);
        const g = (x: number, y: number): number => {
          x = Math.abs(x); y = Math.abs(y);
          while (y) { [x, y] = [y, x % y]; }
          return x || 1;
        };
        const red = (num: number, den: number) => {
          if (den < 0) { num = -num; den = -den; }
          const k = g(num, den);
          return { n: num / k, d: den / k };
        };
        switch (n.op) {
          case '+': return red(a.n * b.d + b.n * a.d, a.d * b.d);
          case '-': return red(a.n * b.d - b.n * a.d, a.d * b.d);
          case '*': return red(a.n * b.n, a.d * b.d);
          case '/': return red(a.n * b.d, a.d * b.n);
        }
      };
      const v = evalNode(sol);
      if (!(v.d === 1 && v.n === deal.target)) {
        problems.push(`solution evaluates to ${v.n}/${v.d}, not ${deal.target}`);
      }
      const leaves: number[] = [];
      const collect = (n: typeof sol): void => {
        if (!n.op) leaves.push(n.value.n / n.value.d);
        else { collect(n.a!); collect(n.b!); }
      };
      collect(sol);
      const used = leaves.slice().sort((x, y) => x - y);
      const dealt = deal.cards.slice().sort((x, y) => x - y);
      if (used.length !== dealt.length || used.some((x, i) => x !== dealt[i])) {
        problems.push(`solution uses [${used}] not the dealt [${dealt}]`);
      }
    }

    if (cfg.requireFraction && !deal.requiresFraction) problems.push('does not require a fraction');

    if (JSON.stringify(generateDeal({ seed, difficulty })) !== JSON.stringify(deal)) {
      problems.push('non-deterministic for the same seed');
    }

    if (problems.length > 0) {
      failed = true;
      console.error(`✗ make-24/${difficulty} seed ${seed} [${deal.cards}]→${deal.target}: ${problems.join('; ')}`);
    } else {
      ok++;
    }
  }
  console.log(`${ok === N ? '✓' : '✗'} make-24/${difficulty}: ${ok}/${N} deals sound`);
}
}

console.log('— Tower of Hanoi —');
{
  const { optimalMoves, solveHanoi } = await import('../src/games/tower-of-hanoi/logic/hanoi');
  type Move = { from: number; to: number };

  // simulate a move list from the canonical start; throws on any illegal move
  const simulate = (moves: Move[], n: number, pegs: number): number[][] => {
    const stacks: number[][] = Array.from({ length: pegs }, () => []);
    for (let s = n; s >= 1; s--) stacks[0].push(s); // bottom(n) … top(1)
    for (const mv of moves) {
      const from = stacks[mv.from];
      const to = stacks[mv.to];
      if (from.length === 0) throw new Error('move from empty peg');
      const disc = from[from.length - 1];
      const destTop = to.length ? to[to.length - 1] : Infinity;
      if (disc >= destTop) throw new Error(`illegal: disc ${disc} onto ${destTop}`);
      to.push(from.pop()!);
    }
    return stacks;
  };

  // 3-peg optimum is 2^n − 1 for n = 3..7
  for (let n = 3; n <= 7; n++) {
    const got = optimalMoves(n, 3);
    if (got !== 2 ** n - 1) {
      console.log(`  FAIL optimalMoves(${n},3)=${got} expected ${2 ** n - 1}`);
      failed = true;
    }
  }

  // 4-peg Frame–Stewart reference: 7 discs / 4 pegs = 25
  if (optimalMoves(7, 4) !== 25) {
    console.log(`  FAIL optimalMoves(7,4)=${optimalMoves(7, 4)} expected 25`);
    failed = true;
  }
  const fs4 = [1, 3, 5, 9, 13, 17, 25]; // n = 1..7
  for (let n = 1; n <= 7; n++) {
    if (optimalMoves(n, 4) !== fs4[n - 1]) {
      console.log(`  FAIL optimalMoves(${n},4)=${optimalMoves(n, 4)} expected ${fs4[n - 1]}`);
      failed = true;
    }
  }

  // solveHanoi returns a legal, optimal-length sequence that transfers the stack
  const suites: { n: number; pegs: number }[] = [];
  for (let n = 1; n <= 8; n++) suites.push({ n, pegs: 3 });
  for (let n = 1; n <= 7; n++) suites.push({ n, pegs: 4 });
  let ok = 0;
  for (const { n, pegs } of suites) {
    const moves = solveHanoi(n, pegs) as Move[];
    const par = optimalMoves(n, pegs);
    if (moves.length !== par) {
      console.log(`  FAIL solveHanoi(${n},${pegs}) length ${moves.length} != par ${par}`);
      failed = true;
      continue;
    }
    try {
      const final = simulate(moves, n, pegs);
      const target = pegs - 1;
      const solved = final[target].length === n && final.every((s, i) => i === target || s.length === 0);
      if (!solved) {
        console.log(`  FAIL solveHanoi(${n},${pegs}) did not transfer the stack`);
        failed = true;
        continue;
      }
    } catch (e) {
      console.log(`  FAIL solveHanoi(${n},${pegs}) illegal move: ${(e as Error).message}`);
      failed = true;
      continue;
    }
    ok++;
  }
  console.log(`  solveHanoi legal + optimal + transfers: ${ok}/${suites.length}`);
}

console.log('— Target Number generator —');
{
  const { CONFIG, SMALL_POOL, LARGE_POOL, generateRound, bestSolution, verifySolution, isLarge } =
    await import('../src/games/target-number/logic/generator');
  const bases: Record<string, number> = {
    easy: 71000, medium: 72000, hard: 73000, pro: 74000, extreme: 75000
  };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = CONFIG[difficulty];
    let ok = 0;
    let stepSum = 0;
    let divRounds = 0;
    const t0 = Date.now();
    for (let seed = bases[difficulty]; seed < bases[difficulty] + 25; seed++) {
      try {
        const r = generateRound({ seed, difficulty });

        // tile pools + counts
        const smalls = r.numbers.filter((v: number) => !isLarge(v));
        const larges = r.numbers.filter((v: number) => isLarge(v));
        if (smalls.length !== cfg.small || larges.length !== cfg.large) {
          console.error(`✗ ${difficulty}/seed ${seed}: bad tile mix ${JSON.stringify(r.numbers)}`);
          continue;
        }
        if (
          !smalls.every((v: number) => SMALL_POOL.includes(v)) ||
          !larges.every((v: number) => LARGE_POOL.includes(v)) ||
          new Set(larges).size !== larges.length
        ) {
          console.error(`✗ ${difficulty}/seed ${seed}: tile outside pool / dup large`);
          continue;
        }

        // target strictly inside the tier range
        if (r.target < cfg.targetLo || r.target > cfg.targetHi) {
          console.error(`✗ ${difficulty}/seed ${seed}: target ${r.target} out of range`);
          continue;
        }

        // target exactly reachable via bestSolution
        const bs = bestSolution(r.numbers, r.target);
        if (!bs.exact || bs.value !== r.target) {
          console.error(`✗ ${difficulty}/seed ${seed}: target ${r.target} not exactly reachable`);
          continue;
        }

        // the round's solution AND bestSolution's witness both replay legally
        // (each tile ≤ once, only even division) to the claimed value
        const v1 = verifySolution(r.numbers, r.solution);
        const v2 = verifySolution(r.numbers, bs);
        if (!v1.ok || r.solution.value !== r.target || !v2.ok) {
          console.error(
            `✗ ${difficulty}/seed ${seed}: solution invalid — ${v1.reason ?? v2.reason ?? 'value mismatch'}`
          );
          continue;
        }

        ok++;
        stepSum += r.solution.steps.length;
        if (r.solution.steps.some((s) => s.op === '÷')) divRounds++;
      } catch (err) {
        console.error(`✗ ${difficulty}/seed ${seed}: ${(err as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 rounds sound`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 exact & legal (${cfg.small}s+${cfg.large}L → [${cfg.targetLo},${cfg.targetHi}]), ` +
          `~${(stepSum / 25).toFixed(1)} steps, ${divRounds} use ÷, ${Date.now() - t0}ms`
      );
    }
  }
}

console.log('— Pipes generator —');
{
  const {
    generatePipes,
    PIPES_CONFIG,
    rot4,
    minTaps,
    isSolved,
    floodWatered,
    popcount,
    neighborIndex,
    oppDir,
    DIRS
  } = await import('../src/games/pipes/logic/generator');
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = PIPES_CONFIG[difficulty];
    const n = cfg.size * cfg.size;
    let ok = 0;
    let parSum = 0;
    for (let seed = 7000; seed < 7025; seed++) {
      const p = generatePipes({ seed, difficulty });
      let sound = true;

      // solved orientation is one fully-connected, leak-free network
      if (!isSolved(p.solved, p.size, p.wrap, p.source)) sound = false;

      // every cell — and every drain — is watered when solved
      const watered = floodWatered(p.solved, p.size, p.wrap, p.source);
      if (!watered.every(Boolean)) sound = false;
      if (p.drains.length === 0) sound = false;
      for (const d of p.drains) {
        if (popcount(p.solved[d]) !== 1 || d === p.source || !watered[d]) sound = false;
      }

      // spanning tree: n-1 symmetric edges, none pointing off a non-wrap edge
      let conn = 0;
      for (let i = 0; i < n; i++) {
        for (const dir of DIRS) {
          if (!(p.solved[i] & dir)) continue;
          conn++;
          const nb = neighborIndex(i, dir, p.size, p.wrap);
          if (nb < 0 || !(p.solved[nb] & oppDir(dir))) sound = false;
        }
      }
      if (conn / 2 !== n - 1) sound = false;

      // scramble is non-trivial, and rotating each tile to solved wins
      const start = p.solved.map((m, i) => rot4(m, p.startRot[i]));
      if (isSolved(start, p.size, p.wrap, p.source)) sound = false;
      const cleared = p.solved.map((m, i) => rot4(m, p.startRot[i] + minTaps(m, p.startRot[i])));
      if (!isSolved(cleared, p.size, p.wrap, p.source)) sound = false;

      // par equals the summed minimal taps
      let parCalc = 0;
      for (let i = 0; i < n; i++) parCalc += minTaps(p.solved[i], p.startRot[i]);
      if (parCalc !== p.par || p.par <= 0) sound = false;

      if (sound) {
        ok++;
        parSum += p.par;
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 sound Pipes boards`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 solvable spanning-tree networks — ${cfg.size}×${cfg.size}${cfg.wrap ? ' torus' : ''}, avg par ${Math.round(parSum / 25)}`
      );
    }
  }
}

console.log('— Sequence Cracker —');
{
  const { generateSequence, checkAnswer, continuationIsUnique, TIERS } = await import(
    '../src/games/sequence-cracker/logic/generator'
  );
  const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
  const BOUND = 20000;
  for (const difficulty of diffs) {
    const tier = TIERS[difficulty];
    const fams = new Set<string>();
    let ok = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const p = generateSequence({ difficulty, seed });
      const problems: string[] = [];
      fams.add(p.family);
      // family belongs to this tier's set
      if (!tier.families.includes(p.family)) problems.push(`family ${p.family} not in tier`);
      // hidden term(s) are the trailing positions
      const expectHidden = p.mode === 'choice' ? 1 : tier.hidden;
      if (p.hiddenIdx.length !== expectHidden) problems.push('wrong hidden count');
      for (let h = 0; h < p.hiddenIdx.length; h++) {
        if (p.hiddenIdx[h] !== p.terms.length - p.hiddenIdx.length + h) problems.push('hidden not trailing');
      }
      // answers + terms are integers within sane bounds
      for (const v of [...p.terms, ...p.answers]) {
        if (!Number.isInteger(v) || Math.abs(v) > BOUND) problems.push(`out of bounds ${v}`);
      }
      // the checker accepts the intended answer and rejects a perturbation
      if (!checkAnswer(p, p.answers)) problems.push('checker rejects intended answer');
      if (checkAnswer(p, p.answers.map((a) => a + 1))) problems.push('checker accepts wrong answer');
      // the visible prefix is not satisfied by a competing simple rule
      if (!continuationIsUnique(p.terms, p.hiddenIdx, p.answers)) problems.push('ambiguous prefix');
      // choice puzzles: exactly 4 distinct options including the answer
      if (p.mode === 'choice') {
        if (!p.options || p.options.length !== 4 || new Set(p.options).size !== 4)
          problems.push('bad options');
        else if (!p.options.includes(p.answers[0])) problems.push('answer not among options');
      } else if (p.options) {
        problems.push('exact mode has options');
      }
      // deterministic under a fixed seed
      const again = generateSequence({ difficulty, seed });
      if (JSON.stringify(again.terms) !== JSON.stringify(p.terms)) problems.push('non-deterministic');

      if (problems.length) {
        failed = true;
        console.error(`✗ sequence-cracker/${difficulty} seed ${seed}: ${problems.join('; ')}`);
      } else {
        ok++;
      }
    }
    console.log(`✓ ${difficulty}: ${ok}/25 sound — families: ${[...fams].join(', ')}`);
  }
}

console.log('— Laser Mirrors —');
{
  const { generatePuzzle, traceBeam, gridFromOrients } = await import('../src/games/laser-mirrors/logic/generator');
  const SIZE: Record<string, [number, number]> = {
    easy: [6, 6],
    medium: [7, 7],
    hard: [8, 8],
    pro: [8, 8],
    extreme: [10, 10]
  };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    let ok = 0;
    const [er, ec] = SIZE[difficulty];
    for (let seed = 1; seed <= 25; seed++) {
      const p = generatePuzzle({ seed, difficulty });
      const n = p.rows * p.cols;
      let bad = '';

      // determinism per seed
      if (JSON.stringify(p) !== JSON.stringify(generatePuzzle({ seed, difficulty }))) bad = 'non-deterministic';

      // grid within tier size
      if (!bad && (p.rows !== er || p.cols !== ec)) bad = `size ${p.rows}x${p.cols}`;

      // the constructed solution lights ALL targets and terminates
      if (!bad) {
        const solOr = new Array(n).fill(null);
        for (const m of p.solutionMirrors) solOr[m.cell] = m.orient;
        const t = traceBeam(gridFromOrients(p, solOr), p.source);
        if (!t.terminated) bad = 'solution trace ran away';
        else if (!t.hitAll || t.targetsHit.length !== p.targets.length) bad = 'solution misses targets';
      }

      // the scrambled start is well-formed and terminates (no infinite loop)
      if (!bad) {
        const startOr = new Array(n).fill(null);
        for (const m of p.fixedMirrors) startOr[m.cell] = m.orient;
        if (!traceBeam(gridFromOrients(p, startOr), p.source).terminated) bad = 'start trace ran away';
      }

      // structural: no overlapping roles, tray + fixed == solution mirror count
      if (!bad) {
        const used = new Set([p.source.cell, ...p.targets, ...p.walls, ...p.solutionMirrors.map((m) => m.cell)]);
        if (used.size !== 1 + p.targets.length + p.walls.length + p.solutionMirrors.length) bad = 'overlapping cells';
        else if (p.fixedMirrors.length + p.trayCount !== p.solutionMirrors.length) bad = 'fixed+tray mismatch';
        else if ((p.mode === 'place') !== (p.trayCount > 0)) bad = 'mode/tray mismatch';
      }

      if (bad) {
        failed = true;
        console.error(`✗ laser-mirrors ${difficulty}#${seed}: ${bad}`);
      } else {
        ok++;
      }
    }
    console.log(`${ok === 25 ? '✓' : '✗'} laser-mirrors ${difficulty}: ${ok}/25 solvable-by-construction`);
    if (ok !== 25) failed = true;
  }
}

console.log('— Sokoban generator —');
{
  const { generateSokoban } = await import('../src/games/sokoban/logic/generator');
  const { tryMove, isSolved } = await import('../src/games/sokoban/logic/engine');
  const { solve, deadlockedCrates, computeDeadSquares } = await import(
    '../src/games/sokoban/logic/solver'
  );
  const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
  for (const difficulty of diffs) {
    let ok = 0;
    const t0 = Date.now();
    for (let seed = 7000; seed < 7025; seed++) {
      try {
        const p = generateSokoban({ seed, difficulty });
        const board = { width: p.width, height: p.height, walls: p.walls };

        // the reverse-construction invariant: replaying the derived forward
        // solution from the scrambled start must reach the solved state
        let crates = p.crates.slice();
        let player = p.player;
        let replayOk = true;
        for (const dir of p.solution) {
          const r = tryMove(board, crates, player, dir);
          if (!r) {
            replayOk = false;
            break;
          }
          crates = r.crates;
          player = r.player;
        }
        replayOk = replayOk && isSolved(crates, p.targets);

        const floorOk =
          !p.walls[p.player] &&
          p.crates.every((c) => !p.walls[c]) &&
          p.targets.every((t) => !p.walls[t]);
        const countOk = p.crates.length === p.targets.length && p.crates.length > 0;
        const noOverlap = new Set(p.crates).size === p.crates.length && !p.crates.includes(p.player);
        const parOk = p.parPushes > 0;
        const notSolved = !isSolved(p.crates, p.targets);
        const noStartDeadlock = deadlockedCrates(p, p.crates, computeDeadSquares(p)).length === 0;

        // small tiers: an independent push-optimal A* confirms solvability
        let solverOk = true;
        if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
          const s = solve(p, p.crates, p.player, 200000);
          solverOk = !!s && s.pushes > 0 && s.pushes <= p.parPushes;
        }

        if (
          replayOk &&
          floorOk &&
          countOk &&
          noOverlap &&
          parOk &&
          notSolved &&
          noStartDeadlock &&
          solverOk
        )
          ok++;
      } catch {
        // any throw counts as a failure for this seed
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ sokoban ${difficulty}: only ${ok}/25 always-solvable puzzles`);
    } else {
      console.log(
        `✓ sokoban ${difficulty}: 25/25 solvable (reverse-replay + A* on small tiers), par>0, crates==targets, on floor, ${Date.now() - t0}ms`
      );
    }
  }
}

console.log('— Untangle (planarity) generator —');
{
  const { CONFIG, generateGraph, countCrossings } = await import(
    '../src/games/untangle/logic/generator'
  );
  const bases: Record<string, number> = { easy: 9100, medium: 9200, hard: 9300, pro: 9400, extreme: 9500 };
  for (const difficulty of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    const cfg = CONFIG[difficulty];
    const cap = 3 * cfg.nodes - 6;
    let ok = 0;
    let startCrossSum = 0;
    const t0 = Date.now();
    for (let seed = bases[difficulty]; seed < bases[difficulty] + 25; seed++) {
      try {
        const g = generateGraph({ seed, difficulty });
        const solved = g.nodes.map((n) => n.solved);
        const start = g.nodes.map((n) => n.start);
        const problems: string[] = [];
        // node/edge counts match the tier; edges under the planar cap
        if (g.nodes.length !== cfg.nodes) problems.push(`${g.nodes.length} nodes != ${cfg.nodes}`);
        if (g.edges.length !== cfg.edges) problems.push(`${g.edges.length} edges != ${cfg.edges}`);
        if (g.edges.length > cap) problems.push(`edges > 3n-6 (${cap})`);
        // the graph is truly planar as constructed: solved layout has 0 crossings
        if (countCrossings(solved, g.edges) !== 0) problems.push('solved layout has crossings');
        // every edge joins two distinct valid nodes, no duplicates
        const seen = new Set<string>();
        for (const e of g.edges) {
          if (e.a === e.b || e.a < 0 || e.b < 0 || e.a >= cfg.nodes || e.b >= cfg.nodes)
            problems.push(`bad edge ${e.a}-${e.b}`);
          const k = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
          if (seen.has(k)) problems.push('duplicate edge');
          seen.add(k);
        }
        // graph is connected (drag-as-one-web)
        const adj: number[][] = Array.from({ length: cfg.nodes }, () => []);
        g.edges.forEach((e) => {
          adj[e.a].push(e.b);
          adj[e.b].push(e.a);
        });
        const vis = new Array(cfg.nodes).fill(false);
        const st = [0];
        vis[0] = true;
        let cnt = 1;
        while (st.length) {
          const u = st.pop() as number;
          for (const v of adj[u]) if (!vis[v]) { vis[v] = true; cnt++; st.push(v); }
        }
        if (cnt !== cfg.nodes) problems.push(`disconnected (${cnt}/${cfg.nodes})`);
        // scrambled start is well-formed and actually tangled
        for (const arr of [solved, start]) {
          if (arr.length !== cfg.nodes) problems.push('position array length');
          for (const p of arr) if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) problems.push('position out of [0,1]');
        }
        const sc = countCrossings(start, g.edges);
        startCrossSum += sc;
        if (sc === 0) problems.push('start already solved');
        // deterministic per seed
        if (JSON.stringify(generateGraph({ seed, difficulty })) !== JSON.stringify(g))
          problems.push('not deterministic');

        if (problems.length) {
          console.error(`✗ ${difficulty}/seed ${seed}: ${problems.join('; ')}`);
        } else ok++;
      } catch (err) {
        console.error(`✗ ${difficulty}/seed ${seed}: ${(err as Error).message}`);
      }
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/25 seeds produced sound graphs`);
    } else {
      console.log(
        `✓ ${difficulty}: 25/25 planar & solvable (${cfg.nodes} nodes, ${cfg.edges} edges ≤ ${cap}), avg ${(startCrossSum / 25).toFixed(1)} start crossings, ${Date.now() - t0}ms`
      );
    }
  }
}

console.log('— Jigsaw geometry —');
{
  const { makePuzzle, piecePath, isBorderPiece } = await import('../src/games/jigsaw/logic/pieces');
  const tiers = [
    { name: 'easy', rows: 3, cols: 4, rotate: false },
    { name: 'medium', rows: 4, cols: 5, rotate: false },
    { name: 'hard', rows: 5, cols: 6, rotate: false },
    { name: 'pro', rows: 6, cols: 7, rotate: true },
    { name: 'extreme', rows: 7, cols: 8, rotate: true }
  ];
  for (const t of tiers) {
    let ok = 0;
    for (let s = 0; s < 25; s++) {
      const seed = 4200 + s * 13;
      const pz = makePuzzle({ seed, rows: t.rows, cols: t.cols, rotate: t.rotate });
      let sound = pz.pieces.length === t.rows * t.cols;

      // correctPos covers every cell exactly once
      const seen = new Set<string>();
      for (const p of pz.pieces) seen.add(`${p.correctPos.row},${p.correctPos.col}`);
      if (seen.size !== t.rows * t.cols) sound = false;

      const at = (r: number, c: number) => pz.pieces.find((p) => p.row === r && p.col === c)!;
      for (const p of pz.pieces) {
        const { top, right, bottom, left } = p.edges;
        // border edges flat
        if (p.row === 0 && top !== 0) sound = false;
        if (p.col === 0 && left !== 0) sound = false;
        if (p.row === t.rows - 1 && bottom !== 0) sound = false;
        if (p.col === t.cols - 1 && right !== 0) sound = false;
        // interior edges: a tab always meets the neighbour's complementary blank
        if (p.col < t.cols - 1) {
          const nb = at(p.row, p.col + 1);
          if (right === 0 || right + nb.edges.left !== 0) sound = false;
        }
        if (p.row < t.rows - 1) {
          const nb = at(p.row + 1, p.col);
          if (bottom === 0 || bottom + nb.edges.top !== 0) sound = false;
        }
        // path generator returns a closed path; interior pieces carry a bezier tab
        const d = piecePath(p.edges, 100);
        if (!d.startsWith('M') || !d.trimEnd().endsWith('Z')) sound = false;
        if (!isBorderPiece(p, t.rows, t.cols) && !d.includes('C')) sound = false;
        // rotation stays a multiple of 90 and only appears on rotation tiers
        if (p.rotation % 90 !== 0 || (!t.rotate && p.rotation !== 0)) sound = false;
      }

      // seeded determinism: same seed reproduces edges + scatter exactly
      const pz2 = makePuzzle({ seed, rows: t.rows, cols: t.cols, rotate: t.rotate });
      for (let i = 0; i < pz.pieces.length; i++) {
        const a = pz.pieces[i];
        const b = pz2.pieces[i];
        if (
          JSON.stringify(a.edges) !== JSON.stringify(b.edges) ||
          a.currentPos.x !== b.currentPos.x ||
          a.currentPos.y !== b.currentPos.y ||
          a.rotation !== b.rotation
        ) {
          sound = false;
          break;
        }
      }

      if (sound) ok++;
    }
    if (ok < 25) {
      failed = true;
      console.error(`✗ ${t.name}: only ${ok}/25 sound Jigsaw puzzles`);
    } else {
      console.log(
        `✓ ${t.name}: 25/25 sound — ${t.rows}×${t.cols} = ${t.rows * t.cols} pieces, complementary edges${t.rotate ? ', rotation' : ''}`
      );
    }
  }
}

console.log('— Gridlock —');
{
  const { generateGridlock, solve, startPositions, cellsOf, BANDS, SIZE, EXIT_ROW } =
    await import('../src/games/gridlock/logic/generator');
  const { BANK } = await import('../src/games/gridlock/logic/puzzles');
  const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
  for (const difficulty of diffs) {
    // at least 25 seeded puzzles, and enough to cover the whole tier bank
    const count = Math.max(25, BANK[difficulty].length);
    let ok = 0;
    let mn = Infinity;
    let mx = -Infinity;
    const t0 = Date.now();
    const [lo, hi] = BANDS[difficulty];
    for (let seed = 0; seed < count; seed++) {
      const pz = generateGridlock({ seed, difficulty });
      const red = pz.pieces[pz.redId];
      // red car: horizontal, length 2, on the exit row
      const redOk = red.orient === 'h' && red.row === EXIT_ROW && red.len === 2;
      // start layout has no overlaps / out-of-bounds cells
      const grid = new Int8Array(SIZE * SIZE).fill(-1);
      let clean = true;
      for (const p of pz.pieces) {
        for (const c of cellsOf(p, p.orient === 'h' ? p.col : p.row)) {
          if (c < 0 || c >= SIZE * SIZE || grid[c] !== -1) {
            clean = false;
            break;
          }
          grid[c] = p.id;
        }
      }
      // independently BFS-solve: reaches the exit, par matches, within band
      const res = solve(pz.pieces, startPositions(pz.pieces), pz.redId, 400_000);
      const solvable = res.minMoves > 0;
      const parOk = res.minMoves === pz.minMoves;
      const banded = pz.minMoves >= lo && pz.minMoves <= hi;
      if (redOk && clean && solvable && parOk && banded) {
        ok++;
        mn = Math.min(mn, pz.minMoves);
        mx = Math.max(mx, pz.minMoves);
      } else {
        failed = true;
        console.error(
          `  ✗ ${difficulty} seed ${seed}: red=${redOk} clean=${clean} solvable=${solvable} par=${parOk} (gen ${pz.minMoves}/bfs ${res.minMoves}) band=${banded}`
        );
      }
    }
    if (ok < count) {
      failed = true;
      console.error(`✗ ${difficulty}: only ${ok}/${count} sound`);
    } else {
      console.log(
        `✓ ${difficulty}: ${ok}/${count} solvable, par ${mn}-${mx} within band ${lo}-${hi}, ${Date.now() - t0}ms`
      );
    }
  }
}

console.log('— Tangram figures —');
{
  const { transformPlacement, isSolved, area, intersectionArea, PIECE_SET, buildTarget, silhouetteLoops } =
    await import('../src/games/tangram/logic/geometry');
  const { allPuzzles, PUZZLES } = await import('../src/games/tangram/logic/puzzles');

  for (const d of ['easy', 'medium', 'hard', 'pro', 'extreme'] as const) {
    if (!PUZZLES[d] || PUZZLES[d].length < 1) {
      failed = true;
      console.error(`✗ tangram: difficulty ${d} has no puzzle`);
    }
  }

  const want = [...PIECE_SET].sort().join(',');
  let ok = 0;
  const puzzles = allPuzzles();
  for (const p of puzzles) {
    const target = buildTarget(p.solution);
    const pieces = p.solution.map(transformPlacement);
    let bad = false;

    // exactly the seven tangram pieces
    if (p.solution.map((s) => s.kind).sort().join(',') !== want) {
      console.error(`✗ tangram ${p.id}: not the seven tangram pieces`);
      bad = true;
    }
    // piece areas sum to the target area (the full tangram area, 8)
    const total = pieces.reduce((s, poly) => s + area(poly), 0);
    if (Math.abs(total - target.totalArea) > 1e-6 || Math.abs(total - 8) > 1e-6) {
      console.error(`✗ tangram ${p.id}: area ${total} != target ${target.totalArea}`);
      bad = true;
    }
    // no two pieces overlap
    let overlap = 0;
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++) overlap += intersectionArea(pieces[i], pieces[j]);
    if (overlap > 1e-6) {
      console.error(`✗ tangram ${p.id}: pieces overlap by ${overlap.toFixed(5)}`);
      bad = true;
    }
    // the authored arrangement fully covers the silhouette within tolerance
    if (!isSolved(pieces, target)) {
      console.error(`✗ tangram ${p.id}: solved arrangement rejected by isSolved`);
      bad = true;
    }
    // the silhouette must have a closed outline
    if (silhouetteLoops(target.polys).length < 1) {
      console.error(`✗ tangram ${p.id}: silhouette has no outline`);
      bad = true;
    }
    if (bad) failed = true;
    else ok++;
  }
  if (ok === puzzles.length) {
    console.log(`✓ tangram: ${ok}/${puzzles.length} figures valid (full coverage, no overlap, within target)`);
  }
}

console.log('— Reversi —');
{
  const { initialBoard, legalMoves, applyMove, flipsForMove, flipLines, countDiscs, hasMove, isGameOver, opponent, DARK, LIGHT } =
    await import('../src/games/reversi/logic/board');
  const { chooseMove } = await import('../src/games/reversi/logic/ai');

  const bad = (m: string) => {
    failed = true;
    console.error(`  ✗ ${m}`);
  };
  const B = (r: number, c: number) => r * 8 + c;

  // opening: four centre discs, four legal moves per side
  {
    const b = initialBoard();
    const c = countDiscs(b);
    if (!(c.dark === 2 && c.light === 2 && c.empty === 60)) bad(`opening discs d=${c.dark} l=${c.light} e=${c.empty}`);
    const dm = legalMoves(b, DARK);
    const lm = legalMoves(b, LIGHT);
    if (dm.length !== 4) bad(`dark opening moves = ${dm.length} (want 4)`);
    if (lm.length !== 4) bad(`light opening moves = ${lm.length} (want 4)`);
    if (![19, 26, 37, 44].every((i) => dm.includes(i))) bad(`dark opening squares ${dm}`);
  }

  // single-direction outflank flips exactly the trapped run
  {
    const b: number[] = new Array(64).fill(0);
    b[B(3, 3)] = DARK;
    b[B(3, 4)] = LIGHT;
    b[B(3, 5)] = LIGHT;
    const mv = B(3, 6);
    if (!legalMoves(b, DARK).includes(mv)) bad('single-line move not reported legal');
    const flips = flipsForMove(b, mv, DARK).sort((a, z) => a - z);
    if (!(flips.length === 2 && flips[0] === B(3, 4) && flips[1] === B(3, 5))) bad(`single-line flips ${flips}`);
    const nb = applyMove(b, mv, DARK);
    if (!(nb[mv] === DARK && nb[B(3, 4)] === DARK && nb[B(3, 5)] === DARK)) bad('single-line discs not flipped');
    if (!(b[B(3, 4)] === LIGHT && b[B(3, 5)] === LIGHT)) bad('applyMove mutated its input');
  }

  // one move outflanking in two directions at once
  {
    const b: number[] = new Array(64).fill(0);
    b[B(4, 1)] = DARK;
    b[B(4, 2)] = LIGHT;
    b[B(4, 3)] = LIGHT; // horizontal run left of (4,4)
    b[B(1, 4)] = DARK;
    b[B(2, 4)] = LIGHT;
    b[B(3, 4)] = LIGHT; // vertical run above (4,4)
    const mv = B(4, 4);
    const lines = flipLines(b, mv, DARK);
    if (lines.length !== 2) bad(`multi-direction: ${lines.length} lines (want 2)`);
    const flips = flipsForMove(b, mv, DARK);
    if (flips.length !== 4) bad(`multi-direction: ${flips.length} flips (want 4)`);
    const nb = applyMove(b, mv, DARK);
    const c = countDiscs(nb);
    if (!(c.dark === 7 && c.light === 0)) bad(`multi-direction result d=${c.dark} l=${c.light}`);
  }

  // pass handling: a side with nothing to outflank has no move; a blocked
  // board with neither side able to move is game over
  {
    const b: number[] = new Array(64).fill(0);
    b[0] = DARK;
    b[1] = DARK;
    if (hasMove(b, LIGHT)) bad('light reported a move it cannot make');
    if (legalMoves(b, LIGHT).length !== 0) bad('light legalMoves not empty (must pass)');
    if (!isGameOver(b)) bad('blocked board not detected as game over');
  }

  // AI: every difficulty returns a legal opening move, never illegal
  {
    const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
    for (const d of diffs) {
      const b = initialBoard();
      const legal = legalMoves(b, DARK);
      const mv = chooseMove(b, DARK, d);
      if (mv === null || !legal.includes(mv)) bad(`${d}: AI returned illegal opening move ${mv}`);
    }
  }

  // shallow self-play terminates on a full/stalemated board (fast tiers)
  {
    let terminated = 0;
    for (let g = 0; g < 4; g++) {
      let board = initialBoard();
      let toMove: 1 | 2 = DARK;
      let passes = 0;
      let plies = 0;
      let illegal = false;
      while (plies < 200) {
        const moves = legalMoves(board, toMove);
        if (moves.length === 0) {
          if (++passes >= 2) break;
          toMove = opponent(toMove);
          continue;
        }
        passes = 0;
        const mv = chooseMove(board, toMove, g % 2 === 0 ? 'easy' : 'medium');
        if (mv === null || !moves.includes(mv)) {
          illegal = true;
          break;
        }
        board = applyMove(board, mv, toMove);
        toMove = opponent(toMove);
        plies++;
      }
      if (illegal) bad(`self-play ${g}: AI produced an illegal move`);
      if (!isGameOver(board)) bad(`self-play ${g}: did not reach a terminal board`);
      else terminated++;
    }
    if (!failed) console.log(`✓ reversi: opening + crafted flips + passes OK, AI legal on 5 tiers, ${terminated}/4 self-plays finished`);
  }
}

console.log('— Checkers —');
{
  const {
    initialBoard,
    generateMoves,
    applyMove,
    captureHopsFrom,
    simpleTargetsFrom,
    sideHasCapture,
    hasAnyMove,
    winnerOf,
    otherSide,
    countPieces
  } = await import('../src/games/checkers/logic/engine');
  const { chooseMove } = await import('../src/games/checkers/logic/ai');

  type Side = 'r' | 'b';
  const empty = () => new Array(64).fill(null) as ReturnType<typeof initialBoard>;
  const man = (side: Side) => ({ side, king: false });
  const king = (side: Side) => ({ side, king: true });
  const bad = (msg: string) => {
    failed = true;
    console.error(`  ✗ ${msg}`);
  };

  // forced capture: only jumps are offered when a jump exists
  {
    const b = empty();
    b[45] = man('r');
    b[36] = man('b'); // 45 → 27 over 36
    b[47] = man('r'); // has a quiet move that must be suppressed
    const moves = generateMoves(b, 'r');
    if (!(moves.length > 0 && moves.every((m) => m.captures.length > 0)))
      bad('forced-capture rule: quiet moves not suppressed');
    if (!sideHasCapture(b, 'r')) bad('sideHasCapture missed an available jump');
  }

  // multi-jump chain enumerated
  {
    const b = empty();
    b[45] = man('r');
    b[36] = man('b');
    b[18] = man('b'); // 45 → 27 → 9
    const chain = generateMoves(b, 'r').find((m) => m.captures.length === 2);
    if (!(chain && chain.to === 9 && chain.captures.includes(36) && chain.captures.includes(18)))
      bad('multi-jump chain not enumerated');
  }

  // promotion on the back row ends the move (no chaining past the crown)
  {
    const b = empty();
    b[20] = man('r');
    b[11] = man('b'); // 20 → 2 (row 0) crowns
    b[9] = man('b'); // trap only reachable if the man kept going as a king
    const moves = generateMoves(b, 'r');
    if (!(moves.length === 1 && moves[0].promoted && !moves[0].captures.includes(9)))
      bad('promotion did not end the jump');
  }

  // kings move & jump in both diagonal directions
  {
    const b = empty();
    b[27] = king('r');
    if (simpleTargetsFrom(b, 27).length !== 4) bad('king lacks omnidirectional moves');
    const b2 = empty();
    b2[27] = king('r');
    b2[34] = man('b'); // backward (downward) jump for red → land 41
    if (!captureHopsFrom(b2, 27).some((h) => h.to === 41 && h.captured === 34))
      bad('king cannot jump backwards');
  }

  // applyMove removes the jumped piece and crowns the mover
  {
    const b = empty();
    b[20] = man('r');
    b[11] = man('b');
    const nb = applyMove(b, generateMoves(b, 'r')[0]);
    if (!(nb[11] === null && nb[2] && nb[2]!.king && nb[20] === null))
      bad('applyMove did not remove capture / crown correctly');
  }

  // win detection: no pieces, and a fully blocked side, both lose on the turn
  {
    const noBlack = empty();
    noBlack[45] = man('r');
    if (!(winnerOf(noBlack, 'b') === 'r' && !hasAnyMove(noBlack, 'b')))
      bad('win-by-capture not detected');
    const trapped = empty();
    trapped[0] = man('r'); // a man on the top row has no forward move
    if (winnerOf(trapped, 'r') !== 'b') bad('stalemate loss not detected');
    if (winnerOf(initialBoard(), 'r') !== null) bad('opening wrongly flagged terminal');
    const c = countPieces(initialBoard());
    if (!(c.rMen === 12 && c.bMen === 12)) bad('opening is not 12 v 12');
  }

  // AI always plays a legal, forced-capture-respecting move; games terminate
  {
    const tiers = ['easy', 'medium', 'hard'] as const;
    let illegal = 0;
    let brokeForced = 0;
    let decided = 0;
    const GAMES = 15;
    for (let g = 0; g < GAMES; g++) {
      let board = initialBoard();
      let side: Side = 'r';
      for (let ply = 0; ply < 220; ply++) {
        if (winnerOf(board, side) !== null) {
          decided++;
          break;
        }
        const legal = generateMoves(board, side);
        const mv = chooseMove(board, side, tiers[g % tiers.length]);
        if (!mv) {
          illegal++;
          break;
        }
        if (!legal.some((m) => m.from === mv.from && m.to === mv.to)) illegal++;
        if (sideHasCapture(board, side) && mv.captures.length === 0) brokeForced++;
        board = applyMove(board, mv);
        side = otherSide(side);
      }
    }
    if (illegal > 0) bad(`robot produced ${illegal} illegal move(s)`);
    if (brokeForced > 0) bad(`robot skipped ${brokeForced} forced capture(s)`);
    if (decided < 10) bad(`only ${decided}/${GAMES} self-play games reached a winner`);
    if (illegal === 0 && brokeForced === 0 && decided >= 10)
      console.log(
        `✓ Checkers: rules + AI sound (forced captures, multi-jumps, kings, promotion; ${decided}/${GAMES} self-play games decided)`
      );
  }
}

console.log('— Connect Four —');
{
  const { COLS, ROWS, SIZE, emptyBoard, idx, drop, dropRow, legalCols, checkWinner, isFull, winsAt } =
    await import('../src/games/connect-four/logic/board');
  const { chooseMove, searchMove } = await import('../src/games/connect-four/logic/ai');

  type D = 'r' | 'y';
  const other = (d: D): D => (d === 'r' ? 'y' : 'r');
  const fresh = () => emptyBoard();
  const put = (b: ReturnType<typeof emptyBoard>, r: number, c: number, d: D) => {
    b[idx(r, c)] = d;
  };
  let ok = true;
  const must = (cond: boolean, msg: string) => {
    if (!cond) {
      ok = false;
      failed = true;
      console.error(`  ✗ ${msg}`);
    }
  };

  // checkWinner detects all four orientations
  const h = fresh();
  for (let c = 0; c < 4; c++) put(h, ROWS - 1, c, 'r');
  must(checkWinner(h)?.disc === 'r', 'horizontal four detected');

  const v = fresh();
  for (let r = ROWS - 4; r < ROWS; r++) put(v, r, 2, 'y');
  must(checkWinner(v)?.disc === 'y', 'vertical four detected');

  const dr = fresh();
  for (let k = 0; k < 4; k++) put(dr, k, k, 'r');
  must(checkWinner(dr)?.disc === 'r', 'diagonal down-right four detected');

  const dl = fresh();
  for (let k = 0; k < 4; k++) put(dl, k, 5 - k, 'y');
  must(checkWinner(dl)?.disc === 'y', 'diagonal down-left four detected');

  const mixed = fresh();
  for (let c = 0; c < 3; c++) put(mixed, ROWS - 1, c, 'r');
  put(mixed, ROWS - 1, 3, 'y');
  must(checkWinner(mixed) === null, 'three-plus-block is not a win');

  // drop lands on the correct row and rejects full columns
  const board0 = fresh();
  must(drop(board0, 3, 'r')!.row === ROWS - 1, 'first disc lands on the bottom row');
  let col = fresh();
  const rows: number[] = [];
  for (let k = 0; k < ROWS; k++) {
    const res = drop(col, 3, k % 2 ? 'y' : 'r')!;
    rows.push(res.row);
    col = res.board;
  }
  must(rows.join(',') === '5,4,3,2,1,0', 'discs stack upward one row per drop');
  must(drop(col, 3, 'r') === null && dropRow(col, 3) === -1, 'full column rejects further drops');
  must(!legalCols(col).includes(3) && !isFull(col), 'full column is illegal but board is not full');

  // AI returns a legal move, never a full column, over sampled positions
  const diffs = ['easy', 'medium', 'hard', 'pro', 'extreme'] as const;
  for (const difficulty of diffs) {
    let bad = 0;
    for (let s = 0; s < 25; s++) {
      const b = fresh();
      let turn: D = 'r';
      const pre = (s * 3) % 11;
      for (let m = 0; m < pre; m++) {
        const legal = legalCols(b);
        if (legal.length === 0) break;
        const c = legal[(s + m) % legal.length];
        const row = dropRow(b, c);
        b[idx(row, c)] = turn;
        if (winsAt(b, row, c, turn)) {
          b[idx(row, c)] = null;
          break;
        }
        turn = other(turn);
      }
      if (legalCols(b).length === 0 || checkWinner(b)) continue;
      const mv = chooseMove(b, 'r', difficulty);
      if (!legalCols(b).includes(mv) || b[mv] !== null) bad++;
    }
    must(bad === 0, `${difficulty}: AI always returns a legal, non-full column (${bad} bad)`);
  }

  // AI takes an immediate win and blocks an immediate loss (medium+)
  const winNow = fresh();
  for (let c = 0; c < 3; c++) put(winNow, ROWS - 1, c, 'r');
  must(chooseMove(winNow, 'r', 'hard') === 3, 'AI takes the winning drop');
  const blockNow = fresh();
  for (let c = 0; c < 3; c++) put(blockNow, ROWS - 1, c, 'y');
  must(chooseMove(blockNow, 'r', 'hard') === 3, 'AI blocks the opponent threat');

  // shallow-vs-shallow self-play always terminates within SIZE moves
  let terminated = 0;
  for (let g = 0; g < 20; g++) {
    let b = fresh();
    let turn: D = 'r';
    let moves = 0;
    let ended = false;
    while (moves <= SIZE) {
      if (legalCols(b).length === 0) {
        ended = true;
        break;
      }
      const c = searchMove(b, turn, 2, 40_000).col;
      const res = drop(b, c, turn);
      if (!res) break;
      b = res.board;
      moves++;
      if (checkWinner(b)) {
        ended = true;
        break;
      }
      turn = other(turn);
    }
    if (ended && moves <= SIZE) terminated++;
  }
  must(terminated === 20, `self-play terminates every game (${terminated}/20)`);

  if (ok) console.log(`✓ Connect Four: ${COLS}×${ROWS} win detection, drop mechanics, AI legality (5 tiers) & self-play all sound`);
}

console.log('— Dots & Boxes —');
{
  const {
    makeBoard,
    initSnap,
    applyMove,
    boxEdges,
    boxSides,
    boxCounts,
    isComplete,
    legalEdges,
    missingEdge
  } = await import('../src/games/dots-boxes/logic/engine');
  const { pickAiMove, capturingEdges } = await import('../src/games/dots-boxes/logic/ai');

  type Diff = 'easy' | 'medium' | 'hard' | 'pro' | 'extreme';
  const DIMS: Record<Diff, number> = { easy: 3, medium: 4, hard: 5, pro: 5, extreme: 6 };

  // rule: drawing the 4th side claims the box AND keeps the turn
  {
    const b = makeBoard(2, 2);
    let s = initSnap(b);
    const [t, bo, l, r] = boxEdges(b, 0, 0);
    s = applyMove(b, s, t, 0).snap;
    s = applyMove(b, s, l, 1).snap;
    if (applyMove(b, s, bo, 0).captured.length !== 0) {
      failed = true;
      console.error('✗ a 3rd side must not claim a box');
    }
    s = applyMove(b, s, bo, 0).snap;
    const res = applyMove(b, s, r, 0);
    if (res.captured.length !== 1 || res.snap.boxes[0] !== 0 || res.snap.turn !== 0) {
      failed = true;
      console.error('✗ the 4th side must claim the box and grant another turn');
    }
    // a non-completing move passes the turn
    if (applyMove(b, initSnap(b), boxEdges(b, 0, 0)[0], 0).snap.turn !== 1) {
      failed = true;
      console.error('✗ a non-completing move must pass the turn');
    }
  }

  // rule: one edge that closes two boxes at once claims both
  {
    const b = makeBoard(1, 2);
    let s = initSnap(b);
    const shared = boxEdges(b, 0, 0)[3]; // right wall of box 0 == left wall of box 1
    for (const e of legalEdges(s)) if (e !== shared) s = { ...s, edges: s.edges.map((v, i) => (i === e ? true : v)) };
    const res = applyMove(b, s, shared, 1);
    if (res.captured.length !== 2 || res.snap.boxes[0] !== 1 || res.snap.boxes[1] !== 1) {
      failed = true;
      console.error('✗ a shared edge must claim both boxes for the mover');
    }
  }

  // AI legality + full-board termination + box conservation, self-play
  for (const diff of Object.keys(DIMS) as Diff[]) {
    const n = DIMS[diff];
    const b = makeBoard(n, n);
    let ok = 0;
    for (let g = 0; g < 3; g++) {
      let s = initSnap(b);
      let bad = false;
      let guard = 0;
      while (!isComplete(s) && guard++ < 5000) {
        const e = pickAiMove(b, s, diff, s.turn);
        if (e < 0 || e >= b.edgeCount || s.edges[e]) {
          bad = true;
          break;
        }
        s = applyMove(b, s, e, s.turn).snap;
      }
      const [c0, c1] = boxCounts(s);
      if (!bad && isComplete(s) && c0 + c1 === n * n) ok++;
    }
    if (ok < 3) {
      failed = true;
      console.error(`✗ ${diff}: only ${ok}/3 self-plays terminated & tiled all ${n * n} boxes`);
    } else {
      console.log(`✓ ${diff}: 3/3 self-plays fill the ${n}×${n} board legally, boxes sum to ${n * n}`);
    }
  }

  // medium and up must grab an isolated free box (no valid double-cross decline)
  {
    const b = makeBoard(3, 3);
    let allGood = true;
    for (const diff of ['medium', 'hard', 'pro', 'extreme'] as Diff[]) {
      let took = 0;
      for (let t = 0; t < 12; t++) {
        let s = initSnap(b);
        const [, bottom, left, right] = boxEdges(b, 0, 0);
        for (const e of [bottom, left, right]) s = applyMove(b, s, e, s.turn).snap;
        s = { ...s, turn: 0 };
        if (boxSides(b, s.edges, 0) !== 3) continue;
        const miss = missingEdge(b, s, 0);
        const e = pickAiMove(b, s, diff, 0);
        if (e === miss || capturingEdges(b, s).includes(e)) took++;
      }
      if (took < 12) {
        allGood = false;
        failed = true;
        console.error(`✗ ${diff}: took the free box only ${took}/12 times`);
      }
    }
    if (allGood) console.log('✓ medium/hard/pro/extreme always grab an offered free box');
  }
}

console.log('— Klondike Solitaire —');
{
  const { deal, applyMove, legalMoves, isWon, isWinnable, canStackTableau, canStackFoundation, TIERS, WINNABLE_SEEDS } =
    await import('../src/games/klondike/logic/deck');
  type K = ReturnType<typeof deal>;
  type Cd = K['tableau'][number][number];
  const IX = { S: 0, H: 1, D: 2, C: 3 } as const;
  const allCards = (st: K): Cd[] => [...st.stock, ...st.waste, ...st.foundations.flat(), ...st.tableau.flat()];
  const conserved = (st: K): boolean => {
    const cs = allCards(st);
    return cs.length === 52 && new Set(cs.map((c) => c.s + c.r)).size === 52;
  };
  let ok = true;
  const fail = (msg: string) => {
    ok = false;
    console.error('  ✗ ' + msg);
  };

  // deal structure (7 tableau columns of 1..7, one face-up each; 24 in stock) + determinism
  for (let seed = 1; seed <= 30 && ok; seed++) {
    const st = deal(seed);
    if (!conserved(st)) fail(`deal ${seed}: not 52 unique cards`);
    if (st.stock.length !== 24) fail(`deal ${seed}: stock ${st.stock.length} != 24`);
    if (st.stock.some((k) => k.up)) fail(`deal ${seed}: stock not all face-down`);
    for (let c = 0; c < 7; c++) {
      if (st.tableau[c].length !== c + 1) fail(`deal ${seed}: col ${c} length`);
      if (st.tableau[c].filter((k) => k.up).length !== 1) fail(`deal ${seed}: col ${c} face-up count`);
    }
    if (JSON.stringify(deal(seed)) !== JSON.stringify(deal(seed))) fail(`deal ${seed}: not deterministic`);
  }

  // every offered legal move obeys the rules (down/alt-colour tableau, up-by-suit foundations)
  // and applyMove conserves the 52 cards across a long deterministic playout
  for (let seed = 1; seed <= 20 && ok; seed++) {
    let st = deal(seed, 1, -1);
    for (let step = 0; step < 140 && ok; step++) {
      const ms = legalMoves(st);
      for (const m of ms) {
        if (m.type === 'tt') {
          const col = st.tableau[m.from];
          const moving = col[col.length - m.count];
          const dest = st.tableau[m.to];
          if (!canStackTableau(moving, dest.length ? dest[dest.length - 1] : undefined)) fail(`seed ${seed}: illegal tt offered`);
        } else if (m.type === 'tf') {
          const col = st.tableau[m.from];
          const c = col[col.length - 1];
          const f = st.foundations[IX[c.s]];
          if (!canStackFoundation(c, f.length ? f[f.length - 1] : undefined)) fail(`seed ${seed}: illegal tf offered`);
        } else if (m.type === 'wf') {
          const c = st.waste[st.waste.length - 1];
          const f = st.foundations[IX[c.s]];
          if (!canStackFoundation(c, f.length ? f[f.length - 1] : undefined)) fail(`seed ${seed}: illegal wf offered`);
        }
      }
      if (ms.length === 0) break;
      st = applyMove(st, ms[step % ms.length]);
      if (!conserved(st)) fail(`seed ${seed}: applyMove broke card conservation`);
    }
  }

  // isWon triggers only with all 52 cards on the foundations
  {
    const won = deal(5);
    won.stock = [];
    won.waste = [];
    won.tableau = [[], [], [], [], [], [], []];
    won.foundations = (['S', 'H', 'D', 'C'] as const).map((s) => Array.from({ length: 13 }, (_, i) => ({ s, r: i + 1, up: true })));
    if (!isWon(won)) fail('isWon should be true at 52 on foundations');
    won.foundations[0].pop();
    if (isWon(won)) fail('isWon should be false at 51');
  }

  // winnability: 10 baked bank seeds are PROVEN winnable under medium's stricter
  // rules (draw-1, 3 redeals) within the solver budget of 45000 nodes.
  const BUDGET = TIERS.medium.solverBudget; // 45000 expanded nodes
  let proven = 0;
  for (let i = 0; i < 10; i++) {
    const s = WINNABLE_SEEDS[(i * 7) % WINNABLE_SEEDS.length];
    if (isWinnable(deal(s, 1, 3), BUDGET)) proven++;
  }
  if (proven < 10) fail(`only ${proven}/10 bank deals proven winnable`);

  if (!ok) failed = true;
  console.log(`  ${ok ? '✓' : '✗'} deal · rules · applyMove · isWon; ${proven}/10 bank deals winnable (budget ${BUDGET})`);
}

console.log('— Peg Solitaire —');
{
  const {
    BOARDS,
    initialState,
    applyMove,
    legalMoves,
    pegCount,
    isWin,
    solve,
    generateGame,
    startHole,
    requiresCenter,
    PRO_STARTS,
    EXTREME_STARTS
  } = await import('../src/games/peg-solitaire/logic/boards');

  let ok = true;
  const bad = (m: string) => {
    failed = true;
    ok = false;
    console.error('  ✗ ' + m);
  };

  // board shapes
  if (BOARDS.triangle.holeList.length !== 15) bad('triangle should have 15 holes');
  if (BOARDS.english.holeList.length !== 33) bad('english should have 33 holes');
  if (BOARDS.european.holeList.length !== 37) bad('european should have 37 holes');

  // legalMoves / applyMove consistency per board
  const boards = ['triangle', 'english', 'european'] as const;
  for (const b of boards) {
    const st = initialState(b, BOARDS[b].standardStart);
    const mv = legalMoves(st)[0];
    if (!mv) {
      bad(`${b} start has no legal move`);
      continue;
    }
    const st2 = applyMove(st, mv);
    if (pegCount(st2) !== pegCount(st) - 1) bad(`${b} applyMove must remove exactly one peg`);
    if (!st2.pegs[mv.to] || st2.pegs[mv.from] || st2.pegs[mv.over]) bad(`${b} applyMove lands illegally`);
    if (!legalMoves(st).every((m) => st.pegs[m.from] && st.pegs[m.over] && !st.pegs[m.to]))
      bad(`${b} legalMoves violates the jump rule`);
  }

  // isWin triggers at exactly one peg (and honours the centre requirement)
  const mk = (board: keyof typeof BOARDS, fill: (i: number) => boolean) => {
    const s = initialState(board, BOARDS[board].standardStart);
    s.pegs = BOARDS[board].holes.map((h, i) => h && fill(i));
    return s;
  };
  const eng = BOARDS.english;
  const onePeg = mk('english', (i) => i === eng.center);
  const twoPeg = mk('english', (i) => i === eng.center || i === eng.holeList[0]);
  if (!isWin(onePeg) || !isWin(onePeg, true)) bad('isWin should be true for one central peg (and with centre)');
  if (isWin(twoPeg)) bad('isWin should be false with two pegs');
  if (isWin(mk('english', (i) => i === eng.holeList[0]), true)) bad('isWin(centre) should be false off-centre');

  // memoized solver check: replay each returned solution to confirm the win
  const cache = new Map<string, boolean>();
  const winnable = (board: keyof typeof BOARDS, hole: number, rc: boolean): boolean => {
    const key = `${board}:${hole}:${rc}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const st = initialState(board, hole);
    const sol = solve(st, rc);
    let good = false;
    if (sol) {
      let cur = st;
      good = true;
      for (const m of sol) {
        if (!legalMoves(cur).some((x) => x.from === m.from && x.over === m.over && x.to === m.to)) {
          good = false;
          break;
        }
        cur = applyMove(cur, m);
      }
      good = good && isWin(cur, rc);
    }
    cache.set(key, good);
    return good;
  };

  // fixed-board starts are solver-verified winnable
  const fixed: [keyof typeof BOARDS, number, boolean][] = [
    ['triangle', BOARDS.triangle.standardStart, false],
    ['english', BOARDS.english.standardStart, false],
    ['english', BOARDS.english.standardStart, true],
    ['european', BOARDS.european.standardStart, false]
  ];
  for (const [b, h, rc] of fixed) {
    if (!winnable(b, h, rc)) bad(`${b} fixed start ${h} not winnable${rc ? ' to centre' : ''}`);
  }

  // baked random-start lists are all winnable (pro → 1, extreme → centre & off-centre)
  for (const h of PRO_STARTS) if (!winnable('english', h, false)) bad(`PRO start ${h} not winnable`);
  for (const h of EXTREME_STARTS) {
    if (h === eng.center) bad(`EXTREME start ${h} should be off-centre`);
    if (!winnable('english', h, true)) bad(`EXTREME start ${h} not winnable to centre`);
  }

  // 25 seeded generations per random-start tier: deterministic + winnable
  for (const diff of ['pro', 'extreme'] as const) {
    const rc = requiresCenter(diff);
    let cnt = 0;
    for (let s = 0; s < 25; s++) {
      const a = generateGame(diff, s);
      const b2 = generateGame(diff, s);
      const det = a.pegs.every((v, i) => v === b2.pegs[i]);
      if (det && winnable(a.board, startHole(a), rc)) cnt++;
      else bad(`${diff} seed ${s} ${det ? 'not winnable' : 'not deterministic'}`);
    }
    if (cnt === 25) console.log(`  ✓ ${diff}: 25/25 seeded starts deterministic & solver-verified winnable`);
  }

  if (ok)
    console.log(
      `  ✓ boards 15/33/37, move+isWin consistency, fixed starts (triangle/english→1/english→centre/european) & all baked random starts winnable`
    );
}

if (failed) {
  console.error('\nValidation FAILED');
  throw new Error('validation failed');
}
console.log('\nAll validations passed.');
