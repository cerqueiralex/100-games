import type { TutorialStep } from '../../platform/types';

const Card = ({ v, c = '' }: { v: string; c?: string }) => (
  <span className={`tut-cell big ${c}`}>{v}</span>
);

export const make24Tutorial: TutorialStep[] = [
  {
    title: 'Make exactly 24',
    text: 'Four number cards are dealt. Combine all of them — using each card exactly once — to reach the target, usually 24.',
    art: (
      <div className="tut-row">
        <Card v="4" />
        <Card v="6" />
        <Card v="8" />
        <Card v="3" />
        <span className="tut-arrow">→</span>
        <Card v="24" c="good" />
      </div>
    )
  },
  {
    title: 'Tap, operate, tap',
    text: 'Tap a card, tap an operator, then tap a second card. The two cards merge into a single new card holding the result.',
    art: (
      <div className="tut-row">
        <Card v="6" c="sel" />
        <span className="tut-key active">×</span>
        <Card v="4" c="sel" />
        <span className="tut-arrow">→</span>
        <Card v="24" c="good" />
      </div>
    )
  },
  {
    title: 'Fractions welcome',
    text: 'Division is fair game and cards can become fractions on the way. Your tap order decides the parentheses, so 8 ÷ 3 makes an 8⁄3 card you can keep combining.',
    art: (
      <div className="tut-row">
        <Card v="8" c="sel" />
        <span className="tut-key active">÷</span>
        <Card v="3" c="sel" />
        <span className="tut-arrow">→</span>
        <Card v="8⁄3" />
      </div>
    )
  },
  {
    title: 'Solve the round',
    text: 'Reduce to one card equal to the target to solve a deal — a green burst deals in the next. Clear every deal to win the round. A wrong final card just shakes; undo and try again.',
    art: (
      <div className="tut-col">
        <span className="tut-big" style={{ color: 'var(--good)' }}>
          = 24!
        </span>
        <span className="chip good">deal solved · next deals in</span>
      </div>
    )
  },
  {
    title: 'Undo, Hint & Reveal',
    text: 'Undo and Reset are always free. The Hint assist lights up the next move; Reveal shows the whole solution but forfeits that deal’s points. Both count as help.',
    art: (
      <div className="tut-row">
        <span className="tut-key wide active">Hint</span>
        <span className="tut-key wide">Reveal</span>
      </div>
    )
  }
];
