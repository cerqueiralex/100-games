import type { TutorialStep } from '../../platform/types';

/** tiny tower for tutorial art (floors stack inside a tut-cell) */
const Tower = ({ h, c = '' }: { h: number; c?: string }) => (
  <span className={`tut-cell sky-tut ${c}`}>
    <span className="sky-tut-tower">
      {Array.from({ length: h }, (_, k) => (
        <i key={k} />
      ))}
    </span>
    <b>{h}</b>
  </span>
);

export const skyscrapersTutorial: TutorialStep[] = [
  {
    title: 'Build the skyline',
    text: 'Every row and every column holds one tower of each height 1 to N — no repeats, like a sudoku made of skyscrapers.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <Tower h={1} />
        <Tower h={3} />
        <Tower h={2} />
        <Tower h={3} />
        <Tower h={2} />
        <Tower h={1} />
        <Tower h={2} />
        <Tower h={1} />
        <Tower h={3} />
      </div>
    )
  },
  {
    title: 'Clues count what they see',
    text: 'Each edge clue looks along its row or column and counts the VISIBLE towers — taller towers hide every shorter one behind them. Here 2 sees the 2-tower, then the 3-tower hides the 1.',
    art: (
      <div className="tut-row">
        <span className="tut-key active">2 ›</span>
        <Tower h={2} c="good" />
        <Tower h={3} c="good" />
        <Tower h={1} c="dim" />
      </div>
    )
  },
  {
    title: 'Tap a cell, tap a height',
    text: 'Select a cell, then tap a height on the pad and watch the tower rise floor by floor. On hard and up, long-press a height (or toggle Notes) to pencil in candidates.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Tower h={2} />
          <span className="tut-cell sel" />
          <Tower h={1} />
        </div>
        <div className="tut-row">
          <span className="tut-key">1</span>
          <span className="tut-key">2</span>
          <span className="tut-key active">3</span>
        </div>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Clue check paints a finished line’s clues green when satisfied, red when broken. Repeats flags duplicate heights, and Hint fills a correct cell. All three are recorded as help.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">3 › satisfied</span>
          <span className="chip bad">1 › broken</span>
        </div>
        <div className="tut-row">
          <span className="chip accent">Hint fills a cell</span>
        </div>
      </div>
    )
  },
  {
    title: 'Points and par time',
    text: 'Every placed tower banks points once the skyline is solved. Flagged contradictions and hints cost points, and finishing under par earns a bonus for every second saved.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">+ per tower</span>
          <span className="chip bad">−50 contradiction</span>
        </div>
        <div className="tut-row">
          <span className="chip bad">−25 hint</span>
          <span className="chip accent">Under par = bonus</span>
        </div>
      </div>
    )
  }
];
