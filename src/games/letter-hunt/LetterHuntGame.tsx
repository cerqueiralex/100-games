import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  generateHuntBoard,
  wordPoints,
  tileLabel,
  isHuntWord,
  type HuntBoard
} from './logic';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BONUS = 100; // × difficulty multiplier, awarded once the target is met
const HINT_PENALTY = 40; // subtracted from the final score per hint used
/** circular hit zone as a fraction of tile width — <0.5 so diagonals never misfire */
const HIT_FRAC = 0.4;

interface HuntSave {
  board: HuntBoard;
  found: string[];
  errors: number;
  hintsUsed: number;
  lastFindElapsed: number;
  assistsUsed: string[];
}

type FlashKind = 'good' | 'bad' | 'dup';
interface Flash {
  kind: FlashKind;
  path: number[];
  word: string;
  key: number;
}
interface Pop {
  id: number;
  text: string;
  left: number;
  top: number;
}

function isSave(s: unknown): s is HuntSave {
  const v = s as HuntSave;
  return (
    !!v &&
    Array.isArray(v.found) &&
    Array.isArray(v.board?.tiles) &&
    Array.isArray(v.board?.solutions) &&
    typeof v.board?.size === 'number'
  );
}

export function LetterHuntGame({
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
  const board = useMemo(() => saved?.board ?? generateHuntBoard({ difficulty }), [difficulty]);
  const { size, tiles, minLen, timeSec, target } = board;
  const mult = MULT[difficulty];

  const [found, setFound] = useState<Set<string>>(() => new Set(saved?.found ?? []));
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [path, setPath] = useState<number[]>([]);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [pulseTile, setPulseTile] = useState<number | null>(null);
  const [ghost, setGhost] = useState<number[] | null>(null);

  // ── synchronous mirrors for pointer/timer handlers ──
  const pathRef = useRef(path);
  const foundRef = useRef(found);
  const rawScoreRef = useRef(0);
  const errorsRef = useRef(errors);
  const hintsRef = useRef(hintsUsed);
  const done = useRef(false);
  const dragging = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const lastFindRef = useRef(saved?.lastFindElapsed ?? 0);
  const flashTimer = useRef<number | null>(null);
  const ghostTimer = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const popId = useRef(0);

  // raw (pre-multiplier) points of everything found so far
  const rawScore = useMemo(() => {
    let s = 0;
    for (const w of found) s += wordPoints(w.length);
    return s;
  }, [found]);
  const reached = rawScore >= target;
  const displayScore = rawScore * mult;

  // keep mirrors current every render so the timer's finish reads live values
  pathRef.current = path;
  foundRef.current = found;
  rawScoreRef.current = rawScore;
  errorsRef.current = errors;
  hintsRef.current = hintsUsed;

  const remaining = Math.max(0, timeSec - elapsedSec);

  // passive assists count as help whenever enabled (incl. mid-game toggle-on)
  useEffect(() => {
    if (assists.wordCount) assistsUsed.current.add('wordCount');
  }, [assists.wordCount]);
  useEffect(() => {
    if (assists.minFlash) assistsUsed.current.add('minFlash');
  }, [assists.minFlash]);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    },
    []
  );

  const finishGame = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const won = rawScoreRef.current >= target;
    const bonus = won ? WIN_BONUS * mult : 0;
    const final = Math.max(0, rawScoreRef.current * mult + bonus - hintsRef.current * HINT_PENALTY);
    events.onFinish({
      outcome: won ? 'won' : 'lost',
      score: final,
      errors: errorsRef.current,
      hintsUsed: hintsRef.current,
      assistsUsed: [...assistsUsed.current],
      extra: { wordsFound: foundRef.current.size, wordsAvailable: board.availableWords }
    });
  }, [target, mult, events, board.availableWords]);

  const pulseFindable = useCallback(() => {
    // min-flash assist: pulse the first tile of some not-yet-found word
    const next = board.solutions.find((s) => !foundRef.current.has(s.word));
    if (!next) return;
    setPulseTile(next.path[0]);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulseTile(null), 1100);
  }, [board.solutions]);

  // the round clock: elapsedSec only advances while playing & unpaused, so the
  // countdown, ticking and min-flash all key off it directly
  useEffect(() => {
    if (done.current) return;
    if (elapsedSec >= timeSec) {
      finishGame();
      return;
    }
    const rem = timeSec - elapsedSec;
    if (rem <= 5 && rem > 0) sfx.tap(); // final-seconds tick
    if (assists.minFlash && !paused && elapsedSec - lastFindRef.current >= 20) {
      pulseFindable();
      lastFindRef.current = elapsedSec;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec]);

  useEffect(() => {
    events.onStats({
      score: displayScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        wordsFound: found.size,
        wordsAvailable: board.availableWords,
        target: target * mult
      }
    });
  }, [displayScore, errors, hintsUsed, found, board.availableWords, target, mult, events]);

  /* ─────────── pointer drag with circular hit-testing ─────────── */

  const hitCell = (clientX: number, clientY: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const padL = parseFloat(style.paddingLeft);
    const padT = parseFloat(style.paddingTop);
    const padR = parseFloat(style.paddingRight);
    const gap = parseFloat(style.columnGap) || 0;
    const inner = el.clientWidth - padL - padR;
    const pitch = (inner + gap) / size;
    const tileW = pitch - gap;
    const localX = clientX - (rect.left + el.clientLeft + padL);
    const localY = clientY - (rect.top + el.clientTop + padT);
    const c = Math.floor(localX / pitch);
    const r = Math.floor(localY / pitch);
    if (c < 0 || c >= size || r < 0 || r >= size) return null;
    // commit only within a circle around the tile centre so diagonal drags
    // through the 4-corner junction never grab the wrong tile
    const cx = c * pitch + tileW / 2;
    const cy = r * pitch + tileW / 2;
    if (Math.hypot(localX - cx, localY - cy) > tileW * HIT_FRAC) return null;
    return r * size + c;
  };

  const adj8 = (a: number, b: number) => {
    const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
    const dc = Math.abs((a % size) - (b % size));
    return dr <= 1 && dc <= 1 && a !== b;
  };

  const commitPath = (next: number[]) => {
    pathRef.current = next;
    setPath(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || done.current) return;
    const cell = hitCell(e.clientX, e.clientY);
    if (cell === null) return;
    boardRef.current?.setPointerCapture(e.pointerId);
    dragging.current = true;
    if (flash) setFlash(null);
    commitPath([cell]);
    sfx.drag();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || paused || done.current) return;
    const cell = hitCell(e.clientX, e.clientY);
    if (cell === null) return;
    const p = pathRef.current;
    const last = p[p.length - 1];
    if (cell === last) return;
    if (p.length >= 2 && p[p.length - 2] === cell) {
      commitPath(p.slice(0, -1)); // drag back to un-pick the tip
      sfx.drag();
      return;
    }
    if (p.includes(cell)) return; // a tile is used at most once per word
    if (last !== undefined && !adj8(last, cell)) return;
    commitPath([...p, cell]);
    sfx.drag();
  };

  const wordOf = (p: number[]) => p.map((i) => tiles[i]).join('');

  const cellCenter = (i: number) => ({
    left: ((i % size) + 0.5) * (100 / size),
    top: (Math.floor(i / size) + 0.5) * (100 / size)
  });

  const spawnPop = (text: string, atCell: number) => {
    const { left, top } = cellCenter(atCell);
    const id = ++popId.current;
    setPops((ps) => [...ps, { id, text, left, top }]);
    window.setTimeout(() => setPops((ps) => ps.filter((x) => x.id !== id)), 850);
  };

  const showFlash = (kind: FlashKind, p: number[], word: string) => {
    setFlash({ kind, path: p, word, key: Date.now() });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 480);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = pathRef.current;
    commitPath([]);
    if (paused || done.current) return;
    const word = wordOf(p);
    if (word.length < minLen) return; // too short — treated as a stray tap

    if (foundRef.current.has(word)) {
      showFlash('dup', p, word);
      sfx.tap();
      return;
    }
    if (isHuntWord(word)) {
      const nextFound = new Set(foundRef.current);
      nextFound.add(word);
      foundRef.current = nextFound;
      setFound(nextFound);
      lastFindRef.current = elapsedSec;
      const gained = wordPoints(word.length) * mult;
      spawnPop(`+${gained}`, p[p.length - 1]);
      showFlash('good', p, word);
      // satisfying pop, pitched up by word length
      playNote(392 * Math.pow(2, Math.min(word.length - 3, 6) / 12), 130, 'triangle');
      sfx.pop();
    } else {
      setErrors((n) => n + 1);
      showFlash('bad', p, word);
      sfx.error();
    }
  };

  const useHint = () => {
    if (paused || done.current || !assists.hint) return;
    const next = board.solutions.find((s) => !foundRef.current.has(s.word));
    if (!next) return;
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setGhost(next.path);
    sfx.hint();
    if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
    ghostTimer.current = window.setTimeout(() => setGhost(null), 1500);
  };

  useEffect(() => {
    registerSnapshot(
      () =>
        ({
          board,
          found: [...found],
          errors,
          hintsUsed,
          lastFindElapsed: lastFindRef.current,
          assistsUsed: [...assistsUsed.current]
        }) satisfies HuntSave
    );
  });

  /* ─────────── derived render sets ─────────── */

  const pathSet = useMemo(() => new Set(path), [path]);
  const flashSet = useMemo(() => new Set(flash?.path ?? []), [flash]);
  const ghostSet = useMemo(() => new Set(ghost ?? []), [ghost]);

  const currentWord = wordOf(path);
  const previewText = flash ? flash.word : currentWord;
  const previewKind = flash ? flash.kind : path.length > 0 ? 'live' : 'idle';

  const foundList = useMemo(
    () => [...found].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)),
    [found]
  );

  // the trail polyline (through tile centres) for the live path, ghost & flash
  const trailPoints = (p: number[]) =>
    p
      .map((i) => {
        const { left, top } = cellCenter(i);
        return `${(left / 100) * size} ${(top / 100) * size}`;
      })
      .join(' ');

  const urgent = remaining <= 10;

  return (
    <div className={`letterhunt ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{displayScore.toLocaleString()}</b> / {(target * mult).toLocaleString()}
        </span>
        {assists.wordCount ? (
          <span className="info-item">
            Words: <b>{found.size}</b> / {board.availableWords}
          </span>
        ) : (
          <span className="info-item">
            Words: <b>{found.size}</b>
          </span>
        )}
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Misses: <b>{errors}</b>
        </span>
      </div>

      {/* countdown bar — depletes across the top, reddens & ticks near the end */}
      <div className="lh-timer" aria-label={`${remaining} seconds left`}>
        <div
          className={`lh-timer-fill ${urgent ? 'urgent' : ''}`}
          style={{ width: `${(remaining / timeSec) * 100}%` }}
        />
        <span className="lh-timer-label">{remaining}s</span>
      </div>

      {/* big word preview above the board */}
      <div className={`lh-preview ${previewKind}`}>
        {previewText ? (
          [...previewText].map((ch, i) => (
            <span key={i} className="lh-preview-ch">
              {ch}
            </span>
          ))
        ) : reached ? (
          <span className="lh-preview-note good">Target beaten — keep hunting for bonus!</span>
        ) : (
          <span className="lh-preview-note">Swipe letters to spell a word</span>
        )}
      </div>

      <div className="lh-board-wrap">
        <div
          ref={boardRef}
          className="lh-board"
          style={
            {
              gridTemplateColumns: `repeat(${size}, 1fr)`,
              '--lh-n': size
            } as React.CSSProperties
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {tiles.map((t, i) => {
            const inPath = pathSet.has(i);
            const fl = flashSet.has(i) ? flash?.kind : null;
            return (
              <div
                key={i}
                className={[
                  'lh-tile',
                  inPath ? 'on' : '',
                  fl ? `flash-${fl}` : '',
                  ghostSet.has(i) ? 'ghost' : '',
                  pulseTile === i ? 'pulse' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>{tileLabel(t)}</span>
              </div>
            );
          })}

          {/* connector trail + floating score pops, in board-percentage space */}
          <div className="lh-overlay" aria-hidden>
            <svg className="lh-trail" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none">
              {ghost && (
                <polyline
                  className="trail ghost"
                  points={trailPoints(ghost)}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {flash && (
                <polyline
                  key={flash.key}
                  className={`trail flash-${flash.kind}`}
                  points={trailPoints(flash.path)}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {path.length > 1 && (
                <polyline
                  className="trail live"
                  points={trailPoints(path)}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {pops.map((p) => (
              <span
                key={p.id}
                className="lh-pop"
                style={{ left: `${p.left}%`, top: `${p.top}%` }}
              >
                {p.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {foundList.length > 0 && (
        <div className="lh-found fx-card">
          <div className="lh-found-chips">
            {foundList.map((w) => (
              <span key={w} className={`lh-chip len-${Math.min(w.length, 8)}`}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {assists.hint && (
        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool silent onClick={useHint} disabled={found.size >= board.availableWords}>
              <BulbIcon />
              <span>Reveal a word</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
