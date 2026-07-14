import type { TutorialStep } from '../../platform/types';

export const lightsOutTutorial: TutorialStep[] = [
  {
    title: 'Turn them all off',
    text: 'The board starts with some lights on. Your goal is simple: switch every light off. Losing is impossible — only the number of presses matters.',
    art: (
      <div className="tut-col">
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          <span className="tut-cell lit" />
          <span className="tut-cell" />
          <span className="tut-cell lit" />
          <span className="tut-cell" />
          <span className="tut-cell lit" />
          <span className="tut-cell" />
          <span className="tut-cell" />
          <span className="tut-cell lit" />
          <span className="tut-cell" />
        </div>
        <span className="chip accent">All lights off = win</span>
      </div>
    )
  },
  {
    title: 'Taps flip a plus',
    text: 'Tapping a cell toggles it AND its four orthogonal neighbours — on becomes off, off becomes on. Every press flips the whole plus shape at once.',
    art: (
      <div className="tut-row">
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini dim" />
        </div>
        <span className="tut-arrow">→</span>
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini dim" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini dim" />
        </div>
      </div>
    )
  },
  {
    title: 'Beat par',
    text: 'Par is the fewest presses that can possibly clear your board — computed exactly, never a guess. Matching par earns the full efficiency bonus; extra presses shrink it.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell big">7</span>
          <span className="tut-label">par</span>
        </div>
        <span className="chip good">7 presses = full bonus</span>
        <span className="chip">More presses = smaller bonus</span>
      </div>
    )
  },
  {
    title: 'Extreme wraps around',
    text: 'On the 8×8 Extreme board the edges wrap: a press on the border also flips the light on the opposite edge, like the board is glued into a doughnut. Watch the edge arrows.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini lit" />
        </div>
        <span className="chip accent">Left edge press → right edge flips too</span>
      </div>
    )
  },
  {
    title: 'Helpers count as help',
    text: 'The Best-left meter shows the optimal presses remaining, the Hint pulses a perfect next move (−25 each), and Undo reverts a press. All three count as assists — solve without them for a clean win.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Best left · Hint · Undo = help</span>
        <span className="chip good">No help = clean win</span>
      </div>
    )
  }
];
