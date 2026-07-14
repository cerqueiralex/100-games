import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { generateWordSearch, type WordSearchPuzzle } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 2 * 60,
  medium: 3 * 60,
  hard: 5 * 60,
  pro: 6 * 60,
  extreme: 8 * 60
};
const HINT_PENALTY = 40;
const STREAK_BONUS = 15;
const WIN_BONUS = 100;

/** A straight run of cells, endpoint to endpoint. */
interface Capsule {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

interface FoundEntry extends Capsule {
  word: string;
}

interface Flash extends Capsule {
  key: number;
}

/** Live selection: anchor + snapped direction + steps. */
interface Sel {
  r: number;
  c: number;
  dr: number;
  dc: number;
  k: number;
}

interface WsrSave {
  puzzle: WordSearchPuzzle;
  found: FoundEntry[];
  score: number;
  errors: number;
  hintsUsed: number;
  streak: number;
  assistsUsed: string[];
}

const RAYS_ORTHO: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0]
];
const RAYS_ALL: [number, number][] = [
  ...RAYS_ORTHO,
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
];

const reverse = (w: string): string => [...w].reverse().join('');

/** Rounded-capsule geometry over the board, in % of the (square) wrap. */
function capsuleStyle(cap: Capsule, size: number): CSSProperties {
  const p = 100 / size;
  const capH = p * 0.72;
  const dc = cap.c2 - cap.c1;
  const dr = cap.r2 - cap.r1;
  const len = Math.hypot(dc, dr) * p + capH;
  const angle = (Math.atan2(dr, dc) * 180) / Math.PI;
  return {
    left: `${(cap.c1 + 0.5) * p - capH / 2}%`,
    top: `${(cap.r1 + 0.5) * p - capH / 2}%`,
    width: `${len}%`,
    height: `${capH}%`,
    transform: `rotate(${angle}deg)`,
    transformOrigin: `${(capH / 2 / len) * 100}% 50%`
  };
}

function capCells(cap: Capsule, size: number): number[] {
  const steps = Math.max(Math.abs(cap.r2 - cap.r1), Math.abs(cap.c2 - cap.c1));
  const dr = Math.sign(cap.r2 - cap.r1);
  const dc = Math.sign(cap.c2 - cap.c1);
  const cells: number[] = [];
  for (let i = 0; i <= steps; i++) cells.push((cap.r1 + dr * i) * size + (cap.c1 + dc * i));
  return cells;
}

function isSave(s: unknown): s is WsrSave {
  const v = s as WsrSave;
  return (
    !!v &&
    Array.isArray(v.found) &&
    Array.isArray(v.puzzle?.grid) &&
    Array.isArray(v.puzzle?.words) &&
    typeof v.puzzle?.size === 'number'
  );
}

/** Tiny monochrome arrow, rotated per direction (for the assist strip). */
function DirArrow({ dr, dc }: { dr: number; dc: number }) {
  const angle = (Math.atan2(dr, dc) * 180) / Math.PI;
  return (
    <span className="wsr-dir" aria-hidden>
      <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: `rotate(${angle}deg)` }}>
        <path
          d="M4 12h14m0 0l-5-5m5 5l-5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function WordSearchGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = isSave(savedState) ? savedState : undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => saved?.puzzle ?? generateWordSearch({ difficulty }), [difficulty]);
  const size = puzzle.size;
  const mult = MULT[difficulty];
  const rays = difficulty === 'easy' ? RAYS_ORTHO : RAYS_ALL;

  const [found, setFound] = useState<FoundEntry[]>(() => saved?.found.map((f) => ({ ...f })) ?? []);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [sel, setSel] = useState<Sel | null>(null);
  const [wrong, setWrong] = useState<Flash | null>(null);
  const [hintFlash, setHintFlash] = useState<Flash | null>(null);
  const [won, setWon] = useState(false);

  // synchronous mirrors so pointer handlers never race batched state
  const foundRef = useRef(found);
  const scoreRef = useRef(score);
  const errorsRef = useRef(errors);
  const hintsRef = useRef(hintsUsed);
  const streakRef = useRef(streak);
  const selRef = useRef<Sel | null>(null);
  const anchorRef = useRef<{ r: number; c: number } | null>(null);
  const done = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wrongTimer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // passive assists count as help whenever enabled, incl. mid-game toggles
  useEffect(() => {
    if (assists.firstLetter) assistsUsed.current.add('firstLetter');
  }, [assists.firstLetter]);
  useEffect(() => {
    if (assists.directionLock) assistsUsed.current.add('directionLock');
  }, [assists.directionLock]);

  useEffect(
    () => () => {
      if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    },
    []
  );

  const wordColor = useMemo(() => {
    const map = new Map<string, number>();
    puzzle.words.forEach((w, i) => map.set(w.word, i % 8));
    return map;
  }, [puzzle]);

  const foundSet = useMemo(() => new Set(found.map((f) => f.word)), [found]);

  const foundCells = useMemo(() => {
    const set = new Set<number>();
    found.forEach((f) => capCells(f, size).forEach((i) => set.add(i)));
    return set;
  }, [found, size]);

  /** first-letter assist: cell index -> color of a remaining word starting there */
  const firstLetters = useMemo(() => {
    if (!assists.firstLetter) return null;
    const map = new Map<number, number>();
    for (const w of puzzle.words) {
      if (foundSet.has(w.word)) continue;
      map.set(w.row * size + w.col, wordColor.get(w.word) ?? 0);
    }
    return map;
  }, [assists.firstLetter, puzzle, foundSet, size, wordColor]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        theme: puzzle.theme,
        found: `${found.length}/${puzzle.words.length}`,
        streak
      }
    });
  }, [
    score,
    errors,
    hintsUsed,
    found.length,
    streak,
    assists.firstLetter,
    assists.directionLock,
    puzzle,
    events
  ]);

  const triggerWin = (foundList: FoundEntry[]) => {
    if (done.current) return;
    done.current = true;
    setWon(true);
    const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * mult;
    const final = Math.max(0, scoreRef.current + WIN_BONUS * mult + timeBonus);
    scoreRef.current = final;
    setScore(final);
    // let the capsules shimmer once in sequence before the results modal
    const delay = Math.min(2200, 600 + foundList.length * 90);
    finishTimer.current = window.setTimeout(() => {
      events.onFinish({
        outcome: 'won',
        score: final,
        errors: errorsRef.current,
        hintsUsed: hintsRef.current,
        assistsUsed: [...assistsUsed.current],
        extra: { theme: puzzle.theme, words: foundList.length }
      });
    }, delay);
  };

  const cellAt = (clientX: number, clientY: number): { r: number; c: number } | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const c = Math.floor(((clientX - rect.left) / rect.width) * size);
    const r = Math.floor(((clientY - rect.top) / rect.height) * size);
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    return { r, c };
  };

  const commitSel = (next: Sel | null) => {
    selRef.current = next;
    setSel(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    wrapRef.current?.setPointerCapture(e.pointerId);
    anchorRef.current = cell;
    commitSel({ r: cell.r, c: cell.c, dr: 0, dc: 0, k: 0 });
    sfx.tap();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const a = anchorRef.current;
    const el = wrapRef.current;
    if (!a || !el) return;
    const rect = el.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * size;
    const fy = ((e.clientY - rect.top) / rect.height) * size;
    const dx = fx - (a.c + 0.5);
    const dy = fy - (a.r + 0.5);
    let next: Sel = { r: a.r, c: a.c, dr: 0, dc: 0, k: 0 };
    if (Math.hypot(dx, dy) >= 0.42) {
      // snap the ray to the nearest allowed direction (largest unit projection)
      let dr = 0;
      let dc = 1;
      let step = 1;
      let best = -Infinity;
      for (const [rr, cc] of rays) {
        const s = Math.hypot(rr, cc);
        const proj = (dx * cc + dy * rr) / s;
        if (proj > best) {
          best = proj;
          dr = rr;
          dc = cc;
          step = s;
        }
      }
      let k = Math.max(0, Math.round(best / step));
      // clamp to the board
      while (
        k > 0 &&
        (a.r + dr * k < 0 || a.r + dr * k >= size || a.c + dc * k < 0 || a.c + dc * k >= size)
      ) {
        k--;
      }
      next = { r: a.r, c: a.c, dr, dc, k };
    }
    const prev = selRef.current;
    if (!prev || prev.k !== next.k || prev.dr !== next.dr || prev.dc !== next.dc) {
      if (next.k > (prev?.k ?? 0)) sfx.drag();
      commitSel(next);
    }
  };

  const endPointer = () => {
    const a = anchorRef.current;
    const s = selRef.current;
    anchorRef.current = null;
    commitSel(null);
    if (!a || !s || paused || done.current) return;
    if (s.k < 1) return; // a plain tap is never an error
    const cap: Capsule = {
      r1: s.r,
      c1: s.c,
      r2: s.r + s.dr * s.k,
      c2: s.c + s.dc * s.k
    };
    const str = capCells(cap, size)
      .map((i) => puzzle.grid[i])
      .join('');
    const rev = reverse(str);
    const hit = puzzle.words.find((w) => w.word === str || w.word === rev);
    if (hit && !foundRef.current.some((f) => f.word === hit.word)) {
      const entry: FoundEntry = { word: hit.word, ...cap };
      const nextFound = [...foundRef.current, entry];
      foundRef.current = nextFound;
      setFound(nextFound);
      streakRef.current += 1;
      setStreak(streakRef.current);
      const gained =
        (20 + 6 * hit.word.length) * mult + (streakRef.current >= 2 ? STREAK_BONUS * mult : 0);
      scoreRef.current += gained;
      setScore(scoreRef.current);
      sfx.pop();
      if (nextFound.length === puzzle.words.length) triggerWin(nextFound);
    } else if (hit) {
      sfx.tap(); // already marked — neutral
    } else {
      errorsRef.current += 1;
      setErrors(errorsRef.current);
      streakRef.current = 0;
      setStreak(0);
      sfx.error();
      setWrong({ ...cap, key: Date.now() });
      if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrong(null), 650);
    }
  };

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const remaining = puzzle.words.filter((w) => !foundRef.current.some((f) => f.word === w.word));
    if (remaining.length === 0) return;
    const w = remaining[Math.floor(Math.random() * remaining.length)];
    assistsUsed.current.add('hint');
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    scoreRef.current = Math.max(0, scoreRef.current - HINT_PENALTY);
    setScore(scoreRef.current);
    sfx.hint();
    setHintFlash({
      r1: w.row,
      c1: w.col,
      r2: w.row + w.dr * (w.word.length - 1),
      c2: w.col + w.dc * (w.word.length - 1),
      key: Date.now()
    });
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHintFlash(null), 1300);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      found,
      score,
      errors,
      hintsUsed,
      streak,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const selCap: Capsule | null = sel
    ? { r1: sel.r, c1: sel.c, r2: sel.r + sel.dr * sel.k, c2: sel.c + sel.dc * sel.k }
    : null;

  return (
    <div className={`wordsearch ${paused ? 'board-hidden' : ''} ${won ? 'win' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Found:{' '}
          <b>
            {found.length} / {puzzle.words.length}
          </b>
        </span>
        <span className="info-item">
          Theme: <b>{puzzle.theme}</b>
        </span>
        {streak >= 2 && (
          <span className="info-item">
            Streak: <b>×{streak}</b>
          </span>
        )}
      </div>

      <div className="wsr-words fx-card">
        {assists.directionLock && (
          <div className="wsr-dirs" aria-label="Directions words can run">
            {puzzle.placeDirs.map(([dr, dc]) => (
              <DirArrow key={`${dr},${dc}`} dr={dr} dc={dc} />
            ))}
          </div>
        )}
        <div className="wsr-chiprow">
          {puzzle.words.map((w) => {
            const isFound = foundSet.has(w.word);
            const mystery = difficulty === 'extreme' && !isFound;
            return (
              <span
                key={w.word}
                className={`wsr-chip ${isFound ? 'found' : ''} ${mystery ? 'mystery' : ''}`}
              >
                <span className={`wsr-dot k${wordColor.get(w.word)} ${isFound ? '' : 'off'}`} />
                {mystery ? '·'.repeat(w.word.length) : w.word}
              </span>
            );
          })}
        </div>
      </div>

      <div className="wsr-board">
        <div
          ref={wrapRef}
          className="wsr-wrap"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <div className="wsr-overlay" aria-hidden>
            {found.map((f, i) => (
              <span
                key={f.word}
                className={`wsr-cap lock k${wordColor.get(f.word)}`}
                style={{ ...capsuleStyle(f, size), '--i': i } as CSSProperties}
              />
            ))}
            {hintFlash && (
              <span
                key={hintFlash.key}
                className="wsr-cap hintflash"
                style={capsuleStyle(hintFlash, size)}
              />
            )}
            {wrong && (
              <span key={wrong.key} className="wsr-cap bad" style={capsuleStyle(wrong, size)} />
            )}
            {selCap && <span className="wsr-cap live" style={capsuleStyle(selCap, size)} />}
          </div>
          <div
            className="wsr-grid"
            style={{
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              fontSize: `${(52 / size).toFixed(2)}cqw`
            }}
          >
            {puzzle.grid.map((letter, i) => {
              const fl = firstLetters?.get(i);
              return (
                <span
                  key={i}
                  className={`wsr-cell ${foundCells.has(i) ? 'hit' : ''} ${
                    fl !== undefined ? `wsr-first k${fl}` : ''
                  }`}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={useHint} disabled={won}>
              <BulbIcon />
              <span>Flash a word</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
