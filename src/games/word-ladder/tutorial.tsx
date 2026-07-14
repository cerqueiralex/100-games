import type { TutorialStep } from '../../platform/types';

/** A word as a row of mini tiles; `hi` tints one cell, `tone` recolours all. */
const Word = ({ word, hi, tone }: { word: string; hi?: number; tone?: string }) => (
  <div className="tut-row">
    {word.split('').map((c, i) => (
      <span key={i} className={`tut-cell mini ${i === hi ? 'sel' : ''} ${tone ?? ''}`}>
        {c}
      </span>
    ))}
  </div>
);

export const wordLadderTutorial: TutorialStep[] = [
  {
    title: 'Climb the ladder',
    text: 'Turn the top word into the goal word at the bottom, one rung at a time. The goal glows at the foot of the ladder.',
    art: (
      <div className="tut-col">
        <Word word="CAT" />
        <span className="tut-arrow">↓</span>
        <Word word="DOG" tone="good" />
      </div>
    )
  },
  {
    title: 'Change one letter',
    text: 'Each rung changes exactly one letter from the word above it and must be a real word. The letter you changed lights up in the accent colour.',
    art: (
      <div className="tut-col">
        <Word word="CAT" />
        <Word word="COT" hi={1} />
        <Word word="COG" hi={2} />
      </div>
    )
  },
  {
    title: 'Type and submit',
    text: 'Tap a tile, then use the keyboard to change a letter. Press the check key to lock the rung in. Non-words, repeats and two-letter jumps are rejected with a shake.',
    art: (
      <div className="tut-col">
        <Word word="DOG" hi={2} />
        <div className="tut-row">
          <span className="tut-key">D</span>
          <span className="tut-key active">O</span>
          <span className="tut-key wide">✓</span>
        </div>
      </div>
    )
  },
  {
    title: 'Par and score',
    text: 'Par is the shortest possible ladder. Hit par for the full efficiency bonus — every extra rung, error or hint trims your score.',
    art: (
      <div className="tut-row">
        <span className="chip accent">3 steps · par 3</span>
        <span className="chip good">on par</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'The par meter shows how many rungs remain, Hint places an optimal next word, and Undo pops the last rung — all recorded as help. Give up reveals the answer and ends the round.',
    art: (
      <div className="tut-row">
        <span className="chip">2 to go</span>
        <span className="chip accent">Hint</span>
        <span className="chip accent">Undo</span>
      </div>
    )
  }
];
