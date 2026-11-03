import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { BrainDomainId } from '../types';
import { useAppState } from '../../AppState';
import {
  checkinStreak,
  meanSummary,
  summarizeAreas,
  todayComposite,
  type MeanSummary
} from '../analytics';
import { BRAIN_DISCLAIMER, BRAIN_ONBOARDING, BRAIN_DOMAINS } from '../domains';
import { clearBrain } from '../store';
import { useBrainDay, useBrainStore, notifyBrainChanged } from './useBrainStore';
import { BrainRadar } from './BrainRadar';
import { TODAY_COMPOSITE_LABEL, meanLabel, verdictCopy, PRACTICE_QUALIFIER } from './copy';
import { MeanTrendChart } from './dashCharts';
import {
  DAY_MS,
  buildAreaView,
  checkinMarks,
  clockTime,
  longestCheckinStreak,
  meanBaselineIndex,
  relDay,
  shortDate,
  type AreaView
} from './dashModel';
import { AreaCard, AreaDetail, AreaLegend, type DetailRange } from './dashArea';
import { CalendarSection, ContextSection, LogSection, VolumeSection } from './dashSections';
import { CountUp, GradeBadge, ScaleBar, SectionTitle, ToneArrow, useInks } from './dashParts';
import { BrainIcon, ChevronIcon, InfoIcon, LockIcon } from '../../design/icons';
import { Modal, StatCard } from '../../components/ui';
import { sfx } from '../../audio';
import { GAMES } from '../../registry';
import { coach, setCoachGameNames, type CoachAction } from '../coach';
import { CoachPanel, TipList } from './evidence';

/**
 * Profile → Brain — the Brain Lab dashboard (the Profile page's fifth tab).
 *
 * Everything here is computed by analytics.ts (summarizeAreas, meanSummary,
 * todayComposite, checkinStreak, sleepAssociation, trainingVolume…) and
 * worded by copy.ts; this file only lays it out. SCIENCE.md is binding:
 *  - §2.9 decides what may show — a locked state says what is missing
 *    instead of a number the data cannot support;
 *  - §4 — the Mean is "Mean — average of N areas" (never a brain score),
 *    indices sit on the 50 + 10z reference scale with their grade badge,
 *    no percentiles, no alarm colours (arrows are neutral ink), and every
 *    improvement in a practice-prone area carries the practice qualifier;
 *  - §2.8 — sleep and state are context: associations, never causes.
 *
 * The tab keeps its own state (the open area and the chart ranges) in the
 * Profile page, like the other tabs' scope filters, so a tab switch returns
 * to where the player was.
 */

export interface BrainDashState {
  /** the area detail being viewed, or null for the overview */
  area: BrainDomainId | null;
  /** the area detail's chart range */
  range: DetailRange;
  /** the sleep / state window in days */
  ctxDays: 28 | 56;
}

export const BRAIN_DASH_INITIAL: BrainDashState = { area: null, range: '12w', ctxDays: 28 };

/** the Mean's verdict in words — the area copy, re-aimed at the composite */
function meanVerdictCopy(m: MeanSummary, practiceProne: boolean) {
  const c = verdictCopy(m.verdict, practiceProne);
  const body = c.body
    ?.replace(/^This area has been/, 'Your Mean has been')
    .replace(' on this test ', ' across your areas ')
    .replace('Last week was', 'Last week’s Mean was');
  return { ...c, body };
}

export function BrainDashboard({
  state,
  onState,
  onOpenBrainLab,
  onOpenGame
}: {
  state: BrainDashState;
  onState: (next: BrainDashState) => void;
  onOpenBrainLab?: () => void;
  onOpenGame?: (gameId: string) => void;
}) {
  const store = useBrainStore();
  const day = useBrainDay();
  const { history, settings } = useAppState();
  const ink = useInks(settings.theme);
  const inkOf = (v: AreaView) => ink(v.domain.slot);
  // "now" moves with the store and the calendar day (midnight while open)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [store, day]);
  const areas = useMemo(() => summarizeAreas(store, now), [store, now]);
  const views = useMemo(() => areas.map((a) => buildAreaView(a, store)), [areas, store]);
  const mean = useMemo(() => meanSummary(areas, now), [areas, now]);
  const today = useMemo(() => todayComposite(areas), [areas]);
  const meanBase = useMemo(() => meanBaselineIndex(areas), [areas]);
  const marks = useMemo(() => checkinMarks(store), [store]);
  const streak = useMemo(() => checkinStreak(store, now), [store, now]);
  const longest = useMemo(() => longestCheckinStreak(marks), [marks]);
  const report = useMemo(() => {
    setCoachGameNames(Object.fromEntries(GAMES.map((g) => [g.id, g.name])));
    return coach({ store, areas, mean, history, now });
  }, [store, areas, mean, history, now]);
  const onCoachAction = (a: CoachAction) => {
    sfx.tap();
    // games open directly; measuring and check-ins happen in the Brain Lab tab
    if (a.kind === 'play' && a.id && onOpenGame) onOpenGame(a.id);
    else onOpenBrainLab?.();
  };
  const [clearing, setClearing] = useState(false);
  const scrollBack = useRef<number | null>(null);

  const set = (patch: Partial<BrainDashState>) => onState({ ...state, ...patch });
  const openArea = (id: string) => {
    scrollBack.current = window.scrollY;
    set({ area: id as BrainDomainId });
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    sfx.tap();
    set({ area: null });
  };
  useLayoutEffect(() => {
    if (state.area === null && scrollBack.current !== null) {
      window.scrollTo({ top: scrollBack.current });
      scrollBack.current = null;
    }
  }, [state.area]);

  const hasData = store.sessions.length > 0 || store.checkins.length > 0;
  const detail = state.area ? views.find((v) => v.domain.id === state.area) : undefined;

  if (detail) {
    return (
      <AreaDetail
        v={detail}
        ink={inkOf(detail)}
        now={now}
        todayKey={day}
        range={state.range}
        onRange={(range) => set({ range })}
        onBack={back}
        history={history}
        store={store}
      />
    );
  }

  const footer = (
    <Footer
      hasData={hasData}
      onClear={() => setClearing(true)}
      clearing={clearing}
      onCancel={() => setClearing(false)}
      onConfirm={() => {
        clearBrain();
        notifyBrainChanged();
        sfx.place();
        setClearing(false);
      }}
    />
  );

  if (!hasData) {
    return (
      <div className="bd-dash">
        <EmptyState onOpenBrainLab={onOpenBrainLab} />
        {footer}
      </div>
    );
  }

  // the small multiples share one time axis so areas compare at a glance:
  // up to 12 weeks back, never tighter than 3 weeks
  const firstRun = Math.min(...store.sessions.map((s) => s.finishedAt));
  const t0 = Math.min(now - 21 * DAY_MS, Math.max(firstRun - DAY_MS, now - 84 * DAY_MS));
  const graded = views.filter((v) => v.test && v.grade !== 'P');
  const practiceAny = graded.some((v) => v.test?.practiceProne);
  const meanGrade = graded.some((v) => v.grade === 'C') ? 'C' : graded.some((v) => v.grade === 'B') ? 'B' : 'A';
  const personalNames = mean.personalOnly.map((id) => BRAIN_DOMAINS.find((d) => d.id === id)?.name ?? id);
  const missing = mean.missing.map((id) => views.find((v) => v.domain.id === id)).filter((v): v is AreaView => !!v);
  const sensitive = views.filter((v) => v.test?.stateSensitive);
  const lastCheckin = [...store.checkins].sort((a, b) => a.startedAt - b.startedAt).pop();
  const valid = store.sessions.filter((s) => s.valid).length;
  const mv = meanVerdictCopy(mean, practiceAny);
  const showMeanVerdict = mean.verdict !== 'none' && mean.verdict !== 'pending';
  const anyLevel = views.some((v) => v.levelKind === 'reference' || v.levelKind === 'personal');
  const anyBase = views.some((v) => v.baselineIndex !== null);
  const hasOther = views.some((v) => v.dots.some((d) => !d.current));

  return (
    <div className="bd-dash">
      {/* 1 · summary */}
      {(mean.m > 0 || today || sensitive.length >= 3) && (
      <section className="bd-hero fx-card bd-in" aria-label="Summary">
        {mean.m > 0 && (
          <>
            <div className="bd-hero-top">
              <p className="bd-kicker">{meanLabel(mean.m)}</p>
              {mean.index !== null && <GradeBadge grade={meanGrade} />}
            </div>
            {mean.index !== null ? (
              <div className="bd-hero-row">
                <CountUp className="bd-hero-num" value={mean.index} />
                <div className="bd-hero-side">
                  {showMeanVerdict ? (
                    <span className="bd-hero-verdict">
                      <ToneArrow tone={mv.tone} />
                      {mv.title}
                    </span>
                  ) : (
                    <span className="bd-hero-verdict dim">Level over the last 14 days</span>
                  )}
                  {showMeanVerdict && mv.tone === 'up' && practiceAny && <span className="bd-qualifier">{PRACTICE_QUALIFIER}</span>}
                  <span className="bd-mini-note">
                    {mean.m} areas, each with a scored run in the last 14 days
                  </span>
                </div>
              </div>
            ) : (
              <div className="bd-hero-locked">
                <span className="bd-lock" aria-hidden>
                  <LockIcon size={18} />
                </span>
                <div>
                  <p className="bd-locked-title">Not shown yet</p>
                  <p className="bd-mini-note">
                    The Mean appears while every one of its {mean.m} areas has a scored run in the last 14 days — no composite is shown with a part
                    missing.
                  </p>
                  {missing.length > 0 && (
                    <div className="bd-missing">
                      <span className="bd-mini-note">Still needed:</span>
                      {missing.map((v) => (
                        <span key={v.domain.id} className="bd-chip" style={{ ['--ink' as string]: inkOf(v) } as CSSProperties}>
                          <span className="bd-ink-dot" aria-hidden />
                          {v.domain.short}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <ScaleBar
              value={mean.index}
              caption={`Reference scale: 50 is the average of each test’s published reference sample and every 10 points is one standard deviation.${meanGrade === 'C' ? ' Approximate — those samples used related tests or other devices.' : ''} Not a percentile, and not comparable with scores from other tests.`}
            />
            {personalNames.length > 0 && (
              <p className="bd-mini-note bd-personal-note">
                <b>{personalNames.join(', ')}</b> {personalNames.length === 1 ? 'has' : 'have'} no published reference, so {personalNames.length === 1 ? 'its' : 'their'} index is personal — 50 is your own baseline. Shown beside the Mean, never averaged in.
              </p>
            )}
          </>
        )}
        {today ? (
          <div className="bd-today">
            <CountUp className="bd-today-num" value={today.index} />
            <div>
              <p className="bd-today-label">{TODAY_COMPOSITE_LABEL}</p>
              <p className="bd-mini-note">
                {today.n} of {today.of} sleep-sensitive areas done today · 50 is your typical · never merged with the Mean
              </p>
            </div>
          </div>
        ) : (
          sensitive.length >= 3 && (
            <p className="bd-mini-note bd-today-hint">
              <InfoIcon size={13} /> “Today” appears when 3 of your {sensitive.length} sleep-sensitive areas ({sensitive.map((v) => v.domain.short).join(', ')}) are done
              today, each with a baseline.
            </p>
          )
        )}
      </section>
      )}

      <div className="stat-grid bd-kpis bd-in" style={{ ['--i' as string]: 1 } as CSSProperties}>
        <StatCard label="Check-in streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} hint={`Longest ${longest}`} />
        <StatCard label="Benchmark runs" value={store.sessions.length} hint={`${valid} valid`} />
        <StatCard
          label="Last check-in"
          value={lastCheckin ? relDay(lastCheckin.date, day) : '—'}
          hint={lastCheckin ? clockTime(lastCheckin.startedAt) : 'none yet'}
        />
      </div>

      {/* coach — personalised, evidence-cited advice from your own data */}
      <section className="setup-section bd-in" style={{ ['--i' as string]: 2 } as CSSProperties} aria-label="Coach">
        <SectionTitle>Your coach</SectionTitle>
        <CoachPanel report={report} onAction={onCoachAction} />
      </section>

      {/* 2 · radar */}
      <section className="setup-section bd-in" style={{ ['--i' as string]: 2 } as CSSProperties}>
        <SectionTitle>Areas at a glance</SectionTitle>
        <div className="chart-card fx-card bd-radar-card">
          <BrainRadar
            axes={views.map((v) => ({ id: v.domain.id, label: v.domain.short, slot: v.domain.slot }))}
            series={[
              ...(anyBase
                ? [{ id: 'baseline', label: 'Your baseline', values: views.map((v) => v.baselineIndex), tone: 'baseline' as const }]
                : []),
              {
                id: 'current',
                label: 'Level, last 14 days',
                values: views.map((v) => (v.levelKind === 'reference' || v.levelKind === 'personal' ? v.level : null)),
                tone: 'current' as const
              }
            ]}
            onAxis={openArea}
            size={340}
            caption={
              personalNames.length
                ? `each area on its own index: the reference scale, except ${personalNames.join(' and ')} (personal, 50 is your baseline)`
                : 'each area on the reference scale'
            }
          />
          <div className="bd-legend center">
            <span className="bd-legend-item">
              <span className="bd-key-radar current" aria-hidden />
              Level · last 14 days
            </span>
            {anyBase && (
              <span className="bd-legend-item">
                <span className="bd-key-radar base" aria-hidden />
                Your baseline
              </span>
            )}
          </div>
          <p className="bd-mini-note">
            {anyLevel
              ? 'A gap means no level yet: still calibrating, a personal baseline still forming, or no scored run in the last 14 days. Tap an area for its detail.'
              : 'Your profile fills in as each area finishes calibrating. Tap an area for its detail.'}
          </p>
        </div>
      </section>

      {/* 3 · the Mean's weekly line */}
      {mean.m > 0 && (
        <section className="setup-section bd-in" style={{ ['--i' as string]: 3 } as CSSProperties}>
          <SectionTitle aside={mean.weeks.length ? <span className="bd-count">{mean.weeks.length} weeks</span> : undefined}>
            The Mean, week by week
          </SectionTitle>
          <div className="chart-card fx-card bd-chart-card">
            {mean.weeks.length >= 2 ? (
              <MeanTrendChart weeks={mean.weeks} baseIndex={meanBase} />
            ) : (
              <div className="bd-locked-inline">
                <span className="bd-lock" aria-hidden>
                  <LockIcon size={16} />
                </span>
                <p className="bd-mini-note">
                  {mean.weeks.length === 1
                    ? `One complete week so far (week of ${shortDate(new Date(mean.weeks[0].start + 'T12:00').getTime())}: ${mean.weeks[0].index}). The line starts with the second.`
                    : `The weekly line starts after the first full week in which all ${mean.m} areas were measured.`}
                </p>
              </div>
            )}
            <div className="bd-verdict">
              {showMeanVerdict ? (
                <>
                  <p className="bd-status-title">
                    <ToneArrow tone={mv.tone} size={16} />
                    {mv.title}
                  </p>
                  {mv.body && <p className="bd-status-body">{mv.body}</p>}
                </>
              ) : (
                <>
                  <p className="bd-status-title">No verdict on the Mean yet</p>
                  <p className="bd-status-body">
                    It needs a baseline in every one of its {mean.m} areas and 8 weekly values — {Math.min(8, mean.weeks.length)}/8 so far. Each week
                    counts only when every area was measured within the last 14 days.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4 · per-area small multiples */}
      <section className="setup-section bd-in" style={{ ['--i' as string]: 4 } as CSSProperties}>
        <SectionTitle aside={<span className="bd-count">{shortDate(t0)} – today</span>}>Areas</SectionTitle>
        <AreaLegend other={hasOther} />
        <div className="bd-area-list">
          {views.map((v, i) => (
            <AreaCard key={v.domain.id} v={v} ink={inkOf(v)} t0={t0} t1={now} index={i} onOpen={() => openArea(v.domain.id)} />
          ))}
        </div>
      </section>

      {/* how to improve each area — the evidence-based levers, one row per area */}
      <section className="setup-section bd-in" style={{ ['--i' as string]: 5 } as CSSProperties} aria-label="Improve each area">
        <SectionTitle>Improve each area</SectionTitle>
        <p className="bd-mini-note">What the research supports for each area — tap one to see the tips and their sources.</p>
        <div className="bd-improve fx-card">
          {views.map((v) => {
            const focus = report.focus.includes(v.domain.id);
            // no level here: an index never appears without its grade badge (§4), and this list is about the tips
            return (
              <details key={v.domain.id} className="bd-improve-row" style={{ ['--ink' as string]: inkOf(v) } as CSSProperties}>
                <summary>
                  <span className="bd-ink-dot" aria-hidden />
                  <span className="bd-improve-name">{v.domain.name}</span>
                  {focus && <span className="bd-chip bd-focus-chip">Coach focus</span>}
                  <span className="bd-improve-chev" aria-hidden>
                    <ChevronIcon size={16} />
                  </span>
                </summary>
                <TipList tips={v.domain.improve} compact />
              </details>
            );
          })}
        </div>
      </section>

      {/* 5 · state & context */}
      <ContextSection store={store} views={views} inkOf={inkOf} todayKey={day} days={state.ctxDays} onDays={(ctxDays) => set({ ctxDays })} />

      {/* 6 · check-in calendar */}
      <CalendarSection store={store} marks={marks} streak={streak} longest={longest} todayKey={day} />

      {/* 7 · training volume */}
      <VolumeSection views={views} inkOf={inkOf} history={history} now={now} />

      {/* 8 · the full session log */}
      <LogSection store={store} views={views} inkOf={inkOf} todayKey={day} />

      {/* 9 · footer */}
      {footer}
    </div>
  );
}

/* ---------- empty state ---------- */

function EmptyState({ onOpenBrainLab }: { onOpenBrainLab?: () => void }) {
  return (
    <section className="bd-empty fx-card bd-in">
      <div className="bd-empty-art" aria-hidden>
        <BrainRadar
          axes={BRAIN_DOMAINS.map((d) => ({ id: d.id, label: d.short, slot: d.slot }))}
          series={[{ id: 'current', label: 'Level', values: BRAIN_DOMAINS.map(() => null), tone: 'current' }]}
          showValues={false}
          animate={false}
          size={300}
        />
        <span className="bd-empty-badge">
          <BrainIcon size={26} />
        </span>
      </div>
      <h2 className="bd-empty-title">Your Brain Lab dashboard</h2>
      <p className="bd-empty-body">{BRAIN_ONBOARDING}</p>
      <ul className="bd-empty-list">
        <li>A level for each of nine areas, on one honest scale</li>
        <li>Your personal baseline, and weekly verdicts only when a change is clear of your usual ups and downs</li>
        <li>Sleep and state beside your results — as context, never as a score</li>
      </ul>
      {onOpenBrainLab && (
        <button
          type="button"
          className="primary-btn bd-cta"
          onClick={() => {
            sfx.tap();
            onOpenBrainLab();
          }}
        >
          Start in Brain Lab
        </button>
      )}
    </section>
  );
}

/* ---------- footer: disclaimer, how scoring works, clear data ---------- */

const HOW: { title: string; body: string }[] = [
  { title: 'Calibration', body: 'Your first one to three runs of each test teach you the test, so scores rise. They are shown, labelled “Calibrating”, and never scored.' },
  { title: 'Baseline', body: 'The next five scored runs, one per day, set your personal baseline — their median — and then it is frozen.' },
  { title: 'One score a day', body: 'Each test’s score for the day is your first valid run (a second attempt counts only if the first was not valid). Later runs that day are practice.' },
  { title: 'Your usual variation', body: 'Brain Lab learns how much your own scores move from day to day, with a floor so a short lucky streak cannot shrink it.' },
  { title: 'Today vs typical', body: 'A day’s run is compared with the median of your recent runs: within, above or below your typical range. One day is never called progress.' },
  { title: 'Weekly verdicts', body: 'Each completed week’s mean is compared with your baseline. A change is called reliable only when it is clear of your usual variation two weeks in a row; one week alone is “possibly”.' },
  { title: 'Trends', body: 'The four-week trend uses a slope that resists outliers, and needs eight scored runs spread over three weeks.' },
  { title: 'The scale', body: 'Every index is 50 + 10 per standard deviation. For most areas 50 is the average of a published reference sample — approximate, because those samples took related tests or used other devices. Flexibility has no published reference, so its 50 is your own baseline. These are not IQ scores and not percentiles.' },
  { title: 'The Mean', body: 'The average of the reference-scaled areas, shown only while each has a scored run in the last 14 days. Personal-only areas are shown beside it, never averaged in.' },
  { title: 'Segments', body: 'A new device, a new test version or a baseline reset starts a new series with its own baseline. Results are never mixed across series.' },
  { title: 'Validity', body: 'Interrupted, rushed or at-chance runs are kept and shown with the reason, but never scored.' }
];

function Footer({
  hasData,
  onClear,
  clearing,
  onCancel,
  onConfirm
}: {
  hasData: boolean;
  onClear: () => void;
  clearing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section className="setup-section bd-footer">
      <div className="bd-disclaimer fx-card">
        <InfoIcon size={16} />
        <p>{BRAIN_DISCLAIMER}</p>
      </div>
      <details className="bd-how fx-card">
        <summary>How scoring works</summary>
        <dl>
          {HOW.map((h) => (
            <div key={h.title}>
              <dt>{h.title}</dt>
              <dd>{h.body}</dd>
            </div>
          ))}
        </dl>
      </details>
      {hasData && (
        <button type="button" className="ghost-btn bd-clear" onClick={onClear}>
          Clear Brain Lab data…
        </button>
      )}
      <Modal open={clearing} onClose={onCancel} title="Clear all Brain Lab data?">
        <p className="modal-text">
          This permanently deletes every benchmark run, check-in and baseline on this device. Your Brain Lab settings are kept. It cannot be undone —
          export a backup from Settings first if you might want it back.
        </p>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger-btn" onClick={onConfirm}>
            Clear data
          </button>
        </div>
      </Modal>
    </section>
  );
}
