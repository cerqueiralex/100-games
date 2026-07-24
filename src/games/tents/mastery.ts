import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Tents & Trees" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Tents (often "Tents and Trees") is widely credited to the Dutch puzzle magazine Breinbrekers, where it appeared around 1989. From the Netherlands it spread through international puzzle magazines and the World Puzzle Championship\'s variety rounds, and later to digital collections such as Simon Tatham\'s Portable Puzzle Collection, which cemented it as a modern logic-puzzle standard.',
  intro:
    'Mastery of Tents & Trees is the discipline of never placing a tent you cannot prove. Every board here has one solution reachable by pure deduction, and almost all of that deduction is grass: the expert spends most of the game eliminating cells, and the tents then place themselves. Your growth path is learning the counting arguments — line counts, run capacities, tree-tent pairing — in order of power.',
  sections: [
    {
      title: 'Claim the free grass first',
      art: {
        kind: 'grid',
        rows: ['🌳.g', '.gg', 'ggg'],
        caption: 'Only cells beside a tree can hold a tent — everything else is grass'
      },
      paragraphs: [
        'Before thinking about any tent, harvest everything the board gives away. This first sweep routinely decides a third of the grid.'
      ],
      bullets: [
        '🌱 Grass every cell that is not orthogonally adjacent to any tree — a tent must sit beside its tree, so those cells can never hold one.',
        '🌾 A row or column labeled 0 is all grass. Mark it immediately; it often strands cells next to trees elsewhere.',
        '🧱 Grass both diagonal-only neighbors of trees near edges — corners and walls remove candidate cells fast.'
      ]
    },
    {
      title: 'The counting arguments',
      art: {
        kind: 'grid',
        rows: ['1⛺gggg', '3⛺g⛺g⛺'],
        caption: 'Count met → the rest is grass; a 5-run needing 3 tents forces the alternating ends'
      },
      paragraphs: [
        'Every line label is an equation: tents placed + tents still needed = the number on the edge. Two comparisons do most of the work.'
      ],
      bullets: [
        '✅ Count met → the rest of the line is grass (auto-grass does this for you, but doing it by eye is the clean-win skill).',
        '🎯 Remaining candidates = remaining tents needed → every candidate is a tent. Check this after each new grass mark.',
        '📏 Within one line, tents cannot be adjacent, so a run of L consecutive free cells holds at most ⌈L/2⌉ tents. If the line needs exactly that many, the tents go on the run\'s alternating ends — the odd-length run\'s endpoints are forced.',
        '⚖️ A run of exactly 2 cells that must contain 1 tent tells you nothing yet; a run of 3 that must contain 2 forces both endpoints.'
      ]
    },
    {
      title: 'Pair trees with tents',
      art: {
        kind: 'grid',
        rows: ['g⛺g', 'g🌳g'],
        caption: 'Three sides grassed — the tree\'s last free neighbor takes the tent'
      },
      paragraphs: [
        'Tents and trees match one to one. Thinking in pairs — which tree does this tent serve? — unlocks deductions counting alone cannot reach.'
      ],
      bullets: [
        '🌳 A tree with a single free orthogonal neighbor gets its tent there. Re-check every tree after each grass mark; this is the most common forced move.',
        '🔗 If a placed tent has only one adjacent tree that is not yet paired, bind them mentally — that tree\'s other neighbors are now grass.',
        '👥 If two trees share the same two candidate cells between them, those two cells are both tents (each tree needs one) — grass every other neighbor of both trees.',
        '🧮 Count trees against line labels: if the trees adjacent to a row can only put K tents into it and the label says K, cells of that row reachable by no tree are grass.'
      ]
    },
    {
      title: 'The eight-cell shadow',
      art: {
        kind: 'grid',
        rows: ['ggg', 'g⛺g', 'ggg'],
        caption: 'A placed tent grasses all eight surrounding cells instantly'
      },
      paragraphs: [
        'The no-touch rule is your best elimination tool, not just a constraint. Every tent — placed or merely forced-somewhere — casts a shadow.'
      ],
      bullets: [
        '⛺ The instant you place a tent, grass all eight surrounding cells before doing anything else.',
        '🌑 When a tent must be in one of two cells that share neighbors, the shared neighbors are already grass — you do not need to know which cell wins.',
        '⚠️ Two candidate cells diagonal to each other cannot both be tents; if a line needs both of its last two candidates and they touch diagonally, one of your earlier marks is wrong.'
      ]
    },
    {
      title: 'When you stall',
      art: {
        kind: 'row',
        items: ['🌱 grass', '>', '🔢 counts', '>', '🌳 pairing'],
        caption: 'The scan loop — re-run it whenever progress stops'
      },
      bullets: [
        '🔄 Re-run the tree scan — a single new grass mark can leave a distant tree with one neighbor.',
        '🔢 Recount every line against its label; the ⌈L/2⌉ run capacity argument is the one players forget mid-game.',
        '📊 Find the fullest line (label nearly met) and the emptiest (label 1) — both ends of the spectrum give the cheapest deductions.',
        '🚫 If the urge to guess appears, the pairing arguments are where the missing logic lives; ask of each unpaired tree "who serves you?".'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['6×6', '>', '8×8', '>', '10×10', '>', '12×12'],
        caption: 'Tiers add scale, not rules — a strict scan order keeps big boards fast'
      },
      bullets: [
        '✨ Turn off pair check and auto grass to chase clean wins — both count as help while enabled; the manual versions of those checks ARE the skill.',
        '📈 Climb the tiers for scale, not new rules: 6×6 with 8 tents to 12×12 with 29. Big boards reward a strict scan order (free grass → line counts → tree pairing → repeat).',
        '⏱️ Use the par times (3 to 12 minutes) as a pacing target only after your error count is at zero — a misplaced tent costs 15 and usually poisons later deductions.',
        '💡 When you take a hint (−40), stop and work out why that mark was forced before continuing; it is always one of the arguments above.'
      ]
    }
  ],
  references: [
    {
      label: 'Logic puzzle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Logic_puzzle',
      note: 'where Tents sits in the family of grid deduction puzzles'
    },
    {
      label: 'World Puzzle Championship — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/World_Puzzle_Championship',
      note: 'the competition scene where Tents is a recurring variety-round type'
    },
    {
      label: "Simon Tatham's Portable Puzzle Collection",
      url: 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/',
      note: 'the classic free collection whose Tents implementation popularized the puzzle online'
    }
  ]
};
