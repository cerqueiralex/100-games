import type { TutorialStep } from '../../platform/types';

const Isl = ({ n, tone }: { n: number; tone?: 'sat' | 'over' | 'sel' }) => (
  <span className={`hsh-tut-isl ${tone ?? ''}`}>{n}</span>
);
const Bridge = ({ double, v }: { double?: boolean; v?: boolean }) => (
  <span className={`hsh-tut-bridge ${v ? 'v' : ''} ${double ? 'double' : ''}`}>
    <i />
    {double && <i />}
  </span>
);

export const hashiTutorial: TutorialStep[] = [
  {
    title: 'Bridge the islands',
    text: 'Every island shows how many bridges it needs. Connect islands with straight horizontal or vertical bridges until each number is matched exactly — at most 2 bridges per pair.',
    art: (
      <div className="tut-row">
        <Isl n={1} />
        <Bridge />
        <Isl n={3} />
        <Bridge double />
        <Isl n={2} />
      </div>
    )
  },
  {
    title: 'Tap or drag to build',
    text: 'Tap an island to select it, then tap a neighbour to build a bridge — more taps cycle 1 → 2 → 0. You can also drag from an island toward a neighbour, or tap a bridge itself to change it.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Isl n={2} tone="sel" />
          <span className="tut-arrow">→</span>
          <Isl n={2} />
        </div>
        <span className="chip accent">tap · tap again for a double</span>
      </div>
    )
  },
  {
    title: 'Bridges never cross',
    text: 'Bridges cannot cross other bridges or pass through islands. A blocked bridge flashes red — clear the one in the way first.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Isl n={1} />
          <Bridge />
          <span className="hsh-tut-cross">
            <Bridge />
            <Bridge v />
          </span>
          <Isl n={1} />
        </div>
        <span className="chip bad">crossing = blocked</span>
      </div>
    )
  },
  {
    title: 'One connected network',
    text: 'Matching every number is not enough: all islands must join into a single connected network. Green islands are satisfied, red ones have too many bridges.',
    art: (
      <div className="tut-row">
        <Isl n={1} tone="sat" />
        <Bridge />
        <Isl n={3} tone="sat" />
        <Bridge double />
        <Isl n={3} tone="over" />
      </div>
    )
  },
  {
    title: 'Score & help',
    text: 'Each island scores 30 × difficulty on the win, plus a time bonus under par. Over-filling an island costs points, and the hint button (−40) sets one bridge to its correct count — assists count as help.',
    art: (
      <div className="tut-col">
        <span className="chip good">+30 / island · time bonus</span>
        <span className="chip accent">Hint = help</span>
      </div>
    )
  }
];
