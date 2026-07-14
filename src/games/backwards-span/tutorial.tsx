import type { TutorialStep } from '../../platform/types';

export const backwardsSpanTutorial: TutorialStep[] = [
  {
    title: 'Watch the flashes',
    text: 'A sequence of symbols flashes on the stage, one at a time. The dots below show how many are left to come — commit the whole sequence to memory.',
    art: (
      <div className="tut-col">
        <div className="tut-cell big lit">7</div>
        <div className="tut-row">
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini lit" />
          <span className="tut-cell mini" />
          <span className="tut-cell mini" />
        </div>
      </div>
    )
  },
  {
    title: 'Enter it backwards',
    text: 'When it says GO, type the sequence in REVERSE order — last symbol first. (The gentle Easy tier keeps the same order to warm you up.)',
    art: (
      <div className="tut-row">
        <div className="tut-col">
          <span className="tut-label">shown</span>
          <div className="tut-row">
            <span className="tut-cell">3</span>
            <span className="tut-cell">1</span>
            <span className="tut-cell">7</span>
          </div>
        </div>
        <span className="tut-arrow">↺</span>
        <div className="tut-col">
          <span className="tut-label">you type</span>
          <div className="tut-row">
            <span className="tut-cell sel">7</span>
            <span className="tut-cell sel">1</span>
            <span className="tut-cell sel">3</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Fill the slots',
    text: 'Tap the pad to fill the slots left to right. Backspace fixes a slip; the sequence checks itself once every slot is full (or press Enter early).',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell sel">7</span>
          <span className="tut-cell sel">1</span>
          <span className="tut-cell hl" />
        </div>
        <div className="tut-row">
          <span className="tut-key">1</span>
          <span className="tut-key active">3</span>
          <span className="tut-key">9</span>
          <span className="tut-key wide">Enter</span>
        </div>
      </div>
    )
  },
  {
    title: 'Grow your span',
    text: 'Each correct answer adds one symbol next round. Reach the target span for your tier — 7, 8 or 9 — to win the run.',
    art: (
      <div className="tut-row">
        <span className="chip">span 3</span>
        <span className="tut-arrow">→</span>
        <span className="chip">4</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">target 7</span>
      </div>
    )
  },
  {
    title: 'Lives & assists',
    text: 'A wrong answer costs a life and reveals the correct sequence. Slow flash, the direction reminder and the Replay button all make it easier — and all count as help.',
    art: (
      <div className="tut-col">
        <span className="chip good">Lives: 3</span>
        <span className="chip accent">Slow flash · Reminder · Replay = help</span>
      </div>
    )
  }
];
