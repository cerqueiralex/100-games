import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, CheckIcon, FlagIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { DICTS, shortestPath, wordSet } from './logic/words';
import { generateLadder, LADDER_CONFIG, type Ladder } from './logic/generator';

const MULT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, pro: 4, extreme: 5 };
const WIN_BONUS: Record<Difficulty, number> = { easy: 120, medium: 240, hard: 360, pro: 480, extreme: 600 };
const EFF_BASE: Record<Difficulty, number> = { easy: 150, medium: 300, hard: 450, pro: 600, extreme: 750 };
const HINT_PENALTY = 60;
const ERROR_PENALTY = 15;
const RUNG_POINTS = 15;

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface LadderSave {
  ladder: Ladder;
  rungs: string[];
  errors: number;
  hintsUsed: number;
  assistsUsed: string[];
}

function isSave(s: unknown): s is LadderSave {
  return !!s && Array.isArray((s as LadderSave).rungs) && !!(s as LadderSave).ladder;
}

/**
 * One committed word as a row of letter tiles. Module-level so React keeps a
 * stable component identity — otherwise every render would remount the rows
 * and replay the cascade-flip on each keystroke.
 */
function LadderRow({ word, kind, animate }: { word: string; kind: string; animate?: boolean }) {
  return (
    <div className={`wlad-row wlad-${kind}${animate ? ' enter' : ''}`}>
      {word.split('').map((ch, i) => (
        <span
          key={i}
          className="wlad-tile"
          style={animate ? ({ '--i': i } as CSSProperties) : undefined}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

export function WordLadderGame({
  difficulty,
  assists,
  paused,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const saved = isSave(savedState) ? savedState : undefined;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ladder = useMemo(() => saved?.ladder ?? generateLadder({ difficulty }), [difficulty]);
  const dict = DICTS[ladder.length];
  const dictSet = wordSet(ladder.length);
  const len = ladder.length;

  const [rungs, setRungs] = useState<string[]>(() => saved?.rungs ?? []);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [won, setWon] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  // top word = last committed rung, or the start
  const topWord = rungs.length ? rungs[rungs.length - 1] : ladder.start;

  // the editable "next" row, pre-filled with the current top word
  const [draft, setDraft] = useState<string[]>(() => topWord.split(''));
  const [selPos, setSelPos] = useState(0);

  const assistsUsed = useRef<Set<string>>(
    new Set([...(saved?.assistsUsed ?? []), ...(assists.parMeter ? ['parMeter'] : [])])
  );
  const done = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDist = useRef<number | null>(null);

  const usedWords = useMemo(() => new Set<string>([ladder.start, ...rungs]), [ladder.start, rungs]);

  // keep the draft aligned with the current top word whenever the ladder
  // changes underneath it (rung committed, undo, hint, resume)
  const syncDraft = useCallback((word: string) => {
    setDraft(word.split(''));
    setSelPos(0);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 420);
  }, []);

  // BFS distance from a word to the goal (always reachable — same component)
  const distanceTo = useCallback(
    (word: string): number => {
      if (word === ladder.end) return 0;
      const p = shortestPath(word, ladder.end, dict);
      return p ? p.length - 1 : Infinity;
    },
    [dict, ladder.end]
  );

  const distToEnd = useMemo(() => distanceTo(topWord), [distanceTo, topWord]);

  const computeScore = useCallback(
    (finished: boolean, rungCount: number, hints: number, errs: number): number => {
      const m = MULT[difficulty];
      if (finished) {
        const steps = Math.max(rungCount, ladder.par);
        const eff = Math.round(EFF_BASE[difficulty] * (ladder.par / steps));
        return Math.max(0, WIN_BONUS[difficulty] + eff - hints * HINT_PENALTY - errs * ERROR_PENALTY);
      }
      return Math.max(0, rungCount * RUNG_POINTS * m - hints * HINT_PENALTY - errs * ERROR_PENALTY);
    },
    [difficulty, ladder.par]
  );

  const report = useCallback(
    (rungCount: number, hints: number, errs: number) => {
      events.onStats({
        score: computeScore(false, rungCount, hints, errs),
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { par: ladder.par, steps: rungCount, start: ladder.start, end: ladder.end }
      });
    },
    [events, computeScore, ladder.par, ladder.start, ladder.end]
  );

  useEffect(() => {
    if (assists.parMeter) assistsUsed.current.add('parMeter');
    if (!done.current) report(rungs.length, hintsUsed, errors);
  }, [rungs.length, hintsUsed, errors, assists.parMeter, report]);

  const finishWin = useCallback(
    (rungCount: number, hints: number, errs: number) => {
      if (done.current) return;
      done.current = true;
      setWon(true);
      events.onFinish({
        outcome: 'won',
        score: computeScore(true, rungCount, hints, errs),
        errors: errs,
        hintsUsed: hints,
        assistsUsed: [...assistsUsed.current],
        extra: { par: ladder.par, steps: rungCount, start: ladder.start, end: ladder.end }
      });
    },
    [events, computeScore, ladder.par, ladder.start, ladder.end]
  );

  // commit a candidate word as a new rung (shared by typing-submit and hint)
  const commitRung = useCallback(
    (word: string, viaHint: boolean, hints: number) => {
      prevDist.current = distToEnd;
      const nextRungs = [...rungs, word];
      setRungs(nextRungs);
      if (!viaHint) sfx.place();
      if (word === ladder.end) {
        finishWin(nextRungs.length, hints, errors);
      } else {
        syncDraft(word);
        report(nextRungs.length, hints, errors);
      }
    },
    [rungs, ladder.end, distToEnd, errors, finishWin, syncDraft, report]
  );

  const submit = useCallback(() => {
    if (paused || done.current) return;
    const candidate = draft.join('');
    let diff = 0;
    for (let i = 0; i < len; i++) if (draft[i] !== topWord[i]) diff++;

    const fail = (msg: string) => {
      const errs = errors + 1;
      setErrors(errs);
      sfx.error();
      triggerShake();
      showToast(msg);
      report(rungs.length, hintsUsed, errs);
    };

    if (diff === 0) {
      // no real attempt — nudge without charging an error
      sfx.error();
      triggerShake();
      showToast('Change one letter');
      return;
    }
    if (diff > 1) return fail('Only one letter may change');
    if (!dictSet.has(candidate)) return fail(`${candidate} isn't a word`);
    if (usedWords.has(candidate)) return fail('Already used');

    commitRung(candidate, false, hintsUsed);
  }, [
    paused, draft, len, topWord, errors, dictSet, usedWords, rungs.length, hintsUsed,
    triggerShake, showToast, report, commitRung
  ]);

  const typeLetter = useCallback(
    (ch: string) => {
      if (paused || done.current) return;
      setDraft((d) => {
        const nd = [...d];
        nd[selPos] = ch;
        return nd;
      });
      setSelPos((p) => Math.min(len - 1, p + 1));
      sfx.tap();
    },
    [paused, selPos, len]
  );

  const backspace = useCallback(() => {
    if (paused || done.current) return;
    // revert the current (or previous) tile back to the top word's letter
    setDraft((d) => {
      const nd = [...d];
      if (nd[selPos] !== topWord[selPos]) {
        nd[selPos] = topWord[selPos];
      } else if (selPos > 0) {
        nd[selPos - 1] = topWord[selPos - 1];
      }
      return nd;
    });
    setSelPos((p) => (draft[p] !== topWord[p] ? p : Math.max(0, p - 1)));
    sfx.tap();
  }, [paused, selPos, topWord, draft]);

  const undo = useCallback(() => {
    if (paused || done.current || rungs.length === 0) return;
    assistsUsed.current.add('undo');
    const next = rungs.slice(0, -1);
    prevDist.current = null; // no clean "last forward move" after an undo
    setRungs(next);
    syncDraft(next.length ? next[next.length - 1] : ladder.start);
    sfx.pop();
    report(next.length, hintsUsed, errors);
  }, [paused, rungs, ladder.start, syncDraft, hintsUsed, errors, report]);

  const hint = useCallback(() => {
    if (paused || done.current) return;
    const path = shortestPath(topWord, ladder.end, dict);
    if (!path || path.length < 2) return;
    assistsUsed.current.add('hint');
    const hints = hintsUsed + 1;
    setHintsUsed(hints);
    sfx.hint();
    commitRung(path[1], true, hints);
  }, [paused, topWord, ladder.end, dict, hintsUsed, commitRung]);

  const giveUp = useCallback(() => {
    if (paused || done.current) return;
    if (!confirmGiveUp) {
      setConfirmGiveUp(true);
      sfx.tap();
      showToast('Tap again to reveal the answer');
      setTimeout(() => setConfirmGiveUp(false), 2600);
      return;
    }
    done.current = true;
    setGaveUp(true);
    events.onFinish({
      outcome: 'lost',
      score: computeScore(false, rungs.length, hintsUsed, errors),
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { par: ladder.par, steps: rungs.length, start: ladder.start, end: ladder.end }
    });
  }, [
    paused, confirmGiveUp, showToast, events, computeScore, rungs.length,
    hintsUsed, errors, ladder.par, ladder.start, ladder.end
  ]);

  const tapTile = (i: number) => {
    if (paused || done.current) return;
    setSelPos(i);
    sfx.tap();
  };

  // physical keyboard (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused || done.current) return;
      if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') backspace();
      else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelPos((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelPos((p) => Math.min(len - 1, p + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typeLetter, backspace, submit, paused, len]);

  useEffect(() => {
    registerSnapshot(() => ({
      ladder,
      rungs,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current]
    }));
  });

  const cfg = LADDER_CONFIG[difficulty];
  const draftChanged = draft.some((c, i) => c !== topWord[i]);
  const trend =
    prevDist.current === null || distToEnd === prevDist.current
      ? 'same'
      : distToEnd < prevDist.current
        ? 'down'
        : 'up';

  return (
    <div className={`wlad ${paused ? 'board-hidden' : ''}`}>
      <div className="wlad-meta">
        <span className="chip accent">
          {rungs.length} step{rungs.length === 1 ? '' : 's'} · par {ladder.par}
        </span>
        <span className="wlad-sub">{cfg.label}</span>
        {assists.parMeter && !won && (
          <span className={`chip wlad-par ${trend}`}>
            {distToEnd} to go
            <i className={`wlad-arrow ${trend}`} aria-hidden />
          </span>
        )}
        {errors > 0 && (
          <span className="info-item bad">
            Errors: <b>{errors}</b>
          </span>
        )}
      </div>

      {gaveUp ? (
        <div className="wlad-ladder revealed">
          <LadderRow word={ladder.start} kind="start" />
          {ladder.optimalPath.slice(1).map((w, i) => (
            <LadderRow
              key={`opt-${i}`}
              word={w}
              kind={i === ladder.optimalPath.length - 2 ? 'goalhit' : 'reveal'}
            />
          ))}
        </div>
      ) : (
        <div className={`wlad-ladder${won ? ' won' : ''}${shake ? ' shake' : ''}`}>
          <LadderRow word={ladder.start} kind="start" />
          {rungs.map((r, i) => {
            const isGoal = won && i === rungs.length - 1;
            return (
              <LadderRow
                key={`rung-${i}`}
                word={r}
                kind={isGoal ? 'goalhit' : 'rung'}
                animate={!isGoal}
              />
            );
          })}
          {!won && (
            <div className={`wlad-row wlad-draft${shake ? ' shake' : ''}`}>
              {draft.map((ch, i) => (
                <button
                  key={i}
                  className={[
                    'wlad-tile',
                    'wlad-slot',
                    i === selPos ? 'sel' : '',
                    ch !== topWord[i] ? 'changed' : ''
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => tapTile(i)}
                >
                  {ch}
                </button>
              ))}
            </div>
          )}
          {!won && <div className="wlad-gap" aria-hidden />}
          {!won && <LadderRow word={ladder.end} kind="end" />}
        </div>
      )}

      {toast && <div className="wlad-toast">{toast}</div>}

      <div className="game-tools fx-card">
        <div className="wlad-tools">
          {assists.undo && (
            <PadTool silent onClick={undo} disabled={rungs.length === 0}>
              <RestartIcon />
              <span>Undo</span>
            </PadTool>
          )}
          {assists.hint && (
            <PadTool silent onClick={hint}>
              <BulbIcon />
              <span>Hint</span>
            </PadTool>
          )}
          <PadTool silent active={confirmGiveUp} onClick={giveUp}>
            <FlagIcon />
            <span>{confirmGiveUp ? 'Sure?' : 'Give up'}</span>
          </PadTool>
        </div>

        <div className="wlad-keyboard">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="wlad-krow">
              {ri === 2 && (
                <button
                  className="wlad-key wlad-key-wide"
                  onClick={backspace}
                  aria-label="Delete letter"
                >
                  ⌫
                </button>
              )}
              {row.split('').map((k) => (
                <button key={k} className="wlad-key" onClick={() => typeLetter(k)}>
                  {k}
                </button>
              ))}
              {ri === 2 && (
                <button
                  className={`wlad-key wlad-key-wide wlad-submit${draftChanged ? ' ready' : ''}`}
                  onClick={submit}
                  aria-label="Submit word"
                >
                  <CheckIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
