import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { buildWheelLevel, pickLevel, type WheelLevel } from './logic/levels';
import { generateHunt, type HuntPuzzle } from './logic/wordbank';

const WORD_PTS: Record<Difficulty, number> = { easy: 20, medium: 30, hard: 40 };
const PAR_SEC: Record<Difficulty, number> = { easy: 3 * 60, medium: 5 * 60, hard: 8 * 60 };
const BONUS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const WRONG_PENALTY = 5;
const HINT_PENALTY = 15;

type WwMode = 'crossword' | 'hunt';

interface ActivePuzzle {
  mode: WwMode;
  level: WheelLevel | null;
  hunt: HuntPuzzle | null;
  center: string;
}

interface WheelSave {
  mode: WwMode;
  level: WheelLevel | null;
  hunt: HuntPuzzle | null;
  center: string;
  outer: string[];
  foundIdx: number[];
  foundWords: string[];
  hintedWords: string[];
  revealed: number[];
  errors: number;
  score: number;
  hintsUsed: number;
  assistsUsed: string[];
}

/* ---------- pizza-wheel geometry (200×200 viewBox, center 100,100) ---------- */
const R_OUT = 95;
const R_IN = 42;
const R_HUB = 36;
const R_TEXT = 68;

const polar = (r: number, deg: number): [number, number] => [
  100 + r * Math.cos((deg * Math.PI) / 180),
  100 + r * Math.sin((deg * Math.PI) / 180)
];

export function WordWheelGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  // pre-mode-picker saves lack `mode` — treat them as no save
  const saved = savedState && (savedState as WheelSave).mode ? (savedState as WheelSave) : undefined;

  const [active, setActive] = useState<ActivePuzzle | null>(
    saved ? { mode: saved.mode, level: saved.level, hunt: saved.hunt, center: saved.center } : null
  );
  const [outer, setOuter] = useState<string[]>(saved?.outer ?? []);
  const [picked, setPicked] = useState<number[]>([]); // indices into [center, ...outer]
  const [foundIdx, setFoundIdx] = useState<Set<number>>(() => new Set(saved?.foundIdx ?? []));
  const [foundWords, setFoundWords] = useState<Set<string>>(() => new Set(saved?.foundWords ?? []));
  const [hintedWords, setHintedWords] = useState<Set<string>>(() => new Set(saved?.hintedWords ?? []));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(saved?.revealed ?? []));
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [flash, setFlash] = useState<string | null>(null);

  const done = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const gestureLen = useRef(0);
  const flashTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  // the clock only runs once a mode is chosen — not on the menu
  useEffect(() => {
    holdClock(active === null);
  }, [active, holdClock]);

  const level = active?.level ?? null;
  const hunt = active?.hunt ?? null;
  const built = useMemo(() => (level ? buildWheelLevel(level) : null), [level]);
  const all = active ? [active.center, ...outer] : [];
  const current = picked.map((i) => all[i]).join('');
  const wordsTotal = level ? level.entries.length : (hunt?.words.length ?? 0);
  const wordsFound = level ? foundIdx.size : foundWords.size;

  // first-letters is a crossword-grid assist only
  useEffect(() => {
    if (active?.mode === 'crossword' && assists.firstLetters) {
      assistsUsed.current.add('firstLetters');
    }
  }, [active, assists.firstLetters]);

  const firstLetterCells = useMemo(
    () =>
      new Set(
        active?.mode === 'crossword' && assists.firstLetters && built
          ? built.entryCells.map((cells) => cells[0])
          : []
      ),
    [active, assists.firstLetters, built]
  );

  useEffect(() => {
    if (!active) return;
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        mode: active.mode,
        wordsFound,
        wordsTotal,
        ...(level ? { level: level.id } : { letters: all.join('') })
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, errors, hintsUsed, wordsFound, active, events]);

  const finish = useCallback(
    (finalScore: number, e: number, h: number) => {
      if (done.current || !active) return;
      done.current = true;
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { mode: active.mode, wordsTotal }
      });
    },
    [events, active, wordsTotal]
  );

  const miss = (word: string) => {
    setErrors((e) => e + 1);
    setScore((s) => Math.max(0, s - WRONG_PENALTY));
    sfx.error();
    setFlash(word);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 600);
  };

  const submit = useCallback(() => {
    if (paused || done.current || !active) return;
    const word = current;
    const minLen = active.mode === 'hunt' ? 3 : 2;
    if (word.length < minLen) return;
    setPicked([]);

    if (active.mode === 'crossword' && level) {
      const matchIdx = level.entries.findIndex(
        (e, i) => e.answer.toUpperCase() === word && !foundIdx.has(i)
      );
      if (matchIdx !== -1) {
        const nextFound = new Set(foundIdx);
        nextFound.add(matchIdx);
        setFoundIdx(nextFound);
        sfx.place();
        const gained = word.length * WORD_PTS[difficulty];
        if (nextFound.size === level.entries.length) {
          const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * BONUS[difficulty];
          const final = score + gained + bonus;
          setScore(final);
          finish(final, errors, hintsUsed);
        } else {
          setScore((s) => s + gained);
        }
      } else {
        miss(word);
      }
      return;
    }

    if (hunt) {
      if (foundWords.has(word)) {
        sfx.tap(); // already found — no penalty
        return;
      }
      if (hunt.words.includes(word)) {
        const nextFound = new Set(foundWords);
        nextFound.add(word);
        setFoundWords(nextFound);
        sfx.place();
        const gained = word.length * WORD_PTS[difficulty];
        if (nextFound.size === hunt.words.length) {
          const bonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * BONUS[difficulty];
          const final = score + gained + bonus;
          setScore(final);
          finish(final, errors, hintsUsed);
        } else {
          setScore((s) => s + gained);
        }
      } else {
        miss(word);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, active, current, level, hunt, foundIdx, foundWords, difficulty, score, errors, hintsUsed, finish]);

  const useHint = useCallback(() => {
    if (paused || done.current || !active || !assists.revealLetter) return;
    if (active.mode === 'crossword' && level && built) {
      for (let w = 0; w < level.entries.length; w++) {
        if (foundIdx.has(w)) continue;
        const cell = built.entryCells[w].find((c) => !revealed.has(c) && !firstLetterCells.has(c));
        const target = cell ?? built.entryCells[w].find((c) => !revealed.has(c));
        if (target === undefined) continue;
        assistsUsed.current.add('revealLetter');
        setHintsUsed((h) => h + 1);
        setScore((s) => Math.max(0, s - HINT_PENALTY));
        setRevealed((r) => new Set(r).add(target));
        sfx.hint();
        return;
      }
      return;
    }
    if (hunt) {
      const next = hunt.words.find((w) => !foundWords.has(w) && !hintedWords.has(w));
      if (!next) return;
      assistsUsed.current.add('revealLetter');
      setHintsUsed((h) => h + 1);
      setScore((s) => Math.max(0, s - HINT_PENALTY));
      setHintedWords((hw) => new Set(hw).add(next));
      sfx.hint();
    }
  }, [paused, active, assists.revealLetter, level, built, foundIdx, revealed, firstLetterCells, hunt, foundWords, hintedWords]);

  const shuffle = () => {
    if (paused || done.current) return;
    sfx.tap();
    setPicked([]);
    setOuter((w) => [...w].sort(() => Math.random() - 0.5));
  };

  /* ---------- picking: taps, keyboard and drag all share these ---------- */

  const append = (idx: number) => {
    sfx.tap();
    setPicked((p) => [...p, idx]);
  };

  const seg = outer.length > 0 ? 360 / outer.length : 360;

  /** pointer → wheel index (0 = center hub, 1.. = wedges), or null */
  const hitIndex = (e: React.PointerEvent): number | null => {
    const el = svgRef.current;
    if (!el || !outer.length) return null;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / 200;
    const x = (e.clientX - rect.left) / scale - 100;
    const y = (e.clientY - rect.top) / scale - 100;
    const dist = Math.hypot(x, y);
    if (dist <= R_HUB + 2) return 0;
    if (dist < R_IN - 2 || dist > R_OUT + 2) return null;
    const deg = (Math.atan2(y, x) * 180) / Math.PI;
    const rel = (((deg + 90 + seg / 2) % 360) + 360) % 360;
    return 1 + (Math.floor(rel / seg) % outer.length);
  };

  const onWheelDown = (e: React.PointerEvent) => {
    if (paused || done.current || !active) return;
    const idx = hitIndex(e);
    if (idx === null) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    if (!picked.includes(idx)) {
      append(idx);
      dragging.current = true;
      gestureLen.current = 1;
    } else if (picked[picked.length - 1] === idx) {
      // grab the word's tip to keep dragging from where you left off
      dragging.current = true;
      gestureLen.current = 1;
    }
  };

  const onWheelMove = (e: React.PointerEvent) => {
    if (!dragging.current || paused || done.current) return;
    const idx = hitIndex(e);
    if (idx === null) return;
    setPicked((p) => {
      if (p[p.length - 1] === idx) return p;
      if (p.length >= 2 && p[p.length - 2] === idx) return p.slice(0, -1); // backtrack
      if (p.includes(idx)) return p;
      sfx.tap();
      gestureLen.current++;
      return [...p, idx];
    });
  };

  const onWheelUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // a drag across 2+ letters submits on release; a plain tap just picks
    if (gestureLen.current >= 2) submit();
    gestureLen.current = 0;
  };

  // desktop keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current || !active) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch)) {
        const idx = all.findIndex((l, i) => l === ch && !picked.includes(i));
        if (idx !== -1) append(idx);
      } else if (e.key === 'Backspace') {
        setPicked((p) => p.slice(0, -1));
      } else if (e.key === 'Enter') {
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, picked, paused, active, submit]);

  // which crossword cells are visible
  const visibleCells = useMemo(() => {
    const set = new Set<number>(revealed);
    firstLetterCells.forEach((c) => set.add(c));
    if (built) foundIdx.forEach((w) => built.entryCells[w].forEach((c) => set.add(c)));
    return set;
  }, [revealed, firstLetterCells, foundIdx, built]);

  // hunt tier rows: words grouped by length
  const tiers = useMemo(() => {
    if (!hunt) return [];
    const byLen = new Map<number, string[]>();
    for (const w of hunt.words) byLen.set(w.length, [...(byLen.get(w.length) ?? []), w]);
    return [...byLen.entries()].sort((a, b) => a[0] - b[0]);
  }, [hunt]);

  useEffect(() => {
    registerSnapshot(() =>
      active
        ? ({
            mode: active.mode,
            level: active.level,
            hunt: active.hunt,
            center: active.center,
            outer,
            foundIdx: [...foundIdx],
            foundWords: [...foundWords],
            hintedWords: [...hintedWords],
            revealed: [...revealed],
            errors,
            score,
            hintsUsed,
            assistsUsed: [...assistsUsed.current]
          } satisfies WheelSave)
        : null
    );
  });

  /* ---------- mode menu ---------- */

  const start = (mode: WwMode) => {
    sfx.place();
    if (mode === 'crossword') {
      const lvl = pickLevel(difficulty);
      setActive({ mode, level: lvl, hunt: null, center: lvl.letters[0] });
      setOuter(lvl.letters.slice(1));
    } else {
      const h = generateHunt(difficulty);
      setActive({ mode, level: null, hunt: h, center: h.center });
      setOuter(h.letters.slice(1));
    }
  };

  if (!active) {
    return (
      <div className="wordwheel">
        <div className="ww-menu">
          <button className="ww-mode fx-card" onClick={() => start('crossword')}>
            <span className="ww-mode-title">Crossword wheel</span>
            <span className="ww-mode-sub">
              Spell words from the wheel to fill a hand-crafted criss-cross grid.
            </span>
          </button>
          <button className="ww-mode fx-card" onClick={() => start('hunt')}>
            <span className="ww-mode-title">Word hunt</span>
            <span className="ww-mode-sub">
              A fresh random wheel every game. Hidden 3–9 letter words all use the center
              letter — find every one. Bigger wheels on higher difficulty.
            </span>
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */

  return (
    <div className={`wordwheel ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Words: <b>{wordsFound} / {wordsTotal}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Misses: <b>{errors}</b>
        </span>
      </div>

      {level && built && (
        <div className="ww-board-card fx-card">
          <div
            className="ww-board"
            style={{ gridTemplateColumns: `repeat(${built.cols}, 1fr)`, maxWidth: `${built.cols * 44}px` }}
          >
            {built.grid.map((ch, i) =>
              ch === null ? (
                <span key={i} className="ww-block" />
              ) : (
                <span key={i} className={`ww-cell ${visibleCells.has(i) ? 'filled' : ''}`}>
                  {visibleCells.has(i) ? ch : ''}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {hunt && (
        <div className="ww-tiers fx-card">
          {tiers.map(([len, words]) => {
            const got = words.filter((w) => foundWords.has(w)).length;
            return (
              <div key={len} className="ww-tier">
                <span className="ww-tier-label">{len}-letter words</span>
                <div className="ww-tier-bar">
                  <div style={{ width: `${(got / words.length) * 100}%` }} />
                </div>
                <span className="ww-tier-count">
                  {got}/{words.length}
                </span>
              </div>
            );
          })}
          {(foundWords.size > 0 || hintedWords.size > 0) && (
            <div className="ww-found">
              {[...foundWords].map((w) => (
                <span key={w} className="chip good">
                  {w}
                </span>
              ))}
              {[...hintedWords]
                .filter((w) => !foundWords.has(w))
                .map((w) => (
                  <span key={w} className="chip">
                    {w[0]}
                    {'·'.repeat(w.length - 1)}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="game-tools fx-card">
        {/* the word being spelled — a fixed input-style box above the wheel */}
        <div className={`ww-current ${flash ? 'shake' : ''}`}>
          {current || flash || <span className="ww-current-ph">Spell a word…</span>}
        </div>

        <div className="ww-pizza-wrap">
          <svg
            ref={svgRef}
            className="ww-pizza"
            viewBox="0 0 200 200"
            role="group"
            aria-label="Letter wheel"
            onPointerDown={onWheelDown}
            onPointerMove={onWheelMove}
            onPointerUp={onWheelUp}
            onPointerCancel={onWheelUp}
          >
            <circle className="ww-rim" cx="100" cy="100" r={R_OUT} />
            {outer.map((letter, j) => {
              const a0 = -90 - seg / 2 + j * seg;
              const a1 = a0 + seg;
              const mid = a0 + seg / 2;
              const [x0, y0] = polar(R_IN, a0);
              const [x1, y1] = polar(R_OUT, a0);
              const [x2, y2] = polar(R_OUT, a1);
              const [x3, y3] = polar(R_IN, a1);
              const large = seg > 180 ? 1 : 0;
              const on = picked.includes(j + 1);
              const [tx, ty] = polar(R_TEXT, mid);
              return (
                <g key={j}>
                  <path
                    className={`ww-wedge ${on ? 'on' : ''}`}
                    d={`M ${x0} ${y0} L ${x1} ${y1} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${R_IN} ${R_IN} 0 ${large} 0 ${x0} ${y0} Z`}
                  />
                  <text className={`ww-wedge-letter ${on ? 'on' : ''}`} x={tx} y={ty}>
                    {letter}
                  </text>
                </g>
              );
            })}
            <circle
              className={`ww-hub ${picked.includes(0) ? 'on' : ''}`}
              cx="100"
              cy="100"
              r={R_HUB}
            />
            <text className={`ww-hub-letter ${picked.includes(0) ? 'on' : ''}`} x="100" y="100">
              {active.center}
            </text>
          </svg>
        </div>

        <div className="sudoku-controls">
          <PadTool onClick={() => setPicked((p) => p.slice(0, -1))}>
            <EraseIcon />
            <span>Undo</span>
          </PadTool>
          <PadTool silent onClick={shuffle}>
            <RestartIcon />
            <span>Shuffle</span>
          </PadTool>
          {assists.revealLetter && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool
            active
            silent
            onClick={submit}
            disabled={current.length < (active.mode === 'hunt' ? 3 : 2)}
          >
            <CheckIcon />
            <span>Submit</span>
          </PadTool>
        </div>
      </div>
    </div>
  );
}
