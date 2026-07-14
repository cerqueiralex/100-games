import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

const Sign = ({ ch }: { ch: string }) => (
  <span className="tut-arrow" style={{ fontWeight: 800 }}>
    {ch}
  </span>
);

export const futoshikiTutorial: TutorialStep[] = [
  {
    title: 'Every digit once',
    text: 'Fill the square so every row and every column contains each digit exactly once — 1 to 4 on a 4×4 board, up to 1 to 7 on extreme.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        {['1', '2', '3', '3', '1', '2', '2', '', '1'].map((v, i) => (
          <Cell key={i} v={v} c={v === '' ? 'sel' : ''} />
        ))}
      </div>
    )
  },
  {
    title: 'Obey the signs',
    text: 'Chevrons between cells always open toward the bigger number. Your digits must respect every sign — 2 < 4 works, 3 < 1 breaks the rule.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="2" c="good" />
          <Sign ch="<" />
          <Cell v="4" c="good" />
        </div>
        <div className="tut-row">
          <Cell v="3" c="bad" />
          <Sign ch="<" />
          <Cell v="1" c="bad" />
        </div>
      </div>
    )
  },
  {
    title: 'Tap, then type',
    text: 'Tap a cell to select it, then tap a digit on the pad. Entries that clash with a placed digit or a sign count as errors — the starting digits are locked.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="4" />
          <Cell c="sel" />
          <Cell v="1" />
        </div>
        <div className="tut-row">
          <span className="tut-key">2</span>
          <span className="tut-key active">3</span>
          <span className="tut-key">4</span>
        </div>
      </div>
    )
  },
  {
    title: 'Pencil in notes',
    text: 'Toggle Notes to jot candidate digits while you reason through the chains. With auto-cleanup on, placing a digit sweeps it from notes in that row and column.',
    art: (
      <div className="tut-row">
        <span className="tut-cell big">
          <span className="tut-notes">
            <i>1</i>
            <i />
            <i>3</i>
            <i />
            <i>4</i>
            <i />
          </span>
        </span>
        <span className="tut-arrow">→</span>
        <Cell v="3" c="good big" />
      </div>
    )
  },
  {
    title: 'Checks, hints, par time',
    text: 'Rule check paints broken signs and duplicate digits red; Hint fills one logically forced cell. Both count as help. Correct cells earn points — finish under par for a bonus.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">+40 × difficulty</span>
          <span className="chip bad">−40 conflict</span>
        </div>
        <div className="tut-row">
          <span className="chip accent">Hint −30</span>
          <span className="chip">Under par = bonus</span>
        </div>
      </div>
    )
  }
];
