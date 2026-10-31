import { DemoFinger, DemoStage, FeedbackBurst, demoStep, useDemoClock } from '../../platform/components/fx';
import { makeItem, WORKED_EXAMPLE, type Item, type Side } from './logic/items';
import { ArrowRow, type RowMark } from './parts';

/**
 * The looping demonstration: a miniature of the real test (HUD with time
 * and score, the target row, the two option pads in the bottom card) with a
 * fingertip that shows exactly how to answer — two correct taps with the
 * relevant arrows lit, a trap item answered wrong (−1), then the pace of the
 * real block. Reduced motion parks on one representative frame.
 */

interface Step {
  at: number;
  item: Item;
  caption: string;
  /** emphasis on the target row / on the option rows (teaching only — the test never marks) */
  mt?: RowMark;
  mo?: RowMark;
  /** fingertip position (% of the stage) and whether it is pressing */
  f: { x: number; y: number };
  down?: Side;
  fb?: 'good' | 'bad';
  score: number;
}

const A = makeItem(0, 1, 1); // FC, outer → right, answer on the right
const B = makeItem(1, 0, 1); // FI, outer ← left, answer on the right (the left pad copies the target)
const C = makeItem(2, 1, 0); // TC-OI, outer → right, answer on the left
const D = makeItem(3, 0, 0); // TI-OC, outer ← left, answer on the left
const E = WORKED_EXAMPLE;

const PAD: Record<Side, { x: number; y: number }> = { 0: { x: 29, y: 77 }, 1: { x: 73, y: 77 } };
const REST = { x: 54, y: 108 };

const SCRIPT: Step[] = [
  { at: 0, item: A, mt: 'outer', f: REST, score: 0, caption: 'The top row is the target. Look at its outer arrows.' },
  { at: 1500, item: A, mt: 'outer', mo: 'centre', f: PAD[1], score: 0, caption: 'Tap the option whose middle arrow points the same way.' },
  { at: 2400, item: A, mt: 'outer', mo: 'centre', f: PAD[1], down: 1, fb: 'good', score: 1, caption: 'Tap the option whose middle arrow points the same way.' },
  { at: 2800, item: B, mt: 'outer', f: PAD[1], score: 1, caption: 'Here the target’s middle arrow is a decoy. Ignore it.' },
  { at: 4300, item: B, mt: 'outer', mo: 'centre', f: PAD[1], score: 1, caption: 'The answer is the option whose middle arrow matches the outer arrows.' },
  { at: 5300, item: B, mt: 'outer', mo: 'centre', f: PAD[1], down: 1, fb: 'good', score: 2, caption: 'The answer is the option whose middle arrow matches the outer arrows.' },
  { at: 5700, item: C, f: PAD[1], score: 2, caption: 'Ignore the options’ outer arrows too…' },
  { at: 6900, item: C, f: PAD[1], down: 1, fb: 'bad', score: 1, caption: 'Wrong: that middle arrow points left. −1 point.' },
  { at: 7500, item: D, f: PAD[0], score: 1, caption: 'The next item appears at once. Right +1, wrong −1.' },
  { at: 8500, item: D, f: PAD[0], down: 0, fb: 'good', score: 2, caption: 'The next item appears at once. Right +1, wrong −1.' },
  { at: 8900, item: E, f: REST, score: 2, caption: 'As many as you can in 90 seconds — fast, but accurate.' }
];
const PERIOD = 11000;
/** reduced motion: the fully incongruent item with the rule lit and the finger on the answer */
const STILL_AT = 4600;

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function ArrowSquaredDemo() {
  const t = useDemoClock(PERIOD, STILL_AT);
  const s = demoStep(SCRIPT, t);
  return (
    <DemoStage caption={s.caption} aspect={4 / 3}>
      <div className="asq-demo">
        <div className="asq-demo-hud">
          <span className="asq-demo-chip">Test</span>
          <span className="asq-demo-time">{clock(86_000 - t)}</span>
          <span className="asq-demo-score">
            Score <b>{s.score}</b>
          </span>
        </div>
        <div className="asq-demo-bar">
          <span style={{ transform: `scaleX(${(86_000 - t) / 90_000})` }} />
        </div>
        <div className="asq-demo-target">
          <ArrowRow dirs={s.item.target} size="demo-target" mark={s.mt} />
        </div>
        <div className="asq-demo-pad fx-card">
          {([0, 1] as Side[]).map((side) => (
            <span key={side} className={`asq-demo-opt${s.down === side ? ' down' : ''}`}>
              <ArrowRow dirs={s.item.options[side]} size="demo-option" mark={s.mo} />
            </span>
          ))}
        </div>
        {s.fb && <FeedbackBurst key={s.at} kind={s.fb} x={74} y={9.5} size="sm" />}
        <DemoFinger x={s.f.x} y={s.f.y} down={s.down !== undefined} />
      </div>
    </DemoStage>
  );
}
