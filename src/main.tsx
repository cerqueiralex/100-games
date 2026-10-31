import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const params = new URLSearchParams(location.search);

// dev-only Brain Lab benchmark harness (/?harness=<test-id>) — never in a build
const Harness = import.meta.env.DEV && params.has('harness') ? lazy(() => import('./platform/brain/Harness')) : null;

function render() {
  createRoot(document.getElementById('root')!).render(
    Harness ? (
      <Suspense fallback={null}>
        <Harness />
      </Suspense>
    ) : (
      <App />
    )
  );
}

// dev-only Brain Lab data fixture (/?brainFixture=1|fresh|reseed) — never in a build
if (import.meta.env.DEV && params.has('brainFixture')) {
  void import('./platform/brain/devFixture').then((m) => {
    m.installBrainFixture(params.get('brainFixture') ?? '1');
    render();
  });
} else {
  render();
}
