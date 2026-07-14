import type { TutorialStep } from '../../platform/types';

/** A miniature stimulus: the word in one colour, painted in another. */
const Stim = ({ word, ink, flip, tag }: { word: string; ink: string; flip?: boolean; tag?: string }) => (
  <span className={`stp-tut-stim ${flip ? 'flip' : ''}`}>
    {tag && <span className="stp-tut-tag">{tag}</span>}
    <b style={{ color: `var(${ink})` }}>{word}</b>
  </span>
);

const Swatch = ({ token, label }: { token: string; label: string }) => (
  <span className="stp-tut-swatch">
    <i style={{ background: `var(${token})` }} />
    {label}
  </span>
);

export const stroopMatchTutorial: TutorialStep[] = [
  {
    title: 'Read the ink, not the word',
    text: 'A colour word appears, but it is painted in a different colour. Here the word says BLUE, yet the ink is red.',
    art: <Stim word="BLUE" ink="--play-2" />
  },
  {
    title: 'Tap the ink colour',
    text: 'Pick the answer button that matches the INK. Every button shows a colour, its name and a shape, so it stays readable.',
    art: (
      <div className="tut-row">
        <Stim word="BLUE" ink="--play-2" />
        <span className="tut-arrow">→</span>
        <Swatch token="--play-2" label="RED" />
      </div>
    )
  },
  {
    title: 'Beat the clock, keep a streak',
    text: 'A ring drains around the stimulus — answer before it empties. Each correct tap builds your streak for bigger points; a wrong tap or a timeout costs a life.',
    art: (
      <div className="tut-row">
        <span className="chip good">Streak ×2.5</span>
        <span className="chip">Fast = bonus</span>
        <span className="chip bad">Miss = −1 life</span>
      </div>
    )
  },
  {
    title: 'Watch for rule flips',
    text: 'On tougher tiers a framed WORD tag means the rule flipped: tap the colour the word NAMES instead of its ink. An ODD tag means tap the colour that is neither.',
    art: (
      <div className="tut-row">
        <Stim word="GREEN" ink="--play-2" flip tag="WORD" />
        <span className="tut-arrow">→</span>
        <Swatch token="--play-1" label="GREEN" />
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Relaxed timer, the always-on rule label, Skip (free pass, no points) and 50/50 (greys two wrong buttons) all make it easier — and all count as help, so a clean win means none were used.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Rule label · Slow timer</span>
        <span className="chip">Skip · 50/50</span>
      </div>
    )
  }
];
