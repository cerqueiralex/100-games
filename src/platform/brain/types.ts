import type { ComponentType, ReactNode } from 'react';

/**
 * Brain Lab — the science-based measurement module (its own tab, between
 * Games and Profile). SCIENCE.md in this folder is the rulebook: every
 * benchmark is a faithful implementation of a validated paradigm, and every
 * score, verdict and sentence the module shows follows it. Read it before
 * adding or changing a test — a protocol, formula or anchor change MUST
 * update SCIENCE.md in the same commit and bump the matching version.
 *
 * The split mirrors the game platform:
 *  - benchmarks live in isolated folders under src/brain/<id>/ and export a
 *    BrainTestDefinition (registry.ts lists them);
 *  - everything shared — the runner, the check-in, the store, the analytics,
 *    the dashboard — lives here in src/platform/brain/.
 *
 * Benchmarks are NOT GameDefinitions and never enter GAMES: a measurement
 * has a fixed protocol (no tiers, no assists, no save & resume, no win/lose),
 * and its results live in their own permanent store (`100games.v1.brain`),
 * not in the capped, clearable game history. Games TRAIN; benchmarks MEASURE
 * (SCIENCE.md §0.1) — the areas link to existing games as training shortcuts.
 */

/** The fixed vocabulary of cognitive areas (domains.ts holds their copy). */
export type BrainDomainId =
  | 'attention'
  | 'memory'
  | 'calculation'
  | 'analysis'
  | 'precision'
  | 'reaction'
  | 'speed'
  | 'flexibility'
  | 'spatial';

/**
 * One training shortcut: an existing game that exercises an area. A link
 * exists ONLY because a peer-reviewed source backs it (the owner's rule:
 * no science, no link): the game must implement — or closely mirror — a
 * research paradigm used to measure or train the construct, and `sources`
 * must cite that paradigm (plus the training evidence where it exists).
 * No game has ever been studied as itself, so `evidence` says honestly what
 * practising this KIND of task is known to do. Validate requires ≥ 1 source.
 */
export interface BrainTrainingLink {
  /** a GameDefinition id from the registry (validate proves it exists) */
  gameId: string;
  /** the research paradigm the game mirrors ("Stroop colour–word interference") */
  paradigm: string;
  /** one line on WHY this game exercises the area — shown on its card */
  why: string;
  /** what the training literature says about practising this kind of task */
  evidence: string;
  /** ≥ 1 verified source (references.ts) */
  sources: BrainReference[];
}

/**
 * One evidence-based way to improve an area (Profile → Brain, the area
 * sheet, the coach). Every tip cites ≥ 1 verified source, and its wording
 * never outruns that source (SCIENCE.md §4: no benefit claims beyond what
 * the evidence shows — "improves the practised task" is not "improves you").
 */
export interface BrainTip {
  /** stable id, so the coach can point at a tip */
  id: string;
  title: string;
  body: string;
  /** what kind of lever this is (habits act on state; practice on skill) */
  kind: 'habit' | 'practice' | 'strategy' | 'measurement';
  sources: BrainReference[];
}

export interface BrainDomain {
  id: BrainDomainId;
  /** display name ("Processing Speed") and a short form for tight axes ("Speed") */
  name: string;
  short: string;
  /** the honest subtitle SCIENCE.md §4.2 prescribes ("Attention control") */
  subtitle: string;
  /** 2–3 sentences for the area sheet: what it is, why it matters, its scope */
  about: string;
  /** "What practice does here" — SCIENCE.md §3.4, one line */
  practice: string;
  /**
   * Content-palette slot (--play-N): the area's colour on every surface —
   * radar vertex, cards, charts. Fixed across themes like a category colour,
   * never 9 (white) or 14 (the charts' grey "Other"). Colour never carries
   * meaning on its own: it always sits beside the area's name.
   */
  slot: number;
  /**
   * The sources behind the area itself: the construct, why it is measured
   * the way the benchmark measures it (≥ 1; the benchmark lists its own
   * paradigm papers too).
   */
  sources: BrainReference[];
  /** existing games that train this area, best first (shortcut cards) — may be empty */
  training: BrainTrainingLink[];
  /** evidence-based ways to improve the area (≥ 1 each, sourced) */
  improve: BrainTip[];
}

/** How one raw metric reads. */
export interface BrainMetricDef {
  id: string;
  label: string;
  /** printed after the value ("ms", "%", "/min", "bits/s") */
  unit?: string;
  /** which direction is better — drives arrows and good/bad colour */
  better: 'higher' | 'lower';
  /** decimals to print (default 0) */
  decimals?: number;
  /** one line explaining the metric (results info, dashboard) */
  about?: string;
}

/** A peer-reviewed source (opens in a new tab). */
export interface BrainReference {
  /** "Burgoyne et al. (2023) · Journal of Experimental Psychology: General" */
  label: string;
  /** a stable URL — a DOI link, PubMed/PMC page or the publisher's page */
  url: string;
  /** one line on what this source establishes for the test */
  note?: string;
}

/**
 * Reference grades (SCIENCE.md §2.2): A = norms from the same protocol on
 * comparable phones; B = same paradigm on other hardware with a measured
 * device correction; C = provisional, anchored to the literature range of a
 * related protocol or device ("approximate" badge); P = no reference at all —
 * the area only ever has a personal index.
 */
export type ReferenceGrade = 'A' | 'B' | 'C' | 'P';

/** What a reference function may need beyond the raw metrics. */
export interface BrainRefContext {
  /** whole years, only when the player gave a birth year (Memory, Reaction anchors) */
  age?: number;
  /**
   * Estimated display + touch latency of this platform in ms (Pronk et al.
   * 2020) — Reaction adds it to its anchor and to its false-start / lapse
   * thresholds. Constant within one device, so it cancels in personal trends.
   */
  platformOffsetMs: number;
  /**
   * True when the offset is a measured value for this platform (Pronk et al.
   * 2020: iOS, Android Chrome, Windows Chrome, macOS Safari). Elsewhere the
   * offset is a 60 ms placeholder and Reaction shows no reference index.
   */
  offsetKnown: boolean;
}

export interface BrainReferenceAnchor {
  grade: Exclude<ReferenceGrade, 'P'>;
  /**
   * Who the anchor sample was, in one sentence — the badge tooltip:
   * "290 adults aged 18–35 tested on desktop computers (Burgoyne et al. 2023)."
   */
  anchor: string;
  /**
   * z of a run's primary metric against the anchor, oriented so higher is
   * better. The index is ALWAYS 50 + 10z (indexFromZ) — never a normal-CDF
   * percentile (SCIENCE.md §2.2). Must be pure, finite for finite metrics,
   * and increasing in the primary metric — validate sweeps it.
   */
  z: (metrics: Record<string, number>, ctx: BrainRefContext) => number;
}

/** What a finished run hands back to the runner. */
export interface BrainRunOutcome {
  /**
   * Raw metrics keyed by BrainMetricDef.id. A valid run reports every
   * declared metric, finite. An invalid run reports what it has.
   */
  metrics: Record<string, number>;
  /** scored trials (warm-up and practice trials excluded) */
  trials: number;
  /**
   * False when the run failed the test's validity rules (net ≤ 0, too many
   * anticipations, accuracy at chance, interruptions beyond the limit…). It
   * is still recorded and shown — with the reason — but excluded from every
   * level, baseline, verdict, the Mean and all insights (SCIENCE.md C11).
   */
  valid: boolean;
  /** machine-readable reasons for `valid: false`, or quality flags on a valid run */
  flags?: string[];
  /** 1–3 extra lines for the results card ("Longest span · 7") */
  highlights?: { label: string; value: string }[];
  /**
   * Compact per-trial log, numbers only (one inner array per trial, the
   * column meaning documented in the test's SCIENCE.md section). Kept for
   * baseline runs and each test's most recent runs (store.ts trims older).
   */
  trialLog?: number[][];
}

/** Props every benchmark component receives from the BrainRunner. */
export interface BrainTestProps {
  /**
   * 'test': the full protocol — the per-session warm-up the spec lists, a
   * countdown where it has one, then the scored block — recorded.
   * 'practice': only the first-run tutorial practice, with corrective
   * feedback; nothing is recorded (the runner discards the outcome).
   */
  mode: 'practice' | 'test';
  /**
   * True until this player has finished a VALID run of this test: a 'test'
   * run then starts with the first-run practice/tutorial before the
   * per-session warm-up (SCIENCE.md C1, Appendix C.7).
   */
  firstRun: boolean;
  /**
   * Fresh for every run and stored with it. ALL item generation derives from
   * it (seeded RNG from timing.ts — never Math.random), which gives every run
   * a new alternate form and lets validate replay a protocol exactly.
   */
  seed: number;
  /**
   * Interruption class B only (trial-based tests): true while the runner's
   * pause overlay is up. Void the trial or sequence in flight and replace it
   * after resume, within the test's own limits (beyond them the run is
   * invalid). Class A tests (fixed-time blocks) never see a pause — the
   * runner ends an interrupted class-A run as invalid and offers a restart
   * (SCIENCE.md C5).
   */
  paused: boolean;
  /** reference context (age, platform latency) — Reaction needs it for its thresholds */
  ctx: BrainRefContext;
  /** report protocol progress 0..1 (drives the runner's progress bar) */
  onProgress: (fraction: number) => void;
  /** call exactly once — guard with a ref */
  onFinish: (outcome: BrainRunOutcome) => void;
  /** class B tests may pause/resume from inside the stage */
  requestPause: (paused: boolean) => void;
}

/** The contract each benchmark folder exports (src/brain/<id>/index.ts). */
export interface BrainTestDefinition {
  /** unique within the Brain Lab registry, kebab-case */
  id: string;
  domain: BrainDomainId;
  /** display name — evocative but honest ("Arrow Squared") */
  name: string;
  /** the validated paradigm it implements ("Flanker Squared (Burgoyne et al. 2023)") */
  paradigm: string;
  /** one line for cards */
  tagline: string;
  /** 2–4 short instruction lines shown beside the demo */
  instructions: string[];
  /** 2–4 skill chips ("Attention control", "Ignoring distraction") */
  skills: string[];
  /** typical duration of a 'test' run in seconds, warm-up included (validate: 60–240) */
  durationSec: number;
  /** the looping animated demonstration, built on DemoStage (components/fx.tsx) */
  Demo: ComponentType;
  component: ComponentType<BrainTestProps>;
  /** sticker art for cards — content art, may be colourful */
  icon: ReactNode;
  metrics: BrainMetricDef[];
  /**
   * The metric every personal statistic is computed on. Its BrainMetricDef
   * MUST be `better: 'higher'` (SCIENCE.md: every MVP primary metric is
   * oriented so that higher is better) — validate enforces it.
   */
  primaryMetric: string;
  /** the literature anchor, or null for a grade-P (personal-only) test */
  reference: BrainReferenceAnchor | null;
  /** unscored run-in sessions before the baseline (SCIENCE.md §2.3, §2.12) */
  runIn: 1 | 2 | 3;
  /**
   * The floor under the personal noise σ_w, in primary-metric units — either
   * absolute (SEM_ref = σ_ref·√(1 − r_ref)) or a fraction of the baseline
   * (SCIENCE.md §2.4, §2.12).
   */
  noiseFloor: { abs: number } | { relative: number };
  /** improvement verdicts carry "Part of this is practice on the test itself" (§2.6) */
  practiceProne: boolean;
  /** counts toward the "Today" composite (Lim & Dinges 2010 — §2.1) */
  stateSensitive: boolean;
  /** interruption class (SCIENCE.md C5): A = fixed-time block, B = trial-based */
  interruption: 'A' | 'B';
  /**
   * the test draws its own countdown for a fixed-time block (Arithmetic
   * Sprint's §1.7 bar, Arrow Squared's) — the runner then hides its own
   * filling progress bar, so two bars never run in opposite directions
   */
  ownTimerBar?: boolean;
  /** default cadence for the check-in rotation (SCIENCE.md §2.10) */
  perWeek: 1 | 2 | 7;
  /** bump on any protocol change that can shift raw scores — starts a new segment */
  protocolVersion: number;
  /** bump when metric computation changes — history is rescored, no new segment */
  scoringVersion: number;
  /** bump when the reference anchor changes — indices recomputed from raw metrics */
  referenceVersion: number;
  science: {
    /** what is measured and why this paradigm (2–4 sentences) */
    summary: string;
    /** how the primary metric and index are computed, anchors and caveats (2–4 sentences) */
    scoring: string;
    /** every deviation from the source protocol, one line each */
    deviations: string[];
    /** at least two peer-reviewed sources */
    references: BrainReference[];
  };
}

/** How a recorded run is used (analytics.ts derives it; the copy on a session is informational). */
export type BrainRunType = 'run-in' | 'baseline' | 'tracking' | 'practice' | 'invalid';

/**
 * The device a run was taken on. `key` identifies the measurement series:
 * a different key starts a new baseline segment (SCIENCE.md §2.3 — phones
 * differ by 35–140 ms of latency, Nicosia et al. 2023).
 */
export interface BrainDevice {
  /** input + screen (short×long side) + pixel ratio + platform, e.g. "touch|390x844@3|ios" */
  key: string;
  input: 'touch' | 'mouse' | 'pen';
  platform: string;
  ua: string;
  /** CSS screen size, short side × long side */
  screen: string;
  dpr: number;
  /** median requestAnimationFrame interval measured at the start of the run */
  frameMs: number;
  /** installed PWA (display-mode: standalone) */
  standalone: boolean;
}

/** One recorded run of a benchmark. */
export interface BrainSession {
  id: string;
  testId: string;
  domain: BrainDomainId;
  finishedAt: number;
  /** the LOCAL calendar day, 'YYYY-MM-DD' */
  date: string;
  /** minutes EAST of UTC at the time of the run (−180 for Brasília) */
  tzOffset: number;
  durationSec: number;
  seed: number;
  metrics: Record<string, number>;
  /**
   * The reference z as computed when recorded (null for grade P). Displays
   * recompute it from `metrics` through the live test, so a corrected anchor
   * re-scores the past; this copy is the fallback for a removed test.
   */
  refZ: number | null;
  protocolVersion: number;
  scoringVersion: number;
  referenceVersion: number;
  valid: boolean;
  flags?: string[];
  runType: BrainRunType;
  device: BrainDevice;
  ctx: BrainRefContext;
  theme: string;
  /** the daily check-in this run belonged to, if any */
  checkinId?: string;
  trialLog?: number[][];
}

/** The check-in questions (SCIENCE.md §2.8). A skipped item is absent — never a neutral value. */
export interface BrainStateReport {
  /** Stanford Sleepiness Scale, 1 (wide awake) … 7 (sleep onset soon) */
  sss?: number;
  /** last night, local 'HH:MM' */
  bedTime?: string;
  wakeTime?: string;
  /** minutes awake during the night, 15-minute steps */
  awakeMin?: number;
  /** 1 very poor … 5 very good */
  sleepQuality?: number;
  /** Elo et al. (2003) single-item stress, 1 not at all … 5 very much */
  stress?: number;
  /** caffeine since waking: 0 none, 1 one serving, 2 two or more */
  caffeine?: 0 | 1 | 2;
  /** exercised in the last hour */
  exercise?: boolean;
}

/** One daily check-in: the state questions plus a short planned battery. */
export interface BrainCheckin {
  id: string;
  date: string;
  startedAt: number;
  /** set once every planned test has a recorded run */
  completedAt?: number;
  /** the planned tests, in canonical order */
  testIds: string[];
  state?: BrainStateReport;
}

/**
 * A frozen personal baseline (SCIENCE.md §2.3, §2.11 — stored explicitly so
 * that capping the session list can never destroy one).
 */
export interface BrainBaseline {
  testId: string;
  segment: string;
  /** median primary metric of the 5 baseline runs */
  value: number;
  /** σ_w when the baseline froze (live σ_w is re-estimated as runs accrue) */
  sigma: number;
  frozenAt: number;
  sessionIds: string[];
}

export interface BrainSettings {
  /** optional, stays on the device; only the Memory and Reaction anchors use it */
  birthYear?: number;
  /** when the player acknowledged the Brain Lab disclaimer (first open) */
  introAt?: number;
}

/** The permanent store (`100games.v1.brain`). */
export interface BrainStore {
  version: 1;
  /** chronological — oldest first — and capped (see store.ts) */
  sessions: BrainSession[];
  checkins: BrainCheckin[];
  baselines: BrainBaseline[];
  /** explicit "reset my baseline" requests — each starts a new segment for that test */
  resets: { testId: string; at: number }[];
  settings: BrainSettings;
}
