import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { BackspaceIcon, CheckIcon } from '../../platform/design/icons';

/**
 * The looping how-to for Arithmetic Sprint: a miniature of the real stage
 * (time bar, problem, answer field, phone keypad) where a finger answers
 * 38 + 47 = 85, submits, corrects a slip on 56 ÷ 7 with ⌫, and submits
 * again. Under reduced motion it parks on one representative frame: "85"
 * typed, the finger on ✓.
 */

type Key = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | 'del' | 'ok';

const KEYS: Key[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

/** the three demo problems — each obeys its class rule (ADD complex, DIV simple, MUL complex) */
const PROBLEMS = [
  { a: '38', op: '+', b: '47' },
  { a: '56', op: '÷', b: '7' },
  { a: '9', op: '×', b: '14' }
];

const TAPS: { key: Key; at: number }[] = [
  { key: '8', at: 1100 },
  { key: '5', at: 2000 },
  { key: 'ok', at: 3000 },
  { key: '9', at: 4700 },
  { key: 'del', at: 5700 },
  { key: '8', at: 6600 },
  { key: 'ok', at: 7600 }
];

const PERIOD = 10_600;
/** finger travel time — matches the finger's CSS transition (--dur-emphasis) */
const MOVE = 600;
const DOWN = 190;
const STILL = 2800;

const CAPTIONS = [
  { at: 0, text: 'Work out the answer in your head, type it, then press ✓.' },
  { at: 3000, text: 'The next problem appears at once. No right or wrong marks until the end.' },
  { at: 4300, text: 'Made a slip? ⌫ deletes the last digit before you submit.' },
  { at: 7800, text: 'Solve as many as you can in 2 minutes.' }
];

/* keypad geometry in % of the stage (aspect 0.9) */
const PAD = { left: 10, top: 46, width: 80, height: 49, gapX: 2.6, gapY: 2.2 };
const KEY_W = (PAD.width - 2 * PAD.gapX) / 3;
const KEY_H = (PAD.height - 3 * PAD.gapY) / 4;

function keyBox(k: Key) {
  const i = KEYS.indexOf(k);
  const col = i % 3;
  const row = Math.floor(i / 3);
  const left = PAD.left + col * (KEY_W + PAD.gapX);
  const top = PAD.top + row * (KEY_H + PAD.gapY);
  return { left, top, cx: left + KEY_W / 2, cy: top + KEY_H / 2 };
}

const REST = { x: 84, y: 102 };

export function ArithmeticSprintDemo() {
  const t = useDemoClock(PERIOD, STILL);

  let prob = 0;
  let typed = '';
  let pressed: Key | null = null;
  let target = REST;
  for (const tap of TAPS) {
    if (t >= tap.at - MOVE) {
      const b = keyBox(tap.key);
      target = { x: b.cx, y: b.cy };
    }
    if (tap.at > t) continue;
    if (t < tap.at + DOWN) pressed = tap.key;
    if (tap.key === 'ok') {
      prob++;
      typed = '';
    } else if (tap.key === 'del') typed = typed.slice(0, -1);
    else typed += tap.key;
  }
  if (t >= TAPS[TAPS.length - 1].at + 800) target = REST;
  const p = PROBLEMS[Math.min(prob, PROBLEMS.length - 1)];
  const caption = demoStep(CAPTIONS, t).text;
  const left = 1 - (0.85 * t) / PERIOD;

  return (
    <DemoStage aspect={0.9} caption={caption}>
      <div className="as-demo">
        <span className="as-demo-bar">
          <span style={{ transform: `scaleX(${left})` }} />
        </span>
        <span className="as-demo-problem">
          <span>{p.a}</span>
          <span className="op">{p.op}</span>
          <span>{p.b}</span>
          <span className="eq">=</span>
        </span>
        <span className={`as-demo-answer${typed ? ' has-value' : ''}`}>
          {typed}
          <i />
        </span>
        {KEYS.map((k) => {
          const b = keyBox(k);
          const cls = ['as-demo-key', k === 'ok' ? 'ok' : '', k === 'ok' && typed ? 'ready' : '', pressed === k ? 'down' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <span key={k} className={cls} style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${KEY_W}%`, height: `${KEY_H}%` }}>
              {k === 'del' ? <BackspaceIcon size={14} /> : k === 'ok' ? <CheckIcon size={15} /> : k}
            </span>
          );
        })}
        <DemoFinger x={target.x} y={target.y} down={pressed !== null} />
      </div>
    </DemoStage>
  );
}
