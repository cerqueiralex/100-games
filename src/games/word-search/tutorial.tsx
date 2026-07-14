import type { TutorialStep } from '../../platform/types';

const Cell = ({ ch, tone }: { ch: string; tone?: 'sel' | 'same' | 'dim' | 'good' }) => (
  <span className={`tut-cell ${tone ?? ''}`}>{ch}</span>
);

export const wordSearchTutorial: TutorialStep[] = [
  {
    title: 'Words hide in the grid',
    text: 'Every board hides a themed word list in straight lines of letters. Find them all to win — the list above the board tracks your progress.',
    art: (
      <div className="tut-col">
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
          <Cell ch="F" tone="same" />
          <Cell ch="O" tone="same" />
          <Cell ch="X" tone="same" />
          <Cell ch="P" tone="dim" />
          <Cell ch="K" tone="dim" />
          <Cell ch="B" tone="dim" />
          <Cell ch="E" tone="dim" />
          <Cell ch="A" tone="dim" />
        </div>
        <span className="chip accent">Theme: Animals</span>
      </div>
    )
  },
  {
    title: 'Drag a straight line',
    text: 'Press the first letter and sweep along the word — the selection snaps to a straight ray. Easy hides words across and down; higher tiers add diagonals and reversed words.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell ch="C" tone="sel" />
          <Cell ch="A" tone="sel" />
          <Cell ch="T" tone="sel" />
          <span className="tut-arrow">→</span>
        </div>
        <span className="tut-label">easy → ↓ · hard adds ↗ ↘ and backwards</span>
      </div>
    )
  },
  {
    title: 'Lock in your finds',
    text: 'Release on the last letter. A correct word locks in with a colored capsule and is struck off the list. A wrong drag flashes red, counts as an error and breaks your streak bonus.',
    art: (
      <div className="tut-col">
        <span className="chip good">TIGER — locked in</span>
        <span className="chip bad">TIGRE — error, streak lost</span>
      </div>
    )
  },
  {
    title: 'Extreme: a mystery list',
    text: 'On extreme the list only shows each word’s length as dots. The theme and the letter count are your clues — entries reveal themselves when found.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip">······</span>
          <span className="chip">····</span>
          <span className="chip good">WHALE</span>
        </div>
        <span className="tut-label">6 and 4 letters, still hidden</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'First letters tints where remaining words start, Direction arrows shows which ways words can run, and Flash a word briefly reveals a full path (−40 points). All of them mark the win as assisted.',
    art: (
      <div className="tut-col">
        <span className="chip accent">First letters</span>
        <span className="chip accent">Direction arrows</span>
        <span className="chip accent">Flash a word −40</span>
      </div>
    )
  }
];
