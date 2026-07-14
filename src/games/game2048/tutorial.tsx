import type { TutorialStep } from '../../platform/types';

const Tile = ({ v, c = '' }: { v: number; c?: string }) => (
  <span className={`tut-cell big g2-demo v${v} ${c}`}>{v}</span>
);

export const game2048Tutorial: TutorialStep[] = [
  {
    title: 'Swipe to slide',
    text: 'Swipe (or use the arrow keys / WASD) to slide every tile as far as it can go in that direction, all at once.',
    art: (
      <div className="tut-row">
        <Tile v={2} />
        <Tile v={4} c="dim" />
        <span className="tut-arrow">→</span>
        <span className="tut-key active">Swipe →</span>
      </div>
    )
  },
  {
    title: 'Equal tiles merge',
    text: 'When two tiles with the same number slide together they merge into their sum. Each tile can only merge once per move.',
    art: (
      <div className="tut-row">
        <Tile v={2} />
        <Tile v={2} />
        <span className="tut-arrow">→</span>
        <Tile v={4} c="pop" />
      </div>
    )
  },
  {
    title: 'A new tile drops in',
    text: 'After every move a new 2 (sometimes a 4) appears in an empty cell. The board fills up — plan ahead so you never run out of room.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Tile v={8} />
          <Tile v={16} />
          <Tile v={2} c="pop" />
        </div>
        <span className="tut-label">↑ a fresh tile</span>
      </div>
    )
  },
  {
    title: 'Reach the target',
    text: 'Build up to the target tile — 1024, 2048 or 4096 depending on difficulty — to win. You can keep merging for a higher score afterwards.',
    art: (
      <div className="tut-col">
        <Tile v={2048} c="pop" />
        <span className="chip good">target reached — you win</span>
      </div>
    )
  },
  {
    title: 'Assists when stuck',
    text: 'Undo takes back a move, Hint arrows the strongest swipe, and Easy spawns keeps every new tile a 2. Each one is recorded as help.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Undo</span>
        <span className="chip accent">Hint</span>
        <span className="chip muted">Easy spawns</span>
      </div>
    )
  }
];
