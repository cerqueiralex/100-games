import type { TutorialStep } from '../../platform/types';

/* ♣ = tree, ▲ = tent — text glyphs composed with the .tut-* primitives */

export const tentsTutorial: TutorialStep[] = [
  {
    title: 'Pitch the tents',
    text: 'Every tree gets exactly one tent on a cell directly above, below, left or right of it — never diagonally. Tents and trees pair up one to one.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell good">♣</span>
        <span className="tut-cell sel">▲</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell good">♣</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell sel">▲</span>
      </div>
    )
  },
  {
    title: 'Tents never touch',
    text: 'No two tents may share an edge OR a corner. Once a tent is placed, all eight cells around it must stay tent-free.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell sel">▲</span>
        <span className="tut-cell" />
        <span className="tut-cell sel">▲</span>
        <span className="tut-cell" />
        <span className="tut-cell bad">▲</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Match the numbers',
    text: 'The chips along the edges say how many tents each row and column holds. A chip turns green when its line is exactly right — red when you have placed too many.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell sel">▲</span>
          <span className="tut-cell good">♣</span>
          <span className="tut-cell sel">▲</span>
          <span className="chip good">2</span>
        </div>
        <div className="tut-row">
          <span className="tut-cell sel">▲</span>
          <span className="tut-cell sel">▲</span>
          <span className="tut-cell" />
          <span className="chip bad">1</span>
        </div>
      </div>
    )
  },
  {
    title: 'Mark the grass',
    text: 'Tap a cell to cycle tent → grass → clear. Long-press or drag across cells to paint grass marks fast — grass is your note that no tent can live there.',
    art: (
      <div className="tut-row">
        <span className="tut-cell" />
        <span className="tut-arrow">→</span>
        <span className="tut-cell sel">▲</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell dim">···</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Help that counts',
    text: 'Pair check flags stranded trees and touching tents, auto grass fills finished lines, and the hint button places one sure mark. All of them count as help — solve clean for a clean win.',
    art: (
      <div className="tut-col">
        <span className="chip bad">Stranded tree = red</span>
        <span className="chip accent">Hint = −40 points</span>
        <span className="chip good">No help = clean win</span>
      </div>
    )
  }
];
