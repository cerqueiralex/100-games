import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Checkers" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Draughts descends from the medieval game alquerque; the modern board form emerged in 12th-century France (fierges), and forced capture — the rule that gives the game its tactics — was adopted by the 16th century. English draughts was solved in 2007 by Jonathan Schaeffer\'s Chinook team (Canada): perfect play draws.',
  intro:
    'Mastery is exploiting forced captures. Because taking is compulsory, you can CHOOSE your opponent\'s replies — every sacrifice is a steering wheel. Around that tactical engine sit three quieter disciplines: center control, back-row patience, and the courage to trade down ruthlessly when ahead.',
  sections: [
    {
      title: 'Forced capture is a weapon',
      art: {
        kind: 'row',
        items: ['offer 1', '>', 'forced take', '>', 'jump 2'],
        caption: 'The two-for-one: a sacrifice steers the reply into a double jump'
      },
      bullets: [
        '👁️ Before every move, list the captures you would CREATE for the opponent — a man moved forward is also a target offered.',
        '⚔️ Two-for-one shots: offer one man where the forced recapture lines a second jump for you. Scan for these both ways every single turn.',
        '🕹️ Steering: when multiple captures are available to the opponent, the rules let them choose — but often all choices serve you; engineer positions where every reply loses something.'
      ]
    },
    {
      title: 'Structure: center, phalanx, back row',
      art: {
        kind: 'grid',
        rows: ['....', '.●●.', '●●●.', '●●●●'],
        caption: 'A connected phalanx advances; the back row stays home'
      },
      bullets: [
        '🎯 Fight for the center squares — central men have two capture directions and reach both wings; edge men are half-blind.',
        '🔗 Advance in connected phalanxes (diagonal chains that defend each other), never lone runners.',
        '🏰 Keep your back row intact early — an empty back row is an open crowning highway; conventional wisdom holds the two central back men longest.'
      ]
    },
    {
      title: 'Trades and the material clock',
      art: {
        kind: 'row',
        items: ['7v6', '>', '5v4', '>', '3v2', '>', 'win'],
        caption: 'Ahead in men? Trade down — the edge grows with every exchange'
      },
      bullets: [
        '⚖️ Ahead in men? Trade at every opportunity: 7v6 is an edge, 3v2 is usually a win. Behind? Complicate and refuse trades.',
        '⏱️ Count crowning tempo: a man\'s value rises as it nears the last row — trading a fresh man for one two steps from kinging is a fine deal.',
        '👑 First king usually wins the endgame: kings own the board\'s diagonals, and the double-corner is the standard fortress to attack or hold.'
      ]
    },
    {
      title: 'Endgame essentials',
      art: {
        kind: 'grid',
        rows: ['....', '.●●.', '...h', '..h○'],
        caption: 'Two kings cover the exit diagonals and evict the lone king from the double-corner'
      },
      bullets: [
        '2️⃣ Two kings beat one: force the lone king out of the double-corner by covering both exit diagonals.',
        '🔁 Opposition matters: in king endings, having the move (or forcing the opponent to it) decides drawn-looking positions — learn to count move parity in the final four pieces.',
        '🤖 Against this app\'s higher tiers, endgames are where the minimax bites hardest — enter them material-up or steer for the draw honestly.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧠🔍🏗️',
        caption: 'Structural collapses precede material ones by several moves'
      },
      bullets: [
        '🗣️ Play a session where every one of your moves must include the answer to "what capture did I just offer?" — blunder rate collapses within games.',
        '🪤 Practice two-for-one pattern recognition against low tiers deliberately setting them up; the shapes repeat forever.',
        '📼 Review losses for the moment your back row emptied or your phalanx split — structural collapses precede material ones by several moves.'
      ]
    }
  ],
  references: [
    {
      label: 'Draughts — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Draughts',
      note: 'history from alquerque to modern play, rules and strategy'
    },
    {
      label: 'Chinook (computer program) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Chinook_(computer_program)',
      note: 'the program that solved checkers — and what "solved" means'
    }
  ]
};
