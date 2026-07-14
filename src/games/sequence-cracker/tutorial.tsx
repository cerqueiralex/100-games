import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const sequenceCrackerTutorial: TutorialStep[] = [
  {
    title: 'Find the rule',
    text: 'Each puzzle shows a number sequence with its last term hidden. Work out the pattern, then supply the missing number in the glowing slot.',
    art: (
      <div className="tut-row">
        <Cell v="2" />
        <span className="tut-arrow">→</span>
        <Cell v="4" />
        <span className="tut-arrow">→</span>
        <Cell v="8" />
        <span className="tut-arrow">→</span>
        <Cell v="?" c="sel" />
      </div>
    )
  },
  {
    title: 'Pick it or type it',
    text: 'On easy rounds, tap the right number from four options. On harder rounds a keypad appears — type the answer (the − key handles negatives) and press Enter.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key">12</span>
          <span className="tut-key active">16</span>
          <span className="tut-key">15</span>
          <span className="tut-key">32</span>
        </div>
        <span className="tut-label">4, 8, 12, ? → 16</span>
      </div>
    )
  },
  {
    title: 'Six kinds of rule',
    text: 'Add a constant, multiply, sum the previous two, growing gaps, an ×then+ chain, or two series woven together. Higher tiers mix in the trickier families.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip">+3 each step</span>
          <span className="chip">×2 each step</span>
        </div>
        <div className="tut-row">
          <span className="chip">gaps grow</span>
          <span className="chip">sum of two</span>
        </div>
      </div>
    )
  },
  {
    title: 'Solve, streak, survive',
    text: 'Clear the round by solving your target of puzzles. Each solve scores points and builds a streak bonus; a wrong answer costs a life and reveals the rule.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">+ solved</span>
          <span className="chip accent">streak ×</span>
          <span className="chip bad">−1 life</span>
        </div>
        <div className="tut-row">
          <Cell v="1" />
          <Cell v="3" />
          <Cell v="5" />
          <Cell v="7" c="good" />
        </div>
      </div>
    )
  },
  {
    title: 'Assists, counted as help',
    text: 'Diffs prints the gap between terms, Rule names the family, and Narrow keeps rules to add/multiply only. Handy — but a clean win uses none of them.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Diffs +4 +4 ?</span>
        <span className="chip accent">Rule</span>
        <span className="chip accent">Narrow</span>
      </div>
    )
  }
];
