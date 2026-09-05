import type { TutorialStep } from '../../platform/types';

export const blockDropTutorial: TutorialStep[] = [
  {
    title: 'Fill rows to clear them',
    text: 'Pieces fall into a 10-wide well. Slide and turn each one so it lands where it fits — a row with no gaps clears, and everything above drops down.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini sel" />
          <span className="tut-cell mini good" />
          <span className="tut-cell mini good" />
        </div>
        <span className="tut-label">full row → cleared</span>
      </div>
    )
  },
  {
    title: 'Move, turn, drop',
    text: 'Use the buttons, the arrow keys (↑ or X turns, Z turns back, Space hard-drops, C holds) — or touch the well: drag sideways to move, tap to turn, flick down to drop.',
    art: (
      <div className="tut-col">
        <div className="tut-row">
          <span className="tut-key">◀</span>
          <span className="tut-key">▼</span>
          <span className="tut-key">▶</span>
          <span className="tut-key">↻</span>
        </div>
        <div className="tut-row">
          <span className="tut-key wide">Hold</span>
          <span className="tut-key wide">Drop</span>
        </div>
      </div>
    )
  },
  {
    title: 'The ghost shows the landing',
    text: 'The faint outline is where the piece will land. Hard drop slams it there at once for extra points; holding Down lowers it a row at a time.',
    art: (
      <div className="tut-row">
        <span className="tut-cell sel">▣</span>
        <span className="tut-arrow">↓</span>
        <span className="tut-cell ghost" />
        <span className="tut-label">ghost</span>
      </div>
    )
  },
  {
    title: 'Hold and preview',
    text: 'Hold parks the current piece for later (once per piece) and the queue shows the next three. Pieces come in bags of seven — every shape appears once per bag.',
    art: (
      <div className="tut-row">
        <span className="chip accent">HOLD</span>
        <span className="tut-arrow">⇄</span>
        <span className="chip">NEXT · 3</span>
      </div>
    )
  },
  {
    title: 'Lines, levels, score',
    text: 'Clear the tier’s line target to win: 10 on easy up to 50 on extreme. Every 10 lines is a level, and each level falls faster. Four lines at once pay the most — 800 × level.',
    art: (
      <div className="tut-row">
        <span className="chip">1 · 100</span>
        <span className="chip">2 · 300</span>
        <span className="chip">3 · 500</span>
        <span className="chip good">4 · 800</span>
      </div>
    )
  },
  {
    title: 'Assists',
    text: 'Slow gravity keeps pieces falling at two-thirds speed all run; Undo takes back your last placed piece (three per game). Both count as help.',
    art: (
      <div className="tut-row">
        <span className="chip accent">Slow gravity</span>
        <span className="chip accent">Undo (3)</span>
      </div>
    )
  }
];
