import type { TutorialStep } from '../../platform/types';

const Cell = ({ guess, cipher, c = '' }: { guess?: string; cipher: string; c?: string }) => (
  <span className={`tut-col cg-demo ${c}`} style={{ gap: 2 }}>
    <span className={`tut-cell mini ${c}`}>{guess ?? ''}</span>
    <span className="tut-label">{cipher}</span>
  </span>
);

export const cryptogramTutorial: TutorialStep[] = [
  {
    title: 'A secret alphabet',
    text: 'A famous phrase is encrypted: every letter of the alphabet has been swapped for another. Crack the code to read it.',
    art: (
      <div className="tut-row">
        <Cell cipher="Q" guess="C" c="good" />
        <Cell cipher="M" guess="A" c="good" />
        <Cell cipher="X" guess="T" c="good" />
        <span className="tut-arrow">←</span>
        <span className="chip">Q M X</span>
      </div>
    )
  },
  {
    title: 'Decode letter by letter',
    text: 'Tap any cell to select its cipher letter — every occurrence highlights. Type your guess and it fills in everywhere at once.',
    art: (
      <div className="tut-row">
        <Cell cipher="M" guess="A" c="sel" />
        <Cell cipher="X" />
        <Cell cipher="M" guess="A" c="sel" />
        <Cell cipher="R" />
      </div>
    )
  },
  {
    title: 'Look for patterns',
    text: 'Short words, repeated letters and common endings are your clues. The frequency assist shows how often each cipher letter appears.',
    art: (
      <div className="tut-row">
        <span className="chip accent">E·7</span>
        <span className="chip">T·5</span>
        <span className="chip">A·4</span>
        <span className="chip">Q·1</span>
      </div>
    )
  },
  {
    title: 'Solve the whole phrase',
    text: 'The game is won when every letter is decoded. Auto-check flags wrong guesses (counts as help); Reveal letter unlocks one mapping for −25 points.',
    art: (
      <div className="tut-col">
        <span className="tut-big">A → Z</span>
        <span className="chip good">phrase decoded — you win</span>
      </div>
    )
  }
];
