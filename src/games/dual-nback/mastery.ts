import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Dual N-Back" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The single n-back task dates to Wayne Kirchner\'s 1958 working-memory research; the dual version — tracking a spatial stream and a letter stream simultaneously — was developed in working-memory labs and made world-famous by Susanne Jaeggi and colleagues\' 2008 study claiming that dual n-back training raised fluid intelligence. That claim sparked a decade of replication attempts and a brain-training industry; later meta-analyses found the transfer effects largely do not hold up. The task itself, however, remains one of the heaviest legitimate loads you can put on working memory.',
  intro:
    'Dual n-back is two games at once, and mastery hinges on one insight: the streams must not share a memory code. Players who "say" both streams verbally drown at N=2; players who hold positions spatially and letters phonologically can climb to N=4 and beyond. Mastery looks like two independent, rhythmic rehearsal loops running in parallel, independent match decisions per channel, and composure when — inevitably — one loop drops.',
  sections: [
    {
      title: 'Separate the channels',
      art: {
        kind: 'row',
        items: ['👂 letters as sound', '+', '👁 squares as place'],
        caption: 'Two streams, two memory stores — never let them share a code'
      },
      paragraphs: [
        'Working memory has distinct stores for speech-like material and for visual-spatial material. Dual n-back is only possible because of this — so your first job is to route each stream to its own store.'
      ],
      bullets: [
        '👂 Letters: rehearse as sound. Hear "C... K... Q" as a spoken loop, the way you hold a phone number.',
        '🧭 Positions: do NOT name them. Hold them as felt locations or a traced path on the grid — naming positions steals the verbal channel the letters need.',
        '💧 If you catch yourself thinking "top-left" in words, that is the leak that sinks N=3. Retrain with a few single n-back position runs, silently.',
        '🧪 Test yourself: if letter errors spike whenever positions get hard (or vice versa), your channels are still entangled.'
      ]
    },
    {
      title: 'Two loops, one rhythm',
      art: {
        kind: 'row',
        items: ['👁 position', '>', '👂 letter', '>', '🔁 update both'],
        caption: 'The same micro-routine every trial, phase-locked to the rhythm'
      },
      paragraphs: [
        'Run the same first-in-first-out update you would in single n-back, twice, phase-locked to the trial rhythm: compare both channels, answer both decisions, update both queues.'
      ],
      bullets: [
        '📋 Fix an order and keep it — e.g. always judge position first, letter second. A stable micro-routine per trial prevents skipped updates.',
        '🔮 Both, one, or neither button can be correct on a trial. Treat the two decisions as fully independent; "position matched so letter probably didn\'t" is superstition.',
        '✂️ Keep the verbal loop short and clipped ("K-R-S", not "K... R... S") so it fits inside one trial at speed.',
        '🪤 At N=1–2 you can hold letter-position pairs as fused "scenes"; that shortcut collapses at N=3 — build the separated-loop habit early even though fusion feels easier.'
      ]
    },
    {
      title: 'Decision discipline under double load',
      art: {
        kind: 'row',
        items: ['✅ both', '☝️ one', '⛔ neither'],
        caption: 'Two independent decisions every trial — any combination can be right'
      },
      bullets: [
        '🎣 Lures hit twice as often here — a letter or square seen recently but not exactly N back. Only a match against the specific oldest queue item earns a press.',
        '🧮 The scoring pays +3 per correct pass and −10 per mistake: under genuine uncertainty on a channel, passing that channel is the right call.',
        '🛡 Guard the channel you are WORSE at: most players unconsciously spend attention on their stronger stream. Deliberately bias attention toward the weak one; the strong loop runs itself.',
        '⏰ Answer early in the trial window when you can — decisions parked "for a moment" get overwritten by the next stimulus.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'row',
        items: ['💀 one loop drops', '>', '🚫 pass it ×N', '>', '💧 refills'],
        caption: 'Keep the live channel running while the dead one refills from fresh stimuli'
      },
      bullets: [
        '🩹 One loop will drop while the other survives. Do not rebuild the dead loop from guesswork — keep answering the live channel, pass on the dead one for N trials, and let it refill from fresh stimuli.',
        '🔄 Both loops gone: full reset. Pass everything for N trials, breathe, restart the rhythm. A controlled reset costs a handful of points; panic costs the 65% accuracy line.',
        '📉 If resets happen every few trials, the level is too high to train anything — drop one tier and rebuild. Struggling at total overload teaches only frustration.',
        '😴 Late-run collapses are fatigue: dual n-back is among the most draining tasks in this app. Sessions of 10–15 focused minutes beat an hour of degrading accuracy.'
      ]
    },
    {
      title: 'What the science honestly says',
      art: {
        kind: 'banner',
        emojis: '🔬📉🧠',
        caption: 'Far transfer failed to replicate — but the skill itself is real and hard-won'
      },
      paragraphs: [
        'The 2008 claim that dual n-back training raises general intelligence drove millions to this task. The follow-up literature is sobering: improvements are robust on n-back itself and close variants, while far transfer to reasoning or IQ has repeatedly failed to replicate convincingly.'
      ],
      bullets: [
        '💪 Train it because the skill itself is real and hard-won: parallel updating, interference resistance, and grace at capacity.',
        '🚀 Expect a big early jump (finding the two-code strategy) followed by slow capacity grind — the early jump is strategy, not new hardware.',
        '📅 Spacing matters: several short sessions across a week consolidate far better than one binge.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['N1', '>', 'N2', '>', 'N3', '>', 'N4', '>', 'N5'],
        caption: 'Each tier roughly doubles the subjective load — N=2 is where the game begins'
      },
      bullets: [
        '🪜 Climb in order — N runs 1/2/3/4/5 across the tiers, and each step roughly doubles subjective load. N=2 (medium) is where the real game begins.',
        '🎓 Use Show N-back only to onboard a new level (it shows the position and letter from N steps back), then retire it — it counts as help and blocks queue formation.',
        '🐢 Relaxed pace is the better crutch of the two while learning; wean off it before calling a tier beaten.',
        '✨ A clean win at 65%+ accuracy with no assists is the milestone that matters; the statistics page separates clean from helped wins, so let that be the bar.',
        '🔀 If dual stalls completely, alternate with single N-Back at a higher N — sharpening each loop alone often unsticks the pair.'
      ]
    }
  ],
  references: [
    {
      label: 'N-back — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/N-back',
      note: 'covers the dual variant, Jaeggi\'s study, and the replication debate'
    },
    {
      label: 'Baddeley\'s model of working memory — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Baddeley%27s_model_of_working_memory',
      note: 'the phonological-loop / visuospatial-sketchpad split the two-code strategy exploits'
    },
    {
      label: 'Working memory training — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Working_memory_training',
      note: 'the evidence on what n-back training does and does not transfer to'
    }
  ]
};
