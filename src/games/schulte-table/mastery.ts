import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Schulte Table" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Schulte tables were devised by German psychiatrist and psychotherapist Walter Schulte (1910–1972) as an attention and visual-search test. They were later adopted by speed-reading schools — especially in the Soviet/Russian tradition — as training for widening the field of visual perception.',
  intro:
    'Mastery is counter-intuitive: the fastest players move their eyes the LEAST. The trained technique is to anchor your gaze at the table\'s center and let peripheral vision find the numbers, expanding your useful field of view until the whole grid reads at once. Finger speed is trivial; gaze discipline is everything.',
  sections: [
    {
      title: 'The central fixation method',
      art: {
        kind: 'grid',
        rows: ['492', '3h7', '651'],
        caption: 'Eyes parked on the center cell — peripheral vision finds the numbers'
      },
      bullets: [
        '🎯 Fix your eyes on the center cell and KEEP them there; locate numbers peripherally and let the finger travel, not the gaze.',
        '⏳ It feels slower for the first sessions — persist; scores drop briefly, then break through your scanning ceiling.',
        '🚨 Check yourself: if you feel your eyes darting cell to cell, you have regressed to search mode — re-anchor mid-game.'
      ]
    },
    {
      title: 'See structure, not cells',
      art: {
        kind: 'grid',
        rows: ['hh..', 'hh..', '....', '....'],
        caption: 'Quadrant awareness cuts the candidate space by four'
      },
      bullets: [
        '🧭 Perceive the grid as quadrants: after finding N, its successor is often diagonal-ish from it — peripheral quadrant awareness cuts the candidate space by four.',
        '🔗 Chunk number runs: reading "7" should pre-activate the shapes of 8 and 9; expectation is faster than recognition.',
        '⏭ Do not linger to verify a found number — commit the tap and move your attention to the NEXT target while the finger executes.'
      ]
    },
    {
      title: 'Rhythm and pressure',
      art: {
        kind: 'row',
        items: ['🎵 steady pace', '>', '🧊 freeze', '>', '🌫 widen gaze'],
        caption: 'On a freeze, soften to whole-grid awareness — the number pops from periphery'
      },
      bullets: [
        '🎼 Keep a metronome-steady pace slightly below your maximum — bursts create the freezes ("where is 14?!") that dominate total time.',
        '🌫 On a freeze, widen instead of hunting: soften your gaze back to whole-grid awareness; the missing number pops out of periphery faster than raster scanning finds it.',
        '🌬 Breathe normally. Held breath is the untold cause of late-table collapse.'
      ]
    },
    {
      title: 'Tier craft',
      art: {
        kind: 'row',
        items: ['5×5', '>', '6×6', '>', '🔠 letters'],
        caption: 'Bigger grids demand central fixation; letters break numeric expectation'
      },
      bullets: [
        '📐 Bigger grids raise the value of central fixation: 5×5 rewards it, 6×6+ demands it.',
        '🔠 Letter or mixed variants (higher tiers) break numeric expectation — practice sequence pre-activation ("after K comes L") consciously.',
        '🔁 The same table size should be trained repeatedly in a session: gains within a size transfer upward, and the literature\'s speed-reading claims aside, visual-span growth on the task itself is very real.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['1–6', '7–12', '13–18', '19–25'],
        caption: 'Time your quarters mentally to find the slow band'
      },
      bullets: [
        '📊 Watch average time per size in your history — a plateau at fixed gaze usually means pace is uneven; time your quarters (1–6, 7–12...) mentally to find the slow band.',
        '🧘 One perfect-discipline game (pure central fixation, steady rhythm) per session beats five frantic ones for skill growth.',
        '🔥 Warm up with a small grid before attempting a record on a big one; visual attention warms up like a muscle.'
      ]
    }
  ],
  references: [
    {
      label: 'Schulte table — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Schulte_table',
      note: 'the test, its inventor and the central-fixation training method'
    },
    {
      label: 'Peripheral vision — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Peripheral_vision',
      note: 'what the training actually recruits'
    }
  ]
};
