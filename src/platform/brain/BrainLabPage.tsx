import { useMemo, useState, type CSSProperties } from 'react';
import type { BrainDomainId } from './types';
import type { AreaSummary } from './analytics';
import {
  checkinStreak,
  meanSummary,
  planCheckin,
  rankAreas,
  runIndex,
  stateFlags,
  summarizeAreas,
  summarizeTest,
  todayComposite,
  todaysCheckin
} from './analytics';
import { BRAIN_DOMAINS, getBrainDomain } from './domains';
import { BRAIN_TESTS, getBrainTest } from './registry';
import { useBrainDay, useBrainStore } from './ui/useBrainStore';
import { BrainRadar } from './ui/BrainRadar';
import { AboutSheet, Onboarding } from './ui/About';
import { AreaPage } from './ui/AreaPage';
import { areaView, baselineValue, batteryMinutes, isDue, radarValue, remainingTests, shortDate, sparkPoints } from './ui/model';
import { areaStyle, CheckinEmblem, fmtIndex, GradeBadge, ProgressRing, Sparkline, StateFlagChips, TestPlate } from './ui/parts';
import { calibratingShort, meanLabel, NOT_MEASURED, roleCopy, stateCopy, TODAY_COMPOSITE_LABEL, trendLine, verdictCopy, flagCopy } from './ui/copy';
import { sfx } from '../audio';
import { BrainIcon, CheckIcon, ChevronIcon, InfoIcon } from '../design/icons';

/**
 * The Brain Lab tab (between Games and Profile): the daily check-in hero,
 * "Your profile" (radar + the Mean), the nine area cards and, in place of
 * the list, one area in depth. Everything is derived on render from the
 * permanent store (useBrainStore re-reads it after every write, an import or
 * a reset) and from the registries — no area, test or count is enumerated
 * here (SCIENCE.md, domains.ts, registry.ts).
 *
 * Navigation lives in App.tsx so it survives a game visit: the open area
 * and both scroll positions are App state, the runner and the check-in are
 * App-level full-screen layers (no tab bar), and a training game returns
 * here exactly where it was opened.
 */

export interface BrainLabPageProps {
  area: BrainDomainId | null;
  onOpenArea: (id: BrainDomainId) => void;
  onCloseArea: () => void;
  onRunTest: (testId: string) => void;
  onCheckin: (opts?: { quick?: boolean }) => void;
  onOpenGame: (gameId: string) => void;
  onOpenDashboard: () => void;
}

export function BrainLabPage(props: BrainLabPageProps) {
  const store = useBrainStore();
  const day = useBrainDay();
  const [about, setAbout] = useState(false);
  // recompute when the store changes or midnight passes
  const now = useMemo(() => Date.now(), [store, day]);
  const areas = useMemo(() => summarizeAreas(store, now), [store, now]);

  if (!store.settings.introAt) {
    return (
      <div className="screen bl-screen">
        <Onboarding />
      </div>
    );
  }

  if (props.area) {
    return (
      <div className="screen bl-screen">
        <AreaPage domainId={props.area} onBack={props.onCloseArea} onMeasure={props.onRunTest} onOpenGame={props.onOpenGame} />
      </div>
    );
  }

  return (
    <div className="screen bl-screen">
      <header className="bl-head">
        <div className="bl-head-text">
          <h1 className="bl-title">Brain Lab</h1>
          <p className="bl-subtitle">Short tests from published research, for tracking yourself over time.</p>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            sfx.tap();
            setAbout(true);
          }}
          aria-label="About Brain Lab"
        >
          <InfoIcon size={20} />
        </button>
      </header>

      {BRAIN_TESTS.length === 0 ? (
        <section className="bl-empty fx-card">
          <BrainIcon size={32} />
          <h2 className="bl-h2">Tests are on their way</h2>
          <p className="bl-note">No benchmark is installed in this build yet.</p>
        </section>
      ) : (
        <>
          <TodayHero areas={areas} now={now} onCheckin={props.onCheckin} onRunTest={props.onRunTest} />
          <ProfileCard areas={areas} now={now} onOpenArea={props.onOpenArea} onOpenDashboard={props.onOpenDashboard} />
        </>
      )}

      <section className="bl-block" id="bl-areas">
        <div className="bl-sec-head">
          <h2 className="bl-h2">Areas</h2>
          <span className="bl-note">Tap an area for its test, results and training.</span>
        </div>
        <div className="bl-area-grid">
          {areas.map((a, i) => (
            <AreaCard key={a.domain.id} area={a} index={i} now={now} onOpen={() => props.onOpenArea(a.domain.id)} />
          ))}
        </div>
      </section>

      <p className="bl-foot">
        A self-tracking tool, not a medical device — scores are not IQ scores.{' '}
        <button type="button" className="bl-link" onClick={() => setAbout(true)}>
          About Brain Lab
        </button>
      </p>

      <AboutSheet open={about} onClose={() => setAbout(false)} birthYear={store.settings.birthYear} />
    </div>
  );
}

/* ---------- Today ---------- */

function TodayHero({
  areas,
  now,
  onCheckin,
  onRunTest
}: {
  areas: AreaSummary[];
  now: number;
  onCheckin: BrainLabPageProps['onCheckin'];
  onRunTest: (testId: string) => void;
}) {
  const store = useBrainStore();
  const today = todaysCheckin(store, now);
  const streak = checkinStreak(store, now);
  const done = !!today?.completedAt;
  const left = today ? remainingTests(store, today) : [];
  const plan = useMemo(() => planCheckin(store, now), [store, now]);
  const core = BRAIN_TESTS.find((t) => t.perWeek === 7);
  const coreFree = core ? !summarizeTest(core, store, now).scoredToday : false;

  const emblem = (
    <span className="bl-hero-emblem" aria-label={streak ? `${streak}-day check-in streak` : 'No check-in streak yet'} role="img">
      <CheckinEmblem size={52} warm={done} count={streak || undefined} />
      <span className="bl-hero-emblem-label">{streak ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Streak'}</span>
    </span>
  );

  if (today && !done && left.length) {
    const total = today.testIds.filter((t) => getBrainTest(t)).length;
    return (
      <section className="bl-hero fx-card">
        <div className="bl-hero-top">
          <div>
            <span className="bl-kicker">Today · {shortDate(now)}</span>
            <h2 className="bl-hero-title">Check-in in progress</h2>
            <p className="bl-note">
              {total - left.length} of {total} tests done · ≈ {batteryMinutes(left, false)} min left
            </p>
          </div>
          {emblem}
        </div>
        <TestChips ids={today.testIds} doneIds={today.testIds.filter((t) => !left.includes(t))} />
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            sfx.tap();
            onCheckin();
          }}
        >
          Resume check-in
        </button>
      </section>
    );
  }

  if (today && (done || !left.length)) {
    return <DoneHero areas={areas} now={now} checkinId={today.id} emblem={emblem} onRunTest={onRunTest} />;
  }

  return (
    <section className="bl-hero fx-card">
      <div className="bl-hero-top">
        <div>
          <span className="bl-kicker">Today · {shortDate(now)}</span>
          <h2 className="bl-hero-title">Daily check-in</h2>
          <p className="bl-note">
            {plan.length
              ? `A few questions, then ${plan.length} ${plan.length === 1 ? 'test' : 'tests'} · ≈ ${batteryMinutes(plan)} min`
              : 'Every area already has today’s score.'}
          </p>
        </div>
        {emblem}
      </div>
      {plan.length > 0 && <TestChips ids={plan} />}
      <button
        type="button"
        className="primary-btn"
        onClick={() => {
          sfx.tap();
          onCheckin();
        }}
      >
        {plan.length ? 'Start check-in' : 'Answer today’s questions'}
      </button>
      {core && coreFree && plan.length > 1 && (
        <button
          type="button"
          className="bl-quick"
          onClick={() => {
            sfx.tap();
            onCheckin({ quick: true });
          }}
        >
          Quick day: {getBrainDomain(core.domain)?.name ?? core.name} only · ≈ {batteryMinutes([core.id])} min
          <ChevronIcon size={14} />
        </button>
      )}
    </section>
  );
}

function TestChips({ ids, doneIds = [] }: { ids: string[]; doneIds?: string[] }) {
  return (
    <ul className="bl-test-chips">
      {ids.map((id, i) => {
        const t = getBrainTest(id);
        if (!t) return null;
        const done = doneIds.includes(id);
        return (
          <li key={id} className={`bl-test-chip${done ? ' done' : ''}`} style={{ ...areaStyle(t.domain), ['--i' as string]: i } as CSSProperties}>
            <TestPlate test={t} domain={t.domain} size={30} />
            <span className="bl-test-chip-text">
              <strong>{t.name}</strong>
              <small>{getBrainDomain(t.domain)?.name}</small>
            </span>
            {done && <CheckIcon size={14} />}
          </li>
        );
      })}
    </ul>
  );
}

function DoneHero({
  areas,
  now,
  checkinId,
  emblem,
  onRunTest
}: {
  areas: AreaSummary[];
  now: number;
  checkinId: string;
  emblem: React.ReactNode;
  onRunTest: (testId: string) => void;
}) {
  const store = useBrainStore();
  const checkin = store.checkins.find((c) => c.id === checkinId)!;
  const composite = todayComposite(areas);
  const flags = stateFlags(store, checkin);
  const sessions = new Map(store.sessions.filter((s) => s.checkinId === checkinId).map((s) => [s.testId, s]));
  return (
    <section className="bl-hero fx-card done">
      <div className="bl-hero-top">
        <div>
          <span className="bl-kicker ok">
            <CheckIcon size={12} /> Today · {shortDate(now)}
          </span>
          <h2 className="bl-hero-title">Check-in complete</h2>
          {flags.length > 0 ? (
            <span className="bl-hero-flags">
              <StateFlagChips flags={flags} />
            </span>
          ) : (
            <p className="bl-note">See you tomorrow — similar time keeps days comparable.</p>
          )}
        </div>
        {emblem}
      </div>
      {composite && (
        <div className="bl-composite inline">
          <span className="bl-composite-value">{composite.index}</span>
          <span className="bl-composite-label">{TODAY_COMPOSITE_LABEL}</span>
        </div>
      )}
      <ul className="bl-done-list">
        {checkin.testIds.map((tid) => {
          const test = getBrainTest(tid);
          if (!test) return null;
          const sum = summarizeTest(test, store, now);
          const s = sessions.get(tid);
          const run = s ? sum.runs.find((r) => r.s.id === s.id) : undefined;
          const idx = run ? runIndex(sum, run) : null;
          const role = run?.role;
          const line = !run
            ? 'Not run'
            : role === 'invalid'
              ? flagCopy(run.s.flags?.[0] ?? 'invalid')
              : role === 'run-in'
                ? calibratingShort(sum.runInDone, test.runIn)
                : (role === 'baseline' || role === 'tracking') && sum.today
                  ? stateCopy(sum.today.label)
                  : roleCopy(role ?? 'tracking');
          return (
            <li key={tid} style={areaStyle(test.domain)}>
              <TestPlate test={test} domain={test.domain} size={32} />
              <span className="bl-done-main">
                <strong>{test.name}</strong>
                <small>{line}</small>
              </span>
              {run && role !== 'invalid' ? (
                <span className="bl-done-index">{idx !== null ? fmtIndex(idx) : <CheckIcon size={16} />}</span>
              ) : (
                <button type="button" className="ghost-btn small" onClick={() => onRunTest(tid)}>
                  {run ? 'Retry' : 'Run'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="ghost-btn bl-wide"
        onClick={() => {
          sfx.tap();
          document.getElementById('bl-areas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        Measure another area
      </button>
    </section>
  );
}

/* ---------- Your profile ---------- */

function ProfileCard({
  areas,
  now,
  onOpenArea,
  onOpenDashboard
}: {
  areas: AreaSummary[];
  now: number;
  onOpenArea: (id: BrainDomainId) => void;
  onOpenDashboard: () => void;
}) {
  const mean = meanSummary(areas, now);
  const ranked = rankAreas(areas).filter((a) => a.grade !== 'P');
  const current = areas.map(radarValue);
  const base = areas.map(baselineValue);
  const anyLevel = current.some((v) => v !== null);
  const personalOnly = mean.personalOnly.map((id) => areas.find((a) => a.domain.id === id)!).filter(Boolean);
  const done = mean.m - mean.missing.length;
  return (
    <section className="bl-profile fx-card">
      <div className="bl-sec-head">
        <h2 className="bl-h2">Your profile</h2>
        <button type="button" className="bl-link strong" onClick={onOpenDashboard}>
          Open dashboard <ChevronIcon size={14} />
        </button>
      </div>
      <div className="bl-radar-wrap">
        <BrainRadar
          axes={BRAIN_DOMAINS.map((d) => ({ id: d.id, label: d.short, slot: d.slot }))}
          series={[
            ...(base.some((v) => v !== null) ? [{ id: 'baseline', label: 'Baseline', values: base, tone: 'baseline' as const }] : []),
            { id: 'current', label: 'Level, last 14 days', values: current, tone: 'current' as const }
          ]}
          onAxis={(id) => onOpenArea(id as BrainDomainId)}
          caption="index scale, 50 is the middle of each test's reference sample"
        />
        {!anyLevel && <p className="bl-radar-empty">Your profile fills in as each area finishes calibrating.</p>}
      </div>
      <div className="bl-radar-legend" aria-hidden>
        <span>
          <i className="sw current" /> Level · last 14 days
        </span>
        {base.some((v) => v !== null) && (
          <span>
            <i className="sw baseline" /> Your baseline
          </span>
        )}
      </div>

      <div className={`bl-mean${mean.index !== null ? ' open' : ''}`}>
        {mean.index !== null ? (
          <>
            <span className="bl-mean-value">{mean.index}</span>
            <span className="bl-mean-text">
              <strong>{meanLabel(mean.m)}</strong>
              <span className="bl-note">
                {mean.verdict !== 'none' && mean.verdict !== 'pending' ? verdictCopy(mean.verdict, true).title : 'Reference scale, approximate · 50 is the middle of the reference samples'}
              </span>
            </span>
          </>
        ) : (
          <>
            <ProgressRing value={mean.m ? done / mean.m : 0} size={52} stroke={5} label={`${done} of ${mean.m} areas current`}>
              <span className="bl-mean-frac">
                {done}/{mean.m}
              </span>
            </ProgressRing>
            <span className="bl-mean-text">
              <strong>
                Measure {mean.missing.length} more {mean.missing.length === 1 ? 'area' : 'areas'} to unlock your Mean
              </strong>
              <span className="bl-mean-missing">
                {mean.missing.map((id) => (
                  <button key={id} type="button" className="bl-mini-chip" style={areaStyle(id)} onClick={() => onOpenArea(id)}>
                    <i aria-hidden />
                    {getBrainDomain(id)?.short ?? id}
                  </button>
                ))}
              </span>
              <span className="bl-note">The Mean needs a scored run in every reference area within 14 days.</span>
            </span>
          </>
        )}
      </div>
      {personalOnly.length > 0 && (
        <p className="bl-note bl-personal-note">
          {personalOnly.map((a) => a.domain.name).join(', ')} {personalOnly.length === 1 ? 'has' : 'have'} no published reference: shown as a personal index
          (50 = your baseline) and never averaged into the Mean.
        </p>
      )}
      {ranked.length >= 3 && (
        <div className="bl-rank">
          <button type="button" className="bl-rank-item fx-card" style={areaStyle(ranked[0].domain.id)} onClick={() => onOpenArea(ranked[0].domain.id)}>
            <span className="bl-rank-label">Strongest</span>
            <strong>{ranked[0].domain.name}</strong>
            <span className="bl-rank-value">{fmtIndex(ranked[0].summary?.level.index)}</span>
          </button>
          <button
            type="button"
            className="bl-rank-item fx-card"
            style={areaStyle(ranked[ranked.length - 1].domain.id)}
            onClick={() => onOpenArea(ranked[ranked.length - 1].domain.id)}
          >
            <span className="bl-rank-label">Weakest</span>
            <strong>{ranked[ranked.length - 1].domain.name}</strong>
            <span className="bl-rank-value">{fmtIndex(ranked[ranked.length - 1].summary?.level.index)}</span>
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- area cards ---------- */

function AreaCard({ area, index, now, onOpen }: { area: AreaSummary; index: number; now: number; onOpen: () => void }) {
  const v = areaView(area);
  const s = area.summary;
  const due = isDue(s, now);
  const verdict = s?.baseline ? verdictCopy(s.verdict.verdict, area.test?.practiceProne ?? false) : null;
  const sub =
    v.state === 'none'
      ? area.test
        ? `${area.test.name} · ≈ ${Math.max(1, Math.round(area.test.durationSec / 60))} min`
        : 'Coming soon'
      : v.state === 'calibrating'
        ? 'Calibration runs teach you the test'
        : v.state === 'stale'
          ? 'No scored run in 14 days'
          : verdict && s?.verdict.verdict !== 'pending'
            ? verdict.title
            : s?.baseline
              ? s.trend
                ? trendLine(s.trend, area.test?.practiceProne ?? false, true)
                : 'Baseline set — first weekly verdict soon'
              : `Baseline forming ${v.baselineProgress}/5`;
  return (
    <button
      type="button"
      className={`bl-area-card fx-card s-${v.state}`}
      style={areaStyle(area.domain.id, { ['--i' as string]: index } as CSSProperties)}
      onClick={() => {
        sfx.tap();
        onOpen();
      }}
      aria-label={`${area.domain.name}, ${area.domain.subtitle}. ${
        v.state === 'level' ? `${v.personal ? 'Personal index' : 'Level'} ${fmtIndex(v.value)}` : v.state === 'calibrating' ? calibratingShort(v.runInDone, v.runIn) : NOT_MEASURED
      }${due ? '. Due' : ''}`}
    >
      <span className="bl-area-card-bar" aria-hidden />
      <span className="bl-area-card-top">
        <TestPlate test={area.test} domain={area.domain.id} size={38} />
        {due && <span className="bl-due" title="Due by your usual cadence">Due</span>}
      </span>
      <span className="bl-area-card-name">{area.domain.name}</span>
      <span className="bl-area-card-subtitle">{area.domain.subtitle}</span>
      <span className="bl-area-card-level">
        {v.state === 'level' ? (
          <>
            <span className="bl-area-card-num">{fmtIndex(v.value)}</span>
            <GradeBadge grade={area.grade} personal={v.personal} anchor={area.test?.reference?.anchor} />
          </>
        ) : v.state === 'calibrating' ? (
          <span className="bl-area-card-state">{calibratingShort(v.runInDone, v.runIn)}</span>
        ) : v.state === 'stale' ? (
          <span className="bl-area-card-state">{v.value !== null ? `Last ${fmtIndex(v.value)}` : 'Lapsed'}</span>
        ) : (
          <span className="bl-area-card-state dim">{NOT_MEASURED}</span>
        )}
      </span>
      <Sparkline points={sparkPoints(s)} color="var(--area)" width={112} height={26} />
      <span className="bl-area-card-line">{sub}</span>
    </button>
  );
}
