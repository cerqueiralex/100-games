import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Pattern Recall" — strategy content only; the rules
 * live in tutorial.tsx. See DESIGN.md "Mastery guides" for the bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Flash-a-pattern, reproduce-it tasks descend from the visuospatial memory tests of experimental psychology — the Corsi block-tapping task (Philip Corsi, Montreal 1972) and visual pattern span tests — and from electronic memory games of the Simon era (1978). The paradigm measures the visuospatial sketchpad of Baddeley\'s working-memory model.',
  intro:
    'Mastery is encoding shape, not cells. A flashed pattern held as "an L in the corner plus a dot" survives; the same pattern held as five independent squares dissolves in seconds. Experts compress every board into two or three nameable figures, rebuild from the figures, and protect the fragile buffer from interference until the last tap.',
  sections: [
    {
      title: 'Encode as figures',
      art: {
        kind: 'grid',
        rows: ['a..a', 'a...', 'aa..'],
        caption: '"An L hugging the corner, plus one dot" — two figures, one memory slot each'
      },
      bullets: [
        '🔤 Read the flash as shapes — lines, Ls, triangles, diagonals, letters — and name them silently ("Z plus corner dot"). One figure holds many cells for the price of one memory slot.',
        '⚓ Anchor figures to landmarks: corners, edges and center are free reference points; "L hugging the top-right corner" is sturdier than coordinates.',
        '🧲 Leftover odd cells: attach each to its nearest figure ("the Z\'s tail") instead of memorizing them separately.'
      ]
    },
    {
      title: 'Protect the buffer',
      art: {
        kind: 'row',
        items: ['⚡ flash', '>', '🤫 no chatter', '>', '👆 tap now'],
        caption: 'The visuospatial buffer decays in seconds — reproduce immediately, in one motion'
      },
      bullets: [
        '⚡ Reproduce IMMEDIATELY and in one continuous motion — the visuospatial buffer decays in seconds and every hesitation costs cells.',
        '🤫 Do not talk, subvocalize lyrics, or glance away between flash and answer; visual interference erases visual memory specifically.',
        '🔁 Tap your figures in encoding order: replaying the structure re-strengthens it as you go.'
      ]
    },
    {
      title: 'Symmetry and structure are free',
      art: {
        kind: 'grid',
        rows: ['a..a', '.aa.', 'a..a'],
        caption: 'Mirror symmetry: remember HALF the pattern plus the axis'
      },
      bullets: [
        '🪞 Check the flash for symmetry first: a mirror-symmetric pattern needs only HALF remembered plus the axis.',
        '🔢 Count total cells during the flash when possible ("6 cells") — the count audits your answer before submission.',
        '🎲 Familiar micro-patterns (dice faces, block letters, tetromino shapes) load as single known units — the more shapes you know cold, the bigger your effective span.'
      ]
    },
    {
      title: 'When patterns exceed you',
      art: {
        kind: 'row',
        items: ['💎 figures first', '>', '🎯 loose cells last'],
        caption: 'Partial credit favors the confident core'
      },
      bullets: [
        '💎 Prioritize the structured part: reproduce your figures perfectly and gamble on the loose cells last — partial credit favors the confident core.',
        '📍 A near-miss on position beats an invention: place uncertain cells adjacent to your figure, where flashed cells statistically cluster.',
        '🙈 If the flash caught you mid-blink, commit to what you have instantly — waiting only trades memory for anxiety.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📚 shape vocab', '>', '🗜 compression', '>', '📏 span'],
        caption: 'Span grows with figure vocabulary, not raw effort'
      },
      bullets: [
        '📚 Span grows with figure vocabulary, not raw effort — practice naming flashed shapes fast even outside scoring pressure.',
        '🪜 Climb tiers when your accuracy holds: bigger grids and more cells reward compression more, brute cell-memory less.',
        '📊 Compare your first-half vs second-half accuracy within sessions (the history has every game): visuospatial memory fatigues fast, and knowing your fade point sizes your ideal session.'
      ]
    }
  ],
  references: [
    {
      label: 'Corsi block-tapping test — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Corsi_block-tapping_test',
      note: 'the classic visuospatial span task behind this game'
    },
    {
      label: "Baddeley's model of working memory — Wikipedia",
      url: 'https://en.wikipedia.org/wiki/Baddeley%27s_model_of_working_memory',
      note: 'the visuospatial sketchpad you are training'
    }
  ]
};
