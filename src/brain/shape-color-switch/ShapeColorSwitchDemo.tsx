import type { ReactNode } from 'react';
import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { Pictogram } from './pictograms';

/**
 * The looping demonstration: a miniature of the real stage (cue plate,
 * picture spot, the two target cards) playing two trials with the SAME
 * picture — once under "shape", once under "color" — so the one idea that
 * matters is seen, not read: the word decides which card is right. Under
 * reduced motion it parks on the first answer (finger on the card).
 */

interface Step {
  at: number;
  cue: '' | 'shape' | 'color';
  pic: boolean;
  finger: { x: number; y: number };
  down: boolean;
  /** which card is being pressed */
  pressed: 0 | 1 | null;
  caption: ReactNode;
}

const REST = { x: 50, y: 112 };
const LEFT = { x: 27, y: 80 };
const RIGHT = { x: 73, y: 80 };

const STEPS: Step[] = [
  { at: 0, cue: '', pic: false, finger: REST, down: false, pressed: null, caption: 'Two cards stay at the bottom the whole time.' },
  { at: 700, cue: 'shape', pic: false, finger: REST, down: false, pressed: null, caption: 'First a word appears: it is the rule.' },
  { at: 1250, cue: 'shape', pic: true, finger: REST, down: false, pressed: null, caption: <><b>shape</b> → tap the card with the same shape.</> },
  { at: 1900, cue: 'shape', pic: true, finger: LEFT, down: false, pressed: null, caption: <><b>shape</b> → tap the card with the same shape.</> },
  { at: 2650, cue: 'shape', pic: true, finger: LEFT, down: true, pressed: 0, caption: <><b>shape</b> → the balloon card.</> },
  { at: 3050, cue: '', pic: false, finger: LEFT, down: false, pressed: null, caption: <><b>shape</b> → the balloon card.</> },
  { at: 3900, cue: 'color', pic: false, finger: REST, down: false, pressed: null, caption: 'Now the word says color.' },
  { at: 4450, cue: 'color', pic: true, finger: REST, down: false, pressed: null, caption: <><b>color</b> → tap the card with the same color.</> },
  { at: 5100, cue: 'color', pic: true, finger: RIGHT, down: false, pressed: null, caption: <><b>color</b> → tap the card with the same color.</> },
  { at: 5850, cue: 'color', pic: true, finger: RIGHT, down: true, pressed: 1, caption: <><b>color</b> → the orange card.</> },
  { at: 6250, cue: '', pic: false, finger: RIGHT, down: false, pressed: null, caption: 'Same picture, other rule — other card.' },
  { at: 7600, cue: '', pic: false, finger: REST, down: false, pressed: null, caption: 'Mostly shape, sometimes color. Be quick and accurate.' }
];

const PERIOD = 9800;
/** the representative still frame under reduced motion: finger on the first answer */
const STILL = 2700;

export default function ShapeColorSwitchDemo() {
  const t = useDemoClock(PERIOD, STILL);
  const s = demoStep(STEPS, t);
  return (
    <DemoStage aspect={1} caption={s.caption}>
      <div className="scs-demo">
        <div className="scs-demo-cue">
          <span className={`scs-demo-word${s.cue ? ' on' : ''}`}>{s.cue || 'shape'}</span>
        </div>
        <div className="scs-demo-spot">
          <div className={`scs-demo-pic${s.pic ? ' on' : ''}`}>
            <Pictogram shape="balloon" color={2} />
          </div>
        </div>
        <div className="scs-demo-dock">
          <div className={`scs-demo-card${s.pressed === 0 ? ' down' : ''}`}>
            <Pictogram shape="balloon" color={1} />
          </div>
          <div className={`scs-demo-card${s.pressed === 1 ? ' down' : ''}`}>
            <Pictogram shape="house" color={2} />
          </div>
        </div>
      </div>
      <DemoFinger x={s.finger.x} y={s.finger.y} down={s.down} />
    </DemoStage>
  );
}
