import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Moving Cups" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The shell game — a ball under one of three shuffled cups — is one of the oldest tracking games known, documented in ancient Greece and notorious for centuries as a street con ("thimblerig" in 19th-century England and America). This app plays it honestly: pure visual tracking, no sleight of hand, with speed and cup count rising by tier.',
  intro:
    'Mastery is upgrading from following an object to maintaining an index. Your eyes cannot out-travel fast cups, but your attention can ride ONE cup through any shuffle if you refuse every bait to glance elsewhere. On higher tiers the skill becomes managing attention like a resource — smooth pursuit, positional anchors, and calm.',
  sections: [
    {
      title: 'Track one thing only',
      art: {
        kind: 'grid',
        rows: ['🥤🥤🥤', '.●.'],
        caption: 'The ball shows once — from then on, its cup is the only object in your world'
      },
      bullets: [
        '🔒 Lock onto the ball\'s cup at reveal and never re-derive it mid-shuffle — deciding twice is how the con works on humans.',
        '🌊 Use SMOOTH pursuit, not jumps: follow the cup\'s center with relaxed eyes; saccading between cups is where swaps get lost.',
        '🙈 Ignore the other cups entirely. Motion elsewhere is noise by definition — the target cup is the only object in your world.'
      ]
    },
    {
      title: 'Survive the swap',
      art: {
        kind: 'row',
        items: ['🎢 pick its arc', '>', '👁 ride the crossing', '>', '📍 re-anchor'],
        caption: 'Track your cup through the crossing point, not the crossing itself'
      },
      bullets: [
        '🎢 During a swap the two cups arc past each other: track YOUR cup through the crossing point, not the crossing itself — pick its arc (upper or lower) at the moment the swap starts.',
        '🗣 When cups pause, re-anchor to position ("mine is left") — a verbal positional tag survives brief occlusions better than raw vision.',
        '🧩 If you blink or lose a beat, rebuild from the LAST certain anchor and the swaps you did see — partial reconstruction beats fresh guessing.'
      ]
    },
    {
      title: 'Attention economics',
      art: {
        kind: 'row',
        items: ['📱 phone still', '>', '🎯 gaze centered', '>', '▶ start'],
        caption: 'Win the setup before the shuffle begins'
      },
      bullets: [
        '📱 Sit the phone still and center your gaze BEFORE tapping start — setup sloppiness costs more than shuffle speed does.',
        '🤐 Do not narrate swaps verbally in real time on fast tiers; language is too slow. Save words for pauses, use eyes during motion.',
        '😴 Fatigue is real: tracking accuracy collapses after several minutes of hard focus — short sets with breaks outperform grinding.'
      ]
    },
    {
      title: 'When you lose the cup',
      art: {
        kind: 'row',
        items: ['❌ ruled out', '❓ maybe', '❓ maybe'],
        caption: 'Eliminate what you are sure of, then commit — no re-guessing'
      },
      bullets: [
        '🧮 Commit to probability, not panic: eliminate cups you are SURE the ball\'s cup never crossed and pick among the rest.',
        '📍 Losses cluster at the same moment — usually the second simultaneous swap. Knowing your personal failure point tells you what to practice.',
        '🚫 Never switch answers after choosing without concrete recalled evidence; first-derivation answers are measurably better than re-guesses.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🐢 slow, 4 cups', '>', '⚡ full speed', '>', '✨ clean win'],
        caption: 'Master the cup count slow, then shrink the speed gap'
      },
      bullets: [
        '🪜 Climb tiers only when your accuracy is near-perfect at the current speed — tracking trains by success, and errors train guessing habits.',
        '🐢 The slow-pace assist is a legitimate training wheel: use it to master four cups, then drop it and shrink the speed gap (it counts as help — clean wins wait until it\'s off).',
        '🧘 Alternate a session of "just track" (no scoring pressure) with normal play; pressure-free pursuit practice raises the ceiling fastest.'
      ]
    }
  ],
  references: [
    {
      label: 'Shell game — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Shell_game',
      note: 'the ancient game and the con built on top of it'
    },
    {
      label: 'Smooth pursuit — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Smooth_pursuit',
      note: 'the eye movement that does the actual tracking work'
    }
  ]
};
