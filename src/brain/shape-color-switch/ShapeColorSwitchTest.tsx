import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../../platform/audio';
import type { BrainRunOutcome, BrainTestProps } from '../../platform/brain/types';
import { now, revealOnFrame } from '../../platform/brain/timing';
import { Countdown, PhaseCard, ResponseButton, useFeedback } from '../../platform/components/fx';
import { CheckIcon, ClockIcon, CloseIcon } from '../../platform/design/icons';
import { haptic } from '../../platform/motion';
import { generateGuided, generatePractice, generateTest } from './logic/generate';
import { CUE_WORD, PROTOCOL, SHAPE, cardAt, picParts, type Cue, type Pic, type Side, type TrialSpec } from './logic/protocol';
import { CODE, classify, scoreRun, toLogRow, type TrialRecord } from './logic/scoring';
import { COLOR_NAME, PRACTICE_PAIR, Pictogram, TEST_PAIR, type ShapeName } from './pictograms';

/**
 * Shape–Color Switch — the Flexibility benchmark (SCIENCE.md §1.12, MTB
 * Shape-Color Sorting). Interruption class A: the runner ends an interrupted
 * run as invalid, so there is no pause logic here.
 *
 * Run order (C1, Appendix C.7):
 *   [first run / practice mode] guided practice — untimed, coached, rule by
 *     rule, the right card highlighted after an error;
 *   warm-up — 5 mixed trials at full pace with ✓/✗ and a one-line rule
 *     reminder, repeated once below 4 correct (not scored);
 *   3-2-1 countdown [DC];
 *   the scored block — 30 trials, no correctness feedback, only a neutral
 *     acknowledgement of each tap (C3).
 *
 * Timing (C2): the cue and the picture are revealed by writing `opacity`
 * inside a requestAnimationFrame callback (revealOnFrame) and their onsets
 * are those callbacks' timestamps; the picture lands on the frame nearest
 * cue onset + 500 ms. Responses are read on pointerdown (ResponseButton,
 * stamped with the event's own timeStamp). React state never carries a
 * stimulus — it only drives the cards, the coach line and phase cards.
 */

type Stage = 'guided-intro' | 'guided' | 'warmup-intro' | 'warmup' | 'test-intro' | 'countdown' | 'test' | 'practice-done' | 'finished';
type BlockKind = 'guided' | 'warmup' | 'test';
type StimSet = 'practice' | 'test';

interface Coach {
  tone: 'cue' | 'good' | 'bad' | 'slow';
  text: ReactNode;
}

const PAIRS: Record<StimSet, { A: ShapeName; B: ShapeName }> = { test: TEST_PAIR, practice: PRACTICE_PAIR };

/** how long practice feedback stays up before the next trial's blank interval */
const FEEDBACK_MS = { good: 1050, bad: 1900, guidedGood: 1250, guidedBad: 2300 } as const;
/** a guided trial answered wrongly is shown again, at most this many times in all */
const GUIDED_TRIES = 3;

function shapeOf(set: StimSet, s: 'A' | 'B'): ShapeName {
  return PAIRS[set][s];
}

export default function ShapeColorSwitchTest({ mode, firstRun, seed, onProgress, onFinish }: BrainTestProps) {
  const test = useMemo(() => generateTest(seed), [seed]);
  const layout = test.layout;
  const guided = useMemo(() => generateGuided(seed), [seed]);
  const practice = useMemo(() => [0, 1].map((round) => generatePractice(seed, round)), [seed]);

  const [stage, setStage] = useState<Stage>(mode === 'practice' || firstRun ? 'guided-intro' : 'warmup-intro');
  const [round, setRound] = useState(0);
  const [warmScore, setWarmScore] = useState(0);
  const [coach, setCoachState] = useState<(Coach & { id: number }) | null>(null);
  const coachId = useRef(0);
  const setCoach = (c: Coach | null) => setCoachState(c ? { ...c, id: ++coachId.current } : null);
  const [hint, setHint] = useState<Side | null>(null);
  const [counter, setCounter] = useState({ i: 0, n: 0 });

  const fb = useFeedback();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const cueEls = useRef<(HTMLSpanElement | null)[]>([null, null]);
  const stimEls = useRef<Record<string, HTMLDivElement | null>>({});
  const done = useRef(false);
  const cb = useRef({ onProgress, onFinish });
  cb.current = { onProgress, onFinish };

  /** the live trial machine — refs only, so a re-render never touches a stimulus */
  const live = useRef({
    token: 0,
    state: 'idle' as 'idle' | 'isi' | 'cue' | 'respond' | 'feedback',
    onset: 0,
    cueOnset: 0,
    early: 0,
    trialId: 0,
    frame: 1000 / 60,
    respond: null as null | ((side: Side, t: number) => void)
  });
  const pending = useRef<{ timers: number[]; rafs: number[]; cancels: (() => void)[] }>({ timers: [], rafs: [], cancels: [] });

  const clearPending = () => {
    const p = pending.current;
    p.timers.forEach((id) => window.clearTimeout(id));
    p.rafs.forEach((id) => cancelAnimationFrame(id));
    p.cancels.forEach((c) => c());
    pending.current = { timers: [], rafs: [], cancels: [] };
  };

  const set: StimSet = stage === 'test-intro' || stage === 'countdown' || stage === 'test' || stage === 'finished' ? 'test' : 'practice';

  /* ---------- stimulus writes (DOM, never React state) ---------- */

  const hideStimuli = () => {
    cueEls.current.forEach((el) => el && (el.style.opacity = '0'));
    Object.values(stimEls.current).forEach((el) => el && (el.style.opacity = '0'));
  };
  const showCue = (cue: Cue) => {
    const el = cueEls.current[cue];
    if (el) el.style.opacity = '1';
  };
  const showPic = (s: StimSet, pic: Pic) => {
    const el = stimEls.current[`${s}:${pic}`];
    if (el) el.style.opacity = '1';
  };

  /** a card's centre as % of the stage — where its feedback burst lands */
  const cardPoint = (side: Side) => {
    const st = stageRef.current?.getBoundingClientRect();
    const c = cardRefs.current[side]?.getBoundingClientRect();
    if (!st || !c || !st.width || !st.height) return { x: side === 0 ? 27 : 73, y: 84 };
    return { x: ((c.left + c.width / 2 - st.left) / st.width) * 100, y: ((c.top + c.height / 2 - st.top) / st.height) * 100 };
  };

  /* ---------- the block runner ---------- */

  const runBlock = (kind: BlockKind, trials: TrialSpec[], s: StimSet, onDone: (records: TrialRecord[]) => void) => {
    clearPending();
    const L = live.current;
    const token = ++L.token;
    const alive = () => live.current.token === token;
    const timer = (fn: () => void, ms: number) => pending.current.timers.push(window.setTimeout(() => alive() && fn(), ms));
    const records: TrialRecord[] = [];
    let i = 0;
    let tries = 0;

    /** reveal on the frame nearest `target` (rAF timestamps), stamping that frame as the onset */
    const revealNear = (target: number, reveal: () => void, onOnset: (ts: number) => void) => {
      let last = -1;
      const step = (ts: number) => {
        if (!alive()) return;
        if (last >= 0) {
          const d = ts - last;
          if (d > 4 && d < 50) L.frame = L.frame * 0.8 + d * 0.2;
        }
        last = ts;
        // the NEXT frame lands within half a frame of the target: reveal on it
        if (ts + L.frame * 1.5 >= target) pending.current.cancels.push(revealOnFrame(reveal, (on) => alive() && onOnset(on)));
        else pending.current.rafs.push(requestAnimationFrame(step));
      };
      pending.current.rafs.push(requestAnimationFrame(step));
    };

    const next = () => {
      if (!alive()) return;
      if (i >= trials.length) {
        L.state = 'idle';
        L.respond = null;
        onDone(records);
        return;
      }
      const t = trials[i];
      const trialId = ++L.trialId;
      L.state = 'isi';
      L.early = 0;
      if (kind !== 'test') setCounter({ i: i + 1, n: trials.length });
      timer(() => {
        pending.current.cancels.push(
          revealOnFrame(
            () => showCue(t.cue),
            (cueOnset) => {
              if (!alive()) return;
              L.cueOnset = cueOnset;
              L.state = 'cue';
              if (kind === 'guided') setCoach(guidedPrompt(t, i));
              revealNear(
                cueOnset + PROTOCOL.cueLeadMs,
                () => showPic(s, t.pic),
                (onset) => {
                  L.onset = onset;
                  L.state = 'respond';
                  if (kind !== 'guided') timer(() => answer(-1, now()), PROTOCOL.deadlineMs);
                }
              );
            }
          )
        );
      }, t.isi);

      const answer = (resp: Side | -1, tPress: number) => {
        // one answer per trial: a stale deadline timer must never answer a later trial
        if (!alive() || L.state !== 'respond' || L.trialId !== trialId) return;
        L.state = 'feedback';
        let rt = resp === -1 ? PROTOCOL.deadlineMs : Math.round(tPress - L.onset);
        let r: Side | -1 = resp;
        if (r !== -1 && rt > PROTOCOL.deadlineMs) {
          // stamped after the deadline (the timer was late): a timeout
          r = -1;
          rt = PROTOCOL.deadlineMs;
        }
        const rec: TrialRecord = { cue: t.cue, pic: t.pic, side: t.side, resp: r, rt, isi: t.isi, lead: Math.round(L.onset - L.cueOnset), early: L.early };
        const code = classify(rec);

        if (kind === 'test') {
          // C3: no correctness feedback in the scored block — the picture
          // clears and the tap is acknowledged the same way, right or wrong
          hideStimuli();
          if (r !== -1) {
            fb.neutral(cardPoint(r));
            sfx.tap();
            haptic('tap');
          }
          records.push(rec);
          cb.current.onProgress(records.length / trials.length);
          i++;
          next();
          return;
        }

        if (kind === 'warmup') {
          records.push(rec);
          const ok = code === CODE.correct;
          if (ok) fb.good(cardPoint(t.side));
          else if (code === CODE.anticipation) sfx.early();
          else fb.bad(r === -1 ? undefined : cardPoint(r));
          if (!ok) setHint(t.side);
          setCoach(warmupLine(t.cue, code));
          timer(() => {
            hideStimuli();
            setCoach(null);
            setHint(null);
            i++;
            next();
          }, ok ? FEEDBACK_MS.good : FEEDBACK_MS.bad);
          return;
        }

        // guided: untimed, every error shown and the trial asked again
        const ok = resp === t.side;
        if (ok) fb.good(cardPoint(t.side));
        else {
          fb.bad(cardPoint(resp === -1 ? t.side : resp));
          setHint(t.side);
        }
        setCoach(guidedLine(t, i, ok, trials));
        timer(() => {
          hideStimuli();
          setCoach(null);
          setHint(null);
          tries++;
          if (ok || tries >= GUIDED_TRIES) {
            i++;
            tries = 0;
          }
          next();
        }, ok ? FEEDBACK_MS.guidedGood : FEEDBACK_MS.guidedBad);
      };

      L.respond = (side, tPress) => {
        // a tap stamped before the picture's frame was not a response to it
        if (L.state === 'respond' && tPress >= L.onset) answer(side, tPress);
        else if (L.state === 'isi' || L.state === 'cue' || L.state === 'respond') L.early++;
      };
    };

    hideStimuli();
    next();
  };

  /* ---------- stages ---------- */

  useEffect(() => {
    cb.current.onProgress(0);
  }, []);

  useEffect(() => {
    if (stage === 'guided') {
      runBlock('guided', guided, 'practice', () => setStage(mode === 'practice' ? 'practice-done' : 'warmup-intro'));
    } else if (stage === 'warmup') {
      runBlock('warmup', practice[round], 'practice', (recs) => {
        const ok = recs.filter((r) => classify(r) === CODE.correct).length;
        setWarmScore(ok);
        if (ok < PROTOCOL.practicePass && round + 1 < PROTOCOL.practiceRounds) {
          setRound(round + 1);
          setStage('warmup-intro');
        } else setStage('test-intro');
      });
    } else if (stage === 'test') {
      runBlock('test', test.trials, 'test', (recs) => finish(recs));
    }
    return () => {
      live.current.token++;
      live.current.state = 'idle';
      live.current.respond = null;
      clearPending();
    };
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (recs: TrialRecord[]) => {
    if (done.current) return;
    done.current = true;
    const score = scoreRun(recs);
    const outcome: BrainRunOutcome = {
      metrics: score.metrics,
      trials: recs.length,
      valid: score.valid,
      ...(score.flags.length ? { flags: score.flags } : {}),
      highlights: score.highlights,
      trialLog: recs.map(toLogRow)
    };
    setStage('finished');
    cb.current.onProgress(1);
    cb.current.onFinish(outcome);
  };

  const finishPractice = () => {
    if (done.current) return;
    done.current = true;
    cb.current.onFinish({ metrics: {}, trials: 0, valid: false, flags: ['practice'] });
  };

  const press = (side: Side, t: number) => live.current.respond?.(side, t);

  /* ---------- view ---------- */

  const inBlock = stage === 'guided' || stage === 'warmup' || stage === 'test' || stage === 'countdown' || stage === 'finished';
  const chip =
    stage === 'guided' ? `Practice · ${counter.i} of ${counter.n}` : stage === 'warmup' ? `Warm-up · ${counter.i} of ${counter.n}` : stage === 'test' || stage === 'countdown' ? 'Scored' : null;

  const card = (side: Side) => {
    const c = cardAt(side, layout);
    const shape = shapeOf(set, c.shape);
    const label = `${side === 0 ? 'Left' : 'Right'} card: ${COLOR_NAME[c.color]} ${shape}`;
    return (
      <div className="scs-card-cell" ref={(el) => (cardRefs.current[side] = el)}>
        <ResponseButton
          variant="big"
          className={`scs-card${hint === side ? ' is-hint' : ''}`}
          keys={side === 0 ? ['ArrowLeft', 'f'] : ['ArrowRight', 'j']}
          ariaLabel={label}
          onPress={(t) => press(side, t)}
        >
          <span className="scs-card-art" data-side={side === 0 ? 'left' : 'right'} data-shape={shape} data-color={COLOR_NAME[c.color]}>
            <Pictogram key={`${set}-${shape}`} shape={shape} color={c.color} className="scs-card-pic" />
          </span>
        </ResponseButton>
      </div>
    );
  };

  return (
    <div className="scs" ref={stageRef} data-scs-stage={stage} data-scs-layout={layout.aLeft ? 'a-left' : 'b-left'}>
      <div className="scs-top">{chip && <span className={`scs-chip${stage === 'warmup' || stage === 'guided' ? ' is-practice' : ''}`}>{chip}</span>}</div>

      <div className="scs-arena">
        {inBlock ? (
          <>
            <div className="scs-cue" aria-hidden>
              {([0, 1] as Cue[]).map((cue) => (
                <span key={cue} className="scs-cue-word" data-cue={CUE_WORD[cue]} ref={(el) => (cueEls.current[cue] = el)}>
                  {CUE_WORD[cue]}
                </span>
              ))}
            </div>
            <div className="scs-spot" aria-hidden>
              {(['practice', 'test'] as StimSet[]).flatMap((s) =>
                ([0, 1] as Pic[]).map((pic) => {
                  const parts = picParts(pic);
                  const shape = shapeOf(s, parts.shape);
                  return (
                    <div
                      key={`${s}:${pic}`}
                      className="scs-stim"
                      data-set={s}
                      data-shape={shape}
                      data-color={COLOR_NAME[parts.color]}
                      ref={(el) => (stimEls.current[`${s}:${pic}`] = el)}
                    >
                      <Pictogram shape={shape} color={parts.color} />
                    </div>
                  );
                })
              )}
            </div>
            <p className={`scs-coach${coach ? ` tone-${coach.tone}` : ''}`} role="status" aria-live="polite">
              {coach && (
                <span key={coach.id} className="scs-coach-msg">
                  {coach.text}
                </span>
              )}
            </p>
          </>
        ) : (
          <div className="scs-phase">{phaseCard()}</div>
        )}
      </div>

      <div className="scs-dock fx-card" data-idle={inBlock ? undefined : ''} role="group" aria-label="Target cards">
        {card(0)}
        {card(1)}
      </div>

      {stage === 'countdown' && <Countdown label="Scored block" onDone={() => setStage('test')} />}
      {fb.layer}
    </div>
  );

  function phaseCard() {
    if (stage === 'guided-intro') {
      return (
        <PhaseCard
          kicker={mode === 'practice' ? 'Practice · not scored' : 'First run · practice'}
          title="One picture, two rules"
          body={
            <>
              Each picture matches one card by its <b>shape</b> and the other by its <b>color</b>. The word above the picture
              tells you which rule to use.
            </>
          }
          action="Try it"
          onAction={() => setStage('guided')}
        >
          <RuleKey />
        </PhaseCard>
      );
    }
    if (stage === 'warmup-intro') {
      return round === 0 ? (
        <PhaseCard
          kicker="Warm-up · not scored"
          title="Five quick ones"
          body={
            <>
              Full speed, with a tick or a cross after each. Mostly <b>shape</b> — now and then <b>color</b>.
            </>
          }
          action="Start warm-up"
          onAction={() => setStage('warmup')}
        >
          <RuleKey />
        </PhaseCard>
      ) : (
        <PhaseCard
          kicker="Warm-up · not scored"
          title="Once more"
          body={
            <>
              {warmScore} of {PROTOCOL.practiceTrials} right. Read the word first — it decides which card is right.
            </>
          }
          action="Try again"
          onAction={() => setStage('warmup')}
        >
          <RuleKey />
        </PhaseCard>
      );
    }
    if (stage === 'test-intro') {
      return (
        <PhaseCard
          kicker={`Scored block · ${PROTOCOL.testTrials} pictures`}
          title="New pictures, same rules"
          body={
            <>
              No ticks or crosses from here. Answer as quickly and accurately as you can — each picture waits 2.5 seconds.
            </>
          }
          action="Start"
          onAction={() => setStage('countdown')}
        />
      );
    }
    // practice-done
    return (
      <PhaseCard
        kicker="Practice · not scored"
        title="That's the idea"
        body="The real run adds a short warm-up, then 30 pictures at full speed — mostly shape, now and then color."
        action="Done"
        onAction={finishPractice}
      />
    );
  }
}

/** the two rules as a tiny legend inside the phase cards */
function RuleKey() {
  return (
    <div className="scs-rulekey" aria-hidden>
      <span className="scs-rule">
        <b>shape</b>
        <span className="scs-rule-arrow">→</span> same shape
      </span>
      <span className="scs-rule">
        <b>color</b>
        <span className="scs-rule-arrow">→</span> same color
      </span>
    </div>
  );
}

/* ---------- coach copy (one line each) ---------- */

function ruleLine(cue: Cue): ReactNode {
  return (
    <>
      <b>{CUE_WORD[cue]}</b> → tap the same {cue === SHAPE ? 'shape' : 'color'}
    </>
  );
}

function guidedPrompt(t: TrialSpec, i: number): Coach {
  if (i === 4) return { tone: 'cue', text: <>Now the word can change — watch it</> };
  return { tone: 'cue', text: ruleLine(t.cue) };
}

function guidedLine(t: TrialSpec, i: number, ok: boolean, trials: TrialSpec[]): Coach {
  const rule = t.cue === SHAPE ? 'shape' : 'color';
  if (!ok)
    return {
      tone: 'bad',
      text: (
        <>
          <CloseIcon size={18} /> The word says <b>{CUE_WORD[t.cue]}</b> → the outlined card
        </>
      )
    };
  const prev = trials[i - 1];
  const twin = i > 0 && prev && prev.pic === t.pic && prev.cue !== t.cue;
  return {
    tone: 'good',
    text: twin ? (
      <>
        <CheckIcon size={18} /> Same picture, other rule — other card
      </>
    ) : (
      <>
        <CheckIcon size={18} /> Yes — same {rule}
      </>
    )
  };
}

function warmupLine(cue: Cue, code: number): Coach {
  const rule = cue === SHAPE ? 'shape' : 'color';
  if (code === CODE.correct)
    return {
      tone: 'good',
      text: (
        <>
          <CheckIcon size={18} /> Right — <b>{CUE_WORD[cue]}</b> → same {rule}
        </>
      )
    };
  if (code === CODE.timeout)
    return {
      tone: 'slow',
      text: (
        <>
          <ClockIcon size={18} /> Too slow — answer within 2.5 s
        </>
      )
    };
  if (code === CODE.anticipation)
    return {
      tone: 'slow',
      text: (
        <>
          <ClockIcon size={18} /> Too quick — wait for the picture
        </>
      )
    };
  return {
    tone: 'bad',
    text: (
      <>
        <CloseIcon size={18} /> The word was <b>{CUE_WORD[cue]}</b> → same {rule}
      </>
    )
  };
}
