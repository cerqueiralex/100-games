import type { TutorialStep } from '../../platform/types';

export const anagramSprintTutorial: TutorialStep[] = [
  {
    title: 'Unscramble the word',
    text: 'Every round shows shuffled letter tiles. Tap a tile (or type it) and it flies up into the next open slot. Tap a placed tile to send it back.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell good">O</span>
          <span className="tut-cell good">C</span>
          <span className="tut-cell good">E</span>
          <span className="tut-cell good">A</span>
          <span className="tut-cell good">N</span>
        </div>
        <div className="tut-row">
          <span className="tut-key">N</span>
          <span className="tut-key">A</span>
          <span className="tut-key">E</span>
          <span className="tut-key">C</span>
          <span className="tut-key">O</span>
        </div>
      </div>
    )
  },
  {
    title: 'Fill it to submit',
    text: 'When the last slot fills, the word checks itself. Right: it flies to your solved stack and the next word deals in. Wrong: the tiles shake back and the clock loses 3 seconds.',
    art: (
      <div className="tut-row">
        <span className="chip good">RIGHT → next word</span>
        <span className="tut-arrow">·</span>
        <span className="chip bad">WRONG → −3s</span>
      </div>
    )
  },
  {
    title: 'Race the clock',
    text: 'Solve your target number of words before the timer bar empties to win. Under ten seconds it turns red — keep going. Solve fast and the leftover time becomes bonus points.',
    art: (
      <div className="tut-col">
        <span className="tut-big">8 / 8</span>
        <span className="chip accent">beat the quota before time runs out</span>
      </div>
    )
  },
  {
    title: 'Build a streak',
    text: 'Solving words back to back without a skip or a wrong answer lights the flame: three in a row scores ×1.5, six in a row ×2. Shuffle rearranges the tiles any time — it is free.',
    art: (
      <div className="tut-row">
        <span className="chip accent">streak ×1.5</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">streak ×2</span>
      </div>
    )
  },
  {
    title: 'Tools & help',
    text: 'Skip jumps to a new word for a points cost. Turn on Hint to lock the next correct letter into place (counts as help), and First letter softly glows the tile the word starts with.',
    art: (
      <div className="tut-row">
        <span className="tut-key wide">Skip</span>
        <span className="tut-key wide">Hint</span>
        <span className="tut-cell sel">O</span>
      </div>
    )
  }
];
