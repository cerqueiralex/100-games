import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon, CheckIcon, EyeIcon, RestartIcon, TargetIcon, UndoIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  DIFF_CONFIG,
  OP_GLYPH,
  canReach,
  fracEquals,
  fracIsInt,
  fracOp,
  firstLeafPair,
  generateRound,
  makeFrac,
  solveFracs
} from './logic/generator';
import type { Deal, Frac, Op } from './logic/generator';

/* ------------------------------------------------------------- scoring knobs */
const DEAL_BASE = 100; // points per solved deal, × diff multiplier
const WIN_BASE = 150; // round-complete bonus, × diff multiplier
const HINT_PENALTY = 25; // per hint used
const PAR_SEC = 40; // per-deal par; solving faster earns a speed bonus × mult
const OPS: Op[] = ['+', '-', '*', '/'];

interface Card {
  id: number;
  value: Frac;
}

/** JSON-safe card for the save snapshot. */
interface SavedCard {
  id: number;
  value: { n: number; d: number };
}

interface Make24Save {
  deals: Deal[];
  dealIndex: number;
  solvedCount: number;
  score: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
  cards: SavedCard[];
  history: SavedCard[][];
  dealForfeited: boolean;
  revealShown: boolean;
  dealStartElapsed: number;
}

const toSaved = (cards: Card[]): SavedCard[] =>
  cards.map((c) => ({ id: c.id, value: { n: c.value.n, d: c.value.d } }));
const fromSaved = (cards: SavedCard[]): Card[] =>
  cards.map((c) => ({ id: c.id, value: makeFrac(c.value.n, c.value.d) }));

function maxIdOf(save: Make24Save): number {
  let m = 0;
  for (const c of save.cards) m = Math.max(m, c.id);
  for (const arr of save.history) for (const c of arr) m = Math.max(m, c.id);
  return m;
}

/** Undo (counter-clockwise arrow) — no matching glyph in the shared icon set. */

/** A card's number — integers count up on merge, fractions stack over a bar. */
function CardValue({ frac, animate }: { frac: Frac; animate: boolean }) {
  const isInt = frac.d === 1;
  const [disp, setDisp] = useState(() => (isInt && animate ? 0 : frac.n));

  useEffect(() => {
    if (!(isInt && animate)) {
      setDisp(frac.n);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const to = frac.n;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 280);
      const e = 1 - Math.pow(1 - k, 3);
      setDisp(Math.round(to * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frac.n, isInt, animate]);

  if (isInt) return <span className="m24-int">{disp}</span>;
  return (
    <span className={`m24-frac ${frac.n < 0 ? 'neg' : ''}`}>
      <span className="m24-frac-num">{Math.abs(frac.n)}</span>
      <span className="m24-frac-den">{frac.d}</span>
    </span>
  );
}

export function Make24Game({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = DIFF_CONFIG[difficulty];
  // ignore stale saves that lack the expected shape
  const saved =
    savedState &&
    Array.isArray((savedState as Make24Save).cards) &&
    Array.isArray((savedState as Make24Save).history)
      ? (savedState as Make24Save)
      : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deals = useMemo<Deal[]>(
    () => saved?.deals ?? generateRound({ difficulty }).deals,
    [difficulty]
  );

  const idRef = useRef(saved ? maxIdOf(saved) + 1 : 1);
  const makeCards = useCallback(
    (nums: number[]): Card[] => nums.map((v) => ({ id: idRef.current++, value: makeFrac(v) })),
    []
  );

  const [dealIndex, setDealIndex] = useState(saved?.dealIndex ?? 0);
  const [solvedCount, setSolvedCount] = useState(saved?.solvedCount ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [dealForfeited, setDealForfeited] = useState(saved?.dealForfeited ?? false);
  const [revealShown, setRevealShown] = useState(saved?.revealShown ?? false);
  const [dealStartElapsed, setDealStartElapsed] = useState(saved?.dealStartElapsed ?? 0);

  const [cards, setCards] = useState<Card[]>(() =>
    saved ? fromSaved(saved.cards) : makeCards(deals[0].cards)
  );
  const [history, setHistory] = useState<Card[][]>(() =>
    saved ? saved.history.map(fromSaved) : []
  );

  // transient interaction state (never persisted)
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [hintIds, setHintIds] = useState<number[]>([]);
  const [hintOp, setHintOp] = useState<Op | null>(null);
  const [justMergedId, setJustMergedId] = useState<number | null>(null);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [dealing, setDealing] = useState(true);
  const [noPath, setNoPath] = useState(false);

  const deal = deals[dealIndex];
  const target = deal.target;

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const timers = useRef<number[]>([]);
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const dealStartRef = useRef(dealStartElapsed);
  dealStartRef.current = dealStartElapsed;

  const pushTimer = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* ------------------------------------------------------------ FLIP motion */
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRects = useRef<Map<string, DOMRect>>(new Map());
  const captureFirst = useCallback(() => {
    const m = new Map<string, DOMRect>();
    stageRef.current?.querySelectorAll<HTMLElement>('[data-card]').forEach((el) => {
      m.set(el.dataset.card!, el.getBoundingClientRect());
    });
    firstRects.current = m;
  }, []);
  const cardsSig = cards.map((c) => c.id).join(',');
  useLayoutEffect(() => {
    const els = stageRef.current?.querySelectorAll<HTMLElement>('[data-card]');
    els?.forEach((el) => {
      const first = firstRects.current.get(el.dataset.card!);
      if (!first) return;
      const last = el.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx || dy) {
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        void el.offsetWidth;
        el.style.transition = '';
        el.style.transform = '';
      }
    });
    firstRects.current = new Map();
  }, [cardsSig]);

  const flashDeal = useCallback(() => {
    setDealing(true);
    pushTimer(() => setDealing(false), 460);
  }, []);
  // initial deal-in
  useEffect(() => {
    flashDeal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------- reporting */
  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: solvedCount, goal: deals.length }
    });
  }, [score, errors, hintsUsed, solvedCount, events, deals.length]);

  // passive assist: the solvable badge counts as help whenever it is enabled
  useEffect(() => {
    if (assists.solvableBadge) assistsUsed.current.add('solvableBadge');
  }, [assists.solvableBadge]);

  useEffect(() => {
    registerSnapshot(
      () =>
        ({
          deals,
          dealIndex,
          solvedCount,
          score,
          errors,
          hintsUsed,
          assistsUsed: [...assistsUsed.current],
          cards: toSaved(cards),
          history: history.map(toSaved),
          dealForfeited,
          revealShown,
          dealStartElapsed
        }) satisfies Make24Save
    );
  });

  const finish = useCallback(
    (finalScore: number, solved: number) => {
      if (done.current) return;
      done.current = true;
      events.onFinish({
        outcome: 'won',
        score: Math.max(0, Math.round(finalScore)),
        errors,
        hintsUsed,
        assistsUsed: [...assistsUsed.current],
        extra: { solved, goal: deals.length }
      });
    },
    [events, errors, hintsUsed, deals.length]
  );

  /* --------------------------------------------------------------- deal flow */
  const startDeal = useCallback(
    (nextIndex: number) => {
      setDealIndex(nextIndex);
      setCards(makeCards(deals[nextIndex].cards));
      setHistory([]);
      setSelectedId(null);
      setPendingOp(null);
      setHintIds([]);
      setHintOp(null);
      setWrongId(null);
      setJustMergedId(null);
      setDealForfeited(false);
      setRevealShown(false);
      setDealStartElapsed(elapsedRef.current);
      firstRects.current = new Map();
      flashDeal();
    },
    [deals, makeCards, flashDeal]
  );

  const onDealSolved = useCallback(() => {
    const elapsedIn = elapsedRef.current - dealStartRef.current;
    const speed = Math.max(0, PAR_SEC - elapsedIn) * cfg.mult;
    const gained = dealForfeited ? 0 : DEAL_BASE * cfg.mult + speed;
    const newSolved = solvedCount + 1;
    setSolvedCount(newSolved);
    setBurst(true);
    // celebratory sparkle (shell owns the final win chime)
    playNote(784, 90, 'triangle');
    pushTimer(() => playNote(1047, 150, 'triangle'), 90);

    if (newSolved >= deals.length) {
      const winScore = scoreRef.current + gained + WIN_BASE * cfg.mult;
      setScore(winScore);
      finish(winScore, newSolved);
    } else {
      const newScore = scoreRef.current + gained;
      setScore(newScore);
      pushTimer(() => {
        setBurst(false);
        startDeal(dealIndex + 1);
      }, 1150);
    }
  }, [cfg.mult, dealForfeited, solvedCount, deals.length, dealIndex, finish, startDeal]);

  /* --------------------------------------------------------- combine two cards */
  const doCombine = (leftId: number, rightId: number, op: Op) => {
    const left = cards.find((c) => c.id === leftId);
    const right = cards.find((c) => c.id === rightId);
    if (!left || !right) return;
    const value = fracOp(op, left.value, right.value);
    if (!value) {
      // e.g. divide by zero — reject, keep the current selection
      sfx.error();
      setWrongId(rightId);
      pushTimer(() => setWrongId(null), 500);
      return;
    }
    captureFirst();
    const result: Card = { id: idRef.current++, value };
    const next: Card[] = [];
    for (const c of cards) {
      if (c.id === leftId) next.push(result);
      else if (c.id === rightId) continue;
      else next.push(c);
    }
    setHistory((h) => [...h, cards]);
    setCards(next);
    setSelectedId(null);
    setPendingOp(null);
    setHintIds([]);
    setHintOp(null);
    setNoPath(false);
    setJustMergedId(result.id);
    pushTimer(() => setJustMergedId((id) => (id === result.id ? null : id)), 600);

    const isFinal = next.length === 1;
    const solved = isFinal && fracIsInt(value) && value.n === target;
    if (solved) {
      sfx.pop();
      onDealSolved();
    } else if (isFinal) {
      // dead end: one card that isn't the target
      sfx.error();
      setErrors((e) => e + 1);
      setWrongId(result.id);
      pushTimer(() => setWrongId((id) => (id === result.id ? null : id)), 600);
    } else {
      sfx.pop();
    }
  };

  /* ----------------------------------------------------------- tap handlers */
  const tapCard = (id: number) => {
    if (paused || done.current || burst) return;
    if (cards.length <= 1) return; // one card left — undo/reset to keep going
    if (selectedId == null) {
      setSelectedId(id);
      setPendingOp(null);
      sfx.tap();
      return;
    }
    if (id === selectedId) {
      setSelectedId(null);
      setPendingOp(null);
      setHintIds([]);
      setHintOp(null);
      sfx.tap();
      return;
    }
    if (pendingOp == null) {
      setSelectedId(id); // switch which card is the left operand
      setHintIds([]);
      setHintOp(null);
      sfx.tap();
      return;
    }
    doCombine(selectedId, id, pendingOp);
  };

  const tapOp = (op: Op) => {
    if (paused || done.current || burst || selectedId == null) return;
    setPendingOp(op);
    setHintOp(null);
    sfx.tap();
  };

  const undo = () => {
    if (paused || done.current || burst || history.length === 0) return;
    captureFirst();
    setCards(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelectedId(null);
    setPendingOp(null);
    setHintIds([]);
    setHintOp(null);
    setWrongId(null);
    setJustMergedId(null);
    setNoPath(false);
  };

  const reset = () => {
    if (paused || done.current || burst) return;
    firstRects.current = new Map();
    setCards(makeCards(deal.cards));
    setHistory([]);
    setSelectedId(null);
    setPendingOp(null);
    setHintIds([]);
    setHintOp(null);
    setWrongId(null);
    setJustMergedId(null);
    setNoPath(false);
    flashDeal();
  };

  const useHint = () => {
    if (paused || done.current || burst || !assists.hint || cards.length <= 1) return;
    const tree = solveFracs(cards.map((c) => c.value), target);
    if (!tree) {
      // the current board can no longer reach the target
      setNoPath(true);
      sfx.error();
      return;
    }
    const step = firstLeafPair(tree);
    if (!step) return;
    const idA = cards.find((c) => fracEquals(c.value, step.a))?.id;
    const idB = cards.find((c) => c.id !== idA && fracEquals(c.value, step.b))?.id;
    if (idA == null || idB == null) return;
    // pre-select the first operand + op so the player only taps the second card
    setSelectedId(idA);
    setPendingOp(step.op);
    setHintIds([idA, idB]);
    setHintOp(step.op);
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PENALTY));
    assistsUsed.current.add('hint');
    sfx.hint();
  };

  const useReveal = () => {
    if (paused || done.current || burst || !assists.reveal) return;
    firstRects.current = new Map();
    setCards(makeCards(deal.cards)); // restore the original cards so the shown expression matches
    setHistory([]);
    setSelectedId(null);
    setPendingOp(null);
    setHintIds([]);
    setHintOp(null);
    setWrongId(null);
    setJustMergedId(null);
    setNoPath(false);
    setRevealShown(true);
    setDealForfeited(true);
    setHintsUsed((h) => h + 1);
    assistsUsed.current.add('reveal');
    flashDeal();
    sfx.hint();
  };

  const reachable = useMemo(
    () => canReach(cards.map((c) => c.value), target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardsSig, target]
  );

  const solo = cards.length === 1 ? cards[0] : null;
  const soloWrong = solo != null && !(fracIsInt(solo.value) && solo.value.n === target);
  const hasTools = true; // op row + undo/reset are always present

  return (
    <div className={`m24 ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Deal <b>{Math.min(solvedCount + 1, deals.length)} / {deals.length}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors <b>{errors}</b>
        </span>
      </div>

      <div className="m24-goal">
        <div className="m24-target">
          <TargetIcon />
          <span className="m24-target-eq">=</span>
          <span className="m24-target-num">{target}</span>
        </div>
        <div className="m24-pips" aria-label={`${solvedCount} of ${deals.length} solved`}>
          {deals.map((_, i) => (
            <span
              key={i}
              className={`m24-pip ${i < solvedCount ? 'done' : ''} ${
                i === dealIndex && i >= solvedCount ? 'current' : ''
              }`}
            />
          ))}
        </div>
        {assists.solvableBadge && (
          <span className={`chip m24-solvable ${reachable ? 'm24-ok' : 'm24-no'}`}>
            <CheckIcon />
            {reachable ? 'Solvable' : 'No path'}
          </span>
        )}
      </div>

      <div className="m24-stage" ref={stageRef}>
        <div className={`m24-cards n${cards.length}`}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-card={c.id}
              style={{ ['--i' as string]: i } as CSSProperties}
              className={[
                'm24-card',
                selectedId === c.id ? 'selected' : '',
                hintIds.includes(c.id) ? 'hinted' : '',
                justMergedId === c.id ? 'merged' : '',
                wrongId === c.id ? 'wrong' : '',
                dealing ? 'dealing' : '',
                !fracIsInt(c.value) ? 'is-frac' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => tapCard(c.id)}
              aria-label={`Card ${c.value.d === 1 ? c.value.n : `${c.value.n} over ${c.value.d}`}`}
            >
              <CardValue frac={c.value} animate={justMergedId === c.id} />
            </button>
          ))}
        </div>

        {burst && (
          <div className="m24-burst" aria-hidden>
            = {target}!
          </div>
        )}

        {soloWrong && !burst && (
          <div className="m24-hint-line bad">Not {target} — undo or reset</div>
        )}
        {cards.length > 1 && selectedId == null && !dealing && !revealShown && !noPath && (
          <div className="m24-hint-line">Tap a card, an operator, then another card</div>
        )}
        {revealShown && deal.solutionExpr && (
          <div className="m24-solution">
            <span className="m24-solution-label">Solution</span>
            <span className="m24-solution-expr">{deal.solutionExpr}</span>
          </div>
        )}
        {noPath && cards.length > 1 && (
          <div className="m24-hint-line bad">No way to {target} from here — undo</div>
        )}
      </div>

      {hasTools && (
        <div className="game-tools fx-card">
          <div className="m24-ops">
            {OPS.map((op) => (
              <PadTool
                key={op}
                className={`m24-op ${hintOp === op ? 'hintop' : ''}`}
                active={pendingOp === op}
                disabled={selectedId == null}
                onClick={() => tapOp(op)}
                aria-label={`Operator ${OP_GLYPH[op]}`}
              >
                <span className="m24-op-glyph">{OP_GLYPH[op]}</span>
              </PadTool>
            ))}
          </div>
          <div className="m24-actions">
            <PadTool onClick={undo} disabled={history.length === 0}>
              <UndoIcon />
              <span>Undo</span>
            </PadTool>
            <PadTool onClick={reset} disabled={history.length === 0 && !revealShown}>
              <RestartIcon />
              <span>Reset</span>
            </PadTool>
            {assists.hint && (
              <PadTool silent onClick={useHint}>
                <BulbIcon />
                <span>Hint</span>
              </PadTool>
            )}
            {assists.reveal && (
              <PadTool silent onClick={useReveal} active={revealShown}>
                <EyeIcon />
                <span>Reveal</span>
              </PadTool>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
