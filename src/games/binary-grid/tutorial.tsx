import type { TutorialStep } from '../../platform/types';

/** Mini sun/moon marks for tutorial art — game content colored from --play-*. */
function Sun({ dim }: { dim?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ color: 'var(--play-3)', opacity: dim ? 0.45 : 1 }}
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M12 2.4v2.8M12 18.8v2.8M2.4 12h2.8M18.8 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2" />
      </g>
    </svg>
  );
}

function Moon({ dim }: { dim?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      style={{ color: 'var(--play-6)', opacity: dim ? 0.45 : 1 }}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
    </svg>
  );
}

export const binaryGridTutorial: TutorialStep[] = [
  {
    title: 'Fill the whole grid',
    text: 'Every cell holds a sun or a moon. Tap a cell to cycle sun → moon → empty. Locked cells are givens — the puzzle always has exactly one solution.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <span className="tut-cell"><Sun /></span>
        <span className="tut-cell hl"><Moon /></span>
        <span className="tut-cell" />
        <span className="tut-cell hl"><Sun /></span>
        <span className="tut-cell hl"><Moon /></span>
        <span className="tut-cell" />
        <span className="tut-cell sel" />
        <span className="tut-cell hl"><Moon /></span>
        <span className="tut-cell" />
        <span className="tut-cell hl"><Sun /></span>
        <span className="tut-cell"><Sun /></span>
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Never three in a row',
    text: 'Three identical symbols may never touch in a line — two together always force the opposite symbol on both sides.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell"><Sun /></span>
          <span className="tut-cell"><Sun /></span>
          <span className="tut-cell bad"><Sun /></span>
        </div>
        <div className="tut-row">
          <span className="tut-cell"><Sun /></span>
          <span className="tut-cell"><Sun /></span>
          <span className="tut-cell good"><Moon /></span>
        </div>
      </div>
    )
  },
  {
    title: 'Balance every line',
    text: 'Each row and each column ends with the same number of suns and moons — half and half. A line that has all its suns fills the rest with moons.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell"><Sun /></span>
          <span className="tut-cell"><Moon /></span>
          <span className="tut-cell"><Moon /></span>
          <span className="tut-cell"><Sun /></span>
        </div>
        <span className="chip good">2 suns = 2 moons</span>
      </div>
    )
  },
  {
    title: 'No twin lines',
    text: 'On Hard, Pro and Extreme one extra rule applies: no two rows may be identical, and no two columns either.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell mini"><Sun dim /></span>
          <span className="tut-cell mini"><Moon dim /></span>
          <span className="tut-cell mini"><Sun dim /></span>
          <span className="tut-cell mini"><Moon dim /></span>
        </div>
        <div className="tut-row">
          <span className="tut-cell mini bad"><Sun dim /></span>
          <span className="tut-cell mini bad"><Moon dim /></span>
          <span className="tut-cell mini bad"><Sun dim /></span>
          <span className="tut-cell mini bad"><Moon dim /></span>
        </div>
        <span className="chip bad">Same row twice</span>
      </div>
    )
  },
  {
    title: 'Score and help',
    text: 'Every placed cell scores points, with a time bonus under par. Rule-break highlights and the row/column counters count as help; the Hint fills one forced cell and explains why (−25).',
    art: (
      <div className="tut-col">
        <span className="chip good">+5 per cell × difficulty</span>
        <span className="chip accent">Counters & highlights = help</span>
        <span className="chip accent">Hint −25</span>
      </div>
    )
  }
];
