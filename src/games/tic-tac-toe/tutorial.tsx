import type { TutorialStep } from '../../platform/types';

const C = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${v === 'X' ? 'same' : ''} ${c}`}>{v ?? ''}</span>
);

export const ticTacToeTutorial: TutorialStep[] = [
  {
    title: 'Three in a row',
    text: 'You are X, the robot is O. Take turns placing marks — three of yours in a row, column or diagonal wins the round.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <C v="X" c="good" />
        <C v="O" />
        <C />
        <C />
        <C v="X" c="good" />
        <C v="O" />
        <C />
        <C />
        <C v="X" c="good" />
      </div>
    )
  },
  {
    title: 'First to three rounds',
    text: 'A match is a race: the first side to win three rounds takes it. Draws don’t count — you just play again, alternating who starts.',
    art: (
      <div className="tut-row">
        <span className="chip good">You 2</span>
        <span className="tut-arrow">vs</span>
        <span className="chip bad">Robot 1</span>
      </div>
    )
  },
  {
    title: 'The robot scales with difficulty',
    text: 'On easy it blunders often; on hard it plays almost perfectly, so wins are rare and precious. Rounds lost are recorded as errors in your stats.',
    art: (
      <div className="tut-row">
        <span className="chip">easy: sloppy</span>
        <span className="chip accent">hard: ruthless</span>
      </div>
    )
  },
  {
    title: 'Need a nudge?',
    text: 'Suggest move highlights the strongest square for you. It counts as help, so a clean win means you outplayed the robot alone.',
    art: (
      <div className="tut-row">
        <C />
        <C v="" c="sel" />
        <C />
      </div>
    )
  }
];
