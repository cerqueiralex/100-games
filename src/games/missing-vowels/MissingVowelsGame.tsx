import { useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameProps } from '../../platform/types';
import { sfx, playNote } from '../../platform/audio';
import { BulbIcon, EraseIcon, RestartIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import {
  MV_CONFIG,
  VOWELS,
  buildPuzzle,
  isVowel,
  pickPhrases,
  type VowelPuzzle
} from './logic/phrases';

const POINTS_PER_SLOT = 15;
const HINT_PENALTY = 20;
const WIN_BONUS: Record<Difficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 350,
  pro: 500,
  extreme: 800
};
const PAR_SEC: Record<Difficulty, number> = {
  easy: 90,
  medium: 150,
  hard: 210,
  pro: 300,
  extreme: 240
};
const BONUS_PER_SEC: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  pro: 4,
  extreme: 5
};

type Phase = 'play' | 'solved' | 'lost';

interface MvSave {
  version: 1;
  queue: { phrase: string; category: string }[];
  index: number;
  solvedCount: number;
  fills: string[];
  locked: boolean[];
  sel: number | null;
  errors: number;
  hintsUsed: number;
  phraseMs?: number;
  assistsUsed: string[];
}

function isSave(s: unknown): s is MvSave {
  return !!s && (s as MvSave).version === 1 && Array.isArray((s as MvSave).queue);
}

/** first empty, not-locked slot index (into slots), or null */
function firstOpen(fills: string[], locked: boolean[]): number | null {
  for (let k = 0; k < fills.length; k++) {
    if (fills[k] === '' && !locked[k]) return k;
  }
  return null;
}

export function MissingVowelsGame({
  difficulty,
  assists,
  paused,
  elapsedSec,
  events,
  savedState,
  registerSnapshot
}: GameProps) {
  const cfg = MV_CONFIG[difficulty];
  const goal = cfg.goal;
  const saved = isSave(savedState) ? savedState : undefined;

  const queue = useMemo<VowelPuzzle[]>(
    () =>
      saved
        ? saved.queue.map((r) => buildPuzzle(r.phrase, r.category))
        : pickPhrases(difficulty),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [difficulty]
  );

  const [index, setIndex] = useState(saved?.index ?? 0);
  const [solvedCount, setSolvedCount] = useState(saved?.solvedCount ?? 0);
  const [fills, setFills] = useState<string[]>(
    () => saved?.fills ?? queue[saved?.index ?? 0].slots.map(() => '')
  );
  const [locked, setLocked] = useState<boolean[]>(
    () => saved?.locked ?? queue[saved?.index ?? 0].slots.map(() => false)
  );
  const [sel, setSel] = useState<number | null>(
    () => saved?.sel ?? firstOpen(saved?.fills ?? queue[saved?.index ?? 0].slots.map(() => ''), saved?.locked ?? [])
  );
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [phase, setPhase] = useState<Phase>('play');
  const [shaking, setShaking] = useState<Set<number>>(new Set());
  const [phraseMs, setPhraseMs] = useState<number>(
    saved?.phraseMs ?? (cfg.perPhraseSec ? cfg.perPhraseSec * 1000 : 0)
  );

  const puzzle = queue[index];

  const done = useRef(false);
  const assistsUsed = useRef<Set<string>>(new Set(saved?.assistsUsed ?? []));
  const remainRef = useRef(saved?.phraseMs ?? (cfg.perPhraseSec ? cfg.perPhraseSec * 1000 : 0));
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(elapsedSec);
  elapsedRef.current = elapsedSec;

  /* ---------- scoring ---------- */

  const baseSolvedPoints = (n: number) => {
    let pts = 0;
    for (let i = 0; i < n; i++) pts += queue[i].slots.length * POINTS_PER_SLOT * cfg.mult;
    return pts;
  };
  const liveScore = (solvedN: number, hints: number) =>
    Math.max(0, baseSolvedPoints(solvedN) - hints * HINT_PENALTY);
  const winScore = (hints: number) => {
    const timeBonus = Math.max(0, PAR_SEC[difficulty] - elapsedRef.current) * BONUS_PER_SEC[difficulty];
    return Math.max(0, baseSolvedPoints(goal) - hints * HINT_PENALTY + WIN_BONUS[difficulty] + timeBonus);
  };

  const score = liveScore(solvedCount, hintsUsed);

  /* ---------- category visibility ---------- */

  const showCategory = !cfg.hideCategory || !!assists.category;

  /* ---------- continuous stats + passive assist accounting ---------- */

  useEffect(() => {
    if (assists.category) assistsUsed.current.add('category');
    if (assists.keepCorrect) assistsUsed.current.add('keepCorrect');
    events.onStats({
      score: liveScore(solvedCount, hintsUsed),
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: solvedCount, goal }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solvedCount, hintsUsed, errors, assists.category, assists.keepCorrect]);

  /* ---------- finish helpers ---------- */

  const finishWin = () => {
    if (done.current) return;
    done.current = true;
    events.onFinish({
      outcome: 'won',
      score: winScore(hintsUsed),
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: goal, goal }
    });
  };

  const loseGame = (finalErrors: number, solvedN: number) => {
    if (done.current) return;
    done.current = true;
    setPhase('lost');
    events.onFinish({
      outcome: 'lost',
      score: liveScore(solvedN, hintsUsed),
      errors: finalErrors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: solvedN, goal }
    });
  };

  /* ---------- deal / advance ---------- */

  const dealPhrase = (i: number) => {
    const p = queue[i];
    setIndex(i);
    setFills(p.slots.map(() => ''));
    setLocked(p.slots.map(() => false));
    setSel(p.slots.length > 0 ? 0 : null);
    setShaking(new Set());
    if (cfg.perPhraseSec) {
      remainRef.current = cfg.perPhraseSec * 1000;
      setPhraseMs(remainRef.current);
    }
  };

  const solvePhrase = () => {
    setPhase('solved');
    // little ascending chime
    playNote(660, 120, 'triangle');
    playNote(880, 140, 'triangle');
    setTimeout(() => playNote(1175, 200, 'triangle'), 120);
    const cascadeMs = puzzle.slots.length * 70 + 620;
    const solvedAt = index; // captured
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      setSolvedCount(solvedAt + 1);
      if (solvedAt >= goal - 1) {
        finishWin();
      } else {
        dealPhrase(solvedAt + 1);
        setPhase('play');
      }
    }, cascadeMs);
  };

  /* ---------- checking a full grid ---------- */

  const runCheck = (nf: string[]) => {
    const wrong: number[] = [];
    for (let k = 0; k < nf.length; k++) {
      if (nf[k] !== puzzle.answer[k]) wrong.push(k);
    }
    if (wrong.length === 0) {
      sfx.place();
      solvePhrase();
      return;
    }
    // wrong submission
    const nErr = errors + 1;
    setErrors(nErr);
    sfx.error();
    setShaking(new Set(wrong));
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(new Set()), 520);

    let nextFills: string[];
    let nextLocked = locked;
    if (assists.keepCorrect) {
      // lock the correct ones, clear only the wrong ones
      nextLocked = locked.map((l, k) => l || (nf[k] !== '' && nf[k] === puzzle.answer[k]));
      nextFills = nf.map((v, k) => (wrong.includes(k) ? '' : v));
      setLocked(nextLocked);
    } else {
      // clear everything except reveal-locked slots
      nextFills = nf.map((v, k) => (locked[k] ? v : ''));
    }
    setFills(nextFills);
    setSel(firstOpen(nextFills, nextLocked));

    if (cfg.mistakeBudget !== undefined && nErr > cfg.mistakeBudget) {
      loseGame(nErr, solvedCount);
    }
  };

  /* ---------- interactions ---------- */

  const selectSlot = (k: number) => {
    if (paused || phase !== 'play' || done.current || locked[k]) return;
    sfx.tap();
    setSel(k);
  };

  const placeVowel = (v: string) => {
    if (paused || phase !== 'play' || done.current) return;
    // fill the selected slot (allowing overwrite), else the first open one
    const k = sel !== null && !locked[sel] ? sel : firstOpen(fills, locked);
    if (k === null) return;
    const nf = [...fills];
    nf[k] = v;
    setFills(nf);
    sfx.pop();
    setSel(firstOpen(nf, locked));
    if (nf.every((x) => x !== '')) runCheck(nf);
  };

  const backspace = () => {
    if (paused || phase !== 'play' || done.current) return;
    // clear the selected slot, or the last filled unlocked slot
    let target = sel !== null && !locked[sel] && fills[sel] !== '' ? sel : -1;
    if (target === -1) {
      for (let k = fills.length - 1; k >= 0; k--) {
        if (fills[k] !== '' && !locked[k]) {
          target = k;
          break;
        }
      }
    }
    if (target === -1) return;
    const nf = [...fills];
    nf[target] = '';
    setFills(nf);
    setSel(target);
    sfx.tap();
  };

  const clearAll = () => {
    if (paused || phase !== 'play' || done.current) return;
    const nf = fills.map((v, k) => (locked[k] ? v : ''));
    setFills(nf);
    setSel(firstOpen(nf, locked));
    sfx.tap();
  };

  const revealVowel = () => {
    if (paused || phase !== 'play' || done.current || !assists.revealVowel) return;
    const open: number[] = [];
    for (let k = 0; k < fills.length; k++) if (fills[k] === '' && !locked[k]) open.push(k);
    if (open.length === 0) return;
    const k = open[Math.floor(Math.random() * open.length)];
    const nf = [...fills];
    nf[k] = puzzle.answer[k];
    const nl = [...locked];
    nl[k] = true;
    assistsUsed.current.add('revealVowel');
    const nHints = hintsUsed + 1;
    setHintsUsed(nHints);
    setFills(nf);
    setLocked(nl);
    setSel(firstOpen(nf, nl));
    sfx.hint();
    if (nf.every((x) => x !== '')) runCheck(nf);
  };

  /* ---------- extreme per-phrase timer ---------- */

  const timeoutRef = useRef<() => void>(() => {});
  timeoutRef.current = () => {
    if (done.current || phase !== 'play') return;
    sfx.error();
    const nErr = errors + 1;
    setErrors(nErr);
    const nf = fills.map((v, k) => (locked[k] ? v : ''));
    setFills(nf);
    setSel(firstOpen(nf, locked));
    remainRef.current = (cfg.perPhraseSec ?? 25) * 1000;
    setPhraseMs(remainRef.current);
    if (cfg.mistakeBudget !== undefined && nErr > cfg.mistakeBudget) {
      loseGame(nErr, solvedCount);
    }
  };

  useEffect(() => {
    if (!cfg.perPhraseSec || paused || phase !== 'play' || done.current) return;
    const id = setInterval(() => {
      remainRef.current -= 100;
      if (remainRef.current <= 0) {
        clearInterval(id);
        remainRef.current = 0;
        setPhraseMs(0);
        timeoutRef.current();
      } else {
        setPhraseMs(remainRef.current);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.perPhraseSec, paused, phase, index]);

  /* ---------- physical keyboard ---------- */

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (paused || phase !== 'play' || done.current) return;
    const ch = e.key.toUpperCase();
    if (VOWELS.includes(ch as (typeof VOWELS)[number])) {
      placeVowel(ch);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      backspace();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const n = fills.length;
      if (n === 0) return;
      let k = sel ?? 0;
      for (let step = 0; step < n; step++) {
        k = (k + dir + n) % n;
        if (!locked[k]) {
          setSel(k);
          break;
        }
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    },
    []
  );

  /* ---------- save / resume ---------- */

  useEffect(() => {
    registerSnapshot(
      (): MvSave => ({
        version: 1,
        queue: queue.map((p) => ({ phrase: p.phrase, category: p.category })),
        index,
        solvedCount,
        fills,
        locked,
        sel,
        errors,
        hintsUsed,
        phraseMs: cfg.perPhraseSec ? remainRef.current : undefined,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  /* ---------- render helpers ---------- */

  // group chars into words of consonant tiles + vowel slots
  const words = useMemo(() => {
    const out: { key: number; cells: { slot: boolean; ch: string; k: number }[] }[] = [];
    let cur: { slot: boolean; ch: string; k: number }[] = [];
    let wordKey = 0;
    let k = 0;
    puzzle.chars.forEach((ch) => {
      if (ch === ' ') {
        out.push({ key: wordKey++, cells: cur });
        cur = [];
        return;
      }
      if (isVowel(ch)) {
        cur.push({ slot: true, ch, k });
        k++;
      } else {
        cur.push({ slot: false, ch, k: -1 });
      }
    });
    out.push({ key: wordKey, cells: cur });
    return out;
  }, [puzzle]);

  const timerPct = cfg.perPhraseSec ? Math.max(0, Math.min(100, (phraseMs / (cfg.perPhraseSec * 1000)) * 100)) : 0;
  const budgetLeft = cfg.mistakeBudget !== undefined ? Math.max(0, cfg.mistakeBudget + 1 - errors) : null;

  return (
    <div className={`mv-root ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        <span className="info-item">
          Solved <b>{solvedCount}/{goal}</b>
        </span>
        {budgetLeft !== null && (
          <span className={`info-item ${budgetLeft <= 1 ? 'bad' : ''}`}>
            Lives <b>{budgetLeft}</b>
          </span>
        )}
      </div>

      <div className="mv-pips" aria-hidden>
        {Array.from({ length: goal }).map((_, i) => (
          <span
            key={i}
            className={[
              'mv-pip',
              i < solvedCount ? 'done' : '',
              i === index && phase !== 'lost' && solvedCount < goal ? 'current' : ''
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      <div className="mv-stage">
        <div className={`mv-cat ${showCategory ? '' : 'hidden'}`}>
          {showCategory ? puzzle.category : 'Category hidden'}
        </div>

        {cfg.perPhraseSec && (
          <div className="mv-timerbar" aria-hidden>
            <div className={`mv-timerfill ${timerPct < 30 ? 'low' : ''}`} style={{ width: `${timerPct}%` }} />
          </div>
        )}

        <div key={index} className={`mv-phrase phase-${phase}`}>
          {words.map((w) => (
            <div key={w.key} className="mv-word">
              {w.cells.map((c, ci) =>
                c.slot ? (
                  <button
                    key={ci}
                    className={[
                      'mv-slot',
                      sel === c.k ? 'sel' : '',
                      fills[c.k] ? 'filled' : '',
                      locked[c.k] ? 'locked' : '',
                      phase === 'solved' ? 'correct' : '',
                      shaking.has(c.k) ? 'shake' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={phase === 'solved' ? { animationDelay: `${c.k * 70}ms` } : undefined}
                    onClick={() => selectSlot(c.k)}
                    aria-label={`vowel slot ${c.k + 1}`}
                  >
                    <span className="mv-slot-letter">{fills[c.k]}</span>
                  </button>
                ) : (
                  <span key={ci} className="mv-tile">
                    {c.ch}
                  </span>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="game-tools fx-card">
        <div className="mv-vowels">
          {VOWELS.map((v) => (
            <PadTool key={v} className="mv-vowel" silent onClick={() => placeVowel(v)}>
              {v}
            </PadTool>
          ))}
        </div>
        <div className="mv-actions">
          <PadTool onClick={backspace} aria-label="Delete">
            <EraseIcon />
            <span>Delete</span>
          </PadTool>
          <PadTool onClick={clearAll} aria-label="Clear">
            <RestartIcon />
            <span>Clear</span>
          </PadTool>
          {assists.revealVowel && (
            <PadTool silent onClick={revealVowel} aria-label="Reveal a vowel">
              <BulbIcon />
              <span>Reveal</span>
            </PadTool>
          )}
        </div>
      </div>
    </div>
  );
}
