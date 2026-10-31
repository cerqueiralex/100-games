import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { GlyphSvg } from './GlyphArt';
import { DEMO_KEY, DEMO_TARGETS } from './logic/demo';

/**
 * The animated how-to: a miniature of the real stage — key strip on top,
 * target card in the middle, the 3×3 pad below — and a fingertip coding two
 * items (the protocol's "2-item animated demo"). Fixed content, no
 * randomness. Under reduced motion the clock parks on the first tap.
 */

const KEY = DEMO_KEY;
const [FIRST, SECOND, THIRD] = DEMO_TARGETS;
const PERIOD = 9600;

/**
 * Fingertip position (% of the stage) on pad key d. The pad (.scd-pad) puts
 * key centres at x = 30 / 50 / 70 % and y ≈ 69.6 / 79.8 / 89.9 %; the tip
 * lands a little below and right of centre so the digit stays readable.
 */
function padXY(d: number): { x: number; y: number } {
  const col = (d - 1) % 3;
  const row = Math.floor((d - 1) / 3);
  return { x: 31 + col * 20, y: 71 + row * 10.2 };
}
const REST = { x: 91, y: 77 };

interface Step {
  at: number;
  target: number;
  lit: number;
  finger: { x: number; y: number };
  down: number;
  caption: string;
}

const FIND = 'A symbol appears in the middle. Find it in the key at the top.';
const TAP = 'Tap the number under it. The next symbol appears at once.';
const GO = 'Keep going, as fast as you can without mistakes, for 90 seconds.';

const STEPS: Step[] = [
  { at: 0, target: FIRST, lit: 0, finger: REST, down: 0, caption: FIND },
  { at: 900, target: FIRST, lit: FIRST, finger: REST, down: 0, caption: FIND },
  { at: 2200, target: FIRST, lit: FIRST, finger: padXY(FIRST), down: 0, caption: TAP },
  { at: 2900, target: FIRST, lit: FIRST, finger: padXY(FIRST), down: FIRST, caption: TAP },
  { at: 3150, target: SECOND, lit: 0, finger: padXY(FIRST), down: 0, caption: TAP },
  { at: 4100, target: SECOND, lit: SECOND, finger: padXY(FIRST), down: 0, caption: TAP },
  { at: 5000, target: SECOND, lit: SECOND, finger: padXY(SECOND), down: 0, caption: TAP },
  { at: 5700, target: SECOND, lit: SECOND, finger: padXY(SECOND), down: SECOND, caption: TAP },
  { at: 5950, target: THIRD, lit: 0, finger: padXY(SECOND), down: 0, caption: GO },
  { at: 8300, target: THIRD, lit: 0, finger: REST, down: 0, caption: GO }
];

export function SymbolCodingDemo() {
  const t = useDemoClock(PERIOD, 2950);
  const s = demoStep(STEPS, t);
  return (
    <DemoStage caption={s.caption} aspect={1}>
      <div className="scd">
        <div className="scd-strip fx-card">
          {KEY.map((g, i) => (
            <span key={g} className={`scd-cell${s.lit === i + 1 ? ' lit' : ''}`}>
              <GlyphSvg glyph={g} />
              <b>{i + 1}</b>
            </span>
          ))}
        </div>
        <div className="scd-target fx-card">
          <GlyphSvg glyph={KEY[s.target - 1]} />
        </div>
        <div className="scd-pad fx-card">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <span key={d} className={`scd-key${s.down === d ? ' down' : ''}`}>
              {d}
            </span>
          ))}
        </div>
      </div>
      <DemoFinger x={s.finger.x} y={s.finger.y} down={s.down > 0} />
    </DemoStage>
  );
}
