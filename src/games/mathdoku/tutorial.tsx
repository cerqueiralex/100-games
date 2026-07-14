import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const mathdokuTutorial: TutorialStep[] = [
  {
    title: 'A number square',
    text: 'Fill the grid so every row and every column contains 1 up to the grid size exactly once — like sudoku without boxes. Boards grow from 4×4 to 7×7.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        {['1', '2', '3', '3', '1', '2', '2', '', '1'].map((v, i) => (
          <Cell key={i} v={v} c={v === '' ? 'sel' : ''} />
        ))}
      </div>
    )
  },
  {
    title: 'Cages must compute',
    text: 'Outlined cages show a target and an operation: the digits inside must produce it, in any order — 5 and 2 solve "3−" as well as "7+". Single-cell cages are free givens.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip accent">3−</span>
          <Cell v="5" c="good" />
          <Cell v="2" c="good" />
        </div>
        <div className="tut-row">
          <span className="chip accent">8×</span>
          <Cell v="2" c="good" />
          <Cell v="4" c="good" />
          <span className="chip">4 = given</span>
        </div>
      </div>
    )
  },
  {
    title: 'Select, then place',
    text: 'Tap a cell, then a number on the pad. Toggle Notes to pencil in candidates. A digit may even repeat inside an L-shaped cage — just never in a row or column.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="4" />
          <Cell c="sel" />
          <Cell v="1" />
        </div>
        <div className="tut-row">
          <span className="tut-key">2</span>
          <span className="tut-key active">3</span>
          <span className="tut-key">5</span>
        </div>
      </div>
    )
  },
  {
    title: 'Extreme hides the ops',
    text: 'On Extreme the clue shows only the target number — any operation could apply. A two-cell "6" might be 2×3, 1+5 or 7−1. Deduce which one fits.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip accent">6</span>
          <Cell c="sel" />
          <Cell c="sel" />
        </div>
        <div className="tut-row">
          <span className="chip">2×3</span>
          <span className="chip">1+5</span>
          <span className="chip">7−1</span>
        </div>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Cage check paints finished cages green or red, Dupes flags repeats in rows and columns, and Hint fills a correct cell. All are recorded as help — win without them for a clean win.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="5" c="good" />
          <Cell v="2" c="good" />
          <Cell v="4" c="bad" />
          <Cell v="4" c="bad" />
        </div>
        <div className="tut-row">
          <span className="chip good">cage ✓</span>
          <span className="chip bad">−30 error</span>
          <span className="chip accent">Hint −40</span>
        </div>
      </div>
    )
  }
];
