import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { PadTool, BulbIcon, EyeIcon, CheckIcon, EraseIcon, RestartIcon, TargetIcon } from '../../platform/components/ui';
import {
  CONFIG,
  OPS,
  bestSolution,
  generateRound,
  isLarge,
  type Op,
  type Round
} from './logic/generator';

type TileKind = 'small' | 'large' | 'made';
interface Tile {
  id: number;
  value: number;
  kind: TileKind;
}

type RoundStatus = 'exact' | 'close' | 'revealed';
interface RoundResult {
  status: RoundStatus;
  diff: number;
  points: number;
}
interface Banner {
  status: RoundStatus;
  diff: number;
  points: number;
  expr?: string;
}
type Phase = 'play' | 'reveal';

interface TNSave {
  seedBase: number;
  roundIndex: number;
  tiles: Tile[];
  history: Tile[][];
  selected: number | null;
  op: Op | null;
  score: number;
  errors: number;
  hintsUsed: number;
  solved: number;
  exactCount: number;
  roundResults: RoundResult[];
  nextTileId: number;
  phase: Phase;
  result: Banner | null;
  roundStart: number;
  assistsUsed: string[];
}

const REVEAL_MS = 1350;
const SEED_STRIDE = 0x2f1b; // decorrelate per-round seeds

const OP_LABEL: Record<Op, string> = { '+': 'plus', '−': 'minus', '×': 'times', '÷': 'divide' };

/** Legal player move under the rules; null when illegal (negative/zero result,
 *  or a division that is not exact). Subtraction/division auto-orient so the
 *  larger operand leads and the result stays a positive integer. */
function applyOp(a: number, b: number, op: Op): number | null {
  if (op === '+') return a + b;
  if (op === '×') return a * b;
  if (op === '−') {
    const r = Math.abs(a - b);
    return r === 0 ? null : r;
  }
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (lo === 0 || hi % lo !== 0) return null;
  return hi / lo;
}

export function TargetNumberGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const saved =
    savedState && Array.isArray((savedState as TNSave).tiles) ? (savedState as TNSave) : undefined;

  const seedBase = useRef(saved?.seedBase ?? Math.floor(Math.random() * 2 ** 31));
  const nextId = useRef(saved?.nextTileId ?? 0);

  const makeTiles = (values: number[]): Tile[] =>
    values.map((v) => ({ id: nextId.current++, value: v, kind: isLarge(v) ? 'large' : 'small' }));

  const [roundIndex, setRoundIndex] = useState(saved?.roundIndex ?? 0);
  const round: Round = useMemo(
    () => generateRound({ seed: (seedBase.current + roundIndex * SEED_STRIDE) >>> 0, difficulty }),
    // seedBase is a stable ref; difficulty is fixed for a session
    [roundIndex, difficulty]
  );
  const target = round.target;

  const [tiles, setTiles] = useState<Tile[]>(() => (saved ? saved.tiles : makeTiles(round.numbers)));
  const [history, setHistory] = useState<Tile[][]>(saved?.history ?? []);
  const [selected, setSelected] = useState<number | null>(saved?.selected ?? null);
  const [op, setOp] = useState<Op | null>(saved?.op ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [solved, setSolved] = useState(saved?.solved ?? 0);
  const [exactCount, setExactCount] = useState(saved?.exactCount ?? 0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>(saved?.roundResults ?? []);
  const [phase, setPhase] = useState<Phase>(saved?.phase ?? 'play');
  const [result, setResult] = useState<Banner | null>(saved?.result ?? null);
  const [hintIds, setHintIds] = useState<Set<number>>(new Set());
  const [shakeIds, setShakeIds] = useState<Set<number>>(new Set());
  const [justMerged, setJustMerged] = useState<number | null>(null);
  const [note, setNote] = useState<string>('');
  const [targetDisplay, setTargetDisplay] = useState(saved ? round.target : 0);

  // ----- refs mirrored from state so async flows read fresh values -----
  const done = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const hintsRef = useRef(hintsUsed);
  hintsRef.current = hintsUsed;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const exactRef = useRef(exactCount);
  exactRef.current = exactCount;
  const roundStartRef = useRef(saved?.roundStart ?? 0);
  const mounted = useRef(false);
  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.reachable ? ['reachable'] : [])])
  );

  // passive assist counts as help whenever enabled, including mid-game
  useEffect(() => {
    if (assists.reachable) assistsUsed.current.add('reachable');
  }, [assists.reachable]);

  const finishRef = useRef<() => void>(() => {});
  finishRef.current = () => {
    if (done.current) return;
    done.current = true;
    const bonus = 120 * cfg.mult + exactRef.current * 15 * cfg.mult;
    const final = Math.max(0, scoreRef.current + bonus);
    scoreRef.current = final;
    setScore(final);
    events.onFinish({
      outcome: 'won',
      score: final,
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: solvedRef.current, goal: cfg.rounds, exactCount: exactRef.current }
    });
  };

  // ----- new-round reset (skips the very first mount, which useState seeded) -----
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setTiles(makeTiles(round.numbers));
    setHistory([]);
    setSelected(null);
    setOp(null);
    setResult(null);
    setHintIds(new Set());
    setJustMerged(null);
    setNote('');
    setPhase('play');
    phaseRef.current = 'play';
    roundStartRef.current = elapsedRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  // ----- target count-up on each fresh round -----
  useEffect(() => {
    if (paused) {
      setTargetDisplay(round.target);
      return;
    }
    const dur = 620;
    const start = performance.now();
    let raf = 0;
    setTargetDisplay(0);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setTargetDisplay(Math.round(round.target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTargetDisplay(round.target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex]);

  // ----- reveal → advance (or finish); pausing freezes and re-arms the timer -----
  useEffect(() => {
    if (phase !== 'reveal' || paused || done.current) return;
    const t = window.setTimeout(() => {
      // phaseRef guards the brief window where roundIndex has advanced but the
      // reset effect has not yet flipped phase back to 'play'
      if (done.current || phaseRef.current !== 'reveal') return;
      if (roundIndex + 1 >= cfg.rounds) finishRef.current();
      else setRoundIndex((i) => i + 1);
    }, REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [phase, paused, roundIndex, cfg.rounds]);

  // ----- clear the merge pop after it plays -----
  useEffect(() => {
    if (justMerged === null) return;
    const t = window.setTimeout(() => setJustMerged(null), 420);
    return () => window.clearTimeout(t);
  }, [justMerged]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved, goal: cfg.rounds, exactCount, round: roundIndex + 1 }
    });
  }, [score, errors, hintsUsed, solved, exactCount, roundIndex, cfg.rounds, events]);

  useEffect(() => {
    registerSnapshot(
      (): TNSave => ({
        seedBase: seedBase.current,
        roundIndex,
        tiles,
        history,
        selected,
        op,
        score,
        errors,
        hintsUsed,
        solved,
        exactCount,
        roundResults,
        nextTileId: nextId.current,
        phase,
        result,
        roundStart: roundStartRef.current,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  // ----- derived -----
  const bestReached = useMemo(() => {
    let bv = tiles.length ? tiles[0].value : 0;
    let bd = Infinity;
    for (const t of tiles) {
      const d = Math.abs(t.value - target);
      if (d < bd) {
        bd = d;
        bv = t.value;
      }
    }
    return { value: bv, diff: bd };
  }, [tiles, target]);

  const canUndo = history.length > 0 && phase === 'play';
  const madeProgress = tiles.length < round.numbers.length;

  // ----- resolution helper -----
  const resolve = (status: RoundStatus, diff: number, points: number, expr?: string) => {
    if (done.current || phaseRef.current !== 'play') return;
    setScore((s) => Math.max(0, s + points));
    if (status !== 'revealed') setSolved((c) => c + 1);
    if (status === 'exact') setExactCount((c) => c + 1);
    setRoundResults((rs) => [...rs, { status, diff, points }]);
    setResult({ status, diff, points, expr });
    setSelected(null);
    setOp(null);
    setPhase('reveal');
    phaseRef.current = 'reveal';
  };

  const flashShake = (ids: number[]) => {
    setShakeIds(new Set(ids));
    window.setTimeout(() => setShakeIds(new Set()), 360);
  };

  // ----- interactions -----
  const doCombine = (bId: number) => {
    if (selected === null || op === null) return;
    const a = tiles.find((t) => t.id === selected);
    const b = tiles.find((t) => t.id === bId);
    if (!a || !b || a.id === b.id) return;
    const r = applyOp(a.value, b.value, op);
    if (r === null) {
      sfx.error();
      flashShake([a.id, b.id]);
      setOp(null);
      setNote(op === '÷' ? 'That division is not exact.' : 'That would go below 1.');
      return;
    }
    setHistory((h) => [...h, tiles]);
    const nid = nextId.current++;
    const nextTiles = tiles.filter((t) => t.id !== a.id && t.id !== b.id);
    nextTiles.push({ id: nid, value: r, kind: 'made' });
    setTiles(nextTiles);
    setSelected(nid);
    setOp(null);
    setHintIds(new Set());
    setJustMerged(nid);
    setNote('');
    sfx.pop();

    if (r === target) {
      const roundTime = Math.max(0, elapsedRef.current - roundStartRef.current);
      const frac = Math.max(0, Math.min(1, (cfg.softTimeSec - roundTime) / cfg.softTimeSec));
      const speed = Math.round(frac * 30 * cfg.mult);
      resolve('exact', 0, 100 * cfg.mult + speed);
    }
  };

  const onTileClick = (id: number) => {
    if (paused || done.current || phaseRef.current !== 'play') return;
    if (selected === null) {
      setSelected(id);
      setHintIds(new Set());
      setNote('');
      sfx.tap();
      return;
    }
    if (selected === id) {
      setSelected(null);
      setOp(null);
      sfx.tap();
      return;
    }
    if (op === null) {
      setSelected(id); // re-pick the first operand
      sfx.tap();
      return;
    }
    doCombine(id);
  };

  const onOp = (o: Op) => {
    if (paused || done.current || phaseRef.current !== 'play') return;
    if (selected === null) {
      sfx.error();
      setNote('Tap a number first, then an operation.');
      return;
    }
    sfx.tap();
    setOp((prev) => (prev === o ? null : o));
    setNote('');
  };

  const onUndo = () => {
    if (paused || done.current || phaseRef.current !== 'play' || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTiles(prev);
    setSelected(null);
    setOp(null);
    setHintIds(new Set());
    setNote('');
    sfx.tap();
  };

  const onReset = () => {
    if (paused || done.current || phaseRef.current !== 'play') return;
    if (madeProgress) setErrors((e) => e + 1);
    setTiles(makeTiles(round.numbers));
    setHistory([]);
    setSelected(null);
    setOp(null);
    setHintIds(new Set());
    setJustMerged(null);
    setNote('');
    sfx.place();
  };

  const onSubmit = () => {
    if (paused || done.current || phaseRef.current !== 'play') return;
    const { diff } = bestReached;
    if (diff === 0) {
      const roundTime = Math.max(0, elapsedRef.current - roundStartRef.current);
      const frac = Math.max(0, Math.min(1, (cfg.softTimeSec - roundTime) / cfg.softTimeSec));
      resolve('exact', 0, 100 * cfg.mult + Math.round(frac * 30 * cfg.mult));
      return;
    }
    if (diff <= cfg.tolerance) {
      const points = Math.round(60 * cfg.mult * Math.max(0, 1 - diff / (cfg.tolerance + 1)));
      sfx.place();
      resolve('close', diff, points, undefined);
      return;
    }
    sfx.error();
    setErrors((e) => e + 1);
    flashShake(tiles.map((t) => t.id));
    setNote(`Best is ${diff} away — needs to be within ${cfg.tolerance}. Keep building or Undo.`);
  };

  const onHint = () => {
    if (paused || done.current || phaseRef.current !== 'play' || !assists.hint) return;
    const sol = bestSolution(
      tiles.map((t) => t.value),
      target
    );
    setHintsUsed((h) => h + 1);
    assistsUsed.current.add('hint');
    setScore((s) => Math.max(0, s - 6 * cfg.mult));
    sfx.hint();
    if (sol.steps.length === 0) {
      setNote(sol.exact ? 'You are already on the target!' : 'No moves left — Submit or Reset.');
      return;
    }
    const step = sol.steps[0];
    const ta = tiles.find((t) => t.value === step.a);
    const tb = tiles.find((t) => t.id !== ta?.id && t.value === step.b);
    const ids = [ta?.id, tb?.id].filter((x): x is number => x != null);
    setHintIds(new Set(ids));
    setSelected(null);
    setOp(null);
    setNote(`Try ${step.a} ${step.op} ${step.b}`);
  };

  const onReveal = () => {
    if (paused || done.current || phaseRef.current !== 'play' || !assists.reveal) return;
    setHintsUsed((h) => h + 1);
    assistsUsed.current.add('reveal');
    sfx.hint();
    const nid = nextId.current++;
    setTiles([{ id: nid, value: target, kind: 'made' }]);
    setHistory([]);
    setJustMerged(nid);
    resolve('revealed', 0, 0, round.solution.expr);
  };

  // ----- render -----
  const instruction =
    phase === 'reveal'
      ? ''
      : selected === null
        ? 'Tap a number to begin.'
        : op === null
          ? 'Pick an operation.'
          : 'Tap another number.';

  const closeMsg =
    bestReached.diff === 0
      ? 'On target!'
      : bestReached.diff === Infinity
        ? ''
        : `${bestReached.diff} away`;

  return (
    <div className={`tn-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info tn-info">
        <span className="info-item">
          Round <b>{roundIndex + 1}/{cfg.rounds}</b>
        </span>
        <span className="info-item">
          Solved <b>{solved}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
      </div>

      <div className="tn-stage">
        <div className="tn-target-block">
          <span className="tn-target-label">Target</span>
          <div className={`tn-target ${result?.status === 'exact' ? 'hit' : ''}`}>
            {targetDisplay}
          </div>
          {assists.reachable && (
            <span className="tn-reachable">
              <TargetIcon />
              Exactly reachable
            </span>
          )}
        </div>

        <div className={`tn-best chip ${bestReached.diff === 0 ? 'good' : 'accent'}`}>
          Best <b>{bestReached.value}</b>
          {closeMsg && <span className="tn-best-sub">· {closeMsg}</span>}
        </div>

        <div className="tn-tiles" role="group" aria-label="Number tiles">
          {tiles.map((t) => (
            <button
              key={t.id}
              className={[
                'tn-tile',
                `k-${t.kind}`,
                selected === t.id ? 'sel' : '',
                hintIds.has(t.id) ? 'hint' : '',
                shakeIds.has(t.id) ? 'shake' : '',
                justMerged === t.id ? 'pop' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onTileClick(t.id)}
              disabled={phase !== 'play'}
              aria-pressed={selected === t.id}
              aria-label={`Tile ${t.value}`}
            >
              {t.value}
            </button>
          ))}
        </div>

        <div className={`tn-note ${note ? 'show' : ''}`}>{note || instruction}</div>

        {phase === 'reveal' && result && (
          <div className={`tn-verdict ${result.status}`} role="status">
            {result.status === 'exact' && (
              <>
                <b>Target hit!</b>
                <span>
                  +{result.points.toLocaleString()} pts
                </span>
              </>
            )}
            {result.status === 'close' && (
              <>
                <b>Within {result.diff}</b>
                <span>+{result.points.toLocaleString()} pts</span>
              </>
            )}
            {result.status === 'revealed' && (
              <>
                <b>Solution</b>
                <span className="tn-expr">
                  {result.expr} = {target}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="game-tools fx-card">
        <div className="tn-ops">
          {OPS.map((o) => (
            <PadTool
              key={o}
              silent
              active={op === o}
              onClick={() => onOp(o)}
              disabled={phase !== 'play'}
              aria-label={OP_LABEL[o]}
            >
              <span className="tn-op-glyph">{o}</span>
            </PadTool>
          ))}
        </div>

        <div className="tn-controls">
          <PadTool silent onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <RestartIcon />
            <span>Undo</span>
          </PadTool>
          <PadTool silent onClick={onReset} disabled={phase !== 'play' || !madeProgress} aria-label="Reset">
            <EraseIcon />
            <span>Reset</span>
          </PadTool>
          <PadTool
            silent
            className="tn-submit"
            onClick={onSubmit}
            disabled={phase !== 'play'}
            aria-label="Submit"
          >
            <CheckIcon />
            <span>Submit</span>
          </PadTool>
        </div>

        {(assists.hint || assists.reveal) && (
          <div className="tn-controls">
            {assists.hint && (
              <PadTool silent onClick={onHint} disabled={phase !== 'play'} aria-label="Hint">
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
            {assists.reveal && (
              <PadTool silent onClick={onReveal} disabled={phase !== 'play'} aria-label="Reveal solution">
                <EyeIcon />
                <span>Reveal</span>
              </PadTool>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
