import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrainDomainId } from '../types';
import type { AreaSummary, ClassifiedRun, TestSummary } from '../analytics';
import { formatMetric, refZOfValue, runIndex, summarizeAreas } from '../analytics';
import { getBrainDomain, IMPLEMENTATION_NOTE } from '../domains';
import { indexFromZ } from '../timing';
import { sfx } from '../../audio';
import { BackIcon, BookIcon, ClockIcon, InfoIcon } from '../../design/icons';
import { getGame } from '../../registry';
import { Sheet } from './Sheet';
import { useBrainStore } from './useBrainStore';
import { useAppState } from '../../AppState';
import { areaView, baselineStatus, relativeDay, trackRuns } from './model';
import {
  calibratingCopy,
  baselineFormingCopy,
  C6_BEFORE,
  gradeCopy,
  NOT_MEASURED,
  practiceFor,
  roleCopy,
  stateCopy,
  stateNote,
  trendLine,
  verdictCopy,
  flagCopy
} from './copy';
import { areaStyle, fmtIndex, GradeBadge, StepDots, TestPlate, useCountUp } from './parts';
import { EvidencePanel } from './About';
import { RefList, TipList, TrainingCard } from './evidence';

/**
 * One area in depth (the area "sheet", rendered as a page with a back
 * button so the window keeps one scroll position — which is what lets a
 * training game return here exactly where the player left). SCIENCE.md
 * §3.4 (what practice does here), §4.2 (paradigm + implementation note on
 * every benchmark page, grade badge + anchor on every reference index,
 * training-card wording).
 */

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** index scale value of a raw primary metric for this area (null when the area has none yet) */
function toIndex(s: TestSummary, x: number): number | null {
  if (s.grade === 'P') {
    const b = s.baseline;
    return b ? indexFromZ((x - b.value) / b.sigma) : null;
  }
  const ctx = s.latest?.s.ctx ?? { platformOffsetMs: 60, offsetKnown: false };
  const z = refZOfValue(s.test, x, ctx);
  return finite(z) ? indexFromZ(z) : null;
}

/** recent valid runs on the area's index scale, with the typical band (baseline ± σ_w) */
function HistoryChart({ s }: { s: TestSummary }) {
  const runs = trackRuns(s).slice(-20);
  const pts = runs.map((r) => ({ r, v: runIndex(s, r) })).filter((p): p is { r: ClassifiedRun; v: number } => finite(p.v));
  if (pts.length < 2) {
    return <p className="bl-note">The chart appears after two runs.</p>;
  }
  const band = s.baseline ? [toIndex(s, s.baseline.value - s.baseline.sigma), toIndex(s, s.baseline.value + s.baseline.sigma)] : null;
  const base = s.baseline ? toIndex(s, s.baseline.value) : null;
  const vals = [...pts.map((p) => p.v), ...(band ?? []).filter(finite)] as number[];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 4) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 4) / 5) * 5);
  const W = 320;
  const H = 120;
  const padL = 26;
  const padR = 8;
  const padY = 10;
  const x = (i: number) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v: number) => H - padY - ((v - lo) / (hi - lo || 1)) * (H - 2 * padY);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <figure className="bl-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Recent runs on the index scale: ${pts.map((p) => Math.round(p.v)).join(', ')}`}>
        {band && finite(band[0]) && finite(band[1]) && (
          <rect className="bl-chart-band" x={padL} width={W - padL - padR} y={y(band[1] as number)} height={Math.max(1, y(band[0] as number) - y(band[1] as number))} />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line className="bl-chart-grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text className="bl-chart-tick" x={padL - 5} y={y(t) + 3} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {finite(base) && <line className="bl-chart-base" x1={padL} x2={W - padR} y1={y(base as number)} y2={y(base as number)} />}
        <path className="bl-chart-line" d={line} />
        {pts.map((p, i) => (
          <circle key={p.r.s.id} className={`bl-chart-dot${p.r.role === 'run-in' ? ' cal' : ''}`} cx={x(i)} cy={y(p.v)} r={p.r.role === 'run-in' ? 3 : 3.6} />
        ))}
      </svg>
      <figcaption className="bl-chart-legend">
        <span>
          <i className="dot" /> Scored
        </span>
        <span>
          <i className="dot cal" /> Calibrating
        </span>
        {band && (
          <span>
            <i className="band" /> Usual range (baseline ± day-to-day variation)
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export function AreaPage({
  domainId,
  onBack,
  onMeasure,
  onOpenGame
}: {
  domainId: BrainDomainId;
  onBack: () => void;
  onMeasure: (testId: string) => void;
  onOpenGame: (gameId: string) => void;
}) {
  const store = useBrainStore();
  const { history } = useAppState();
  const area: AreaSummary | undefined = useMemo(() => summarizeAreas(store).find((a) => a.domain.id === domainId), [store, domainId]);
  const domain = getBrainDomain(domainId);
  const headRef = useRef<HTMLHeadingElement>(null);
  // the area wiki: the science, every source and each game's evidence, one tap away (owner, 2026-10-31)
  const [wiki, setWiki] = useState(false);
  useEffect(() => headRef.current?.focus({ preventScroll: true }), [domainId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.bl-sheet-backdrop')) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const view = area ? areaView(area) : null;
  const shown = useCountUp(view?.value ?? null, { duration: 800 });
  if (!area || !domain || !view) return null;
  const test = area.test;
  const s = area.summary;
  const primary = test?.metrics.find((m) => m.id === test.primaryMetric);
  const status = baselineStatus(s, test);
  const verdict = s ? verdictCopy(s.verdict.verdict, test?.practiceProne ?? false) : null;
  /* SCIENCE.md §2.6: an improvement in Memory is annotated when a game built
     like the test (Simon, Number Trail) was played in the previous 14 days —
     task skill can raise this score without any wider change. */
  const improving = !!s && (s.verdict.verdict === 'reliably-above' || s.verdict.verdict === 'possibly-above' || s.trend === 'rising');
  const sameTaskGames = domainId === 'memory' && improving
    ? history.some((r) => (r.gameId === 'simon' || r.gameId === 'number-trail') && r.outcome !== 'abandoned' && r.finishedAt >= Date.now() - 14 * 86_400_000)
    : false;
  const recent = s ? [...s.runs].reverse().slice(0, 6) : [];

  return (
    <div className="bl-area-page" style={areaStyle(domainId)}>
      <header className="bl-area-top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back to Brain Lab">
          <BackIcon />
        </button>
        <span className="bl-area-top-title">{domain.name}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            sfx.tap();
            setWiki(true);
          }}
          aria-label="Science and sources"
        >
          <BookIcon size={20} />
        </button>
      </header>

      <section className="bl-area-hero">
        <span className="bl-area-hero-band" aria-hidden />
        <TestPlate test={test} domain={domainId} size={64} />
        <h1 ref={headRef} tabIndex={-1} className="bl-area-name">
          {domain.name}
        </h1>
        <p className="bl-area-sub">{domain.subtitle}</p>
        <div className="bl-area-level">
          {view.state === 'level' ? (
            <>
              <span className="bl-area-level-num">{fmtIndex(shown)}</span>
              <span className="bl-area-level-meta">
                <GradeBadge grade={area.grade} anchor={test?.reference?.anchor} interactive personal={view.personal} />
                <span className="bl-note">
                  {view.personal ? 'Personal index' : 'Area level'} · last 14 days · {s?.level.n} {s?.level.n === 1 ? 'run' : 'runs'}
                </span>
              </span>
            </>
          ) : view.state === 'calibrating' ? (
            <span className="bl-area-level-text">
              <strong>Calibrating {view.runInDone}/{view.runIn}</strong>
              <span className="bl-note">{calibratingCopy(view.runInDone, view.runIn)}</span>
            </span>
          ) : view.state === 'stale' ? (
            <span className="bl-area-level-text">
              <strong>No level right now</strong>
              <span className="bl-note">
                An area level needs a scored run in the last 14 days.{s?.lastScoredAt ? ` Last scored ${relativeDay(s.lastScoredAt, Date.now()).toLowerCase()}.` : ''}
              </span>
            </span>
          ) : (
            <span className="bl-area-level-text">
              <strong>{NOT_MEASURED}</strong>
              <span className="bl-note">Your first runs calibrate the test; your level appears after that.</span>
            </span>
          )}
        </div>
        {s && (s.baseline || s.trend) && verdict && (
          <div className={`bl-verdict t-${verdict.tone}`}>
            <strong>
              <span aria-hidden>{verdict.tone === 'up' ? '▲ ' : verdict.tone === 'down' ? '▼ ' : ''}</span>
              {verdict.title}
            </strong>
            {verdict.body && <span>{verdict.body}</span>}
            <span className="bl-verdict-trend">{trendLine(s.trend, test?.practiceProne ?? false)}</span>
            {sameTaskGames && (
              <span className="bl-verdict-trend">
                You played Simon or Number Trail in the last 14 days — games built like this test can raise this score through task skill.
              </span>
            )}
          </div>
        )}
      </section>

      <section className="bl-block">
        <div className="bl-practice-note">
          <strong>What practice does here</strong>
          <span>{domain.practice}</span>
        </div>
      </section>

      {test ? (
        <section className="bl-bench fx-card">
          <div className="bl-bench-head">
            <TestPlate test={test} domain={domainId} size={48} />
            <div className="bl-bench-titles">
              <span className="bl-kicker">Benchmark</span>
              <strong className="bl-bench-name">{test.name}</strong>
              <span className="bl-note">{test.tagline}</span>
            </div>
          </div>
          <div className="bl-chips">
            <span className="bl-chip strong">
              <ClockIcon size={14} /> ≈ {Math.max(1, Math.round(test.durationSec / 60))} min
            </span>
            <span className="bl-chip">{test.paradigm}</span>
          </div>
          <p className="bl-impl">{IMPLEMENTATION_NOTE}</p>
          {s?.scoredToday && (
            <p className="bl-banner">
              <InfoIcon size={16} /> {C6_BEFORE}
            </p>
          )}
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              sfx.tap();
              onMeasure(test.id);
            }}
          >
            {s?.scoredToday ? 'Practice run' : 'Measure now'}
          </button>
        </section>
      ) : (
        <section className="bl-bench fx-card">
          <p className="bl-note">This area’s benchmark isn’t available in this version.</p>
        </section>
      )}

      {s && s.runs.length > 0 && (
        <section className="bl-block">
          <h2 className="bl-h3">Recent results</h2>
          <div className="fx-card bl-card-pad">
            <HistoryChart s={s} />
            <ul className="bl-runs">
              {recent.map((r) => {
                const idx = runIndex(s, r);
                return (
                  <li key={r.s.id} className={`bl-run r-${r.role}`}>
                    <span className="bl-run-when">{relativeDay(r.s.finishedAt, Date.now())}</span>
                    <span className="bl-run-role">{roleCopy(r.role)}</span>
                    <span className="bl-run-metric">
                      {r.role === 'invalid' ? (
                        <small>{flagCopy(r.s.flags?.[0] ?? 'invalid')}</small>
                      ) : (
                        formatMetric(primary, r.s.metrics[test!.primaryMetric])
                      )}
                    </span>
                    <span className="bl-run-index">{idx !== null ? fmtIndex(idx) : ''}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {test && (
        <section className="bl-block">
          <h2 className="bl-h3">Your baseline</h2>
          <div className="fx-card bl-card-pad bl-baseline">
            <div className="bl-progress-head">
              <strong>{status.label}</strong>
              {status.phase !== 'set' && status.phase !== 'none' && <StepDots done={status.done} total={status.total} color="var(--area)" />}
            </div>
            <p className="bl-note">
              {status.phase === 'none'
                ? `The first ${test.runIn === 1 ? 'run calibrates' : `${test.runIn} runs calibrate`} the test, then ${5} scored runs on different days set your baseline.`
                : status.phase === 'calibrating'
                  ? calibratingCopy(status.done, status.total)
                  : status.phase === 'forming'
                    ? baselineFormingCopy(status.done)
                    : `Frozen at ${formatMetric(primary, s!.baseline!.value)} on ${new Date(s!.baseline!.frozenAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}. Your day-to-day variation is about ±${formatMetric(primary, s!.sigma ?? s!.baseline!.sigma)}.`}
            </p>
            {s?.today && (
              <p className={`bl-today-line t-${s.today.label.includes('below') ? 'down' : s.today.label.includes('above') ? 'up' : 'neutral'}`}>
                <strong>Today: {stateCopy(s.today.label).toLowerCase()}</strong>
                <span>
                  Typical range lately: {formatMetric(primary, s.today.typical - s.today.sigma)} – {formatMetric(primary, s.today.typical + s.today.sigma)}.
                  {stateNote(s.today.label) ? ` ${stateNote(s.today.label)}` : ''}
                </span>
              </p>
            )}
          </div>
        </section>
      )}

      <section className="bl-block">
        <h2 className="bl-h3">How to improve</h2>
        <p className="bl-note bl-gap">Evidence-based levers for {domain.name.toLowerCase()} — the research behind each is in the wiki (book icon, top right).</p>
        <div className="fx-card bl-card-pad">
          <TipList tips={domain.improve} sources={false} />
        </div>
      </section>

      <section className="bl-block">
        {domain.training.length > 0 ? (
          <>
            <h2 className="bl-h3">Train this area</h2>
            <p className="bl-note bl-gap">
              Each game mirrors a research paradigm for this area (its evidence is in the wiki). Games train; the benchmark measures — playing is
              never recorded as a Brain Lab score.
            </p>
            <div className="bl-train-list">
              {domain.training.map((t) => (
                <TrainingCard key={t.gameId} link={t} lead={practiceFor(domain.subtitle)} onOpenGame={onOpenGame} sources={false} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="bl-h3">What moves this score</h2>
            <p className="bl-note bl-gap">
              {domain.id === 'reaction'
                ? 'No game trains alertness — this score follows your state. These have better evidence:'
                : 'No game in the app has evidence for training this area, so none is linked. The levers above are what the research supports.'}
            </p>
            {domain.id === 'reaction' && (
              <div className="fx-card bl-card-pad">
                <EvidencePanel only={['Better-evidenced levers', 'Daily state matters']} />
              </div>
            )}
          </>
        )}
      </section>
      <Sheet open={wiki} onClose={() => setWiki(false)} kicker="Science & sources" title={domain.name} className="bl-wiki" portal style={areaStyle(domainId)}>
        <section className="bl-wiki-sec">
          <h3 className="bl-h4">About this area</h3>
          <p>{domain.about}</p>
          <h3 className="bl-h4">Research behind this area</h3>
          <RefList sources={domain.sources} />
        </section>
        {test && (
          <section className="bl-wiki-sec">
            <h3 className="bl-h4">The benchmark: {test.name}</h3>
            <p>{test.science.summary}</p>
            <h3 className="bl-h4">How it is scored</h3>
            <p>{test.science.scoring}</p>
            {test.science.deviations.length > 0 && (
              <>
                <h3 className="bl-h4">Where our version differs from the original</h3>
                <ul className="bl-dev">
                  {test.science.deviations.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            )}
            <h3 className="bl-h4">Reference</h3>
            <div className="bl-grade-line">
              <GradeBadge grade={area.grade} anchor={test.reference?.anchor} />
              <span className="bl-note">{test.reference ? `Anchor: ${test.reference.anchor}` : gradeCopy('P').tooltip}</span>
            </div>
            <h3 className="bl-h4">Benchmark sources</h3>
            <RefList sources={test.science.references} />
          </section>
        )}
        {domain.improve.length > 0 && (
          <section className="bl-wiki-sec">
            <h3 className="bl-h4">How to improve — the evidence</h3>
            {domain.improve.map((t) => (
              <div key={t.id} className="bl-wiki-item">
                <strong>{t.title}</strong>
                <RefList sources={t.sources} />
              </div>
            ))}
          </section>
        )}
        {domain.training.map((t) => (
          <section key={t.gameId} className="bl-wiki-sec">
            <h3 className="bl-h4">Training game: {getGame(t.gameId)?.name ?? t.gameId}</h3>
            <p>
              <strong>Mirrors: {t.paradigm}.</strong> {t.evidence}
            </p>
            <RefList sources={t.sources} />
          </section>
        ))}
      </Sheet>
    </div>
  );
}
