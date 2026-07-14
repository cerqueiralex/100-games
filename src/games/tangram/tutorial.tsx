import type { TutorialStep } from '../../platform/types';

export const tangramTutorial: TutorialStep[] = [
  {
    title: 'Fill the silhouette',
    text: 'Every puzzle shows a faint target shape. Arrange all seven tangram pieces so they cover it exactly — no gaps, no overlaps.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big ghost" />
        <span className="tut-arrow">←</span>
        <span className="chip accent">7 pieces</span>
      </div>
    )
  },
  {
    title: 'Drag a piece',
    text: 'Touch a piece and drag it onto the shape. When a corner lands close to the outline it clicks into place.',
    art: (
      <div className="tut-row">
        <span className="tut-pad b lit" />
        <span className="tut-arrow">→</span>
        <span className="tut-cell big ghost" />
      </div>
    )
  },
  {
    title: 'Rotate and flip',
    text: 'Tap a selected piece (or use Rotate) to turn it 45°. The parallelogram can be mirrored with Flip to fit either way.',
    art: (
      <div className="tut-row">
        <span className="tut-pad y lit" />
        <span className="chip">tap = rotate 45°</span>
        <span className="chip">flip ◆</span>
      </div>
    )
  },
  {
    title: 'Solve it',
    text: 'Place all seven pieces inside the outline. Correctly placed pieces glow green; finish faster and with fewer hints for a bigger score.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-pad g lit" />
          <span className="tut-pad r lit" />
          <span className="tut-pad b lit" />
          <span className="tut-pad y lit" />
        </div>
        <span className="chip good">shape complete!</span>
      </div>
    )
  },
  {
    title: 'Guides & hints',
    text: 'Guides draw the piece boundaries inside the shape, and Hint drops one piece into its spot. Both count as help, so a clean win uses neither.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Guides</span>
        <span className="chip accent">Hint</span>
        <span className="chip muted">counts as help</span>
      </div>
    )
  }
];
