import type { MasteryGuide } from '../../platform/types';

/**
 * "How to master N-Back" — strategy content only; the rules live in
 * tutorial.tsx. See DESIGN.md "Mastery guides" for the authoring bar.
 */
export const mastery: MasteryGuide = {
  origins:
    'The n-back task was introduced by psychologist Wayne Kirchner in 1958 as a laboratory measure of working memory — the ability to hold information while continuously updating it. It became a standard tool in cognitive neuroscience for loading the brain\'s executive systems, and jumped into popular culture in the 2000s when working-memory training studies (most famously on the dual variant) made "n-back" a brain-training buzzword. This app\'s version is the classic single spatial n-back: positions on a 3×3 grid.',
  intro:
    'Mastering n-back is mastering a rehearsal loop: holding exactly the last N positions in mind, comparing each new square against the oldest one, then shifting the window forward. At N=1 this feels trivial; at N=3 and beyond, untrained intuition collapses and only deliberate technique survives. Mastery looks like calm, rhythmic updating at N=4–5 with accuracy comfortably above the 70% win line — and knowing that missing a few matches is normal even for experts.',
  sections: [
    {
      title: 'Build the rehearsal loop',
      art: {
        kind: 'row',
        items: ['7·3·5', '>', '3·5·9'],
        caption: 'Drop the oldest, add the newest — a first-in-first-out queue in your head'
      },
      paragraphs: [
        'The core skill is a first-in-first-out queue in your head. Every trial you do three things, in order: compare the new position to the oldest held one, decide (match / no match), then update the queue by dropping the oldest and adding the newest.'
      ],
      bullets: [
        '🏷 Give the nine cells stable names — corners, edges, center, or phone-keypad digits 1–9 — and rehearse the queue verbally: "7... 3... 5".',
        '🗣 Say the queue silently ONCE per trial, always in the same order (oldest first). Constant re-chanting burns time and blurs order.',
        '🔄 The update discipline matters more than the comparison: most errors are queues that silently desynced two trials ago.',
        '🧘 Practice the pure loop at an easy N until it is boringly automatic before adding speed or depth.'
      ]
    },
    {
      title: 'Verbal vs. spatial encoding',
      art: {
        kind: 'grid',
        rows: ['a..', '.a.', '..a'],
        caption: 'Hold the last N squares as one connected shape — a diagonal, an L, a zig-zag'
      },
      paragraphs: [
        'There are two workable codes for a position: a word ("top-left") or a felt location. Verbal encoding is precise and easy to rehearse but slow; spatial "feel" is fast but fragile at higher N. Strong players blend them.'
      ],
      bullets: [
        '👁 At N=1–2, pure spatial works: just hold the recent squares as an afterimage or a short path traced on the grid.',
        '🔤 At N=3+, add the verbal queue — order errors (right cells, wrong sequence) are exactly what verbal rehearsal prevents.',
        '📐 Try encoding the last N positions as one connected shape (an L, a diagonal, a zig-zag) that you extend and trim each trial — one object is cheaper to hold than three locations.',
        '🔒 Whatever code you pick, keep it consistent through a run; switching encodings mid-run is where queues die.'
      ]
    },
    {
      title: 'Decision discipline: beat the lures',
      art: {
        kind: 'row',
        items: ['A', 'B', 'A', '?'],
        caption: 'At N=2 the third square matches — but "seen recently" alone is the lure\'s bait'
      },
      paragraphs: [
        'The nastiest trials are lures — a position that DID appear recently, just not exactly N steps back. Your familiarity sense screams "match!" and it is wrong.'
      ],
      bullets: [
        '⚖️ Never answer from familiarity. Only press Match when the new square equals the specific oldest item in your queue.',
        '⚠️ A gut "I\'ve seen this" with no queue confirmation is precisely the signature of an N−1 or N+1 lure — treat that feeling as a warning, not evidence.',
        '🧮 The scoring makes correct passes worth +5 and mistakes −10: when genuinely unsure, passing is mathematically the better bet.',
        '✋ Keep your fingers relaxed off the button between decisions; hover-pressing converts every lure into an impulse error.'
      ]
    },
    {
      title: 'When it falls apart',
      art: {
        kind: 'row',
        items: ['💥 queue lost', '>', '🚫 pass ×N', '>', '🔄 rebuilt'],
        caption: 'A controlled reset costs a few points; flailing costs the run'
      },
      bullets: [
        '🧯 The moment you notice the queue is lost, do NOT reconstruct — sacrifice the next N trials as no-presses while you rebuild from fresh squares. A controlled reset costs a few points; flailing costs the run.',
        '✂️ Missing several matches in a row usually means your rehearsal rhythm is slower than the trial pace — shorten the cell names ("TL", "7") rather than rushing the loop.',
        '😴 False alarms clustering late in a run are fatigue, not technique. Accuracy needs to be won in the first two thirds; coast conservatively at the end.',
        '🧱 If N=3 feels like a wall for days, that is normal — the jump from 2 to 3 is the hardest in the game. Drop back, sharpen the loop, return.'
      ]
    },
    {
      title: 'What training honestly buys you',
      art: {
        kind: 'banner',
        emojis: '🧠🔬📊',
        caption: 'Gains are real but largely task-specific — enjoy them for what they are'
      },
      paragraphs: [
        'Be clear-eyed: research shows n-back practice makes you dramatically better at n-back, and the once-hyped claim that it raises general fluid intelligence has not held up well in meta-analyses. Gains are largely practice-specific.'
      ],
      bullets: [
        '💪 That does not make practice hollow — updating attention under load, resisting lures, and staying calm at capacity are real, satisfying skills.',
        '📈 Expect fast early gains (strategy discovery), then slow grind (capacity). Both phases are normal.',
        '📅 Short frequent sessions with rest beat marathons; working memory performance degrades sharply with fatigue and the mistakes teach you nothing.'
      ]
    },
    {
      title: 'Improving further',
      art: {
        kind: 'row',
        items: ['N1', '>', 'N2', '>', 'N3', '>', 'N4', '>', 'N5'],
        caption: 'One N per tier — climb in order; each level\'s technique builds on the last'
      },
      bullets: [
        '🪜 Climb the tiers in order — N jumps 1/2/3/4/5 from easy to extreme, and each level\'s technique builds on the last.',
        '🎓 Use the Show N-back assist to LEARN a new level (it outlines the square from N steps back), then turn it off — it counts as help, and the crutch prevents the queue from forming.',
        '🐢 Relaxed pace is scaffolding for the same reason: fine while a new N is raw, retired as soon as the loop keeps up.',
        '📊 Watch accuracy, not score, on your history page: a clean 80% at N=3 is worth more as evidence than a helped 90%, and clean wins are tracked separately.'
      ]
    }
  ],
  references: [
    {
      label: 'N-back — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/N-back',
      note: 'the task, Kirchner\'s 1958 origin, and the training-transfer debate'
    },
    {
      label: 'Working memory — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Working_memory',
      note: 'the cognitive system n-back loads, and its famous capacity limits'
    },
    {
      label: 'Working memory training — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Working_memory_training',
      note: 'the honest state of the evidence on brain-training transfer'
    }
  ]
};
