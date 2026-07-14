import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { GameProps } from '../../platform/types';
import { sfx } from '../../platform/audio';
import { BulbIcon, EraseIcon, GridIcon, TargetIcon } from '../../platform/design/icons';
import { PadTool } from '../../platform/components/ui';
import { checkAnswer, generateSequence, TIERS, type SequencePuzzle } from './logic/generator';

/* ------------------------------- scoring ------------------------------- */
const SOLVE_PTS = 20; // × tier multiplier, per solved puzzle
const STREAK_PTS = 6; // × tier multiplier × current streak length
const WIN_BONUS = 120; // × tier multiplier, on round win
const LIFE_BONUS = 25; // × tier multiplier, per surviving life
const HINT_PENALTY = 15; // × tier multiplier, per rule-hint

const MAX_DIGITS = 6;

/** Passive assists count as help for the whole game whenever enabled. */
interface SeqSave {
  current: SequencePuzzle;
  solved: number;
  lives: number;
  score: number;
  errors: number;
  hintsUsed: number;
  streak: number;
  entry: string[];
  activeSlot: number;
  assistsUsed: string[];
}

type Reveal = { correct: boolean; guess: number[] } | null;

export function SequenceCrackerGame({
  difficulty,
  assists,
  paused,
  events,
  onToggleAssist,
  savedState,
  registerSnapshot
}: GameProps) {
  const tier = TIERS[difficulty];
  const mult = tier.mult;
  const hasBroad = tier.families.some((f) => f !== 'arithmetic' && f !== 'geometric');
  const narrowOn = !!assists.narrow && hasBroad;

  const saved =
    savedState && (savedState as SeqSave).current ? (savedState as SeqSave) : undefined;

  // deal reads the latest narrow flag through a ref so a mid-game toggle takes
  // effect on the very next puzzle
  const narrowRef = useRef(narrowOn);
  narrowRef.current = narrowOn;
  const dealPuzzle = (): SequencePuzzle =>
    generateSequence({ difficulty, narrow: narrowRef.current });

  const [current, setCurrent] = useState<SequencePuzzle>(() => saved?.current ?? dealPuzzle());
  const [solved, setSolved] = useState(saved?.solved ?? 0);
  const [lives, setLives] = useState(saved?.lives ?? tier.lives);
  const [score, setScore] = useState(saved?.score ?? 0);
  const [errors, setErrors] = useState(saved?.errors ?? 0);
  const [hintsUsed, setHintsUsed] = useState(saved?.hintsUsed ?? 0);
  const [streak, setStreak] = useState(saved?.streak ?? 0);
  const [entry, setEntry] = useState<string[]>(
    () => saved?.entry ?? current.answers.map(() => '')
  );
  const [activeSlot, setActiveSlot] = useState(saved?.activeSlot ?? 0);
  const [reveal, setReveal] = useState<Reveal>(null);
  const [showTruth, setShowTruth] = useState(false);
  const [ruleFlash, setRuleFlash] = useState<{ name: string; id: number } | null>(null);

  const done = useRef(false);
  const timers = useRef<number[]>([]);
  const assistsUsed = useRef<Set<string>>(
    new Set([
      ...(saved?.assistsUsed ?? []),
      ...(assists.showDifferences ? ['showDifferences'] : []),
      ...(narrowOn ? ['narrow'] : [])
    ])
  );

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // passive assists toggled on mid-game still count as help for this game
  useEffect(() => {
    if (assists.showDifferences) assistsUsed.current.add('showDifferences');
    if (narrowOn) assistsUsed.current.add('narrow');
  }, [assists.showDifferences, narrowOn]);

  useEffect(() => {
    events.onStats({
      score,
      errors,
      hintsUsed,
      assistsUsed: [...assistsUsed.current],
      extra: { solved, goal: tier.goal }
    });
  }, [score, errors, hintsUsed, solved, events, tier.goal, assists.showDifferences, narrowOn]);

  const finish = (
    outcome: 'won' | 'lost',
    finalScore: number,
    e: number,
    h: number,
    solvedCount: number
  ) => {
    if (done.current) return;
    done.current = true;
    clearTimers();
    events.onFinish({
      outcome,
      score: Math.max(0, Math.round(finalScore)),
      errors: e,
      hintsUsed: h,
      assistsUsed: [...assistsUsed.current],
      extra: { solved: solvedCount, goal: tier.goal }
    });
  };

  const dealNext = () => {
    const next = dealPuzzle();
    setCurrent(next);
    setEntry(next.answers.map(() => ''));
    setActiveSlot(0);
    setReveal(null);
    setShowTruth(false);
  };

  const submit = (guesses: number[]) => {
    if (reveal || paused || done.current) return;
    const correct = checkAnswer(current, guesses);
    setReveal({ correct, guess: guesses });
    if (correct) {
      sfx.pop();
      const newStreak = streak + 1;
      const gain = SOLVE_PTS * mult + newStreak * STREAK_PTS * mult;
      const newScore = score + gain;
      const newSolved = solved + 1;
      setStreak(newStreak);
      setSolved(newSolved);
      if (newSolved >= tier.goal) {
        const finalScore = newScore + WIN_BONUS * mult + lives * LIFE_BONUS * mult;
        setScore(finalScore);
        schedule(() => finish('won', finalScore, errors, hintsUsed, newSolved), 1050);
      } else {
        setScore(newScore);
        schedule(dealNext, 1050);
      }
    } else {
      sfx.error();
      setShowTruth(false);
      const newErrors = errors + 1;
      const newLives = lives - 1;
      setErrors(newErrors);
      setLives(newLives);
      setStreak(0);
      schedule(() => setShowTruth(true), 560);
      if (newLives <= 0) schedule(() => finish('lost', score, newErrors, hintsUsed, solved), 1450);
      else schedule(dealNext, 1450);
    }
  };

  /* --------------------------- exact entry --------------------------- */
  const typeDigit = (ch: string) => {
    if (reveal || paused || done.current) return;
    sfx.tap();
    setEntry((e) => {
      const n = [...e];
      let cur = n[activeSlot] ?? '';
      const digits = cur.replace('-', '');
      if (digits.length >= MAX_DIGITS) return e;
      if (cur === '0') cur = ch;
      else if (cur === '-0') cur = '-' + ch;
      else cur = cur + ch;
      n[activeSlot] = cur;
      return n;
    });
  };
  const toggleSign = () => {
    if (reveal || paused || done.current) return;
    sfx.tap();
    setEntry((e) => {
      const n = [...e];
      const cur = n[activeSlot] ?? '';
      n[activeSlot] = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
      return n;
    });
  };
  const backspace = () => {
    if (reveal || paused || done.current) return;
    sfx.tap();
    setEntry((e) => {
      const n = [...e];
      n[activeSlot] = (n[activeSlot] ?? '').slice(0, -1);
      return n;
    });
  };
  const onEnter = () => {
    if (reveal || paused || done.current) return;
    const firstEmpty = entry.findIndex((s) => s === '' || s === '-');
    if (firstEmpty !== -1) {
      if (entry.length > 1) {
        sfx.tap();
        setActiveSlot(firstEmpty);
      } else {
        sfx.error();
      }
      return;
    }
    submit(entry.map((s) => parseInt(s, 10)));
  };

  const useRuleHint = () => {
    if (reveal || paused || done.current || !assists.ruleHint) return;
    assistsUsed.current.add('ruleHint');
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - HINT_PENALTY * mult));
    sfx.hint();
    setRuleFlash({ name: current.familyName, id: Date.now() });
    schedule(() => setRuleFlash(null), 1900);
  };

  // physical keyboard (desktop)
  const keyRef = useRef<(k: string) => void>(() => {});
  keyRef.current = (k: string) => {
    if (current.mode !== 'exact') return;
    if (k >= '0' && k <= '9') typeDigit(k);
    else if (k === '-' || k === '_') toggleSign();
    else if (k === 'Backspace' || k === 'Delete') backspace();
    else if (k === 'Enter') onEnter();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Enter') e.preventDefault();
      keyRef.current(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    registerSnapshot(
      (): SeqSave => ({
        current,
        solved,
        lives,
        score,
        errors,
        hintsUsed,
        streak,
        entry,
        activeSlot,
        assistsUsed: [...assistsUsed.current]
      })
    );
  });

  /* ------------------------------ render ------------------------------ */
  const promptText =
    current.mode === 'choice'
      ? 'Which number continues the pattern?'
      : current.hiddenIdx.length > 1
        ? 'Type the two missing numbers'
        : 'Type the missing number';

  const statusNode: ReactNode = reveal
    ? reveal.correct
      ? (
          <>
            Cracked it! <span className="seq-rule">{current.ruleLabel}</span>
          </>
        )
      : showTruth
        ? (
            <>
              The rule: <span className="seq-rule">{current.ruleLabel}</span>
            </>
          )
        : 'Not quite…'
    : promptText;

  const solvedRow = reveal?.correct;

  const slotText = (pos: number): string => {
    if (reveal) {
      if (reveal.correct) return String(current.answers[pos]);
      return showTruth ? String(current.answers[pos]) : String(reveal.guess[pos] ?? '');
    }
    return entry[pos] && entry[pos] !== '-' ? entry[pos] : entry[pos] === '-' ? '−' : '?';
  };

  const tiles: ReactNode[] = [];
  current.terms.forEach((t, i) => {
    if (i > 0) {
      const leftH = current.hiddenIdx.includes(i - 1);
      const rightH = current.hiddenIdx.includes(i);
      if (assists.showDifferences) {
        const label =
          leftH || rightH
            ? '?'
            : `${t - current.terms[i - 1] >= 0 ? '+' : '−'}${Math.abs(t - current.terms[i - 1])}`;
        tiles.push(
          <span key={`s${i}`} className="seq-sep diff">
            {label}
          </span>
        );
      } else {
        tiles.push(
          <span key={`s${i}`} className="seq-sep" aria-hidden>
            →
          </span>
        );
      }
    }
    const pos = current.hiddenIdx.indexOf(i);
    const style = { ['--seq-i' as string]: String(i) } as CSSProperties;
    if (pos === -1) {
      tiles.push(
        <div key={i} className={`seq-term ${solvedRow ? 'wave' : ''}`} style={style}>
          {t}
        </div>
      );
    } else {
      const multi = current.mode === 'exact' && current.hiddenIdx.length > 1;
      const cls = ['seq-term', 'seq-slot'];
      if (reveal) cls.push(reveal.correct || showTruth ? 'correct' : 'wrong');
      else {
        if (entry[pos] && entry[pos] !== '-') cls.push('typed');
        if (multi && pos === activeSlot) cls.push('active');
      }
      if (solvedRow) cls.push('wave');
      tiles.push(
        <button
          key={i}
          className={cls.join(' ')}
          style={style}
          onClick={() => {
            if (multi && !reveal && !paused) {
              sfx.tap();
              setActiveSlot(pos);
            }
          }}
          aria-label={pos === activeSlot ? 'Active missing term' : 'Missing term'}
        >
          {slotText(pos)}
        </button>
      );
    }
  });

  const pad = [
    { k: '7' },
    { k: '8' },
    { k: '9' },
    { k: 'back' },
    { k: '4' },
    { k: '5' },
    { k: '6' },
    { k: 'neg' },
    { k: '1' },
    { k: '2' },
    { k: '3' },
    { k: '0' }
  ];

  return (
    <div className={`seq ${paused ? 'board-hidden' : ''}`}>
      <div className="sudoku-info">
        <span className="info-item">
          Solved: <b>{solved} / {tier.goal}</b>
        </span>
        <span className="info-item">
          <b>{score.toLocaleString()}</b> pts
        </span>
        {streak >= 2 && (
          <span className="info-item seq-streak">
            Streak <b>{streak}</b>
          </span>
        )}
        <span className="seq-lives" aria-label={`${lives} lives left`}>
          {Array.from({ length: tier.lives }, (_, i) => (
            <span key={i} className={`seq-pip ${i < lives ? '' : 'empty'}`} aria-hidden />
          ))}
        </span>
      </div>

      <p className="seq-status">
        {statusNode}
        {ruleFlash && (
          <span key={ruleFlash.id} className="seq-hintflash">
            {ruleFlash.name}
          </span>
        )}
      </p>

      <div className={`seq-board ${solvedRow ? 'solved' : ''}`}>{tiles}</div>

      <div className="game-tools fx-card">
        <div className="sudoku-controls">
          {assists.ruleHint && (
            <PadTool silent onClick={useRuleHint} disabled={reveal !== null}>
              <BulbIcon />
              <span>Rule</span>
            </PadTool>
          )}
          <PadTool
            active={!!assists.showDifferences}
            onClick={() => onToggleAssist('showDifferences', !assists.showDifferences)}
          >
            <GridIcon />
            <span>Diffs</span>
          </PadTool>
          {hasBroad && (
            <PadTool active={narrowOn} onClick={() => onToggleAssist('narrow', !assists.narrow)}>
              <TargetIcon />
              <span>Narrow</span>
            </PadTool>
          )}
        </div>

        {current.mode === 'choice' ? (
          <div className="seq-choices">
            {current.options!.map((opt) => {
              const isAns = reveal && opt === current.answers[0];
              const chosenWrong = reveal && !reveal.correct && reveal.guess[0] === opt;
              const cls = isAns ? 'seq-opt-correct' : chosenWrong ? 'seq-opt-wrong' : '';
              return (
                <PadTool
                  key={opt}
                  silent
                  className={`seq-opt ${cls}`}
                  disabled={reveal !== null}
                  onClick={() => submit([opt])}
                >
                  {opt}
                </PadTool>
              );
            })}
          </div>
        ) : (
          <>
            <div className="seq-pad">
              {pad.map(({ k }) => {
                if (k === 'back')
                  return (
                    <button
                      key={k}
                      className="seq-key util"
                      onClick={backspace}
                      disabled={reveal !== null}
                      aria-label="Backspace"
                    >
                      <EraseIcon />
                    </button>
                  );
                if (k === 'neg')
                  return (
                    <button
                      key={k}
                      className="seq-key util"
                      onClick={toggleSign}
                      disabled={reveal !== null}
                      aria-label="Negative sign"
                    >
                      −
                    </button>
                  );
                return (
                  <button
                    key={k}
                    className="seq-key"
                    onClick={() => typeDigit(k)}
                    disabled={reveal !== null}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <PadTool
              silent
              className="seq-enter"
              onClick={onEnter}
              disabled={reveal !== null}
            >
              Enter
            </PadTool>
          </>
        )}
      </div>
    </div>
  );
}
