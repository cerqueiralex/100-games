import type { TutorialStep } from '../../platform/types';

export const wordWheelTutorial: TutorialStep[] = [
  {
    title: 'Spell from the wheel',
    text: 'Tap letters one by one and press Submit — or hold and DRAG through the letters and release to submit in one motion. Each wheel letter can be used once per word.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key active">T</span>
          <span className="tut-key active">E</span>
          <span className="tut-key active">A</span>
          <span className="tut-key">S</span>
        </div>
        <span className="chip accent">drag T→E→A, release ✓</span>
      </div>
    )
  },
  {
    title: 'Two ways to play',
    text: 'Crossword wheel: fill a hand-crafted criss-cross grid. Word hunt: a fresh random wheel hides 3–9 letter words — every one uses the CENTER letter, and the tier list tracks what is left to find.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Crossword</span>
        <span className="tut-arrow">or</span>
        <span className="chip accent">Word hunt</span>
      </div>
    )
  },
  {
    title: 'Fill the crossword',
    text: 'In crossword mode every correct word drops into the criss-cross grid above. Words share letters where they cross.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell good">T</span>
        <span className="tut-cell good">E</span>
        <span className="tut-cell good">A</span>
        <span className="tut-cell blank" />
        <span className="tut-cell">A</span>
        <span className="tut-cell blank" />
        <span className="tut-cell blank" />
        <span className="tut-cell">T</span>
        <span className="tut-cell blank" />
      </div>
    )
  },
  {
    title: 'Wrong guesses cost',
    text: 'Submitting a word that is not in the grid counts as a miss (−5 points). Shuffle the wheel any time for a fresh perspective — that one is free.',
    art: (
      <div className="tut-row">
        <span className="chip bad">SAE ✗ miss</span>
        <span className="chip">Shuffle = free</span>
      </div>
    )
  },
  {
    title: 'Find every word',
    text: 'The game is won when all words are placed. The Hint button reveals a letter (−15, counts as help); finishing under par time earns a bonus.',
    art: (
      <div className="tut-col">
        <span className="tut-big">4 / 4</span>
        <span className="chip good">words found — you win</span>
      </div>
    )
  }
];
