import { DemoFinger, DemoStage, demoStep, useDemoClock } from '../../platform/components/fx';
import { useReducedMotion } from '../../platform/motion';
import { CellGlyph } from './render';
import { DEMO_ANSWER, DEMO_CELLS, DEMO_OPTIONS } from './logic/examples';

/**
 * The animated how-to: a miniature of the real screen (matrix on top, the
 * 2×4 answer card below). Rows light up one by one, a fingertip selects the
 * answer, taps it again to lock it in, and the piece lands in the gap.
 * Reduced motion: one representative frame — the answer selected, the
 * finger on it — with the whole instruction in the caption.
 */

interface Frame {
  at: number;
  caption: string;
  row: number | null;
  finger: [number, number];
  down: boolean;
  selected: boolean;
  filled: boolean;
}

// geometry, in % of the square stage (the SVG below uses the same 0–100 box)
const CELL = 15.4;
const GAP = 1.6;
const MX = 50 - (3 * CELL + 2 * GAP) / 2;
const MY = 6;
const TILE = 15;
const TGAP = 2;
const OX = 50 - (4 * TILE + 3 * TGAP) / 2;
const OY = 62.5;
const cellXY = (i: number): [number, number] => [MX + (i % 3) * (CELL + GAP), MY + Math.floor(i / 3) * (CELL + GAP)];
const tileXY = (i: number): [number, number] => [OX + (i % 4) * (TILE + TGAP), OY + Math.floor(i / 4) * (TILE + TGAP)];
const [AX, AY] = tileXY(DEMO_ANSWER);
const ANSWER_TIP: [number, number] = [AX + TILE * 0.55, AY + TILE * 0.5];
const REST: [number, number] = [88, 92];

const FRAMES: Frame[] = [
  { at: 0, caption: 'Each row follows a rule: the shape stays, the size grows…', row: 0, finger: REST, down: false, selected: false, filled: false },
  { at: 1300, caption: 'Each row follows a rule: the shape stays, the size grows…', row: 1, finger: REST, down: false, selected: false, filled: false },
  { at: 2600, caption: '…so work out what belongs in the empty cell.', row: 2, finger: REST, down: false, selected: false, filled: false },
  { at: 4000, caption: 'Tap the piece that completes it to select it…', row: null, finger: ANSWER_TIP, down: false, selected: false, filled: false },
  { at: 4700, caption: 'Tap the piece that completes it to select it…', row: null, finger: ANSWER_TIP, down: true, selected: true, filled: false },
  { at: 4950, caption: 'Tap the piece that completes it to select it…', row: null, finger: ANSWER_TIP, down: false, selected: true, filled: false },
  { at: 5800, caption: '…then tap it again (or press Confirm) to answer.', row: null, finger: ANSWER_TIP, down: true, selected: true, filled: false },
  { at: 6050, caption: '…then tap it again (or press Confirm) to answer.', row: null, finger: ANSWER_TIP, down: false, selected: true, filled: true },
  { at: 7400, caption: '12 patterns, 30 s each, adapting to you — no feedback until the end.', row: null, finger: REST, down: false, selected: false, filled: true }
];

const PERIOD = 9800;

export function MatrixReasoningDemo() {
  const reduce = useReducedMotion();
  const t = useDemoClock(PERIOD, 5000);
  const f = demoStep(FRAMES, t);
  const caption = reduce ? 'Find the rule across the rows, then tap the piece that completes the pattern — and tap it again (or Confirm) to answer.' : f.caption;
  const ans = DEMO_CELLS[8];
  return (
    <DemoStage caption={caption} aspect={1}>
      <svg className="mr-demo" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* the page itself, so the miniature reads exactly like the real screen */}
        <rect className="mr-demo-bg" x={0} y={0} width={100} height={100} />
        {/* the row being read */}
        <rect
          className="mr-demo-band"
          x={MX - 1.4}
          y={MY - 1.4}
          width={3 * CELL + 2 * GAP + 2.8}
          height={CELL + 2.8}
          rx={3.2}
          style={{ opacity: f.row === null ? 0 : 1, transform: `translateY(${(f.row ?? 2) * (CELL + GAP)}px)` }}
        />
        {DEMO_CELLS.slice(0, 8).map((c, i) => {
          const [x, y] = cellXY(i);
          return (
            <g key={i}>
              <rect className="mr-demo-cell" x={x} y={y} width={CELL} height={CELL} rx={2.2} />
              <svg x={x} y={y} width={CELL} height={CELL} viewBox="0 0 100 100">
                <CellGlyph cell={c} layout="single" />
              </svg>
            </g>
          );
        })}
        {(() => {
          const [x, y] = cellXY(8);
          return (
            <g>
              <rect className={`mr-demo-gap${f.filled ? ' filled' : ''}`} x={x} y={y} width={CELL} height={CELL} rx={2.2} />
              {f.filled ? (
                <svg x={x} y={y} width={CELL} height={CELL} viewBox="0 0 100 100" className="mr-demo-land">
                  <CellGlyph cell={ans} layout="single" />
                </svg>
              ) : (
                <text className="mr-demo-q" x={x + CELL / 2} y={y + CELL / 2} textAnchor="middle" dominantBaseline="central">
                  ?
                </text>
              )}
            </g>
          );
        })()}
        {/* the answer card */}
        <rect className="mr-demo-dock" x={OX - 2.4} y={OY - 2.4} width={4 * TILE + 3 * TGAP + 4.8} height={2 * TILE + TGAP + 4.8} rx={3.4} />
        {DEMO_OPTIONS.map((o, i) => {
          const [x, y] = tileXY(i);
          const sel = f.selected && i === DEMO_ANSWER;
          return (
            <g key={i}>
              <rect className={`mr-demo-tile${sel ? ' sel' : ''}`} x={x} y={y} width={TILE} height={TILE} rx={2.4} />
              <svg x={x} y={y} width={TILE} height={TILE} viewBox="0 0 100 100" opacity={f.filled && i === DEMO_ANSWER ? 0.35 : 1}>
                <CellGlyph cell={o} layout="single" />
              </svg>
            </g>
          );
        })}
      </svg>
      <DemoFinger x={f.finger[0]} y={f.finger[1]} down={f.down} />
    </DemoStage>
  );
}
