import type { BrainDomainId, BrainReference, BrainStore, BrainTip } from './types';
import type { GameResult } from '../types';
import type { AreaSummary, MeanSummary } from './analytics';
import { checkinStreak, isScored, sleepAssociation, sleepMinutes, stateFlags, todaysCheckin } from './analytics';
import { BRAIN_DOMAINS, TRAINING_NOTE, getBrainDomain } from './domains';
import { refs } from './references';
import { mean, median, sd } from './timing';
import { dayKey } from '../progress/progress';

/**
 * The Brain Lab COACH — personalised, prioritised advice computed on the
 * device from the player's own data. Deterministic and explainable by design
 * (no model, no server): every insight states the data that triggered it
 * (`why`, in the player's own numbers) and cites the research behind the rule
 * (`sources`) and behind each suggested action (`tips`, from domains.ts).
 *
 * The rules follow SCIENCE.md: a verdict is only ever repeated from the
 * analytics (never re-derived from a single day — §2.6), daily dips are
 * "state" with benign causes listed first (§4.4), associations are phrased
 * as associations (§2.8), practice-prone gains carry the practice qualifier,
 * and nothing promises a benefit beyond its source (§4.1). Pure: the same
 * inputs always give the same report — validate drives it on synthetic data.
 */

export type CoachKind =
  | 'decline'
  | 'today'
  | 'calibrate'
  | 'coverage'
  | 'focus'
  | 'sleep'
  | 'association'
  | 'timing'
  | 'adherence'
  | 'training'
  | 'progress'
  | 'habit';

export interface CoachAction {
  kind: 'measure' | 'checkin' | 'play';
  /** test id for 'measure', game id for 'play' */
  id?: string;
  label: string;
}

export interface CoachInsight {
  /** stable id (rule + area) */
  id: string;
  kind: CoachKind;
  /** higher first */
  priority: number;
  /** 'up' = a win to celebrate, 'neutral' = information, 'focus' = something to work on */
  tone: 'up' | 'neutral' | 'focus';
  area?: BrainDomainId;
  title: string;
  body: string;
  /** the player's data that triggered this insight */
  why: string;
  /** evidence-based actions (each cites its own sources) */
  tips: BrainTip[];
  /** the research behind the rule itself */
  sources: BrainReference[];
  action?: CoachAction;
}

export interface CoachReport {
  generatedAt: number;
  insights: CoachInsight[];
  /** the areas the coach suggests working on, most important first */
  focus: BrainDomainId[];
  /** how much data the coach had — shown so the player knows how much to trust it */
  basis: { scoredRuns: number; checkins14d: number; areasWithLevel: number };
}

export interface CoachInput {
  store: BrainStore;
  areas: AreaSummary[];
  mean: MeanSummary;
  /** the game history (training plays) */
  history: GameResult[];
  now?: number;
}

const DAY = 86_400_000;
const fmt1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const hours = (min: number) => `${fmt1(min / 60)} h`;
const levelOf = (a: AreaSummary) => a.summary?.level.index ?? a.summary?.level.personal ?? null;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const tipsOf = (id: BrainDomainId, kinds?: BrainTip['kind'][]) =>
  (getBrainDomain(id)?.improve ?? []).filter((t) => !kinds || kinds.includes(t.kind));

/** local minute of day of a timestamp */
const minuteOfDay = (t: number) => {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
};

/** circular SD of minutes-of-day (so 23:50 and 00:10 are close), in minutes */
function circularSdMinutes(mins: number[]): number {
  if (mins.length < 2) return 0;
  const ang = mins.map((m) => (m / 1440) * 2 * Math.PI);
  const c = mean(ang.map(Math.cos));
  const s = mean(ang.map(Math.sin));
  const r = Math.min(1, Math.sqrt(c * c + s * s));
  return (Math.sqrt(-2 * Math.log(Math.max(r, 1e-9))) / (2 * Math.PI)) * 1440;
}

/**
 * An association between a check-in item and one area's scored runs, with
 * the same safeguards as analytics.sleepAssociation (§2.8): ≥ 20 runs with
 * the item over ≥ 28 days, ≥ 10 per bin, and a Welch 95 % interval that
 * excludes 0. Returns the difference in σ_w units (bin A − bin B).
 */
function stateAssociation(
  store: BrainStore,
  a: AreaSummary,
  inA: (state: NonNullable<BrainStore['checkins'][number]['state']>) => boolean | null
): { diff: number; lo: number; hi: number; nA: number; nB: number } | null {
  const sum = a.summary;
  if (!sum?.baseline) return null;
  const rows = sum.segRuns
    .filter(isScored)
    .map((r) => {
      const st = r.s.checkinId ? store.checkins.find((c) => c.id === r.s.checkinId)?.state : undefined;
      const bin = st ? inA(st) : null;
      return bin === null ? null : { x: r.x / sum.baseline!.sigma, a: bin, t: r.s.finishedAt };
    })
    .filter((r): r is { x: number; a: boolean; t: number } => r !== null);
  if (rows.length < 20 || rows[rows.length - 1].t - rows[0].t < 28 * DAY) return null;
  const A = rows.filter((r) => r.a).map((r) => r.x);
  const B = rows.filter((r) => !r.a).map((r) => r.x);
  if (A.length < 10 || B.length < 10) return null;
  const diff = mean(A) - mean(B);
  const se = Math.sqrt(sd(A) ** 2 / A.length + sd(B) ** 2 / B.length);
  const lo = diff - 1.96 * se;
  const hi = diff + 1.96 * se;
  if (!(lo > 0 || hi < 0)) return null;
  return { diff, lo, hi, nA: A.length, nB: B.length };
}

export function coach({ store, areas, mean: meanSum, history, now = Date.now() }: CoachInput): CoachReport {
  const out: CoachInsight[] = [];
  const withTest = areas.filter((a) => a.test && a.summary);
  const scoredRuns = withTest.reduce((n, a) => n + a.summary!.runs.filter(isScored).length, 0);
  const since14 = dayKey(now - 14 * DAY);
  const checkins14 = store.checkins.filter((c) => c.date >= since14);
  const leveled = withTest.filter((a) => levelOf(a) !== null);

  /* 1. reliable declines — repeated from the weekly verdict, never re-derived (§2.6, §4.4) */
  for (const a of withTest) {
    const v = a.summary!.verdict.verdict;
    if (v !== 'reliably-below' && v !== 'possibly-below') continue;
    const reliably = v === 'reliably-below';
    out.push({
      id: `decline-${a.domain.id}`,
      kind: 'decline',
      priority: reliably ? 95 : 62,
      tone: 'focus',
      area: a.domain.id,
      title: reliably ? `${a.domain.name} has been below your baseline for two weeks` : `${a.domain.name} may be dipping — check again next week`,
      body: reliably
        ? 'Common reasons include short sleep, illness, stress, a different time of day, distractions, or a change of device. If you notice persistent problems with memory or thinking in daily life, consider talking to a health professional.'
        : 'Only the most recent week crossed the reliable-change line. One week is not a trend: keep measuring at your usual time and the verdict will firm up or fade.',
      why: `Weekly average vs your frozen baseline: ${a.summary!.verdict.weeks.slice(-2).map((w) => `z = ${fmt1(w.z)}`).join(', ')} (the line is ±1.96).`,
      tips: tipsOf(a.domain.id, ['habit', 'measurement']),
      sources: refs('jacobsonTruax1991', 'limDinges2010', 'sliwinski2006', 'schmidt2007'),
      action: { kind: 'measure', id: a.test!.id, label: `Measure ${a.domain.name}` }
    });
  }

  /* 2. today's state — below the typical range today (state, not progress) */
  const below = withTest.filter((a) => a.summary!.today && (a.summary!.today.label === 'below' || a.summary!.today.label === 'well-below'));
  if (below.length) {
    const ci = todaysCheckin(store, now);
    const flags = ci ? stateFlags(store, ci) : [];
    const context = flags.length
      ? ` Today's check-in noted ${list(flags.map((f) => (f === 'short-sleep' ? 'short sleep' : f === 'high-stress' ? 'high stress' : 'sleepiness')))}.`
      : '';
    out.push({
      id: 'today-below',
      kind: 'today',
      priority: 85,
      tone: 'neutral',
      title: `Below your typical range today: ${list(below.map((a) => a.domain.name))}`,
      body: `Short sleep, fatigue, stress, caffeine timing and distractions commonly cause day-to-day dips — one day says nothing about progress.${context}`,
      why: below.map((a) => `${a.domain.name}: ${fmt1(a.summary!.today!.z)} σ from your typical value`).join(' · '),
      tips: [...tipsOf('reaction', ['habit']).slice(0, 2)],
      sources: refs('schmiedek2013', 'sliwinski2018', 'limDinges2010')
    });
  }

  /* 3. calibration — areas never measured or still in their run-in (§2.3) */
  const fresh = withTest.filter((a) => !a.summary!.runInComplete);
  if (fresh.length) {
    const never = fresh.filter((a) => a.summary!.runs.length === 0);
    out.push({
      id: 'calibrate',
      kind: 'calibrate',
      priority: fresh.length >= 5 ? 80 : 58,
      tone: 'neutral',
      title: never.length === fresh.length ? `Calibrate ${fresh.length} area${fresh.length > 1 ? 's' : ''}` : `Finish calibrating ${list(fresh.map((a) => a.domain.name))}`,
      body: 'Your first one to three runs on each test are calibration: most of the practice gain happens there, so they are not scored. Run-ins can be done back to back.',
      why: fresh.map((a) => `${a.domain.name} ${a.summary!.runInDone}/${a.test!.runIn}`).join(' · '),
      tips: [],
      sources: refs('falleti2006', 'bartels2010', 'collie2003'),
      action: { kind: 'measure', id: fresh[0].test!.id, label: `Calibrate ${fresh[0].domain.name}` }
    });
  }

  /* 4. coverage — reference-graded areas with no scored run in 14 days hide the Mean (§2.1) */
  const stale = withTest.filter((a) => a.summary!.runInComplete && a.grade !== 'P' && a.summary!.level.z === null);
  if (stale.length) {
    out.push({
      id: 'coverage',
      kind: 'coverage',
      priority: 66,
      tone: 'neutral',
      title: `Measure ${list(stale.map((a) => a.domain.name))} to keep your Mean current`,
      body: 'The Mean only appears when every area has a recent score — a composite with a missing part would mislead.',
      why: stale
        .map((a) => {
          const last = a.summary!.lastScoredAt;
          return `${a.domain.name}: ${last ? `last scored ${Math.floor((now - last) / DAY)} days ago` : 'no scored run yet'}`;
        })
        .join(' · '),
      tips: [],
      sources: refs('maruff2013'),
      action: { kind: 'measure', id: stale[0].test!.id, label: `Measure ${stale[0].domain.name}` }
    });
  }

  /* 5. focus areas — the lowest reference levels, only when clearly below the rest.
     Grade-P areas (personal scale: 50 = your own baseline) are not comparable
     with reference-scale levels, so they never compete for "weakest". A gap
     under half an SD (5 index points) is within the noise of approximate
     (grade C) anchors, so it is not called a weakness. */
  const focus: BrainDomainId[] = [];
  const graded = leveled.filter((a) => a.grade !== 'P' && a.summary!.level.index !== null);
  if (graded.length >= 3) {
    const lv = (a: AreaSummary) => a.summary!.level.index as number;
    const ranked = [...graded].sort((x, y) => lv(x) - lv(y));
    const mid = median(graded.map(lv));
    for (const a of ranked.slice(0, 2)) {
      if (lv(a) > mid - 5) continue;
      focus.push(a.domain.id);
      const d = getBrainDomain(a.domain.id)!;
      const game = d.training[0];
      out.push({
        id: `focus-${a.domain.id}`,
        kind: 'focus',
        priority: 60 - focus.length,
        tone: 'focus',
        area: a.domain.id,
        title: `Focus area: ${a.domain.name}`,
        body: `${a.domain.name} is ${focus.length === 1 ? 'your lowest area' : 'also clearly below your others'} right now (${lv(a)} on the reference scale, approximate — ${Math.round(mid - lv(a))} points under your median). The evidence-based levers for it are below${game ? ` — and ${getGameName(game.gameId)} exercises the same kind of task (${TRAINING_NOTE.charAt(0).toLowerCase()}${TRAINING_NOTE.slice(1, -1)})` : ''}.`,
        why: `${graded.length} reference-scored areas; yours range from ${lv(ranked[0])} to ${lv(ranked[ranked.length - 1])} (median ${Math.round(mid)}).`,
        tips: d.improve,
        sources: d.sources,
        ...(game ? { action: { kind: 'play' as const, id: game.gameId, label: `Train with ${getGameName(game.gameId)}` } } : {})
      });
    }
    if (!focus.length) {
      out.push({
        id: 'balanced',
        kind: 'focus',
        priority: 34,
        tone: 'up',
        title: 'A balanced profile — no clear weak spot',
        body: 'Every reference-scored area is within half a standard deviation of your median, which is within the uncertainty of the approximate anchors. Keep measuring; a real weak spot would show up as a persistent gap.',
        why: `${graded.length} areas between ${lv(ranked[0])} and ${lv(ranked[ranked.length - 1])} (median ${Math.round(mid)}).`,
        tips: [],
        sources: refs('hedge2018')
      });
    }
  }

  /* 6. sleep — the check-in's sleep diary (§2.8) */
  const sleeps = checkins14.map((c) => sleepMinutes(c.state)).filter((x): x is number => x !== null);
  if (sleeps.length >= 5) {
    const med = median(sleeps);
    const short = sleeps.filter((m) => m < 360).length;
    if (med < 420 || short >= 3) {
      out.push({
        id: 'sleep-short',
        kind: 'sleep',
        priority: 56,
        tone: 'focus',
        title: 'Protect your sleep',
        body: 'Chronic 6-hour nights build up vigilance deficits comparable to a night or two without sleep, while feeling only slightly sleepy — and 7–8 hours went with the best reasoning and verbal scores in a 10,000-person study.',
        why: `Your median sleep over the last ${sleeps.length} check-ins: ${hours(med)}; ${short} night${short === 1 ? '' : 's'} under 6 h.`,
        tips: tipsOf('reaction', ['habit']).filter((t) => t.id === 'reaction-sleep'),
        sources: refs('vanDongen2003', 'wild2018', 'limDinges2010')
      });
    }
  }

  /* 7. associations in the player's own data (only when statistically supported) */
  for (const a of withTest) {
    const s = sleepAssociation(store, a.summary!);
    if (s && s.diff < 0) {
      out.push({
        id: `assoc-sleep-${a.domain.id}`,
        kind: 'association',
        priority: 54,
        tone: 'neutral',
        area: a.domain.id,
        title: `${a.domain.name} is lower after shorter nights`,
        body: `On days after at least an hour less sleep than usual, your ${a.domain.name} scores were lower by about ${fmt1(-s.diff)} of your typical day-to-day spread. This is an association in your data, not proof of cause.`,
        why: `${s.nShort} short-sleep days vs ${s.nRest} other days; 95% interval ${fmt1(s.lo)} to ${fmt1(s.hi)}.`,
        tips: tipsOf('reaction', ['habit']).filter((t) => t.id === 'reaction-sleep'),
        sources: refs('wild2018', 'limDinges2010')
      });
    }
    const st = stateAssociation(store, a, (state) => (state.stress === undefined ? null : state.stress >= 4));
    if (st && st.diff < 0) {
      out.push({
        id: `assoc-stress-${a.domain.id}`,
        kind: 'association',
        priority: 50,
        tone: 'neutral',
        area: a.domain.id,
        title: `${a.domain.name} is lower on high-stress days`,
        body: `On days you rated stress 4–5, your ${a.domain.name} scores were lower by about ${fmt1(-st.diff)} of your typical spread — an association in your data, the same coupling a daily-diary study found.`,
        why: `${st.nA} high-stress days vs ${st.nB} other days; 95% interval ${fmt1(st.lo)} to ${fmt1(st.hi)}.`,
        tips: [],
        sources: refs('sliwinski2006')
      });
    }
  }

  /* 8. time-of-day consistency (Schmidt 2007) */
  const times = store.checkins.slice(-14).map((c) => minuteOfDay(c.startedAt));
  if (times.length >= 6) {
    const spread = circularSdMinutes(times);
    if (spread > 90) {
      out.push({
        id: 'timing',
        kind: 'timing',
        priority: 46,
        tone: 'neutral',
        title: 'Test at a more consistent time',
        body: 'Attention, memory and executive performance follow circadian rhythms, so check-ins at different hours add noise that can hide real change.',
        why: `Your last ${times.length} check-ins started across a spread of about ±${Math.round(spread)} minutes.`,
        tips: tipsOf('reaction', ['measurement']).filter((t) => t.id === 'reaction-timing'),
        sources: refs('schmidt2007')
      });
    }
  }

  /* 9. adherence — averages, not single days, make trends reliable */
  const week = store.checkins.filter((c) => c.completedAt && c.date >= dayKey(now - 7 * DAY)).length;
  if (scoredRuns > 0 && week < 3) {
    out.push({
      id: 'adherence',
      kind: 'adherence',
      priority: 40,
      tone: 'neutral',
      title: 'Check in a few more days a week',
      body: 'Single days are noisy; averaged over several sessions, phone-based cognitive scores become highly reliable — so regular check-ins are what make your trends trustworthy.',
      why: `${week} completed check-in${week === 1 ? '' : 's'} in the last 7 days; streak ${checkinStreak(store, now)}.`,
      tips: [],
      sources: refs('sliwinski2018'),
      action: { kind: 'checkin', label: 'Start a check-in' }
    });
  }

  /* 10. training — suggest a game for a focus area not trained lately; caution on volume */
  const playedSince = (gameIds: string[], days: number) =>
    history.filter((r) => r.outcome !== 'abandoned' && r.finishedAt >= now - days * DAY && gameIds.includes(r.gameId));
  const suggested = new Set<string>();
  for (const id of focus) {
    const d = getBrainDomain(id)!;
    // one card per game: the focus card already offers this area's first game
    if (!d.training.length || out.some((i) => i.area === id && i.action?.kind === 'play')) continue;
    const recent = playedSince(d.training.map((t) => t.gameId), 14);
    const t = d.training.find((x) => !suggested.has(x.gameId));
    if (recent.length === 0 && t) {
      suggested.add(t.gameId);
      out.push({
        id: `training-${id}`,
        kind: 'training',
        priority: 36,
        tone: 'neutral',
        area: id,
        title: `Try ${getGameName(t.gameId)} for ${d.name}`,
        body: `${t.why} ${t.evidence}`,
        why: `No ${d.name} training games in the last 14 days.`,
        tips: [],
        sources: t.sources,
        action: { kind: 'play', id: t.gameId, label: `Play ${getGameName(t.gameId)}` }
      });
    }
  }
  const trainingDays = new Set(
    playedSince(BRAIN_DOMAINS.flatMap((d) => d.training.map((t) => t.gameId)), 7).map((r) => dayKey(r.finishedAt))
  ).size;
  if (trainingDays >= 6) {
    out.push({
      id: 'training-volume',
      kind: 'training',
      priority: 30,
      tone: 'neutral',
      title: 'More is not automatically better',
      body: 'In a meta-analysis of computerized training in older adults, sessions more than three times a week were no more effective than one to three — enjoy the games, but daily drilling is not required.',
      why: `You played training games on ${trainingDays} of the last 7 days.`,
      tips: [],
      sources: refs('lampit2014')
    });
  }

  /* 11. progress — reliable improvements, with the practice qualifier (§2.6) */
  for (const a of withTest) {
    if (a.summary!.verdict.verdict !== 'reliably-above') continue;
    out.push({
      id: `progress-${a.domain.id}`,
      kind: 'progress',
      priority: 70,
      tone: 'up',
      area: a.domain.id,
      title: `${a.domain.name}: reliably above your baseline`,
      body: `Reliably above your baseline on this test for two weeks.${a.test!.practiceProne ? ' Part of this is practice on the test itself.' : ''}`,
      why: `Weekly averages vs your frozen baseline: ${a.summary!.verdict.weeks.slice(-2).map((w) => `z = ${fmt1(w.z)}`).join(', ')}.`,
      tips: [],
      sources: a.test!.practiceProne ? refs('jacobsonTruax1991', 'scharfen2018') : refs('jacobsonTruax1991')
    });
  }
  if (meanSum.verdict === 'reliably-above') {
    out.push({
      id: 'progress-mean',
      kind: 'progress',
      priority: 71,
      tone: 'up',
      title: 'Your Mean is reliably above its baseline',
      body: 'Two consecutive weeks above your baseline across the averaged areas. Part of this is practice on the tests themselves.',
      why: `Mean — average of ${meanSum.m} areas — over ${meanSum.weeks.length} weeks.`,
      tips: [],
      sources: refs('jacobsonTruax1991', 'scharfen2018')
    });
  }

  /* 12. the evidence-based habits — always available, lowest priority */
  out.push({
    id: 'habits',
    kind: 'habit',
    priority: 5,
    tone: 'neutral',
    title: 'The levers with the best evidence',
    body: 'Physical activity, enough sleep, and managing health risks such as blood pressure, hearing and vision have stronger evidence for long-term brain health than any game.',
    why: 'General guidance — it applies whatever your scores.',
    tips: [...tipsOf('speed', ['habit']), ...tipsOf('reaction', ['habit']).filter((t) => t.id === 'reaction-sleep')],
    sources: refs('erickson2019', 'livingston2024', 'wild2018')
  });

  const insights = out.sort((x, y) => y.priority - x.priority || x.id.localeCompare(y.id));
  return {
    generatedAt: now,
    insights,
    focus,
    basis: { scoredRuns, checkins14d: checkins14.length, areasWithLevel: leveled.length }
  };
}

/* the coach names games without importing the game registry's components */
let gameNames: Map<string, string> | null = null;
/** let the UI provide game display names (keeps coach.ts free of the game registry) */
export function setCoachGameNames(names: Record<string, string>): void {
  gameNames = new Map(Object.entries(names));
}
function getGameName(id: string): string {
  return gameNames?.get(id) ?? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
