import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { useReducedMotion } from '../../platform/motion';
import { N_TARGETS, targetAngle } from './logic/geometry';

/**
 * Target Ring's looping demonstration: a miniature of the real board — the
 * plate, the 13-dot ring, the lit target and the tap meter — with a finger
 * that starts a ring on target 0, follows the light across it, misses once
 * and carries on. `segment` loops one beat of it (the first-run tutorial's
 * three steps); without it the whole script loops. Reduced motion parks on a
 * representative still frame.
 */

/** canvas aspect 4:3 — ring centre and radius in % of the canvas height */
const CX = 50;
const CY = 45;
const R_H = 30;
const ASPECT = 4 / 3;

type XY = [number, number];

/** target j in % of the canvas (x of width, y of height) */
function at(j: number): XY {
  const a = targetAngle(j);
  return [CX + (R_H * Math.cos(a)) / ASPECT, CY + R_H * Math.sin(a)];
}

const REST: XY = [82, 92];
/** a tap that lands beside target 9 — the scripted miss */
const MISS: XY = (() => {
  const [x, y] = at(9);
  return [x - 7, y + 9];
})();

interface Frame {
  at: number;
  /** lit target, or null */
  lit: number | null;
  finger: XY;
  down: boolean;
  /** scored taps so far (the tap meter) */
  k: number;
  cap: 0 | 1 | 2;
  /** feedback started by this frame's tap */
  pulse?: number;
  miss?: XY;
}

const SCRIPT: Frame[] = [
  { at: 0, lit: 0, finger: REST, down: false, k: 0, cap: 0 },
  { at: 450, lit: 0, finger: at(0), down: false, k: 0, cap: 0 },
  { at: 1200, lit: 7, finger: at(0), down: true, k: 0, cap: 0, pulse: 0 },
  { at: 1450, lit: 7, finger: at(0), down: false, k: 0, cap: 0 },
  { at: 2400, lit: 7, finger: at(7), down: false, k: 0, cap: 1 },
  { at: 3000, lit: 1, finger: at(7), down: true, k: 1, cap: 1, pulse: 7 },
  { at: 3200, lit: 1, finger: at(1), down: false, k: 1, cap: 1 },
  { at: 3800, lit: 8, finger: at(1), down: true, k: 2, cap: 1, pulse: 1 },
  { at: 4000, lit: 8, finger: at(8), down: false, k: 2, cap: 1 },
  { at: 4600, lit: 2, finger: at(8), down: true, k: 3, cap: 1, pulse: 8 },
  { at: 4800, lit: 2, finger: at(2), down: false, k: 3, cap: 1 },
  { at: 5400, lit: 9, finger: at(2), down: true, k: 4, cap: 1, pulse: 2 },
  { at: 5600, lit: 9, finger: at(2), down: false, k: 4, cap: 1 },
  { at: 6000, lit: 9, finger: MISS, down: false, k: 4, cap: 2 },
  { at: 6600, lit: 3, finger: MISS, down: true, k: 5, cap: 2, miss: MISS },
  { at: 6800, lit: 3, finger: at(3), down: false, k: 5, cap: 2 },
  { at: 7400, lit: 10, finger: at(3), down: true, k: 6, cap: 2, pulse: 3 },
  { at: 7600, lit: 10, finger: at(10), down: false, k: 6, cap: 2 },
  { at: 8200, lit: 4, finger: at(10), down: true, k: 7, cap: 2, pulse: 10 },
  { at: 8400, lit: 4, finger: at(10), down: false, k: 7, cap: 2 }
];
const PERIOD = 9000;
const SEGMENTS: [number, number][] = [
  [0, 2400],
  [2400, 6000],
  [6000, PERIOD]
];
/** still frames under reduced motion: the finger on a lit target, mid-story */
const STILL = [1100, 2950, 6700];
const FX_MS = 420;

const CAPTIONS = [
  'Tap the lit circle to start the ring.',
  'The light jumps across the ring — tap each lit circle as quickly and accurately as you can.',
  'Missed one? Keep going — every tap counts and moves the light on.'
];

export function TargetRingDemo({ segment }: { segment?: 0 | 1 | 2 }) {
  const reduce = useReducedMotion();
  const seg = segment === undefined ? null : SEGMENTS[segment];
  const len = seg ? seg[1] - seg[0] : PERIOD;
  const still = segment === undefined ? STILL[1] : STILL[segment] - SEGMENTS[segment][0];
  const local = useDemoClock(len, still);
  const t = (seg ? seg[0] : 0) + local;
  const f = demoStep(SCRIPT, t);
  // the most recent tap feedback, shown for a moment after its tap
  let fx: Frame | null = null;
  for (const s of SCRIPT) if (s.at <= t && (s.pulse !== undefined || s.miss)) fx = s;
  const fxLive = fx && t - fx.at < FX_MS ? fx : null;

  return (
    <DemoStage caption={CAPTIONS[f.cap]} aspect={ASPECT}>
      <div className={`tr-demo${reduce ? ' still' : ''}`}>
        <span className="tr-demo-plate" />
        <span className="tr-demo-guide" />
        {Array.from({ length: N_TARGETS }, (_, j) => {
          const [x, y] = at(j);
          return <span key={j} className="tr-demo-dot" style={{ left: `${x}%`, top: `${y}%` }} />;
        })}
        {f.lit !== null && (
          <span className="tr-demo-target" style={{ left: `${at(f.lit)[0]}%`, top: `${at(f.lit)[1]}%` }} />
        )}
        {fxLive?.pulse !== undefined && (
          <span
            key={`p${fxLive.at}`}
            className="tr-demo-pulse"
            style={{ left: `${at(fxLive.pulse)[0]}%`, top: `${at(fxLive.pulse)[1]}%` }}
          />
        )}
        {fxLive?.miss && <span key={`m${fxLive.at}`} className="tr-demo-miss" style={{ left: `${fxLive.miss[0]}%`, top: `${fxLive.miss[1]}%` }} />}
        <span className="tr-demo-meter">
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} data-on={i < f.k ? '1' : undefined} />
          ))}
        </span>
        <DemoFinger x={f.finger[0]} y={f.finger[1]} down={f.down} />
      </div>
    </DemoStage>
  );
}
