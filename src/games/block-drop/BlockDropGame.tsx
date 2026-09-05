import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { DpadArrowIcon, HardDropIcon, RotateCcwIcon, RotateCwIcon, SaveIcon, UndoIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  bag,
  cells,
  clearRows,
  COLS,
  dropDistance,
  emptyBoard,
  fits,
  fullRows,
  gravityFor,
  H,
  HARD_DROP_POINTS,
  HIDDEN,
  isLockOut,
  levelFor,
  LINE_SCORE,
  lock,
  move,
  MULT,
  PIECES,
  ROWS,
  rotate,
  SHAPES,
  SOFT_DROP_POINTS,
  spawn,
  TIERS,
  type Board,
  type Cell,
  type Piece,
  type PieceType
} from './logic/engine';

/*
 * Block Drop on a canvas: hold box, the well and the next queue are one
 * <canvas> redrawn every frame, so pieces fall, lines flash and collapse
 * and hard drops leave a trail — all in the app's content palette read
 * from the CSS tokens, on an extruded plate like every other board. Live
 * state lives in refs (the loop mutates it); React state carries only
 * what the HUD prints.
 *
 * Feel: DAS/ARR on held left/right (keys and the on-screen buttons),
 * soft drop while Down is held, hard drop with a landing thud, a short
 * lock delay that moves and turns reset (a few times), SRS kicks, a hold
 * slot, three-piece preview, a ghost. Touch on the well: drag sideways
 * to move a cell per cell of drag, tap to turn, flick down to drop.
 */

interface UndoState {
  board: Board;
  type: PieceType;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  lines: number;
  score: number;
  tetrises: number;
}

interface DropSave {
  board: Board;
  piece: Piece | null;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  lines: number;
  score: number;
  tetrises: number;
  undosLeft: number;
  hintsUsed: number;
  assistsUsed: string[];
  undoState: UndoState | null;
}

type Phase = 'falling' | 'clearing' | 'collapsing' | 'over';

interface Live {
  board: Board;
  piece: Piece | null;
  hold: PieceType | null;
  canHold: boolean;
  queue: PieceType[];
  lines: number;
  score: number;
  tetrises: number;
  level: number;
  phase: Phase;
  gravAcc: number;
  lockAcc: number;
  lockResets: number;
  soft: boolean;
  das: { dir: -1 | 0 | 1; since: number; lastRepeat: number };
  clearing: { rows: number[]; at: number; oldBoard: Board } | null;
  fx: {
    trail: { cols: number[]; top: number; bottom: number; at: number; color: number } | null;
    flash: { cells: Cell[]; at: number } | null;
    floats: { x: number; y: number; text: string; at: number }[];
    overAt: number;
  };
  undoState: UndoState | null;
  undosLeft: number;
  hintsUsed: number;
}

const WIN_BONUS = 500;
const LOCK_MS = 420;
const MAX_LOCK_RESETS = 8;
const DAS_MS = 150;
const ARR_MS = 45;
const SOFT_MS = 45;
const CLEAR_MS = 190;
const COLLAPSE_MS = 130;
const OVER_DELAY_MS = 900;
const MAX_UNDOS = 3;
const NEXT_SHOWN = 3;
/** canvas layout in cells: pad · hold · gap · well · gap · next · pad */
const LAYOUT_COLS = 20;
const LAYOUT_ROWS = 21;

interface Palette {
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  edge: string;
  bad: string;
  good: string;
  pieces: string[];
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string) => cs.getPropertyValue(n).trim();
  return {
    surface: get('--surface'),
    surface2: get('--surface-2'),
    border: get('--border'),
    text: get('--text'),
    textDim: get('--text-dim'),
    edge: get('--edge'),
    bad: get('--bad'),
    good: get('--good'),
    // I cyan · O yellow · T purple · S green · Z red · J blue · L orange
    pieces: ['', get('--play-6'), get('--play-3'), get('--play-5'), get('--play-1'), get('--play-2'), get('--play-4'), get('--play-7')]
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const validSave = (s: unknown): s is DropSave => {
  const d = s as DropSave;
  return (
    !!d &&
    Array.isArray(d.board) &&
    d.board.length === COLS * H &&
    Array.isArray(d.queue) &&
    typeof d.lines === 'number' &&
    typeof d.score === 'number'
  );
};

export function BlockDropGame({ difficulty, assists, paused, events, savedState, registerSnapshot }: GameProps) {
  const tier = TIERS[difficulty];
  const mult = MULT[difficulty];
  const saved = validSave(savedState) ? savedState : undefined;

  const live = useRef<Live>(
    (() => {
      const queue = saved?.queue.filter((t) => PIECES.includes(t)) ?? [];
      while (queue.length < 7) queue.push(...bag());
      const piece = saved?.piece && PIECES.includes(saved.piece.type) ? saved.piece : spawn(queue.shift() as PieceType);
      return {
        board: saved?.board ?? emptyBoard(),
        piece,
        hold: saved?.hold && PIECES.includes(saved.hold) ? saved.hold : null,
        canHold: saved?.canHold ?? true,
        queue,
        lines: saved?.lines ?? 0,
        score: saved?.score ?? 0,
        tetrises: saved?.tetrises ?? 0,
        level: levelFor(saved?.lines ?? 0),
        phase: 'falling',
        gravAcc: 0,
        lockAcc: 0,
        lockResets: 0,
        soft: false,
        das: { dir: 0, since: 0, lastRepeat: 0 },
        clearing: null,
        fx: { trail: null, flash: null, floats: [], overAt: 0 },
        undoState: saved?.undoState ?? null,
        undosLeft: saved?.undosLeft ?? MAX_UNDOS,
        hintsUsed: saved?.hintsUsed ?? 0
      };
    })()
  );

  const [hud, setHud] = useState(() => ({
    score: live.current.score,
    lines: live.current.lines,
    level: live.current.level,
    undosLeft: live.current.undosLeft,
    hintsUsed: live.current.hintsUsed,
    canUndo: !!live.current.undoState
  }));
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [over, setOver] = useState<'won' | 'lost' | null>(null);

  const done = useRef(false);
  /** the score the HUD last printed — drops add points between locks, and the loop syncs when they differ */
  const shownScore = useRef(live.current.score);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const running = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const palette = useRef<Palette | null>(null);
  const timers = useRef<number[]>([]);
  const touch = useRef<{ x: number; y: number; t: number; dragged: number; rows: number; moved: boolean } | null>(null);
  const assistsRef = useRef(assists);
  assistsRef.current = assists;
  const assistsUsed = useRef<Set<string>>(new Set([...(saved?.assistsUsed ?? []), ...(assists.slow ? ['slow'] : [])]));

  useEffect(() => {
    if (assists.slow) assistsUsed.current.add('slow');
  }, [assists.slow]);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const syncHud = () => {
    const g = live.current;
    shownScore.current = g.score;
    setHud({
      score: g.score,
      lines: g.lines,
      level: g.level,
      undosLeft: g.undosLeft,
      hintsUsed: g.hintsUsed,
      canUndo: !!g.undoState
    });
  };

  /* ---------- stats, snapshot, finish ---------- */

  useEffect(() => {
    events.onStats({
      score: hud.score,
      errors: 0,
      hintsUsed: hud.hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { lines: hud.lines, target: tier.target, level: hud.level, tetrises: live.current.tetrises }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud]);

  useEffect(() => {
    registerSnapshot(() => {
      const g = live.current;
      return {
        board: g.board,
        piece: g.piece,
        hold: g.hold,
        canHold: g.canHold,
        queue: g.queue,
        lines: g.lines,
        score: g.score,
        tetrises: g.tetrises,
        undosLeft: g.undosLeft,
        hintsUsed: g.hintsUsed,
        assistsUsed: [...assistsUsed.current],
        undoState: g.undoState
      } satisfies DropSave;
    });
  });

  const finish = (outcome: 'won' | 'lost') => {
    if (done.current) return;
    done.current = true;
    const g = live.current;
    setOver(outcome);
    events.onFinish({
      outcome,
      score: g.score,
      errors: 0,
      hintsUsed: g.hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { lines: g.lines, target: tier.target, level: g.level, tetrises: g.tetrises }
    });
  };

  /* ---------- the rules in motion ---------- */

  const canAct = () => {
    const g = live.current;
    return g.phase === 'falling' && !!g.piece && !done.current && !pausedRef.current;
  };

  const resetLock = () => {
    const g = live.current;
    if (g.piece && !fits(g.board, { ...g.piece, y: g.piece.y + 1 }) && g.lockResets < MAX_LOCK_RESETS) {
      g.lockAcc = 0;
      g.lockResets++;
    }
  };

  const gameOver = (now: number) => {
    const g = live.current;
    g.phase = 'over';
    g.fx.overAt = now;
    g.das.dir = 0;
    g.soft = false;
    sfx.lose();
    setShake(true);
    schedule(() => finish('lost'), OVER_DELAY_MS);
  };

  const spawnNext = (now: number) => {
    const g = live.current;
    while (g.queue.length < 7) g.queue.push(...bag());
    const p = spawn(g.queue.shift() as PieceType);
    g.piece = p;
    g.canHold = true;
    g.gravAcc = 0;
    g.lockAcc = 0;
    g.lockResets = 0;
    if (!fits(g.board, p)) gameOver(now);
    else g.phase = 'falling';
  };

  const lockPiece = (now: number, hard: boolean) => {
    const g = live.current;
    const p = g.piece;
    if (!p) return;
    g.undoState = {
      board: g.board,
      type: p.type,
      hold: g.hold,
      canHold: g.canHold,
      queue: g.queue.slice(),
      lines: g.lines,
      score: g.score,
      tetrises: g.tetrises
    };
    g.board = lock(g.board, p);
    g.piece = null;
    if (isLockOut(p)) {
      gameOver(now);
      return;
    }
    g.fx.flash = { cells: cells(p), at: now };
    const rows = fullRows(g.board);
    if (rows.length > 0) {
      g.phase = 'clearing';
      g.clearing = { rows, at: now, oldBoard: g.board };
      sfx.clear(rows.length);
    } else {
      if (!hard) sfx.place();
      spawnNext(now);
    }
    syncHud();
  };

  const finishClear = (now: number) => {
    const g = live.current;
    const cl = g.clearing;
    if (!cl) return;
    const n = cl.rows.length;
    g.board = clearRows(cl.oldBoard, cl.rows);
    g.clearing = null;
    g.lines += n;
    const pts = LINE_SCORE[n] * g.level;
    g.score += pts;
    if (n === 4) g.tetrises++;
    const midRow = cl.rows.reduce((a, b) => a + b, 0) / n;
    g.fx.floats.push({ x: COLS / 2, y: midRow, text: `+${pts}${n === 4 ? '  FOUR!' : ''}`, at: now });
    const nl = levelFor(g.lines);
    if (nl > g.level) {
      g.level = nl;
      setToast({ text: `Level ${nl}`, n: nl });
      sfx.hint();
    }
    if (g.lines >= tier.target) {
      g.score += WIN_BONUS * mult;
      g.phase = 'over';
      syncHud();
      finish('won');
      return;
    }
    spawnNext(now);
    syncHud();
  };

  const moveX = (dx: -1 | 1, sound: boolean) => {
    if (!canAct()) return;
    const g = live.current;
    const q = move(g.board, g.piece as Piece, dx, 0);
    if (!q) return;
    g.piece = q;
    resetLock();
    if (sound) sfx.tick();
  };

  const turnPiece = (dir: 1 | -1) => {
    if (!canAct()) return;
    const g = live.current;
    const q = rotate(g.board, g.piece as Piece, dir);
    if (!q) return;
    g.piece = q;
    resetLock();
    sfx.tick();
  };

  const nudgeDown = () => {
    if (!canAct()) return false;
    const g = live.current;
    const q = move(g.board, g.piece as Piece, 0, 1);
    if (!q) return false;
    g.piece = q;
    g.score += SOFT_DROP_POINTS;
    g.gravAcc = 0;
    return true;
  };

  const hardDrop = () => {
    if (!canAct()) return;
    const g = live.current;
    const p = g.piece as Piece;
    const d = dropDistance(g.board, p);
    const landed = { ...p, y: p.y + d };
    const cs = cells(landed);
    g.fx.trail = {
      cols: [...new Set(cs.map(([x]) => x))],
      top: Math.min(...cells(p).map(([, y]) => y)),
      bottom: Math.max(...cs.map(([, y]) => y)),
      at: performance.now(),
      color: PIECES.indexOf(p.type) + 1
    };
    g.piece = landed;
    g.score += d * HARD_DROP_POINTS;
    sfx.thud();
    lockPiece(performance.now(), true);
  };

  const holdPiece = () => {
    if (!canAct()) return;
    const g = live.current;
    if (!g.canHold) return;
    const cur = (g.piece as Piece).type;
    if (g.hold) {
      const t = g.hold;
      g.hold = cur;
      g.piece = spawn(t);
      g.gravAcc = 0;
      g.lockAcc = 0;
      g.lockResets = 0;
      if (!fits(g.board, g.piece)) gameOver(performance.now());
    } else {
      g.hold = cur;
      spawnNext(performance.now());
    }
    g.canHold = false;
    sfx.tap();
  };

  const undo = () => {
    if (!canAct() || !assistsRef.current.undo) return;
    const g = live.current;
    const u = g.undoState;
    if (!u || g.undosLeft <= 0) return;
    g.board = u.board;
    g.piece = spawn(u.type);
    g.hold = u.hold;
    g.canHold = u.canHold;
    g.queue = u.queue.slice();
    g.lines = u.lines;
    g.score = u.score;
    g.tetrises = u.tetrises;
    g.level = levelFor(u.lines);
    g.undoState = null;
    g.undosLeft--;
    g.hintsUsed++;
    g.gravAcc = 0;
    g.lockAcc = 0;
    g.lockResets = 0;
    assistsUsed.current.add('undo');
    sfx.hint();
    syncHud();
  };

  /* ---------- input: keys, buttons, touch ---------- */

  const dasStart = (dir: -1 | 1) => {
    const g = live.current;
    const now = performance.now();
    g.das = { dir, since: now, lastRepeat: now };
    moveX(dir, true);
  };
  const dasStop = (dir?: -1 | 1) => {
    const g = live.current;
    if (dir === undefined || g.das.dir === dir) g.das.dir = 0;
  };
  const softStart = () => {
    live.current.soft = true;
    nudgeDown();
  };
  const softStop = () => {
    live.current.soft = false;
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (!e.repeat) dasStart(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!e.repeat) dasStart(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!e.repeat) softStart();
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault();
          if (!e.repeat) turnPiece(1);
          break;
        case 'z':
        case 'Z':
          if (!e.repeat) turnPiece(-1);
          break;
        case ' ':
          e.preventDefault();
          if (!e.repeat) hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          if (!e.repeat) holdPiece();
          break;
        default:
          return;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') dasStop(-1);
      else if (e.key === 'ArrowRight') dasStop(1);
      else if (e.key === 'ArrowDown') softStop();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellPx = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.clientWidth / LAYOUT_COLS : 20;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    touch.current = { x: e.clientX, y: e.clientY, t: performance.now(), dragged: 0, rows: 0, moved: false };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = touch.current;
    if (!s) return;
    const c = cellPx();
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) s.moved = true;
    const want = Math.trunc(dx / c);
    while (want > s.dragged) {
      moveX(1, s.dragged === 0);
      s.dragged++;
    }
    while (want < s.dragged) {
      moveX(-1, s.dragged === 0);
      s.dragged--;
    }
    if (s.dragged === 0 && dy > c) {
      const rows = Math.floor(dy / c);
      while (rows > s.rows) {
        nudgeDown();
        s.rows++;
      }
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || paused || done.current) return;
    const dt = performance.now() - s.t;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && dt < 320) turnPiece(1);
    else if (s.dragged === 0 && dy > 48 && dt < 260 && Math.abs(dx) < 32) hardDrop();
  };

  /* ---------- the loop ---------- */

  const frame = (now: number) => {
    if (!running.current) return;
    const g = live.current;
    const dt = Math.min(200, now - (lastFrame.current || now));
    lastFrame.current = now;

    if (g.phase === 'falling' && g.piece && !done.current) {
      if (g.das.dir !== 0 && now - g.das.since >= DAS_MS && now - g.das.lastRepeat >= ARR_MS) {
        g.das.lastRepeat = now;
        moveX(g.das.dir, false);
      }
      const grav = gravityFor(tier, g.level, !!assistsRef.current.slow);
      const stepMs = g.soft ? Math.min(grav, SOFT_MS) : grav;
      g.gravAcc += dt;
      let guard = 0;
      while (g.gravAcc >= stepMs && guard++ < 25) {
        g.gravAcc -= stepMs;
        const q = move(g.board, g.piece, 0, 1);
        if (!q) {
          g.gravAcc = 0;
          break;
        }
        g.piece = q;
        g.lockAcc = 0;
        if (g.soft) g.score += SOFT_DROP_POINTS;
      }
      if (g.piece && !fits(g.board, { ...g.piece, y: g.piece.y + 1 })) {
        g.lockAcc += dt;
        if (g.lockAcc >= LOCK_MS) lockPiece(now, false);
      }
    } else if (g.phase === 'clearing' && g.clearing) {
      if (now - g.clearing.at >= CLEAR_MS) {
        g.phase = 'collapsing';
        g.clearing.at = now;
      }
    } else if (g.phase === 'collapsing' && g.clearing) {
      if (now - g.clearing.at >= COLLAPSE_MS) finishClear(now);
    }
    if (g.score !== shownScore.current) syncHud();
    draw(now);
    raf.current = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running.current) return;
    running.current = true;
    lastFrame.current = 0;
    raf.current = requestAnimationFrame(frame);
  };
  const stop = () => {
    running.current = false;
    cancelAnimationFrame(raf.current);
    const g = live.current;
    g.das.dir = 0;
    g.soft = false;
    touch.current = null;
  };

  useEffect(() => {
    const sync = () => {
      if (paused || document.hidden) stop();
      else start();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const fit = () => {
      const w = stage.clientWidth;
      const h = (w * LAYOUT_ROWS) / LAYOUT_COLS;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    palette.current = readPalette();
    const mo = new MutationObserver(() => {
      palette.current = readPalette();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-profile-color'] });
    draw(performance.now());
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- drawing ---------- */

  const draw = (now: number) => {
    const canvas = canvasRef.current;
    const pal = palette.current;
    if (!canvas || !pal) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = canvas.width / dpr;
    const c = W / LAYOUT_COLS;
    const HGT = c * LAYOUT_ROWS;
    const g = live.current;
    ctx.clearRect(0, 0, W, HGT);

    const EDGE = 4;
    const wellX = 5 * c;
    const wellY = 0.5 * c;
    const wellW = COLS * c;
    const wellH = ROWS * c;

    const block = (x: number, y: number, size: number, color: string, alpha = 1, scale = 1) => {
      const gap = size * 0.08;
      const s = (size - gap) * scale;
      const rx = x + gap / 2 + (size - gap - s) / 2;
      const ry = y + gap / 2 + (size - gap - s) / 2;
      const e = Math.max(2, s * 0.16);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, rx, ry + e * 0.4, s, s - e * 0.4 + e * 0.4, s * 0.22);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, rx, ry, s, s - e, s * 0.22);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      roundRect(ctx, rx + s * 0.16, ry + s * 0.12, s * 0.46, s * 0.14, s * 0.07);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    const ghostBlock = (x: number, y: number, size: number, color: string) => {
      const gap = size * 0.08;
      const s = size - gap;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.09);
      roundRect(ctx, x + gap / 2 + 1, y + gap / 2 + 1, s - 2, s - 2, s * 0.22);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    /** a plate: flat fill with the darker bottom band, like every card */
    const plate = (x: number, y: number, w: number, h: number, fill: string) => {
      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = pal.edge;
      ctx.fillRect(x, y + h - EDGE, w, EDGE);
      ctx.restore();
    };
    const label = (text: string, x: number, y: number) => {
      ctx.fillStyle = pal.textDim;
      ctx.font = `700 ${Math.max(9, c * 0.55)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    };
    /** a piece drawn centred in a box, for the hold and next slots */
    const preview = (type: PieceType, x: number, y: number, w: number, h: number, alpha = 1) => {
      const shape = SHAPES[type][0];
      const minX = Math.min(...shape.map(([px]) => px));
      const maxX = Math.max(...shape.map(([px]) => px));
      const minY = Math.min(...shape.map(([, py]) => py));
      const maxY = Math.max(...shape.map(([, py]) => py));
      const size = c * 0.72;
      const ox = x + (w - (maxX - minX + 1) * size) / 2;
      const oy = y + (h - (maxY - minY + 1) * size) / 2;
      for (const [px, py] of shape) block(ox + (px - minX) * size, oy + (py - minY) * size, size, pal.pieces[PIECES.indexOf(type) + 1], alpha);
    };

    /* hold and next plates */
    plate(0.5 * c, wellY, 4 * c, 3.6 * c, pal.surface);
    label('HOLD', 2.5 * c, wellY + 0.55 * c);
    if (g.hold) preview(g.hold, 0.5 * c, wellY + 0.8 * c, 4 * c, 2.5 * c, g.canHold ? 1 : 0.4);
    const nextX = 15.5 * c;
    plate(nextX, wellY, 4 * c, (0.8 + NEXT_SHOWN * 2.7) * c, pal.surface);
    label('NEXT', nextX + 2 * c, wellY + 0.55 * c);
    g.queue.slice(0, NEXT_SHOWN).forEach((t, i) => preview(t, nextX, wellY + (0.8 + i * 2.7) * c, 4 * c, 2.5 * c));

    /* the well */
    plate(wellX - 2, wellY - 2, wellW + 4, wellH + 4 + EDGE, pal.surface2);
    ctx.save();
    roundRect(ctx, wellX, wellY, wellW, wellH, 8);
    ctx.clip();
    ctx.fillStyle = pal.surface;
    ctx.fillRect(wellX, wellY, wellW, wellH);
    ctx.strokeStyle = pal.border;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(wellX + x * c + 0.5, wellY);
      ctx.lineTo(wellX + x * c + 0.5, wellY + wellH);
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.moveTo(wellX, wellY + y * c + 0.5);
      ctx.lineTo(wellX + wellW, wellY + y * c + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    const cellX = (x: number) => wellX + x * c;
    const cellY = (y: number) => wellY + (y - HIDDEN) * c;

    /* the stack — with the clearing rows flashing away or the rest collapsing */
    const cl = g.clearing;
    const board = cl ? cl.oldBoard : g.board;
    const clearedSet = new Set(cl?.rows ?? []);
    const k = cl ? Math.min(1, (now - cl.at) / (g.phase === 'clearing' ? CLEAR_MS : COLLAPSE_MS)) : 0;
    for (let y = HIDDEN; y < H; y++) {
      let offset = 0;
      if (cl && g.phase === 'collapsing') offset = (cl.rows.filter((r) => r > y).length || 0) * c * k;
      const clearing = clearedSet.has(y);
      if (clearing && g.phase === 'collapsing') continue;
      for (let x = 0; x < COLS; x++) {
        const v = board[y * COLS + x];
        if (v === 0) continue;
        if (clearing) block(cellX(x), cellY(y), c, pal.pieces[v], 1 - k * 0.7, 1 - k);
        else block(cellX(x), cellY(y) + offset, c, pal.pieces[v]);
      }
      if (clearing && g.phase === 'clearing') {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.fillRect(wellX, cellY(y), wellW, c);
        ctx.globalAlpha = 1;
      }
    }

    /* hard-drop trail */
    if (g.fx.trail) {
      const age = now - g.fx.trail.at;
      if (age > 160) g.fx.trail = null;
      else {
        const tr = g.fx.trail;
        ctx.fillStyle = pal.pieces[tr.color];
        ctx.globalAlpha = 0.28 * (1 - age / 160);
        for (const x of tr.cols) ctx.fillRect(cellX(x) + c * 0.2, cellY(tr.top), c * 0.6, (tr.bottom - tr.top + 1) * c);
        ctx.globalAlpha = 1;
      }
    }

    /* the falling piece and its ghost */
    if (g.piece && g.phase !== 'over') {
      const color = pal.pieces[PIECES.indexOf(g.piece.type) + 1];
      const d = dropDistance(g.board, g.piece);
      if (d > 0) for (const [x, y] of cells({ ...g.piece, y: g.piece.y + d })) if (y >= HIDDEN) ghostBlock(cellX(x), cellY(y), c, color);
      const grounded = d === 0;
      const squash = grounded ? 1 - 0.06 * Math.min(1, g.lockAcc / LOCK_MS) : 1;
      for (const [x, y] of cells(g.piece)) if (y >= HIDDEN) block(cellX(x), cellY(y), c, color, 1, squash);
    }
    if (g.piece && g.phase === 'over') {
      for (const [x, y] of cells(g.piece)) if (y >= HIDDEN) block(cellX(x), cellY(y), c, pal.bad, 0.9);
    }

    /* lock flash */
    if (g.fx.flash) {
      const age = now - g.fx.flash.at;
      if (age > 130) g.fx.flash = null;
      else {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.45 * (1 - age / 130);
        for (const [x, y] of g.fx.flash.cells) if (y >= HIDDEN) ctx.fillRect(cellX(x), cellY(y), c, c);
        ctx.globalAlpha = 1;
      }
    }

    /* points floating up from cleared rows */
    g.fx.floats = g.fx.floats.filter((f) => now - f.at < 800);
    for (const f of g.fx.floats) {
      const age = now - f.at;
      ctx.globalAlpha = 1 - Math.max(0, (age - 350) / 450);
      ctx.fillStyle = pal.text;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      ctx.font = `800 ${Math.max(13, c * 0.9)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fy = cellY(f.y) + c / 2 - (age / 800) * c * 1.6;
      ctx.strokeText(f.text, cellX(f.x), fy);
      ctx.fillText(f.text, cellX(f.x), fy);
      ctx.globalAlpha = 1;
    }

    /* game over: the well dims, the stack stays visible */
    if (g.phase === 'over' && over !== 'won' && g.fx.overAt > 0) {
      const kk = Math.min(1, (now - g.fx.overAt) / 400);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.globalAlpha = kk;
      ctx.fillRect(wellX, wellY, wellW, wellH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /* ---------- render ---------- */

  const progress = Math.min(1, hud.lines / tier.target);
  const press = (down: () => void, up: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      down();
    },
    onPointerUp: up,
    onPointerCancel: up,
    onLostPointerCapture: up,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault()
  });

  return (
    <div className={`bdrop ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{hud.score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Lines <b>{hud.lines}</b> / {tier.target}
        </span>
        <span className="info-item">
          Level <b>{hud.level}</b>
        </span>
      </div>
      <div className="bd-progress" role="progressbar" aria-valuenow={hud.lines} aria-valuemax={tier.target}>
        <i style={{ width: `${progress * 100}%` }} />
      </div>

      <div ref={stageRef} className={`bd-stage ${shake ? 'shake' : ''}`} onAnimationEnd={() => setShake(false)}>
        <canvas
          ref={canvasRef}
          className="bd-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Block Drop well"
        />
        {toast && (
          <span key={toast.n} className="bd-toast chip accent" onAnimationEnd={() => setToast(null)}>
            {toast.text}
          </span>
        )}
        {over === 'won' && <span className="bd-banner chip good">{tier.target} lines cleared!</span>}
      </div>

      <div className="game-tools fx-card">
        <div className="bd-pad">
          <PadTool className="bd-hold" silent disabled={!!over} aria-label="Move left" {...press(() => dasStart(-1), () => dasStop(-1))}>
            <span className="bd-rot-l">
              <DpadArrowIcon size={20} />
            </span>
            <span>Left</span>
          </PadTool>
          <PadTool className="bd-hold" silent disabled={!!over} aria-label="Soft drop" {...press(softStart, softStop)}>
            <span className="bd-rot-d">
              <DpadArrowIcon size={20} />
            </span>
            <span>Down</span>
          </PadTool>
          <PadTool className="bd-hold" silent disabled={!!over} aria-label="Move right" {...press(() => dasStart(1), () => dasStop(1))}>
            <span className="bd-rot-r">
              <DpadArrowIcon size={20} />
            </span>
            <span>Right</span>
          </PadTool>
          <PadTool silent onClick={() => turnPiece(1)} disabled={!!over} aria-label="Turn clockwise">
            <RotateCwIcon />
            <span>Turn</span>
          </PadTool>
        </div>
        <div className="bd-pad">
          <PadTool silent onClick={holdPiece} disabled={!!over} aria-label="Hold piece">
            <SaveIcon size={16} />
            <span>Hold</span>
          </PadTool>
          <PadTool silent onClick={() => turnPiece(-1)} disabled={!!over} aria-label="Turn counter-clockwise">
            <RotateCcwIcon />
            <span>Turn ↺</span>
          </PadTool>
          <PadTool silent onClick={hardDrop} disabled={!!over} aria-label="Hard drop">
            <HardDropIcon />
            <span>Drop</span>
          </PadTool>
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={!!over || !hud.canUndo || hud.undosLeft === 0} aria-label="Undo last piece">
              <UndoIcon size={16} />
              <span>Undo ({hud.undosLeft})</span>
            </PadTool>
          )}
        </div>
      </div>
    </div>
  );
}
