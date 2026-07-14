import type { TutorialStep } from '../../platform/types';

export const schulteTableTutorial: TutorialStep[] = [
  {
    title: 'Find them in order',
    text: 'The grid is scrambled with the numbers 1 up to the last. Tap them in ascending order — 1, then 2, then 3 — as fast as your eyes can move.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell same">1</span>
        <span className="tut-cell">7</span>
        <span className="tut-cell">3</span>
        <span className="tut-cell">9</span>
        <span className="tut-cell">2</span>
        <span className="tut-cell">5</span>
        <span className="tut-cell">8</span>
        <span className="tut-cell">4</span>
        <span className="tut-cell">6</span>
      </div>
    )
  },
  {
    title: 'Chase the target',
    text: 'The Next chip always shows the number to hunt for. A correct tap pops and locks the tile; the clock keeps running the whole time.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Next 2</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">2</span>
      </div>
    )
  },
  {
    title: 'Misses cost time',
    text: 'Tap the wrong number and it buzzes — no harm to the grid, but 1.5s is added to your time, which drags your score below par.',
    art: (
      <div className="tut-row">
        <span className="tut-cell bad">5</span>
        <span className="tut-arrow">→</span>
        <span className="chip bad">+1.5s</span>
      </div>
    )
  },
  {
    title: 'Harder tables',
    text: 'Bigger grids hold more numbers. Pro counts DOWN from the top, and Extreme mixes two colours you must alternate: red 1, blue 1, red 2, blue 2…',
    art: (
      <div className="tut-row">
        <span className="chip accent">Pro counts down</span>
        <span className="chip">red 1 · blue 1 · red 2…</span>
      </div>
    )
  },
  {
    title: 'Beat par for points',
    text: 'Finishing under the par time multiplies your score; slower runs earn less. Assists — the gaze dot, dimming found tiles, outlining the next tile and Peek — all count as help.',
    art: (
      <div className="tut-col">
        <span className="chip good">Under par = more points</span>
        <span className="chip accent">Fixation dot · Peek = help</span>
      </div>
    )
  }
];
