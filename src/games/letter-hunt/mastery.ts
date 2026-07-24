import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Letter Hunt" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Letter Hunt is a Boggle-style word hunt: Boggle was designed by Allan Turoff and published by Parker Brothers (USA) in 1972, itself descending from older word-square parlor games. The chain rule — consecutive letters must be neighbors, no cell reused — is Boggle\'s enduring invention.',
  intro:
    'Mastery is seeing the board as a graph of stems, not a soup of letters. Strong hunters walk productive prefixes (ST-, CH-, PRE-) outward, harvest whole word families from one path (RATE → RATES → GRATE), and sweep the board in a fixed scan order so no corner goes unmined before the clock dies.',
  sections: [
    {
      title: 'Scan with a system',
      art: {
        kind: 'grid',
        rows: ['STA', 'REP', 'LON'],
        caption: 'Read the board like text — trace from every cell once, in order'
      },
      bullets: [
        '📖 Trace from every cell once, in reading order — random glancing revisits the same hot corner and starves the rest of the board.',
        '💎 Start paths on rare letters (J, K, V, X, Z): their word families are small, so they clear fast and stop nagging you.',
        '🌱 Give each promising stem two extensions before abandoning it; the second extension is where the long words live.'
      ]
    },
    {
      title: 'Farm word families',
      art: {
        kind: 'row',
        items: ['RATE', '>', 'RATES', '>', 'GRATE'],
        caption: 'One path, a whole family — and read it backwards too'
      },
      bullets: [
        '🌳 Every found word suggests relatives: add S/ED/ER/ING where the neighbors allow, and read the path BACKWARDS (STOP↔POTS, DRAW↔WARD).',
        '🔗 Interior letters with many neighbors are hubs — words through the center outnumber edge words; anchor your longest hunts there.',
        '🧩 Chunk digraphs on sight: TH, CH, SH, QU pairs that are adjacent become single "letters" in your scan.'
      ]
    },
    {
      title: 'Score thinking',
      art: {
        kind: 'banner',
        emojis: '⚖️⏱️🎯',
        caption: 'One 6-letter word usually outscores three 3s'
      },
      bullets: [
        '📈 Length pays superlinearly — one 6-letter word usually outscores three 3s. Budget the first half of the clock for 4+ hunting, mop up shorts late.',
        '🗺️ Do not re-type near-duplicates first (RATE/RATES) if a fresh region is unscanned; coverage beats micro-farming until the board is fully visited.',
        '⏰ Last 20 seconds: switch to pure 3-letter reflex around hub letters — short words per second is the correct endgame metric.'
      ]
    },
    {
      title: 'When the board looks dead',
      art: {
        kind: 'grid',
        rows: ['h..', '.h.', '..h'],
        caption: 'Rotate your reading — diagonals reveal paths your eyes flattened'
      },
      bullets: [
        '🔄 Rotate your reading: scan columns instead of rows, or trace diagonals — orientation changes reveal paths your eyes flattened.',
        '🌉 Hunt vowel bridges: two consonant clusters joined by one vowel often hide the board\'s longest word.',
        '🔚 Recite common endings (-IGHT, -TION, -OUND) and check whether the board can walk them; ending-first search finds words prefix scanning misses.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['round ends', '>', 'missed list', '>', 'trace 3'],
        caption: 'Trace missed words on the dead board — pathing memory transfers'
      },
      bullets: [
        '🧠 After each round, study the missed-words list and TRACE three of them on the dead board — pathing memory transfers to future boards, word lists alone do not.',
        '📊 Track found-percentage per tier in your history; push tiers when coverage passes roughly half the bank.',
        '⚖️ Play some rounds prioritizing ONLY length, others ONLY count — separating the two skills trains both faster than mixed play.'
      ]
    }
  ],
  references: [
    {
      label: 'Boggle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Boggle',
      note: 'the 1972 original: rules, scoring and strategy notes'
    },
    {
      label: 'Word game — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Word_game',
      note: 'the wider family of letter-hunt games'
    }
  ]
};
