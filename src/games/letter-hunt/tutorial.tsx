import type { TutorialStep } from '../../platform/types';

export const letterHuntTutorial: TutorialStep[] = [
  {
    title: 'Swipe to spell',
    text: 'Press a letter and DRAG through neighbouring tiles — any of the 8 directions — to build a word. Release to submit it. Each tile can be used only once per word.',
    art: (
      <div className="tut-col">
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          <span className="tut-cell sel">C</span>
          <span className="tut-cell">O</span>
          <span className="tut-cell">R</span>
          <span className="tut-cell">T</span>
          <span className="tut-cell sel">A</span>
          <span className="tut-cell">E</span>
          <span className="tut-cell">S</span>
          <span className="tut-cell">L</span>
          <span className="tut-cell sel">T</span>
        </div>
        <span className="chip accent">drag C → A → T, release ✓</span>
      </div>
    )
  },
  {
    title: 'Real words, 3+ letters',
    text: 'A word counts only if it is in the dictionary and at least three letters long (four on the top two tiers). Longer words are worth far more points.',
    art: (
      <div className="tut-row">
        <span className="chip good">CAT ✓ 10</span>
        <span className="chip good">RATE ✓ 20</span>
        <span className="chip good">STARE ✓ 40</span>
        <span className="chip bad">XZ ✗</span>
      </div>
    )
  },
  {
    title: 'Beat the clock',
    text: 'Reach the target score before the timer empties to WIN. The bar reddens and ticks in the final seconds. A wrong word is a miss; a word you already found just shakes.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-label">score</span>
          <span className="tut-big">140</span>
          <span className="tut-arrow">/</span>
          <span className="chip accent">target 120</span>
        </div>
        <span className="chip good">target beaten — keep going for bonus</span>
      </div>
    )
  },
  {
    title: 'The Qu tile',
    text: 'Q always travels with U on a single "Qu" tile, so one tap spells both letters — QUIZ, SQUAD, QUICK. Drag through it like any other tile.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big sel">Qu</span>
        <span className="tut-cell">I</span>
        <span className="tut-cell">Z</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">QUIZ</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Word count shows how many words the board hides. Flash pulses a starting tile when you stall. Reveal draws a whole word as a ghost trail. Using any of these means the win is not clean.',
    art: (
      <div className="tut-row">
        <span className="chip">Words 3 / 48</span>
        <span className="chip accent">Flash</span>
        <span className="chip accent">Reveal</span>
      </div>
    )
  }
];
