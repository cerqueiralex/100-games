import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, EraseIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { CONFIG, isConsistent, randomCode, scoreGuess, type GuessRecord } from './logic/game';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_PTS = 150;
const UNUSED_PTS = 25;
const EXACT_PTS = 10;
const HINT_PENALTY = 40;
const MAX_HINTS = 2;

/** Accessible color names, index-aligned with the .cbk-c* palette classes. */
export const COLOR_NAMES = [
  'green',
  'red',
  'yellow',
  'blue',
  'orange',
  'purple',
  'sky',
  'tan',
  'magenta'
];

/**
 * Colorblind-support glyph baked into every peg of a given color — each of
 * the nine colors has a unique small shape (dot, cross, triangle, square,
 * ring, diamond, bar, chevron, plus). Drawn in fixed --ink via CSS.
 */
export function PegGlyph({ c }: { c: number }) {
  return (
    <svg className="cbk-glyph" viewBox="0 0 20 20" aria-hidden>
      {c === 0 && <circle cx="10" cy="10" r="3.6" fill="currentColor" />}
      {c === 1 && (
        <path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
      {c === 2 && <path d="M10 5.4l4.7 8.4H5.3Z" fill="currentColor" />}
      {c === 3 && <rect x="6.3" y="6.3" width="7.4" height="7.4" rx="1.2" fill="currentColor" />}
      {c === 4 && <circle cx="10" cy="10" r="3.9" fill="none" stroke="currentColor" strokeWidth="2.5" />}
      {c === 5 && <path d="M10 4.6l5.4 5.4-5.4 5.4-5.4-5.4Z" fill="currentColor" />}
      {c === 6 && <rect x="5" y="8.6" width="10" height="2.8" rx="1.4" fill="currentColor" />}
      {c === 7 && (
        <path d="M5.6 12.6L10 7.4l4.4 5.2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {c === 8 && (
        <path d="M10 5.4v9.2M5.4 10h9.2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

/** tiny padlock marking a hint-locked slot (monochrome, currentColor) */
function MiniLock() {
  return (
    <svg className="cbk-lock" viewBox="0 0 12 12" aria-hidden>
      <rect x="2.4" y="5" width="7.2" height="5.4" rx="1.6" fill="currentColor" />
      <path d="M4 5V3.8a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

interface CbkSave {
  secret: number[];
  history: GuessRecord[];
  current: (number | null)[];
  locked: (number | null)[];
  hintsUsed: number;
  struck: number[];
  assistsUsed: string[];
}

const firstEmpty = (row: (number | null)[]): number | null => {
  const i = row.findIndex((v) => v == null);
  return i === -1 ? null : i;
};

export function CodeBreakerGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = CONFIG[difficulty];
  const mult = MULT[difficulty];
  const saved = savedState as CbkSave | undefined;

  const [secret] = useState<number[]>(() => saved?.secret ?? randomCode(cfg));
  const [history, setHistory] = useState<GuessRecord[]>(() => saved?.history ?? []);
  const [current, setCurrent] = useState<(number | null)[]>(
    () => saved?.current ?? Array.from({ length: cfg.slots }, () => null)
  );
  const [locked, setLocked] = useState<(number | null)[]>(
    () => saved?.locked ?? Array.from({ length: cfg.slots }, () => null)
  );
  const [selected, setSelected] = useState<number | null>(() =>
    firstEmpty(saved?.current ?? Array.from({ length: cfg.slots }, () => null))
  );
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [struck, setStruck] = useState<Set<number>>(() => new Set(saved?.struck ?? []));
  /** feedback pegs of the newest row pop in one by one */
  const [anim, setAnim] = useState<{ row: number; shown: number } | null>(null);
  // re-derive a decided outcome from a save made during the reveal window,
  // so a resumed game can never sit unfinished with a solved/out-of-guesses board
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(() => {
    const h = saved?.history;
    if (!h || h.length === 0) return null;
    if (h[h.length - 1].exact === cfg.slots) return 'won';
    if (h.length >= cfg.guesses) return 'lost';
    return null;
  });

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const histRef = useRef<HTMLDivElement>(null);

  const busy = paused || anim !== null || outcome !== null;
  const errors = useMemo(() => history.filter((h) => h.exact === 0).length, [history]);
  const bestExact = useMemo(() => history.reduce((m, h) => Math.max(m, h.exact), 0), [history]);
  const liveScore = Math.max(0, bestExact * EXACT_PTS * mult - hintsUsed * HINT_PENALTY);
  const finalWinScore = () =>
    Math.max(
      0,
      WIN_PTS * mult + (cfg.guesses - history.length) * UNUSED_PTS * mult - hintsUsed * HINT_PENALTY
    );

  // passive assists count as help whenever enabled while the game can still use them
  useEffect(() => {
    if (assists.notes && !done.current) assistsUsed.current.add('notes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.notes]);
  useEffect(() => {
    if (assists.consistency && !done.current) assistsUsed.current.add('consistency');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assists.consistency]);

  useEffect(() => {
    events.onStats({
      score: outcome === 'won' ? finalWinScore() : liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { guesses: history.length, limit: cfg.guesses, bestExact }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, hintsUsed, errors, liveScore, outcome, assists.notes, assists.consistency]);

  // feedback pegs reveal one by one: sfx.pop for filled (exact), sfx.tap for
  // hollow (present); when the newest row finishes revealing, decide the game
  useEffect(() => {
    if (!anim || paused) return;
    const rec = history[anim.row];
    if (!rec) return;
    const total = rec.exact + rec.present;
    if (anim.shown >= total) {
      const t = window.setTimeout(() => {
        setAnim(null);
        const won = rec.exact === cfg.slots;
        if (won) setOutcome('won');
        else if (history.length >= cfg.guesses) setOutcome('lost');
      }, total === 0 ? 320 : 240);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      if (anim.shown < rec.exact) sfx.pop();
      else sfx.tap();
      setAnim((a) => (a ? { ...a, shown: a.shown + 1 } : a));
    }, 185);
    return () => clearTimeout(t);
  }, [anim, paused, history, cfg.slots, cfg.guesses]);

  // finish AFTER the cover-slide flourish so the reveal is visible.
  // Keyed on `outcome` only: it transitions exactly once (null -> won/lost).
  useEffect(() => {
    if (!outcome || done.current) return;
    done.current = true;
    const payload = {
      outcome,
      score: outcome === 'won' ? finalWinScore() : liveScore,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { guesses: history.length, limit: cfg.guesses, bestExact }
    };
    const t = window.setTimeout(() => events.onFinish(payload), 1150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  useEffect(() => {
    registerSnapshot(() => ({
      secret,
      history,
      current,
      locked,
      hintsUsed,
      struck: [...struck],
      assistsUsed: [...assistsUsed.current]
    }));
  });

  // keep the newest guess in view
  useEffect(() => {
    const el = histRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length]);

  const placeColor = (c: number) => {
    if (busy) return;
    let idx = selected != null && locked[selected] == null ? selected : null;
    if (idx == null) idx = firstEmpty(current);
    if (idx == null || locked[idx] != null) return;
    sfx.tap();
    const next = current.slice();
    next[idx] = c;
    setCurrent(next);
    const at = idx;
    const after = next.findIndex((v, i) => v == null && i > at);
    const any = firstEmpty(next);
    setSelected(after !== -1 ? after : any);
  };

  const erase = () => {
    if (busy) return;
    let idx =
      selected != null && current[selected] != null && locked[selected] == null ? selected : -1;
    if (idx === -1) {
      for (let i = current.length - 1; i >= 0; i--) {
        if (current[i] != null && locked[i] == null) {
          idx = i;
          break;
        }
      }
    }
    if (idx === -1) return;
    const next = current.slice();
    next[idx] = null;
    setCurrent(next);
    setSelected(idx);
  };

  const tapSlot = (i: number) => {
    if (busy || locked[i] != null) return;
    sfx.tap();
    setSelected(i);
  };

  const toggleStruck = (c: number) => {
    if (paused || outcome) return;
    sfx.tap();
    setStruck((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const hint = () => {
    if (busy || !assists.hint || hintsUsed >= MAX_HINTS) return;
    const unlocked: number[] = [];
    for (let i = 0; i < cfg.slots; i++) if (locked[i] == null) unlocked.push(i);
    if (unlocked.length <= 1) return; // always leave at least one slot to deduce
    const pos = unlocked[Math.floor(Math.random() * unlocked.length)];
    assistsUsed.current.add('hint');
    sfx.hint();
    setHintsUsed((h) => h + 1);
    const color = secret[pos];
    setLocked((l) => {
      const n = l.slice();
      n[pos] = color;
      return n;
    });
    const next = current.slice();
    next[pos] = color;
    setCurrent(next);
    if (selected === pos || selected == null) setSelected(firstEmpty(next));
  };

  const full = current.every((v) => v != null);
  const canSubmit = full && !busy && history.length < cfg.guesses;
  const inconsistent =
    assists.consistency && full && history.length > 0 && !isConsistent(current as number[], history);

  const submit = () => {
    if (!canSubmit) return;
    sfx.place();
    const guess = current.map((v) => v as number);
    const fb = scoreGuess(secret, guess);
    const nextHist = [...history, { guess, exact: fb.exact, present: fb.present }];
    setHistory(nextHist);
    const fresh = locked.slice();
    setCurrent(fresh);
    setSelected(firstEmpty(fresh));
    setAnim({ row: nextHist.length - 1, shown: 0 });
  };

  const fbCols = Math.ceil(cfg.slots / 2);
  // 7+ colors wrap to two palette rows so swatches keep full touch size on phones
  const paletteCols = cfg.colors <= 6 ? cfg.colors : Math.ceil(cfg.colors / 2);
  const hintsLeft = MAX_HINTS - hintsUsed;

  return (
    <div className={`code-breaker ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Guess <b>{Math.min(history.length + 1, cfg.guesses)} / {cfg.guesses}</b>
        </span>
        <span className="info-item">
          <b>{(outcome === 'won' ? finalWinScore() : liveScore).toLocaleString()}</b> pts
        </span>
        {cfg.allowDupes ? (
          <span className="chip accent">Repeats allowed</span>
        ) : (
          <span className="chip muted">No repeats</span>
        )}
      </div>

      <div className="cbk-board">
        {/* the secret code, hidden behind a sliding cover until the game ends */}
        <div className={`cbk-secret ${outcome ? `done ${outcome}` : ''}`}>
          <span className="cbk-label">Code</span>
          <div className="cbk-secret-pegs">
            {secret.map((c, i) =>
              outcome ? (
                <span
                  key={i}
                  className={`cbk-peg cbk-c${c} pop`}
                  style={{ animationDelay: `${0.45 + i * 0.11}s` }}
                >
                  <PegGlyph c={c} />
                </span>
              ) : (
                <span key={i} className="cbk-peg hole" />
              )
            )}
            <div className={`cbk-cover ${outcome ? 'open' : ''}`} aria-hidden>
              {secret.map((_, i) => (
                <i key={i}>?</i>
              ))}
            </div>
          </div>
        </div>

        {/* past guesses stack upward; the list scrolls internally when long */}
        <div className="cbk-history" ref={histRef}>
          {history.length === 0 && (
            <p className="cbk-empty">Pick colors below, then submit your first guess.</p>
          )}
          {history.map((rec, r) => {
            const shown = anim?.row === r ? anim.shown : rec.exact + rec.present;
            return (
              <div className="cbk-row" key={r}>
                <span className="cbk-rownum">{r + 1}</span>
                <div className="cbk-pegs">
                  {rec.guess.map((c, i) => (
                    <span key={i} className={`cbk-peg cbk-c${c}`}>
                      <PegGlyph c={c} />
                    </span>
                  ))}
                </div>
                <div
                  className="cbk-fb"
                  style={{ gridTemplateColumns: `repeat(${fbCols}, auto)` }}
                  aria-label={`${rec.exact} exact, ${rec.present} wrong position`}
                >
                  {Array.from({ length: cfg.slots }, (_, i) => {
                    const kind = i < rec.exact ? 'exact' : i < rec.exact + rec.present ? 'present' : 'none';
                    return (
                      <i
                        key={i}
                        className={`cbk-fbpeg ${kind} ${kind !== 'none' && i < shown ? 'in' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* color-elimination notes (passive assist) */}
        {assists.notes && !outcome && (
          <div className="cbk-notes">
            <span className="cbk-label">Rule out</span>
            <div className="cbk-notes-pegs">
              {Array.from({ length: cfg.colors }, (_, c) => (
                <button
                  key={c}
                  className={`cbk-note cbk-c${c} ${struck.has(c) ? 'off' : ''}`}
                  aria-pressed={struck.has(c)}
                  aria-label={`${COLOR_NAMES[c]} ${struck.has(c) ? 'ruled out' : 'possible'}`}
                  onClick={() => toggleStruck(c)}
                >
                  <PegGlyph c={c} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* the guess being composed */}
        {!outcome && (
          <div className={`cbk-current ${inconsistent ? 'warn' : ''}`}>
            <span className="cbk-rownum">{Math.min(history.length + 1, cfg.guesses)}</span>
            <div className="cbk-slots">
              {current.map((c, i) => (
                <button
                  key={i}
                  className={[
                    'cbk-slot',
                    c != null ? `filled cbk-c${c}` : 'empty',
                    selected === i ? 'sel' : '',
                    locked[i] != null ? 'locked' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => tapSlot(i)}
                  aria-label={
                    locked[i] != null
                      ? `Slot ${i + 1}: ${COLOR_NAMES[c as number]}, locked by hint`
                      : c != null
                        ? `Slot ${i + 1}: ${COLOR_NAMES[c]}`
                        : `Slot ${i + 1}: empty`
                  }
                >
                  {c != null && <PegGlyph c={c} />}
                  {locked[i] != null && <MiniLock />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!outcome && (
        <div className="game-tools fx-card">
          {inconsistent && (
            <p className="cbk-warn-note">This guess contradicts earlier feedback</p>
          )}
          <div
            className="cbk-palette"
            style={{ gridTemplateColumns: `repeat(${paletteCols}, 1fr)` }}
          >
            {Array.from({ length: cfg.colors }, (_, c) => (
              <button
                key={c}
                className={`cbk-swatch cbk-c${c} ${assists.notes && struck.has(c) ? 'off' : ''}`}
                onClick={() => placeColor(c)}
                aria-label={`Place ${COLOR_NAMES[c]}`}
              >
                <PegGlyph c={c} />
              </button>
            ))}
          </div>
          <div className="cbk-actions">
            <PadTool onClick={erase} disabled={busy}>
              <EraseIcon />
              <span>Erase</span>
            </PadTool>
            {assists.hint && (
              <PadTool silent onClick={hint} disabled={busy || hintsLeft <= 0}>
                <BulbIcon />
                <span>Hint ({hintsLeft})</span>
              </PadTool>
            )}
            <PadTool
              silent
              className={`cbk-submit ${canSubmit ? 'ready' : ''}`}
              onClick={submit}
              disabled={!canSubmit}
            >
              <CheckIcon />
              <span>Submit</span>
            </PadTool>
          </div>
        </div>
      )}
    </div>
  );
}
