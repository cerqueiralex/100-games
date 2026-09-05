import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { DpadArrowIcon } from '../../platform/design/icons';
import {
  APPLE_POINTS,
  COMBO_WINDOW_MS,
  DX,
  DY,
  initialState,
  isReverse,
  MULT,
  step,
  tickFor,
  TIERS,
  type Dir,
  type SnakeState
} from './logic/engine';

/*
 * Snake on a canvas — the whole board is ONE <canvas> drawn every frame
 * (requestAnimationFrame): the rules tick at the tier's pace (`step`) and
 * the drawing glides between ticks by how far into the current tick we
 * are.
 *
 * The snake is BLOCKY: a union of rounded rectangles, one per pair of
 * neighbouring cells, so it only ever turns at right angles — a polyline
 * through the cell centres cut every corner diagonally mid-slide and read
 * as a bent hose. Gliding is the head growing into its next cell and the
 * tail shrinking out of its last one, everything between standing still,
 * so the body never drifts off the grid. With Wall wrap on, a piece
 * crossing an edge is drawn on both sides and the grass clip trims each.
 *
 * The board is the Nurikabe island: saturated grass on a dirt side, in
 * fixed content colours (`--snk-*` on `.snake`, read from the stage) with
 * the extruded 2.5D look of every other block in the app.
 *
 * A 3-2-1 countdown holds the snake — and the shell's clock — at the start
 * and after every pause, and a tap on the board (or Space / P) pauses in
 * place: a reflex game cannot ask the player to look away to the header.
 * The shell keeps the board in view under a translucent veil meanwhile
 * (GameDefinition.pauseStyle), so the player sees what they are resuming.
 *
 * All live state lives in refs (the loop mutates it 60× a second); React
 * state only carries what the HUD prints. Pause, the hidden tab and
 * unmount stop the loop; resume restarts it from the same position.
 */

interface SnakeSave {
  state: SnakeState;
  score: number;
  bestCombo: number;
  turns: number;
  assistsUsed: string[];
}

const WIN_BONUS = 100;
/** the death is shown (shake, flash) before the results arrive */
const DEATH_DELAY_MS = 750;
const QUEUE_MAX = 3;
const SWIPE_PX = 18;
/** a press that travels less than this is a tap — the pause — not a swipe */
const TAP_PX = 10;
/** the ready countdown before the snake moves — at the start and after every pause */
export const COUNTDOWN_MS = 3000;
const GO_MS = 550;
/** the dirt side under the grass plate, CSS px — the Nurikabe island's */
const SIDE_PX = 7;

interface Fx {
  /** ring + points burst where the apple was */
  eat: { at: number; cell: number; text: string } | null;
  died: number;
  tongueAt: number;
  /** when the running countdown ends (rAF clock); 0 = none running */
  countdownEnd: number;
  /** the digit last announced, so each one sounds once */
  countdownDigit: number;
  /** when the last countdown ended — the GO! flash */
  goAt: number;
}

interface Live {
  s: SnakeState;
  /** the body before the last step — what the drawing interpolates from */
  prev: number[];
  queue: Dir[];
  /** ms into the current tick */
  acc: number;
  score: number;
  combo: number;
  bestCombo: number;
  lastEatAt: number;
  turns: number;
  fx: Fx;
}

interface Palette {
  surface: string;
  text: string;
  textDim: string;
  grass0: string;
  grass1: string;
  dirt: string;
  dirtDeep: string;
  rim: string;
  snake: string;
  apple: string;
  leaf: string;
  warn: string;
  bad: string;
  ink: string;
  edge: string;
  good: string;
}

/** tokens read from the STAGE, so the `--snk-*` island colours on `.snake` resolve too */
function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const get = (n: string) => cs.getPropertyValue(n).trim();
  return {
    surface: get('--surface'),
    text: get('--text'),
    textDim: get('--text-dim'),
    grass0: get('--snk-grass-0'),
    grass1: get('--snk-grass-1'),
    dirt: get('--snk-dirt'),
    dirtDeep: get('--snk-dirt-deep'),
    rim: get('--snk-rim'),
    snake: get('--play-4'),
    apple: get('--play-2'),
    leaf: get('--play-13'),
    warn: get('--warn'),
    bad: get('--bad'),
    ink: get('--ink'),
    edge: get('--edge'),
    good: get('--good')
  };
}

/** `#rrggbb` × `#rrggbb` → the colour `t` of the way from a to b */
function mix(a: string, b: string, t: number): string {
  const pa = /^#([0-9a-f]{6})$/i.exec(a);
  const pb = /^#([0-9a-f]{6})$/i.exec(b);
  if (!pa || !pb) return a;
  const ca = parseInt(pa[1], 16);
  const cb = parseInt(pb[1], 16);
  const ch = (shift: number) => {
    const va = (ca >> shift) & 255;
    const vb = (cb >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** the same rounded rect as ONE more subpath of a Path2D — every subpath
    runs the same way round, so a nonzero fill of the path is their union */
function rrPath(p: Path2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.arcTo(x + w, y, x + w, y + h, rr);
  p.arcTo(x + w, y + h, x, y + h, rr);
  p.arcTo(x, y + h, x, y, rr);
  p.arcTo(x, y, x + w, y, rr);
  p.closePath();
}

/** floating points and the GO!: heavy white type with a dark outline, so it
    reads on the grass in every theme (the plain ink text vanished on it) */
function popText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number) {
  ctx.font = `900 ${px}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, px * 0.24);
  ctx.strokeStyle = 'rgba(24, 18, 12, 0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

const easeOut = (k: number) => 1 - (1 - k) * (1 - k);

export function SnakeGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot,
  holdClock,
  requestPause
}: GameProps) {
  const tier = TIERS[difficulty];
  const mult = MULT[difficulty];
  const saved =
    savedState &&
    Array.isArray((savedState as SnakeSave).state?.body) &&
    (savedState as SnakeSave).state.size === tier.size
      ? (savedState as SnakeSave)
      : undefined;

  const live = useRef<Live>({
    s: saved ? { ...saved.state, alive: true } : initialState(tier.size),
    prev: [],
    queue: [],
    acc: 0,
    score: saved?.score ?? 0,
    combo: 0,
    bestCombo: saved?.bestCombo ?? 0,
    lastEatAt: 0,
    turns: saved?.turns ?? 0,
    fx: { eat: null, died: 0, tongueAt: 0, countdownEnd: 0, countdownDigit: 0, goAt: 0 }
  });
  if (live.current.prev.length === 0) live.current.prev = live.current.s.body.slice();

  const [hud, setHud] = useState(() => ({
    apples: live.current.s.apples,
    score: live.current.score,
    length: live.current.s.body.length
  }));
  const [shake, setShake] = useState(false);
  const [tipSeen, setTipSeen] = useState((saved?.turns ?? 0) > 0);
  const [over, setOver] = useState<'won' | 'lost' | null>(null);

  const done = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const running = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const requestPauseRef = useRef(requestPause);
  requestPauseRef.current = requestPause;
  const holdRef = useRef(holdClock);
  holdRef.current = holdClock;
  const palette = useRef<Palette | null>(null);
  const timers = useRef<number[]>([]);
  const swipe = useRef<{ x: number; y: number; used: boolean; moved: boolean } | null>(null);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.slow ? ['slow'] : []),
      ...(assists.wrap ? ['wrap'] : [])
    ])
  );
  const assistsRef = useRef(assists);
  assistsRef.current = assists;

  // passive assists count as help whenever they are on, mid-game included
  useEffect(() => {
    if (assists.slow) assistsUsed.current.add('slow');
    if (assists.wrap) assistsUsed.current.add('wrap');
  }, [assists.slow, assists.wrap]);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* ---------- stats & snapshot ---------- */

  useEffect(() => {
    events.onStats({
      score: hud.score,
      errors: 0,
      hintsUsed: 0,
      assistsUsed: [...assistsUsed.current],
      extra: { apples: hud.apples, target: tier.target, length: hud.length, bestCombo: live.current.bestCombo }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud]);

  useEffect(() => {
    registerSnapshot(() => ({
      state: live.current.s,
      score: live.current.score,
      bestCombo: live.current.bestCombo,
      turns: live.current.turns,
      assistsUsed: [...assistsUsed.current]
    }));
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
      hintsUsed: 0,
      assistsUsed: [...assistsUsed.current],
      extra: { apples: g.s.apples, target: tier.target, length: g.s.body.length, bestCombo: g.bestCombo }
    });
  };

  /* ---------- input ---------- */

  /** turns are accepted during the countdown too — the first tick plays them */
  const turn = (d: Dir) => {
    const g = live.current;
    if (done.current || pausedRef.current || !g.s.alive) return;
    const last = g.queue.length > 0 ? g.queue[g.queue.length - 1] : g.s.dir;
    if (d === last || isReverse(last, d) || g.queue.length >= QUEUE_MAX) return;
    g.queue.push(d);
    g.turns++;
    sfx.tick();
    setTipSeen(true);
  };

  const togglePause = () => {
    if (done.current || !live.current.s.alive) return;
    sfx.tap();
    requestPauseRef.current(!pausedRef.current);
  };

  useEffect(() => {
    const keys: Record<string, Dir> = {
      ArrowUp: 0,
      ArrowRight: 1,
      ArrowDown: 2,
      ArrowLeft: 3,
      w: 0,
      d: 1,
      s: 2,
      a: 3,
      W: 0,
      D: 1,
      S: 2,
      A: 3
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!e.repeat) togglePause();
        return;
      }
      const d = keys[e.key];
      if (d === undefined) return;
      e.preventDefault();
      turn(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    swipe.current = { x: e.clientX, y: e.clientY, used: false, moved: false };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.used) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= TAP_PX || Math.abs(dy) >= TAP_PX) s.moved = true;
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return;
    s.used = true;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  };
  /** a press that never became a swipe is a tap on the board: the pause */
  const onPointerUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.used || s.moved) return;
    if (!pausedRef.current) togglePause();
  };
  const onPointerCancel = () => {
    swipe.current = null;
  };

  /* ---------- the tick ---------- */

  const doStep = (now: number) => {
    const g = live.current;
    let d = g.s.dir;
    while (g.queue.length > 0) {
      const q = g.queue.shift() as Dir;
      if (q !== g.s.dir && !isReverse(g.s.dir, q)) {
        d = q;
        break;
      }
    }
    const eatenCell = g.s.apple;
    g.prev = g.s.body;
    const r = step(g.s, d, !!assistsRef.current.wrap);
    g.s = r.state;
    if (r.died) {
      g.fx.died = now;
      g.queue = [];
      sfx.lose();
      setShake(true);
      schedule(() => finish('lost'), DEATH_DELAY_MS);
      return;
    }
    if (r.ate) {
      g.combo = now - g.lastEatAt <= COMBO_WINDOW_MS ? g.combo + 1 : 1;
      g.lastEatAt = now;
      g.bestCombo = Math.max(g.bestCombo, g.combo);
      const pts = APPLE_POINTS * mult + Math.max(0, g.combo - 1) * 2 * mult;
      g.score += pts;
      g.fx.eat = { at: now, cell: eatenCell, text: `+${pts}${g.combo > 1 ? ` ×${g.combo}` : ''}` };
      sfx.crunch();
      const won = g.s.apples >= tier.target;
      if (won) g.score += WIN_BONUS * mult;
      setHud({ apples: g.s.apples, score: g.score, length: g.s.body.length });
      if (won) finish('won');
    }
  };

  /* ---------- the loop ---------- */

  /** 3-2-1 before the snake moves; the shell's clock waits with it */
  const beginCountdown = () => {
    const g = live.current;
    if (done.current || !g.s.alive) return;
    g.fx.countdownEnd = performance.now() + COUNTDOWN_MS;
    g.fx.countdownDigit = 0;
    g.fx.goAt = 0;
    holdRef.current(true);
  };

  const frame = (now: number) => {
    if (!running.current) return;
    const g = live.current;
    const dt = Math.min(250, now - (lastFrame.current || now));
    lastFrame.current = now;
    const tick = tickFor(tier, g.s.apples, !!assistsRef.current.slow);
    if (g.fx.countdownEnd > 0) {
      const left = g.fx.countdownEnd - now;
      if (left <= 0) {
        g.fx.countdownEnd = 0;
        g.fx.goAt = now;
        holdRef.current(false);
        sfx.pop();
      } else {
        const digit = Math.ceil(left / 1000);
        if (digit !== g.fx.countdownDigit) {
          g.fx.countdownDigit = digit;
          sfx.tap();
        }
      }
    }
    if (g.s.alive && !done.current && g.fx.countdownEnd === 0) {
      g.acc += dt;
      let guard = 0;
      while (g.acc >= tick && g.s.alive && !done.current && guard++ < 4) {
        g.acc -= tick;
        doStep(now);
      }
    }
    draw(now, tick);
    raf.current = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running.current) return;
    running.current = true;
    lastFrame.current = 0;
    beginCountdown();
    raf.current = requestAnimationFrame(frame);
  };
  const stop = () => {
    running.current = false;
    cancelAnimationFrame(raf.current);
  };

  useEffect(() => {
    const sync = () => {
      if (paused || document.hidden) {
        stop();
        // the frozen frame under the veil shows the board, not a stale GO!
        live.current.fx.goAt = 0;
        draw(performance.now(), tickFor(tier, live.current.s.apples, !!assistsRef.current.slow));
      } else start();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      stop();
      // a countdown interrupted by a pause or an exit must not leave the shell's clock held
      if (live.current.fx.countdownEnd > 0) holdRef.current(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  /* canvas sizing (100% of the column, square grass plus the dirt side) and colours */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const fit = () => {
      const w = stage.clientWidth;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round((w + SIDE_PX) * dpr);
      canvas.style.height = `${w + SIDE_PX}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    palette.current = readPalette(stage);
    const mo = new MutationObserver(() => {
      palette.current = readPalette(stage);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-profile-color'] });
    // draw once even before the loop runs (a paused resume shows the board)
    draw(performance.now(), tickFor(tier, live.current.s.apples, !!assists.slow));
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- drawing ---------- */

  const draw = (now: number, tick: number) => {
    const canvas = canvasRef.current;
    const pal = palette.current;
    if (!canvas || !pal) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const size = tier.size;
    const c = W / size;
    const R = 18;
    const g = live.current;
    ctx.clearRect(0, 0, W, H);

    /* the island: a grass checker on top of a dirt side, one rounded plate */
    ctx.save();
    roundRect(ctx, 0, 0, W, H, R);
    ctx.clip();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? pal.grass0 : pal.grass1;
        ctx.fillRect(x * c, y * c, c + 0.5, c + 0.5);
      }
    }
    ctx.fillStyle = pal.dirt;
    ctx.fillRect(0, W, W, H - W);
    ctx.fillStyle = pal.dirtDeep;
    ctx.fillRect(0, H - 2.5, W, 2.5);
    ctx.fillStyle = pal.rim;
    ctx.fillRect(0, W - 1, W, 1.5);
    ctx.restore();

    /* everything that lives on the grass is clipped to it: a piece sliding
       through a wrapped edge is drawn on both sides and the clip trims each */
    ctx.save();
    roundRect(ctx, 0, 0, W, H, R);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(0, 0, W, W);
    ctx.clip();

    const cx = (cell: number) => ((cell % size) + 0.5) * c;
    const cy = (cell: number) => (Math.floor(cell / size) + 0.5) * c;
    const t = g.s.alive ? Math.min(1, g.acc / tick) : 1;

    /* the apple: red disc on a darker underside, a highlight, a leaf, bobbing */
    if (g.s.apple >= 0) {
      const ax = cx(g.s.apple);
      const ay = cy(g.s.apple) + Math.sin(now / 260) * c * 0.05;
      const r = c * 0.34;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(ax, ay + c * 0.1, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.apple;
      ctx.beginPath();
      ctx.arc(ax, ay, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(ax - r * 0.35, ay - r * 0.38, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = Math.max(1.2, c * 0.06);
      ctx.beginPath();
      ctx.moveTo(ax, ay - r * 0.85);
      ctx.lineTo(ax + r * 0.12, ay - r * 1.25);
      ctx.stroke();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath();
      ctx.ellipse(ax + r * 0.42, ay - r * 1.1, r * 0.42, r * 0.2, -0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    /* the snake: one Path2D union of rounded rectangles, one per pair of
       neighbouring cells, so every turn is a right angle. The head's piece
       runs from the neck to wherever the head is on its slide; the tail's
       from wherever the tail is to the cell it is shrinking into. */
    const body = g.s.body;
    const prev = g.prev;
    const n = body.length;
    const w = c * 0.8;
    const hw = w / 2;
    const rad = w * 0.34;
    const lift = c * 0.12;
    /** direction from cell a to its neighbour b, seeing through a wrap */
    const dirTo = (a: number, b: number): [number, number] => {
      let dx = (b % size) - (a % size);
      let dy = Math.floor(b / size) - Math.floor(a / size);
      if (Math.abs(dx) > 1) dx = -Math.sign(dx);
      if (Math.abs(dy) > 1) dy = -Math.sign(dy);
      return [dx, dy];
    };
    const moved = prev.length === n && prev[0] !== body[0];
    const grew = prev.length === n - 1;
    const shape = new Path2D();
    const gloss = new Path2D();
    /** a rounded rect, plus its copy across any board edge it crosses */
    const place = (p: Path2D, x: number, y: number, pw: number, ph: number, r: number) => {
      rrPath(p, x, y, pw, ph, r);
      if (x < 0) rrPath(p, x + W, y, pw, ph, r);
      if (x + pw > W) rrPath(p, x - W, y, pw, ph, r);
      if (y < 0) rrPath(p, x, y + W, pw, ph, r);
      if (y + ph > W) rrPath(p, x, y - W, pw, ph, r);
    };
    /** the piece from one centre to another (orthogonal), block-wide */
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const x = Math.min(x0, x1);
      const y = Math.min(y0, y1);
      const dw = Math.abs(x1 - x0);
      const dh = Math.abs(y1 - y0);
      place(shape, x - hw, y - hw, dw + w, dh + w, rad);
      const gw = hw * 0.42;
      const up = w * 0.14;
      place(gloss, x - gw, y - gw - up, dw + gw * 2, dh + gw * 2, gw);
    };
    // the head, unwrapped from the neck it grows out of
    let hx = cx(body[0]);
    let hy = cy(body[0]);
    if (n >= 2) {
      const neck = body[1];
      const [dx, dy] = dirTo(neck, body[0]);
      const k = moved || grew ? t : 1;
      hx = cx(neck) + dx * k * c;
      hy = cy(neck) + dy * k * c;
      seg(cx(neck), cy(neck), hx, hy);
      for (let i = 1; i < n - 1; i++) {
        const [dx2, dy2] = dirTo(body[i], body[i + 1]);
        seg(cx(body[i]), cy(body[i]), cx(body[i]) + dx2 * c, cy(body[i]) + dy2 * c);
      }
      if (moved) {
        // the tail shrinks out of the cell it just left into the new last cell
        const gone = prev[n - 1];
        const [tdx, tdy] = dirTo(gone, body[n - 1]);
        seg(cx(gone) + tdx * t * c, cy(gone) + tdy * t * c, cx(gone) + tdx * c, cy(gone) + tdy * c);
      }
    } else seg(hx, hy, hx, hy);

    const dying = g.fx.died > 0;
    const bodyColor = dying ? mix(pal.snake, pal.bad, 0.55) : pal.snake;
    ctx.save();
    ctx.translate(0, lift);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill(shape);
    ctx.restore();
    ctx.fillStyle = bodyColor;
    ctx.fill(shape);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill(gloss);

    /* the head: eyes looking where it goes, and a tongue now and then —
       drawn where the head IS, which through a wrap is the other side */
    if (hx < 0) hx += W;
    else if (hx > W) hx -= W;
    if (hy < 0) hy += W;
    else if (hy > W) hy -= W;
    const d = g.s.dir;
    const dx = DX[d];
    const dy = DY[d];
    const px = -dy; // perpendicular
    const py = dx;
    const eyeR = c * 0.11;
    for (const side of [-1, 1]) {
      const ex = hx + px * side * c * 0.19 + dx * c * 0.1;
      const ey = hy + py * side * c * 0.19 + dy * c * 0.1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      if (dying) {
        ctx.lineWidth = Math.max(1, c * 0.05);
        ctx.strokeStyle = pal.ink;
        ctx.moveTo(ex - eyeR * 0.6, ey - eyeR * 0.6);
        ctx.lineTo(ex + eyeR * 0.6, ey + eyeR * 0.6);
        ctx.moveTo(ex + eyeR * 0.6, ey - eyeR * 0.6);
        ctx.lineTo(ex - eyeR * 0.6, ey + eyeR * 0.6);
        ctx.stroke();
      } else {
        ctx.arc(ex + dx * eyeR * 0.4, ey + dy * eyeR * 0.4, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!dying && g.s.alive) {
      if (now - g.fx.tongueAt > 2400 + (g.s.body.length % 5) * 300) g.fx.tongueAt = now;
      const tt = now - g.fx.tongueAt;
      if (tt < 220) {
        const out = Math.sin((tt / 220) * Math.PI) * c * 0.42;
        const bx = hx + dx * hw;
        const by = hy + dy * hw;
        ctx.strokeStyle = pal.apple;
        ctx.lineWidth = Math.max(1.4, c * 0.07);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + dx * out, by + dy * out);
        ctx.lineTo(bx + dx * (out + c * 0.12) + px * c * 0.08, by + dy * (out + c * 0.12) + py * c * 0.08);
        ctx.moveTo(bx + dx * out, by + dy * out);
        ctx.lineTo(bx + dx * (out + c * 0.12) - px * c * 0.08, by + dy * (out + c * 0.12) - py * c * 0.08);
        ctx.stroke();
      }
    }

    /* eat burst: an expanding ring and the points floating up */
    if (g.fx.eat) {
      const age = now - g.fx.eat.at;
      if (age > 900) g.fx.eat = null;
      else {
        const ex = cx(g.fx.eat.cell);
        const ey = cy(g.fx.eat.cell);
        const k = Math.min(1, age / 320);
        ctx.strokeStyle = pal.warn;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = Math.max(1.5, c * 0.08);
        ctx.beginPath();
        ctx.arc(ex, ey, c * (0.3 + k * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1 - Math.max(0, (age - 450) / 450);
        const ty = ey - c * 0.5 - (age / 900) * c * 1.4;
        popText(ctx, g.fx.eat.text, ex, ty, Math.max(15, c * 0.82));
        ctx.globalAlpha = 1;
      }
    }

    /* the crash: a red flash that fades */
    if (dying) {
      const k = Math.min(1, (now - g.fx.died) / 500);
      ctx.fillStyle = pal.bad;
      ctx.globalAlpha = 0.32 * (1 - k);
      ctx.fillRect(0, 0, W, W);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* the countdown: a card in the middle of the board (surface face on an
       extruded edge, like every card), the digit popping in, a ring
       draining through the three seconds */
    if (g.fx.countdownEnd > 0 && g.s.alive && !done.current) {
      const left = Math.max(0, g.fx.countdownEnd - now);
      const digit = Math.max(1, Math.ceil(left / 1000));
      const age = 1 - ((left / 1000) % 1);
      const pw = Math.min(W * 0.4, 168);
      // in the quarter of the board farthest from the snake and the apple —
      // the player must see the snake to be ready for it
      const things = [...body.map((cell) => [cx(cell), cy(cell)]), ...(g.s.apple >= 0 ? [[cx(g.s.apple), cy(g.s.apple)]] : [])];
      let mx = W / 2;
      let my = W / 2;
      let bestGap = -1;
      for (const qy of [0.25, 0.75]) {
        for (const qx of [0.25, 0.75]) {
          const gap = Math.min(...things.map(([tx, ty]) => Math.max(Math.abs(tx - qx * W), Math.abs(ty - qy * W))));
          if (gap > bestGap) {
            bestGap = gap;
            mx = qx * W;
            my = qy * W;
          }
        }
      }
      const x = mx - pw / 2;
      const y = my - pw / 2;
      const cr = pw * 0.17;
      const edge = Math.max(4, pw * 0.03);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = pal.edge;
      roundRect(ctx, x, y, pw, pw, cr);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = pal.surface;
      roundRect(ctx, x, y, pw, pw - edge, cr);
      ctx.fill();
      ctx.fillStyle = pal.textDim;
      ctx.font = `800 ${Math.max(10, pw * 0.085)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GET READY', mx, y + pw * 0.17);
      const rr = pw * 0.27;
      const ry = my + pw * 0.07;
      ctx.lineWidth = Math.max(4, pw * 0.05);
      ctx.lineCap = 'round';
      ctx.strokeStyle = pal.edge;
      ctx.beginPath();
      ctx.arc(mx, ry, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = pal.good;
      ctx.beginPath();
      ctx.arc(mx, ry, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (left / COUNTDOWN_MS));
      ctx.stroke();
      const pop = 1 + 0.35 * (1 - easeOut(Math.min(1, age / 0.3)));
      ctx.fillStyle = pal.text;
      ctx.font = `900 ${pw * 0.34 * pop}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(String(digit), mx, ry + pw * 0.01);
    }
    if (g.fx.goAt > 0 && now - g.fx.goAt < GO_MS && !dying) {
      const k = (now - g.fx.goAt) / GO_MS;
      ctx.globalAlpha = 1 - k * k;
      popText(ctx, 'GO!', W / 2, W / 2, W * 0.16 * (1 + 0.5 * k));
      ctx.globalAlpha = 1;
    }
  };

  /* ---------- render ---------- */

  const speed = tier.tickMs / tickFor(tier, hud.apples, !!assists.slow);
  const progress = Math.min(1, hud.apples / tier.target);

  return (
    <div className="snake">
      <div className="sudoku-info">
        <span className="info-item">
          Apples <b>{hud.apples}</b> / {tier.target}
        </span>
        <span className="info-item">
          <b>{hud.score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Speed <b>×{speed.toFixed(2)}</b>
        </span>
      </div>
      <div className="snk-progress" role="progressbar" aria-valuenow={hud.apples} aria-valuemax={tier.target}>
        <i style={{ width: `${progress * 100}%` }} />
      </div>

      <div ref={stageRef} className={`snk-stage ${shake ? 'shake' : ''}`} onAnimationEnd={() => setShake(false)}>
        <canvas
          ref={canvasRef}
          className="snk-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          aria-label="Snake board — tap to pause"
        />
        {!tipSeen && !over && <span className="snk-tip chip">Swipe to steer · tap the board to pause</span>}
        {over === 'won' && <span className="snk-banner chip good">Full belly — {tier.target} apples!</span>}
      </div>

      {/* the D-pad: the Maze's segmented unit — tall left/right, up and down
          stacked between them — because it is two rows tall, not three, and
          on a phone the board needs that height more than the pad does */}
      <div className="game-tools fx-card">
        <div className="snk-dpad" role="group" aria-label="Steer">
          <button className="snk-dbtn left" onClick={() => turn(3)} disabled={!!over} aria-label="Left">
            <DpadArrowIcon />
          </button>
          <div className="snk-dpad-mid">
            <button className="snk-dbtn up" onClick={() => turn(0)} disabled={!!over} aria-label="Up">
              <DpadArrowIcon />
            </button>
            <button className="snk-dbtn down" onClick={() => turn(2)} disabled={!!over} aria-label="Down">
              <DpadArrowIcon />
            </button>
          </div>
          <button className="snk-dbtn right" onClick={() => turn(1)} disabled={!!over} aria-label="Right">
            <DpadArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
