import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master Backwards Span" — strategy content only; the rules live
 * in tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'Digit span is one of the oldest measures in psychology — Joseph Jacobs used it to test London schoolchildren in 1887, and Francis Galton\'s circle took it up soon after. The backwards version, where the sequence must be reproduced in reverse, became a fixture of the Wechsler intelligence scales (WAIS), where it still anchors the Working Memory Index: reversal demands not just storage but active manipulation. This app\'s take extends the clinical task into a game — letters and mixed symbols on the top tiers, lives, and a score ramp — but the core is the classic test.',
  intro:
    'Backwards span has two separable skills: holding the sequence, and reversing it. Most players fail the reversal, not the storage — they memorize forwards and then stumble trying to read their own memory backwards under pressure. Mastery means choosing a representation DESIGNED to be read backwards: chunked groups, a visualized string, an anchored final symbol. A reliable backwards span of 7–9, the top tiers\' win line, is genuinely elite territory — clinical norms put typical adults around 4–6.',
  sections: [
    {
      title: 'Encode for reversal, not for order',
      art: {
        kind: 'row',
        items: ['👁 3-8-2-9', '>', '🗣 9-2-8-3'],
        caption: 'Write it on a mental whiteboard, then read the whiteboard right to left'
      },
      paragraphs: [
        'The naive approach — rehearse "3-8-2-9" and then unwind it — makes you reverse under time pressure with no scaffold. Build the reversal into the encoding instead.'
      ],
      bullets: [
        '🖼 Visualize the symbols being written left to right on a mental whiteboard as they flash. At GO, read the whiteboard right to left. This turns reversal into simple reading.',
        '⚓ Anchor the LAST symbol hardest — it must come out first, and it is also the one you saw most recently. Tag it the instant it appears: "ends on 7".',
        '🔁 Rehearse the growing string once per flash gap ("3... 3-8... 3-8-2...") so storage stays solid while the visualization builds.',
        '🔘 The dots under the stage tell you how many symbols are coming — use that to pre-size your whiteboard and know when the anchor symbol arrives.'
      ]
    },
    {
      title: 'Chunk, then reverse chunk-by-chunk',
      art: {
        kind: 'row',
        items: ['814·927', '>', '729·418'],
        caption: 'Reverse the group order, then reverse inside each group'
      },
      paragraphs: [
        'At spans of 6+, a single string overloads. Split it into groups and reverse in two levels: last group first, each group read backwards.'
      ],
      bullets: [
        '✂️ Chunk in pairs or triples as the sequence arrives: 8-1-4-9-2-7 becomes "814 / 927".',
        '🔃 Output = reverse the group order, then reverse inside each group: "927" backwards is 7-2-9, then "814" backwards is 4-1-8.',
        '🧘 Practice the two-level unwind at easy spans until it is mechanical — doing it for the first time at span 8 is how runs die.',
        '🎁 Digits that form familiar numbers ("77", "42", a year) glue into chunks for free; exploit any structure the sequence hands you.'
      ]
    },
    {
      title: 'Symbols get harder: digits → letters → mixed',
      art: {
        kind: 'row',
        items: ['🔢 7 2 9', '>', '🔠 K A F', '>', '🔣 4 R 8'],
        caption: 'Same task, heavier encoding, tier by tier'
      },
      paragraphs: [
        'The pro tier switches to letters and extreme mixes letters with digits. Same task, heavier encoding — letter strings have less built-in structure than numbers.'
      ],
      bullets: [
        '🗣 Pronounce letters as one flowing pseudo-word where you can ("K-A-F-U" → "kafu"); a word is one chunk instead of four items.',
        '🏷 On mixed sequences, note the CATEGORY pattern too ("digit-digit-letter-digit") — it is a free second cue that catches transposition errors.',
        '🤝 Confusable pairs are already removed (no I/O), so trust what you saw; second-guessing a clearly-seen symbol is a worse bet than trusting it.',
        '🐢 Slow your entry on these tiers: the pad has more keys, and a mistyped symbol you actually remembered is the most preventable way to lose a life.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'row',
        items: ['💪 first', '😵 middle', '💪 last'],
        caption: 'The serial-position effect: errors cluster in the middle of the string'
      },
      bullets: [
        '🧊 Blanking mid-entry: freeze, do not guess-fill. Re-read your mental whiteboard from the still-remembered end; often only one slot is truly gone, and Backspace lets you fix a slip before the check.',
        '🥪 Systematically losing the MIDDLE symbols is the classic serial-position effect — first and last items are cheap, the middle is expensive. Give the middle chunk a deliberate extra rehearsal.',
        '🔀 Swapping neighbors (entering 2-9 for 9-2) means you stored the set but not the order — slow the rehearsal so each item is said in rhythm, and lean harder on the whiteboard image.',
        '🪜 Failing right at the span-up round is normal: each round adds a symbol, and your limit is your limit. What is trainable is failing gracefully — one life, not two, per new span.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['💾 storage', '>', '🔃 reversal', '>', '📏 span 9'],
        caption: 'Diagnose which skill failed — storage and reversal need different fixes'
      },
      bullets: [
        '⏩ Win easy (forward span) quickly and move on — forward recall trains storage but skips the manipulation skill this game is named for. Medium, with reversal on digits, is where training starts.',
        '🩺 Use Replay (3 per run, costs points) as a diagnostic: when you need it, ask whether storage failed (you never had the string) or reversal failed (you had it and mangled it) — they need different fixes above.',
        '🎓 Retire Slow flash as soon as a tier is winnable with it; the presentation rate is part of the difficulty, and it counts as help.',
        '📏 Chase spanReached on your history page, not just wins — a losing run that touched span 9 is better training evidence than a safe win at 7.',
        '💡 Honest note: practice reliably grows your span on THIS kind of task; expect little transfer to general memory. The prize is the skill itself.'
      ]
    }
  ],
  references: [
    {
      label: 'Memory span — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Memory_span',
      note: 'digit span forwards and backwards, norms, and its history in testing'
    },
    {
      label: 'Wechsler Adult Intelligence Scale — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Wechsler_Adult_Intelligence_Scale',
      note: 'the clinical home of backwards digit span (Working Memory Index)'
    },
    {
      label: 'Serial-position effect — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Serial-position_effect',
      note: 'why the middle of a sequence is where your errors cluster'
    }
  ]
};
