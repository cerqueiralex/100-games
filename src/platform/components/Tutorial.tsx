import { useState } from 'react';
import type { GameDefinition } from '../types';
import { sfx } from '../audio';

/**
 * Step-by-step illustrated "How to play" viewer. Every game provides its
 * steps via GameDefinition.tutorial (a required field — see DESIGN.md).
 */
export function TutorialModal({ game, onClose }: { game: GameDefinition; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const steps = game.tutorial;
  const s = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  const go = (delta: number) => {
    sfx.tap();
    setStep((v) => Math.max(0, Math.min(steps.length - 1, v + delta)));
  };

  return (
    <div className="tut-backdrop" onClick={onClose}>
      <div className="tut-card" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <header className="tut-header">
          <span className="tut-title">How to play {game.name}</span>
          <button className="tut-close" onClick={onClose} aria-label="Close tutorial">
            ×
          </button>
        </header>

        <div className="tut-art">{s.art}</div>

        <div className="tut-body">
          <span className="tut-step-label">
            Step {step + 1} of {steps.length}
          </span>
          <h3 className="tut-step-title">{s.title}</h3>
          <p className="tut-step-text">{s.text}</p>
        </div>

        <div className="tut-dots" aria-hidden>
          {steps.map((_, i) => (
            <button
              key={i}
              className={`tut-dot ${i === step ? 'active' : ''}`}
              onClick={() => {
                sfx.tap();
                setStep(i);
              }}
            />
          ))}
        </div>

        <div className="tut-nav">
          <button className="ghost-btn" onClick={() => go(-1)} disabled={step === 0}>
            Back
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              if (last) onClose();
              else go(1);
            }}
          >
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
