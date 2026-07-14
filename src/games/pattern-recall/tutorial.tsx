import type { TutorialStep } from '../../platform/types';

/** A tiny 3×3 board for the tutorial art, lighting the given cells. */
const MiniGrid = ({
  lit = [],
  found = [],
  wrong = [],
  decoy = []
}: {
  lit?: number[];
  found?: number[];
  wrong?: number[];
  decoy?: number[];
}) => (
  <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
    {Array.from({ length: 9 }, (_, i) => (
      <span
        key={i}
        className={[
          'tut-cell',
          lit.includes(i) ? 'lit' : '',
          found.includes(i) ? 'good' : '',
          wrong.includes(i) ? 'bad' : '',
          decoy.includes(i) ? 'bad' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      />
    ))}
  </div>
);

export const patternRecallTutorial: TutorialStep[] = [
  {
    title: 'Watch the flash',
    text: 'A set of cells lights up for a moment, then goes dark. Memorize which cells were lit — the position is all that matters.',
    art: <MiniGrid lit={[0, 4, 8]} />
  },
  {
    title: 'Tap them back',
    text: 'From memory, tap every cell that was lit. Order does not matter — only the set does. A correct tap locks in green.',
    art: <MiniGrid found={[0, 4]} lit={[8]} />
  },
  {
    title: 'Mistakes cost lives',
    text: 'Tap a cell that was dark and you lose a life, and the true pattern flashes back briefly. Clear the target round to win; run out of lives and it is over.',
    art: <MiniGrid found={[0, 4]} wrong={[2]} />
  },
  {
    title: 'It grows each round',
    text: 'Every round the grid and the number of lit cells grow, and the flash gets shorter. On pro and extreme a red decoy blinks before your turn — ignore it.',
    art: (
      <div className="tut-row">
        <span className="chip">3 lit</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">more, faster</span>
        <span className="chip bad">decoy</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Slow flash lengthens the window, Count reminder shows how many cells to tap, and Peek re-flashes the pattern. Each counts as help, so a clean win uses none.',
    art: (
      <div className="tut-col">
        <span className="chip good">Slow flash · Count reminder</span>
        <span className="chip accent">Peek = re-flash (help)</span>
      </div>
    )
  }
];
