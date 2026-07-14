import type { TutorialStep } from '../../platform/types';

export const nonogramTutorial: TutorialStep[] = [
  {
    title: 'Reveal the picture',
    text: 'A hidden picture is encoded in the numbers. Shade the right cells and the image appears — every puzzle has exactly one solution and never needs guessing.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(5, auto)' }}>
        <span className="tut-cell mini" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini lit" />
        <span className="tut-cell mini" />
        <span className="tut-cell mini" />
      </div>
    )
  },
  {
    title: 'Numbers are runs',
    text: 'Each number is a run of shaded cells in that row or column, in order, with at least one gap between runs. "2 1" means two shaded, a gap, then one shaded.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip accent">2 1</span>
          <span className="tut-arrow">→</span>
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini" />
        </div>
        <span className="tut-label">satisfied numbers dim automatically</span>
      </div>
    )
  },
  {
    title: 'Fill or mark',
    text: 'Switch between Fill and Mark with the two bottom tools. Tap a cell, or drag to paint a whole line — marks (X) are your notes for cells that must stay empty.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key active">Fill</span>
          <span className="tut-key">Mark</span>
        </div>
        <div className="tut-row">
          <span className="tut-cell lit" />
          <span className="tut-cell lit" />
          <span className="tut-cell lit" />
          <span className="tut-cell dim">✕</span>
        </div>
      </div>
    )
  },
  {
    title: 'Helpers count as help',
    text: 'Error check flags wrong fills in red, Auto-cross finishes satisfied lines for you, and the Hint button reveals one cell of the tightest line. All three count as assists.',
    art: (
      <div className="tut-row">
        <span className="tut-cell lit" />
        <span className="tut-cell bad" />
        <span className="tut-cell same">?</span>
      </div>
    )
  },
  {
    title: 'Score the reveal',
    text: 'Finish the picture to score every cell times the difficulty multiplier, minus errors and hints, plus a time bonus when you beat par.',
    art: (
      <div className="tut-col">
        <span className="chip good">+4 / cell × difficulty</span>
        <span className="chip accent">time bonus under par</span>
        <span className="chip bad">−20 / error · −30 / hint</span>
      </div>
    )
  }
];
