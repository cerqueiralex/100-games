import type { TutorialStep } from '../../platform/types';

export const aquariumTutorial: TutorialStep[] = [
  {
    title: 'Fill the tanks',
    text: 'The grid is split into tanks with thick walls. The numbers say how many water cells each row and column must hold — satisfy them all to win.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <span className="aqu-tut-clue" />
        <span className="aqu-tut-clue">2</span>
        <span className="aqu-tut-clue">2</span>
        <span className="aqu-tut-clue">1</span>
        <span className="aqu-tut-clue">0</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell aqu-twl" />
        <span className="aqu-tut-clue">2</span>
        <span className="tut-cell aqu-tut-water" />
        <span className="tut-cell aqu-tut-water" />
        <span className="tut-cell aqu-twl" />
        <span className="aqu-tut-clue">3</span>
        <span className="tut-cell aqu-tut-water" />
        <span className="tut-cell aqu-tut-water" />
        <span className="tut-cell aqu-tut-water aqu-twl" />
      </div>
    )
  },
  {
    title: 'Water finds its level',
    text: 'Tap a cell to pour water up to that row: the whole tank row fills, and every tank row below stays full. Tap a water cell to drain it and everything above it.',
    art: (
      <div className="tut-row">
        <div className="tut-grid" style={{ gridTemplateColumns: 'auto' }}>
          <span className="tut-cell" />
          <span className="tut-cell sel" />
          <span className="tut-cell" />
        </div>
        <span className="tut-arrow">→</span>
        <div className="tut-grid" style={{ gridTemplateColumns: 'auto' }}>
          <span className="tut-cell" />
          <span className="tut-cell aqu-tut-water" />
          <span className="tut-cell aqu-tut-water" />
        </div>
        <span className="chip accent">Rows below fill by themselves</span>
      </div>
    )
  },
  {
    title: 'Read the counts',
    text: 'A count turns green when its line holds exactly the right amount of water, and red when the line is overfull. Overflowing a line counts as an error.',
    art: (
      <div className="tut-col">
        <span className="chip good">3 — just right</span>
        <span className="chip bad">4 — overfull</span>
      </div>
    )
  },
  {
    title: 'Mark dry cells',
    text: 'Switch to Mark mode to put an X on cells you know must stay dry. With Line check on, satisfied counts are crossed out and impossible cells get marked for you.',
    art: (
      <div className="tut-row">
        <span className="tut-cell">×</span>
        <span className="tut-cell aqu-tut-water" />
        <span className="chip accent">X = stays dry</span>
      </div>
    )
  },
  {
    title: 'Helping hands',
    text: 'Hold a cell to glow its whole tank, and the Level button sets one tank to its correct level. Every assist counts as help — solve without them for a clean win.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Hint = one tank solved (−40)</span>
        <span className="chip good">No help = clean win</span>
      </div>
    )
  }
];
