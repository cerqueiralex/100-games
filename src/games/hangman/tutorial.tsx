import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const hangmanTutorial: TutorialStep[] = [
  {
    title: 'Guess the word',
    text: 'A word from a themed category is hidden, one blank per letter. The category is your clue — on the top tiers it stays a mystery.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="T" />
          <Cell c="ghost" />
          <Cell v="G" />
          <Cell c="ghost" />
          <Cell v="R" />
        </div>
        <span className="chip accent">Animals</span>
      </div>
    )
  },
  {
    title: 'Tap a letter',
    text: 'Pick letters from the A–Z pad. A correct letter fills every spot it appears in; a used key locks in — green if it was in the word, red if not.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key">R</span>
          <span className="tut-key active">S</span>
          <span className="tut-key">E</span>
        </div>
        <div className="tut-row">
          <Cell v="I" c="good" />
          <span className="tut-label">in word</span>
          <Cell v="Z" c="bad" />
          <span className="tut-label">missed</span>
        </div>
      </div>
    )
  },
  {
    title: 'Mind the balloon',
    text: 'Every wrong letter deflates and lowers the balloon a stage. Empty all your lives and it pops — reveal the word first and it soars away!',
    art: (
      <div className="tut-row">
        <span className="chip bad">wrong</span>
        <span className="tut-arrow">↓</span>
        <span className="chip muted">sinks</span>
        <span className="tut-arrow">·</span>
        <span className="chip good">solved</span>
        <span className="tut-arrow">↑</span>
        <span className="chip accent">soars</span>
      </div>
    )
  },
  {
    title: 'Helpers cost points',
    text: 'Vowel peeks reveal a hidden vowel, Category unmasks the theme on the hardest tiers, and Safe-first forgives your very first miss. Each one counts as help.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Vowel</span>
        <span className="chip accent">Category</span>
        <span className="chip">Safe-first</span>
      </div>
    )
  }
];
