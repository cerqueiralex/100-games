import type { TutorialStep } from '../../platform/types';

export const sokobanTutorial: TutorialStep[] = [
  {
    title: 'Push every crate home',
    text: 'Each level has as many goal pads as crates. Slide crates onto the glowing pads — when every crate rests on a pad, the level is solved.',
    art: (
      <div className="tut-row">
        <span className="tut-cell">▦</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">▣</span>
        <span className="tut-label">crate on goal</span>
      </div>
    )
  },
  {
    title: 'Move the pusher',
    text: 'Swipe on the board, tap the D-pad, or use the arrow keys / WASD. The pusher steps one cell at a time and shoves the crate right in front of it.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel" />
        <span className="tut-cell">▦</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell blank" />
        <span className="tut-cell sel" />
        <span className="tut-cell">▦</span>
      </div>
    )
  },
  {
    title: 'One at a time — never pull',
    text: 'You can only push a single crate, and never into a wall or another crate. There is no way to pull, so think before you shove a crate into a corner.',
    art: (
      <div className="tut-row">
        <span className="tut-cell hl" />
        <span className="tut-cell">▦</span>
        <span className="tut-cell bad">▦</span>
        <span className="tut-label">wall behind = stuck</span>
      </div>
    )
  },
  {
    title: 'Beat the par',
    text: 'The counter tracks your moves and pushes against a par. The fewer pushes you use, the bigger the efficiency bonus — matching par is a perfect solve.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Pushes 8 / 8</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">perfect</span>
      </div>
    )
  },
  {
    title: 'Undo, restart & help',
    text: 'Deadlocks happen — tap Undo to step back or Restart to reset the level, both guilt-free. Deadlock Warning flags a crate you have jammed into a corner, and Hint shows the next best move. Both count as help.',
    art: (
      <div className="tut-row">
        <span className="tut-cell bad">▦</span>
        <span className="tut-label">warned</span>
        <span className="tut-arrow">↺</span>
        <span className="tut-cell ghost" />
        <span className="tut-label">hint</span>
      </div>
    )
  }
];
