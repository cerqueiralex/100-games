import type { BrainDomain, BrainDomainId } from './types';
import { refs } from './references';

/**
 * The nine Brain Lab areas (SCIENCE.md §1.1) — the owner's six plus the three
 * the research judged most important (Processing Speed, Flexibility,
 * Spatial). Learning and Verbal are phase 2 (§1.2): their phone paradigms
 * are not yet validated well enough to ship as benchmarks.
 *
 * This list is THE vocabulary: area cards, the radar, the dashboard, the
 * coach and the check-in all derive from it and from the benchmark registry
 * — never enumerate areas anywhere else. Order is display order (radar
 * clockwise from the top).
 *
 * EVIDENCE RULE (the owner's, and validate's): every claim here cites a
 * verified source from references.ts. A training game is linked ONLY when it
 * mirrors a research paradigm for the construct (cited in `sources`), and its
 * `evidence` line says honestly what practising that kind of task is known
 * to do — no game has been studied as itself. Games with no such source were
 * removed (make-24, target-number, mathdoku, logic-grid, house-puzzles,
 * tangram, pipes, laser-mirrors, color-connect, snake, jigsaw, count-compare)
 * — so Precision and Reaction have no training games, and say why. Every
 * `improve` tip's wording stays within what its sources found (abstracts
 * checked 2026-10-31); SCIENCE.md Appendix D maps each decision to them.
 *
 * Copy rules (SCIENCE.md §4): subtitles are the honest ones §4.2 prescribes;
 * `practice` is §3.4; nothing promises a benefit beyond the evidence.
 */
export const BRAIN_DOMAINS: BrainDomain[] = [
  {
    id: 'attention',
    name: 'Attention',
    short: 'Attention',
    subtitle: 'Attention control',
    about:
      'Staying on goal while something on the screen pulls you the other way. Attention control underlies focus, ignoring distraction and resisting the automatic response — measured here as how many conflict decisions you get right in 90 seconds.',
    practice:
      'This test barely changes with practice, so changes mostly reflect your state that day. Attention games make you better at those games; in a meta-analysis, transfer to untrained attention tests was not significant.',
    slot: 4,
    sources: refs('burgoyne2023', 'hedge2018'),
    training: [
      {
        gameId: 'stroop-match',
        paradigm: 'Stroop colour–word interference',
        why: 'Answering the ink colour, not the word, means overriding an automatic response — the Stroop paradigm.',
        evidence: 'Practice reduces Stroop interference on the practised task; in a meta-analysis of computerized training, transfer to untrained attention tests was not significant.',
        sources: refs('stroop1935', 'macleod1991', 'macleodDunbar1988', 'lampit2014')
      },
      {
        gameId: 'schulte-table',
        paradigm: 'Schulte-grid visual search',
        why: 'Finding the numbers in order is visual search that keeps attention on target — the Schulte grid is studied as a visual-search attention task, including its two-colour version.',
        evidence: 'Visual search speeds up with practice — some searches become effortless after a few hundred trials — and the learning lasts.',
        sources: refs('lu2022', 'sireteanuRettenbach1995')
      },
      {
        gameId: 'odd-one-out',
        paradigm: 'Odd-one-out visual search',
        why: 'Spotting the one tile that differs is visual search; the more the other tiles resemble it, the harder the search.',
        evidence: 'Visual search speeds up with practice and the learning lasts; it is less specific than other kinds of perceptual learning.',
        sources: refs('treismanGelade1980', 'duncanHumphreys1989', 'sireteanuRettenbach1995')
      },
      {
        gameId: 'moving-cups',
        paradigm: 'Object tracking among identical distractors',
        why: 'Following the cup that hides the ball through the shuffle is attentive tracking of one object among identical ones, as in the multiple-object-tracking paradigm.',
        evidence: 'Practising a task improves that task; there is little evidence that gains from brain games carry over to everyday attention.',
        sources: refs('pylyshynStorm1988', 'simons2016')
      }
    ],
    improve: [
      {
        id: 'attention-sleep',
        kind: 'habit',
        title: 'Protect your sleep',
        body: 'In a meta-analysis of 70 studies, short-term sleep deprivation hit attention hardest — lapses in simple attention showed the largest effect — while reasoning was barely affected.',
        sources: refs('limDinges2010')
      },
      {
        id: 'attention-exercise',
        kind: 'habit',
        title: 'Move, and time it well',
        body: 'A single bout of moderate-to-vigorous exercise gives a short-lived boost to cognition afterwards (strong evidence), and regular activity is linked to better executive function and processing speed (moderate evidence).',
        sources: refs('erickson2019')
      },
      {
        id: 'attention-mindfulness',
        kind: 'practice',
        title: 'Mindfulness: promising, not proven',
        body: 'A systematic review of 23 studies suggested that the early, focused-attention phase of mindfulness training may improve selective and executive attention — preliminary evidence, not a guarantee.',
        sources: refs('chiesa2011')
      },
      {
        id: 'attention-games',
        kind: 'practice',
        title: 'Play attention games for themselves',
        body: 'Attention games make you better at those games; transfer to untrained attention tests was not significant in a meta-analysis, and everyday benefits are rarely shown.',
        sources: refs('lampit2014', 'simons2016')
      }
    ]
  },
  {
    id: 'memory',
    name: 'Memory',
    short: 'Memory',
    subtitle: 'Working memory (spatial)',
    about:
      'Holding a short sequence of locations in mind for a few seconds and replaying it. This is working memory — the mental notepad used for following directions and keeping track — not long-term or everyday episodic memory (that is the planned Learning area).',
    practice:
      'Memory games improve those games and similar memory tasks, moderately and sometimes for months, but not intelligence. Games built like this test, such as Simon and Number Trail, can raise this score through task skill.',
    slot: 5,
    sources: refs('woods2016', 'kessels2000'),
    training: [
      {
        gameId: 'backwards-span',
        paradigm: 'Backward digit span',
        why: 'Reversing a sequence you just saw means holding it and manipulating it — backward recall is used as a working-memory measure.',
        evidence: 'Working-memory training improves the trained tasks and similar ones; it does not improve intelligence or other abilities.',
        sources: refs('stClairThompson2010', 'reynolds1997', 'melbyLervag2016')
      },
      {
        gameId: 'pattern-recall',
        paradigm: 'Visual pattern span',
        why: 'Re-creating a briefly shown pattern of cells is the visual pattern-span paradigm for visuo-spatial memory.',
        evidence: 'Working-memory training improves the trained tasks and similar ones; it does not improve intelligence or other abilities.',
        sources: refs('dellaSala1999', 'melbyLervag2016')
      },
      {
        gameId: 'number-trail',
        paradigm: 'Corsi-type spatial sequence recall',
        why: 'Tapping remembered positions in order mirrors the Corsi block-tapping paradigm this area’s benchmark is built on.',
        evidence: 'Working-memory training gains come largely from learning task-specific skills — so a Corsi-like game can raise your Block Span score without a wider change.',
        sources: refs('kessels2000', 'gathercole2019')
      },
      {
        gameId: 'simon',
        paradigm: 'Serial span (sequence reproduction)',
        why: 'Repeating an ever-longer sequence of positions is a serial span task, close to the Corsi paradigm.',
        evidence: 'Working-memory training gains come largely from learning task-specific skills — so a Corsi-like game can raise your Block Span score without a wider change.',
        sources: refs('kessels2000', 'gathercole2019')
      }
    ],
    improve: [
      {
        id: 'memory-chunking',
        kind: 'strategy',
        title: 'Group items into chunks',
        body: 'Span grows mostly through strategy: with hundreds of hours of practice and a chunking strategy, one person raised his digit span from about 7 to 79 digits — while his span for letters stayed normal.',
        sources: refs('ericsson1980', 'gathercole2019')
      },
      {
        id: 'memory-expectations',
        kind: 'practice',
        title: 'Expect task-specific gains',
        body: 'Working-memory training improves the trained tasks and closely similar ones, but not intelligence or other abilities.',
        sources: refs('melbyLervag2016', 'sala2019')
      },
      {
        id: 'memory-state',
        kind: 'habit',
        title: 'Compare like with like',
        body: 'Working memory is among the abilities affected by short-term sleep deprivation, and memory performance varies with time of day — test rested, at a similar hour.',
        sources: refs('limDinges2010', 'schmidt2007')
      }
    ]
  },
  {
    id: 'calculation',
    name: 'Calculation',
    short: 'Calculation',
    subtitle: 'Arithmetic fluency',
    about:
      'How quickly and accurately you produce answers to everyday mental arithmetic — the four operations, with and without carrying. Fluency frees attention for harder problems; it is measured here as correct answers per minute.',
    practice: 'Arithmetic improves with practice, mostly on the problem types you practise.',
    slot: 3,
    sources: refs('loenneker2025'),
    training: [
      {
        gameId: 'math-sprint',
        paradigm: 'Timed arithmetic-fact practice',
        why: 'Answering as many problems as you can against the clock is the fluency format this area’s benchmark uses.',
        evidence: 'In a meta-analysis of fluency interventions, drill and practice with modelling produced the largest effects; arithmetic practice transfers only partly to problems and operations you did not practise.',
        sources: refs('codding2011', 'rickard1994')
      }
    ],
    improve: [
      {
        id: 'calculation-drill',
        kind: 'practice',
        title: 'Short, regular drill',
        body: 'Drill and practice with modelling produced the largest effects among math-fact fluency interventions (single-case studies with students).',
        sources: refs('codding2011')
      },
      {
        id: 'calculation-specific',
        kind: 'strategy',
        title: 'Practise the operations you miss',
        body: 'Arithmetic practice transfers only partly across operations and formats — practise the operation that costs you most (your results show per-operation accuracy).',
        sources: refs('rickard1994')
      }
    ]
  },
  {
    id: 'analysis',
    name: 'Analysis',
    short: 'Analysis',
    subtitle: 'Pattern reasoning',
    about:
      'Finding the rule in a pattern you have never seen and applying it. Matrix reasoning is the closest relative of what intelligence tests sample — but this is not an IQ score, and one test is not a measure of intelligence.',
    practice:
      'Scores rise over the first sessions as you learn the rules. That is skill at this task, not rising intelligence.',
    slot: 10,
    sources: refs('carpenter1990', 'matzen2010', 'chierchia2019'),
    training: [
      {
        gameId: 'sequence-cracker',
        paradigm: 'Number-series completion',
        why: 'Finding the rule behind a sequence and predicting the next term is the classic series-completion task of inductive reasoning.',
        evidence: 'In 74 training experiments with children, practising a rule-finding comparison strategy improved reasoning-test performance and classroom learning; comparable evidence for adults playing puzzle games is lacking.',
        sources: refs('simonKotovsky1963', 'klauerPhye2008')
      },
      {
        gameId: 'code-breaker',
        paradigm: 'Mastermind logical deduction',
        why: 'Deducing a hidden code from feedback is the logical-deduction game studied in cognitive psychology as hypothesis testing.',
        evidence: 'Players’ deductions became more accurate and complex with continued play; transfer beyond the game has not been tested.',
        sources: refs('best1990', 'simons2016')
      }
    ],
    improve: [
      {
        id: 'analysis-rules',
        kind: 'strategy',
        title: 'Know the rule types',
        body: 'A short video teaching the rules behind figural matrices raised matrix-test scores substantially — so part of any gain here is rule knowledge, not a change in reasoning ability.',
        sources: refs('schneider2020')
      },
      {
        id: 'analysis-retest',
        kind: 'measurement',
        title: 'Early gains level off',
        body: 'Across ability tests, retest gains are largest over the first two retests and plateau by about the third — judge your trend after that.',
        sources: refs('scharfen2018')
      },
      {
        id: 'analysis-state',
        kind: 'measurement',
        title: 'Your steadiest area',
        body: 'Reasoning accuracy was the least affected ability in a meta-analysis of short-term sleep deprivation, so a dip here is less likely to be just a short night.',
        sources: refs('limDinges2010')
      }
    ]
  },
  {
    id: 'precision',
    name: 'Precision',
    short: 'Precision',
    subtitle: 'Touch-aiming precision',
    about:
      'How efficiently you hit targets with your finger, balancing speed against accuracy — measured as throughput in bits per second, the ISO standard for pointing. It means touch aiming on this screen, not general hand dexterity.',
    practice:
      'Experienced phone users are already near their ceiling, so a big jump usually means a change of posture, strategy or device.',
    slot: 11,
    sources: refs('soukoreff2004', 'mackenzie2015'),
    // deliberately empty: no study links any game here to touch-aiming
    // throughput, so none is offered (the evidence rule)
    training: [],
    improve: [
      {
        id: 'precision-posture',
        kind: 'measurement',
        title: 'One posture, every time',
        body: 'Holding the phone or resting it on a table gave similar throughput in a smartphone study, but switching between them adds noise to your trend — pick one and keep it.',
        sources: refs('mackenzie2015')
      },
      {
        id: 'precision-balance',
        kind: 'strategy',
        title: 'Balance speed and accuracy',
        body: 'Throughput is built to reward the balance: rushing and missing, or crawling carefully, both cost you. The standard computes it from your effective accuracy, not just hits.',
        sources: refs('soukoreff2004')
      },
      {
        id: 'precision-ceiling',
        kind: 'measurement',
        title: 'Expect a ceiling',
        body: 'Experienced touchscreen users are already close to their pointing ceiling, so a large change usually means a change of posture, strategy or device rather than skill.',
        sources: refs('mackenzie2015', 'sharif2020')
      }
    ]
  },
  {
    id: 'reaction',
    name: 'Reaction',
    short: 'Reaction',
    subtitle: 'Alertness',
    about:
      'How quickly and consistently you respond when nothing tells you exactly when to. This is vigilant attention — the most sensitive everyday marker of sleep loss and fatigue — so it is your daily "state" reading, not a reflex you train.',
    practice:
      'This does not improve with practice. A better score means better alertness: sleep, time of day, recovery, caffeine.',
    slot: 15,
    sources: refs('basnerDinges2011', 'basnerMolliconeDinges2011'),
    // deliberately empty: no game trains alertness (SCIENCE.md §3.4) — the
    // levers are sleep, timing and recovery
    training: [],
    improve: [
      {
        id: 'reaction-sleep',
        kind: 'habit',
        title: 'Sleep enough, every night',
        body: 'Two weeks of 6-hour nights produced vigilance deficits comparable to up to two nights without sleep — while people rated themselves only slightly sleepy.',
        sources: refs('vanDongen2003')
      },
      {
        id: 'reaction-caffeine',
        kind: 'habit',
        title: 'Caffeine sharpens vigilance',
        body: 'Caffeine from about 40 to 300 mg improves vigilance and reaction time; effects on memory and executive function are less consistent. Keep your intake similar on test days so it does not masquerade as progress.',
        sources: refs('mclellan2016')
      },
      {
        id: 'reaction-timing',
        kind: 'measurement',
        title: 'Test at a consistent time',
        body: 'Attention performance follows circadian rhythms and chronotype, so a consistent testing window keeps your trend fair.',
        sources: refs('schmidt2007')
      },
      {
        id: 'reaction-inertia',
        kind: 'measurement',
        title: 'Not straight after waking',
        body: 'The validation study of this 3-minute test left out the session right after waking because of sleep inertia; give yourself 30–60 minutes.',
        sources: refs('basnerMolliconeDinges2011')
      }
    ]
  },
  {
    id: 'speed',
    name: 'Processing Speed',
    short: 'Speed',
    subtitle: 'Processing speed',
    about:
      'How fast you carry out simple mental operations — look, compare, decide. Processing speed is the ability most consistently sensitive to sleep, age and health, which is why it is a core area of every major test battery.',
    practice:
      'Scores keep rising with repetition for weeks. Speed training improves trained speed tasks the most.',
    slot: 6,
    sources: refs('jaeger2018', 'lam2022'),
    training: [
      {
        gameId: 'odd-one-out',
        paradigm: 'Speeded visual search',
        why: 'Finding the odd tile against a timer is fast visual comparison — the kind of exercise speed-of-processing training is built from.',
        evidence: 'In a large trial with older adults, speed-of-processing training improved trained speed tasks, with effects still visible years later; this game itself has not been studied.',
        sources: refs('ball2002', 'edwards2017', 'duncanHumphreys1989')
      }
    ],
    improve: [
      {
        id: 'speed-training',
        kind: 'practice',
        title: 'Speed practice improves speed tasks',
        body: 'In the ACTIVE trial, speed-of-processing training produced large gains on trained speed tasks in older adults — the training arm with the most durable effects.',
        sources: refs('ball2002', 'edwards2017')
      },
      {
        id: 'speed-exercise',
        kind: 'habit',
        title: 'Stay physically active',
        body: 'Moderate-to-vigorous physical activity is associated with better processing speed, memory and executive function in randomized trials (moderate evidence).',
        sources: refs('erickson2019')
      },
      {
        id: 'speed-sensitivity',
        kind: 'measurement',
        title: 'A sensitive gauge — compare like with like',
        body: 'Symbol-coding tests are sensitive to changes in brain function from many causes, and short-term sleep loss slows processing speed — read a bad day in context.',
        sources: refs('jaeger2018', 'limDinges2010')
      },
      {
        id: 'speed-practice',
        kind: 'measurement',
        title: 'Practice inflates early scores',
        body: 'Smartphone symbol-coding scores keep improving with repetition for weeks before they level off — your first month is partly learning.',
        sources: refs('pham2021')
      }
    ]
  },
  {
    id: 'flexibility',
    name: 'Flexibility',
    short: 'Flexibility',
    subtitle: 'Rule switching',
    about:
      'Dropping one rule and applying another the moment the situation changes. Set shifting is a core executive function — the one your Attention area does not cover — measured here as correct decisions per second while the rule keeps changing.',
    practice: 'Switching practice improves switching tasks; transfer to other abilities is small.',
    slot: 13,
    sources: refs('novack2024', 'monsell2003'),
    training: [
      {
        gameId: 'stroop-match',
        paradigm: 'Cued task switching',
        why: 'Its higher tiers flip between the ink rule and the word rule, so you must switch rules on cue.',
        evidence: 'Task-switching training improves switching and transfers to similar executive tasks; transfer to other abilities is small.',
        sources: refs('monsell2003', 'karbachKray2009', 'karbachVerhaeghen2014')
      },
      {
        gameId: 'schulte-table',
        paradigm: 'Alternating sequences (Trail Making B-type)',
        why: 'Its extreme tier alternates between two coloured number sequences — the alternation that makes Trail Making Test part B a switching measure.',
        evidence: 'Task-switching training improves switching and transfers to similar executive tasks; transfer to other abilities is small.',
        sources: refs('sanchezCubillo2009', 'lu2022', 'karbachKray2009')
      }
    ],
    improve: [
      {
        id: 'flexibility-training',
        kind: 'practice',
        title: 'Switching practice transfers near',
        body: 'Task-switching training improved switching and transferred to similar untrained executive tasks; a meta-analysis found executive-control training effects concentrated on near transfer.',
        sources: refs('karbachKray2009', 'karbachVerhaeghen2014')
      },
      {
        id: 'flexibility-exercise',
        kind: 'habit',
        title: 'Stay physically active',
        body: 'Moderate-to-vigorous physical activity is associated with better executive function in randomized trials (moderate evidence).',
        sources: refs('erickson2019')
      },
      {
        id: 'flexibility-retest',
        kind: 'measurement',
        title: 'Expect a first-sessions rise',
        body: 'The NIH Toolbox card-sort version of this test showed a retest gain, and retest effects generally plateau by about the third session.',
        sources: refs('weintraub2014', 'scharfen2018')
      }
    ]
  },
  {
    id: 'spatial',
    name: 'Spatial',
    short: 'Spatial',
    subtitle: 'Mental rotation',
    about:
      'Turning an object in your mind to see whether two views show the same shape or its mirror image. Mental rotation is the best-studied spatial ability and one of the most trainable ones.',
    practice:
      'One of the most trainable skills. Gains last and spread to other spatial tasks, and a little to maths.',
    slot: 1,
    sources: refs('shepardMetzler1971', 'ganisKievit2015'),
    training: [
      {
        gameId: 'block-drop',
        paradigm: 'Falling-block (Tetris-type) play',
        why: 'Rotating falling pieces to fit is the kind of game used in spatial-training studies.',
        evidence: 'Tetris-type play improved mental-rotation performance in training studies, and spatial training effects were durable and transferred in a meta-analysis — though one study that controlled speed–accuracy trade-offs found no gain.',
        sources: refs('okagakiFrensch1994', 'terlecki2008', 'uttal2013', 'safaei2022')
      }
    ],
    improve: [
      {
        id: 'spatial-training',
        kind: 'practice',
        title: 'Spatial skill is trainable',
        body: 'A meta-analysis of 217 studies found an average training effect of g = 0.47 that was stable over time and transferred to untrained spatial tasks.',
        sources: refs('uttal2013')
      },
      {
        id: 'spatial-games',
        kind: 'practice',
        title: 'Rotation-heavy games',
        body: 'Spatial experience such as Tetris-type play produced durable and generalized mental-rotation gains in a training study — evidence is mixed once speed–accuracy trade-offs are controlled.',
        sources: refs('terlecki2008', 'okagakiFrensch1994', 'safaei2022')
      }
    ]
  }
];

const BY_ID = new Map(BRAIN_DOMAINS.map((d) => [d.id, d]));

export function getBrainDomain(id: BrainDomainId | string): BrainDomain | undefined {
  return BY_ID.get(id as BrainDomainId);
}

/** the area's colour as a CSS value */
export function domainColor(id: BrainDomainId | string): string {
  return `var(--play-${getBrainDomain(id)?.slot ?? 14})`;
}

/**
 * The verbatim disclaimer (SCIENCE.md §4.2) — first open of Brain Lab and its
 * about page. Validate pins the text.
 */
export const BRAIN_DISCLAIMER =
  'This is a self-tracking tool, not a medical device. It does not diagnose any condition, and its scores are not IQ scores. Scores depend on your device, time of day, sleep and practice. If you are concerned about your memory or thinking in daily life, talk to a health professional.';

/** the line every benchmark page carries (SCIENCE.md §4.2) */
export const IMPLEMENTATION_NOTE =
  'Our implementation of this paradigm — not the original test; scores aren’t interchangeable with published ones.';

/** the footer every training card carries (SCIENCE.md §4.2) */
export const TRAINING_NOTE = 'Improves this game and similar tasks; little evidence of wider effects.';

/** onboarding copy (SCIENCE.md §3.1) */
export const BRAIN_ONBOARDING =
  'Brain Lab measures nine areas with short tests adapted from published research. The scores are for tracking yourself over time. Your first sessions on each test are calibration: you are still learning the test, so scores rise. After that, Brain Lab sets your personal baseline and tells you when a change is bigger than your normal day-to-day ups and downs.';

/**
 * The Stanford Sleepiness Scale, verbatim (Hoddes et al. 1973; SCIENCE.md
 * §2.8). The KSS must NOT ship without written permission from its author —
 * validate fails if it appears.
 */
export const SSS_ITEMS: readonly string[] = [
  'Feeling active and vital; alert; wide awake.',
  'Functioning at a high level, but not at peak; able to concentrate.',
  'Relaxed; awake; not at full alertness; responsive.',
  'A little foggy; not at peak; let down.',
  'Fogginess; beginning to lose interest in remaining awake; slowed down.',
  'Sleepiness; prefer to be lying down; fighting sleep; woozy.',
  'Almost in reverie; sleep onset soon; lost struggle to remain awake.'
];

/** Elo et al. (2003) single-item stress question, verbatim (SCIENCE.md §2.8) */
export const STRESS_ITEM =
  'Stress means a situation in which a person feels tense, restless, nervous or anxious or is unable to sleep at night because his/her mind is troubled all the time. Do you feel this kind of stress these days?';

/** the evidence panel (SCIENCE.md §3.2) — rendered on the Brain Lab about sheet */
export const TRAINING_EVIDENCE: { title: string; body: string; cite: string }[] = [
  { title: 'Practice works, on what you practise', body: 'Practising a task reliably makes you better at that task.', cite: 'Simons 2016; Stanford 2014; Ball 2002' },
  { title: 'Similar tasks improve less', body: 'Gains carry over partly to closely related tasks, and less than to the trained task itself.', cite: 'Melby-Lervåg 2016; Sala 2019; Gathercole 2019' },
  { title: 'No proven IQ boost', body: 'Well-controlled studies find no reliable rise in intelligence or general reasoning from brain training. The n-back effect on fluid intelligence was g = 0.06 against active control groups.', cite: 'Au 2015; Melby-Lervåg 2016; Redick 2013; Owen 2010; Sala & Gobet 2019' },
  { title: 'Little evidence for everyday life', body: 'Gains on brain games have rarely been shown to carry over to daily performance.', cite: 'Simons 2016' },
  { title: 'Dementia', body: 'No brain game has been shown to cure or prevent dementia. One large trial of adults aged 65 and over linked one specific speed-training program to fewer dementia diagnoses 10 years later (hazard ratio 0.71, 95% CI 0.50–0.998); at 20 years the link appeared only in people who had booster sessions. It has not been shown for other games or for younger adults.', cite: 'Stanford 2014; Edwards 2017; Coe 2026' },
  { title: 'Tests track; games train', body: 'A test score that rises after weeks of practice partly reflects learning that test.', cite: 'Scharfen 2018; Pham 2021; Uttal 2013; Goldberg 2015' },
  { title: 'More is not automatically better', body: 'In older adults, home training without supervision showed little effect, and programs used more than three times a week were no more effective than once or twice a week.', cite: 'Lampit 2014' },
  { title: 'Better-evidenced levers', body: 'Physical activity, enough sleep and managing health risks such as blood pressure, hearing and vision have stronger evidence for long-term brain health than any game. Education also raises cognitive ability over years.', cite: 'Erickson 2019; Wild 2018; Livingston 2024; Ritchie 2018' },
  { title: 'Daily state matters', body: 'Your scores move with sleep, stress, time of day and caffeine. That is why Brain Lab asks a few questions first.', cite: 'Lim & Dinges 2010; Schwarz 2025; Sliwinski 2006; McLellan 2016' }
];
