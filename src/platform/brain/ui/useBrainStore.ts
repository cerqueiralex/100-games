import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { BrainStore } from '../types';
import { loadBrain } from '../store';
import { dayKey } from '../../progress/progress';

/**
 * Live reads of the Brain Lab store for React views (the tab, the runner,
 * the check-in, the Profile → Brain dashboard).
 *
 * localStorage is the source of truth (store.ts); views re-read it whenever
 * something announces a change through `notifyBrainChanged()` — every UI
 * write (recordRun, startCheckin, setBrainSettings, resetBaseline,
 * clearBrain) and AppState's reloadFromStorage / wipeEverything (a backup
 * import or "Reset everything" replaces the store underneath every view).
 * A write from another tab of the app arrives as a `storage` event.
 */

let revision = 0;
const listeners = new Set<() => void>();

/** tell every mounted Brain Lab view to re-read the store */
export function notifyBrainChanged(): void {
  revision++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === '100games.v1.brain') {
      revision++;
      listener();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

const getRevision = () => revision;

/* One parse per revision, shared by every mounted view: the tab, the hero,
   the area page and the dashboard all read the same snapshot instead of each
   re-parsing and re-normalising a store that can hold thousands of runs.
   Treat it as read-only — writes go through store.ts / recordRun, which read
   localStorage themselves and then announce the change. */
let cache: { rev: number; store: BrainStore } | null = null;
function snapshot(rev: number): BrainStore {
  if (!cache || cache.rev !== rev) cache = { rev, store: loadBrain() };
  return cache.store;
}

/** the current store; re-read on every announced change */
export function useBrainStore(): BrainStore {
  const rev = useSyncExternalStore(subscribe, getRevision, getRevision);
  return useMemo(() => snapshot(rev), [rev]);
}

/**
 * The local calendar day, re-rendering the caller when midnight passes
 * while the app stays open (checked every 30 s, like the Daily Challenge
 * card) — "today", the plan and C6 all hang off it.
 */
export function useBrainDay(): string {
  const [day, setDay] = useState(() => dayKey(Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = dayKey(Date.now());
      setDay((prev) => (prev === d ? prev : d));
    }, 30_000);
    const onVisible = () => {
      if (!document.hidden) setDay(dayKey(Date.now()));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return day;
}
