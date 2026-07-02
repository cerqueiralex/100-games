import type { TutorialStep } from '../../platform/types';

const T = ({ v, c = '' }: { v: number; c?: string }) => (
  <span className={`tut-cell big nm-demo v${v} ${c}`}>{v}</span>
);

export const numberMergeTutorial: TutorialStep[] = [
  {
    title: 'Connect equal numbers',
    text: 'Drag across two or more touching tiles with the same number (diagonals count) to link them into a chain.',
    art: (
      <div className="tut-row">
        <T v={2} c="sel" />
        <T v={2} c="sel" />
        <span className="tut-arrow">→</span>
        <T v={4} />
      </div>
    )
  },
  {
    title: 'Chains can climb',
    text: 'After the first pair, the chain may continue onto tiles of equal OR double the value: 2, 2, 4, 8… The merge lands on the last tile you touched.',
    art: (
      <div className="tut-row">
        <T v={2} c="sel" />
        <T v={2} c="sel" />
        <T v={4} c="sel" />
        <span className="tut-arrow">→</span>
        <T v={8} c="good" />
      </div>
    )
  },
  {
    title: 'New tiles rain down',
    text: 'Merged tiles disappear, everything falls, and fresh numbers fill the top. Chain big combos to keep the board healthy — if no equal neighbours remain, the game is over.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <T v={8} />
          <T v={16} />
          <T v={4} />
        </div>
        <span className="tut-label">↓ tiles fall ↓</span>
      </div>
    )
  },
  {
    title: 'Reach the goal tile',
    text: 'Create a 256 / 512 / 1024 tile (easy/medium/hard) to win. Undo and Hint are there when you need them — both count as help.',
    art: (
      <div className="tut-col">
        <T v={512} c="good" />
        <span className="chip good">goal reached — you win</span>
      </div>
    )
  }
];
