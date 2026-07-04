import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import type { PuzzleDef } from './logic/types';
import { makePairs, truthAt } from './logic/solver';
import { clueText, generatePuzzle } from './logic/generator';
import { buildPreset, presetById, PRESET_TIERS } from './logic/presets';
import { loadSolvedPresets, markPresetSolved } from './logic/progress';

type LgSource = { kind: 'preset'; presetId: string } | { kind: 'random'; seed: number };

interface LgSave {
  source: LgSource | null;
  marks?: number[][];
  struck?: number[];
  hintsUsed?: number;
  errors?: number;
  assistsUsed?: string[];
}

const RANDOM_SIZE: Record<Difficulty, { k: number; n: number; flavor: 'gentle' | 'balanced' | 'tricky' }> = {
  easy: { k: 3, n: 3, flavor: 'gentle' },
  medium: { k: 4, n: 4, flavor: 'balanced' },
  hard: { k: 4, n: 5, flavor: 'tricky' }
};

const PAR_SEC: Record<number, number> = { 3: 4 * 60, 4: 8 * 60, 5: 13 * 60 };
const CELL_PTS = 8;
const HINT_PENALTY = 30;
const ERROR_PENALTY = 10;
const WIN_BONUS = 120;

function buildFromSource(source: LgSource, difficulty: Difficulty): PuzzleDef {
  if (source.kind === 'preset') {
    const entry = presetById(source.presetId);
    if (entry) return buildPreset(entry);
  }
  const size = RANDOM_SIZE[difficulty];
  const seed = source.kind === 'random' ? source.seed : 1;
  return generatePuzzle({ seed, ...size });
}

const multFor = (def: PuzzleDef): number => {
  const n = def.categories[0].items.length;
  const k = def.categories.length;
  return (n === 3 ? 1 : n === 4 ? 2 : 3) + (k >= 4 ? 1 : 0);
};

export function LogicGridGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot,
  holdClock
}: GameProps) {
  const saved = savedState as LgSave | undefined;

  const [source, setSource] = useState<LgSource | null>(saved?.source ?? null);
  const def = useMemo(() => (source ? buildFromSource(source, difficulty) : null), [source, difficulty]);
  const n = def ? def.categories[0].items.length : 0;
  const k = def ? def.categories.length : 0;
  const pi = useMemo(() => (def ? makePairs(def.categories.length) : null), [def]);

  const blankMarks = useCallback(
    (d: PuzzleDef) => makePairs(d.categories.length).pairs.map(() => new Array<number>(d.categories[0].items.length ** 2).fill(0)),
    []
  );

  const [marks, setMarks] = useState<number[][]>(() => {
    if (!def) return [];
    const fresh = blankMarks(def);
    // a save whose marks don't fit the rebuilt puzzle (e.g. its preset no
    // longer resolves and the fallback differs) must not crash the grid
    const sm = saved?.marks;
    const fits =
      Array.isArray(sm) &&
      sm.length === fresh.length &&
      sm.every((b, i) => Array.isArray(b) && b.length === fresh[i].length);
    return fits && sm ? sm : fresh;
  });
  const [struck, setStruck] = useState<Set<number>>(() => new Set(saved?.struck ?? []));
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [tab, setTab] = useState<'clues' | 'answers'>('clues');
  const [solvedPresets, setSolvedPresets] = useState<Set<string>>(() => loadSolvedPresets());
  const [hover, setHover] = useState<{ b: string; i: number; j: number } | null>(null);
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

  // the clock only runs once a puzzle is actually chosen — not on the picker
  useEffect(() => {
    holdClock(source === null);
  }, [source, holdClock]);

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

  /** user mark at (row-cat r, item i) × (col-cat c, item j) */
  const cellAt = useCallback(
    (ms: number[][], r: number, i: number, c: number, j: number): number => {
      if (!pi) return 0;
      return r < c ? ms[pi.idx[r][c]][i * n + j] : ms[pi.idx[c][r]][j * n + i];
    },
    [pi, n]
  );

  const writeCell = useCallback(
    (ms: number[][], r: number, i: number, c: number, j: number, m: number) => {
      if (!pi) return;
      if (r < c) ms[pi.idx[r][c]][i * n + j] = m;
      else ms[pi.idx[c][r]][j * n + i] = m;
    },
    [pi, n]
  );

  const computeScore = useCallback(
    (ms: number[][], hints: number, errs: number): number => {
      if (!def || !pi) return 0;
      let correct = 0;
      for (let p = 0; p < pi.pairs.length; p++) {
        const [a, b] = pi.pairs[p];
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (ms[p]?.[i * n + j] === 2 && truthAt(def, a, i, b, j) === 2) correct++;
          }
        }
      }
      return Math.max(0, correct * CELL_PTS * multFor(def) - hints * HINT_PENALTY - errs * ERROR_PENALTY);
    },
    [def, pi, n]
  );

  const score = useMemo(() => computeScore(marks, hintsUsed, errors), [computeScore, marks, hintsUsed, errors]);

  const matches = useMemo(() => {
    if (!def || !pi) return 0;
    let m = 0;
    for (let c = 1; c < k; c++) {
      for (let x = 0; x < n * n; x++) if (marks[pi.idx[0][c]]?.[x] === 2) m++;
    }
    return m;
  }, [def, pi, marks, k, n]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: {
        mode: source ? source.kind : 'menu',
        puzzle: def?.title ?? '—',
        matches
      }
    });
  }, [score, errors, hintsUsed, matches, source, def, events]);

  const finishWin = useCallback(
    (finalMarks: number[][]) => {
      if (done.current || !def) return;
      done.current = true;
      if (source?.kind === 'preset') {
        markPresetSolved(source.presetId);
        setSolvedPresets(loadSolvedPresets());
      }
      const mult = multFor(def);
      const par = PAR_SEC[n] ?? 8 * 60;
      const bonus = WIN_BONUS * mult + Math.max(0, par - elapsedRef.current);
      events.onFinish({
        outcome: 'won',
        score: computeScore(finalMarks, hintsUsed, errors) + bonus,
        errors,
        hintsUsed,
        assistsUsed: [...assistsUsed.current],
        extra: { mode: source?.kind ?? 'random', puzzle: def.title }
      });
    },
    [def, source, events, computeScore, errors, hintsUsed, n]
  );

  /** After any marks change: win if every block has n correct ✓s. */
  const evaluate = useCallback(
    (ms: number[][]) => {
      if (!def || !pi) return;
      let full = true;
      let correct = true;
      for (let p = 0; p < pi.pairs.length; p++) {
        const [a, b] = pi.pairs[p];
        let yes = 0;
        for (let i = 0; i < n && full; i++) {
          for (let j = 0; j < n; j++) {
            if (ms[p][i * n + j] === 2) {
              yes++;
              if (truthAt(def, a, i, b, j) !== 2) correct = false;
            }
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
        showToast("Every block is filled, but something doesn't add up…");
      } else if (!full) {
        fullMismatch.current = false;
      }
    },
    [def, pi, n, finishWin]
  );

  const pushUndo = useCallback(() => {
    undoStack.current.push(marks.map((m) => [...m]));
    if (undoStack.current.length > 120) undoStack.current.shift();
  }, [marks]);

  const cellTap = (r: number, i: number, c: number, j: number) => {
    if (paused || done.current || !def) return;
    pushUndo();
    const next = marks.map((m) => [...m]);
    const cur = cellAt(next, r, i, c, j);
    const nm = cur === 0 ? 1 : cur === 1 ? 2 : 0;
    writeCell(next, r, i, c, j, nm);
    if (nm === 2 && assists.autoCross) {
      for (let x = 0; x < n; x++) {
        if (x !== j && cellAt(next, r, i, c, x) === 0) writeCell(next, r, i, c, x, 1);
        if (x !== i && cellAt(next, r, x, c, j) === 0) writeCell(next, r, x, c, j, 1);
      }
    }
    setWrong((w) => {
      if (w.size === 0) return w;
      const nw = new Set(w);
      nw.delete(`${r}:${i}:${c}:${j}`);
      nw.delete(`${c}:${j}:${r}:${i}`);
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
    if (paused || done.current || !def || !pi || !assists.check) return;
    assistsUsed.current.add('check');
    const bad = new Set<string>();
    let newly = 0;
    for (let p = 0; p < pi.pairs.length; p++) {
      const [a, b] = pi.pairs[p];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const m = marks[p][i * n + j];
          if (m !== 0 && m !== truthAt(def, a, i, b, j)) {
            const key = `${a}:${i}:${b}:${j}`;
            bad.add(key);
            if (!wrong.has(key)) newly++;
          }
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
    if (paused || done.current || !def || !pi || !assists.hint) return;
    const next = marks.map((m) => [...m]);
    let fixed = false;
    // fix an existing mistake first
    outer: for (let p = 0; p < pi.pairs.length; p++) {
      const [a, b] = pi.pairs[p];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const m = next[p][i * n + j];
          const t = truthAt(def, a, i, b, j);
          if (m !== 0 && m !== t) {
            next[p][i * n + j] = t;
            fixed = true;
            break outer;
          }
        }
      }
    }
    if (!fixed) {
      // reveal one missing ✓ (most informative), preferring the primary blocks
      const options: [number, number, number, number][] = [];
      for (let p = 0; p < pi.pairs.length; p++) {
        const [a, b] = pi.pairs[p];
        for (let e = 0; e < n; e++) {
          const i = def.solution[a][e];
          const j = def.solution[b][e];
          if (next[p][i * n + j] !== 2) options.push([p, i, j, a === 0 ? 0 : 1]);
        }
      }
      if (options.length === 0) return; // nothing to reveal — no undo entry
      options.sort((x, y) => x[3] - y[3]);
      const primaries = options.filter((o) => o[3] === 0);
      const list = primaries.length > 0 ? primaries : options;
      const [p, i, j] = list[Math.floor(Math.random() * list.length)];
      next[p][i * n + j] = 2;
      if (assists.autoCross) {
        for (let x = 0; x < n; x++) {
          if (x !== j && next[p][i * n + x] === 0) next[p][i * n + x] = 1;
          if (x !== i && next[p][x * n + j] === 0) next[p][x * n + j] = 1;
        }
      }
    }
    pushUndo();
    assistsUsed.current.add('hint');
    setHintsUsed((h) => h + 1);
    setWrong(new Set());
    sfx.hint();
    setMarks(next);
    evaluate(next);
  };

  const startPuzzle = (src: LgSource) => {
    const d = buildFromSource(src, difficulty);
    undoStack.current = [];
    fullMismatch.current = false;
    setSource(src);
    setMarks(blankMarks(d));
    setStruck(new Set());
    setWrong(new Set());
    setTab('clues');
    sfx.tap();
  };

  useEffect(() => {
    registerSnapshot(() => ({
      source,
      marks,
      struck: [...struck],
      hintsUsed,
      errors,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  /* ---------- menu ---------- */

  if (!def || !pi || !source) {
    return (
      <div className={`logic-grid ${paused ? 'board-hidden' : ''}`}>
        <div className="lg-menu">
          <button className="lg-random fx-card" onClick={() => startPuzzle({ kind: 'random', seed: Math.floor(Math.random() * 2 ** 31) })}>
            <span className="lg-random-title">Random puzzle</span>
            <span className="lg-random-sub">
              Freshly generated on <b>{difficulty}</b> — always one unique, guess-free solution.
            </span>
          </button>
          {PRESET_TIERS.map((tier) => {
            const solvedCount = tier.entries.filter((p) => solvedPresets.has(p.id)).length;
            return (
              <section key={tier.id} className="lg-tier">
                <h3 className="lg-tier-name">
                  {tier.name}
                  <span className="lg-tier-progress">
                    {solvedCount}/{tier.entries.length}
                  </span>
                </h3>
                <p className="lg-tier-blurb">{tier.blurb}</p>
                <div className="lg-presets">
                  {tier.entries.map((p) => (
                    <button key={p.id} className="lg-preset fx-card" onClick={() => startPuzzle({ kind: 'preset', presetId: p.id })}>
                      <span className="lg-preset-title">{p.title}</span>
                      <span className="lg-preset-meta">
                        {p.k}×{p.n}
                        {solvedPresets.has(p.id) && <span className="lg-solved">✓ solved</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- play ---------- */

  const rowGroups = [0, ...Array.from({ length: k - 2 }, (_, x) => k - 1 - x)];
  const colGroups = Array.from({ length: k - 1 }, (_, x) => x + 1);
  const blocksFor = (r: number) => (r === 0 ? colGroups : colGroups.filter((c) => c < r));

  return (
    <div className={`logic-grid ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{def.title}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Matches: <b>{matches} / {n * (k - 1)}</b>
        </span>
      </div>
      <p className="lg-story">{def.story}</p>

      <div className="lg-play">
        <div className="lg-board-wrap">
          <div className="lg-board" style={{ gridTemplateColumns: `auto repeat(${k - 1}, ${n}fr)` }}>
            <div className="lg-corner" />
            {colGroups.map((c) => (
              <div key={c} className="lg-colhead">
                <span className="lg-cat-name">{def.categories[c].name}</span>
                <div className="lg-collabels" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                  {def.categories[c].items.map((it) => (
                    <span key={it} className="lg-collabel">
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {rowGroups.map((r) => (
              <div key={r} className="lg-boardrow" style={{ gridColumn: `1 / ${k + 1}`, display: 'contents' }}>
                <div className="lg-rowhead">
                  <span className="lg-cat-name vertical">{def.categories[r].name}</span>
                  <div className="lg-rowlabels" style={{ gridTemplateRows: `repeat(${n}, 1fr)` }}>
                    {def.categories[r].items.map((it) => (
                      <span key={it} className="lg-rowlabel">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
                {colGroups.map((c) => {
                  if (!blocksFor(r).includes(c)) return <div key={c} className="lg-hole" />;
                  const bid = `${r}-${c}`;
                  return (
                    <div key={c} className="lg-block" onPointerLeave={() => setHover(null)}>
                      <div className="lg-block-inner" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                        {Array.from({ length: n * n }, (_, x) => {
                          const i = Math.floor(x / n);
                          const j = x % n;
                          const m = cellAt(marks, r, i, c, j);
                          const a = Math.min(r, c);
                          const b = Math.max(r, c);
                          const key = r < c ? `${a}:${i}:${b}:${j}` : `${a}:${j}:${b}:${i}`;
                          const isWrong = wrong.has(key);
                          const peer = hover && hover.b === bid && (hover.i === i || hover.j === j) && !(hover.i === i && hover.j === j);
                          return (
                            <button
                              key={x}
                              className={`lg-cell ${m === 2 ? 'yes' : m === 1 ? 'no' : ''} ${isWrong ? 'wrong' : ''} ${peer ? 'peer' : ''}`}
                              onClick={() => cellTap(r, i, c, j)}
                              onPointerEnter={() => setHover({ b: bid, i, j })}
                              aria-label={`${def.categories[r].items[i]} × ${def.categories[c].items[j]}`}
                            >
                              {m === 2 ? '✓' : m === 1 ? '✕' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="game-tools fx-card">
          <div className="sudoku-controls">
            <PadTool active={tab === 'clues'} onClick={() => setTab('clues')}>
              <span>Clues</span>
            </PadTool>
            <PadTool active={tab === 'answers'} onClick={() => setTab('answers')}>
              <span>Answers</span>
            </PadTool>
          </div>

          {tab === 'clues' ? (
            <ol className="lg-clues">
              {def.clues.map((cl, idx) => (
                <li key={idx}>
                  <button
                    className={`lg-clue ${struck.has(idx) ? 'struck' : ''}`}
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
          ) : (
            <div className="lg-answers">
              <table className="lg-answer-table">
                <thead>
                  <tr>
                    <th>{def.categories[0].name}</th>
                    {colGroups.map((c) => (
                      <th key={c}>{def.categories[c].name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {def.categories[0].items.map((it, i) => (
                    <tr key={it}>
                      <td>{it}</td>
                      {colGroups.map((c) => {
                        let found = '—';
                        for (let j = 0; j < n; j++) {
                          if (marks[pi.idx[0][c]][i * n + j] === 2) found = def.categories[c].items[j];
                        }
                        return <td key={c}>{found}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="lg-answers-note">Filled in automatically from the ✓ marks on the grid.</p>
            </div>
          )}

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
      </div>

      {toast && <div className="lg-toast">{toast}</div>}
    </div>
  );
}
