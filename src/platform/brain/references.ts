import type { BrainReference } from './types';

/**
 * THE Brain Lab bibliography for in-app citations — every source an area,
 * a training link, an improvement tip or a coach insight cites. Each entry
 * was resolved against Crossref by its DOI on 2026-10-31 (title, authors,
 * journal and year are Crossref's own metadata, with print years and full
 * subtitles where Crossref lists only the online-first year or a short
 * title), so no citation here is typed from memory. To add one: resolve the
 * DOI first (scripts/verify-brain-refs.ts), then copy the metadata — never
 * cite a paper that has not been resolved.
 *
 * Benchmarks keep their own `science.references` (their paradigm papers);
 * SCIENCE.md §5 is the full research bibliography and Appendix D maps every
 * design decision to its sources.
 */
export const REFS_VERIFIED_AT = '2026-10-31';

export const REF = {
  stroop1935: { label: 'Stroop (1935). Studies of interference in serial verbal reactions. Journal of Experimental Psychology.', url: 'https://doi.org/10.1037/h0054651' },
  macleod1991: { label: 'MacLeod (1991). Half a century of research on the Stroop effect: An integrative review. Psychological Bulletin.', url: 'https://doi.org/10.1037/0033-2909.109.2.163' },
  macleodDunbar1988: { label: 'MacLeod & Dunbar (1988). Training and Stroop-like interference: Evidence for a continuum of automaticity. Journal of Experimental Psychology: Learning, Memory, and Cognition.', url: 'https://doi.org/10.1037/0278-7393.14.1.126' },
  treismanGelade1980: { label: 'Treisman & Gelade (1980). A feature-integration theory of attention. Cognitive Psychology.', url: 'https://doi.org/10.1016/0010-0285(80)90005-5' },
  duncanHumphreys1989: { label: 'Duncan & Humphreys (1989). Visual search and stimulus similarity. Psychological Review.', url: 'https://doi.org/10.1037/0033-295x.96.3.433' },
  pylyshynStorm1988: { label: 'Pylyshyn & Storm (1988). Tracking multiple independent targets: Evidence for a parallel tracking mechanism. Spatial Vision.', url: 'https://doi.org/10.1163/156856888x00122' },
  sireteanuRettenbach1995: { label: 'Sireteanu & Rettenbach (1995). Perceptual learning in visual search: Fast, enduring, but non-specific. Vision Research.', url: 'https://doi.org/10.1016/0042-6989(94)00295-w' },
  lu2022: { label: 'Lu et al. (2022). Attention mechanisms underlying dual‐color digital visual search based on Schulte grid: An event‐related potential study. Brain and Behavior.', url: 'https://doi.org/10.1002/brb3.2471' },
  lampit2014: { label: 'Lampit et al. (2014). Computerized Cognitive Training in Cognitively Healthy Older Adults: A Systematic Review and Meta-Analysis of Effect Modifiers. PLoS Medicine.', url: 'https://doi.org/10.1371/journal.pmed.1001756' },
  dellaSala1999: { label: 'Della Sala et al. (1999). Pattern span: a tool for unwelding visuo–spatial memory. Neuropsychologia.', url: 'https://doi.org/10.1016/s0028-3932(98)00159-6' },
  kessels2000: { label: 'Kessels et al. (2000). The Corsi Block-Tapping Task: Standardization and Normative Data. Applied Neuropsychology.', url: 'https://doi.org/10.1207/s15324826an0704_8' },
  ericsson1980: { label: 'Ericsson et al. (1980). Acquisition of a Memory Skill. Science.', url: 'https://doi.org/10.1126/science.7375930' },
  stClairThompson2010: { label: 'St Clair-Thompson (2010). Backwards digit recall: A measure of short-term memory or working memory? European Journal of Cognitive Psychology.', url: 'https://doi.org/10.1080/09541440902771299' },
  reynolds1997: { label: 'Reynolds (1997). Forward and backward memory span should not be combined for clinical analysis. Archives of Clinical Neuropsychology.', url: 'https://doi.org/10.1016/s0887-6177(96)00015-7' },
  melbyLervag2016: { label: 'Melby-Lervåg et al. (2016). Working Memory Training Does Not Improve Performance on Measures of Intelligence or Other Measures of “Far Transfer”. Perspectives on Psychological Science.', url: 'https://doi.org/10.1177/1745691616635612' },
  gathercole2019: { label: 'Gathercole et al. (2019). Working memory training involves learning new skills. Journal of Memory and Language.', url: 'https://doi.org/10.1016/j.jml.2018.10.003' },
  codding2011: { label: 'Codding et al. (2011). Meta–Analysis of Mathematic Basic–Fact Fluency Interventions: A Component Analysis. Learning Disabilities Research & Practice.', url: 'https://doi.org/10.1111/j.1540-5826.2010.00323.x' },
  rickard1994: { label: 'Rickard et al. (1994). On the cognitive structure of basic arithmetic skills: Operation, order, and symbol transfer effects. Journal of Experimental Psychology: Learning, Memory, and Cognition.', url: 'https://doi.org/10.1037/0278-7393.20.5.1139' },
  simonKotovsky1963: { label: 'Simon & Kotovsky (1963). Human acquisition of concepts for sequential patterns. Psychological Review.', url: 'https://doi.org/10.1037/h0043901' },
  klauerPhye2008: { label: 'Klauer & Phye (2008). Inductive Reasoning: A Training Approach. Review of Educational Research.', url: 'https://doi.org/10.3102/0034654307313402' },
  best1990: { label: 'Best (1990). Knowledge acquisition and strategic action in “Mastermind” problems. Memory & Cognition.', url: 'https://doi.org/10.3758/bf03202646' },
  schneider2020: { label: 'Schneider et al. (2020). Teaching the underlying rules of figural matrices in a short video increases test scores. Intelligence.', url: 'https://doi.org/10.1016/j.intell.2020.101473' },
  monsell2003: { label: 'Monsell (2003). Task switching. Trends in Cognitive Sciences.', url: 'https://doi.org/10.1016/s1364-6613(03)00028-7' },
  karbachKray2009: { label: 'Karbach & Kray (2009). How useful is executive control training? Age differences in near and far transfer of task‐switching training. Developmental Science.', url: 'https://doi.org/10.1111/j.1467-7687.2009.00846.x' },
  karbachVerhaeghen2014: { label: 'Karbach & Verhaeghen (2014). Making Working Memory Work: A Meta-Analysis of Executive-Control and Working Memory Training in Older Adults. Psychological Science.', url: 'https://doi.org/10.1177/0956797614548725' },
  sanchezCubillo2009: { label: 'Sánchez-Cubillo et al. (2009). Construct validity of the Trail Making Test: Role of task-switching, working memory, inhibition/interference control, and visuomotor abilities. Journal of the International Neuropsychological Society.', url: 'https://doi.org/10.1017/s1355617709090626' },
  okagakiFrensch1994: { label: 'Okagaki & Frensch (1994). Effects of video game playing on measures of spatial performance: Gender effects in late adolescence. Journal of Applied Developmental Psychology.', url: 'https://doi.org/10.1016/0193-3973(94)90005-1' },
  terlecki2008: { label: 'Terlecki et al. (2008). Durable and generalized effects of spatial experience on mental rotation: gender differences in growth patterns. Applied Cognitive Psychology.', url: 'https://doi.org/10.1002/acp.1420' },
  uttal2013: { label: 'Uttal et al. (2013). The malleability of spatial skills: A meta-analysis of training studies. Psychological Bulletin.', url: 'https://doi.org/10.1037/a0028446' },
  safaei2022: { label: 'Safaei et al. (2022). Video Game Play Does Not Improve Spatial Skills When Controlling for Speed-Accuracy Trade-Off: Evidence From Mental-Rotation and Mental-Folding Tasks. Perceptual and Motor Skills.', url: 'https://doi.org/10.1177/00315125221078982' },
  ball2002: { label: 'Ball et al. (2002). Effects of Cognitive Training Interventions With Older Adults. JAMA.', url: 'https://doi.org/10.1001/jama.288.18.2271' },
  edwards2017: { label: 'Edwards et al. (2017). Speed of processing training results in lower risk of dementia. Alzheimer\'s & Dementia: Translational Research & Clinical Interventions.', url: 'https://doi.org/10.1016/j.trci.2017.09.002' },
  erickson2019: { label: 'Erickson et al. (2019). Physical Activity, Cognition, and Brain Outcomes: A Review of the 2018 Physical Activity Guidelines. Medicine & Science in Sports & Exercise.', url: 'https://doi.org/10.1249/mss.0000000000001936' },
  limDinges2010: { label: 'Lim & Dinges (2010). A meta-analysis of the impact of short-term sleep deprivation on cognitive variables. Psychological Bulletin.', url: 'https://doi.org/10.1037/a0018883' },
  vanDongen2003: { label: 'Van Dongen et al. (2003). The Cumulative Cost of Additional Wakefulness: Dose-Response Effects on Neurobehavioral Functions and Sleep Physiology From Chronic Sleep Restriction and Total Sleep Deprivation. Sleep.', url: 'https://doi.org/10.1093/sleep/26.2.117' },
  mclellan2016: { label: 'McLellan et al. (2016). A review of caffeine’s effects on cognitive, physical and occupational performance. Neuroscience & Biobehavioral Reviews.', url: 'https://doi.org/10.1016/j.neubiorev.2016.09.001' },
  schmidt2007: { label: 'Schmidt et al. (2007). A time to think: Circadian rhythms in human cognition. Cognitive Neuropsychology.', url: 'https://doi.org/10.1080/02643290701754158' },
  wild2018: { label: 'Wild et al. (2018). Dissociable effects of self-reported daily sleep duration on high-level cognitive abilities. Sleep.', url: 'https://doi.org/10.1093/sleep/zsy182' },
  sliwinski2006: { label: 'Sliwinski et al. (2006). Intraindividual coupling of daily stress and cognition. Psychology and Aging.', url: 'https://doi.org/10.1037/0882-7974.21.3.545' },
  chiesa2011: { label: 'Chiesa et al. (2011). Does mindfulness training improve cognitive abilities? A systematic review of neuropsychological findings. Clinical Psychology Review.', url: 'https://doi.org/10.1016/j.cpr.2010.11.003' },
  simons2016: { label: 'Simons et al. (2016). Do “Brain-Training” Programs Work? Psychological Science in the Public Interest.', url: 'https://doi.org/10.1177/1529100616661983' },
  mackenzie2015: { label: 'MacKenzie (2015). Fitts’ Throughput and the Remarkable Case of Touch-Based Target Selection. Lecture Notes in Computer Science.', url: 'https://doi.org/10.1007/978-3-319-20916-6_23' },
  sharif2020: { label: 'Sharif et al. (2020). The Reliability of Fitts’s Law as a Movement Model for People with and without Limited Fine Motor Function. Proceedings of the 22nd International ACM SIGACCESS Conference on Computers and Accessibility.', url: 'https://doi.org/10.1145/3373625.3416999' },
  jacobsonTruax1991: { label: 'Jacobson & Truax (1991). Clinical significance: A statistical approach to defining meaningful change in psychotherapy research. Journal of Consulting and Clinical Psychology.', url: 'https://doi.org/10.1037/0022-006x.59.1.12' },
  falleti2006: { label: 'Falleti et al. (2006). Practice Effects Associated with the Repeated Assessment of Cognitive Function Using the CogState Battery at 10-minute, One Week and One Month Test-retest Intervals. Journal of Clinical and Experimental Neuropsychology.', url: 'https://doi.org/10.1080/13803390500205718' },
  bartels2010: { label: 'Bartels et al. (2010). Practice effects in healthy adults: A longitudinal study on frequent repetitive cognitive testing. BMC Neuroscience.', url: 'https://doi.org/10.1186/1471-2202-11-118' },
  maruff2013: { label: 'Maruff et al. (2013). Clinical utility of the cogstate brief battery in identifying cognitive impairment in mild cognitive impairment and Alzheimer’s disease. BMC Psychology.', url: 'https://doi.org/10.1186/2050-7283-1-30' },
  burgoyne2023: { label: 'Burgoyne et al. (2023). Nature and measurement of attention control. Journal of Experimental Psychology: General.', url: 'https://doi.org/10.1037/xge0001408' },
  woods2016: { label: 'Woods et al. (2016). The Effects of Repeat Testing, Malingering, and Traumatic Brain Injury on Computerized Measures of Visuospatial Memory Span. Frontiers in Human Neuroscience.', url: 'https://doi.org/10.3389/fnhum.2015.00690' },
  loenneker2025: { label: 'Loenneker et al. (2025). Math4Speed: A freely available measure of arithmetic fluency. Canadian Journal of Experimental Psychology / Revue canadienne de psychologie expérimentale.', url: 'https://doi.org/10.1037/cep0000347' },
  matzen2010: { label: 'Matzen et al. (2010). Recreating Raven’s: Software for systematically generating large numbers of Raven-like matrix problems with normed properties. Behavior Research Methods.', url: 'https://doi.org/10.3758/brm.42.2.525' },
  chierchia2019: { label: 'Chierchia et al. (2019). The matrix reasoning item bank (MaRs-IB): novel, open-access abstract reasoning items for adolescents and adults. Royal Society Open Science.', url: 'https://doi.org/10.1098/rsos.190232' },
  soukoreff2004: { label: 'Soukoreff & MacKenzie (2004). Towards a standard for pointing device evaluation, perspectives on 27 years of Fitts’ law research in HCI. International Journal of Human-Computer Studies.', url: 'https://doi.org/10.1016/j.ijhcs.2004.09.001' },
  basnerDinges2011: { label: 'Basner & Dinges (2011). Maximizing Sensitivity of the Psychomotor Vigilance Test (PVT) to Sleep Loss. Sleep.', url: 'https://doi.org/10.1093/sleep/34.5.581' },
  basnerMolliconeDinges2011: { label: 'Basner et al. (2011). Validity and sensitivity of a brief psychomotor vigilance test (PVT-B) to total and partial sleep deprivation. Acta Astronautica.', url: 'https://doi.org/10.1016/j.actaastro.2011.07.015' },
  jaeger2018: { label: 'Jaeger (2018). Digit Symbol Substitution Test: The case for sensitivity over specificity in neuropsychological testing. Journal of Clinical Psychopharmacology.', url: 'https://doi.org/10.1097/jcp.0000000000000941' },
  lam2022: { label: 'Lam et al. (2022). Reliability, construct and concurrent validity of a smartphone-based cognition test in multiple sclerosis. Multiple Sclerosis Journal.', url: 'https://doi.org/10.1177/13524585211018103' },
  novack2024: { label: 'Novack et al. (2024). Mobile toolbox (MTB) remote measures of executive function and processing speed: development and validation. Journal of the International Neuropsychological Society.', url: 'https://doi.org/10.1017/s1355617724000225' },
  shepardMetzler1971: { label: 'Shepard & Metzler (1971). Mental Rotation of Three-Dimensional Objects. Science.', url: 'https://doi.org/10.1126/science.171.3972.701' },
  ganisKievit2015: { label: 'Ganis & Kievit (2015). A New Set of Three-Dimensional Shapes for Investigating Mental Rotation Processes: Validation Data and Stimulus Set. Journal of Open Psychology Data.', url: 'https://doi.org/10.5334/jopd.ai' },
  hedge2018: { label: 'Hedge et al. (2018). The reliability paradox: Why robust cognitive tasks do not produce reliable individual differences. Behavior Research Methods.', url: 'https://doi.org/10.3758/s13428-017-0935-1' },
  sala2019: { label: 'Sala et al. (2019). Near and Far Transfer in Cognitive Training: A Second-Order Meta-Analysis. Collabra: Psychology.', url: 'https://doi.org/10.1525/collabra.203' },
  au2015: { label: 'Au et al. (2015). Improving fluid intelligence with training on working memory: a meta-analysis. Psychonomic Bulletin & Review.', url: 'https://doi.org/10.3758/s13423-014-0699-x' },
  hoddes1973: { label: 'Hoddes et al. (1973). Quantification of Sleepiness: A New Approach. Psychophysiology.', url: 'https://doi.org/10.1111/j.1469-8986.1973.tb00801.x' },
  elo2003: { label: 'Elo et al. (2003). Validity of a single-item measure of stress symptoms. Scandinavian Journal of Work, Environment & Health.', url: 'https://doi.org/10.5271/sjweh.752' },
  pronk2020: { label: 'Pronk et al. (2020). Mental chronometry in the pocket? Timing accuracy of web applications on touchscreen and keyboard devices. Behavior Research Methods.', url: 'https://doi.org/10.3758/s13428-019-01321-2' },
  nicosia2023: { label: 'Nicosia et al. (2023). To BYOD or not: Are device latencies important for bring-your-own-device (BYOD) smartphone cognitive testing? Behavior Research Methods.', url: 'https://doi.org/10.3758/s13428-022-01925-1' },
  livingston2024: { label: 'Livingston et al. (2024). Dementia prevention, intervention, and care: 2024 report of the Lancet standing Commission. The Lancet.', url: 'https://doi.org/10.1016/s0140-6736(24)01296-0' },
  schmiedek2013: { label: 'Schmiedek et al. (2013). Keeping it steady: Older adults perform more consistently on cognitive tasks than younger adults. Psychological Science.', url: 'https://doi.org/10.1177/0956797613479611' },
  sachdev2014: { label: 'Sachdev et al. (2014). Classifying neurocognitive disorders: the DSM-5 approach. Nature Reviews Neurology.', url: 'https://doi.org/10.1038/nrneurol.2014.181' },
  weintraub2013: { label: 'Weintraub et al. (2013). Cognition assessment using the NIH Toolbox. Neurology.', url: 'https://doi.org/10.1212/wnl.0b013e3182872ded' },
  hampshire2012: { label: 'Hampshire et al. (2012). Fractionating Human Intelligence. Neuron.', url: 'https://doi.org/10.1016/j.neuron.2012.06.022' },
  carpenter1990: { label: 'Carpenter et al. (1990). What one intelligence test measures: A theoretical account of the processing in the Raven Progressive Matrices Test. Psychological Review.', url: 'https://doi.org/10.1037/0033-295x.97.3.404' },
  sliwinski2018: { label: 'Sliwinski et al. (2018). Reliability and Validity of Ambulatory Cognitive Assessments. Assessment.', url: 'https://doi.org/10.1177/1073191116643164' },
  collie2003: { label: 'Collie et al. (2003). The effects of practice on the cognitive test performance of neurologically normal individuals assessed at brief test–retest intervals. Journal of the International Neuropsychological Society.', url: 'https://doi.org/10.1017/s1355617703930074' },
  goldberg2015: { label: 'Goldberg et al. (2015). Practice effects due to serial cognitive assessment: Implications for preclinical Alzheimer\'s disease randomized controlled trials. Alzheimer\'s & Dementia: Diagnosis, Assessment & Disease Monitoring.', url: 'https://doi.org/10.1016/j.dadm.2014.11.003' },
  scharfen2018: { label: 'Scharfen et al. (2018). Retest effects in cognitive ability tests: A meta-analysis. Intelligence.', url: 'https://doi.org/10.1016/j.intell.2018.01.003' },
  pham2021: { label: 'Pham et al. (2021). Smartphone-based symbol-digit modalities test reliably captures brain damage in multiple sclerosis. npj Digital Medicine.', url: 'https://doi.org/10.1038/s41746-021-00401-y' },
  weintraub2014: { label: 'Weintraub et al. (2014). The Cognition Battery of the NIH Toolbox for Assessment of Neurological and Behavioral Function: Validation in an Adult Sample. Journal of the International Neuropsychological Society.', url: 'https://doi.org/10.1017/s1355617714000320' },
} satisfies Record<string, BrainReference>;

export type RefId = keyof typeof REF;

/** the references for a list of ids (in order) */
export function refs(...ids: RefId[]): BrainReference[] {
  return ids.map((id) => REF[id]);
}
