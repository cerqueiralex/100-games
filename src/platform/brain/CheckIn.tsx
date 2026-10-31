import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BrainStateReport } from './types';
import {
  checkinStreak,
  planCheckin,
  rankAreas,
  runIndex,
  stateFlags,
  summarizeAreas,
  summarizeTest,
  todayComposite,
  todaysCheckin
} from './analytics';
import { getBrainDomain, SSS_ITEMS, STRESS_ITEM, TRAINING_NOTE } from './domains';
import { getBrainTest, BRAIN_TESTS } from './registry';
import { startCheckin } from './store';
import { notifyBrainChanged, useBrainStore } from './ui/useBrainStore';
import { BrainRunner, SessionStrip, type SessionStep } from './BrainRunner';
import { areaStyle, CheckinEmblem, fmtIndex, StateFlagChips, TestPlate, useCountUp } from './ui/parts';
import { batteryMinutes, checkinRuns, remainingTests, weakestAreas } from './ui/model';
import { practiceFor, roleCopy, stateCopy, TODAY_COMPOSITE_LABEL, flagCopy } from './ui/copy';
import { getGame } from '../registry';
import { gameIcons } from '../design/gameIcons';
import { sfx } from '../audio';
import { BedIcon, CheckIcon, ChevronIcon, CloseIcon, CupIcon, MoonIcon } from '../design/icons';

/**
 * The daily check-in (SCIENCE.md §2.8, §2.10): one screen of state
 * questions (≤ 25 s, every item skippable, skipped = missing — never a
 * neutral value; only sleep times are prefilled), then the planned battery
 * in canonical order through the runner with a session strip, then a
 * summary with today's results, context flags, the "Today" composite and
 * two training shortcuts from the weakest areas.
 *
 * The check-in record is written when the questions are answered (or
 * skipped) — startCheckin — so a check-in left half-way can be resumed from
 * the Brain Lab hero later the same day: it reopens at the first planned
 * test that has no run yet.
 */

export interface CheckInProps {
  /** a quick day: the check-in plus Reaction only (§2.10) */
  quick?: boolean;
  onExit: () => void;
  onOpenGame: (gameId: string) => void;
}

type Phase = { kind: 'state' } | { kind: 'tests'; checkinId: string; testId: string } | { kind: 'summary'; checkinId: string };

export function CheckIn({ quick = false, onExit, onOpenGame }: CheckInProps) {
  const store = useBrainStore();
  const [phase, setPhase] = useState<Phase>(() => {
    const open = todaysCheckin(store);
    if (open) {
      const left = remainingTests(store, open);
      if (left.length) return { kind: 'tests', checkinId: open.id, testId: left[0] };
      return { kind: 'summary', checkinId: open.id };
    }
    return { kind: 'state' };
  });
  const plan = useMemo(() => {
    if (quick) {
      const core = BRAIN_TESTS.filter((t) => t.perWeek === 7).map((t) => t.id);
      return core.length ? core : planCheckin(store).slice(0, 1);
    }
    return planCheckin(store);
    // the plan is fixed when the screen opens — answering questions must not reshuffle it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase.kind === 'state') {
    return (
      <StateScreen
        plan={plan}
        onExit={onExit}
        onSubmit={(state) => {
          const { checkin } = startCheckin(plan, state);
          notifyBrainChanged();
          sfx.tap();
          if (plan.length) setPhase({ kind: 'tests', checkinId: checkin.id, testId: plan[0] });
          else setPhase({ kind: 'summary', checkinId: checkin.id });
        }}
      />
    );
  }

  const checkin = store.checkins.find((c) => c.id === phase.checkinId);
  if (!checkin) {
    // the store was replaced underneath (an import, a reset) — nothing to resume
    return <CheckInGone onExit={onExit} />;
  }

  if (phase.kind === 'tests') {
    const test = getBrainTest(phase.testId);
    if (!test) return <CheckInGone onExit={onExit} />;
    const done = checkinRuns(store, checkin.id);
    const planned = checkin.testIds.filter((t) => getBrainTest(t));
    const steps: SessionStep[] = [
      { id: 'state', label: 'Check-in', state: 'done' },
      ...planned.map((t) => ({
        id: t,
        label: getBrainTest(t)?.name ?? t,
        state: (t === phase.testId ? 'current' : done.has(t) ? 'done' : 'todo') as SessionStep['state']
      }))
    ];
    const advance = () => {
      const fresh = remainingTests(store, checkin).filter((t) => t !== phase.testId);
      // the next planned test after this one that still has no run, else the summary
      const after = planned.slice(planned.indexOf(phase.testId) + 1).find((t) => fresh.includes(t)) ?? fresh[0];
      setPhase(after ? { kind: 'tests', checkinId: checkin.id, testId: after } : { kind: 'summary', checkinId: checkin.id });
    };
    const isLast = !planned.slice(planned.indexOf(phase.testId) + 1).some((t) => !done.has(t)) && remainingTests(store, checkin).filter((t) => t !== phase.testId).length === 0;
    return (
      <BrainRunner
        key={phase.testId}
        test={test}
        checkinId={checkin.id}
        steps={steps}
        next={{ label: isLast ? 'See summary' : 'Next test', onNext: advance }}
        onClose={onExit}
      />
    );
  }

  return <Summary checkinId={checkin.id} onExit={onExit} onOpenGame={onOpenGame} onRetry={(testId) => setPhase({ kind: 'tests', checkinId: checkin.id, testId })} />;
}

function CheckInGone({ onExit }: { onExit: () => void }) {
  return (
    <div className="bl-layer">
      <header className="bl-layer-head">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Close">
          <CloseIcon />
        </button>
        <span />
        <span className="header-spacer" aria-hidden />
      </header>
      <section className="bl-center-card fx-card">
        <h1 className="bl-h1">This check-in is no longer here</h1>
        <p className="bl-note">Your Brain Lab data was replaced (an import or a reset). Start a new check-in from Brain Lab.</p>
        <button type="button" className="primary-btn" onClick={onExit}>
          Back to Brain Lab
        </button>
      </section>
    </div>
  );
}

/* ---------- the state questions ---------- */

/**
 * Mood faces beside each scale point (owner request, 2026-10-31) — a quick
 * visual read of the scale's direction. Decorative only: the verbatim wording
 * and the number stay the answer, and the faces are aria-hidden.
 */
const SSS_FACES = ['😃', '🙂', '😌', '😐', '🥱', '😪', '😴'];
const QUALITY_FACES = ['😫', '😕', '😐', '🙂', '😊'];
const STRESS_FACES = ['😌', '🙂', '😐', '😟', '😫'];
const faced = (faces: string[]) =>
  faces.map((f, i) => ({
    value: i + 1,
    label: (
      <>
        <span className="bl-q-emoji" aria-hidden>
          {f}
        </span>
        <span>{i + 1}</span>
      </>
    ),
    aria: String(i + 1)
  }));

/** a row of large single-choice chips; tapping the picked chip again clears it (skip = missing) */
function ChipRow<T extends string | number | boolean>({
  options,
  value,
  onChange,
  label,
  ends
}: {
  options: { value: T; label: ReactNode; aria?: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  label: string;
  ends?: [string, string];
}) {
  return (
    <div className="bl-q-chips-wrap">
      <div className="bl-q-chips" role="radiogroup" aria-label={label} style={{ ['--n' as string]: options.length } as CSSProperties}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.aria}
              className={`bl-q-chip${on ? ' on' : ''}`}
              onClick={() => {
                sfx.tap();
                onChange(on ? undefined : o.value);
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {ends && (
        <div className="bl-q-ends" aria-hidden>
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

function Question({ icon, title, hint, children, answered }: { icon?: ReactNode; title: string; hint?: string; children: ReactNode; answered: boolean }) {
  return (
    <section className={`bl-q fx-card${answered ? ' answered' : ''}`}>
      <header className="bl-q-head">
        {icon && <span className="bl-q-icon" aria-hidden>{icon}</span>}
        <h2 className="bl-q-title">{title}</h2>
        <span className="bl-q-state">{answered ? <CheckIcon size={14} /> : 'Optional'}</span>
      </header>
      {hint && <p className="bl-q-hint">{hint}</p>}
      {children}
    </section>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <label className={`bl-time${value ? ' set' : ''}`}>
      <span className="bl-time-label">{label}</span>
      <span className="bl-time-row">
        <input
          type="time"
          className="bl-time-input"
          value={value ?? ''}
          step={300}
          aria-label={label}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </span>
    </label>
  );
}

function StateScreen({ plan, onExit, onSubmit }: { plan: string[]; onExit: () => void; onSubmit: (state: BrainStateReport | undefined) => void }) {
  const store = useBrainStore();
  // only the sleep TIMES are prefilled (from the previous check-in) — ratings never are (§2.8)
  const prev = useMemo(() => [...store.checkins].reverse().find((c) => c.state?.bedTime || c.state?.wakeTime)?.state, [store]);
  const [s, setS] = useState<BrainStateReport>(() => ({
    ...(prev?.bedTime ? { bedTime: prev.bedTime } : {}),
    ...(prev?.wakeTime ? { wakeTime: prev.wakeTime } : {})
  }));
  const set = <K extends keyof BrainStateReport>(k: K, v: BrainStateReport[K] | undefined) =>
    setS((cur) => {
      const next = { ...cur };
      if (v === undefined) delete next[k];
      else next[k] = v;
      return next;
    });
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  const answered = Object.keys(s).filter((k) => k !== 'bedTime' && k !== 'wakeTime').length + (s.bedTime && s.wakeTime ? 1 : 0);
  const steps: SessionStep[] = [
    { id: 'state', label: 'Check-in', state: 'current' },
    ...plan.map((t) => ({ id: t, label: getBrainTest(t)?.name ?? t, state: 'todo' as const }))
  ];

  return (
    <div className="bl-layer bl-state">
      <header className="bl-layer-head">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Close">
          <CloseIcon />
        </button>
        <span className="bl-layer-title">Daily check-in</span>
        <span className="header-spacer" aria-hidden />
      </header>
      {plan.length > 0 && <SessionStrip steps={steps} />}
      <div className="bl-state-intro">
        <h1 ref={headRef} tabIndex={-1} className="bl-h1">
          How are you today?
        </h1>
        <p className="bl-note">
          About 25 seconds. Every question is optional — a skipped answer is stored as missing, never as a middle value. Your answers add
          context to today’s scores; they are never a score themselves.
        </p>
      </div>

      <Question icon={<MoonIcon size={16} />} title="Sleepiness right now" hint="Pick the statement that fits you best." answered={s.sss !== undefined}>
        <div className="bl-sss" role="radiogroup" aria-label="Stanford Sleepiness Scale">
          {SSS_ITEMS.map((text, i) => {
            const v = i + 1;
            const on = s.sss === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={on}
                className={`bl-sss-row${on ? ' on' : ''}`}
                onClick={() => {
                  sfx.tap();
                  set('sss', on ? undefined : v);
                }}
              >
                <span className="bl-sss-num">{v}</span>
                <span className="bl-sss-emoji" aria-hidden>
                  {SSS_FACES[i]}
                </span>
                <span className="bl-sss-text">{text}</span>
              </button>
            );
          })}
        </div>
        <p className="bl-cite">Stanford Sleepiness Scale (Hoddes et al., 1973)</p>
      </Question>

      <Question
        icon={<BedIcon size={16} />}
        title="Sleep last night"
        hint={prev?.bedTime || prev?.wakeTime ? 'Times are filled in from your last check-in — adjust if they changed.' : undefined}
        answered={!!(s.bedTime && s.wakeTime)}
      >
        <div className="bl-time-grid">
          <TimeField label="Went to bed" value={s.bedTime} onChange={(v) => set('bedTime', v)} />
          <TimeField label="Got up" value={s.wakeTime} onChange={(v) => set('wakeTime', v)} />
        </div>
        {(s.bedTime || s.wakeTime) && (
          <button
            type="button"
            className="bl-link bl-clear-times"
            onClick={() => {
              set('bedTime', undefined);
              set('wakeTime', undefined);
            }}
          >
            Not sure — clear the times
          </button>
        )}
        <div className="bl-stepper" role="group" aria-label="Minutes awake during the night">
          <span className="bl-stepper-label">Awake during the night</span>
          <div className="bl-stepper-ctl">
            <button
              type="button"
              className="bl-stepper-btn"
              aria-label="15 minutes less"
              disabled={s.awakeMin === undefined || s.awakeMin === 0}
              onClick={() => set('awakeMin', Math.max(0, (s.awakeMin ?? 0) - 15))}
            >
              −
            </button>
            <button
              type="button"
              className={`bl-stepper-value${s.awakeMin === undefined ? ' empty' : ''}`}
              onClick={() => set('awakeMin', s.awakeMin === undefined ? 0 : undefined)}
              aria-label={s.awakeMin === undefined ? 'Not answered — tap for none' : `${s.awakeMin} minutes — tap to clear`}
            >
              {s.awakeMin === undefined ? 'Not set' : s.awakeMin === 0 ? 'None' : s.awakeMin < 60 ? `${s.awakeMin} min` : `${Math.floor(s.awakeMin / 60)} h${s.awakeMin % 60 ? ` ${s.awakeMin % 60}` : ''}`}
            </button>
            <button
              type="button"
              className="bl-stepper-btn"
              aria-label="15 minutes more"
              disabled={(s.awakeMin ?? 0) >= 360}
              onClick={() => set('awakeMin', Math.min(360, (s.awakeMin ?? -15) + 15))}
            >
              +
            </button>
          </div>
        </div>
      </Question>

      <Question title="Sleep quality" answered={s.sleepQuality !== undefined}>
        <ChipRow
          label="Sleep quality, 1 very poor to 5 very good"
          value={s.sleepQuality}
          onChange={(v) => set('sleepQuality', v)}
          ends={['Very poor', 'Very good']}
          options={faced(QUALITY_FACES)}
        />
      </Question>

      <Question title="Stress" answered={s.stress !== undefined}>
        <p className="bl-q-verbatim">{STRESS_ITEM}</p>
        <ChipRow
          label="Stress, 1 not at all to 5 very much"
          value={s.stress}
          onChange={(v) => set('stress', v)}
          ends={['Not at all', 'Very much']}
          options={faced(STRESS_FACES)}
        />
        <p className="bl-cite">Single-item stress question (Elo et al., 2003)</p>
      </Question>

      <Question icon={<CupIcon size={16} />} title="Caffeine since waking" answered={s.caffeine !== undefined}>
        <ChipRow
          label="Caffeine since waking"
          value={s.caffeine}
          onChange={(v) => set('caffeine', v)}
          options={[
            { value: 0 as const, label: 'None' },
            { value: 1 as const, label: '1 serving' },
            { value: 2 as const, label: '2 or more' }
          ]}
        />
      </Question>

      <Question title="Exercise in the last hour" answered={s.exercise !== undefined}>
        <ChipRow
          label="Exercise in the last hour"
          value={s.exercise}
          onChange={(v) => set('exercise', v)}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ]}
        />
      </Question>

      <div className="bl-actions sticky">
        <button type="button" className="ghost-btn" onClick={() => onSubmit(undefined)}>
          Skip questions
        </button>
        <button type="button" className="primary-btn" onClick={() => onSubmit(Object.keys(s).length ? s : undefined)}>
          <span className="bl-btn-stack">
            <span>{plan.length ? (answered ? 'Continue' : 'Continue without answers') : 'Save check-in'}</span>
            <small>{plan.length ? `${plan.length} ${plan.length === 1 ? 'test' : 'tests'} · ≈ ${batteryMinutes(plan, false)} min` : 'No tests due today'}</small>
          </span>
        </button>
      </div>
    </div>
  );
}

/* ---------- the summary ---------- */

function Summary({
  checkinId,
  onExit,
  onOpenGame,
  onRetry
}: {
  checkinId: string;
  onExit: () => void;
  onOpenGame: (gameId: string) => void;
  onRetry: (testId: string) => void;
}) {
  const store = useBrainStore();
  const checkin = store.checkins.find((c) => c.id === checkinId)!;
  const areas = useMemo(() => summarizeAreas(store), [store]);
  const composite = todayComposite(areas);
  const flags = stateFlags(store, checkin);
  const streak = checkinStreak(store);
  const shownStreak = useCountUp(streak, { duration: 700, from: Math.max(0, streak - 1) });
  const ranked = rankAreas(areas);
  const training = weakestAreas(areas, ranked, 2)
    .map((id) => {
      const d = getBrainDomain(id)!;
      const link = d.training.find((t) => getGame(t.gameId));
      return link ? { domain: d, link, game: getGame(link.gameId)! } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  const runs = checkinRuns(store, checkinId);
  const complete = !!checkin.completedAt;

  return (
    <div className="bl-layer bl-summary">
      <header className="bl-layer-head">
        <button type="button" className="icon-btn" onClick={onExit} aria-label="Close">
          <CloseIcon />
        </button>
        <span className="bl-layer-title">Daily check-in</span>
        <span className="header-spacer" aria-hidden />
      </header>

      <section className="bl-summary-hero">
        <span className="bl-summary-emblem">
          <CheckinEmblem size={84} warm={complete} />
        </span>
        <h1 ref={headRef} tabIndex={-1} className="bl-h1">
          {complete ? 'Check-in complete' : 'Check-in saved'}
        </h1>
        <p className="bl-note">
          {streak > 0 ? (
            <>
              <strong className="bl-tabular">{Math.round(shownStreak ?? streak)}</strong> {streak === 1 ? 'day' : 'days in a row'} of check-ins
            </>
          ) : (
            'Your answers are saved with today’s runs.'
          )}
        </p>
        {flags.length > 0 && (
          <div className="bl-summary-flags">
            <StateFlagChips flags={flags} />
            <span className="bl-note">Context for today’s scores — flagged days stay in every analysis.</span>
          </div>
        )}
      </section>

      {composite && (
        <section className="bl-composite fx-card">
          <span className="bl-composite-label">{TODAY_COMPOSITE_LABEL}</span>
          <span className="bl-composite-value">{composite.index}</span>
          <span className="bl-note">
            Average of today’s {composite.n} alertness-sensitive areas against their typical ranges · 50 is typical. Never merged with the Mean.
          </span>
        </section>
      )}

      <section className="bl-block">
        <h2 className="bl-h3">Today’s results</h2>
        <ul className="bl-today-list">
          {checkin.testIds.map((tid, i) => {
            const test = getBrainTest(tid);
            if (!test) return null;
            const sum = summarizeTest(test, store);
            const sid = runs.get(tid);
            const run = sid ? sum.runs.find((r) => r.s.id === sid) : undefined;
            const idx = run ? runIndex(sum, run) : null;
            const role = run?.role;
            const today = role === 'baseline' || role === 'tracking' ? sum.today : null;
            return (
              <li key={tid} className="bl-today-item fx-card" style={{ ...areaStyle(test.domain), ['--i' as string]: i } as CSSProperties}>
                <TestPlate test={test} domain={test.domain} size={40} />
                <span className="bl-today-main">
                  <strong>{test.name}</strong>
                  <span className="bl-note">
                    {!run
                      ? 'Not run yet'
                      : role === 'invalid'
                        ? flagCopy(run.s.flags?.[0] ?? 'invalid')
                        : role === 'run-in'
                          ? `Calibrating ${sum.runInDone}/${test.runIn}`
                          : today
                            ? stateCopy(today.label)
                            : roleCopy(role ?? 'tracking')}
                  </span>
                </span>
                {run && role !== 'invalid' ? (
                  <span className="bl-today-index">{idx !== null ? fmtIndex(idx) : <CheckIcon size={18} />}</span>
                ) : (
                  <button type="button" className="ghost-btn small" onClick={() => onRetry(tid)}>
                    {run ? 'Retry' : 'Run'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {training.length > 0 && (
        <section className="bl-block">
          <h2 className="bl-h3">Today’s training</h2>
          <p className="bl-note bl-gap">Two games for your lower areas. Games train; benchmarks measure — playing is never recorded as a Brain Lab score.</p>
          <div className="bl-train-list">
            {training.map(({ domain, link, game }) => (
              <button
                key={game.id}
                type="button"
                className="bl-train fx-card"
                style={areaStyle(domain.id)}
                onClick={() => {
                  sfx.tap();
                  onOpenGame(game.id);
                }}
              >
                <span className="bl-train-icon" aria-hidden>
                  {gameIcons[game.id]}
                </span>
                <span className="bl-train-main">
                  <span className="bl-train-kicker">{domain.name}</span>
                  <strong>{game.name}</strong>
                  <span className="bl-train-why">
                    {practiceFor(domain.subtitle)} {link.why}
                  </span>
                  <span className="bl-train-note">{TRAINING_NOTE}</span>
                </span>
                <ChevronIcon size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="bl-actions sticky single">
        <button type="button" className="primary-btn" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
