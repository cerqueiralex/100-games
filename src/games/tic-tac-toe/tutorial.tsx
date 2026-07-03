import type { TutorialStep } from '../../platform/types';

const C = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${v === 'X' ? 'same' : ''} ${c}`}>{v ?? ''}</span>
);

export const ticTacToeTutorial: TutorialStep[] = [
  {
    title: 'Three in a row',
    text: 'Take turns placing marks — three of yours in a row, column or diagonal wins the round. Play the robot, or pass the phone to a friend.',
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
    title: 'Set up your match',
    text: 'Before playing, choose your opponent — the robot, or a friend sharing this phone — pick cross or circle, and set how many rounds to play. Cross opens the first round and the opener alternates each round.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Robot</span>
        <span className="tut-arrow">or</span>
        <span className="chip accent">2 players</span>
      </div>
    )
  },
  {
    title: 'Most round wins takes it',
    text: 'When every round is played, the side with more round wins takes the match. Draws use up a round; a tied final score goes to sudden death — the next round win decides it.',
    art: (
      <div className="tut-row">
        <span className="chip good">You 3</span>
        <span className="tut-arrow">vs</span>
        <span className="chip bad">Robot 2</span>
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
