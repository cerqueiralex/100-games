import type { GameDefinition } from '../../platform/types';
import { gameIcons } from '../../platform/design/gameIcons';
import { LetterHuntGame } from './LetterHuntGame';
import { letterHuntTutorial } from './tutorial';

export const letterHuntDefinition: GameDefinition = {
  id: 'letter-hunt',
  category: 'words',
  name: 'Letter Hunt',
  tagline: 'Swipe neighbouring letters into as many words as you can.',
  icon: gameIcons['letter-hunt'],
  component: LetterHuntGame,
  tutorial: letterHuntTutorial,
  scoringNote:
    'Drag through adjacent letters to spell dictionary words (3+ letters, 4+ on pro/extreme). Each word scores by length — 10/20/40/70/110/160 for 3–8 letters — times the difficulty multiplier (1× easy → 5× extreme). Beat the target before the timer runs out to win (90/80/75/70/60s on 4×4 → 6×6 boards); every board is solver-checked so the target is always reachable. Winning adds a +100× bonus; each Reveal hint costs 40. Wrong words count as misses.',
  assistFeatures: [
    {
      id: 'wordCount',
      name: 'Word count',
      description: 'Shows how many words the board hides and how many you have found. Counts as help.',
      defaultOn: true
    },
    {
      id: 'minFlash',
      name: 'Stuck flash',
      description:
        'After 20 seconds without a find, briefly pulses the first tile of a findable word. Counts as help.',
      defaultOn: false
    },
    {
      id: 'hint',
      name: 'Reveal a word',
      description:
        'Draws one whole word from the board as a ghost trail for a moment (−40 points, adds a hint). Counts as help when used.',
      defaultOn: true
    }
  ]
};
