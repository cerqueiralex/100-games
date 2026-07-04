/** Per-preset completion tracking, persisted like all platform data. */

import { readGameData, writeGameData } from '../../../platform/storage';

const SUB_KEY = 'logicgrid.solved';

export function loadSolvedPresets(): Set<string> {
  return new Set(readGameData<string[]>(SUB_KEY) ?? []);
}

export function markPresetSolved(id: string): void {
  const solved = loadSolvedPresets();
  solved.add(id);
  writeGameData(SUB_KEY, [...solved]);
}
