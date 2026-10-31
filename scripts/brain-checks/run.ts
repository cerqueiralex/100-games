/**
 * Run Brain Lab fidelity checks on their own, without the full validate:
 *   npx tsx scripts/brain-checks/run.ts <test-id> [<test-id> …]
 *   npx tsx scripts/brain-checks/run.ts            (every check file present)
 * Exit code 1 if any check reports a problem.
 */
import { rng } from '../../src/platform/brain/timing';
import type { BrainCheck } from './types';

declare const process: { argv: string[]; exitCode?: number };

async function main() {
  const { readdirSync } = (await import('node:fs')) as unknown as { readdirSync: (p: string) => string[] };
  const { fileURLToPath } = await import('node:url');
  const dir = fileURLToPath(new URL('.', import.meta.url));
  const wanted = process.argv.slice(2);
  const ids = wanted.length
    ? wanted
    : readdirSync(dir)
        .filter((f) => f.endsWith('.ts') && !['types.ts', 'run.ts', 'core.ts'].includes(f))
        .map((f) => f.replace(/\.ts$/, ''));
  let failed = false;
  for (const id of ids) {
    const mod = (await import(`./${id}.ts`)) as { check?: BrainCheck };
    if (!mod.check) {
      console.error(`✗ ${id}: no exported check`);
      failed = true;
      continue;
    }
    let ok = true;
    const bad = (msg: string) => {
      ok = false;
      failed = true;
      console.error(`✗ ${id}: ${msg}`);
    };
    const summary = await mod.check({ bad, rng });
    if (ok) console.log(`  ✓ ${id}: ${summary}`);
  }
  if (failed) process.exitCode = 1;
}

void main();
