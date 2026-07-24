import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Tic-Tac-Toe" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Three-in-a-row games are ancient — boards are scratched into Roman ruins (terni lapilli) and Egyptian temple roofs — and the modern 3×3 pencil form was standardized in 19th-century Britain as "noughts and crosses". It was also the subject of one of the first computer games ever, OXO (Cambridge, 1952). Perfect play by both sides always draws.',
  intro:
    'Mastery means never losing, squeezing wins from every opponent slip, and understanding WHY: the game is solved, and the whole theory fits in your head. The core skill is fork literacy — creating positions with two winning threats at once, and smothering the opponent\'s forks a move before they exist.',
  sections: [
    {
      title: 'The value of squares',
      art: {
        kind: 'grid',
        rows: ['323', '242', '323'],
        caption: 'Lines through each square: centre 4, corners 3, edges 2'
      },
      bullets: [
        '🎯 Center (4 lines) > corners (3 lines) > edges (2 lines). Open with center; if the center is taken, take a corner.',
        '🛡️ Against a corner opening, the ONLY safe reply is the center — any other response already loses to perfect play.',
        '🐍 Edge openings are weak but venomous against autopilot: respond center, then watch the two corners flanking their edge.'
      ]
    },
    {
      title: 'Priority ladder every turn',
      art: {
        kind: 'row',
        items: ['Win', '>', 'Block', '>', 'Fork', '>', 'Block fork'],
        caption: 'Run the ladder every move — skipping step 2 is how games are lost'
      },
      bullets: [
        '🪜 1) Win now if you can. 2) Block their win. 3) Create a fork. 4) Block their fork. 5) Center, then opposite corner, then any corner, then edge.',
        '🔁 Run the ladder EVERY move, even in "obvious" positions — skipping step 2 is how everyone loses their occasional game.',
        '♟️ Fork-block subtlety: when the opponent threatens a fork, prefer blocking by making your OWN two-in-a-row (forcing them to respond) over passively occupying the fork square.'
      ]
    },
    {
      title: 'Know the classic traps',
      art: {
        kind: 'grid',
        rows: ['X.h', '.O.', 'h.X'],
        caption: 'Corner–centre–corner: the fork squares wait — O must take an EDGE now'
      },
      bullets: [
        '🪤 Double-corner trap: X takes two opposite corners while O holds center; if O ever plays a third corner instead of an EDGE, X forks. As O, answer opposite-corner setups with an edge.',
        '⚔️ Corner–center–corner: X corner, O center, X opposite corner — O must now take an edge, not a corner. This single line accounts for most human losses.',
        '🎭 As X against a passive O, corner openings maximize fork chances; as O, the center + edge discipline neutralizes everything.'
      ]
    },
    {
      title: 'Playing this app\'s robot',
      art: {
        kind: 'row',
        items: ['easy: blunders', '>', 'extreme: perfect'],
        caption: 'Low tiers lose to forks; on extreme a drawn series is the win'
      },
      bullets: [
        '🤖 Lower tiers blunder deliberately: play the priority ladder and forks convert those blunders into round wins.',
        '🧊 On extreme the AI is minimax-perfect and opens every round — you are playing for draws; a drawn series is a defensive masterclass, treat it as such.',
        '📊 Best-of-N rounds reward consistency over brilliance: one ladder skip costs a round that ten perfect rounds can\'t always repay.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🗣️🧠🎓',
        caption: 'Name the fork squares aloud until counting them is automatic'
      },
      bullets: [
        '🗣️ Practice NAMING the fork squares aloud before each of your moves — visible fork-counting becomes automatic within a session.',
        '🔀 Alternate deliberately between hunting wins (vs low tiers) and never-lose defense (vs high tiers); the two skills are asymmetric.',
        '🎓 Graduate to the strategy games with the same skeleton — Connect Four and Reversi reuse threat-counting with real depth.'
      ]
    }
  ],
  references: [
    {
      label: 'Tic-tac-toe — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tic-tac-toe',
      note: 'history, complete strategy and the solved-game analysis'
    },
    {
      label: 'OXO — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/OXO',
      note: 'the 1952 Cambridge program — this game\'s place in computing history'
    }
  ]
};
