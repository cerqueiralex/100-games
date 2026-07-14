import type { TutorialStep } from '../../platform/types';

/** A tiny shape cluster for the illustrations — content colors from the
 *  --play-* palette, so it reads the same on every theme. */
const Cluster = ({ dim }: { dim?: boolean }) => (
  <svg
    className={`cc-tut-cluster ${dim ? 'dim' : ''}`}
    viewBox="0 0 100 60"
    width="150"
    height="90"
    aria-hidden
  >
    <circle cx="20" cy="20" r="9" fill="var(--play-4)" />
    <circle cx="72" cy="16" r="9" fill="var(--play-4)" />
    <rect x="40" y="30" width="16" height="16" rx="3" fill="var(--play-2)" />
    <polygon points="82,44 90,30 74,30" fill="var(--play-1)" />
    <polygon points="18,52 20.4,45.6 27,45.2 21.8,41 23.6,34.6 18,38.4 12.4,34.6 14.2,41 9,45.2 15.6,45.6" fill="var(--play-3)" />
  </svg>
);

export const countCompareTutorial: TutorialStep[] = [
  {
    title: 'A flash of shapes',
    text: 'A cluster of colored shapes flashes on screen for just a moment, then fades away. Take it all in while you can.',
    art: <Cluster />
  },
  {
    title: 'Answer before it fades',
    text: 'A question appears — like “More blue or red?”. Tap the right answer before the time bar empties. Faster answers score more.',
    art: (
      <div className="tut-col">
        <span className="tut-label">More blue or red?</span>
        <div className="tut-row">
          <span className="tut-key active">Blue</span>
          <span className="tut-key">Red</span>
        </div>
      </div>
    )
  },
  {
    title: 'Streaks and lives',
    text: 'Every correct answer builds your streak and points. A wrong answer — or letting the timer run out — costs a life and shows you what it was.',
    art: (
      <div className="tut-row">
        <span className="chip good">Correct → streak +1</span>
        <span className="chip bad">Wrong → lose a life</span>
      </div>
    )
  },
  {
    title: 'It ramps up',
    text: 'Each round adds more shapes and shortens the flash. Clear all of the tier’s rounds to win; run out of lives and it is game over.',
    art: (
      <div className="tut-row">
        <Cluster dim />
        <span className="tut-arrow">→</span>
        <span className="chip accent">more shapes, faster</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Longer flash and Narrow (color questions only) make it gentler; Re-flash replays the scene up to three times. Any assist used marks the win as helped, never clean.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Longer flash</span>
        <span className="chip accent">Re-flash · Narrow</span>
      </div>
    )
  }
];
