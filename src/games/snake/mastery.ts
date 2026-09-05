import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Snake" — strategy only; the rules live in tutorial.tsx.
 * See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Snake descends from Blockade, a 1976 arcade game by Gremlin Industries in which two players left growing walls behind them. Single-player versions followed on home computers through the 1980s, and Nokia’s 1997 build for the 6110 handset — programmed by Taneli Armanto — put the game in hundreds of millions of pockets and made it the mobile classic. This version keeps the phone rules: walls kill, apples grow you, the board fills up.',
  intro:
    'Mastery is turning a reflex game into a planning game. The snake only ever moves one cell at a time, so every crash is a route you chose ten moves earlier. Strong players keep the body in a shape that always has an exit, take apples on a path that returns to that shape, and let the speed rise without letting their decisions get faster than their reading of the board.',
  sections: [
    {
      title: 'Own the perimeter',
      art: {
        kind: 'grid',
        rows: ['aaaa', 'a..a', 'a..a', 'a.h.'],
        caption: 'A snake that hugs the edge leaves the middle open for every apple'
      },
      bullets: [
        '🧭 Early on, run laps around the outside: the body stays on the edge, the centre stays empty, and any apple is a short detour from the lap.',
        '🔁 Keep turning the SAME way. A snake that always turns clockwise never has to think about which way its own tail is coiled.',
        '🚫 Never cut across the middle to save two moves — that is the move that puts your body between you and the next apple.'
      ]
    },
    {
      title: 'The tail is a moving door',
      art: {
        kind: 'grid',
        rows: ['.aaa', '.a.a', 'ha.a', '.aaa'],
        caption: 'The cell the tail is leaving (highlight) is free by the time the head arrives'
      },
      bullets: [
        '🚪 Your own tail cell is safe to enter: it moves away as your head moves in. Following your tail closely is the safest path on a crowded board.',
        '📏 Count segments before threading a gap: a gap closes only if the body around it is still arriving, not if it is already leaving.',
        '🍎 Eating adds a segment WITHOUT moving the tail that tick — the door stays shut one step longer. Do not eat while threading a gap.'
      ]
    },
    {
      title: 'Take apples on the way back',
      art: {
        kind: 'grid',
        rows: ['a...', 'a.b.', 'a...', 'aaa.'],
        caption: 'Loop out to the apple (red) and rejoin the lap, never dead-end at it'
      },
      bullets: [
        '↩️ Approach every apple so that the move AFTER it is already free: plan the exit before the entrance.',
        '🧱 Apples against a wall are the dangerous ones — approach them along the wall, never straight at it, so the turn after is open.',
        '⏱️ Combos pay for speed, not for risk: chain apples that are on your route, let the far one wait a lap.'
      ]
    },
    {
      title: 'Fold as you grow',
      art: {
        kind: 'grid',
        rows: ['aaaa', '...a', 'aaaa', 'a...', 'aaaa'],
        caption: 'The S-fold: long rows joined by short turns keep every column reachable'
      },
      bullets: [
        '〰️ Once the body is longer than a side, switch from laps to an S-fold — full-width rows joined by one-cell turns. It packs the snake tightly and never traps the head.',
        '📐 Keep the fold aligned with the board: a diagonal wander leaves pockets your body can never re-enter.',
        '🆘 When trapped, look for your tail, not for space — the way out is where the body is oldest.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🐍⚡🍎',
        caption: 'Speed rises with every apple — plan two turns ahead, not one'
      },
      bullets: [
        '🎚️ The tiers change speed AND board size: a small fast board fills up quickly (tail discipline), a large one rewards long laps (route discipline). Practise the one your crashes come from.',
        '🎮 Queue your turns: a corner tapped early lands exactly on the cell; two quick taps make a U-turn. Inputs while the head is mid-cell are never lost.',
        '📊 Watch your best combo and length in the results: a rising best combo means your routes are tightening; a length that plateaus means the fold needs work.',
        '🧘 Slow pace is a training tier, not a crutch: play a slow run to learn the fold, then turn it off — clean wins need it off.'
      ]
    }
  ],
  references: [
    {
      label: 'Snake (video game genre) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Snake_(video_game_genre)',
      note: 'Blockade, the Nokia era and the rule variants'
    },
    {
      label: 'Blockade (video game) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Blockade_(video_game)',
      note: 'the 1976 arcade ancestor'
    }
  ]
};
