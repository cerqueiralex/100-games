import type { TutorialStep } from '../../platform/types';

/** a mini playing card built on the .tut-cell primitive */
const TC = ({ v, red, down, dim }: { v?: string; red?: boolean; down?: boolean; dim?: boolean }) => (
  <span className={['tut-cell', 'klon-tc', red ? 'red' : 'black', down ? 'down' : '', dim ? 'dim' : ''].filter(Boolean).join(' ')}>
    {down ? '' : v}
  </span>
);

export const klondikeTutorial: TutorialStep[] = [
  {
    title: 'Build up from the Ace',
    text: 'Win by moving all 52 cards to the four foundations. Each foundation takes one suit and builds up in order: Ace, 2, 3 … all the way to King.',
    art: (
      <div className="tut-row">
        <TC v="A♠" />
        <span className="tut-arrow">→</span>
        <TC v="2♠" />
        <span className="tut-arrow">→</span>
        <TC v="3♠" />
        <span className="chip accent">up by suit</span>
      </div>
    )
  },
  {
    title: 'Stack down, alternate colors',
    text: 'On the tableau, cards build DOWN in alternating colors — a red six goes on a black seven. Drag a single card or a whole ordered run onto a legal column.',
    art: (
      <div className="tut-row">
        <TC v="7♠" />
        <TC v="6♥" red />
        <TC v="5♣" />
        <span className="tut-arrow">↓</span>
        <span className="chip">red on black on red…</span>
      </div>
    )
  },
  {
    title: 'Kings & hidden cards',
    text: 'Only a King may move to an empty column. Emptying a spot or clearing a card flips the face-down card beneath it face up — that is how you dig out the deck.',
    art: (
      <div className="tut-row">
        <TC down />
        <TC down />
        <TC v="K♥" red />
        <span className="tut-arrow">→</span>
        <span className="chip good">flip &amp; reveal</span>
      </div>
    )
  },
  {
    title: 'Draw from the stock',
    text: 'Tap the stock to turn cards onto the waste pile (one at a time on easy/medium, three at a time on hard and up). Tap the empty stock to recycle it — redeals are limited on the harder tiers. Double-tap any card to send it straight to its foundation.',
    art: (
      <div className="tut-row">
        <TC down />
        <span className="tut-arrow">→</span>
        <TC v="9♦" red />
        <span className="chip accent">double-tap ⤒ foundation</span>
      </div>
    )
  },
  {
    title: 'Assists count as help',
    text: 'Easy & medium deals are solver-verified winnable (shown by the badge). Hint highlights a useful move, Undo takes moves back, and Auto sends safe cards up and offers one-tap finish. A clean win uses none of them.',
    art: (
      <div className="tut-row">
        <span className="tut-key">Hint</span>
        <span className="tut-key">Undo</span>
        <span className="tut-key active">Auto</span>
        <span className="chip good">Winnable</span>
      </div>
    )
  }
];
