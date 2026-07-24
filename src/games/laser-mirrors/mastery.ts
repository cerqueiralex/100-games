import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Laser Mirrors" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Beam-and-mirror routing puzzles grew from optics toys and 1980s computer games — Deflektor (1987, UK) and Laser Tank among them — and from the mirror mechanics of the board game Khet (originally Deflexion, USA 2005). This app\'s version is an original take: orient a fixed set of diagonal mirrors (and on harder tiers, place extras from a tray) so one beam sweeps every target.',
  intro:
    'Mastery is thinking of the beam as a single thread you are sewing through fixed points. The source direction and every target are constraints; each mirror is a 90° stitch. Strong players work backwards from targets as much as forwards from the source, and read the whole route before touching a single mirror.',
  sections: [
    {
      title: 'Read the geometry first',
      art: {
        kind: 'grid',
        rows: ['S──╲', '...│', '...🎯'],
        caption: 'A ╲ mirror stitches east into south — each mirror bends the beam once'
      },
      bullets: [
        '📡 Trace the source\'s line: every target ON that line can be collected without any mirror — count them first.',
        '🪞 A / mirror swaps east↔north and west↔south; a \\ swaps east↔south and west↔north. Internalize both — hesitating on reflection directions is the main speed leak.',
        '🔢 Each mirror bends the beam exactly once — with N mirrors on the board, the route has at most N turns. Sketch the turn budget against the target spread before rotating anything.'
      ]
    },
    {
      title: 'Work backwards from lonely targets',
      art: {
        kind: 'grid',
        rows: ['S...', '│...', '╲─🎯🎯'],
        caption: 'Aligned targets want one pass — route the beam down their shared line'
      },
      bullets: [
        '🏝️ The hardest target is the one farthest from every other — find what row or column the beam must travel to cross it, then find which mirror can deliver the beam onto that line.',
        '📏 Targets aligned in one row/column want a single pass — route the beam along their shared line rather than visiting them separately.',
        '🏁 The final segment exits the board or dies on a wall; choose which mirror is LAST and the rest of the route often locks itself.'
      ]
    },
    {
      title: 'Walls and the tray',
      art: {
        kind: 'grid',
        rows: ['S─╲', '..🎯', '..#'],
        caption: 'The tail may die on a wall on purpose — the target is already swept'
      },
      bullets: [
        '🧱 Walls are routing tools, not just obstacles: a segment that must stop can aim at a wall deliberately while an earlier mirror already peeled off toward the targets.',
        '🦴 On place-tiers, the fixed mirrors are the skeleton — orient them first, and spend tray mirrors only on the joints the skeleton cannot make.',
        '🚫 Never park a tray mirror where the beam crosses twice: a cell the beam must pass straight through in one direction cannot also turn it in another.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'row',
        items: ['🔁 toggle one', '>', '👀 read the trace', '>', '🗺️ update the plan'],
        caption: 'The live trace is information — random flipping erases it'
      },
      bullets: [
        '🔁 Toggle one mirror at a time and READ the new beam fully — the live trace is information; random flipping erases your mental map.',
        '🧩 Split the puzzle: find a partial orientation that lights all targets but one, then ask which single earlier turn re-routes the tail through the straggler.',
        '🔍 Count reflections per mirror: a mirror the beam never reaches is either dead weight (fine) or the missing link (rotate its UPSTREAM neighbor to feed it).'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🔦🪞🎯',
        caption: 'Plan the whole route before the first tap'
      },
      bullets: [
        '🗺️ Score rewards few turns and speed: plan the full route before the first tap and your turn counter drops by half.',
        '🧠 Practice the two reflection rules until you can trace a five-mirror route entirely in your head — tiers differ mostly in route length, not concept.',
        '💡 Use the hint sparingly and diagnostically: it fixes one mirror — before continuing, work out what route that mirror implies.'
      ]
    }
  ],
  references: [
    {
      label: 'Khet (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Khet_(game)',
      note: 'the laser-and-mirror board game; its mirror geometry is this game\'s'
    },
    {
      label: 'Specular reflection — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Specular_reflection',
      note: 'the optics behind the two mirror orientations'
    }
  ]
};
