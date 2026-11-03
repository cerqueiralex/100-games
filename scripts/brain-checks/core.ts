/**
 * Brain Lab — the CORE checks of the validate gate (SCIENCE.md §0, §1.4, §2,
 * §4 and Appendix B "Global" / "Scoring"). They keep the module honest
 * whatever any one benchmark does; each benchmark proves its own paradigm in
 * scripts/brain-checks/<test-id>.ts.
 *
 * scripts/validate.ts runs CORE_CHECKS in its "— Brain Lab —" block, then
 * every per-benchmark check. On their own:
 *   npx tsx scripts/brain-checks/run.ts core
 *
 * House rules (QA-LEDGER):
 *  - assert what the player experiences: the analytics are driven on
 *    synthetic series through the real functions, the store through its real
 *    write path against an in-memory localStorage;
 *  - prove each rule catches a broken input: the registry contract and the
 *    area rules are re-run on deliberately broken copies of a stub registry
 *    built from the §2.12 table, and every text scan is first shown planted
 *    violations (and allowed look-alikes);
 *  - text scans read comment-STRIPPED code — the TypeScript parser blanks
 *    comment trivia, so strings, regexes, JSX text, URLs and line numbers all
 *    survive (a `//.*$` stripper would cut every line holding `https://`) —
 *    and they must pass on the real files;
 *  - the dossier is the source: the parameter table, the canonical order, the
 *    MVP grades, the disclaimer, the SSS, the stress item, the subtitles and
 *    the device offsets are PARSED from SCIENCE.md, so the code is held to the
 *    text as written and a dossier edit re-tightens the gate by itself.
 *
 * Randomness: none of these checks draws from Math.random (validate seeds it
 * globally, so draws would depend on earlier blocks); fixtures are fixed.
 * Time: every timestamp is LOCAL wall-clock (`at()`), so day keys and ISO
 * weeks come out the same in any time zone.
 */
import ts from 'typescript';
import * as nodeFs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BrainCheck, BrainCheckContext } from './types';
import type {
  BrainBaseline,
  BrainDevice,
  BrainDomain,
  BrainDomainId,
  BrainRefContext,
  BrainReferenceAnchor,
  BrainSession,
  BrainStateReport,
  BrainStore,
  BrainTestDefinition
} from '../../src/platform/brain/types';
import type { GameResult } from '../../src/platform/types';
import { BRAIN_TESTS, benchmarkFor } from '../../src/platform/brain/registry';
import {
  BRAIN_DISCLAIMER,
  BRAIN_DOMAINS,
  BRAIN_ONBOARDING,
  IMPLEMENTATION_NOTE,
  SSS_ITEMS,
  STRESS_ITEM,
  TRAINING_NOTE
} from '../../src/platform/brain/domains';
import { indexFromZ, zFrom } from '../../src/platform/brain/timing';
import { REF } from '../../src/platform/brain/references';
import { coach } from '../../src/platform/brain/coach';
import { ageFrom, detectPlatform, deviceKey, platformOffset, type BrainPlatform } from '../../src/platform/brain/device';
import * as A from '../../src/platform/brain/analytics';
import * as S from '../../src/platform/brain/store';
import { applyBackup, exportBackup, parseBackup, type BackupPayload } from '../../src/platform/backup';
import { DEFAULT_PROFILE, appendResult, saveProfile } from '../../src/platform/storage';
import { GAMES } from '../../src/platform/registry';
import { DUR } from '../../src/platform/motion';
import { dayKey } from '../../src/platform/progress/progress';
import { ensureScoringCurrent, rescoreSessions } from '../../src/platform/brain/rescore';
import { areaView } from '../../src/platform/brain/ui/model';
import { buildAreaView } from '../../src/platform/brain/ui/dashModel';
import { flagCopy, personalFormingCopy, personalIndexAfter } from '../../src/platform/brain/ui/copy';
import { PHASE as SC_PHASE, STATUS as SC_STATUS, trialRow as scRow } from '../../src/brain/symbol-coding/logic/scoring';

type Ctx = BrainCheckContext;

export interface CoreCheck {
  name: string;
  run: (ctx: Ctx) => string | Promise<string>;
}

/**
 * Plausible ranges of each referenced benchmark's PRIMARY metric — the
 * domain `reference.z` is swept over (pure, finite, strictly increasing, and
 * the anchor mean must fall inside, which catches a unit mismatch).
 * Coverage-checked both ways against the registry's referenced tests.
 * Grade-P tests (Flexibility, `shape-color-switch`) have no reference and so
 * no entry.
 */
export const SWEEP: Record<string, readonly [number, number]> = {
  // reaction: S = mean 1000/RT (s⁻¹) — mean RTs of ~150–1000 ms
  'alertness-check': [1, 6.5],
  // processing speed: SDS90, correct symbol codings in 90 s
  'symbol-coding': [5, 110],
  // attention: net score per 90 s (net ≤ 0 is an invalid run, but z must still be defined)
  'arrow-squared': [-20, 110],
  // memory: MnS in items (the staircase is bounded 2–10)
  'block-span': [2, 10],
  // calculation: CPM, correct per minute
  'arithmetic-sprint': [0, 40],
  // spatial: RCS, correct per minute
  'mirror-twins': [0, 60],
  // precision: TP, effective throughput in bits/s
  'target-ring': [1, 12],
  // analysis: θ in logits
  'matrix-reasoning': [-4, 4]
};

/* ====================================================================== */
/* files and comment-stripped scanning                                     */
/* ====================================================================== */

const fs = nodeFs as unknown as {
  readFileSync(path: string, encoding: string): string;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
  existsSync(path: string): boolean;
};
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const rawCache = new Map<string, string>();

function readRepo(rel: string): string {
  let text = rawCache.get(rel);
  if (text === undefined) {
    text = fs.readFileSync(ROOT + rel, 'utf8');
    rawCache.set(rel, text);
  }
  return text;
}

/** every .ts/.tsx file under a repo folder (recursive, sorted; [] when absent) */
function codeFiles(rel: string): string[] {
  if (!fs.existsSync(ROOT + rel)) return [];
  const out: string[] = [];
  for (const name of fs.readdirSync(ROOT + rel).sort()) {
    const path = `${rel}/${name}`;
    if (fs.statSync(ROOT + path).isDirectory()) out.push(...codeFiles(path));
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(path);
  }
  return out;
}

/**
 * The code with every comment blanked to spaces (newlines kept, so line
 * numbers hold). Comments are exactly the trivia in front of each token, as
 * the TypeScript parser sees it — strings, template literals, regex literals
 * and JSX text (`<p>a // b</p>`) are tokens and survive untouched.
 */
export function stripComments(text: string, fileName = 'sample.tsx'): string {
  const kind = /\.ts$/.test(fileName) ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const out = text.split('');
  const visit = (node: ts.Node): void => {
    const kids = node.getChildren(sf);
    if (!kids.length) {
      for (let i = node.pos, end = node.getStart(sf); i < end; i++) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' ';
      return;
    }
    kids.forEach(visit);
  };
  visit(sf);
  return out.join('');
}

export interface ScanRule {
  name: string;
  re: RegExp;
  /** a match that is nevertheless fine: its whole line, and the line up to the match (comment-stripped) */
  allow?: (line: string, before: string) => boolean;
}

export interface ScanHit {
  file: string;
  line: number;
  rule: string;
  text: string;
}

/** every match of the rules in already comment-stripped code */
export function scanCode(code: string, rules: readonly ScanRule[], file = '(sample)'): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
    for (const m of code.matchAll(re)) {
      const at = m.index ?? 0;
      const start = code.lastIndexOf('\n', at) + 1;
      const end = code.indexOf('\n', at);
      const line = code.slice(start, end < 0 ? undefined : end);
      if (rule.allow?.(line, code.slice(start, at))) continue;
      hits.push({ file, line: code.slice(0, at).split('\n').length, rule: rule.name, text: line.trim().slice(0, 140) });
    }
  }
  return hits;
}

/** scan files: a raw-text pre-filter first, so only files that might match are parsed */
function scanFiles(files: readonly string[], rules: readonly ScanRule[]): ScanHit[] {
  const probes = rules.map((r) => new RegExp(r.re.source, r.re.flags.replace('g', '')));
  const hits: ScanHit[] = [];
  for (const file of files) {
    const raw = readRepo(file);
    if (!probes.some((p) => p.test(raw))) continue;
    hits.push(...scanCode(stripComments(raw, file), rules, file));
  }
  return hits;
}

/** the scan applied to a planted snippet (comments stripped like a real file) */
const sampleHits = (snippet: string, rules: readonly ScanRule[]) => scanCode(stripComments(snippet), rules);

/** [first, last] line of a top-level function or const declaration named `name` */
function declLines(text: string, fileName: string, name: string): [number, number] | null {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === name) return [lineOf(st.getStart(sf)), lineOf(st.end)];
    if (ts.isVariableStatement(st) && st.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name)) {
      return [lineOf(st.getStart(sf)), lineOf(st.end)];
    }
  }
  return null;
}

/** the Brain Lab code: the platform module and every benchmark folder */
const brainFiles = () => [...codeFiles('src/platform/brain'), ...codeFiles('src/brain')];

const IMPORTS_BRAIN = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"`][^'"`\n]*\/brain(?:\/|['"`])/;

/** everything that renders Brain Lab copy: the module, plus any file that imports it */
const brainUiFiles = () => [
  ...brainFiles(),
  ...codeFiles('src').filter(
    (f) => !f.startsWith('src/platform/brain/') && !f.startsWith('src/brain/') && IMPORTS_BRAIN.test(readRepo(f))
  )
];

/* ====================================================================== */
/* the dossier, parsed                                                     */
/* ====================================================================== */

interface Expected {
  runIn: number;
  perWeek: number;
  interruption: string;
  practiceProne: boolean;
  stateSensitive: boolean;
  grade: string;
  floor: { kind: 'abs' | 'relative'; value: number; approx: boolean };
}

interface Dossier {
  /** §2.12, one row per area */
  table: Map<BrainDomainId, Expected>;
  /** C12, by domain */
  order: BrainDomainId[];
  /** §2.2 "MVP grades" */
  grades: Map<string, string>;
  disclaimer?: string;
  sss: string[];
  stress?: string;
  /** §4.2 honest subtitles, by area NAME */
  subtitles: Map<string, string>;
  implementationNote?: string;
  trainingCard?: string;
  onboarding?: string;
  /** §1.10 Pronk 2020 offsets, by platform id */
  offsets: Map<string, number>;
  errors: string[];
}

const DOMAIN_IDS = new Set<string>(BRAIN_DOMAINS.map((d) => d.id));

function domainByName(name: string): BrainDomainId | undefined {
  const n = name.trim().replace(/\.$/, '').toLowerCase();
  return BRAIN_DOMAINS.find((d) => d.name.toLowerCase() === n || d.short.toLowerCase() === n || d.id === n)?.id;
}

let dossierCache: Dossier | null = null;

function dossier(): Dossier {
  if (dossierCache) return dossierCache;
  const text = readRepo('src/platform/brain/SCIENCE.md');
  const errors: string[] = [];
  const section = (heading: string): string => {
    const i = text.indexOf(heading);
    if (i < 0) {
      errors.push(`SCIENCE.md has no "${heading}" section`);
      return '';
    }
    const rest = text.slice(i + heading.length);
    const next = rest.search(/\n#{2,3} /);
    return text.slice(i, next < 0 ? undefined : i + heading.length + next);
  };
  const grab = (label: string, re: RegExp, src = text): string | undefined => {
    const m = re.exec(src);
    if (!m) errors.push(`could not find the ${label} in SCIENCE.md`);
    return m?.[1];
  };

  // §2.12 master parameter table
  const table = new Map<BrainDomainId, Expected>();
  for (const row of section('### 2.12 Master parameter table').split('\n')) {
    if (!row.startsWith('| ')) continue;
    const c = row.split('|').slice(1, -1).map((s) => s.trim());
    if (!DOMAIN_IDS.has(c[0])) continue;
    const id = c[0] as BrainDomainId;
    if (c.length < 10) {
      errors.push(`§2.12 row "${id}" has ${c.length} cells, expected 10`);
      continue;
    }
    const grade = /\(([ABCP])\)/.exec(c[2])?.[1];
    const rel = /^(\d+(?:\.\d+)?)\s*%\s*of\s*B/.exec(c[4]);
    const approx = /≈\s*(\d+(?:\.\d+)?)/.exec(c[4]);
    const abs = /^(\d+(?:\.\d+)?)/.exec(c[4]);
    const floor: Expected['floor'] | null = rel
      ? { kind: 'relative', value: Number(rel[1]) / 100, approx: false }
      : approx
        ? { kind: 'abs', value: Number(approx[1]), approx: true }
        : abs
          ? { kind: 'abs', value: Number(abs[1]), approx: false }
          : null;
    const runIn = Number(c[5]);
    const perWeek = /^daily$/i.test(c[9]) ? 7 : Number(/^(\d+)\s*×\s*\/\s*week/.exec(c[9])?.[1]);
    if (!grade || !floor || !(runIn >= 1) || !(perWeek >= 1) || !/^[AB]$/.test(c[8])) {
      errors.push(`§2.12 row "${id}" could not be parsed: ${row}`);
      continue;
    }
    table.set(id, {
      runIn,
      perWeek,
      interruption: c[8],
      practiceProne: /^yes/i.test(c[6]),
      stateSensitive: /^(yes|strongest)/i.test(c[7]),
      grade,
      floor
    });
  }
  for (const d of BRAIN_DOMAINS) if (!table.has(d.id)) errors.push(`§2.12 has no row for area "${d.id}"`);

  // C12 canonical order
  const c12 = grab('C12 canonical order', /\*\*C12\. Order\.\*\*[^\n]*?check-in\s*→\s*([^\n]+)/) ?? '';
  const order: BrainDomainId[] = [];
  for (const name of c12.split('→')) {
    const id = domainByName(name);
    if (id) order.push(id);
    else errors.push(`C12 names "${name.trim()}", which is no Brain Lab area`);
  }
  if (order.length !== BRAIN_DOMAINS.length || new Set(order).size !== order.length) {
    errors.push(`C12 must order each of the ${BRAIN_DOMAINS.length} areas exactly once (parsed: ${order.join(', ')})`);
  }

  // §2.2 MVP grades
  const grades = new Map<string, string>();
  for (const m of (grab('§2.2 MVP grades', /\*\*MVP grades:\*\*([^\n]+)/) ?? '').matchAll(/([a-z]+)\s+([ABCP])\b/g)) {
    grades.set(m[1], m[2]);
  }

  // §2.8 SSS (seven verbatim items) and the Elo stress item
  const sssRow = text.split('\n').find((l) => l.includes('**Stanford Sleepiness Scale**, verbatim:')) ?? '';
  const sss: string[] = [];
  for (const m of sssRow.matchAll(/(\d)\s+"([^"]+)"/g)) {
    if (Number(m[1]) !== sss.length + 1) errors.push(`§2.8 SSS items are not numbered 1–7 in order (found ${m[1]})`);
    sss.push(m[2]);
  }
  if (sss.length !== 7) errors.push(`§2.8 SSS: parsed ${sss.length} items, expected 7`);

  // §4.2 honest subtitles
  const subtitles = new Map<string, string>();
  const subStart = text.indexOf('**Honest subtitles for areas:**');
  if (subStart < 0) errors.push('SCIENCE.md has no "Honest subtitles for areas" list');
  else {
    const tail = text.slice(subStart);
    const end = tail.indexOf('\n- **');
    for (const m of tail.slice(0, end < 0 ? undefined : end).matchAll(/^\s+-\s+(.+?):\s+"([^"]+)"/gm)) subtitles.set(m[1].trim(), m[2]);
  }

  // §1.10 platform offsets (Pronk 2020)
  const offsets = new Map<string, number>();
  const offLine = grab('§1.10 Pronk 2020 offsets', /Mean overestimation of RT by web apps \(Pronk 2020\):([^\n]+)/) ?? '';
  for (const m of offLine.matchAll(/(iOS Safari|iOS Chrome|Android Chrome|Windows Chrome|macOS Safari)\s+(\d+(?:\.\d+)?)/g)) {
    offsets.set(m[1].toLowerCase().replace(' ', '-'), Number(m[2]));
  }

  dossierCache = {
    table,
    order,
    grades,
    disclaimer: grab('§4.2 disclaimer', /\*\*Disclaimer\*\*[^\n]*\n\s*>\s*"([^"\n]+)"/),
    sss,
    stress: grab('§2.8 stress item', /\|\s*Stress\s*\|\s*"([^"]+)"/),
    subtitles,
    implementationNote: grab('§4.2 benchmark-page line', /\*\*On every benchmark page:\*\*[^"\n]*"([^"\n]+)"/),
    trainingCard: grab('§4.2 training-card line', /\*\*Training cards\*\* read:\s*"([^"\n]+)"/),
    onboarding: grab('§3.1 onboarding copy', /### 3\.1[^\n]*\n+>\s*([^\n]+)/),
    offsets,
    errors
  };
  return dossierCache;
}

/* ====================================================================== */
/* the registry contract (a function over a tests array)                   */
/* ====================================================================== */

export interface ContractEnv {
  table: Map<BrainDomainId, Expected>;
  order: readonly BrainDomainId[];
  gameIds: ReadonlySet<string>;
  sweep: Readonly<Record<string, readonly [number, number]>>;
  domains: readonly BrainDomain[];
}

/** the live environment: the parsed dossier, the game registry and SWEEP */
export function contractEnv(sweep: Readonly<Record<string, readonly [number, number]>> = SWEEP): ContractEnv {
  const doc = dossier();
  return { table: doc.table, order: doc.order, gameIds: new Set(GAMES.map((g) => g.id)), sweep, domains: BRAIN_DOMAINS };
}

/** contexts the reference functions are swept under (a known platform offset — Reaction needs one) */
const REF_CTXS: readonly BrainRefContext[] = [
  { platformOffsetMs: 57.6, offsetKnown: true },
  { age: 25, platformOffsetMs: 57.6, offsetKnown: true },
  { age: 72, platformOffsetMs: 69.8, offsetKnown: true }
];

function referenceContract(t: BrainTestDefinition, range: readonly [number, number] | undefined): string[] {
  const p: string[] = [];
  const say = (m: string) => p.push(`${t.id}: ${m}`);
  const ref = t.reference;
  if (!ref) return p;
  if (typeof ref.anchor !== 'string' || !ref.anchor.trim()) {
    say('reference.anchor is empty — the grade badge tooltip must name the anchor sample (§4.2)');
  } else if (!/\b(19|20)\d{2}\b/.test(ref.anchor)) {
    say(`reference.anchor must cite its source with a year (Appendix B "Global"): "${ref.anchor}"`);
  }
  if (typeof ref.z !== 'function') {
    say('reference.z is not a function');
    return p;
  }
  if (!range) {
    say('no SWEEP range — add the plausible range of its primary metric to SWEEP in scripts/brain-checks/core.ts');
    return p;
  }
  const [lo, hi] = range;
  const primary = t.primaryMetric;
  const others = [...t.metrics.filter((m) => m.id !== primary).map((m) => m.id), 'unrelated'];
  sweep: for (const ctx of REF_CTXS) {
    let prev = -Infinity;
    const zs: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = lo + ((hi - lo) * i) / 40;
      let z1 = NaN;
      let z2 = NaN;
      try {
        // frozen inputs: a reference that writes to its arguments throws here
        z1 = ref.z(Object.freeze({ [primary]: x }), Object.freeze({ ...ctx }));
        z2 = ref.z({ [primary]: x }, { ...ctx });
      } catch (e) {
        say(`reference.z threw at ${primary} = ${x} — it must be pure and only read its inputs (${e instanceof Error ? e.message : e})`);
        break sweep;
      }
      if (!Number.isFinite(z1)) {
        say(`reference.z is not finite at ${primary} = ${x} (ctx ${JSON.stringify(ctx)})`);
        break sweep;
      }
      if (!Object.is(z1, z2)) {
        say(`reference.z is not pure: ${z1} then ${z2} for the same ${primary} = ${x}`);
        break sweep;
      }
      if (!(z1 > prev)) {
        say(`reference.z is not strictly increasing in ${primary} (${prev} → ${z1} at ${x})`);
        break sweep;
      }
      prev = z1;
      zs.push(z1);
      if (i % 8 === 0) {
        for (const junk of [0, 1e6, -3]) {
          const noisy = { ...Object.fromEntries(others.map((k) => [k, junk])), [primary]: x };
          let z3 = NaN;
          try {
            z3 = ref.z(noisy, { ...ctx });
          } catch {
            /* reported just below */
          }
          if (!Object.is(z3, z1)) {
            say(`reference.z reads a metric other than the primary "${primary}" (refZOfValue and the Mean's baseline-in-z rely on it reading only the primary)`);
            break sweep;
          }
        }
      }
    }
    if (!(zs[0] < 0 && zs[zs.length - 1] > 0)) {
      say(
        `the anchor mean falls outside the plausible range ${lo}…${hi} of ${primary}: z runs ${zs[0]?.toFixed(2)} … ${zs[zs.length - 1]?.toFixed(2)} — a unit mismatch? (ctx ${JSON.stringify(ctx)})`
      );
      break;
    }
  }
  return p;
}

function testContract(t: BrainTestDefinition, env: ContractEnv): string[] {
  const p: string[] = [];
  const say = (m: string) => p.push(`${t.id}: ${m}`);
  if (typeof t.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id)) say('id is not kebab-case');
  if (env.gameIds.has(t.id)) say('id collides with a game id (benchmarks and games never share an id)');
  const exp = env.table.get(t.domain);
  if (!env.domains.some((d) => d.id === t.domain) || !exp) {
    say(`unknown domain "${t.domain}"`);
    return p;
  }
  if (!(Number.isFinite(t.durationSec) && t.durationSec >= 60 && t.durationSec <= 240)) say(`durationSec ${t.durationSec} outside 60–240`);
  for (const k of ['name', 'paradigm', 'tagline'] as const) if (typeof t[k] !== 'string' || !t[k].trim()) say(`${k} is empty`);
  if (!Array.isArray(t.instructions) || t.instructions.length < 2 || t.instructions.length > 4) say('instructions must be 2–4 lines');
  if (!Array.isArray(t.skills) || t.skills.length < 2 || t.skills.length > 4) say('skills must be 2–4 chips');
  const isComponent = (c: unknown) => typeof c === 'function' || (!!c && typeof c === 'object' && '$$typeof' in c);
  if (!isComponent(t.component)) say('component is not a React component');
  if (!isComponent(t.Demo)) say('Demo is not a React component');

  // metrics
  const ids = (t.metrics ?? []).map((m) => m.id);
  if (new Set(ids).size !== ids.length) say('duplicate metric id');
  for (const m of t.metrics ?? []) if (m.better !== 'higher' && m.better !== 'lower') say(`metric ${m.id}: better must be 'higher' or 'lower'`);
  const primary = (t.metrics ?? []).find((m) => m.id === t.primaryMetric);
  if (!primary) say(`primaryMetric "${t.primaryMetric}" is not a declared metric`);
  else if (primary.better !== 'higher') {
    say(`primary metric "${primary.id}" must be better: 'higher' (every MVP primary metric is oriented so higher is better)`);
  }

  // §2.12 protocol parameters
  if (t.runIn !== exp.runIn) say(`runIn ${t.runIn}, §2.12 says R = ${exp.runIn}`);
  if (t.perWeek !== exp.perWeek) say(`perWeek ${t.perWeek}, §2.12/§2.10 cadence is ${exp.perWeek}×/week`);
  if (t.interruption !== exp.interruption) say(`interruption class ${t.interruption}, §2.12/C5 says ${exp.interruption}`);
  if (t.practiceProne !== exp.practiceProne) say(`practiceProne ${t.practiceProne}, §2.12/§2.6 says ${exp.practiceProne}`);
  if (t.stateSensitive !== exp.stateSensitive) say(`stateSensitive ${t.stateSensitive}, §2.12/§2.1 says ${exp.stateSensitive}`);

  // σ floor (§2.4, §2.12)
  const nf = (t.noiseFloor ?? {}) as { abs?: unknown; relative?: unknown };
  const kind = 'abs' in nf ? 'abs' : 'relative' in nf ? 'relative' : null;
  const value = kind ? Number(nf[kind]) : NaN;
  const shown = exp.floor.kind === 'relative' ? `${+(exp.floor.value * 100).toFixed(3)}% of B` : `${exp.floor.approx ? '≈' : ''}${exp.floor.value}`;
  if (!kind || !Number.isFinite(value) || value <= 0 || (kind === 'relative' && value >= 1)) {
    say(`noiseFloor must be a positive { abs } or a { relative } fraction in (0, 1), got ${JSON.stringify(t.noiseFloor)}`);
  } else if (
    kind !== exp.floor.kind ||
    Math.abs(value - exp.floor.value) > (exp.floor.approx ? 0.25 * exp.floor.value : 1e-9)
  ) {
    say(`noiseFloor ${JSON.stringify(t.noiseFloor)}, §2.12 σ floor is ${shown}`);
  }

  // reference grade (§2.2): the MVP has grade C or P only
  const grade = t.reference ? t.reference.grade : 'P';
  if (grade !== exp.grade) say(`reference grade ${grade}, §2.2/§2.12 says ${exp.grade}${exp.grade === 'P' ? ' (reference must be null)' : ''}`);
  if (t.reference) p.push(...referenceContract(t, env.sweep[t.id]));

  // science block
  const refs = t.science?.references;
  if (!Array.isArray(refs) || refs.length < 2) say('needs at least 2 peer-reviewed references');
  else {
    for (const r of refs) {
      if (!r || typeof r.label !== 'string' || !r.label.trim()) say('a reference has no label');
      if (!r || typeof r.url !== 'string' || !/^https:\/\/\S+$/.test(r.url)) say(`a reference URL is not https: ${r?.url}`);
    }
  }
  if (!Array.isArray(t.science?.deviations) || !t.science.deviations.every((d) => typeof d === 'string')) {
    say('science.deviations must be an array of strings (one line per deviation, [] for none)');
  }
  for (const k of ['summary', 'scoring'] as const) if (typeof t.science?.[k] !== 'string' || !t.science[k].trim()) say(`science.${k} is empty`);
  for (const k of ['protocolVersion', 'scoringVersion', 'referenceVersion'] as const) {
    if (!Number.isInteger(t[k]) || t[k] < 1) say(`${k} must be an integer ≥ 1 (got ${t[k]})`);
  }
  return p;
}

/**
 * Every rule a benchmark definition must satisfy. Returns the problems
 * found (empty = clean). Runs on any tests array: the live BRAIN_TESTS in the
 * gate, and stub registries to prove each rule fires.
 */
export function registryContract(tests: readonly BrainTestDefinition[], env: ContractEnv): string[] {
  const p: string[] = [];
  const ids = tests.map((t) => t.id);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) p.push(`duplicate test id: ${dup.join(', ')}`);
  const missing = env.domains.filter((d) => !tests.some((t) => t.domain === d.id)).map((d) => d.id);
  if (missing.length) {
    p.push(`${missing.length} area(s) have no benchmark: ${missing.join(', ')} — every area needs one, listed in src/platform/brain/registry.ts`);
  }
  const rank = new Map(env.order.map((d, i) => [d, i]));
  for (let i = 1; i < tests.length; i++) {
    const a = rank.get(tests[i - 1].domain) ?? -1;
    const b = rank.get(tests[i].domain) ?? -1;
    if (b < a) {
      p.push(
        `registry order breaks the canonical C12 session order: ${tests[i].id} (${tests[i].domain}) is listed after ${tests[i - 1].id} (${tests[i - 1].domain}) — expected ${env.order.join(' → ')}`
      );
      break;
    }
  }
  const unregistered = Object.keys(env.sweep).filter((id) => !tests.some((t) => t.id === id));
  if (unregistered.length) p.push(`SWEEP lists ${unregistered.length} test(s) the registry does not have: ${unregistered.join(', ')}`);
  for (const t of tests) if (env.sweep[t.id] && !t.reference) p.push(`${t.id}: SWEEP has a range for it, but it has no reference (grade P)`);
  for (const t of tests) p.push(...testContract(t, env));
  return p;
}

/** the area rules (BRAIN_DOMAINS), as a function so broken copies can be shown to it */
export function areaContract(domains: readonly BrainDomain[], gameIds: ReadonlySet<string>, tableAreas: ReadonlySet<string>): string[] {
  const p: string[] = [];
  const ids = domains.map((d) => d.id);
  if (new Set(ids).size !== ids.length) p.push('duplicate area id');
  const got = [...ids].sort().join(', ');
  const want = [...tableAreas].sort().join(', ');
  if (got !== want) p.push(`BRAIN_DOMAINS (${got}) must be exactly the areas of the §2.12 table (${want})`);
  const slots = domains.map((d) => d.slot);
  if (new Set(slots).size !== slots.length) p.push(`two areas share a colour slot (${slots.join(', ')})`);
  for (const d of domains) {
    const say = (m: string) => p.push(`area ${d.id}: ${m}`);
    for (const k of ['name', 'short', 'subtitle', 'about', 'practice'] as const) if (typeof d[k] !== 'string' || !d[k].trim()) say(`${k} is empty`);
    if (!Number.isInteger(d.slot) || d.slot < 1 || d.slot > 16 || d.slot === 9 || d.slot === 14) {
      say(`slot ${d.slot} must be in 1–16 and never 9 (white) or 14 (the charts' grey "Other")`);
    }
    const seen = new Set<string>();
    for (const l of d.training) {
      if (!gameIds.has(l.gameId)) say(`training shortcut "${l.gameId}" is not a game in the registry`);
      if (seen.has(l.gameId)) say(`training shortcut "${l.gameId}" is listed twice`);
      seen.add(l.gameId);
      if (typeof l.why !== 'string' || !l.why.trim()) say(`training shortcut "${l.gameId}" has no "why" line`);
    }
  }
  const reaction = domains.find((d) => d.id === 'reaction');
  if (reaction?.training.length) {
    p.push(`area reaction lists training games (${reaction.training.map((l) => l.gameId).join(', ')}) — by design none trains alertness (SCIENCE.md §3.4)`);
  }
  return p;
}

/* ====================================================================== */
/* synthetic fixtures                                                      */
/* ====================================================================== */

const Nothing = (): null => null;

const DEVICE_A: BrainDevice = {
  key: 'touch|390x844@3|ios',
  input: 'touch',
  platform: 'ios-safari',
  ua: 'validate',
  screen: '390x844',
  dpr: 3,
  frameMs: 16.7,
  standalone: true
};
const DEVICE_B: BrainDevice = { ...DEVICE_A, key: 'mouse|1080x1920@1|windows', input: 'mouse', platform: 'windows-chrome', screen: '1080x1920', dpr: 1 };
const CTX: BrainRefContext = { platformOffsetMs: 57.6, offsetKnown: true };

/** LOCAL wall-clock time; day 0 is Monday 5 January 2026, the first day of an ISO week */
const at = (day: number, hour = 12, minute = 0): number => new Date(2026, 0, 5 + day, hour, minute).getTime();

const STUB_REF = (mu: number, sigma: number): BrainReferenceAnchor => ({
  grade: 'C',
  anchor: 'Synthetic adults on synthetic phones (Validate et al. 2026).',
  z: (m) => zFrom(m.x, mu, sigma)
});

/** a benchmark definition with no paradigm behind it: primary metric `x`, z = (x − 50)/10 */
function stubTest(domain: BrainDomainId, over: Partial<BrainTestDefinition> = {}): BrainTestDefinition {
  return {
    id: `stub-${domain}`,
    domain,
    name: `Stub ${domain}`,
    paradigm: 'Validate stub (no paradigm)',
    tagline: 'A validate stub.',
    instructions: ['Stub line one.', 'Stub line two.'],
    skills: ['Stub', 'Validate'],
    durationSec: 90,
    Demo: Nothing,
    component: Nothing,
    icon: null,
    metrics: [
      { id: 'x', label: 'Primary', better: 'higher' },
      { id: 'aux', label: 'Secondary', better: 'lower' }
    ],
    primaryMetric: 'x',
    reference: STUB_REF(50, 10),
    runIn: 1,
    noiseFloor: { abs: 2 },
    practiceProne: false,
    stateSensitive: true,
    interruption: 'A',
    perWeek: 2,
    protocolVersion: 1,
    scoringVersion: 1,
    referenceVersion: 1,
    science: {
      summary: 'Stub.',
      scoring: 'Stub.',
      deviations: [],
      references: [
        { label: 'Validate A (2020)', url: 'https://doi.org/10.0000/validate-a' },
        { label: 'Validate B (2021)', url: 'https://doi.org/10.0000/validate-b' }
      ]
    },
    ...over
  };
}

/** one stub per area, in the canonical order, with the §2.12 parameters — a registry that must pass */
function stubRegistry(): BrainTestDefinition[] {
  const doc = dossier();
  return doc.order.flatMap((domain) => {
    const e = doc.table.get(domain);
    if (!e) return [];
    return [
      stubTest(domain, {
        runIn: e.runIn as 1 | 2 | 3,
        perWeek: e.perWeek as 1 | 2 | 7,
        interruption: e.interruption as 'A' | 'B',
        practiceProne: e.practiceProne,
        stateSensitive: e.stateSensitive,
        noiseFloor: e.floor.kind === 'abs' ? { abs: e.floor.value } : { relative: e.floor.value },
        reference: e.grade === 'P' ? null : STUB_REF(50, 10)
      })
    ];
  });
}

let seq = 0;

/** one recorded run (a valid scored-looking session unless `over` says otherwise) */
function sess(test: BrainTestDefinition, time: number, x: number, over: Partial<BrainSession> = {}): BrainSession {
  seq++;
  return {
    id: `run-${seq}`,
    testId: test.id,
    domain: test.domain,
    finishedAt: time,
    date: dayKey(time),
    tzOffset: -new Date(time).getTimezoneOffset(),
    durationSec: 90,
    seed: seq,
    metrics: { [test.primaryMetric]: x },
    refZ: null,
    protocolVersion: test.protocolVersion,
    scoringVersion: test.scoringVersion,
    referenceVersion: test.referenceVersion,
    valid: true,
    runType: 'tracking',
    device: DEVICE_A,
    ctx: CTX,
    theme: 'black',
    ...over
  };
}

const storeOf = (sessions: BrainSession[], extra: Partial<BrainStore> = {}): BrainStore => ({
  ...S.emptyBrainStore(),
  sessions,
  ...extra
});

/** run `fn` against an in-memory localStorage (restoring whatever was there before) */
function withMemoryStorage<T>(fn: (mem: Map<string, string>) => T): T {
  const g = globalThis as { localStorage?: unknown };
  // the descriptor, not the value: never invoke a host getter just to put it back
  const prev = Object.getOwnPropertyDescriptor(g, 'localStorage');
  const mem = new Map<string, string>();
  const shim = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    }
  };
  Object.defineProperty(g, 'localStorage', { value: shim, configurable: true, writable: true });
  try {
    return fn(mem);
  } finally {
    if (prev) Object.defineProperty(g, 'localStorage', prev);
    else delete g.localStorage;
  }
}

const show = (v: unknown) => JSON.stringify(v);

/* ====================================================================== */
/* the checks                                                              */
/* ====================================================================== */

function checkDossier({ bad }: Ctx): string {
  const doc = dossier();
  for (const e of doc.errors) bad(e);
  // the dossier must not contradict itself on the grades it fixes twice
  for (const [id, e] of doc.table) {
    const g = doc.grades.get(id);
    if (g !== e.grade) bad(`SCIENCE.md contradicts itself: §2.2 gives ${id} grade ${g ?? '—'}, the §2.12 table grade ${e.grade}`);
  }
  return `§2.12 table (${doc.table.size} areas), C12 order, §2.2 grades, §2.8 SSS/stress, §3.1/§4.2 copy and §1.10 offsets parsed`;
}

function checkAreas({ bad }: Ctx): string {
  const gameIds = new Set(GAMES.map((g) => g.id));
  const tableAreas = new Set<string>(dossier().table.keys());
  for (const m of areaContract(BRAIN_DOMAINS, gameIds, tableAreas)) bad(m);

  // the rules fire on broken copies
  const edit = (id: BrainDomainId, patch: Partial<BrainDomain>) => BRAIN_DOMAINS.map((d) => (d.id === id ? { ...d, ...patch } : d));
  const attention = BRAIN_DOMAINS.find((d) => d.id === 'attention');
  const cases: [string, BrainDomain[], RegExp][] = [
    ['unknown game', edit('memory', { training: [{ gameId: 'no-such-game', why: 'x', paradigm: 'x', evidence: 'x', sources: [REF.simons2016] }] }), /not a game/],
    ['slot 9', edit('memory', { slot: 9 }), /never 9/],
    ['slot 14', edit('memory', { slot: 14 }), /never 9/],
    ['slot 0', edit('memory', { slot: 0 }), /1–16/],
    ['shared slot', edit('memory', { slot: attention?.slot ?? 1 }), /share a colour/],
    ['reaction trained', edit('reaction', { training: [{ gameId: GAMES[0].id, why: 'x', paradigm: 'x', evidence: 'x', sources: [REF.simons2016] }] }), /none trains alertness/],
    ['duplicate shortcut', edit('calculation', { training: [{ gameId: GAMES[0].id, why: 'x', paradigm: 'x', evidence: 'x', sources: [REF.simons2016] }, { gameId: GAMES[0].id, why: 'y', paradigm: 'y', evidence: 'y', sources: [REF.simons2016] }] }), /listed twice/],
    ['missing area', BRAIN_DOMAINS.filter((d) => d.id !== 'spatial'), /must be exactly the areas/]
  ];
  for (const [name, broken, want] of cases) {
    const got = areaContract(broken, gameIds, tableAreas);
    if (!got.some((m) => want.test(m))) bad(`the area rules miss a broken BRAIN_DOMAINS (${name}): ${got.join(' | ') || 'no problem found'}`);
  }
  const links = BRAIN_DOMAINS.reduce((n, d) => n + d.training.length, 0);
  return `${BRAIN_DOMAINS.length} areas = the §2.12 set, distinct slots (1–16, never 9/14), ${links} training shortcuts all real games, Reaction untrained by design; the rules catch ${cases.length} broken copies`;
}

function checkContractSelfTest({ bad }: Ctx): string {
  const stubs = stubRegistry();
  const sweep = Object.fromEntries(stubs.filter((t) => t.reference).map((t) => [t.id, [0, 100] as const]));
  const env = contractEnv(sweep);
  const clean = registryContract(stubs, env);
  if (clean.length) bad(`a stub registry built from §2.12 must pass the contract, got: ${clean.join(' | ')}`);

  const edit = (domain: BrainDomainId, patch: (t: BrainTestDefinition) => Partial<BrainTestDefinition>) =>
    stubs.map((t) => (t.domain === domain ? { ...t, ...patch(t) } : t));
  const withZ = (z: BrainReferenceAnchor['z']) => (t: BrainTestDefinition) => ({ reference: { ...(t.reference ?? STUB_REF(50, 10)), z } });
  let calls = 0;
  const cases: [string, BrainTestDefinition[], RegExp, ContractEnv?][] = [
    ['duplicate id', stubs.map((t, i) => (i === 1 ? { ...t, id: stubs[0].id } : t)), /duplicate test id/],
    ['game id collision', edit('reaction', () => ({ id: GAMES[0].id })), /collides with a game id/],
    ['area without a benchmark', stubs.filter((t) => t.domain !== 'memory'), /no benchmark: memory/],
    ['registry out of C12 order', [stubs[1], stubs[0], ...stubs.slice(2)], /C12/],
    ['unknown domain', edit('spatial', () => ({ domain: 'luck' as BrainDomainId })), /unknown domain/],
    ['run shorter than 60 s', edit('attention', () => ({ durationSec: 30 })), /durationSec/],
    ['run longer than 240 s', edit('attention', () => ({ durationSec: 300 })), /durationSec/],
    [
      'primary metric lower-is-better',
      edit('reaction', (t) => ({ metrics: t.metrics.map((m) => (m.id === t.primaryMetric ? { ...m, better: 'lower' as const } : m)) })),
      /better: 'higher'/
    ],
    ['primary metric undeclared', edit('reaction', () => ({ primaryMetric: 'nope' })), /not a declared metric/],
    ['wrong run-in', edit('reaction', () => ({ runIn: 3 })), /runIn/],
    ['wrong cadence', edit('reaction', () => ({ perWeek: 2 })), /perWeek/],
    ['wrong interruption class', edit('memory', () => ({ interruption: 'A' })), /interruption class/],
    ['practice-prone flipped', edit('speed', (t) => ({ practiceProne: !t.practiceProne })), /practiceProne/],
    ['state-sensitive flipped', edit('analysis', (t) => ({ stateSensitive: !t.stateSensitive })), /stateSensitive/],
    ['grade P given a reference', edit('flexibility', () => ({ reference: STUB_REF(50, 10) })), /grade C, .*says P/],
    ['grade C without a reference', edit('attention', () => ({ reference: null })), /grade P, .*says C/],
    ['σ floor value', edit('attention', () => ({ noiseFloor: { abs: 3 } })), /noiseFloor/],
    ['σ floor kind', edit('precision', () => ({ noiseFloor: { abs: 0.03 } })), /noiseFloor/],
    ['σ floor zero', edit('memory', () => ({ noiseFloor: { abs: 0 } })), /noiseFloor/],
    ['z decreasing', edit('attention', withZ((m) => zFrom(m.x, 50, 10, 'lower'))), /strictly increasing/],
    ['z impure', edit('attention', withZ((m) => zFrom(m.x, 50, 10) + (calls++ % 2) * 1e-3)), /not pure/],
    [
      'z writes to its input',
      edit(
        'attention',
        withZ((m) => {
          (m as Record<string, number>).x = 0;
          return 0;
        })
      ),
      /threw/
    ],
    ['z not finite', edit('attention', withZ((m) => (m.x === 50 ? NaN : zFrom(m.x, 50, 10)))), /not finite/],
    ['z reads another metric', edit('attention', withZ((m) => zFrom(m.x, 50, 10) + (m.aux ?? 0) * 1e-3)), /other than the primary/],
    ['anchor in other units', edit('attention', withZ((m) => zFrom(m.x, 5000, 10))), /outside the plausible range/],
    ['anchor without a citation', edit('attention', (t) => ({ reference: { ...(t.reference ?? STUB_REF(50, 10)), anchor: 'Some adults.' } })), /cite its source/],
    ['one reference', edit('memory', (t) => ({ science: { ...t.science, references: t.science.references.slice(0, 1) } })), /at least 2/],
    [
      'http reference',
      edit('memory', (t) => ({ science: { ...t.science, references: [t.science.references[0], { label: 'X (2020)', url: 'http://example.org/x' }] } })),
      /not https/
    ],
    ['deviations not a list', edit('memory', (t) => ({ science: { ...t.science, deviations: 'none' as unknown as string[] } })), /deviations/],
    ['version 0', edit('memory', () => ({ protocolVersion: 0 })), /protocolVersion/],
    ['no SWEEP range', stubs, /no SWEEP range/, { ...env, sweep: Object.fromEntries(Object.entries(sweep).filter(([id]) => id !== 'stub-attention')) }],
    ['SWEEP for a test that is not registered', stubs, /SWEEP lists 1 test/, { ...env, sweep: { ...sweep, 'ghost-test': [0, 1] } }]
  ];
  for (const [name, broken, want, e] of cases) {
    const got = registryContract(broken, e ?? env);
    if (!got.some((m) => want.test(m))) bad(`the registry contract misses a broken definition (${name}): ${got.join(' | ') || 'no problem found'}`);
  }
  return `a §2.12 stub registry passes the contract, and it catches all ${cases.length} deliberately broken definitions`;
}

function checkLiveRegistry({ bad }: Ctx): string {
  const env = contractEnv();
  for (const m of registryContract(BRAIN_TESTS, env)) bad(m);
  for (const d of BRAIN_DOMAINS) {
    const first = BRAIN_TESTS.find((t) => t.domain === d.id);
    if (benchmarkFor(d.id) !== first) bad(`benchmarkFor('${d.id}') is not the first test registered for the area`);
  }
  const referenced = BRAIN_TESTS.filter((t) => t.reference).length;
  return `${BRAIN_TESTS.length} benchmarks: one per area in the C12 order, §2.12 parameters exact, ${referenced} reference anchors pure/finite/increasing over SWEEP and reading only the primary metric, citations in place`;
}

function checkIsolation({ bad }: Ctx): string {
  const gameIds = new Set(GAMES.map((g) => g.id));
  for (const t of BRAIN_TESTS) {
    if (gameIds.has(t.id)) bad(`benchmark ${t.id} shares an id with a game`);
    if ((GAMES as unknown[]).includes(t)) bad(`benchmark ${t.id} is registered in GAMES — benchmarks never enter the game registry`);
  }
  for (const g of GAMES as unknown as Record<string, unknown>[]) {
    if ('primaryMetric' in g || 'protocolVersion' in g || 'noiseFloor' in g) bad(`GAMES entry "${g.id}" looks like a benchmark definition`);
  }
  const rule: ScanRule[] = [{ name: 'imports Brain Lab code', re: IMPORTS_BRAIN }];
  const planted = [
    "import { arrowSquared } from '../brain/arrow-squared';",
    "const m = await import('./brain/registry');",
    "import '../brain/x';"
  ];
  for (const s of planted) if (!sampleHits(s, rule).length) bad(`the import scan misses a planted line: ${s}`);
  for (const s of ["// see ../brain/registry for the tests\nimport { sudoku } from '../games/sudoku';"]) {
    if (sampleHits(s, rule).length) bad(`the import scan flags an allowed line: ${s}`);
  }
  for (const h of scanFiles(['src/platform/registry.ts'], rule)) {
    bad(`${h.file}:${h.line} imports Brain Lab code — the game registry must never depend on benchmarks: ${h.text}`);
  }
  return `no benchmark in GAMES (by id, identity or shape); src/platform/registry.ts imports nothing from Brain Lab (scan proven on ${planted.length} planted lines)`;
}

/**
 * A MAPPING onto percentiles or an IQ-like scale — not the word: copy that
 * says what an index is NOT ("not a percentile") and statistics of a run's own
 * data ("95th percentile frame interval") are honest and stay allowed.
 */
const PERSONAL_PERCENTILE = /\bown\s+\d{1,2}(?:st|nd|rd|th)\s+percentile|personal[\s-]?percentile/i;
/** a negation shortly before a match, in the same clause ("not an IQ score", "never a normal-CDF percentile") */
const NEGATED = /(?:\b(?:not|no|never|nor|without)\b|n['’]t\b)[^.;!?]{0,40}$/i;
const negated = (_line: string, before: string) => NEGATED.test(before);
const PERCENTILE_RULES: ScanRule[] = [
  { name: 'normal CDF', re: /\bnorm(?:al)?[\s_-]?cdf/i, allow: negated },
  { name: 'error function', re: /\berfc?\s*\(/ },
  { name: 'CDF call', re: /\bcdf\(/i, allow: negated },
  { name: 'Φ', re: /Φ/, allow: negated },
  // a function that turns a score into a percentile (a run's own statistics use timing.ts quantile);
  // the one sanctioned percentile is Reaction's PERSONAL flag ("lapses above your own 90th percentile", §1.10)
  { name: 'percentile function', re: /\b\w*percentile\w*\(/i, allow: (line) => PERSONAL_PERCENTILE.test(line) },
  {
    name: 'population ranking',
    re: /better than\s+(?:\$\{[^}]*\}|\d+)\s*%|\btop\s+(?:\$\{[^}]*\}|\d+)\s*%\s+of\b|\b(?:in|at)\s+the\s+(?:\$\{[^}]*\}|\d+)(?:st|nd|rd|th)?\s+percentile|percentile\s+rank/i,
    allow: (line) => PERSONAL_PERCENTILE.test(line)
  },
  { name: 'IQ-style scale (mean 100, SD 15)', re: /\b100\s*\+\s*15\s*\*|\b15\s*\*\s*z\b/ }
];

function checkIndexScale({ bad }: Ctx): string {
  const cases: [number, number][] = [
    [0, 50],
    [1, 60],
    [-1, 40],
    [0.04, 50],
    [2.5, 75],
    [5, 100],
    [-5, 0],
    [7, 100],
    [-9, 0]
  ];
  for (const [z, want] of cases) if (indexFromZ(z) !== want) bad(`indexFromZ(${z}) = ${indexFromZ(z)}, expected ${want} (50 + 10z, rounded, clamped to [0, 100])`);
  for (const z of [NaN, Infinity, -Infinity]) {
    if (!Number.isNaN(indexFromZ(z))) bad(`indexFromZ(${z}) must be NaN ("no reference"), got ${indexFromZ(z)}`);
  }
  if (zFrom(60, 50, 10) !== 1 || zFrom(40, 50, 10, 'lower') !== 1) bad('zFrom must orient z so that higher is better');
  if (!Number.isNaN(zFrom(5, 5, 0)) || !Number.isNaN(zFrom(NaN, 5, 1))) bad('zFrom must return NaN for σ ≤ 0 or a non-finite value');

  const planted = [
    'export const toIndex = (z: number) => Math.round(100 * normCdf(z));',
    'const p = 0.5 * (1 + erf(z / Math.SQRT2));',
    'const label = `Better than ${pct}% of people`;',
    'const pct = zToPercentile(z);',
    'const line = `You are in the ${p}th percentile`;',
    'const iq = 100 + 15 * z;'
  ];
  const allowed = [
    '// a percentile here would be wrong (comment)\nconst q = quantile(rts, 0.9);',
    "const flag = 'More lapses than your own 90th percentile';",
    "const note = 'It is not a percentile and not an IQ score.';",
    "const d = 'stored as frames, median, 95th percentile (p95), maximum';",
    "const s = 'The index is 50 + 10z, never a normal-CDF percentile.';"
  ];
  for (const s of planted) if (!sampleHits(s, PERCENTILE_RULES).length) bad(`the percentile scan misses a planted line: ${s}`);
  for (const s of allowed) if (sampleHits(s, PERCENTILE_RULES).length) bad(`the percentile scan flags an allowed line: ${s}`);
  const files = brainFiles();
  for (const h of scanFiles(files, PERCENTILE_RULES)) {
    bad(`${h.file}:${h.line}: ${h.rule} — every index is 50 + 10z (indexFromZ), never a normal-CDF/percentile mapping (SCIENCE.md §2.2, §4.1): ${h.text}`);
  }
  return `indexFromZ is 50 + 10z clamped to [0, 100] and NaN-safe; no normal-CDF / percentile / IQ-scale mapping in ${files.length} Brain Lab files (scan proven on ${planted.length} planted lines)`;
}

const RANDOM_RULES: ScanRule[] = [{ name: 'Math.random', re: /\bMath\s*\.\s*random\b|\bMath\s*\[\s*['"`]random['"`]\s*\]/ }];
const CRYPTO_RULE: ScanRule = { name: 'unseeded crypto randomness', re: /\bgetRandomValues\b|\brandomUUID\b/ };
/** the only two places the module may draw unseeded randomness: a fresh run seed, and record ids */
const SANCTIONED_RANDOM: Record<string, string> = {
  'src/platform/brain/timing.ts': 'freshSeed',
  'src/platform/brain/store.ts': 'newBrainId'
};

function checkSeeded({ bad }: Ctx): string {
  // the scan proves itself first
  const planted = "const r = Math.random();\n// Math.random() in a comment\nconst pickOne = Math['random'];\n";
  const hits = sampleHits(planted, RANDOM_RULES).map((h) => h.line);
  if (hits.join() !== '1,3') bad(`the Math.random scan should flag lines 1 and 3 of the planted sample, flagged [${hits.join(', ')}]`);
  if (!sampleHits('crypto.getRandomValues(buf);', [CRYPTO_RULE]).length) bad('the crypto scan misses a planted getRandomValues');
  const fake = 'export function freshSeed() {\n  return Math.random();\n}\nexport function other() {\n  return Math.random();\n}\n';
  const span = declLines(fake, 'fake.ts', 'freshSeed');
  const exempt = sampleHits(fake, RANDOM_RULES).filter((h) => span && h.line >= span[0] && h.line <= span[1]);
  if (exempt.length !== 1 || exempt[0].line !== 2) bad('the sanctioned-site rule must exempt freshSeed only, never a neighbouring function');

  let sites = 0;
  for (const h of scanFiles(codeFiles('src/brain'), [...RANDOM_RULES, CRYPTO_RULE])) {
    bad(`${h.file}:${h.line}: ${h.rule} in benchmark code — ALL generation derives from the run's seed via rng() (SCIENCE.md C8): ${h.text}`);
  }
  for (const h of scanFiles(codeFiles('src/platform/brain'), RANDOM_RULES)) {
    const fn = SANCTIONED_RANDOM[h.file];
    const lines = fn ? declLines(readRepo(h.file), h.file, fn) : null;
    if (lines && h.line >= lines[0] && h.line <= lines[1]) {
      sites++;
      continue;
    }
    bad(`${h.file}:${h.line}: Math.random outside the two sanctioned sites (timing.ts freshSeed, store.ts newBrainId): ${h.text}`);
  }
  return `no Math.random/crypto randomness under src/brain/ (${codeFiles('src/brain').length} files); src/platform/brain/ draws only at its ${sites} sanctioned site(s) — scan proven on planted lines`;
}

/**
 * SCIENCE.md Appendix E mirrors every benchmark's `science.deviations`, so
 * the rulebook states what ships. A deviation edited in a definition but not
 * in the appendix (or the reverse) fails here — the two change together.
 */
export function appendixEProblems(text: string, tests: readonly { id: string; science: { deviations: readonly string[] } }[]): string[] {
  const problems: string[] = [];
  const start = text.indexOf('## Appendix E:');
  if (start < 0) return ['SCIENCE.md has no "## Appendix E:" (deviations as built)'];
  const body = text.slice(start);
  const norm = (x: string) => x.replace(/\s+/g, ' ').trim();
  for (const t of tests) {
    const head = body.indexOf('`' + t.id + '`, protocol v');
    if (head < 0) {
      problems.push(`Appendix E has no section for ${t.id}`);
      continue;
    }
    const from = body.indexOf('\n', head) + 1;
    const next = body.slice(from).search(/\n#{2,3} /);
    const block = next < 0 ? body.slice(from) : body.slice(from, from + next);
    const listed = block.split('\n').filter((l) => l.startsWith('- ')).map((l) => norm(l.slice(2)));
    const defined = t.science.deviations.map(norm);
    if (listed.join('\u0000') !== defined.join('\u0000'))
      problems.push(`Appendix E's ${t.id} list (${listed.length}) differs from its definition's science.deviations (${defined.length}) — regenerate it from the definition`);
  }
  return problems;
}
function checkAppendixE({ bad }: Ctx): string {
  // proves itself on a planted copy: one dropped line must be caught
  const sample = '## Appendix E: x\n\n### A — `t1`, protocol v1\n\n- one\n- two\n';
  if (appendixEProblems(sample, [{ id: 't1', science: { deviations: ['one', 'two'] } }]).length) bad('Appendix E parser rejects a matching sample');
  if (!appendixEProblems(sample, [{ id: 't1', science: { deviations: ['one', 'two', 'three'] } }]).length) bad('Appendix E parser misses a dropped line');
  for (const p of appendixEProblems(readRepo('src/platform/brain/SCIENCE.md'), BRAIN_TESTS)) bad(p);
  return `SCIENCE.md Appendix E lists exactly the ${BRAIN_TESTS.reduce((n, t) => n + t.science.deviations.length, 0)} deviations of the ${BRAIN_TESTS.length} definitions (check proven on a planted copy)`;
}

/**
 * The results chime is the RUNNER's (GAME-QUALITY Q33): it plays
 * sfx.complete() as the results card opens, so a benchmark's own block end
 * plays the neutral lock only — five tests once chimed too, doubling it.
 * Demos are silent loops and never reach a results card, so only the live
 * test code is scanned.
 */
const CHIME_RULE: ScanRule = { name: 'results chime', re: /\bsfx\s*\.\s*complete\s*\(/ };
function checkChime({ bad }: Ctx): string {
  if (!sampleHits('sfx.place();\nsfx.complete();\n// sfx.complete() in a comment\n', [CHIME_RULE]).map((h) => h.line).includes(2))
    bad('the chime scan misses a planted sfx.complete()');
  const files = codeFiles('src/brain').filter((f) => !/Demo\.tsx$/.test(f));
  for (const h of scanFiles(files, [CHIME_RULE])) bad(`${h.file}:${h.line}: sfx.complete() in a benchmark — the runner plays the results chime; end a block with sfx.place(): ${h.text}`);
  return `no benchmark plays the runner's results chime (${files.length} files; scan proven on a planted line)`;
}

const FORBIDDEN_PHRASES = [
  'IQ score',
  'IQ test',
  'brain age',
  'mental age',
  'cognitive age',
  'intelligence score',
  'Brain score',
  'Brain Index',
  'Brain health score',
  'genius',
  'clinically validated'
];
const PHRASE_RULES: ScanRule[] = FORBIDDEN_PHRASES.map((p) => ({
  name: `"${p}"`,
  re: new RegExp(`\\b${p.replace(/ /g, '\\s+')}`, 'i'),
  // saying what the module is NOT is the honest use — the verbatim disclaimer: "its scores are not IQ scores"
  allow: negated
}));
const KSS_RULES: ScanRule[] = [{ name: 'KSS', re: /\bKSS\b|Karolinska/ }];

function checkClaims({ bad }: Ctx): string {
  const doc = dossier();
  const typographic = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  const same = (label: string, code: string, text: string | undefined, loose = false) => {
    if (text === undefined) return; // reported by the dossier check
    const a = loose ? typographic(code) : code;
    const b = loose ? typographic(text) : text;
    if (a !== b) bad(`${label} differs from SCIENCE.md (verbatim required):\n      code: ${code}\n      doc:  ${text}`);
  };
  same('the disclaimer (BRAIN_DISCLAIMER, §4.2)', BRAIN_DISCLAIMER, doc.disclaimer);
  same('the stress item (STRESS_ITEM, §2.8)', STRESS_ITEM, doc.stress);
  same('the onboarding (BRAIN_ONBOARDING, §3.1)', BRAIN_ONBOARDING, doc.onboarding);
  same('the benchmark-page line (IMPLEMENTATION_NOTE, §4.2)', IMPLEMENTATION_NOTE, doc.implementationNote, true);
  if (doc.trainingCard !== undefined) {
    const tail = doc.trainingCard.replace(/^Practice for <skill>\.\s*/, '');
    same('the training-card footer (TRAINING_NOTE, §4.2)', TRAINING_NOTE, tail, true);
  }
  if (SSS_ITEMS.length !== 7 || SSS_ITEMS.some((s, i) => s !== doc.sss[i])) {
    const i = SSS_ITEMS.findIndex((s, k) => s !== doc.sss[k]);
    bad(`SSS_ITEMS must be the Stanford Sleepiness Scale verbatim (§2.8): item ${i + 1} reads "${SSS_ITEMS[i]}", the dossier "${doc.sss[i]}"`);
  }
  for (const d of BRAIN_DOMAINS) {
    const want = [...doc.subtitles].find(([name]) => domainByName(name) === d.id)?.[1];
    if (want === undefined) bad(`§4.2 lists no honest subtitle for area ${d.name}`);
    else if (d.subtitle !== want) bad(`area ${d.id}: subtitle "${d.subtitle}", §4.2 prescribes "${want}"`);
  }

  // the KSS needs its author's written permission — nowhere in shipped code
  if (!sampleHits("const scale = 'Karolinska Sleepiness Scale';", KSS_RULES).length) bad('the KSS scan misses a planted line');
  if (sampleHits('// the KSS needs written permission\nconst a = 1;', KSS_RULES).length) bad('the KSS scan flags a comment');
  const all = codeFiles('src');
  for (const h of scanFiles(all, KSS_RULES)) bad(`${h.file}:${h.line}: the KSS must not ship without written permission from T. Åkerstedt (SCIENCE.md §2.8): ${h.text}`);

  // claims policy (§4.1) over every surface that renders Brain Lab copy
  const planted = ['<h2>Your Brain Score</h2>', "const tag = 'Find your mental age';", 'title: `IQ test`', "'a genius move'"];
  for (const s of planted) if (!sampleHits(s, PHRASE_RULES).length) bad(`the claims scan misses a planted line: ${s}`);
  const honest = "const d = 'its scores are not IQ scores.';\nconst e = 'No IQ, no brain age, no “brain score”.';\n// brain age, genius (a comment)";
  if (sampleHits(honest, PHRASE_RULES).length) bad('the claims scan flags the disclaimer, an honest negation or a comment');
  const ui = brainUiFiles();
  for (const h of scanFiles(ui, PHRASE_RULES)) bad(`${h.file}:${h.line}: ${h.rule} breaks the claims policy (SCIENCE.md §4.1): ${h.text}`);
  return `disclaimer, SSS (7 items), stress item, onboarding, benchmark-page and training lines verbatim; 9 honest subtitles; no KSS in ${all.length} source files; no forbidden claim in ${ui.length} Brain Lab files (scans proven on planted lines)`;
}

/** problems with ResponseButton's input path (a function, so a broken copy can be shown to it) */
function responseButtonProblems(code: string): string[] {
  const start = code.indexOf('export function ResponseButton');
  if (start < 0) return ['fx.tsx no longer exports ResponseButton'];
  const next = code.indexOf('\nexport ', start + 10);
  const body = code.slice(start, next < 0 ? undefined : next);
  const block = (marker: string): string | null => {
    const i = body.indexOf(marker);
    if (i < 0) return null;
    let depth = 0;
    for (let k = i + marker.length - 1; k < body.length; k++) {
      if (body[k] === '{') depth++;
      else if (body[k] === '}' && --depth === 0) return body.slice(i, k + 1);
    }
    return null;
  };
  const p: string[] = [];
  const down = block('onPointerDown={');
  if (!down || !/press\.current\(\s*eventTime\(/.test(down)) {
    p.push('ResponseButton must register its press on pointerdown, timestamped with eventTime(event) — click fires on release, ~80–120 ms late on touch (SCIENCE.md C2)');
  }
  const click = block('onClick={');
  if (click && !/\.detail\s*===\s*0/.test(click)) {
    p.push('ResponseButton onClick may only serve keyboard activation (event.detail === 0) — a pointer press already fired on pointerdown');
  }
  return p;
}

function checkMotion({ bad }: Ctx): string {
  const css = readRepo('src/platform/design/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const durs = (block: string) => new Map([...block.matchAll(/--dur-([a-z-]+)\s*:\s*(\d+(?:\.\d+)?)ms/g)].map((m) => [m[1], Number(m[2])]));
  let base: Map<string, number> | null = null;
  let reduced: Map<string, number> | null = null;
  for (const m of css.matchAll(/(@media[^{]*\{\s*)?:root\s*\{([^}]*)\}/g)) {
    if (!m[2].includes('--dur-')) continue;
    if (m[1] && /prefers-reduced-motion/.test(m[1])) reduced ??= durs(m[2]);
    else if (!m[1]) base ??= durs(m[2]);
  }
  const want = new Map(Object.entries(DUR));
  if (!base) bad('design/tokens.css declares no --dur-* motion tokens on :root');
  else {
    const b = base as Map<string, number>;
    if ([...want.keys()].sort().join() !== [...b.keys()].sort().join()) {
      bad(`--dur-* tokens (${[...b.keys()].join(', ')}) and DUR keys (${[...want.keys()].join(', ')}) differ`);
    }
    for (const [k, v] of want) if (b.has(k) && b.get(k) !== v) bad(`--dur-${k} is ${b.get(k)}ms in tokens.css but DUR.${k} is ${v} in motion.ts — the CSS and JS twins must agree`);
  }
  if (!reduced) bad('design/tokens.css has no prefers-reduced-motion override of the --dur-* tokens');
  else {
    const r = reduced as Map<string, number>;
    for (const k of want.keys()) if (!((r.get(k) ?? Infinity) <= 1)) bad(`prefers-reduced-motion must collapse --dur-${k} to ≤ 1ms`);
  }

  const fx = stripComments(readRepo('src/platform/components/fx.tsx'), 'fx.tsx');
  for (const m of responseButtonProblems(fx)) bad(m);
  if (!responseButtonProblems(fx.replace('onPointerDown={', 'onPointerUp={')).length) {
    bad('the ResponseButton check does not catch a press moved off pointerdown');
  }
  if (!responseButtonProblems(fx.replace(/e\.detail\s*===\s*0\s*&&/, '')).length) {
    bad('the ResponseButton check does not catch an onClick that fires for pointer presses');
  }
  return `--dur-* tokens equal DUR (${[...want].map(([k, v]) => `${k} ${v}`).join(', ')}) and collapse under reduced motion; ResponseButton presses on pointerdown with eventTime (check proven on broken copies)`;
}

function checkDevice({ bad }: Ctx): string {
  const doc = dossier();
  const ids: BrainPlatform[] = ['ios-safari', 'ios-chrome', 'android-chrome', 'windows-chrome', 'macos-safari'];
  for (const id of ids) {
    const want = doc.offsets.get(id);
    const got = platformOffset(id);
    if (want === undefined) bad(`SCIENCE.md §1.10 gives no Pronk 2020 offset for ${id}`);
    else if (!got.known || got.ms !== want) bad(`platformOffset('${id}') = ${got.ms} ms (known ${got.known}), §1.10 (Pronk 2020) says ${want} ms`);
  }
  const other = platformOffset('other');
  if (other.known || other.ms !== 60) bad(`an unmeasured platform must get the 60 ms placeholder with known: false, got ${show(other)}`);

  const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
  };
  const cases: [string, number, BrainPlatform][] = [
    [UA.iphone, 5, 'ios-safari'],
    [UA.iphoneChrome, 5, 'ios-chrome'],
    [UA.mac, 5, 'ios-safari'], // iPadOS reports a Mac UA; touch points decide
    [UA.mac, 0, 'macos-safari'],
    [UA.macChrome, 0, 'other'],
    [UA.android, 5, 'android-chrome'],
    [UA.windows, 0, 'windows-chrome'],
    [UA.edge, 0, 'other'],
    [UA.firefox, 0, 'other']
  ];
  for (const [ua, touch, want] of cases) {
    const got = detectPlatform(ua, touch);
    if (got !== want) bad(`detectPlatform(${ua.slice(13, 60)}…, touch ${touch}) = ${got}, expected ${want}`);
  }
  const k = (o: Partial<Parameters<typeof deviceKey>[0]>) => deviceKey({ input: 'touch', screen: '390x844', dpr: 3, platform: 'ios-safari', ...o });
  if (k({}) !== 'touch|390x844@3|ios') bad(`deviceKey shape changed: ${k({})}`);
  if (k({ platform: 'ios-chrome' }) !== k({})) bad('the device key must not split one phone by browser family member (iOS Safari vs Chrome)');
  if (k({ input: 'pen' }) === k({}) || k({ screen: '428x926' }) === k({})) bad('a different input or screen must start a new segment (§2.3)');
  if (ageFrom(1990, at(0)) !== 36 || ageFrom(2020, at(0)) !== undefined || ageFrom(undefined) !== undefined) bad('ageFrom must give whole years and nothing outside 10–110');
  return `Pronk 2020 offsets equal §1.10 (unmeasured platforms: 60 ms placeholder, no reference); ${cases.length} user agents classified; device key = input + screen + dpr + platform family`;
}

function checkStoreSanitizer({ bad }: Ctx): string {
  for (const junk of [null, undefined, 42, 'brain', [], true, { unrelated: 1 }, { sessions: 'x', checkins: 7 }]) {
    if (S.normalizeBrainStore(junk) !== null) bad(`normalizeBrainStore(${show(junk)}) must be null — no sessions/checkins arrays means no Brain Lab data`);
  }
  if (!S.normalizeBrainStore({ sessions: [] }) || !S.normalizeBrainStore({ checkins: [] })) bad('an empty sessions or checkins array is a valid (empty) store');

  const T0 = at(3);
  const row = (over: Record<string, unknown>) => ({
    id: 'ok',
    testId: 'arrow-squared',
    domain: 'attention',
    finishedAt: T0,
    date: dayKey(T0),
    tzOffset: -180,
    durationSec: 95,
    seed: 7,
    metrics: { net: 40 },
    refZ: 0.1,
    protocolVersion: 1,
    scoringVersion: 1,
    referenceVersion: 1,
    valid: true,
    runType: 'baseline',
    device: DEVICE_A,
    ctx: CTX,
    theme: 'black',
    ...over
  });
  const ci = (over: Record<string, unknown>) => ({ id: 'c', date: dayKey(T0), startedAt: T0, testIds: ['arrow-squared'], ...over });
  const out = S.normalizeBrainStore({
    sessions: [
      row({ id: 'a', finishedAt: T0 + 1 }),
      42,
      'x',
      null,
      [],
      row({ id: undefined }),
      row({ id: 'b', testId: 7 }),
      row({ id: 'c', finishedAt: 'yesterday' }),
      row({ id: 'd', finishedAt: -5 }),
      row({ id: 'e', metrics: 'fast' }),
      row({ id: 'n', finishedAt: 1e20, date: 'soon' }),
      row({ id: 'f', finishedAt: T0 + 2, metrics: { net: NaN, acc: 0.9, rt: Infinity, s: '5' } }),
      row({ id: 'g', finishedAt: T0 + 3, date: '2026-02-31' }),
      row({ id: 'h', finishedAt: T0 + 4, testId: 'from-a-newer-build', domain: 'telepathy' }),
      row({ id: 'dup', finishedAt: T0 + 5, metrics: { net: 1 } }),
      row({ id: 'dup', finishedAt: T0 + 6, metrics: { net: 2 } }),
      row({ id: 'i', finishedAt: T0 + 7, runType: 'bogus' }),
      row({ id: 'j', finishedAt: T0 + 8, runType: 'invalid' }),
      row({ id: 'k', finishedAt: T0 + 9, valid: false, runType: 'baseline' }),
      row({ id: 'l', finishedAt: T0 + 10, valid: 'yes' }),
      row({ id: 'm', finishedAt: T0 + 11, device: { screen: '<script>', dpr: 0, frameMs: NaN, input: 'laser' }, ctx: { platformOffsetMs: 9999, age: 5 } })
    ],
    checkins: [
      ci({ id: 'c1', state: { sss: 0, bedTime: '24:00', wakeTime: '7:30', awakeMin: 37, sleepQuality: 6, stress: 2.6, caffeine: 3, exercise: 'yes' } }),
      ci({ id: 'c2', startedAt: T0 + 1, state: { sss: 8, bedTime: '23:59', wakeTime: '06:45', awakeMin: 601, caffeine: 2, exercise: false } }),
      ci({ id: 'c3', startedAt: T0 + 2, state: { sss: 3.4, sleepQuality: 1 } }),
      ci({ id: 'c4', startedAt: T0 + 3, state: { sss: 'high', stress: NaN } }),
      ci({ id: 'c5', startedAt: T0 + 4, date: '2026-13-01' }),
      ci({ id: 'c6', startedAt: T0 + 5, testIds: [] }),
      ci({ id: 'c7', startedAt: T0 + 6, completedAt: T0 })
    ],
    baselines: [
      { testId: 'x', segment: 's', value: 1, sigma: 0, frozenAt: T0, sessionIds: [] },
      { testId: 'x', segment: 's2', value: 1, sigma: 0.5, frozenAt: T0, sessionIds: ['a'] }
    ],
    resets: [
      { testId: 'x', at: 'now' },
      { testId: 'x', at: T0 }
    ],
    settings: { birthYear: 1800, introAt: -1 }
  });
  if (!out) {
    bad('normalizeBrainStore rejected a store that has usable rows');
    return 'store sanitizer';
  }
  const ids = out.sessions.map((s) => s.id).join(' ');
  if (ids !== 'a f g h dup i j k l m') {
    bad(`hostile sessions: kept [${ids}], expected [a f g h dup i j k l m] — non-objects, missing ids, non-numeric/negative/out-of-range times and non-object metrics are dropped; an unknown test is KEPT; duplicates keep the later copy`);
  }
  const by = new Map(out.sessions.map((s) => [s.id, s]));
  if (show(by.get('f')?.metrics) !== show({ acc: 0.9 })) bad(`non-finite or non-numeric metrics must be dropped one by one, got ${show(by.get('f')?.metrics)}`);
  if (by.get('g')?.date !== dayKey(T0 + 3)) bad(`an impossible date (2026-02-31) must be recomputed from finishedAt, got ${by.get('g')?.date}`);
  if (by.get('h')?.testId !== 'from-a-newer-build') bad('a session naming an unknown test must be KEPT (a newer build’s file must not lose history to an older reader)');
  if (by.get('dup')?.metrics.net !== 2) bad('duplicate session ids must keep the LATER copy');
  const rt = (id: string) => `${by.get(id)?.valid}/${by.get(id)?.runType}`;
  if (rt('i') !== 'true/tracking' || rt('j') !== 'true/tracking') bad(`a valid run's unknown or contradictory runType must be coerced to tracking (got ${rt('i')}, ${rt('j')})`);
  if (rt('k') !== 'false/invalid' || rt('l') !== 'false/invalid') bad(`only an explicit valid: true counts; an invalid run is runType invalid (got ${rt('k')}, ${rt('l')})`);
  const m = by.get('m');
  if (!m || m.device.screen !== '0x0' || m.device.dpr !== 1 || m.device.frameMs !== 16.7 || m.device.input !== 'touch' || m.ctx.platformOffsetMs !== 60 || 'age' in m.ctx) {
    bad(`a hostile device / reference context must be cleaned, got ${show(m?.device)} ${show(m?.ctx)}`);
  }
  if (out.sessions.some((s, i) => i > 0 && s.finishedAt < out.sessions[i - 1].finishedAt)) bad('sessions must be stored oldest first');

  // the state report: an out-of-range answer is ABSENT, never clamped into an answer nobody gave
  const st = new Map(out.checkins.map((c) => [c.id, c]));
  const cases: [string, BrainStateReport | undefined][] = [
    ['c1', { awakeMin: 30, stress: 3 }],
    ['c2', { bedTime: '23:59', wakeTime: '06:45', caffeine: 2, exercise: false }],
    ['c3', { sss: 3, sleepQuality: 1 }],
    ['c4', undefined]
  ];
  for (const [id, want] of cases) {
    if (show(st.get(id)?.state) !== show(want)) bad(`check-in ${id}: state ${show(st.get(id)?.state)}, expected ${show(want)} (SSS 1–7, HH:MM 00:00–23:59, 15-min awake steps ≤ 600, 1–5 scales, caffeine 0–2)`);
  }
  if (st.has('c5') || st.has('c6')) bad('a check-in with an impossible date or no planned tests must be dropped');
  if (st.get('c7') && 'completedAt' in (st.get('c7') as object)) bad('a completedAt before startedAt must be dropped');
  if (out.baselines.length !== 1 || out.baselines[0].segment !== 's2') bad('a baseline with σ ≤ 0 must be dropped');
  if (out.resets.length !== 1) bad('a reset without a numeric time must be dropped');
  if (show(out.settings) !== '{}') bad(`an impossible birth year / intro time must be dropped, got ${show(out.settings)}`);

  // caps
  const many = Array.from({ length: S.SESSION_CAP + 3 }, (_, i) => row({ id: `cap${i}`, finishedAt: T0 + i }));
  const capped = S.normalizeBrainStore({ sessions: many });
  if (capped?.sessions.length !== S.SESSION_CAP || capped.sessions[0].id !== 'cap3') bad(`sessions must be capped at ${S.SESSION_CAP}, dropping the OLDEST first`);
  const manyCi = Array.from({ length: S.CHECKIN_CAP + 2 }, (_, i) => ci({ id: `k${i}`, startedAt: T0 + i }));
  if (S.normalizeBrainStore({ checkins: manyCi })?.checkins.length !== S.CHECKIN_CAP) bad(`check-ins must be capped at ${S.CHECKIN_CAP}`);
  const log = [[1, 'x', 3], ...Array.from({ length: 499 }, (_, i) => Array.from({ length: 20 }, (_, j) => i + j))];
  const tl = S.normalizeBrainStore({ sessions: [row({ id: 'tl', trialLog: log })] })?.sessions[0]?.trialLog ?? [];
  if (!tl.length || tl.length > 400 || tl.some((r) => r.length > 12 || r.some((v) => !Number.isFinite(v)))) bad('trial logs must be capped (≤ 400 rows × 12 columns) with non-numeric rows dropped');
  const logged = Array.from({ length: S.TRIAL_LOG_KEEP + 3 }, (_, i) => row({ id: `t${i}`, finishedAt: T0 + i, trialLog: [[i, 1]] }));
  const kept = S.normalizeBrainStore({
    sessions: logged,
    baselines: [{ testId: 'arrow-squared', segment: 'seg', value: 40, sigma: 7, frozenAt: T0, sessionIds: ['t0'] }]
  });
  const withLog = (kept?.sessions ?? []).filter((s) => s.trialLog).map((s) => s.id);
  if (withLog.length !== S.TRIAL_LOG_KEEP + 1 || !withLog.includes('t0') || withLog.includes('t1')) {
    bad(`trial logs are kept for each test's newest ${S.TRIAL_LOG_KEEP} runs plus every baseline run (kept: ${withLog.join(', ')})`);
  }
  return `null for non-stores; hostile rows dropped field by field (NaN metrics, impossible dates recomputed, out-of-range times), unknown tests kept, duplicates later-wins, runType coerced, state answers out of range ABSENT (SSS 1–7, HH:MM), caps on sessions/check-ins/trial logs`;
}

function checkWritePath({ bad }: Ctx): string {
  return withMemoryStorage(() => {
    const att = stubTest('attention', { runIn: 2, noiseFloor: { abs: 7.2 }, reference: STUB_REF(40.43, 14.17) });
    const mem = stubTest('memory', { runIn: 2, noiseFloor: { abs: 0.4 }, reference: STUB_REF(5.27, 1.01) });
    const rec = (
      t: BrainTestDefinition,
      time: number,
      x: number,
      o: { valid?: boolean; checkinId?: string; device?: BrainDevice; metrics?: Record<string, number> } = {}
    ) =>
      A.recordRun({
        test: t,
        outcome: { metrics: o.metrics ?? { x }, trials: 30, valid: o.valid ?? true },
        seed: 1,
        startedAt: time - 90_000,
        finishedAt: time,
        device: o.device ?? DEVICE_A,
        ctx: CTX,
        theme: 'black',
        ...(o.checkinId ? { checkinId: o.checkinId } : {})
      });

    // 1. a check-in closes only once every planned test has a run
    const { checkin } = S.startCheckin([att.id, mem.id], { sss: 2, stress: 9 }, at(0, 8));
    if (show(checkin.state) !== show({ sss: 2 })) bad(`startCheckin must sanitize the state report (stress 9 is out of range), got ${show(checkin.state)}`);
    const theCheckin = () => S.loadBrain().checkins.find((c) => c.id === checkin.id);
    rec(att, at(0, 9), 40, { checkinId: checkin.id });
    if (theCheckin()?.completedAt) bad('a check-in closed after 1 of its 2 planned tests');
    rec(mem, at(0, 9, 30), 5, { checkinId: 'another-checkin' });
    if (theCheckin()?.completedAt) bad("a run belonging to another check-in closed this one");
    rec(mem, at(0, 9, 40), 5.5, { checkinId: checkin.id });
    if (theCheckin()?.completedAt !== at(0, 9, 40)) bad(`the check-in must close when its last planned test is recorded (completedAt ${theCheckin()?.completedAt})`);

    // 2. run-in, then 5 scored days, then the baseline FREEZES into store.baselines
    rec(att, at(0, 9, 5), 41);
    const xs = [40, 44, 42, 46, 41];
    xs.slice(0, 4).forEach((x, i) => rec(att, at(1 + i), x));
    if (S.loadBrain().baselines.length) bad('a baseline froze before its 5th scored run');
    const fifth = rec(att, at(5), xs[4]);
    const store5 = S.loadBrain();
    const baseIds = store5.sessions.filter((s) => s.testId === att.id && s.runType === 'baseline').map((s) => s.id);
    const frozen = store5.baselines.filter((b) => b.testId === att.id);
    if (frozen.length !== 1) bad(`the 5th scored run must freeze exactly one baseline into store.baselines (found ${frozen.length})`);
    else {
      const b = frozen[0];
      if (baseIds.length !== 5 || b.sessionIds.join() !== baseIds.join()) bad(`the frozen baseline must name its 5 baseline sessions (${b.sessionIds.join()} vs ${baseIds.join()})`);
      if (b.value !== 42) bad(`frozen baseline value ${b.value}, expected the median 42`);
      if (b.segment !== A.segmentOf(fifth.session, store5.resets)) bad('the frozen baseline must carry its segment id');
      if (b.sigma !== 7.2) bad(`frozen σ_w ${b.sigma}, expected the 7.2 floor (the residuals' robust SD is ≈3)`);
      if (b.frozenAt !== at(5)) bad('frozenAt must be the 5th baseline run');
    }
    if (!fifth.summary.baseline?.stored) bad('the results summary must already read the stored baseline');

    // 3. what each later run counts as (C6), stamped on the stored session
    const later = [rec(att, at(6), 80), rec(att, at(6, 13), 81), rec(att, at(7), 30, { valid: false }), rec(att, at(7, 13), 43)];
    const roles = later.map((r) => r.session.runType).join(' ');
    if (roles !== 'tracking practice invalid tracking') bad(`recorded run types [${roles}], expected [tracking practice invalid tracking]`);
    const still = S.loadBrain().baselines.filter((b) => b.testId === att.id);
    if (still.length !== 1 || still[0].value !== 42) bad('later runs must never move a frozen baseline');

    // 4. non-finite metrics are dropped; the reference z is stamped from the live anchor
    const m = rec(att, at(8), 44, { metrics: { x: 44, junk: NaN } }).session;
    if ('junk' in m.metrics) bad('recordRun must drop non-finite metrics');
    if (m.refZ !== zFrom(44, 40.43, 14.17)) bad(`recordRun must stamp refZ from the anchor (got ${m.refZ})`);

    // 5. "reset my baseline" and a device change each start a new segment — with no new run-in
    S.resetBaseline(att.id, at(8, 20));
    const r1 = rec(att, at(9), 45);
    if (r1.session.runType !== 'baseline') bad(`after a baseline reset the next scored run must count toward a NEW baseline (no new run-in), got ${r1.session.runType}`);
    if (r1.summary.segment === A.segmentOf(fifth.session, []) || !r1.summary.runInComplete || r1.summary.baselineProgress !== 1 || r1.summary.baseline) {
      bad(`a reset must open a fresh segment at 1/5 toward its baseline (segment ${r1.summary.segment}, progress ${r1.summary.baselineProgress})`);
    }
    [10, 11, 12, 13].forEach((d) => rec(att, at(d), 45));
    if (S.loadBrain().baselines.filter((b) => b.testId === att.id).length !== 2) bad('the reset segment must freeze its own baseline after 5 scored runs');
    const d1 = rec(att, at(14), 50, { device: DEVICE_B });
    if (d1.session.runType !== 'baseline' || d1.summary.segment === r1.summary.segment) bad(`a device change must open a new segment counting toward a new baseline (got ${d1.session.runType})`);
    return 'check-ins close only when every planned test has a run; the 5th scored run freezes the median baseline into store.baselines with its session ids, segment and floored σ_w; run types stamped per C6; resets and device changes open new segments without a new run-in';
  });
}

function checkBackup({ bad }: Ctx): string {
  return withMemoryStorage((mem) => {
    const t = stubTest('attention', { runIn: 1 });
    const game: GameResult = {
      id: 'r1',
      gameId: GAMES[0].id,
      difficulty: 'easy',
      startedAt: at(0, 7),
      finishedAt: at(0, 7, 5),
      durationSec: 300,
      outcome: 'won',
      score: 100,
      errors: 0,
      hintsUsed: 0,
      assistsEnabled: [],
      assistsUsed: [],
      cleanWin: true
    };
    saveProfile({ ...DEFAULT_PROFILE, name: 'Validate' });
    appendResult(game);
    const { checkin } = S.startCheckin([t.id], { sss: 3, bedTime: '23:00', wakeTime: '07:00' }, at(0, 8));
    for (let d = 0; d < 7; d++) {
      A.recordRun({
        test: t,
        outcome: { metrics: { x: 50 + d }, trials: 30, valid: true, trialLog: [[d, 1]] },
        seed: d,
        startedAt: at(d) - 90_000,
        finishedAt: at(d),
        device: DEVICE_A,
        ctx: CTX,
        theme: 'black',
        ...(d === 0 ? { checkinId: checkin.id } : {})
      });
    }
    S.setBrainSettings({ birthYear: 1990 });
    const device = show(S.loadBrain());
    const brainOf = (p: BackupPayload) => (p as BackupPayload & { brain?: unknown }).brain;

    const text = exportBackup();
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      bad(`a fresh export does not parse: ${parsed.error}`);
      return 'backup';
    }
    if (brainOf(parsed.payload) === undefined) {
      bad('the backup drops Brain Lab: exportBackup / parseBackup (through normalizeBrainStore) / applyBackup must carry a `brain` section, or moving devices silently loses every baseline');
    }
    mem.clear();
    applyBackup(parsed.payload);
    if (show(S.loadBrain()) !== device) bad('export → import onto an empty device does not restore the Brain Lab store exactly');

    // a file without the section leaves this device's Brain Lab data alone
    const file = JSON.parse(text) as Record<string, unknown>;
    delete file.brain;
    const before = show(S.loadBrain());
    const p2 = parseBackup(JSON.stringify(file));
    if (!p2.ok) bad(`a backup without Brain Lab data must still import: ${p2.error}`);
    else {
      if (brainOf(p2.payload) !== undefined) bad('a backup without a brain section must not produce one');
      applyBackup(p2.payload);
      if (show(S.loadBrain()) !== before) bad("importing a backup without Brain Lab data changed this device's Brain Lab store");
    }

    // a malformed section never poisons the rest of the file
    for (const junk of ['garbage', 42, [], { sessions: 'x', checkins: 7 }]) {
      const p3 = parseBackup(JSON.stringify({ ...file, brain: junk }));
      if (!p3.ok) {
        bad(`a malformed brain section (${show(junk)}) rejected the whole file: ${p3.error}`);
        continue;
      }
      if (brainOf(p3.payload) !== undefined) bad(`a malformed brain section (${show(junk)}) was carried into the payload`);
      if (p3.payload.history?.length !== 1 || p3.payload.profile?.name !== 'Validate') bad(`a malformed brain section (${show(junk)}) poisoned the other sections`);
    }

    // hostile rows are cleaned on the way in; an unknown test is kept
    const good = S.loadBrain().sessions[0];
    const p4 = parseBackup(
      JSON.stringify({ ...file, brain: { sessions: [good, 42, { id: 'x' }, { ...good, id: 'newer', testId: 'from-a-newer-build' }], checkins: 'no' } })
    );
    const b4 = p4.ok ? (brainOf(p4.payload) as BrainStore | undefined) : undefined;
    const got = b4?.sessions?.map((s) => s.id).join(', ') ?? 'nothing';
    if (got !== `${good?.id}, newer`) bad(`parseBackup must clean Brain Lab rows through normalizeBrainStore (dropping junk, keeping an unknown test): got ${got}`);
    return 'export → import restores the Brain Lab store exactly; a file without it leaves the device alone; a malformed section never poisons the rest; hostile rows cleaned, unknown tests kept';
  });
}

function checkRunsAndBaselines({ bad }: Ctx): string {
  const t = stubTest('attention', { runIn: 2, noiseFloor: { abs: 1 } });
  const roles = (ss: BrainSession[], resets: BrainStore['resets'] = [], stored: BrainBaseline[] = []) =>
    A.classifyRuns(t, ss, resets, stored)
      .map((r) => r.role)
      .join(' ');
  const expect = (label: string, got: string, want: string) => {
    if (got !== want) bad(`${label}: [${got}], expected [${want}]`);
  };
  const ri = () => [sess(t, at(0, 9), 40), sess(t, at(0, 9, 5), 41)];
  const day = (d: number, ...xs: (number | 'bad')[]) =>
    xs.map((x, i) => (x === 'bad' ? sess(t, at(d, 10 + i), 40, { valid: false }) : sess(t, at(d, 10 + i), x)));

  // run-in: exempt from the day rule, and an invalid run never counts toward it
  expect('run-in (exempt from C6; invalid runs do not count)', roles([sess(t, at(0, 9), 40, { valid: false }), sess(t, at(0, 9, 5), 41), sess(t, at(0, 9, 10), 42)]), 'invalid run-in run-in');
  // C6: one score per day — first valid run; after an invalid first run one more attempt may score; anything later is practice
  expect(
    'C6 day rule',
    roles([...ri(), ...day(1, 50, 51), ...day(2, 'bad', 52, 53), ...day(3, 'bad', 'bad', 54), ...day(4, 55, 'bad', 56)]),
    'run-in run-in baseline practice invalid baseline practice invalid invalid practice baseline invalid practice'
  );
  expect('a "valid" run without its primary metric', roles([...ri(), sess(t, at(1, 10), NaN), sess(t, at(1, 11), 50)]), 'run-in run-in invalid baseline');

  // C6 as the player is told it: scoredToday must agree with what the next run would be
  const r1 = stubTest('reaction', { runIn: 1 });
  const scenarios: [string, BrainSession[]][] = [
    ['two invalid runs during the run-in, then the run-in', [sess(r1, at(0, 9), 3, { valid: false }), sess(r1, at(0, 9, 5), 3, { valid: false }), sess(r1, at(0, 9, 10), 3.5)]],
    ['run-in then one scored run', [sess(r1, at(0, 9), 3.5), sess(r1, at(0, 10), 3.6)]],
    ['run-in then one invalid attempt', [sess(r1, at(0, 9), 3.5), sess(r1, at(0, 10), 3, { valid: false })]],
    ['run-in then two invalid attempts', [sess(r1, at(0, 9), 3.5), sess(r1, at(0, 10), 3, { valid: false }), sess(r1, at(0, 10, 5), 3, { valid: false })]]
  ];
  for (const [label, ss] of scenarios) {
    const told = A.summarizeTest(r1, storeOf(ss), at(0, 11)).scoredToday;
    const next = A.classifyRuns(r1, [...ss, sess(r1, at(0, 11), 3.7)], []);
    const role = next[next.length - 1].role;
    if (told !== (role === 'practice')) {
      bad(`${label}: scoredToday is ${told} but the next run today would be '${role}' — the screen and the record must agree (C6)`);
    }
  }

  // baseline: the median of the first 5 scored runs, then frozen
  const u = stubTest('attention', { runIn: 1, noiseFloor: { abs: 1 } });
  const base = [sess(u, at(0, 9), 30), ...[10, 14, 12, 30, 11].map((x, i) => sess(u, at(1 + i), x))];
  const s5 = A.summarizeTest(u, storeOf(base), at(6));
  if (s5.baseline?.value !== 12) bad(`the baseline must be the median of the first 5 scored runs (12), got ${s5.baseline?.value}`);
  if (s5.baseline && s5.baseline.sessionIds.join() !== base.slice(1).map((s) => s.id).join()) bad('the baseline names the wrong sessions');
  if (s5.sigma === null || Math.abs(s5.sigma - 1.4826 * 2) > 1e-9) bad(`σ_w must be 1.4826 × MAD of the baseline residuals (2.965 here, robust to the outlier 30), got ${s5.sigma}`);
  const s4 = A.summarizeTest(u, storeOf(base.slice(0, 5)), at(6));
  if (s4.baseline || s4.baselineProgress !== 4) bad(`4 scored runs must show 4/5 toward the baseline and no baseline (got ${s4.baselineProgress})`);
  const later = [...base, ...[50, 60, 70, 80, 90, 100].map((x, i) => sess(u, at(7 + i), x))];
  const s11 = A.summarizeTest(u, storeOf(later), at(13));
  if (s11.baseline?.value !== 12) bad(`the baseline must stay frozen once set (12), got ${s11.baseline?.value}`);

  // σ_w is floored: absolute and relative floors
  const flat = [sess(u, at(0, 9), 50), ...[1, 2, 3, 4, 5].map((d) => sess(u, at(d), 50))];
  if (A.summarizeTest(u, storeOf(flat), at(6)).sigma !== 1) bad('σ_w of a spread-free baseline must sit on the absolute floor');
  const v = stubTest('spatial', { runIn: 1, noiseFloor: { relative: 0.05 } });
  const flatV = [sess(v, at(0, 9), 20), ...[1, 2, 3, 4, 5].map((d) => sess(v, at(d), 20))];
  const sv = A.summarizeTest(v, storeOf(flatV), at(6)).sigma;
  if (sv === null || Math.abs(sv - 1) > 1e-9) bad(`a relative floor of 5% of a 20 baseline must give σ_w = 1, got ${sv}`);

  // a stored baseline wins, and survives the session cap — value AND σ_w (§2.11)
  const seg = A.segmentOf(base[1], []);
  const stored: BrainBaseline = { testId: u.id, segment: seg, value: 99, sigma: 6, frozenAt: base[5].finishedAt, sessionIds: base.slice(1).map((s) => s.id) };
  const sw = A.summarizeTest(u, storeOf(later, { baselines: [stored] }), at(13));
  if (sw.baseline?.value !== 99 || !sw.baseline.stored) bad('a stored baseline must win over a recomputed one');
  const filler = Array.from({ length: S.SESSION_CAP }, (_, i) => sess(u, at(20) + i * 1000, 50, { valid: false }));
  const capped = S.normalizeBrainStore(JSON.parse(show(storeOf([...later, ...filler], { baselines: [stored] }))));
  if (!capped || capped.sessions.some((s) => stored.sessionIds.includes(s.id))) bad('fixture: the cap should have dropped every baseline run');
  else {
    const sc = A.summarizeTest(u, capped, at(21));
    if (sc.baseline?.value !== 99) bad('capping the session list destroyed the frozen baseline (§2.11)');
    else if (sc.baseline.sigma !== 6) bad(`capping lost σ_w: with no baseline run left it fell from the stored 6 to ${sc.baseline.sigma} — §2.11 stores σ_w so capping can never destroy it`);
  }

  // a device change and a reset each start a new segment, with no new run-in
  const dev = [...base, ...[20, 21, 22].map((x, i) => sess(u, at(7 + i), x, { device: DEVICE_B }))];
  const cd = A.classifyRuns(u, dev, []);
  if (cd.slice(-3).some((r) => r.role !== 'baseline') || new Set(cd.filter(A.isScored).map((r) => r.segment)).size !== 2) {
    bad(`a device change must open a new segment whose first scored runs are 'baseline' (got ${cd.slice(-3).map((r) => r.role).join(' ')})`);
  }
  const sd = A.summarizeTest(u, storeOf(dev), at(10));
  if (sd.baseline || sd.baselineProgress !== 3) bad('after a device change the old baseline must not carry over (analytics never pool segments)');
  const rs = A.classifyRuns(u, later, [{ testId: u.id, at: at(6, 18) }]);
  expect('runs after a baseline reset', rs.slice(-6).map((r) => r.role).join(' '), 'baseline baseline baseline baseline baseline tracking');
  if (rs[rs.length - 1].segment === rs[1].segment) bad('a baseline reset must start a new segment');
  return 'run-in exempt and invalid-proof; C6 one score per day (and scoredToday agrees with it); baseline = frozen median of 5 with robust σ_w on its floor; a stored baseline wins and survives the cap; device changes and resets open new segments without a run-in';
}

function checkVerdictsAndTrends({ bad }: Ctx): string {
  const t = stubTest('attention', { runIn: 1, noiseFloor: { abs: 2 } });
  // W0 (Mon 5 Jan 2026): run-in Monday, baseline Tue–Sat at exactly 50 → B = 50, σ_w = the floor, 2
  const head = [sess(t, at(0, 9), 50), ...[1, 2, 3, 4, 5].map((d) => sess(t, at(d), 50))];
  const week = (w: number, x: number) => [0, 3].map((d) => sess(t, at(7 * w + d), x));
  const sum = (ss: BrainSession[], nowDay: number) => A.summarizeTest(t, storeOf([...head, ...ss]), at(nowDay, 12));
  const step = 50 + 2.5 * 2; // +2.5 σ_w (Appendix B "Scoring")
  const cases: [string, BrainSession[], number, A.Verdict][] = [
    ['+2.5 σ_w sustained for 2 weeks', [...week(1, step), ...week(2, step)], 21, 'reliably-above'],
    ['−2.5 σ_w sustained for 2 weeks', [...week(1, 45), ...week(2, 45)], 21, 'reliably-below'],
    ['a single crossing week', [...week(1, 50), ...week(2, step)], 21, 'possibly-above'],
    ['a gap week resets the chain', [...week(1, step), ...week(3, step)], 28, 'possibly-above'],
    ['inside the band', [...week(1, 51), ...week(2, 51)], 21, 'within'],
    ['the current week is never tested (no daily looks)', [...week(1, step), ...week(2, step), sess(t, at(21), 40), sess(t, at(22), 40)], 23, 'reliably-above'],
    ['a single day never produces a verdict', [sess(t, at(21), step)], 22, 'pending'],
    ['no baseline yet', [], 21, 'none']
  ];
  for (const [label, ss, nowDay, want] of cases) {
    const s = label === 'no baseline yet' ? A.summarizeTest(t, storeOf(head.slice(0, 5)), at(nowDay)) : sum(ss, nowDay);
    if (s.verdict.verdict !== want) bad(`weekly verdict, ${label}: '${s.verdict.verdict}', expected '${want}'`);
  }
  const sustained = sum([...week(1, step), ...week(2, step)], 21);
  if (sustained.sigma !== 2) bad(`fixture: σ_w should sit on its floor (2), got ${sustained.sigma}`);
  const z = 5 / (2 * Math.sqrt(1 / 2 + 1 / A.N_EFF));
  const w = sustained.verdict.weeks;
  if (w.length !== 2 || w.some((b) => b.k !== 2 || Math.abs(b.z - z) > 1e-9)) {
    bad(`week z must be (x̄_w − B) / (σ_w·√(1/k + 1/n_eff)) = ${z.toFixed(3)} with k = 2, got ${show(w)}`);
  }
  if (sum([...week(1, step), ...week(2, step), sess(t, at(21), 40)], 22).verdict.asOf !== dayKey(at(14))) bad('the verdict must be dated by the last COMPLETED week');

  // four-week trend: ≥ 8 scored runs spanning ≥ 21 days; rising/falling only past σ_w
  const tt = stubTest('speed', { runIn: 1, noiseFloor: { abs: 1 } });
  const trend = (days: number[], slope: number, nowDay: number) =>
    A.summarizeTest(tt, storeOf([sess(tt, at(0, 9), 50), ...days.map((d) => sess(tt, at(d), 50 + slope * d))]), at(nowDay, 13)).trend;
  const tc: [string, number[], number, number, A.TrendLabel | null][] = [
    ['7 runs over 24 days', [1, 5, 9, 13, 17, 21, 25], 1, 25, null],
    ['8 runs spanning 20 days', [1, 4, 7, 10, 13, 16, 19, 21], 1, 22, null],
    ['8 runs spanning 21 days, rising', [1, 4, 7, 10, 13, 16, 19, 22], 1, 22, 'rising'],
    ['8 runs spanning 21 days, falling', [1, 4, 7, 10, 13, 16, 19, 22], -1, 22, 'falling'],
    ['8 runs spanning 21 days, flat', [1, 4, 7, 10, 13, 16, 19, 22], 0, 22, 'steady']
  ];
  for (const [label, days, slope, nowDay, want] of tc) {
    const got = trend(days, slope, nowDay);
    if (got !== want) bad(`trend, ${label}: ${got}, expected ${want}`);
  }
  return `weekly verdicts per Appendix B (+2.5 σ_w for 2 weeks → reliably above; one crossing week → possibly; a gap week resets; the current week and single days never tested; z with n_eff ${A.N_EFF}); trend only with ≥ 8 runs over ≥ 21 days`;
}

function checkComposites({ bad }: Ctx): string {
  const reg = stubRegistry();
  const byDomain = new Map(reg.map((t) => [t.domain, t]));
  const areasFor = (store: BrainStore, now: number): A.AreaSummary[] =>
    BRAIN_DOMAINS.map((d) => {
      const test = byDomain.get(d.id);
      return { domain: d, test, summary: test ? A.summarizeTest(test, store, now) : null, grade: A.gradeOf(test) };
    });
  const runIns = (t: BrainTestDefinition, x: number) => Array.from({ length: t.runIn }, (_, i) => sess(t, at(0, 7, i * 5), x));

  // the Mean: 8 reference-graded areas at z = +1 → 60; grade P beside it, never averaged in
  const NOW = at(20, 18);
  const meanStore = (day: Partial<Record<BrainDomainId, number>> = {}) =>
    storeOf(reg.flatMap((t) => [...runIns(t, t.reference ? 60 : 0.3), sess(t, at(day[t.domain] ?? 10), t.reference ? 60 : 0.3)]));
  const m1 = A.meanSummary(areasFor(meanStore(), NOW), NOW);
  if (m1.index !== 60 || m1.m !== 8 || m1.personalOnly.join() !== 'flexibility' || m1.missing.length) {
    bad(`the Mean must be 50 + 10 × mean area z over the 8 graded areas with Flexibility (P) beside it: got index ${m1.index}, m ${m1.m}, personal-only [${m1.personalOnly}], missing [${m1.missing}]`);
  }
  const m2 = A.meanSummary(areasFor(meanStore({ calculation: 5 }), NOW), NOW);
  if (m2.index !== null || m2.missing.join() !== 'calculation') bad(`the Mean must hide while any graded area is stale (> 14 days): index ${m2.index}, missing [${m2.missing}]`);
  const m3 = A.meanSummary(areasFor(meanStore({ flexibility: 1 }), NOW), NOW);
  if (m3.index !== 60) bad('a stale grade-P area must not hide or move the Mean');

  // Today: ≥ 3 state-sensitive areas completed today, each with a baseline
  const sensitive = reg.filter((t) => t.stateSensitive).map((t) => t.domain);
  if (sensitive.slice().sort().join() !== 'attention,memory,reaction,speed') {
    bad(`§2.1 names Reaction, Attention, Memory and Processing Speed as state-sensitive; the §2.12 table gives ${sensitive.join(', ')}`);
  }
  const floorOf = (t: BrainTestDefinition) => ('abs' in t.noiseFloor ? t.noiseFloor.abs : 50 * t.noiseFloor.relative);
  const TODAY = 8;
  const day = (t: BrainTestDefinition, today: boolean, baseDays = [1, 2, 3, 4, 5]) => [
    ...runIns(t, 50),
    ...baseDays.map((d) => sess(t, at(d), 50)),
    ...(today ? [sess(t, at(TODAY, 9), 50 + 1.5 * floorOf(t))] : [])
  ];
  const NOWT = at(TODAY, 10);
  const today = (pick: (t: BrainTestDefinition) => BrainSession[]) => A.todayComposite(areasFor(storeOf(reg.flatMap(pick)), NOWT));
  const c4 = today((t) => day(t, t.stateSensitive));
  if (!c4 || c4.n !== 4 || c4.of !== 4 || c4.index !== 65) bad(`Today with 4 state-sensitive areas at +1.5 σ_w must read 65 from 4 of 4, got ${show(c4)}`);
  const c2 = today((t) => day(t, t.domain === 'reaction' || t.domain === 'speed'));
  if (c2) bad('Today must hide with only 2 state-sensitive areas completed today');
  const c3 = today((t) => (t.domain === 'memory' ? day(t, true, [1, 2, 3]) : day(t, ['reaction', 'speed'].includes(t.domain))));
  if (c3) bad('Today must hide when one of the 3 completed areas has no baseline yet');
  const cx = today((t) => day(t, ['reaction', 'speed', 'calculation', 'spatial'].includes(t.domain)));
  if (cx) bad('areas that are not state-sensitive must never count toward Today');

  // the check-in plan (reads the live registry: stubs swapped in, then restored)
  const saved = BRAIN_TESTS.splice(0, BRAIN_TESTS.length, ...reg);
  try {
    const plan = (store: BrainStore, now: number) => A.planCheckin(store, now).map((id) => id.replace('stub-', '')).join(' ');
    const NOWP = at(40, 10);
    const full = (t: BrainTestDefinition, lastDay?: number) => [...runIns(t, 50), ...[1, 2, 3, 4, 5].map((d) => sess(t, at(d), 50)), ...(lastDay ? [sess(t, at(lastDay), 50)] : [])];
    const p0 = plan(S.emptyBrainStore(), NOWP);
    if (p0 !== 'reaction speed attention') bad(`first-ever plan: [${p0}], expected the daily core + 2 run-in tests in canonical order [reaction speed attention]`);
    const front = storeOf(reg.flatMap((t) => (t.domain === 'speed' || t.domain === 'attention' ? full(t) : [])));
    const p1 = plan(front, NOWP);
    if (p1 !== 'reaction flexibility memory') bad(`run-ins must be front-loaded ahead of even very overdue tests: [${p1}], expected [reaction flexibility memory]`);
    const overdue = { speed: 35, analysis: 32, attention: 37 } as Partial<Record<BrainDomainId, number>>;
    const due = storeOf(reg.flatMap((t) => full(t, overdue[t.domain] ?? 39)));
    const p2 = plan(due, NOWP);
    if (p2 !== 'reaction speed analysis') bad(`the 2 rotating slots must go to the most overdue by cadence: [${p2}], expected [reaction speed analysis]`);
    const taken = storeOf([...due.sessions, sess(byDomain.get('reaction') as BrainTestDefinition, at(40, 8), 50), sess(byDomain.get('speed') as BrainTestDefinition, at(40, 8, 30), 50)]);
    const p3 = plan(taken, NOWP);
    if (p3 !== 'attention analysis') bad(`tests already scored today must be skipped (core included): [${p3}], expected [attention analysis]`);
  } finally {
    BRAIN_TESTS.splice(0, BRAIN_TESTS.length, ...saved);
  }
  return 'Mean = 50 + 10 × mean z over the 8 graded areas, hidden while one is stale, grade P beside it; Today needs 3 state-sensitive areas with baselines; the plan = daily core + 2 rotating, run-ins first, most overdue next, today’s scored tests skipped, canonical order';
}

function checkStateAndSleep({ bad }: Ctx): string {
  const labels: [number, A.StateLabel][] = [
    [0, 'within'],
    [0.999, 'within'],
    [1, 'above'],
    [-1, 'below'],
    [1.999, 'above'],
    [2, 'well-above'],
    [-2, 'well-below']
  ];
  for (const [z, want] of labels) if (A.stateLabel(z) !== want) bad(`stateLabel(${z}) = ${A.stateLabel(z)}, expected ${want} (|z| < 1 within, < 2 above/below, ≥ 2 well…)`);

  // today vs typical through the real path, with the ±2 h pool (§2.5)
  const t = stubTest('reaction', { runIn: 1, noiseFloor: { abs: 2 } });
  const morning = [sess(t, at(0, 7), 50), ...[1, 2, 3, 4, 5].map((d) => sess(t, at(d, 8), 50))];
  const evening = [6, 7, 8, 9, 10].map((d) => sess(t, at(d, 20), 60));
  const read = (time: number, x: number) => A.summarizeTest(t, storeOf([...morning, ...evening, sess(t, time, x)]), time + 60_000).today;
  const am = read(at(11, 8, 30), 50);
  const pm = read(at(11, 20, 30), 60);
  if (am?.typical !== 50 || am.label !== 'within' || pm?.typical !== 60 || pm.label !== 'within') {
    bad(`the typical range must use the ≥ 5 earlier runs within ±2 h of the time of day (got morning ${show(am)}, evening ${show(pm)})`);
  }
  const bounds: [number, A.StateLabel][] = [
    [51.9, 'within'],
    [52, 'above'],
    [54, 'well-above'],
    [48, 'below'],
    [46, 'well-below']
  ];
  for (const [x, want] of bounds) {
    const r = read(at(11, 8, 30), x);
    if (r?.label !== want) bad(`a run at ${x} against typical 50 with σ_w 2 must read '${want}', got '${r?.label}' (z ${r?.z})`);
  }
  // run-in + 3 earlier scored days + today = 4 of the 5 baseline runs
  if (A.summarizeTest(t, storeOf([...morning.slice(0, 4), sess(t, at(8), 70)]), at(8, 13)).today) bad('no today-vs-typical read before the baseline is complete');

  // sleep (§2.8): TST = (wake − bed) − awake, across midnight
  const sleep: [BrainStateReport | undefined, number | null][] = [
    [{ bedTime: '23:30', wakeTime: '07:15', awakeMin: 30 }, 435],
    [{ bedTime: '01:00', wakeTime: '08:00' }, 420],
    [{ bedTime: '22:00', wakeTime: '22:00' }, null],
    [{ bedTime: '07:00', wakeTime: '06:59' }, null],
    [{ bedTime: '23:00', wakeTime: '07:00', awakeMin: 480 }, null],
    [{ bedTime: '23:00' }, null],
    [undefined, null]
  ];
  for (const [state, want] of sleep) if (A.sleepMinutes(state) !== want) bad(`sleepMinutes(${show(state)}) = ${A.sleepMinutes(state)}, expected ${want}`);

  // flags (§2.8): sleepy SSS ≥ 5; short sleep < 6 h or ≥ 1.5 h under the usual; high stress ≥ 4
  const prev = [1, 2, 3, 4, 5].map((d) => ({ id: `p${d}`, date: dayKey(at(d)), startedAt: at(d, 8), testIds: ['x'], state: { bedTime: '23:00', wakeTime: '07:00' } }));
  const flags = (state: BrainStateReport) => A.stateFlags(storeOf([], { checkins: prev }), { date: dayKey(at(6)), state }).join(' ');
  const fc: [BrainStateReport, string][] = [
    [{ sss: 5 }, 'sleepy'],
    [{ sss: 4 }, ''],
    [{ bedTime: '01:00', wakeTime: '06:30' }, 'short-sleep'],
    [{ bedTime: '00:40', wakeTime: '07:00' }, 'short-sleep'],
    [{ bedTime: '00:00', wakeTime: '07:00' }, ''],
    [{ stress: 4 }, 'high-stress'],
    [{ stress: 3 }, '']
  ];
  for (const [state, want] of fc) if (flags(state) !== want) bad(`stateFlags(${show(state)}) = [${flags(state)}], expected [${want}]`);

  // the check-in streak: completed days ending today or yesterday
  const ci = (d: number, done = true) => ({ id: `s${d}${done}`, date: dayKey(at(d)), startedAt: at(d, 9), ...(done ? { completedAt: at(d, 9, 10) } : {}), testIds: ['x'] });
  const streak = (cs: ReturnType<typeof ci>[]) => A.checkinStreak(storeOf([], { checkins: cs }), at(12, 18));
  const sc: [string, ReturnType<typeof ci>[], number][] = [
    ['three days to today', [ci(10), ci(11), ci(12)], 3],
    ['today still open', [ci(10), ci(11), ci(12, false)], 2],
    ['a gap ends it', [ci(8), ci(10), ci(11), ci(12)], 3],
    ['nothing yesterday or today', [ci(9), ci(10)], 0]
  ];
  for (const [label, cs, want] of sc) if (streak(cs) !== want) bad(`checkinStreak, ${label}: ${streak(cs)}, expected ${want}`);
  return 'state labels at |z| 1 and 2, typical range from the ±2 h pool once a baseline exists; sleep minutes across midnight; sleepy / short-sleep / high-stress flags; check-in streak ending today or yesterday';
}

/* ---------------------------------------------------------------------- */
/* evidence & coach (owner's rule, 2026-10-31: no source, no claim)        */
/* ---------------------------------------------------------------------- */

const TIP_KINDS = ['habit', 'practice', 'strategy', 'measurement'];

/**
 * Every area, training link and improvement tip must cite ≥ 1 source, and
 * every source must BE an entry of references.ts (identity, not a copy) —
 * so no claim can carry an ad-hoc, unverified citation. Links also need the
 * paradigm they mirror and an honest evidence line; tip ids are unique.
 */
export function evidenceContract(domains: readonly BrainDomain[], refValues: ReadonlySet<object>): string[] {
  const p: string[] = [];
  const cited = (where: string, list: readonly object[] | undefined) => {
    if (!list || list.length === 0) p.push(`${where} cites no source`);
    for (const r of list ?? []) if (!refValues.has(r)) p.push(`${where} cites a source that is not an entry of references.ts`);
  };
  const tipIds = new Set<string>();
  for (const d of domains) {
    cited(`area ${d.id}`, d.sources);
    for (const l of d.training) {
      const w = `area ${d.id} → training "${l.gameId}"`;
      if (!l.paradigm?.trim()) p.push(`${w} names no paradigm`);
      if (!l.evidence?.trim()) p.push(`${w} has no evidence line`);
      cited(w, l.sources);
    }
    if (!d.improve?.length) p.push(`area ${d.id} has no improvement tips`);
    for (const t of d.improve ?? []) {
      const w = `area ${d.id} → tip "${t.id}"`;
      if (!t.id || tipIds.has(t.id)) p.push(`${w}: missing or duplicate id`);
      tipIds.add(t.id);
      if (!TIP_KINDS.includes(t.kind)) p.push(`${w}: unknown kind "${t.kind}"`);
      if (!t.title?.trim() || !t.body?.trim()) p.push(`${w}: empty title or body`);
      cited(w, t.sources);
    }
    // the scoring defect (QA-LEDGER): never-press wins — not a training link while it stands
    for (const l of d.training) if (l.gameId === 'n-back' || l.gameId === 'dual-n-back') p.push(`area ${d.id} links ${l.gameId}, whose scoring can be won by never pressing (QA-LEDGER)`);
  }
  return p;
}

function checkEvidence({ bad }: Ctx): string {
  const entries = Object.entries(REF);
  const urls = new Set<string>();
  for (const [id, r] of entries) {
    if (!/^https:\/\/doi\.org\/10\.\d{4,9}\/\S+$/.test(r.url)) bad(`references.ts ${id}: url must be a doi.org link, got ${r.url}`);
    if (!/\(\d{4}\)\. .+[.?!] .+\.$/.test(r.label)) bad(`references.ts ${id}: label must read "Authors (Year). Title. Journal." — got ${show(r.label)}`);
    if (urls.has(r.url)) bad(`references.ts ${id}: duplicate url ${r.url}`);
    urls.add(r.url);
  }
  const refValues = new Set<object>(Object.values(REF));
  for (const msg of evidenceContract(BRAIN_DOMAINS, refValues)) bad(msg);
  // the contract must catch what it promises to catch
  const base = BRAIN_DOMAINS.find((d) => d.training.length)!;
  const broken: [string, BrainDomain, RegExp][] = [
    ['link without sources', { ...base, training: [{ ...base.training[0], sources: [] }] }, /cites no source/],
    ['ad-hoc citation', { ...base, sources: [{ label: 'Somebody (2020). A paper. A journal.', url: 'https://doi.org/10.1/x' }] }, /not an entry of references\.ts/],
    ['link without paradigm', { ...base, training: [{ ...base.training[0], paradigm: '' }] }, /names no paradigm/],
    ['tip without sources', { ...base, improve: [{ ...base.improve[0], sources: [] }] }, /cites no source/],
    ['no tips', { ...base, improve: [] }, /no improvement tips/],
    ['defective game linked', { ...base, training: [{ ...base.training[0], gameId: 'n-back' }] }, /never pressing/]
  ];
  for (const [label, d, re] of broken) {
    if (!evidenceContract([d], refValues).some((m) => re.test(m))) bad(`the evidence contract misses a broken copy: ${label}`);
  }
  const links = BRAIN_DOMAINS.reduce((n, d) => n + d.training.length, 0);
  const tips = BRAIN_DOMAINS.reduce((n, d) => n + d.improve.length, 0);
  return `${entries.length} verified doi.org references; 9 areas, ${links} training links and ${tips} tips all cite references.ts entries (identity); contract catches ${broken.length} broken copies`;
}

function checkCoach({ bad }: Ctx): string {
  const NOWC = at(21, 12);
  const refValues = new Set<object>(Object.values(REF));
  const area = (test: BrainTestDefinition, sessions: BrainSession[], store?: BrainStore): A.AreaSummary => ({
    domain: BRAIN_DOMAINS.find((d) => d.id === test.domain)!,
    test,
    summary: A.summarizeTest(test, store ?? storeOf(sessions), NOWC),
    grade: test.reference ? test.reference.grade : 'P'
  });
  const run = (areas: A.AreaSummary[], store: BrainStore = storeOf([]), history: GameResult[] = []) =>
    coach({ store, areas, mean: A.meanSummary(areas, NOWC), history, now: NOWC });
  const domains = BRAIN_DOMAINS.map((d) => d.id);
  // a scored history at level x (STUB_REF 50 ± 10 → index x) inside the 14-day window
  const leveled = (t: BrainTestDefinition, x: number) => [sess(t, at(8, 9), x), ...[9, 10, 11, 12, 13, 14].map((d) => sess(t, at(d), x))];

  // 1. a fresh profile → calibrate first, habits last
  const fresh = run(domains.map((d) => area(stubTest(d), [])));
  const firstReal = fresh.insights.find((i) => i.kind !== 'habit');
  if (firstReal?.kind !== 'calibrate') bad(`a fresh profile must start with calibration, got ${firstReal?.kind}`);
  if (!fresh.insights.some((i) => i.id === 'habits')) bad('the best-evidence habits insight must always be present');

  // 2. a reliable decline is the top insight, with the §4.4 wording
  const ta = stubTest('attention', { runIn: 1, noiseFloor: { abs: 2 } });
  const head = [sess(ta, at(0, 9), 50), ...[1, 2, 3, 4, 5].map((d) => sess(ta, at(d), 50))];
  const declining = [...head, ...[7, 10, 14, 17].map((d) => sess(ta, at(d), 45))];
  const dec = run([area(ta, declining)]);
  const top = dec.insights[0];
  if (top?.id !== 'decline-attention' || top.priority < 90) bad(`a reliable decline must be the top insight, got ${top?.id}`);
  if (!/talking to a health professional/.test(top?.body ?? '') || !/short sleep/.test(top?.body ?? '')) bad('the decline insight must list benign causes and the §4.4 professional-advice line');

  // 3. focus: a clearly low graded area is a focus area; a grade-P area never is; small gaps are noise
  const g = (d: BrainDomainId, x: number) => { const t = stubTest(d); return area(t, leveled(t, x)); };
  const flex = stubTest('flexibility', { reference: null });
  const lowP = area(flex, leveled(flex, 1));
  const f1 = run([g('attention', 60), g('memory', 60), g('speed', 60), g('spatial', 40), lowP]);
  if (f1.focus.join() !== 'spatial') bad(`focus must be the clearly low graded area only, got [${f1.focus}]`);
  const f2 = run([g('attention', 60), g('memory', 58), g('speed', 57), g('spatial', 56)]);
  if (f2.focus.length || !f2.insights.some((i) => i.id === 'balanced')) bad(`gaps under ½ SD must read as a balanced profile, got focus [${f2.focus}]`);
  // across EVERY card, not just training ones — a focus card's button and a "Try X" card once offered the same game
  const suggestions = f1.insights.filter((i) => i.action?.kind === 'play').map((i) => i.action!.id);
  if (new Set(suggestions).size !== suggestions.length) bad(`the coach offered the same game twice: [${suggestions}]`);

  // 4. short logged sleep → the sleep insight
  const ci = [1, 2, 3, 4, 5, 6].map((d) => ({ id: `c${d}`, date: dayKey(at(14 + d)), startedAt: at(14 + d, 8), completedAt: at(14 + d, 8, 20), testIds: ['x'], state: { bedTime: '01:00', wakeTime: '06:30' } }));
  const sl = run([g('attention', 60)], storeOf([], { checkins: ci }));
  if (!sl.insights.some((i) => i.id === 'sleep-short')) bad('a fortnight of 5.5-hour nights must trigger the sleep insight');

  // 5. every insight and tip cites references.ts entries; the report is deterministic
  for (const rep of [fresh, dec, f1, f2, sl]) {
    for (const i of rep.insights) {
      if (!i.sources.length) bad(`coach insight ${i.id} cites no source`);
      for (const r of [...i.sources, ...i.tips.flatMap((t) => t.sources)]) if (!refValues.has(r)) bad(`coach insight ${i.id} cites a source outside references.ts`);
      if (!i.why.trim()) bad(`coach insight ${i.id} does not say what triggered it`);
    }
  }
  const again = run([g('attention', 60), g('memory', 60), g('speed', 60), g('spatial', 40), lowP]);
  if (JSON.stringify(again) !== JSON.stringify(f1)) bad('the coach is not deterministic for identical inputs');
  return 'fresh profile → calibrate; a reliable decline tops the report with benign causes first; focus = clearly low graded areas only (grade P never, gaps < ½ SD = balanced); no duplicate game; short sleep noticed; every insight explains its trigger and cites references.ts; deterministic';
}

/**
 * C13 and the owner's report of 2026-11-03: (1) a personal-only (grade P)
 * area between calibration and its frozen baseline shows how far along the
 * baseline is — it once fell through to "Lapsed / No scored run in 14 days"
 * the day it scored; (2) a scoring-version bump re-judges stored runs from
 * their trial logs once, persisted — reviving runs the old rules discarded,
 * leaving log-less and current runs alone, freezing a baseline the revived
 * runs complete; (3) every test above scoring v1 ships its `rescore`.
 */
function checkRescoreAndForming({ bad }: Ctx): string {
  /* ---- (1) the forming state of a personal-only area ---- */
  const flex = BRAIN_DOMAINS.find((d) => d.id === 'flexibility');
  if (!flex) {
    bad('no flexibility area to test the forming state with');
    return 'skipped';
  }
  const p = stubTest('flexibility', { runIn: 3, reference: null, noiseFloor: { abs: 0.05 } });
  const views = (ss: BrainSession[], now: number) => {
    const store = storeOf(ss);
    const a: A.AreaSummary = { domain: flex, test: p, summary: A.summarizeTest(p, store, now), grade: 'P' };
    return { view: areaView(a), dash: buildAreaView(a, store) };
  };
  // the owner's day: six runs back to back → 3 calibration runs, the day's scored run, 2 practice runs
  const six = [0, 1, 2, 3, 4, 5].map((i) => sess(p, at(0, 9, i * 5), 0.1 + i * 0.01));
  const day0 = views(six, at(0, 12));
  if (day0.view.state !== 'forming' || day0.view.value !== null || day0.view.baselineProgress !== 1)
    bad(`six runs on day 1 must read "Baseline forming 1/5" with no number (got ${day0.view.state} ${day0.view.value} ${day0.view.baselineProgress}/5)`);
  if (day0.dash.status !== 'forming' || day0.dash.levelKind !== 'forming') bad(`the dashboard calls a forming baseline '${day0.dash.levelKind}' (status ${day0.dash.status})`);
  if (views(six.slice(0, 2), at(0, 12)).view.state !== 'calibrating') bad('two runs of a 3-run calibration must still read calibrating');
  const after3 = views(six.slice(0, 3), at(0, 12)).view;
  if (after3.state !== 'forming' || after3.baselineProgress !== 0) bad(`calibration done, no scored run yet: ${after3.state} ${after3.baselineProgress}/5 (want forming 0/5)`);
  // five scored days set the baseline → a personal index; then 20 idle days → lapsed for real
  const five = [...six.slice(0, 3), ...[1, 2, 3, 4, 5].map((d) => sess(p, at(d, 10), 0.1 + d * 0.01))];
  const lv = views(five, at(5, 12));
  if (lv.view.state !== 'level' || !lv.view.personal || lv.dash.levelKind !== 'personal') bad(`five scored days must give the personal index (got ${lv.view.state} / ${lv.dash.levelKind})`);
  if (views(five, at(26, 12)).view.state !== 'stale') bad('a set baseline with nothing in 14 days must still read lapsed');
  // a graded area in the same situation keeps its reference level from the first scored run
  const g = stubTest('attention', { runIn: 3 });
  const gs = storeOf([0, 1, 2, 3].map((i) => sess(g, at(0, 9, i * 5), 50)));
  const gv = areaView({ domain: BRAIN_DOMAINS.find((d) => d.id === 'attention')!, test: g, summary: A.summarizeTest(g, gs, at(0, 12)), grade: 'C' });
  if (gv.state !== 'level') bad(`a graded area after calibration must show its level (got ${gv.state})`);
  // the words: steps left, never "lapsed"
  if (!/4 to go/.test(personalFormingCopy(1)) || /laps|stale/i.test(personalFormingCopy(1))) bad(`forming copy: "${personalFormingCopy(1)}"`);
  if (personalIndexAfter(1) !== 'Index after 4 more scored days' || personalIndexAfter(4) !== 'Index after 1 more scored day') bad('the area card line miscounts the days left');

  /* ---- (2a) the pure rescore: what changes, what never does ---- */
  const r = stubTest('speed', {
    runIn: 1,
    scoringVersion: 2,
    // log [[1, x]] → valid with x; [[0, x]] → invalid; [[9, …]] → the rescore throws
    rescore: (st) => {
      if (st.trialLog[0][0] === 9) throw new Error('a broken rescore');
      const ok = st.trialLog[0][0] === 1;
      return { metrics: { x: st.trialLog[0][1] }, trials: 1, valid: ok, ...(ok ? {} : { flags: ['still-bad'] }) };
    }
  });
  const lookup = (id: string) => (id === r.id ? r : undefined);
  const v1 = (t: number, over: Partial<BrainSession>) => sess(r, at(0, 9, t), 40, { scoringVersion: 1, ...over });
  const input = [
    v1(0, { id: 'revive', valid: false, runType: 'invalid', flags: ['too-few-correct'], trialLog: [[1, 40]] }),
    v1(1, { id: 'no-log', valid: false, runType: 'invalid', flags: ['too-few-correct'] }),
    v1(2, { id: 'still-invalid', valid: false, runType: 'invalid', trialLog: [[0, 41]] }),
    v1(3, { id: 'retire', trialLog: [[0, 42]] }),
    v1(4, { id: 'throws', valid: false, runType: 'invalid', trialLog: [[9, 0]] }),
    v1(5, { id: 'current', valid: false, runType: 'invalid', scoringVersion: 2, trialLog: [[1, 43]] }),
    v1(6, { id: 'interrupted', valid: false, runType: 'invalid', flags: ['interrupted'] }),
    sess(r, at(0, 9, 7), 44, { id: 'unknown', testId: 'from-a-newer-build', scoringVersion: 1, valid: false, trialLog: [[1, 44]] })
  ];
  const frozenInput = show(input);
  const { store: out, report } = rescoreSessions(storeOf(input), lookup);
  if (show(input) !== frozenInput) bad('rescoreSessions mutated its input');
  const byId = new Map(out.sessions.map((x) => [x.id, x]));
  const rv = byId.get('revive');
  if (!rv?.valid || rv.scoringVersion !== 2 || rv.runType === 'invalid' || rv.flags?.join() !== 'rescored' || rv.metrics.x !== 40)
    bad(`a run the new rules accept was not revived and marked: ${show(rv)}`);
  for (const id of ['no-log', 'throws', 'current', 'interrupted', 'unknown'])
    if (show(byId.get(id)) !== show(input.find((x) => x.id === id))) bad(`the '${id}' run must be left exactly as stored`);
  const si = byId.get('still-invalid');
  if (si?.valid || si?.scoringVersion !== 2 || si.flags?.join() !== 'still-bad') bad('a run still invalid under the new rules must carry its new reason and version');
  if (byId.get('retire')?.valid || byId.get('retire')?.runType !== 'invalid') bad('a run the new rules reject must stop counting');
  if (report.changed !== 3 || report.revived !== 1 || report.retired !== 1) bad(`report ${show(report)} (want 3 changed, 1 revived, 1 retired)`);
  if (rescoreSessions(out, lookup).report.changed !== 0) bad('rescoring is not idempotent');

  /* ---- (2b) a baseline the revived runs complete is frozen and stored ---- */
  const q = stubTest('spatial', { runIn: 1, scoringVersion: 2, rescore: (st) => ({ metrics: { x: st.trialLog[0][1] }, trials: 1, valid: true }) });
  const days = [0, 1, 2, 3, 4, 5].map((d) => sess(q, at(d, 10), 10 + d, { valid: false, runType: 'invalid', scoringVersion: 1, trialLog: [[1, 10 + d]] }));
  const fb = rescoreSessions(storeOf(days), (id) => (id === q.id ? q : undefined)).store;
  const b = fb.baselines.find((x) => x.testId === q.id);
  if (!b || b.value !== 13 || b.sessionIds.join() !== days.slice(1).map((x) => x.id).join()) bad(`revived runs completing a baseline must freeze it (median 13 of days 2–6), got ${show(b)}`);
  if (A.classifyRuns(q, fb.sessions, fb.resets, fb.baselines).map((x) => x.role).join(' ') !== 'run-in baseline baseline baseline baseline baseline') bad('revived runs are not classified as calibration + baseline');

  /* ---- (2c) the real thing: the owner's slow Symbol Coding run, through the live registry and storage ---- */
  const sc = BRAIN_TESTS.find((t) => t.id === 'symbol-coding');
  if (!sc) bad('symbol-coding is not registered');
  else
    withMemoryStorage(() => {
      // 19 symbols right, one every 4.5 s: v1 discarded it twice (fewer than 20 correct; every gap over 5 s)
      const log = [
        ...Array.from({ length: 19 }, (_, k) => scRow(SC_PHASE.coding, k, 2, 1, 1, 4500 * (k + 1), 900, k % 9, SC_STATUS.registered)),
        [SC_PHASE.frames, 5400, 16.7, 17.1, 33.4, 0, 0, 0, 0]
      ];
      const slow = sess(sc, at(0, 9), 19, { valid: false, runType: 'invalid', scoringVersion: 1, flags: ['too-few-correct', 'long-gap'], trialLog: log });
      S.saveBrain(storeOf([slow]));
      const rep = ensureScoringCurrent();
      const after = S.loadBrain().sessions[0];
      if (rep.revived !== 1 || !after?.valid || after.scoringVersion !== sc.scoringVersion || !after.flags?.includes('rescored') || after.metrics.sds90 !== 19)
        bad(`the slow v1 Symbol Coding run was not revived and persisted: ${show({ rep, valid: after?.valid, v: after?.scoringVersion, flags: after?.flags })}`);
      if (A.summarizeTest(sc, S.loadBrain(), at(0, 10)).runInDone !== 1) bad('the revived run does not count as the first calibration run');
      if (ensureScoringCurrent().changed !== 0) bad('a second pass over a current store changed it');
    });

  /* ---- (3) the contract: a test above scoring v1 rescores its history ---- */
  for (const t of BRAIN_TESTS) if (t.scoringVersion > 1 && typeof t.rescore !== 'function') bad(`${t.id} is at scoring v${t.scoringVersion} without a rescore`);
  if (flagCopy('rescored') === 'Rescored.' || !/count/.test(flagCopy('rescored'))) bad('the rescored note has no plain-words copy');

  const bumped = BRAIN_TESTS.filter((t) => t.scoringVersion > 1).map((t) => t.id);
  return `grade-P area: calibrating → forming k/5 (never lapsed) → personal index → lapsed only when idle; rescore revives/retires/leaves alone, idempotent, freezes completed baselines; the owner's slow v1 Symbol Coding run revived through storage; ${bumped.length} tests at scoring v2+ all rescore (${bumped.join(', ')})`;
}

export const CORE_CHECKS: CoreCheck[] = [
  { name: 'dossier', run: checkDossier },
  { name: 'areas', run: checkAreas },
  { name: 'registry contract', run: checkContractSelfTest },
  { name: 'registry (BRAIN_TESTS)', run: checkLiveRegistry },
  { name: 'isolation', run: checkIsolation },
  { name: 'index scale', run: checkIndexScale },
  { name: 'seeded generation', run: checkSeeded },
  { name: 'results chime', run: checkChime },
  { name: 'appendix E', run: checkAppendixE },
  { name: 'claims', run: checkClaims },
  { name: 'motion', run: checkMotion },
  { name: 'device', run: checkDevice },
  { name: 'store sanitizer', run: checkStoreSanitizer },
  { name: 'store write path', run: checkWritePath },
  { name: 'backup', run: checkBackup },
  { name: 'runs & baselines', run: checkRunsAndBaselines },
  { name: 'C13: rescoring & forming', run: checkRescoreAndForming },
  { name: 'verdicts & trends', run: checkVerdictsAndTrends },
  { name: 'Mean, Today & plan', run: checkComposites },
  { name: 'state, sleep & streak', run: checkStateAndSleep },
  { name: 'evidence', run: checkEvidence },
  { name: 'coach', run: checkCoach }
];

/** every core check in one — `npx tsx scripts/brain-checks/run.ts core` */
export const check: BrainCheck = async (ctx) => {
  for (const c of CORE_CHECKS) {
    let clean = true;
    const bad = (msg: string) => {
      clean = false;
      ctx.bad(`${c.name}: ${msg}`);
    };
    try {
      const summary = await c.run({ ...ctx, bad });
      if (clean) console.log(`  ✓ core/${c.name}: ${summary}`);
    } catch (e) {
      bad(`threw — ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    }
  }
  return `${CORE_CHECKS.length} core checks`;
};
