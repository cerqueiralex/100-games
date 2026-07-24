import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Stroop Match" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The Stroop effect was described by American psychologist John Ridley Stroop in 1935: naming the ink color of a mismatched color WORD is reliably slower and more error-prone, because reading is automatic and must be suppressed. It became one of psychology\'s most replicated findings and a standard test of attention and cognitive control.',
  intro:
    'Mastery is building a gate against your own reading reflex. You cannot stop reading — it is automatic — but you can learn to answer from a different channel: the visual color signal. Experts pre-commit to the rule before each trial, respond from color perception, and keep speed just below the edge where the word starts winning again.',
  sections: [
    {
      title: 'Answer from the ink channel',
      art: {
        kind: 'row',
        items: ['🟦 RED', '>', '🗣 "blue"'],
        caption: 'The word says red; the ink says blue — the ink wins'
      },
      bullets: [
        '🌫 Soften focus slightly and treat the word as a colored SHAPE — blur defeats reading more than effort does.',
        '🗣 Name the color subvocally ("blue") before your finger moves; the articulated color suppresses the articulated word.',
        '👁 Fix your gaze on the word\'s first letters, not its whole — partial reading weakens the interference.'
      ]
    },
    {
      title: 'Hold the task set',
      art: {
        kind: 'row',
        items: ['📜 "ink, not word"', '>', '🔄 rule switch', '>', '📜 re-state'],
        caption: 'Errors cluster right after rule switches — re-arm the rule every round'
      },
      bullets: [
        '📜 Re-state the current rule to yourself at every round change ("ink, not word") — most errors cluster right after rule switches, not in the middle.',
        '🔀 Mixed rounds (sometimes match-the-word) are set-switching drills: expect a speed dip on the first two trials after a switch and refuse to fight it with haste.',
        '🪤 Congruent trials (word matches ink) are traps of comfort: they train you back into reading — treat every trial identically.'
      ]
    },
    {
      title: 'Speed–accuracy governance',
      art: {
        kind: 'row',
        items: ['🎯 ~95%', '>', '🔥 streak', '>', '🏆 score'],
        caption: 'The accurate tempo is the mathematically optimal one'
      },
      bullets: [
        '⚖️ The Stroop cost is paid in errors when you rush: find the tempo where you are ~95% accurate and hold it; streak bonuses make that tempo mathematically optimal.',
        '🐢 An error should trigger a deliberate one-beat slowdown — post-error trials are your most vulnerable; the pause is profit, not loss.',
        '⏰ Never chase the timer in the last seconds with guesses; late errors cost streaks worth several answers.'
      ]
    },
    {
      title: 'When interference wins',
      art: {
        kind: 'row',
        items: ['❌❌', '>', '🐢 one slow perfect trial', '>', '✅'],
        caption: 'Reset the color channel with one exaggeratedly slow, perfect trial'
      },
      bullets: [
        '🔄 A run of errors means the reading channel recaptured you — reset with one exaggeratedly slow, perfect trial to re-anchor the color channel.',
        '😴 Fatigue amplifies Stroop cost sharply; short sessions with rests preserve the gate.',
        '🏷 If a specific color-word pair keeps beating you (RED in green ink, classically), pre-name that trap and it loses its power.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['📉 errors decay', '>', '⚡ speed follows'],
        caption: 'Control training shows up as error decay before it shows as speed'
      },
      bullets: [
        '📊 Track accuracy separately from score in your history — control training shows up as error decay before it shows as speed.',
        '🔁 Practice both rule directions deliberately; the switch cost, not either rule alone, is what higher tiers actually test.',
        '🔬 Genuine transfer claims for Stroop training are modest — but within-game control, speed and switch resilience train robustly; measure yourself against your own curve.'
      ]
    }
  ],
  references: [
    {
      label: 'Stroop effect — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Stroop_effect',
      note: 'the 1935 experiment, why interference happens, and its variants'
    },
    {
      label: 'Executive functions — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Executive_functions',
      note: 'the inhibition/control system this game exercises'
    }
  ]
};
