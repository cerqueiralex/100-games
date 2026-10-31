import { useEffect, useMemo, useState } from 'react';
import type { BrainRunOutcome, BrainTestDefinition } from './types';
import { freshSeed } from './timing';
import { currentRefContext } from './device';

/**
 * DEV-ONLY test harness: `/?harness=<test-id>[&mode=practice][&first=1][&seed=N]`
 * mounts one benchmark from src/brain/<id>/ on a bare stage, without the
 * registry, the runner or the store — so a benchmark can be built, driven
 * by puppeteer and screenshotted on its own. main.tsx only loads it under
 * `import.meta.env.DEV`, so it never ships.
 */

const MODULES = import.meta.glob<{ default?: BrainTestDefinition } & Record<string, unknown>>('../../brain/*/index.ts');

function pickDefinition(mod: Record<string, unknown>): BrainTestDefinition | null {
  for (const v of Object.values(mod)) {
    if (v && typeof v === 'object' && 'component' in v && 'primaryMetric' in v) return v as BrainTestDefinition;
  }
  return null;
}

export default function Harness() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const id = params.get('harness') ?? '';
  const [def, setDef] = useState<BrainTestDefinition | null>(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<BrainRunOutcome | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [stage, setStage] = useState<'intro' | 'run'>(params.get('autostart') ? 'run' : 'intro');
  const seed = useMemo(() => Number(params.get('seed') ?? freshSeed()) >>> 0, [params, runKey]);
  const mode = params.get('mode') === 'practice' ? 'practice' : 'test';
  const firstRun = params.get('first') === '1';

  useEffect(() => {
    const load = MODULES[`../../brain/${id}/index.ts`];
    if (!load) {
      setError(`No benchmark folder src/brain/${id}/index.ts. Known: ${Object.keys(MODULES).join(', ')}`);
      return;
    }
    load().then((m) => {
      const d = pickDefinition(m);
      if (!d) setError('index.ts exports no BrainTestDefinition');
      else setDef(d);
    }, (e) => setError(String(e)));
  }, [id]);

  if (error) return <pre style={{ padding: 16, whiteSpace: 'pre-wrap' }}>{error}</pre>;
  if (!def) return <p style={{ padding: 16 }}>Loading…</p>;
  const Test = def.component;
  const Demo = def.Demo;
  return (
    <div className="app harness" data-harness={def.id}>
      <header className="harness-head">
        <strong>{def.name}</strong> · {mode}
        {firstRun ? ' · first run' : ''} · progress {Math.round(progress * 100)}%
        {def.interruption === 'B' && (
          <button type="button" className="pad-tool" data-harness-pause onClick={() => setPaused((p) => !p)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
        <button
          type="button"
          className="pad-tool"
          data-harness-restart
          onClick={() => {
            setOutcome(null);
            setProgress(0);
            setRunKey((k) => k + 1);
            setStage('run');
          }}
        >
          Restart
        </button>
      </header>
      {stage === 'intro' && (
        <section className="harness-intro">
          <Demo />
          <ul>
            {def.instructions.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <button type="button" className="primary-btn" data-harness-start onClick={() => setStage('run')}>
            Start
          </button>
        </section>
      )}
      {stage === 'run' && !outcome && (
        <main className="harness-stage">
          <Test
            key={runKey}
            mode={mode}
            firstRun={firstRun}
            seed={seed}
            paused={paused}
            ctx={currentRefContext()}
            onProgress={setProgress}
            onFinish={(o) => setOutcome(o)}
            requestPause={setPaused}
          />
          {paused && <div className="harness-paused">Paused</div>}
        </main>
      )}
      {outcome && (
        <pre className="harness-outcome" data-harness-outcome>
          {JSON.stringify({ ...outcome, trialLog: outcome.trialLog?.slice(0, 5) }, null, 2)}
        </pre>
      )}
    </div>
  );
}
