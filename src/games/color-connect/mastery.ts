import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Color Connect" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Color Connect is a Numberlink puzzle: the pair-connecting genre appeared in American puzzle magazines as early as 1897 and was refined by Japan\'s Nikoli in the 1990s. The touch-era boom came with Flow Free (Big Duck Games, USA 2012), which added the fill-every-cell convention this app uses.',
  intro:
    'Mastery is realizing that FILL EVERY CELL is the real rule — connecting pairs is easy, tiling the board with those paths is the puzzle. Strong players route along walls, give congested corners priority, and read which color must own each empty region before drawing anything.',
  sections: [
    {
      title: 'Walls are your friends',
      art: {
        kind: 'grid',
        rows: ['uuuu', 'g..u', 'g..u', 'gggu'],
        caption: 'Edge endpoints hug the border in long sweeps'
      },
      bullets: [
        '🧱 Start with endpoints on edges and corners: their paths usually hug the border, and border cells are the easiest to strand — claim them deliberately.',
        '↪️ A corner cell not containing an endpoint must be a TURN for whichever color passes through; ask which color can plausibly reach both its sides.',
        '🖼️ The outermost ring of the board is usually owned by few colors in long sweeps — resist cutting across it with short paths.'
      ]
    },
    {
      title: 'Order of attack',
      art: {
        kind: 'grid',
        rows: ['p...', '....', '....', '...p'],
        caption: 'The corner-to-corner pair has no alternatives — route it first'
      },
      bullets: [
        '🎯 Route the most constrained pair first: endpoints in opposite corners, or a pair pinned into a narrow channel — their path has no alternatives and defines the skeleton.',
        '🐍 Short-distance pairs LAST: they are flexible filler that can snake through whatever space remains.',
        '⚖️ When two pairs\' straight routes would cross, one must detour — decide which by looking at whose detour space exists, before drawing either.'
      ]
    },
    {
      title: 'Region accounting',
      art: {
        kind: 'grid',
        rows: ['g...', 'g...', 'gggg'],
        caption: 'Only green touches the empty region — inflate its path to swallow it'
      },
      bullets: [
        '🧮 Any empty region touched by only one unfinished color must be filled entirely by that color — inflate its path to swallow the region.',
        '🚫 Never seal a pocket: before completing a path, check you have not enclosed empty cells no remaining color can enter.',
        '🧹 Two endpoints of the SAME color with an empty region between them: the path through the region should sweep it, not skirt it.'
      ]
    },
    {
      title: 'When stuck',
      art: {
        kind: 'grid',
        rows: ['yyyy', '...y', 'yyyy'],
        caption: 'The double back: fold a path on itself to soak up cells'
      },
      bullets: [
        '↩️ Unwind the LAST path first, not the whole board — redraw it one detour wider to donate cells to a starving neighbor region.',
        '🪗 Look for the "double back": stubborn boards usually need one path to fold against itself along a wall to soak up cells.',
        '🎨 The tier\'s color count tells you the texture: more colors (harder tiers) mean shorter average paths — expect tight weaving, not long sweeps.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🎨🧠📉',
        caption: 'Fewer moves per win means better planning'
      },
      bullets: [
        '🙈 Practice completing boards WITHOUT the progress assist, then check coverage at the end — self-estimating coverage builds the region-reading instinct.',
        '📸 Study your winning boards for two seconds before dismissing them: the pattern (walls swept, corners turned) is the curriculum.',
        '📉 Chase fewer moves per win in your stats — move count measures how often you redraw, i.e. how well you planned.'
      ]
    }
  ],
  references: [
    {
      label: 'Numberlink — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Numberlink',
      note: 'the puzzle family: history from 1897 to Nikoli'
    },
    {
      label: 'Flow Free — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Flow_Free',
      note: 'the app that defined fill-every-cell touch play'
    }
  ]
};
