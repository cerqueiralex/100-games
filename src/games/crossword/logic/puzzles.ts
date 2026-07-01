import type { Difficulty } from '../../../platform/types';
import type { CrosswordDef } from './engine';

/**
 * Hand-crafted criss-cross puzzles. Run `npm run validate` after editing —
 * it checks every intersection and catches accidental adjacent words.
 */
export const PUZZLES: Record<Difficulty, CrosswordDef[]> = {
  easy: [
    {
      id: 'easy-1',
      title: 'Warm-up',
      entries: [
        { answer: 'PLANET', clue: 'Earth or Mars, for example', row: 0, col: 0, dir: 'across' },
        { answer: 'AIMING', clue: 'Pointing at a target', row: 2, col: 0, dir: 'across' },
        { answer: 'OYSTER', clue: 'Shellfish that can hold a pearl', row: 4, col: 0, dir: 'across' },
        { answer: 'PIANO', clue: 'Instrument with 88 keys', row: 0, col: 0, dir: 'down' },
        { answer: 'ALMOST', clue: 'Very nearly, but not quite', row: 0, col: 2, dir: 'down' },
        { answer: 'TIGER', clue: 'Big cat with orange and black stripes', row: 0, col: 5, dir: 'down' }
      ]
    },
    {
      id: 'easy-2',
      title: 'Backyard',
      entries: [
        { answer: 'GARDEN', clue: 'Place to grow flowers and vegetables', row: 0, col: 0, dir: 'across' },
        { answer: 'ASLEEP', clue: 'Not awake', row: 2, col: 0, dir: 'across' },
        { answer: 'SEASON', clue: 'Spring, summer, autumn or winter', row: 5, col: 0, dir: 'across' },
        { answer: 'GRAPES', clue: 'Fruits that grow in bunches on vines', row: 0, col: 0, dir: 'down' },
        { answer: 'EGGS', clue: 'Breakfast food laid by hens', row: 2, col: 3, dir: 'down' },
        { answer: 'NAPKIN', clue: 'Cloth or paper used to wipe your mouth', row: 0, col: 5, dir: 'down' }
      ]
    }
  ],
  medium: [
    {
      id: 'medium-1',
      title: 'Sweet tooth',
      entries: [
        { answer: 'MAJOR', clue: 'Important; also an army rank', row: 0, col: 0, dir: 'across' },
        { answer: 'GEM', clue: 'Precious stone', row: 2, col: 0, dir: 'across' },
        { answer: 'DROOP', clue: 'Sag or hang down limply', row: 2, col: 4, dir: 'across' },
        { answer: 'CHOCOLATE', clue: 'Sweet treat made from cocoa beans', row: 4, col: 0, dir: 'across' },
        { answer: 'ICEBERG', clue: 'Floating ice mountain that sank the Titanic', row: 6, col: 0, dir: 'across' },
        { answer: 'NOVEL', clue: 'Long work of fiction; also means new', row: 8, col: 2, dir: 'across' },
        { answer: 'MAGIC', clue: 'What wizards perform', row: 0, col: 0, dir: 'down' },
        { answer: 'RADIO', clue: 'Device for listening to broadcasts', row: 0, col: 4, dir: 'down' },
        { answer: 'MAPLE', clue: 'Tree whose sap becomes syrup', row: 0, col: 8, dir: 'down' },
        { answer: 'OCEAN', clue: 'The Pacific or the Atlantic', row: 4, col: 2, dir: 'down' },
        { answer: 'ANGEL', clue: 'Winged heavenly being', row: 4, col: 6, dir: 'down' }
      ]
    },
    {
      id: 'medium-2',
      title: 'Night shift',
      entries: [
        { answer: 'SILOS', clue: 'Tall farm towers for storing grain', row: 0, col: 0, dir: 'across' },
        { answer: 'EGG', clue: 'It comes before the chicken — or after?', row: 2, col: 0, dir: 'across' },
        { answer: 'SCUBA', clue: 'Diving with an air tank', row: 2, col: 4, dir: 'across' },
        { answer: 'MAGNITUDE', clue: 'Measure of an earthquake', row: 4, col: 0, dir: 'across' },
        { answer: 'ISOTOPE', clue: 'Atom variant with a different neutron count', row: 6, col: 0, dir: 'across' },
        { answer: 'TREAD', clue: 'Tire surface; to step', row: 8, col: 2, dir: 'across' },
        { answer: 'STEAM', clue: 'What boiling water gives off', row: 0, col: 0, dir: 'down' },
        { answer: 'SUSHI', clue: 'Japanese dish with rice and raw fish', row: 0, col: 4, dir: 'down' },
        { answer: 'SPACE', clue: 'The final frontier', row: 0, col: 8, dir: 'down' },
        { answer: 'GHOST', clue: 'Spooky haunter of houses', row: 4, col: 2, dir: 'down' },
        { answer: 'UPEND', clue: 'Turn upside down', row: 4, col: 6, dir: 'down' }
      ]
    }
  ],
  hard: [
    {
      id: 'hard-1',
      title: 'Heat wave',
      entries: [
        { answer: 'AUDIO', clue: 'Sound, as opposed to video', row: 0, col: 0, dir: 'across' },
        { answer: 'ELBOW', clue: 'Joint between shoulder and wrist', row: 0, col: 6, dir: 'across' },
        { answer: 'RUMBA', clue: 'Cuban ballroom dance', row: 2, col: 0, dir: 'across' },
        { answer: 'CARGO', clue: 'Freight carried by ship or plane', row: 2, col: 6, dir: 'across' },
        { answer: 'TEMPERATURE', clue: 'What a thermometer measures', row: 5, col: 0, dir: 'across' },
        { answer: 'BRAID', clue: 'Interwoven strands of hair', row: 8, col: 0, dir: 'across' },
        { answer: 'HOTEL', clue: 'Establishment offering rooms for the night', row: 8, col: 6, dir: 'across' },
        { answer: 'CHASM', clue: 'Deep gorge or abyss', row: 10, col: 2, dir: 'across' },
        { answer: 'ABRUPT', clue: 'Sudden and unexpected', row: 0, col: 0, dir: 'down' },
        { answer: 'ORANGE', clue: 'Citrus fruit; color of a carrot', row: 0, col: 4, dir: 'down' },
        { answer: 'BUREAU', clue: 'Chest of drawers; a government office', row: 0, col: 8, dir: 'down' },
        { answer: 'MOSAIC', clue: 'Art made of small colored tiles', row: 5, col: 2, dir: 'down' },
        { answer: 'ANTHEM', clue: "A nation's official song", row: 5, col: 6, dir: 'down' },
        { answer: 'EMBLEM', clue: 'Symbolic badge or insignia', row: 5, col: 10, dir: 'down' }
      ]
    },
    {
      id: 'hard-2',
      title: 'Field notes',
      entries: [
        { answer: 'SEPIA', clue: 'Brownish tone of old photographs', row: 0, col: 0, dir: 'across' },
        { answer: 'TABOO', clue: 'Socially forbidden', row: 0, col: 6, dir: 'across' },
        { answer: 'FLOAT', clue: "Stay on the water's surface", row: 2, col: 0, dir: 'across' },
        { answer: 'MANGO', clue: 'Tropical stone fruit', row: 2, col: 6, dir: 'across' },
        { answer: 'INFORMATION', clue: 'Data with meaning', row: 5, col: 0, dir: 'across' },
        { answer: 'MARSH', clue: 'Waterlogged wetland', row: 8, col: 0, dir: 'across' },
        { answer: 'STAGE', clue: 'Where actors perform; a phase', row: 8, col: 6, dir: 'across' },
        { answer: 'CABIN', clue: 'Log house in the woods', row: 10, col: 2, dir: 'across' },
        { answer: 'SAFARI', clue: 'African wildlife expedition', row: 0, col: 0, dir: 'down' },
        { answer: 'AUTHOR', clue: 'Writer of books', row: 0, col: 4, dir: 'down' },
        { answer: 'BONSAI', clue: 'Miniature potted tree art from Japan', row: 0, col: 8, dir: 'down' },
        { answer: 'FABRIC', clue: 'Woven cloth material', row: 5, col: 2, dir: 'down' },
        { answer: 'ARISEN', clue: 'Gotten up (past participle)', row: 5, col: 6, dir: 'down' },
        { answer: 'NINETY', clue: 'Ten less than one hundred', row: 5, col: 10, dir: 'down' }
      ]
    }
  ]
};

export function pickPuzzle(difficulty: Difficulty): CrosswordDef {
  const list = PUZZLES[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}
