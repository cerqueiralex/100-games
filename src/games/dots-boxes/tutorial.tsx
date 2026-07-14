import type { TutorialStep } from '../../platform/types';

/** a tiny 2×2-dot cell with some edges drawn, composed from tut primitives */
const MiniBox = ({
  top,
  right,
  bottom,
  left,
  fill
}: {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  fill?: 'p0' | 'p1';
}) => (
  <span className={`db-tut-box ${fill ? `db-tut-${fill}` : ''}`}>
    <i className={`db-tut-e t ${top ? 'on' : ''}`} />
    <i className={`db-tut-e r ${right ? 'on' : ''}`} />
    <i className={`db-tut-e b ${bottom ? 'on' : ''}`} />
    <i className={`db-tut-e l ${left ? 'on' : ''}`} />
  </span>
);

export const dotsBoxesTutorial: TutorialStep[] = [
  {
    title: 'Draw an edge',
    text: 'Take turns tapping the gap between two dots to draw one line — horizontal or vertical. Play the robot, or pass the phone to a friend.',
    art: (
      <div className="tut-row">
        <MiniBox left top />
        <span className="tut-arrow">→</span>
        <MiniBox left top right />
      </div>
    )
  },
  {
    title: 'Close a box, claim it',
    text: 'Drawing the 4th side of a box captures it in your colour — and you immediately go AGAIN. Keep drawing while you keep closing boxes.',
    art: (
      <div className="tut-row">
        <MiniBox top right left />
        <span className="tut-arrow">→</span>
        <MiniBox top right left bottom fill="p0" />
      </div>
    )
  },
  {
    title: 'Mind the third side',
    text: 'Never hand your opponent a free box: drawing a box’s 3rd side lets them close it. Play the "safe" edges first — the ones that leave every box at two sides or fewer.',
    art: (
      <div className="tut-row">
        <MiniBox top left />
        <span className="chip good">safe</span>
        <MiniBox top left right />
        <span className="chip bad">gift</span>
      </div>
    )
  },
  {
    title: 'Chains & the double-cross',
    text: 'When boxes link into a chain, a sharp player takes all but the last two, then hands those back — forcing YOU to open the next chain. The robot does exactly this on pro and extreme.',
    art: (
      <div className="tut-row">
        <MiniBox top bottom left fill="p1" />
        <MiniBox top bottom fill="p1" />
        <MiniBox top bottom />
        <MiniBox top bottom right />
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Safe edges highlights the moves that give nothing away; Hint suggests a strong edge against the robot; Box count shows the live score. Using any of them means the win is not clean.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Safe edges</span>
        <span className="chip accent">Hint</span>
      </div>
    )
  }
];
