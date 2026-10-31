import { useMemo } from 'react';
import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { CheckIcon, MirrorIcon, SameShapeIcon } from '../../platform/design/icons';
import { FigureArt, turnFrame } from './Figure';
import { mirrorCubes, type P3 } from './logic/geometry';
import { DEMO_FIGURE, DEMO_MIRROR_THETA, DEMO_PHI, DEMO_SAME_THETA } from './logic/demo';

/**
 * The looping demonstration (SCIENCE.md §1.13: "one figure rotating into
 * alignment with its twin, then a mirror twin that never aligns"), drawn as
 * a miniature of the real stage — the same figure art, the same two plates,
 * the same answer pads — with an animated fingertip answering each pair.
 * Under reduced motion it parks on the representative frame: the first pair
 * lined up, the finger on Same.
 */

const DEMO = DEMO_FIGURE;
const PHI = DEMO_PHI;
const SAME_THETA = DEMO_SAME_THETA;
const MIRROR_THETA = DEMO_MIRROR_THETA;

const PERIOD = 12000;
interface Step {
  at: number;
  scene: 'same' | 'mirror';
  caption: string;
}
const STEPS: Step[] = [
  { at: 0, scene: 'same', caption: 'Is the right shape the left one, turned?' },
  { at: 1100, scene: 'same', caption: 'Turn it in your mind…' },
  { at: 2650, scene: 'same', caption: '…it lines up: the same shape. Tap Same.' },
  { at: 5000, scene: 'mirror', caption: 'And this pair?' },
  { at: 6100, scene: 'mirror', caption: 'Turn it back…' },
  { at: 7650, scene: 'mirror', caption: '…it comes out reversed: no turn lines it up. A mirror image — tap Mirror.' }
];
const TURN_MS = 1500;

function ease(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function MirrorTwinsDemo() {
  const t = useDemoClock(PERIOD, 3700);
  const step = demoStep(STEPS, t);
  const mirrored = useMemo<P3[]>(() => mirrorCubes(DEMO.cubes), []);
  const ref = useMemo(() => turnFrame(DEMO.cubes, PHI, PHI, 0), []);

  // the right plate: same pair turns back 100° into alignment; mirror pair turns back 150° and lands reversed
  let right;
  if (step.scene === 'same') {
    const from = PHI + SAME_THETA;
    right = turnFrame(DEMO.cubes, from, PHI, ease((t - 1100) / TURN_MS));
  } else {
    const from = MIRROR_THETA - PHI;
    right = turnFrame(mirrored, from, -PHI, ease((t - 6100) / TURN_MS));
  }

  const fading = (t > 4600 && t < 5000) || t > PERIOD - 400;
  const matched = step.scene === 'same' && t >= 2650 && t < 4600;
  const reversed = step.scene === 'mirror' && t >= 7650 && t < PERIOD - 400;

  // the fingertip: rest below the stage, then onto the pad, tap, and away
  const onSame = t >= 2900 && t < 4400;
  const onMirror = t >= 8300 && t < 10200;
  const finger = onSame ? { x: 27, y: 84 } : onMirror ? { x: 73, y: 84 } : { x: 50, y: 112 };
  const downSame = t >= 3450 && t < 3800;
  const downMirror = t >= 8850 && t < 9200;

  return (
    <DemoStage caption={step.caption}>
      <div className={`mt-demo ${fading ? 'fade' : ''}`}>
        <div className="mt-demo-plate l">
          <FigureArt className="mt-demo-art" {...ref} />
        </div>
        <div className="mt-demo-plate r">
          <FigureArt className="mt-demo-art" {...right} />
          {reversed && (
            <span className="mt-badge">
              <MirrorIcon size={15} />
            </span>
          )}
          {matched && (
            <span className="mt-badge">
              <CheckIcon size={15} />
            </span>
          )}
        </div>
        {reversed && <span className="mt-demo-axis" />}
        <div className="mt-demo-btns fx-card">
          <span className={`mt-demo-btn ${downSame ? 'down' : ''}`}>
            <SameShapeIcon size={20} />
            Same
          </span>
          <span className={`mt-demo-btn ${downMirror ? 'down' : ''}`}>
            <MirrorIcon size={20} />
            Mirror
          </span>
        </div>
        <DemoFinger x={finger.x} y={finger.y} down={downSame || downMirror} />
      </div>
    </DemoStage>
  );
}
