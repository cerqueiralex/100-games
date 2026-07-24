import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master 2048" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    '2048 was written in a single weekend in March 2014 by Gabriele Cirulli, a 19-year-old Italian developer, as a free, open-source take on Veewo Studio’s 1024 — itself inspired by Asher Vollmer’s elegant iOS game Threes! released two months earlier. Cirulli put it on the web for free and it went explosively viral, spawning hundreds of clones within weeks. This app follows his rules, with a roomier 5×5 board on easy and spawn-rate twists plus temporary blocker tiles on extreme.',
  intro:
    'Mastering 2048 means trading short-term merges for long-term structure. Random play stalls around 512; disciplined play makes 2048 routine and 4096 reachable, because the game is less about spotting merges than about never letting your biggest tiles drift out of order. The whole craft fits in two habits: lock your largest tile in a corner, and build a single decreasing chain leading into it.',
  sections: [
    {
      title: 'Lock a corner and never leave it',
      art: {
        kind: 'grid',
        rows: ['....', '2...', '42..', 'h842'],
        caption: 'Biggest tile locked in the corner (highlight); values fall away from it'
      },
      paragraphs: [
        'Pick one corner — say bottom-left — and treat it as home for your largest tile for the entire game. Everything else follows from protecting it.'
      ],
      bullets: [
        '🏠 Use only three directions: with a bottom-left anchor, swipe left and down freely, right only when you must — and treat the fourth direction (up) as forbidden.',
        '🛡️ The corner tile only moves if a swipe can shift its row or column. Keep the bottom row completely full and swiping left/right can never disturb it.',
        '🐑 One forced bad swipe rarely loses the game; what loses it is not spending the next few moves herding the big tile straight back into its corner.'
      ]
    },
    {
      title: 'Build a snake chain',
      art: {
        kind: 'grid',
        rows: ['....', '8765', '1234'],
        caption: 'Snake order: 1 is your biggest in the corner, each next number its half — merges cascade home'
      },
      paragraphs: [
        'Arrange your tiles in strictly decreasing order along a snake: biggest in the corner, then descending across the bottom row, then turning back along the row above. When a new tile matches the chain’s tail, the whole snake collapses inward in a cascade of merges.'
      ],
      bullets: [
        '🔗 Every tile should have its next-double as a neighbor along the snake — a 128 sitting nowhere near your 256 is dead weight.',
        '🧲 Merge toward the corner, not away: combine small tiles on the open side of the board so results slide down the chain.',
        '🐛 Two tiles of the same value far apart is a structural bug. Fix it early, while the tiles are small and cheap to move.'
      ]
    },
    {
      title: 'Play the spawns, not just the board',
      art: {
        kind: 'grid',
        rows: ['..hh', '...h', '42..', '8442'],
        caption: 'Anchor bottom-left with a full row; the spawn zone (highlight) stays top-right'
      },
      bullets: [
        '❤️ Count empty cells — they are your health bar. Below four empties, stop chasing points and make consolidating merges.',
        '🎲 Before each swipe, ask where a spawn could land and whether a 4 (not a 2) there would hurt; on hard and up, 4s spawn 20–25% of the time.',
        '📍 Prefer swipes that keep the spawn zone away from your chain: with a bottom-left anchor, you want new tiles appearing top-right.',
        '⏳ On extreme, a non-merging blocker occasionally drops in. It expires after a few moves — never rebuild your chain around it; keep merging elsewhere and let it evaporate.'
      ]
    },
    {
      title: 'When the board jams',
      art: {
        kind: 'grid',
        rows: ['....', '.8..', 'x42.'],
        caption: 'The big tile drifted off its corner (✕) — restore the anchor before scoring'
      },
      bullets: [
        '🚨 If your big tile got knocked out of the corner, drop everything and restore it — a full anchor row/column is the only reliable shield.',
        '🔧 Look for one chain-repairing merge rather than the biggest merge; the Hint arrow is greedy and will happily suggest a swipe that breaks your snake.',
        '🧪 Use Undo (up to 5, counts as help) as a lab: replay the jam and find the swipe that would have kept the chain intact — that lesson persists into games where you use no undos.',
        '🧘 Truly locked with one move available? Take it, then spend every following move re-consolidating before scoring again.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['🎓 5×5 easy', '>', '🧼 clean 4×4', '>', '🏔️ 4096'],
        caption: 'Graduate a tier only when the one below is boring'
      },
      bullets: [
        '🏫 Easy’s 5×5 board (target 1024) is the practice room: the extra space makes chain discipline visible. Graduate to 4×4 medium once you win without ever swiping your forbidden direction.',
        '✨ Turn off Easy spawns and chase clean wins (no undo, no hint) — the history page tracks clean and assisted wins separately.',
        '🏆 The win target is not the end: keep playing after 2048/4096 for score. Merges score the tile they create times the tier multiplier, so late-game chain cascades are worth more than everything before them.',
        '🧗 Reaching the extreme target means holding the discipline through 25% four-spawns and blockers — if 4096 feels far, first make hard-tier 2048 boring.'
      ]
    }
  ],
  references: [
    {
      label: '2048 (video game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/2048_(video_game)',
      note: 'history, reception and the 1024/Threes lineage'
    },
    {
      label: 'Threes — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Threes',
      note: 'the design ancestor whose merge idea started the genre'
    },
    {
      label: 'play2048.co',
      url: 'https://play2048.co/',
      note: 'Cirulli’s original, still free online'
    }
  ]
};
