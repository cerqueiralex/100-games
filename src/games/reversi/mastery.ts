import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Reversi" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Reversi was devised in England in 1883 (credited to Lewis Waterman and John Mollett, who feuded over it); the modern fixed-opening form was branded Othello by Goro Hasegawa in Japan in 1973 and became a worldwide tournament game. Computer Othello surpassed human champions in 1997 when Logistello beat world champion Takeshi Murakami 6–0.',
  intro:
    'Mastery begins with unlearning the obvious: flipping many discs early is usually BAD. The middlegame is about mobility (having moves while starving the opponent of them) and stability (owning discs that can never flip back). Disc count only matters at the final count — champions routinely trail until the last dozen moves.',
  sections: [
    {
      title: 'Mobility over material',
      art: {
        kind: 'row',
        items: ['mobility', '>', 'stability', '>', 'disc count'],
        caption: 'What matters, in order — discs only count at the very end'
      },
      bullets: [
        '🤏 Prefer moves that flip FEW discs: every flipped disc is a new frontier the opponent can attack, and big early walls hand them endless choices.',
        '🧮 Count legal moves — yours vs theirs — after each candidate move; the difference IS the evaluation. Starved opponents must play into corners\' shadows.',
        '🧲 Keep your discs clustered and internal; frontier discs (touching empty squares) are liabilities, not assets.'
      ]
    },
    {
      title: 'Corners and their poisoned neighbors',
      art: {
        kind: 'grid',
        rows: ['hy..', 'yb..', '....', '....'],
        caption: 'Corner (safe anchor), C-squares (risky) and the X-square (poison) while the corner is empty'
      },
      bullets: [
        '🏰 Corners can never be flipped — they anchor stable chains along edges. Corner captures decide most amateur games.',
        '☠️ X-squares (diagonal to a corner) are the worst squares on the board: occupying one usually gifts the corner. C-squares (beside a corner on the edge) are almost as toxic while the corner is empty.',
        '🧊 Do not grab a corner reflexively if it releases your opponent\'s frozen position — corners are means (stability), not ends.'
      ]
    },
    {
      title: 'Edges and stability',
      art: {
        kind: 'grid',
        rows: ['●●●●', '○...', '....', '....'],
        caption: 'A full edge anchored at both corners is untouchable wealth'
      },
      bullets: [
        '🧱 Stable discs grow outward from corners along edges: a full edge anchored at both corners is untouchable wealth.',
        '⚖️ Unbalanced edges (five of yours with a gap near an empty corner) invite devastating wedges — count who wins the edge AFTER all forced flips before building it.',
        '🎭 Track stability, not the score bar: this app shows disc counts live, and mid-game leads there are usually ILLUSIONS — say it to yourself when tempted.'
      ]
    },
    {
      title: 'Tempo and the endgame',
      art: {
        kind: 'row',
        items: ['odd region', '>', 'last move', '>', 'profit'],
        caption: 'Leave odd-sized empty regions for yourself late'
      },
      bullets: [
        '🔢 Parity: the player who makes the LAST move in each empty region usually profits — try to leave odd-sized regions for yourself late.',
        '⏭️ Passes are catastrophic: if a move leaves the opponent with zero legal replies, you move twice — hunt these sequences from move 40 on.',
        '💰 In the last ~10 moves, switch brains: now count actual flips per candidate precisely — the mobility game is over and greed becomes correct.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🪞🏁🔍',
        caption: 'Trace every lost corner back to the X- or C-square move that caused it'
      },
      bullets: [
        '🤫 Against low tiers practice quiet moves only (minimum flips) — winning while flipping little rewires the instinct that loses to strong play.',
        '🛡️ Against high tiers, guard X-squares with your life and take corners only with a stability plan; the AI punishes both sins immediately.',
        '📼 Review losses at the moment the first corner fell — trace backwards to the X- or C-square move that caused it; it is nearly always yours.'
      ]
    }
  ],
  references: [
    {
      label: 'Reversi — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Reversi',
      note: 'history, Othello standardization and strategy overview'
    },
    {
      label: 'Computer Othello — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Computer_Othello',
      note: 'mobility/stability evaluation, told through the programs that perfected it'
    }
  ]
};
