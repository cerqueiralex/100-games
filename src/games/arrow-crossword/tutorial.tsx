import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

/** a clue cell as the board draws it: small print plus an arrowhead */
const Clue = ({ text, dir, active = false }: { text: string; dir: 'right' | 'down'; active?: boolean }) => (
  <span className={`tut-cell tut-ac-clue ${active ? 'active' : ''}`}>
    <span>{text}</span>
    <i className={`ac-tri ${dir}`} aria-hidden />
  </span>
);

export const arrowCrosswordTutorial: TutorialStep[] = [
  {
    title: 'The clues are in the grid',
    text: 'No numbers, no list: every clue is printed in a cell of the board, with an arrow. The answer starts in the next cell along the arrow and runs until it meets another clue or the edge.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <Clue text="Feline pet" dir="right" />
        <Cell v="C" />
        <Cell v="A" />
        <Cell v="T" />
        <Cell c="blank" />
        <Cell c="blank" />
        <Cell c="blank" />
        <Cell c="blank" />
      </div>
    )
  },
  {
    title: 'Right and down',
    text: 'An arrow pointing right starts a word to the right; one pointing down starts a word below. Words cross, so a letter you type helps two answers at once.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <Cell c="blank" />
        <Clue text="Not off" dir="down" />
        <Cell c="blank" />
        <Cell c="blank" />
        <Clue text="Feline pet" dir="right" />
        <Cell v="O" c="sel" />
        <Cell v="A" />
        <Cell v="T" />
        <Cell c="blank" />
        <Cell v="N" />
        <Cell c="blank" />
        <Cell c="blank" />
      </div>
    )
  },
  {
    title: 'One cell, two clues',
    text: 'Some cells hold two clues stacked: the top one reads to the right, the bottom one down. Tap any clue to jump straight to its answer.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell tut-ac-clue double">
          <span className="ac-clue right">
            <span>Bee's home</span>
            <i className="ac-tri right" aria-hidden />
          </span>
          <span className="ac-clue down">
            <span>Dog's foot</span>
            <i className="ac-tri down" aria-hidden />
          </span>
        </span>
        <Cell v="H" />
        <Cell v="I" />
        <Cell v="P" />
        <Cell c="blank" />
        <Cell c="blank" />
      </div>
    )
  },
  {
    title: 'Type your answer',
    text: 'Tap a cell and type; the cursor moves along the arrow. Tap the same cell again to switch between its across and down answers. The bar above the keyboard repeats the current clue in bigger print.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="C" c="hl" />
          <Cell v="A" c="hl" />
          <Cell c="sel" />
        </div>
        <div className="tut-row">
          <span className="tut-key">R</span>
          <span className="tut-key">S</span>
          <span className="tut-key active">T</span>
        </div>
      </div>
    )
  },
  {
    title: 'Check, reveal, win',
    text: 'Typing never costs you: errors are only counted when you press Check (or, with Auto-check on, as a wrong letter lands). Check and Reveal count as help. Fill every cell correctly to win.',
    art: (
      <div className="tut-row">
        <Cell v="B" c="bad" />
        <span className="tut-arrow">→</span>
        <Cell v="T" c="good" />
        <span className="tut-arrow" />
        <span className="chip accent">Check</span>
        <span className="chip">Reveal</span>
      </div>
    )
  }
];
