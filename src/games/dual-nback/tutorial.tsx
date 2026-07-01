import type { TutorialStep } from '../../platform/types';

const MiniGrid = ({ lit, letter, label }: { lit: number; letter?: string; label?: string }) => (
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

export const dualNBackTutorial: TutorialStep[] = [
  {
    title: 'Two things at once',
    text: 'Every step shows a position AND a letter inside it. You track both streams in memory at the same time — that is the “dual” part.',
    art: <MiniGrid lit={2} letter="K" />
  },
  {
    title: 'Judge each channel',
    text: 'Compare with N steps back: press Position if the square repeats, Letter if the letter repeats — one, both, or neither each trial.',
    art: (
      <div className="tut-row">
        <span className="tut-key wide active">Position</span>
        <span className="tut-key wide">Letter</span>
      </div>
    )
  },
  {
    title: 'They repeat independently',
    text: 'Here the letter matches 1 back but the position does not — so you would press only Letter.',
    art: (
      <div className="tut-row">
        <MiniGrid lit={0} letter="R" label="1 back" />
        <span className="tut-arrow">→</span>
        <MiniGrid lit={8} letter="R" label="now — Letter only" />
      </div>
    )
  },
  {
    title: 'Accuracy wins',
    text: 'Both channels are scored on every trial. Reach 65% combined accuracy to win. Feedback, the N-back reminder and relaxed pace count as help.',
    art: (
      <div className="tut-col">
        <span className="tut-big">65%</span>
        <span className="chip good">accuracy to win</span>
      </div>
    )
  }
];
