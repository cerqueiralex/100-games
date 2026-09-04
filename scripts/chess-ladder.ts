/**
 * Chess ladder calibration — the offline tool that keeps the five robot
 * tiers HONEST. It drives the real modules (`difficulty.ts`, `engine.ts`,
 * `ai.ts`) and the real shipped Stockfish build (as a UCI child process,
 * exactly the conversation `engineClient.ts` has with the worker), because
 * a robot's strength is behaviour, and only games measure behaviour — the
 * UI regression once saw "pro answers" and passed while pro was playing at
 * extreme's strength.
 *
 *   npx tsx scripts/chess-ladder.ts probes [trials]     tactical probes per tier
 *   npx tsx scripts/chess-ladder.ts match A B [games]   a match, colours alternate
 *   npx tsx scripts/chess-ladder.ts ladder [games]      the standard battery
 *
 * Players: easy|medium|hard|pro|extreme (the app's tiers, through the same
 * `robotPick`/`rollsBlunder`/`lotteryMove` path as ChessGame), refNNNN
 * (Stockfish's own `UCI_Elo NNNN` at 300 ms — the reference yardstick, floor
 * 1320) and bi-<tier> (the built-in negamax fallback). `PLAN_<tier>='{json}'`
 * in the environment overrides that tier's plan for a run, which is how a
 * candidate is measured before it is written into `TIERS`.
 *
 * What "calibrated" meant when the ladder shipped (2026-09-04, 6–8 games
 * per pairing): every tier beats the one below by ≥ 5/6; medium scores
 * 0/6 against ref1320 while checkmating easy 6/6; hard takes 2/8 from
 * ref1320, 6/6 from medium and ≤ 2/6 from pro; pro splits with ref1600;
 * extreme beats ref2000 and pro 4/4. The old built-in negamax (`bi-extreme`)
 * lost 3½–½ to easy before its root window was fixed. Re-run `ladder` after
 * touching TIERS and expect that shape — the reference is Stockfish's
 * limiter, itself approximate, so read the ORDER and the gaps, not the
 * third decimal.
 */
import { spawn } from 'node:child_process';
import {
  foldScore,
  lotteryMove,
  robotPick,
  rollsBlunder,
  TIER_ORDER,
  TIERS,
  type Candidate,
  type TierPlan
} from '../src/games/chess/logic/difficulty';
import {
  applyMove,
  B,
  fromFen,
  initialPosition,
  moveFromUci,
  N,
  P,
  posKey,
  Q,
  R,
  statusOf,
  toFen,
  uciOf,
  type Move,
  type Position
} from '../src/games/chess/logic/engine';
import { chooseMove } from '../src/games/chess/logic/ai';
import type { Difficulty } from '../src/platform/types';

declare const process: { argv: string[]; env: Record<string, string | undefined>; execPath: string; exit(code?: number): never };

const ENGINE = new URL('../public/stockfish/stockfish-18-lite-single.js', import.meta.url).pathname;

interface Child {
  stdout: { on(ev: 'data', fn: (chunk: { toString(): string }) => void): void };
  stdin: { write(s: string): void };
}

/** the client's UCI conversation, line for line, over a child process */
class Engine {
  private child: Child;
  private buf = '';
  private sink: ((line: string) => void) | null = null;
  private waiters: { re: RegExp; res: (line: string) => void }[] = [];

  constructor() {
    this.child = spawn(process.execPath, [ENGINE], { stdio: ['pipe', 'pipe', 'ignore'] }) as Child;
    this.child.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i: number;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        for (const w of [...this.waiters]) {
          if (w.re.test(line)) {
            this.waiters.splice(this.waiters.indexOf(w), 1);
            w.res(line);
          }
        }
        this.sink?.(line);
      }
    });
  }
  send(s: string) {
    this.child.stdin.write(s + '\n');
  }
  until(re: RegExp) {
    return new Promise<string>((res) => this.waiters.push({ re, res }));
  }
  async init() {
    this.send('uci');
    await this.until(/^uciok/);
    this.send('isready');
    await this.until(/^readyok/);
  }
  newGame() {
    this.send('ucinewgame');
  }
  search(spec: { fen: string; movetime: number; depth?: number; multipv: number; uciElo?: number }) {
    return new Promise<{ best: string; lines: Candidate[] }>((resolve) => {
      const byRank = new Map<number, Candidate>();
      this.sink = (line) => {
        if (line.startsWith('info ')) {
          const pv = /\bpv (\S+)/.exec(line);
          const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
          if (!pv || !score || /\b(lowerbound|upperbound)\b/.test(line)) return;
          const rank = Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1);
          byRank.set(rank, { move: pv[1], score: foldScore(score[1] as 'cp' | 'mate', Number(score[2])) });
          return;
        }
        if (!line.startsWith('bestmove')) return;
        this.sink = null;
        const best = line.split(/\s+/)[1];
        const lines = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
        if (lines.length === 0) lines.push({ move: best, score: 0 });
        resolve({ best, lines });
      };
      this.send(`setoption name MultiPV value ${spec.multipv}`);
      this.send(`setoption name UCI_LimitStrength value ${spec.uciElo ? 'true' : 'false'}`);
      if (spec.uciElo) this.send(`setoption name UCI_Elo value ${spec.uciElo}`);
      this.send(`position fen ${spec.fen}`);
      this.send(`go movetime ${spec.movetime}${spec.depth ? ` depth ${spec.depth}` : ''}`);
    });
  }
  quit() {
    this.send('quit');
  }
}

type Player = (pos: Position) => Promise<Move | null>;

function planOf(tier: Difficulty): TierPlan {
  const override = process.env['PLAN_' + tier];
  return override ? { ...TIERS[tier], ...(JSON.parse(override) as Partial<TierPlan>) } : TIERS[tier];
}

/** a tier exactly as ChessGame plays it */
function tierPlayer(eng: Engine, tier: Difficulty): Player {
  const plan = planOf(tier);
  return async (pos) => {
    if (plan.brain === 'lottery' || rollsBlunder(plan)) return lotteryMove(pos);
    const result = await eng.search({
      fen: toFen(pos),
      movetime: plan.movetime,
      depth: plan.depth,
      multipv: plan.multipv,
      uciElo: plan.uciElo
    });
    const uci = robotPick(result, plan);
    return (uci ? moveFromUci(pos, uci) : null) ?? chooseMove(pos, tier);
  };
}
function refPlayer(eng: Engine, elo: number, movetime = 300): Player {
  return async (pos) => moveFromUci(pos, (await eng.search({ fen: toFen(pos), movetime, multipv: 1, uciElo: elo })).best);
}
function player(eng: Engine, name: string): Player {
  if ((TIER_ORDER as string[]).includes(name)) return tierPlayer(eng, name as Difficulty);
  if (/^ref\d{4}$/.test(name)) return refPlayer(eng, Number(name.slice(3)));
  if (name.startsWith('bi-')) return async (pos) => chooseMove(pos, name.slice(3) as Difficulty);
  throw new Error(`unknown player "${name}" — a tier, refNNNN or bi-<tier>`);
}

const VAL: Record<number, number> = { [P]: 1, [N]: 3, [B]: 3, [R]: 5, [Q]: 9 };
function material(pos: Position): number {
  let s = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue;
    const p = pos.board[sq];
    if (p) s += (p > 0 ? 1 : -1) * (VAL[Math.abs(p)] ?? 0);
  }
  return s;
}

/** one game; the result from White's view (1 / ½ / 0), adjudicated on material at the ply cap */
async function playGame(white: Player, black: Player, maxPlies = 160) {
  let pos = initialPosition();
  const keys = new Map<string, number>([[posKey(pos), 1]]);
  for (let ply = 0; ply < maxPlies; ply++) {
    const st = statusOf(pos, keys);
    if (st !== 'playing') return { result: st === 'checkmate' ? (pos.turn === 'w' ? 0 : 1) : 0.5, plies: ply, end: st };
    const move = await (pos.turn === 'w' ? white : black)(pos);
    if (!move) return { result: 0.5, plies: ply, end: 'no move' };
    pos = applyMove(pos, move);
    const k = posKey(pos);
    keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  const m = material(pos);
  return { result: m > 3 ? 1 : m < -3 ? 0 : 0.5, plies: maxPlies, end: `adjudicated on material ${m > 0 ? '+' : ''}${m}` };
}

async function match(eng: Engine, a: string, b: string, games: number) {
  const pa = player(eng, a);
  const pb = player(eng, b);
  let score = 0;
  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    eng.newGame();
    const aWhite = g % 2 === 0;
    const r = await playGame(aWhite ? pa : pb, aWhite ? pb : pa);
    const forA = aWhite ? r.result : 1 - r.result;
    score += forA;
    console.log(`  ${a} as ${aWhite ? 'White' : 'Black'}: ${forA} after ${r.plies} plies (${r.end})`);
  }
  console.log(`MATCH ${a} vs ${b}: ${score}/${games} for ${a}  (${Math.round((Date.now() - t0) / 1000)} s)`);
  return score;
}

const PROBES = [
  { name: 'mate in one (Qh4#)', fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2', want: 'd8h4' },
  { name: 'back-rank mate (Rd1#)', fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', want: 'd8d1' },
  { name: 'free queen (gxh5)', fen: 'rnbqkbnr/pppppp1p/6p1/7Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', want: 'g6h5' }
];

const eng = new Engine();
await eng.init();
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'probes') {
  const trials = Number(rest[0] ?? 8);
  for (const tier of TIER_ORDER) {
    const play = tierPlayer(eng, tier);
    const cells: string[] = [];
    for (const pr of PROBES) {
      const pos = fromFen(pr.fen);
      let hit = 0;
      for (let i = 0; i < trials; i++) {
        eng.newGame();
        const m = await play(pos);
        if (m && uciOf(m) === pr.want) hit++;
      }
      cells.push(`${pr.name} ${hit}/${trials}`);
    }
    console.log(`${tier.padEnd(8)} ${cells.join(' | ')}`);
  }
} else if (cmd === 'match') {
  const [a, b, n] = rest;
  if (!a || !b) throw new Error('match A B [games]');
  await match(eng, a, b, Number(n ?? 6));
} else if (cmd === 'ladder') {
  const n = Number(rest[0] ?? 6);
  for (const [a, b] of [
    ['medium', 'easy'],
    ['hard', 'medium'],
    ['pro', 'hard'],
    ['extreme', 'pro'],
    ['medium', 'ref1320'],
    ['hard', 'ref1320'],
    ['pro', 'ref1600'],
    ['extreme', 'ref2000']
  ]) {
    console.log(`=== ${a} vs ${b}`);
    await match(eng, a, b, n);
  }
} else {
  console.log('usage: chess-ladder.ts probes [trials] | match A B [games] | ladder [games]');
}
eng.quit();
setTimeout(() => process.exit(0), 200);
