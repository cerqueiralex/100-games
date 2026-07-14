import type { TutorialStep } from '../../platform/types';
import type { ReactNode } from 'react';

/** A tiny 3×3 demo grid built from the shared .tut-cell primitive. */
const Grid = ({ cells }: { cells: { face?: ReactNode; tone?: string }[] }) => (
  <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
    {cells.map((c, i) => (
      <span key={i} className={`tut-cell ${c.tone ?? ''}`}>
        {c.face ?? ''}
      </span>
    ))}
  </div>
);

const N = (face: ReactNode) => ({ face, tone: 'sel' });
const DIM = { tone: 'dim' };
const BOX = {};
const GHOST = { tone: 'ghost' };

export const numberTrailTutorial: TutorialStep[] = [
  {
    title: 'A flash of numbers',
    text: 'Numbers appear on random tiles for a short moment. Study where each one sits — the flash is brief and it shrinks every round.',
    art: <Grid cells={[N(3), DIM, N(1), DIM, N(4), DIM, N(2), DIM, DIM]} />
  },
  {
    title: 'Then they vanish',
    text: 'When the flash ends the tiles go blank. Now you must remember which tile held which number.',
    art: <Grid cells={[BOX, DIM, BOX, DIM, BOX, DIM, BOX, DIM, DIM]} />
  },
  {
    title: 'Tap in order',
    text: 'Tap the tiles in ascending order — 1, then 2, then 3… Each correct tap locks green with a rising note.',
    art: (
      <div className="tut-row">
        <span className="tut-cell good">1</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">2</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">3</span>
      </div>
    )
  },
  {
    title: 'A slip costs a life',
    text: 'Tap the wrong tile and the numbers briefly re-appear, the correct one is flagged, and you lose a life. Run out of lives and the run ends.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell bad">5</span>
          <span className="tut-cell sel">2</span>
        </div>
        <span className="chip bad">Wrong · −1 life</span>
      </div>
    )
  },
  {
    title: 'Clear rounds to win',
    text: 'Every round adds another number. Clear the target — 6 to 9 rounds by difficulty — to win. Extreme scatters non-consecutive values, so read them carefully.',
    art: (
      <div className="tut-row">
        <span className="chip">4 nums</span>
        <span className="tut-arrow">→</span>
        <span className="chip">5</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">win</span>
      </div>
    )
  },
  {
    title: 'Assists that help',
    text: 'Outline keeps a marker on tiles that held a number; Slow flash lengthens the reveal; Peek re-shows the remaining numbers (max 3). Each counts as help.',
    art: (
      <div className="tut-col">
        <Grid cells={[GHOST, DIM, GHOST, DIM, GHOST, DIM, GHOST, DIM, DIM]} />
        <span className="chip accent">Outline · Slow · Peek</span>
      </div>
    )
  }
];
