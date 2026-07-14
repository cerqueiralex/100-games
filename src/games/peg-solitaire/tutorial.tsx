import type { TutorialStep } from '../../platform/types';

export const pegSolitaireTutorial: TutorialStep[] = [
  {
    title: 'Jump and remove',
    text: 'The board starts full of pegs with one empty hole. A peg jumps over an adjacent peg into the empty hole beyond it — and the peg it jumped is removed.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel peg-tut-peg" aria-hidden />
        <span className="tut-cell peg-tut-peg" aria-hidden />
        <span className="tut-cell peg-tut-hole" aria-hidden />
        <span className="tut-arrow">→</span>
        <span className="tut-cell peg-tut-hole" aria-hidden />
        <span className="tut-cell bad" aria-hidden />
        <span className="tut-cell peg-tut-peg" aria-hidden />
      </div>
    )
  },
  {
    title: 'Tap or drag',
    text: 'Tap a peg to lift it — the holes it can jump to light up green. Tap a lit hole to hop there, or just drag the peg onto it. Only orthogonal jumps over a neighbour count.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel peg-tut-peg" aria-hidden />
        <span className="tut-cell peg-tut-peg" aria-hidden />
        <span className="tut-cell good" aria-hidden />
      </div>
    )
  },
  {
    title: 'Leave one peg',
    text: 'Keep jumping to clear the board. You win when a single peg remains. On the cross board, finishing with that last peg in the centre is the classic feat — and worth a bonus.',
    art: (
      <div className="tut-row">
        <span className="tut-cell peg-tut-hole" aria-hidden />
        <span className="tut-cell peg-tut-hole" aria-hidden />
        <span className="tut-cell sel peg-tut-peg" aria-hidden />
        <span className="tut-cell peg-tut-hole" aria-hidden />
        <span className="tut-cell peg-tut-hole" aria-hidden />
      </div>
    )
  },
  {
    title: 'Stuck? Undo',
    text: 'If no jumps remain but more than one peg is left, the board is stuck. Use Undo to take moves back (it counts as help) or Restart to try a fresh line.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Undo · Restart</span>
        <span className="chip muted">pegs left = errors on a stuck board</span>
      </div>
    )
  },
  {
    title: 'Score',
    text: 'Every removed peg scores points × difficulty, with a time bonus under par and a centre-finish bonus. The Hint arrow shows a solver-verified next move (each hint costs points).',
    art: (
      <div className="tut-col">
        <span className="chip good">+ per peg removed · centre bonus · time bonus</span>
        <span className="chip accent">Hint = help</span>
      </div>
    )
  }
];
