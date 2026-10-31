import type { BrainDevice, BrainRefContext } from './types';
import { median } from './timing';

/**
 * The device fingerprint and reference context stored with every run
 * (SCIENCE.md §2.3, §2.11). Browser APIs are read only when a function is
 * CALLED, never at import, so validate can import the module under Node.
 *
 * A run's `device.key` names its measurement series: a different phone, a
 * mouse instead of a finger, or a different screen starts a new baseline
 * segment, because web touch-to-paint latency differs by 35–140 ms between
 * phones (Nicosia et al. 2023) and would otherwise read as a change in the
 * player. The OS version and the user agent are deliberately NOT in the
 * key — an iOS update must not reset anyone's baseline.
 */

export type BrainPlatform =
  | 'ios-safari'
  | 'ios-chrome'
  | 'android-chrome'
  | 'windows-chrome'
  | 'macos-safari'
  | 'other';

/**
 * Mean RT overestimation of web apps per platform, measured by a robot
 * (Pronk et al. 2020, Behavior Research Methods 52:1371–1382). Every other
 * platform gets a 60 ms placeholder and no Reaction reference (SCIENCE.md
 * §1.10 "Device offsets").
 */
const PRONK_OFFSET_MS: Record<Exclude<BrainPlatform, 'other'>, number> = {
  'ios-safari': 57.6,
  'ios-chrome': 57.9,
  'android-chrome': 69.8,
  'windows-chrome': 68.5,
  'macos-safari': 132.9
};
const FALLBACK_OFFSET_MS = 60;

/** classify a user agent (iPadOS reports a Mac UA, so touch points decide) */
export function detectPlatform(ua: string, maxTouchPoints = 0): BrainPlatform {
  const iPadAsMac = /Macintosh/.test(ua) && maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadAsMac) {
    return /CriOS/.test(ua) ? 'ios-chrome' : 'ios-safari';
  }
  const chromium = /Chrome\//.test(ua) && !/Edg\/|OPR\//.test(ua);
  if (/Android/.test(ua)) return chromium ? 'android-chrome' : 'other';
  if (/Windows/.test(ua)) return chromium ? 'windows-chrome' : 'other';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome\/|Firefox\//.test(ua)) {
    return 'macos-safari';
  }
  return 'other';
}

export function platformOffset(platform: BrainPlatform): { ms: number; known: boolean } {
  return platform === 'other'
    ? { ms: FALLBACK_OFFSET_MS, known: false }
    : { ms: PRONK_OFFSET_MS[platform], known: true };
}

/** the series key: input + screen (short×long CSS px) + pixel ratio + platform family */
export function deviceKey(d: Pick<BrainDevice, 'input' | 'screen' | 'dpr' | 'platform'>): string {
  const family = d.platform.split('-')[0];
  return `${d.input}|${d.screen}@${Math.round(d.dpr * 100) / 100}|${family}`;
}

/** the age in whole years at `at`, from an optional birth year */
export function ageFrom(birthYear: number | undefined, at: number = Date.now()): number | undefined {
  if (!birthYear) return undefined;
  const age = new Date(at).getFullYear() - birthYear;
  return age >= 10 && age <= 110 ? age : undefined;
}

/** the reference context for a run on this device */
export function currentRefContext(birthYear?: number): BrainRefContext {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const platform = detectPlatform(nav?.userAgent ?? '', nav?.maxTouchPoints ?? 0);
  const off = platformOffset(platform);
  const age = ageFrom(birthYear);
  return { ...(age !== undefined ? { age } : {}), platformOffsetMs: off.ms, offsetKnown: off.known };
}

/**
 * Median requestAnimationFrame interval over `frames` frames — stored with
 * the run (SCIENCE.md C2: "measure the frame interval at session start").
 * Resolves 16.7 where rAF is unavailable.
 */
export function measureFrameMs(frames = 60): Promise<number> {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve(16.7);
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last = -1;
    const step = (ts: number) => {
      if (last >= 0) deltas.push(ts - last);
      last = ts;
      if (deltas.length >= frames) resolve(Math.round(median(deltas) * 100) / 100);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** the fingerprint of this device for a run answered with `input` */
export function currentDevice(input: BrainDevice['input'], frameMs: number): BrainDevice {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const ua = nav?.userAgent ?? '';
  const platform = detectPlatform(ua, nav?.maxTouchPoints ?? 0);
  const w = typeof screen !== 'undefined' ? screen.width : 0;
  const h = typeof screen !== 'undefined' ? screen.height : 0;
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const standalone =
    typeof matchMedia !== 'undefined' &&
    (matchMedia('(display-mode: standalone)').matches ||
      (nav as Navigator & { standalone?: boolean } | undefined)?.standalone === true);
  const base = {
    input,
    platform,
    ua: ua.slice(0, 300),
    screen: `${Math.min(w, h)}x${Math.max(w, h)}`,
    dpr,
    frameMs,
    standalone
  };
  return { key: deviceKey(base), ...base };
}
