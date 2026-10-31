import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';

/**
 * The looping demonstration — a miniature of the real stage (dark panel,
 * red box, yellow counter, response zone below) with a fingertip showing
 * the one rule: wait, then tap the zone the moment the numbers move; a tap
 * into the empty box is a false start. Under reduced motion it parks on the
 * frozen-RT frame.
 */

type Show = 'blank' | 'run' | 'rt' | 'fs';

interface Step {
  at: number;
  show: Show;
  rt?: number;
  down: boolean;
  caption: string;
}

const WAIT = 'Rest a finger on the zone below and watch the red box.';
const RUN = 'Yellow numbers start counting — tap the zone at once.';
const RT = 'The counter stops at your reaction time, in milliseconds.';
const NEXT = 'The next one comes at an unpredictable moment.';
const FS = 'Tap before the numbers appear and it counts as a false start.';
const KEEP = 'Stay ready like this for the full three minutes.';

const STEPS: Step[] = [
  { at: 0, show: 'blank', down: false, caption: WAIT },
  { at: 1700, show: 'run', down: false, caption: RUN },
  { at: 1974, show: 'rt', rt: 274, down: true, caption: RT },
  { at: 2260, show: 'rt', rt: 274, down: false, caption: RT },
  { at: 3500, show: 'blank', down: false, caption: NEXT },
  { at: 5300, show: 'fs', down: true, caption: FS },
  { at: 5560, show: 'fs', down: false, caption: FS },
  { at: 6900, show: 'blank', down: false, caption: KEEP },
  { at: 8300, show: 'run', down: false, caption: KEEP },
  { at: 8561, show: 'rt', rt: 261, down: true, caption: KEEP },
  { at: 8820, show: 'rt', rt: 261, down: false, caption: KEEP },
  { at: 9900, show: 'blank', down: false, caption: KEEP }
];
const PERIOD = 10_800;
/** reduced motion: the frozen 274 ms frame, finger on the zone */
const STILL = 2100;

export function AlertnessCheckDemo() {
  const t = useDemoClock(PERIOD, STILL);
  const s = demoStep(STEPS, t);
  const digits = s.show === 'run' ? String(Math.max(0, Math.floor(t - s.at))) : s.show === 'rt' ? String(s.rt) : '';
  return (
    <DemoStage aspect={6 / 5} caption={s.caption}>
      <div className="acd">
        <div className="acd-panel">
          <div className="acd-box">
            {digits && <span className="acd-digits">{digits}</span>}
            {s.show === 'fs' && <span className="acd-word">FS</span>}
          </div>
          {s.show === 'fs' && <span className="acd-cap">False start</span>}
        </div>
        <div className={`acd-zone${s.down ? ' down' : ''}`}>
          <span className="acd-label">Tap here</span>
          <span className="acd-target" />
        </div>
      </div>
      <DemoFinger x={50} y={s.down ? 80 : 77} down={s.down} />
    </DemoStage>
  );
}
