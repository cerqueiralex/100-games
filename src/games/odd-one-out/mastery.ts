import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Odd One Out" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Odd-one-out is the visual-search paradigm of experimental psychology made into a game: Anne Treisman\'s feature-integration theory (1980) explained why a unique color "pops out" instantly while a subtle shade or shape difference forces serial scanning. Spot-the-difference entertainment magazines had exploited the same effect for decades before the science named it.',
  intro:
    'Mastery is knowing when to let the target pop and when to scan. Big differences announce themselves to a soft, whole-grid gaze in a fraction of a second; subtle ones need a disciplined serial sweep. Experts read the trial\'s difficulty in an instant and pick the right mode instead of staring harder in the wrong one.',
  sections: [
    {
      title: 'Pop-out first',
      art: {
        kind: 'grid',
        rows: ['####', '#a##', '####'],
        caption: 'A big difference tugs at a soft, whole-grid gaze — trust the tug and tap'
      },
      bullets: [
        '👁 Open every trial with a defocused whole-grid glance — if anything tugs at your attention, trust it and tap; pop-out is faster than verification.',
        '🤐 Do not name the difference before tapping on easy tiers; naming is slower than seeing.',
        '⏱ The glance costs a quarter-second — even when it fails, it is nearly free and often prunes half the grid.'
      ]
    },
    {
      title: 'Serial scan for the subtle',
      art: {
        kind: 'grid',
        rows: ['hhhh', '....', '....'],
        caption: 'Nothing pops? Sweep in a fixed order — revisited cells are the hidden time sink'
      },
      bullets: [
        '🧹 When nothing pops, switch modes deliberately: sweep in a fixed order (rows, or a spiral) — revisiting cells is the hidden time sink.',
        '🤝 Compare NEIGHBORS, not memories: judge each tile against the one beside it; relative judgments detect smaller deltas than absolute ones.',
        '🔬 Identify the difference dimension fast (shade? size? rotation? count?) from any two tiles, then scan only that dimension.'
      ]
    },
    {
      title: 'Know the difference taxonomy',
      art: {
        kind: 'row',
        items: ['🎨 shade', '📐 rotation', '🔢 count'],
        caption: 'Identify the dimension from any two tiles, then scan only that dimension'
      },
      bullets: [
        '🎨 Shade deltas: scan in a stable gaze sweep — color discrimination collapses in peripheral vision, so subtle hue trials are always serial.',
        '🪞 Orientation/mirror deltas: mentally normalize (rotate all to upright); mirrored shapes hide best in symmetric grids.',
        '🔢 Count/detail deltas (one dot more, a missing notch): compare tile pairs part by part — these are the slowest class; budget time accordingly.'
      ]
    },
    {
      title: 'Pressure management',
      art: {
        kind: 'row',
        items: ['⬅ left half', '🆚', '➡ right half'],
        caption: 'Halve the grid: a glance comparison often localizes the odd side'
      },
      bullets: [
        '✅ Wrong taps cost more than slow taps once streaks matter: verify with one neighbor-comparison before tapping in scan mode.',
        '🎯 After an error, your eyes return to where the error was — force the next trial\'s opening glance to grid center instead.',
        '➗ On big grids, halve mentally: a quick left-half/right-half glance comparison often localizes the odd side before any scanning.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎯 ≥90% accuracy', '>', '⚡ speed'],
        caption: 'Below 90% you are training guessing, not seeing'
      },
      bullets: [
        '📝 Note which difference dimension slows you most in a session, then play a set hunting ONLY for that dimension — targeted exposure tunes the detector.',
        '🪜 Rising tiers shrink the delta and grow the grid: keep accuracy above ~90% before chasing speed, or you train guessing.',
        '🔀 Alternate glasses-on days of pure pop-out play (fast tiers) with slow scan-discipline days; the two modes improve independently.'
      ]
    }
  ],
  references: [
    {
      label: 'Visual search — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Visual_search',
      note: 'pop-out vs. serial search, the science this game runs on'
    },
    {
      label: 'Feature integration theory — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Feature_integration_theory',
      note: 'Treisman\'s account of why some differences shout and others hide'
    }
  ]
};
