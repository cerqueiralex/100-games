import type { TutorialStep } from '../../platform/types';

export const housePuzzlesTutorial: TutorialStep[] = [
  {
    title: 'Who lives where?',
    text: 'A row of houses, each with a different color and a different resident. Every category — colors, hobbies, movies… — must be matched to exactly one house. The clues tell you how.',
    art: (
      <div className="tut-row">
        <span className="chip bad">Red 1</span>
        <span className="chip accent">Blue 2</span>
        <span className="chip good">Green 3</span>
        <span className="chip">… 4</span>
      </div>
    )
  },
  {
    title: 'Positional clues',
    text: '"The Doctor is in the second house." "The Green house is directly to the right of the Red house." "The one who loves Hiking is next to the Reader." Position is everything — left, right, adjacent, between.',
    art: (
      <div className="tut-col">
        <span className="chip">A → directly right of B</span>
        <span className="chip accent">C ↔ next to D</span>
      </div>
    )
  },
  {
    title: 'Mark the grid',
    text: 'Tap a cell to cycle ✕ (impossible) → ✓ (certain) → blank. With Auto-cross on, placing a ✓ crosses out the rest of its row and column for you. Tap a clue to strike it off once used.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(4, auto)' }}>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell good">✓</span>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Never a guess',
    text: 'Every puzzle is generated with exactly one solution reachable by pure deduction — if you are stuck, a clue still has more to give. Higher difficulties add houses, categories and twistier clues.',
    art: (
      <div className="tut-row">
        <span className="chip">easy: 4×3</span>
        <span className="chip accent">extreme: 6×5</span>
      </div>
    )
  },
  {
    title: 'Check & Hint',
    text: 'Check highlights any wrong marks (each newly found mistake costs points); Hint fixes a mistake or reveals one correct ✓. Both count as help — a clean win is pure logic.',
    art: (
      <div className="tut-row">
        <span className="chip good">✓ Check</span>
        <span className="chip accent">◉ Hint</span>
      </div>
    )
  }
];
