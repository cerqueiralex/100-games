import type { TutorialStep } from '../../platform/types';

/** a tiny connect-four cell for the tutorial art (composed from .tut-* + chip tones) */
const Slot = ({ tone }: { tone?: 'r' | 'y' | 'good' }) => (
  <span className={`tut-cell c4-tut-slot ${tone ?? ''}`} />
);

export const connectFourTutorial: TutorialStep[] = [
  {
    title: 'Drop and connect four',
    text: 'Take turns dropping discs into the columns. Get four of your colour in a row — across, up, or diagonally — to win the round.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <Slot tone="good" />
        <Slot tone="good" />
        <Slot tone="good" />
        <Slot tone="good" />
        <Slot tone="y" />
        <Slot tone="r" />
        <Slot tone="y" />
        <Slot />
      </div>
    )
  },
  {
    title: 'Gravity does the rest',
    text: 'Tap a column, or its arrow, and the disc falls to the lowest empty slot. A full column is closed off.',
    art: (
      <div className="tut-row">
        <span className="tut-arrow">↓</span>
        <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(2, auto)' }}>
          <Slot />
          <Slot tone="r" />
          <Slot tone="y" />
          <Slot tone="r" />
        </div>
      </div>
    )
  },
  {
    title: 'Robot or a friend',
    text: 'Play the robot — sloppy on easy, ruthless on higher tiers — or pass the phone to a friend. Pick your colour and the number of rounds first.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Robot</span>
        <span className="tut-arrow">or</span>
        <span className="chip accent">2 players</span>
      </div>
    )
  },
  {
    title: 'Most rounds takes it',
    text: 'Win the most rounds to take the match. A drawn board uses up a round; a tied final score goes to sudden death. Rounds the robot wins count as errors.',
    art: (
      <div className="tut-row">
        <span className="chip good">You 3</span>
        <span className="tut-arrow">vs</span>
        <span className="chip bad">Robot 2</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Suggest points to a strong column (vs the robot); Block warning lights up a column where your opponent would win next. A clean win uses neither.',
    art: (
      <div className="tut-row">
        <Slot />
        <Slot tone="good" />
        <Slot />
      </div>
    )
  }
];
