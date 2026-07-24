import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Number Trail" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'This is the "limited-hold memory task" from primate research: numerals flash briefly on a screen, get masked, and must be touched in ascending order. It became famous in 2007 when Tetsuro Matsuzawa\'s team at Kyoto University showed the young chimpanzee Ayumu beating university students at it, sparking a running debate about eidetic-like memory in chimps versus human practice effects. Online versions popularized it as the "chimp test"; this app\'s take adds rounds, lives, and a non-consecutive extreme tier.',
  intro:
    'Number Trail is a race between encoding speed and a shrinking flash — down to 600ms holding eight-plus numbers on extreme. Nobody reads eight numbers serially in 600ms; mastery means taking the board in as a single picture: a spatial path traced through the digits, absorbed with one or two fixations and reconstructed calmly after the mask. Your recall time is free — all the pressure lives in the flash — so the discipline is: eyes wide during the flash, unhurried and precise during the taps.',
  sections: [
    {
      title: 'See a path, not a list',
      art: {
        kind: 'grid',
        rows: ['1.2', '4.3', '5..'],
        caption: 'One connected trail — a single snake-shaped memory object, not five separate facts'
      },
      paragraphs: [
        'The winning representation is the trail itself: the line your finger will travel, 1 → 2 → 3, as one connected shape. A zig-zag or spiral is a single memory object; eight independent "number at position" facts are eight objects.'
      ],
      bullets: [
        '🧭 During the flash, trace the ascending path with your attention (not your eyes — attention moves faster) and store its SHAPE: "down-left, across, up, hook right".',
        '🔁 After the mask, replay the shape once before your first tap; the first replay is when the trace is strongest.',
        '🏷 Numbers you could not fit into the path get a separate quick tag ("6 is bottom-right corner") — path for the bulk, tags for the strays.',
        '🌊 Tap along the remembered line smoothly; hesitating mid-trail to "re-check" a tile you already knew invites drift.'
      ]
    },
    {
      title: 'Fixation discipline: the flash is everything',
      art: {
        kind: 'grid',
        rows: ['3.7', '.h.', '2.5'],
        caption: 'Gaze parked at center — peripheral vision reads the corners'
      },
      paragraphs: [
        'With flashes from 2.5s (easy) down to 0.6s (extreme), eye movements are your budget — each saccade costs 30–50ms plus re-focus. Spend them deliberately.'
      ],
      bullets: [
        '🎯 Park your gaze at the board\'s center BEFORE the flash begins; never let it start while you are looking at a corner.',
        '👁 On short flashes, keep the eyes nearly still and read the layout peripherally — position information survives peripheral viewing much better than fine detail does.',
        '1️⃣ Find "1" first, always: your first tap is guaranteed work, and locating it during the flash means your recall starts instantly and confidently.',
        '📐 Encode positions relative to the grid frame ("2 is mid-left edge") — edge-and-corner anchors decay slower than "somewhere in the middle".'
      ]
    },
    {
      title: 'Precision-first ordering',
      art: {
        kind: 'row',
        items: ['💎 1·2·3', '>', '🌫 4·5·6'],
        caption: 'High confidence early, rough sketch late — locked tiles keep shrinking the search'
      },
      paragraphs: [
        'Because taps are forced ascending, one early hole stalls the whole trail. Allocate encoding quality by tap order, not evenly.'
      ],
      bullets: [
        '💎 Nail the first three or four numbers with high confidence; hold the later ones as a rougher path sketch — you will refine them as green locked tiles shrink the search space.',
        '🧩 Every correct tap is information: the remaining numbers sit only on untouched tiles, so late-trail uncertainty keeps easing. Use it — do not panic about a fuzzy 7 while tapping 2.',
        '🔲 With the Outline assist on, the marked tiles bound your candidates; combine outline positions with the path shape to deduce a forgotten slot instead of guessing.',
        '🎲 A wrong tap costs a life AND re-flashes the board with the correct tile flagged — if you must err, err late in the trail where the re-flash teaches you the most.'
      ]
    },
    {
      title: 'The extreme twist: non-consecutive values',
      art: {
        kind: 'row',
        items: ['3', '8', '14', '27'],
        caption: 'Read ranks, not values — smallest first, then follow the rank path'
      },
      paragraphs: [
        'Extreme scatters arbitrary values (say 3, 8, 14, 27...) instead of 1..n. The path idea still works, but "find the next number" stops being predictable.'
      ],
      bullets: [
        '🥇 During the flash, read RANKS, not values: identify smallest, second-smallest... and build the path through ranks. The exact values barely matter.',
        '🚪 Only the smallest value needs its actual position known cold — it is your entry point; everything after follows the rank path.',
        '🚫 Do not waste flash time memorizing the numbers themselves ("was it 27 or 29?"); the game asks for order, and rank order is cheaper to hold.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'row',
        items: ['✅ 1–4 known', '>', '🕳 hole', '>', '🧩 deduce'],
        caption: 'Tap what you know, then reason from the outlined tiles and the path direction'
      },
      bullets: [
        '🕳 The path "tears" mid-trail (you know 1–4, then nothing): tap what you know, then stop and reason — untouched outlined tiles plus the remembered path direction usually single out the next tile.',
        '📍 Confusing two adjacent tiles is anchor failure, not memory failure — your tags were both "middle-ish". Re-commit to edge/corner-relative encoding.',
        '📖 If you consistently lose the board on the FIRST look, you are still reading serially; drop a tier and practice one-fixation intake where the flash is long enough to feel easy.',
        '🔍 Peek (3 per run, −30 each) re-shows only the REMAINING numbers: spend one when a single hole blocks a long known tail — that trade is usually worth it — never to confirm something you already believe.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📸 intake', '>', '🎯 accuracy', '>', '🪜 tier up'],
        caption: 'Train the first half-second of capture — the rest follows'
      },
      bullets: [
        '🪜 Move up a tier when you clear the current one with lives to spare and no peeks; the lives-left win bonus is the game telling you what it values.',
        '🎓 Retire Slow flash first, then Outline: the outline quietly replaces your own position encoding — worthwhile training is doing that encoding yourself. Both count as help, and clean wins are tracked separately.',
        '📸 Practice the intake skill specifically: play a few rounds caring only about how much of the board you captured in the first half-second, ignoring score.',
        '🐒 Honest note: Ayumu-level snapshots after a 210ms glance remain unmatched by trained humans — but human scores on this task improve a LOT with practice. The improvement is task-specific; enjoy it for what it is.'
      ]
    }
  ],
  references: [
    {
      label: 'Ayumu (chimpanzee) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ayumu_(chimpanzee)',
      note: 'the 2007 Kyoto experiments this game descends from'
    },
    {
      label: 'Eidetic memory — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Eidetic_memory',
      note: 'the "photographic memory" debate around chimp vs. human performance'
    },
    {
      label: 'Peripheral vision — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Peripheral_vision',
      note: 'what the eye actually captures away from fixation during a flash'
    }
  ]
};
