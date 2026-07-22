import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { clueText, generateHousePuzzle, type HpFlavor } from './logic/generator';

const SIZE: Record<Difficulty, { n: number; k: number; flavor: HpFlavor }> = {
  easy: { n: 4, k: 3, flavor: 'gentle' },
  medium: { n: 4, k: 4, flavor: 'gentle' },
  hard: { n: 5, k: 4, flavor: 'tricky' },
  pro: { n: 5, k: 5, flavor: 'tricky' },
  extreme: { n: 6, k: 5, flavor: 'tricky' }
};

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const PAR_SEC: Record<Difficulty, number> = {
  easy: 4 * 60,
  medium: 6 * 60,
  hard: 9 * 60,
  pro: 13 * 60,
  extreme: 18 * 60
};
const CELL_PTS = 8;
const HINT_PENALTY = 30;
const ERROR_PENALTY = 10;
const WIN_BONUS = 150;

interface HpSave {
  seed: number;
  marks?: number[][];
  struck?: number[];
  hintsUsed?: number;
  errors?: number;
  assistsUsed?: string[];
}

/* houses are deliberately NEUTRAL (no per-house paint): many puzzles have a
   color category ("The Orange house…"), so a painted house #4 would clash
   with — and mislead about — the color items the clues refer to */
function HouseGlyph({ num }: { num: number }) {
  return (
    <svg viewBox="0 0 24 24" width="31" height="31" aria-hidden="true">
      <path
        d="M3.5 11 L12 3.8 L20.5 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M5.8 10.4 V20 h12.4 V10.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text x="12" y="17.4" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="currentColor">
        {num}
      </text>
    </svg>
  );
}

export function HousePuzzlesGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = savedState as HpSave | undefined;

  const [seed] = useState(() => saved?.seed ?? Math.floor(Math.random() * 2 ** 31));
  const def = useMemo(() => generateHousePuzzle({ seed, ...SIZE[difficulty] }), [seed, difficulty]);
  const n = def.n;
  const k = def.categories.length;

  const [marks, setMarks] = useState<number[][]>(() => {
    const fresh = def.categories.map(() => new Array<number>(n * n).fill(0));
    const sm = saved?.marks;
    const fits =
      Array.isArray(sm) && sm.length === fresh.length && sm.every((b, i) => Array.isArray(b) && b.length === fresh[i].length);
    return fits && sm ? sm : fresh;
  });
  const [struck, setStruck] = useState<Set<number>>(() => new Set(saved?.struck ?? []));
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [toast, setToast] = useState<string | null>(null);

  const done = useRef(false);
  const fullMismatch = useRef(false);
  const undoStack = useRef<number[][][]>([]);
  const toastTimer = useRef<number | null>(null);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  useEffect(() => {
    if (assists.autoCross) assistsUsed.current.add('autoCross');
  }, [assists.autoCross]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  /** truth: does item i of category c live at house h? */
  const truth = useCallback((c: number, i: number, h: number) => (def.solution[c][h] === i ? 2 : 1), [def]);

  const computeScore = useCallback(
    (ms: number[][], hints: number, errs: number): number => {
      let correct = 0;
      for (let c = 0; c < k; c++) {
        for (let x = 0; x < n * n; x++) {
          if (ms[c][x] === 2 && truth(c, Math.floor(x / n), x % n) === 2) correct++;
        }
      }
      return Math.max(0, correct * CELL_PTS * MULT[difficulty] - hints * HINT_PENALTY - errs * ERROR_PENALTY);
    },
    [k, n, truth, difficulty]
  );

  const score = useMemo(() => computeScore(marks, hintsUsed, errors), [computeScore, marks, hintsUsed, errors]);

  const placed = useMemo(() => {
    let m = 0;
    for (let c = 0; c < k; c++) for (let x = 0; x < n * n; x++) if (marks[c][x] === 2) m++;
    return m;
  }, [marks, k, n]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { houses: n, categories: k, placed }
    });
  }, [score, errors, hintsUsed, placed, n, k, events]);

  const finishWin = useCallback(
    (finalMarks: number[][]) => {
      if (done.current) return;
      done.current = true;
      const bonus = WIN_BONUS * MULT[difficulty] + Math.max(0, PAR_SEC[difficulty] - elapsedRef.current);
      events.onFinish({
        outcome: 'won',
        score: computeScore(finalMarks, hintsUsed, errors) + bonus,
        errors,
        hintsUsed,
        assistsUsed: [...assistsUsed.current],
        extra: { houses: n, categories: k }
      });
    },
    [difficulty, events, computeScore, hintsUsed, errors, n, k]
  );

  /** win when every category holds n correct ✓s */
  const evaluate = useCallback(
    (ms: number[][]) => {
      let full = true;
      let correct = true;
      for (let c = 0; c < k; c++) {
        let yes = 0;
        for (let x = 0; x < n * n; x++) {
          if (ms[c][x] === 2) {
            yes++;
            if (truth(c, Math.floor(x / n), x % n) !== 2) correct = false;
          }
        }
        if (yes !== n) {
          full = false;
          break;
        }
      }
      if (full && correct) {
        sfx.pop();
        finishWin(ms);
      } else if (full && !fullMismatch.current) {
        fullMismatch.current = true;
        sfx.error();
        showToast("Every house is assigned, but something doesn't add up…");
      } else if (!full) {
        fullMismatch.current = false;
      }
    },
    [k, n, truth, finishWin]
  );

  const pushUndo = useCallback(() => {
    undoStack.current.push(marks.map((m) => [...m]));
    if (undoStack.current.length > 120) undoStack.current.shift();
  }, [marks]);

  const cellTap = (c: number, i: number, h: number) => {
    if (paused || done.current) return;
    pushUndo();
    const next = marks.map((m) => [...m]);
    const cur = next[c][i * n + h];
    const nm = cur === 0 ? 1 : cur === 1 ? 2 : 0;
    next[c][i * n + h] = nm;
    if (nm === 2 && assists.autoCross) {
      for (let x = 0; x < n; x++) {
        if (x !== h && next[c][i * n + x] === 0) next[c][i * n + x] = 1;
        if (x !== i && next[c][x * n + h] === 0) next[c][x * n + h] = 1;
      }
    }
    setWrong((w) => {
      if (w.size === 0) return w;
      const nw = new Set(w);
      nw.delete(`${c}:${i}:${h}`);
      return nw;
    });
    if (nm === 2) sfx.place();
    else sfx.tap();
    setMarks(next);
    evaluate(next);
  };

  const undo = () => {
    if (paused || done.current) return;
    const prev = undoStack.current.pop();
    if (!prev) return;
    setMarks(prev);
    setWrong(new Set());
    fullMismatch.current = false;
  };

  const check = () => {
    if (paused || done.current || !assists.check) return;
    assistsUsed.current.add('check');
    const bad = new Set<string>();
    let newly = 0;
    for (let c = 0; c < k; c++) {
      for (let x = 0; x < n * n; x++) {
        const m = marks[c][x];
        const i = Math.floor(x / n);
        const h = x % n;
        if (m !== 0 && m !== truth(c, i, h)) {
          const key = `${c}:${i}:${h}`;
          bad.add(key);
          if (!wrong.has(key)) newly++;
        }
      }
    }
    setWrong(bad);
    if (bad.size === 0) {
      sfx.place();
      showToast('No mistakes so far.');
    } else {
      setErrors((e) => e + newly);
      sfx.error();
      showToast(`${bad.size} wrong mark${bad.size > 1 ? 's' : ''} highlighted.`);
    }
  };

  const hint = () => {
    if (paused || done.current || !assists.hint) return;
    const next = marks.map((m) => [...m]);
    let fixed = false;
    outer: for (let c = 0; c < k; c++) {
      for (let x = 0; x < n * n; x++) {
        const t = truth(c, Math.floor(x / n), x % n);
        if (next[c][x] !== 0 && next[c][x] !== t) {
          next[c][x] = t;
          fixed = true;
          break outer;
        }
      }
    }
    if (!fixed) {
      const options: [number, number, number][] = [];
      for (let c = 0; c < k; c++) {
        for (let h = 0; h < n; h++) {
          const i = def.solution[c][h];
          if (next[c][i * n + h] !== 2) options.push([c, i, h]);
        }
      }
      if (options.length === 0) return;
      const [c, i, h] = options[Math.floor(Math.random() * options.length)];
      next[c][i * n + h] = 2;
      if (assists.autoCross) {
        for (let x = 0; x < n; x++) {
          if (x !== h && next[c][i * n + x] === 0) next[c][i * n + x] = 1;
          if (x !== i && next[c][x * n + h] === 0) next[c][x * n + h] = 1;
        }
      }
    }
    pushUndo();
    assistsUsed.current.add('hint');
    setHintsUsed((v) => v + 1);
    setWrong(new Set());
    sfx.hint();
    setMarks(next);
    evaluate(next);
  };

  useEffect(() => {
    registerSnapshot(() => ({
      seed,
      marks,
      struck: [...struck],
      hintsUsed,
      errors,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  return (
    <div className={`house-puzzles ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{n} houses</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Placed: <b>{placed} / {k * n}</b>
        </span>
      </div>
      <p className="hp-story">
        {n} houses in a row — match every category to the right house using the clues.
      </p>

      <div className="hp-board-wrap">
        <div
          className="hp-board"
          style={{ gridTemplateColumns: `20px auto repeat(${n}, var(--hp-cell))` }}
        >
          <div className="hp-corner" style={{ gridColumn: '1 / 3' }} />
          {Array.from({ length: n }, (_, h) => (
            <div key={h} className="hp-house">
              <HouseGlyph num={h + 1} />
            </div>
          ))}
          {def.categories.map((cat, c) => (
            <Fragment key={cat.id}>
              {c > 0 && <div className="hp-gap" style={{ gridColumn: '1 / -1' }} />}
              <span className="hp-cat" style={{ gridRow: `span ${n}` }}>
                {cat.name}
              </span>
              {cat.items.map((it, i) => (
                <Fragment key={it}>
                  <span className="hp-item">{it}</span>
                  {Array.from({ length: n }, (_, h) => {
                    const m = marks[c][i * n + h];
                    const isWrong = wrong.has(`${c}:${i}:${h}`);
                    return (
                      <button
                        key={h}
                        className={`hp-cell ${m === 2 ? 'yes' : m === 1 ? 'no' : ''} ${isWrong ? 'wrong' : ''}`}
                        onClick={() => cellTap(c, i, h)}
                        aria-label={`${it} × house ${h + 1}`}
                      >
                        {m === 2 ? '✓' : m === 1 ? '✕' : ''}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="game-tools fx-card">
        <ol className="hp-clues">
          {def.clues.map((cl, idx) => (
            <li key={idx}>
              <button
                className={`hp-clue ${struck.has(idx) ? 'struck' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setStruck((s) => {
                    const nx = new Set(s);
                    if (nx.has(idx)) nx.delete(idx);
                    else nx.add(idx);
                    return nx;
                  });
                }}
              >
                {idx + 1}. {clueText(def, cl)}
              </button>
            </li>
          ))}
        </ol>

        <div className="sudoku-controls">
          <PadTool onClick={undo} disabled={undoStack.current.length === 0}>
            <RestartIcon />
            <span>Undo</span>
          </PadTool>
          {assists.check && (
            <PadTool silent onClick={check}>
              <CheckIcon />
              <span>Check</span>
            </PadTool>
          )}
          {assists.hint && (
            <PadTool silent onClick={hint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
        </div>
        <p className="ms-hint-text">Tap a cell to cycle ✕ → ✓ → blank · tap a clue to cross it off</p>
      </div>

      {toast && <div className="hp-toast">{toast}</div>}
    </div>
  );
}
