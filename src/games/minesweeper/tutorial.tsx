import type { TutorialStep } from '../../platform/types';

export const minesweeperTutorial: TutorialStep[] = [
  {
    title: 'Clear the field',
    text: 'Mines hide under the board. Tap to reveal cells — clear every safe cell without hitting a mine to win. Your first tap is protected (if the assist is on).',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell hl">1</span>
        <span className="tut-cell hl">1</span>
        <span className="tut-cell" />
        <span className="tut-cell hl">1</span>
        <span className="tut-cell bad">✱</span>
        <span className="tut-cell" />
        <span className="tut-cell hl">1</span>
        <span className="tut-cell hl">1</span>
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Numbers are clues',
    text: 'A revealed number tells you how many mines touch that cell, diagonals included. Empty cells auto-clear their whole neighbourhood.',
    art: (
      <div className="tut-row">
        <span className="tut-cell same">2</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">2 mines in the 8 cells around it</span>
      </div>
    )
  },
  {
    title: 'Flag the mines',
    text: 'Long-press a cell (or switch on Flag mode) to mark a suspected mine. Tapping a satisfied number "chords": it reveals all its unflagged neighbours at once.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel">⚑</span>
        <span className="tut-cell hl">1</span>
        <span className="tut-cell hl">1</span>
      </div>
    )
  },
  {
    title: 'Score the sweep',
    text: 'Every cleared cell scores points; winning adds a bonus per mine plus a time bonus under par. The Safe cell hint reveals a guaranteed-safe square (counts as help).',
    art: (
      <div className="tut-col">
        <span className="chip good">+5 / cell · +20 / mine on win</span>
        <span className="chip accent">Safe cell = help</span>
      </div>
    )
  }
];
