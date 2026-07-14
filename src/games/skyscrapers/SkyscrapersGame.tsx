import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, EraseIcon, EyeIcon, PencilIcon, SameIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { generateSkyPuzzle, visibleCount, type SkyPuzzle } from './logic/generator';
import { CELL_POINTS, ERROR_PENALTY, HINT_PENALTY, timeBonus } from './logic/scoring';

/** Passive assists count as "help used" for the whole game when enabled. */
const PASSIVE_ASSISTS = ['clue-check', 'dupes'];

interface SkySave {
  puzzle: SkyPuzzle;
  values: number[];
  notes: number[];
  penalty: number;
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

const vars = (v: Record<string, number | string>) => v as CSSProperties;

/** small "eye direction" chevron for the clue gutters (points into the grid) */
function Chev({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) {
  return (
    <svg className={`sky-chev ${dir}`} width="9" height="9" viewBox="0 0 9 9" aria-hidden>
      <path
        d="M2 3l2.5 3L7 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SkyscrapersGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved =
    savedState &&
    (savedState as SkySave).puzzle &&
    Array.isArray((savedState as SkySave).puzzle.solution) &&
    Array.isArray((savedState as SkySave).values) &&
    Array.isArray((savedState as SkySave).notes)
      ? (savedState as SkySave)
      : undefined;

  const puzzle = useMemo(
    () => (saved ? saved.puzzle : generateSkyPuzzle(difficulty)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );
  const { n, solution, top, bottom, left, right } = puzzle;
  const cellsTotal = n * n;

  const [values, setValues] = useState<number[]>(() =>
    saved ? [...saved.values] : [...puzzle.givens]
  );
  const [notes, setNotes] = useState<number[]>(() =>
    saved ? [...saved.notes] : new Array(cellsTotal).fill(0)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [penalty, setPenalty] = useState(saved?.penalty ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [bonus, setBonus] = useState(0);
  const [won, setWon] = useState(false);
  const [shake, setShake] = useState(false);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...PASSIVE_ASSISTS.filter((a) => assists[a])])
  );
  const done = useRef(false);
  const shakeTimer = useRef<number | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  const given = useMemo(() => puzzle.givens.map((v) => v !== 0), [puzzle]);
  const givenCount = useMemo(() => given.filter(Boolean).length, [given]);
  /** pencil marks are a hard+ feature (easy/medium boards don't need them) */
  const notesAvailable = difficulty === 'hard' || difficulty === 'pro' || difficulty === 'extreme';

  const placedCount = useMemo(() => values.filter((v) => v > 0).length, [values]);
  const score =
    Math.max(
      0,
      (placedCount - givenCount) * CELL_POINTS[difficulty] - penalty
    ) + bonus;

  const reportStats = useCallback(
    (s: number, e: number, h: number) => {
      events.onStats({
        score: s,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { towers: placedCount }
      });
    },
    [events, placedCount]
  );

  useEffect(() => {
    // passive assists toggled on mid-game still count as help for this game
    for (const a of PASSIVE_ASSISTS) if (assists[a]) assistsUsed.current.add(a);
    reportStats(score, errors, hintsUsed);
  }, [score, errors, hintsUsed, assists, reportStats]);

  useEffect(
    () => () => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    },
    []
  );

  const finish = useCallback(
    (finalScore: number, e: number, h: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      events.onFinish({
        outcome: 'won',
        score: finalScore,
        errors: e,
        hintsUsed: h,
        assistsUsed: [...assistsUsed.current],
        extra: { size: `${n}×${n}` }
      });
    },
    [events, n]
  );

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShake(false), 450);
  }, []);

  /** is the row or column through idx complete AND contradicting (dup / visible clue broken)? */
  const lineViolatedAfter = useCallback(
    (vals: number[], idx: number): boolean => {
      const r = Math.floor(idx / n);
      const c = idx % n;
      const row = vals.slice(r * n, r * n + n);
      if (row.every((v) => v > 0)) {
        const dup = new Set(row).size !== n;
        if (dup) return true;
        if (left[r] > 0 && visibleCount(row) !== left[r]) return true;
        if (right[r] > 0 && visibleCount([...row].reverse()) !== right[r]) return true;
      }
      const col = Array.from({ length: n }, (_, k) => vals[k * n + c]);
      if (col.every((v) => v > 0)) {
        const dup = new Set(col).size !== n;
        if (dup) return true;
        if (top[c] > 0 && visibleCount(col) !== top[c]) return true;
        if (bottom[c] > 0 && visibleCount([...col].reverse()) !== bottom[c]) return true;
      }
      return false;
    },
    [n, top, bottom, left, right]
  );

  const applyValue = useCallback(
    (idx: number, v: number, viaHint: boolean) => {
      const next = [...values];
      next[idx] = v;
      setValues(next);
      // clear the cell's notes and this height from row/col peer notes
      setNotes((old) => {
        const nn = [...old];
        nn[idx] = 0;
        const bit = 1 << v;
        const r = Math.floor(idx / n);
        const c = idx % n;
        for (let i = 0; i < cellsTotal; i++) {
          if (Math.floor(i / n) === r || i % n === c) nn[i] &= ~bit;
        }
        return nn;
      });

      let nextPenalty = penalty;
      let nextHints = hintsUsed;
      if (viaHint) {
        nextPenalty += HINT_PENALTY;
        nextHints += 1;
        assistsUsed.current.add('hint');
        setHintsUsed(nextHints);
        sfx.hint();
      } else {
        sfx.place();
      }

      const full = next.every((x) => x > 0);
      const solved = full && next.every((x, i) => x === solution[i]);
      if (solved) {
        setPenalty(nextPenalty);
        const tBonus = timeBonus(difficulty, elapsedRef.current);
        setBonus(tBonus);
        const finalScore =
          Math.max(0, (cellsTotal - givenCount) * CELL_POINTS[difficulty] - nextPenalty) + tBonus;
        finish(finalScore, errors, nextHints);
        return;
      }

      // contradiction: a completed line the clue-check flags, or a full board
      // that isn't the solution (the failed "win"). Hints never charge errors.
      if (!viaHint) {
        const flagged = assists['clue-check'] && lineViolatedAfter(next, idx);
        if (flagged || full) {
          nextPenalty += ERROR_PENALTY;
          setErrors((e) => e + 1);
          sfx.error();
          triggerShake();
        }
      }
      setPenalty(nextPenalty);
    },
    [
      values,
      n,
      cellsTotal,
      penalty,
      hintsUsed,
      errors,
      solution,
      difficulty,
      givenCount,
      assists,
      lineViolatedAfter,
      finish,
      triggerShake
    ]
  );

  const toggleNote = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (given[selected] || values[selected] !== 0) return;
      sfx.tap();
      setNotes((old) => {
        const nn = [...old];
        nn[selected] ^= 1 << d;
        return nn;
      });
    },
    [paused, selected, given, values]
  );

  const placeHeight = useCallback(
    (d: number) => {
      if (paused || done.current || selected === null) return;
      if (given[selected]) return;
      if (notesMode && notesAvailable) {
        toggleNote(d);
        return;
      }
      if (values[selected] === d) return;
      applyValue(selected, d, false);
    },
    [paused, selected, given, notesMode, notesAvailable, values, toggleNote, applyValue]
  );

  const erase = useCallback(() => {
    if (paused || done.current || selected === null || given[selected]) return;
    if (values[selected] === 0 && notes[selected] === 0) return;
    sfx.tap();
    setValues((v) => {
      const next = [...v];
      next[selected] = 0;
      return next;
    });
    setNotes((old) => {
      const nn = [...old];
      nn[selected] = 0;
      return nn;
    });
  }, [paused, selected, given, values, notes]);

  const useHint = useCallback(() => {
    if (paused || done.current || !assists.hint) return;
    let target =
      selected !== null && !given[selected] && values[selected] !== solution[selected]
        ? selected
        : -1;
    if (target < 0) target = values.findIndex((v, i) => !given[i] && v !== solution[i]);
    if (target < 0) return;
    setSelected(target);
    applyValue(target, solution[target], true);
  }, [paused, assists.hint, selected, given, values, solution, applyValue]);

  // physical keyboard support (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      const d = Number(e.key);
      if (d >= 1 && d <= n) placeHeight(d);
      else if (e.key === 'Backspace' || e.key === 'Delete') erase();
      else if (e.key.toLowerCase() === 'n' && notesAvailable) setNotesMode((m) => !m);
      else if (e.key.toLowerCase() === 'h') useHint();
      else if (e.key.startsWith('Arrow') && selected !== null) {
        e.preventDefault();
        const r = Math.floor(selected / n);
        const c = selected % n;
        const [nr, nc] =
          e.key === 'ArrowUp'
            ? [Math.max(0, r - 1), c]
            : e.key === 'ArrowDown'
              ? [Math.min(n - 1, r + 1), c]
              : e.key === 'ArrowLeft'
                ? [r, Math.max(0, c - 1)]
                : [r, Math.min(n - 1, c + 1)];
        setSelected(nr * n + nc);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placeHeight, erase, useHint, paused, selected, n, notesAvailable]);

  // long-press a height key = pencil it in (hard+), without entering notes mode
  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);
  const keyPressStart = useCallback(
    (d: number) => {
      if (!notesAvailable) return;
      lpFired.current = false;
      if (lpTimer.current !== null) window.clearTimeout(lpTimer.current);
      lpTimer.current = window.setTimeout(() => {
        lpFired.current = true;
        toggleNote(d);
      }, 420);
    },
    [notesAvailable, toggleNote]
  );
  const keyPressEnd = useCallback(() => {
    if (lpTimer.current !== null) {
      window.clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  }, []);

  /* ---------- derived rendering state ---------- */

  const dupCells = useMemo(() => {
    const set = new Set<number>();
    if (!assists.dupes) return set;
    for (let r = 0; r < n; r++) {
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const ia = r * n + a;
          const ib = r * n + b;
          if (values[ia] > 0 && values[ia] === values[ib]) set.add(ia).add(ib);
        }
      }
    }
    for (let c = 0; c < n; c++) {
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const ia = a * n + c;
          const ib = b * n + c;
          if (values[ia] > 0 && values[ia] === values[ib]) set.add(ia).add(ib);
        }
      }
    }
    return set;
  }, [assists.dupes, values, n]);

  const clueStatus = useMemo(() => {
    const st = {
      top: new Array<string>(n).fill(''),
      bottom: new Array<string>(n).fill(''),
      left: new Array<string>(n).fill(''),
      right: new Array<string>(n).fill('')
    };
    if (!assists['clue-check']) return st;
    for (let r = 0; r < n; r++) {
      const row = values.slice(r * n, r * n + n);
      if (row.some((v) => v === 0)) continue;
      const dup = new Set(row).size !== n;
      if (left[r] > 0) st.left[r] = dup || visibleCount(row) !== left[r] ? 'bad' : 'good';
      if (right[r] > 0)
        st.right[r] = dup || visibleCount([...row].reverse()) !== right[r] ? 'bad' : 'good';
    }
    for (let c = 0; c < n; c++) {
      const col = Array.from({ length: n }, (_, k) => values[k * n + c]);
      if (col.some((v) => v === 0)) continue;
      const dup = new Set(col).size !== n;
      if (top[c] > 0) st.top[c] = dup || visibleCount(col) !== top[c] ? 'bad' : 'good';
      if (bottom[c] > 0)
        st.bottom[c] = dup || visibleCount([...col].reverse()) !== bottom[c] ? 'bad' : 'good';
    }
    return st;
  }, [assists, values, n, top, bottom, left, right]);

  /** how many of each height are on the board (each appears n times when solved) */
  const heightCounts = useMemo(() => {
    const counts = new Array<number>(n + 1).fill(0);
    for (const v of values) if (v > 0) counts[v]++;
    return counts;
  }, [values, n]);

  useEffect(() => {
    registerSnapshot(() => ({
      puzzle,
      values,
      notes,
      penalty,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- render ---------- */

  const clueNode = (side: 'top' | 'bottom' | 'left' | 'right', i: number, clue: number) => {
    const dir =
      side === 'top' ? 'down' : side === 'bottom' ? 'up' : side === 'left' ? 'right' : 'left';
    return (
      <div
        key={`${side}${i}`}
        className={`sky-clue ${side} ${clueStatus[side][i]}`}
        aria-label={clue > 0 ? `${side} clue ${clue}` : undefined}
      >
        {clue > 0 && (
          <>
            <span>{clue}</span>
            <Chev dir={dir} />
          </>
        )}
      </div>
    );
  };

  const cells = [];
  for (let r = 0; r < n; r++) {
    cells.push(clueNode('left', r, left[r]));
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const v = values[i];
      const classes = ['sky-cell'];
      if (given[i]) classes.push('given');
      else if (v > 0) classes.push('user');
      if (selected === i) classes.push('selected');
      if (dupCells.has(i)) classes.push('dup');
      cells.push(
        <button
          key={`c${i}`}
          className={classes.join(' ')}
          style={vars({ '--ri': r, '--ci': c })}
          onClick={() => {
            if (done.current) return;
            sfx.tap();
            setSelected(i);
          }}
          aria-label={`Row ${r + 1} column ${c + 1}${v > 0 ? `, height ${v}` : ', empty'}`}
        >
          {v > 0 ? (
            <span className="sky-tower" key={`t${v}`}>
              {v === n && <i className="sky-antenna" style={vars({ '--i': v })} />}
              {Array.from({ length: v }, (_, k) => (
                <i key={k} className="sky-floor" style={vars({ '--i': v - 1 - k })} />
              ))}
            </span>
          ) : notes[i] !== 0 ? (
            <span className="sky-notes">
              {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
                <i key={d}>{notes[i] & (1 << d) ? d : ''}</i>
              ))}
            </span>
          ) : (
            <span className="sky-tower" />
          )}
          <span className="sky-num">{v > 0 ? v : ''}</span>
        </button>
      );
    }
    cells.push(clueNode('right', r, right[r]));
  }

  const gridTemplate = `minmax(24px, 0.55fr) repeat(${n}, 1fr) minmax(24px, 0.55fr)`;

  return (
    <div className={`sky ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Towers: <b>{placedCount} / {cellsTotal}</b>
        </span>
        <span className={`info-item ${errors > 0 ? 'bad' : ''}`}>
          Errors: <b>{errors}</b>
        </span>
        {hintsUsed > 0 && (
          <span className="info-item">
            Hints: <b>{hintsUsed}</b>
          </span>
        )}
      </div>

      <div
        className={`sky-board ${won ? 'sky-won' : ''} ${shake ? 'sky-shake' : ''}`}
        style={vars({ gridTemplateColumns: gridTemplate, gridTemplateRows: gridTemplate, '--n': n })}
        role="grid"
        aria-label={`${n} by ${n} skyscrapers board`}
      >
        <div className="sky-corner" />
        {Array.from({ length: n }, (_, c) => clueNode('top', c, top[c]))}
        <div className="sky-corner" />
        {cells}
        <div className="sky-corner" />
        {Array.from({ length: n }, (_, c) => clueNode('bottom', c, bottom[c]))}
        <div className="sky-corner" />
      </div>

      <div className="game-tools fx-card">
        <div className="sky-controls">
          {notesAvailable && (
            <PadTool active={notesMode} onClick={() => setNotesMode((m) => !m)}>
              <PencilIcon />
              <span>Notes</span>
            </PadTool>
          )}
          <PadTool silent onClick={erase}>
            <EraseIcon />
            <span>Erase</span>
          </PadTool>
          {assists.hint && (
            <PadTool silent onClick={useHint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>

        <div className="sky-controls">
          <PadTool
            active={assists['clue-check']}
            onClick={() => onToggleAssist('clue-check', !assists['clue-check'])}
          >
            <EyeIcon />
            <span>Clue check</span>
          </PadTool>
          <PadTool active={assists.dupes} onClick={() => onToggleAssist('dupes', !assists.dupes)}>
            <SameIcon />
            <span>Repeats</span>
          </PadTool>
        </div>

        <div className="sky-pad">
          {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
            <PadTool
              key={d}
              silent
              className={`sky-key ${heightCounts[d] >= n ? 'used' : ''}`}
              onClick={() => {
                if (lpFired.current) {
                  lpFired.current = false;
                  return;
                }
                placeHeight(d);
              }}
              onPointerDown={() => keyPressStart(d)}
              onPointerUp={keyPressEnd}
              onPointerLeave={keyPressEnd}
              onPointerCancel={keyPressEnd}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`Height ${d}`}
            >
              <span className="sky-key-tower" aria-hidden>
                {Array.from({ length: d }, (_, k) => (
                  <i key={k} />
                ))}
              </span>
              <span className="sky-key-num">{d}</span>
            </PadTool>
          ))}
        </div>
      </div>
    </div>
  );
}
