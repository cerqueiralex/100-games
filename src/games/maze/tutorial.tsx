import type { TutorialStep } from '../../platform/types';

export const mazeTutorial: TutorialStep[] = [
  {
    title: 'Find the exit',
    text: 'You start in the top-left corner; the exit glows in the bottom-right. Every maze is freshly generated, so no two runs are alike.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell sel" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell good" />
      </div>
    )
  },
  {
    title: 'Corridor running',
    text: 'Tap a direction (or use arrow keys) and you glide down the corridor — around corners too — until you reach a junction. No tap-tap-tapping through hallways.',
    art: (
      <div className="tut-row">
        <span className="tut-cell hl" />
        <span className="tut-cell hl" />
        <span className="tut-cell hl" />
        <span className="tut-cell sel" />
        <span className="tut-label">one tap</span>
      </div>
    )
  },
  {
    title: 'Beat the shortest path',
    text: 'The maze knows its optimal route length. Every step beyond it costs points, and finishing fast earns a time bonus.',
    art: (
      <div className="tut-row">
        <span className="chip good">Shortest: 28</span>
        <span className="chip">Your steps: 31</span>
      </div>
    )
  },
  {
    title: 'Breadcrumbs & the path',
    text: 'Breadcrumbs tint everywhere you have been; Show path flashes the optimal route for 2 seconds. Both count as help.',
    art: (
      <div className="tut-row">
        <span className="tut-cell hl" />
        <span className="tut-cell hl" />
        <span className="tut-cell ghost" />
        <span className="tut-cell ghost" />
      </div>
    )
  }
];
