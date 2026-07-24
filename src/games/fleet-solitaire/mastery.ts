import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Fleet Finder" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Fleet Finder is Battleship solitaire (also "Bimaru" or Solitaire Battleships), a pencil-and-paper deduction variant of the classic naval game that emerged in Argentina in 1982 and was popularized worldwide by Games Magazine and the World Puzzle Championship, where it has been a staple event since the 1990s.',
  intro:
    'Mastery means treating the fleet like ink poured into counted rows: zeros drain whole lines, big ships only fit in a few slots, and every ship segment you place floods its diagonals with water. The strongest players alternate between count arithmetic and the no-touch rule until the fleet assembles itself. Every board here is deduction-only.',
  sections: [
    {
      title: 'Water first',
      art: {
        kind: 'grid',
        rows: ['u.u', '.#.', 'u.u'],
        caption: 'Every ship segment floods its four diagonal neighbors with water'
      },
      bullets: [
        '💦 Zero rows and columns are pure water — clear them before thinking about any ship.',
        '🌊 Every placed ship segment waters ALL four diagonal neighbors instantly (ships never touch, even diagonally).',
        '➡️ A revealed middle segment waters the diagonals AND tells you the ship continues on exactly one axis — the perpendicular neighbors are water.',
        '✅ When a row\'s count is satisfied, flood the rest of the row; do the same for columns after every placement.'
      ]
    },
    {
      title: 'Place the giants',
      art: {
        kind: 'grid',
        rows: ['aaaa.', '.oooo', '.###.'],
        caption: 'Two slots for the 4-ship — their overlap (dark) is certain ship'
      },
      bullets: [
        '🚢 Count legal slots for the longest unplaced ship first: runs of non-water cells of that length in rows/columns with enough remaining count. One slot = placement; two overlapping slots = the overlap cells are ship.',
        '📏 A row whose count equals its remaining open cells is all ship — fill it and cap the ends per the no-touch rule.',
        '🧭 Revealed end-caps point: the ship extends away from the rounded side; a revealed submarine (single) waters all eight neighbors.'
      ]
    },
    {
      title: 'Fleet accounting',
      art: {
        kind: 'row',
        items: ['1×4', '2×3', '3×2', '4×1'],
        caption: 'The fleet ledger — remaining sizes must sum to the remaining counts'
      },
      bullets: [
        '📋 Track the remaining fleet by size, not just cells: three unplaced 1s change what a stray single open cell can be.',
        '🧮 Sum check: remaining row counts always equal remaining fleet cells — when a region\'s possible ship cells exactly match what must go there, everything else in the region is water.',
        '💧 Segments that can no longer extend to any remaining ship length are water — orphan mid-cells are the classic trap.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['u##u.', '1uuuh'],
        caption: 'Row needs one more — the no-touch shadow leaves a single legal cell'
      },
      bullets: [
        '🔄 Re-slot the largest remaining ship from scratch — earlier water usually killed slots you still remember as open.',
        '🎯 Check rows/columns needing exactly one more cell: the no-touch rule often leaves a single legal position.',
        '📐 Work corners and edges: the diagonal rule bites hardest where the board cuts off escape room.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🚢🌊🧭',
        caption: 'Methodical, zero-error play beats speed'
      },
      bullets: [
        '🌊 Make diagonal watering an unbreakable reflex — nearly all errors on pro/extreme are forgotten diagonals, not bad logic.',
        '👀 Practice reading counts in pairs (row + column of the same cell); double-counted constraints resolve cells single counts leave open.',
        '📊 Use the profile\'s error stat as a discipline meter: this game rewards zero-error methodical play far more than speed.'
      ]
    }
  ],
  references: [
    {
      label: 'Battleship (puzzle) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Battleship_(puzzle)',
      note: 'history, rules and solving techniques of solitaire battleships'
    },
    {
      label: 'World Puzzle Championship — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/World_Puzzle_Championship',
      note: 'the competition that made Bimaru a canonical deduction puzzle'
    }
  ]
};
