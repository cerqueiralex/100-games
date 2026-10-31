import { DemoFinger, DemoStage, FeedbackBurst, demoStep, useDemoClock } from '../../platform/components/fx';
import { EyeIcon } from '../../platform/design/icons';
import { AREA_STYLE } from './area';

/**
 * Block Span — the looping how-to: a miniature of the real stage (status
 * line, board, tap slots and the "Don't remember" button) playing one
 * three-block trial. The blocks light the way the test lights them (an
 * accent fill on neutral blocks); the finger then taps them back in order.
 * Under reduced motion it parks on a mid-response frame.
 */

/** the stage is 5:4; the board is a square 64 % of the stage height */
const ASPECT = 1.25;
const BOARD = { top: 14, side: 64 };
const BOARD_W = BOARD.side / ASPECT;
const BOARD_LEFT = (100 - BOARD_W) / 2;

/** block centres as fractions of the board */
const BLOCKS: [number, number][] = [
  [0.2, 0.24],
  [0.6, 0.16],
  [0.86, 0.46],
  [0.42, 0.5],
  [0.16, 0.8],
  [0.58, 0.84],
  [0.86, 0.84]
];
const SEQ = [1, 4, 2];
const BLOCK_FRAC = 0.15;

function at(block: number): { x: number; y: number } {
  const [bx, by] = BLOCKS[block];
  return { x: BOARD_LEFT + bx * BOARD_W, y: BOARD.top + by * BOARD.side };
}

const REST = { x: 92, y: 112 };

interface Step {
  at: number;
  lit: number;
  turn: boolean;
  finger: { x: number; y: number };
  down: boolean;
  taps: number;
  done: boolean;
  caption: string;
}

const WATCH = 'Watch: blocks light up one at a time.';
const TURN = 'Your turn: tap them in the same order.';
const RIGHT = 'All in order — the next sequence gets one block longer.';
const LOST = 'Lost the order? Tap “Don’t remember” instead of guessing.';

const base: Omit<Step, 'at'> = { lit: -1, turn: false, finger: REST, down: false, taps: 0, done: false, caption: WATCH };
const s = (t: number, o: Partial<Step>, prev: Omit<Step, 'at'>): Step => ({ ...prev, ...o, at: t });

const STEPS: Step[] = (() => {
  const out: Step[] = [];
  let cur: Omit<Step, 'at'> = base;
  const push = (t: number, o: Partial<Step>) => {
    const st = s(t, o, cur);
    out.push(st);
    cur = st;
  };
  push(0, {});
  push(900, { lit: SEQ[0] });
  push(1450, { lit: -1 });
  push(1750, { lit: SEQ[1] });
  push(2300, { lit: -1 });
  push(2600, { lit: SEQ[2] });
  push(3150, { lit: -1 });
  push(3500, { turn: true, caption: TURN, finger: at(SEQ[0]) });
  push(4150, { down: true, taps: 1 });
  push(4350, { down: false });
  push(4450, { finger: at(SEQ[1]) });
  push(5100, { down: true, taps: 2 });
  push(5300, { down: false });
  push(5400, { finger: at(SEQ[2]) });
  push(6050, { down: true, taps: 3 });
  push(6250, { down: false, done: true, caption: RIGHT });
  push(7700, { finger: REST, caption: LOST });
  push(9300, { done: false, turn: false, taps: 0, caption: WATCH });
  return out;
})();

const PERIOD = 9600;
/** reduced motion: mid-response — two of three blocks answered, the finger resting on the second (unlit, so it stays legible) */
const STILL = 5350;

export function BlockSpanDemo() {
  const t = useDemoClock(PERIOD, STILL);
  const step = demoStep(STEPS, t);
  const tappedNow = step.down ? SEQ[step.taps - 1] : -1;
  return (
    <DemoStage caption={step.caption} aspect={ASPECT}>
      <div className="bspan-demo" style={AREA_STYLE}>
        <span key={step.turn ? 'turn' : 'watch'} className={`bspan-demo-label${step.turn ? ' is-turn' : ''}`}>
          {!step.turn && <EyeIcon size={12} />}
          {step.turn ? 'Your turn' : 'Watch'}
        </span>
        <div
          className={`bspan-demo-board${step.turn ? ' is-turn' : ''}`}
          style={{ left: `${BOARD_LEFT}%`, top: `${BOARD.top}%`, width: `${BOARD_W}%`, height: `${BOARD.side}%` }}
        >
          {BLOCKS.map(([bx, by], i) => (
            <span
              key={i}
              className="bspan-block"
              data-lit={step.lit === i ? '' : undefined}
              data-tap={tappedNow === i ? '' : undefined}
              style={{
                left: `${bx * 100}%`,
                top: `${by * 100}%`,
                width: `${BLOCK_FRAC * 100}%`,
                height: `${BLOCK_FRAC * 100}%`
              }}
            >
              <span className="bspan-lit" />
            </span>
          ))}
          {step.done && <FeedbackBurst kind="good" x={50} y={50} size="lg" />}
        </div>
        <div className="bspan-demo-dock" style={{ left: `${BOARD_LEFT}%`, width: `${BOARD_W}%` }}>
          <span className="bspan-demo-slots">
            {step.turn &&
              SEQ.map((_, i) => <span key={i} className={`bspan-slot${i < step.taps ? ' is-on' : ''}`} />)}
          </span>
          <span className={`bspan-demo-dont${step.caption === LOST ? ' is-hint' : ''}`}>Don’t remember</span>
        </div>
        <DemoFinger x={step.finger.x} y={step.finger.y} down={step.down} />
      </div>
    </DemoStage>
  );
}
