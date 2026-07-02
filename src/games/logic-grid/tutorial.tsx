import type { TutorialStep } from '../../platform/types';

export const logicGridTutorial: TutorialStep[] = [
  {
    title: 'Match every category',
    text: 'Each person has exactly one item from every category — one pet, one drink, and so on. Use the clues to work out every pairing on the grid.',
    art: (
      <div className="tut-col">
        <span className="chip accent">Alice · dog · tea</span>
        <span className="chip">Bruno · cat · coffee</span>
        <span className="chip">Carla · parrot · juice</span>
      </div>
    )
  },
  {
    title: '✕ rules out, ✓ confirms',
    text: 'Tap a cell to cycle ✕ (impossible) → ✓ (confirmed) → blank. A ✓ crosses out the rest of its row and column in that block — each item is used exactly once.',
    art: (
      <div className="tut-grid" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
        <span className="tut-cell good">✓</span>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
        <span className="tut-cell bad">✕</span>
        <span className="tut-cell" />
        <span className="tut-cell" />
      </div>
    )
  },
  {
    title: 'Read clues carefully',
    text: '"Neither…nor" rules out both options. "Either…or" rules out everything else. "A, B and C are different people" crosses out every pair among them.',
    art: (
      <div className="tut-col">
        <span className="chip">neither X nor Y → two ✕</span>
        <span className="chip">either X or Y → all others ✕</span>
        <span className="chip accent">3 different people → pairwise ✕</span>
      </div>
    )
  },
  {
    title: 'Chain your deductions',
    text: 'Facts combine across blocks: if Alice owns the dog and the dog owner drinks tea, then Alice drinks tea. When a row has a single blank left, it must be the ✓.',
    art: (
      <div className="tut-row">
        <span className="tut-cell good">✓</span>
        <span className="tut-arrow">→</span>
        <span className="tut-cell good">✓</span>
        <span className="tut-arrow">→</span>
        <span className="chip good">new fact</span>
      </div>
    )
  },
  {
    title: 'Tools & scoring',
    text: 'Tap a clue to cross it off once used. The Answers tab fills itself from your ✓ marks. Check flags wrong marks and Hint reveals a correct one — both count as help.',
    art: (
      <div className="tut-col">
        <span className="chip good">+8 per correct ✓ × size</span>
        <span className="chip accent">Hint −30 · wrong mark −10</span>
      </div>
    )
  }
];
