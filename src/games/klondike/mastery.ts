import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Klondike Solitaire" — strategy content only; the rules
 * live in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Patience games spread through Europe in the early 19th century, but the Klondike layout takes its name from the 1890s Yukon gold rush, where prospectors reputedly dealt it out between claims. It became the world’s default solitaire when Microsoft shipped it with Windows 3.0 in 1990 — written by intern Wes Cherry — making it arguably the most-played computer game in history. Solver studies put the share of theoretically winnable draw-1 deals near 80%, which means most losses are avoidable.',
  intro:
    'Mastering Klondike is information management. The face-down cards are the enemy; every move should be judged by what it reveals, what it keeps flexible, and what it commits you to. Weak players make every legal move; strong players skip moves constantly, because a tableau shuffle that reveals nothing costs options (and, in this app, efficiency points) while gaining nothing.',
  sections: [
    {
      title: 'Reveal is king',
      art: {
        kind: 'grid',
        rows: ['# #', '# 8', '#  ', '5  '],
        caption: 'Two flips on offer — dig the column hiding more face-down cards'
      },
      paragraphs: [
        'A move that flips a face-down card beats almost any move that does not. Everything else in your position can usually wait; hidden information cannot be planned around.'
      ],
      bullets: [
        '🎴 Given two possible flips, prefer the column with more face-down cards — that is where the game is locked.',
        '🚫 Never move cards between tableau columns just because you can: a 6 moving from one black 7 to the other gains nothing and burns efficiency.',
        '⏳ Before drawing from the stock, exhaust the flips available on the board — stock cards will still be there; a buried flip may depend on the slot you are about to fill.'
      ]
    },
    {
      title: 'Empty columns are gold — spend them on the right king',
      art: {
        kind: 'row',
        items: ['space', '>', 'K♠', '>', 'Q♥', '>', 'J♣'],
        caption: 'Promise the space to a king whose build chain is alive'
      },
      paragraphs: [
        'Only a King may occupy a space, so an empty column is a promise you make to one specific card. Choose it before you empty the column, not after.'
      ],
      bullets: [
        '👑 Pick the king whose build is alive: a red king wants an accessible black queen, then a red jack — check the chain exists before committing.',
        '⛏️ To open a space, attack the shortest pile; to flip cards, dig the longest. Early game usually favours the flip.',
        '🚪 Do not rush a king into a space that was serving as a working slot — an empty column that shuttles cards can be worth more than a parked king.',
        '⚖️ Keep colour balance in mind along the whole run: two black kings placed means both red queens become critical cards.'
      ]
    },
    {
      title: 'Don’t race the foundations',
      art: {
        kind: 'row',
        items: ['A–2 always', '>', '3+ only when safe'],
        caption: 'A card sent up stops working for the tableau'
      },
      paragraphs: [
        'Cards on the foundations stop working for you: a 3 sent up can no longer host a red 2 that unblocks a column. Aces and 2s are always safe; above that, patience pays.'
      ],
      bullets: [
        '✅ A workable rule: send a card up only when both opposite-colour cards one rank lower are already on the foundations — then it can never be needed in the tableau.',
        '📏 Keep foundations roughly level; running one suit far ahead strands the low cards of the others.',
        '🤖 The Auto-to-foundation assist only sends provably safe cards, but it still counts as help — doing the same judgement yourself is the clean-win version.'
      ]
    },
    {
      title: 'Draw-3 stock craft',
      art: {
        kind: 'row',
        items: ['see 3rd', '>', 'play one', '>', 'see 4th'],
        caption: 'One waste play shifts the phase of every later triple'
      },
      paragraphs: [
        'From hard tier up you see only every third stock card, and recycling preserves order — so the stock is a cycle you can reason about, not a lottery.'
      ],
      bullets: [
        '🔄 Playing ONE card from the waste shifts the phase of every later triple: a useless pass can become a rich one after a single extra play, so sometimes take a mediocre card purely to re-phase the stock.',
        '📝 Note the cards you see but cannot reach; they reappear in the same order next pass, and your tableau plan should prepare hooks for them.',
        '🔢 Count redeals on pro (2) and extreme (1): before the last recycle, list what you still need from the stock and make sure each has a landing place.'
      ]
    },
    {
      title: 'This app, and improving',
      art: {
        kind: 'row',
        items: ['draw-1 winnable', '>', 'draw-3', '>', '2 redeals', '>', '1 redeal'],
        caption: 'The tier ladder — every easy/medium loss was a decision, not luck'
      },
      bullets: [
        '🏦 Easy and medium deals come from a solver-verified winnable bank: every loss there is a wrong decision, not bad luck — replay with Undo and find the turn where the win escaped.',
        '🧮 The efficiency bonus (−2 per move) rewards planning, not speed: batch your intentions before touching cards.',
        '💡 Hints highlight a solver-approved move for −40; treat each as a question — what made that move better than yours?',
        '🏆 A clean win uses no hint, no undo and no auto-foundation. Earn it on medium (draw-1, winnable) before attempting it on draw-3 tiers, where even perfect play loses some deals — that is the variant, not you.'
      ]
    }
  ],
  references: [
    {
      label: 'Klondike (solitaire) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Klondike_(solitaire)',
      note: 'rules, variants and what is known about winnability'
    },
    {
      label: 'Patience (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Patience_(game)',
      note: 'the wider solitaire family and its history'
    },
    {
      label: 'Microsoft Solitaire — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Microsoft_Solitaire',
      note: 'how one bundled program made Klondike universal'
    }
  ]
};
