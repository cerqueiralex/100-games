import type { CSSProperties, ReactNode } from 'react';
import type { TutorialStep } from '../../platform/types';

const BASE: CSSProperties = {
  background: 'color-mix(in srgb, var(--accent) 84%, var(--surface))',
  borderColor: 'transparent'
};
const ODD: CSSProperties = {
  background: 'color-mix(in srgb, var(--accent) 52%, var(--surface))',
  borderColor: 'transparent'
};

/** A mini grid of same-colored cells with one that differs (like the game). */
function MiniGrid({
  size,
  odd,
  ring
}: {
  size: number;
  odd: number;
  ring?: 'accent' | 'good';
}) {
  const cells: ReactNode[] = [];
  for (let i = 0; i < size * size; i++) {
    const isOdd = i === odd;
    const style: CSSProperties = isOdd
      ? { ...ODD, ...(ring ? { boxShadow: `0 0 0 3px var(--${ring})` } : {}) }
      : BASE;
    cells.push(<span key={i} className="tut-cell mini" style={style} />);
  }
  return (
    <div
      className="tut-grid"
      style={{ gridTemplateColumns: `repeat(${size}, auto)`, justifyContent: 'center' }}
    >
      {cells}
    </div>
  );
}

export const oddOneOutTutorial: TutorialStep[] = [
  {
    title: 'Find the odd tile',
    text: 'Every round shows a grid of matching tiles with exactly one that is slightly different — a paler shade, a tilt, a smaller size or a shifted hue.',
    art: <MiniGrid size={3} odd={4} />
  },
  {
    title: 'Tap it',
    text: 'Tap the tile that does not match. Get it right and it pops, then the next round deals in.',
    art: <MiniGrid size={3} odd={4} ring="good" />
  },
  {
    title: 'It keeps getting harder',
    text: 'Each round the grid grows and the difference shrinks. Clear the target round for your tier to win.',
    art: (
      <div className="tut-row">
        <MiniGrid size={2} odd={3} />
        <span className="tut-arrow">→</span>
        <MiniGrid size={3} odd={4} />
      </div>
    )
  },
  {
    title: 'Beat the clock',
    text: 'A bar drains each round. A wrong tap or running out of time costs a life and briefly reveals the true odd tile. Lose all your lives and the game ends.',
    art: (
      <div className="tut-col">
        <div className="ooo-timerbar low" style={{ width: 140 }} aria-hidden>
          <i style={{ width: '32%' }} />
        </div>
        <div className="tut-row">
          <span className="ooo-pip" aria-hidden />
          <span className="ooo-pip" aria-hidden />
          <span className="ooo-pip empty" aria-hidden />
        </div>
      </div>
    )
  },
  {
    title: 'Assists can help',
    text: 'More time slows the clock, Bigger difference keeps the odd tile easier to spot, and the Hint button pulses the region it is hiding in. Each counts as help.',
    art: (
      <div className="tut-row">
        <span className="chip accent">More time</span>
        <span className="chip accent">Bigger diff</span>
        <span className="chip accent">Hint</span>
      </div>
    )
  }
];
