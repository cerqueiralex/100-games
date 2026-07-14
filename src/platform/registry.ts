import type { GameDefinition } from './types';
import { sudokuDefinition } from '../games/sudoku';
import { crosswordDefinition } from '../games/crossword';
import { memoryMatchDefinition } from '../games/memory-match';
import { simonDefinition } from '../games/simon';
import { nBackDefinition } from '../games/nback';
import { dualNBackDefinition } from '../games/dual-nback';
import { wordWheelDefinition } from '../games/word-wheel';
import { numberMergeDefinition } from '../games/number-merge';
import { colorConnectDefinition } from '../games/color-connect';
import { ticTacToeDefinition } from '../games/tic-tac-toe';
import { imagePuzzleDefinition } from '../games/image-puzzle';
import { mazeDefinition } from '../games/maze';
import { cryptogramDefinition } from '../games/cryptogram';
import { minesweeperDefinition } from '../games/minesweeper';
import { logicGridDefinition } from '../games/logic-grid';
import { battleshipDefinition } from '../games/battleship';
import { housePuzzlesDefinition } from '../games/house-puzzles';
import { lightsOutDefinition } from '../games/lights-out';
import { futoshikiDefinition } from '../games/futoshiki';
import { nonogramDefinition } from '../games/nonogram';
import { tentsDefinition } from '../games/tents';
import { mathdokuDefinition } from '../games/mathdoku';
import { aquariumDefinition } from '../games/aquarium';
import { skyscrapersDefinition } from '../games/skyscrapers';
import { binaryGridDefinition } from '../games/binary-grid';
import { hashiDefinition } from '../games/hashi';
import { killerSudokuDefinition } from '../games/killer-sudoku';
import { wordSearchDefinition } from '../games/word-search';
import { codeBreakerDefinition } from '../games/code-breaker';
import { slitherlinkDefinition } from '../games/slitherlink';
import { fleetSolitaireDefinition } from '../games/fleet-solitaire';
import { wordGuessDefinition } from '../games/word-guess';
import { wordLadderDefinition } from '../games/word-ladder';
import { kakuroDefinition } from '../games/kakuro';
import { hangmanDefinition } from '../games/hangman';
import { anagramSprintDefinition } from '../games/anagram-sprint';
import { nurikabeDefinition } from '../games/nurikabe';
import { patternRecallDefinition } from '../games/pattern-recall';
import { numberTrailDefinition } from '../games/number-trail';
import { backwardsSpanDefinition } from '../games/backwards-span';
import { schulteTableDefinition } from '../games/schulte-table';
import { movingCupsDefinition } from '../games/moving-cups';
import { missingVowelsDefinition } from '../games/missing-vowels';
import { stroopMatchDefinition } from '../games/stroop-match';
import { letterHuntDefinition } from '../games/letter-hunt';
import { oddOneOutDefinition } from '../games/odd-one-out';
import { countCompareDefinition } from '../games/count-compare';
import { magicSquareDefinition } from '../games/magic-square';
import { game2048Definition } from '../games/game2048';
import { mathSprintDefinition } from '../games/math-sprint';
import { make24Definition } from '../games/make-24';
import { towerOfHanoiDefinition } from '../games/tower-of-hanoi';
import { targetNumberDefinition } from '../games/target-number';
import { pipesDefinition } from '../games/pipes';
import { sequenceCrackerDefinition } from '../games/sequence-cracker';
import { laserMirrorsDefinition } from '../games/laser-mirrors';
import { sokobanDefinition } from '../games/sokoban';
import { untangleDefinition } from '../games/untangle';
import { jigsawDefinition } from '../games/jigsaw';
import { gridlockDefinition } from '../games/gridlock';
import { tangramDefinition } from '../games/tangram';
import { reversiDefinition } from '../games/reversi';
import { checkersDefinition } from '../games/checkers';
import { connectFourDefinition } from '../games/connect-four';
import { dotsBoxesDefinition } from '../games/dots-boxes';
import { klondikeDefinition } from '../games/klondike';
import { pegSolitaireDefinition } from '../games/peg-solitaire';

/**
 * Central game registry. To add a new game to the platform:
 *  1. Create a folder under src/games/<id>/ with all its logic and UI.
 *  2. Export a GameDefinition from src/games/<id>/index.ts.
 *  3. Add it to this list. Difficulty selection, timing, scoring history,
 *     statistics, assist tracking and settings all come for free.
 */
export const GAMES: GameDefinition[] = [
  sudokuDefinition,
  crosswordDefinition,
  wordWheelDefinition,
  memoryMatchDefinition,
  simonDefinition,
  nBackDefinition,
  dualNBackDefinition,
  numberMergeDefinition,
  colorConnectDefinition,
  ticTacToeDefinition,
  imagePuzzleDefinition,
  mazeDefinition,
  cryptogramDefinition,
  minesweeperDefinition,
  logicGridDefinition,
  battleshipDefinition,
  housePuzzlesDefinition,
  lightsOutDefinition,
  futoshikiDefinition,
  nonogramDefinition,
  tentsDefinition,
  mathdokuDefinition,
  aquariumDefinition,
  skyscrapersDefinition,
  binaryGridDefinition,
  hashiDefinition,
  killerSudokuDefinition,
  wordSearchDefinition,
  codeBreakerDefinition,
  slitherlinkDefinition,
  fleetSolitaireDefinition,
  wordGuessDefinition,
  wordLadderDefinition,
  kakuroDefinition,
  hangmanDefinition,
  anagramSprintDefinition,
  nurikabeDefinition,
  patternRecallDefinition,
  numberTrailDefinition,
  backwardsSpanDefinition,
  schulteTableDefinition,
  movingCupsDefinition,
  missingVowelsDefinition,
  stroopMatchDefinition,
  letterHuntDefinition,
  oddOneOutDefinition,
  countCompareDefinition,
  magicSquareDefinition,
  game2048Definition,
  mathSprintDefinition,
  make24Definition,
  towerOfHanoiDefinition,
  targetNumberDefinition,
  pipesDefinition,
  sequenceCrackerDefinition,
  laserMirrorsDefinition,
  sokobanDefinition,
  untangleDefinition,
  jigsawDefinition,
  gridlockDefinition,
  tangramDefinition,
  reversiDefinition,
  checkersDefinition,
  connectFourDefinition,
  dotsBoxesDefinition,
  klondikeDefinition,
  pegSolitaireDefinition
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
