/**
 * Stockfish worker client — the one place the app talks to the engine.
 *
 * Stockfish is GPLv3 and stays a SEPARATE PROGRAM: the published
 * Stockfish.js file under public/stockfish/ is loaded, unmodified, as its
 * own Web Worker and spoken to over the UCI text protocol (one line per
 * message). Nothing of it is bundled, imported or linked — the same
 * arrangement lichess and chess.com use in the browser.
 *
 * The Stockfish.js file IS the worker script (it detects the worker
 * context, resolves its .wasm beside itself and posts every engine line
 * back as a string), so there is no wrapper worker: a wrapper would have to
 * importScripts() it, and the loader would then look for the .wasm next to
 * the WRAPPER. The URL goes through `import.meta.env.BASE_URL` because the
 * app is hosted under a subpath.
 *
 * What this module guarantees to the game:
 *  - lazy: nothing is fetched until the first `load()`/`search()`, so the
 *    7 MB engine costs nothing to the other games or to app start
 *  - never stuck: loading fails loudly after a silence (with the download
 *    progress the loader reports over a MessagePort shown meanwhile), and
 *    every `go` carries a movetime ceiling plus a watchdog that sends
 *    `stop` and, failing that, terminates the worker — the game then falls
 *    back to its built-in robot, never to a frozen "thinking…"
 *  - sequential: searches are chained, and a stopped search still waits for
 *    its `bestmove` before the next one starts, so a reply can never be
 *    attributed to the wrong position (pause/resume, undo, hint)
 *  - the worker is released with a grace period on unmount, so a restart
 *    or "play again" reuses the loaded engine while leaving another game
 *    frees its ~50 MB
 */
import { ENGINE_DIR, ENGINE_JS, foldScore, type Candidate, type SearchResult } from './difficulty';

export type EngineState =
  | { status: 'idle' }
  | { status: 'loading'; percent: number | null }
  | { status: 'ready' }
  | { status: 'failed'; reason: string };

export interface SearchSpec {
  fen: string;
  /** ms ceiling — always set (see difficulty.ts) */
  movetime: number;
  depth?: number;
  multipv: number;
  uciElo?: number;
}

export class EngineError extends Error {
  constructor(
    message: string,
    /** true when the search was stopped on purpose (pause, unmount, undo) */
    readonly cancelled = false
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/** silence this long while loading = the download or the compile is stuck */
const STALL_MS = 30000;
/** past `movetime` before the watchdog sends `stop` */
const GRACE_MS = 3000;
/** past `stop` before the worker is declared dead */
const HARD_MS = 3000;
/** a released worker survives this long — a restart reuses it, leaving frees it */
const IDLE_TERMINATE_MS = 20000;

type Listener = (state: EngineState) => void;

interface Pending {
  cancelled: boolean;
  reject: (e: Error) => void;
}

class StockfishClient {
  private worker: Worker | null = null;
  private state: EngineState = { status: 'idle' };
  private listeners = new Set<Listener>();
  private loading: Promise<void> | null = null;
  /** sink for engine lines during a search */
  private sink: ((line: string) => void) | null = null;
  /** the search chain — every search waits for the previous bestmove */
  private chain: Promise<unknown> = Promise.resolve();
  private pending: Pending | null = null;
  private refs = 0;
  private idleTimer: number | undefined;
  private freshGame = true;

  getState(): EngineState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private setState(next: EngineState) {
    this.state = next;
    this.listeners.forEach((fn) => fn(next));
  }

  /** a game is using the engine — cancels a scheduled shutdown */
  retain(): void {
    this.refs++;
    window.clearTimeout(this.idleTimer);
  }

  /** the game left; the worker is kept briefly for a quick "play again" */
  release(): void {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs === 0) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = window.setTimeout(() => this.terminate(), IDLE_TERMINATE_MS);
    }
  }

  /** the next search starts a new game (clears the engine's hash) */
  newGame(): void {
    this.freshGame = true;
  }

  /** after a failure: forget it and allow another attempt */
  reset(): void {
    this.terminate();
  }

  /** boot the worker and wait for `uciok`; shared by every caller */
  load(): Promise<void> {
    if (this.state.status === 'ready' && this.worker) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = this.boot().catch((e: unknown) => {
      const reason = e instanceof Error ? e.message : 'The engine failed to load';
      this.terminate(reason);
      throw e instanceof EngineError ? e : new EngineError(reason);
    });
    return this.loading;
  }

  private boot(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
        reject(new EngineError('This browser cannot run the engine'));
        return;
      }
      let worker: Worker;
      try {
        worker = new Worker(`${import.meta.env.BASE_URL}${ENGINE_DIR}${ENGINE_JS}`);
      } catch {
        reject(new EngineError('The engine could not be started'));
        return;
      }
      this.worker = worker;
      this.setState({ status: 'loading', percent: null });

      let booting = true;
      let stall = 0;
      const fail = (reason: string) => {
        if (!booting) return;
        booting = false;
        window.clearTimeout(stall);
        reject(new EngineError(reason));
      };
      const alive = () => {
        if (!booting) return;
        window.clearTimeout(stall);
        stall = window.setTimeout(() => fail('The engine took too long to load'), STALL_MS);
      };
      alive();

      worker.onerror = (ev) => {
        ev.preventDefault();
        // the raw browser message is for the console; the card stays readable
        if (ev.message) console.warn('chess engine:', ev.message);
        if (booting) fail('The engine failed to load');
        else this.terminate('The engine crashed');
      };

      // the loader reports the .wasm download over a port we hand it
      const channel = new MessageChannel();
      channel.port1.onmessage = (ev: MessageEvent<{ percent?: number }>) => {
        const percent = ev.data?.percent;
        if (typeof percent !== 'number' || !booting) return;
        alive();
        this.setState({ status: 'loading', percent: Math.max(0, Math.min(1, percent)) });
      };
      worker.postMessage({ progressPort: channel.port2 }, [channel.port2]);

      worker.onmessage = (ev: MessageEvent<unknown>) => {
        if (typeof ev.data !== 'string' || ev.data === '') return;
        const line = ev.data;
        if (booting) {
          alive();
          if (line === 'uciok') {
            booting = false;
            window.clearTimeout(stall);
            this.setState({ status: 'ready' });
            resolve();
          }
          return;
        }
        this.sink?.(line);
      };
      worker.postMessage('uci');
    });
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  /**
   * Ask for a position's `bestmove` and ranked lines. Resolves at `bestmove`;
   * rejects with a cancelled EngineError when `stop()` cut it short, and
   * with a plain one when the engine is unavailable (the caller falls back).
   * The caller decides which of the two it plays (`robotPick`): with the
   * strength limiter on, only `bestmove` carries the weakened choice.
   */
  search(spec: SearchSpec): Promise<SearchResult> {
    const run = () => this.load().then(() => this.runSearch(spec));
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => undefined);
    return result;
  }

  private runSearch(spec: SearchSpec): Promise<SearchResult> {
    return new Promise<SearchResult>((resolve, reject) => {
      if (!this.worker || this.state.status !== 'ready') {
        reject(new EngineError('The engine is not ready'));
        return;
      }
      const me: Pending = { cancelled: false, reject };
      this.pending = me;
      const byRank = new Map<number, Candidate>();
      let stopTimer = 0;
      let hardTimer = 0;
      const settle = () => {
        window.clearTimeout(stopTimer);
        window.clearTimeout(hardTimer);
        this.sink = null;
        if (this.pending === me) this.pending = null;
      };

      this.sink = (line) => {
        if (line.startsWith('info ')) {
          const parsed = parseInfo(line);
          if (parsed) byRank.set(parsed.rank, parsed.candidate);
          return;
        }
        if (!line.startsWith('bestmove')) return;
        settle();
        if (me.cancelled) {
          reject(new EngineError('The search was stopped', true));
          return;
        }
        const best = line.split(/\s+/)[1];
        if (!best || best === '(none)') {
          reject(new EngineError('The engine found no move'));
          return;
        }
        const lines = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c);
        if (lines.length === 0) lines.push({ move: best, score: 0 });
        resolve({ best, lines });
      };

      if (this.freshGame) {
        this.freshGame = false;
        this.send('ucinewgame');
      }
      this.send(`setoption name MultiPV value ${spec.multipv}`);
      this.send(`setoption name UCI_LimitStrength value ${spec.uciElo ? 'true' : 'false'}`);
      if (spec.uciElo) this.send(`setoption name UCI_Elo value ${spec.uciElo}`);
      this.send(`position fen ${spec.fen}`);
      this.send(`go movetime ${spec.movetime}${spec.depth ? ` depth ${spec.depth}` : ''}`);

      // the watchdog: a search may never outlive its ceiling by much
      stopTimer = window.setTimeout(() => this.send('stop'), spec.movetime + GRACE_MS);
      hardTimer = window.setTimeout(() => {
        settle();
        this.terminate('The engine stopped responding');
        reject(new EngineError('The engine stopped responding'));
      }, spec.movetime + GRACE_MS + HARD_MS);
    });
  }

  /** cut the running search short (pause, unmount, undo); the caller sees a cancelled rejection */
  stop(): void {
    if (this.pending && !this.pending.cancelled) {
      this.pending.cancelled = true;
      this.send('stop');
    }
  }

  private terminate(failure?: string): void {
    window.clearTimeout(this.idleTimer);
    const pending = this.pending;
    this.pending = null;
    this.sink = null;
    this.loading = null;
    this.freshGame = true;
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    pending?.reject(new EngineError(failure ?? 'The engine was shut down', !failure));
    this.setState(failure ? { status: 'failed', reason: failure } : { status: 'idle' });
  }
}

/** `info depth 12 seldepth 19 multipv 2 score cp -34 … pv e7e6 d2d4` */
function parseInfo(line: string): { rank: number; candidate: Candidate } | null {
  const pv = /\bpv (\S+)/.exec(line);
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
  if (!pv || !score) return null;
  // bound scores are aspiration-window noise; the exact line follows
  if (/\b(lowerbound|upperbound)\b/.test(line)) return null;
  const rank = Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1);
  return {
    rank,
    candidate: { move: pv[1], score: foldScore(score[1] as 'cp' | 'mate', Number(score[2])) }
  };
}

/** one engine for the whole app session — it is 7 MB and ~50 MB of heap */
export const stockfish = new StockfishClient();
