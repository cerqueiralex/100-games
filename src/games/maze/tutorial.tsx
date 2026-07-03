import type { TutorialStep } from '../../platform/types';

export const mazeTutorial: TutorialStep[] = [
  {
    title: 'Find the target',
    text: 'You start in the top-left corner; the exit is the pulsing target at the bottom of the maze. Every maze is freshly generated, so no two runs are alike.',
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
    title: 'One step at a time',
    text: 'Each tap on the D-pad (or arrow key) moves the ball exactly one cell, and every step counts. Prefer gestures? Toggle the Drag tool and pull the ball through the corridors with your finger.',
    art: (
      <div className="tut-row">
        <span className="tut-cell hl" />
        <span className="tut-cell sel" />
        <span className="tut-cell" />
        <span className="tut-label">one tap · one step</span>
      </div>
    )
  },
  {
    title: 'Pick your size',
    text: 'Classic mazes grow bigger and twistier with difficulty. Or build a custom maze: choose the width and stretch the height as far as you dare — tall boards scroll as you descend.',
    art: (
      <div className="tut-row">
        <span className="chip">13×13</span>
        <span className="chip accent">11×90</span>
      </div>
    )
  },
  {
    title: 'Breadcrumbs & the path',
    text: 'Breadcrumbs paint the trail you have walked; Show path briefly draws the optimal route. Both count as help — a clean win means you navigated alone.',
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
