import type { TutorialStep } from '../../platform/types';
import { CipherGlyph } from '../../platform/design/icons';

const Tile = ({ glyph, letter, c = '' }: { glyph: number; letter?: string; c?: string }) => (
  <span className={`tut-cell mini cg-tut ${c}`}>
    {letter ? <b>{letter}</b> : null}
    <CipherGlyph glyph={glyph} size={12} />
  </span>
);

export const cryptogramTutorial: TutorialStep[] = [
  {
    title: 'Words in disguise',
    text: 'Each row is a word described by its clue — but every letter is hidden behind a small picture. Tap a tile and type to fill it in.',
    art: (
      <div className="tut-row">
        <Tile glyph={0} letter="C" />
        <Tile glyph={7} letter="A" />
        <Tile glyph={19} />
        <Tile glyph={24} />
        <span className="tut-arrow">←</span>
        <span className="chip">a clue per row</span>
      </div>
    )
  },
  {
    title: 'Same picture, same letter',
    text: 'The pictures are a code: wherever the same symbol appears — in any word — it hides the same letter. Solve one word and you unlock letters everywhere.',
    art: (
      <div className="tut-row">
        <Tile glyph={3} letter="E" c="good" />
        <span className="tut-arrow">=</span>
        <Tile glyph={3} letter="E" c="good" />
        <span className="tut-arrow">≠</span>
        <Tile glyph={21} />
      </div>
    )
  },
  {
    title: 'Check each word',
    text: 'Fill a whole row, then press Check. Right answers lock in green; a wrong guess paints the row red and adds one error.',
    art: (
      <div className="tut-col">
        <span className="chip good">✓ correct — row turns green</span>
        <span className="chip bad">✗ wrong — +1 error, try again</span>
      </div>
    )
  },
  {
    title: 'The hidden word',
    text: 'The shaded column spells a bonus answer from top to bottom. Its clue sits above the table — guessing it early makes the rows much easier.',
    art: (
      <div className="tut-col" style={{ gap: 3 }}>
        <Tile glyph={12} letter="S" c="sel" />
        <Tile glyph={5} letter="U" c="sel" />
        <Tile glyph={16} letter="N" c="sel" />
      </div>
    )
  },
  {
    title: 'Hints & help',
    text: 'Hint reveals the selected tile (−30 points). Icon echo copies a typed letter into every tile with the same symbol. Both count as help — clean wins use neither.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Hint −30</span>
        <span className="chip">Icon echo</span>
      </div>
    )
  }
];
