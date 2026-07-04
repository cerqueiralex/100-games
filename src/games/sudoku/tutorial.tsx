import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const sudokuTutorial: TutorialStep[] = [
  {
    title: 'One simple rule',
    text: 'Fill the grid so every row, every column and every 3×3 box contains the digits 1–9 exactly once. No repeats, ever.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        {['1', '2', '3', '5', '6', '4', '9', '', '8'].map((v, i) => (
          <Cell key={i} v={v} c={v === '' ? 'sel' : ''} />
        ))}
      </div>
    )
  },
  {
    title: 'Select, then place',
    text: 'Tap an empty cell, then tap a number on the pad. Correct digits lock in; wrong ones turn red and count as errors.',
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
      </div>
    )
  },
  {
    title: 'Pencil in notes',
    text: 'Toggle Notes to jot small candidate digits in a cell while you reason. Placing a real digit clears related notes automatically.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big">
          <span className="tut-notes">
            <i>2</i>
            <i />
            <i>4</i>
            <i />
            <i />
            <i />
            <i>7</i>
            <i />
            <i />
          </span>
        </span>
        <span className="tut-arrow">→</span>
        <Cell v="7" c="good big" />
      </div>
    )
  },
  {
    title: 'Assists light the way',
    text: 'Region highlight marks your row, column and box; same-number highlight paints matching digits; Rule out fades blocks that already hold your digit (the digits stay bright). All toggleable in-game — and all recorded as help.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <Cell v="7" c="same" />
        <Cell c="hl" />
        <Cell />
        <Cell c="hl" />
        <Cell v="7" c="sel" />
        <Cell c="hl" />
        <Cell />
        <Cell c="hl" />
        <Cell v="7" c="same" />
      </div>
    )
  },
  {
    title: 'Points, errors, par time',
    text: 'Correct cells earn points; errors and hints cost you. With the error limit on, three mistakes end the game. Finish under par time for a big bonus.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">+100 correct</span>
          <span className="chip bad">−50 error</span>
        </div>
        <div className="tut-row">
          <span className="chip accent">Errors 1 / 3</span>
          <span className="chip">Under par = bonus</span>
        </div>
      </div>
    )
  }
];
