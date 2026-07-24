import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Memory Match" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The pairs game is a folk card game centuries old, known in Britain as Pelmanism — after the Pelman Institute, a famous early-1900s London memory school — and in Japan as shinkei-suijaku. It reached mass culture when NBC turned it into the TV game show Concentration in 1958, which ran for decades as one of American television\'s longest-lived game shows. Psychologists still use pairs boards to study spatial working memory, because the game is almost a pure test of it.',
  intro:
    'Mastery here is measured in flips: a perfect player never turns the same card face-up a third time. That takes a deliberate encoding habit — every card you see gets a location tag the moment it appears — plus a flip order that maximizes information. The score system rewards exactly this: streak bonuses for consecutive matches and a penalty per miss, so remembering beats rushing on every tier.',
  sections: [
    {
      title: 'Encode every reveal, not just the matches',
      art: {
        kind: 'grid',
        rows: ['🚀##🌙', '####', '#🚀##'],
        caption: 'Every face-up card is a fact: "rocket, top-left" — tag it before it flips back'
      },
      paragraphs: [
        'Most players only "save" a card when its twin shows up. Strong players treat every single reveal as a fact to store, because a card seen once and forgotten costs two extra flips later.'
      ],
      bullets: [
        '🗣 Name what you see, out loud in your head: "rocket, top-right corner". A verbal tag plus a spatial tag is far stickier than a glance.',
        '🧭 Anchor locations to the board edges and corners first — "second row, left edge" survives longer than "somewhere in the middle".',
        '🧩 On the big boards (6×7 pro, 7×8 extreme) chunk the grid into quadrants and store cards as "quadrant + position within it".',
        '📝 When two new cards mismatch, that is TWO facts, not a failure — rehearse both before your next flip.'
      ]
    },
    {
      title: 'Flip order is a strategy, not a habit',
      art: {
        kind: 'row',
        items: ['❓ flip unseen', '>', '🧠 known twin?', '>', '✅ pair'],
        caption: 'Open with the card you know least about — a match you already know converts on the spot'
      },
      paragraphs: [
        'Which card you turn first each turn changes how much you learn. The rule: first flip the card you know least about.'
      ],
      bullets: [
        '❓ Open each turn with an UNSEEN card. If it matches something you already know, you convert the turn into a pair on the spot.',
        '🚫 Never open with a known card unless you are certain where its twin is — leading with a known card and missing teaches you nothing new.',
        '🗺 Explore systematically (sweep row by row or spiral from a corner) so "unseen" is always a well-defined region, not a guess.',
        '🐢 Late game, when most cards are known, slow down: one careless flip can break a streak bonus worth more than the time saved.'
      ]
    },
    {
      title: 'Rehearse during the idle moments',
      art: {
        kind: 'row',
        items: ['👁 glance', '>', '🗣 re-name', '>', '🔥 hot list'],
        caption: 'While the flip-back animation plays, refresh your 3–4 unmatched singletons'
      },
      bullets: [
        '🔁 While the flip-back animation plays, replay your mental map: point your eyes at 2–3 known cards and re-name them.',
        '🃏 Prioritize rehearsing singletons (cards seen once, twin unknown) — matched pairs can be forgotten, singletons cannot.',
        '🔥 Keep a running "hot list" of at most 3–4 singletons; working memory holds about four items reliably, so refresh the oldest before adding a new one.',
        '🗑 If the hot list overflows, deliberately drop the oldest and re-visit that region with your systematic sweep instead of trusting a fading trace.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'grid',
        rows: ['a...', '.h..', '.h..'],
        caption: '"Row 2 or row 3?" — two fuzzy middle tags; re-anchor them to a corner'
      },
      paragraphs: [
        'Everyone has turns where the map dissolves — usually after a run of mismatches or when the board doubles in size between tiers.'
      ],
      bullets: [
        '📍 Confusing two similar positions ("was it row 3 or row 4?") means your tags are too vague — re-anchor to a corner or edge before flipping.',
        '🛑 A streak of misses tempts fast random flipping; that destroys both your map and your score. Stop, take one breath, resume the sweep.',
        '🔀 If you catch yourself re-revealing known cards, you are storing matches instead of singletons — flip your rehearsal priority.',
        '😴 Fatigue shows up as position drift before it shows up as forgotten pictures. On a long extreme board, pause the game rather than push through.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎯 accuracy', '>', '📉 fewer flips', '>', '⚡ speed'],
        caption: 'Speed arrives by itself as your flip count falls toward the minimum'
      },
      bullets: [
        '📈 Climb tiers only when you can finish the current one with almost no third-reveals — the miss counter on your history page is the honest metric.',
        '🙈 Turn off the Opening peek assist early; it teaches cramming, not encoding-on-reveal, and it marks the win as helped.',
        '🔍 Use the Peek button as a diagnostic, not a crutch: if you need it, note WHICH region you lost and tighten your tags there next run.',
        '⏱ Chase the par-time bonus last. Accuracy first, then speed follows naturally as your flip count drops toward the theoretical minimum.'
      ]
    }
  ],
  references: [
    {
      label: 'Concentration (card game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Concentration_(card_game)',
      note: 'history of the pairs game, Pelmanism, and optimal-play research'
    },
    {
      label: 'Concentration (American game show) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Concentration_(American_game_show)',
      note: 'the 1958 TV show that made the memory game a household name'
    },
    {
      label: 'Working memory — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Working_memory',
      note: 'why only a few unmatched cards can be held reliably at once'
    }
  ]
};
