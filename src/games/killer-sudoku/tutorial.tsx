import type { ReactNode } from 'react';
import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

/** a dotted killer cage wrapping a few tutorial cells, sum tag on top */
const Cage = ({ sum, children }: { sum: number; children: ReactNode }) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-flex',
      gap: 3,
      padding: 6,
      border: '2px dashed var(--accent)',
      borderRadius: 9
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: -9,
        left: 7,
        fontSize: 11,
        fontWeight: 750,
        color: 'var(--accent)',
        background: 'var(--surface-2)',
        padding: '0 4px',
        lineHeight: 1.2
      }}
    >
      {sum}
    </span>
    {children}
  </span>
);

export const killerSudokuTutorial: TutorialStep[] = [
  {
    title: 'Sudoku, plus cages',
    text: 'All the classic rules apply: every row, column and 3×3 box holds 1–9 exactly once. On top, the grid is carved into dotted cages, each printed with a sum.',
    art: (
      <div className="tut-row">
        <Cage sum={4}>
          <Cell v="1" />
          <Cell v="3" />
        </Cage>
        <Cage sum={16}>
          <Cell v="7" />
          <Cell v="9" />
        </Cage>
      </div>
    )
  },
  {
    title: 'Sums are the clues',
    text: 'The digits in a cage add up to its sum and never repeat inside it. A 2-cell cage marked 17 can only be 8+9. With barely any givens, the sums are your way in.',
    art: (
      <div className="tut-col">
        <Cage sum={17}>
          <Cell c="sel" />
          <Cell c="sel" />
        </Cage>
        <div className="tut-row">
          <span className="chip good">8 + 9 only</span>
          <span className="chip bad">8 + 8 repeats</span>
        </div>
      </div>
    )
  },
  {
    title: 'Select, then place',
    text: 'Tap a cell, then tap a digit on the pad. Correct digits lock in; wrong ones turn red and cost points. A counter under the board shows the selected cage filling up, like 9/15.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="4" />
          <Cell c="sel" />
          <Cell v="1" />
        </div>
        <div className="tut-row">
          <span className="tut-key">5</span>
          <span className="tut-key active">7</span>
          <span className="tut-key">9</span>
        </div>
        <span className="chip accent">Cage 9 / 15</span>
      </div>
    )
  },
  {
    title: 'Pencil in notes',
    text: 'Toggle Notes to jot candidate digits while you work a cage out. With the Tidy assist on, placing a real digit sweeps matching notes from its row, column, box and cage.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big">
          <span className="tut-notes">
            <i />
            <i>2</i>
            <i />
            <i />
            <i />
            <i>6</i>
            <i />
            <i>8</i>
            <i />
          </span>
        </span>
        <span className="tut-arrow">→</span>
        <Cell v="8" c="good big" />
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Cage check flags every finished cage green or red. Dupes highlights repeated digits. Hints fill a correct cell for points. They are all recorded as help — clean wins use none.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cage sum={12}>
            <Cell v="3" c="good" />
            <Cell v="9" c="good" />
          </Cage>
          <Cage sum={11}>
            <Cell v="5" c="bad" />
            <Cell v="5" c="bad" />
          </Cage>
        </div>
        <div className="tut-row">
          <span className="chip good">Sum works</span>
          <span className="chip bad">Repeat!</span>
        </div>
      </div>
    )
  }
];
