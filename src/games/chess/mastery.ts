import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Chess" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Chess descends from chaturanga, played in India by the 6th century, which travelled through Persia (shatranj) into Europe. The modern queen and bishop arrived in 15th-century Spain and Italy — the "mad queen" reform that made the game fast and tactical. Standardized rules, clocks and notation came with the 19th-century tournament scene; today it is the most studied game on earth, and engines have been stronger than every human since the late 1990s.',
  intro:
    'Chess mastery is three habits stacked: develop with purpose in the opening, calculate forcing moves before quiet ones in the middlegame, and count material like a ledger — every trade should serve a plan. Against this robot, the difficulty mostly changes how deeply it punishes loose moves: the sharper the tier, the more every undefended piece matters.',
  sections: [
    {
      title: 'Opening: develop, castle, connect',
      art: {
        kind: 'row',
        items: ['pawns out', '>', 'minors out', '>', 'castle', '>', 'rooks join'],
        caption: 'The first ten moves have one job: get everyone working'
      },
      bullets: [
        '🎯 Fight for the center with a pawn (e4/d4) — central pawns buy space and open lines for your bishops.',
        '🐴 Knights before bishops, and develop toward the center; a piece moved twice in the opening is a move given away.',
        '🏰 Castle early — a king in the center is the target every tactic aims at, and castling also brings a rook into play.',
        '⚠️ Do not bring the queen out early: every enemy developing move will hit her, and each dodge is a free tempo for them.'
      ]
    },
    {
      title: 'Tactics: checks, captures, threats',
      art: {
        kind: 'row',
        items: ['check?', '>', 'capture?', '>', 'threat?', '>', 'then plans'],
        caption: 'Scan forcing moves first — yours AND the reply to each'
      },
      bullets: [
        '🔱 Learn the fork family: a knight on the right square attacks two pieces at once, and only one can move. Queens and pawns fork too.',
        '📌 Pins and skewers: a piece that cannot move because something bigger stands behind it is already half-captured — pile up on it.',
        '👁️ Before EVERY move ask "what did that just attack?" — most lost games die to a one-move threat that was simply not seen.',
        '🎁 A "free" pawn is often bait. Count the defenders and attackers on a square before touching it: you need more attackers than defenders.'
      ]
    },
    {
      title: 'Material is a ledger',
      art: {
        kind: 'row',
        items: ['♙1', '♘3', '♗3', '♖5', '♕9'],
        caption: 'The pawn scale — trade only when the ledger (or the position) profits'
      },
      bullets: [
        '⚖️ Ahead in material? TRADE PIECES, not pawns — every swap makes the extra piece a bigger share of the army.',
        '🔃 Behind? Keep pieces on and complicate; simplification is the winning side’s friend.',
        '👑 Two minor pieces usually beat a rook; three pawns rarely equal a piece in the middlegame but often do in the endgame.',
        '🧮 The capture trays under the board keep the running count for you — the +n badge is the ledger in pawns.'
      ]
    },
    {
      title: 'King safety and the art of check',
      art: {
        kind: 'grid',
        rows: ['..♜.', '....', '♙♙♙.', '.♔..'],
        caption: 'The castled pawn shield — every pawn push in front of it is a door opened'
      },
      bullets: [
        '🛡️ Keep the pawns in front of your castled king unmoved as long as you can; h3-style "luft" is one door, three pushes is an invitation.',
        '⚡ A check is only good when it GAINS something — a tempo, a piece, a mating net. "Check because I can" usually just improves the enemy king.',
        '🚨 When checked, prefer capturing the attacker or blocking with gain; king moves lose castling and drift into nets.',
        '🕸️ Mating patterns to know cold: back-rank mate, smothered mate, the queen-and-helper mates on the edge of the board.'
      ]
    },
    {
      title: 'Endgames win the games openings start',
      art: {
        kind: 'row',
        items: ['♔ activates', '>', '♙ runs', '>', '♕ appears'],
        caption: 'In the endgame the king is a fighting piece and pawns are the plot'
      },
      bullets: [
        '🚶 The moment queens leave the board, march your king to the center — in the endgame it is worth roughly a rook.',
        '🏃 Passed pawns must be pushed — and blockaded the instant the enemy has one. The square-of-the-pawn rule tells you if a king catches it.',
        '📐 Learn king-and-pawn vs king (opposition!) and the rook-roller mate first; they decide more club games than any opening line.',
        '🤝 Know the draws you can force when losing: stalemate traps, perpetual check, and the fifty-move clock are all part of the rules — this app calls them honestly.'
      ]
    }
  ],
  references: [
    { label: 'Lichess — free interactive lessons and practice', url: 'https://lichess.org/learn' },
    { label: 'Chess.com — lessons and tactics puzzles', url: 'https://www.chess.com/lessons' },
    { label: 'Wikipedia — Chess', url: 'https://en.wikipedia.org/wiki/Chess' },
    { label: 'Wikipedia — Chess strategy', url: 'https://en.wikipedia.org/wiki/Chess_strategy' }
  ]
};
