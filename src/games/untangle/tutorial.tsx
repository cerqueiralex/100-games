import type { TutorialStep } from '../../platform/types';

/** tiny inline graph illustration built from the .utg-tut-* primitives */
function MiniGraph({ tangled }: { tangled: boolean }) {
  // four nodes; tangled = the two diagonals cross, tidy = an untwisted square
  const nodes = tangled
    ? [
        { x: 14, y: 14 },
        { x: 70, y: 20 },
        { x: 18, y: 66 },
        { x: 74, y: 72 }
      ]
    : [
        { x: 16, y: 16 },
        { x: 72, y: 16 },
        { x: 16, y: 72 },
        { x: 72, y: 72 }
      ];
  // edges: square ring + one diagonal so tangled truly crosses
  const es: [number, number][] = tangled
    ? [
        [0, 3],
        [1, 2],
        [0, 1],
        [2, 3]
      ]
    : [
        [0, 1],
        [1, 3],
        [3, 2],
        [2, 0]
      ];
  const cross = (a: number, b: number) => tangled && ((a === 0 && b === 3) || (a === 1 && b === 2));
  return (
    <span className="utg-tut">
      <svg viewBox="0 0 88 88" aria-hidden>
        {es.map(([a, b], i) => (
          <line
            key={i}
            className={`utg-tut-edge ${cross(a, b) ? 'bad' : 'good'}`}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
        {nodes.map((p, i) => (
          <circle key={i} className="utg-tut-node" cx={p.x} cy={p.y} r={8} />
        ))}
      </svg>
    </span>
  );
}

export const untangleTutorial: TutorialStep[] = [
  {
    title: 'Untangle the web',
    text: 'Every puzzle is a web of nodes joined by lines. It starts scrambled, with lines crossing all over.',
    art: <MiniGraph tangled />
  },
  {
    title: 'Drag the nodes',
    text: 'Drag any node to a new spot — its lines follow. Nudge nodes around to pull the crossings apart.',
    art: (
      <div className="tut-row">
        <MiniGraph tangled />
        <span className="tut-arrow">→</span>
        <MiniGraph tangled={false} />
      </div>
    )
  },
  {
    title: 'Reach zero crossings',
    text: 'Crossed lines glow red, clear lines glow green. Untwist the whole web so no two lines cross — the counter hits zero and you win.',
    art: (
      <div className="tut-col">
        <MiniGraph tangled={false} />
        <span className="chip good">Crossings 0</span>
      </div>
    )
  },
  {
    title: 'Fewer moves score more',
    text: 'A win is worth more with fewer drags and quicker times. Shuffle re-scatters the web if you feel stuck.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Shuffle</span>
        <span className="chip">fewer moves = more points</span>
      </div>
    )
  },
  {
    title: 'Assists that help',
    text: 'Spread gently relaxes the layout, and Hint slides one node into a solved spot (−points). Turn off crossing highlights for a pure challenge — each assist counts as help.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Spread</span>
        <span className="chip accent">Hint</span>
      </div>
    )
  }
];
