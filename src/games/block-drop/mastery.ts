import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Block Drop" — strategy only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The falling-tetromino game was created by Alexey Pajitnov at the Soviet Academy of Sciences in Moscow in 1984, on an Elektronika 60 that could only draw text — the first bricks were square brackets. Its trip west through Hungary, Britain and Nintendo’s 1989 Game Boy pack-in made it the most ported game in history. Block Drop is this app’s original take on that family: seven pieces, a ten-wide well, the modern Super Rotation System, 7-bag pieces, hold and preview.',
  intro:
    'Mastery is stacking flat. Every piece has a place where it leaves no hole, and finding it in the two seconds you get is the whole game. Strong players keep the surface even, save one column for the long piece, never bury a gap, and use hold and the preview to plan three pieces ahead instead of reacting to one.',
  sections: [
    {
      title: 'Keep the surface flat',
      art: {
        kind: 'grid',
        rows: ['....', 'a...', 'aaa.', 'aaaa'],
        caption: 'A stack that rises one step at a time has a home for every piece'
      },
      bullets: [
        '📏 Aim for a surface with no bumps taller than one cell: every tetromino fits a flat surface, almost none fit a jagged one.',
        '🕳️ A hole costs far more than a line pays — never drop a piece that covers an empty cell, even if it clears something.',
        '🧱 Build from the walls inward so the stack has one open side, never two competing valleys.'
      ]
    },
    {
      title: 'Save the well for the I',
      art: {
        kind: 'grid',
        rows: ['aaa.', 'aaa.', 'aaa.', 'aaa.'],
        caption: 'Nine columns stacked, the tenth kept empty: an I piece scores four lines at once'
      },
      bullets: [
        '🏗️ Keep one edge column empty and fill the other nine evenly — an I piece dropped in clears four rows for 800 × level.',
        '⏳ The 7-bag guarantees an I every seven pieces at worst; hold one if it comes before the stack is four rows high.',
        '🚨 If the stack passes the halfway mark, stop waiting: take single and double lines to get down, then rebuild the well.'
      ]
    },
    {
      title: 'Read the queue, use hold',
      art: {
        kind: 'row',
        items: ['T', '>', 'S', '>', 'I', '>', 'O'],
        caption: 'Three pieces are known — place the first so the next two have homes'
      },
      bullets: [
        '👀 Before each drop, glance at NEXT: the best spot for this piece is the one that leaves room for the following two.',
        '🔁 Hold is a second chance, not a bin: park a piece that has no clean home now, and swap it back when the stack changes.',
        '🔄 S and Z pieces are the troublemakers: they fit only on a two-step edge. Create that step on purpose before one arrives.'
      ]
    },
    {
      title: 'Turn with the walls',
      art: {
        kind: 'grid',
        rows: ['..a.', '.aa.', '..a.', '####'],
        caption: 'A turn that would not fit slides sideways instead — the wall kick'
      },
      bullets: [
        '🧲 A turn blocked by a wall or the stack slides the piece a cell over to complete it (SRS wall kicks) — turn near walls confidently.',
        '🎯 Turning while the piece rests on the stack resets the lock timer a few times: use it to slide into a tight slot, not to stall.',
        '⬇️ Hard drop only when the ghost sits exactly where you want it — a slam is final, a soft drop still lets you adjust.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧱⚡🏆',
        caption: 'Levels speed up every ten lines — stack flatter earlier, then speed takes care of itself'
      },
      bullets: [
        '🎚️ Tiers change the starting speed and the line target; your fastest clean tier is the one where you never place a hole — play it until the higher target feels short.',
        '🎮 On a phone, drag to move and tap to turn; hold Down to lower a piece row by row and use Drop only once the ghost is right.',
        '📊 Watch tetrises and level in the results: four-line clears rising means the well discipline is working; a score that grows without them means you are clearing singles under pressure.',
        '🧘 Slow gravity is a training assist: learn the flat-stack habit at two-thirds speed, then turn it off — a clean win needs it off.'
      ]
    }
  ],
  references: [
    {
      label: 'Tetris — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tetris',
      note: 'origins in Moscow, the Game Boy era and the modern guideline'
    },
    {
      label: 'Tetromino — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tetromino',
      note: 'the seven shapes and why the S and Z are the hard ones'
    },
    {
      label: 'Alexey Pajitnov — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Alexey_Pajitnov',
      note: 'the creator'
    }
  ]
};
