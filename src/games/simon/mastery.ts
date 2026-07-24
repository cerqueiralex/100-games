import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Simon" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Simon was created by Ralph Baer — the inventor of the home video-game console — and Howard J. Morrison for Milton Bradley, launching in 1978 with a midnight party at New York\'s Studio 54. It refined Atari\'s 1974 arcade game Touch Me, which Baer admired mechanically but found ugly-sounding; Simon\'s four pads instead play bugle-like notes chosen so ANY sequence sounds musical. It became one of the defining toys of the late 1970s and has never been out of production since.',
  intro:
    'Mastering Simon means turning a raw color sequence into structures your memory holds for free: melodies, rhythms, and finger paths. Nobody remembers 20 arbitrary colors as 20 items — champions remember a song with four notes in it. Your goal is to build multi-channel encoding (sound + space + motion) so deep that the sequence replays itself, then survive the speed ramp on the higher tiers.',
  sections: [
    {
      title: 'Hear it, don\'t watch it',
      art: {
        kind: 'grid',
        rows: ['gb', 'yu'],
        caption: 'Four pads, four fixed tones — the melody is the memory'
      },
      paragraphs: [
        'Each pad has a fixed tone, and the tones were literally designed to form a chord. Audio memory for melody is dramatically better than visual memory for color order — make sound your primary channel from day one.'
      ],
      bullets: [
        '🎧 Learn the four tones cold: play a few easy rounds eyes-closed-ish, naming pads by pitch (high, low, middle...) until each tone instantly maps to a pad.',
        '🎤 During playback, sing along silently. The sequence becomes a tune; a new step is just one more note on the end of a melody you already know.',
        '🔊 Keep the sound on. Muted Simon throws away the strongest memory channel the game has.'
      ]
    },
    {
      title: 'Chunk the sequence like a phone number',
      art: {
        kind: 'row',
        items: ['🔴🔴🔵', '>', '🟢🟡🔵'],
        caption: 'Say it rhythmically: "red-red-blue... green-yellow-blue" — chunks, not steps'
      },
      paragraphs: [
        'Working memory holds roughly four items — but an "item" can be a group. Break the sequence into chunks of 3–4 and remember chunks, not steps.'
      ],
      bullets: [
        '🥁 Group in threes or fours with a mental beat between groups: "red-red-blue... green-yellow-blue..." said rhythmically.',
        '📌 Keep chunk boundaries FIXED as the sequence grows — each round appends one note to the final (incomplete) chunk, and everything earlier stays already-learned.',
        '🏷 Give distinctive chunks names ("the double-red", "the diagonal") — a named chunk is nearly impossible to lose.',
        '🎶 Repeated notes are rhythm, not just repetition: "blue-blue-blue" is one drum fill, not three items.'
      ]
    },
    {
      title: 'Let your fingers learn it too',
      art: {
        kind: 'row',
        items: ['👁 watch', '>', '🤏 micro-mime', '>', '🖐 replay'],
        caption: 'Pre-load the motor sequence during playback — your hand learns the dance'
      },
      paragraphs: [
        'The third channel is motor memory. Long sequences are retained partly as a dance your hand knows.'
      ],
      bullets: [
        '🤏 During playback, micro-mime each press (twitch toward the pad without touching). You are pre-loading the motor sequence.',
        '🐢 Replay at YOUR tempo, not the playback\'s — a steady comfortable rhythm keeps chunks intact; rushing tears them.',
        '🖐 Use the same finger(s) and hand position every game so the spatial pattern stays consistent.',
        '🤖 If you blank mid-entry, keep your hand moving on autopilot for a beat — motor memory often knows the next pad before conscious recall does.'
      ]
    },
    {
      title: 'Surviving the speed ramp',
      art: {
        kind: 'row',
        items: ['620ms', '>', '440ms', '>', '250ms'],
        caption: 'Playback accelerates by tier — but only the last note is ever new'
      },
      paragraphs: [
        'Higher tiers play the sequence back faster (620ms per step on easy down to 250ms on extreme) and demand longer runs — round 16, 20, 24. Speed pressure attacks your chunking, not your memory.'
      ],
      bullets: [
        '🎼 At high speed, stop trying to "see" each flash; track the melody line and let chunks form on the beat.',
        '➕ Only the LAST note is new each round. If the old part is truly learned, a fast playback only needs you to catch one note.',
        '🔂 Confirm the new note immediately after playback by mentally replaying just the final chunk once — then enter.',
        '🧗 Train one tier up with the Slow playback assist as scaffolding, then retire it: it counts as help, and weaning off it is the actual skill gain.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'row',
        items: ['🟢🟡🔵', '>', '🔴🔴', '>', '❓'],
        caption: 'Dying at the same length every run means the chunks are too big — drop from 4s to 3s'
      },
      bullets: [
        '✂️ Almost all failures happen at chunk boundaries — if you always die around the same length, your chunks are too big; drop from 4s to 3s.',
        '🔢 A "was it 12 or 13 steps?" doubt means you counted steps instead of chunks. Never count; trust the melody\'s shape.',
        '👂 One wrong press with Second chances on: do not panic-repeat from memory of your FINGERS — listen to the replay fully and rebuild from the melody.',
        '🌫 Interference is real: two Simon games back-to-back blur into each other. Take a short break between attempts and the old sequence fades cleanly.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['✨ clean win', '>', '🪜 next tier', '>', '🏆 record'],
        caption: 'Short, spaced sessions beat marathons — and every extra round is worth more than the last'
      },
      bullets: [
        '🛡 Progress tier by tier only when you can win with Second chances OFF — a clean win here means zero safety nets, and the history page tracks it.',
        '🔍 Use the Replay button as a learning tool during practice runs (it counts as help), asking each time: which channel failed — sound, space, or motion?',
        '📈 Push past your winning round even after the win is banked; the score is round × 10 × multiplier, so every extra round is worth more than the last.',
        '📅 Practice short and often. Sequence memory improves more from five 10-minute sessions than one 50-minute grind — spacing beats massing.'
      ]
    }
  ],
  references: [
    {
      label: 'Simon (game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Simon_(game)',
      note: 'full history: Baer, Morrison, Touch Me, and the Studio 54 launch'
    },
    {
      label: 'Ralph H. Baer — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ralph_H._Baer',
      note: 'the co-creator, also the father of the home video-game console'
    },
    {
      label: 'Chunking (psychology) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Chunking_(psychology)',
      note: 'the core memory mechanism behind every long Simon run'
    }
  ]
};
