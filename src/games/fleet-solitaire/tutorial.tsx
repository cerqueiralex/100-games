import type { TutorialStep } from '../../platform/types';

const Cell = ({ c = '', v }: { c?: string; v?: string }) => <span className={`tut-cell ${c}`}>{v ?? ''}</span>;

export const fleetSolitaireTutorial: TutorialStep[] = [
  {
    title: 'Find the hidden fleet',
    text: 'A fleet of ships is hidden in the sea. Each ship is a straight line of cells. The numbers beside each row and column tell you how many ship cells hide in that line.',
    art: (
      <div className="tut-row">
        <span className="tut-label">row</span>
        <Cell c="lit" />
        <Cell c="lit" />
        <Cell />
        <Cell />
        <span className="chip accent">= 2</span>
      </div>
    )
  },
  {
    title: 'Tap to mark cells',
    text: 'Tap a cell to cycle it: empty → water → ship → empty. Drag across cells to paint the same mark quickly. Fill every square until the whole sea is decided.',
    art: (
      <div className="tut-row">
        <Cell />
        <span className="tut-arrow">→</span>
        <Cell c="hl" v="~" />
        <span className="tut-arrow">→</span>
        <Cell c="lit" v="▪" />
      </div>
    )
  },
  {
    title: 'Ships never touch',
    text: 'No two ships touch — not even at a corner. Every ship is fully surrounded by water. Use that to seal off water around the segments you have found.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <Cell c="lit" v="▪" />
        <Cell c="hl" v="~" />
        <Cell c="lit" v="▪" />
        <Cell c="hl" v="~" />
        <Cell c="hl" v="~" />
        <Cell c="hl" v="~" />
        <Cell />
        <Cell />
        <Cell />
      </div>
    )
  },
  {
    title: 'Check off the fleet',
    text: 'The fleet panel lists every ship to find. As you seal a ship in on all sides, its silhouette dims and checks off — so you always know what is left afloat.',
    art: (
      <div className="tut-col">
        <span className="chip good">Battleship ▪▪▪▪ — found</span>
        <span className="chip">Cruiser ▪▪▪ — afloat</span>
      </div>
    )
  },
  {
    title: 'Assists (count as help)',
    text: 'Sat-check turns the count chips green when a line is done, red when over. Auto-water floods finished lines and ship corners for you. Hint reveals one correct cell. A clean win uses none.',
    art: (
      <div className="tut-row">
        <span className="chip good">3 done</span>
        <span className="chip bad">4 over</span>
        <span className="chip accent">◎ hint</span>
      </div>
    )
  }
];
