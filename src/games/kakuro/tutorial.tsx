import type { TutorialStep } from '../../platform/types';

const Cell = ({ v, c = '' }: { v?: string; c?: string }) => (
  <span className={`tut-cell ${c}`}>{v ?? ''}</span>
);

export const kakuroTutorial: TutorialStep[] = [
  {
    title: 'A crossword of sums',
    text: 'Every white cell takes a digit 1–9. Each row and column of cells is a "run", and the small number on the dark cell before it is the sum its digits must reach.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key">16 →</span>
          <Cell v="9" />
          <Cell v="7" />
        </div>
        <div className="tut-row">
          <span className="tut-key">11 →</span>
          <Cell v="8" />
          <Cell c="sel" />
          <Cell v="1" />
        </div>
      </div>
    )
  },
  {
    title: 'No repeats in a run',
    text: 'Digits inside one run must all be different: 16 in two cells is never 8+8 — it can only be 7+9. Short sums like 3, 4, 16 and 17 are your strongest footholds.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="8" c="bad" />
          <Cell v="8" c="bad" />
          <span className="tut-arrow">→</span>
          <Cell v="7" c="good" />
          <Cell v="9" c="good" />
        </div>
        <div className="tut-row">
          <span className="chip accent">16 in 2 = 7+9 only</span>
        </div>
      </div>
    )
  },
  {
    title: 'Select, then place',
    text: 'Tap a cell to light up its across and down runs — their clues show live progress like 9/16. Tap a digit on the pad to place it; Notes pencils in candidates instead.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell c="hl" v="4" />
          <Cell c="sel" />
          <Cell c="hl" />
        </div>
        <div className="tut-row">
          <span className="tut-key">5</span>
          <span className="tut-key active">7</span>
          <span className="tut-key">9</span>
        </div>
      </div>
    )
  },
  {
    title: 'Check and combos',
    text: 'With Check on, a finished run turns green when its sum works and red when it does not. Combos lists every digit set that can still make the selected run. Both count as help.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <Cell v="9" c="good" />
          <Cell v="7" c="good" />
          <span className="tut-arrow">·</span>
          <Cell v="5" c="bad" />
          <Cell v="5" c="bad" />
        </div>
        <div className="tut-row">
          <span className="chip">12 in 2 → 39 · 48 · 57</span>
        </div>
      </div>
    )
  },
  {
    title: 'Points and par time',
    text: 'Correct cells earn points; a placement that breaks a completed run costs you, and hints cost more. Solve the whole grid — under par time — for a big bonus.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="chip good">+ correct cell</span>
          <span className="chip bad">− broken run</span>
        </div>
        <div className="tut-row">
          <span className="chip accent">Hints cost points</span>
          <span className="chip">Under par = bonus</span>
        </div>
      </div>
    )
  }
];
