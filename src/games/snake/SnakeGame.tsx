import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { DpadArrowIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
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
 * (requestAnimationFrame), which is what lets the snake glide between
 * cells instead of jumping: the rules tick at the tier's pace
 * (`step`), and the drawing interpolates every segment from where it was
 * to where it is by how far into the current tick we are. The board is
 * the "little world" style Nurikabe established — a grass plate with an
 * extruded bottom edge, a snake with a darker underside, an apple with a
 * leaf — painted in the app's content palette read from the CSS tokens,
 * so it follows the theme like every DOM board does.
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

interface Fx {
  /** ring + points burst where the apple was */
  eat: { at: number; cell: number; text: string } | null;
  died: number;
  tongueAt: number;
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
  grass: string;
  snake: string;
  apple: string;
  leaf: string;
  warn: string;
  bad: string;
  ink: string;
  edge: string;
  good: string;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string) => cs.getPropertyValue(n).trim();
  return {
    surface: get('--surface'),
    text: get('--text'),
    textDim: get('--text-dim'),
    grass: get('--play-1'),
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

export function SnakeGame({ difficulty, assists, paused, events, savedState, registerSnapshot }: GameProps) {
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
    fx: { eat: null, died: 0, tongueAt: 0 }
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
  const palette = useRef<Palette | null>(null);
  const timers = useRef<number[]>([]);
  const swipe = useRef<{ x: number; y: number; used: boolean } | null>(null);
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
    swipe.current = { x: e.clientX, y: e.clientY, used: false };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.used) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) return;
    s.used = true;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  };
  const onPointerUp = () => {
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

  const frame = (now: number) => {
    if (!running.current) return;
    const g = live.current;
    const dt = Math.min(250, now - (lastFrame.current || now));
    lastFrame.current = now;
    const tick = tickFor(tier, g.s.apples, !!assistsRef.current.slow);
    if (g.s.alive && !done.current) {
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
    raf.current = requestAnimationFrame(frame);
  };
  const stop = () => {
    running.current = false;
    cancelAnimationFrame(raf.current);
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

  /* canvas sizing (100% of the column, square) and theme colours */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const fit = () => {
      const w = stage.clientWidth;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      canvas.style.height = `${w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    palette.current = readPalette();
    const mo = new MutationObserver(() => {
      palette.current = readPalette();
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
    const size = tier.size;
    const EDGE = 4;
    const c = W / size;
    const H = W;
    const g = live.current;
    ctx.clearRect(0, 0, W, H);

    /* the grass plate, extruded: a rounded rect whose bottom band is the darker edge */
    const light = mix(pal.grass, pal.surface, 0.6);
    const dark = mix(pal.grass, pal.surface, 0.68);
    roundRect(ctx, 0, 0, W, H, 18);
    ctx.save();
    ctx.clip();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
        ctx.fillRect(x * c, y * c, c + 0.5, c + 0.5);
      }
    }
    ctx.fillStyle = pal.edge;
    ctx.fillRect(0, H - EDGE, W, EDGE);

    const t = g.s.alive ? Math.min(1, g.acc / tick) : 1;
    const center = (cell: number, from: number | undefined): [number, number] => {
      const cx = (cell % size + 0.5) * c;
      const cy = (Math.floor(cell / size) + 0.5) * c;
      if (from === undefined || from === cell) return [cx, cy];
      const fx = (from % size + 0.5) * c;
      const fy = (Math.floor(from / size) + 0.5) * c;
      // a wrap teleport is not a slide
      if (Math.abs(fx - cx) > 1.5 * c || Math.abs(fy - cy) > 1.5 * c) return [cx, cy];
      return [fx + (cx - fx) * t, fy + (cy - fy) * t];
    };

    /* the apple: red disc on a darker underside, a highlight, a leaf, bobbing */
    if (g.s.apple >= 0) {
      const [ax, ay0] = center(g.s.apple, undefined);
      const ay = ay0 + Math.sin(now / 260) * c * 0.05;
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

    /* the snake: one thick rounded polyline, drawn twice — a dark underside
       a few pixels low, then the body on top, so it stands on the grass */
    const pts: [number, number][] = g.s.body.map((cell, i) => center(cell, g.prev[i]));
    const lw = c * 0.78;
    const strokeBody = (color: string, dy: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let open = false;
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        const prev = pts[i - 1];
        const jump = prev && (Math.abs(prev[0] - x) > 1.5 * c || Math.abs(prev[1] - y) > 1.5 * c);
        if (!open || jump) {
          if (open) ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y + dy);
          open = true;
        } else ctx.lineTo(x, y + dy);
      }
      if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1] + dy);
      ctx.stroke();
    };
    const dying = g.fx.died > 0;
    const bodyColor = dying ? mix(pal.snake, pal.bad, 0.55) : pal.snake;
    strokeBody('rgba(0,0,0,0.28)', c * 0.12);
    strokeBody(bodyColor, 0);
    // a thin lighter spine gives the body its round, glossy look
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = lw * 0.32;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const prev = pts[i - 1];
      if (i === 0 || (prev && (Math.abs(prev[0] - x) > 1.5 * c || Math.abs(prev[1] - y) > 1.5 * c))) ctx.moveTo(x, y - lw * 0.18);
      else ctx.lineTo(x, y - lw * 0.18);
    });
    ctx.stroke();

    /* the head: eyes looking where it goes, and a tongue now and then */
    const [hx, hy] = pts[0];
    const d = g.s.dir;
    const dx = DX[d];
    const dy = DY[d];
    const px = -dy; // perpendicular
    const py = dx;
    const eyeR = c * 0.11;
    for (const side of [-1, 1]) {
      const ex = hx + px * side * c * 0.19 + dx * c * 0.08;
      const ey = hy + py * side * c * 0.19 + dy * c * 0.08;
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
        const bx = hx + dx * lw * 0.5;
        const by = hy + dy * lw * 0.5;
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
      if (age > 700) g.fx.eat = null;
      else {
        const [ex, ey] = center(g.fx.eat.cell, undefined);
        const k = Math.min(1, age / 320);
        ctx.strokeStyle = pal.warn;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = Math.max(1.5, c * 0.08);
        ctx.beginPath();
        ctx.arc(ex, ey, c * (0.3 + k * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1 - Math.max(0, (age - 250) / 450);
        ctx.fillStyle = pal.text;
        ctx.font = `800 ${Math.max(12, c * 0.7)}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        const ty = ey - c * 0.5 - (age / 700) * c * 1.2;
        ctx.strokeText(g.fx.eat.text, ex, ty);
        ctx.fillText(g.fx.eat.text, ex, ty);
        ctx.globalAlpha = 1;
      }
    }

    /* the crash: a red flash that fades */
    if (dying) {
      const k = Math.min(1, (now - g.fx.died) / 500);
      ctx.fillStyle = pal.bad;
      ctx.globalAlpha = 0.32 * (1 - k);
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /* ---------- render ---------- */

  const speed = tier.tickMs / tickFor(tier, hud.apples, !!assists.slow);
  const progress = Math.min(1, hud.apples / tier.target);

  return (
    <div className={`snake ${paused ? 'board-hidden' : ''}`}>
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
          onPointerCancel={onPointerUp}
          aria-label="Snake board"
        />
        {!tipSeen && !over && (
          <span className="snk-tip chip">Swipe, tap the D-pad or use the arrow keys</span>
        )}
        {over === 'won' && <span className="snk-banner chip good">Full belly — {tier.target} apples!</span>}
      </div>

      <div className="game-tools fx-card">
        <div className="snk-dpad" role="group" aria-label="Steer">
          <PadTool className="snk-dbtn up" silent onClick={() => turn(0)} disabled={!!over} aria-label="Up">
            <DpadArrowIcon />
          </PadTool>
          <PadTool className="snk-dbtn left" silent onClick={() => turn(3)} disabled={!!over} aria-label="Left">
            <DpadArrowIcon />
          </PadTool>
          <span className="snk-dhub" aria-hidden />
          <PadTool className="snk-dbtn right" silent onClick={() => turn(1)} disabled={!!over} aria-label="Right">
            <DpadArrowIcon />
          </PadTool>
          <PadTool className="snk-dbtn down" silent onClick={() => turn(2)} disabled={!!over} aria-label="Down">
            <DpadArrowIcon />
          </PadTool>
        </div>
      </div>
    </div>
  );
}
