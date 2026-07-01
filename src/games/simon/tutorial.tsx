import type { TutorialStep } from '../../platform/types';

const Pads = ({ lit, badges }: { lit?: number; badges?: (string | null)[] }) => (
  <div className="tut-pads">
    {['g', 'r', 'y', 'b'].map((color, i) => (
      <span key={i} className={`tut-pad ${color} ${lit === i ? 'lit' : ''}`}>
        {badges?.[i] ?? ''}
      </span>
    ))}
  </div>
);

export const simonTutorial: TutorialStep[] = [
  {
    title: 'Watch and listen',
    text: 'The four pads light up one after another, each with its own tone. Pay attention — that is the sequence you must repeat.',
    art: <Pads lit={1} />
  },
  {
    title: 'Repeat the sequence',
    text: 'When it says “Your turn”, tap the pads in exactly the same order.',
    art: <Pads badges={['1', '3', null, '2']} />
  },
  {
    title: 'It grows every round',
    text: 'Each round adds one more step to the sequence. Reach the target round — 8, 12 or 16 depending on difficulty — to win.',
    art: (
      <div className="tut-row">
        <span className="chip">3 steps</span>
        <span className="tut-arrow">→</span>
        <span className="chip">4 steps</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">5 steps…</span>
      </div>
    )
  },
  {
    title: 'One mistake ends it',
    text: 'A wrong pad ends the game — unless Second chances is on, which forgives up to two slips and replays the sequence. The Replay button lets you re-watch, at the cost of a hint.',
    art: (
      <div className="tut-col">
        <span className="chip good">Lives: 3</span>
        <span className="chip accent">Replay = re-watch (help)</span>
      </div>
    )
  }
];
