import type { CSSProperties } from 'react';
import type { TutorialStep } from '../../platform/types';

const car = (slot: number): CSSProperties => ({
  background: `var(--play-${slot})`,
  borderColor: `var(--play-${slot})`,
  color: 'var(--ink)'
});

export const gridlockTutorial: TutorialStep[] = [
  {
    title: 'Drive the red car out',
    text: 'Blocked in by traffic, the red car has to reach the exit gap on the right. Clear its lane and slide it off the board to win.',
    art: (
      <div className="tut-row">
        <span className="tut-cell" style={car(2)} />
        <span className="tut-cell" style={car(2)} />
        <span className="tut-arrow">→</span>
        <span className="tut-label">exit</span>
      </div>
    )
  },
  {
    title: 'Slide along the lane',
    text: 'Drag a car to move it. Cars only slide along their own lane — never turn — and cannot pass through each other. Let go to snap it to a square.',
    art: (
      <div className="tut-row">
        <span className="tut-cell" style={car(4)} />
        <span className="tut-cell" style={car(4)} />
        <span className="tut-arrow">→</span>
        <span className="tut-cell ghost" />
        <span className="tut-cell ghost" />
      </div>
    )
  },
  {
    title: 'Make room',
    text: 'Vertical trucks and cars block the exit lane. Nudge them up or down to open a gap, then drive the red car straight through.',
    art: (
      <div className="tut-row">
        <div className="tut-col" style={{ gap: 4 }}>
          <span className="tut-cell" style={car(4)} />
          <span className="tut-arrow" style={{ transform: 'rotate(90deg)' }}>→</span>
          <span className="tut-cell dim" />
        </div>
        <span className="tut-cell" style={car(2)} />
        <span className="tut-cell" style={car(2)} />
        <span className="tut-arrow">→</span>
      </div>
    )
  },
  {
    title: 'Beat par',
    text: 'Each slide counts as one move, however far the car travels. Solve in as few moves as par for the best score. Undo and Hint help you out but count as assists.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Moves 6</span>
        <span className="chip good">Par 6</span>
        <span className="chip">Hint = help</span>
      </div>
    )
  }
];
