import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { BrainStore, BrainTestDefinition, BrainDomain } from '../types';
import type { GameResult } from '../../types';
import {
  BASELINE_N,
  formatMetric,
  runIndex,
  sleepAssociation,
  sleepMinutes,
  stateForRun,
  stateFlags,
  type ClassifiedRun,
  type TestSummary
} from '../analytics';
import { resetBaseline } from '../store';
import { notifyBrainChanged } from './useBrainStore';
import {
  PRACTICE_QUALIFIER,
  calibratingCopy,
  calibratingShort,
  baselineFormingCopy,
  flagCopy,
  roleCopy,
  stateCopy,
  stateFlagCopy,
  stateNote,
  stateTone,
  trendCopy,
  verdictCopy
} from './copy';
import { AreaChart, MetricLine } from './dashCharts';
import { DAY_MS, clockTime, hoursLabel, relDay, segmentRows, shortDate, type AreaView, type RunDot } from './dashModel';
import { ChipRow, GradeBadge, RoleChip, SectionTitle, ToneArrow, inkVar } from './dashParts';
import { SourceList, TipList } from './evidence';
import { getGame } from '../../registry';
import { ChevronIcon } from '../../design/icons';
import { Modal, StatCard } from '../../components/ui';
import { sfx } from '../../audio';

/**
 * The area cards (Profile → Brain small multiples) and the AREA DETAIL view
 * they open. Every sentence comes from copy.ts; every statistic from
 * analytics.ts (through dashModel's positioning). SCIENCE.md §2.9 decides
 * what may show: no verdict without a baseline, no trend label before 8
 * scored runs over 3 weeks, and an improvement in a practice-prone area is
 * never shown without the practice qualifier (§4.1).
 */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export type DetailRange = '4w' | '12w' | 'all';

export const primaryDef = (test?: BrainTestDefinition) => test?.metrics.find((m) => m.id === test.primaryMetric);

export function fmtFor(test?: BrainTestDefinition) {
  const def = primaryDef(test);
  return (x: number) => formatMetric(def, x);
}

/** what the number on a card is */
export function levelCaption(v: AreaView): string {
  switch (v.levelKind) {
    case 'reference':
      return v.grade === 'C' ? 'Approximate' : 'Reference';
    case 'personal':
      return 'Personal';
    case 'calibrating':
      return 'Calibrating';
    case 'stale':
      return 'No run in 14 days';
    default:
      return v.status === 'no-test' ? 'No benchmark yet' : v.status === 'unmeasured' ? 'Not measured' : 'No level yet';
  }
}

/** Memory (§2.6 SHOULD): an improvement after recent Simon / Number Trail practice gets a note */
export function memoryPracticeNote(domainId: string, history: GameResult[], now: number): string | null {
  if (domainId !== 'memory') return null;
  const since = now - 14 * DAY_MS;
  const played = history.some((r) => r.finishedAt >= since && r.outcome !== 'abandoned' && (r.gameId === 'simon' || r.gameId === 'number-trail'));
  return played
    ? 'You also played Simon or Number Trail in the last two weeks — part of this may be practice on a similar task.'
    : null;
}

/** the one-line status of an area, honest to its data (§2.9) */
export function statusLine(v: AreaView): { text: string; tone: 'up' | 'down' | 'neutral' | null; qualifier?: string } {
  const sum = v.sum;
  const test = v.test;
  switch (v.status) {
    case 'no-test':
      return { text: 'No benchmark for this area yet', tone: null };
    case 'unmeasured':
      return { text: `Not measured yet — ${test?.name ?? 'its test'} is in Brain Lab`, tone: null };
    case 'calibrating':
      return { text: calibratingShort(sum?.runInDone ?? 0, test?.runIn ?? 1), tone: null };
    case 'forming':
      return { text: `Baseline forming ${Math.min(sum?.baselineProgress ?? 0, BASELINE_N)}/${BASELINE_N}`, tone: null };
    case 'reset':
      return { text: `Baseline reset ${shortDate(v.resetAt ?? Date.now())} — a new one forms over your next ${BASELINE_N} scored runs`, tone: null };
    case 'tracking':
    default: {
      const c = verdictCopy(sum!.verdict.verdict, !!test?.practiceProne);
      return { text: c.title, tone: c.tone, qualifier: c.tone === 'up' && test?.practiceProne ? PRACTICE_QUALIFIER : undefined };
    }
  }
}

/**
 * The §2.8 sleep "insight", in words: an ASSOCIATION in the player's own
 * data (§4.4), with its size in raw units and in steps of their usual
 * variation, the 95% interval and the bin sizes — never a cause.
 */
export function sleepInsight(v: AreaView, assoc: NonNullable<ReturnType<typeof sleepAssociation>>): string | null {
  const b = v.sum?.baseline;
  if (!b) return null;
  const def = primaryDef(v.test);
  const raw = Math.abs(assoc.diff * b.sigma);
  const dir = assoc.diff < 0 ? 'lower' : 'higher';
  const lo = Math.min(Math.abs(assoc.lo), Math.abs(assoc.hi));
  const hi = Math.max(Math.abs(assoc.lo), Math.abs(assoc.hi));
  return `On days after shorter sleep than usual (an hour or more under your usual), your ${v.domain.name} result was ${dir} by about ${formatMetric(def, raw)} — ${Math.abs(assoc.diff).toFixed(1)}× your usual day-to-day variation (95% interval ${lo.toFixed(1)}–${hi.toFixed(1)}×; ${assoc.nShort} runs after short sleep, ${assoc.nRest} others). This is an association in your own data, not proof of cause.`;
}

/* ---------- the shared legend ---------- */

export function AreaLegend({ ink, other }: { ink?: string; other?: boolean }) {
  const key = (body: ReactNode) => (
    <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden>
      {body}
    </svg>
  );
  return (
    <div className="bd-legend" style={ink ? inkVar(ink) : undefined}>
      <span className="bd-legend-item">
        {key(
          <>
            <path className="bd-week" d="M1 6h20" />
            <circle className="bd-week-dot" cx="11" cy="6" r="3.4" />
          </>
        )}
        Weekly mean
      </span>
      <span className="bd-legend-item">
        {key(<circle className="bd-dot scored" cx="11" cy="6" r="2.8" />)}
        Run
      </span>
      <span className="bd-legend-item">
        {key(<circle className="bd-dot practice" cx="11" cy="6" r="1.8" />)}
        Practice
      </span>
      <span className="bd-legend-item">
        {key(<circle className="bd-dot invalid" cx="11" cy="6" r="2.8" />)}
        Not valid
      </span>
      <span className="bd-legend-item">
        {key(<path className="bd-ewma" d="M1 8 C7 2 13 10 21 4" />)}
        Smoothed
      </span>
      <span className="bd-legend-item">
        {key(
          <>
            <rect className="bd-band" x="1" y="2" width="20" height="8" rx="2" />
            <path className="bd-baseline" d="M1 6h20" />
          </>
        )}
        Baseline ± normal weekly range
      </span>
      <span className="bd-legend-item">
        {key(<rect className="bd-calib-key" x="3" y="1" width="16" height="10" rx="3" />)}
        Calibrating
      </span>
      {other && (
        <span className="bd-legend-item">
          {key(<circle className="bd-dot other" cx="11" cy="6" r="2.4" />)}
          Earlier segment
        </span>
      )}
    </div>
  );
}

/* ---------- the overview card ---------- */

export function AreaCard({
  v,
  ink,
  t0,
  t1,
  index,
  onOpen
}: {
  v: AreaView;
  ink: string;
  t0: number;
  t1: number;
  index: number;
  onOpen: () => void;
}) {
  const d = v.domain;
  const st = statusLine(v);
  const sum = v.sum;
  const fmt = fmtFor(v.test);
  const caption = levelCaption(v);
  const today = v.status === 'tracking' ? sum?.today ?? null : null;
  const trend = v.status === 'tracking' ? sum?.trend ?? null : null;
  const rising = trend === 'rising' && v.test?.practiceProne;
  const qualifier = st.qualifier ?? (rising ? PRACTICE_QUALIFIER : undefined);
  const hasChart = v.dots.length > 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      className="bd-area-card fx-card bd-in"
      style={{ ...inkVar(ink), ['--i' as string]: index } as CSSProperties}
      onClick={() => {
        sfx.tap();
        onOpen();
      }}
      onKeyDown={onKey}
      aria-label={`${d.name}, ${v.level !== null ? `${Math.round(v.level)} ${caption.toLowerCase()}` : caption.toLowerCase()}. ${st.text}. Open details.`}
    >
      <div className="bd-area-top">
        <span className="bd-ink-dot lg" aria-hidden />
        <div className="bd-area-names">
          <span className="bd-area-name">{d.name}</span>
          <span className="bd-area-sub">{d.subtitle}</span>
        </div>
        <div className="bd-area-level">
          <span className={`bd-area-num${v.level === null ? ' none' : ''}`}>{v.level !== null ? Math.round(v.level) : '—'}</span>
          <span className="bd-area-cap">{caption}</span>
        </div>
        <ChevronIcon size={16} />
      </div>
      {hasChart ? (
        <AreaChart
          view={v}
          ink={ink}
          t0={t0}
          t1={t1}
          height={88}
          variant="mini"
          fmt={fmt}
          label={`${d.name}: ${v.dots.length} runs since ${shortDate(t0)}`}
        />
      ) : (
        <div className="bd-area-empty">
          <span>{v.status === 'no-test' ? 'Arrives with its benchmark' : 'Your runs will appear here'}</span>
        </div>
      )}
      <div className="bd-area-status">
        <span className="bd-status-main">
          {st.tone && <ToneArrow tone={st.tone} />}
          {st.text}
        </span>
        {qualifier && <span className="bd-qualifier">{qualifier}</span>}
        {(today || trend || (sum?.learningPhase && v.status !== 'unmeasured')) && (
          <span className="bd-status-chips">
            {today && (
              <span className="bd-chip">
                <ToneArrow tone={stateTone(today.label)} size={12} />
                Today · {stateCopy(today.label)}
              </span>
            )}
            {trend && <span className="bd-chip">{trendCopy(trend)}</span>}
            {sum?.learningPhase && v.status !== 'unmeasured' && <span className="bd-chip soft">Learning phase</span>}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- one run, expandable (area log and the full session log) ---------- */

export function RunRow({
  run,
  sum,
  test,
  domain,
  ink,
  store,
  todayKey,
  showArea
}: {
  run: ClassifiedRun;
  sum: TestSummary | null;
  test?: BrainTestDefinition;
  domain?: BrainDomain;
  ink: string;
  store: BrainStore;
  todayKey: string;
  showArea?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const s = run.s;
  const def = primaryDef(test);
  const idx = sum ? runIndex(sum, run) : null;
  const reasons = (s.flags ?? []).filter((f) => f !== 'practice').map(flagCopy);
  const st = open ? stateForRun(store, s) : undefined;
  const ci = open && s.checkinId ? store.checkins.find((c) => c.id === s.checkinId) : undefined;
  const flags = ci ? stateFlags(store, ci) : [];
  const other = sum && run.segment !== sum.segment;
  return (
    <button
      type="button"
      className={`bd-run${open ? ' open' : ''}`}
      style={inkVar(ink)}
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
    >
      <span className="bd-run-main">
        <span className={`bd-run-mark r-${run.role}`} aria-hidden />
        <span className="bd-run-text">
          <span className="bd-run-title">
            {showArea ? (test?.name ?? domain?.name ?? s.testId) : relDay(s.date, todayKey)}
            <RoleChip role={run.role} />
          </span>
          <span className="bd-run-sub">
            {showArea ? `${relDay(s.date, todayKey)} · ` : ''}
            {clockTime(s.finishedAt)} · {finite(run.x) ? formatMetric(def, run.x) : 'no score'}
            {idx !== null ? ` · index ${Math.round(idx)}` : ''}
            {other ? ' · earlier segment' : ''}
          </span>
          {reasons.length > 0 && <span className="bd-run-reason">{reasons.join(' ')}</span>}
        </span>
      </span>
      {open && (
        <span className="bd-run-detail">
          {(test?.metrics ?? []).map((m) => (
            <span key={m.id}>
              {m.label}: <b>{formatMetric(m, s.metrics[m.id])}</b>
            </span>
          ))}
          <span>
            {s.device.input} · {s.device.screen} · {s.device.platform}
            {s.device.standalone ? ' · installed app' : ''}
          </span>
          {st && (
            <span>
              Check-in:
              {finite(st.sss) ? ` sleepiness ${st.sss}/7` : ''}
              {sleepMinutes(st) !== null ? ` · slept ${hoursLabel(sleepMinutes(st) as number)}` : ''}
              {finite(st.stress) ? ` · stress ${st.stress}/5` : ''}
              {flags.length ? ` · ${flags.map((f) => stateFlagCopy(f).label).join(', ')}` : ''}
            </span>
          )}
          <span>Scored as: {roleCopy(run.role)}</span>
        </span>
      )}
    </button>
  );
}

/* ---------- the area detail view ---------- */

export function AreaDetail({
  v,
  ink,
  now,
  todayKey,
  range,
  onRange,
  onBack,
  history,
  store
}: {
  v: AreaView;
  ink: string;
  now: number;
  todayKey: string;
  range: DetailRange;
  onRange: (r: DetailRange) => void;
  onBack: () => void;
  history: GameResult[];
  store: BrainStore;
}) {
  const [confirm, setConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const d = v.domain;
  const test = v.test;
  const sum = v.sum;
  const def = primaryDef(test);
  const fmt = fmtFor(test);
  const first = v.dots.length ? Math.min(...v.dots.map((x) => x.t)) : now - 28 * DAY_MS;
  const t0 = range === '4w' ? now - 28 * DAY_MS : range === '12w' ? now - 84 * DAY_MS : Math.min(first - DAY_MS, now - 7 * DAY_MS);
  const t1 = now;
  const st = statusLine(v);
  const verdict = v.status === 'tracking' && sum ? verdictCopy(sum.verdict.verdict, !!test?.practiceProne) : null;
  const today = v.status === 'tracking' ? sum?.today ?? null : null;
  const todayCheckin = today ? store.checkins.filter((c) => c.date === todayKey).pop() : undefined;
  const todayFlags = todayCheckin ? stateFlags(store, todayCheckin) : [];
  const memNote = verdict?.tone === 'up' ? memoryPracticeNote(d.id, history, now) : null;
  const assoc = useMemo(() => (sum ? sleepAssociation(store, sum) : null), [store, sum]);
  const segments = useMemo(() => (sum ? segmentRows(sum) : []), [sum]);
  const runs = useMemo(() => (sum ? [...sum.runs].reverse() : []), [sum]);
  const others = (test?.metrics ?? []).filter((m) => m.id !== test?.primaryMetric);
  const hasOther = v.dots.some((x) => !x.current);

  const describeRun = (r: RunDot) => {
    const idx = sum ? runIndex(sum, r.run) : null;
    const reason = (r.run.s.flags ?? []).filter((f) => f !== 'practice').map(flagCopy)[0];
    return (
      <>
        <b>{finite(r.x) ? fmt(r.x) : 'No score'}</b>
        <span>
          {relDay(r.run.s.date, todayKey)} · {clockTime(r.t)}
        </span>
        <span>
          {roleCopy(r.role)}
          {idx !== null ? ` · index ${Math.round(idx)}` : ''}
        </span>
        {r.role === 'invalid' && reason && <span className="bd-tip-note">{reason}</span>}
        {!r.current && <span className="bd-tip-note">Earlier segment — another device or a reset</span>}
      </>
    );
  };
  const describeWeek = (k: AreaView['weekly'][number]) => (
    <>
      <b>{fmt(k.x)}</b>
      <span>Week of {shortDate(k.t - 3.5 * DAY_MS)}</span>
      <span>
        Weekly mean of {k.k} scored run{k.k === 1 ? '' : 's'}
      </span>
    </>
  );

  const doReset = () => {
    if (!test) return;
    resetBaseline(test.id);
    notifyBrainChanged();
    sfx.place();
    setConfirm(false);
  };

  const assocLine = assoc ? sleepInsight(v, assoc) : null;

  return (
    <div className="bd-detail" style={inkVar(ink)}>
      <button type="button" className="ghost-btn small bd-back" onClick={onBack}>
        <ChevronIcon size={14} dir="left" />
        All areas
      </button>

      <header className="bd-detail-head bd-in">
        <span className="bd-ink-dot xl" aria-hidden />
        <div className="bd-detail-names">
          <h2 className="bd-detail-title">{d.name}</h2>
          <p className="bd-detail-sub">{d.subtitle}</p>
          {test && (
            <p className="bd-detail-test">
              {test.name} · {test.paradigm}
            </p>
          )}
        </div>
        {test && <GradeBadge grade={v.grade} anchor={test.reference?.anchor} />}
      </header>

      <div className="stat-grid bd-detail-stats bd-in" style={{ ['--i' as string]: 1 } as CSSProperties}>
        <StatCard label="Level · 14 days" value={v.level !== null ? Math.round(v.level) : '—'} hint={levelCaption(v)} />
        <StatCard
          label="Baseline"
          value={v.baselineIndex !== null ? Math.round(v.baselineIndex) : '—'}
          hint={
            v.base
              ? formatMetric(def, v.base.value)
              : v.status === 'forming'
                ? `${Math.min(sum?.baselineProgress ?? 0, BASELINE_N)}/${BASELINE_N} runs`
                : 'Not set'
          }
        />
        <StatCard label="Usual variation" value={v.base ? `±${formatMetric(def, v.base.sigma)}` : '—'} hint="day to day" />
      </div>

      {v.dots.length > 0 ? (
        <section className="setup-section bd-in" style={{ ['--i' as string]: 2 } as CSSProperties}>
          <SectionTitle>{def ? `${def.label}${def.unit ? ` (${def.unit})` : ''}` : 'Primary metric'}</SectionTitle>
          <ChipRow<DetailRange>
            value={range}
            onChange={onRange}
            label="Chart range"
            options={[
              { id: '4w', label: '4 weeks' },
              { id: '12w', label: '12 weeks' },
              { id: 'all', label: 'All' }
            ]}
          />
          <div className="chart-card fx-card bd-chart-card">
            <AreaChart
              view={v}
              ink={ink}
              t0={t0}
              t1={t1}
              height={224}
              variant="full"
              fmt={fmt}
              describeRun={describeRun}
              describeWeek={describeWeek}
              label={`${d.name} ${def?.label ?? ''} over time: ${v.dots.length} runs${v.base ? `, baseline ${fmt(v.base.value)}` : ''}.`}
            />
            <AreaLegend ink={ink} other={hasOther} />
            <p className="bd-mini-note">Tap a dot for its details. Higher is better on this metric.</p>
          </div>
        </section>
      ) : (
        <div className="bd-locked fx-card bd-in">
          <p className="bd-locked-title">Not measured yet</p>
          <p className="bd-mini-note">
            {test ? `Take ${test.name} in Brain Lab — your runs, baseline and weekly verdicts will build up here.` : 'This area gets its benchmark soon.'}
          </p>
        </div>
      )}

      {sum && v.status !== 'unmeasured' && (
        <section className="setup-section bd-in" style={{ ['--i' as string]: 3 } as CSSProperties}>
          <SectionTitle>Where this area stands</SectionTitle>
          <div className="bd-status-card fx-card">
            <div className="bd-status-block">
              <p className="bd-status-title">
                {(verdict?.tone ?? st.tone) && <ToneArrow tone={(verdict?.tone ?? st.tone)!} size={16} />}
                {verdict ? verdict.title : st.text}
              </p>
              {verdict?.body && <p className="bd-status-body">{verdict.body}</p>}
              {verdict && sum.verdict.asOf && <p className="bd-mini-note">Evaluated on the week of {shortDate(new Date(sum.verdict.asOf + 'T12:00').getTime())}.</p>}
              {v.status === 'calibrating' && <p className="bd-status-body">{calibratingCopy(sum.runInDone, test!.runIn)}</p>}
              {v.status === 'forming' && <p className="bd-status-body">{baselineFormingCopy(sum.baselineProgress)}</p>}
              {v.status === 'reset' && (
                <p className="bd-status-body">
                  Your earlier runs stay in the history but are no longer compared with new ones. The next {BASELINE_N} scored runs, one per day, form your new
                  baseline.
                </p>
              )}
              {memNote && <p className="bd-qualifier">{memNote}</p>}
            </div>
            {today && (
              <div className="bd-status-block">
                <p className="bd-status-title">
                  <ToneArrow tone={stateTone(today.label)} size={16} />
                  Today · {stateCopy(today.label)}
                </p>
                <p className="bd-mini-note">
                  Compared with the median of your recent scored runs ({fmt(today.typical)}), in steps of your usual variation.
                </p>
                {stateNote(today.label) && <p className="bd-status-body">{stateNote(today.label)}</p>}
                {todayFlags.length > 0 && (
                  <p className="bd-status-body">
                    Today’s check-in: {todayFlags.map((f) => stateFlagCopy(f).label.toLowerCase()).join(', ')}.
                  </p>
                )}
              </div>
            )}
            {v.status === 'tracking' && (
              <div className="bd-status-block">
                <p className="bd-status-title">{trendCopy(sum.trend)}</p>
                {sum.trend === 'rising' && test?.practiceProne && <p className="bd-qualifier">{PRACTICE_QUALIFIER}</p>}
              </div>
            )}
            {sum.learningPhase && (
              <div className="bd-status-block">
                <p className="bd-status-title">
                  <span className="bd-chip soft">Learning phase</span>
                </p>
                <p className="bd-status-body">
                  Your scores on this test are still climbing as you learn it. The phase ends once your last 7 runs stop rising by more than your usual
                  day-to-day variation.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {others.length > 0 && sum && (
        <section className="setup-section">
          <SectionTitle>Other measures</SectionTitle>
          <div className="bd-metric-grid">
            {others.map((m) => {
              const pts = sum.segRuns
                .filter((r) => r.role !== 'invalid' && finite(r.s.metrics[m.id]))
                .map((r) => ({ t: r.s.finishedAt, x: r.s.metrics[m.id] }));
              return (
                <div key={m.id} className="bd-metric-card fx-card">
                  <p className="bd-metric-name">
                    {m.label}
                    {m.unit ? ` (${m.unit})` : ''}
                  </p>
                  <MetricLine points={pts} ink={ink} fmt={(x) => formatMetric(m, x)} t0={t0} t1={t1} />
                  <p className="bd-mini-note">
                    {m.better === 'higher' ? 'Higher is better' : 'Lower is better'}
                    {m.about ? ` · ${m.about}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="bd-mini-note">Diagnostics only — the area’s level and verdicts use its primary measure.</p>
        </section>
      )}

      {assocLine && (
        <section className="setup-section">
          <SectionTitle>Sleep and this area</SectionTitle>
          <div className="bd-insight fx-card">
            <p>{assocLine}</p>
          </div>
        </section>
      )}

      <section className="setup-section">
        <SectionTitle>How to improve {v.domain.name}</SectionTitle>
        <div className="fx-card bl-card-pad">
          <TipList tips={v.domain.improve} />
        </div>
        {v.domain.training.length > 0 && (
          <p className="bd-mini-note bd-train-pointer">
            Training games for this area (each tied to a research paradigm):{' '}
            {v.domain.training.map((t) => getGame(t.gameId)?.name ?? t.gameId).join(', ')} — open them from the area’s page in Brain Lab.
          </p>
        )}
        <SourceList sources={v.domain.sources} label="Why this area is measured this way" />
      </section>

      {runs.length > 0 && (
        <section className="setup-section">
          <SectionTitle aside={<span className="bd-count">{runs.length} runs</span>}>Run log</SectionTitle>
          <div className="bd-log fx-card">
            {runs.slice(0, page * 12).map((r) => (
              <RunRow key={r.s.id} run={r} sum={sum} test={test} domain={d} ink={ink} store={store} todayKey={todayKey} />
            ))}
          </div>
          {runs.length > page * 12 && (
            <button type="button" className="ghost-btn small bd-more" onClick={() => setPage((p) => p + 1)}>
              Show {Math.min(12, runs.length - page * 12)} more
            </button>
          )}
        </section>
      )}

      {segments.length > 0 && (
        <section className="setup-section">
          <SectionTitle>Segments</SectionTitle>
          <div className="bd-segments fx-card">
            {segments.map((g) => (
              <div key={g.segment} className={`bd-segment${g.current ? ' current' : ''}`}>
                <span className="bd-segment-title">
                  {g.current ? 'Current' : 'Earlier'} · {g.input} · {g.screen} · {g.platform}
                </span>
                <span className="bd-mini-note">
                  {shortDate(g.from)} – {shortDate(g.to)} · {g.valid} valid of {g.runs} runs · protocol v{g.protocol}
                  {g.resetAt ? ` · started by a reset on ${shortDate(g.resetAt)}` : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="bd-mini-note">
            A new device, input method, protocol version or a baseline reset starts a new segment with its own baseline — results are never pooled across
            segments.
          </p>
        </section>
      )}

      {test && sum && (v.status === 'forming' || v.status === 'tracking') && (
        <section className="setup-section">
          <button type="button" className="ghost-btn bd-reset-btn" onClick={() => setConfirm(true)}>
            Reset baseline…
          </button>
          <p className="bd-mini-note">
            For after an illness, a long break or a change of routine. One bad day is not a reason — day-to-day ups and downs are already part of your
            typical range.
          </p>
        </section>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title={`Reset your ${d.name} baseline?`}>
        <p className="modal-text">
          Your next {BASELINE_N} scored runs, one per day, will form a new baseline. Your earlier runs stay in your history, greyed out, but are no longer
          compared with new ones. There is no run-in this time.
        </p>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={() => setConfirm(false)}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={doReset}>
            Reset baseline
          </button>
        </div>
      </Modal>
    </div>
  );
}
