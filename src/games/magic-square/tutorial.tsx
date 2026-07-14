import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const magicSquareTutorial: TutorialStep[] = [
  {
    title: 'Every line, one sum',
    text: 'Fill the square with the numbers 1 to N² so every row, every column and both diagonals add up to the same magic sum. For a 3×3 that sum is 15.',
    art: (
      <div className="tut-col">
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          {['2', '7', '6', '9', '5', '1', '4', '3', '8'].map((v, i) => (
            <Cell key={i} v={v} />
          ))}
        </div>
        <span className="chip accent">rows · cols · diagonals = 15</span>
      </div>
    )
  },
  {
    title: 'Take from the tray',
    text: 'Tap a number in the tray, then tap an empty cell to drop it in — or drag the chip straight onto the cell. Given numbers are locked and cannot move.',
    art: (
      <div className="tut-row">
        <span className="tut-key active">8</span>
        <span className="tut-arrow">→</span>
        <Cell c="sel" />
      </div>
    )
  },
  {
    title: 'Watch the sums',
    text: 'Each row, column and diagonal shows its running total in the margin. A line turns green the moment it is full and hits the magic sum, and red if it is full but wrong.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="2" /> <Cell v="7" /> <Cell v="6" />
          <span className="chip good">15</span>
        </div>
        <div className="tut-row">
          <Cell v="9" /> <Cell v="5" /> <Cell v="3" />
          <span className="chip bad">17</span>
        </div>
      </div>
    )
  },
  {
    title: 'Pick it back up',
    text: 'Placed a number in the wrong spot? Tap it to lift it back to the tray, then try it somewhere else. Any valid arrangement wins — there is more than one.',
    art: (
      <div className="tut-row">
        <Cell v="1" c="good" />
        <span className="tut-arrow">→</span>
        <Cell c="sel" />
        <span className="tut-key">1</span>
      </div>
    )
  },
  {
    title: 'Assists & scoring',
    text: 'Sums shows the margin totals; Glow lights an empty cell when only one number can complete its line; Hint drops in a correct number. Each placed number scores; errors and hints cost you, and a fast solve earns a time bonus.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Glow</span>
        <span className="chip good">+ placed</span>
        <span className="chip bad">− hint</span>
      </div>
    )
  }
];
