import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Dots & Boxes" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Dots and Boxes was published by French mathematician Édouard Lucas in 1889 as "la pipopipette". Behind its schoolyard image lies deep combinatorial game theory — Elwyn Berkeley\'s and especially Elwyn Berlekamp\'s analysis (The Dots and Boxes Game, 2000) showed that experts win with chain parity and controlled sacrifices, not box greed.',
  intro:
    'Mastery is a heel-turn: the early game is about NOT completing boxes, the midgame about engineering the number of chains, and the endgame about the double-cross — sacrificing two boxes to force your opponent to open the next chain. Whoever controls chain parity harvests every long chain on the board.',
  sections: [
    {
      title: 'Safe moves and the third side',
      art: {
        kind: 'row',
        items: ['1st side', '2nd side', '>', '3rd side = gift'],
        caption: 'The third side hands over the box AND the move'
      },
      bullets: [
        '🚫 Never draw the third side of a box without a plan — it hands the opponent that box AND the move again.',
        '🧮 Early game = spend safe moves (edges creating no 3-sided box). Count them: when safe moves run out, someone must open a chain — know in advance who.',
        '🗺️ Prefer safe moves that also shape chains (walls that split or join regions) over neutral ones; you are building the endgame map.'
      ]
    },
    {
      title: 'The chain rule',
      art: {
        kind: 'grid',
        rows: ['aaaa', '....', 'uuuu'],
        caption: 'Two long chains forming — fight over their COUNT, not over boxes'
      },
      paragraphs: [
        'Count the long chains forming on the board. The classic parity rule: the FIRST player wants the number of initial dots + double-crosses... simplified for play: on this app\'s odd-total boards (3×3, 5×5), the first player wants an EVEN number of long chains; on even-total boards, odd. Fight over chain count, not boxes.'
      ],
      bullets: [
        '🧱 Merging two chains (removing a wall between regions) or splitting one changes parity — those quiet walls are the real battleground of the midgame.',
        '🪙 Short chains (1–2 boxes) and loops are parity currency too: loops cost FOUR boxes to relinquish control, making them expensive.',
        '🗣️ Count chains aloud at half-fill; deciding parity three moves before safe moves run out is what "playing well" concretely means.'
      ]
    },
    {
      title: 'The double-cross endgame',
      art: {
        kind: 'row',
        items: ['take', 'take', '>', 'leave 2'],
        caption: 'All but two, then close — they must open the next chain for you'
      },
      bullets: [
        '📉 When forced to open chains, open the SHORTEST first — losses are minimized in ascending order.',
        '✂️ When the opponent opens a chain for you: take all but TWO boxes, then close the chain with a double-cross — they must open the next chain, and you repeat. This single move wins games from behind.',
        '⚠️ Exception: take everything in the LAST chain, and skip the sacrifice when the remaining chains are too short to repay two boxes.'
      ]
    },
    {
      title: 'Against this app\'s AI',
      art: {
        kind: 'grid',
        rows: ['ggggg', 'gggbb'],
        caption: 'Feed two boxes, harvest the long chain behind them'
      },
      bullets: [
        '🍬 Low tiers grab every free box — feed them a two-box sacrifice and harvest the long chains behind it.',
        '🧠 Higher tiers double-cross you back: the game becomes pure parity — count chains from move one and steer wall placement accordingly.',
        '🕳️ Never assume a free box is free: check whether taking it opens a chain mouth behind it.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '✂️🔢🏆',
        caption: 'The take-all-but-two motion must become automatic'
      },
      bullets: [
        '🤲 Practice the take-all-but-two motion until it is automatic — hesitation there is the tell of a player the AI can farm.',
        '🎙️ Play a game where you narrate chain count after every move; parity blindness is cured by counting, nothing else.',
        '🔍 Study one lost endgame per session: mark the move where chain parity fixed against you — it is earlier than you think.'
      ]
    }
  ],
  references: [
    {
      label: 'Dots and boxes — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dots_and_boxes',
      note: 'rules, the chain rule and double-cross strategy'
    },
    {
      label: 'Elwyn Berlekamp — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Elwyn_Berlekamp',
      note: 'the mathematician who turned this schoolyard game into a science'
    }
  ]
};
