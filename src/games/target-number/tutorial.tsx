import type { TutorialStep } from '../../platform/types';

export const targetNumberTutorial: TutorialStep[] = [
  {
    title: 'Reach the target',
    text: 'A three-digit target appears above six number tiles — a mix of small values (1–10) and big ones (25, 50, 75, 100). Build it exactly.',
    art: (
      <div className="tut-col">
        <span className="tut-big">532</span>
        <div className="tut-row">
          <span className="tut-cell">100</span>
          <span className="tut-cell">5</span>
          <span className="tut-cell">6</span>
          <span className="tut-cell">3</span>
          <span className="tut-cell">1</span>
        </div>
      </div>
    )
  },
  {
    title: 'Tap to combine',
    text: 'Tap a number, tap an operation, then tap another number. The two merge into a new result tile — use + − × ÷, each tile at most once.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel">100</span>
        <span className="tut-key active">×</span>
        <span className="tut-cell sel">5</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">500</span>
      </div>
    )
  },
  {
    title: 'Fair play rules',
    text: 'Division must come out evenly, and no step may drop to zero or below. The best-reached chip always shows how close your closest tile is.',
    art: (
      <div className="tut-col">
        <span className="chip good">10 ÷ 5 = 2</span>
        <span className="chip bad">7 ÷ 2 not allowed</span>
      </div>
    )
  },
  {
    title: 'Hit it or get close',
    text: 'Land on the target for the full score plus a speed bonus. Cannot reach it? Submit your closest tile — within a few of the target still scores.',
    art: (
      <div className="tut-col">
        <span className="tut-cell big good">532</span>
        <span className="chip good">exact — full points</span>
        <span className="chip accent">within 4 — partial</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'The reachable badge confirms an exact answer exists; Hint shows the next move; Reveal gives the whole solution (no points that round). Any assist marks the win as helped, never clean.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Reachable</span>
        <span className="chip accent">Hint</span>
        <span className="chip accent">Reveal</span>
      </div>
    )
  }
];
