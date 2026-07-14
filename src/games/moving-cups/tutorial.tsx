import type { TutorialStep } from '../../platform/types';

/** A little row of cups; `ball` marks which cup hides the ball, `lift` which
    cups are raised (so their ball shows). Composed from .cup-tut-* helpers. */
function Cups({
  count = 3,
  ball,
  lift = [],
  hint,
  pick
}: {
  count?: number;
  ball?: number;
  lift?: number[];
  hint?: number;
  pick?: number;
}) {
  return (
    <div className="cup-tut-row">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="cup-tut-slot">
          <div
            className={[
              'cup-tut-cup',
              lift.includes(i) ? 'lift' : '',
              hint === i ? 'hint' : '',
              pick === i ? 'pick' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          />
          {ball === i && <span className="cup-tut-ball" />}
        </div>
      ))}
    </div>
  );
}

export const movingCupsTutorial: TutorialStep[] = [
  {
    title: 'Spot the ball',
    text: 'One cup lifts to show a ball hiding underneath. Lock your eyes onto that cup.',
    art: <Cups ball={1} lift={[1]} />
  },
  {
    title: 'Follow the shuffle',
    text: 'All cups drop, then swap places two at a time, arcing past one another. Track the ball the whole way.',
    art: (
      <div className="tut-row">
        <Cups count={3} />
        <span className="tut-arrow">→</span>
        <span className="chip accent">swap · swap · swap</span>
      </div>
    )
  },
  {
    title: 'Tap its cup',
    text: 'When the cups settle, tap the one you think hides the ball. Right lifts it in triumph — wrong reveals where it really was and costs a life.',
    art: <Cups count={3} ball={2} pick={2} />
  },
  {
    title: 'Clear every round',
    text: 'Each round adds another swap and speeds the shuffle up. Clear the tier’s target round to win; run out of lives and it ends.',
    art: (
      <div className="tut-row">
        <span className="chip">4 swaps</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">faster · +1 swap</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Slow-motion and Ball tint (a faint glow under the ball’s cup) make it followable; Peek briefly lifts every cup. Using any of them marks the win as assisted.',
    art: (
      <div className="tut-col">
        <Cups count={3} ball={0} hint={0} />
        <span className="chip accent">Ball tint · Slow-mo · Peek</span>
      </div>
    )
  }
];
