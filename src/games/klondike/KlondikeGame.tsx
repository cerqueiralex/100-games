import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  applyMove,
  autoCompleteMoves,
  canAutoComplete,
  canStackFoundation,
  canStackTableau,
  cloneState,
  foundationCount,
  generateDeal,
  hintMove,
  isRed,
  isWon,
  rankLabel,
  runStart,
  safeFoundationMove,
  SUIT_SYMBOL,
  SUITS,
  TIERS,
  type Card,
  type KState,
  type Move,
  type Suit
} from './logic/deck';

/* fan overlap: margin-top as a % of column width (= card width). Cards are
   5:7, so height = 140% of width; a face-up card below reveals ~34% of its
   height, a face-down card only ~17%. */
const UP_M = '-92%';
const DOWN_M = '-116%';
const MOVE_THRESHOLD = 6;
const HINT_PENALTY = 40;
const PAR_SEC: Record<Difficulty, number> = { easy: 360, medium: 420, hard: 600, pro: 660, extreme: 720 };

const SUIT_IX: Record<Suit, number> = { S: 0, H: 1, D: 2, C: 3 };
const keyOf = (c: Card): string => c.s + c.r;
const foundTopC = (st: KState, s: Suit): Card | undefined => {
  const f = st.foundations[SUIT_IX[s]];
  return f.length ? f[f.length - 1] : undefined;
};
const tabTopC = (st: KState, c: number): Card | undefined => {
  const col = st.tableau[c];
  return col.length ? col[col.length - 1] : undefined;
};

type Source = { type: 'waste' } | { type: 'foundation'; suit: Suit } | { type: 'tableau'; col: number; index: number };
type Target = { kind: 'foundation'; suit: Suit; pileKey: string; legal: boolean } | { kind: 'tableau'; col: number; pileKey: string; legal: boolean };
interface Drag {
  source: Source;
  cards: Card[];
  grab: { x: number; y: number };
  start: { x: number; y: number };
  w: number;
  x: number;
  y: number;
  target: Target | null;
  bouncing: boolean;
}
interface Pending {
  source: Source;
  cards: Card[];
  grab: { x: number; y: number };
  start: { x: number; y: number };
  w: number;
  ox: number;
  oy: number;
}
interface HistItem {
  move: Move;
  auto: boolean;
}
interface KlonSave {
  v: 1;
  seed: number;
  drawCount: 1 | 3;
  redealsInit: number;
  initial: KState;
  history: HistItem[];
  hintsUsed: number;
  assistsUsed: string[];
  winnable: boolean;
}

function isSave(s: unknown): s is KlonSave {
  return !!s && (s as KlonSave).v === 1 && Array.isArray((s as KlonSave).history) && !!(s as KlonSave).initial;
}

/* -------- inline monochrome tool icons (currentColor) -------- */
function UndoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 7L4 12l5 5" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
    </svg>
  );
}
function AutoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v10" />
      <path d="M8 9l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  );
}
function FinishIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4v16" />
      <path d="M4 5h13l-2.5 3.5L17 12H4" />
    </svg>
  );
}
function RecycleIcon() {
  return (
    <svg width="46%" height="46%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9a8 8 0 0 1 13-2l2 2" />
      <path d="M20 15a8 8 0 0 1-13 2l-2-2" />
      <path d="M19 4v5h-5" />
      <path d="M5 20v-5h5" />
    </svg>
  );
}
function NoneIcon() {
  return (
    <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* -------- a rendered card -------- */
function CardFace({
  card,
  className = '',
  style,
  onPointerDown
}: {
  card: Card;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  if (!card.up) return <div className={`klon-card down ${className}`} style={style} onPointerDown={onPointerDown} aria-hidden />;
  const red = isRed(card.s);
  return (
    <div className={`klon-card up ${red ? 'red' : 'black'} ${className}`} style={style} onPointerDown={onPointerDown} aria-label={`${rankLabel(card.r)} of ${card.s}`}>
      <span className="klon-corner">
        {rankLabel(card.r)}
        <i>{SUIT_SYMBOL[card.s]}</i>
      </span>
      <span className="klon-pip">{SUIT_SYMBOL[card.s]}</span>
    </div>
  );
}

/* -------- the classic bouncing-cards win flourish -------- */
interface Sprite {
  id: string;
  card: Card;
  x: number;
  y: number;
  w: number;
  h: number;
}
function BounceLayer({ sprites }: { sprites: Sprite[] }) {
  const elRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!sprites.length || typeof window === 'undefined') return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const sim = sprites.map((s, i) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      vx: (Math.random() * 2 - 1) * 7 || 3,
      vy: -Math.random() * 4 - 2,
      active: false,
      gone: false,
      launchAt: i * 55
    }));
    const G = 0.62;
    const REST = 0.8;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - t0;
      let anyLeft = false;
      for (const s of sim) {
        if (s.gone) continue;
        if (!s.active) {
          if (elapsed >= s.launchAt) s.active = true;
          else {
            anyLeft = true;
            continue;
          }
        }
        s.vy += G;
        s.x += s.vx;
        s.y += s.vy;
        if (s.y + s.h > H) {
          s.y = H - s.h;
          s.vy = -s.vy * REST;
          if (Math.abs(s.vy) < 2.2) s.vy = 0;
        }
        if (s.x < -s.w - 60 || s.x > W + 60) {
          s.gone = true;
          const el = elRefs.current[s.id];
          if (el) el.style.display = 'none';
          continue;
        }
        anyLeft = true;
        const el = elRefs.current[s.id];
        if (el) el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
      if (anyLeft && elapsed < 10000) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sprites]);

  return (
    <div className="klon-bounce-layer" aria-hidden>
      {sprites.map((s) => (
        <div
          key={s.id}
          ref={(el) => (elRefs.current[s.id] = el)}
          className="klon-bounce"
          style={{ width: s.w, height: s.h, transform: `translate(${s.x}px, ${s.y}px)` }}
        >
          <CardFace card={s.card} />
        </div>
      ))}
    </div>
  );
}

export function KlondikeGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  onToggleAssist
}: GameProps) {
  const tier = TIERS[difficulty];
  const saved = isSave(savedState) ? savedState : undefined;

  /* -------- one-time boot (fresh deal or resumed replay) -------- */
  const [boot] = useState(() => {
    if (saved) {
      const initial = cloneState(saved.initial);
      let st = cloneState(initial);
      for (const it of saved.history) st = applyMove(st, it.move);
      return {
        initial,
        history: saved.history,
        state: st,
        seed: saved.seed,
        drawCount: saved.drawCount,
        redealsInit: saved.redealsInit,
        winnable: saved.winnable,
        hintsUsed: saved.hintsUsed,
        assistsUsed: saved.assistsUsed
      };
    }
    const g = generateDeal(difficulty);
    return {
      initial: g.state,
      history: [] as HistItem[],
      state: cloneState(g.state),
      seed: g.seed,
      drawCount: tier.drawCount,
      redealsInit: tier.redeals,
      winnable: g.winnable,
      hintsUsed: 0,
      assistsUsed: [] as string[]
    };
  });

  const initialRef = useRef<KState>(cloneState(boot.initial));
  const [state, setStateRaw] = useState<KState>(boot.state);
  const stateRef = useRef<KState>(state);
  const [history, setHistoryRaw] = useState<HistItem[]>(boot.history);
  const historyRef = useRef<HistItem[]>(history);
  const seed = boot.seed;
  const drawCount = boot.drawCount;
  const redealsInit = boot.redealsInit;
  const winnableRef = useRef(boot.winnable);

  const [hintsUsed, setHintsUsed] = useState(boot.hintsUsed);
  const hintsRef = useRef(boot.hintsUsed);
  const assistsUsed = useRef<Set<string>>(new Set(boot.assistsUsed));

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const [won, setWon] = useState(false);
  const [bounce, setBounce] = useState<Sprite[]>([]);
  const [hint, setHint] = useState<Move | null>(null);
  const [fx, setFx] = useState<{ pop: Set<string>; spark: Set<Suit> }>({ pop: new Set(), spark: new Set() });

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLElement | null)[]>([]);
  const foundationRefs = useRef<(HTMLElement | null)[]>([]);
  const stockRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ key: string; t: number } | null>(null);
  const hintTimer = useRef<number | null>(null);
  const fxTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;
  const assistsRef = useRef(assists);
  assistsRef.current = assists;

  const setState = (s: KState) => {
    stateRef.current = s;
    setStateRaw(s);
  };

  const userMoves = useMemo(() => history.filter((h) => !h.auto).length, [history]);

  /* -------- history stack (capped, re-based) -------- */
  function pushHistory(items: HistItem[]) {
    let h = [...historyRef.current, ...items];
    const CAP = 500;
    if (h.length > CAP) {
      const surplus = h.length - CAP;
      let base = cloneState(initialRef.current);
      for (let i = 0; i < surplus; i++) base = applyMove(base, h[i].move);
      initialRef.current = base;
      h = h.slice(surplus);
    }
    historyRef.current = h;
    setHistoryRaw(h);
  }

  /* -------- fx -------- */
  function triggerFx(pop: Set<string>, spark: Set<Suit>) {
    if (pop.size === 0 && spark.size === 0) return;
    setFx({ pop, spark });
    if (fxTimer.current) clearTimeout(fxTimer.current);
    fxTimer.current = window.setTimeout(() => setFx({ pop: new Set(), spark: new Set() }), 520);
  }

  function collect(before: KState, m: Move, pop: Set<string>, spark: Set<Suit>) {
    switch (m.type) {
      case 'draw': {
        const k = Math.min(before.drawCount, before.stock.length);
        for (let i = before.stock.length - k; i < before.stock.length; i++) pop.add(keyOf(before.stock[i]));
        break;
      }
      case 'wf': {
        const c = before.waste[before.waste.length - 1];
        if (c) {
          pop.add(keyOf(c));
          spark.add(c.s);
        }
        break;
      }
      case 'tf': {
        const col = before.tableau[m.from];
        const c = col[col.length - 1];
        if (c) {
          pop.add(keyOf(c));
          spark.add(c.s);
        }
        break;
      }
      case 'wt': {
        const c = before.waste[before.waste.length - 1];
        if (c) pop.add(keyOf(c));
        break;
      }
      case 'tt': {
        const col = before.tableau[m.from];
        for (const c of col.slice(col.length - m.count)) pop.add(keyOf(c));
        break;
      }
      case 'ft': {
        const f = before.foundations[SUIT_IX[m.suit]];
        const c = f[f.length - 1];
        if (c) pop.add(keyOf(c));
        break;
      }
    }
  }

  /* -------- core move application (+ auto-foundation cascade) -------- */
  function applyUserMove(move: Move, sound: 'place' | 'draw' | 'recycle') {
    if (done.current) return;
    const before = stateRef.current;
    let st = applyMove(before, move);
    const items: HistItem[] = [{ move, auto: false }];
    const pop = new Set<string>();
    const spark = new Set<Suit>();
    collect(before, move, pop, spark);
    if (assistsRef.current.autoFoundation) {
      for (;;) {
        const sm = safeFoundationMove(st);
        if (!sm) break;
        const b = st;
        st = applyMove(b, sm);
        items.push({ move: sm, auto: true });
        collect(b, sm, pop, spark);
      }
    }
    setHint(null);
    setState(st);
    pushHistory(items);
    triggerFx(pop, spark);
    if (sound === 'place') sfx.place();
    else if (sound === 'draw') sfx.tap();
    else sfx.drag();
    if (isWon(st)) finishWin(st);
  }

  function computeScore(): number {
    const mult = tier.mult;
    const winBonus = 1000 * mult;
    const effBonus = Math.max(0, 350 * mult - userMovesCountRef.current * 2);
    const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult;
    return Math.max(0, winBonus + effBonus + timeBonus - hintsRef.current * HINT_PENALTY);
  }
  // userMoves via ref for use inside callbacks
  const userMovesCountRef = useRef(0);
  userMovesCountRef.current = userMoves;

  function finishWin(st: KState) {
    if (done.current) return;
    done.current = true;
    setWon(true);
    startBounce(st);
    const score = computeScore();
    // let the flourish play a beat before the shell's completion modal + win sfx
    finishTimer.current = window.setTimeout(() => {
      events.onFinish({
        outcome: 'won',
        score,
        errors: 0,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { moves: userMovesCountRef.current, timeMs: elapsedRef.current * 1000 }
      });
    }, 850);
  }

  function startBounce(st: KState) {
    const sprites: Sprite[] = [];
    SUITS.forEach((_, ix) => {
      const el = foundationRefs.current[ix];
      if (!el) return;
      const r = el.getBoundingClientRect();
      const f = st.foundations[ix];
      for (let k = f.length - 1; k >= 0; k--) {
        sprites.push({ id: keyOf(f[k]), card: f[k], x: r.left, y: r.top, w: r.width, h: r.height });
      }
    });
    setBounce(sprites);
  }

  /* -------- pointer drag / drop -------- */
  function onCardDown(e: React.PointerEvent, source: Source) {
    if (paused || done.current) return;
    const st = stateRef.current;
    let cards: Card[];
    if (source.type === 'waste') {
      const c = st.waste[st.waste.length - 1];
      if (!c) return;
      cards = [c];
    } else if (source.type === 'foundation') {
      const c = foundTopC(st, source.suit);
      if (!c) return;
      cards = [c];
    } else {
      const col = st.tableau[source.col];
      const rs = runStart(col);
      if (rs < 0 || source.index < rs) return;
      cards = col.slice(source.index);
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    pendingRef.current = {
      source,
      cards,
      grab: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      start: { x: rect.left, y: rect.top },
      w: rect.width,
      ox: e.clientX,
      oy: e.clientY
    };
    boardRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function pileAtPoint(cx: number, cy: number, cards: Card[]): Target | null {
    const st = stateRef.current;
    const inside = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return cx >= r.left - 8 && cx <= r.right + 8 && cy >= r.top - 8 && cy <= r.bottom + 8;
    };
    for (const s of SUITS) {
      if (inside(foundationRefs.current[SUIT_IX[s]])) {
        const legal = cards.length === 1 && cards[0].s === s && canStackFoundation(cards[0], foundTopC(st, s));
        return { kind: 'foundation', suit: s, pileKey: 'f' + s, legal };
      }
    }
    for (let c = 0; c < 7; c++) {
      if (inside(columnRefs.current[c])) {
        const legal = canStackTableau(cards[0], tabTopC(st, c));
        return { kind: 'tableau', col: c, pileKey: 't' + c, legal };
      }
    }
    return null;
  }

  function onBoardMove(e: React.PointerEvent) {
    const p = pendingRef.current;
    if (!p) return;
    if (paused || done.current) {
      cancelDrag();
      return;
    }
    if (!dragRef.current) {
      if (Math.hypot(e.clientX - p.ox, e.clientY - p.oy) < MOVE_THRESHOLD) return;
      const d: Drag = {
        source: p.source,
        cards: p.cards,
        grab: p.grab,
        start: p.start,
        w: p.w,
        x: e.clientX - p.grab.x,
        y: e.clientY - p.grab.y,
        target: null,
        bouncing: false
      };
      dragRef.current = d;
      setDrag(d);
    }
    const d = dragRef.current;
    if (!d) return;
    d.x = e.clientX - d.grab.x;
    d.y = e.clientY - d.grab.y;
    if (floatRef.current) {
      floatRef.current.style.left = `${d.x}px`;
      floatRef.current.style.top = `${d.y}px`;
    }
    const tgt = pileAtPoint(e.clientX, e.clientY, d.cards);
    if (tgt?.pileKey !== d.target?.pileKey || tgt?.legal !== d.target?.legal) {
      d.target = tgt;
      setDrag({ ...d });
    }
  }

  function onBoardUp(e: React.PointerEvent) {
    const p = pendingRef.current;
    pendingRef.current = null;
    boardRef.current?.releasePointerCapture?.(e.pointerId);
    const d = dragRef.current;
    if (d) {
      const tgt = pileAtPoint(e.clientX, e.clientY, d.cards);
      if (tgt && tgt.legal) {
        performDrop(d, tgt);
        dragRef.current = null;
        setDrag(null);
      } else {
        bounceBack(d);
      }
    } else if (p) {
      handleTap(p.source);
    }
  }

  function performDrop(d: Drag, tgt: Target) {
    const src = d.source;
    let move: Move | null = null;
    if (tgt.kind === 'foundation') {
      if (src.type === 'waste') move = { type: 'wf' };
      else if (src.type === 'tableau') move = { type: 'tf', from: src.col };
    } else {
      if (src.type === 'waste') move = { type: 'wt', to: tgt.col };
      else if (src.type === 'foundation') move = { type: 'ft', suit: src.suit, to: tgt.col };
      else move = { type: 'tt', from: src.col, to: tgt.col, count: d.cards.length };
    }
    if (move) applyUserMove(move, 'place');
  }

  function bounceBack(d: Drag) {
    setDrag({ ...d, bouncing: true });
    sfx.error();
    requestAnimationFrame(() => {
      if (floatRef.current) {
        floatRef.current.style.transition = 'left .18s ease, top .18s ease';
        floatRef.current.style.left = `${d.start.x}px`;
        floatRef.current.style.top = `${d.start.y}px`;
      }
    });
    window.setTimeout(() => {
      dragRef.current = null;
      setDrag(null);
    }, 200);
  }

  function cancelDrag() {
    pendingRef.current = null;
    dragRef.current = null;
    setDrag(null);
  }

  function handleTap(source: Source) {
    if (paused || done.current) return;
    const k = source.type === 'tableau' ? `t${source.col}:${source.index}` : source.type === 'waste' ? 'w' : `f${source.suit}`;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.key === k && now - last.t < 430) {
      lastTapRef.current = null;
      tryFoundation(source);
    } else {
      lastTapRef.current = { key: k, t: now };
    }
  }

  function tryFoundation(source: Source) {
    const st = stateRef.current;
    let move: Move | null = null;
    if (source.type === 'waste') {
      const c = st.waste[st.waste.length - 1];
      if (c && canStackFoundation(c, foundTopC(st, c.s))) move = { type: 'wf' };
    } else if (source.type === 'tableau') {
      const col = st.tableau[source.col];
      if (source.index === col.length - 1) {
        const c = col[col.length - 1];
        if (c && canStackFoundation(c, foundTopC(st, c.s))) move = { type: 'tf', from: source.col };
      }
    }
    if (move) applyUserMove(move, 'place');
  }

  function tapStock() {
    if (paused || done.current) return;
    const st = stateRef.current;
    if (st.stock.length > 0) applyUserMove({ type: 'draw' }, 'draw');
    else if (st.waste.length > 0 && st.redealsLeft !== 0) applyUserMove({ type: 'recycle' }, 'recycle');
    else sfx.error();
  }

  /* -------- tools -------- */
  function undo() {
    if (done.current || !assistsRef.current.undo) return;
    const h = historyRef.current;
    if (h.length === 0) return;
    let cut = h.length;
    while (cut > 0 && h[cut - 1].auto) cut--; // drop the auto-foundation cascade
    if (cut > 0) cut--; // and the user move that triggered it
    const newHist = h.slice(0, cut);
    let st = cloneState(initialRef.current);
    for (const it of newHist) st = applyMove(st, it.move);
    historyRef.current = newHist;
    setHistoryRaw(newHist);
    setState(st);
    setHint(null);
    assistsUsed.current.add('undo');
    playNote(320, 90, 'sine');
  }

  function useHint() {
    if (done.current || paused || !assistsRef.current.hint) return;
    const m = hintMove(stateRef.current);
    if (!m) return;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    setHint(m);
    sfx.hint();
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 1800);
  }

  function autoFinish() {
    if (done.current || paused) return;
    const { moves, won: canWin } = autoCompleteMoves(stateRef.current);
    if (!canWin) return;
    let st = stateRef.current;
    const items: HistItem[] = [];
    const pop = new Set<string>();
    const spark = new Set<Suit>();
    for (const m of moves) {
      const b = st;
      st = applyMove(b, m);
      items.push({ move: m, auto: true });
      collect(b, m, pop, spark);
    }
    setState(st);
    pushHistory(items);
    triggerFx(pop, spark);
    sfx.place();
    if (isWon(st)) finishWin(st);
  }

  /* -------- passive assist bookkeeping -------- */
  useEffect(() => {
    if (assists.winnableBadge && winnableRef.current) assistsUsed.current.add('winnableBadge');
  }, [assists.winnableBadge]);

  // auto-foundation: counts as help whenever enabled; acts immediately on toggle-on
  useEffect(() => {
    if (!assists.autoFoundation || done.current) return;
    assistsUsed.current.add('autoFoundation');
    let st = stateRef.current;
    const items: HistItem[] = [];
    const pop = new Set<string>();
    const spark = new Set<Suit>();
    for (;;) {
      const sm = safeFoundationMove(st);
      if (!sm) break;
      const b = st;
      st = applyMove(b, sm);
      items.push({ move: sm, auto: true });
      collect(b, sm, pop, spark);
    }
    if (items.length) {
      setState(st);
      pushHistory(items);
      triggerFx(pop, spark);
      sfx.place();
      if (isWon(st)) finishWin(st);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.autoFoundation]);

  /* -------- pause cancels an in-flight drag -------- */
  useEffect(() => {
    if (paused) cancelDrag();
  }, [paused]);

  /* -------- stats + snapshot -------- */
  const liveScore = Math.round(foundationCount(state) * 18 * tier.mult);
  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors: 0,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { moves: userMoves, foundations: foundationCount(state) }
    });
  }, [liveScore, hintsUsed, userMoves, state, events]);

  useEffect(() => {
    registerSnapshot(
      (): KlonSave => ({
        v: 1,
        seed,
        drawCount,
        redealsInit,
        initial: initialRef.current,
        history: historyRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        winnable: winnableRef.current
      })
    );
  });

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (fxTimer.current) clearTimeout(fxTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
    },
    []
  );

  /* -------- hint highlight sets -------- */
  const hintSrc = new Set<string>();
  let hintStock = false;
  let hintPile: string | null = null;
  if (hint) {
    const st = state;
    switch (hint.type) {
      case 'draw':
      case 'recycle':
        hintStock = true;
        break;
      case 'wf': {
        const c = st.waste[st.waste.length - 1];
        if (c) {
          hintSrc.add(keyOf(c));
          hintPile = 'f' + c.s;
        }
        break;
      }
      case 'wt': {
        const c = st.waste[st.waste.length - 1];
        if (c) hintSrc.add(keyOf(c));
        hintPile = 't' + hint.to;
        break;
      }
      case 'tf': {
        const c = tabTopC(st, hint.from);
        if (c) {
          hintSrc.add(keyOf(c));
          hintPile = 'f' + c.s;
        }
        break;
      }
      case 'tt': {
        const col = st.tableau[hint.from];
        for (const c of col.slice(col.length - hint.count)) hintSrc.add(keyOf(c));
        hintPile = 't' + hint.to;
        break;
      }
      default:
        break;
    }
  }

  const canFinish = assists.autoFoundation && !won && !paused && canAutoComplete(state);
  const showBadge = assists.winnableBadge && winnableRef.current && !won;

  /* -------- render -------- */
  const cardStyle = (i: number, prevUp: boolean): CSSProperties => ({
    marginTop: i === 0 ? 0 : prevUp ? UP_M : DOWN_M,
    zIndex: i + 1
  });

  return (
    <div className={`klon ${paused ? 'board-hidden' : ''} ${won ? 'won' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Moves: <b>{userMoves}</b>
        </span>
        <span className="info-item">
          <b>{foundationCount(state)}</b>/52
        </span>
        <span className="info-item">
          Redeals: <b>{state.redealsLeft < 0 ? '∞' : state.redealsLeft}</b>
        </span>
        {showBadge && <span className="chip good klon-badge">Winnable</span>}
      </div>

      <div
        ref={boardRef}
        className="klon-board"
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        onPointerCancel={onBoardUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* top row: stock · waste · spacer · 4 foundations */}
        <div className="klon-top">
          <div className="klon-slot stock-slot" ref={stockRef} onClick={tapStock} role="button" aria-label="Stock">
            {state.stock.length > 0 ? (
              <div className={`klon-card down ${hintStock ? 'hint-src' : ''}`} />
            ) : state.waste.length > 0 && state.redealsLeft !== 0 ? (
              <span className={`klon-empty ${hintStock ? 'hint-src' : ''}`}>
                <RecycleIcon />
              </span>
            ) : (
              <span className="klon-empty none">
                <NoneIcon />
              </span>
            )}
          </div>

          <div className="klon-slot waste-slot">
            {(() => {
              const vis = state.waste.slice(Math.max(0, state.waste.length - (drawCount === 3 ? 3 : 1)));
              return vis.map((card, i) => {
                const isTop = i === vis.length - 1;
                if (drag && drag.source.type === 'waste' && isTop) return null;
                return (
                  <CardFace
                    key={keyOf(card)}
                    card={card}
                    className={hintSrc.has(keyOf(card)) ? 'hint-src' : ''}
                    style={{ position: 'absolute', top: 0, left: `${i * 22}%`, zIndex: i + 1 }}
                    onPointerDown={isTop ? (e) => onCardDown(e, { type: 'waste' }) : undefined}
                  />
                );
              });
            })()}
          </div>

          <div className="klon-slot spacer" aria-hidden />

          {SUITS.map((s) => {
            const f = state.foundations[SUIT_IX[s]];
            const top = f.length ? f[f.length - 1] : undefined;
            const hidden = drag?.source.type === 'foundation' && drag.source.suit === s;
            return (
              <div
                key={s}
                ref={(el) => (foundationRefs.current[SUIT_IX[s]] = el)}
                className={[
                  'klon-slot found',
                  isRed(s) ? 'red' : 'black',
                  fx.spark.has(s) ? 'spark' : '',
                  drag?.target?.pileKey === 'f' + s ? (drag.target.legal ? 'drop-ok' : 'drop-no') : '',
                  hintPile === 'f' + s ? 'hint-dst' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-suit={s}
              >
                {!top || hidden ? (
                  <span className="klon-found-mark">{SUIT_SYMBOL[s]}</span>
                ) : (
                  <CardFace
                    card={top}
                    className={fx.pop.has(keyOf(top)) ? 'pop' : ''}
                    onPointerDown={(e) => onCardDown(e, { type: 'foundation', suit: s })}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* tableau */}
        <div className="klon-tableau">
          {state.tableau.map((col, ci) => {
            const rs = runStart(col);
            const isDropTarget = drag?.target?.pileKey === 't' + ci;
            return (
              <div
                key={ci}
                ref={(el) => (columnRefs.current[ci] = el)}
                className={[
                  'klon-col',
                  isDropTarget ? (drag!.target!.legal ? 'drop-ok' : 'drop-no') : '',
                  hintPile === 't' + ci ? 'hint-dst' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {col.length === 0 && <div className="klon-slot empty-col" />}
                {col.map((card, k) => {
                  if (drag && drag.source.type === 'tableau' && drag.source.col === ci && k >= drag.source.index) return null;
                  const grabbable = card.up && rs >= 0 && k >= rs;
                  return (
                    <CardFace
                      key={keyOf(card)}
                      card={card}
                      className={[fx.pop.has(keyOf(card)) ? 'pop' : '', hintSrc.has(keyOf(card)) ? 'hint-src' : ''].filter(Boolean).join(' ')}
                      style={cardStyle(k, k > 0 ? col[k - 1].up : true)}
                      onPointerDown={grabbable ? (e) => onCardDown(e, { type: 'tableau', col: ci, index: k }) : undefined}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* floating drag stack */}
        {drag && (
          <div
            ref={floatRef}
            className={`klon-float ${drag.bouncing ? 'bouncing' : ''}`}
            style={{ left: drag.x, top: drag.y, width: drag.w }}
          >
            {drag.cards.map((card, i) => (
              <CardFace key={keyOf(card)} card={card} style={{ marginTop: i === 0 ? 0 : drag.cards[i - 1].up ? UP_M : DOWN_M, zIndex: i + 1 }} />
            ))}
          </div>
        )}
      </div>

      {bounce.length > 0 && <BounceLayer sprites={bounce} />}

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={history.length === 0 || done.current} aria-label="Undo">
              <UndoIcon />
              <span>Undo</span>
            </PadTool>
          )}
          {assists.hint && (
            <PadTool silent onClick={useHint} disabled={done.current} aria-label="Hint">
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          {canFinish ? (
            <PadTool silent onClick={autoFinish} aria-label="Auto-finish">
              <FinishIcon />
              <span>Finish</span>
            </PadTool>
          ) : (
            <PadTool active={assists.autoFoundation} onClick={() => onToggleAssist('autoFoundation', !assists.autoFoundation)} aria-label="Auto to foundation">
              <AutoIcon />
              <span>Auto</span>
            </PadTool>
          )}
        </div>
      </div>
    </div>
  );
}
