import type { TutorialStep } from '../../platform/types';

export const nurikabeTutorial: TutorialStep[] = [
  {
    title: 'Islands in a sea',
    text: 'Every number is an island of light cells — the number tells you how many cells that island has, itself included. Paint the rest of the board as one dark sea.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <span className="tut-cell lit">2</span>
        <span className="tut-cell dim" />
        <span className="tut-cell dim" />
        <span className="tut-cell lit">1</span>
        <span className="tut-cell lit" />
        <span className="tut-cell dim" />
        <span className="tut-cell dim" />
        <span className="tut-cell dim" />
        <span className="tut-cell dim" />
        <span className="tut-cell dim" />
        <span className="tut-cell lit">3</span>
        <span className="tut-cell lit" />
      </div>
    )
  },
  {
    title: 'Paint sea or island',
    text: 'Pick Sea or Island at the bottom, then tap a cell or drag along a row or column to paint. Start on a painted cell to erase it back to blank. Numbered cells are locked.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key active">Sea</span>
          <span className="tut-key">Island</span>
        </div>
        <div className="tut-row">
          <span className="tut-cell dim" />
          <span className="tut-cell dim" />
          <span className="tut-cell dim" />
          <span className="tut-arrow">→</span>
          <span className="tut-cell lit">1</span>
        </div>
      </div>
    )
  },
  {
    title: 'The four rules',
    text: 'Each island has exactly one number and the right size, islands never touch side by side, the sea is all one connected piece, and the sea has no 2×2 block.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell dim" />
          <span className="tut-cell dim" />
          <span className="tut-arrow">✕</span>
          <span className="tut-label">no 2×2 sea</span>
        </div>
        <div className="tut-row">
          <span className="tut-cell dim" />
          <span className="tut-cell dim" />
        </div>
      </div>
    )
  },
  {
    title: 'Helpers count as help',
    text: 'Rule check outlines any broken rule in red, Complete islands dims a finished island, and the Hint button paints the next forced cell. Each one counts as an assist.',
    art: (
      <div className="tut-row">
        <span className="tut-cell good">2</span>
        <span className="tut-cell good" />
        <span className="tut-cell bad" />
        <span className="tut-cell same">?</span>
      </div>
    )
  },
  {
    title: 'Score the map',
    text: 'Solve the whole board to score every cell times the difficulty multiplier, minus errors and hints, plus a time bonus when you beat par.',
    art: (
      <div className="tut-col">
        <span className="chip good">+5 / cell × difficulty</span>
        <span className="chip accent">time bonus under par</span>
        <span className="chip bad">−20 / error · −30 / hint</span>
      </div>
    )
  }
];
