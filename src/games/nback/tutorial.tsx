import type { TutorialStep } from '../../platform/types';

const MiniGrid = ({ lit, label, letter }: { lit: number; label?: string; letter?: string }) => (
  <div className="tut-col">
    <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`tut-cell mini ${lit === i ? 'lit' : ''}`}>
          {lit === i ? letter ?? '' : ''}
        </span>
      ))}
    </div>
    {label && <span className="tut-label">{label}</span>}
  </div>
);

export const nBackTutorial: TutorialStep[] = [
  {
    title: 'Squares light up',
    text: 'One square lights up at a time, in a steady rhythm. Your job is to hold the recent positions in memory as they go by.',
    art: <MiniGrid lit={5} />
  },
  {
    title: 'Press Match on repeats',
    text: 'Press Match when the lit square is in the SAME position as the one N steps back. N is 1, 2 or 3 depending on difficulty.',
    art: (
      <div className="tut-row">
        <MiniGrid lit={2} label="2 back" />
        <span className="tut-arrow">→</span>
        <MiniGrid lit={2} label="now" />
      </div>
    )
  },
  {
    title: 'No match? Let it pass',
    text: 'If the position is different, do nothing. Pressing on a non-match is a false alarm, and missing a real match is an error too.',
    art: (
      <div className="tut-row">
        <MiniGrid lit={2} label="2 back" />
        <span className="tut-arrow">→</span>
        <MiniGrid lit={7} label="now — don't press" />
      </div>
    )
  },
  {
    title: 'Accuracy wins',
    text: 'Score 70% accuracy or better across all trials to win. Instant feedback, the N-back ghost outline and relaxed pace all make it easier — and all count as help.',
    art: (
      <div className="tut-col">
        <span className="tut-big">70%</span>
        <span className="chip good">accuracy to win</span>
      </div>
    )
  }
];
