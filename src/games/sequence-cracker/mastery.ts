import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Sequence Cracker" — strategy content only; the rules
 * live in tutorial.tsx. See DESIGN.md "Mastery guides" for the bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Number-sequence puzzles grew out of intelligence testing — sequence completion items appear in the earliest 20th-century IQ batteries (Binet, Raven-era) — and out of recreational mathematics columns. The systematic study of integer sequences was crowned by Neil Sloane\'s On-Line Encyclopedia of Integer Sequences (OEIS), begun in 1964.',
  intro:
    'Mastery is running a fixed diagnostic ladder instead of staring and hoping. Almost every sequence in the game yields to one of six generators — constant difference, changing difference, ratio, alternation, two interleaved sequences, or a recurrence — and the differences table tells you which within seconds.',
  sections: [
    {
      title: 'The diagnostic ladder',
      art: {
        kind: 'row',
        items: ['Δ', '>', 'ΔΔ', '>', '÷', '>', 'split', '>', 'recur'],
        caption: 'Run the rungs in order — the differences table names the generator in seconds'
      },
      bullets: [
        '1️⃣ Step 1 — first differences: constant → arithmetic; done.',
        '2️⃣ Step 2 — differences of differences: constant → quadratic (triangle-number family); done.',
        '3️⃣ Step 3 — ratios: constant → geometric (watch for ×2, ×3, ×1.5 disguised by rounding-free integers).',
        '4️⃣ Step 4 — no pattern yet? Split odd and even positions: two clean interleaved sequences is the most common "hard" disguise.',
        '5️⃣ Step 5 — try a recurrence: each term from the previous two (Fibonacci-like: sum, or a×prev+b).',
        '6️⃣ Step 6 — position-based: squares, cubes, primes, or n×(n+1)-type formulas keyed to the index.'
      ]
    },
    {
      title: 'Read the sequence\'s face',
      art: {
        kind: 'row',
        items: ['2', '6', '18', '54', '?'],
        caption: 'Explosive growth means ratios — skip straight to the ×3 check'
      },
      bullets: [
        '🚀 Explosive growth (doubling or worse) means ratios or recurrences — skip the difference steps.',
        '🔀 Sign flips mean alternation: factor out the ± pattern, solve the absolute values separately.',
        '🌟 Familiar landmarks (1 4 9 16…, 1 1 2 3 5…, 2 3 5 7 11…) should trigger instantly — squares, Fibonacci and primes are the game\'s celebrity guests.'
      ]
    },
    {
      title: 'Confirm before you commit',
      art: {
        kind: 'row',
        items: ['rule', '>', 'test every term', '>', 'commit'],
        caption: 'Agreement between your rule and the differences table is the error firewall'
      },
      bullets: [
        '🔙 A rule must explain EVERY given term, not just the last two — test it backwards to the first term.',
        '🧮 Compute the answer twice: once by your rule, once by extending the differences table; agreement is your error firewall.',
        '✂️ On multiple-choice tiers, eliminate options by parity and magnitude before fine calculation.'
      ]
    },
    {
      title: 'When cracked wide open',
      art: {
        kind: 'row',
        items: ['term', '−', 'n²', '=', 'familiar?'],
        caption: 'Subtract a simple baseline — many hard sequences are a celebrity plus noise'
      },
      bullets: [
        '🔢 Stuck after the ladder? Look at digits, not values: digit sums, reversals and concatenations power the trickiest sequences.',
        '📉 Try subtracting a simple baseline (n, n², 2ⁿ) from each term — many sequences are "famous sequence plus noise you recognize".',
        '💔 Use a life deliberately on genuinely ambiguous cases rather than burning the clock — the scoring favors momentum.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'banner',
        emojis: '🧗🧠📚',
        caption: 'Experts differ from novices mainly in never skipping a rung'
      },
      bullets: [
        '🔁 Drill the ladder until step order is automatic; experts differ from novices mainly in never skipping step 4 (interleaving).',
        '🏛️ Keep a mental museum of sequences that beat you — this game\'s generators repeat families, and yesterday\'s loss is tomorrow\'s instant answer.',
        '🪜 Higher tiers add longer rules, not weirder ones: the same ladder works, it just needs one more rung of patience.'
      ]
    }
  ],
  references: [
    {
      label: 'On-Line Encyclopedia of Integer Sequences — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/On-Line_Encyclopedia_of_Integer_Sequences',
      note: 'Sloane\'s OEIS — the reference for every sequence that exists'
    },
    {
      label: 'Sequence — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Sequence',
      note: 'arithmetic, geometric and recursive sequences, formally'
    }
  ]
};
