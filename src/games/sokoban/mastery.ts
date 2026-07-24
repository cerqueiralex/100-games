import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Sokoban" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Sokoban ("warehouse keeper") was created by Hiroyuki Imabayashi in Japan in 1981 and published by Thinking Rabbit in 1982. It became a worldwide standard of puzzle design and a benchmark problem in artificial intelligence — solving general Sokoban levels is PSPACE-complete.',
  intro:
    'Mastery is deadlock literacy. Pushes are irreversible in a way moves are not: one crate nudged into a bad corner ends the level silently, ten moves before you notice. Strong players classify every square as safe or deadly before pushing anything, then solve goals in an order that never blocks a later route.',
  sections: [
    {
      title: 'Learn the deadlocks cold',
      art: {
        kind: 'grid',
        rows: ['####', '#📦.', '#...'],
        caption: 'A crate in a wall corner (off a goal) is dead — the level is silently lost'
      },
      bullets: [
        '💀 Corner deadlock: a crate pushed into any wall corner (not on a goal) is dead — the level is lost, restart or undo now.',
        '🧱 Wall deadlock: a crate against a wall can only slide along it; if no goal lies along that wall segment, touching the wall is death.',
        '🥶 Freeze deadlock: two crates side-by-side against a wall, or four in a 2×2 block, can never separate — watch for pushes that CREATE these shapes one move later.'
      ]
    },
    {
      title: 'Plan goal order backwards',
      art: {
        kind: 'grid',
        rows: ['####', '#12.', '####'],
        caption: 'Fill the deepest goal (1) before the front one (2) — front-first walls off the corridor'
      },
      bullets: [
        '🕳️ Fill the deepest goals first: a crate parked on a front goal often walls off the corridor to the back ones.',
        '🚶 For each crate–goal pairing, walk the push path mentally AND check you can reach every pushing position — the player\'s route matters as much as the crate\'s.',
        '🚦 When two crates share a corridor, decide which passes first before touching either; corridor order mistakes are the subtle half of lost games.'
      ]
    },
    {
      title: 'Think in pushes, not steps',
      art: {
        kind: 'grid',
        rows: ['.↓.', '.📦.', '...'],
        caption: 'To push down you must stand above — check the pushing square is reachable first'
      },
      bullets: [
        '🎯 Score par counts pushes: plan each crate\'s FULL push sequence, then walk to execute — improvised half-pushes are what bloat totals.',
        '🔄 To turn a crate\'s direction you must get behind its new side: check that side is reachable BEFORE the push that commits you.',
        '🅿️ Park crates on "junction" squares (reachable from all four sides) when a wait is needed — never in corridors.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'row',
        items: ['🏁 final board', '>', 'last crate in?', '>', 'keep its route clear'],
        caption: 'Solve the ending first — the last crate\'s route must stay open all game'
      },
      bullets: [
        '⏪ Work backwards from the finished position: which crate must have arrived LAST? Its route tells you what must stay clear until the end.',
        '🔀 A level that feels impossible usually has one crate whose only safe path crosses another\'s goal — find the interference pair and reorder.',
        '🔬 Use undo as an analysis tool, not an eraser: after undoing, say what deadlock you just avoided — naming it inoculates against it.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '📦🧠🔁',
        caption: 'Every level is provably solvable — a wall you hit is ordering, never the generator'
      },
      bullets: [
        '✅ These levels are built by reverse construction and always solvable — any wall you hit is ordering or deadlock, never the generator; that certainty is your license to analyze harder.',
        '📉 Push-par ratios in your history measure planning: replay a level immediately after winning it and try to shave pushes — second attempts teach economy fast.',
        '🪜 Move up tiers when your first-attempt deadlock rate drops near zero; bigger boards multiply consequences, not concepts.'
      ]
    }
  ],
  references: [
    {
      label: 'Sokoban — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sokoban',
      note: 'history, deadlock theory and the game\'s role in AI research'
    },
    {
      label: 'PSPACE-completeness — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/PSPACE-complete',
      note: 'why general Sokoban is provably hard'
    }
  ]
};
