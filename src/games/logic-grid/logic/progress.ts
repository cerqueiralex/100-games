/** Per-preset completion tracking, persisted like all platform data. */

const KEY = '100games.v1.logicgrid.solved';

export function loadSolvedPresets(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markPresetSolved(id: string): void {
  try {
    const solved = loadSolvedPresets();
    solved.add(id);
    localStorage.setItem(KEY, JSON.stringify([...solved]));
  } catch {
    // persistence degrades gracefully
  }
}
