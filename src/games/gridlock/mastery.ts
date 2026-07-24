import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Gridlock" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Gridlock is Rush Hour, invented by the celebrated Japanese puzzle designer Nob Yoshigahara and published by ThinkFun (USA) in 1996. It became one of the best-selling logic games ever and a favorite of cognitive-science researchers studying planning, because its difficulty is precisely graded by minimum solution length.',
  intro:
    'Mastery is chain thinking. The red car\'s exit lane is blocked by cars, which are blocked by other cars — a dependency chain you read BACKWARDS from the exit. Experts don\'t move pieces to "make space" in general; every slide serves a computed chain, and par is met by never moving a piece that isn\'t on one.',
  sections: [
    {
      title: 'Read the blocking chain',
      art: {
        kind: 'grid',
        rows: ['..u..', 'bbu.→', '..u..'],
        caption: 'Read right from the red car: the truck is the primary target — everything else serves freeing it'
      },
      bullets: [
        '📋 List the red car\'s lane blockers left to right — these are your primary targets; everything else exists only to free them.',
        '🔁 For each blocker ask: which direction clears the lane, and what currently prevents THAT move? Recurse until you reach a car that can move now — that car is your true first move.',
        '🚛 Vertical trucks crossing the exit row are the bosses: they need big vertical clearance, so their liberation usually shapes the whole solution.'
      ]
    },
    {
      title: 'Move economy',
      art: {
        kind: 'grid',
        rows: ['uu→→.'],
        caption: 'A slide of any length is ONE move — go as far as useful in it'
      },
      bullets: [
        '🛝 A slide of any length is ONE move — always slide as far as useful, and prefer parking spots that serve two future needs.',
        '🏷️ Before moving a car, name the chain it serves; "tidying" moves are how 8-move puzzles become 20-move solves.',
        '🔑 Look for the pivot car — most hard boards hinge on one car that must temporarily move INTO the exit row to free a truck, then out again. Spot the pivot early and the rest orders itself.'
      ]
    },
    {
      title: 'Plan in reverse',
      art: {
        kind: 'grid',
        rows: ['uu...', '..bb→', '.u...'],
        caption: 'Picture the finish: lane empty, red at the exit — then ask where each car parked'
      },
      bullets: [
        '⏪ Picture the final board: red at the exit, lane empty. Which car was last to leave the lane, and where did it PARK? Working backwards from parking spots avoids planning into dead space.',
        '🔢 Count empty cells per row/column — a car can only clear a lane if its escape row has room; blocked escapes reveal themselves in the count before you waste moves discovering them.',
        '🪆 On pro/extreme, expect double-chains: freeing blocker A requires moving B, which requires C sliding through where A currently sits — order of operations IS the puzzle.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['..u..', 'bbu..', 'hh...'],
        caption: 'The car you have never moved (highlight) usually hides the key'
      },
      bullets: [
        '🔄 Re-derive the chain from scratch — after a few moves the original chain is stale, and stale chains cause circular shuffling.',
        '🕵️ Find the car you have never moved: hard boards usually require every piece to move at least once; the untouched one hides the key.',
        '⏮️ Undo to the last position you fully understood rather than shuffling forward — position understanding, not motion, is progress.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎯 par', '>', '🔁 replay the chain', '>', '⬆️ next tier'],
        caption: 'Matching par means the chain reading was perfect'
      },
      bullets: [
        '🏅 Chase par (visible in the info strip): matching it means your chain reading was perfect; within 2 is strong on extreme.',
        '🧠 After each win, replay the mental chain once — consolidating the dependency pattern is what makes the next board faster.',
        '🪜 Move up tiers when you stop needing exploratory moves; tier difficulty is chain depth, and the reading skill transfers directly.'
      ]
    }
  ],
  references: [
    {
      label: 'Rush Hour (puzzle) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Rush_Hour_(puzzle)',
      note: 'the original game, its inventor and complexity results'
    },
    {
      label: 'Nob Yoshigahara — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Nob_Yoshigahara',
      note: 'the legendary designer behind Rush Hour'
    }
  ]
};
