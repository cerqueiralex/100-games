import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { HASHI_CONFIG, generateHashi, type HashiPuzzle } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 3 * 60,
  medium: 5 * 60,
  hard: 8 * 60,
  pro: 11 * 60,
  extreme: 15 * 60
};
const ISLAND_PTS = 30;
const HINT_PENALTY = 40;
const ERROR_PENALTY = 15;

interface HshSave {
  puzzle: HashiPuzzle;
  bridges: number[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

export function HashiGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  // ignore saves that lack the expected shape
  const saved =
    savedState &&
    Array.isArray((savedState as HshSave).bridges) &&
    Array.isArray((savedState as HshSave).puzzle?.islands) &&
    Array.isArray((savedState as HshSave).puzzle?.links)
      ? (savedState as HshSave)
      : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateHashi(HASHI_CONFIG[difficulty]), [difficulty]);
  const { w, h, islands, links, solution, crossings } = puzzle;

  const [bridges, setBridges] = useState<number[]>(() =>
    saved && saved.bridges.length === puzzle.links.length ? [...saved.bridges] : puzzle.links.map(() => 0)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [blockedFlash, setBlockedFlash] = useState<number[]>([]);
  const [hintFlash, setHintFlash] = useState<number | null>(null);
  /** BFS depth per island once won — drives the connectivity ripple */
  const [winDepths, setWinDepths] = useState<number[] | null>(null);

  const done = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ island: number | null; x: number; y: number; consumed: boolean } | null>(null);
  /** which endpoint a bridge was drawn from — sets the draw-in origin */
  const srcRef = useRef<Record<number, 'a' | 'b'>>({});
  // synchronous mirrors so pointer handlers never read stale state
  const bridgesRef = useRef(bridges);
  const errorsRef = useRef(saved?.errors ?? 0);
  const hintsRef = useRef(saved?.hintsUsed ?? 0);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const satCheckOn = !!assists['sat-check'];
  const fullBlockOn = !!assists['full-block'];
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(satCheckOn ? ['sat-check'] : []),
      ...(fullBlockOn ? ['full-block'] : [])
    ])
  );
  // passive assists count as help whenever enabled, including mid-game
  useEffect(() => {
    if (satCheckOn) assistsUsed.current.add('sat-check');
  }, [satCheckOn]);
  useEffect(() => {
    if (fullBlockOn) assistsUsed.current.add('full-block');
  }, [fullBlockOn]);

  const commitBridges = (next: number[]) => {
    bridgesRef.current = next;
    setBridges(next);
  };

  const linksAt = useMemo(() => {
    const at: number[][] = islands.map(() => []);
    links.forEach((l, e) => {
      at[l.a].push(e);
      at[l.b].push(e);
    });
    return at;
  }, [islands, links]);

  const degreeOf = useCallback(
    (i: number, br: number[]) => linksAt[i].reduce((s, e) => s + br[e], 0),
    [linksAt]
  );

  const degrees = useMemo(() => islands.map((_, i) => degreeOf(i, bridges)), [islands, bridges, degreeOf]);
  const satCount = islands.filter((isl, i) => degrees[i] === isl.n).length;
  const totalBridges = bridges.reduce((s, v) => s + v, 0);
  const liveScore = Math.max(
    0,
    satCount * ISLAND_PTS * MULT[difficulty] - hintsUsed * HINT_PENALTY - errors * ERROR_PENALTY
  );

  /** for each island: the candidate link leaving it in each direction */
  const dirLink = useMemo(
    () =>
      islands.map((isl, i) => {
        const map: Record<'n' | 's' | 'e' | 'w', number> = { n: -1, s: -1, e: -1, w: -1 };
        for (const e of linksAt[i]) {
          const l = links[e];
          const o = islands[l.a === i ? l.b : l.a];
          if (o.r === isl.r) map[o.c > isl.c ? 'e' : 'w'] = e;
          else map[o.r > isl.r ? 's' : 'n'] = e;
        }
        return map;
      }),
    [islands, links, linksAt]
  );

  const reach = useMemo(() => {
    if (selected === null) return null;
    return new Set(linksAt[selected].map((e) => (links[e].a === selected ? links[e].b : links[e].a)));
  }, [selected, linksAt, links]);

  useEffect(() => {
    events.onStats({
      score: liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { islands: `${satCount}/${islands.length}`, bridges: totalBridges }
    });
  }, [liveScore, errors, hintsUsed, satCount, totalBridges, islands.length, events]);

  const finish = useCallback(
    (br: number[], hints: number, errs: number) => {
      if (done.current) return;
      done.current = true;
      const mult = MULT[difficulty];
      const score = Math.max(
        0,
        islands.length * ISLAND_PTS * mult -
          hints * HINT_PENALTY -
          errs * ERROR_PENALTY +
          Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult
      );
      // ripple order: BFS depth from the first island over the built network
      const depth = new Array<number>(islands.length).fill(0);
      const seen = new Uint8Array(islands.length);
      seen[0] = 1;
      const queue = [0];
      while (queue.length) {
        const i = queue.shift()!;
        for (const e of linksAt[i]) {
          if (br[e] < 1) continue;
          const j = links[e].a === i ? links[e].b : links[e].a;
          if (!seen[j]) {
            seen[j] = 1;
            depth[j] = depth[i] + 1;
            queue.push(j);
          }
        }
      }
      setWinDepths(depth);
      setSelected(null);
      events.onFinish({
        outcome: 'won',
        score,
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { islands: islands.length, bridges: br.reduce((s, v) => s + v, 0) }
      });
    },
    [difficulty, islands, links, linksAt, events]
  );

  const isWin = useCallback(
    (br: number[]): boolean => {
      if (islands.some((isl, i) => degreeOf(i, br) !== isl.n)) return false;
      const seen = new Uint8Array(islands.length);
      seen[0] = 1;
      let cnt = 1;
      const stack = [0];
      while (stack.length) {
        const i = stack.pop()!;
        for (const e of linksAt[i]) {
          if (br[e] < 1) continue;
          const j = links[e].a === i ? links[e].b : links[e].a;
          if (!seen[j]) {
            seen[j] = 1;
            cnt++;
            stack.push(j);
          }
        }
      }
      return cnt === islands.length;
    },
    [islands, links, linksAt, degreeOf]
  );

  const cycleLink = useCallback(
    (e: number, source: 'a' | 'b') => {
      if (paused || done.current) return;
      const br = bridgesRef.current;
      const cur = br[e];
      let next = (cur + 1) % 3;
      const l = links[e];

      // full-block assist: skip counts that would over-fill a satisfied island
      if (fullBlockOn) {
        const overfills = (v: number) =>
          v > cur &&
          (degreeOf(l.a, br) - cur + v > islands[l.a].n || degreeOf(l.b, br) - cur + v > islands[l.b].n);
        while (next !== 0 && overfills(next)) next = (next + 1) % 3;
        if (next === cur) {
          sfx.error();
          return;
        }
      }

      // bridges may never cross an existing bridge
      if (cur === 0 && next > 0) {
        const blockers = crossings[e].filter((f) => br[f] > 0);
        if (blockers.length) {
          setBlockedFlash(blockers);
          window.setTimeout(() => setBlockedFlash([]), 420);
          sfx.error();
          return;
        }
      }

      const arr = [...br];
      arr[e] = next;
      srcRef.current[e] = source;
      const overBefore =
        degreeOf(l.a, br) > islands[l.a].n || degreeOf(l.b, br) > islands[l.b].n;
      const overAfter =
        degreeOf(l.a, arr) > islands[l.a].n || degreeOf(l.b, arr) > islands[l.b].n;
      if (overAfter && !overBefore) {
        errorsRef.current += 1;
        setErrors(errorsRef.current);
        sfx.error();
      } else if (next === 1) {
        sfx.place();
      } else if (next === 2) {
        sfx.pop();
      } else {
        sfx.tap();
      }
      commitBridges(arr);
      if (isWin(arr)) finish(arr, hintsRef.current, errorsRef.current);
    },
    [paused, links, islands, crossings, fullBlockOn, degreeOf, isWin, finish]
  );

  /* ---------- pointer interaction: rect math, no elementFromPoint ---------- */

  const islandNear = useCallback(
    (x: number, y: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const cw = el.clientWidth / w;
      const ch = el.clientHeight / h;
      let best = -1;
      let bd = Infinity;
      islands.forEach((isl, i) => {
        const d = Math.hypot(x - (isl.c + 0.5) * cw, y - (isl.r + 0.5) * ch);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return bd <= Math.max(cw * 0.66, 24) ? best : null;
    },
    [islands, w, h]
  );

  const bridgeNear = useCallback(
    (x: number, y: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const cw = el.clientWidth / w;
      const ch = el.clientHeight / h;
      const thresh = Math.max(cw * 0.32, 12);
      let best = -1;
      let bd = Infinity;
      links.forEach((l, e) => {
        if (bridgesRef.current[e] < 1) return;
        const A = islands[l.a];
        const B = islands[l.b];
        if (A.r === B.r) {
          const x1 = (Math.min(A.c, B.c) + 0.5) * cw;
          const x2 = (Math.max(A.c, B.c) + 0.5) * cw;
          if (x < x1 || x > x2) return;
          const d = Math.abs(y - (A.r + 0.5) * ch);
          if (d < bd) {
            bd = d;
            best = e;
          }
        } else {
          const y1 = (Math.min(A.r, B.r) + 0.5) * ch;
          const y2 = (Math.max(A.r, B.r) + 0.5) * ch;
          if (y < y1 || y > y2) return;
          const d = Math.abs(x - (A.c + 0.5) * cw);
          if (d < bd) {
            bd = d;
            best = e;
          }
        }
      });
      return bd <= thresh ? best : null;
    },
    [islands, links, w, h]
  );

  const tapIsland = useCallback(
    (t: number) => {
      if (selected === null || selected === t) {
        setSelected(selected === t ? null : t);
        sfx.tap();
        return;
      }
      const link = linksAt[t].find((e) => links[e].a === selected || links[e].b === selected);
      if (link !== undefined) {
        cycleLink(link, links[link].a === selected ? 'a' : 'b');
        return;
      }
      setSelected(t);
      sfx.tap();
    },
    [selected, linksAt, links, cycleLink]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const el = boardRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    gesture.current = { island: islandNear(x, y), x, y, consumed: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.consumed || g.island === null || paused || done.current) return;
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left - g.x;
    const dy = e.clientY - rect.top - g.y;
    if (Math.hypot(dx, dy) < Math.max(18, (el.clientWidth / w) * 0.45)) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
    const link = dirLink[g.island][dir];
    if (link === -1) return; // no neighbour that way — the drag may still curve
    g.consumed = true;
    setSelected(g.island);
    cycleLink(link, links[link].a === g.island ? 'a' : 'b');
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.consumed || paused || done.current) return;
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (Math.hypot(x - g.x, y - g.y) > 14) return; // drag that resolved nowhere
    const t = islandNear(x, y);
    if (t !== null) {
      tapIsland(t);
      return;
    }
    const b = bridgeNear(x, y);
    if (b !== null) {
      cycleLink(b, 'a');
      return;
    }
    if (selected !== null) {
      setSelected(null);
      sfx.tap();
    }
  };

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    const br = bridgesRef.current;
    const wrongPlaced: number[] = [];
    const missing: number[] = [];
    links.forEach((_, e) => {
      if (br[e] === solution[e]) return;
      (br[e] > 0 ? wrongPlaced : missing).push(e);
    });
    const pool = wrongPlaced.length ? wrongPlaced : missing;
    if (!pool.length) return;
    const e = pool[Math.floor(Math.random() * pool.length)];
    const arr = [...br];
    arr[e] = solution[e];
    // anything crossing a true bridge is wrong by definition — clear it
    if (solution[e] > 0) for (const f of crossings[e]) if (arr[f] > 0) arr[f] = 0;
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    sfx.hint();
    srcRef.current[e] = 'a';
    setHintFlash(e);
    window.setTimeout(() => setHintFlash(null), 700);
    commitBridges(arr);
    if (isWin(arr)) finish(arr, hintsRef.current, errorsRef.current);
  }, [paused, assists.hint, links, solution, crossings, isWin, finish]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      bridges: bridgesRef.current,
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- render ---------- */

  const pct = (v: number, total: number) => `${((v + 0.5) / total) * 100}%`;

  const linkEls = links.map((l, e) => {
    const n = bridges[e];
    if (n < 1) return null;
    const A = islands[l.a];
    const B = islands[l.b];
    const horizontal = A.r === B.r;
    // draw-in grows away from the island the player dragged/tapped from
    const src = srcRef.current[e] ?? 'a';
    const srcIsl = src === 'a' ? A : B;
    const fromEnd = horizontal ? srcIsl.c === Math.min(A.c, B.c) : srcIsl.r === Math.min(A.r, B.r);
    const style: CSSProperties = horizontal
      ? {
          left: pct(Math.min(A.c, B.c), w),
          width: `${((Math.abs(A.c - B.c)) / w) * 100}%`,
          top: pct(A.r, h)
        }
      : {
          top: pct(Math.min(A.r, B.r), h),
          height: `${((Math.abs(A.r - B.r)) / h) * 100}%`,
          left: pct(A.c, w)
        };
    if (winDepths) {
      (style as Record<string, string>)['--hsh-delay'] = `${
        Math.min(winDepths[l.a], winDepths[l.b]) * 0.07
      }s`;
    }
    return (
      <div
        key={e}
        className={[
          'hsh-link',
          horizontal ? 'h' : 'v',
          fromEnd ? '' : 'src-b',
          blockedFlash.includes(e) ? 'blocked' : '',
          hintFlash === e ? 'hinted' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
      >
        {Array.from({ length: n }, (_, k) => (
          <span key={k} className="hsh-line" />
        ))}
      </div>
    );
  });

  const ghostEls =
    selected === null || winDepths
      ? null
      : linksAt[selected]
          .filter((e) => bridges[e] === 0)
          .map((e) => {
            const A = islands[links[e].a];
            const B = islands[links[e].b];
            const horizontal = A.r === B.r;
            const style: CSSProperties = horizontal
              ? {
                  left: pct(Math.min(A.c, B.c), w),
                  width: `${(Math.abs(A.c - B.c) / w) * 100}%`,
                  top: pct(A.r, h)
                }
              : {
                  top: pct(Math.min(A.r, B.r), h),
                  height: `${(Math.abs(A.r - B.r) / h) * 100}%`,
                  left: pct(A.c, w)
                };
            return <div key={`g${e}`} className={`hsh-ghost ${horizontal ? 'h' : 'v'}`} style={style} />;
          });

  return (
    <div className={`hashi ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Islands: <b>{satCount} / {islands.length}</b>
        </span>
        <span className="info-item">
          <b>{liveScore.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Bridges: <b>{totalBridges}</b>
        </span>
      </div>

      <div
        ref={boardRef}
        className={`hsh-board ${winDepths ? 'hsh-won' : ''}`}
        style={
          {
            '--hsh-w': w,
            '--hsh-h': h,
            aspectRatio: `${w} / ${h}`
          } as CSSProperties
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {ghostEls}
        {linkEls}
        {islands.map((isl, i) => {
          const over = degrees[i] > isl.n;
          const sat = degrees[i] === isl.n;
          return (
            <div
              key={i}
              className={[
                'hsh-isl',
                selected === i ? 'sel' : '',
                reach?.has(i) && selected !== i ? 'reach' : '',
                satCheckOn && !winDepths ? (over ? 'over' : sat ? 'sat' : '') : '',
                fullBlockOn && sat && !winDepths ? 'dimmed' : '',
                winDepths ? 'win-pulse' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: pct(isl.c, w),
                top: pct(isl.r, h),
                animationDelay: winDepths ? `${winDepths[i] * 0.07}s` : undefined
              }}
            >
              {isl.n}
            </div>
          );
        })}
      </div>

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          </div>
          <p className="hsh-help">
            Tap an island, then a neighbour — each tap cycles 1 → 2 → 0 bridges. Or drag from an
            island toward its neighbour. Tap a bridge to change it.
          </p>
        </div>
      )}
    </div>
  );
}
