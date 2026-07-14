import type { ReactNode } from 'react';
import type { TutorialStep } from '../../platform/types';

/** A little peg with a stack of graduated discs (sizes bottom→top). */
function Peg({ sizes, lift, className = '' }: { sizes: number[]; lift?: number; className?: string }) {
  return (
    <span className={`toh-tut-peg ${className}`}>
      <span className="toh-tut-post" />
      <span className="toh-tut-stack">
        {[...sizes].reverse().map((s, i) => (
          <span key={i} className={`toh-tut-disc w${s}`} />
        ))}
      </span>
      {lift !== undefined && <span className={`toh-tut-disc w${lift} toh-tut-hover`} />}
    </span>
  );
}

const Board = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`toh-tut-board ${className}`}>{children}</div>
);

export const towerOfHanoiTutorial: TutorialStep[] = [
  {
    title: 'Move the whole tower',
    text: 'Discs start stacked biggest to smallest on the first peg. Shift the entire ordered stack onto the last peg to win.',
    art: (
      <div className="tut-row">
        <Board>
          <Peg sizes={[4, 3, 2, 1]} />
          <Peg sizes={[]} />
          <Peg sizes={[]} className="target" />
        </Board>
        <span className="tut-arrow">→</span>
        <Board>
          <Peg sizes={[]} />
          <Peg sizes={[]} />
          <Peg sizes={[4, 3, 2, 1]} className="target" />
        </Board>
      </div>
    )
  },
  {
    title: 'One disc at a time',
    text: 'Tap a peg to lift its top disc, then tap another peg to drop it — or just drag a disc across. Only the topmost disc of a peg can move.',
    art: (
      <Board>
        <Peg sizes={[4, 3, 2]} lift={1} />
        <Peg sizes={[]} />
        <Peg sizes={[]} className="target" />
      </Board>
    )
  },
  {
    title: 'Never big on small',
    text: 'A disc may only rest on a larger one (or an empty peg). Drop a big disc on a smaller one and it shakes and stays in your hand.',
    art: (
      <div className="tut-row">
        <Board>
          <Peg sizes={[2]} />
          <Peg sizes={[1]} lift={4} className="bad" />
          <Peg sizes={[]} />
        </Board>
        <span className="chip bad">not allowed</span>
      </div>
    )
  },
  {
    title: 'Race the par',
    text: 'The fewest possible moves is your par (7 discs on the classic 3 pegs). Extreme adds a fourth peg, so 7 discs need only 25 moves. Beat par and finish fast for a bigger score.',
    art: (
      <div className="tut-col">
        <Board className="wide">
          <Peg sizes={[]} />
          <Peg sizes={[]} />
          <Peg sizes={[]} />
          <Peg sizes={[3, 2, 1]} className="target" />
        </Board>
        <span className="chip good">4 pegs · fewer moves</span>
      </div>
    )
  },
  {
    title: 'Assists when stuck',
    text: 'Valid landing pegs glow while you hold a disc. Undo takes back your last move and Hint points out the optimal next move — both count as help.',
    art: (
      <div className="tut-row">
        <span className="tut-key active">Glow</span>
        <span className="tut-key">Undo</span>
        <span className="tut-key">Hint</span>
      </div>
    )
  }
];
