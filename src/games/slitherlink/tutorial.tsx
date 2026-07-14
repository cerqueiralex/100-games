import type { TutorialStep } from '../../platform/types';

export const slitherlinkTutorial: TutorialStep[] = [
  {
    title: 'Draw one loop',
    text: 'Between the dots, draw edges to build a SINGLE closed loop that never branches or crosses. Every puzzle has exactly one solution.',
    art: (
      <svg viewBox="0 0 120 100" width="150" height="125" aria-hidden>
        <path
          d="M20 20 H60 V50 H80 V80 H20 Z"
          fill="var(--accent-soft)"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[20, 40, 60, 80, 100].map((x) =>
          [20, 50, 80].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="var(--text-dim)" />)
        )}
      </svg>
    )
  },
  {
    title: 'Numbers count edges',
    text: 'A numbered cell tells you how many of its four sides the loop uses. Blank cells can have any number of sides.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big good">3</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">3 of its 4 sides are drawn</span>
      </div>
    )
  },
  {
    title: 'Tap to cycle',
    text: 'Tap the gap between two dots to cycle it: empty → line → X → empty. Use the X mark to note a side you have ruled out.',
    art: (
      <div className="tut-row">
        <span className="chip muted">empty</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">line</span>
        <span className="tut-arrow">→</span>
        <span className="chip bad">✕</span>
      </div>
    )
  },
  {
    title: 'Read the feedback',
    text: 'A clue turns green when it has exactly the right number of sides, red when too many. A junction that would branch the loop is blocked.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big good">2</span>
        <span className="tut-cell big bad">1</span>
        <span className="tut-cell big">3</span>
      </div>
    )
  },
  {
    title: 'Score & assists',
    text: 'Score rewards satisfied clues (×1–5 by difficulty) plus a time bonus, minus errors and hints. Auto-X, the branch guard and the Hint button all count as help.',
    art: (
      <div className="tut-col">
        <span className="chip good">+ per solved clue · time bonus</span>
        <span className="chip accent">Hint = help</span>
      </div>
    )
  }
];
