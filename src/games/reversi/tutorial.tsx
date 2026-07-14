import type { TutorialStep } from '../../platform/types';

/** a felt cell holding an optional disc, for the tutorial art */
const Cell = ({ d, c = '' }: { d?: 'dark' | 'light'; c?: string }) => (
  <span className={`tut-cell rev-tut-cell ${c}`}>
    {d && <span className={`rev-tut-disc ${d}`} />}
  </span>
);

export const reversiTutorial: TutorialStep[] = [
  {
    title: 'Outflank to capture',
    text: 'Place a disc so a straight line of your opponent’s discs is trapped between the new disc and another of yours. Every disc in that line flips to your colour.',
    art: (
      <div className="tut-grid rev-tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <Cell d="dark" />
        <Cell d="light" />
        <Cell d="light" />
        <Cell c="ghost" />
      </div>
    )
  },
  {
    title: 'Lines flip every way',
    text: 'A single move can outflank in several directions at once — across, down and diagonally. All captured discs flip together in a satisfying cascade.',
    art: (
      <div className="tut-grid rev-tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <Cell d="dark" />
        <Cell d="light" />
        <Cell d="dark" />
        <Cell d="light" />
        <Cell c="ghost" />
        <Cell d="light" />
        <Cell d="dark" />
        <Cell d="light" />
        <Cell d="dark" />
      </div>
    )
  },
  {
    title: 'No move? You pass',
    text: 'Every move must flip at least one disc. If you have no legal move, your turn is skipped. When neither side can move, the game ends.',
    art: (
      <div className="tut-row">
        <span className="chip">No flip possible</span>
        <span className="tut-arrow">→</span>
        <span className="chip accent">Pass</span>
      </div>
    )
  },
  {
    title: 'Most discs wins',
    text: 'The board fills to 64 squares. Whoever owns more discs at the end wins by that margin. Corners can never be flipped — grabbing them is worth a lot.',
    art: (
      <div className="tut-row">
        <span className="chip good">You 38</span>
        <span className="tut-arrow">vs</span>
        <span className="chip bad">Robot 26</span>
      </div>
    )
  },
  {
    title: 'Robot or friend',
    text: 'Play the robot — it sharpens sharply with difficulty — or pass the phone for a two-player match. Legal-move dots, the live tally and Hint help you, and each counts as assistance.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Robot</span>
        <span className="tut-arrow">or</span>
        <span className="chip accent">2 players</span>
      </div>
    )
  }
];
