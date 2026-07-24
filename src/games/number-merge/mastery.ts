import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Number Merge" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Number Merge belongs to the chain-merge genre that flowered after 2048 (Gabriele Cirulli, 2014) proved doubling numbers addictive: games like Merged! and Merge Numbers crossed 2048\'s doubling with the drag-chain input of games like Two Dots (USA, 2014). This app\'s version is an original take on that family.',
  intro:
    'Mastery is building chains that END where the next chain wants to BEGIN. Each merge collapses a chain into one bigger tile at your chosen head; strong players place that head deliberately, farm low tiles in one region while growing a champion tile in another, and read the refill gravity before every big move.',
  sections: [
    {
      title: 'Chain into the future',
      art: {
        kind: 'grid',
        rows: ['2...', '22..', '.h4.'],
        caption: 'The chain of 2s ends at its head (highlight) — right beside the 4 it is about to become'
      },
      bullets: [
        '🎯 End chains NEXT TO equal or adjacent-value tiles: the merged result should immediately enable the next merge — one-move-deep chains are wasted tempo.',
        '📏 Longer chains pay more than repeated short ones — before dragging, extend your candidate chain\'s ends mentally to check for one more link.',
        '🚚 The chain\'s head placement is a free positioning move: use it to ferry value TOWARD your big-tile corner.'
      ]
    },
    {
      title: 'Structure the board',
      art: {
        kind: 'grid',
        rows: ['2...', '42..', 'h84.'],
        caption: 'Champion cornered (highlight), staircase feeding it, smalls farmed on the far side'
      },
      bullets: [
        '🏰 Keep your largest tile in a corner or edge and grow a value staircase toward it, 2048-style — big tiles in mid-board strangle chain routes.',
        '🌾 Farm smalls on the opposite side: clearing low tiles there keeps refills away from your staircase.',
        '🆘 Avoid stranding a lone low tile between giants — it becomes unmergeable dead weight; spend a chain to rescue it early.'
      ]
    },
    {
      title: 'Read the refill',
      art: {
        kind: 'grid',
        rows: ['↓↓..', '....', '224.'],
        caption: 'Fresh tiles fall into the columns you clear — never build the staircase under one'
      },
      bullets: [
        '🌧️ Merging drops new tiles from above: clear columns UNDER planned merges will receive fresh tiles — never build your staircase under a column you regularly clear.',
        '🧭 Vertical chains disturb one column deeply; horizontal chains disturb many shallowly. Choose the axis whose disturbance you can absorb.',
        '🔢 Late-game, count what the target requires: reaching the goal tile from your current champion needs a known number of doublings — check that enough feeder tiles exist.'
      ]
    },
    {
      title: 'When the board clogs',
      art: {
        kind: 'grid',
        rows: ['aa..', '.a..', '.aa.'],
        caption: 'Chains bend — L- and S-shaped routes reach "unreachable" pairs'
      },
      bullets: [
        '🧹 Trigger the smallest available merge inside the clog — even a weak merge opens a route through congested cells.',
        '🐍 Chains may bend freely: search L- and S-shaped paths before declaring two equal tiles unreachable.',
        '♟️ If two regions grew independent staircases, sacrifice the smaller one: ferry it down to feed the main line, accepting the tempo loss once.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🔗📉🏆',
        caption: 'Falling moves-per-win means your chains are lengthening'
      },
      bullets: [
        '📊 Track moves-per-win in your stats: falling move counts mean your chains are lengthening — the single best proxy for skill here.',
        '🧘 Play a session where every chain must set up the next (no opportunistic merges) — the discipline transfers immediately to higher tiers.',
        '🏗️ Higher tiers raise the goal tile: mid-game structure (corner champion, one staircase, one farm) matters more each tier — audit your board layout at the halfway point.'
      ]
    }
  ],
  references: [
    {
      label: '2048 (video game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/2048_(video_game)',
      note: 'the doubling-merge ancestor and its corner-strategy lore'
    },
    {
      label: 'Tile-matching video game — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Tile-matching_video_game',
      note: 'the genre family chain-merge games belong to'
    }
  ]
};
