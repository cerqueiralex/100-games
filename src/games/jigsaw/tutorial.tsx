import type { TutorialStep } from '../../platform/types';

export const jigsawTutorial: TutorialStep[] = [
  {
    title: 'Rebuild the photo',
    text: 'A photo is cut into interlocking pieces and scattered below the board. Put every piece back in its home cell to reveal the picture.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        {['hl', 'hl', 'ghost', 'hl', 'ghost', 'hl', 'ghost', 'hl', 'hl'].map((k, i) => (
          <span key={i} className={`tut-cell ${k}`} />
        ))}
      </div>
    )
  },
  {
    title: 'Drag a piece home',
    text: 'Drag any scattered piece onto the board. Release it near its matching cell and it snaps into place with a click — locked for good.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel" />
        <span className="tut-arrow">→</span>
        <span className="tut-cell ghost" />
      </div>
    )
  },
  {
    title: 'Rotate on tough tiers',
    text: 'On pro and extreme, pieces start turned. Tap a piece to select it, then use Rotate (or double-tap) — a piece only snaps when both its spot AND its rotation are right.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel">⟳</span>
        <span className="chip accent">Rotate 90°</span>
      </div>
    )
  },
  {
    title: 'Score',
    text: 'Finish to win. Score grows with the piece count and your difficulty, plus a time bonus if you beat par. More pieces and rotation mean a bigger reward.',
    art: (
      <div className="tut-row">
        <span className="chip good">56 pieces ×5</span>
        <span className="chip accent">under par = bonus</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Preview shows a faint image under the board. Edge sort gathers the border pieces to the top. Hint drops one piece home. Each one is recorded as help.',
    art: (
      <div className="tut-row">
        <span className="chip">Preview</span>
        <span className="chip">Edge sort</span>
        <span className="chip accent">Hint</span>
      </div>
    )
  }
];
