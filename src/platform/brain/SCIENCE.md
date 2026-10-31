# Brain Lab: Science Dossier

`src/platform/brain/SCIENCE.md`. This is the scientific rulebook for the Brain Lab tab: every benchmark, score and claim follows it. Dossier version 1 (protocol v1, scoring v1, reference set v1), dated 2026-10-30.

> It consolidates six domain research reports and one methodology report produced by web research in 2026. Where the reports disagree, Appendix A records how the conflict was resolved and why. Any change to a protocol, formula, reference value or claim MUST update this file in the same commit and bump the matching version (§2.11).

**How to read this file.**
- Requirement words: **MUST / MUST NOT / SHOULD / MAY**.
- Provenance tags on parameters and numbers:
  - **[V]** taken from a primary source the researchers read.
  - **[S]** secondary or abstract-level.
  - **[D]** derived here by arithmetic from published numbers.
  - **[DC]** a design choice that no source specifies. It can be changed, but once shipped it stays constant across sessions.
  - **[U]** unverified.
- Citations are written (FirstAuthor Year). Full entries are in §5.
- All MVP primary metrics are oriented so that **higher is better**.

---

## 0. Ten principles

1. **Benchmarks measure; games train.** A benchmark is a fixed protocol and is never offered as a training game. Claims of progress rest only on benchmarks (Simons 2016).
2. **Faithful to a validated paradigm.** Each benchmark implements a published paradigm, and its spec lists every deviation. Our implementation is not the original instrument, and its scores are not interchangeable with published scores.
3. **Procedural alternate forms.** Every item is generated from a seed stored with the run. There is no fixed item bank to memorise.
4. **Level scores, never difference scores, are the primary metrics.** Interference costs, switch costs, slopes and ratios are diagnostics only (Hedge 2018).
5. **Personal change is the primary signal.** Indices anchored to published population data are graded, approximate orientation (§2.2).
6. **Practice is expected and labelled.** Each test has an unscored run-in, a frozen baseline and a learning-phase band (Bartels 2010; Goldberg 2015).
7. **One day is state; weeks are progress.** A daily score is shown as "today vs your typical range". Reliable-change verdicts use weekly blocks and must persist (§2.6).
8. **One device, one series.** Changing device or input method starts a new baseline segment (Nicosia 2023b; Novack 2024).
9. **Keep the raw data.** Store raw metrics, plus trial data where storage allows, with protocol, scoring and reference versions. Rescore history whenever a version changes.
10. **No IQ, no diagnosis, no brain age** (§4).

---

## 1. Areas

### 1.1 The area set

| id | Area | Construct (what the number means) | Benchmark (suggested name) | Paradigm and key source | ≈ s | Status |
|---|---|---|---|---|---|---|
| `attention` | Attention | Executive attention control: staying on goal despite conflicting information | Arrow Squared | Flanker Squared (Burgoyne 2023), adapted for phones | 135 | MVP |
| `memory` | Memory | Visuospatial working memory: holding a sequence of locations for seconds | Block Span | Adaptive randomised-layout Corsi with mean-span scoring (C-SST; Woods 2016) | 170 | MVP |
| `calculation` | Calculation | Arithmetic fluency | Arithmetic Sprint | Speeded production arithmetic using Math4Speed item rules (Loenneker 2025) in the typed BGU-MF format (Gliksman 2022a,b) | 155 | MVP |
| `analysis` | Analysis | Fluid (inductive) reasoning with novel figural patterns | Matrix Reasoning | Generated 3×3 matrices (Carpenter rules via Matzen 2010), balanced 8-option answer sets (Hu 2021; Pallentin 2023), MaRs-IB timing, 12-item adaptive IRT | 180 (cap 240) | MVP |
| `precision` | Precision | Touch-aiming precision (speed–accuracy efficiency) | Target Ring | ISO 9241-411 multidirectional tapping scored by effective throughput (Soukoreff 2004; MacKenzie 2015) | 105 | MVP |
| `reaction` | Reaction | Alertness and vigilant attention | Alertness Check | 3-minute PVT-B (Basner, Mollicone & Dinges 2011) | 195 | MVP |
| `speed` | Processing Speed | Speed of simple cognitive operations (Gs) | Symbol Coding | Smartphone SDMT with a random key and a motor baseline (van Oirschot 2020; Pham 2021; Woelfle 2021) | 140 | MVP |
| `flexibility` | Flexibility | Set shifting between rules | Shape–Color Switch | MTB Shape-Color Sorting, a DCCS task (Novack 2024) | 105 | MVP |
| `spatial` | Spatial | Mental rotation (Gv) | Mirror Twins | Shepard–Metzler same/mirror judgement on the Ganis & Kievit 2015 angles | 155 | MVP |
| n/a | Mean | Average of the areas that have a literature reference (§2.1) | n/a | n/a | n/a | MVP |
| n/a | Daily state | Covariates: sleep, sleepiness, stress, caffeine, exercise | Check-in | SSS, sleep-diary items, Elo stress item (§2.8) | 20 | MVP, unscored |
| `learning` | Learning | Episodic/associative memory (new learning) | Prices | Item–price associative recognition (ARC/M2C2) | 100 | Phase 2 (§1.14) |
| `verbal` | Verbal | Verbal (grammatical) reasoning | Grammatical Reasoning | Baddeley 1968 three-minute test, localised | 180 | Phase 2 (§1.14) |

**Why these three additions.**
- **Processing Speed.** It has the best-validated self-administered phone test. It is the ability most consistently sensitive to age, disease and sleep loss, and it is a core subdomain in both the NIH Toolbox and DSM-5 (Jaeger 2018; Lam 2022; Weintraub 2014; Sachdev 2014).
- **Flexibility.** Executive function was the subdomain the experts endorsed most strongly when the NIH Toolbox was designed. The owner's Attention area covers inhibition but not shifting, and a validated phone protocol exists (Weintraub 2014; Novack 2024).
- **Spatial.** It is a distinct CHC broad ability. Its paradigm is the best-replicated chronometric one, and an open norm set exists at exactly our angles (Ganis & Kievit 2015; Uttal 2013).

**Scope notes to show in the app.**
- Memory here means working memory, not everyday episodic memory; that is the phase-2 Learning area.
- Reaction means alertness, not a trainable reflex skill.
- Precision means touch aiming, not general dexterity. Touch tapping correlates only r ≈ .3–.4 with pegboard tests (McGuckian 2024).
- Analysis is matrix reasoning. It is the closest relative of what IQ tests sample, but it is not an IQ score (Chierchia 2019).

### 1.2 Candidate areas that were deferred, and why

| Candidate | Decision | Reason |
|---|---|---|
| Learning (episodic/associative) | **Phase 2, first to add** (spec in §1.14) | It is clinically central: DSM-5 learning and memory, and binding deficits are an early preclinical Alzheimer's marker (as cited by Kim 2025). It is also distinct from span: Corsi span vs supraspan learning r = .47 (Facchin 2024). It is deferred because the only phone-validated paradigm is weak per session (single-session ICC .26 in older adults; Thompson 2022) and has no norms for under-60s. Ten two-choice trials risk a ceiling. The ARC/M2C2 exposure and lure parameters are unverified, so our protocol would be mostly design choices. It also needs a bank of at least 200 icons, and its training literature was not verified. |
| Verbal (verbal reasoning) | **Phase 2** (spec in §1.14) | Grammatical reasoning is language-light, can be localised, and marks the verbal component in Hampshire 2012. But its reliability evidence is old and small: r ≈ .80 with N = 18; .66 for a simplified form; a 1973 re-evaluation found it less valid and less reliable than expected. Practice effects are unquantified. It is insensitive to sleep loss (reasoning g = −0.125, n.s.; Lim & Dinges 2010). It is language-bound. |
| Vocabulary size (yes/no, LexTALE type) | Deferred | It measures knowledge of one language; given in English it is an L2 proficiency test (Lemhöfer 2012). It is a slow trait, gaining about 1 lemma every 2 days (Brysbaert 2016). It needs a licensed lemma list and a pseudoword generator for each language. |
| Verbal fluency (typed) | Deferred | Norms are spoken and examiner-scored (Tombaugh 1999). Typed phone fluency is unvalidated (Lescht 2022 is a small lab study). It needs a lexicon and equated letter sets for each language. |
| Word-list learning (RAVLT type) | Deferred | Language-bound, needs typing or speech recognition, and has few alternate forms [U]. |
| Social cognition | Deferred | Needs licensed, validated face stimuli; of low value for a healthy adult. |
| Auditory processing (Ga) | Deferred | Needs calibrated audio. |
| Planning (Tower of London) | Deferred | Not reviewed. `tower-of-hanoi` serves as a training shortcut. |
| Visual WM capacity (change detection, K) | Phase 3, as a weekly ~10-min deep test | Reaching α ≈ .8 takes about 150 trials (~10 min). A 3-minute version projects to α ≈ .6 [D] (Xu 2018). |
| ANT network scores | Phase 3, as an occasional deep dive | Takes 20–30 minutes, and the alerting and orienting scores are unreliable (MacLeod 2010). |
| Lexical decision, semantic categorisation | Deferred | They repeat processing speed in a language-bound format (Yap 2012). |
| Perceptual or timing precision, pursuit tracking | Not reviewed | n/a |

### 1.3 Coverage against the frameworks

- **CHC**: Gf → Analysis; Gwm → Memory; Gs → Processing Speed; Gt → Reaction; Gq → Calculation; Gv → Spatial; Gp/Gps → Precision. Gl, Gc, Gr, Grw and Ga are deferred (Schneider & McGrew 2018, via secondary sources; CHC Wikipedia).
- **DSM-5**:
  - Complex attention → Attention, Reaction, Processing Speed.
  - Executive function → Flexibility, plus inhibition in Attention and working memory in Memory.
  - Perceptual-motor → Spatial, Precision.
  - Learning and memory, and language → phase 2.
  - Social cognition → deferred.
  - (Sachdev 2014.)
- **NIH Toolbox**: attention, executive function, working memory and processing speed are covered. Episodic memory and language are phase 2 (Weintraub 2013, 2014).

### 1.4 Conventions shared by every benchmark

- **C1. Session shell.** The first-ever run starts with instructions and an animated demo, then that test's first-run practice. Every run then follows the same order:
  - the per-session practice or warm-up the spec lists (unscored; corrective feedback allowed)
  - a countdown, where the spec has one
  - the scored block, with fixed parameters
  - a results card with the same layout every time. Expecting feedback changes speed, so its form must not vary (Thompson 2024).
- **C2. Timing.**
  - Apply each stimulus change with `opacity` (or another compositor-only property) inside a `requestAnimationFrame` callback, and record onset as that callback's timestamp argument.
  - Read responses on `pointerdown`, timestamped with `event.timeStamp`. It runs on the same monotonic clock as `performance.now()`; verify this on an iPhone.
  - Never time stimuli with CSS animations or transitions. With rAF plus opacity, iOS browsers hit the intended frame on 100% of trials; CSS-animation methods managed 17.6–23.7% overall (Pronk 2020).
  - No MVP stimulus is shorter than 100 ms.
  - At session start, measure the frame interval (median of at least 60 rAF deltas) and store it.
  - Set `touch-action: none` on response surfaces, and disable double-tap zoom, text selection and callouts.
- **C3. Motion and feedback integrity.**
  - Decorative motion MUST NOT delay a stimulus becoming fully visible, delay when input is accepted, move or resize a response target, or cover a stimulus.
  - During scored blocks, correctness feedback appears only where the paradigm prescribes it:
    - Attention: on every trial.
    - Precision: hit or miss.
    - Reaction: the RT display, plus FS and OVERRUN.
  - Every other scored block shows only a neutral acknowledgement that a button was pressed.
  - Sounds and haptics are as specified and identical in every session.
  - The results screen after a block may be as rich as desired.
- **C4. Fixed protocol.** No difficulty tiers, assists, hints or skips. The only adaptive elements are Memory's staircase and Analysis's IRT item selection.
- **C5. Interruptions.**
  - **Class A** (fixed-time blocks: Attention, Calculation, Processing Speed, Flexibility, Reaction): if the page is hidden or loses focus for more than 1 s, or the orientation changes, the session is **invalid**. Offer an immediate restart.
  - **Class B** (trial-based: Memory, Analysis, Spatial, Precision): void the trial or sequence in progress and replace it, within each test's limits. Beyond those limits, the session is invalid.
- **C6. One score per area per day.** The day's score comes from the first valid run. If the first run is invalid, one more attempt may produce the score. Any later run that day is stored as practice and never scored. Run-in sessions are exempt and may be done back to back on day 1.
- **C7. Standardisation prompts.**
  - Same device and posture, as the spec defines.
  - Portrait orientation and Do Not Disturb.
  - Sound on wherever the protocol uses sound.
  - A similar time of day, within ±1 h (Schmidt 2007).
  - Reaction should not be taken within 30–60 minutes of waking; Basner, Mollicone & Dinges 2011 excluded the wake-time bout because of sleep inertia.
- **C8. Seeds.** All generation comes from the run's seed, which is stored, so validation can replay any run.
- **C9. Theme.** Reaction's stimulus panel keeps fixed colours in every theme. Other benchmarks may follow the theme. The theme is logged with each session.
- **C10. Device and input.** Store a device fingerprint (§2.11). A change starts a new segment (§2.3).
- **C11. Validity semantics.** Invalid sessions are kept and shown with their reason, and are excluded from every level, baseline, σ_w, verdict, the Mean and all insights. Flags annotate a session without excluding it, unless the rule says otherwise.
- **C12. Order.** On days with several benchmarks, use one canonical order [DC]: check-in → Reaction → Processing Speed → Attention → Flexibility → Memory → Calculation → Spatial → Precision → Analysis.

---

### 1.5 Attention: Flanker Squared, adapted for phones

**Construct.** Executive attention control means keeping goal-relevant processing active and resolving conflict from irrelevant information (interference control). In the Engle-lab account it is the active ingredient linking working-memory capacity and fluid intelligence (Draheim 2021; Burgoyne 2023). It declines across adulthood: NIH Toolbox Flanker correlates r = −.54 with age (Zelazo 2014). It also suffers under sleep loss: complex-attention accuracy g = −0.479 (Lim & Dinges 2010). Sustained attention is measured separately by Reaction.

**Why this benchmark.**
- **It avoids the reliability paradox.** It produces one throughput score (correct minus incorrect) instead of an RT difference. The classic flanker RT cost had ICC .40/.57 even with 720 trials (Hedge 2018).
- **It has the best reliability per minute.**
  - Flanker Squared: split-half .94–.97; test–retest r = .74 over about 32 days (Burgoyne 2023).
  - MTB Arrow Matching: ICC .69 (Novack 2024).
  - NIH Toolbox Flanker: ICC .83, but only in a sample aged 20–85, and its 500 ms RT floor puts fast adults at the ceiling (Zelazo 2014).
- **Practice effects are negligible** (d = −0.07).
- **It is short.** 30 s of practice plus a 90 s test, drawn from 16 procedural configurations, with no copyrighted items.
- **Construct validity is strong.** It loads .70 on a common factor that correlates .81 with established attention-control measures, and the Squared tasks explained 75% of latent multitasking variance (Burgoyne 2023).
- **Rejected alternatives:**
  - ANT: 288 trials and 20–30 minutes; its alerting and orienting scores are unreliable (MacLeod 2010).
  - Stroop: depends on colour vision and language; `stroop-match` already serves as training.
  - Go/No-Go and SART: take at least 4 minutes, and short versions are unvalidated.
  - Visual search: scored with slope differences, and highly trainable.
  - Cancellation and MOT: psychometrics unverified.
  - Antisaccade, SACT and FlankerDL: 8–18 minutes each.
- **Caveats to show the user:** it was validated on desktop computers with a mouse, in adults aged 18–35; repetition beyond 3 sessions is untested; the reference index is provisional.

**Protocol.**

| Parameter | Value |
|---|---|
| Rule | Tap the option whose **centre** arrow points the same way as the target's **outer** arrows. Ignore the target's centre arrow and the options' outer arrows [V] |
| Items | Rows of 5 arrows, drawn as SVG chevrons [DC] |
| Per-trial draws | d (direction of the target's flankers) ∈ {left, right}, p = .5. Trial type ∈ {FC, FI, TC-OI, TI-OC}, p = .25 each [V]. Correct side ∈ {left, right}, p = .5, with at most 3 same-side answers in a row [DC] |
| Target | Congruent: all 5 arrows point d. Incongruent: the outer 4 point d and the centre points the other way [V] |
| Options | Congruent pair: one all-left row and one all-right row; the correct one points d. Incongruent pair: the correct option has its centre pointing d and its outer arrows the other way; the lure has its centre pointing away from d and its outer arrows pointing d [V] |
| Trial types | FC: congruent target, congruent options. FI: incongruent target, incongruent options. TC-OI: congruent target, incongruent options. TI-OC: incongruent target, congruent options [V] |
| Layout | Header shows time remaining (centre) and the running score (right) [V]. Target row centred at about 35% of screen height; each arrow about 9% of screen width with about 1.5% gaps. Two option buttons side by side in the bottom tools card, each about 44% wide and at least 120 pt tall, arrows about 6% of width, with a clear gap between them [DC] |
| Feedback | On every trial: tick plus soft chime, or cross plus buzzer [V], for about 250 ms [DC], shown beside the score so it never covers the next item [DC]. The next item appears on the next frame. There is no response deadline; the test is self-paced [V] |
| Flow | First run: an instruction screen with a worked, fully incongruent example explaining why each option is right or wrong [V]. Every run: 30 s of practice with feedback and a running score, unscored [V; repeating it every session as a warm-up is DC] → 3 s countdown [V] → 90.0 s test [V] → results |
| Adaptive rule | None |
| Stop rule | Hard stop at 90.0 s. Later touches are ignored, and the item on screen at time-out is not scored [DC] |
| Exclusions and validity | Net score ≤ 0 → invalid [V]. Responses under 200 ms are flagged as probable mis-taps [V: the FlankerDL cut-off]. More than 10% of responses under 200 ms → invalid [DC]. Interruption class A |
| Posture | Portrait, two thumbs, sound on [DC] |
| Log per trial | Type, d, correct side, chosen side, RT, correctness |
| Duration | About 135 s (about 10 s intro, 30 s practice, 3 s countdown, 90 s test) |

**Metrics.**
- Primary: **net = correct − incorrect** within 90 s [V]. Chance is about 0.
- Secondary: accuracy, throughput (correct responses per second), median correct RT.
- Exploratory only, never tracked: accuracy and RT by trial type, and conflict cost = accuracy(FC) − accuracy(FI).

**Index (grade C).**
- z = (net − 40.43) / 14.17; Index = clamp(round(50 + 10z), 0, 100).
- The anchor is Burgoyne 2023 Study 2, first in-lab administration (N = 290, ages 18–35, desktop computer and mouse).
- Context: an unsupervised online sample scored M = 27.38 (SD 13.96, N = 297), and the same lab participants tested at home scored M = 31.83 (SD 15.80, n = 63). A home score near 30 (index ≈ 43) is therefore ordinary.
- Two thumbs on a touchscreen versus a mouse may shift scores in either direction; the size is unknown.
- **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- Split-half .94 in Study 1 and .97/.96/.94 across the Study 2 administrations. Retest r = .74 over about 32 days in the lab, and .46 for lab vs home about 65 days later (Burgoyne 2023).
- SEM_ref = 14.17 × √(1 − .74) ≈ 7.2 net points [D].
- MDC95 is about 20 points for one session vs one session, and about 9 points for a 5-session mean vs another 5-session mean [D].
- Within-session SEM is about 2.8 points [D].

**Practice and run-in.** d = −0.07 from administration 1 to 2 (n.s.). d = −0.35 from 2 to 3, confounded with the move from lab to home (Burgoyne 2023). **Run-in R = 2.** Not practice-prone.

**Device.** About 60 ms of touch latency on roughly 2.4 s per trial is a 2–3% effect [D], constant within one device. Operating system shifted MTB flanker scores (iOS higher, β = .23; Novack 2024), so keep one device per series.

**Training.**
- Future games:
  - Stroop Squared and Simon Squared, in the same 90 s format (Burgoyne 2023).
  - An adaptive-deadline flanker, for training only; it correlated near zero with abilities in Burgoyne 2023.
  - Go/No-Go with 25% no-go trials, 1,250 ms stimuli and a 750 ms ISI (Hedge 2018), plus a SART-style digit stream (Robertson 1997).
  - Feature vs conjunction visual search (Treisman 1980).
  - A cancellation sprint that tracks omissions by left and right half.
  - Multiple Object Tracking with a speed staircase (Pylyshyn 1988).
  - SACT and antisaccade brief-exposure tasks (Draheim 2021).
  - An occasional ANT deep dive (Fan 2002).
- Shortcut cards:
  - `stroop-match`: Stroop interference.
  - `schulte-table`: visual scanning.
  - `odd-one-out`: pop-out search.
  - `moving-cups`: tracking a single object.
  - `count-compare`: brief-exposure attention.

---

### 1.6 Memory: adaptive spatial span (C-SST)

**Construct.** Visuospatial short-term/working memory: keeping a sequence of locations active for a few seconds and reproducing it in order (Corsi forward span). Brief phone working-memory tasks load on the same factor as lab complex-span tasks (Sliwinski 2018). Span declines by about 0.022 items per year of age (Woods 2016).

**Why this benchmark.**
- **Reliability.** Adaptive mean span (MnS) reached ICC .84 with only 14 trials, against .68 for classic maximum span (Woods 2016). A 30-trial tap Corsi gave r = .71 at 24 hours (Meyerhoff 2021).
- **Practice.** There was no significant practice effect across 3 weekly sessions when the layout and path were re-randomised on every trial (Woods 2016).
- **Device independence.** The test is language-free and unspeeded, so touch latency does not bias MnS. Touch and physical Corsi give equivalent scores (no version effect, F = 0.03; Siddi 2020; Brunetti 2014).
- **Range and norms.** The adaptive staircase avoids ceilings and floors. Norms with an age regression exist on the same metric (Woods 2016).
- **Rejected alternatives:**
  - Change detection: needs about 150 trials (~10 min) for α ≈ .8, and a 3-minute version projects to α ≈ .6 [D]; it also shows early practice gains (Xu 2018; Dai 2019).
  - Grid/dot memory: single-session ICC .39 (Sliwinski 2018).
  - N-back: shares only 2–5% of its variance with operation span (Kane 2007), and the phone version loads on speed (Sliwinski 2018).
  - Complex span: far longer than 3 minutes and confounded with arithmetic (Unsworth 2005).
  - Digit span: auditory norms and practice gains of 0.3–0.45 digits (Woods 2011).
  - Colour–shape binding: single-session ICC .34 (Thompson 2022).
- **Caveat.** `simon` and `number-trail` share this test's structure. Training on them raises this score partly through task skill: paradigm-matched transfer d = 1.05 vs 0.14 for unmatched tasks (Gathercole 2019).

**Protocol.**

| Parameter | Value |
|---|---|
| Arena | Centred square, side S = min(viewport width − 32 px, 0.6 × viewport height, 420 px). Nothing else moves during presentation [DC] |
| Blocks | 10 identical rounded squares [V: the C-SST uses 10]. Side b = max(44 px, round(0.13 S)) [DC] |
| Placement | A new random layout on every trial [V]. Rejection sampling: centre-to-centre distance ≥ 1.5b, distance from the edge ≥ 0.5b + 4 px, up to 500 attempts; otherwise fall back to a jittered 4×4 lattice using 10 random cells [DC] |
| Highlight | A luminance change (accent fill on neutral blocks), paint-only. Safe for colour-vision deficiency [DC] |
| Sequence | L distinct blocks in random order [V]. Log the path length and number of self-crossings, because span depends on path configuration (Facchin 2024). Do not filter paths in the MVP [DC] |
| Timeline | Layout shown static for 1,000 ms → L highlights, each 500 ms on and 500 ms off (1,000 ms onset to onset, the eCorsi timing of Brunetti 2014; the C-SST uses about 977 ms per item) → 500 ms after the last highlight turns off, the recall cue: short tone, light haptic where available, and the label "Your turn" [DC]. If any on-period deviates by more than 50 ms, void the trial and replace it with an uncounted trial of the same length [DC] |
| Response | A tap registers on pointerup inside the block plus 6 px of padding. Each tap gives a 150 ms highlight and a soft click. Taps during presentation are ignored, with a subtle "wait" hint. The trial ends 300 ms after the L-th tap. A "Don't remember" button ends the trial as incorrect. 15 s of inactivity (from the cue or the last tap) counts as incorrect. No undo [DC] |
| Feedback | None on scored trials [V] |
| Scoring rule | A trial is correct only if all L taps match the sequence in exact order [V] |
| Staircase | Start at L = 3. +1 after every correct trial. −1 after two consecutive incorrect trials; the miss counter resets after any correct trial and after each step down. Bounds 2–10 [V; bounds DC] |
| Trials and stop rule | 14 scored trials, no early stop [V] |
| Practice | First run: a tutorial and 4 practice trials on a 6-block display starting at L = 2, with feedback [V]. Runs 2–3: 2 practice trials (L = 2, then 3) with feedback. Later runs: 1 unscored warm-up at L = 3 [DC: shortened from the C-SST to stay near 3 minutes] |
| Interruptions (class B) | Pause. On return, show 3-2-1 and run a fresh trial at the same length. Invalid if there are more than 2 interruptions, more than 60 s paused in total, 3 or more timeouts, or 3 or more voided timing trials [DC] |
| Log | MnS, maximum correct length, number correct, length/correctness/path metrics per trial, time of each tap and first-tap latency, viewport |
| Duration | About 150–180 s |

**Metrics.**
- **MnS = (L_start − 0.5) + Σ p(L) over L = L_start…10**, where p(L) = correct ÷ presented at length L.
  - Lengths never reached contribute 0.
  - Dips below L_start are not added, because the 2.5 term already assumes full credit for them.
  - Worked example (Woods 2011): 2.5 + (1 + 1 + 1 + 1 + 0.25 + 0.33 + 0) = 7.08.
- MnS is roughly the sequence length recalled correctly half the time.
- Secondary: maximum correct length; mean tap response time (device-dependent, never part of the index).

**Index (grade C).**
- μ_age = 6.156 − 0.022 × age [D]. This is Woods 2016's regression MnS = 5.68 − 0.022·age + 0.093·ComputerUse, with ComputerUse fixed at its normative mean of 5.12.
- σ = 1.01, the normative SD. If no age is given, μ = 5.27 (the normative mean; mean age 41.1).
- z = (MnS − μ)/1.01; Index = clamp(round(50 + 10z), 0, 100).
- Index 50 corresponds to an MnS of 5.61 at age 25, 5.50 at 30, 5.28 at 40, 5.06 at 50 and 4.84 at 60 [D].
- Check: Woods's young retest sample (age 26.3) averaged 5.95, which maps to index ≈ 54 [D].
- The norms come from desktop computers with a mouse. Touch Corsi is score-equivalent, but no touchscreen C-SST norms exist. **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- ICC .84 for MnS and .94 for log tap time, over 3 weekly sessions with N = 49 (Woods 2016).
- SEM_ref = 1.01 × √.16 ≈ 0.40 items. MDC95 for one session vs one session ≈ 1.1 items [D].
- These figures are optimistic: lab ICCs leave out the day-to-day state variation present in home testing (Sliwinski 2018).

**Practice and run-in.**
- +2.4% over 3 weekly sessions, n.s. (Woods 2016). In a tap Corsi, span went from 4.59 to 4.78 items between day 1 and day 2 (Meyerhoff 2021). Months of daily use are untested.
- **R = 2.** Not practice-prone, but annotate gains when the user has recently trained `simon` or `number-trail` (§2.6).

**Training.**
- Future games:
  - A change-detection capacity game reporting Cowan's K, also usable as a weekly deep test (Luck 1997; Xu 2018).
  - Colour–shape binding with a palette safe for colour-vision deficiency (Kim 2025).
  - Grid memory with interference (Sliwinski 2018).
  - A backward Corsi series.
  - Complex-span games (Unsworth 2005).
  - Adaptive n-back with lures, for training only (Kane 2007).
  - Adaptive visual digit span (Woods 2011).
- Shortcut cards:
  - `simon`: serial recall of spatial and colour sequences.
  - `number-trail`: remember where the numbers were, then tap them in order.
  - `pattern-recall`: recall of a whole matrix pattern at once.
  - `backwards-span`: forward and backward span.
  - `n-back` and `dual-n-back`: updating; the most-studied working-memory training paradigm (Au 2015; Soveri 2017).
  - `memory-match`: object–location matching (no validation found).

---

### 1.7 Calculation: arithmetic fluency sprint

**Construct.** Arithmetic fluency is the speed and accuracy of whole-number mental arithmetic. That covers fact retrieval for × and ÷, and short carry or borrow procedures for + and −. It spans CHC quantitative knowledge (Gq) and the number-facility narrow ability within Gs (secondary sources). It is a learned skill that also draws on processing speed and working memory. No source validates it as a stand-alone brain-health marker in healthy adults, so the app should call it "calculation fluency" and attribute gains to skill first.

**Why this benchmark.**
- **Shared format.** Every validated fluency test uses the same core: produce as many correct answers as possible in a fixed time.
- **Evidence.** The strongest adult evidence is Math4Speed (N = 1,165 across six countries; retest ρ .65–.89; CC-BY licence; Loenneker 2025) and BGU-MF (computerised, typed answers, random draws; Gliksman 2022a,b).
- **Unlimited forms.** M4S item classes are explicit rules matched for difficulty, so items are regenerated each session and there is no list to memorise.
- **Coverage.** Using all four operations covers the additive/procedural and multiplicative/retrieval clusters, and complex items avoid adult ceilings.
- **Device tolerance.** Correct per minute combines speed and accuracy. Touch latency of about 58–70 ms per tap costs under 2% of a roughly 6 s item [D].
- **Rejected alternatives:**
  - ANS dot comparison: measures number sense, correlates only r ≈ .20 with maths (Chen & Li 2014), and needs at least 200 trials (Halberda 2012; Inglis 2014).
  - PASAT: aversive and prone to practice effects (Tombaugh 2006).
  - Serial 7s: a fixed sequence that gets memorised.
  - WJ Math Fluency, French Kit and TTR: fixed forms that are copyrighted or un-normed; TTR also has an adult ceiling.
- **Caveat.** The 2-minute mixed-order format is a principled derivative, not a published normed instrument.

**Protocol.**

| Parameter | Value |
|---|---|
| Format | 120 s of speeded production. One problem at a time in horizontal format ("38 + 47 ="), typed on an on-screen keypad and submitted with ✓ [V format; duration and mix DC] |
| Layout | Portrait, 320–430 px wide, no scrolling. A 4 px countdown bar at the top. No running score and no correctness shown. Problem in tabular numerals at about 48 px; answer field below (up to 3 digits, with a caret). Bottom tools card with a phone keypad laid out 1-2-3 / 4-5-6 / 7-8-9 / ⌫-0-✓, equal-width keys at least 56 px tall, ✓ styled as primary. Keys register on pointerdown. On desktop, digits, Backspace and Enter also work [DC] |
| Flow | Intro of about 10 s: "Solve as many as you can in 2 minutes. Be accurate and quick. Answer every problem, mentally, no paper." → practice: 4 untimed items, one per operation (simple class), with feedback and the correct answer shown after an error; a missed item is repeated once → 3-2-1 → 120.0 s block → results [DC] |
| ADD simple | a, b ∈ [12, 75]; units digits 1–9; a ≠ b; units(a) + units(b) ≤ 9; a + b ≤ 99 [V: M4S rules] |
| ADD complex | Same ranges, units sum ≥ 10 (a carry), a + b ≤ 99 |
| SUB simple | m ∈ [23, 98]; s ∈ [12, m − 10]; units digits 1–9; units(s) < units(m) |
| SUB complex | Same, but units(s) > units(m) (a borrow). The answer is ≥ 10 in both classes |
| MUL simple | a, b ∈ [2, 9], a ≠ b: 28 unordered pairs, 14 with a product ≤ 25 and 14 above. Random operand order |
| MUL complex | a ∈ [3, 9] × b ∈ [12, 19], random order. M4S uses 2–9; ×2 is dropped as trivial doubling [DC] |
| DIV simple | (a·b) ÷ a, with a, b ∈ [2, 9], a ≠ b |
| DIV complex | (a·b) ÷ a, with a ∈ [3, 9], b ∈ [12, 19] (e.g. 102 ÷ 6) |
| Problem size | Within each class, alternate draws below and above the class's median answer. Never repeat an identical problem within a session [DC] |
| Sequence | Cycles of 8 items: four operation runs of 2 items (one simple, one complex, in random order). Runs are in random order within the cycle, and a cycle's first run may not repeat the previous cycle's last operation. Pre-generate 120 items [DC] |
| Timed block | No correctness feedback, only a neutral key animation. The next problem appears on the next frame after ✓. ⌫ edits. An empty ✓ is ignored. No skip |
| Adaptive rule | None. A fixed item distribution is what makes sessions comparable |
| Stop rule | Input locks at 120.0 s. The item on screen at time-out is discarded and not counted as an error |
| Validity | Interruption class A. Fewer than 8 submissions → invalid. Accuracy below 85% → invalid ("rushed") [DC]. Submissions less than 400 ms after onset are flagged and dropped from RT statistics |
| Log per item | Class, operands, typed answer, correctness, first-digit latency, submit RT, number of edits |
| Duration | About 155 s |

**Metrics.**
- C = correct submissions, N = all submissions, accuracy = C/N.
- **Primary: CPM = C / 2.0** (correct per minute).
- Per-operation rate = correct items for that operation ÷ the sum of its submit RTs, in minutes.
- RT diagnostics are pooled over the last 7 valid sessions, because each class gets only about 2–3 items per session: median correct submit RT per operation and complexity, and median first-digit latency.
- Carry/borrow costs are diagnostics only.
- Do not replace CPM with RCS, IES or LISAS composites; they are skewed and sensitive to speed–accuracy trade-offs (Vandierendonck 2017; Liesefeld 2019).

**Index (grade C).**
- z = (CPM − 10.1)/4.0; Index = clamp(round(50 + 10z), 0, 100). For example: 6.1 CPM → 40; 10.1 → 50; 14.1 → 60; 18.1 → 70 [D].
- The anchor is the Math4Speed sample excluding Greece (n = 1,063): 81.04 ± 31.70 correct per 8 minutes, which is 10.1 ± 4.0 per minute averaged over operations [D, from Loenneker 2025].
- Caveats: median age 20 and 77% university students; the distribution is right-skewed (skew 0.82); the original is handwritten in single-operation blocks, so keypad entry in mixed order is expected to score lower by an unknown amount.
- Recalibrate against the M4S percentile tables on OSF when possible. **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- M4S retest ρ after 1–9 days (n = 58): total .81, addition .89, subtraction .79, multiplication .68, division .80. After 6 months (n = 41): total .78 (Loenneker 2025).
- SEM_ref ≈ 4.0 × √(1 − .81) ≈ 1.7 CPM. MDC95 ≈ 4.8 CPM for one session vs one session, and ≈ 2.4 CPM between 4-session means [D].

**Practice and run-in.**
- M4S retest gains appear only in a supplement that was not retrieved. BGU-MF showed no change in children after a week.
- Practice transfers to identical problems, including flipped operand order (7×8 → 8×7), and little beyond (Rickard 1994). Adults of all ages keep building retrieval speed (Zamarian 2018).
- **R = 3.** Practice-prone (§2.7).

**Training.**
- Future games:
  - A fact-fluency drill over the BGU-MF item space, with spaced retrieval, a per-fact mastery map and corrective modelling after errors. Drill plus modelling had the largest effects in Codding 2011.
  - Carry/borrow sprints and chains of 1-digit × teen problems.
  - A true/false verification sprint.
  - Randomised serial subtraction, for training only.
  - ANS dot comparison, presented honestly as only weakly related to arithmetic (Halberda 2012).
  - Number-line estimation (not reviewed).
- Shortcut cards:
  - `math-sprint`: speeded arithmetic, the closest near-transfer drill.
  - `make-24` and `target-number`: flexible multi-step calculation.
  - `mathdoku` and `kakuro`: arithmetic under logical constraints (modest arithmetic load).
- An addition-only variant, if one is ever offered, is a separate series with its own baseline, never an automatic switch (Appendix A19).

---

### 1.8 Analysis: generated matrix reasoning

**Construct.** Fluid reasoning (Gf) is solving novel problems by inferring the relations that govern a figural pattern and applying them, without relying on prior knowledge. Matrices are the canonical language-free marker of it. Difficulty rises steeply with the number of relations held at once: accuracy in the Sandia norming data was 86.7% with one relation, 74.5% with two, 54.8% with three and 37.9% for logic problems [D from Matzen 2010 data]. A matrix score is not an IQ (Chierchia 2019).

**Why this benchmark.**
- **Generation and copyright.** Matrices have the deepest validation history, and their rules are explicit: Carpenter's five rule types (Carpenter 1990, via Yang & Kunda 2023). Items can therefore be generated without limit, with no fixed items and no copyrighted content. Raven's matrices are copyrighted, and about 50% of Raven APM items can be solved from the answer options alone (reported in Pallentin 2023).
- **Reliability.**
  - MaRs-IB 12-item forms: IRT reliability .705–.709 in a mean of 174 s; retest r = .71 over about 35 days (Chierchia 2019; Zorowitz 2024).
  - HeiQ: retest .88 over 87 days, with a longer test (Pallentin 2023).
- **Difficulty anchors.** The Sandia norming data give anchors by number of relations, direction and problem type (Matzen 2010).
- **Distractor design.** Published research gives a recipe that defeats elimination and option-counting strategies (Zhang 2019; Hu 2021; Pallentin 2023; Arendasy 2013; Becker 2016).
- **A stable scale.** Fixed item parameters from a rule-based difficulty model keep the ability scale constant across months (in the spirit of Embretson 1998).
- **Rejected alternatives:**
  - Raven SPM/APM: copyrighted and memorisable.
  - ICAR matrices: the academic-use licence forbids public sharing, and the scale has only 11 items with α .68 (ICAR licence; Condon 2014).
  - The MaRs-IB bank as published: finite items, 4 options and colour-coded items.
  - A construction format: slower, better suited to training (Becker 2016).
  - Number series: `sequence-cracker` already covers this as training.

**Protocol.**

| Parameter | Value |
|---|---|
| Layout | Portrait. A 3×3 matrix at the top with square cells, total width min(viewport − 32 px, 360 px), 6 px gaps. The missing cell (row 3, column 3) has a dashed outline and "?". Below it, a 2×4 answer grid (Sandia layout [V]) with tiles of at least 72 px and 8 px gaps. Tap to select, then tap again or press Confirm to commit [DC]; RT is recorded at commit. 12 progress pips. A 5 s countdown ring appears only after 25 s [V: MaRs-IB] |
| Attributes [DC] | Shape: triangle, square, pentagon, hexagon, circle (ordered by number of sides). Size: 5 levels from 40% to 100% of the cell's inner box in 15% steps. Shade: 5 luminance levels (outline only, 25%, 50%, 75%, 100% ink) taken from theme ink, never hue, because of MaRs-IB's colour-vision caveat. Orientation: 8 steps of 45°, with an asymmetric marker dot. Number: 1–4 copies in fixed layouts. Position: one object in a 3×3 sub-grid of the cell. Logic layer: up to 6 line strokes per cell |
| Rules | Constant in a row; constant in a column; pairwise progression v[r][c] = s_r + k·c with k = ±1 (±2 at high levels); distribution of three values (a Latin square); diagonal repetition v = vals[(c − r) mod 3] or vals[(r + c) mod 3]; outward progression v = s + k·max(r, c) [our reading of Sandia; U]; figure addition col3 = col1 ∪ col2; figure subtraction col3 = col1 ∖ col2; XOR col3 = col1 Δ col2; AND col3 = col1 ∩ col2 [V]. Attributes not governed by a rule stay constant across the matrix [DC] |
| Difficulty classes (3PL, a = 1, c = 1/8; b = −logit((p − c)/(1 − c)) from Sandia accuracy p) [D] | D1 one row or column relation, b = −2.6 · D2 one diagonal relation or one progression, −1.9 · D3 two relations including a diagonal, −1.2 · D4 three relations including a diagonal, −0.65 · D5 one outward relation, −0.4 · D6 two relations including outward, −0.1 · D7 three relations including outward, or figure addition/subtraction, +0.4 · D8 XOR or AND, +1.1 · D9 a logic layer plus one transformation on a second attribute, +1.9 (extrapolated, provisional) |
| Answer set | 8 options = all 2³ correct/incorrect combinations over 3 probe attributes. Rule-governed attributes are used first, topped up with constant ones. A wrong value for a rule attribute is a typical misapplication: repeating the adjacent cell, stepping the wrong way, taking another row's value, or applying a different logic operator. A wrong value for a constant attribute is the adjacent level. Every value appears in exactly 4 options and every pair of values in exactly 2 [V: I-RAVEN; HeiQ]. The correct slot is uniformly random. Stroke counts are balanced on logic items |
| Flow | First run: an illustrated tutorial of the five rule families with one worked example each, then practice with feedback until 3 items are correct [V: MaRs-IB criterion]. Teaching the rules up front limits later gains from rule discovery (Schneider 2020). Every run: 1 unscored warm-up (D2), then 12 scored items. Each trial: 500 ms blank [V] → matrix and options appear together → 30 s response window [V]; a timeout counts as incorrect. No feedback; an optional review screen follows the block [DC] |
| Adaptive rule | Start θ0 = median θ of the last 5 valid sessions − 0.5; the first-ever session starts at −0.5 [DC]. Update the EAP estimate after each response. The next item comes from the class whose b is closest to θ̂ − 0.2, because 3PL information peaks at b + ln[(1 + √(1 + 8c))/2]/a ≈ b + 0.19 [D]. The same rule combination never appears twice in a row |
| Stop rule | 12 scored items, or a 240 s session cap (the current item finishes). The session is scored if at least 9 items are valid; otherwise it is invalid [DC] |
| Exclusions | A response under 1,500 ms is a rapid guess and is excluded from θ. 3 or more rapid guesses → invalid ("careless") [DC]. Interruption class B: if the page is hidden during an item, void it and replace it with an item from the same class |
| Duration | About 180 s; the cap is 240 s |

**Metrics.**
- θ is the EAP ability estimate under the 3PL model (c = 1/8, a = 1, b from the class table), with prior N(0, 1) and quadrature from −4 to 4 in steps of 0.05. SE is the posterior SD.
- With 12 well-targeted items, SE is about 0.55 logits: each item contributes about 0.20 information and the prior adds 1 [D].
- Secondary: accuracy; median correct RT by class; operation-level accuracy, i.e. for each probe attribute, whether the chosen option had the correct value (HeiQ's operation scores predicted GPA better than item scores; Pallentin 2023); accuracy by rule family; timeouts; rapid guesses.

**Index (grade C).**
- **Index = clamp(round(50 + 10θ), 0, 100).**
- θ = 0 is the difficulty that an average participant in the Sandia norming sample solves 56% of the time. That sample was 80 college students with 4 responses per item, so the anchor is coarse and probably sits above the population average.
- Class anchors on the index: D1 ≈ 24, D3 ≈ 38, D4 ≈ 44, D7 ≈ 54, D8 ≈ 61, D9 ≈ 69 [D].
- **Item parameters are fixed.** One person's data cannot calibrate them, because ability change and item difficulty are confounded. Recalibrate only with data from many users.
- The fixed N(0, 1) prior pulls extreme θ values slightly toward 0. The effect is constant across sessions and harmless for trends. Never personalise the prior.
- **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- Expected reliability is about .70 [D], matching the MaRs-IB 12-item forms (.705–.709), compared with .613 for a 9-item abbreviated Raven (Zorowitz 2024).
- A single session differs reliably from baseline at about 1.15–1.2 logits (≈ 12 index points); a 7-session mean at about 0.6 logits (≈ 6 points). These figures are derived [D] and assume independent session errors.

**Practice and run-in.**
- Retest gains on reasoning tests are SMCR 0.33 after one retest and 0.55 after two, plateauing by the third administration. Identical forms gain more than alternate forms (0.37 vs 0.23) (Scharfen 2018).
- A video of under 14 minutes explaining matrix rules raised scores by d ≥ 1.19 without changing their correlation with intelligence (Schneider 2020).
- **R = 3.** Practice-prone.

**Training.**
- Future games:
  - Letter and number series in the ICAR format (Condon 2014).
  - A construction-format "Matrix Builder" where the user builds the missing cell (Becker 2016).
  - Matrices with operation-level feedback (HeiQ).
  - Figural analogies (Yang 2021).
- Shortcut cards:
  - `sequence-cracker`: rule induction in number series.
  - `logic-grid` and `house-puzzles`: deduction (no validated transfer to Gf).
  - `code-breaker`: hypothesis testing.

---

### 1.9 Precision: Target Ring (ISO 9241-411 tapping)

**Construct.** Touch-aiming precision is how efficiently the eye and hand turn a visual target into a fast, accurate finger landing. It is summarised by effective throughput (TP, bits/s), which stays roughly constant whether a person chooses to be fast or careful (MacKenzie & Isokoski 2008; Yamanaka & MacKenzie 2026). It is a psychomotor capacity that sits next to intelligence, not inside it. It is a specific skill, too: touch tapping correlates only r ≈ .3–.4 with pegboard tests (McGuckian 2024).

**Why this benchmark.**
- **A standard.** The ISO standard metric comes with an explicit procedure (Soukoreff 2004) and published smartphone finger values (MacKenzie 2015).
- **Robust to strategy.** Emphasising speed or accuracy changes movement time and error rate but not TP (MacKenzie & Isokoski 2008). Computing effective width from univariate scatter gives the most stable TP (n = 346; Yamanaka & MacKenzie 2026).
- **Practical.** Only geometry is generated, so forms are unlimited. A session takes under 2 minutes. It is immune to constant touch latency, because movement time is measured between two touches.
- **Fair across fingers.** Geometry is in physical millimetres with target width W ≥ 7 mm, which avoids the fat-finger floor: 2D error rates are 25–27% at 4.8 mm and 7% at 7.2 mm (Bi 2013).
- **Rejected alternatives:**
  - Two-target tapping: samples only one direction.
  - Finger-tapping speed: has no accuracy component (Ruff 1993).
  - FFitts: experimental, kept as a secondary option only.
  - Pinching and tracing tests: developed for multiple sclerosis (Graves 2023).
  - Physical pegboards: cannot run on a phone.

**Protocol.**

| Parameter | Value |
|---|---|
| Units | All geometry is in physical mm, converted with pxPerMm. The app SHOULD offer a one-time card calibration: the user drags a rectangle to match a bank card (ISO/IEC 7810 ID-1, 85.60 × 53.98 mm), and pxPerMm = rectWidthPx / 85.60, stored per device. The uncalibrated default is about 6.2 CSS px/mm [U]. Never use CSS mm or in units: on screens they are tied to the reference pixel, not physical size (W3C CSS Values 4) |
| Layout | Portrait. A square board above the bottom tools card, with 16 px gutters. 13 targets are evenly spaced on a ring of diameter D. Inactive positions are 2 mm dots; the active target is a disc of diameter W in the accent colour. State changes are paint and transform only [DC] |
| Conditions | D ∈ {20, 40} mm × W ∈ {7, 12} mm. Nominal ID = log2(0.993·D/W + 1) = 1.41, 1.94, 2.11 and 2.74 bits, where 0.993·D is the chord between targets 7 apart on a 13-target ring [D]. The maximum extent D + W is 52 mm. If the board is smaller, scale all geometry by s = boardSide/(52·pxPerMm), record s, and flag s < 0.9 as not comparable [DC] |
| Sequence | Target 0 is lit. The first tap starts the sequence and is not scored; its touch point is the first "from". The highlight then follows t_k = (7k) mod 13 for k = 1…13, so every movement crosses the ring at the same length and the sequence ends on target 0: 13 scored selections. Every touch counts as a selection and advances the highlight, hit or miss (ISO serial task) [V/D] |
| Blocks | 1 unscored warm-up sequence (D 40, W 12), then 12 scored sequences = 4 conditions × 3 rounds, each round in a new random order. That gives 156 scored taps, 39 per condition, above the 15–25 recommended (Soukoreff 2004). A 1.2 s card appears between sequences, and the next one starts on the user's tap. First run only: a 3-step animated tutorial and 2 practice sequences, not stored [DC] |
| Instructions | "Hold the phone in one hand and tap with the index finger of your other hand (or rest the phone on a table — just do it the same way every time). Tap each highlighted circle as quickly and accurately as you can. An occasional miss is fine." A supported and a hand-held phone did not differ (6.85 vs 7.06 bps, n.s.; MacKenzie 2015) |
| Feedback | Hit: a 120 ms scale pulse of the target (transform only) and a soft tick. Miss: a 150 ms small ring in the bad colour at the touch point and a soft thud. No score during the run [DC] |
| Input | Listen for pointerdown on the board, not click. Set touch-action: none and call preventDefault. Use event.timeStamp, and convert clientX/Y to millimetres from the board centre. Ignore non-primary pointers and any pointerType that differs from the session's. Class B: if the page is hidden or the orientation changes, discard that sequence and append a replacement |
| Trial exclusions | MT < 80 ms (double or bounced touch); MT > 2,500 ms (a lapse); distance(selection, target) > 20 mm (gross miss; the outlier rule from Bi 2013); ae < 0.5·a (the movement did not head toward the target) [DC]. A sequence with more than 3 exclusions is re-run once at the end |
| Validity | At least 10 of 12 sequences valid and an overall error rate ≤ 25%; otherwise the session is invalid, with the message "That run was too fast to score — try again a little more carefully". Quality flag (does not invalidate): mean MT in the hardest condition is lower than in the easiest, which violates the Fitts signature |
| Adaptive rule and stop rule | None; the session ends when all sequences are done |
| Duration | About 100–110 s |

**Metrics.**
- Per trial (the serial-task method of MacKenzie 2015): a = distance(from, to), b = distance(selection, to), c = distance(selection, from). dx = (c² − b² − a²)/(2a) is the signed overshoot. ae = a + dx + dx_prev, with dx = 0 at the start of each sequence.
- Per condition, pooling its 3 repetitions after exclusions (n ≈ 39):
  - We = 4.133·SD(dx), using univariate scatter (Yamanaka & MacKenzie 2026).
  - Ae = mean(ae).
  - IDe = log2(Ae/We + 1).
  - MT = mean inter-tap interval in seconds.
  - TP_c = IDe/MT.
- **Session TP = the mean of the 4 TP_c values**, the "mean of means" (Soukoreff 2004). Never compute TP on single trials or from 1/slope.
- Secondary: error rate (ideally about 4%); MT in ms; "tightness" = We at W = 7 mm; the Fitts fit MT = a + b·IDe, for display only (a small positive intercept is the expected pattern).

**Index (grade C).**
- z = (TP − 6.39)/0.9; Index = clamp(round(50 + 10z), 0, 100). For example, 7.29 bps → 60 and 5.49 bps → 40 [D].
- The anchor is 2D smartphone finger TP of 6.39 bps (MacKenzie 2015: N = 16, mean age 24.3, Nexus 4 phone, 20-target ring, IDs 1.14–3.17). The study reported no SD, so the working SD of 0.9 is about range/4 [U, a rule of thumb].
- Mouse and trackpad sessions form a separate series with no anchor; ISO mouse studies range 3.7–4.9 bps (Soukoreff 2004). No age-stratified touch norms exist.
- **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- No ICC exists for smartphone TP. Mouse TP rose 2.9% from session 1 to session 2, and the authors recommend estimating it over several sessions (Sharif 2020).
- TP is more stable than MT or error rate (Yamanaka 2022), and at least 3 sessions are recommended (Atarashi 2024, abstract only).
- Analogous touch speed measures had ICC .63–.89 (McGuckian 2024).
- σ floor = 3% of baseline TP [DC].

**Practice and run-in.** Block 1 and block 5 differed by 0.2% (MacKenzie 2015). **R = 1.** Not practice-prone. A large jump usually means a change of strategy, posture or device.

**Device.** Constant latency cancels out. Jitter of SD ≈ 6.5–7.5 ms (Pronk 2020) adds about 2% noise to a roughly 350 ms MT [D]. Never pool touch with mouse sessions. Store pointerType, pxPerMm and s.

**Training.**
- Future games:
  - An adaptive Target Ring trainer, with W adapting toward about 4% errors.
  - A two-target reciprocal sprint.
  - Radial home-and-out tapping (ICC ≈ .80; McGuckian 2024).
  - Go/no-go precision tapping.
  - Pinch-and-catch moving targets (Graves 2023).
  - Tracing, pursuit tracking and rhythm tapping (not reviewed).
- Shortcut cards are related practice only, because no existing game is an aiming measure:
  - `schulte-table`: rapid targeted taps, dominated by visual search.
  - `snake`: steering and timing.

---

### 1.10 Reaction: PVT-B (3-minute Psychomotor Vigilance Test)

**Construct.** Alertness and vigilant attention: staying ready to respond quickly, without lapses, at unpredictable moments over several minutes. The PVT is the most sensitive behavioural measure of sleep loss; lapses show the largest impairment of any cognitive outcome (g = −0.776 in the abstract of Lim & Dinges 2010). It is effectively learning-free, so day-to-day changes mostly reflect state (sleep, circadian phase, fatigue, stimulants) rather than skill. It does not measure higher cognition, and simple RT slows by about 0.45–0.55 ms per year (Woods 2015).

**Why this benchmark.**
- **Gold standard.** It is the reference measure of alertness. The 3-minute version was validated against the 10-minute PVT under total sleep loss (33 h awake) and partial sleep loss (5 nights of 4 h in bed). Response speed (1/RT) had the largest effects in both (Basner, Mollicone & Dinges 2011).
- **Learning-free.** There was no systematic change across 16 administrations (Basner 2018).
- **Practical.** It has been run on smartphones (Grant 2017). It is procedural (only the intervals are random), and its scores are means of single-trial RTs rather than difference scores.
- **Caveats to show the user:** the PVT-B is not interchangeable with the 10-minute PVT. Repeated-measures correlations between them were below .70 in 76% of comparisons for 1/RT and 96% for lapses (Antler 2022). Absolute RTs and lapse counts also depend on hardware.
- **Rejected alternatives:**
  - Plain simple RT: has no lapse or vigilance dimension.
  - Deary–Liewald 4-choice RT: kept as a future weekly check (Deary 2011).
  - The Hick slope: a difference-type score.
  - Cogstate cards: proprietary and unverified.
  - The 10-minute PVT: too long.

**Protocol.**

| Parameter | Value |
|---|---|
| Setup | Phone flat on a table, portrait, brightness high, Do Not Disturb. Tap with the dominant index finger in a large response zone **below** the stimulus, as in Grant 2017. Use the same posture every run; orientation and finger shifted mean RT by about 20 ms (Arsintescu 2017) |
| Display | Fixed in every theme: a black panel with a centred red-outlined box (about 60% of width × 15% of height). The stimulus is a yellow millisecond counter that starts at 0 and counts up every frame (Grant 2017 display; counter stimulus per Basner) [DC sizes] |
| ISI | 1,000–4,000 ms, measured from the last response and including the 1 s RT feedback [V]. Block-randomised: a shuffled deck of the 31 values 1,000, 1,100 … 4,000 ms, redrawn when exhausted [DC implementation of the source's block randomisation] |
| Response | On tap, the counter freezes and shows the RT for 1,000 ms; that second counts toward the next ISI [V] |
| False start | A tap while no counter is visible, or a measured RT below 100 ms + device offset (about 158 ms on iOS). Show "FS" for 1 s (part of the next ISI) and restart the ISI. Not a valid stimulus [V rule; D offset] |
| Timeout | No response within 30,000 ms. Show "OVERRUN" with a sound. It counts as a valid stimulus and as a lapse with RT 30,000 ms [V] |
| Stop rule | The test ends with the first response after 180 s have elapsed. Expect about 62 stimuli (mean 62.3 in Basner, Mollicone & Dinges 2011) [V] |
| Adaptive rule | None |
| Practice | First lifetime run: 20 s of unscored practice [DC]. The first full session is the run-in |
| Validity | Interruption class A. Fewer than 40 valid stimuli → invalid. More than 10 false starts → invalid [DC] |
| Log | For every stimulus: ISI, onset, RT, false start or timeout. Per session: device, OS, frame interval, device offset used |
| Duration | 180 s, plus about 15 s of setup |

**Metrics** (Basner & Dinges 2011; Basner, Mollicone & Dinges 2011).
- Valid stimuli: every measured RT ≥ 100 ms + device offset, including lapses and timeouts.
- **Primary: response speed S = mean of 1000/RT** (s⁻¹).
- Lapses L = number of measured RTs ≥ 355 ms + device offset (≈ 413 ms on iOS) [D]. The 355 ms threshold was set for the PVT-B on PVT-192 hardware.
- False starts FS.
- Performance score PS = 100 × [1 − (L + FS)/(valid + FS)].
- Also: speed of the slowest 10% and RT of the fastest 10%.
- Median RT is for display only; mean and median RT must not be the primary metric (Basner & Dinges 2011).
- On phones, lapse and false-start counts are approximate. Trust change within one device.

**Device offsets.**
- Mean overestimation of RT by web apps (Pronk 2020): iOS Safari 57.6 ms, iOS Chrome 57.9, Android Chrome 69.8, Windows Chrome 68.5, macOS Safari 132.9.
- On any other platform there is no reference index, and the lapse and false-start thresholds use a 60 ms offset [DC].
- Total latency ranged from 35 to 140 ms across 26 phones (Nicosia 2023b), so every offset is approximate.

**Index (grade C).**
- μ_RT = 213.0 + 0.55·(age − 46) + offset, in ms. This takes Woods 2015's simple RT of 230.8 ms, subtracts the 17.8 ms hardware delay they measured, and applies their age slope of +0.55 ms/yr. Age 46 is used if none is given [D].
- μ_S = 1000/μ_RT and σ_S = 1000 × 26.8 / μ_RT² [D]. On iOS at age 46: μ_S = 3.70 s⁻¹ and σ_S = 0.37 s⁻¹.
- Index = clamp(round(50 + 10 (S − μ_S)/σ_S), 0, 100).
- This derivation is unvalidated: the PVT is not a short-interval simple RT task, and the mean of 1/RT is not 1/mean RT. Show PS beside the index.
- **For this area, today's personal state is the headline. The index is anchored to the literature range.**

**Flags specific to Reaction** [DC]. After at least 10 post-run-in sessions: lapses above the user's own 90th percentile; FS ≥ 4 ("responding before the counter").

**Reliability and change.**
- The 10-minute PVT has ICC > .8 for its key metrics (reported in Basner & Dinges 2011). No ICC specific to the PVT-B was found.
- Smartphone vs laptop: r = .62 for lapses and r = .57 for mean RT (Grant 2017, n = 16).
- SEM_ref ≈ 0.37 × √(1 − .80) ≈ 0.16 s⁻¹ [D; r = .80 is assumed from the 10-minute PVT].
- PVT-B effect sizes are 22.7% smaller on average than the 10-minute test's, but remain large under total sleep loss and medium-to-large under partial sleep loss (Basner, Mollicone & Dinges 2011).

**Practice and run-in.** Mean and median RT, speed and lapses showed no systematic change over 16 administrations. The tiny drifts in the fastest and slowest 10% and in false starts (−0.03 per administration) were judged probably irrelevant in practice (Basner 2018). **R = 1.**

**Training.** A better PVT score means better alertness, not trained reflexes.
- Future games:
  - Deary–Liewald simple + 4-choice RT as a weekly decision-speed check: 8 practice + 20 trials for simple RT, 8 practice + 40 for choice RT, ISI 1–3 s (Deary 2011).
  - A Hick choice ladder with 1, 2, 4 and 8 alternatives.
  - A Go/No-Go speed game (Hedge 2018).
  - An auditory PVT, which needs its own lower lapse threshold (Basner & Dinges 2011).
  - Fast action-style visual tasks (Dye 2009).
- Shortcut cards are for engagement only and are not measures: `snake`, `block-drop`.

---

### 1.11 Processing Speed: symbol–digit coding

**Construct.** Processing speed (CHC Gs) is how fast simple, well-practised operations are carried out under time pressure. Symbol–digit substitution (SDMT/DSST) is the standard marker. It is valued for sensitivity rather than specificity: it moves with depression (d = 0.55), sleep restriction, alcohol and sedating drugs, and age explains 86% of its variance in a meta-regression of 141 studies (Jaeger 2018; Hoyer 2004). It also draws on motor speed, visual scanning and incidental learning, so it cannot tell which function changed.

**Why this benchmark.**
- **Best phone validation.** It is the best-validated self-administered smartphone cognitive test: ICC .86–.90, with known practice curves and individual smallest-detectable-change values of about 6.5–8.6 points (van Oirschot 2020; Lam 2022; Pham 2021).
- **Unlimited forms.** A new random key every session prevents memorising the symbol–digit pairs and gives unlimited forms of matched difficulty.
- **Comparable scale.** A 90 s block keeps the SDMT scale and its literature, including the multiple-sclerosis responder definition of about 4 points or 10% (Benedict 2017).
- **Separates finger speed.** A 15 s digit-matching motor baseline (Floodlight) separates finger and device speed from coding speed. The dexterity-corrected score had a smaller long-term practice effect (+23.5% vs +40.8%; Woelfle 2021).
- **Device tolerance.** Count scores are robust to latency [S/D].
- **Rejected alternatives:**
  - Pattern Comparison: 50% guessable and proprietary. Adult retest is .73 in an abstract but ICC .61 in a secondary listing, unresolved (Carlozzi 2014, 2015).
  - Symbol search: scored on RT, so sensitive to latency (Sliwinski 2018).
  - DSST: requires writing symbols.
  - PST: proprietary (Rao 2017).

**Protocol.**

| Parameter | Value |
|---|---|
| Task | Symbol → digit, the SDMT direction: see a glyph, tap its digit. A new random 9-glyph key each session |
| Layout | Portrait, 320–430 px wide, no scrolling, no other controls. Key strip at the top: 9 cells ordered 1→9, each at least 36 px wide, with the glyph (about 28 px) above its digit (about 16 px, tabular), visible throughout. Centre: a target card with the current glyph at about 96 px and no score. Bottom tools card: a 3×3 phone keypad (1-2-3 / 4-5-6 / 7-8-9), equal-width keys at least 56 px tall. The keypad deliberately does not mirror the key strip, so the digit must be read [DC] |
| Glyphs | A pool of at least 36 original abstract line glyphs: 2–4 strokes on a 3×3 grid, similar ink and size, no letters, digits or familiar icons. No key may contain two glyphs that are rotations or mirror images of each other. Each session draws 9 test glyphs and 9 different practice glyphs with a random glyph→digit mapping, seeded [DC] |
| Item sequence | Back-to-back shuffled sets of the 9 glyphs (each glyph once per set), with no immediate repeat across set boundaries. Pre-generate 200 items, above the highest healthy score of 92.4. All 9 glyphs are used from the start, as in the MS sherpa sSDMT [DC] |
| Flow | Instructions with a 2-item animated demo, about 10 s → practice: 10 items on the practice key, untimed, green/red feedback for 250 ms, **every session** (the sSDMT authors' recommendation); at least 8/10 correct, otherwise repeat once → motor baseline, 15.0 s: the card shows a digit (from shuffled sets) with the key strip hidden, and the user taps the same digit → 3-2-1 → coding block, 90.0 s → results |
| Coding block | Each tap registers on pointerdown. The next glyph is fully visible on the next frame, with no inter-item interval. Only a neutral press animation; no correctness feedback, no skip, no going back |
| Adaptive rule | None |
| Stop rule | Input locks at 90.0 s (15.0 s for the motor baseline). The item on screen is discarded |
| Exclusions and validity | Taps arriving less than 120 ms after the previous registered response are ignored as double taps and logged; flag the session if more than 5 are ignored [DC]. Interruption class A. Invalid if fewer than 20 answers are correct (the MS sherpa outlier rule) [S], if accuracy is below 80% [DC], or if any gap between responses exceeds 5 s [DC] |
| Log | Per item: glyph, digit, response, RT, position in its set. Per session: device, app version, frame-interval distribution (a software slowdown once corrupted sSDMT data; Lam 2022) |
| Duration | About 140 s |

**Metrics.**
- **Primary: SDS90 = number correct in the 90 s block**, on the same scale as the clinical 90 s SDMT.
- Secondary: errors; accuracy; DM90 = 6 × correct digit matches in 15 s (motor and device speed on the same scale); median time between correct responses.
- Diagnostics only: the coding ratio SDS90/DM90 (a ratio of two noisy scores), and the within-session learning slope (items per minute in the last 30 s minus the first 30 s).

**Index (grade C).**
- z = (SDS90 − 54)/9; Index = clamp(round(50 + 10z), 0, 100). For example: 45 → 40; 54 → 50; 63 → 60; 72 → 70 [D].
- The mean of 54 is the healthy-volunteer median on a smartphone SDMT, on the 90 s scale (n = 39, range 23.5–92.4; Pham 2021).
- The SD of about 9 is derived from Lam 2022: an SDC of 8.58 and ICC of .882 give SEM ≈ 3.1, so SD ≈ 9.0. That sample mixed people with multiple sclerosis and controls [D].
- Phone versions score about 8–12% below the paper and oral SDMT (Pham 2021; Lam 2022; van Oirschot 2020). Age-band anchors from Kiely 2014 or Strober 2020, minus that offset, are a future calibration task; those tables were not retrieved.
- **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- ICC(A,1) .874 in multiple sclerosis, .857 in matched controls and .867 in normative controls (van Oirschot 2020).
- A single morning test had ICC .882 and a 1-week mean .934; SDC was 8.58 points for a single test and 6.47 for a weekly mean (Lam 2022).
- ICC .87 including the learning period and .90 after it (Pham 2021). Variability was 14.4, 9.5, 7.7 and 6.2 points for 1, 2, 3 and 4 averaged tests (Pham 2021).
- SEM_ref ≈ 3.1 [D].

**Practice and run-in.**
- In controls, the first retest showed d = 0.38 (+3.4 points), and there was no difference between the 7th and 8th test (van Oirschot 2020).
- Learning plateaued after about 8 sittings on average, but 2 of 16 people were still improving after 20 (Pham 2021).
- Scores rose 3.7–4.1 points over 4 weeks of testing every 3 days, and morning scores averaged 0.75 points higher than evening scores (Lam 2022).
- In multiple sclerosis, weekly scores rose 19.7% from test 1 to test 5, with a modelled plateau at +40.8% (half reached after 11 tests, 90% after 35) (Woelfle 2021).
- **R = 3.** Practice-prone.

**Training.**
- Future games:
  - Pattern comparison with an error penalty (Carlozzi 2015).
  - Symbol search in the M2C2 style.
  - An adaptive coding drill with a new key every round, kept separate from the benchmark.
  - ACTIVE-style divided-attention speed training (the exact protocol is unverified; Edwards 2017).
  - Visual search and cancellation.
- Shortcut cards:
  - `schulte-table`: visual search speed.
  - `odd-one-out`: speed of perceptual comparison.
  - `stroop-match`: speeded choice under interference.
  - `count-compare`: brief-flash counting and comparison.
  - `math-sprint`: speeded number facility.

---

### 1.12 Flexibility: Shape–Color Switch (MTB Shape-Color Sorting)

**Construct.** Cognitive flexibility, or set shifting, is the ability to rapidly replace one task-set (a rule or stimulus–response mapping) with another. It is the shifting-specific executive factor, classically measured with cued task switching (as described by Schuch 2022). Responses are slower and more error-prone right after a switch, and preparation reduces but does not remove that cost (Monsell 2003). DCCS-type switching declines with age (MTB r = −.39 to −.50; Novack 2024) and also depends on processing speed.

**Why this benchmark.**
- **Best phone evidence.** It is the best-evidenced phone measure of flexibility (Novack 2024; Han 2025):
  - retest ICC .78 (95% CI .71–.84; N = 144; 14 days; remote; iOS)
  - split-half .93–.94
  - r ≈ .70 with the NIH Toolbox DCCS, and validity against the WCST-64 and D-KEFS
  - no significant practice effect.
- **Practical.** It takes about 100 s, and its stimuli are trivial to regenerate.
- **Avoids difference scores.** The rate-correct score combines speed and accuracy. Switch costs have poor individual reliability: the colour–shape switch cost had r = .62 at 1 week (Paap & Sawi 2016, via Schuch 2022), the N−2 cost r = .21 (Schuch 2022), and see Hedge 2018 generally. Speed–accuracy composites are more reliable and valid (Hughes 2014; Draheim 2016, 2019).
- **Fidelity.** Every published MTB parameter is copied; unpublished details are marked [DC].
- **Rejected alternatives:**
  - Cued switching scored by costs.
  - Digital Trail Making B: fixed layouts, ratio or difference indices, unverified reliability (Tombaugh 2004; Passell 2021).
  - WCST: stops measuring once the hidden rules are known.
  - Tower of London: measures planning, and was not reviewed.
  - An unvalidated 120 s variant (Appendix A6).

**Protocol.**

| Parameter | Value |
|---|---|
| Layout | Portrait. Top third: the cue word, lowercase "shape" or "color", about 28–32 px, in a fixed position [V: lowercase word cue]. Middle: the test picture at about 40% of width. Bottom: two target cards side by side, each about 45% of width and at least 120 px tall, always visible. Left = shape A in colour 1; right = shape B in colour 2. Card sides are randomised per session and stored [DC] |
| Stimuli | Two clearly different pictogram silhouettes, with a different pair for practice than for the test (MTB used dog/car for practice and balloon/house for the test) [V]. Two colours that differ in both hue and luminance and are safe for colour-vision deficiency (e.g. blue vs orange), never red/green [DC]. The test picture is always bivalent and response-incongruent: shape A in colour 2, or shape B in colour 1, so the shape rule and the colour rule always point to opposite cards [V] |
| Trial timeline | A blank ISI of 300 or 1,000 ms at random, with the targets still visible [V] → the cue word appears → 500 ms later the test picture appears below it, and the cue stays on [DC: MTB's cue lead was not verified; keep it constant, because preparation changes switch costs] → the user taps a card (pointerdown) within 2,500 ms [V] → the picture clears. No feedback. A timeout counts as an error |
| Blocks | Practice: 5 mixed trials with ✓/✗ and a one-line rule reminder [V: count]; repeat once if fewer than 4 of 5 are correct [DC]. Test: 30 trials, 24 cued "shape" (80%) and 6 cued "color" (20%) [V]. Order [DC]: trial 1 is a shape trial; no two colour trials are adjacent, and colour trials are separated by at least 2 shape trials where possible (about 6 switches into colour and 6 back); the two stimulus identities appear 15 times each; the correct side is balanced within each cue type |
| Adaptive rule | None |
| Stop rule | After trial 30 |
| Exclusions and validity | RT under 200 ms is an anticipation, scored as an error and counted [DC]. Interruption class A. Invalid if there are more than 3 anticipations or accuracy is below 70% [DC] |
| Cue language | The cue word follows the user's language, locked for the whole series [DC] |
| Duration | About 100–110 s |

**Metrics.**
- **Primary: rate-correct score RCS = N_correct / ΣRT_i**, in seconds, over the 30 test trials. This is correct responses per second, the rate-score model used by MTB and NIH Toolbox v3 (Novack 2024).
  - A timeout contributes 2.5 s; an anticipation contributes its own RT [DC: MTB's exact handling is unverified].
  - The metric is tracked as ln(RCS).
- Secondary: accuracy; median correct RT on shape vs colour trials; anticipations; timeouts.
- Exploratory only: RT and error switch costs (correct trials only, excluding trial 1 and trials after an error), shown only when pooled over the last 7 valid sessions.

**Index (grade P).**
- No raw norms for MTB Shape-Color Sorting were found, so there is no population anchor, and one MUST NOT be invented.
- Personal index only: P = clamp(round(50 + 10·(ln RCS − B)/σ_w), 0, 100), with σ floor 0.05 (about 5%).
- Flexibility appears **beside** the Mean and is not averaged into it (§2.1).
- The NIH Toolbox DCCS adult score (7.8 ± 1.6) is not comparable.

**Reliability and change.** MTB ICC .78; split-half .93/.94 (Novack 2024), with a median of .94 in Han 2025. NIH Toolbox DCCS adult ICC .81 (Weintraub 2014).

**Practice and run-in.** MTB: +0.03 correct/s at 2 weeks, n.s. (Novack 2024). NIH Toolbox DCCS: d = 0.33 at 1–3 weeks (Weintraub 2014). Retest gains plateau by the third administration (Scharfen 2018). **R = 3.** Treated as practice-prone for wording.

**Device.** Operating system shifted scores (β = .21; Novack 2024). With a mean RT of about 1 s, 100 ms of extra latency lowers RCS by about 10% [D]. Never compare raw RCS across devices or with lab values.

**Training.**
- Future games:
  - Cued number switching (parity vs magnitude) with a constant cue lead.
  - Alternating-runs vs cued switching; the preparation effect had retest r ≈ .57–.62 (Schuch 2022).
  - Digital Trail Making B with generated layouts of equal difficulty (Passell 2021).
  - Tower of London-style planning.
  - Rule-discovery card sorting with original materials, for training only.
- Shortcut cards:
  - `stroop-match`: cued rule switching under interference (rule flips on harder tiers).
  - `tower-of-hanoi`: planning.

---

### 1.13 Spatial: Mirror Twins (3D mental rotation)

**Construct.** Visuospatial processing (CHC Gv) is measured here through its most studied component, mental rotation: deciding whether two differently oriented figures are the same object or mirror images. RT rises linearly with the angle between them, the signature of an analog rotation process (Shepard & Metzler 1971, via secondary sources). The rate is about 100°/s with modern stimuli (Ganis & Kievit 2015). Spatial skill predicts STEM attainment (as cited by Uttal 2013) and is among the most trainable abilities (training vs control g = .47; Uttal 2013).

**Why this benchmark.**
- **Strong paradigm and anchors.** It is the best-replicated chronometric spatial paradigm, with a built-in validity check: RT rises with angle. An open validated stimulus set exists at exactly our angles (0°, 50°, 100°, 150°) and provides the anchors (Ganis & Kievit 2015).
- **Unlimited items.** The figures are rule-defined, so a seeded generator gives unlimited chirality-checked items. That matters because repetition gains are partly item-specific (Heil 1998, via secondary reviews), while practising the process transfers to new figures (Wright 2008).
- **3D rather than 2D:**
  - 3D depth rotation engages 3D visualisation; 3D slopes are steeper (Bauer & Jolicoeur 1996).
  - Mirror foils force genuine rotation rather than feature matching (as cited in Rotation review 2010).
  - About 40 trials still fit in roughly 2.5 minutes.
- **Efficiency, not slope.** The primary score is efficiency. Per-target slopes have split-half ≤ .38 (Hirschfeld 2013).
- **Rejected alternatives:**
  - 2D polyomino rotation: a good training game.
  - The MRT paper test: copyrighted items, 4 alternatives, large practice effects (Peters 1995).
  - Paper folding: supported by one training study (Wright 2008); a candidate second spatial game.
  - Tetris: a training paradigm (Terlecki 2008; Sims & Mayer 2002).

**Protocol.**

| Parameter | Value |
|---|---|
| Generator | Seeded per run, so figures never repeat across sessions and can be regenerated. Each figure is a polycube path of 10 unit cubes in 4 straight arms joined by 3 right-angle bends (Ganis & Kievit used 7–11 cubes in four arms). Arm lengths are drawn from {2, 3, 4} so the total is 10 with shared corner cubes counted once, and each arm runs perpendicular to the previous one. Accept a figure only if: (1) it spans all three axes; (2) no two non-consecutive arms touch face to face; (3) it is chiral, i.e. its normalised mirror image (x → −x) matches none of the 24 proper rotations; (4) from the camera, every cube shows at least 25% of one face at every angle used, and no arm lies within 15° of the line of sight. Precompute the session's 44 figures before trial 1, targeting under 50 ms [DC] |
| Rendering | Orthographic projection, camera elevation 25°, faces drawn back to front. Three flat tones for top, left and right faces plus a 1.5 px darker edge; no gradients. Rotation is about the world vertical axis. The reference figure (left) uses a base yaw φ ∈ [20°, 70°] + k·90°. The comparison figure (right) is the same figure or its true mirror image, rotated by s·θ with s = ±1. Each figure fills a square of side (boardWidth − 48)/2 (about 150–180 CSS px); both figures share scale, tones and lighting [DC] |
| Trials | θ ∈ {0°, 50°, 100°, 150°} [V angles] × {same, mirror} × 5 = 40 scored trials, with at most 3 identical correct answers and at most 2 identical angles in a row. Every run: 4 unscored warm-ups, one per angle. First run: an animated demo (one figure rotating into alignment with its twin, then a mirror twin that never aligns) and 8 practice trials with feedback; repeat practice if fewer than 6 of 8 are correct [DC] |
| Timeline | 300 ms blank with a fixation dot → both figures appear together (onset = rAF timestamp) → response, or a 7,000 ms timeout (Ganis & Kievit used 7,500 ms) → 150 ms neutral acknowledgement → next trial [DC] |
| Response | Two equal-width buttons in the bottom tools card: "Same" on the left and "Mirror" on the right, at least 56 px tall, each with an icon and a label. Desktop keys: F = same, J = mirror. The mapping never changes [DC] |
| Exclusions | RT under 250 ms is an anticipation; it is excluded and the trial is re-queued once [DC]. A timeout is an error with RT 7,000 ms. Class B: if the page is hidden or the orientation changes, discard and re-queue the trial |
| Validity | Accuracy ≥ 65% (chance is 50%; raised from 60% on 2026-10-31 — over 40 trials a pure guesser reaches 60% in ~13% of runs, 65% in ~4%) and no more than 20% of trials excluded or timed out; otherwise invalid. Quality flags (do not invalidate): RT-vs-angle slope ≤ 0; accuracy at 0° below 75% |
| Adaptive rule and stop rule | None; a fixed 40 scored trials |
| Duration | About 150–160 s; the first run takes about 3 minutes |

**Metrics.**
- **Primary: rotation efficiency, RCS = correct ÷ (sum of RTs of all valid trials, in minutes)**, i.e. correct figures per minute.
- Secondary: accuracy; median correct RT overall and per angle; inverse efficiency.
- Diagnostics only: the RT-vs-angle slope (ms/deg) and intercept from an OLS fit to the four per-angle median correct RTs, and the rotation rate 1000/slope (°/s). Show these only as a 5-session rolling estimate, and never use them in the index.

**Index (grade C).**
- z = (RCS − 20.4)/6; Index = clamp(round(50 + 10z), 0, 100) [D].
- Anchors come from Ganis & Kievit 2015 (N = 54, mean age 22.3, desktop keyboard, 96 trials):
  - mean RT 1,801, 2,415, 3,026 and 3,191 ms at 0°, 50°, 100° and 150°
  - errors 5.3%, 7.3%, 13.4% and 18.8% at the same angles
  - RT = 9.56 ms/deg × angle + 1,891 ms.
- Derived from those means: mean RT ≈ 2.61 s and accuracy ≈ 88.8%, so RCS ≈ 0.888 × 60/2.61 ≈ 20.4 per minute. The working SD of 6 per minute comes from a between-person RT SD of SE × √54 ≈ 0.57–0.88 s [U assumption].
- Show accuracy (anchor 88.8%) and slope (anchor 9.56 ms/deg) beside the index.
- Our flat procedural figures on a phone differ from their shaded objects. **The index is anchored to the literature range. Change from the personal baseline is the primary signal.**

**Reliability and change.**
- Ganis & Kievit report no reliability statistics for the 3D task.
- For 2D picture-plane rotation (Hirschfeld 2013: 128 trials, retest after about 6 weeks):
  - intercepts: split-half .79/.82; retest .68 for blocked and .51 for mixed presentation
  - pooled slopes: retest .69/.55
  - slopes for individual targets: split-half ≤ .38.
- Overall speed and efficiency are therefore the reliable signal. σ floor = 5% of baseline RCS [DC].

**Practice and run-in.** Practice effects are large. Retest-only control groups improved by g = .45 and repeated-practice controls by g = .75 (Uttal 2013). Gains are large even across alternate MRT versions (Peters 1995). Weekly testing was still producing gains after 12 weeks (Terlecki 2008, abstract). **R = 3.** Practice-prone.

**Device.** Touch adds about 58–70 ms to every RT (Pronk 2020), roughly 2–3% of a 2.6 s response. That is negligible for the index and cancels within one device.

**Training.**
- Future games:
  - An adaptive rotation trainer built on the same generator, adapting angle range, rotation axis, cube count and time pressure. Process-level transfer was shown by Wright 2008, and RT outcomes are the most trainable (g = .69; Uttal 2013).
  - A 2D polyomino sprint with mirror foils.
  - Mental paper folding (Wright 2008).
  - A weekly "pick the two that match" deep test in the MRT format (Peters 1995).
- Shortcut cards:
  - `block-drop`: rapid rotation of Tetris-like shapes. It gave durable rotation gains with some transfer in Terlecki 2008, but gains were mostly limited to Tetris-like shapes in Sims & Mayer 2002.
  - `tangram`: rotate-and-flip assembly.
  - `pipes` and `laser-mirrors`: reasoning with tile rotation (no direct studies).

---

### 1.14 Phase-2 specs (build after the proof of concept is validated)

#### Learning: Prices (item–price associative recognition)

**Construct.** Episodic/associative memory is forming new arbitrary associations and recognising the correct pairing after a delay. It is distinct from span (Facchin 2024) and is affected early in preclinical Alzheimer's disease (binding deficits, as cited by Kim 2025). Two phone platforms, ARC and M2C2, chose item–price association for high-frequency use (Nicosia 2023a; Thompson 2022).

**Protocol** (mostly [DC]; the ARC/M2C2 exposure times and lure construction are unverified):
1. **Item bank.** At least 200 everyday grocery or household items, each with a monochrome icon, a 1–2-word label and a reference price. Each session samples 10 items not used in the previous 7 sessions.
2. **Prices.** Each price is drawn from 0.5× to 2× its reference price, in local currency with cents. All 10 prices are distinct and differ in their first two significant digits.
3. **Study.** Each pair is shown centred (icon, label, large price) for 3,000 ms, with two buttons, "Good price" and "Not a good price". The judgement keeps attention on the pair (incidental encoding) and is not scored. 500 ms blank between pairs.
4. **Filler.** 20 s of tapping every F among Es in a 5×8 grid, which blocks rehearsal (the distractor used by Sliwinski 2018).
5. **Test.** 10 two-alternative forced-choice trials in a new random order. Each shows the item with two prices: the studied price and a recombined lure (the price that was paired with a different studied item). Side is random. Unspeeded with a 10 s cap; no feedback.
6. **Practice.** First session only: a 2-pair demo with feedback.
7. **Validity.** Invalid if the page was hidden during study or test, if more than 3 responses were under 300 ms, or if all 10 responses were on the same side.
8. **Ceiling.** If the 7-session rolling accuracy is at least 95% for 2 consecutive weeks, offer an "extended" 16-pair level as a separate series.
9. **Cadence and duration.** About 100 s, once a day.

**Scoring and reliability.**
- Proportion correct (pc); chance is .5.
- Grade P: no norms exist under age 60. For context, adults aged 60–80 averaged about 70–80% on M2C2 Shopping List (Thompson 2022).
- Personal index on pc, with σ floor = √(p(1 − p)/10) at the baseline p [D]. Label the daily dot "today" and the 7-session rolling mean "level".
- **R = 2.**
- Single-session ICC was .26, and the average of 24 sessions .89 (older adults; Thompson 2022). ARC reliability was > .85 (Nicosia 2023a, abstract). Accuracy was flat over 8 days with new items each session (Thompson 2022).
- **No training claims** until the episodic-memory training literature has been verified.

**Future games.** An object–location paired-associates game in the CANTAB PAL style, with procedural patterns and no claim of equivalence (Cambridge Cognition PAL page); Corsi supraspan learning with 5-minute delayed recall (Facchin 2024).

#### Verbal: Grammatical Reasoning (Baddeley 1968)

**Construct.** Verbal reasoning through syntactic transformation: deciding whether a sentence (active or passive, affirmative or negative, precedes or follows) correctly describes the order of two letters. It is the marker task of the verbal component in Hampshire 2012.

**Protocol.**
- **Letters.** Pair 1 is A/B, as in the original. Pair 2 is a random pair per session of visually distinct capitals from {D, F, G, H, K, L, M, N, P, R, S, T}.
- **English templates:** "X precedes Y", "X follows Y", "X does not precede Y", "X does not follow Y", "X is preceded by Y", "X is followed by Y", "X is not preceded by Y", "X is not followed by Y".
- **PT-BR templates:** "X precede Y", "X segue Y", "X não precede Y", "X não segue Y", "X é precedido por Y", "X é seguido por Y", "X não é precedido por Y", "X não é seguido por Y".
- **Truth rule.** beforeXY = (relation ∈ {precedes, is followed by}). The statement is true when (X is left of Y in the displayed pair) == beforeXY, inverted for negative templates.
- **Deck.** Each of the 16 forms (8 templates × which letter is named first) appears once with each pair order. That makes 32 items per letter pair, half of them true, and 64 items in total, shuffled with at most 3 identical answers in a row [V: the 64-item structure, Baddeley 1968 / Inquisit manual].
- **Layout.** A thin time bar with no numbers. Statement at 22–26 pt, at most 2 lines. The letter pair in a framed card, monospace 44–56 pt with wide spacing. TRUE (left) and FALSE (right) buttons, each a full-width half and at least 64 pt tall.
- **Flow.** Each item stays until a response. A 150 ms press animation, then the next item 200 ms after the response. No correctness feedback during the timed block [V].
- **Practice.** First session: 6 practice items with feedback and a rule explanation; at least 4/6 correct to start, otherwise repeat once. Later sessions: 2 unscored warm-ups.
- **Timed block.** 180 s [V]. The item on screen at time-out is discarded.
- **Validity.** RTs under 300 ms are flagged. Invalid if accuracy is below 65%, if more than 20% of RTs are under 400 ms, if focus is lost for more than 2 s, or if fewer than 15 items were attempted.
- **Language.** Chosen at first run and stored with every result. Switching language starts a new series.
- **Cadence.** 1–2 times per week.

**Scoring and reliability.**
- Net = correct − errors (chance 0). Also store the number correct (the original score), accuracy and median correct RT.
- Grade P; σ floor 2 points; **R = 3.**
- Reliability: r ≈ .80 on successive days with N = 18 (Baddeley 1968); .66 over 7 days for a simplified form (Baddeley validity 1971); "less valid and less reliable than originally anticipated" (Baddeley re-evaluation 1973).
- It is insensitive to acute sleep loss (Lim & Dinges 2010).

**Shortcut cards.**
- `crossword` and `arrow-crossword`: in people with mild cognitive impairment, crosswords beat computerised games on ADAS-Cog at 78 weeks, with no inactive control group (Devanand 2022).
- `word-wheel`, `anagram-sprint`, `word-ladder`, `word-guess`, `missing-vowels`, `hangman`, `cryptogram`, `word-search`.
- `letter-hunt`: word formation and retrieval fluency.

---

## 2. Measurement methodology

### 2.1 Score layers

```
raw primary metric x (one valid session)
 ├─ reference:  z_ref = (x − μ_ref)/σ_ref  →  Area Index  I = clamp(round(50 + 10·z_ref), 0, 100)   [grades B/C only]
 └─ personal:   state z vs typical range (§2.5)
                change z vs frozen baseline, weekly blocks (§2.6)
                Personal Index  P = clamp(round(50 + 10·(x − B)/σ_w), 0, 100)   [after baseline; the only index for grade P]
```

- **Only benchmark sessions feed scores.** Training games and practice runs never do. Run-in sessions show a session index labelled "Calibrating", but they are excluded from levels, baselines, σ_w, verdicts and the Mean.
- **Area score.** In the MVP each area has one benchmark, so the area score is that benchmark's score. If an area ever has two or more benchmarks (for example a weekly deep test), its z is the mean of the available benchmark z values within the window.
- **Area level** (the large number on an area card) = 50 + 10 × mean(z_ref) over the area's valid post-run-in sessions in the last 14 days. Grade-P areas use personal z instead. Before the run-in is complete, show the latest session's index labelled "Calibrating".
- **Mean** = 50 + 10 × (1/m) Σ z̄_area over the m areas that have a reference grade. In the MVP, m = 8: every area except Flexibility.
  - It is shown only when each of those m areas has at least 1 valid post-run-in session in the last 14 days. No composite is computed while any component is missing (Maruff 2013).
  - Label it "Mean — average of m areas".
  - Grade-P areas are shown beside it and never averaged in, because averaging a self-anchored z with population-anchored z values would mix scales.
  - The Mean has a narrower spread than any single area, because areas are imperfectly correlated. Batteries re-standardise their composites with norm data, which we do not have.
- **Today** (optional) = the mean of today's state z over the state-sensitive areas: Reaction, Attention, Memory and Processing Speed, the domains most affected by sleep loss (Lim & Dinges 2010).
  - Shown only if at least 3 of them were completed today, each with a baseline.
  - Labelled "Today — compared with your typical range".
  - Never merged with the Mean.

### 2.2 Index scale and reference grades

- **One mapping for every index: 50 + 10z, rounded, clamped to [0, 100].** The reasons:
  1. It is the standard neuropsychological convention: a T-score. Cogstate composites also use SD 10 (Maruff 2013).
  2. It is linear in z, so averaging indices is the same as averaging z values. Percentiles are not additive.
  3. Clipping at ±5 SD never saturates in practice.
  4. It avoids SD 15, which is the IQ deviation metric (§4).
- A percentile (normal-CDF) mapping MUST NOT be used for any index. Percentiles may be displayed only for grade-A references, and the MVP has none.
- **Reference grades:**
  - **A:** norms from the same protocol on comparable phones. None in the MVP.
  - **B:** norms for the same paradigm on other hardware, with a measured device correction. None in the MVP.
  - **C:** provisional, anchored to the literature range of a related protocol or device. Shown with an "approximate" badge, and a tooltip names the anchor sample.
  - **P:** no reference; personal index only.
- **MVP grades:** attention C, memory C, calculation C, analysis C, precision C, reaction C, speed C, spatial C, flexibility P.
- **Context.** A reference function may need the user's age (optional; used for Memory and Reaction) and the platform's device offset (Reaction). Without an age, use the sample-mean anchors.
- **Reference version.** Bump `referenceVersion` whenever any anchor changes. Every reference index and the Mean are then recomputed from stored raw metrics.

### 2.3 Run-in, baseline and segments

- **Run-in.** The first R valid sessions of an area are unscored for personal statistics. They may be done back to back on day 1.
  - Two lead-in sessions removed practice effects at a 1-month retest (Falleti 2006), and most of the practice gain comes between sessions 1 and 2 (Collie 2003; Bartels 2010).
  - R follows each test's evidence:
    - **R = 1** for learning-free tests: reaction (Basner 2018), precision (MacKenzie 2015).
    - **R = 2** for tests with negligible practice: attention (Burgoyne 2023), memory (Woods 2016).
    - **R = 3** for tests with documented retest gains: calculation (Rickard 1994), speed (Pham 2021), analysis (Scharfen 2018), flexibility (Weintraub 2014), spatial (Uttal 2013).
- **Baseline.** B = the median of the next 5 valid sessions, each on a different local day (rule C6 guarantees this). B is then **frozen**. This matches the "dual baseline" approach (Bartels 2010; Goldberg 2015).
- **Segments.** A new segment starts, with a new 5-session baseline and no run-in, when:
  - the device fingerprint or input type changes
  - the protocol version changes in a way that can shift raw scores
  - the user explicitly resets the baseline, for example after illness or a long break.
  Old segments are kept and shown, but analytics never pool across segments. Sessions on a device other than the primary one are stored and shown greyed out.
- **Version changes.** Changes to the scoring or reference version rescore history. They do not start a new segment.

### 2.4 Personal noise σ_w

- σ_w = max(σ_floor, 1.4826 × MAD(r)), where r are residuals of the segment's valid post-run-in sessions:
  - When the baseline completes, r_i = x_i − B over the 5 baseline sessions.
  - From 10 post-run-in sessions onward, r_i = x_i − (the centred 7-session rolling median), which is robust to trends.
- σ_floor = SEM_ref = σ_ref × √(1 − r_ref), or the area's fixed floor (§2.12).
- The floor stops a short, lucky baseline from shrinking the noise estimate.

### 2.5 Today vs your typical range (daily state)

- m = the median of the last 14 or fewer valid post-run-in sessions before today. If at least 5 of them fall within ±2 h of the current local time, use only those [DC].
- z_state = (x − m)/σ_w.
- Labels:
  - |z| < 1: "within your typical range".
  - 1 ≤ |z| < 2: "above" or "below your typical range".
  - |z| ≥ 2: "well above" or "well below your typical range".
- Day-to-day variability is real but small, and "good vs bad days" mostly reflect faster fluctuations (Schmiedek 2013; Sliwinski 2018). A single day therefore never produces a progress verdict.
- A below-range message lists common benign causes and shows that day's check-in context (§4.4).

### 2.6 Progress: reliable change for one person

- **Blocks.** Use ISO weeks (Monday–Sunday, local time). For a completed week w with k ≥ 1 valid post-baseline sessions:
  - x̄_w = mean of those sessions
  - z_w = (x̄_w − B) / (σ_w √(1/k + 1/n_eff)), with n_eff = 3.2, because a 5-session median has about 64% of a mean's efficiency [D].
  - This follows the logic of the Reliable Change Index (Jacobson & Truax 1991), with the user's own robust session SD in place of a group SD.
- **Verdict**, re-evaluated at the end of each week:

  | Condition | Verdict shown |
  |---|---|
  | z ≥ +1.96 in **two consecutive** calendar weeks | "Reliably above your baseline" |
  | z ≤ −1.96 in two consecutive calendar weeks | "Reliably below your baseline" |
  | Only the latest week crosses ±1.96 | "Possibly above/below — check again next week" |
  | Anything else | "Within your normal range" |

  A week without a valid session breaks the chain. Never test every day: repeated looks inflate false alarms, and weekly blocks limit autocorrelation.
- **Practice qualifier.** In practice-prone areas (calculation, speed, analysis, spatial, flexibility), an improvement verdict MUST carry the wording "Part of this is practice on the test itself" (§4.4). In Memory, the app SHOULD annotate an improvement when `simon` or `number-trail` were played in the previous 14 days (Gathercole 2019).
- **Mean verdict** [DC]. Apply the same rule to the Mean's weekly series.
  - Each included area contributes its weekly mean z, carrying forward its latest value up to 14 days old.
  - The Mean's baseline is the average of the included areas' baselines, in z units.
  - σ_Mean = 1.4826 × MAD of the weekly Mean's residuals from its rolling median.
  - A Mean verdict becomes available only once every included area has a baseline and at least 8 weekly Mean values exist.
- **No clinical claims.** Jacobson & Truax's second criterion (moving into a functional range) has no counterpart here. The app may call a change reliable, never meaningful or clinically important.
- The SDC and MDC values quoted per test in §1 are context. The app uses this rule.

### 2.7 Trends

- **Chart layers for each area:**
  - Every session as a dot. Run-in dots sit in a shaded "Calibrating" band; invalid sessions are hollow and excluded.
  - The weekly-mean line, which is the progress line.
  - An EWMA line with λ = 0.25, for display only.
  - The baseline line with a band of ±1.96 σ_w √(1/k̄ + 1/n_eff) [D].
- **Four-week trend label.** Use a Theil–Sen slope over valid post-run-in sessions from the last 28 days.
  - Shown only with at least 8 sessions spanning at least 21 days.
  - Called rising or falling only if |slope × 28 days| ≥ σ_w; otherwise "steady" [DC].
- **Learning-phase band.** Shown from session 1 until the run-in is complete and |OLS slope over the last 7 valid sessions| × 6 < σ_w [DC].
- **Practice model** (practice-prone areas; SHOULD, from 10 post-run-in sessions). Fit y(t) = B∞ + (y0 − B∞)·e^(−ct) on session index t (Woelfle 2021), and show "estimated plateau ≈ B∞" when the fit converges with c > 0. Display only: within one person the curve cannot separate practice from real change, so it never alters a verdict.
- **Transfer check** (later). Periodically give an untrained alternate paradigm for an area, for example Stroop Squared for Attention, and show the result honestly even when it is null (Au 2015; Sala 2019a).

### 2.8 Daily state check-in

**Purpose.** Annotation and covariates, never a score. Day-to-day performance is coupled with:
- sleep (Schwarz 2025; Wild 2018)
- stress (Sliwinski 2006)
- negative affect and motivation (Brose 2012)
- time of day (Schmidt 2007)
- caffeine (McLellan 2016)
- acute exercise (Erickson 2019).

**Layout.** One screen of large segmented chips (at least 44 pt each), taking at most 25 s.

| # | Item | Wording and scale | Source and status |
|---|---|---|---|
| 1 | Sleepiness now | **Stanford Sleepiness Scale**, verbatim: 1 "Feeling active and vital; alert; wide awake." 2 "Functioning at a high level, but not at peak; able to concentrate." 3 "Relaxed; awake; not at full alertness; responsive." 4 "A little foggy; not at peak; let down." 5 "Fogginess; beginning to lose interest in remaining awake; slowed down." 6 "Sleepiness; prefer to be lying down; fighting sleep; woozy." 7 "Almost in reverie; sleep onset soon; lost struggle to remain awake." | The SSS is freely available (Shahid 2012, SSS chapter; Hoddes 1973). **The KSS (1–9) MUST NOT ship without written permission from T. Åkerstedt**, per the copyright notice in Shahid 2012, KSS chapter |
| 2 | Sleep last night | "Went to bed" and "got up" times, prefilled from the previous day, plus an optional "awake during the night" in 15-minute steps. Total sleep time TST = (wake − bed) − awake. Usual = median TST over the last 14 days. Sleep delta = TST − usual | Items in the style of the Consensus Sleep Diary (Carney 2012) |
| 3 | Sleep quality | 5 points, from very poor to very good | CSD-style; the exact CSD wording is unverified |
| 4 | Stress | "Stress means a situation in which a person feels tense, restless, nervous or anxious or is unable to sleep at night because his/her mind is troubled all the time. Do you feel this kind of stress these days?" Scale 1 (not at all) to 5 (very much); label only the two endpoints | Elo 2003 (open access); the intermediate labels are unverified |
| 5 | Caffeine since waking | none / 1 serving / 2+ servings | DC; McLellan 2016 |
| 6 | Exercise in the last hour | yes / no | DC; Erickson 2019 |
| 7 | Optional | Mood now (5 points); motivation for this session (5 points); tags for alcohol last night, illness and medication | Self-authored and unvalidated (motivated by Brose 2012) |

**Captured automatically:** local time, hours since waking, each benchmark's session index, device fingerprint, input type, standalone (installed PWA) flag, theme.

**Rules.**
- Ask once per day, before the first benchmark. Ask the SSS again if a benchmark starts more than 2 h after the last SSS answer [DC].
- A skipped item is stored as missing, never as a neutral value.
- Only sleep times are prefilled. State ratings are never prefilled [DC].
- A skipped check-in never blocks a session.

**Flags.** These are context icons; flagged sessions stay in all analytics.
- **Sleepy:** SSS ≥ 5 [DC]. If the KSS is licensed, use KSS ≥ 7; KSS above 6 is linked with impaired driving and EEG sleep intrusions (Åkerstedt 2014).
- **Short sleep:** sleep delta ≤ −1.5 h, or TST under 6 h [DC]. Typical sleep of 7–8 h was optimal in Wild 2018.
- **High stress:** Elo ≥ 4 [DC].

**Insights** (SHOULD).
- **When.** After at least 28 days and at least 20 valid post-run-in sessions in the area with the covariate recorded.
- **Model.** For each area: x = b0 + b1·sleepDelta + b2·(SSS − personal mean) + b3·(stress − personal mean) + b4·log(session index) + b5·time of day, plus caffeine.
- **Showing a statement.** Only when the 95% CI excludes 0 and each comparison bin holds at least 10 sessions.
- **Wording.** Phrase it as an association, for example "On days after shorter sleep, your Reaction speed was lower by about …".
- **Expected size.** Small: about 0.11 fewer correct responses per hour slept below one's own average, on a 60 s DSST (Schwarz 2025).
- **Why Reaction matters.** Sleepiness ratings understate chronic sleep debt. After two weeks of 6 h nights, deficits matched up to two nights without sleep while sleepiness ratings levelled off (Van Dongen 2003). That is why Reaction serves as the objective marker.

### 2.9 Minimum data before anything is shown

| Output | Requirement |
|---|---|
| Session result (raw score plus reference index) | 1 valid session. Run-in results are labelled "Calibrating — practice is still raising your score" |
| Area level | At least 1 valid post-run-in session in the last 14 days |
| Personal baseline | R run-in sessions plus 5 valid sessions on 5 different days |
| Today vs typical | A completed baseline |
| Weekly verdict | A baseline and 1 evaluated week for "possibly"; 2 consecutive evaluated weeks for "reliably" |
| Four-week trend label | At least 8 valid post-run-in sessions spanning at least 21 days |
| Practice-model plateau | At least 10 post-run-in sessions (practice-prone areas only) |
| Reaction personal-percentile flags | At least 10 post-run-in sessions |
| Mean (level) | Every reference-graded area has at least 1 valid post-run-in session in the last 14 days |
| Mean verdict | Every included area has a baseline, plus at least 8 weekly Mean values |
| Today composite | At least 3 of the 4 state-sensitive areas completed today, each with a baseline |
| Check-in insights | At least 28 days and at least 20 sessions with the covariate; at least 10 per comparison bin; 95% CI excluding 0 |

### 2.10 Cadence

**Constraints.**
- Each area needs at least 1 valid session per 14 days to stay current, which the Mean requires.
- Weekly verdicts need at least 1 session per ISO week; 2 per week lowers the standard error.
- Keep the time-of-day window consistent (±1 h).
- Benchmarks are not training.

**Default plan** [DC].
- **Daily core** (about 3.5 min): check-in, then Reaction (state-sensitive and learning-free).
- **Rotation:** 2 further benchmarks per day, filling 14 slots a week:
  - Processing Speed, Attention, Memory, Flexibility, Calculation and Spatial come up twice a week.
  - Analysis and Precision come up once a week. Reasoning is insensitive to sleep loss (Lim & Dinges 2010), and precision is near its practice ceiling (MacKenzie 2015).
- A typical day takes about 8–9 minutes. A "quick day" is the check-in plus Reaction only.
- Run-in sessions are front-loaded at first use.

**Training** happens in the shortcut games. For training itself, a few spaced sessions a week have at least as much support as daily drilling. This comes from a between-study moderator analysis, so it is not proof (Lampit 2014).

### 2.11 What MUST be stored

**Per session (MUST).**
- Test id, area, `protocolVersion`, `scoringVersion`, `referenceVersion`, seed.
- Run type (run-in / baseline / tracking / practice) and segment id.
- Local date and time with time-zone offset; duration.
- Validity, reasons and flags.
- Raw primary and secondary metrics.
- Device fingerprint: user agent, CSS screen size, devicePixelRatio, measured frame interval, pointerType / input, standalone flag.
- Theme.
- Reference context used: age if given, platform offset, pxPerMm and s for Precision.
- Check-in id.

**Trial-level records (SHOULD).** Store them as listed in each test's spec, in compact arrays: for every session if the storage budget allows, otherwise at least for all baseline sessions and the most recent sessions of each area.

**Baselines (MUST).** The frozen baseline value, its segment metadata and the σ_w history are stored explicitly, so that capping history can never destroy a baseline.

**Birth year.** Optional. It stays on the device and is used only for the Memory and Reaction anchors.

### 2.12 Master parameter table

| Area | Primary metric (unit) | Reference μ ± σ (grade) | Retest r | σ floor | R | Practice-prone | State-sensitive | Interruption class | Default cadence |
|---|---|---|---|---|---|---|---|---|---|
| attention | net score per 90 s (points) | 40.43 ± 14.17 (C) | .74 (32 days) | 7.2 | 2 | no | yes | A | 2×/week |
| memory | MnS (items) | (6.156 − 0.022·age) ± 1.01; 5.27 if no age (C) | .84 (weekly) | 0.40 | 2 | no* | yes | B | 2×/week |
| calculation | CPM (correct/min) | 10.1 ± 4.0 (C) | .81 (1–9 days) | 1.7 | 3 | yes | unknown | A | 2×/week |
| analysis | θ (logits) | 0 ± 1, Sandia sample (C) | ≈.70 (model); MaRs-IB .71 | session SE (≈0.55) | 3 | yes | no | B | 1×/week |
| precision | TP (bits/s) | 6.39 ± 0.9 (C) | no ICC | 3% of B | 1 | no | unknown | B | 1×/week |
| reaction | S = mean 1000/RT (s⁻¹) | 1000/(213.0 + 0.55·(age − 46) + offset) ± 26.8·μ_S²/1000 (C) | > .8 (10-min PVT), .80 assumed | 0.16 (iOS) | 1 | no | strongest | A | daily |
| speed | SDS90 (correct/90 s) | 54 ± 9 (C) | .88 (single test) | 3.1 | 3 | yes | yes | A | 2×/week |
| flexibility | ln RCS (RCS in correct/s) | none (P) | .78 (14 days) | 0.05 (ln units) | 3 | yes (wording) | unknown | A | 2×/week |
| spatial | RCS (correct/min) | 20.4 ± 6 (C) | no ICC (2D intercepts .68/.51) | 5% of B | 3 | yes | unknown | B | 2×/week |
| learning (phase 2) | pc | none (P) | single .26; 24-session mean .89 | binomial SE | 2 | no | n/a | A | daily |
| verbal (phase 2) | net score per 180 s | none (P) | .80 (N = 18) | 2 | 3 | unknown | no | A | 1–2×/week |

\*Annotate gains when `simon` or `number-trail` were played recently (§2.6).

---

## 3. What training can and cannot do (copy for the app)

### 3.1 How Brain Lab works (onboarding)

> Brain Lab measures nine areas with short tests adapted from published research. The scores are for tracking yourself over time. Your first sessions on each test are calibration: you are still learning the test, so scores rise. After that, Brain Lab sets your personal baseline and tells you when a change is bigger than your normal day-to-day ups and downs.

### 3.2 Evidence panel: "What training can and can't do"

1. **Practice works, on what you practise.** Practising a task reliably makes you better at that task. (Simons 2016; Stanford 2014; Ball 2002)
2. **Similar tasks improve less.** Gains carry over partly to closely related tasks, and less than to the trained task itself. (Melby-Lervåg 2016; Sala 2019a; Gathercole 2019)
3. **No proven IQ boost.** Well-controlled studies find no reliable rise in intelligence or general reasoning from brain training. The n-back effect on fluid intelligence was g = 0.06 against active control groups. (Au 2015; Melby-Lervåg 2016; Redick 2013; Owen 2010; Sala & Gobet 2019)
4. **Little evidence for everyday life.** Gains on brain games have rarely been shown to carry over to daily performance. (Simons 2016)
5. **Dementia.** No brain game has been shown to cure or prevent dementia (Stanford 2014). One large trial of adults aged 65 and over linked one specific speed-training program to fewer dementia diagnoses 10 years later (hazard ratio 0.71, 95% CI 0.50–0.998). At 20 years the link appeared only in people who had booster sessions (0.75 with boosters, 1.01 without). It has not been shown for other games or for younger adults. (Edwards 2017; Coe 2026)
6. **Tests track; games train.** A test score that rises after weeks of practice partly reflects learning that test. (Scharfen 2018; Pham 2021; Uttal 2013; Goldberg 2015)
7. **More is not automatically better.** In older adults, home training without supervision showed little effect, and programs used more than three times a week were no more effective than once or twice a week. (Lampit 2014)
8. **Better-evidenced levers.** Physical activity, enough sleep and managing health risks such as blood pressure, hearing and vision have stronger evidence for long-term brain health than any game. Education also raises cognitive ability over years. (Erickson 2019; Wild 2018; Van Dongen 2003; Livingston 2024; Ngandu 2015, a small effect; Ritchie 2018)
9. **Daily state matters.** Your scores move with sleep, stress, time of day and caffeine. That is why Brain Lab asks a few questions first. (Lim & Dinges 2010; Schwarz 2025; Sliwinski 2006; McLellan 2016)

### 3.3 Status of each claim

| Claim | Status | Sources |
|---|---|---|
| Practising a task improves that task | Supported (strong) | Simons 2016; Stanford 2014; Ball 2002 |
| Gains on closely related tasks | Partly supported: smaller, and varies by population | Melby-Lervåg 2016; Sala 2019a |
| Far transfer to fluid intelligence or "IQ" | Not supported once active controls and bias correction are applied | Au 2015; Melby-Lervåg 2016; Sala 2019a; Sala & Gobet 2019 |
| Everyday function | Little evidence; ACTIVE's self-reported daily activities at 10 years are the exception | Simons 2016; Rebok 2014 |
| Lower dementia risk | One trial, one training arm (speed training, older adults) | Edwards 2017; Coe 2026 |

### 3.4 "What practice does here" (one line per area sheet)

- **Attention:** This test barely changes with practice, so changes mostly reflect your state that day. Attention games make you better at those games; in a meta-analysis, transfer to untrained attention tests was not significant (g = 0.24). (Burgoyne 2023; Lampit 2014)
- **Memory:** Memory games improve those games and similar memory tasks, moderately and sometimes for months, but not intelligence. Games built like this test, such as Simon and Number Trail, can raise this score through task skill. (Melby-Lervåg 2016; Gathercole 2019)
- **Calculation:** Arithmetic improves with practice, mostly on the problem types you practise. (Rickard 1994; Zamarian 2018)
- **Analysis:** Scores rise over the first sessions as you learn the rules. That is skill at this task, not rising intelligence. (Scharfen 2018; Schneider 2020; Sala & Gobet 2019)
- **Precision:** Experienced phone users are already near their ceiling, so a big jump usually means a change of posture, strategy or device. (MacKenzie 2015; Sharif 2020)
- **Reaction:** This does not improve with practice. A better score means better alertness: sleep, time of day, recovery, caffeine. (Basner 2018; Lim & Dinges 2010)
- **Processing Speed:** Scores keep rising with repetition for weeks. Speed training improves trained speed tasks the most (g = 0.31 in older adults). (Pham 2021; Woelfle 2021; Lampit 2014)
- **Flexibility:** Switching practice improves switching tasks; transfer to other abilities is small. (Karbach & Verhaeghen 2014; Kassai 2019)
- **Spatial:** One of the most trainable skills. Gains last and spread to other spatial tasks, and a little to maths. (Uttal 2013; Hawes 2022)

---

## 4. Claims policy

### 4.1 Never

- **No IQ framing.** Never use "IQ", "IQ test", "brain age", "mental age", "cognitive age", "intelligence score" or "genius" for any score, area, the Mean or the tab. Never present any number on a mean-100 / SD-15 scale.
- **No diagnosis.** Never claim to diagnose, screen for, detect or rule out any condition: dementia, Alzheimer's, mild cognitive impairment, ADHD, depression, concussion, sleep disorders or any other. Never label a result normal, abnormal, impaired, deficient, healthy or unhealthy.
- **No benefit claims.** Never claim or imply that a Brain Lab test or game:
  - raises intelligence
  - improves everyday memory or focus, or performance at work, school or sport
  - prevents, delays or reduces the risk of cognitive decline or dementia.
- **No population ranking.** No percentiles or "better than X% of people", because no grade-A norms exist.
- **No borrowed authority.** Never call our implementations "clinically validated", "the NIH test", "the SDMT", "the PVT" or similar, and never suggest endorsement by any institution.
- **No unsupported verdicts.**
  - Never attribute a change to a cause ("you are sleep-deprived").
  - Never call a change reliable unless the §2.6 rule says so.
  - Never describe an improvement in a practice-prone area without the practice qualifier.
- **No alarm.** No alarming words or colours for below-baseline results ("warning", "danger", red alerts).
- **No "Brain score" label for the Mean.** Do not call the Mean "Brain score", "Brain Index" or "Brain health score".

### 4.2 Always

- **Disclaimer**, verbatim, on first opening Brain Lab and on its about page:
  > "This is a self-tracking tool, not a medical device. It does not diagnose any condition, and its scores are not IQ scores. Scores depend on your device, time of day, sleep and practice. If you are concerned about your memory or thinking in daily life, talk to a health professional."
- **On every benchmark page:** name the paradigm and its source, plus: "Our implementation of this paradigm — not the original test; scores aren't interchangeable with published ones."
- **On every reference index:** a grade badge, "approximate" for grade C, and a tooltip naming the anchor sample. Example: "Anchor: 290 adults aged 18–35 tested on desktop computers (Burgoyne et al. 2023)."
- **Honest subtitles for areas:**
  - Attention: "Attention control"
  - Memory: "Working memory (spatial)"
  - Calculation: "Arithmetic fluency"
  - Analysis: "Pattern reasoning"
  - Precision: "Touch-aiming precision"
  - Reaction: "Alertness"
  - Processing Speed: "Processing speed"
  - Flexibility: "Rule switching"
  - Spatial: "Mental rotation"
- **The Mean** is labelled "Mean — average of N areas".
- **Training cards** read: "Practice for <skill>. Improves this game and similar tasks; little evidence of wider effects."

### 4.3 Phrasing

| Avoid | Use instead |
|---|---|
| "Your IQ is 124" / "brain age 27" | "Processing Speed: 58 (reference scale, approximate)" |
| "Train your brain to get smarter" | "Practising these tasks improves them; research shows limited transfer to untrained abilities" |
| "Prevents dementia" / "boosts memory in daily life" | "Physical activity, sleep and managing blood pressure, hearing and vision have the best evidence for long-term brain health" |
| "Your attention declined" | "This area has been reliably below your baseline for two weeks. Sleep, illness, stress or a device change are common causes" |
| "Better than 80% of people" | Omit (no grade-A norms) |
| "You're tired today" | "Below your typical range today" |

### 4.4 Messages by situation

- **Calibrating:** "Calibrating — your first sessions teach you the test, so scores usually rise. Your baseline starts after session N."
- **Today below the typical range:** "Below your typical range today. Short sleep, fatigue, stress, caffeine timing and distractions commonly cause day-to-day dips." Add the day's check-in context if present.
- **Reliable decline** (only after the §2.6 verdict, never from a single day): "This area has been below your baseline for two weeks. Common reasons include short sleep, illness, stress, a different time of day, distractions, or a change of device. If you notice persistent problems with memory or thinking in daily life, consider talking to a health professional."
- **Reliable improvement** in a non-practice-prone area: "Reliably above your baseline on this test for two weeks."
- **Reliable improvement** in a practice-prone area: the same, plus "Part of this is practice on the test itself."
- **Insights:** phrase as associations, never causes.
- **ACTIVE dementia findings:** only in the evidence panel (§3.2, item 5), with their uncertainty. Never on game cards, results or notifications.

### 4.5 Basis for this policy

- **FTC (2016).** Lumos Labs paid $2 million over unsupported claims about everyday performance, age-related decline and dementia, and future claims require "competent and reliable scientific evidence" (FTC 2016).
- **FDA General Wellness guidance (2026).** It treats claims to improve mental acuity, concentration or problem-solving as low-risk general wellness, and diagnosis or treatment claims as outside that category (FDA 2026). FTC substantiation still applies, so the app makes no efficacy claim beyond "practice improves the practised task".
- **Professional standards.** Computerised tests are held to the same standards as examiner-administered tests (Bauer 2012).
- **Scientific consensus** (Stanford 2014).
- **Why "IQ" is ruled out.** An IQ is a deviation score from a standardised, normed battery. These tests are self-administered, unproctored and device-dependent, and they have no representative norms.

---

## 5. References

Access tags record how the research reports consulted each source: **[FT]** full text; **[AB]** abstract or summary; **[SEC]** through a secondary source; **[NR]** original not re-read (bibliographic only; no DOI given in the reports).

- **Åkerstedt 2014.** Åkerstedt T, Anund A, Axelsson J, Kecklund G. Subjective sleepiness is a sensitive indicator of insufficient sleep and impaired waking function. *J Sleep Res* 23(3):242–254. doi:10.1111/jsr.12158 [AB]
- **Antler 2022.** Antler CA, Yamazaki EM, Casale CE, Brieva TE, Goel N. The 3-minute PVT demonstrates inadequate convergent validity relative to the 10-minute PVT. *Front Neurosci* 16:815697. doi:10.3389/fnins.2022.815697 [FT]
- **Arendasy 2013.** Arendasy ME, Sommer M. Reducing response elimination strategies enhances the construct validity of figural matrices. *Intelligence* 41(4):234–243. doi:10.1016/j.intell.2013.03.006 [AB]
- **Arsintescu 2017.** Arsintescu L, Mulligan JB, Flynn-Evans EE. Evaluation of a psychomotor vigilance task for touch screen devices. *Human Factors* 59(4):661–670 (no DOI in the reports) [AB]. NASA NTRS slides: https://ntrs.nasa.gov/api/citations/20170009855/downloads/20170009855.pdf [FT]
- **Atarashi 2024.** Atarashi Y, Takeyama Y, Akata M, Shizuki B. Test-retest reliability in 2D target pointing over five consecutive days. OzCHI 2024 LBW. https://outbox.eait.uq.edu.au/uqsville/OzCHI2024/ [AB]
- **Au 2015.** Au J, Sheehan E, Tsai N, Duncan GJ, Buschkuehl M, Jaeggi SM. Improving fluid intelligence with training on working memory: a meta-analysis. *Psychon Bull Rev* 22(2):366–377. doi:10.3758/s13423-014-0699-x [FT]
- **Baddeley 1968.** Baddeley AD. A 3 min reasoning test based on grammatical transformation. *Psychon Sci* 10(10):341–342. https://typeset.io/pdf/a-3-min-reasoning-test-based-on-grammatical-transformation-5gsjegi5el.pdf [SEC]. Implementation: Millisecond Inquisit 7 manual, https://www.millisecond.com/library/v7/baddeley/baddeley/baddeley.manual [FT]
- **Baddeley re-evaluation 1973.** The three-minute reasoning test: a re-evaluation. https://scilit.com/publications/9bfbce363b7fab951f1e99e55c8bb8f8 [AB]
- **Baddeley validity 1971.** The validity of a simplified version of Baddeley's three-minute reasoning test. https://scilit.com/publications/22f3067dbb95358ea40d96118bd825e5 [AB]
- **Ball 2002.** Ball K, Berch DB, Helmers KF, et al. Effects of cognitive training interventions with older adults (ACTIVE). *JAMA* 288(18):2271–2281. doi:10.1001/jama.288.18.2271 [FT]
- **Bartels 2010.** Bartels C, Wegrzyn M, Wiedl A, Ackermann V, Ehrenreich H. Practice effects in healthy adults: a longitudinal study on frequent repetitive cognitive testing. *BMC Neurosci* 11:118. doi:10.1186/1471-2202-11-118 [FT]
- **Basner & Dinges 2011.** Basner M, Dinges DF. Maximizing sensitivity of the PVT to sleep loss. *Sleep* 34(5):581–591. doi:10.1093/sleep/34.5.581 [FT]
- **Basner, Mollicone & Dinges 2011.** Validity and sensitivity of a brief psychomotor vigilance test (PVT-B) to total and partial sleep deprivation. *Acta Astronautica* 69:949–959. doi:10.1016/j.actaastro.2011.07.015 [FT]
- **Basner 2018.** Basner M, Hermosillo E, Nasrini J, et al. Repeated administration effects on PVT performance. *Sleep* 41(1):zsx187. doi:10.1093/sleep/zsx187 [AB]
- **Bauer 2012.** Bauer RM, et al. Computerized neuropsychological assessment devices: joint position paper of the AACN and NAN. *Arch Clin Neuropsychol* 27(3):362–373. doi:10.1093/arclin/acs027 [AB]
- **Bauer & Jolicoeur 1996.** Bauer B, Jolicoeur P. Stimulus dimensionality effects in mental rotation. *JEP:HPP*. https://data.zhenzhi.com/details/1/875213764 [AB]
- **Becker 2016.** Becker N, et al. Preventing response elimination strategies improves the convergent validity of figural matrices. *J Intell* 4(1):2. doi:10.3390/jintelligence4010002 [AB]
- **Benedict 2017.** Benedict RHB, DeLuca J, Phillips G, et al. (MSOAC). Validity of the SDMT as a cognition performance outcome measure for MS. *Mult Scler* 23(5):721–733. doi:10.1177/1352458517690821 [AB]
- **Bi 2013.** Bi X, Li Y, Zhai S. FFitts law: modeling finger touch with Fitts' law. *CHI 2013*:1363–1372. https://research.google/pubs/pub41645/ [FT]
- **Brose 2012.** Brose A, Schmiedek F, Lövdén M, Lindenberger U. Daily variability in working memory is coupled with negative affect. *Emotion* 12(3):605–617. doi:10.1037/a0024436 [AB]
- **Brunetti 2014.** Brunetti R, Del Gatto C, Delogu F. eCorsi: implementation and testing of the Corsi block-tapping task for digital tablets. *Front Psychol* 5:939. doi:10.3389/fpsyg.2014.00939 [FT]
- **Brysbaert 2016.** Brysbaert M, Stevens M, Mandera P, Keuleers E. How many words do we know? *Front Psychol* 7:1116. doi:10.3389/fpsyg.2016.01116 [FT]
- **Burgoyne 2023.** Burgoyne AP, Tsukahara JS, Mashburn CA, Pak R, Engle RW. Nature and measurement of attention control. *J Exp Psychol Gen* 152(8):2369–2402. doi:10.1037/xge0001408 [FT]
- **Cambridge Cognition PAL page.** Paired Associates Learning (product page). https://cambridgecognition.com/paired-associates-learning-pal/ [FT]
- **Carlozzi 2014.** Carlozzi NE, Tulsky DS, Chiaravalloti ND, et al. NIHTB Pattern Comparison Processing Speed Test. *JINS* 20:630–641. doi:10.1017/S1355617714000319 [AB]
- **Carlozzi 2015.** Carlozzi NE, Beaumont JL, Tulsky DS, Gershon RC. The NIH Toolbox Pattern Comparison Processing Speed Test: normative data. *Arch Clin Neuropsychol*. https://pmc.ncbi.nlm.nih.gov/articles/PMC4542749 [AB]
- **Carney 2012.** Carney CE, et al. The Consensus Sleep Diary. *Sleep* 35(2):287–302. doi:10.5665/sleep.1642 [AB]
- **Carpenter 1990.** Carpenter PA, Just MA, Shell P. What one intelligence test measures. *Psychol Rev* 97(3):404–431. doi:10.1037/0033-295x.97.3.404 [SEC, via Yang & Kunda 2023]
- **Chen & Li 2014.** Meta-analysis of non-symbolic number acuity and maths (36 samples, N = 4,705). Consulted via summaries; listing near https://pubmed.ncbi.nlm.nih.gov/24583622 [SEC]
- **CHC Wikipedia.** Cattell–Horn–Carroll theory. https://en.wikipedia.org/wiki/Cattell%E2%80%93Horn%E2%80%93Carroll_theory [SEC]
- **Chierchia 2019.** Chierchia G, Fuhrmann D, Knoll LJ, et al. The matrix
reasoning item bank (MaRs-IB): novel, open-access abstract reasoning items for adolescents and adults. *R Soc Open Sci* 6(10):190232. doi:10.1098/rsos.190232 [FT]
- **Codding 2011.** Codding RS, Burns MK, Lukito G. Meta-analysis of mathematic basic-fact fluency interventions: a component analysis. *Learn Disabil Res Pract* 26:36–47 (no DOI in reports) [AB]
- **Coe 2026.** Coe et al. [ACTIVE 20-year Medicare-claims follow-up: speed training and diagnosed dementia.] *Alzheimer's Dement TRCI* 12(1):e70197. doi:10.1002/trc2.70197 [AB]
- **Collie 2003.** Collie A, et al. Effects of practice on the cognitive test performance of neurologically normal individuals assessed at brief test–retest intervals. *JINS*. https://cambridge.org/core/journals/journal-of-the-international-neuropsychological-society/article/effects-of-practice-on-the-cognitive-test-performance-of-neurologically-normal-individuals-assessed-at-brief-testretest-intervals/FD484F69952815B38B361EA72E7EB556 [AB]
- **Condon 2014.** Condon DM, Revelle W. The International Cognitive Ability Resource: development and initial validation of a public-domain measure. *Intelligence* 43:52–64. doi:10.1016/j.intell.2014.01.004 [FT]
- **Dai 2019.** Dai M, Li Y, Gan S, Du F. The reliability of estimating visual working memory capacity. *Sci Rep* 9:1155. doi:10.1038/s41598-019-39044-1 [FT]
- **Deary 2011.** Deary IJ, Liewald D, Nissan J. A free, easy-to-use, computer-based simple and four-choice reaction time programme: the Deary–Liewald reaction time task. *Behav Res Methods* 43:258–268. doi:10.3758/s13428-010-0024-1 [FT]
- **Devanand 2022.** Devanand DP, et al. Computerized games versus crosswords training in mild cognitive impairment. *NEJM Evidence* (via press release: https://www.sciencedaily.com/releases/2022/10/221027093305.htm) [SEC]
- **Draheim 2016.** Draheim C, Hicks KL, Engle RW. Combining reaction time and accuracy: the relationship between working memory capacity and task switching as a case example. *Perspect Psychol Sci*. doi:10.1177/1745691615596990 [AB]
- **Draheim 2019.** Draheim C, Mashburn CA, Martin JD, Engle RW. Reaction time in differential and developmental research. *Psychol Bull*. doi:10.1037/bul0000192 [AB]
- **Draheim 2021.** Draheim C, Tsukahara JS, Martin JD, Mashburn CA, Engle RW. A toolbox approach to improving the measurement of attention control. *J Exp Psychol Gen* 150(2):242–275. https://englelab.gatech.edu/articles/2021/Draheim%20et%20al.%20(2021)%20toolbox.pdf [AB]
- **Dye 2009.** Dye MWG, Green CS, Bavelier D. Increasing speed of processing with action video games. *Curr Dir Psychol Sci* 18(6):321–326. doi:10.1111/j.1467-8721.2009.01660.x [FT]
- **Edwards 2017.** Edwards JD, Xu H, Clark DO, Guey LT, Ross LA, Unverzagt FW. Speed of processing training results in lower risk of dementia. *Alzheimer's Dement TRCI* 3(4):603–611. doi:10.1016/j.trci.2017.09.002 [AB]
- **Elo 2003.** Elo AL, Leppänen A, Jahkola A. Validity of a single-item measure of stress symptoms. *Scand J Work Environ Health* 29(6):444–451. doi:10.5271/sjweh.752 [FT]
- **Embretson 1998.** Embretson SE. A cognitive design system approach to generating valid tests: application to abstract reasoning. *Psychol Methods* 3:380–396 (no DOI in reports) [AB]
- **Erickson 2019.** Erickson KI, et al. [2018 Physical Activity Guidelines Advisory Committee review of physical activity and cognition.] *Med Sci Sports Exerc* 51(6):1242–1251. https://pubmed.ncbi.nlm.nih.gov/31095081/ [AB]
- **Facchin 2024.** Facchin A, Pegoraro S, Rigoli M, et al. Regression-based normative data for Corsi span and supraspan learning and recall among Italian adults. *Neurol Sci* 45(12):5707–5718. doi:10.1007/s10072-024-07756-6 [FT]
- **Falleti 2006.** Falleti MG, et al. [Practice effects on the Cogstate battery at brief and 1-month intervals.] *J Clin Exp Neuropsychol*. doi:10.1080/13803390500205718 [AB]
- **Fan 2002.** Fan J, McCandliss BD, Sommer T, Raz A, Posner MI. Testing the efficiency and independence of attentional networks. *J Cogn Neurosci* 14(3):340–347. doi:10.1162/089892902317361886 [AB]
- **FDA 2026.** US Food and Drug Administration. General Wellness: Policy for Low Risk Devices (guidance issued 6 Jan 2026). https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices [FT]
- **FTC 2016.** Federal Trade Commission. Lumosity to pay $2 million to settle FTC deceptive advertising charges (5 Jan 2016). https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program (the FTC site refuses automated link checks; the older URL now returns 404) [FT]
- **Ganis & Kievit 2015.** Ganis G, Kievit R. A new set of three-dimensional shapes for investigating mental rotation processes: validation data and stimulus set. *J Open Psychol Data* 3(1):e3. doi:10.5334/jopd.ai [FT]
- **Gathercole 2019.** Gathercole SE, Dunning DL, Holmes J, Norris D. Working memory training involves learning new skills. *J Mem Lang* 105:19–42. doi:10.1016/j.jml.2018.10.003 [FT]
- **Gliksman 2022a.** Gliksman Y, Berebbi S, Henik A. Math fluency during primary school. *Brain Sci* 12(3):371. https://pmc.ncbi.nlm.nih.gov/articles/PMC8945962 [FT]
- **Gliksman 2022b.** Gliksman Y, Berebbi S, Hershman R, Henik A. BGU-MF: Ben-Gurion University Math Fluency test. *Appl Cogn Psychol*. https://cris.bgu.ac.il/en/publications/bgu-mf-ben-gurion-university-math-fluency-test/ [AB]
- **Goldberg 2015.** Goldberg TE, et al. [Practice effects in serial cognitive assessment and methods to control them.] *Alzheimer's Dement DADM* 1(1):103–111. doi:10.1016/j.dadm.2014.11.003 [FT]
- **Grant 2017.** Grant DA, Honn KA, Layton ME, Riedy SM, Van Dongen HPA. 3-minute smartphone-based and tablet-based psychomotor vigilance tests for the assessment of reduced alertness due to sleep deprivation. *Behav Res Methods* 49:1020–1029. doi:10.3758/s13428-016-0763-8 [FT]
- **Graves 2023.** Graves JS, Elantkowski M, Zhang YP, et al. Assessment of upper extremity function in multiple sclerosis: feasibility of a digital pinching test. *JMIR Form Res* 7:e46521. doi:10.2196/46521 [FT]
- **Halberda 2012.** Halberda J, Ly R, Wilmer JB, Naiman DQ, Germine L. Number sense across the lifespan as revealed by a massive Internet-based sample. *PNAS* 109(28):11116–11120. doi:10.1073/pnas.1200196109 [FT]
- **Hampshire 2012.** Hampshire A, Highfield RR, Parkin BL, Owen AM. Fractionating human intelligence. *Neuron* 76(6):1225–1237. doi:10.1016/j.neuron.2012.06.022 [AB]
- **Han 2025.** Han YC, Nowinski CJ, Dworak EM, et al. Cross validation of novel secondary executive functioning scores in the Mobile Toolbox for monitoring cognitive change. *Alzheimer's Dement* 21(Suppl 3):e099517. doi:10.1002/alz70857_099517 [AB]
- **Hawes 2022.** Hawes ZCK, Gilligan-Lee KA, Mix KS. Effects of spatial training on mathematics performance: a meta-analysis. *Dev Psychol* 58(1):112–137. doi:10.1037/dev0001281 [AB]
- **Hedge 2018.** Hedge C, Powell G, Sumner P. The reliability paradox: why robust cognitive tasks do not produce reliable individual differences. *Behav Res Methods* 50(3):1166–1186. doi:10.3758/s13428-017-0935-1 [FT]
- **Heil 1998.** Heil M, Rösler F, Link M, Bajric J. What is improved if a mental rotation task is repeated — the efficiency of memory access, or the speed of a transformation routine? *Psychol Res* 61:99–108 [SEC]
- **Hirschfeld 2013.** Hirschfeld G, Thielsch MT, Zernikow B. Reliabilities of mental rotation tasks: limits to the assessment of individual differences. *BioMed Res Int* 2013:340568. doi:10.1155/2013/340568 [FT]
- **Hoddes 1973.** Hoddes E, Zarcone V, Smythe H, Phillips R, Dement WC. Quantification of sleepiness: a new approach. *Psychophysiology* 10:431–436 [SEC]
- **Hoyer 2004.** Hoyer WJ, Stawski RS, Wasylyshyn C, Verhaeghen P. Adult age and digit symbol substitution performance: a meta-analysis. *Psychol Aging* 19(1):211–214. doi:10.1037/0882-7974.19.1.211 [AB]
- **Hu 2021.** Hu S, Ma Y, Liu X, Wei Y, Bai S. Stratified rule-aware network for abstract visual reasoning (I-RAVEN). *AAAI 2021*. arXiv:2002.06838 [FT]
- **Hughes 2014.** Hughes MM, Linck JA, Bowles AR, Koeth JT, Bunting MF. Alternatives to switch-cost scoring in the task-switching paradigm: their reliability and increased validity. *Behav Res Methods* 46(3):702–721. doi:10.3758/s13428-013-0411-5 [AB]
- **ICAR licence.** International Cognitive Ability Resource: project page and Scientific Use License terms, TU Dortmund. https://sms.statistik.tu-dortmund.de/en/research/projects/completed-research-projects/international-cognitive-ability-resource-icar/ ; doi:10.23668/psycharchives.22167 [FT] — page no longer available (HTTP 404 on 2026-10-31); ICAR items are not used by any MVP benchmark.
- **Inglis 2014.** Inglis M, Gilmore C. Indexing the approximate number system. *Acta Psychol* 145(1):147–155. https://dspace.lboro.ac.uk/2134/14033 [AB]
- **ISO/IEC 7810.** ID-1 card format, 85.60 × 53.98 mm. https://en.wikipedia.org/wiki/ISO/IEC_7810 [SEC]
- **Jacobson & Truax 1991.** Jacobson NS, Truax P. [Reliable Change Index and clinical significance.] *J Consult Clin Psychol* 59(1):12–19. https://pubmed.ncbi.nlm.nih.gov/2002127/ [AB]
- **Jaeger 2018.** Jaeger J. Digit Symbol Substitution Test: the case for sensitivity over specificity in neuropsychological testing. *J Clin Psychopharmacol*. https://pmc.ncbi.nlm.nih.gov/articles/PMC6291255 [FT]
- **Kane 2007.** Kane MJ, Conway ARA, Miura TK, Colflesh GJH. Working memory, attention control, and the n-back task: a question of construct validity. *JEP:LMC* 33(3):615–622. doi:10.1037/0278-7393.33.3.615 [FT]
- **Karbach & Verhaeghen 2014.** Karbach J, Verhaeghen P. Making working memory work: a meta-analysis of executive-control and working memory training in older adults. *Psychol Sci* 25(11):2027–2037. doi:10.1177/0956797614548725 [FT]
- **Kassai 2019.** Kassai R, Futo J, Demetrovics Z, Takacs ZK. A meta-analysis of the experimental evidence on the near- and far-transfer effects among children's executive function skills. *Psychol Bull* 145(2):165–188. doi:10.1037/bul0000180 [AB]
- **Kiely 2014.** Kiely KM, Butterworth P, Watson N, Wooden M. The Symbol Digit Modalities Test: normative data from a large nationally representative sample of Australians. *Arch Clin Neuropsychol* 29:767–775. https://pubmed.ncbi.nlm.nih.gov/25352087/ [AB]
- **Kim 2025.** Kim SH, Hakun JG, Li Y, et al. Optimizing the Color Shapes task for ambulatory assessment and drift diffusion modeling. *JMIR Form Res* 9:e66300. doi:10.2196/66300 [FT]
- **Lam 2022.** Lam KH, van Oirschot P, den Teuling B, et al. Reliability, construct and concurrent validity of a smartphone-based cognition test in multiple sclerosis. *Mult Scler* 28(2):300–308. doi:10.1177/13524585211018103 [FT]
- **Lampit 2014.** Lampit A, Hallock H, Valenzuela M. Computerized cognitive training in cognitively healthy older adults: a systematic review and meta-analysis of effect modifiers. *PLoS Med* 11(11):e1001756. doi:10.1371/journal.pmed.1001756 [FT]
- **Lemhöfer 2012.** Lemhöfer K, Broersma M. Introducing LexTALE: a quick and valid Lexical Test for Advanced Learners of English. *Behav Res Methods* 44:325–343. https://forms.mpi.nl/node/44908 [AB]
- **Lescht 2022.** Lescht E, Dickey MW, Stockbridge MD, Ratner NB. Adults who stutter show diminished word fluency, regardless of mode. *JSLHR* 65(3):906–922. doi:10.1044/2021_JSLHR-21-00344 [FT]
- **Liesefeld 2019.** Liesefeld HR, Janczyk M. Combining speed and accuracy to control for speed-accuracy trade-offs(?). *Behav Res Methods* 51:40–60. doi:10.3758/s13428-018-1076-x [AB]
- **Lim & Dinges 2010.** Lim J, Dinges DF. A meta-analysis of the impact of short-term sleep deprivation on cognitive variables. *Psychol Bull* 136(3):375–389. doi:10.1037/a0018883 [FT]
- **Livingston 2024.** Livingston G, et al. Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission. *The Lancet*. doi:10.1016/s0140-6736(24)01296-0 [AB]
- **Loenneker 2025.** Loenneker HD, Cipora K, Artemenko C, et al. Math4Speed: a freely available measure of arithmetic fluency. *Can J Exp Psychol* 79(2):212–220. doi:10.1037/cep0000347. Materials and norms: https://osf.io/ze8gh/ [FT]
- **Luck 1997.** Luck SJ, Vogel EK. The capacity of visual working memory for features and conjunctions. *Nature* 390:279–281. doi:10.1038/36846 [AB]
- **MacKenzie 2015.** MacKenzie IS. Fitts' throughput and the remarkable case of touch-based target selection. *HCII 2015, LNCS* 9170:238–249. https://www.yorku.ca/mack/hcii2015a.html [FT]
- **MacKenzie & Isokoski 2008.** MacKenzie IS, Isokoski P. Fitts' throughput and the speed-accuracy tradeoff. *CHI 2008*:1633–1636. https://www.yorku.ca/mack/chi2008-p1633.pdf [AB]
- **MacLeod 2010.** MacLeod JW, Lawrence MA, McConnell MM, et al. Appraising the ANT: psychometric and theoretical considerations of the Attention Network Test. *Neuropsychology* 24(5):637–651. doi:10.1037/a0019803 [AB]
- **Maruff 2013.** Maruff P, et al. [Cogstate Brief Battery in MCI/AD: composites and their reliability.] *BMC Psychology* 1:30. doi:10.1186/2050-7283-1-30 [AB]
- **Matzen 2010.** Matzen LE, Benz ZO, Dixon KR, et al. Recreating Raven's: software for systematically generating large numbers of Raven-like matrix problems with normed properties. *Behav Res Methods* 42(2):525–541. doi:10.3758/BRM.42.2.525 [AB]. Norming data: https://github.com/sandialabs/Matrices [FT]
- **McGuckian 2024.** McGuckian TB, et al. Portable touchscreen assessment of motor skill: a registered report of the reliability and validity of EDNA MoTap. *Assessment*. doi:10.1177/10731911241266306 [FT]
- **McLellan 2016.** McLellan TM, Caldwell JA, Lieberman HR. [Review of caffeine's effects on cognitive and physical performance.] *Neurosci Biobehav Rev* 71:294–312. https://pubmed.ncbi.nlm.nih.gov/27612937/ [AB]
- **Melby-Lervåg 2016.** Melby-Lervåg M, Redick TS, Hulme C. Working memory training does not improve performance on measures of intelligence or other measures of "far transfer". *Perspect Psychol Sci* 11(4):512–534. doi:10.1177/1745691616635612 [FT]
- **Meyerhoff 2021.** Meyerhoff HS, Grinschgl S, Papenmeier F, Gilbert SJ. Individual differences in cognitive offloading. *Cogn Res Princ Implic* 6:34. doi:10.1186/s41235-021-00298-x [FT]
- **Monsell 2003.** Monsell S. Task switching. *Trends Cogn Sci* 7(3):134–140. doi:10.1016/S1364-6613(03)00028-7 [AB]
- **Ngandu 2015.** Ngandu T, et al. [FINGER two-year multidomain intervention trial.] *Lancet*. https://pubmed.ncbi.nlm.nih.gov/25771249/ [AB]
- **Nicosia 2023a.** Nicosia J, Aschenbrenner AJ, Balota DA, et al. Unsupervised high-frequency smartphone-based cognitive assessments are reliable, valid, and feasible in older adults at risk for Alzheimer's disease. *JINS* 29(5):459–471. doi:10.1017/S135561772200042X [AB]
- **Nicosia 2023b.** Nicosia J, et al. [Device latency in bring-your-own-device smartphone cognitive testing, 26 phones.] *Behav Res Methods* 55(6):2800–2812. doi:10.3758/s13428-022-01925-1 [AB]
- **Novack 2024.** Novack MA, Young SR, Dworak EM, et al. Mobile Toolbox (MTB) remote measures of executive function and processing speed: development and validation. *JINS* 30(7):680–688. doi:10.1017/S1355617724000225 [FT]
- **Owen 2010.** Owen AM, Hampshire A, Grahn JA, et al. Putting brain training to the test. *Nature* 465:775–778. doi:10.1038/nature09042 [AB]
- **Paap & Sawi 2016.** Paap KR, Sawi O. The role of test-retest reliability in measuring individual and group differences in executive functioning. *J Neurosci Methods* 274:81–93. doi:10.1016/j.jneumeth.2016.10.002 [AB]
- **Pallentin 2023.** Pallentin VS, Danner D, Rummel J. Construction and validation of the HeiQ: an operation-oriented figural matrices test. *J Intell* 11(4):73. doi:10.3390/jintelligence11040073 [FT]
- **Passell 2021.** Passell E, Strong RW, Rutter LA, et al. Cognitive test scores vary with choice of personal digital device. *Behav Res Methods* 53(6):2544–2557. doi:10.3758/s13428-021-01597-3 [FT]
- **Peters 1995.** Peters M, Laeng B, Latham K, et al. A redrawn Vandenberg and Kuse mental rotations test: different versions and factors that affect performance. *Brain Cogn* 28:39–58. https://www.spatiallearning.org/tools/vandenberg-kuse-mental-rotation-test-redrawn-version [AB]
- **Pham 2021.** Pham L, et al. Smartphone-based symbol-digit modalities test reliably captures brain damage in multiple sclerosis. *npj Digit Med*. doi:10.1038/s41746-021-00401-y [FT]
- **Pronk 2020.** Pronk T, Wiers RW, Molenkamp B, Murre J. Mental chronometry in the pocket? Timing accuracy of web applications on touchscreen and keyboard devices. *Behav Res Methods* 52(3):1371–1382. doi:10.3758/s13428-019-01321-2 [FT]
- **Pylyshyn 1988.** Pylyshyn ZW, Storm RW. Tracking multiple independent targets. *Spatial Vision* 3:179–197 [NR]
- **Rao 2017.** Rao SM, et al. Processing Speed Test: validation of a self-administered, iPad-based tool for screening cognitive dysfunction in a clinic setting. *Mult Scler* 23:1929–1937. doi:10.1177/1352458516688955 [AB]
- **Rebok 2014.** Rebok GW, et al. [ACTIVE 10-year follow-up of cognitive training effects.] *J Am Geriatr Soc* 62(1):16–24. doi:10.1111/jgs.12607 [AB]
- **Redick 2013.** Redick TS, Shipstead Z, Harrison TL, et al. No evidence of intelligence improvement after working memory training: a randomized, placebo-controlled study. *J Exp Psychol Gen* 142(2):359–379. doi:10.1037/a0029082 [AB]
- **Rickard 1994.** Rickard TC, Healy AF, Bourne LE Jr. On the cognitive structure of basic arithmetic skills: operation, order, and symbol transfer effects. *JEP:LMC* 20:1139–1153 (no DOI in reports) [AB]
- **Ritchie 2018.** Ritchie SJ, Tucker-Drob EM. How much does education improve intelligence? A meta-analysis. *Psychol Sci*. https://pmc.ncbi.nlm.nih.gov/articles/PMC6088505 [AB]
- **Robertson 1997.** Robertson IH, Manly T, Andrade J, Baddeley BT, Yiend J. "Oops!": performance correlates of everyday attentional failures. *Neuropsychologia* 35:747–758 [NR]
- **Rotation review 2010.** Mental-rotation review with neutral and emotional MRT experiments (authors not extracted). https://journals.pan.pl//Content/107610/PDF/40.pdf [SEC]
- **Ruff 1993.** Ruff RM, Parker SB. Gender- and age-specific changes in motor speed and eye-hand coordination in adults. *Percept Mot Skills* 76:1219–1230. doi:10.2466/pms.1993.76.3c.1219 [AB]
- **Sachdev 2014.** Sachdev PS, Blacker D, Blazer DG, et al. Classifying neurocognitive disorders: the DSM-5 approach. *Nat Rev Neurol* 10(11):634–642. doi:10.1038/nrneurol.2014.181 [FT]
- **Sala 2019a.** Sala G, et al. Near and far transfer in cognitive training: a second-order meta-analysis. *Collabra: Psychology* 5(1):18. doi:10.1525/collabra.203 [AB]
- **Sala & Gobet 2019.** Sala G, Gobet F. Cognitive training does not enhance general cognition. *Trends Cogn Sci* 23(1):9–20. doi:10.1016/j.tics.2018.10.004 [AB]
- **Scharfen 2018.** Scharfen J, Peters JM, Holling H. Retest effects in cognitive ability tests: a meta-analysis. *Intelligence* 67:44–66. doi:10.1016/j.intell.2018.01.003 [AB]
- **Schmidt 2007.** Schmidt C, et al. [Review of time-of-day and chronotype effects on cognition.] *Cogn Neuropsychol* 24(7):755–789. doi:10.1080/02643290701754158 [AB]
- **Schmiedek 2013.** Schmiedek F, Lövdén M, Lindenberger U. [Day-to-day variability in cognitive performance over 100 daily sessions.] *Psychol Sci* 24(9):1747–1754. https://pubmed.ncbi.nlm.nih.gov/23842960/ [AB]
- **Schneider 2020.** Schneider B, Becker N, Krieger F, Spinath FM, Sparfeldt JR. Teaching the underlying rules of figural matrices in a short video increases test scores. *Intelligence* 82. https://orbilu.uni.lu/handle/10993/44068 [AB]
- **Schneider & McGrew 2018.** Schneider WJ, McGrew KS. The Cattell–Horn–Carroll theory of cognitive abilities. In *Contemporary Intellectual Assessment*, 4th ed., 73–163 (via secondary summaries, e.g. https://www.Gwern.net/doc/iq/2020-caemmerer.pdf) [SEC]
- **Schuch 2022.** Schuch S, Philipp AM, Maulitz L, Koch I. On the reliability of behavioral measures of cognitive control. *Psychol Res* 86:2158–2184. doi:10.1007/s00426-021-01627-x [FT]
- **Schwarz 2025.** Schwarz J, Freidle M, van Leeuwen W, et al. Daily fluctuations in sleep duration and quality affect next-day processing speed performance in young and older adults. *Sleep* 49(1):zsaf321. doi:10.1093/sleep/zsaf321 [FT]
- **Shahid 2012, KSS chapter.** Shahid A, Wilkinson K, Marcu S, Shapiro CM (eds). *STOP, THAT and One Hundred Other Sleep Scales*, Karolinska Sleepiness Scale chapter. doi:10.1007/978-1-4419-9893-4_47 [FT]
- **Shahid 2012, SSS chapter.** Same volume, Stanford Sleepiness Scale chapter. doi:10.1007/978-1-4419-9893-4_91 [FT]
- **Sharif 2020.** Sharif A, Pao V, Reinecke K, Wobbrock JO. The reliability of Fitts's law as a movement model for people with and without limited fine motor function. *ASSETS 2020*. doi:10.1145/3373625.3416999 [FT]
- **Shepard & Metzler 1971.** Shepard RN, Metzler J. Mental rotation of three-dimensional objects. *Science* 171:701–703 (via https://plato.stanford.edu/archives/spr2012/entries/mental-imagery/mental-rotation.html) [SEC]
- **Siddi 2020.** Siddi S, Preti A, Lara E, et al. Comparison of the touch-screen and traditional versions of the Corsi block-tapping test in patients with psychosis and healthy controls. *BMC Psychiatry* 20:329. doi:10.1186/s12888-020-02716-8 [FT]
- **Simons 2016.** Simons DJ, Boot WR, Charness N, et al. Do "brain-training" programs work? *Psychol Sci Public Interest* 17(3):103–186. doi:10.1177/1529100616661983 [AB]
- **Sims & Mayer 2002.** Sims VK, Mayer RE. Domain specificity of spatial expertise: the case of video game players. *Appl Cogn Psychol* 16(1):97–115. https://www.cdgr.ucsb.edu/node/895 [AB]
- **Sliwinski 2006.** Sliwinski MJ, Smyth JM, Hofer SM, Stawski RS. Intraindividual coupling of daily stress and cognition. *Psychol Aging* 21(3):545–557. doi:10.1037/0882-7974.21.3.545 [FT]
- **Sliwinski 2018.** Sliwinski MJ, Mogle JA, Hyun J, et al. Reliability and validity of ambulatory cognitive assessments. *Assessment* 25(1):14–30. doi:10.1177/1073191116643164 [FT]
- **Soukoreff 2004.** Soukoreff RW, MacKenzie IS. Towards a standard for pointing device evaluation: perspectives on 27 years of Fitts' law research in HCI. *Int J Hum-Comput Stud* 61(6):751–789. https://www.yorku.ca/mack/ijhcs2004.html [FT]
- **Soveri 2017.** Soveri A, Antfolk J, Karlsson L, Salo B, Laine M. Working memory training revisited: a multi-level meta-analysis of n-back training studies. *Psychon Bull Rev* 24(4):1077–1096. doi:10.3758/s13423-016-1217-0 [AB]
- **Stanford 2014.** Stanford Center on Longevity & Max Planck Institute for Human Development. A consensus on the brain training industry from the scientific community. https://longevity.stanford.edu/a-consensus-on-the-brain-training-industry-from-the-scientific-community-2 [FT]
- **Strober 2020.** Strober L, et al. A new look at an old test: normative data of the Symbol Digit Modalities Test — oral version. *Mult Scler Relat Disord* 43:102154. doi:10.1016/j.msard.2020.102154 [AB]
- **Terlecki 2008.** Terlecki MS, Newcombe NS, Little M. Durable and generalized effects of spatial experience on mental rotation. *Appl Cogn Psychol* 22:996–1013. doi:10.1002/acp.1420 [AB]
- **Thompson 2022.** Thompson LI, Harrington KD, Roque N, et al. A highly feasible, reliable, and fully remote protocol for mobile app-based cognitive assessment in cognitively healthy older adults. *Alzheimer's Dement (Amst)* 14(1):e12283. doi:10.1002/dad2.12283 [FT]
- **Thompson 2024.** Thompson LI, De Vito AN, Kunicki ZJ, et al. Psychometric and adherence considerations for high-frequency, smartphone-based cognitive screening protocols in older adults. *JINS* 30(8):785–793. doi:10.1017/S1355617724000328 [AB]
- **Tombaugh 1999.** Tombaugh TN, Kozak J, Rees L. Normative data stratified by age and education for two measures of verbal fluency: FAS and animal naming. *Arch Clin Neuropsychol* 14(2):167–177. doi:10.1093/arclin/14.2.167 [AB]
- **Tombaugh 2004.** Tombaugh TN. Trail Making Test A and B: normative data stratified by age and education. *Arch Clin Neuropsychol* 19(2):203–214. doi:10.1016/S0887-6177(03)00039-8 [AB]
- **Tombaugh 2006.** Tombaugh T. A comprehensive review of the Paced Auditory Serial Addition Test (PASAT). *Arch Clin Neuropsychol* 21(1):53–76. doi:10.1016/j.acn.2005.07.006 [AB]
- **Treisman 1980.** Treisman AM, Gelade G. A feature-integration theory of attention. *Cogn Psychol* 12:97–136 [NR]
- **Unsworth 2005.** Unsworth N, Heitz RP, Schrock JC, Engle RW. An automated version of the operation span task. *Behav Res Methods* 37(3):498–505. doi:10.3758/BF03192720 [AB]
- **Uttal 2013.** Uttal DH, et al. The malleability of spatial skills: a meta-analysis of training studies. *Psychol Bull* 139(2):352–402. doi:10.1037/a0028446 [FT]
- **Van Dongen 2003.** Van Dongen HPA, et al. [Chronic restriction to 4, 6 or 8 h in bed for 14 days.] *Sleep* 26(2):117–126. https://pubmed.ncbi.nlm.nih.gov/12683469/ [AB]
- **van Oirschot 2020.** van Oirschot P, et al. Symbol Digit Modalities Test variant in a smartphone app for persons with multiple sclerosis: validation study. *JMIR mHealth uHealth*. https://pmc.ncbi.nlm.nih.gov/articles/PMC7573704 [FT]
- **Vandierendonck 2017.** Vandierendonck A. [Comparison of IES, RCS, LISAS and binning as speed–accuracy composites.] *Behav Res Methods*. doi:10.3758/s13428-016-0721-5 [AB]
- **W3C CSS Values 4.** CSS Values and Units Module Level 4 (the reference pixel and absolute lengths). https://www.w3.org/TR/css-values-4/ [FT]
- **Weintraub 2013.** Weintraub S, et al. Cognition assessment using the NIH Toolbox. *Neurology* 80(11 Suppl 3):S54–S64. doi:10.1212/WNL.0b013e3182872ded [AB]
- **Weintraub 2014.** Weintraub S, Dikmen SS, Heaton RK, et al. The Cognition Battery of the NIH Toolbox for Assessment of Neurological and Behavioral Function: validation in an adult sample. *JINS* 20(6):567–578. doi:10.1017/S1355617714000320 [FT]
- **Wild 2018.** Wild CJ, Nichols ES, Battista ME, Stojanoski B, Owen AM. Dissociable effects of self-reported daily sleep duration on high-level cognitive abilities. *Sleep* 41(12):zsy182. doi:10.1093/sleep/zsy182 [FT]
- **Woelfle 2021.** Woelfle T, et al. Practice effects of mobile tests of cognition, dexterity, and mobility on patients with multiple sclerosis. *J Med Internet Res* 23(11):e30394. https://pmc.ncbi.nlm.nih.gov/articles/PMC8663564 [FT]
- **Woods 2011.** Woods DL, Kishiyama MM, Yund EW, et al. Improving digit span assessment of short-term verbal memory. *J Clin Exp Neuropsychol* 33(1):101–111. doi:10.1080/13803395.2010.493149 [FT]
- **Woods 2015.** Woods DL, Wyma JM, Yund EW, Herron TJ, Reed B. Factors influencing the latency of simple reaction time. *Front Hum Neurosci* 9:131. doi:10.3389/fnhum.2015.00131 [FT]
- **Woods 2016.** Woods DL, Wyma JM, Herron TJ, Yund EW. The effects of repeat testing, malingering, and traumatic brain injury on computerized measures of visuospatial memory span. *Front Hum Neurosci* 9:690. doi:10.3389/fnhum.2015.00690 [FT]
- **Wright 2008.** Wright R, Thompson WL, Ganis G, Newcombe NS, Kosslyn SM. Training generalized spatial skills. *Psychon Bull Rev* 15(4):763–771. PMID 18792502 [AB]
- **Xu 2018.** Xu Z, Adam KCS, Fang X, Vogel EK. The reliability and stability of visual working memory capacity. *Behav Res Methods* 50(2):576–588. doi:10.3758/s13428-017-0886-6 [FT]
- **Yamanaka 2022.** Yamanaka S. Test-retest reliability on movement times and error rates in target pointing. *DIS 2022*:178–188. doi:10.1145/3532106.3533450 [AB]
- **Yamanaka & MacKenzie 2026.** Yamanaka S, MacKenzie IS. Normalizing speed-accuracy biases in 2D pointing tasks with better calculation of effective target widths. arXiv:2602.04432 (CHI 2026) [AB]
- **Yang 2021.** Yang Y, Sanyal D, Michelson J, Ainooson J, Kunda M. Automatic item generation of figural analogy problems: a review and outlook. arXiv:2201.08450 [FT]
- **Yang & Kunda 2023.** Yang Y, Kunda M. Computational models of solving Raven's Progressive Matrices: a comprehensive introduction. arXiv:2302.04238 [FT]
- **Yap 2012.** Yap MJ, Balota DA, Sibley DE, Ratcliff R. Individual differences in visual word recognition: insights from the English Lexicon Project. *JEP:HPP* 38(1):53–79. doi:10.1037/a0024177 [FT]
- **Zamarian 2018.** Zamarian L, et al. Arithmetic learning in advanced age. *PLoS One* 13(2):e0193529. doi:10.1371/journal.pone.0193529 [FT]
- **Zelazo 2014.** Zelazo PD, Anderson JE, Richler J, et al. NIH Toolbox Cognition Battery (CB): validation of executive function measures in adults. *JINS* 20(6):620–629. doi:10.1017/S1355617714000472 [FT]
- **Zhang 2019.** Zhang C, Gao F, Jia B, Zhu Y, Zhu S-C. RAVEN: a dataset for relational and analogical visual reasoning. *CVPR 2019*. arXiv:1903.02741 [FT]
- **Zorowitz 2024.** Zorowitz S, Chierchia G, Blakemore S-J, Daw ND. An item response theory analysis of the matrix reasoning item bank (MaRs-IB). *Behav Res Methods*. doi:10.3758/s13428-023-02067-8 [FT]

---

## Appendix A: Contradictions between the source reports and how each was resolved

- **A1. Index mapping.**
  - **Conflict.** The reports and the first code draft used four different mappings: 100·Φ(z) clamped to 1–99 (Attention, Reaction, Memory, the draft code); 50 + 15z (Calculation, Processing Speed, Analysis); 50 + 16.67z (Precision, Spatial); 50 + 10z (methodology, framework).
  - **Resolution.** 50 + 10z everywhere (§2.2). It is linear, so the Mean is coherent; percentiles are not additive (as the Attention report itself noted); it matches T-score convention; and it avoids the IQ-like SD of 15.
- **A2. Population vs personal anchoring.**
  - **Conflict.** The methodology implies a provisional reference for every test. The Flexibility, Verbal, Learning and framework reports say no norms exist and none should be invented.
  - **Resolution.** Reference grades A/B/C/P. Grade-P areas get a personal index only and are excluded from the Mean's level.
- **A3. Run-in and baseline windows.**
  - **Conflict.** Run-in lengths ranged from 1 to 3 sessions; baselines from 3 to 7 sessions; some used a mean, others a median; some froze the baseline, others rolled it (Attention used a 28-day rolling mean, Reaction a 14-session median/MAD).
  - **Resolution.** Run-in R per test, based on each test's practice evidence; baseline = median of the next 5 valid sessions, frozen; rolling windows are used only for "today vs typical" (§2.3, §2.5).
- **A4. Spatial report inconsistency.**
  - **Conflict.** It labels sessions 1–3 "learning phase" but builds the baseline from sessions 3–5.
  - **Resolution.** R = 3, so the baseline is sessions 4–8.
- **A5. Change rules.**
  - **Conflict.** Reports used 90% vs 95% thresholds, single looks vs persistence, and windows of 3, 4, 5 or 7 sessions.
  - **Resolution.** One rule: 95% two-sided on weekly non-overlapping blocks, two consecutive weeks required (§2.6). The methodology's warnings about multiple looks and autocorrelation decide it.
- **A6. Flexibility had two specs.**
  - **Conflict.** One was MTB-faithful (30 trials, 20% colour cues, ISI 300/1,000 ms, 2,500 ms deadline). The other ran 120 s, up to 60 trials, about 40% switches, a 3,000 ms deadline and a 400 ms cue lead.
  - **Resolution.** The MTB-faithful version, the only one with published phone psychometrics (Novack 2024).
- **A7. Processing Speed had two specs.**
  - **Resolution.** The more complete spec, with the motor baseline, is the base. Details that differed:
    - **Practice:** 10 items every session (the sSDMT authors' recommendation), rather than 9 the first time and 3 warm-ups later.
    - **Inter-item interval:** none. A 150 ms interval would add about 8 s of dead time per block [D] and move the scale away from the sSDMT.
    - **Glyph pool:** at least 36 rather than 24, since each session uses 18.
    - **Minimum score:** invalid below 20 correct (a sourced rule) rather than below 15 responses.
    - **Accuracy cut-off:** 80%.
    - **Inactivity:** the 5 s rule was adopted from the other spec.
- **A8. KSS vs SSS.**
  - **Conflict.** The methodology report recommends the KSS. The framework report cites the copyright notice in the KSS chapter, which prohibits reproduction or adaptation without written consent (Shahid 2012, KSS chapter).
  - **Resolution.** The SSS by default; the KSS only with written permission.
- **A9. PVT-B lapse threshold.**
  - **Conflict.** 355 ms (set on PVT-192 hardware), 220 ms (the optimal threshold for one smartphone app in Grant 2017) and about 413 ms (the methodology's 355 + 58 ms).
  - **Resolution.** The primary metric, 1/RT, needs no threshold. Lapses use 355 ms + the platform offset and are labelled approximate. Grant's 220 ms is not adopted: it was optimised to detect sleep deprivation for one app with n = 16, and Basner notes that thresholds depend on hardware.
- **A10. Device offset for the Reaction anchor.**
  - **Conflict.** The Reaction report used 68 ms (Arsintescu 2017, a native app). Pronk 2020 measured web apps per platform.
  - **Resolution.** Pronk's per-platform values, because the app is delivered as a web app. The 35–140 ms spread across phones is noted (Nicosia 2023b).
- **A11. PVT-B parameters.**
  - **Conflict.** The methodology report marked the PVT-B ISI and conventions unverified; the Reaction report read Basner, Mollicone & Dinges 2011 directly.
  - **Resolution.** Treated as verified.
- **A12. Lim & Dinges lapse effect size.**
  - **Conflict.** g = −0.776 in the abstract vs −0.762 in Table 3.
  - **Resolution.** Both are noted; app copy quotes the abstract value.
- **A13. Learning area.**
  - **Conflict.** The memory report proposed it as an MVP area; the framework report placed it in phase 2.
  - **Resolution.** Phase 2, first to add (reasons in §1.2).
- **A14. Verbal area.**
  - **Conflict.** The framework report put it in the MVP (weekly).
  - **Resolution.** Phase 2, because of weak and old psychometrics, insensitivity to state and language dependence.
- **A15. Spatial format.**
  - **Conflict.** 3D cube figures (Precision/Spatial report) vs 2D polyominoes in phase 2 (framework report).
  - **Resolution.** 3D in the MVP, because of its open norm set at our angles and genuine rotation demands; 2D becomes a training game.
- **A16. Mean completeness.**
  - **Conflict.** All domains required (methodology) vs at least 5 domains (framework).
  - **Resolution.** Every reference-graded area within 14 days. A composite over a changing subset of areas would create artificial trends.
- **A17. "Readiness" composite** (framework only).
  - **Resolution.** An optional "Today" composite requiring at least 3 state-sensitive tests on the day, never merged with the Mean.
- **A18. Re-baselining practice-prone tests.**
  - **Conflict.** The Processing Speed report suggested re-baselining after day 30 or using residuals from a learning curve. The methodology allows re-baselining only after a device change or an explicit user reset.
  - **Resolution.** The baseline stays frozen. The practice curve is shown for display. "Today" uses the rolling typical range. The user may reset.
- **A19. Calculation fallback.**
  - **Conflict.** The Calculation report proposed switching automatically to addition-only if scores were noisy, which conflicts with the frozen-series principle.
  - **Resolution.** Never automatic. Addition-only may exist only as a separate optional series.
- **A20. Mapping of Number Trail and Letter Hunt.**
  - **Conflict.** The framework report listed both as processing-speed shortcuts and Number Trail as Trail Making A-like.
  - **Resolution.** The app was checked. Number Trail is "Remember where the numbers were, then tap them in order", a memory game; Letter Hunt is word formation, a verbal game. They are mapped to Memory and Verbal. A proposed "Number Trail B mode" would be a memory variant, so Trail Making B must be a new game.
- **A21. Per-trial feedback.**
  - **Conflict.** The methodology says feedback should come only after each test.
  - **Resolution.** Paradigm fidelity wins. Flanker Squared's per-trial feedback, Precision's hit/miss display and the PVT's RT display are part of the validated protocols; every other scored block gives none (C3).
- **A22. Flanker Squared anchor.**
  - **Conflict.** In-lab M = 40.43, at home 31.83, online 27.38.
  - **Resolution.** The in-lab first administration (the largest controlled sample), with the home value shown as context.
- **A23. Attention fast responses.**
  - **Conflict.** The report flagged sessions with more than 10% of responses under 200 ms.
  - **Resolution.** Such sessions are invalid: a comparison between two arrow rows cannot be made in under 200 ms, so the session did not measure attention control.
- **A24. Calculation "rushed" sessions.**
  - **Conflict.** The report flagged them and excluded them from baseline and trend.
  - **Resolution.** Modelled as invalid: the same analytic effect, with one consistent meaning.
- **A25. Pattern Comparison adult retest.**
  - **Conflict.** .73 in an abstract vs ICC .61 in a secondary listing.
  - **Resolution.** Left unresolved; the test is not used.
- **A26. DOI for Simons 2016.**
  - **Conflict.** Marked "verify" in one report.
  - **Resolution.** Confirmed through PubMed in the methodology report.
- **A27. Onset timestamp and touch-action.**
  - **Conflict.** The Flexibility spec used performance.now() inside the rAF callback and `touch-action: manipulation`; the other specs used the rAF timestamp argument and `none`.
  - **Resolution.** One rule (C2): the rAF timestamp and `none`, so the device offset is consistent across tests.
- **A28. Sample sizes for Edwards 2017 vs Ball 2002.**
  - **Note.** 2,802 analysed vs 2,832 enrolled in ACTIVE. Different denominators, not a contradiction.
- **A29. M2C2 adherence of 89.3%.**
  - **Note.** Attributed to Thompson 2022 in one report and Thompson 2024 in another. The attribution is uncertain and does not affect any decision.
- **A30. The user's dominant language.**
  - **Conflict.** The framework report assumed PT-BR, which is not established.
  - **Resolution.** The language is chosen at first run and locked for each series.

---

## Appendix B: Fidelity invariants to prove in `npm run validate`

**Global**
- No `Math.random` in test code; all generation is seeded.
- Every index helper uses 50 + 10z clamped to [0, 100], and no normal-CDF mapping exists.
- Each reference anchor carries a grade and a citation.
- R values match §2.12.
- Benchmarks are never registered as GameDefinitions.
- Every training link's gameId exists in the game registry.
- The KSS is absent unless a permission flag is set, and the SSS text matches §2.8 verbatim.

**Attention**
- Over 10⁴ draws, each trial type occurs 25% ± 2%.
- Every constructed item satisfies the rule: the correct option's centre arrow equals the target's flanker direction.
- No more than 3 same-side answers in a row.
- Net = correct − incorrect.
- A session with net ≤ 0 is invalid.

**Memory**
- Placement respects spacing and edge constraints, falling back to the lattice when needed.
- Replaying a scripted correct/incorrect pattern reproduces the staircase, including the bounds of 2–10 and the miss-counter reset.
- The MnS worked example scores 7.08.
- 14 scored trials.

**Calculation**
- Over 10⁴ draws, every class satisfies its rules, including carry/borrow and SUB answers ≥ 10.
- MUL complex never includes ×2.
- Every cycle of 8 contains each operation twice and 50% complex items.
- No duplicate problem within a session.
- CPM = C/2.

**Analysis**
- Generate at least 10⁴ items per class and check that:
  - each has exactly one solution
  - the ambiguity guard holds
  - options are distinct at render size (size steps ≥ 15%, shade steps ≥ 25%)
  - context-blind pickers succeed at most 14.5% of the time.
- b values are monotonic across classes.
- EAP on a scripted response pattern matches a reference value.
- Item selection picks the class nearest θ̂ − 0.2.

**Precision**
- t_k = 7k mod 13 visits all 13 targets and returns to 0.
- The chord factor is 0.993 and the nominal IDs are 1.41, 1.94, 2.11 and 2.74 bits.
- TP on a synthetic dataset matches a hand-computed value.
- The exclusion rules fire on crafted trials.

**Reaction**
- The ISI deck is the 31 values 1,000…4,000 ms in steps of 100.
- False-start and lapse thresholds include the platform offset.
- PS matches its formula.
- The test stops on the first response after 180 s.
- A 30,000 ms timeout counts as a valid stimulus and a lapse.

**Processing Speed**
- The glyph pool has at least 36 glyphs, and no key contains rotation or mirror pairs (90°, 180°, 270° and reflections).
- Each set of 9 shows every glyph once, with no repeat across set boundaries.
- 200 items are pre-generated.
- DM90 = 6 × DM15.

**Flexibility**
- 24 shape and 6 colour trials; trial 1 is a shape trial; no adjacent colour trials.
- Each stimulus identity appears 15 times, and sides are balanced within each cue type.
- Every test picture is bivalent and response-incongruent.
- RCS matches its formula, including the 2.5 s value for timeouts.

**Spatial**
- Every accepted figure spans 3 axes, has no face contact between non-consecutive arms, passes the chirality check against the 24 rotations, and meets the visibility rule.
- The 40 trials are balanced over angle × answer, and the run constraints hold.

**Scoring**
- On synthetic series:
  - a step of +2.5 σ_w sustained for 2 weeks → "reliably above"
  - a single crossing week → "possibly"
  - a gap week → the chain resets.
- Grade-P areas are excluded from the Mean, and the Mean is hidden while any reference-graded area is stale.

---

## Appendix C: Notes for the first implementation pass

These are requirements. The first draft of `src/platform/brain/` differs from them where noted.

1. **Index mapping.** The draft `indexFromNorm` maps through the normal CDF and clamps to 1–99. Replace it with 50 + 10z clamped to 0–100 (§2.2, A1).
2. **Check-in state.** The draft `BrainStateReport.kss` must become the SSS (1–7) by default (A8). Add the other check-in items: bed and wake times, awake time, sleep quality, Elo stress, caffeine, exercise, and the optional mood and motivation (§2.8).
3. **Pause contract.** "Re-run the trial after resume" is correct only for class-B tests. Class-A tests (fixed-time blocks) MUST mark the session invalid and offer a restart (C5).
4. **Index function.** The index function needs context: age for Memory, age and platform offset for Reaction. For grade-P areas (Flexibility; phase-2 Learning and Verbal) it must be able to return "no reference" instead of a number. Personal indices are computed by the analytics layer (§2.1).
5. **Device record.** A plain `input: 'touch' | 'mouse'` field is not enough. Store the full device fingerprint and key series by segment (§2.3, §2.11).
6. **Version and run fields.** Store `protocolVersion`, `referenceVersion`, seed, run type (run-in / baseline / tracking / practice), segment id and local time with the time-zone offset on every session.
7. **Practice semantics differ per test.**
   - Every session: a 30 s warm-up for Attention, 10 practice items for Processing Speed, 1 warm-up item for Analysis, 4 warm-ups for Spatial, 1 warm-up trial for Memory, and 1 warm-up sequence for Precision.
   - First run only: extended practice and tutorials.
   - The runner MUST support both.
8. **History capping** MUST NOT drop baseline sessions. Store the frozen baseline value and segment metadata explicitly (§2.11).
9. **Attention benchmark.** It is Flanker Squared, not the classic Eriksen flanker. The draft's "Arrow Flanker / Eriksen flanker task" example should not be used as the Attention benchmark definition.
10. **Check-in scheduling** follows §2.10: Reaction daily, two rotating benchmarks per day, the canonical order in C12, and run-in sessions front-loaded.

---

## Appendix D: Sources by decision (owner-requested evidence map, 2026-10-31)

Every scientific decision in Brain Lab, with the sources it rests on. **Verification:** each DOI below was resolved against Crossref (titles, authors, journals and years checked; abstracts read where a tip paraphrases a finding) on 2026-10-31 — the same entries live in `src/platform/brain/references.ts`, which the app cites. **Rule:** a decision with no source is not shipped; that is why several training games were removed (D.10). Engineering and interface choices — colours, sizes, animations, the [DC] protocol constants — are *not* scientific claims: they are labelled design choices, held constant so sessions stay comparable, and never presented as findings (D.13).

### D.1 The nine areas
- The area set follows the neurocognitive domains of DSM-5, the NIH Toolbox domains and the evidence that intelligence fractionates into separable components: [Sachdev et al. (2014)](https://doi.org/10.1038/nrneurol.2014.181); [Weintraub et al. (2013)](https://doi.org/10.1212/wnl.0b013e3182872ded); [Hampshire et al. (2012)](https://doi.org/10.1016/j.neuron.2012.06.022). The three additions (Processing Speed, Flexibility, Spatial) and the deferrals (Learning, Verbal) are argued in §1.1–1.2.

### D.2 One benchmark per area (the paradigm each test implements)
| Area | Benchmark | Sources |
|---|---|---|
| Attention | Arrow Squared (Flanker Squared) | [Burgoyne et al. (2023)](https://doi.org/10.1037/xge0001408); [Hedge et al. (2018)](https://doi.org/10.3758/s13428-017-0935-1) |
| Memory | Block Span (adaptive Corsi, C-SST) | [Woods et al. (2016)](https://doi.org/10.3389/fnhum.2015.00690); [Kessels et al. (2000)](https://doi.org/10.1207/s15324826an0704_8) |
| Calculation | Arithmetic Sprint (Math4Speed rules) | [Loenneker et al. (2025)](https://doi.org/10.1037/cep0000347) |
| Analysis | Matrix Reasoning (generated matrices) | [Carpenter et al. (1990)](https://doi.org/10.1037/0033-295x.97.3.404); [Matzen et al. (2010)](https://doi.org/10.3758/brm.42.2.525); [Chierchia et al. (2019)](https://doi.org/10.1098/rsos.190232) |
| Precision | Target Ring (ISO 9241-411 throughput) | [Soukoreff & MacKenzie (2004)](https://doi.org/10.1016/j.ijhcs.2004.09.001); [MacKenzie (2015)](https://doi.org/10.1007/978-3-319-20916-6_23) |
| Reaction | Alertness Check (PVT-B) | [Basner & Dinges (2011)](https://doi.org/10.1093/sleep/34.5.581); [Basner et al. (2011)](https://doi.org/10.1016/j.actaastro.2011.07.015) |
| Processing Speed | Symbol Coding (smartphone SDMT) | [Jaeger (2018)](https://doi.org/10.1097/jcp.0000000000000941); [Lam et al. (2022)](https://doi.org/10.1177/13524585211018103); [Pham et al. (2021)](https://doi.org/10.1038/s41746-021-00401-y) |
| Flexibility | Shape–Color Switch (DCCS) | [Novack et al. (2024)](https://doi.org/10.1017/s1355617724000225); [Monsell (2003)](https://doi.org/10.1016/s1364-6613(03)00028-7) |
| Spatial | Mirror Twins (Shepard–Metzler rotation) | [Shepard & Metzler (1971)](https://doi.org/10.1126/science.171.3972.701); [Ganis & Kievit (2015)](https://doi.org/10.5334/jopd.ai) |

Each benchmark also lists its own paradigm papers in `science.references` (shown on its page).

### D.3 Scores
- Level scores (throughput, mean speed, span) as primary metrics, never difference scores: [Hedge et al. (2018)](https://doi.org/10.3758/s13428-017-0935-1).
- The 50 + 10z (T) scale and "no composite while a component is missing": [Maruff et al. (2013)](https://doi.org/10.1186/2050-7283-1-30).

### D.4 Run-in, practice effects and the personal baseline
- Most practice gain happens between the first sessions; two lead-in sessions removed practice effects at a 1-month retest; retest gains plateau by about the third session: [Collie et al. (2003)](https://doi.org/10.1017/s1355617703930074); [Falleti et al. (2006)](https://doi.org/10.1080/13803390500205718); [Bartels et al. (2010)](https://doi.org/10.1186/1471-2202-11-118); [Goldberg et al. (2015)](https://doi.org/10.1016/j.dadm.2014.11.003); [Scharfen et al. (2018)](https://doi.org/10.1016/j.intell.2018.01.003).

### D.5 Reliable change and weekly verdicts
- Reliable Change Index logic with the player's own noise: [Jacobson & Truax (1991)](https://doi.org/10.1037/0022-006x.59.1.12).
- Day-to-day variability is real but small, and averages of several sessions are highly reliable — hence weekly blocks, never daily verdicts: [Schmiedek et al. (2013)](https://doi.org/10.1177/0956797613479611); [Sliwinski et al. (2018)](https://doi.org/10.1177/1073191116643164).

### D.6 Device segments and timing
- Browser RT latency per platform, and why a device change starts a new baseline: [Pronk et al. (2020)](https://doi.org/10.3758/s13428-019-01321-2); [Nicosia et al. (2023)](https://doi.org/10.3758/s13428-022-01925-1).

### D.7 The daily check-in
- Stanford Sleepiness Scale: [Hoddes et al. (1973)](https://doi.org/10.1111/j.1469-8986.1973.tb00801.x); single-item stress: [Elo et al. (2003)](https://doi.org/10.5271/sjweh.752).
- Why sleep, stress, caffeine, exercise and time of day are recorded: [Van Dongen et al. (2003)](https://doi.org/10.1093/sleep/26.2.117); [Lim & Dinges (2010)](https://doi.org/10.1037/a0018883); [Wild et al. (2018)](https://doi.org/10.1093/sleep/zsy182); [Sliwinski et al. (2006)](https://doi.org/10.1037/0882-7974.21.3.545); [McLellan et al. (2016)](https://doi.org/10.1016/j.neubiorev.2016.09.001); [Erickson et al. (2019)](https://doi.org/10.1249/mss.0000000000001936); [Schmidt et al. (2007)](https://doi.org/10.1080/02643290701754158).

### D.8 Cadence (Reaction daily, two rotating areas)
- Vigilance is the most sleep-sensitive function, reasoning the least; more than three training sessions a week was no more effective: [Lim & Dinges (2010)](https://doi.org/10.1037/a0018883); [Lampit et al. (2014)](https://doi.org/10.1371/journal.pmed.1001756).

### D.9 Claims policy ("what training can and can't do")
- [Simons et al. (2016)](https://doi.org/10.1177/1529100616661983); [Melby-Lervåg et al. (2016)](https://doi.org/10.1177/1745691616635612); [Au et al. (2015)](https://doi.org/10.3758/s13423-014-0699-x); [Sala et al. (2019)](https://doi.org/10.1525/collabra.203); [Lampit et al. (2014)](https://doi.org/10.1371/journal.pmed.1001756); [Edwards et al. (2017)](https://doi.org/10.1016/j.trci.2017.09.002); [Livingston et al. (2024)](https://doi.org/10.1016/s0140-6736(24)01296-0); regulatory context: FTC v. Lumos Labs (2016) and FDA General Wellness guidance (2026) — §5.

### D.10 Training games per area (a game is linked only when it mirrors a research paradigm for the area)
| Area | Game | Paradigm it mirrors | Sources |
|---|---|---|---|
| Attention | Stroop Match | Stroop colour–word interference | [Stroop (1935)](https://doi.org/10.1037/h0054651); [MacLeod (1991)](https://doi.org/10.1037/0033-2909.109.2.163); [MacLeod & Dunbar (1988)](https://doi.org/10.1037/0278-7393.14.1.126); [Lampit et al. (2014)](https://doi.org/10.1371/journal.pmed.1001756) |
| Attention | Schulte Table | Schulte-grid visual search | [Lu et al. (2022)](https://doi.org/10.1002/brb3.2471); [Sireteanu & Rettenbach (1995)](https://doi.org/10.1016/0042-6989(94)00295-w) |
| Attention | Odd One Out | Odd-one-out visual search | [Treisman & Gelade (1980)](https://doi.org/10.1016/0010-0285(80)90005-5); [Duncan & Humphreys (1989)](https://doi.org/10.1037/0033-295x.96.3.433); [Sireteanu & Rettenbach (1995)](https://doi.org/10.1016/0042-6989(94)00295-w) |
| Attention | Moving Cups | Object tracking among identical distractors | [Pylyshyn & Storm (1988)](https://doi.org/10.1163/156856888x00122); [Simons et al. (2016)](https://doi.org/10.1177/1529100616661983) |
| Memory | Backwards Span | Backward digit span | [St Clair-Thompson (2010)](https://doi.org/10.1080/09541440902771299); [Reynolds (1997)](https://doi.org/10.1016/s0887-6177(96)00015-7); [Melby-Lervåg et al. (2016)](https://doi.org/10.1177/1745691616635612) |
| Memory | Pattern Recall | Visual pattern span | [Della Sala et al. (1999)](https://doi.org/10.1016/s0028-3932(98)00159-6); [Melby-Lervåg et al. (2016)](https://doi.org/10.1177/1745691616635612) |
| Memory | Number Trail | Corsi-type spatial sequence recall | [Kessels et al. (2000)](https://doi.org/10.1207/s15324826an0704_8); [Gathercole et al. (2019)](https://doi.org/10.1016/j.jml.2018.10.003) |
| Memory | Simon | Serial span (sequence reproduction) | [Kessels et al. (2000)](https://doi.org/10.1207/s15324826an0704_8); [Gathercole et al. (2019)](https://doi.org/10.1016/j.jml.2018.10.003) |
| Calculation | Math Sprint | Timed arithmetic-fact practice | [Codding et al. (2011)](https://doi.org/10.1111/j.1540-5826.2010.00323.x); [Rickard et al. (1994)](https://doi.org/10.1037/0278-7393.20.5.1139) |
| Analysis | Sequence Cracker | Number-series completion | [Simon & Kotovsky (1963)](https://doi.org/10.1037/h0043901); [Klauer & Phye (2008)](https://doi.org/10.3102/0034654307313402) |
| Analysis | Code Breaker | Mastermind logical deduction | [Best (1990)](https://doi.org/10.3758/bf03202646); [Simons et al. (2016)](https://doi.org/10.1177/1529100616661983) |
| Processing Speed | Odd One Out | Speeded visual search | [Ball et al. (2002)](https://doi.org/10.1001/jama.288.18.2271); [Edwards et al. (2017)](https://doi.org/10.1016/j.trci.2017.09.002); [Duncan & Humphreys (1989)](https://doi.org/10.1037/0033-295x.96.3.433) |
| Flexibility | Stroop Match | Cued task switching (higher tiers flip the rule) | [Monsell (2003)](https://doi.org/10.1016/s1364-6613(03)00028-7); [Karbach & Kray (2009)](https://doi.org/10.1111/j.1467-7687.2009.00846.x); [Karbach & Verhaeghen (2014)](https://doi.org/10.1177/0956797614548725) |
| Flexibility | Schulte Table | Alternating sequences, Trail Making B-type (extreme tier) | [Sánchez-Cubillo et al. (2009)](https://doi.org/10.1017/s1355617709090626); [Lu et al. (2022)](https://doi.org/10.1002/brb3.2471); [Karbach & Kray (2009)](https://doi.org/10.1111/j.1467-7687.2009.00846.x) |
| Spatial | Block Drop | Falling-block (Tetris-type) play | [Okagaki & Frensch (1994)](https://doi.org/10.1016/0193-3973(94)90005-1); [Terlecki et al. (2008)](https://doi.org/10.1002/acp.1420); [Uttal et al. (2013)](https://doi.org/10.1037/a0028446); [Safaei et al. (2022)](https://doi.org/10.1177/00315125221078982) |

- **No training games — by evidence:** Precision (no study links any of the app's games to touch-aiming throughput) and Reaction (alertness does not improve with practice; its levers are sleep, timing and recovery).
- **Removed for lack of a source:** Make 24, Target Number, MathDoku (calculation), Logic Puzzles, House Puzzles (analysis), Tangram, Pipes, Laser Mirrors (spatial), Color Connect, Snake, Jigsaw (precision), Count & Compare and Schulte Table (processing speed). They may return if a peer-reviewed source is found.
- **N-Back and Dual N-Back** are deliberately not linked while their scoring defect stands (they can be won by never pressing — QA-LEDGER).
- **Honesty about evidence:** no game here was studied as itself; each card's evidence line states what practising that *kind* of task is known to do, including null and mixed results (e.g. Safaei 2022 for Tetris-type training).

### D.11 Improvement tips (Profile → Brain and the area sheets)
Every tip in `domains.ts` (`improve`) cites at least one entry of `references.ts`, and its wording was checked against the source's abstract — e.g. inductive-reasoning training gains are reported for children (Klauer & Phye 2008), fluency gains came from drill and practice with modelling in single-case studies (Codding 2011), visual-search learning is fast and lasting (Sireteanu & Rettenbach 1995), and mindfulness evidence for attention is preliminary (Chiesa 2011).

### D.12 The coach (`coach.ts`)
| Rule | Fires when | Sources |
|---|---|---|
| Reliable decline / possible dip | the weekly verdict says so (never a single day) | [Jacobson & Truax (1991)](https://doi.org/10.1037/0022-006x.59.1.12); [Lim & Dinges (2010)](https://doi.org/10.1037/a0018883); [Sliwinski et al. (2006)](https://doi.org/10.1037/0882-7974.21.3.545); [Schmidt et al. (2007)](https://doi.org/10.1080/02643290701754158) |
| Below typical today | today's scored run is ≥ 1 σ_w under the typical range | [Schmiedek et al. (2013)](https://doi.org/10.1177/0956797613479611); [Sliwinski et al. (2018)](https://doi.org/10.1177/1073191116643164); [Lim & Dinges (2010)](https://doi.org/10.1037/a0018883) |
| Calibrate | an area is still in its run-in | [Falleti et al. (2006)](https://doi.org/10.1080/13803390500205718); [Bartels et al. (2010)](https://doi.org/10.1186/1471-2202-11-118); [Collie et al. (2003)](https://doi.org/10.1017/s1355617703930074) |
| Keep the Mean current | a reference area has no scored run in 14 days | [Maruff et al. (2013)](https://doi.org/10.1186/2050-7283-1-30) |
| Focus area | a reference level is ≥ 5 points (½ SD) under the median of ≥ 3 areas | the area's own sources and tips (D.2, D.11) |
| Protect your sleep | median logged sleep < 7 h or ≥ 3 nights < 6 h in 14 days | [Van Dongen et al. (2003)](https://doi.org/10.1093/sleep/26.2.117); [Wild et al. (2018)](https://doi.org/10.1093/sleep/zsy182); [Lim & Dinges (2010)](https://doi.org/10.1037/a0018883) |
| Sleep / stress associations | ≥ 20 runs over ≥ 28 days, ≥ 10 per bin, 95% CI excluding 0 — phrased as association | [Wild et al. (2018)](https://doi.org/10.1093/sleep/zsy182); [Sliwinski et al. (2006)](https://doi.org/10.1037/0882-7974.21.3.545) |
| Consistent time of day | check-in start times spread > ±90 min | [Schmidt et al. (2007)](https://doi.org/10.1080/02643290701754158) |
| Check in more often | < 3 completed check-ins in 7 days | [Sliwinski et al. (2018)](https://doi.org/10.1177/1073191116643164) |
| Try a training game / more is not better | a focus area untrained for 14 days / training on ≥ 6 of 7 days | the link's sources (D.10); [Lampit et al. (2014)](https://doi.org/10.1371/journal.pmed.1001756) |
| Reliable progress | the weekly verdict says so; practice qualifier for practice-prone areas | [Jacobson & Truax (1991)](https://doi.org/10.1037/0022-006x.59.1.12); [Scharfen et al. (2018)](https://doi.org/10.1016/j.intell.2018.01.003) |
| Best-evidence habits | always (lowest priority) | [Erickson et al. (2019)](https://doi.org/10.1249/mss.0000000000001936); [Livingston et al. (2024)](https://doi.org/10.1016/s0140-6736(24)01296-0); [Wild et al. (2018)](https://doi.org/10.1093/sleep/zsy182) |

### D.13 What is not a scientific decision
Colours (area palette slots), layout, motion, sounds, button sizes and the [DC] protocol constants marked in §1 are engineering choices for a usable, comparable test — they carry no scientific claim, and the app never presents them as findings.



## Appendix E: Deviations as built (2026-10-31)

Every benchmark lists, in its own definition (`science.deviations` in `src/brain/<id>/index.ts`, shown on its benchmark page), each place where the build departs from the source paradigm or from §1 of this dossier, with the reason. This appendix mirrors those lists so the rulebook states what actually ships. Items that go BEYOND §1 (choices the dossier did not make — e.g. Block Span's `too-few`/`at-chance` floors and single warm-up on runs 2–3, Arithmetic Sprint's and Symbol Coding's invalid "items exhausted" run, Mirror Twins' literal reading of the arm-contact rule) were made by the implementers at build time and were ACCEPTED by the owner on 2026-10-31 (the same review raised Mirror Twins' accuracy floor from 60% to 65%). Every protocol stays at version 1: none had shipped, so no stored run was scored under the old rules. A change to any of them is a protocol change: update the definition and this appendix together and bump `protocolVersion` (§1.4 conventions).

### Alertness Check (Reaction) — `alertness-check`, protocol v1

- Runs as a phone web app, not on PVT-192 hardware: the platform’s measured touch-to-display latency (about 58 ms on iOS, Pronk et al. 2020; a 60 ms placeholder elsewhere) is added to the 100 ms false-start and 355 ms lapse thresholds, so counts are approximate.
- Display after Grant et al. (2017) and the PVT-B counter: a dark panel, fixed in every theme, with a red-outlined box (60% of the panel’s width) and a yellow millisecond counter; box height and type size are our choice.
- Responses are taps in a large zone below the panel, as in Grant et al. (2017); taps on the panel itself are ignored so the finger never hides the counter. On a keyboard the space bar also responds.
- ISIs are block-randomised as a shuffled deck of the 31 values 1,000–4,000 ms in 100 ms steps, reshuffled when exhausted, measured from the last response and including the 1 s result display.
- A tap while no counter is running — during the wait or the 1 s result display — is a false start: “FS” shows for 1 s and the same interval restarts from the tap. A response under 100 ms plus the offset is also a false start, and the next interval is a new draw.
- A short caption under the box spells out “FS” (False start) and “OVERRUN” (no response for 30 seconds); the only sound during the scored block is the OVERRUN alert.
- The block ends with the first response — or timeout — after 180 s; a false start after 180 s does not end it, and a block that never reaches a stimulus stops 30 s past its end (it is then invalid).
- First lifetime run only: 20 s of unscored practice with coaching; there is no per-session warm-up, and a 3-2-1 countdown (our addition) lets the finger settle before the first interval starts.
- A run is invalid with fewer than 40 valid stimuli or more than 10 false starts; leaving the app, losing focus for more than 1 s or rotating the screen also invalidates it (interruption class A).
- A valid run with 4 or more false starts carries the flag “responding before the counter” (our rule, not the source’s).
- The slowest-10% speed and fastest-10% RT average the k = max(1, round(n/10)) most extreme valid stimuli of the run.

### Symbol Coding (Processing Speed) — `symbol-coding`, protocol v1

- Original abstract glyphs instead of the published SDMT symbols: a fixed pool of 40 glyphs of 2–3 strokes (lines or curves) on a 3×3 lattice, each spanning the whole lattice with 4.85–6.9 lattice units of ink, chosen from about 50,000 enumerated candidates and screened by eye to exclude anything resembling a Latin letter, a digit, a common symbol or a familiar icon [DC].
- No two pool glyphs are rotations or mirror images of each other, and the rule is extended to near-misses: two glyphs whose inked areas overlap by an intersection-over-union of 0.6 or more under any rotation or mirror image are never drawn into the same key (no pool pair reaches 0.75), so every key is an alternate form of similar difficulty [DC]. Each session draws 9 test glyphs and 9 different practice glyphs in a random glyph-to-digit order from the run seed — a new key every session, as in the smartphone test.
- All 9 glyphs are used from the first item (as in the sSDMT; the paper SDMT starts with 6), in back-to-back shuffled sets of 9 with no immediate repeat across set boundaries; 200 coding items are pre-generated [DC].
- The answer pad is a 3×3 phone-order keypad that deliberately does not mirror the 1→9 key strip, so the digit has to be read rather than matched by position [DC].
- Practice runs every session: 10 untimed items on the practice key with green/red feedback for 250 ms; at least 8 of 10 must be right, otherwise practice repeats once, and a run still below 8/10 after the repeat continues with the quality flag practice-below-criterion instead of being stopped [DC].
- After a wrong practice answer the correct key cell stays lit for 700 ms before the next item (corrective feedback); right answers advance after the specified 250 ms [DC].
- The first run adds three guided items before the practice (the symbol's key cell lit for items 1–2, its pad key also lit for item 1; a miss is retried with the answer shown); they are not logged [DC].
- A 3-2-1 countdown also precedes the 15-s motor baseline (the dossier lists one only before the coding block), so both timed parts start from the same ready position rather than from the Start button [DC].
- The scored key stays hidden until the first coding item appears at Go (it is revealed in the same frame), so it cannot be studied before the clock starts [DC].
- Neutral acknowledgement in the timed parts: the pressed key's paint-only press animation and one identical soft tick (plus a haptic tap where supported) for every registered response, and the same neutral lock sound when each timed part ends; no correctness signal, no score or timer on the stage (elapsed time shows only as the runner's progress bar) [DC].
- On a computer the number keys 1–9 answer as well as the on-screen pad; both register on key-down or pointer-down with the event's own timestamp [DC].
- Sizes follow the phone rather than fixed pixels: the target glyph is about 108–136 px tall (the dossier says about 96 px) and the key glyphs about 32 px (about 28 px), in 9 key cells at least 36 px wide, with keypad keys 56–68 px tall [DC].
- Taps less than 120 ms after the previous registered response are ignored and logged, as are taps that arrive before an item's frame ran; more than 5 ignored taps across both timed parts flags the run (double-taps) without invalidating it [DC].
- Validity: invalid with fewer than 20 correct (the MS sherpa outlier rule), accuracy below 80% [DC], any gap over 5 s without a response, counted from the first item's onset to the first answer and from the last answer to the 90-s lock as well [DC], or all 200 items used before 90 s [DC]. Hiding the page, losing focus for over 1 s or rotating invalidates the run (class A, enforced by the runner).
- The learning slope counts correct answers per minute (last 30 s minus first 30 s) [DC]; the coding ratio is reported as 0, with the flag no-digit-matches, when the motor baseline had no correct match. Both are diagnostics only.
- The frame-interval distribution of the coding block is stored as one summary row (frames, median, 95th percentile, maximum, frames over 50 ms) rather than every interval, and the same row carries the app version that ran the session [DC].
- The index uses a grade C literature anchor without age bands: Kiely et al. 2014 and Strober et al. 2020 age norms, minus the 8–12% phone offset, are a future calibration task.

### Arrow Squared (Attention) — `arrow-squared`, protocol v1

- Phone adaptation: answered with two thumbs on a touchscreen instead of a desktop mouse; the target row sits in the upper stage and the two option pads side by side in the bottom card (about 44% of the width each, at least 120 px tall) — layout sizes are our choice, not the source’s.
- Arrows are drawn as SVG chevrons, about 9% of the stage width in the target row and 6% in the options.
- The correct option’s side is drawn with p = .5 but is never the same more than 3 times in a row (the source does not state a constraint).
- Feedback on every trial is a tick with a soft chime or a cross with a low buzz, shown beside the score for about 250 ms (gone by 300 ms) so it never covers the next item, which appears on the very next frame; the chime has one constant pitch. The source showed text feedback.
- The 30-second practice block with feedback and a running score is repeated as an unscored warm-up in every session (the source ran it once).
- First run only: the worked fully incongruent example is interactive (you choose, then both options are explained), followed by four guided items — one per trial type, with a corrective explanation after a wrong tap. Unscored; the source had the worked example only.
- The 90.0-second clock starts at the first item’s onset; touches after time-out are ignored and the item on screen at time-out is not scored.
- Answers under 200 ms (the FlankerDL mis-tap cut-off) still count toward the score but are flagged in the trial log and on the run; more than 10% of them invalidates the run.
- Timing: each item becomes visible through an opacity switch inside requestAnimationFrame (that frame’s timestamp is the onset) and answers register on pointerdown with the event’s timestamp; any touch registers, including a second thumb that lands while the first is still on the glass.
- Desktop keyboard: ← or F answers left, → or J answers right.
- Leaving the app for more than 1 s or rotating the screen voids the run (interruption class A); the source was proctored in the lab or run online without such a rule.
- During the warm-up only, a one-line reminder of the rule sits under the target.
- Between the warm-up and the countdown, a card waits for a tap on “Start test”, so the scored block begins when you are ready; the first warm-up item appears about 0.5 s after “Start warm-up”.

### Shape–Color Switch (Flexibility) — `shape-color-switch`, protocol v1

- Original vector pictograms in the MTB pairs (balloon and house scored, dog and car for practice), not MTB’s artwork; the two colors are a blue and an orange that differ in hue and lightness (ΔL* ≈ 26), never red/green [DC].
- Cue lead fixed at 500 ms — MTB’s value was not verified; it is held constant because preparation time changes switch costs (Monsell 2003) [DC].
- Card sides are drawn per session from the seed; the shape–color pairing on the cards is fixed (balloon blue, house orange; practice dog blue, car orange), and in practice each color keeps the side it has in the scored block [DC].
- Trial order [DC]: trial 1 is a shape trial; color trials are never adjacent, at least 2 shape trials apart and never last (6 switches into color, 6 back); at most 6 shape trials in a row; each picture 15 times; correct side 12/12 within shape and 3/3 within color; at most 4 identical pictures or correct sides in a row.
- Blank intervals are 15 × 300 ms and 15 × 1,000 ms in shuffled order rather than independent coin flips, so every session has the same timing [DC].
- ΣRT counts a timeout as 2.5 s and an anticipation as its own time — MTB’s exact handling is unverified [DC].
- An anticipation is a tap under 200 ms after the picture, scored as an error; taps before the picture appears are ignored by scoring (logged) [DC].
- Validity [DC]: a run is invalid with more than 3 anticipations or accuracy below 70 %, and when it is interrupted (class A).
- Every-session warm-up: 5 mixed trials with a tick or cross, a one-line rule reminder and the right card outlined after an error; repeated once below 4 correct, after which the scored block starts regardless [DC: repeat rule].
- First run only: an untimed, coached practice — 2 shape trials, 2 color trials, then one picture under both rules — where a wrong answer is shown and asked again (up to 3 tries) [DC].
- A 3-2-1 countdown precedes the scored block (not part of the MTB description), identical in every session [DC].
- Cue words are lowercase English ("shape", "color") because the app is English-only; a future translation would be locked per series [DC].
- During the scored block every tap gets the same neutral acknowledgement — a soft ring and click, right or wrong — and no correctness feedback, as in MTB [DC: acknowledgement].
- The median-time metrics and the time switch cost are left out of a run that has no eligible correct trials of that kind (for example, every color trial wrong) rather than invented; such a run is still valid if it meets the rules above.
- On desktop, ← or F answers the left card and → or J the right card.

### Block Span (Memory) — `block-span`, protocol v1

- Our implementation of the paradigm, not the C-SST software: scores are not interchangeable with published ones.
- Timing follows eCorsi (Brunetti et al. 2014): the layout stands still for 1 s, then each block is on 500 ms and off 500 ms (the C-SST uses about 977 ms per item); the recall cue (tone, light haptic, “Your turn”) comes 500 ms after the last block.
- Each highlight is an opacity flip applied in a requestAnimationFrame callback and stamped with its frame time; an ON period off by more than 50 ms voids the trial, which is replaced by an uncounted trial of the same length.
- Arena S = min(viewport width − 32, 0.6 × viewport height, 420) px with a 264 px floor (the smallest arena the fallback lattice can space; only a landscape phone reaches it); block side b = max(44, round(0.13 S)) px.
- Placement by rejection sampling (centres ≥ 1.5 b apart, ≥ 0.5 b + 4 px from the edge) with a budget of 500 candidate draws per layout, then a jittered 4 × 4 lattice of 10 random cells — measured at 0% of layouts on phones 360 px wide and up and about 4% on 320 px phones.
- Highlight = an accent fill with a soft halo on neutral blocks — a luminance change, safe for colour-vision deficiency (resting blocks clear 3:1 against the board; rest → lit measures 5.3:1 on black, 4.7:1 on dim and 3.7:1 on light).
- Responses register on release (pointerup) inside the block plus 6 px; each tap flashes 150 ms with a soft click; the trial ends 300 ms after the last tap; no undo. Taps during the presentation are ignored with a quiet “wait” hint.
- “Don’t remember” ends a trial as incorrect, and 15 s without a tap (from the cue or the last tap) counts as incorrect.
- Practice shortened from the C-SST to stay near 3 minutes: the first run has a tutorial and 4 practice trials on a 6-block display from 2 blocks (practice staircase capped at 4) with per-tap corrective feedback — a wrong tap ends that practice trial and replays the order as numbers; every session then has one unscored warm-up trial at 3 blocks with feedback on the result.
- Answers are taps or mouse clicks on the blocks (the C-SST itself used a mouse; the test is unspeeded, so the pointer does not bias the score). There is no keyboard mapping: keys would turn a spatial task into a verbal one.
- Runs 2–3 get the single warm-up instead of the dossier’s 2 practice trials (2 then 3 blocks): the runner only tells a first run apart, and Appendix C.7 sets one warm-up trial per session.
- A 3-2-1 countdown opens the scored block, as well as following every resume.
- Interruptions (class B): a pause voids the trial in flight and a fresh trial at the same length follows a 3-2-1. Pauses count from the scored block’s countdown; the run is invalid beyond 2 interruptions or 60 s paused, at 3 timeouts, or at 3 trials voided for timing — and ends as soon as a limit is crossed (pause limits are checked on resume).
- Two floors catch a run that measured no recall: no registered tap at all (every trial ended with “Don’t remember”) is invalid as too few answers, and taps without a single correct trial in 14 are invalid as at chance — the staircase drops to 2-block sequences, which anyone attempting gets right, while random taps hit 1 time in 90.
- At the 2-block floor the second consecutive miss still resets the miss counter.
- Reference: ComputerUse is fixed at its normative mean (5.12); ages outside the 18–82 sample are held at its edges rather than extrapolated.
- Paths are not filtered; each trial logs its path length and self-crossings (span depends on path configuration — Facchin et al. 2024).
- Between trials the finished layout fades out over 220 ms and the board stays empty for 500 ms.

### Arithmetic Sprint (Calculation) — `arithmetic-sprint`, protocol v1

- Mixed-order 2-minute block (cycles of 8: every operation twice, half of them complex) instead of Math4Speed’s handwritten single-operation blocks — a principled derivative, not a normed instrument.
- Answers are typed on an on-screen phone keypad and submitted with ✓ (as in the online Math4Speed and the BGU-MF), not handwritten; up to 3 digits, compared as numbers.
- Multiplication complex uses 3–9 × 12–19: ×2 (trivial doubling) is dropped from Math4Speed’s 2–9.
- Addition complex keeps the simple class’s a ≠ b rule (units 1–9 already follows from the carry).
- Problem size: within each class, draws alternate between answers at or below the class median and above it — simple classes start below, complex classes above — so every run of 2 and every cycle holds one small and one large item (for division the size is the quotient).
- No problem repeats within a session, and flipped operand order (7 × 8 / 8 × 7, 38 + 47 / 47 + 38) counts as the same problem, because practice transfers across it (Rickard et al. 1994); the practice items never reappear in the block.
- The 4-item practice (one simple item per operation, right/wrong feedback, the correct answer after an error, a missed item repeated once) runs on the first run and in Practice mode only — SCIENCE.md Appendix C.7 lists no per-session warm-up for Calculation. Every run starts with the intro card and a 3-2-1 countdown, so a returning run lasts about 140 s rather than the dossier’s 155 s (which includes the practice); the missed practice item comes back after the others, not straight away.
- The scored block shows no correctness at all: every key gets the same press flash and tick, every ✓ the same ring and sound, right or wrong.
- Timing: each problem is drawn inside the animation frame that stamps its onset; keys register on pointerdown with the event timestamp, and a key stamped before the current problem’s onset is ignored.
- The block ends 120.0 s after the first problem’s onset; the problem on screen then is discarded, not scored as an error.
- If a run gets through all 120 pre-generated items before the 120 s are up (at least one answer a second, beyond any honest pace), the block ends there and the run is invalid (“too-fast”).
- Accuracy below 85% makes the run invalid (“rushed”) rather than only flagged (SCIENCE.md A24); fewer than 8 answers is invalid (“too-few”). Answers faster than 400 ms still count toward CPM but are left out of the time medians.
- Per-operation rates count every submission (correct ÷ summed submit time); the cross-session RT diagnostics (last 7 valid runs, per operation × complexity) are left to the trial log.

### Mirror Twins (Spatial) — `mirror-twins`, protocol v1

- Stimuli are procedurally generated, flat-toned polycubes (10 cubes, 4 arms of 2–4 cubes, 3 right-angle bends) drawn on a phone, not Ganis & Kievit’s rendered shaded objects — scores are not interchangeable with theirs.
- 40 scored trials (θ 0/50/100/150° × same/mirror × 5) instead of their 96, and a 7,000 ms timeout instead of 7,500 ms.
- Answers on two on-screen pads read on pointerdown (F/J on a keyboard) instead of a desktop keyboard; touch adds about 58–70 ms to every RT (Pronk et al. 2020), constant within one device.
- Mirror twins are reflected in the picture’s frame (left–right) and then turned s·θ about the vertical axis, so at 0° a mirror twin is the reference flipped left–right and θ means the same for both answers.
- Acceptance rule 2 is read literally: a corner cube belongs to both of its arms, so a 2-cube middle arm (whose two corners touch) is rejected and 2-cube arms only occur at the ends.
- Visibility rule: in both views a trial shows, every cube keeps at least 25% of one face visible, counting only faces whose full projection is at least 0.2 of a unit square (near edge-on slivers cannot satisfy it), measured on a 12-pixel-per-edge raster; no arm within 15° of the line of sight (never possible at 25° elevation, still checked).
- Every view must fit 6.8 cube edges and is drawn in a square 7.8 edges wide centred on its own bounds, so cube size is the same on both plates and across the session; the reference yaw is redrawn up to 6 times, then a new figure, until both views pass.
- Three flat face tones (top, left-facing, right-facing) derived from the Spatial area colour with a 1.5 px darker edge; the reference sits on the left plate, the comparison on the right, with a fixation dot centred between them during the 300 ms blank.
- The turn direction s is near-balanced inside every angle × answer cell (3/2 or 2/3) rather than drawn independently.
- Anticipations (< 250 ms) are excluded and the trial re-queued once at the end of the block with a fresh figure of the same condition; a second anticipation loses the trial. A timed-out pair gets no acknowledgement (nothing was pressed).
- Validity: invalid below 65% accuracy (raised from 60%: a pure guesser reaches 60% in about 13% of 40-trial runs, 65% in about 4%), or when anticipations plus timeouts exceed 20% of the 40 planned trials (8). Quality flags that never invalidate: no positive RT-vs-angle slope, accuracy at 0° under 75%, an angle with no correct answer (its median is then reported at the 7,000 ms ceiling).
- Interruptions (class B): a pause or leaving the page voids the pair on screen and replaces it with a fresh figure of the same condition; the scored block resumes after a 3-2-1. More than 3 pauses or more than 60 s paused in the scored block makes the run invalid (limits chosen to match the Memory benchmark).
- A 3-2-1 countdown precedes the scored block; the source protocol has none, and it changes nothing inside the block.
- Scored-block feedback is neutral only — the pressed pad’s press flash, a quiet ring and a tap sound, identical for every answer. The every-run warm-up (4 pairs, one per angle, two same and two mirror) shows corrective feedback with a coach line: right, wrong, too slow and too quick each have their own words, glyph and sound, and a too-quick warm-up pair is shown once more with a new figure.
- First-run practice: 8 pairs ramping 0° → 150° (one same and one mirror pair per angle) with corrective feedback and an animated turn-back of the right figure (a same pair lines up; a mirror pair lands reversed across a mirror line); a too-quick answer re-shows the pair with a new figure; repeated with new figures until 6 of 8 are right, at most 3 rounds in all (then the run continues).

### Target Ring (Precision) — `target-ring`, protocol v1

- No bank-card calibration in this version: every device uses the documented default of 6.2 CSS px per mm, so physical sizes are approximate (phones differ by roughly ±15%). The px/mm value and the board scale s are stored with every run.
- The board scale is s = min(1, board side / (52 mm × px/mm)); on a smaller board all geometry, the hit radius and the 20 mm gross-miss rule shrink by s, and s < 0.9 is flagged "not comparable".
- For the first scored tap of a ring, "from" is the start tap's touch point; for later taps it is the previous target's centre, the previous overshoot entering through dx_prev (dx = 0 at the start of each ring). The dx chain continues through excluded taps.
- The unscored start tap must land within W/2 + 3 mm of target 0; a tap elsewhere is ignored (a neutral ring) so every ring starts from a defined point.
- A hit is a touch within W/2 of the target centre — the drawn disc.
- Error rate = misses / counted (non-excluded) taps of the scored rings; the ≤ 25% validity rule uses the same number.
- A ring with more than 3 exclusions is invalid and contributes no taps; its slot is re-run once at the end, and a failed re-run leaves the slot invalid.
- Interruptions: a pause, hidden page, rotation or a board resize of 2 px or more during a ring voids it and appends a replacement at the end; a pause between rings voids nothing, and practice / warm-up rings simply restart. More than 2 voided scored rings make the run invalid (the limit Memory uses).
- Round order: each round is a seeded shuffle of the four ring sizes, redrawn so a round never repeats the previous round's order and no size runs twice in a row across rounds.
- Target 0 sits at 12 o'clock and targets are numbered clockwise. A faint guide circle joins the 13 positions, and the lit disc has the app's extruded bottom edge drawn inside its outline (its silhouette is exactly W).
- The 1.2 s card between rings lives in the bottom card, so the new ring stays in view as it fades in; input is locked until target 0 lights.
- Sounds: a soft tick for a hit and a thud for a miss; no haptics (the spec names none, and iOS has no vibration API). Under reduced motion the hit pulse and the miss ring fade without scaling.
- Time per tap is the mean of the four per-condition mean intervals; tightness is the mean We of the two 7 mm conditions. The Fitts fit MT = a + b × IDe (least squares over the four conditions) is shown as a highlight only.
- First run only: a 3-step animated tutorial, then 2 practice rings — the easiest (D 20, W 12) and the hardest (D 40, W 7) — each followed by corrective coaching on its hits and pace. Nothing from them is stored.
- There is no countdown: every ring starts on the player's own tap.
- The session's pointer type is fixed by its first touch and other pointer types are ignored. Mouse and pen sessions are flagged (input-mouse / input-pen): the touch anchor does not apply to them, but the shared reference function cannot see the input kind.

### Matrix Reasoning (Analysis) — `matrix-reasoning`, protocol v1

- Our implementation of the paradigm, not the original instrument: items come from our own generator following the Sandia rule set and MaRs-IB timing, so scores are not interchangeable with Sandia, MaRs-IB, Raven or ICAR scores.
- Attributes and levels are design choices: 5 shapes ordered by number of sides, 5 sizes (40–100% of the cell in 15% steps), 5 shades of the theme’s ink (luminance only, never hue — MaRs-IB’s colour-vision caveat), 8 rotations of 45° made visible by a marker dot, 1–4 copies, 9 sub-grid positions, and a ring of 6 rays as the logic layer.
- Distribution of three and diagonal repetition are generated as one rule with two directions: on a 3×3 grid every Latin square is a diagonal repetition ((c − r) or (r + c) constant).
- Outward progression is v = s + k·max(r, c) — our reading of Sandia’s “outward” direction, not verified against its source.
- Progressions also run down columns; steps of ±2 (90° turns) are used only for rotation and only from class D4 up (“±2 at high levels”).
- Copies, sub-grid positions and the ray ring use a fixed figure size, because a 15% step of a small figure is not distinct on a phone; layouts are drawn one figure 60%, copies 20%, sub-grid position 20%, and position only carries categorical rules (constant, diagonal).
- One item never uses the same rule kind twice, and a class-purity guard rejects any item that an easier rule family also explains, so the class (and its b) is the easiest way the item can be solved.
- D7 is drawn half “three relations including outward”, half figure addition/subtraction; D9 pairs XOR/AND rays with one progression or diagonal on a second attribute (its b = +1.9 is extrapolated and provisional).
- Wrong values are misapplications whose correct/wrong pairs are exchangeable: another row’s or column’s value, stepping the wrong way, another diagonal value, the opposite corner for outward, another logic operator (else another row’s result) with the same ray count, and the adjacent level for constant attributes. “Repeating the adjacent cell” is not used for progressions, because at the ends of a 5-level scale it lets the more extreme option be guessed without the matrix.
- The ambiguity guard also checks the reversed subtraction and every logic operator applied down the columns.
- Select-then-confirm answering (tap twice, or tap and Confirm); the response time is taken at the commit.
- No countdown before the block (§1.8 lists none): each item starts after its 500-ms blank. The 5-s countdown ring from 25 s ticks softly each second.
- First-run practice is untimed and ends after 3 correct items or 8 attempts (classes D1, D2, D5, D3, D7, D8, D4, D6 in that order); the per-session warm-up (one D2 item) is timed like scored items and shows the answer, which C1 allows.
- During the 500-ms blank the empty cell frames and answer tiles stay on screen — only their content is blank — so nothing moves at onset.
- Desktop keys: 1–8 select an option, the same key again or Enter answers.
- The optional post-block review screen is not implemented in version 1.
- Interruptions: the 240-s cap counts active time only; a pause while an item is showing voids it and a new item from the same class follows; a pause during the blank replays the same item; a 4th void makes the run invalid.
- When no answer was correct, the median correct time is reported as 30 s (the window) so the metric stays finite.
- The starting θ0 uses the last 5 valid sessions stored on this device; it only steers the first item — the prior stays N(0, 1). Exact ties in item selection go to the easier class.
- Voided items stay in the trial log (kinds 2 and 3) for audit; they never enter scoring.
