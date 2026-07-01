import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const crosswordTutorial: TutorialStep[] = [
  {
    title: 'Words that cross',
    text: 'Solve the clues and type the answers into the grid. Words share letters where they cross, so every answer helps the next one.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <Cell v="C" />
        <Cell v="A" c="sel" />
        <Cell v="T" />
        <Cell c="blank" />
        <Cell v="P" />
        <Cell c="blank" />
        <Cell c="blank" />
        <Cell v="E" />
        <Cell c="blank" />
      </div>
    )
  },
  {
    title: 'Clues and direction',
    text: 'Tap a cell to select its word; tap it again to switch between Across and Down. The arrows on the clue bar cycle through every clue.',
    art: (
      <div className="tut-cluebar-demo">
        <span className="tut-key">‹</span>
        <span className="tut-clue-demo">
          <b>1 Across</b>
          <span>Feline pet</span>
        </span>
        <span className="tut-key">›</span>
      </div>
    )
  },
  {
    title: 'Type your answer',
    text: 'Use the on-screen keyboard (or a real one on desktop). The cursor moves ahead as you type and skips letters you already filled.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="C" />
          <Cell v="A" />
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
    text: 'Auto-check flags wrong letters in red as you type; Check and Reveal help when stuck — all recorded as help. Fill every cell correctly to win.',
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
