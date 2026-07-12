import type { TutorialStep } from '../../platform/types';

const C = ({ c = '', v }: { c?: string; v?: string }) => <span className={`tut-cell ${c}`}>{v ?? ''}</span>;

export const battleshipTutorial: TutorialStep[] = [
  {
    title: 'Deploy your fleet',
    text: 'Place your 5 ships on the grid — pick one from the fleet list, choose across or down, and tap a cell. Tap a placed ship to move it, or let Random arrange everything. Then head to battle.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(5, auto)' }}>
        <C c="same" />
        <C c="same" />
        <C c="same" />
        <C />
        <C />
        <C />
        <C />
        <C />
        <C c="same" />
        <C />
        <C />
        <C />
        <C />
        <C c="same" />
        <C />
      </div>
    )
  },
  {
    title: 'Call your shots',
    text: 'Fire at the enemy grid by tapping a cell — the letters and numbers name each square. A splash means water; an explosion means you struck a ship, and a hit earns you another shot.',
    art: (
      <div className="tut-row">
        <span className="chip">B4 · splash</span>
        <span className="tut-arrow">→</span>
        <span className="chip bad">F6 · HIT!</span>
      </div>
    )
  },
  {
    title: 'Sink all five ships',
    text: 'The fleet panel tracks both sides: your ships show every damaged segment, and enemy ships are crossed off as you sink them. Destroy the whole enemy fleet before yours goes down.',
    art: (
      <div className="tut-col">
        <span className="chip good">Your Cruiser ▪▪▪</span>
        <span className="chip bad">Enemy Carrier — sunk</span>
      </div>
    )
  },
  {
    title: 'The enemy fires back',
    text: 'After every miss the enemy takes its turn on your waters — and just like you, it keeps firing while it hits. On easy it shoots loosely; on hard it hunts your ships with cold precision.',
    art: (
      <div className="tut-row">
        <span className="chip">easy: scattershot</span>
        <span className="chip accent">hard: relentless</span>
      </div>
    )
  },
  {
    title: 'Radar ping',
    text: 'Stuck hunting? A radar ping highlights one enemy ship cell for you to fire at. It counts as help — a clean win means you found the fleet yourself.',
    art: (
      <div className="tut-row">
        <span className="chip accent">◎ ping</span>
        <span className="tut-arrow">→</span>
        <span className="chip bad">direct hit</span>
      </div>
    )
  }
];
