import { useMemo, useState, type CSSProperties } from 'react';
import type { BrainStore } from '../types';
import type { GameResult } from '../../types';
import { formatMetric, sleepAssociation, trainingVolume, type ClassifiedRun } from '../analytics';
import { TRAINING_NOTE } from '../domains';
import { stateFlagCopy } from './copy';
import { CheckinCalendar, ContextStack, LikertBars, VolumeBars } from './dashCharts';
import { addDays, dayRows, histogram, hoursLabel, relDay, type AreaView, type CheckinMark, type DayRow } from './dashModel';
import { RunRow, primaryDef, sleepInsight } from './dashArea';
import { ChipRow, SectionTitle } from './dashParts';

/**
 * Profile → Brain: the context sections — sleep / state / Reaction, the
 * check-in calendar, training volume and the full session log. Context is
 * never a score: flags annotate and stay in every analysis (SCIENCE.md
 * §2.8), insights are associations (§4.4), training is volume beside the
 * benchmarks (§0.1 — games train, benchmarks measure).
 */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/* ---------- sleep, state & Reaction ---------- */

export function ContextSection({
  store,
  views,
  inkOf,
  todayKey,
  days,
  onDays
}: {
  store: BrainStore;
  views: AreaView[];
  inkOf: (v: AreaView) => string;
  todayKey: string;
  days: 28 | 56;
  onDays: (d: 28 | 56) => void;
}) {
  const reaction = views.find((v) => v.domain.id === 'reaction') ?? null;
  const rows = useMemo(() => dayRows(store, reaction?.sum ?? null, todayKey, days), [store, reaction, todayKey, days]);
  const def = primaryDef(reaction?.test);
  const fmt = (x: number) => formatMetric(def, x);
  const sss = histogram(rows.map((r) => r.sss), 7);
  const stress = histogram(rows.map((r) => r.stress), 5);
  const answered = rows.filter((r) => r.sleep !== null || r.sss !== null || r.stress !== null).length;
  const flaggedDays = rows.filter((r) => r.flags.length).length;
  const insights = useMemo(
    () =>
      views
        .map((v) => {
          if (v.status !== 'tracking' || !v.sum) return null;
          const a = sleepAssociation(store, v.sum);
          const text = a ? sleepInsight(v, a) : null;
          return text ? { v, text } : null;
        })
        .filter((x): x is { v: AreaView; text: string } => x !== null),
    [views, store]
  );
  const reactionLabel = reaction
    ? `${reaction.domain.name}${def ? ` — ${def.label.toLowerCase()}${def.unit ? ` (${def.unit})` : ''}` : ''}`
    : 'Reaction';
  const reactionBase = reaction?.status === 'tracking' ? reaction.base?.value ?? null : null;

  const describeDay = (d: DayRow) => (
    <>
      <b>{relDay(d.key, todayKey)}</b>
      <span>{d.sleep !== null ? `Slept ${hoursLabel(d.sleep)}` : d.checkedIn ? 'Sleep not answered' : 'No check-in'}</span>
      {d.usual !== null && <span>Usual {hoursLabel(d.usual)}</span>}
      {d.reaction !== null && (
        <span>
          {reaction?.domain.name} {fmt(d.reaction)}
          {d.reactionRole === 'run-in' ? ' · calibrating' : ''}
        </span>
      )}
      {(d.sss !== null || d.stress !== null) && (
        <span>
          {d.sss !== null ? `Sleepiness ${d.sss}/7` : ''}
          {d.sss !== null && d.stress !== null ? ' · ' : ''}
          {d.stress !== null ? `Stress ${d.stress}/5` : ''}
        </span>
      )}
      {d.flags.length > 0 && <span className="bd-tip-note">{d.flags.map((f) => stateFlagCopy(f).label).join(' · ')}</span>}
    </>
  );

  return (
    <section className="setup-section bd-in" style={{ ['--i' as string]: 5 } as CSSProperties}>
      <SectionTitle>Sleep, state &amp; Reaction</SectionTitle>
      <ChipRow<28 | 56>
        value={days}
        onChange={onDays}
        label="Context range"
        options={[
          { id: 28, label: '4 weeks' },
          { id: 56, label: '8 weeks' }
        ]}
      />
      {answered === 0 && !rows.some((r) => r.reaction !== null) ? (
        <div className="bd-locked fx-card">
          <p className="bd-locked-title">No check-ins in this window</p>
          <p className="bd-mini-note">
            The daily check-in asks about sleep, sleepiness and stress before the tests. Those answers appear here as context beside your Reaction runs.
          </p>
        </div>
      ) : (
        <>
          <div className="chart-card fx-card bd-chart-card">
            <ContextStack
              days={rows}
              reactionInk={reaction ? inkOf(reaction) : 'var(--text)'}
              reactionLabel={reactionLabel}
              reactionBase={reactionBase}
              fmtReaction={fmt}
              describeDay={describeDay}
            />
            <div className="bd-legend">
              <span className="bd-legend-item">
                <span className="bd-key-bar" aria-hidden />
                Sleep
              </span>
              <span className="bd-legend-item">
                <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
                  <path className="bd-usual" d="M1 6h20" />
                </svg>
                Your usual sleep
              </span>
              <span className="bd-legend-item" style={{ ['--ink' as string]: reaction ? inkOf(reaction) : 'var(--text)' } as CSSProperties}>
                <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
                  <path className="bd-react-line" d="M1 6h20" />
                  <circle className="bd-dot scored-solid" cx="11" cy="6" r="3" />
                </svg>
                Reaction, scored run
              </span>
              <span className="bd-legend-item">
                <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
                  <path className="bd-baseline" d="M1 6h20" />
                </svg>
                Reaction baseline
              </span>
              <span className="bd-legend-item">
                <span className="bd-key-flag" aria-hidden />
                Flagged day
              </span>
            </div>
            <p className="bd-mini-note">
              Two charts on one day axis, each on its own scale. Flags are context only — flagged days stay in every analysis.
              {flaggedDays ? ` ${flaggedDays} flagged day${flaggedDays === 1 ? '' : 's'} in this window.` : ''}
            </p>
          </div>
          <div className="bd-likert-pair">
            <div className="chart-card fx-card">
              <LikertBars counts={sss} title="Sleepiness" scale="Stanford scale" low="1 · wide awake" high="7 · sleep onset soon" />
            </div>
            <div className="chart-card fx-card">
              <LikertBars counts={stress} title="Stress" scale="Elo single item" low="1 · not at all" high="5 · very much" />
            </div>
          </div>
        </>
      )}
      <div className="bd-insights">
        <p className="bd-subhead">Sleep insights</p>
        {insights.length ? (
          insights.map(({ v, text }) => (
            <div key={v.domain.id} className="bd-insight fx-card" style={{ ['--ink' as string]: inkOf(v) } as CSSProperties}>
              <span className="bd-ink-dot" aria-hidden />
              <p>{text}</p>
            </div>
          ))
        ) : (
          <p className="bd-mini-note">
            An insight appears for an area after 28 days and 20 scored runs with sleep recorded — at least 10 after shorter sleep and 10 after usual
            sleep — and only when the difference is clear of chance (its 95% interval excludes zero). None qualifies yet.
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------- check-in calendar ---------- */

export function CalendarSection({
  store,
  marks,
  streak,
  longest,
  todayKey
}: {
  store: BrainStore;
  marks: Map<string, CheckinMark>;
  streak: number;
  longest: number;
  todayKey: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  let last30 = 0;
  for (let i = 0; i < 30; i++) if (marks.get(addDays(todayKey, -i)) === 'done') last30++;
  const pickedLine = (() => {
    if (!picked) return 'Tap a day to see it.';
    const m = marks.get(picked);
    if (!m) return `${relDay(picked, todayKey)} — no check-in.`;
    const cis = store.checkins.filter((c) => c.date === picked);
    const tests = new Set(store.sessions.filter((s) => cis.some((c) => c.id === s.checkinId)).map((s) => s.testId)).size;
    return `${relDay(picked, todayKey)} — ${m === 'done' ? 'check-in completed' : 'check-in started, not finished'}${tests ? ` · ${tests} test${tests === 1 ? '' : 's'}` : ''}.`;
  })();
  return (
    <section className="setup-section bd-in" style={{ ['--i' as string]: 6 } as CSSProperties}>
      <SectionTitle>Check-in calendar</SectionTitle>
      <div className="chart-card fx-card bd-chart-card">
        <div className="bd-cal-stats">
          <span>
            <b>{streak}</b> day{streak === 1 ? '' : 's'} in a row
          </span>
          <span>
            Longest <b>{longest}</b>
          </span>
          <span>
            <b>{last30}</b> of the last 30 days
          </span>
        </div>
        <CheckinCalendar marks={marks} todayKey={todayKey} onPick={setPicked} />
        <div className="bd-legend">
          <span className="bd-legend-item">
            <span className="bd-key-cell done" aria-hidden />
            Completed
          </span>
          <span className="bd-legend-item">
            <span className="bd-key-cell started" aria-hidden />
            Started
          </span>
          <span className="bd-legend-item">
            <span className="bd-key-cell none" aria-hidden />
            No check-in
          </span>
          <span className="bd-legend-item">
            <span className="bd-key-cell none today" aria-hidden />
            Today
          </span>
        </div>
        <p className="bd-mini-note" aria-live="polite">
          {pickedLine}
        </p>
      </div>
    </section>
  );
}

/* ---------- training volume ---------- */

export function VolumeSection({
  views,
  inkOf,
  history,
  now
}: {
  views: AreaView[];
  inkOf: (v: AreaView) => string;
  history: GameResult[];
  now: number;
}) {
  const v7 = useMemo(() => trainingVolume(history, now, 7), [history, now]);
  const v28 = useMemo(() => trainingVolume(history, now, 28), [history, now]);
  const rows = views.map((v) => ({ id: v.domain.id, name: v.domain.short, ink: inkOf(v), d7: v7[v.domain.id], d28: v28[v.domain.id] }));
  const any = rows.some((r) => r.d28 > 0);
  return (
    <section className="setup-section bd-in" style={{ ['--i' as string]: 7 } as CSSProperties}>
      <SectionTitle>Training — plays per area</SectionTitle>
      <div className="chart-card fx-card bd-chart-card">
        {any ? (
          <>
            <div className="bd-legend top">
              <span className="bd-legend-item">
                <span className="bd-key-vol d7" aria-hidden />
                Last 7 days
              </span>
              <span className="bd-legend-item">
                <span className="bd-key-vol d28" aria-hidden />
                Last 28 days
              </span>
            </div>
            <VolumeBars rows={rows} />
          </>
        ) : (
          <p className="bd-mini-note">No training games finished in the last 28 days.</p>
        )}
        <p className="bd-mini-note">
          Finished plays of each area’s training games, from your game history (a game can train more than one area). Context only — playing never
          changes a benchmark score. {TRAINING_NOTE}
        </p>
      </div>
    </section>
  );
}

/* ---------- the full session log ---------- */

const PAGE = 20;

export function LogSection({
  store,
  views,
  inkOf,
  todayKey
}: {
  store: BrainStore;
  views: AreaView[];
  inkOf: (v: AreaView) => string;
  todayKey: string;
}) {
  const [page, setPage] = useState(1);
  const items = useMemo(() => {
    const out: { run: ClassifiedRun; v: AreaView | null }[] = [];
    const known = new Set<string>();
    for (const v of views) {
      for (const run of v.sum?.runs ?? []) {
        out.push({ run, v });
        known.add(run.s.id);
      }
    }
    // runs of a test that is no longer registered: shown with their stored role
    for (const s of store.sessions) {
      if (known.has(s.id)) continue;
      const x = Object.values(s.metrics).find(finite) ?? NaN;
      out.push({ run: { s, role: s.valid ? s.runType : 'invalid', segment: '', x }, v: views.find((v) => v.domain.id === s.domain) ?? null });
    }
    return out.sort((a, b) => b.run.s.finishedAt - a.run.s.finishedAt);
  }, [views, store]);
  if (!items.length) return null;
  const valid = items.filter((i) => i.run.role !== 'invalid').length;
  return (
    <section className="setup-section bd-in" style={{ ['--i' as string]: 8 } as CSSProperties}>
      <SectionTitle aside={<span className="bd-count">{items.length} runs · {valid} valid</span>}>All benchmark runs</SectionTitle>
      <div className="bd-log fx-card">
        {items.slice(0, page * PAGE).map(({ run, v }) => (
          <RunRow
            key={run.s.id}
            run={run}
            sum={v && v.test?.id === run.s.testId ? v.sum : null}
            test={v && v.test?.id === run.s.testId ? v.test : undefined}
            domain={v?.domain}
            ink={v ? inkOf(v) : 'var(--text-dim)'}
            store={store}
            todayKey={todayKey}
            showArea
          />
        ))}
      </div>
      {items.length > page * PAGE && (
        <button type="button" className="ghost-btn small bd-more" onClick={() => setPage((p) => p + 1)}>
          Show {Math.min(PAGE, items.length - page * PAGE)} more
        </button>
      )}
    </section>
  );
}

