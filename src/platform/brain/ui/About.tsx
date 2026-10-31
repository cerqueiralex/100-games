import { useEffect, useState, type CSSProperties } from 'react';
import { BRAIN_DISCLAIMER, BRAIN_DOMAINS, BRAIN_ONBOARDING, TRAINING_EVIDENCE } from '../domains';
import { benchmarkFor } from '../registry';
import { setBrainSettings } from '../store';
import { notifyBrainChanged } from './useBrainStore';
import { CLAIMS, SCORING_STEPS } from './copy';
import { Sheet } from './Sheet';
import { sfx } from '../../audio';
import { BrainIcon, CheckIcon, InfoIcon } from '../../design/icons';
import { BASELINE_N } from '../analytics';

/**
 * The Brain Lab "About" sheet (onboarding copy, the verbatim disclaimer, the
 * evidence panel, how scoring works, the claims and the optional birth year)
 * and the first-open welcome. SCIENCE.md §3.1, §3.2, §4.2 — the disclaimer
 * and onboarding strings come from domains.ts verbatim and are never edited
 * here.
 */

export function Disclaimer() {
  return (
    <p className="bl-disclaimer">
      <InfoIcon size={16} />
      <span>{BRAIN_DISCLAIMER}</span>
    </p>
  );
}

/** "What training can and can't do" (SCIENCE.md §3.2) */
export function EvidencePanel({ only }: { only?: string[] }) {
  const items = only ? TRAINING_EVIDENCE.filter((e) => only.includes(e.title)) : TRAINING_EVIDENCE;
  return (
    <ol className="bl-evidence">
      {items.map((e) => (
        <li key={e.title}>
          <strong>{e.title}</strong>
          <span>{e.body}</span>
          <cite>{e.cite}</cite>
        </li>
      ))}
    </ol>
  );
}

/** the optional birth year — Memory and Reaction anchors only, stays on the device */
function BirthYear({ value }: { value?: number }) {
  const thisYear = new Date().getFullYear();
  const [text, setText] = useState(value ? String(value) : '');
  const [saved, setSaved] = useState(false);
  useEffect(() => setText(value ? String(value) : ''), [value]);
  const n = Number(text);
  const valid = text === '' || (Number.isInteger(n) && n >= thisYear - 110 && n <= thisYear - 10);
  const commit = () => {
    if (!valid) return;
    const next = text === '' ? undefined : n;
    if (next === value) return;
    setBrainSettings({ birthYear: next });
    notifyBrainChanged();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  return (
    <div className="bl-birth">
      <label className="bl-birth-row">
        <span className="bl-birth-label">Birth year</span>
        <input
          className={`bl-input${valid ? '' : ' invalid'}`}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="Optional"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          aria-describedby="bl-birth-help"
          aria-invalid={!valid}
        />
        {saved && (
          <span className="bl-saved" role="status">
            <CheckIcon size={14} /> Saved
          </span>
        )}
      </label>
      <p id="bl-birth-help" className="bl-note">
        {valid
          ? 'Used only to pick the age-matched reference for Memory and Reaction. It stays on this device. Leave it empty to use the whole reference sample.'
          : `Enter a year between ${thisYear - 110} and ${thisYear - 10}, or leave it empty.`}
      </p>
    </div>
  );
}

export function AboutSheet({ open, onClose, birthYear }: { open: boolean; onClose: () => void; birthYear?: number }) {
  return (
    <Sheet open={open} onClose={onClose} title="About Brain Lab" kicker="How it works">
      <section className="bl-about-sec">
        <p className="bl-lead">{BRAIN_ONBOARDING}</p>
        <Disclaimer />
      </section>

      <section className="bl-about-sec">
        <h3 className="bl-h3">How scoring works</h3>
        <ol className="bl-steps-list">
          {SCORING_STEPS.map((s, i) => (
            <li key={s.title} style={{ ['--i' as string]: i } as CSSProperties}>
              <span className="bl-steps-num" aria-hidden>
                {i + 1}
              </span>
              <span>
                <strong>{s.title}</strong>
                <span>{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bl-about-sec">
        <h3 className="bl-h3">What Brain Lab never claims</h3>
        <ul className="bl-claims">
          {CLAIMS.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="bl-about-sec">
        <h3 className="bl-h3">What training can and can’t do</h3>
        <EvidencePanel />
      </section>

      <section className="bl-about-sec">
        <h3 className="bl-h3">Reference age</h3>
        <BirthYear value={birthYear} />
      </section>
    </Sheet>
  );
}

/**
 * First open: what Brain Lab is, the verbatim disclaimer, "I understand".
 * A page, not an overlay — the tab bar stays usable, so nobody is trapped
 * behind an acknowledgement they are not ready to give.
 */
export function Onboarding() {
  const ring = BRAIN_DOMAINS.map((d, i) => {
    const a = (-90 + (360 / BRAIN_DOMAINS.length) * i) * (Math.PI / 180);
    return { d, x: 50 + 38 * Math.cos(a), y: 50 + 38 * Math.sin(a), i };
  });
  return (
    <div className="bl-onboard">
      <div className="bl-onboard-art" aria-hidden>
        <svg viewBox="0 0 100 100" className="bl-onboard-orbit">
          <circle cx="50" cy="50" r="38" />
          <circle cx="50" cy="50" r="24" />
        </svg>
        {ring.map(({ d, x, y, i }) => {
          const test = benchmarkFor(d.id);
          return (
            <span
              key={d.id}
              className="bl-onboard-node"
              style={{ left: `${x}%`, top: `${y}%`, ['--area' as string]: `var(--play-${d.slot})`, ['--i' as string]: i } as CSSProperties}
            >
              {test ? <span className="bl-plate-art">{test.icon}</span> : null}
            </span>
          );
        })}
        <span className="bl-onboard-core">
          <BrainIcon size={34} />
        </span>
      </div>
      <span className="bl-kicker">Welcome to</span>
      <h1 className="bl-onboard-title">Brain Lab</h1>
      <p className="bl-lead">{BRAIN_ONBOARDING}</p>
      <ul className="bl-onboard-points">
        <li>
          <strong>Nine areas, one short test each</strong>
          <span>Each test adapts a published research paradigm and takes about two minutes.</span>
        </li>
        <li>
          <strong>Calibrate, then compare with yourself</strong>
          <span>
            After a few calibration runs, {BASELINE_N} days set your personal baseline. Changes are judged against your own
            day-to-day ups and downs.
          </span>
        </li>
        <li>
          <strong>A daily check-in of about five minutes</strong>
          <span>A few questions about sleep and stress, then Reaction plus two rotating tests.</span>
        </li>
      </ul>
      <Disclaimer />
      <button
        type="button"
        className="primary-btn bl-onboard-cta"
        onClick={() => {
          sfx.tap();
          setBrainSettings({ introAt: Date.now() });
          notifyBrainChanged();
        }}
      >
        I understand
      </button>
    </div>
  );
}
